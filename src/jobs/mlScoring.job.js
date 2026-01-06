/**
 * ML Scoring Scheduled Jobs
 *
 * Implements scheduled jobs for machine learning-powered lead scoring:
 * - Nightly batch scoring (3 AM) - score all leads
 * - Hourly hot lead refresh - rescore high-priority leads
 * - Weekly model retraining trigger
 * - Daily SLA breach check
 * - Real-time scoring queue processor
 *
 * Follows existing job patterns from dataRetention.job.js and sessionCleanup.job.js
 */

const cron = require('node-cron');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const LeadScoringService = require('../services/leadScoring.service');
const Lead = require('../models/lead.model');
const LeadScore = require('../models/leadScore.model');
const { batchScoringQueue, realtimeScoringQueue } = require('../queues/mlScoring.queue');
const { getRedisClient } = require('../configs/redis');
const { acquireLock } = require('../services/distributedLock.service');

// ═══════════════════════════════════════════════════════════════
// ML SCORING JOBS CLASS
// ═══════════════════════════════════════════════════════════════

class MLScoringJobs {
  constructor() {
    this.scheduledJobs = [];
    this.isRunning = false;
  }

  // ═══════════════════════════════════════════════════════════════
  // NIGHTLY BATCH SCORING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Nightly batch scoring - score all active leads
   * Run at 3 AM to match existing patterns (dataRetention runs at 2 AM)
   */
  async nightlyBatchScoring() {
    // Acquire distributed lock
    const lock = await acquireLock('ml_nightly_batch_scoring');

    if (!lock.acquired) {
      logger.info(`[MLScoring] Nightly batch scoring already running on another instance (TTL: ${lock.ttlRemaining}s), skipping...`);
      return { skipped: true, reason: 'already_running_distributed' };
    }

    try {
      if (this.isRunning) {
        logger.warn('[MLScoring] Nightly batch scoring already running, skipping...');
        return;
      }

      this.isRunning = true;
      logger.info('[MLScoring] Starting nightly batch scoring...');
      const startTime = Date.now();

      try {
      // Get all active leads (not converted to clients)
      // NOTE: Bypass firmIsolation filter - system job operates across all firms
      const leads = await Lead.find({
        convertedToClient: false,
        status: { $nin: ['lost', 'inactive'] }
      }).setOptions({ bypassFirmFilter: true }.select('_id firmId');.lean()

      logger.info(`[MLScoring] Found ${leads.length} leads to score`);

      // Group leads by firm for efficient processing
      const leadsByFirm = {};
      leads.forEach(lead => {
        const firmId = lead.firmId.toString();
        if (!leadsByFirm[firmId]) {
          leadsByFirm[firmId] = [];
        }
        leadsByFirm[firmId].push(lead._id);
      });

      const results = {
        total: leads.length,
        processed: 0,
        failed: 0,
        errors: []
      };

      // Process each firm's leads in batches
      for (const [firmId, leadIds] of Object.entries(leadsByFirm)) {
        try {
          // Add to batch scoring queue
          await batchScoringQueue.add({
            firmId,
            leadIds,
            source: 'nightly_batch',
            timestamp: new Date()
          }, {
            priority: 5, // Lower priority for batch jobs
            removeOnComplete: true
          });

          results.processed += leadIds.length;
          logger.info(`[MLScoring] Queued ${leadIds.length} leads for firm ${firmId}`);
        } catch (error) {
          results.failed += leadIds.length;
          results.errors.push({
            firmId,
            leadCount: leadIds.length,
            error: error.message
          });
          logger.error(`[MLScoring] Error queueing leads for firm ${firmId}:`, error.message);
        }
      }

        const duration = Date.now() - startTime;
        logger.info(`[MLScoring] Nightly batch scoring completed in ${duration}ms`, results);

        return results;
      } catch (error) {
        logger.error('[MLScoring] Nightly batch scoring failed:', error);
        throw error;
      } finally {
        this.isRunning = false;
      }
    } finally {
      await lock.release();
    }
  }

  /**
   * Schedule nightly batch scoring at 3:10 AM (staggered after data retention at 3:00 AM)
   */
  scheduleNightlyScoring() {
    const job = cron.schedule('10 3 * * *', async () => {
      logger.info('[MLScoring] Nightly batch scoring job triggered');
      try {
        await this.nightlyBatchScoring();
      } catch (error) {
        logger.error('[MLScoring] Nightly batch scoring error:', error);
      }
    });

    this.scheduledJobs.push({ name: 'nightly-scoring', job });
    logger.info('✅ ML nightly batch scoring scheduled (daily at 3:00 AM)');
    return job;
  }

  // ═══════════════════════════════════════════════════════════════
  // HOURLY HOT LEAD REFRESH
  // ═══════════════════════════════════════════════════════════════

  /**
   * Hourly refresh of hot leads (score > 70)
   * Cached in Redis for fast access
   */
  async hourlyHotLeadRefresh() {
    // Acquire distributed lock
    const lock = await acquireLock('ml_hourly_hot_lead_refresh');

    if (!lock.acquired) {
      logger.info(`[MLScoring] Hot lead refresh already running on another instance (TTL: ${lock.ttlRemaining}s), skipping...`);
      return { skipped: true, reason: 'already_running_distributed' };
    }

    try {
      logger.info('[MLScoring] Starting hourly hot lead refresh...');
      const startTime = Date.now();

      try {
      // Find leads with high scores that need refreshing
      // NOTE: Bypass firmIsolation filter - system job operates across all firms
      const hotLeads = await LeadScore.find({
        totalScore: { $gte: 70 },
        'calculation.lastCalculatedAt': {
          $lt: new Date(Date.now() - 60 * 60 * 1000) // Older than 1 hour
        }
      }).setOptions({ bypassFirmFilter: true }).populate('leadId', '_id firmId status convertedToClient');

      // Filter out converted or lost leads
      const activeHotLeads = hotLeads.filter(
        ls => ls.leadId && !ls.leadId.convertedToClient && ls.leadId.status !== 'lost'
      );

      logger.info(`[MLScoring] Found ${activeHotLeads.length} hot leads to refresh`);

      const results = {
        total: activeHotLeads.length,
        processed: 0,
        failed: 0
      };

      // Queue each hot lead for real-time scoring (high priority)
      for (const leadScore of activeHotLeads) {
        try {
          await realtimeScoringQueue.add({
            leadId: leadScore.leadId._id,
            firmId: leadScore.leadId.firmId,
            source: 'hot_lead_refresh',
            priority: 'high',
            timestamp: new Date()
          }, {
            priority: 1, // Highest priority
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000
            }
          });

          results.processed++;
        } catch (error) {
          results.failed++;
          logger.error(`[MLScoring] Error queueing hot lead ${leadScore.leadId._id}:`, error.message);
        }
      }

        const duration = Date.now() - startTime;
        logger.info(`[MLScoring] Hot lead refresh completed in ${duration}ms`, results);

        return results;
      } catch (error) {
        logger.error('[MLScoring] Hot lead refresh failed:', error);
        throw error;
      }
    } finally {
      await lock.release();
    }
  }

  /**
   * Schedule hourly hot lead refresh
   */
  scheduleHotLeadRefresh() {
    // Run every hour at minute 15
    const job = cron.schedule('15 * * * *', async () => {
      logger.info('[MLScoring] Hourly hot lead refresh triggered');
      try {
        await this.hourlyHotLeadRefresh();
      } catch (error) {
        logger.error('[MLScoring] Hot lead refresh error:', error);
      }
    });

    this.scheduledJobs.push({ name: 'hot-lead-refresh', job });
    logger.info('✅ ML hot lead refresh scheduled (hourly at :15)');
    return job;
  }

  // ═══════════════════════════════════════════════════════════════
  // WEEKLY MODEL PERFORMANCE CHECK
  // ═══════════════════════════════════════════════════════════════

  /**
   * Weekly model performance check and retrain trigger
   * Analyzes prediction accuracy and suggests retraining if needed
   */
  async weeklyModelCheck() {
    // Acquire distributed lock
    const lock = await acquireLock('ml_weekly_model_check');

    if (!lock.acquired) {
      logger.info(`[MLScoring] Weekly model check already running on another instance (TTL: ${lock.ttlRemaining}s), skipping...`);
      return { skipped: true, reason: 'already_running_distributed' };
    }

    try {
      logger.info('[MLScoring] Starting weekly model performance check...');
      const startTime = Date.now();

      try {
      // Get conversion data from the past week
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // NOTE: Bypass firmIsolation filter - system job operates across all firms
      const convertedLeads = await Lead.find({
        convertedToClient: true,
        convertedAt: { $gte: weekAgo }
      }).setOptions({ bypassFirmFilter: true }.select('_id');.lean()

      const convertedLeadIds = convertedLeads.map(l => l._id);

      // Get their scores before conversion
      // NOTE: Bypass firmIsolation filter - system job operates across all firms
      const preConversionScores = await LeadScore.find({
        leadId: { $in: convertedLeadIds }
      }).setOptions({ bypassFirmFilter: true }).select('leadId totalScore conversionProbability');

      // Calculate accuracy metrics
      let highScoreConversions = 0;
      let mediumScoreConversions = 0;
      let lowScoreConversions = 0;
      let totalPredictionError = 0;

      for (const score of preConversionScores) {
        if (score.totalScore >= 80) highScoreConversions++;
        else if (score.totalScore >= 50) mediumScoreConversions++;
        else lowScoreConversions++;

        // Calculate prediction error (converted = 100% actual)
        totalPredictionError += Math.abs(100 - score.conversionProbability);
      }

      const avgPredictionError = preConversionScores.length > 0
        ? totalPredictionError / preConversionScores.length
        : 0;

      const metrics = {
        weekStart: weekAgo,
        weekEnd: new Date(),
        totalConversions: convertedLeads.length,
        scoredConversions: preConversionScores.length,
        highScoreConversions,
        mediumScoreConversions,
        lowScoreConversions,
        avgPredictionError: Math.round(avgPredictionError),
        accuracy: preConversionScores.length > 0
          ? Math.round(((highScoreConversions * 1.0 + mediumScoreConversions * 0.5) / preConversionScores.length) * 100)
          : 0
      };

      // Determine if retraining is needed
      const needsRetraining =
        metrics.avgPredictionError > 30 || // High prediction error
        metrics.lowScoreConversions > metrics.highScoreConversions || // More low-score conversions than high
        metrics.accuracy < 60; // Overall accuracy below 60%

      metrics.needsRetraining = needsRetraining;
      metrics.retrainingReason = needsRetraining
        ? `High error (${metrics.avgPredictionError}%) or low accuracy (${metrics.accuracy}%)`
        : null;

      // Cache metrics in Redis for dashboard
      try {
        const redis = getRedisClient();
        await redis.setex(
          'ml:model:weekly_metrics',
          7 * 24 * 60 * 60, // 7 days TTL
          JSON.stringify(metrics)
        );
      } catch (redisError) {
        logger.warn('[MLScoring] Could not cache metrics in Redis:', redisError.message);
      }

        const duration = Date.now() - startTime;
        logger.info(`[MLScoring] Weekly model check completed in ${duration}ms`, metrics);

        if (needsRetraining) {
          logger.warn('[MLScoring] ⚠️  Model retraining recommended:', metrics.retrainingReason);
          // TODO: Trigger model retraining workflow (Temporal workflow or external ML service)
        }

        return metrics;
      } catch (error) {
        logger.error('[MLScoring] Weekly model check failed:', error);
        throw error;
      }
    } finally {
      await lock.release();
    }
  }

  /**
   * Schedule weekly model performance check
   */
  scheduleWeeklyModelCheck() {
    // Run every Monday at 4 AM
    const job = cron.schedule('0 4 * * 1', async () => {
      logger.info('[MLScoring] Weekly model check triggered');
      try {
        await this.weeklyModelCheck();
      } catch (error) {
        logger.error('[MLScoring] Weekly model check error:', error);
      }
    });

    this.scheduledJobs.push({ name: 'weekly-model-check', job });
    logger.info('✅ ML weekly model check scheduled (Mondays at 4:00 AM)');
    return job;
  }

  // ═══════════════════════════════════════════════════════════════
  // DAILY SLA BREACH CHECK
  // ═══════════════════════════════════════════════════════════════

  /**
   * Daily SLA breach check and escalation
   * Identifies high-value leads not contacted within SLA timeframe
   */
  async dailySLACheck() {
    // Acquire distributed lock
    const lock = await acquireLock('ml_daily_sla_check');

    if (!lock.acquired) {
      logger.info(`[MLScoring] Daily SLA check already running on another instance (TTL: ${lock.ttlRemaining}s), skipping...`);
      return { skipped: true, reason: 'already_running_distributed' };
    }

    try {
      logger.info('[MLScoring] Starting daily SLA breach check...');
      const startTime = Date.now();

      try {
      // SLA thresholds based on lead score
      const slaThresholds = {
        hot: { score: 80, hours: 2 },      // A-grade leads: 2 hours
        warm: { score: 60, hours: 24 },    // B-grade leads: 24 hours
        cold: { score: 40, hours: 72 }     // C-grade leads: 72 hours
      };

      const results = {
        hot: { breaches: 0, leads: [] },
        warm: { breaches: 0, leads: [] },
        cold: { breaches: 0, leads: [] }
      };

      // Check each SLA tier
      for (const [tier, config] of Object.entries(slaThresholds)) {
        const slaBreachTime = new Date(Date.now() - config.hours * 60 * 60 * 1000);

        // Find leads that breach SLA
        // NOTE: Bypass firmIsolation filter - system job operates across all firms
        const breachedLeads = await LeadScore.find({
          totalScore: { $gte: config.score },
          'calculation.lastCalculatedAt': { $lt: slaBreachTime }
        }).setOptions({ bypassFirmFilter: true }).populate({
          path: 'leadId',
          match: {
            convertedToClient: false,
            status: { $nin: ['lost', 'inactive'] },
            lastContactedAt: { $lt: slaBreachTime }
          },
          select: '_id firmId firstName lastName email phone status lastContactedAt'
        });

        // Filter out null leads (due to populate match)
        const validBreaches = breachedLeads.filter(ls => ls.leadId);

        results[tier].breaches = validBreaches.length;
        results[tier].leads = validBreaches.map(ls => ({
          leadId: ls.leadId._id,
          firmId: ls.leadId.firmId,
          name: `${ls.leadId.firstName || ''} ${ls.leadId.lastName || ''}`.trim(),
          email: ls.leadId.email,
          score: ls.totalScore,
          lastContact: ls.leadId.lastContactedAt,
          hoursOverdue: Math.round(
            (Date.now() - new Date(ls.leadId.lastContactedAt).getTime()) / (1000 * 60 * 60)
          )
        }));

        logger.info(`[MLScoring] ${tier.toUpperCase()} SLA: ${results[tier].breaches} breaches`);

        // Create escalation notifications for hot leads
        if (tier === 'hot' && results[tier].breaches > 0) {
          // TODO: Send notifications/alerts for hot lead SLA breaches
          // Could integrate with notification queue or email queue
          logger.warn(`[MLScoring] ⚠️  ${results[tier].breaches} HOT leads breaching SLA!`);
        }
      }

      // Cache SLA breach report in Redis
      try {
        const redis = getRedisClient();
        await redis.setex(
          'ml:sla:daily_report',
          24 * 60 * 60, // 24 hours TTL
          JSON.stringify({
            date: new Date(),
            results,
            totalBreaches: results.hot.breaches + results.warm.breaches + results.cold.breaches
          })
        );
      } catch (redisError) {
        logger.warn('[MLScoring] Could not cache SLA report in Redis:', redisError.message);
      }

        const duration = Date.now() - startTime;
        logger.info(`[MLScoring] SLA check completed in ${duration}ms`, {
          hot: results.hot.breaches,
          warm: results.warm.breaches,
          cold: results.cold.breaches
        });

        return results;
      } catch (error) {
        logger.error('[MLScoring] Daily SLA check failed:', error);
        throw error;
      }
    } finally {
      await lock.release();
    }
  }

  /**
   * Schedule daily SLA breach check
   */
  scheduleDailySLACheck() {
    // Run every 4 hours at :10 to catch breaches quickly (staggered to avoid :00 spike)
    const job = cron.schedule('10 */4 * * *', async () => {
      logger.info('[MLScoring] SLA breach check triggered');
      try {
        await this.dailySLACheck();
      } catch (error) {
        logger.error('[MLScoring] SLA check error:', error);
      }
    });

    this.scheduledJobs.push({ name: 'sla-check', job });
    logger.info('✅ ML SLA breach check scheduled (every 4 hours)');
    return job;
  }

  // ═══════════════════════════════════════════════════════════════
  // JOB MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Start all scheduled jobs
   */
  startAllJobs() {
    logger.info('[MLScoring] Starting all ML scoring jobs...');

    this.scheduleNightlyScoring();
    this.scheduleHotLeadRefresh();
    this.scheduleWeeklyModelCheck();
    this.scheduleDailySLACheck();

    logger.info(`✅ All ML scoring jobs started (${this.scheduledJobs.length} jobs)`);
    return this.scheduledJobs;
  }

  /**
   * Stop all scheduled jobs
   */
  stopAllJobs() {
    logger.info('[MLScoring] Stopping all ML scoring jobs...');

    for (const { name, job } of this.scheduledJobs) {
      job.stop();
      logger.info(`   ✓ Stopped job: ${name}`);
    }

    this.scheduledJobs = [];
    logger.info('✅ All ML scoring jobs stopped');
  }

  /**
   * Get job status
   */
  getJobStatus() {
    return {
      isRunning: this.isRunning,
      scheduledJobs: this.scheduledJobs.map(j => ({
        name: j.name,
        running: j.job.getStatus ? j.job.getStatus() : 'scheduled'
      }))
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

// Create singleton instance
const mlScoringJobs = new MLScoringJobs();

module.exports = {
  mlScoringJobs,
  MLScoringJobs,
  // Export individual job functions for manual execution
  nightlyBatchScoring: () => mlScoringJobs.nightlyBatchScoring(),
  hourlyHotLeadRefresh: () => mlScoringJobs.hourlyHotLeadRefresh(),
  weeklyModelCheck: () => mlScoringJobs.weeklyModelCheck(),
  dailySLACheck: () => mlScoringJobs.dailySLACheck(),
  // Export scheduling functions
  startAllJobs: () => mlScoringJobs.startAllJobs(),
  stopAllJobs: () => mlScoringJobs.stopAllJobs()
};
