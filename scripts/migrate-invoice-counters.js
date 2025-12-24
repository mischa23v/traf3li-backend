/**
 * Migration Script: Initialize Invoice Counters
 *
 * This script initializes the atomic counter for each firm based on existing invoices.
 * Run this ONCE after deploying the atomic counter changes.
 *
 * Usage:
 *   node scripts/migrate-invoice-counters.js
 *   node scripts/migrate-invoice-counters.js --dry-run  # Preview without making changes
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Invoice = require('../src/models/invoice.model');
const Counter = require('../src/models/counter.model');

const isDryRun = process.argv.includes('--dry-run');

// Connect to MongoDB
async function connect() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

// Initialize counters based on existing invoices
async function migrateCounters() {
    console.log('\n' + '═'.repeat(60));
    console.log('  Invoice Counter Migration');
    if (isDryRun) {
        console.log('  MODE: DRY RUN (no changes will be made)');
    }
    console.log('═'.repeat(60) + '\n');

    try {
        // Get all firms with invoices
        const firms = await Invoice.distinct('firmId');

        console.log(`📊 Found ${firms.length} firm(s) with invoices\n`);

        const currentYear = new Date().getFullYear();
        let totalCountersCreated = 0;

        for (const firmId of firms) {
            const firmIdStr = firmId ? firmId.toString() : 'global';
            console.log(`\n🏢 Processing firm: ${firmIdStr}`);
            console.log('─'.repeat(60));

            // Get distinct years for this firm
            const invoices = await Invoice.find({ firmId: firmId || null })
                .select('invoiceNumber createdAt')
                .sort({ createdAt: 1 })
                .lean();

            if (invoices.length === 0) {
                console.log('  ⚠️  No invoices found for this firm');
                continue;
            }

            // Group by year
            const yearGroups = {};
            invoices.forEach(inv => {
                const year = new Date(inv.createdAt).getFullYear();
                if (!yearGroups[year]) {
                    yearGroups[year] = [];
                }
                yearGroups[year].push(inv);
            });

            // Process each year
            for (const [year, yearInvoices] of Object.entries(yearGroups)) {
                const counterId = firmId
                    ? `invoice_${firmId}_${year}`
                    : `invoice_global_${year}`;

                // Check if counter already exists
                const existingCounter = await Counter.findById(counterId);

                if (existingCounter) {
                    console.log(`  📅 Year ${year}: Counter already exists (seq: ${existingCounter.seq})`);
                    continue;
                }

                // Find the highest sequence number for this year
                // Parse invoice numbers to extract sequence
                let maxSeq = 0;
                yearInvoices.forEach(inv => {
                    // Try to extract sequence from various invoice number formats
                    // Format: INV-{YEAR}-{SEQUENCE} or INV-{YEARMONTH}-{SEQUENCE}
                    const parts = inv.invoiceNumber.split('-');
                    if (parts.length >= 3) {
                        const seqStr = parts[parts.length - 1];
                        const seq = parseInt(seqStr);
                        if (!isNaN(seq) && seq > maxSeq) {
                            maxSeq = seq;
                        }
                    }
                });

                console.log(`  📅 Year ${year}: ${yearInvoices.length} invoices, max sequence: ${maxSeq}`);

                if (isDryRun) {
                    console.log(`  🔍 [DRY RUN] Would create counter: ${counterId} with seq: ${maxSeq}`);
                } else {
                    // Create counter with the max sequence
                    await Counter.initializeCounter(counterId, maxSeq);
                    console.log(`  ✅ Created counter: ${counterId} with seq: ${maxSeq}`);
                    totalCountersCreated++;
                }
            }
        }

        console.log('\n' + '═'.repeat(60));
        if (isDryRun) {
            console.log('✅ Dry run completed - no changes made');
        } else {
            console.log(`✅ Migration completed! Created ${totalCountersCreated} counter(s)`);
        }
        console.log('═'.repeat(60) + '\n');

        // Show all invoice counters
        console.log('📋 Current invoice counters:\n');
        const counters = await Counter.find({ _id: { $regex: /^invoice_/ } })
            .sort({ _id: 1 })
            .lean();

        if (counters.length === 0) {
            console.log('  (none)');
        } else {
            counters.forEach(counter => {
                console.log(`  ${counter._id}: ${counter.seq}`);
            });
        }
        console.log();

    } catch (error) {
        console.error('\n❌ Migration error:', error);
        throw error;
    }
}

// Verify migration
async function verifyMigration() {
    console.log('\n' + '═'.repeat(60));
    console.log('  Verification');
    console.log('═'.repeat(60) + '\n');

    // Check for any invoices with duplicate numbers
    const duplicates = await Invoice.aggregate([
        { $group: { _id: '$invoiceNumber', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
    ]);

    if (duplicates.length > 0) {
        console.log('⚠️  WARNING: Duplicate invoice numbers found:');
        duplicates.forEach(dup => {
            console.log(`  - ${dup._id}: ${dup.count} occurrences`);
        });
    } else {
        console.log('✅ No duplicate invoice numbers found');
    }

    // Check counter consistency
    const counters = await Counter.find({ _id: { $regex: /^invoice_/ } }).lean();
    console.log(`\n✅ ${counters.length} invoice counter(s) initialized`);

    console.log();
}

// Main execution
async function main() {
    try {
        await connect();
        await migrateCounters();

        if (!isDryRun) {
            await verifyMigration();
        }

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Disconnected from MongoDB\n');
    }
}

// Run
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { migrateCounters, verifyMigration };
