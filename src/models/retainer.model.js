const mongoose = require('mongoose');

const retainerSchema = new mongoose.Schema({
    retainerNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
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

// Method to consume retainer
retainerSchema.methods.consume = function(amount, invoiceId, description) {
    if (this.currentBalance < amount) {
        throw new Error('مبلغ العربون غير كافٍ');
    }

    this.consumptions.push({
        date: new Date(),
        amount,
        invoiceId,
        description
    });

    this.currentBalance -= amount;

    // Check if depleted
    if (this.currentBalance <= 0) {
        this.status = 'depleted';
    }

    // Check for low balance alert
    if (this.minimumBalance > 0 && this.currentBalance <= this.minimumBalance && !this.lowBalanceAlertSent) {
        this.lowBalanceAlertSent = true;
        this.lowBalanceAlertDate = new Date();
    }

    return this.save();
};

// Method to replenish retainer
retainerSchema.methods.replenish = function(amount, paymentId) {
    this.deposits.push({
        date: new Date(),
        amount,
        paymentId
    });

    this.currentBalance += amount;

    if (this.status === 'depleted') {
        this.status = 'active';
    }

    this.lowBalanceAlertSent = false;

    return this.save();
};

module.exports = mongoose.model('Retainer', retainerSchema);
