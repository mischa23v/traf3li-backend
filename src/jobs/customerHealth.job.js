/**
 * Customer Health Job Scheduler for TRAF3LI
 *
 * Automated tasks for customer success and churn prevention:
 * - Daily health score calculations for all firms
 * - Twice-daily checks for at-risk firms and intervention triggers
 * - Weekly churn reports (Mondays at 9 AM)
 * - Weekly cleanup of old health score records (keep 90 days)
 * - Hourly sync of aggregate churn metrics
 *
 * Health Score Calculation:
 * - Subscription Status (30 points): Active paid plan vs trial vs free
 * - Activity Level (25 points): Last activity timestamp
 * - Usage Metrics (25 points): Cases, clients, users vs plan limits
 * - Account Stability (20 points): Account age and tenure
 *
 * Categories:
 * - Healthy: 80-100 points
 * - At-Risk: 60-79 points
 * - Critical: 0-59 points
 */

const cron = require('node-cron');
const { Firm, User, Notification } = require('../models');
const customerHealthQueue = require('../queues/customerHealth.queue');
const logger = require('../utils/logger');

// Job configuration
const HEALTH_SCORE_JOB_CONFIG = {
  calculateAll: {
    cron: '0 2 * * *', // Daily at 2 AM
    timeout: 30 * 60 * 1000, // 30 minutes
    retries: 3
  },
  processInterventions: {
    cron: '0 9,14 * * *', // Twice daily at 9 AM and 2 PM
    timeout: 15 * 60 * 1000,
    retries: 2
  },
  weeklyReport: {
    cron: '0 9 * * 1', // Mondays at 9 AM
    timeout: 10 * 60 * 1000,
    retries: 1
  },
  cleanup: {
    cron: '0 3 * * 0', // Sundays at 3 AM
    timeout: 20 * 60 * 1000,
    retries: 1
  },
  syncMetrics: {
    cron: '0 * * * *', // Every hour
    timeout: 5 * 60 * 1000,
    retries: 2
  }
};

// Track running jobs
let jobsRunning = {
  calculateAll: false,
  processInterventions: false,
  weeklyReport: false,
  cleanup: false,
  syncMetrics: false
};

/**
 * Calculate health scores for all firms
 * Runs daily at 2 AM
 */
const calculateAllHealthScores = async () => {
  if (jobsRunning.calculateAll) {
    logger.info('[CustomerHealth] Calculate all job still running, skipping...');
    return;
  }

  jobsRunning.calculateAll = true;

  try {
    const startTime = Date.now();
    logger.info('[CustomerHealth] Starting daily health score calculation...');

    // Get all active firms
    const firms = await Firm.find({
      status: { $ne: 'deleted' }
    }).select('_id name');

    if (firms.length === 0) {
      logger.info('[CustomerHealth] No firms found to process');
      return { success: true, processed: 0 };
    }

    logger.info(`[CustomerHealth] Found ${firms.length} firms to process`);

    // Process in batches of 50
    const BATCH_SIZE = 50;
    const firmIds = firms.map(f => f._id.toString());

    let totalBatches = Math.ceil(firmIds.length / BATCH_SIZE);
    let processedBatches = 0;

    for (let i = 0; i < firmIds.length; i += BATCH_SIZE) {
      const batch = firmIds.slice(i, i + BATCH_SIZE);

      // Queue batch processing
      await customerHealthQueue.add({
        type: 'batch-calculate-health-scores',
        data: {
          firmIds: batch,
          batchSize: 10 // Process 10 at a time within batch
        }
      }, {
        priority: 3,
        attempts: HEALTH_SCORE_JOB_CONFIG.calculateAll.retries,
        timeout: HEALTH_SCORE_JOB_CONFIG.calculateAll.timeout
      });

      processedBatches++;
      logger.info(`[CustomerHealth] Queued batch ${processedBatches}/${totalBatches}`);
    }

    const duration = Date.now() - startTime;
    logger.info(`[CustomerHealth] Queued all health score calculations in ${duration}ms`);

    // Send notification to admins (optional)
    if (process.env.SLACK_WEBHOOK_URL) {
      await sendSlackNotification({
        text: `Customer Health: Queued health score calculations for ${firms.length} firms in ${totalBatches} batches`
      });
    }

    return {
      success: true,
      firmsQueued: firms.length,
      batchesQueued: totalBatches,
      duration
    };

  } catch (error) {
    logger.error('[CustomerHealth] Calculate all job error:', error);
    throw error;
  } finally {
    jobsRunning.calculateAll = false;
  }
};

/**
 * Process at-risk interventions
 * Check firms that need intervention and trigger appropriate actions
 * Runs twice daily at 9 AM and 2 PM
 */
const processAtRiskInterventions = async () => {
  if (jobsRunning.processInterventions) {
    logger.info('[CustomerHealth] Interventions job still running, skipping...');
    return;
  }

  jobsRunning.processInterventions = true;

  try {
    const startTime = Date.now();
    logger.info('[CustomerHealth] Checking for at-risk firms...');

    // Find at-risk and critical firms
    const atRiskFirms = await Firm.find({
      'health.category': { $in: ['at-risk', 'critical'] },
      'health.lastCalculated': {
        $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) // Within last 48 hours
      }
    }).select('_id name health subscription lastActivityAt');

    if (atRiskFirms.length === 0) {
      logger.info('[CustomerHealth] No at-risk firms found');
      return { success: true, processed: 0 };
    }

    logger.info(`[CustomerHealth] Found ${atRiskFirms.length} at-risk firms`);

    let interventionsSent = 0;
    let skipped = 0;

    for (const firm of atRiskFirms) {
      try {
        // Determine intervention type based on health metrics
        const interventionType = determineInterventionType(firm);

        if (!interventionType) {
          skipped++;
          continue;
        }

        // Check if we already sent an intervention recently (within 7 days)
        const lastIntervention = firm.health?.lastIntervention;
        if (lastIntervention &&
            (Date.now() - lastIntervention.getTime()) < 7 * 24 * 60 * 60 * 1000) {
          logger.info(`[CustomerHealth] Skipping firm ${firm._id} - intervention sent recently`);
          skipped++;
          continue;
        }

        // Queue intervention email
        await customerHealthQueue.add({
          type: 'send-intervention-email',
          data: {
            firmId: firm._id.toString(),
            interventionType
          }
        }, {
          priority: 1, // High priority
          attempts: HEALTH_SCORE_JOB_CONFIG.processInterventions.retries,
          timeout: HEALTH_SCORE_JOB_CONFIG.processInterventions.timeout
        });

        // Update last intervention timestamp
        await Firm.findByIdAndUpdate(firm._id, {
          $set: {
            'health.lastIntervention': new Date(),
            'health.interventionType': interventionType
          }
        });

        interventionsSent++;

      } catch (error) {
        logger.error(`[CustomerHealth] Error processing firm ${firm._id}:`, error.message);
      }
    }

    const duration = Date.now() - startTime;
    logger.info(`[CustomerHealth] Interventions processed in ${duration}ms: ${interventionsSent} sent, ${skipped} skipped`);

    return {
      success: true,
      totalAtRisk: atRiskFirms.length,
      interventionsSent,
      skipped,
      duration
    };

  } catch (error) {
    logger.error('[CustomerHealth] Interventions job error:', error);
    throw error;
  } finally {
    jobsRunning.processInterventions = false;
  }
};

/**
 * Determine intervention type based on firm health metrics
 */
function determineInterventionType(firm) {
  const health = firm.health || {};
  const metrics = health.metrics || {};

  // Critical category - immediate intervention needed
  if (health.category === 'critical') {
    // Check if it's due to inactivity
    const daysSinceActivity = firm.lastActivityAt
      ? Math.floor((Date.now() - firm.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSinceActivity > 30) {
      return 'inactive';
    }

    // Check if it's due to low usage
    if (metrics.usage && metrics.usage < 10) {
      return 'low-usage';
    }

    // Check if paid plan with low engagement
    if (firm.subscription?.status === 'active' &&
        firm.subscription?.plan !== 'free' &&
        (metrics.activity || 0) < 15) {
      return 'downgrade-risk';
    }
  }

  // At-risk category - preventive intervention
  if (health.category === 'at-risk') {
    // Check activity trend
    if (metrics.activity && metrics.activity < 15) {
      return 'inactive';
    }

    // Check usage trend
    if (metrics.usage && metrics.usage < 15) {
      return 'low-usage';
    }
  }

  return null;
}

/**
 * Generate weekly churn report
 * Runs every Monday at 9 AM
 */
const generateWeeklyChurnReport = async () => {
  if (jobsRunning.weeklyReport) {
    logger.info('[CustomerHealth] Weekly report job still running, skipping...');
    return;
  }

  jobsRunning.weeklyReport = true;

  try {
    const startTime = Date.now();
    logger.info('[CustomerHealth] Generating weekly churn report...');

    const reportDate = new Date().toISOString().split('T')[0];

    // Get recipients from environment or use default
    const recipients = process.env.HEALTH_REPORT_RECIPIENTS
      ? process.env.HEALTH_REPORT_RECIPIENTS.split(',')
      : ['admin@traf3li.com'];

    // Queue report generation
    const job = await customerHealthQueue.add({
      type: 'generate-churn-report',
      data: {
        reportDate,
        recipients
      }
    }, {
      priority: 2,
      attempts: HEALTH_SCORE_JOB_CONFIG.weeklyReport.retries,
      timeout: HEALTH_SCORE_JOB_CONFIG.weeklyReport.timeout
    });

    const duration = Date.now() - startTime;
    logger.info(`[CustomerHealth] Weekly report queued in ${duration}ms`);

    return {
      success: true,
      jobId: job.id,
      reportDate,
      duration
    };

  } catch (error) {
    logger.error('[CustomerHealth] Weekly report job error:', error);
    throw error;
  } finally {
    jobsRunning.weeklyReport = false;
  }
};

/**
 * Clean up old health score records
 * Keep only last 90 days of health history
 * Runs weekly on Sundays at 3 AM
 */
const cleanupOldHealthScores = async () => {
  if (jobsRunning.cleanup) {
    logger.info('[CustomerHealth] Cleanup job still running, skipping...');
    return;
  }

  jobsRunning.cleanup = true;

  try {
    const startTime = Date.now();
    logger.info('[CustomerHealth] Cleaning up old health score records...');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days ago

    // Clean up health history older than 90 days
    const result = await Firm.updateMany(
      {
        'health.history': { $exists: true, $ne: [] }
      },
      {
        $pull: {
          'health.history': {
            calculatedAt: { $lt: cutoffDate }
          }
        }
      }
    );

    const duration = Date.now() - startTime;
    logger.info(`[CustomerHealth] Cleanup complete in ${duration}ms: ${result.modifiedCount} firms cleaned`);

    return {
      success: true,
      firmsModified: result.modifiedCount,
      cutoffDate,
      duration
    };

  } catch (error) {
    logger.error('[CustomerHealth] Cleanup job error:', error);
    throw error;
  } finally {
    jobsRunning.cleanup = false;
  }
};

/**
 * Sync aggregate churn metrics
 * Calculate and store aggregate metrics for reporting
 * Runs every hour
 */
const syncChurnMetrics = async () => {
  if (jobsRunning.syncMetrics) {
    logger.info('[CustomerHealth] Sync metrics job still running, skipping...');
    return;
  }

  jobsRunning.syncMetrics = true;

  try {
    const startTime = Date.now();
    logger.info('[CustomerHealth] Syncing aggregate churn metrics...');

    // Calculate aggregate metrics
    const metrics = await calculateAggregateMetrics();

    // Store in a cache or database (you can create a ChurnMetrics model)
    // For now, we'll just log the metrics
    logger.info('[CustomerHealth] Aggregate metrics:', JSON.stringify(metrics, null, 2));

    const duration = Date.now() - startTime;

    return {
      success: true,
      metrics,
      duration
    };

  } catch (error) {
    logger.error('[CustomerHealth] Sync metrics job error:', error);
    throw error;
  } finally {
    jobsRunning.syncMetrics = false;
  }
};

/**
 * Calculate aggregate health metrics across all firms
 */
async function calculateAggregateMetrics() {
  const [
    totalFirms,
    healthyFirms,
    atRiskFirms,
    criticalFirms,
    avgHealthScore,
    activeFirms,
    inactiveFirms
  ] = await Promise.all([
    Firm.countDocuments({ status: { $ne: 'deleted' } }),
    Firm.countDocuments({ 'health.category': 'healthy' }),
    Firm.countDocuments({ 'health.category': 'at-risk' }),
    Firm.countDocuments({ 'health.category': 'critical' }),
    Firm.aggregate([
      { $match: { 'health.score': { $exists: true } } },
      { $group: { _id: null, avgScore: { $avg: '$health.score' } } }
    ]),
    Firm.countDocuments({
      lastActivityAt: {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Active in last 7 days
      }
    }),
    Firm.countDocuments({
      $or: [
        { lastActivityAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        { lastActivityAt: { $exists: false } }
      ]
    })
  ]);

  return {
    timestamp: new Date(),
    total: totalFirms,
    byHealth: {
      healthy: healthyFirms,
      atRisk: atRiskFirms,
      critical: criticalFirms
    },
    averageHealthScore: avgHealthScore.length > 0 ? avgHealthScore[0].avgScore : 0,
    activity: {
      active: activeFirms,
      inactive: inactiveFirms
    },
    churnRisk: {
      low: healthyFirms,
      medium: atRiskFirms,
      high: criticalFirms
    }
  };
}

/**
 * Send Slack notification (optional)
 */
async function sendSlackNotification(payload) {
  if (!process.env.SLACK_WEBHOOK_URL) {
    return;
  }

  try {
    const axios = require('axios');
    await axios.post(process.env.SLACK_WEBHOOK_URL, payload);
  } catch (error) {
    logger.error('[CustomerHealth] Failed to send Slack notification:', error.message);
  }
}

/**
 * Start all customer health jobs
 */
function startCustomerHealthJobs() {
  logger.info('[CustomerHealth] Starting customer health job scheduler...');

  // Daily at 2 AM: Calculate all health scores
  cron.schedule(HEALTH_SCORE_JOB_CONFIG.calculateAll.cron, () => {
    calculateAllHealthScores();
  }, {
    timezone: process.env.TZ || 'Asia/Riyadh'
  });
  logger.info(`[CustomerHealth] ✓ Calculate all health scores: ${HEALTH_SCORE_JOB_CONFIG.calculateAll.cron}`);

  // Twice daily at 9 AM and 2 PM: Process interventions
  cron.schedule(HEALTH_SCORE_JOB_CONFIG.processInterventions.cron, () => {
    processAtRiskInterventions();
  }, {
    timezone: process.env.TZ || 'Asia/Riyadh'
  });
  logger.info(`[CustomerHealth] ✓ Process interventions: ${HEALTH_SCORE_JOB_CONFIG.processInterventions.cron}`);

  // Weekly on Mondays at 9 AM: Generate churn report
  cron.schedule(HEALTH_SCORE_JOB_CONFIG.weeklyReport.cron, () => {
    generateWeeklyChurnReport();
  }, {
    timezone: process.env.TZ || 'Asia/Riyadh'
  });
  logger.info(`[CustomerHealth] ✓ Weekly churn report: ${HEALTH_SCORE_JOB_CONFIG.weeklyReport.cron}`);

  // Weekly on Sundays at 3 AM: Cleanup old health scores
  cron.schedule(HEALTH_SCORE_JOB_CONFIG.cleanup.cron, () => {
    cleanupOldHealthScores();
  }, {
    timezone: process.env.TZ || 'Asia/Riyadh'
  });
  logger.info(`[CustomerHealth] ✓ Cleanup old health scores: ${HEALTH_SCORE_JOB_CONFIG.cleanup.cron}`);

  // Every hour: Sync aggregate metrics
  cron.schedule(HEALTH_SCORE_JOB_CONFIG.syncMetrics.cron, () => {
    syncChurnMetrics();
  }, {
    timezone: process.env.TZ || 'Asia/Riyadh'
  });
  logger.info(`[CustomerHealth] ✓ Sync churn metrics: ${HEALTH_SCORE_JOB_CONFIG.syncMetrics.cron}`);

  logger.info('[CustomerHealth] All customer health jobs started successfully');
}

/**
 * Stop all jobs (for graceful shutdown)
 */
function stopCustomerHealthJobs() {
  logger.info('[CustomerHealth] Stopping customer health jobs...');
  // Jobs will stop automatically when process exits
}

/**
 * Manually trigger a specific job (for testing/admin)
 */
async function triggerJob(jobName) {
  logger.info(`[CustomerHealth] Manually triggering ${jobName}...`);

  switch (jobName) {
    case 'calculateAll':
      return await calculateAllHealthScores();
    case 'processInterventions':
      return await processAtRiskInterventions();
    case 'weeklyReport':
      return await generateWeeklyChurnReport();
    case 'cleanup':
      return await cleanupOldHealthScores();
    case 'syncMetrics':
      return await syncChurnMetrics();
    default:
      throw new Error(`Unknown job: ${jobName}`);
  }
}

/**
 * Get job status
 */
function getJobStatus() {
  return {
    jobs: {
      calculateAll: {
        running: jobsRunning.calculateAll,
        schedule: HEALTH_SCORE_JOB_CONFIG.calculateAll.cron,
        description: 'Calculate health scores for all firms'
      },
      processInterventions: {
        running: jobsRunning.processInterventions,
        schedule: HEALTH_SCORE_JOB_CONFIG.processInterventions.cron,
        description: 'Process at-risk interventions'
      },
      weeklyReport: {
        running: jobsRunning.weeklyReport,
        schedule: HEALTH_SCORE_JOB_CONFIG.weeklyReport.cron,
        description: 'Generate weekly churn report'
      },
      cleanup: {
        running: jobsRunning.cleanup,
        schedule: HEALTH_SCORE_JOB_CONFIG.cleanup.cron,
        description: 'Cleanup old health scores (keep 90 days)'
      },
      syncMetrics: {
        running: jobsRunning.syncMetrics,
        schedule: HEALTH_SCORE_JOB_CONFIG.syncMetrics.cron,
        description: 'Sync aggregate churn metrics'
      }
    }
  };
}

module.exports = {
  startCustomerHealthJobs,
  stopCustomerHealthJobs,
  triggerJob,
  getJobStatus,
  // Export individual functions for testing
  calculateAllHealthScores,
  processAtRiskInterventions,
  generateWeeklyChurnReport,
  cleanupOldHealthScores,
  syncChurnMetrics,
  HEALTH_SCORE_JOB_CONFIG
};
