const mongoose = require('mongoose');

const retainerSchema = new mongoose.Schema({
    retainerNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    // Accounting: Retainer liability account
    retainerLiabilityAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
    },
    // Accounting: Bank account for deposits
    bankAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
    },
    // GL entries for this retainer
    glEntries: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GeneralLedger'
    }],
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
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        index: true
    },
    retainerType: {
        type: String,
        enum: ['advance', 'evergreen', 'flat_fee', 'security'],
        required: true
    },
    initialAmount: {
        type: Number,
        required: true,
        min: 0
    },
    currentBalance: {
        type: Number,
        required: true,
        min: 0
    },
    minimumBalance: {
        type: Number,
        default: 0
    },
    startDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    endDate: Date,
    autoReplenish: {
        type: Boolean,
        default: false
    },
    replenishThreshold: Number,
    replenishAmount: Number,
    status: {
        type: String,
        enum: ['active', 'depleted', 'refunded', 'expired'],
        default: 'active',
        index: true
    },
    consumptions: [{
        date: {
            type: Date,
            default: Date.now
        },
        amount: {
            type: Number,
            required: true
        },
        invoiceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Invoice'
        },
        description: String
    }],
    deposits: [{
        date: {
            type: Date,
            default: Date.now
        },
        amount: {
            type: Number,
            required: true
        },
        paymentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Payment'
        }
    }],
    lowBalanceAlertSent: {
        type: Boolean,
        default: false
    },
    lowBalanceAlertDate: Date,
    agreementUrl: String,
    agreementSignedDate: Date,
    notes: String,
    termsAndConditions: String,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
retainerSchema.index({ clientId: 1, status: 1 });
retainerSchema.index({ retainerNumber: 1 });
retainerSchema.index({ lawyerId: 1, status: 1 });

// Auto-generate retainer number
retainerSchema.pre('save', async function(next) {
    if (this.isNew && !this.retainerNumber) {
        const year = new Date().getFullYear();
        const count = await this.constructor.countDocuments({
            retainerNumber: new RegExp(`^RET-${year}`)
        });
        this.retainerNumber = `RET-${year}-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

/**
 * Consume retainer (with GL posting)
 * DR: Unearned Revenue (2130) / Retainer Liability
 * CR: Service Revenue (4100)
 * @param {Number} amount - Amount to consume (halalas)
 * @param {ObjectId} invoiceId - Related invoice
 * @param {String} description - Description
 * @param {Session} session - MongoDB session
 */
retainerSchema.methods.consume = async function(amount, invoiceId, description, session = null) {
    const GeneralLedger = mongoose.model('GeneralLedger');
    const Account = mongoose.model('Account');
    const { toHalalas, subtractAmounts } = require('../utils/currency');

    // Convert amount if needed
    const amountHalalas = Number.isInteger(amount) ? amount : toHalalas(amount);

    if (this.currentBalance < amountHalalas) {
        throw new Error('مبلغ العربون غير كافٍ - Insufficient retainer balance');
    }

    // Get retainer liability account (use default if not set)
    let liabilityAccountId = this.retainerLiabilityAccountId;
    if (!liabilityAccountId) {
        const liabilityAccount = await Account.findOne({ code: '2130' }); // Unearned Revenue
        if (!liabilityAccount) throw new Error('Retainer liability account not found');
        liabilityAccountId = liabilityAccount._id;
        this.retainerLiabilityAccountId = liabilityAccountId;
    }

    // Get service revenue account
    const revenueAccount = await Account.findOne({ code: '4100' }); // Legal Service Fees
    if (!revenueAccount) throw new Error('Service revenue account not found');

    // Create GL entry: DR Unearned Revenue, CR Service Revenue
    const glEntry = await GeneralLedger.postTransaction({
        transactionDate: new Date(),
        description: `Retainer ${this.retainerNumber} consumed - ${description || 'Applied to invoice'}`,
        descriptionAr: `استهلاك العربون ${this.retainerNumber}`,
        debitAccountId: liabilityAccountId,
        creditAccountId: revenueAccount._id,
        amount: amountHalalas,
        referenceId: this._id,
        referenceModel: 'Retainer',
        referenceNumber: this.retainerNumber,
        caseId: this.caseId,
        clientId: this.clientId,
        lawyerId: this.lawyerId,
        meta: {
            invoiceId,
            action: 'consume',
            previousBalance: this.currentBalance
        },
        createdBy: this.lawyerId
    }, session);

    // Update retainer
    this.consumptions.push({
        date: new Date(),
        amount: amountHalalas,
        invoiceId,
        description
    });

    this.currentBalance = subtractAmounts(this.currentBalance, amountHalalas);
    this.glEntries = this.glEntries || [];
    this.glEntries.push(glEntry._id);

    // Check if depleted
    if (this.currentBalance <= 0) {
        this.status = 'depleted';
    }

    // Check for low balance alert
    if (this.minimumBalance > 0 && this.currentBalance <= this.minimumBalance && !this.lowBalanceAlertSent) {
        this.lowBalanceAlertSent = true;
        this.lowBalanceAlertDate = new Date();
    }

    const options = session ? { session } : {};
    await this.save(options);

    return { retainer: this, glEntry };
};

/**
 * Deposit/Replenish retainer (with GL posting)
 * DR: Bank Account (1102)
 * CR: Unearned Revenue (2130) / Retainer Liability
 * @param {Number} amount - Amount to deposit (halalas)
 * @param {ObjectId} paymentId - Related payment
 * @param {Session} session - MongoDB session
 */
retainerSchema.methods.deposit = async function(amount, paymentId = null, session = null) {
    const GeneralLedger = mongoose.model('GeneralLedger');
    const Account = mongoose.model('Account');
    const { toHalalas, addAmounts } = require('../utils/currency');

    // Convert amount if needed
    const amountHalalas = Number.isInteger(amount) ? amount : toHalalas(amount);

    // Get bank account (use default if not set)
    let bankAcctId = this.bankAccountId;
    if (!bankAcctId) {
        const bankAccount = await Account.findOne({ code: '1102' }); // Bank Account - Main
        if (!bankAccount) throw new Error('Bank account not found');
        bankAcctId = bankAccount._id;
        this.bankAccountId = bankAcctId;
    }

    // Get retainer liability account (use default if not set)
    let liabilityAccountId = this.retainerLiabilityAccountId;
    if (!liabilityAccountId) {
        const liabilityAccount = await Account.findOne({ code: '2130' }); // Unearned Revenue
        if (!liabilityAccount) throw new Error('Retainer liability account not found');
        liabilityAccountId = liabilityAccount._id;
        this.retainerLiabilityAccountId = liabilityAccountId;
    }

    // Create GL entry: DR Bank, CR Unearned Revenue
    const glEntry = await GeneralLedger.postTransaction({
        transactionDate: new Date(),
        description: `Retainer ${this.retainerNumber} deposit`,
        descriptionAr: `إيداع العربون ${this.retainerNumber}`,
        debitAccountId: bankAcctId,
        creditAccountId: liabilityAccountId,
        amount: amountHalalas,
        referenceId: this._id,
        referenceModel: 'Retainer',
        referenceNumber: this.retainerNumber,
        caseId: this.caseId,
        clientId: this.clientId,
        lawyerId: this.lawyerId,
        meta: {
            paymentId,
            action: 'deposit',
            previousBalance: this.currentBalance
        },
        createdBy: this.lawyerId
    }, session);

    // Update retainer
    this.deposits.push({
        date: new Date(),
        amount: amountHalalas,
        paymentId
    });

    this.currentBalance = addAmounts(this.currentBalance, amountHalalas);
    this.glEntries = this.glEntries || [];
    this.glEntries.push(glEntry._id);

    if (this.status === 'depleted') {
        this.status = 'active';
    }

    this.lowBalanceAlertSent = false;

    const options = session ? { session } : {};
    await this.save(options);

    return { retainer: this, glEntry };
};

// Legacy method alias for backward compatibility
retainerSchema.methods.replenish = function(amount, paymentId) {
    return this.deposit(amount, paymentId);
};

/**
 * Compute current balance from GL (for verification)
 */
retainerSchema.methods.getGLBalance = async function() {
    const GeneralLedger = mongoose.model('GeneralLedger');

    // Get retainer liability account
    let liabilityAccountId = this.retainerLiabilityAccountId;
    if (!liabilityAccountId) {
        const Account = mongoose.model('Account');
        const liabilityAccount = await Account.findOne({ code: '2130' });
        if (!liabilityAccount) return null;
        liabilityAccountId = liabilityAccount._id;
    }

    // Sum deposits (credits to liability)
    const depositsResult = await GeneralLedger.aggregate([
        {
            $match: {
                referenceId: this._id,
                referenceModel: 'Retainer',
                creditAccountId: liabilityAccountId,
                status: 'posted'
            }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalDeposits = depositsResult[0]?.total || 0;

    // Sum consumptions (debits from liability)
    const consumptionsResult = await GeneralLedger.aggregate([
        {
            $match: {
                referenceId: this._id,
                referenceModel: 'Retainer',
                debitAccountId: liabilityAccountId,
                status: 'posted'
            }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalConsumptions = consumptionsResult[0]?.total || 0;

    return {
        totalDeposits,
        totalConsumptions,
        balance: totalDeposits - totalConsumptions
    };
};

module.exports = mongoose.model('Retainer', retainerSchema);
