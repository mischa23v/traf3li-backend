const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Commission Settlement Model - Enterprise Commission Payout Tracking
 *
 * Manages commission settlement periods, calculations, approvals, and payouts.
 * Inspired by: Odoo Commission Management, ERPNext Sales Person Target,
 * SAP Incentive Management, Oracle Sales Cloud ICM
 *
 * Features:
 * - Period-based settlement (monthly, quarterly, etc.)
 * - Multi-tier approval workflow
 * - Clawback processing
 * - Adjustment handling
 * - Payment integration
 * - Audit trail
 */

// Commission line item schema for individual transactions
const CommissionLineSchema = new Schema({
    // Source transaction
    sourceType: {
        type: String,
        enum: ['sales_order', 'invoice', 'payment', 'subscription', 'renewal', 'upsell', 'cross_sell'],
        required: true
    },
    sourceId: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'lines.sourceModel'
    },
    sourceModel: {
        type: String,
        enum: ['SalesOrder', 'Invoice', 'Payment', 'Subscription'],
        required: true
    },
    sourceReference: String,
    sourceDate: Date,

    // Customer info
    customerId: {
        type: Schema.Types.ObjectId,
        ref: 'Customer'
    },
    customerName: String,

    // Product/Item info
    productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product'
    },
    productName: String,
    productCategory: String,

    // Commission calculation
    baseAmount: {
        type: Number,
        required: true,
        min: 0
    },
    commissionableAmount: {
        type: Number,
        required: true,
        min: 0
    },
    rate: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    rateType: {
        type: String,
        enum: ['percentage', 'fixed', 'tiered', 'marginal'],
        default: 'percentage'
    },
    calculatedAmount: {
        type: Number,
        required: true
    },

    // Plan reference
    planId: {
        type: Schema.Types.ObjectId,
        ref: 'CommissionPlan'
    },
    planName: String,
    tierName: String,
    acceleratorApplied: Boolean,
    acceleratorMultiplier: {
        type: Number,
        default: 1
    },

    // Adjustments
    adjustments: [{
        type: {
            type: String,
            enum: ['bonus', 'penalty', 'correction', 'clawback', 'split', 'override', 'manual'],
            required: true
        },
        reason: String,
        amount: Number,
        approvedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        approvedAt: Date,
        notes: String
    }],

    // Team split
    splitPercentage: {
        type: Number,
        default: 100,
        min: 0,
        max: 100
    },
    splitFrom: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    isManagerOverride: {
        type: Boolean,
        default: false
    },
    overridePercentage: {
        type: Number,
        min: 0,
        max: 100
    },

    // Final amount after adjustments and splits
    finalAmount: {
        type: Number,
        required: true
    },

    // Status
    status: {
        type: String,
        enum: ['pending', 'approved', 'disputed', 'clawback', 'paid'],
        default: 'pending'
    },

    // Clawback tracking
    clawbackEligible: {
        type: Boolean,
        default: false
    },
    clawbackDeadline: Date,
    clawbackReason: String,
    clawbackAmount: {
        type: Number,
        default: 0
    },

    // Notes
    notes: String
}, { _id: true });

// Target achievement tracking
const TargetAchievementSchema = new Schema({
    targetType: {
        type: String,
        enum: ['revenue', 'units', 'deals', 'margin', 'new_customers', 'retention'],
        required: true
    },
    targetAmount: {
        type: Number,
        required: true
    },
    achievedAmount: {
        type: Number,
        required: true
    },
    achievementPercentage: {
        type: Number,
        required: true
    },
    tierReached: String,
    acceleratorEarned: {
        type: Number,
        default: 1
    },
    bonusEarned: {
        type: Number,
        default: 0
    },
    periodStart: Date,
    periodEnd: Date
}, { _id: true });

// Clawback entry schema
const ClawbackEntrySchema = new Schema({
    originalSettlementId: {
        type: Schema.Types.ObjectId,
        ref: 'CommissionSettlement'
    },
    originalLineId: Schema.Types.ObjectId,
    sourceType: String,
    sourceId: Schema.Types.ObjectId,
    sourceReference: String,

    reason: {
        type: String,
        enum: ['customer_churn', 'order_cancelled', 'payment_reversed', 'refund', 'return', 'fraud', 'error_correction'],
        required: true
    },
    description: String,

    originalAmount: {
        type: Number,
        required: true
    },
    clawbackAmount: {
        type: Number,
        required: true
    },
    clawbackPercentage: {
        type: Number,
        required: true
    },

    eventDate: Date,
    processedAt: Date,
    processedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },

    status: {
        type: String,
        enum: ['pending', 'applied', 'waived', 'disputed'],
        default: 'pending'
    },

    disputeReason: String,
    disputeResolution: String,
    waivedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    waivedReason: String
}, { _id: true });

// Approval workflow entry
const ApprovalEntrySchema = new Schema({
    step: {
        type: Number,
        required: true
    },
    role: {
        type: String,
        enum: ['manager', 'finance', 'hr', 'director', 'vp_sales', 'cfo'],
        required: true
    },
    approver: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    approverName: String,

    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'skipped'],
        default: 'pending'
    },

    action: {
        type: String,
        enum: ['approve', 'reject', 'request_changes', 'escalate']
    },
    actionDate: Date,

    comments: String,
    changesRequested: String,
    escalatedTo: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },

    dueDate: Date,
    reminderSent: Boolean,
    reminderSentAt: Date
}, { _id: true });

// Main Commission Settlement Schema
const CommissionSettlementSchema = new Schema({
    // Multi-tenant isolation
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    lawyerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // Settlement identification
    settlementNumber: {
        type: String,
        required: true,
        index: true
    },

    // Sales person
    salespersonId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    salespersonName: String,
    salespersonEmail: String,
    employeeId: String,
    department: String,
    team: String,
    manager: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    managerName: String,

    // Settlement period
    periodType: {
        type: String,
        enum: ['weekly', 'biweekly', 'monthly', 'quarterly', 'semi_annual', 'annual', 'custom'],
        default: 'monthly'
    },
    periodStart: {
        type: Date,
        required: true,
        index: true
    },
    periodEnd: {
        type: Date,
        required: true,
        index: true
    },
    periodLabel: String, // e.g., "January 2024", "Q1 2024"
    fiscalYear: Number,
    fiscalPeriod: Number,

    // Commission plan
    planId: {
        type: Schema.Types.ObjectId,
        ref: 'CommissionPlan'
    },
    planName: String,
    planVersion: String,

    // Commission lines
    lines: [CommissionLineSchema],

    // Target achievements
    achievements: [TargetAchievementSchema],

    // Clawbacks
    clawbacks: [ClawbackEntrySchema],

    // Summary totals
    summary: {
        // Gross calculations
        totalTransactions: {
            type: Number,
            default: 0
        },
        totalBaseAmount: {
            type: Number,
            default: 0
        },
        totalCommissionableAmount: {
            type: Number,
            default: 0
        },
        grossCommission: {
            type: Number,
            default: 0
        },

        // Adjustments
        bonuses: {
            type: Number,
            default: 0
        },
        penalties: {
            type: Number,
            default: 0
        },
        corrections: {
            type: Number,
            default: 0
        },
        manualAdjustments: {
            type: Number,
            default: 0
        },

        // Clawbacks
        clawbacksApplied: {
            type: Number,
            default: 0
        },
        clawbacksPending: {
            type: Number,
            default: 0
        },

        // Accelerators/Bonuses
        acceleratorBonus: {
            type: Number,
            default: 0
        },
        targetBonus: {
            type: Number,
            default: 0
        },
        spiffs: {
            type: Number,
            default: 0
        },

        // Net
        netCommission: {
            type: Number,
            default: 0
        },

        // Holdback
        holdbackPercentage: {
            type: Number,
            default: 0
        },
        holdbackAmount: {
            type: Number,
            default: 0
        },

        // Final payable
        payableAmount: {
            type: Number,
            default: 0
        },

        // Previously paid
        previouslyPaid: {
            type: Number,
            default: 0
        },
        balance: {
            type: Number,
            default: 0
        }
    },

    // Currency
    currency: {
        type: String,
        default: 'SAR'
    },
    exchangeRate: {
        type: Number,
        default: 1
    },
    baseCurrency: String,
    baseCurrencyAmount: Number,

    // Status
    status: {
        type: String,
        enum: [
            'draft',
            'calculated',
            'pending_approval',
            'approved',
            'disputed',
            'processing_payment',
            'paid',
            'partially_paid',
            'cancelled'
        ],
        default: 'draft',
        index: true
    },

    // Approval workflow
    approvalWorkflow: [ApprovalEntrySchema],
    currentApprovalStep: {
        type: Number,
        default: 0
    },
    requiresApproval: {
        type: Boolean,
        default: true
    },
    approvalThreshold: {
        type: Number,
        default: 0 // Amount above which approval is required
    },
    approvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    approverNotes: String,

    // Dispute handling
    disputeReason: String,
    disputeDetails: String,
    disputeRaisedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    disputeRaisedAt: Date,
    disputeResolvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    disputeResolvedAt: Date,
    disputeResolution: String,

    // Payment info
    paymentMethod: {
        type: String,
        enum: ['bank_transfer', 'payroll', 'check', 'cash', 'other'],
        default: 'payroll'
    },
    paymentReference: String,
    paymentBatch: String,
    scheduledPaymentDate: Date,
    actualPaymentDate: Date,
    paymentStatus: {
        type: String,
        enum: ['not_scheduled', 'scheduled', 'processing', 'completed', 'failed'],
        default: 'not_scheduled'
    },

    // Bank details (for direct deposit)
    bankDetails: {
        bankName: String,
        accountNumber: String, // Should be encrypted
        accountName: String,
        routingNumber: String,
        iban: String,
        swiftCode: String
    },

    // Statement
    statementGenerated: {
        type: Boolean,
        default: false
    },
    statementUrl: String,
    statementGeneratedAt: Date,
    statementSentAt: Date,
    statementSentTo: [String],

    // Calculation details
    calculatedAt: Date,
    calculatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    calculationMethod: {
        type: String,
        enum: ['automatic', 'manual', 'hybrid'],
        default: 'automatic'
    },
    lastRecalculatedAt: Date,
    recalculationReason: String,

    // Locks
    isLocked: {
        type: Boolean,
        default: false
    },
    lockedAt: Date,
    lockedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    lockReason: String,

    // Audit trail
    history: [{
        action: {
            type: String,
            enum: [
                'created',
                'calculated',
                'recalculated',
                'submitted',
                'approved',
                'rejected',
                'disputed',
                'dispute_resolved',
                'payment_scheduled',
                'payment_processed',
                'payment_failed',
                'adjusted',
                'clawback_applied',
                'locked',
                'unlocked',
                'cancelled'
            ]
        },
        performedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        performedAt: {
            type: Date,
            default: Date.now
        },
        details: String,
        previousStatus: String,
        newStatus: String,
        previousAmount: Number,
        newAmount: Number,
        ipAddress: String,
        userAgent: String
    }],

    // Notes and attachments
    notes: String,
    internalNotes: String,
    attachments: [{
        name: String,
        type: {
            type: String,
            enum: ['statement', 'calculation_detail', 'supporting_doc', 'dispute_doc', 'approval_doc']
        },
        url: String,
        size: Number,
        uploadedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // Integration
    payrollSystemId: String,
    erpSystemId: String,
    exportedToPayroll: {
        type: Boolean,
        default: false
    },
    exportedAt: Date,

    // Tags and categorization
    tags: [String],

    // Tracking
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for performance
CommissionSettlementSchema.index({ firmId: 1, salespersonId: 1, periodStart: 1 });
CommissionSettlementSchema.index({ firmId: 1, status: 1 });
CommissionSettlementSchema.index({ firmId: 1, periodStart: 1, periodEnd: 1 });
CommissionSettlementSchema.index({ firmId: 1, settlementNumber: 1 }, { unique: true });
CommissionSettlementSchema.index({ firmId: 1, 'approvalWorkflow.approver': 1, status: 1 });
CommissionSettlementSchema.index({ firmId: 1, paymentStatus: 1, scheduledPaymentDate: 1 });
CommissionSettlementSchema.index({ firmId: 1, createdAt: -1 });

// Virtuals
CommissionSettlementSchema.virtual('periodDays').get(function() {
    if (!this.periodStart || !this.periodEnd) return 0;
    return Math.ceil((this.periodEnd - this.periodStart) / (1000 * 60 * 60 * 24));
});

CommissionSettlementSchema.virtual('lineCount').get(function() {
    return this.lines ? this.lines.length : 0;
});

CommissionSettlementSchema.virtual('averageRate').get(function() {
    if (!this.lines || this.lines.length === 0) return 0;
    const totalRate = this.lines.reduce((sum, line) => sum + (line.rate || 0), 0);
    return totalRate / this.lines.length;
});

CommissionSettlementSchema.virtual('isOverdue').get(function() {
    if (this.status === 'paid' || this.status === 'cancelled') return false;
    if (!this.scheduledPaymentDate) return false;
    return new Date() > this.scheduledPaymentDate;
});

CommissionSettlementSchema.virtual('pendingApprovalCount').get(function() {
    if (!this.approvalWorkflow) return 0;
    return this.approvalWorkflow.filter(a => a.status === 'pending').length;
});

// Pre-save middleware
CommissionSettlementSchema.pre('save', async function(next) {
    // Generate settlement number
    if (this.isNew && !this.settlementNumber) {
        const count = await this.constructor.countDocuments({ firmId: this.firmId });
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        this.settlementNumber = `CS-${year}${month}-${String(count + 1).padStart(6, '0')}`;
    }

    // Calculate summary totals
    this.calculateSummary();

    next();
});

// Instance Methods
CommissionSettlementSchema.methods.calculateSummary = function() {
    if (!this.lines || this.lines.length === 0) {
        return;
    }

    // Reset summary
    this.summary.totalTransactions = this.lines.length;
    this.summary.totalBaseAmount = 0;
    this.summary.totalCommissionableAmount = 0;
    this.summary.grossCommission = 0;
    this.summary.bonuses = 0;
    this.summary.penalties = 0;
    this.summary.corrections = 0;
    this.summary.manualAdjustments = 0;

    // Calculate from lines
    this.lines.forEach(line => {
        this.summary.totalBaseAmount += line.baseAmount || 0;
        this.summary.totalCommissionableAmount += line.commissionableAmount || 0;
        this.summary.grossCommission += line.calculatedAmount || 0;

        // Process adjustments
        if (line.adjustments && line.adjustments.length > 0) {
            line.adjustments.forEach(adj => {
                switch (adj.type) {
                    case 'bonus':
                        this.summary.bonuses += adj.amount || 0;
                        break;
                    case 'penalty':
                        this.summary.penalties += adj.amount || 0;
                        break;
                    case 'correction':
                        this.summary.corrections += adj.amount || 0;
                        break;
                    case 'manual':
                        this.summary.manualAdjustments += adj.amount || 0;
                        break;
                }
            });
        }
    });

    // Calculate clawbacks
    if (this.clawbacks && this.clawbacks.length > 0) {
        this.summary.clawbacksApplied = this.clawbacks
            .filter(c => c.status === 'applied')
            .reduce((sum, c) => sum + (c.clawbackAmount || 0), 0);

        this.summary.clawbacksPending = this.clawbacks
            .filter(c => c.status === 'pending')
            .reduce((sum, c) => sum + (c.clawbackAmount || 0), 0);
    }

    // Calculate achievement bonuses
    if (this.achievements && this.achievements.length > 0) {
        this.summary.targetBonus = this.achievements
            .reduce((sum, a) => sum + (a.bonusEarned || 0), 0);

        this.summary.acceleratorBonus = this.summary.grossCommission *
            (this.achievements.reduce((max, a) => Math.max(max, a.acceleratorEarned || 1), 1) - 1);
    }

    // Calculate net commission
    this.summary.netCommission =
        this.summary.grossCommission +
        this.summary.bonuses +
        this.summary.corrections +
        this.summary.manualAdjustments +
        this.summary.acceleratorBonus +
        this.summary.targetBonus +
        this.summary.spiffs -
        this.summary.penalties -
        this.summary.clawbacksApplied;

    // Apply holdback
    this.summary.holdbackAmount = this.summary.netCommission * (this.summary.holdbackPercentage / 100);

    // Calculate payable
    this.summary.payableAmount = this.summary.netCommission - this.summary.holdbackAmount;

    // Calculate balance
    this.summary.balance = this.summary.payableAmount - this.summary.previouslyPaid;

    return this.summary;
};

CommissionSettlementSchema.methods.addLine = function(lineData) {
    // Calculate final amount
    let finalAmount = lineData.calculatedAmount || 0;

    // Apply split
    if (lineData.splitPercentage && lineData.splitPercentage < 100) {
        finalAmount = finalAmount * (lineData.splitPercentage / 100);
    }

    // Apply adjustments
    if (lineData.adjustments && lineData.adjustments.length > 0) {
        lineData.adjustments.forEach(adj => {
            finalAmount += adj.amount || 0;
        });
    }

    lineData.finalAmount = finalAmount;

    this.lines.push(lineData);
    this.calculateSummary();

    return this.lines[this.lines.length - 1];
};

CommissionSettlementSchema.methods.addClawback = function(clawbackData) {
    this.clawbacks.push(clawbackData);
    this.calculateSummary();

    this.history.push({
        action: 'clawback_applied',
        performedAt: new Date(),
        details: `Clawback of ${clawbackData.clawbackAmount} applied: ${clawbackData.reason}`
    });

    return this.clawbacks[this.clawbacks.length - 1];
};

CommissionSettlementSchema.methods.submitForApproval = function(userId) {
    if (this.status !== 'draft' && this.status !== 'calculated') {
        throw new Error('Settlement must be in draft or calculated status');
    }

    this.status = 'pending_approval';
    this.currentApprovalStep = 1;

    this.history.push({
        action: 'submitted',
        performedBy: userId,
        performedAt: new Date(),
        previousStatus: this.status,
        newStatus: 'pending_approval'
    });

    return this;
};

CommissionSettlementSchema.methods.approve = function(userId, notes) {
    const currentStep = this.approvalWorkflow.find(
        a => a.step === this.currentApprovalStep && a.status === 'pending'
    );

    if (currentStep) {
        currentStep.status = 'approved';
        currentStep.approver = userId;
        currentStep.action = 'approve';
        currentStep.actionDate = new Date();
        currentStep.comments = notes;
    }

    // Check if all approvals are complete
    const pendingApprovals = this.approvalWorkflow.filter(a => a.status === 'pending');

    if (pendingApprovals.length === 0) {
        this.status = 'approved';
        this.approvedBy = userId;
        this.approvedAt = new Date();
        this.approverNotes = notes;
    } else {
        this.currentApprovalStep++;
    }

    this.history.push({
        action: 'approved',
        performedBy: userId,
        performedAt: new Date(),
        details: notes,
        previousStatus: 'pending_approval',
        newStatus: this.status
    });

    return this;
};

CommissionSettlementSchema.methods.reject = function(userId, reason) {
    const currentStep = this.approvalWorkflow.find(
        a => a.step === this.currentApprovalStep && a.status === 'pending'
    );

    if (currentStep) {
        currentStep.status = 'rejected';
        currentStep.approver = userId;
        currentStep.action = 'reject';
        currentStep.actionDate = new Date();
        currentStep.comments = reason;
    }

    this.status = 'draft'; // Send back to draft for corrections

    this.history.push({
        action: 'rejected',
        performedBy: userId,
        performedAt: new Date(),
        details: reason,
        previousStatus: 'pending_approval',
        newStatus: 'draft'
    });

    return this;
};

CommissionSettlementSchema.methods.raiseDispute = function(userId, reason, details) {
    this.status = 'disputed';
    this.disputeReason = reason;
    this.disputeDetails = details;
    this.disputeRaisedBy = userId;
    this.disputeRaisedAt = new Date();

    this.history.push({
        action: 'disputed',
        performedBy: userId,
        performedAt: new Date(),
        details: reason
    });

    return this;
};

CommissionSettlementSchema.methods.resolveDispute = function(userId, resolution) {
    this.disputeResolvedBy = userId;
    this.disputeResolvedAt = new Date();
    this.disputeResolution = resolution;
    this.status = 'approved'; // Or back to pending_approval for re-review

    this.history.push({
        action: 'dispute_resolved',
        performedBy: userId,
        performedAt: new Date(),
        details: resolution,
        previousStatus: 'disputed',
        newStatus: 'approved'
    });

    return this;
};

CommissionSettlementSchema.methods.schedulePayment = function(paymentDate, paymentMethod, batchId) {
    if (this.status !== 'approved') {
        throw new Error('Settlement must be approved before scheduling payment');
    }

    this.scheduledPaymentDate = paymentDate;
    this.paymentMethod = paymentMethod || this.paymentMethod;
    this.paymentBatch = batchId;
    this.paymentStatus = 'scheduled';
    this.status = 'processing_payment';

    this.history.push({
        action: 'payment_scheduled',
        performedAt: new Date(),
        details: `Payment scheduled for ${paymentDate}`
    });

    return this;
};

CommissionSettlementSchema.methods.recordPayment = function(userId, paymentDetails) {
    this.actualPaymentDate = paymentDetails.paymentDate || new Date();
    this.paymentReference = paymentDetails.reference;
    this.paymentStatus = 'completed';
    this.status = 'paid';

    this.summary.previouslyPaid = this.summary.payableAmount;
    this.summary.balance = 0;

    this.history.push({
        action: 'payment_processed',
        performedBy: userId,
        performedAt: new Date(),
        details: `Payment of ${this.summary.payableAmount} processed. Reference: ${paymentDetails.reference}`
    });

    return this;
};

CommissionSettlementSchema.methods.lock = function(userId, reason) {
    this.isLocked = true;
    this.lockedAt = new Date();
    this.lockedBy = userId;
    this.lockReason = reason;

    this.history.push({
        action: 'locked',
        performedBy: userId,
        performedAt: new Date(),
        details: reason
    });

    return this;
};

CommissionSettlementSchema.methods.unlock = function(userId, reason) {
    this.isLocked = false;

    this.history.push({
        action: 'unlocked',
        performedBy: userId,
        performedAt: new Date(),
        details: reason
    });

    return this;
};

CommissionSettlementSchema.methods.generateStatement = function() {
    // Would integrate with document generation service
    this.statementGenerated = true;
    this.statementGeneratedAt = new Date();

    return {
        settlementNumber: this.settlementNumber,
        salesperson: this.salespersonName,
        period: this.periodLabel,
        periodStart: this.periodStart,
        periodEnd: this.periodEnd,
        lines: this.lines,
        achievements: this.achievements,
        clawbacks: this.clawbacks.filter(c => c.status === 'applied'),
        summary: this.summary,
        status: this.status
    };
};

// Static Methods
CommissionSettlementSchema.statics.findByPeriod = function(firmId, periodStart, periodEnd, options = {}) {
    const query = {
        firmId,
        periodStart: { $gte: periodStart },
        periodEnd: { $lte: periodEnd }
    };

    if (options.salespersonId) {
        query.salespersonId = options.salespersonId;
    }

    if (options.status) {
        query.status = options.status;
    }

    return this.find(query).sort({ salespersonName: 1, periodStart: 1 });
};

CommissionSettlementSchema.statics.findPendingApproval = function(firmId, approverId) {
    return this.find({
        firmId,
        status: 'pending_approval',
        'approvalWorkflow': {
            $elemMatch: {
                approver: approverId,
                status: 'pending'
            }
        }
    }).sort({ createdAt: -1 });
};

CommissionSettlementSchema.statics.findPendingPayment = function(firmId, beforeDate) {
    const query = {
        firmId,
        status: 'approved',
        paymentStatus: { $in: ['not_scheduled', 'scheduled'] }
    };

    if (beforeDate) {
        query.scheduledPaymentDate = { $lte: beforeDate };
    }

    return this.find(query).sort({ scheduledPaymentDate: 1 });
};

CommissionSettlementSchema.statics.getPayrollSummary = function(firmId, periodStart, periodEnd) {
    return this.aggregate([
        {
            $match: {
                firmId: new mongoose.Types.ObjectId(firmId),
                periodStart: { $gte: periodStart },
                periodEnd: { $lte: periodEnd },
                status: { $in: ['approved', 'processing_payment', 'paid'] }
            }
        },
        {
            $group: {
                _id: null,
                totalSettlements: { $sum: 1 },
                totalPayable: { $sum: '$summary.payableAmount' },
                totalPaid: { $sum: '$summary.previouslyPaid' },
                totalPending: {
                    $sum: {
                        $cond: [
                            { $eq: ['$paymentStatus', 'completed'] },
                            0,
                            '$summary.payableAmount'
                        ]
                    }
                },
                byStatus: {
                    $push: {
                        status: '$status',
                        amount: '$summary.payableAmount'
                    }
                }
            }
        }
    ]);
};

CommissionSettlementSchema.statics.getSalespersonSummary = function(firmId, salespersonId, year) {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);

    return this.aggregate([
        {
            $match: {
                firmId: new mongoose.Types.ObjectId(firmId),
                salespersonId: new mongoose.Types.ObjectId(salespersonId),
                periodStart: { $gte: yearStart },
                periodEnd: { $lte: yearEnd }
            }
        },
        {
            $group: {
                _id: { $month: '$periodStart' },
                month: { $first: { $month: '$periodStart' } },
                grossCommission: { $sum: '$summary.grossCommission' },
                netCommission: { $sum: '$summary.netCommission' },
                paid: { $sum: '$summary.previouslyPaid' },
                clawbacks: { $sum: '$summary.clawbacksApplied' },
                bonuses: { $sum: '$summary.bonuses' }
            }
        },
        {
            $sort: { month: 1 }
        }
    ]);
};

const CommissionSettlement = mongoose.model('CommissionSettlement', CommissionSettlementSchema);

module.exports = CommissionSettlement;
