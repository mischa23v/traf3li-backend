const googleOneTapService = require('../services/googleOneTap.service');
const refreshTokenService = require('../services/refreshToken.service');
const sessionManager = require('../services/sessionManager.service');
const authWebhookService = require('../services/authWebhook.service');
const geoAnomalyDetectionService = require('../services/geoAnomalyDetection.service');
const stepUpAuthService = require('../services/stepUpAuth.service');
const { generateAccessToken } = require('../utils/generateToken');
const { getCookieConfig } = require('../utils/cookieConfig');
const { recordActivity } = require('../middlewares/sessionTimeout.middleware');
const { CustomException } = require('../utils');
const logger = require('../utils/contextLogger');
const { sanitizeObjectId } = require('../utils/securityUtils');
const Firm = require('../models/firm.model');
const { getDefaultPermissions, getSoloLawyerPermissions, isSoloLawyer } = require('../config/permissions.config');

/**
 * Google One Tap Authentication Controller
 *
 * Handles Google One Tap credential verification and user authentication.
 * Provides seamless sign-in/sign-up experience with Google accounts.
 */

/**
 * Authenticate with Google One Tap
 * POST /api/auth/google/one-tap
 *
 * @param {object} request.body.credential - Google One Tap JWT credential
 * @param {string} request.body.firmId - Optional firm ID for multi-tenancy
 */
const authenticateWithOneTap = async (request, response) => {
    const { credential, firmId } = request.body;
    const ipAddress = request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
    const userAgent = request.headers['user-agent'] || 'unknown';

    try {
        // Validate credential
        if (!credential || typeof credential !== 'string') {
            return response.status(400).json({
                error: true,
                message: 'معرف Google مطلوب',
                messageEn: 'Google credential is required',
                code: 'CREDENTIAL_REQUIRED'
            });
        }

        // Validate firmId if provided
        let validatedFirmId = null;
        if (firmId) {
            validatedFirmId = sanitizeObjectId(firmId);
            if (!validatedFirmId) {
                return response.status(400).json({
                    error: true,
                    message: 'معرف المكتب غير صالح',
                    messageEn: 'Invalid firm ID',
                    code: 'INVALID_FIRM_ID'
                });
            }

            // Verify firm exists
            const firm = await Firm.findById(validatedFirmId);
            if (!firm) {
                return response.status(404).json({
                    error: true,
                    message: 'المكتب غير موجود',
                    messageEn: 'Firm not found',
                    code: 'FIRM_NOT_FOUND'
                });
            }
        }

        // Authenticate user with Google One Tap
        const result = await googleOneTapService.authenticateUser(
            credential,
            validatedFirmId,
            ipAddress,
            userAgent
        );

        const { user, isNewUser, accountLinked } = result;

        // Record session activity for timeout tracking
        recordActivity(user._id.toString());

        // Update reauthentication timestamp
        stepUpAuthService.updateReauthTimestamp(user._id.toString()).catch(err =>
            logger.error('Failed to update reauth timestamp on Google One Tap login:', err)
        );

        // ═══════════════════════════════════════════════════════════════
        // GEOGRAPHIC ANOMALY DETECTION
        // ═══════════════════════════════════════════════════════════════
        (async () => {
            try {
                const deviceFingerprint = {
                    userAgent,
                    deviceType: request.headers['sec-ch-ua-mobile'] === '?1' ? 'mobile' : 'desktop',
                    os: request.headers['sec-ch-ua-platform'] || 'unknown',
                    browser: request.headers['sec-ch-ua'] || 'unknown',
                    deviceId: request.headers['x-device-id'] || null,
                    firmId: user.firmId,
                };

                const anomalyResult = await geoAnomalyDetectionService.detectAnomalies(
                    user._id.toString(),
                    ipAddress,
                    new Date(),
                    deviceFingerprint
                );

                if (anomalyResult.anomalous) {
                    logger.warn('Geographic anomaly detected during Google One Tap login', {
                        userId: user._id,
                        userEmail: user.email,
                        action: anomalyResult.action,
                        riskScore: anomalyResult.riskScore,
                        factors: anomalyResult.factors,
                        travelSpeed: anomalyResult.travelSpeed,
                        distance: anomalyResult.distance,
                    });
                }
            } catch (geoError) {
                logger.error('Geographic anomaly detection failed', {
                    error: geoError.message,
                    userId: user._id,
                    userEmail: user.email,
                });
            }
        })();

        // Generate access token (short-lived, 15 minutes)
        const accessToken = await generateAccessToken(user);

        // Create device info for refresh token
        const deviceInfo = {
            userAgent: userAgent,
            ip: ipAddress,
            deviceId: request.headers['x-device-id'] || null,
            browser: request.headers['sec-ch-ua'] || null,
            os: request.headers['sec-ch-ua-platform'] || null,
            device: request.headers['sec-ch-ua-mobile'] === '?1' ? 'mobile' : 'desktop'
        };

        // Generate refresh token (long-lived, 7 days)
        const refreshToken = await refreshTokenService.createRefreshToken(
            user._id.toString(),
            deviceInfo,
            user.firmId
        );

        // Build enhanced user data with firm info
        const userData = {
            id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isSeller: user.isSeller,
            image: user.image,
            isSoloLawyer: user.isSoloLawyer || false,
            lawyerWorkMode: user.lawyerWorkMode || null,
            firmId: user.firmId,
            firmRole: user.firmRole,
            firmStatus: user.firmStatus,
            isEmailVerified: user.isEmailVerified,
            ssoProvider: user.ssoProvider,
            ssoExternalId: user.ssoExternalId
        };

        // If user is a lawyer, get firm information and permissions
        if (user.role === 'lawyer' || user.isSeller) {
            if (user.firmId) {
                try {
                    const firm = await Firm.findById(user.firmId)
                        .select('name nameEnglish licenseNumber status members subscription');

                    if (firm) {
                        const member = firm.members.find(
                            m => m.userId.toString() === user._id.toString()
                        );

                        userData.firm = {
                            id: firm._id,
                            name: firm.name,
                            nameEn: firm.nameEnglish,
                            status: firm.status
                        };
                        userData.firmRole = member?.role || user.firmRole;
                        userData.firmStatus = member?.status || user.firmStatus;

                        // Include permissions from firm membership
                        if (member) {
                            userData.permissions = member.permissions || getDefaultPermissions(member.role);
                        }

                        // Tenant context for firm members
                        userData.tenant = {
                            id: firm._id,
                            name: firm.name,
                            nameEn: firm.nameEnglish,
                            status: firm.status,
                            subscription: {
                                plan: firm.subscription?.plan || 'free',
                                status: firm.subscription?.status || 'trial'
                            }
                        };
                    }
                } catch (firmError) {
                    logger.warn('Failed to fetch firm data', { error: firmError.message });
                }
            } else if (isSoloLawyer(user)) {
                // Solo lawyer - full permissions, no tenant
                userData.firm = null;
                userData.firmRole = null;
                userData.firmStatus = null;
                userData.isSoloLawyer = true;
                userData.tenant = null;
                userData.permissions = getSoloLawyerPermissions();
            }
        }

        // Create session record (fire-and-forget for performance)
        sessionManager.createSession(user._id, accessToken, {
            userAgent: userAgent,
            ip: ipAddress,
            firmId: user.firmId,
            country: request.headers['cf-ipcountry'] || null,
            city: request.headers['cf-ipcity'] || null,
            region: request.headers['cf-ipregion'] || null,
            timezone: user.timezone || 'Asia/Riyadh'
        }).catch(err => logger.error('Failed to create session', { error: err.message }));

        // Enforce session limit (fire-and-forget, non-blocking)
        (async () => {
            try {
                const limit = await sessionManager.getSessionLimit(user._id, user.firmId);
                await sessionManager.enforceSessionLimit(user._id, limit);
            } catch (err) {
                logger.error('Failed to enforce session limit', { error: err.message });
            }
        })();

        // Get cookie config based on request context (same-origin proxy vs cross-origin)
        const accessCookieConfig = getCookieConfig(request, 'access');
        const refreshCookieConfig = getCookieConfig(request, 'refresh');

        // Trigger authentication webhook (fire-and-forget)
        (async () => {
            try {
                const webhookType = isNewUser ? 'register' : 'login';
                const webhookMethod = isNewUser
                    ? authWebhookService.triggerRegisterWebhook
                    : authWebhookService.triggerLoginWebhook;

                await webhookMethod.call(authWebhookService, user, request, {
                    loginMethod: 'google_one_tap',
                    firmId: user.firmId?.toString() || null,
                    accountLinked,
                    isNewUser
                });
            } catch (error) {
                logger.error('Failed to trigger Google One Tap webhook', {
                    error: error.message,
                    userId: user._id
                });
            }
        })();

        // Return success response
        return response
            .cookie('accessToken', accessToken, accessCookieConfig)
            .cookie('refreshToken', refreshToken, refreshCookieConfig)
            .status(200).json({
                error: false,
                message: isNewUser
                    ? 'تم إنشاء الحساب بنجاح باستخدام Google'
                    : (accountLinked
                        ? 'تم ربط حسابك بـ Google بنجاح'
                        : 'تم تسجيل الدخول بنجاح'
                    ),
                messageEn: isNewUser
                    ? 'Account created successfully with Google'
                    : (accountLinked
                        ? 'Account linked to Google successfully'
                        : 'Login successful'
                    ),
                user: userData,
                isNewUser,
                accountLinked
            });
    } catch (error) {
        logger.error('Google One Tap authentication failed', {
            error: error.message,
            hasCredential: !!credential,
            ipAddress,
            userAgent
        });

        // Handle specific error codes
        const status = error.status || 500;
        const code = error.code || 'GOOGLE_ONE_TAP_FAILED';

        return response.status(status).json({
            error: true,
            message: error.message || 'فشل تسجيل الدخول باستخدام Google',
            messageEn: error.messageEn || 'Google One Tap authentication failed',
            code
        });
    }
};

module.exports = {
    authenticateWithOneTap
};
