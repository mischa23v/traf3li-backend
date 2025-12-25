const mongoose = require('mongoose');

// Contact sub-schema
const contactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    designation: {
        type: String,
        trim: true,
        maxlength: 100
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
    isPrimary: {
        type: Boolean,
        default: false
    }
}, { _id: true });

const supplierSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
    },

    // Auto-generated ID
    supplierId: {
        type: String,
        unique: true,
        index: true
    },

    // Basic Information
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

    // Classification
    supplierType: {
        type: String,
        enum: ['company', 'individual'],
        default: 'company'
    },
    supplierGroup: {
        type: String,
        trim: true
    },

    // Tax and Registration
    taxId: {
        type: String,
        trim: true
    },
    crNumber: {
        type: String,
        trim: true
    },
    vatNumber: {
        type: String,
        trim: true
    },

    // Contact Information
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        trim: true
    },
    mobile: {
        type: String,
        trim: true
    },
    fax: {
        type: String,
        trim: true
    },
    website: {
        type: String,
        trim: true
    },

    // Address
    address: {
        type: String,
        trim: true,
        maxlength: 500
    },
    city: {
        type: String,
        trim: true
    },
    region: {
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

    // Banking Information
    bankName: {
        type: String,
        trim: true
    },
    bankAccountNo: {
        type: String,
        trim: true
    },
    iban: {
        type: String,
        trim: true
    },

    // Payment and Pricing
    paymentTerms: {
        type: String,
        trim: true
    },
    currency: {
        type: String,
        default: 'SAR'
    },
    defaultPriceList: {
        type: String,
        trim: true
    },

    // Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'blocked'],
        default: 'active',
        index: true
    },
    disabled: {
        type: Boolean,
        default: false
    },

    // Contacts Array
    contacts: [contactSchema],

    // Additional Information
    tags: [{
        type: String,
        trim: true
    }],
    notes: {
        type: String,
        trim: true,
        maxlength: 2000
    },

    // User Tracking
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
supplierSchema.index({ lawyerId: 1, status: 1 });
supplierSchema.index({ firmId: 1, status: 1 });
supplierSchema.index({ firmId: 1, lawyerId: 1 });
supplierSchema.index({ supplierGroup: 1 });
supplierSchema.index({ name: 'text', nameAr: 'text', email: 'text' });

// Pre-save hook to generate supplier ID
supplierSchema.pre('save', async function(next) {
    if (!this.supplierId && this.isNew) {
        const Counter = require('./counter.model');
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        // Create counter ID for this supplier sequence
        const counterId = this.firmId
            ? `supplier_${this.firmId}_${year}`
            : `supplier_global_${year}`;

        const seq = await Counter.getNextSequence(counterId);
        this.supplierId = `SUP-${year}${month}${day}-${String(seq).padStart(4, '0')}`;
    }
    next();
});

// Static method: Get supplier summary
supplierSchema.statics.getSupplierSummary = async function(supplierId, lawyerId) {
    const PurchaseOrder = mongoose.model('PurchaseOrder');
    const PurchaseInvoice = mongoose.model('PurchaseInvoice');

    const supplier = await this.findOne({ _id: supplierId, lawyerId });
    if (!supplier) return null;

    const poStats = await PurchaseOrder.aggregate([
        {
            $match: {
                supplierId: new mongoose.Types.ObjectId(supplierId),
                lawyerId: new mongoose.Types.ObjectId(lawyerId)
            }
        },
        {
            $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalAmount: { $sum: '$grandTotal' }
            }
        }
    ]);

    const invoiceStats = await PurchaseInvoice.aggregate([
        {
            $match: {
                supplierId: new mongoose.Types.ObjectId(supplierId),
                lawyerId: new mongoose.Types.ObjectId(lawyerId)
            }
        },
        {
            $group: {
                _id: null,
                totalInvoices: { $sum: 1 },
                totalAmount: { $sum: '$grandTotal' },
                totalPaid: { $sum: '$amountPaid' },
                totalOutstanding: { $sum: '$outstandingAmount' }
            }
        }
    ]);

    return {
        supplier,
        purchaseOrders: poStats[0] || { totalOrders: 0, totalAmount: 0 },
        invoices: invoiceStats[0] || {
            totalInvoices: 0,
            totalAmount: 0,
            totalPaid: 0,
            totalOutstanding: 0
        }
    };
};

module.exports = mongoose.model('Supplier', supplierSchema);
