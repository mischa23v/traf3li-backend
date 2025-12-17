/**
 * External Service Wrapper
 *
 * Provides pre-configured circuit breakers and retry logic for external API services.
 * This module wraps external service calls with resilience patterns.
 *
 * Usage:
 *   const { wrapExternalCall } = require('../utils/externalServiceWrapper');
 *
 *   // Wrap your service method
 *   const result = await wrapExternalCall('moj', () => mojService.verifyAttorney(id));
 */

const { withCircuitBreaker, SERVICE_CONFIGS } = require('./circuitBreaker');
const { withRetry, SERVICE_CONFIGS: RETRY_CONFIGS } = require('./retryWithBackoff');

// Service-specific configurations
const EXTERNAL_SERVICES = {
  // Government APIs (Saudi Arabia)
  moj: {
    name: 'MOJ (Ministry of Justice)',
    circuitConfig: SERVICE_CONFIGS.government,
    retryConfig: RETRY_CONFIGS.government,
  },
  wathq: {
    name: 'Wathq (Business Verification)',
    circuitConfig: SERVICE_CONFIGS.government,
    retryConfig: RETRY_CONFIGS.government,
  },
  yakeen: {
    name: 'Yakeen (ID Verification)',
    circuitConfig: SERVICE_CONFIGS.government,
    retryConfig: RETRY_CONFIGS.government,
  },
  zatca: {
    name: 'ZATCA (E-Invoicing)',
    circuitConfig: SERVICE_CONFIGS.government,
    retryConfig: RETRY_CONFIGS.government,
  },
  sadad: {
    name: 'SADAD (Bill Payment)',
    circuitConfig: SERVICE_CONFIGS.payment,
    retryConfig: RETRY_CONFIGS.payment,
  },

  // Payment Services
  stripe: {
    name: 'Stripe (Payments)',
    circuitConfig: SERVICE_CONFIGS.payment,
    retryConfig: RETRY_CONFIGS.payment,
  },
  leantech: {
    name: 'Leantech (Open Banking)',
    circuitConfig: SERVICE_CONFIGS.payment,
    retryConfig: RETRY_CONFIGS.payment,
  },

  // AI Services
  openai: {
    name: 'OpenAI (GPT)',
    circuitConfig: SERVICE_CONFIGS.ai,
    retryConfig: RETRY_CONFIGS.ai,
  },
  anthropic: {
    name: 'Anthropic (Claude)',
    circuitConfig: SERVICE_CONFIGS.ai,
    retryConfig: RETRY_CONFIGS.ai,
  },

  // Communication Services
  whatsapp: {
    name: 'WhatsApp (Meta)',
    circuitConfig: SERVICE_CONFIGS.external,
    retryConfig: RETRY_CONFIGS.external,
  },
  resend: {
    name: 'Resend (Email)',
    circuitConfig: SERVICE_CONFIGS.external,
    retryConfig: RETRY_CONFIGS.external,
  },

  // Data Services
  exchangeRate: {
    name: 'Exchange Rate API',
    circuitConfig: SERVICE_CONFIGS.external,
    retryConfig: RETRY_CONFIGS.external,
  },
  yahoo: {
    name: 'Yahoo Finance',
    circuitConfig: SERVICE_CONFIGS.external,
    retryConfig: RETRY_CONFIGS.external,
  },

  // Webhooks
  webhook: {
    name: 'Webhook Delivery',
    circuitConfig: SERVICE_CONFIGS.webhook,
    retryConfig: RETRY_CONFIGS.webhook,
  },
};

// Cache for wrapped functions
const wrappedFunctions = new Map();

/**
 * Wrap an external service call with circuit breaker and retry logic
 *
 * @param {string} serviceKey - Key from EXTERNAL_SERVICES (e.g., 'moj', 'stripe')
 * @param {Function} fn - The async function to wrap
 * @param {Object} options - Optional override options
 * @returns {Promise<any>} - Result of the function call
 */
async function wrapExternalCall(serviceKey, fn, options = {}) {
  const service = EXTERNAL_SERVICES[serviceKey];

  if (!service) {
    console.warn(`[ExternalServiceWrapper] Unknown service: ${serviceKey}, using default config`);
    // Use external defaults for unknown services
    const defaultCircuit = SERVICE_CONFIGS.external;
    const defaultRetry = RETRY_CONFIGS.external;

    const retryWrapped = withRetry(fn, { ...defaultRetry, ...options.retry });
    return withCircuitBreaker(
      `external:${serviceKey}`,
      retryWrapped,
      { ...defaultCircuit, ...options.circuit },
      options.fallback
    )();
  }

  // Create a unique cache key for this service+function combo
  const cacheKey = `${serviceKey}:${fn.toString().slice(0, 100)}`;

  // Use cached wrapper if available
  if (!wrappedFunctions.has(cacheKey)) {
    // First wrap with retry
    const retryWrapped = withRetry(fn, { ...service.retryConfig, ...options.retry });

    // Then wrap with circuit breaker
    const fullWrapped = withCircuitBreaker(
      serviceKey,
      retryWrapped,
      { ...service.circuitConfig, ...options.circuit },
      options.fallback
    );

    wrappedFunctions.set(cacheKey, fullWrapped);
  }

  return wrappedFunctions.get(cacheKey)();
}

/**
 * Create a wrapped service instance
 *
 * @param {string} serviceKey - Key from EXTERNAL_SERVICES
 * @param {Object} serviceInstance - The service instance to wrap
 * @param {Array<string>} methodNames - Names of methods to wrap
 * @returns {Object} - Wrapped service with resilient methods
 */
function wrapServiceMethods(serviceKey, serviceInstance, methodNames) {
  const wrapped = Object.create(serviceInstance);

  methodNames.forEach(methodName => {
    const originalMethod = serviceInstance[methodName];

    if (typeof originalMethod === 'function') {
      wrapped[methodName] = async (...args) => {
        return wrapExternalCall(serviceKey, () => originalMethod.apply(serviceInstance, args));
      };
    }
  });

  return wrapped;
}

/**
 * Get service health status
 *
 * @param {string} serviceKey - Service key to check
 * @returns {Object} - Health status including circuit state
 */
function getServiceHealth(serviceKey) {
  const { getStats } = require('./circuitBreaker');
  const stats = getStats(serviceKey);

  if (!stats) {
    return {
      service: serviceKey,
      status: 'unknown',
      message: 'No circuit breaker data available',
    };
  }

  return {
    service: serviceKey,
    name: EXTERNAL_SERVICES[serviceKey]?.name || serviceKey,
    status: stats.state === 'open' ? 'degraded' : 'healthy',
    circuitState: stats.state,
    stats: {
      successCount: stats.stats?.successes || 0,
      failureCount: stats.stats?.failures || 0,
      timeouts: stats.stats?.timeouts || 0,
      rejects: stats.stats?.rejects || 0,
    },
  };
}

/**
 * Get health status for all external services
 *
 * @returns {Array<Object>} - Array of health statuses
 */
function getAllServicesHealth() {
  return Object.keys(EXTERNAL_SERVICES).map(getServiceHealth);
}

module.exports = {
  wrapExternalCall,
  wrapServiceMethods,
  getServiceHealth,
  getAllServicesHealth,
  EXTERNAL_SERVICES,
};
