/**
 * Migrate Existing Invoices to General Ledger
 *
 * Creates GL entries for existing invoices and their payments.
 * Script is idempotent - running multiple times will skip already migrated entries.
 *
 * Usage: npm run migrate:invoices
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Invoice = require('../models/invoice.model');
const Payment = require('../models/payment.model');
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
 * Migrate invoices to GL
 */
const migrateInvoices = async () => {
    console.log('\n=== Starting Invoice Migration ===\n');

    // Get default accounts
    const arAccount = await Account.findOne({ code: '1110' }); // Accounts Receivable
    const incomeAccount = await Account.findOne({ code: '4100' }); // Legal Service Fees
    const bankAccount = await Account.findOne({ code: '1102' }); // Bank Account - Main

    if (!arAccount || !incomeAccount || !bankAccount) {
        console.error('Required accounts not found. Please run seed:accounts first.');
        console.log('Missing accounts:');
        if (!arAccount) console.log('  - 1110 (Accounts Receivable)');
        if (!incomeAccount) console.log('  - 4100 (Legal Service Fees)');
        if (!bankAccount) console.log('  - 1102 (Bank Account - Main)');
        process.exit(1);
    }

    // Get all invoices that are not drafts
    const invoices = await Invoice.find({
        status: { $ne: 'draft' }
    }).sort({ issueDate: 1 });

    console.log(`Found ${invoices.length} invoices to process`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const invoice of invoices) {
        try {
            // Check if already migrated (has GL entries)
            const existingEntry = await GeneralLedger.findOne({
                referenceId: invoice._id,
                referenceModel: 'Invoice',
                status: { $ne: 'void' }
            });

            if (existingEntry) {
                console.log(`⏭️  Invoice ${invoice.invoiceNumber} already migrated, skipping`);
                skippedCount++;
                continue;
            }

            // Convert amount to halalas
            const amount = Number.isInteger(invoice.totalAmount)
                ? invoice.totalAmount
                : toHalalas(invoice.totalAmount);

            if (amount <= 0) {
                console.log(`⏭️  Invoice ${invoice.invoiceNumber} has zero amount, skipping`);
                skippedCount++;
                continue;
            }

            // Start transaction
            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                // Create GL entry for invoice: DR A/R, CR Income
                const invoiceGLEntry = await GeneralLedger.postTransaction({
                    transactionDate: invoice.issueDate || invoice.createdAt,
                    description: `Invoice ${invoice.invoiceNumber} (migrated)`,
                    descriptionAr: `فاتورة ${invoice.invoiceNumber} (مهاجرة)`,
                    debitAccountId: arAccount._id,
                    creditAccountId: incomeAccount._id,
                    amount,
                    referenceId: invoice._id,
                    referenceModel: 'Invoice',
                    referenceNumber: invoice.invoiceNumber,
                    caseId: invoice.caseId,
                    clientId: invoice.clientId,
                    lawyerId: invoice.lawyerId,
                    meta: {
                        migratedAt: new Date(),
                        subtotal: invoice.subtotal,
                        vatAmount: invoice.vatAmount,
                        totalAmount: invoice.totalAmount
                    },
                    createdBy: invoice.lawyerId
                }, session);

                // Update invoice with GL entry and account references
                invoice.glEntries = [invoiceGLEntry._id];
                invoice.receivableAccountId = arAccount._id;
                invoice.incomeAccountId = incomeAccount._id;
                await invoice.save({ session });

                // Migrate payments for this invoice
                if (invoice.amountPaid && invoice.amountPaid > 0) {
                    const payments = await Payment.find({
                        invoiceId: invoice._id,
                        status: 'completed'
                    });

                    for (const payment of payments) {
                        // Check if payment already has GL entry
                        if (payment.glEntryId) continue;

                        const paymentAmount = Number.isInteger(payment.amount)
                            ? payment.amount
                            : toHalalas(payment.amount);

                        if (paymentAmount <= 0) continue;

                        // Create GL entry for payment: DR Bank, CR A/R
                        const paymentGLEntry = await GeneralLedger.postTransaction({
                            transactionDate: payment.paymentDate || payment.createdAt,
                            description: `Payment ${payment.paymentNumber} for Invoice ${invoice.invoiceNumber} (migrated)`,
                            descriptionAr: `دفعة ${payment.paymentNumber} للفاتورة ${invoice.invoiceNumber} (مهاجرة)`,
                            debitAccountId: bankAccount._id,
                            creditAccountId: arAccount._id,
                            amount: paymentAmount,
                            referenceId: payment._id,
                            referenceModel: 'Payment',
                            referenceNumber: payment.paymentNumber,
                            caseId: invoice.caseId,
                            clientId: invoice.clientId,
                            lawyerId: invoice.lawyerId,
                            meta: {
                                migratedAt: new Date(),
                                invoiceId: invoice._id,
                                invoiceNumber: invoice.invoiceNumber
                            },
                            createdBy: payment.createdBy || invoice.lawyerId
                        }, session);

                        // Update payment with GL entry
                        payment.glEntryId = paymentGLEntry._id;
                        payment.bankAccountId = bankAccount._id;
                        payment.receivableAccountId = arAccount._id;
                        await payment.save({ session });
                    }
                }

                await session.commitTransaction();
                console.log(`✅ Migrated invoice ${invoice.invoiceNumber}`);
                migratedCount++;
            } catch (error) {
                await session.abortTransaction();
                throw error;
            } finally {
                session.endSession();
            }
        } catch (error) {
            console.error(`❌ Error migrating invoice ${invoice.invoiceNumber}:`, error.message);
            errorCount++;
        }
    }

    console.log('\n=== Invoice Migration Complete ===');
    console.log(`Total invoices: ${invoices.length}`);
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
        await migrateInvoices();
        console.log('\nMigration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

main();
