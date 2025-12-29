const mongoose = require('mongoose');

/**
 * Keyboard Shortcut Model
 *
 * Manages user-specific and firm-wide keyboard shortcuts.
 * Supports custom shortcuts, defaults, and conflict detection.
 */

// Shortcut configuration schema
const shortcutConfigSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        trim: true
    },
    modifiers: {
        type: [String],
        enum: ['ctrl', 'alt', 'shift', 'meta'],
        default: []
    },
    action: {
        type: String,
        required: true,
        trim: true
    },
    isEnabled: {
        type: Boolean,
        default: true
    },
    isCustom: {
        type: Boolean,
        default: false
    }
}, { _id: false });

const keyboardShortcutSchema = new mongoose.Schema({
    // User and firm references
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        default: null,
        index: true
     },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // Shortcuts map: shortcutId -> configuration
    shortcuts: {
        type: Map,
        of: shortcutConfigSchema,
        default: new Map()
    }
}, {
    versionKey: false,
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
keyboardShortcutSchema.index({ userId: 1, firmId: 1 }, { unique: true, sparse: true });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get default keyboard shortcuts
 * These are the system defaults that can be overridden by users
 */
keyboardShortcutSchema.statics.getDefaults = function() {
    return new Map([
        ['cmd_k', {
            key: 'k',
            modifiers: ['meta'],
            action: 'open_command_palette',
            isEnabled: true,
            isCustom: false
        }],
        ['cmd_n', {
            key: 'n',
            modifiers: ['meta'],
            action: 'new_invoice',
            isEnabled: true,
            isCustom: false
        }],
        ['cmd_shift_n', {
            key: 'n',
            modifiers: ['meta', 'shift'],
            action: 'new_client',
            isEnabled: true,
            isCustom: false
        }],
        ['cmd_slash', {
            key: '/',
            modifiers: ['meta'],
            action: 'show_shortcuts_help',
            isEnabled: true,
            isCustom: false
        }],
        ['escape', {
            key: 'Escape',
            modifiers: [],
            action: 'close_modal_palette',
            isEnabled: true,
            isCustom: false
        }],
        ['g_i', {
            key: 'i',
            modifiers: [],
            action: 'go_to_invoices',
            isEnabled: true,
            isCustom: false,
            sequence: 'g'
        }],
        ['g_c', {
            key: 'c',
            modifiers: [],
            action: 'go_to_clients',
            isEnabled: true,
            isCustom: false,
            sequence: 'g'
        }],
        ['g_d', {
            key: 'd',
            modifiers: [],
            action: 'go_to_dashboard',
            isEnabled: true,
            isCustom: false,
            sequence: 'g'
        }]
    ]);
};

/**
 * Get or create shortcuts for user
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} firmId - Firm ID
 * @returns {Promise<Object>} Shortcuts document
 */
keyboardShortcutSchema.statics.getOrCreate = async function(userId, firmId = null) {
    try {
        let shortcuts = await this.findOne({ userId, firmId });

        if (!shortcuts) {
            // Create new shortcuts document with defaults
            shortcuts = await this.create({
                userId,
                firmId,
                shortcuts: this.getDefaults()
            });
        }

        return shortcuts;
    } catch (error) {
        throw new Error(`Failed to get or create shortcuts: ${error.message}`);
    }
};

/**
 * Get global default shortcuts (for new users)
 * @returns {Promise<Object>} Global shortcuts document
 */
keyboardShortcutSchema.statics.getGlobalDefaults = async function() {
    try {
        let shortcuts = await this.findOne({ userId: null, firmId: null });

        if (!shortcuts) {
            // Create global defaults
            shortcuts = await this.create({
                userId: null,
                firmId: null,
                shortcuts: this.getDefaults()
            });
        }

        return shortcuts;
    } catch (error) {
        throw new Error(`Failed to get global defaults: ${error.message}`);
    }
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get shortcut by ID
 * @param {String} shortcutId - Shortcut ID
 * @returns {Object|null} Shortcut configuration or null
 */
keyboardShortcutSchema.methods.getShortcut = function(shortcutId) {
    return this.shortcuts.get(shortcutId) || null;
};

/**
 * Update a shortcut
 * @param {String} shortcutId - Shortcut ID
 * @param {Object} shortcutData - Shortcut configuration
 * @returns {Promise<Object>} Updated document
 */
keyboardShortcutSchema.methods.updateShortcut = async function(shortcutId, shortcutData) {
    const existing = this.shortcuts.get(shortcutId);

    if (!existing) {
        throw new Error('Shortcut not found');
    }

    // Merge with existing data
    const updated = {
        ...existing,
        ...shortcutData
    };

    this.shortcuts.set(shortcutId, updated);
    this.markModified('shortcuts');

    await this.save();
    return this;
};

/**
 * Reset shortcut to default
 * @param {String} shortcutId - Shortcut ID
 * @returns {Promise<Object>} Updated document
 */
keyboardShortcutSchema.methods.resetShortcut = async function(shortcutId) {
    const defaults = this.constructor.getDefaults();
    const defaultShortcut = defaults.get(shortcutId);

    if (!defaultShortcut) {
        throw new Error('No default exists for this shortcut');
    }

    this.shortcuts.set(shortcutId, defaultShortcut);
    this.markModified('shortcuts');

    await this.save();
    return this;
};

/**
 * Reset all shortcuts to defaults
 * @returns {Promise<Object>} Updated document
 */
keyboardShortcutSchema.methods.resetAllShortcuts = async function() {
    // Keep custom shortcuts, reset only non-custom ones
    const customShortcuts = new Map();

    for (const [id, config] of this.shortcuts.entries()) {
        if (config.isCustom) {
            customShortcuts.set(id, config);
        }
    }

    // Start with defaults
    this.shortcuts = this.constructor.getDefaults();

    // Re-add custom shortcuts
    for (const [id, config] of customShortcuts.entries()) {
        this.shortcuts.set(id, config);
    }

    this.markModified('shortcuts');

    await this.save();
    return this;
};

/**
 * Create custom shortcut
 * @param {String} shortcutId - Shortcut ID
 * @param {Object} shortcutData - Shortcut configuration
 * @returns {Promise<Object>} Updated document
 */
keyboardShortcutSchema.methods.createShortcut = async function(shortcutId, shortcutData) {
    if (this.shortcuts.has(shortcutId)) {
        throw new Error('Shortcut ID already exists');
    }

    const newShortcut = {
        key: shortcutData.key,
        modifiers: shortcutData.modifiers || [],
        action: shortcutData.action,
        isEnabled: shortcutData.isEnabled !== undefined ? shortcutData.isEnabled : true,
        isCustom: true
    };

    this.shortcuts.set(shortcutId, newShortcut);
    this.markModified('shortcuts');

    await this.save();
    return this;
};

/**
 * Delete custom shortcut
 * @param {String} shortcutId - Shortcut ID
 * @returns {Promise<Object>} Updated document
 */
keyboardShortcutSchema.methods.deleteShortcut = async function(shortcutId) {
    const shortcut = this.shortcuts.get(shortcutId);

    if (!shortcut) {
        throw new Error('Shortcut not found');
    }

    if (!shortcut.isCustom) {
        throw new Error('Cannot delete default shortcuts. Use reset instead.');
    }

    this.shortcuts.delete(shortcutId);
    this.markModified('shortcuts');

    await this.save();
    return this;
};

/**
 * Check if shortcut combination conflicts with existing shortcuts
 * @param {String} key - Key
 * @param {Array} modifiers - Modifiers array
 * @param {String} excludeId - Shortcut ID to exclude from check (for updates)
 * @returns {Object|null} Conflicting shortcut or null
 */
keyboardShortcutSchema.methods.checkConflict = function(key, modifiers = [], excludeId = null) {
    const normalizedModifiers = [...modifiers].sort();

    for (const [id, config] of this.shortcuts.entries()) {
        if (id === excludeId) continue;
        if (!config.isEnabled) continue;

        const configModifiers = [...(config.modifiers || [])].sort();

        // Check if key and modifiers match
        if (config.key.toLowerCase() === key.toLowerCase() &&
            JSON.stringify(configModifiers) === JSON.stringify(normalizedModifiers)) {
            return {
                shortcutId: id,
                ...config
            };
        }
    }

    return null;
};

/**
 * Get all shortcuts as plain object
 * @returns {Object} Shortcuts object
 */
keyboardShortcutSchema.methods.getAllShortcuts = function() {
    const shortcuts = {};

    for (const [id, config] of this.shortcuts.entries()) {
        shortcuts[id] = config;
    }

    return shortcuts;
};

module.exports = mongoose.model('KeyboardShortcut', keyboardShortcutSchema);
