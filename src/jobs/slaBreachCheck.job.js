/**
 * SLA Breach Check Job
 *
 * Automated SLA monitoring:
 * - Every 15 minutes: Check for SLA breaches across all firms
 * - Detect breached, critical, and warning status SLAs
 * - Send automatic notifications to assigned users
 */

const cron = require('node-cron');
const SLAService = require('../services/sla.service');
const Firm = require('../models/firm.model');
const { SLA } = require('../models/sla.model');
const logger = require('../utils/logger');

// Track running jobs
let jobRunning = false;

/**
 * Check SLA breaches for all firms with active SLAs
 * Runs every 15 minutes
 */
const checkSLABreaches = async () => {
    if (jobRunning) {
        logger.info('[SLA Breach Job] Job still running, skipping...');
        return;
    }

    jobRunning = true;

    try {
        const now = new Date();
        logger.info(`[SLA Breach Job] Starting SLA breach check at ${now.toISOString()}`);

        // Find all firms that have active SLA configurations
        const activeSLAs = await SLA.find({ isActive: true }).distinct('firmId');

        if (activeSLAs.length === 0) {
            logger.info('[SLA Breach Job] No firms with active SLAs found');
            return;
        }

        logger.info(`[SLA Breach Job] Checking SLA breaches for ${activeSLAs.length} firms`);

        let totalChecked = 0;
        let totalBreached = 0;
        let totalWarnings = 0;
        let totalCriticals = 0;
        let firmsFailed = 0;

        for (const firmId of activeSLAs) {
            try {
                // Check breaches for this firm
                const results = await SLAService.checkBreaches(firmId.toString());

                totalChecked += results.checked;
                totalBreached += results.breached;
                totalWarnings += results.warnings;
                totalCriticals += results.criticals;

                if (results.breached > 0 || results.criticals > 0 || results.warnings > 0) {
                    logger.info(
                        `[SLA Breach Job] Firm ${firmId}: ${results.breached} breached, ${results.criticals} critical, ${results.warnings} warnings`
                    );
                }
            } catch (error) {
                firmsFailed++;
                logger.error(`[SLA Breach Job] Failed to check breaches for firm ${firmId}:`, error.message);
            }
        }

        logger.info(
            `[SLA Breach Job] Check complete: ${totalChecked} instances checked, ` +
            `${totalBreached} breached, ${totalCriticals} critical, ${totalWarnings} warnings ` +
            `(${firmsFailed} firms failed)`
        );

    } catch (error) {
        logger.error('[SLA Breach Job] Job error:', error);
    } finally {
        jobRunning = false;
    }
};

/**
 * Start SLA breach check job
 */
function startSLABreachJob() {
    logger.info('[SLA Breach Job] Starting SLA breach check scheduler...');

    // Every 15 minutes: Check for SLA breaches
    cron.schedule('*/15 * * * *', () => {
        checkSLABreaches();
    });

    logger.info('[SLA Breach Job] ✓ SLA breach check job: every 15 minutes');
    logger.info('[SLA Breach Job] SLA breach job started successfully');
}

/**
 * Stop job (for graceful shutdown)
 */
function stopSLABreachJob() {
    logger.info('[SLA Breach Job] Stopping SLA breach job...');
    // Jobs will stop automatically when process exits
}

/**
 * Manually trigger job (for testing/admin)
 */
async function triggerJob() {
    logger.info('[SLA Breach Job] Manually triggering SLA breach check...');
    await checkSLABreaches();
    logger.info('[SLA Breach Job] Manual trigger completed');
}

/**
 * Get job status
 */
function getJobStatus() {
    return {
        running: jobRunning,
        schedule: 'Every 15 minutes'
    };
}

module.exports = {
    startSLABreachJob,
    stopSLABreachJob,
    triggerJob,
    getJobStatus,
    // Export function for testing
    checkSLABreaches
};
