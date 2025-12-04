/**
 * Push Subscription Controller for TRAF3LI
 * Handles Web Push subscription management
 */

const { User } = require('../models');

/**
 * Save push subscription
 * POST /api/users/push-subscription
 * Body: { subscription: { endpoint, keys: { p256dh, auth } } }
 */
const savePushSubscription = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subscription data',
        errorAr: 'بيانات الاشتراك غير صالحة'
      });
    }

    // Validate subscription keys
    if (!subscription.keys.p256dh || !subscription.keys.auth) {
      return res.status(400).json({
        success: false,
        error: 'Missing subscription keys',
        errorAr: 'مفاتيح الاشتراك مفقودة'
      });
    }

    // Update user's push subscription
    await User.findByIdAndUpdate(userId, {
      pushSubscription: {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth
        }
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
    const userId = req.user.userId || req.user._id;

    // Remove user's push subscription
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
    const userId = req.user.userId || req.user._id;

    const user = await User.findById(userId).select('pushSubscription notificationPreferences');

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
    const userId = req.user.userId || req.user._id;
    const { channels, types } = req.body;

    const updateData = {};

    if (channels) {
      if (channels.email !== undefined) updateData['notificationPreferences.channels.email'] = channels.email;
      if (channels.push !== undefined) updateData['notificationPreferences.channels.push'] = channels.push;
      if (channels.sms !== undefined) updateData['notificationPreferences.channels.sms'] = channels.sms;
      if (channels.whatsapp !== undefined) updateData['notificationPreferences.channels.whatsapp'] = channels.whatsapp;
      if (channels.in_app !== undefined) updateData['notificationPreferences.channels.in_app'] = channels.in_app;
    }

    if (types) {
      if (types.task_reminders !== undefined) updateData['notificationPreferences.types.task_reminders'] = types.task_reminders;
      if (types.hearing_reminders !== undefined) updateData['notificationPreferences.types.hearing_reminders'] = types.hearing_reminders;
      if (types.case_updates !== undefined) updateData['notificationPreferences.types.case_updates'] = types.case_updates;
      if (types.messages !== undefined) updateData['notificationPreferences.types.messages'] = types.messages;
      if (types.payments !== undefined) updateData['notificationPreferences.types.payments'] = types.payments;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No preferences to update',
        errorAr: 'لا توجد تفضيلات للتحديث'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('notificationPreferences');

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
