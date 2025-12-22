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
        enum: ['owner', 'admin', 'partner', 'lawyer', 'paralegal', 'secretary', 'accountant', 'departed'],
        default: 'lawyer'
    },
    // Original role before departure (for reference)
    previousRole: {
        type: String,
        enum: ['owner', 'admin', 'partner', 'lawyer', 'paralegal', 'secretary', 'accountant', null],
        default: null
    },
    permissions: {
        // Module access
        clients: { type: String, enum: ['none', 'view', 'edit', 'full'], default: 'view' },
        cases: { type: String, enum: ['none', 'view', 'edit', 'full'], default: 'view' },
        leads: { type: String, enum: ['none', 'view', 'edit', 'full'], default: 'view' },
        invoices: { type: String, enum: ['none', 'view', 'edit', 'full'], default: 'view' },
        payments: { type: String, enum: ['none', 'view', 'edit', 'full'], default: 'view' },
        expenses: { type: String, enum: ['none', 'view', 'edit', 'full'], default: 'view' },
        documents: { type: String, enum: ['none', 'view', 'edit', 'full'], default: 'view' },
        tasks: { type: String, enum: ['none', 'view', 'edit', 'full'], default: 'edit' },
        events: { type: String, enum: ['none', 'view', 'edit', 'full'], default: 'edit' },
        timeTracking: { type: String, enum: ['none', 'view', 'edit', 'full'], default: 'edit' },
        reports: { type: String, enum: ['none', 'view', 'edit', 'full'], default: 'none' },
        settings: { type: String, enum: ['none', 'view', 'edit', 'full'], default: 'none' },
        team: { type: String, enum: ['none', 'view', 'edit', 'full'], default: 'none' },
        // Special permissions
        canApproveInvoices: { type: Boolean, default: false },
        canManageRetainers: { type: Boolean, default: false },
        canExportData: { type: Boolean, default: false },
        canDeleteRecords: { type: Boolean, default: false },
        canViewFinance: { type: Boolean, default: false },
        canManageTeam: { type: Boolean, default: false }
    },
    title: String,  // Job title within firm
    department: String,
    joinedAt: { type: Date, default: Date.now },
    // Employment status tracking
    status: {
        type: String,
        enum: ['active', 'departed', 'suspended', 'pending'],
        default: 'active'
    },
    // Departure information
    departedAt: { type: Date, default: null },
    departureReason: { type: String, default: null },
    departureNotes: { type: String, default: null },
    // Cases this member worked on (for departed access)
    assignedCases: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case'
    }],
    // Track who processed the departure
    departureProcessedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
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
    // AI SERVICES API KEYS (User-provided)
    // ═══════════════════════════════════════════════════════════════
    aiSettings: {
        // OpenAI API Key (for Whisper speech-to-text)
        openai: {
            apiKey: { type: String, default: null }, // Encrypted
            isConfigured: { type: Boolean, default: false },
            lastValidated: Date,
            usageThisMonth: { type: Number, default: 0 }
        },
        // Anthropic API Key (for Claude NLP)
        anthropic: {
            apiKey: { type: String, default: null }, // Encrypted
            isConfigured: { type: Boolean, default: false },
            lastValidated: Date,
            usageThisMonth: { type: Number, default: 0 }
        },
        // Google Cloud API Key (alternative speech-to-text)
        google: {
            apiKey: { type: String, default: null }, // Encrypted
            isConfigured: { type: Boolean, default: false },
            lastValidated: Date
        },
        // Feature toggles (auto-enabled when API keys are configured)
        features: {
            nlpTaskCreation: { type: Boolean, default: false },
            voiceToTask: { type: Boolean, default: false },
            smartScheduling: { type: Boolean, default: false },
            aiAssistant: { type: Boolean, default: false }
        },
        // Preferences
        preferences: {
            defaultLanguage: { type: String, default: 'ar' },
            preferredSpeechProvider: { type: String, enum: ['openai', 'google'], default: 'openai' },
            preferredNlpProvider: { type: String, enum: ['anthropic', 'openai'], default: 'anthropic' }
        }
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
        billingCycle: {
            type: String,
            enum: ['monthly', 'annual'],
            default: 'monthly'
        },
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
    // USAGE TRACKING
    // ═══════════════════════════════════════════════════════════════
    usage: {
        cases: { type: Number, default: 0 },
        clients: { type: Number, default: 0 },
        users: { type: Number, default: 0 },
        storageUsedMB: { type: Number, default: 0 },
        documentsCount: { type: Number, default: 0 },
        apiCallsThisMonth: { type: Number, default: 0 },
        lastResetDate: { type: Date, default: Date.now }
    },

    // ═══════════════════════════════════════════════════════════════
    // ENTERPRISE SETTINGS
    // ═══════════════════════════════════════════════════════════════
    enterpriseSettings: {
        // SSO/SAML Configuration (Comprehensive)
        sso: {
            enabled: { type: Boolean, default: false },
            provider: {
                type: String,
                enum: ['azure', 'okta', 'google', 'custom', null],
                default: null
            },
            // Identity Provider Configuration
            entityId: String,
            ssoUrl: String,  // Single Sign-On URL
            sloUrl: String,  // Single Logout URL
            certificate: String,  // X.509 Certificate (PEM format)
            metadataUrl: String,  // IdP Metadata URL

            // Attribute Mapping
            attributeMapping: {
                email: { type: String, default: 'email' },
                firstName: { type: String, default: 'firstName' },
                lastName: { type: String, default: 'lastName' },
                groups: { type: String, default: 'groups' }
            },

            // Domain & Provisioning Settings
            allowedDomains: [String],  // Only allow SSO from these email domains
            autoProvision: { type: Boolean, default: true },  // Create user on first SSO login (JIT)
            defaultRole: {
                type: String,
                enum: ['lawyer', 'paralegal', 'secretary', 'accountant', 'partner'],
                default: 'lawyer'
            },  // Role for auto-provisioned users

            // Advanced Settings
            requireEmailVerification: { type: Boolean, default: false },
            syncUserAttributes: { type: Boolean, default: true },  // Update user attrs on each login

            // Configuration Metadata
            lastTested: Date,
            lastTestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            configuredAt: Date,
            configuredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        },

        // Legacy SSO fields (for backward compatibility - deprecated)
        ssoEnabled: { type: Boolean, default: false },
        ssoProvider: {
            type: String,
            enum: ['azure', 'okta', 'google', 'custom', null],
            default: null
        },
        ssoEntityId: String,
        ssoSsoUrl: String,
        ssoCertificate: String,
        ssoMetadataUrl: String,

        // Security Settings
        enforce2FA: { type: Boolean, default: false },
        passwordPolicy: {
            minLength: { type: Number, default: 8 },
            requireUppercase: { type: Boolean, default: false },
            requireLowercase: { type: Boolean, default: false },
            requireNumbers: { type: Boolean, default: false },
            requireSpecialChars: { type: Boolean, default: false },
            maxAge: { type: Number, default: 90 }, // Days before password expires
            preventReuse: { type: Number, default: 0 } // Number of previous passwords to prevent reuse
        },
        // Password Rotation & Expiration Settings
        passwordMaxAgeDays: { type: Number, default: 90 }, // Password expires after this many days
        passwordHistoryCount: { type: Number, default: 12 }, // Number of previous passwords to prevent reuse
        requirePasswordChange: { type: Boolean, default: false }, // Force all users to change password
        requirePasswordChangeSetAt: { type: Date, default: null }, // When requirePasswordChange was enabled
        enablePasswordExpiration: { type: Boolean, default: false }, // Enable automatic password expiration
        passwordExpiryWarningDays: { type: Number, default: 7 }, // Days before expiry to send warning
        minPasswordStrengthScore: { type: Number, default: 50 }, // Minimum password strength (0-100)
        sessionTimeoutMinutes: { type: Number, default: 30 },
        maxSessionsPerUser: { type: Number, default: 5 }, // Concurrent session limit
        ipWhitelist: [String],
        ipWhitelistEnabled: { type: Boolean, default: false },

        // Branding (White Label)
        customLogo: String,
        customFavicon: String,
        primaryColor: { type: String, default: '#3b82f6' },
        secondaryColor: { type: String, default: '#1e40af' },
        whiteLabelEnabled: { type: Boolean, default: false },
        companyDisplayName: String,
        companyDisplayNameAr: String,
        customEmailDomain: String,
        customSupportEmail: String,

        // Data & Privacy
        dataRetentionDays: { type: Number, default: 365 },
        autoDeleteOldData: { type: Boolean, default: false },
        gdprToolsEnabled: { type: Boolean, default: false },
        dataExportEnabled: { type: Boolean, default: true }
    },

    // ═══════════════════════════════════════════════════════════════
    // BILLING
    // ═══════════════════════════════════════════════════════════════
    billing: {
        stripeCustomerId: String,
        stripeSubscriptionId: String,
        paymentMethod: {
            type: String,
            enum: ['card', 'bank_transfer', 'invoice', null],
            default: null
        },
        lastPaymentDate: Date,
        lastPaymentAmount: Number,
        nextBillingDate: Date,
        invoiceEmail: String,
        billingAddress: {
            street: String,
            city: String,
            region: String,
            postalCode: String,
            country: { type: String, default: 'Saudi Arabia' }
        },
        taxId: String, // VAT number
        autoRenew: { type: Boolean, default: true }
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

// Process member departure - converts active member to departed status
firmSchema.methods.processDeparture = async function(userId, processedBy, reason = null, notes = null) {
    const member = this.members.find(m => m.userId.toString() === userId.toString());
    if (!member) {
        throw new Error('User is not a member of this firm');
    }

    // Cannot process departure for owner
    if (member.role === 'owner') {
        throw new Error('Cannot process departure for firm owner. Transfer ownership first.');
    }

    // Already departed
    if (member.status === 'departed') {
        throw new Error('Member has already departed');
    }

    // Store original role
    member.previousRole = member.role;

    // Get cases this member was assigned to (for read-only access)
    const Case = mongoose.model('Case');
    const assignedCases = await Case.find({
        firmId: this._id,
        $or: [
            { assignedTo: userId },
            { lawyerId: userId },
            { 'team.userId': userId }
        ]
    }).select('_id');

    member.assignedCases = assignedCases.map(c => c._id);

    // Update to departed status
    member.role = 'departed';
    member.status = 'departed';
    member.departedAt = new Date();
    member.departureReason = reason;
    member.departureNotes = notes;
    member.departureProcessedBy = processedBy;

    // Set departed permissions (read-only to their own work, no finance)
    member.permissions = getDefaultPermissions('departed');

    await this.save();

    // Update user's firmRole
    const User = mongoose.model('User');
    await User.findByIdAndUpdate(userId, {
        firmRole: 'departed'
        // Note: We keep firmId so they can still access their cases
    });

    return this;
};

// Reinstate a departed member
firmSchema.methods.reinstateMember = async function(userId, newRole = null) {
    const member = this.members.find(m => m.userId.toString() === userId.toString());
    if (!member) {
        throw new Error('User is not a member of this firm');
    }

    if (member.status !== 'departed') {
        throw new Error('Member is not departed');
    }

    // Restore to previous role or new role
    const roleToAssign = newRole || member.previousRole || 'lawyer';

    member.role = roleToAssign;
    member.status = 'active';
    member.departedAt = null;
    member.departureReason = null;
    member.departureNotes = null;
    member.departureProcessedBy = null;
    member.assignedCases = [];
    member.previousRole = null;

    // Restore permissions for the role
    member.permissions = getDefaultPermissions(roleToAssign);

    await this.save();

    // Update user's firmRole
    const User = mongoose.model('User');
    await User.findByIdAndUpdate(userId, { firmRole: roleToAssign });

    return this;
};

// Get all active members (excludes departed)
firmSchema.methods.getActiveMembers = function() {
    return this.members.filter(m => m.status === 'active');
};

// Get all departed members
firmSchema.methods.getDepartedMembers = function() {
    return this.members.filter(m => m.status === 'departed');
};

// Check if user is departed
firmSchema.methods.isDeparted = function(userId) {
    const member = this.members.find(m => m.userId.toString() === userId.toString());
    return member?.status === 'departed';
};

// Helper function for default permissions by role
function getDefaultPermissions(role) {
    const permissions = {
        owner: {
            clients: 'full', cases: 'full', leads: 'full', invoices: 'full', payments: 'full',
            expenses: 'full', documents: 'full', tasks: 'full', events: 'full', timeTracking: 'full',
            reports: 'full', settings: 'full', team: 'full',
            canApproveInvoices: true, canManageRetainers: true, canExportData: true,
            canDeleteRecords: true, canViewFinance: true, canManageTeam: true
        },
        admin: {
            clients: 'full', cases: 'full', leads: 'full', invoices: 'full', payments: 'full',
            expenses: 'full', documents: 'full', tasks: 'full', events: 'full', timeTracking: 'full',
            reports: 'full', settings: 'edit', team: 'full',
            canApproveInvoices: true, canManageRetainers: true, canExportData: true,
            canDeleteRecords: true, canViewFinance: true, canManageTeam: true
        },
        partner: {
            clients: 'full', cases: 'full', leads: 'full', invoices: 'full', payments: 'edit',
            expenses: 'edit', documents: 'full', tasks: 'full', events: 'full', timeTracking: 'full',
            reports: 'view', settings: 'view', team: 'view',
            canApproveInvoices: true, canManageRetainers: true, canExportData: true,
            canDeleteRecords: false, canViewFinance: true, canManageTeam: false
        },
        lawyer: {
            clients: 'edit', cases: 'edit', leads: 'edit', invoices: 'edit', payments: 'view',
            expenses: 'edit', documents: 'edit', tasks: 'full', events: 'full', timeTracking: 'full',
            reports: 'view', settings: 'none', team: 'view',
            canApproveInvoices: false, canManageRetainers: false, canExportData: false,
            canDeleteRecords: false, canViewFinance: false, canManageTeam: false
        },
        paralegal: {
            clients: 'edit', cases: 'edit', leads: 'edit', invoices: 'view', payments: 'none',
            expenses: 'view', documents: 'edit', tasks: 'edit', events: 'edit', timeTracking: 'edit',
            reports: 'none', settings: 'none', team: 'view',
            canApproveInvoices: false, canManageRetainers: false, canExportData: false,
            canDeleteRecords: false, canViewFinance: false, canManageTeam: false
        },
        secretary: {
            clients: 'view', cases: 'view', leads: 'edit', invoices: 'view', payments: 'view',
            expenses: 'view', documents: 'view', tasks: 'edit', events: 'edit', timeTracking: 'view',
            reports: 'none', settings: 'none', team: 'view',
            canApproveInvoices: false, canManageRetainers: false, canExportData: false,
            canDeleteRecords: false, canViewFinance: false, canManageTeam: false
        },
        accountant: {
            clients: 'view', cases: 'none', leads: 'none', invoices: 'full', payments: 'full',
            expenses: 'full', documents: 'view', tasks: 'edit', events: 'edit', timeTracking: 'view',
            reports: 'full', settings: 'none', team: 'none',
            canApproveInvoices: true, canManageRetainers: true, canExportData: true,
            canDeleteRecords: false, canViewFinance: true, canManageTeam: false
        },
        // Departed employees - read-only to their own cases/tasks, NO finance access
        departed: {
            clients: 'none', cases: 'view', leads: 'none', invoices: 'none', payments: 'none',
            expenses: 'none', documents: 'view', tasks: 'view', events: 'view', timeTracking: 'view',
            reports: 'none', settings: 'none', team: 'none',
            canApproveInvoices: false, canManageRetainers: false, canExportData: false,
            canDeleteRecords: false, canViewFinance: false, canManageTeam: false
        }
    };

    return permissions[role] || permissions.secretary;
}

module.exports = mongoose.model('Firm', firmSchema);
