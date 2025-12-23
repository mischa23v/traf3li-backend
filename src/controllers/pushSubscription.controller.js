/**
 * Push Subscription Controller for TRAF3LI
 * Handles Web Push subscription management
 */

const { User } = require('../models');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

/**
 * Save push subscription
 * POST /api/users/push-subscription
 * Body: { subscription: { endpoint, keys: { p256dh, auth } } }
 */
const savePushSubscription = async (req, res) => {
  try {
    // IDOR Protection: Sanitize and use authenticated user's ID only
    const userId = sanitizeObjectId(req.user.userId || req.user._id);

    // Mass Assignment Protection: Pick only allowed fields
    const subscriptionData = pickAllowedFields(req.body, ['subscription']);
    const { subscription } = subscriptionData;

    // Input Validation: Check subscription structure
    if (!subscription || typeof subscription !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid subscription data',
        errorAr: 'بيانات الاشتراك غير صالحة'
      });
    }

    // Mass Assignment Protection: Pick only allowed subscription fields
    const allowedSubscription = pickAllowedFields(subscription, ['endpoint', 'keys', 'expirationTime']);

    if (!allowedSubscription.endpoint || !allowedSubscription.keys) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subscription data',
        errorAr: 'بيانات الاشتراك غير صالحة'
      });
    }

    // Validate push notification endpoint URL
    let endpointUrl;
    try {
      endpointUrl = new URL(allowedSubscription.endpoint);

      // Ensure it's HTTPS
      if (endpointUrl.protocol !== 'https:') {
        return res.status(400).json({
          success: false,
          error: 'Push endpoint must use HTTPS',
          errorAr: 'يجب أن يستخدم نقطة نهاية الإشعارات HTTPS'
        });
      }

      // Validate endpoint is from known push services
      const validDomains = [
        'fcm.googleapis.com',
        'updates.push.services.mozilla.com',
        'web.push.apple.com',
        'notify.windows.com',
        'push.apple.com',
        'android.googleapis.com'
      ];

      const isValidDomain = validDomains.some(domain => endpointUrl.hostname.endsWith(domain));
      if (!isValidDomain) {
        return res.status(400).json({
          success: false,
          error: 'Invalid push service endpoint',
          errorAr: 'نقطة نهاية خدمة الإشعارات غير صالحة'
        });
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid endpoint URL format',
        errorAr: 'تنسيق رابط نقطة النهاية غير صالح'
      });
    }

    // Validate subscription keys
    if (!allowedSubscription.keys || typeof allowedSubscription.keys !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Missing subscription keys',
        errorAr: 'مفاتيح الاشتراك مفقودة'
      });
    }

    // Mass Assignment Protection: Pick only allowed key fields
    const allowedKeys = pickAllowedFields(allowedSubscription.keys, ['p256dh', 'auth']);

    if (!allowedKeys.p256dh || !allowedKeys.auth) {
      return res.status(400).json({
        success: false,
        error: 'Missing subscription keys',
        errorAr: 'مفاتيح الاشتراك مفقودة'
      });
    }

    // Validate key format (should be base64url strings)
    const base64urlRegex = /^[A-Za-z0-9_-]+$/;
    if (!base64urlRegex.test(allowedKeys.p256dh) || !base64urlRegex.test(allowedKeys.auth)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subscription key format',
        errorAr: 'تنسيق مفتاح الاشتراك غير صالح'
      });
    }

    // Update user's push subscription (IDOR protected - only user's own subscription)
    await User.findByIdAndUpdate(userId, {
      pushSubscription: {
        endpoint: allowedSubscription.endpoint,
        keys: {
          p256dh: allowedKeys.p256dh,
          auth: allowedKeys.auth
        },
        expirationTime: allowedSubscription.expirationTime || null
      },
      'notificationPreferences.channels.push': true
    });

    res.status(200).json({
      success: true,
      message: 'Push subscription saved successfully',
      messageAr: 'تم حفظ اشتراك الإشعارات بنجاح'
    });

  } catch (error) {
    console.error('Save push subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorAr: 'حدث خطأ في الخادم'
    });
  }
};

/**
 * Delete push subscription
 * DELETE /api/users/push-subscription
 */
const deletePushSubscription = async (req, res) => {
  try {
    // IDOR Protection: Sanitize and use authenticated user's ID only
    const userId = sanitizeObjectId(req.user.userId || req.user._id);

    // Remove user's push subscription (IDOR protected - only user's own subscription)
    await User.findByIdAndUpdate(userId, {
      $unset: { pushSubscription: 1 },
      'notificationPreferences.channels.push': false
    });

    res.status(200).json({
      success: true,
      message: 'Push subscription removed successfully',
      messageAr: 'تم إلغاء اشتراك الإشعارات بنجاح'
    });

  } catch (error) {
    console.error('Delete push subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorAr: 'حدث خطأ في الخادم'
    });
  }
};

/**
 * Get push subscription status
 * GET /api/users/push-subscription
 */
const getPushSubscriptionStatus = async (req, res) => {
  try {
    // IDOR Protection: Sanitize and use authenticated user's ID only
    const userId = sanitizeObjectId(req.user.userId || req.user._id);

    // Fetch only the authenticated user's subscription (IDOR protected)
    const user = await User.findById(userId).select('pushSubscription notificationPreferences');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        errorAr: 'المستخدم غير موجود'
      });
    }

    const hasSubscription = !!(user.pushSubscription && user.pushSubscription.endpoint);

    res.status(200).json({
      success: true,
      subscribed: hasSubscription,
      preferences: user.notificationPreferences || {
        channels: { email: true, push: false, sms: false, whatsapp: false, in_app: true },
        types: { task_reminders: true, hearing_reminders: true, case_updates: true, messages: true, payments: true }
      }
    });

  } catch (error) {
    console.error('Get push subscription status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorAr: 'حدث خطأ في الخادم'
    });
  }
};

/**
 * Update notification preferences
 * PUT /api/users/notification-preferences
 * Body: { channels: {...}, types: {...} }
 */
const updateNotificationPreferences = async (req, res) => {
  try {
    // IDOR Protection: Sanitize and use authenticated user's ID only
    const userId = sanitizeObjectId(req.user.userId || req.user._id);

    // Mass Assignment Protection: Pick only allowed fields
    const allowedData = pickAllowedFields(req.body, ['channels', 'types']);
    const { channels, types } = allowedData;

    const updateData = {};

    // Input Validation and Mass Assignment Protection for channels
    if (channels) {
      if (typeof channels !== 'object' || Array.isArray(channels)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid channels data',
          errorAr: 'بيانات القنوات غير صالحة'
        });
      }

      // Pick only allowed channel fields
      const allowedChannels = pickAllowedFields(channels, ['email', 'push', 'sms', 'whatsapp', 'in_app']);

      // Validate and set boolean values only
      Object.keys(allowedChannels).forEach(key => {
        if (typeof allowedChannels[key] === 'boolean') {
          updateData[`notificationPreferences.channels.${key}`] = allowedChannels[key];
        }
      });
    }

    // Input Validation and Mass Assignment Protection for types
    if (types) {
      if (typeof types !== 'object' || Array.isArray(types)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid types data',
          errorAr: 'بيانات الأنواع غير صالحة'
        });
      }

      // Pick only allowed type fields
      const allowedTypes = pickAllowedFields(types, ['task_reminders', 'hearing_reminders', 'case_updates', 'messages', 'payments']);

      // Validate and set boolean values only
      Object.keys(allowedTypes).forEach(key => {
        if (typeof allowedTypes[key] === 'boolean') {
          updateData[`notificationPreferences.types.${key}`] = allowedTypes[key];
        }
      });
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid preferences to update',
        errorAr: 'لا توجد تفضيلات صالحة للتحديث'
      });
    }

    // Update only the authenticated user's preferences (IDOR protected)
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('notificationPreferences');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        errorAr: 'المستخدم غير موجود'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification preferences updated',
      messageAr: 'تم تحديث تفضيلات الإشعارات',
      preferences: user.notificationPreferences
    });

  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorAr: 'حدث خطأ في الخادم'
    });
  }
};

/**
 * Get VAPID public key for frontend
 * GET /api/users/vapid-public-key
 */
const getVapidPublicKey = async (req, res) => {
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY;

    if (!publicKey) {
      return res.status(500).json({
        success: false,
        error: 'VAPID public key not configured',
        errorAr: 'مفتاح VAPID غير مكون'
      });
    }

    res.status(200).json({
      success: true,
      publicKey
    });

  } catch (error) {
    console.error('Get VAPID public key error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorAr: 'حدث خطأ في الخادم'
    });
  }
};

module.exports = {
  savePushSubscription,
  deletePushSubscription,
  getPushSubscriptionStatus,
  updateNotificationPreferences,
  getVapidPublicKey
};
