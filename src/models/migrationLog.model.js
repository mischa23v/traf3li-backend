const mongoose = require('mongoose');

const migrationLogSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    version: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['applied', 'failed', 'reverted', 'pending'],
        default: 'pending',
        required: true,
        index: true
    },
    appliedAt: {
        type: Date,
        default: null
    },
    revertedAt: {
        type: Date,
        default: null
    },
    duration: {
        type: Number, // milliseconds
        default: null
    },
    error: {
        type: String,
        default: null
    },
    checksum: {
        type: String, // hash of migration file for integrity
        required: true,
        index: true
    },
    appliedBy: {
        type: String, // user or system that ran migration
        default: 'system'
    },
    revertedBy: {
        type: String,
        default: null
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true,
    versionKey: false
});

// Indexes for querying
migrationLogSchema.index({ status: 1, appliedAt: -1 });
migrationLogSchema.index({ version: 1 });

// Static method to get all migrations with status
migrationLogSchema.statics.getMigrationStatus = async function() {
    return await this.find({}).sort({ version: 1, name: 1 });
};

// Static method to check if migration was applied
migrationLogSchema.statics.isApplied = async function(name) {
    const migration = await this.findOne({ name, status: 'applied' });
    return !!migration;
};

// Static method to mark migration as applied
migrationLogSchema.statics.markApplied = async function(name, version, checksum, duration, appliedBy = 'system', metadata = {}) {
    return await this.findOneAndUpdate(
        { name },
        {
            version,
            status: 'applied',
            appliedAt: new Date(),
            duration,
            checksum,
            appliedBy,
            metadata,
            error: null
        },
        { upsert: true, new: true }
    );
};

// Static method to mark migration as failed
migrationLogSchema.statics.markFailed = async function(name, version, checksum, error, duration, appliedBy = 'system') {
    return await this.findOneAndUpdate(
        { name },
        {
            version,
            status: 'failed',
            appliedAt: new Date(),
            duration,
            error: error.message || String(error),
            checksum,
            appliedBy
        },
        { upsert: true, new: true }
    );
};

// Static method to mark migration as reverted
migrationLogSchema.statics.markReverted = async function(name, revertedBy = 'system') {
    return await this.findOneAndUpdate(
        { name, status: 'applied' },
        {
            status: 'reverted',
            revertedAt: new Date(),
            revertedBy
        },
        { new: true }
    );
};

// Static method to get pending migrations
migrationLogSchema.statics.getPendingMigrations = async function(availableMigrations) {
    const appliedMigrations = await this.find({ status: 'applied' }).select('name');
    const appliedNames = new Set(appliedMigrations.map(m => m.name));
    return availableMigrations.filter(migration => !appliedNames.has(migration.name));
};

module.exports = mongoose.model('MigrationLog', migrationLogSchema);
