/**
 * Email Marketing Controller for TRAF3LI
 * Handles all email marketing campaign operations
 */

const EmailMarketingService = require('../services/emailMarketing.service');
const EmailCampaign = require('../models/emailCampaign.model');
const EmailTemplate = require('../models/emailTemplate.model');
const EmailSubscriber = require('../models/emailSubscriber.model');
const EmailSegment = require('../models/emailSegment.model');
const EmailEvent = require('../models/emailEvent.model');
const { pickAllowedFields, sanitizeObjectId, sanitizeEmail } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// Helper function to escape regex special characters (ReDoS protection)
const escapeRegex = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// ==================== CAMPAIGNS ====================

/**
 * Create new campaign
 * POST /api/email-marketing/campaigns
 */
exports.createCampaign = async (req, res) => {
  try {
    const firmId = req.firmId;
    const userId = req.userID;

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['name', 'subject', 'preheader', 'templateId', 'segmentId',
                          'type', 'senderName', 'senderEmail', 'replyTo', 'trackOpens',
                          'trackClicks', 'scheduledAt', 'timezone', 'content', 'settings'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const campaign = await EmailMarketingService.createCampaign(firmId, safeData, userId);

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data: campaign
    });
  } catch (error) {
    logger.error('Create campaign error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create campaign'
    });
  }
};

/**
 * Get all campaigns
 * GET /api/email-marketing/campaigns
 */
exports.getCampaigns = async (req, res) => {
  try {
    const firmId = req.firmId;
    const lawyerId = req.userID;
    const { status, type, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const isSoloLawyer = req.isSoloLawyer;
    const query = {};
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }
    if (status) query.status = status;
    if (type) query.type = type;

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const campaigns = await EmailCampaign.find(query)
      .populate('templateId', 'name category')
      .populate('segmentId', 'name subscriberCount')
      .populate('createdBy', 'firstName lastName')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await EmailCampaign.countDocuments(query);

    res.json({
      success: true,
      data: campaigns,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get campaigns error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get campaigns'
    });
  }
};

/**
 * Get single campaign
 * GET /api/email-marketing/campaigns/:id
 */
exports.getCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const firmId = req.firmId;
    const lawyerId = req.userID;
    const isSoloLawyer = req.isSoloLawyer;

    // SECURITY: Build query with multi-tenant isolation
    const query = { _id: id };
    if (isSoloLawyer || !firmId) {
      query.lawyerId = lawyerId;
    } else {
      query.firmId = firmId;
    }

    const campaign = await EmailCampaign.findOne(query)
      .populate('templateId')
      .populate('segmentId')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      data: campaign
    });
  } catch (error) {
    logger.error('Get campaign error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get campaign'
    });
  }
};

/**
 * Update campaign
 * PUT /api/email-marketing/campaigns/:id
 */
exports.updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const firmId = req.firmId;
    const userId = req.userID;

    // IDOR protection - verify campaign belongs to user's firm
    const existingCampaign = await EmailCampaign.findOne({ _id: id, firmId });
    if (!existingCampaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['name', 'subject', 'preheader', 'templateId', 'segmentId',
                          'type', 'senderName', 'senderEmail', 'replyTo', 'trackOpens',
                          'trackClicks', 'scheduledAt', 'timezone', 'content', 'settings', 'status'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const campaign = await EmailMarketingService.updateCampaign(id, safeData, userId);

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      data: campaign
    });
  } catch (error) {
    logger.error('Update campaign error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update campaign'
    });
  }
};

/**
 * Delete campaign
 * DELETE /api/email-marketing/campaigns/:id
 */
exports.deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const firmId = req.firmId;

    // IDOR protection - verify campaign belongs to user's firm
    const campaign = await EmailCampaign.findOne({ _id: id, firmId });
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    await EmailMarketingService.deleteCampaign(id);

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    logger.error('Delete campaign error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete campaign'
    });
  }
};

/**
 * Duplicate campaign
 * POST /api/email-marketing/campaigns/:id/duplicate
 */
exports.duplicateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const firmId = req.firmId;
    const userId = req.userID;

    // IDOR protection - verify campaign belongs to user's firm
    const existingCampaign = await EmailCampaign.findOne({ _id: id, firmId });
    if (!existingCampaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const campaign = await EmailMarketingService.duplicateCampaign(id, userId);

    res.status(201).json({
      success: true,
      message: 'Campaign duplicated successfully',
      data: campaign
    });
  } catch (error) {
    logger.error('Duplicate campaign error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to duplicate campaign'
    });
  }
};

/**
 * Schedule campaign
 * POST /api/email-marketing/campaigns/:id/schedule
 */
exports.scheduleCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const firmId = req.firmId;

    // IDOR protection - verify campaign belongs to user's firm
    const campaign = await EmailCampaign.findOne({ _id: id, firmId });
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Input validation
    const allowedFields = ['scheduledAt', 'timezone'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    if (!safeData.scheduledAt) {
      return res.status(400).json({
        success: false,
        message: 'scheduledAt is required'
      });
    }

    const updatedCampaign = await EmailMarketingService.scheduleCampaign(
      id,
      safeData.scheduledAt,
      safeData.timezone
    );

    res.json({
      success: true,
      message: 'Campaign scheduled successfully',
      data: updatedCampaign
    });
  } catch (error) {
    logger.error('Schedule campaign error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to schedule campaign'
    });
  }
};

/**
 * Send campaign
 * POST /api/email-marketing/campaigns/:id/send
 */
exports.sendCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const firmId = req.firmId;

    // IDOR protection - verify campaign belongs to user's firm
    const campaign = await EmailCampaign.findOne({ _id: id, firmId });
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const updatedCampaign = await EmailMarketingService.sendCampaign(id);

    res.json({
      success: true,
      message: 'Campaign sending started',
      data: updatedCampaign
    });
  } catch (error) {
    logger.error('Send campaign error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send campaign'
    });
  }
};

/**
 * Pause campaign
 * POST /api/email-marketing/campaigns/:id/pause
 */
exports.pauseCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const firmId = req.firmId;

    // IDOR protection - verify campaign belongs to user's firm
    const campaign = await EmailCampaign.findOne({ _id: id, firmId });
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const updatedCampaign = await EmailMarketingService.pauseCampaign(id);

    res.json({
      success: true,
      message: 'Campaign paused',
      data: updatedCampaign
    });
  } catch (error) {
    logger.error('Pause campaign error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to pause campaign'
    });
  }
};

/**
 * Resume campaign
 * POST /api/email-marketing/campaigns/:id/resume
 */
exports.resumeCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const firmId = req.firmId;

    // IDOR protection - verify campaign belongs to user's firm
    const campaign = await EmailCampaign.findOne({ _id: id, firmId });
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const updatedCampaign = await EmailMarketingService.resumeCampaign(id);

    res.json({
      success: true,
      message: 'Campaign resumed',
      data: updatedCampaign
    });
  } catch (error) {
    logger.error('Resume campaign error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to resume campaign'
    });
  }
};

/**
 * Cancel campaign
 * POST /api/email-marketing/campaigns/:id/cancel
 */
exports.cancelCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const firmId = req.firmId;

    // IDOR protection - verify campaign belongs to user's firm
    const campaign = await EmailCampaign.findOne({ _id: id, firmId });
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const updatedCampaign = await EmailMarketingService.cancelCampaign(id);

    res.json({
      success: true,
      message: 'Campaign cancelled',
      data: updatedCampaign
    });
  } catch (error) {
    logger.error('Cancel campaign error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel campaign'
    });
  }
};

/**
 * Send test email
 * POST /api/email-marketing/campaigns/:id/test
 */
exports.sendTestEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const firmId = req.firmId;
    const { testEmail } = req.body;

    if (!testEmail) {
      return res.status(400).json({
        success: false,
        message: 'Test email address is required'
      });
    }

    // Email injection prevention - sanitize email
    const sanitizedEmail = sanitizeEmail(testEmail);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address format'
      });
    }

    // IDOR protection - verify campaign belongs to user's firm
    const campaign = await EmailCampaign.findOne({ _id: id, firmId });
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Create temporary subscriber for test
    const testSubscriber = {
      email: sanitizedEmail,
      firstName: 'Test',
      displayName: 'Test User'
    };

    await EmailMarketingService.sendBulkEmails(campaign, [testSubscriber]);

    res.json({
      success: true,
      message: `Test email sent to ${sanitizedEmail}`
    });
  } catch (error) {
    logger.error('Send test email error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send test email'
    });
  }
};

/**
 * Get campaign analytics
 * GET /api/email-marketing/campaigns/:id/analytics
 */
exports.getCampaignAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const firmId = req.firmId;

    // IDOR protection - verify campaign belongs to user's firm
    const campaign = await EmailCampaign.findOne({ _id: id, firmId });
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const analytics = await EmailMarketingService.getCampaignAnalytics(id);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Get campaign analytics error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get analytics'
    });
  }
};

// ==================== TEMPLATES ====================

/**
 * Create template
 * POST /api/email-marketing/templates
 */
exports.createTemplate = async (req, res) => {
  try {
    const firmId = req.firmId;
    const userId = req.userID;

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['name', 'description', 'category', 'subject', 'preheader',
                          'htmlContent', 'textContent', 'thumbnail', 'isActive', 'isPublic',
                          'variables', 'settings'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const template = await EmailMarketingService.createTemplate(firmId, safeData, userId);

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: template
    });
  } catch (error) {
    logger.error('Create template error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create template'
    });
  }
};

/**
 * Get all templates
 * GET /api/email-marketing/templates
 */
exports.getTemplates = async (req, res) => {
  try {
    const firmId = req.firmId;
    const lawyerId = req.userID;
    const { category, isActive, page = 1, limit = 20 } = req.query;

    const isSoloLawyer = req.isSoloLawyer;
    const query = {
      $or: [
        isSoloLawyer || !firmId ? { lawyerId: lawyerId } : { firmId: firmId },
        { isPublic: true }
      ]
    };

    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const templates = await EmailTemplate.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await EmailTemplate.countDocuments(query);

    res.json({
      success: true,
      data: templates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get templates'
    });
  }
};

/**
 * Get public templates
 * GET /api/email-marketing/templates/public
 */
exports.getPublicTemplates = async (req, res) => {
  try {
    const templates = await EmailMarketingService.getPublicTemplates();

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    logger.error('Get public templates error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get public templates'
    });
  }
};

/**
 * Get single template
 * GET /api/email-marketing/templates/:id
 */
exports.getTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const firmId = req.firmId;

    const template = await EmailTemplate.findOne({
      _id: id,
      $or: [
        { firmId: firmId },
        { isPublic: true }
      ]
    }).populate('createdBy', 'firstName lastName');

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error('Get template error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get template'
    });
  }
};

/**
 * Update template
 * PUT /api/email-marketing/templates/:id
 */
exports.updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const firmId = req.firmId;
    const userId = req.userID;

    // IDOR protection already in place
    const template = await EmailTemplate.findOne({ _id: id, firmId });
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['name', 'description', 'category', 'subject', 'preheader',
                          'htmlContent', 'textContent', 'thumbnail', 'isActive', 'isPublic',
                          'variables', 'settings'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    Object.assign(template, safeData);
    template.updatedBy = userId;
    await template.save();

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: template
    });
  } catch (error) {
    logger.error('Update template error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update template'
    });
  }
};

/**
 * Delete template
 * DELETE /api/email-marketing/templates/:id
 */
exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const firmId = req.firmId;

    const template = await EmailTemplate.findOne({ _id: id, firmId });
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    await template.deleteOne();

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    logger.error('Delete template error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete template'
    });
  }
};

/**
 * Preview template
 * POST /api/email-marketing/templates/:id/preview
 */
exports.previewTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const firmId = req.firmId;

    // IDOR protection - verify template belongs to user's firm or is public
    const template = await EmailTemplate.findOne({
      _id: id,
      $or: [
        { firmId: firmId },
        { isPublic: true }
      ]
    });
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Mass assignment protection - limit preview data fields
    const allowedFields = ['firstName', 'lastName', 'email', 'displayName', 'customFields'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const preview = await EmailMarketingService.previewTemplate(id, safeData);

    res.json({
      success: true,
      data: preview
    });
  } catch (error) {
    logger.error('Preview template error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to preview template'
    });
  }
};

// ==================== SUBSCRIBERS ====================

/**
 * Create subscriber
 * POST /api/email-marketing/subscribers
 */
exports.createSubscriber = async (req, res) => {
  try {
    const firmId = req.firmId;
    const userId = req.userID;

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['email', 'firstName', 'lastName', 'displayName', 'phone',
                          'tags', 'customFields', 'status', 'source'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Email injection prevention - sanitize and validate email
    if (safeData.email) {
      safeData.email = sanitizeEmail(safeData.email);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(safeData.email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email address format'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }

    const subscriber = await EmailMarketingService.addSubscriber(firmId, safeData, userId);

    res.status(201).json({
      success: true,
      message: 'Subscriber added successfully',
      data: subscriber
    });
  } catch (error) {
    logger.error('Create subscriber error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add subscriber'
    });
  }
};

/**
 * Get all subscribers
 * GET /api/email-marketing/subscribers
 */
exports.getSubscribers = async (req, res) => {
  try {
    const firmId = req.firmId;
    const lawyerId = req.userID;
    const { status, tags, search, page = 1, limit = 50 } = req.query;

    const isSoloLawyer = req.isSoloLawyer;
    const query = {};
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }
    if (status) query.status = status;
    if (tags) query.tags = { $in: tags.split(',') };
    if (search) {
      const escapedSearch = escapeRegex(search);
      query.$or = [
        { email: { $regex: escapedSearch, $options: 'i' } },
        { firstName: { $regex: escapedSearch, $options: 'i' } },
        { lastName: { $regex: escapedSearch, $options: 'i' } }
      ];
    }

    const subscribers = await EmailSubscriber.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await EmailSubscriber.countDocuments(query);

    res.json({
      success: true,
      data: subscribers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get subscribers error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get subscribers'
    });
  }
};

/**
 * Update subscriber
 * PUT /api/email-marketing/subscribers/:id
 */
exports.updateSubscriber = async (req, res) => {
  try {
    const { id } = req.params;
    const firmId = req.firmId;
    const userId = req.userID;

    // IDOR protection - verify subscriber belongs to user's firm
    const existingSubscriber = await EmailSubscriber.findOne({ _id: id, firmId });
    if (!existingSubscriber) {
      return res.status(404).json({
        success: false,
        message: 'Subscriber not found'
      });
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['email', 'firstName', 'lastName', 'displayName', 'phone',
                          'tags', 'customFields', 'status'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Email injection prevention - sanitize and validate email if provided
    if (safeData.email) {
      safeData.email = sanitizeEmail(safeData.email);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(safeData.email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email address format'
        });
      }
    }

    const subscriber = await EmailMarketingService.updateSubscriber(id, safeData, userId);

    res.json({
      success: true,
      message: 'Subscriber updated successfully',
      data: subscriber
    });
  } catch (error) {
    logger.error('Update subscriber error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update subscriber'
    });
  }
};

/**
 * Delete subscriber
 * DELETE /api/email-marketing/subscribers/:id
 */
exports.deleteSubscriber = async (req, res) => {
  try {
    const { id } = req.params;
    const firmId = req.firmId;

    const subscriber = await EmailSubscriber.findOne({ _id: id, firmId });
    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: 'Subscriber not found'
      });
    }

    await subscriber.deleteOne();

    res.json({
      success: true,
      message: 'Subscriber deleted successfully'
    });
  } catch (error) {
    logger.error('Delete subscriber error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete subscriber'
    });
  }
};

/**
 * Import subscribers
 * POST /api/email-marketing/subscribers/import
 */
exports.importSubscribers = async (req, res) => {
  try {
    const firmId = req.firmId;
    const userId = req.userID;
    const { subscribers } = req.body;

    if (!Array.isArray(subscribers)) {
      return res.status(400).json({
        success: false,
        message: 'Subscribers must be an array'
      });
    }

    // Mass assignment protection and email sanitization for each subscriber
    const allowedFields = ['email', 'firstName', 'lastName', 'displayName', 'phone',
                          'tags', 'customFields', 'status', 'source'];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const sanitizedSubscribers = subscribers.map(subscriber => {
      // Filter allowed fields
      const safeData = pickAllowedFields(subscriber, allowedFields);

      // Sanitize email if present
      if (safeData.email) {
        safeData.email = sanitizeEmail(safeData.email);
      }

      return safeData;
    }).filter(subscriber => {
      // Only include subscribers with valid email addresses
      return subscriber.email && emailRegex.test(subscriber.email);
    });

    if (sanitizedSubscribers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid subscribers to import'
      });
    }

    const result = await EmailMarketingService.importSubscribers(firmId, sanitizedSubscribers, userId);

    res.json({
      success: true,
      message: 'Import completed',
      data: result
    });
  } catch (error) {
    logger.error('Import subscribers error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to import subscribers'
    });
  }
};

/**
 * Export subscribers
 * POST /api/email-marketing/subscribers/export
 */
exports.exportSubscribers = async (req, res) => {
  try {
    const firmId = req.firmId;

    // Mass assignment protection - only allow specific filter fields
    const allowedFields = ['status', 'tags', 'startDate', 'endDate', 'segmentId', 'source'];
    const safeFilters = pickAllowedFields(req.body, allowedFields);

    const subscribers = await EmailMarketingService.exportSubscribers(firmId, safeFilters);

    res.json({
      success: true,
      data: subscribers
    });
  } catch (error) {
    logger.error('Export subscribers error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to export subscribers'
    });
  }
};

/**
 * Unsubscribe
 * POST /api/email-marketing/subscribers/:id/unsubscribe
 */
exports.unsubscribe = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const firmId = req.firmId;
    const lawyerId = req.userID;
    const isSoloLawyer = req.isSoloLawyer;

    // SECURITY: Build query with multi-tenant isolation
    const ownershipQuery = { _id: id };
    if (isSoloLawyer || !firmId) {
      ownershipQuery.lawyerId = lawyerId;
    } else {
      ownershipQuery.firmId = firmId;
    }

    // SECURITY: IDOR protection - verify subscriber belongs to user's firm
    const subscriber = await EmailSubscriber.findOne(ownershipQuery);
    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: 'Subscriber not found'
      });
    }

    await EmailMarketingService.unsubscribe(subscriber.email, reason);

    res.json({
      success: true,
      message: 'Unsubscribed successfully'
    });
  } catch (error) {
    logger.error('Unsubscribe error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to unsubscribe'
    });
  }
};

// ==================== SEGMENTS ====================

/**
 * Create segment
 * POST /api/email-marketing/segments
 */
exports.createSegment = async (req, res) => {
  try {
    const firmId = req.firmId;
    const userId = req.userID;

    const segment = await EmailMarketingService.createSegment(firmId, req.body, userId);

    res.status(201).json({
      success: true,
      message: 'Segment created successfully',
      data: segment
    });
  } catch (error) {
    logger.error('Create segment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create segment'
    });
  }
};

/**
 * Get all segments
 * GET /api/email-marketing/segments
 */
exports.getSegments = async (req, res) => {
  try {
    const firmId = req.firmId;
    const lawyerId = req.userID;
    const { isActive, isDynamic } = req.query;

    const isSoloLawyer = req.isSoloLawyer;
    const query = {};
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (isDynamic !== undefined) query.isDynamic = isDynamic === 'true';

    const segments = await EmailSegment.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: segments
    });
  } catch (error) {
    logger.error('Get segments error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get segments'
    });
  }
};

/**
 * Get single segment
 * GET /api/email-marketing/segments/:id
 */
exports.getSegment = async (req, res) => {
  try {
    const { id } = req.params;
    const firmId = req.firmId;
    const lawyerId = req.userID;
    const isSoloLawyer = req.isSoloLawyer;

    // SECURITY: Build query with multi-tenant isolation
    const query = { _id: id };
    if (isSoloLawyer || !firmId) {
      query.lawyerId = lawyerId;
    } else {
      query.firmId = firmId;
    }

    const segment = await EmailSegment.findOne(query)
      .populate('createdBy', 'firstName lastName');

    if (!segment) {
      return res.status(404).json({
        success: false,
        message: 'Segment not found'
      });
    }

    res.json({
      success: true,
      data: segment
    });
  } catch (error) {
    logger.error('Get segment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get segment'
    });
  }
};

/**
 * Update segment
 * PUT /api/email-marketing/segments/:id
 */
exports.updateSegment = async (req, res) => {
  try {
    const { id } = req.params;
    const firmId = req.firmId;
    const userId = req.userID;

    const segment = await EmailSegment.findOne({ _id: id, firmId });
    if (!segment) {
      return res.status(404).json({
        success: false,
        message: 'Segment not found'
      });
    }

    Object.assign(segment, req.body);
    segment.updatedBy = userId;
    await segment.save();

    // Recalculate if conditions changed
    if (req.body.conditions || req.body.conditionLogic) {
      await segment.calculateSubscribers();
    }

    res.json({
      success: true,
      message: 'Segment updated successfully',
      data: segment
    });
  } catch (error) {
    logger.error('Update segment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update segment'
    });
  }
};

/**
 * Delete segment
 * DELETE /api/email-marketing/segments/:id
 */
exports.deleteSegment = async (req, res) => {
  try {
    const { id } = req.params;
    const firmId = req.firmId;

    const segment = await EmailSegment.findOne({ _id: id, firmId });
    if (!segment) {
      return res.status(404).json({
        success: false,
        message: 'Segment not found'
      });
    }

    await segment.deleteOne();

    res.json({
      success: true,
      message: 'Segment deleted successfully'
    });
  } catch (error) {
    logger.error('Delete segment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete segment'
    });
  }
};

/**
 * Get segment subscribers
 * GET /api/email-marketing/segments/:id/subscribers
 */
exports.getSegmentSubscribers = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const firmId = req.firmId;
    const lawyerId = req.userID;
    const isSoloLawyer = req.isSoloLawyer;

    // SECURITY: Build query with multi-tenant isolation
    const ownershipQuery = { _id: id };
    if (isSoloLawyer || !firmId) {
      ownershipQuery.lawyerId = lawyerId;
    } else {
      ownershipQuery.firmId = firmId;
    }

    // SECURITY: IDOR protection - verify segment belongs to user's firm
    const segment = await EmailSegment.findOne(ownershipQuery);
    if (!segment) {
      return res.status(404).json({
        success: false,
        message: 'Segment not found'
      });
    }

    const subscribers = await segment.getSubscribers({
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      success: true,
      data: subscribers,
      count: segment.subscriberCount
    });
  } catch (error) {
    logger.error('Get segment subscribers error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get segment subscribers'
    });
  }
};

/**
 * Refresh segment
 * POST /api/email-marketing/segments/:id/refresh
 */
exports.refreshSegment = async (req, res) => {
  try {
    const { id } = req.params;
    const firmId = req.firmId;
    const lawyerId = req.userID;
    const isSoloLawyer = req.isSoloLawyer;

    // SECURITY: Build query with multi-tenant isolation
    const ownershipQuery = { _id: id };
    if (isSoloLawyer || !firmId) {
      ownershipQuery.lawyerId = lawyerId;
    } else {
      ownershipQuery.firmId = firmId;
    }

    // SECURITY: IDOR protection - verify segment belongs to user's firm
    const segment = await EmailSegment.findOne(ownershipQuery);
    if (!segment) {
      return res.status(404).json({
        success: false,
        message: 'Segment not found'
      });
    }

    const count = await EmailMarketingService.calculateSegmentSubscribers(id);

    res.json({
      success: true,
      message: 'Segment refreshed successfully',
      count
    });
  } catch (error) {
    logger.error('Refresh segment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to refresh segment'
    });
  }
};

// ==================== ANALYTICS ====================

/**
 * Get overview analytics
 * GET /api/email-marketing/analytics/overview
 */
exports.getOverviewAnalytics = async (req, res) => {
  try {
    const firmId = req.firmId;
    const { startDate, endDate } = req.query;

    const dateRange = {};
    if (startDate) dateRange.start = startDate;
    if (endDate) dateRange.end = endDate;

    const analytics = await EmailMarketingService.getOverallAnalytics(firmId, dateRange);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Get overview analytics error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get analytics'
    });
  }
};

/**
 * Get trends analytics
 * GET /api/email-marketing/analytics/trends
 */
exports.getTrendsAnalytics = async (req, res) => {
  try {
    const firmId = req.firmId;
    const lawyerId = req.userID;
    const { period = 'month' } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    const isSoloLawyer = req.isSoloLawyer;
    const query = {};
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }
    query.createdAt = { $gte: startDate };

    const campaigns = await EmailCampaign.find(query).sort({ createdAt: 1 });

    res.json({
      success: true,
      data: {
        campaigns,
        period,
        startDate,
        endDate: now
      }
    });
  } catch (error) {
    logger.error('Get trends analytics error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get trends'
    });
  }
};

// ==================== WEBHOOKS ====================

/**
 * Handle Resend webhooks
 * POST /api/webhooks/email/resend
 */
exports.handleResendWebhook = async (req, res) => {
  try {
    const { type, data } = req.body;

    await EmailMarketingService.handleResendWebhook(type, data);

    res.json({ success: true });
  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(500).json({ success: false });
  }
};

/**
 * Track email open
 * GET /api/webhooks/email/track/open/:trackingId
 */
exports.trackOpen = async (req, res) => {
  try {
    const { trackingId } = req.params;

    await EmailMarketingService.handleOpen(trackingId);

    // Return 1x1 transparent pixel
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );

    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': pixel.length
    });
    res.end(pixel);
  } catch (error) {
    logger.error('Track open error:', error);
    res.status(200).end();
  }
};

/**
 * Handle unsubscribe
 * GET /api/webhooks/email/unsubscribe/:email
 */
exports.handleUnsubscribe = async (req, res) => {
  try {
    const { email } = req.params;

    await EmailMarketingService.unsubscribe(email, 'User initiated');

    res.send(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>إلغاء الاشتراك</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .success { color: #10b981; font-size: 24px; }
        </style>
      </head>
      <body>
        <div class="success">✓ تم إلغاء اشتراكك بنجاح</div>
        <p>لن تتلقى المزيد من الرسائل البريدية منا.</p>
      </body>
      </html>
    `);
  } catch (error) {
    logger.error('Unsubscribe error:', error);
    res.status(500).send('حدث خطأ');
  }
};

module.exports = exports;
