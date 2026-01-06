/**
 * Email Campaign Job Scheduler for TRAF3LI
 *
 * Automated tasks:
 * - Every minute: Process scheduled campaigns
 * - Every 5 minutes: Process drip campaign steps
 * - Every hour: Calculate segment counts, check inactivity triggers
 * - Daily: Clean old events, update engagement scores
 */

const cron = require('node-cron');
const EmailCampaign = require('../models/emailCampaign.model');
const EmailSubscriber = require('../models/emailSubscriber.model');
const EmailSegment = require('../models/emailSegment.model');
const EmailEvent = require('../models/emailEvent.model');
const EmailMarketingService = require('../services/emailMarketing.service');
const { acquireLock } = require('../services/distributedLock.service');
const logger = require('../utils/contextLogger').child({ module: 'EmailCampaignJob' });

// Distributed lock names
const LOCK_NAMES = {
  scheduledCampaigns: 'email_campaign_scheduled',
  dripCampaigns: 'email_campaign_drip',
  segments: 'email_campaign_segments',
  inactivity: 'email_campaign_inactivity',
  cleanup: 'email_campaign_cleanup',
  abTest: 'email_campaign_ab_test'
};

// Track running jobs
let jobsRunning = {
  scheduledCampaigns: false,
  dripCampaigns: false,
  segments: false,
  inactivity: false,
  cleanup: false
};

/**
 * Process scheduled campaigns
 * Runs every minute to check for campaigns that need to be sent
 */
const processScheduledCampaigns = async () => {
  // Acquire distributed lock
  const lock = await acquireLock(LOCK_NAMES.scheduledCampaigns);

  if (!lock.acquired) {
    logger.info(` Scheduled campaigns job already running on another instance (TTL: ${lock.ttlRemaining}s), skipping...`);
    return { skipped: true, reason: 'already_running_distributed' };
  }

  try {
    const now = new Date();
    logger.info(` Checking scheduled campaigns at ${now.toISOString()}`);

    // Find campaigns scheduled to send now or earlier
    // NOTE: Bypass firmIsolation filter - system job operates across all firms
    const campaigns = await EmailCampaign.find({
      status: 'scheduled',
      scheduledAt: { $lte: now }
    }).setOptions({ bypassFirmFilter: true }).populate('segmentId');

    if (campaigns.length === 0) {
      logger.info(' No scheduled campaigns to send');
      return;
    }

    logger.info(` Found ${campaigns.length} campaigns to send`);

    for (const campaign of campaigns) {
      try {
        logger.info(` Sending campaign: ${campaign.name} (${campaign._id})`);
        await EmailMarketingService.sendCampaign(campaign._id);
      } catch (error) {
        logger.error(` Failed to send campaign ${campaign._id}:`, error.message);

        // Mark as failed
        campaign.status = 'draft';
        campaign.stats.failed++;
        await campaign.save();
      }
    }

    logger.info(' Scheduled campaigns processing complete');
  } catch (error) {
    logger.error(' Scheduled campaigns job error:', error);
  } finally {
    await lock.release();
  }
};

/**
 * Process drip campaign steps
 * Runs every 5 minutes to send next drip emails
 */
const processDripCampaigns = async () => {
  // Acquire distributed lock
  const lock = await acquireLock(LOCK_NAMES.dripCampaigns);

  if (!lock.acquired) {
    logger.info(` Drip campaigns job already running on another instance (TTL: ${lock.ttlRemaining}s), skipping...`);
    return { skipped: true, reason: 'already_running_distributed' };
  }

  try {
    logger.info(' Processing drip campaigns...');

    // Find all subscribers with active drip campaigns
    // NOTE: Bypass firmIsolation filter - system job operates across all firms
    const subscribers = await EmailSubscriber.find({
      'dripCampaigns.status': 'active'
    }).setOptions({ bypassFirmFilter: true });

    if (subscribers.length === 0) {
      logger.info(' No active drip campaigns');
      return;
    }

    logger.info(` Found ${subscribers.length} subscribers with active drips`);

    let processed = 0;
    let sent = 0;

    for (const subscriber of subscribers) {
      for (const dripProgress of subscriber.dripCampaigns) {
        if (dripProgress.status !== 'active') continue;

        try {
          const campaign = await EmailCampaign.findById(dripProgress.campaignId);
          if (!campaign || !campaign.dripSettings?.enabled) continue;

          // Get next step
          const nextStep = campaign.dripSettings.steps.find(
            s => s.order === dripProgress.currentStep + 1
          );

          if (!nextStep) {
            // Drip completed
            dripProgress.status = 'completed';
            await subscriber.save();
            continue;
          }

          // Check if enough time has passed
          const delayMs = (nextStep.delayDays * 24 * 60 * 60 * 1000) +
                          (nextStep.delayHours * 60 * 60 * 1000);

          const timeSinceStart = Date.now() - dripProgress.startedAt.getTime();
          const timeSinceLastEmail = dripProgress.lastEmailSentAt ?
            Date.now() - dripProgress.lastEmailSentAt.getTime() : timeSinceStart;

          if (timeSinceLastEmail >= delayMs) {
            // Process this step
            await EmailMarketingService.processNextDripStep(
              campaign._id,
              subscriber._id
            );
            sent++;
          }

          processed++;
        } catch (error) {
          logger.error(` Drip step error for subscriber ${subscriber._id}:`, error.message);
        }
      }
    }

    logger.info(` Drip processing complete: ${processed} processed, ${sent} sent`);
  } catch (error) {
    logger.error(' Drip campaigns job error:', error);
  } finally {
    await lock.release();
  }
};

/**
 * Calculate segment subscriber counts
 * Runs every hour to refresh dynamic segments
 */
const calculateSegments = async () => {
  // Acquire distributed lock
  const lock = await acquireLock(LOCK_NAMES.segments);

  if (!lock.acquired) {
    logger.info(` Segments job already running on another instance (TTL: ${lock.ttlRemaining}s), skipping...`);
    return { skipped: true, reason: 'already_running_distributed' };
  }

  try {
    logger.info(' Calculating segment counts...');

    // Get all dynamic segments
    // NOTE: Bypass firmIsolation filter - system job operates across all firms
    const segments = await EmailSegment.find({
      isDynamic: true,
      isActive: true
    }).setOptions({ bypassFirmFilter: true });

    if (segments.length === 0) {
      logger.info(' No dynamic segments to refresh');
      return;
    }

    logger.info(` Refreshing ${segments.length} segments`);

    let updated = 0;
    let failed = 0;

    for (const segment of segments) {
      try {
        await segment.calculateSubscribers();
        updated++;
      } catch (error) {
        logger.error(` Failed to calculate segment ${segment._id}:`, error.message);
        failed++;
      }
    }

    logger.info(` Segments refresh complete: ${updated} updated, ${failed} failed`);
  } catch (error) {
    logger.error(' Segments job error:', error);
  } finally {
    await lock.release();
  }
};

/**
 * Check for inactive subscribers and trigger re-engagement
 * Runs every hour
 */
const checkInactivityTriggers = async () => {
  // Acquire distributed lock
  const lock = await acquireLock(LOCK_NAMES.inactivity);

  if (!lock.acquired) {
    logger.info(` Inactivity job already running on another instance (TTL: ${lock.ttlRemaining}s), skipping...`);
    return { skipped: true, reason: 'already_running_distributed' };
  }

  try {
    logger.info(' Checking inactivity triggers...');

    await EmailMarketingService.checkInactivityTriggers();

    logger.info(' Inactivity check complete');
  } catch (error) {
    logger.error(' Inactivity job error:', error);
  } finally {
    await lock.release();
  }
};

/**
 * Daily cleanup and maintenance
 * - Clean old events (optional, if TTL index not used)
 * - Update engagement scores
 * - Clean hard bounced emails
 */
const dailyCleanup = async () => {
  // Acquire distributed lock
  const lock = await acquireLock(LOCK_NAMES.cleanup);

  if (!lock.acquired) {
    logger.info(` Cleanup job already running on another instance (TTL: ${lock.ttlRemaining}s), skipping...`);
    return { skipped: true, reason: 'already_running_distributed' };
  }

  try {
    logger.info(' Running daily cleanup...');

    // Update engagement scores for all subscribers
    // NOTE: Bypass firmIsolation filter - system job operates across all firms
    const subscribers = await EmailSubscriber.find({ status: 'subscribed' }).setOptions({ bypassFirmFilter: true });

    let updated = 0;
    for (const subscriber of subscribers) {
      try {
        // Trigger pre-save hook to recalculate engagement score
        subscriber.markModified('engagement');
        await subscriber.save();
        updated++;
      } catch (error) {
        logger.error(` Failed to update subscriber ${subscriber._id}:`, error.message);
      }
    }

    logger.info(` Updated engagement scores for ${updated} subscribers`);

    // Clean hard bounced emails (mark as unsubscribed)
    // NOTE: Bypass firmIsolation filter - system job operates across all firms
    const result = await EmailSubscriber.updateMany(
      {
        status: 'bounced',
        'bounceDetails.type': 'hard',
        'bounceDetails.bounceCount': { $gte: 3 } // 3+ hard bounces
      },
      {
        $set: {
          status: 'unsubscribed',
          unsubscribeReason: 'Hard bounce - email invalid'
        }
      },
      { bypassFirmFilter: true }
    );

    if (result.modifiedCount > 0) {
      logger.info(` Cleaned ${result.modifiedCount} hard bounced emails`);
    }

    // Clean old events older than 1 year (if TTL index not working)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // NOTE: Bypass firmIsolation filter - system job operates across all firms
    const deleteResult = await EmailEvent.deleteMany({
      timestamp: { $lt: oneYearAgo }
    }).setOptions({ bypassFirmFilter: true });

    if (deleteResult.deletedCount > 0) {
      logger.info(` Deleted ${deleteResult.deletedCount} old events`);
    }

    logger.info(' Daily cleanup complete');
  } catch (error) {
    logger.error(' Cleanup job error:', error);
  } finally {
    await lock.release();
  }
};

/**
 * Update A/B test winners
 * Runs every 30 minutes to check if test duration has passed
 */
const updateABTestWinners = async () => {
  // Acquire distributed lock
  const lock = await acquireLock(LOCK_NAMES.abTest);

  if (!lock.acquired) {
    logger.info(` A/B test job already running on another instance (TTL: ${lock.ttlRemaining}s), skipping...`);
    return { skipped: true, reason: 'already_running_distributed' };
  }

  try {
    const now = new Date();

    // Find campaigns with active A/B tests
    // NOTE: Bypass firmIsolation filter - system job operates across all firms
    const campaigns = await EmailCampaign.find({
      'abTest.enabled': true,
      'abTest.winnerSelected': false,
      status: { $in: ['sending', 'sent'] }
    }).setOptions({ bypassFirmFilter: true });

    for (const campaign of campaigns) {
      // Check if test duration has passed
      const testDurationMs = campaign.abTest.testDuration * 60 * 60 * 1000;
      const timeSinceSent = now.getTime() - (campaign.sentAt?.getTime() || now.getTime());

      if (timeSinceSent >= testDurationMs) {
        try {
          await EmailMarketingService.selectWinner(campaign._id);
          logger.info(` Selected A/B test winner for campaign ${campaign._id}`);
        } catch (error) {
          logger.error(` Failed to select winner for ${campaign._id}:`, error.message);
        }
      }
    }
  } catch (error) {
    logger.error(' A/B test winner job error:', error);
  } finally {
    await lock.release();
  }
};

/**
 * Start all email campaign jobs
 */
function startEmailCampaignJobs() {
  logger.info(' Starting email campaign job scheduler...');

  // Every minute: Process scheduled campaigns
  cron.schedule('* * * * *', () => {
    processScheduledCampaigns();
  });
  logger.info(' ✓ Scheduled campaigns job: every minute');

  // Every 5 minutes: Process drip campaigns
  cron.schedule('*/5 * * * *', () => {
    processDripCampaigns();
  });
  logger.info(' ✓ Drip campaigns job: every 5 minutes');

  // Every 30 minutes: Update A/B test winners
  cron.schedule('*/30 * * * *', () => {
    updateABTestWinners();
  });
  logger.info(' ✓ A/B test winner job: every 30 minutes');

  // Every hour: Calculate segments and check inactivity
  cron.schedule('0 * * * *', () => {
    calculateSegments();
    checkInactivityTriggers();
  });
  logger.info(' ✓ Segments & inactivity job: every hour');

  // Daily at 2:50 AM: Cleanup and maintenance (staggered to avoid 2 AM thundering herd)
  cron.schedule('50 2 * * *', () => {
    dailyCleanup();
  });
  logger.info(' ✓ Daily cleanup job: 2:00 AM');

  logger.info(' All email campaign jobs started successfully');
}

/**
 * Stop all jobs (for graceful shutdown)
 */
function stopEmailCampaignJobs() {
  logger.info(' Stopping email campaign jobs...');
  // Jobs will stop automatically when process exits
}

/**
 * Manually trigger a specific job (for testing/admin)
 */
async function triggerJob(jobName) {
  logger.info(` Manually triggering ${jobName}...`);

  switch (jobName) {
    case 'scheduledCampaigns':
      await processScheduledCampaigns();
      break;
    case 'dripCampaigns':
      await processDripCampaigns();
      break;
    case 'segments':
      await calculateSegments();
      break;
    case 'inactivity':
      await checkInactivityTriggers();
      break;
    case 'cleanup':
      await dailyCleanup();
      break;
    case 'abTest':
      await updateABTestWinners();
      break;
    default:
      throw new Error(`Unknown job: ${jobName}`);
  }

  logger.info(` ${jobName} completed`);
}

/**
 * Get job status
 */
function getJobStatus() {
  return {
    jobs: {
      scheduledCampaigns: {
        running: jobsRunning.scheduledCampaigns,
        schedule: 'Every minute'
      },
      dripCampaigns: {
        running: jobsRunning.dripCampaigns,
        schedule: 'Every 5 minutes'
      },
      abTestWinners: {
        running: false,
        schedule: 'Every 30 minutes'
      },
      segments: {
        running: jobsRunning.segments,
        schedule: 'Every hour'
      },
      inactivity: {
        running: jobsRunning.inactivity,
        schedule: 'Every hour'
      },
      cleanup: {
        running: jobsRunning.cleanup,
        schedule: 'Daily at 2:00 AM'
      }
    }
  };
}

module.exports = {
  startEmailCampaignJobs,
  stopEmailCampaignJobs,
  triggerJob,
  getJobStatus,
  // Export individual functions for testing
  processScheduledCampaigns,
  processDripCampaigns,
  calculateSegments,
  checkInactivityTriggers,
  dailyCleanup,
  updateABTestWinners
};
