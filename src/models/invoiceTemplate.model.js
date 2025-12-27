const mongoose = require('mongoose');

const invoiceTemplateSchema = new mongoose.Schema({
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    nameAr: {
        type: String,
        required: true,
        trim: true
    },
    description: String,
    descriptionAr: String,
    type: {
        type: String,
        enum: ['standard', 'detailed', 'summary', 'retainer', 'pro_bono', 'custom'],
        default: 'standard'
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    header: {
        showLogo: { type: Boolean, default: true },
        logoPosition: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
        showCompanyInfo: { type: Boolean, default: true },
        showInvoiceNumber: { type: Boolean, default: true },
        showDate: { type: Boolean, default: true },
        showDueDate: { type: Boolean, default: true },
        customHeader: String,
        customHeaderAr: String
    },
    clientSection: {
        showClientName: { type: Boolean, default: true },
        showClientAddress: { type: Boolean, default: true },
        showClientPhone: { type: Boolean, default: true },
        showClientEmail: { type: Boolean, default: true },
        showClientVat: { type: Boolean, default: true }
    },
    itemsSection: {
        showDescription: { type: Boolean, default: true },
        showQuantity: { type: Boolean, default: true },
        showUnitPrice: { type: Boolean, default: true },
        showDiscount: { type: Boolean, default: true },
        showTax: { type: Boolean, default: true },
        showLineTotal: { type: Boolean, default: true },
        groupByCategory: { type: Boolean, default: false },
        showTimeEntries: { type: Boolean, default: true },
        showExpenses: { type: Boolean, default: true }
    },
    footer: {
        showSubtotal: { type: Boolean, default: true },
        showDiscount: { type: Boolean, default: true },
        showTax: { type: Boolean, default: true },
        showTotal: { type: Boolean, default: true },
        showPaymentTerms: { type: Boolean, default: true },
        showBankDetails: { type: Boolean, default: true },
        showNotes: { type: Boolean, default: true },
        showSignature: { type: Boolean, default: false },
        customFooter: String,
        customFooterAr: String,
        paymentTerms: String,
        paymentTermsAr: String,
        bankDetails: String,
        bankDetailsAr: String
    },
    styling: {
        primaryColor: { type: String, default: '#1E40AF' },
        accentColor: { type: String, default: '#3B82F6' },
        fontFamily: { type: String, enum: ['cairo', 'tajawal', 'arial', 'times'], default: 'cairo' },
        fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
        tableStyle: { type: String, enum: ['striped', 'bordered', 'minimal'], default: 'striped' },
        pageSize: { type: String, enum: ['a4', 'letter'], default: 'a4' },
        orientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' }
    },
    numberingFormat: {
        prefix: { type: String, default: 'INV-' },
        suffix: { type: String, default: '' },
        digits: { type: Number, default: 5 },
        startFrom: { type: Number, default: 1 },
        includeYear: { type: Boolean, default: true },
        includeMonth: { type: Boolean, default: false },
        separator: { type: String, default: '-' }
    },
    taxSettings: {
        vatRate: { type: Number, default: 15 },
        includeVatNumber: { type: Boolean, default: true },
        vatDisplayMode: { type: String, enum: ['inclusive', 'exclusive', 'none'], default: 'exclusive' }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
invoiceTemplateSchema.index({ lawyerId: 1, isDefault: 1 });
invoiceTemplateSchema.index({ lawyerId: 1, isActive: 1 });
invoiceTemplateSchema.index({ lawyerId: 1, type: 1 });
invoiceTemplateSchema.index({ firmId: 1, lawyerId: 1 });

// Pre-save hook to ensure only one default
invoiceTemplateSchema.pre('save', async function(next) {
    if (this.isDefault && this.isModified('isDefault')) {
        await this.constructor.updateMany(
            { lawyerId: this.lawyerId, _id: { $ne: this._id } },
            { isDefault: false }
        );
    }
    next();
});

// Static method: Get default template
invoiceTemplateSchema.statics.getDefault = async function(lawyerId) {
    return await this.findOne({
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        isDefault: true,
        isActive: true
    });
};

// Static method: Generate invoice number
invoiceTemplateSchema.statics.generateInvoiceNumber = async function(lawyerId, templateId) {
    const template = await this.findById(templateId);
    if (!template) {
        throw new Error('Template not found');
    }

    const format = template.numberingFormat;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // Get the count of invoices for this lawyer
    const Invoice = mongoose.model('Invoice');
    const count = await Invoice.countDocuments({
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        createdAt: { $gte: new Date(year, 0, 1) }
    });

    const number = String(format.startFrom + count).padStart(format.digits, '0');

    let invoiceNumber = format.prefix;
    if (format.includeYear) {
        invoiceNumber += year + format.separator;
    }
    if (format.includeMonth) {
        invoiceNumber += month + format.separator;
    }
    invoiceNumber += number + format.suffix;

    return invoiceNumber;
};

module.exports = mongoose.model('InvoiceTemplate', invoiceTemplateSchema);
