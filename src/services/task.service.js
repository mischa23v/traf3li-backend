/**
 * Task Service
 *
 * Business logic helpers for task operations.
 * Extracted from task.controller.js for maintainability and testability.
 *
 * @module services/task.service
 */

const { Task } = require('../models');

// =============================================================================
// DATE CALCULATIONS
// =============================================================================

/**
 * Calculate next due date for recurring tasks
 *
 * @param {Date|string} currentDueDate - Current due date
 * @param {Object} recurring - Recurring configuration
 * @param {string} recurring.frequency - daily|weekly|biweekly|monthly|quarterly|yearly
 * @param {number} [recurring.interval=1] - Interval multiplier
 * @returns {Date} Next due date
 *
 * @example
 * const nextDate = calculateNextDueDate(new Date(), { frequency: 'weekly', interval: 2 });
 * // Returns date 2 weeks from now
 */
function calculateNextDueDate(currentDueDate, recurring) {
    const nextDate = new Date(currentDueDate);
    const interval = recurring.interval || 1;

    switch (recurring.frequency) {
        case 'daily':
            nextDate.setDate(nextDate.getDate() + interval);
            break;
        case 'weekly':
            nextDate.setDate(nextDate.getDate() + (7 * interval));
            break;
        case 'biweekly':
            nextDate.setDate(nextDate.getDate() + 14);
            break;
        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + interval);
            break;
        case 'quarterly':
            nextDate.setMonth(nextDate.getMonth() + 3);
            break;
        case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + interval);
            break;
        default:
            nextDate.setDate(nextDate.getDate() + 1);
    }

    return nextDate;
}

// =============================================================================
// DEPENDENCY MANAGEMENT
// =============================================================================

/**
 * Check for circular dependencies between tasks
 *
 * Recursively traverses the dependency graph to detect cycles.
 * Uses visited set to avoid infinite loops.
 *
 * @param {ObjectId|string} taskId - Task being checked
 * @param {ObjectId|string} dependsOnId - Potential dependency
 * @param {Object} firmQuery - Tenant isolation query ({ firmId: X } or { lawyerId: Y })
 * @param {Set} [visited=new Set()] - Visited nodes (internal use)
 * @returns {Promise<boolean>} True if circular dependency exists
 *
 * @example
 * const hasCycle = await hasCircularDependency(taskA._id, taskB._id, req.firmQuery);
 * if (hasCycle) throw new Error('Circular dependency detected');
 */
async function hasCircularDependency(taskId, dependsOnId, firmQuery, visited = new Set()) {
    // Self-reference is always circular
    if (taskId.toString() === dependsOnId.toString()) {
        return true;
    }

    // Already visited this node - no cycle through this path
    if (visited.has(dependsOnId.toString())) {
        return false;
    }

    visited.add(dependsOnId.toString());

    // Get the dependent task's dependencies - use firmQuery for proper tenant isolation
    const dependentTask = await Task.findOne({ _id: dependsOnId, ...firmQuery }).select('blockedBy');
    if (!dependentTask || !dependentTask.blockedBy) {
        return false;
    }

    // Recursively check each dependency
    for (const blockedById of dependentTask.blockedBy) {
        if (await hasCircularDependency(taskId, blockedById, firmQuery, visited)) {
            return true;
        }
    }

    return false;
}

// =============================================================================
// WORKFLOW ENGINE
// =============================================================================

/**
 * Evaluate and execute workflow rules on a task
 *
 * Filters active rules by trigger type, evaluates conditions,
 * and executes matching actions.
 *
 * @param {Object} task - Task document (Mongoose document, will be modified)
 * @param {string} triggerType - Trigger type (e.g., 'completion', 'status_change')
 * @param {Object} context - Execution context
 * @param {ObjectId|string} context.userId - User performing the action
 * @param {string} context.userName - User's display name
 * @returns {Promise<void>}
 *
 * @example
 * await evaluateWorkflowRules(task, 'completion', { userId, userName: 'John Doe' });
 */
async function evaluateWorkflowRules(task, triggerType, context) {
    if (!task.workflowRules || task.workflowRules.length === 0) {
        return;
    }

    // Filter active rules matching the trigger type
    const rules = task.workflowRules.filter(r =>
        r.isActive && r.trigger.type === triggerType
    );

    for (const rule of rules) {
        // Evaluate all conditions (AND logic)
        const conditionsMet = rule.conditions.every(cond => {
            const fieldValue = task[cond.field];
            switch (cond.operator) {
                case 'equals': return fieldValue === cond.value;
                case 'not_equals': return fieldValue !== cond.value;
                case 'contains': return fieldValue?.includes?.(cond.value);
                case 'greater_than': return fieldValue > cond.value;
                case 'less_than': return fieldValue < cond.value;
                default: return false;
            }
        });

        // Execute actions if conditions met (or no conditions)
        if (conditionsMet || rule.conditions.length === 0) {
            for (const action of rule.actions) {
                await executeWorkflowAction(task, action, { ...context, ruleName: rule.name });
            }
        }
    }
}

/**
 * Execute a single workflow action on a task
 *
 * Supported action types:
 * - create_task: Creates a new task from template
 * - assign_user: Assigns task to a user
 * - update_field: Updates a task field value
 *
 * @param {Object} task - Task document (Mongoose document, may be modified)
 * @param {Object} action - Action configuration
 * @param {string} action.type - Action type (create_task|assign_user|update_field)
 * @param {Object} [action.taskTemplate] - Template for create_task
 * @param {string} [action.field] - Field name for update_field
 * @param {*} [action.value] - Value for assign_user or update_field
 * @param {Object} context - Execution context
 * @param {ObjectId|string} context.userId - User performing the action
 * @param {string} context.userName - User's display name
 * @param {string} context.ruleName - Name of the workflow rule
 * @returns {Promise<void>}
 */
async function executeWorkflowAction(task, action, context) {
    switch (action.type) {
        case 'create_task':
            if (action.taskTemplate) {
                const template = action.taskTemplate;
                const dueDate = template.dueDateOffset
                    ? new Date(Date.now() + template.dueDateOffset * 24 * 60 * 60 * 1000)
                    : null;

                // Interpolate template strings with task data
                const interpolate = (str) => {
                    if (!str) return str;
                    return str
                        .replace(/\$\{caseNumber\}/g, task.caseId?.caseNumber || '')
                        .replace(/\$\{caseTitle\}/g, task.caseId?.title || '')
                        .replace(/\$\{taskTitle\}/g, task.title || '');
                };

                await Task.create({
                    title: interpolate(template.title) || `متابعة: ${task.title}`,
                    description: interpolate(template.description),
                    taskType: template.taskType || 'general',
                    priority: template.priority || task.priority,
                    dueDate,
                    caseId: task.caseId,
                    clientId: task.clientId,
                    firmId: task.firmId,
                    assignedTo: template.assignedTo || task.assignedTo,
                    createdBy: context.userId,
                    parentTaskId: task._id,
                    history: [{
                        action: 'created',
                        userId: context.userId,
                        userName: context.userName,
                        timestamp: new Date(),
                        details: `تم إنشاء المهمة تلقائياً من قاعدة: ${context.ruleName}`
                    }]
                });
            }
            break;

        case 'assign_user':
            if (action.value) {
                task.assignedTo = action.value;
            }
            break;

        case 'update_field':
            if (action.field && action.value !== undefined) {
                task[action.field] = action.value;
            }
            break;
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
    // Date calculations
    calculateNextDueDate,

    // Dependency management
    hasCircularDependency,

    // Workflow engine
    evaluateWorkflowRules,
    executeWorkflowAction
};
