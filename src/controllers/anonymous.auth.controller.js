const { User } = require('../models');
const bcrypt = require('bcrypt');
const logger = require('../utils/contextLogger');
const auditLogService = require('../services/auditLog.service');
const sessionManager = require('../services/sessionManager.service');
const { validatePassword } = require('../utils/passwordPolicy');
const { recordActivity } = require('../middlewares/sessionTimeout.middleware');
const refreshTokenService = require('../services/refreshToken.service');
const { generateAccessToken } = require('../utils/generateToken');
const emailVerificationService = require('../services/emailVerification.service');
const { getCookieConfig, getHttpOnlyRefreshCookieConfig, REFRESH_TOKEN_COOKIE_NAME } = require('../utils/cookieConfig');

// Password hashing rounds
const saltRounds = 12;

/**
 * Create anonymous/guest session (Supabase-style)
 * POST /api/auth/anonymous
 */
const anonymousLogin = async (request, response) => {
    try {
        // Check if anonymous auth is enabled
        const ENABLE_ANONYMOUS_AUTH = process.env.ENABLE_ANONYMOUS_AUTH === 'true';

        if (!ENABLE_ANONYMOUS_AUTH) {
            return response.status(403).json({
                error: true,
                message: 'المصادقة المجهولة غير مفعلة',
                messageEn: 'Anonymous authentication is not enabled',
                code: 'ANONYMOUS_AUTH_DISABLED'
            });
        }

        const ipAddress = request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
        const userAgent = request.headers['user-agent'] || 'unknown';

        // Generate a unique identifier for the anonymous user
        const crypto = require('crypto');
        const anonymousId = crypto.randomUUID();

        // Create anonymous user
        const anonymousUser = new User({
            username: `anon_${anonymousId.slice(0, 8)}`,
            email: null,
            password: crypto.randomBytes(32).toString('hex'), // Random password (won't be used)
            firstName: 'Guest',
            lastName: 'User',
            phone: null,
            isAnonymous: true,
            role: 'client', // Anonymous users are always clients
            country: 'Saudi Arabia',
            lastActivityAt: new Date()
        });

        await anonymousUser.save();

        // Record session activity
        recordActivity(anonymousUser._id.toString());

        // Generate JWT token with is_anonymous claim
        const accessToken = await generateAccessToken(anonymousUser);

        // Create device info for refresh token (anonymous users also get refresh tokens)
        const deviceInfo = {
            userAgent: userAgent,
            ip: ipAddress,
            deviceId: request.headers['x-device-id'] || null,
            browser: request.headers['sec-ch-ua'] || null,
            os: request.headers['sec-ch-ua-platform'] || null,
            device: request.headers['sec-ch-ua-mobile'] === '?1' ? 'mobile' : 'desktop'
        };

        // Generate refresh token (same expiry as normal users - 7 days)
        const refreshToken = await refreshTokenService.createRefreshToken(
            anonymousUser._id.toString(),
            deviceInfo,
            null // No firmId for anonymous users
        );

        // Use centralized cookie config
        const cookieConfig = getCookieConfig(request, 'access');
        const refreshCookieConfig = getHttpOnlyRefreshCookieConfig(request);

        // Prepare user data (exclude password)
        const userData = {
            id: anonymousUser._id,
            username: anonymousUser.username,
            firstName: anonymousUser.firstName,
            lastName: anonymousUser.lastName,
            role: anonymousUser.role,
            isAnonymous: true,
            country: anonymousUser.country,
            createdAt: anonymousUser.createdAt
        };

        // Create session record
        sessionManager.createSession(anonymousUser._id, accessToken, {
            userAgent,
            ip: ipAddress,
            firmId: null,
            country: request.headers['cf-ipcountry'] || null,
            city: request.headers['cf-ipcity'] || null,
            region: request.headers['cf-ipregion'] || null,
            timezone: 'Asia/Riyadh'
        }).catch(err => logger.error('Failed to create anonymous session', { error: err.message }));

        // Log anonymous session creation
        await auditLogService.log(
            'anonymous_login',
            'user',
            anonymousUser._id,
            null,
            {
                userId: anonymousUser._id,
                username: anonymousUser.username,
                ipAddress,
                userAgent,
                method: request.method,
                endpoint: request.originalUrl,
                severity: 'low'
            }
        );

        return response
            .cookie('accessToken', accessToken, cookieConfig)
            .cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, refreshCookieConfig)
            .status(201).json({
                error: false,
                message: 'تم إنشاء جلسة مجهولة بنجاح',
                messageEn: 'Anonymous session created successfully',
                user: userData,
                isAnonymous: true
            });
    } catch (error) {
        logger.error('Anonymous login failed', { error: error.message });
        return response.status(500).json({
            error: true,
            message: 'حدث خطأ أثناء إنشاء الجلسة المجهولة',
            messageEn: 'An error occurred while creating anonymous session',
            code: 'ANONYMOUS_LOGIN_FAILED'
        });
    }
};

/**
 * Convert anonymous user to full account
 * POST /api/auth/anonymous/convert
 */
const convertAnonymousUser = async (request, response) => {
    try {
        // Check if anonymous auth is enabled
        const ENABLE_ANONYMOUS_AUTH = process.env.ENABLE_ANONYMOUS_AUTH === 'true';

        if (!ENABLE_ANONYMOUS_AUTH) {
            return response.status(403).json({
                error: true,
                message: 'المصادقة المجهولة غير مفعلة',
                messageEn: 'Anonymous authentication is not enabled',
                code: 'ANONYMOUS_AUTH_DISABLED'
            });
        }

        const { email, password, firstName, lastName, phone } = request.body;
        const userId = request.userID; // From authenticate middleware

        // Get the anonymous user
        const anonymousUser = await User.findById(userId);

        if (!anonymousUser) {
            return response.status(404).json({
                error: true,
                message: 'المستخدم غير موجود',
                messageEn: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        // Check if user is actually anonymous
        if (!anonymousUser.isAnonymous) {
            return response.status(400).json({
                error: true,
                message: 'المستخدم ليس مستخدماً مجهولاً',
                messageEn: 'User is not anonymous',
                code: 'NOT_ANONYMOUS_USER'
            });
        }

        // Validate required fields
        if (!email || !password) {
            return response.status(400).json({
                error: true,
                message: 'البريد الإلكتروني وكلمة المرور مطلوبان',
                messageEn: 'Email and password are required',
                code: 'MISSING_FIELDS'
            });
        }

        // Check if email already exists
        // SECURITY: bypassFirmFilter needed - email uniqueness must be checked system-wide
        const existingUser = await User.findOne({
            email: email.toLowerCase(),
            _id: { $ne: userId } // Exclude current user
        }).setOptions({ bypassFirmFilter: true });

        if (existingUser) {
            return response.status(409).json({
                error: true,
                message: 'البريد الإلكتروني مستخدم بالفعل',
                messageEn: 'Email already in use',
                code: 'EMAIL_EXISTS'
            });
        }

        // Validate password policy
        const passwordValidation = validatePassword(password, {
            email,
            firstName,
            lastName,
            phone
        });

        if (!passwordValidation.valid) {
            return response.status(400).json({
                error: true,
                message: passwordValidation.errorsAr.join('. '),
                messageEn: passwordValidation.errors.join('. '),
                code: 'WEAK_PASSWORD',
                errors: passwordValidation.errors
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Update anonymous user to full account
        const updates = {
            email: email.toLowerCase(),
            password: hashedPassword,
            firstName: firstName || anonymousUser.firstName,
            lastName: lastName || anonymousUser.lastName,
            phone: phone || null,
            isAnonymous: false,
            convertedAt: new Date(),
            convertedFromAnonymousId: anonymousUser._id // Track original anonymous ID
        };

        // Generate username if not provided
        if (!anonymousUser.username || anonymousUser.username.startsWith('anon_')) {
            const baseUsername = email.split('@')[0];
            let username = baseUsername;
            let counter = 1;

            // Ensure username is unique
            // SECURITY: bypassFirmFilter needed - username uniqueness must be checked system-wide
            while (await User.findOne({ username }).setOptions({ bypassFirmFilter: true })) {
                username = `${baseUsername}${counter}`;
                counter++;
            }

            updates.username = username;
        }

        await User.findByIdAndUpdate(userId, updates);

        // Get updated user
        const updatedUser = await User.findById(userId)
            .select('-password')
            .lean();

        // Generate new tokens (non-anonymous)
        const accessToken = await generateAccessToken(updatedUser);

        const ipAddress = request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
        const userAgent = request.headers['user-agent'] || 'unknown';

        const deviceInfo = {
            userAgent,
            ip: ipAddress,
            deviceId: request.headers['x-device-id'] || null,
            browser: request.headers['sec-ch-ua'] || null,
            os: request.headers['sec-ch-ua-platform'] || null,
            device: request.headers['sec-ch-ua-mobile'] === '?1' ? 'mobile' : 'desktop'
        };

        const refreshToken = await refreshTokenService.createRefreshToken(
            updatedUser._id.toString(),
            deviceInfo,
            null
        );

        // Use centralized cookie config
        const cookieConfig = getCookieConfig(request, 'access');
        const refreshCookieConfig = getHttpOnlyRefreshCookieConfig(request);

        // Log conversion
        await auditLogService.log(
            'anonymous_user_converted',
            'user',
            userId,
            null,
            {
                userId,
                email: updatedUser.email,
                username: updatedUser.username,
                ipAddress,
                userAgent,
                method: request.method,
                endpoint: request.originalUrl,
                severity: 'medium'
            }
        );

        // Send verification email (fire-and-forget)
        (async () => {
            try {
                const userName = `${updatedUser.firstName} ${updatedUser.lastName}`;
                await emailVerificationService.sendVerificationEmail(
                    updatedUser._id.toString(),
                    updatedUser.email,
                    userName,
                    'ar'
                );
            } catch (error) {
                logger.error('Failed to send verification email after conversion', {
                    error: error.message,
                    userId: updatedUser._id
                });
            }
        })();

        return response
            .cookie('accessToken', accessToken, cookieConfig)
            .cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, refreshCookieConfig)
            .status(200).json({
                error: false,
                message: 'تم تحويل الحساب بنجاح',
                messageEn: 'Account converted successfully',
                user: updatedUser
            });
    } catch (error) {
        logger.error('Anonymous user conversion failed', { error: error.message });
        return response.status(500).json({
            error: true,
            message: 'حدث خطأ أثناء تحويل الحساب',
            messageEn: 'An error occurred while converting account',
            code: 'CONVERSION_FAILED'
        });
    }
};

module.exports = {
    anonymousLogin,
    convertAnonymousUser
};
