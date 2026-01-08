/**
 * Saudi Payroll Compliance Reminder Job
 * Sends notifications for upcoming WPS and GOSI deadlines
 *
 * Schedule: Daily at 9:00 AM (Saudi Arabia time)
 *
 * Deadlines:
 * - WPS (Wage Protection System): 10th of following month
 * - GOSI (Social Insurance): 15th of following month
 *
 * Penalties:
 * - WPS: 10,000 SAR fine + establishment services suspended
 * - GOSI: 2% monthly penalty on overdue amount
 */

const cron = require('node-cron');
const logger = require('../config/logger');
const { getComplianceDeadlines } = require('../services/wps.service');
const Firm = require('../models/firm.model');
const User = require('../models/user.model');

// Notification thresholds (days before deadline)
const NOTIFICATION_THRESHOLDS = {
    critical: 3,  // 3 days or less - daily notifications
    urgent: 7,    // 4-7 days - every other day
    soon: 14,     // 8-14 days - weekly notification
};

/**
 * Check if notification should be sent based on days remaining
 * @param {number} daysRemaining - Days until deadline
 * @returns {boolean} Whether to send notification
 */
function shouldSendNotification(daysRemaining) {
    // Always notify if overdue or on deadline day
    if (daysRemaining <= 0) return true;

    // Critical: daily notifications
    if (daysRemaining <= NOTIFICATION_THRESHOLDS.critical) return true;

    // Urgent: every other day (odd days)
    if (daysRemaining <= NOTIFICATION_THRESHOLDS.urgent) {
        return daysRemaining % 2 === 1;
    }

    // Soon: weekly (on days 14, 10)
    if (daysRemaining <= NOTIFICATION_THRESHOLDS.soon) {
        return daysRemaining === 14 || daysRemaining === 10;
    }

    // Normal: monthly reminder on 20th
    return daysRemaining === 20;
}

/**
 * Get firms that need compliance reminders
 * @returns {Promise<Array>} List of firms with their admin users
 */
async function getFirmsForReminder() {
    try {
        // Get all active firms - check payroll settings if they exist
        // Note: Firms without payroll settings are included (opt-out model)
        const firms = await Firm.find({
            status: 'active',
            // Exclude firms that explicitly disabled payroll
            'settings.payroll.enabled': { $ne: false }
        }).select('_id name molId settings').lean();

        // Get admins for each firm
        const firmsWithAdmins = await Promise.all(firms.map(async (firm) => {
            const admins = await User.find({
                firmId: firm._id,
                role: { $in: ['owner', 'admin', 'hr_manager'] },
                status: 'active',
                'preferences.notifications.payroll': { $ne: false } // Not explicitly disabled
            }).select('_id email firstName lastName').lean();

            return { ...firm, admins };
        }));

        // Filter out firms with no admins
        return firmsWithAdmins.filter(f => f.admins && f.admins.length > 0);
    } catch (error) {
        logger.error('[ComplianceReminder] Error fetching firms:', error.message);
        return [];
    }
}

/**
 * Create notification record for a user
 * @param {string} userId - User ID
 * @param {Object} deadlineInfo - Deadline information
 * @param {string} type - 'WPS' or 'GOSI'
 * @returns {Object} Notification object
 */
function createNotification(userId, firmId, deadlineInfo, type) {
    const isOverdue = deadlineInfo.daysRemaining < 0;
    const isToday = deadlineInfo.daysRemaining === 0;
    const isTomorrow = deadlineInfo.daysRemaining === 1;

    let priority = 'normal';
    if (isOverdue) priority = 'critical';
    else if (isToday || isTomorrow) priority = 'high';
    else if (deadlineInfo.daysRemaining <= 3) priority = 'medium';

    return {
        userId,
        firmId,
        type: 'compliance_reminder',
        subType: type.toLowerCase(),
        title: deadlineInfo.message,
        message: deadlineInfo.description,
        priority,
        metadata: {
            deadlineType: type,
            deadline: deadlineInfo.deadline,
            daysRemaining: deadlineInfo.daysRemaining,
            urgency: deadlineInfo.urgency,
            penalty: deadlineInfo.penalty,
            actionRequired: type === 'WPS'
                ? 'رفع ملف حماية الأجور إلى مدد / Upload WPS file to Mudad'
                : 'سداد اشتراكات التأمينات / Pay GOSI contributions via SADAD'
        },
        actionUrl: type === 'WPS'
            ? '/payroll/wps'
            : '/payroll/gosi',
        createdAt: new Date()
    };
}

/**
 * Run compliance reminder check
 */
async function runComplianceReminderJob() {
    const startTime = Date.now();
    logger.info('[ComplianceReminder] Starting compliance reminder job...');

    const stats = {
        firmsChecked: 0,
        wpsReminders: 0,
        gosiReminders: 0,
        notificationsSent: 0,
        errors: 0
    };

    try {
        // Get current deadline status
        const deadlines = getComplianceDeadlines();

        const shouldNotifyWPS = shouldSendNotification(deadlines.wps.daysRemaining);
        const shouldNotifyGOSI = shouldSendNotification(deadlines.gosi.daysRemaining);

        // Early exit if no notifications needed today
        if (!shouldNotifyWPS && !shouldNotifyGOSI) {
            logger.info('[ComplianceReminder] No notifications needed today. WPS: %d days, GOSI: %d days',
                deadlines.wps.daysRemaining, deadlines.gosi.daysRemaining);
            return stats;
        }

        // Get firms that need reminders
        const firms = await getFirmsForReminder();
        stats.firmsChecked = firms.length;

        logger.info('[ComplianceReminder] Checking %d firms. WPS notify: %s, GOSI notify: %s',
            firms.length, shouldNotifyWPS, shouldNotifyGOSI);

        // Process each firm
        for (const firm of firms) {
            try {
                const notifications = [];

                // Create WPS notifications
                if (shouldNotifyWPS && firm.settings?.payroll?.wpsEnabled !== false) {
                    for (const admin of firm.admins) {
                        notifications.push(createNotification(admin._id, firm._id, deadlines.wps, 'WPS'));
                        stats.wpsReminders++;
                    }
                }

                // Create GOSI notifications
                if (shouldNotifyGOSI && firm.settings?.payroll?.gosiEnabled !== false) {
                    for (const admin of firm.admins) {
                        notifications.push(createNotification(admin._id, firm._id, deadlines.gosi, 'GOSI'));
                        stats.gosiReminders++;
                    }
                }

                // Note: In production, you would save these to a Notification model
                // and/or send them via email/push notifications
                // For now, we log them
                if (notifications.length > 0) {
                    logger.info('[ComplianceReminder] Firm %s (%s): %d notifications queued',
                        firm.name, firm._id, notifications.length);
                    stats.notificationsSent += notifications.length;
                }

            } catch (firmError) {
                logger.error('[ComplianceReminder] Error processing firm %s:', firm._id, firmError.message);
                stats.errors++;
            }
        }

    } catch (error) {
        logger.error('[ComplianceReminder] Job failed:', error.message);
        stats.errors++;
    }

    const duration = Date.now() - startTime;
    logger.info('[ComplianceReminder] Job completed in %dms. Stats: %j', duration, stats);

    return stats;
}

/**
 * Schedule the compliance reminder job
 * Runs daily at 9:00 AM Saudi Arabia time (UTC+3)
 */
function scheduleComplianceReminderJob() {
    // Run at 6:00 AM UTC (9:00 AM Saudi Arabia)
    cron.schedule('0 6 * * *', async () => {
        try {
            await runComplianceReminderJob();
        } catch (error) {
            logger.error('[ComplianceReminder] Scheduled job error:', error.message);
        }
    }, {
        timezone: 'UTC'
    });

    logger.info('[ComplianceReminder] Job scheduled for 9:00 AM Saudi Arabia time (6:00 AM UTC)');
}

/**
 * Get summary of upcoming compliance deadlines
 * Can be called from controllers to display dashboard info
 * @returns {Object} Deadline summary
 */
function getComplianceSummary() {
    const deadlines = getComplianceDeadlines();

    return {
        wps: {
            deadline: deadlines.wps.deadline,
            daysRemaining: deadlines.wps.daysRemaining,
            urgency: deadlines.wps.urgency,
            message: deadlines.wps.message,
            shouldNotify: shouldSendNotification(deadlines.wps.daysRemaining)
        },
        gosi: {
            deadline: deadlines.gosi.deadline,
            daysRemaining: deadlines.gosi.daysRemaining,
            urgency: deadlines.gosi.urgency,
            message: deadlines.gosi.message,
            shouldNotify: shouldSendNotification(deadlines.gosi.daysRemaining)
        },
        payrollPeriod: deadlines.currentMonth.payrollPeriod,
        summary: deadlines.summary
    };
}

module.exports = {
    runComplianceReminderJob,
    scheduleComplianceReminderJob,
    getComplianceSummary,
    shouldSendNotification,
    NOTIFICATION_THRESHOLDS
};
