/**
 * Magic Link Service
 * Handles passwordless authentication via email magic links
 */

const crypto = require('crypto');
const MagicLink = require('../models/magicLink.model');
const { User } = require('../models');
const EmailService = require('./email.service');
const logger = require('../utils/logger');

// Magic link expiration time (15 minutes)
const MAGIC_LINK_EXPIRATION_MINUTES = 15;

class MagicLinkService {
    /**
     * Generate a secure random token for magic link
     * @returns {string} - 64-character hex token
     */
    static generateToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Send magic link to user's email
     * @param {string} email - User's email address
     * @param {string} purpose - Purpose of magic link ('login', 'register', 'verify_email')
     * @param {string} redirectUrl - URL to redirect after successful verification
     * @param {Object} metadata - Additional metadata (ip, userAgent)
     * @returns {Object} - { success, message, expiresAt }
     */
    static async sendMagicLink(email, purpose = 'login', redirectUrl = null, metadata = {}) {
        try {
            // Normalize email
            const normalizedEmail = email.toLowerCase().trim();

            // Check if user exists (for login/verify_email) or doesn't exist (for register)
            // NOTE: Bypass firmIsolation filter - magic link works for solo lawyers without firmId
            const existingUser = await User.findOne({ email: normalizedEmail }).select('_id firstName lastName email').setOptions({ bypassFirmFilter: true }).lean();

            if (purpose === 'login' || purpose === 'verify_email') {
                if (!existingUser) {
                    // Don't reveal whether email exists for security
                    logger.info(`Magic link requested for non-existent email: ${normalizedEmail}`);
                    return {
                        success: true,
                        message: 'إذا كان البريد الإلكتروني مسجلاً، ستصلك رسالة تحتوي على رابط تسجيل الدخول',
                        messageEn: 'If the email is registered, you will receive a login link'
                    };
                }
            } else if (purpose === 'register') {
                if (existingUser) {
                    return {
                        success: false,
                        message: 'البريد الإلكتروني مسجل بالفعل، يرجى تسجيل الدخول',
                        messageEn: 'Email already registered, please login instead',
                        code: 'EMAIL_EXISTS'
                    };
                }
            }

            // Generate token
            const token = this.generateToken();

            // Calculate expiration
            const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRATION_MINUTES * 60 * 1000);

            // Create magic link record
            const magicLink = await MagicLink.create({
                token,
                email: normalizedEmail,
                userId: existingUser?._id || null,
                expiresAt,
                purpose,
                metadata: {
                    ip: metadata.ip || null,
                    userAgent: metadata.userAgent || null,
                    redirectUrl: redirectUrl || null
                }
            });

            // Build magic link URL
            const clientUrl = process.env.CLIENT_URL || 'https://traf3li.com';
            const magicLinkUrl = `${clientUrl}/auth/verify-magic-link?token=${token}${redirectUrl ? `&redirect=${encodeURIComponent(redirectUrl)}` : ''}`;

            // Send email
            const userName = existingUser ? `${existingUser.firstName} ${existingUser.lastName}` : 'مستخدم';
            await this.sendMagicLinkEmail(normalizedEmail, magicLinkUrl, userName, purpose, expiresAt);

            logger.info(`Magic link sent to ${normalizedEmail} for purpose: ${purpose}`);

            return {
                success: true,
                message: 'تم إرسال رابط تسجيل الدخول إلى بريدك الإلكتروني',
                messageEn: 'Magic link sent to your email',
                expiresAt,
                expiresInMinutes: MAGIC_LINK_EXPIRATION_MINUTES
            };
        } catch (error) {
            logger.error('Failed to send magic link', { error: error.message, email });
            throw new Error(`Failed to send magic link: ${error.message}`);
        }
    }

    /**
     * Verify magic link token and authenticate user
     * @param {string} token - Magic link token
     * @param {Object} metadata - Additional metadata (ip, userAgent)
     * @returns {Object} - { valid, user, purpose, redirectUrl, message }
     */
    static async verifyMagicLink(token, metadata = {}) {
        try {
            // Find valid magic link
            const magicLink = await MagicLink.findValidByToken(token);

            if (!magicLink) {
                return {
                    valid: false,
                    message: 'رابط تسجيل الدخول غير صالح أو منتهي الصلاحية',
                    messageEn: 'Invalid or expired magic link',
                    code: 'INVALID_TOKEN'
                };
            }

            // Check if already used
            if (magicLink.isUsed) {
                return {
                    valid: false,
                    message: 'تم استخدام رابط تسجيل الدخول هذا بالفعل',
                    messageEn: 'This magic link has already been used',
                    code: 'ALREADY_USED'
                };
            }

            // Check expiration
            if (magicLink.expiresAt < new Date()) {
                return {
                    valid: false,
                    message: 'انتهت صلاحية رابط تسجيل الدخول',
                    messageEn: 'Magic link has expired',
                    code: 'EXPIRED'
                };
            }

            // Get or create user
            let user;
            if (magicLink.userId) {
                // NOTE: Bypass firmIsolation filter - magic link verification works for solo lawyers without firmId
                user = await User.findById(magicLink.userId)
                    .select('-password')
                    .setOptions({ bypassFirmFilter: true })
                    .lean();
            } else {
                // For register purpose, return email for registration flow
                if (magicLink.purpose === 'register') {
                    // Mark as used
                    await magicLink.markAsUsed();

                    return {
                        valid: true,
                        purpose: magicLink.purpose,
                        email: magicLink.email,
                        redirectUrl: magicLink.metadata?.redirectUrl || null,
                        message: 'رابط التسجيل صالح، يرجى إكمال بيانات التسجيل',
                        messageEn: 'Valid registration link, please complete registration'
                    };
                }

                return {
                    valid: false,
                    message: 'المستخدم غير موجود',
                    messageEn: 'User not found',
                    code: 'USER_NOT_FOUND'
                };
            }

            if (!user) {
                return {
                    valid: false,
                    message: 'المستخدم غير موجود',
                    messageEn: 'User not found',
                    code: 'USER_NOT_FOUND'
                };
            }

            // Mark magic link as used
            await magicLink.markAsUsed();

            // Log successful verification
            logger.info(`Magic link verified successfully for user ${user._id}`);

            return {
                valid: true,
                user,
                purpose: magicLink.purpose,
                redirectUrl: magicLink.metadata?.redirectUrl || null,
                message: 'تم التحقق من رابط تسجيل الدخول بنجاح',
                messageEn: 'Magic link verified successfully'
            };
        } catch (error) {
            logger.error('Failed to verify magic link', { error: error.message, token });
            throw new Error(`Failed to verify magic link: ${error.message}`);
        }
    }

    /**
     * Send magic link email
     * @param {string} email - Recipient email
     * @param {string} magicLinkUrl - Full magic link URL
     * @param {string} userName - User's name
     * @param {string} purpose - Purpose of magic link
     * @param {Date} expiresAt - Expiration date
     */
    static async sendMagicLinkEmail(email, magicLinkUrl, userName, purpose, expiresAt) {
        const EmailTemplateService = require('./emailTemplate.service');

        const translations = {
            login: {
                ar: {
                    subject: 'رابط تسجيل الدخول إلى ترافعلي',
                    title: 'تسجيل الدخول بدون كلمة مرور',
                    greeting: `مرحباً ${userName}!`,
                    messageText: 'لقد تلقيت هذا البريد الإلكتروني لأنك طلبت رابط تسجيل دخول بدون كلمة مرور إلى حسابك في ترافعلي.',
                    buttonText: 'تسجيل الدخول',
                    expiryTitle: 'انتهاء الصلاحية',
                    expiryText: `هذا الرابط صالح لمدة ${MAGIC_LINK_EXPIRATION_MINUTES} دقيقة فقط. بعد ذلك، ستحتاج إلى طلب رابط جديد.`,
                    securityTitle: 'الأمان',
                    securityText: 'لا تشارك هذا الرابط مع أي شخص. استخدامه سيؤدي إلى تسجيل الدخول إلى حسابك مباشرة.',
                    warningTitle: 'لم تطلب هذا الرابط؟',
                    warningText: 'إذا لم تطلب هذا الرابط، يرجى تجاهل هذا البريد الإلكتروني. قد يكون شخص ما قد أدخل عنوان بريدك الإلكتروني عن طريق الخطأ.',
                    alternativeMethodTitle: 'الطريقة البديلة',
                    alternativeMethodText: 'إذا لم يعمل الزر أعلاه، يمكنك نسخ ولصق الرابط التالي في متصفحك:',
                    supportText: 'إذا كنت تواجه أي مشاكل، يرجى التواصل مع فريق الدعم.',
                    closingText: 'مع أطيب التحيات،',
                    teamName: 'فريق ترافعلي'
                },
                en: {
                    subject: 'Login Link for Traf3li',
                    title: 'Passwordless Login',
                    greeting: `Hello ${userName}!`,
                    messageText: 'You received this email because you requested a passwordless login link to your Traf3li account.',
                    buttonText: 'Login',
                    expiryTitle: 'Expiration',
                    expiryText: `This link is valid for only ${MAGIC_LINK_EXPIRATION_MINUTES} minutes. After that, you will need to request a new link.`,
                    securityTitle: 'Security',
                    securityText: 'Do not share this link with anyone. Using it will log you directly into your account.',
                    warningTitle: 'Didn\'t request this link?',
                    warningText: 'If you didn\'t request this link, please ignore this email. Someone may have entered your email address by mistake.',
                    alternativeMethodTitle: 'Alternative Method',
                    alternativeMethodText: 'If the button above doesn\'t work, you can copy and paste the following link into your browser:',
                    supportText: 'If you\'re experiencing any issues, please contact our support team.',
                    closingText: 'Best regards,',
                    teamName: 'The Traf3li Team'
                }
            },
            register: {
                ar: {
                    subject: 'أكمل تسجيلك في ترافعلي',
                    title: 'أكمل التسجيل',
                    greeting: 'مرحباً!',
                    messageText: 'انقر على الزر أدناه لإكمال تسجيلك في ترافعلي.',
                    buttonText: 'إكمال التسجيل',
                    expiryTitle: 'انتهاء الصلاحية',
                    expiryText: `هذا الرابط صالح لمدة ${MAGIC_LINK_EXPIRATION_MINUTES} دقيقة فقط.`,
                    securityTitle: 'الأمان',
                    securityText: 'لا تشارك هذا الرابط مع أي شخص.',
                    warningTitle: 'لم تطلب التسجيل؟',
                    warningText: 'إذا لم تطلب التسجيل، يرجى تجاهل هذا البريد الإلكتروني.',
                    alternativeMethodTitle: 'الطريقة البديلة',
                    alternativeMethodText: 'إذا لم يعمل الزر أعلاه، يمكنك نسخ ولصق الرابط التالي في متصفحك:',
                    supportText: 'إذا كنت تواجه أي مشاكل، يرجى التواصل مع فريق الدعم.',
                    closingText: 'مع أطيب التحيات،',
                    teamName: 'فريق ترافعلي'
                },
                en: {
                    subject: 'Complete Your Traf3li Registration',
                    title: 'Complete Registration',
                    greeting: 'Hello!',
                    messageText: 'Click the button below to complete your Traf3li registration.',
                    buttonText: 'Complete Registration',
                    expiryTitle: 'Expiration',
                    expiryText: `This link is valid for only ${MAGIC_LINK_EXPIRATION_MINUTES} minutes.`,
                    securityTitle: 'Security',
                    securityText: 'Do not share this link with anyone.',
                    warningTitle: 'Didn\'t request registration?',
                    warningText: 'If you didn\'t request registration, please ignore this email.',
                    alternativeMethodTitle: 'Alternative Method',
                    alternativeMethodText: 'If the button above doesn\'t work, you can copy and paste the following link into your browser:',
                    supportText: 'If you\'re experiencing any issues, please contact our support team.',
                    closingText: 'Best regards,',
                    teamName: 'The Traf3li Team'
                }
            },
            verify_email: {
                ar: {
                    subject: 'تحقق من بريدك الإلكتروني - ترافعلي',
                    title: 'تحقق من بريدك الإلكتروني',
                    greeting: `مرحباً ${userName}!`,
                    messageText: 'انقر على الزر أدناه لتأكيد بريدك الإلكتروني.',
                    buttonText: 'تأكيد البريد الإلكتروني',
                    expiryTitle: 'انتهاء الصلاحية',
                    expiryText: `هذا الرابط صالح لمدة ${MAGIC_LINK_EXPIRATION_MINUTES} دقيقة فقط.`,
                    securityTitle: 'الأمان',
                    securityText: 'لا تشارك هذا الرابط مع أي شخص.',
                    warningTitle: 'لم تطلب التحقق؟',
                    warningText: 'إذا لم تطلب التحقق من بريدك الإلكتروني، يرجى تجاهل هذا البريد.',
                    alternativeMethodTitle: 'الطريقة البديلة',
                    alternativeMethodText: 'إذا لم يعمل الزر أعلاه، يمكنك نسخ ولصق الرابط التالي في متصفحك:',
                    supportText: 'إذا كنت تواجه أي مشاكل، يرجى التواصل مع فريق الدعم.',
                    closingText: 'مع أطيب التحيات،',
                    teamName: 'فريق ترافعلي'
                },
                en: {
                    subject: 'Verify Your Email - Traf3li',
                    title: 'Verify Your Email',
                    greeting: `Hello ${userName}!`,
                    messageText: 'Click the button below to verify your email address.',
                    buttonText: 'Verify Email',
                    expiryTitle: 'Expiration',
                    expiryText: `This link is valid for only ${MAGIC_LINK_EXPIRATION_MINUTES} minutes.`,
                    securityTitle: 'Security',
                    securityText: 'Do not share this link with anyone.',
                    warningTitle: 'Didn\'t request verification?',
                    warningText: 'If you didn\'t request email verification, please ignore this email.',
                    alternativeMethodTitle: 'Alternative Method',
                    alternativeMethodText: 'If the button above doesn\'t work, you can copy and paste the following link into your browser:',
                    supportText: 'If you\'re experiencing any issues, please contact our support team.',
                    closingText: 'Best regards,',
                    teamName: 'The Traf3li Team'
                }
            }
        };

        const language = 'ar'; // Default to Arabic, could be configurable
        const t = translations[purpose]?.[language] || translations.login[language];

        const { html } = await EmailTemplateService.render('magicLink', {
            ...t,
            magicLinkUrl,
            expiresAt: EmailTemplateService.formatDate(expiresAt, language)
        }, {
            layout: 'notification',
            language
        });

        return await EmailService.sendEmail({
            to: email,
            subject: t.subject,
            html
        });
    }

    /**
     * Cleanup expired magic links
     * Should be called periodically by a cron job
     * @returns {number} - Number of deleted links
     */
    static async cleanupExpiredLinks() {
        try {
            const deletedCount = await MagicLink.cleanupExpired();
            logger.info(`Cleaned up ${deletedCount} expired magic links`);
            return deletedCount;
        } catch (error) {
            logger.error('Failed to cleanup expired magic links', { error: error.message });
            throw error;
        }
    }
}

module.exports = MagicLinkService;
