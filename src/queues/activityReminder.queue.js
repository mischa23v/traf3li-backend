/**
 * Activity Reminder Queue Processor
 *
 * Handles activity reminders and deadline notifications including:
 * - Individual reminder notifications for upcoming activities
 * - Overdue activity detection and notifications
 * - Daily activity digest emails
 * - Scheduled recurring checks for overdue activities
 */

const { createQueue } = require('../configs/queue');
const logger = require('../utils/logger');

// Create activity reminder queue
const activityReminderQueue = createQueue('activity-reminders', {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 24 hours
      count: 500
    },
    removeOnFail: {
      age: 172800, // Keep failed jobs for 48 hours
      count: 100
    }
  }
});

/**
 * Process activity reminder jobs
 */
activityReminderQueue.process(async (job) => {
  const { type, data } = job.data;

  logger.info(`🔔 Processing activity reminder job ${job.id} of type: ${type}`);

  try {
    switch (type) {
      case 'send-reminder':
        return await processReminder(data, job);

      case 'check-overdue':
        return await processOverdueCheck(data, job);

      case 'daily-digest':
        return await processDailyDigest(data, job);

      default:
        throw new Error(`Unknown activity reminder type: ${type}`);
    }
  } catch (error) {
    logger.error(`❌ Activity reminder job ${job.id} failed:`, error.message);
    throw error;
  }
});

/**
 * Process individual activity reminder
 * @param {Object} data - { activityId, userId, firmId }
 * @param {Object} job - Bull job instance
 */
async function processReminder(data, job) {
  const { activityId, userId, firmId } = data;

  await job.progress(10);

  // Import models dynamically to avoid circular dependencies
  const Activity = require('../models/activity.model');
  const User = require('../models/user.model');
  const notificationQueue = require('./notification.queue');
  const emailQueue = require('./email.queue');

  await job.progress(20);

  // Fetch activity details
  const activity = await Activity.findById(activityId)
    .populate('activity_type_id', 'name icon color')
    .populate('user_id', 'firstName lastName email')
    .populate('res_model')
    .lean();

  if (!activity) {
    logger.warn(`Activity ${activityId} not found - may have been deleted`);
    return {
      success: false,
      error: 'Activity not found'
    };
  }

  // Skip if activity is no longer scheduled
  if (activity.state !== 'scheduled') {
    logger.info(`Activity ${activityId} is no longer scheduled - skipping reminder`);
    return {
      success: true,
      skipped: true,
      reason: 'Activity not scheduled'
    };
  }

  await job.progress(40);

  const user = activity.user_id;
  const activityType = activity.activity_type_id;

  // Calculate time until deadline
  const now = new Date();
  const deadline = new Date(activity.date_deadline);
  const hoursUntilDeadline = Math.round((deadline - now) / (1000 * 60 * 60));
  const daysUntilDeadline = Math.round(hoursUntilDeadline / 24);

  // Prepare notification message
  const timeText = hoursUntilDeadline < 24
    ? `${hoursUntilDeadline} ساعة`
    : `${daysUntilDeadline} يوم`;

  const title = `تذكير: ${activity.summary}`;
  const message = `لديك ${activityType.name} مستحق خلال ${timeText}`;

  await job.progress(60);

  // Send in-app notification
  try {
    await notificationQueue.add({
      type: 'in-app',
      data: {
        userId: user._id,
        title,
        message,
        type: 'reminder',
        link: `/activities/${activityId}`,
        metadata: {
          activityId: activity._id,
          activityType: activityType.name,
          deadline: activity.date_deadline,
          resModel: activity.res_model,
          resId: activity.res_id
        }
      }
    });
  } catch (error) {
    logger.error('Failed to send in-app notification:', error.message);
  }

  await job.progress(80);

  // Send email notification
  try {
    const emailHtml = generateActivityReminderEmail({
      userName: `${user.firstName} ${user.lastName}`,
      activitySummary: activity.summary,
      activityType: activityType.name,
      activityNote: activity.note,
      deadline: activity.date_deadline,
      timeUntilDeadline: timeText,
      hoursUntilDeadline,
      activityIcon: activityType.icon,
      activityColor: activityType.color,
      activityLink: `/activities/${activityId}`,
      resModel: activity.res_model,
      resId: activity.res_id
    });

    await emailQueue.add({
      type: 'transactional',
      data: {
        to: user.email,
        subject: title,
        html: emailHtml
      }
    });
  } catch (error) {
    logger.error('Failed to send email notification:', error.message);
  }

  await job.progress(100);

  logger.info(`✅ Activity reminder sent for activity ${activityId} to user ${userId}`);
  return {
    success: true,
    activityId,
    userId,
    notificationsSent: 2
  };
}

/**
 * Process overdue activity check for a firm
 * @param {Object} data - { firmId }
 * @param {Object} job - Bull job instance
 */
async function processOverdueCheck(data, job) {
  const { firmId } = data;

  await job.progress(10);

  const Activity = require('../models/activity.model');
  const User = require('../models/user.model');
  const notificationQueue = require('./notification.queue');

  await job.progress(20);

  // Get all overdue activities for the firm
  const overdueActivities = await Activity.getOverdueActivities(firmId);

  if (overdueActivities.length === 0) {
    logger.info(`No overdue activities found for firm ${firmId}`);
    return {
      success: true,
      overdueCount: 0,
      firmId
    };
  }

  await job.progress(40);

  logger.info(`Found ${overdueActivities.length} overdue activities for firm ${firmId}`);

  // Group activities by user
  const activitiesByUser = {};
  for (const activity of overdueActivities) {
    const userId = activity.user_id._id.toString();
    if (!activitiesByUser[userId]) {
      activitiesByUser[userId] = {
        user: activity.user_id,
        activities: []
      };
    }
    activitiesByUser[userId].activities.push(activity);
  }

  await job.progress(60);

  // Send notifications to each user
  let notificationsSent = 0;
  const userIds = Object.keys(activitiesByUser);

  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    const { user, activities } = activitiesByUser[userId];

    try {
      const overdueCount = activities.length;
      const title = `لديك ${overdueCount} نشاط متأخر`;
      const message = activities.length === 1
        ? `النشاط "${activities[0].summary}" متأخر ويحتاج إلى انتباهك`
        : `لديك ${overdueCount} أنشطة متأخرة تحتاج إلى انتباهك`;

      await notificationQueue.add({
        type: 'in-app',
        data: {
          userId: user._id,
          title,
          message,
          type: 'warning',
          link: '/activities?filter=overdue',
          metadata: {
            overdueCount,
            activityIds: activities.map(a => a._id),
            firmId
          }
        }
      });

      notificationsSent++;
    } catch (error) {
      logger.error(`Failed to notify user ${userId} about overdue activities:`, error.message);
    }

    // Update progress
    await job.progress(60 + Math.floor(((i + 1) / userIds.length) * 30));
  }

  await job.progress(100);

  logger.info(`✅ Overdue check completed for firm ${firmId}: ${overdueActivities.length} overdue, ${notificationsSent} notifications sent`);
  return {
    success: true,
    firmId,
    overdueCount: overdueActivities.length,
    usersNotified: notificationsSent,
    activitiesByUser: Object.keys(activitiesByUser).length
  };
}

/**
 * Process daily activity digest for a user
 * @param {Object} data - { userId, firmId }
 * @param {Object} job - Bull job instance
 */
async function processDailyDigest(data, job) {
  const { userId, firmId } = data;

  await job.progress(10);

  const Activity = require('../models/activity.model');
  const User = require('../models/user.model');
  const emailQueue = require('./email.queue');

  await job.progress(20);

  // Get user details
  // SYSTEM JOB: bypassFirmFilter - queue processes users for daily digest emails
  const user = await User.findById(userId)
    .setOptions({ bypassFirmFilter: true })
    .lean();

  if (!user) {
    logger.warn(`User ${userId} not found for daily digest`);
    return {
      success: false,
      error: 'User not found'
    };
  }

  await job.progress(30);

  // Get today's activities
  const todayActivities = await Activity.getTodayActivities(firmId, userId);

  // Get overdue activities
  const overdueActivities = await Activity.find({
    firmId,
    user_id: userId,
    state: 'scheduled',
    date_deadline: { $lt: new Date() }
  })
    .populate('activity_type_id', 'name icon color')
    .sort({ date_deadline: 1 })
    .lean();

  // Get upcoming activities (next 7 days)
  const nextWeekStart = new Date();
  nextWeekStart.setDate(nextWeekStart.getDate() + 1);
  nextWeekStart.setHours(0, 0, 0, 0);

  const nextWeekEnd = new Date();
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
  nextWeekEnd.setHours(23, 59, 59, 999);

  const upcomingActivities = await Activity.find({
    firmId,
    user_id: userId,
    state: 'scheduled',
    date_deadline: { $gte: nextWeekStart, $lte: nextWeekEnd }
  })
    .populate('activity_type_id', 'name icon color')
    .sort({ date_deadline: 1 })
    .limit(10)
    .lean();

  await job.progress(60);

  // Skip if no activities to report
  if (todayActivities.length === 0 && overdueActivities.length === 0 && upcomingActivities.length === 0) {
    logger.info(`No activities to report in daily digest for user ${userId}`);
    return {
      success: true,
      skipped: true,
      reason: 'No activities to report'
    };
  }

  await job.progress(70);

  // Generate and send daily digest email
  try {
    const emailHtml = generateDailyDigestEmail({
      userName: `${user.firstName} ${user.lastName}`,
      todayActivities,
      overdueActivities,
      upcomingActivities,
      todayCount: todayActivities.length,
      overdueCount: overdueActivities.length,
      upcomingCount: upcomingActivities.length
    });

    await emailQueue.add({
      type: 'transactional',
      data: {
        to: user.email,
        subject: `ملخصك اليومي - ${todayActivities.length} نشاط اليوم، ${overdueActivities.length} متأخر`,
        html: emailHtml
      }
    });

    await job.progress(100);

    logger.info(`✅ Daily digest sent to user ${userId}`);
    return {
      success: true,
      userId,
      todayCount: todayActivities.length,
      overdueCount: overdueActivities.length,
      upcomingCount: upcomingActivities.length
    };
  } catch (error) {
    logger.error(`Failed to send daily digest to user ${userId}:`, error.message);
    throw error;
  }
}

// ==================== Helper Functions ====================

/**
 * Schedule a reminder for an activity
 * @param {String} activityId - Activity ID
 * @param {Date} reminderTime - When to send the reminder
 * @param {String} userId - User ID
 * @param {String} firmId - Firm ID
 * @returns {Promise<Object>} - Job info
 */
async function scheduleReminder(activityId, reminderTime, userId, firmId) {
  const delay = new Date(reminderTime) - new Date();

  if (delay <= 0) {
    logger.warn(`Reminder time for activity ${activityId} is in the past - skipping`);
    return { scheduled: false, reason: 'Time in past' };
  }

  try {
    const job = await activityReminderQueue.add(
      {
        type: 'send-reminder',
        data: {
          activityId,
          userId,
          firmId
        }
      },
      {
        delay,
        jobId: `reminder-${activityId}`,
        removeOnComplete: true
      }
    );

    logger.info(`📅 Reminder scheduled for activity ${activityId} at ${reminderTime}`);
    return {
      scheduled: true,
      jobId: job.id,
      reminderTime
    };
  } catch (error) {
    logger.error(`Failed to schedule reminder for activity ${activityId}:`, error.message);
    throw error;
  }
}

/**
 * Cancel a scheduled reminder for an activity
 * @param {String} activityId - Activity ID
 * @returns {Promise<Boolean>} - True if cancelled
 */
async function cancelReminder(activityId) {
  try {
    const jobId = `reminder-${activityId}`;
    const job = await activityReminderQueue.getJob(jobId);

    if (job) {
      await job.remove();
      logger.info(`❌ Reminder cancelled for activity ${activityId}`);
      return true;
    }

    return false;
  } catch (error) {
    logger.error(`Failed to cancel reminder for activity ${activityId}:`, error.message);
    return false;
  }
}

/**
 * Setup recurring jobs for a firm
 * @param {String} firmId - Firm ID
 * @returns {Promise<Object>} - Setup result
 */
async function setupRecurringJobs(firmId) {
  try {
    // Setup hourly overdue check
    await activityReminderQueue.add(
      {
        type: 'check-overdue',
        data: { firmId }
      },
      {
        repeat: {
          cron: '0 * * * *', // Every hour at minute 0
          jobId: `overdue-check-${firmId}`
        },
        jobId: `overdue-check-${firmId}`,
        removeOnComplete: true
      }
    );

    logger.info(`⏰ Hourly overdue check scheduled for firm ${firmId}`);

    // Note: Daily digest should be scheduled per user, not per firm
    // This is typically handled when users opt-in for daily digests

    return {
      success: true,
      firmId,
      recurringJobs: ['overdue-check']
    };
  } catch (error) {
    logger.error(`Failed to setup recurring jobs for firm ${firmId}:`, error.message);
    throw error;
  }
}

/**
 * Schedule daily digest for a user
 * @param {String} userId - User ID
 * @param {String} firmId - Firm ID
 * @param {String} timeString - Time in format "HH:MM" (24-hour format)
 * @returns {Promise<Object>} - Setup result
 */
async function scheduleDailyDigest(userId, firmId, timeString = '08:00') {
  try {
    const [hour, minute] = timeString.split(':').map(Number);

    await activityReminderQueue.add(
      {
        type: 'daily-digest',
        data: { userId, firmId }
      },
      {
        repeat: {
          cron: `${minute} ${hour} * * *`, // Daily at specified time
          jobId: `daily-digest-${userId}`
        },
        jobId: `daily-digest-${userId}`,
        removeOnComplete: true
      }
    );

    logger.info(`📧 Daily digest scheduled for user ${userId} at ${timeString}`);
    return {
      success: true,
      userId,
      time: timeString
    };
  } catch (error) {
    logger.error(`Failed to schedule daily digest for user ${userId}:`, error.message);
    throw error;
  }
}

/**
 * Cancel daily digest for a user
 * @param {String} userId - User ID
 * @returns {Promise<Boolean>} - True if cancelled
 */
async function cancelDailyDigest(userId) {
  try {
    const repeatableJobs = await activityReminderQueue.getRepeatableJobs();
    const digestJob = repeatableJobs.find(job => job.id === `daily-digest-${userId}`);

    if (digestJob) {
      await activityReminderQueue.removeRepeatableByKey(digestJob.key);
      logger.info(`❌ Daily digest cancelled for user ${userId}`);
      return true;
    }

    return false;
  } catch (error) {
    logger.error(`Failed to cancel daily digest for user ${userId}:`, error.message);
    return false;
  }
}

// ==================== Email Templates ====================

/**
 * Generate activity reminder email HTML
 */
function generateActivityReminderEmail(data) {
  const {
    userName,
    activitySummary,
    activityType,
    activityNote,
    deadline,
    timeUntilDeadline,
    hoursUntilDeadline,
    activityIcon,
    activityColor,
    activityLink
  } = data;

  const urgencyLevel = hoursUntilDeadline <= 2 ? 'urgent' : hoursUntilDeadline <= 24 ? 'soon' : 'upcoming';
  const urgencyColors = {
    urgent: '#dc2626',
    soon: '#f59e0b',
    upcoming: '#3b82f6'
  };
  const urgencyColor = urgencyColors[urgencyLevel];

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تذكير بالنشاط</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 28px; font-weight: bold; color: #1e40af; }
    .reminder-box { background: #f9fafb; border-right: 4px solid ${urgencyColor}; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .activity-icon { font-size: 24px; margin-left: 10px; }
    .deadline { font-size: 18px; font-weight: bold; color: ${urgencyColor}; margin: 10px 0; }
    .time-badge { display: inline-block; background: ${urgencyColor}; color: white; padding: 6px 12px; border-radius: 4px; font-size: 14px; }
    .button { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">ترافعلي | TRAF3LI</div>
    </div>

    <h2>مرحباً ${userName}،</h2>
    <p>هذا تذكير بنشاط قادم يحتاج إلى انتباهك:</p>

    <div class="reminder-box">
      <div style="display: flex; align-items: center; margin-bottom: 15px;">
        ${activityIcon ? `<span class="activity-icon">${activityIcon}</span>` : ''}
        <div>
          <div style="font-size: 12px; color: #666;">${activityType}</div>
          <h3 style="margin: 5px 0;">${activitySummary}</h3>
        </div>
      </div>

      ${activityNote ? `<p style="color: #666; margin: 10px 0;">${activityNote}</p>` : ''}

      <div class="deadline">
        <span class="time-badge">يستحق خلال ${timeUntilDeadline}</span>
      </div>

      <p style="margin-top: 10px; color: #666;">
        <strong>الموعد النهائي:</strong> ${new Date(deadline).toLocaleString('ar-SA', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </p>
    </div>

    <div style="text-align: center;">
      <a href="${process.env.CLIENT_URL || '#'}${activityLink}" class="button">عرض النشاط</a>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} TRAF3LI. جميع الحقوق محفوظة.</p>
      <p>المملكة العربية السعودية</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate daily digest email HTML
 */
function generateDailyDigestEmail(data) {
  const {
    userName,
    todayActivities,
    overdueActivities,
    upcomingActivities,
    todayCount,
    overdueCount,
    upcomingCount
  } = data;

  const formatActivityList = (activities) => {
    if (!activities || activities.length === 0) {
      return '<p style="color: #666;">لا توجد أنشطة</p>';
    }

    return activities.map(activity => `
      <div style="background: #f9fafb; padding: 15px; margin: 10px 0; border-radius: 8px; border-right: 3px solid ${activity.activity_type_id?.color || '#3b82f6'};">
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div style="flex: 1;">
            <div style="font-size: 12px; color: #666; margin-bottom: 5px;">
              ${activity.activity_type_id?.icon || '📋'} ${activity.activity_type_id?.name || 'نشاط'}
            </div>
            <div style="font-weight: bold; color: #1f2937;">${activity.summary}</div>
            ${activity.note ? `<div style="font-size: 14px; color: #666; margin-top: 5px;">${activity.note}</div>` : ''}
          </div>
          <div style="text-align: left; margin-right: 15px;">
            <div style="font-size: 12px; color: #666;">
              ${new Date(activity.date_deadline).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>
    `).join('');
  };

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ملخصك اليومي</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 28px; font-weight: bold; color: #1e40af; }
    .summary-cards { display: flex; gap: 10px; margin: 20px 0; flex-wrap: wrap; }
    .summary-card { flex: 1; min-width: 150px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
    .summary-card.today { background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); }
    .summary-card.overdue { background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%); }
    .summary-card.upcoming { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
    .summary-card .number { font-size: 32px; font-weight: bold; margin: 10px 0; }
    .summary-card .label { font-size: 14px; opacity: 0.9; }
    .section { margin: 30px 0; }
    .section-title { font-size: 20px; font-weight: bold; color: #1f2937; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb; }
    .button { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">ترافعلي | TRAF3LI</div>
      <p style="color: #666; margin-top: 10px;">ملخصك اليومي</p>
    </div>

    <h2>صباح الخير ${userName}! ☀️</h2>
    <p>إليك ملخص أنشطتك لهذا اليوم:</p>

    <div class="summary-cards">
      <div class="summary-card today">
        <div class="number">${todayCount}</div>
        <div class="label">نشاط اليوم</div>
      </div>
      ${overdueCount > 0 ? `
      <div class="summary-card overdue">
        <div class="number">${overdueCount}</div>
        <div class="label">متأخر</div>
      </div>
      ` : ''}
      <div class="summary-card upcoming">
        <div class="number">${upcomingCount}</div>
        <div class="label">قادم</div>
      </div>
    </div>

    ${overdueCount > 0 ? `
    <div class="section">
      <div class="section-title">⚠️ أنشطة متأخرة (${overdueCount})</div>
      ${formatActivityList(overdueActivities)}
    </div>
    ` : ''}

    ${todayCount > 0 ? `
    <div class="section">
      <div class="section-title">📅 أنشطة اليوم (${todayCount})</div>
      ${formatActivityList(todayActivities)}
    </div>
    ` : ''}

    ${upcomingCount > 0 ? `
    <div class="section">
      <div class="section-title">📆 قادم هذا الأسبوع (${upcomingCount})</div>
      ${formatActivityList(upcomingActivities.slice(0, 5))}
      ${upcomingCount > 5 ? `<p style="text-align: center; color: #666;">و ${upcomingCount - 5} أنشطة أخرى...</p>` : ''}
    </div>
    ` : ''}

    <div style="text-align: center; margin-top: 30px;">
      <a href="${process.env.CLIENT_URL || '#'}/activities" class="button">عرض جميع الأنشطة</a>
    </div>

    <div class="footer">
      <p>تتلقى هذا البريد الإلكتروني لأنك اشتركت في الملخص اليومي.</p>
      <p><a href="${process.env.CLIENT_URL || '#'}/settings/notifications" style="color: #3b82f6;">إدارة تفضيلات الإشعارات</a></p>
      <p style="margin-top: 15px;">© ${new Date().getFullYear()} TRAF3LI. جميع الحقوق محفوظة.</p>
    </div>
  </div>
</body>
</html>`;
}

module.exports = {
  queue: activityReminderQueue,
  scheduleReminder,
  cancelReminder,
  setupRecurringJobs,
  scheduleDailyDigest,
  cancelDailyDigest
};
