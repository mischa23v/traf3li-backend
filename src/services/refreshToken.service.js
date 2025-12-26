const RefreshToken = require('../models/refreshToken.model');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/generateToken');
const { User } = require('../models');
const logger = require('../utils/contextLogger');
const auditLogService = require('./auditLog.service');

/**
 * Refresh Token Service
 *
 * Implements secure refresh token management with:
 * - Token rotation (new refresh token on each use)
 * - Token family tracking
 * - Reuse attack detection
 * - Automatic token cleanup
 */

/**
 * Create and store a refresh token
 * @param {string} userId - User ID
 * @param {object} deviceInfo - Device information
 * @param {string} firmId - Firm ID (optional)
 * @returns {Promise<string>} - Refresh token (JWT)
 */
const createRefreshToken = async (userId, deviceInfo = {}, firmId = null) => {
    try {
        // Generate token family ID for this token chain
        const family = RefreshToken.generateFamily();

        // Get user for token generation
        // NOTE: Bypass firmIsolation filter - auth operations need to work for solo lawyers without firmId
        const user = await User.findById(userId)
            .select('_id email role')
            .setOptions({ bypassFirmFilter: true })
            .lean();
        if (!user) {
            throw new Error('User not found');
        }

        // Generate JWT refresh token
        const refreshTokenJWT = generateRefreshToken(user);

        // Hash token for storage
        const tokenHash = RefreshToken.hashToken(refreshTokenJWT);

        // Calculate expiration (7 days from now)
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // Store in database
        const refreshToken = await RefreshToken.create({
            token: tokenHash,
            userId,
            firmId,
            expiresAt,
            family,
            deviceInfo: {
                userAgent: deviceInfo.userAgent || 'unknown',
                ip: deviceInfo.ip || 'unknown',
                deviceId: deviceInfo.deviceId || null,
                browser: deviceInfo.browser || null,
                os: deviceInfo.os || null,
                device: deviceInfo.device || 'unknown'
            }
        });

        logger.info('Refresh token created', {
            userId,
            tokenId: refreshToken._id,
            family
        });

        return refreshTokenJWT;
    } catch (error) {
        logger.error('Failed to create refresh token', { error: error.message });
        throw error;
    }
};

/**
 * Refresh access token with rotation
 * @param {string} refreshTokenJWT - Refresh token JWT
 * @returns {Promise<object>} - { accessToken, refreshToken, user }
 */
const refreshAccessToken = async (refreshTokenJWT) => {
    try {
        // 1. Verify JWT signature and expiration
        let decoded;
        try {
            decoded = verifyRefreshToken(refreshTokenJWT);
        } catch (error) {
            logger.warn('Invalid refresh token JWT', { error: error.message });
            throw new Error('INVALID_REFRESH_TOKEN');
        }

        const userId = decoded.id;

        // 2. Check for token reuse attack
        const reuseCheck = await RefreshToken.checkReuse(refreshTokenJWT);
        if (reuseCheck.isReuse) {
            // SECURITY ALERT: Token reuse detected!
            logger.error('Refresh token reuse detected', {
                userId,
                family: reuseCheck.family
            });

            // Revoke entire token family
            await RefreshToken.revokeFamily(reuseCheck.family, 'reuse_detected');

            // Log security incident
            await auditLogService.log(
                'token_reuse_detected',
                'user',
                userId,
                null,
                {
                    userId,
                    family: reuseCheck.family,
                    severity: 'critical',
                    action: 'revoked_token_family'
                }
            );

            throw new Error('TOKEN_REUSE_DETECTED');
        }

        // 3. Find token in database
        const tokenHash = RefreshToken.hashToken(refreshTokenJWT);
        const refreshToken = await RefreshToken.findOne({
            token: tokenHash,
            userId
        });

        if (!refreshToken) {
            logger.warn('Refresh token not found in database', { userId });
            throw new Error('REFRESH_TOKEN_NOT_FOUND');
        }

        // 4. Check if token is valid
        if (refreshToken.isRevoked) {
            logger.warn('Refresh token is revoked', {
                userId,
                reason: refreshToken.revokedReason
            });
            throw new Error('REFRESH_TOKEN_REVOKED');
        }

        if (refreshToken.expiresAt < new Date()) {
            logger.warn('Refresh token is expired', { userId });
            throw new Error('REFRESH_TOKEN_EXPIRED');
        }

        // 5. Get user details for new tokens
        // NOTE: Bypass firmIsolation filter - auth operations need to work for solo lawyers without firmId
        const user = await User.findById(userId)
            .select('_id email role firstName lastName isSeller isSoloLawyer firmId firmRole')
            .setOptions({ bypassFirmFilter: true })
            .lean();

        if (!user) {
            logger.error('User not found for refresh token', { userId });
            throw new Error('USER_NOT_FOUND');
        }

        // 6. Generate new token pair (rotation)
        const newAccessToken = await generateAccessToken(user);
        const newRefreshTokenJWT = generateRefreshToken(user);
        const newTokenHash = RefreshToken.hashToken(newRefreshTokenJWT);

        // 7. Store new refresh token with same family
        const newRefreshToken = await RefreshToken.create({
            token: newTokenHash,
            userId: user._id,
            firmId: refreshToken.firmId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            family: refreshToken.family, // Same family for rotation chain
            rotatedFrom: refreshToken._id,
            deviceInfo: refreshToken.deviceInfo
        });

        // 8. Revoke old refresh token
        await refreshToken.revoke('refresh');

        // 9. Update last used timestamp
        await newRefreshToken.updateLastUsed();

        logger.info('Access token refreshed', {
            userId,
            oldTokenId: refreshToken._id,
            newTokenId: newRefreshToken._id,
            family: refreshToken.family
        });

        // 10. Log the refresh event
        await auditLogService.log(
            'token_refreshed',
            'user',
            userId,
            null,
            {
                userId,
                userEmail: user.email,
                family: refreshToken.family,
                severity: 'low'
            }
        );

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshTokenJWT,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                isSeller: user.isSeller,
                isSoloLawyer: user.isSoloLawyer,
                firmId: user.firmId,
                firmRole: user.firmRole
            }
        };
    } catch (error) {
        logger.error('Failed to refresh access token', { error: error.message });
        throw error;
    }
};

/**
 * Revoke a specific refresh token
 * @param {string} token - Refresh token JWT
 * @param {string} reason - Revocation reason
 * @returns {Promise<object>} - Revoked token document
 */
const revokeRefreshToken = async (token, reason = 'logout') => {
    try {
        const result = await RefreshToken.revokeToken(token, reason);

        if (result) {
            logger.info('Refresh token revoked', {
                tokenId: result._id,
                userId: result.userId,
                reason
            });
        }

        return result;
    } catch (error) {
        logger.error('Failed to revoke refresh token', { error: error.message });
        throw error;
    }
};

/**
 * Revoke all refresh tokens for a user
 * @param {string} userId - User ID
 * @param {string} reason - Revocation reason
 * @returns {Promise<number>} - Number of tokens revoked
 */
const revokeAllUserTokens = async (userId, reason = 'security') => {
    try {
        const count = await RefreshToken.revokeAllUserTokens(userId, reason);

        logger.info('All user refresh tokens revoked', {
            userId,
            count,
            reason
        });

        // Log security event
        await auditLogService.log(
            'all_refresh_tokens_revoked',
            'user',
            userId,
            null,
            {
                userId,
                count,
                reason,
                severity: 'medium'
            }
        );

        return count;
    } catch (error) {
        logger.error('Failed to revoke all user tokens', { error: error.message });
        throw error;
    }
};

/**
 * Cleanup expired tokens (scheduled job)
 * @returns {Promise<number>} - Number of tokens cleaned up
 */
const cleanupExpiredTokens = async () => {
    try {
        const count = await RefreshToken.cleanupExpired();

        if (count > 0) {
            logger.info('Expired refresh tokens cleaned up', { count });
        }

        return count;
    } catch (error) {
        logger.error('Failed to cleanup expired tokens', { error: error.message });
        throw error;
    }
};

/**
 * Get active refresh tokens for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Active refresh tokens
 */
const getActiveTokens = async (userId) => {
    try {
        return await RefreshToken.getActiveTokens(userId);
    } catch (error) {
        logger.error('Failed to get active tokens', { error: error.message });
        throw error;
    }
};

/**
 * Get token statistics for a user
 * @param {string} userId - User ID
 * @returns {Promise<object>} - Token statistics
 */
const getTokenStats = async (userId) => {
    try {
        const [activeCount, tokens] = await Promise.all([
            RefreshToken.getActiveTokenCount(userId),
            RefreshToken.getActiveTokens(userId)
        ]);

        // Group by family
        const families = {};
        tokens.forEach(token => {
            if (!families[token.family]) {
                families[token.family] = [];
            }
            families[token.family].push(token);
        });

        return {
            activeCount,
            familyCount: Object.keys(families).length,
            tokens: tokens.map(t => ({
                id: t._id,
                createdAt: t.createdAt,
                expiresAt: t.expiresAt,
                lastUsedAt: t.lastUsedAt,
                deviceInfo: t.deviceInfo,
                family: t.family
            }))
        };
    } catch (error) {
        logger.error('Failed to get token stats', { error: error.message });
        throw error;
    }
};

/**
 * Verify refresh token is valid
 * @param {string} token - Refresh token JWT
 * @returns {Promise<boolean>} - True if valid
 */
const verifyToken = async (token) => {
    try {
        // Verify JWT
        const decoded = verifyRefreshToken(token);

        // Check database
        const refreshToken = await RefreshToken.findByToken(token);

        return refreshToken && refreshToken.isValid();
    } catch (error) {
        return false;
    }
};

module.exports = {
    createRefreshToken,
    refreshAccessToken,
    revokeRefreshToken,
    revokeAllUserTokens,
    cleanupExpiredTokens,
    getActiveTokens,
    getTokenStats,
    verifyToken
};
