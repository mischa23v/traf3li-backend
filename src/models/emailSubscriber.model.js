const mongoose = require('mongoose');

const emailSubscriberSchema = new mongoose.Schema({
  firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', required: false, index: true  },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
  // Email (unique per firm)
  email: { type: String, required: false, trim: true, lowercase: true },

  // Related Entities
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', index: true },

  // Personal Information
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  fullName: { type: String, trim: true },
  phone: { type: String, trim: true },
  companyName: { type: String, trim: true },

  // Subscription Status
  status: {
    type: String,
    enum: ['subscribed', 'unsubscribed', 'bounced', 'complained'],
    default: 'subscribed',
    index: true
  },

  // Organization
  tags: [{ type: String, trim: true }],
  customFields: mongoose.Schema.Types.Mixed, // Flexible custom data

  // Source & Dates
  subscriptionSource: {
    type: String,
    enum: ['manual', 'import', 'form', 'api', 'lead_conversion', 'client_creation'],
    default: 'manual'
  },
  subscribedAt: { type: Date, default: Date.now },
  unsubscribedAt: Date,
  unsubscribeReason: { type: String, trim: true },

  // Engagement Metrics
  engagement: {
    lastOpenedAt: Date,
    lastClickedAt: Date,
    totalOpens: { type: Number, default: 0 },
    totalClicks: { type: Number, default: 0 },
    emailsSent: { type: Number, default: 0 },
    emailsDelivered: { type: Number, default: 0 },
    engagementScore: { type: Number, default: 0, min: 0, max: 100 } // 0-100 based on activity
  },

  // Bounce Information
  bounceDetails: {
    type: { type: String, enum: ['soft', 'hard'] },
    reason: String,
    bouncedAt: Date,
    bounceCount: { type: Number, default: 0 }
  },

  // Preferences
  preferences: {
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'digest'], default: 'weekly' },
    categories: [String], // Which types of emails they want to receive
    language: { type: String, default: 'ar' },
    timezone: { type: String, default: 'Asia/Riyadh' }
  },

  // Drip Campaign Tracking
  dripCampaigns: [{
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailCampaign' },
    startedAt: Date,
    currentStep: { type: Number, default: 0 },
    completedSteps: [Number],
    status: { type: String, enum: ['active', 'paused', 'completed', 'cancelled'], default: 'active' },
    lastEmailSentAt: Date
  }],

  // Validation & Quality
  emailVerified: { type: Boolean, default: false },
  verificationToken: String,
  verifiedAt: Date,

  // Metadata
  ipAddress: String,
  userAgent: String,

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Compound index for unique email per firm
emailSubscriberSchema.index({ firmId: 1, email: 1 }, { unique: true });

// Additional indexes
emailSubscriberSchema.index({ firmId: 1, status: 1 });
emailSubscriberSchema.index({ firmId: 1, tags: 1 });
emailSubscriberSchema.index({ 'engagement.engagementScore': -1 });
// Index for drip campaign status queries (fixes 548-625ms slow query)
emailSubscriberSchema.index({ 'dripCampaigns.status': 1 });

// Virtual for display name
emailSubscriberSchema.virtual('displayName').get(function() {
  if (this.fullName) return this.fullName;
  if (this.firstName || this.lastName) {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim();
  }
  if (this.companyName) return this.companyName;
  return this.email;
});

// Calculate engagement score before save
emailSubscriberSchema.pre('save', function(next) {
  // Calculate engagement score (0-100)
  let score = 0;

  // Base score for being subscribed
  if (this.status === 'subscribed') score += 20;

  // Recent activity bonus
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  if (this.engagement.lastOpenedAt) {
    const daysSinceOpen = (now - this.engagement.lastOpenedAt.getTime()) / dayMs;
    if (daysSinceOpen < 7) score += 25;
    else if (daysSinceOpen < 30) score += 15;
    else if (daysSinceOpen < 90) score += 5;
  }

  if (this.engagement.lastClickedAt) {
    const daysSinceClick = (now - this.engagement.lastClickedAt.getTime()) / dayMs;
    if (daysSinceClick < 7) score += 25;
    else if (daysSinceClick < 30) score += 15;
    else if (daysSinceClick < 90) score += 5;
  }

  // Email interaction rates
  if (this.engagement.emailsSent > 0) {
    const openRate = this.engagement.totalOpens / this.engagement.emailsSent;
    const clickRate = this.engagement.totalClicks / this.engagement.emailsSent;
    score += Math.min(15, openRate * 100 * 0.15);
    score += Math.min(15, clickRate * 100 * 0.15);
  }

  this.engagement.engagementScore = Math.min(100, Math.round(score));
  next();
});

// Instance methods
emailSubscriberSchema.methods.unsubscribe = async function(reason) {
  this.status = 'unsubscribed';
  this.unsubscribedAt = new Date();
  this.unsubscribeReason = reason;
  await this.save();
};

emailSubscriberSchema.methods.recordBounce = async function(bounceType, reason) {
  this.status = 'bounced';
  this.bounceDetails = {
    type: bounceType,
    reason: reason,
    bouncedAt: new Date(),
    bounceCount: (this.bounceDetails?.bounceCount || 0) + 1
  };
  await this.save();
};

emailSubscriberSchema.methods.recordOpen = async function() {
  this.engagement.lastOpenedAt = new Date();
  this.engagement.totalOpens++;
  await this.save();
};

emailSubscriberSchema.methods.recordClick = async function() {
  this.engagement.lastClickedAt = new Date();
  this.engagement.totalClicks++;
  await this.save();
};

// Static methods
emailSubscriberSchema.statics.getActiveSubscribers = async function(firmId, filters = {}) {
  const query = { firmId: firmId, status: 'subscribed' };

  if (filters.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags };
  }

  if (filters.minEngagement) {
    query['engagement.engagementScore'] = { $gte: filters.minEngagement };
  }

  return await this.find(query).lean();
};

emailSubscriberSchema.set('toJSON', { virtuals: true });
emailSubscriberSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('EmailSubscriber', emailSubscriberSchema);
