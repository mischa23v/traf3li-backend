const mongoose = require('mongoose');

/**
 * Firm Model - Multi-Tenancy Core
 *
 * Each law firm is isolated. All data (clients, cases, invoices, etc.)
 * belongs to a specific firm. Users can be members of a firm with different roles.
 */

// Team member schema
const teamMemberSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    role: {
        type: String,
        enum: ['owner', 'admin', 'partner', 'lawyer', 'paralegal', 'secretary', 'accountant'],
        default: 'lawyer'
    },
    permissions: {
        // Module access
        clients: { type: String, enum: ['none', 'view', 'edit', 'full'], default: 'view' },
        cases: { type: String, enum: ['none', 'view', 'edit', 'full'], default: 'view' },
        invoices: { type: String, enum: ['none', 'view', 'edit', 'full'], default: 'view' },
        payments: { type: String, enum: ['none', 'view', 'edit', 'full'], default: 'view' },
        documents: { type: String, enum: ['none', 'view', 'edit', 'full'], default: 'view' },
        reports: { type: String, enum: ['none', 'view', 'edit', 'full'], default: 'none' },
        settings: { type: String, enum: ['none', 'view', 'edit', 'full'], default: 'none' },
        team: { type: String, enum: ['none', 'view', 'edit', 'full'], default: 'none' },
        hr: { type: String, enum: ['none', 'view', 'edit', 'full'], default: 'none' },
        // Special permissions
        canApproveInvoices: { type: Boolean, default: false },
        canManageRetainers: { type: Boolean, default: false },
        canExportData: { type: Boolean, default: false },
        canDeleteRecords: { type: Boolean, default: false }
    },
    title: String,  // Job title within firm
    department: String,
    joinedAt: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['active', 'inactive', 'pending'],
        default: 'active'
    }
}, { _id: true });

const firmSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // BASIC INFO
    // ═══════════════════════════════════════════════════════════════
    name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    nameArabic: {
        type: String,
        trim: true
    },
    nameEnglish: {
        type: String,
        trim: true
    },
    description: String,
    descriptionArabic: String,

    logo: String,
    website: String,

    // ═══════════════════════════════════════════════════════════════
    // SAUDI BUSINESS INFO
    // ═══════════════════════════════════════════════════════════════
    crNumber: {
        type: String,
        index: true,
        sparse: true  // Commercial Registration number
    },
    unifiedNumber: String,  // الرقم الموحد (700 number)
    licenseNumber: String,  // رقم ترخيص المحاماة

    // VAT Registration
    vatRegistration: {
        isRegistered: { type: Boolean, default: false },
        vatNumber: String,
        registrationDate: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // CONTACT & LOCATION
    // ═══════════════════════════════════════════════════════════════
    email: {
        type: String,
        lowercase: true,
        trim: true
    },
    phone: String,
    fax: String,

    address: {
        street: String,
        building: String,
        district: String,
        city: String,
        region: String,
        postalCode: String,
        country: { type: String, default: 'Saudi Arabia' },
        additionalNumber: String  // الرقم الإضافي
    },

    // Multiple branches
    branches: [{
        name: String,
        city: String,
        address: String,
        phone: String,
        isHeadquarters: { type: Boolean, default: false }
    }],

    // ═══════════════════════════════════════════════════════════════
    // PRACTICE AREAS
    // ═══════════════════════════════════════════════════════════════
    practiceAreas: {
        type: [String],
        default: []
    },

    // ═══════════════════════════════════════════════════════════════
    // TEAM MEMBERS
    // ═══════════════════════════════════════════════════════════════
    members: [teamMemberSchema],

    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // BILLING & INVOICE SETTINGS
    // ═══════════════════════════════════════════════════════════════
    billingSettings: {
        defaultCurrency: { type: String, default: 'SAR' },
        defaultPaymentTerms: { type: Number, default: 30 },  // Days
        invoicePrefix: { type: String, default: 'INV' },
        invoiceStartNumber: { type: Number, default: 1 },
        currentInvoiceNumber: { type: Number, default: 0 },

        // ZATCA e-invoicing
        zatcaEnabled: { type: Boolean, default: false },
        zatcaEnvironment: { type: String, enum: ['sandbox', 'production'], default: 'sandbox' },

        // Invoice appearance
        showLogo: { type: Boolean, default: true },
        invoiceFooter: String,
        invoiceFooterArabic: String,

        // Bank accounts
        bankAccounts: [{
            bankName: String,
            accountName: String,
            accountNumber: String,
            iban: String,
            swiftCode: String,
            isDefault: { type: Boolean, default: false }
        }]
    },

    // ═══════════════════════════════════════════════════════════════
    // DEFAULT SETTINGS
    // ═══════════════════════════════════════════════════════════════
    settings: {
        timezone: { type: String, default: 'Asia/Riyadh' },
        language: { type: String, default: 'ar' },
        dateFormat: { type: String, default: 'DD/MM/YYYY' },
        fiscalYearStart: { type: Number, default: 1 },  // Month (1 = January)

        // Case settings
        defaultCasePrefix: { type: String, default: 'CASE' },
        currentCaseNumber: { type: Number, default: 0 },

        // Client settings
        defaultClientPrefix: { type: String, default: 'CLT' },
        currentClientNumber: { type: Number, default: 0 },

        // Numbering format: 'sequential' | 'yearly' (resets each year)
        numberingFormat: { type: String, default: 'yearly' }
    },

    // ═══════════════════════════════════════════════════════════════
    // SUBSCRIPTION / PLAN
    // ═══════════════════════════════════════════════════════════════
    subscription: {
        plan: {
            type: String,
            enum: ['free', 'starter', 'professional', 'enterprise'],
            default: 'free'
        },
        status: {
            type: String,
            enum: ['active', 'trial', 'expired', 'cancelled'],
            default: 'trial'
        },
        trialEndsAt: Date,
        currentPeriodStart: Date,
        currentPeriodEnd: Date,
        maxUsers: { type: Number, default: 3 },
        maxCases: { type: Number, default: 50 },
        maxClients: { type: Number, default: 100 },
        maxStorageGB: { type: Number, default: 5 },
        features: {
            zatcaIntegration: { type: Boolean, default: false },
            advancedReports: { type: Boolean, default: false },
            multiCurrency: { type: Boolean, default: false },
            apiAccess: { type: Boolean, default: false },
            customBranding: { type: Boolean, default: false }
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // MARKETPLACE (for lawyers directory)
    // ═══════════════════════════════════════════════════════════════
    marketplace: {
        isPublic: { type: Boolean, default: false },
        awards: [String],
        ranking: Number,
        verified: { type: Boolean, default: false }
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    versionKey: false,
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
firmSchema.index({ name: 'text', nameArabic: 'text', city: 'text', practiceAreas: 'text' });
firmSchema.index({ 'members.userId': 1 });
firmSchema.index({ status: 1, 'subscription.status': 1 });

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Add a member to the firm
firmSchema.methods.addMember = async function(userId, role = 'lawyer', permissions = {}) {
    // Check if already a member
    const existingMember = this.members.find(m => m.userId.toString() === userId.toString());
    if (existingMember) {
        throw new Error('User is already a member of this firm');
    }

    // Set default permissions based on role
    const defaultPermissions = getDefaultPermissions(role);

    this.members.push({
        userId,
        role,
        permissions: { ...defaultPermissions, ...permissions },
        joinedAt: new Date(),
        status: 'active'
    });

    await this.save();

    // Update user's firmId
    const User = mongoose.model('User');
    await User.findByIdAndUpdate(userId, { firmId: this._id, firmRole: role });

    return this;
};

// Remove a member from the firm
firmSchema.methods.removeMember = async function(userId) {
    const memberIndex = this.members.findIndex(m => m.userId.toString() === userId.toString());
    if (memberIndex === -1) {
        throw new Error('User is not a member of this firm');
    }

    // Cannot remove the owner
    if (this.members[memberIndex].role === 'owner') {
        throw new Error('Cannot remove the firm owner');
    }

    this.members.splice(memberIndex, 1);
    await this.save();

    // Remove user's firmId
    const User = mongoose.model('User');
    await User.findByIdAndUpdate(userId, { $unset: { firmId: 1, firmRole: 1 } });

    return this;
};

// Update member's role and permissions
firmSchema.methods.updateMember = async function(userId, updates) {
    const member = this.members.find(m => m.userId.toString() === userId.toString());
    if (!member) {
        throw new Error('User is not a member of this firm');
    }

    if (updates.role) member.role = updates.role;
    if (updates.permissions) member.permissions = { ...member.permissions, ...updates.permissions };
    if (updates.title) member.title = updates.title;
    if (updates.department) member.department = updates.department;
    if (updates.status) member.status = updates.status;

    await this.save();

    // Update user's firmRole
    if (updates.role) {
        const User = mongoose.model('User');
        await User.findByIdAndUpdate(userId, { firmRole: updates.role });
    }

    return this;
};

// Check if user has permission
firmSchema.methods.hasPermission = function(userId, module, requiredLevel = 'view') {
    const member = this.members.find(m => m.userId.toString() === userId.toString());
    if (!member) return false;

    // Owner and admin have full access
    if (member.role === 'owner' || member.role === 'admin') return true;

    const levels = { none: 0, view: 1, edit: 2, full: 3 };
    const userLevel = levels[member.permissions[module]] || 0;
    const required = levels[requiredLevel] || 0;

    return userLevel >= required;
};

// Get next invoice number
firmSchema.methods.getNextInvoiceNumber = async function() {
    const year = new Date().getFullYear();
    const prefix = this.billingSettings?.invoicePrefix || 'INV';

    this.billingSettings.currentInvoiceNumber = (this.billingSettings.currentInvoiceNumber || 0) + 1;
    await this.save();

    const num = String(this.billingSettings.currentInvoiceNumber).padStart(5, '0');

    if (this.settings?.numberingFormat === 'yearly') {
        return `${prefix}-${year}-${num}`;
    }
    return `${prefix}-${num}`;
};

// Get next case number
firmSchema.methods.getNextCaseNumber = async function() {
    const year = new Date().getFullYear();
    const prefix = this.settings?.defaultCasePrefix || 'CASE';

    this.settings.currentCaseNumber = (this.settings.currentCaseNumber || 0) + 1;
    await this.save();

    const num = String(this.settings.currentCaseNumber).padStart(5, '0');

    if (this.settings?.numberingFormat === 'yearly') {
        return `${prefix}-${year}-${num}`;
    }
    return `${prefix}-${num}`;
};

// Get next client number
firmSchema.methods.getNextClientNumber = async function() {
    const year = new Date().getFullYear();
    const prefix = this.settings?.defaultClientPrefix || 'CLT';

    this.settings.currentClientNumber = (this.settings.currentClientNumber || 0) + 1;
    await this.save();

    const num = String(this.settings.currentClientNumber).padStart(5, '0');

    if (this.settings?.numberingFormat === 'yearly') {
        return `${prefix}-${year}-${num}`;
    }
    return `${prefix}-${num}`;
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get firm by user
firmSchema.statics.getByUser = async function(userId) {
    return this.findOne({ 'members.userId': userId, status: 'active' });
};

// Get user's role in firm
firmSchema.statics.getUserRole = async function(firmId, userId) {
    const firm = await this.findById(firmId);
    if (!firm) return null;

    const member = firm.members.find(m => m.userId.toString() === userId.toString());
    return member?.role || null;
};

// Helper function for default permissions by role
function getDefaultPermissions(role) {
    const permissions = {
        owner: {
            clients: 'full', cases: 'full', invoices: 'full', payments: 'full',
            documents: 'full', reports: 'full', settings: 'full', team: 'full', hr: 'full',
            canApproveInvoices: true, canManageRetainers: true, canExportData: true, canDeleteRecords: true
        },
        admin: {
            clients: 'full', cases: 'full', invoices: 'full', payments: 'full',
            documents: 'full', reports: 'full', settings: 'edit', team: 'full', hr: 'full',
            canApproveInvoices: true, canManageRetainers: true, canExportData: true, canDeleteRecords: true
        },
        partner: {
            clients: 'full', cases: 'full', invoices: 'full', payments: 'edit',
            documents: 'full', reports: 'view', settings: 'view', team: 'view', hr: 'none',
            canApproveInvoices: true, canManageRetainers: true, canExportData: true, canDeleteRecords: false
        },
        lawyer: {
            clients: 'edit', cases: 'edit', invoices: 'edit', payments: 'view',
            documents: 'edit', reports: 'view', settings: 'none', team: 'none', hr: 'none',
            canApproveInvoices: false, canManageRetainers: false, canExportData: false, canDeleteRecords: false
        },
        paralegal: {
            clients: 'edit', cases: 'edit', invoices: 'view', payments: 'none',
            documents: 'edit', reports: 'none', settings: 'none', team: 'none', hr: 'none',
            canApproveInvoices: false, canManageRetainers: false, canExportData: false, canDeleteRecords: false
        },
        secretary: {
            clients: 'view', cases: 'view', invoices: 'view', payments: 'view',
            documents: 'view', reports: 'none', settings: 'none', team: 'none', hr: 'none',
            canApproveInvoices: false, canManageRetainers: false, canExportData: false, canDeleteRecords: false
        },
        accountant: {
            clients: 'view', cases: 'none', invoices: 'full', payments: 'full',
            documents: 'view', reports: 'full', settings: 'none', team: 'none', hr: 'view',
            canApproveInvoices: true, canManageRetainers: true, canExportData: true, canDeleteRecords: false
        }
    };

    return permissions[role] || permissions.secretary;
}

module.exports = mongoose.model('Firm', firmSchema);
