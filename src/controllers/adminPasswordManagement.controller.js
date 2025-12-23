/**
 * Admin Password Management Controller
 *
 * Administrative endpoints for managing user passwords:
 * - Force individual user to change password
 * - Force all firm users to change passwords
 * - Update firm password policies
 */

const { User, Firm } = require('../models');
const EmailService = require('../services/email.service');
const auditLogService = require('../services/auditLog.service');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

/**
 * Verify admin role with comprehensive checks
 * @param {Object} user - The user object from request
 * @param {string} requiredLevel - 'admin' or 'firmAdmin'
 * @returns {Object} { isAuthorized, message, messageAr }
 */
const verifyAdminRole = (user, requiredLevel = 'admin') => {
    if (!user) {
        return {
            isAuthorized: false,
            message: 'Authentication required',
            messageAr: 'المصادقة مطلوبة'
        };
    }

    // System admin has full access
    if (user.role === 'admin') {
        return { isAuthorized: true };
    }

    // For firm admin level, check firm roles
    if (requiredLevel === 'firmAdmin') {
        if (user.firmRole === 'owner' || user.firmRole === 'admin') {
            return { isAuthorized: true };
        }
    }

    return {
        isAuthorized: false,
        message: 'Administrator privileges required',
        messageAr: 'يتطلب امتيازات المسؤول'
    };
};

/**
 * Validate password management input
 * @param {Object} data - Input data to validate
 * @returns {Object} { isValid, message, messageAr }
 */
const validatePasswordManagementInput = (data) => {
    const { reason } = data;

    // Validate reason if provided
    if (reason !== undefined && reason !== null) {
        if (typeof reason !== 'string') {
            return {
                isValid: false,
                message: 'Reason must be a string',
                messageAr: 'يجب أن يكون السبب نصاً'
            };
        }

        if (reason.length > 500) {
            return {
                isValid: false,
                message: 'Reason must not exceed 500 characters',
                messageAr: 'يجب ألا يتجاوز السبب 500 حرف'
            };
        }
    }

    return { isValid: true };
};

/**
 * Force a specific user to change their password
 * POST /api/admin/users/:id/expire-password
 *
 * NOTE: This endpoint should be protected by rate limiting middleware
 * Recommended: 10 requests per hour per admin user
 *
 * @route POST /api/admin/users/:id/expire-password
 * @access Private (admin only)
 */
const expireUserPassword = async (req, res) => {
    try {
        const adminUser = req.user;
        const targetUserId = sanitizeObjectId(req.params.id);
        const { reason, notifyUser = true } = req.body;

        // Verify admin role
        const roleCheck = verifyAdminRole(adminUser, 'firmAdmin');
        if (!roleCheck.isAuthorized) {
            // Log failed authorization attempt
            await auditLogService.log({
                userId: adminUser?._id,
                action: 'admin_expire_user_password',
                category: 'security',
                result: 'failure',
                description: 'Unauthorized password expiration attempt',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                metadata: { targetUserId, reason: 'insufficient_privileges' }
            });

            return res.status(403).json({
                error: true,
                message: roleCheck.message,
                messageAr: roleCheck.messageAr
            });
        }

        // Validate input
        const validation = validatePasswordManagementInput({ reason });
        if (!validation.isValid) {
            return res.status(400).json({
                error: true,
                message: validation.message,
                messageAr: validation.messageAr
            });
        }

        // Get target user
        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            // Log failed attempt
            await auditLogService.log({
                userId: adminUser._id,
                action: 'admin_expire_user_password',
                category: 'security',
                result: 'failure',
                description: 'Attempted to expire password for non-existent user',
                targetUserId: targetUserId,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                metadata: { reason: 'user_not_found' }
            });

            return res.status(404).json({
                error: true,
                message: 'User not found',
                messageAr: 'المستخدم غير موجود'
            });
        }

        // Firm admin can only expire passwords within their firm
        if (adminUser.role !== 'admin') {
            if (!adminUser.firmId || !targetUser.firmId ||
                adminUser.firmId.toString() !== targetUser.firmId.toString()) {
                // Log unauthorized cross-firm access attempt
                await auditLogService.log({
                    userId: adminUser._id,
                    action: 'admin_expire_user_password',
                    category: 'security',
                    result: 'failure',
                    description: 'Attempted to expire password for user outside firm',
                    targetUserId: targetUserId,
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent'],
                    metadata: {
                        adminFirmId: adminUser.firmId,
                        targetFirmId: targetUser.firmId,
                        reason: 'cross_firm_unauthorized'
                    }
                });

                return res.status(403).json({
                    error: true,
                    message: 'You can only manage passwords within your firm',
                    messageAr: 'يمكنك فقط إدارة كلمات المرور داخل مؤسستك'
                });
            }
        }

        // Cannot expire SSO user passwords
        if (targetUser.isSSOUser) {
            // Log attempt to modify SSO user
            await auditLogService.log({
                userId: adminUser._id,
                action: 'admin_expire_user_password',
                category: 'security',
                result: 'failure',
                description: 'Attempted to expire password for SSO user',
                targetUserId: targetUserId,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                metadata: { reason: 'sso_user_invalid_operation' }
            });

            return res.status(400).json({
                error: true,
                message: 'Cannot expire password for SSO users',
                messageAr: 'لا يمكن إنهاء صلاحية كلمة المرور لمستخدمي SSO'
            });
        }

        // Update user
        const now = new Date();
        targetUser.mustChangePassword = true;
        targetUser.mustChangePasswordSetAt = now;
        targetUser.mustChangePasswordSetBy = adminUser._id;
        targetUser.passwordExpiresAt = now; // Set expiration to now

        await targetUser.save();

        // Log action
        await auditLogService.log({
            userId: adminUser._id,
            action: 'admin_expire_user_password',
            category: 'security',
            result: 'success',
            description: `Admin forced password change for user ${targetUser.email}`,
            targetUserId: targetUserId,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: { reason }
        });

        // Send notification email to user
        if (notifyUser) {
            try {
                await EmailService.sendEmail({
                    to: targetUser.email,
                    subject: 'Password Change Required - تغيير كلمة المرور مطلوب',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #dc2626;">Password Change Required</h2>
                            <p>Your administrator has required you to change your password.</p>
                            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
                            <p>You will be prompted to change your password on your next login.</p>
                            <p>Please log in to your account and update your password as soon as possible.</p>
                            <div style="margin: 30px 0;">
                                <a href="${process.env.DASHBOARD_URL || 'https://dashboard.traf3li.com'}/login"
                                   style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                    Log In to Change Password
                                </a>
                            </div>
                            <hr style="margin: 30px 0;">
                            <h2 style="color: #dc2626;">تغيير كلمة المرور مطلوب</h2>
                            <p>طلب المسؤول منك تغيير كلمة المرور الخاصة بك.</p>
                            ${reason ? `<p><strong>السبب:</strong> ${reason}</p>` : ''}
                            <p>ستتم مطالبتك بتغيير كلمة المرور عند تسجيل الدخول التالي.</p>
                            <p>يرجى تسجيل الدخول إلى حسابك وتحديث كلمة المرور في أقرب وقت ممكن.</p>
                            <div style="margin: 30px 0;">
                                <a href="${process.env.DASHBOARD_URL || 'https://dashboard.traf3li.com'}/login"
                                   style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                    تسجيل الدخول لتغيير كلمة المرور
                                </a>
                            </div>
                        </div>
                    `
                });
            } catch (emailError) {
                logger.error('Failed to send password expiration email:', emailError);
                // Don't fail the request if email fails
            }
        }

        res.status(200).json({
            error: false,
            message: 'User password expired successfully',
            messageAr: 'تم إنهاء صلاحية كلمة مرور المستخدم بنجاح',
            data: {
                userId: targetUserId,
                userEmail: targetUser.email,
                mustChangePassword: true,
                setAt: now,
                setBy: adminUser._id,
                notificationSent: notifyUser
            }
        });
    } catch (error) {
        logger.error('Expire user password error:', error);

        // Log error
        await auditLogService.log({
            userId: req.user?._id,
            action: 'admin_expire_user_password',
            category: 'security',
            result: 'error',
            description: 'Error while expiring user password',
            targetUserId: req.params.id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: { error: error.message }
        });

        res.status(500).json({
            error: true,
            message: 'Failed to expire user password',
            messageAr: 'فشل إنهاء صلاحية كلمة مرور المستخدم',
            details: error.message
        });
    }
};

/**
 * Force all users in a firm to change their passwords
 * POST /api/admin/firm/expire-all-passwords
 *
 * NOTE: This endpoint should be protected by strict rate limiting middleware
 * Recommended: 3 requests per day per admin user (this is a critical bulk operation)
 *
 * @route POST /api/admin/firm/expire-all-passwords
 * @access Private (firm owner/admin only)
 */
const expireAllFirmPasswords = async (req, res) => {
    try {
        const adminUser = req.user;
        const { reason, notifyUsers = true, excludeSelf = true } = req.body;

        // Verify admin role
        const roleCheck = verifyAdminRole(adminUser, 'firmAdmin');
        if (!roleCheck.isAuthorized) {
            // Log failed authorization attempt
            await auditLogService.log({
                userId: adminUser?._id,
                action: 'admin_expire_all_firm_passwords',
                category: 'security',
                result: 'failure',
                description: 'Unauthorized bulk password expiration attempt',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                metadata: { reason: 'insufficient_privileges' }
            });

            return res.status(403).json({
                error: true,
                message: roleCheck.message,
                messageAr: roleCheck.messageAr
            });
        }

        // Validate input
        const validation = validatePasswordManagementInput({ reason });
        if (!validation.isValid) {
            return res.status(400).json({
                error: true,
                message: validation.message,
                messageAr: validation.messageAr
            });
        }

        if (!adminUser.firmId) {
            // Log invalid firm association
            await auditLogService.log({
                userId: adminUser._id,
                action: 'admin_expire_all_firm_passwords',
                category: 'security',
                result: 'failure',
                description: 'Attempted bulk password expiration without firm association',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                metadata: { reason: 'no_firm_association' }
            });

            return res.status(400).json({
                error: true,
                message: 'User is not associated with a firm',
                messageAr: 'المستخدم غير مرتبط بمؤسسة'
            });
        }

        // Update firm settings
        const firm = await Firm.findById(adminUser.firmId);
        if (!firm) {
            // Log firm not found
            await auditLogService.log({
                userId: adminUser._id,
                action: 'admin_expire_all_firm_passwords',
                category: 'security',
                result: 'failure',
                description: 'Attempted bulk password expiration for non-existent firm',
                firmId: adminUser.firmId,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                metadata: { reason: 'firm_not_found' }
            });

            return res.status(404).json({
                error: true,
                message: 'Firm not found',
                messageAr: 'المؤسسة غير موجودة'
            });
        }

        const now = new Date();
        firm.enterpriseSettings.requirePasswordChange = true;
        firm.enterpriseSettings.requirePasswordChangeSetAt = now;
        await firm.save();

        // Build query to find all firm users (excluding SSO users)
        const query = {
            firmId: adminUser.firmId,
            isSSOUser: { $ne: true }
        };

        // Optionally exclude the admin themselves
        if (excludeSelf) {
            query._id = { $ne: adminUser._id };
        }

        // Update all users in the firm
        const updateResult = await User.updateMany(
            query,
            {
                $set: {
                    mustChangePassword: true,
                    mustChangePasswordSetAt: now,
                    mustChangePasswordSetBy: adminUser._id,
                    passwordExpiresAt: now
                }
            }
        );

        // Log action
        await auditLogService.log({
            userId: adminUser._id,
            firmId: adminUser.firmId,
            action: 'admin_expire_all_firm_passwords',
            category: 'security',
            result: 'success',
            description: `Admin forced password change for all firm users (${updateResult.modifiedCount} users affected)`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: {
                reason,
                affectedCount: updateResult.modifiedCount,
                excludedSelf: excludeSelf
            }
        });

        // Send notification emails
        if (notifyUsers) {
            try {
                const affectedUsers = await User.find(query).select('email firstName').lean();

                for (const user of affectedUsers) {
                    try {
                        await EmailService.sendEmail({
                            to: user.email,
                            subject: 'Password Change Required - تغيير كلمة المرور مطلوب',
                            html: `
                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                    <h2 style="color: #dc2626;">Password Change Required</h2>
                                    <p>Dear ${user.firstName || 'User'},</p>
                                    <p>Your organization has required all users to change their passwords for security purposes.</p>
                                    ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
                                    <p>You will be prompted to change your password on your next login.</p>
                                    <p>Please log in to your account and update your password as soon as possible.</p>
                                    <div style="margin: 30px 0;">
                                        <a href="${process.env.DASHBOARD_URL || 'https://dashboard.traf3li.com'}/login"
                                           style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                            Log In to Change Password
                                        </a>
                                    </div>
                                    <hr style="margin: 30px 0;">
                                    <h2 style="color: #dc2626;">تغيير كلمة المرور مطلوب</h2>
                                    <p>عزيزي ${user.firstName || 'المستخدم'},</p>
                                    <p>طلبت مؤسستك من جميع المستخدمين تغيير كلمات المرور الخاصة بهم لأغراض أمنية.</p>
                                    ${reason ? `<p><strong>السبب:</strong> ${reason}</p>` : ''}
                                    <p>ستتم مطالبتك بتغيير كلمة المرور عند تسجيل الدخول التالي.</p>
                                    <p>يرجى تسجيل الدخول إلى حسابك وتحديث كلمة المرور في أقرب وقت ممكن.</p>
                                    <div style="margin: 30px 0;">
                                        <a href="${process.env.DASHBOARD_URL || 'https://dashboard.traf3li.com'}/login"
                                           style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                            تسجيل الدخول لتغيير كلمة المرور
                                        </a>
                                    </div>
                                </div>
                            `
                        });
                    } catch (emailError) {
                        logger.error(`Failed to send email to ${user.email}:`, emailError);
                        // Continue with other users
                    }
                }
            } catch (emailError) {
                logger.error('Failed to send notification emails:', emailError);
                // Don't fail the request if emails fail
            }
        }

        res.status(200).json({
            error: false,
            message: 'All firm users required to change password',
            messageAr: 'مطلوب من جميع مستخدمي المؤسسة تغيير كلمة المرور',
            data: {
                firmId: adminUser.firmId,
                affectedCount: updateResult.modifiedCount,
                setAt: now,
                setBy: adminUser._id,
                notificationsSent: notifyUsers,
                excludedSelf
            }
        });
    } catch (error) {
        logger.error('Expire all firm passwords error:', error);

        // Log error
        await auditLogService.log({
            userId: req.user?._id,
            firmId: req.user?.firmId,
            action: 'admin_expire_all_firm_passwords',
            category: 'security',
            result: 'error',
            description: 'Error while expiring all firm passwords',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: { error: error.message }
        });

        res.status(500).json({
            error: true,
            message: 'Failed to expire all firm passwords',
            messageAr: 'فشل إنهاء صلاحية كلمات مرور المؤسسة',
            details: error.message
        });
    }
};

/**
 * Get password policy statistics for firm
 * GET /api/admin/firm/password-stats
 *
 * NOTE: This endpoint should be protected by rate limiting middleware
 * Recommended: 60 requests per hour per admin user
 *
 * @route GET /api/admin/firm/password-stats
 * @access Private (firm admin only)
 */
const getFirmPasswordStats = async (req, res) => {
    try {
        const adminUser = req.user;

        // Verify admin role
        const roleCheck = verifyAdminRole(adminUser, 'firmAdmin');
        if (!roleCheck.isAuthorized) {
            // Log failed authorization attempt
            await auditLogService.log({
                userId: adminUser?._id,
                action: 'admin_view_password_stats',
                category: 'security',
                result: 'failure',
                description: 'Unauthorized password statistics access attempt',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                metadata: { reason: 'insufficient_privileges' }
            });

            return res.status(403).json({
                error: true,
                message: roleCheck.message,
                messageAr: roleCheck.messageAr
            });
        }

        if (!adminUser.firmId) {
            // Log invalid firm association
            await auditLogService.log({
                userId: adminUser._id,
                action: 'admin_view_password_stats',
                category: 'security',
                result: 'failure',
                description: 'Attempted to view password statistics without firm association',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                metadata: { reason: 'no_firm_association' }
            });

            return res.status(400).json({
                error: true,
                message: 'User is not associated with a firm',
                messageAr: 'المستخدم غير مرتبط بمؤسسة'
            });
        }

        // Get firm password policy
        const firm = await Firm.findById(adminUser.firmId).select('enterpriseSettings').lean();
        const maxAgeDays = firm?.enterpriseSettings?.passwordMaxAgeDays || 90;
        const expirationEnabled = firm?.enterpriseSettings?.enablePasswordExpiration || false;

        // Get all firm users (non-SSO)
        const allUsers = await User.find({
            firmId: adminUser.firmId,
            isSSOUser: { $ne: true }
        }).select('email firstName lastName passwordChangedAt passwordExpiresAt mustChangePassword').lean();

        const now = new Date();
        const stats = {
            totalUsers: allUsers.length,
            mustChangePassword: 0,
            expired: 0,
            expiringSoon: 0, // Within 7 days
            neverChanged: 0,
            healthy: 0
        };

        const expiringSoonUsers = [];
        const expiredUsers = [];
        const mustChangeUsers = [];

        for (const user of allUsers) {
            // Must change password (admin forced)
            if (user.mustChangePassword) {
                stats.mustChangePassword++;
                mustChangeUsers.push({
                    id: user._id,
                    email: user.email,
                    name: `${user.firstName} ${user.lastName}`
                });
                continue;
            }

            // Never changed password
            if (!user.passwordChangedAt) {
                stats.neverChanged++;
                continue;
            }

            if (expirationEnabled) {
                const passwordDate = new Date(user.passwordChangedAt);
                const ageInMs = now - passwordDate;
                const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
                const daysRemaining = maxAgeDays - ageInDays;

                // Expired
                if (ageInDays >= maxAgeDays) {
                    stats.expired++;
                    expiredUsers.push({
                        id: user._id,
                        email: user.email,
                        name: `${user.firstName} ${user.lastName}`,
                        daysOverdue: ageInDays - maxAgeDays
                    });
                }
                // Expiring soon (within 7 days)
                else if (daysRemaining <= 7 && daysRemaining > 0) {
                    stats.expiringSoon++;
                    expiringSoonUsers.push({
                        id: user._id,
                        email: user.email,
                        name: `${user.firstName} ${user.lastName}`,
                        daysRemaining
                    });
                }
                // Healthy
                else {
                    stats.healthy++;
                }
            } else {
                stats.healthy++;
            }
        }

        // Log successful access to password statistics
        await auditLogService.log({
            userId: adminUser._id,
            firmId: adminUser.firmId,
            action: 'admin_view_password_stats',
            category: 'security',
            result: 'success',
            description: 'Viewed firm password statistics',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: {
                totalUsers: stats.totalUsers,
                expired: stats.expired,
                expiringSoon: stats.expiringSoon,
                mustChangePassword: stats.mustChangePassword
            }
        });

        res.status(200).json({
            error: false,
            data: {
                stats,
                policy: {
                    expirationEnabled,
                    maxAgeDays,
                    historyCount: firm?.enterpriseSettings?.passwordHistoryCount || 12,
                    warningDays: firm?.enterpriseSettings?.passwordExpiryWarningDays || 7,
                    minStrengthScore: firm?.enterpriseSettings?.minPasswordStrengthScore || 50
                },
                users: {
                    expiringSoon: expiringSoonUsers,
                    expired: expiredUsers,
                    mustChange: mustChangeUsers
                }
            }
        });
    } catch (error) {
        logger.error('Get firm password stats error:', error);

        // Log error
        await auditLogService.log({
            userId: req.user?._id,
            firmId: req.user?.firmId,
            action: 'admin_view_password_stats',
            category: 'security',
            result: 'error',
            description: 'Error while retrieving password statistics',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: { error: error.message }
        });

        res.status(500).json({
            error: true,
            message: 'Failed to get password statistics',
            messageAr: 'فشل الحصول على إحصائيات كلمة المرور',
            details: error.message
        });
    }
};

module.exports = {
    expireUserPassword,
    expireAllFirmPasswords,
    getFirmPasswordStats
};
