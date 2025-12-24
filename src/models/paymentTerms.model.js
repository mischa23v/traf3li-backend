/**
 * Payment Terms Template Model
 *
 * Defines payment terms templates that can be applied to invoices.
 * Includes standard terms (Net 30, Due on Receipt) and custom terms.
 */

const mongoose = require('mongoose');

const earlyPaymentDiscountSchema = new mongoose.Schema({
    days: { type: Number, required: true, min: 1 }, // Days from invoice date
    discountPercentage: { type: Number, required: true, min: 0, max: 100 }
}, { _id: false });

const installmentSchema = new mongoose.Schema({
    percentage: { type: Number, required: true, min: 1, max: 100 },
    daysAfterInvoice: { type: Number, required: true, min: 0 }
}, { _id: false });

const paymentTermsSchema = new mongoose.Schema({
    // Multi-tenancy
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // Template Info
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, trim: true },
    code: { type: String, trim: true }, // e.g., 'NET30', 'DOR', '2/10NET30'
    description: { type: String, trim: true },
    descriptionAr: { type: String, trim: true },

    // Term Type
    termType: {
        type: String,
        enum: [
            'due_on_receipt',   // Due immediately
            'net_days',         // Due in X days
            'end_of_month',     // Due at end of month
            'custom_date',      // Due on specific day of month
            'installments'      // Split payment
        ],
        required: true
    },

    // Net Days Configuration
    netDays: { type: Number, min: 0 }, // e.g., 30 for Net 30

    // End of Month Configuration
    endOfMonth: {
        daysAfter: { type: Number, default: 0 } // Days after end of month
    },

    // Custom Date Configuration
    customDate: {
        dayOfMonth: { type: Number, min: 1, max: 28 },
        minimumDays: { type: Number, default: 0 } // Minimum days from invoice
    },

    // Installments Configuration
    installments: {
        type: [installmentSchema],
        validate: {
            validator: function(installments) {
                if (!installments || installments.length === 0) return true;
                const total = installments.reduce((sum, i) => sum + i.percentage, 0);
                return total === 100;
            },
            message: 'Installment percentages must add up to 100%'
        }
    },

    // Early Payment Discount
    earlyPaymentDiscounts: [earlyPaymentDiscountSchema],

    // Late Fee Configuration
    lateFee: {
        enabled: { type: Boolean, default: false },
        type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
        value: { type: Number, default: 0 }, // Percentage or fixed amount in halalas
        gracePeriodDays: { type: Number, default: 0 },
        frequency: {
            type: String,
            enum: ['once', 'daily', 'weekly', 'monthly'],
            default: 'once'
        },
        maxFee: { type: Number } // Maximum late fee cap in halalas
    },

    // Display Settings
    displayText: { type: String, trim: true }, // e.g., "Net 30 Days"
    displayTextAr: { type: String, trim: true },
    invoiceFooterText: { type: String, trim: true },
    invoiceFooterTextAr: { type: String, trim: true },

    // Status
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    isSystem: { type: Boolean, default: false }, // System templates can't be deleted

    // Usage Stats
    usageCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true,
    versionKey: false
});

// Indexes
paymentTermsSchema.index({ firmId: 1, code: 1 }, { unique: true, sparse: true });
paymentTermsSchema.index({ firmId: 1, isActive: 1 });
paymentTermsSchema.index({ firmId: 1, isDefault: 1 });
paymentTermsSchema.index({ lawyerId: 1, code: 1 }, { unique: true, sparse: true });

/**
 * Calculate due date from invoice date
 */
paymentTermsSchema.methods.calculateDueDate = function(invoiceDate) {
    const date = new Date(invoiceDate);

    switch (this.termType) {
        case 'due_on_receipt':
            return date;

        case 'net_days':
            date.setDate(date.getDate() + (this.netDays || 0));
            return date;

        case 'end_of_month':
            // Move to end of month
            date.setMonth(date.getMonth() + 1, 0);
            // Add additional days if specified
            if (this.endOfMonth?.daysAfter) {
                date.setDate(date.getDate() + this.endOfMonth.daysAfter);
            }
            return date;

        case 'custom_date':
            const targetDay = this.customDate?.dayOfMonth || 1;
            const minDays = this.customDate?.minimumDays || 0;

            // Start with next occurrence of target day
            if (date.getDate() >= targetDay) {
                date.setMonth(date.getMonth() + 1);
            }
            date.setDate(targetDay);

            // Ensure minimum days
            const minDate = new Date(invoiceDate);
            minDate.setDate(minDate.getDate() + minDays);
            if (date < minDate) {
                date.setMonth(date.getMonth() + 1);
            }

            return date;

        case 'installments':
            // For installments, return the first payment date
            if (this.installments && this.installments.length > 0) {
                const firstInstallment = this.installments[0];
                date.setDate(date.getDate() + firstInstallment.daysAfterInvoice);
            }
            return date;

        default:
            return date;
    }
};

/**
 * Calculate installment schedule
 */
paymentTermsSchema.methods.calculateInstallmentSchedule = function(invoiceDate, totalAmount) {
    if (this.termType !== 'installments' || !this.installments?.length) {
        return [{
            dueDate: this.calculateDueDate(invoiceDate),
            amount: totalAmount,
            percentage: 100
        }];
    }

    return this.installments.map(installment => {
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + installment.daysAfterInvoice);

        return {
            dueDate,
            amount: Math.round((totalAmount * installment.percentage) / 100),
            percentage: installment.percentage
        };
    });
};

/**
 * Calculate early payment discount
 */
paymentTermsSchema.methods.getEarlyPaymentDiscount = function(invoiceDate, paymentDate) {
    if (!this.earlyPaymentDiscounts?.length) return 0;

    const daysSinceInvoice = Math.floor(
        (new Date(paymentDate) - new Date(invoiceDate)) / (1000 * 60 * 60 * 24)
    );

    // Find applicable discount (sorted by days, take the best one that applies)
    const applicableDiscounts = this.earlyPaymentDiscounts
        .filter(d => daysSinceInvoice <= d.days)
        .sort((a, b) => b.discountPercentage - a.discountPercentage);

    return applicableDiscounts.length > 0 ? applicableDiscounts[0].discountPercentage : 0;
};

/**
 * Calculate late fee
 */
paymentTermsSchema.methods.calculateLateFee = function(invoiceDate, dueDate, amount, asOfDate = new Date()) {
    if (!this.lateFee?.enabled) return 0;

    const gracePeriodEnd = new Date(dueDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + (this.lateFee.gracePeriodDays || 0));

    if (new Date(asOfDate) <= gracePeriodEnd) return 0;

    const daysLate = Math.floor(
        (new Date(asOfDate) - gracePeriodEnd) / (1000 * 60 * 60 * 24)
    );

    let fee = 0;
    if (this.lateFee.type === 'percentage') {
        fee = Math.round((amount * this.lateFee.value) / 100);
    } else {
        fee = this.lateFee.value;
    }

    // Apply frequency multiplier
    switch (this.lateFee.frequency) {
        case 'daily':
            fee = fee * daysLate;
            break;
        case 'weekly':
            fee = fee * Math.ceil(daysLate / 7);
            break;
        case 'monthly':
            fee = fee * Math.ceil(daysLate / 30);
            break;
    }

    // Apply maximum cap
    if (this.lateFee.maxFee && fee > this.lateFee.maxFee) {
        fee = this.lateFee.maxFee;
    }

    return fee;
};

/**
 * Set as default (and unset others)
 */
paymentTermsSchema.methods.setAsDefault = async function(userId) {
    const query = {};
    if (this.firmId) {
        query.firmId = this.firmId;
    } else if (this.lawyerId) {
        query.lawyerId = this.lawyerId;
    }

    // Unset other defaults
    await mongoose.model('PaymentTerms').updateMany(
        { ...query, _id: { $ne: this._id } },
        { $set: { isDefault: false } }
    );

    this.isDefault = true;
    this.updatedBy = userId;
    await this.save();
    return this;
};

/**
 * Static: Initialize default payment terms
 */
paymentTermsSchema.statics.initializeDefaults = async function(firmId, lawyerId, userId) {
    const query = {};
    if (firmId) {
        query.firmId = firmId;
    } else if (lawyerId) {
        query.lawyerId = lawyerId;
    }

    const defaults = [
        {
            ...query,
            name: 'Due on Receipt',
            nameAr: 'مستحق عند الاستلام',
            code: 'DOR',
            termType: 'due_on_receipt',
            displayText: 'Due on Receipt',
            displayTextAr: 'مستحق عند الاستلام',
            isSystem: true,
            isDefault: true,
            createdBy: userId
        },
        {
            ...query,
            name: 'Net 7',
            nameAr: 'صافي 7 أيام',
            code: 'NET7',
            termType: 'net_days',
            netDays: 7,
            displayText: 'Net 7 Days',
            displayTextAr: 'صافي 7 أيام',
            isSystem: true,
            createdBy: userId
        },
        {
            ...query,
            name: 'Net 15',
            nameAr: 'صافي 15 يوم',
            code: 'NET15',
            termType: 'net_days',
            netDays: 15,
            displayText: 'Net 15 Days',
            displayTextAr: 'صافي 15 يوم',
            isSystem: true,
            createdBy: userId
        },
        {
            ...query,
            name: 'Net 30',
            nameAr: 'صافي 30 يوم',
            code: 'NET30',
            termType: 'net_days',
            netDays: 30,
            displayText: 'Net 30 Days',
            displayTextAr: 'صافي 30 يوم',
            isSystem: true,
            createdBy: userId
        },
        {
            ...query,
            name: 'Net 60',
            nameAr: 'صافي 60 يوم',
            code: 'NET60',
            termType: 'net_days',
            netDays: 60,
            displayText: 'Net 60 Days',
            displayTextAr: 'صافي 60 يوم',
            isSystem: true,
            createdBy: userId
        },
        {
            ...query,
            name: '2/10 Net 30',
            nameAr: '2% خصم خلال 10 أيام، صافي 30 يوم',
            code: '2/10NET30',
            termType: 'net_days',
            netDays: 30,
            displayText: '2% discount if paid within 10 days, Net 30',
            displayTextAr: '2% خصم إذا تم الدفع خلال 10 أيام، صافي 30 يوم',
            earlyPaymentDiscounts: [{ days: 10, discountPercentage: 2 }],
            isSystem: true,
            createdBy: userId
        },
        {
            ...query,
            name: 'End of Month',
            nameAr: 'نهاية الشهر',
            code: 'EOM',
            termType: 'end_of_month',
            displayText: 'Due End of Month',
            displayTextAr: 'مستحق في نهاية الشهر',
            isSystem: true,
            createdBy: userId
        }
    ];

    const result = [];
    for (const term of defaults) {
        const existing = await this.findOne({ ...query, code: term.code });
        if (!existing) {
            const newTerm = await this.create(term);
            result.push(newTerm);
        }
    }

    return result;
};

/**
 * Static: Get default term
 */
paymentTermsSchema.statics.getDefault = async function(firmId, lawyerId) {
    const query = {};
    if (firmId) {
        query.firmId = firmId;
    } else if (lawyerId) {
        query.lawyerId = lawyerId;
    }
    return this.findOne({ ...query, isDefault: true, isActive: true });
};

module.exports = mongoose.model('PaymentTerms', paymentTermsSchema);
