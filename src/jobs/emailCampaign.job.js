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
  if (jobsRunning.scheduledCampaigns) {
    console.log('[Email Jobs] Scheduled campaigns job still running, skipping...');
    return;
  }

  jobsRunning.scheduledCampaigns = true;

  try {
    const now = new Date();
    console.log(`[Email Jobs] Checking scheduled campaigns at ${now.toISOString()}`);

    // Find campaigns scheduled to send now or earlier
    const campaigns = await EmailCampaign.find({
      status: 'scheduled',
      scheduledAt: { $lte: now }
    }).populate('segmentId');

    if (campaigns.length === 0) {
      console.log('[Email Jobs] No scheduled campaigns to send');
      return;
    }

    console.log(`[Email Jobs] Found ${campaigns.length} campaigns to send`);

    for (const campaign of campaigns) {
      try {
        console.log(`[Email Jobs] Sending campaign: ${campaign.name} (${campaign._id})`);
        await EmailMarketingService.sendCampaign(campaign._id);
      } catch (error) {
        console.error(`[Email Jobs] Failed to send campaign ${campaign._id}:`, error.message);

        // Mark as failed
        campaign.status = 'draft';
        campaign.stats.failed++;
        await campaign.save();
      }
    }

    console.log('[Email Jobs] Scheduled campaigns processing complete');
  } catch (error) {
    console.error('[Email Jobs] Scheduled campaigns job error:', error);
  } finally {
    jobsRunning.scheduledCampaigns = false;
  }
};

/**
 * Process drip campaign steps
 * Runs every 5 minutes to send next drip emails
 */
const processDripCampaigns = async () => {
  if (jobsRunning.dripCampaigns) {
    console.log('[Email Jobs] Drip campaigns job still running, skipping...');
    return;
  }

  jobsRunning.dripCampaigns = true;

  try {
    console.log('[Email Jobs] Processing drip campaigns...');

    // Find all subscribers with active drip campaigns
    const subscribers = await EmailSubscriber.find({
      'dripCampaigns.status': 'active'
    });

    if (subscribers.length === 0) {
      console.log('[Email Jobs] No active drip campaigns');
      return;
    }

    console.log(`[Email Jobs] Found ${subscribers.length} subscribers with active drips`);

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
          console.error(`[Email Jobs] Drip step error for subscriber ${subscriber._id}:`, error.message);
        }
      }
    }

    console.log(`[Email Jobs] Drip processing complete: ${processed} processed, ${sent} sent`);
  } catch (error) {
    console.error('[Email Jobs] Drip campaigns job error:', error);
  } finally {
    jobsRunning.dripCampaigns = false;
  }
};

/**
 * Calculate segment subscriber counts
 * Runs every hour to refresh dynamic segments
 */
const calculateSegments = async () => {
  if (jobsRunning.segments) {
    console.log('[Email Jobs] Segments job still running, skipping...');
    return;
  }

  jobsRunning.segments = true;

  try {
    console.log('[Email Jobs] Calculating segment counts...');

    // Get all dynamic segments
    const segments = await EmailSegment.find({
      isDynamic: true,
      isActive: true
    });

    if (segments.length === 0) {
      console.log('[Email Jobs] No dynamic segments to refresh');
      return;
    }

    console.log(`[Email Jobs] Refreshing ${segments.length} segments`);

    let updated = 0;
    let failed = 0;

    for (const segment of segments) {
      try {
        await segment.calculateSubscribers();
        updated++;
      } catch (error) {
        console.error(`[Email Jobs] Failed to calculate segment ${segment._id}:`, error.message);
        failed++;
      }
    }

    console.log(`[Email Jobs] Segments refresh complete: ${updated} updated, ${failed} failed`);
  } catch (error) {
    console.error('[Email Jobs] Segments job error:', error);
  } finally {
    jobsRunning.segments = false;
  }
};

/**
 * Check for inactive subscribers and trigger re-engagement
 * Runs every hour
 */
const checkInactivityTriggers = async () => {
  if (jobsRunning.inactivity) {
    console.log('[Email Jobs] Inactivity job still running, skipping...');
    return;
  }

  jobsRunning.inactivity = true;

  try {
    console.log('[Email Jobs] Checking inactivity triggers...');

    await EmailMarketingService.checkInactivityTriggers();

    console.log('[Email Jobs] Inactivity check complete');
  } catch (error) {
    console.error('[Email Jobs] Inactivity job error:', error);
  } finally {
    jobsRunning.inactivity = false;
  }
};

/**
 * Daily cleanup and maintenance
 * - Clean old events (optional, if TTL index not used)
 * - Update engagement scores
 * - Clean hard bounced emails
 */
const dailyCleanup = async () => {
  if (jobsRunning.cleanup) {
    console.log('[Email Jobs] Cleanup job still running, skipping...');
    return;
  }

  jobsRunning.cleanup = true;

  try {
    console.log('[Email Jobs] Running daily cleanup...');

    // Update engagement scores for all subscribers
    const subscribers = await EmailSubscriber.find({ status: 'subscribed' });

    let updated = 0;
    for (const subscriber of subscribers) {
      try {
        // Trigger pre-save hook to recalculate engagement score
        subscriber.markModified('engagement');
        await subscriber.save();
        updated++;
      } catch (error) {
        console.error(`[Email Jobs] Failed to update subscriber ${subscriber._id}:`, error.message);
      }
    }

    console.log(`[Email Jobs] Updated engagement scores for ${updated} subscribers`);

    // Clean hard bounced emails (mark as unsubscribed)
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
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`[Email Jobs] Cleaned ${result.modifiedCount} hard bounced emails`);
    }

    // Clean old events older than 1 year (if TTL index not working)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const deleteResult = await EmailEvent.deleteMany({
      timestamp: { $lt: oneYearAgo }
    });

    if (deleteResult.deletedCount > 0) {
      console.log(`[Email Jobs] Deleted ${deleteResult.deletedCount} old events`);
    }

    console.log('[Email Jobs] Daily cleanup complete');
  } catch (error) {
    console.error('[Email Jobs] Cleanup job error:', error);
  } finally {
    jobsRunning.cleanup = false;
  }
};

/**
 * Update A/B test winners
 * Runs every 30 minutes to check if test duration has passed
 */
const updateABTestWinners = async () => {
  try {
    const now = new Date();

    // Find campaigns with active A/B tests
    const campaigns = await EmailCampaign.find({
      'abTest.enabled': true,
      'abTest.winnerSelected': false,
      status: { $in: ['sending', 'sent'] }
    });

    for (const campaign of campaigns) {
      // Check if test duration has passed
      const testDurationMs = campaign.abTest.testDuration * 60 * 60 * 1000;
      const timeSinceSent = now.getTime() - (campaign.sentAt?.getTime() || now.getTime());

      if (timeSinceSent >= testDurationMs) {
        try {
          await EmailMarketingService.selectWinner(campaign._id);
          console.log(`[Email Jobs] Selected A/B test winner for campaign ${campaign._id}`);
        } catch (error) {
          console.error(`[Email Jobs] Failed to select winner for ${campaign._id}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error('[Email Jobs] A/B test winner job error:', error);
  }
};

/**
 * Start all email campaign jobs
 */
function startEmailCampaignJobs() {
  console.log('[Email Jobs] Starting email campaign job scheduler...');

  // Every minute: Process scheduled campaigns
  cron.schedule('* * * * *', () => {
    processScheduledCampaigns();
  });
  console.log('[Email Jobs] ✓ Scheduled campaigns job: every minute');

  // Every 5 minutes: Process drip campaigns
  cron.schedule('*/5 * * * *', () => {
    processDripCampaigns();
  });
  console.log('[Email Jobs] ✓ Drip campaigns job: every 5 minutes');

  // Every 30 minutes: Update A/B test winners
  cron.schedule('*/30 * * * *', () => {
    updateABTestWinners();
  });
  console.log('[Email Jobs] ✓ A/B test winner job: every 30 minutes');

  // Every hour: Calculate segments and check inactivity
  cron.schedule('0 * * * *', () => {
    calculateSegments();
    checkInactivityTriggers();
  });
  console.log('[Email Jobs] ✓ Segments & inactivity job: every hour');

  // Daily at 2 AM: Cleanup and maintenance
  cron.schedule('0 2 * * *', () => {
    dailyCleanup();
  });
  console.log('[Email Jobs] ✓ Daily cleanup job: 2:00 AM');

  console.log('[Email Jobs] All email campaign jobs started successfully');
}

/**
 * Stop all jobs (for graceful shutdown)
 */
function stopEmailCampaignJobs() {
  console.log('[Email Jobs] Stopping email campaign jobs...');
  // Jobs will stop automatically when process exits
}

/**
 * Manually trigger a specific job (for testing/admin)
 */
async function triggerJob(jobName) {
  console.log(`[Email Jobs] Manually triggering ${jobName}...`);

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

  console.log(`[Email Jobs] ${jobName} completed`);
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
