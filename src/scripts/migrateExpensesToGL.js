/**
 * Migrate Existing Expenses to General Ledger
 *
 * Creates GL entries for approved/paid expenses.
 * Script is idempotent - running multiple times will skip already migrated entries.
 *
 * Usage: npm run migrate:expenses
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Expense = require('../models/expense.model');
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

// Category to account code mapping
const categoryAccountMap = {
    'office_supplies': '5203',
    'travel': '5300',
    'transport': '5301',
    'meals': '5303',
    'software': '5204',
    'equipment': '1201',
    'communication': '5210',
    'government_fees': '5401',
    'professional_services': '5400',
    'marketing': '5206',
    'training': '5205',
    'office': '5203',
    'hospitality': '5303',
    'government': '5401',
    'court_fees': '5401',
    'filing_fees': '5402',
    'expert_witness': '5403',
    'investigation': '5400',
    'accommodation': '5302',
    'postage': '5211',
    'printing': '5203',
    'consultation': '5400',
    'documents': '5203',
    'research': '5205',
    'telephone': '5210',
    'mileage': '5301',
    'other': '5600'
};

/**
 * Migrate expenses to GL
 */
const migrateExpenses = async () => {
    console.log('\n=== Starting Expense Migration ===\n');

    // Get default accounts
    const bankAccount = await Account.findOne({ code: '1102' }); // Bank Account - Main
    const cashAccount = await Account.findOne({ code: '1101' }); // Cash on Hand
    const defaultExpenseAccount = await Account.findOne({ code: '5600' }); // Other Expenses

    if (!bankAccount || !cashAccount || !defaultExpenseAccount) {
        console.error('Required accounts not found. Please run seed:accounts first.');
        console.log('Missing accounts:');
        if (!bankAccount) console.log('  - 1102 (Bank Account - Main)');
        if (!cashAccount) console.log('  - 1101 (Cash on Hand)');
        if (!defaultExpenseAccount) console.log('  - 5600 (Other Expenses)');
        process.exit(1);
    }

    // Pre-load expense accounts
    const expenseAccounts = {};
    for (const [category, code] of Object.entries(categoryAccountMap)) {
        const account = await Account.findOne({ code });
        if (account) {
            expenseAccounts[category] = account;
        }
    }

    // Get all approved expenses
    const expenses = await Expense.find({
        status: 'approved'
    }).sort({ date: 1 });

    console.log(`Found ${expenses.length} approved expenses to process`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const expense of expenses) {
        try {
            // Check if already migrated (has GL entry)
            if (expense.glEntryId) {
                console.log(`⏭️  Expense ${expense.expenseId} already migrated, skipping`);
                skippedCount++;
                continue;
            }

            const existingEntry = await GeneralLedger.findOne({
                referenceId: expense._id,
                referenceModel: 'Expense',
                status: { $ne: 'void' }
            });

            if (existingEntry) {
                console.log(`⏭️  Expense ${expense.expenseId} already has GL entry, skipping`);
                skippedCount++;
                continue;
            }

            // Convert amount to halalas
            const amount = Number.isInteger(expense.amount)
                ? expense.amount
                : toHalalas(expense.amount);

            if (amount <= 0) {
                console.log(`⏭️  Expense ${expense.expenseId} has zero amount, skipping`);
                skippedCount++;
                continue;
            }

            // Determine expense account based on category
            let expenseAccountId;
            if (expenseAccounts[expense.category]) {
                expenseAccountId = expenseAccounts[expense.category]._id;
            } else {
                expenseAccountId = defaultExpenseAccount._id;
            }

            // Determine payment account based on payment method
            let paymentAccountId;
            if (['cash', 'petty_cash'].includes(expense.paymentMethod)) {
                paymentAccountId = cashAccount._id;
            } else {
                paymentAccountId = bankAccount._id;
            }

            // Start transaction
            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                // Create GL entry: DR Expense, CR Bank/Cash
                const glEntry = await GeneralLedger.postTransaction({
                    transactionDate: expense.date || expense.createdAt,
                    description: `Expense ${expense.expenseId} - ${expense.description} (migrated)`,
                    descriptionAr: `مصروف ${expense.expenseId} (مهاجر)`,
                    debitAccountId: expenseAccountId,
                    creditAccountId: paymentAccountId,
                    amount,
                    referenceId: expense._id,
                    referenceModel: 'Expense',
                    referenceNumber: expense.expenseId,
                    caseId: expense.caseId,
                    clientId: expense.clientId,
                    lawyerId: expense.lawyerId,
                    meta: {
                        migratedAt: new Date(),
                        category: expense.category,
                        vendor: expense.vendor,
                        receiptNumber: expense.receiptNumber,
                        isBillable: expense.isBillable,
                        expenseType: expense.expenseType
                    },
                    createdBy: expense.approvedBy || expense.lawyerId
                }, session);

                // Update expense with GL entry and account references
                expense.glEntryId = glEntry._id;
                expense.expenseAccountId = expenseAccountId;
                expense.bankAccountId = paymentAccountId;
                await expense.save({ session });

                await session.commitTransaction();
                console.log(`✅ Migrated expense ${expense.expenseId}`);
                migratedCount++;
            } catch (error) {
                await session.abortTransaction();
                throw error;
            } finally {
                session.endSession();
            }
        } catch (error) {
            console.error(`❌ Error migrating expense ${expense.expenseId}:`, error.message);
            errorCount++;
        }
    }

    console.log('\n=== Expense Migration Complete ===');
    console.log(`Total expenses: ${expenses.length}`);
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
        await migrateExpenses();
        console.log('\nMigration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

main();
