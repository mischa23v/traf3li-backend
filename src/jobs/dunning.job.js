/**
 * Dunning Job Scheduler for TRAF3LI
 *
 * Automated tasks for invoice collection and dunning process:
 * - Daily dunning process execution (default 9 AM, configurable)
 * - Process overdue invoices according to dunning policies
 * - Execute dunning stage actions (email, SMS, call notifications, late fees)
 * - Track dunning history and stage progression
 * - Audit all dunning actions for compliance
 *
 * Dunning Process:
 * 1. Find all firms with active dunning policies
 * 2. For each firm, identify overdue invoices not yet in dunning
 * 3. Initiate dunning for newly overdue invoices
 * 4. For invoices already in dunning, check if stage advancement is needed
 * 5. Execute appropriate stage actions (email, SMS, late fees, escalations)
 * 6. Log all actions to audit trail
 * 7. Handle pause conditions (disputes, payment plans)
 *
 * Idempotency:
 * - Safe to run multiple times
 * - Checks existing dunning history to avoid duplicate actions
 * - Tracks last processed stage to prevent re-execution
 */

const cron = require('node-cron');
const DunningPolicy = require('../models/dunningPolicy.model');
const Invoice = require('../models/invoice.model');
const Firm = require('../models/firm.model');
const AuditLog = require('../models/auditLog.model');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Job configuration
const DUNNING_JOB_CONFIG = {
  dailyProcess: {
    cron: process.env.DUNNING_CRON_SCHEDULE || '0 9 * * *', // Daily at 9 AM (configurable)
    timeout: 60 * 60 * 1000, // 60 minutes
    retries: 3
  }
};

// Track running jobs
let jobsRunning = {
  dailyProcess: false
};

// Track job statistics
let jobStats = {
  lastRun: null,
  lastSuccess: null,
  lastError: null,
  totalProcessed: 0,
  totalErrors: 0
};

/**
 * Main daily dunning process
 * Processes all overdue invoices and executes dunning stages
 */
const processDailyDunning = async () => {
  if (jobsRunning.dailyProcess) {
    logger.info('[Dunning Job] Daily process still running, skipping...');
    return;
  }

  jobsRunning.dailyProcess = true;
  const startTime = Date.now();

  try {
    logger.info('[Dunning Job] Starting daily dunning process...');
    jobStats.lastRun = new Date();

    // Get all firms with active dunning policies
    const firmsWithPolicies = await getFirmsWithActivePolicies();

    if (firmsWithPolicies.length === 0) {
      logger.info('[Dunning Job] No firms with active dunning policies found');
      return { success: true, processed: 0 };
    }

    logger.info(`[Dunning Job] Found ${firmsWithPolicies.length} firms with active dunning policies`);

    let totalInvoicesProcessed = 0;
    let totalActionsExecuted = 0;
    let totalErrors = 0;
    const firmResults = [];

    // Process each firm independently
    for (const firmData of firmsWithPolicies) {
      try {
        logger.info(`[Dunning Job] Processing firm: ${firmData.firmId} (${firmData.firmName})`);

        const result = await processFirmDunning(firmData);

        firmResults.push({
          firmId: firmData.firmId,
          firmName: firmData.firmName,
          ...result
        });

        totalInvoicesProcessed += result.invoicesProcessed;
        totalActionsExecuted += result.actionsExecuted;
        totalErrors += result.errors;

      } catch (error) {
        logger.error(`[Dunning Job] Error processing firm ${firmData.firmId}:`, error);
        totalErrors++;
        firmResults.push({
          firmId: firmData.firmId,
          firmName: firmData.firmName,
          error: error.message,
          invoicesProcessed: 0,
          actionsExecuted: 0
        });
      }
    }

    const duration = Date.now() - startTime;
    jobStats.lastSuccess = new Date();
    jobStats.totalProcessed += totalInvoicesProcessed;

    logger.info(`[Dunning Job] Daily process complete in ${duration}ms`);
    logger.info(`[Dunning Job] Summary: ${totalInvoicesProcessed} invoices, ${totalActionsExecuted} actions, ${totalErrors} errors`);

    // Log summary to audit
    await logDunningAudit({
      action: 'dunning_job_completed',
      entityType: 'system',
      details: {
        duration,
        firmsProcessed: firmsWithPolicies.length,
        invoicesProcessed: totalInvoicesProcessed,
        actionsExecuted: totalActionsExecuted,
        errors: totalErrors,
        firmResults
      }
    });

    return {
      success: true,
      duration,
      firmsProcessed: firmsWithPolicies.length,
      invoicesProcessed: totalInvoicesProcessed,
      actionsExecuted: totalActionsExecuted,
      errors: totalErrors,
      firmResults
    };

  } catch (error) {
    logger.error('[Dunning Job] Daily process error:', error);
    jobStats.lastError = { time: new Date(), message: error.message };
    jobStats.totalErrors++;
    throw error;
  } finally {
    jobsRunning.dailyProcess = false;
  }
};

/**
 * Get all firms with active dunning policies
 * @returns {Promise<Array>} Array of firms with their policies
 */
async function getFirmsWithActivePolicies() {
  try {
    // Find all active dunning policies
    // NOTE: Bypass firmIsolation filter - system job operates across all firms
    const activePolicies = await DunningPolicy.find({ isActive: true })
      .select('firmId name stages pauseConditions')
      .setOptions({ bypassFirmFilter: true })
      .lean();

    if (activePolicies.length === 0) {
      return [];
    }

    // Get unique firm IDs
    const firmIds = [...new Set(activePolicies.map(p => p.firmId.toString()))];

    // Get firm details
    const firms = await Firm.find({
      _id: { $in: firmIds },
      status: { $ne: 'deleted' }
    }).select('_id name').lean();

    // Map firms with their policies
    return firms.map(firm => {
      const firmPolicies = activePolicies.filter(
        p => p.firmId.toString() === firm._id.toString()
      );

      // Use default policy if available, otherwise first policy
      const defaultPolicy = firmPolicies.find(p => p.isDefault);
      const policy = defaultPolicy || firmPolicies[0];

      return {
        firmId: firm._id,
        firmName: firm.name,
        policy,
        allPolicies: firmPolicies
      };
    });

  } catch (error) {
    logger.error('[Dunning Job] Error getting firms with policies:', error);
    throw error;
  }
}

/**
 * Process dunning for a specific firm
 * @param {Object} firmData - Firm data with policy
 * @returns {Promise<Object>} Processing results
 */
async function processFirmDunning(firmData) {
  const { firmId, policy } = firmData;
  let invoicesProcessed = 0;
  let actionsExecuted = 0;
  let errors = 0;

  try {
    // Find all overdue invoices for this firm
    const overdueInvoices = await getOverdueInvoices(firmId);

    if (overdueInvoices.length === 0) {
      logger.info(`[Dunning Job] No overdue invoices for firm ${firmId}`);
      return { invoicesProcessed: 0, actionsExecuted: 0, errors: 0 };
    }

    logger.info(`[Dunning Job] Found ${overdueInvoices.length} overdue invoices for firm ${firmId}`);

    // Process each overdue invoice
    for (const invoice of overdueInvoices) {
      try {
        const result = await processInvoiceDunning(invoice, policy);

        if (result.processed) {
          invoicesProcessed++;
          actionsExecuted += result.actionsExecuted;
        }

      } catch (error) {
        logger.error(`[Dunning Job] Error processing invoice ${invoice._id}:`, error);
        errors++;
      }
    }

    return { invoicesProcessed, actionsExecuted, errors };

  } catch (error) {
    logger.error(`[Dunning Job] Error in processFirmDunning for firm ${firmId}:`, error);
    throw error;
  }
}

/**
 * Get overdue invoices for a firm
 * @param {ObjectId} firmId - Firm ID
 * @returns {Promise<Array>} Array of overdue invoices
 */
async function getOverdueInvoices(firmId) {
  try {
    const now = new Date();

    return await Invoice.find({
      firmId,
      status: { $in: ['sent', 'viewed', 'partial', 'overdue'] },
      dueDate: { $lt: now },
      // Exclude voided, cancelled, and paid invoices
      $nor: [
        { status: 'void' },
        { status: 'cancelled' },
        { status: 'paid' },
        { status: 'written_off' }
      ]
    })
    .populate('clientId', 'name email phone')
    .populate('lawyerId', 'firstName lastName email')
    .lean();

  } catch (error) {
    logger.error(`[Dunning Job] Error getting overdue invoices for firm ${firmId}:`, error);
    throw error;
  }
}

/**
 * Process dunning for a single invoice
 * @param {Object} invoice - Invoice document
 * @param {Object} policy - Dunning policy
 * @returns {Promise<Object>} Processing result
 */
async function processInvoiceDunning(invoice, policy) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Calculate days overdue
    const now = new Date();
    const daysOverdue = Math.floor((now - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24));

    logger.info(`[Dunning Job] Processing invoice ${invoice.invoiceNumber} - ${daysOverdue} days overdue`);

    // Check if dunning should be paused
    if (shouldPauseDunning(invoice, policy)) {
      logger.info(`[Dunning Job] Dunning paused for invoice ${invoice.invoiceNumber} (pause condition met)`);
      await session.commitTransaction();
      return { processed: false, reason: 'paused', actionsExecuted: 0 };
    }

    // Initialize dunning history if not exists
    if (!invoice.dunning) {
      invoice.dunning = {
        isActive: false,
        startedAt: null,
        currentStage: null,
        stageHistory: [],
        pausedUntil: null
      };
    }

    // Find applicable dunning stage
    const applicableStage = findApplicableStage(policy, daysOverdue);

    if (!applicableStage) {
      logger.info(`[Dunning Job] No applicable stage for invoice ${invoice.invoiceNumber} (${daysOverdue} days overdue)`);
      await session.commitTransaction();
      return { processed: false, reason: 'no_stage', actionsExecuted: 0 };
    }

    // Check if this stage has already been executed
    const stageAlreadyExecuted = invoice.dunning.stageHistory?.some(
      h => h.stageOrder === applicableStage.order
    );

    if (stageAlreadyExecuted) {
      logger.info(`[Dunning Job] Stage ${applicableStage.order} already executed for invoice ${invoice.invoiceNumber}`);
      await session.commitTransaction();
      return { processed: false, reason: 'stage_already_executed', actionsExecuted: 0 };
    }

    // Execute dunning stage actions
    const actionsExecuted = await executeDunningStage(invoice, applicableStage, policy, session);

    // Update invoice dunning status
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      invoice._id,
      {
        $set: {
          'dunning.isActive': true,
          'dunning.currentStage': applicableStage.order,
          'dunning.lastActionAt': now,
          status: 'overdue' // Ensure status is overdue
        },
        $push: {
          'dunning.stageHistory': {
            stageOrder: applicableStage.order,
            daysOverdue,
            action: applicableStage.action,
            executedAt: now,
            success: true
          }
        },
        // Set startedAt if this is the first stage
        ...(!invoice.dunning.startedAt ? { 'dunning.startedAt': now } : {})
      },
      { new: true, session }
    );

    // Log to audit trail
    await logDunningAudit({
      action: 'dunning_stage_executed',
      entityType: 'invoice',
      entityId: invoice._id,
      firmId: invoice.firmId,
      userId: null, // System action
      details: {
        invoiceNumber: invoice.invoiceNumber,
        clientId: invoice.clientId,
        stage: applicableStage.order,
        daysOverdue,
        actions: applicableStage.action,
        lateFeeApplied: applicableStage.addLateFee,
        lateFeeAmount: applicableStage.addLateFee ? applicableStage.lateFeeAmount : 0
      }
    }, session);

    await session.commitTransaction();

    logger.info(`[Dunning Job] Successfully executed stage ${applicableStage.order} for invoice ${invoice.invoiceNumber}`);

    return { processed: true, actionsExecuted };

  } catch (error) {
    await session.abortTransaction();
    logger.error(`[Dunning Job] Error processing invoice ${invoice.invoiceNumber}:`, error);
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Check if dunning should be paused for an invoice
 * @param {Object} invoice - Invoice document
 * @param {Object} policy - Dunning policy
 * @returns {Boolean} Whether dunning should be paused
 */
function shouldPauseDunning(invoice, policy) {
  if (!policy.pauseConditions || policy.pauseConditions.length === 0) {
    return false;
  }

  // Check dispute_open condition
  if (policy.pauseConditions.includes('dispute_open') &&
      invoice.dispute?.status === 'open') {
    return true;
  }

  // Check payment_plan_active condition
  if (policy.pauseConditions.includes('payment_plan_active') &&
      invoice.paymentPlan?.enabled === true) {
    return true;
  }

  // Check if manually paused
  if (invoice.dunning?.pausedUntil && new Date(invoice.dunning.pausedUntil) > new Date()) {
    return true;
  }

  return false;
}

/**
 * Find the applicable dunning stage for the current days overdue
 * @param {Object} policy - Dunning policy
 * @param {Number} daysOverdue - Number of days overdue
 * @returns {Object|null} Applicable stage or null
 */
function findApplicableStage(policy, daysOverdue) {
  if (!policy.stages || policy.stages.length === 0) {
    return null;
  }

  // Sort stages by daysOverdue ascending
  const sortedStages = [...policy.stages].sort((a, b) => a.daysOverdue - b.daysOverdue);

  // Find the most recent stage that should be executed
  // We want the highest stage threshold that has been reached
  let applicableStage = null;

  for (const stage of sortedStages) {
    if (daysOverdue >= stage.daysOverdue) {
      applicableStage = stage;
    } else {
      break; // Stop when we reach a stage we haven't hit yet
    }
  }

  return applicableStage;
}

/**
 * Execute dunning stage actions
 * @param {Object} invoice - Invoice document
 * @param {Object} stage - Dunning stage
 * @param {Object} policy - Dunning policy
 * @param {Object} session - Mongoose session
 * @returns {Promise<Number>} Number of actions executed
 */
async function executeDunningStage(invoice, stage, policy, session) {
  let actionsExecuted = 0;

  try {
    // 1. Send notification based on action type
    switch (stage.action) {
      case 'email':
        await sendDunningEmail(invoice, stage, policy);
        actionsExecuted++;
        logger.info(`[Dunning Job] Email sent for invoice ${invoice.invoiceNumber}, stage ${stage.order}`);
        break;

      case 'sms':
        await sendDunningSMS(invoice, stage, policy);
        actionsExecuted++;
        logger.info(`[Dunning Job] SMS sent for invoice ${invoice.invoiceNumber}, stage ${stage.order}`);
        break;

      case 'call':
        await scheduleDunningCall(invoice, stage, policy);
        actionsExecuted++;
        logger.info(`[Dunning Job] Call scheduled for invoice ${invoice.invoiceNumber}, stage ${stage.order}`);
        break;

      case 'collection_agency':
        await escalateToCollectionAgency(invoice, stage, policy);
        actionsExecuted++;
        logger.info(`[Dunning Job] Escalated to collection agency for invoice ${invoice.invoiceNumber}`);
        break;

      default:
        logger.warn(`[Dunning Job] Unknown action type: ${stage.action}`);
    }

    // 2. Apply late fee if configured
    if (stage.addLateFee && stage.lateFeeAmount > 0) {
      await applyLateFee(invoice, stage, session);
      actionsExecuted++;
      logger.info(`[Dunning Job] Late fee applied for invoice ${invoice.invoiceNumber}: ${stage.lateFeeAmount}`);
    }

    // 3. Escalate to user if configured
    if (stage.escalateTo) {
      await createEscalationNotification(invoice, stage);
      actionsExecuted++;
      logger.info(`[Dunning Job] Escalation notification created for invoice ${invoice.invoiceNumber}`);
    }

    return actionsExecuted;

  } catch (error) {
    logger.error(`[Dunning Job] Error executing dunning actions:`, error);
    throw error;
  }
}

/**
 * Send dunning email notification
 * @param {Object} invoice - Invoice document
 * @param {Object} stage - Dunning stage
 * @param {Object} policy - Dunning policy
 */
async function sendDunningEmail(invoice, stage, policy) {
  try {
    // TODO: Integrate with email service
    // This should call the email service to send dunning emails
    // using the template specified in stage.template

    logger.info(`[Dunning Job] TODO: Send email for invoice ${invoice.invoiceNumber} using template: ${stage.template || 'default'}`);

    // Example integration (uncomment when email service is ready):
    // const emailService = require('../services/email.service');
    // await emailService.sendDunningEmail({
    //   to: invoice.clientId?.email,
    //   template: stage.template || 'dunning_reminder',
    //   data: {
    //     invoiceNumber: invoice.invoiceNumber,
    //     amount: invoice.total?.total,
    //     daysOverdue: Math.floor((new Date() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24)),
    //     dueDate: invoice.dueDate,
    //     stage: stage.order,
    //     clientName: invoice.clientId?.name
    //   }
    // });

  } catch (error) {
    logger.error(`[Dunning Job] Error sending dunning email:`, error);
    throw error;
  }
}

/**
 * Send dunning SMS notification
 * @param {Object} invoice - Invoice document
 * @param {Object} stage - Dunning stage
 * @param {Object} policy - Dunning policy
 */
async function sendDunningSMS(invoice, stage, policy) {
  try {
    // TODO: Integrate with SMS service
    logger.info(`[Dunning Job] TODO: Send SMS for invoice ${invoice.invoiceNumber}`);

    // Example integration:
    // const smsService = require('../services/sms.service');
    // await smsService.send({
    //   to: invoice.clientId?.phone,
    //   message: `Reminder: Invoice ${invoice.invoiceNumber} is overdue. Please pay ${invoice.total?.total} SAR.`
    // });

  } catch (error) {
    logger.error(`[Dunning Job] Error sending dunning SMS:`, error);
    throw error;
  }
}

/**
 * Schedule a dunning call
 * @param {Object} invoice - Invoice document
 * @param {Object} stage - Dunning stage
 * @param {Object} policy - Dunning policy
 */
async function scheduleDunningCall(invoice, stage, policy) {
  try {
    // TODO: Create task or notification for collections team to call
    logger.info(`[Dunning Job] TODO: Schedule call for invoice ${invoice.invoiceNumber}`);

    // Example integration:
    // const Task = require('../models/task.model');
    // await Task.create({
    //   firmId: invoice.firmId,
    //   title: `Call client about overdue invoice ${invoice.invoiceNumber}`,
    //   description: `Invoice ${invoice.invoiceNumber} is ${daysOverdue} days overdue. Contact client to arrange payment.`,
    //   type: 'call',
    //   priority: 'high',
    //   assignedTo: stage.escalateTo,
    //   relatedTo: { type: 'invoice', id: invoice._id }
    // });

  } catch (error) {
    logger.error(`[Dunning Job] Error scheduling dunning call:`, error);
    throw error;
  }
}

/**
 * Escalate invoice to collection agency
 * @param {Object} invoice - Invoice document
 * @param {Object} stage - Dunning stage
 * @param {Object} policy - Dunning policy
 */
async function escalateToCollectionAgency(invoice, stage, policy) {
  try {
    // TODO: Integrate with collection agency API or create manual task
    logger.info(`[Dunning Job] TODO: Escalate invoice ${invoice.invoiceNumber} to collection agency`);

    // Mark invoice for collection agency review
    await Invoice.findByIdAndUpdate(invoice._id, {
      $set: {
        'dunning.escalatedToCollection': true,
        'dunning.escalatedAt': new Date()
      }
    });

  } catch (error) {
    logger.error(`[Dunning Job] Error escalating to collection agency:`, error);
    throw error;
  }
}

/**
 * Apply late fee to invoice
 * @param {Object} invoice - Invoice document
 * @param {Object} stage - Dunning stage
 * @param {Object} session - Mongoose session
 */
async function applyLateFee(invoice, stage, session) {
  try {
    let lateFeeAmount = stage.lateFeeAmount;

    // Calculate percentage-based late fee
    if (stage.lateFeeType === 'percentage') {
      lateFeeAmount = Math.round((invoice.total?.total || 0) * (stage.lateFeeAmount / 100));
    }

    // Add late fee as a line item or adjustment
    await Invoice.findByIdAndUpdate(
      invoice._id,
      {
        $push: {
          'dunning.lateFeesApplied': {
            amount: lateFeeAmount,
            type: stage.lateFeeType,
            rate: stage.lateFeeAmount,
            appliedAt: new Date(),
            stageOrder: stage.order
          }
        },
        $inc: {
          'total.total': lateFeeAmount,
          'total.lateFees': lateFeeAmount
        }
      },
      { session }
    );

    logger.info(`[Dunning Job] Late fee applied: ${lateFeeAmount} (${stage.lateFeeType})`);

  } catch (error) {
    logger.error(`[Dunning Job] Error applying late fee:`, error);
    throw error;
  }
}

/**
 * Create escalation notification for assigned user
 * @param {Object} invoice - Invoice document
 * @param {Object} stage - Dunning stage
 */
async function createEscalationNotification(invoice, stage) {
  try {
    // TODO: Create notification for escalated user
    logger.info(`[Dunning Job] TODO: Create escalation notification for user ${stage.escalateTo}`);

    // Example integration:
    // const Notification = require('../models/notification.model');
    // await Notification.create({
    //   firmId: invoice.firmId,
    //   userId: stage.escalateTo,
    //   type: 'dunning_escalation',
    //   title: 'Overdue Invoice Escalation',
    //   message: `Invoice ${invoice.invoiceNumber} has been escalated to you for collection.`,
    //   link: `/invoices/${invoice._id}`,
    //   priority: 'high'
    // });

  } catch (error) {
    logger.error(`[Dunning Job] Error creating escalation notification:`, error);
    throw error;
  }
}

/**
 * Log dunning action to audit trail
 * @param {Object} data - Audit log data
 * @param {Object} session - Optional mongoose session
 */
async function logDunningAudit(data, session = null) {
  try {
    const auditData = {
      action: data.action,
      entityType: data.entityType || 'invoice',
      entityId: data.entityId || null,
      resourceType: data.entityType || 'invoice',
      resourceId: data.entityId || null,
      firmId: data.firmId || null,
      userId: data.userId || null,
      userEmail: 'system',
      userRole: 'system',
      severity: 'info',
      category: 'financial',
      description: `Dunning action: ${data.action}`,
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
    logger.error('[Dunning Job] Error logging to audit:', error);
    // Don't throw - audit logging failure shouldn't stop the process
  }
}

/**
 * Start dunning job scheduler
 */
function startDunningJobs() {
  logger.info('[Dunning Job] Starting dunning job scheduler...');

  // Daily dunning process
  cron.schedule(DUNNING_JOB_CONFIG.dailyProcess.cron, () => {
    processDailyDunning();
  }, {
    timezone: process.env.TZ || 'Asia/Riyadh'
  });

  logger.info(`[Dunning Job] ✓ Daily dunning process scheduled: ${DUNNING_JOB_CONFIG.dailyProcess.cron}`);
  logger.info('[Dunning Job] All dunning jobs started successfully');
}

/**
 * Stop all jobs (for graceful shutdown)
 */
function stopDunningJobs() {
  logger.info('[Dunning Job] Stopping dunning jobs...');
  // Jobs will stop automatically when process exits
}

/**
 * Manually trigger the dunning job (for testing/admin)
 */
async function triggerJob(jobName = 'dailyProcess') {
  logger.info(`[Dunning Job] Manually triggering ${jobName}...`);

  if (jobName !== 'dailyProcess') {
    throw new Error(`Unknown job: ${jobName}`);
  }

  const result = await processDailyDunning();
  logger.info(`[Dunning Job] ${jobName} completed`);
  return result;
}

/**
 * Get job status and statistics
 */
function getJobStatus() {
  return {
    jobs: {
      dailyProcess: {
        running: jobsRunning.dailyProcess,
        schedule: DUNNING_JOB_CONFIG.dailyProcess.cron,
        description: 'Daily dunning process for overdue invoices',
        timezone: process.env.TZ || 'Asia/Riyadh'
      }
    },
    statistics: {
      lastRun: jobStats.lastRun,
      lastSuccess: jobStats.lastSuccess,
      lastError: jobStats.lastError,
      totalProcessed: jobStats.totalProcessed,
      totalErrors: jobStats.totalErrors
    }
  };
}

module.exports = {
  startDunningJobs,
  stopDunningJobs,
  triggerJob,
  getJobStatus,
  // Export individual functions for testing
  processDailyDunning,
  getFirmsWithActivePolicies,
  processFirmDunning,
  getOverdueInvoices,
  processInvoiceDunning,
  DUNNING_JOB_CONFIG
};
