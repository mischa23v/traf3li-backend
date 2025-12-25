/**
 * Walkthrough Service - Interactive Product Tours and Feature Guides
 *
 * This service provides a high-level API for managing walkthroughs (product tours,
 * feature guides, onboarding flows) and tracking user progress through them.
 *
 * Features:
 * - Get active walkthroughs filtered by audience and trigger conditions
 * - Track user progress through walkthrough steps
 * - Support for skipping steps and entire walkthroughs
 * - Analytics and completion stats
 * - Admin functions for creating/updating walkthroughs
 */

const mongoose = require('mongoose');
const Walkthrough = require('../models/walkthrough.model');
const WalkthroughProgress = require('../models/walkthroughProgress.model');
const AuditLogService = require('./auditLog.service');
const logger = require('../utils/logger');

class WalkthroughService {
  /**
   * Get active walkthroughs for a user
   * Filters by audience, trigger conditions, and excludes completed/skipped
   * @param {String} userId - User ID
   * @param {String} firmId - Firm ID
   * @param {Object} context - Context for trigger evaluation
   * @param {String} context.page - Current page/route
   * @param {String} context.feature - Current feature
   * @param {Object} context.userRole - User role
   * @param {Object} context.metadata - Additional metadata
   * @returns {Promise<Array>} - Array of applicable walkthroughs
   */
  async getActiveWalkthroughs(userId, firmId, context = {}) {
    try {
      // Get user's progress to exclude completed/skipped
      const userProgress = await WalkthroughProgress.find({
        userId: new mongoose.Types.ObjectId(userId),
        status: { $in: ['completed', 'skipped'] }
      })
        .select('walkthroughId')
        .lean();

      const excludedIds = userProgress.map(p => p.walkthroughId);

      // Find active walkthroughs for the firm
      const walkthroughs = await Walkthrough.find({
        firmId: new mongoose.Types.ObjectId(firmId),
        isActive: true,
        _id: { $nin: excludedIds }
      })
        .sort({ priority: -1, createdAt: 1 })
        .lean();

      // Filter by audience and trigger conditions
      const applicable = [];
      for (const walkthrough of walkthroughs) {
        // Check audience targeting
        if (!this._matchesAudience(walkthrough, userId, context)) {
          continue;
        }

        // Check trigger conditions
        if (walkthrough.triggerConditions && walkthrough.triggerConditions.length > 0) {
          const conditionsMet = this.checkTriggerConditions(
            walkthrough.triggerConditions,
            context
          );
          if (!conditionsMet) {
            continue;
          }
        }

        applicable.push(walkthrough);
      }

      logger.info('WalkthroughService.getActiveWalkthroughs:', {
        userId,
        firmId,
        total: walkthroughs.length,
        applicable: applicable.length
      });

      return applicable;
    } catch (error) {
      logger.error('WalkthroughService.getActiveWalkthroughs failed:', error.message);
      return [];
    }
  }

  /**
   * Get a single walkthrough by ID
   * @param {String} walkthroughId - Walkthrough ID
   * @returns {Promise<Object|null>} - Walkthrough or null
   */
  async getWalkthroughById(walkthroughId) {
    try {
      const walkthrough = await Walkthrough.findById(walkthroughId).lean();

      if (!walkthrough) {
        logger.warn('WalkthroughService.getWalkthroughById: Walkthrough not found', {
          walkthroughId
        });
        return null;
      }

      return walkthrough;
    } catch (error) {
      logger.error('WalkthroughService.getWalkthroughById failed:', error.message);
      return null;
    }
  }

  /**
   * Start a walkthrough for a user
   * Creates progress record and returns first step
   * @param {String} userId - User ID
   * @param {String} walkthroughId - Walkthrough ID
   * @returns {Promise<Object|null>} - Progress record with first step or null
   */
  async startWalkthrough(userId, walkthroughId) {
    try {
      // Get walkthrough
      const walkthrough = await Walkthrough.findById(walkthroughId);
      if (!walkthrough) {
        logger.error('WalkthroughService.startWalkthrough: Walkthrough not found');
        return null;
      }

      if (!walkthrough.isActive) {
        logger.error('WalkthroughService.startWalkthrough: Walkthrough is not active');
        return null;
      }

      // Check if progress already exists
      let progress = await WalkthroughProgress.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        walkthroughId: new mongoose.Types.ObjectId(walkthroughId)
      });

      // Create new progress if doesn't exist
      if (!progress) {
        progress = await WalkthroughProgress.create({
          userId: new mongoose.Types.ObjectId(userId),
          walkthroughId: new mongoose.Types.ObjectId(walkthroughId),
          firmId: walkthrough.firmId,
          currentStepOrder: 0,
          status: 'in_progress',
          startedAt: new Date(),
          stepsCompleted: [],
          stepsSkipped: []
        });
      } else if (progress.status === 'completed' || progress.status === 'skipped') {
        // Reset if previously completed or skipped
        progress.status = 'in_progress';
        progress.currentStepOrder = 0;
        progress.startedAt = new Date();
        progress.completedAt = null;
        progress.stepsCompleted = [];
        progress.stepsSkipped = [];
        await progress.save();
      }

      // Get first step
      const firstStep = walkthrough.steps && walkthrough.steps.length > 0
        ? walkthrough.steps[0]
        : null;

      // Log to audit
      await AuditLogService.log(
        'start_walkthrough',
        'walkthrough_progress',
        progress._id.toString(),
        null,
        {
          userId,
          firmId: walkthrough.firmId,
          details: {
            walkthroughId,
            walkthroughName: walkthrough.name
          }
        }
      );

      return {
        progress: progress.toObject(),
        currentStep: firstStep,
        totalSteps: walkthrough.steps ? walkthrough.steps.length : 0
      };
    } catch (error) {
      logger.error('WalkthroughService.startWalkthrough failed:', error.message);
      return null;
    }
  }

  /**
   * Advance to the next step in a walkthrough
   * Updates progress and returns next step or completion status
   * @param {String} userId - User ID
   * @param {String} walkthroughId - Walkthrough ID
   * @returns {Promise<Object|null>} - Next step info or completion status
   */
  async advanceStep(userId, walkthroughId) {
    try {
      // Get progress
      const progress = await WalkthroughProgress.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        walkthroughId: new mongoose.Types.ObjectId(walkthroughId)
      });

      if (!progress) {
        logger.error('WalkthroughService.advanceStep: Progress not found');
        return null;
      }

      // Get walkthrough
      const walkthrough = await Walkthrough.findById(walkthroughId);
      if (!walkthrough) {
        logger.error('WalkthroughService.advanceStep: Walkthrough not found');
        return null;
      }

      const totalSteps = walkthrough.steps ? walkthrough.steps.length : 0;

      // Mark current step as completed if not already
      if (!progress.stepsCompleted.includes(progress.currentStepOrder)) {
        progress.stepsCompleted.push(progress.currentStepOrder);
      }

      // Move to next step
      const nextStepOrder = progress.currentStepOrder + 1;

      // Check if walkthrough is complete
      if (nextStepOrder >= totalSteps) {
        progress.status = 'completed';
        progress.completedAt = new Date();
        progress.currentStepOrder = totalSteps - 1;
        await progress.save();

        // Log completion
        await AuditLogService.log(
          'complete_walkthrough',
          'walkthrough_progress',
          progress._id.toString(),
          null,
          {
            userId,
            firmId: walkthrough.firmId,
            details: {
              walkthroughId,
              walkthroughName: walkthrough.name,
              stepsCompleted: progress.stepsCompleted.length,
              totalSteps
            }
          }
        );

        return {
          completed: true,
          progress: progress.toObject(),
          totalSteps
        };
      }

      // Update to next step
      progress.currentStepOrder = nextStepOrder;
      await progress.save();

      const nextStep = walkthrough.steps[nextStepOrder];

      return {
        completed: false,
        progress: progress.toObject(),
        currentStep: nextStep,
        totalSteps
      };
    } catch (error) {
      logger.error('WalkthroughService.advanceStep failed:', error.message);
      return null;
    }
  }

  /**
   * Skip a specific step in a walkthrough
   * @param {String} userId - User ID
   * @param {String} walkthroughId - Walkthrough ID
   * @param {Number} stepOrder - Step order to skip
   * @returns {Promise<Object|null>} - Updated progress or null
   */
  async skipStep(userId, walkthroughId, stepOrder) {
    try {
      const progress = await WalkthroughProgress.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        walkthroughId: new mongoose.Types.ObjectId(walkthroughId)
      });

      if (!progress) {
        logger.error('WalkthroughService.skipStep: Progress not found');
        return null;
      }

      // Add to skipped steps if not already there
      if (!progress.stepsSkipped.includes(stepOrder)) {
        progress.stepsSkipped.push(stepOrder);
      }

      await progress.save();

      // Log skip
      await AuditLogService.log(
        'skip_step',
        'walkthrough_progress',
        progress._id.toString(),
        null,
        {
          userId,
          details: {
            walkthroughId,
            stepOrder
          }
        }
      );

      return progress.toObject();
    } catch (error) {
      logger.error('WalkthroughService.skipStep failed:', error.message);
      return null;
    }
  }

  /**
   * Mark a walkthrough as complete
   * @param {String} userId - User ID
   * @param {String} walkthroughId - Walkthrough ID
   * @returns {Promise<Object|null>} - Updated progress or null
   */
  async completeWalkthrough(userId, walkthroughId) {
    try {
      const progress = await WalkthroughProgress.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        walkthroughId: new mongoose.Types.ObjectId(walkthroughId)
      });

      if (!progress) {
        logger.error('WalkthroughService.completeWalkthrough: Progress not found');
        return null;
      }

      progress.status = 'completed';
      progress.completedAt = new Date();
      await progress.save();

      // Get walkthrough for logging
      const walkthrough = await Walkthrough.findById(walkthroughId);

      // Log completion
      await AuditLogService.log(
        'complete_walkthrough',
        'walkthrough_progress',
        progress._id.toString(),
        null,
        {
          userId,
          firmId: walkthrough?.firmId,
          details: {
            walkthroughId,
            walkthroughName: walkthrough?.name
          }
        }
      );

      return progress.toObject();
    } catch (error) {
      logger.error('WalkthroughService.completeWalkthrough failed:', error.message);
      return null;
    }
  }

  /**
   * Skip an entire walkthrough
   * @param {String} userId - User ID
   * @param {String} walkthroughId - Walkthrough ID
   * @param {String} reason - Reason for skipping (optional)
   * @returns {Promise<Object|null>} - Updated progress or null
   */
  async skipWalkthrough(userId, walkthroughId, reason = null) {
    try {
      // Find or create progress
      let progress = await WalkthroughProgress.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        walkthroughId: new mongoose.Types.ObjectId(walkthroughId)
      });

      if (!progress) {
        // Get walkthrough for firm info
        const walkthrough = await Walkthrough.findById(walkthroughId);
        if (!walkthrough) {
          logger.error('WalkthroughService.skipWalkthrough: Walkthrough not found');
          return null;
        }

        // Create new progress in skipped state
        progress = await WalkthroughProgress.create({
          userId: new mongoose.Types.ObjectId(userId),
          walkthroughId: new mongoose.Types.ObjectId(walkthroughId),
          firmId: walkthrough.firmId,
          status: 'skipped',
          skipReason: reason,
          skippedAt: new Date()
        });
      } else {
        // Update existing progress
        progress.status = 'skipped';
        progress.skipReason = reason;
        progress.skippedAt = new Date();
        await progress.save();
      }

      // Log skip
      await AuditLogService.log(
        'skip_walkthrough',
        'walkthrough_progress',
        progress._id.toString(),
        null,
        {
          userId,
          details: {
            walkthroughId,
            reason
          }
        }
      );

      return progress.toObject();
    } catch (error) {
      logger.error('WalkthroughService.skipWalkthrough failed:', error.message);
      return null;
    }
  }

  /**
   * Reset walkthrough progress for a user
   * @param {String} userId - User ID
   * @param {String} walkthroughId - Walkthrough ID
   * @returns {Promise<Object|null>} - Reset progress or null
   */
  async resetWalkthrough(userId, walkthroughId) {
    try {
      const progress = await WalkthroughProgress.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        walkthroughId: new mongoose.Types.ObjectId(walkthroughId)
      });

      if (!progress) {
        logger.error('WalkthroughService.resetWalkthrough: Progress not found');
        return null;
      }

      // Reset progress
      progress.status = 'not_started';
      progress.currentStepOrder = 0;
      progress.stepsCompleted = [];
      progress.stepsSkipped = [];
      progress.startedAt = null;
      progress.completedAt = null;
      progress.skippedAt = null;
      progress.skipReason = null;
      await progress.save();

      // Log reset
      await AuditLogService.log(
        'reset_walkthrough',
        'walkthrough_progress',
        progress._id.toString(),
        null,
        {
          userId,
          details: {
            walkthroughId
          }
        }
      );

      return progress.toObject();
    } catch (error) {
      logger.error('WalkthroughService.resetWalkthrough failed:', error.message);
      return null;
    }
  }

  /**
   * Get all walkthrough progress for a user
   * @param {String} userId - User ID
   * @returns {Promise<Array>} - Array of progress records
   */
  async getUserProgress(userId) {
    try {
      const progress = await WalkthroughProgress.find({
        userId: new mongoose.Types.ObjectId(userId)
      })
        .populate('walkthroughId', 'name description category type')
        .sort({ updatedAt: -1 })
        .lean();

      return progress;
    } catch (error) {
      logger.error('WalkthroughService.getUserProgress failed:', error.message);
      return [];
    }
  }

  /**
   * Get walkthrough completion statistics for a firm
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object>} - Completion stats
   */
  async getWalkthroughStats(firmId) {
    try {
      // Get all walkthroughs for the firm
      const walkthroughs = await Walkthrough.find({
        firmId: new mongoose.Types.ObjectId(firmId)
      }).lean();

      if (walkthroughs.length === 0) {
        return {
          totalWalkthroughs: 0,
          activeWalkthroughs: 0,
          byWalkthrough: []
        };
      }

      const walkthroughIds = walkthroughs.map(w => w._id);

      // Aggregate progress stats
      const progressStats = await WalkthroughProgress.aggregate([
        {
          $match: {
            walkthroughId: { $in: walkthroughIds }
          }
        },
        {
          $group: {
            _id: '$walkthroughId',
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            inProgress: {
              $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
            },
            skipped: {
              $sum: { $cond: [{ $eq: ['$status', 'skipped'] }, 1, 0] }
            },
            notStarted: {
              $sum: { $cond: [{ $eq: ['$status', 'not_started'] }, 1, 0] }
            }
          }
        }
      ]);

      // Map stats to walkthroughs
      const byWalkthrough = walkthroughs.map(walkthrough => {
        const stats = progressStats.find(
          s => s._id.toString() === walkthrough._id.toString()
        ) || {
          total: 0,
          completed: 0,
          inProgress: 0,
          skipped: 0,
          notStarted: 0
        };

        const completionRate = stats.total > 0
          ? Math.round((stats.completed / stats.total) * 100)
          : 0;

        return {
          walkthroughId: walkthrough._id,
          name: walkthrough.name,
          category: walkthrough.category,
          type: walkthrough.type,
          isActive: walkthrough.isActive,
          stats: {
            total: stats.total,
            completed: stats.completed,
            inProgress: stats.inProgress,
            skipped: stats.skipped,
            notStarted: stats.notStarted,
            completionRate
          }
        };
      });

      return {
        totalWalkthroughs: walkthroughs.length,
        activeWalkthroughs: walkthroughs.filter(w => w.isActive).length,
        byWalkthrough
      };
    } catch (error) {
      logger.error('WalkthroughService.getWalkthroughStats failed:', error.message);
      return {
        totalWalkthroughs: 0,
        activeWalkthroughs: 0,
        byWalkthrough: []
      };
    }
  }

  /**
   * Create a new walkthrough (admin function)
   * @param {Object} data - Walkthrough data
   * @param {String} userId - User ID creating the walkthrough
   * @returns {Promise<Object|null>} - Created walkthrough or null
   */
  async createWalkthrough(data, userId) {
    try {
      // Validate required fields
      if (!data.name || !data.firmId) {
        logger.error('WalkthroughService.createWalkthrough: Missing required fields');
        return null;
      }

      // Prepare walkthrough data
      const walkthroughData = {
        firmId: new mongoose.Types.ObjectId(data.firmId),
        name: data.name,
        description: data.description || null,
        category: data.category || 'general',
        type: data.type || 'feature_tour',
        steps: data.steps || [],
        triggerConditions: data.triggerConditions || [],
        audience: data.audience || {},
        priority: data.priority !== undefined ? data.priority : 5,
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdBy: new mongoose.Types.ObjectId(userId)
      };

      // Create walkthrough
      const walkthrough = await Walkthrough.create(walkthroughData);

      // Log creation
      await AuditLogService.log(
        'create',
        'walkthrough',
        walkthrough._id.toString(),
        null,
        {
          userId,
          firmId: data.firmId,
          details: {
            name: walkthrough.name,
            category: walkthrough.category,
            type: walkthrough.type,
            stepsCount: walkthrough.steps ? walkthrough.steps.length : 0
          }
        }
      );

      return walkthrough.toObject();
    } catch (error) {
      logger.error('WalkthroughService.createWalkthrough failed:', error.message);
      return null;
    }
  }

  /**
   * Update a walkthrough
   * @param {String} walkthroughId - Walkthrough ID
   * @param {Object} data - Update data
   * @returns {Promise<Object|null>} - Updated walkthrough or null
   */
  async updateWalkthrough(walkthroughId, data) {
    try {
      const walkthrough = await Walkthrough.findById(walkthroughId);

      if (!walkthrough) {
        logger.error('WalkthroughService.updateWalkthrough: Walkthrough not found');
        return null;
      }

      // Store before state for audit
      const beforeState = walkthrough.toObject();

      // Update allowed fields
      const allowedFields = [
        'name',
        'description',
        'category',
        'type',
        'steps',
        'triggerConditions',
        'audience',
        'priority',
        'isActive'
      ];

      allowedFields.forEach(field => {
        if (data[field] !== undefined) {
          walkthrough[field] = data[field];
        }
      });

      await walkthrough.save();

      // Log update
      await AuditLogService.log(
        'update',
        'walkthrough',
        walkthroughId,
        { before: beforeState, after: walkthrough.toObject() },
        {
          firmId: walkthrough.firmId,
          details: {
            name: walkthrough.name
          }
        }
      );

      return walkthrough.toObject();
    } catch (error) {
      logger.error('WalkthroughService.updateWalkthrough failed:', error.message);
      return null;
    }
  }

  /**
   * Delete a walkthrough (soft delete)
   * @param {String} walkthroughId - Walkthrough ID
   * @returns {Promise<Boolean>} - Success status
   */
  async deleteWalkthrough(walkthroughId) {
    try {
      const walkthrough = await Walkthrough.findById(walkthroughId);

      if (!walkthrough) {
        logger.error('WalkthroughService.deleteWalkthrough: Walkthrough not found');
        return false;
      }

      // Soft delete by marking as inactive
      walkthrough.isActive = false;
      walkthrough.deletedAt = new Date();
      await walkthrough.save();

      // Log deletion
      await AuditLogService.log(
        'delete',
        'walkthrough',
        walkthroughId,
        null,
        {
          firmId: walkthrough.firmId,
          details: {
            name: walkthrough.name
          }
        }
      );

      return true;
    } catch (error) {
      logger.error('WalkthroughService.deleteWalkthrough failed:', error.message);
      return false;
    }
  }

  /**
   * Check if trigger conditions are met
   * @param {Array} conditions - Array of trigger conditions
   * @param {Object} context - Context to evaluate against
   * @returns {Boolean} - True if conditions are met
   */
  checkTriggerConditions(conditions, context) {
    try {
      if (!conditions || conditions.length === 0) {
        return true;
      }

      // All conditions must be met (AND logic)
      for (const condition of conditions) {
        const { type, operator, value } = condition;

        switch (type) {
          case 'page':
            if (!this._evaluateCondition(context.page, operator, value)) {
              return false;
            }
            break;

          case 'feature':
            if (!this._evaluateCondition(context.feature, operator, value)) {
              return false;
            }
            break;

          case 'userRole':
            if (!this._evaluateCondition(context.userRole, operator, value)) {
              return false;
            }
            break;

          case 'custom':
            // Custom condition evaluation
            const customValue = this._getNestedValue(context, condition.field);
            if (!this._evaluateCondition(customValue, operator, value)) {
              return false;
            }
            break;

          default:
            logger.warn('Unknown condition type:', type);
        }
      }

      return true;
    } catch (error) {
      logger.error('WalkthroughService.checkTriggerConditions failed:', error.message);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Check if walkthrough matches user audience criteria
   * @private
   * @param {Object} walkthrough - Walkthrough object
   * @param {String} userId - User ID
   * @param {Object} context - Context with user info
   * @returns {Boolean} - True if matches audience
   */
  _matchesAudience(walkthrough, userId, context) {
    try {
      const { audience } = walkthrough;

      if (!audience) {
        return true; // No audience restrictions
      }

      // Check role targeting
      if (audience.roles && audience.roles.length > 0) {
        const userRole = context.userRole;
        if (!userRole || !audience.roles.includes(userRole)) {
          return false;
        }
      }

      // Check user segment
      if (audience.segment) {
        // Could check things like new users, power users, etc.
        // For now, we'll assume it matches
      }

      // Check specific user IDs
      if (audience.userIds && audience.userIds.length > 0) {
        if (!audience.userIds.includes(userId)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('WalkthroughService._matchesAudience failed:', error.message);
      return false;
    }
  }

  /**
   * Evaluate a condition based on operator
   * @private
   * @param {*} actual - Actual value
   * @param {String} operator - Comparison operator (equals, contains, in, etc.)
   * @param {*} expected - Expected value
   * @returns {Boolean} - True if condition met
   */
  _evaluateCondition(actual, operator, expected) {
    try {
      switch (operator) {
        case 'equals':
        case 'eq':
          return actual === expected;

        case 'not_equals':
        case 'ne':
          return actual !== expected;

        case 'contains':
          return typeof actual === 'string' && actual.includes(expected);

        case 'in':
          return Array.isArray(expected) && expected.includes(actual);

        case 'not_in':
          return Array.isArray(expected) && !expected.includes(actual);

        case 'starts_with':
          return typeof actual === 'string' && actual.startsWith(expected);

        case 'ends_with':
          return typeof actual === 'string' && actual.endsWith(expected);

        case 'exists':
          return expected ? actual !== undefined && actual !== null : actual === undefined || actual === null;

        default:
          logger.warn('Unknown operator:', operator);
          return false;
      }
    } catch (error) {
      logger.error('WalkthroughService._evaluateCondition failed:', error.message);
      return false;
    }
  }

  /**
   * Get nested value from object by path
   * @private
   * @param {Object} obj - Object to traverse
   * @param {String} path - Dot-notation path (e.g., 'user.name')
   * @returns {*} Value at path or undefined
   */
  _getNestedValue(obj, path) {
    if (!path) return undefined;

    const parts = path.split('.');
    let value = obj;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }
}

// Export singleton instance
module.exports = new WalkthroughService();
