const mongoose = require('mongoose');

const emailCampaignSchema = new mongoose.Schema({
  firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', required: true, index: true },

    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
  name: { type: String, required: false, trim: true },
  description: { type: String, trim: true },

  // Campaign Type
  type: {
    type: String,
    enum: ['one_time', 'drip', 'automated', 'triggered'],
    default: 'one_time'
  },

  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled'],
    default: 'draft',
    index: true
  },

  // Email Content
  subject: { type: String, required: false, trim: true },
  previewText: { type: String, trim: true },
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate' },
  htmlContent: String,
  textContent: String,

  // Sender
  fromName: { type: String, trim: true },
  fromEmail: { type: String, trim: true, lowercase: true },
  replyTo: { type: String, trim: true, lowercase: true },

  // Audience
  audienceType: { type: String, enum: ['all_leads', 'segment', 'custom', 'clients'], default: 'all_leads' },
  segmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailSegment' },
  customRecipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lead' }],
  excludeList: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lead' }],
  totalRecipients: { type: Number, default: 0 },

  // Scheduling
  scheduledAt: { type: Date, index: true },
  sentAt: Date,
  completedAt: Date,
  timezone: { type: String, default: 'Asia/Riyadh' },

  // Drip Campaign Settings
  dripSettings: {
    enabled: { type: Boolean, default: false },
    steps: [{
      order: Number,
      name: { type: String, trim: true },
      delayDays: { type: Number, default: 0 },
      delayHours: { type: Number, default: 0 },
      subject: { type: String, trim: true },
      templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate' },
      htmlContent: String,
      sentCount: { type: Number, default: 0 },
      openedCount: { type: Number, default: 0 },
      clickedCount: { type: Number, default: 0 }
    }]
  },

  // Trigger Settings (for automated)
  triggerSettings: {
    triggerType: {
      type: String,
      enum: ['lead_created', 'stage_changed', 'tag_added', 'form_submitted', 'inactivity', 'birthday', 'anniversary']
    },
    triggerConditions: mongoose.Schema.Types.Mixed,
    cooldownHours: { type: Number, default: 24 }
  },

  // A/B Testing
  abTest: {
    enabled: { type: Boolean, default: false },
    variants: [{
      name: { type: String, trim: true },
      subject: { type: String, trim: true },
      htmlContent: String,
      templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate' },
      percentage: { type: Number, min: 0, max: 100 },
      stats: {
        sent: { type: Number, default: 0 },
        opened: { type: Number, default: 0 },
        clicked: { type: Number, default: 0 }
      }
    }],
    winnerCriteria: { type: String, enum: ['open_rate', 'click_rate'], default: 'open_rate' },
    testDuration: { type: Number, default: 4 }, // hours
    winnerSelected: { type: Boolean, default: false },
    winnerId: String
  },

  // Personalization
  personalization: {
    enabled: { type: Boolean, default: true },
    fields: [String], // ['firstName', 'companyName', 'caseType']
    fallbackValues: mongoose.Schema.Types.Mixed
  },

  // Analytics
  stats: {
    sent: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    uniqueOpens: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 },
    uniqueClicks: { type: Number, default: 0 },
    bounced: { type: Number, default: 0 },
    unsubscribed: { type: Number, default: 0 },
    complained: { type: Number, default: 0 },
    failed: { type: Number, default: 0 }
  },

  // Calculated rates
  openRate: { type: Number, default: 0 },
  clickRate: { type: Number, default: 0 },
  bounceRate: { type: Number, default: 0 },
  unsubscribeRate: { type: Number, default: 0 },

  // Tags and organization
  tags: [{ type: String, trim: true }],
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailFolder' },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Indexes for performance
emailCampaignSchema.index({ firmId: 1, status: 1 });
emailCampaignSchema.index({ firmId: 1, scheduledAt: 1 });
emailCampaignSchema.index({ firmId: 1, type: 1 });
emailCampaignSchema.index({ createdBy: 1, createdAt: -1 });
// Compound index for scheduled campaign queries (fixes 551ms slow query)
emailCampaignSchema.index({ status: 1, scheduledAt: 1 });

// Calculate rates before saving
emailCampaignSchema.pre('save', function(next) {
  if (this.stats.sent > 0) {
    this.openRate = ((this.stats.uniqueOpens / this.stats.sent) * 100).toFixed(2);
    this.clickRate = ((this.stats.uniqueClicks / this.stats.sent) * 100).toFixed(2);
    this.bounceRate = ((this.stats.bounced / this.stats.sent) * 100).toFixed(2);
    this.unsubscribeRate = ((this.stats.unsubscribed / this.stats.sent) * 100).toFixed(2);
  }
  next();
});

// Instance methods
emailCampaignSchema.methods.updateStats = function(eventType) {
  switch(eventType) {
    case 'sent':
      this.stats.sent++;
      break;
    case 'delivered':
      this.stats.delivered++;
      break;
    case 'opened':
      this.stats.opened++;
      break;
    case 'clicked':
      this.stats.clicked++;
      break;
    case 'bounced':
      this.stats.bounced++;
      break;
    case 'unsubscribed':
      this.stats.unsubscribed++;
      break;
    case 'complained':
      this.stats.complained++;
      break;
    case 'failed':
      this.stats.failed++;
      break;
  }
};

module.exports = mongoose.model('EmailCampaign', emailCampaignSchema);
