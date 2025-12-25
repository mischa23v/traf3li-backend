/**
 * Dunning Service - Automated Overdue Invoice Collection
 *
 * This service manages the complete dunning automation workflow for overdue invoices.
 * It implements multi-stage dunning processes with configurable policies, automated
 * communication (email, SMS, calls), late fee application, and escalation to collection agencies.
 *
 * Features:
 * - Multi-stage dunning process automation
 * - Configurable dunning policies per firm
 * - Automated email, SMS, and call reminders
 * - Late fee calculation and application
 * - Pause/resume for disputes and payment plans
 * - Escalation to collection agencies
 * - Comprehensive reporting and analytics
 * - Multi-tenant support with firm isolation
 */

const mongoose = require('mongoose');
const Invoice = require('../models/invoice.model');
const DunningPolicy = require('../models/dunningPolicy.model');
const DunningHistory = require('../models/dunningHistory.model');
const Dispute = require('../models/dispute.model');
const EmailService = require('./email.service');
const WhatsAppService = require('./whatsapp.service');
const logger = require('../utils/logger');
const { toHalalas, fromHalalas } = require('../utils/currency');

/**
 * Initiate dunning process for an overdue invoice
 * @param {String} invoiceId - Invoice ID
 * @param {String} firmId - Firm ID
 * @param {String} userId - User initiating dunning (optional)
 * @returns {Promise<Object>} - Dunning history record
 */
const initiateDunning = async (invoiceId, firmId, userId = null) => {
    try {
        // Validate required parameters
        if (!invoiceId || !firmId) {
            throw new Error('Invoice ID and Firm ID are required');
        }

        // Fetch invoice
        const invoice = await Invoice.findOne({
            _id: invoiceId,
            firmId
        }).populate('clientId', 'name email phone');

        if (!invoice) {
            throw new Error('Invoice not found');
        }

        // Check if invoice is eligible for dunning
        if (!invoice.isOverdue) {
            throw new Error('Invoice is not overdue');
        }

        if (['paid', 'void', 'cancelled', 'written_off'].includes(invoice.status)) {
            throw new Error(`Invoice status '${invoice.status}' is not eligible for dunning`);
        }

        // Check if dunning already exists
        const existingDunning = await DunningHistory.findOne({
            invoiceId,
            status: 'active'
        });

        if (existingDunning) {
            logger.info(`Dunning already active for invoice ${invoice.invoiceNumber}`);
            return existingDunning;
        }

        // Get dunning policy (use default if none specified)
        const policy = await DunningPolicy.getDefault(firmId);
        if (!policy) {
            throw new Error('No default dunning policy found for firm');
        }

        // Check if dunning should be paused based on policy conditions
        if (policy.shouldPause(invoice)) {
            logger.info(`Dunning auto-paused for invoice ${invoice.invoiceNumber} due to policy conditions`);
            const dunningHistory = await DunningHistory.getOrCreate(
                invoiceId,
                policy._id,
                firmId,
                userId
            );
            await dunningHistory.pause('Auto-paused due to policy conditions', userId);
            return dunningHistory;
        }

        // Create dunning history
        const dunningHistory = await DunningHistory.getOrCreate(
            invoiceId,
            policy._id,
            firmId,
            userId
        );

        // Calculate and execute first stage if applicable
        const daysOverdue = invoice.daysOverdue;
        const nextStage = policy.stages.find(stage => daysOverdue >= stage.daysOverdue);

        if (nextStage) {
            // Set next action date to now to trigger immediate execution
            await dunningHistory.setNextActionDate(new Date());

            logger.info(`Dunning initiated for invoice ${invoice.invoiceNumber}, ${daysOverdue} days overdue`);
        } else {
            // Set next action date to when the first stage threshold is reached
            const firstStage = policy.stages[0];
            if (firstStage) {
                const daysUntilFirstStage = firstStage.daysOverdue - daysOverdue;
                const nextActionDate = new Date();
                nextActionDate.setDate(nextActionDate.getDate() + daysUntilFirstStage);
                await dunningHistory.setNextActionDate(nextActionDate);
            }

            logger.info(`Dunning scheduled for invoice ${invoice.invoiceNumber}, will start in ${firstStage.daysOverdue - daysOverdue} days`);
        }

        return dunningHistory;
    } catch (error) {
        logger.error('Error initiating dunning:', error);
        throw error;
    }
};

/**
 * Process all overdue invoices and initiate/advance dunning
 * @param {String} firmId - Firm ID
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} - Processing results
 */
const processOverdueInvoices = async (firmId, options = {}) => {
    try {
        const { dryRun = false } = options;

        logger.info(`${dryRun ? '[DRY RUN] ' : ''}Processing overdue invoices for firm ${firmId}`);

        const results = {
            processed: 0,
            initiated: 0,
            advanced: 0,
            paused: 0,
            errors: 0,
            details: []
        };

        // Get all overdue invoices for the firm
        const overdueInvoices = await Invoice.find({
            firmId,
            status: { $in: ['sent', 'viewed', 'partial', 'overdue'] },
            dueDate: { $lt: new Date() }
        }).populate('clientId', 'name email phone');

        logger.info(`Found ${overdueInvoices.length} overdue invoices`);

        for (const invoice of overdueInvoices) {
            try {
                results.processed++;

                // Check if dunning already exists
                let dunningHistory = await DunningHistory.findOne({
                    invoiceId: invoice._id,
                    status: 'active'
                });

                if (!dunningHistory) {
                    // Initiate new dunning
                    if (!dryRun) {
                        dunningHistory = await initiateDunning(invoice._id.toString(), firmId);
                        results.initiated++;
                    }
                    results.details.push({
                        invoiceNumber: invoice.invoiceNumber,
                        action: 'initiated',
                        daysOverdue: invoice.daysOverdue
                    });
                } else {
                    // Check if dunning is paused
                    if (dunningHistory.isPaused) {
                        results.paused++;
                        results.details.push({
                            invoiceNumber: invoice.invoiceNumber,
                            action: 'skipped_paused',
                            reason: dunningHistory.pauseReason
                        });
                        continue;
                    }

                    // Check if next action is due
                    if (dunningHistory.isOverdue) {
                        if (!dryRun) {
                            await advanceStage(dunningHistory._id.toString(), firmId);
                            results.advanced++;
                        }
                        results.details.push({
                            invoiceNumber: invoice.invoiceNumber,
                            action: 'advanced',
                            currentStage: dunningHistory.currentStage
                        });
                    }
                }
            } catch (error) {
                logger.error(`Error processing invoice ${invoice.invoiceNumber}:`, error);
                results.errors++;
                results.details.push({
                    invoiceNumber: invoice.invoiceNumber,
                    action: 'error',
                    error: error.message
                });
            }
        }

        logger.info(`Dunning processing complete: ${results.initiated} initiated, ${results.advanced} advanced, ${results.errors} errors`);

        return results;
    } catch (error) {
        logger.error('Error processing overdue invoices:', error);
        throw error;
    }
};

/**
 * Advance to the next dunning stage
 * @param {String} dunningHistoryId - Dunning history ID
 * @param {String} firmId - Firm ID
 * @param {String} userId - User performing action (optional)
 * @returns {Promise<Object>} - Updated dunning history
 */
const advanceStage = async (dunningHistoryId, firmId, userId = null) => {
    try {
        // Fetch dunning history
        const dunningHistory = await DunningHistory.findOne({
            _id: dunningHistoryId,
            firmId
        }).populate('invoiceId').populate('policyId');

        if (!dunningHistory) {
            throw new Error('Dunning history not found');
        }

        if (dunningHistory.status !== 'active') {
            throw new Error(`Cannot advance dunning with status: ${dunningHistory.status}`);
        }

        if (dunningHistory.isPaused) {
            throw new Error('Dunning is paused');
        }

        const invoice = dunningHistory.invoiceId;
        const policy = dunningHistory.policyId;

        if (!invoice || !policy) {
            throw new Error('Invoice or policy not found');
        }

        // Check if invoice is still overdue
        if (!invoice.isOverdue) {
            await dunningHistory.complete('Invoice no longer overdue', userId);
            logger.info(`Dunning completed for invoice ${invoice.invoiceNumber} - no longer overdue`);
            return dunningHistory;
        }

        // Check if dunning should be paused based on policy
        if (policy.shouldPause(invoice)) {
            await dunningHistory.pause('Auto-paused due to policy conditions', userId);
            logger.info(`Dunning paused for invoice ${invoice.invoiceNumber}`);
            return dunningHistory;
        }

        // Get next stage based on days overdue
        const daysOverdue = invoice.daysOverdue;
        const applicableStages = policy.getApplicableStages(daysOverdue);

        if (!applicableStages || applicableStages.length === 0) {
            logger.info(`No applicable stages for invoice ${invoice.invoiceNumber} (${daysOverdue} days overdue)`);
            return dunningHistory;
        }

        // Find the next stage that hasn't been executed yet
        let nextStage = null;
        for (const stage of applicableStages) {
            if (!dunningHistory.hasExecutedStage(stage.order)) {
                nextStage = stage;
                break;
            }
        }

        if (!nextStage) {
            // All applicable stages have been executed
            logger.info(`All dunning stages completed for invoice ${invoice.invoiceNumber}`);

            // Check if there are more stages in the future
            const futureStages = policy.stages.filter(s => s.daysOverdue > daysOverdue);
            if (futureStages.length === 0) {
                await dunningHistory.complete('All dunning stages completed', userId);
            } else {
                // Schedule next stage
                const nextFutureStage = futureStages[0];
                const daysUntilNextStage = nextFutureStage.daysOverdue - daysOverdue;
                const nextActionDate = new Date();
                nextActionDate.setDate(nextActionDate.getDate() + daysUntilNextStage);
                await dunningHistory.setNextActionDate(nextActionDate);
            }

            return dunningHistory;
        }

        // Execute the stage action
        await executeStageAction(dunningHistory, nextStage, invoice, policy);

        return dunningHistory;
    } catch (error) {
        logger.error('Error advancing dunning stage:', error);
        throw error;
    }
};

/**
 * Execute the action for a dunning stage (email, SMS, call, etc.)
 * @param {Object} dunningHistory - Dunning history document
 * @param {Object} stage - Dunning stage configuration
 * @param {Object} invoice - Invoice document (optional, will fetch if not provided)
 * @param {Object} policy - Dunning policy document (optional, will fetch if not provided)
 * @returns {Promise<Object>} - Execution result
 */
const executeStageAction = async (dunningHistory, stage, invoice = null, policy = null) => {
    try {
        // Fetch related documents if not provided
        if (!invoice) {
            invoice = await Invoice.findById(dunningHistory.invoiceId)
                .populate('clientId', 'name email phone')
                .populate('firmId', 'name email phone');
        }

        if (!policy) {
            policy = await DunningPolicy.findById(dunningHistory.policyId);
        }

        if (!invoice || !policy) {
            throw new Error('Invoice or policy not found');
        }

        const client = invoice.clientId;
        const firm = invoice.firmId;

        let result = 'sent';
        let sentTo = '';
        let lateFeeApplied = 0;
        let notes = '';

        // Apply late fee if configured
        if (stage.addLateFee) {
            lateFeeApplied = policy.calculateLateFee(stage, invoice.totalAmount);
            if (lateFeeApplied > 0) {
                await applyLateFee(invoice._id.toString(), lateFeeApplied, stage.order, dunningHistory.firmId);
                notes += `Late fee of ${fromHalalas(lateFeeApplied)} SAR applied. `;
            }
        }

        // Execute action based on type
        switch (stage.action) {
            case 'email':
                try {
                    await sendDunningEmail(invoice, client, stage, firm);
                    sentTo = client.email;
                    notes += `Dunning email sent to ${client.email}`;
                    logger.info(`Dunning email sent for invoice ${invoice.invoiceNumber} (Stage ${stage.order})`);
                } catch (error) {
                    logger.error(`Failed to send dunning email for invoice ${invoice.invoiceNumber}:`, error);
                    result = 'failed';
                    notes += `Failed to send email: ${error.message}`;
                }
                break;

            case 'sms':
                try {
                    if (client.phone) {
                        await sendDunningSMS(invoice, client, stage, firm);
                        sentTo = client.phone;
                        notes += `Dunning SMS sent to ${client.phone}`;
                        logger.info(`Dunning SMS sent for invoice ${invoice.invoiceNumber} (Stage ${stage.order})`);
                    } else {
                        result = 'skipped';
                        notes += 'No phone number available for SMS';
                    }
                } catch (error) {
                    logger.error(`Failed to send dunning SMS for invoice ${invoice.invoiceNumber}:`, error);
                    result = 'failed';
                    notes += `Failed to send SMS: ${error.message}`;
                }
                break;

            case 'call':
                // Mark as requiring manual call
                result = 'skipped';
                sentTo = client.phone || '';
                notes += `Manual call required to ${client.phone || 'client'}`;
                logger.info(`Manual call action logged for invoice ${invoice.invoiceNumber} (Stage ${stage.order})`);
                break;

            case 'collection_agency':
                // Mark for collection agency escalation
                result = 'sent';
                notes += 'Escalated to collection agency';
                logger.info(`Collection agency escalation for invoice ${invoice.invoiceNumber} (Stage ${stage.order})`);
                break;

            default:
                result = 'skipped';
                notes += `Unknown action type: ${stage.action}`;
        }

        // Record stage execution in history
        await dunningHistory.advanceStage({
            stage: stage.order,
            action: stage.action,
            result,
            notes,
            sentTo,
            lateFeeApplied,
            escalatedTo: stage.escalateTo || null
        });

        // Calculate and set next action date
        const nextStages = policy.stages.filter(s => s.order > stage.order);
        if (nextStages.length > 0) {
            const nextStage = nextStages[0];
            const daysUntilNext = nextStage.daysOverdue - invoice.daysOverdue;
            const nextActionDate = new Date();
            nextActionDate.setDate(nextActionDate.getDate() + Math.max(1, daysUntilNext));
            await dunningHistory.setNextActionDate(nextActionDate);
        } else {
            // No more stages, mark as completed
            await dunningHistory.complete('All dunning stages completed');
        }

        return {
            success: result !== 'failed',
            result,
            stage: stage.order,
            action: stage.action,
            sentTo,
            lateFeeApplied,
            notes
        };
    } catch (error) {
        logger.error('Error executing stage action:', error);
        throw error;
    }
};

/**
 * Send dunning email to client
 * @param {Object} invoice - Invoice document
 * @param {Object} client - Client document
 * @param {Object} stage - Dunning stage configuration
 * @param {Object} firm - Firm document
 * @returns {Promise<void>}
 */
const sendDunningEmail = async (invoice, client, stage, firm) => {
    try {
        const daysOverdue = invoice.daysOverdue;
        const urgency = daysOverdue >= 60 ? 'urgent' : daysOverdue >= 30 ? 'high' : 'medium';

        // Determine email subject and tone based on stage
        let subject, tone;
        if (stage.order === 1) {
            subject = `Payment Reminder - Invoice #${invoice.invoiceNumber}`;
            tone = 'friendly';
        } else if (stage.order === 2) {
            subject = `Second Notice - Invoice #${invoice.invoiceNumber} Overdue`;
            tone = 'formal';
        } else if (stage.order === 3) {
            subject = `Final Notice - Invoice #${invoice.invoiceNumber} - Immediate Action Required`;
            tone = 'urgent';
        } else {
            subject = `Payment Required - Invoice #${invoice.invoiceNumber}`;
            tone = 'urgent';
        }

        // Send email using EmailService
        await EmailService.sendReminder('payment', {
            email: client.email,
            clientName: client.name,
            invoiceNumber: invoice.invoiceNumber,
            amountDue: fromHalalas(invoice.balanceDue),
            originalAmount: fromHalalas(invoice.totalAmount),
            paidAmount: fromHalalas(invoice.amountPaid),
            daysOverdue: daysOverdue,
            dueDate: invoice.dueDate,
            priority: urgency,
            actionUrl: `${process.env.DASHBOARD_URL || 'https://dashboard.traf3li.com'}/invoices/${invoice._id}`,
            teamName: firm?.name || 'Traf3li'
        }, 'ar');

        logger.info(`Dunning email sent to ${client.email} for invoice ${invoice.invoiceNumber}`);
    } catch (error) {
        logger.error('Error sending dunning email:', error);
        throw error;
    }
};

/**
 * Send dunning SMS/WhatsApp to client
 * @param {Object} invoice - Invoice document
 * @param {Object} client - Client document
 * @param {Object} stage - Dunning stage configuration
 * @param {Object} firm - Firm document
 * @returns {Promise<void>}
 */
const sendDunningSMS = async (invoice, client, stage, firm) => {
    try {
        const whatsappService = new WhatsAppService();

        // Format message based on stage
        let message;
        if (stage.order === 1) {
            message = `تذكير: الفاتورة رقم ${invoice.invoiceNumber} بمبلغ ${fromHalalas(invoice.balanceDue)} ريال متأخرة ${invoice.daysOverdue} يوم. يرجى السداد في أقرب وقت. ${firm?.name || 'Traf3li'}`;
        } else if (stage.order === 2) {
            message = `تنبيه ثاني: الفاتورة ${invoice.invoiceNumber} متأخرة ${invoice.daysOverdue} يوم. المبلغ المستحق: ${fromHalalas(invoice.balanceDue)} ريال. يرجى السداد فوراً لتجنب الرسوم. ${firm?.name || 'Traf3li'}`;
        } else {
            message = `إشعار نهائي: الفاتورة ${invoice.invoiceNumber} متأخرة ${invoice.daysOverdue} يوم. المبلغ: ${fromHalalas(invoice.balanceDue)} ريال. السداد الفوري مطلوب. ${firm?.name || 'Traf3li'}`;
        }

        // Send via WhatsApp if available, otherwise log for SMS gateway
        if (process.env.WHATSAPP_PROVIDER && client.phone) {
            await whatsappService.sendTextMessage(
                firm._id,
                client.phone,
                message,
                {
                    clientId: client._id,
                    contactName: client.name,
                    contactType: 'client'
                }
            );
            logger.info(`Dunning WhatsApp sent to ${client.phone} for invoice ${invoice.invoiceNumber}`);
        } else {
            logger.info(`SMS scheduled for ${client.phone}: ${message}`);
        }
    } catch (error) {
        logger.error('Error sending dunning SMS:', error);
        throw error;
    }
};

/**
 * Pause dunning process (e.g., for disputes or payment plans)
 * @param {String} dunningHistoryId - Dunning history ID
 * @param {String} reason - Reason for pausing
 * @param {String} userId - User pausing the process
 * @param {String} firmId - Firm ID
 * @returns {Promise<Object>} - Updated dunning history
 */
const pauseDunning = async (dunningHistoryId, reason, userId, firmId) => {
    try {
        const dunningHistory = await DunningHistory.findOne({
            _id: dunningHistoryId,
            firmId
        });

        if (!dunningHistory) {
            throw new Error('Dunning history not found');
        }

        await dunningHistory.pause(reason, userId);

        logger.info(`Dunning paused for history ${dunningHistoryId}: ${reason}`);

        return dunningHistory;
    } catch (error) {
        logger.error('Error pausing dunning:', error);
        throw error;
    }
};

/**
 * Resume paused dunning process
 * @param {String} dunningHistoryId - Dunning history ID
 * @param {String} userId - User resuming the process
 * @param {String} firmId - Firm ID
 * @returns {Promise<Object>} - Updated dunning history
 */
const resumeDunning = async (dunningHistoryId, userId, firmId) => {
    try {
        const dunningHistory = await DunningHistory.findOne({
            _id: dunningHistoryId,
            firmId
        }).populate('invoiceId').populate('policyId');

        if (!dunningHistory) {
            throw new Error('Dunning history not found');
        }

        await dunningHistory.resume(userId);

        // Recalculate next action date based on current invoice status
        const invoice = dunningHistory.invoiceId;
        const policy = dunningHistory.policyId;

        if (invoice && policy && invoice.isOverdue) {
            const daysOverdue = invoice.daysOverdue;
            const applicableStages = policy.getApplicableStages(daysOverdue);

            // Find next unexecuted stage
            const nextStage = applicableStages.find(stage =>
                !dunningHistory.hasExecutedStage(stage.order)
            );

            if (nextStage) {
                // Set to execute immediately or soon
                await dunningHistory.setNextActionDate(new Date());
            }
        }

        logger.info(`Dunning resumed for history ${dunningHistoryId}`);

        return dunningHistory;
    } catch (error) {
        logger.error('Error resuming dunning:', error);
        throw error;
    }
};

/**
 * Apply late fee to an invoice
 * @param {String} invoiceId - Invoice ID
 * @param {Number} amount - Late fee amount (in halalas)
 * @param {Number} stage - Dunning stage number
 * @param {String} firmId - Firm ID
 * @returns {Promise<Object>} - Updated invoice
 */
const applyLateFee = async (invoiceId, amount, stage, firmId) => {
    try {
        const invoice = await Invoice.findOne({
            _id: invoiceId,
            firmId
        });

        if (!invoice) {
            throw new Error('Invoice not found');
        }

        // Initialize lateFees if not exists
        if (!invoice.lateFees) {
            invoice.lateFees = {
                enabled: true,
                type: 'fixed',
                rate: 0,
                gracePeriod: 0,
                accumulatedFees: 0
            };
        }

        // Add to accumulated fees
        invoice.lateFees.accumulatedFees += amount;

        // Add note to history
        invoice.history.push({
            action: 'updated',
            date: new Date(),
            note: `Late fee of ${fromHalalas(amount)} SAR applied (Dunning Stage ${stage})`
        });

        // Recalculate totals
        invoice.calculateTotals();

        await invoice.save();

        logger.info(`Late fee of ${fromHalalas(amount)} SAR applied to invoice ${invoice.invoiceNumber}`);

        return invoice;
    } catch (error) {
        logger.error('Error applying late fee:', error);
        throw error;
    }
};

/**
 * Complete dunning process
 * @param {String} dunningHistoryId - Dunning history ID
 * @param {String} reason - Reason for completion
 * @param {String} firmId - Firm ID
 * @param {String} userId - User completing the process (optional)
 * @returns {Promise<Object>} - Updated dunning history
 */
const completeDunning = async (dunningHistoryId, reason, firmId, userId = null) => {
    try {
        const dunningHistory = await DunningHistory.findOne({
            _id: dunningHistoryId,
            firmId
        });

        if (!dunningHistory) {
            throw new Error('Dunning history not found');
        }

        // Determine completion method based on reason
        if (reason.toLowerCase().includes('paid') || reason.toLowerCase().includes('collected')) {
            await dunningHistory.markCollected(reason, userId);
        } else if (reason.toLowerCase().includes('cancel')) {
            await dunningHistory.cancel(reason, userId);
        } else {
            await dunningHistory.complete(reason, userId);
        }

        logger.info(`Dunning completed for history ${dunningHistoryId}: ${reason}`);

        return dunningHistory;
    } catch (error) {
        logger.error('Error completing dunning:', error);
        throw error;
    }
};

/**
 * Get current dunning status for an invoice
 * @param {String} invoiceId - Invoice ID
 * @param {String} firmId - Firm ID
 * @returns {Promise<Object>} - Dunning status information
 */
const getDunningStatus = async (invoiceId, firmId) => {
    try {
        const invoice = await Invoice.findOne({
            _id: invoiceId,
            firmId
        }).populate('clientId', 'name email phone');

        if (!invoice) {
            throw new Error('Invoice not found');
        }

        const dunningHistory = await DunningHistory.findOne({
            invoiceId,
            firmId
        }).populate('policyId');

        if (!dunningHistory) {
            return {
                hasDunning: false,
                isOverdue: invoice.isOverdue,
                daysOverdue: invoice.daysOverdue,
                balanceDue: invoice.balanceDue,
                invoiceNumber: invoice.invoiceNumber,
                clientName: invoice.clientId?.name
            };
        }

        const policy = dunningHistory.policyId;

        return {
            hasDunning: true,
            dunningId: dunningHistory._id,
            status: dunningHistory.status,
            currentStage: dunningHistory.currentStage,
            totalStages: policy?.stages?.length || 0,
            isPaused: dunningHistory.isPaused,
            pauseReason: dunningHistory.pauseReason,
            nextActionDate: dunningHistory.nextActionDate,
            lastActionDate: dunningHistory.lastActionDate,
            totalLateFees: dunningHistory.totalLateFees,
            stageHistory: dunningHistory.stageHistory,
            isOverdue: invoice.isOverdue,
            daysOverdue: invoice.daysOverdue,
            balanceDue: invoice.balanceDue,
            invoiceNumber: invoice.invoiceNumber,
            clientName: invoice.clientId?.name,
            totalStagesExecuted: dunningHistory.totalStagesExecuted
        };
    } catch (error) {
        logger.error('Error getting dunning status:', error);
        throw error;
    }
};

/**
 * Generate dunning report with filters
 * @param {String} firmId - Firm ID
 * @param {Object} filters - Report filters
 * @returns {Promise<Object>} - Dunning report data
 */
const getDunningReport = async (firmId, filters = {}) => {
    try {
        const {
            status = null,
            isPaused = null,
            dateFrom = null,
            dateTo = null,
            minDaysOverdue = null,
            maxDaysOverdue = null,
            stage = null,
            includeInvoices = true,
            includeStatistics = true
        } = filters;

        // Build query
        const query = { firmId };

        if (status) {
            query.status = status;
        }

        if (isPaused !== null) {
            query.isPaused = isPaused;
        }

        if (dateFrom || dateTo) {
            query.createdAt = {};
            if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
            if (dateTo) query.createdAt.$lte = new Date(dateTo);
        }

        if (stage !== null) {
            query.currentStage = stage;
        }

        // Fetch dunning histories
        let dunningHistories = await DunningHistory.find(query)
            .populate('invoiceId')
            .populate('policyId')
            .sort({ createdAt: -1 });

        // Filter by days overdue if specified
        if (minDaysOverdue !== null || maxDaysOverdue !== null) {
            dunningHistories = dunningHistories.filter(dh => {
                if (!dh.invoiceId) return false;
                const daysOverdue = dh.invoiceId.daysOverdue;
                if (minDaysOverdue !== null && daysOverdue < minDaysOverdue) return false;
                if (maxDaysOverdue !== null && daysOverdue > maxDaysOverdue) return false;
                return true;
            });
        }

        const report = {
            firmId,
            generatedAt: new Date(),
            filters,
            totalRecords: dunningHistories.length
        };

        // Include statistics if requested
        if (includeStatistics) {
            const statistics = await DunningHistory.getStatistics(firmId);
            const stageDistribution = await DunningHistory.getStageDistribution(firmId);

            report.statistics = {
                ...statistics,
                stageDistribution: stageDistribution.map(sd => ({
                    stage: sd._id,
                    count: sd.count,
                    totalLateFees: sd.totalLateFees
                })),
                averageLateFees: statistics.active > 0
                    ? statistics.totalLateFees / statistics.active
                    : 0
            };
        }

        // Include invoice details if requested
        if (includeInvoices) {
            report.invoices = dunningHistories.map(dh => ({
                dunningId: dh._id,
                invoiceId: dh.invoiceId?._id,
                invoiceNumber: dh.invoiceId?.invoiceNumber,
                clientName: dh.invoiceId?.clientId?.name,
                balanceDue: dh.invoiceId?.balanceDue,
                daysOverdue: dh.invoiceId?.daysOverdue,
                currentStage: dh.currentStage,
                status: dh.status,
                isPaused: dh.isPaused,
                pauseReason: dh.pauseReason,
                totalLateFees: dh.totalLateFees,
                nextActionDate: dh.nextActionDate,
                lastActionDate: dh.lastActionDate,
                stageHistory: dh.stageHistory,
                createdAt: dh.createdAt
            }));
        }

        logger.info(`Dunning report generated for firm ${firmId}: ${report.totalRecords} records`);

        return report;
    } catch (error) {
        logger.error('Error generating dunning report:', error);
        throw error;
    }
};

module.exports = {
    initiateDunning,
    processOverdueInvoices,
    advanceStage,
    executeStageAction,
    pauseDunning,
    resumeDunning,
    applyLateFee,
    completeDunning,
    getDunningStatus,
    getDunningReport
};
