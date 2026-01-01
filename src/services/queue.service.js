/**
 * Queue Service
 *
 * Central service for managing background jobs across all queues.
 * Provides a unified API for adding, monitoring, and managing jobs.
 */

const {
  createQueue,
  getQueue,
  getAllQueues,
  pauseQueue,
  resumeQueue,
  getQueueMetrics,
  cleanQueue
} = require('../configs/queue');

// Import all queue processors (this ensures they are registered)
require('../queues/email.queue');
require('../queues/pdf.queue');
require('../queues/notification.queue');
require('../queues/report.queue');
require('../queues/cleanup.queue');
require('../queues/sync.queue');
require('../queues/bulkActions.queue');
const activityQueue = require('../queues/activity.queue');
const auditQueue = require('../queues/audit.queue');

class QueueService {
  /**
   * Add a job to a queue
   * @param {string} queueName - Name of the queue
   * @param {Object} data - Job data
   * @param {Object} options - Job options (delay, priority, etc.)
   * @returns {Promise<Object>} Job object
   */
  static async addJob(queueName, data, options = {}) {
    let queue = getQueue(queueName);

    if (!queue) {
      queue = createQueue(queueName);
    }

    const job = await queue.add(data, {
      ...options,
      jobId: options.jobId || `${queueName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });

    // Removed verbose logging for performance

    return {
      jobId: job.id,
      queueName,
      data: job.data,
      options: job.opts
    };
  }

  /**
   * Add multiple jobs to a queue at once
   * @param {string} queueName - Name of the queue
   * @param {Array} jobs - Array of job objects with data and options
   * @returns {Promise<Array>} Array of job objects
   */
  static async addBulkJobs(queueName, jobs) {
    let queue = getQueue(queueName);

    if (!queue) {
      queue = createQueue(queueName);
    }

    const bulkJobs = jobs.map(job => ({
      data: job.data,
      opts: job.options || {}
    }));

    const addedJobs = await queue.addBulk(bulkJobs);

    // Removed verbose logging for performance

    return addedJobs.map(job => ({
      jobId: job.id,
      queueName,
      data: job.data,
      options: job.opts
    }));
  }

  /**
   * Get job status
   * @param {string} queueName - Name of the queue
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Job status
   */
  static async getJobStatus(queueName, jobId) {
    const queue = getQueue(queueName);

    if (!queue) {
      throw new Error(`Queue "${queueName}" not found`);
    }

    const job = await queue.getJob(jobId);

    if (!job) {
      throw new Error(`Job "${jobId}" not found in queue "${queueName}"`);
    }

    const state = await job.getState();
    const progress = job.progress();
    const failedReason = job.failedReason;
    const returnValue = job.returnvalue;

    return {
      jobId: job.id,
      queueName,
      state,
      progress,
      data: job.data,
      options: job.opts,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason,
      returnValue,
      attemptsMade: job.attemptsMade,
      stacktrace: job.stacktrace
    };
  }

  /**
   * Get all jobs in a queue by status
   * @param {string} queueName - Name of the queue
   * @param {string} status - Job status (waiting, active, completed, failed, delayed)
   * @param {number} start - Start index
   * @param {number} end - End index
   * @returns {Promise<Array>} Array of jobs
   */
  static async getJobs(queueName, status = 'waiting', start = 0, end = 10) {
    const queue = getQueue(queueName);

    if (!queue) {
      throw new Error(`Queue "${queueName}" not found`);
    }

    const validStatuses = ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused'];

    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status "${status}". Must be one of: ${validStatuses.join(', ')}`);
    }

    const jobs = await queue.getJobs([status], start, end);

    return Promise.all(jobs.map(async job => {
      const state = await job.getState();
      return {
        jobId: job.id,
        state,
        progress: job.progress(),
        data: job.data,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade
      };
    }));
  }

  /**
   * Retry a failed job
   * @param {string} queueName - Name of the queue
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Retried job
   */
  static async retryJob(queueName, jobId) {
    const queue = getQueue(queueName);

    if (!queue) {
      throw new Error(`Queue "${queueName}" not found`);
    }

    const job = await queue.getJob(jobId);

    if (!job) {
      throw new Error(`Job "${jobId}" not found in queue "${queueName}"`);
    }

    const state = await job.getState();

    if (state !== 'failed') {
      throw new Error(`Job "${jobId}" is not in failed state (current state: ${state})`);
    }

    await job.retry();

    // Removed verbose logging for performance

    return {
      jobId: job.id,
      queueName,
      message: 'Job is being retried'
    };
  }

  /**
   * Remove a job from a queue
   * @param {string} queueName - Name of the queue
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Result
   */
  static async removeJob(queueName, jobId) {
    const queue = getQueue(queueName);

    if (!queue) {
      throw new Error(`Queue "${queueName}" not found`);
    }

    const job = await queue.getJob(jobId);

    if (!job) {
      throw new Error(`Job "${jobId}" not found in queue "${queueName}"`);
    }

    await job.remove();

    // Removed verbose logging for performance

    return {
      jobId,
      queueName,
      message: 'Job removed successfully'
    };
  }

  /**
   * Pause a queue
   * @param {string} queueName - Name of the queue
   * @returns {Promise<Object>} Result
   */
  static async pauseQueue(queueName) {
    const success = await pauseQueue(queueName);

    if (!success) {
      throw new Error(`Queue "${queueName}" not found`);
    }

    return {
      queueName,
      message: 'Queue paused successfully'
    };
  }

  /**
   * Resume a paused queue
   * @param {string} queueName - Name of the queue
   * @returns {Promise<Object>} Result
   */
  static async resumeQueue(queueName) {
    const success = await resumeQueue(queueName);

    if (!success) {
      throw new Error(`Queue "${queueName}" not found`);
    }

    return {
      queueName,
      message: 'Queue resumed successfully'
    };
  }

  /**
   * Get queue metrics/statistics
   * @param {string} queueName - Name of the queue
   * @returns {Promise<Object>} Queue metrics
   */
  static async getQueueStats(queueName) {
    const metrics = await getQueueMetrics(queueName);

    if (!metrics) {
      throw new Error(`Queue "${queueName}" not found`);
    }

    return metrics;
  }

  /**
   * Get all queues with their metrics
   * @returns {Promise<Array>} Array of queue metrics
   */
  static async getAllQueuesStats() {
    const queues = getAllQueues();
    const stats = [];

    for (const [name] of queues) {
      const metrics = await getQueueMetrics(name);
      stats.push(metrics);
    }

    return stats;
  }

  /**
   * Clean old jobs from a queue
   * @param {string} queueName - Name of the queue
   * @param {number} gracePeriodMs - Grace period in milliseconds
   * @param {string} type - Job type to clean (completed, failed, etc.)
   * @returns {Promise<Object>} Result
   */
  static async cleanJobs(queueName, gracePeriodMs = 86400000, type = 'completed') {
    const jobs = await cleanQueue(queueName, gracePeriodMs, type);

    return {
      queueName,
      type,
      cleanedCount: jobs.length,
      message: `${jobs.length} ${type} jobs cleaned`
    };
  }

  /**
   * Get job counts by status
   * @param {string} queueName - Name of the queue
   * @returns {Promise<Object>} Job counts
   */
  static async getJobCounts(queueName) {
    const queue = getQueue(queueName);

    if (!queue) {
      throw new Error(`Queue "${queueName}" not found`);
    }

    const counts = await queue.getJobCounts();

    return {
      queueName,
      ...counts
    };
  }

  /**
   * Empty a queue (remove all jobs)
   * @param {string} queueName - Name of the queue
   * @returns {Promise<Object>} Result
   */
  static async emptyQueue(queueName) {
    const queue = getQueue(queueName);

    if (!queue) {
      throw new Error(`Queue "${queueName}" not found`);
    }

    await queue.empty();

    // Removed verbose logging for performance

    return {
      queueName,
      message: 'Queue emptied successfully'
    };
  }

  // ==================== CONVENIENCE METHODS ====================

  /**
   * Send email via queue
   */
  static async sendEmail(emailData, options = {}) {
    return this.addJob('email', {
      type: 'transactional',
      data: emailData
    }, options);
  }

  /**
   * Send bulk emails via queue
   */
  static async sendBulkEmails(recipients, subject, html, options = {}) {
    return this.addJob('email', {
      type: 'bulk',
      data: { recipients, subject, html }
    }, options);
  }

  /**
   * Generate PDF via queue
   */
  static async generatePDF(pdfData, pdfType = 'invoice', options = {}) {
    return this.addJob('pdf', {
      type: pdfType,
      data: pdfData
    }, options);
  }

  /**
   * Send push notification via queue
   */
  static async sendNotification(notificationData, notificationType = 'in-app', options = {}) {
    return this.addJob('notification', {
      type: notificationType,
      data: notificationData
    }, options);
  }

  /**
   * Create notification via queue (Gold Standard - fire-and-forget)
   *
   * This mirrors Notification.createNotification() but is non-blocking.
   * Use this instead of Notification.create() or Notification.createNotification().
   *
   * @param {Object} notificationData - Notification data
   * @param {string} notificationData.firmId - Firm ID (required for firm members)
   * @param {string} notificationData.userId - User ID (required)
   * @param {string} notificationData.type - Notification type (e.g., 'system', 'alert')
   * @param {string} notificationData.title - Notification title
   * @param {string} notificationData.titleAr - Arabic title (optional)
   * @param {string} notificationData.message - Notification message
   * @param {string} notificationData.messageAr - Arabic message (optional)
   * @param {string} notificationData.entityType - Entity type (optional)
   * @param {string} notificationData.entityId - Entity ID (optional)
   * @param {string} notificationData.link - Navigation link (optional)
   * @param {Object} notificationData.data - Additional data (optional)
   * @param {string} notificationData.priority - Priority level (optional)
   * @param {Object} options - Job options (optional)
   * @returns {Promise<Object>} Job info
   *
   * @example
   * // Fire-and-forget notification
   * QueueService.createNotification({
   *   firmId: req.firmId,
   *   userId: approver.userId,
   *   type: 'invoice_approval_required',
   *   title: 'Invoice Approval Required',
   *   message: `Invoice ${invoice.number} requires your approval`,
   *   entityType: 'invoice',
   *   entityId: invoice._id
   * });
   */
  static async createNotification(notificationData, options = {}) {
    return this.addJob('notification', {
      type: 'create',
      data: notificationData
    }, options);
  }

  /**
   * Generate report via queue
   */
  static async generateReport(reportData, reportType, options = {}) {
    return this.addJob('report', {
      type: reportType,
      data: reportData
    }, options);
  }

  /**
   * Schedule cleanup task
   */
  static async scheduleCleanup(cleanupType, cleanupData = {}, options = {}) {
    return this.addJob('cleanup', {
      type: cleanupType,
      data: cleanupData
    }, options);
  }

  /**
   * Schedule sync task
   */
  static async scheduleSync(syncType, syncData, options = {}) {
    return this.addJob('sync', {
      type: syncType,
      data: syncData
    }, options);
  }

  /**
   * Log CRM activity via queue (Gold Standard - fire-and-forget)
   *
   * This is the recommended way to log activities. It:
   * - Returns immediately (2ms) instead of waiting for DB write (30ms)
   * - Has automatic retry with exponential backoff
   * - Uses Dead Letter Queue for failed jobs
   * - Never blocks or fails the primary operation
   *
   * @param {Object} activityData - Activity data
   * @param {string} activityData.lawyerId - User ID (required)
   * @param {string} activityData.firmId - Firm ID (optional, for firm members)
   * @param {string} activityData.type - Activity type (e.g., 'appointment_deleted')
   * @param {string} activityData.entityType - Entity type (e.g., 'appointment')
   * @param {string} activityData.entityId - Entity ID (required)
   * @param {string} activityData.entityName - Entity name for display
   * @param {string} activityData.title - Activity title
   * @param {string} activityData.description - Activity description (optional)
   * @param {string} activityData.performedBy - User who performed action (optional)
   * @param {Object} options - Job options (optional)
   * @returns {Promise<Object>} Job info
   *
   * @example
   * // Fire-and-forget activity logging
   * await QueueService.logActivity({
   *   lawyerId: req.userID,
   *   firmId: req.firmId,
   *   type: 'appointment_deleted',
   *   entityType: 'appointment',
   *   entityId: appointment._id,
   *   entityName: appointment.appointmentNumber,
   *   title: `Appointment deleted: ${appointment.appointmentNumber}`,
   *   description: `Deleted appointment with ${appointment.customerName}`,
   *   performedBy: req.userID
   * });
   */
  static async logActivity(activityData, options = {}) {
    return activityQueue.addActivity(activityData, options);
  }

  /**
   * Log multiple CRM activities via queue (for bulk operations)
   *
   * @param {Array} activities - Array of activity data objects
   * @param {Object} options - Job options (optional)
   * @returns {Promise<Object>} Job info
   */
  static async logBulkActivities(activities, options = {}) {
    return activityQueue.addBulkActivities(activities, options);
  }

  /**
   * Log audit entry via queue (Gold Standard - fire-and-forget)
   *
   * This mirrors AuditLog.log() but is non-blocking.
   * Use for general audit logging where eventual consistency is acceptable.
   *
   * COMPLIANCE NOTE: For strict compliance requirements (NCA ECC-2:2024,
   * PDPL, GDPR) where the audit log MUST be written before the response
   * is sent, use AuditLog.log() directly instead.
   *
   * @param {Object} auditData - Audit log data
   * @param {string} auditData.firmId - Firm ID (for multi-tenancy)
   * @param {string} auditData.userId - User ID who performed action (required)
   * @param {string} auditData.userEmail - User email (required)
   * @param {string} auditData.userRole - User role (required)
   * @param {string} auditData.action - Action performed (e.g., 'create', 'update')
   * @param {string} auditData.entityType - Entity type (e.g., 'invoice', 'case')
   * @param {string} auditData.entityId - Entity ID
   * @param {string} auditData.ipAddress - Client IP address (required)
   * @param {string} auditData.userAgent - Client user agent
   * @param {Object} auditData.details - Additional details
   * @param {Object} options - Job options (optional)
   * @returns {Promise<Object>} Job info
   *
   * @example
   * // Fire-and-forget audit logging
   * QueueService.logAudit({
   *   firmId: req.firmId,
   *   userId: req.userID,
   *   userEmail: req.userEmail,
   *   userRole: req.userRole || 'lawyer',
   *   action: 'create_invoice',
   *   entityType: 'invoice',
   *   entityId: invoice._id,
   *   ipAddress: req.ip,
   *   userAgent: req.get('User-Agent'),
   *   details: { invoiceNumber: invoice.number }
   * });
   */
  static async logAudit(auditData, options = {}) {
    return auditQueue.addAuditLog(auditData, options);
  }

  /**
   * Log multiple audit entries via queue (for bulk operations)
   *
   * @param {Array} entries - Array of audit log entries
   * @param {Object} options - Job options (optional)
   * @returns {Promise<Object>} Job info
   */
  static async logBulkAudit(entries, options = {}) {
    return auditQueue.addBulkAuditLogs(entries, options);
  }
}

module.exports = QueueService;
