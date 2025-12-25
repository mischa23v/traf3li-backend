/**
 * SMS Service for TRAF3LI
 * Handles SMS sending via Twilio with MSG91 as fallback
 * Supports international phone number formatting
 */

const logger = require('../utils/logger');

/**
 * SMS Service Class
 * Provides unified interface for SMS providers (Twilio, MSG91)
 */
class SMSService {
  constructor() {
    // Initialize Twilio if configured
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        const twilio = require('twilio');
        this.twilioClient = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
        logger.info('✅ Twilio SMS client initialized');
      } catch (error) {
        logger.error('❌ Failed to initialize Twilio:', error.message);
        this.twilioClient = null;
      }
    } else {
      this.twilioClient = null;
      logger.warn('⚠️ Twilio not configured - SMS will not be sent');
    }

    // Initialize MSG91 if configured (fallback)
    if (process.env.MSG91_AUTH_KEY) {
      this.msg91AuthKey = process.env.MSG91_AUTH_KEY;
      this.msg91SenderId = process.env.MSG91_SENDER_ID || 'TRAF3L';
      this.msg91Route = process.env.MSG91_ROUTE || 'transactional';
      logger.info('✅ MSG91 SMS configured as fallback');
    } else {
      this.msg91AuthKey = null;
    }

    // Provider priority: Twilio (primary), MSG91 (fallback)
    this.primaryProvider = this.twilioClient ? 'twilio' : (this.msg91AuthKey ? 'msg91' : null);
  }

  /**
   * Format phone number to international format
   * Handles Saudi Arabia (+966) numbers primarily
   * @param {string} phone - Input phone number
   * @returns {string} - Formatted phone number with country code
   */
  formatPhoneNumber(phone) {
    if (!phone) {
      throw new Error('Phone number is required');
    }

    // Remove all non-digit characters except + at the beginning
    let cleaned = phone.trim().replace(/[^\d+]/g, '');

    // If already has +, validate and return
    if (cleaned.startsWith('+')) {
      // Remove + for processing
      cleaned = cleaned.substring(1);
    }

    // Handle Saudi Arabia numbers (default country)
    if (cleaned.startsWith('966')) {
      // Already has country code
      return '+' + cleaned;
    } else if (cleaned.startsWith('0')) {
      // Remove leading 0 and add Saudi country code
      return '+966' + cleaned.substring(1);
    } else if (cleaned.length === 9) {
      // Assume Saudi number without leading 0
      return '+966' + cleaned;
    } else if (cleaned.length >= 10 && cleaned.length <= 15) {
      // International number without +
      return '+' + cleaned;
    }

    // If we can't determine format, assume Saudi number
    if (cleaned.length >= 9) {
      return '+966' + cleaned.substring(Math.max(0, cleaned.length - 9));
    }

    throw new Error('Invalid phone number format');
  }

  /**
   * Validate phone number format
   * @param {string} phone - Phone number to validate
   * @returns {boolean} - Whether phone is valid
   */
  isValidPhoneNumber(phone) {
    try {
      const formatted = this.formatPhoneNumber(phone);
      // Check if formatted number has 10-15 digits after country code
      const digits = formatted.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 15;
    } catch (error) {
      return false;
    }
  }

  /**
   * Send SMS via Twilio
   * @param {string} to - Recipient phone number
   * @param {string} message - SMS message content
   * @returns {Promise<Object>} - Send result
   */
  async sendViaTwilio(to, message) {
    if (!this.twilioClient) {
      throw new Error('Twilio is not configured');
    }

    if (!this.twilioPhoneNumber) {
      throw new Error('TWILIO_PHONE_NUMBER is not configured');
    }

    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: this.twilioPhoneNumber,
        to: to,
      });

      logger.info(`✅ SMS sent via Twilio to ${to}: ${result.sid}`);

      return {
        success: true,
        provider: 'twilio',
        messageId: result.sid,
        status: result.status,
        to: to,
      };
    } catch (error) {
      logger.error('❌ Twilio SMS error:', error.message);
      throw error;
    }
  }

  /**
   * Send SMS via MSG91
   * @param {string} to - Recipient phone number
   * @param {string} message - SMS message content
   * @returns {Promise<Object>} - Send result
   */
  async sendViaMSG91(to, message) {
    if (!this.msg91AuthKey) {
      throw new Error('MSG91 is not configured');
    }

    try {
      // MSG91 uses a different library or direct HTTP API
      // This is a placeholder for MSG91 implementation
      const axios = require('axios');

      const response = await axios.post(
        'https://api.msg91.com/api/v5/flow/',
        {
          sender: this.msg91SenderId,
          route: this.msg91Route,
          country: '966', // Saudi Arabia
          sms: [
            {
              message: message,
              to: [to.replace('+', '')], // MSG91 doesn't use + prefix
            }
          ]
        },
        {
          headers: {
            'authkey': this.msg91AuthKey,
            'content-type': 'application/json',
          }
        }
      );

      logger.info(`✅ SMS sent via MSG91 to ${to}`);

      return {
        success: true,
        provider: 'msg91',
        messageId: response.data.request_id || 'msg91_' + Date.now(),
        status: 'sent',
        to: to,
      };
    } catch (error) {
      logger.error('❌ MSG91 SMS error:', error.message);
      throw error;
    }
  }

  /**
   * Send SMS (with automatic provider selection and fallback)
   * @param {Object} options - SMS options
   * @param {string} options.to - Recipient phone number
   * @param {string} options.message - SMS message content
   * @param {string} options.provider - Force specific provider (optional)
   * @returns {Promise<Object>} - Send result
   */
  async sendSMS(options) {
    const { to, message, provider = null } = options;

    // Validate inputs
    if (!to || !message) {
      return {
        success: false,
        error: 'Phone number and message are required',
        errorAr: 'رقم الهاتف والرسالة مطلوبان',
      };
    }

    // Format phone number
    let formattedPhone;
    try {
      formattedPhone = this.formatPhoneNumber(to);
    } catch (error) {
      return {
        success: false,
        error: 'Invalid phone number format',
        errorAr: 'تنسيق رقم الهاتف غير صالح',
        details: error.message,
      };
    }

    // Check if any provider is configured
    if (!this.primaryProvider) {
      logger.warn('⚠️ No SMS provider configured');
      return {
        success: false,
        error: 'SMS service not configured. Please contact administrator.',
        errorAr: 'خدمة الرسائل النصية غير مهيأة. يرجى الاتصال بالمسؤول.',
        stub: true,
      };
    }

    // Truncate message if too long (160 chars for single SMS, 153 for multi-part)
    const truncatedMessage = message.length > 160 ? message.substring(0, 157) + '...' : message;

    // Try primary provider first, then fallback
    const providers = provider ? [provider] : [this.primaryProvider];

    // Add fallback provider if available and different from primary
    if (!provider && this.primaryProvider === 'twilio' && this.msg91AuthKey) {
      providers.push('msg91');
    } else if (!provider && this.primaryProvider === 'msg91' && this.twilioClient) {
      providers.push('twilio');
    }

    let lastError = null;

    for (const providerName of providers) {
      try {
        if (providerName === 'twilio') {
          return await this.sendViaTwilio(formattedPhone, truncatedMessage);
        } else if (providerName === 'msg91') {
          return await this.sendViaMSG91(formattedPhone, truncatedMessage);
        }
      } catch (error) {
        lastError = error;
        logger.warn(`⚠️ ${providerName} failed, trying next provider...`);
      }
    }

    // All providers failed
    logger.error('❌ All SMS providers failed:', lastError?.message);
    return {
      success: false,
      error: 'Failed to send SMS. Please try again later.',
      errorAr: 'فشل إرسال الرسالة النصية. يرجى المحاولة لاحقاً.',
      details: lastError?.message,
    };
  }

  /**
   * Send OTP via SMS
   * @param {string} phone - Recipient phone number
   * @param {string} otpCode - OTP code
   * @returns {Promise<Object>} - Send result
   */
  async sendOTP(phone, otpCode) {
    // Format OTP message (bilingual)
    const message = `رمز التحقق من ترافعلي: ${otpCode}\nTRAF3LI Verification Code: ${otpCode}\nValid for 5 minutes.`;

    return await this.sendSMS({
      to: phone,
      message: message,
    });
  }

  /**
   * Get service status
   * @returns {Object} - Service configuration status
   */
  getStatus() {
    return {
      configured: !!this.primaryProvider,
      primaryProvider: this.primaryProvider,
      twilio: {
        configured: !!this.twilioClient,
        phoneNumber: this.twilioPhoneNumber ? `${this.twilioPhoneNumber.substring(0, 5)}****` : null,
      },
      msg91: {
        configured: !!this.msg91AuthKey,
        senderId: this.msg91SenderId,
      }
    };
  }
}

// Export singleton instance
const smsService = new SMSService();

module.exports = smsService;
