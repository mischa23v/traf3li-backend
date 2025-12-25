/**
 * Password Breach Detection Service
 *
 * Checks if passwords have been leaked in data breaches using HaveIBeenPwned API.
 * Uses k-anonymity model to protect user privacy:
 * - Only sends first 5 characters of SHA1 hash to API
 * - Full hash never leaves the server
 * - API returns all hashes matching the prefix
 * - We check locally if our full hash is in the response
 *
 * Features:
 * - Multi-level caching (memory + Redis) to reduce API calls
 * - Graceful degradation (continues if API is down)
 * - Rate limiting via caching
 * - Production-ready error handling
 *
 * Security: Supabase Auth Pro tier feature
 */

const crypto = require('crypto');
const axios = require('axios');
const logger = require('../utils/logger');

// Configuration
const PWNED_API_URL = 'https://api.pwnedpasswords.com/range';
const CACHE_TTL_SECONDS = 3600; // 1 hour (reduce API calls)
const REQUEST_TIMEOUT_MS = 5000; // 5 seconds max
const ENABLE_BREACH_CHECK = process.env.ENABLE_PASSWORD_BREACH_CHECK === 'true';

// In-memory cache (shared across all requests in this process)
// Key: SHA1 hash prefix (first 5 chars), Value: { data: string, timestamp: number }
const inMemoryCache = new Map();

// Redis client (if available)
let redisClient = null;
try {
    const { getRedisClient } = require('../config/redis.config');
    redisClient = getRedisClient();
} catch (error) {
    logger.warn('Redis not available for password breach cache - using in-memory cache only');
}

/**
 * Generate SHA1 hash of password (uppercase hex)
 * @param {string} password - Password to hash
 * @returns {string} - SHA1 hash in uppercase hex format
 */
function generateSHA1Hash(password) {
    if (!password || typeof password !== 'string') {
        throw new Error('Password must be a non-empty string');
    }

    return crypto
        .createHash('sha1')
        .update(password)
        .digest('hex')
        .toUpperCase();
}

/**
 * Get cached breach data from memory or Redis
 * @param {string} hashPrefix - First 5 characters of SHA1 hash
 * @returns {Promise<string|null>} - Cached data or null if not found/expired
 */
async function getCachedData(hashPrefix) {
    // 1. Check in-memory cache first (fastest)
    const memCache = inMemoryCache.get(hashPrefix);
    if (memCache) {
        const age = (Date.now() - memCache.timestamp) / 1000;
        if (age < CACHE_TTL_SECONDS) {
            logger.debug(`Password breach check: in-memory cache hit for ${hashPrefix}`);
            return memCache.data;
        }
        // Expired - remove it
        inMemoryCache.delete(hashPrefix);
    }

    // 2. Check Redis cache (if available)
    if (redisClient) {
        try {
            const cacheKey = `pwned:${hashPrefix}`;
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.debug(`Password breach check: Redis cache hit for ${hashPrefix}`);
                // Also store in memory for faster subsequent access
                inMemoryCache.set(hashPrefix, {
                    data: cached,
                    timestamp: Date.now()
                });
                return cached;
            }
        } catch (error) {
            logger.warn('Redis cache read failed for password breach check', { error: error.message });
            // Continue without cache
        }
    }

    return null;
}

/**
 * Store breach data in cache (memory + Redis)
 * @param {string} hashPrefix - First 5 characters of SHA1 hash
 * @param {string} data - Response data from API
 */
async function setCachedData(hashPrefix, data) {
    // 1. Store in memory cache
    inMemoryCache.set(hashPrefix, {
        data,
        timestamp: Date.now()
    });

    // Clean up old entries if cache gets too large (> 10000 entries)
    if (inMemoryCache.size > 10000) {
        const now = Date.now();
        for (const [key, value] of inMemoryCache.entries()) {
            const age = (now - value.timestamp) / 1000;
            if (age >= CACHE_TTL_SECONDS) {
                inMemoryCache.delete(key);
            }
        }
    }

    // 2. Store in Redis (if available)
    if (redisClient) {
        try {
            const cacheKey = `pwned:${hashPrefix}`;
            await redisClient.setex(cacheKey, CACHE_TTL_SECONDS, data);
            logger.debug(`Password breach check: stored in Redis cache for ${hashPrefix}`);
        } catch (error) {
            logger.warn('Redis cache write failed for password breach check', { error: error.message });
            // Continue without Redis caching
        }
    }
}

/**
 * Query HaveIBeenPwned API for hash prefix
 * @param {string} hashPrefix - First 5 characters of SHA1 hash
 * @returns {Promise<string>} - Response data (hash suffixes with counts)
 */
async function queryPwnedAPI(hashPrefix) {
    try {
        const response = await axios.get(`${PWNED_API_URL}/${hashPrefix}`, {
            timeout: REQUEST_TIMEOUT_MS,
            headers: {
                'User-Agent': 'Traf3li-LegalTech-Platform',
                'Add-Padding': 'true' // HIBP padding to prevent response size analysis
            }
        });

        if (response.status !== 200) {
            throw new Error(`API returned status ${response.status}`);
        }

        return response.data;
    } catch (error) {
        // Log error but don't throw - we'll handle this gracefully
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            logger.warn('HaveIBeenPwned API timeout', {
                hashPrefix,
                timeout: REQUEST_TIMEOUT_MS
            });
        } else if (error.response) {
            logger.warn('HaveIBeenPwned API error response', {
                hashPrefix,
                status: error.response.status,
                statusText: error.response.statusText
            });
        } else if (error.request) {
            logger.warn('HaveIBeenPwned API no response', {
                hashPrefix,
                error: error.message
            });
        } else {
            logger.error('HaveIBeenPwned API request failed', {
                hashPrefix,
                error: error.message
            });
        }

        throw error; // Re-throw to be caught by checkPasswordBreach
    }
}

/**
 * Check if a password has been breached using HaveIBeenPwned API
 * Uses k-anonymity model to protect privacy
 *
 * @param {string} password - Password to check (plain text)
 * @returns {Promise<{breached: boolean, count: number, error: boolean, errorMessage?: string}>}
 *
 * @example
 * const result = await checkPasswordBreach('password123');
 * if (result.breached) {
 *   console.log(`Password found in ${result.count} breaches`);
 * }
 */
async function checkPasswordBreach(password) {
    // Default response (not breached, no error)
    const defaultResponse = {
        breached: false,
        count: 0,
        error: false
    };

    // 1. Check if feature is enabled
    if (!ENABLE_BREACH_CHECK) {
        logger.debug('Password breach check disabled via environment variable');
        return defaultResponse;
    }

    // 2. Validate input
    if (!password || typeof password !== 'string') {
        logger.warn('Invalid password provided to breach check');
        return { ...defaultResponse, error: true, errorMessage: 'Invalid password' };
    }

    // 3. Minimum password length check (avoid checking very short passwords)
    if (password.length < 4) {
        logger.debug('Password too short for breach check');
        return defaultResponse;
    }

    try {
        // 4. Generate SHA1 hash
        const fullHash = generateSHA1Hash(password);
        const hashPrefix = fullHash.substring(0, 5); // First 5 chars sent to API
        const hashSuffix = fullHash.substring(5);    // Remaining chars for local matching

        logger.debug(`Checking password breach for hash prefix: ${hashPrefix}`);

        // 5. Check cache first
        let apiResponse = await getCachedData(hashPrefix);

        // 6. Query API if not cached
        if (!apiResponse) {
            logger.debug(`Password breach check: cache miss, querying API for ${hashPrefix}`);
            apiResponse = await queryPwnedAPI(hashPrefix);

            // Store in cache for future requests
            await setCachedData(hashPrefix, apiResponse);
        }

        // 7. Parse response and check for our hash
        // Response format: "SUFFIX:COUNT\r\nSUFFIX:COUNT\r\n..."
        const lines = apiResponse.split('\r\n');

        for (const line of lines) {
            if (!line.trim()) continue;

            const [responseSuffix, countStr] = line.split(':');

            if (responseSuffix === hashSuffix) {
                const count = parseInt(countStr, 10);
                logger.info('Password found in breach database', {
                    count,
                    hashPrefix // Log prefix only, never the full hash
                });

                return {
                    breached: true,
                    count: count,
                    error: false
                };
            }
        }

        // 8. Not found in breaches
        logger.debug('Password not found in breach database', { hashPrefix });
        return defaultResponse;

    } catch (error) {
        // CRITICAL: Never block user registration/login if API fails
        // Graceful degradation - log error and allow password
        logger.error('Password breach check failed - allowing password due to API error', {
            error: error.message,
            stack: error.stack
        });

        return {
            breached: false,
            count: 0,
            error: true,
            errorMessage: 'Breach check service temporarily unavailable'
        };
    }
}

/**
 * Clear all cached breach data (for testing or maintenance)
 * @returns {Promise<{cleared: number}>} - Number of entries cleared
 */
async function clearCache() {
    let cleared = inMemoryCache.size;
    inMemoryCache.clear();

    if (redisClient) {
        try {
            // Delete all pwned:* keys from Redis
            const keys = await redisClient.keys('pwned:*');
            if (keys.length > 0) {
                await redisClient.del(...keys);
                cleared += keys.length;
            }
        } catch (error) {
            logger.error('Failed to clear Redis breach cache', { error: error.message });
        }
    }

    logger.info('Password breach cache cleared', { entriesCleared: cleared });
    return { cleared };
}

/**
 * Get cache statistics
 * @returns {Promise<{memorySize: number, redisSize: number, enabled: boolean}>}
 */
async function getCacheStats() {
    const stats = {
        memorySize: inMemoryCache.size,
        redisSize: 0,
        enabled: ENABLE_BREACH_CHECK,
        ttlSeconds: CACHE_TTL_SECONDS
    };

    if (redisClient) {
        try {
            const keys = await redisClient.keys('pwned:*');
            stats.redisSize = keys.length;
        } catch (error) {
            logger.warn('Failed to get Redis cache stats', { error: error.message });
        }
    }

    return stats;
}

module.exports = {
    checkPasswordBreach,
    clearCache,
    getCacheStats,
    // Export for testing
    generateSHA1Hash
};
