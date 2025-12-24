/**
 * Recurring Invoice Job Scheduler
 *
 * Automated tasks:
 * - Every 15 minutes: Process due recurring invoices
 * - Daily at midnight: Send upcoming invoice notifications
 * - Daily at 1 AM: Clean up cancelled recurring invoices with no history
 */

const cron = require('node-cron');
const RecurringInvoice = require('../models/recurringInvoice.model');
const Invoice = require('../models/invoice.model');
const Notification = require('../models/notification.model');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Track running jobs
let jobsRunning = {
    generateInvoices: false,
    sendNotifications: false,
    cleanup: false
};

/**
 * Generate invoices from recurring templates
 * Runs every 15 minutes to check for invoices due for generation
 */
const generateRecurringInvoices = async () => {
    if (jobsRunning.generateInvoices) {
        logger.info('[Recurring Invoice Jobs] Invoice generation job still running, skipping...');
        return;
    }

    jobsRunning.generateInvoices = true;

    try {
        const now = new Date();
        logger.info(`[Recurring Invoice Jobs] Checking for due recurring invoices at ${now.toISOString()}`);

        // Find all recurring invoices due for generation
        const dueRecurringInvoices = await RecurringInvoice.getDueForGeneration();

        if (dueRecurringInvoices.length === 0) {
            logger.info('[Recurring Invoice Jobs] No recurring invoices due for generation');
            return;
        }

        logger.info(`[Recurring Invoice Jobs] Found ${dueRecurringInvoices.length} recurring invoices to process`);

        let generated = 0;
        let failed = 0;
        let paused = 0;

        for (const recurring of dueRecurringInvoices) {
            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                // Check end conditions
                if (recurring.schedule.endDate && now > recurring.schedule.endDate) {
                    recurring.status = 'completed';
                    await recurring.save({ session });
                    logger.info(`[Recurring Invoice Jobs] Recurring invoice ${recurring._id} completed (end date reached)`);
                    await session.commitTransaction();
                    continue;
                }

                if (recurring.schedule.maxOccurrences && recurring.generatedCount >= recurring.schedule.maxOccurrences) {
                    recurring.status = 'completed';
                    await recurring.save({ session });
                    logger.info(`[Recurring Invoice Jobs] Recurring invoice ${recurring._id} completed (max occurrences reached)`);
                    await session.commitTransaction();
                    continue;
                }

                // Generate invoice
                const invoice = await createInvoiceFromRecurring(recurring, session);

                // Update recurring invoice
                recurring.lastGeneratedDate = now;
                recurring.generatedCount += 1;
                recurring.generatedInvoices.push({
                    invoiceId: invoice._id,
                    invoiceNumber: invoice.invoiceNumber,
                    generatedAt: now,
                    amount: invoice.total.total,
                    status: invoice.status
                });

                // Calculate next generation date
                recurring.nextGenerationDate = recurring.calculateNextGenerationDate();

                // Check if this was the last occurrence
                if (recurring.schedule.maxOccurrences && recurring.generatedCount >= recurring.schedule.maxOccurrences) {
                    recurring.status = 'completed';
                }

                await recurring.save({ session });
                await session.commitTransaction();

                generated++;
                logger.info(`[Recurring Invoice Jobs] Generated invoice ${invoice.invoiceNumber} from recurring ${recurring.name}`);

                // Send notification
                await sendInvoiceGeneratedNotification(recurring, invoice);

            } catch (error) {
                await session.abortTransaction();
                logger.error(`[Recurring Invoice Jobs] Failed to generate invoice for ${recurring._id}:`, error.message);

                // Increment failure count
                recurring.failureCount = (recurring.failureCount || 0) + 1;
                recurring.lastFailureReason = error.message;

                // Pause if too many failures
                if (recurring.failureCount >= 3) {
                    recurring.status = 'paused';
                    paused++;
                    logger.info(`[Recurring Invoice Jobs] Paused recurring invoice ${recurring._id} after 3 failures`);
                }

                await recurring.save();
                failed++;
            } finally {
                session.endSession();
            }
        }

        logger.info(`[Recurring Invoice Jobs] Generation complete: ${generated} generated, ${failed} failed, ${paused} paused`);

    } catch (error) {
        logger.error('[Recurring Invoice Jobs] Invoice generation job error:', error);
    } finally {
        jobsRunning.generateInvoices = false;
    }
};

/**
 * Create invoice from recurring template
 */
const createInvoiceFromRecurring = async (recurring, session) => {
    const now = new Date();

    // Calculate due date based on payment terms
    let dueDate = new Date(now);
    if (recurring.paymentTerms === 'net_7') {
        dueDate.setDate(dueDate.getDate() + 7);
    } else if (recurring.paymentTerms === 'net_14') {
        dueDate.setDate(dueDate.getDate() + 14);
    } else if (recurring.paymentTerms === 'net_30') {
        dueDate.setDate(dueDate.getDate() + 30);
    } else if (recurring.paymentTerms === 'net_45') {
        dueDate.setDate(dueDate.getDate() + 45);
    } else if (recurring.paymentTerms === 'net_60') {
        dueDate.setDate(dueDate.getDate() + 60);
    } else if (recurring.paymentTerms === 'net_90') {
        dueDate.setDate(dueDate.getDate() + 90);
    }
    // due_on_receipt: dueDate stays as today

    // Create invoice (invoiceNumber will be auto-generated by model's pre-save hook)
    const invoice = new Invoice({
        firmId: recurring.firmId,
        lawyerId: recurring.lawyerId,
        // invoiceNumber will be auto-generated using atomic counter
        clientId: recurring.clientId,
        caseId: recurring.caseId,
        issueDate: now,
        dueDate,
        items: recurring.items.map(item => ({
            description: item.description,
            type: item.type,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate || 15,
            amount: item.quantity * item.unitPrice,
            taxAmount: Math.round((item.quantity * item.unitPrice * (item.taxRate || 15)) / 100)
        })),
        subtotal: recurring.subtotal,
        taxAmount: recurring.taxAmount,
        total: recurring.total,
        status: recurring.settings?.autoSend ? 'sent' : 'draft',
        currency: recurring.currency || 'SAR',
        notes: recurring.notes,
        terms: recurring.termsAndConditions,
        recurringInvoiceId: recurring._id,
        createdBy: recurring.createdBy
    });

    await invoice.save({ session });

    return invoice;
};

/**
 * Send notification when invoice is generated
 */
const sendInvoiceGeneratedNotification = async (recurring, invoice) => {
    try {
        await Notification.create({
            firmId: recurring.firmId,
            userId: recurring.createdBy,
            type: 'invoice',
            title: 'Recurring Invoice Generated',
            titleAr: 'تم إنشاء فاتورة متكررة',
            message: `Invoice ${invoice.invoiceNumber} has been automatically generated from "${recurring.name}"`,
            messageAr: `تم إنشاء الفاتورة ${invoice.invoiceNumber} تلقائياً من "${recurring.name}"`,
            link: `/invoices/${invoice._id}`,
            data: {
                invoiceId: invoice._id,
                recurringInvoiceId: recurring._id,
                amount: invoice.total
            }
        });
    } catch (error) {
        logger.error('[Recurring Invoice Jobs] Failed to send notification:', error.message);
    }
};

/**
 * Send notifications for upcoming recurring invoices
 * Runs daily at midnight
 */
const sendUpcomingNotifications = async () => {
    if (jobsRunning.sendNotifications) {
        logger.info('[Recurring Invoice Jobs] Notification job still running, skipping...');
        return;
    }

    jobsRunning.sendNotifications = true;

    try {
        logger.info('[Recurring Invoice Jobs] Checking for upcoming recurring invoices...');

        // Find recurring invoices that will generate in the next 3 days
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        const upcomingRecurring = await RecurringInvoice.find({
            status: 'active',
            'settings.notifyBeforeGeneration': true,
            nextGenerationDate: {
                $gte: new Date(),
                $lte: threeDaysFromNow
            }
        });

        if (upcomingRecurring.length === 0) {
            logger.info('[Recurring Invoice Jobs] No upcoming notifications to send');
            return;
        }

        logger.info(`[Recurring Invoice Jobs] Sending notifications for ${upcomingRecurring.length} upcoming invoices`);

        for (const recurring of upcomingRecurring) {
            try {
                const daysUntil = Math.ceil(
                    (recurring.nextGenerationDate - new Date()) / (1000 * 60 * 60 * 24)
                );

                await Notification.create({
                    firmId: recurring.firmId,
                    userId: recurring.createdBy,
                    type: 'invoice',
                    title: 'Upcoming Recurring Invoice',
                    titleAr: 'فاتورة متكررة قادمة',
                    message: `"${recurring.name}" will generate an invoice in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`,
                    messageAr: `"${recurring.name}" ستنشئ فاتورة خلال ${daysUntil} يوم`,
                    link: `/recurring-invoices/${recurring._id}`,
                    data: {
                        recurringInvoiceId: recurring._id,
                        nextGenerationDate: recurring.nextGenerationDate
                    }
                });
            } catch (error) {
                logger.error(`[Recurring Invoice Jobs] Failed to send notification for ${recurring._id}:`, error.message);
            }
        }

        logger.info('[Recurring Invoice Jobs] Upcoming notifications sent');

    } catch (error) {
        logger.error('[Recurring Invoice Jobs] Notification job error:', error);
    } finally {
        jobsRunning.sendNotifications = false;
    }
};

/**
 * Cleanup cancelled recurring invoices with no generated invoices
 * Runs daily at 1 AM
 */
const cleanupCancelledRecurring = async () => {
    if (jobsRunning.cleanup) {
        logger.info('[Recurring Invoice Jobs] Cleanup job still running, skipping...');
        return;
    }

    jobsRunning.cleanup = true;

    try {
        logger.info('[Recurring Invoice Jobs] Running cleanup...');

        // Delete cancelled recurring invoices with no generated invoices that are older than 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const result = await RecurringInvoice.deleteMany({
            status: 'cancelled',
            generatedCount: 0,
            createdAt: { $lt: thirtyDaysAgo }
        });

        if (result.deletedCount > 0) {
            logger.info(`[Recurring Invoice Jobs] Deleted ${result.deletedCount} cancelled recurring invoices`);
        } else {
            logger.info('[Recurring Invoice Jobs] No recurring invoices to clean up');
        }

        logger.info('[Recurring Invoice Jobs] Cleanup complete');

    } catch (error) {
        logger.error('[Recurring Invoice Jobs] Cleanup job error:', error);
    } finally {
        jobsRunning.cleanup = false;
    }
};

/**
 * Start all recurring invoice jobs
 */
function startRecurringInvoiceJobs() {
    logger.info('[Recurring Invoice Jobs] Starting recurring invoice job scheduler...');

    // Every 15 minutes: Generate due invoices
    cron.schedule('*/15 * * * *', () => {
        generateRecurringInvoices();
    });
    logger.info('[Recurring Invoice Jobs] ✓ Invoice generation job: every 15 minutes');

    // Daily at midnight: Send upcoming notifications
    cron.schedule('0 0 * * *', () => {
        sendUpcomingNotifications();
    });
    logger.info('[Recurring Invoice Jobs] ✓ Upcoming notifications job: daily at midnight');

    // Daily at 1 AM: Cleanup
    cron.schedule('0 1 * * *', () => {
        cleanupCancelledRecurring();
    });
    logger.info('[Recurring Invoice Jobs] ✓ Cleanup job: daily at 1:00 AM');

    logger.info('[Recurring Invoice Jobs] All recurring invoice jobs started successfully');
}

/**
 * Stop all jobs (for graceful shutdown)
 */
function stopRecurringInvoiceJobs() {
    logger.info('[Recurring Invoice Jobs] Stopping recurring invoice jobs...');
    // Jobs will stop automatically when process exits
}

/**
 * Manually trigger a specific job (for testing/admin)
 */
async function triggerJob(jobName) {
    logger.info(`[Recurring Invoice Jobs] Manually triggering ${jobName}...`);

    switch (jobName) {
        case 'generateInvoices':
            await generateRecurringInvoices();
            break;
        case 'sendNotifications':
            await sendUpcomingNotifications();
            break;
        case 'cleanup':
            await cleanupCancelledRecurring();
            break;
        default:
            throw new Error(`Unknown job: ${jobName}`);
    }

    logger.info(`[Recurring Invoice Jobs] ${jobName} completed`);
}

/**
 * Get job status
 */
function getJobStatus() {
    return {
        jobs: {
            generateInvoices: {
                running: jobsRunning.generateInvoices,
                schedule: 'Every 15 minutes'
            },
            sendNotifications: {
                running: jobsRunning.sendNotifications,
                schedule: 'Daily at midnight'
            },
            cleanup: {
                running: jobsRunning.cleanup,
                schedule: 'Daily at 1:00 AM'
            }
        }
    };
}

module.exports = {
    startRecurringInvoiceJobs,
    stopRecurringInvoiceJobs,
    triggerJob,
    getJobStatus,
    // Export individual functions for testing
    generateRecurringInvoices,
    sendUpcomingNotifications,
    cleanupCancelledRecurring
};
