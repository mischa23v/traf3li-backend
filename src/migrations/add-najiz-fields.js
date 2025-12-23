/**
 * Migration: Add Najiz Fields to Client and Lead Models
 *
 * This migration:
 * 1. Sets identityType for existing nationalId records
 * 2. Sets identityType for existing iqamaNumber records
 * 3. Sets default conflictCheckStatus for existing records
 *
 * Run with: node src/migrations/add-najiz-fields.js
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

const migrateNajizFields = async () => {
    logger.info('Starting Najiz fields migration...\n');

    const Client = require('../models/client.model');
    const Lead = require('../models/lead.model');

    let totalUpdated = 0;

    // ═══════════════════════════════════════════════════════════════
    // 1. Set identityType for existing nationalId (Clients)
    // ═══════════════════════════════════════════════════════════════
    logger.info('1. Updating Clients with nationalId...');
    const clientNationalIdResult = await Client.updateMany(
        {
            nationalId: { $exists: true, $ne: null, $ne: '' },
            identityType: { $exists: false }
        },
        { $set: { identityType: 'national_id' } }
    );
    logger.info(`   Updated ${clientNationalIdResult.modifiedCount} clients with nationalId`);
    totalUpdated += clientNationalIdResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 2. Set identityType for existing nationalId (Leads)
    // ═══════════════════════════════════════════════════════════════
    logger.info('2. Updating Leads with nationalId...');
    const leadNationalIdResult = await Lead.updateMany(
        {
            nationalId: { $exists: true, $ne: null, $ne: '' },
            identityType: { $exists: false }
        },
        { $set: { identityType: 'national_id' } }
    );
    logger.info(`   Updated ${leadNationalIdResult.modifiedCount} leads with nationalId`);
    totalUpdated += leadNationalIdResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 3. Set identityType for existing iqamaNumber (Clients)
    // ═══════════════════════════════════════════════════════════════
    logger.info('3. Updating Clients with iqamaNumber...');
    const clientIqamaResult = await Client.updateMany(
        {
            iqamaNumber: { $exists: true, $ne: null, $ne: '' },
            identityType: { $exists: false }
        },
        { $set: { identityType: 'iqama' } }
    );
    logger.info(`   Updated ${clientIqamaResult.modifiedCount} clients with iqamaNumber`);
    totalUpdated += clientIqamaResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 4. Set identityType for existing iqamaNumber (Leads)
    // ═══════════════════════════════════════════════════════════════
    logger.info('4. Updating Leads with iqamaNumber...');
    const leadIqamaResult = await Lead.updateMany(
        {
            iqamaNumber: { $exists: true, $ne: null, $ne: '' },
            identityType: { $exists: false }
        },
        { $set: { identityType: 'iqama' } }
    );
    logger.info(`   Updated ${leadIqamaResult.modifiedCount} leads with iqamaNumber`);
    totalUpdated += leadIqamaResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 5. Set default conflictCheckStatus (Clients)
    // ═══════════════════════════════════════════════════════════════
    logger.info('5. Setting default conflictCheckStatus for Clients...');
    const clientConflictResult = await Client.updateMany(
        { conflictCheckStatus: { $exists: false } },
        { $set: { conflictCheckStatus: 'not_checked' } }
    );
    logger.info(`   Updated ${clientConflictResult.modifiedCount} clients with conflictCheckStatus`);
    totalUpdated += clientConflictResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 6. Set default conflictCheckStatus (Leads)
    // ═══════════════════════════════════════════════════════════════
    logger.info('6. Setting default conflictCheckStatus for Leads...');
    const leadConflictResult = await Lead.updateMany(
        { conflictCheckStatus: { $exists: false } },
        { $set: { conflictCheckStatus: 'not_checked' } }
    );
    logger.info(`   Updated ${leadConflictResult.modifiedCount} leads with conflictCheckStatus`);
    totalUpdated += leadConflictResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 7. Set default isVerified (Clients)
    // ═══════════════════════════════════════════════════════════════
    logger.info('7. Setting default isVerified for Clients...');
    const clientVerifiedResult = await Client.updateMany(
        { isVerified: { $exists: false } },
        { $set: { isVerified: false } }
    );
    logger.info(`   Updated ${clientVerifiedResult.modifiedCount} clients with isVerified`);
    totalUpdated += clientVerifiedResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 8. Set default isVerified (Leads)
    // ═══════════════════════════════════════════════════════════════
    logger.info('8. Setting default isVerified for Leads...');
    const leadVerifiedResult = await Lead.updateMany(
        { isVerified: { $exists: false } },
        { $set: { isVerified: false } }
    );
    logger.info(`   Updated ${leadVerifiedResult.modifiedCount} leads with isVerified`);
    totalUpdated += leadVerifiedResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════════════════════
    logger.info('\n═══════════════════════════════════════════════════════════════');
    logger.info(`Migration completed successfully!`);
    logger.info(`Total documents updated: ${totalUpdated}`);
    logger.info('═══════════════════════════════════════════════════════════════\n');
};

// Run migration
const run = async () => {
    try {
        await connectDB();
        await migrateNajizFields();
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
