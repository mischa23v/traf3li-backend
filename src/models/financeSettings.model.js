const mongoose = require('mongoose');

const financeSettingsSchema = new mongoose.Schema({
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        unique: true,
        index: true
    },
    defaultCurrency: {
        type: String,
        default: 'SAR'
    },
    invoicePrefix: {
        type: String,
        default: 'INV-'
    },
    invoiceStartNumber: {
        type: Number,
        default: 1001
    },
    quotePrefix: {
        type: String,
        default: 'QT-'
    },
    quoteStartNumber: {
        type: Number,
        default: 1001
    },
    paymentTerms: {
        type: Number,
        default: 30 // Days
    },
    defaultTaxId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tax'
    },
    defaultPaymentModeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PaymentMode'
    },
    enableLateFees: {
        type: Boolean,
        default: false
    },
    lateFeePercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    enablePartialPayments: {
        type: Boolean,
        default: true
    }
}, {
    versionKey: false,
    timestamps: true
});

// Get or create settings for a firm
financeSettingsSchema.statics.getOrCreate = async function(firmId) {
    let settings = await this.findOne({ firmId });
    if (!settings) {
        settings = await this.create({ firmId });
    }
    return settings;
};

module.exports = mongoose.model('FinanceSettings', financeSettingsSchema);
