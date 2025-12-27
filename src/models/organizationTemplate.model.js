const mongoose = require('mongoose');

/**
 * Organization Template Model
 *
 * Provides reusable firm configuration blueprints with predefined:
 * - Role hierarchies and permissions
 * - Default firm settings
 * - Security configurations
 * - Feature toggles
 *
 * Templates can be applied to new firms during creation or to existing firms
 * to standardize configurations across organizations.
 */

// Role configuration schema
const roleConfigSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        enum: ['owner', 'admin', 'partner', 'lawyer', 'paralegal', 'secretary', 'accountant'],
        trim: true
    },
    permissions: {
        // Module access levels
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
        hr: { type: String, enum: ['none', 'view', 'edit', 'full'], default: 'none' },

        // Special permissions
        canApproveInvoices: { type: Boolean, default: false },
        canManageRetainers: { type: Boolean, default: false },
        canExportData: { type: Boolean, default: false },
        canDeleteRecords: { type: Boolean, default: false },
        canViewFinance: { type: Boolean, default: false },
        canManageTeam: { type: Boolean, default: false }
    },
    isDefault: {
        type: Boolean,
        default: false,
        description: 'Whether this is the default role assigned to new members'
    },
    description: {
        type: String,
        trim: true
    },
    descriptionAr: {
        type: String,
        trim: true
    }
}, { _id: false });

// Firm settings schema
const settingsConfigSchema = new mongoose.Schema({
    // Session & Security
    maxConcurrentSessions: { type: Number, default: 5, min: 1, max: 50 },
    sessionTimeout: { type: Number, default: 7, min: 1, max: 30 }, // Days
    mfaRequired: { type: Boolean, default: false },
    ipRestrictionEnabled: { type: Boolean, default: false },

    // Default rate limits
    defaultRateLimits: {
        api: { type: Number, default: 1000, min: 100, max: 100000 }, // Requests per hour
        upload: { type: Number, default: 50, min: 10, max: 500 }, // Uploads per hour
        export: { type: Number, default: 10, min: 5, max: 100 } // Exports per hour
    },

    // Password policy
    passwordPolicy: {
        minLength: { type: Number, default: 8, min: 6, max: 32 },
        requireUppercase: { type: Boolean, default: false },
        requireLowercase: { type: Boolean, default: false },
        requireNumbers: { type: Boolean, default: false },
        requireSpecialChars: { type: Boolean, default: false },
        maxAgeDays: { type: Number, default: 90, min: 0, max: 365 },
        preventReuse: { type: Number, default: 0, min: 0, max: 24 }
    },

    // Localization
    timezone: { type: String, default: 'Asia/Riyadh' },
    language: { type: String, enum: ['ar', 'en'], default: 'ar' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    fiscalYearStart: { type: Number, default: 1, min: 1, max: 12 },

    // Case & Client defaults
    defaultCasePrefix: { type: String, default: 'CASE' },
    defaultClientPrefix: { type: String, default: 'CLT' },
    numberingFormat: { type: String, enum: ['sequential', 'yearly'], default: 'yearly' },

    // Billing defaults
    defaultCurrency: { type: String, default: 'SAR' },
    defaultPaymentTerms: { type: Number, default: 30 }, // Days
    invoicePrefix: { type: String, default: 'INV' },

    // Data retention
    dataRetentionDays: { type: Number, default: 365, min: 0 },
    autoDeleteOldData: { type: Boolean, default: false }
}, { _id: false });

// Main template schema
const organizationTemplateSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // BASIC INFO
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },
    name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    nameAr: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    descriptionAr: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // TEMPLATE STATUS
    // ═══════════════════════════════════════════════════════════════
    isDefault: {
        type: Boolean,
        default: false,
        index: true,
        description: 'Whether this is the default template for new firms'
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
        description: 'Whether this template is available for use'
    },
    isGlobal: {
        type: Boolean,
        default: false,
        description: 'Whether this is a system template (not editable by users)'
    },

    // ═══════════════════════════════════════════════════════════════
    // ROLE CONFIGURATIONS
    // ═══════════════════════════════════════════════════════════════
    roles: {
        type: [roleConfigSchema],
        default: [],
        validate: {
            validator: function(roles) {
                // Must have at least one role
                if (roles.length === 0) return false;

                // Only one role can be default
                const defaultRoles = roles.filter(r => r.isDefault);
                return defaultRoles.length <= 1;
            },
            message: 'Template must have at least one role and only one default role'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // FIRM SETTINGS
    // ═══════════════════════════════════════════════════════════════
    settings: {
        type: settingsConfigSchema,
        default: () => ({})
    },

    // ═══════════════════════════════════════════════════════════════
    // FEATURES & CAPABILITIES
    // ═══════════════════════════════════════════════════════════════
    features: {
        // AI Features
        nlpTaskCreation: { type: Boolean, default: false },
        voiceToTask: { type: Boolean, default: false },
        smartScheduling: { type: Boolean, default: false },
        aiAssistant: { type: Boolean, default: false },

        // Advanced Features
        zatcaIntegration: { type: Boolean, default: false },
        advancedReports: { type: Boolean, default: false },
        multiCurrency: { type: Boolean, default: false },
        apiAccess: { type: Boolean, default: false },
        customBranding: { type: Boolean, default: false },

        // Collaboration
        dealRooms: { type: Boolean, default: false },
        clientPortal: { type: Boolean, default: false },
        documentSharing: { type: Boolean, default: true },

        // Security
        ssoEnabled: { type: Boolean, default: false },
        auditLogs: { type: Boolean, default: true },
        encryptionAtRest: { type: Boolean, default: false }
    },

    // ═══════════════════════════════════════════════════════════════
    // SUBSCRIPTION DEFAULTS
    // ═══════════════════════════════════════════════════════════════
    subscriptionDefaults: {
        plan: {
            type: String,
            enum: ['free', 'starter', 'professional', 'enterprise'],
            default: 'starter'
        },
        trialDays: { type: Number, default: 14, min: 0, max: 90 },
        maxUsers: { type: Number, default: 5, min: 1, max: 1000 },
        maxCases: { type: Number, default: 100, min: 10, max: 100000 },
        maxClients: { type: Number, default: 200, min: 20, max: 100000 },
        maxStorageGB: { type: Number, default: 10, min: 1, max: 10000 }
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    metadata: {
        targetFirmSize: {
            type: String,
            enum: ['solo', 'small', 'medium', 'large', 'enterprise'],
            default: 'small'
        },
        targetPracticeAreas: [String],
        recommendedFor: [String],
        notes: String,
        notesAr: String
    },

    // ═══════════════════════════════════════════════════════════════
    // USAGE TRACKING
    // ═══════════════════════════════════════════════════════════════
    usageCount: {
        type: Number,
        default: 0,
        min: 0
    },
    lastUsedAt: Date,

    // ═══════════════════════════════════════════════════════════════
    // AUDIT FIELDS
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Version tracking
    version: {
        type: Number,
        default: 1,
        min: 1
    },
    parentTemplateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationTemplate',
        description: 'If this was cloned from another template'
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
organizationTemplateSchema.index({ name: 'text', description: 'text' });
organizationTemplateSchema.index({ isActive: 1, isDefault: 1 });
organizationTemplateSchema.index({ 'metadata.targetFirmSize': 1 });
organizationTemplateSchema.index({ createdBy: 1, createdAt: -1 });
organizationTemplateSchema.index({ usageCount: -1 });
organizationTemplateSchema.index({ firmId: 1, createdAt: -1 });

// Unique constraint for default templates
organizationTemplateSchema.index(
    { isDefault: 1 },
    {
        unique: true,
        partialFilterExpression: { isDefault: true }
    }
);

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Record usage of this template
 */
organizationTemplateSchema.methods.recordUsage = async function() {
    this.usageCount += 1;
    this.lastUsedAt = new Date();
    await this.save();
};

/**
 * Get role by name
 */
organizationTemplateSchema.methods.getRole = function(roleName) {
    return this.roles.find(r => r.name === roleName);
};

/**
 * Get default role
 */
organizationTemplateSchema.methods.getDefaultRole = function() {
    return this.roles.find(r => r.isDefault) || this.roles[0];
};

/**
 * Validate template can be applied (checks for consistency)
 */
organizationTemplateSchema.methods.validate = function() {
    const errors = [];

    // Check roles
    if (this.roles.length === 0) {
        errors.push('Template must have at least one role');
    }

    // Check for owner role
    const hasOwner = this.roles.some(r => r.name === 'owner');
    if (!hasOwner) {
        errors.push('Template must include an owner role');
    }

    // Check default role exists
    const defaultRole = this.getDefaultRole();
    if (!defaultRole) {
        errors.push('Template must have a default role');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Create a clean copy for application (without metadata)
 */
organizationTemplateSchema.methods.toApplicationConfig = function() {
    return {
        roles: this.roles.map(r => r.toObject()),
        settings: this.settings ? this.settings.toObject() : {},
        features: this.features ? this.features.toObject() : {},
        subscriptionDefaults: this.subscriptionDefaults ? this.subscriptionDefaults.toObject() : {}
    };
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get default template
 */
organizationTemplateSchema.statics.getDefault = async function() {
    return await this.findOne({ isDefault: true, isActive: true });
};

/**
 * Get all active templates
 */
organizationTemplateSchema.statics.getActive = async function(filters = {}) {
    return await this.find({
        isActive: true,
        ...filters
    }).sort({ usageCount: -1, name: 1 });
};

/**
 * Get popular templates
 */
organizationTemplateSchema.statics.getPopular = async function(limit = 10) {
    return await this.find({ isActive: true })
        .sort({ usageCount: -1 })
        .limit(limit)
        .select('name nameAr description descriptionAr usageCount metadata');
};

/**
 * Get templates by firm size
 */
organizationTemplateSchema.statics.getByFirmSize = async function(size) {
    return await this.find({
        isActive: true,
        'metadata.targetFirmSize': size
    }).sort({ usageCount: -1 });
};

/**
 * Set new default template (removes old default)
 */
organizationTemplateSchema.statics.setDefault = async function(templateId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Remove current default
        await this.updateMany(
            { isDefault: true },
            { $set: { isDefault: false } },
            { session }
        );

        // Set new default
        const template = await this.findByIdAndUpdate(
            templateId,
            { $set: { isDefault: true, isActive: true } },
            { new: true, session }
        );

        await session.commitTransaction();
        return template;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

/**
 * Clone a template
 */
organizationTemplateSchema.statics.cloneTemplate = async function(templateId, newName, userId) {
    const original = await this.findById(templateId);
    if (!original) {
        throw new Error('Template not found');
    }

    const cloned = new this({
        name: newName || `${original.name} (Copy)`,
        nameAr: original.nameAr ? `${original.nameAr} (نسخة)` : undefined,
        description: original.description,
        descriptionAr: original.descriptionAr,
        roles: original.roles,
        settings: original.settings,
        features: original.features,
        subscriptionDefaults: original.subscriptionDefaults,
        metadata: original.metadata,
        isDefault: false,
        isActive: true,
        isGlobal: false,
        parentTemplateId: templateId,
        createdBy: userId,
        version: 1
    });

    await cloned.save();
    return cloned;
};

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

// Pre-save middleware to increment version
organizationTemplateSchema.pre('save', function(next) {
    if (this.isModified() && !this.isNew) {
        this.version += 1;
    }
    next();
});

// Pre-save middleware to validate only one default template
organizationTemplateSchema.pre('save', async function(next) {
    if (this.isDefault && this.isModified('isDefault')) {
        const existingDefault = await this.constructor.findOne({
            isDefault: true,
            _id: { $ne: this._id }
        });

        if (existingDefault) {
            existingDefault.isDefault = false;
            await existingDefault.save();
        }
    }
    next();
});

module.exports = mongoose.model('OrganizationTemplate', organizationTemplateSchema);
