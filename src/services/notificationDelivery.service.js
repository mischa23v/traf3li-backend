/**
 * Notification Delivery Service for TRAF3LI
 * Handles multi-channel notification delivery: Email (Resend), SMS, WhatsApp, Push
 *
 * Current Implementation:
 * - Email: Resend (IMPLEMENTED - 100 emails/day free)
 * - SMS/WhatsApp: Stubs ready for MSG91/Twilio when company established
 * - Push: Stubs ready for web-push implementation
 *
 * RATE LIMITING:
 * - Max 1 email per user per hour (to prevent spam/blacklisting)
 * - OTP and critical auth emails bypass rate limiting
 */

const { Resend } = require('resend');
const logger = require('../utils/logger');

// Initialize Resend
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const RESEND_CONFIG = {
  fromEmail: process.env.EMAIL_FROM || 'noreply@traf3li.com',
  fromName: process.env.EMAIL_FROM_NAME || 'Traf3li',
};

// Rate limiting: Track last email sent per user/email
// Format: { email: timestamp }
const emailRateLimit = new Map();
const RATE_LIMIT_MS = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Check if email can be sent (rate limit check)
 * @param {string} email - Recipient email
 * @returns {Object} - { allowed: boolean, waitMinutes?: number }
 */
const checkEmailRateLimit = (email) => {
  const lastSent = emailRateLimit.get(email);
  if (!lastSent) {
    return { allowed: true };
  }

  const timeSince = Date.now() - lastSent;
  if (timeSince >= RATE_LIMIT_MS) {
    return { allowed: true };
  }

  const waitMinutes = Math.ceil((RATE_LIMIT_MS - timeSince) / 60000);
  return { allowed: false, waitMinutes };
};

/**
 * Record email sent for rate limiting
 * @param {string} email - Recipient email
 */
const recordEmailSent = (email) => {
  emailRateLimit.set(email, Date.now());

  // Clean up old entries periodically (every 100 emails)
  if (emailRateLimit.size > 100) {
    const now = Date.now();
    for (const [key, timestamp] of emailRateLimit.entries()) {
      if (now - timestamp > RATE_LIMIT_MS) {
        emailRateLimit.delete(key);
      }
    }
  }
};

/**
 * Notification Delivery Service Class
 * Provides unified interface for all notification channels
 */
class NotificationDeliveryService {
  /**
   * Send notification via specified channels
   * @param {Object} options - Notification options
   * @param {string} options.userId - Target user ID
   * @param {string[]} options.channels - Array of channels: 'email', 'sms', 'whatsapp', 'push', 'in_app'
   * @param {string} options.title - Notification title
   * @param {string} options.message - Notification message
   * @param {Object} options.data - Additional data
   * @returns {Promise<Object>} - Results for each channel
   */
  static async send(options) {
    const { userId, channels = ['in_app'], title, message, data = {} } = options;
    const results = {};

    // Get user details for email/phone
    const User = require('../models/user.model');
    const user = await User.findById(userId).lean();

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Process each channel
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'email':
            results.email = await this.sendEmail({
              to: user.email,
              subject: title,
              message,
              userName: `${user.firstName} ${user.lastName}`,
              data
            });
            break;

          case 'sms':
            results.sms = await this.sendSMS({
              to: user.phone,
              message: `${title}: ${message}`
            });
            break;

          case 'whatsapp':
            results.whatsapp = await this.sendWhatsApp({
              to: user.phone,
              message: `*${title}*\n\n${message}`
            });
            break;

          case 'push':
            results.push = await this.sendPush({
              userId,
              title,
              body: message,
              data
            });
            break;

          case 'in_app':
            // In-app notifications handled by notification.controller
            results.in_app = { success: true, message: 'Handled by notification controller' };
            break;

          default:
            results[channel] = { success: false, error: `Unknown channel: ${channel}` };
        }
      } catch (error) {
        logger.error(`Failed to send ${channel} notification:`, error.message);
        results[channel] = { success: false, error: error.message };
      }
    }

    return results;
  }

  /**
   * Send email via Resend (with rate limiting)
   * @param {Object} options - Email options
   * @param {boolean} options.bypassRateLimit - Skip rate limit check (for OTP/auth)
   * @returns {Promise<Object>} - Send result
   */
  static async sendEmail(options) {
    const { to, subject, message, userName = 'User', data = {}, bypassRateLimit = false } = options;

    if (!resend) {
      logger.warn('⚠️ Resend not configured. Email not sent.');
      return {
        success: false,
        error: 'Email service not configured',
        stub: true
      };
    }

    // Check rate limit (unless bypassed for OTP/auth emails)
    if (!bypassRateLimit) {
      const rateCheck = checkEmailRateLimit(to);
      if (!rateCheck.allowed) {
        logger.info(`⏳ Email rate limited for ${to}. Wait ${rateCheck.waitMinutes} minutes.`);
        return {
          success: false,
          rateLimited: true,
          waitMinutes: rateCheck.waitMinutes,
          error: `Rate limited. Max 1 email per hour. Wait ${rateCheck.waitMinutes} minutes.`,
          channel: 'email'
        };
      }
    }

    try {
      const htmlContent = this.generateNotificationEmailHTML({
        title: subject,
        message,
        userName,
        data
      });

      const { data: sendData, error } = await resend.emails.send({
        from: `${RESEND_CONFIG.fromName} <${RESEND_CONFIG.fromEmail}>`,
        to: [to],
        subject: subject,
        html: htmlContent,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Record successful send for rate limiting
      recordEmailSent(to);

      logger.info(`✅ Email sent to ${to}: ${sendData.id}`);
      return {
        success: true,
        messageId: sendData.id,
        channel: 'email'
      };
    } catch (error) {
      logger.error('❌ Email send error:', error.message);
      return {
        success: false,
        error: error.message,
        channel: 'email'
      };
    }
  }

  /**
   * Send SMS
   * STUB - Ready for MSG91/Twilio integration
   * @param {Object} options - SMS options
   * @returns {Promise<Object>} - Send result
   */
  static async sendSMS(options) {
    const { to, message } = options;

    // Check if SMS provider is configured
    if (!process.env.TWILIO_ACCOUNT_SID && !process.env.MSG91_AUTH_KEY) {
      logger.warn('⚠️ SMS provider not configured. SMS not sent.');
      return {
        success: false,
        error: 'SMS service not configured - requires company registration',
        stub: true,
        message: 'To enable SMS, configure MSG91 or Twilio credentials'
      };
    }

    // TODO: Implement when SMS provider is configured
    // Option 1: MSG91 (India/KSA)
    // Option 2: Twilio (International)

    logger.info(`📱 SMS stub: Would send to ${to}: ${message}`);
    return {
      success: false,
      stub: true,
      channel: 'sms',
      message: 'SMS provider not yet configured'
    };
  }

  /**
   * Send WhatsApp message
   * STUB - Ready for MSG91/Twilio integration
   * @param {Object} options - WhatsApp options
   * @returns {Promise<Object>} - Send result
   */
  static async sendWhatsApp(options) {
    const { to, message } = options;

    // Check if WhatsApp provider is configured
    if (!process.env.TWILIO_WHATSAPP && !process.env.MSG91_WHATSAPP_KEY) {
      logger.warn('⚠️ WhatsApp provider not configured. Message not sent.');
      return {
        success: false,
        error: 'WhatsApp service not configured - requires company registration',
        stub: true,
        message: 'To enable WhatsApp, configure MSG91 or Twilio WhatsApp Business'
      };
    }

    // TODO: Implement when WhatsApp provider is configured
    logger.info(`💬 WhatsApp stub: Would send to ${to}: ${message}`);
    return {
      success: false,
      stub: true,
      channel: 'whatsapp',
      message: 'WhatsApp provider not yet configured'
    };
  }

  /**
   * Send Push notification
   * STUB - Ready for web-push/FCM implementation
   * @param {Object} options - Push options
   * @returns {Promise<Object>} - Send result
   */
  static async sendPush(options) {
    const { userId, title, body, data = {} } = options;

    // Check if push is configured
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      logger.warn('⚠️ Push notifications not configured.');
      return {
        success: false,
        error: 'Push service not configured',
        stub: true,
        message: 'To enable push notifications, configure VAPID keys'
      };
    }

    // TODO: Get user's push subscription from database
    // const User = require('../models/user.model');
    // const user = await User.findById(userId).select('pushSubscription').lean();
    // if (!user?.pushSubscription) return { success: false, error: 'User not subscribed to push' };

    logger.info(`🔔 Push stub: Would send to user ${userId}: ${title} - ${body}`);
    return {
      success: false,
      stub: true,
      channel: 'push',
      message: 'Push notifications not yet implemented'
    };
  }

  /**
   * Send Email Verification (DIRECT - bypasses queue)
   * CRITICAL: This method sends directly via Resend API
   * Unlike EmailService.sendEmail() which uses queue (fails silently when DISABLE_QUEUES=true)
   *
   * @param {Object} options - Email options
   * @param {string} options.email - Recipient email
   * @param {string} options.userName - User's name
   * @param {string} options.verificationUrl - Verification URL
   * @param {string} options.token - Verification token (for display)
   * @param {string} options.language - Language preference (ar/en)
   * @returns {Promise<Object>} - Send result
   */
  static async sendVerificationEmail({ email, userName = 'User', verificationUrl, token, language = 'ar' }) {
    if (!resend) {
      logger.warn('⚠️ Resend not configured. Verification email not sent.');
      return {
        success: false,
        error: 'Email service not configured',
        errorAr: 'خدمة البريد الإلكتروني غير مهيأة'
      };
    }

    try {
      const htmlContent = this.generateVerificationEmailHTML({
        userName,
        verificationUrl,
        token,
        language
      });

      const subject = language === 'ar'
        ? 'تفعيل البريد الإلكتروني - ترافعلي'
        : 'Email Verification - Traf3li';

      const { data, error } = await resend.emails.send({
        from: `${RESEND_CONFIG.fromName} <${RESEND_CONFIG.fromEmail}>`,
        to: [email],
        subject,
        html: htmlContent,
      });

      if (error) {
        throw new Error(error.message);
      }

      logger.info(`✅ Verification email sent to ${email}: ${data.id}`);
      return {
        success: true,
        messageId: data.id,
        email: email,
      };
    } catch (error) {
      logger.error('❌ Verification email error:', error.message);
      return {
        success: false,
        error: error.message,
        errorAr: 'فشل إرسال بريد التفعيل',
      };
    }
  }

  /**
   * Generate verification email HTML
   * @private
   */
  static generateVerificationEmailHTML({ userName, verificationUrl, token, language = 'ar' }) {
    const isArabic = language === 'ar';

    const translations = {
      ar: {
        title: 'تفعيل البريد الإلكتروني',
        greeting: `مرحباً ${userName}!`,
        message: 'شكراً لتسجيلك في منصة ترافعلي. يرجى تفعيل بريدك الإلكتروني للوصول الكامل إلى جميع مزايا المنصة.',
        buttonText: 'تفعيل البريد الإلكتروني',
        expiry: 'هذا الرابط صالح لمدة 24 ساعة.',
        alternative: 'أو يمكنك نسخ ولصق الرابط التالي في متصفحك:',
        tokenTitle: 'رمز التفعيل:',
        security: 'لم تقم بإنشاء حساب؟ يمكنك تجاهل هذا البريد الإلكتروني بأمان.',
        footer: 'فريق ترافعلي'
      },
      en: {
        title: 'Verify Your Email',
        greeting: `Hello ${userName}!`,
        message: 'Thank you for registering with Traf3li. Please verify your email to get full access to all platform features.',
        buttonText: 'Verify Email',
        expiry: 'This link is valid for 24 hours.',
        alternative: 'Or you can copy and paste the following link in your browser:',
        tokenTitle: 'Verification Code:',
        security: 'Didn\'t create an account? You can safely ignore this email.',
        footer: 'The Traf3li Team'
      }
    };

    const t = translations[language] || translations.ar;

    return `
<!DOCTYPE html>
<html dir="${isArabic ? 'rtl' : 'ltr'}" lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.title}</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 32px; font-weight: bold; color: #1e40af; }
    .content { line-height: 1.8; }
    .verify-box { background: #f0f9ff; border: 2px solid #1e40af; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0; }
    .button { display: inline-block; background: #1e40af; color: white !important; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; }
    .token-box { background: #f9fafb; border: 1px dashed #d1d5db; border-radius: 6px; padding: 15px; margin: 20px 0; font-family: monospace; font-size: 18px; letter-spacing: 2px; text-align: center; }
    .url-box { background: #f9fafb; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px; color: #4b5563; }
    .warning { color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">ترافعلي | TRAF3LI</div>
      <p style="color: #666;">منصتك القانونية الموثوقة</p>
    </div>

    <div class="content">
      <h2>${t.greeting}</h2>
      <p>${t.message}</p>

      <div class="verify-box">
        <a href="${verificationUrl}" class="button">${t.buttonText}</a>
        <p style="margin-top: 15px; color: #666; font-size: 14px;">${t.expiry}</p>
      </div>

      <p style="color: #666; font-size: 14px;">${t.alternative}</p>
      <div class="url-box">${verificationUrl}</div>

      <p style="margin-top: 20px; color: #666; font-size: 14px;">${t.tokenTitle}</p>
      <div class="token-box">${token}</div>

      <div class="warning">
        <p>⚠️ ${t.security}</p>
      </div>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} TRAF3LI. جميع الحقوق محفوظة.</p>
      <p>المملكة العربية السعودية</p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Send OTP via Email (NO rate limit - users must be able to log in)
   * OTP has its own rate limiting in EmailOTP model (5/hour, 1min between)
   * @param {string} email - Recipient email
   * @param {string} otpCode - OTP code
   * @param {string} userName - User's name
   * @returns {Promise<Object>} - Send result
   */
  static async sendEmailOTP(email, otpCode, userName = 'User') {
    if (!resend) {
      logger.warn('⚠️ Resend not configured. OTP email not sent.');
      return {
        success: false,
        error: 'Email service not configured'
      };
    }

    // NO rate limit check - OTP is critical for login
    // OTP has its own rate limiting in EmailOTP model

    try {
      const htmlContent = this.generateOTPEmailHTML(otpCode, userName);

      const { data, error } = await resend.emails.send({
        from: `${RESEND_CONFIG.fromName} <${RESEND_CONFIG.fromEmail}>`,
        to: [email],
        subject: 'رمز التحقق من ترافعلي - TRAF3LI Verification Code',
        html: htmlContent,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Don't record for rate limiting - OTP should not block other emails
      // OTP has its own rate limiting in EmailOTP model

      logger.info(`✅ OTP email sent to ${email}: ${data.id}`);
      return {
        success: true,
        messageId: data.id,
        email: email,
      };
    } catch (error) {
      logger.error('❌ OTP email error:', error.message);
      return {
        success: false,
        error: error.message,
        errorAr: 'فشل إرسال رمز التحقق عبر البريد الإلكتروني',
      };
    }
  }

  /**
   * Send Welcome Email (bypasses rate limit - user just registered)
   * @param {string} email - Recipient email
   * @param {string} userName - User's name
   * @param {string} userType - 'client' or 'lawyer'
   * @returns {Promise<Object>} - Send result
   */
  static async sendWelcomeEmail(email, userName, userType = 'client') {
    if (!resend) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const htmlContent = this.generateWelcomeEmailHTML(userName, userType);
      const isLawyer = userType === 'lawyer';

      const { data, error } = await resend.emails.send({
        from: `${RESEND_CONFIG.fromName} <${RESEND_CONFIG.fromEmail}>`,
        to: [email],
        subject: isLawyer
          ? 'مرحباً بك في ترافعلي - منصة المحامين'
          : 'مرحباً بك في ترافعلي - منصتك القانونية',
        html: htmlContent,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Record send for rate limiting
      recordEmailSent(email);

      return { success: true, messageId: data.id };
    } catch (error) {
      logger.error('❌ Welcome email error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send Password Reset Email (bypasses rate limit - user initiated)
   * @param {string} email - Recipient email
   * @param {string} resetToken - Reset token
   * @param {string} userName - User's name
   * @returns {Promise<Object>} - Send result
   */
  static async sendPasswordResetEmail(email, resetToken, userName = 'User') {
    if (!resend) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
      const htmlContent = this.generatePasswordResetHTML(resetLink, userName);

      const { data, error } = await resend.emails.send({
        from: `${RESEND_CONFIG.fromName} <${RESEND_CONFIG.fromEmail}>`,
        to: [email],
        subject: 'إعادة تعيين كلمة المرور - TRAF3LI Password Reset',
        html: htmlContent,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Record send for rate limiting
      recordEmailSent(email);

      return { success: true, messageId: data.id };
    } catch (error) {
      logger.error('❌ Password reset email error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send Reminder Email (with rate limiting - max 1/hour per user)
   * @param {Object} reminder - Reminder object
   * @param {Object} user - User object
   * @returns {Promise<Object>} - Send result
   */
  static async sendReminderEmail(reminder, user) {
    if (!resend || !user.email) {
      return { success: false, error: 'Email not available' };
    }

    // Check rate limit - only 1 email per hour per user
    const rateCheck = checkEmailRateLimit(user.email);
    if (!rateCheck.allowed) {
      logger.info(`⏳ Reminder email rate limited for ${user.email}. Skipping.`);
      return {
        success: false,
        rateLimited: true,
        waitMinutes: rateCheck.waitMinutes,
        error: 'Rate limited - will send in next available window'
      };
    }

    try {
      const htmlContent = this.generateReminderEmailHTML(reminder, user);

      const { data, error } = await resend.emails.send({
        from: `${RESEND_CONFIG.fromName} <${RESEND_CONFIG.fromEmail}>`,
        to: [user.email],
        subject: `تذكير: ${reminder.title}`,
        html: htmlContent,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Record successful send for rate limiting
      recordEmailSent(user.email);

      return { success: true, messageId: data.id };
    } catch (error) {
      logger.error('❌ Reminder email error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check service status
   * @returns {Object} - Status of all notification channels
   */
  static getServiceStatus() {
    return {
      email: {
        configured: !!process.env.RESEND_API_KEY,
        provider: 'Resend',
        freeLimit: '100 emails/day (3000/month)',
        status: process.env.RESEND_API_KEY ? 'active' : 'not_configured'
      },
      sms: {
        configured: !!(process.env.TWILIO_ACCOUNT_SID || process.env.MSG91_AUTH_KEY),
        provider: process.env.MSG91_AUTH_KEY ? 'MSG91' : 'Twilio',
        status: 'requires_company_registration'
      },
      whatsapp: {
        configured: !!(process.env.TWILIO_WHATSAPP || process.env.MSG91_WHATSAPP_KEY),
        provider: process.env.MSG91_WHATSAPP_KEY ? 'MSG91' : 'Twilio',
        status: 'requires_company_registration'
      },
      push: {
        configured: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
        provider: 'web-push',
        status: process.env.VAPID_PUBLIC_KEY ? 'active' : 'not_configured'
      }
    };
  }

  // ==================== HTML Templates ====================

  /**
   * Generate notification email HTML
   */
  static generateNotificationEmailHTML({ title, message, userName, data }) {
    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 28px; font-weight: bold; color: #1e40af; }
    .content { background: #f9fafb; border-right: 4px solid #1e40af; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    .button { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">ترافعلي | TRAF3LI</div>
    </div>

    <h2>مرحباً ${userName}،</h2>

    <div class="content">
      <h3>${title}</h3>
      <p>${message}</p>
    </div>

    ${data.link ? `<div style="text-align: center;"><a href="${process.env.CLIENT_URL}${data.link}" class="button">عرض التفاصيل</a></div>` : ''}

    <div class="footer">
      <p>© ${new Date().getFullYear()} TRAF3LI. جميع الحقوق محفوظة.</p>
      <p>المملكة العربية السعودية</p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Generate OTP email HTML
   */
  static generateOTPEmailHTML(otpCode, userName) {
    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>رمز التحقق - TRAF3LI</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 32px; font-weight: bold; color: #1e40af; }
    .otp-box { background: #f0f9ff; border: 2px dashed #1e40af; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0; }
    .otp-code { font-size: 36px; font-weight: bold; color: #1e40af; letter-spacing: 8px; font-family: monospace; }
    .warning { color: #dc2626; font-size: 14px; margin-top: 20px; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">ترافعلي | TRAF3LI</div>
      <p>منصتك القانونية الموثوقة</p>
    </div>

    <h2>مرحباً ${userName}،</h2>
    <p>رمز التحقق الخاص بك هو:</p>

    <div class="otp-box">
      <div class="otp-code">${otpCode}</div>
      <p>صالح لمدة ${process.env.OTP_EXPIRY_MINUTES || '5'} دقائق</p>
    </div>

    <p>الرجاء إدخال هذا الرمز لإكمال عملية التحقق.</p>
    <p class="warning">⚠️ لا تشارك هذا الرمز مع أي شخص. فريق ترافعلي لن يطلب منك هذا الرمز أبداً.</p>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">

    <p style="color: #666; font-size: 14px;">إذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.</p>

    <div class="footer">
      <p>© ${new Date().getFullYear()} TRAF3LI. جميع الحقوق محفوظة.</p>
      <p>المملكة العربية السعودية</p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Generate welcome email HTML
   */
  static generateWelcomeEmailHTML(userName, userType) {
    const isLawyer = userType === 'lawyer';

    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>مرحباً بك في ترافعلي</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 32px; font-weight: bold; color: #1e40af; }
    .button { display: inline-block; background: #1e40af; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .features { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .feature-item { margin: 15px 0; padding-right: 25px; position: relative; }
    .feature-item:before { content: "✓"; position: absolute; right: 0; color: #10b981; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">ترافعلي | TRAF3LI</div>
      <p>منصتك القانونية الموثوقة</p>
    </div>

    <h2>مرحباً بك ${userName}! 🎉</h2>

    ${isLawyer ? `
      <p>نحن سعداء بانضمامك إلى ترافعلي كمحامٍ معتمد.</p>

      <div class="features">
        <h3>ما يمكنك فعله الآن:</h3>
        <div class="feature-item">إنشاء ملفك المهني الشامل</div>
        <div class="feature-item">عرض خدماتك القانونية</div>
        <div class="feature-item">استقبال طلبات العملاء</div>
        <div class="feature-item">إدارة قضاياك بكفاءة</div>
      </div>
    ` : `
      <p>نحن سعداء بانضمامك إلى ترافعلي - منصتك للوصول إلى أفضل المحامين.</p>

      <div class="features">
        <h3>ما يمكنك فعله الآن:</h3>
        <div class="feature-item">تصفح المحامين المعتمدين</div>
        <div class="feature-item">طلب استشارات قانونية</div>
        <div class="feature-item">نشر طلبات القضايا</div>
        <div class="feature-item">المقارنة بين العروض</div>
      </div>
    `}

    <div style="text-align: center;">
      <a href="${process.env.CLIENT_URL || '#'}" class="button">ابدأ الآن</a>
    </div>

    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
      <p>© ${new Date().getFullYear()} TRAF3LI. جميع الحقوق محفوظة.</p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Generate password reset email HTML
   */
  static generatePasswordResetHTML(resetLink, userName) {
    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>إعادة تعيين كلمة المرور</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; }
    .logo { font-size: 32px; font-weight: bold; color: #1e40af; text-align: center; }
    .button { display: inline-block; background: #1e40af; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; }
    .warning { background: #fef2f2; border-right: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">ترافعلي | TRAF3LI</div>

    <h2>مرحباً ${userName}،</h2>
    <p>تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" class="button">إعادة تعيين كلمة المرور</a>
    </div>

    <div class="warning">
      <strong>⚠️ هام:</strong> هذا الرابط صالح لمدة ساعة واحدة فقط
    </div>

    <p style="color: #666; font-size: 14px;">إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذه الرسالة.</p>

    <p>© ${new Date().getFullYear()} TRAF3LI</p>
  </div>
</body>
</html>`;
  }

  /**
   * Generate reminder email HTML
   */
  static generateReminderEmailHTML(reminder, user) {
    const priorityColors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#f97316',
      critical: '#dc2626'
    };

    const priorityLabels = {
      low: 'منخفضة',
      medium: 'متوسطة',
      high: 'عالية',
      critical: 'حرجة'
    };

    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>تذكير - ${reminder.title}</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; }
    .logo { font-size: 32px; font-weight: bold; color: #1e40af; text-align: center; }
    .reminder-box { background: #f9fafb; border-right: 4px solid ${priorityColors[reminder.priority] || '#1e40af'}; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .priority { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; color: white; background: ${priorityColors[reminder.priority] || '#1e40af'}; }
    .button { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">ترافعلي | TRAF3LI</div>

    <h2>مرحباً ${user.firstName}،</h2>
    <p>لديك تذكير هام:</p>

    <div class="reminder-box">
      <span class="priority">${priorityLabels[reminder.priority] || 'متوسطة'}</span>
      <h3>${reminder.title}</h3>
      ${reminder.description ? `<p>${reminder.description}</p>` : ''}
      <p><strong>الموعد:</strong> ${new Date(reminder.reminderDateTime).toLocaleString('ar-SA')}</p>
      ${reminder.type ? `<p><strong>النوع:</strong> ${reminder.type}</p>` : ''}
    </div>

    <div style="text-align: center;">
      <a href="${process.env.CLIENT_URL || '#'}/reminders" class="button">عرض التذكير</a>
    </div>

    <div style="margin-top: 30px; color: #666; font-size: 12px; text-align: center;">
      <p>© ${new Date().getFullYear()} TRAF3LI. جميع الحقوق محفوظة.</p>
    </div>
  </div>
</body>
</html>`;
  }
}

module.exports = NotificationDeliveryService;
