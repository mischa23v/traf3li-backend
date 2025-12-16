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

// Connect to database
const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

const migrateKPITrackingFields = async () => {
    console.log('Starting KPI Tracking fields migration...\n');

    const Case = require('../models/case.model');

    let totalUpdated = 0;

    // ═══════════════════════════════════════════════════════════════
    // 1. Set dateOpened from createdAt for existing cases
    // ═══════════════════════════════════════════════════════════════
    console.log('1. Setting dateOpened for existing cases...');
    const dateOpenedResult = await Case.updateMany(
        { dateOpened: { $exists: false } },
        [{ $set: { dateOpened: { $ifNull: ['$startDate', '$createdAt'] } } }]
    );
    console.log(`   Updated ${dateOpenedResult.modifiedCount} cases with dateOpened`);
    totalUpdated += dateOpenedResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 2. Set dateClosed from endDate for completed/closed cases
    // ═══════════════════════════════════════════════════════════════
    console.log('2. Setting dateClosed for completed/closed cases...');
    const dateClosedResult = await Case.updateMany(
        {
            dateClosed: { $exists: false },
            status: { $in: ['closed', 'completed'] },
            endDate: { $exists: true }
        },
        [{ $set: { dateClosed: '$endDate' } }]
    );
    console.log(`   Updated ${dateClosedResult.modifiedCount} cases with dateClosed`);
    totalUpdated += dateClosedResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 3. Calculate and set daysOpen for all cases
    // ═══════════════════════════════════════════════════════════════
    console.log('3. Calculating daysOpen for all cases...');

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
    console.log(`   Updated ${daysOpenClosedResult.modifiedCount} closed cases with daysOpen`);
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
    console.log(`   Updated ${daysOpenActiveResult.modifiedCount} active cases with daysOpen`);
    totalUpdated += daysOpenActiveResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 4. Initialize statusHistory array for existing cases
    // ═══════════════════════════════════════════════════════════════
    console.log('4. Initializing statusHistory for existing cases...');
    const statusHistoryResult = await Case.updateMany(
        { statusHistory: { $exists: false } },
        { $set: { statusHistory: [] } }
    );
    console.log(`   Initialized statusHistory for ${statusHistoryResult.modifiedCount} cases`);
    totalUpdated += statusHistoryResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 5. Create indexes for new fields
    // ═══════════════════════════════════════════════════════════════
    console.log('5. Creating indexes for KPI tracking fields...');

    try {
        await Case.collection.createIndex({ dateOpened: 1 });
        console.log('   Created index: dateOpened');
    } catch (e) {
        console.log('   Index dateOpened already exists or error:', e.message);
    }

    try {
        await Case.collection.createIndex({ dateClosed: 1 });
        console.log('   Created index: dateClosed');
    } catch (e) {
        console.log('   Index dateClosed already exists or error:', e.message);
    }

    try {
        await Case.collection.createIndex({ daysOpen: 1 });
        console.log('   Created index: daysOpen');
    } catch (e) {
        console.log('   Index daysOpen already exists or error:', e.message);
    }

    try {
        await Case.collection.createIndex({ 'statusHistory.changedAt': 1 });
        console.log('   Created index: statusHistory.changedAt');
    } catch (e) {
        console.log('   Index statusHistory.changedAt already exists or error:', e.message);
    }

    try {
        await Case.collection.createIndex({ closedBy: 1 });
        console.log('   Created index: closedBy');
    } catch (e) {
        console.log('   Index closedBy already exists or error:', e.message);
    }

    // Compound index for KPI queries
    try {
        await Case.collection.createIndex({ firmId: 1, status: 1, dateClosed: 1 });
        console.log('   Created compound index: firmId + status + dateClosed');
    } catch (e) {
        console.log('   Compound index already exists or error:', e.message);
    }

    // ═══════════════════════════════════════════════════════════════
    // 6. Summary stats
    // ═══════════════════════════════════════════════════════════════
    console.log('\n6. Migration stats:');

    const casesWithDateOpened = await Case.countDocuments({ dateOpened: { $exists: true } });
    const casesWithDateClosed = await Case.countDocuments({ dateClosed: { $exists: true } });
    const casesWithDaysOpen = await Case.countDocuments({ daysOpen: { $gt: 0 } });
    const totalCases = await Case.countDocuments({});

    console.log(`   Total cases: ${totalCases}`);
    console.log(`   Cases with dateOpened: ${casesWithDateOpened}`);
    console.log(`   Cases with dateClosed: ${casesWithDateClosed}`);
    console.log(`   Cases with daysOpen > 0: ${casesWithDaysOpen}`);

    // Average cycle time for closed cases
    const avgCycleTime = await Case.aggregate([
        { $match: { status: { $in: ['closed', 'completed'] }, daysOpen: { $gt: 0 } } },
        { $group: { _id: null, avgDays: { $avg: '$daysOpen' } } }
    ]);
    if (avgCycleTime.length > 0) {
        console.log(`   Average cycle time (closed cases): ${Math.round(avgCycleTime[0].avgDays)} days`);
    }

    // ═══════════════════════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`Migration completed successfully!`);
    console.log(`Total updates made: ${totalUpdated}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
};

// Run migration
const run = async () => {
    try {
        await connectDB();
        await migrateKPITrackingFields();
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

run();
