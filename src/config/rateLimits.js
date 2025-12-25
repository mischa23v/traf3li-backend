/**
 * Rate Limits Configuration
 *
 * Defines rate limits by subscription tier and endpoint category.
 * Used by rate limiting service and middleware.
 */

/**
 * Rate Limits by Subscription Tier
 *
 * Each tier has limits for:
 * - requestsPerMinute: Max requests per minute
 * - requestsPerDay: Max requests per day
 * - burstLimit: Max requests in burst window (10 seconds)
 * - concurrentRequests: Max concurrent requests
 */
const TIER_LIMITS = {
  free: {
    name: 'Free',
    nameAr: 'مجاني',
    requestsPerMinute: 100,
    requestsPerDay: 1000,
    burstLimit: 20,
    burstWindow: 10, // seconds
    concurrentRequests: 5,
    apiAccess: false
  },
  starter: {
    name: 'Starter',
    nameAr: 'المبتدئ',
    requestsPerMinute: 300,
    requestsPerDay: 10000,
    burstLimit: 50,
    burstWindow: 10,
    concurrentRequests: 10,
    apiAccess: false
  },
  professional: {
    name: 'Professional',
    nameAr: 'المحترف',
    requestsPerMinute: 1000,
    requestsPerDay: 100000,
    burstLimit: 150,
    burstWindow: 10,
    concurrentRequests: 25,
    apiAccess: true
  },
  enterprise: {
    name: 'Enterprise',
    nameAr: 'المؤسسات',
    requestsPerMinute: 5000,
    requestsPerDay: -1, // unlimited
    burstLimit: 500,
    burstWindow: 10,
    concurrentRequests: 100,
    apiAccess: true
  }
};

/**
 * Rate Limits by Endpoint Category
 *
 * Different endpoint types have different rate limits regardless of tier.
 * These are multipliers or specific limits that override tier defaults.
 */
const ENDPOINT_LIMITS = {
  // Authentication endpoints - strict limits
  auth: {
    login: {
      requestsPerMinute: 5,
      requestsPerHour: 20,
      burstLimit: 3,
      skipSuccessful: true // Don't count successful logins
    },
    register: {
      requestsPerMinute: 3,
      requestsPerHour: 10,
      burstLimit: 2
    },
    passwordReset: {
      requestsPerHour: 3,
      requestsPerDay: 5,
      burstLimit: 2
    },
    mfa: {
      requestsPerMinute: 10,
      requestsPerHour: 30,
      burstLimit: 5
    },
    oauth: {
      requestsPerMinute: 10,
      requestsPerHour: 50,
      burstLimit: 5
    }
  },

  // API endpoints - based on tier
  api: {
    read: {
      multiplier: 1.0 // Use tier limit as-is
    },
    write: {
      multiplier: 0.5 // 50% of tier limit
    },
    delete: {
      multiplier: 0.2 // 20% of tier limit
    }
  },

  // Upload endpoints - strict limits
  upload: {
    document: {
      requestsPerMinute: 10,
      requestsPerHour: 50,
      requestsPerDay: 200,
      burstLimit: 5
    },
    image: {
      requestsPerMinute: 20,
      requestsPerHour: 100,
      requestsPerDay: 500,
      burstLimit: 10
    },
    bulk: {
      requestsPerMinute: 2,
      requestsPerHour: 10,
      requestsPerDay: 50,
      burstLimit: 1
    }
  },

  // Export endpoints - moderate limits
  export: {
    pdf: {
      requestsPerMinute: 10,
      requestsPerHour: 50,
      burstLimit: 5
    },
    excel: {
      requestsPerMinute: 10,
      requestsPerHour: 50,
      burstLimit: 5
    },
    bulk: {
      requestsPerMinute: 2,
      requestsPerHour: 10,
      burstLimit: 1
    }
  },

  // Search endpoints
  search: {
    requestsPerMinute: 30,
    requestsPerHour: 500,
    burstLimit: 10
  },

  // Payment endpoints - very strict
  payment: {
    requestsPerMinute: 5,
    requestsPerHour: 20,
    requestsPerDay: 50,
    burstLimit: 2
  },

  // Webhook endpoints
  webhook: {
    requestsPerMinute: 100,
    requestsPerHour: 1000,
    burstLimit: 50
  },

  // Admin endpoints - higher limits
  admin: {
    requestsPerMinute: 200,
    requestsPerHour: 2000,
    burstLimit: 50
  },

  // Public endpoints - moderate limits
  public: {
    requestsPerMinute: 50,
    requestsPerHour: 500,
    burstLimit: 20
  }
};

/**
 * Adaptive Rate Limiting Configuration
 *
 * Automatically adjust limits based on user behavior
 */
const ADAPTIVE_CONFIG = {
  enabled: true,

  // Increase limits for good behavior
  goodBehavior: {
    threshold: 0.5, // If user uses < 50% of limit consistently
    multiplier: 1.5, // Increase limit by 50%
    duration: 7 * 24 * 60 * 60, // 7 days
    minObservationPeriod: 24 * 60 * 60 // Must observe for 24 hours
  },

  // Decrease limits for suspicious behavior
  suspiciousBehavior: {
    threshold: 0.95, // If user consistently hits > 95% of limit
    multiplier: 0.7, // Decrease limit by 30%
    duration: 24 * 60 * 60, // 24 hours
    minViolations: 3 // Must violate 3 times before reducing
  },

  // Reset to default after duration
  resetAfter: 7 * 24 * 60 * 60 // 7 days
};

/**
 * Rate Limit Windows (in seconds)
 */
const WINDOWS = {
  second: 1,
  minute: 60,
  hour: 60 * 60,
  day: 24 * 60 * 60,
  week: 7 * 24 * 60 * 60,
  month: 30 * 24 * 60 * 60
};

/**
 * Get tier limits
 * @param {string} tier - Subscription tier
 * @returns {object} Tier limits
 */
const getTierLimits = (tier) => {
  return TIER_LIMITS[tier] || TIER_LIMITS.free;
};

/**
 * Get endpoint limits
 * @param {string} category - Endpoint category
 * @param {string} type - Endpoint type (optional)
 * @returns {object} Endpoint limits
 */
const getEndpointLimits = (category, type = null) => {
  const categoryLimits = ENDPOINT_LIMITS[category];
  if (!categoryLimits) return null;

  if (type && categoryLimits[type]) {
    return categoryLimits[type];
  }

  return categoryLimits;
};

/**
 * Calculate effective limit for a tier and endpoint
 * @param {string} tier - Subscription tier
 * @param {string} category - Endpoint category
 * @param {string} type - Endpoint type
 * @returns {object} Effective limits
 */
const getEffectiveLimit = (tier, category, type = null) => {
  const tierLimits = getTierLimits(tier);
  const endpointLimits = getEndpointLimits(category, type);

  // If endpoint has specific limits, use those
  if (endpointLimits && endpointLimits.requestsPerMinute) {
    return {
      requestsPerMinute: endpointLimits.requestsPerMinute,
      requestsPerHour: endpointLimits.requestsPerHour || endpointLimits.requestsPerMinute * 60,
      requestsPerDay: endpointLimits.requestsPerDay || tierLimits.requestsPerDay,
      burstLimit: endpointLimits.burstLimit || tierLimits.burstLimit,
      burstWindow: tierLimits.burstWindow,
      skipSuccessful: endpointLimits.skipSuccessful || false
    };
  }

  // If endpoint has multiplier, apply it to tier limits
  if (endpointLimits && endpointLimits.multiplier) {
    return {
      requestsPerMinute: Math.floor(tierLimits.requestsPerMinute * endpointLimits.multiplier),
      requestsPerDay: tierLimits.requestsPerDay === -1 ? -1 : Math.floor(tierLimits.requestsPerDay * endpointLimits.multiplier),
      burstLimit: Math.floor(tierLimits.burstLimit * endpointLimits.multiplier),
      burstWindow: tierLimits.burstWindow,
      skipSuccessful: false
    };
  }

  // Default to tier limits
  return {
    requestsPerMinute: tierLimits.requestsPerMinute,
    requestsPerDay: tierLimits.requestsPerDay,
    burstLimit: tierLimits.burstLimit,
    burstWindow: tierLimits.burstWindow,
    concurrentRequests: tierLimits.concurrentRequests,
    skipSuccessful: false
  };
};

/**
 * Get window in seconds
 * @param {string} window - Window name
 * @returns {number} Window in seconds
 */
const getWindow = (window) => {
  return WINDOWS[window] || WINDOWS.minute;
};

module.exports = {
  TIER_LIMITS,
  ENDPOINT_LIMITS,
  ADAPTIVE_CONFIG,
  WINDOWS,
  getTierLimits,
  getEndpointLimits,
  getEffectiveLimit,
  getWindow
};
