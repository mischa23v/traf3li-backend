/**
 * Example Migration: Add User Preferences
 *
 * This is an example migration that demonstrates the migration pattern.
 * It shows how to write both 'up' (apply) and 'down' (revert) functions.
 *
 * Migration Pattern:
 * - Export 'up' function for applying the migration
 * - Export 'down' function for reverting the migration
 * - Use async/await for database operations
 * - Use logger for tracking progress
 * - Handle errors appropriately
 *
 * Run with:
 *   node src/scripts/migrate.js run example-migration.js
 *
 * Revert with:
 *   node src/scripts/migrate.js down example-migration.js
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Apply migration - Add preferences field to User collection
 */
const up = async () => {
    logger.info('Starting migration: Add user preferences field');

    try {
        const User = require('../models/user.model');

        // Count users that need migration
        const count = await User.countDocuments({
            preferences: { $exists: false }
        });

        if (count === 0) {
            logger.info('No users need migration');
            return;
        }

        logger.info(`Found ${count} users that need migration`);

        // Update users in batches
        const batchSize = 100;
        let processed = 0;

        while (processed < count) {
            const result = await User.updateMany(
                { preferences: { $exists: false } },
                {
                    $set: {
                        preferences: {
                            theme: 'light',
                            language: 'ar',
                            emailNotifications: true,
                            pushNotifications: true,
                            timezone: 'Asia/Riyadh'
                        }
                    }
                },
                { limit: batchSize }
            );

            processed += result.modifiedCount;
            logger.info(`Processed ${processed}/${count} users`);

            // If no more documents were modified, exit loop
            if (result.modifiedCount === 0) {
                break;
            }
        }

        logger.info(`✓ Migration completed: Updated ${processed} users`);

    } catch (error) {
        logger.error('Migration failed:', error);
        throw error;
    }
};

/**
 * Revert migration - Remove preferences field from User collection
 */
const down = async () => {
    logger.info('Reverting migration: Remove user preferences field');

    try {
        const User = require('../models/user.model');

        // Count users that have preferences
        const count = await User.countDocuments({
            preferences: { $exists: true }
        });

        if (count === 0) {
            logger.info('No users have preferences to remove');
            return;
        }

        logger.info(`Found ${count} users with preferences`);

        // Remove preferences field
        const result = await User.updateMany(
            { preferences: { $exists: true } },
            { $unset: { preferences: '' } }
        );

        logger.info(`✓ Revert completed: Removed preferences from ${result.modifiedCount} users`);

    } catch (error) {
        logger.error('Revert failed:', error);
        throw error;
    }
};

// Export migration functions
module.exports = {
    up,
    down
};
