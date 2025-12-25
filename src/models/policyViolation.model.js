/**
 * Policy Violation Model
 *
 * Tracks policy violations across different entities (expenses, invoices, payments, etc.)
 * Supports violation management, escalation, and resolution workflows.
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════
const ENTITY_TYPES = [
    'expense',
    'invoice',
    'payment',
    'time_entry',
    'bill',
    'purchase_order'
];

const VIOLATION_TYPES = [
    'amount_exceeded',
    'category_blocked',
    'missing_receipt',
    'duplicate',
    'out_of_policy',
    'budget_exceeded',
    'unapproved_vendor',
    'rate_exceeded'
];

const SEVERITY_LEVELS = [
    'low',
    'medium',
    'high',
    'critical'
];

const VIOLATION_STATUSES = [
    'open',
    'acknowledged',
    'overridden',
    'resolved',
    'escalated'
];

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Notification record tracking
const notificationRecordSchema = new mongoose.Schema({
    sentTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sentAt: {
        type: Date,
        default: Date.now,
        required: true
    },
    notificationType: {
        type: String,
        enum: ['email', 'sms', 'in_app', 'slack', 'webhook'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'delivered', 'failed', 'bounced'],
        default: 'pending'
    },
    subject: {
        type: String,
        trim: true
    },
    message: {
        type: String,
        trim: true
    },
    errorMessage: {
        type: String,
        trim: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
}, { _id: true });

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const policyViolationSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // ENTITY REFERENCE
    // ═══════════════════════════════════════════════════════════════
    entityType: {
        type: String,
        enum: ENTITY_TYPES,
        required: true,
        index: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // POLICY REFERENCE
    // ═══════════════════════════════════════════════════════════════
    policyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExpensePolicy',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // VIOLATION DETAILS
    // ═══════════════════════════════════════════════════════════════
    violationType: {
        type: String,
        enum: VIOLATION_TYPES,
        required: true,
        index: true
    },
    severity: {
        type: String,
        enum: SEVERITY_LEVELS,
        required: true,
        default: 'low',
        index: true
    },
    details: {
        field: {
            type: String,
            trim: true
        },
        expected: {
            type: mongoose.Schema.Types.Mixed
        },
        actual: {
            type: mongoose.Schema.Types.Mixed
        },
        message: {
            type: String,
            trim: true,
            maxlength: 1000
        },
        messageAr: {
            type: String,
            trim: true,
            maxlength: 1000
        },
        context: {
            type: mongoose.Schema.Types.Mixed
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // WORKFLOW & STATUS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: VIOLATION_STATUSES,
        default: 'open',
        required: true,
        index: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // OVERRIDE INFORMATION
    // ═══════════════════════════════════════════════════════════════
    overrideBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    overrideReason: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    overrideApprovedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    overriddenAt: {
        type: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // RESOLUTION INFORMATION
    // ═══════════════════════════════════════════════════════════════
    resolvedAt: {
        type: Date,
        index: true
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    resolutionNotes: {
        type: String,
        trim: true,
        maxlength: 2000
    },

    // ═══════════════════════════════════════════════════════════════
    // ESCALATION INFORMATION
    // ═══════════════════════════════════════════════════════════════
    escalatedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    escalatedAt: {
        type: Date
    },
    escalationReason: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    escalationLevel: {
        type: Number,
        default: 0,
        min: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════
    notificationsSent: [notificationRecordSchema],

    // ═══════════════════════════════════════════════════════════════
    // ACKNOWLEDGEMENT
    // ═══════════════════════════════════════════════════════════════
    acknowledgedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    acknowledgedAt: {
        type: Date
    },
    acknowledgementNotes: {
        type: String,
        trim: true,
        maxlength: 1000
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT TRAIL
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    versionKey: false,
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
policyViolationSchema.index({ firmId: 1, status: 1 });
policyViolationSchema.index({ firmId: 1, entityType: 1, entityId: 1 });
policyViolationSchema.index({ firmId: 1, violationType: 1 });
policyViolationSchema.index({ firmId: 1, severity: 1 });
policyViolationSchema.index({ firmId: 1, createdAt: -1 });
policyViolationSchema.index({ entityType: 1, entityId: 1 });
policyViolationSchema.index({ policyId: 1, status: 1 });
policyViolationSchema.index({ assignedTo: 1, status: 1 });
policyViolationSchema.index({ resolvedAt: 1 });
policyViolationSchema.index({ status: 1, severity: 1 });
policyViolationSchema.index({ createdAt: -1 });

// Compound index for efficient violation lookup
policyViolationSchema.index({ firmId: 1, entityType: 1, entityId: 1, status: 1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if violation is open
 */
policyViolationSchema.virtual('isOpen').get(function() {
    return this.status === 'open';
});

/**
 * Check if violation is resolved
 */
policyViolationSchema.virtual('isResolved').get(function() {
    return this.status === 'resolved';
});

/**
 * Check if violation is overridden
 */
policyViolationSchema.virtual('isOverridden').get(function() {
    return this.status === 'overridden';
});

/**
 * Check if violation is escalated
 */
policyViolationSchema.virtual('isEscalated').get(function() {
    return this.status === 'escalated';
});

/**
 * Days since creation
 */
policyViolationSchema.virtual('daysSinceCreated').get(function() {
    if (!this.createdAt) return 0;
    const diffTime = Math.abs(new Date() - this.createdAt);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

/**
 * Days since resolution
 */
policyViolationSchema.virtual('daysSinceResolved').get(function() {
    if (!this.resolvedAt) return null;
    const diffTime = Math.abs(new Date() - this.resolvedAt);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Enable virtuals in JSON output
policyViolationSchema.set('toJSON', { virtuals: true });
policyViolationSchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Acknowledge violation
 * @param {ObjectId} userId - User acknowledging the violation
 * @param {String} notes - Acknowledgement notes
 */
policyViolationSchema.methods.acknowledge = async function(userId, notes = '') {
    if (this.status !== 'open') {
        throw new Error('Only open violations can be acknowledged');
    }

    this.status = 'acknowledged';
    this.acknowledgedBy = userId;
    this.acknowledgedAt = new Date();
    this.acknowledgementNotes = notes;
    this.updatedBy = userId;

    return await this.save();
};

/**
 * Override violation
 * @param {ObjectId} overrideBy - User overriding the violation
 * @param {String} reason - Override reason
 * @param {ObjectId} approvedBy - User approving the override
 */
policyViolationSchema.methods.override = async function(overrideBy, reason, approvedBy = null) {
    if (this.status === 'resolved') {
        throw new Error('Cannot override a resolved violation');
    }

    this.status = 'overridden';
    this.overrideBy = overrideBy;
    this.overrideReason = reason;
    this.overrideApprovedBy = approvedBy || overrideBy;
    this.overriddenAt = new Date();
    this.updatedBy = overrideBy;

    return await this.save();
};

/**
 * Resolve violation
 * @param {ObjectId} userId - User resolving the violation
 * @param {String} notes - Resolution notes
 */
policyViolationSchema.methods.resolve = async function(userId, notes = '') {
    if (this.status === 'resolved') {
        throw new Error('Violation already resolved');
    }

    this.status = 'resolved';
    this.resolvedBy = userId;
    this.resolvedAt = new Date();
    this.resolutionNotes = notes;
    this.updatedBy = userId;

    return await this.save();
};

/**
 * Escalate violation
 * @param {ObjectId} escalateTo - User to escalate to
 * @param {String} reason - Escalation reason
 * @param {ObjectId} escalatedBy - User escalating the violation
 */
policyViolationSchema.methods.escalate = async function(escalateTo, reason, escalatedBy) {
    if (this.status === 'resolved') {
        throw new Error('Cannot escalate a resolved violation');
    }

    this.status = 'escalated';
    this.escalatedTo = escalateTo;
    this.escalatedAt = new Date();
    this.escalationReason = reason;
    this.escalationLevel = (this.escalationLevel || 0) + 1;
    this.updatedBy = escalatedBy;

    return await this.save();
};

/**
 * Assign violation to user
 * @param {ObjectId} userId - User to assign to
 * @param {ObjectId} assignedBy - User assigning the violation
 */
policyViolationSchema.methods.assign = async function(userId, assignedBy) {
    this.assignedTo = userId;
    this.updatedBy = assignedBy;

    return await this.save();
};

/**
 * Add notification record
 * @param {Object} notificationData - Notification record data
 */
policyViolationSchema.methods.addNotification = async function(notificationData) {
    this.notificationsSent.push(notificationData);
    return await this.save();
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Create violation
 * @param {Object} violationData - Violation data
 */
policyViolationSchema.statics.createViolation = async function(violationData) {
    const violation = new this(violationData);
    await violation.save();
    return violation;
};

/**
 * Get violations for entity
 * @param {String} entityType - Type of entity
 * @param {ObjectId} entityId - Entity ID
 * @param {Object} filters - Additional filters
 */
policyViolationSchema.statics.getViolationsForEntity = async function(entityType, entityId, filters = {}) {
    const query = {
        entityType,
        entityId
    };

    if (filters.firmId) query.firmId = filters.firmId;
    if (filters.status) query.status = filters.status;
    if (filters.severity) query.severity = filters.severity;
    if (filters.violationType) query.violationType = filters.violationType;

    return await this.find(query)
        .populate('policyId', 'name nameAr policyType')
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .populate('resolvedBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .lean();
};

/**
 * Get violation statistics
 * @param {Object} filters - Filter criteria
 */
policyViolationSchema.statics.getViolationStats = async function(filters = {}) {
    const matchStage = {};

    if (filters.firmId) matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);
    if (filters.entityType) matchStage.entityType = filters.entityType;
    if (filters.startDate || filters.endDate) {
        matchStage.createdAt = {};
        if (filters.startDate) matchStage.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) matchStage.createdAt.$lte = new Date(filters.endDate);
    }

    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalViolations: { $sum: 1 },
                openViolations: {
                    $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] }
                },
                acknowledgedViolations: {
                    $sum: { $cond: [{ $eq: ['$status', 'acknowledged'] }, 1, 0] }
                },
                overriddenViolations: {
                    $sum: { $cond: [{ $eq: ['$status', 'overridden'] }, 1, 0] }
                },
                resolvedViolations: {
                    $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
                },
                escalatedViolations: {
                    $sum: { $cond: [{ $eq: ['$status', 'escalated'] }, 1, 0] }
                },
                criticalViolations: {
                    $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
                },
                highViolations: {
                    $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] }
                },
                mediumViolations: {
                    $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] }
                },
                lowViolations: {
                    $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] }
                }
            }
        }
    ]);

    return stats[0] || {
        totalViolations: 0,
        openViolations: 0,
        acknowledgedViolations: 0,
        overriddenViolations: 0,
        resolvedViolations: 0,
        escalatedViolations: 0,
        criticalViolations: 0,
        highViolations: 0,
        mediumViolations: 0,
        lowViolations: 0
    };
};

/**
 * Get violations by type
 * @param {Object} filters - Filter criteria
 */
policyViolationSchema.statics.getViolationsByType = async function(filters = {}) {
    const matchStage = {};

    if (filters.firmId) matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);
    if (filters.entityType) matchStage.entityType = filters.entityType;
    if (filters.status) matchStage.status = filters.status;
    if (filters.startDate || filters.endDate) {
        matchStage.createdAt = {};
        if (filters.startDate) matchStage.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) matchStage.createdAt.$lte = new Date(filters.endDate);
    }

    return await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$violationType',
                count: { $sum: 1 },
                criticalCount: {
                    $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
                },
                highCount: {
                    $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] }
                },
                openCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] }
                }
            }
        },
        {
            $project: {
                violationType: '$_id',
                count: 1,
                criticalCount: 1,
                highCount: 1,
                openCount: 1,
                _id: 0
            }
        },
        { $sort: { count: -1 } }
    ]);
};

/**
 * Get violations by severity
 * @param {Object} filters - Filter criteria
 */
policyViolationSchema.statics.getViolationsBySeverity = async function(filters = {}) {
    const matchStage = {};

    if (filters.firmId) matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);
    if (filters.entityType) matchStage.entityType = filters.entityType;
    if (filters.status) matchStage.status = filters.status;
    if (filters.startDate || filters.endDate) {
        matchStage.createdAt = {};
        if (filters.startDate) matchStage.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) matchStage.createdAt.$lte = new Date(filters.endDate);
    }

    return await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$severity',
                count: { $sum: 1 },
                openCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] }
                }
            }
        },
        {
            $project: {
                severity: '$_id',
                count: 1,
                openCount: 1,
                _id: 0
            }
        },
        { $sort: { count: -1 } }
    ]);
};

/**
 * Get unresolved violations for user
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} firmId - Firm ID
 */
policyViolationSchema.statics.getUnresolvedForUser = async function(userId, firmId) {
    return await this.find({
        firmId,
        assignedTo: userId,
        status: { $in: ['open', 'acknowledged', 'escalated'] }
    })
        .populate('policyId', 'name nameAr')
        .sort({ severity: 1, createdAt: -1 }) // Critical first
        .lean();
};

/**
 * Get critical violations
 * @param {ObjectId} firmId - Firm ID
 * @param {Number} limit - Limit results
 */
policyViolationSchema.statics.getCriticalViolations = async function(firmId, limit = 50) {
    return await this.find({
        firmId,
        severity: 'critical',
        status: { $in: ['open', 'acknowledged', 'escalated'] }
    })
        .populate('entityId')
        .populate('assignedTo', 'firstName lastName email')
        .populate('policyId', 'name nameAr')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

/**
 * Get average resolution time
 * @param {Object} filters - Filter criteria
 */
policyViolationSchema.statics.getAverageResolutionTime = async function(filters = {}) {
    const matchStage = {
        status: 'resolved',
        resolvedAt: { $exists: true }
    };

    if (filters.firmId) matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);
    if (filters.violationType) matchStage.violationType = filters.violationType;
    if (filters.severity) matchStage.severity = filters.severity;

    const result = await this.aggregate([
        { $match: matchStage },
        {
            $project: {
                resolutionTime: {
                    $subtract: ['$resolvedAt', '$createdAt']
                }
            }
        },
        {
            $group: {
                _id: null,
                avgResolutionTime: { $avg: '$resolutionTime' },
                minResolutionTime: { $min: '$resolutionTime' },
                maxResolutionTime: { $max: '$resolutionTime' },
                count: { $sum: 1 }
            }
        }
    ]);

    if (result.length === 0) {
        return {
            avgResolutionTimeMs: 0,
            avgResolutionTimeHours: 0,
            avgResolutionTimeDays: 0,
            minResolutionTimeMs: 0,
            maxResolutionTimeMs: 0,
            count: 0
        };
    }

    const avgMs = result[0].avgResolutionTime;
    return {
        avgResolutionTimeMs: avgMs,
        avgResolutionTimeHours: avgMs / (1000 * 60 * 60),
        avgResolutionTimeDays: avgMs / (1000 * 60 * 60 * 24),
        minResolutionTimeMs: result[0].minResolutionTime,
        maxResolutionTimeMs: result[0].maxResolutionTime,
        count: result[0].count
    };
};

/**
 * Bulk resolve violations
 * @param {Array} violationIds - Array of violation IDs
 * @param {ObjectId} userId - User resolving the violations
 * @param {String} notes - Resolution notes
 */
policyViolationSchema.statics.bulkResolve = async function(violationIds, userId, notes = '') {
    return await this.updateMany(
        {
            _id: { $in: violationIds },
            status: { $ne: 'resolved' }
        },
        {
            $set: {
                status: 'resolved',
                resolvedBy: userId,
                resolvedAt: new Date(),
                resolutionNotes: notes,
                updatedBy: userId
            }
        }
    );
};

// Export constants for use in controllers
policyViolationSchema.statics.ENTITY_TYPES = ENTITY_TYPES;
policyViolationSchema.statics.VIOLATION_TYPES = VIOLATION_TYPES;
policyViolationSchema.statics.SEVERITY_LEVELS = SEVERITY_LEVELS;
policyViolationSchema.statics.VIOLATION_STATUSES = VIOLATION_STATUSES;

// ═══════════════════════════════════════════════════════════════
// FIRM ISOLATION PLUGIN (RLS-like enforcement)
// ═══════════════════════════════════════════════════════════════
const firmIsolationPlugin = require('./plugins/firmIsolation.plugin');

/**
 * Apply Row-Level Security (RLS) plugin to enforce firm-level data isolation.
 * This ensures that all queries automatically filter by firmId unless explicitly bypassed.
 *
 * Usage:
 *   // Normal queries (firmId required):
 *   await PolicyViolation.find({ firmId: myFirmId, status: 'open' });
 *
 *   // System-level queries (bypass):
 *   await PolicyViolation.findWithoutFirmFilter({ _id: violationId });
 *   await PolicyViolation.find({}).setOptions({ bypassFirmFilter: true });
 */
policyViolationSchema.plugin(firmIsolationPlugin);

module.exports = mongoose.model('PolicyViolation', policyViolationSchema);
