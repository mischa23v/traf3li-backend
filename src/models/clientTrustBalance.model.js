const mongoose = require('mongoose');

const clientTrustBalanceSchema = new mongoose.Schema({
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TrustAccount',
        required: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case'
    },
    balance: {
        type: Number,
        default: 0
    },
    availableBalance: {
        type: Number,
        default: 0
    },
    pendingBalance: {
        type: Number,
        default: 0
    },
    lastTransaction: Date,
    lastTransactionType: String,
    lastTransactionAmount: Number
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
clientTrustBalanceSchema.index({ firmId: 1, lawyerId: 1, accountId: 1 });
clientTrustBalanceSchema.index({ firmId: 1, clientId: 1 });
clientTrustBalanceSchema.index({ firmId: 1, accountId: 1, clientId: 1 }, { unique: true });

// Static method: Get or create balance (requires firmId for security)
clientTrustBalanceSchema.statics.getOrCreate = async function(firmId, lawyerId, accountId, clientId, caseId = null) {
    // SECURITY: firmId is required
    if (!firmId) {
        throw new Error('firmId is required for client trust balance');
    }

    let balance = await this.findOne({ firmId, accountId, clientId });

    if (!balance) {
        balance = await this.create({
            firmId,
            lawyerId,
            accountId,
            clientId,
            caseId
        });
    }

    return balance;
};

// Static method: Update balance (requires firmId for security)
clientTrustBalanceSchema.statics.updateBalance = async function(firmId, accountId, clientId, amount, type, transactionType) {
    // SECURITY: firmId is required
    if (!firmId) {
        throw new Error('firmId is required for client trust balance update');
    }

    const update = type === 'add'
        ? {
            $inc: { balance: amount, availableBalance: amount },
            lastTransaction: new Date(),
            lastTransactionType: transactionType,
            lastTransactionAmount: amount
        }
        : {
            $inc: { balance: -amount, availableBalance: -amount },
            lastTransaction: new Date(),
            lastTransactionType: transactionType,
            lastTransactionAmount: -amount
        };

    return await this.findOneAndUpdate(
        { firmId, accountId, clientId },
        update,
        { new: true }
    );
};

module.exports = mongoose.model('ClientTrustBalance', clientTrustBalanceSchema);
