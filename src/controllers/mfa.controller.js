/**
 * MFA Controller
 *
 * Handles Multi-Factor Authentication endpoints including:
 * - TOTP setup and verification
 * - QR code generation for authenticator apps
 * - Backup code generation
 * - Backup code verification (for login)
 * - Backup code regeneration
 * - MFA enable/disable
 *
 * NCA ECC-2:2024 Compliance: Section 2-3-1
 */

const mfaService = require('../services/mfa.service');
const { validateBackupCodeFormat } = require('../utils/backupCodes');
const { User } = require('../models');
const bcrypt = require('bcrypt');
const auditLogService = require('../services/auditLog.service');
const { pickAllowedFields, sanitizeObjectId, timingSafeEqual } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// ========================================================================
// Helper Functions
// ========================================================================

/**
 * Validate OTP token format (must be exactly 6 digits)
 * Prevents injection attacks and invalid input
 *
 * @param {string} token - OTP token to validate
 * @returns {boolean} - True if valid 6-digit format
 */
const isValidOTPFormat = (token) => {
    if (!token || typeof token !== 'string') {
        return false;
    }
    // Must be exactly 6 digits, no whitespace, no special characters
    return /^\d{6}$/.test(token.trim());
};

// ========================================================================
// TOTP Setup & Verification Endpoints
// ========================================================================

/**
 * Start MFA setup - Generate QR code
 *
 * POST /api/auth/mfa/setup
 *
 * This endpoint generates a TOTP secret and QR code for the user to scan
 * with their authenticator app. The secret is stored temporarily until verified.
 *
 * @returns {Object} - {qrCode: string (data URL), secret: string, setupKey: string}
 */
const setupMFA = async (request, response) => {
    try {
        const userId = request.userID || request.user?._id || request.user?.id;

        if (!userId) {
            return response.status(401).json({
                error: true,
                message: 'يجب تسجيل الدخول لإعداد المصادقة الثنائية',
                messageEn: 'Authentication required to setup MFA'
            });
        }

        // Get user
        const user = await User.findById(userId);
        if (!user) {
            return response.status(404).json({
                error: true,
                message: 'المستخدم غير موجود',
                messageEn: 'User not found'
            });
        }

        // Check if MFA is already enabled
        if (user.mfaEnabled) {
            return response.status(400).json({
                error: true,
                message: 'المصادقة الثنائية مفعلة بالفعل',
                messageEn: 'MFA is already enabled',
                code: 'MFA_ALREADY_ENABLED'
            });
        }

        // Generate TOTP secret
        const { secret, otpauthUrl } = mfaService.generateTOTPSecret(user.email);

        // Generate QR code
        const qrCode = await mfaService.generateQRCode(secret, user.email);

        // Store encrypted secret temporarily (not enabled yet)
        const encryptedSecret = mfaService.encryptMFASecret(secret);
        user.mfaSecret = encryptedSecret;
        user.mfaEnabled = false; // Not enabled until verified
        await user.save();

        // Log MFA setup start
        await auditLogService.log(
            'mfa_setup_started',
            'user',
            userId,
            null,
            {
                userId,
                userEmail: user.email,
                userRole: user.role,
                severity: 'medium'
            }
        );

        return response.status(200).json({
            error: false,
            message: 'امسح رمز QR بتطبيق المصادقة الخاص بك',
            messageEn: 'Scan the QR code with your authenticator app',
            qrCode, // data URL for QR code image
            setupKey: secret, // Manual entry key for authenticator apps that don't support QR codes
            instructions: {
                ar: 'افتح تطبيق المصادقة (Google Authenticator أو Authy) وامسح رمز QR أو أدخل المفتاح يدوياً',
                en: 'Open your authenticator app (Google Authenticator or Authy) and scan the QR code or enter the key manually'
            }
        });
    } catch (error) {
        logger.error('Setup MFA error:', error.message);

        return response.status(500).json({
            error: true,
            message: 'حدث خطأ أثناء إعداد المصادقة الثنائية',
            messageEn: 'Error setting up MFA'
        });
    }
};

/**
 * Verify initial setup code and enable MFA
 *
 * POST /api/auth/mfa/verify-setup
 * Body: { token: string (6-digit code) }
 *
 * This endpoint verifies the first TOTP code from the authenticator app
 * and enables MFA for the user. Also generates backup codes.
 *
 * @returns {Object} - {enabled: boolean, backupCodes: string[], message: string}
 */
const verifySetup = async (request, response) => {
    try {
        const userId = request.userID || request.user?._id || request.user?.id;
        const { token } = request.body;

        if (!userId) {
            return response.status(401).json({
                error: true,
                message: 'يجب تسجيل الدخول',
                messageEn: 'Authentication required'
            });
        }

        if (!token) {
            return response.status(400).json({
                error: true,
                message: 'رمز التحقق مطلوب',
                messageEn: 'Verification token is required'
            });
        }

        // Validate OTP format (must be exactly 6 digits)
        if (!isValidOTPFormat(token)) {
            return response.status(400).json({
                error: true,
                message: 'صيغة رمز التحقق غير صحيحة. يجب أن يكون 6 أرقام',
                messageEn: 'Invalid token format. Must be exactly 6 digits',
                code: 'INVALID_TOKEN_FORMAT'
            });
        }

        // Get user
        const user = await User.findById(userId);
        if (!user) {
            return response.status(404).json({
                error: true,
                message: 'المستخدم غير موجود',
                messageEn: 'User not found'
            });
        }

        // Check if setup was started
        if (!user.mfaSecret) {
            return response.status(400).json({
                error: true,
                message: 'يجب البدء بإعداد المصادقة الثنائية أولاً',
                messageEn: 'MFA setup must be started first',
                code: 'MFA_SETUP_NOT_STARTED'
            });
        }

        // Decrypt secret
        const secret = mfaService.decryptMFASecret(user.mfaSecret);

        // Verify token
        const isValid = mfaService.validateMFASetup(secret, token);

        if (!isValid) {
            await auditLogService.log(
                'mfa_setup_verification_failed',
                'user',
                userId,
                null,
                {
                    userId,
                    userEmail: user.email,
                    userRole: user.role,
                    severity: 'medium',
                    reason: 'Invalid TOTP token'
                }
            );

            return response.status(400).json({
                error: true,
                message: 'رمز التحقق غير صحيح. تأكد من استخدام الرمز الصحيح من تطبيق المصادقة',
                messageEn: 'Invalid verification token. Make sure you are using the correct code from your authenticator app',
                code: 'INVALID_TOKEN'
            });
        }

        // Enable MFA
        user.mfaEnabled = true;
        user.mfaVerifiedAt = new Date();

        // Generate backup codes
        const backupResult = await mfaService.generateBackupCodesForUser(userId);

        await user.save();

        // Log successful MFA enable
        await auditLogService.log(
            'mfa_enabled',
            'user',
            userId,
            null,
            {
                userId,
                userEmail: user.email,
                userRole: user.role,
                severity: 'high',
                details: {
                    method: 'totp',
                    backupCodesGenerated: backupResult.codes.length
                }
            }
        );

        return response.status(200).json({
            error: false,
            message: 'تم تفعيل المصادقة الثنائية بنجاح',
            messageEn: 'MFA enabled successfully',
            enabled: true,
            backupCodes: backupResult.codes,
            backupCodesWarning: {
                ar: 'احفظ هذه الرموز الاحتياطية في مكان آمن. يمكن استخدامها للوصول إلى حسابك إذا فقدت هاتفك',
                en: 'Save these backup codes in a safe place. They can be used to access your account if you lose your phone'
            }
        });
    } catch (error) {
        logger.error('Verify setup error:', error.message);

        return response.status(500).json({
            error: true,
            message: 'حدث خطأ أثناء التحقق من المصادقة الثنائية',
            messageEn: 'Error verifying MFA setup'
        });
    }
};

/**
 * Verify TOTP code during login
 *
 * POST /api/auth/mfa/verify
 * Body: { userId: string, token: string (6-digit code) }
 *
 * This endpoint verifies a TOTP code during the login process.
 *
 * @returns {Object} - {valid: boolean, message: string}
 */
const verifyMFA = async (request, response) => {
    try {
        const { userId, token } = request.body;

        if (!userId || !token) {
            return response.status(400).json({
                error: true,
                message: 'معرف المستخدم ورمز التحقق مطلوبان',
                messageEn: 'User ID and verification token are required'
            });
        }

        // Sanitize userId to prevent NoSQL injection
        const sanitizedUserId = sanitizeObjectId(userId);
        if (!sanitizedUserId) {
            return response.status(400).json({
                error: true,
                message: 'معرف المستخدم غير صحيح',
                messageEn: 'Invalid user ID format',
                code: 'INVALID_USER_ID'
            });
        }

        // Validate OTP format (must be exactly 6 digits)
        if (!isValidOTPFormat(token)) {
            return response.status(400).json({
                error: true,
                message: 'صيغة رمز التحقق غير صحيحة. يجب أن يكون 6 أرقام',
                messageEn: 'Invalid token format. Must be exactly 6 digits',
                code: 'INVALID_TOKEN_FORMAT'
            });
        }

        // Get user
        const user = await User.findById(sanitizedUserId);
        if (!user) {
            return response.status(404).json({
                error: true,
                message: 'المستخدم غير موجود',
                messageEn: 'User not found'
            });
        }

        // Check if MFA is enabled
        if (!user.mfaEnabled || !user.mfaSecret) {
            return response.status(400).json({
                error: true,
                message: 'المصادقة الثنائية غير مفعلة',
                messageEn: 'MFA is not enabled',
                code: 'MFA_NOT_ENABLED'
            });
        }

        // Decrypt secret
        const secret = mfaService.decryptMFASecret(user.mfaSecret);

        // Verify token (with 1 window tolerance = 30 seconds before/after)
        // Use timing-safe comparison by checking the token through the service
        const isValid = mfaService.verifyTOTP(secret, token, 1);

        if (!isValid) {
            await auditLogService.log(
                'mfa_verification_failed',
                'user',
                sanitizedUserId,
                null,
                {
                    userId: sanitizedUserId,
                    userEmail: user.email,
                    userRole: user.role,
                    severity: 'medium',
                    reason: 'Invalid TOTP token',
                    ipAddress: request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                    userAgent: request.headers['user-agent'] || 'unknown'
                }
            );

            return response.status(401).json({
                error: true,
                message: 'رمز التحقق غير صحيح',
                messageEn: 'Invalid verification token',
                code: 'INVALID_TOKEN',
                valid: false
            });
        }

        // Update verification timestamp
        user.mfaVerifiedAt = new Date();
        await user.save();

        // Log successful verification
        await auditLogService.log(
            'mfa_verification_success',
            'user',
            sanitizedUserId,
            null,
            {
                userId: sanitizedUserId,
                userEmail: user.email,
                userRole: user.role,
                severity: 'low',
                ipAddress: request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                userAgent: request.headers['user-agent'] || 'unknown'
            }
        );

        return response.status(200).json({
            error: false,
            message: 'تم التحقق بنجاح',
            messageEn: 'Verification successful',
            valid: true
        });
    } catch (error) {
        logger.error('Verify MFA error:', error.message);

        return response.status(500).json({
            error: true,
            message: 'حدث خطأ أثناء التحقق من المصادقة الثنائية',
            messageEn: 'Error verifying MFA'
        });
    }
};

/**
 * Disable MFA (requires password confirmation)
 *
 * POST /api/auth/mfa/disable
 * Body: { password: string }
 *
 * This endpoint disables MFA after password verification.
 *
 * @returns {Object} - {disabled: boolean, message: string}
 */
const disableMFA = async (request, response) => {
    try {
        const userId = request.userID || request.user?._id || request.user?.id;
        const { password } = request.body;

        if (!userId) {
            return response.status(401).json({
                error: true,
                message: 'يجب تسجيل الدخول',
                messageEn: 'Authentication required'
            });
        }

        if (!password) {
            return response.status(400).json({
                error: true,
                message: 'كلمة المرور مطلوبة للتحقق',
                messageEn: 'Password is required for verification'
            });
        }

        // Get user with password field
        const user = await User.findById(userId).select('+password');
        if (!user) {
            return response.status(404).json({
                error: true,
                message: 'المستخدم غير موجود',
                messageEn: 'User not found'
            });
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            await auditLogService.log(
                'mfa_disable_failed',
                'user',
                userId,
                null,
                {
                    userId,
                    userEmail: user.email,
                    userRole: user.role,
                    severity: 'medium',
                    reason: 'Invalid password'
                }
            );

            return response.status(401).json({
                error: true,
                message: 'كلمة المرور غير صحيحة',
                messageEn: 'Invalid password',
                code: 'INVALID_PASSWORD'
            });
        }

        // Check if MFA is enabled
        if (!user.mfaEnabled) {
            return response.status(400).json({
                error: true,
                message: 'المصادقة الثنائية غير مفعلة',
                messageEn: 'MFA is not enabled',
                code: 'MFA_NOT_ENABLED'
            });
        }

        // Disable MFA
        await mfaService.disableMFA(userId);

        return response.status(200).json({
            error: false,
            message: 'تم تعطيل المصادقة الثنائية بنجاح',
            messageEn: 'MFA disabled successfully',
            disabled: true
        });
    } catch (error) {
        logger.error('Disable MFA error:', error.message);

        return response.status(500).json({
            error: true,
            message: 'حدث خطأ أثناء تعطيل المصادقة الثنائية',
            messageEn: 'Error disabling MFA'
        });
    }
};

// ========================================================================
// Backup Codes Endpoints
// ========================================================================

/**
 * Generate new backup codes for authenticated user
 *
 * POST /api/auth/mfa/backup-codes/generate
 *
 * This endpoint generates a fresh set of backup codes.
 * Backup codes are shown only once and must be stored securely by the user.
 *
 * @returns {Object} - {codes: string[], remainingCodes: number, message: string}
 */
const generateBackupCodes = async (request, response) => {
    try {
        const userId = request.userID || request.user?._id || request.user?.id;

        if (!userId) {
            return response.status(401).json({
                error: true,
                message: 'يجب تسجيل الدخول لإنشاء رموز الاحتياطية',
                messageEn: 'Authentication required to generate backup codes'
            });
        }

        // Generate backup codes
        const result = await mfaService.generateBackupCodesForUser(userId);

        return response.status(200).json({
            error: false,
            message: 'تم إنشاء رموز الاحتياطية بنجاح. احفظها في مكان آمن - لن تتمكن من رؤيتها مرة أخرى',
            messageEn: 'Backup codes generated successfully. Save them securely - you will not see them again',
            codes: result.codes,
            remainingCodes: result.codes.length,
            totalCodes: result.codes.length
        });
    } catch (error) {
        logger.error('Generate backup codes error:', error.message);

        if (error.message === 'User not found') {
            return response.status(404).json({
                error: true,
                message: 'المستخدم غير موجود',
                messageEn: 'User not found'
            });
        }

        return response.status(500).json({
            error: true,
            message: 'حدث خطأ أثناء إنشاء رموز الاحتياطية',
            messageEn: 'Error generating backup codes'
        });
    }
};

/**
 * Verify backup code for login (alternative to TOTP)
 *
 * POST /api/auth/mfa/backup-codes/verify
 * Body: { userId, code }
 *
 * This endpoint verifies a backup code during login.
 * Each code can only be used once.
 *
 * @returns {Object} - {valid: boolean, remainingCodes: number, message: string}
 */
const verifyBackupCode = async (request, response) => {
    try {
        const { userId, code } = request.body;

        // Validation
        if (!userId || !code) {
            return response.status(400).json({
                error: true,
                message: 'يجب توفير معرف المستخدم ورمز الاحتياطي',
                messageEn: 'User ID and backup code are required'
            });
        }

        // Sanitize userId to prevent NoSQL injection
        const sanitizedUserId = sanitizeObjectId(userId);
        if (!sanitizedUserId) {
            return response.status(400).json({
                error: true,
                message: 'معرف المستخدم غير صحيح',
                messageEn: 'Invalid user ID format',
                code: 'INVALID_USER_ID'
            });
        }

        // Validate code format
        if (!validateBackupCodeFormat(code)) {
            return response.status(400).json({
                error: true,
                message: 'صيغة رمز الاحتياطي غير صحيحة. يجب أن يكون بصيغة ABCD-1234',
                messageEn: 'Invalid backup code format. Must be in format ABCD-1234',
                code: 'INVALID_FORMAT'
            });
        }

        // Verify the backup code (use sanitized userId)
        const result = await mfaService.useBackupCode(sanitizedUserId, code);

        if (!result.valid) {
            return response.status(401).json({
                error: true,
                message: 'رمز الاحتياطي غير صحيح أو تم استخدامه مسبقاً',
                messageEn: result.error || 'Invalid or already used backup code',
                code: 'INVALID_CODE',
                remainingCodes: result.remainingCodes
            });
        }

        // Backup code verified successfully
        return response.status(200).json({
            error: false,
            message: 'تم التحقق من رمز الاحتياطي بنجاح',
            messageEn: 'Backup code verified successfully',
            valid: true,
            remainingCodes: result.remainingCodes,
            warning: result.remainingCodes <= 2 ? {
                message: 'عدد رموز الاحتياطية المتبقية قليل. يرجى إنشاء رموز جديدة',
                messageEn: 'Low backup codes remaining. Please generate new codes',
                remainingCodes: result.remainingCodes
            } : null
        });
    } catch (error) {
        logger.error('Verify backup code error:', error.message);

        if (error.message === 'User not found') {
            return response.status(404).json({
                error: true,
                message: 'المستخدم غير موجود',
                messageEn: 'User not found'
            });
        }

        return response.status(500).json({
            error: true,
            message: 'حدث خطأ أثناء التحقق من رمز الاحتياطي',
            messageEn: 'Error verifying backup code'
        });
    }
};

/**
 * Regenerate backup codes (invalidates all old codes)
 *
 * POST /api/auth/mfa/backup-codes/regenerate
 *
 * This endpoint regenerates backup codes and invalidates all old ones.
 * Requires authentication.
 *
 * @returns {Object} - {codes: string[], remainingCodes: number, message: string}
 */
const regenerateBackupCodes = async (request, response) => {
    try {
        const userId = request.userID || request.user?._id || request.user?.id;

        if (!userId) {
            return response.status(401).json({
                error: true,
                message: 'يجب تسجيل الدخول لإعادة إنشاء رموز الاحتياطية',
                messageEn: 'Authentication required to regenerate backup codes'
            });
        }

        // Regenerate backup codes
        const result = await mfaService.regenerateBackupCodes(userId);

        return response.status(200).json({
            error: false,
            message: 'تم إعادة إنشاء رموز الاحتياطية بنجاح. تم إلغاء جميع الرموز القديمة',
            messageEn: 'Backup codes regenerated successfully. All old codes have been invalidated',
            codes: result.codes,
            remainingCodes: result.codes.length,
            totalCodes: result.codes.length
        });
    } catch (error) {
        logger.error('Regenerate backup codes error:', error.message);

        if (error.message === 'User not found') {
            return response.status(404).json({
                error: true,
                message: 'المستخدم غير موجود',
                messageEn: 'User not found'
            });
        }

        if (error.message === 'MFA must be enabled to regenerate backup codes') {
            return response.status(400).json({
                error: true,
                message: 'يجب تفعيل المصادقة الثنائية أولاً',
                messageEn: 'MFA must be enabled first',
                code: 'MFA_NOT_ENABLED'
            });
        }

        return response.status(500).json({
            error: true,
            message: 'حدث خطأ أثناء إعادة إنشاء رموز الاحتياطية',
            messageEn: 'Error regenerating backup codes'
        });
    }
};

/**
 * Get remaining backup codes count
 *
 * GET /api/auth/mfa/backup-codes/count
 *
 * This endpoint returns the number of unused backup codes.
 * Requires authentication.
 *
 * @returns {Object} - {remainingCodes: number, totalCodes: number}
 */
const getBackupCodesCount = async (request, response) => {
    try {
        const userId = request.userID || request.user?._id || request.user?.id;

        if (!userId) {
            return response.status(401).json({
                error: true,
                message: 'يجب تسجيل الدخول',
                messageEn: 'Authentication required'
            });
        }

        // Get backup codes count
        const remainingCodes = await mfaService.getBackupCodesCount(userId);

        return response.status(200).json({
            error: false,
            remainingCodes,
            warning: remainingCodes === 0 ? {
                message: 'لا توجد رموز احتياطية متاحة. يرجى إنشاء رموز جديدة',
                messageEn: 'No backup codes available. Please generate new codes'
            } : remainingCodes <= 2 ? {
                message: 'عدد رموز الاحتياطية المتبقية قليل. يرجى إنشاء رموز جديدة',
                messageEn: 'Low backup codes remaining. Please generate new codes'
            } : null
        });
    } catch (error) {
        logger.error('Get backup codes count error:', error.message);

        if (error.message === 'User not found') {
            return response.status(404).json({
                error: true,
                message: 'المستخدم غير موجود',
                messageEn: 'User not found'
            });
        }

        return response.status(500).json({
            error: true,
            message: 'حدث خطأ أثناء الحصول على عدد رموز الاحتياطية',
            messageEn: 'Error getting backup codes count'
        });
    }
};

/**
 * Get MFA status for authenticated user
 *
 * GET /api/auth/mfa/status
 *
 * This endpoint returns the MFA status including backup codes info.
 *
 * @returns {Object} - {mfaEnabled: boolean, hasBackupCodes: boolean, remainingCodes: number}
 */
const getMFAStatus = async (request, response) => {
    try {
        const userId = request.userID || request.user?._id || request.user?.id;

        if (!userId) {
            return response.status(401).json({
                error: true,
                message: 'يجب تسجيل الدخول',
                messageEn: 'Authentication required'
            });
        }

        // Get MFA status
        const status = await mfaService.getMFAStatus(userId);

        return response.status(200).json({
            error: false,
            ...status
        });
    } catch (error) {
        logger.error('Get MFA status error:', error.message);

        if (error.message === 'User not found') {
            return response.status(404).json({
                error: true,
                message: 'المستخدم غير موجود',
                messageEn: 'User not found'
            });
        }

        return response.status(500).json({
            error: true,
            message: 'حدث خطأ أثناء الحصول على حالة المصادقة الثنائية',
            messageEn: 'Error getting MFA status'
        });
    }
};

/**
 * SECURITY NOTES:
 *
 * Rate Limiting:
 * - verifyMFA and verifySetup should use authRateLimiter middleware (15 attempts per 15 min)
 * - verifyBackupCode should use authRateLimiter middleware
 * - Apply rate limiting in the routes file to prevent brute force attacks
 *
 * IDOR Protection:
 * - Authenticated endpoints (setupMFA, disableMFA, etc.) are protected by auth middleware
 * - Login endpoints (verifyMFA, verifyBackupCode) validate userId format with sanitizeObjectId
 *
 * Input Validation:
 * - All OTP tokens are validated to be exactly 6 digits
 * - All backup codes are validated with validateBackupCodeFormat
 * - All ObjectIds are sanitized with sanitizeObjectId
 *
 * Timing-Safe Comparison:
 * - TOTP verification uses timing-safe comparison internally in mfaService.verifyTOTP
 * - Backup code verification uses bcrypt.compare (timing-safe by design)
 */

module.exports = {
    // TOTP endpoints
    setupMFA,
    verifySetup,
    verifyMFA,
    disableMFA,

    // Backup codes endpoints
    generateBackupCodes,
    verifyBackupCode,
    regenerateBackupCodes,
    getBackupCodesCount,
    getMFAStatus
};
