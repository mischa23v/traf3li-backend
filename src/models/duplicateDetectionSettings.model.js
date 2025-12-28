/**
 * Duplicate Detection Settings Model
 *
 * Configurable duplicate detection rules per firm.
 * Supports multiple matching strategies: exact, fuzzy, phonetic.
 *
 * Multi-tenant: firmId for firms, lawyerId for solo lawyers
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const duplicateRuleSchema = new Schema({
    field: {
        type: String,
        enum: ['email', 'phone', 'mobile', 'name', 'firstName', 'lastName',
               'organization', 'website', 'nationalId', 'crNumber', 'vatNumber'],
        required: true
    },
    matchType: {
        type: String,
        enum: ['exact', 'fuzzy', 'phonetic', 'normalized'],
        required: true
    },
    weight: {
        type: Number,
        min: 0,
        max: 100,
        required: true
    },
    isEnabled: {
        type: Boolean,
        default: true
    },
    threshold: {
        type: Number,
        min: 0,
        max: 100,
        default: 80
    }
}, { _id: false });

const duplicateDetectionSettingsSchema = new Schema({
    // Multi-tenant isolation (REQUIRED)
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

    // Master toggle
    isEnabled: {
        type: Boolean,
        default: true
    },

    // Auto-detection on create/update
    autoDetect: {
        type: Boolean,
        default: true
    },

    // Minimum score to flag as duplicate
    minMatchScore: {
        type: Number,
        default: 60,
        min: 0,
        max: 100
    },

    // High confidence threshold (for auto-actions)
    highConfidenceThreshold: {
        type: Number,
        default: 90,
        min: 0,
        max: 100
    },

    // Detection rules
    rules: {
        type: [duplicateRuleSchema],
        default: [
            { field: 'email', matchType: 'exact', weight: 40, isEnabled: true },
            { field: 'phone', matchType: 'normalized', weight: 30, isEnabled: true },
            { field: 'name', matchType: 'fuzzy', weight: 20, isEnabled: true, threshold: 85 },
            { field: 'nationalId', matchType: 'exact', weight: 50, isEnabled: true },
            { field: 'crNumber', matchType: 'exact', weight: 50, isEnabled: true }
        ]
    },

    // Entity types to check
    entityTypes: {
        leads: { type: Boolean, default: true },
        contacts: { type: Boolean, default: true },
        organizations: { type: Boolean, default: false },
        clients: { type: Boolean, default: true }
    },

    // Actions configuration
    actions: {
        warnOnCreate: {
            type: Boolean,
            default: true
        },
        warnOnUpdate: {
            type: Boolean,
            default: false
        },
        blockDuplicates: {
            type: Boolean,
            default: false
        },
        blockThreshold: {
            type: Number,
            default: 95,
            min: 0,
            max: 100
        },
        suggestMerge: {
            type: Boolean,
            default: true
        },
        autoMerge: {
            type: Boolean,
            default: false
        },
        autoMergeThreshold: {
            type: Number,
            default: 98,
            min: 0,
            max: 100
        },
        notifyAdmin: {
            type: Boolean,
            default: false
        },
        notifyOwner: {
            type: Boolean,
            default: true
        }
    },

    // Merge preferences
    mergePreferences: {
        keepMostRecent: {
            type: Boolean,
            default: true
        },
        keepMostComplete: {
            type: Boolean,
            default: false
        },
        mergeActivities: {
            type: Boolean,
            default: true
        },
        mergeNotes: {
            type: Boolean,
            default: true
        },
        mergeDocuments: {
            type: Boolean,
            default: true
        },
        mergeCustomFields: {
            type: Boolean,
            default: true
        }
    },

    // Scheduled scan settings
    scheduledScan: {
        enabled: {
            type: Boolean,
            default: false
        },
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly'],
            default: 'weekly'
        },
        dayOfWeek: {
            type: Number,
            min: 0,
            max: 6,
            default: 0 // Sunday
        },
        dayOfMonth: {
            type: Number,
            min: 1,
            max: 28,
            default: 1
        },
        lastScanAt: Date,
        nextScanAt: Date
    },

    // Statistics
    stats: {
        totalScans: { type: Number, default: 0 },
        totalDuplicatesFound: { type: Number, default: 0 },
        totalMerged: { type: Number, default: 0 },
        totalDismissed: { type: Number, default: 0 },
        lastScanDuplicatesCount: { type: Number, default: 0 }
    },

    // Exclusions
    exclusions: {
        emailDomains: [String], // e.g., ['gmail.com', 'yahoo.com'] - skip generic domains
        phonePatterns: [String], // Regex patterns to skip
        excludedRecordIds: [{ type: Schema.Types.ObjectId }]
    },

    // Metadata
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Ensure unique per firm/lawyer
duplicateDetectionSettingsSchema.index({ firmId: 1 }, { unique: true, sparse: true });
duplicateDetectionSettingsSchema.index({ lawyerId: 1 }, { unique: true, sparse: true });

// Static: Get or create settings for firm
duplicateDetectionSettingsSchema.statics.getOrCreate = async function(firmId, lawyerId = null) {
    const query = lawyerId ? { lawyerId } : { firmId };

    let settings = await this.findOne(query);

    if (!settings) {
        settings = await this.create({
            ...query,
            isEnabled: true,
            autoDetect: true
        });
    }

    return settings;
};

// Static: Get active rules for entity type
duplicateDetectionSettingsSchema.statics.getActiveRules = async function(firmId, entityType, lawyerId = null) {
    const query = lawyerId ? { lawyerId } : { firmId };
    const settings = await this.findOne(query);

    if (!settings || !settings.isEnabled) {
        return { enabled: false, rules: [] };
    }

    if (!settings.entityTypes[entityType]) {
        return { enabled: false, rules: [] };
    }

    return {
        enabled: true,
        rules: settings.rules.filter(r => r.isEnabled),
        minMatchScore: settings.minMatchScore,
        actions: settings.actions
    };
};

// Instance: Update statistics after scan
duplicateDetectionSettingsSchema.methods.recordScan = async function(duplicatesFound) {
    this.stats.totalScans += 1;
    this.stats.totalDuplicatesFound += duplicatesFound;
    this.stats.lastScanDuplicatesCount = duplicatesFound;
    this.scheduledScan.lastScanAt = new Date();

    // Calculate next scan date
    if (this.scheduledScan.enabled) {
        const now = new Date();
        let nextScan = new Date(now);

        switch (this.scheduledScan.frequency) {
            case 'daily':
                nextScan.setDate(nextScan.getDate() + 1);
                break;
            case 'weekly':
                nextScan.setDate(nextScan.getDate() + (7 - nextScan.getDay() + this.scheduledScan.dayOfWeek) % 7 || 7);
                break;
            case 'monthly':
                nextScan.setMonth(nextScan.getMonth() + 1);
                nextScan.setDate(this.scheduledScan.dayOfMonth);
                break;
        }

        this.scheduledScan.nextScanAt = nextScan;
    }

    return this.save();
};

// Instance: Record merge
duplicateDetectionSettingsSchema.methods.recordMerge = async function() {
    this.stats.totalMerged += 1;
    return this.save();
};

// Instance: Record dismissal
duplicateDetectionSettingsSchema.methods.recordDismissal = async function() {
    this.stats.totalDismissed += 1;
    return this.save();
};

const DuplicateDetectionSettings = mongoose.model('DuplicateDetectionSettings', duplicateDetectionSettingsSchema);

module.exports = DuplicateDetectionSettings;
