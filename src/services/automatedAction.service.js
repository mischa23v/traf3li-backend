/**
 * Automated Action Service - Odoo-Style Workflow Automation
 *
 * This service provides a high-level API for creating and executing automated actions.
 * It implements Odoo's automated action patterns for workflow automation, including
 * triggers on record creation, updates, stage changes, and time-based conditions.
 *
 * Features:
 * - Create, update, delete, and toggle automated actions
 * - Trigger-based execution (on_create, on_write, on_stage_change, on_time)
 * - Domain filtering for conditional execution
 * - Multiple action types (update_record, create_activity, send_email, send_notification, webhook)
 * - Time-based action scheduling
 */

const AutomatedAction = require('../models/automatedAction.model');
const Activity = require('../models/activity.model');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Service dependencies
const emailService = require('./email.service');
const notificationService = require('./notificationDelivery.service');
const webhookService = require('./webhook.service');
const auditLogService = require('./auditLog.service');

/**
 * Escape special regex characters to prevent regex injection
 */
const escapeRegex = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Validate field name to prevent NoSQL injection via dynamic field names
 */
const isValidFieldName = (field) => {
  if (typeof field !== 'string') return false;
  // Reject fields starting with $ (MongoDB operators) or __proto__ (prototype pollution)
  if (field.startsWith('$') || field.startsWith('__proto__') || field === 'constructor' || field === 'prototype') {
    return false;
  }
  return true;
};

class AutomatedActionService {
  /**
   * Get all automated actions for a firm
   * @param {String} firmId - Firm ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - { actions, total, page, limit }
   */
  async getActions(firmId, options = {}) {
    try {
      const query = {
        firmId: new mongoose.Types.ObjectId(firmId)
      };

      // Apply filters
      if (options.model_name) {
        query.model_name = options.model_name;
      }

      if (options.trigger) {
        query.trigger = options.trigger;
      }

      if (options.isActive !== undefined) {
        query.isActive = options.isActive;
      }

      // Pagination
      const page = parseInt(options.page) || 1;
      const limit = parseInt(options.limit) || 50;
      const skip = (page - 1) * limit;

      // Execute query
      const [actions, total] = await Promise.all([
        AutomatedAction.find(query)
          .populate('activity_type_id', 'name icon color')
          .populate('trg_date_id', 'name')
          .sort(options.sort || { name: 1 })
          .limit(limit)
          .skip(skip),
        AutomatedAction.countDocuments(query)
      ]);

      return {
        actions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('AutomatedActionService.getActions failed:', error.message);
      throw error;
    }
  }

  /**
   * Create a new automated action
   * @param {Object} data - Action data
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Created action
   */
  async createAction(data, context = {}) {
    try {
      // Validate trigger/action combinations
      this._validateTriggerActionCombination(data.trigger, data.action_type);

      // Prepare action data
      const actionData = {
        firmId: new mongoose.Types.ObjectId(data.firmId || context.firmId),
        name: data.name,
        model_name: data.model_name,
        trigger: data.trigger,
        action_type: data.action_type,
        isActive: data.isActive !== undefined ? data.isActive : true,

        // Trigger conditions
        filter_domain: data.filter_domain || null,
        filter_pre_domain: data.filter_pre_domain || null,
        trigger_field_ids: data.trigger_field_ids || [],

        // Time-based trigger
        trg_date_id: data.trg_date_id ? new mongoose.Types.ObjectId(data.trg_date_id) : null,
        trg_date_range: data.trg_date_range || null,
        trg_date_range_type: data.trg_date_range_type || null,

        // Action parameters
        update_field_mappings: data.update_field_mappings || null,
        activity_type_id: data.activity_type_id ? new mongoose.Types.ObjectId(data.activity_type_id) : null,
        activity_summary: data.activity_summary || null,
        activity_note: data.activity_note || null,
        activity_date_deadline_range: data.activity_date_deadline_range || null,
        activity_user_type: data.activity_user_type || 'specific',
        activity_user_id: data.activity_user_id ? new mongoose.Types.ObjectId(data.activity_user_id) : null,
        activity_user_field_name: data.activity_user_field_name || null,

        email_template_id: data.email_template_id ? new mongoose.Types.ObjectId(data.email_template_id) : null,
        notification_message: data.notification_message || null,
        notification_user_ids: data.notification_user_ids?.map(id => new mongoose.Types.ObjectId(id)) || [],

        webhook_url: data.webhook_url || null,
        webhook_method: data.webhook_method || 'POST',
        webhook_headers: data.webhook_headers || null,

        // Metadata
        description: data.description || null,
        sequence: data.sequence || 10
      };

      // Create action
      const action = await AutomatedAction.create(actionData);

      // Audit log
      await auditLogService.log(
        'create',
        'automated_action',
        action._id.toString(),
        null,
        {
          ...context,
          details: { actionName: action.name, trigger: action.trigger, actionType: action.action_type }
        }
      );

      return action;
    } catch (error) {
      logger.error('AutomatedActionService.createAction failed:', error.message);
      throw error;
    }
  }

  /**
   * Update an automated action
   * SECURITY: Requires firmId verification to prevent cross-firm updates
   * @param {String} actionId - Action ID
   * @param {Object} data - Update data
   * @param {Object} context - Request context (must contain firmId)
   * @returns {Promise<Object>} - Updated action
   */
  async updateAction(actionId, data, context = {}) {
    try {
      // SECURITY: Require firmId in context for multi-tenant isolation
      if (!context.firmId) {
        throw new Error('Firm ID is required for update operation');
      }

      const action = await AutomatedAction.findOne({
        _id: actionId,
        firmId: new mongoose.Types.ObjectId(context.firmId)
      });

      if (!action) {
        throw new Error('Automated action not found');
      }

      // Store before state for audit
      const beforeState = action.toObject();

      // Validate if trigger or action_type is being changed
      if (data.trigger || data.action_type) {
        const newTrigger = data.trigger || action.trigger;
        const newActionType = data.action_type || action.action_type;
        this._validateTriggerActionCombination(newTrigger, newActionType);
      }

      // Update fields
      const updateFields = [
        'name', 'model_name', 'trigger', 'action_type', 'isActive',
        'filter_domain', 'filter_pre_domain', 'trigger_field_ids',
        'trg_date_range', 'trg_date_range_type',
        'update_field_mappings', 'activity_summary', 'activity_note',
        'activity_date_deadline_range', 'activity_user_type',
        'activity_user_field_name', 'email_template_id',
        'notification_message', 'webhook_url', 'webhook_method',
        'webhook_headers', 'description', 'sequence'
      ];

      updateFields.forEach(field => {
        if (data[field] !== undefined) {
          action[field] = data[field];
        }
      });

      // Handle ObjectId fields
      if (data.trg_date_id) {
        action.trg_date_id = new mongoose.Types.ObjectId(data.trg_date_id);
      }
      if (data.activity_type_id) {
        action.activity_type_id = new mongoose.Types.ObjectId(data.activity_type_id);
      }
      if (data.activity_user_id) {
        action.activity_user_id = new mongoose.Types.ObjectId(data.activity_user_id);
      }
      if (data.notification_user_ids) {
        action.notification_user_ids = data.notification_user_ids.map(id => new mongoose.Types.ObjectId(id));
      }

      await action.save();

      // Audit log
      await auditLogService.log(
        'update',
        'automated_action',
        action._id.toString(),
        { before: beforeState, after: action.toObject() },
        {
          ...context,
          details: { actionName: action.name }
        }
      );

      return action;
    } catch (error) {
      logger.error('AutomatedActionService.updateAction failed:', error.message);
      throw error;
    }
  }

  /**
   * Delete an automated action
   * SECURITY: Requires firmId verification to prevent cross-firm deletes
   * @param {String} actionId - Action ID
   * @param {Object} context - Request context (must contain firmId)
   * @returns {Promise<Object>} - Deleted action
   */
  async deleteAction(actionId, context = {}) {
    try {
      // SECURITY: Require firmId in context for multi-tenant isolation
      if (!context.firmId) {
        throw new Error('Firm ID is required for delete operation');
      }

      const action = await AutomatedAction.findOne({
        _id: actionId,
        firmId: new mongoose.Types.ObjectId(context.firmId)
      });

      if (!action) {
        throw new Error('Automated action not found');
      }

      const actionName = action.name;
      await action.deleteOne();

      // Audit log
      await auditLogService.log(
        'delete',
        'automated_action',
        actionId,
        null,
        {
          ...context,
          details: { actionName }
        }
      );

      return action;
    } catch (error) {
      logger.error('AutomatedActionService.deleteAction failed:', error.message);
      throw error;
    }
  }

  /**
   * Toggle active status of an automated action
   * SECURITY: Requires firmId verification to prevent cross-firm updates
   * @param {String} actionId - Action ID
   * @param {Object} context - Request context (must contain firmId)
   * @returns {Promise<Object>} - Updated action
   */
  async toggleActive(actionId, context = {}) {
    try {
      // SECURITY: Require firmId in context for multi-tenant isolation
      if (!context.firmId) {
        throw new Error('Firm ID is required for toggle operation');
      }

      const action = await AutomatedAction.findOne({
        _id: actionId,
        firmId: new mongoose.Types.ObjectId(context.firmId)
      });

      if (!action) {
        throw new Error('Automated action not found');
      }

      action.isActive = !action.isActive;
      await action.save();

      // Audit log
      await auditLogService.log(
        'update',
        'automated_action',
        action._id.toString(),
        null,
        {
          ...context,
          details: {
            actionName: action.name,
            isActive: action.isActive,
            action: action.isActive ? 'activated' : 'deactivated'
          }
        }
      );

      return action;
    } catch (error) {
      logger.error('AutomatedActionService.toggleActive failed:', error.message);
      throw error;
    }
  }

  /**
   * Trigger actions when a record is created
   * @param {String} firmId - Firm ID
   * @param {String} modelName - Model name (e.g., 'Case', 'Client')
   * @param {Object} record - Created record
   * @param {Object} context - Request context
   * @returns {Promise<Array>} - Executed actions
   */
  async triggerOnCreate(firmId, modelName, record, context = {}) {
    try {
      // Find matching on_create actions
      const actions = await AutomatedAction.find({
        firmId: new mongoose.Types.ObjectId(firmId),
        model_name: modelName,
        trigger: 'on_create',
        isActive: true
      }).sort({ sequence: 1 });

      const executedActions = [];

      for (const action of actions) {
        try {
          // Check filter_domain conditions
          if (action.filter_domain && !this._checkDomain(record, action.filter_domain)) {
            continue;
          }

          // Execute action
          await this.executeAction(action, record, context);
          executedActions.push(action);
        } catch (error) {
          logger.error(`Failed to execute action ${action.name}:`, error.message);
          // Continue with other actions
        }
      }

      return executedActions;
    } catch (error) {
      logger.error('AutomatedActionService.triggerOnCreate failed:', error.message);
      return [];
    }
  }

  /**
   * Trigger actions when a record is updated
   * @param {String} firmId - Firm ID
   * @param {String} modelName - Model name
   * @param {Object} record - Updated record (after state)
   * @param {Object} changes - Changed fields { field: { oldValue, newValue } }
   * @param {Object} context - Request context
   * @returns {Promise<Array>} - Executed actions
   */
  async triggerOnWrite(firmId, modelName, record, changes, context = {}) {
    try {
      // Find matching on_write actions
      const actions = await AutomatedAction.find({
        firmId: new mongoose.Types.ObjectId(firmId),
        model_name: modelName,
        trigger: 'on_write',
        isActive: true
      }).sort({ sequence: 1 });

      const executedActions = [];
      const changedFields = Object.keys(changes);

      for (const action of actions) {
        try {
          // Check if any of the changed fields match trigger_field_ids
          if (action.trigger_field_ids && action.trigger_field_ids.length > 0) {
            const hasMatchingField = action.trigger_field_ids.some(field =>
              changedFields.includes(field)
            );

            if (!hasMatchingField) {
              continue;
            }
          }

          // Check filter_pre_domain (before state)
          if (action.filter_pre_domain) {
            const beforeRecord = this._reconstructBeforeState(record, changes);
            if (!this._checkDomain(beforeRecord, action.filter_pre_domain)) {
              continue;
            }
          }

          // Check filter_domain (after state)
          if (action.filter_domain && !this._checkDomain(record, action.filter_domain)) {
            continue;
          }

          // Execute action
          await this.executeAction(action, record, context);
          executedActions.push(action);
        } catch (error) {
          logger.error(`Failed to execute action ${action.name}:`, error.message);
          // Continue with other actions
        }
      }

      return executedActions;
    } catch (error) {
      logger.error('AutomatedActionService.triggerOnWrite failed:', error.message);
      return [];
    }
  }

  /**
   * Trigger actions when a record's stage changes
   * @param {String} firmId - Firm ID
   * @param {String} modelName - Model name
   * @param {Object} record - Updated record
   * @param {String} fromStage - Previous stage
   * @param {String} toStage - New stage
   * @param {Object} context - Request context
   * @returns {Promise<Array>} - Executed actions
   */
  async triggerOnStageChange(firmId, modelName, record, fromStage, toStage, context = {}) {
    try {
      // Find matching on_stage_change actions
      const actions = await AutomatedAction.find({
        firmId: new mongoose.Types.ObjectId(firmId),
        model_name: modelName,
        trigger: 'on_stage_change',
        isActive: true
      }).sort({ sequence: 1 });

      const executedActions = [];

      for (const action of actions) {
        try {
          // Check filter_domain conditions
          if (action.filter_domain && !this._checkDomain(record, action.filter_domain)) {
            continue;
          }

          // Execute action
          await this.executeAction(action, record, { ...context, fromStage, toStage });
          executedActions.push(action);
        } catch (error) {
          logger.error(`Failed to execute action ${action.name}:`, error.message);
          // Continue with other actions
        }
      }

      return executedActions;
    } catch (error) {
      logger.error('AutomatedActionService.triggerOnStageChange failed:', error.message);
      return [];
    }
  }

  /**
   * Execute a single automated action
   * @param {Object} action - Automated action
   * @param {Object} record - Target record
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Execution result
   */
  async executeAction(action, record, context = {}) {
    try {
      let result = null;

      // Execute based on action_type
      switch (action.action_type) {
        case 'update_record':
          result = await this._executeUpdateRecord(action, record);
          break;

        case 'create_activity':
          result = await this._executeCreateActivity(action, record, context);
          break;

        case 'send_email':
          result = await this._executeSendEmail(action, record);
          break;

        case 'send_notification':
          result = await this._executeSendNotification(action, record, context);
          break;

        case 'webhook':
          result = await this._executeWebhook(action, record);
          break;

        default:
          throw new Error(`Unknown action type: ${action.action_type}`);
      }

      // Log execution
      await auditLogService.log(
        'execute_automated_action',
        'automated_action',
        action._id.toString(),
        null,
        {
          ...context,
          details: {
            actionName: action.name,
            actionType: action.action_type,
            trigger: action.trigger,
            recordId: record._id?.toString(),
            modelName: action.model_name,
            result: result ? 'success' : 'completed'
          }
        }
      );

      return result;
    } catch (error) {
      logger.error('AutomatedActionService.executeAction failed:', error.message);

      // Log failure
      await auditLogService.log(
        'execute_automated_action',
        'automated_action',
        action._id.toString(),
        null,
        {
          ...context,
          status: 'failure',
          errorMessage: error.message,
          details: {
            actionName: action.name,
            actionType: action.action_type,
            recordId: record._id?.toString()
          }
        }
      );

      throw error;
    }
  }

  /**
   * Process time-based actions (called by queue/cron)
   * @returns {Promise<Array>} - Executed actions
   */
  async processTimeBasedActions() {
    try {
      const now = new Date();

      // Find on_time actions
      const actions = await AutomatedAction.find({
        trigger: 'on_time',
        isActive: true,
        trg_date_id: { $exists: true, $ne: null },
        trg_date_range: { $exists: true, $ne: null }
      }).populate('trg_date_id');

      const executedActions = [];

      for (const action of actions) {
        try {
          // Find records that match the time condition
          const Model = mongoose.model(action.model_name);
          const dateField = action.trg_date_id.name;

          // Calculate target date based on range
          const targetDate = this._calculateTargetDate(now, action.trg_date_range, action.trg_date_range_type);

          // Query for matching records
          const query = {
            firmId: action.firmId
          };

          // Add date range condition
          query[dateField] = {
            $gte: new Date(targetDate.getTime() - 60000), // 1 minute tolerance
            $lte: new Date(targetDate.getTime() + 60000)
          };

          // Apply filter_domain if present
          if (action.filter_domain) {
            this._applyDomainToQuery(query, action.filter_domain);
          }

          const records = await Model.find(query);

          // Execute action for each matching record
          for (const record of records) {
            try {
              await this.executeAction(action, record, { trigger: 'time_based' });
              executedActions.push({ action, record });
            } catch (error) {
              logger.error(`Failed to execute time-based action for record ${record._id}:`, error.message);
            }
          }
        } catch (error) {
          logger.error(`Failed to process time-based action ${action.name}:`, error.message);
        }
      }

      return executedActions;
    } catch (error) {
      logger.error('AutomatedActionService.processTimeBasedActions failed:', error.message);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Validate trigger and action type combination
   * @private
   */
  _validateTriggerActionCombination(trigger, actionType) {
    const validCombinations = {
      on_create: ['update_record', 'create_activity', 'send_email', 'send_notification', 'webhook'],
      on_write: ['update_record', 'create_activity', 'send_email', 'send_notification', 'webhook'],
      on_stage_change: ['create_activity', 'send_email', 'send_notification', 'webhook'],
      on_time: ['create_activity', 'send_email', 'send_notification', 'webhook']
    };

    if (!validCombinations[trigger]) {
      throw new Error(`Invalid trigger: ${trigger}`);
    }

    if (!validCombinations[trigger].includes(actionType)) {
      throw new Error(`Invalid action type '${actionType}' for trigger '${trigger}'`);
    }
  }

  /**
   * Check if a record matches a domain filter
   * @private
   */
  _checkDomain(record, domain) {
    try {
      if (!domain || domain.length === 0) {
        return true;
      }

      // Domain is an array of conditions: [['field', 'operator', 'value'], ...]
      // Supports: '=', '!=', '>', '>=', '<', '<=', 'in', 'not in', 'contains'

      for (const condition of domain) {
        if (Array.isArray(condition) && condition.length === 3) {
          const [field, operator, value] = condition;
          const recordValue = this._getNestedValue(record, field);

          let matches = false;

          switch (operator) {
            case '=':
            case '==':
              matches = recordValue == value;
              break;
            case '!=':
              matches = recordValue != value;
              break;
            case '>':
              matches = recordValue > value;
              break;
            case '>=':
              matches = recordValue >= value;
              break;
            case '<':
              matches = recordValue < value;
              break;
            case '<=':
              matches = recordValue <= value;
              break;
            case 'in':
              matches = Array.isArray(value) && value.includes(recordValue);
              break;
            case 'not in':
              matches = Array.isArray(value) && !value.includes(recordValue);
              break;
            case 'contains':
              matches = recordValue && String(recordValue).includes(value);
              break;
            case 'ilike':
              matches = recordValue && String(recordValue).toLowerCase().includes(String(value).toLowerCase());
              break;
            default:
              logger.warn(`Unknown domain operator: ${operator}`);
              matches = false;
          }

          if (!matches) {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      logger.error('AutomatedActionService._checkDomain failed:', error.message);
      return false;
    }
  }

  /**
   * Get nested value from object by path
   * @private
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

  /**
   * Reconstruct before state from current record and changes
   * @private
   */
  _reconstructBeforeState(record, changes) {
    const beforeRecord = { ...record.toObject ? record.toObject() : record };

    Object.keys(changes).forEach(field => {
      if (changes[field].oldValue !== undefined) {
        beforeRecord[field] = changes[field].oldValue;
      }
    });

    return beforeRecord;
  }

  /**
   * Apply domain conditions to a MongoDB query
   * @private
   */
  _applyDomainToQuery(query, domain) {
    try {
      if (!domain || domain.length === 0) {
        return;
      }

      for (const condition of domain) {
        if (Array.isArray(condition) && condition.length === 3) {
          const [field, operator, value] = condition;

          // Validate field name to prevent NoSQL injection via dynamic field names
          if (!isValidFieldName(field)) {
            logger.warn(`Invalid field name in domain filter: ${field}`);
            continue;
          }

          switch (operator) {
            case '=':
            case '==':
              query[field] = value;
              break;
            case '!=':
              query[field] = { $ne: value };
              break;
            case '>':
              query[field] = { $gt: value };
              break;
            case '>=':
              query[field] = { $gte: value };
              break;
            case '<':
              query[field] = { $lt: value };
              break;
            case '<=':
              query[field] = { $lte: value };
              break;
            case 'in':
              query[field] = { $in: value };
              break;
            case 'not in':
              query[field] = { $nin: value };
              break;
            case 'contains':
            case 'ilike':
              query[field] = { $regex: escapeRegex(value), $options: 'i' };
              break;
          }
        }
      }
    } catch (error) {
      logger.error('AutomatedActionService._applyDomainToQuery failed:', error.message);
    }
  }

  /**
   * Calculate target date based on range and type
   * @private
   */
  _calculateTargetDate(baseDate, range, rangeType) {
    const date = new Date(baseDate);

    switch (rangeType) {
      case 'minutes':
        date.setMinutes(date.getMinutes() + range);
        break;
      case 'hours':
        date.setHours(date.getHours() + range);
        break;
      case 'days':
        date.setDate(date.getDate() + range);
        break;
      case 'weeks':
        date.setDate(date.getDate() + (range * 7));
        break;
      case 'months':
        date.setMonth(date.getMonth() + range);
        break;
      default:
        date.setDate(date.getDate() + range);
    }

    return date;
  }

  /**
   * Execute update_record action
   * @private
   */
  async _executeUpdateRecord(action, record) {
    try {
      if (!action.update_field_mappings || Object.keys(action.update_field_mappings).length === 0) {
        throw new Error('No field mappings defined for update_record action');
      }

      const Model = mongoose.model(action.model_name);
      const updates = {};

      // Apply field mappings
      Object.keys(action.update_field_mappings).forEach(field => {
        updates[field] = action.update_field_mappings[field];
      });

      // Update the record
      await Model.findOneAndUpdate({ _id: record._id, firmId: action.firmId }, updates, { new: true });

      return { updated: true, fields: Object.keys(updates) };
    } catch (error) {
      logger.error('AutomatedActionService._executeUpdateRecord failed:', error.message);
      throw error;
    }
  }

  /**
   * Execute create_activity action
   * @private
   */
  async _executeCreateActivity(action, record, context = {}) {
    try {
      if (!action.activity_type_id) {
        throw new Error('No activity type defined for create_activity action');
      }

      // Determine user to assign the activity to
      let assignedUserId = null;

      if (action.activity_user_type === 'specific' && action.activity_user_id) {
        assignedUserId = action.activity_user_id;
      } else if (action.activity_user_type === 'generic' && action.activity_user_field_name) {
        // Get user from record field
        const userField = this._getNestedValue(record, action.activity_user_field_name);
        if (userField) {
          assignedUserId = userField._id || userField;
        }
      }

      if (!assignedUserId) {
        throw new Error('Could not determine user to assign activity to');
      }

      // Calculate deadline
      const deadline = new Date();
      if (action.activity_date_deadline_range) {
        deadline.setDate(deadline.getDate() + action.activity_date_deadline_range);
      }

      // Replace placeholders in summary and note
      const summary = this._replacePlaceholders(action.activity_summary || 'Automated Activity', record);
      const note = this._replacePlaceholders(action.activity_note || '', record);

      // Create activity
      const activity = await Activity.create({
        firmId: action.firmId,
        res_model: action.model_name,
        res_id: record._id,
        activity_type_id: action.activity_type_id,
        summary,
        note,
        date_deadline: deadline,
        user_id: assignedUserId,
        create_user_id: context.userId || assignedUserId,
        state: 'scheduled',
        automated: true
      });

      return { activity: activity._id };
    } catch (error) {
      logger.error('AutomatedActionService._executeCreateActivity failed:', error.message);
      throw error;
    }
  }

  /**
   * Execute send_email action
   * @private
   */
  async _executeSendEmail(action, record) {
    try {
      if (!action.email_template_id) {
        throw new Error('No email template defined for send_email action');
      }

      // Get email recipient from record
      const recipientEmail = record.email || this._getNestedValue(record, 'email');

      if (!recipientEmail) {
        throw new Error('No email address found on record');
      }

      // Send email using email service
      await emailService.sendFromTemplate(
        action.email_template_id,
        recipientEmail,
        {
          record: record.toObject ? record.toObject() : record
        }
      );

      return { email_sent: true, recipient: recipientEmail };
    } catch (error) {
      logger.error('AutomatedActionService._executeSendEmail failed:', error.message);
      throw error;
    }
  }

  /**
   * Execute send_notification action
   * @private
   */
  async _executeSendNotification(action, record, context = {}) {
    try {
      if (!action.notification_message) {
        throw new Error('No notification message defined');
      }

      if (!action.notification_user_ids || action.notification_user_ids.length === 0) {
        throw new Error('No users specified for notification');
      }

      // Replace placeholders in message
      const message = this._replacePlaceholders(action.notification_message, record);

      // Send notification to each user
      const notifications = await Promise.all(
        action.notification_user_ids.map(userId =>
          notificationService.create({
            userId,
            title: `Automated: ${action.name}`,
            message,
            type: 'automation',
            relatedModel: action.model_name,
            relatedId: record._id,
            firmId: action.firmId
          })
        )
      );

      return { notifications_sent: notifications.length, user_ids: action.notification_user_ids };
    } catch (error) {
      logger.error('AutomatedActionService._executeSendNotification failed:', error.message);
      throw error;
    }
  }

  /**
   * Execute webhook action
   * @private
   */
  async _executeWebhook(action, record) {
    try {
      if (!action.webhook_url) {
        throw new Error('No webhook URL defined');
      }

      // Prepare payload
      const payload = {
        action: action.name,
        trigger: action.trigger,
        model: action.model_name,
        record: record.toObject ? record.toObject() : record,
        timestamp: new Date().toISOString()
      };

      // Send webhook
      await webhookService.send({
        url: action.webhook_url,
        method: action.webhook_method || 'POST',
        headers: action.webhook_headers || {},
        data: payload
      });

      return { webhook_sent: true, url: action.webhook_url };
    } catch (error) {
      logger.error('AutomatedActionService._executeWebhook failed:', error.message);
      throw error;
    }
  }

  /**
   * Replace placeholders in text with record values
   * @private
   */
  _replacePlaceholders(text, record) {
    if (!text) return '';

    let result = text;

    // Match patterns like {{field_name}} or {{nested.field}}
    const placeholderPattern = /\{\{([a-zA-Z0-9_.]+)\}\}/g;

    result = result.replace(placeholderPattern, (match, fieldPath) => {
      const value = this._getNestedValue(record, fieldPath);
      return value !== undefined && value !== null ? String(value) : match;
    });

    return result;
  }
}

// Export singleton instance
module.exports = new AutomatedActionService();
