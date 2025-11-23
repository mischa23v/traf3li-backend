const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    transactionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['income', 'expense', 'transfer'],
        required: true
    },
    category: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String,
        required: true,
        maxlength: 500
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'transfer', 'check'],
        required: true
    },
    reference: {
        type: String
    },
    relatedInvoice: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice'
    },
    relatedExpense: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Expense'
    },
    relatedCase: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case'
    },
    status: {
        type: String,
        enum: ['completed', 'pending', 'cancelled'],
        default: 'completed'
    },
    notes: {
        type: String,
        maxlength: 1000
    },
    balance: {
        type: Number,
        default: 0
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ type: 1, userId: 1 });
transactionSchema.index({ status: 1 });

// Generate transaction ID before saving
transactionSchema.pre('save', async function(next) {
    if (!this.transactionId) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
        this.transactionId = `TXN-${year}${month}-${random}`;
    }
    next();
});

// Static method: Calculate balance
transactionSchema.statics.calculateBalance = async function(userId, upToDate = new Date()) {
    const result = await this.aggregate([
        {
            $match: {
                userId: new mongoose.Types.ObjectId(userId),
                date: { $lte: upToDate },
                status: 'completed'
            }
        },
        {
            $group: {
                _id: null,
                income: {
                    $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] }
                },
                expense: {
                    $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] }
                }
            }
        }
    ]);

    if (result.length > 0) {
        return result[0].income - result[0].expense;
    }
    return 0;
};

// Static method: Get transaction summary
transactionSchema.statics.getSummary = async function(userId, filters = {}) {
    const matchStage = {
        userId: new mongoose.Types.ObjectId(userId),
        status: 'completed'
    };

    if (filters.startDate || filters.endDate) {
        matchStage.date = {};
        if (filters.startDate) matchStage.date.$gte = new Date(filters.startDate);
        if (filters.endDate) matchStage.date.$lte = new Date(filters.endDate);
    }

    const summary = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$type',
                total: { $sum: '$amount' },
                count: { $sum: 1 }
            }
        }
    ]);

    const result = {
        income: 0,
        expense: 0,
        transfer: 0,
        incomeCount: 0,
        expenseCount: 0,
        transferCount: 0
    };

    summary.forEach(item => {
        result[item._id] = item.total;
        result[`${item._id}Count`] = item.count;
    });

    result.balance = result.income - result.expense;

    return result;
};

module.exports = mongoose.model('Transaction', transactionSchema);
