/**
 * Idempotency Middleware
 *
 * Ensures that duplicate requests with the same idempotency key
 * return the cached response instead of processing again.
 *
 * Usage: Apply to financial endpoints that modify state (payments, etc.)
 */

const {
  setIfNotExists,
  getValue,
  setWithExpiry,
  isRedisConnected
} = require("../configs/redis");

// TTL for idempotency keys (24 hours)
const IDEMPOTENCY_TTL = 24 * 60 * 60;

// Header name for idempotency key
const IDEMPOTENCY_HEADER = "idempotency-key";

// Prefix for Redis keys
const KEY_PREFIX = "idempotency:";

// Status indicators
const STATUS_PROCESSING = "processing";
const STATUS_COMPLETE = "complete";

/**
 * Create idempotency middleware
 * @param {Object} options - Configuration options
 * @param {boolean} options.required - Whether idempotency key is required (default: true)
 * @param {number} options.ttl - TTL in seconds (default: 24 hours)
 */
const checkIdempotency = (options = {}) => {
  const { required = true, ttl = IDEMPOTENCY_TTL } = options;

  return async (req, res, next) => {
    // Check if idempotency is enabled
    if (process.env.REQUIRE_IDEMPOTENCY_KEYS === "false" && !required) {
      return next();
    }

    // Get idempotency key from header
    const idempotencyKey = req.headers[IDEMPOTENCY_HEADER];

    // If no key provided
    if (!idempotencyKey) {
      if (required) {
        return res.status(400).json({
          success: false,
          error: "Idempotency-Key header is required",
          code: "MISSING_IDEMPOTENCY_KEY"
        });
      }
      return next();
    }

    // Validate key format (UUID recommended)
    if (idempotencyKey.length < 8 || idempotencyKey.length > 64) {
      return res.status(400).json({
        success: false,
        error: "Invalid Idempotency-Key format. Must be 8-64 characters.",
        code: "INVALID_IDEMPOTENCY_KEY"
      });
    }

    // Check Redis connection
    if (!isRedisConnected()) {
      // If Redis is not available, log warning and proceed without idempotency
      console.warn("Redis not connected, skipping idempotency check");
      return next();
    }

    const redisKey = `${KEY_PREFIX}${req.method}:${req.originalUrl}:${idempotencyKey}`;

    try {
      // Check if key exists
      const existingData = await getValue(redisKey);

      if (existingData) {
        // Key exists - check status
        if (existingData.status === STATUS_PROCESSING) {
          // Request is still being processed (concurrent duplicate)
          return res.status(409).json({
            success: false,
            error: "Request is still being processed",
            code: "CONCURRENT_REQUEST"
          });
        }

        if (existingData.status === STATUS_COMPLETE) {
          // Return cached response
          res.set("Idempotency-Key-Status", "cached");
          return res.status(existingData.statusCode).json(existingData.response);
        }
      }

      // Try to set processing status (atomic operation)
      const wasSet = await setIfNotExists(
        redisKey,
        { status: STATUS_PROCESSING, timestamp: Date.now() },
        ttl
      );

      if (!wasSet) {
        // Another request already processing
        return res.status(409).json({
          success: false,
          error: "Request is still being processed",
          code: "CONCURRENT_REQUEST"
        });
      }

      // Store original methods
      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);

      // Helper to cache response
      const cacheResponse = async (data) => {
        try {
          await setWithExpiry(
            redisKey,
            {
              status: STATUS_COMPLETE,
              statusCode: res.statusCode,
              response: data,
              timestamp: Date.now()
            },
            ttl
          );
        } catch (cacheError) {
          console.error("Error caching idempotency response:", cacheError);
        }
        // Set header to indicate fresh response
        res.set("Idempotency-Key-Status", "fresh");
      };

      // Override json to capture response
      res.json = async (data) => {
        await cacheResponse(data);
        return originalJson(data);
      };

      // Override send to capture response (for non-JSON responses)
      res.send = async (data) => {
        // Only cache if it looks like JSON data
        if (typeof data === 'object' && data !== null) {
          await cacheResponse(data);
        }
        return originalSend(data);
      };

      next();
    } catch (error) {
      console.error("Idempotency middleware error:", error);
      // On Redis error, proceed without idempotency
      next();
    }
  };
};

/**
 * Optional idempotency - doesn't require key but uses it if provided
 */
const optionalIdempotency = checkIdempotency({ required: false });

/**
 * Required idempotency - returns 400 if key not provided
 */
const requiredIdempotency = checkIdempotency({ required: true });

module.exports = {
  checkIdempotency,
  optionalIdempotency,
  requiredIdempotency,
  IDEMPOTENCY_HEADER
};
