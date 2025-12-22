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
  const {
    host,
    port,
    secure,
    auth,
    from,
    replyTo,
    options
  } = req.body;

  if (!firmId) {
    throw CustomException('Firm ID required', 400);
  }

  // Only admin/owner can manage SMTP settings
  if (!['owner', 'admin'].includes(req.firmRole)) {
    throw CustomException('Only firm owners and admins can manage SMTP settings', 403);
  }

  // Validate required fields
  if (!host || !port || !auth || !auth.user || !auth.password) {
    throw CustomException('Host, port, username, and password are required', 400);
  }

  if (!from || !from.email) {
    throw CustomException('From email address is required', 400);
  }

  // Encrypt password
  const encryptedPassword = encrypt(auth.password);
  const [iv, authTag, encrypted] = encryptedPassword.split(':');

  const configData = {
    firmId,
    host,
    port,
    secure: secure || false,
    auth: {
      user: auth.user,
      password: {
        encrypted,
        iv,
        authTag
      }
    },
    from: {
      name: from.name || '',
      email: from.email
    },
    replyTo: replyTo || null,
    options: options || {},
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

  const template = await EmailTemplate.findOne({
    _id: id,
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
  const {
    name,
    category,
    subject,
    previewText,
    htmlContent,
    textContent,
    variables,
    layout,
    tags,
    notes
  } = req.body;

  if (!firmId) {
    throw CustomException('Firm ID required', 400);
  }

  // Only admin/owner can create templates
  if (!['owner', 'admin'].includes(req.firmRole)) {
    throw CustomException('Only firm owners and admins can create email templates', 403);
  }

  // Validate required fields
  if (!name || !subject || !htmlContent) {
    throw CustomException('Name, subject, and HTML content are required', 400);
  }

  const template = await EmailTemplate.create({
    firmId,
    name,
    category: category || 'custom',
    subject,
    previewText,
    htmlContent,
    textContent,
    variables: variables || [],
    layout: layout || 'simple',
    tags: tags || [],
    notes,
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
  const updates = req.body;

  if (!firmId) {
    throw CustomException('Firm ID required', 400);
  }

  // Only admin/owner can update templates
  if (!['owner', 'admin'].includes(req.firmRole)) {
    throw CustomException('Only firm owners and admins can update email templates', 403);
  }

  // Find template (only firm's own templates, not public ones)
  const template = await EmailTemplate.findOne({
    _id: id,
    firmId
  });

  if (!template) {
    throw CustomException('Template not found or you do not have permission to update it', 404);
  }

  // Update allowed fields
  const allowedUpdates = [
    'name', 'category', 'subject', 'previewText', 'htmlContent',
    'textContent', 'variables', 'layout', 'tags', 'notes', 'isActive'
  ];

  allowedUpdates.forEach(field => {
    if (updates[field] !== undefined) {
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

  // Find and delete template (only firm's own templates)
  const template = await EmailTemplate.findOneAndDelete({
    _id: id,
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
  const { sampleData } = req.body;

  if (!firmId) {
    throw CustomException('Firm ID required', 400);
  }

  const template = await EmailTemplate.findOne({
    _id: id,
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
  const data = sampleData || {};

  // Replace variables in HTML, text, and subject
  if (template.variables && template.variables.length > 0) {
    template.variables.forEach(variable => {
      const value = data[variable.name] || variable.defaultValue || `{{${variable.name}}}`;
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
      sampleDataUsed: data
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
  const {
    name,
    htmlContent,
    textContent,
    isDefault,
    category,
    tags,
    notes
  } = req.body;

  if (!userId) {
    throw CustomException('User ID required', 400);
  }

  // Validate required fields
  if (!name || !htmlContent) {
    throw CustomException('Name and HTML content are required', 400);
  }

  const signature = await EmailSignature.create({
    userId,
    firmId,
    name,
    htmlContent,
    textContent,
    isDefault: isDefault || false,
    category: category || 'professional',
    tags: tags || [],
    notes
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
  const { id } = req.params;
  const updates = req.body;

  if (!userId) {
    throw CustomException('User ID required', 400);
  }

  // Find signature (only user's own signatures)
  const signature = await EmailSignature.findOne({
    _id: id,
    userId
  });

  if (!signature) {
    throw CustomException('Signature not found or you do not have permission to update it', 404);
  }

  // Update allowed fields
  const allowedUpdates = [
    'name', 'htmlContent', 'textContent', 'isDefault',
    'category', 'tags', 'notes', 'isActive'
  ];

  allowedUpdates.forEach(field => {
    if (updates[field] !== undefined) {
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
  const { id } = req.params;

  if (!userId) {
    throw CustomException('User ID required', 400);
  }

  // Find and delete signature (only user's own signatures)
  const signature = await EmailSignature.findOneAndDelete({
    _id: id,
    userId
  });

  if (!signature) {
    throw CustomException('Signature not found or you do not have permission to delete it', 404);
  }

  // If deleted signature was default, set another as default
  if (signature.isDefault) {
    const anotherSignature = await EmailSignature.findOne({
      userId,
      _id: { $ne: id },
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
  const { id } = req.params;

  if (!userId) {
    throw CustomException('User ID required', 400);
  }

  // Verify signature belongs to user
  const signature = await EmailSignature.findOne({
    _id: id,
    userId
  });

  if (!signature) {
    throw CustomException('Signature not found or you do not have permission to modify it', 404);
  }

  // Set as default using static method
  const updatedSignature = await EmailSignature.setDefault(id, userId);

  res.json({
    success: true,
    message: 'Default signature set successfully',
    data: updatedSignature
  });
});
