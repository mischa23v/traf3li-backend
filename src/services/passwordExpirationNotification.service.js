/**
 * Password Expiration Notification Service
 *
 * Handles sending password expiration warnings and notifications:
 * - 7-day warning before expiration
 * - 1-day warning before expiration
 * - Notification when password has expired
 *
 * Designed to be run as a scheduled job (daily cron)
 */

const { User, Firm } = require('../models');
const EmailService = require('./email.service');
const { checkPasswordAge } = require('../utils/passwordPolicy');
const logger = require('../utils/logger');

/**
 * Check all users and send password expiration warnings
 * Should be run daily via cron job
 *
 * @returns {Promise<Object>} - Summary of notifications sent
 */
async function checkAndNotifyExpiringPasswords() {
    try {
        logger.info('Starting password expiration notification check...');

        const results = {
            total: 0,
            sevenDayWarnings: 0,
            oneDayWarnings: 0,
            expiredNotifications: 0,
            errors: 0
        };

        // Get all firms with password expiration enabled
        const firms = await Firm.find({
            'enterpriseSettings.enablePasswordExpiration': true
        }).select('_id enterpriseSettings').lean();

        logger.info(`Found ${firms.length} firms with password expiration enabled`);

        for (const firm of firms) {
            const maxAgeDays = firm.enterpriseSettings?.passwordMaxAgeDays || 90;
            const warningDays = firm.enterpriseSettings?.passwordExpiryWarningDays || 7;

            // Get all non-SSO users in this firm
            const users = await User.find({
                firmId: firm._id,
                isSSOUser: { $ne: true },
                mustChangePassword: { $ne: true } // Don't send expiry warnings if already forced to change
            }).select('email firstName lastName passwordChangedAt passwordExpiresAt passwordExpiryWarningsSent');

            for (const user of users) {
                try {
                    results.total++;

                    const ageCheck = checkPasswordAge(user, maxAgeDays);

                    // Password expired - send notification
                    if (ageCheck.needsRotation && !user.passwordExpiryWarningsSent?.expiredNotification) {
                        await sendExpiredPasswordNotification(user, ageCheck.daysOld - maxAgeDays);
                        user.passwordExpiryWarningsSent = user.passwordExpiryWarningsSent || {};
                        user.passwordExpiryWarningsSent.expiredNotification = true;
                        await user.save();
                        results.expiredNotifications++;
                    }
                    // 1-day warning
                    else if (ageCheck.daysRemaining === 1 && !user.passwordExpiryWarningsSent?.oneDayWarning) {
                        await sendPasswordExpiryWarning(user, 1, ageCheck.expiresAt);
                        user.passwordExpiryWarningsSent = user.passwordExpiryWarningsSent || {};
                        user.passwordExpiryWarningsSent.oneDayWarning = true;
                        await user.save();
                        results.oneDayWarnings++;
                    }
                    // 7-day warning
                    else if (ageCheck.daysRemaining <= warningDays &&
                             ageCheck.daysRemaining > 0 &&
                             !user.passwordExpiryWarningsSent?.sevenDayWarning) {
                        await sendPasswordExpiryWarning(user, ageCheck.daysRemaining, ageCheck.expiresAt);
                        user.passwordExpiryWarningsSent = user.passwordExpiryWarningsSent || {};
                        user.passwordExpiryWarningsSent.sevenDayWarning = true;
                        await user.save();
                        results.sevenDayWarnings++;
                    }
                } catch (error) {
                    logger.error(`Error processing user ${user._id}:`, error);
                    results.errors++;
                }
            }
        }

        logger.info('Password expiration notification check completed:', results);
        return results;
    } catch (error) {
        logger.error('Error in checkAndNotifyExpiringPasswords:', error);
        throw error;
    }
}

/**
 * Send password expiry warning email
 *
 * @param {Object} user - User document
 * @param {number} daysRemaining - Days until password expires
 * @param {Date} expiresAt - Expiration date
 */
async function sendPasswordExpiryWarning(user, daysRemaining, expiresAt) {
    const dashboardUrl = process.env.DASHBOARD_URL || 'https://dashboard.traf3li.com';

    const translations = {
        en: {
            subject: `Password Expiring Soon - ${daysRemaining} Day${daysRemaining > 1 ? 's' : ''} Remaining`,
            title: 'Password Expiration Warning',
            greeting: `Dear ${user.firstName || 'User'},`,
            message: `Your password will expire in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}.`,
            details: `For security reasons, your organization requires passwords to be changed regularly. Please change your password before it expires to maintain uninterrupted access to your account.`,
            expiryDate: `Expiration Date: ${expiresAt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
            daysLeft: `Days Remaining: ${daysRemaining}`,
            actionTitle: 'Change Your Password Now',
            actionText: 'To avoid any disruption, we recommend changing your password as soon as possible.',
            buttonText: 'Change Password',
            consequencesTitle: 'What happens if my password expires?',
            consequencesText: 'If your password expires, you will be required to change it before you can access your account again.',
            supportText: 'If you have any questions or need assistance, please contact your system administrator.',
            closing: 'Best regards,',
            teamName: 'The Traf3li Team'
        },
        ar: {
            subject: `كلمة المرور ستنتهي قريباً - ${daysRemaining} يوم متبقي`,
            title: 'تحذير انتهاء صلاحية كلمة المرور',
            greeting: `عزيزي ${user.firstName || 'المستخدم'},`,
            message: `ستنتهي صلاحية كلمة المرور الخاصة بك خلال ${daysRemaining} يوم.`,
            details: `لأسباب أمنية، تتطلب مؤسستك تغيير كلمات المرور بشكل منتظم. يرجى تغيير كلمة المرور قبل انتهاء صلاحيتها للحفاظ على وصول مستمر إلى حسابك.`,
            expiryDate: `تاريخ انتهاء الصلاحية: ${expiresAt.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
            daysLeft: `الأيام المتبقية: ${daysRemaining}`,
            actionTitle: 'غيّر كلمة المرور الآن',
            actionText: 'لتجنب أي انقطاع، نوصي بتغيير كلمة المرور في أقرب وقت ممكن.',
            buttonText: 'تغيير كلمة المرور',
            consequencesTitle: 'ماذا يحدث إذا انتهت صلاحية كلمة المرور؟',
            consequencesText: 'إذا انتهت صلاحية كلمة المرور، ستكون مطالباً بتغييرها قبل أن تتمكن من الوصول إلى حسابك مرة أخرى.',
            supportText: 'إذا كان لديك أي أسئلة أو تحتاج إلى مساعدة، يرجى الاتصال بمسؤول النظام.',
            closing: 'مع أطيب التحيات،',
            teamName: 'فريق ترافعلي'
        }
    };

    // Determine urgency level for styling
    const urgencyColor = daysRemaining <= 1 ? '#dc2626' : daysRemaining <= 3 ? '#f59e0b' : '#3b82f6';

    // Send email in both languages
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <!-- English Version -->
            <div style="border-left: 4px solid ${urgencyColor}; padding-left: 20px; margin-bottom: 40px;">
                <h2 style="color: ${urgencyColor};">${translations.en.title}</h2>
                <p>${translations.en.greeting}</p>
                <div style="background-color: #fef3c7; border: 2px solid #fbbf24; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 18px; font-weight: bold; color: #92400e;">⚠️ ${translations.en.message}</p>
                </div>
                <p>${translations.en.details}</p>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>${translations.en.expiryDate}</strong></p>
                    <p style="margin: 5px 0;"><strong>${translations.en.daysLeft}</strong></p>
                </div>
                <h3 style="color: ${urgencyColor};">${translations.en.actionTitle}</h3>
                <p>${translations.en.actionText}</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${dashboardUrl}/settings/security"
                       style="background-color: ${urgencyColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                        ${translations.en.buttonText}
                    </a>
                </div>
                <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0; font-weight: bold;">❓ ${translations.en.consequencesTitle}</p>
                    <p style="margin: 5px 0;">${translations.en.consequencesText}</p>
                </div>
                <p style="font-size: 14px; color: #6b7280;">${translations.en.supportText}</p>
                <p style="margin-top: 20px;">${translations.en.closing}<br/>${translations.en.teamName}</p>
            </div>

            <hr style="border: none; border-top: 2px solid #e5e7eb; margin: 40px 0;">

            <!-- Arabic Version -->
            <div dir="rtl" style="border-right: 4px solid ${urgencyColor}; padding-right: 20px;">
                <h2 style="color: ${urgencyColor};">${translations.ar.title}</h2>
                <p>${translations.ar.greeting}</p>
                <div style="background-color: #fef3c7; border: 2px solid #fbbf24; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 18px; font-weight: bold; color: #92400e;">⚠️ ${translations.ar.message}</p>
                </div>
                <p>${translations.ar.details}</p>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>${translations.ar.expiryDate}</strong></p>
                    <p style="margin: 5px 0;"><strong>${translations.ar.daysLeft}</strong></p>
                </div>
                <h3 style="color: ${urgencyColor};">${translations.ar.actionTitle}</h3>
                <p>${translations.ar.actionText}</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${dashboardUrl}/settings/security"
                       style="background-color: ${urgencyColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                        ${translations.ar.buttonText}
                    </a>
                </div>
                <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0; font-weight: bold;">❓ ${translations.ar.consequencesTitle}</p>
                    <p style="margin: 5px 0;">${translations.ar.consequencesText}</p>
                </div>
                <p style="font-size: 14px; color: #6b7280;">${translations.ar.supportText}</p>
                <p style="margin-top: 20px;">${translations.ar.closing}<br/>${translations.ar.teamName}</p>
            </div>
        </div>
    `;

    await EmailService.sendEmail({
        to: user.email,
        subject: `${translations.en.subject} - ${translations.ar.subject}`,
        html
    });

    logger.info(`Sent ${daysRemaining}-day expiry warning to ${user.email}`);
}

/**
 * Send notification that password has expired
 *
 * @param {Object} user - User document
 * @param {number} daysOverdue - Days since password expired
 */
async function sendExpiredPasswordNotification(user, daysOverdue) {
    const dashboardUrl = process.env.DASHBOARD_URL || 'https://dashboard.traf3li.com';

    const translations = {
        en: {
            subject: 'Your Password Has Expired',
            title: 'Password Expired',
            greeting: `Dear ${user.firstName || 'User'},`,
            message: 'Your password has expired and must be changed before you can access your account.',
            details: `For security reasons, your organization requires passwords to be changed regularly. Your password expired ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} ago.`,
            actionTitle: 'Change Your Password Now',
            actionText: 'You will be prompted to change your password when you log in.',
            buttonText: 'Log In to Change Password',
            supportText: 'If you have any questions or need assistance, please contact your system administrator.',
            closing: 'Best regards,',
            teamName: 'The Traf3li Team'
        },
        ar: {
            subject: 'انتهت صلاحية كلمة المرور الخاصة بك',
            title: 'انتهت صلاحية كلمة المرور',
            greeting: `عزيزي ${user.firstName || 'المستخدم'},`,
            message: 'انتهت صلاحية كلمة المرور الخاصة بك ويجب تغييرها قبل أن تتمكن من الوصول إلى حسابك.',
            details: `لأسباب أمنية، تتطلب مؤسستك تغيير كلمات المرور بشكل منتظم. انتهت صلاحية كلمة المرور منذ ${daysOverdue} يوم.`,
            actionTitle: 'غيّر كلمة المرور الآن',
            actionText: 'ستتم مطالبتك بتغيير كلمة المرور عند تسجيل الدخول.',
            buttonText: 'تسجيل الدخول لتغيير كلمة المرور',
            supportText: 'إذا كان لديك أي أسئلة أو تحتاج إلى مساعدة، يرجى الاتصال بمسؤول النظام.',
            closing: 'مع أطيب التحيات،',
            teamName: 'فريق ترافعلي'
        }
    };

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <!-- English Version -->
            <div style="border-left: 4px solid #dc2626; padding-left: 20px; margin-bottom: 40px;">
                <h2 style="color: #dc2626;">${translations.en.title}</h2>
                <p>${translations.en.greeting}</p>
                <div style="background-color: #fee2e2; border: 2px solid #dc2626; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 18px; font-weight: bold; color: #991b1b;">🔒 ${translations.en.message}</p>
                </div>
                <p>${translations.en.details}</p>
                <h3 style="color: #dc2626;">${translations.en.actionTitle}</h3>
                <p>${translations.en.actionText}</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${dashboardUrl}/login"
                       style="background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                        ${translations.en.buttonText}
                    </a>
                </div>
                <p style="font-size: 14px; color: #6b7280;">${translations.en.supportText}</p>
                <p style="margin-top: 20px;">${translations.en.closing}<br/>${translations.en.teamName}</p>
            </div>

            <hr style="border: none; border-top: 2px solid #e5e7eb; margin: 40px 0;">

            <!-- Arabic Version -->
            <div dir="rtl" style="border-right: 4px solid #dc2626; padding-right: 20px;">
                <h2 style="color: #dc2626;">${translations.ar.title}</h2>
                <p>${translations.ar.greeting}</p>
                <div style="background-color: #fee2e2; border: 2px solid #dc2626; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 18px; font-weight: bold; color: #991b1b;">🔒 ${translations.ar.message}</p>
                </div>
                <p>${translations.ar.details}</p>
                <h3 style="color: #dc2626;">${translations.ar.actionTitle}</h3>
                <p>${translations.ar.actionText}</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${dashboardUrl}/login"
                       style="background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                        ${translations.ar.buttonText}
                    </a>
                </div>
                <p style="font-size: 14px; color: #6b7280;">${translations.ar.supportText}</p>
                <p style="margin-top: 20px;">${translations.ar.closing}<br/>${translations.ar.teamName}</p>
            </div>
        </div>
    `;

    await EmailService.sendEmail({
        to: user.email,
        subject: `${translations.en.subject} - ${translations.ar.subject}`,
        html
    });

    logger.info(`Sent expired password notification to ${user.email}`);
}

/**
 * Send in-app notification about password expiration
 * Can be used to show a banner in the application
 *
 * @param {Object} user - User document
 * @param {number} daysRemaining - Days until password expires
 * @returns {Object} - Notification data
 */
function createInAppNotification(user, daysRemaining) {
    const urgency = daysRemaining <= 1 ? 'critical' : daysRemaining <= 3 ? 'high' : 'medium';

    return {
        type: 'password_expiration_warning',
        urgency,
        daysRemaining,
        message: daysRemaining > 0
            ? `Your password will expire in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Please change it soon.`
            : 'Your password has expired. Please change it now.',
        messageAr: daysRemaining > 0
            ? `ستنتهي صلاحية كلمة المرور الخاصة بك خلال ${daysRemaining} يوم. يرجى تغييرها قريباً.`
            : 'انتهت صلاحية كلمة المرور الخاصة بك. يرجى تغييرها الآن.',
        actionUrl: '/settings/security',
        actionText: 'Change Password',
        actionTextAr: 'تغيير كلمة المرور'
    };
}

module.exports = {
    checkAndNotifyExpiringPasswords,
    sendPasswordExpiryWarning,
    sendExpiredPasswordNotification,
    createInAppNotification
};
