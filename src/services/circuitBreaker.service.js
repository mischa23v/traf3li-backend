const CircuitBreaker = require('opossum');
const logger = require('../utils/logger');

const defaultOptions = {
  timeout: 10000, // 10 seconds
  errorThresholdPercentage: 50, // Open circuit when 50% of requests fail
  resetTimeout: 30000, // Try again after 30 seconds
  volumeThreshold: 5, // Minimum requests before calculating error percentage
};

const breakers = new Map();

function createCircuitBreaker(name, asyncFunction, options = {}) {
  const breaker = new CircuitBreaker(asyncFunction, {
    ...defaultOptions,
    ...options,
    name,
  });

  breaker.on('open', () => logger.warn(`Circuit breaker '${name}' opened`));
  breaker.on('halfOpen', () => logger.info(`Circuit breaker '${name}' half-open`));
  breaker.on('close', () => logger.info(`Circuit breaker '${name}' closed`));
  breaker.on('fallback', () => logger.warn(`Circuit breaker '${name}' fallback called`));

  breakers.set(name, breaker);
  return breaker;
}

function getBreaker(name) {
  return breakers.get(name);
}

function getStats() {
  const stats = {};
  breakers.forEach((breaker, name) => {
    stats[name] = breaker.stats;
  });
  return stats;
}

module.exports = { createCircuitBreaker, getBreaker, getStats };
