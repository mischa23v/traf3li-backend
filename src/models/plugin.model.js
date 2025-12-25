const mongoose = require('mongoose');

/**
 * Plugin Model - Extension System
 *
 * Defines the structure and metadata for plugins/extensions.
 * Plugins can add custom functionality, routes, hooks, and more.
 */

const pluginSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // BASIC INFO
    // ═══════════════════════════════════════════════════════════════
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true,
        // Plugin identifier (e.g., 'slack-notifications', 'custom-reports')
    },
    displayName: {
        type: String,
        trim: true,
        // Human-readable name (e.g., 'Slack Notifications')
    },
    description: {
        type: String,
        trim: true,
        // Description of what the plugin does
    },
    version: {
        type: String,
        default: '1.0.0',
        // Semantic version of the plugin
    },
    author: {
        type: String,
        // Plugin author/creator name
    },

    // ═══════════════════════════════════════════════════════════════
    // CATEGORIZATION
    // ═══════════════════════════════════════════════════════════════
    category: {
        type: String,
        enum: ['integration', 'automation', 'reporting', 'ui', 'workflow', 'utility'],
        default: 'utility',
        index: true,
        // Plugin category for organization
    },

    // ═══════════════════════════════════════════════════════════════
    // PLUGIN CODE
    // ═══════════════════════════════════════════════════════════════
    entryPoint: {
        type: String,
        required: true,
        // Path to the main plugin file (relative to plugins directory)
        // e.g., 'slack-notifications/index.js'
    },

    // ═══════════════════════════════════════════════════════════════
    // PERMISSIONS
    // ═══════════════════════════════════════════════════════════════
    permissions: {
        type: [String],
        default: [],
        // Array of required permissions the plugin needs
        // e.g., ['cases:read', 'clients:write', 'webhooks:send']
    },

    // ═══════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    settings: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
        // Plugin configuration schema (defines what settings are available)
        // Example:
        // {
        //   apiKey: { type: 'string', required: true, label: 'API Key' },
        //   webhookUrl: { type: 'string', required: false, label: 'Webhook URL' }
        // }
    },

    // ═══════════════════════════════════════════════════════════════
    // HOOKS
    // ═══════════════════════════════════════════════════════════════
    hooks: [{
        event: {
            type: String,
            required: true,
            // Event name to listen to
            // e.g., 'case:created', 'invoice:paid', 'client:updated'
        },
        handler: {
            type: String,
            required: true,
            // Function name in the plugin to call
            // e.g., 'onCaseCreated', 'sendSlackNotification'
        }
    }],

    // ═══════════════════════════════════════════════════════════════
    // ROUTES
    // ═══════════════════════════════════════════════════════════════
    routes: [{
        method: {
            type: String,
            enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
            required: true,
            // HTTP method
        },
        path: {
            type: String,
            required: true,
            // Route path (will be prefixed with /api/plugins/:pluginName/)
            // e.g., '/webhook' becomes /api/plugins/slack-notifications/webhook
        },
        handler: {
            type: String,
            required: true,
            // Function name in the plugin to call
        },
        auth: {
            type: Boolean,
            default: true,
            // Whether route requires authentication
        },
        permissions: {
            type: [String],
            default: [],
            // Required permissions for this route
        }
    }],

    // ═══════════════════════════════════════════════════════════════
    // SYSTEM FLAGS
    // ═══════════════════════════════════════════════════════════════
    isSystem: {
        type: Boolean,
        default: false,
        // True for built-in plugins, false for third-party
    },
    isActive: {
        type: Boolean,
        default: true,
        // Whether the plugin is active and can be installed
    },

    // ═══════════════════════════════════════════════════════════════
    // DEPENDENCIES
    // ═══════════════════════════════════════════════════════════════
    dependencies: {
        type: [String],
        default: [],
        // Array of other plugin names this plugin depends on
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    icon: {
        type: String,
        // Icon URL or icon identifier
    },
    screenshots: {
        type: [String],
        default: [],
        // Array of screenshot URLs
    },
    documentation: {
        type: String,
        // URL or markdown content for plugin documentation
    },
    supportUrl: {
        type: String,
        // Support/help URL
    },
    repositoryUrl: {
        type: String,
        // Source code repository URL
    },

    // ═══════════════════════════════════════════════════════════════
    // STATISTICS
    // ═══════════════════════════════════════════════════════════════
    installCount: {
        type: Number,
        default: 0,
        // Number of times this plugin has been installed
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
        // Average rating
    },
    ratingCount: {
        type: Number,
        default: 0,
        // Number of ratings
    }
}, {
    versionKey: false,
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
pluginSchema.index({ category: 1, isActive: 1 });
pluginSchema.index({ isSystem: 1, isActive: 1 });
pluginSchema.index({ name: 'text', displayName: 'text', description: 'text' });

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Validate plugin configuration
 */
pluginSchema.methods.validateConfig = function(config) {
    const errors = [];

    if (!this.settings || typeof this.settings !== 'object') {
        return { valid: true, errors: [] };
    }

    // Check each setting in the schema
    for (const [key, schema] of Object.entries(this.settings)) {
        const value = config[key];

        // Check required fields
        if (schema.required && (value === undefined || value === null || value === '')) {
            errors.push(`${schema.label || key} is required`);
            continue;
        }

        // Validate type if value is provided
        if (value !== undefined && value !== null && schema.type) {
            const valueType = typeof value;
            if (schema.type === 'number' && valueType !== 'number') {
                errors.push(`${schema.label || key} must be a number`);
            } else if (schema.type === 'string' && valueType !== 'string') {
                errors.push(`${schema.label || key} must be a string`);
            } else if (schema.type === 'boolean' && valueType !== 'boolean') {
                errors.push(`${schema.label || key} must be a boolean`);
            }
        }

        // Validate min/max for numbers
        if (schema.type === 'number' && typeof value === 'number') {
            if (schema.min !== undefined && value < schema.min) {
                errors.push(`${schema.label || key} must be at least ${schema.min}`);
            }
            if (schema.max !== undefined && value > schema.max) {
                errors.push(`${schema.label || key} must be at most ${schema.max}`);
            }
        }

        // Validate enum values
        if (schema.enum && Array.isArray(schema.enum)) {
            if (!schema.enum.includes(value)) {
                errors.push(`${schema.label || key} must be one of: ${schema.enum.join(', ')}`);
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

/**
 * Get plugin manifest (safe public data)
 */
pluginSchema.methods.getManifest = function() {
    return {
        name: this.name,
        displayName: this.displayName,
        description: this.description,
        version: this.version,
        author: this.author,
        category: this.category,
        icon: this.icon,
        screenshots: this.screenshots,
        documentation: this.documentation,
        supportUrl: this.supportUrl,
        isSystem: this.isSystem,
        permissions: this.permissions,
        settings: this.settings,
        rating: this.rating,
        ratingCount: this.ratingCount,
        installCount: this.installCount
    };
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Find available plugins (active only)
 */
pluginSchema.statics.findAvailable = function(category = null) {
    const query = { isActive: true };
    if (category) {
        query.category = category;
    }
    return this.find(query).sort({ installCount: -1, rating: -1 });
};

/**
 * Find system plugins
 */
pluginSchema.statics.findSystem = function() {
    return this.find({ isSystem: true, isActive: true });
};

/**
 * Search plugins
 */
pluginSchema.statics.searchPlugins = function(searchTerm) {
    return this.find({
        $text: { $search: searchTerm },
        isActive: true
    }).sort({ score: { $meta: 'textScore' } });
};

module.exports = mongoose.model('Plugin', pluginSchema);
