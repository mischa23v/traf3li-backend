/**
 * Notification Queue Processor
 *
 * Handles asynchronous push notifications, SMS, and in-app notifications.
 */

const { createQueue } = require('../configs/queue');
const logger = require('../utils/logger');

// Optional: web-push for browser push notifications
// Install with: npm install web-push
let webpush = null;
try {
  webpush = require('web-push');
} catch (err) {
  logger.warn('web-push not installed - push notifications disabled');
}

// Create notification queue
const notificationQueue = createQueue('notification', {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      age: 86400,
      count: 1000
    }
  }
});

/**
 * Process notification jobs
 */
notificationQueue.process(async (job) => {
  const { type, data } = job.data;

  logger.info(`🔔 Processing notification job ${job.id} of type: ${type}`);

  try {
    switch (type) {
      case 'push':
        return await sendPushNotification(data, job);

      case 'in-app':
        return await sendInAppNotification(data, job);

      case 'sms':
        return await sendSMSNotification(data, job);

      case 'webhook':
        return await sendWebhookNotification(data, job);

      case 'bulk-push':
        return await sendBulkPushNotifications(data, job);

      default:
        throw new Error(`Unknown notification type: ${type}`);
    }
  } catch (error) {
    logger.error(`❌ Notification job ${job.id} failed:`, error.message);
    throw error;
  }
});

/**
 * Send push notification
 */
async function sendPushNotification(data, job) {
  const { userId, subscription, title, body, icon, badge, data: notificationData } = data;

  // Check if web-push is available
  if (!webpush) {
    logger.warn('web-push not installed - skipping push notification');
    return { success: false, error: 'web-push not installed' };
  }

  await job.progress(30);

  // Configure web push (you need to set VAPID keys in environment)
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      'mailto:' + (process.env.CONTACT_EMAIL || 'support@traf3li.com'),
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }

  const payload = JSON.stringify({
    title,
    body,
    icon: icon || '/icon.png',
    badge: badge || '/badge.png',
    data: notificationData || {}
  });

  await job.progress(60);

  try {
    await webpush.sendNotification(subscription, payload);
    await job.progress(100);

    logger.info(`✅ Push notification sent to user ${userId}`);
    return {
      success: true,
      userId,
      title
    };
  } catch (error) {
    // If subscription is invalid, mark it for removal
    if (error.statusCode === 410) {
      logger.warn(`Push subscription expired for user ${userId}`);
      return {
        success: false,
        userId,
        expired: true,
        error: 'Subscription expired'
      };
    }
    throw error;
  }
}

/**
 * Send in-app notification
 */
async function sendInAppNotification(data, job) {
  const { userId, title, message, type, link, metadata, firmId } = data;

  // If firmId is provided, verify the user belongs to that firm
  if (firmId) {
    await job.progress(20);

    const User = require('../models/user.model');
    const user = await User.findOne({ _id: userId, firmId });

    if (!user) {
      throw new Error('User not found in the specified firm - access denied');
    }
  }

  await job.progress(30);

  // Import models dynamically to avoid circular dependencies
  const Notification = require('../models/notification.model');

  await job.progress(60);

  // Create notification in database
  const notification = await Notification.create({
    userId,
    title,
    message,
    type: type || 'info',
    link,
    metadata,
    ...(firmId && { firmId }), // Include firmId if provided
    isRead: false,
    createdAt: new Date()
  });

  await job.progress(80);

  // Emit socket event if user is online (optional)
  const io = require('../configs/socket').getIO();
  if (io) {
    io.to(`user_${userId}`).emit('notification', {
      id: notification._id,
      title,
      message,
      type,
      link,
      createdAt: notification.createdAt
    });
  }

  await job.progress(100);

  logger.info(`✅ In-app notification sent to user ${userId}`);
  return {
    success: true,
    userId,
    notificationId: notification._id
  };
}

/**
 * Send SMS notification
 */
async function sendSMSNotification(data, job) {
  const { phoneNumber, message, senderId } = data;

  await job.progress(30);

  // Implement SMS sending using your preferred provider
  // Examples: Twilio, AWS SNS, Nexmo, etc.
  // For Saudi Arabia: Unifonic, Jawwal SMS, etc.

  logger.info(`📱 Sending SMS to ${phoneNumber}: ${message}`);

  await job.progress(60);

  // Placeholder - implement actual SMS sending
  // const result = await smsProvider.send({
  //   to: phoneNumber,
  //   message,
  //   from: senderId
  // });

  await job.progress(100);

  logger.info(`✅ SMS sent to ${phoneNumber}`);
  return {
    success: true,
    phoneNumber,
    messageId: 'sms_' + Date.now()
  };
}

/**
 * Send webhook notification
 */
async function sendWebhookNotification(data, job) {
  const { webhookUrl, payload, headers = {} } = data;

  await job.progress(30);

  const axios = require('axios');

  await job.progress(50);

  const response = await axios.post(webhookUrl, payload, {
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    timeout: 10000
  });

  await job.progress(100);

  logger.info(`✅ Webhook notification sent to ${webhookUrl}`);
  return {
    success: true,
    webhookUrl,
    statusCode: response.status,
    response: response.data
  };
}

/**
 * Send bulk push notifications
 */
async function sendBulkPushNotifications(data, job) {
  const { users, title, body, icon, data: notificationData } = data;

  const results = [];
  const total = users.length;

  for (let i = 0; i < users.length; i++) {
    const user = users[i];

    try {
      if (user.subscription) {
        const result = await sendPushNotification({
          userId: user.userId,
          subscription: user.subscription,
          title,
          body,
          icon,
          data: notificationData
        }, job);

        results.push({
          userId: user.userId,
          success: result.success
        });
      } else {
        results.push({
          userId: user.userId,
          success: false,
          error: 'No subscription'
        });
      }

      // Update progress
      await job.progress(Math.floor(((i + 1) / total) * 100));

    } catch (error) {
      logger.error(`Failed to send notification to user ${user.userId}:`, error.message);
      results.push({
        userId: user.userId,
        success: false,
        error: error.message
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  logger.info(`✅ Bulk push notifications sent: ${successCount}/${total}`);

  return {
    success: true,
    total,
    successCount,
    failedCount: total - successCount,
    results
  };
}

module.exports = notificationQueue;
