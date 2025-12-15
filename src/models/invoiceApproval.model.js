const mongoose = require('mongoose');

/**
 * Invoice Approval Workflow Model
 *
 * Manages multi-level approval workflows for invoices.
 * Supports amount-based approval thresholds and escalation.
 */

// Approver sub-schema
const approverSchema = new mongoose.Schema({
    level: {
        type: Number,
        required: true,
        min: 1
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    role: {
        type: String,
        enum: ['manager', 'director', 'partner', 'cfo', 'admin'],
        default: 'manager'
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'skipped'],
        default: 'pending'
    },
    actionAt: Date,
    comments: {
        type: String,
        trim: true,
        maxlength: 500
    }
}, { _id: true });

const invoiceApprovalSchema = new mongoose.Schema({
    // Multi-tenancy
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },

    // Related invoice
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        required: true,
        index: true
    },

    // Invoice amount (for determining approval levels)
    invoiceAmount: {
        type: Number,
        required: true
    },

    // Workflow configuration
    currentLevel: {
        type: Number,
        default: 1,
        min: 1
    },
    maxLevel: {
        type: Number,
        default: 1,
        min: 1
    },

    // Overall status
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'approved', 'rejected', 'escalated', 'cancelled'],
        default: 'pending',
        index: true
    },

    // Approvers chain
    approvers: [approverSchema],

    // Escalation tracking
    escalatedAt: Date,
    escalatedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    escalationReason: {
        type: String,
        trim: true,
        maxlength: 500
    },
    autoEscalateAfterHours: {
        type: Number,
        default: 48 // Auto-escalate after 48 hours
    },

    // Due date for approval (optional deadline)
    dueDate: Date,

    // Timestamps
    submittedAt: {
        type: Date,
        default: Date.now
    },
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    completedAt: Date,

    // Notes
    submissionNotes: {
        type: String,
        trim: true,
        maxlength: 1000
    },

    // Audit
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
invoiceApprovalSchema.index({ firmId: 1, status: 1 });
invoiceApprovalSchema.index({ firmId: 1, invoiceId: 1 });
invoiceApprovalSchema.index({ 'approvers.userId': 1, 'approvers.status': 1 });
invoiceApprovalSchema.index({ submittedAt: 1 });

// Virtual: Current approver
invoiceApprovalSchema.virtual('currentApprover').get(function() {
    return this.approvers.find(a => a.level === this.currentLevel && a.status === 'pending');
});

// Virtual: Is overdue
invoiceApprovalSchema.virtual('isOverdue').get(function() {
    if (!this.dueDate || this.status !== 'pending') return false;
    return new Date() > this.dueDate;
});

// Virtual: Hours pending
invoiceApprovalSchema.virtual('hoursPending').get(function() {
    if (this.completedAt) return 0;
    const diff = Date.now() - this.submittedAt.getTime();
    return Math.floor(diff / (1000 * 60 * 60));
});

/**
 * Static: Get approval levels based on amount
 */
invoiceApprovalSchema.statics.getApprovalLevels = function(amount) {
    // Amount thresholds (in halalas)
    // < 10,000 SAR = 1 level (manager)
    // 10,000 - 50,000 SAR = 2 levels (manager + director)
    // > 50,000 SAR = 3 levels (manager + director + partner/CFO)

    const amountInSAR = amount / 100; // Convert halalas to SAR

    if (amountInSAR >= 50000) return 3;
    if (amountInSAR >= 10000) return 2;
    return 1;
};

/**
 * Static: Create approval workflow for invoice
 */
invoiceApprovalSchema.statics.createForInvoice = async function(invoiceId, submittedBy, approverIds = []) {
    const Invoice = mongoose.model('Invoice');
    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
        throw new Error('Invoice not found');
    }

    // Check if approval already exists
    const existing = await this.findOne({
        invoiceId,
        status: { $in: ['pending', 'in_progress'] }
    });

    if (existing) {
        throw new Error('Approval workflow already exists for this invoice');
    }

    const maxLevel = this.getApprovalLevels(invoice.totalAmount);

    // Build approvers chain
    const approvers = [];
    for (let level = 1; level <= maxLevel; level++) {
        const approverId = approverIds[level - 1];
        if (approverId) {
            approvers.push({
                level,
                userId: approverId,
                role: level === 1 ? 'manager' : level === 2 ? 'director' : 'partner',
                status: 'pending'
            });
        }
    }

    if (approvers.length === 0) {
        throw new Error('At least one approver is required');
    }

    const approval = new this({
        firmId: invoice.firmId,
        invoiceId: invoice._id,
        invoiceAmount: invoice.totalAmount,
        maxLevel: approvers.length,
        currentLevel: 1,
        status: 'pending',
        approvers,
        submittedBy,
        submittedAt: new Date(),
        createdBy: submittedBy
    });

    await approval.save();

    // Update invoice status
    invoice.approvalRequired = true;
    invoice.approvalStatus = 'pending';
    invoice.approvalId = approval._id;
    await invoice.save();

    return approval;
};

/**
 * Instance: Approve at current level
 */
invoiceApprovalSchema.methods.approve = async function(userId, comments = '') {
    // Find the approver at current level
    const approver = this.approvers.find(
        a => a.level === this.currentLevel && a.userId.equals(userId) && a.status === 'pending'
    );

    if (!approver) {
        throw new Error('You are not authorized to approve at this level');
    }

    // Update approver status
    approver.status = 'approved';
    approver.actionAt = new Date();
    approver.comments = comments;

    // Check if more levels needed
    if (this.currentLevel < this.maxLevel) {
        this.currentLevel += 1;
        this.status = 'in_progress';
    } else {
        // Fully approved
        this.status = 'approved';
        this.completedAt = new Date();

        // Update invoice
        const Invoice = mongoose.model('Invoice');
        await Invoice.findByIdAndUpdate(this.invoiceId, {
            approvalStatus: 'approved',
            'approval.approvedAt': new Date(),
            'approval.approvedBy': userId
        });
    }

    await this.save();
    return this;
};

/**
 * Instance: Reject at current level
 */
invoiceApprovalSchema.methods.reject = async function(userId, reason) {
    if (!reason) {
        throw new Error('Rejection reason is required');
    }

    // Find the approver at current level
    const approver = this.approvers.find(
        a => a.level === this.currentLevel && a.userId.equals(userId) && a.status === 'pending'
    );

    if (!approver) {
        throw new Error('You are not authorized to reject at this level');
    }

    // Update approver status
    approver.status = 'rejected';
    approver.actionAt = new Date();
    approver.comments = reason;

    // Mark overall as rejected
    this.status = 'rejected';
    this.completedAt = new Date();

    await this.save();

    // Update invoice
    const Invoice = mongoose.model('Invoice');
    await Invoice.findByIdAndUpdate(this.invoiceId, {
        approvalStatus: 'rejected'
    });

    return this;
};

/**
 * Instance: Escalate to higher authority
 */
invoiceApprovalSchema.methods.escalate = async function(escalateToUserId, reason, escalatedBy) {
    if (this.status === 'approved' || this.status === 'rejected') {
        throw new Error('Cannot escalate completed approval');
    }

    // Skip remaining pending approvers at current level
    this.approvers.forEach(a => {
        if (a.level === this.currentLevel && a.status === 'pending') {
            a.status = 'skipped';
            a.comments = 'Escalated';
        }
    });

    // Add new approver
    this.approvers.push({
        level: this.maxLevel + 1,
        userId: escalateToUserId,
        role: 'admin',
        status: 'pending'
    });

    this.maxLevel += 1;
    this.currentLevel = this.maxLevel;
    this.status = 'escalated';
    this.escalatedAt = new Date();
    this.escalatedTo = escalateToUserId;
    this.escalationReason = reason;
    this.updatedBy = escalatedBy;

    await this.save();
    return this;
};

/**
 * Instance: Cancel the approval workflow
 */
invoiceApprovalSchema.methods.cancel = async function(userId, reason) {
    if (this.status === 'approved' || this.status === 'rejected') {
        throw new Error('Cannot cancel completed approval');
    }

    this.status = 'cancelled';
    this.completedAt = new Date();
    this.updatedBy = userId;

    // Mark all pending approvers as skipped
    this.approvers.forEach(a => {
        if (a.status === 'pending') {
            a.status = 'skipped';
            a.comments = reason || 'Approval cancelled';
        }
    });

    await this.save();

    // Update invoice
    const Invoice = mongoose.model('Invoice');
    await Invoice.findByIdAndUpdate(this.invoiceId, {
        approvalRequired: false,
        approvalStatus: 'none'
    });

    return this;
};

/**
 * Static: Get pending approvals for a user
 */
invoiceApprovalSchema.statics.getPendingForUser = async function(firmId, userId) {
    return await this.find({
        firmId: new mongoose.Types.ObjectId(firmId),
        status: { $in: ['pending', 'in_progress', 'escalated'] },
        approvers: {
            $elemMatch: {
                userId: new mongoose.Types.ObjectId(userId),
                status: 'pending'
            }
        }
    })
    .populate('invoiceId', 'invoiceNumber totalAmount clientId dueDate')
    .populate('submittedBy', 'name email')
    .sort({ submittedAt: -1 });
};

/**
 * Static: Get approvals needing escalation
 */
invoiceApprovalSchema.statics.getNeedingEscalation = async function(firmId) {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 48); // Default 48 hours

    return await this.find({
        firmId: new mongoose.Types.ObjectId(firmId),
        status: { $in: ['pending', 'in_progress'] },
        submittedAt: { $lt: cutoffTime }
    })
    .populate('invoiceId', 'invoiceNumber totalAmount')
    .populate('approvers.userId', 'name email');
};

/**
 * Static: Get approval statistics
 */
invoiceApprovalSchema.statics.getStats = async function(firmId, startDate, endDate) {
    const matchStage = {
        firmId: new mongoose.Types.ObjectId(firmId)
    };

    if (startDate || endDate) {
        matchStage.submittedAt = {};
        if (startDate) matchStage.submittedAt.$gte = new Date(startDate);
        if (endDate) matchStage.submittedAt.$lte = new Date(endDate);
    }

    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$invoiceAmount' }
            }
        }
    ]);

    // Calculate average approval time
    const completedApprovals = await this.aggregate([
        {
            $match: {
                ...matchStage,
                status: 'approved',
                completedAt: { $exists: true }
            }
        },
        {
            $project: {
                approvalTime: {
                    $divide: [
                        { $subtract: ['$completedAt', '$submittedAt'] },
                        1000 * 60 * 60 // Convert to hours
                    ]
                }
            }
        },
        {
            $group: {
                _id: null,
                avgApprovalTime: { $avg: '$approvalTime' }
            }
        }
    ]);

    return {
        byStatus: stats.reduce((acc, s) => {
            acc[s._id] = { count: s.count, totalAmount: s.totalAmount };
            return acc;
        }, {}),
        avgApprovalTimeHours: completedApprovals[0]?.avgApprovalTime || 0
    };
};

module.exports = mongoose.model('InvoiceApproval', invoiceApprovalSchema);
