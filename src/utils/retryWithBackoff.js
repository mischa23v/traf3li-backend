/**
 * Retry Utility with Exponential Backoff
 *
 * Provides retry logic for external service calls with:
 * - Exponential backoff with jitter
 * - Configurable retry conditions
 * - Timeout per attempt
 * - Max retries limit
 */

const logger = require('./logger');

/**
 * Default retry configuration
 */
const DEFAULT_CONFIG = {
  maxRetries: 3,              // Maximum number of retry attempts
  baseDelay: 1000,            // Base delay in ms (1 second)
  maxDelay: 30000,            // Maximum delay in ms (30 seconds)
  timeout: 30000,             // Timeout per attempt in ms
  exponentialBase: 2,         // Exponential backoff multiplier
  jitter: true,               // Add random jitter to prevent thundering herd
};

/**
 * Errors that are considered retryable
 */
const RETRYABLE_ERRORS = [
  'ECONNREFUSED',             // Connection refused
  'ETIMEDOUT',                // Connection timed out
  'ENOTFOUND',                // DNS lookup failed
  'ECONNRESET',               // Connection reset
  'EPIPE',                    // Broken pipe
  'EAI_AGAIN',                // DNS temporary failure
  'EHOSTUNREACH',             // Host unreachable
  'ENETUNREACH',              // Network unreachable
  'ECONNABORTED',             // Connection aborted
];

/**
 * HTTP status codes that are retryable
 */
const RETRYABLE_STATUS_CODES = [
  408,  // Request Timeout
  429,  // Too Many Requests
  500,  // Internal Server Error
  502,  // Bad Gateway
  503,  // Service Unavailable
  504,  // Gateway Timeout
  522,  // Connection Timed Out (Cloudflare)
  524,  // A Timeout Occurred (Cloudflare)
];

/**
 * Check if an error is retryable
 * @param {Error} error - The error to check
 * @returns {boolean} - Whether the error is retryable
 */
function isRetryableError(error) {
  // Check for network errors by code
  if (error.code && RETRYABLE_ERRORS.includes(error.code)) {
    return true;
  }

  // Check for axios/fetch response status
  const status = error.response?.status || error.status;
  if (status && RETRYABLE_STATUS_CODES.includes(status)) {
    return true;
  }

  // Check for timeout errors
  if (error.message?.toLowerCase().includes('timeout')) {
    return true;
  }

  // Check for ECONNREFUSED in message
  if (error.message?.includes('ECONNREFUSED')) {
    return true;
  }

  return false;
}

/**
 * Calculate delay with exponential backoff and optional jitter
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {Object} config - Retry configuration
 * @returns {number} - Delay in milliseconds
 */
function calculateDelay(attempt, config) {
  const { baseDelay, maxDelay, exponentialBase, jitter } = config;

  // Calculate exponential delay
  let delay = baseDelay * Math.pow(exponentialBase, attempt);

  // Add jitter (±25%)
  if (jitter) {
    const jitterFactor = 0.75 + Math.random() * 0.5;
    delay = delay * jitterFactor;
  }

  // Cap at max delay
  return Math.min(delay, maxDelay);
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Duration in milliseconds
 * @returns {Promise} - Resolves after the delay
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wrap a function with retry logic
 * @param {Function} fn - The async function to wrap
 * @param {Object} options - Retry options
 * @returns {Function} - Wrapped function with retry
 */
function withRetry(fn, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };

  return async (...args) => {
    let lastError;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        // Add timeout wrapper if specified
        if (config.timeout) {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error(`Request timed out after ${config.timeout}ms`));
            }, config.timeout);
          });

          return await Promise.race([fn(...args), timeoutPromise]);
        }

        return await fn(...args);
      } catch (error) {
        lastError = error;

        // Don't retry on last attempt or non-retryable errors
        const isLastAttempt = attempt === config.maxRetries;
        const shouldRetry = config.shouldRetry
          ? config.shouldRetry(error, attempt)
          : isRetryableError(error);

        if (isLastAttempt || !shouldRetry) {
          throw error;
        }

        // Calculate and apply delay
        const delay = calculateDelay(attempt, config);

        logger.warn(
          `[Retry] Attempt ${attempt + 1}/${config.maxRetries + 1} failed: ${error.message}. ` +
          `Retrying in ${Math.round(delay)}ms...`
        );

        await sleep(delay);
      }
    }

    throw lastError;
  };
}

/**
 * Execute a function with retry logic (one-off)
 * @param {Function} fn - The async function to execute
 * @param {Object} options - Retry options
 * @returns {Promise} - Result of the function
 */
async function retryAsync(fn, options = {}) {
  const wrapped = withRetry(fn, options);
  return wrapped();
}

/**
 * Create axios request config with retry interceptor
 * @param {Object} axiosInstance - Axios instance to configure
 * @param {Object} options - Retry options
 */
function configureAxiosRetry(axiosInstance, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };

  axiosInstance.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config;

      // Initialize retry count
      originalRequest._retryCount = originalRequest._retryCount || 0;

      // Check if we should retry
      const shouldRetry = isRetryableError(error) &&
                          originalRequest._retryCount < config.maxRetries;

      if (!shouldRetry) {
        throw error;
      }

      // Increment retry count
      originalRequest._retryCount += 1;

      // Calculate delay
      const delay = calculateDelay(originalRequest._retryCount - 1, config);

      logger.warn(
        `[AxiosRetry] Request to ${originalRequest.url} failed. ` +
        `Retry ${originalRequest._retryCount}/${config.maxRetries} in ${Math.round(delay)}ms`
      );

      // Wait before retrying
      await sleep(delay);

      // Retry the request
      return axiosInstance(originalRequest);
    }
  );
}

/**
 * Pre-configured retry options for different service types
 */
const SERVICE_CONFIGS = {
  // Government APIs - more retries, longer delays
  government: {
    maxRetries: 4,
    baseDelay: 2000,
    maxDelay: 60000,
    timeout: 45000,
  },

  // Payment services - fewer retries, faster failure
  payment: {
    maxRetries: 2,
    baseDelay: 1000,
    maxDelay: 10000,
    timeout: 30000,
  },

  // AI services - longer timeouts
  ai: {
    maxRetries: 2,
    baseDelay: 2000,
    maxDelay: 30000,
    timeout: 90000,
  },

  // General external APIs
  external: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    timeout: 30000,
  },

  // Webhooks - quick retries
  webhook: {
    maxRetries: 3,
    baseDelay: 500,
    maxDelay: 5000,
    timeout: 15000,
  },
};

module.exports = {
  withRetry,
  retryAsync,
  configureAxiosRetry,
  isRetryableError,
  calculateDelay,
  SERVICE_CONFIGS,
  DEFAULT_CONFIG,
  RETRYABLE_ERRORS,
  RETRYABLE_STATUS_CODES,
};
