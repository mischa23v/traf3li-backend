const mongoose = require('mongoose');

// Emergency contact schema
const emergencyContactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    relationship: { type: String, required: true },
    phone: { type: String, required: true },
    alternatePhone: String
}, { _id: false });

// Document schema for employee documents
const employeeDocumentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: {
        type: String,
        enum: ['national_id', 'passport', 'contract', 'degree', 'certificate', 'medical', 'other'],
        required: true
    },
    fileUrl: String,
    fileKey: String,
    expiryDate: Date,
    uploadedAt: { type: Date, default: Date.now }
}, { _id: true });

const employeeSchema = new mongoose.Schema({
    // Auto-generated employee ID
    employeeId: {
        type: String,
        unique: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // BASIC INFORMATION - المعلومات الأساسية
    // ═══════════════════════════════════════════════════════════════
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    firstNameAr: {
        type: String,
        trim: true
    },
    lastNameAr: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    alternatePhone: String,

    // ═══════════════════════════════════════════════════════════════
    // PERSONAL DETAILS - البيانات الشخصية
    // ═══════════════════════════════════════════════════════════════
    dateOfBirth: Date,
    gender: {
        type: String,
        enum: ['male', 'female'],
        required: true
    },
    nationality: {
        type: String,
        default: 'Saudi'
    },
    nationalId: {
        type: String,
        trim: true
    },
    passportNumber: String,
    passportExpiry: Date,
    maritalStatus: {
        type: String,
        enum: ['single', 'married', 'divorced', 'widowed']
    },
    numberOfDependents: {
        type: Number,
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // ADDRESS - العنوان
    // ═══════════════════════════════════════════════════════════════
    address: {
        street: String,
        city: String,
        region: String,
        postalCode: String,
        country: { type: String, default: 'Saudi Arabia' }
    },

    // ═══════════════════════════════════════════════════════════════
    // EMPLOYMENT DETAILS - تفاصيل التوظيف
    // ═══════════════════════════════════════════════════════════════
    department: {
        type: String,
        enum: [
            'legal',           // القانونية
            'finance',         // المالية
            'hr',              // الموارد البشرية
            'admin',           // الإدارية
            'it',              // تقنية المعلومات
            'marketing',       // التسويق
            'operations',      // العمليات
            'other'
        ],
        required: true
    },
    position: {
        type: String,
        required: true,
        trim: true
    },
    positionAr: {
        type: String,
        trim: true
    },
    employmentType: {
        type: String,
        enum: ['full_time', 'part_time', 'contract', 'intern', 'probation'],
        default: 'full_time'
    },
    hireDate: {
        type: Date,
        required: true
    },
    probationEndDate: Date,
    contractEndDate: Date,

    // Work schedule
    workSchedule: {
        type: String,
        enum: ['sunday_thursday', 'monday_friday', 'custom'],
        default: 'sunday_thursday'
    },
    workingHoursPerDay: {
        type: Number,
        default: 8
    },

    // ═══════════════════════════════════════════════════════════════
    // MANAGER & ORGANIZATION - المدير والهيكل التنظيمي
    // ═══════════════════════════════════════════════════════════════
    managerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },
    // Link to lawyer user if this employee is a lawyer
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Organization/Firm owner
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // BANK & FINANCIAL - البنك والمالية
    // ═══════════════════════════════════════════════════════════════
    bankName: String,
    bankAccountNumber: String,
    iban: String,

    // ═══════════════════════════════════════════════════════════════
    // LEAVE BALANCES - رصيد الإجازات
    // ═══════════════════════════════════════════════════════════════
    leaveBalances: {
        annual: { type: Number, default: 21 },          // إجازة سنوية
        sick: { type: Number, default: 30 },            // إجازة مرضية
        personal: { type: Number, default: 3 },         // إجازة شخصية
        unpaid: { type: Number, default: 0 },           // إجازة بدون راتب
        maternity: { type: Number, default: 0 },        // إجازة أمومة
        paternity: { type: Number, default: 0 },        // إجازة أبوة
        hajj: { type: Number, default: 0 },             // إجازة حج
        marriage: { type: Number, default: 0 },         // إجازة زواج
        bereavement: { type: Number, default: 0 }       // إجازة عزاء
    },

    // ═══════════════════════════════════════════════════════════════
    // DOCUMENTS - المستندات
    // ═══════════════════════════════════════════════════════════════
    documents: [employeeDocumentSchema],

    // ═══════════════════════════════════════════════════════════════
    // EMERGENCY CONTACT - جهة الاتصال في الطوارئ
    // ═══════════════════════════════════════════════════════════════
    emergencyContact: emergencyContactSchema,

    // ═══════════════════════════════════════════════════════════════
    // STATUS & METADATA - الحالة والبيانات الوصفية
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['active', 'inactive', 'on_leave', 'terminated', 'resigned'],
        default: 'active',
        index: true
    },
    terminationDate: Date,
    terminationReason: String,

    // Image/Avatar
    image: String,

    // Notes
    notes: {
        type: String,
        maxlength: 2000
    },

    // Tags for categorization
    tags: [{ type: String, trim: true }]
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
employeeSchema.index({ lawyerId: 1, status: 1 });
employeeSchema.index({ lawyerId: 1, department: 1 });
employeeSchema.index({ lawyerId: 1, managerId: 1 });
employeeSchema.index({ firstName: 'text', lastName: 'text', email: 'text' });

// Generate employee ID before saving
employeeSchema.pre('save', async function(next) {
    if (!this.employeeId) {
        const year = new Date().getFullYear();
        const count = await this.constructor.countDocuments({
            lawyerId: this.lawyerId,
            createdAt: { $gte: new Date(year, 0, 1) }
        });
        this.employeeId = `EMP-${year}-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

// Virtual for full name
employeeSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

employeeSchema.virtual('fullNameAr').get(function() {
    if (this.firstNameAr && this.lastNameAr) {
        return `${this.firstNameAr} ${this.lastNameAr}`;
    }
    return null;
});

// Ensure virtuals are included in JSON
employeeSchema.set('toJSON', { virtuals: true });
employeeSchema.set('toObject', { virtuals: true });

// Static method: Search employees
employeeSchema.statics.searchEmployees = async function(lawyerId, searchTerm, filters = {}) {
    const query = {
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        status: { $ne: 'terminated' }
    };

    if (searchTerm) {
        query.$or = [
            { firstName: { $regex: searchTerm, $options: 'i' } },
            { lastName: { $regex: searchTerm, $options: 'i' } },
            { email: { $regex: searchTerm, $options: 'i' } },
            { phone: { $regex: searchTerm, $options: 'i' } },
            { employeeId: { $regex: searchTerm, $options: 'i' } }
        ];
    }

    if (filters.department) query.department = filters.department;
    if (filters.status) query.status = filters.status;
    if (filters.employmentType) query.employmentType = filters.employmentType;

    return await this.find(query)
        .populate('managerId', 'firstName lastName employeeId')
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50);
};

// Static method: Get department statistics
employeeSchema.statics.getDepartmentStats = async function(lawyerId) {
    return await this.aggregate([
        { $match: { lawyerId: new mongoose.Types.ObjectId(lawyerId), status: 'active' } },
        {
            $group: {
                _id: '$department',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } }
    ]);
};

module.exports = mongoose.model('Employee', employeeSchema);
