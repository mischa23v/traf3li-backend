const mongoose = require('mongoose');

// Helper function to escape regex special characters
const escapeRegex = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const emailSegmentSchema = new mongoose.Schema({
  firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', required: false, index: true  },

    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
  name: { type: String, required: false, trim: true },
  description: { type: String, trim: true },

  // Segment Conditions
  conditions: [{
    field: {
      type: String,
      required: false,
      // Examples: 'status', 'tags', 'engagement.engagementScore', 'engagement.lastOpenedAt', etc.
    },
    operator: {
      type: String,
      enum: ['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'in', 'not_in', 'exists', 'not_exists', 'between'],
      required: false
    },
    value: mongoose.Schema.Types.Mixed, // Can be string, number, array, date, etc.
    value2: mongoose.Schema.Types.Mixed // For 'between' operator
  }],

  // Logic to combine conditions
  conditionLogic: {
    type: String,
    enum: ['AND', 'OR'],
    default: 'AND'
  },

  // Cached subscriber count and IDs
  subscriberCount: { type: Number, default: 0 },
  cachedSubscriberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'EmailSubscriber' }],
  lastCalculatedAt: Date,

  // Dynamic vs Static
  isDynamic: {
    type: Boolean,
    default: true
    // Dynamic: Auto-updates based on conditions
    // Static: Fixed list of subscribers
  },

  // For static segments
  staticSubscribers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'EmailSubscriber' }],

  // Usage statistics
  usageCount: { type: Number, default: 0 },
  lastUsedAt: Date,

  // Status
  isActive: { type: Boolean, default: true },

  // Metadata
  tags: [{ type: String, trim: true }],
  color: { type: String, default: '#3B82F6' }, // For UI display

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Indexes
emailSegmentSchema.index({ firmId: 1, isActive: 1 });
emailSegmentSchema.index({ firmId: 1, isDynamic: 1 });

// Instance methods
emailSegmentSchema.methods.calculateSubscribers = async function() {
  if (!this.isDynamic) {
    // For static segments, just use the staticSubscribers array
    this.subscriberCount = this.staticSubscribers.length;
    this.cachedSubscriberIds = this.staticSubscribers;
    this.lastCalculatedAt = new Date();
    await this.save();
    return this.subscriberCount;
  }

  // For dynamic segments, evaluate conditions
  const EmailSubscriber = mongoose.model('EmailSubscriber');
  const query = this.buildQuery();

  const subscribers = await EmailSubscriber.find(query).select('_id').lean();
  const subscriberIds = subscribers.map(s => s._id);

  this.subscriberCount = subscriberIds.length;
  this.cachedSubscriberIds = subscriberIds;
  this.lastCalculatedAt = new Date();
  await this.save();

  return this.subscriberCount;
};

emailSegmentSchema.methods.buildQuery = function() {
  const baseQuery = {
    firmId: this.firmId,
    status: 'subscribed' // Only include active subscribers
  };

  if (!this.conditions || this.conditions.length === 0) {
    return baseQuery;
  }

  const conditionQueries = this.conditions.map(condition => {
    return this._buildConditionQuery(condition);
  });

  if (this.conditionLogic === 'OR') {
    baseQuery.$or = conditionQueries;
  } else {
    // AND logic
    Object.assign(baseQuery, ...conditionQueries);
  }

  return baseQuery;
};

emailSegmentSchema.methods._buildConditionQuery = function(condition) {
  const { field, operator, value, value2 } = condition;
  const query = {};

  switch (operator) {
    case 'equals':
      query[field] = value;
      break;
    case 'not_equals':
      query[field] = { $ne: value };
      break;
    case 'contains':
      if (Array.isArray(value)) {
        query[field] = { $in: value };
      } else {
        query[field] = { $regex: escapeRegex(value), $options: 'i' };
      }
      break;
    case 'not_contains':
      if (Array.isArray(value)) {
        query[field] = { $nin: value };
      } else {
        query[field] = { $not: { $regex: escapeRegex(value), $options: 'i' } };
      }
      break;
    case 'greater_than':
      query[field] = { $gt: value };
      break;
    case 'less_than':
      query[field] = { $lt: value };
      break;
    case 'in':
      query[field] = { $in: Array.isArray(value) ? value : [value] };
      break;
    case 'not_in':
      query[field] = { $nin: Array.isArray(value) ? value : [value] };
      break;
    case 'exists':
      query[field] = { $exists: true, $ne: null };
      break;
    case 'not_exists':
      query[field] = { $exists: false };
      break;
    case 'between':
      query[field] = { $gte: value, $lte: value2 };
      break;
    default:
      query[field] = value;
  }

  return query;
};

emailSegmentSchema.methods.getSubscribers = async function(options = {}) {
  const EmailSubscriber = mongoose.model('EmailSubscriber');

  if (!this.isDynamic) {
    // Return static subscribers
    return await EmailSubscriber.find({
      _id: { $in: this.staticSubscribers },
      status: 'subscribed'
    }).lean();
  }

  // For dynamic segments, use the query
  const query = this.buildQuery();

  let queryBuilder = EmailSubscriber.find(query);

  if (options.limit) {
    queryBuilder = queryBuilder.limit(options.limit);
  }

  if (options.skip) {
    queryBuilder = queryBuilder.skip(options.skip);
  }

  if (options.sort) {
    queryBuilder = queryBuilder.sort(options.sort);
  }

  return await queryBuilder.lean();
};

emailSegmentSchema.methods.recordUsage = async function() {
  this.usageCount++;
  this.lastUsedAt = new Date();
  await this.save();
};

// Static methods
emailSegmentSchema.statics.refreshAllSegments = async function(firmId) {
  const segments = await this.find({ firmId: firmId, isDynamic: true, isActive: true });

  const results = [];
  for (const segment of segments) {
    try {
      const count = await segment.calculateSubscribers();
      results.push({
        segmentId: segment._id,
        name: segment.name,
        count: count,
        success: true
      });
    } catch (error) {
      results.push({
        segmentId: segment._id,
        name: segment.name,
        error: error.message,
        success: false
      });
    }
  }

  return results;
};

// Pre-save hook to calculate subscribers if conditions changed
emailSegmentSchema.pre('save', async function(next) {
  if (this.isModified('conditions') || this.isModified('conditionLogic')) {
    if (this.isDynamic) {
      // Mark for recalculation but don't block save
      this.lastCalculatedAt = null;
    }
  }
  next();
});

module.exports = mongoose.model('EmailSegment', emailSegmentSchema);
