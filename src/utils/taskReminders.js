const cron = require('node-cron');
const { Task, Case } = require('../models');
const { createNotification } = require('../controllers/notification.controller');

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

module.exports = { scheduleTaskReminders };
