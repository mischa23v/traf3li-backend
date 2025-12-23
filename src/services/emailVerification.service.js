/**
 * Email Verification Service
 * Handles email verification flow for new user registrations
 */

const EmailVerification = require('../models/emailVerification.model');
const { User } = require('../models');
const EmailService = require('./email.service');
const EmailTemplateService = require('./emailTemplate.service');
const logger = require('../utils/logger');

class EmailVerificationService {
    /**
     * Send verification email to user
     * @param {string} userId - User ID
     * @param {string} email - User email
     * @param {string} userName - User name for personalization
     * @param {string} language - Language preference (ar/en)
     * @returns {Promise<Object>} Result with success status and message
     */
    static async sendVerificationEmail(userId, email, userName = '', language = 'ar') {
        try {
            // Check if user exists
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Check if already verified
            if (user.isEmailVerified) {
                return {
                    success: false,
                    message: 'البريد الإلكتروني مُفعّل بالفعل',
                    messageEn: 'Email already verified',
                    code: 'ALREADY_VERIFIED'
                };
            }

            // Check for existing active token
            let verification = await EmailVerification.findActiveByUserId(userId);

            if (verification) {
                // Check if we can resend
                if (!verification.canResend()) {
                    const waitTime = Math.ceil((verification.lastSentAt.getTime() + 5 * 60 * 1000 - Date.now()) / 1000 / 60);
                    return {
                        success: false,
                        message: `يرجى الانتظار ${waitTime} دقيقة قبل إعادة الإرسال`,
                        messageEn: `Please wait ${waitTime} minute(s) before resending`,
                        code: 'RATE_LIMITED',
                        waitTime
                    };
                }

                // Update existing token
                verification.sentCount += 1;
                verification.lastSentAt = new Date();
                await verification.save();
            } else {
                // Create new verification token
                verification = await EmailVerification.createToken(userId, email);
            }

            // Generate verification URL
            const clientUrl = process.env.CLIENT_URL || process.env.DASHBOARD_URL || 'https://dashboard.traf3li.com';
            const verificationUrl = `${clientUrl}/verify-email?token=${verification.token}`;

            // Send verification email
            await this.sendVerificationEmailTemplate(
                email,
                userName,
                verificationUrl,
                verification.token,
                language
            );

            logger.info(`Email verification sent to ${email} for user ${userId}`);

            return {
                success: true,
                message: 'تم إرسال رابط التفعيل إلى بريدك الإلكتروني',
                messageEn: 'Verification link sent to your email',
                expiresAt: verification.expiresAt
            };
        } catch (error) {
            logger.error('Failed to send verification email', { error: error.message, userId, email });
            throw new Error(`Failed to send verification email: ${error.message}`);
        }
    }

    /**
     * Send verification email using template
     * @private
     */
    static async sendVerificationEmailTemplate(email, userName, verificationUrl, token, language = 'ar') {
        const translations = {
            ar: {
                subject: 'تفعيل البريد الإلكتروني - ترافعلي',
                title: 'تفعيل البريد الإلكتروني',
                greeting: `مرحباً ${userName || ''}!`,
                messageText: 'شكراً لتسجيلك في منصة ترافعلي. يرجى تفعيل بريدك الإلكتروني للوصول الكامل إلى جميع مزايا المنصة.',
                buttonText: 'تفعيل البريد الإلكتروني',
                instructionsTitle: 'كيفية التفعيل',
                instructionsText: 'انقر على الزر أدناه لتفعيل بريدك الإلكتروني وإكمال عملية التسجيل. سيتم نقلك إلى صفحة آمنة لإتمام التفعيل.',
                expiryTitle: 'مدة الصلاحية',
                expiryText: 'هذا الرابط صالح لمدة 24 ساعة. بعد ذلك، ستحتاج إلى طلب رابط جديد من إعدادات حسابك.',
                alternativeMethodTitle: 'الطريقة البديلة',
                alternativeMethodText: 'إذا لم يعمل الزر أعلاه، يمكنك نسخ ولصق الرابط التالي في متصفحك:',
                tokenTitle: 'رمز التفعيل',
                tokenText: 'أو يمكنك استخدام رمز التفعيل التالي مباشرة:',
                tokenCode: token,
                benefitsTitle: 'ماذا ستحصل بعد التفعيل؟',
                benefit1: 'إمكانية الوصول الكامل لجميع ميزات المنصة',
                benefit2: 'إدارة القضايا والعملاء بكفاءة',
                benefit3: 'تلقي الإشعارات المهمة',
                benefit4: 'حماية إضافية لحسابك',
                securityTitle: 'الأمان',
                securityText: 'لم تقم بإنشاء حساب؟ يمكنك تجاهل هذا البريد الإلكتروني بأمان. إذا استمررت في تلقي هذه الرسائل، يرجى التواصل مع فريق الدعم.',
                supportText: 'إذا واجهت أي مشكلة في التفعيل، يرجى التواصل مع فريق الدعم الخاص بنا.',
                closingText: 'نتطلع لخدمتك،',
                teamName: 'فريق ترافعلي'
            },
            en: {
                subject: 'Email Verification - Traf3li',
                title: 'Verify Your Email',
                greeting: `Hello ${userName || ''}!`,
                messageText: 'Thank you for registering with Traf3li. Please verify your email to get full access to all platform features.',
                buttonText: 'Verify Email',
                instructionsTitle: 'How to Verify',
                instructionsText: 'Click the button below to verify your email and complete the registration process. You will be taken to a secure page to complete verification.',
                expiryTitle: 'Expiration',
                expiryText: 'This link is valid for 24 hours. After that, you will need to request a new link from your account settings.',
                alternativeMethodTitle: 'Alternative Method',
                alternativeMethodText: 'If the button above doesn\'t work, you can copy and paste the following link into your browser:',
                tokenTitle: 'Verification Code',
                tokenText: 'Or you can use the following verification code directly:',
                tokenCode: token,
                benefitsTitle: 'What You Get After Verification',
                benefit1: 'Full access to all platform features',
                benefit2: 'Efficient case and client management',
                benefit3: 'Receive important notifications',
                benefit4: 'Additional account security',
                securityTitle: 'Security',
                securityText: 'Didn\'t create an account? You can safely ignore this email. If you continue to receive these messages, please contact our support team.',
                supportText: 'If you experience any issues with verification, please contact our support team.',
                closingText: 'We look forward to serving you,',
                teamName: 'The Traf3li Team'
            }
        };

        const t = translations[language];

        const { html } = await EmailTemplateService.render('emailVerification', {
            ...t,
            verificationUrl,
            userName
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
     * Verify email with token
     * @param {string} token - Verification token
     * @returns {Promise<Object>} Result with success status and user info
     */
    static async verifyEmail(token) {
        try {
            if (!token) {
                return {
                    success: false,
                    message: 'رمز التفعيل مطلوب',
                    messageEn: 'Verification token required',
                    code: 'TOKEN_REQUIRED'
                };
            }

            // Verify token
            const result = await EmailVerification.verifyToken(token);

            if (!result.valid) {
                return {
                    success: false,
                    message: 'رمز التفعيل غير صالح أو منتهي الصلاحية',
                    messageEn: 'Invalid or expired verification token',
                    code: result.error
                };
            }

            // Update user
            const user = await User.findByIdAndUpdate(
                result.userId,
                {
                    isEmailVerified: true,
                    emailVerifiedAt: new Date()
                },
                { new: true }
            ).select('_id email username firstName lastName isEmailVerified emailVerifiedAt');

            if (!user) {
                return {
                    success: false,
                    message: 'المستخدم غير موجود',
                    messageEn: 'User not found',
                    code: 'USER_NOT_FOUND'
                };
            }

            logger.info(`Email verified successfully for user ${user._id} (${user.email})`);

            return {
                success: true,
                message: 'تم تفعيل البريد الإلكتروني بنجاح',
                messageEn: 'Email verified successfully',
                user: {
                    id: user._id,
                    email: user.email,
                    username: user.username,
                    name: `${user.firstName} ${user.lastName}`,
                    isEmailVerified: user.isEmailVerified,
                    emailVerifiedAt: user.emailVerifiedAt
                }
            };
        } catch (error) {
            logger.error('Failed to verify email', { error: error.message, token });
            throw new Error(`Failed to verify email: ${error.message}`);
        }
    }

    /**
     * Resend verification email
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Result with success status and message
     */
    static async resendVerificationEmail(userId) {
        try {
            // Get user
            const user = await User.findById(userId).select('email firstName lastName isEmailVerified');

            if (!user) {
                return {
                    success: false,
                    message: 'المستخدم غير موجود',
                    messageEn: 'User not found',
                    code: 'USER_NOT_FOUND'
                };
            }

            // Check if already verified
            if (user.isEmailVerified) {
                return {
                    success: false,
                    message: 'البريد الإلكتروني مُفعّل بالفعل',
                    messageEn: 'Email already verified',
                    code: 'ALREADY_VERIFIED'
                };
            }

            const userName = `${user.firstName} ${user.lastName}`;

            // Send verification email
            return await this.sendVerificationEmail(userId, user.email, userName);
        } catch (error) {
            logger.error('Failed to resend verification email', { error: error.message, userId });
            throw new Error(`Failed to resend verification email: ${error.message}`);
        }
    }

    /**
     * Cleanup expired verification tokens
     * @returns {Promise<number>} Number of deleted tokens
     */
    static async cleanupExpiredTokens() {
        try {
            const deletedCount = await EmailVerification.cleanupExpired();
            logger.info(`Cleaned up ${deletedCount} expired email verification tokens`);
            return deletedCount;
        } catch (error) {
            logger.error('Failed to cleanup expired tokens', { error: error.message });
            throw new Error(`Failed to cleanup expired tokens: ${error.message}`);
        }
    }

    /**
     * Get verification status for a user
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Verification status
     */
    static async getVerificationStatus(userId) {
        try {
            const user = await User.findById(userId).select('email isEmailVerified emailVerifiedAt');

            if (!user) {
                return {
                    success: false,
                    message: 'المستخدم غير موجود',
                    messageEn: 'User not found',
                    code: 'USER_NOT_FOUND'
                };
            }

            let pendingVerification = null;

            if (!user.isEmailVerified) {
                const activeToken = await EmailVerification.findActiveByUserId(userId);
                if (activeToken) {
                    pendingVerification = {
                        expiresAt: activeToken.expiresAt,
                        sentCount: activeToken.sentCount,
                        lastSentAt: activeToken.lastSentAt,
                        canResend: activeToken.canResend()
                    };
                }
            }

            return {
                success: true,
                email: user.email,
                isEmailVerified: user.isEmailVerified,
                emailVerifiedAt: user.emailVerifiedAt,
                pendingVerification
            };
        } catch (error) {
            logger.error('Failed to get verification status', { error: error.message, userId });
            throw new Error(`Failed to get verification status: ${error.message}`);
        }
    }
}

module.exports = EmailVerificationService;
