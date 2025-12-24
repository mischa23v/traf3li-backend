const mongoose = require('mongoose');

// Recent search subdocument schema
const recentSearchSchema = new mongoose.Schema({
    query: {
        type: String,
        required: true,
        trim: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    },
    resultCount: {
        type: Number,
        min: 0,
        default: 0
    }
}, { _id: false });

// Recent record subdocument schema
const recentRecordSchema = new mongoose.Schema({
    entityType: {
        type: String,
        required: true,
        enum: ['case', 'client', 'lead', 'invoice', 'task', 'contact', 'document', 'appointment', 'event']
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    entityName: {
        type: String,
        required: true,
        trim: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    }
}, { _id: false });

// Recent command subdocument schema
const recentCommandSchema = new mongoose.Schema({
    command: {
        type: String,
        required: true,
        trim: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    }
}, { _id: false });

// Saved search subdocument schema
const savedSearchSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    query: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    entityType: {
        type: String,
        required: false,
        enum: ['case', 'client', 'lead', 'invoice', 'task', 'contact', 'document', 'appointment', 'event', null]
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    }
}, { _id: true });

// Main UserActivity schema
const userActivitySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: false,
        index: true
    },
    recentSearches: {
        type: [recentSearchSchema],
        default: [],
        validate: {
            validator: function(searches) {
                return searches.length <= 20;
            },
            message: 'Recent searches cannot exceed 20 items'
        }
    },
    recentRecords: {
        type: [recentRecordSchema],
        default: [],
        validate: {
            validator: function(records) {
                return records.length <= 50;
            },
            message: 'Recent records cannot exceed 50 items'
        }
    },
    recentCommands: {
        type: [recentCommandSchema],
        default: [],
        validate: {
            validator: function(commands) {
                return commands.length <= 20;
            },
            message: 'Recent commands cannot exceed 20 items'
        }
    },
    savedSearches: {
        type: [savedSearchSchema],
        default: []
    },
    shortcuts: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    preferences: {
        commandPaletteSettings: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    }
}, {
    timestamps: true,
    versionKey: false
});

// Indexes
userActivitySchema.index({ userId: 1, firmId: 1 });
userActivitySchema.index({ firmId: 1 });

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Track a search query
 * @param {String} query - The search query
 * @param {Number} resultCount - Number of results returned
 */
userActivitySchema.methods.trackSearch = async function(query, resultCount = 0) {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        throw new Error('Search query is required and must be a non-empty string');
    }

    const searchEntry = {
        query: query.trim(),
        timestamp: new Date(),
        resultCount: resultCount || 0
    };

    // Add to beginning of array
    this.recentSearches.unshift(searchEntry);

    // Keep only last 20
    if (this.recentSearches.length > 20) {
        this.recentSearches = this.recentSearches.slice(0, 20);
    }

    await this.save();
    return searchEntry;
};

/**
 * Track a record view
 * @param {String} entityType - Type of entity (case, client, etc.)
 * @param {ObjectId} entityId - ID of the entity
 * @param {String} entityName - Display name of the entity
 */
userActivitySchema.methods.trackRecordView = async function(entityType, entityId, entityName) {
    const validTypes = ['case', 'client', 'lead', 'invoice', 'task', 'contact', 'document', 'appointment', 'event'];

    if (!validTypes.includes(entityType)) {
        throw new Error(`Invalid entity type. Must be one of: ${validTypes.join(', ')}`);
    }

    if (!entityId) {
        throw new Error('Entity ID is required');
    }

    if (!entityName || typeof entityName !== 'string' || entityName.trim().length === 0) {
        throw new Error('Entity name is required and must be a non-empty string');
    }

    // Remove duplicate if already exists (same entityType and entityId)
    this.recentRecords = this.recentRecords.filter(
        record => !(record.entityType === entityType && record.entityId.toString() === entityId.toString())
    );

    const recordEntry = {
        entityType,
        entityId,
        entityName: entityName.trim(),
        timestamp: new Date()
    };

    // Add to beginning of array
    this.recentRecords.unshift(recordEntry);

    // Keep only last 50
    if (this.recentRecords.length > 50) {
        this.recentRecords = this.recentRecords.slice(0, 50);
    }

    await this.save();
    return recordEntry;
};

/**
 * Track a command execution
 * @param {String} command - The command that was executed
 */
userActivitySchema.methods.trackCommand = async function(command) {
    if (!command || typeof command !== 'string' || command.trim().length === 0) {
        throw new Error('Command is required and must be a non-empty string');
    }

    const commandEntry = {
        command: command.trim(),
        timestamp: new Date()
    };

    // Add to beginning of array
    this.recentCommands.unshift(commandEntry);

    // Keep only last 20
    if (this.recentCommands.length > 20) {
        this.recentCommands = this.recentCommands.slice(0, 20);
    }

    await this.save();
    return commandEntry;
};

/**
 * Add a saved search
 * @param {String} name - Name for the saved search
 * @param {Object} query - The query object
 * @param {String} entityType - Type of entity (optional)
 */
userActivitySchema.methods.addSavedSearch = async function(name, query, entityType = null) {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new Error('Search name is required and must be a non-empty string');
    }

    if (!query || typeof query !== 'object') {
        throw new Error('Query is required and must be an object');
    }

    // Check if a saved search with this name already exists
    const existingIndex = this.savedSearches.findIndex(
        search => search.name.toLowerCase() === name.trim().toLowerCase()
    );

    if (existingIndex !== -1) {
        throw new Error('A saved search with this name already exists');
    }

    const validTypes = ['case', 'client', 'lead', 'invoice', 'task', 'contact', 'document', 'appointment', 'event'];
    if (entityType && !validTypes.includes(entityType)) {
        throw new Error(`Invalid entity type. Must be one of: ${validTypes.join(', ')}`);
    }

    const savedSearch = {
        name: name.trim(),
        query,
        entityType: entityType || null,
        createdAt: new Date()
    };

    this.savedSearches.push(savedSearch);
    await this.save();

    return savedSearch;
};

/**
 * Remove a saved search by name
 * @param {String} name - Name of the saved search to remove
 */
userActivitySchema.methods.removeSavedSearch = async function(name) {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new Error('Search name is required and must be a non-empty string');
    }

    const initialLength = this.savedSearches.length;

    this.savedSearches = this.savedSearches.filter(
        search => search.name.toLowerCase() !== name.trim().toLowerCase()
    );

    if (this.savedSearches.length === initialLength) {
        throw new Error('Saved search not found');
    }

    await this.save();
    return { message: 'Saved search removed successfully' };
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get or create user activity document
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} firmId - Firm ID (optional)
 */
userActivitySchema.statics.getOrCreate = async function(userId, firmId = null) {
    let activity = await this.findOne({ userId });

    if (!activity) {
        activity = new this({
            userId,
            firmId: firmId || null,
            recentSearches: [],
            recentRecords: [],
            recentCommands: [],
            savedSearches: [],
            shortcuts: {},
            preferences: {
                commandPaletteSettings: {}
            }
        });
        await activity.save();
    }

    return activity;
};

/**
 * Clear all recent activity for a user
 * @param {ObjectId} userId - User ID
 */
userActivitySchema.statics.clearRecentActivity = async function(userId) {
    const activity = await this.findOne({ userId });

    if (!activity) {
        throw new Error('User activity not found');
    }

    activity.recentSearches = [];
    activity.recentRecords = [];
    activity.recentCommands = [];

    await activity.save();
    return activity;
};

/**
 * Get recent activity summary
 * @param {ObjectId} userId - User ID
 */
userActivitySchema.statics.getActivitySummary = async function(userId) {
    const activity = await this.findOne({ userId }).lean();

    if (!activity) {
        return {
            recentSearchesCount: 0,
            recentRecordsCount: 0,
            recentCommandsCount: 0,
            savedSearchesCount: 0,
            lastActivity: null
        };
    }

    const timestamps = [
        ...activity.recentSearches.map(s => s.timestamp),
        ...activity.recentRecords.map(r => r.timestamp),
        ...activity.recentCommands.map(c => c.timestamp)
    ].filter(t => t);

    return {
        recentSearchesCount: activity.recentSearches.length,
        recentRecordsCount: activity.recentRecords.length,
        recentCommandsCount: activity.recentCommands.length,
        savedSearchesCount: activity.savedSearches.length,
        lastActivity: timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : null
    };
};

// ═══════════════════════════════════════════════════════════════
// FIRM ISOLATION PLUGIN (RLS-like enforcement)
// ═══════════════════════════════════════════════════════════════
const firmIsolationPlugin = require('./plugins/firmIsolation.plugin');

/**
 * Apply Row-Level Security (RLS) plugin to enforce firm-level data isolation.
 * This ensures all queries automatically filter by firmId from the request context.
 */
userActivitySchema.plugin(firmIsolationPlugin);

module.exports = mongoose.model('UserActivity', userActivitySchema);
