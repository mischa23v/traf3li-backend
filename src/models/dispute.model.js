const mongoose = require('mongoose');

const DISPUTE_TYPES = [
    'service_quality',
    'payment',
    'communication',
    'scope',
    'other'
];

const DISPUTE_STATUSES = [
    'open',
    'under_review',
    'mediation',
    'resolved',
    'escalated',
    'closed'
];

const DISPUTE_PRIORITIES = [
    'low',
    'medium',
    'high',
    'urgent'
];

const RESOLUTION_OUTCOMES = [
    'client_favor',
    'lawyer_favor',
    'partial_refund',
    'full_refund',
    'no_action'
];

const disputeSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
    },

    // ═══════════════════════════════════════════════════════════════
    // BASIC INFO
    // ═══════════════════════════════════════════════════════════════
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        index: true
    },
    paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
        index: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // DISPUTE DETAILS
    // ═══════════════════════════════════════════════════════════════
    type: {
        type: String,
        enum: DISPUTE_TYPES,
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: DISPUTE_STATUSES,
        default: 'open',
        required: true,
        index: true
    },
    priority: {
        type: String,
        enum: DISPUTE_PRIORITIES,
        default: 'medium',
        required: true,
        index: true
    },
    description: {
        type: String,
        required: true,
        maxlength: 5000
    },

    // ═══════════════════════════════════════════════════════════════
    // CLIENT EVIDENCE
    // ═══════════════════════════════════════════════════════════════
    clientEvidence: [{
        type: {
            type: String,
            enum: ['document', 'image', 'video', 'audio', 'other'],
            default: 'document'
        },
        url: {
            type: String,
            required: true
        },
        filename: String,
        fileKey: String,
        description: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // ═══════════════════════════════════════════════════════════════
    // LAWYER RESPONSE
    // ═══════════════════════════════════════════════════════════════
    lawyerResponse: {
        type: String,
        maxlength: 5000
    },
    lawyerResponseDate: Date,
    lawyerEvidence: [{
        type: {
            type: String,
            enum: ['document', 'image', 'video', 'audio', 'other'],
            default: 'document'
        },
        url: {
            type: String,
            required: true
        },
        filename: String,
        fileKey: String,
        description: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // ═══════════════════════════════════════════════════════════════
    // MEDIATOR/ADMIN
    // ═══════════════════════════════════════════════════════════════
    mediatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    mediatorNotes: [{
        note: {
            type: String,
            required: true,
            maxlength: 2000
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],

    // ═══════════════════════════════════════════════════════════════
    // RESOLUTION
    // ═══════════════════════════════════════════════════════════════
    resolution: {
        outcome: {
            type: String,
            enum: RESOLUTION_OUTCOMES
        },
        refundAmount: {
            type: Number,
            min: 0
        },
        description: {
            type: String,
            maxlength: 2000
        },
        resolvedAt: Date,
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // TIMELINE
    // ═══════════════════════════════════════════════════════════════
    timeline: [{
        action: {
            type: String,
            required: true
        },
        by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        at: {
            type: Date,
            default: Date.now
        },
        notes: {
            type: String,
            maxlength: 1000
        }
    }],

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    closedAt: Date,
    closedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    escalatedAt: Date,
    escalatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    escalationReason: {
        type: String,
        maxlength: 1000
    }
}, {
    versionKey: false,
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
disputeSchema.index({ firmId: 1, status: 1, createdAt: -1 });
disputeSchema.index({ firmId: 1, type: 1 });
disputeSchema.index({ firmId: 1, priority: 1 });
disputeSchema.index({ clientId: 1, status: 1 });
disputeSchema.index({ lawyerId: 1, status: 1 });
disputeSchema.index({ mediatorId: 1, status: 1 });
disputeSchema.index({ caseId: 1 });
disputeSchema.index({ paymentId: 1 });

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE HOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * Add timeline entry on status change
 */
disputeSchema.pre('save', function(next) {
    if (this.isModified('status') && !this.isNew) {
        // Add timeline entry for status change
        if (!this.timeline) {
            this.timeline = [];
        }

        // Find who modified it (from the current context if available)
        const modifiedBy = this._modifiedBy || this.clientId;

        this.timeline.push({
            action: `Status changed to: ${this.status}`,
            by: modifiedBy,
            at: new Date(),
            notes: this._statusChangeNotes || ''
        });

        // Clean up temporary fields
        delete this._modifiedBy;
        delete this._statusChangeNotes;
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get dispute statistics
 */
disputeSchema.statics.getDisputeStats = async function(filters = {}) {
    const matchStage = {};

    if (filters.firmId) matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);
    if (filters.lawyerId) matchStage.lawyerId = new mongoose.Types.ObjectId(filters.lawyerId);
    if (filters.clientId) matchStage.clientId = new mongoose.Types.ObjectId(filters.clientId);
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
                totalDisputes: { $sum: 1 },
                openDisputes: {
                    $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] }
                },
                underReviewDisputes: {
                    $sum: { $cond: [{ $eq: ['$status', 'under_review'] }, 1, 0] }
                },
                resolvedDisputes: {
                    $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
                },
                closedDisputes: {
                    $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] }
                },
                escalatedDisputes: {
                    $sum: { $cond: [{ $eq: ['$status', 'escalated'] }, 1, 0] }
                },
                highPriorityDisputes: {
                    $sum: { $cond: [{ $in: ['$priority', ['high', 'urgent']] }, 1, 0] }
                }
            }
        }
    ]);

    return stats[0] || {
        totalDisputes: 0,
        openDisputes: 0,
        underReviewDisputes: 0,
        resolvedDisputes: 0,
        closedDisputes: 0,
        escalatedDisputes: 0,
        highPriorityDisputes: 0
    };
};

/**
 * Get disputes by type
 */
disputeSchema.statics.getDisputesByType = async function(filters = {}) {
    const matchStage = {};

    if (filters.firmId) matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);
    if (filters.startDate || filters.endDate) {
        matchStage.createdAt = {};
        if (filters.startDate) matchStage.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) matchStage.createdAt.$lte = new Date(filters.endDate);
    }

    return await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } }
    ]);
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Add timeline entry
 * @param {String} action - Action description
 * @param {ObjectId} userId - User performing the action
 * @param {String} notes - Optional notes
 */
disputeSchema.methods.addTimelineEntry = function(action, userId, notes = '') {
    if (!this.timeline) {
        this.timeline = [];
    }

    this.timeline.push({
        action,
        by: userId,
        at: new Date(),
        notes
    });

    return this;
};

/**
 * Escalate dispute
 * @param {ObjectId} userId - User escalating the dispute
 * @param {String} reason - Escalation reason
 */
disputeSchema.methods.escalate = async function(userId, reason) {
    if (this.status === 'escalated') {
        throw new Error('Dispute already escalated');
    }

    if (this.status === 'resolved' || this.status === 'closed') {
        throw new Error('Cannot escalate a resolved or closed dispute');
    }

    this._modifiedBy = userId;
    this._statusChangeNotes = reason;

    this.status = 'escalated';
    this.escalatedAt = new Date();
    this.escalatedBy = userId;
    this.escalationReason = reason;

    this.addTimelineEntry('Dispute escalated', userId, reason);

    await this.save();

    return this;
};

/**
 * Resolve dispute
 * @param {Object} resolutionData - Resolution details
 * @param {ObjectId} userId - User resolving the dispute
 */
disputeSchema.methods.resolve = async function(resolutionData, userId) {
    if (this.status === 'resolved' || this.status === 'closed') {
        throw new Error('Dispute already resolved/closed');
    }

    this._modifiedBy = userId;
    this._statusChangeNotes = `Resolved with outcome: ${resolutionData.outcome}`;

    this.status = 'resolved';
    this.resolution = {
        outcome: resolutionData.outcome,
        refundAmount: resolutionData.refundAmount || 0,
        description: resolutionData.description,
        resolvedAt: new Date(),
        resolvedBy: userId
    };

    this.addTimelineEntry(
        `Dispute resolved - ${resolutionData.outcome}`,
        userId,
        resolutionData.description
    );

    await this.save();

    return this;
};

/**
 * Close dispute
 * @param {ObjectId} userId - User closing the dispute
 */
disputeSchema.methods.close = async function(userId) {
    if (this.status === 'closed') {
        throw new Error('Dispute already closed');
    }

    this._modifiedBy = userId;
    this._statusChangeNotes = 'Dispute closed';

    this.status = 'closed';
    this.closedAt = new Date();
    this.closedBy = userId;

    this.addTimelineEntry('Dispute closed', userId);

    await this.save();

    return this;
};

// Export constants for use in controllers
disputeSchema.statics.DISPUTE_TYPES = DISPUTE_TYPES;
disputeSchema.statics.DISPUTE_STATUSES = DISPUTE_STATUSES;
disputeSchema.statics.DISPUTE_PRIORITIES = DISPUTE_PRIORITIES;
disputeSchema.statics.RESOLUTION_OUTCOMES = RESOLUTION_OUTCOMES;

module.exports = mongoose.model('Dispute', disputeSchema);
