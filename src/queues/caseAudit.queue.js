/**
 * Case Audit Queue Processor (Gold Standard)
 *
 * Handles asynchronous case audit logging.
 * Audit logging is a non-critical operation that should never
 * block or fail the primary business operation.
 *
 * Benefits:
 * - Faster API responses (2ms queue push vs 30ms DB write)
 * - Guaranteed delivery with retry logic
 * - Dead Letter Queue for failed jobs
 * - Non-blocking - primary operations always succeed
 */

const { createQueue } = require('../configs/queue');
const logger = require('../utils/logger');

// Create case audit queue with optimized settings for logging
const caseAuditQueue = createQueue('caseAudit', {
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000
        },
        removeOnComplete: {
            age: 3600,
            count: 500
        },
        removeOnFail: {
            age: 86400,
            count: 100
        }
    }
});

/**
 * Process case audit jobs
 */
caseAuditQueue.process(async (job) => {
    const { type, data } = job.data;

    logger.info(`📋 Processing case audit job ${job.id} of type: ${type}`);

    try {
        switch (type) {
            case 'log':
                return await logCaseAudit(data, job);

            case 'bulk':
                return await logBulkCaseAudits(data, job);

            default:
                throw new Error(`Unknown case audit type: ${type}`);
        }
    } catch (error) {
        logger.error(`❌ Case audit job ${job.id} failed:`, error.message);
        throw error;
    }
});

/**
 * Log a single case audit entry
 */
async function logCaseAudit(data, job) {
    const {
        caseId,
        action,
        userId,
        firmId,
        lawyerId,
        changes,
        details,
        ipAddress,
        userAgent
    } = data;

    await job.progress(30);

    // Import model dynamically to avoid circular dependencies
    const CaseAuditLog = require('../models/caseAuditLog.model');

    await job.progress(60);

    // Build audit data
    const auditData = {
        caseId,
        action,
        userId
    };

    // Optional fields
    if (firmId) auditData.firmId = firmId;
    if (lawyerId) auditData.lawyerId = lawyerId;
    if (changes) auditData.changes = changes;
    if (details) auditData.details = details;
    if (ipAddress) auditData.ipAddress = ipAddress;
    if (userAgent) auditData.userAgent = userAgent;

    // Create audit record using model's log method or direct create
    let audit;
    if (typeof CaseAuditLog.log === 'function') {
        audit = await CaseAuditLog.log(auditData);
    } else {
        audit = await CaseAuditLog.create(auditData);
    }

    await job.progress(100);

    logger.info(`✅ Case audit logged: ${action} for case ${caseId}`);
    return {
        success: true,
        auditId: audit?._id
    };
}

/**
 * Log multiple case audits in bulk
 */
async function logBulkCaseAudits(data, job) {
    const { audits } = data;

    const CaseAuditLog = require('../models/caseAuditLog.model');
    const results = [];
    const total = audits.length;

    for (let i = 0; i < audits.length; i++) {
        const audit = audits[i];

        try {
            const auditData = {
                caseId: audit.caseId,
                action: audit.action,
                userId: audit.userId
            };

            if (audit.firmId) auditData.firmId = audit.firmId;
            if (audit.lawyerId) auditData.lawyerId = audit.lawyerId;
            if (audit.changes) auditData.changes = audit.changes;
            if (audit.details) auditData.details = audit.details;
            if (audit.ipAddress) auditData.ipAddress = audit.ipAddress;
            if (audit.userAgent) auditData.userAgent = audit.userAgent;

            let record;
            if (typeof CaseAuditLog.log === 'function') {
                record = await CaseAuditLog.log(auditData);
            } else {
                record = await CaseAuditLog.create(auditData);
            }

            results.push({
                caseId: audit.caseId,
                success: true,
                auditId: record?._id
            });
        } catch (error) {
            logger.error(`Failed to log case audit for ${audit.caseId}:`, error.message);
            results.push({
                caseId: audit.caseId,
                success: false,
                error: error.message
            });
        }

        await job.progress(Math.floor(((i + 1) / total) * 100));
    }

    const successCount = results.filter(r => r.success).length;
    logger.info(`✅ Bulk case audits logged: ${successCount}/${total}`);

    return {
        success: true,
        total,
        successCount,
        failedCount: total - successCount,
        results
    };
}

/**
 * Helper function to add case audit to queue (fire-and-forget)
 */
caseAuditQueue.addAudit = async function(data, options = {}) {
    return this.add({
        type: 'log',
        data
    }, {
        ...options,
        jobId: `case-audit-${data.action}-${data.caseId}-${Date.now()}`
    });
};

/**
 * Helper function to add multiple case audits to queue
 */
caseAuditQueue.addBulkAudits = async function(audits, options = {}) {
    return this.add({
        type: 'bulk',
        data: { audits }
    }, {
        ...options,
        jobId: `bulk-case-audit-${Date.now()}`
    });
};

module.exports = caseAuditQueue;
