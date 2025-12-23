/**
 * Example Migration: Add Database Indexes
 *
 * This example demonstrates how to add database indexes in a migration.
 * Indexes are important for query performance and should be tracked via migrations.
 *
 * Run with:
 *   node src/scripts/migrate.js run example-add-indexes.js
 *
 * Revert with:
 *   node src/scripts/migrate.js down example-add-indexes.js
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Apply migration - Add indexes
 */
const up = async () => {
    logger.info('Starting migration: Add database indexes');

    try {
        const db = mongoose.connection.db;

        // Example 1: Add compound index on Case collection
        logger.info('Adding compound index on cases (firmId, status, createdAt)...');
        await db.collection('cases').createIndex(
            { firmId: 1, status: 1, createdAt: -1 },
            {
                name: 'idx_firm_status_created',
                background: true // Create index in background to avoid blocking
            }
        );
        logger.info('✓ Case compound index created');

        // Example 2: Add text index for full-text search
        logger.info('Adding text index on documents (title, content)...');
        await db.collection('documents').createIndex(
            { title: 'text', content: 'text' },
            {
                name: 'idx_document_text_search',
                background: true,
                weights: {
                    title: 10,  // Title is more important than content
                    content: 5
                }
            }
        );
        logger.info('✓ Document text index created');

        // Example 3: Add unique index
        logger.info('Adding unique index on clients (email)...');
        await db.collection('clients').createIndex(
            { email: 1 },
            {
                name: 'idx_client_email_unique',
                unique: true,
                sparse: true, // Allow null values
                background: true
            }
        );
        logger.info('✓ Client email unique index created');

        // Example 4: Add TTL index for auto-deletion
        logger.info('Adding TTL index on sessions (expiresAt)...');
        await db.collection('sessions').createIndex(
            { expiresAt: 1 },
            {
                name: 'idx_session_ttl',
                expireAfterSeconds: 0, // Delete documents when expiresAt date is reached
                background: true
            }
        );
        logger.info('✓ Session TTL index created');

        // Example 5: Add partial index (only for specific conditions)
        logger.info('Adding partial index on users (firmId) for active users only...');
        await db.collection('users').createIndex(
            { firmId: 1 },
            {
                name: 'idx_user_firm_active',
                partialFilterExpression: {
                    firmStatus: 'active'
                },
                background: true
            }
        );
        logger.info('✓ User firm partial index created');

        logger.info('✓ Migration completed: All indexes created successfully');

    } catch (error) {
        // Handle specific error codes
        if (error.code === 85) {
            logger.warn('Index already exists, continuing...');
        } else if (error.code === 86) {
            logger.error('Index with different options already exists');
            throw error;
        } else {
            logger.error('Migration failed:', error);
            throw error;
        }
    }
};

/**
 * Revert migration - Drop indexes
 */
const down = async () => {
    logger.info('Reverting migration: Drop database indexes');

    try {
        const db = mongoose.connection.db;

        // Drop indexes by name
        const indexes = [
            { collection: 'cases', name: 'idx_firm_status_created' },
            { collection: 'documents', name: 'idx_document_text_search' },
            { collection: 'clients', name: 'idx_client_email_unique' },
            { collection: 'sessions', name: 'idx_session_ttl' },
            { collection: 'users', name: 'idx_user_firm_active' }
        ];

        for (const { collection, name } of indexes) {
            try {
                logger.info(`Dropping index ${name} from ${collection}...`);
                await db.collection(collection).dropIndex(name);
                logger.info(`✓ Dropped index ${name}`);
            } catch (error) {
                if (error.code === 27) {
                    logger.warn(`Index ${name} does not exist, skipping...`);
                } else {
                    throw error;
                }
            }
        }

        logger.info('✓ Revert completed: All indexes dropped successfully');

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
