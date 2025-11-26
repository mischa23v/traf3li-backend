const mongoose = require('mongoose');

const exportTemplateSchema = new mongoose.Schema({
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    nameAr: String,
    entityType: {
        type: String,
        enum: ['clients', 'cases', 'contacts', 'organizations', 'invoices', 'time_entries', 'expenses', 'documents', 'followups', 'tags'],
        required: true
    },
    format: {
        type: String,
        enum: ['xlsx', 'csv', 'pdf', 'json'],
        required: true
    },
    columns: [{
        field: String,
        label: String,
        labelAr: String,
        order: Number,
        width: Number,
        format: String // e.g., 'date', 'currency', 'percentage'
    }],
    filters: mongoose.Schema.Types.Mixed,
    sortBy: String,
    sortOrder: {
        type: String,
        enum: ['asc', 'desc'],
        default: 'desc'
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
exportTemplateSchema.index({ lawyerId: 1, entityType: 1 });
exportTemplateSchema.index({ lawyerId: 1, isDefault: 1 });

// Pre-save hook to ensure only one default per entity type
exportTemplateSchema.pre('save', async function(next) {
    if (this.isDefault && this.isModified('isDefault')) {
        await this.constructor.updateMany(
            {
                lawyerId: this.lawyerId,
                entityType: this.entityType,
                _id: { $ne: this._id }
            },
            { isDefault: false }
        );
    }
    next();
});

// Static method: Get available columns for entity type
exportTemplateSchema.statics.getAvailableColumns = function(entityType) {
    const columnsByType = {
        clients: [
            { field: 'clientId', label: 'Client ID', labelAr: 'رقم العميل' },
            { field: 'name', label: 'Name', labelAr: 'الاسم' },
            { field: 'email', label: 'Email', labelAr: 'البريد الإلكتروني' },
            { field: 'phone', label: 'Phone', labelAr: 'الهاتف' },
            { field: 'type', label: 'Type', labelAr: 'النوع' },
            { field: 'status', label: 'Status', labelAr: 'الحالة' },
            { field: 'totalCases', label: 'Total Cases', labelAr: 'إجمالي القضايا' },
            { field: 'totalPaid', label: 'Total Paid', labelAr: 'إجمالي المدفوعات' },
            { field: 'createdAt', label: 'Created Date', labelAr: 'تاريخ الإنشاء' }
        ],
        cases: [
            { field: 'caseNumber', label: 'Case Number', labelAr: 'رقم القضية' },
            { field: 'title', label: 'Title', labelAr: 'العنوان' },
            { field: 'clientName', label: 'Client', labelAr: 'العميل' },
            { field: 'category', label: 'Category', labelAr: 'الفئة' },
            { field: 'status', label: 'Status', labelAr: 'الحالة' },
            { field: 'priority', label: 'Priority', labelAr: 'الأولوية' },
            { field: 'court', label: 'Court', labelAr: 'المحكمة' },
            { field: 'nextHearing', label: 'Next Hearing', labelAr: 'الجلسة القادمة' },
            { field: 'claimAmount', label: 'Claim Amount', labelAr: 'قيمة المطالبة' },
            { field: 'createdAt', label: 'Created Date', labelAr: 'تاريخ الإنشاء' }
        ],
        contacts: [
            { field: 'firstName', label: 'First Name', labelAr: 'الاسم الأول' },
            { field: 'lastName', label: 'Last Name', labelAr: 'اسم العائلة' },
            { field: 'email', label: 'Email', labelAr: 'البريد الإلكتروني' },
            { field: 'phone', label: 'Phone', labelAr: 'الهاتف' },
            { field: 'type', label: 'Type', labelAr: 'النوع' },
            { field: 'category', label: 'Category', labelAr: 'الفئة' },
            { field: 'company', label: 'Company', labelAr: 'الشركة' },
            { field: 'city', label: 'City', labelAr: 'المدينة' },
            { field: 'status', label: 'Status', labelAr: 'الحالة' }
        ],
        invoices: [
            { field: 'invoiceNumber', label: 'Invoice Number', labelAr: 'رقم الفاتورة' },
            { field: 'clientName', label: 'Client', labelAr: 'العميل' },
            { field: 'issueDate', label: 'Issue Date', labelAr: 'تاريخ الإصدار' },
            { field: 'dueDate', label: 'Due Date', labelAr: 'تاريخ الاستحقاق' },
            { field: 'subtotal', label: 'Subtotal', labelAr: 'المجموع الفرعي' },
            { field: 'vatAmount', label: 'VAT', labelAr: 'ضريبة القيمة المضافة' },
            { field: 'total', label: 'Total', labelAr: 'الإجمالي' },
            { field: 'status', label: 'Status', labelAr: 'الحالة' },
            { field: 'paidDate', label: 'Paid Date', labelAr: 'تاريخ الدفع' }
        ]
    };

    return columnsByType[entityType] || [];
};

module.exports = mongoose.model('ExportTemplate', exportTemplateSchema);
