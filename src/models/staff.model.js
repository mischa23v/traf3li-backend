const mongoose = require('mongoose');

// Bar license sub-schema
const barLicenseSchema = new mongoose.Schema({
    jurisdiction: {
        type: String,
        trim: true  // e.g., 'المملكة العربية السعودية', 'New York'
    },
    barNumber: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'pending'],
        default: 'active'
    },
    admissionDate: {
        type: Date
    },
    expiryDate: {
        type: Date
    },
    isGoodStanding: {
        type: Boolean,
        default: true
    }
}, { _id: false });

// Practice area sub-schema
const practiceAreaSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true  // e.g., 'قانون الشركات', 'التقاضي'
    },
    isPrimary: {
        type: Boolean,
        default: false
    },
    yearsExperience: {
        type: Number
    }
}, { _id: false });

// Education sub-schema
const educationSchema = new mongoose.Schema({
    degree: {
        type: String,
        trim: true  // e.g., 'بكالوريوس قانون', 'ماجستير'
    },
    institution: {
        type: String,
        trim: true
    },
    field: {
        type: String,
        trim: true
    },
    year: {
        type: Number
    }
}, { _id: false });

// Certification sub-schema
const certificationSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true
    },
    issuingBody: {
        type: String,
        trim: true
    },
    issueDate: {
        type: Date
    },
    expiryDate: {
        type: Date
    },
    credentialId: {
        type: String,
        trim: true
    }
}, { _id: false });

// Language sub-schema
const languageSchema = new mongoose.Schema({
    language: {
        type: String,
        trim: true  // e.g., 'العربية', 'English'
    },
    proficiency: {
        type: String,
        enum: ['native', 'fluent', 'professional', 'conversational', 'basic'],
        default: 'professional'
    }
}, { _id: false });

const staffSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // Link to User record if this staff member has a login
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // AUTO-GENERATED ID
    // ═══════════════════════════════════════════════════════════════
    staffId: {
        type: String,
        unique: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // BASIC INFO
    // ═══════════════════════════════════════════════════════════════
    salutation: {
        type: String,
        enum: ['mr', 'mrs', 'ms', 'dr', 'eng', 'prof', 'sheikh', 'his_excellency', null],
        default: null
    },
    firstName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    middleName: {
        type: String,
        trim: true,
        maxlength: 100
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    preferredName: {
        type: String,
        trim: true,
        maxlength: 100
    },
    avatar: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // CONTACT INFORMATION
    // ═══════════════════════════════════════════════════════════════
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    workEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        trim: true
    },
    mobilePhone: {
        type: String,
        trim: true
    },
    officePhone: {
        type: String,
        trim: true
    },
    extension: {
        type: String,
        trim: true,
        maxlength: 10
    },

    // ═══════════════════════════════════════════════════════════════
    // ROLE & STATUS
    // ═══════════════════════════════════════════════════════════════
    role: {
        type: String,
        enum: [
            'partner', 'senior_associate', 'associate', 'junior_associate',
            'paralegal', 'legal_secretary', 'admin', 'intern', 'of_counsel',
            'accountant', 'receptionist', 'it', 'marketing', 'hr', 'other'
        ],
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'on_leave', 'terminated', 'probation'],
        default: 'active'
    },
    employmentType: {
        type: String,
        enum: ['full_time', 'part_time', 'contract', 'consultant', null],
        default: 'full_time'
    },

    // ═══════════════════════════════════════════════════════════════
    // DEPARTMENT & REPORTING
    // ═══════════════════════════════════════════════════════════════
    department: {
        type: String,
        trim: true
    },
    reportsTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff'  // Manager's Staff ID
    },
    officeLocation: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // DATES
    // ═══════════════════════════════════════════════════════════════
    hireDate: {
        type: Date
    },
    startDate: {
        type: Date  // If different from hire
    },
    terminationDate: {
        type: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // BAR LICENSES (CRITICAL for attorneys)
    // ═══════════════════════════════════════════════════════════════
    barLicenses: [barLicenseSchema],

    // ═══════════════════════════════════════════════════════════════
    // PRACTICE AREAS
    // ═══════════════════════════════════════════════════════════════
    practiceAreas: [practiceAreaSchema],

    // ═══════════════════════════════════════════════════════════════
    // EDUCATION
    // ═══════════════════════════════════════════════════════════════
    education: [educationSchema],

    // ═══════════════════════════════════════════════════════════════
    // CERTIFICATIONS
    // ═══════════════════════════════════════════════════════════════
    certifications: [certificationSchema],

    // ═══════════════════════════════════════════════════════════════
    // LANGUAGES
    // ═══════════════════════════════════════════════════════════════
    languages: [languageSchema],

    // ═══════════════════════════════════════════════════════════════
    // BILLING RATES (all in halalas per hour)
    // ═══════════════════════════════════════════════════════════════
    hourlyRate: {
        type: Number  // Default rate in halalas
    },
    standardRate: {
        type: Number  // Standard billing rate in halalas
    },
    discountedRate: {
        type: Number  // For certain clients
    },
    premiumRate: {
        type: Number  // For urgent/specialized work
    },
    costRate: {
        type: Number  // Internal cost rate
    },

    // ═══════════════════════════════════════════════════════════════
    // BILLING TARGETS
    // ═══════════════════════════════════════════════════════════════
    billableHoursTarget: {
        type: Number  // Annual target hours
    },
    revenueTarget: {
        type: Number  // Annual revenue target (halalas)
    },
    utilizationTarget: {
        type: Number  // Percentage (e.g., 80)
    },

    // ═══════════════════════════════════════════════════════════════
    // BILLING PERMISSIONS
    // ═══════════════════════════════════════════════════════════════
    canBillTime: {
        type: Boolean,
        default: true  // Default: true for attorneys
    },
    canApproveTime: {
        type: Boolean,
        default: false
    },
    canViewRates: {
        type: Boolean,
        default: false
    },
    canEditRates: {
        type: Boolean,
        default: false
    },

    // ═══════════════════════════════════════════════════════════════
    // BIO & NOTES
    // ═══════════════════════════════════════════════════════════════
    bio: {
        type: String,
        maxlength: 5000  // Professional bio
    },
    bioAr: {
        type: String,
        maxlength: 5000  // Arabic bio
    },
    notes: {
        type: String,
        maxlength: 2000
    },

    // ═══════════════════════════════════════════════════════════════
    // TAGS
    // ═══════════════════════════════════════════════════════════════
    tags: [{
        type: String,
        trim: true
    }],

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
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
staffSchema.index({ lawyerId: 1, status: 1 });
staffSchema.index({ firmId: 1, status: 1 });
staffSchema.index({ lawyerId: 1, role: 1 });
staffSchema.index({ lawyerId: 1, department: 1 });
staffSchema.index({ lawyerId: 1, createdAt: -1 });
staffSchema.index({ email: 1 }, { unique: true, sparse: true });
staffSchema.index({ firstName: 'text', lastName: 'text', email: 'text' });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════
staffSchema.virtual('fullName').get(function() {
    const parts = [this.firstName, this.middleName, this.lastName].filter(Boolean);
    return parts.join(' ');
});

staffSchema.virtual('displayName').get(function() {
    if (this.preferredName) return this.preferredName;
    return `${this.firstName} ${this.lastName}`.trim();
});

staffSchema.virtual('isAttorney').get(function() {
    const attorneyRoles = ['partner', 'senior_associate', 'associate', 'junior_associate', 'of_counsel'];
    return attorneyRoles.includes(this.role);
});

// Ensure virtuals are included in JSON
staffSchema.set('toJSON', { virtuals: true });
staffSchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════
staffSchema.pre('save', async function(next) {
    // Generate staff ID
    if (!this.staffId) {
        const date = new Date();
        const year = date.getFullYear();
        const count = await this.constructor.countDocuments({
            lawyerId: this.lawyerId,
            createdAt: { $gte: new Date(year, 0, 1) }
        });
        this.staffId = `STAFF-${year}-${String(count + 1).padStart(4, '0')}`;
    }

    // Set default billing permissions based on role
    if (this.isNew) {
        const billingRoles = ['partner', 'senior_associate', 'associate', 'junior_associate', 'of_counsel'];
        this.canBillTime = billingRoles.includes(this.role) || this.role === 'paralegal';
        this.canApproveTime = ['partner', 'senior_associate'].includes(this.role);
        this.canViewRates = ['partner', 'senior_associate', 'accountant'].includes(this.role);
        this.canEditRates = this.role === 'partner';
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get staff with filters
staffSchema.statics.getStaff = async function(lawyerId, filters = {}) {
    const query = {};

    // Multi-tenancy: firmId first, then lawyerId fallback
    if (filters.firmId) {
        query.firmId = new mongoose.Types.ObjectId(filters.firmId);
    } else {
        query.lawyerId = new mongoose.Types.ObjectId(lawyerId);
    }

    if (filters.role) query.role = filters.role;
    if (filters.status) query.status = filters.status;
    if (filters.department) query.department = filters.department;
    if (filters.practiceArea) {
        query['practiceAreas.name'] = filters.practiceArea;
    }

    if (filters.search) {
        query.$or = [
            { firstName: { $regex: filters.search, $options: 'i' } },
            { lastName: { $regex: filters.search, $options: 'i' } },
            { email: { $regex: filters.search, $options: 'i' } }
        ];
    }

    const sort = {};
    sort[filters.sortBy || 'lastName'] = filters.sortOrder === 'desc' ? -1 : 1;

    return await this.find(query)
        .populate('reportsTo', 'firstName lastName')
        .populate('userId', 'avatar')
        .sort(sort)
        .limit(filters.limit || 50)
        .skip(filters.skip || 0);
};

// Get active team members (for dropdowns)
staffSchema.statics.getTeam = async function(lawyerId, filters = {}) {
    const query = {
        status: 'active'
    };

    if (filters.firmId) {
        query.firmId = new mongoose.Types.ObjectId(filters.firmId);
    } else {
        query.lawyerId = new mongoose.Types.ObjectId(lawyerId);
    }

    // Optionally filter to only attorneys
    if (filters.attorneysOnly) {
        query.role = { $in: ['partner', 'senior_associate', 'associate', 'junior_associate', 'of_counsel'] };
    }

    // Optionally filter to only billable staff
    if (filters.billableOnly) {
        query.canBillTime = true;
    }

    return await this.find(query)
        .select('firstName lastName email role avatar')
        .sort({ lastName: 1, firstName: 1 });
};

// Get staff statistics
staffSchema.statics.getStats = async function(lawyerId, filters = {}) {
    const matchQuery = {};

    if (filters.firmId) {
        matchQuery.firmId = new mongoose.Types.ObjectId(filters.firmId);
    } else {
        matchQuery.lawyerId = new mongoose.Types.ObjectId(lawyerId);
    }

    // By role
    const byRole = await this.aggregate([
        { $match: { ...matchQuery, status: 'active' } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);

    // By department
    const byDepartment = await this.aggregate([
        { $match: { ...matchQuery, status: 'active', department: { $exists: true, $ne: null } } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);

    // By status
    const byStatus = await this.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const total = await this.countDocuments(matchQuery);
    const active = await this.countDocuments({ ...matchQuery, status: 'active' });

    return {
        total,
        active,
        byRole: byRole.reduce((acc, item) => { acc[item._id] = item.count; return acc; }, {}),
        byDepartment: byDepartment.reduce((acc, item) => { acc[item._id] = item.count; return acc; }, {}),
        byStatus: byStatus.reduce((acc, item) => { acc[item._id] = item.count; return acc; }, {})
    };
};

module.exports = mongoose.model('Staff', staffSchema);
