const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// TRANSACTION TYPES
// ═══════════════════════════════════════════════════════════════
const TRANSACTION_TYPES = [
    'purchase',   // شراء
    'sale',       // بيع
    'dividend',   // توزيعات
    'fee',        // رسوم
    'split',      // تجزئة
    'transfer'    // تحويل
];

// ═══════════════════════════════════════════════════════════════
// INVESTMENT TRANSACTION SCHEMA
// ═══════════════════════════════════════════════════════════════
const investmentTransactionSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // OWNERSHIP
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
     },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // INVESTMENT LINK
    // ═══════════════════════════════════════════════════════════════
    investmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Investment',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // TRANSACTION DETAILS
    // ═══════════════════════════════════════════════════════════════
    transactionId: {
        type: String,
        unique: true,
        index: true
    },

    type: {
        type: String,
        enum: TRANSACTION_TYPES,
        required: true,
        index: true
    },

    date: {
        type: Date,
        required: true,
        index: true
    },

    // For purchase/sale
    quantity: {
        type: Number,
        min: 0
    },

    pricePerUnit: {
        type: Number,
        min: 0
    },

    // Total amount (positive = income, negative = expense)
    amount: {
        type: Number,
        required: true
    },

    fees: {
        type: Number,
        default: 0,
        min: 0
    },

    // Net amount after fees
    netAmount: {
        type: Number,
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // DESCRIPTION & NOTES
    // ═══════════════════════════════════════════════════════════════
    description: {
        type: String,
        trim: true
    },

    notes: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // CURRENCY
    // ═══════════════════════════════════════════════════════════════
    currency: {
        type: String,
        default: 'SAR'
    },

    exchangeRate: {
        type: Number,
        default: 1
    },

    // ═══════════════════════════════════════════════════════════════
    // REFERENCE
    // ═══════════════════════════════════════════════════════════════
    referenceNumber: {
        type: String,
        trim: true
    },

    brokerName: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }

}, { timestamps: true });

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
investmentTransactionSchema.index({ investmentId: 1, date: -1 });
investmentTransactionSchema.index({ userId: 1, type: 1 });
investmentTransactionSchema.index({ firmId: 1, type: 1 });
investmentTransactionSchema.index({ createdAt: -1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE MIDDLEWARE
// ═══════════════════════════════════════════════════════════════
investmentTransactionSchema.pre('save', async function(next) {
    // Generate transaction ID if not present
    if (!this.transactionId) {
        const count = await mongoose.model('InvestmentTransaction').countDocuments();
        this.transactionId = `TXN-${Date.now()}-${count + 1}`;
    }

    // Calculate net amount
    if (this.type === 'purchase' || this.type === 'fee') {
        // Expenses are negative
        this.netAmount = -Math.abs(this.amount) - (this.fees || 0);
    } else if (this.type === 'sale' || this.type === 'dividend') {
        // Income is positive, minus fees
        this.netAmount = Math.abs(this.amount) - (this.fees || 0);
    } else {
        this.netAmount = this.amount;
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// POST-SAVE MIDDLEWARE - Update Investment
// ═══════════════════════════════════════════════════════════════
investmentTransactionSchema.post('save', async function() {
    const Investment = mongoose.model('Investment');
    const investment = await Investment.findById(this.investmentId);

    if (!investment) return;

    if (this.type === 'dividend') {
        // Add dividend to investment
        investment.addDividend(Math.abs(this.amount));
        await investment.save();
    } else if (this.type === 'sale') {
        // Update quantity and check if fully sold
        if (this.quantity) {
            investment.quantity -= this.quantity;
            if (investment.quantity <= 0) {
                investment.quantity = 0;
                investment.status = 'sold';
            } else {
                investment.status = 'partial_sold';
            }
            await investment.save();
        }
    } else if (this.type === 'purchase') {
        // Additional purchase - update average price
        if (this.quantity && this.pricePerUnit) {
            const oldTotal = investment.purchasePrice * investment.quantity;
            const newTotal = this.pricePerUnit * this.quantity;
            investment.quantity += this.quantity;
            investment.purchasePrice = Math.round((oldTotal + newTotal) / investment.quantity);
            investment.totalCost = investment.purchasePrice * investment.quantity + (investment.fees || 0);
            await investment.save();
        }
    }
});

// ═══════════════════════════════════════════════════════════════
// STATICS
// ═══════════════════════════════════════════════════════════════
investmentTransactionSchema.statics.getByInvestment = async function(investmentId) {
    return this.find({ investmentId })
        .sort({ date: -1 });
};

investmentTransactionSchema.statics.getByUser = async function(userId, filters = {}) {
    return this.find({ userId, ...filters })
        .populate('investmentId', 'symbol name type market')
        .sort({ date: -1 });
};

investmentTransactionSchema.statics.getDividendSummary = async function(userId) {
    const result = await this.aggregate([
        {
            $match: {
                userId: new mongoose.Types.ObjectId(userId),
                type: 'dividend'
            }
        },
        {
            $group: {
                _id: { $year: '$date' },
                totalDividends: { $sum: '$amount' },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: -1 } }
    ]);

    return result;
};

// Export enums
investmentTransactionSchema.statics.TRANSACTION_TYPES = TRANSACTION_TYPES;

module.exports = mongoose.model('InvestmentTransaction', investmentTransactionSchema);
