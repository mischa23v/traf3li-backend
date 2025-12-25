/**
 * SLO Monitoring Job
 *
 * Automated SLO monitoring:
 * - Every minute: Collect metrics and store measurements
 * - Aggregate measurements and calculate SLO compliance
 * - Check thresholds and send alerts when SLOs are breached
 */

const cron = require('node-cron');
const SLO = require('../models/slo.model');
const SLOMonitoringService = require('../services/sloMonitoring.service');
const logger = require('../utils/logger');

// Track running jobs
let measurementJobRunning = false;
let alertJobRunning = false;

/**
 * Collect SLO measurements
 * Runs every minute
 */
const collectSLOMeasurements = async () => {
  if (measurementJobRunning) {
    logger.debug('[SLO Monitoring Job] Measurement job still running, skipping...');
    return;
  }

  measurementJobRunning = true;

  try {
    const now = new Date();
    logger.debug(`[SLO Monitoring Job] Starting SLO measurement collection at ${now.toISOString()}`);

    // Get all active SLOs
    const slos = await SLO.find({ isActive: true });

    if (slos.length === 0) {
      logger.debug('[SLO Monitoring Job] No active SLOs found');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const slo of slos) {
      try {
        // Take measurement for this SLO
        await SLOMonitoringService.measureSLO(slo._id);
        successCount++;
      } catch (error) {
        failCount++;
        logger.error(`[SLO Monitoring Job] Failed to measure SLO ${slo._id} (${slo.name}):`, error.message);
      }
    }

    logger.debug(
      `[SLO Monitoring Job] Measurement collection complete: ${successCount} successful, ${failCount} failed`
    );
  } catch (error) {
    logger.error('[SLO Monitoring Job] Measurement job error:', error);
  } finally {
    measurementJobRunning = false;
  }
};

/**
 * Check SLO thresholds and send alerts
 * Runs every 5 minutes
 */
const checkSLOAlerts = async () => {
  if (alertJobRunning) {
    logger.debug('[SLO Monitoring Job] Alert job still running, skipping...');
    return;
  }

  alertJobRunning = true;

  try {
    const now = new Date();
    logger.debug(`[SLO Monitoring Job] Starting SLO alert check at ${now.toISOString()}`);

    const results = await SLOMonitoringService.checkSLOAlerts();

    if (results.alertsSent > 0) {
      logger.info(
        `[SLO Monitoring Job] Alert check complete: ${results.alertsSent} alerts sent ` +
        `(${results.breached.length} breached, ${results.warnings.length} warnings)`
      );

      if (results.breached.length > 0) {
        logger.warn(`[SLO Monitoring Job] Breached SLOs: ${results.breached.join(', ')}`);
      }
      if (results.warnings.length > 0) {
        logger.info(`[SLO Monitoring Job] Warning SLOs: ${results.warnings.join(', ')}`);
      }
    }
  } catch (error) {
    logger.error('[SLO Monitoring Job] Alert job error:', error);
  } finally {
    alertJobRunning = false;
  }
};

/**
 * Calculate and update error budgets
 * Runs every 15 minutes
 */
const updateErrorBudgets = async () => {
  try {
    const now = new Date();
    logger.debug(`[SLO Monitoring Job] Starting error budget update at ${now.toISOString()}`);

    const slos = await SLO.find({ isActive: true });

    let successCount = 0;
    let failCount = 0;

    for (const slo of slos) {
      try {
        await SLOMonitoringService.getErrorBudget(slo._id);
        successCount++;
      } catch (error) {
        failCount++;
        logger.error(`[SLO Monitoring Job] Failed to update error budget for SLO ${slo._id}:`, error.message);
      }
    }

    logger.debug(
      `[SLO Monitoring Job] Error budget update complete: ${successCount} successful, ${failCount} failed`
    );
  } catch (error) {
    logger.error('[SLO Monitoring Job] Error budget update error:', error);
  }
};

/**
 * Start SLO monitoring job
 */
function startSLOMonitoringJob() {
  logger.info('[SLO Monitoring Job] Starting SLO monitoring scheduler...');

  // Every minute: Collect SLO measurements
  cron.schedule('* * * * *', () => {
    collectSLOMeasurements();
  });

  // Every 5 minutes: Check thresholds and send alerts
  cron.schedule('*/5 * * * *', () => {
    checkSLOAlerts();
  });

  // Every 15 minutes: Update error budgets
  cron.schedule('*/15 * * * *', () => {
    updateErrorBudgets();
  });

  logger.info('[SLO Monitoring Job] ✓ SLO measurement collection: every minute');
  logger.info('[SLO Monitoring Job] ✓ SLO alert check: every 5 minutes');
  logger.info('[SLO Monitoring Job] ✓ Error budget update: every 15 minutes');
  logger.info('[SLO Monitoring Job] SLO monitoring job started successfully');
}

/**
 * Stop job (for graceful shutdown)
 */
function stopSLOMonitoringJob() {
  logger.info('[SLO Monitoring Job] Stopping SLO monitoring job...');
  // Jobs will stop automatically when process exits
}

/**
 * Manually trigger measurement collection (for testing/admin)
 */
async function triggerMeasurementCollection() {
  logger.info('[SLO Monitoring Job] Manually triggering measurement collection...');
  await collectSLOMeasurements();
  logger.info('[SLO Monitoring Job] Manual measurement collection completed');
}

/**
 * Manually trigger alert check (for testing/admin)
 */
async function triggerAlertCheck() {
  logger.info('[SLO Monitoring Job] Manually triggering alert check...');
  await checkSLOAlerts();
  logger.info('[SLO Monitoring Job] Manual alert check completed');
}

/**
 * Manually trigger error budget update (for testing/admin)
 */
async function triggerErrorBudgetUpdate() {
  logger.info('[SLO Monitoring Job] Manually triggering error budget update...');
  await updateErrorBudgets();
  logger.info('[SLO Monitoring Job] Manual error budget update completed');
}

/**
 * Get job status
 */
function getJobStatus() {
  return {
    measurementJobRunning,
    alertJobRunning,
    schedules: {
      measurements: 'Every minute',
      alerts: 'Every 5 minutes',
      errorBudgets: 'Every 15 minutes',
    },
  };
}

module.exports = {
  startSLOMonitoringJob,
  stopSLOMonitoringJob,
  triggerMeasurementCollection,
  triggerAlertCheck,
  triggerErrorBudgetUpdate,
  getJobStatus,
  // Export functions for testing
  collectSLOMeasurements,
  checkSLOAlerts,
  updateErrorBudgets,
};
