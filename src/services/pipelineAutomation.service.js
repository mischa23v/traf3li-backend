/**
 * Pipeline Stage Automation Service
 * Executes automated actions when leads/deals move between pipeline stages
 *
 * Supported Triggers:
 * - enter: Execute when entity enters this stage
 * - exit: Execute when entity exits this stage
 * - time_in_stage: Execute after entity has been in stage for specified duration
 *
 * Supported Actions:
 * - send_email: Send email notification to user/team
 * - create_task: Automatically create a task
 * - notify_user: Send in-app notification
 * - update_field: Update entity field value
 */

const mongoose = require('mongoose');
const NotificationDeliveryService = require('./notificationDelivery.service');

class PipelineAutomationService {
    /**
     * Execute stage automation triggers
     * @param {Object} options - Automation options
     * @param {Object} options.entity - The lead/deal entity
     * @param {Object} options.stage - The pipeline stage with autoActions
     * @param {string} options.trigger - Trigger type: 'enter', 'exit', 'time_in_stage'
     * @param {string} options.userId - User performing the action
     * @param {Object} options.oldStage - Previous stage (for exit triggers)
     * @returns {Promise<Object>} - Execution results
     */
    static async executeStageAutomation(options) {
        const { entity, stage, trigger, userId, oldStage } = options;

        if (!stage || !stage.autoActions || stage.autoActions.length === 0) {
            return { success: true, message: 'No automation configured for this stage' };
        }

        // Filter actions matching the trigger
        const applicableActions = stage.autoActions.filter(
            autoAction => autoAction.trigger === trigger
        );

        if (applicableActions.length === 0) {
            return { success: true, message: `No automation for trigger: ${trigger}` };
        }

        console.log(`🤖 Executing ${applicableActions.length} automation(s) for stage: ${stage.name}, trigger: ${trigger}`);

        const results = [];
        for (const autoAction of applicableActions) {
            try {
                // Check for delay
                if (autoAction.delayHours && autoAction.delayHours > 0) {
                    // Schedule for later execution (would require a job scheduler)
                    console.log(`⏰ Action scheduled for ${autoAction.delayHours} hours delay`);
                    // TODO: Implement with job scheduler (Bull, Agenda, etc.)
                    // For now, we'll execute immediately
                }

                const result = await this.executeAction({
                    action: autoAction.action,
                    config: autoAction.config,
                    entity,
                    stage,
                    userId,
                    oldStage
                });

                results.push(result);
            } catch (error) {
                console.error(`❌ Automation action failed:`, error);
                results.push({
                    action: autoAction.action,
                    success: false,
                    error: error.message
                });
            }
        }

        return {
            success: true,
            executed: results.length,
            results
        };
    }

    /**
     * Execute a specific automation action
     * @param {Object} options - Action options
     * @returns {Promise<Object>} - Execution result
     */
    static async executeAction(options) {
        const { action, config, entity, stage, userId, oldStage } = options;

        switch (action) {
            case 'send_email':
                return await this.sendEmailAction(config, entity, stage, userId);

            case 'create_task':
                return await this.createTaskAction(config, entity, stage, userId);

            case 'notify_user':
                return await this.notifyUserAction(config, entity, stage, userId);

            case 'update_field':
                return await this.updateFieldAction(config, entity, stage, userId);

            default:
                throw new Error(`Unknown action type: ${action}`);
        }
    }

    /**
     * Send Email Action
     * Config: { to, subject, message, templateId }
     */
    static async sendEmailAction(config, entity, stage, userId) {
        const User = require('../models/user.model');

        // Determine recipient
        let recipientId = userId; // Default to current user
        if (config.to === 'assigned_user' && entity.assignedTo) {
            recipientId = entity.assignedTo;
        } else if (config.to === 'lead_owner') {
            recipientId = entity.lawyerId || entity.createdBy;
        } else if (config.recipientId) {
            recipientId = config.recipientId;
        }

        const recipient = await User.findById(recipientId).lean();
        if (!recipient || !recipient.email) {
            return {
                action: 'send_email',
                success: false,
                error: 'Recipient not found or has no email'
            };
        }

        // Replace placeholders in subject and message
        const variables = {
            entityName: entity.displayName || entity.firstName || entity.companyName || 'Unknown',
            stageName: stage.name,
            userName: `${recipient.firstName} ${recipient.lastName}`,
            entityType: entity.constructor.modelName || 'Lead'
        };

        const subject = this.replaceVariables(config.subject || 'Stage Update', variables);
        const message = this.replaceVariables(
            config.message || `${variables.entityName} has moved to ${stage.name}`,
            variables
        );

        // Send email via NotificationDeliveryService
        const result = await NotificationDeliveryService.sendEmail({
            to: recipient.email,
            subject,
            message,
            userName: variables.userName,
            data: {
                link: config.link || `/leads/${entity.leadId || entity._id}`
            },
            bypassRateLimit: false // Respect rate limits for automation emails
        });

        return {
            action: 'send_email',
            success: result.success,
            recipientEmail: recipient.email,
            messageId: result.messageId,
            error: result.error,
            rateLimited: result.rateLimited
        };
    }

    /**
     * Create Task Action
     * Config: { title, description, assignedTo, dueInDays, priority, taskType }
     */
    static async createTaskAction(config, entity, stage, userId) {
        const Task = require('../models/task.model');

        // Determine assignee
        let assignedTo = userId; // Default to current user
        if (config.assignedTo === 'assigned_user' && entity.assignedTo) {
            assignedTo = entity.assignedTo;
        } else if (config.assignedTo === 'lead_owner') {
            assignedTo = entity.lawyerId || entity.createdBy;
        } else if (config.assignToUserId) {
            assignedTo = config.assignToUserId;
        }

        // Calculate due date
        let dueDate = null;
        if (config.dueInDays && config.dueInDays > 0) {
            dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + config.dueInDays);
        }

        // Replace placeholders in title and description
        const variables = {
            entityName: entity.displayName || entity.firstName || entity.companyName || 'Unknown',
            stageName: stage.name,
            entityType: entity.constructor.modelName || 'Lead'
        };

        const title = this.replaceVariables(
            config.title || `Follow up: ${variables.entityName}`,
            variables
        );

        const description = this.replaceVariables(
            config.description || `Task created automatically when ${variables.entityName} moved to ${stage.name}`,
            variables
        );

        // Create task
        const task = await Task.create({
            title,
            description,
            assignedTo,
            createdBy: userId,
            status: 'todo',
            priority: config.priority || 'medium',
            taskType: config.taskType || 'general',
            dueDate,
            // Link to lead/deal if available
            ...(entity.constructor.modelName === 'Lead' && { linkedLeadId: entity._id }),
            // Add notes about automation
            notes: `Automatically created by pipeline automation for stage: ${stage.name}`,
            firmId: entity.firmId
        });

        console.log(`✅ Task created: ${task.title} (ID: ${task._id})`);

        return {
            action: 'create_task',
            success: true,
            taskId: task._id,
            title: task.title,
            assignedTo
        };
    }

    /**
     * Notify User Action
     * Config: { userId, title, message, priority }
     */
    static async notifyUserAction(config, entity, stage, userId) {
        const Notification = require('../models/notification.model');

        // Determine recipient
        let recipientId = userId; // Default to current user
        if (config.userId === 'assigned_user' && entity.assignedTo) {
            recipientId = entity.assignedTo;
        } else if (config.userId === 'lead_owner') {
            recipientId = entity.lawyerId || entity.createdBy;
        } else if (config.recipientId) {
            recipientId = config.recipientId;
        }

        // Replace placeholders
        const variables = {
            entityName: entity.displayName || entity.firstName || entity.companyName || 'Unknown',
            stageName: stage.name,
            entityType: entity.constructor.modelName || 'Lead'
        };

        const title = this.replaceVariables(
            config.title || `${variables.entityName} moved to ${stage.name}`,
            variables
        );

        const message = this.replaceVariables(
            config.message || `Stage updated to ${stage.name}`,
            variables
        );

        // Create notification
        const notification = await Notification.create({
            userId: recipientId,
            type: 'case_update', // Generic type for pipeline updates
            title,
            message,
            priority: config.priority || 'medium',
            link: config.link || `/leads/${entity.leadId || entity._id}`,
            icon: config.icon || '🔔',
            data: {
                entityId: entity._id,
                entityType: entity.constructor.modelName,
                stageId: stage.stageId,
                stageName: stage.name
            }
        });

        console.log(`✅ Notification created for user: ${recipientId}`);

        return {
            action: 'notify_user',
            success: true,
            notificationId: notification._id,
            recipientId
        };
    }

    /**
     * Update Field Action
     * Config: { field, value, operation }
     */
    static async updateFieldAction(config, entity, stage, userId) {
        if (!config.field) {
            throw new Error('Field name is required for update_field action');
        }

        const oldValue = entity[config.field];

        // Perform operation
        switch (config.operation) {
            case 'set':
                entity[config.field] = config.value;
                break;

            case 'increment':
                if (typeof entity[config.field] === 'number') {
                    entity[config.field] += (config.value || 1);
                }
                break;

            case 'decrement':
                if (typeof entity[config.field] === 'number') {
                    entity[config.field] -= (config.value || 1);
                }
                break;

            case 'append':
                if (Array.isArray(entity[config.field])) {
                    entity[config.field].push(config.value);
                }
                break;

            default:
                entity[config.field] = config.value;
        }

        entity.lastModifiedBy = userId;
        await entity.save();

        console.log(`✅ Field updated: ${config.field} from ${oldValue} to ${entity[config.field]}`);

        return {
            action: 'update_field',
            success: true,
            field: config.field,
            oldValue,
            newValue: entity[config.field]
        };
    }

    /**
     * Replace variables in template strings
     * Supports: {{entityName}}, {{stageName}}, {{userName}}, {{entityType}}
     */
    static replaceVariables(template, variables) {
        if (!template) return '';

        let result = template;
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{{${key}}}`, 'gi');
            result = result.replace(regex, value);
        }

        return result;
    }

    /**
     * Execute "onExit" automation when leaving a stage
     * @param {Object} entity - Lead/Deal entity
     * @param {Object} oldStage - Stage being exited
     * @param {string} userId - User performing the action
     */
    static async executeOnExit(entity, oldStage, userId) {
        if (!oldStage) return { success: true, message: 'No previous stage' };

        return await this.executeStageAutomation({
            entity,
            stage: oldStage,
            trigger: 'exit',
            userId,
            oldStage
        });
    }

    /**
     * Execute "onEnter" automation when entering a stage
     * @param {Object} entity - Lead/Deal entity
     * @param {Object} newStage - Stage being entered
     * @param {string} userId - User performing the action
     * @param {Object} oldStage - Previous stage (optional)
     */
    static async executeOnEnter(entity, newStage, userId, oldStage = null) {
        return await this.executeStageAutomation({
            entity,
            stage: newStage,
            trigger: 'enter',
            userId,
            oldStage
        });
    }

    /**
     * Check and execute time-based automations
     * This should be called by a scheduled job (cron)
     * @param {string} pipelineId - Pipeline ID to check
     */
    static async executeTimeBasedAutomations(pipelineId) {
        const Pipeline = require('../models/pipeline.model');
        const Lead = require('../models/lead.model');

        const pipeline = await Pipeline.findById(pipelineId);
        if (!pipeline) {
            throw new Error('Pipeline not found');
        }

        const results = [];

        // Check each stage with time-based automation
        for (const stage of pipeline.stages) {
            const timeBasedActions = stage.autoActions?.filter(
                action => action.trigger === 'time_in_stage'
            );

            if (!timeBasedActions || timeBasedActions.length === 0) continue;

            // Find leads that have been in this stage for the specified duration
            for (const autoAction of timeBasedActions) {
                const hoursInStage = autoAction.config?.hoursInStage || autoAction.delayHours || 24;
                const cutoffDate = new Date();
                cutoffDate.setHours(cutoffDate.getHours() - hoursInStage);

                // Find entities in this stage older than cutoff
                const entities = await Lead.find({
                    pipelineId: pipeline._id,
                    pipelineStageId: stage.stageId,
                    updatedAt: { $lte: cutoffDate },
                    // Avoid re-triggering - would need a separate tracking mechanism
                    // For now, this is a simplified version
                });

                for (const entity of entities) {
                    const result = await this.executeAction({
                        action: autoAction.action,
                        config: autoAction.config,
                        entity,
                        stage,
                        userId: entity.lawyerId || entity.createdBy
                    });
                    results.push(result);
                }
            }
        }

        return {
            success: true,
            executed: results.length,
            results
        };
    }
}

module.exports = PipelineAutomationService;
