/**
 * Workflow Service - Workflow Template System for Automating Common Processes
 *
 * This service provides a comprehensive API for managing workflow templates and instances
 * for automating common business processes such as client onboarding, case intake,
 * invoice approval, expense approval, and document review workflows.
 *
 * Features:
 * - Create and manage workflow templates
 * - Start workflow instances from templates
 * - Execute workflow steps (tasks, approvals, notifications, delays, conditions, actions, forms)
 * - Pause, resume, and cancel workflows
 * - Track workflow progress and status
 * - Process scheduled workflows
 * - Handle event-triggered workflows
 * - Support for conditional branching and dynamic step execution
 */

const mongoose = require('mongoose');
const WorkflowTemplate = require('../models/workflowTemplate.model');
const WorkflowInstance = require('../models/workflowInstance.model');
const Task = require('../models/task.model');
const User = require('../models/user.model');
const logger = require('../utils/logger');
const auditLogService = require('./auditLog.service');
const notificationDeliveryService = require('./notificationDelivery.service');

class WorkflowService {
    // PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
    // TEMPLATE MANAGEMENT
    // PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP

    /**
     * Create a workflow template
     * @param {Object} data - Template data
     * @param {String} userId - User ID creating the template
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} - Created template
     */
    async createTemplate(data, userId, firmId) {
        try {
            const templateData = {
                ...data,
                firmId: firmId ? new mongoose.Types.ObjectId(firmId) : null,
                createdBy: new mongoose.Types.ObjectId(userId),
                lastModifiedBy: new mongoose.Types.ObjectId(userId),
                stats: {
                    totalInstances: 0,
                    completedInstances: 0,
                    failedInstances: 0,
                    averageDuration: 0
                }
            };

            const template = await WorkflowTemplate.create(templateData);

            // Validate workflow configuration
            const validation = template.validateWorkflow();
            if (!validation.valid) {
                logger.warn(`Workflow template created with validation warnings:`, validation.errors);
            }

            // Log audit
            await auditLogService.log(
                'create_workflow_template',
                'workflow_template',
                template._id.toString(),
                null,
                {
                    userId,
                    firmId,
                    details: {
                        templateName: template.name,
                        category: template.category,
                        stepsCount: template.steps.length
                    }
                }
            );

            logger.info(` Workflow template created: ${template.name} by user ${userId}`);

            return template;
        } catch (error) {
            logger.error('WorkflowService.createTemplate failed:', error.message);
            throw error;
        }
    }

    /**
     * Update a workflow template
     * @param {String} templateId - Template ID
     * @param {Object} data - Update data
     * @param {String} firmId - Firm ID for access control
     * @returns {Promise<Object>} - Updated template
     */
    async updateTemplate(templateId, data, firmId) {
        try {
            const template = await WorkflowTemplate.findOne({
                _id: templateId,
                $or: [
                    { firmId: new mongoose.Types.ObjectId(firmId) },
                    { isSystem: true }
                ]
            });

            if (!template) {
                throw new Error('Resource not found');
            }

            // Check if template is in use
            const activeInstances = await WorkflowInstance.countDocuments({
                templateId: new mongoose.Types.ObjectId(templateId),
                status: { $in: ['pending', 'running', 'paused'] }
            });

            if (activeInstances > 0) {
                logger.warn(`Updating template with ${activeInstances} active instances`);
                // Consider creating a new version instead of updating
                template.version = (template.version || 1) + 1;
            }

            // Update fields
            Object.keys(data).forEach(key => {
                if (key !== 'firmId' && key !== 'createdBy' && key !== 'isSystem') {
                    template[key] = data[key];
                }
            });

            if (data.lastModifiedBy) {
                template.lastModifiedBy = new mongoose.Types.ObjectId(data.lastModifiedBy);
            }

            await template.save();

            logger.info(` Workflow template updated: ${template.name}`);

            return template;
        } catch (error) {
            logger.error('WorkflowService.updateTemplate failed:', error.message);
            throw error;
        }
    }

    /**
     * Delete a workflow template
     * @param {String} templateId - Template ID
     * @param {String} firmId - Firm ID for access control
     * @returns {Promise<Boolean>} - True if deleted
     */
    async deleteTemplate(templateId, firmId) {
        try {
            // Check if template is in use
            const activeInstances = await WorkflowInstance.countDocuments({
                templateId: new mongoose.Types.ObjectId(templateId),
                status: { $in: ['pending', 'running', 'paused'] }
            });

            if (activeInstances > 0) {
                throw new Error(`Cannot delete template: ${activeInstances} active instances exist`);
            }

            const template = await WorkflowTemplate.findOneAndDelete({
                _id: templateId,
                $or: [
                    { firmId: new mongoose.Types.ObjectId(firmId) },
                    { isSystem: true }
                ]
            });

            if (!template) {
                throw new Error('Resource not found');
            }

            logger.info(` Workflow template deleted: ${template.name}`);

            return true;
        } catch (error) {
            logger.error('WorkflowService.deleteTemplate failed:', error.message);
            throw error;
        }
    }

    /**
     * Get workflow templates
     * @param {String} firmId - Firm ID
     * @param {Object} filters - Filter options
     * @returns {Promise<Array>} - Templates
     */
    async getTemplates(firmId, filters = {}) {
        try {
            const query = {
                $or: [
                    { firmId: new mongoose.Types.ObjectId(firmId) },
                    { isSystem: true }
                ]
            };

            if (filters.category) {
                query.category = filters.category;
            }

            if (filters.isActive !== undefined) {
                query.isActive = filters.isActive;
            }

            if (filters.triggerType) {
                query.triggerType = filters.triggerType;
            }

            const templates = await WorkflowTemplate.find(query)
                .populate('createdBy', 'firstName lastName email')
                .populate('lastModifiedBy', 'firstName lastName email')
                .sort({ createdAt: -1 })
                .lean();

            return templates;
        } catch (error) {
            logger.error('WorkflowService.getTemplates failed:', error.message);
            throw error;
        }
    }

    // PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
    // WORKFLOW INSTANCE MANAGEMENT
    // PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP

    /**
     * Start a workflow instance
     * @param {String} templateId - Template ID
     * @param {String} entityType - Entity type
     * @param {String} entityId - Entity ID
     * @param {Object} variables - Initial variables
     * @param {String} userId - User ID starting the workflow
     * @param {String} firmId - Firm ID for access control
     * @returns {Promise<Object>} - Workflow instance
     */
    async startWorkflow(templateId, entityType, entityId, variables = {}, userId, firmId) {
        try {
            // Get template with firmId check
            const template = await WorkflowTemplate.findOne({
                _id: templateId,
                $or: [
                    { firmId: new mongoose.Types.ObjectId(firmId) },
                    { isSystem: true }
                ]
            }).lean();

            if (!template) {
                throw new Error('Resource not found');
            }

            if (!template.isActive) {
                throw new Error('Workflow template is not active');
            }

            // Validate template configuration
            const WorkflowTemplateModel = await WorkflowTemplate.findOne({
                _id: templateId,
                $or: [
                    { firmId: new mongoose.Types.ObjectId(firmId) },
                    { isSystem: true }
                ]
            });
            const validation = WorkflowTemplateModel.validateWorkflow();
            if (!validation.valid) {
                throw new Error(`Invalid workflow configuration: ${validation.errors.join(', ')}`);
            }

            // Check permissions
            if (template.permissions && template.permissions.canUse) {
                // TODO: Implement permission checking
            }

            // Initialize variables with defaults
            const instanceVariables = new Map();
            if (template.variables) {
                template.variables.forEach(v => {
                    const value = variables[v.name] !== undefined
                        ? variables[v.name]
                        : v.defaultValue;
                    instanceVariables.set(v.name, value);
                });
            }

            // Additional provided variables
            Object.keys(variables).forEach(key => {
                if (!instanceVariables.has(key)) {
                    instanceVariables.set(key, variables[key]);
                }
            });

            // Create workflow instance
            const instance = await WorkflowInstance.create({
                firmId: template.firmId,
                templateId: new mongoose.Types.ObjectId(templateId),
                name: template.name,
                status: 'pending',
                currentStep: 0,
                variables: instanceVariables,
                progress: {
                    totalSteps: template.steps.length,
                    completedSteps: 0,
                    failedSteps: 0,
                    skippedSteps: 0,
                    percentage: 0
                },
                entityType,
                entityId: new mongoose.Types.ObjectId(entityId),
                triggeredBy: 'manual',
                startedBy: new mongoose.Types.ObjectId(userId),
                stepHistory: []
            });

            // Start the workflow
            await instance.start(userId);

            // Execute first step
            await this.executeNextStep(instance._id.toString(), userId, firmId);

            // Update template stats
            await WorkflowTemplate.findOneAndUpdate(
                {
                    _id: templateId,
                    $or: [
                        { firmId: new mongoose.Types.ObjectId(firmId) },
                        { isSystem: true }
                    ]
                },
                {
                    $inc: { 'stats.totalInstances': 1 },
                    $set: { 'stats.lastUsed': new Date() }
                }
            );

            // Log audit
            await auditLogService.log(
                'start_workflow',
                'workflow_instance',
                instance._id.toString(),
                null,
                {
                    userId,
                    firmId: template.firmId,
                    details: {
                        templateId,
                        templateName: template.name,
                        entityType,
                        entityId
                    }
                }
            );

            logger.info(` Workflow started: ${template.name} for ${entityType}:${entityId}`);

            return await WorkflowInstance.findOne({
                _id: instance._id,
                firmId: new mongoose.Types.ObjectId(firmId)
            })
                .populate('templateId', 'name category')
                .populate('startedBy', 'firstName lastName email')
                .lean();
        } catch (error) {
            logger.error('WorkflowService.startWorkflow failed:', error.message);
            throw error;
        }
    }

    /**
     * Execute the next step in workflow
     * @param {String} instanceId - Instance ID
     * @param {String} userId - User ID executing the step
     * @param {String} firmId - Firm ID for access control
     * @returns {Promise<Object>} - Updated instance
     */
    async executeNextStep(instanceId, userId, firmId) {
        try {
            const instance = await WorkflowInstance.findOne({
                _id: instanceId,
                firmId: new mongoose.Types.ObjectId(firmId)
            });

            if (!instance) {
                throw new Error('Resource not found');
            }

            if (!['running', 'pending'].includes(instance.status)) {
                throw new Error('Workflow is not in running state');
            }

            const template = await WorkflowTemplate.findOne({
                _id: instance.templateId,
                $or: [
                    { firmId: new mongoose.Types.ObjectId(firmId) },
                    { isSystem: true }
                ]
            }).lean();

            if (!template) {
                throw new Error('Resource not found');
            }

            // Check if workflow is complete
            if (instance.currentStep >= template.steps.length) {
                await instance.complete(userId);
                logger.info(` Workflow completed: ${instance.name}`);
                return instance;
            }

            // Get current step
            const step = template.steps[instance.currentStep];

            if (!step) {
                throw new Error(`Step ${instance.currentStep} not found in template`);
            }

            // Record step execution start
            await instance.recordStepExecution({
                order: step.order,
                name: step.name,
                type: step.type,
                status: 'running'
            });

            // Execute step based on type
            let stepResult;
            switch (step.type) {
                case 'task':
                    stepResult = await this.executeTaskStep(step, instance, template.firmId, userId);
                    break;

                case 'approval':
                    stepResult = await this.executeApprovalStep(step, instance, template.firmId, userId);
                    break;

                case 'notification':
                    stepResult = await this.executeNotificationStep(step, instance, template.firmId);
                    break;

                case 'delay':
                    stepResult = await this.executeDelayStep(step, instance, template.firmId);
                    break;

                case 'condition':
                    stepResult = await this.executeConditionStep(step, instance);
                    break;

                case 'action':
                    stepResult = await this.executeActionStep(step, instance, template.firmId);
                    break;

                case 'form':
                    stepResult = await this.executeFormStep(step, instance);
                    break;

                default:
                    throw new Error(`Unknown step type: ${step.type}`);
            }

            // Check if step auto-completes
            if (step.config.autoComplete) {
                await this.advanceStep(instanceId, stepResult, firmId);
            }

            logger.info(` Step executed: ${step.name} (${step.type})`);

            return await WorkflowInstance.findOne({
                _id: instanceId,
                firmId: new mongoose.Types.ObjectId(firmId)
            });
        } catch (error) {
            logger.error('WorkflowService.executeNextStep failed:', error.message);

            // Mark instance as failed
            const instance = await WorkflowInstance.findOne({
                _id: instanceId,
                firmId: new mongoose.Types.ObjectId(firmId)
            });
            if (instance) {
                await instance.fail(error.message, error);
            }

            throw error;
        }
    }

    /**
     * Advance workflow to next step
     * @param {String} instanceId - Instance ID
     * @param {Object} stepResult - Result from completed step
     * @param {String} firmId - Firm ID for access control
     * @returns {Promise<Object>} - Updated instance
     */
    async advanceStep(instanceId, stepResult = {}, firmId) {
        try {
            const instance = await WorkflowInstance.findOne({
                _id: instanceId,
                firmId: new mongoose.Types.ObjectId(firmId)
            });

            if (!instance) {
                throw new Error('Resource not found');
            }

            // Update current step status
            await instance.updateStepStatus(instance.currentStep, 'completed', {
                result: stepResult,
                completedBy: stepResult.completedBy
            });

            // Advance to next step
            await instance.advanceStep(stepResult);

            // Execute next step
            const template = await WorkflowTemplate.findOne({
                _id: instance.templateId,
                $or: [
                    { firmId: new mongoose.Types.ObjectId(firmId) },
                    { isSystem: true }
                ]
            }).lean();

            if (instance.currentStep < template.steps.length) {
                // Has more steps, execute next
                await this.executeNextStep(instanceId, stepResult.completedBy || instance.startedBy.toString(), firmId);
            } else {
                // No more steps, complete workflow
                await instance.complete(stepResult.completedBy || instance.startedBy.toString());
                logger.info(` Workflow completed: ${instance.name}`);
            }

            return await WorkflowInstance.findOne({
                _id: instanceId,
                firmId: new mongoose.Types.ObjectId(firmId)
            });
        } catch (error) {
            logger.error('WorkflowService.advanceStep failed:', error.message);
            throw error;
        }
    }

    /**
     * Pause a workflow
     * @param {String} instanceId - Instance ID
     * @param {String} firmId - Firm ID for access control
     * @returns {Promise<Object>} - Updated instance
     */
    async pauseWorkflow(instanceId, firmId) {
        try {
            const instance = await WorkflowInstance.findOne({
                _id: instanceId,
                firmId: new mongoose.Types.ObjectId(firmId)
            });

            if (!instance) {
                throw new Error('Resource not found');
            }

            await instance.pause(instance.startedBy.toString(), 'Paused by user');

            logger.info(` Workflow paused: ${instance.name}`);

            return instance;
        } catch (error) {
            logger.error('WorkflowService.pauseWorkflow failed:', error.message);
            throw error;
        }
    }

    /**
     * Resume a workflow
     * @param {String} instanceId - Instance ID
     * @param {String} firmId - Firm ID for access control
     * @returns {Promise<Object>} - Updated instance
     */
    async resumeWorkflow(instanceId, firmId) {
        try {
            const instance = await WorkflowInstance.findOne({
                _id: instanceId,
                firmId: new mongoose.Types.ObjectId(firmId)
            });

            if (!instance) {
                throw new Error('Resource not found');
            }

            await instance.resume(instance.startedBy.toString());

            // Continue execution
            await this.executeNextStep(instanceId, instance.startedBy.toString(), firmId);

            logger.info(` Workflow resumed: ${instance.name}`);

            return instance;
        } catch (error) {
            logger.error('WorkflowService.resumeWorkflow failed:', error.message);
            throw error;
        }
    }

    /**
     * Cancel a workflow
     * @param {String} instanceId - Instance ID
     * @param {String} reason - Cancellation reason
     * @param {String} firmId - Firm ID for access control
     * @returns {Promise<Object>} - Updated instance
     */
    async cancelWorkflow(instanceId, reason = '', firmId) {
        try {
            const instance = await WorkflowInstance.findOne({
                _id: instanceId,
                firmId: new mongoose.Types.ObjectId(firmId)
            });

            if (!instance) {
                throw new Error('Resource not found');
            }

            await instance.cancel(instance.startedBy.toString(), reason);

            // Cancel any pending tasks created by this workflow
            await Task.updateMany(
                {
                    'metadata.workflowInstanceId': instance._id,
                    status: { $in: ['todo', 'in_progress'] }
                },
                {
                    $set: { status: 'canceled' }
                }
            );

            logger.info(` Workflow cancelled: ${instance.name} - Reason: ${reason}`);

            return instance;
        } catch (error) {
            logger.error('WorkflowService.cancelWorkflow failed:', error.message);
            throw error;
        }
    }

    /**
     * Get workflow status
     * @param {String} instanceId - Instance ID
     * @param {String} firmId - Firm ID for access control
     * @returns {Promise<Object>} - Workflow status
     */
    async getWorkflowStatus(instanceId, firmId) {
        try {
            const instance = await WorkflowInstance.findOne({
                _id: instanceId,
                firmId: new mongoose.Types.ObjectId(firmId)
            })
                .populate('templateId', 'name category steps')
                .populate('startedBy', 'firstName lastName email')
                .populate('completedBy', 'firstName lastName email')
                .lean();

            if (!instance) {
                throw new Error('Resource not found');
            }

            return {
                instance,
                currentStep: instance.templateId.steps[instance.currentStep],
                progress: instance.progress,
                stepHistory: instance.stepHistory,
                isActive: instance.isActive,
                isFinished: instance.isFinished
            };
        } catch (error) {
            logger.error('WorkflowService.getWorkflowStatus failed:', error.message);
            throw error;
        }
    }

    /**
     * Get active workflows for entity
     * @param {String} entityType - Entity type
     * @param {String} entityId - Entity ID
     * @returns {Promise<Array>} - Active workflows
     */
    async getActiveWorkflows(entityType, entityId) {
        try {
            const instances = await WorkflowInstance.find({
                entityType,
                entityId: new mongoose.Types.ObjectId(entityId),
                status: { $in: ['pending', 'running', 'paused'] }
            })
                .populate('templateId', 'name category')
                .populate('startedBy', 'firstName lastName email')
                .sort({ startedAt: -1 })
                .lean();

            return instances;
        } catch (error) {
            logger.error('WorkflowService.getActiveWorkflows failed:', error.message);
            return [];
        }
    }

    /**
     * Process scheduled workflows
     * @returns {Promise<Object>} - Processing results
     */
    async processScheduledWorkflows() {
        try {
            const now = new Date();
            let processed = 0;
            let started = 0;
            let errors = 0;

            // Find templates with schedule triggers
            const scheduledTemplates = await WorkflowTemplate.find({
                triggerType: 'schedule',
                isActive: true,
                'triggerConfig.enabled': true
            }).lean();

            for (const template of scheduledTemplates) {
                try {
                    processed++;

                    // Check if schedule matches current time
                    const shouldRun = this.checkSchedule(template.triggerConfig, now);

                    if (shouldRun) {
                        // Find entities matching filters
                        // This is a placeholder - implement based on your entity structure
                        const entities = await this.findEntitiesForSchedule(template);

                        for (const entity of entities) {
                            try {
                                await this.startWorkflow(
                                    template._id.toString(),
                                    template.triggerConfig.entityType,
                                    entity._id.toString(),
                                    {},
                                    template.createdBy.toString(),
                                    template.firmId.toString()
                                );
                                started++;
                            } catch (error) {
                                logger.error(`Failed to start workflow for entity ${entity._id}:`, error.message);
                                errors++;
                            }
                        }
                    }
                } catch (error) {
                    logger.error(`Failed to process scheduled template ${template._id}:`, error.message);
                    errors++;
                }
            }

            logger.info(` Processed ${processed} scheduled templates, started ${started} workflows, ${errors} errors`);

            return {
                processed,
                started,
                errors
            };
        } catch (error) {
            logger.error('WorkflowService.processScheduledWorkflows failed:', error.message);
            throw error;
        }
    }

    // PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
    // STEP EXECUTORS
    // PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP

    /**
     * Execute a task step
     * @private
     */
    async executeTaskStep(step, instance, firmId, userId) {
        try {
            // Resolve assignee
            const assigneeId = await this.resolveAssignee(step.config, instance, firmId);

            if (!assigneeId) {
                throw new Error('Could not resolve task assignee');
            }

            // Calculate due date
            const dueDate = new Date();
            if (step.config.dueInDays) {
                dueDate.setDate(dueDate.getDate() + step.config.dueInDays);
            } else if (step.config.dueInHours) {
                dueDate.setHours(dueDate.getHours() + step.config.dueInHours);
            }

            // Create task
            const task = await Task.create({
                title: step.name,
                description: step.description || '',
                assignedTo: new mongoose.Types.ObjectId(assigneeId),
                createdBy: new mongoose.Types.ObjectId(userId),
                status: 'todo',
                priority: step.config.taskPriority || 'medium',
                dueDate,
                firmId: new mongoose.Types.ObjectId(firmId),
                metadata: {
                    workflowInstanceId: instance._id,
                    workflowStepOrder: step.order,
                    workflowStepType: 'task'
                }
            });

            logger.info(` Task created: ${task.title} (assigned to: ${assigneeId})`);

            return {
                taskId: task._id,
                assignedTo: assigneeId,
                status: 'pending'
            };
        } catch (error) {
            logger.error('Failed to execute task step:', error.message);
            throw error;
        }
    }

    /**
     * Execute an approval step
     * @private
     */
    async executeApprovalStep(step, instance, firmId, userId) {
        try {
            // Resolve approver
            const approverId = await this.resolveApprover(step.config, instance, firmId);

            if (!approverId) {
                throw new Error('Could not resolve approver');
            }

            // Create approval task
            const task = await Task.create({
                title: `Approval: ${step.name}`,
                description: step.description || '',
                assignedTo: new mongoose.Types.ObjectId(approverId),
                createdBy: new mongoose.Types.ObjectId(userId),
                status: 'todo',
                priority: 'high',
                firmId: new mongoose.Types.ObjectId(firmId),
                metadata: {
                    workflowInstanceId: instance._id,
                    workflowStepOrder: step.order,
                    workflowStepType: 'approval',
                    requiresApproval: true
                }
            });

            logger.info(` Approval task created: ${task.title} (approver: ${approverId})`);

            return {
                taskId: task._id,
                approverId,
                status: 'pending_approval'
            };
        } catch (error) {
            logger.error('Failed to execute approval step:', error.message);
            throw error;
        }
    }

    /**
     * Execute a notification step
     * @private
     */
    async executeNotificationStep(step, instance, firmId) {
        try {
            const recipients = await this.resolveNotificationRecipients(step.config, instance, firmId);

            if (recipients.length === 0) {
                logger.warn('No recipients found for notification step');
                return { status: 'skipped', reason: 'no_recipients' };
            }

            const subject = this.replaceVariables(step.config.subject || step.name, instance);
            const message = this.replaceVariables(step.config.messageTemplate || '', instance);

            let sentCount = 0;
            for (const recipientId of recipients) {
                try {
                    const user = await User.findById(recipientId).select('email firstName lastName').lean();

                    if (!user) continue;

                    if (step.config.notificationType === 'email' && user.email) {
                        await notificationDeliveryService.sendEmail({
                            to: user.email,
                            subject,
                            message,
                            userName: `${user.firstName} ${user.lastName}`
                        });
                        sentCount++;
                    } else if (step.config.notificationType === 'in_app') {
                        const Notification = require('../models/notification.model');
                        await Notification.create({
                            userId: recipientId,
                            type: 'workflow_notification',
                            title: subject,
                            message,
                            link: `/workflows/instances/${instance._id}`,
                            data: {
                                instanceId: instance._id,
                                stepOrder: step.order
                            }
                        });
                        sentCount++;
                    }
                } catch (error) {
                    logger.error(`Failed to send notification to ${recipientId}:`, error.message);
                }
            }

            logger.info(` Notifications sent: ${sentCount}/${recipients.length}`);

            return {
                status: 'completed',
                recipientCount: recipients.length,
                sentCount
            };
        } catch (error) {
            logger.error('Failed to execute notification step:', error.message);
            throw error;
        }
    }

    /**
     * Execute a delay step
     * @private
     */
    async executeDelayStep(step, instance, firmId) {
        try {
            const delayMs = this.calculateDelay(step.config.delayDuration, step.config.delayUnit);

            logger.info(` Delay step: ${step.name} (${delayMs}ms)`);

            // Schedule next step execution
            setTimeout(async () => {
                try {
                    await this.advanceStep(instance._id.toString(), { status: 'completed' }, firmId);
                } catch (error) {
                    logger.error('Failed to advance after delay:', error.message);
                }
            }, delayMs);

            return {
                status: 'delayed',
                delayMs,
                resumeAt: new Date(Date.now() + delayMs)
            };
        } catch (error) {
            logger.error('Failed to execute delay step:', error.message);
            throw error;
        }
    }

    /**
     * Execute a condition step
     * @private
     */
    async executeConditionStep(step, instance) {
        try {
            const result = this.evaluateConditions(step.config.conditions, instance);

            logger.info(` Condition step: ${step.name} (result: ${result})`);

            return {
                status: 'completed',
                conditionResult: result
            };
        } catch (error) {
            logger.error('Failed to execute condition step:', error.message);
            throw error;
        }
    }

    /**
     * Execute an action step
     * @private
     */
    async executeActionStep(step, instance, firmId) {
        try {
            const { actionType, actionConfig } = step.config;

            let result;
            switch (actionType) {
                case 'update_field':
                    result = await this.executeUpdateField(actionConfig, instance);
                    break;

                case 'send_webhook':
                    result = await this.executeSendWebhook(actionConfig, instance);
                    break;

                case 'send_email':
                    result = await this.executeSendEmail(actionConfig, instance);
                    break;

                default:
                    logger.warn(`Unknown action type: ${actionType}`);
                    result = { status: 'skipped', reason: 'unknown_action_type' };
            }

            logger.info(` Action step: ${step.name} (${actionType})`);

            return result;
        } catch (error) {
            logger.error('Failed to execute action step:', error.message);
            throw error;
        }
    }

    /**
     * Execute a form step
     * @private
     */
    async executeFormStep(step, instance) {
        try {
            // Form steps require user input, so they cannot auto-complete
            // They will be completed when user submits the form

            logger.info(` Form step created: ${step.name} (waiting for user input)`);

            return {
                status: 'waiting_for_input',
                formFields: step.config.formFields
            };
        } catch (error) {
            logger.error('Failed to execute form step:', error.message);
            throw error;
        }
    }

    // PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
    // HELPER METHODS
    // PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP

    /**
     * Resolve assignee for task
     * @private
     */
    async resolveAssignee(config, instance, firmId) {
        try {
            const { assigneeType, assigneeId, assigneeRole } = config;

            switch (assigneeType) {
                case 'owner':
                    return instance.startedBy.toString();

                case 'role':
                    const userByRole = await User.findOne({
                        firmId: new mongoose.Types.ObjectId(firmId),
                        role: assigneeRole,
                        isActive: true
                    }).lean();
                    return userByRole ? userByRole._id.toString() : null;

                case 'specific':
                    return assigneeId ? assigneeId.toString() : null;

                case 'round_robin':
                case 'auto':
                    const activeUsers = await User.find({
                        firmId: new mongoose.Types.ObjectId(firmId),
                        isActive: true
                    }).sort({ _id: 1 }).limit(10).lean();

                    if (activeUsers.length === 0) return null;

                    const index = parseInt(instance._id.toString().slice(-2), 16) % activeUsers.length;
                    return activeUsers[index]._id.toString();

                default:
                    return null;
            }
        } catch (error) {
            logger.error('Failed to resolve assignee:', error.message);
            return null;
        }
    }

    /**
     * Resolve approver
     * @private
     */
    async resolveApprover(config, instance, firmId) {
        // Similar to resolveAssignee
        return await this.resolveAssignee(config, instance, firmId);
    }

    /**
     * Resolve notification recipients
     * @private
     */
    async resolveNotificationRecipients(config, instance, firmId) {
        const recipients = new Set();

        try {
            for (const recipientType of config.recipients || []) {
                switch (recipientType) {
                    case 'owner':
                        recipients.add(instance.startedBy.toString());
                        break;

                    case 'role':
                        const roleUsers = await User.find({
                            firmId: new mongoose.Types.ObjectId(firmId),
                            role: config.recipientRole,
                            isActive: true
                        }).select('_id').lean();

                        roleUsers.forEach(u => recipients.add(u._id.toString()));
                        break;

                    case 'specific':
                        if (config.recipientIds) {
                            config.recipientIds.forEach(id => recipients.add(id.toString()));
                        }
                        break;
                }
            }

            return Array.from(recipients);
        } catch (error) {
            logger.error('Failed to resolve notification recipients:', error.message);
            return [];
        }
    }

    /**
     * Replace variables in string
     * @private
     */
    replaceVariables(template, instance) {
        if (!template) return '';

        let result = template;

        // Replace instance variables
        if (instance.variables) {
            instance.variables.forEach((value, key) => {
                result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
            });
        }

        // Replace instance properties
        result = result.replace(/{{instanceName}}/g, instance.name);
        result = result.replace(/{{entityType}}/g, instance.entityType);
        result = result.replace(/{{entityId}}/g, instance.entityId);

        return result;
    }

    /**
     * Calculate delay in milliseconds
     * @private
     */
    calculateDelay(duration, unit) {
        const multipliers = {
            minutes: 60 * 1000,
            hours: 60 * 60 * 1000,
            days: 24 * 60 * 60 * 1000,
            weeks: 7 * 24 * 60 * 60 * 1000
        };

        return duration * (multipliers[unit] || multipliers.minutes);
    }

    /**
     * Evaluate conditions
     * @private
     */
    evaluateConditions(conditions, instance) {
        if (!conditions || conditions.length === 0) return true;

        let result = true;
        let currentLogic = 'AND';

        for (const condition of conditions) {
            const value = instance.variables.get(condition.field);
            const conditionMet = this.evaluateCondition(value, condition.operator, condition.value);

            if (currentLogic === 'AND') {
                result = result && conditionMet;
            } else {
                result = result || conditionMet;
            }

            currentLogic = condition.logicGate || 'AND';
        }

        return result;
    }

    /**
     * Evaluate single condition
     * @private
     */
    evaluateCondition(actualValue, operator, expectedValue) {
        switch (operator) {
            case 'equals':
                return actualValue === expectedValue;
            case 'not_equals':
                return actualValue !== expectedValue;
            case 'greater_than':
                return actualValue > expectedValue;
            case 'less_than':
                return actualValue < expectedValue;
            case 'contains':
                return String(actualValue).includes(expectedValue);
            case 'not_contains':
                return !String(actualValue).includes(expectedValue);
            case 'is_empty':
                return !actualValue || actualValue === '';
            case 'is_not_empty':
                return actualValue && actualValue !== '';
            default:
                return false;
        }
    }

    /**
     * Check if schedule matches current time
     * @private
     */
    checkSchedule(triggerConfig, now) {
        // Placeholder - implement based on schedule type
        return false;
    }

    /**
     * Find entities for scheduled workflow
     * @private
     */
    async findEntitiesForSchedule(template) {
        // Placeholder - implement based on entity type and filters
        return [];
    }

    /**
     * Execute update field action
     * @private
     */
    async executeUpdateField(config, instance) {
        // Placeholder - implement based on your data structure
        return { status: 'completed' };
    }

    /**
     * Execute send webhook action
     * @private
     */
    async executeSendWebhook(config, instance) {
        // Placeholder - implement webhook sending
        return { status: 'completed' };
    }

    /**
     * Execute send email action
     * @private
     */
    async executeSendEmail(config, instance) {
        // Placeholder - implement email sending
        return { status: 'completed' };
    }
}

// Export singleton instance
module.exports = new WorkflowService();
