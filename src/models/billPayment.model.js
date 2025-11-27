const mongoose = require('mongoose');

const billPaymentSchema = new mongoose.Schema({
    paymentNumber: {
        type: String,
        unique: true,
        index: true
    },
    billId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bill',
        required: true,
        index: true
    },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true,
        index: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0.01
    },
    currency: {
        type: String,
        default: 'SAR'
    },
    paymentDate: {
        type: Date,
        required: true,
        index: true
    },
    paymentMethod: {
        type: String,
        enum: ['bank_transfer', 'cash', 'check', 'credit_card', 'debit_card', 'online'],
        required: true
    },
    bankAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BankAccount',
        index: true
    },
    reference: {
        type: String,
        trim: true
    },
    checkNumber: String,
    transactionId: String,
    notes: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'cancelled'],
        default: 'completed',
        index: true
    },
    failureReason: String,
    cancelledAt: Date,
    cancelReason: String,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
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
billPaymentSchema.index({ lawyerId: 1, paymentDate: -1 });
billPaymentSchema.index({ lawyerId: 1, vendorId: 1 });
billPaymentSchema.index({ billId: 1, paymentDate: -1 });

// Pre-save hook
billPaymentSchema.pre('save', async function(next) {
    // Track if this is a new document for post-save hook
    this._wasNew = this.isNew;

    // Generate payment number
    if (!this.paymentNumber) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const count = await this.constructor.countDocuments({
            createdAt: {
                $gte: new Date(year, date.getMonth(), 1),
                $lt: new Date(year, date.getMonth() + 1, 1)
            }
        });
        this.paymentNumber = `BPAY-${year}${month}-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

// Post-save hook to update bill (only runs on new document creation)
billPaymentSchema.post('save', async function(doc) {
    // Only process on new document creation to avoid double-updates
    if (!doc._wasNew) return;

    if (doc.status === 'completed') {
        const Bill = mongoose.model('Bill');
        const bill = await Bill.findById(doc.billId);

        if (bill) {
            bill.amountPaid += doc.amount;
            bill.balanceDue = bill.totalAmount - bill.amountPaid;

            if (bill.balanceDue <= 0) {
                bill.status = 'paid';
                bill.paidDate = new Date();
            } else if (bill.amountPaid > 0) {
                bill.status = 'partial';
            }

            bill.history.push({
                action: 'paid',
                performedBy: doc.createdBy,
                performedAt: new Date(),
                details: {
                    paymentId: doc._id,
                    paymentNumber: doc.paymentNumber,
                    amount: doc.amount
                }
            });

            await bill.save();
        }

        // Deduct from bank account if specified
        if (doc.bankAccountId) {
            const BankAccount = mongoose.model('BankAccount');
            await BankAccount.findByIdAndUpdate(
                doc.bankAccountId,
                { $inc: { balance: -doc.amount, availableBalance: -doc.amount } }
            );

            // Create bank transaction
            const BankTransaction = mongoose.model('BankTransaction');
            await BankTransaction.create({
                accountId: doc.bankAccountId,
                date: doc.paymentDate,
                type: 'debit',
                amount: doc.amount,
                description: `Bill payment - ${doc.paymentNumber}`,
                reference: doc.reference,
                payee: bill?.vendorId?.name || 'Vendor',
                category: 'bill_payment',
                matched: true,
                matchedType: 'BillPayment',
                matchedTransactionId: doc._id,
                lawyerId: doc.lawyerId
            });
        }
    }
});

// Static method: Cancel payment
billPaymentSchema.statics.cancelPayment = async function(paymentId, reason, userId) {
    const payment = await this.findById(paymentId);
    if (!payment) {
        throw new Error('Payment not found');
    }

    if (payment.status === 'cancelled') {
        throw new Error('Payment already cancelled');
    }

    const Bill = mongoose.model('Bill');
    const BankAccount = mongoose.model('BankAccount');

    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        // Reverse bill payment
        const bill = await Bill.findById(payment.billId).session(session);
        if (bill) {
            bill.amountPaid -= payment.amount;
            bill.balanceDue = bill.totalAmount - bill.amountPaid;

            if (bill.amountPaid <= 0) {
                bill.status = 'pending';
                bill.paidDate = null;
            } else {
                bill.status = 'partial';
            }

            bill.history.push({
                action: 'updated',
                performedBy: userId,
                performedAt: new Date(),
                details: {
                    paymentCancelled: payment._id,
                    amount: payment.amount,
                    reason
                }
            });

            await bill.save({ session });
        }

        // Reverse bank account balance
        if (payment.bankAccountId) {
            await BankAccount.findByIdAndUpdate(
                payment.bankAccountId,
                { $inc: { balance: payment.amount, availableBalance: payment.amount } },
                { session }
            );
        }

        // Update payment status
        payment.status = 'cancelled';
        payment.cancelledAt = new Date();
        payment.cancelReason = reason;
        await payment.save({ session });

        await session.commitTransaction();
        return payment;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

module.exports = mongoose.model('BillPayment', billPaymentSchema);
