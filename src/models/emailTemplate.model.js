/**
 * Email Template Model
 * Security: Includes firmId for multi-tenant isolation
 *
 * Supports:
 * - Bilingual content (Arabic/English)
 * - Variable replacement
 * - Usage tracking
 * - Multiple template types (manual, automation, campaign, etc.)
 * - System templates (cannot be deleted)
 */

const mongoose = require('mongoose');
const Mustache = require('mustache');

const emailTemplateSchema = new mongoose.Schema({
  // Multi-tenancy field (REQUIRED)
  firmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Firm',
    required: true,
    index: true
  },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
  // Template Identifier
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },

  code: {
    type: String,
    trim: true,
    index: true,
    sparse: true // Unique code for system templates
  },

  // Email Subject (Bilingual)
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300
  },
  subjectAr: {
    type: String,
    trim: true,
    maxlength: 300
  },

  // Email Body - HTML (Bilingual)
  bodyHtml: {
    type: String,
    required: true
  },
  bodyHtmlAr: {
    type: String
  },

  // Email Body - Plain Text Fallback (Bilingual)
  bodyText: {
    type: String
  },
  bodyTextAr: {
    type: String
  },

  // Preview text (shown in email client before opening)
  previewText: {
    type: String,
    trim: true,
    maxlength: 200
  },

  // Template Type
  type: {
    type: String,
    enum: ['manual', 'automation', 'campaign', 'notification', 'quote', 'invoice'],
    default: 'manual',
    index: true
  },

  // Category for organizing templates
  category: {
    type: String,
    enum: ['welcome', 'follow_up', 'newsletter', 'promotional', 'legal_update', 'reminder', 'notification', 'custom'],
    default: 'custom',
    index: true
  },

  // Trigger event for automation templates
  triggerEvent: {
    type: String,
    trim: true,
    index: true,
    sparse: true
    // Examples: 'lead_created', 'stage_changed', 'case_updated', 'payment_received'
  },

  // Template Variables
  variables: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    example: {
      type: String,
      trim: true
    },
    required: {
      type: Boolean,
      default: false
    }
  }],

  // Attachments
  attachments: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      required: true
    },
    type: {
      type: String,
      trim: true // e.g., 'application/pdf', 'image/png'
    }
  }],

  // Status flags
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isSystemTemplate: {
    type: Boolean,
    default: false
  },
  isPublic: {
    type: Boolean,
    default: false // Can be used by all firms
  },

  // Usage Statistics
  stats: {
    timesSent: {
      type: Number,
      default: 0
    },
    timesOpened: {
      type: Number,
      default: 0
    },
    timesClicked: {
      type: Number,
      default: 0
    }
  },

  // Design & Layout
  layout: {
    type: String,
    enum: ['simple', 'modern', 'professional', 'newsletter', 'custom'],
    default: 'simple'
  },

  // Visual Preview
  thumbnailUrl: {
    type: String
  },

  // Metadata
  tags: [{
    type: String,
    trim: true
  }],
  notes: {
    type: String,
    trim: true,
    maxlength: 2000
  },

  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastUsedAt: {
    type: Date
  }
}, {
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      delete ret.__v;
      return ret;
    }
  }
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

// Compound indexes for common queries
emailTemplateSchema.index({ firmId: 1, type: 1 });
emailTemplateSchema.index({ firmId: 1, category: 1 });
emailTemplateSchema.index({ firmId: 1, isActive: 1 });
emailTemplateSchema.index({ firmId: 1, triggerEvent: 1 });
emailTemplateSchema.index({ isPublic: 1, isActive: 1 });

// Text index for search
emailTemplateSchema.index({ name: 'text', tags: 'text', subject: 'text' });

// ═══════════════════════════════════════════════════════════════
// VIRTUAL PROPERTIES
// ═══════════════════════════════════════════════════════════════

// Get array of variable names
emailTemplateSchema.virtual('variableNames').get(function() {
  return this.variables.map(v => v.name);
});

// Calculate open rate
emailTemplateSchema.virtual('openRate').get(function() {
  if (this.stats.timesSent === 0) return 0;
  return ((this.stats.timesOpened / this.stats.timesSent) * 100).toFixed(2);
});

// Calculate click rate
emailTemplateSchema.virtual('clickRate').get(function() {
  if (this.stats.timesSent === 0) return 0;
  return ((this.stats.timesClicked / this.stats.timesSent) * 100).toFixed(2);
});

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Record email usage
 */
emailTemplateSchema.methods.recordUsage = async function() {
  this.stats.timesSent++;
  this.lastUsedAt = new Date();
  await this.save();
};

/**
 * Render template with variables (Mustache syntax)
 * @param {Object} data - Variables to replace in template
 * @param {String} language - 'en' or 'ar'
 * @returns {Object} - { subject, html, text }
 */
emailTemplateSchema.methods.render = function(data = {}, language = 'en') {
  try {
    const isArabic = language === 'ar';

    // Choose language-specific content
    const subject = isArabic && this.subjectAr ? this.subjectAr : this.subject;
    const bodyHtml = isArabic && this.bodyHtmlAr ? this.bodyHtmlAr : this.bodyHtml;
    const bodyText = isArabic && this.bodyTextAr ? this.bodyTextAr : this.bodyText;

    // Prepare data with defaults
    const renderData = {
      ...data,
      year: new Date().getFullYear(),
      date: new Date().toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')
    };

    // Render using Mustache
    const renderedSubject = Mustache.render(subject, renderData);
    const renderedHtml = Mustache.render(bodyHtml, renderData);
    const renderedText = bodyText ? Mustache.render(bodyText, renderData) : this.htmlToPlainText(renderedHtml);

    return {
      subject: renderedSubject,
      html: renderedHtml,
      text: renderedText
    };
  } catch (error) {
    throw new Error(`Failed to render template: ${error.message}`);
  }
};

/**
 * Convert HTML to plain text
 */
emailTemplateSchema.methods.htmlToPlainText = function(html) {
  return html
    .replace(/<style[^>]*>.*<\/style>/gm, '')
    .replace(/<script[^>]*>.*<\/script>/gm, '')
    .replace(/<[^>]+>/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Validate template variables
 */
emailTemplateSchema.methods.validateVariables = function(data) {
  const required = this.variables.filter(v => v.required);
  const missing = required.filter(v => !data[v.name]);

  if (missing.length > 0) {
    const missingNames = missing.map(v => v.name).join(', ');
    throw new Error(`Missing required variables: ${missingNames}`);
  }

  return true;
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get templates with filters
 * @param {String} firmId - Firm ID for isolation (REQUIRED)
 * @param {Object} filters - Search filters
 * @returns {Array} - Array of templates
 */
emailTemplateSchema.statics.getTemplates = async function(firmId, filters = {}) {
  if (!firmId) throw new Error('firmId is required');

  const query = {
    $or: [
      { firmId: new mongoose.Types.ObjectId(firmId) },
      { isPublic: true, isActive: true }
    ]
  };

  // Apply filters
  if (filters.type) {
    query.type = filters.type;
  }
  if (filters.category) {
    query.category = filters.category;
  }
  if (filters.isActive !== undefined) {
    query.isActive = filters.isActive;
  }
  if (filters.search) {
    query.$text = { $search: filters.search };
  }

  const sort = filters.sortBy || '-createdAt';
  const limit = Math.min(filters.limit || 50, 100);
  const skip = filters.skip || 0;

  return this.find(query)
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .select('-bodyHtml -bodyHtmlAr -bodyText -bodyTextAr')
    .lean();
};

/**
 * Get template by trigger event
 * @param {String} firmId - Firm ID for isolation (REQUIRED)
 * @param {String} triggerEvent - Event name
 * @returns {Object} - Template document
 */
emailTemplateSchema.statics.getByTrigger = async function(firmId, triggerEvent) {
  if (!firmId) throw new Error('firmId is required');
  if (!triggerEvent) throw new Error('triggerEvent is required');

  return this.findOne({
    $or: [
      { firmId: new mongoose.Types.ObjectId(firmId) },
      { isPublic: true }
    ],
    triggerEvent,
    isActive: true
  });
};

/**
 * Render template by ID
 * @param {String} templateId - Template ID
 * @param {String} firmId - Firm ID for isolation (REQUIRED)
 * @param {Object} data - Variables
 * @param {String} language - 'en' or 'ar'
 * @returns {Object} - Rendered template
 */
emailTemplateSchema.statics.renderTemplate = async function(templateId, firmId, data, language = 'en') {
  if (!firmId) throw new Error('firmId is required');

  const template = await this.findOne({
    _id: templateId,
    $or: [
      { firmId: new mongoose.Types.ObjectId(firmId) },
      { isPublic: true }
    ],
    isActive: true
  });

  if (!template) {
    throw new Error('Template not found');
  }

  return template.render(data, language);
};

/**
 * Update statistics
 * @param {String} templateId - Template ID
 * @param {String} firmId - Firm ID for isolation (REQUIRED)
 * @param {String} stat - Stat type: 'sent', 'opened', 'clicked'
 * @param {Number} increment - Amount to increment (default: 1)
 */
emailTemplateSchema.statics.updateStats = async function(templateId, firmId, stat, increment = 1) {
  if (!firmId) throw new Error('firmId is required');

  const statMap = {
    sent: 'stats.timesSent',
    opened: 'stats.timesOpened',
    clicked: 'stats.timesClicked'
  };

  const field = statMap[stat];
  if (!field) {
    throw new Error('Invalid stat type. Use: sent, opened, or clicked');
  }

  const update = {
    $inc: { [field]: increment },
    $set: { lastUsedAt: new Date() }
  };

  return this.findOneAndUpdate(
    {
      _id: templateId,
      firmId: new mongoose.Types.ObjectId(firmId)
    },
    update,
    { new: true }
  );
};

/**
 * Get popular templates
 * @param {String} firmId - Firm ID for isolation (REQUIRED)
 * @param {Number} limit - Number of templates to return
 * @returns {Array} - Popular templates
 */
emailTemplateSchema.statics.getPopular = async function(firmId, limit = 10) {
  if (!firmId) throw new Error('firmId is required');

  return this.find({
    $or: [
      { firmId: new mongoose.Types.ObjectId(firmId) },
      { isPublic: true }
    ],
    isActive: true
  })
  .sort({ 'stats.timesSent': -1 })
  .limit(limit)
  .select('name subject type category stats lastUsedAt')
  .lean();
};

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

// Pre-save: Generate plain text if not provided
emailTemplateSchema.pre('save', function(next) {
  // Generate bodyText from bodyHtml if not provided
  if (this.bodyHtml && !this.bodyText) {
    this.bodyText = this.htmlToPlainText(this.bodyHtml);
  }

  // Generate bodyTextAr from bodyHtmlAr if not provided
  if (this.bodyHtmlAr && !this.bodyTextAr) {
    this.bodyTextAr = this.htmlToPlainText(this.bodyHtmlAr);
  }

  next();
});

// Prevent deletion of system templates
emailTemplateSchema.pre('findOneAndDelete', async function(next) {
  const docToDelete = await this.model.findOne(this.getFilter());

  if (docToDelete && docToDelete.isSystemTemplate) {
    throw new Error('Cannot delete system template');
  }

  next();
});

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
