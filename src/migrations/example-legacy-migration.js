/**
 * Example Legacy Migration (Backward Compatibility)
 *
 * This example shows the legacy migration pattern used in existing migrations.
 * The new migration system supports BOTH patterns:
 * 1. Legacy: Self-executing migrations (like this one)
 * 2. Modern: Export up/down functions (see example-migration.js)
 *
 * Note: Legacy migrations don't support the 'down' function for rollback.
 * For new migrations, prefer the modern pattern with up/down functions.
 *
 * Run with:
 *   node src/scripts/migrate.js run example-legacy-migration.js
 *   OR (legacy direct execution)
 *   node src/migrations/example-legacy-migration.js
 */

const mongoose = require('mongoose');
require('dotenv').config();
const logger = require('../utils/logger');

// Connect to database
const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        await mongoose.connect(mongoUri);
        logger.info('Connected to MongoDB');
    } catch (error) {
        logger.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

/**
 * Main migration function
 */
const migrateLegacyPattern = async () => {
    logger.info('Starting legacy pattern migration...\n');

    const Case = require('../models/case.model');

    let totalUpdated = 0;

    // ═══════════════════════════════════════════════════════════════
    // 1. Example: Set default value for missing field
    // ═══════════════════════════════════════════════════════════════
    logger.info('1. Setting default values...');
    const result = await Case.updateMany(
        { someField: { $exists: false } },
        { $set: { someField: 'default-value' } }
    );
    logger.info(`   Updated ${result.modifiedCount} cases`);
    totalUpdated += result.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 2. Example: Create indexes
    // ═══════════════════════════════════════════════════════════════
    logger.info('2. Creating indexes...');
    try {
        await Case.collection.createIndex({ someField: 1 });
        logger.info('   Index created successfully');
    } catch (indexError) {
        logger.info('   Index may already exist:', indexError.message);
    }

    // ═══════════════════════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════════════════════
    logger.info('\n═══════════════════════════════════════════════════════════════');
    logger.info(`Migration completed successfully!`);
    logger.info(`Total documents updated: ${totalUpdated}`);
    logger.info('═══════════════════════════════════════════════════════════════\n');
};

/**
 * Run migration
 * This runs automatically when the file is executed directly
 */
const run = async () => {
    try {
        await connectDB();
        await migrateLegacyPattern();
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        logger.error('Migration failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

// Run if executed directly (legacy behavior)
if (require.main === module) {
    run();
}

// Also export the migration function for the new system
// The migration service will call this when using: migrate.js run
module.exports = {
    up: migrateLegacyPattern,
    // Legacy migrations typically don't have a down function
    down: async () => {
        logger.warn('This legacy migration does not support rollback');
        logger.warn('For rollback support, use the modern migration pattern with up/down functions');
    }
};
