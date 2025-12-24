const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    vendorId: {
        type: String,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 300
    },
    nameAr: {
        type: String,
        trim: true,
        maxlength: 300
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        trim: true
    },
    taxNumber: {
        type: String,
        trim: true
    },
    address: {
        type: String,
        trim: true,
        maxlength: 500
    },
    city: {
        type: String,
        trim: true
    },
    country: {
        type: String,
        trim: true,
        default: 'SA'
    },
    postalCode: {
        type: String,
        trim: true
    },
    bankName: {
        type: String,
        trim: true
    },
    bankAccountNumber: {
        type: String,
        trim: true
    },
    bankIban: {
        type: String,
        trim: true
    },
    currency: {
        type: String,
        default: 'SAR'
    },
    paymentTerms: {
        type: Number,
        default: 30 // Days
    },
    defaultCategory: {
        type: String,
        trim: true
    },
    website: {
        type: String,
        trim: true
    },
    contactPerson: {
        type: String,
        trim: true
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 2000
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // Multi-tenancy: For firm users, firmId is set; for solo lawyers, only lawyerId is used
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
    },
    // Accounting integration
    defaultExpenseAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
    },
    payableAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
    },
    // Credit terms
    creditLimit: {
        type: Number,
        default: 0 // In halalas
    },
    openingBalance: {
        type: Number,
        default: 0 // In halalas
    },
    openingBalanceDate: {
        type: Date
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
vendorSchema.index({ lawyerId: 1, isActive: 1 });
vendorSchema.index({ lawyerId: 1, country: 1 });
vendorSchema.index({ firmId: 1, isActive: 1 });
vendorSchema.index({ firmId: 1, lawyerId: 1 });
vendorSchema.index({ name: 'text', email: 'text', nameAr: 'text' });

// Pre-save hook to generate vendor ID
vendorSchema.pre('save', async function(next) {
    if (!this.vendorId) {
        const count = await this.constructor.countDocuments();
        this.vendorId = `VND-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

// Static method: Get vendor summary with bills
vendorSchema.statics.getVendorSummary = async function(vendorId, lawyerId) {
    const Bill = mongoose.model('Bill');

    const vendor = await this.findOne({ _id: vendorId, lawyerId });
    if (!vendor) return null;

    const billStats = await Bill.aggregate([
        {
            $match: {
                vendorId: new mongoose.Types.ObjectId(vendorId),
                lawyerId: new mongoose.Types.ObjectId(lawyerId)
            }
        },
        {
            $group: {
                _id: null,
                totalBills: { $sum: 1 },
                totalAmount: { $sum: '$totalAmount' },
                totalPaid: { $sum: '$amountPaid' },
                totalOutstanding: { $sum: '$balanceDue' }
            }
        }
    ]);

    const recentBills = await Bill.find({ vendorId, lawyerId })
        .sort({ billDate: -1 })
        .limit(10)
        .select('billNumber billDate totalAmount balanceDue status');

    return {
        vendor,
        summary: billStats[0] || {
            totalBills: 0,
            totalAmount: 0,
            totalPaid: 0,
            totalOutstanding: 0
        },
        recentBills
    };
};

/**
 * Get vendor balance from GL
 * (What we owe this vendor)
 */
vendorSchema.methods.getGLBalance = async function() {
    const GeneralLedger = mongoose.model('GeneralLedger');
    const Account = mongoose.model('Account');

    // Get payable account (use default if not set)
    let payableAccountId = this.payableAccountId;
    if (!payableAccountId) {
        const apAccount = await Account.findOne({ code: '2010' });
        if (!apAccount) return 0;
        payableAccountId = apAccount._id;
    }

    // Sum all GL entries referencing this vendor
    const result = await GeneralLedger.aggregate([
        {
            $match: {
                'meta.vendorId': this._id,
                status: 'posted'
            }
        },
        {
            $group: {
                _id: null,
                debits: {
                    $sum: {
                        $cond: [{ $eq: ['$debitAccountId', payableAccountId] }, '$amount', 0]
                    }
                },
                credits: {
                    $sum: {
                        $cond: [{ $eq: ['$creditAccountId', payableAccountId] }, '$amount', 0]
                    }
                }
            }
        }
    ]);

    if (!result[0]) return 0;
    // For A/P (liability), normal balance is credit
    // Balance = Credits - Debits
    return result[0].credits - result[0].debits;
};

module.exports = mongoose.model('Vendor', vendorSchema);
