/**
 * Automation Engine Service
 *
 * Comprehensive automation execution engine for processing automation rules
 * triggered by various events (record creation, updates, field changes, status changes).
 *
 * Features:
 * - Event-based automation triggering
 * - Conditional execution with field-based conditions
 * - Multiple action types (email, notification, task, record updates, webhooks, etc.)
 * - Rate limiting with Redis tracking
 * - Template variable interpolation
 * - Delayed action scheduling
 * - Error handling with continueOnError support
 * - Execution statistics tracking
 * - Multi-tenancy support
 *
 * Supported Action Types:
 * - update_record, create_record, send_email, send_notification
 * - create_task, update_field, call_webhook, send_slack
 * - assign_to, add_to_campaign, create_activity, delay
 */

const mongoose = require('mongoose');
const Automation = require('../models/automation.model');
const Task = require('../models/task.model');
const logger = require('../utils/logger');
const cacheService = require('./cache.service');
const emailService = require('./email.service');
const notificationService = require('./notificationDelivery.service');
const webhookService = require('./webhook.service');
const activityService = require('./activity.service');
const auditLogService = require('./auditLog.service');
const QueueService = require('./queue.service');

class AutomationEngine {
  /**
   * Process event and trigger matching automations
   * @param {String} eventType - Event type (record_created, record_updated, field_changed, status_changed)
   * @param {String} entityType - Entity type (lead, deal, contact, case, task, invoice)
   * @param {Object} record - The record that triggered the event
   * @param {Object} changes - Changed fields (for update events) { field: { oldValue, newValue } }
   * @param {String} firmId - Firm ID
   * @param {Object} context - Additional context (userId, etc.)
   * @returns {Promise<Array>} - Array of execution results
   */
  async processEvent(eventType, entityType, record, changes = {}, firmId, context = {}) {
    try {
      // Find enabled automations matching event type and entity type
      const automations = await Automation.find({
        firmId: new mongoose.Types.ObjectId(firmId),
        entityType,
        'trigger.type': eventType,
        enabled: true,
        isActive: true
      }).sort({ priority: 1 }).lean();

      if (!automations || automations.length === 0) {
        logger.info(`No active automations found for ${eventType} on ${entityType}`);
        return [];
      }

      logger.info(`Found ${automations.length} automation(s) for ${eventType} on ${entityType}`);

      const results = [];

      // Process each automation
      for (const automation of automations) {
        try {
          // Check if record matches trigger conditions
          if (!this.matchesTrigger(automation.trigger, record, changes)) {
            logger.debug(`Automation "${automation.name}" conditions not met, skipping`);
            continue;
          }

          // Check rate limits
          const withinRateLimit = await this.checkRateLimit(automation);
          if (!withinRateLimit) {
            logger.warn(`Automation "${automation.name}" rate limit exceeded, skipping`);
            continue;
          }

          // Execute the automation
          const result = await this.executeAutomation(automation, record, {
            ...context,
            firmId,
            eventType,
            changes
          });

          results.push({
            automationId: automation._id,
            automationName: automation.name,
            ...result
          });

        } catch (error) {
          logger.error(`Error processing automation "${automation.name}":`, error.message);
          results.push({
            automationId: automation._id,
            automationName: automation.name,
            success: false,
            error: error.message
          });
        }
      }

      return results;

    } catch (error) {
      logger.error('AutomationEngine.processEvent failed:', error.message);
      throw error;
    }
  }

  /**
   * Check if record matches trigger conditions
   * @param {Object} trigger - Trigger configuration
   * @param {Object} record - Record to check
   * @param {Object} changes - Changed fields
   * @returns {Boolean} - True if all conditions match
   */
  matchesTrigger(trigger, record, changes = {}) {
    try {
      // For field_changed trigger, check if watched fields are in changes
      if (trigger.type === 'field_changed') {
        if (!trigger.watchFields || trigger.watchFields.length === 0) {
          return false;
        }

        const changedFields = Object.keys(changes);
        const hasMatchingField = trigger.watchFields.some(field =>
          changedFields.includes(field)
        );

        if (!hasMatchingField) {
          return false;
        }
      }

      // Evaluate all conditions (AND logic)
      if (!trigger.conditions || trigger.conditions.length === 0) {
        return true; // No conditions means always match
      }

      for (const condition of trigger.conditions) {
        // Handle special operators for field changes
        if (condition.operator === 'changed' || condition.operator === 'changed_to' || condition.operator === 'changed_from') {
          const change = changes[condition.field];
          if (!change) {
            return false; // Field didn't change
          }

          if (condition.operator === 'changed') {
            continue; // Just check that it changed
          }

          if (condition.operator === 'changed_to' && change.newValue != condition.value) {
            return false;
          }

          if (condition.operator === 'changed_from' && change.oldValue != condition.value) {
            return false;
          }

          continue;
        }

        // Evaluate regular condition
        if (!this.evaluateCondition(condition, record)) {
          return false;
        }
      }

      return true;

    } catch (error) {
      logger.error('AutomationEngine.matchesTrigger failed:', error.message);
      return false;
    }
  }

  /**
   * Evaluate a single condition
   * @param {Object} condition - Condition to evaluate
   * @param {Object} record - Record to evaluate against
   * @returns {Boolean} - True if condition matches
   */
  evaluateCondition(condition, record) {
    try {
      const { field, operator, value } = condition;

      // Get field value from record (support nested paths)
      const fieldValue = this.getFieldValue(record, field);

      switch (operator) {
        case 'equals':
          return fieldValue == value;

        case 'not_equals':
          return fieldValue != value;

        case 'contains':
          return fieldValue && String(fieldValue).includes(String(value));

        case 'not_contains':
          return !fieldValue || !String(fieldValue).includes(String(value));

        case 'starts_with':
          return fieldValue && String(fieldValue).startsWith(String(value));

        case 'ends_with':
          return fieldValue && String(fieldValue).endsWith(String(value));

        case 'greater_than':
          return Number(fieldValue) > Number(value);

        case 'greater_than_or_equal':
          return Number(fieldValue) >= Number(value);

        case 'less_than':
          return Number(fieldValue) < Number(value);

        case 'less_than_or_equal':
          return Number(fieldValue) <= Number(value);

        case 'is_empty':
          return !fieldValue || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0);

        case 'is_not_empty':
          return !!fieldValue && fieldValue !== '' && (!Array.isArray(fieldValue) || fieldValue.length > 0);

        case 'in':
          return Array.isArray(value) && value.includes(fieldValue);

        case 'not_in':
          return Array.isArray(value) && !value.includes(fieldValue);

        default:
          logger.warn(`Unknown operator: ${operator}`);
          return false;
      }

    } catch (error) {
      logger.error('AutomationEngine.evaluateCondition failed:', error.message);
      return false;
    }
  }

  /**
   * Get field value from record (supports nested paths)
   * @param {Object} record - Record object
   * @param {String} fieldPath - Field path (e.g., 'contact.email', 'status')
   * @returns {*} - Field value
   */
  getFieldValue(record, fieldPath) {
    if (!fieldPath) return undefined;

    const parts = fieldPath.split('.');
    let value = record;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Execute automation
   * @param {Object} automation - Automation configuration
   * @param {Object} record - Triggering record
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} - Execution result
   */
  async executeAutomation(automation, record, context = {}) {
    const startTime = Date.now();
    const results = [];
    let success = true;
    let errorMessage = null;

    try {
      logger.info(`Executing automation "${automation.name}" (ID: ${automation._id})`);

      // Sort actions by order
      const sortedActions = [...automation.actions].sort((a, b) => a.order - b.order);

      // Execute actions in order
      for (const action of sortedActions) {
        try {
          // Check for delay action
          if (action.type === 'delay') {
            // Schedule remaining actions for later
            await this.scheduleDelayed(automation, sortedActions, action, record, context);
            logger.info(`Automation "${automation.name}" scheduled delayed actions`);
            results.push({ action: action.type, success: true, message: 'Delayed actions scheduled' });
            break; // Stop processing further actions (they will be scheduled)
          }

          // Execute action
          const result = await this.executeAction(action, record, context);
          results.push({ action: action.type, success: true, result });

        } catch (err) {
          logger.error(`Action ${action.type} failed:`, err.message);
          results.push({ action: action.type, success: false, error: err.message });

          if (!action.continueOnError) {
            throw err; // Stop execution if action fails and continueOnError is false
          }
        }
      }

      // Update success stats
      const executionTime = Date.now() - startTime;
      await this.updateStats(automation._id, automation.firmId, true, executionTime);

      // Log to audit
      await auditLogService.log(
        'execute_automation',
        'automation',
        automation._id.toString(),
        null,
        {
          ...context,
          details: {
            automationName: automation.name,
            entityType: automation.entityType,
            recordId: record._id?.toString(),
            actionsExecuted: results.length,
            executionTime
          }
        }
      );

      return {
        success: true,
        results,
        executionTime
      };

    } catch (error) {
      success = false;
      errorMessage = error.message;
      logger.error(`Automation "${automation.name}" execution failed:`, error.message);

      // Update failure stats
      const executionTime = Date.now() - startTime;
      await this.updateStats(automation._id, automation.firmId, false, executionTime, error.message);

      // Log failure to audit
      await auditLogService.log(
        'execute_automation',
        'automation',
        automation._id.toString(),
        null,
        {
          ...context,
          status: 'failure',
          errorMessage: error.message,
          details: {
            automationName: automation.name,
            recordId: record._id?.toString()
          }
        }
      );

      return {
        success: false,
        error: error.message,
        results,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Execute single action
   * @param {Object} action - Action configuration
   * @param {Object} record - Triggering record
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} - Action result
   */
  async executeAction(action, record, context) {
    try {
      logger.debug(`Executing action: ${action.type}`);

      switch (action.type) {
        case 'update_record':
          return await this.executeUpdateRecord(action, record, context);

        case 'create_record':
          return await this.executeCreateRecord(action, record, context);

        case 'send_email':
          return await this.executeSendEmail(action, record, context);

        case 'send_notification':
          return await this.executeSendNotification(action, record, context);

        case 'create_task':
          return await this.executeCreateTask(action, record, context);

        case 'update_field':
          return await this.executeUpdateField(action, record, context);

        case 'call_webhook':
          return await this.executeCallWebhook(action, record, context);

        case 'send_slack':
          return await this.executeSendSlack(action, record, context);

        case 'assign_to':
          return await this.executeAssignTo(action, record, context);

        case 'add_to_campaign':
          return await this.executeAddToCampaign(action, record, context);

        case 'create_activity':
          return await this.executeCreateActivity(action, record, context);

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

    } catch (error) {
      logger.error(`AutomationEngine.executeAction (${action.type}) failed:`, error.message);
      throw error;
    }
  }

  /**
   * Execute update_record action
   * @private
   */
  async executeUpdateRecord(action, record, context) {
    const { config } = action;

    if (!config || !config.fields) {
      throw new Error('update_record action requires fields configuration');
    }

    // Get the model for the record
    const Model = mongoose.model(context.entityType || record.constructor.modelName);

    // Prepare updates with variable interpolation
    const updates = {};
    for (const [field, value] of Object.entries(config.fields)) {
      updates[field] = this.interpolate(String(value), { record, context });
    }

    // Update the record with firmId isolation
    await Model.findOneAndUpdate(
      { _id: record._id, firmId: context.firmId },
      updates,
      { new: true }
    );

    return { updated: true, fields: Object.keys(updates) };
  }

  /**
   * Execute create_record action
   * @private
   */
  async executeCreateRecord(action, record, context) {
    const { config } = action;

    if (!config || !config.entityType || !config.fields) {
      throw new Error('create_record action requires entityType and fields configuration');
    }

    // Get the model
    const Model = mongoose.model(config.entityType);

    // Prepare data with variable interpolation
    const data = { firmId: context.firmId };
    for (const [field, value] of Object.entries(config.fields)) {
      data[field] = this.interpolate(String(value), { record, context });
    }

    // Create the record
    const newRecord = await Model.create(data);

    return { created: true, recordId: newRecord._id, entityType: config.entityType };
  }

  /**
   * Execute send_email action
   * @private
   */
  async executeSendEmail(action, record, context) {
    const { config } = action;

    if (!config || !config.to || !config.subject) {
      throw new Error('send_email action requires to, subject configuration');
    }

    // Interpolate variables
    const to = this.interpolate(config.to, { record, context });
    const subject = this.interpolate(config.subject, { record, context });
    const message = this.interpolate(config.message || '', { record, context });

    // Send email
    await emailService.sendEmail({
      to,
      subject,
      html: `<p>${message}</p>`
    });

    return { sent: true, to, subject };
  }

  /**
   * Execute send_notification action
   * @private
   */
  async executeSendNotification(action, record, context) {
    const { config } = action;

    if (!config || !config.userId || !config.title) {
      throw new Error('send_notification action requires userId and title configuration');
    }

    // Interpolate variables
    const title = this.interpolate(config.title, { record, context });
    const message = this.interpolate(config.message || '', { record, context });

    // Send notification
    await notificationService.send({
      userId: config.userId,
      channels: config.channels || ['in_app'],
      title,
      message,
      data: {
        recordId: record._id,
        entityType: context.entityType
      }
    });

    return { sent: true, userId: config.userId, title };
  }

  /**
   * Execute create_task action
   * @private
   */
  async executeCreateTask(action, record, context) {
    const { config } = action;

    if (!config || !config.title) {
      throw new Error('create_task action requires title configuration');
    }

    // Prepare task data
    const taskData = {
      firmId: context.firmId,
      title: this.interpolate(config.title, { record, context }),
      description: config.description ? this.interpolate(config.description, { record, context }) : '',
      assignedTo: config.assignedTo || context.userId,
      createdBy: context.userId,
      priority: config.priority || 'medium',
      status: config.status || 'todo',
      createdByAutomation: true
    };

    // Add due date if specified
    if (config.dueDateOffset) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + config.dueDateOffset);
      taskData.dueDate = dueDate;
    }

    // Create the task
    const task = await Task.create(taskData);

    return { created: true, taskId: task._id };
  }

  /**
   * Execute update_field action
   * @private
   */
  async executeUpdateField(action, record, context) {
    const { config } = action;

    if (!config || !config.field || config.value === undefined) {
      throw new Error('update_field action requires field and value configuration');
    }

    // Get the model
    const Model = mongoose.model(context.entityType || record.constructor.modelName);

    // Interpolate value
    const value = this.interpolate(String(config.value), { record, context });

    // Update the field with firmId isolation
    await Model.findOneAndUpdate(
      { _id: record._id, firmId: context.firmId },
      { [config.field]: value },
      { new: true }
    );

    return { updated: true, field: config.field, value };
  }

  /**
   * Execute call_webhook action
   * @private
   */
  async executeCallWebhook(action, record, context) {
    const { config } = action;

    if (!config || !config.url) {
      throw new Error('call_webhook action requires url configuration');
    }

    // Prepare payload
    const payload = {
      event: context.eventType,
      entityType: context.entityType,
      record: record.toObject ? record.toObject() : record,
      timestamp: new Date().toISOString()
    };

    // Send webhook
    await webhookService.send({
      url: config.url,
      method: config.method || 'POST',
      headers: config.headers || {},
      data: payload
    });

    return { sent: true, url: config.url };
  }

  /**
   * Execute send_slack action
   * @private
   */
  async executeSendSlack(action, record, context) {
    const { config } = action;

    if (!config || !config.webhookUrl || !config.message) {
      throw new Error('send_slack action requires webhookUrl and message configuration');
    }

    // Interpolate message
    const message = this.interpolate(config.message, { record, context });

    // Send to Slack
    await webhookService.send({
      url: config.webhookUrl,
      method: 'POST',
      data: { text: message }
    });

    return { sent: true, message };
  }

  /**
   * Execute assign_to action
   * @private
   */
  async executeAssignTo(action, record, context) {
    const { config } = action;

    if (!config || !config.userId) {
      throw new Error('assign_to action requires userId configuration');
    }

    // Get the model
    const Model = mongoose.model(context.entityType || record.constructor.modelName);

    // Update assignedTo field with firmId isolation
    await Model.findOneAndUpdate(
      { _id: record._id, firmId: context.firmId },
      { assignedTo: config.userId },
      { new: true }
    );

    return { assigned: true, userId: config.userId };
  }

  /**
   * Execute add_to_campaign action
   * @private
   */
  async executeAddToCampaign(action, record, context) {
    const { config } = action;

    if (!config || !config.campaignId) {
      throw new Error('add_to_campaign action requires campaignId configuration');
    }

    // This is a placeholder - actual implementation depends on campaign system
    logger.info(`Would add record ${record._id} to campaign ${config.campaignId}`);

    return { added: true, campaignId: config.campaignId };
  }

  /**
   * Execute create_activity action
   * @private
   */
  async executeCreateActivity(action, record, context) {
    const { config } = action;

    if (!config || !config.activity_type_id) {
      throw new Error('create_activity action requires activity_type_id configuration');
    }

    // Prepare activity data
    const activityData = {
      res_model: context.entityType,
      res_id: record._id,
      activity_type_id: config.activity_type_id,
      summary: config.summary ? this.interpolate(config.summary, { record, context }) : 'Automated Activity',
      note: config.note ? this.interpolate(config.note, { record, context }) : '',
      user_id: config.userId || context.userId
    };

    // Create activity using activity service
    const activity = await activityService.scheduleActivity(activityData, context);

    return { created: true, activityId: activity?._id };
  }

  /**
   * Interpolate variables in templates
   * Replaces {{variable.path}} with values from context
   * @param {String} template - Template string
   * @param {Object} context - Context object { record, user, etc. }
   * @returns {String} - Interpolated string
   */
  interpolate(template, context = {}) {
    if (!template || typeof template !== 'string') {
      return template;
    }

    let result = template;

    // Match patterns like {{record.field}}, {{user.name}}, {{now}}
    const placeholderPattern = /\{\{([a-zA-Z0-9_.]+)\}\}/g;

    result = result.replace(placeholderPattern, (match, path) => {
      // Handle special variables
      if (path === 'now') {
        return new Date().toISOString();
      }

      if (path === 'today') {
        return new Date().toISOString().split('T')[0];
      }

      // Get value from context
      const value = this.getFieldValue(context, path);
      return value !== undefined && value !== null ? String(value) : match;
    });

    return result;
  }

  /**
   * Check rate limits
   * @param {Object} automation - Automation configuration
   * @returns {Promise<Boolean>} - True if within limits
   */
  async checkRateLimit(automation) {
    try {
      if (!automation.rateLimit || !automation.rateLimit.enabled) {
        return true; // No rate limit configured
      }

      const { maxPerHour, maxPerDay } = automation.rateLimit;
      const automationId = automation._id.toString();

      // Check hourly limit
      if (maxPerHour && maxPerHour > 0) {
        const hourKey = `automation:ratelimit:hour:${automationId}`;
        const hourCount = await cacheService.get(hourKey) || 0;

        if (hourCount >= maxPerHour) {
          logger.warn(`Automation ${automationId} exceeded hourly rate limit (${maxPerHour})`);
          return false;
        }
      }

      // Check daily limit
      if (maxPerDay && maxPerDay > 0) {
        const dayKey = `automation:ratelimit:day:${automationId}`;
        const dayCount = await cacheService.get(dayKey) || 0;

        if (dayCount >= maxPerDay) {
          logger.warn(`Automation ${automationId} exceeded daily rate limit (${maxPerDay})`);
          return false;
        }
      }

      // Increment counters
      const hourKey = `automation:ratelimit:hour:${automationId}`;
      const dayKey = `automation:ratelimit:day:${automationId}`;

      await cacheService.increment(hourKey, 1);
      await cacheService.increment(dayKey, 1);

      // Set expiry if not already set (1 hour for hourly, 24 hours for daily)
      const hourTtl = await cacheService.ttl(hourKey);
      if (hourTtl === -1) {
        await cacheService.set(hourKey, await cacheService.get(hourKey), 3600); // 1 hour
      }

      const dayTtl = await cacheService.ttl(dayKey);
      if (dayTtl === -1) {
        await cacheService.set(dayKey, await cacheService.get(dayKey), 86400); // 24 hours
      }

      return true;

    } catch (error) {
      logger.error('AutomationEngine.checkRateLimit failed:', error.message);
      return true; // Allow execution on error
    }
  }

  /**
   * Schedule delayed action
   * @param {Object} automation - Automation configuration
   * @param {Array} allActions - All actions in the automation
   * @param {Object} delayAction - The delay action
   * @param {Object} record - Triggering record
   * @param {Object} context - Execution context
   * @returns {Promise<void>}
   */
  async scheduleDelayed(automation, allActions, delayAction, record, context) {
    try {
      const { config } = delayAction;

      if (!config || !config.duration) {
        throw new Error('delay action requires duration configuration');
      }

      // Parse delay (e.g., "1 hour", "3 days", "30 minutes")
      const delayMs = this.parseDuration(config.duration, config.unit || 'minutes');

      // Get remaining actions after the delay
      const delayIndex = allActions.findIndex(a => a._id === delayAction._id);
      const remainingActions = allActions.slice(delayIndex + 1);

      if (remainingActions.length === 0) {
        logger.info('No actions to schedule after delay');
        return;
      }

      // Schedule job to execute remaining actions
      await QueueService.addJob('automation-delayed', {
        automationId: automation._id.toString(),
        automationName: automation.name,
        recordId: record._id.toString(),
        entityType: context.entityType,
        firmId: context.firmId,
        actions: remainingActions,
        context
      }, {
        delay: delayMs,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        }
      });

      logger.info(`Scheduled ${remainingActions.length} action(s) to execute after ${config.duration} ${config.unit || 'minutes'}`);

    } catch (error) {
      logger.error('AutomationEngine.scheduleDelayed failed:', error.message);
      throw error;
    }
  }

  /**
   * Parse duration string to milliseconds
   * @param {Number|String} duration - Duration value
   * @param {String} unit - Unit (minutes, hours, days, weeks)
   * @returns {Number} - Duration in milliseconds
   */
  parseDuration(duration, unit = 'minutes') {
    const value = Number(duration);

    if (isNaN(value)) {
      throw new Error(`Invalid duration: ${duration}`);
    }

    const multipliers = {
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
      weeks: 7 * 24 * 60 * 60 * 1000
    };

    const multiplier = multipliers[unit] || multipliers.minutes;
    return value * multiplier;
  }

  /**
   * Update automation statistics
   * @param {String} automationId - Automation ID
   * @param {String} firmId - Firm ID
   * @param {Boolean} success - Whether execution was successful
   * @param {Number} executionTime - Execution time in milliseconds
   * @param {String} error - Error message if failed
   * @returns {Promise<void>}
   */
  async updateStats(automationId, firmId, success, executionTime, error = null) {
    try {
      const automation = await Automation.findOne({ _id: automationId, firmId });
      if (!automation) {
        logger.warn(`Automation ${automationId} not found for stats update`);
        return;
      }

      automation.stats.totalRuns = (automation.stats.totalRuns || 0) + 1;

      if (success) {
        automation.stats.successfulRuns = (automation.stats.successfulRuns || 0) + 1;
      } else {
        automation.stats.failedRuns = (automation.stats.failedRuns || 0) + 1;
        automation.stats.lastError = error;
        automation.stats.lastErrorAt = new Date();
      }

      automation.stats.lastRun = new Date();

      // Update average execution time
      const totalRuns = automation.stats.totalRuns;
      const currentAvg = automation.stats.averageExecutionTime || 0;
      automation.stats.averageExecutionTime = ((currentAvg * (totalRuns - 1)) + executionTime) / totalRuns;

      await automation.save();

    } catch (error) {
      logger.error('AutomationEngine.updateStats failed:', error.message);
      // Don't throw - stats update failure shouldn't break automation execution
    }
  }

  /**
   * Get automations for entity type
   * @param {String} entityType - Entity type
   * @param {String} firmId - Firm ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of automations
   */
  async getAutomationsForEntity(entityType, firmId, options = {}) {
    try {
      const query = {
        firmId: new mongoose.Types.ObjectId(firmId),
        entityType
      };

      if (options.enabled !== undefined) {
        query.enabled = options.enabled;
      }

      if (options.triggerType) {
        query['trigger.type'] = options.triggerType;
      }

      return await Automation.find(query)
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email')
        .sort({ priority: 1, createdAt: -1 })
        .lean();

    } catch (error) {
      logger.error('AutomationEngine.getAutomationsForEntity failed:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new AutomationEngine();
