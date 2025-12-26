const { OAuth2Client } = require('google-auth-library');
const User = require('../models/user.model');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const logger = require('../utils/contextLogger');
const auditLogService = require('./auditLog.service');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { getDefaultPermissions } = require('../config/permissions.config');

/**
 * Google One Tap Authentication Service
 *
 * Verifies Google One Tap credential tokens (JWT) and handles user authentication/creation.
 * Uses Google's OAuth2Client to verify tokens against Google's public keys.
 *
 * Security features:
 * - Token verification with Google's public keys
 * - Audience validation (ensures token is for our app)
 * - Expiration validation
 * - Issuer validation
 * - Email verification requirement
 * - Account linking with security checks
 */

class GoogleOneTapService {
    constructor() {
        // Get Google Client ID from environment
        this.clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CALENDAR_CLIENT_ID;

        if (!this.clientId) {
            logger.warn('Google One Tap: GOOGLE_CLIENT_ID not configured. One Tap authentication will not work.');
        }

        // Initialize OAuth2Client for token verification
        this.client = new OAuth2Client(this.clientId);

        // Cache for verified tokens to prevent replay attacks (5 minute TTL)
        this.verifiedTokens = new Map();
        this.TOKEN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

        // Clean up cache periodically
        setInterval(() => this.cleanupTokenCache(), 60 * 1000); // Every minute
    }

    /**
     * Clean up expired tokens from cache
     */
    cleanupTokenCache() {
        const now = Date.now();
        for (const [jti, timestamp] of this.verifiedTokens.entries()) {
            if (now - timestamp > this.TOKEN_CACHE_TTL) {
                this.verifiedTokens.delete(jti);
            }
        }
    }

    /**
     * Verify Google One Tap credential token
     * @param {string} credential - JWT credential from Google One Tap
     * @returns {Promise<object>} - Verified token payload with user info
     */
    async verifyToken(credential) {
        if (!this.clientId) {
            throw CustomException('Google One Tap is not configured. Please contact administrator.', 500);
        }

        if (!credential || typeof credential !== 'string') {
            throw CustomException('Invalid credential format', 400);
        }

        try {
            // Verify the credential token with Google
            const ticket = await this.client.verifyIdToken({
                idToken: credential,
                audience: this.clientId, // Verify audience matches our client ID
            });

            const payload = ticket.getPayload();

            // Security validations
            this.validateTokenPayload(payload);

            // Check for replay attack (token already used)
            if (payload.jti && this.verifiedTokens.has(payload.jti)) {
                logger.warn('Google One Tap: Token replay attack detected', {
                    jti: payload.jti,
                    email: payload.email
                });
                throw CustomException('Token has already been used', 400);
            }

            // Store token JTI to prevent replay (if available)
            if (payload.jti) {
                this.verifiedTokens.set(payload.jti, Date.now());
            }

            // Extract user information
            const userInfo = this.extractUserInfo(payload);

            logger.info('Google One Tap: Token verified successfully', {
                email: userInfo.email,
                sub: userInfo.sub
            });

            return userInfo;
        } catch (error) {
            // Log error without exposing internal details
            logger.error('Google One Tap: Token verification failed', {
                error: error.message,
                type: error.constructor.name
            });

            if (error.status) {
                throw error; // Re-throw CustomException
            }

            // Map Google API errors to user-friendly messages
            if (error.message.includes('Token used too late') || error.message.includes('exp')) {
                throw CustomException('التوكن منتهي الصلاحية', 401, 'TOKEN_EXPIRED');
            }

            if (error.message.includes('Invalid token signature') || error.message.includes('verify')) {
                throw CustomException('توكن غير صالح', 401, 'INVALID_TOKEN');
            }

            if (error.message.includes('audience')) {
                throw CustomException('التوكن غير مخصص لهذا التطبيق', 401, 'INVALID_AUDIENCE');
            }

            throw CustomException('فشل التحقق من توكن Google', 401, 'TOKEN_VERIFICATION_FAILED');
        }
    }

    /**
     * Validate token payload for security requirements
     * @param {object} payload - Decoded JWT payload
     */
    validateTokenPayload(payload) {
        // Check issuer (must be from Google)
        const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
        if (!validIssuers.includes(payload.iss)) {
            throw CustomException('Invalid token issuer', 401);
        }

        // Check audience matches our client ID
        if (payload.aud !== this.clientId) {
            throw CustomException('Invalid token audience', 401);
        }

        // Check token expiration
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
            throw CustomException('Token has expired', 401);
        }

        // Check email is present and verified
        if (!payload.email) {
            throw CustomException('Email not provided in token', 400);
        }

        if (!payload.email_verified) {
            throw CustomException('Email not verified by Google', 400);
        }

        // Check subject (user ID) is present
        if (!payload.sub) {
            throw CustomException('User ID not provided in token', 400);
        }
    }

    /**
     * Extract user information from verified token payload
     * @param {object} payload - Verified token payload
     * @returns {object} - Extracted user info
     */
    extractUserInfo(payload) {
        return {
            sub: payload.sub, // Google user ID
            email: payload.email,
            emailVerified: payload.email_verified,
            name: payload.name,
            givenName: payload.given_name,
            familyName: payload.family_name,
            picture: payload.picture,
            locale: payload.locale,
            // Optional fields
            hd: payload.hd, // Hosted domain (for Google Workspace)
        };
    }

    /**
     * Authenticate user with Google One Tap credential
     * Handles both existing users and new user creation
     *
     * @param {string} credential - Google One Tap JWT credential
     * @param {string} firmId - Optional firm ID for multi-tenancy
     * @param {string} ipAddress - User IP address for audit logging
     * @param {string} userAgent - User agent for audit logging
     * @returns {Promise<object>} - Authentication result with user and tokens flag
     */
    async authenticateUser(credential, firmId = null, ipAddress = null, userAgent = null) {
        // Verify the credential token
        const userInfo = await this.verifyToken(credential);

        // Check if user exists with this email
        // NOTE: Bypass firmIsolation filter - Google One Tap works for solo lawyers without firmId
        let user = await User.findOne({ email: userInfo.email.toLowerCase() }).setOptions({ bypassFirmFilter: true });

        let isNewUser = false;
        let accountLinked = false;

        if (user) {
            // Existing user - check if they're already using Google auth
            const hasGoogleAuth = user.ssoProvider === 'google' && user.ssoExternalId;

            if (!hasGoogleAuth) {
                // Account exists but not linked to Google
                // Link the Google account if user allows it (implicit consent by using One Tap)
                await this.linkGoogleAccount(user, userInfo);
                accountLinked = true;

                logger.info('Google One Tap: Linked existing account to Google', {
                    userId: user._id,
                    email: user.email
                });
            }

            // Update user's Google profile info
            await this.updateGoogleProfile(user, userInfo);

        } else {
            // New user - create account with Google
            user = await this.createUserFromGoogle(userInfo, firmId);
            isNewUser = true;

            logger.info('Google One Tap: Created new user from Google', {
                userId: user._id,
                email: user.email
            });
        }

        // Log successful authentication
        await auditLogService.log(
            isNewUser ? 'google_one_tap_register' : 'google_one_tap_login',
            'user',
            user._id,
            null,
            {
                userId: user._id,
                userEmail: user.email,
                userRole: user.role,
                isNewUser,
                accountLinked,
                ipAddress,
                userAgent,
                severity: 'low',
                googleId: userInfo.sub
            }
        );

        return {
            user,
            isNewUser,
            accountLinked
        };
    }

    /**
     * Link Google account to existing user
     * @param {object} user - User document
     * @param {object} userInfo - Google user info
     */
    async linkGoogleAccount(user, userInfo) {
        // Check if this Google ID is already linked to another account
        // NOTE: Bypass firmIsolation filter - Google linking works for solo lawyers without firmId
        const existingLink = await User.findOne({
            ssoProvider: 'google',
            ssoExternalId: userInfo.sub,
            _id: { $ne: user._id }
        }).setOptions({ bypassFirmFilter: true });

        if (existingLink) {
            throw CustomException(
                'This Google account is already linked to another user',
                400,
                'GOOGLE_ACCOUNT_ALREADY_LINKED'
            );
        }

        // Link the account
        user.ssoExternalId = userInfo.sub;
        user.isSSOUser = true;
        user.ssoProvider = 'google';
        user.lastSSOLogin = new Date();

        // Update email verification status if not already verified
        if (!user.isEmailVerified) {
            user.isEmailVerified = true;
            user.emailVerifiedAt = new Date();
        }

        await user.save();
    }

    /**
     * Update user's Google profile information
     * @param {object} user - User document
     * @param {object} userInfo - Google user info
     */
    async updateGoogleProfile(user, userInfo) {
        const updates = {};

        // Update profile picture if available
        if (userInfo.picture && !user.image) {
            updates.image = userInfo.picture;
        }

        // Update name if not set
        if (userInfo.givenName && !user.firstName) {
            updates.firstName = userInfo.givenName;
        }
        if (userInfo.familyName && !user.lastName) {
            updates.lastName = userInfo.familyName;
        }

        // Always update SSO external ID and verification status
        if (!user.ssoExternalId) {
            updates.ssoExternalId = userInfo.sub;
            updates.ssoProvider = 'google';
            updates.isSSOUser = true;
        }
        if (!user.isEmailVerified) {
            updates.isEmailVerified = true;
            updates.emailVerifiedAt = new Date();
        }

        // Update last SSO login
        updates.lastSSOLogin = new Date();
        updates.lastLogin = new Date();

        if (Object.keys(updates).length > 0) {
            await User.findByIdAndUpdate(user._id, updates);
        }
    }

    /**
     * Create new user from Google One Tap authentication
     * @param {object} userInfo - Verified Google user info
     * @param {string} firmId - Optional firm ID
     * @returns {Promise<object>} - Created user document
     */
    async createUserFromGoogle(userInfo, firmId = null) {
        // Generate unique username from email
        const baseUsername = userInfo.email.split('@')[0];
        let username = baseUsername;
        let counter = 1;

        // Ensure username is unique
        // NOTE: Bypass firmIsolation filter - username check needs to be global
        while (await User.findOne({ username }).setOptions({ bypassFirmFilter: true })) {
            username = `${baseUsername}${counter}`;
            counter++;
        }

        // Generate random password (user won't need it for Google login)
        const randomPassword = crypto.randomBytes(32).toString('hex');
        const hashedPassword = await bcrypt.hash(randomPassword, 12);

        // Determine default role
        const role = 'client'; // Default to client for Google One Tap

        const userData = {
            username,
            email: userInfo.email.toLowerCase(),
            password: hashedPassword,
            firstName: userInfo.givenName || 'User',
            lastName: userInfo.familyName || 'User',
            phone: '', // Can be filled later
            role,
            isSeller: false,
            country: 'Saudi Arabia',
            image: userInfo.picture,

            // Google authentication fields
            ssoExternalId: userInfo.sub,
            isSSOUser: true,
            ssoProvider: 'google',
            createdViaSSO: true,
            lastSSOLogin: new Date(),
            lastLogin: new Date(),
            isEmailVerified: true,
            emailVerifiedAt: new Date(),

            // Firm association
            firmId: firmId || null,
            firmRole: null,
            firmStatus: null
        };

        const user = new User(userData);
        await user.save();

        // If firm is specified, add user to firm members
        if (firmId) {
            try {
                const firm = await Firm.findById(firmId);
                if (firm) {
                    firm.members.push({
                        userId: user._id,
                        role: 'member',
                        permissions: getDefaultPermissions('member'),
                        status: 'active',
                        joinedAt: new Date()
                    });

                    await firm.save();
                }
            } catch (error) {
                logger.error('Failed to add Google One Tap user to firm', {
                    error: error.message,
                    userId: user._id,
                    firmId
                });
            }
        }

        return user;
    }

    /**
     * Check if Google One Tap is properly configured
     * @returns {boolean} - True if configured
     */
    isConfigured() {
        return !!this.clientId;
    }
}

// Export singleton instance
module.exports = new GoogleOneTapService();
