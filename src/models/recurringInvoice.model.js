/**
 * Recurring Invoice Model
 *
 * Templates for automatically generating invoices on a schedule.
 * Supports various frequencies: weekly, bi-weekly, monthly, quarterly, annually.
 */

const mongoose = require('mongoose');

const recurringInvoiceItemSchema = new mongoose.Schema({
    description: { type: String, required: true, trim: true },
    descriptionAr: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 0.01 },
    unitPrice: { type: Number, required: true, min: 0 }, // In halalas
    taxRate: { type: Number, default: 15, min: 0, max: 100 },
    discountType: { type: String, enum: ['percentage', 'fixed'], default: 'fixed' },
    discountValue: { type: Number, default: 0 },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' }
}, { _id: true });

const recurringInvoiceSchema = new mongoose.Schema({
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

    // Template Name
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, trim: true },

    // Client
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true,
        index: true
    },

    // Case (optional - for retainer/ongoing matters)
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case'
    },

    // Retainer Reference (optional)
    retainerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Retainer'
    },

    // Schedule
    frequency: {
        type: String,
        enum: ['weekly', 'biweekly', 'monthly', 'quarterly', 'semiannually', 'annually'],
        required: true
    },
    dayOfMonth: { type: Number, min: 1, max: 28 }, // For monthly/quarterly/annually
    dayOfWeek: { type: Number, min: 0, max: 6 }, // 0 = Sunday, for weekly/biweekly
    specificDates: [{ type: Number, min: 1, max: 28 }], // Multiple dates per month

    // Schedule Period
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date }, // Optional - runs indefinitely if not set
    nextGenerationDate: { type: Date, required: true, index: true },
    lastGeneratedDate: { type: Date },

    // Generation Limits
    timesGenerated: { type: Number, default: 0 },
    maxGenerations: { type: Number }, // Optional - stops after X generations

    // Status
    status: {
        type: String,
        enum: ['active', 'paused', 'completed', 'cancelled'],
        default: 'active',
        index: true
    },
    pausedAt: { type: Date },
    pausedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    pauseReason: { type: String },

    // Invoice Template
    items: {
        type: [recurringInvoiceItemSchema],
        validate: {
            validator: function(items) {
                return items && items.length > 0;
            },
            message: 'Recurring invoice must have at least one item'
        }
    },

    // Calculated Amounts (all in halalas)
    subtotal: { type: Number, required: true },
    discountTotal: { type: Number, default: 0 },
    vatRate: { type: Number, default: 15 },
    vatAmount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: 'SAR' },

    // Invoice Settings
    paymentTermsDays: { type: Number, default: 30 },
    paymentTermsTemplate: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentTerms' },
    invoicePrefix: { type: String },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'InvoiceTemplate' },

    // Automation Settings
    autoSend: { type: Boolean, default: false },
    autoSendDays: { type: Number, default: 0 }, // Days after generation to send
    sendToEmails: [{ type: String, lowercase: true }],
    ccEmails: [{ type: String, lowercase: true }],
    emailSubject: { type: String },
    emailSubjectAr: { type: String },
    emailBody: { type: String },
    emailBodyAr: { type: String },

    // Auto-approval
    autoApprove: { type: Boolean, default: false },

    // Notes
    notes: { type: String, trim: true },
    notesAr: { type: String, trim: true },
    internalNotes: { type: String, trim: true },

    // Generated Invoices History
    generatedInvoiceIds: [{
        invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
        invoiceNumber: { type: String },
        generatedAt: { type: Date },
        amount: { type: Number }
    }],

    // History
    history: [{
        action: { type: String },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        performedAt: { type: Date, default: Date.now },
        details: { type: mongoose.Schema.Types.Mixed }
    }],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true,
    versionKey: false
});

// Indexes
recurringInvoiceSchema.index({ firmId: 1, status: 1 });
recurringInvoiceSchema.index({ firmId: 1, nextGenerationDate: 1, status: 1 });
recurringInvoiceSchema.index({ firmId: 1, clientId: 1 });
recurringInvoiceSchema.index({ lawyerId: 1, status: 1, nextGenerationDate: 1 });

/**
 * Calculate next generation date
 */
recurringInvoiceSchema.methods.calculateNextGenerationDate = function(fromDate = new Date()) {
    const date = new Date(fromDate);

    switch (this.frequency) {
        case 'weekly':
            date.setDate(date.getDate() + 7);
            if (this.dayOfWeek !== undefined) {
                while (date.getDay() !== this.dayOfWeek) {
                    date.setDate(date.getDate() + 1);
                }
            }
            break;

        case 'biweekly':
            date.setDate(date.getDate() + 14);
            if (this.dayOfWeek !== undefined) {
                while (date.getDay() !== this.dayOfWeek) {
                    date.setDate(date.getDate() + 1);
                }
            }
            break;

        case 'monthly':
            date.setMonth(date.getMonth() + 1);
            if (this.dayOfMonth) {
                date.setDate(Math.min(this.dayOfMonth, this.getLastDayOfMonth(date)));
            }
            break;

        case 'quarterly':
            date.setMonth(date.getMonth() + 3);
            if (this.dayOfMonth) {
                date.setDate(Math.min(this.dayOfMonth, this.getLastDayOfMonth(date)));
            }
            break;

        case 'semiannually':
            date.setMonth(date.getMonth() + 6);
            if (this.dayOfMonth) {
                date.setDate(Math.min(this.dayOfMonth, this.getLastDayOfMonth(date)));
            }
            break;

        case 'annually':
            date.setFullYear(date.getFullYear() + 1);
            if (this.dayOfMonth) {
                date.setDate(Math.min(this.dayOfMonth, this.getLastDayOfMonth(date)));
            }
            break;
    }

    return date;
};

/**
 * Get last day of month
 */
recurringInvoiceSchema.methods.getLastDayOfMonth = function(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

/**
 * Calculate totals
 */
recurringInvoiceSchema.methods.calculateTotals = function() {
    let subtotal = 0;
    let discountTotal = 0;
    let vatAmount = 0;

    this.items.forEach(item => {
        const lineTotal = item.quantity * item.unitPrice;
        let lineDiscount = 0;

        if (item.discountType === 'percentage') {
            lineDiscount = Math.round((lineTotal * item.discountValue) / 100);
        } else {
            lineDiscount = item.discountValue || 0;
        }

        const taxableAmount = lineTotal - lineDiscount;
        const lineTax = Math.round((taxableAmount * (item.taxRate || this.vatRate)) / 100);

        subtotal += lineTotal;
        discountTotal += lineDiscount;
        vatAmount += lineTax;
    });

    this.subtotal = subtotal;
    this.discountTotal = discountTotal;
    this.vatAmount = vatAmount;
    this.total = subtotal - discountTotal + vatAmount;

    return this;
};

/**
 * Pause recurring invoice
 */
recurringInvoiceSchema.methods.pause = async function(userId, reason) {
    if (this.status !== 'active') {
        throw new Error('Only active recurring invoices can be paused');
    }

    this.status = 'paused';
    this.pausedAt = new Date();
    this.pausedBy = userId;
    this.pauseReason = reason;
    this.history.push({
        action: 'paused',
        performedBy: userId,
        details: { reason }
    });

    await this.save();
    return this;
};

/**
 * Resume recurring invoice
 */
recurringInvoiceSchema.methods.resume = async function(userId) {
    if (this.status !== 'paused') {
        throw new Error('Only paused recurring invoices can be resumed');
    }

    // Recalculate next generation date from today
    this.nextGenerationDate = this.calculateNextGenerationDate(new Date());
    this.status = 'active';
    this.history.push({
        action: 'resumed',
        performedBy: userId,
        details: { nextGenerationDate: this.nextGenerationDate }
    });

    await this.save();
    return this;
};

/**
 * Cancel recurring invoice
 */
recurringInvoiceSchema.methods.cancel = async function(userId, reason) {
    if (['completed', 'cancelled'].includes(this.status)) {
        throw new Error('Recurring invoice is already completed or cancelled');
    }

    this.status = 'cancelled';
    this.history.push({
        action: 'cancelled',
        performedBy: userId,
        details: { reason }
    });

    await this.save();
    return this;
};

/**
 * Check if should generate invoice
 */
recurringInvoiceSchema.methods.shouldGenerate = function() {
    if (this.status !== 'active') return false;
    if (this.endDate && new Date() > this.endDate) return false;
    if (this.maxGenerations && this.timesGenerated >= this.maxGenerations) return false;
    return new Date() >= this.nextGenerationDate;
};

/**
 * Static: Get due recurring invoices for generation
 */
recurringInvoiceSchema.statics.getDueForGeneration = async function(firmId = null, lawyerId = null) {
    const query = {
        status: 'active',
        nextGenerationDate: { $lte: new Date() }
    };

    if (firmId) query.firmId = firmId;
    if (lawyerId) query.lawyerId = lawyerId;

    return this.find(query)
        .populate('clientId', 'firstName lastName companyName email')
        .sort({ nextGenerationDate: 1 });
};

/**
 * Static: Get statistics
 */
recurringInvoiceSchema.statics.getStats = async function(firmId, lawyerId) {
    const query = firmId ? { firmId } : { lawyerId };

    const stats = await this.aggregate([
        { $match: query },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$total' }
            }
        }
    ]);

    // Calculate monthly recurring revenue
    const monthlyRevenue = await this.aggregate([
        {
            $match: {
                ...query,
                status: 'active',
                frequency: 'monthly'
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: '$total' }
            }
        }
    ]);

    const result = {
        total: 0,
        active: 0,
        paused: 0,
        completed: 0,
        cancelled: 0,
        monthlyRecurringRevenue: monthlyRevenue[0]?.total || 0
    };

    stats.forEach(s => {
        result.total += s.count;
        result[s._id] = s.count;
    });

    return result;
};

module.exports = mongoose.model('RecurringInvoice', recurringInvoiceSchema);
