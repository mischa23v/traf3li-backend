/**
 * Test Script: Atomic Invoice Numbering
 *
 * This script demonstrates that invoice numbers are generated atomically
 * without gaps or duplicates, even under concurrent load.
 *
 * Run: node test-atomic-invoice-numbering.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Invoice = require('./src/models/invoice.model');
const Counter = require('./src/models/counter.model');

// Connect to MongoDB
async function connect() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/traf3li-test', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

// Test 1: Sequential invoice creation (should have no gaps)
async function testSequentialCreation() {
    console.log('\n📝 Test 1: Sequential Invoice Creation');
    console.log('─'.repeat(50));

    const testFirmId = new mongoose.Types.ObjectId();
    const invoiceNumbers = [];

    for (let i = 0; i < 5; i++) {
        const invoice = new Invoice({
            firmId: testFirmId,
            lawyerId: new mongoose.Types.ObjectId(),
            clientId: new mongoose.Types.ObjectId(),
            dueDate: new Date(),
            items: [{
                description: `Test item ${i}`,
                quantity: 1,
                unitPrice: 100
            }]
        });

        await invoice.save();
        invoiceNumbers.push(invoice.invoiceNumber);
        console.log(`  Invoice ${i + 1}: ${invoice.invoiceNumber}`);
    }

    // Verify no gaps in sequence
    const sequences = invoiceNumbers.map(num => parseInt(num.split('-')[2]));
    const hasGaps = sequences.some((seq, idx) => idx > 0 && seq !== sequences[idx - 1] + 1);

    if (hasGaps) {
        console.log('❌ FAIL: Gaps detected in sequence');
    } else {
        console.log('✅ PASS: No gaps in sequence');
    }

    // Cleanup
    await Invoice.deleteMany({ firmId: testFirmId });
}

// Test 2: Concurrent invoice creation (simulates race conditions)
async function testConcurrentCreation() {
    console.log('\n⚡ Test 2: Concurrent Invoice Creation (Race Condition Test)');
    console.log('─'.repeat(50));

    const testFirmId = new mongoose.Types.ObjectId();
    const concurrentCount = 10;

    console.log(`  Creating ${concurrentCount} invoices concurrently...`);

    // Create multiple invoices simultaneously
    const createPromises = [];
    for (let i = 0; i < concurrentCount; i++) {
        const promise = (async () => {
            const invoice = new Invoice({
                firmId: testFirmId,
                lawyerId: new mongoose.Types.ObjectId(),
                clientId: new mongoose.Types.ObjectId(),
                dueDate: new Date(),
                items: [{
                    description: `Concurrent test item ${i}`,
                    quantity: 1,
                    unitPrice: 100
                }]
            });
            await invoice.save();
            return invoice.invoiceNumber;
        })();
        createPromises.push(promise);
    }

    const invoiceNumbers = await Promise.all(createPromises);
    invoiceNumbers.sort();

    console.log('  Created invoice numbers:');
    invoiceNumbers.forEach(num => console.log(`    - ${num}`));

    // Check for duplicates
    const uniqueNumbers = new Set(invoiceNumbers);
    if (uniqueNumbers.size !== invoiceNumbers.length) {
        console.log('❌ FAIL: Duplicate invoice numbers detected!');
    } else {
        console.log('✅ PASS: All invoice numbers are unique');
    }

    // Check for gaps
    const sequences = invoiceNumbers.map(num => parseInt(num.split('-')[2]));
    const hasGaps = sequences.some((seq, idx) => idx > 0 && seq !== sequences[idx - 1] + 1);

    if (hasGaps) {
        console.log('❌ FAIL: Gaps detected in sequence');
    } else {
        console.log('✅ PASS: No gaps in sequence (atomic operation successful)');
    }

    // Cleanup
    await Invoice.deleteMany({ firmId: testFirmId });
}

// Test 3: Multi-tenant isolation (different firms should have separate sequences)
async function testMultiTenantIsolation() {
    console.log('\n🏢 Test 3: Multi-Tenant Isolation');
    console.log('─'.repeat(50));

    const firm1Id = new mongoose.Types.ObjectId();
    const firm2Id = new mongoose.Types.ObjectId();

    // Create invoices for firm 1
    const invoice1 = new Invoice({
        firmId: firm1Id,
        lawyerId: new mongoose.Types.ObjectId(),
        clientId: new mongoose.Types.ObjectId(),
        dueDate: new Date(),
        items: [{ description: 'Firm 1 Item', quantity: 1, unitPrice: 100 }]
    });
    await invoice1.save();

    // Create invoices for firm 2
    const invoice2 = new Invoice({
        firmId: firm2Id,
        lawyerId: new mongoose.Types.ObjectId(),
        clientId: new mongoose.Types.ObjectId(),
        dueDate: new Date(),
        items: [{ description: 'Firm 2 Item', quantity: 1, unitPrice: 100 }]
    });
    await invoice2.save();

    console.log(`  Firm 1 Invoice: ${invoice1.invoiceNumber}`);
    console.log(`  Firm 2 Invoice: ${invoice2.invoiceNumber}`);

    // Both should start from 000001 for their respective firms
    const firm1Seq = parseInt(invoice1.invoiceNumber.split('-')[2]);
    const firm2Seq = parseInt(invoice2.invoiceNumber.split('-')[2]);

    if (firm1Seq === 1 && firm2Seq === 1) {
        console.log('✅ PASS: Firms have separate sequence counters');
    } else {
        console.log('❌ FAIL: Firms are not properly isolated');
    }

    // Cleanup
    await Invoice.deleteMany({ firmId: { $in: [firm1Id, firm2Id] } });
}

// Test 4: Counter state inspection
async function inspectCounterState() {
    console.log('\n🔍 Test 4: Counter State Inspection');
    console.log('─'.repeat(50));

    const counters = await Counter.find({ _id: { $regex: /^invoice_/ } }).sort({ _id: 1 });

    if (counters.length === 0) {
        console.log('  No invoice counters found (clean state)');
    } else {
        console.log('  Active invoice counters:');
        counters.forEach(counter => {
            console.log(`    - ${counter._id}: ${counter.seq}`);
        });
    }
}

// Main test runner
async function runTests() {
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║  Atomic Invoice Numbering Test Suite          ║');
    console.log('╚════════════════════════════════════════════════╝');

    try {
        await connect();

        // Run tests
        await testSequentialCreation();
        await testConcurrentCreation();
        await testMultiTenantIsolation();
        await inspectCounterState();

        console.log('\n' + '═'.repeat(50));
        console.log('✅ All tests completed!');
        console.log('═'.repeat(50) + '\n');

    } catch (error) {
        console.error('\n❌ Test error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Disconnected from MongoDB\n');
    }
}

// Run if executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { runTests };
