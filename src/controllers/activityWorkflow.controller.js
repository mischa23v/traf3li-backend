/**
 * Activity Workflow Controller
 * Security: All operations enforce multi-tenant isolation via firmQuery
 *
 * Exposes activityWorkflow.service.js methods as API endpoints for:
 * - Activity scheduling and rescheduling
 * - Reminder management
 * - Activity completion tracking
 * - Activity chains and sequences
 * - Activity plan execution
 * - Recurring activities
 * - Activity metrics and analytics
 */

const activityWorkflowService = require('../services/activityWorkflow.service');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Schedule activity
 * POST /api/activity-workflow/schedule
 */
const scheduleActivity = async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, [
            'activityType',
            'entityType',
            'entityId',
            'title',
            'description',
            'scheduledDateTime',
            'duration',
            'assignedTo',
            'priority',
            'notes'
        ]);

        const activity = await activityWorkflowService.scheduleActivity(
            allowedFields,
            req.firmId,
            req.userID
        );

        return res.status(201).json({
            error: false,
            message: 'Activity scheduled successfully',
            data: activity
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Reschedule activity
 * POST /api/activity-workflow/reschedule/:id
 */
const rescheduleActivity = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { newDateTime } = req.body;

        if (!newDateTime) {
            throw CustomException('New date/time is required', 400);
        }

        const activity = await activityWorkflowService.rescheduleActivity(
            sanitizedId,
            req.firmId,
            req.userID,
            newDateTime
        );

        return res.status(200).json({
            error: false,
            message: 'Activity rescheduled successfully',
            data: activity
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Cancel activity
 * POST /api/activity-workflow/cancel/:id
 */
const cancelActivity = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { reason } = req.body;

        const activity = await activityWorkflowService.cancelActivity(
            sanitizedId,
            req.firmId,
            req.userID,
            reason
        );

        return res.status(200).json({
            error: false,
            message: 'Activity cancelled',
            data: activity
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Bulk schedule activities
 * POST /api/activity-workflow/bulk-schedule
 */
const bulkSchedule = async (req, res) => {
    try {
        const { activities } = req.body;

        if (!activities || !Array.isArray(activities)) {
            throw CustomException('Activities array is required', 400);
        }

        const result = await activityWorkflowService.bulkSchedule(
            activities,
            req.firmId,
            req.userID
        );

        return res.status(201).json({
            error: false,
            message: 'Activities scheduled in bulk',
            data: result
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Set reminder for activity
 * POST /api/activity-workflow/set-reminder/:id
 */
const setReminder = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { reminderTime, channel } = req.body;

        if (!reminderTime) {
            throw CustomException('Reminder time is required', 400);
        }

        const activity = await activityWorkflowService.setReminder(
            sanitizedId,
            req.firmId,
            req.userID,
            reminderTime,
            channel
        );

        return res.status(200).json({
            error: false,
            message: 'Reminder set successfully',
            data: activity
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Update reminder
 * POST /api/activity-workflow/update-reminder/:id
 */
const updateReminder = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { newReminderTime } = req.body;

        if (!newReminderTime) {
            throw CustomException('New reminder time is required', 400);
        }

        const activity = await activityWorkflowService.updateReminder(
            sanitizedId,
            req.firmId,
            req.userID,
            newReminderTime
        );

        return res.status(200).json({
            error: false,
            message: 'Reminder updated',
            data: activity
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get due reminders
 * GET /api/activity-workflow/due-reminders
 */
const getDueReminders = async (req, res) => {
    try {
        const reminders = await activityWorkflowService.getDueReminders(req.firmId);

        return res.status(200).json({
            error: false,
            data: reminders
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Mark reminder as sent
 * POST /api/activity-workflow/mark-reminder-sent/:id
 */
const markReminderSent = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const activity = await activityWorkflowService.markReminderSent(
            sanitizedId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            message: 'Reminder marked as sent',
            data: activity
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Snooze reminder
 * POST /api/activity-workflow/snooze-reminder/:id
 */
const snoozeReminder = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { snoozeMinutes } = req.body;

        if (!snoozeMinutes) {
            throw CustomException('Snooze duration in minutes is required', 400);
        }

        const activity = await activityWorkflowService.snoozeReminder(
            sanitizedId,
            req.firmId,
            req.userID,
            snoozeMinutes
        );

        return res.status(200).json({
            error: false,
            message: 'Reminder snoozed',
            data: activity
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Complete activity
 * POST /api/activity-workflow/complete/:id
 */
const completeActivity = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { outcome, notes } = req.body;

        const activity = await activityWorkflowService.completeActivity(
            sanitizedId,
            req.firmId,
            req.userID,
            outcome,
            notes
        );

        return res.status(200).json({
            error: false,
            message: 'Activity completed',
            data: activity
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Partially complete activity
 * POST /api/activity-workflow/partial-complete/:id
 */
const partialComplete = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { progress } = req.body;

        if (progress === undefined || progress < 0 || progress > 100) {
            throw CustomException('Progress must be between 0 and 100', 400);
        }

        const activity = await activityWorkflowService.partialComplete(
            sanitizedId,
            req.firmId,
            req.userID,
            progress
        );

        return res.status(200).json({
            error: false,
            message: 'Activity progress updated',
            data: activity
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Undo activity completion
 * POST /api/activity-workflow/undo-complete/:id
 */
const undoComplete = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const activity = await activityWorkflowService.undoComplete(
            sanitizedId,
            req.firmId,
            req.userID
        );

        return res.status(200).json({
            error: false,
            message: 'Activity completion undone',
            data: activity
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Trigger next activity in chain
 * POST /api/activity-workflow/trigger-next/:id
 */
const triggerNextActivity = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const nextActivity = await activityWorkflowService.triggerNextActivity(
            sanitizedId,
            req.firmId,
            req.userID
        );

        return res.status(201).json({
            error: false,
            message: 'Next activity triggered',
            data: nextActivity
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Create activity chain
 * POST /api/activity-workflow/create-chain
 */
const createActivityChain = async (req, res) => {
    try {
        const { activities } = req.body;

        if (!activities || !Array.isArray(activities)) {
            throw CustomException('Activities array is required', 400);
        }

        const chain = await activityWorkflowService.createActivityChain(
            activities,
            req.firmId,
            req.userID
        );

        return res.status(201).json({
            error: false,
            message: 'Activity chain created',
            data: chain
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get activity chain status
 * GET /api/activity-workflow/chain-status/:chainId
 */
const getChainStatus = async (req, res) => {
    try {
        const sanitizedChainId = sanitizeObjectId(req.params.chainId);

        const status = await activityWorkflowService.getChainStatus(
            sanitizedChainId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            data: status
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Start activity plan
 * POST /api/activity-workflow/start-plan/:planId
 */
const startPlan = async (req, res) => {
    try {
        const sanitizedPlanId = sanitizeObjectId(req.params.planId);
        const { entityType, entityId } = req.body;

        if (!entityType || !entityId) {
            throw CustomException('Entity type and ID are required', 400);
        }

        const execution = await activityWorkflowService.startPlan(
            sanitizedPlanId,
            entityType,
            entityId,
            req.firmId,
            req.userID
        );

        return res.status(201).json({
            error: false,
            message: 'Activity plan started',
            data: execution
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Pause activity plan
 * POST /api/activity-workflow/pause-plan/:executionId
 */
const pausePlan = async (req, res) => {
    try {
        const sanitizedExecutionId = sanitizeObjectId(req.params.executionId);

        const execution = await activityWorkflowService.pausePlan(
            sanitizedExecutionId,
            req.firmId,
            req.userID
        );

        return res.status(200).json({
            error: false,
            message: 'Activity plan paused',
            data: execution
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Resume activity plan
 * POST /api/activity-workflow/resume-plan/:executionId
 */
const resumePlan = async (req, res) => {
    try {
        const sanitizedExecutionId = sanitizeObjectId(req.params.executionId);

        const execution = await activityWorkflowService.resumePlan(
            sanitizedExecutionId,
            req.firmId,
            req.userID
        );

        return res.status(200).json({
            error: false,
            message: 'Activity plan resumed',
            data: execution
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Skip plan step
 * POST /api/activity-workflow/skip-step/:executionId
 */
const skipStep = async (req, res) => {
    try {
        const sanitizedExecutionId = sanitizeObjectId(req.params.executionId);
        const { stepIndex, reason } = req.body;

        if (stepIndex === undefined) {
            throw CustomException('Step index is required', 400);
        }

        const execution = await activityWorkflowService.skipStep(
            sanitizedExecutionId,
            stepIndex,
            req.firmId,
            req.userID,
            reason
        );

        return res.status(200).json({
            error: false,
            message: 'Plan step skipped',
            data: execution
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get plan progress
 * GET /api/activity-workflow/plan-progress/:executionId
 */
const getPlanProgress = async (req, res) => {
    try {
        const sanitizedExecutionId = sanitizeObjectId(req.params.executionId);

        const progress = await activityWorkflowService.getPlanProgress(
            sanitizedExecutionId,
            req.firmId
        );

        return res.status(200).json({
            error: false,
            data: progress
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Create recurring activity
 * POST /api/activity-workflow/create-recurring
 */
const createRecurring = async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, [
            'activityType',
            'entityType',
            'entityId',
            'title',
            'description',
            'scheduledDateTime',
            'duration',
            'assignedTo',
            'priority',
            'notes'
        ]);

        const { recurrenceRule } = req.body;

        if (!recurrenceRule) {
            throw CustomException('Recurrence rule is required', 400);
        }

        const activity = await activityWorkflowService.createRecurring(
            allowedFields,
            recurrenceRule,
            req.firmId,
            req.userID
        );

        return res.status(201).json({
            error: false,
            message: 'Recurring activity created',
            data: activity
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Update recurrence
 * POST /api/activity-workflow/update-recurrence/:id
 */
const updateRecurrence = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { newRule } = req.body;

        if (!newRule) {
            throw CustomException('New recurrence rule is required', 400);
        }

        const activity = await activityWorkflowService.updateRecurrence(
            sanitizedId,
            req.firmId,
            req.userID,
            newRule
        );

        return res.status(200).json({
            error: false,
            message: 'Recurrence updated',
            data: activity
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Generate next occurrence
 * POST /api/activity-workflow/generate-next/:id
 */
const generateNextOccurrence = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const nextActivity = await activityWorkflowService.generateNextOccurrence(
            sanitizedId,
            req.firmId
        );

        return res.status(201).json({
            error: false,
            message: 'Next occurrence generated',
            data: nextActivity
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * End recurrence
 * POST /api/activity-workflow/end-recurrence/:id
 */
const endRecurrence = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        const activity = await activityWorkflowService.endRecurrence(
            sanitizedId,
            req.firmId,
            req.userID
        );

        return res.status(200).json({
            error: false,
            message: 'Recurrence ended',
            data: activity
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get completion rate
 * GET /api/activity-workflow/completion-rate
 */
const getCompletionRate = async (req, res) => {
    try {
        const { lawyerId, startDate, endDate } = req.query;

        const rate = await activityWorkflowService.getCompletionRate(
            req.firmId,
            lawyerId,
            { startDate, endDate }
        );

        return res.status(200).json({
            error: false,
            data: rate
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get overdue activities
 * GET /api/activity-workflow/overdue
 */
const getOverdueActivities = async (req, res) => {
    try {
        const { lawyerId } = req.query;

        const activities = await activityWorkflowService.getOverdueActivities(
            req.firmId,
            lawyerId
        );

        return res.status(200).json({
            error: false,
            data: activities
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get activity load
 * GET /api/activity-workflow/activity-load
 */
const getActivityLoad = async (req, res) => {
    try {
        const { lawyerId, startDate, endDate } = req.query;

        const load = await activityWorkflowService.getActivityLoad(
            req.firmId,
            lawyerId,
            { startDate, endDate }
        );

        return res.status(200).json({
            error: false,
            data: load
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

module.exports = {
    scheduleActivity,
    rescheduleActivity,
    cancelActivity,
    bulkSchedule,
    setReminder,
    updateReminder,
    getDueReminders,
    markReminderSent,
    snoozeReminder,
    completeActivity,
    partialComplete,
    undoComplete,
    triggerNextActivity,
    createActivityChain,
    getChainStatus,
    startPlan,
    pausePlan,
    resumePlan,
    skipStep,
    getPlanProgress,
    createRecurring,
    updateRecurrence,
    generateNextOccurrence,
    endRecurrence,
    getCompletionRate,
    getOverdueActivities,
    getActivityLoad
};
