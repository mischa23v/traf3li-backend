const mongoose = require('mongoose');

const clientTrustBalanceSchema = new mongoose.Schema({
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
clientTrustBalanceSchema.index({ lawyerId: 1, accountId: 1 });
clientTrustBalanceSchema.index({ lawyerId: 1, clientId: 1 });
clientTrustBalanceSchema.index({ accountId: 1, clientId: 1 }, { unique: true });

// Static method: Get or create balance
clientTrustBalanceSchema.statics.getOrCreate = async function(lawyerId, accountId, clientId, caseId = null) {
    let balance = await this.findOne({ accountId, clientId });

    if (!balance) {
        balance = await this.create({
            lawyerId,
            accountId,
            clientId,
            caseId
        });
    }

    return balance;
};

// Static method: Update balance
clientTrustBalanceSchema.statics.updateBalance = async function(accountId, clientId, amount, type, transactionType) {
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
        { accountId, clientId },
        update,
        { new: true }
    );
};

module.exports = mongoose.model('ClientTrustBalance', clientTrustBalanceSchema);
