/**
 * Circuit Breaker Utility
 *
 * Implements the circuit breaker pattern for external service calls.
 * Prevents cascade failures when external services are down.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is down, requests fail fast
 * - HALF_OPEN: Testing if service has recovered
 */

const CircuitBreaker = require('opossum');
const logger = require('./logger');

// Default options for circuit breakers
const DEFAULT_OPTIONS = {
  timeout: 30000,                    // 30 seconds - time before a call is considered failed
  errorThresholdPercentage: 50,      // Open circuit when 50% of requests fail
  resetTimeout: 30000,               // 30 seconds - time to wait before testing again
  volumeThreshold: 5,                // Minimum requests before calculating error percentage
  rollingCountTimeout: 10000,        // 10 seconds - time window for statistics
  rollingCountBuckets: 10,           // Number of buckets for rolling window
};

// Store for circuit breaker instances with access tracking
const breakers = new Map();
const breakerLastAccess = new Map();
const MAX_BREAKERS = 100; // Maximum number of circuit breakers to prevent unbounded growth
const BREAKER_IDLE_TTL = 60 * 60 * 1000; // 1 hour - remove idle breakers after this time
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

// Periodic cleanup of idle circuit breakers to prevent memory leak
const breakerCleanupInterval = setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;

  breakerLastAccess.forEach((lastAccess, name) => {
    if (now - lastAccess > BREAKER_IDLE_TTL) {
      const breaker = breakers.get(name);
      if (breaker) {
        breaker.shutdown(); // Clean up the circuit breaker
        breakers.delete(name);
        breakerLastAccess.delete(name);
        cleanedCount++;
        logger.debug(`[CircuitBreaker] ${name}: Removed due to inactivity`);
      }
    }
  });

  if (cleanedCount > 0) {
    logger.info(`[CircuitBreaker] Cleanup: Removed ${cleanedCount} idle breakers, ${breakers.size} remaining`);
  }
}, CLEANUP_INTERVAL);

// Ensure cleanup interval doesn't prevent process exit
breakerCleanupInterval.unref();

/**
 * Create or get a circuit breaker for a service
 * @param {string} name - Unique name for the service
 * @param {Function} fn - The async function to wrap
 * @param {Object} options - Circuit breaker options
 * @returns {CircuitBreaker} - The circuit breaker instance
 */
function createBreaker(name, fn, options = {}) {
  // Update last access time
  breakerLastAccess.set(name, Date.now());

  if (breakers.has(name)) {
    return breakers.get(name);
  }

  // Check if we're at capacity and need to remove old breakers
  if (breakers.size >= MAX_BREAKERS) {
    let oldestName = null;
    let oldestTime = Infinity;

    breakerLastAccess.forEach((lastAccess, breakerName) => {
      if (lastAccess < oldestTime) {
        oldestTime = lastAccess;
        oldestName = breakerName;
      }
    });

    if (oldestName) {
      const oldBreaker = breakers.get(oldestName);
      if (oldBreaker) {
        oldBreaker.shutdown();
      }
      breakers.delete(oldestName);
      breakerLastAccess.delete(oldestName);
      logger.warn(`[CircuitBreaker] Removed oldest breaker '${oldestName}' to make room for '${name}'`);
    }
  }

  const breakerOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
    name,
  };

  const breaker = new CircuitBreaker(fn, breakerOptions);

  // Event handlers for monitoring
  breaker.on('success', () => {
    // Request succeeded
  });

  breaker.on('timeout', () => {
    logger.warn(`[CircuitBreaker] ${name}: Request timed out`);
  });

  breaker.on('reject', () => {
    logger.warn(`[CircuitBreaker] ${name}: Request rejected (circuit open)`);
  });

  breaker.on('open', () => {
    logger.error(`[CircuitBreaker] ${name}: Circuit OPENED - service appears down`);
  });

  breaker.on('halfOpen', () => {
    logger.info(`[CircuitBreaker] ${name}: Circuit HALF-OPEN - testing service`);
  });

  breaker.on('close', () => {
    logger.info(`[CircuitBreaker] ${name}: Circuit CLOSED - service recovered`);
  });

  breaker.on('fallback', (result) => {
    logger.warn(`[CircuitBreaker] ${name}: Fallback executed`);
  });

  breakers.set(name, breaker);
  return breaker;
}

/**
 * Get circuit breaker stats for monitoring
 * @param {string} name - Service name
 * @returns {Object} - Circuit breaker statistics
 */
function getStats(name) {
  const breaker = breakers.get(name);
  if (!breaker) {
    return null;
  }

  return {
    name,
    state: breaker.status.state,
    stats: breaker.stats,
    options: {
      timeout: breaker.options.timeout,
      errorThresholdPercentage: breaker.options.errorThresholdPercentage,
      resetTimeout: breaker.options.resetTimeout,
      volumeThreshold: breaker.options.volumeThreshold,
    },
  };
}

/**
 * Get all circuit breaker stats
 * @returns {Array} - Array of all circuit breaker statistics
 */
function getAllStats() {
  const stats = [];
  for (const name of breakers.keys()) {
    stats.push(getStats(name));
  }
  return stats;
}

/**
 * Reset a circuit breaker (force close)
 * @param {string} name - Service name
 */
function resetBreaker(name) {
  const breaker = breakers.get(name);
  if (breaker) {
    breaker.close();
    logger.info(`[CircuitBreaker] ${name}: Circuit manually reset to CLOSED`);
  }
}

/**
 * Create a wrapped function with circuit breaker
 * @param {string} name - Unique name for the service
 * @param {Function} fn - The async function to wrap
 * @param {Object} options - Circuit breaker options
 * @param {Function} fallback - Optional fallback function
 * @returns {Function} - Wrapped function with circuit breaker
 */
function withCircuitBreaker(name, fn, options = {}, fallback = null) {
  const breaker = createBreaker(name, fn, options);

  if (fallback) {
    breaker.fallback(fallback);
  }

  return async (...args) => {
    return breaker.fire(...args);
  };
}

/**
 * Pre-configured circuit breaker options for different service types
 */
const SERVICE_CONFIGS = {
  // Government APIs (MOJ, Wathq, Yakeen) - slower, more tolerant
  government: {
    timeout: 45000,                  // 45 seconds
    errorThresholdPercentage: 60,    // 60% failure rate
    resetTimeout: 60000,             // 1 minute recovery
    volumeThreshold: 3,              // Low volume
  },

  // Payment services - critical, fast failure
  payment: {
    timeout: 30000,                  // 30 seconds
    errorThresholdPercentage: 40,    // 40% failure rate
    resetTimeout: 30000,             // 30 seconds recovery
    volumeThreshold: 5,
  },

  // AI services - longer timeout, more tolerant
  ai: {
    timeout: 90000,                  // 90 seconds
    errorThresholdPercentage: 70,    // 70% failure rate
    resetTimeout: 45000,             // 45 seconds recovery
    volumeThreshold: 3,
  },

  // General external APIs
  external: {
    timeout: 30000,                  // 30 seconds
    errorThresholdPercentage: 50,    // 50% failure rate
    resetTimeout: 30000,             // 30 seconds recovery
    volumeThreshold: 5,
  },

  // Webhooks - fire and forget, fast failure
  webhook: {
    timeout: 15000,                  // 15 seconds
    errorThresholdPercentage: 70,    // 70% failure rate
    resetTimeout: 15000,             // 15 seconds recovery
    volumeThreshold: 10,
  },
};

module.exports = {
  createBreaker,
  withCircuitBreaker,
  getStats,
  getAllStats,
  resetBreaker,
  SERVICE_CONFIGS,
  DEFAULT_OPTIONS,
};
