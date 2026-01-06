/**
 * Distributed Lock Service
 *
 * Gold Standard: Redis-based distributed locking for job coordination
 * Prevents race conditions when running multiple server instances
 *
 * Pattern: Redis SET NX EX (set-if-not-exists with expiry)
 * Same approach used by Sidekiq, Bull, Celery, and other production job systems
 *
 * Features:
 * - Atomic lock acquisition (SET NX)
 * - Automatic expiry (prevents deadlocks from crashed processes)
 * - Lock release with ownership verification (Lua script)
 * - Configurable TTL per lock type
 */

const { getRedisClient } = require('../configs/redis');
const logger = require('../utils/logger');
const crypto = require('crypto');

// Lock key prefix for namespacing
const LOCK_PREFIX = 'lock:job:';

// Default lock TTL configurations (in seconds)
const LOCK_TTL = {
    // Short-running jobs (< 5 min)
    short: 5 * 60,        // 5 minutes
    // Medium-running jobs (5-30 min)
    medium: 30 * 60,      // 30 minutes
    // Long-running jobs (30+ min)
    long: 60 * 60,        // 60 minutes
    // Very long jobs (data retention, cleanup)
    veryLong: 2 * 60 * 60 // 2 hours
};

// Job-specific TTL configurations
const JOB_LOCK_CONFIG = {
    // Recurring invoice - can take up to 60 min for large firms
    'recurring_invoice_generate': { ttl: LOCK_TTL.long, description: 'Recurring invoice generation' },
    'recurring_invoice_notify': { ttl: LOCK_TTL.short, description: 'Recurring invoice notifications' },
    'recurring_invoice_cleanup': { ttl: LOCK_TTL.medium, description: 'Recurring invoice cleanup' },

    // Dunning - processes all firms, can be slow
    'dunning_daily': { ttl: LOCK_TTL.long, description: 'Daily dunning process' },

    // Time entry jobs
    'time_entry_lock_periods': { ttl: LOCK_TTL.medium, description: 'Time entry period locking' },
    'time_entry_cleanup': { ttl: LOCK_TTL.medium, description: 'Time entry cleanup' },
    'time_entry_pending_approvals': { ttl: LOCK_TTL.short, description: 'Time entry pending approvals check' },

    // Data retention - very long running
    'data_retention': { ttl: LOCK_TTL.veryLong, description: 'Data retention cleanup' },

    // Session cleanup - quick
    'session_cleanup': { ttl: LOCK_TTL.short, description: 'Session cleanup' },

    // SLA breach check - runs every 15 min
    'sla_breach_check': { ttl: LOCK_TTL.short, description: 'SLA breach check' },

    // Token refresh - should be quick
    'token_refresh_google': { ttl: LOCK_TTL.medium, description: 'Google Calendar token refresh' },

    // Plan expiration
    'plan_expiration': { ttl: LOCK_TTL.medium, description: 'Plan expiration check' },

    // Audit log archiving - can be slow
    'audit_log_archive': { ttl: LOCK_TTL.long, description: 'Audit log archiving' },

    // Notification digest
    'notification_digest': { ttl: LOCK_TTL.medium, description: 'Notification digest' },

    // Email campaigns
    'email_campaign': { ttl: LOCK_TTL.long, description: 'Email campaign processing' },

    // Workflow automation
    'workflow_automation': { ttl: LOCK_TTL.medium, description: 'Workflow automation' },

    // Customer health scoring
    'customer_health': { ttl: LOCK_TTL.medium, description: 'Customer health scoring' },

    // Deal health scoring
    'deal_health_scoring': { ttl: LOCK_TTL.medium, description: 'Deal health scoring' },

    // Stuck deal detection
    'stuck_deal_detection': { ttl: LOCK_TTL.short, description: 'Stuck deal detection' },

    // Integration sync
    'integration_sync': { ttl: LOCK_TTL.medium, description: 'Integration sync' },

    // Webhook delivery
    'webhook_delivery': { ttl: LOCK_TTL.medium, description: 'Webhook delivery' },

    // ML scoring
    'ml_scoring': { ttl: LOCK_TTL.medium, description: 'ML scoring' },

    // Sandbox cleanup
    'sandbox_cleanup': { ttl: LOCK_TTL.short, description: 'Sandbox cleanup' },

    // Anonymous user cleanup
    'anonymous_user_cleanup': { ttl: LOCK_TTL.short, description: 'Anonymous user cleanup' },

    // SLO monitoring
    'slo_monitoring': { ttl: LOCK_TTL.short, description: 'SLO monitoring' },

    // Cycle auto-complete
    'cycle_auto_complete': { ttl: LOCK_TTL.short, description: 'Cycle auto-complete' },

    // Data export
    'data_export': { ttl: LOCK_TTL.long, description: 'Data export' }
};

// Generate a unique lock value (identifies the lock owner)
const generateLockValue = () => {
    return `${process.pid}:${crypto.randomBytes(8).toString('hex')}:${Date.now()}`;
};

// Lua script for safe lock release (only release if we own the lock)
const RELEASE_LOCK_SCRIPT = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
    else
        return 0
    end
`;

// Lua script for lock extension (only extend if we own the lock)
const EXTEND_LOCK_SCRIPT = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("pexpire", KEYS[1], ARGV[2])
    else
        return 0
    end
`;

/**
 * Acquire a distributed lock
 *
 * @param {string} jobName - Name of the job (must be in JOB_LOCK_CONFIG)
 * @param {Object} options - Lock options
 * @param {number} options.ttl - TTL in seconds (overrides config)
 * @param {number} options.maxWait - Max time to wait for lock acquisition in ms (0 = no wait)
 * @param {number} options.retryInterval - Retry interval in ms when waiting
 * @returns {Promise<{acquired: boolean, lockValue: string|null, release: Function}>}
 */
const acquireLock = async (jobName, options = {}) => {
    const config = JOB_LOCK_CONFIG[jobName];
    if (!config) {
        logger.warn(`[DistributedLock] Unknown job: ${jobName}. Using default TTL.`);
    }

    const ttl = options.ttl || config?.ttl || LOCK_TTL.medium;
    const maxWait = options.maxWait || 0;
    const retryInterval = options.retryInterval || 100;
    const lockKey = `${LOCK_PREFIX}${jobName}`;
    const lockValue = generateLockValue();

    const startTime = Date.now();

    while (true) {
        try {
            const client = getRedisClient();

            // Try to acquire lock with SET NX EX
            const result = await client.set(lockKey, lockValue, 'EX', ttl, 'NX');

            if (result === 'OK') {
                logger.info(`[DistributedLock] Acquired lock for "${jobName}" (TTL: ${ttl}s, value: ${lockValue.substring(0, 20)}...)`);

                // Return lock handle with release function
                return {
                    acquired: true,
                    lockValue,
                    lockKey,
                    ttl,
                    acquiredAt: new Date(),
                    release: async () => releaseLock(jobName, lockValue),
                    extend: async (newTtl) => extendLock(jobName, lockValue, newTtl || ttl)
                };
            }

            // Lock not acquired - check if we should wait
            if (maxWait === 0 || (Date.now() - startTime) >= maxWait) {
                // Get current lock holder info for debugging
                const currentLock = await client.get(lockKey);
                const ttlRemaining = await client.ttl(lockKey);

                logger.info(`[DistributedLock] Lock "${jobName}" already held (TTL remaining: ${ttlRemaining}s). Skipping this run.`);

                return {
                    acquired: false,
                    lockValue: null,
                    lockKey,
                    reason: 'already_locked',
                    currentHolder: currentLock ? currentLock.substring(0, 20) + '...' : 'unknown',
                    ttlRemaining,
                    release: async () => {},
                    extend: async () => false
                };
            }

            // Wait and retry
            await sleep(retryInterval);

        } catch (error) {
            logger.error(`[DistributedLock] Error acquiring lock for "${jobName}":`, error.message);

            // If Redis is down, allow job to run (fail-open for availability)
            // This is a trade-off: prefer availability over consistency
            logger.warn(`[DistributedLock] Redis error - proceeding without lock (fail-open)`);

            return {
                acquired: true,
                lockValue: null,
                lockKey,
                failedOpen: true,
                release: async () => {},
                extend: async () => false
            };
        }
    }
};

/**
 * Release a distributed lock
 *
 * @param {string} jobName - Name of the job
 * @param {string} lockValue - Lock value from acquisition
 * @returns {Promise<boolean>} - True if lock was released
 */
const releaseLock = async (jobName, lockValue) => {
    if (!lockValue) {
        return true; // No lock to release (fail-open scenario)
    }

    const lockKey = `${LOCK_PREFIX}${jobName}`;

    try {
        const client = getRedisClient();

        // Use Lua script for atomic compare-and-delete
        const result = await client.eval(RELEASE_LOCK_SCRIPT, 1, lockKey, lockValue);

        if (result === 1) {
            logger.info(`[DistributedLock] Released lock for "${jobName}"`);
            return true;
        } else {
            logger.warn(`[DistributedLock] Lock for "${jobName}" was not released (not owner or already expired)`);
            return false;
        }

    } catch (error) {
        logger.error(`[DistributedLock] Error releasing lock for "${jobName}":`, error.message);
        return false;
    }
};

/**
 * Extend a lock's TTL (for long-running jobs)
 *
 * @param {string} jobName - Name of the job
 * @param {string} lockValue - Lock value from acquisition
 * @param {number} newTtl - New TTL in seconds
 * @returns {Promise<boolean>} - True if lock was extended
 */
const extendLock = async (jobName, lockValue, newTtl) => {
    if (!lockValue) {
        return false;
    }

    const lockKey = `${LOCK_PREFIX}${jobName}`;

    try {
        const client = getRedisClient();

        // Use Lua script for atomic compare-and-extend
        const result = await client.eval(EXTEND_LOCK_SCRIPT, 1, lockKey, lockValue, newTtl * 1000);

        if (result === 1) {
            logger.info(`[DistributedLock] Extended lock for "${jobName}" (new TTL: ${newTtl}s)`);
            return true;
        } else {
            logger.warn(`[DistributedLock] Lock for "${jobName}" was not extended (not owner or already expired)`);
            return false;
        }

    } catch (error) {
        logger.error(`[DistributedLock] Error extending lock for "${jobName}":`, error.message);
        return false;
    }
};

/**
 * Check if a lock is currently held
 *
 * @param {string} jobName - Name of the job
 * @returns {Promise<{locked: boolean, ttl: number}>}
 */
const isLocked = async (jobName) => {
    const lockKey = `${LOCK_PREFIX}${jobName}`;

    try {
        const client = getRedisClient();
        const exists = await client.exists(lockKey);

        if (exists === 1) {
            const ttl = await client.ttl(lockKey);
            return { locked: true, ttl };
        }

        return { locked: false, ttl: 0 };

    } catch (error) {
        logger.error(`[DistributedLock] Error checking lock for "${jobName}":`, error.message);
        return { locked: false, ttl: 0, error: error.message };
    }
};

/**
 * Force release a lock (admin use only)
 * WARNING: This can cause race conditions if the job is still running
 *
 * @param {string} jobName - Name of the job
 * @returns {Promise<boolean>}
 */
const forceReleaseLock = async (jobName) => {
    const lockKey = `${LOCK_PREFIX}${jobName}`;

    try {
        const client = getRedisClient();
        const result = await client.del(lockKey);

        logger.warn(`[DistributedLock] Force released lock for "${jobName}"`);
        return result === 1;

    } catch (error) {
        logger.error(`[DistributedLock] Error force releasing lock for "${jobName}":`, error.message);
        return false;
    }
};

/**
 * Get all currently held locks
 *
 * @returns {Promise<Array<{jobName: string, ttl: number, value: string}>>}
 */
const getAllLocks = async () => {
    try {
        const client = getRedisClient();
        const pattern = `${LOCK_PREFIX}*`;
        const locks = [];

        let cursor = '0';
        do {
            const [newCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
            cursor = newCursor;

            for (const key of keys) {
                const [value, ttl] = await Promise.all([
                    client.get(key),
                    client.ttl(key)
                ]);

                const jobName = key.replace(LOCK_PREFIX, '');
                locks.push({
                    jobName,
                    lockKey: key,
                    value: value ? value.substring(0, 30) + '...' : null,
                    ttl,
                    config: JOB_LOCK_CONFIG[jobName]
                });
            }
        } while (cursor !== '0');

        return locks;

    } catch (error) {
        logger.error('[DistributedLock] Error getting all locks:', error.message);
        return [];
    }
};

/**
 * Wrapper to run a job with distributed locking
 *
 * @param {string} jobName - Name of the job
 * @param {Function} jobFn - The job function to execute
 * @param {Object} options - Lock options
 * @returns {Promise<{executed: boolean, result?: any, skipped?: boolean}>}
 */
const withLock = async (jobName, jobFn, options = {}) => {
    const lock = await acquireLock(jobName, options);

    if (!lock.acquired) {
        return {
            executed: false,
            skipped: true,
            reason: lock.reason,
            currentHolder: lock.currentHolder,
            ttlRemaining: lock.ttlRemaining
        };
    }

    try {
        const result = await jobFn();
        return {
            executed: true,
            result,
            failedOpen: lock.failedOpen
        };
    } finally {
        await lock.release();
    }
};

// Helper function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    acquireLock,
    releaseLock,
    extendLock,
    isLocked,
    forceReleaseLock,
    getAllLocks,
    withLock,
    LOCK_TTL,
    JOB_LOCK_CONFIG
};
