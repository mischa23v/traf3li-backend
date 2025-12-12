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

const dropStaleIndexes = async () => {
    console.log('Checking for stale indexes...\n');

    const db = mongoose.connection.db;
    const collection = db.collection('casenotionpages');

    try {
        // List all indexes
        const indexes = await collection.indexes();
        console.log('Current indexes on casenotionpages:');
        indexes.forEach(idx => {
            console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
        });
        console.log('');

        // Check if slug_1_caseId_1 exists
        const slugIndex = indexes.find(idx => idx.name === 'slug_1_caseId_1');

        if (slugIndex) {
            console.log('Found stale index: slug_1_caseId_1');
            console.log('Dropping index...');
            await collection.dropIndex('slug_1_caseId_1');
            console.log('✓ Index dropped successfully!');
        } else {
            console.log('No stale slug index found.');
        }

        // Also check for any other slug-related indexes
        const otherSlugIndexes = indexes.filter(idx =>
            idx.name.includes('slug') && idx.name !== 'slug_1_caseId_1'
        );

        for (const idx of otherSlugIndexes) {
            console.log(`Found additional slug index: ${idx.name}`);
            console.log('Dropping index...');
            await collection.dropIndex(idx.name);
            console.log(`✓ Index ${idx.name} dropped successfully!`);
        }

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('Stale index cleanup complete!');
        console.log('═══════════════════════════════════════════════════════════════\n');

    } catch (error) {
        if (error.codeName === 'IndexNotFound') {
            console.log('Index not found - already removed or never existed.');
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
        console.log('Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('Failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

run();
