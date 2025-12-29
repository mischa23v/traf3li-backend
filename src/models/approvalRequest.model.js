/**
 * Approval Request Model - Generic Approval Request Tracking
 *
 * Tracks individual approval requests for any entity type.
 * Each request follows an approval chain with multiple approvers.
 *
 * Security: Multi-tenant isolation via firmId
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Approver in chain sub-schema
const approverInChainSchema = new mongoose.Schema({
    approverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    order: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'delegated', 'skipped'],
        default: 'pending'
    },
    actionDate: {
        type: Date
    },
    notes: {
        type: String,
        maxlength: 1000
    },
    delegatedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    delegatedReason: {
        type: String,
        maxlength: 500
    }
}, { _id: false });

// History entry sub-schema
const historyEntrySchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: ['created', 'submitted', 'approved', 'rejected', 'cancelled', 'info_requested', 'delegated', 'escalated', 'reminded', 'auto_approved']
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    },
    notes: {
        type: String,
        maxlength: 1000
    },
    previousStatus: {
        type: String
    },
    newStatus: {
        type: String
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
}, { _id: false });

// Reminder sent sub-schema
const reminderSchema = new mongoose.Schema({
    sentAt: {
        type: Date,
        required: true
    },
    to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// APPROVAL REQUEST SCHEMA
// ═══════════════════════════════════════════════════════════════

const approvalRequestSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // TENANT ISOLATION
    // ═══════════════════════════════════════════════════════════════
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
    // REQUEST IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    requestNumber: {
        type: String,
        required: true,
        index: true,
        unique: true
        // Format: APR-YYYY-#####
    },

    // ═══════════════════════════════════════════════════════════════
    // ENTITY REFERENCE
    // ═══════════════════════════════════════════════════════════════
    entityType: {
        type: String,
        required: true,
        index: true
        // e.g., 'quote', 'discount', 'expense', 'invoice', etc.
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // REQUESTER
    // ═══════════════════════════════════════════════════════════════
    requesterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS & PRIORITY
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled', 'info_requested'],
        default: 'pending',
        index: true
    },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal',
        index: true
    },
    dueDate: {
        type: Date,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // APPROVAL CHAIN
    // ═══════════════════════════════════════════════════════════════
    approvalChain: {
        type: [approverInChainSchema],
        required: true,
        validate: {
            validator: function(chain) {
                return chain && chain.length > 0;
            },
            message: 'At least one approver is required'
        }
    },
    currentLevel: {
        type: Number,
        default: 0,
        min: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // REQUEST DATA
    // ═══════════════════════════════════════════════════════════════
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true
        // Entity-specific data snapshot at time of request
    },

    // ═══════════════════════════════════════════════════════════════
    // HISTORY & AUDIT
    // ═══════════════════════════════════════════════════════════════
    history: {
        type: [historyEntrySchema],
        default: []
    },

    // ═══════════════════════════════════════════════════════════════
    // REMINDERS & NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════
    remindersSent: {
        type: [reminderSchema],
        default: []
    },

    // ═══════════════════════════════════════════════════════════════
    // AUTO-APPROVAL
    // ═══════════════════════════════════════════════════════════════
    autoApproved: {
        type: Boolean,
        default: false
    },
    autoApprovalReason: {
        type: String,
        maxlength: 500
    },
    autoApprovalAt: {
        type: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    completedAt: {
        type: Date
    },
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: {
        transform: (doc, ret) => {
            delete ret.__v;
            return ret;
        }
    }
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
approvalRequestSchema.index({ firmId: 1, status: 1, createdAt: -1 });
approvalRequestSchema.index({ firmId: 1, requesterId: 1, status: 1 });
approvalRequestSchema.index({ firmId: 1, entityType: 1, entityId: 1 });
approvalRequestSchema.index({ firmId: 1, 'approvalChain.approverId': 1, status: 1 });
approvalRequestSchema.index({ status: 1, dueDate: 1 }); // For overdue monitoring
approvalRequestSchema.index({ status: 1, autoApprovalAt: 1 }); // For auto-approval job

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════
approvalRequestSchema.virtual('isOverdue').get(function() {
    if (!this.dueDate || this.status !== 'pending') {
        return false;
    }
    return new Date() > this.dueDate;
});

approvalRequestSchema.virtual('currentApprover').get(function() {
    if (this.approvalChain && this.currentLevel > 0) {
        return this.approvalChain.find(a => a.order === this.currentLevel);
    }
    return null;
});

approvalRequestSchema.set('toJSON', { virtuals: true });
approvalRequestSchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Generate next request number
 */
approvalRequestSchema.statics.generateRequestNumber = async function(firmId) {
    const year = new Date().getFullYear();
    const prefix = `APR-${year}-`;

    // Find the latest request number for this year
    const latestRequest = await this.findOne({
        firmId,
        requestNumber: { $regex: `^${prefix}` }
    })
    .sort({ requestNumber: -1 })
    .select('requestNumber')
    .lean();

    let nextNumber = 1;
    if (latestRequest) {
        const currentNumber = parseInt(latestRequest.requestNumber.split('-')[2], 10);
        nextNumber = currentNumber + 1;
    }

    return `${prefix}${String(nextNumber).padStart(5, '0')}`;
};

/**
 * Get pending approvals for a user (as approver)
 */
approvalRequestSchema.statics.getPendingForApprover = async function(firmId, approverId, options = {}) {
    const { limit = 50, skip = 0 } = options;

    return this.find({
        firmId,
        status: 'pending',
        'approvalChain': {
            $elemMatch: {
                approverId: new mongoose.Types.ObjectId(approverId),
                status: 'pending'
            }
        }
    })
    .sort({ priority: -1, dueDate: 1, createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('requesterId', 'firstName lastName email avatar')
    .populate('approvalChain.approverId', 'firstName lastName email')
    .lean();
};

/**
 * Get requests submitted by user
 */
approvalRequestSchema.statics.getMyRequests = async function(firmId, requesterId, options = {}) {
    const { limit = 50, skip = 0, status } = options;

    const query = { firmId, requesterId };
    if (status) query.status = status;

    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('completedBy', 'firstName lastName email')
        .lean();
};

/**
 * Get approval history for entity
 */
approvalRequestSchema.statics.getHistoryForEntity = async function(firmId, entityType, entityId, options = {}) {
    const { limit = 50, skip = 0 } = options;

    return this.find({
        firmId,
        entityType,
        entityId
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('requesterId', 'firstName lastName email')
    .populate('completedBy', 'firstName lastName email')
    .lean();
};

/**
 * Get overdue approvals
 */
approvalRequestSchema.statics.getOverdue = async function(firmId, overdueHours = 24) {
    const overdueDate = new Date(Date.now() - (overdueHours * 60 * 60 * 1000));

    return this.find({
        firmId,
        status: 'pending',
        $or: [
            { dueDate: { $lt: new Date(), $exists: true } },
            { createdAt: { $lt: overdueDate } }
        ]
    })
    .sort({ dueDate: 1, createdAt: 1 })
    .populate('requesterId', 'firstName lastName email')
    .populate('approvalChain.approverId', 'firstName lastName email')
    .lean();
};

/**
 * Get approval statistics
 */
approvalRequestSchema.statics.getStats = async function(firmId, dateRange = {}) {
    const { startDate, endDate } = dateRange;
    const matchQuery = { firmId };

    if (startDate || endDate) {
        matchQuery.createdAt = {};
        if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
        if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    const stats = await this.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    const result = {
        pending: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0,
        info_requested: 0,
        total: 0
    };

    stats.forEach(s => {
        result[s._id] = s.count;
        result.total += s.count;
    });

    // Calculate average approval time for completed requests
    const completedRequests = await this.find({
        ...matchQuery,
        status: { $in: ['approved', 'rejected'] },
        completedAt: { $exists: true }
    }).select('createdAt completedAt').lean();

    if (completedRequests.length > 0) {
        const totalTime = completedRequests.reduce((sum, req) => {
            const duration = req.completedAt - req.createdAt;
            return sum + duration;
        }, 0);
        result.avgApprovalTimeHours = Math.round(totalTime / completedRequests.length / (1000 * 60 * 60));
    } else {
        result.avgApprovalTimeHours = 0;
    }

    return result;
};

module.exports = mongoose.model('ApprovalRequest', approvalRequestSchema);
