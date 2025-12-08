/**
 * Approval Request Model - Tracks Individual Approval Requests
 *
 * Each pending approval action creates a request that needs to be approved/rejected.
 */

const mongoose = require('mongoose');

// Approval decision sub-schema
const approvalDecisionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    decision: {
        type: String,
        enum: ['approved', 'rejected'],
        required: true
    },
    comment: {
        type: String,
        maxlength: 500
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

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

    // ═══════════════════════════════════════════════════════════════
    // REQUEST DETAILS
    // ═══════════════════════════════════════════════════════════════
    // Reference to the approval rule that triggered this
    ruleId: {
        type: mongoose.Schema.Types.ObjectId
    },

    // What module and action
    module: {
        type: String,
        required: true,
        index: true
    },
    action: {
        type: String,
        required: true,
        index: true
    },

    // Target of the action
    targetType: {
        type: String,
        required: true
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },
    targetName: {
        type: String
    },

    // ═══════════════════════════════════════════════════════════════
    // REQUESTER
    // ═══════════════════════════════════════════════════════════════
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    requestedAt: {
        type: Date,
        default: Date.now,
        required: true
    },
    requestComment: {
        type: String,
        maxlength: 500
    },

    // ═══════════════════════════════════════════════════════════════
    // PAYLOAD (The data/changes being requested)
    // ═══════════════════════════════════════════════════════════════
    payload: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },

    // ═══════════════════════════════════════════════════════════════
    // APPROVAL REQUIREMENTS
    // ═══════════════════════════════════════════════════════════════
    requiredApprovers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    requiredRoles: [{
        type: String
    }],
    minApprovals: {
        type: Number,
        default: 1
    },
    autoApproveAt: {
        type: Date  // When auto-approval will trigger (if enabled)
    },

    // ═══════════════════════════════════════════════════════════════
    // DECISIONS
    // ═══════════════════════════════════════════════════════════════
    decisions: [approvalDecisionSchema],

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled', 'expired', 'auto_approved'],
        default: 'pending',
        index: true
    },
    finalizedAt: {
        type: Date
    },
    finalizedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // ═══════════════════════════════════════════════════════════════
    // NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════
    remindersSent: {
        type: Number,
        default: 0
    },
    lastReminderAt: {
        type: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // ESCALATION
    // ═══════════════════════════════════════════════════════════════
    escalated: {
        type: Boolean,
        default: false
    },
    escalatedAt: {
        type: Date
    },
    escalatedTo: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // ═══════════════════════════════════════════════════════════════
    // EXECUTION (After approval)
    // ═══════════════════════════════════════════════════════════════
    executed: {
        type: Boolean,
        default: false
    },
    executedAt: {
        type: Date
    },
    executionResult: {
        success: Boolean,
        error: String
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
approvalRequestSchema.index({ firmId: 1, status: 1, createdAt: -1 });
approvalRequestSchema.index({ firmId: 1, requestedBy: 1, status: 1 });
approvalRequestSchema.index({ firmId: 1, 'requiredApprovers': 1, status: 1 });
approvalRequestSchema.index({ status: 1, autoApproveAt: 1 }); // For auto-approval job
approvalRequestSchema.index({ status: 1, createdAt: 1 }); // For expiry job

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════
approvalRequestSchema.virtual('approvalCount').get(function() {
    return this.decisions.filter(d => d.decision === 'approved').length;
});

approvalRequestSchema.virtual('rejectionCount').get(function() {
    return this.decisions.filter(d => d.decision === 'rejected').length;
});

approvalRequestSchema.virtual('isFullyApproved').get(function() {
    return this.approvalCount >= this.minApprovals;
});

approvalRequestSchema.set('toJSON', { virtuals: true });
approvalRequestSchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new approval request
 */
approvalRequestSchema.statics.createRequest = async function(data) {
    const request = new this(data);
    await request.save();
    return request;
};

/**
 * Get pending approvals for a user (as an approver)
 */
approvalRequestSchema.statics.getPendingForApprover = async function(firmId, userId, userRole, options = {}) {
    const { limit = 50, skip = 0 } = options;

    const query = {
        firmId,
        status: 'pending',
        $or: [
            { requiredApprovers: userId },
            { requiredRoles: userRole },
            { requiredApprovers: { $size: 0 }, requiredRoles: { $size: 0 } } // No specific approvers = anyone with permission
        ],
        // Exclude already decided by this user
        'decisions.userId': { $ne: userId }
    };

    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('requestedBy', 'firstName lastName email avatar')
        .lean();
};

/**
 * Get pending approvals requested by a user
 */
approvalRequestSchema.statics.getMyRequests = async function(firmId, userId, options = {}) {
    const { limit = 50, skip = 0, status } = options;

    const query = { firmId, requestedBy: userId };
    if (status) query.status = status;

    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('finalizedBy', 'firstName lastName email')
        .lean();
};

/**
 * Approve a request
 */
approvalRequestSchema.statics.approve = async function(requestId, userId, comment = '') {
    const request = await this.findById(requestId);

    if (!request) {
        throw new Error('Approval request not found');
    }

    if (request.status !== 'pending') {
        throw new Error('Request is no longer pending');
    }

    // Check if user already decided
    const existingDecision = request.decisions.find(
        d => d.userId.toString() === userId.toString()
    );
    if (existingDecision) {
        throw new Error('You have already made a decision on this request');
    }

    // Add approval decision
    request.decisions.push({
        userId,
        decision: 'approved',
        comment,
        timestamp: new Date()
    });

    // Check if fully approved
    const approvalCount = request.decisions.filter(d => d.decision === 'approved').length;
    if (approvalCount >= request.minApprovals) {
        request.status = 'approved';
        request.finalizedAt = new Date();
        request.finalizedBy = userId;
    }

    await request.save();
    return request;
};

/**
 * Reject a request
 */
approvalRequestSchema.statics.reject = async function(requestId, userId, reason = '') {
    const request = await this.findById(requestId);

    if (!request) {
        throw new Error('Approval request not found');
    }

    if (request.status !== 'pending') {
        throw new Error('Request is no longer pending');
    }

    // Add rejection decision
    request.decisions.push({
        userId,
        decision: 'rejected',
        comment: reason,
        timestamp: new Date()
    });

    // Any rejection = rejected (can be configured per firm)
    request.status = 'rejected';
    request.finalizedAt = new Date();
    request.finalizedBy = userId;

    await request.save();
    return request;
};

/**
 * Cancel a request (by requester)
 */
approvalRequestSchema.statics.cancel = async function(requestId, userId) {
    const request = await this.findById(requestId);

    if (!request) {
        throw new Error('Approval request not found');
    }

    if (request.status !== 'pending') {
        throw new Error('Request is no longer pending');
    }

    if (request.requestedBy.toString() !== userId.toString()) {
        throw new Error('Only the requester can cancel this request');
    }

    request.status = 'cancelled';
    request.finalizedAt = new Date();
    request.finalizedBy = userId;

    await request.save();
    return request;
};

/**
 * Get statistics for a firm
 */
approvalRequestSchema.statics.getStats = async function(firmId) {
    const stats = await this.aggregate([
        { $match: { firmId: new mongoose.Types.ObjectId(firmId) } },
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
        expired: 0,
        auto_approved: 0
    };

    stats.forEach(s => {
        result[s._id] = s.count;
    });

    return result;
};

/**
 * Process auto-approvals (called by scheduler)
 */
approvalRequestSchema.statics.processAutoApprovals = async function() {
    const now = new Date();

    const requests = await this.find({
        status: 'pending',
        autoApproveAt: { $lte: now }
    });

    const results = [];
    for (const request of requests) {
        request.status = 'auto_approved';
        request.finalizedAt = now;
        await request.save();
        results.push(request._id);
    }

    return results;
};

module.exports = mongoose.model('ApprovalRequest', approvalRequestSchema);
