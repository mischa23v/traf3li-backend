/**
 * Migration: Add Entity Type Fields to Case Model
 *
 * This migration:
 * 1. Sets default entityType='court' for existing cases without entityType
 * 2. Creates indexes for the new fields
 * 3. Generates internal references for cases without them
 *
 * Run with: node src/migrations/add-entity-type-fields.js
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

/**
 * Generate internal reference for a case
 * Format: YYYY/XXXX (e.g., 2025/0001, 2025/0002)
 */
const generateInternalReference = async (Case, firmId, year) => {
    const query = { internalReference: { $regex: `^${year}/` } };
    if (firmId) {
        query.firmId = firmId;
    }

    const lastCase = await Case.findOne(query)
        .sort({ internalReference: -1 })
        .select('internalReference')
        .lean();

    let sequence = 1;
    if (lastCase?.internalReference) {
        const [, lastSeq] = lastCase.internalReference.split('/');
        sequence = parseInt(lastSeq, 10) + 1;
    }

    return `${year}/${sequence.toString().padStart(4, '0')}`;
};

const migrateEntityTypeFields = async () => {
    console.log('Starting Entity Type fields migration...\n');

    const Case = require('../models/case.model');

    let totalUpdated = 0;

    // ═══════════════════════════════════════════════════════════════
    // 1. Set default entityType for existing cases
    // ═══════════════════════════════════════════════════════════════
    console.log('1. Setting default entityType for existing cases...');
    const entityTypeResult = await Case.updateMany(
        { entityType: { $exists: false } },
        { $set: { entityType: 'court' } }
    );
    console.log(`   Updated ${entityTypeResult.modifiedCount} cases with default entityType='court'`);
    totalUpdated += entityTypeResult.modifiedCount;

    // ═══════════════════════════════════════════════════════════════
    // 2. Generate internal references for cases without them
    // ═══════════════════════════════════════════════════════════════
    console.log('2. Generating internal references for cases without them...');

    // Get all cases without internal reference, grouped by firmId
    const casesWithoutRef = await Case.find(
        { internalReference: { $exists: false } },
        { _id: 1, firmId: 1, createdAt: 1 }
    ).sort({ createdAt: 1 }).lean();

    console.log(`   Found ${casesWithoutRef.length} cases without internal reference`);

    // Group cases by firmId and year
    const casesByFirmAndYear = {};
    for (const c of casesWithoutRef) {
        const year = new Date(c.createdAt).getFullYear();
        const key = `${c.firmId || 'no-firm'}-${year}`;
        if (!casesByFirmAndYear[key]) {
            casesByFirmAndYear[key] = {
                firmId: c.firmId,
                year,
                cases: []
            };
        }
        casesByFirmAndYear[key].cases.push(c);
    }

    let refUpdated = 0;
    for (const key in casesByFirmAndYear) {
        const group = casesByFirmAndYear[key];

        // Get the starting sequence for this firm/year
        let sequence = 1;
        const lastCase = await Case.findOne({
            ...(group.firmId ? { firmId: group.firmId } : {}),
            internalReference: { $regex: `^${group.year}/` }
        })
            .sort({ internalReference: -1 })
            .select('internalReference')
            .lean();

        if (lastCase?.internalReference) {
            const [, lastSeq] = lastCase.internalReference.split('/');
            sequence = parseInt(lastSeq, 10) + 1;
        }

        // Update each case in the group
        for (const c of group.cases) {
            const ref = `${group.year}/${sequence.toString().padStart(4, '0')}`;
            await Case.updateOne(
                { _id: c._id },
                { $set: { internalReference: ref } }
            );
            sequence++;
            refUpdated++;
        }
    }
    console.log(`   Generated internal references for ${refUpdated} cases`);
    totalUpdated += refUpdated;

    // ═══════════════════════════════════════════════════════════════
    // 3. Create indexes for new fields
    // ═══════════════════════════════════════════════════════════════
    console.log('3. Ensuring indexes exist for new fields...');

    try {
        // These indexes are defined in the schema, but we ensure they exist
        await Case.collection.createIndex({ entityType: 1 });
        await Case.collection.createIndex({ firmId: 1, entityType: 1 });
        await Case.collection.createIndex({ committee: 1 });
        await Case.collection.createIndex({ arbitrationCenter: 1 });
        await Case.collection.createIndex({ region: 1 });
        await Case.collection.createIndex({ internalReference: 1 }, { unique: true, sparse: true });
        await Case.collection.createIndex({ 'plaintiff.unifiedNumber': 1 });
        await Case.collection.createIndex({ 'defendant.unifiedNumber': 1 });
        console.log('   Indexes created/verified successfully');
    } catch (indexError) {
        console.log('   Some indexes may already exist:', indexError.message);
    }

    // ═══════════════════════════════════════════════════════════════
    // 4. Summary stats
    // ═══════════════════════════════════════════════════════════════
    console.log('\n4. Migration stats:');

    const entityTypeCounts = await Case.aggregate([
        { $group: { _id: '$entityType', count: { $sum: 1 } } }
    ]);
    console.log('   Cases by entityType:');
    for (const item of entityTypeCounts) {
        console.log(`     - ${item._id || 'null'}: ${item.count}`);
    }

    const casesWithRef = await Case.countDocuments({ internalReference: { $exists: true, $ne: null } });
    const totalCases = await Case.countDocuments({});
    console.log(`   Cases with internal reference: ${casesWithRef}/${totalCases}`);

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
        await migrateEntityTypeFields();
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
