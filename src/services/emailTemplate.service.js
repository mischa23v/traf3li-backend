/**
 * Email Template Service for TRAF3LI
 * Handles loading, compiling, and rendering email templates with multi-language support
 */

const fs = require('fs').promises;
const path = require('path');
const Mustache = require('mustache');
const logger = require('../utils/logger');

// Template directories
const TEMPLATES_DIR = path.join(__dirname, '../templates/emails');
const LAYOUTS_DIR = path.join(TEMPLATES_DIR, 'layouts');

// Default configuration
const DEFAULT_CONFIG = {
  logoUrl: process.env.LOGO_URL || 'https://traf3li.com/logo.png',
  companyName: 'Traf3li',
  phone: '+966 XX XXX XXXX',
  email: 'info@traf3li.com',
  address: 'المملكة العربية السعودية',
  socialLinks: {
    twitter: 'https://twitter.com/traf3li',
    linkedin: 'https://linkedin.com/company/traf3li',
    facebook: 'https://facebook.com/traf3li',
    instagram: 'https://instagram.com/traf3li'
  }
};

// Language translations
const TRANSLATIONS = {
  en: {
    phoneLabel: 'Phone',
    emailLabel: 'Email',
    footerText: 'This email was sent to you because you have an account with Traf3li. If you did not request this email, please ignore it.',
    unsubscribeText: 'Unsubscribe from these emails',
    dateLabel: 'Date',
    documentNumberLabel: 'Document #',
    taxNumberLabel: 'Tax Number',
    // Common labels
    descriptionLabel: 'Description',
    quantityLabel: 'Qty',
    unitPriceLabel: 'Unit Price',
    totalLabel: 'Total',
    subtotalLabel: 'Subtotal',
    discountLabel: 'Discount',
    taxLabel: 'Tax (VAT)',
    amountLabel: 'Amount',
    daysText: 'days'
  },
  ar: {
    phoneLabel: 'الهاتف',
    emailLabel: 'البريد الإلكتروني',
    footerText: 'تم إرسال هذا البريد الإلكتروني إليك لأن لديك حساب في ترافعلي. إذا لم تطلب هذا البريد الإلكتروني، يرجى تجاهله.',
    unsubscribeText: 'إلغاء الاشتراك من هذه الرسائل',
    dateLabel: 'التاريخ',
    documentNumberLabel: 'رقم المستند',
    taxNumberLabel: 'الرقم الضريبي',
    // Common labels
    descriptionLabel: 'الوصف',
    quantityLabel: 'الكمية',
    unitPriceLabel: 'سعر الوحدة',
    totalLabel: 'الإجمالي',
    subtotalLabel: 'المجموع الفرعي',
    discountLabel: 'الخصم',
    taxLabel: 'الضريبة (القيمة المضافة)',
    amountLabel: 'المبلغ',
    daysText: 'أيام'
  }
};

class EmailTemplateService {
  /**
   * Cache for loaded templates
   */
  static templateCache = new Map();

  /**
   * Load a template file from disk
   */
  static async loadTemplate(templateName) {
    // Check cache first
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName);
    }

    try {
      const templatePath = path.join(TEMPLATES_DIR, `${templateName}.html`);
      const template = await fs.readFile(templatePath, 'utf-8');

      // Cache the template
      this.templateCache.set(templateName, template);

      return template;
    } catch (error) {
      throw new Error(`Failed to load template "${templateName}": ${error.message}`);
    }
  }

  /**
   * Load a layout file from disk
   */
  static async loadLayout(layoutName) {
    const cacheKey = `layout:${layoutName}`;

    // Check cache first
    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey);
    }

    try {
      const layoutPath = path.join(LAYOUTS_DIR, `${layoutName}.html`);
      const layout = await fs.readFile(layoutPath, 'utf-8');

      // Cache the layout
      this.templateCache.set(cacheKey, layout);

      return layout;
    } catch (error) {
      throw new Error(`Failed to load layout "${layoutName}": ${error.message}`);
    }
  }

  /**
   * Compile a template with variables using Mustache
   */
  static compile(template, variables) {
    try {
      return Mustache.render(template, variables);
    } catch (error) {
      throw new Error(`Failed to compile template: ${error.message}`);
    }
  }

  /**
   * Get translations for a specific language
   */
  static getTranslations(language = 'en') {
    return TRANSLATIONS[language] || TRANSLATIONS.en;
  }

  /**
   * Merge data with default config and translations
   */
  static prepareData(data, language = 'en') {
    const translations = this.getTranslations(language);
    const direction = language === 'ar' ? 'rtl' : 'ltr';

    return {
      ...DEFAULT_CONFIG,
      ...translations,
      ...data,
      language,
      direction
    };
  }

  /**
   * Render a template with layout
   */
  static async render(templateName, data, options = {}) {
    try {
      const {
        layout = 'base',
        language = data.language || 'en',
        attachments = []
      } = options;

      // Load template content
      const templateContent = await this.loadTemplate(templateName);

      // Prepare data with translations and defaults
      const templateData = this.prepareData(data, language);

      // Compile template content
      const compiledContent = this.compile(templateContent, templateData);

      // If no layout, return just the content
      if (!layout) {
        return {
          html: compiledContent,
          attachments
        };
      }

      // Load and compile layout
      const layoutTemplate = await this.loadLayout(layout);
      const layoutData = {
        ...templateData,
        content: compiledContent,
        title: data.title || 'Traf3li',
        unsubscribeUrl: data.unsubscribeUrl || null
      };

      const finalHtml = this.compile(layoutTemplate, layoutData);

      return {
        html: finalHtml,
        attachments
      };
    } catch (error) {
      throw new Error(`Failed to render template "${templateName}": ${error.message}`);
    }
  }

  /**
   * Render email without layout (for embedded content)
   */
  static async renderPartial(templateName, data, language = 'en') {
    try {
      const templateContent = await this.loadTemplate(templateName);
      const templateData = this.prepareData(data, language);
      return this.compile(templateContent, templateData);
    } catch (error) {
      throw new Error(`Failed to render partial template "${templateName}": ${error.message}`);
    }
  }

  /**
   * Clear template cache (useful for development)
   */
  static clearCache() {
    this.templateCache.clear();
  }

  /**
   * Preload all templates into cache
   */
  static async preloadTemplates() {
    const templates = [
      'welcome',
      'otp',
      'invoice',
      'payment-receipt',
      'case-update',
      'reminder',
      'password-reset'
    ];

    const layouts = ['base', 'notification', 'transactional'];

    try {
      // Preload all templates
      await Promise.all([
        ...templates.map(name => this.loadTemplate(name)),
        ...layouts.map(name => this.loadLayout(name))
      ]);

      logger.info('✓ Email templates preloaded successfully');
    } catch (error) {
      logger.error('✗ Failed to preload email templates:', error.message);
    }
  }

  /**
   * Validate template data
   */
  static validateTemplateData(templateName, data) {
    const requiredFields = {
      'welcome': ['greeting', 'welcomeMessage', 'dashboardUrl'],
      'otp': ['greeting', 'otpCode'],
      'invoice': ['invoiceNumber', 'clientName', 'items', 'total', 'currency'],
      'payment-receipt': ['receiptNumber', 'amount', 'currency', 'paymentDate', 'paymentMethod'],
      'case-update': ['caseNumber', 'caseTitle', 'newStatus'],
      'reminder': ['reminderType', 'messageText'],
      'password-reset': ['resetUrl', 'greeting']
    };

    const required = requiredFields[templateName] || [];
    const missing = required.filter(field => !data[field]);

    if (missing.length > 0) {
      throw new Error(`Missing required fields for template "${templateName}": ${missing.join(', ')}`);
    }

    return true;
  }

  /**
   * Create inline attachment for logo
   */
  static createLogoAttachment(logoPath) {
    return {
      filename: 'logo.png',
      path: logoPath,
      cid: 'logo@traf3li.com'
    };
  }

  /**
   * Format currency amount
   */
  static formatCurrency(amount, currency = 'SAR', language = 'ar') {
    const formattedAmount = new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);

    return `${formattedAmount} ${currency}`;
  }

  /**
   * Format date
   */
  static formatDate(date, language = 'ar') {
    const dateObj = date instanceof Date ? date : new Date(date);

    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(dateObj);
  }

  /**
   * Format time
   */
  static formatTime(date, language = 'ar') {
    const dateObj = date instanceof Date ? date : new Date(date);

    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: language === 'en'
    }).format(dateObj);
  }

  /**
   * Sanitize HTML to prevent XSS
   */
  static sanitizeHtml(html) {
    // Basic sanitization - in production, use a library like DOMPurify
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+="[^"]*"/g, '')
      .replace(/on\w+='[^']*'/g, '');
  }

  /**
   * Generate plain text version from HTML
   */
  static htmlToPlainText(html) {
    return html
      .replace(/<style[^>]*>.*<\/style>/gm, '')
      .replace(/<script[^>]*>.*<\/script>/gm, '')
      .replace(/<[^>]+>/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

module.exports = EmailTemplateService;
