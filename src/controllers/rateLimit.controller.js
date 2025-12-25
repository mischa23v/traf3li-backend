/**
 * Rate Limit Controller (Admin)
 *
 * Administrative endpoints for managing and monitoring rate limits.
 * Restricted to admin users only.
 *
 * Features:
 * - View rate limit configuration
 * - Monitor usage statistics
 * - Reset rate limits
 * - Adjust adaptive limits
 * - View top users and throttled requests
 */

const rateLimitingService = require('../services/rateLimiting.service');
const { getTierLimits, getEffectiveLimit, TIER_LIMITS, ENDPOINT_LIMITS } = require('../config/rateLimits');
const { User, Firm } = require('../models');
const logger = require('../utils/logger');
const auditLogService = require('../services/auditLog.service');

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get rate limit configuration
 * GET /api/admin/rate-limits/config
 */
const getConfig = async (req, res) => {
  try {
    const adminUserId = req.userId || req.userID;

    // Log access
    await auditLogService.log(
      'rate_limit_config_viewed',
      'admin',
      adminUserId,
      'SUCCESS',
      {
        userId: adminUserId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    res.json({
      success: true,
      config: {
        tiers: TIER_LIMITS,
        endpoints: ENDPOINT_LIMITS
      }
    });
  } catch (error) {
    logger.error('Rate limit getConfig error:', error.message);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب إعدادات حد المعدل',
      error_en: 'Failed to get rate limit configuration',
      code: 'CONFIG_FETCH_ERROR'
    });
  }
};

/**
 * Get tier configuration
 * GET /api/admin/rate-limits/tiers/:tier
 */
const getTierConfig = async (req, res) => {
  try {
    const { tier } = req.params;

    const config = getTierLimits(tier);

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'المستوى غير موجود',
        error_en: 'Tier not found',
        code: 'TIER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      tier,
      config
    });
  } catch (error) {
    logger.error('Rate limit getTierConfig error:', error.message);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب إعدادات المستوى',
      error_en: 'Failed to get tier configuration',
      code: 'TIER_CONFIG_ERROR'
    });
  }
};

/**
 * Get effective limit for a tier and endpoint
 * GET /api/admin/rate-limits/effective
 */
const getEffectiveLimitEndpoint = async (req, res) => {
  try {
    const { tier, category, type } = req.query;

    if (!tier || !category) {
      return res.status(400).json({
        success: false,
        error: 'المستوى والفئة مطلوبة',
        error_en: 'Tier and category are required',
        code: 'INVALID_INPUT'
      });
    }

    const limits = getEffectiveLimit(tier, category, type);

    res.json({
      success: true,
      tier,
      category,
      type,
      limits
    });
  } catch (error) {
    logger.error('Rate limit getEffectiveLimitEndpoint error:', error.message);
    res.status(500).json({
      success: false,
      error: 'فشل في حساب الحد الفعلي',
      error_en: 'Failed to calculate effective limit',
      code: 'EFFECTIVE_LIMIT_ERROR'
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// USER/FIRM LIMITS
// ═══════════════════════════════════════════════════════════════

/**
 * Get user's current limits
 * GET /api/admin/rate-limits/users/:userId
 */
const getUserLimits = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate user exists
    const user = await User.findById(userId).select('email firstName lastName firmId').lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'المستخدم غير موجود',
        error_en: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Get limits
    const limits = await rateLimitingService.getLimitForUser(userId);

    // Get current usage
    const usageStats = await rateLimitingService.getUsageStats(userId, 'day');

    // Get adaptive limit info
    const key = `rate-limit:user:${userId}`;
    const adaptiveLimit = await rateLimitingService.getAdaptiveLimit(key, limits.requestsPerMinute);

    res.json({
      success: true,
      user: {
        id: userId,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        firmId: user.firmId
      },
      limits,
      adaptiveLimit,
      usage: usageStats
    });
  } catch (error) {
    logger.error('Rate limit getUserLimits error:', error.message);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب حدود المستخدم',
      error_en: 'Failed to get user limits',
      code: 'USER_LIMITS_ERROR'
    });
  }
};

/**
 * Get firm's current limits
 * GET /api/admin/rate-limits/firms/:firmId
 */
const getFirmLimits = async (req, res) => {
  try {
    const { firmId } = req.params;

    // Validate firm exists
    const firm = await Firm.findById(firmId).select('name subscription').lean();
    if (!firm) {
      return res.status(404).json({
        success: false,
        error: 'المكتب غير موجود',
        error_en: 'Firm not found',
        code: 'FIRM_NOT_FOUND'
      });
    }

    // Get limits
    const limits = await rateLimitingService.getLimitForFirm(firmId);

    // Get current usage (aggregate across all firm users)
    const throttledRequests = await rateLimitingService.getThrottledRequests(firmId, 'day');

    res.json({
      success: true,
      firm: {
        id: firmId,
        name: firm.name,
        subscription: firm.subscription
      },
      limits,
      usage: throttledRequests
    });
  } catch (error) {
    logger.error('Rate limit getFirmLimits error:', error.message);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب حدود المكتب',
      error_en: 'Failed to get firm limits',
      code: 'FIRM_LIMITS_ERROR'
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// ANALYTICS ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get usage statistics for a user
 * GET /api/admin/rate-limits/users/:userId/stats
 */
const getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const { period = 'day' } = req.query;

    // Validate user exists
    const user = await User.findById(userId).select('email firstName lastName').lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'المستخدم غير موجود',
        error_en: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Get stats
    const stats = await rateLimitingService.getUsageStats(userId, period);

    // Get top endpoints
    const topEndpoints = await rateLimitingService.getTopEndpoints(userId, 10);

    res.json({
      success: true,
      user: {
        id: userId,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`
      },
      period,
      stats,
      topEndpoints
    });
  } catch (error) {
    logger.error('Rate limit getUserStats error:', error.message);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب إحصائيات المستخدم',
      error_en: 'Failed to get user statistics',
      code: 'USER_STATS_ERROR'
    });
  }
};

/**
 * Get top API users for a firm
 * GET /api/admin/rate-limits/firms/:firmId/top-users
 */
const getTopUsersForFirm = async (req, res) => {
  try {
    const { firmId } = req.params;
    const { period = 'day', limit = 10 } = req.query;

    // Validate firm exists
    const firm = await Firm.findById(firmId).select('name').lean();
    if (!firm) {
      return res.status(404).json({
        success: false,
        error: 'المكتب غير موجود',
        error_en: 'Firm not found',
        code: 'FIRM_NOT_FOUND'
      });
    }

    // Get top users
    const topUsers = await rateLimitingService.getTopUsers(firmId, period, parseInt(limit, 10));

    // Enrich with user details
    const enrichedUsers = await Promise.all(
      topUsers.map(async (userData) => {
        const user = await User.findById(userData.userId).select('email firstName lastName').lean();
        return {
          ...userData,
          user: user ? {
            email: user.email,
            name: `${user.firstName} ${user.lastName}`
          } : null
        };
      })
    );

    res.json({
      success: true,
      firm: {
        id: firmId,
        name: firm.name
      },
      period,
      topUsers: enrichedUsers
    });
  } catch (error) {
    logger.error('Rate limit getTopUsersForFirm error:', error.message);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب أكثر المستخدمين استخداماً',
      error_en: 'Failed to get top users',
      code: 'TOP_USERS_ERROR'
    });
  }
};

/**
 * Get throttled requests for a firm
 * GET /api/admin/rate-limits/firms/:firmId/throttled
 */
const getThrottledRequestsForFirm = async (req, res) => {
  try {
    const { firmId } = req.params;
    const { period = 'day' } = req.query;

    // Validate firm exists
    const firm = await Firm.findById(firmId).select('name').lean();
    if (!firm) {
      return res.status(404).json({
        success: false,
        error: 'المكتب غير موجود',
        error_en: 'Firm not found',
        code: 'FIRM_NOT_FOUND'
      });
    }

    // Get throttled requests
    const throttled = await rateLimitingService.getThrottledRequests(firmId, period);

    // Enrich users with details
    const enrichedUsers = await Promise.all(
      throttled.users.map(async (userData) => {
        const user = await User.findById(userData.userId).select('email firstName lastName').lean();
        return {
          ...userData,
          user: user ? {
            email: user.email,
            name: `${user.firstName} ${user.lastName}`
          } : null
        };
      })
    );

    res.json({
      success: true,
      firm: {
        id: firmId,
        name: firm.name
      },
      period,
      total: throttled.total,
      throttled: throttled.throttled,
      throttleRate: throttled.throttleRate,
      users: enrichedUsers
    });
  } catch (error) {
    logger.error('Rate limit getThrottledRequestsForFirm error:', error.message);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب الطلبات المحظورة',
      error_en: 'Failed to get throttled requests',
      code: 'THROTTLED_REQUESTS_ERROR'
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// MANAGEMENT ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Reset rate limit for a user
 * POST /api/admin/rate-limits/users/:userId/reset
 */
const resetUserLimit = async (req, res) => {
  try {
    const adminUserId = req.userId || req.userID;
    const { userId } = req.params;

    // Validate user exists
    const user = await User.findById(userId).select('email').lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'المستخدم غير موجود',
        error_en: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Reset limit
    const key = `rate-limit:user:${userId}`;
    await rateLimitingService.resetLimit(key);

    // Log action
    await auditLogService.log(
      'rate_limit_reset',
      'user',
      userId,
      'SUCCESS',
      {
        adminUserId,
        targetUserId: userId,
        targetUserEmail: user.email,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    res.json({
      success: true,
      message: 'تم إعادة تعيين حد المعدل بنجاح',
      message_en: 'Rate limit reset successfully'
    });
  } catch (error) {
    logger.error('Rate limit resetUserLimit error:', error.message);
    res.status(500).json({
      success: false,
      error: 'فشل في إعادة تعيين حد المعدل',
      error_en: 'Failed to reset rate limit',
      code: 'RESET_LIMIT_ERROR'
    });
  }
};

/**
 * Reset rate limit for a firm
 * POST /api/admin/rate-limits/firms/:firmId/reset
 */
const resetFirmLimit = async (req, res) => {
  try {
    const adminUserId = req.userId || req.userID;
    const { firmId } = req.params;

    // Validate firm exists
    const firm = await Firm.findById(firmId).select('name').lean();
    if (!firm) {
      return res.status(404).json({
        success: false,
        error: 'المكتب غير موجود',
        error_en: 'Firm not found',
        code: 'FIRM_NOT_FOUND'
      });
    }

    // Reset limit
    const key = `rate-limit:firm:${firmId}`;
    await rateLimitingService.resetLimit(key);

    // Log action
    await auditLogService.log(
      'rate_limit_reset',
      'firm',
      firmId,
      'SUCCESS',
      {
        adminUserId,
        targetFirmId: firmId,
        targetFirmName: firm.name,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    res.json({
      success: true,
      message: 'تم إعادة تعيين حد معدل المكتب بنجاح',
      message_en: 'Firm rate limit reset successfully'
    });
  } catch (error) {
    logger.error('Rate limit resetFirmLimit error:', error.message);
    res.status(500).json({
      success: false,
      error: 'فشل في إعادة تعيين حد معدل المكتب',
      error_en: 'Failed to reset firm rate limit',
      code: 'RESET_FIRM_LIMIT_ERROR'
    });
  }
};

/**
 * Adjust adaptive limit for a user
 * POST /api/admin/rate-limits/users/:userId/adjust
 */
const adjustUserLimit = async (req, res) => {
  try {
    const adminUserId = req.userId || req.userID;
    const { userId } = req.params;
    const { factor, duration } = req.body;

    // Validate input
    if (!factor || factor <= 0 || factor > 10) {
      return res.status(400).json({
        success: false,
        error: 'عامل التعديل يجب أن يكون بين 0 و 10',
        error_en: 'Factor must be between 0 and 10',
        code: 'INVALID_FACTOR'
      });
    }

    // Validate user exists
    const user = await User.findById(userId).select('email').lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'المستخدم غير موجود',
        error_en: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Adjust limit
    const key = `rate-limit:user:${userId}`;
    const adjustDuration = duration || 86400; // Default 24 hours
    await rateLimitingService.adjustLimit(key, factor, adjustDuration);

    // Log action
    await auditLogService.log(
      'rate_limit_adjusted',
      'user',
      userId,
      'SUCCESS',
      {
        adminUserId,
        targetUserId: userId,
        targetUserEmail: user.email,
        factor,
        duration: adjustDuration,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    res.json({
      success: true,
      message: 'تم تعديل حد المعدل بنجاح',
      message_en: 'Rate limit adjusted successfully',
      factor,
      duration: adjustDuration
    });
  } catch (error) {
    logger.error('Rate limit adjustUserLimit error:', error.message);
    res.status(500).json({
      success: false,
      error: 'فشل في تعديل حد المعدل',
      error_en: 'Failed to adjust rate limit',
      code: 'ADJUST_LIMIT_ERROR'
    });
  }
};

/**
 * Get global rate limit overview
 * GET /api/admin/rate-limits/overview
 */
const getOverview = async (req, res) => {
  try {
    // This endpoint provides a high-level overview of rate limiting across the system
    // Useful for admin dashboard

    // Get all firms
    const firms = await Firm.find().select('_id name subscription').lean();

    // Get aggregated stats
    const overview = {
      totalFirms: firms.length,
      firmsByTier: {
        free: 0,
        starter: 0,
        professional: 0,
        enterprise: 0
      },
      totalUsers: await User.countDocuments(),
      // Additional stats can be added here
    };

    // Count firms by tier
    firms.forEach(firm => {
      const tier = firm.subscription?.plan || 'free';
      if (overview.firmsByTier[tier] !== undefined) {
        overview.firmsByTier[tier]++;
      }
    });

    res.json({
      success: true,
      overview
    });
  } catch (error) {
    logger.error('Rate limit getOverview error:', error.message);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب نظرة عامة',
      error_en: 'Failed to get overview',
      code: 'OVERVIEW_ERROR'
    });
  }
};

module.exports = {
  // Configuration
  getConfig,
  getTierConfig,
  getEffectiveLimitEndpoint,

  // User/Firm limits
  getUserLimits,
  getFirmLimits,

  // Analytics
  getUserStats,
  getTopUsersForFirm,
  getThrottledRequestsForFirm,

  // Management
  resetUserLimit,
  resetFirmLimit,
  adjustUserLimit,
  getOverview
};
