const mongoose = require('mongoose');

const clientDetailSchema = new mongoose.Schema({
    clientId: mongoose.Schema.Types.ObjectId,
    clientName: String,
    ledgerBalance: Number,
    bookBalance: Number,
    difference: Number
});

const threeWayReconciliationSchema = new mongoose.Schema({
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
    reconciliationDate: {
        type: Date,
        required: true
    },
    bankBalance: {
        type: Number,
        required: true
    },
    bookBalance: {
        type: Number,
        required: true
    },
    clientLedgerBalance: {
        type: Number,
        required: true
    },
    isBalanced: {
        type: Boolean,
        required: true
    },
    discrepancies: {
        bankToBook: Number,
        bookToLedger: Number,
        bankToLedger: Number
    },
    details: [clientDetailSchema],
    status: {
        type: String,
        enum: ['balanced', 'unbalanced', 'exception'],
        required: true
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verifiedAt: Date,
    notes: String
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
threeWayReconciliationSchema.index({ lawyerId: 1, accountId: 1 });
threeWayReconciliationSchema.index({ accountId: 1, reconciliationDate: -1 });

// Static method: Run three-way reconciliation
threeWayReconciliationSchema.statics.runReconciliation = async function(lawyerId, accountId, bankBalance) {
    const TrustAccount = mongoose.model('TrustAccount');
    const ClientTrustBalance = mongoose.model('ClientTrustBalance');
    const Client = mongoose.model('Client');

    // Get account balance (book balance)
    const account = await TrustAccount.findById(accountId);
    if (!account) throw new Error('Trust account not found');

    const bookBalance = account.balance;

    // Get all client ledger balances
    const clientBalances = await ClientTrustBalance.find({ accountId })
        .populate('clientId', 'name fullName');

    const clientLedgerBalance = clientBalances.reduce((sum, cb) => sum + cb.balance, 0);

    // Calculate discrepancies
    const bankToBook = bankBalance - bookBalance;
    const bookToLedger = bookBalance - clientLedgerBalance;
    const bankToLedger = bankBalance - clientLedgerBalance;

    // Check if balanced (within tolerance of 0.01)
    const tolerance = 0.01;
    const isBalanced = Math.abs(bankToBook) < tolerance &&
                       Math.abs(bookToLedger) < tolerance &&
                       Math.abs(bankToLedger) < tolerance;

    // Build client details
    const details = clientBalances.map(cb => ({
        clientId: cb.clientId._id,
        clientName: cb.clientId.name || cb.clientId.fullName,
        ledgerBalance: cb.balance,
        bookBalance: cb.balance, // In proper implementation, would track separately
        difference: 0
    }));

    // Determine status
    let status = 'balanced';
    if (!isBalanced) {
        status = Math.abs(bankToBook) > 100 || Math.abs(bookToLedger) > 100 ? 'exception' : 'unbalanced';
    }

    return await this.create({
        lawyerId,
        accountId,
        reconciliationDate: new Date(),
        bankBalance,
        bookBalance,
        clientLedgerBalance,
        isBalanced,
        discrepancies: {
            bankToBook,
            bookToLedger,
            bankToLedger
        },
        details,
        status
    });
};

module.exports = mongoose.model('ThreeWayReconciliation', threeWayReconciliationSchema);
