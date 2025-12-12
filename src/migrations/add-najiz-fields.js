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

const migrateNajizFields = async () => {
    console.log('Starting Najiz fields migration...\n');

    const Client = require('../models/client.model');
    const Lead = require('../models/lead.model');

    let totalUpdated = 0;

    // ═══════════════════════════════════════════════════════════════
    // 1. Set identityType for existing nationalId (Clients)
    // ═══════════════════════════════════════════════════════════════
    console.log('1. Updating Clients with nationalId...');
    const clientNationalIdResult = await Client.updateMany(
        {
            nationalId: { $exists: true, $ne: null, $ne: '' },
            identityType: { $exists: false }
        },
        { $set: { identityType: 'national_id' } }
    );
    console.log(`   Updated ${clientNationalIdResult.modifiedCount} clients with nationalId`);
    totalUpdated += clientNationalIdResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 2. Set identityType for existing nationalId (Leads)
    // ═══════════════════════════════════════════════════════════════
    console.log('2. Updating Leads with nationalId...');
    const leadNationalIdResult = await Lead.updateMany(
        {
            nationalId: { $exists: true, $ne: null, $ne: '' },
            identityType: { $exists: false }
        },
        { $set: { identityType: 'national_id' } }
    );
    console.log(`   Updated ${leadNationalIdResult.modifiedCount} leads with nationalId`);
    totalUpdated += leadNationalIdResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 3. Set identityType for existing iqamaNumber (Clients)
    // ═══════════════════════════════════════════════════════════════
    console.log('3. Updating Clients with iqamaNumber...');
    const clientIqamaResult = await Client.updateMany(
        {
            iqamaNumber: { $exists: true, $ne: null, $ne: '' },
            identityType: { $exists: false }
        },
        { $set: { identityType: 'iqama' } }
    );
    console.log(`   Updated ${clientIqamaResult.modifiedCount} clients with iqamaNumber`);
    totalUpdated += clientIqamaResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 4. Set identityType for existing iqamaNumber (Leads)
    // ═══════════════════════════════════════════════════════════════
    console.log('4. Updating Leads with iqamaNumber...');
    const leadIqamaResult = await Lead.updateMany(
        {
            iqamaNumber: { $exists: true, $ne: null, $ne: '' },
            identityType: { $exists: false }
        },
        { $set: { identityType: 'iqama' } }
    );
    console.log(`   Updated ${leadIqamaResult.modifiedCount} leads with iqamaNumber`);
    totalUpdated += leadIqamaResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 5. Set default conflictCheckStatus (Clients)
    // ═══════════════════════════════════════════════════════════════
    console.log('5. Setting default conflictCheckStatus for Clients...');
    const clientConflictResult = await Client.updateMany(
        { conflictCheckStatus: { $exists: false } },
        { $set: { conflictCheckStatus: 'not_checked' } }
    );
    console.log(`   Updated ${clientConflictResult.modifiedCount} clients with conflictCheckStatus`);
    totalUpdated += clientConflictResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 6. Set default conflictCheckStatus (Leads)
    // ═══════════════════════════════════════════════════════════════
    console.log('6. Setting default conflictCheckStatus for Leads...');
    const leadConflictResult = await Lead.updateMany(
        { conflictCheckStatus: { $exists: false } },
        { $set: { conflictCheckStatus: 'not_checked' } }
    );
    console.log(`   Updated ${leadConflictResult.modifiedCount} leads with conflictCheckStatus`);
    totalUpdated += leadConflictResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 7. Set default isVerified (Clients)
    // ═══════════════════════════════════════════════════════════════
    console.log('7. Setting default isVerified for Clients...');
    const clientVerifiedResult = await Client.updateMany(
        { isVerified: { $exists: false } },
        { $set: { isVerified: false } }
    );
    console.log(`   Updated ${clientVerifiedResult.modifiedCount} clients with isVerified`);
    totalUpdated += clientVerifiedResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 8. Set default isVerified (Leads)
    // ═══════════════════════════════════════════════════════════════
    console.log('8. Setting default isVerified for Leads...');
    const leadVerifiedResult = await Lead.updateMany(
        { isVerified: { $exists: false } },
        { $set: { isVerified: false } }
    );
    console.log(`   Updated ${leadVerifiedResult.modifiedCount} leads with isVerified`);
    totalUpdated += leadVerifiedResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`Migration completed successfully!`);
    console.log(`Total documents updated: ${totalUpdated}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
};

// Run migration
const run = async () => {
    try {
        await connectDB();
        await migrateNajizFields();
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
