/**
 * Migration: Add ERPNext Parity Fields
 *
 * This migration adds default values for new ERPNext parity fields:
 * - Invoice: isReturn, isDebitNote, outstandingAmount, totalAdvanceAllocated
 * - Payment: partyType, totalDeductions, allocatedAmount
 * - Expense: approvalStatus, isPaid, totalAdvanceAllocated
 * - TimeEntry: isCompleted, billingHours, costingAmount
 *
 * Run with: node src/migrations/add-erpnext-parity-fields.js
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

const migrateERPNextParityFields = async () => {
    console.log('Starting ERPNext Parity fields migration...\n');

    const Invoice = require('../models/invoice.model');
    const Payment = require('../models/payment.model');
    const Expense = require('../models/expense.model');
    const TimeEntry = require('../models/timeEntry.model');

    let totalUpdated = 0;

    // ═══════════════════════════════════════════════════════════════
    // 1. INVOICE MIGRATIONS
    // ═══════════════════════════════════════════════════════════════
    console.log('1. Migrating Invoice fields...');

    // Set default isReturn = false for existing invoices
    const invoiceReturnResult = await Invoice.updateMany(
        { isReturn: { $exists: false } },
        { $set: { isReturn: false, isDebitNote: false } }
    );
    console.log(`   Set isReturn=false, isDebitNote=false for ${invoiceReturnResult.modifiedCount} invoices`);
    totalUpdated += invoiceReturnResult.modifiedCount;

    // Initialize outstandingAmount based on current balanceDue
    const invoicesWithoutOutstanding = await Invoice.find({
        outstandingAmount: { $exists: false }
    }).select('_id balanceDue totalAmount paidAmount').lean();

    let outstandingUpdated = 0;
    for (const inv of invoicesWithoutOutstanding) {
        const outstandingAmount = inv.balanceDue || (inv.totalAmount - (inv.paidAmount || 0));
        await Invoice.updateOne(
            { _id: inv._id },
            { $set: { outstandingAmount, totalAdvanceAllocated: 0 } }
        );
        outstandingUpdated++;
    }
    console.log(`   Initialized outstandingAmount for ${outstandingUpdated} invoices`);
    totalUpdated += outstandingUpdated;

    // Initialize empty arrays for new array fields
    const invoiceArrayResult = await Invoice.updateMany(
        { $or: [
            { salesTeam: { $exists: false } },
            { advances: { $exists: false } }
        ]},
        { $set: {
            salesTeam: [],
            advances: []
        }}
    );
    console.log(`   Initialized salesTeam[] and advances[] for ${invoiceArrayResult.modifiedCount} invoices`);

    // ═══════════════════════════════════════════════════════════════
    // 2. PAYMENT MIGRATIONS
    // ═══════════════════════════════════════════════════════════════
    console.log('\n2. Migrating Payment fields...');

    // Set default partyType based on existing paymentType
    const payments = await Payment.find({
        partyType: { $exists: false }
    }).select('_id paymentType type').lean();

    let paymentPartyUpdated = 0;
    for (const pmt of payments) {
        let partyType = 'customer';
        if (pmt.paymentType === 'vendor' || pmt.type === 'expense') {
            partyType = 'supplier';
        } else if (pmt.paymentType === 'employee' || pmt.type === 'employee') {
            partyType = 'employee';
        }

        await Payment.updateOne(
            { _id: pmt._id },
            { $set: {
                partyType,
                totalDeductions: 0,
                deductions: [],
                allocatedAmount: pmt.amount || 0
            }}
        );
        paymentPartyUpdated++;
    }
    console.log(`   Set partyType for ${paymentPartyUpdated} payments`);
    totalUpdated += paymentPartyUpdated;

    // Initialize netAmountAfterDeductions to match amount
    const paymentNetResult = await Payment.updateMany(
        { netAmountAfterDeductions: { $exists: false } },
        [{ $set: { netAmountAfterDeductions: '$amount' } }]
    );
    console.log(`   Initialized netAmountAfterDeductions for ${paymentNetResult.modifiedCount} payments`);

    // ═══════════════════════════════════════════════════════════════
    // 3. EXPENSE MIGRATIONS
    // ═══════════════════════════════════════════════════════════════
    console.log('\n3. Migrating Expense fields...');

    // Set approvalStatus based on existing status
    const expenses = await Expense.find({
        approvalStatus: { $exists: false }
    }).select('_id status isReimbursed').lean();

    let expenseApprovalUpdated = 0;
    for (const exp of expenses) {
        let approvalStatus = 'draft';
        if (exp.status === 'approved' || exp.status === 'reimbursed') {
            approvalStatus = 'approved';
        } else if (exp.status === 'rejected') {
            approvalStatus = 'rejected';
        } else if (exp.status === 'submitted' || exp.status === 'pending') {
            approvalStatus = 'pending';
        }

        await Expense.updateOne(
            { _id: exp._id },
            { $set: {
                approvalStatus,
                isPaid: exp.isReimbursed || false,
                totalAdvanceAllocated: 0,
                totalReturnAmount: 0,
                advances: []
            }}
        );
        expenseApprovalUpdated++;
    }
    console.log(`   Set approvalStatus for ${expenseApprovalUpdated} expenses`);
    totalUpdated += expenseApprovalUpdated;

    // Set sanctionedAmount to match totalAmount where not set
    const expenseSanctionedResult = await Expense.updateMany(
        { sanctionedAmount: { $exists: false } },
        [{ $set: { sanctionedAmount: '$totalAmount' } }]
    );
    console.log(`   Initialized sanctionedAmount for ${expenseSanctionedResult.modifiedCount} expenses`);

    // ═══════════════════════════════════════════════════════════════
    // 4. TIME ENTRY MIGRATIONS
    // ═══════════════════════════════════════════════════════════════
    console.log('\n4. Migrating TimeEntry fields...');

    // Set isCompleted based on status
    const timeEntries = await TimeEntry.find({
        isCompleted: { $exists: false }
    }).select('_id status billStatus duration hourlyRate billedHours').lean();

    let timeEntryUpdated = 0;
    for (const te of timeEntries) {
        // Calculate billingHours from duration (duration is in minutes)
        const durationMinutes = te.duration || 0;
        const billingHours = Math.floor(durationMinutes / 60);
        const billingMinutes = durationMinutes % 60;

        // Calculate costing (assume costing rate = 70% of billing rate by default)
        const hourlyRate = te.hourlyRate || 0;
        const costingRate = Math.round(hourlyRate * 0.7);
        const costingAmount = Math.round((durationMinutes / 60) * costingRate);

        await TimeEntry.updateOne(
            { _id: te._id },
            { $set: {
                isCompleted: te.status === 'completed' || te.billStatus === 'billed',
                billingHours: te.billedHours || billingHours,
                billingMinutes: billingMinutes,
                isBillableOverride: false,
                costingRate,
                costingAmount,
                expectedHours: billingHours,
                expectedMinutes: billingMinutes
            }}
        );
        timeEntryUpdated++;
    }
    console.log(`   Updated ${timeEntryUpdated} time entries`);
    totalUpdated += timeEntryUpdated;

    // ═══════════════════════════════════════════════════════════════
    // 5. CREATE INDEXES
    // ═══════════════════════════════════════════════════════════════
    console.log('\n5. Ensuring indexes exist for new fields...');

    try {
        // Invoice indexes
        await Invoice.collection.createIndex({ isReturn: 1 });
        await Invoice.collection.createIndex({ returnAgainst: 1 });
        await Invoice.collection.createIndex({ 'salesTeam.salesPersonId': 1 });
        console.log('   Invoice indexes created/verified');

        // Payment indexes
        await Payment.collection.createIndex({ partyType: 1 });
        await Payment.collection.createIndex({ allocatedAmount: 1 });
        console.log('   Payment indexes created/verified');

        // Expense indexes
        await Expense.collection.createIndex({ approvalStatus: 1 });
        await Expense.collection.createIndex({ expenseApproverId: 1 });
        await Expense.collection.createIndex({ isPaid: 1 });
        console.log('   Expense indexes created/verified');

        // TimeEntry indexes
        await TimeEntry.collection.createIndex({ isCompleted: 1 });
        await TimeEntry.collection.createIndex({ salesInvoiceRef: 1 });
        await TimeEntry.collection.createIndex({ firmId: 1, isCompleted: 1, billStatus: 1 });
        console.log('   TimeEntry indexes created/verified');
    } catch (indexError) {
        console.log('   Some indexes may already exist:', indexError.message);
    }

    // ═══════════════════════════════════════════════════════════════
    // 6. SUMMARY STATS
    // ═══════════════════════════════════════════════════════════════
    console.log('\n6. Migration stats:');

    // Invoice stats
    const invoiceStats = {
        total: await Invoice.countDocuments({}),
        creditNotes: await Invoice.countDocuments({ isReturn: true }),
        withSalesTeam: await Invoice.countDocuments({ 'salesTeam.0': { $exists: true } }),
        withAdvances: await Invoice.countDocuments({ 'advances.0': { $exists: true } })
    };
    console.log('   Invoices:');
    console.log(`     - Total: ${invoiceStats.total}`);
    console.log(`     - Credit Notes (isReturn=true): ${invoiceStats.creditNotes}`);
    console.log(`     - With Sales Team: ${invoiceStats.withSalesTeam}`);
    console.log(`     - With Advances: ${invoiceStats.withAdvances}`);

    // Payment stats
    const paymentPartyTypes = await Payment.aggregate([
        { $group: { _id: '$partyType', count: { $sum: 1 } } }
    ]);
    console.log('   Payments by partyType:');
    for (const item of paymentPartyTypes) {
        console.log(`     - ${item._id || 'null'}: ${item.count}`);
    }

    // Expense stats
    const expenseApprovalStats = await Expense.aggregate([
        { $group: { _id: '$approvalStatus', count: { $sum: 1 } } }
    ]);
    console.log('   Expenses by approvalStatus:');
    for (const item of expenseApprovalStats) {
        console.log(`     - ${item._id || 'null'}: ${item.count}`);
    }

    // TimeEntry stats
    const timeEntryStats = {
        total: await TimeEntry.countDocuments({}),
        completed: await TimeEntry.countDocuments({ isCompleted: true }),
        billed: await TimeEntry.countDocuments({ billStatus: 'billed' })
    };
    console.log('   TimeEntries:');
    console.log(`     - Total: ${timeEntryStats.total}`);
    console.log(`     - Completed: ${timeEntryStats.completed}`);
    console.log(`     - Billed: ${timeEntryStats.billed}`);

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
        await migrateERPNextParityFields();
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
