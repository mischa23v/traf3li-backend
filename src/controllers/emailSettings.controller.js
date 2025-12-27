/**
 * Email Settings Controller
 * Manages SMTP configuration, email templates, and email signatures
 */

const SmtpConfig = require('../models/smtpConfig.model');
const EmailTemplate = require('../models/emailTemplate.model');
const EmailSignature = require('../models/emailSignature.model');
const nodemailer = require('nodemailer');
const { encrypt, decrypt } = require('../utils/encryption');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// ═══════════════════════════════════════════════════════════════
// SMTP CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/**
 * Get SMTP configuration for the firm
 * GET /api/settings/email/smtp
 */
exports.getSmtpConfig = asyncHandler(async (req, res) => {
  const firmId = req.firmId;

  if (!firmId) {
    throw CustomException('Firm ID required', 400);
  }

  // Only admin/owner can view SMTP settings
  if (!['owner', 'admin'].includes(req.firmRole)) {
    throw CustomException('Only firm owners and admins can view SMTP settings', 403);
  }

  const config = await SmtpConfig.findOne({ firmId });

  if (!config) {
    return res.json({
      success: true,
      data: null,
      message: 'No SMTP configuration found'
    });
  }

  // Return config without decrypted password
  const safeConfig = config.toObject();
  if (safeConfig.auth && safeConfig.auth.password) {
    safeConfig.auth.password = '********'; // Mask password
  }

  res.json({
    success: true,
    data: safeConfig
  });
});

/**
 * Save or update SMTP configuration
 * PUT /api/settings/email/smtp
 */
exports.saveSmtpConfig = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const userId = req.userID;

  if (!firmId) {
    throw CustomException('Firm ID required', 400);
  }

  // Only admin/owner can manage SMTP settings
  if (!['owner', 'admin'].includes(req.firmRole)) {
    throw CustomException('Only firm owners and admins can manage SMTP settings', 403);
  }

  // Mass assignment protection - only allow specific fields
  const allowedFields = ['host', 'port', 'secure', 'auth', 'from', 'replyTo', 'options'];
  const data = pickAllowedFields(req.body, allowedFields);

  // Validate required fields
  if (!data.host || typeof data.host !== 'string' || data.host.trim().length === 0) {
    throw CustomException('Valid host is required', 400);
  }

  if (!data.port || typeof data.port !== 'number' || data.port < 1 || data.port > 65535) {
    throw CustomException('Valid port (1-65535) is required', 400);
  }

  if (!data.auth || typeof data.auth !== 'object' || !data.auth.user || !data.auth.password) {
    throw CustomException('Authentication credentials (user and password) are required', 400);
  }

  if (typeof data.auth.user !== 'string' || data.auth.user.trim().length === 0) {
    throw CustomException('Valid username is required', 400);
  }

  if (typeof data.auth.password !== 'string' || data.auth.password.length < 1) {
    throw CustomException('Valid password is required', 400);
  }

  if (!data.from || typeof data.from !== 'object' || !data.from.email) {
    throw CustomException('From email address is required', 400);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.from.email)) {
    throw CustomException('Valid from email address is required', 400);
  }

  // Validate replyTo email if provided
  if (data.replyTo && !emailRegex.test(data.replyTo)) {
    throw CustomException('Valid reply-to email address is required', 400);
  }

  // Validate secure is boolean
  if (data.secure !== undefined && typeof data.secure !== 'boolean') {
    throw CustomException('Secure must be a boolean value', 400);
  }

  // Encrypt password securely
  const encryptedPassword = encrypt(data.auth.password);
  const [iv, authTag, encrypted] = encryptedPassword.split(':');

  const configData = {
    firmId,
    host: data.host.trim(),
    port: data.port,
    secure: data.secure || false,
    auth: {
      user: data.auth.user.trim(),
      password: {
        encrypted,
        iv,
        authTag
      }
    },
    from: {
      name: data.from.name ? data.from.name.trim() : '',
      email: data.from.email.trim().toLowerCase()
    },
    replyTo: data.replyTo ? data.replyTo.trim().toLowerCase() : null,
    options: data.options || {},
    updatedBy: userId
  };

  // Find existing config or create new one
  let config = await SmtpConfig.findOne({ firmId });

  if (config) {
    // Update existing
    Object.assign(config, configData);
    await config.save();
  } else {
    // Create new
    configData.createdBy = userId;
    config = await SmtpConfig.create(configData);
  }

  // Return config without decrypted password
  const safeConfig = config.toObject();
  if (safeConfig.auth && safeConfig.auth.password) {
    safeConfig.auth.password = '********';
  }

  res.json({
    success: true,
    message: 'SMTP configuration saved successfully',
    data: safeConfig
  });
});

/**
 * Test SMTP connection
 * POST /api/settings/email/smtp/test
 */
exports.testSmtpConnection = asyncHandler(async (req, res) => {
  const firmId = req.firmId;

  if (!firmId) {
    throw CustomException('Firm ID required', 400);
  }

  // Only admin/owner can test SMTP
  if (!['owner', 'admin'].includes(req.firmRole)) {
    throw CustomException('Only firm owners and admins can test SMTP connection', 403);
  }

  // Get SMTP config
  const config = await SmtpConfig.findOne({ firmId });

  if (!config) {
    throw CustomException('SMTP configuration not found. Please configure SMTP first.', 404);
  }

  // Decrypt password
  const password = decrypt(
    `${config.auth.password.iv}:${config.auth.password.authTag}:${config.auth.password.encrypted}`
  );

  // Create transporter
  const transportConfig = {
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.auth.user,
      pass: password
    },
    ...config.options
  };

  const transporter = nodemailer.createTransporter(transportConfig);

  try {
    // Verify connection
    await transporter.verify();

    // Update last test result
    config.lastTested = new Date();
    config.lastTestResult = {
      success: true,
      message: 'SMTP connection successful',
      testedAt: new Date()
    };
    await config.save();

    res.json({
      success: true,
      message: 'SMTP connection test successful',
      data: {
        host: config.host,
        port: config.port,
        user: config.auth.user,
        testedAt: config.lastTestResult.testedAt
      }
    });
  } catch (error) {
    // Update last test result with failure
    config.lastTested = new Date();
    config.lastTestResult = {
      success: false,
      message: error.message,
      testedAt: new Date()
    };
    await config.save();

    throw CustomException(`SMTP connection failed: ${error.message}`, 400);
  }
});

// ═══════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════

/**
 * Get all email templates for the firm
 * GET /api/settings/email/templates
 */
exports.getTemplates = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const { category, isActive, search } = req.query;

  if (!firmId) {
    throw CustomException('Firm ID required', 400);
  }

  // Build query
  const query = {
    $or: [
      { firmId },
      { isPublic: true }
    ]
  };

  if (category) {
    query.category = category;
  }

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  if (search) {
    query.$text = { $search: search };
  }

  const templates = await EmailTemplate.find(query)
    .populate('createdBy', 'firstName lastName email')
    .populate('updatedBy', 'firstName lastName email')
    .sort({ updatedAt: -1 });

  res.json({
    success: true,
    count: templates.length,
    data: templates
  });
});

/**
 * Get single email template
 * GET /api/settings/email/templates/:id
 */
exports.getTemplate = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const { id } = req.params;

  if (!firmId) {
    throw CustomException('Firm ID required', 400);
  }

  // Sanitize ObjectId
  const templateId = sanitizeObjectId(id);

  const template = await EmailTemplate.findOne({
    _id: templateId,
    $or: [
      { firmId },
      { isPublic: true }
    ]
  })
    .populate('createdBy', 'firstName lastName email')
    .populate('updatedBy', 'firstName lastName email');

  if (!template) {
    throw CustomException('Template not found', 404);
  }

  res.json({
    success: true,
    data: template
  });
});

/**
 * Create new email template
 * POST /api/settings/email/templates
 */
exports.createTemplate = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const userId = req.userID;

  if (!firmId) {
    throw CustomException('Firm ID required', 400);
  }

  // Only admin/owner can create templates
  if (!['owner', 'admin'].includes(req.firmRole)) {
    throw CustomException('Only firm owners and admins can create email templates', 403);
  }

  // Mass assignment protection
  const allowedFields = [
    'name', 'category', 'subject', 'previewText', 'htmlContent',
    'textContent', 'variables', 'layout', 'tags', 'notes'
  ];
  const data = pickAllowedFields(req.body, allowedFields);

  // Validate required fields
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    throw CustomException('Valid name is required', 400);
  }

  if (!data.subject || typeof data.subject !== 'string' || data.subject.trim().length === 0) {
    throw CustomException('Valid subject is required', 400);
  }

  if (!data.htmlContent || typeof data.htmlContent !== 'string' || data.htmlContent.trim().length === 0) {
    throw CustomException('Valid HTML content is required', 400);
  }

  // Validate optional fields
  if (data.variables && !Array.isArray(data.variables)) {
    throw CustomException('Variables must be an array', 400);
  }

  if (data.tags && !Array.isArray(data.tags)) {
    throw CustomException('Tags must be an array', 400);
  }

  const template = await EmailTemplate.create({
    firmId,
    name: data.name.trim(),
    category: data.category || 'custom',
    subject: data.subject.trim(),
    previewText: data.previewText,
    htmlContent: data.htmlContent,
    textContent: data.textContent,
    variables: data.variables || [],
    layout: data.layout || 'simple',
    tags: data.tags || [],
    notes: data.notes,
    createdBy: userId,
    updatedBy: userId
  });

  res.status(201).json({
    success: true,
    message: 'Email template created successfully',
    data: template
  });
});

/**
 * Update email template
 * PUT /api/settings/email/templates/:id
 */
exports.updateTemplate = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const userId = req.userID;
  const { id } = req.params;

  if (!firmId) {
    throw CustomException('Firm ID required', 400);
  }

  // Only admin/owner can update templates
  if (!['owner', 'admin'].includes(req.firmRole)) {
    throw CustomException('Only firm owners and admins can update email templates', 403);
  }

  // Sanitize ObjectId
  const templateId = sanitizeObjectId(id);

  // Find template (only firm's own templates, not public ones)
  const template = await EmailTemplate.findOne({
    _id: templateId,
    firmId
  });

  if (!template) {
    throw CustomException('Template not found or you do not have permission to update it', 404);
  }

  // Mass assignment protection
  const allowedFields = [
    'name', 'category', 'subject', 'previewText', 'htmlContent',
    'textContent', 'variables', 'layout', 'tags', 'notes', 'isActive'
  ];
  const updates = pickAllowedFields(req.body, allowedFields);

  // Validate updated fields
  if (updates.name !== undefined && (typeof updates.name !== 'string' || updates.name.trim().length === 0)) {
    throw CustomException('Valid name is required', 400);
  }

  if (updates.subject !== undefined && (typeof updates.subject !== 'string' || updates.subject.trim().length === 0)) {
    throw CustomException('Valid subject is required', 400);
  }

  if (updates.htmlContent !== undefined && (typeof updates.htmlContent !== 'string' || updates.htmlContent.trim().length === 0)) {
    throw CustomException('Valid HTML content is required', 400);
  }

  if (updates.variables !== undefined && !Array.isArray(updates.variables)) {
    throw CustomException('Variables must be an array', 400);
  }

  if (updates.tags !== undefined && !Array.isArray(updates.tags)) {
    throw CustomException('Tags must be an array', 400);
  }

  if (updates.isActive !== undefined && typeof updates.isActive !== 'boolean') {
    throw CustomException('isActive must be a boolean', 400);
  }

  // Apply updates
  Object.keys(updates).forEach(field => {
    if (typeof updates[field] === 'string') {
      template[field] = updates[field].trim();
    } else {
      template[field] = updates[field];
    }
  });

  template.updatedBy = userId;
  await template.save();

  res.json({
    success: true,
    message: 'Email template updated successfully',
    data: template
  });
});

/**
 * Delete email template
 * DELETE /api/settings/email/templates/:id
 */
exports.deleteTemplate = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const { id } = req.params;

  if (!firmId) {
    throw CustomException('Firm ID required', 400);
  }

  // Only admin/owner can delete templates
  if (!['owner', 'admin'].includes(req.firmRole)) {
    throw CustomException('Only firm owners and admins can delete email templates', 403);
  }

  // Sanitize ObjectId
  const templateId = sanitizeObjectId(id);

  // Find and delete template (only firm's own templates)
  const template = await EmailTemplate.findOneAndDelete({
    _id: templateId,
    firmId
  });

  if (!template) {
    throw CustomException('Template not found or you do not have permission to delete it', 404);
  }

  res.json({
    success: true,
    message: 'Email template deleted successfully'
  });
});

/**
 * Preview email template with sample data
 * POST /api/settings/email/templates/:id/preview
 */
exports.previewTemplate = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const { id } = req.params;

  if (!firmId) {
    throw CustomException('Firm ID required', 400);
  }

  // Sanitize ObjectId
  const templateId = sanitizeObjectId(id);

  // Mass assignment protection
  const allowedFields = ['sampleData'];
  const data = pickAllowedFields(req.body, allowedFields);

  const template = await EmailTemplate.findOne({
    _id: templateId,
    $or: [
      { firmId },
      { isPublic: true }
    ]
  });

  if (!template) {
    throw CustomException('Template not found', 404);
  }

  // Replace variables in content
  let previewHtml = template.htmlContent;
  let previewText = template.textContent || '';
  let previewSubject = template.subject;

  // Use provided sample data or defaults
  const sampleData = data.sampleData || {};

  // Validate sampleData is an object
  if (typeof sampleData !== 'object' || Array.isArray(sampleData)) {
    throw CustomException('Sample data must be an object', 400);
  }

  // Replace variables in HTML, text, and subject
  if (template.variables && template.variables.length > 0) {
    template.variables.forEach(variable => {
      const value = sampleData[variable.name] || variable.defaultValue || `{{${variable.name}}}`;
      const regex = new RegExp(`{{\\s*${variable.name}\\s*}}`, 'g');

      previewHtml = previewHtml.replace(regex, value);
      previewText = previewText.replace(regex, value);
      previewSubject = previewSubject.replace(regex, value);
    });
  }

  res.json({
    success: true,
    data: {
      subject: previewSubject,
      htmlContent: previewHtml,
      textContent: previewText,
      variables: template.variables,
      sampleDataUsed: sampleData
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// EMAIL SIGNATURES
// ═══════════════════════════════════════════════════════════════

/**
 * Get all email signatures for the user
 * GET /api/user/email/signatures
 */
exports.getSignatures = asyncHandler(async (req, res) => {
  const userId = req.userID;
  const firmId = req.firmId;
  const { isActive } = req.query;

  if (!userId) {
    throw CustomException('User ID required', 400);
  }

  // Build query
  const query = {
    userId,
    firmId
  };

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  const signatures = await EmailSignature.find(query)
    .sort({ isDefault: -1, updatedAt: -1 });

  res.json({
    success: true,
    count: signatures.length,
    data: signatures
  });
});

/**
 * Create new email signature
 * POST /api/user/email/signatures
 */
exports.createSignature = asyncHandler(async (req, res) => {
  const userId = req.userID;
  const firmId = req.firmId;

  if (!userId) {
    throw CustomException('User ID required', 400);
  }

  // Mass assignment protection
  const allowedFields = ['name', 'htmlContent', 'textContent', 'isDefault', 'category', 'tags', 'notes'];
  const data = pickAllowedFields(req.body, allowedFields);

  // Validate required fields
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    throw CustomException('Valid name is required', 400);
  }

  if (!data.htmlContent || typeof data.htmlContent !== 'string' || data.htmlContent.trim().length === 0) {
    throw CustomException('Valid HTML content is required', 400);
  }

  // Validate optional fields
  if (data.isDefault !== undefined && typeof data.isDefault !== 'boolean') {
    throw CustomException('isDefault must be a boolean', 400);
  }

  if (data.tags && !Array.isArray(data.tags)) {
    throw CustomException('Tags must be an array', 400);
  }

  const signature = await EmailSignature.create({
    userId,
    firmId,
    name: data.name.trim(),
    htmlContent: data.htmlContent,
    textContent: data.textContent,
    isDefault: data.isDefault || false,
    category: data.category || 'professional',
    tags: data.tags || [],
    notes: data.notes
  });

  res.status(201).json({
    success: true,
    message: 'Email signature created successfully',
    data: signature
  });
});

/**
 * Update email signature
 * PUT /api/user/email/signatures/:id
 */
exports.updateSignature = asyncHandler(async (req, res) => {
  const userId = req.userID;
  const firmId = req.firmId;
  const { id } = req.params;

  if (!userId) {
    throw CustomException('User ID required', 400);
  }

  // Sanitize ObjectId
  const signatureId = sanitizeObjectId(id);

  // Find signature (only user's own signatures)
  const signature = await EmailSignature.findOne({
    _id: signatureId,
    userId,
    firmId
  });

  if (!signature) {
    throw CustomException('Signature not found or you do not have permission to update it', 404);
  }

  // Mass assignment protection
  const allowedFields = [
    'name', 'htmlContent', 'textContent', 'isDefault',
    'category', 'tags', 'notes', 'isActive'
  ];
  const updates = pickAllowedFields(req.body, allowedFields);

  // Validate updated fields
  if (updates.name !== undefined && (typeof updates.name !== 'string' || updates.name.trim().length === 0)) {
    throw CustomException('Valid name is required', 400);
  }

  if (updates.htmlContent !== undefined && (typeof updates.htmlContent !== 'string' || updates.htmlContent.trim().length === 0)) {
    throw CustomException('Valid HTML content is required', 400);
  }

  if (updates.isDefault !== undefined && typeof updates.isDefault !== 'boolean') {
    throw CustomException('isDefault must be a boolean', 400);
  }

  if (updates.isActive !== undefined && typeof updates.isActive !== 'boolean') {
    throw CustomException('isActive must be a boolean', 400);
  }

  if (updates.tags !== undefined && !Array.isArray(updates.tags)) {
    throw CustomException('Tags must be an array', 400);
  }

  // Apply updates
  Object.keys(updates).forEach(field => {
    if (typeof updates[field] === 'string') {
      signature[field] = updates[field].trim();
    } else {
      signature[field] = updates[field];
    }
  });

  await signature.save();

  res.json({
    success: true,
    message: 'Email signature updated successfully',
    data: signature
  });
});

/**
 * Delete email signature
 * DELETE /api/user/email/signatures/:id
 */
exports.deleteSignature = asyncHandler(async (req, res) => {
  const userId = req.userID;
  const firmId = req.firmId;
  const { id } = req.params;

  if (!userId) {
    throw CustomException('User ID required', 400);
  }

  // Sanitize ObjectId
  const signatureId = sanitizeObjectId(id);

  // Find and delete signature (only user's own signatures)
  const signature = await EmailSignature.findOneAndDelete({
    _id: signatureId,
    userId,
    firmId
  });

  if (!signature) {
    throw CustomException('Signature not found or you do not have permission to delete it', 404);
  }

  // If deleted signature was default, set another as default
  if (signature.isDefault) {
    const anotherSignature = await EmailSignature.findOne({
      userId,
      _id: { $ne: signatureId },
      isActive: true
    }).sort({ updatedAt: -1 });

    if (anotherSignature) {
      anotherSignature.isDefault = true;
      await anotherSignature.save();
    }
  }

  res.json({
    success: true,
    message: 'Email signature deleted successfully'
  });
});

/**
 * Set signature as default
 * PUT /api/user/email/signatures/:id/default
 */
exports.setDefaultSignature = asyncHandler(async (req, res) => {
  const userId = req.userID;
  const firmId = req.firmId;
  const { id } = req.params;

  if (!userId) {
    throw CustomException('User ID required', 400);
  }

  // Sanitize ObjectId
  const signatureId = sanitizeObjectId(id);

  // Verify signature belongs to user
  const signature = await EmailSignature.findOne({
    _id: signatureId,
    userId,
    firmId
  });

  if (!signature) {
    throw CustomException('Signature not found or you do not have permission to modify it', 404);
  }

  // Set as default using static method
  const updatedSignature = await EmailSignature.setDefault(signatureId, userId);

  res.json({
    success: true,
    message: 'Default signature set successfully',
    data: updatedSignature
  });
});
