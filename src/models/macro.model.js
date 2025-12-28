/**
 * Macro Model
 *
 * Represents canned responses and automated actions for efficient customer support
 * and communication workflows. Macros provide templated responses and can trigger
 * multiple automated actions.
 *
 * Features:
 * - Templated responses with variable substitution
 * - Multiple automated actions (status changes, assignments, notifications, etc.)
 * - Scoped access control (personal, team, global)
 * - Keyboard shortcuts for quick access
 * - Smart suggestion based on keywords
 * - Usage tracking and analytics
 * - Category-based organization with nesting support
 *
 * @module models/Macro
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

/**
 * Variable Schema
 * Defines template variables that can be used in response templates
 */
const variableSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
        // e.g., 'clientName', 'caseNumber', 'dueDate'
    },
    defaultValue: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: 200
    },
    required: {
        type: Boolean,
        default: false
    }
}, { _id: true });

/**
 * Response Template Schema
 * Contains the template for automated responses
 */
const responseTemplateSchema = new mongoose.Schema({
    subject: {
        type: String,
        trim: true,
        maxlength: 500
        // Email subject or response title (supports variables like {{clientName}})
    },
    body: {
        type: String,
        required: true,
        maxlength: 10000
        // Response body content (supports variables)
    },
    bodyType: {
        type: String,
        enum: ['text', 'html'],
        default: 'text'
    },
    variables: [variableSchema]
}, { _id: false });

/**
 * Action Schema
 * Defines automated actions that are executed when macro is applied
 */
const actionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: [
            'set_status',           // Change status (e.g., case, ticket)
            'set_priority',         // Change priority level
            'assign_to',            // Assign to user/team
            'add_tag',              // Add tags
            'remove_tag',           // Remove tags
            'set_field',            // Set custom field value
            'apply_sla',            // Apply SLA policy
            'send_notification',    // Send notification
            'close'                 // Close/resolve item
        ],
        required: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
        // Value depends on action type:
        // - set_status: 'open', 'pending', 'resolved', etc.
        // - set_priority: 'low', 'medium', 'high', etc.
        // - assign_to: userId (ObjectId)
        // - add_tag/remove_tag: tag name (String) or array
        // - set_field: { field: 'fieldName', value: 'fieldValue' }
        // - apply_sla: slaId (ObjectId)
        // - send_notification: { userId: ObjectId, message: String }
        // - close: true/false or { reason: String }
    },
    field: {
        type: String,
        trim: true
        // Field name for set_field action
    },
    condition: {
        type: mongoose.Schema.Types.Mixed
        // Optional condition to execute action
        // MongoDB query format, e.g., { status: 'pending', priority: 'high' }
    },
    order: {
        type: Number,
        default: 0
        // Execution order (lower numbers execute first)
    }
}, { _id: true });

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const macroSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ═══════════════════════════════════════════════════════════════
    // BASIC INFO
    // ═══════════════════════════════════════════════════════════════
    name: {
        type: String,
        required: [true, 'Macro name is required'],
        trim: true,
        maxlength: 200,
        index: true
    },

    category: {
        type: String,
        trim: true,
        index: true
        // Supports nesting with :: delimiter
        // Examples: 'Billing::Refund', 'Support::Technical', 'Sales::Follow-up'
    },

    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },

    // ═══════════════════════════════════════════════════════════════
    // ACCESS CONTROL
    // ═══════════════════════════════════════════════════════════════
    scope: {
        type: String,
        enum: ['personal', 'team', 'global'],
        default: 'personal',
        index: true
        // personal: Only visible to owner
        // team: Visible to team members
        // global: Visible to entire firm
    },

    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
        // Required for personal scope, optional for team/global
    },

    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationalUnit',
        index: true
        // Required for team scope
    },

    // ═══════════════════════════════════════════════════════════════
    // RESPONSE TEMPLATE
    // ═══════════════════════════════════════════════════════════════
    responseTemplate: responseTemplateSchema,

    // ═══════════════════════════════════════════════════════════════
    // AUTOMATED ACTIONS
    // ═══════════════════════════════════════════════════════════════
    actions: [actionSchema],

    // ═══════════════════════════════════════════════════════════════
    // USAGE & ANALYTICS
    // ═══════════════════════════════════════════════════════════════
    usageCount: {
        type: Number,
        default: 0,
        min: 0,
        index: true
    },

    lastUsedAt: {
        type: Date,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // QUICK ACCESS & SUGGESTIONS
    // ═══════════════════════════════════════════════════════════════
    shortcuts: [{
        type: String,
        trim: true,
        maxlength: 50
        // Keyboard shortcuts or quick access codes
        // Examples: '/refund', '/close-ticket', 'ctrl+shift+r'
    }],

    suggestFor: [{
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 100
        // Keywords that trigger macro suggestion
        // Examples: 'refund', 'payment issue', 'technical problem'
    }],

    // ═══════════════════════════════════════════════════════════════
    // STATUS & CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    isFavorite: {
        type: Boolean,
        default: false
        // User can mark macros as favorite for quick access
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
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

// Compound indexes for efficient queries
macroSchema.index({ firmId: 1, scope: 1, isActive: 1 });
macroSchema.index({ firmId: 1, category: 1, isActive: 1 });
macroSchema.index({ firmId: 1, ownerId: 1, scope: 1 });
macroSchema.index({ firmId: 1, teamId: 1, scope: 1 });
macroSchema.index({ firmId: 1, usageCount: -1 });
macroSchema.index({ shortcuts: 1 });
macroSchema.index({ suggestFor: 1 });

// Text search index for name, description, and keywords
macroSchema.index({ name: 'text', description: 'text', suggestFor: 'text' });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════

/**
 * Get category path as array
 * 'Billing::Refund::Credit Card' => ['Billing', 'Refund', 'Credit Card']
 */
macroSchema.virtual('categoryPath').get(function() {
    return this.category ? this.category.split('::').map(c => c.trim()) : [];
});

/**
 * Get parent category
 * 'Billing::Refund::Credit Card' => 'Billing::Refund'
 */
macroSchema.virtual('parentCategory').get(function() {
    if (!this.category || !this.category.includes('::')) {
        return null;
    }
    const parts = this.category.split('::');
    parts.pop();
    return parts.join('::');
});

/**
 * Get primary shortcut (first one)
 */
macroSchema.virtual('primaryShortcut').get(function() {
    return this.shortcuts && this.shortcuts.length > 0 ? this.shortcuts[0] : null;
});

/**
 * Check if macro has actions
 */
macroSchema.virtual('hasActions').get(function() {
    return this.actions && this.actions.length > 0;
});

/**
 * Check if macro has response template
 */
macroSchema.virtual('hasResponse').get(function() {
    return this.responseTemplate && this.responseTemplate.body;
});

macroSchema.set('toJSON', { virtuals: true });
macroSchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Increment usage count and update last used timestamp
 * @returns {Promise<Macro>} Updated macro
 */
macroSchema.methods.recordUsage = async function() {
    this.usageCount = (this.usageCount || 0) + 1;
    this.lastUsedAt = new Date();
    return await this.save();
};

/**
 * Check if user has access to this macro
 * @param {ObjectId|String} userId - User ID to check
 * @param {Array<ObjectId|String>} userTeams - User's team IDs
 * @returns {Boolean} True if user has access
 */
macroSchema.methods.hasAccess = function(userId, userTeams = []) {
    // Global macros are accessible to all firm members
    if (this.scope === 'global') {
        return true;
    }

    // Personal macros only accessible to owner
    if (this.scope === 'personal') {
        return this.ownerId && this.ownerId.toString() === userId.toString();
    }

    // Team macros accessible to team members
    if (this.scope === 'team' && this.teamId) {
        return userTeams.some(teamId =>
            teamId.toString() === this.teamId.toString()
        );
    }

    return false;
};

/**
 * Render response template with variable substitution
 * @param {Object} variables - Key-value pairs for variable replacement
 * @returns {Object} Rendered template { subject, body }
 */
macroSchema.methods.renderTemplate = function(variables = {}) {
    if (!this.responseTemplate || !this.responseTemplate.body) {
        return null;
    }

    const template = this.responseTemplate;
    let subject = template.subject || '';
    let body = template.body || '';

    // Replace variables in format {{variableName}}
    const pattern = /\{\{(\w+)\}\}/g;

    subject = subject.replace(pattern, (match, varName) => {
        return variables[varName] !== undefined ? variables[varName] : match;
    });

    body = body.replace(pattern, (match, varName) => {
        return variables[varName] !== undefined ? variables[varName] : match;
    });

    return {
        subject,
        body,
        bodyType: template.bodyType
    };
};

/**
 * Get actions sorted by order
 * @returns {Array} Sorted actions
 */
macroSchema.methods.getSortedActions = function() {
    if (!this.actions || this.actions.length === 0) {
        return [];
    }
    return [...this.actions].sort((a, b) => (a.order || 0) - (b.order || 0));
};

/**
 * Validate macro configuration
 * @returns {Object} Validation result { isValid, errors }
 */
macroSchema.methods.validateConfiguration = function() {
    const errors = [];

    // Validate scope-specific requirements
    if (this.scope === 'personal' && !this.ownerId) {
        errors.push('Personal scope requires ownerId');
    }

    if (this.scope === 'team' && !this.teamId) {
        errors.push('Team scope requires teamId');
    }

    // Validate that at least response or actions exist
    const hasResponse = this.responseTemplate && this.responseTemplate.body;
    const hasActions = this.actions && this.actions.length > 0;

    if (!hasResponse && !hasActions) {
        errors.push('Macro must have either a response template or actions');
    }

    // Validate actions
    if (this.actions && this.actions.length > 0) {
        this.actions.forEach((action, index) => {
            if (action.type === 'set_field' && !action.field) {
                errors.push(`Action ${index}: set_field requires field property`);
            }
            if (!action.value) {
                errors.push(`Action ${index}: value is required`);
            }
        });
    }

    // Validate shortcuts for uniqueness (within this macro)
    if (this.shortcuts && this.shortcuts.length > 0) {
        const uniqueShortcuts = new Set(this.shortcuts);
        if (uniqueShortcuts.size !== this.shortcuts.length) {
            errors.push('Shortcuts must be unique');
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get macros accessible to a user
 * @param {ObjectId} firmId - Firm ID
 * @param {ObjectId} userId - User ID
 * @param {Array<ObjectId>} userTeams - User's team IDs
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of accessible macros
 */
macroSchema.statics.getAccessibleMacros = async function(firmId, userId, userTeams = [], options = {}) {
    const {
        category = null,
        search = null,
        isActive = true,
        limit = 100,
        sort = { usageCount: -1 }
    } = options;

    const query = {
        firmId: new mongoose.Types.ObjectId(firmId),
        isActive,
        $or: [
            { scope: 'global' },
            { scope: 'personal', ownerId: new mongoose.Types.ObjectId(userId) },
            { scope: 'team', teamId: { $in: userTeams.map(id => new mongoose.Types.ObjectId(id)) } }
        ]
    };

    if (category) {
        query.category = new RegExp(`^${category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    }

    if (search) {
        query.$text = { $search: search };
    }

    return await this.find(query)
        .populate('ownerId', 'firstName lastName email')
        .populate('teamId', 'name')
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName')
        .sort(sort)
        .limit(limit)
        .lean();
};

/**
 * Get popular macros (most used)
 * @param {ObjectId} firmId - Firm ID
 * @param {Number} limit - Number of results
 * @returns {Promise<Array>} Array of popular macros
 */
macroSchema.statics.getPopular = async function(firmId, limit = 10) {
    return await this.find({
        firmId: new mongoose.Types.ObjectId(firmId),
        isActive: true,
        usageCount: { $gt: 0 }
    })
    .populate('ownerId', 'firstName lastName')
    .populate('createdBy', 'firstName lastName')
    .sort({ usageCount: -1 })
    .limit(limit)
    .lean();
};

/**
 * Get recently used macros
 * @param {ObjectId} firmId - Firm ID
 * @param {ObjectId} userId - User ID (optional, for personal filtering)
 * @param {Number} limit - Number of results
 * @returns {Promise<Array>} Array of recently used macros
 */
macroSchema.statics.getRecentlyUsed = async function(firmId, userId = null, limit = 10) {
    const query = {
        firmId: new mongoose.Types.ObjectId(firmId),
        isActive: true,
        lastUsedAt: { $exists: true }
    };

    if (userId) {
        query.$or = [
            { scope: 'global' },
            { scope: 'personal', ownerId: new mongoose.Types.ObjectId(userId) }
        ];
    }

    return await this.find(query)
        .populate('ownerId', 'firstName lastName')
        .populate('createdBy', 'firstName lastName')
        .sort({ lastUsedAt: -1 })
        .limit(limit)
        .lean();
};

/**
 * Find macro by shortcut
 * @param {ObjectId} firmId - Firm ID
 * @param {String} shortcut - Shortcut string
 * @param {ObjectId} userId - User ID for access control
 * @param {Array<ObjectId>} userTeams - User's team IDs
 * @returns {Promise<Macro|null>} Matching macro or null
 */
macroSchema.statics.findByShortcut = async function(firmId, shortcut, userId, userTeams = []) {
    const macro = await this.findOne({
        firmId: new mongoose.Types.ObjectId(firmId),
        shortcuts: shortcut,
        isActive: true,
        $or: [
            { scope: 'global' },
            { scope: 'personal', ownerId: new mongoose.Types.ObjectId(userId) },
            { scope: 'team', teamId: { $in: userTeams.map(id => new mongoose.Types.ObjectId(id)) } }
        ]
    })
    .populate('ownerId', 'firstName lastName')
    .populate('teamId', 'name')
    .populate('createdBy', 'firstName lastName');

    return macro;
};

/**
 * Suggest macros based on keywords
 * @param {ObjectId} firmId - Firm ID
 * @param {String} keywords - Keywords to match
 * @param {ObjectId} userId - User ID for access control
 * @param {Array<ObjectId>} userTeams - User's team IDs
 * @param {Number} limit - Number of results
 * @returns {Promise<Array>} Array of suggested macros
 */
macroSchema.statics.suggestMacros = async function(firmId, keywords, userId, userTeams = [], limit = 5) {
    const keywordArray = keywords.toLowerCase().split(/\s+/);

    return await this.find({
        firmId: new mongoose.Types.ObjectId(firmId),
        isActive: true,
        suggestFor: { $in: keywordArray },
        $or: [
            { scope: 'global' },
            { scope: 'personal', ownerId: new mongoose.Types.ObjectId(userId) },
            { scope: 'team', teamId: { $in: userTeams.map(id => new mongoose.Types.ObjectId(id)) } }
        ]
    })
    .populate('ownerId', 'firstName lastName')
    .populate('createdBy', 'firstName lastName')
    .sort({ usageCount: -1 })
    .limit(limit)
    .lean();
};

/**
 * Get macros by category
 * @param {ObjectId} firmId - Firm ID
 * @param {String} category - Category path
 * @param {Boolean} includeChildren - Include subcategories
 * @returns {Promise<Array>} Array of macros
 */
macroSchema.statics.getByCategory = async function(firmId, category, includeChildren = false) {
    const query = {
        firmId: new mongoose.Types.ObjectId(firmId),
        isActive: true
    };

    if (includeChildren) {
        // Match category and all subcategories
        query.category = new RegExp(`^${category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    } else {
        // Exact match
        query.category = category;
    }

    return await this.find(query)
        .populate('ownerId', 'firstName lastName')
        .populate('createdBy', 'firstName lastName')
        .sort({ name: 1 })
        .lean();
};

/**
 * Get category tree for firm
 * @param {ObjectId} firmId - Firm ID
 * @returns {Promise<Array>} Hierarchical category structure
 */
macroSchema.statics.getCategoryTree = async function(firmId) {
    const macros = await this.find({
        firmId: new mongoose.Types.ObjectId(firmId),
        isActive: true,
        category: { $exists: true, $ne: null }
    })
    .select('category')
    .lean();

    // Build category tree
    const categories = new Set();
    macros.forEach(macro => {
        if (macro.category) {
            const parts = macro.category.split('::');
            let path = '';
            parts.forEach(part => {
                path = path ? `${path}::${part}` : part;
                categories.add(path);
            });
        }
    });

    return Array.from(categories).sort();
};

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * Pre-save validation and cleanup
 */
macroSchema.pre('save', function(next) {
    // Trim category and ensure proper formatting
    if (this.category) {
        this.category = this.category
            .split('::')
            .map(c => c.trim())
            .filter(c => c.length > 0)
            .join('::');
    }

    // Ensure shortcuts are unique and trimmed
    if (this.shortcuts && this.shortcuts.length > 0) {
        this.shortcuts = [...new Set(this.shortcuts.map(s => s.trim()))];
    }

    // Ensure suggestFor keywords are lowercase and unique
    if (this.suggestFor && this.suggestFor.length > 0) {
        this.suggestFor = [...new Set(this.suggestFor.map(s => s.toLowerCase().trim()))];
    }

    // Sort actions by order
    if (this.actions && this.actions.length > 0) {
        this.actions.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    next();
});

module.exports = mongoose.model('Macro', macroSchema);
