/**
 * Cycle Service - Sprint/Cycle Management
 *
 * This service provides a high-level API for managing development cycles/sprints.
 * It implements agile sprint patterns with automatic rollover, burndown tracking,
 * and velocity calculations.
 *
 * Features:
 * - Create and manage cycles (sprints)
 * - Start and complete cycles with metric tracking
 * - Automatic task rollover for incomplete work
 * - Burndown chart calculations
 * - Velocity and progress tracking
 * - Automatic next cycle creation
 */

const mongoose = require('mongoose');
const Cycle = require('../models/cycle.model');
const Task = require('../models/task.model');
const AuditLogService = require('./auditLog.service');
const logger = require('../utils/logger');

class CycleService {
  /**
   * Create a new cycle
   * @param {ObjectId} teamId - Team ID
   * @param {ObjectId} firmId - Firm ID
   * @param {Object} config - Configuration options
   * @param {String} config.name - Cycle name (auto-generated if not provided)
   * @param {Number} config.duration - Duration in days (default 14)
   * @param {Date} config.startDate - Start date (auto-calculated if not provided)
   * @param {Boolean} config.autoStart - Auto-start when previous cycle ends
   * @param {Boolean} config.autoRollover - Auto-rollover incomplete tasks
   * @param {Number} config.cooldownDays - Cooldown days between cycles
   * @param {Array} config.goals - Array of goal descriptions
   * @returns {Promise<Object|null>} Created cycle or null
   */
  async createCycle(teamId, firmId, config = {}) {
    try {
      // Validate required fields
      if (!teamId) {
        logger.error('CycleService.createCycle: Missing teamId');
        return null;
      }

      // Find last cycle to calculate start date
      const lastCycle = await Cycle.findOne({
        teamId: new mongoose.Types.ObjectId(teamId)
      }).sort({ endDate: -1 });

      // Calculate start date
      let startDate;
      if (config.startDate) {
        startDate = new Date(config.startDate);
      } else if (lastCycle) {
        // Start after the last cycle's end date plus cooldown
        startDate = new Date(lastCycle.endDate);
        const cooldown = config.cooldownDays ?? lastCycle.cooldownDays ?? 0;
        startDate.setDate(startDate.getDate() + cooldown + 1);
      } else {
        // First cycle - start from today
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
      }

      // Get duration
      const duration = config.duration || lastCycle?.duration || 14;

      // Calculate end date
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + duration);

      // Generate name if not provided
      let name = config.name;
      if (!name) {
        const count = await Cycle.countDocuments({ teamId });
        name = `Sprint ${count + 1}`;
      }

      // Prepare goals array
      const goals = Array.isArray(config.goals)
        ? config.goals.map(g => ({ description: g, completed: false }))
        : [];

      // Create cycle data
      const cycleData = {
        name,
        teamId: new mongoose.Types.ObjectId(teamId),
        firmId: firmId ? new mongoose.Types.ObjectId(firmId) : undefined,
        duration,
        startDate,
        endDate,
        status: 'upcoming',
        autoStart: config.autoStart ?? lastCycle?.autoStart ?? true,
        autoRollover: config.autoRollover ?? lastCycle?.autoRollover ?? true,
        cooldownDays: config.cooldownDays ?? lastCycle?.cooldownDays ?? 0,
        goals,
        metrics: {
          plannedItems: 0,
          completedItems: 0,
          addedMidCycle: 0,
          rolledOver: 0,
          velocity: 0
        }
      };

      // Create cycle
      const cycle = await Cycle.create(cycleData);

      // Log to audit
      if (firmId) {
        await AuditLogService.log(
          'create_cycle',
          'cycle',
          cycle._id.toString(),
          null,
          {
            firmId: firmId.toString(),
            details: {
              teamId: teamId.toString(),
              name: cycle.name,
              duration: cycle.duration,
              startDate: cycle.startDate,
              endDate: cycle.endDate
            }
          }
        );
      }

      logger.info('CycleService.createCycle: Cycle created', {
        cycleId: cycle._id,
        name: cycle.name,
        teamId: teamId.toString()
      });

      return cycle;
    } catch (error) {
      logger.error('CycleService.createCycle failed:', error.message);
      return null;
    }
  }

  /**
   * Start a cycle
   * @param {ObjectId} cycleId - Cycle ID
   * @param {ObjectId} userId - User ID performing the action
   * @returns {Promise<Object|null>} Updated cycle or null
   */
  async startCycle(cycleId, userId) {
    try {
      // Get cycle
      const cycle = await Cycle.findById(cycleId);
      if (!cycle) {
        logger.error('CycleService.startCycle: Cycle not found');
        return null;
      }

      // Verify cycle is upcoming
      if (cycle.status !== 'upcoming') {
        logger.error('CycleService.startCycle: Cycle is not in upcoming status', {
          cycleId: cycleId.toString(),
          status: cycle.status
        });
        return null;
      }

      // Count planned items (tasks already in this cycle)
      const plannedItems = await Task.countDocuments({
        cycleId: new mongoose.Types.ObjectId(cycleId),
        status: { $ne: 'canceled' }
      });

      // Update cycle
      cycle.status = 'active';
      cycle.metrics.plannedItems = plannedItems;
      await cycle.save();

      // Log to audit
      if (cycle.firmId) {
        await AuditLogService.log(
          'start_cycle',
          'cycle',
          cycleId.toString(),
          null,
          {
            firmId: cycle.firmId.toString(),
            userId: userId?.toString(),
            details: {
              name: cycle.name,
              plannedItems
            }
          }
        );
      }

      logger.info('CycleService.startCycle: Cycle started', {
        cycleId: cycleId.toString(),
        plannedItems
      });

      return cycle;
    } catch (error) {
      logger.error('CycleService.startCycle failed:', error.message);
      return null;
    }
  }

  /**
   * Complete a cycle
   * @param {ObjectId} cycleId - Cycle ID
   * @param {ObjectId} userId - User ID performing the action
   * @returns {Promise<Object|null>} Completed cycle with metrics or null
   */
  async completeCycle(cycleId, userId) {
    try {
      // Get cycle
      const cycle = await Cycle.findById(cycleId);
      if (!cycle) {
        logger.error('CycleService.completeCycle: Cycle not found');
        return null;
      }

      // Get all tasks in this cycle
      const tasks = await Task.find({
        cycleId: new mongoose.Types.ObjectId(cycleId)
      });

      // Calculate metrics
      const completedItems = tasks.filter(t => t.status === 'done').length;
      const addedMidCycle = tasks.filter(t => {
        // Tasks added after cycle started
        return t.createdAt > cycle.startDate;
      }).length;

      // Calculate velocity (completed items per day)
      const velocity = parseFloat((completedItems / cycle.duration).toFixed(2));

      // Update cycle metrics
      cycle.metrics.completedItems = completedItems;
      cycle.metrics.addedMidCycle = addedMidCycle;
      cycle.metrics.velocity = velocity;
      cycle.status = 'completed';

      // Handle rollover if enabled
      let nextCycle = null;
      let rolledOverCount = 0;

      if (cycle.autoRollover) {
        // Get or create next cycle
        nextCycle = await this.getOrCreateNextCycle(cycle);

        if (nextCycle) {
          // Rollover incomplete tasks
          rolledOverCount = await this.rolloverTasks(cycleId, nextCycle._id);
          cycle.metrics.rolledOver = rolledOverCount;

          // Update next cycle's metrics
          if (nextCycle.status === 'upcoming') {
            const nextCyclePlannedItems = await Task.countDocuments({
              cycleId: nextCycle._id,
              status: { $ne: 'canceled' }
            });
            nextCycle.metrics.plannedItems = nextCyclePlannedItems;
            nextCycle.metrics.rolledOver = rolledOverCount;
            await nextCycle.save();
          }
        }
      }

      await cycle.save();

      // Auto-create next cycle if autoStart enabled and none exists
      if (cycle.autoStart && !nextCycle) {
        nextCycle = await this.getOrCreateNextCycle(cycle);
      }

      // Log to audit
      if (cycle.firmId) {
        await AuditLogService.log(
          'complete_cycle',
          'cycle',
          cycleId.toString(),
          null,
          {
            firmId: cycle.firmId.toString(),
            userId: userId?.toString(),
            details: {
              name: cycle.name,
              completedItems,
              addedMidCycle,
              velocity,
              rolledOver: rolledOverCount,
              nextCycleId: nextCycle?._id?.toString()
            }
          }
        );
      }

      logger.info('CycleService.completeCycle: Cycle completed', {
        cycleId: cycleId.toString(),
        completedItems,
        velocity,
        rolledOver: rolledOverCount
      });

      return {
        ...cycle.toObject(),
        nextCycle: nextCycle?.toObject()
      };
    } catch (error) {
      logger.error('CycleService.completeCycle failed:', error.message);
      return null;
    }
  }

  /**
   * Rollover incomplete tasks from one cycle to another
   * @param {ObjectId} fromCycleId - Source cycle ID
   * @param {ObjectId} toCycleId - Destination cycle ID
   * @returns {Promise<Number>} Count of rolled over tasks
   */
  async rolloverTasks(fromCycleId, toCycleId) {
    try {
      // Find incomplete tasks in fromCycle
      const incompleteTasks = await Task.find({
        cycleId: new mongoose.Types.ObjectId(fromCycleId),
        status: { $nin: ['done', 'canceled'] }
      });

      if (incompleteTasks.length === 0) {
        return 0;
      }

      // Update their cycleId to toCycle
      const taskIds = incompleteTasks.map(t => t._id);
      await Task.updateMany(
        { _id: { $in: taskIds } },
        {
          $set: {
            cycleId: new mongoose.Types.ObjectId(toCycleId),
            rolledOverFrom: new mongoose.Types.ObjectId(fromCycleId)
          },
          $inc: { rolloverCount: 1 }
        }
      );

      logger.info('CycleService.rolloverTasks: Tasks rolled over', {
        fromCycleId: fromCycleId.toString(),
        toCycleId: toCycleId.toString(),
        count: incompleteTasks.length
      });

      return incompleteTasks.length;
    } catch (error) {
      logger.error('CycleService.rolloverTasks failed:', error.message);
      return 0;
    }
  }

  /**
   * Get cycle progress
   * @param {ObjectId} cycleId - Cycle ID
   * @returns {Promise<Object|null>} Progress summary or null
   */
  async getCycleProgress(cycleId) {
    try {
      // Get cycle
      const cycle = await Cycle.findById(cycleId);
      if (!cycle) {
        logger.error('CycleService.getCycleProgress: Cycle not found');
        return null;
      }

      // Get tasks
      const tasks = await Task.find({
        cycleId: new mongoose.Types.ObjectId(cycleId)
      });

      // Calculate task progress
      const total = tasks.length;
      const completed = tasks.filter(t => t.status === 'done').length;
      const inProgress = tasks.filter(t => t.status === 'in_progress').length;
      const remaining = total - completed;

      // Calculate days
      const now = new Date();
      const totalDays = cycle.duration;
      const elapsedDays = Math.max(0,
        Math.floor((now - cycle.startDate) / (1000 * 60 * 60 * 24))
      );
      const remainingDays = Math.max(0,
        Math.floor((cycle.endDate - now) / (1000 * 60 * 60 * 24))
      );

      // Calculate completion percentage
      const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Check if on track
      // Expected: (elapsedDays / totalDays) * total tasks should be completed
      const expectedCompleted = (elapsedDays / totalDays) * total;
      const onTrack = completed >= expectedCompleted;

      return {
        cycleId: cycle._id,
        cycleName: cycle.name,
        status: cycle.status,
        tasks: {
          total,
          completed,
          inProgress,
          remaining,
          completionPercentage
        },
        days: {
          total: totalDays,
          elapsed: Math.min(elapsedDays, totalDays),
          remaining: remainingDays
        },
        onTrack,
        velocity: cycle.metrics.velocity,
        startDate: cycle.startDate,
        endDate: cycle.endDate
      };
    } catch (error) {
      logger.error('CycleService.getCycleProgress failed:', error.message);
      return null;
    }
  }

  /**
   * Calculate burndown chart data
   * @param {ObjectId} cycleId - Cycle ID
   * @returns {Promise<Array>} Array of burndown data points
   */
  async calculateBurndown(cycleId) {
    try {
      // Get cycle
      const cycle = await Cycle.findById(cycleId);
      if (!cycle) {
        logger.error('CycleService.calculateBurndown: Cycle not found');
        return [];
      }

      // Get all tasks in this cycle
      const tasks = await Task.find({
        cycleId: new mongoose.Types.ObjectId(cycleId)
      }).select('status completedAt createdAt');

      const totalTasks = tasks.length;

      // Generate burndown data for each day
      const burndownData = [];
      const startDate = new Date(cycle.startDate);
      const endDate = new Date(cycle.endDate);
      const now = new Date();

      // Iterate through each day from start to end
      let currentDate = new Date(startDate);
      let dayIndex = 0;

      while (currentDate <= endDate) {
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);

        // Count tasks completed by this day
        const completedByDay = tasks.filter(t => {
          return t.status === 'done' &&
            t.completedAt &&
            new Date(t.completedAt) <= dayEnd;
        }).length;

        // Remaining tasks
        const remaining = totalTasks - completedByDay;

        // Calculate ideal burndown line
        const ideal = Math.max(0, totalTasks - (totalTasks / cycle.duration) * dayIndex);

        burndownData.push({
          date: new Date(currentDate),
          remaining,
          ideal: Math.round(ideal),
          isToday: currentDate.toDateString() === now.toDateString()
        });

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
        dayIndex++;
      }

      return burndownData;
    } catch (error) {
      logger.error('CycleService.calculateBurndown failed:', error.message);
      return [];
    }
  }

  /**
   * Get or create next cycle
   * @param {Object} currentCycle - Current cycle object
   * @returns {Promise<Object|null>} Next cycle or null
   */
  async getOrCreateNextCycle(currentCycle) {
    try {
      // Find upcoming cycle for same team
      let nextCycle = await Cycle.findOne({
        teamId: currentCycle.teamId,
        status: 'upcoming',
        startDate: { $gt: currentCycle.endDate }
      }).sort({ startDate: 1 });

      // If none exists, create one
      if (!nextCycle) {
        const startDate = new Date(currentCycle.endDate);
        startDate.setDate(startDate.getDate() + (currentCycle.cooldownDays || 0) + 1);

        const count = await Cycle.countDocuments({ teamId: currentCycle.teamId });
        const name = `Sprint ${count + 1}`;

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + currentCycle.duration);

        nextCycle = await Cycle.create({
          name,
          teamId: currentCycle.teamId,
          firmId: currentCycle.firmId,
          duration: currentCycle.duration,
          startDate,
          endDate,
          status: 'upcoming',
          autoStart: currentCycle.autoStart,
          autoRollover: currentCycle.autoRollover,
          cooldownDays: currentCycle.cooldownDays,
          goals: [],
          metrics: {
            plannedItems: 0,
            completedItems: 0,
            addedMidCycle: 0,
            rolledOver: 0,
            velocity: 0
          }
        });

        logger.info('CycleService.getOrCreateNextCycle: Next cycle created', {
          cycleId: nextCycle._id,
          name: nextCycle.name
        });
      }

      return nextCycle;
    } catch (error) {
      logger.error('CycleService.getOrCreateNextCycle failed:', error.message);
      return null;
    }
  }

  /**
   * Get active cycle for team
   * @param {ObjectId} teamId - Team ID
   * @param {ObjectId} firmId - Firm ID (optional)
   * @returns {Promise<Object|null>} Active cycle or null
   */
  async getActiveCycle(teamId, firmId = null) {
    try {
      const query = {
        teamId: new mongoose.Types.ObjectId(teamId),
        status: 'active'
      };

      if (firmId) {
        query.firmId = new mongoose.Types.ObjectId(firmId);
      }

      const cycle = await Cycle.findOne(query);
      return cycle;
    } catch (error) {
      logger.error('CycleService.getActiveCycle failed:', error.message);
      return null;
    }
  }

  /**
   * Get cycle stats/velocity for a team
   * @param {ObjectId} teamId - Team ID
   * @param {ObjectId} firmId - Firm ID (optional)
   * @param {Number} count - Number of recent completed cycles to analyze (default 5)
   * @returns {Promise<Object>} Cycle statistics
   */
  async getCycleStats(teamId, firmId = null, count = 5) {
    try {
      const query = {
        teamId: new mongoose.Types.ObjectId(teamId),
        status: 'completed'
      };

      if (firmId) {
        query.firmId = new mongoose.Types.ObjectId(firmId);
      }

      // Get last N completed cycles
      const cycles = await Cycle.find(query)
        .sort({ endDate: -1 })
        .limit(count);

      if (cycles.length === 0) {
        return {
          teamId: teamId.toString(),
          cyclesAnalyzed: 0,
          averageVelocity: 0,
          averageCompletion: 0,
          trend: 'stable',
          cycles: []
        };
      }

      // Calculate average velocity
      const totalVelocity = cycles.reduce((sum, c) => sum + (c.metrics.velocity || 0), 0);
      const averageVelocity = parseFloat((totalVelocity / cycles.length).toFixed(2));

      // Calculate average completion rate
      const completionRates = cycles.map(c => {
        const total = c.metrics.plannedItems + c.metrics.addedMidCycle;
        return total > 0 ? (c.metrics.completedItems / total) * 100 : 0;
      });
      const averageCompletion = parseFloat(
        (completionRates.reduce((a, b) => a + b, 0) / cycles.length).toFixed(2)
      );

      // Calculate trend (compare first half with second half)
      let trend = 'stable';
      if (cycles.length >= 4) {
        const midpoint = Math.floor(cycles.length / 2);
        const recentVelocity = cycles.slice(0, midpoint).reduce((sum, c) => sum + c.metrics.velocity, 0) / midpoint;
        const olderVelocity = cycles.slice(midpoint).reduce((sum, c) => sum + c.metrics.velocity, 0) / (cycles.length - midpoint);

        if (recentVelocity > olderVelocity * 1.1) {
          trend = 'improving';
        } else if (recentVelocity < olderVelocity * 0.9) {
          trend = 'declining';
        }
      }

      return {
        teamId: teamId.toString(),
        cyclesAnalyzed: cycles.length,
        averageVelocity,
        averageCompletion,
        trend,
        cycles: cycles.map(c => ({
          cycleId: c._id,
          name: c.name,
          velocity: c.metrics.velocity,
          completedItems: c.metrics.completedItems,
          plannedItems: c.metrics.plannedItems,
          addedMidCycle: c.metrics.addedMidCycle,
          rolledOver: c.metrics.rolledOver,
          startDate: c.startDate,
          endDate: c.endDate
        }))
      };
    } catch (error) {
      logger.error('CycleService.getCycleStats failed:', error.message);
      return {
        teamId: teamId.toString(),
        cyclesAnalyzed: 0,
        averageVelocity: 0,
        averageCompletion: 0,
        trend: 'stable',
        cycles: []
      };
    }
  }

  /**
   * Add task to cycle
   * @param {ObjectId} taskId - Task ID
   * @param {ObjectId} cycleId - Cycle ID
   * @param {ObjectId} userId - User ID performing the action
   * @returns {Promise<Object|null>} Updated task or null
   */
  async addTaskToCycle(taskId, cycleId, userId) {
    try {
      // Get cycle
      const cycle = await Cycle.findById(cycleId);
      if (!cycle) {
        logger.error('CycleService.addTaskToCycle: Cycle not found');
        return null;
      }

      // Get task
      const task = await Task.findById(taskId);
      if (!task) {
        logger.error('CycleService.addTaskToCycle: Task not found');
        return null;
      }

      // Update task
      task.cycleId = new mongoose.Types.ObjectId(cycleId);
      await task.save();

      // If cycle is active, increment addedMidCycle
      if (cycle.status === 'active' && task.createdAt > cycle.startDate) {
        cycle.metrics.addedMidCycle = (cycle.metrics.addedMidCycle || 0) + 1;
        await cycle.save();
      }

      // Log to audit
      if (cycle.firmId) {
        await AuditLogService.log(
          'add_task_to_cycle',
          'task',
          taskId.toString(),
          null,
          {
            firmId: cycle.firmId.toString(),
            userId: userId?.toString(),
            details: {
              cycleId: cycleId.toString(),
              cycleName: cycle.name,
              taskTitle: task.title
            }
          }
        );
      }

      logger.info('CycleService.addTaskToCycle: Task added to cycle', {
        taskId: taskId.toString(),
        cycleId: cycleId.toString()
      });

      return task;
    } catch (error) {
      logger.error('CycleService.addTaskToCycle failed:', error.message);
      return null;
    }
  }

  /**
   * Remove task from cycle
   * @param {ObjectId} taskId - Task ID
   * @param {ObjectId} userId - User ID performing the action
   * @returns {Promise<Object|null>} Updated task or null
   */
  async removeTaskFromCycle(taskId, userId) {
    try {
      // Get task
      const task = await Task.findById(taskId);
      if (!task) {
        logger.error('CycleService.removeTaskFromCycle: Task not found');
        return null;
      }

      const oldCycleId = task.cycleId;

      // Clear cycleId
      task.cycleId = undefined;
      await task.save();

      // Log to audit
      if (task.firmId && oldCycleId) {
        await AuditLogService.log(
          'remove_task_from_cycle',
          'task',
          taskId.toString(),
          null,
          {
            firmId: task.firmId.toString(),
            userId: userId?.toString(),
            details: {
              cycleId: oldCycleId.toString(),
              taskTitle: task.title
            }
          }
        );
      }

      logger.info('CycleService.removeTaskFromCycle: Task removed from cycle', {
        taskId: taskId.toString(),
        cycleId: oldCycleId?.toString()
      });

      return task;
    } catch (error) {
      logger.error('CycleService.removeTaskFromCycle failed:', error.message);
      return null;
    }
  }
}

// Export singleton instance
module.exports = new CycleService();
