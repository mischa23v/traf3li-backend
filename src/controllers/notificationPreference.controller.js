const NotificationPreferenceService = require('../services/notificationPreference.service');
const CustomException = require('../utils/CustomException');
const { sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

/**
 * Get user notification preferences
 * GET /api/notification-preferences
 */
const getPreferences = async (request, response) => {
  try {
    // Input validation
    if (!request.userID) {
      throw CustomException('Unauthorized | غير مصرح', 401);
    }

    const userId = sanitizeObjectId(request.userID);
    const firmId = request.firmId ? sanitizeObjectId(request.firmId) : null;

    const preferences = await NotificationPreferenceService.getPreferences(userId, firmId);

    return response.status(200).json({
      success: true,
      data: preferences
    });
  } catch ({ message, status = 500 }) {
    logger.error('Error getting notification preferences:', message);
    return response.status(status).json({
      success: false,
      error: { message }
    });
  }
};

/**
 * Update user notification preferences
 * PUT /api/notification-preferences
 */
const updatePreferences = async (request, response) => {
  try {
    // Input validation
    if (!request.userID) {
      throw CustomException('Unauthorized | غير مصرح', 401);
    }

    const userId = sanitizeObjectId(request.userID);
    const firmId = request.firmId ? sanitizeObjectId(request.firmId) : null;

    // Validate preference updates
    const validation = NotificationPreferenceService.validatePreferences(request.body);
    if (!validation.valid) {
      throw CustomException(
        `Invalid preferences: ${validation.errors.join(', ')}`,
        400
      );
    }

    const updates = {
      ...request.body,
      updatedBy: userId
    };

    const preferences = await NotificationPreferenceService.updatePreferences(
      userId,
      firmId,
      updates
    );

    return response.status(200).json({
      success: true,
      message: 'Preferences updated successfully | تم تحديث التفضيلات بنجاح',
      data: preferences
    });
  } catch ({ message, status = 500 }) {
    logger.error('Error updating notification preferences:', message);
    return response.status(status).json({
      success: false,
      error: { message }
    });
  }
};

/**
 * Reset preferences to defaults
 * POST /api/notification-preferences/reset
 */
const resetToDefaults = async (request, response) => {
  try {
    // Input validation
    if (!request.userID) {
      throw CustomException('Unauthorized | غير مصرح', 401);
    }

    const userId = sanitizeObjectId(request.userID);
    const firmId = request.firmId ? sanitizeObjectId(request.firmId) : null;

    const preferences = await NotificationPreferenceService.resetToDefaults(userId, firmId);

    return response.status(200).json({
      success: true,
      message: 'Preferences reset to defaults | تم إعادة تعيين التفضيلات إلى الافتراضية',
      data: preferences
    });
  } catch ({ message, status = 500 }) {
    logger.error('Error resetting notification preferences:', message);
    return response.status(status).json({
      success: false,
      error: { message }
    });
  }
};

/**
 * Get default preferences
 * GET /api/notification-preferences/defaults
 */
const getDefaults = async (request, response) => {
  try {
    const defaults = NotificationPreferenceService.getDefaultPreferences();

    return response.status(200).json({
      success: true,
      data: defaults
    });
  } catch ({ message, status = 500 }) {
    logger.error('Error getting default preferences:', message);
    return response.status(status).json({
      success: false,
      error: { message }
    });
  }
};

/**
 * Update channel settings
 * PUT /api/notification-preferences/channels/:channel
 */
const updateChannelSettings = async (request, response) => {
  try {
    // Input validation
    if (!request.userID) {
      throw CustomException('Unauthorized | غير مصرح', 401);
    }

    const userId = sanitizeObjectId(request.userID);
    const { channel } = request.params;

    // Validate channel
    const allowedChannels = ['email', 'push', 'sms', 'inApp', 'whatsapp'];
    if (!allowedChannels.includes(channel)) {
      throw CustomException(
        `Invalid channel. Must be one of: ${allowedChannels.join(', ')}`,
        400
      );
    }

    const preferences = await NotificationPreferenceService.updateChannelSettings(
      userId,
      channel,
      request.body
    );

    return response.status(200).json({
      success: true,
      message: `${channel} settings updated | تم تحديث إعدادات ${channel}`,
      data: preferences
    });
  } catch ({ message, status = 500 }) {
    logger.error('Error updating channel settings:', message);
    return response.status(status).json({
      success: false,
      error: { message }
    });
  }
};

/**
 * Update category preferences
 * PUT /api/notification-preferences/categories/:category
 */
const updateCategoryPreferences = async (request, response) => {
  try {
    // Input validation
    if (!request.userID) {
      throw CustomException('Unauthorized | غير مصرح', 401);
    }

    const userId = sanitizeObjectId(request.userID);
    const { category } = request.params;

    // Validate category
    const allowedCategories = [
      'invoices', 'payments', 'cases', 'tasks', 'clients',
      'approvals', 'reminders', 'mentions', 'system',
      'billing', 'security', 'updates'
    ];

    if (!allowedCategories.includes(category)) {
      throw CustomException(
        `Invalid category. Must be one of: ${allowedCategories.join(', ')}`,
        400
      );
    }

    const preferences = await NotificationPreferenceService.updateCategoryPreferences(
      userId,
      category,
      request.body
    );

    return response.status(200).json({
      success: true,
      message: `${category} preferences updated | تم تحديث تفضيلات ${category}`,
      data: preferences
    });
  } catch ({ message, status = 500 }) {
    logger.error('Error updating category preferences:', message);
    return response.status(status).json({
      success: false,
      error: { message }
    });
  }
};

/**
 * Update quiet hours
 * PUT /api/notification-preferences/quiet-hours
 */
const updateQuietHours = async (request, response) => {
  try {
    // Input validation
    if (!request.userID) {
      throw CustomException('Unauthorized | غير مصرح', 401);
    }

    const userId = sanitizeObjectId(request.userID);

    // Validate time format
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (request.body.start && !timeRegex.test(request.body.start)) {
      throw CustomException('Invalid start time format. Use HH:mm', 400);
    }
    if (request.body.end && !timeRegex.test(request.body.end)) {
      throw CustomException('Invalid end time format. Use HH:mm', 400);
    }

    const preferences = await NotificationPreferenceService.updateQuietHours(
      userId,
      request.body
    );

    return response.status(200).json({
      success: true,
      message: 'Quiet hours updated | تم تحديث أوقات عدم الإزعاج',
      data: preferences
    });
  } catch ({ message, status = 500 }) {
    logger.error('Error updating quiet hours:', message);
    return response.status(status).json({
      success: false,
      error: { message }
    });
  }
};

/**
 * Mute a category
 * POST /api/notification-preferences/mute/:category
 */
const muteCategory = async (request, response) => {
  try {
    // Input validation
    if (!request.userID) {
      throw CustomException('Unauthorized | غير مصرح', 401);
    }

    const userId = sanitizeObjectId(request.userID);
    const { category } = request.params;

    // Validate category
    const allowedCategories = [
      'invoices', 'payments', 'cases', 'tasks', 'clients',
      'approvals', 'reminders', 'mentions', 'system',
      'billing', 'security', 'updates'
    ];

    if (!allowedCategories.includes(category)) {
      throw CustomException(`Invalid category | فئة غير صالحة`, 400);
    }

    const preferences = await NotificationPreferenceService.unsubscribeFromCategory(
      userId,
      category
    );

    return response.status(200).json({
      success: true,
      message: `Muted ${category} notifications | تم كتم إشعارات ${category}`,
      data: preferences
    });
  } catch ({ message, status = 500 }) {
    logger.error('Error muting category:', message);
    return response.status(status).json({
      success: false,
      error: { message }
    });
  }
};

/**
 * Unmute a category
 * POST /api/notification-preferences/unmute/:category
 */
const unmuteCategory = async (request, response) => {
  try {
    // Input validation
    if (!request.userID) {
      throw CustomException('Unauthorized | غير مصرح', 401);
    }

    const userId = sanitizeObjectId(request.userID);
    const { category } = request.params;

    // Validate category
    const allowedCategories = [
      'invoices', 'payments', 'cases', 'tasks', 'clients',
      'approvals', 'reminders', 'mentions', 'system',
      'billing', 'security', 'updates'
    ];

    if (!allowedCategories.includes(category)) {
      throw CustomException(`Invalid category | فئة غير صالحة`, 400);
    }

    const preferences = await NotificationPreferenceService.resubscribeToCategory(
      userId,
      category
    );

    return response.status(200).json({
      success: true,
      message: `Unmuted ${category} notifications | تم إلغاء كتم إشعارات ${category}`,
      data: preferences
    });
  } catch ({ message, status = 500 }) {
    logger.error('Error unmuting category:', message);
    return response.status(status).json({
      success: false,
      error: { message }
    });
  }
};

/**
 * Get notification statistics
 * GET /api/notification-preferences/stats
 */
const getStats = async (request, response) => {
  try {
    // Input validation
    if (!request.userID) {
      throw CustomException('Unauthorized | غير مصرح', 401);
    }

    const userId = sanitizeObjectId(request.userID);

    const stats = await NotificationPreferenceService.getNotificationStats(userId);

    return response.status(200).json({
      success: true,
      data: stats
    });
  } catch ({ message, status = 500 }) {
    logger.error('Error getting notification stats:', message);
    return response.status(status).json({
      success: false,
      error: { message }
    });
  }
};

/**
 * Check if in quiet hours
 * GET /api/notification-preferences/quiet-hours/status
 */
const checkQuietHours = async (request, response) => {
  try {
    // Input validation
    if (!request.userID) {
      throw CustomException('Unauthorized | غير مصرح', 401);
    }

    const userId = sanitizeObjectId(request.userID);

    const isQuietHours = await NotificationPreferenceService.isQuietHours(userId);

    return response.status(200).json({
      success: true,
      data: {
        isQuietHours,
        message: isQuietHours
          ? 'Currently in quiet hours | في وقت عدم الإزعاج حالياً'
          : 'Not in quiet hours | ليس في وقت عدم الإزعاج'
      }
    });
  } catch ({ message, status = 500 }) {
    logger.error('Error checking quiet hours:', message);
    return response.status(status).json({
      success: false,
      error: { message }
    });
  }
};

/**
 * Test notification preferences
 * POST /api/notification-preferences/test
 */
const testPreferences = async (request, response) => {
  try {
    // Input validation
    if (!request.userID) {
      throw CustomException('Unauthorized | غير مصرح', 401);
    }

    const userId = sanitizeObjectId(request.userID);
    const { category = 'system', channel = 'email', isUrgent = false } = request.body;

    const shouldNotify = await NotificationPreferenceService.shouldNotify(
      userId,
      category,
      channel,
      isUrgent
    );

    const channels = await NotificationPreferenceService.getNotificationChannels(
      userId,
      category,
      isUrgent
    );

    return response.status(200).json({
      success: true,
      data: {
        shouldNotify,
        enabledChannels: channels,
        tested: {
          category,
          channel,
          isUrgent
        }
      }
    });
  } catch ({ message, status = 500 }) {
    logger.error('Error testing preferences:', message);
    return response.status(status).json({
      success: false,
      error: { message }
    });
  }
};

module.exports = {
  getPreferences,
  updatePreferences,
  resetToDefaults,
  getDefaults,
  updateChannelSettings,
  updateCategoryPreferences,
  updateQuietHours,
  muteCategory,
  unmuteCategory,
  getStats,
  checkQuietHours,
  testPreferences
};
