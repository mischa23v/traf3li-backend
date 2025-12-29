/**
 * JWT Authentication Middleware
 * Verifies JWT tokens from cookies or Authorization header
 * Includes token revocation checking via Redis + MongoDB blacklist
 * Includes device binding validation for enhanced security
 * Supports JWT key rotation with multiple signing keys
 */

const jwt = require('jsonwebtoken');
const { CustomException } = require('../utils');
const tokenRevocationService = require('../services/tokenRevocation.service');
const logger = require('../utils/contextLogger');
const { verifyAccessToken } = require('../utils/generateToken');

/**
 * Extract device fingerprint from request
 * @param {Object} req - Express request object
 * @returns {Object} Device fingerprint containing IP, user-agent, and device ID
 */
const extractDeviceFingerprint = (req) => {
    // Get IP address (handle proxy scenarios)
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               req.headers['x-real-ip'] ||
               req.ip ||
               req.connection?.remoteAddress;

    // Get user-agent
    const userAgent = req.headers['user-agent'] || '';

    // Get device ID from custom header (if provided by client)
    const deviceId = req.headers['x-device-id'] || '';

    return {
        ip,
        userAgent,
        deviceId
    };
};

/**
 * Validate device fingerprint against token's stored device info
 * @param {Object} tokenDevice - Device info from token payload
 * @param {Object} currentDevice - Current request's device fingerprint
 * @returns {Object} Validation result with mismatch details
 */
const validateDeviceFingerprint = (tokenDevice, currentDevice) => {
    if (!tokenDevice) {
        // Token doesn't have device info (legacy token)
        return { isValid: true, mismatches: [] };
    }

    const mismatches = [];

    // Check IP mismatch
    if (tokenDevice.ip && tokenDevice.ip !== currentDevice.ip) {
        mismatches.push('ip');
    }

    // Check user-agent mismatch
    if (tokenDevice.userAgent && tokenDevice.userAgent !== currentDevice.userAgent) {
        mismatches.push('userAgent');
    }

    // Check device ID mismatch (if both exist)
    if (tokenDevice.deviceId && currentDevice.deviceId &&
        tokenDevice.deviceId !== currentDevice.deviceId) {
        mismatches.push('deviceId');
    }

    return {
        isValid: mismatches.length === 0,
        mismatches
    };
};

/**
 * Verify JWT Token
 * Supports both cookie-based and header-based authentication
 * Checks token against revocation blacklist (Redis + MongoDB)
 * Validates device fingerprint for enhanced security
 */
const verifyToken = async (req, res, next) => {
    // eslint-disable-next-line no-console
    console.log('[JWT VERIFY] ========== START ==========');
    // eslint-disable-next-line no-console
    console.log('[JWT VERIFY] Path:', req.path);
    // eslint-disable-next-line no-console
    console.log('[JWT VERIFY] Cookies:', {
        hasAccessToken: !!req.cookies?.accessToken,
        accessTokenLength: req.cookies?.accessToken?.length,
        accessTokenPreview: req.cookies?.accessToken?.substring(0, 30) + '...',
        allCookieNames: Object.keys(req.cookies || {})
    });
    // eslint-disable-next-line no-console
    console.log('[JWT VERIFY] Authorization header:', {
        hasHeader: !!req.headers.authorization,
        headerPreview: req.headers.authorization?.substring(0, 30) + '...'
    });

    // Check for token in both cookies and Authorization header
    let token = req.cookies?.accessToken;

    // If no token in cookies, check Authorization header
    if (!token && req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7); // Remove 'Bearer ' prefix
        }
    }

    // eslint-disable-next-line no-console
    console.log('[JWT VERIFY] Token source:', {
        hasToken: !!token,
        tokenLength: token?.length,
        tokenPreview: token?.substring(0, 30) + '...',
        source: req.cookies?.accessToken ? 'cookie' : (req.headers.authorization ? 'header' : 'none')
    });

    try {
        if (!token) {
            // eslint-disable-next-line no-console
            console.log('[JWT VERIFY] ERROR: No token found');
            throw CustomException('Authentication required', 401);
        }

        // 1. Verify JWT signature and expiration
        // Use verifyAccessToken which supports key rotation
        let decoded;
        try {
            decoded = verifyAccessToken(token);
            // eslint-disable-next-line no-console
            console.log('[JWT VERIFY] Token decoded successfully:', {
                userId: decoded?._id || decoded?.id,
                isSeller: decoded?.isSeller,
                firmId: decoded?.firm_id,
                exp: decoded?.exp,
                iat: decoded?.iat
            });
        } catch (verifyError) {
            // eslint-disable-next-line no-console
            console.log('[JWT VERIFY] Token verification FAILED:', {
                errorName: verifyError.name,
                errorMessage: verifyError.message
            });
            // Map verification errors to appropriate error codes
            if (verifyError.message === 'TOKEN_EXPIRED') {
                return res.status(401).json({
                    error: true,
                    message: 'Token expired',
                    code: 'TOKEN_EXPIRED'
                });
            }
            if (verifyError.message === 'INVALID_TOKEN') {
                return res.status(401).json({
                    error: true,
                    message: 'Invalid token',
                    code: 'INVALID_TOKEN'
                });
            }
            // Generic verification failure
            throw verifyError;
        }

        if (!decoded) {
            throw CustomException('Invalid token', 401);
        }

        // 2. Check if token has been revoked (blacklist check)
        // This is a fast Redis check (< 1ms) with MongoDB fallback
        let isRevoked = false;
        try {
            isRevoked = await tokenRevocationService.isTokenRevoked(token);
        } catch (revocationError) {
            logger.error('Token revocation check failed', {
                error: revocationError.message,
                userId: decoded?._id
            });
            // Continue with authentication if revocation check fails
            // This prevents availability issues if Redis/MongoDB is down
        }

        if (isRevoked) {
            logger.warn('Revoked token attempted', { userId: decoded._id });
            return res.status(401).json({
                error: true,
                message: 'Token has been revoked',
                code: 'TOKEN_REVOKED'
            });
        }

        // 3. Device binding validation
        const currentDevice = extractDeviceFingerprint(req);
        const tokenDevice = decoded.device; // Device info stored in token payload

        const deviceValidation = validateDeviceFingerprint(tokenDevice, currentDevice);

        if (!deviceValidation.isValid) {
            // Log security warning (sanitize device info to avoid leaking sensitive data)
            logger.warn('Device fingerprint mismatch detected', {
                userId: decoded._id,
                mismatches: deviceValidation.mismatches,
                ipChanged: deviceValidation.mismatches.includes('ip'),
                userAgentChanged: deviceValidation.mismatches.includes('userAgent'),
                deviceIdChanged: deviceValidation.mismatches.includes('deviceId')
            });

            // Add header to indicate device mismatch
            res.setHeader('X-Device-Mismatch', deviceValidation.mismatches.join(','));

            // Check if strict mode is enabled (block on mismatch)
            const strictDeviceBinding = process.env.STRICT_DEVICE_BINDING === 'true';

            if (strictDeviceBinding) {
                return res.status(401).json({
                    error: true,
                    message: 'Device fingerprint mismatch detected. Please re-authenticate from this device.',
                    code: 'DEVICE_MISMATCH',
                    mismatches: deviceValidation.mismatches
                });
            }

            // In non-strict mode, log and continue but flag the request
            req.deviceMismatch = true;
            req.deviceMismatches = deviceValidation.mismatches;
        }

        // 4. Token is valid and not revoked - allow request
        req.userID = decoded._id || decoded.id; // Handle both formats
        req.userId = decoded._id || decoded.id; // Alias for consistency
        req.isSeller = decoded.isSeller;
        req.token = token; // Store token for potential revocation on logout
        req.deviceFingerprint = currentDevice; // Store current device info

        // ENTERPRISE: Extract custom claims from JWT for stateless tenant verification
        // These claims are set by customClaims.service.js during token generation
        // This enables stateless verification without database lookup
        req.jwtClaims = {
            firmId: decoded.firm_id || null,
            firmRole: decoded.firm_role || null,
            firmStatus: decoded.firm_status || 'active',
            isSoloLawyer: decoded.is_solo_lawyer || false,
            mfaEnabled: decoded.mfa_enabled || false,
            subscriptionTier: decoded.subscription_tier || 'free',
            subscriptionStatus: decoded.subscription_status || 'trial',
            isDeparted: decoded.is_departed || false,
            emailVerified: decoded.email_verified || false,
            role: decoded.role || 'client'
        };

        // Quick access to firm ID from JWT
        req.jwtFirmId = decoded.firm_id || null;

        return next();
    } catch (error) {
        // Handle JWT-specific errors
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: true,
                message: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: true,
                message: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }

        // Handle custom exceptions
        const status = error.status || 401;
        const message = error.message || 'Authentication failed';
        return res.status(status).json({
            error: true,
            message
        });
    }
};

module.exports = {
    verifyToken,
    extractDeviceFingerprint // Export for use in auth service when creating tokens
};
