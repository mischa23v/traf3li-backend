/**
 * Notification Digest Job for TRAF3LI
 *
 * Scheduled tasks:
 * - Every hour: Send daily digests to users at their preferred time
 * - Monday at 9 AM: Send weekly digests
 */

const cron = require('node-cron');
const NotificationPreferenceService = require('../services/notificationPreference.service');
const NotificationDeliveryService = require('../services/notificationDelivery.service');
const NotificationPreference = require('../models/notificationPreference.model');
const logger = require('../utils/contextLogger').child({ module: 'NotificationDigestJob' });

// Track running jobs
let jobsRunning = {
  dailyDigest: false,
  weeklyDigest: false
};

/**
 * Map notification type to category
 * @param {String} type - Notification type
 * @returns {String} - Category name
 */
function mapTypeToCategory(type) {
  const typeMap = {
    // Invoice types
    'invoice': 'invoices',
    'invoice_approval_required': 'invoices',
    'invoice_approved': 'invoices',
    'invoice_rejected': 'invoices',
    'recurring_invoice': 'invoices',
    'credit_note': 'invoices',
    'debit_note': 'invoices',

    // Payment types
    'payment': 'payments',

    // Case types
    'case': 'cases',
    'case_update': 'cases',
    'hearing': 'cases',
    'hearing_reminder': 'cases',

    // Task types
    'task': 'tasks',
    'task_assigned': 'tasks',
    'deadline': 'tasks',

    // Client types
    'order': 'clients',
    'proposal': 'clients',
    'proposal_accepted': 'clients',

    // Approval types
    'time_entry_submitted': 'approvals',
    'time_entry_approved': 'approvals',
    'time_entry_rejected': 'approvals',
    'expense_submitted': 'approvals',
    'expense_approved': 'approvals',
    'expense_rejected': 'approvals',

    // Reminder types
    'reminder': 'reminders',
    'event': 'reminders',

    // Message/mention types
    'message': 'mentions',
    'chatter': 'mentions',

    // System types
    'system': 'system',
    'alert': 'system',
    'review': 'system'
  };

  return typeMap[type] || 'system';
}

/**
 * Group notifications by category
 * @param {Array} notifications - Array of notifications
 * @returns {Object} - Grouped notifications
 */
function groupNotificationsByCategory(notifications) {
  const grouped = {};

  for (const notification of notifications) {
    const category = mapTypeToCategory(notification.type);

    if (!grouped[category]) {
      grouped[category] = [];
    }

    grouped[category].push(notification);
  }

  return grouped;
}

/**
 * Generate digest email HTML
 * @param {Object} user - User object
 * @param {Array} notifications - Array of notifications
 * @param {String} digestType - 'daily' or 'weekly'
 * @returns {String} - HTML content
 */
function generateDigestEmailHTML(user, notifications, digestType) {
  const userName = `${user.firstName} ${user.lastName}`;
  const groupedNotifications = groupNotificationsByCategory(notifications);

  const categoryLabels = {
    invoices: { en: 'Invoices', ar: 'الفواتير' },
    payments: { en: 'Payments', ar: 'المدفوعات' },
    cases: { en: 'Cases', ar: 'القضايا' },
    tasks: { en: 'Tasks', ar: 'المهام' },
    clients: { en: 'Clients', ar: 'العملاء' },
    approvals: { en: 'Approvals', ar: 'الموافقات' },
    reminders: { en: 'Reminders', ar: 'التذكيرات' },
    mentions: { en: 'Mentions', ar: 'الإشارات' },
    system: { en: 'System', ar: 'النظام' },
    billing: { en: 'Billing', ar: 'الفواتير' },
    security: { en: 'Security', ar: 'الأمان' },
    updates: { en: 'Updates', ar: 'التحديثات' }
  };

  const digestTitle = digestType === 'daily'
    ? { en: 'Daily Digest', ar: 'ملخص يومي' }
    : { en: 'Weekly Digest', ar: 'ملخص أسبوعي' };

  let categoryHTML = '';

  for (const [category, items] of Object.entries(groupedNotifications)) {
    const label = categoryLabels[category] || { en: category, ar: category };

    categoryHTML += `
      <div style="margin-bottom: 30px;">
        <h3 style="color: #1e40af; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
          ${label.ar} | ${label.en} (${items.length})
        </h3>
        <div style="margin-top: 15px;">
    `;

    for (const notification of items.slice(0, 10)) { // Limit to 10 per category
      const priorityColor = {
        low: '#10b981',
        normal: '#3b82f6',
        high: '#f59e0b',
        urgent: '#dc2626'
      }[notification.priority] || '#3b82f6';

      categoryHTML += `
        <div style="background: #f9fafb; border-right: 4px solid ${priorityColor}; padding: 15px; margin-bottom: 10px; border-radius: 5px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="flex: 1;">
              <strong style="font-size: 16px; color: #111827;">${notification.title}</strong>
              ${notification.titleAr ? `<br><span style="color: #6b7280;">${notification.titleAr}</span>` : ''}
              <p style="margin: 10px 0 0 0; color: #4b5563;">${notification.message}</p>
              ${notification.messageAr ? `<p style="margin: 5px 0 0 0; color: #6b7280;">${notification.messageAr}</p>` : ''}
            </div>
            <div style="margin-right: 15px; color: #9ca3af; font-size: 12px;">
              ${new Date(notification.createdAt).toLocaleDateString('ar-SA')}
            </div>
          </div>
          ${notification.link ? `
            <div style="margin-top: 10px;">
              <a href="${process.env.CLIENT_URL}${notification.link}"
                 style="color: #1e40af; text-decoration: none; font-size: 14px;">
                عرض التفاصيل | View Details →
              </a>
            </div>
          ` : ''}
        </div>
      `;
    }

    if (items.length > 10) {
      categoryHTML += `
        <p style="color: #6b7280; font-size: 14px; margin-top: 10px;">
          + ${items.length - 10} more notifications in this category
        </p>
      `;
    }

    categoryHTML += `
        </div>
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${digestTitle.ar} - TRAF3LI</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #1e40af; padding-bottom: 20px; }
    .logo { font-size: 32px; font-weight: bold; color: #1e40af; }
    .digest-title { font-size: 24px; color: #374151; margin-top: 15px; }
    .summary { background: #eff6ff; border-right: 4px solid #1e40af; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
    .button { display: inline-block; background: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
    .unsubscribe { color: #9ca3af; font-size: 12px; margin-top: 15px; }
    .unsubscribe a { color: #6b7280; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">ترافعلي | TRAF3LI</div>
      <div class="digest-title">${digestTitle.ar} | ${digestTitle.en}</div>
    </div>

    <div style="margin-bottom: 30px;">
      <h2>مرحباً ${userName}،</h2>
      <p style="color: #4b5563; font-size: 16px;">
        ${digestType === 'daily'
          ? 'إليك ملخص إشعاراتك لليوم الماضي'
          : 'إليك ملخص إشعاراتك للأسبوع الماضي'
        }
      </p>
    </div>

    <div class="summary">
      <strong>ملخص | Summary:</strong>
      <p style="margin: 10px 0 0 0; color: #374151;">
        لديك ${notifications.length} إشعار جديد
        <br>
        You have ${notifications.length} new notification(s)
      </p>
    </div>

    ${categoryHTML}

    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.CLIENT_URL}/notifications" class="button">
        عرض جميع الإشعارات | View All Notifications
      </a>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} TRAF3LI. جميع الحقوق محفوظة.</p>
      <p>المملكة العربية السعودية</p>
      <div class="unsubscribe">
        <p>
          لتغيير تفضيلات الإشعارات، قم بزيارة
          <a href="${process.env.CLIENT_URL}/settings/notifications">الإعدادات</a>
          <br>
          To change notification preferences, visit
          <a href="${process.env.CLIENT_URL}/settings/notifications">Settings</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Process daily digest for a specific hour
 * Sends digests to users whose digestTime matches the current hour
 */
const processDailyDigest = async () => {
  if (jobsRunning.dailyDigest) {
    logger.info('⏩ Daily digest job still running, skipping...');
    return;
  }

  jobsRunning.dailyDigest = true;

  try {
    const now = new Date();
    const currentHour = now.getHours();
    logger.info(`🔔 Processing daily digests for hour ${currentHour}...`);

    // Get all users with daily digest enabled
    // NOTE: Bypass firmIsolation filter - system job operates across all firms
    const preferences = await NotificationPreference.find({
      'channels.email.enabled': true,
      'channels.email.digest': 'daily'
    }).setOptions({ bypassFirmFilter: true }).populate('userId', 'email firstName lastName timezone');

    if (!preferences.length) {
      logger.info('📭 No users with daily digest enabled');
      return;
    }

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const pref of preferences) {
      try {
        // Check if it's time to send digest for this user
        if (!pref.shouldSendDigestNow()) {
          skipped++;
          continue;
        }

        const user = pref.userId;
        if (!user || !user.email) {
          logger.warn(`⚠️ User not found or no email for preference ${pref._id}`);
          skipped++;
          continue;
        }

        // Get pending notifications
        const notifications = await NotificationPreferenceService.getPendingDigestNotifications(
          user._id,
          'daily'
        );

        if (notifications.length === 0) {
          logger.info(`📭 No pending notifications for user ${user._id}`);
          skipped++;
          continue;
        }

        // Generate and send digest email
        const htmlContent = generateDigestEmailHTML(user, notifications, 'daily');

        const result = await NotificationDeliveryService.sendEmail({
          to: user.email,
          subject: `ملخص يومي - TRAF3LI Daily Digest (${notifications.length} notifications)`,
          message: `You have ${notifications.length} new notifications`,
          userName: `${user.firstName} ${user.lastName}`,
          data: {},
          bypassRateLimit: true // Digests bypass rate limiting
        }, { html: htmlContent });

        if (result.success) {
          // Mark notifications as sent
          const notificationIds = notifications.map(n => n._id);
          await NotificationPreferenceService.markDigestNotificationsAsSent(user._id, notificationIds);

          logger.info(`✅ Daily digest sent to ${user.email} (${notifications.length} notifications)`);
          sent++;
        } else {
          logger.error(`❌ Failed to send daily digest to ${user.email}:`, result.error);
          failed++;
        }
      } catch (error) {
        logger.error(`❌ Error processing daily digest for user:`, error.message);
        failed++;
      }
    }

    logger.info(`✅ Daily digest complete: ${sent} sent, ${skipped} skipped, ${failed} failed`);
  } catch (error) {
    logger.error('❌ Daily digest job error:', error);
  } finally {
    jobsRunning.dailyDigest = false;
  }
};

/**
 * Process weekly digest
 * Runs every Monday at 9 AM
 */
const processWeeklyDigest = async () => {
  if (jobsRunning.weeklyDigest) {
    logger.info('⏩ Weekly digest job still running, skipping...');
    return;
  }

  jobsRunning.weeklyDigest = true;

  try {
    logger.info('📅 Processing weekly digests...');

    // Get all users with weekly digest enabled
    // NOTE: Bypass firmIsolation filter - system job operates across all firms
    const preferences = await NotificationPreference.find({
      'channels.email.enabled': true,
      'channels.email.digest': 'weekly'
    }).setOptions({ bypassFirmFilter: true }).populate('userId', 'email firstName lastName timezone');

    if (!preferences.length) {
      logger.info('📭 No users with weekly digest enabled');
      return;
    }

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const pref of preferences) {
      try {
        const user = pref.userId;
        if (!user || !user.email) {
          logger.warn(`⚠️ User not found or no email for preference ${pref._id}`);
          skipped++;
          continue;
        }

        // Get pending notifications from the past week
        const notifications = await NotificationPreferenceService.getPendingDigestNotifications(
          user._id,
          'weekly'
        );

        if (notifications.length === 0) {
          logger.info(`📭 No pending notifications for user ${user._id}`);
          skipped++;
          continue;
        }

        // Generate and send digest email
        const htmlContent = generateDigestEmailHTML(user, notifications, 'weekly');

        const result = await NotificationDeliveryService.sendEmail({
          to: user.email,
          subject: `ملخص أسبوعي - TRAF3LI Weekly Digest (${notifications.length} notifications)`,
          message: `You have ${notifications.length} new notifications this week`,
          userName: `${user.firstName} ${user.lastName}`,
          data: {},
          bypassRateLimit: true // Digests bypass rate limiting
        }, { html: htmlContent });

        if (result.success) {
          // Mark notifications as sent
          const notificationIds = notifications.map(n => n._id);
          await NotificationPreferenceService.markDigestNotificationsAsSent(user._id, notificationIds);

          logger.info(`✅ Weekly digest sent to ${user.email} (${notifications.length} notifications)`);
          sent++;
        } else {
          logger.error(`❌ Failed to send weekly digest to ${user.email}:`, result.error);
          failed++;
        }
      } catch (error) {
        logger.error(`❌ Error processing weekly digest for user:`, error.message);
        failed++;
      }
    }

    logger.info(`✅ Weekly digest complete: ${sent} sent, ${skipped} skipped, ${failed} failed`);
  } catch (error) {
    logger.error('❌ Weekly digest job error:', error);
  } finally {
    jobsRunning.weeklyDigest = false;
  }
};

/**
 * Start all notification digest jobs
 */
function startNotificationDigestJobs() {
  logger.info('🚀 Starting notification digest job scheduler...');

  // Every hour: Process daily digests
  cron.schedule('0 * * * *', () => {
    processDailyDigest();
  });
  logger.info('✓ Daily digest job: every hour (checks digestTime)');

  // Every Monday at 9:00 AM: Send weekly digests
  cron.schedule('0 9 * * 1', () => {
    processWeeklyDigest();
  });
  logger.info('✓ Weekly digest job: Monday at 9:00 AM');

  logger.info('✅ All notification digest jobs started successfully');
}

/**
 * Stop all jobs (for graceful shutdown)
 */
function stopNotificationDigestJobs() {
  logger.info('🛑 Stopping notification digest jobs...');
  // Jobs will stop automatically when process exits
}

/**
 * Manually trigger a specific job (for testing/admin)
 */
async function triggerJob(jobName) {
  logger.info(`🔧 Manually triggering ${jobName}...`);

  switch (jobName) {
    case 'dailyDigest':
      await processDailyDigest();
      break;
    case 'weeklyDigest':
      await processWeeklyDigest();
      break;
    default:
      throw new Error(`Unknown job: ${jobName}`);
  }

  logger.info(`✅ ${jobName} completed`);
}

/**
 * Get job status
 */
function getJobStatus() {
  return {
    jobs: {
      dailyDigest: {
        running: jobsRunning.dailyDigest,
        schedule: 'Every hour (checks user digestTime)'
      },
      weeklyDigest: {
        running: jobsRunning.weeklyDigest,
        schedule: 'Monday at 9:00 AM'
      }
    }
  };
}

module.exports = {
  startNotificationDigestJobs,
  stopNotificationDigestJobs,
  triggerJob,
  getJobStatus,
  // Export individual functions for testing
  processDailyDigest,
  processWeeklyDigest,
  generateDigestEmailHTML,
  mapTypeToCategory,
  groupNotificationsByCategory
};
