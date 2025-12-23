/**
 * Activity Service - Odoo-style Activity Management
 *
 * This service provides a high-level API for managing activities and follow-ups.
 * It implements Odoo's activity pattern with activity types, deadlines, chaining,
 * and automatic reminders.
 *
 * Features:
 * - Schedule activities with configurable deadlines
 * - Activity type-based automation
 * - Chained activities (auto-create next activity when one is completed)
 * - Activity reassignment and rescheduling
 * - Overdue activity tracking
 * - Reminder system
 * - Activity statistics and analytics
 */

const mongoose = require('mongoose');
const AuditLogService = require('./auditLog.service');
const Activity = require('../models/activity.model');
const ActivityType = require('../models/activityType.model');
const logger = require('../utils/logger');

class ActivityService {
  /**
   * Schedule a new activity
   * @param {Object} data - Activity data
   * @param {String} data.res_model - Related model (e.g., 'client', 'case', 'lead')
   * @param {String} data.res_id - Related record ID
   * @param {String} data.activity_type_id - Activity type ID
   * @param {String} data.summary - Activity summary
   * @param {String} data.note - Activity notes
   * @param {Date} data.date_deadline - Deadline (optional, calculated from type if not provided)
   * @param {String} data.user_id - Assigned user ID
   * @param {Object} context - Request context
   * @param {String} context.firmId - Firm ID
   * @param {String} context.userId - User ID of creator
   * @returns {Promise<Object|null>} - Created activity or null
   */
  async scheduleActivity(data, context = {}) {
    try {
      // Validate required fields
      if (!data.res_model || !data.res_id || !data.activity_type_id) {
        logger.error('ActivityService.scheduleActivity: Missing required fields');
        return null;
      }

      // Fetch activity type to get configuration
      const activityType = await ActivityType.findById(data.activity_type_id).lean();
      if (!activityType) {
        logger.error('ActivityService.scheduleActivity: Activity type not found');
        return null;
      }

      // Calculate deadline if not provided
      const deadline = data.date_deadline
        ? new Date(data.date_deadline)
        : this._calculateDeadline(activityType);

      // Prepare activity data
      const activityData = {
        // Related record
        res_model: data.res_model,
        res_id: new mongoose.Types.ObjectId(data.res_id),

        // Activity details
        activity_type_id: new mongoose.Types.ObjectId(data.activity_type_id),
        summary: data.summary || activityType.name || activityType.summary,
        note: data.note || '',

        // Scheduling
        date_deadline: deadline,

        // Assignment
        user_id: new mongoose.Types.ObjectId(data.user_id || context.userId),
        created_by: new mongoose.Types.ObjectId(context.userId),

        // Multi-tenancy
        firm_id: new mongoose.Types.ObjectId(context.firmId),

        // State
        state: this._determineState(deadline),

        // Metadata
        created_at: new Date(),
        updated_at: new Date()
      };

      // Create activity
      const activity = await Activity.create(activityData);

      // Log to audit
      await AuditLogService.log(
        'create_activity',
        'activity',
        activity._id.toString(),
        null,
        {
          ...context,
          details: {
            res_model: data.res_model,
            res_id: data.res_id,
            activity_type_id: data.activity_type_id,
            assigned_to: data.user_id
          }
        }
      );

      return activity;
    } catch (error) {
      logger.error('ActivityService.scheduleActivity failed:', error.message);
      return null;
    }
  }

  /**
   * Mark activity as done
   * @param {String} activityId - Activity ID
   * @param {String} feedback - Completion feedback
   * @param {Object} context - Request context
   * @returns {Promise<Object|null>} - Updated activity or null
   */
  async markAsDone(activityId, feedback = '', context = {}) {
    try {
      // Find activity
      const activity = await Activity.findById(activityId).lean();
      if (!activity) {
        logger.error('ActivityService.markAsDone: Activity not found');
        return null;
      }

      // Update activity state
      const updatedActivity = await Activity.findByIdAndUpdate(
        activityId,
        {
          state: 'done',
          done_date: new Date(),
          done_by: new mongoose.Types.ObjectId(context.userId),
          feedback: feedback,
          updated_at: new Date()
        },
        { new: true }
      );

      // Log to audit
      await AuditLogService.log(
        'complete_activity',
        'activity',
        activityId,
        null,
        {
          ...context,
          details: {
            res_model: activity.res_model,
            res_id: activity.res_id,
            feedback: feedback
          }
        }
      );

      // Check if activity type has chained activity
      const activityType = await ActivityType.findById(activity.activity_type_id).lean();
      if (activityType?.triggered_next_type_id) {
        await this._triggerChainedActivity(activity, activityType, context);
      }

      return updatedActivity;
    } catch (error) {
      logger.error('ActivityService.markAsDone failed:', error.message);
      return null;
    }
  }

  /**
   * Cancel an activity
   * @param {String} activityId - Activity ID
   * @param {Object} context - Request context
   * @returns {Promise<Object|null>} - Updated activity or null
   */
  async cancel(activityId, context = {}) {
    try {
      const activity = await Activity.findById(activityId).lean();
      if (!activity) {
        logger.error('ActivityService.cancel: Activity not found');
        return null;
      }

      const updatedActivity = await Activity.findByIdAndUpdate(
        activityId,
        {
          state: 'cancelled',
          cancelled_by: new mongoose.Types.ObjectId(context.userId),
          cancelled_at: new Date(),
          updated_at: new Date()
        },
        { new: true }
      );

      // Log to audit
      await AuditLogService.log(
        'cancel_activity',
        'activity',
        activityId,
        null,
        {
          ...context,
          details: {
            res_model: activity.res_model,
            res_id: activity.res_id
          }
        }
      );

      return updatedActivity;
    } catch (error) {
      logger.error('ActivityService.cancel failed:', error.message);
      return null;
    }
  }

  /**
   * Reschedule an activity
   * @param {String} activityId - Activity ID
   * @param {Date} newDeadline - New deadline
   * @param {Object} context - Request context
   * @returns {Promise<Object|null>} - Updated activity or null
   */
  async reschedule(activityId, newDeadline, context = {}) {
    try {
      const activity = await Activity.findById(activityId).lean();
      if (!activity) {
        logger.error('ActivityService.reschedule: Activity not found');
        return null;
      }

      const deadline = new Date(newDeadline);
      const newState = this._determineState(deadline);

      const updatedActivity = await Activity.findByIdAndUpdate(
        activityId,
        {
          date_deadline: deadline,
          state: newState,
          rescheduled_by: new mongoose.Types.ObjectId(context.userId),
          rescheduled_at: new Date(),
          updated_at: new Date()
        },
        { new: true }
      );

      // Log to audit
      await AuditLogService.log(
        'reschedule_activity',
        'activity',
        activityId,
        {
          before: { date_deadline: activity.date_deadline },
          after: { date_deadline: deadline }
        },
        {
          ...context,
          details: {
            old_deadline: activity.date_deadline,
            new_deadline: deadline
          }
        }
      );

      return updatedActivity;
    } catch (error) {
      logger.error('ActivityService.reschedule failed:', error.message);
      return null;
    }
  }

  /**
   * Reassign an activity to a different user
   * @param {String} activityId - Activity ID
   * @param {String} newUserId - New assigned user ID
   * @param {Object} context - Request context
   * @returns {Promise<Object|null>} - Updated activity or null
   */
  async reassign(activityId, newUserId, context = {}) {
    try {
      const activity = await Activity.findById(activityId).lean();
      if (!activity) {
        logger.error('ActivityService.reassign: Activity not found');
        return null;
      }

      const updatedActivity = await Activity.findByIdAndUpdate(
        activityId,
        {
          user_id: new mongoose.Types.ObjectId(newUserId),
          reassigned_by: new mongoose.Types.ObjectId(context.userId),
          reassigned_at: new Date(),
          updated_at: new Date()
        },
        { new: true }
      );

      // Log to audit
      await AuditLogService.log(
        'reassign_activity',
        'activity',
        activityId,
        {
          before: { user_id: activity.user_id },
          after: { user_id: newUserId }
        },
        {
          ...context,
          details: {
            old_user: activity.user_id,
            new_user: newUserId
          }
        }
      );

      return updatedActivity;
    } catch (error) {
      logger.error('ActivityService.reassign failed:', error.message);
      return null;
    }
  }

  /**
   * Get all activities for a specific record
   * @param {String} res_model - Model name
   * @param {String} res_id - Record ID
   * @param {Object} options - Query options
   * @param {String} options.state - Filter by state
   * @param {String} options.user_id - Filter by assigned user
   * @param {Number} options.limit - Limit results
   * @param {Number} options.skip - Skip results
   * @returns {Promise<Array>} - Activities
   */
  async getActivitiesForRecord(res_model, res_id, options = {}) {
    try {
      const query = {
        res_model,
        res_id: new mongoose.Types.ObjectId(res_id)
      };

      // Apply filters
      if (options.state) {
        query.state = options.state;
      }

      if (options.user_id) {
        query.user_id = new mongoose.Types.ObjectId(options.user_id);
      }

      const activities = await Activity.find(query)
        .populate('activity_type_id', 'name summary icon category')
        .populate('user_id', 'firstName lastName email avatar')
        .populate('created_by', 'firstName lastName email')
        .populate('done_by', 'firstName lastName email')
        .sort({ date_deadline: 1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0)
        .lean();

      return activities;
    } catch (error) {
      logger.error('ActivityService.getActivitiesForRecord failed:', error.message);
      return [];
    }
  }

  /**
   * Get user's activities
   * @param {String} userId - User ID
   * @param {String} firmId - Firm ID
   * @param {Object} options - Query options
   * @param {String} options.state - Filter by state
   * @param {Object} options.date_range - Filter by date range
   * @param {String} options.res_model - Filter by model
   * @returns {Promise<Array>} - Activities
   */
  async getUserActivities(userId, firmId, options = {}) {
    try {
      const query = {
        user_id: new mongoose.Types.ObjectId(userId),
        firm_id: new mongoose.Types.ObjectId(firmId)
      };

      // Apply filters
      if (options.state) {
        if (Array.isArray(options.state)) {
          query.state = { $in: options.state };
        } else {
          query.state = options.state;
        }
      }

      if (options.res_model) {
        query.res_model = options.res_model;
      }

      // Date range filter
      if (options.date_range) {
        query.date_deadline = {};
        if (options.date_range.start) {
          query.date_deadline.$gte = new Date(options.date_range.start);
        }
        if (options.date_range.end) {
          query.date_deadline.$lte = new Date(options.date_range.end);
        }
      }

      const activities = await Activity.find(query)
        .populate('activity_type_id', 'name summary icon category')
        .populate('created_by', 'firstName lastName email')
        .sort({ date_deadline: 1 })
        .limit(options.limit || 100)
        .skip(options.skip || 0)
        .lean();

      return activities;
    } catch (error) {
      logger.error('ActivityService.getUserActivities failed:', error.message);
      return [];
    }
  }

  /**
   * Get activity statistics for a user or firm
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID (optional)
   * @returns {Promise<Object>} - Activity statistics
   */
  async getActivityStats(firmId, userId = null) {
    try {
      const matchQuery = {
        firm_id: new mongoose.Types.ObjectId(firmId)
      };

      if (userId) {
        matchQuery.user_id = new mongoose.Types.ObjectId(userId);
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Count overdue activities
      const overdue_count = await Activity.countDocuments({
        ...matchQuery,
        state: { $in: ['planned', 'today', 'overdue'] },
        date_deadline: { $lt: today }
      });

      // Count today's activities
      const today_count = await Activity.countDocuments({
        ...matchQuery,
        state: { $in: ['planned', 'today'] },
        date_deadline: { $gte: today, $lt: tomorrow }
      });

      // Count planned activities (future)
      const planned_count = await Activity.countDocuments({
        ...matchQuery,
        state: 'planned',
        date_deadline: { $gte: tomorrow }
      });

      // Count done activities in last 7 days
      const done_count = await Activity.countDocuments({
        ...matchQuery,
        state: 'done',
        done_date: { $gte: sevenDaysAgo }
      });

      // Activities by type
      const byType = await Activity.aggregate([
        { $match: { ...matchQuery, state: { $nin: ['done', 'cancelled'] } } },
        {
          $group: {
            _id: '$activity_type_id',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // Activities by model
      const byModel = await Activity.aggregate([
        { $match: { ...matchQuery, state: { $nin: ['done', 'cancelled'] } } },
        {
          $group: {
            _id: '$res_model',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      return {
        overdue_count,
        today_count,
        planned_count,
        done_count,
        total_pending: overdue_count + today_count + planned_count,
        by_type: byType,
        by_model: byModel
      };
    } catch (error) {
      logger.error('ActivityService.getActivityStats failed:', error.message);
      return {
        overdue_count: 0,
        today_count: 0,
        planned_count: 0,
        done_count: 0,
        total_pending: 0,
        by_type: [],
        by_model: []
      };
    }
  }

  /**
   * Get all overdue activities for a firm
   * @param {String} firmId - Firm ID
   * @returns {Promise<Array>} - Overdue activities
   */
  async getOverdueActivities(firmId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const overdueActivities = await Activity.find({
        firm_id: new mongoose.Types.ObjectId(firmId),
        state: { $in: ['planned', 'today', 'overdue'] },
        date_deadline: { $lt: today }
      })
        .populate('activity_type_id', 'name summary icon category')
        .populate('user_id', 'firstName lastName email avatar')
        .populate('created_by', 'firstName lastName email')
        .sort({ date_deadline: 1 })
        .limit(500)
        .lean();

      return overdueActivities;
    } catch (error) {
      logger.error('ActivityService.getOverdueActivities failed:', error.message);
      return [];
    }
  }

  /**
   * Process reminders for activities
   * Called by queue/cron to send reminders for upcoming activities
   * @returns {Promise<Object>} - Reminder processing results
   */
  async processReminders() {
    try {
      const now = new Date();
      const oneDayFromNow = new Date(now);
      oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
      const threeDaysFromNow = new Date(now);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      // Find activities needing reminders
      const activitiesNeedingReminders = await Activity.find({
        state: { $in: ['planned', 'today'] },
        date_deadline: { $lte: threeDaysFromNow },
        reminder_sent: { $ne: true }
      })
        .populate('activity_type_id', 'name summary reminder_days')
        .populate('user_id', 'firstName lastName email')
        .populate('firm_id', 'name settings');

      const reminders = {
        overdue: [],
        today: [],
        tomorrow: [],
        upcoming: []
      };

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      for (const activity of activitiesNeedingReminders) {
        const deadline = new Date(activity.date_deadline);
        deadline.setHours(0, 0, 0, 0);

        // Categorize by urgency
        if (deadline < today) {
          reminders.overdue.push(activity);
        } else if (deadline.getTime() === today.getTime()) {
          reminders.today.push(activity);
        } else if (deadline.getTime() === tomorrow.getTime()) {
          reminders.tomorrow.push(activity);
        } else {
          reminders.upcoming.push(activity);
        }

        // Mark reminder as sent
        await Activity.findByIdAndUpdate(activity._id, {
          reminder_sent: true,
          reminder_sent_at: new Date()
        });
      }

      // TODO: Send actual notifications/emails
      // NotificationService.sendActivityReminders(reminders);

      logger.info('ActivityService.processReminders: Processed reminders', {
        overdue: reminders.overdue.length,
        today: reminders.today.length,
        tomorrow: reminders.tomorrow.length,
        upcoming: reminders.upcoming.length
      });

      return {
        total: activitiesNeedingReminders.length,
        overdue: reminders.overdue.length,
        today: reminders.today.length,
        tomorrow: reminders.tomorrow.length,
        upcoming: reminders.upcoming.length
      };
    } catch (error) {
      logger.error('ActivityService.processReminders failed:', error.message);
      return {
        total: 0,
        overdue: 0,
        today: 0,
        tomorrow: 0,
        upcoming: 0,
        error: error.message
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Calculate deadline based on activity type settings
   * @private
   * @param {Object} activityType - Activity type configuration
   * @returns {Date} - Calculated deadline
   */
  _calculateDeadline(activityType) {
    const now = new Date();

    // Default to activity type's delay_count (in days)
    const delayDays = activityType.delay_count || 7;
    const delayUnit = activityType.delay_unit || 'days';

    const deadline = new Date(now);

    switch (delayUnit) {
      case 'hours':
        deadline.setHours(deadline.getHours() + delayDays);
        break;
      case 'days':
        deadline.setDate(deadline.getDate() + delayDays);
        break;
      case 'weeks':
        deadline.setDate(deadline.getDate() + (delayDays * 7));
        break;
      case 'months':
        deadline.setMonth(deadline.getMonth() + delayDays);
        break;
      default:
        deadline.setDate(deadline.getDate() + delayDays);
    }

    return deadline;
  }

  /**
   * Determine activity state based on deadline
   * @private
   * @param {Date} deadline - Activity deadline
   * @returns {String} - State (planned, today, overdue)
   */
  _determineState(deadline) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);

    if (deadlineDate < today) {
      return 'overdue';
    } else if (deadlineDate.getTime() === today.getTime()) {
      return 'today';
    } else {
      return 'planned';
    }
  }

  /**
   * Trigger chained activity creation
   * @private
   * @param {Object} completedActivity - The completed activity
   * @param {Object} activityType - Activity type with chaining config
   * @param {Object} context - Request context
   * @returns {Promise<Object|null>} - Created chained activity or null
   */
  async _triggerChainedActivity(completedActivity, activityType, context) {
    try {
      const nextActivityType = await ActivityType.findById(activityType.triggered_next_type_id).lean();
      if (!nextActivityType) {
        logger.error('ActivityService._triggerChainedActivity: Next activity type not found');
        return null;
      }

      // Calculate deadline for chained activity
      const chainedDeadline = this._calculateDeadline(nextActivityType);

      // Create chained activity
      const chainedData = {
        res_model: completedActivity.res_model,
        res_id: completedActivity.res_id,
        activity_type_id: nextActivityType._id,
        summary: nextActivityType.summary || nextActivityType.name,
        note: `Auto-created after completing: ${completedActivity.summary}`,
        date_deadline: chainedDeadline,
        user_id: completedActivity.user_id,
        previous_activity_id: completedActivity._id
      };

      const chainedActivity = await this.scheduleActivity(chainedData, context);

      // Log chained activity creation
      await AuditLogService.log(
        'create_chained_activity',
        'activity',
        chainedActivity?._id?.toString(),
        null,
        {
          ...context,
          details: {
            previous_activity_id: completedActivity._id,
            activity_type_id: nextActivityType._id
          }
        }
      );

      return chainedActivity;
    } catch (error) {
      logger.error('ActivityService._triggerChainedActivity failed:', error.message);
      return null;
    }
  }
}

// Export singleton instance
module.exports = new ActivityService();
