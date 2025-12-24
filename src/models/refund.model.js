const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// REFUND ENUMS
// ═══════════════════════════════════════════════════════════════
const REFUND_STATUSES = [
    'pending',       // Awaiting approval
    'approved',      // Approved, awaiting processing
    'processing',    // Being processed
    'completed',     // Successfully refunded
    'failed',        // Failed to process
    'rejected',      // Rejected by admin
    'cancelled'      // Cancelled by requester
];

const REFUND_REASONS = [
    'duplicate',
    'overpayment',
    'service_cancelled',
    'service_not_started',
    'client_request',
    'poor_service',
    'error',
    'policy_based',
    'other'
];

const REFUND_TYPES = [
    'full',          // 100% refund
    'partial',       // Partial refund based on policy
    'custom'         // Custom amount
];

const REFUND_METHODS = [
    'original',      // Refund to original payment method
    'bank_transfer',
    'cash',
    'credit_note'
];

// ═══════════════════════════════════════════════════════════════
// REFUND SCHEMA
// ═══════════════════════════════════════════════════════════════
const refundSchema = new mongoose.Schema({
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
    refundNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    refundDate: {
        type: Date,
        default: Date.now,
        index: true
    },
    status: {
        type: String,
        enum: REFUND_STATUSES,
        default: 'pending',
        index: true
    },
    refundType: {
        type: String,
        enum: REFUND_TYPES,
        default: 'partial'
    },

    // ═══════════════════════════════════════════════════════════════
    // PAYMENT REFERENCE
    // ═══════════════════════════════════════════════════════════════
    paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
        required: true,
        index: true
    },
    originalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'SAR'
    },

    // ═══════════════════════════════════════════════════════════════
    // REFUND DETAILS
    // ═══════════════════════════════════════════════════════════════
    requestedAmount: {
        type: Number,
        required: true,
        min: 0
    },
    approvedAmount: {
        type: Number,
        min: 0
    },
    processedAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    refundMethod: {
        type: String,
        enum: REFUND_METHODS,
        default: 'original'
    },

    // ═══════════════════════════════════════════════════════════════
    // REASON & POLICY
    // ═══════════════════════════════════════════════════════════════
    reason: {
        type: String,
        enum: REFUND_REASONS,
        required: true
    },
    reasonDetails: {
        type: String,
        maxlength: 1000
    },

    // Policy applied
    policyApplied: {
        policyName: String,                    // e.g., 'FULL_REFUND', 'PARTIAL_75'
        refundPercent: Number,                 // Percentage of refund
        conditions: mongoose.Schema.Types.Mixed, // Conditions that matched
        calculatedAt: {
            type: Date,
            default: Date.now
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // SERVICE TRACKING (for policy calculation)
    // ═══════════════════════════════════════════════════════════════
    serviceTracking: {
        caseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Case'
        },
        invoiceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Invoice'
        },
        serviceStarted: {
            type: Boolean,
            default: false
        },
        serviceStartDate: Date,
        serviceCompletionPercent: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        purchaseDate: {
            type: Date,
            required: true
        },
        timeSincePurchase: Number  // milliseconds
    },

    // ═══════════════════════════════════════════════════════════════
    // PARTIES
    // ═══════════════════════════════════════════════════════════════
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // APPROVAL WORKFLOW
    // ═══════════════════════════════════════════════════════════════
    requiresApproval: {
        type: Boolean,
        default: true
    },
    approvalHistory: [{
        approverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        action: {
            type: String,
            enum: ['approved', 'rejected', 'requested_changes']
        },
        amount: Number,
        notes: String,
        date: {
            type: Date,
            default: Date.now
        }
    }],
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedAt: Date,
    rejectionReason: String,

    // ═══════════════════════════════════════════════════════════════
    // PROCESSING DETAILS
    // ═══════════════════════════════════════════════════════════════
    processingDetails: {
        processedAt: Date,
        processedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        gatewayProvider: {
            type: String,
            enum: ['stripe', 'paypal', 'hyperpay', 'moyasar', 'tap', 'bank', 'cash', 'other']
        },
        gatewayRefundId: String,      // Stripe refund ID, etc.
        gatewayResponse: mongoose.Schema.Types.Mixed,
        completedAt: Date,

        // Bank transfer details
        bankTransfer: {
            accountName: String,
            accountNumber: String,
            iban: String,
            bankName: String,
            transferDate: Date,
            transferReference: String
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // FAILURE TRACKING
    // ═══════════════════════════════════════════════════════════════
    failureDetails: {
        failureReason: String,
        failureDate: Date,
        retryCount: {
            type: Number,
            default: 0
        },
        lastRetryAt: Date,
        canRetry: {
            type: Boolean,
            default: true
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // ACCOUNTING
    // ═══════════════════════════════════════════════════════════════
    glEntryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GeneralLedger'
    },
    creditNoteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CreditNote'
    },

    // ═══════════════════════════════════════════════════════════════
    // NOTES & ATTACHMENTS
    // ═══════════════════════════════════════════════════════════════
    internalNotes: {
        type: String,
        maxlength: 2000
    },
    customerNotes: {
        type: String,
        maxlength: 1000
    },
    attachments: [{
        filename: String,
        url: String,
        size: Number,
        mimeType: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // ═══════════════════════════════════════════════════════════════
    // AUDIT
    // ═══════════════════════════════════════════════════════════════
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
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
refundSchema.index({ refundNumber: 1 });
refundSchema.index({ firmId: 1, refundDate: -1 });
refundSchema.index({ paymentId: 1 });
refundSchema.index({ customerId: 1, status: 1 });
refundSchema.index({ status: 1, createdAt: -1 });
refundSchema.index({ firmId: 1, status: 1, createdAt: -1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════
refundSchema.pre('save', async function(next) {
    // Auto-generate refund number
    if (this.isNew && !this.refundNumber) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const count = await this.constructor.countDocuments({
            refundNumber: new RegExp(`^RFD-${year}${month}`)
        });
        this.refundNumber = `RFD-${year}${month}-${String(count + 1).padStart(4, '0')}`;
    }

    // Calculate timeSincePurchase if not set
    if (this.serviceTracking && this.serviceTracking.purchaseDate && !this.serviceTracking.timeSincePurchase) {
        this.serviceTracking.timeSincePurchase = Date.now() - new Date(this.serviceTracking.purchaseDate).getTime();
    }

    // Default approved amount to requested amount if approved
    if (this.status === 'approved' && !this.approvedAmount) {
        this.approvedAmount = this.requestedAmount;
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get refund statistics
 */
refundSchema.statics.getRefundStats = async function(filters = {}) {
    const matchStage = {};

    if (filters.firmId) matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);
    if (filters.customerId) matchStage.customerId = new mongoose.Types.ObjectId(filters.customerId);
    if (filters.startDate || filters.endDate) {
        matchStage.refundDate = {};
        if (filters.startDate) matchStage.refundDate.$gte = new Date(filters.startDate);
        if (filters.endDate) matchStage.refundDate.$lte = new Date(filters.endDate);
    }

    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalRefunds: { $sum: 1 },
                totalRequested: { $sum: '$requestedAmount' },
                totalApproved: { $sum: '$approvedAmount' },
                totalProcessed: { $sum: '$processedAmount' },
                pendingCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                },
                completedCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                },
                rejectedCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
                }
            }
        }
    ]);

    return stats[0] || {
        totalRefunds: 0,
        totalRequested: 0,
        totalApproved: 0,
        totalProcessed: 0,
        pendingCount: 0,
        completedCount: 0,
        rejectedCount: 0
    };
};

/**
 * Get refunds by policy
 */
refundSchema.statics.getRefundsByPolicy = async function(filters = {}) {
    const matchStage = { 'policyApplied.policyName': { $exists: true } };

    if (filters.firmId) matchStage.firmId = new mongoose.Types.ObjectId(filters.firmId);

    return await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$policyApplied.policyName',
                count: { $sum: 1 },
                totalAmount: { $sum: '$processedAmount' },
                avgRefundPercent: { $avg: '$policyApplied.refundPercent' }
            }
        },
        { $sort: { count: -1 } }
    ]);
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Approve refund
 */
refundSchema.methods.approve = async function(userId, approvedAmount = null, notes = '') {
    if (this.status !== 'pending') {
        throw new Error('Only pending refunds can be approved');
    }

    this.status = 'approved';
    this.approvedBy = userId;
    this.approvedAt = new Date();
    this.approvedAmount = approvedAmount || this.requestedAmount;

    this.approvalHistory.push({
        approverId: userId,
        action: 'approved',
        amount: this.approvedAmount,
        notes,
        date: new Date()
    });

    await this.save();
    return this;
};

/**
 * Reject refund
 */
refundSchema.methods.reject = async function(userId, reason) {
    if (this.status !== 'pending') {
        throw new Error('Only pending refunds can be rejected');
    }

    this.status = 'rejected';
    this.rejectedBy = userId;
    this.rejectedAt = new Date();
    this.rejectionReason = reason;

    this.approvalHistory.push({
        approverId: userId,
        action: 'rejected',
        notes: reason,
        date: new Date()
    });

    await this.save();
    return this;
};

/**
 * Mark as processing
 */
refundSchema.methods.startProcessing = async function(userId) {
    if (this.status !== 'approved') {
        throw new Error('Only approved refunds can be processed');
    }

    this.status = 'processing';
    if (!this.processingDetails) {
        this.processingDetails = {};
    }
    this.processingDetails.processedBy = userId;
    this.processingDetails.processedAt = new Date();

    await this.save();
    return this;
};

/**
 * Mark as completed
 */
refundSchema.methods.complete = async function(gatewayRefundId = null, gatewayResponse = null) {
    if (this.status !== 'processing') {
        throw new Error('Only processing refunds can be completed');
    }

    this.status = 'completed';
    this.processedAmount = this.approvedAmount;

    if (!this.processingDetails) {
        this.processingDetails = {};
    }
    this.processingDetails.completedAt = new Date();

    if (gatewayRefundId) {
        this.processingDetails.gatewayRefundId = gatewayRefundId;
    }
    if (gatewayResponse) {
        this.processingDetails.gatewayResponse = gatewayResponse;
    }

    await this.save();
    return this;
};

/**
 * Mark as failed
 */
refundSchema.methods.fail = async function(reason) {
    this.status = 'failed';

    if (!this.failureDetails) {
        this.failureDetails = {};
    }
    this.failureDetails.failureReason = reason;
    this.failureDetails.failureDate = new Date();
    this.failureDetails.retryCount = (this.failureDetails.retryCount || 0) + 1;
    this.failureDetails.lastRetryAt = new Date();

    // Allow retry if less than 3 attempts
    this.failureDetails.canRetry = this.failureDetails.retryCount < 3;

    await this.save();
    return this;
};

// Export constants for use in controllers
refundSchema.statics.REFUND_STATUSES = REFUND_STATUSES;
refundSchema.statics.REFUND_REASONS = REFUND_REASONS;
refundSchema.statics.REFUND_TYPES = REFUND_TYPES;
refundSchema.statics.REFUND_METHODS = REFUND_METHODS;

// ═══════════════════════════════════════════════════════════════
// FIRM ISOLATION PLUGIN (RLS-like enforcement)
// ═══════════════════════════════════════════════════════════════
const firmIsolationPlugin = require('./plugins/firmIsolation.plugin');
refundSchema.plugin(firmIsolationPlugin);

module.exports = mongoose.model('Refund', refundSchema);
