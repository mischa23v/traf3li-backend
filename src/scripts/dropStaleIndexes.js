/**
 * Script to drop stale indexes from CaseNotionPage collection
 *
 * This fixes the duplicate key error on slug_1_caseId_1 index
 * which was created but the model doesn't have a slug field.
 *
 * Run with: node src/scripts/dropStaleIndexes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();
const logger = require('../utils/logger');

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

const dropStaleIndexes = async () => {
    logger.info('Checking for stale indexes...\n');

    const db = mongoose.connection.db;
    const collection = db.collection('casenotionpages');

    try {
        // List all indexes
        const indexes = await collection.indexes();
        logger.info('Current indexes on casenotionpages:');
        indexes.forEach(idx => {
            logger.info(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
        });
        logger.info('');

        // Check if slug_1_caseId_1 exists
        const slugIndex = indexes.find(idx => idx.name === 'slug_1_caseId_1');

        if (slugIndex) {
            logger.info('Found stale index: slug_1_caseId_1');
            logger.info('Dropping index...');
            await collection.dropIndex('slug_1_caseId_1');
            logger.info('✓ Index dropped successfully!');
        } else {
            logger.info('No stale slug index found.');
        }

        // Also check for any other slug-related indexes
        const otherSlugIndexes = indexes.filter(idx =>
            idx.name.includes('slug') && idx.name !== 'slug_1_caseId_1'
        );

        for (const idx of otherSlugIndexes) {
            logger.info(`Found additional slug index: ${idx.name}`);
            logger.info('Dropping index...');
            await collection.dropIndex(idx.name);
            logger.info(`✓ Index ${idx.name} dropped successfully!`);
        }

        logger.info('\n═══════════════════════════════════════════════════════════════');
        logger.info('Stale index cleanup complete!');
        logger.info('═══════════════════════════════════════════════════════════════\n');

    } catch (error) {
        if (error.codeName === 'IndexNotFound') {
            logger.info('Index not found - already removed or never existed.');
        } else {
            throw error;
        }
    }
};

const run = async () => {
    try {
        await connectDB();
        await dropStaleIndexes();
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        logger.error('Failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

run();
