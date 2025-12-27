/**
 * Email Template Controller
 * Security: All operations enforce multi-tenant isolation via req.firmQuery
 *
 * Endpoints:
 * - CRUD operations for email templates
 * - Preview/render templates
 * - Duplicate templates
 * - Test send functionality
 * - Get available variables
 * - Get templates by trigger event
 */

const EmailTemplate = require('../models/emailTemplate.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Create a new email template
 * @route POST /api/email-templates
 */
const createTemplate = async (req, res) => {
  try {
    // Input validation
    const { name, subject, bodyHtml } = req.body;

    if (!name || typeof name !== 'string') {
      throw CustomException('Template name is required', 400);
    }

    if (!subject || typeof subject !== 'string') {
      throw CustomException('Email subject is required', 400);
    }

    if (!bodyHtml || typeof bodyHtml !== 'string') {
      throw CustomException('Email body HTML is required', 400);
    }

    // Validate lengths
    if (name.length > 200) {
      throw CustomException('Template name must not exceed 200 characters', 400);
    }

    if (subject.length > 300) {
      throw CustomException('Subject must not exceed 300 characters', 400);
    }

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
      'name',
      'code',
      'subject',
      'subjectAr',
      'bodyHtml',
      'bodyHtmlAr',
      'bodyText',
      'bodyTextAr',
      'previewText',
      'type',
      'category',
      'triggerEvent',
      'variables',
      'attachments',
      'isActive',
      'isDefault',
      'layout',
      'thumbnailUrl',
      'tags',
      'notes'
    ]);

    // Validate type if provided
    const validTypes = ['manual', 'automation', 'campaign', 'notification', 'quote', 'invoice'];
    if (allowedFields.type && !validTypes.includes(allowedFields.type)) {
      throw CustomException('Invalid template type', 400);
    }

    // Validate category if provided
    const validCategories = ['welcome', 'follow_up', 'newsletter', 'promotional', 'legal_update', 'reminder', 'notification', 'custom'];
    if (allowedFields.category && !validCategories.includes(allowedFields.category)) {
      throw CustomException('Invalid template category', 400);
    }

    // Create template with firm context
    const template = new EmailTemplate({
      ...allowedFields,
      firmId: req.firmId,
      createdBy: req.userID
    });

    await template.save();

    return res.status(201).json({
      error: false,
      message: 'Email template created successfully',
      data: template
    });
  } catch ({ message, status = 500 }) {
    logger.error('Error creating email template:', message);
    return res.status(status).json({ error: true, message });
  }
};

/**
 * Get all email templates with filters
 * @route GET /api/email-templates
 */
const getTemplates = async (req, res) => {
  try {
    const { type, category, isActive, search, page = 1, limit = 50, sortBy } = req.query;

    // Build query with firm isolation
    const query = {
      $or: [
        { firmId: req.firmId },
        { isPublic: true, isActive: true }
      ]
    };

    // Apply filters
    const validTypes = ['manual', 'automation', 'campaign', 'notification', 'quote', 'invoice'];
    if (type && validTypes.includes(type)) {
      query.type = type;
    }

    const validCategories = ['welcome', 'follow_up', 'newsletter', 'promotional', 'legal_update', 'reminder', 'notification', 'custom'];
    if (category && validCategories.includes(category)) {
      query.category = category;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Safe search with escaped regex
    if (search) {
      const escapedSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { subject: { $regex: escapedSearch, $options: 'i' } },
        { tags: { $regex: escapedSearch, $options: 'i' } }
      ];
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const validSortFields = ['name', 'createdAt', 'lastUsedAt', 'stats.timesSent'];
    let sort = '-createdAt';
    if (sortBy && validSortFields.includes(sortBy)) {
      sort = sortBy;
    }

    // Execute query
    const templates = await EmailTemplate.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select('-bodyHtml -bodyHtmlAr -bodyText -bodyTextAr')
      .populate('createdBy', 'firstName lastName email')
      .lean();

    const total = await EmailTemplate.countDocuments(query);

    return res.json({
      error: false,
      data: templates,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch ({ message, status = 500 }) {
    logger.error('Error fetching email templates:', message);
    return res.status(status).json({ error: true, message });
  }
};

/**
 * Get single email template by ID
 * @route GET /api/email-templates/:id
 */
const getTemplateById = async (req, res) => {
  try {
    const sanitizedId = sanitizeObjectId(req.params.id);

    if (!sanitizedId) {
      throw CustomException('Invalid template ID', 400);
    }

    // IDOR Protection: Query includes firmQuery
    const template = await EmailTemplate.findOne({
      _id: sanitizedId,
      $or: [
        { ...req.firmQuery },
        { isPublic: true }
      ]
    }).populate('createdBy updatedBy', 'firstName lastName email');

    if (!template) {
      throw CustomException('Email template not found', 404);
    }

    return res.json({
      error: false,
      data: template
    });
  } catch ({ message, status = 500 }) {
    logger.error('Error fetching email template:', message);
    return res.status(status).json({ error: true, message });
  }
};

/**
 * Update email template
 * @route PUT /api/email-templates/:id
 */
const updateTemplate = async (req, res) => {
  try {
    const sanitizedId = sanitizeObjectId(req.params.id);

    if (!sanitizedId) {
      throw CustomException('Invalid template ID', 400);
    }

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
      'name',
      'subject',
      'subjectAr',
      'bodyHtml',
      'bodyHtmlAr',
      'bodyText',
      'bodyTextAr',
      'previewText',
      'type',
      'category',
      'triggerEvent',
      'variables',
      'attachments',
      'isActive',
      'isDefault',
      'layout',
      'thumbnailUrl',
      'tags',
      'notes'
    ]);

    // Validate type if provided
    const validTypes = ['manual', 'automation', 'campaign', 'notification', 'quote', 'invoice'];
    if (allowedFields.type && !validTypes.includes(allowedFields.type)) {
      throw CustomException('Invalid template type', 400);
    }

    // Validate category if provided
    const validCategories = ['welcome', 'follow_up', 'newsletter', 'promotional', 'legal_update', 'reminder', 'notification', 'custom'];
    if (allowedFields.category && !validCategories.includes(allowedFields.category)) {
      throw CustomException('Invalid template category', 400);
    }

    // IDOR Protection: Query-level ownership check
    const template = await EmailTemplate.findOneAndUpdate(
      { _id: sanitizedId, ...req.firmQuery },
      {
        $set: {
          ...allowedFields,
          updatedBy: req.userID
        }
      },
      { new: true, runValidators: true }
    );

    if (!template) {
      throw CustomException('Email template not found', 404);
    }

    return res.json({
      error: false,
      message: 'Email template updated successfully',
      data: template
    });
  } catch ({ message, status = 500 }) {
    logger.error('Error updating email template:', message);
    return res.status(status).json({ error: true, message });
  }
};

/**
 * Delete email template
 * @route DELETE /api/email-templates/:id
 */
const deleteTemplate = async (req, res) => {
  try {
    const sanitizedId = sanitizeObjectId(req.params.id);

    if (!sanitizedId) {
      throw CustomException('Invalid template ID', 400);
    }

    // IDOR Protection: Query-level ownership check
    const template = await EmailTemplate.findOneAndDelete({
      _id: sanitizedId,
      ...req.firmQuery
    });

    if (!template) {
      throw CustomException('Email template not found', 404);
    }

    return res.json({
      error: false,
      message: 'Email template deleted successfully'
    });
  } catch ({ message, status = 500 }) {
    logger.error('Error deleting email template:', message);
    return res.status(status).json({ error: true, message });
  }
};

/**
 * Preview/render template with sample data
 * @route POST /api/email-templates/:id/preview
 */
const previewTemplate = async (req, res) => {
  try {
    const sanitizedId = sanitizeObjectId(req.params.id);

    if (!sanitizedId) {
      throw CustomException('Invalid template ID', 400);
    }

    // IDOR Protection
    const template = await EmailTemplate.findOne({
      _id: sanitizedId,
      $or: [
        { ...req.firmQuery },
        { isPublic: true }
      ]
    });

    if (!template) {
      throw CustomException('Email template not found', 404);
    }

    // Get sample data from request body
    const sampleData = req.body.data || {};
    const language = req.body.language || 'en';

    // Validate language
    if (!['en', 'ar'].includes(language)) {
      throw CustomException('Invalid language. Use: en or ar', 400);
    }

    // Render template
    const rendered = template.render(sampleData, language);

    return res.json({
      error: false,
      data: {
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        variables: template.variables,
        missingVariables: template.variables
          .filter(v => v.required && !sampleData[v.name])
          .map(v => v.name)
      }
    });
  } catch ({ message, status = 500 }) {
    logger.error('Error previewing email template:', message);
    return res.status(status).json({ error: true, message });
  }
};

/**
 * Duplicate email template
 * @route POST /api/email-templates/:id/duplicate
 */
const duplicateTemplate = async (req, res) => {
  try {
    const sanitizedId = sanitizeObjectId(req.params.id);

    if (!sanitizedId) {
      throw CustomException('Invalid template ID', 400);
    }

    // IDOR Protection
    const originalTemplate = await EmailTemplate.findOne({
      _id: sanitizedId,
      $or: [
        { ...req.firmQuery },
        { isPublic: true }
      ]
    });

    if (!originalTemplate) {
      throw CustomException('Email template not found', 404);
    }

    // Create duplicate
    const duplicateData = originalTemplate.toObject();
    delete duplicateData._id;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;
    delete duplicateData.stats;
    delete duplicateData.lastUsedAt;
    delete duplicateData.code; // Remove unique code

    // Update name
    duplicateData.name = `${duplicateData.name} (Copy)`;
    duplicateData.firmId = req.firmId;
    duplicateData.createdBy = req.userID;
    duplicateData.isDefault = false;
    duplicateData.isSystemTemplate = false;

    const duplicate = new EmailTemplate(duplicateData);
    await duplicate.save();

    return res.status(201).json({
      error: false,
      message: 'Email template duplicated successfully',
      data: duplicate
    });
  } catch ({ message, status = 500 }) {
    logger.error('Error duplicating email template:', message);
    return res.status(status).json({ error: true, message });
  }
};

/**
 * Send test email
 * @route POST /api/email-templates/:id/test
 */
const testSend = async (req, res) => {
  try {
    const sanitizedId = sanitizeObjectId(req.params.id);

    if (!sanitizedId) {
      throw CustomException('Invalid template ID', 400);
    }

    const { email, data, language = 'en' } = req.body;

    if (!email || typeof email !== 'string') {
      throw CustomException('Test email address is required', 400);
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw CustomException('Invalid email address', 400);
    }

    // Validate language
    if (!['en', 'ar'].includes(language)) {
      throw CustomException('Invalid language. Use: en or ar', 400);
    }

    // IDOR Protection
    const template = await EmailTemplate.findOne({
      _id: sanitizedId,
      $or: [
        { ...req.firmQuery },
        { isPublic: true }
      ]
    });

    if (!template) {
      throw CustomException('Email template not found', 404);
    }

    // Render template
    const rendered = template.render(data || {}, language);

    // Send test email (you can integrate with your email service here)
    // For now, just return the rendered content
    logger.info(`Test email would be sent to: ${email}`);

    // Note: Integrate with EmailService here
    // const emailService = require('../services/email.service');
    // await emailService.sendEmail({
    //   to: email,
    //   subject: `[TEST] ${rendered.subject}`,
    //   html: rendered.html
    // });

    return res.json({
      error: false,
      message: 'Test email prepared (integration pending)',
      data: {
        to: email,
        subject: `[TEST] ${rendered.subject}`,
        preview: rendered.html.substring(0, 200) + '...'
      }
    });
  } catch ({ message, status = 500 }) {
    logger.error('Error sending test email:', message);
    return res.status(status).json({ error: true, message });
  }
};

/**
 * Get available variables for templates
 * @route GET /api/email-templates/variables
 */
const getAvailableVariables = async (req, res) => {
  try {
    // Define available variables by context
    const variables = {
      client: [
        { name: 'clientName', description: 'Client full name', example: 'أحمد محمد' },
        { name: 'clientEmail', description: 'Client email address', example: 'client@example.com' },
        { name: 'clientPhone', description: 'Client phone number', example: '+966501234567' },
        { name: 'clientId', description: 'Client ID number', example: '1234567890' }
      ],
      case: [
        { name: 'caseNumber', description: 'Case number', example: 'CASE-2024-001' },
        { name: 'caseTitle', description: 'Case title', example: 'قضية عقارية' },
        { name: 'caseStatus', description: 'Case status', example: 'Active' },
        { name: 'caseType', description: 'Case type', example: 'Real Estate' },
        { name: 'courtName', description: 'Court name', example: 'محكمة الرياض' }
      ],
      lawyer: [
        { name: 'lawyerName', description: 'Lawyer full name', example: 'المحامي محمد أحمد' },
        { name: 'lawyerEmail', description: 'Lawyer email', example: 'lawyer@firm.com' },
        { name: 'lawyerPhone', description: 'Lawyer phone', example: '+966501234567' },
        { name: 'firmName', description: 'Law firm name', example: 'مكتب المحاماة' }
      ],
      invoice: [
        { name: 'invoiceNumber', description: 'Invoice number', example: 'INV-2024-001' },
        { name: 'invoiceAmount', description: 'Invoice amount', example: '5000 SAR' },
        { name: 'invoiceDueDate', description: 'Invoice due date', example: '2024-12-31' },
        { name: 'invoiceStatus', description: 'Invoice status', example: 'Pending' }
      ],
      appointment: [
        { name: 'appointmentDate', description: 'Appointment date', example: '2024-12-25' },
        { name: 'appointmentTime', description: 'Appointment time', example: '10:00 AM' },
        { name: 'appointmentLocation', description: 'Appointment location', example: 'Office Room 3' },
        { name: 'appointmentType', description: 'Appointment type', example: 'Consultation' }
      ],
      common: [
        { name: 'year', description: 'Current year', example: '2024' },
        { name: 'date', description: 'Current date', example: '25/12/2024' },
        { name: 'firmLogo', description: 'Firm logo URL', example: 'https://example.com/logo.png' },
        { name: 'supportEmail', description: 'Support email', example: 'support@firm.com' },
        { name: 'supportPhone', description: 'Support phone', example: '+966501234567' }
      ]
    };

    return res.json({
      error: false,
      data: variables
    });
  } catch ({ message, status = 500 }) {
    logger.error('Error fetching available variables:', message);
    return res.status(status).json({ error: true, message });
  }
};

/**
 * Get templates by trigger event
 * @route GET /api/email-templates/trigger/:triggerEvent
 */
const getByTrigger = async (req, res) => {
  try {
    const { triggerEvent } = req.params;

    if (!triggerEvent || typeof triggerEvent !== 'string') {
      throw CustomException('Trigger event is required', 400);
    }

    // Sanitize trigger event
    const escapedEvent = escapeRegex(triggerEvent);

    const templates = await EmailTemplate.find({
      $or: [
        { ...req.firmQuery },
        { isPublic: true }
      ],
      triggerEvent: escapedEvent,
      isActive: true
    })
    .select('-bodyHtml -bodyHtmlAr -bodyText -bodyTextAr')
    .lean();

    return res.json({
      error: false,
      data: templates
    });
  } catch ({ message, status = 500 }) {
    logger.error('Error fetching templates by trigger:', message);
    return res.status(status).json({ error: true, message });
  }
};

module.exports = {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
  duplicateTemplate,
  testSend,
  getAvailableVariables,
  getByTrigger
};
