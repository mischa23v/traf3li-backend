/**
 * Recurring Invoice Service - Automated Invoice Generation
 *
 * This service manages the complete recurring invoice automation workflow.
 * It implements scheduled invoice generation from recurring templates with
 * configurable frequency, notifications, and lifecycle management.
 *
 * Features:
 * - Automated invoice generation from recurring templates
 * - Flexible scheduling (daily, weekly, monthly, yearly, custom)
 * - End conditions (end date, max occurrences)
 * - Invoice generation history tracking
 * - Failure tracking and auto-pause
 * - Notification system for generated invoices
 * - Multi-tenant support with firm isolation
 */

const mongoose = require('mongoose');
const RecurringInvoice = require('../models/recurringInvoice.model');
const Invoice = require('../models/invoice.model');
const QueueService = require('./queue.service');
const AuditLog = require('../models/auditLog.model');
const logger = require('../utils/logger');

/**
 * Process all due recurring invoices for a firm
 * @param {String} firmId - Firm ID (optional, processes all if not provided)
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} - Processing results
 */
const processDueRecurringInvoices = async (firmId = null, options = {}) => {
    const { dryRun = false, maxRetries = 3 } = options;
    const startTime = Date.now();

    try {
        const now = new Date();
        logger.info(`${dryRun ? '[DRY RUN] ' : ''}Processing due recurring invoices${firmId ? ` for firm ${firmId}` : ''}...`);

        // Build query for due recurring invoices
        const query = {
            status: 'active',
            nextGenerationDate: { $lte: now }
        };

        if (firmId) {
            query.firmId = firmId;
        }

        const dueRecurringInvoices = await RecurringInvoice.find(query)
            .populate('clientId', 'name email phone')
            .populate('firmId', 'name')
            .populate('createdBy', 'firstName lastName email');

        if (dueRecurringInvoices.length === 0) {
            logger.info('[Recurring Invoice Service] No recurring invoices due for generation');
            return {
                success: true,
                processed: 0,
                generated: 0,
                failed: 0,
                paused: 0,
                completed: 0,
                details: []
            };
        }

        logger.info(`[Recurring Invoice Service] Found ${dueRecurringInvoices.length} recurring invoices to process`);

        const results = {
            success: true,
            processed: 0,
            generated: 0,
            failed: 0,
            paused: 0,
            completed: 0,
            details: []
        };

        // Process each recurring invoice
        for (const recurring of dueRecurringInvoices) {
            try {
                results.processed++;

                if (dryRun) {
                    logger.info(`[DRY RUN] Would process recurring invoice: ${recurring.name} (${recurring._id})`);
                    results.details.push({
                        recurringId: recurring._id,
                        name: recurring.name,
                        action: 'would_process',
                        dryRun: true
                    });
                    continue;
                }

                const result = await processRecurringInvoice(recurring, { maxRetries });

                if (result.success) {
                    if (result.action === 'generated') {
                        results.generated++;
                    } else if (result.action === 'completed') {
                        results.completed++;
                    }
                } else {
                    if (result.action === 'paused') {
                        results.paused++;
                    } else {
                        results.failed++;
                    }
                }

                results.details.push({
                    recurringId: recurring._id,
                    name: recurring.name,
                    action: result.action,
                    invoiceNumber: result.invoiceNumber,
                    message: result.message
                });

            } catch (error) {
                logger.error(`[Recurring Invoice Service] Error processing recurring invoice ${recurring._id}:`, error);
                results.failed++;
                results.details.push({
                    recurringId: recurring._id,
                    name: recurring.name,
                    action: 'error',
                    error: error.message
                });
            }
        }

        const duration = Date.now() - startTime;

        logger.info(`[Recurring Invoice Service] Processing complete in ${duration}ms`);
        logger.info(`[Recurring Invoice Service] Summary: ${results.generated} generated, ${results.completed} completed, ${results.failed} failed, ${results.paused} paused`);

        return {
            ...results,
            duration
        };

    } catch (error) {
        logger.error('[Recurring Invoice Service] Error in processDueRecurringInvoices:', error);
        throw error;
    }
};

/**
 * Process a single recurring invoice
 * @param {Object} recurring - Recurring invoice document
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} - Processing result
 */
const processRecurringInvoice = async (recurring, options = {}) => {
    const { maxRetries = 3 } = options;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const now = new Date();

        // Check end conditions first
        if (recurring.schedule.endDate && now > recurring.schedule.endDate) {
            recurring.status = 'completed';
            await recurring.save({ session });
            await session.commitTransaction();

            logger.info(`[Recurring Invoice Service] Recurring invoice ${recurring._id} completed (end date reached)`);

            await sendCompletionNotification(recurring, 'end_date');

            return {
                success: true,
                action: 'completed',
                reason: 'end_date_reached',
                message: 'Recurring invoice completed - end date reached'
            };
        }

        if (recurring.schedule.maxOccurrences && recurring.generatedCount >= recurring.schedule.maxOccurrences) {
            recurring.status = 'completed';
            await recurring.save({ session });
            await session.commitTransaction();

            logger.info(`[Recurring Invoice Service] Recurring invoice ${recurring._id} completed (max occurrences reached)`);

            await sendCompletionNotification(recurring, 'max_occurrences');

            return {
                success: true,
                action: 'completed',
                reason: 'max_occurrences_reached',
                message: 'Recurring invoice completed - max occurrences reached'
            };
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

        // Reset failure count on success
        recurring.failureCount = 0;
        recurring.lastFailureReason = null;

        // Calculate next generation date
        recurring.nextGenerationDate = recurring.calculateNextGenerationDate();

        // Check if this was the last occurrence
        if (recurring.schedule.maxOccurrences && recurring.generatedCount >= recurring.schedule.maxOccurrences) {
            recurring.status = 'completed';
        }

        await recurring.save({ session });
        await session.commitTransaction();

        logger.info(`[Recurring Invoice Service] Generated invoice ${invoice.invoiceNumber} from recurring ${recurring.name}`);

        // Send success notification
        await sendInvoiceGeneratedNotification(recurring, invoice);

        // Log to audit trail
        await logRecurringInvoiceAudit({
            action: 'recurring_invoice_generated',
            entityType: 'recurring_invoice',
            entityId: recurring._id,
            firmId: recurring.firmId,
            userId: recurring.createdBy,
            details: {
                recurringName: recurring.name,
                invoiceId: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                amount: invoice.total.total,
                generatedCount: recurring.generatedCount,
                nextGenerationDate: recurring.nextGenerationDate
            }
        });

        return {
            success: true,
            action: 'generated',
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            message: `Invoice ${invoice.invoiceNumber} generated successfully`
        };

    } catch (error) {
        await session.abortTransaction();
        logger.error(`[Recurring Invoice Service] Failed to generate invoice for ${recurring._id}:`, error.message);

        // Increment failure count
        recurring.failureCount = (recurring.failureCount || 0) + 1;
        recurring.lastFailureReason = error.message;
        recurring.lastFailureDate = new Date();

        // Pause if too many failures
        if (recurring.failureCount >= maxRetries) {
            recurring.status = 'paused';
            await recurring.save();

            logger.warn(`[Recurring Invoice Service] Paused recurring invoice ${recurring._id} after ${maxRetries} failures`);

            // Send failure notification
            await sendFailureNotification(recurring, error.message, true);

            return {
                success: false,
                action: 'paused',
                reason: 'max_retries_exceeded',
                message: `Paused after ${maxRetries} failures: ${error.message}`
            };
        }

        await recurring.save();

        // Send failure notification
        await sendFailureNotification(recurring, error.message, false);

        return {
            success: false,
            action: 'failed',
            reason: 'generation_error',
            message: `Failed to generate invoice: ${error.message}`
        };

    } finally {
        session.endSession();
    }
};

/**
 * Create invoice from recurring template
 * @param {Object} recurring - Recurring invoice document
 * @param {Object} session - Mongoose session
 * @returns {Promise<Object>} - Created invoice
 */
const createInvoiceFromRecurring = async (recurring, session) => {
    const now = new Date();

    // Calculate due date based on payment terms
    const dueDate = calculateDueDate(recurring.paymentTerms);

    // Create invoice (invoiceNumber will be auto-generated by model's pre-save hook)
    const invoice = new Invoice({
        firmId: recurring.firmId,
        lawyerId: recurring.lawyerId,
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
        createdBy: recurring.createdBy,
        history: [{
            action: 'created',
            date: now,
            note: `Auto-generated from recurring invoice: ${recurring.name}`
        }]
    });

    await invoice.save({ session });

    return invoice;
};

/**
 * Calculate due date based on payment terms
 * @param {String} paymentTerms - Payment terms
 * @returns {Date} - Due date
 */
const calculateDueDate = (paymentTerms) => {
    const dueDate = new Date();

    const termDays = {
        'due_on_receipt': 0,
        'net_7': 7,
        'net_14': 14,
        'net_30': 30,
        'net_45': 45,
        'net_60': 60,
        'net_90': 90
    };

    const days = termDays[paymentTerms] || 0;
    dueDate.setDate(dueDate.getDate() + days);

    return dueDate;
};

/**
 * Send notification when invoice is generated
 * @param {Object} recurring - Recurring invoice document
 * @param {Object} invoice - Generated invoice document
 */
const sendInvoiceGeneratedNotification = async (recurring, invoice) => {
    try {
        QueueService.createNotification({
            firmId: recurring.firmId,
            userId: recurring.createdBy,
            type: 'invoice',
            title: 'Recurring Invoice Generated',
            titleAr: 'تم إنشاء فاتورة متكررة',
            message: `Invoice ${invoice.invoiceNumber} has been automatically generated from "${recurring.name}"`,
            messageAr: `تم إنشاء الفاتورة ${invoice.invoiceNumber} تلقائياً من "${recurring.name}"`,
            priority: 'medium',
            link: `/invoices/${invoice._id}`,
            data: {
                invoiceId: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                recurringInvoiceId: recurring._id,
                amount: invoice.total.total,
                generatedCount: recurring.generatedCount
            }
        });

        logger.info(`[Recurring Invoice Service] Success notification sent for invoice ${invoice.invoiceNumber}`);
    } catch (error) {
        logger.error('[Recurring Invoice Service] Failed to send success notification:', error.message);
        // Don't throw - notification failure shouldn't stop the process
    }
};

/**
 * Send notification when invoice generation fails
 * @param {Object} recurring - Recurring invoice document
 * @param {String} errorMessage - Error message
 * @param {Boolean} isPaused - Whether the recurring invoice was paused
 */
const sendFailureNotification = async (recurring, errorMessage, isPaused) => {
    try {
        QueueService.createNotification({
            firmId: recurring.firmId,
            userId: recurring.createdBy,
            type: 'error',
            title: isPaused ? 'Recurring Invoice Paused' : 'Invoice Generation Failed',
            titleAr: isPaused ? 'تم إيقاف الفاتورة المتكررة' : 'فشل إنشاء الفاتورة',
            message: isPaused
                ? `"${recurring.name}" has been paused after multiple failures. Error: ${errorMessage}`
                : `Failed to generate invoice from "${recurring.name}". Error: ${errorMessage}`,
            messageAr: isPaused
                ? `تم إيقاف "${recurring.name}" بعد عدة محاولات فاشلة. خطأ: ${errorMessage}`
                : `فشل إنشاء فاتورة من "${recurring.name}". خطأ: ${errorMessage}`,
            priority: 'high',
            link: `/recurring-invoices/${recurring._id}`,
            data: {
                recurringInvoiceId: recurring._id,
                errorMessage,
                failureCount: recurring.failureCount,
                isPaused
            }
        });

        logger.info(`[Recurring Invoice Service] Failure notification sent for recurring invoice ${recurring._id}`);
    } catch (error) {
        logger.error('[Recurring Invoice Service] Failed to send failure notification:', error.message);
    }
};

/**
 * Send notification when recurring invoice completes
 * @param {Object} recurring - Recurring invoice document
 * @param {String} reason - Completion reason ('end_date' or 'max_occurrences')
 */
const sendCompletionNotification = async (recurring, reason) => {
    try {
        const reasonText = reason === 'end_date'
            ? 'The end date has been reached'
            : `All ${recurring.schedule.maxOccurrences} invoices have been generated`;

        const reasonTextAr = reason === 'end_date'
            ? 'تم الوصول إلى تاريخ الانتهاء'
            : `تم إنشاء جميع الفواتير (${recurring.schedule.maxOccurrences})`;

        QueueService.createNotification({
            firmId: recurring.firmId,
            userId: recurring.createdBy,
            type: 'info',
            title: 'Recurring Invoice Completed',
            titleAr: 'اكتملت الفاتورة المتكررة',
            message: `"${recurring.name}" has completed. ${reasonText}. Total invoices generated: ${recurring.generatedCount}`,
            messageAr: `اكتملت "${recurring.name}". ${reasonTextAr}. إجمالي الفواتير المُنشأة: ${recurring.generatedCount}`,
            priority: 'low',
            link: `/recurring-invoices/${recurring._id}`,
            data: {
                recurringInvoiceId: recurring._id,
                reason,
                generatedCount: recurring.generatedCount
            }
        });

        logger.info(`[Recurring Invoice Service] Completion notification sent for recurring invoice ${recurring._id}`);
    } catch (error) {
        logger.error('[Recurring Invoice Service] Failed to send completion notification:', error.message);
    }
};

/**
 * Send upcoming invoice notifications
 * @param {Number} daysAhead - Number of days to look ahead (default: 3)
 * @returns {Promise<Object>} - Notification results
 */
const sendUpcomingNotifications = async (daysAhead = 3) => {
    try {
        logger.info(`[Recurring Invoice Service] Checking for upcoming invoices (${daysAhead} days ahead)...`);

        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);

        const upcomingRecurring = await RecurringInvoice.find({
            status: 'active',
            'settings.notifyBeforeGeneration': true,
            nextGenerationDate: {
                $gte: now,
                $lte: futureDate
            }
        });

        if (upcomingRecurring.length === 0) {
            logger.info('[Recurring Invoice Service] No upcoming notifications to send');
            return { sent: 0, failed: 0 };
        }

        logger.info(`[Recurring Invoice Service] Sending notifications for ${upcomingRecurring.length} upcoming invoices`);

        let sent = 0;
        let failed = 0;

        for (const recurring of upcomingRecurring) {
            try {
                const daysUntil = Math.ceil(
                    (recurring.nextGenerationDate - now) / (1000 * 60 * 60 * 24)
                );

                QueueService.createNotification({
                    firmId: recurring.firmId,
                    userId: recurring.createdBy,
                    type: 'invoice',
                    title: 'Upcoming Recurring Invoice',
                    titleAr: 'فاتورة متكررة قادمة',
                    message: `"${recurring.name}" will generate an invoice in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`,
                    messageAr: `"${recurring.name}" ستنشئ فاتورة خلال ${daysUntil} يوم`,
                    priority: 'low',
                    link: `/recurring-invoices/${recurring._id}`,
                    data: {
                        recurringInvoiceId: recurring._id,
                        nextGenerationDate: recurring.nextGenerationDate,
                        daysUntil
                    }
                });

                sent++;
            } catch (error) {
                logger.error(`[Recurring Invoice Service] Failed to send notification for ${recurring._id}:`, error.message);
                failed++;
            }
        }

        logger.info(`[Recurring Invoice Service] Notifications sent: ${sent} success, ${failed} failed`);

        return { sent, failed };

    } catch (error) {
        logger.error('[Recurring Invoice Service] Error in sendUpcomingNotifications:', error);
        throw error;
    }
};

/**
 * Clean up cancelled recurring invoices
 * @param {Number} daysOld - Delete cancelled recurring invoices older than this many days (default: 30)
 * @returns {Promise<Object>} - Cleanup results
 */
const cleanupCancelledRecurring = async (daysOld = 30) => {
    try {
        logger.info(`[Recurring Invoice Service] Cleaning up cancelled recurring invoices older than ${daysOld} days...`);

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const result = await RecurringInvoice.deleteMany({
            status: 'cancelled',
            generatedCount: 0,
            createdAt: { $lt: cutoffDate }
        });

        if (result.deletedCount > 0) {
            logger.info(`[Recurring Invoice Service] Deleted ${result.deletedCount} cancelled recurring invoices`);
        } else {
            logger.info('[Recurring Invoice Service] No recurring invoices to clean up');
        }

        return { deleted: result.deletedCount };

    } catch (error) {
        logger.error('[Recurring Invoice Service] Error in cleanupCancelledRecurring:', error);
        throw error;
    }
};

/**
 * Log recurring invoice action to audit trail
 * @param {Object} data - Audit log data
 * @param {Object} session - Optional mongoose session
 */
const logRecurringInvoiceAudit = async (data, session = null) => {
    try {
        const auditData = {
            action: data.action,
            entityType: data.entityType || 'recurring_invoice',
            entityId: data.entityId || null,
            resourceType: data.entityType || 'recurring_invoice',
            resourceId: data.entityId || null,
            firmId: data.firmId || null,
            userId: data.userId || null,
            userEmail: 'system',
            userRole: 'system',
            severity: 'info',
            category: 'financial',
            description: `Recurring invoice action: ${data.action}`,
            metadata: data.details || {},
            ipAddress: '127.0.0.1',
            timestamp: new Date()
        };

        if (session) {
            await AuditLog.create([auditData], { session });
        } else {
            await AuditLog.create(auditData);
        }

    } catch (error) {
        logger.error('[Recurring Invoice Service] Error logging to audit:', error);
        // Don't throw - audit logging failure shouldn't stop the process
    }
};

/**
 * Generate a single invoice from a recurring template
 * @param {String} recurringInvoiceId - Recurring invoice ID
 * @param {String} firmId - Firm ID
 * @param {String} userId - User performing the action (optional)
 * @returns {Promise<Object>} - Generated invoice and updated recurring invoice
 */
const generateInvoiceFromRecurring = async (recurringInvoiceId, firmId, userId = null) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Validate required parameters
        if (!recurringInvoiceId || !firmId) {
            throw new Error('Recurring invoice ID and Firm ID are required');
        }

        // Fetch recurring invoice
        const recurring = await RecurringInvoice.findOne({
            _id: recurringInvoiceId,
            firmId
        }).populate('clientId', 'name email phone').session(session);

        if (!recurring) {
            throw new Error('Recurring invoice not found or access denied');
        }

        // Validate status
        if (!['active', 'paused'].includes(recurring.status)) {
            throw new Error(`Cannot generate invoice from recurring invoice with status: ${recurring.status}`);
        }

        // Check end conditions
        const now = new Date();
        if (recurring.endDate && now > recurring.endDate) {
            throw new Error('Recurring invoice has reached its end date');
        }

        if (recurring.maxGenerations && recurring.timesGenerated >= recurring.maxGenerations) {
            throw new Error('Recurring invoice has reached maximum generations');
        }

        // Generate invoice
        const invoice = await createInvoiceFromRecurring(recurring, session);

        // Update recurring invoice
        recurring.lastGeneratedDate = now;
        recurring.timesGenerated = (recurring.timesGenerated || 0) + 1;
        recurring.generatedInvoiceIds.push({
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            generatedAt: now,
            amount: invoice.totalAmount
        });

        // Reset failure count on success
        recurring.failureCount = 0;
        recurring.lastFailureReason = null;

        // Calculate next generation date
        recurring.nextGenerationDate = recurring.calculateNextGenerationDate(now);

        // Check if should complete
        if (recurring.maxGenerations && recurring.timesGenerated >= recurring.maxGenerations) {
            recurring.status = 'completed';
        }
        if (recurring.endDate && new Date() > recurring.endDate) {
            recurring.status = 'completed';
        }

        recurring.history.push({
            action: 'generated',
            performedBy: userId || recurring.createdBy,
            performedAt: new Date(),
            details: {
                invoiceId: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                amount: invoice.totalAmount
            }
        });

        await recurring.save({ session });
        await session.commitTransaction();

        logger.info(`Invoice ${invoice.invoiceNumber} generated from recurring invoice ${recurring.name} (${recurring._id})`);

        // Send notification (after commit)
        await sendInvoiceGeneratedNotification(recurring, invoice);

        // Log to audit trail
        await logRecurringInvoiceAudit({
            action: 'manual_invoice_generation',
            entityId: recurring._id,
            firmId: recurring.firmId,
            userId: userId || recurring.createdBy,
            details: {
                recurringName: recurring.name,
                invoiceId: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                amount: invoice.totalAmount,
                generatedCount: recurring.timesGenerated
            }
        });

        return {
            success: true,
            invoice,
            recurringInvoice: recurring
        };

    } catch (error) {
        await session.abortTransaction();
        logger.error('Error generating invoice from recurring:', error);

        // Log failure
        await handleGenerationFailure(recurringInvoiceId, firmId, error, false);

        throw error;
    } finally {
        session.endSession();
    }
};

/**
 * Preview what the next invoice will look like
 * @param {String} recurringInvoiceId - Recurring invoice ID
 * @param {String} firmId - Firm ID (optional for validation)
 * @returns {Promise<Object>} - Preview of next invoice
 */
const previewNextInvoice = async (recurringInvoiceId, firmId = null) => {
    try {
        const query = { _id: recurringInvoiceId };
        if (firmId) query.firmId = firmId;

        const recurring = await RecurringInvoice.findOne(query)
            .populate('clientId', 'firstName lastName companyName email phone');

        if (!recurring) {
            throw new Error('Recurring invoice not found');
        }

        // Calculate next dates
        const nextIssueDate = recurring.nextGenerationDate;
        const nextDueDate = calculateDueDate(recurring.paymentTerms || 'net_30');

        // Build preview
        const preview = {
            recurringInvoiceId: recurring._id,
            recurringInvoiceName: recurring.name,
            nameAr: recurring.nameAr,
            status: recurring.status,

            // Client info
            client: {
                id: recurring.clientId._id,
                name: recurring.clientId.companyName ||
                      `${recurring.clientId.firstName || ''} ${recurring.clientId.lastName || ''}`.trim(),
                email: recurring.clientId.email,
                phone: recurring.clientId.phone
            },

            // Projected invoice details
            projectedInvoice: {
                issueDate: nextIssueDate,
                dueDate: nextDueDate,
                paymentTermsDays: recurring.paymentTermsDays || 30,
                currency: recurring.currency || 'SAR',

                // Items
                items: recurring.items.map(item => ({
                    description: item.description,
                    descriptionAr: item.descriptionAr,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    taxRate: item.taxRate || recurring.vatRate || 15,
                    discountType: item.discountType,
                    discountValue: item.discountValue
                })),

                // Totals
                subtotal: recurring.subtotal,
                discountTotal: recurring.discountTotal,
                vatRate: recurring.vatRate,
                vatAmount: recurring.vatAmount,
                total: recurring.total,

                // Additional info
                notes: recurring.notes,
                notesAr: recurring.notesAr,
                internalNotes: recurring.internalNotes,

                // Generation settings
                willAutoSend: recurring.autoSend,
                willAutoApprove: recurring.autoApprove,
                initialStatus: recurring.autoApprove ? 'sent' : 'draft'
            },

            // Recurring info
            recurringInfo: {
                frequency: recurring.frequency,
                nextGenerationDate: recurring.nextGenerationDate,
                timesGenerated: recurring.timesGenerated,
                maxGenerations: recurring.maxGenerations,
                remainingGenerations: recurring.maxGenerations
                    ? recurring.maxGenerations - recurring.timesGenerated
                    : null,
                endDate: recurring.endDate,
                lastGeneratedDate: recurring.lastGeneratedDate
            }
        };

        return preview;

    } catch (error) {
        logger.error('Error previewing next invoice:', error);
        throw error;
    }
};

/**
 * Pause a recurring invoice
 * @param {String} recurringInvoiceId - Recurring invoice ID
 * @param {String} reason - Reason for pausing
 * @param {String} userId - User pausing the invoice
 * @param {String} firmId - Firm ID (optional for validation)
 * @returns {Promise<Object>} - Updated recurring invoice
 */
const pauseRecurringInvoice = async (recurringInvoiceId, reason, userId, firmId = null) => {
    try {
        const query = { _id: recurringInvoiceId };
        if (firmId) query.firmId = firmId;

        const recurring = await RecurringInvoice.findOne(query);

        if (!recurring) {
            throw new Error('Recurring invoice not found or access denied');
        }

        // Use model method
        await recurring.pause(userId, reason);

        logger.info(`Recurring invoice ${recurring.name} (${recurring._id}) paused by user ${userId}: ${reason}`);

        // Send notification
        QueueService.createNotification({
            firmId: recurring.firmId,
            userId: recurring.createdBy,
            type: 'info',
            title: 'Recurring Invoice Paused',
            titleAr: 'تم إيقاف الفاتورة المتكررة',
            message: `Recurring invoice "${recurring.name}" has been paused. Reason: ${reason}`,
            messageAr: `تم إيقاف الفاتورة المتكررة "${recurring.name}". السبب: ${reason}`,
            priority: 'medium',
            link: `/recurring-invoices/${recurring._id}`,
            data: {
                recurringInvoiceId: recurring._id,
                reason,
                pausedBy: userId
            }
        });

        // Log to audit trail
        await logRecurringInvoiceAudit({
            action: 'recurring_invoice_paused',
            entityId: recurring._id,
            firmId: recurring.firmId,
            userId,
            details: { reason, recurringName: recurring.name }
        });

        return recurring;

    } catch (error) {
        logger.error('Error pausing recurring invoice:', error);
        throw error;
    }
};

/**
 * Resume a paused recurring invoice
 * @param {String} recurringInvoiceId - Recurring invoice ID
 * @param {String} userId - User resuming the invoice
 * @param {String} firmId - Firm ID (optional for validation)
 * @returns {Promise<Object>} - Updated recurring invoice
 */
const resumeRecurringInvoice = async (recurringInvoiceId, userId, firmId = null) => {
    try {
        const query = { _id: recurringInvoiceId };
        if (firmId) query.firmId = firmId;

        const recurring = await RecurringInvoice.findOne(query);

        if (!recurring) {
            throw new Error('Recurring invoice not found or access denied');
        }

        // Use model method
        await recurring.resume(userId);

        logger.info(`Recurring invoice ${recurring.name} (${recurring._id}) resumed by user ${userId}`);

        // Send notification
        QueueService.createNotification({
            firmId: recurring.firmId,
            userId: recurring.createdBy,
            type: 'info',
            title: 'Recurring Invoice Resumed',
            titleAr: 'تم استئناف الفاتورة المتكررة',
            message: `Recurring invoice "${recurring.name}" has been resumed. Next generation: ${new Date(recurring.nextGenerationDate).toLocaleDateString()}`,
            messageAr: `تم استئناف الفاتورة المتكررة "${recurring.name}". الإنشاء التالي: ${new Date(recurring.nextGenerationDate).toLocaleDateString('ar-SA')}`,
            priority: 'medium',
            link: `/recurring-invoices/${recurring._id}`,
            data: {
                recurringInvoiceId: recurring._id,
                nextGenerationDate: recurring.nextGenerationDate,
                resumedBy: userId
            }
        });

        // Log to audit trail
        await logRecurringInvoiceAudit({
            action: 'recurring_invoice_resumed',
            entityId: recurring._id,
            firmId: recurring.firmId,
            userId,
            details: {
                recurringName: recurring.name,
                nextGenerationDate: recurring.nextGenerationDate
            }
        });

        return recurring;

    } catch (error) {
        logger.error('Error resuming recurring invoice:', error);
        throw error;
    }
};

/**
 * Calculate and update next generation date based on frequency
 * @param {String} recurringInvoiceId - Recurring invoice ID
 * @param {Date} fromDate - Calculate from this date (optional, defaults to now)
 * @param {String} firmId - Firm ID (optional for validation)
 * @returns {Promise<Object>} - Updated recurring invoice with new next generation date
 */
const updateNextGenerationDate = async (recurringInvoiceId, fromDate = null, firmId = null) => {
    try {
        const query = { _id: recurringInvoiceId };
        if (firmId) query.firmId = firmId;

        const recurring = await RecurringInvoice.findOne(query);

        if (!recurring) {
            throw new Error('Recurring invoice not found or access denied');
        }

        const oldDate = recurring.nextGenerationDate;
        const baseDate = fromDate || new Date();
        const newNextDate = recurring.calculateNextGenerationDate(baseDate);

        recurring.nextGenerationDate = newNextDate;
        recurring.history.push({
            action: 'updated',
            performedAt: new Date(),
            details: {
                field: 'nextGenerationDate',
                oldValue: oldDate,
                newValue: newNextDate,
                reason: 'Manual recalculation'
            }
        });

        await recurring.save();

        logger.info(`Next generation date updated for recurring invoice ${recurring._id}: ${newNextDate.toISOString()}`);

        // Log to audit trail
        await logRecurringInvoiceAudit({
            action: 'next_generation_date_updated',
            entityId: recurring._id,
            firmId: recurring.firmId,
            details: {
                recurringName: recurring.name,
                oldDate,
                newDate: newNextDate
            }
        });

        return recurring;

    } catch (error) {
        logger.error('Error updating next generation date:', error);
        throw error;
    }
};

/**
 * Handle and log generation failures with retry logic
 * @param {String} recurringInvoiceId - Recurring invoice ID
 * @param {String} firmId - Firm ID
 * @param {Error} error - Error that occurred
 * @param {Boolean} autoPause - Whether to auto-pause after max retries (default: true)
 * @returns {Promise<Object>} - Updated recurring invoice with failure info
 */
const handleGenerationFailure = async (recurringInvoiceId, firmId, error, autoPause = true) => {
    try {
        const recurring = await RecurringInvoice.findOne({ _id: recurringInvoiceId, firmId });

        if (!recurring) {
            logger.error(`Cannot log failure for non-existent recurring invoice: ${recurringInvoiceId}`);
            return null;
        }

        // Initialize failure tracking if not exists
        if (!recurring.failureCount) {
            recurring.failureCount = 0;
        }

        // Increment failure count
        recurring.failureCount++;
        recurring.lastFailureDate = new Date();
        recurring.lastFailureReason = error.message;

        // Log to history
        recurring.history.push({
            action: 'generation_failed',
            performedAt: new Date(),
            details: {
                error: error.message,
                failureCount: recurring.failureCount
            }
        });

        // Auto-pause after 3 consecutive failures if enabled
        const maxRetries = 3;
        if (autoPause && recurring.failureCount >= maxRetries && recurring.status === 'active') {
            recurring.status = 'paused';
            recurring.pausedAt = new Date();
            recurring.pauseReason = `Auto-paused after ${recurring.failureCount} consecutive generation failures: ${error.message}`;

            logger.warn(`Recurring invoice ${recurring._id} auto-paused after ${recurring.failureCount} failures`);

            // Send auto-pause notification
            await sendFailureNotification(recurring, error.message, true);
        } else {
            // Send failure notification (not paused yet)
            await sendFailureNotification(recurring, error.message, false);
        }

        await recurring.save();

        logger.error(`Generation failure logged for recurring invoice ${recurring._id} (${recurring.failureCount} failures):`, error);

        // Log to audit trail
        await logRecurringInvoiceAudit({
            action: 'generation_failure',
            entityId: recurring._id,
            firmId: recurring.firmId,
            details: {
                recurringName: recurring.name,
                error: error.message,
                failureCount: recurring.failureCount,
                autoPaused: autoPause && recurring.failureCount >= maxRetries
            }
        });

        return recurring;

    } catch (saveError) {
        logger.error('Error saving generation failure:', saveError);
        throw saveError;
    }
};

/**
 * Get recurring invoice statistics
 * @param {String} firmId - Firm ID (optional)
 * @param {String} lawyerId - Lawyer ID (optional)
 * @returns {Promise<Object>} - Statistics
 */
const getRecurringInvoiceStats = async (firmId = null, lawyerId = null) => {
    try {
        const query = {};
        if (firmId) {
            query.firmId = firmId;
        } else if (lawyerId) {
            query.lawyerId = lawyerId;
        }

        // Get basic statistics using model method
        const basicStats = await RecurringInvoice.getStats(firmId, lawyerId);

        // Get additional statistics
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const [upcoming, overdue, recentlyGenerated, frequencyDistribution] = await Promise.all([
            // Upcoming invoices (next 30 days)
            RecurringInvoice.countDocuments({
                ...query,
                status: 'active',
                nextGenerationDate: {
                    $gte: new Date(),
                    $lte: thirtyDaysFromNow
                }
            }),

            // Overdue (should have generated but didn't)
            RecurringInvoice.countDocuments({
                ...query,
                status: 'active',
                nextGenerationDate: { $lt: new Date() }
            }),

            // Recently generated (last 7 days)
            RecurringInvoice.countDocuments({
                ...query,
                lastGeneratedDate: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            }),

            // Frequency distribution
            RecurringInvoice.aggregate([
                { $match: { ...query, status: 'active' } },
                {
                    $group: {
                        _id: '$frequency',
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$total' }
                    }
                }
            ])
        ]);

        // Calculate projected revenue (next 30 days)
        const upcomingInvoices = await RecurringInvoice.find({
            ...query,
            status: 'active',
            nextGenerationDate: {
                $gte: new Date(),
                $lte: thirtyDaysFromNow
            }
        }).select('total');

        const projectedRevenue = upcomingInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

        return {
            ...basicStats,
            upcoming,
            overdue,
            recentlyGenerated,
            projectedRevenue30Days: projectedRevenue,
            frequencyDistribution: frequencyDistribution.map(f => ({
                frequency: f._id,
                count: f.count,
                totalAmount: f.totalAmount
            })),
            generatedAt: new Date()
        };

    } catch (error) {
        logger.error('[Recurring Invoice Service] Error getting recurring invoice stats:', error);
        throw error;
    }
};

/**
 * Alias for backward compatibility
 * @deprecated Use getRecurringInvoiceStats instead
 */
const getStatistics = getRecurringInvoiceStats;

/**
 * Send notification on generation success/failure/pause/resume
 * @param {String} invoiceId - Generated invoice ID (null for non-generation events)
 * @param {String} type - Notification type (success, failed, paused, resumed, etc.)
 * @param {Object} context - Additional context
 * @returns {Promise<void>}
 */
const sendGenerationNotification = async (invoiceId, type, context = {}) => {
    try {
        const {
            recurringInvoiceId,
            recurringInvoiceName,
            error,
            failureCount,
            reason,
            userId,
            nextGenerationDate
        } = context;

        let notification = null;

        switch (type) {
            case 'success':
                if (!invoiceId) break;
                const invoice = await Invoice.findById(invoiceId).select('invoiceNumber totalAmount firmId createdBy');
                if (!invoice) break;

                notification = {
                    firmId: invoice.firmId,
                    userId: invoice.createdBy,
                    type: 'invoice',
                    title: 'Recurring Invoice Generated',
                    titleAr: 'تم إنشاء فاتورة متكررة',
                    message: `Invoice ${invoice.invoiceNumber} has been automatically generated from recurring invoice "${recurringInvoiceName}"`,
                    messageAr: `تم إنشاء الفاتورة ${invoice.invoiceNumber} تلقائياً من الفاتورة المتكررة "${recurringInvoiceName}"`,
                    link: `/invoices/${invoice._id}`,
                    priority: 'medium',
                    data: {
                        invoiceId: invoice._id,
                        invoiceNumber: invoice.invoiceNumber,
                        recurringInvoiceId,
                        amount: invoice.totalAmount
                    }
                };
                break;

            case 'failed':
            case 'failed_auto_paused':
                const autoPaused = type === 'failed_auto_paused';
                const failedRecurring = await RecurringInvoice.findById(recurringInvoiceId).select('firmId createdBy');
                if (!failedRecurring) break;

                notification = {
                    firmId: failedRecurring.firmId,
                    userId: failedRecurring.createdBy,
                    type: autoPaused ? 'error' : 'alert',
                    title: autoPaused ? 'Recurring Invoice Auto-Paused' : 'Recurring Invoice Generation Failed',
                    titleAr: autoPaused ? 'تم إيقاف الفاتورة المتكررة تلقائياً' : 'فشل إنشاء الفاتورة المتكررة',
                    message: autoPaused
                        ? `Recurring invoice "${recurringInvoiceName}" has been automatically paused after ${failureCount} consecutive failures. Error: ${error}`
                        : `Failed to generate invoice from "${recurringInvoiceName}": ${error}. Failure count: ${failureCount}`,
                    messageAr: autoPaused
                        ? `تم إيقاف الفاتورة المتكررة "${recurringInvoiceName}" تلقائياً بعد ${failureCount} محاولات فاشلة متتالية. الخطأ: ${error}`
                        : `فشل إنشاء فاتورة من "${recurringInvoiceName}": ${error}. عدد المحاولات الفاشلة: ${failureCount}`,
                    link: `/recurring-invoices/${recurringInvoiceId}`,
                    priority: autoPaused ? 'high' : 'medium',
                    data: {
                        recurringInvoiceId,
                        error,
                        failureCount,
                        autoPaused
                    }
                };
                break;

            default:
                logger.warn(`Unknown notification type: ${type}`);
                return;
        }

        if (notification) {
            QueueService.createNotification(notification);
            logger.info(`Notification sent for recurring invoice ${recurringInvoiceId}: ${type}`);
        }

    } catch (error) {
        logger.error('Error sending generation notification:', error);
        // Don't throw - notifications are not critical
    }
};

module.exports = {
    // Main functions
    generateInvoiceFromRecurring,
    processAllDueRecurringInvoices: processDueRecurringInvoices,
    previewNextInvoice,
    pauseRecurringInvoice,
    resumeRecurringInvoice,
    updateNextGenerationDate,
    getRecurringInvoiceStats,
    handleGenerationFailure,
    sendGenerationNotification,

    // Additional/internal functions
    processDueRecurringInvoices,
    processRecurringInvoice,
    createInvoiceFromRecurring,
    sendUpcomingNotifications,
    cleanupCancelledRecurring,
    sendInvoiceGeneratedNotification,
    sendFailureNotification,
    sendCompletionNotification,
    getStatistics, // Deprecated alias
    logRecurringInvoiceAudit
};
