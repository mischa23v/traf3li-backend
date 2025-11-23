const { Reminder, Case, Task, Event } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Create reminder
 * POST /api/reminders
 */
const createReminder = asyncHandler(async (req, res) => {
    const {
        title,
        description,
        reminderDate,
        reminderTime,
        priority = 'medium',
        type = 'general',
        relatedCase,
        relatedTask,
        relatedEvent,
        recurring,
        notes
    } = req.body;

    const userId = req.userID;

    // Validate required fields
    if (!title || !reminderDate || !reminderTime) {
        throw new CustomException('الحقول المطلوبة: العنوان، تاريخ التذكير، وقت التذكير', 400);
    }

    // Validate related entities
    if (relatedCase) {
        const caseDoc = await Case.findById(relatedCase);
        if (!caseDoc) {
            throw new CustomException('القضية غير موجودة', 404);
        }
    }

    if (relatedTask) {
        const task = await Task.findById(relatedTask);
        if (!task) {
            throw new CustomException('المهمة غير موجودة', 404);
        }
    }

    if (relatedEvent) {
        const event = await Event.findById(relatedEvent);
        if (!event) {
            throw new CustomException('الحدث غير موجود', 404);
        }
    }

    const reminder = await Reminder.create({
        title,
        description,
        userId,
        reminderDate: new Date(reminderDate),
        reminderTime,
        priority,
        type,
        relatedCase,
        relatedTask,
        relatedEvent,
        recurring,
        notes,
        status: 'pending'
    });

    await reminder.populate([
        { path: 'relatedCase', select: 'title caseNumber' },
        { path: 'relatedTask', select: 'title dueDate' },
        { path: 'relatedEvent', select: 'title startDate' }
    ]);

    res.status(201).json({
        success: true,
        message: 'تم إنشاء التذكير بنجاح',
        reminder
    });
});

/**
 * Get reminders with filters
 * GET /api/reminders
 */
const getReminders = asyncHandler(async (req, res) => {
    const {
        status,
        priority,
        type,
        relatedCase,
        startDate,
        endDate,
        page = 1,
        limit = 50
    } = req.query;

    const userId = req.userID;
    const query = { userId };

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (type) query.type = type;
    if (relatedCase) query.relatedCase = relatedCase;

    if (startDate || endDate) {
        query.reminderDate = {};
        if (startDate) query.reminderDate.$gte = new Date(startDate);
        if (endDate) query.reminderDate.$lte = new Date(endDate);
    }

    const reminders = await Reminder.find(query)
        .populate('relatedCase', 'title caseNumber')
        .populate('relatedTask', 'title dueDate')
        .populate('relatedEvent', 'title startDate')
        .sort({ reminderDate: 1, reminderTime: 1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Reminder.countDocuments(query);

    res.status(200).json({
        success: true,
        data: reminders,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single reminder
 * GET /api/reminders/:id
 */
const getReminder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    const reminder = await Reminder.findById(id)
        .populate('relatedCase', 'title caseNumber category')
        .populate('relatedTask', 'title dueDate status')
        .populate('relatedEvent', 'title startDate location');

    if (!reminder) {
        throw new CustomException('التذكير غير موجود', 404);
    }

    if (reminder.userId.toString() !== userId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا التذكير', 403);
    }

    res.status(200).json({
        success: true,
        data: reminder
    });
});

/**
 * Update reminder
 * PUT /api/reminders/:id
 */
const updateReminder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    const reminder = await Reminder.findById(id);

    if (!reminder) {
        throw new CustomException('التذكير غير موجود', 404);
    }

    if (reminder.userId.toString() !== userId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا التذكير', 403);
    }

    const allowedFields = [
        'title',
        'description',
        'reminderDate',
        'reminderTime',
        'priority',
        'type',
        'relatedCase',
        'relatedTask',
        'relatedEvent',
        'recurring',
        'notes'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            reminder[field] = req.body[field];
        }
    });

    await reminder.save();

    await reminder.populate([
        { path: 'relatedCase', select: 'title caseNumber' },
        { path: 'relatedTask', select: 'title dueDate' },
        { path: 'relatedEvent', select: 'title startDate' }
    ]);

    res.status(200).json({
        success: true,
        message: 'تم تحديث التذكير بنجاح',
        reminder
    });
});

/**
 * Delete reminder
 * DELETE /api/reminders/:id
 */
const deleteReminder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    const reminder = await Reminder.findById(id);

    if (!reminder) {
        throw new CustomException('التذكير غير موجود', 404);
    }

    if (reminder.userId.toString() !== userId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا التذكير', 403);
    }

    await Reminder.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: 'تم حذف التذكير بنجاح'
    });
});

/**
 * Mark reminder as completed
 * POST /api/reminders/:id/complete
 */
const completeReminder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    const reminder = await Reminder.findById(id);

    if (!reminder) {
        throw new CustomException('التذكير غير موجود', 404);
    }

    if (reminder.userId.toString() !== userId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا التذكير', 403);
    }

    reminder.status = 'completed';
    reminder.completedAt = new Date();
    await reminder.save();

    // Handle recurring reminders
    if (reminder.recurring && reminder.recurring.enabled) {
        const nextDate = calculateNextReminderDate(
            reminder.reminderDate,
            reminder.recurring.frequency
        );

        if (!reminder.recurring.endDate || nextDate <= new Date(reminder.recurring.endDate)) {
            await Reminder.create({
                title: reminder.title,
                description: reminder.description,
                userId: reminder.userId,
                reminderDate: nextDate,
                reminderTime: reminder.reminderTime,
                priority: reminder.priority,
                type: reminder.type,
                relatedCase: reminder.relatedCase,
                relatedTask: reminder.relatedTask,
                relatedEvent: reminder.relatedEvent,
                recurring: reminder.recurring,
                notes: reminder.notes,
                status: 'pending'
            });

            return res.status(200).json({
                success: true,
                message: 'تم إكمال التذكير وإنشاء التكرار التالي',
                reminder
            });
        }
    }

    res.status(200).json({
        success: true,
        message: 'تم إكمال التذكير بنجاح',
        reminder
    });
});

/**
 * Dismiss reminder
 * POST /api/reminders/:id/dismiss
 */
const dismissReminder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    const reminder = await Reminder.findById(id);

    if (!reminder) {
        throw new CustomException('التذكير غير موجود', 404);
    }

    if (reminder.userId.toString() !== userId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا التذكير', 403);
    }

    reminder.status = 'dismissed';
    await reminder.save();

    res.status(200).json({
        success: true,
        message: 'تم تجاهل التذكير',
        reminder
    });
});

/**
 * Get upcoming reminders
 * GET /api/reminders/upcoming
 */
const getUpcomingReminders = asyncHandler(async (req, res) => {
    const { days = 7 } = req.query;
    const userId = req.userID;

    const reminders = await Reminder.getUpcoming(userId, parseInt(days));

    res.status(200).json({
        success: true,
        data: reminders,
        count: reminders.length
    });
});

/**
 * Get overdue reminders
 * GET /api/reminders/overdue
 */
const getOverdueReminders = asyncHandler(async (req, res) => {
    const userId = req.userID;

    const reminders = await Reminder.getOverdue(userId);

    res.status(200).json({
        success: true,
        data: reminders,
        count: reminders.length
    });
});

/**
 * Bulk delete reminders
 * DELETE /api/reminders/bulk
 */
const bulkDeleteReminders = asyncHandler(async (req, res) => {
    const { reminderIds } = req.body;
    const userId = req.userID;

    if (!reminderIds || !Array.isArray(reminderIds) || reminderIds.length === 0) {
        throw new CustomException('معرفات التذكيرات مطلوبة', 400);
    }

    // Verify all reminders belong to user
    const reminders = await Reminder.find({
        _id: { $in: reminderIds },
        userId
    });

    if (reminders.length !== reminderIds.length) {
        throw new CustomException('بعض التذكيرات غير صالحة للحذف', 400);
    }

    await Reminder.deleteMany({ _id: { $in: reminderIds } });

    res.status(200).json({
        success: true,
        message: `تم حذف ${reminders.length} تذكيرات بنجاح`,
        count: reminders.length
    });
});

// Helper function to calculate next reminder date
function calculateNextReminderDate(currentDate, frequency) {
    const nextDate = new Date(currentDate);

    switch (frequency) {
        case 'daily':
            nextDate.setDate(nextDate.getDate() + 1);
            break;
        case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
        case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
        default:
            nextDate.setDate(nextDate.getDate() + 1);
    }

    return nextDate;
}

module.exports = {
    createReminder,
    getReminders,
    getReminder,
    updateReminder,
    deleteReminder,
    completeReminder,
    dismissReminder,
    getUpcomingReminders,
    getOverdueReminders,
    bulkDeleteReminders
};
