const mongoose = require('mongoose');

/**
 * Notification Preference Model for TRAF3LI
 *
 * Comprehensive user-level notification preferences with:
 * - Multi-channel settings (email, push, SMS, in-app, WhatsApp)
 * - Category-specific preferences
 * - Quiet hours with timezone support
 * - Email digest settings (instant, daily, weekly)
 * - Language preferences
 * - Urgent notification override
 */

// Channel settings sub-schema for each channel
const channelSettingsSchema = new mongoose.Schema({
  email: {
    enabled: { type: Boolean, default: true },
    digest: {
      type: String,
      enum: ['instant', 'daily', 'weekly', 'none'],
      default: 'instant'
    }
  },
  push: {
    enabled: { type: Boolean, default: true }
  },
  sms: {
    enabled: { type: Boolean, default: false }
  },
  inApp: {
    enabled: { type: Boolean, default: true }
  },
  whatsapp: {
    enabled: { type: Boolean, default: false }
  }
}, { _id: false });

// Quiet hours settings
const quietHoursSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  start: {
    type: String,
    default: '22:00',
    match: /^([01]\d|2[0-3]):([0-5]\d)$/  // HH:mm format
  },
  end: {
    type: String,
    default: '08:00',
    match: /^([01]\d|2[0-3]):([0-5]\d)$/  // HH:mm format
  },
  timezone: {
    type: String,
    default: 'Asia/Riyadh'
  }
}, { _id: false });

// Category channel preferences sub-schema
const categoryPreferenceSchema = new mongoose.Schema({
  email: { type: Boolean, default: true },
  push: { type: Boolean, default: true },
  sms: { type: Boolean, default: false },
  inApp: { type: Boolean, default: true },
  whatsapp: { type: Boolean, default: false }
}, { _id: false });

const notificationPreferenceSchema = new mongoose.Schema({
  // User reference (required)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Firm reference (optional for multi-tenancy)
  firmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Firm',
    index: true
  },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
  // Global channel settings
  channels: {
    type: channelSettingsSchema,
    default: () => ({
      email: { enabled: true, digest: 'instant' },
      push: { enabled: true },
      sms: { enabled: false },
      inApp: { enabled: true },
      whatsapp: { enabled: false }
    })
  },

  // Category-specific preferences
  // Map of category name to channel preferences
  categories: {
    // Invoice notifications
    invoices: {
      type: categoryPreferenceSchema,
      default: { email: true, push: true, sms: false, inApp: true, whatsapp: false }
    },
    // Payment notifications
    payments: {
      type: categoryPreferenceSchema,
      default: { email: true, push: true, sms: true, inApp: true, whatsapp: false }
    },
    // Case notifications
    cases: {
      type: categoryPreferenceSchema,
      default: { email: true, push: true, sms: false, inApp: true, whatsapp: false }
    },
    // Task notifications
    tasks: {
      type: categoryPreferenceSchema,
      default: { email: false, push: true, sms: false, inApp: true, whatsapp: false }
    },
    // Client notifications
    clients: {
      type: categoryPreferenceSchema,
      default: { email: true, push: true, sms: false, inApp: true, whatsapp: false }
    },
    // Approval notifications
    approvals: {
      type: categoryPreferenceSchema,
      default: { email: true, push: true, sms: false, inApp: true, whatsapp: false }
    },
    // Reminder notifications
    reminders: {
      type: categoryPreferenceSchema,
      default: { email: true, push: true, sms: false, inApp: true, whatsapp: false }
    },
    // Mention notifications (@mentions)
    mentions: {
      type: categoryPreferenceSchema,
      default: { email: true, push: true, sms: false, inApp: true, whatsapp: false }
    },
    // System notifications
    system: {
      type: categoryPreferenceSchema,
      default: { email: false, push: false, sms: false, inApp: true, whatsapp: false }
    },
    // Billing notifications
    billing: {
      type: categoryPreferenceSchema,
      default: { email: true, push: true, sms: false, inApp: true, whatsapp: false }
    },
    // Security notifications
    security: {
      type: categoryPreferenceSchema,
      default: { email: true, push: true, sms: true, inApp: true, whatsapp: false }
    },
    // Update notifications
    updates: {
      type: categoryPreferenceSchema,
      default: { email: false, push: false, sms: false, inApp: true, whatsapp: false }
    }
  },

  // Quiet hours (Do Not Disturb)
  quietHours: {
    type: quietHoursSchema,
    default: () => ({
      enabled: false,
      start: '22:00',
      end: '08:00',
      timezone: 'Asia/Riyadh'
    })
  },

  // Urgent notifications bypass quiet hours
  urgentOverride: {
    type: Boolean,
    default: true
  },

  // Time to send daily digest (HH:mm format)
  digestTime: {
    type: String,
    default: '09:00',
    match: /^([01]\d|2[0-3]):([0-5]\d)$/
  },

  // Notification language preference
  language: {
    type: String,
    enum: ['en', 'ar', 'both'],
    default: 'both'
  },

  // Completely muted categories (overrides all channel settings)
  mutedCategories: [{
    type: String,
    enum: [
      'invoices', 'payments', 'cases', 'tasks', 'clients',
      'approvals', 'reminders', 'mentions', 'system',
      'billing', 'security', 'updates'
    ]
  }],

  // Last updated by (for audit purposes)
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  versionKey: false
});

// Compound indexes for efficient queries
notificationPreferenceSchema.index({ userId: 1, firmId: 1 }, { unique: true });
notificationPreferenceSchema.index({ 'channels.email.digest': 1 });

/**
 * Static: Get or create preferences for user
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} firmId - Firm ID (optional)
 * @returns {Promise<NotificationPreference>}
 */
notificationPreferenceSchema.statics.getOrCreate = async function(userId, firmId = null) {
  let preferences = await this.findOne({ userId, firmId });

  if (!preferences) {
    preferences = await this.create({
      userId,
      firmId
      // Will use default values from schema
    });
  }

  return preferences;
};

/**
 * Static: Get default preferences structure
 * @returns {Object}
 */
notificationPreferenceSchema.statics.getDefaultPreferences = function() {
  return {
    channels: {
      email: { enabled: true, digest: 'instant' },
      push: { enabled: true },
      sms: { enabled: false },
      inApp: { enabled: true },
      whatsapp: { enabled: false }
    },
    categories: {
      invoices: { email: true, push: true, sms: false, inApp: true, whatsapp: false },
      payments: { email: true, push: true, sms: true, inApp: true, whatsapp: false },
      cases: { email: true, push: true, sms: false, inApp: true, whatsapp: false },
      tasks: { email: false, push: true, sms: false, inApp: true, whatsapp: false },
      clients: { email: true, push: true, sms: false, inApp: true, whatsapp: false },
      approvals: { email: true, push: true, sms: false, inApp: true, whatsapp: false },
      reminders: { email: true, push: true, sms: false, inApp: true, whatsapp: false },
      mentions: { email: true, push: true, sms: false, inApp: true, whatsapp: false },
      system: { email: false, push: false, sms: false, inApp: true, whatsapp: false },
      billing: { email: true, push: true, sms: false, inApp: true, whatsapp: false },
      security: { email: true, push: true, sms: true, inApp: true, whatsapp: false },
      updates: { email: false, push: false, sms: false, inApp: true, whatsapp: false }
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
      timezone: 'Asia/Riyadh'
    },
    urgentOverride: true,
    digestTime: '09:00',
    language: 'both',
    mutedCategories: []
  };
};

/**
 * Instance: Check if should notify for a specific category and channel
 * @param {String} category - Notification category
 * @param {String} channel - Channel to check (email, push, sms, inApp, whatsapp)
 * @param {Boolean} isUrgent - Whether notification is urgent
 * @returns {Boolean}
 */
notificationPreferenceSchema.methods.shouldNotify = function(category, channel, isUrgent = false) {
  // Check if category is muted
  if (this.mutedCategories.includes(category)) {
    return false;
  }

  // Check if channel is globally enabled
  const channelConfig = this.channels[channel];
  if (!channelConfig || !channelConfig.enabled) {
    return false;
  }

  // Check category-specific preference
  const categoryPref = this.categories[category];
  if (!categoryPref || !categoryPref[channel]) {
    return false;
  }

  // Check quiet hours (unless urgent and urgentOverride is enabled)
  if (this.quietHours.enabled && !(isUrgent && this.urgentOverride)) {
    if (this.isInQuietHours()) {
      return false;
    }
  }

  return true;
};

/**
 * Instance: Get enabled notification channels for a category
 * @param {String} category - Notification category
 * @param {Boolean} isUrgent - Whether notification is urgent
 * @returns {Array<String>} - Array of enabled channel names
 */
notificationPreferenceSchema.methods.getNotificationChannels = function(category, isUrgent = false) {
  const channels = [];
  const channelTypes = ['email', 'push', 'sms', 'inApp', 'whatsapp'];

  for (const channel of channelTypes) {
    if (this.shouldNotify(category, channel, isUrgent)) {
      // Map channel names to match notification model format
      const channelName = channel === 'inApp' ? 'in_app' : channel;
      channels.push(channelName);
    }
  }

  return channels;
};

/**
 * Instance: Check if currently in quiet hours
 * @returns {Boolean}
 */
notificationPreferenceSchema.methods.isInQuietHours = function() {
  if (!this.quietHours.enabled) {
    return false;
  }

  // Get current time in user's timezone
  const now = new Date();
  const timezone = this.quietHours.timezone || 'Asia/Riyadh';

  // Convert to user's timezone and get HH:mm format
  const currentTime = now.toLocaleString('en-US', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  }).slice(-5); // Extract HH:mm

  const start = this.quietHours.start;
  const end = this.quietHours.end;

  // Handle overnight quiet hours (e.g., 22:00 - 08:00)
  if (start > end) {
    return currentTime >= start || currentTime < end;
  }

  return currentTime >= start && currentTime < end;
};

/**
 * Instance: Reset to default preferences
 * @returns {Promise<NotificationPreference>}
 */
notificationPreferenceSchema.methods.resetToDefaults = async function() {
  const defaults = this.constructor.getDefaultPreferences();

  this.channels = defaults.channels;
  this.categories = defaults.categories;
  this.quietHours = defaults.quietHours;
  this.urgentOverride = defaults.urgentOverride;
  this.digestTime = defaults.digestTime;
  this.language = defaults.language;
  this.mutedCategories = defaults.mutedCategories;

  return await this.save();
};

/**
 * Instance: Mute a category
 * @param {String} category - Category to mute
 * @returns {Promise<NotificationPreference>}
 */
notificationPreferenceSchema.methods.muteCategory = async function(category) {
  if (!this.mutedCategories.includes(category)) {
    this.mutedCategories.push(category);
    await this.save();
  }
  return this;
};

/**
 * Instance: Unmute a category
 * @param {String} category - Category to unmute
 * @returns {Promise<NotificationPreference>}
 */
notificationPreferenceSchema.methods.unmuteCategory = async function(category) {
  this.mutedCategories = this.mutedCategories.filter(c => c !== category);
  await this.save();
  return this;
};

/**
 * Instance: Update channel settings
 * @param {String} channel - Channel name
 * @param {Object} settings - Channel settings
 * @returns {Promise<NotificationPreference>}
 */
notificationPreferenceSchema.methods.updateChannelSettings = async function(channel, settings) {
  if (this.channels[channel]) {
    this.channels[channel] = { ...this.channels[channel], ...settings };
    this.markModified('channels');
    await this.save();
  }
  return this;
};

/**
 * Instance: Update category preferences
 * @param {String} category - Category name
 * @param {Object} preferences - Category preferences
 * @returns {Promise<NotificationPreference>}
 */
notificationPreferenceSchema.methods.updateCategoryPreferences = async function(category, preferences) {
  if (this.categories[category]) {
    this.categories[category] = { ...this.categories[category], ...preferences };
    this.markModified('categories');
    await this.save();
  }
  return this;
};

/**
 * Static: Get users for digest delivery
 * @param {String} digestType - 'daily' or 'weekly'
 * @returns {Promise<Array>}
 */
notificationPreferenceSchema.statics.getDigestUsers = async function(digestType) {
  return await this.find({
    'channels.email.enabled': true,
    'channels.email.digest': digestType
  }).populate('userId', 'email firstName lastName timezone');
};

/**
 * Instance: Check if should send digest now
 * @returns {Boolean}
 */
notificationPreferenceSchema.methods.shouldSendDigestNow = function() {
  if (!this.channels.email.enabled || this.channels.email.digest === 'instant' || this.channels.email.digest === 'none') {
    return false;
  }

  // Get current time in user's timezone
  const now = new Date();
  const timezone = this.quietHours.timezone || 'Asia/Riyadh';

  const currentTime = now.toLocaleString('en-US', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  }).slice(-5); // Extract HH:mm

  // Check if current time matches digest time (within 5-minute window)
  const digestHour = parseInt(this.digestTime.split(':')[0]);
  const digestMinute = parseInt(this.digestTime.split(':')[1]);
  const currentHour = parseInt(currentTime.split(':')[0]);
  const currentMinute = parseInt(currentTime.split(':')[1]);

  return digestHour === currentHour && Math.abs(currentMinute - digestMinute) < 5;
};

module.exports = mongoose.model('NotificationPreference', notificationPreferenceSchema);
