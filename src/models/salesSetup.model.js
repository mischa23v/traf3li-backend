/**
 * Sales Setup Wizard Model
 *
 * Manages the initial sales configuration for a firm
 * Like Finance Setup - multi-step wizard with Basic/Advanced views
 *
 * Steps:
 * 1. Company Sales Info
 * 2. Quotation Settings
 * 3. Order Settings
 * 4. Pricing & Discounts
 * 5. Tax Settings
 * 6. Commission Settings
 * 7. Pipeline Configuration
 * 8. Team Structure
 * 9. Notifications
 *
 * Multi-tenant: firmId for firms, lawyerId for solo lawyers
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// Pipeline stage configuration
const PipelineStageSchema = new Schema({
    name: { type: String, required: true, maxlength: 100 },
    nameAr: { type: String, maxlength: 100 },
    color: { type: String, default: '#3B82F6' },
    probability: { type: Number, default: 50, min: 0, max: 100 },
    rottenDays: { type: Number, default: 30 }, // Days before deal is marked stale
    order: { type: Number, default: 0 },
    isWon: { type: Boolean, default: false },
    isLost: { type: Boolean, default: false }
}, { _id: true });

// Commission tier configuration
const CommissionTierSchema = new Schema({
    minAmount: { type: Number, required: true, min: 0 },
    maxAmount: { type: Number, min: 0 },
    rate: { type: Number, required: true, min: 0, max: 100 },
    flatBonus: { type: Number, default: 0 }
}, { _id: false });

const salesSetupSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // MULTI-TENANCY
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
    },
    lawyerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // STEP 1: Company Sales Info
    // ═══════════════════════════════════════════════════════════════
    companySalesInfo: {
        companyName: { type: String, trim: true, maxlength: 200 },
        companyNameAr: { type: String, trim: true, maxlength: 200 },
        salesEmail: { type: String, trim: true, lowercase: true, maxlength: 200 },
        salesPhone: { type: String, trim: true, maxlength: 50 },
        logo: { type: String },
        currency: { type: String, default: 'SAR', maxlength: 3 },
        fiscalYearStart: { type: Number, default: 1, min: 1, max: 12 },
        timezone: { type: String, default: 'Asia/Riyadh' }
    },

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: Quotation Settings
    // ═══════════════════════════════════════════════════════════════
    quotationSettings: {
        prefix: { type: String, default: 'QT-', trim: true, maxlength: 20 },
        nextNumber: { type: Number, default: 1, min: 1 },
        defaultValidityDays: { type: Number, default: 30, min: 1, max: 365 },
        autoExpire: { type: Boolean, default: false },
        requireApprovalAbove: { type: Number, default: 0 }, // 0 = no approval
        maxDiscountWithoutApproval: { type: Number, default: 10, min: 0, max: 100 },
        defaultTermsAndConditions: { type: String, maxlength: 10000 },
        defaultTermsAndConditionsAr: { type: String, maxlength: 10000 },
        showPricesWithTax: { type: Boolean, default: false },
        showItemImages: { type: Boolean, default: true },
        allowNegotiatedPricing: { type: Boolean, default: true },
        sendEmailOnCreate: { type: Boolean, default: false }
    },

    // ═══════════════════════════════════════════════════════════════
    // STEP 3: Order Settings
    // ═══════════════════════════════════════════════════════════════
    orderSettings: {
        prefix: { type: String, default: 'SO-', trim: true, maxlength: 20 },
        nextNumber: { type: Number, default: 1, min: 1 },
        autoConfirmPaidOrders: { type: Boolean, default: false },
        requireCustomerAcceptance: { type: Boolean, default: false },
        allowPartialDelivery: { type: Boolean, default: true },
        allowPartialInvoicing: { type: Boolean, default: true },
        requireApprovalAbove: { type: Number, default: 0 },
        defaultPaymentTermsDays: { type: Number, default: 30, min: 0, max: 365 },
        requireDownPayment: { type: Boolean, default: false },
        defaultDownPaymentPercent: { type: Number, default: 30, min: 0, max: 100 },
        allowCancellation: { type: Boolean, default: true },
        cancellationPenaltyPercent: { type: Number, default: 0, min: 0, max: 100 }
    },

    // ═══════════════════════════════════════════════════════════════
    // STEP 4: Pricing & Discounts
    // ═══════════════════════════════════════════════════════════════
    pricingSettings: {
        defaultPriceListId: { type: Schema.Types.ObjectId, ref: 'PriceList' },
        pricesIncludeTax: { type: Boolean, default: false },
        roundingMethod: {
            type: String,
            enum: ['none', 'round_up', 'round_down', 'round_nearest'],
            default: 'round_nearest'
        },
        roundingPrecision: { type: Number, default: 2, min: 0, max: 4 },
        allowManualDiscounts: { type: Boolean, default: true },
        maxLineDiscount: { type: Number, default: 50, min: 0, max: 100 },
        maxOrderDiscount: { type: Number, default: 30, min: 0, max: 100 },
        enforceMinimumPrice: { type: Boolean, default: false },
        minimumMarginPercent: { type: Number, default: 0, min: 0, max: 100 },
        showBelowCostWarning: { type: Boolean, default: true },
        requireBelowCostApproval: { type: Boolean, default: true }
    },

    // ═══════════════════════════════════════════════════════════════
    // STEP 5: Tax Settings
    // ═══════════════════════════════════════════════════════════════
    taxSettings: {
        defaultTaxRate: { type: Number, default: 15, min: 0, max: 100 },
        taxName: { type: String, default: 'VAT', maxlength: 50 },
        taxNameAr: { type: String, default: 'ضريبة القيمة المضافة', maxlength: 100 },
        vatNumber: { type: String, maxlength: 50 },
        taxCalculationMethod: {
            type: String,
            enum: ['line_by_line', 'order_total'],
            default: 'line_by_line'
        },
        showTaxBreakdown: { type: Boolean, default: true },
        allowTaxExemption: { type: Boolean, default: true },
        zatcaEnabled: { type: Boolean, default: false },
        zatcaPhase: {
            type: String,
            enum: ['phase1', 'phase2'],
            default: 'phase1'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // STEP 6: Commission Settings
    // ═══════════════════════════════════════════════════════════════
    commissionSettings: {
        enabled: { type: Boolean, default: true },
        basis: {
            type: String,
            enum: ['revenue', 'profit', 'margin', 'collected'],
            default: 'revenue'
        },
        calculateOn: {
            type: String,
            enum: ['order_confirmed', 'order_delivered', 'order_invoiced', 'payment_received'],
            default: 'payment_received'
        },
        defaultRate: { type: Number, default: 5, min: 0, max: 100 },
        // Tiered commission
        useTieredCommission: { type: Boolean, default: false },
        tiers: [CommissionTierSchema],
        // Settlement
        settlementPeriod: {
            type: String,
            enum: ['weekly', 'biweekly', 'monthly', 'quarterly'],
            default: 'monthly'
        },
        settlementDayOfMonth: { type: Number, default: 1, min: 1, max: 28 },
        // Holdback & Clawback
        enableHoldback: { type: Boolean, default: false },
        holdbackPercent: { type: Number, default: 20, min: 0, max: 100 },
        holdbackReleaseDays: { type: Number, default: 90 },
        enableClawback: { type: Boolean, default: true },
        clawbackWindowDays: { type: Number, default: 90 },
        // Team
        enableTeamSplit: { type: Boolean, default: true },
        enableManagerOverride: { type: Boolean, default: true },
        defaultManagerOverridePercent: { type: Number, default: 5, min: 0, max: 50 }
    },

    // ═══════════════════════════════════════════════════════════════
    // STEP 7: Pipeline Configuration
    // ═══════════════════════════════════════════════════════════════
    pipelineSettings: {
        defaultPipelineId: { type: Schema.Types.ObjectId, ref: 'Pipeline' },
        stages: {
            type: [PipelineStageSchema],
            default: [
                { name: 'New', nameAr: 'جديد', probability: 10, order: 1, color: '#9CA3AF' },
                { name: 'Contacted', nameAr: 'تم التواصل', probability: 20, order: 2, color: '#3B82F6' },
                { name: 'Qualified', nameAr: 'مؤهل', probability: 40, order: 3, color: '#8B5CF6' },
                { name: 'Proposal', nameAr: 'عرض السعر', probability: 60, order: 4, color: '#F59E0B' },
                { name: 'Negotiation', nameAr: 'التفاوض', probability: 80, order: 5, color: '#EF4444' },
                { name: 'Won', nameAr: 'فاز', probability: 100, order: 6, isWon: true, color: '#10B981' },
                { name: 'Lost', nameAr: 'خسر', probability: 0, order: 7, isLost: true, color: '#6B7280' }
            ]
        },
        rottenDays: { type: Number, default: 30 },
        autoCalculateProbability: { type: Boolean, default: true },
        requireLostReason: { type: Boolean, default: true }
    },

    // ═══════════════════════════════════════════════════════════════
    // STEP 8: Team Structure
    // ═══════════════════════════════════════════════════════════════
    teamSettings: {
        defaultSalesTeamId: { type: Schema.Types.ObjectId, ref: 'SalesTeam' },
        enableTerritories: { type: Boolean, default: false },
        enableQuotas: { type: Boolean, default: true },
        quotaPeriod: {
            type: String,
            enum: ['monthly', 'quarterly', 'yearly'],
            default: 'monthly'
        },
        autoAssignLeads: { type: Boolean, default: false },
        assignmentMethod: {
            type: String,
            enum: ['round_robin', 'least_loaded', 'territory_based', 'manual'],
            default: 'manual'
        },
        leadCapPerPerson: { type: Number, default: 50, min: 0 }
    },

    // ═══════════════════════════════════════════════════════════════
    // STEP 9: Notifications
    // ═══════════════════════════════════════════════════════════════
    notificationSettings: {
        emailEnabled: { type: Boolean, default: true },
        sendQuoteCreated: { type: Boolean, default: true },
        sendQuoteExpiring: { type: Boolean, default: true },
        quoteExpiryReminderDays: { type: Number, default: 7 },
        sendQuoteAccepted: { type: Boolean, default: true },
        sendOrderConfirmation: { type: Boolean, default: true },
        sendPaymentReceived: { type: Boolean, default: true },
        sendCommissionStatement: { type: Boolean, default: true },
        alertOnLargeOrder: { type: Boolean, default: true },
        largeOrderThreshold: { type: Number, default: 50000 },
        alertOnLowMargin: { type: Boolean, default: true },
        lowMarginThreshold: { type: Number, default: 10 }
    },

    // ═══════════════════════════════════════════════════════════════
    // Setup Progress Tracking
    // ═══════════════════════════════════════════════════════════════
    currentStep: { type: Number, default: 1, min: 1, max: 9 },
    completedSteps: [{ type: Number }],
    setupCompleted: { type: Boolean, default: false },
    completedAt: Date,
    completedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    // ═══════════════════════════════════════════════════════════════
    // Audit
    // ═══════════════════════════════════════════════════════════════
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }

}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
salesSetupSchema.index({ firmId: 1 }, { unique: true, sparse: true });
salesSetupSchema.index({ lawyerId: 1 }, { unique: true, sparse: true });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get or create sales setup for firm/lawyer
 */
salesSetupSchema.statics.getOrCreate = async function(firmId, lawyerId, userId) {
    const query = {};
    if (firmId) {
        query.firmId = firmId;
    } else if (lawyerId) {
        query.lawyerId = lawyerId;
    }

    let setup = await this.findOne(query);
    if (!setup) {
        setup = new this({
            ...query,
            createdBy: userId,
            currentStep: 1,
            completedSteps: []
        });
        await setup.save();
    }
    return setup;
};

/**
 * Mark a step as completed
 */
salesSetupSchema.methods.completeStep = async function(stepNumber, userId) {
    if (!this.completedSteps.includes(stepNumber)) {
        this.completedSteps.push(stepNumber);
        this.completedSteps.sort((a, b) => a - b);
    }

    // Move to next step
    if (stepNumber === this.currentStep && stepNumber < 9) {
        this.currentStep = stepNumber + 1;
    }

    this.updatedBy = userId;
    await this.save();
    return this;
};

/**
 * Complete the entire setup
 */
salesSetupSchema.methods.completeSetup = async function(userId) {
    this.setupCompleted = true;
    this.completedAt = new Date();
    this.completedBy = userId;
    this.updatedBy = userId;
    await this.save();
    return this;
};

/**
 * Check if all required steps are completed
 * Required: Company Info, Quotation, Order, Tax, Pipeline
 */
salesSetupSchema.methods.canComplete = function() {
    const requiredSteps = [1, 2, 3, 5, 7];
    return requiredSteps.every(step => this.completedSteps.includes(step));
};

/**
 * Get next quote number
 */
salesSetupSchema.methods.getNextQuoteNumber = async function() {
    const year = new Date().getFullYear();
    const prefix = this.quotationSettings.prefix || 'QT-';
    const seq = this.quotationSettings.nextNumber || 1;

    const number = `${prefix}${year}-${String(seq).padStart(5, '0')}`;

    this.quotationSettings.nextNumber = seq + 1;
    await this.save();

    return number;
};

/**
 * Get next order number
 */
salesSetupSchema.methods.getNextOrderNumber = async function() {
    const year = new Date().getFullYear();
    const prefix = this.orderSettings.prefix || 'SO-';
    const seq = this.orderSettings.nextNumber || 1;

    const number = `${prefix}${year}-${String(seq).padStart(5, '0')}`;

    this.orderSettings.nextNumber = seq + 1;
    await this.save();

    return number;
};

/**
 * Calculate commission based on settings
 * @param {number} amount - Sale amount
 * @param {number} cost - Cost amount (for margin-based)
 * @returns {object} - Commission details
 */
salesSetupSchema.methods.calculateCommission = function(amount, cost = 0) {
    if (!this.commissionSettings.enabled) {
        return { rate: 0, amount: 0, basis: 'none' };
    }

    let basisAmount = amount;
    const basis = this.commissionSettings.basis;

    // Calculate basis amount
    if (basis === 'profit' || basis === 'margin') {
        basisAmount = amount - cost;
    }

    let commissionRate = this.commissionSettings.defaultRate;
    let flatBonus = 0;

    // Use tiered commission if enabled
    if (this.commissionSettings.useTieredCommission && this.commissionSettings.tiers.length > 0) {
        const tiers = this.commissionSettings.tiers.sort((a, b) => b.minAmount - a.minAmount);
        for (const tier of tiers) {
            if (basisAmount >= tier.minAmount) {
                commissionRate = tier.rate;
                flatBonus = tier.flatBonus || 0;
                break;
            }
        }
    }

    const commissionAmount = Math.round((basisAmount * commissionRate / 100) + flatBonus);

    return {
        rate: commissionRate,
        amount: commissionAmount,
        basis,
        basisAmount,
        flatBonus,
        tiered: this.commissionSettings.useTieredCommission
    };
};

/**
 * Check if approval is required
 * @param {string} type - 'quote' or 'order'
 * @param {number} amount - Total amount
 * @param {number} discountPercent - Discount percentage
 * @returns {object} - Approval requirement
 */
salesSetupSchema.methods.checkApprovalRequired = function(type, amount, discountPercent = 0) {
    const settings = type === 'quote' ? this.quotationSettings : this.orderSettings;

    // Check amount threshold
    if (settings.requireApprovalAbove > 0 && amount >= settings.requireApprovalAbove) {
        return {
            required: true,
            reason: 'amount_threshold',
            threshold: settings.requireApprovalAbove
        };
    }

    // Check discount threshold (quotes only)
    if (type === 'quote' && this.quotationSettings.maxDiscountWithoutApproval) {
        if (discountPercent > this.quotationSettings.maxDiscountWithoutApproval) {
            return {
                required: true,
                reason: 'discount_threshold',
                threshold: this.quotationSettings.maxDiscountWithoutApproval
            };
        }
    }

    return { required: false };
};

module.exports = mongoose.model('SalesSetup', salesSetupSchema);
