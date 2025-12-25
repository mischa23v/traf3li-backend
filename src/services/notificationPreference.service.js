/**
 * Notification Preference Service for TRAF3LI
 *
 * Manages user notification preferences with:
 * - Multi-channel preferences (email, push, SMS, in-app, WhatsApp)
 * - Category-specific settings
 * - Quiet hours management
 * - Email digest configuration
 * - Language preferences
 */

const NotificationPreference = require('../models/notificationPreference.model');
const Notification = require('../models/notification.model');
const logger = require('../utils/logger');

/**
 * Notification Preference Service Class
 */
class NotificationPreferenceService {
  /**
   * Get user notification preferences
   * @param {ObjectId} userId - User ID
   * @param {ObjectId} firmId - Firm ID (optional)
   * @returns {Promise<Object>}
   */
  static async getPreferences(userId, firmId = null) {
    try {
      const preferences = await NotificationPreference.getOrCreate(userId, firmId);
      return preferences;
    } catch (error) {
      logger.error('Error getting notification preferences:', error);
      throw error;
    }
  }

  /**
   * Update user notification preferences
   * @param {ObjectId} userId - User ID
   * @param {ObjectId} firmId - Firm ID (optional)
   * @param {Object} updates - Preference updates
   * @returns {Promise<Object>}
   */
  static async updatePreferences(userId, firmId = null, updates) {
    try {
      let preferences = await NotificationPreference.findOne({ userId, firmId });

      if (!preferences) {
        preferences = await NotificationPreference.create({
          userId,
          firmId,
          ...updates
        });
      } else {
        // Update allowed fields
        const allowedFields = [
          'channels',
          'categories',
          'quietHours',
          'urgentOverride',
          'digestTime',
          'language',
          'mutedCategories'
        ];

        for (const field of allowedFields) {
          if (updates[field] !== undefined) {
            preferences[field] = updates[field];
            if (['channels', 'categories', 'quietHours'].includes(field)) {
              preferences.markModified(field);
            }
          }
        }

        if (updates.updatedBy) {
          preferences.updatedBy = updates.updatedBy;
        }

        await preferences.save();
      }

      logger.info(`Notification preferences updated for user ${userId}`);
      return preferences;
    } catch (error) {
      logger.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Reset preferences to defaults
   * @param {ObjectId} userId - User ID
   * @param {ObjectId} firmId - Firm ID (optional)
   * @returns {Promise<Object>}
   */
  static async resetToDefaults(userId, firmId = null) {
    try {
      let preferences = await NotificationPreference.findOne({ userId, firmId });

      if (!preferences) {
        preferences = await NotificationPreference.create({ userId, firmId });
      } else {
        await preferences.resetToDefaults();
      }

      logger.info(`Notification preferences reset to defaults for user ${userId}`);
      return preferences;
    } catch (error) {
      logger.error('Error resetting notification preferences:', error);
      throw error;
    }
  }

  /**
   * Get default preferences structure
   * @returns {Object}
   */
  static getDefaultPreferences() {
    return NotificationPreference.getDefaultPreferences();
  }

  /**
   * Check if should notify user for a specific category and channel
   * @param {ObjectId} userId - User ID
   * @param {String} category - Notification category
   * @param {String} channel - Channel (email, push, sms, inApp, whatsapp)
   * @param {Boolean} isUrgent - Whether notification is urgent
   * @returns {Promise<Boolean>}
   */
  static async shouldNotify(userId, category, channel, isUrgent = false) {
    try {
      const preferences = await NotificationPreference.findOne({ userId });

      if (!preferences) {
        // No preferences set, use defaults
        const defaults = this.getDefaultPreferences();
        const categoryPref = defaults.categories[category];
        return categoryPref && categoryPref[channel];
      }

      return preferences.shouldNotify(category, channel, isUrgent);
    } catch (error) {
      logger.error('Error checking notification preference:', error);
      // Default to allowing notification on error
      return true;
    }
  }

  /**
   * Get notification channels for a category
   * @param {ObjectId} userId - User ID
   * @param {String} category - Notification category
   * @param {Boolean} isUrgent - Whether notification is urgent
   * @returns {Promise<Array<String>>}
   */
  static async getNotificationChannels(userId, category, isUrgent = false) {
    try {
      const preferences = await NotificationPreference.findOne({ userId });

      if (!preferences) {
        // No preferences set, return default channels for category
        const defaults = this.getDefaultPreferences();
        const categoryPref = defaults.categories[category];

        if (!categoryPref) {
          return ['in_app']; // Default to in-app only
        }

        const channels = [];
        if (categoryPref.email) channels.push('email');
        if (categoryPref.push) channels.push('push');
        if (categoryPref.sms) channels.push('sms');
        if (categoryPref.inApp) channels.push('in_app');
        if (categoryPref.whatsapp) channels.push('whatsapp');

        return channels;
      }

      return preferences.getNotificationChannels(category, isUrgent);
    } catch (error) {
      logger.error('Error getting notification channels:', error);
      // Default to in-app on error
      return ['in_app'];
    }
  }

  /**
   * Check if user is in quiet hours
   * @param {ObjectId} userId - User ID
   * @returns {Promise<Boolean>}
   */
  static async isQuietHours(userId) {
    try {
      const preferences = await NotificationPreference.findOne({ userId });

      if (!preferences) {
        return false;
      }

      return preferences.isInQuietHours();
    } catch (error) {
      logger.error('Error checking quiet hours:', error);
      return false;
    }
  }

  /**
   * Get users for daily or weekly digest
   * @param {String} digestType - 'daily' or 'weekly'
   * @returns {Promise<Array>}
   */
  static async getDigestUsers(digestType) {
    try {
      const users = await NotificationPreference.getDigestUsers(digestType);
      return users;
    } catch (error) {
      logger.error(`Error getting ${digestType} digest users:`, error);
      return [];
    }
  }

  /**
   * Quick unsubscribe from a category
   * @param {ObjectId} userId - User ID
   * @param {String} category - Category to unsubscribe from
   * @returns {Promise<Object>}
   */
  static async unsubscribeFromCategory(userId, category) {
    try {
      let preferences = await NotificationPreference.findOne({ userId });

      if (!preferences) {
        preferences = await NotificationPreference.create({ userId });
      }

      await preferences.muteCategory(category);

      logger.info(`User ${userId} unsubscribed from ${category} notifications`);
      return preferences;
    } catch (error) {
      logger.error('Error unsubscribing from category:', error);
      throw error;
    }
  }

  /**
   * Resubscribe to a category
   * @param {ObjectId} userId - User ID
   * @param {String} category - Category to resubscribe to
   * @returns {Promise<Object>}
   */
  static async resubscribeToCategory(userId, category) {
    try {
      const preferences = await NotificationPreference.findOne({ userId });

      if (!preferences) {
        throw new Error('Preferences not found');
      }

      await preferences.unmuteCategory(category);

      logger.info(`User ${userId} resubscribed to ${category} notifications`);
      return preferences;
    } catch (error) {
      logger.error('Error resubscribing to category:', error);
      throw error;
    }
  }

  /**
   * Update channel settings
   * @param {ObjectId} userId - User ID
   * @param {String} channel - Channel name
   * @param {Object} settings - Channel settings
   * @returns {Promise<Object>}
   */
  static async updateChannelSettings(userId, channel, settings) {
    try {
      let preferences = await NotificationPreference.findOne({ userId });

      if (!preferences) {
        preferences = await NotificationPreference.create({ userId });
      }

      await preferences.updateChannelSettings(channel, settings);

      logger.info(`Channel ${channel} settings updated for user ${userId}`);
      return preferences;
    } catch (error) {
      logger.error('Error updating channel settings:', error);
      throw error;
    }
  }

  /**
   * Update category preferences
   * @param {ObjectId} userId - User ID
   * @param {String} category - Category name
   * @param {Object} categoryPreferences - Category preferences
   * @returns {Promise<Object>}
   */
  static async updateCategoryPreferences(userId, category, categoryPreferences) {
    try {
      let preferences = await NotificationPreference.findOne({ userId });

      if (!preferences) {
        preferences = await NotificationPreference.create({ userId });
      }

      await preferences.updateCategoryPreferences(category, categoryPreferences);

      logger.info(`Category ${category} preferences updated for user ${userId}`);
      return preferences;
    } catch (error) {
      logger.error('Error updating category preferences:', error);
      throw error;
    }
  }

  /**
   * Update quiet hours settings
   * @param {ObjectId} userId - User ID
   * @param {Object} quietHoursSettings - Quiet hours settings
   * @returns {Promise<Object>}
   */
  static async updateQuietHours(userId, quietHoursSettings) {
    try {
      let preferences = await NotificationPreference.findOne({ userId });

      if (!preferences) {
        preferences = await NotificationPreference.create({ userId });
      }

      preferences.quietHours = {
        ...preferences.quietHours,
        ...quietHoursSettings
      };
      preferences.markModified('quietHours');
      await preferences.save();

      logger.info(`Quiet hours updated for user ${userId}`);
      return preferences;
    } catch (error) {
      logger.error('Error updating quiet hours:', error);
      throw error;
    }
  }

  /**
   * Get pending digest notifications for user
   * @param {ObjectId} userId - User ID
   * @param {String} digestType - 'daily' or 'weekly'
   * @returns {Promise<Array>}
   */
  static async getPendingDigestNotifications(userId, digestType) {
    try {
      const now = new Date();
      let cutoffDate = new Date();

      if (digestType === 'daily') {
        cutoffDate.setDate(cutoffDate.getDate() - 1);
      } else if (digestType === 'weekly') {
        cutoffDate.setDate(cutoffDate.getDate() - 7);
      }

      // Get unread notifications since cutoff date
      const notifications = await Notification.find({
        userId,
        read: false,
        createdAt: { $gte: cutoffDate, $lte: now }
      }).sort({ createdAt: -1 }).lean();

      return notifications;
    } catch (error) {
      logger.error('Error getting pending digest notifications:', error);
      return [];
    }
  }

  /**
   * Mark digest notifications as sent
   * @param {ObjectId} userId - User ID
   * @param {Array} notificationIds - Notification IDs
   * @returns {Promise<void>}
   */
  static async markDigestNotificationsAsSent(userId, notificationIds) {
    try {
      await Notification.updateMany(
        {
          _id: { $in: notificationIds },
          userId
        },
        {
          $set: {
            emailSentAt: new Date()
          }
        }
      );

      logger.info(`Marked ${notificationIds.length} digest notifications as sent for user ${userId}`);
    } catch (error) {
      logger.error('Error marking digest notifications as sent:', error);
    }
  }

  /**
   * Check if email should be queued for digest
   * @param {ObjectId} userId - User ID
   * @returns {Promise<Boolean>}
   */
  static async shouldQueueForDigest(userId) {
    try {
      const preferences = await NotificationPreference.findOne({ userId });

      if (!preferences) {
        return false; // No preferences, send instantly
      }

      const emailDigest = preferences.channels.email.digest;
      return emailDigest === 'daily' || emailDigest === 'weekly';
    } catch (error) {
      logger.error('Error checking digest queue status:', error);
      return false;
    }
  }

  /**
   * Get notification language preference
   * @param {ObjectId} userId - User ID
   * @returns {Promise<String>}
   */
  static async getLanguagePreference(userId) {
    try {
      const preferences = await NotificationPreference.findOne({ userId });

      if (!preferences) {
        return 'both'; // Default to both languages
      }

      return preferences.language;
    } catch (error) {
      logger.error('Error getting language preference:', error);
      return 'both';
    }
  }

  /**
   * Bulk update preferences for multiple users
   * @param {Array} updates - Array of { userId, firmId, preferences }
   * @returns {Promise<Object>}
   */
  static async bulkUpdatePreferences(updates) {
    try {
      const results = {
        success: 0,
        failed: 0,
        errors: []
      };

      for (const update of updates) {
        try {
          await this.updatePreferences(update.userId, update.firmId, update.preferences);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            userId: update.userId,
            error: error.message
          });
        }
      }

      logger.info(`Bulk update complete: ${results.success} success, ${results.failed} failed`);
      return results;
    } catch (error) {
      logger.error('Error in bulk update:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics for user
   * @param {ObjectId} userId - User ID
   * @returns {Promise<Object>}
   */
  static async getNotificationStats(userId) {
    try {
      const preferences = await NotificationPreference.findOne({ userId });

      if (!preferences) {
        return {
          hasPreferences: false,
          enabledChannels: [],
          mutedCategories: [],
          quietHoursEnabled: false,
          digestEnabled: false
        };
      }

      const enabledChannels = [];
      if (preferences.channels.email.enabled) enabledChannels.push('email');
      if (preferences.channels.push.enabled) enabledChannels.push('push');
      if (preferences.channels.sms.enabled) enabledChannels.push('sms');
      if (preferences.channels.inApp.enabled) enabledChannels.push('inApp');
      if (preferences.channels.whatsapp.enabled) enabledChannels.push('whatsapp');

      return {
        hasPreferences: true,
        enabledChannels,
        mutedCategories: preferences.mutedCategories,
        quietHoursEnabled: preferences.quietHours.enabled,
        digestEnabled: preferences.channels.email.digest !== 'instant' && preferences.channels.email.digest !== 'none',
        digestType: preferences.channels.email.digest,
        language: preferences.language
      };
    } catch (error) {
      logger.error('Error getting notification stats:', error);
      throw error;
    }
  }

  /**
   * Validate preference updates
   * @param {Object} updates - Preference updates to validate
   * @returns {Object} - { valid: Boolean, errors: Array }
   */
  static validatePreferences(updates) {
    const errors = [];

    // Validate digestTime format
    if (updates.digestTime) {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(updates.digestTime)) {
        errors.push('digestTime must be in HH:mm format (e.g., 09:00)');
      }
    }

    // Validate quietHours
    if (updates.quietHours) {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (updates.quietHours.start && !timeRegex.test(updates.quietHours.start)) {
        errors.push('quietHours.start must be in HH:mm format');
      }
      if (updates.quietHours.end && !timeRegex.test(updates.quietHours.end)) {
        errors.push('quietHours.end must be in HH:mm format');
      }
    }

    // Validate language
    if (updates.language && !['en', 'ar', 'both'].includes(updates.language)) {
      errors.push('language must be en, ar, or both');
    }

    // Validate digest type
    if (updates.channels?.email?.digest) {
      if (!['instant', 'daily', 'weekly', 'none'].includes(updates.channels.email.digest)) {
        errors.push('email digest must be instant, daily, weekly, or none');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = NotificationPreferenceService;
