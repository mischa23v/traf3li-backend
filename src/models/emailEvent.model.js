const mongoose = require('mongoose');

const emailEventSchema = new mongoose.Schema({
  firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', required: true, index: true },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
  // Campaign & Subscriber
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailCampaign', index: true },
  subscriberId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailSubscriber', index: true },
  email: { type: String, required: false, trim: true, lowercase: true },

  // Event Type
  eventType: {
    type: String,
    enum: ['sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed', 'complained', 'failed'],
    required: false,
    index: true
  },

  // Tracking ID for unique identification
  trackingId: { type: String, unique: true, sparse: true, index: true },

  // Email Message ID (from Resend)
  messageId: String,

  // Event Metadata
  metadata: {
    // For clicks
    linkClicked: String,
    linkText: String,

    // Device & Browser
    userAgent: String,
    deviceType: { type: String, enum: ['desktop', 'mobile', 'tablet', 'other'] },
    browser: String,
    os: String,

    // Location
    ipAddress: String,
    country: String,
    city: String,
    region: String,

    // For bounces
    bounceType: { type: String, enum: ['soft', 'hard'] },
    bounceReason: String,

    // For failures
    errorMessage: String,
    errorCode: String,

    // Timing
    processingTime: Number, // milliseconds

    // A/B Test variant (if applicable)
    variantId: String,
    variantName: String
  },

  // Timestamp
  timestamp: { type: Date, default: Date.now, index: true },

  // Drip campaign step (if part of drip)
  dripStep: Number,

  // Source tracking
  source: {
    type: String,
    enum: ['campaign', 'drip', 'trigger', 'transactional'],
    default: 'campaign'
  }
}, { timestamps: true });

// Compound indexes for common queries
emailEventSchema.index({ firmId: 1, campaignId: 1, eventType: 1 });
emailEventSchema.index({ firmId: 1, subscriberId: 1, eventType: 1 });
emailEventSchema.index({ campaignId: 1, timestamp: -1 });
emailEventSchema.index({ subscriberId: 1, timestamp: -1 });
emailEventSchema.index({ firmId: 1, timestamp: -1 });

// TTL index to auto-delete old events after 365 days (optional)
emailEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Static methods for analytics
emailEventSchema.statics.getCampaignStats = async function(campaignId) {
  const stats = await this.aggregate([
    { $match: { campaignId: new mongoose.Types.ObjectId(campaignId) } },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = {
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    unsubscribed: 0,
    complained: 0,
    failed: 0
  };

  stats.forEach(stat => {
    result[stat._id] = stat.count;
  });

  return result;
};

emailEventSchema.statics.getUniqueEvents = async function(campaignId, eventType) {
  const uniqueSubscribers = await this.distinct('subscriberId', {
    campaignId: new mongoose.Types.ObjectId(campaignId),
    eventType: eventType
  });

  return uniqueSubscribers.length;
};

emailEventSchema.statics.getLinkPerformance = async function(campaignId) {
  return await this.aggregate([
    {
      $match: {
        campaignId: new mongoose.Types.ObjectId(campaignId),
        eventType: 'clicked'
      }
    },
    {
      $group: {
        _id: '$metadata.linkClicked',
        clicks: { $sum: 1 },
        uniqueClicks: { $addToSet: '$subscriberId' }
      }
    },
    {
      $project: {
        link: '$_id',
        clicks: 1,
        uniqueClicks: { $size: '$uniqueClicks' },
        _id: 0
      }
    },
    { $sort: { clicks: -1 } }
  ]);
};

emailEventSchema.statics.getDeviceStats = async function(campaignId) {
  return await this.aggregate([
    {
      $match: {
        campaignId: new mongoose.Types.ObjectId(campaignId),
        eventType: { $in: ['opened', 'clicked'] }
      }
    },
    {
      $group: {
        _id: {
          eventType: '$eventType',
          deviceType: '$metadata.deviceType'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.deviceType',
        opens: {
          $sum: { $cond: [{ $eq: ['$_id.eventType', 'opened'] }, '$count', 0] }
        },
        clicks: {
          $sum: { $cond: [{ $eq: ['$_id.eventType', 'clicked'] }, '$count', 0] }
        }
      }
    }
  ]);
};

emailEventSchema.statics.getTimeStats = async function(campaignId) {
  return await this.aggregate([
    {
      $match: {
        campaignId: new mongoose.Types.ObjectId(campaignId),
        eventType: { $in: ['opened', 'clicked'] }
      }
    },
    {
      $project: {
        hour: { $hour: '$timestamp' },
        dayOfWeek: { $dayOfWeek: '$timestamp' },
        eventType: 1
      }
    },
    {
      $group: {
        _id: {
          hour: '$hour',
          eventType: '$eventType'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.hour': 1 } }
  ]);
};

emailEventSchema.statics.getEngagementTimeline = async function(campaignId, interval = 'day') {
  const groupBy = interval === 'hour' ?
    { $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' } } :
    { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } };

  return await this.aggregate([
    {
      $match: {
        campaignId: new mongoose.Types.ObjectId(campaignId)
      }
    },
    {
      $group: {
        _id: {
          time: groupBy,
          eventType: '$eventType'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.time': 1 } }
  ]);
};

module.exports = mongoose.model('EmailEvent', emailEventSchema);
