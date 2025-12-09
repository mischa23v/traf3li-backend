/**
 * Task Reminders & Cron Jobs for TRAF3LI
 *
 * This module handles all scheduled background tasks:
 * - Task reminders (daily at 9:00 AM Saudi time)
 * - Hearing reminders (every hour)
 * - Reminder trigger (every minute) - sends notifications for due reminders
 * - Recurring item generator (daily at midnight Saudi time)
 * - Escalation checker (every 5 minutes)
 * - Snoozed reminder checker (every minute)
 *
 * All time-based cron jobs use Saudi Arabia timezone (Asia/Riyadh)
 */

const cron = require('node-cron');
const EventEmitter = require('events');

// Increase max listeners to prevent warning (we have many cron jobs)
EventEmitter.defaultMaxListeners = 20;
const { Task, Case, Reminder, Notification, User, Event } = require('../models');
const { createNotification } = require('../controllers/notification.controller');
const NotificationDeliveryService = require('../services/notificationDelivery.service');
const { DEFAULT_TIMEZONE } = require('./timezone');

// Cron job options with Saudi Arabia timezone
const cronOptions = {
  timezone: DEFAULT_TIMEZONE // 'Asia/Riyadh'
};

/**
 * Calculate next occurrence for recurring reminders
 * @param {Object} reminder - Reminder document
 * @returns {Date|null} - Next occurrence date
 */
const calculateNextOccurrence = (reminder) => {
  if (!reminder.recurring?.enabled) return null;

  const { frequency, interval = 1, daysOfWeek, dayOfMonth, endDate, maxOccurrences, occurrencesCompleted = 0 } = reminder.recurring;
  const baseDate = reminder.recurring.nextOccurrence || reminder.reminderDateTime;
  let nextDate = new Date(baseDate);

  // Check if we've exceeded max occurrences
  if (maxOccurrences && occurrencesCompleted >= maxOccurrences) {
    return null;
  }

  // Check if we've passed the end date
  if (endDate && new Date(endDate) < new Date()) {
    return null;
  }

  switch (frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + interval);
      break;

    case 'weekly':
      if (daysOfWeek && daysOfWeek.length > 0) {
        // Find next matching day of week
        let found = false;
        for (let i = 1; i <= 7 && !found; i++) {
          const testDate = new Date(nextDate);
          testDate.setDate(testDate.getDate() + i);
          if (daysOfWeek.includes(testDate.getDay())) {
            nextDate = testDate;
            found = true;
          }
        }
      } else {
        nextDate.setDate(nextDate.getDate() + (7 * interval));
      }
      break;

    case 'biweekly':
      nextDate.setDate(nextDate.getDate() + 14);
      break;

    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + interval);
      if (dayOfMonth) {
        // Handle months with fewer days
        const targetDay = Math.min(dayOfMonth, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate());
        nextDate.setDate(targetDay);
      }
      break;

    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;

    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + interval);
      break;

    case 'custom':
      // For custom frequency, use interval as days
      nextDate.setDate(nextDate.getDate() + interval);
      break;

    default:
      return null;
  }

  // Don't return dates in the past
  if (nextDate <= new Date()) {
    // Recalculate from current time
    return calculateNextOccurrence({
      ...reminder,
      recurring: {
        ...reminder.recurring,
        nextOccurrence: new Date()
      }
    });
  }

  return nextDate;
};

/**
 * Send reminder via configured channels
 * @param {Object} reminder - Reminder document
 * @param {Object} user - User document
 */
const sendReminderNotifications = async (reminder, user) => {
  const channels = reminder.notification?.channels || ['in_app'];

  // Create in-app notification
  await createNotification({
    userId: reminder.userId,
    type: reminder.type || 'general',
    title: reminder.title,
    message: reminder.description || `تذكير: ${reminder.title}`,
    link: reminder.relatedCase ? `/cases/${reminder.relatedCase}` :
          reminder.relatedTask ? `/tasks` :
          '/reminders',
    data: {
      reminderId: reminder._id,
      caseId: reminder.relatedCase,
      taskId: reminder.relatedTask,
      eventId: reminder.relatedEvent,
      priority: reminder.priority
    },
    icon: getPriorityIcon(reminder.priority),
    priority: reminder.priority
  });

  // Send via other channels using delivery service
  if (channels.includes('email') && user.email) {
    await NotificationDeliveryService.sendReminderEmail(reminder, user);
  }

  // SMS and WhatsApp are stubbed but ready
  if (channels.includes('sms')) {
    await NotificationDeliveryService.send({
      userId: user._id,
      channels: ['sms'],
      title: reminder.title,
      message: reminder.description || reminder.title,
      data: { reminderId: reminder._id }
    });
  }

  if (channels.includes('whatsapp')) {
    await NotificationDeliveryService.send({
      userId: user._id,
      channels: ['whatsapp'],
      title: reminder.title,
      message: reminder.description || reminder.title,
      data: { reminderId: reminder._id }
    });
  }
};

/**
 * Get icon based on priority
 */
const getPriorityIcon = (priority) => {
  const icons = {
    low: '📝',
    medium: '⏰',
    high: '⚠️',
    critical: '🚨'
  };
  return icons[priority] || '🔔';
};

/**
 * Schedule all task reminders cron jobs
 */
const scheduleTaskReminders = () => {
  // =========================================
  // 1. Task reminders - daily at 9:00 AM Saudi time
  // =========================================
  cron.schedule('0 9 * * *', async () => {
    console.log('🔔 Running task reminders cron job...');

    try {
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);

      // Find tasks due within 24 hours
      const tasks = await Task.find({
        dueDate: {
          $gte: now,
          $lte: tomorrow
        },
        status: { $ne: 'done' }
      })
      .populate('assignedTo', 'username firstName lastName email')
      .populate('caseId', 'title');

      // Create notifications
      for (const task of tasks) {
        if (!task.assignedTo?._id) continue;

        await createNotification({
          userId: task.assignedTo._id,
          type: 'task',
          title: 'تذكير بمهمة',
          message: `مهمة "${task.title}" تنتهي خلال 24 ساعة`,
          link: `/tasks`,
          data: {
            taskId: task._id,
            caseId: task.caseId?._id
          },
          icon: '⏰',
          priority: 'high'
        });
      }

      console.log(`✅ Sent ${tasks.length} task reminders`);
    } catch (error) {
      console.error('❌ Error sending task reminders:', error);
    }
  }, cronOptions);

  // =========================================
  // 2. Hearing reminders - every hour Saudi time
  // =========================================
  cron.schedule('0 * * * *', async () => {
    console.log('🔔 Running hearing reminders cron job...');

    try {
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);

      // Find cases with upcoming hearings within 24 hours
      const casesWithHearings = await Case.find({
        'hearings.date': {
          $gte: now,
          $lte: tomorrow
        },
        'hearings.status': 'scheduled'
      }).populate('lawyerId', '_id firstName lastName email');

      let hearingCount = 0;
      for (const caseDoc of casesWithHearings) {
        if (!caseDoc.lawyerId?._id) continue;

        // Filter hearings that are within 24 hours
        const upcomingHearings = caseDoc.hearings.filter(h => {
          const hearingDate = new Date(h.date);
          return h.status === 'scheduled' && hearingDate >= now && hearingDate <= tomorrow;
        });

        for (const hearing of upcomingHearings) {
          await createNotification({
            userId: caseDoc.lawyerId._id,
            type: 'hearing',
            title: 'تذكير بجلسة قادمة',
            message: `جلسة في قضية "${caseDoc.title}" غداً في ${hearing.location || 'المحكمة'}`,
            link: `/cases/${caseDoc._id}`,
            data: {
              caseId: caseDoc._id,
              hearingId: hearing._id,
              hearingDate: hearing.date,
              location: hearing.location
            },
            icon: '⚖️',
            priority: 'urgent'
          });
          hearingCount++;
        }
      }

      console.log(`✅ Sent ${hearingCount} hearing reminders`);
    } catch (error) {
      console.error('❌ Error sending hearing reminders:', error);
    }
  }, cronOptions);

  // =========================================
  // 3. Reminder trigger - EVERY MINUTE
  // Checks for due reminders and sends notifications
  // =========================================
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const oneMinuteFromNow = new Date(now.getTime() + 60000);

      // Find reminders that are due in the next minute and haven't been sent
      const dueReminders = await Reminder.find({
        status: 'pending',
        reminderDateTime: { $lte: oneMinuteFromNow },
        'notification.sent': { $ne: true }
      })
      .populate('userId', 'firstName lastName email phone')
      .populate('relatedCase', 'title caseNumber')
      .populate('relatedTask', 'title')
      .limit(100); // Process in batches

      if (dueReminders.length === 0) return;

      console.log(`🔔 Processing ${dueReminders.length} due reminders...`);

      for (const reminder of dueReminders) {
        try {
          if (!reminder.userId) continue;

          // Send notifications
          await sendReminderNotifications(reminder, reminder.userId);

          // Mark as sent
          reminder.notification = reminder.notification || {};
          reminder.notification.sent = true;
          reminder.notification.sentAt = new Date();
          await reminder.save();

        } catch (err) {
          console.error(`Failed to process reminder ${reminder._id}:`, err.message);

          // Track failed attempt
          reminder.notification = reminder.notification || {};
          reminder.notification.failedAttempts = (reminder.notification.failedAttempts || 0) + 1;
          reminder.notification.lastAttemptAt = new Date();
          await reminder.save();
        }
      }

      console.log(`✅ Processed ${dueReminders.length} reminders`);
    } catch (error) {
      console.error('❌ Error in reminder trigger:', error);
    }
  }, cronOptions);

  // =========================================
  // 4. Advance notification trigger - EVERY MINUTE
  // Checks for advance notifications (e.g., 15 min before, 1 hour before)
  // =========================================
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      // Find reminders with pending advance notifications
      const reminders = await Reminder.find({
        status: 'pending',
        'notification.advanceNotifications': {
          $elemMatch: {
            sent: { $ne: true }
          }
        }
      })
      .populate('userId', 'firstName lastName email phone')
      .limit(50);

      if (reminders.length === 0) return;

      let sentCount = 0;
      for (const reminder of reminders) {
        const reminderTime = new Date(reminder.reminderDateTime).getTime();

        for (const advNotif of reminder.notification.advanceNotifications) {
          if (advNotif.sent) continue;

          const triggerTime = reminderTime - (advNotif.beforeMinutes * 60 * 1000);

          if (now.getTime() >= triggerTime) {
            // Time to send this advance notification
            const minutesLabel = advNotif.beforeMinutes >= 60
              ? `${Math.floor(advNotif.beforeMinutes / 60)} ساعة`
              : `${advNotif.beforeMinutes} دقيقة`;

            await createNotification({
              userId: reminder.userId._id,
              type: reminder.type || 'general',
              title: `تذكير قادم خلال ${minutesLabel}`,
              message: reminder.title,
              link: '/reminders',
              data: { reminderId: reminder._id },
              icon: '⏳',
              priority: 'medium'
            });

            // Mark as sent
            advNotif.sent = true;
            advNotif.sentAt = new Date();
            sentCount++;
          }
        }

        await reminder.save();
      }

      if (sentCount > 0) {
        console.log(`✅ Sent ${sentCount} advance notifications`);
      }
    } catch (error) {
      console.error('❌ Error in advance notification trigger:', error);
    }
  }, cronOptions);

  // =========================================
  // 5. Recurring item generator - DAILY at midnight Saudi time
  // Generates next instances of recurring reminders
  // =========================================
  cron.schedule('0 0 * * *', async () => {
    console.log('🔄 Running recurring item generator...');

    try {
      // Find recurring reminders that need new instances
      const recurringReminders = await Reminder.find({
        'recurring.enabled': true,
        status: { $in: ['completed', 'dismissed'] }, // Parent reminder was handled
        'recurring.nextOccurrence': { $lte: new Date() }
      });

      let generatedCount = 0;
      for (const parent of recurringReminders) {
        const nextDate = calculateNextOccurrence(parent);

        if (!nextDate) {
          // No more occurrences, disable recurring
          parent.recurring.enabled = false;
          await parent.save();
          continue;
        }

        // Create new reminder instance
        const newReminder = new Reminder({
          title: parent.title,
          description: parent.description,
          userId: parent.userId,
          reminderDateTime: nextDate,
          priority: parent.priority,
          type: parent.type,
          status: 'pending',
          notification: {
            channels: parent.notification?.channels || ['in_app'],
            advanceNotifications: parent.notification?.advanceNotifications?.map(n => ({
              beforeMinutes: n.beforeMinutes,
              channels: n.channels,
              sent: false
            })) || [],
            escalation: parent.notification?.escalation,
            sent: false
          },
          relatedCase: parent.relatedCase,
          relatedTask: parent.relatedTask,
          relatedEvent: parent.relatedEvent,
          clientId: parent.clientId,
          recurring: {
            enabled: true,
            frequency: parent.recurring.frequency,
            interval: parent.recurring.interval,
            daysOfWeek: parent.recurring.daysOfWeek,
            dayOfMonth: parent.recurring.dayOfMonth,
            endDate: parent.recurring.endDate,
            maxOccurrences: parent.recurring.maxOccurrences,
            occurrencesCompleted: (parent.recurring.occurrencesCompleted || 0) + 1,
            parentReminderId: parent._id
          },
          tags: parent.tags,
          createdBy: parent.createdBy
        });

        await newReminder.save();

        // Update parent with next occurrence
        parent.recurring.nextOccurrence = calculateNextOccurrence(newReminder);
        parent.recurring.occurrencesCompleted = (parent.recurring.occurrencesCompleted || 0) + 1;
        await parent.save();

        generatedCount++;
      }

      console.log(`✅ Generated ${generatedCount} recurring reminders`);
    } catch (error) {
      console.error('❌ Error in recurring generator:', error);
    }
  }, cronOptions);

  // =========================================
  // 6. Escalation checker - EVERY 5 MINUTES
  // Checks for unacknowledged reminders that need escalation
  // =========================================
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();

      // Find reminders that:
      // - Have escalation enabled
      // - Haven't been escalated yet
      // - Are past their escalation time
      const remindersToEscalate = await Reminder.find({
        status: 'pending',
        'notification.sent': true,
        'notification.escalation.enabled': true,
        'notification.escalation.escalated': { $ne: true },
        'notification.escalation.escalateTo': { $exists: true }
      })
      .populate('notification.escalation.escalateTo', 'firstName lastName email')
      .populate('userId', 'firstName lastName');

      let escalatedCount = 0;
      for (const reminder of remindersToEscalate) {
        const sentAt = reminder.notification.sentAt;
        const escalateAfter = reminder.notification.escalation.escalateAfterMinutes || 30;
        const escalateTime = new Date(sentAt.getTime() + escalateAfter * 60 * 1000);

        if (now >= escalateTime) {
          const escalateTo = reminder.notification.escalation.escalateTo;

          // Create escalation notification
          await createNotification({
            userId: escalateTo._id,
            type: reminder.type || 'general',
            title: 'تصعيد: تذكير غير معالج',
            message: `تذكير "${reminder.title}" من ${reminder.userId?.firstName || 'مستخدم'} يحتاج انتباهكم`,
            link: '/reminders',
            data: {
              reminderId: reminder._id,
              escalatedFrom: reminder.userId?._id,
              originalReminderDate: reminder.reminderDateTime
            },
            icon: '🚨',
            priority: 'urgent'
          });

          // Mark as escalated
          reminder.notification.escalation.escalated = true;
          reminder.notification.escalation.escalatedAt = new Date();
          await reminder.save();

          escalatedCount++;
        }
      }

      if (escalatedCount > 0) {
        console.log(`🚨 Escalated ${escalatedCount} reminders`);
      }
    } catch (error) {
      console.error('❌ Error in escalation checker:', error);
    }
  }, cronOptions);

  // =========================================
  // 7. Snoozed reminder checker - EVERY MINUTE
  // Reactivates snoozed reminders when snooze time expires
  // =========================================
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      // Find snoozed reminders where snooze time has passed
      const expiredSnoozes = await Reminder.find({
        status: 'snoozed',
        'snooze.snoozeUntil': { $lte: now }
      })
      .populate('userId', 'firstName lastName email')
      .limit(50);

      if (expiredSnoozes.length === 0) return;

      for (const reminder of expiredSnoozes) {
        // Check if max snooze count reached
        if (reminder.snooze.snoozeCount >= (reminder.snooze.maxSnoozeCount || 5)) {
          // Force to pending, no more snoozes
          reminder.status = 'pending';
          reminder.notification = reminder.notification || {};
          reminder.notification.sent = false; // Reset to resend
          await reminder.save();

          // Send urgent notification
          await createNotification({
            userId: reminder.userId._id,
            type: reminder.type || 'general',
            title: 'تذكير عاجل - تم تجاوز حد التأجيل',
            message: `"${reminder.title}" - لا يمكن تأجيله أكثر`,
            link: '/reminders',
            data: { reminderId: reminder._id },
            icon: '🚨',
            priority: 'urgent'
          });
        } else {
          // Reactivate reminder
          reminder.status = 'pending';
          reminder.notification = reminder.notification || {};
          reminder.notification.sent = false;
          await reminder.save();

          // Send notification that snooze ended
          await createNotification({
            userId: reminder.userId._id,
            type: reminder.type || 'general',
            title: 'انتهى وقت التأجيل',
            message: `تذكير "${reminder.title}" يحتاج انتباهك الآن`,
            link: '/reminders',
            data: { reminderId: reminder._id },
            icon: '⏰',
            priority: reminder.priority || 'medium'
          });
        }
      }

      if (expiredSnoozes.length > 0) {
        console.log(`✅ Reactivated ${expiredSnoozes.length} snoozed reminders`);
      }
    } catch (error) {
      console.error('❌ Error in snoozed reminder checker:', error);
    }
  }, cronOptions);

  // =========================================
  // 8. Event reminders - EVERY HOUR Saudi time
  // Sends reminders for upcoming events based on event.reminders array
  // =========================================
  cron.schedule('0 * * * *', async () => {
    console.log('📅 Running event reminders cron job...');

    try {
      const now = new Date();
      const twentyFourHours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Find events in next 24 hours with pending reminders
      const upcomingEvents = await Event.find({
        startDateTime: { $gte: now, $lte: twentyFourHours },
        status: { $in: ['scheduled', 'confirmed'] },
        'reminders': {
          $elemMatch: {
            sent: { $ne: true }
          }
        }
      })
      .populate('organizer', 'firstName lastName email')
      .populate('caseId', 'title caseNumber');

      let reminderCount = 0;
      for (const event of upcomingEvents) {
        if (!event.organizer?._id) continue;

        // Check each reminder
        for (const reminder of event.reminders) {
          if (reminder.sent) continue;

          const eventTime = new Date(event.startDateTime).getTime();
          const triggerTime = eventTime - (reminder.beforeMinutes * 60 * 1000);

          if (now.getTime() >= triggerTime) {
            const minutesLabel = reminder.beforeMinutes >= 60
              ? `${Math.floor(reminder.beforeMinutes / 60)} ساعة`
              : `${reminder.beforeMinutes} دقيقة`;

            await createNotification({
              userId: event.organizer._id,
              type: 'event',
              title: `تذكير: ${event.title}`,
              message: `موعدك خلال ${minutesLabel}${event.caseId ? ` - قضية ${event.caseId.title}` : ''}`,
              link: `/calendar`,
              data: {
                eventId: event._id,
                eventDate: event.startDateTime,
                caseId: event.caseId?._id
              },
              icon: '📅',
              priority: event.priority || 'medium'
            });

            // Also notify attendees
            if (event.attendees && event.attendees.length > 0) {
              for (const attendee of event.attendees) {
                if (attendee.userId && attendee.status !== 'declined') {
                  await createNotification({
                    userId: attendee.userId,
                    type: 'event',
                    title: `تذكير: ${event.title}`,
                    message: `موعدك خلال ${minutesLabel}`,
                    link: `/calendar`,
                    data: {
                      eventId: event._id,
                      eventDate: event.startDateTime
                    },
                    icon: '📅',
                    priority: event.priority || 'medium'
                  });
                }
              }
            }

            reminder.sent = true;
            reminder.sentAt = new Date();
            reminderCount++;
          }
        }

        await event.save();
      }

      if (reminderCount > 0) {
        console.log(`✅ Sent ${reminderCount} event reminders`);
      }
    } catch (error) {
      console.error('❌ Error sending event reminders:', error);
    }
  }, cronOptions);

  // =========================================
  // 9. Overdue task checker - DAILY at 10 AM Saudi time
  // =========================================
  cron.schedule('0 10 * * *', async () => {
    console.log('⚠️ Running overdue task checker...');

    try {
      const now = new Date();

      // Find overdue tasks
      const overdueTasks = await Task.find({
        dueDate: { $lt: now },
        status: { $nin: ['done', 'cancelled'] }
      })
      .populate('assignedTo', '_id firstName lastName')
      .populate('caseId', 'title');

      for (const task of overdueTasks) {
        if (!task.assignedTo?._id) continue;

        await createNotification({
          userId: task.assignedTo._id,
          type: 'task',
          title: 'مهمة متأخرة',
          message: `المهمة "${task.title}" تجاوزت موعدها النهائي`,
          link: `/tasks`,
          data: {
            taskId: task._id,
            caseId: task.caseId?._id,
            dueDate: task.dueDate
          },
          icon: '⚠️',
          priority: 'urgent'
        });
      }

      console.log(`✅ Found ${overdueTasks.length} overdue tasks`);
    } catch (error) {
      console.error('❌ Error in overdue task checker:', error);
    }
  }, cronOptions);

  console.log(`✅ All cron jobs scheduled with timezone: ${DEFAULT_TIMEZONE}`);
  console.log('✅ Task reminders cron job scheduled (daily at 9:00 AM Saudi time)');
  console.log('✅ Hearing reminders cron job scheduled (every hour)');
  console.log('✅ Reminder trigger cron job scheduled (every minute)');
  console.log('✅ Advance notification trigger scheduled (every minute)');
  console.log('✅ Recurring item generator scheduled (daily at midnight Saudi time)');
  console.log('✅ Escalation checker scheduled (every 5 minutes)');
  console.log('✅ Snoozed reminder checker scheduled (every minute)');
  console.log('✅ Event reminders scheduled (every hour)');
  console.log('✅ Overdue task checker scheduled (daily at 10 AM Saudi time)');
};

module.exports = {
  scheduleTaskReminders,
  calculateNextOccurrence
};
