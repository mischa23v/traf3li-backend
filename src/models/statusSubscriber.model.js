/**
 * Status Subscriber Model
 *
 * Manages subscribers who want to receive notifications about system status changes,
 * incidents, and maintenance windows.
 *
 * Features:
 * - Multi-tenant isolation (firmId)
 * - Email and phone subscription
 * - Component-specific subscriptions
 * - Impact level filtering
 * - Email verification
 * - Subscription preferences
 */

const mongoose = require('mongoose');

const statusSubscriberSchema = new mongoose.Schema({
  // ═══════════════════════════════════════════════════════════════
  // TENANT ISOLATION (Multi-Tenancy)
  // ═══════════════════════════════════════════════════════════════
  firmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Firm',
    required: false,
    index: true
   },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
  // ═══════════════════════════════════════════════════════════════
  // CONTACT INFORMATION
  // ═══════════════════════════════════════════════════════════════
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },

  phone: {
    type: String,
    trim: true
  },

  // ═══════════════════════════════════════════════════════════════
  // SUBSCRIPTION PREFERENCES
  // ═══════════════════════════════════════════════════════════════
  components: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SystemComponent'
  }],

  incidentTypes: [{
    type: String,
    enum: ['none', 'minor', 'major', 'critical']
  }],

  // ═══════════════════════════════════════════════════════════════
  // VERIFICATION
  // ═══════════════════════════════════════════════════════════════
  isVerified: {
    type: Boolean,
    default: false,
    index: true
  },

  verificationToken: {
    type: String,
    index: true
  },

  verifiedAt: {
    type: Date
  },

  // ═══════════════════════════════════════════════════════════════
  // SUBSCRIPTION STATUS
  // ═══════════════════════════════════════════════════════════════
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  unsubscribedAt: {
    type: Date
  },

  unsubscribeToken: {
    type: String,
    index: true
  },

  // ═══════════════════════════════════════════════════════════════
  // NOTIFICATION PREFERENCES
  // ═══════════════════════════════════════════════════════════════
  preferences: {
    notifyOnIncidents: {
      type: Boolean,
      default: true
    },
    notifyOnMaintenance: {
      type: Boolean,
      default: true
    },
    notifyOnResolution: {
      type: Boolean,
      default: true
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════
  subscriptionSource: {
    type: String,
    enum: ['status_page', 'api', 'manual', 'import'],
    default: 'status_page'
  },

  ipAddress: {
    type: String
  },

  userAgent: {
    type: String
  }
}, {
  timestamps: true,
  versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
statusSubscriberSchema.index({ firmId: 1, email: 1 }, { unique: true });
statusSubscriberSchema.index({ firmId: 1, isVerified: 1, isActive: 1 });
statusSubscriberSchema.index({ components: 1 });
statusSubscriberSchema.index({ verificationToken: 1 }, { sparse: true });
statusSubscriberSchema.index({ unsubscribeToken: 1 }, { sparse: true });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * Generate tokens before first save
 */
statusSubscriberSchema.pre('save', function(next) {
  if (this.isNew) {
    // Generate verification token if not already set
    if (!this.verificationToken) {
      this.verificationToken = generateToken();
    }

    // Generate unsubscribe token if not already set
    if (!this.unsubscribeToken) {
      this.unsubscribeToken = generateToken();
    }
  }
  next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get verified and active subscribers
 */
statusSubscriberSchema.statics.getActiveSubscribers = async function(firmId = null, filters = {}) {
  const query = {
    isVerified: true,
    isActive: true
  };
  if (firmId) query.firmId = firmId;

  if (filters.components && filters.components.length > 0) {
    query.components = { $in: filters.components };
  }

  if (filters.incidentTypes && filters.incidentTypes.length > 0) {
    query.incidentTypes = { $in: filters.incidentTypes };
  }

  return await this.find(query).lean();
};

/**
 * Get subscribers by component
 */
statusSubscriberSchema.statics.getByComponent = async function(componentId, firmId = null) {
  const query = {
    components: componentId,
    isVerified: true,
    isActive: true
  };
  if (firmId) query.firmId = firmId;

  return await this.find(query).lean();
};

/**
 * Get subscribers for incident type
 */
statusSubscriberSchema.statics.getForIncidentType = async function(incidentType, firmId = null) {
  const query = {
    incidentTypes: incidentType,
    isVerified: true,
    isActive: true,
    'preferences.notifyOnIncidents': true
  };
  if (firmId) query.firmId = firmId;

  return await this.find(query).lean();
};

/**
 * Find by verification token
 */
statusSubscriberSchema.statics.findByVerificationToken = async function(token) {
  return await this.findOne({ verificationToken: token });
};

/**
 * Find by unsubscribe token
 */
statusSubscriberSchema.statics.findByUnsubscribeToken = async function(token) {
  return await this.findOne({ unsubscribeToken: token });
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Verify subscriber email
 */
statusSubscriberSchema.methods.verify = async function() {
  this.isVerified = true;
  this.verifiedAt = new Date();
  this.verificationToken = null;
  await this.save();
  return this;
};

/**
 * Unsubscribe
 */
statusSubscriberSchema.methods.unsubscribe = async function() {
  this.isActive = false;
  this.unsubscribedAt = new Date();
  await this.save();
  return this;
};

/**
 * Resubscribe
 */
statusSubscriberSchema.methods.resubscribe = async function() {
  this.isActive = true;
  this.unsubscribedAt = null;
  await this.save();
  return this;
};

/**
 * Subscribe to component
 */
statusSubscriberSchema.methods.subscribeToComponent = async function(componentId) {
  if (!this.components.includes(componentId)) {
    this.components.push(componentId);
    await this.save();
  }
  return this;
};

/**
 * Unsubscribe from component
 */
statusSubscriberSchema.methods.unsubscribeFromComponent = async function(componentId) {
  this.components = this.components.filter(
    id => id.toString() !== componentId.toString()
  );
  await this.save();
  return this;
};

/**
 * Update preferences
 */
statusSubscriberSchema.methods.updatePreferences = async function(newPreferences) {
  this.preferences = {
    ...this.preferences,
    ...newPreferences
  };
  await this.save();
  return this;
};

/**
 * Check if subscriber should be notified for incident
 */
statusSubscriberSchema.methods.shouldNotifyForIncident = function(incident) {
  if (!this.isVerified || !this.isActive) return false;
  if (!this.preferences.notifyOnIncidents) return false;

  // Check if subscribed to incident impact level
  if (this.incidentTypes.length > 0 && !this.incidentTypes.includes(incident.impact)) {
    return false;
  }

  // Check if subscribed to any affected components
  if (this.components.length > 0) {
    const hasAffectedComponent = incident.affectedComponents.some(
      componentId => this.components.some(
        subscribedId => subscribedId.toString() === componentId.toString()
      )
    );
    if (!hasAffectedComponent) return false;
  }

  return true;
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Generate random token
 */
function generateToken() {
  return require('crypto').randomBytes(32).toString('hex');
}

module.exports = mongoose.model('StatusSubscriber', statusSubscriberSchema);
