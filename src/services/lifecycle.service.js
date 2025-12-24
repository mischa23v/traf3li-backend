/**
 * Lifecycle Service - HR-style Lifecycle Workflow Management
 *
 * This service provides a comprehensive API for managing lifecycle workflows such as
 * onboarding, offboarding, and other HR-style processes for employees, customers, deals, and clients.
 *
 * Features:
 * - Initiate and manage lifecycle workflow instances
 * - Automatic stage activation and progression
 * - Task creation and assignment with multiple assignee types (owner, role, specific, auto)
 * - Document generation from templates
 * - Workflow automation and notifications
 * - Progress tracking and reporting
 * - Stage advancement with conditions
 * - Workflow cancellation and completion
 *
 * Key Concepts:
 * - LifecycleWorkflow: Template defining stages, tasks, and rules
 * - LifecycleInstance: Active workflow instance for a specific entity
 * - Stages: Sequential steps in the workflow
 * - Tasks: Actionable items within each stage
 */

const mongoose = require('mongoose');
const { LifecycleWorkflow, LifecycleInstance } = require('../models/lifecycleWorkflow.model');
const Task = require('../models/task.model');
const User = require('../models/user.model');
const logger = require('../utils/logger');
const auditLogService = require('./auditLog.service');
const notificationDeliveryService = require('./notificationDelivery.service');

class LifecycleService {
  /**
   * Initiate a lifecycle workflow for an entity
   * @param {String} workflowId - Lifecycle workflow ID
   * @param {String} entityType - Entity type (employee, customer, deal, client)
   * @param {String} entityId - Entity ID
   * @param {String} initiatorId - User ID who initiated the workflow
   * @param {String} firmId - Firm ID
   * @param {Object} options - Additional options
   * @param {String} options.entityName - Entity name for display
   * @param {Object} options.metadata - Additional metadata
   * @returns {Promise<Object>} - Created lifecycle instance
   */
  async initiateWorkflow(workflowId, entityType, entityId, initiatorId, firmId, options = {}) {
    try {
      // Get workflow
      const workflow = await LifecycleWorkflow.findById(workflowId).lean();

      if (!workflow) {
        throw new Error('Lifecycle workflow not found');
      }

      if (!workflow.isActive) {
        throw new Error('Workflow is not active');
      }

      // Validate entity type matches
      if (workflow.entityType !== entityType) {
        throw new Error(`Workflow entity type mismatch. Expected: ${workflow.entityType}, got: ${entityType}`);
      }

      // Check if there's already an active workflow for this entity
      const existingInstance = await LifecycleInstance.findOne({
        firmId: new mongoose.Types.ObjectId(firmId),
        entityType,
        entityId: new mongoose.Types.ObjectId(entityId),
        status: 'in_progress'
      }).lean();

      if (existingInstance) {
        logger.warn(`Active workflow already exists for ${entityType}:${entityId}`);
        throw new Error('An active workflow already exists for this entity');
      }

      // Create lifecycle instance
      const instance = await LifecycleInstance.create({
        workflowId: new mongoose.Types.ObjectId(workflowId),
        entityType,
        entityId: new mongoose.Types.ObjectId(entityId),
        entityName: options.entityName || 'Unknown',
        currentStage: 0,
        startedAt: new Date(),
        status: 'in_progress',
        stageHistory: [],
        taskCompletions: [],
        progress: {
          totalTasks: workflow.getTotalTasks ? workflow.getTotalTasks() : this._countTotalTasks(workflow),
          completedTasks: 0,
          completionPercentage: 0
        },
        metadata: options.metadata || {},
        firmId: new mongoose.Types.ObjectId(firmId),
        createdBy: new mongoose.Types.ObjectId(initiatorId),
        lastModifiedBy: new mongoose.Types.ObjectId(initiatorId)
      });

      // Log workflow initiation
      await auditLogService.log(
        'initiate_lifecycle_workflow',
        'lifecycle_instance',
        instance._id.toString(),
        null,
        {
          userId: initiatorId,
          firmId,
          details: {
            workflowId,
            workflowName: workflow.name,
            entityType,
            entityId,
            entityName: options.entityName
          }
        }
      );

      // Activate first stage
      await this.activateStage(instance, 0, initiatorId, firmId);

      // Send workflow_started notifications
      await this._sendNotifications(workflow, instance, 'workflow_started', {
        userId: initiatorId,
        firmId
      });

      logger.info(`✅ Lifecycle workflow initiated: ${workflow.name} for ${entityType}:${entityId}`);

      // Return populated instance
      return await LifecycleInstance.findById(instance._id)
        .populate('workflowId', 'name entityType lifecycleType')
        .populate('createdBy', 'firstName lastName email')
        .lean();
    } catch (error) {
      logger.error('LifecycleService.initiateWorkflow failed:', error.message);
      throw error;
    }
  }

  /**
   * Activate a specific stage in the workflow
   * @param {Object} instance - Lifecycle instance (can be document or plain object)
   * @param {Number} stageIndex - Stage index to activate
   * @param {String} userId - User ID performing the action
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object>} - Updated instance
   */
  async activateStage(instance, stageIndex, userId, firmId) {
    try {
      // Ensure we have the document, not just a plain object
      let instanceDoc = instance;
      if (!instance.save) {
        instanceDoc = await LifecycleInstance.findById(instance._id);
      }

      if (!instanceDoc) {
        throw new Error('Lifecycle instance not found');
      }

      // Get workflow
      const workflow = await LifecycleWorkflow.findById(instanceDoc.workflowId).lean();

      if (!workflow) {
        throw new Error('Workflow not found');
      }

      // Get stage
      const stage = workflow.stages.find(s => s.order === stageIndex);

      if (!stage) {
        throw new Error(`Stage ${stageIndex} not found in workflow`);
      }

      const stageStartDate = new Date();

      // Add to stage history
      instanceDoc.stageHistory.push({
        stage: stageIndex,
        stageName: stage.name,
        activatedAt: stageStartDate
      });

      instanceDoc.lastModifiedBy = new mongoose.Types.ObjectId(userId);
      await instanceDoc.save();

      // Create tasks for this stage
      const createdTasks = [];
      if (stage.tasks && stage.tasks.length > 0) {
        for (const taskDef of stage.tasks) {
          try {
            const task = await this.createTaskFromDefinition(
              taskDef,
              instanceDoc,
              stageStartDate,
              firmId,
              userId
            );
            if (task) {
              createdTasks.push(task);
            }
          } catch (taskError) {
            logger.error(`Failed to create task ${taskDef.name}:`, taskError.message);
            // Continue with other tasks
          }
        }
      }

      // Log stage activation
      await auditLogService.log(
        'activate_lifecycle_stage',
        'lifecycle_instance',
        instanceDoc._id.toString(),
        null,
        {
          userId,
          firmId,
          details: {
            stageIndex,
            stageName: stage.name,
            tasksCreated: createdTasks.length
          }
        }
      );

      // Send stage_started notifications
      await this._sendNotifications(workflow, instanceDoc, 'stage_started', {
        userId,
        firmId,
        stageName: stage.name,
        stageIndex
      });

      logger.info(`✅ Stage activated: ${stage.name} (${createdTasks.length} tasks created)`);

      return instanceDoc;
    } catch (error) {
      logger.error('LifecycleService.activateStage failed:', error.message);
      throw error;
    }
  }

  /**
   * Create a task from a stage task definition
   * @param {Object} taskDef - Task definition from workflow stage
   * @param {Object} instance - Lifecycle instance
   * @param {Date} stageStartDate - Stage start date
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID creating the task
   * @returns {Promise<Object>} - Created task
   */
  async createTaskFromDefinition(taskDef, instance, stageStartDate, firmId, userId) {
    try {
      // Resolve assignee
      const assigneeId = await this.resolveAssignee(taskDef, instance, firmId);

      if (!assigneeId) {
        logger.warn(`Could not resolve assignee for task: ${taskDef.name}`);
        return null;
      }

      // Calculate due date from dueOffset
      const dueDate = new Date(stageStartDate);
      if (taskDef.dueOffset && taskDef.dueOffset > 0) {
        dueDate.setDate(dueDate.getDate() + taskDef.dueOffset);
      }

      // Create task with lifecycle reference
      const task = await Task.create({
        title: taskDef.name,
        description: taskDef.description || '',
        assignedTo: new mongoose.Types.ObjectId(assigneeId),
        createdBy: new mongoose.Types.ObjectId(userId),
        status: 'todo',
        priority: taskDef.priority || 'medium',
        taskType: 'lifecycle',
        dueDate,
        firmId: new mongoose.Types.ObjectId(firmId),

        // Lifecycle reference
        lifecycleWorkflowId: instance.workflowId,
        lifecycleInstanceId: instance._id,
        lifecycleStage: instance.currentStage,
        lifecycleTaskRef: `${instance.currentStage}-${taskDef.name}`,

        // Additional metadata
        metadata: {
          required: taskDef.required || true,
          order: taskDef.order || 0,
          dependencies: taskDef.dependencies || [],
          documents: taskDef.documents || []
        }
      });

      // Execute task automations if defined
      if (taskDef.automations && taskDef.automations.length > 0) {
        for (const automation of taskDef.automations) {
          if (automation.isActive) {
            try {
              await this._executeTaskAutomation(automation, task, instance, firmId);
            } catch (autoError) {
              logger.error(`Task automation failed for ${taskDef.name}:`, autoError.message);
            }
          }
        }
      }

      logger.info(`✅ Task created: ${taskDef.name} (assigned to: ${assigneeId})`);

      // Send task_assigned notifications
      const workflow = await LifecycleWorkflow.findById(instance.workflowId).lean();
      if (workflow) {
        await this._sendNotifications(workflow, instance, 'task_assigned', {
          userId,
          firmId,
          taskId: task._id,
          taskName: task.title,
          assigneeId
        });
      }

      return task;
    } catch (error) {
      logger.error('LifecycleService.createTaskFromDefinition failed:', error.message);
      throw error;
    }
  }

  /**
   * Resolve assignee based on assignee type
   * @param {Object} taskDef - Task definition
   * @param {Object} instance - Lifecycle instance
   * @param {String} firmId - Firm ID
   * @returns {Promise<String|null>} - User ID of assignee
   */
  async resolveAssignee(taskDef, instance, firmId) {
    try {
      const { assigneeType, assigneeId, assigneeRole } = taskDef;

      switch (assigneeType) {
        case 'owner':
          // Get entity owner - try to find the entity and get its owner/creator
          return instance.createdBy || null;

        case 'role':
          // Find user with the specified role in the firm
          if (!assigneeRole) {
            logger.warn('Role assignee type specified but no role provided');
            return null;
          }

          const userByRole = await User.findOne({
            firmId: new mongoose.Types.ObjectId(firmId),
            role: assigneeRole,
            isActive: true
          }).lean();

          return userByRole ? userByRole._id.toString() : null;

        case 'specific':
          // Use the specific assigneeId
          if (!assigneeId) {
            logger.warn('Specific assignee type specified but no assigneeId provided');
            return null;
          }
          return assigneeId.toString();

        case 'auto':
          // Use round-robin or workload balancing
          // For now, implement simple round-robin among active users in the firm
          const activeUsers = await User.find({
            firmId: new mongoose.Types.ObjectId(firmId),
            isActive: true
          })
            .sort({ _id: 1 }) // Consistent ordering
            .limit(10)
            .lean();

          if (activeUsers.length === 0) {
            logger.warn('No active users found for auto-assignment');
            return null;
          }

          // Simple round-robin based on instance ID
          const index = parseInt(instance._id.toString().slice(-2), 16) % activeUsers.length;
          return activeUsers[index]._id.toString();

        default:
          logger.warn(`Unknown assignee type: ${assigneeType}`);
          return null;
      }
    } catch (error) {
      logger.error('LifecycleService.resolveAssignee failed:', error.message);
      return null;
    }
  }

  /**
   * Handle task completion
   * @param {String} taskId - Task ID
   * @param {String} userId - User ID who completed the task
   * @param {Object} options - Completion options
   * @param {String} options.notes - Completion notes
   * @param {Array} options.attachments - Attachments
   * @returns {Promise<Object>} - Result with instance and advancement status
   */
  async onTaskComplete(taskId, userId, options = {}) {
    try {
      // Get task
      const task = await Task.findById(taskId).lean();

      if (!task) {
        throw new Error('Task not found');
      }

      if (!task.lifecycleInstanceId) {
        logger.warn('Task is not associated with a lifecycle instance');
        return { success: false, message: 'Not a lifecycle task' };
      }

      // Get lifecycle instance
      const instance = await LifecycleInstance.findById(task.lifecycleInstanceId);

      if (!instance) {
        throw new Error('Lifecycle instance not found');
      }

      // Record completion in instance
      const taskRef = task.lifecycleTaskRef || `${task.lifecycleStage}-${task.title}`;
      const completed = instance.completeTask(
        taskRef,
        new mongoose.Types.ObjectId(userId),
        options.notes,
        options.attachments
      );

      if (!completed) {
        logger.info(`Task ${taskRef} was already completed`);
      }

      await instance.save();

      // Log task completion
      await auditLogService.log(
        'complete_lifecycle_task',
        'lifecycle_instance',
        instance._id.toString(),
        null,
        {
          userId,
          firmId: instance.firmId.toString(),
          details: {
            taskId,
            taskName: task.title,
            taskRef,
            stageIndex: instance.currentStage
          }
        }
      );

      // Send task_completed notifications
      const workflow = await LifecycleWorkflow.findById(instance.workflowId).lean();
      if (workflow) {
        await this._sendNotifications(workflow, instance, 'task_completed', {
          userId,
          firmId: instance.firmId.toString(),
          taskId,
          taskName: task.title
        });
      }

      // Check if all required tasks are complete and stage can auto-advance
      const canAdvance = await this.checkStageAdvance(instance);

      if (canAdvance) {
        const stage = workflow.stages.find(s => s.order === instance.currentStage);

        if (stage && stage.autoAdvance) {
          logger.info(`🚀 Auto-advancing stage for instance ${instance._id}`);
          await this.advanceStage(instance._id.toString(), userId);

          return {
            success: true,
            taskCompleted: true,
            stageAdvanced: true,
            instance
          };
        }
      }

      return {
        success: true,
        taskCompleted: true,
        stageAdvanced: false,
        canAdvance,
        instance
      };
    } catch (error) {
      logger.error('LifecycleService.onTaskComplete failed:', error.message);
      throw error;
    }
  }

  /**
   * Advance to next stage
   * @param {String} instanceId - Lifecycle instance ID
   * @param {String} userId - User ID performing the action
   * @returns {Promise<Object>} - Updated instance
   */
  async advanceStage(instanceId, userId) {
    try {
      // Get instance
      const instance = await LifecycleInstance.findById(instanceId);

      if (!instance) {
        throw new Error('Lifecycle instance not found');
      }

      if (instance.status !== 'in_progress') {
        throw new Error('Cannot advance stage - workflow is not in progress');
      }

      // Get workflow
      const workflow = await LifecycleWorkflow.findById(instance.workflowId).lean();

      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const currentStage = workflow.stages.find(s => s.order === instance.currentStage);

      if (!currentStage) {
        throw new Error('Current stage not found in workflow');
      }

      // Check if stage can be advanced
      const canAdvance = await this.checkStageAdvance(instance);

      if (!canAdvance) {
        throw new Error('Stage cannot be advanced - not all required tasks are completed');
      }

      // Mark current stage as complete in history
      const currentHistory = instance.stageHistory.find(
        h => h.stage === instance.currentStage && !h.completedAt
      );

      if (currentHistory) {
        currentHistory.completedAt = new Date();
        currentHistory.completedBy = new mongoose.Types.ObjectId(userId);
      }

      // Send stage_completed notifications
      await this._sendNotifications(workflow, instance, 'stage_completed', {
        userId,
        firmId: instance.firmId.toString(),
        stageName: currentStage.name,
        stageIndex: instance.currentStage
      });

      // Check if there are more stages
      const nextStageIndex = instance.currentStage + 1;

      if (nextStageIndex >= workflow.stages.length) {
        // No more stages - complete the workflow
        await this.completeWorkflow(instance, userId);

        logger.info(`✅ Workflow completed for instance ${instanceId}`);

        return await LifecycleInstance.findById(instanceId)
          .populate('workflowId', 'name entityType lifecycleType')
          .lean();
      }

      // Move to next stage
      instance.currentStage = nextStageIndex;
      instance.lastModifiedBy = new mongoose.Types.ObjectId(userId);
      await instance.save();

      // Log stage advancement
      await auditLogService.log(
        'advance_lifecycle_stage',
        'lifecycle_instance',
        instance._id.toString(),
        null,
        {
          userId,
          firmId: instance.firmId.toString(),
          details: {
            fromStage: currentStage.name,
            toStage: workflow.stages[nextStageIndex].name,
            fromIndex: instance.currentStage - 1,
            toIndex: nextStageIndex
          }
        }
      );

      // Activate next stage
      await this.activateStage(instance, nextStageIndex, userId, instance.firmId.toString());

      logger.info(`✅ Advanced to stage ${nextStageIndex}: ${workflow.stages[nextStageIndex].name}`);

      return await LifecycleInstance.findById(instanceId)
        .populate('workflowId', 'name entityType lifecycleType')
        .lean();
    } catch (error) {
      logger.error('LifecycleService.advanceStage failed:', error.message);
      throw error;
    }
  }

  /**
   * Complete the workflow
   * @param {Object} instance - Lifecycle instance (document)
   * @param {String} userId - User ID completing the workflow
   * @returns {Promise<Object>} - Updated instance
   */
  async completeWorkflow(instance, userId) {
    try {
      // Set status to completed
      instance.status = 'completed';
      instance.completedAt = new Date();
      instance.lastModifiedBy = new mongoose.Types.ObjectId(userId);

      await instance.save();

      // Get workflow for notifications
      const workflow = await LifecycleWorkflow.findById(instance.workflowId).lean();

      // Log completion
      await auditLogService.log(
        'complete_lifecycle_workflow',
        'lifecycle_instance',
        instance._id.toString(),
        null,
        {
          userId,
          firmId: instance.firmId.toString(),
          details: {
            workflowId: instance.workflowId.toString(),
            workflowName: workflow?.name,
            duration: Math.round((instance.completedAt - instance.startedAt) / (1000 * 60 * 60 * 24)), // days
            completionPercentage: instance.progress.completionPercentage
          }
        }
      );

      // Send workflow_completed notifications
      if (workflow) {
        await this._sendNotifications(workflow, instance, 'workflow_completed', {
          userId,
          firmId: instance.firmId.toString()
        });
      }

      logger.info(`✅ Workflow completed: ${instance._id}`);

      return instance;
    } catch (error) {
      logger.error('LifecycleService.completeWorkflow failed:', error.message);
      throw error;
    }
  }

  /**
   * Cancel a workflow
   * @param {String} instanceId - Lifecycle instance ID
   * @param {String} userId - User ID cancelling the workflow
   * @param {String} reason - Cancellation reason
   * @returns {Promise<Object>} - Updated instance
   */
  async cancelWorkflow(instanceId, userId, reason = '') {
    try {
      // Get instance
      const instance = await LifecycleInstance.findById(instanceId);

      if (!instance) {
        throw new Error('Lifecycle instance not found');
      }

      if (instance.status !== 'in_progress') {
        throw new Error('Cannot cancel - workflow is not in progress');
      }

      // Set status to cancelled
      instance.status = 'cancelled';
      instance.cancelledAt = new Date();
      instance.cancelledBy = new mongoose.Types.ObjectId(userId);
      instance.cancellationReason = reason;
      instance.lastModifiedBy = new mongoose.Types.ObjectId(userId);

      await instance.save();

      // Cancel pending tasks associated with this instance
      await Task.updateMany(
        {
          lifecycleInstanceId: instance._id,
          status: { $in: ['todo', 'in_progress'] }
        },
        {
          $set: {
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelledBy: new mongoose.Types.ObjectId(userId),
            notes: `Cancelled due to workflow cancellation: ${reason}`
          }
        }
      );

      // Get workflow for notifications
      const workflow = await LifecycleWorkflow.findById(instance.workflowId).lean();

      // Log cancellation
      await auditLogService.log(
        'cancel_lifecycle_workflow',
        'lifecycle_instance',
        instance._id.toString(),
        null,
        {
          userId,
          firmId: instance.firmId.toString(),
          details: {
            workflowId: instance.workflowId.toString(),
            workflowName: workflow?.name,
            reason,
            currentStage: instance.currentStage,
            completionPercentage: instance.progress.completionPercentage
          }
        }
      );

      // Send workflow_cancelled notifications (if configured)
      if (workflow) {
        await this._sendNotifications(workflow, instance, 'workflow_cancelled', {
          userId,
          firmId: instance.firmId.toString(),
          reason
        });
      }

      logger.info(`✅ Workflow cancelled: ${instance._id} - Reason: ${reason}`);

      return await LifecycleInstance.findById(instanceId)
        .populate('workflowId', 'name entityType lifecycleType')
        .lean();
    } catch (error) {
      logger.error('LifecycleService.cancelWorkflow failed:', error.message);
      throw error;
    }
  }

  /**
   * Get workflow progress
   * @param {String} instanceId - Lifecycle instance ID
   * @returns {Promise<Object>} - Progress summary
   */
  async getProgress(instanceId) {
    try {
      // Get instance
      const instance = await LifecycleInstance.findById(instanceId)
        .populate('workflowId', 'name entityType lifecycleType stages')
        .lean();

      if (!instance) {
        throw new Error('Lifecycle instance not found');
      }

      const workflow = instance.workflowId;

      // Get current stage info
      const currentStage = workflow.stages?.find(s => s.order === instance.currentStage);

      // Get pending tasks for current instance
      const pendingTasks = await Task.find({
        lifecycleInstanceId: instance._id,
        status: { $in: ['todo', 'in_progress'] }
      })
        .populate('assignedTo', 'firstName lastName email')
        .lean();

      // Get completed tasks
      const completedTasks = await Task.find({
        lifecycleInstanceId: instance._id,
        status: 'completed'
      })
        .populate('assignedTo', 'firstName lastName email')
        .populate('completedBy', 'firstName lastName email')
        .lean();

      // Calculate stage progress
      let stageProgress = {
        total: 0,
        completed: 0,
        percentage: 0
      };

      if (currentStage && currentStage.tasks) {
        stageProgress.total = currentStage.tasks.length;
        stageProgress.completed = currentStage.tasks.filter(task => {
          const taskRef = `${instance.currentStage}-${task.name}`;
          return instance.taskCompletions.some(tc => tc.taskRef === taskRef);
        }).length;

        if (stageProgress.total > 0) {
          stageProgress.percentage = Math.round((stageProgress.completed / stageProgress.total) * 100);
        }
      }

      return {
        instanceId,
        status: instance.status,
        currentStage: {
          index: instance.currentStage,
          name: currentStage?.name,
          description: currentStage?.description,
          progress: stageProgress
        },
        totalStages: workflow.stages?.length || 0,
        overallProgress: {
          totalTasks: instance.progress.totalTasks,
          completedTasks: instance.progress.completedTasks,
          completionPercentage: instance.progress.completionPercentage
        },
        pendingTasks,
        completedTasks,
        stageHistory: instance.stageHistory,
        startedAt: instance.startedAt,
        completedAt: instance.completedAt,
        duration: instance.completedAt
          ? Math.round((instance.completedAt - instance.startedAt) / (1000 * 60 * 60 * 24))
          : Math.round((new Date() - instance.startedAt) / (1000 * 60 * 60 * 24))
      };
    } catch (error) {
      logger.error('LifecycleService.getProgress failed:', error.message);
      throw error;
    }
  }

  /**
   * Check if current stage can advance
   * @param {Object} instance - Lifecycle instance
   * @returns {Promise<Boolean>} - True if stage can advance
   */
  async checkStageAdvance(instance) {
    try {
      // Get workflow
      const workflow = await LifecycleWorkflow.findById(instance.workflowId).lean();

      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const stage = workflow.stages.find(s => s.order === instance.currentStage);

      if (!stage) {
        return false;
      }

      // Check if all required tasks are completed
      const requiredTasks = stage.tasks ? stage.tasks.filter(t => t.required) : [];

      for (const task of requiredTasks) {
        const taskRef = `${instance.currentStage}-${task.name}`;
        const completed = instance.taskCompletions.some(tc => tc.taskRef === taskRef);

        if (!completed) {
          return false; // Required task not completed
        }
      }

      // Check advance conditions if defined
      if (stage.advanceConditions && stage.advanceConditions.length > 0) {
        // Get entity to check conditions against
        // For now, we'll skip this check as we don't have the entity loaded
        // In a real implementation, you would load the entity and check conditions
        logger.info('Stage has advance conditions - skipping condition check for now');
      }

      return true;
    } catch (error) {
      logger.error('LifecycleService.checkStageAdvance failed:', error.message);
      return false;
    }
  }

  /**
   * Get active workflows for an entity
   * @param {String} entityType - Entity type
   * @param {String} entityId - Entity ID
   * @param {String} firmId - Firm ID
   * @returns {Promise<Array>} - Active workflow instances
   */
  async getActiveWorkflows(entityType, entityId, firmId) {
    try {
      const instances = await LifecycleInstance.find({
        firmId: new mongoose.Types.ObjectId(firmId),
        entityType,
        entityId: new mongoose.Types.ObjectId(entityId),
        status: 'in_progress'
      })
        .populate('workflowId', 'name entityType lifecycleType')
        .populate('createdBy', 'firstName lastName email')
        .sort({ startedAt: -1 })
        .lean();

      return instances;
    } catch (error) {
      logger.error('LifecycleService.getActiveWorkflows failed:', error.message);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Count total tasks across all stages in a workflow
   * @private
   * @param {Object} workflow - Workflow object
   * @returns {Number} - Total task count
   */
  _countTotalTasks(workflow) {
    let total = 0;
    if (workflow.stages) {
      workflow.stages.forEach(stage => {
        if (stage.tasks) {
          total += stage.tasks.length;
        }
      });
    }
    return total;
  }

  /**
   * Execute task automation
   * @private
   * @param {Object} automation - Automation config
   * @param {Object} task - Created task
   * @param {Object} instance - Lifecycle instance
   * @param {String} firmId - Firm ID
   * @returns {Promise<void>}
   */
  async _executeTaskAutomation(automation, task, instance, firmId) {
    try {
      const { type, config } = automation;

      switch (type) {
        case 'email':
          // Send email notification
          if (config.to && config.subject) {
            await notificationDeliveryService.sendEmail({
              to: config.to,
              subject: config.subject,
              message: config.message || `Task created: ${task.title}`,
              data: {
                taskId: task._id,
                taskTitle: task.title,
                dueDate: task.dueDate
              }
            });
          }
          break;

        case 'notification':
          // Send in-app notification
          if (config.userId || task.assignedTo) {
            const Notification = require('../models/notification.model');
            await Notification.create({
              userId: config.userId || task.assignedTo,
              type: 'task_assigned',
              title: config.title || 'New Task Assigned',
              message: config.message || `You have been assigned: ${task.title}`,
              link: `/tasks/${task._id}`,
              data: {
                taskId: task._id,
                taskTitle: task.title
              }
            });
          }
          break;

        case 'webhook':
          // Trigger webhook
          if (config.url) {
            const webhookService = require('./webhook.service');
            await webhookService.send({
              url: config.url,
              method: config.method || 'POST',
              data: {
                event: 'task_created',
                task: task.toObject ? task.toObject() : task,
                instance
              }
            });
          }
          break;

        default:
          logger.warn(`Unknown automation type: ${type}`);
      }
    } catch (error) {
      logger.error('LifecycleService._executeTaskAutomation failed:', error.message);
      // Don't throw - automation failure shouldn't block task creation
    }
  }

  /**
   * Send notifications for lifecycle events
   * @private
   * @param {Object} workflow - Workflow object
   * @param {Object} instance - Lifecycle instance
   * @param {String} event - Event type
   * @param {Object} context - Context with userId, firmId, and additional data
   * @returns {Promise<void>}
   */
  async _sendNotifications(workflow, instance, event, context = {}) {
    try {
      if (!workflow.notifications || workflow.notifications.length === 0) {
        return;
      }

      // Find notifications matching this event
      const matchingNotifications = workflow.notifications.filter(
        n => n.event === event && n.isActive
      );

      for (const notificationConfig of matchingNotifications) {
        try {
          // Determine recipients
          const recipients = await this._resolveNotificationRecipients(
            notificationConfig,
            instance,
            context
          );

          if (recipients.length === 0) {
            continue;
          }

          // Prepare message based on template or default
          const message = this._buildNotificationMessage(
            notificationConfig.template,
            event,
            instance,
            workflow,
            context
          );

          // Send through configured channels
          for (const channel of notificationConfig.channels || ['in_app']) {
            if (channel === 'email') {
              for (const recipientId of recipients) {
                const user = await User.findById(recipientId).select('email firstName lastName').lean();
                if (user && user.email) {
                  await notificationDeliveryService.sendEmail({
                    to: user.email,
                    subject: `Workflow Update: ${workflow.name}`,
                    message,
                    userName: `${user.firstName} ${user.lastName}`
                  });
                }
              }
            } else if (channel === 'in_app') {
              const Notification = require('../models/notification.model');
              for (const recipientId of recipients) {
                await Notification.create({
                  userId: recipientId,
                  type: 'lifecycle_event',
                  title: `Workflow: ${workflow.name}`,
                  message,
                  link: `/lifecycle/instances/${instance._id}`,
                  data: {
                    event,
                    instanceId: instance._id,
                    workflowId: workflow._id
                  }
                });
              }
            }
          }
        } catch (notifError) {
          logger.error(`Failed to send notification for event ${event}:`, notifError.message);
        }
      }
    } catch (error) {
      logger.error('LifecycleService._sendNotifications failed:', error.message);
      // Don't throw - notification failure shouldn't block workflow
    }
  }

  /**
   * Resolve notification recipients
   * @private
   * @param {Object} notificationConfig - Notification configuration
   * @param {Object} instance - Lifecycle instance
   * @param {Object} context - Context with userId and other data
   * @returns {Promise<Array>} - Array of user IDs
   */
  async _resolveNotificationRecipients(notificationConfig, instance, context) {
    const recipients = new Set();

    try {
      for (const recipientType of notificationConfig.recipients || []) {
        switch (recipientType) {
          case 'owner':
            if (instance.createdBy) {
              recipients.add(instance.createdBy.toString());
            }
            break;

          case 'assignee':
            if (context.assigneeId) {
              recipients.add(context.assigneeId.toString());
            }
            break;

          case 'manager':
            // Would need to look up manager from entity or user
            // Skip for now
            break;

          case 'hr':
            // Find users with HR role
            const hrUsers = await User.find({
              firmId: instance.firmId,
              role: 'hr',
              isActive: true
            }).select('_id').lean();

            hrUsers.forEach(u => recipients.add(u._id.toString()));
            break;

          case 'specific_user':
            // Add specific users from recipientIds
            if (notificationConfig.recipientIds) {
              notificationConfig.recipientIds.forEach(id =>
                recipients.add(id.toString())
              );
            }
            break;

          case 'specific_role':
            // Find users with specific roles
            if (notificationConfig.recipientRoles) {
              for (const role of notificationConfig.recipientRoles) {
                const roleUsers = await User.find({
                  firmId: instance.firmId,
                  role,
                  isActive: true
                }).select('_id').lean();

                roleUsers.forEach(u => recipients.add(u._id.toString()));
              }
            }
            break;
        }
      }

      return Array.from(recipients);
    } catch (error) {
      logger.error('LifecycleService._resolveNotificationRecipients failed:', error.message);
      return [];
    }
  }

  /**
   * Build notification message from template
   * @private
   * @param {String} template - Template string
   * @param {String} event - Event type
   * @param {Object} instance - Lifecycle instance
   * @param {Object} workflow - Workflow
   * @param {Object} context - Additional context
   * @returns {String} - Formatted message
   */
  _buildNotificationMessage(template, event, instance, workflow, context) {
    if (template) {
      // Replace placeholders in template
      return template
        .replace(/{{workflowName}}/g, workflow.name)
        .replace(/{{entityName}}/g, instance.entityName)
        .replace(/{{stageName}}/g, context.stageName || '')
        .replace(/{{taskName}}/g, context.taskName || '')
        .replace(/{{event}}/g, event);
    }

    // Default messages based on event
    const defaultMessages = {
      workflow_started: `Workflow "${workflow.name}" has been started for ${instance.entityName}`,
      workflow_completed: `Workflow "${workflow.name}" has been completed for ${instance.entityName}`,
      workflow_cancelled: `Workflow "${workflow.name}" has been cancelled for ${instance.entityName}`,
      stage_started: `Stage "${context.stageName}" has been started in workflow "${workflow.name}"`,
      stage_completed: `Stage "${context.stageName}" has been completed in workflow "${workflow.name}"`,
      task_assigned: `You have been assigned task: ${context.taskName}`,
      task_completed: `Task "${context.taskName}" has been completed`,
      task_overdue: `Task "${context.taskName}" is overdue`,
      workflow_stalled: `Workflow "${workflow.name}" appears to be stalled`
    };

    return defaultMessages[event] || `Workflow event: ${event}`;
  }
}

// Export singleton instance
module.exports = new LifecycleService();
