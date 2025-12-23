/**
 * Migration: Add KPI Tracking Fields to Case Model
 *
 * This migration:
 * 1. Sets dateOpened from createdAt for existing cases
 * 2. Calculates daysOpen for all cases
 * 3. Sets dateClosed from endDate for completed/closed cases
 * 4. Initializes statusHistory array for existing cases
 * 5. Creates indexes for the new fields
 *
 * Run with: node src/migrations/add-kpi-tracking-fields.js
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

const migrateKPITrackingFields = async () => {
    logger.info('Starting KPI Tracking fields migration...\n');

    const Case = require('../models/case.model');

    let totalUpdated = 0;

    // ═══════════════════════════════════════════════════════════════
    // 1. Set dateOpened from createdAt for existing cases
    // ═══════════════════════════════════════════════════════════════
    logger.info('1. Setting dateOpened for existing cases...');
    const dateOpenedResult = await Case.updateMany(
        { dateOpened: { $exists: false } },
        [{ $set: { dateOpened: { $ifNull: ['$startDate', '$createdAt'] } } }]
    );
    logger.info(`   Updated ${dateOpenedResult.modifiedCount} cases with dateOpened`);
    totalUpdated += dateOpenedResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 2. Set dateClosed from endDate for completed/closed cases
    // ═══════════════════════════════════════════════════════════════
    logger.info('2. Setting dateClosed for completed/closed cases...');
    const dateClosedResult = await Case.updateMany(
        {
            dateClosed: { $exists: false },
            status: { $in: ['closed', 'completed'] },
            endDate: { $exists: true }
        },
        [{ $set: { dateClosed: '$endDate' } }]
    );
    logger.info(`   Updated ${dateClosedResult.modifiedCount} cases with dateClosed`);
    totalUpdated += dateClosedResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 3. Calculate and set daysOpen for all cases
    // ═══════════════════════════════════════════════════════════════
    logger.info('3. Calculating daysOpen for all cases...');

    // For closed cases, calculate from dateOpened to dateClosed
    const daysOpenClosedResult = await Case.updateMany(
        {
            daysOpen: { $in: [0, null, { $exists: false }] },
            dateClosed: { $exists: true }
        },
        [{
            $set: {
                daysOpen: {
                    $ceil: {
                        $divide: [
                            { $subtract: ['$dateClosed', { $ifNull: ['$dateOpened', '$createdAt'] }] },
                            1000 * 60 * 60 * 24
                        ]
                    }
                }
            }
        }]
    );
    logger.info(`   Updated ${daysOpenClosedResult.modifiedCount} closed cases with daysOpen`);
    totalUpdated += daysOpenClosedResult.modifiedCount;

    // For open cases, calculate from dateOpened to now
    const daysOpenActiveResult = await Case.updateMany(
        {
            daysOpen: { $in: [0, null, { $exists: false }] },
            dateClosed: { $exists: false }
        },
        [{
            $set: {
                daysOpen: {
                    $ceil: {
                        $divide: [
                            { $subtract: [new Date(), { $ifNull: ['$dateOpened', '$createdAt'] }] },
                            1000 * 60 * 60 * 24
                        ]
                    }
                }
            }
        }]
    );
    logger.info(`   Updated ${daysOpenActiveResult.modifiedCount} active cases with daysOpen`);
    totalUpdated += daysOpenActiveResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 4. Initialize statusHistory array for existing cases
    // ═══════════════════════════════════════════════════════════════
    logger.info('4. Initializing statusHistory for existing cases...');
    const statusHistoryResult = await Case.updateMany(
        { statusHistory: { $exists: false } },
        { $set: { statusHistory: [] } }
    );
    logger.info(`   Initialized statusHistory for ${statusHistoryResult.modifiedCount} cases`);
    totalUpdated += statusHistoryResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 5. Create indexes for new fields
    // ═══════════════════════════════════════════════════════════════
    logger.info('5. Creating indexes for KPI tracking fields...');

    try {
        await Case.collection.createIndex({ dateOpened: 1 });
        logger.info('   Created index: dateOpened');
    } catch (e) {
        logger.info('   Index dateOpened already exists or error:', e.message);
    }

    try {
        await Case.collection.createIndex({ dateClosed: 1 });
        logger.info('   Created index: dateClosed');
    } catch (e) {
        logger.info('   Index dateClosed already exists or error:', e.message);
    }

    try {
        await Case.collection.createIndex({ daysOpen: 1 });
        logger.info('   Created index: daysOpen');
    } catch (e) {
        logger.info('   Index daysOpen already exists or error:', e.message);
    }

    try {
        await Case.collection.createIndex({ 'statusHistory.changedAt': 1 });
        logger.info('   Created index: statusHistory.changedAt');
    } catch (e) {
        logger.info('   Index statusHistory.changedAt already exists or error:', e.message);
    }

    try {
        await Case.collection.createIndex({ closedBy: 1 });
        logger.info('   Created index: closedBy');
    } catch (e) {
        logger.info('   Index closedBy already exists or error:', e.message);
    }

    // Compound index for KPI queries
    try {
        await Case.collection.createIndex({ firmId: 1, status: 1, dateClosed: 1 });
        logger.info('   Created compound index: firmId + status + dateClosed');
    } catch (e) {
        logger.info('   Compound index already exists or error:', e.message);
    }

    // ═══════════════════════════════════════════════════════════════
    // 6. Summary stats
    // ═══════════════════════════════════════════════════════════════
    logger.info('\n6. Migration stats:');

    const casesWithDateOpened = await Case.countDocuments({ dateOpened: { $exists: true } });
    const casesWithDateClosed = await Case.countDocuments({ dateClosed: { $exists: true } });
    const casesWithDaysOpen = await Case.countDocuments({ daysOpen: { $gt: 0 } });
    const totalCases = await Case.countDocuments({});

    logger.info(`   Total cases: ${totalCases}`);
    logger.info(`   Cases with dateOpened: ${casesWithDateOpened}`);
    logger.info(`   Cases with dateClosed: ${casesWithDateClosed}`);
    logger.info(`   Cases with daysOpen > 0: ${casesWithDaysOpen}`);

    // Average cycle time for closed cases
    const avgCycleTime = await Case.aggregate([
        { $match: { status: { $in: ['closed', 'completed'] }, daysOpen: { $gt: 0 } } },
        { $group: { _id: null, avgDays: { $avg: '$daysOpen' } } }
    ]);
    if (avgCycleTime.length > 0) {
        logger.info(`   Average cycle time (closed cases): ${Math.round(avgCycleTime[0].avgDays)} days`);
    }

    // ═══════════════════════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════════════════════
    logger.info('\n═══════════════════════════════════════════════════════════════');
    logger.info(`Migration completed successfully!`);
    logger.info(`Total updates made: ${totalUpdated}`);
    logger.info('═══════════════════════════════════════════════════════════════\n');
};

// Run migration
const run = async () => {
    try {
        await connectDB();
        await migrateKPITrackingFields();
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        logger.error('Migration failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

run();
