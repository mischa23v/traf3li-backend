/**
 * Bulk Actions Service - Enterprise Bulk Operations Framework
 *
 * This service provides a unified framework for executing bulk operations
 * across different entity types with support for:
 * - Batch processing with configurable batch sizes
 * - Progress tracking for long-running operations
 * - Job queue integration for async processing
 * - Granular success/failure reporting
 * - Permission validation at entity level
 * - Audit trail for all bulk operations
 *
 * Supported entity types and actions:
 * - invoices: delete, send, void, export, remind
 * - clients: delete, merge, export, archive
 * - payments: delete, export, void
 * - expenses: delete, approve, reject, export
 * - cases: archive, export, close
 * - time_entries: approve, reject, invoice, delete
 *
 * @module services/bulkActions.service
 */

const mongoose = require('mongoose');
const {
  Invoice,
  Client,
  Payment,
  Expense,
  Case
} = require('../models');
const TimeEntry = require('../models/timeEntry.model');
const QueueService = require('./queue.service');
const AuditLogService = require('./auditLog.service');
const NotificationDeliveryService = require('./notificationDelivery.service');
const logger = require('../utils/logger');
const { CustomException } = require('../utils');

// Configuration
const BATCH_SIZE = 50; // Process entities in batches
const MAX_BULK_SIZE = 1000; // Maximum entities per bulk operation

// In-memory job tracking (in production, use Redis or similar)
const jobStore = new Map();

/**
 * Entity type to model mapping
 */
const ENTITY_MODEL_MAP = {
  invoices: Invoice,
  clients: Client,
  payments: Payment,
  expenses: Expense,
  cases: Case,
  time_entries: TimeEntry
};

/**
 * Supported actions per entity type
 */
const SUPPORTED_ACTIONS = {
  invoices: ['delete', 'send', 'void', 'export', 'remind'],
  clients: ['delete', 'merge', 'export', 'archive'],
  payments: ['delete', 'export', 'void'],
  expenses: ['delete', 'approve', 'reject', 'export'],
  cases: ['archive', 'export', 'close'],
  time_entries: ['approve', 'reject', 'invoice', 'delete']
};

class BulkActionsService {
  /**
   * Execute bulk action on entities
   * @param {String} actionType - Action type (delete, update, export, etc.)
   * @param {String} entityType - Entity type (invoices, clients, etc.)
   * @param {Array<String>} entityIds - Array of entity IDs
   * @param {Object} params - Action-specific parameters
   * @param {String} userId - User ID executing the action
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object>} - Results with success/failure counts
   */
  static async executeBulkAction(actionType, entityType, entityIds, params = {}, userId, firmId) {
    try {
      // Validate inputs
      if (!actionType || !entityType || !entityIds || !userId || !firmId) {
        throw new Error('Missing required parameters');
      }

      if (!Array.isArray(entityIds) || entityIds.length === 0) {
        throw new Error('Entity IDs must be a non-empty array');
      }

      if (entityIds.length > MAX_BULK_SIZE) {
        throw new Error(`Bulk operation cannot exceed ${MAX_BULK_SIZE} entities`);
      }

      // Validate entity type and action
      if (!SUPPORTED_ACTIONS[entityType]) {
        throw new Error(`Unsupported entity type: ${entityType}`);
      }

      if (!SUPPORTED_ACTIONS[entityType].includes(actionType)) {
        throw new Error(
          `Unsupported action '${actionType}' for entity type '${entityType}'`
        );
      }

      // Validate bulk action (check permissions and entity existence)
      const validation = await this.validateBulkAction(
        actionType,
        entityType,
        entityIds,
        firmId
      );

      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // For large operations, use job queue
      if (entityIds.length > BATCH_SIZE) {
        const jobId = await this._executeAsyncBulkAction(
          actionType,
          entityType,
          entityIds,
          params,
          userId,
          firmId
        );

        return {
          jobId,
          status: 'queued',
          message: 'Bulk action queued for processing',
          totalEntities: entityIds.length
        };
      }

      // For small operations, execute synchronously
      const results = await this._executeBulkActionSync(
        actionType,
        entityType,
        entityIds,
        params,
        userId,
        firmId
      );

      // Log to audit
      await AuditLogService.log(
        `bulk_${actionType}`,
        entityType,
        null,
        null,
        {
          userId,
          firmId,
          details: {
            actionType,
            entityType,
            totalEntities: entityIds.length,
            successCount: results.successCount,
            failureCount: results.failureCount
          }
        }
      );

      return results;
    } catch (error) {
      logger.error('BulkActionsService.executeBulkAction failed:', error.message);
      throw error;
    }
  }

  /**
   * Execute bulk action synchronously
   * @private
   */
  static async _executeBulkActionSync(
    actionType,
    entityType,
    entityIds,
    params,
    userId,
    firmId
  ) {
    const results = {
      successCount: 0,
      failureCount: 0,
      errors: [],
      data: []
    };

    // Get action handler
    const handler = this._getActionHandler(actionType, entityType);

    // Process each entity
    for (const entityId of entityIds) {
      try {
        const result = await handler(entityId, params, userId, firmId);
        results.successCount++;
        results.data.push({
          entityId,
          status: 'success',
          result
        });
      } catch (error) {
        results.failureCount++;
        results.errors.push({
          entityId,
          error: error.message
        });
        logger.error(
          `Bulk action ${actionType} failed for ${entityType} ${entityId}:`,
          error.message
        );
      }
    }

    // Log activity
    QueueService.logTeamActivity({
      firmId,
      userId,
      action: `bulk_${actionType}`,
      targetType: entityType,
      details: {
        totalEntities: entityIds.length,
        successCount: results.successCount,
        failureCount: results.failureCount
      },
      timestamp: new Date()
    });

    return results;
  }

  /**
   * Execute bulk action asynchronously via job queue
   * @private
   */
  static async _executeAsyncBulkAction(
    actionType,
    entityType,
    entityIds,
    params,
    userId,
    firmId
  ) {
    const jobId = `bulk-${entityType}-${actionType}-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Initialize job tracking
    jobStore.set(jobId, {
      jobId,
      actionType,
      entityType,
      totalEntities: entityIds.length,
      processedCount: 0,
      successCount: 0,
      failureCount: 0,
      status: 'queued',
      errors: [],
      createdAt: new Date(),
      userId,
      firmId
    });

    // Add job to queue
    await QueueService.addJob(
      'bulk-actions',
      {
        jobId,
        actionType,
        entityType,
        entityIds,
        params,
        userId,
        firmId
      },
      {
        jobId,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        }
      }
    );

    logger.info(`Bulk action job ${jobId} queued`, {
      actionType,
      entityType,
      totalEntities: entityIds.length
    });

    return jobId;
  }

  /**
   * Process bulk action job (called by queue processor)
   * @param {Object} jobData - Job data from queue
   */
  static async processBulkActionJob(jobData) {
    const { jobId, actionType, entityType, entityIds, params, userId, firmId } = jobData;

    try {
      // Update job status
      const job = jobStore.get(jobId);
      if (job) {
        job.status = 'processing';
        job.startedAt = new Date();
      }

      // Get action handler
      const handler = this._getActionHandler(actionType, entityType);

      // Process in batches
      const batches = this._chunkArray(entityIds, BATCH_SIZE);

      for (const batch of batches) {
        for (const entityId of batch) {
          try {
            await handler(entityId, params, userId, firmId);

            // Update job progress
            if (job) {
              job.processedCount++;
              job.successCount++;
              job.progress = Math.round((job.processedCount / job.totalEntities) * 100);
            }
          } catch (error) {
            // Record error but continue processing
            if (job) {
              job.processedCount++;
              job.failureCount++;
              job.errors.push({
                entityId,
                error: error.message
              });
              job.progress = Math.round((job.processedCount / job.totalEntities) * 100);
            }

            logger.error(
              `Bulk job ${jobId} - failed for entity ${entityId}:`,
              error.message
            );
          }
        }
      }

      // Mark job as completed
      if (job) {
        job.status = 'completed';
        job.completedAt = new Date();
      }

      // Log to audit
      await AuditLogService.log(
        `bulk_${actionType}_completed`,
        entityType,
        null,
        null,
        {
          userId,
          firmId,
          details: {
            jobId,
            actionType,
            entityType,
            totalEntities: entityIds.length,
            successCount: job?.successCount || 0,
            failureCount: job?.failureCount || 0
          }
        }
      );

      // Log activity
      QueueService.logTeamActivity({
        firmId,
        userId,
        action: `bulk_${actionType}_completed`,
        targetType: entityType,
        details: {
          jobId,
          totalEntities: entityIds.length,
          successCount: job?.successCount || 0,
          failureCount: job?.failureCount || 0
        },
        timestamp: new Date()
      });

      return job;
    } catch (error) {
      logger.error(`Bulk job ${jobId} failed:`, error.message);

      // Mark job as failed
      const job = jobStore.get(jobId);
      if (job) {
        job.status = 'failed';
        job.error = error.message;
        job.completedAt = new Date();
      }

      throw error;
    }
  }

  /**
   * Validate bulk action
   * @param {String} actionType - Action type
   * @param {String} entityType - Entity type
   * @param {Array<String>} entityIds - Entity IDs
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object>} - Validation result
   */
  static async validateBulkAction(actionType, entityType, entityIds, firmId) {
    try {
      const errors = [];
      const Model = ENTITY_MODEL_MAP[entityType];

      if (!Model) {
        return {
          isValid: false,
          errors: [`Unknown entity type: ${entityType}`]
        };
      }

      // Check if all entities exist and belong to firm
      const existingEntities = await Model.find({
        _id: { $in: entityIds },
        firmId: new mongoose.Types.ObjectId(firmId)
      }).select('_id status');

      const existingIds = new Set(existingEntities.map(e => e._id.toString()));
      const missingIds = entityIds.filter(id => !existingIds.has(id.toString()));

      if (missingIds.length > 0) {
        errors.push(
          `${missingIds.length} entities not found or don't belong to this firm`
        );
      }

      // Action-specific validation
      if (actionType === 'void' && entityType === 'invoices') {
        const nonVoidableInvoices = existingEntities.filter(
          e => !['draft', 'sent', 'overdue'].includes(e.status)
        );
        if (nonVoidableInvoices.length > 0) {
          errors.push(
            `${nonVoidableInvoices.length} invoices cannot be voided (already paid or voided)`
          );
        }
      }

      if (actionType === 'delete') {
        // Additional validation for deletion
        // Check for dependencies, etc.
      }

      return {
        isValid: errors.length === 0,
        errors,
        validCount: existingIds.size,
        invalidCount: missingIds.length
      };
    } catch (error) {
      logger.error('BulkActionsService.validateBulkAction failed:', error.message);
      return {
        isValid: false,
        errors: [error.message]
      };
    }
  }

  /**
   * Get progress of long-running bulk action
   * @param {String} jobId - Job ID
   * @returns {Promise<Object|null>} - Job progress or null if not found
   */
  static async getBulkActionProgress(jobId) {
    try {
      // Check in-memory store first
      const job = jobStore.get(jobId);
      if (job) {
        return {
          jobId: job.jobId,
          actionType: job.actionType,
          entityType: job.entityType,
          status: job.status,
          progress: job.progress || 0,
          totalEntities: job.totalEntities,
          processedCount: job.processedCount,
          successCount: job.successCount,
          failureCount: job.failureCount,
          errors: job.errors || [],
          createdAt: job.createdAt,
          startedAt: job.startedAt,
          completedAt: job.completedAt
        };
      }

      // Check queue
      const queueJob = await QueueService.getJobStatus('bulk-actions', jobId);
      if (queueJob) {
        return {
          jobId: queueJob.jobId,
          status: queueJob.state,
          progress: queueJob.progress || 0,
          data: queueJob.data,
          returnValue: queueJob.returnValue,
          failedReason: queueJob.failedReason,
          createdAt: new Date(queueJob.timestamp),
          processedOn: queueJob.processedOn ? new Date(queueJob.processedOn) : null,
          finishedOn: queueJob.finishedOn ? new Date(queueJob.finishedOn) : null
        };
      }

      return null;
    } catch (error) {
      logger.error('BulkActionsService.getBulkActionProgress failed:', error.message);
      return null;
    }
  }

  /**
   * Cancel running bulk action
   * @param {String} jobId - Job ID
   * @returns {Promise<Object>} - Cancellation result
   */
  static async cancelBulkAction(jobId) {
    try {
      // Update in-memory store
      const job = jobStore.get(jobId);
      if (job && job.status === 'processing') {
        job.status = 'cancelled';
        job.completedAt = new Date();
      }

      // Try to remove from queue if not yet started
      try {
        await QueueService.removeJob('bulk-actions', jobId);
      } catch (error) {
        // Job might have already started or completed
        logger.warn(`Could not remove job ${jobId} from queue:`, error.message);
      }

      return {
        jobId,
        status: 'cancelled',
        message: 'Bulk action cancelled successfully'
      };
    } catch (error) {
      logger.error('BulkActionsService.cancelBulkAction failed:', error.message);
      throw error;
    }
  }

  /**
   * Get supported bulk actions for entity type
   * @param {String} entityType - Entity type
   * @returns {Array<String>} - Supported actions
   */
  static getSupportedBulkActions(entityType) {
    return SUPPORTED_ACTIONS[entityType] || [];
  }

  /**
   * Get all supported entity types
   * @returns {Array<String>} - Entity types
   */
  static getSupportedEntityTypes() {
    return Object.keys(SUPPORTED_ACTIONS);
  }

  // ═══════════════════════════════════════════════════════════════
  // ACTION HANDLERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get action handler for specific action and entity type
   * @private
   */
  static _getActionHandler(actionType, entityType) {
    const handlerKey = `${entityType}_${actionType}`;
    const handler = this.ACTION_HANDLERS[handlerKey];

    if (!handler) {
      throw new Error(
        `No handler found for action '${actionType}' on entity type '${entityType}'`
      );
    }

    return handler.bind(this);
  }

  /**
   * Action handlers map
   * @private
   */
  static ACTION_HANDLERS = {
    // Invoice actions
    invoices_delete: async (entityId, params, userId, firmId) => {
      const invoice = await Invoice.findOne({
        _id: entityId,
        firmId,
        status: { $in: ['draft', 'cancelled'] }
      });

      if (!invoice) {
        throw new Error('Invoice not found or cannot be deleted');
      }

      await invoice.deleteOne();
      return { deleted: true };
    },

    invoices_send: async (entityId, params, userId, firmId) => {
      const invoice = await Invoice.findOne({
        _id: entityId,
        firmId,
        status: { $in: ['draft', 'sent'] }
      }).populate('clientId', 'email name');

      if (!invoice) {
        throw new Error('Invoice not found or cannot be sent');
      }

      if (!invoice.clientId?.email) {
        throw new Error('Client email not found');
      }

      // Update status to sent
      invoice.status = 'sent';
      invoice.sentAt = new Date();
      await invoice.save();

      // Queue email sending
      await NotificationDeliveryService.sendEmail({
        to: invoice.clientId.email,
        subject: `Invoice ${invoice.invoiceNumber} from ${params.firmName || 'Your Firm'}`,
        message: `Your invoice ${invoice.invoiceNumber} is ready for payment.`,
        userName: invoice.clientId.name,
        data: {
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          link: params.invoiceLink || `/invoices/${invoice._id}`
        }
      });

      return { sent: true, email: invoice.clientId.email };
    },

    invoices_void: async (entityId, params, userId, firmId) => {
      const invoice = await Invoice.findOne({
        _id: entityId,
        firmId,
        status: { $in: ['draft', 'sent', 'overdue'] }
      });

      if (!invoice) {
        throw new Error('Invoice not found or cannot be voided');
      }

      invoice.status = 'cancelled';
      invoice.voidedAt = new Date();
      invoice.voidedBy = userId;
      invoice.voidReason = params.reason || 'Bulk void operation';
      await invoice.save();

      return { voided: true };
    },

    invoices_export: async (entityId, params, userId, firmId) => {
      const invoice = await Invoice.findOne({ _id: entityId, firmId })
        .populate('clientId')
        .lean();

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      return invoice;
    },

    invoices_remind: async (entityId, params, userId, firmId) => {
      const invoice = await Invoice.findOne({
        _id: entityId,
        firmId,
        status: { $in: ['sent', 'overdue'] }
      }).populate('clientId', 'email name');

      if (!invoice) {
        throw new Error('Invoice not found or not in remindable status');
      }

      if (!invoice.clientId?.email) {
        throw new Error('Client email not found');
      }

      await NotificationDeliveryService.sendEmail({
        to: invoice.clientId.email,
        subject: `Payment Reminder: Invoice ${invoice.invoiceNumber}`,
        message: `This is a reminder that invoice ${invoice.invoiceNumber} is awaiting payment.`,
        userName: invoice.clientId.name,
        data: {
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber
        }
      });

      return { reminded: true };
    },

    // Client actions
    clients_delete: async (entityId, params, userId, firmId) => {
      // Check for dependencies
      const invoiceCount = await Invoice.countDocuments({
        clientId: entityId,
        firmId
      });

      if (invoiceCount > 0 && !params.force) {
        throw new Error('Client has associated invoices. Use force=true to delete anyway.');
      }

      const client = await Client.findOne({ _id: entityId, firmId });
      if (!client) {
        throw new Error('Client not found');
      }

      await client.deleteOne();
      return { deleted: true };
    },

    clients_archive: async (entityId, params, userId, firmId) => {
      const client = await Client.findOne({ _id: entityId, firmId });
      if (!client) {
        throw new Error('Client not found');
      }

      client.status = 'archived';
      client.archivedAt = new Date();
      client.archivedBy = userId;
      await client.save();

      return { archived: true };
    },

    clients_export: async (entityId, params, userId, firmId) => {
      const client = await Client.findOne({ _id: entityId, firmId }).lean();
      if (!client) {
        throw new Error('Client not found');
      }
      return client;
    },

    clients_merge: async (entityId, params, userId, firmId) => {
      // This requires a target client ID
      if (!params.targetClientId) {
        throw new Error('Target client ID required for merge operation');
      }

      // Move all related records to target client
      await Invoice.updateMany(
        { clientId: entityId, firmId },
        { $set: { clientId: params.targetClientId } }
      );

      await Payment.updateMany(
        { clientId: entityId, firmId },
        { $set: { clientId: params.targetClientId } }
      );

      // Delete source client
      await Client.findOneAndDelete({ _id: entityId, firmId });

      return { merged: true, targetClientId: params.targetClientId };
    },

    // Payment actions
    payments_delete: async (entityId, params, userId, firmId) => {
      const payment = await Payment.findOne({
        _id: entityId,
        firmId,
        status: { $in: ['draft', 'cancelled'] }
      });

      if (!payment) {
        throw new Error('Payment not found or cannot be deleted');
      }

      await payment.deleteOne();
      return { deleted: true };
    },

    payments_void: async (entityId, params, userId, firmId) => {
      const payment = await Payment.findOne({
        _id: entityId,
        firmId,
        status: 'completed'
      });

      if (!payment) {
        throw new Error('Payment not found or cannot be voided');
      }

      payment.status = 'voided';
      payment.voidedAt = new Date();
      payment.voidedBy = userId;
      await payment.save();

      return { voided: true };
    },

    payments_export: async (entityId, params, userId, firmId) => {
      const payment = await Payment.findOne({ _id: entityId, firmId })
        .populate('clientId')
        .lean();

      if (!payment) {
        throw new Error('Payment not found');
      }

      return payment;
    },

    // Expense actions
    expenses_delete: async (entityId, params, userId, firmId) => {
      const expense = await Expense.findOne({
        _id: entityId,
        firmId,
        status: { $in: ['draft', 'rejected'] }
      });

      if (!expense) {
        throw new Error('Expense not found or cannot be deleted');
      }

      await expense.deleteOne();
      return { deleted: true };
    },

    expenses_approve: async (entityId, params, userId, firmId) => {
      const expense = await Expense.findOne({
        _id: entityId,
        firmId,
        status: 'pending'
      });

      if (!expense) {
        throw new Error('Expense not found or not pending approval');
      }

      expense.status = 'approved';
      expense.approvedAt = new Date();
      expense.approvedBy = userId;
      await expense.save();

      return { approved: true };
    },

    expenses_reject: async (entityId, params, userId, firmId) => {
      const expense = await Expense.findOne({
        _id: entityId,
        firmId,
        status: 'pending'
      });

      if (!expense) {
        throw new Error('Expense not found or not pending approval');
      }

      expense.status = 'rejected';
      expense.rejectedAt = new Date();
      expense.rejectedBy = userId;
      expense.rejectionReason = params.reason || 'Bulk rejection';
      await expense.save();

      return { rejected: true };
    },

    expenses_export: async (entityId, params, userId, firmId) => {
      const expense = await Expense.findOne({ _id: entityId, firmId })
        .populate('submittedBy')
        .lean();

      if (!expense) {
        throw new Error('Expense not found');
      }

      return expense;
    },

    // Case actions
    cases_archive: async (entityId, params, userId, firmId) => {
      const caseDoc = await Case.findOne({ _id: entityId, firmId });

      if (!caseDoc) {
        throw new Error('Case not found');
      }

      caseDoc.status = 'archived';
      caseDoc.archivedAt = new Date();
      caseDoc.archivedBy = userId;
      await caseDoc.save();

      return { archived: true };
    },

    cases_close: async (entityId, params, userId, firmId) => {
      const caseDoc = await Case.findOne({ _id: entityId, firmId });

      if (!caseDoc) {
        throw new Error('Case not found');
      }

      caseDoc.status = 'closed';
      caseDoc.closedAt = new Date();
      caseDoc.closedBy = userId;
      await caseDoc.save();

      return { closed: true };
    },

    cases_export: async (entityId, params, userId, firmId) => {
      const caseDoc = await Case.findOne({ _id: entityId, firmId })
        .populate('clientId')
        .populate('assignedTo')
        .lean();

      if (!caseDoc) {
        throw new Error('Case not found');
      }

      return caseDoc;
    },

    // Time Entry actions
    time_entries_approve: async (entityId, params, userId, firmId) => {
      const timeEntry = await TimeEntry.findOne({
        _id: entityId,
        firmId,
        status: 'pending'
      });

      if (!timeEntry) {
        throw new Error('Time entry not found or not pending approval');
      }

      timeEntry.status = 'approved';
      timeEntry.approvedAt = new Date();
      timeEntry.approvedBy = userId;
      await timeEntry.save();

      return { approved: true };
    },

    time_entries_reject: async (entityId, params, userId, firmId) => {
      const timeEntry = await TimeEntry.findOne({
        _id: entityId,
        firmId,
        status: 'pending'
      });

      if (!timeEntry) {
        throw new Error('Time entry not found or not pending approval');
      }

      timeEntry.status = 'rejected';
      timeEntry.rejectedAt = new Date();
      timeEntry.rejectedBy = userId;
      await timeEntry.save();

      return { rejected: true };
    },

    time_entries_invoice: async (entityId, params, userId, firmId) => {
      const timeEntry = await TimeEntry.findOne({
        _id: entityId,
        firmId,
        status: 'approved',
        invoiced: false
      });

      if (!timeEntry) {
        throw new Error('Time entry not found or already invoiced');
      }

      timeEntry.invoiced = true;
      timeEntry.invoicedAt = new Date();
      if (params.invoiceId) {
        timeEntry.invoiceId = params.invoiceId;
      }
      await timeEntry.save();

      return { invoiced: true };
    },

    time_entries_delete: async (entityId, params, userId, firmId) => {
      const timeEntry = await TimeEntry.findOne({
        _id: entityId,
        firmId,
        status: { $in: ['draft', 'rejected'] }
      });

      if (!timeEntry) {
        throw new Error('Time entry not found or cannot be deleted');
      }

      await timeEntry.deleteOne();
      return { deleted: true };
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Chunk array into smaller batches
   * @private
   */
  static _chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

module.exports = BulkActionsService;
