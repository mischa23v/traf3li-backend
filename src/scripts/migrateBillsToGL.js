/**
 * Migrate Existing Bills to General Ledger
 *
 * Creates GL entries for existing bills and their payments.
 * Script is idempotent - running multiple times will skip already migrated entries.
 *
 * Usage: npm run migrate:bills
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Bill = require('../models/bill.model');
const BillPayment = require('../models/billPayment.model');
const GeneralLedger = require('../models/generalLedger.model');
const Account = require('../models/account.model');
const { toHalalas } = require('../utils/currency');

// Connect to database
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            maxPoolSize: 10,
            minPoolSize: 2
        });
        console.log('MongoDB connected for migration...');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

/**
 * Migrate bills to GL
 */
const migrateBills = async () => {
    console.log('\n=== Starting Bill Migration ===\n');

    // Get default accounts
    const apAccount = await Account.findOne({ code: '2101' }); // Accounts Payable
    const expenseAccount = await Account.findOne({ code: '5200' }); // Operating Expenses
    const bankAccount = await Account.findOne({ code: '1102' }); // Bank Account - Main

    if (!apAccount || !expenseAccount || !bankAccount) {
        console.error('Required accounts not found. Please run seed:accounts first.');
        console.log('Missing accounts:');
        if (!apAccount) console.log('  - 2101 (Accounts Payable)');
        if (!expenseAccount) console.log('  - 5200 (Operating Expenses)');
        if (!bankAccount) console.log('  - 1102 (Bank Account - Main)');
        process.exit(1);
    }

    // Get all bills that are not drafts
    const bills = await Bill.find({
        status: { $ne: 'draft' }
    }).sort({ billDate: 1 });

    console.log(`Found ${bills.length} bills to process`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const bill of bills) {
        try {
            // Check if already migrated (has GL entries)
            const existingEntry = await GeneralLedger.findOne({
                referenceId: bill._id,
                referenceModel: 'Bill',
                status: { $ne: 'void' }
            });

            if (existingEntry) {
                console.log(`⏭️  Bill ${bill.billNumber} already migrated, skipping`);
                skippedCount++;
                continue;
            }

            // Convert amount to halalas
            const totalAmount = Number.isInteger(bill.totalAmount)
                ? bill.totalAmount
                : toHalalas(bill.totalAmount);

            if (totalAmount <= 0) {
                console.log(`⏭️  Bill ${bill.billNumber} has zero amount, skipping`);
                skippedCount++;
                continue;
            }

            // Start transaction
            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                const glEntries = [];

                // Create GL entries for bill items
                // For migration, we'll create one entry per bill (not per item)
                // DR Expense, CR A/P
                const billGLEntry = await GeneralLedger.postTransaction({
                    transactionDate: bill.billDate || bill.createdAt,
                    description: `Bill ${bill.billNumber} (migrated)`,
                    descriptionAr: `فاتورة مورد ${bill.billNumber} (مهاجرة)`,
                    debitAccountId: expenseAccount._id,
                    creditAccountId: apAccount._id,
                    amount: totalAmount,
                    referenceId: bill._id,
                    referenceModel: 'Bill',
                    referenceNumber: bill.billNumber,
                    caseId: bill.caseId,
                    lawyerId: bill.lawyerId,
                    meta: {
                        migratedAt: new Date(),
                        vendorId: bill.vendorId,
                        subtotal: bill.subtotal,
                        taxAmount: bill.taxAmount,
                        totalAmount: bill.totalAmount,
                        itemCount: bill.items?.length || 0
                    },
                    createdBy: bill.lawyerId
                }, session);

                glEntries.push(billGLEntry._id);

                // Update bill with GL entry and account references
                bill.glEntries = glEntries;
                bill.payableAccountId = apAccount._id;
                await bill.save({ session });

                // Migrate payments for this bill
                if (bill.amountPaid && bill.amountPaid > 0) {
                    const billPayments = await BillPayment.find({
                        billId: bill._id,
                        status: { $ne: 'cancelled' }
                    });

                    for (const payment of billPayments) {
                        // Check if payment already has GL entry
                        const existingPaymentEntry = await GeneralLedger.findOne({
                            referenceId: payment._id,
                            referenceModel: 'BillPayment',
                            status: { $ne: 'void' }
                        });

                        if (existingPaymentEntry) continue;

                        const paymentAmount = Number.isInteger(payment.amount)
                            ? payment.amount
                            : toHalalas(payment.amount);

                        if (paymentAmount <= 0) continue;

                        // Create GL entry for payment: DR A/P, CR Bank
                        const paymentGLEntry = await GeneralLedger.postTransaction({
                            transactionDate: payment.paymentDate || payment.createdAt,
                            description: `Bill Payment ${payment.paymentNumber || payment._id} for ${bill.billNumber} (migrated)`,
                            descriptionAr: `دفعة فاتورة مورد ${bill.billNumber} (مهاجرة)`,
                            debitAccountId: apAccount._id,
                            creditAccountId: bankAccount._id,
                            amount: paymentAmount,
                            referenceId: payment._id,
                            referenceModel: 'BillPayment',
                            referenceNumber: payment.paymentNumber,
                            caseId: bill.caseId,
                            lawyerId: bill.lawyerId,
                            meta: {
                                migratedAt: new Date(),
                                billId: bill._id,
                                billNumber: bill.billNumber,
                                vendorId: bill.vendorId
                            },
                            createdBy: payment.createdBy || bill.lawyerId
                        }, session);

                        // Update payment with GL entry
                        payment.glEntryId = paymentGLEntry._id;
                        payment.bankAccountId = bankAccount._id;
                        await payment.save({ session });
                    }
                }

                await session.commitTransaction();
                console.log(`✅ Migrated bill ${bill.billNumber}`);
                migratedCount++;
            } catch (error) {
                await session.abortTransaction();
                throw error;
            } finally {
                session.endSession();
            }
        } catch (error) {
            console.error(`❌ Error migrating bill ${bill.billNumber}:`, error.message);
            errorCount++;
        }
    }

    console.log('\n=== Bill Migration Complete ===');
    console.log(`Total bills: ${bills.length}`);
    console.log(`Migrated: ${migratedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
};

/**
 * Main execution
 */
const main = async () => {
    try {
        await connectDB();
        await migrateBills();
        console.log('\nMigration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

main();
