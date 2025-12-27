/**
 * Activity Workflow Service
 * Security: All methods require firmId parameter for multi-tenant isolation
 *
 * Comprehensive activity workflow management including:
 * - Activity scheduling and rescheduling
 * - Reminder system
 * - Activity completion and chaining
 * - Activity plan execution
 * - Recurring activities
 * - Activity metrics and analytics
 */

const mongoose = require('mongoose');
const Activity = require('../models/activity.model');
const ActivityPlan = require('../models/activityPlan.model');
const ActivityPlanExecution = require('../models/activityPlanExecution.model');
const Lead = require('../models/lead.model');
const Client = require('../models/client.model');
const { CustomException } = require('../utils');
const { sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class ActivityWorkflowService {
    // ═══════════════════════════════════════════════════════════════
    // 1. ACTIVITY SCHEDULING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Schedule a new activity
     * @param {Object} activityData - Activity data
     * @param {string} firmId - Firm ID (REQUIRED)
     * @param {string} lawyerId - Lawyer ID
     * @returns {Promise<Object>} Created activity
     */
    async scheduleActivity(activityData, firmId, lawyerId) {
        if (!firmId) throw new Error('firmId is required');
        if (!activityData.res_model || !activityData.res_id) {
            throw new Error('Entity type and ID are required');
        }

        // Sanitize IDs
        const sanitizedResId = sanitizeObjectId(activityData.res_id);
        const sanitizedActivityTypeId = sanitizeObjectId(activityData.activity_type_id);
        const sanitizedUserId = sanitizeObjectId(activityData.user_id || lawyerId);

        if (!sanitizedResId || !sanitizedActivityTypeId) {
            throw new Error('Invalid activity type or entity ID');
        }

        // Create activity
        const activity = await Activity.create({
            firmId: new mongoose.Types.ObjectId(firmId),
            res_model: activityData.res_model,
            res_id: new mongoose.Types.ObjectId(sanitizedResId),
            activity_type_id: new mongoose.Types.ObjectId(sanitizedActivityTypeId),
            summary: activityData.summary,
            note: activityData.note,
            date_deadline: new Date(activityData.date_deadline),
            user_id: new mongoose.Types.ObjectId(sanitizedUserId),
            create_user_id: new mongoose.Types.ObjectId(lawyerId),
            state: 'scheduled'
        });

        return activity;
    }

    /**
     * Reschedule an existing activity
     * @param {string} activityId - Activity ID
     * @param {string} firmId - Firm ID (REQUIRED)
     * @param {string} lawyerId - Lawyer ID
     * @param {Date} newDateTime - New deadline date/time
     * @returns {Promise<Object>} Updated activity
     */
    async rescheduleActivity(activityId, firmId, lawyerId, newDateTime) {
        if (!firmId) throw new Error('firmId is required');
        const sanitizedId = sanitizeObjectId(activityId);
        if (!sanitizedId) throw new Error('Invalid activity ID');

        const activity = await Activity.findOneAndUpdate(
            { _id: sanitizedId, firmId: new mongoose.Types.ObjectId(firmId) },
            {
                $set: {
                    date_deadline: new Date(newDateTime),
                    state: 'scheduled',
                    updatedAt: new Date()
                }
            },
            { new: true }
        );

        if (!activity) {
            throw new Error('Activity not found');
        }

        return activity;
    }

    /**
     * Cancel an activity
     * @param {string} activityId - Activity ID
     * @param {string} firmId - Firm ID (REQUIRED)
     * @param {string} lawyerId - Lawyer ID
     * @param {string} reason - Cancellation reason
     * @returns {Promise<Object>} Updated activity
     */
    async cancelActivity(activityId, firmId, lawyerId, reason) {
        if (!firmId) throw new Error('firmId is required');
        const sanitizedId = sanitizeObjectId(activityId);
        if (!sanitizedId) throw new Error('Invalid activity ID');

        const activity = await Activity.findOneAndUpdate(
            { _id: sanitizedId, firmId: new mongoose.Types.ObjectId(firmId) },
            {
                $set: {
                    state: 'cancelled',
                    feedback: reason,
                    done_by: new mongoose.Types.ObjectId(lawyerId),
                    done_date: new Date(),
                    updatedAt: new Date()
                }
            },
            { new: true }
        );

        if (!activity) {
            throw new Error('Activity not found');
        }

        return activity;
    }

    /**
     * Bulk schedule multiple activities
     * @param {Array} activities - Array of activity data objects
     * @param {string} firmId - Firm ID (REQUIRED)
     * @param {string} lawyerId - Lawyer ID
     * @returns {Promise<Array>} Created activities
     */
    async bulkSchedule(activities, firmId, lawyerId) {
        if (!firmId) throw new Error('firmId is required');
        if (!Array.isArray(activities) || activities.length === 0) {
            throw new Error('Activities array is required');
        }

        const createdActivities = [];
        const firmObjectId = new mongoose.Types.ObjectId(firmId);
        const lawyerObjectId = new mongoose.Types.ObjectId(lawyerId);

        for (const activityData of activities) {
            try {
                const activity = await Activity.create({
                    firmId: firmObjectId,
                    res_model: activityData.res_model,
                    res_id: new mongoose.Types.ObjectId(sanitizeObjectId(activityData.res_id)),
                    activity_type_id: new mongoose.Types.ObjectId(sanitizeObjectId(activityData.activity_type_id)),
                    summary: activityData.summary,
                    note: activityData.note,
                    date_deadline: new Date(activityData.date_deadline),
                    user_id: new mongoose.Types.ObjectId(sanitizeObjectId(activityData.user_id || lawyerId)),
                    create_user_id: lawyerObjectId,
                    state: 'scheduled'
                });
                createdActivities.push(activity);
            } catch (error) {
                logger.error(`Failed to create activity: ${error.message}`);
            }
        }

        return createdActivities;
    }

    // ═══════════════════════════════════════════════════════════════
    // 2. REMINDER SYSTEM
    // ═══════════════════════════════════════════════════════════════

    /**
     * Set a reminder for an activity
     * @param {string} activityId - Activity ID
     * @param {string} firmId - Firm ID (REQUIRED)
     * @param {string} lawyerId - Lawyer ID
     * @param {Date} reminderTime - When to send reminder
     * @param {string} channel - Notification channel (email, sms, whatsapp)
     * @returns {Promise<Object>} Updated activity
     */
    async setReminder(activityId, firmId, lawyerId, reminderTime, channel = 'email') {
        if (!firmId) throw new Error('firmId is required');
        const sanitizedId = sanitizeObjectId(activityId);
        if (!sanitizedId) throw new Error('Invalid activity ID');

        const activity = await Activity.findOneAndUpdate(
            { _id: sanitizedId, firmId: new mongoose.Types.ObjectId(firmId) },
            {
                $set: {
                    reminder_time: new Date(reminderTime),
                    reminder_channel: channel,
                    reminder_sent: false,
                    updatedAt: new Date()
                }
            },
            { new: true }
        );

        if (!activity) {
            throw new Error('Activity not found');
        }

        return activity;
    }

    /**
     * Update reminder time
     * @param {string} activityId - Activity ID
     * @param {string} firmId - Firm ID (REQUIRED)
     * @param {string} lawyerId - Lawyer ID
     * @param {Date} newReminderTime - New reminder time
     * @returns {Promise<Object>} Updated activity
     */
    async updateReminder(activityId, firmId, lawyerId, newReminderTime) {
        if (!firmId) throw new Error('firmId is required');
        const sanitizedId = sanitizeObjectId(activityId);
        if (!sanitizedId) throw new Error('Invalid activity ID');

        const activity = await Activity.findOneAndUpdate(
            { _id: sanitizedId, firmId: new mongoose.Types.ObjectId(firmId) },
            {
                $set: {
                    reminder_time: new Date(newReminderTime),
                    reminder_sent: false,
                    updatedAt: new Date()
                }
            },
            { new: true }
        );

        if (!activity) {
            throw new Error('Activity not found');
        }

        return activity;
    }

    /**
     * Get activities needing reminders
     * @param {string} firmId - Firm ID (REQUIRED)
     * @returns {Promise<Array>} Activities needing reminders
     */
    async getDueReminders(firmId) {
        if (!firmId) throw new Error('firmId is required');

        const now = new Date();
        const activities = await Activity.find({
            firmId: new mongoose.Types.ObjectId(firmId),
            state: 'scheduled',
            reminder_time: { $lte: now },
            reminder_sent: { $ne: true }
        })
        .populate('activity_type_id', 'name icon color')
        .populate('user_id', 'firstName lastName email phone')
        .sort({ reminder_time: 1 })
        .limit(100);

        return activities;
    }

    /**
     * Mark reminder as sent
     * @param {string} activityId - Activity ID
     * @param {string} firmId - Firm ID (REQUIRED)
     * @returns {Promise<Object>} Updated activity
     */
    async markReminderSent(activityId, firmId) {
        if (!firmId) throw new Error('firmId is required');
        const sanitizedId = sanitizeObjectId(activityId);
        if (!sanitizedId) throw new Error('Invalid activity ID');

        const activity = await Activity.findOneAndUpdate(
            { _id: sanitizedId, firmId: new mongoose.Types.ObjectId(firmId) },
            {
                $set: {
                    reminder_sent: true,
                    reminder_sent_at: new Date(),
                    updatedAt: new Date()
                }
            },
            { new: true }
        );

        return activity;
    }

    /**
     * Snooze reminder
     * @param {string} activityId - Activity ID
     * @param {string} firmId - Firm ID (REQUIRED)
     * @param {string} lawyerId - Lawyer ID
     * @param {number} snoozeMinutes - Minutes to snooze
     * @returns {Promise<Object>} Updated activity
     */
    async snoozeReminder(activityId, firmId, lawyerId, snoozeMinutes) {
        if (!firmId) throw new Error('firmId is required');
        const sanitizedId = sanitizeObjectId(activityId);
        if (!sanitizedId) throw new Error('Invalid activity ID');

        const newReminderTime = new Date(Date.now() + snoozeMinutes * 60 * 1000);

        const activity = await Activity.findOneAndUpdate(
            { _id: sanitizedId, firmId: new mongoose.Types.ObjectId(firmId) },
            {
                $set: {
                    reminder_time: newReminderTime,
                    reminder_sent: false,
                    updatedAt: new Date()
                }
            },
            { new: true }
        );

        if (!activity) {
            throw new Error('Activity not found');
        }

        return activity;
    }

    // ═══════════════════════════════════════════════════════════════
    // 3. ACTIVITY COMPLETION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Complete an activity
     * @param {string} activityId - Activity ID
     * @param {string} firmId - Firm ID (REQUIRED)
     * @param {string} lawyerId - Lawyer ID
     * @param {string} outcome - Completion outcome
     * @param {string} notes - Completion notes
     * @returns {Promise<Object>} Updated activity
     */
    async completeActivity(activityId, firmId, lawyerId, outcome, notes) {
        if (!firmId) throw new Error('firmId is required');
        const sanitizedId = sanitizeObjectId(activityId);
        if (!sanitizedId) throw new Error('Invalid activity ID');

        const activity = await Activity.findOneAndUpdate(
            { _id: sanitizedId, firmId: new mongoose.Types.ObjectId(firmId) },
            {
                $set: {
                    state: 'done',
                    done_date: new Date(),
                    done_by: new mongoose.Types.ObjectId(lawyerId),
                    feedback: notes,
                    outcome: outcome,
                    completion_percentage: 100,
                    updatedAt: new Date()
                }
            },
            { new: true }
        ).populate('activity_type_id', 'name');

        if (!activity) {
            throw new Error('Activity not found');
        }

        // Check if there's a chained activity to trigger
        if (activity.recommended_activity_type_id) {
            await this.triggerNextActivity(sanitizedId, firmId, lawyerId);
        }

        return activity;
    }

    /**
     * Partial complete an activity
     * @param {string} activityId - Activity ID
     * @param {string} firmId - Firm ID (REQUIRED)
     * @param {string} lawyerId - Lawyer ID
     * @param {number} progress - Progress percentage (0-100)
     * @returns {Promise<Object>} Updated activity
     */
    async partialComplete(activityId, firmId, lawyerId, progress) {
        if (!firmId) throw new Error('firmId is required');
        const sanitizedId = sanitizeObjectId(activityId);
        if (!sanitizedId) throw new Error('Invalid activity ID');

        if (progress < 0 || progress > 100) {
            throw new Error('Progress must be between 0 and 100');
        }

        const activity = await Activity.findOneAndUpdate(
            { _id: sanitizedId, firmId: new mongoose.Types.ObjectId(firmId) },
            {
                $set: {
                    completion_percentage: progress,
                    state: progress === 100 ? 'done' : 'scheduled',
                    done_date: progress === 100 ? new Date() : undefined,
                    done_by: progress === 100 ? new mongoose.Types.ObjectId(lawyerId) : undefined,
                    updatedAt: new Date()
                }
            },
            { new: true }
        );

        if (!activity) {
            throw new Error('Activity not found');
        }

        return activity;
    }

    /**
     * Undo activity completion
     * @param {string} activityId - Activity ID
     * @param {string} firmId - Firm ID (REQUIRED)
     * @param {string} lawyerId - Lawyer ID
     * @returns {Promise<Object>} Updated activity
     */
    async undoComplete(activityId, firmId, lawyerId) {
        if (!firmId) throw new Error('firmId is required');
        const sanitizedId = sanitizeObjectId(activityId);
        if (!sanitizedId) throw new Error('Invalid activity ID');

        const activity = await Activity.findOneAndUpdate(
            { _id: sanitizedId, firmId: new mongoose.Types.ObjectId(firmId) },
            {
                $set: {
                    state: 'scheduled',
                    completion_percentage: 0,
                    updatedAt: new Date()
                },
                $unset: {
                    done_date: '',
                    done_by: '',
                    outcome: ''
                }
            },
            { new: true }
        );

        if (!activity) {
            throw new Error('Activity not found');
        }

        return activity;
    }

    // ═══════════════════════════════════════════════════════════════
    // 4. ACTIVITY CHAINING/SEQUENCES
    // ═══════════════════════════════════════════════════════════════

    /**
     * Trigger next activity in chain
     * @param {string} activityId - Completed activity ID
     * @param {string} firmId - Firm ID (REQUIRED)
     * @param {string} lawyerId - Lawyer ID
     * @returns {Promise<Object>} Created next activity
     */
    async triggerNextActivity(activityId, firmId, lawyerId) {
        if (!firmId) throw new Error('firmId is required');
        const sanitizedId = sanitizeObjectId(activityId);
        if (!sanitizedId) throw new Error('Invalid activity ID');

        const completedActivity = await Activity.findOne({
            _id: sanitizedId,
            firmId: new mongoose.Types.ObjectId(firmId)
        }).populate('recommended_activity_type_id');

        if (!completedActivity || !completedActivity.recommended_activity_type_id) {
            return null;
        }

        const nextActivityType = completedActivity.recommended_activity_type_id;
        const nextDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 days

        const nextActivity = await Activity.create({
            firmId: new mongoose.Types.ObjectId(firmId),
            res_model: completedActivity.res_model,
            res_id: completedActivity.res_id,
            activity_type_id: nextActivityType._id,
            summary: nextActivityType.name || 'Follow-up activity',
            note: `Auto-created after completing: ${completedActivity.summary}`,
            date_deadline: nextDeadline,
            user_id: completedActivity.user_id,
            create_user_id: new mongoose.Types.ObjectId(lawyerId),
            chained_from_id: completedActivity._id,
            previous_activity_type_id: completedActivity.activity_type_id,
            automated: true,
            state: 'scheduled'
        });

        return nextActivity;
    }

    /**
     * Create activity chain
     * @param {Array} activities - Array of activities to chain
     * @param {string} firmId - Firm ID (REQUIRED)
     * @param {string} lawyerId - Lawyer ID
     * @returns {Promise<Array>} Created activities chain
     */
    async createActivityChain(activities, firmId, lawyerId) {
        if (!firmId) throw new Error('firmId is required');
        if (!Array.isArray(activities) || activities.length === 0) {
            throw new Error('Activities array is required');
        }

        const createdActivities = [];
        let previousActivity = null;

        for (const activityData of activities) {
            const activity = await Activity.create({
                firmId: new mongoose.Types.ObjectId(firmId),
                res_model: activityData.res_model,
                res_id: new mongoose.Types.ObjectId(sanitizeObjectId(activityData.res_id)),
                activity_type_id: new mongoose.Types.ObjectId(sanitizeObjectId(activityData.activity_type_id)),
                summary: activityData.summary,
                note: activityData.note,
                date_deadline: new Date(activityData.date_deadline),
                user_id: new mongoose.Types.ObjectId(sanitizeObjectId(activityData.user_id || lawyerId)),
                create_user_id: new mongoose.Types.ObjectId(lawyerId),
                chained_from_id: previousActivity?._id,
                state: 'scheduled'
            });

            // Link previous activity to this one
            if (previousActivity) {
                await Activity.findByIdAndUpdate(previousActivity._id, {
                    $set: { recommended_activity_type_id: activity.activity_type_id }
                });
            }

            createdActivities.push(activity);
            previousActivity = activity;
        }

        return createdActivities;
    }

    /**
     * Get chain status
     * @param {string} chainId - First activity ID in chain
     * @param {string} firmId - Firm ID (REQUIRED)
     * @returns {Promise<Object>} Chain progress and status
     */
    async getChainStatus(chainId, firmId) {
        if (!firmId) throw new Error('firmId is required');
        const sanitizedId = sanitizeObjectId(chainId);
        if (!sanitizedId) throw new Error('Invalid chain ID');

        const activities = await Activity.find({
            $or: [
                { _id: sanitizedId },
                { chained_from_id: sanitizedId }
            ],
            firmId: new mongoose.Types.ObjectId(firmId)
        }).sort({ createdAt: 1 });

        const total = activities.length;
        const completed = activities.filter(a => a.state === 'done').length;
        const inProgress = activities.filter(a => a.state === 'scheduled').length;
        const cancelled = activities.filter(a => a.state === 'cancelled').length;

        return {
            chainId: sanitizedId,
            total,
            completed,
            inProgress,
            cancelled,
            progressPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
            activities
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // 5. ACTIVITY PLAN EXECUTION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Start activity plan execution on entity
     * @param {string} planId - Activity plan ID
     * @param {string} entityType - Entity type (lead, client, contact)
     * @param {string} entityId - Entity ID
     * @param {string} firmId - Firm ID (REQUIRED)
     * @param {string} lawyerId - Lawyer ID
     * @returns {Promise<Object>} Created plan execution
     */
    async startPlan(planId, entityType, entityId, firmId, lawyerId) {
        if (!firmId) throw new Error('firmId is required');
        const sanitizedPlanId = sanitizeObjectId(planId);
        const sanitizedEntityId = sanitizeObjectId(entityId);

        if (!sanitizedPlanId || !sanitizedEntityId) {
            throw new Error('Invalid plan or entity ID');
        }

        // Get plan
        const plan = await ActivityPlan.findOne({
            _id: sanitizedPlanId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!plan) {
            throw new Error('Activity plan not found');
        }

        // Get entity name
        let entityName = '';
        if (entityType === 'lead') {
            const lead = await Lead.findOne({ _id: sanitizedEntityId, firmId: new mongoose.Types.ObjectId(firmId) });
            entityName = lead?.displayName || lead?.firstName || 'Unknown';
        } else if (entityType === 'client') {
            const client = await Client.findOne({ _id: sanitizedEntityId, firmId: new mongoose.Types.ObjectId(firmId) });
            entityName = client?.displayName || client?.fullNameArabic || 'Unknown';
        }

        // Create execution
        const execution = await ActivityPlanExecution.create({
            firmId: new mongoose.Types.ObjectId(firmId),
            lawyerId: new mongoose.Types.ObjectId(lawyerId),
            planId: plan._id,
            planName: plan.name,
            planType: plan.planType,
            entityType,
            entityId: new mongoose.Types.ObjectId(sanitizedEntityId),
            entityName,
            status: 'active',
            currentStep: 0,
            totalSteps: plan.steps?.length || 0,
            completedSteps: 0,
            skippedSteps: 0,
            steps: plan.steps?.map(step => ({
                stepNumber: step.stepNumber,
                stepId: step._id,
                type: step.type,
                name: step.name,
                status: 'pending'
            })) || [],
            settings: plan.settings,
            startedBy: new mongoose.Types.ObjectId(lawyerId),
            startedAt: new Date(),
            expectedCompletionDate: new Date(Date.now() + (plan.totalDays || 30) * 24 * 60 * 60 * 1000)
        });

        // Update plan stats
        await ActivityPlan.findByIdAndUpdate(plan._id, {
            $inc: { 'stats.timesUsed': 1, 'stats.activeEnrollments': 1 }
        });

        return execution;
    }

    /**
     * Pause plan execution
     * @param {string} executionId - Execution ID
     * @param {string} firmId - Firm ID (REQUIRED)
     * @param {string} lawyerId - Lawyer ID
     * @returns {Promise<Object>} Updated execution
     */
    async pausePlan(executionId, firmId, lawyerId) {
        if (!firmId) throw new Error('firmId is required');
        const sanitizedId = sanitizeObjectId(executionId);
        if (!sanitizedId) throw new Error('Invalid execution ID');

        const execution = await ActivityPlanExecution.findOneAndUpdate(
            { _id: sanitizedId, firmId: new mongoose.Types.ObjectId(firmId) },
            {
                $set: {
                    status: 'paused',
                    pausedAt: new Date(),
                    pausedBy: new mongoose.Types.ObjectId(lawyerId)
                }
            },
            { new: true }
        );

        if (!execution) {
            throw new Error('Plan execution not found');
        }

        return execution;
    }

    /**
     * Resume plan execution
     * @param {string} executionId - Execution ID
     * @param {string} firmId - Firm ID (REQUIRED)
     * @param {string} lawyerId - Lawyer ID
     * @returns {Promise<Object>} Updated execution
     */
    async resumePlan(executionId, firmId, lawyerId) {
        if (!firmId) throw new Error('firmId is required');
        const sanitizedId = sanitizeObjectId(executionId);
        if (!sanitizedId) throw new Error('Invalid execution ID');

        const execution = await ActivityPlanExecution.findOneAndUpdate(
            { _id: sanitizedId, firmId: new mongoose.Types.ObjectId(firmId) },
            {
                $set: {
                    status: 'active',
                    resumedAt: new Date(),
                    resumedBy: new mongoose.Types.ObjectId(lawyerId)
                }
            },
            { new: true }
        );

        if (!execution) {
            throw new Error('Plan execution not found');
        }

        return execution;
    }

    /**
     * Skip a step in plan execution
     * @param {string} executionId - Execution ID
     * @param {number} stepIndex - Step index to skip
     * @param {string} firmId - Firm ID (REQUIRED)
     * @param {string} lawyerId - Lawyer ID
     * @param {string} reason - Skip reason
     * @returns {Promise<Object>} Updated execution
     */
    async skipStep(executionId, stepIndex, firmId, lawyerId, reason) {
        if (!firmId) throw new Error('firmId is required');
        const sanitizedId = sanitizeObjectId(executionId);
        if (!sanitizedId) throw new Error('Invalid execution ID');

        const execution = await ActivityPlanExecution.findOne({
            _id: sanitizedId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!execution) {
            throw new Error('Plan execution not found');
        }

        if (stepIndex < 0 || stepIndex >= execution.steps.length) {
            throw new Error('Invalid step index');
        }

        execution.steps[stepIndex].status = 'skipped';
        execution.steps[stepIndex].skipReason = reason;
        execution.skippedSteps += 1;

        await execution.save();

        return execution;
    }

    /**
     * Get plan execution progress
     * @param {string} executionId - Execution ID
     * @param {string} firmId - Firm ID (REQUIRED)
     * @returns {Promise<Object>} Execution details with progress
     */
    async getPlanProgress(executionId, firmId) {
        if (!firmId) throw new Error('firmId is required');
        const sanitizedId = sanitizeObjectId(executionId);
        if (!sanitizedId) throw new Error('Invalid execution ID');

        const execution = await ActivityPlanExecution.findOne({
            _id: sanitizedId,
            firmId: new mongoose.Types.ObjectId(firmId)
        })
        .populate('planId', 'name planType')
        .populate('lawyerId', 'firstName lastName');

        if (!execution) {
            throw new Error('Plan execution not found');
        }

        return execution;
    }

    // ═══════════════════════════════════════════════════════════════
    // 6. RECURRING ACTIVITIES
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create recurring activity
     * @param {Object} activityData - Activity data
     * @param {Object} recurrenceRule - Recurrence rule (daily, weekly, monthly)
     * @param {string} firmId - Firm ID (REQUIRED)
     * @param {string} lawyerId - Lawyer ID
     * @returns {Promise<Object>} Created recurring activity
     */
    async createRecurring(activityData, recurrenceRule, firmId, lawyerId) {
        if (!firmId) throw new Error('firmId is required');

        const activity = await Activity.create({
            firmId: new mongoose.Types.ObjectId(firmId),
            res_model: activityData.res_model,
            res_id: new mongoose.Types.ObjectId(sanitizeObjectId(activityData.res_id)),
            activity_type_id: new mongoose.Types.ObjectId(sanitizeObjectId(activityData.activity_type_id)),
            summary: activityData.summary,
            note: activityData.note,
            date_deadline: new Date(activityData.date_deadline),
            user_id: new mongoose.Types.ObjectId(sanitizeObjectId(activityData.user_id || lawyerId)),
            create_user_id: new mongoose.Types.ObjectId(lawyerId),
            state: 'scheduled',
            recurrence: {
                isRecurring: true,
                pattern: recurrenceRule.pattern, // daily, weekly, monthly, yearly
                interval: recurrenceRule.interval || 1,
                endDate: recurrenceRule.endDate,
                daysOfWeek: recurrenceRule.daysOfWeek,
                dayOfMonth: recurrenceRule.dayOfMonth
            }
        });

        return activity;
    }

    /**
     * Update recurrence rule
     * @param {string} activityId - Activity ID
     * @param {string} firmId - Firm ID (REQUIRED)
     * @param {string} lawyerId - Lawyer ID
     * @param {Object} newRule - New recurrence rule
     * @returns {Promise<Object>} Updated activity
     */
    async updateRecurrence(activityId, firmId, lawyerId, newRule) {
        if (!firmId) throw new Error('firmId is required');
        const sanitizedId = sanitizeObjectId(activityId);
        if (!sanitizedId) throw new Error('Invalid activity ID');

        const activity = await Activity.findOneAndUpdate(
            { _id: sanitizedId, firmId: new mongoose.Types.ObjectId(firmId) },
            {
                $set: {
                    'recurrence.pattern': newRule.pattern,
                    'recurrence.interval': newRule.interval,
                    'recurrence.endDate': newRule.endDate,
                    'recurrence.daysOfWeek': newRule.daysOfWeek,
                    'recurrence.dayOfMonth': newRule.dayOfMonth,
                    updatedAt: new Date()
                }
            },
            { new: true }
        );

        if (!activity) {
            throw new Error('Activity not found');
        }

        return activity;
    }

    /**
     * Generate next occurrence of recurring activity
     * @param {string} activityId - Activity ID
     * @param {string} firmId - Firm ID (REQUIRED)
     * @returns {Promise<Object>} Created next occurrence
     */
    async generateNextOccurrence(activityId, firmId) {
        if (!firmId) throw new Error('firmId is required');
        const sanitizedId = sanitizeObjectId(activityId);
        if (!sanitizedId) throw new Error('Invalid activity ID');

        const activity = await Activity.findOne({
            _id: sanitizedId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!activity || !activity.recurrence?.isRecurring) {
            throw new Error('Not a recurring activity');
        }

        const recurrence = activity.recurrence;
        let nextDate = new Date(activity.date_deadline);

        // Calculate next date based on pattern
        switch (recurrence.pattern) {
            case 'daily':
                nextDate.setDate(nextDate.getDate() + (recurrence.interval || 1));
                break;
            case 'weekly':
                nextDate.setDate(nextDate.getDate() + (recurrence.interval || 1) * 7);
                break;
            case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + (recurrence.interval || 1));
                break;
            case 'yearly':
                nextDate.setFullYear(nextDate.getFullYear() + (recurrence.interval || 1));
                break;
            default:
                throw new Error('Invalid recurrence pattern');
        }

        // Check if past end date
        if (recurrence.endDate && nextDate > new Date(recurrence.endDate)) {
            return null;
        }

        // Create next occurrence
        const nextActivity = await Activity.create({
            firmId: activity.firmId,
            res_model: activity.res_model,
            res_id: activity.res_id,
            activity_type_id: activity.activity_type_id,
            summary: activity.summary,
            note: activity.note,
            date_deadline: nextDate,
            user_id: activity.user_id,
            create_user_id: activity.create_user_id,
            state: 'scheduled',
            recurrence: activity.recurrence,
            chained_from_id: activity._id
        });

        return nextActivity;
    }

    /**
     * End recurrence
     * @param {string} activityId - Activity ID
     * @param {string} firmId - Firm ID (REQUIRED)
     * @param {string} lawyerId - Lawyer ID
     * @returns {Promise<Object>} Updated activity
     */
    async endRecurrence(activityId, firmId, lawyerId) {
        if (!firmId) throw new Error('firmId is required');
        const sanitizedId = sanitizeObjectId(activityId);
        if (!sanitizedId) throw new Error('Invalid activity ID');

        const activity = await Activity.findOneAndUpdate(
            { _id: sanitizedId, firmId: new mongoose.Types.ObjectId(firmId) },
            {
                $set: {
                    'recurrence.isRecurring': false,
                    'recurrence.endDate': new Date(),
                    updatedAt: new Date()
                }
            },
            { new: true }
        );

        if (!activity) {
            throw new Error('Activity not found');
        }

        return activity;
    }

    // ═══════════════════════════════════════════════════════════════
    // 7. ACTIVITY METRICS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get activity completion rate
     * @param {string} firmId - Firm ID (REQUIRED)
     * @param {string} lawyerId - Lawyer ID (optional)
     * @param {Object} dateRange - Date range filter
     * @returns {Promise<Object>} Completion rate metrics
     */
    async getCompletionRate(firmId, lawyerId = null, dateRange = {}) {
        if (!firmId) throw new Error('firmId is required');

        const matchQuery = { firmId: new mongoose.Types.ObjectId(firmId) };

        if (lawyerId) {
            matchQuery.user_id = new mongoose.Types.ObjectId(lawyerId);
        }

        if (dateRange.start) {
            matchQuery.createdAt = { $gte: new Date(dateRange.start) };
        }
        if (dateRange.end) {
            matchQuery.createdAt = { ...matchQuery.createdAt, $lte: new Date(dateRange.end) };
        }

        const stats = await Activity.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$state',
                    count: { $sum: 1 }
                }
            }
        ]);

        const total = stats.reduce((sum, s) => sum + s.count, 0);
        const completed = stats.find(s => s._id === 'done')?.count || 0;
        const scheduled = stats.find(s => s._id === 'scheduled')?.count || 0;
        const cancelled = stats.find(s => s._id === 'cancelled')?.count || 0;

        return {
            total,
            completed,
            scheduled,
            cancelled,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
            byState: stats
        };
    }

    /**
     * Get overdue activities
     * @param {string} firmId - Firm ID (REQUIRED)
     * @param {string} lawyerId - Lawyer ID (optional)
     * @returns {Promise<Array>} Overdue activities
     */
    async getOverdueActivities(firmId, lawyerId = null) {
        if (!firmId) throw new Error('firmId is required');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const query = {
            firmId: new mongoose.Types.ObjectId(firmId),
            state: 'scheduled',
            date_deadline: { $lt: today }
        };

        if (lawyerId) {
            query.user_id = new mongoose.Types.ObjectId(lawyerId);
        }

        const activities = await Activity.find(query)
            .populate('activity_type_id', 'name icon color')
            .populate('user_id', 'firstName lastName email')
            .sort({ date_deadline: 1 })
            .limit(100);

        return activities;
    }

    /**
     * Get activity load per person
     * @param {string} firmId - Firm ID (REQUIRED)
     * @param {string} lawyerId - Lawyer ID (optional)
     * @param {Object} dateRange - Date range filter
     * @returns {Promise<Array>} Activity load by person
     */
    async getActivityLoad(firmId, lawyerId = null, dateRange = {}) {
        if (!firmId) throw new Error('firmId is required');

        const matchQuery = {
            firmId: new mongoose.Types.ObjectId(firmId),
            state: 'scheduled'
        };

        if (lawyerId) {
            matchQuery.user_id = new mongoose.Types.ObjectId(lawyerId);
        }

        if (dateRange.start) {
            matchQuery.date_deadline = { $gte: new Date(dateRange.start) };
        }
        if (dateRange.end) {
            matchQuery.date_deadline = { ...matchQuery.date_deadline, $lte: new Date(dateRange.end) };
        }

        const load = await Activity.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$user_id',
                    totalActivities: { $sum: 1 },
                    overdueCount: {
                        $sum: {
                            $cond: [
                                { $lt: ['$date_deadline', new Date()] },
                                1,
                                0
                            ]
                        }
                    },
                    todayCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $gte: ['$date_deadline', new Date(new Date().setHours(0, 0, 0, 0))] },
                                        { $lt: ['$date_deadline', new Date(new Date().setHours(23, 59, 59, 999))] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $unwind: '$user'
            },
            {
                $project: {
                    userId: '$_id',
                    userName: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
                    totalActivities: 1,
                    overdueCount: 1,
                    todayCount: 1
                }
            },
            {
                $sort: { totalActivities: -1 }
            }
        ]);

        return load;
    }
}

// Export singleton instance
module.exports = new ActivityWorkflowService();
