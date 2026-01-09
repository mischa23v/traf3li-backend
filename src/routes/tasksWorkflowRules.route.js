/**
 * Tasks Workflow Rules Routes
 *
 * Task workflow rules and dependency management.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - GET /:taskId/available-dependencies    - Get available dependencies
 * - GET /:taskId/workflow-rules            - Get workflow rules
 * - POST /:taskId/workflow-rules           - Create workflow rule
 * - PATCH /:taskId/workflow-rules/:ruleId  - Update workflow rule
 * - DELETE /:taskId/workflow-rules/:ruleId - Delete workflow rule
 * - POST /:taskId/workflow-rules/:ruleId/toggle - Toggle rule active state
 * - POST /:taskId/evaluate-rules           - Evaluate all rules
 * - GET /:taskId/rule-history              - Get rule execution history
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Task = require('../models/task.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

// Valid rule trigger types
const VALID_TRIGGER_TYPES = [
    'on_status_change', 'on_assignment', 'on_due_date',
    'on_priority_change', 'on_completion', 'on_comment',
    'on_attachment', 'on_dependency_complete', 'scheduled'
];

// Valid action types
const VALID_ACTION_TYPES = [
    'change_status', 'assign_to', 'set_priority', 'send_notification',
    'add_tag', 'remove_tag', 'set_due_date', 'create_subtask',
    'update_field', 'webhook'
];

// Allowed fields for workflow rules
const ALLOWED_RULE_FIELDS = [
    'name', 'description', 'trigger', 'conditions', 'actions',
    'isActive', 'priority', 'runOnce'
];

/**
 * GET /:taskId/available-dependencies - Get available dependencies
 */
router.get('/:taskId/available-dependencies', async (req, res, next) => {
    try {
        const taskId = sanitizeObjectId(req.params.taskId, 'taskId');
        const { search, excludeCompleted } = req.query;

        // Get the current task
        const currentTask = await Task.findOne({ _id: taskId, ...req.firmQuery })
            .select('dependencies caseId projectId')
            .lean();

        if (!currentTask) {
            throw CustomException('Task not found', 404);
        }

        // Build query for available dependencies
        const query = {
            ...req.firmQuery,
            _id: { $ne: taskId } // Exclude self
        };

        // Scope to same case/project if applicable
        if (currentTask.caseId) {
            query.caseId = currentTask.caseId;
        } else if (currentTask.projectId) {
            query.projectId = currentTask.projectId;
        }

        // Exclude already-added dependencies
        if (currentTask.dependencies && currentTask.dependencies.length > 0) {
            query._id.$nin = currentTask.dependencies;
        }

        // Exclude completed tasks if requested
        if (excludeCompleted === 'true') {
            query.status = { $ne: 'completed' };
        }

        let tasks = await Task.find(query)
            .select('title status priority dueDate assignedTo')
            .populate('assignedTo', 'firstName lastName')
            .limit(100)
            .lean();

        // Filter by search if provided
        if (search) {
            const searchLower = search.toLowerCase();
            tasks = tasks.filter(t =>
                t.title?.toLowerCase().includes(searchLower)
            );
        }

        // Check for circular dependencies
        const availableTasks = [];
        for (const task of tasks) {
            const wouldCreateCycle = await checkCircularDependency(taskId, task._id, req.firmQuery);
            availableTasks.push({
                ...task,
                wouldCreateCycle
            });
        }

        res.json({
            success: true,
            data: availableTasks.filter(t => !t.wouldCreateCycle),
            wouldCreateCycle: availableTasks.filter(t => t.wouldCreateCycle),
            count: availableTasks.filter(t => !t.wouldCreateCycle).length
        });
    } catch (error) {
        next(error);
    }
});

// Helper to check circular dependencies
async function checkCircularDependency(sourceTaskId, targetTaskId, firmQuery, visited = new Set()) {
    if (visited.has(targetTaskId.toString())) {
        return false;
    }

    if (targetTaskId.toString() === sourceTaskId.toString()) {
        return true; // Circular!
    }

    visited.add(targetTaskId.toString());

    const targetTask = await Task.findOne({ _id: targetTaskId, ...firmQuery })
        .select('dependencies')
        .lean();

    if (!targetTask || !targetTask.dependencies) {
        return false;
    }

    for (const depId of targetTask.dependencies) {
        if (await checkCircularDependency(sourceTaskId, depId, firmQuery, visited)) {
            return true;
        }
    }

    return false;
}

/**
 * GET /:taskId/workflow-rules - Get workflow rules
 */
router.get('/:taskId/workflow-rules', async (req, res, next) => {
    try {
        const taskId = sanitizeObjectId(req.params.taskId, 'taskId');
        const { isActive } = req.query;

        const task = await Task.findOne({ _id: taskId, ...req.firmQuery })
            .select('workflowRules title')
            .lean();

        if (!task) {
            throw CustomException('Task not found', 404);
        }

        let rules = task.workflowRules || [];

        if (isActive !== undefined) {
            const active = isActive === 'true';
            rules = rules.filter(r => r.isActive === active);
        }

        // Sort by priority
        rules.sort((a, b) => (a.priority || 0) - (b.priority || 0));

        res.json({
            success: true,
            data: rules,
            count: rules.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:taskId/workflow-rules - Create workflow rule
 */
router.post('/:taskId/workflow-rules', async (req, res, next) => {
    try {
        const taskId = sanitizeObjectId(req.params.taskId, 'taskId');
        const safeData = pickAllowedFields(req.body, ALLOWED_RULE_FIELDS);

        if (!safeData.name) {
            throw CustomException('Rule name is required', 400);
        }

        if (!safeData.trigger?.type) {
            throw CustomException('Trigger type is required', 400);
        }

        if (!VALID_TRIGGER_TYPES.includes(safeData.trigger.type)) {
            throw CustomException(`Invalid trigger type. Must be one of: ${VALID_TRIGGER_TYPES.join(', ')}`, 400);
        }

        if (!safeData.actions || !Array.isArray(safeData.actions) || safeData.actions.length === 0) {
            throw CustomException('At least one action is required', 400);
        }

        // Validate actions
        for (const action of safeData.actions) {
            if (!VALID_ACTION_TYPES.includes(action.type)) {
                throw CustomException(`Invalid action type: ${action.type}. Must be one of: ${VALID_ACTION_TYPES.join(', ')}`, 400);
            }
        }

        const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
        if (!task) {
            throw CustomException('Task not found', 404);
        }

        if (!task.workflowRules) task.workflowRules = [];

        // Check rule limit
        if (task.workflowRules.length >= 20) {
            throw CustomException('Maximum 20 workflow rules per task', 400);
        }

        const rule = {
            _id: new mongoose.Types.ObjectId(),
            ...safeData,
            isActive: safeData.isActive !== false,
            priority: safeData.priority || task.workflowRules.length,
            executionCount: 0,
            createdBy: req.userID,
            createdAt: new Date()
        };

        task.workflowRules.push(rule);
        await task.save();

        res.status(201).json({
            success: true,
            message: 'Workflow rule created',
            data: rule
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /:taskId/workflow-rules/:ruleId - Update workflow rule
 */
router.patch('/:taskId/workflow-rules/:ruleId', async (req, res, next) => {
    try {
        const taskId = sanitizeObjectId(req.params.taskId, 'taskId');
        const ruleId = sanitizeObjectId(req.params.ruleId, 'ruleId');
        const safeData = pickAllowedFields(req.body, ALLOWED_RULE_FIELDS);

        // Validate trigger if provided
        if (safeData.trigger?.type && !VALID_TRIGGER_TYPES.includes(safeData.trigger.type)) {
            throw CustomException(`Invalid trigger type. Must be one of: ${VALID_TRIGGER_TYPES.join(', ')}`, 400);
        }

        // Validate actions if provided
        if (safeData.actions) {
            if (!Array.isArray(safeData.actions) || safeData.actions.length === 0) {
                throw CustomException('Actions must be a non-empty array', 400);
            }
            for (const action of safeData.actions) {
                if (!VALID_ACTION_TYPES.includes(action.type)) {
                    throw CustomException(`Invalid action type: ${action.type}`, 400);
                }
            }
        }

        const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
        if (!task) {
            throw CustomException('Task not found', 404);
        }

        const ruleIndex = (task.workflowRules || []).findIndex(
            r => r._id?.toString() === ruleId.toString()
        );

        if (ruleIndex === -1) {
            throw CustomException('Workflow rule not found', 404);
        }

        Object.assign(task.workflowRules[ruleIndex], safeData, {
            updatedBy: req.userID,
            updatedAt: new Date()
        });

        await task.save();

        res.json({
            success: true,
            message: 'Workflow rule updated',
            data: task.workflowRules[ruleIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:taskId/workflow-rules/:ruleId - Delete workflow rule
 */
router.delete('/:taskId/workflow-rules/:ruleId', async (req, res, next) => {
    try {
        const taskId = sanitizeObjectId(req.params.taskId, 'taskId');
        const ruleId = sanitizeObjectId(req.params.ruleId, 'ruleId');

        const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
        if (!task) {
            throw CustomException('Task not found', 404);
        }

        const ruleIndex = (task.workflowRules || []).findIndex(
            r => r._id?.toString() === ruleId.toString()
        );

        if (ruleIndex === -1) {
            throw CustomException('Workflow rule not found', 404);
        }

        task.workflowRules.splice(ruleIndex, 1);
        await task.save();

        res.json({
            success: true,
            message: 'Workflow rule deleted'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:taskId/workflow-rules/:ruleId/toggle - Toggle rule active state
 */
router.post('/:taskId/workflow-rules/:ruleId/toggle', async (req, res, next) => {
    try {
        const taskId = sanitizeObjectId(req.params.taskId, 'taskId');
        const ruleId = sanitizeObjectId(req.params.ruleId, 'ruleId');

        const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
        if (!task) {
            throw CustomException('Task not found', 404);
        }

        const rule = (task.workflowRules || []).find(
            r => r._id?.toString() === ruleId.toString()
        );

        if (!rule) {
            throw CustomException('Workflow rule not found', 404);
        }

        rule.isActive = !rule.isActive;
        rule.toggledAt = new Date();
        rule.toggledBy = req.userID;

        await task.save();

        res.json({
            success: true,
            message: `Workflow rule ${rule.isActive ? 'activated' : 'deactivated'}`,
            data: {
                ruleId,
                isActive: rule.isActive
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:taskId/evaluate-rules - Evaluate all rules
 */
router.post('/:taskId/evaluate-rules', async (req, res, next) => {
    try {
        const taskId = sanitizeObjectId(req.params.taskId, 'taskId');
        const { triggerType, context } = req.body;

        const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
        if (!task) {
            throw CustomException('Task not found', 404);
        }

        const activeRules = (task.workflowRules || [])
            .filter(r => r.isActive)
            .sort((a, b) => (a.priority || 0) - (b.priority || 0));

        const results = [];

        for (const rule of activeRules) {
            // Skip if trigger doesn't match
            if (triggerType && rule.trigger.type !== triggerType) {
                continue;
            }

            // Evaluate conditions
            const conditionsMet = evaluateConditions(rule.conditions, task, context);

            if (conditionsMet) {
                // Execute actions (simulation mode - doesn't actually apply)
                const actionResults = rule.actions.map(action => ({
                    type: action.type,
                    wouldExecute: true,
                    params: action.params
                }));

                results.push({
                    ruleId: rule._id,
                    ruleName: rule.name,
                    triggered: true,
                    conditionsMet: true,
                    actions: actionResults
                });

                // Check if rule should only run once
                if (rule.runOnce) {
                    rule.isActive = false;
                }

                rule.lastEvaluatedAt = new Date();
                rule.executionCount = (rule.executionCount || 0) + 1;
            } else {
                results.push({
                    ruleId: rule._id,
                    ruleName: rule.name,
                    triggered: false,
                    conditionsMet: false
                });
            }
        }

        await task.save();

        res.json({
            success: true,
            data: {
                taskId,
                rulesEvaluated: activeRules.length,
                rulesTriggered: results.filter(r => r.triggered).length,
                results
            }
        });
    } catch (error) {
        next(error);
    }
});

// Helper to evaluate conditions
function evaluateConditions(conditions, task, context = {}) {
    if (!conditions || conditions.length === 0) {
        return true; // No conditions = always true
    }

    for (const condition of conditions) {
        const fieldValue = task[condition.field] ?? context[condition.field];
        const targetValue = condition.value;

        let match = false;
        switch (condition.operator) {
            case 'equals':
                match = fieldValue === targetValue;
                break;
            case 'not_equals':
                match = fieldValue !== targetValue;
                break;
            case 'contains':
                match = String(fieldValue).includes(targetValue);
                break;
            case 'greater_than':
                match = Number(fieldValue) > Number(targetValue);
                break;
            case 'less_than':
                match = Number(fieldValue) < Number(targetValue);
                break;
            case 'is_empty':
                match = !fieldValue || fieldValue.length === 0;
                break;
            case 'is_not_empty':
                match = fieldValue && fieldValue.length > 0;
                break;
            case 'in':
                match = Array.isArray(targetValue) && targetValue.includes(fieldValue);
                break;
            default:
                match = false;
        }

        // If any condition fails (AND logic), return false
        if (!match) {
            return false;
        }
    }

    return true;
}

/**
 * GET /:taskId/rule-history - Get rule execution history
 */
router.get('/:taskId/rule-history', async (req, res, next) => {
    try {
        const taskId = sanitizeObjectId(req.params.taskId, 'taskId');
        const { page, limit } = sanitizePagination(req.query);

        const task = await Task.findOne({ _id: taskId, ...req.firmQuery })
            .select('workflowRules ruleExecutionHistory')
            .lean();

        if (!task) {
            throw CustomException('Task not found', 404);
        }

        // Build history from rules
        const history = (task.ruleExecutionHistory || [])
            .sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt));

        const total = history.length;
        const paginatedHistory = history.slice((page - 1) * limit, page * limit);

        // Enrich with rule names
        const rulesMap = {};
        (task.workflowRules || []).forEach(r => {
            rulesMap[r._id?.toString()] = r.name;
        });

        const enrichedHistory = paginatedHistory.map(h => ({
            ...h,
            ruleName: rulesMap[h.ruleId?.toString()] || 'Deleted Rule'
        }));

        res.json({
            success: true,
            data: enrichedHistory,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
