const mongoose = require('mongoose');

const bankTransferSchema = new mongoose.Schema({
    transferNumber: {
        type: String,
        unique: true,
        index: true
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },
    fromAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BankAccount',
        required: true,
        index: true
    },
    toAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BankAccount',
        required: true,
        index: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0.01
    },
    fromCurrency: {
        type: String,
        default: 'SAR'
    },
    toCurrency: {
        type: String,
        default: 'SAR'
    },
    exchangeRate: {
        type: Number,
        default: 1
    },
    convertedAmount: {
        type: Number
    },
    fee: {
        type: Number,
        default: 0
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'cancelled'],
        default: 'pending',
        index: true
    },
    reference: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 2000
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    cancelReason: String,
    failureReason: String,
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
bankTransferSchema.index({ firmId: 1, lawyerId: 1 });
bankTransferSchema.index({ lawyerId: 1, date: -1 });
bankTransferSchema.index({ lawyerId: 1, status: 1 });
bankTransferSchema.index({ fromAccountId: 1, date: -1 });
bankTransferSchema.index({ toAccountId: 1, date: -1 });

// Pre-save hook to generate transfer number
bankTransferSchema.pre('save', async function(next) {
    if (!this.transferNumber) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const count = await this.constructor.countDocuments({
            createdAt: {
                $gte: new Date(year, date.getMonth(), 1),
                $lt: new Date(year, date.getMonth() + 1, 1)
            }
        });
        this.transferNumber = `TRF-${year}${month}-${String(count + 1).padStart(4, '0')}`;
    }

    // Calculate converted amount
    if (this.exchangeRate && this.amount) {
        this.convertedAmount = this.amount * this.exchangeRate;
    }

    next();
});

// Static method: Execute transfer (update account balances)
bankTransferSchema.statics.executeTransfer = async function(transferId) {
    const transfer = await this.findById(transferId);
    if (!transfer || transfer.status !== 'pending') {
        throw new Error('Transfer not found or not in pending status');
    }

    const BankAccount = mongoose.model('BankAccount');
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        // Deduct from source account (including fee)
        const totalDeduction = transfer.amount + (transfer.fee || 0);
        await BankAccount.findByIdAndUpdate(
            transfer.fromAccountId,
            { $inc: { balance: -totalDeduction, availableBalance: -totalDeduction } },
            { session }
        );

        // Add to destination account (converted amount if different currency)
        const amountToAdd = transfer.convertedAmount || transfer.amount;
        await BankAccount.findByIdAndUpdate(
            transfer.toAccountId,
            { $inc: { balance: amountToAdd, availableBalance: amountToAdd } },
            { session }
        );

        // Update transfer status
        transfer.status = 'completed';
        transfer.completedAt = new Date();
        await transfer.save({ session });

        await session.commitTransaction();
        return transfer;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

// Static method: Cancel transfer (reverse if completed)
bankTransferSchema.statics.cancelTransfer = async function(transferId, reason) {
    const transfer = await this.findById(transferId);
    if (!transfer) {
        throw new Error('Transfer not found');
    }

    if (transfer.status === 'cancelled') {
        throw new Error('Transfer already cancelled');
    }

    const BankAccount = mongoose.model('BankAccount');
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        // If completed, reverse the balances
        if (transfer.status === 'completed') {
            const totalDeduction = transfer.amount + (transfer.fee || 0);
            await BankAccount.findByIdAndUpdate(
                transfer.fromAccountId,
                { $inc: { balance: totalDeduction, availableBalance: totalDeduction } },
                { session }
            );

            const amountToSubtract = transfer.convertedAmount || transfer.amount;
            await BankAccount.findByIdAndUpdate(
                transfer.toAccountId,
                { $inc: { balance: -amountToSubtract, availableBalance: -amountToSubtract } },
                { session }
            );
        }

        transfer.status = 'cancelled';
        transfer.cancelledAt = new Date();
        transfer.cancelReason = reason;
        await transfer.save({ session });

        await session.commitTransaction();
        return transfer;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

module.exports = mongoose.model('BankTransfer', bankTransferSchema);
