/**
 * Workflows Extended Routes
 *
 * Extended workflow management with CRUD and operations.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - GET /:id                    - Get workflow by ID
 * - PATCH /:id                  - Update workflow
 * - DELETE /:id                 - Delete workflow
 * - POST /:id/duplicate         - Duplicate workflow
 * - POST /:id/activate          - Activate workflow
 * - POST /:id/deactivate        - Deactivate workflow
 * - GET /:id/executions         - Get execution history
 * - POST /:id/test              - Test workflow
 * - GET /:id/analytics          - Get workflow analytics
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

// Allowed fields for workflows
const ALLOWED_WORKFLOW_FIELDS = [
    'name', 'description', 'trigger', 'conditions', 'actions',
    'isActive', 'priority', 'tags', 'metadata'
];

/**
 * GET /:id - Get workflow by ID
 */
router.get('/:id', async (req, res, next) => {
    try {
        const workflowId = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery).select('workflows').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const workflow = (firm.workflows || []).find(
            w => w._id?.toString() === workflowId.toString()
        );

        if (!workflow) {
            throw CustomException('Workflow not found', 404);
        }

        res.json({
            success: true,
            data: workflow
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /:id - Update workflow
 */
router.patch('/:id', async (req, res, next) => {
    try {
        const workflowId = sanitizeObjectId(req.params.id, 'id');
        const safeData = pickAllowedFields(req.body, ALLOWED_WORKFLOW_FIELDS);

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const workflowIndex = (firm.workflows || []).findIndex(
            w => w._id?.toString() === workflowId.toString()
        );

        if (workflowIndex === -1) {
            throw CustomException('Workflow not found', 404);
        }

        Object.assign(firm.workflows[workflowIndex], safeData, {
            updatedBy: req.userID,
            updatedAt: new Date()
        });

        await firm.save();

        res.json({
            success: true,
            message: 'Workflow updated',
            data: firm.workflows[workflowIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:id - Delete workflow
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const workflowId = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const workflowIndex = (firm.workflows || []).findIndex(
            w => w._id?.toString() === workflowId.toString()
        );

        if (workflowIndex === -1) {
            throw CustomException('Workflow not found', 404);
        }

        firm.workflows.splice(workflowIndex, 1);
        await firm.save();

        res.json({
            success: true,
            message: 'Workflow deleted'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/duplicate - Duplicate workflow
 */
router.post('/:id/duplicate', async (req, res, next) => {
    try {
        const workflowId = sanitizeObjectId(req.params.id, 'id');
        const { name } = req.body;

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const original = (firm.workflows || []).find(
            w => w._id?.toString() === workflowId.toString()
        );

        if (!original) {
            throw CustomException('Workflow not found', 404);
        }

        const duplicate = {
            ...JSON.parse(JSON.stringify(original)),
            _id: new mongoose.Types.ObjectId(),
            name: name || `${original.name} (Copy)`,
            isActive: false,
            executionCount: 0,
            lastExecutedAt: null,
            createdBy: req.userID,
            createdAt: new Date(),
            updatedAt: null,
            updatedBy: null
        };

        if (!firm.workflows) firm.workflows = [];
        firm.workflows.push(duplicate);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Workflow duplicated',
            data: duplicate
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/activate - Activate workflow
 */
router.post('/:id/activate', async (req, res, next) => {
    try {
        const workflowId = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const workflow = (firm.workflows || []).find(
            w => w._id?.toString() === workflowId.toString()
        );

        if (!workflow) {
            throw CustomException('Workflow not found', 404);
        }

        if (workflow.isActive) {
            throw CustomException('Workflow is already active', 400);
        }

        // Validate workflow has required components
        if (!workflow.trigger) {
            throw CustomException('Workflow must have a trigger to be activated', 400);
        }
        if (!workflow.actions || workflow.actions.length === 0) {
            throw CustomException('Workflow must have at least one action to be activated', 400);
        }

        workflow.isActive = true;
        workflow.activatedAt = new Date();
        workflow.activatedBy = req.userID;
        workflow.updatedAt = new Date();
        workflow.updatedBy = req.userID;

        await firm.save();

        res.json({
            success: true,
            message: 'Workflow activated',
            data: workflow
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/deactivate - Deactivate workflow
 */
router.post('/:id/deactivate', async (req, res, next) => {
    try {
        const workflowId = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const workflow = (firm.workflows || []).find(
            w => w._id?.toString() === workflowId.toString()
        );

        if (!workflow) {
            throw CustomException('Workflow not found', 404);
        }

        if (!workflow.isActive) {
            throw CustomException('Workflow is already inactive', 400);
        }

        workflow.isActive = false;
        workflow.deactivatedAt = new Date();
        workflow.deactivatedBy = req.userID;
        workflow.updatedAt = new Date();
        workflow.updatedBy = req.userID;

        await firm.save();

        res.json({
            success: true,
            message: 'Workflow deactivated',
            data: workflow
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:id/executions - Get execution history
 */
router.get('/:id/executions', async (req, res, next) => {
    try {
        const workflowId = sanitizeObjectId(req.params.id, 'id');
        const { page, limit, skip } = sanitizePagination(req.query.page, req.query.limit);
        const { status, dateFrom, dateTo } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('workflows workflowExecutions').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const workflow = (firm.workflows || []).find(
            w => w._id?.toString() === workflowId.toString()
        );

        if (!workflow) {
            throw CustomException('Workflow not found', 404);
        }

        let executions = (firm.workflowExecutions || []).filter(
            e => e.workflowId?.toString() === workflowId.toString()
        );

        if (status) {
            executions = executions.filter(e => e.status === status);
        }
        if (dateFrom || dateTo) {
            const from = dateFrom ? new Date(dateFrom) : new Date('1970-01-01');
            const to = dateTo ? new Date(dateTo) : new Date();
            executions = executions.filter(e => {
                const execDate = new Date(e.executedAt);
                return execDate >= from && execDate <= to;
            });
        }

        executions.sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt));

        const total = executions.length;
        const paginatedExecutions = executions.slice(skip, skip + limit);

        res.json({
            success: true,
            data: {
                workflow: {
                    _id: workflow._id,
                    name: workflow.name
                },
                executions: paginatedExecutions,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/test - Test workflow
 */
router.post('/:id/test', async (req, res, next) => {
    try {
        const workflowId = sanitizeObjectId(req.params.id, 'id');
        const { testData } = req.body;

        const firm = await Firm.findOne(req.firmQuery).select('workflows').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const workflow = (firm.workflows || []).find(
            w => w._id?.toString() === workflowId.toString()
        );

        if (!workflow) {
            throw CustomException('Workflow not found', 404);
        }

        // Simulate workflow execution
        const testResult = {
            workflowId: workflow._id,
            workflowName: workflow.name,
            testData,
            trigger: {
                type: workflow.trigger?.type,
                matched: true,
                evaluatedAt: new Date()
            },
            conditions: (workflow.conditions || []).map((condition, index) => ({
                index,
                condition: condition.field,
                operator: condition.operator,
                passed: true // Simulated
            })),
            actions: (workflow.actions || []).map((action, index) => ({
                index,
                type: action.type,
                status: 'would_execute',
                description: action.description || `Action ${index + 1}`
            })),
            overallResult: 'success',
            testedAt: new Date(),
            testedBy: req.userID
        };

        res.json({
            success: true,
            message: 'Workflow test completed',
            data: testResult
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:id/analytics - Get workflow analytics
 */
router.get('/:id/analytics', async (req, res, next) => {
    try {
        const workflowId = sanitizeObjectId(req.params.id, 'id');
        const { dateFrom, dateTo } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('workflows workflowExecutions').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const workflow = (firm.workflows || []).find(
            w => w._id?.toString() === workflowId.toString()
        );

        if (!workflow) {
            throw CustomException('Workflow not found', 404);
        }

        let executions = (firm.workflowExecutions || []).filter(
            e => e.workflowId?.toString() === workflowId.toString()
        );

        if (dateFrom || dateTo) {
            const from = dateFrom ? new Date(dateFrom) : new Date('1970-01-01');
            const to = dateTo ? new Date(dateTo) : new Date();
            executions = executions.filter(e => {
                const execDate = new Date(e.executedAt);
                return execDate >= from && execDate <= to;
            });
        }

        const statusCounts = {};
        let totalDuration = 0;
        let successCount = 0;

        executions.forEach(exec => {
            statusCounts[exec.status] = (statusCounts[exec.status] || 0) + 1;
            if (exec.duration) totalDuration += exec.duration;
            if (exec.status === 'success') successCount++;
        });

        // Group by day for trend
        const byDay = {};
        executions.forEach(exec => {
            const day = new Date(exec.executedAt).toISOString().slice(0, 10);
            if (!byDay[day]) byDay[day] = { total: 0, success: 0, failed: 0 };
            byDay[day].total++;
            if (exec.status === 'success') byDay[day].success++;
            else if (exec.status === 'failed') byDay[day].failed++;
        });

        res.json({
            success: true,
            data: {
                workflow: {
                    _id: workflow._id,
                    name: workflow.name,
                    isActive: workflow.isActive
                },
                summary: {
                    totalExecutions: executions.length,
                    byStatus: statusCounts,
                    successRate: executions.length > 0
                        ? Math.round((successCount / executions.length) * 100)
                        : 0,
                    averageDuration: executions.length > 0
                        ? Math.round(totalDuration / executions.length)
                        : 0
                },
                trend: Object.entries(byDay)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .slice(-30)
                    .map(([date, counts]) => ({ date, ...counts }))
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
