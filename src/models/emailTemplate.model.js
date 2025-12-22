const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema({
  firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', index: true },

  // Template Identifier
  code: { type: String, trim: true, index: true, sparse: true }, // Unique code for system templates

  // Bilingual Names
  name: { type: String, required: false, trim: true },
  nameAr: { type: String, trim: true },

  category: {
    type: String,
    enum: ['welcome', 'follow_up', 'newsletter', 'promotional', 'legal_update', 'reminder', 'notification', 'custom'],
    default: 'custom'
  },

  // Bilingual Email Content
  subject: { type: String, required: false, trim: true },
  subjectAr: { type: String, trim: true },

  previewText: { type: String, trim: true },

  // HTML Content (Bilingual)
  htmlContent: { type: String, required: false }, // Alias: bodyHtml
  bodyHtml: { type: String }, // Primary HTML content (English)
  bodyHtmlAr: { type: String }, // Arabic HTML content

  // Text Content (Bilingual)
  textContent: String, // Plain text version for email clients that don't support HTML
  bodyText: String, // Alias for textContent

  // Template Variables
  variables: [{
    name: { type: String, required: false, trim: true }, // e.g., 'firstName', 'companyName'
    defaultValue: { type: String, trim: true },
    required: { type: Boolean, default: false },
    description: { type: String, trim: true }
  }],

  // Visual Preview
  thumbnailUrl: String, // Screenshot or preview image URL

  // Sharing & Status
  isPublic: { type: Boolean, default: false }, // Can be used by all firms
  isActive: { type: Boolean, default: true },

  // Usage Statistics
  usageCount: { type: Number, default: 0 },
  lastUsedAt: Date,

  // Design & Layout
  layout: {
    type: String,
    enum: ['simple', 'modern', 'professional', 'newsletter', 'custom'],
    default: 'simple'
  },

  // Metadata
  tags: [{ type: String, trim: true }],
  notes: { type: String, trim: true },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, versionKey: false });

// Indexes
emailTemplateSchema.index({ firmId: 1, category: 1 });
emailTemplateSchema.index({ isPublic: 1, isActive: 1 });
emailTemplateSchema.index({ name: 'text', tags: 'text' });

// Instance method to increment usage count
emailTemplateSchema.methods.recordUsage = async function() {
  this.usageCount++;
  this.lastUsedAt = new Date();
  await this.save();
};

// Static method to get popular templates
emailTemplateSchema.statics.getPopular = async function(firmId, limit = 10) {
  return await this.find({
    $or: [
      { firmId: firmId },
      { isPublic: true }
    ],
    isActive: true
  })
  .sort({ usageCount: -1 })
  .limit(limit);
};

// Virtual for variable names array
emailTemplateSchema.virtual('variableNames').get(function() {
  return this.variables.map(v => v.name);
});

emailTemplateSchema.set('toJSON', { virtuals: true });
emailTemplateSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
