const cron = require('node-cron');
const mongoose = require('mongoose');
const { Task, Case, Reminder, Event, User } = require('../models');
const { createNotification } = require('../controllers/notification.controller');
const notificationService = require('../services/notificationDelivery.service');

/**
 * TRAF3LI Reminder & Notification System
 *
 * Cron Jobs:
 * 1. Task Reminders - Daily at 9:00 AM (existing)
 * 2. Hearing Reminders - Every hour (existing)
 * 3. Reminder Trigger - Every minute (NEW)
 * 4. Snoozed Reminder Checker - Every minute (NEW)
 * 5. Recurring Item Generator - Daily at midnight (NEW)
 * 6. Escalation Checker - Every 5 minutes (NEW)
 * 7. Event Reminders - Every 5 minutes (NEW)
 */

// ============================================
// EXISTING CRON JOBS
// ============================================

// Run every day at 9:00 AM for task reminders
const scheduleTaskReminders = () => {
    // Task reminders - daily at 9:00 AM
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
            .populate('assignedTo', 'username')
            .populate('caseId', 'title');

            // Create notifications
            for (const task of tasks) {
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
    });

    // Hearing reminders - every hour
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
            }).populate('lawyerId', '_id firstName lastName');

            let hearingCount = 0;
            for (const caseDoc of casesWithHearings) {
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
    });

    console.log('✅ Task reminders cron job scheduled (daily at 9:00 AM)');
    console.log('✅ Hearing reminders cron job scheduled (every hour)');
};

// ============================================
// NEW CRON JOBS
// ============================================

/**
 * Reminder Trigger - Runs every minute
 * Checks for reminders that are due NOW and triggers notifications
 */
const scheduleReminderTrigger = () => {
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            const windowStart = new Date(now.getTime() - 30000); // 30 seconds before
            const windowEnd = new Date(now.getTime() + 30000);   // 30 seconds after

            // Find reminders due now that haven't been sent
            const dueReminders = await Reminder.find({
                status: 'pending',
                'notification.sent': { $ne: true },
                reminderDateTime: {
                    $gte: windowStart,
                    $lte: windowEnd
                }
            }).populate('userId', 'firstName lastName email phone pushSubscription');

            if (dueReminders.length === 0) return;

            console.log(`🔔 Found ${dueReminders.length} reminders due now`);

            for (const reminder of dueReminders) {
                try {
                    // Get notification channels (default to in_app if not specified)
                    const channels = reminder.notification?.channels?.length > 0
                        ? reminder.notification.channels
                        : ['in_app'];

                    // Send through all configured channels
                    const results = await notificationService.send(reminder, channels, reminder.userId);

                    // Check if at least in_app succeeded
                    const inAppSuccess = results.some(r => r.channel === 'in_app' && r.success);

                    // Mark as sent
                    await Reminder.findByIdAndUpdate(reminder._id, {
                        'notification.sent': true,
                        'notification.sentAt': new Date(),
                        'notification.lastAttemptAt': new Date()
                    });

                    console.log(`✅ Triggered reminder: ${reminder.title}`);
                } catch (error) {
                    // Log failure but don't stop processing other reminders
                    await Reminder.findByIdAndUpdate(reminder._id, {
                        $inc: { 'notification.failedAttempts': 1 },
                        'notification.lastAttemptAt': new Date()
                    });
                    console.error(`❌ Failed to trigger reminder ${reminder._id}:`, error.message);
                }
            }
        } catch (error) {
            console.error('❌ Error in reminder trigger cron:', error);
        }
    });

    console.log('✅ Reminder trigger cron job scheduled (every minute)');
};

/**
 * Snoozed Reminder Checker - Runs every minute
 * Checks for snoozed reminders that are now due
 */
const scheduleSnoozedReminderChecker = () => {
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();

            // Find snoozed reminders that are now due
            const snoozedDue = await Reminder.find({
                status: 'snoozed',
                'snooze.snoozeUntil': { $lte: now }
            }).populate('userId', 'firstName lastName email phone');

            if (snoozedDue.length === 0) return;

            console.log(`🔔 Found ${snoozedDue.length} snoozed reminders now due`);

            for (const reminder of snoozedDue) {
                try {
                    // Update status back to pending and reset notification sent flag
                    await Reminder.findByIdAndUpdate(reminder._id, {
                        status: 'pending',
                        'notification.sent': false,
                        reminderDateTime: new Date() // Set to now so it triggers immediately
                    });

                    // Send notification that snooze period ended
                    await createNotification({
                        userId: reminder.userId._id,
                        type: 'reminder',
                        title: 'انتهى وقت التأجيل',
                        message: `التذكير "${reminder.title}" جاهز الآن`,
                        link: `/dashboard/tasks/reminders/${reminder._id}`,
                        icon: '⏰',
                        priority: reminder.priority === 'critical' ? 'urgent' : 'high'
                    });

                    console.log(`✅ Reactivated snoozed reminder: ${reminder.title}`);
                } catch (error) {
                    console.error(`❌ Failed to reactivate snoozed reminder ${reminder._id}:`, error.message);
                }
            }
        } catch (error) {
            console.error('❌ Error in snoozed reminder checker cron:', error);
        }
    });

    console.log('✅ Snoozed reminder checker cron job scheduled (every minute)');
};

/**
 * Recurring Item Generator - Runs daily at midnight
 * Generates next instances of recurring reminders and events
 */
const scheduleRecurringGenerator = () => {
    cron.schedule('0 0 * * *', async () => {
        console.log('🔄 Running recurring item generator...');

        try {
            // Process recurring reminders
            const recurringReminders = await Reminder.find({
                'recurring.enabled': true,
                status: { $in: ['pending', 'completed'] }
            });

            let generatedCount = 0;

            for (const reminder of recurringReminders) {
                try {
                    const nextDate = calculateNextOccurrence(reminder);

                    if (nextDate && shouldCreateInstance(reminder, nextDate)) {
                        await createReminderInstance(reminder, nextDate);
                        generatedCount++;
                    }
                } catch (error) {
                    console.error(`❌ Error generating recurring reminder ${reminder._id}:`, error.message);
                }
            }

            // Process recurring events
            const recurringEvents = await Event.find({
                'recurring.enabled': true,
                status: 'scheduled'
            });

            let eventCount = 0;

            for (const event of recurringEvents) {
                try {
                    const nextDate = calculateNextOccurrence(event);

                    if (nextDate && shouldCreateEventInstance(event, nextDate)) {
                        await createEventInstance(event, nextDate);
                        eventCount++;
                    }
                } catch (error) {
                    console.error(`❌ Error generating recurring event ${event._id}:`, error.message);
                }
            }

            console.log(`✅ Generated ${generatedCount} recurring reminders and ${eventCount} recurring events`);
        } catch (error) {
            console.error('❌ Error in recurring generator cron:', error);
        }
    });

    console.log('✅ Recurring item generator cron job scheduled (daily at midnight)');
};

/**
 * Escalation Checker - Runs every 5 minutes
 * Checks for overdue reminders that need escalation
 */
const scheduleEscalationChecker = () => {
    cron.schedule('*/5 * * * *', async () => {
        try {
            const now = new Date();

            // Find reminders that need escalation
            const remindersToEscalate = await Reminder.find({
                status: 'pending',
                'notification.escalation.enabled': true,
                'notification.escalation.escalated': { $ne: true },
                'notification.escalation.escalateTo': { $exists: true, $ne: null },
                reminderDateTime: { $lt: now } // Is overdue
            })
            .populate('userId', 'firstName lastName email')
            .populate('notification.escalation.escalateTo', 'firstName lastName email');

            if (remindersToEscalate.length === 0) return;

            for (const reminder of remindersToEscalate) {
                try {
                    const overdueMinutes = (now - new Date(reminder.reminderDateTime)) / 60000;
                    const escalateAfter = reminder.notification.escalation.escalateAfterMinutes || 30;

                    if (overdueMinutes >= escalateAfter) {
                        const escalateTo = reminder.notification.escalation.escalateTo;

                        if (escalateTo) {
                            // Send escalation notification
                            await notificationService.sendEscalation(reminder, escalateTo, reminder.userId);

                            // Mark as escalated
                            await Reminder.findByIdAndUpdate(reminder._id, {
                                'notification.escalation.escalated': true,
                                'notification.escalation.escalatedAt': new Date()
                            });

                            console.log(`⬆️ Escalated reminder "${reminder.title}" to ${escalateTo.firstName || escalateTo.email}`);
                        }
                    }
                } catch (error) {
                    console.error(`❌ Failed to escalate reminder ${reminder._id}:`, error.message);
                }
            }
        } catch (error) {
            console.error('❌ Error in escalation checker cron:', error);
        }
    });

    console.log('✅ Escalation checker cron job scheduled (every 5 minutes)');
};

/**
 * Event Reminder Checker - Runs every 5 minutes
 * Sends advance notifications for upcoming events
 */
const scheduleEventReminders = () => {
    cron.schedule('*/5 * * * *', async () => {
        try {
            const now = new Date();
            const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

            // Find events with reminders in the next 24 hours
            const upcomingEvents = await Event.find({
                status: 'scheduled',
                startDateTime: {
                    $gte: now,
                    $lte: next24Hours
                },
                'reminders.0': { $exists: true } // Has at least one reminder
            }).populate('userId', 'firstName lastName email');

            for (const event of upcomingEvents) {
                for (const reminder of event.reminders || []) {
                    // Check if this reminder should fire now
                    const triggerTime = new Date(event.startDateTime.getTime() - (reminder.beforeMinutes || 0) * 60000);
                    const timeDiff = Math.abs(triggerTime.getTime() - now.getTime());

                    // Trigger if within 5-minute window (cron runs every 5 min)
                    if (timeDiff <= 5 * 60 * 1000 && !reminder.sent) {
                        await createNotification({
                            userId: event.userId._id,
                            type: 'event',
                            title: 'تذكير بحدث قادم',
                            message: `الحدث "${event.title}" سيبدأ خلال ${reminder.beforeMinutes} دقيقة`,
                            link: `/dashboard/tasks/events/${event._id}`,
                            icon: '📅',
                            priority: 'high'
                        });

                        // Mark this reminder as sent
                        await Event.updateOne(
                            { _id: event._id, 'reminders._id': reminder._id },
                            { $set: { 'reminders.$.sent': true } }
                        );

                        console.log(`✅ Sent event reminder for: ${event.title}`);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error in event reminder cron:', error);
        }
    });

    console.log('✅ Event reminder cron job scheduled (every 5 minutes)');
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate the next occurrence date for a recurring item
 */
function calculateNextOccurrence(item) {
    const recurring = item.recurring;
    if (!recurring || !recurring.enabled) return null;

    const lastDate = item.reminderDateTime || item.startDateTime || new Date();
    const { frequency, interval = 1, endDate, daysOfWeek } = recurring;

    // Check if end date has passed
    if (endDate && new Date() > new Date(endDate)) return null;

    // Check max occurrences
    if (recurring.maxOccurrences && recurring.occurrencesCompleted >= recurring.maxOccurrences) {
        return null;
    }

    let nextDate = new Date(lastDate);

    switch (frequency) {
        case 'daily':
            nextDate.setDate(nextDate.getDate() + interval);
            break;
        case 'weekly':
            nextDate.setDate(nextDate.getDate() + (7 * interval));
            break;
        case 'biweekly':
            nextDate.setDate(nextDate.getDate() + 14);
            break;
        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + interval);
            break;
        case 'quarterly':
            nextDate.setMonth(nextDate.getMonth() + 3);
            break;
        case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + interval);
            break;
        case 'custom':
            nextDate.setDate(nextDate.getDate() + interval);
            break;
        default:
            return null;
    }

    // Skip weekends if configured
    if (recurring.skipWeekends) {
        while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
            nextDate.setDate(nextDate.getDate() + 1);
        }
    }

    // Check against excluded dates
    if (recurring.excludedDates && recurring.excludedDates.length > 0) {
        const excludedDateStrings = recurring.excludedDates.map(d => new Date(d).toDateString());
        while (excludedDateStrings.includes(nextDate.toDateString())) {
            nextDate.setDate(nextDate.getDate() + 1);
        }
    }

    return nextDate;
}

/**
 * Check if we should create a new instance for this date
 */
function shouldCreateInstance(reminder, nextDate) {
    const now = new Date();
    const daysAhead = 7; // Create instances up to 7 days ahead

    const futureLimit = new Date();
    futureLimit.setDate(futureLimit.getDate() + daysAhead);

    // Only create if next date is within our window
    return nextDate > now && nextDate <= futureLimit;
}

/**
 * Check if we should create a new event instance
 */
function shouldCreateEventInstance(event, nextDate) {
    return shouldCreateInstance(event, nextDate);
}

/**
 * Create a new reminder instance from a recurring template
 */
async function createReminderInstance(templateReminder, nextDate) {
    const newReminder = new Reminder({
        title: templateReminder.title,
        description: templateReminder.description,
        userId: templateReminder.userId,
        reminderDateTime: nextDate,
        reminderDate: nextDate,
        reminderTime: nextDate.toTimeString().substring(0, 5),
        priority: templateReminder.priority,
        type: templateReminder.type,
        status: 'pending',
        notification: {
            channels: templateReminder.notification?.channels || ['in_app'],
            advanceNotifications: templateReminder.notification?.advanceNotifications || [],
            escalation: templateReminder.notification?.escalation || { enabled: false },
            sent: false
        },
        relatedCase: templateReminder.relatedCase,
        relatedTask: templateReminder.relatedTask,
        recurring: {
            enabled: false, // Instance is not recurring itself
            parentReminderId: templateReminder._id
        },
        tags: templateReminder.tags,
        createdBy: templateReminder.createdBy
    });

    await newReminder.save();

    // Update parent's occurrence count and next occurrence
    await Reminder.findByIdAndUpdate(templateReminder._id, {
        $inc: { 'recurring.occurrencesCompleted': 1 },
        'recurring.nextOccurrence': calculateNextOccurrence({
            ...templateReminder.toObject(),
            reminderDateTime: nextDate
        })
    });

    console.log(`📅 Created recurring reminder instance: ${newReminder.title} for ${nextDate.toLocaleDateString()}`);
    return newReminder;
}

/**
 * Create a new event instance from a recurring template
 */
async function createEventInstance(templateEvent, nextDate) {
    // Calculate duration
    const duration = templateEvent.endDateTime
        ? templateEvent.endDateTime - templateEvent.startDateTime
        : 60 * 60 * 1000; // Default 1 hour

    const newEvent = new Event({
        title: templateEvent.title,
        description: templateEvent.description,
        type: templateEvent.type,
        userId: templateEvent.userId,
        startDateTime: nextDate,
        endDateTime: new Date(nextDate.getTime() + duration),
        allDay: templateEvent.allDay,
        status: 'scheduled',
        priority: templateEvent.priority,
        color: templateEvent.color,
        location: templateEvent.location,
        attendees: templateEvent.attendees,
        reminders: (templateEvent.reminders || []).map(r => ({
            ...r.toObject ? r.toObject() : r,
            sent: false
        })),
        recurring: {
            enabled: false,
            parentEventId: templateEvent._id
        },
        caseId: templateEvent.caseId,
        clientId: templateEvent.clientId,
        billable: templateEvent.billable,
        billingRate: templateEvent.billingRate
    });

    await newEvent.save();

    // Update parent's next occurrence
    await Event.findByIdAndUpdate(templateEvent._id, {
        'recurring.nextOccurrence': calculateNextOccurrence({
            ...templateEvent.toObject(),
            startDateTime: nextDate
        })
    });

    console.log(`📅 Created recurring event instance: ${newEvent.title} for ${nextDate.toLocaleDateString()}`);
    return newEvent;
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize all reminder-related cron jobs
 */
const initializeAllReminders = () => {
    console.log('🚀 Initializing TRAF3LI Reminder System...');

    // Existing jobs
    scheduleTaskReminders();

    // New jobs
    scheduleReminderTrigger();
    scheduleSnoozedReminderChecker();
    scheduleRecurringGenerator();
    scheduleEscalationChecker();
    scheduleEventReminders();

    console.log('✅ All reminder cron jobs initialized successfully');
};

module.exports = {
    scheduleTaskReminders,
    scheduleReminderTrigger,
    scheduleSnoozedReminderChecker,
    scheduleRecurringGenerator,
    scheduleEscalationChecker,
    scheduleEventReminders,
    initializeAllReminders
};
