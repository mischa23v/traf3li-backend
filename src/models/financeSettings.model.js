const mongoose = require('mongoose');

const financeSettingsSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        unique: true,
        required: true
    },

    // Numbering - Invoice
    invoicePrefix: {
        type: String,
        default: 'INV-'
    },
    invoiceSuffix: {
        type: String,
        default: ''
    },
    lastInvoiceNumber: {
        type: Number,
        default: 0
    },

    // Numbering - Quote
    quotePrefix: {
        type: String,
        default: 'QOT-'
    },
    quoteSuffix: {
        type: String,
        default: ''
    },
    lastQuoteNumber: {
        type: Number,
        default: 0
    },

    // Numbering - Payment
    paymentPrefix: {
        type: String,
        default: 'PAY-'
    },
    paymentSuffix: {
        type: String,
        default: ''
    },
    lastPaymentNumber: {
        type: Number,
        default: 0
    },

    // Numbering Options
    includeYearInNumber: {
        type: Boolean,
        default: true
    },
    includeMonthInNumber: {
        type: Boolean,
        default: false
    },
    numberDigits: {
        type: Number,
        default: 4,
        min: 3,
        max: 8
    },
    resetNumberYearly: {
        type: Boolean,
        default: true
    },

    // Currency Settings
    defaultCurrency: {
        type: String,
        default: 'SAR'
    },
    currencySymbol: {
        type: String,
        default: 'ر.س'
    },
    currencySymbolPosition: {
        type: String,
        enum: ['before', 'after'],
        default: 'before'
    },
    decimalSeparator: {
        type: String,
        default: '.'
    },
    thousandSeparator: {
        type: String,
        default: ','
    },
    decimalPlaces: {
        type: Number,
        default: 2,
        min: 0,
        max: 4
    },

    // Tax Settings
    defaultTaxRate: {
        type: Number,
        default: 15 // Saudi VAT
    },
    showProductTax: {
        type: Boolean,
        default: true
    },
    taxInclusive: {
        type: Boolean,
        default: false
    },

    // Payment Terms
    defaultPaymentTerms: {
        type: Number,
        default: 30 // Days
    },
    defaultQuoteValidity: {
        type: Number,
        default: 30 // Days
    },

    // Footer Text
    invoiceFooterText: {
        type: String
    },
    invoiceFooterTextAr: {
        type: String
    },
    quoteFooterText: {
        type: String
    },
    quoteFooterTextAr: {
        type: String
    },
    invoiceTerms: {
        type: String
    },
    invoiceTermsAr: {
        type: String
    },
    quoteTerms: {
        type: String
    },
    quoteTermsAr: {
        type: String
    },

    // Email Settings
    sendInvoiceOnCreate: {
        type: Boolean,
        default: false
    },
    sendQuoteOnCreate: {
        type: Boolean,
        default: false
    },
    sendPaymentReceipt: {
        type: Boolean,
        default: true
    },
    invoiceEmailSubject: {
        type: String,
        default: 'Invoice #{{invoiceNumber}} from {{companyName}}'
    },
    quoteEmailSubject: {
        type: String,
        default: 'Quote #{{quoteNumber}} from {{companyName}}'
    },

    // Reminders
    overdueReminderEnabled: {
        type: Boolean,
        default: true
    },
    overdueReminderDays: {
        type: [Number],
        default: [1, 7, 14, 30] // Send reminders after these many days overdue
    },
    quoteExpiryReminderEnabled: {
        type: Boolean,
        default: true
    },
    quoteExpiryReminderDays: {
        type: Number,
        default: 3 // Days before expiry
    }
}, {
    versionKey: false,
    timestamps: true
});

// Index
financeSettingsSchema.index({ organizationId: 1 });

// Static method to get or create finance settings for an organization
financeSettingsSchema.statics.getOrCreate = async function(organizationId) {
    let settings = await this.findOne({ organizationId });
    if (!settings) {
        settings = await this.create({ organizationId });
    }
    return settings;
};

// Method to get next invoice number and increment
financeSettingsSchema.methods.getNextInvoiceNumber = async function() {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    // Check if we need to reset yearly
    if (this.resetNumberYearly) {
        const lastUpdate = this.updatedAt || this.createdAt;
        if (lastUpdate && lastUpdate.getFullYear() < year) {
            this.lastInvoiceNumber = 0;
        }
    }

    this.lastInvoiceNumber += 1;
    await this.save();

    const numStr = String(this.lastInvoiceNumber).padStart(this.numberDigits, '0');
    const yearStr = this.includeYearInNumber ? `${year}-` : '';
    const monthStr = this.includeMonthInNumber ? `${month}-` : '';

    return `${this.invoicePrefix}${yearStr}${monthStr}${numStr}${this.invoiceSuffix}`;
};

// Method to get next quote number and increment
financeSettingsSchema.methods.getNextQuoteNumber = async function() {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    if (this.resetNumberYearly) {
        const lastUpdate = this.updatedAt || this.createdAt;
        if (lastUpdate && lastUpdate.getFullYear() < year) {
            this.lastQuoteNumber = 0;
        }
    }

    this.lastQuoteNumber += 1;
    await this.save();

    const numStr = String(this.lastQuoteNumber).padStart(this.numberDigits, '0');
    const yearStr = this.includeYearInNumber ? `${year}-` : '';
    const monthStr = this.includeMonthInNumber ? `${month}-` : '';

    return `${this.quotePrefix}${yearStr}${monthStr}${numStr}${this.quoteSuffix}`;
};

// Method to get next payment number and increment
financeSettingsSchema.methods.getNextPaymentNumber = async function() {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    if (this.resetNumberYearly) {
        const lastUpdate = this.updatedAt || this.createdAt;
        if (lastUpdate && lastUpdate.getFullYear() < year) {
            this.lastPaymentNumber = 0;
        }
    }

    this.lastPaymentNumber += 1;
    await this.save();

    const numStr = String(this.lastPaymentNumber).padStart(this.numberDigits, '0');
    const yearStr = this.includeYearInNumber ? `${year}-` : '';
    const monthStr = this.includeMonthInNumber ? `${month}-` : '';

    return `${this.paymentPrefix}${yearStr}${monthStr}${numStr}${this.paymentSuffix}`;
};

module.exports = mongoose.model('FinanceSettings', financeSettingsSchema);
