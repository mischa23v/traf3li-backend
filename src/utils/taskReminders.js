const cron = require('node-cron');
const { Task } = require('../models');
const { createNotification } = require('../controllers/notification.controller');

// Run every day at 9:00 AM
const scheduleTaskReminders = () => {
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

    console.log('✅ Task reminders cron job scheduled (daily at 9:00 AM)');
};

module.exports = { scheduleTaskReminders };
