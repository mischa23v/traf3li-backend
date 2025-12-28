/**
 * Dashboard Settings Model - User View Preferences
 *
 * Enables users to CHOOSE their view complexity (Basic/Advanced)
 * Like Finance module - user choice, NOT role-based auto-detection
 *
 * Any user can pick Basic or Advanced regardless of role:
 * - Solo lawyer can choose Advanced
 * - Big firm partner can choose Basic
 *
 * Multi-tenant: firmId for firms, lawyerId for solo lawyers
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// Module-specific view settings
const ModuleViewSettingsSchema = new Schema({
    viewMode: {
        type: String,
        enum: ['basic', 'advanced'],
        default: 'basic'
    },
    // Collapsed/expanded sections in dashboard
    collapsedSections: [{
        type: String,
        maxlength: 100
    }],
    // Pinned widgets/cards
    pinnedWidgets: [{
        type: String,
        maxlength: 100
    }],
    // Default time period for charts
    defaultPeriod: {
        type: String,
        enum: ['week', 'month', 'quarter', 'year'],
        default: 'month'
    },
    // Chart preferences
    preferredChartType: {
        type: String,
        enum: ['bar', 'line', 'pie', 'doughnut', 'area'],
        default: 'bar'
    },
    // Sort preferences
    defaultSort: {
        field: { type: String, maxlength: 100 },
        order: { type: String, enum: ['asc', 'desc'], default: 'desc' }
    },
    // Items per page
    pageSize: {
        type: Number,
        default: 20,
        min: 10,
        max: 100
    }
}, { _id: false });

// Report preferences
const ReportPreferencesSchema = new Schema({
    format: {
        type: String,
        enum: ['pdf', 'excel', 'csv'],
        default: 'pdf'
    },
    includeCharts: {
        type: Boolean,
        default: true
    },
    includeSummary: {
        type: Boolean,
        default: true
    },
    emailOnGeneration: {
        type: Boolean,
        default: false
    },
    scheduledReports: [{
        reportType: { type: String, maxlength: 100 },
        frequency: { type: String, enum: ['daily', 'weekly', 'monthly'] },
        dayOfWeek: { type: Number, min: 0, max: 6 }, // 0 = Sunday
        dayOfMonth: { type: Number, min: 1, max: 28 },
        time: { type: String, maxlength: 10 }, // "09:00"
        recipients: [{ type: String, maxlength: 200 }]
    }]
}, { _id: false });

// Notification preferences for modules
const NotificationPreferencesSchema = new Schema({
    enabled: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true },
    // Specific notifications
    newLead: { type: Boolean, default: true },
    leadScoreChange: { type: Boolean, default: false },
    dealWon: { type: Boolean, default: true },
    dealLost: { type: Boolean, default: true },
    quoteExpiring: { type: Boolean, default: true },
    orderStatusChange: { type: Boolean, default: true },
    paymentReceived: { type: Boolean, default: true },
    taskDue: { type: Boolean, default: true },
    targetProgress: { type: Boolean, default: true }
}, { _id: false });

const dashboardSettingsSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // MULTI-TENANCY (REQUIRED)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
    },
    lawyerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // GLOBAL VIEW MODE - User's overall preference
    // ═══════════════════════════════════════════════════════════════
    globalViewMode: {
        type: String,
        enum: ['basic', 'advanced'],
        default: 'basic'
    },

    // ═══════════════════════════════════════════════════════════════
    // MODULE-SPECIFIC VIEW SETTINGS
    // ═══════════════════════════════════════════════════════════════
    crm: {
        type: ModuleViewSettingsSchema,
        default: () => ({})
    },
    sales: {
        type: ModuleViewSettingsSchema,
        default: () => ({})
    },
    finance: {
        type: ModuleViewSettingsSchema,
        default: () => ({})
    },
    hr: {
        type: ModuleViewSettingsSchema,
        default: () => ({})
    },
    cases: {
        type: ModuleViewSettingsSchema,
        default: () => ({})
    },

    // ═══════════════════════════════════════════════════════════════
    // REPORT PREFERENCES
    // ═══════════════════════════════════════════════════════════════
    reports: {
        type: ReportPreferencesSchema,
        default: () => ({})
    },

    // ═══════════════════════════════════════════════════════════════
    // NOTIFICATION PREFERENCES
    // ═══════════════════════════════════════════════════════════════
    notifications: {
        type: NotificationPreferencesSchema,
        default: () => ({})
    },

    // ═══════════════════════════════════════════════════════════════
    // HOMEPAGE & DASHBOARD LAYOUT
    // ═══════════════════════════════════════════════════════════════
    homepage: {
        defaultModule: {
            type: String,
            enum: ['dashboard', 'crm', 'sales', 'finance', 'hr', 'cases'],
            default: 'dashboard'
        },
        // Layout grid positions
        widgetLayout: [{
            widgetId: { type: String, maxlength: 100 },
            position: {
                x: { type: Number, default: 0 },
                y: { type: Number, default: 0 },
                w: { type: Number, default: 1 },
                h: { type: Number, default: 1 }
            },
            visible: { type: Boolean, default: true }
        }],
        showWelcomeCard: { type: Boolean, default: true },
        showQuickActions: { type: Boolean, default: true },
        showRecentActivity: { type: Boolean, default: true }
    },

    // ═══════════════════════════════════════════════════════════════
    // QUICK FILTERS - Saved filter presets
    // ═══════════════════════════════════════════════════════════════
    savedFilters: {
        leads: [{
            name: { type: String, maxlength: 100 },
            filters: Schema.Types.Mixed,
            isDefault: { type: Boolean, default: false }
        }],
        quotes: [{
            name: { type: String, maxlength: 100 },
            filters: Schema.Types.Mixed,
            isDefault: { type: Boolean, default: false }
        }],
        orders: [{
            name: { type: String, maxlength: 100 },
            filters: Schema.Types.Mixed,
            isDefault: { type: Boolean, default: false }
        }],
        clients: [{
            name: { type: String, maxlength: 100 },
            filters: Schema.Types.Mixed,
            isDefault: { type: Boolean, default: false }
        }]
    },

    // ═══════════════════════════════════════════════════════════════
    // ONBOARDING & TIPS
    // ═══════════════════════════════════════════════════════════════
    onboarding: {
        completed: { type: Boolean, default: false },
        completedAt: Date,
        skippedSteps: [{ type: String }],
        showTips: { type: Boolean, default: true },
        dismissedTips: [{ type: String }]
    },

    // ═══════════════════════════════════════════════════════════════
    // ACCESSIBILITY
    // ═══════════════════════════════════════════════════════════════
    accessibility: {
        fontSize: {
            type: String,
            enum: ['small', 'medium', 'large'],
            default: 'medium'
        },
        highContrast: { type: Boolean, default: false },
        reduceMotion: { type: Boolean, default: false }
    },

    // ═══════════════════════════════════════════════════════════════
    // KEYBOARD SHORTCUTS
    // ═══════════════════════════════════════════════════════════════
    keyboardShortcuts: {
        enabled: { type: Boolean, default: true },
        customMappings: { type: Map, of: String }
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    lastModifiedAt: Date,
    version: { type: Number, default: 1 }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
dashboardSettingsSchema.index({ userId: 1 }, { unique: true });
dashboardSettingsSchema.index({ firmId: 1, userId: 1 });
dashboardSettingsSchema.index({ lawyerId: 1 });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get or create settings for a user
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} firmId - Firm ID (optional)
 * @param {ObjectId} lawyerId - Lawyer ID (optional)
 */
dashboardSettingsSchema.statics.getOrCreate = async function(userId, firmId = null, lawyerId = null) {
    let settings = await this.findOne({ userId });

    if (!settings) {
        settings = await this.create({
            userId,
            firmId,
            lawyerId,
            globalViewMode: 'basic',
            crm: { viewMode: 'basic' },
            sales: { viewMode: 'basic' },
            finance: { viewMode: 'basic' }
        });
    }

    return settings;
};

/**
 * Update view mode for a specific module
 * @param {ObjectId} userId - User ID
 * @param {string} module - Module name (crm, sales, finance, hr, cases)
 * @param {string} viewMode - View mode (basic, advanced)
 */
dashboardSettingsSchema.statics.updateModuleViewMode = async function(userId, module, viewMode) {
    const validModules = ['crm', 'sales', 'finance', 'hr', 'cases'];
    const validModes = ['basic', 'advanced'];

    if (!validModules.includes(module)) {
        throw new Error(`Invalid module: ${module}`);
    }
    if (!validModes.includes(viewMode)) {
        throw new Error(`Invalid view mode: ${viewMode}`);
    }

    const updatePath = `${module}.viewMode`;
    return this.findOneAndUpdate(
        { userId },
        {
            $set: {
                [updatePath]: viewMode,
                lastModifiedAt: new Date()
            },
            $inc: { version: 1 }
        },
        { new: true, upsert: true }
    );
};

/**
 * Get view mode for a specific module
 * @param {ObjectId} userId - User ID
 * @param {string} module - Module name
 * @returns {string} - View mode (basic or advanced)
 */
dashboardSettingsSchema.statics.getModuleViewMode = async function(userId, module) {
    const settings = await this.findOne({ userId }).lean();

    if (!settings) {
        return 'basic';
    }

    return settings[module]?.viewMode || settings.globalViewMode || 'basic';
};

/**
 * Update global view mode (applies to all modules)
 * @param {ObjectId} userId - User ID
 * @param {string} viewMode - View mode (basic, advanced)
 */
dashboardSettingsSchema.statics.updateGlobalViewMode = async function(userId, viewMode) {
    const validModes = ['basic', 'advanced'];
    if (!validModes.includes(viewMode)) {
        throw new Error(`Invalid view mode: ${viewMode}`);
    }

    return this.findOneAndUpdate(
        { userId },
        {
            $set: {
                globalViewMode: viewMode,
                'crm.viewMode': viewMode,
                'sales.viewMode': viewMode,
                'finance.viewMode': viewMode,
                'hr.viewMode': viewMode,
                'cases.viewMode': viewMode,
                lastModifiedAt: new Date()
            },
            $inc: { version: 1 }
        },
        { new: true, upsert: true }
    );
};

/**
 * Save filter preset
 * @param {ObjectId} userId - User ID
 * @param {string} entity - Entity type (leads, quotes, orders, clients)
 * @param {string} name - Filter name
 * @param {object} filters - Filter configuration
 * @param {boolean} isDefault - Set as default
 */
dashboardSettingsSchema.statics.saveFilterPreset = async function(userId, entity, name, filters, isDefault = false) {
    const validEntities = ['leads', 'quotes', 'orders', 'clients'];
    if (!validEntities.includes(entity)) {
        throw new Error(`Invalid entity: ${entity}`);
    }

    const settings = await this.getOrCreate(userId);
    const filterList = settings.savedFilters[entity] || [];

    // If setting as default, unset others
    if (isDefault) {
        filterList.forEach(f => { f.isDefault = false; });
    }

    // Check if filter with same name exists
    const existingIndex = filterList.findIndex(f => f.name === name);
    if (existingIndex >= 0) {
        filterList[existingIndex] = { name, filters, isDefault };
    } else {
        filterList.push({ name, filters, isDefault });
    }

    settings.savedFilters[entity] = filterList;
    settings.lastModifiedAt = new Date();
    settings.version += 1;

    return settings.save();
};

/**
 * Toggle collapsed section
 * @param {ObjectId} userId - User ID
 * @param {string} module - Module name
 * @param {string} sectionId - Section identifier
 */
dashboardSettingsSchema.statics.toggleSection = async function(userId, module, sectionId) {
    const settings = await this.getOrCreate(userId);
    const collapsedSections = settings[module]?.collapsedSections || [];

    const index = collapsedSections.indexOf(sectionId);
    if (index >= 0) {
        collapsedSections.splice(index, 1);
    } else {
        collapsedSections.push(sectionId);
    }

    settings[module] = settings[module] || {};
    settings[module].collapsedSections = collapsedSections;
    settings.lastModifiedAt = new Date();
    settings.version += 1;

    return settings.save();
};

/**
 * Dismiss tip
 * @param {ObjectId} userId - User ID
 * @param {string} tipId - Tip identifier
 */
dashboardSettingsSchema.statics.dismissTip = async function(userId, tipId) {
    return this.findOneAndUpdate(
        { userId },
        {
            $addToSet: { 'onboarding.dismissedTips': tipId },
            $set: { lastModifiedAt: new Date() },
            $inc: { version: 1 }
        },
        { new: true, upsert: true }
    );
};

/**
 * Complete onboarding
 * @param {ObjectId} userId - User ID
 */
dashboardSettingsSchema.statics.completeOnboarding = async function(userId) {
    return this.findOneAndUpdate(
        { userId },
        {
            $set: {
                'onboarding.completed': true,
                'onboarding.completedAt': new Date(),
                lastModifiedAt: new Date()
            },
            $inc: { version: 1 }
        },
        { new: true, upsert: true }
    );
};

module.exports = mongoose.model('DashboardSettings', dashboardSettingsSchema);
