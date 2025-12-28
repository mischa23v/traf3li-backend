/**
 * Team Activity Log Model - User Management Audit Trail
 *
 * This model tracks all team management activities with detailed change history.
 * Based on Salesforce/SAP best practices for enterprise audit trails.
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Change tracking sub-schema
const changeSchema = new mongoose.Schema({
    field: {
        type: String,
        required: true
    },
    oldValue: {
        type: mongoose.Schema.Types.Mixed
    },
    newValue: {
        type: mongoose.Schema.Types.Mixed
    }
}, { _id: false });

const teamActivityLogSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // TENANT ISOLATION (CRITICAL)
    // ═══════════════════════════════════════════════════════════════
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
    // ═══════════════════════════════════════════════════════════════
    // WHO DID THE ACTION
    // ═══════════════════════════════════════════════════════════════
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    userEmail: {
        type: String
    },
    userName: {
        type: String
    },

    // ═══════════════════════════════════════════════════════════════
    // TARGET OF THE ACTION
    // ═══════════════════════════════════════════════════════════════
    targetType: {
        type: String,
        enum: ['case', 'client', 'invoice', 'document', 'task', 'staff', 'setting', 'payment', 'expense', 'report'],
        required: true,
        index: true
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },
    targetName: {
        type: String  // Human-readable name for quick reference
    },

    // ═══════════════════════════════════════════════════════════════
    // ACTION DETAILS
    // ═══════════════════════════════════════════════════════════════
    action: {
        type: String,
        enum: [
            // CRUD operations
            'create', 'read', 'update', 'delete',
            // Team management
            'invite', 'accept_invite', 'revoke_invite', 'resend_invite',
            'suspend', 'activate', 'depart', 'reinstate',
            // Permission changes
            'update_permissions', 'update_role',
            // Approval workflow
            'approve', 'reject', 'request_approval',
            // Authentication
            'login', 'logout', 'password_reset',
            // Data operations
            'export', 'share', 'import'
        ],
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // WHAT CHANGED
    // ═══════════════════════════════════════════════════════════════
    changes: [changeSchema],

    // Additional context/details
    details: {
        type: mongoose.Schema.Types.Mixed
    },

    // ═══════════════════════════════════════════════════════════════
    // REQUEST CONTEXT
    // ═══════════════════════════════════════════════════════════════
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    },
    sessionId: {
        type: String
    },

    // ═══════════════════════════════════════════════════════════════
    // APPROVAL WORKFLOW
    // ═══════════════════════════════════════════════════════════════
    requiresApproval: {
        type: Boolean,
        default: false
    },
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected', null],
        default: null
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    },
    rejectionReason: {
        type: String,
        maxlength: 500
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['success', 'failed', 'pending'],
        default: 'success'
    },
    errorMessage: {
        type: String
    },

    // ═══════════════════════════════════════════════════════════════
    // TIMESTAMP
    // ═══════════════════════════════════════════════════════════════
    timestamp: {
        type: Date,
        default: Date.now,
        required: true,
        index: true
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES FOR FAST QUERYING
// ═══════════════════════════════════════════════════════════════
teamActivityLogSchema.index({ firmId: 1, timestamp: -1 });
teamActivityLogSchema.index({ firmId: 1, userId: 1, timestamp: -1 });
teamActivityLogSchema.index({ firmId: 1, targetType: 1, targetId: 1 });
teamActivityLogSchema.index({ firmId: 1, action: 1, timestamp: -1 });
teamActivityLogSchema.index({ firmId: 1, approvalStatus: 1 });
teamActivityLogSchema.index({ firmId: 1, requiresApproval: 1, approvalStatus: 1 });

// TTL index: Auto-delete logs older than 7 years (PDPL retention requirement)
teamActivityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 365 * 24 * 60 * 60 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Create activity log entry
 */
teamActivityLogSchema.statics.log = async function(logData) {
    try {
        const log = new this(logData);
        await log.save();
        return log;
    } catch (error) {
        // Don't let audit log failure break the main operation
        logger.error('Team activity log creation failed:', error.message);
        return null;
    }
};

/**
 * Get user's activity history
 */
teamActivityLogSchema.statics.getUserActivity = async function(firmId, userId, options = {}) {
    const { limit = 50, skip = 0, action, startDate, endDate } = options;

    const query = { firmId, userId };

    if (action) query.action = action;
    if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    return this.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .populate('targetId', 'firstName lastName email staffId')
        .lean();
};

/**
 * Get activity for a specific target (e.g., staff member)
 */
teamActivityLogSchema.statics.getTargetActivity = async function(firmId, targetType, targetId, options = {}) {
    const { limit = 50, skip = 0 } = options;

    return this.find({ firmId, targetType, targetId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .populate('userId', 'firstName lastName email')
        .lean();
};

/**
 * Get pending approvals
 */
teamActivityLogSchema.statics.getPendingApprovals = async function(firmId, options = {}) {
    const { limit = 50, skip = 0 } = options;

    return this.find({
        firmId,
        requiresApproval: true,
        approvalStatus: 'pending'
    })
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .populate('userId', 'firstName lastName email')
        .populate('targetId', 'firstName lastName email staffId')
        .lean();
};

/**
 * Get firm-wide audit log with filters
 */
teamActivityLogSchema.statics.getAuditLog = async function(firmId, filters = {}) {
    const {
        page = 1,
        limit = 50,
        action,
        targetType,
        userId,
        startDate,
        endDate,
        status,
        sortBy = 'timestamp',
        sortOrder = 'desc'
    } = filters;

    const query = { firmId };

    if (action) query.action = action;
    if (targetType) query.targetType = targetType;
    if (userId) query.userId = new mongoose.Types.ObjectId(userId);
    if (status) query.status = status;
    if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [logs, total] = await Promise.all([
        this.find(query)
            .sort(sort)
            .limit(limit)
            .skip((page - 1) * limit)
            .populate('userId', 'firstName lastName email avatar')
            .populate('approvedBy', 'firstName lastName email')
            .lean(),
        this.countDocuments(query)
    ]);

    return {
        logs,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
};

/**
 * Export audit log for compliance (CSV format data)
 */
teamActivityLogSchema.statics.exportAuditLog = async function(firmId, filters = {}) {
    const { startDate, endDate, action, targetType } = filters;

    const query = { firmId };

    if (action) query.action = action;
    if (targetType) query.targetType = targetType;
    if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    return this.find(query)
        .sort({ timestamp: -1 })
        .limit(10000) // Maximum export limit
        .populate('userId', 'firstName lastName email')
        .populate('approvedBy', 'firstName lastName email')
        .lean();
};

/**
 * Get activity statistics
 */
teamActivityLogSchema.statics.getStats = async function(firmId, options = {}) {
    const { days = 30 } = options;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const matchQuery = {
        firmId: new mongoose.Types.ObjectId(firmId),
        timestamp: { $gte: startDate }
    };

    const [byAction, byUser, byDay, total] = await Promise.all([
        // By action type
        this.aggregate([
            { $match: matchQuery },
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]),
        // By user
        this.aggregate([
            { $match: matchQuery },
            { $group: { _id: '$userId', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    _id: 1,
                    count: 1,
                    userName: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
                    email: '$user.email'
                }
            }
        ]),
        // By day
        this.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]),
        // Total count
        this.countDocuments(matchQuery)
    ]);

    return {
        total,
        byAction: byAction.reduce((acc, item) => { acc[item._id] = item.count; return acc; }, {}),
        byUser,
        byDay: byDay.reduce((acc, item) => { acc[item._id] = item.count; return acc; }, {})
    };
};

module.exports = mongoose.model('TeamActivityLog', teamActivityLogSchema);
