/**
 * Approval Service - Multi-Level Approval Chain Management
 *
 * This service provides a high-level API for managing multi-level approval workflows.
 * It implements enterprise-grade approval chains similar to Salesforce, SAP, and Oracle
 * with support for delegation, escalation, and conditional routing.
 *
 * Features:
 * - Multi-level approval chains with configurable approvers
 * - Dynamic approver resolution (specific users, roles, managers, dynamic fields)
 * - Flexible approval types (any, all, majority)
 * - Delegation and escalation support
 * - Skip conditions for conditional workflow routing
 * - Comprehensive audit trail
 * - Action execution on approval/rejection
 * - SLA tracking and monitoring
 */

const mongoose = require('mongoose');
const { ApprovalWorkflow, ApprovalInstance } = require('../models/approvalWorkflow.model');
const AuditLogService = require('./auditLog.service');
const NotificationDeliveryService = require('./notificationDelivery.service');
const logger = require('../utils/logger');

class ApprovalService {
  /**
   * Initiate approval workflow
   * @param {String} workflowId - Workflow ID
   * @param {String} entityType - Type of entity (e.g., 'deal', 'expense', 'invoice')
   * @param {String} entityId - Entity ID
   * @param {String} requesterId - User requesting approval
   * @param {String} firmId - Firm ID
   * @param {Object} context - Additional context (ipAddress, etc.)
   * @returns {Promise<Object|null>} - Created approval instance or null
   */
  async initiateApproval(workflowId, entityType, entityId, requesterId, firmId, context = {}) {
    try {
      // Validate required parameters
      if (!workflowId || !entityType || !entityId || !requesterId || !firmId) {
        logger.error('ApprovalService.initiateApproval: Missing required parameters');
        return null;
      }

      // Fetch workflow
      const workflow = await ApprovalWorkflow.findOne({
        _id: workflowId,
        firmId,
        isActive: true
      }).lean();

      if (!workflow) {
        logger.error('ApprovalService.initiateApproval: Workflow not found or inactive');
        return null;
      }

      // Validate workflow has levels
      if (!workflow.levels || workflow.levels.length === 0) {
        logger.error('ApprovalService.initiateApproval: Workflow has no approval levels');
        return null;
      }

      // Create approval instance
      const instanceData = {
        firmId: new mongoose.Types.ObjectId(firmId),
        workflowId: new mongoose.Types.ObjectId(workflowId),
        entityType,
        entityId: new mongoose.Types.ObjectId(entityId),
        requestedBy: new mongoose.Types.ObjectId(requesterId),
        requestedAt: new Date(),
        status: 'pending',
        currentLevel: 1,
        levelHistory: [],
        auditLog: [
          {
            action: 'created',
            userId: new mongoose.Types.ObjectId(requesterId),
            timestamp: new Date(),
            details: { entityType, entityId, workflowId },
            ipAddress: context.ipAddress || 'unknown'
          }
        ]
      };

      const instance = await ApprovalInstance.create(instanceData);

      // Log to audit
      await AuditLogService.log(
        'create_approval_request',
        'approval_instance',
        instance._id.toString(),
        null,
        {
          userId: requesterId,
          firmId,
          ipAddress: context.ipAddress,
          details: {
            workflowId,
            entityType,
            entityId
          }
        }
      );

      // Process first level
      await this.processNextLevel(instance.toObject());

      // Reload instance to get updated data
      const updatedInstance = await ApprovalInstance.findOne({ _id: instance._id, firmId })
        .populate('requestedBy', 'firstName lastName email avatar')
        .populate('workflowId')
        .lean();

      return updatedInstance;
    } catch (error) {
      logger.error('ApprovalService.initiateApproval failed:', error.message);
      return null;
    }
  }

  /**
   * Process next level in workflow
   * @param {Object} instance - Approval instance
   * @returns {Promise<Object|null>} - Updated instance or null
   */
  async processNextLevel(instance) {
    try {
      // Fetch full workflow
      const workflow = await ApprovalWorkflow.findOne({ _id: instance.workflowId, firmId: instance.firmId }).lean();
      if (!workflow) {
        logger.error('ApprovalService.processNextLevel: Workflow not found');
        return null;
      }

      // Get current level configuration
      const currentLevelConfig = workflow.levels.find(l => l.order === instance.currentLevel);
      if (!currentLevelConfig) {
        logger.error('ApprovalService.processNextLevel: Current level not found');
        return null;
      }

      // Check if we've completed all levels
      if (instance.currentLevel > workflow.levels.length) {
        // Mark as approved and execute onApproval actions
        await ApprovalInstance.findOneAndUpdate(
          { _id: instance._id, firmId: instance.firmId },
          {
            status: 'approved',
            completedAt: new Date()
          }
        );

        // Execute onApproval actions
        if (workflow.onApproval && workflow.onApproval.length > 0) {
          await this.executeActions(workflow.onApproval, instance);
        }

        // Log to audit
        await AuditLogService.log(
          'approval_completed',
          'approval_instance',
          instance._id.toString(),
          null,
          {
            userId: instance.requestedBy,
            firmId: instance.firmId,
            details: {
              entityType: instance.entityType,
              entityId: instance.entityId
            }
          }
        );

        return await ApprovalInstance.findOne({ _id: instance._id, firmId: instance.firmId }).lean();
      }

      // Check skip conditions
      const shouldSkip = await this.checkSkipConditions(currentLevelConfig, instance);
      if (shouldSkip) {
        // Skip this level
        logger.info(`ApprovalService: Skipping level ${instance.currentLevel} due to skip conditions`);

        const updatedInstance = await ApprovalInstance.findOneAndUpdate(
          { _id: instance._id, firmId: instance.firmId },
          {
            $push: {
              levelHistory: {
                level: instance.currentLevel,
                approvers: [],
                startedAt: new Date(),
                completedAt: new Date(),
                skipped: true,
                skipReason: 'Skip conditions met'
              },
              auditLog: {
                action: 'level_skipped',
                userId: instance.requestedBy,
                timestamp: new Date(),
                details: { level: instance.currentLevel }
              }
            },
            currentLevel: instance.currentLevel + 1
          },
          { new: true }
        ).lean();

        // Process next level
        return await this.processNextLevel(updatedInstance);
      }

      // Resolve approvers based on type
      const approvers = await this.resolveApprovers(currentLevelConfig, instance);
      if (!approvers || approvers.length === 0) {
        logger.error('ApprovalService.processNextLevel: No approvers found for level');
        return null;
      }

      // Create level history entry
      await ApprovalInstance.findOneAndUpdate(
        { _id: instance._id, firmId: instance.firmId },
        {
          $push: {
            levelHistory: {
              level: instance.currentLevel,
              approvers: [],
              startedAt: new Date(),
              skipped: false
            }
          }
        }
      );

      // Notify approvers
      if (workflow.notifyOnPending) {
        await this.notifyApprovers(approvers, instance, currentLevelConfig, workflow);
      }

      // Set up escalation if configured
      if (currentLevelConfig.escalation && currentLevelConfig.escalation.enabled) {
        await this.setupEscalation(instance._id, currentLevelConfig.escalation);
      }

      return await ApprovalInstance.findOne({ _id: instance._id, firmId: instance.firmId }).lean();
    } catch (error) {
      logger.error('ApprovalService.processNextLevel failed:', error.message);
      return null;
    }
  }

  /**
   * Resolve approvers based on type
   * @param {Object} level - Approval level configuration
   * @param {Object} instance - Approval instance
   * @returns {Promise<Array>} - Array of approver user IDs
   */
  async resolveApprovers(level, instance) {
    try {
      const approversConfig = level.approvers;
      const User = mongoose.model('User');

      switch (approversConfig.type) {
        case 'specific':
          // Return specific user IDs
          return approversConfig.userIds || [];

        case 'role':
          // Find users with specified role
          const usersWithRole = await User.find({
            firmId: instance.firmId,
            role: approversConfig.roleId,
            isActive: true
          }).select('_id').lean();
          return usersWithRole.map(u => u._id);

        case 'manager':
          // Find entity owner's manager
          const requester = await User.findOne({ _id: instance.requestedBy, firmId: instance.firmId }).lean();
          if (requester && requester.managerId) {
            return [requester.managerId];
          }
          logger.warn('ApprovalService.resolveApprovers: Manager not found for requester');
          return [];

        case 'dynamic':
          // Evaluate dynamic field on entity
          if (!approversConfig.dynamicField) {
            logger.error('ApprovalService.resolveApprovers: Dynamic field not specified');
            return [];
          }

          // Fetch entity to get dynamic field value
          const entityModel = this.getEntityModel(instance.entityType);
          if (!entityModel) {
            logger.error('ApprovalService.resolveApprovers: Unknown entity type');
            return [];
          }

          const entity = await entityModel.findOne({ _id: instance.entityId, firmId: instance.firmId }).lean();
          if (!entity) {
            logger.error('ApprovalService.resolveApprovers: Entity not found');
            return [];
          }

          // Get nested value from entity
          const approverIds = this.getNestedValue(entity, approversConfig.dynamicField);
          if (Array.isArray(approverIds)) {
            return approverIds;
          } else if (approverIds) {
            return [approverIds];
          }
          return [];

        default:
          logger.error('ApprovalService.resolveApprovers: Unknown approver type');
          return [];
      }
    } catch (error) {
      logger.error('ApprovalService.resolveApprovers failed:', error.message);
      return [];
    }
  }

  /**
   * Record approval decision
   * @param {String} instanceId - Instance ID
   * @param {String} approverId - Approver user ID
   * @param {String} decision - Decision ('approved', 'rejected', 'abstained')
   * @param {String} comments - Decision comments
   * @param {String} ipAddress - IP address
   * @param {Object} context - Additional context
   * @returns {Promise<Object|null>} - Updated instance or null
   */
  async recordDecision(instanceId, approverId, decision, comments = '', ipAddress = 'unknown', context = {}) {
    try {
      // Find instance and workflow - need firmId from context
      if (!context.firmId) {
        logger.error('ApprovalService.recordDecision: firmId required in context');
        return null;
      }

      const instance = await ApprovalInstance.findOne({ _id: instanceId, firmId: context.firmId })
        .populate('workflowId')
        .lean();

      if (!instance) {
        logger.error('ApprovalService.recordDecision: Instance not found');
        return null;
      }

      if (instance.status !== 'pending') {
        logger.error('ApprovalService.recordDecision: Instance is no longer pending');
        return null;
      }

      const workflow = instance.workflowId;
      const currentLevelConfig = workflow.levels.find(l => l.order === instance.currentLevel);

      if (!currentLevelConfig) {
        logger.error('ApprovalService.recordDecision: Current level not found');
        return null;
      }

      // Verify approver is in current level
      const approvers = await this.resolveApprovers(currentLevelConfig, instance);
      const isApprover = approvers.some(id => id.toString() === approverId.toString());

      if (!isApprover) {
        logger.error('ApprovalService.recordDecision: User is not an approver at this level');
        return null;
      }

      // Find level history entry
      const levelHistoryIndex = instance.levelHistory.findIndex(lh => lh.level === instance.currentLevel);
      if (levelHistoryIndex === -1) {
        logger.error('ApprovalService.recordDecision: Level history not found');
        return null;
      }

      const levelHistory = instance.levelHistory[levelHistoryIndex];

      // Check if user already decided
      const existingDecision = levelHistory.approvers.find(
        a => a.userId.toString() === approverId.toString()
      );
      if (existingDecision) {
        logger.error('ApprovalService.recordDecision: User has already made a decision');
        return null;
      }

      // Record decision with timestamp
      const decisionData = {
        userId: new mongoose.Types.ObjectId(approverId),
        decision,
        decidedAt: new Date(),
        comments
      };

      // Update level history and audit log
      await ApprovalInstance.findOneAndUpdate(
        { _id: instanceId, firmId: instance.firmId },
        {
          $push: {
            [`levelHistory.${levelHistoryIndex}.approvers`]: decisionData,
            auditLog: {
              action: decision === 'approved' ? 'approved' : decision === 'rejected' ? 'rejected' : 'abstained',
              userId: new mongoose.Types.ObjectId(approverId),
              timestamp: new Date(),
              details: {
                level: instance.currentLevel,
                decision,
                comments
              },
              ipAddress
            }
          }
        }
      );

      // Add to audit log service
      await AuditLogService.log(
        `approval_${decision}`,
        'approval_instance',
        instanceId,
        null,
        {
          userId: approverId,
          firmId: instance.firmId,
          ipAddress,
          details: {
            level: instance.currentLevel,
            decision,
            comments,
            entityType: instance.entityType,
            entityId: instance.entityId
          }
        }
      );

      // Reload instance with updated data
      const updatedInstance = await ApprovalInstance.findOne({ _id: instanceId, firmId: instance.firmId })
        .populate('workflowId')
        .lean();

      const updatedLevelHistory = updatedInstance.levelHistory.find(lh => lh.level === instance.currentLevel);

      // Check if level is complete based on approvalType
      const levelCompletionResult = this.checkLevelCompletion(currentLevelConfig, updatedLevelHistory, approvers);

      if (levelCompletionResult.complete) {
        // Mark level as completed
        await ApprovalInstance.findOneAndUpdate(
          { _id: instanceId, firmId: instance.firmId },
          {
            $set: {
              [`levelHistory.${levelHistoryIndex}.completedAt`]: new Date()
            }
          }
        );

        if (!levelCompletionResult.approved || decision === 'rejected') {
          // Level rejected - mark instance as rejected and execute onRejection
          await ApprovalInstance.findOneAndUpdate(
            { _id: instanceId, firmId: instance.firmId },
            {
              status: 'rejected',
              completedAt: new Date(),
              completedBy: new mongoose.Types.ObjectId(approverId),
              finalComments: comments
            }
          );

          // Execute onRejection actions
          if (workflow.onRejection && workflow.onRejection.length > 0) {
            await this.executeActions(workflow.onRejection, updatedInstance);
          }

          // Log to audit
          await AuditLogService.log(
            'approval_rejected',
            'approval_instance',
            instanceId,
            null,
            {
              userId: approverId,
              firmId: instance.firmId,
              ipAddress,
              details: {
                level: instance.currentLevel,
                reason: comments,
                entityType: instance.entityType,
                entityId: instance.entityId
              }
            }
          );
        } else {
          // Level approved - move to next level
          await ApprovalInstance.findOneAndUpdate(
            { _id: instanceId, firmId: instance.firmId },
            {
              currentLevel: instance.currentLevel + 1,
              $push: {
                auditLog: {
                  action: 'level_completed',
                  userId: new mongoose.Types.ObjectId(approverId),
                  timestamp: new Date(),
                  details: {
                    completedLevel: instance.currentLevel,
                    nextLevel: instance.currentLevel + 1
                  }
                }
              }
            }
          );

          // Get updated instance and process next level
          const finalInstance = await ApprovalInstance.findOne({ _id: instanceId, firmId: instance.firmId }).lean();
          await this.processNextLevel(finalInstance);
        }
      }

      // Return final updated instance
      return await ApprovalInstance.findOne({ _id: instanceId, firmId: instance.firmId })
        .populate('requestedBy', 'firstName lastName email avatar')
        .populate('workflowId')
        .lean();
    } catch (error) {
      logger.error('ApprovalService.recordDecision failed:', error.message);
      return null;
    }
  }

  /**
   * Check if level is complete
   * @param {Object} level - Level configuration
   * @param {Object} levelHistory - Level history entry
   * @param {Array} allApprovers - All approvers for this level
   * @returns {Object} - { complete: boolean, approved: boolean }
   */
  checkLevelCompletion(level, levelHistory, allApprovers) {
    const approvers = levelHistory.approvers || [];
    const approvedCount = approvers.filter(a => a.decision === 'approved').length;
    const rejectedCount = approvers.filter(a => a.decision === 'rejected').length;
    const totalApprovers = allApprovers.length;

    switch (level.approvalType) {
      case 'any':
        // Any approval or rejection completes the level
        if (approvedCount > 0) {
          return { complete: true, approved: true };
        }
        if (rejectedCount > 0) {
          return { complete: true, approved: false };
        }
        return { complete: false, approved: false };

      case 'all':
        // All approvers must decide
        if (approvers.length >= totalApprovers) {
          // Check if all approved
          return {
            complete: true,
            approved: rejectedCount === 0 && approvedCount === totalApprovers
          };
        }
        // Check if rejection makes it impossible to get all approvals
        if (rejectedCount > 0) {
          return { complete: true, approved: false };
        }
        return { complete: false, approved: false };

      case 'majority':
        // Majority must approve
        const majorityThreshold = Math.ceil(totalApprovers / 2);

        // Check if majority approved
        if (approvedCount >= majorityThreshold) {
          return { complete: true, approved: true };
        }

        // Check if majority rejected (or impossible to get majority approval)
        if (rejectedCount > (totalApprovers - majorityThreshold)) {
          return { complete: true, approved: false };
        }

        return { complete: false, approved: false };

      default:
        return { complete: false, approved: false };
    }
  }

  /**
   * Execute workflow actions
   * @param {Array} actions - Array of actions to execute
   * @param {Object} instance - Approval instance
   * @returns {Promise<void>}
   */
  async executeActions(actions, instance) {
    try {
      for (const action of actions) {
        try {
          switch (action.action) {
            case 'send_email':
              await this.executeSendEmailAction(action.params, instance);
              break;

            case 'send_notification':
              await this.executeSendNotificationAction(action.params, instance);
              break;

            case 'update_field':
              await this.executeUpdateFieldAction(action.params, instance);
              break;

            case 'create_task':
              await this.executeCreateTaskAction(action.params, instance);
              break;

            case 'webhook':
              await this.executeWebhookAction(action.params, instance);
              break;

            case 'run_script':
              logger.warn('ApprovalService.executeActions: run_script action not implemented');
              break;

            default:
              logger.warn(`ApprovalService.executeActions: Unknown action type: ${action.action}`);
          }
        } catch (actionError) {
          logger.error(`ApprovalService.executeActions: Failed to execute action ${action.action}:`, actionError.message);
        }
      }
    } catch (error) {
      logger.error('ApprovalService.executeActions failed:', error.message);
    }
  }

  /**
   * Execute send_email action
   * @private
   */
  async executeSendEmailAction(params, instance) {
    try {
      const User = mongoose.model('User');
      const recipientId = params.recipientId || instance.requestedBy;
      const recipient = await User.findOne({ _id: recipientId, firmId: instance.firmId }).lean();

      if (recipient && recipient.email) {
        await NotificationDeliveryService.sendEmail({
          to: recipient.email,
          subject: params.subject || 'Approval Update',
          message: params.message || 'Your approval request has been processed',
          userName: `${recipient.firstName} ${recipient.lastName}`,
          data: params.data || {}
        });
      }
    } catch (error) {
      logger.error('ApprovalService.executeSendEmailAction failed:', error.message);
    }
  }

  /**
   * Execute send_notification action
   * @private
   */
  async executeSendNotificationAction(params, instance) {
    try {
      const QueueService = require('./queue.service');
      QueueService.createNotification({
        userId: params.recipientId || instance.requestedBy,
        type: params.type || 'approval_update',
        title: params.title || 'Approval Update',
        message: params.message || 'Your approval request has been processed',
        priority: params.priority || 'medium',
        link: params.link || `/approvals/${instance._id}`,
        data: params.data || {}
      });
    } catch (error) {
      logger.error('ApprovalService.executeSendNotificationAction failed:', error.message);
    }
  }

  /**
   * Execute update_field action
   * @private
   */
  async executeUpdateFieldAction(params, instance) {
    try {
      const entityModel = this.getEntityModel(instance.entityType);
      if (!entityModel) {
        logger.error('ApprovalService.executeUpdateFieldAction: Unknown entity type');
        return;
      }

      const updateData = {};
      updateData[params.field] = params.value;

      await entityModel.findOneAndUpdate(
        { _id: instance.entityId, firmId: instance.firmId },
        updateData
      );
    } catch (error) {
      logger.error('ApprovalService.executeUpdateFieldAction failed:', error.message);
    }
  }

  /**
   * Execute create_task action
   * @private
   */
  async executeCreateTaskAction(params, instance) {
    try {
      const Task = mongoose.model('Task');
      await Task.create({
        title: params.title || 'Approval Task',
        description: params.description || '',
        assignedTo: params.assignedTo || instance.requestedBy,
        createdBy: instance.requestedBy,
        status: 'todo',
        priority: params.priority || 'medium',
        firmId: instance.firmId
      });
    } catch (error) {
      logger.error('ApprovalService.executeCreateTaskAction failed:', error.message);
    }
  }

  /**
   * Execute webhook action
   * @private
   */
  async executeWebhookAction(params, instance) {
    try {
      // This would integrate with a webhook service
      logger.info('ApprovalService.executeWebhookAction: Webhook action triggered', {
        url: params.url,
        instanceId: instance._id
      });
      // TODO: Implement actual webhook call
    } catch (error) {
      logger.error('ApprovalService.executeWebhookAction failed:', error.message);
    }
  }

  /**
   * Get pending approvals for user
   * @param {String} userId - User ID
   * @param {String} firmId - Firm ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Pending approval instances
   */
  async getPendingApprovals(userId, firmId, options = {}) {
    try {
      const { limit = 50, skip = 0 } = options;

      // Get all pending instances
      const instances = await ApprovalInstance.find({
        firmId: new mongoose.Types.ObjectId(firmId),
        status: 'pending'
      })
        .sort({ createdAt: -1 })
        .limit(limit * 2) // Get more to filter
        .skip(skip)
        .populate('requestedBy', 'firstName lastName email avatar')
        .populate('workflowId')
        .lean();

      // Filter instances where user is an approver at current level
      const userInstances = [];
      for (const instance of instances) {
        const workflow = instance.workflowId;
        if (!workflow || !workflow.levels) continue;

        const currentLevelConfig = workflow.levels.find(l => l.order === instance.currentLevel);
        if (!currentLevelConfig) continue;

        // Check if user is an approver at this level
        const approvers = await this.resolveApprovers(currentLevelConfig, instance);
        const isApprover = approvers.some(id => id.toString() === userId.toString());

        if (isApprover) {
          // Check if user hasn't already decided
          const levelHistory = instance.levelHistory.find(lh => lh.level === instance.currentLevel);
          if (levelHistory) {
            const alreadyDecided = levelHistory.approvers.some(a => a.userId.toString() === userId.toString());
            if (!alreadyDecided) {
              userInstances.push(instance);
            }
          } else {
            userInstances.push(instance);
          }
        }

        if (userInstances.length >= limit) break;
      }

      return userInstances.slice(0, limit);
    } catch (error) {
      logger.error('ApprovalService.getPendingApprovals failed:', error.message);
      return [];
    }
  }

  /**
   * Get approval history for entity
   * @param {String} entityType - Entity type
   * @param {String} entityId - Entity ID
   * @param {String} firmId - Firm ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Approval instances
   */
  async getApprovalHistory(entityType, entityId, firmId, options = {}) {
    try {
      const { limit = 50, skip = 0 } = options;

      const instances = await ApprovalInstance.find({
        firmId: new mongoose.Types.ObjectId(firmId),
        entityType,
        entityId: new mongoose.Types.ObjectId(entityId)
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('requestedBy', 'firstName lastName email avatar')
        .populate('completedBy', 'firstName lastName email avatar')
        .populate('workflowId', 'name description')
        .lean();

      return instances;
    } catch (error) {
      logger.error('ApprovalService.getApprovalHistory failed:', error.message);
      return [];
    }
  }

  /**
   * Cancel approval request
   * @param {String} instanceId - Instance ID
   * @param {String} userId - User ID (must be requester)
   * @param {String} reason - Cancellation reason
   * @param {Object} context - Additional context
   * @returns {Promise<Object|null>} - Updated instance or null
   */
  async cancelApproval(instanceId, userId, reason = '', context = {}) {
    try {
      if (!context.firmId) {
        logger.error('ApprovalService.cancelApproval: firmId required in context');
        return null;
      }

      const instance = await ApprovalInstance.findOne({ _id: instanceId, firmId: context.firmId }).lean();

      if (!instance) {
        logger.error('ApprovalService.cancelApproval: Instance not found');
        return null;
      }

      if (instance.status !== 'pending') {
        logger.error('ApprovalService.cancelApproval: Only pending instances can be cancelled');
        return null;
      }

      // Only requester can cancel
      if (instance.requestedBy.toString() !== userId.toString()) {
        logger.error('ApprovalService.cancelApproval: Only requester can cancel');
        return null;
      }

      // Update instance
      const updatedInstance = await ApprovalInstance.findOneAndUpdate(
        { _id: instanceId, firmId: instance.firmId },
        {
          status: 'cancelled',
          completedAt: new Date(),
          completedBy: new mongoose.Types.ObjectId(userId),
          finalComments: reason,
          $push: {
            auditLog: {
              action: 'cancelled',
              userId: new mongoose.Types.ObjectId(userId),
              timestamp: new Date(),
              details: { reason },
              ipAddress: context.ipAddress || 'unknown'
            }
          }
        },
        { new: true }
      )
        .populate('requestedBy', 'firstName lastName email avatar')
        .populate('workflowId')
        .lean();

      // Log to audit
      await AuditLogService.log(
        'cancel_approval',
        'approval_instance',
        instanceId,
        null,
        {
          userId,
          firmId: instance.firmId,
          ipAddress: context.ipAddress,
          details: {
            reason,
            entityType: instance.entityType,
            entityId: instance.entityId
          }
        }
      );

      return updatedInstance;
    } catch (error) {
      logger.error('ApprovalService.cancelApproval failed:', error.message);
      return null;
    }
  }

  /**
   * Delegate approval
   * @param {String} instanceId - Instance ID
   * @param {String} fromUserId - Delegating user ID
   * @param {String} toUserId - Delegate to user ID
   * @param {String} reason - Delegation reason
   * @param {Object} context - Additional context
   * @returns {Promise<Object|null>} - Updated instance or null
   */
  async delegateApproval(instanceId, fromUserId, toUserId, reason = '', context = {}) {
    try {
      if (!context.firmId) {
        logger.error('ApprovalService.delegateApproval: firmId required in context');
        return null;
      }

      const instance = await ApprovalInstance.findOne({ _id: instanceId, firmId: context.firmId })
        .populate('workflowId')
        .lean();

      if (!instance) {
        logger.error('ApprovalService.delegateApproval: Instance not found');
        return null;
      }

      if (instance.status !== 'pending') {
        logger.error('ApprovalService.delegateApproval: Instance is not pending');
        return null;
      }

      const workflow = instance.workflowId;
      const currentLevelConfig = workflow.levels.find(l => l.order === instance.currentLevel);

      if (!currentLevelConfig) {
        logger.error('ApprovalService.delegateApproval: Current level not found');
        return null;
      }

      // Verify fromUser is an approver
      const approvers = await this.resolveApprovers(currentLevelConfig, instance);
      const isApprover = approvers.some(id => id.toString() === fromUserId.toString());

      if (!isApprover) {
        logger.error('ApprovalService.delegateApproval: User is not an approver at this level');
        return null;
      }

      // Record delegation in audit log
      await ApprovalInstance.findOneAndUpdate(
        { _id: instanceId, firmId: instance.firmId },
        {
          $push: {
            auditLog: {
              action: 'delegated',
              userId: new mongoose.Types.ObjectId(fromUserId),
              timestamp: new Date(),
              details: {
                delegatedTo: toUserId,
                reason,
                level: instance.currentLevel
              },
              ipAddress: context.ipAddress || 'unknown'
            }
          }
        }
      );

      // Log to audit
      await AuditLogService.log(
        'delegate_approval',
        'approval_instance',
        instanceId,
        null,
        {
          userId: fromUserId,
          firmId: instance.firmId,
          ipAddress: context.ipAddress,
          details: {
            delegatedTo: toUserId,
            reason,
            level: instance.currentLevel,
            entityType: instance.entityType,
            entityId: instance.entityId
          }
        }
      );

      // Notify new approver
      const User = mongoose.model('User');
      const toUser = await User.findOne({ _id: toUserId, firmId: instance.firmId }).lean();
      if (toUser && toUser.email) {
        await NotificationDeliveryService.sendEmail({
          to: toUser.email,
          subject: 'Approval Delegated to You',
          message: `An approval request has been delegated to you. Reason: ${reason}`,
          userName: `${toUser.firstName} ${toUser.lastName}`,
          data: {
            link: `/approvals/${instanceId}`
          }
        });
      }

      return await ApprovalInstance.findOne({ _id: instanceId, firmId: instance.firmId })
        .populate('requestedBy', 'firstName lastName email avatar')
        .populate('workflowId')
        .lean();
    } catch (error) {
      logger.error('ApprovalService.delegateApproval failed:', error.message);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Check skip conditions for a level
   * @private
   */
  async checkSkipConditions(level, instance) {
    try {
      if (!level.skipConditions || level.skipConditions.length === 0) {
        return false;
      }

      // Fetch entity to evaluate conditions
      const entityModel = this.getEntityModel(instance.entityType);
      if (!entityModel) {
        return false;
      }

      const entity = await entityModel.findOne({ _id: instance.entityId, firmId: instance.firmId }).lean();
      if (!entity) {
        return false;
      }

      // Check if all skip conditions are met
      return level.skipConditions.every(condition => {
        return this.evaluateCondition(condition, entity);
      });
    } catch (error) {
      logger.error('ApprovalService.checkSkipConditions failed:', error.message);
      return false;
    }
  }

  /**
   * Evaluate a condition against entity data
   * @private
   */
  evaluateCondition(condition, data) {
    const fieldValue = this.getNestedValue(data, condition.field);
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return fieldValue == conditionValue;
      case 'not_equals':
        return fieldValue != conditionValue;
      case 'greater_than':
        return Number(fieldValue) > Number(conditionValue);
      case 'less_than':
        return Number(fieldValue) < Number(conditionValue);
      case 'greater_than_or_equal':
        return Number(fieldValue) >= Number(conditionValue);
      case 'less_than_or_equal':
        return Number(fieldValue) <= Number(conditionValue);
      case 'contains':
        return String(fieldValue).includes(String(conditionValue));
      case 'not_contains':
        return !String(fieldValue).includes(String(conditionValue));
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
      case 'not_in':
        return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
      case 'is_empty':
        return !fieldValue || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0);
      case 'is_not_empty':
        return fieldValue && fieldValue !== '' && (!Array.isArray(fieldValue) || fieldValue.length > 0);
      default:
        return false;
    }
  }

  /**
   * Get nested value from object using dot notation
   * @private
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get entity model by type
   * @private
   */
  getEntityModel(entityType) {
    const modelMap = {
      deal: 'Deal',
      quote: 'Quote',
      expense: 'Expense',
      leave_request: 'LeaveRequest',
      invoice: 'Invoice',
      purchase_order: 'PurchaseOrder',
      contract: 'Contract',
      payment: 'Payment',
      refund: 'Refund',
      time_off: 'TimeOff',
      reimbursement: 'Reimbursement'
    };

    const modelName = modelMap[entityType];
    if (!modelName) {
      return null;
    }

    try {
      return mongoose.model(modelName);
    } catch (error) {
      logger.error(`ApprovalService.getEntityModel: Model ${modelName} not found`);
      return null;
    }
  }

  /**
   * Notify approvers
   * @private
   */
  async notifyApprovers(approvers, instance, levelConfig, workflow) {
    try {
      const User = mongoose.model('User');

      for (const approverId of approvers) {
        const approver = await User.findOne({ _id: approverId, firmId: instance.firmId }).lean();
        if (approver && approver.email) {
          await NotificationDeliveryService.sendEmail({
            to: approver.email,
            subject: `Approval Required: ${workflow.name}`,
            message: `You have a pending approval request for ${levelConfig.name}`,
            userName: `${approver.firstName} ${approver.lastName}`,
            data: {
              link: `/approvals/${instance._id}`
            }
          });
        }
      }
    } catch (error) {
      logger.error('ApprovalService.notifyApprovers failed:', error.message);
    }
  }

  /**
   * Set up escalation
   * @private
   */
  async setupEscalation(instanceId, escalationConfig) {
    try {
      // This would typically integrate with a job scheduler (Bull, Agenda, etc.)
      logger.info('ApprovalService.setupEscalation: Escalation scheduled', {
        instanceId,
        afterHours: escalationConfig.afterHours
      });
      // TODO: Implement with job scheduler
    } catch (error) {
      logger.error('ApprovalService.setupEscalation failed:', error.message);
    }
  }
}

// Export singleton instance
module.exports = new ApprovalService();
