/**
 * Finance Setup Wizard Model
 *
 * Manages the initial finance configuration for a firm
 * Includes company info, fiscal year, tax settings, etc.
 */

const mongoose = require('mongoose');

const bankAccountInfoSchema = new mongoose.Schema({
    bankName: { type: String, trim: true },
    bankNameAr: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    iban: { type: String, trim: true },
    swiftCode: { type: String, trim: true },
    isDefault: { type: Boolean, default: false }
}, { _id: true });

const financeSetupSchema = new mongoose.Schema({
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

    // Step 1: Company Info
    companyInfo: {
        companyName: { type: String, trim: true },
        companyNameAr: { type: String, trim: true },
        crNumber: { type: String, trim: true }, // Commercial Registration Number
        vatNumber: { type: String, trim: true }, // VAT Registration Number
        logo: { type: String },
        address: { type: String, trim: true },
        addressAr: { type: String, trim: true },
        city: { type: String, trim: true },
        cityAr: { type: String, trim: true },
        country: { type: String, default: 'SA' },
        postalCode: { type: String, trim: true },
        phone: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true }
    },

    // Step 2: Fiscal Year Settings
    fiscalYear: {
        startMonth: { type: Number, min: 1, max: 12, default: 1 }, // 1 = January
        startDate: { type: Date },
        endDate: { type: Date },
        currentPeriod: { type: Number, min: 1, max: 13, default: 1 },
        currentYear: { type: Number }
    },

    // Step 3: Chart of Accounts Template
    chartOfAccounts: {
        template: {
            type: String,
            enum: ['saudi_standard', 'ifrs', 'custom'],
            default: 'saudi_standard'
        },
        customized: { type: Boolean, default: false },
        initialized: { type: Boolean, default: false },
        initializationDate: { type: Date }
    },

    // Step 4: Currency Settings
    currency: {
        defaultCurrency: { type: String, default: 'SAR' },
        multiCurrencyEnabled: { type: Boolean, default: false },
        additionalCurrencies: [{ type: String }],
        exchangeRateUpdateFrequency: {
            type: String,
            enum: ['manual', 'daily', 'weekly'],
            default: 'manual'
        }
    },

    // Step 5: Tax Settings
    taxSettings: {
        vatRate: { type: Number, default: 15, min: 0, max: 100 },
        taxCalculationMethod: {
            type: String,
            enum: ['exclusive', 'inclusive'],
            default: 'exclusive'
        },
        zatcaCompliance: { type: Boolean, default: true },
        zatcaPhase: {
            type: String,
            enum: ['phase1', 'phase2'],
            default: 'phase2'
        },
        zatcaDeviceId: { type: String },
        zatcaApiKey: { type: String },
        taxExemptCategories: [{ type: String }]
    },

    // Step 6: Bank Accounts
    bankAccounts: [bankAccountInfoSchema],

    // Step 7: Opening Balances
    openingBalances: {
        asOfDate: { type: Date },
        cash: { type: Number, default: 0 }, // In halalas
        bank: { type: Number, default: 0 },
        receivables: { type: Number, default: 0 },
        payables: { type: Number, default: 0 },
        capital: { type: Number, default: 0 },
        retainedEarnings: { type: Number, default: 0 },
        completed: { type: Boolean, default: false },
        journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' }
    },

    // Step 8: Invoice Settings
    invoiceSettings: {
        prefix: { type: String, default: 'INV-', trim: true },
        nextNumber: { type: Number, default: 1, min: 1 },
        defaultPaymentTerms: { type: Number, default: 30 }, // Days
        defaultTemplate: { type: String, default: 'standard' },
        autoSendEnabled: { type: Boolean, default: false },
        reminderEnabled: { type: Boolean, default: true },
        reminderDays: [{ type: Number }], // e.g., [7, 3, 1, -1, -7]
        lateFeesEnabled: { type: Boolean, default: false },
        lateFeePercentage: { type: Number, default: 0 },
        showQRCode: { type: Boolean, default: true },
        showBilingual: { type: Boolean, default: true }
    },

    // Step 9: Payment Methods
    paymentMethods: {
        bankTransfer: { type: Boolean, default: true },
        cash: { type: Boolean, default: true },
        creditCard: { type: Boolean, default: false },
        check: { type: Boolean, default: false },
        onlinePayment: { type: Boolean, default: false },
        mada: { type: Boolean, default: false },
        applePay: { type: Boolean, default: false },
        tabby: { type: Boolean, default: false },
        tamara: { type: Boolean, default: false },
        defaultBankAccount: {
            bankName: { type: String },
            accountNumber: { type: String },
            iban: { type: String }
        }
    },

    // Setup Progress Tracking
    currentStep: { type: Number, default: 1, min: 1, max: 9 },
    completedSteps: [{ type: Number }],
    setupCompleted: { type: Boolean, default: false },
    completedAt: { type: Date },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Audit
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true,
    versionKey: false
});

// Indexes
financeSetupSchema.index({ firmId: 1 }, { unique: true, sparse: true });
financeSetupSchema.index({ lawyerId: 1 }, { unique: true, sparse: true });

/**
 * Get or create finance setup for firm/lawyer
 */
financeSetupSchema.statics.getOrCreate = async function(firmId, lawyerId, userId) {
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
financeSetupSchema.methods.completeStep = async function(stepNumber, userId) {
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
financeSetupSchema.methods.completeSetup = async function(userId) {
    this.setupCompleted = true;
    this.completedAt = new Date();
    this.completedBy = userId;
    this.updatedBy = userId;
    await this.save();
    return this;
};

/**
 * Check if all required steps are completed
 */
financeSetupSchema.methods.canComplete = function() {
    const requiredSteps = [1, 2, 3, 5, 8]; // Company, Fiscal Year, Chart of Accounts, Tax, Invoice Settings
    return requiredSteps.every(step => this.completedSteps.includes(step));
};

module.exports = mongoose.model('FinanceSetup', financeSetupSchema);
