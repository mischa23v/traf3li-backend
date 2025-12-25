/**
 * Password Change Controller
 *
 * Handles password change operations including:
 * - User-initiated password change
 * - Forced password change (admin)
 * - Password expiration management
 */

const bcrypt = require('bcrypt');
const { User, Firm } = require('../models');
const PasswordHistory = require('../models/passwordHistory.model');
const { enforcePasswordPolicy, checkPasswordAge } = require('../utils/passwordPolicy');
const EmailService = require('../services/email.service');
const auditLogService = require('../services/auditLog.service');
const tokenRevocationService = require('../services/tokenRevocation.service');
const sessionManager = require('../services/sessionManager.service');
const RefreshToken = require('../models/refreshToken.model');
const Session = require('../models/session.model');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const sessionConfig = require('../config/session.config');
const logger = require('../utils/logger');

const saltRounds = 12;

/**
 * Change user password
 * POST /api/auth/change-password
 *
 * @route POST /api/auth/change-password
 * @access Private (authenticated users)
 */
const changePassword = async (req, res) => {
    try {
        // NOTE: This endpoint should be protected by rate limiting middleware
        // Recommended: 5 attempts per 15 minutes per user to prevent brute force attacks

        const { currentPassword, newPassword } = req.body;
        const userId = sanitizeObjectId(req.user._id);

        // Input validation - Check required fields
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                error: true,
                message: 'Current password and new password are required',
                messageAr: 'كلمة المرور الحالية وكلمة المرور الجديدة مطلوبتان'
            });
        }

        // Input validation - Type checking
        if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
            return res.status(400).json({
                error: true,
                message: 'Passwords must be strings',
                messageAr: 'يجب أن تكون كلمات المرور نصية'
            });
        }

        // Input validation - Length requirements
        if (newPassword.length < 8) {
            return res.status(400).json({
                error: true,
                message: 'New password must be at least 8 characters long',
                messageAr: 'يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل'
            });
        }

        if (newPassword.length > 128) {
            return res.status(400).json({
                error: true,
                message: 'New password must not exceed 128 characters',
                messageAr: 'يجب ألا تتجاوز كلمة المرور الجديدة 128 حرفاً'
            });
        }

        if (currentPassword.length > 128) {
            return res.status(400).json({
                error: true,
                message: 'Invalid password format',
                messageAr: 'تنسيق كلمة المرور غير صالح'
            });
        }

        // Get user with full details
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                error: true,
                message: 'User not found',
                messageAr: 'المستخدم غير موجود'
            });
        }

        // SSO users cannot change password
        if (user.isSSOUser) {
            return res.status(400).json({
                error: true,
                message: 'SSO users cannot change password. Please use your SSO provider to manage your password.',
                messageAr: 'لا يمكن لمستخدمي SSO تغيير كلمة المرور. يرجى استخدام موفر SSO الخاص بك لإدارة كلمة المرور.'
            });
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            // Log failed attempt
            await auditLogService.log({
                userId,
                action: 'password_change_failed',
                category: 'security',
                result: 'failure',
                description: 'Failed password change attempt - incorrect current password',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            return res.status(401).json({
                error: true,
                message: 'Current password is incorrect',
                messageAr: 'كلمة المرور الحالية غير صحيحة'
            });
        }

        // Check if new password is same as current
        const isSameAsCurrent = await bcrypt.compare(newPassword, user.password);
        if (isSameAsCurrent) {
            return res.status(400).json({
                error: true,
                message: 'New password must be different from current password',
                messageAr: 'يجب أن تكون كلمة المرور الجديدة مختلفة عن كلمة المرور الحالية'
            });
        }

        // Get firm password policy settings
        let firm = null;
        let historyCount = 12;
        let minStrengthScore = 50;

        if (user.firmId) {
            const firmId = sanitizeObjectId(user.firmId);
            firm = await Firm.findById(firmId).select('enterpriseSettings').lean();
            historyCount = firm?.enterpriseSettings?.passwordHistoryCount || 12;
            minStrengthScore = firm?.enterpriseSettings?.minPasswordStrengthScore || 50;
        }

        // Enforce password policy (includes breach check, history, strength)
        const policyCheck = await enforcePasswordPolicy(newPassword, user, {
            checkHistory: true,
            historyCount,
            minStrengthScore,
            checkBreach: true // Check HaveIBeenPwned for leaked passwords
        });

        if (!policyCheck.valid) {
            return res.status(400).json({
                error: true,
                message: 'Password does not meet policy requirements',
                messageAr: 'كلمة المرور لا تلبي متطلبات السياسة',
                errors: policyCheck.errors,
                errorsAr: policyCheck.errorsAr,
                strength: policyCheck.strength,
                breachCheck: policyCheck.breachCheck
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Calculate expiration date
        const now = new Date();
        let passwordExpiresAt = null;

        if (firm?.enterpriseSettings?.enablePasswordExpiration) {
            const maxAgeDays = firm.enterpriseSettings.passwordMaxAgeDays || 90;
            passwordExpiresAt = new Date(now);
            passwordExpiresAt.setDate(passwordExpiresAt.getDate() + maxAgeDays);
        }

        // Save old password to history
        await PasswordHistory.addPasswordToHistory(userId, user.password, historyCount);

        // Update user password and related fields
        user.password = hashedPassword;
        user.passwordChangedAt = now;
        user.passwordExpiresAt = passwordExpiresAt;
        user.mustChangePassword = false;
        user.mustChangePasswordSetAt = null;
        user.mustChangePasswordSetBy = null;

        // Reset password expiry warning flags
        user.passwordExpiryWarningsSent = {
            sevenDayWarning: false,
            oneDayWarning: false,
            expiredNotification: false
        };

        // Add to inline password history (keep last 12)
        user.passwordHistory = user.passwordHistory || [];
        user.passwordHistory.push({
            hash: user.password,
            changedAt: now
        });

        // Keep only last 12 in inline history
        if (user.passwordHistory.length > 12) {
            user.passwordHistory = user.passwordHistory.slice(-12);
        }

        await user.save();

        // ════════════════════════════════════════════════════════════════
        // CRITICAL SECURITY: Revoke all existing tokens on password change
        // This prevents compromised tokens from being used after password change
        // ════════════════════════════════════════════════════════════════
        try {
            // 1. Revoke all tokens in token blacklist (Redis + MongoDB)
            await tokenRevocationService.revokeAllUserTokens(userId, 'password_change', {
                userEmail: user.email,
                firmId: user.firmId,
                revokedBy: userId,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            // 2. Delete all refresh tokens for this user
            await RefreshToken.deleteMany({ userId });

            // 3. Terminate all sessions based on policy configuration
            if (sessionConfig.forceLogoutOnPasswordChange) {
                // Get current session to preserve it (optional)
                const currentToken = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');
                const currentSession = currentToken ? await sessionManager.getSessionByToken(currentToken) : null;

                if (currentSession) {
                    // Terminate all sessions except current
                    await sessionManager.terminateAllSessions(
                        userId,
                        currentSession._id,
                        'password_change',
                        userId
                    );
                } else {
                    // Terminate all sessions including current
                    await sessionManager.terminateAllUserSessions(userId, 'password_change');
                }

                logger.info('All sessions terminated after password change', { userId, keepCurrent: !!currentSession });
            } else {
                logger.info('Session termination skipped (policy disabled)', { userId });
            }

            logger.info('All tokens and sessions revoked after password change', { userId });
        } catch (revokeError) {
            // Log error but don't fail the password change
            // Password was already changed - token revocation is secondary
            logger.error('Failed to revoke tokens after password change:', {
                userId,
                error: revokeError.message
            });
        }

        // Log successful password change
        await auditLogService.log({
            userId,
            action: 'password_changed',
            category: 'security',
            result: 'success',
            description: 'User successfully changed password - all tokens revoked',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: {
                passwordExpiresAt,
                strengthScore: policyCheck.strength.score,
                tokensRevoked: true
            }
        });

        // Send confirmation email
        try {
            await EmailService.sendEmail({
                to: user.email,
                subject: 'Password Changed Successfully - كلمة المرور تم تغييرها بنجاح',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #059669;">Password Changed Successfully</h2>
                        <p>Your password has been changed successfully.</p>
                        <p><strong>Details:</strong></p>
                        <ul>
                            <li>Changed At: ${now.toLocaleString()}</li>
                            <li>IP Address: ${req.ip}</li>
                            ${passwordExpiresAt ? `<li>Expires On: ${passwordExpiresAt.toLocaleDateString()}</li>` : ''}
                        </ul>
                        <p>If you did not make this change, please contact your administrator immediately.</p>
                        <hr style="margin: 30px 0;">
                        <h2 style="color: #059669;">تم تغيير كلمة المرور بنجاح</h2>
                        <p>تم تغيير كلمة المرور الخاصة بك بنجاح.</p>
                        <p><strong>التفاصيل:</strong></p>
                        <ul>
                            <li>تم التغيير في: ${now.toLocaleString('ar-SA')}</li>
                            <li>عنوان IP: ${req.ip}</li>
                            ${passwordExpiresAt ? `<li>تنتهي في: ${passwordExpiresAt.toLocaleDateString('ar-SA')}</li>` : ''}
                        </ul>
                        <p>إذا لم تقم بهذا التغيير، يرجى الاتصال بمسؤولك فوراً.</p>
                    </div>
                `
            });
        } catch (emailError) {
            logger.error('Failed to send password change confirmation email:', emailError);
            // Don't fail the request if email fails
        }

        res.status(200).json({
            error: false,
            message: 'Password changed successfully',
            messageAr: 'تم تغيير كلمة المرور بنجاح',
            data: {
                passwordChangedAt: now,
                passwordExpiresAt,
                strengthScore: policyCheck.strength.score,
                strengthLabel: policyCheck.strength.strength
            }
        });
    } catch (error) {
        logger.error('Change password error:', error);
        res.status(500).json({
            error: true,
            message: 'Failed to change password',
            messageAr: 'فشل تغيير كلمة المرور',
            details: error.message
        });
    }
};

/**
 * Get password expiration status
 * GET /api/auth/password-status
 *
 * @route GET /api/auth/password-status
 * @access Private (authenticated users)
 */
const getPasswordStatus = async (req, res) => {
    try {
        // Sanitize user ID from request
        const userId = sanitizeObjectId(req.user._id);
        const user = req.user;

        let firm = null;
        let expirationEnabled = false;
        let maxAgeDays = 90;
        let warningDays = 7;

        if (user.firmId) {
            const firmId = sanitizeObjectId(user.firmId);
            firm = await Firm.findById(firmId).select('enterpriseSettings').lean();
            expirationEnabled = firm?.enterpriseSettings?.enablePasswordExpiration || false;
            maxAgeDays = firm?.enterpriseSettings?.passwordMaxAgeDays || 90;
            warningDays = firm?.enterpriseSettings?.passwordExpiryWarningDays || 7;
        }

        const ageCheck = checkPasswordAge(user, maxAgeDays);

        res.status(200).json({
            error: false,
            data: {
                mustChangePassword: user.mustChangePassword || false,
                mustChangePasswordReason: user.mustChangePassword
                    ? (user.mustChangePasswordSetBy ? 'admin_forced' : 'unknown')
                    : null,
                passwordChangedAt: user.passwordChangedAt,
                passwordExpiresAt: user.passwordExpiresAt,
                expirationEnabled,
                daysOld: ageCheck.daysOld,
                daysRemaining: ageCheck.daysRemaining,
                needsRotation: ageCheck.needsRotation,
                warningThreshold: warningDays,
                showWarning: ageCheck.daysRemaining <= warningDays && ageCheck.daysRemaining > 0,
                isSSOUser: user.isSSOUser || false
            }
        });
    } catch (error) {
        logger.error('Get password status error:', error);
        res.status(500).json({
            error: true,
            message: 'Failed to get password status',
            messageAr: 'فشل الحصول على حالة كلمة المرور',
            details: error.message
        });
    }
};

module.exports = {
    changePassword,
    getPasswordStatus
};
