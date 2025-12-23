/**
 * ML Scoring Queue
 *
 * Handles real-time and batch scoring jobs with Redis caching.
 * Implements high-performance lead scoring with intelligent caching strategies.
 *
 * Queue Types:
 * - Real-time scoring: Single lead scoring with immediate cache updates
 * - Batch scoring: Multiple leads scored efficiently in parallel
 *
 * Cache Strategy:
 * - Hot leads (score > 70): 1 hour TTL
 * - Warm leads (score 40-70): 6 hours TTL
 * - Cold leads (score < 40): 24 hours TTL
 * - Cache keys: ml:score:{firmId}:{leadId}
 *
 * Follows existing patterns from email.queue.js and notification.queue.js
 */

const { createQueue } = require('../configs/queue');
const { getRedisClient } = require('../configs/redis');
const logger = require('../utils/logger');
const LeadScoringService = require('../services/leadScoring.service');
const Lead = require('../models/lead.model');
const LeadScore = require('../models/leadScore.model');

// ═══════════════════════════════════════════════════════════════
// QUEUE CONFIGURATION
// ═══════════════════════════════════════════════════════════════

// Queue for real-time scoring requests (high priority, immediate processing)
const realtimeScoringQueue = createQueue('realtime-scoring', {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      age: 3600, // 1 hour
      count: 100
    },
    removeOnFail: {
      age: 86400, // 24 hours
      count: 50
    }
  }
});

// Queue for batch scoring (lower priority, parallel processing)
const batchScoringQueue = createQueue('batch-scoring', {
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 5000
    },
    removeOnComplete: {
      age: 3600,
      count: 50
    },
    removeOnFail: {
      age: 86400,
      count: 20
    }
  }
});

// ═══════════════════════════════════════════════════════════════
// REDIS CACHING CLASS
// ═══════════════════════════════════════════════════════════════

/**
 * Redis caching for ML lead scores
 * Cache structure: ml:score:{firmId}:{leadId}
 * TTL: 1 hour for hot leads, 6 hours for warm, 24 hours for cold
 */
class MLScoreCache {
  constructor() {
    this.redis = null;
    this.initialized = false;
  }

  /**
   * Initialize Redis connection
   */
  async init() {
    if (!this.initialized) {
      try {
        this.redis = getRedisClient();
        this.initialized = true;
      } catch (error) {
        logger.warn('[MLScoreCache] Redis not available:', error.message);
      }
    }
    return this.initialized;
  }

  /**
   * Generate cache key for a lead score
   */
  getCacheKey(firmId, leadId) {
    return `ml:score:${firmId}:${leadId}`;
  }

  /**
   * Generate cache key for firm's hot leads list
   */
  getHotLeadsKey(firmId) {
    return `ml:hotleads:${firmId}`;
  }

  /**
   * Determine TTL based on score (dynamic caching strategy)
   */
  getTTLForScore(score) {
    if (score >= 70) return 3600;        // 1 hour for hot leads
    if (score >= 40) return 21600;       // 6 hours for warm leads
    return 86400;                        // 24 hours for cold leads
  }

  /**
   * Cache lead score with appropriate TTL
   * @param {ObjectId} firmId - Firm ID
   * @param {ObjectId} leadId - Lead ID
   * @param {Object} scoreData - Complete score data
   */
  async cacheScore(firmId, leadId, scoreData) {
    if (!await this.init()) return false;

    try {
      const cacheKey = this.getCacheKey(firmId, leadId);
      const ttl = this.getTTLForScore(scoreData.totalScore);

      // Prepare cache data
      const cacheData = {
        leadId: leadId.toString(),
        firmId: firmId.toString(),
        totalScore: scoreData.totalScore,
        grade: scoreData.grade,
        category: scoreData.category,
        conversionProbability: scoreData.conversionProbability,
        breakdown: scoreData.breakdown,
        insights: scoreData.insights,
        cachedAt: new Date().toISOString(),
        ttl
      };

      await this.redis.setex(cacheKey, ttl, JSON.stringify(cacheData));

      // If hot lead, add to hot leads list
      if (scoreData.totalScore >= 70) {
        await this.addToHotLeads(firmId, leadId, scoreData.totalScore);
      }

      logger.info(`[MLScoreCache] Cached score for lead ${leadId} (score: ${scoreData.totalScore}, TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      logger.error('[MLScoreCache] Error caching score:', error.message);
      return false;
    }
  }

  /**
   * Get cached lead score
   * @param {ObjectId} firmId - Firm ID
   * @param {ObjectId} leadId - Lead ID
   * @returns {Object|null} Cached score data or null if not found
   */
  async getCachedScore(firmId, leadId) {
    if (!await this.init()) return null;

    try {
      const cacheKey = this.getCacheKey(firmId, leadId);
      const cachedData = await this.redis.get(cacheKey);

      if (!cachedData) {
        logger.debug(`[MLScoreCache] Cache miss for lead ${leadId}`);
        return null;
      }

      const scoreData = JSON.parse(cachedData);
      logger.debug(`[MLScoreCache] Cache hit for lead ${leadId} (score: ${scoreData.totalScore})`);
      return scoreData;
    } catch (error) {
      logger.error('[MLScoreCache] Error getting cached score:', error.message);
      return null;
    }
  }

  /**
   * Invalidate cached score for a lead
   * @param {ObjectId} firmId - Firm ID
   * @param {ObjectId} leadId - Lead ID
   */
  async invalidateScore(firmId, leadId) {
    if (!await this.init()) return false;

    try {
      const cacheKey = this.getCacheKey(firmId, leadId);
      await this.redis.del(cacheKey);

      // Remove from hot leads list
      await this.removeFromHotLeads(firmId, leadId);

      logger.info(`[MLScoreCache] Invalidated cache for lead ${leadId}`);
      return true;
    } catch (error) {
      logger.error('[MLScoreCache] Error invalidating score:', error.message);
      return false;
    }
  }

  /**
   * Add lead to firm's hot leads sorted set
   * @param {ObjectId} firmId - Firm ID
   * @param {ObjectId} leadId - Lead ID
   * @param {Number} score - Lead score
   */
  async addToHotLeads(firmId, leadId, score) {
    if (!await this.init()) return false;

    try {
      const hotLeadsKey = this.getHotLeadsKey(firmId);

      // Add to sorted set (score as the sort value)
      await this.redis.zadd(hotLeadsKey, score, leadId.toString());

      // Set expiry on the hot leads list (24 hours)
      await this.redis.expire(hotLeadsKey, 86400);

      logger.debug(`[MLScoreCache] Added lead ${leadId} to hot leads (score: ${score})`);
      return true;
    } catch (error) {
      logger.error('[MLScoreCache] Error adding to hot leads:', error.message);
      return false;
    }
  }

  /**
   * Remove lead from hot leads list
   * @param {ObjectId} firmId - Firm ID
   * @param {ObjectId} leadId - Lead ID
   */
  async removeFromHotLeads(firmId, leadId) {
    if (!await this.init()) return false;

    try {
      const hotLeadsKey = this.getHotLeadsKey(firmId);
      await this.redis.zrem(hotLeadsKey, leadId.toString());
      return true;
    } catch (error) {
      logger.error('[MLScoreCache] Error removing from hot leads:', error.message);
      return false;
    }
  }

  /**
   * Get firm's hot leads (sorted by score, descending)
   * @param {ObjectId} firmId - Firm ID
   * @param {Number} limit - Maximum number of leads to return
   * @returns {Array} Array of { leadId, score } objects
   */
  async getHotLeads(firmId, limit = 20) {
    if (!await this.init()) return [];

    try {
      const hotLeadsKey = this.getHotLeadsKey(firmId);

      // Get top leads with scores (ZREVRANGE with WITHSCORES)
      const results = await this.redis.zrevrange(hotLeadsKey, 0, limit - 1, 'WITHSCORES');

      // Parse results (Redis returns [leadId1, score1, leadId2, score2, ...])
      const hotLeads = [];
      for (let i = 0; i < results.length; i += 2) {
        hotLeads.push({
          leadId: results[i],
          score: parseFloat(results[i + 1])
        });
      }

      logger.debug(`[MLScoreCache] Retrieved ${hotLeads.length} hot leads for firm ${firmId}`);
      return hotLeads;
    } catch (error) {
      logger.error('[MLScoreCache] Error getting hot leads:', error.message);
      return [];
    }
  }

  /**
   * Warm cache for a firm's top leads
   * Pre-loads scores for frequently accessed leads
   * @param {ObjectId} firmId - Firm ID
   * @param {Number} limit - Number of leads to warm
   */
  async warmCache(firmId, limit = 50) {
    if (!await this.init()) return { success: false, reason: 'Redis not available' };

    logger.info(`[MLScoreCache] Warming cache for firm ${firmId} (${limit} leads)...`);
    const startTime = Date.now();

    try {
      // Get top scoring leads for this firm
      const topLeads = await LeadScore.find({ firmId })
        .sort({ totalScore: -1 })
        .limit(limit)
        .populate('leadId', '_id firmId');

      let cached = 0;
      let failed = 0;

      for (const leadScore of topLeads) {
        if (!leadScore.leadId) continue;

        try {
          await this.cacheScore(firmId, leadScore.leadId._id, {
            totalScore: leadScore.totalScore,
            grade: leadScore.grade,
            category: leadScore.category,
            conversionProbability: leadScore.conversionProbability,
            breakdown: leadScore.breakdown,
            insights: leadScore.insights
          });
          cached++;
        } catch (error) {
          failed++;
          logger.error(`[MLScoreCache] Failed to cache lead ${leadScore.leadId._id}:`, error.message);
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`[MLScoreCache] Cache warming completed in ${duration}ms (${cached} cached, ${failed} failed)`);

      return {
        success: true,
        cached,
        failed,
        duration
      };
    } catch (error) {
      logger.error('[MLScoreCache] Cache warming failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clear all cached scores for a firm
   * @param {ObjectId} firmId - Firm ID
   */
  async clearFirmCache(firmId) {
    if (!await this.init()) return false;

    try {
      // Get all score keys for this firm
      const pattern = `ml:score:${firmId}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

      // Clear hot leads list
      const hotLeadsKey = this.getHotLeadsKey(firmId);
      await this.redis.del(hotLeadsKey);

      logger.info(`[MLScoreCache] Cleared ${keys.length} cached scores for firm ${firmId}`);
      return true;
    } catch (error) {
      logger.error('[MLScoreCache] Error clearing firm cache:', error.message);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (!await this.init()) {
      return { available: false };
    }

    try {
      const pattern = 'ml:score:*';
      const keys = await this.redis.keys(pattern);

      const hotLeadsPattern = 'ml:hotleads:*';
      const hotLeadsKeys = await this.redis.keys(hotLeadsPattern);

      return {
        available: true,
        totalCachedScores: keys.length,
        totalFirmsWithHotLeads: hotLeadsKeys.length
      };
    } catch (error) {
      logger.error('[MLScoreCache] Error getting stats:', error.message);
      return { available: false, error: error.message };
    }
  }
}

// Create singleton cache instance
const mlScoreCache = new MLScoreCache();

// ═══════════════════════════════════════════════════════════════
// REAL-TIME SCORING QUEUE PROCESSOR
// ═══════════════════════════════════════════════════════════════

/**
 * Process real-time scoring jobs
 * - Score single lead immediately
 * - Cache result in Redis
 * - Return score data for API responses
 */
realtimeScoringQueue.process(async (job) => {
  const { leadId, firmId, source, priority } = job.data;

  logger.info(`📊 Processing real-time scoring job ${job.id} for lead ${leadId}`);

  try {
    await job.progress(10);

    // Check if lead exists
    const lead = await Lead.findById(leadId).select('_id firmId status convertedToClient');
    if (!lead) {
      throw new Error(`Lead ${leadId} not found`);
    }

    // Skip if converted or lost
    if (lead.convertedToClient || lead.status === 'lost') {
      logger.info(`Skipping lead ${leadId} - converted or lost`);
      return {
        success: false,
        reason: 'Lead converted or lost',
        leadId
      };
    }

    await job.progress(30);

    // Calculate score using LeadScoringService
    const leadScore = await LeadScoringService.calculateScore(leadId);

    await job.progress(70);

    // Cache the score in Redis
    await mlScoreCache.cacheScore(firmId, leadId, {
      totalScore: leadScore.totalScore,
      grade: leadScore.grade,
      category: leadScore.category,
      conversionProbability: leadScore.conversionProbability,
      breakdown: leadScore.breakdown,
      insights: leadScore.insights
    });

    await job.progress(100);

    const result = {
      success: true,
      leadId,
      firmId,
      totalScore: leadScore.totalScore,
      grade: leadScore.grade,
      category: leadScore.category,
      conversionProbability: leadScore.conversionProbability,
      source,
      priority,
      timestamp: new Date()
    };

    logger.info(`✅ Real-time scoring completed for lead ${leadId} (score: ${leadScore.totalScore})`);
    return result;

  } catch (error) {
    logger.error(`❌ Real-time scoring failed for lead ${leadId}:`, error.message);
    throw error;
  }
});

// ═══════════════════════════════════════════════════════════════
// BATCH SCORING QUEUE PROCESSOR
// ═══════════════════════════════════════════════════════════════

/**
 * Process batch scoring jobs
 * - Score multiple leads efficiently
 * - Use parallel processing (concurrency: 10)
 * - Update database and cache
 * - Track success/failure rates
 */
batchScoringQueue.process(10, async (job) => {
  const { firmId, leadIds, source } = job.data;

  logger.info(`📊 Processing batch scoring job ${job.id} (${leadIds.length} leads for firm ${firmId})`);

  try {
    await job.progress(5);

    const results = {
      firmId,
      total: leadIds.length,
      processed: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      scores: []
    };

    // Process leads in smaller chunks for better progress reporting
    const CHUNK_SIZE = 10;
    const chunks = [];
    for (let i = 0; i < leadIds.length; i += CHUNK_SIZE) {
      chunks.push(leadIds.slice(i, i + CHUNK_SIZE));
    }

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];

      // Process chunk in parallel
      const chunkResults = await Promise.allSettled(
        chunk.map(async (leadId) => {
          try {
            // Check if lead should be scored
            const lead = await Lead.findById(leadId).select('_id firmId status convertedToClient');

            if (!lead) {
              results.skipped++;
              return { leadId, status: 'skipped', reason: 'not_found' };
            }

            if (lead.convertedToClient || lead.status === 'lost') {
              results.skipped++;
              return { leadId, status: 'skipped', reason: 'converted_or_lost' };
            }

            // Calculate score
            const leadScore = await LeadScoringService.calculateScore(leadId);

            // Cache the result
            await mlScoreCache.cacheScore(firmId, leadId, {
              totalScore: leadScore.totalScore,
              grade: leadScore.grade,
              category: leadScore.category,
              conversionProbability: leadScore.conversionProbability,
              breakdown: leadScore.breakdown,
              insights: leadScore.insights
            });

            results.processed++;
            results.scores.push({
              leadId,
              score: leadScore.totalScore,
              grade: leadScore.grade
            });

            return {
              leadId,
              status: 'success',
              score: leadScore.totalScore
            };

          } catch (error) {
            results.failed++;
            results.errors.push({
              leadId,
              error: error.message
            });

            return {
              leadId,
              status: 'failed',
              error: error.message
            };
          }
        })
      );

      // Update progress
      const progress = Math.floor(((chunkIndex + 1) / chunks.length) * 95) + 5;
      await job.progress(progress);

      logger.info(`[Batch ${job.id}] Chunk ${chunkIndex + 1}/${chunks.length} completed`);
    }

    await job.progress(100);

    logger.info(
      `✅ Batch scoring completed for firm ${firmId}: ` +
      `${results.processed} processed, ${results.failed} failed, ${results.skipped} skipped`
    );

    return results;

  } catch (error) {
    logger.error(`❌ Batch scoring failed for firm ${firmId}:`, error.message);
    throw error;
  }
});

// ═══════════════════════════════════════════════════════════════
// QUEUE EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════

// Real-time queue events
realtimeScoringQueue.on('completed', (job, result) => {
  if (result.success) {
    logger.info(`✅ Real-time job ${job.id} completed - Lead ${result.leadId} scored ${result.totalScore}`);
  }
});

realtimeScoringQueue.on('failed', (job, error) => {
  logger.error(`❌ Real-time job ${job.id} failed:`, error.message);
});

// Batch queue events
batchScoringQueue.on('completed', (job, result) => {
  logger.info(
    `✅ Batch job ${job.id} completed - ` +
    `${result.processed}/${result.total} leads scored for firm ${result.firmId}`
  );
});

batchScoringQueue.on('failed', (job, error) => {
  logger.error(`❌ Batch job ${job.id} failed:`, error.message);
});

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Add single lead to real-time scoring queue
 * @param {ObjectId} leadId - Lead ID
 * @param {ObjectId} firmId - Firm ID
 * @param {Object} options - Additional options (source, priority)
 */
async function queueRealtimeScoring(leadId, firmId, options = {}) {
  const { source = 'api', priority = 'normal' } = options;

  // Check cache first
  const cached = await mlScoreCache.getCachedScore(firmId, leadId);
  if (cached && source !== 'force_refresh') {
    logger.info(`[ML Scoring] Using cached score for lead ${leadId}`);
    return {
      fromCache: true,
      ...cached
    };
  }

  // Add to queue
  const job = await realtimeScoringQueue.add({
    leadId,
    firmId,
    source,
    priority,
    timestamp: new Date()
  }, {
    priority: priority === 'high' ? 1 : priority === 'urgent' ? 0 : 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  });

  logger.info(`[ML Scoring] Queued real-time scoring for lead ${leadId} (job: ${job.id})`);
  return {
    fromCache: false,
    jobId: job.id,
    queued: true
  };
}

/**
 * Add multiple leads to batch scoring queue
 * @param {ObjectId} firmId - Firm ID
 * @param {Array<ObjectId>} leadIds - Array of lead IDs
 * @param {Object} options - Additional options
 */
async function queueBatchScoring(firmId, leadIds, options = {}) {
  const { source = 'manual', priority = 5 } = options;

  const job = await batchScoringQueue.add({
    firmId,
    leadIds,
    source,
    timestamp: new Date()
  }, {
    priority,
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 5000
    }
  });

  logger.info(`[ML Scoring] Queued batch scoring for ${leadIds.length} leads (job: ${job.id})`);
  return {
    jobId: job.id,
    queued: true,
    leadCount: leadIds.length
  };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  // Queues
  realtimeScoringQueue,
  batchScoringQueue,

  // Cache
  mlScoreCache,
  MLScoreCache,

  // Helper functions
  queueRealtimeScoring,
  queueBatchScoring
};
