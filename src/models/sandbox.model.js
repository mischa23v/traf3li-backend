const mongoose = require('mongoose');

/**
 * Sandbox Model - Demo Environment Management
 *
 * Manages sandbox/demo environments for users to test the platform.
 * Each sandbox creates a temporary firm with sample data.
 */

const sandboxSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // OWNERSHIP
    // ═══════════════════════════════════════════════════════════════
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
     },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ═══════════════════════════════════════════════════════════════
    // STATUS & LIFECYCLE
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['creating', 'active', 'expired', 'deleted'],
        default: 'creating',
        index: true
    },
    templateId: {
        type: String,
        enum: ['empty', 'basic_law_firm', 'corporate_legal', 'solo_practitioner', 'full_demo'],
        default: 'basic_law_firm'
    },

    // ═══════════════════════════════════════════════════════════════
    // DATES & EXPIRATION
    // ═══════════════════════════════════════════════════════════════
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },
    lastAccessedAt: {
        type: Date,
        default: Date.now
    },
    expirationWarningsSent: {
        type: [String],
        default: [], // ['7_days', '3_days', '1_day']
    },

    // ═══════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    isDemo: {
        type: Boolean,
        default: true
    },
    features: {
        type: [String],
        default: ['clients', 'cases', 'invoices', 'time_tracking', 'documents', 'reports']
    },
    restrictions: {
        maxClients: { type: Number, default: 50 },
        maxCases: { type: Number, default: 25 },
        maxInvoices: { type: Number, default: 100 },
        maxStorageMB: { type: Number, default: 100 },
        maxUsers: { type: Number, default: 3 },
        apiCallsPerDay: { type: Number, default: 100 },
        apiCallsToday: { type: Number, default: 0 },
        lastApiCallReset: { type: Date, default: Date.now }
    },
    dataProfile: {
        type: String,
        enum: ['empty', 'sample_data', 'full_demo'],
        default: 'sample_data'
    },

    // ═══════════════════════════════════════════════════════════════
    // STATISTICS
    // ═══════════════════════════════════════════════════════════════
    stats: {
        clientsGenerated: { type: Number, default: 0 },
        casesGenerated: { type: Number, default: 0 },
        invoicesGenerated: { type: Number, default: 0 },
        expensesGenerated: { type: Number, default: 0 },
        timeEntriesGenerated: { type: Number, default: 0 },
        totalResets: { type: Number, default: 0 },
        lastResetAt: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    notes: String,
    deletedAt: Date,
    deleteReason: String
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
sandboxSchema.index({ userId: 1, status: 1 });
sandboxSchema.index({ firmId: 1 });
sandboxSchema.index({ expiresAt: 1, status: 1 });
sandboxSchema.index({ createdAt: -1 });

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Update last accessed timestamp
 */
sandboxSchema.methods.updateLastAccessed = async function() {
    this.lastAccessedAt = new Date();
    await this.save();
};

/**
 * Check if sandbox is expired
 */
sandboxSchema.methods.isExpired = function() {
    return this.expiresAt < new Date();
};

/**
 * Extend sandbox expiration
 */
sandboxSchema.methods.extend = async function(days = 7) {
    const newExpiresAt = new Date(this.expiresAt);
    newExpiresAt.setDate(newExpiresAt.getDate() + days);

    this.expiresAt = newExpiresAt;
    this.expirationWarningsSent = []; // Reset warnings

    await this.save();
    return this;
};

/**
 * Mark sandbox as deleted
 */
sandboxSchema.methods.markAsDeleted = async function(reason = null) {
    this.status = 'deleted';
    this.deletedAt = new Date();
    this.deleteReason = reason;

    await this.save();
    return this;
};

/**
 * Check if API limit is exceeded
 */
sandboxSchema.methods.checkApiLimit = function() {
    // Reset counter if it's a new day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastReset = new Date(this.restrictions.lastApiCallReset);
    lastReset.setHours(0, 0, 0, 0);

    if (today > lastReset) {
        this.restrictions.apiCallsToday = 0;
        this.restrictions.lastApiCallReset = new Date();
    }

    return this.restrictions.apiCallsToday < this.restrictions.apiCallsPerDay;
};

/**
 * Increment API call counter
 */
sandboxSchema.methods.incrementApiCalls = async function() {
    this.checkApiLimit(); // Reset if needed
    this.restrictions.apiCallsToday += 1;
    await this.save();
};

/**
 * Get days until expiration
 */
sandboxSchema.methods.getDaysUntilExpiration = function() {
    const now = new Date();
    const diffTime = this.expiresAt - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get active sandbox for user
 */
sandboxSchema.statics.getActiveSandbox = async function(userId) {
    return this.findOne({
        userId,
        status: { $in: ['creating', 'active'] }
    }).populate('firmId');
};

/**
 * Get expired sandboxes
 */
sandboxSchema.statics.getExpiredSandboxes = async function() {
    return this.find({
        status: 'active',
        expiresAt: { $lt: new Date() }
    });
};

/**
 * Get sandboxes needing expiration warning
 */
sandboxSchema.statics.getSandboxesNeedingWarning = async function(daysBeforeExpiration) {
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + daysBeforeExpiration);

    const warningKey = `${daysBeforeExpiration}_days`;

    return this.find({
        status: 'active',
        expiresAt: { $lte: warningDate, $gt: new Date() },
        expirationWarningsSent: { $ne: warningKey }
    });
};

/**
 * Get sandbox statistics
 */
sandboxSchema.statics.getStats = async function() {
    const [totalStats, statusStats] = await Promise.all([
        this.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    totalClients: { $sum: '$stats.clientsGenerated' },
                    totalCases: { $sum: '$stats.casesGenerated' },
                    totalInvoices: { $sum: '$stats.invoicesGenerated' },
                    totalResets: { $sum: '$stats.totalResets' }
                }
            }
        ]),
        this.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ])
    ]);

    return {
        total: totalStats[0]?.total || 0,
        totalClients: totalStats[0]?.totalClients || 0,
        totalCases: totalStats[0]?.totalCases || 0,
        totalInvoices: totalStats[0]?.totalInvoices || 0,
        totalResets: totalStats[0]?.totalResets || 0,
        byStatus: statusStats.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {})
    };
};

module.exports = mongoose.model('Sandbox', sandboxSchema);
