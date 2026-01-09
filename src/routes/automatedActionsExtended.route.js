/**
 * Automated Actions Extended Routes
 *
 * Manages automated workflow actions and triggers.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - GET /                       - List automated actions
 * - POST /                      - Create automated action
 * - GET /:id                    - Get action by ID
 * - PUT /:id                    - Update action
 * - DELETE /:id                 - Delete action
 * - POST /:id/toggle            - Toggle action enabled/disabled
 * - POST /:id/test              - Test action
 * - POST /:id/duplicate         - Duplicate action
 * - GET /:actionId/logs         - Get action execution logs
 * - GET /logs                   - Get all execution logs
 * - POST /bulk                  - Bulk create actions
 * - POST /bulk/enable           - Bulk enable actions
 * - POST /bulk/disable          - Bulk disable actions
 * - DELETE /bulk                - Bulk delete actions
 * - GET /models                 - Get available models
 * - GET /models/:modelName/fields - Get model fields
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Allowed fields
const ALLOWED_ACTION_FIELDS = [
    'name', 'description', 'trigger', 'triggerModel', 'triggerEvent',
    'conditions', 'actions', 'schedule', 'isEnabled', 'priority',
    'maxRetries', 'retryDelay', 'timeout', 'tags'
];

// Valid trigger events
const VALID_TRIGGER_EVENTS = ['create', 'update', 'delete', 'status_change', 'field_change', 'schedule'];

// Available models for automation
const AVAILABLE_MODELS = [
    { name: 'Case', collection: 'cases', displayName: 'Cases' },
    { name: 'Client', collection: 'clients', displayName: 'Clients' },
    { name: 'Lead', collection: 'leads', displayName: 'Leads' },
    { name: 'Invoice', collection: 'invoices', displayName: 'Invoices' },
    { name: 'Task', collection: 'tasks', displayName: 'Tasks' },
    { name: 'Expense', collection: 'expenses', displayName: 'Expenses' },
    { name: 'Document', collection: 'documents', displayName: 'Documents' },
    { name: 'Appointment', collection: 'appointments', displayName: 'Appointments' },
    { name: 'LeaveRequest', collection: 'leaverequests', displayName: 'Leave Requests' },
    { name: 'Attendance', collection: 'attendances', displayName: 'Attendance' }
];

/**
 * GET / - List automated actions
 */
router.get('/', async (req, res, next) => {
    try {
        const { page, limit, skip } = sanitizePagination(req.query.page, req.query.limit);
        const { triggerModel, isEnabled, search, tags } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('automations.actions').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let actions = firm.automations?.actions || [];

        if (triggerModel) {
            actions = actions.filter(a => a.triggerModel === triggerModel);
        }
        if (isEnabled !== undefined) {
            actions = actions.filter(a => a.isEnabled === (isEnabled === 'true'));
        }
        if (search) {
            const pattern = escapeRegex(search).toLowerCase();
            actions = actions.filter(a =>
                a.name?.toLowerCase().includes(pattern) ||
                a.description?.toLowerCase().includes(pattern)
            );
        }
        if (tags) {
            const tagList = tags.split(',').map(t => t.trim().toLowerCase());
            actions = actions.filter(a =>
                a.tags?.some(t => tagList.includes(t.toLowerCase()))
            );
        }

        actions.sort((a, b) => (b.priority || 0) - (a.priority || 0));

        const total = actions.length;
        const paginatedActions = actions.slice(skip, skip + limit);

        res.json({
            success: true,
            data: paginatedActions,
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

/**
 * POST / - Create automated action
 */
router.post('/', async (req, res, next) => {
    try {
        const safeData = pickAllowedFields(req.body, ALLOWED_ACTION_FIELDS);

        if (!safeData.name) {
            throw CustomException('Action name is required', 400);
        }
        if (!safeData.triggerModel) {
            throw CustomException('Trigger model is required', 400);
        }
        if (!safeData.triggerEvent || !VALID_TRIGGER_EVENTS.includes(safeData.triggerEvent)) {
            throw CustomException(`Trigger event must be one of: ${VALID_TRIGGER_EVENTS.join(', ')}`, 400);
        }
        if (!safeData.actions || !Array.isArray(safeData.actions) || safeData.actions.length === 0) {
            throw CustomException('At least one action is required', 400);
        }

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        if (!firm.automations) firm.automations = {};
        if (!firm.automations.actions) firm.automations.actions = [];

        // Check for duplicate name
        const existing = firm.automations.actions.find(
            a => a.name.toLowerCase() === safeData.name.toLowerCase()
        );
        if (existing) {
            throw CustomException('Action with this name already exists', 400);
        }

        const action = {
            _id: new mongoose.Types.ObjectId(),
            ...safeData,
            isEnabled: safeData.isEnabled !== false,
            executionCount: 0,
            lastExecutedAt: null,
            createdBy: req.userID,
            createdAt: new Date()
        };

        firm.automations.actions.push(action);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Automated action created',
            data: action
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:id - Get action by ID
 */
router.get('/:id', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery).select('automations.actions').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const action = (firm.automations?.actions || []).find(
            a => a._id?.toString() === id.toString()
        );

        if (!action) {
            throw CustomException('Action not found', 404);
        }

        res.json({
            success: true,
            data: action
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /:id - Update action
 */
router.put('/:id', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');
        const safeData = pickAllowedFields(req.body, ALLOWED_ACTION_FIELDS);

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const actionIndex = (firm.automations?.actions || []).findIndex(
            a => a._id?.toString() === id.toString()
        );

        if (actionIndex === -1) {
            throw CustomException('Action not found', 404);
        }

        if (safeData.triggerEvent && !VALID_TRIGGER_EVENTS.includes(safeData.triggerEvent)) {
            throw CustomException(`Trigger event must be one of: ${VALID_TRIGGER_EVENTS.join(', ')}`, 400);
        }

        // Check for duplicate name if changed
        if (safeData.name && safeData.name !== firm.automations.actions[actionIndex].name) {
            const existing = firm.automations.actions.find(
                (a, i) => i !== actionIndex && a.name.toLowerCase() === safeData.name.toLowerCase()
            );
            if (existing) {
                throw CustomException('Action with this name already exists', 400);
            }
        }

        Object.assign(firm.automations.actions[actionIndex], safeData, {
            updatedBy: req.userID,
            updatedAt: new Date()
        });

        await firm.save();

        res.json({
            success: true,
            message: 'Action updated',
            data: firm.automations.actions[actionIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:id - Delete action
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const actionIndex = (firm.automations?.actions || []).findIndex(
            a => a._id?.toString() === id.toString()
        );

        if (actionIndex === -1) {
            throw CustomException('Action not found', 404);
        }

        firm.automations.actions.splice(actionIndex, 1);
        await firm.save();

        res.json({
            success: true,
            message: 'Action deleted'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/toggle - Toggle action enabled/disabled
 */
router.post('/:id/toggle', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const actionIndex = (firm.automations?.actions || []).findIndex(
            a => a._id?.toString() === id.toString()
        );

        if (actionIndex === -1) {
            throw CustomException('Action not found', 404);
        }

        firm.automations.actions[actionIndex].isEnabled = !firm.automations.actions[actionIndex].isEnabled;
        firm.automations.actions[actionIndex].toggledBy = req.userID;
        firm.automations.actions[actionIndex].toggledAt = new Date();

        await firm.save();

        res.json({
            success: true,
            message: `Action ${firm.automations.actions[actionIndex].isEnabled ? 'enabled' : 'disabled'}`,
            data: firm.automations.actions[actionIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/test - Test action (dry run)
 */
router.post('/:id/test', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');
        const { testData } = req.body;

        const firm = await Firm.findOne(req.firmQuery).select('automations.actions').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const action = (firm.automations?.actions || []).find(
            a => a._id?.toString() === id.toString()
        );

        if (!action) {
            throw CustomException('Action not found', 404);
        }

        // Simulate condition evaluation
        const conditionsResult = [];
        if (action.conditions && Array.isArray(action.conditions)) {
            for (const condition of action.conditions) {
                const testValue = testData?.[condition.field];
                let passed = false;

                switch (condition.operator) {
                    case 'equals':
                        passed = testValue === condition.value;
                        break;
                    case 'not_equals':
                        passed = testValue !== condition.value;
                        break;
                    case 'contains':
                        passed = String(testValue).includes(condition.value);
                        break;
                    case 'greater_than':
                        passed = testValue > condition.value;
                        break;
                    case 'less_than':
                        passed = testValue < condition.value;
                        break;
                    default:
                        passed = true;
                }

                conditionsResult.push({
                    field: condition.field,
                    operator: condition.operator,
                    expected: condition.value,
                    actual: testValue,
                    passed
                });
            }
        }

        const allConditionsPassed = conditionsResult.every(c => c.passed);

        res.json({
            success: true,
            data: {
                actionId: action._id,
                actionName: action.name,
                wouldExecute: allConditionsPassed,
                conditionsEvaluated: conditionsResult,
                actionsToExecute: allConditionsPassed ? action.actions : [],
                testData
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/duplicate - Duplicate action
 */
router.post('/:id/duplicate', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');
        const { newName } = req.body;

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const action = (firm.automations?.actions || []).find(
            a => a._id?.toString() === id.toString()
        );

        if (!action) {
            throw CustomException('Action not found', 404);
        }

        const duplicatedName = newName || `${action.name} (Copy)`;

        // Check for duplicate name
        const existing = firm.automations.actions.find(
            a => a.name.toLowerCase() === duplicatedName.toLowerCase()
        );
        if (existing) {
            throw CustomException('Action with this name already exists', 400);
        }

        const duplicate = {
            ...action,
            _id: new mongoose.Types.ObjectId(),
            name: duplicatedName,
            isEnabled: false, // Start disabled
            executionCount: 0,
            lastExecutedAt: null,
            createdBy: req.userID,
            createdAt: new Date(),
            duplicatedFrom: action._id
        };

        delete duplicate.updatedBy;
        delete duplicate.updatedAt;

        firm.automations.actions.push(duplicate);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Action duplicated',
            data: duplicate
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:actionId/logs - Get action execution logs
 */
router.get('/:actionId/logs', async (req, res, next) => {
    try {
        const actionId = sanitizeObjectId(req.params.actionId, 'actionId');
        const { page, limit, skip } = sanitizePagination(req.query.page, req.query.limit);
        const { status, dateFrom, dateTo } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('automations.executionLogs').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let logs = (firm.automations?.executionLogs || []).filter(
            l => l.actionId?.toString() === actionId.toString()
        );

        if (status) {
            logs = logs.filter(l => l.status === status);
        }
        if (dateFrom || dateTo) {
            const fromDate = dateFrom ? new Date(dateFrom) : new Date('1970-01-01');
            const toDate = dateTo ? new Date(dateTo) : new Date();
            logs = logs.filter(l => {
                const executed = new Date(l.executedAt);
                return executed >= fromDate && executed <= toDate;
            });
        }

        logs.sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt));

        const total = logs.length;
        const paginatedLogs = logs.slice(skip, skip + limit);

        res.json({
            success: true,
            data: paginatedLogs,
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

/**
 * GET /logs - Get all execution logs
 */
router.get('/logs', async (req, res, next) => {
    try {
        const { page, limit, skip } = sanitizePagination(req.query.page, req.query.limit);
        const { actionId, status, dateFrom, dateTo } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('automations.executionLogs').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let logs = firm.automations?.executionLogs || [];

        if (actionId) {
            const sanitizedActionId = sanitizeObjectId(actionId, 'actionId');
            logs = logs.filter(l => l.actionId?.toString() === sanitizedActionId.toString());
        }
        if (status) {
            logs = logs.filter(l => l.status === status);
        }
        if (dateFrom || dateTo) {
            const fromDate = dateFrom ? new Date(dateFrom) : new Date('1970-01-01');
            const toDate = dateTo ? new Date(dateTo) : new Date();
            logs = logs.filter(l => {
                const executed = new Date(l.executedAt);
                return executed >= fromDate && executed <= toDate;
            });
        }

        logs.sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt));

        const total = logs.length;
        const paginatedLogs = logs.slice(skip, skip + limit);

        res.json({
            success: true,
            data: paginatedLogs,
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

/**
 * POST /bulk - Bulk create actions
 */
router.post('/bulk', async (req, res, next) => {
    try {
        const { actions } = req.body;

        if (!Array.isArray(actions) || actions.length === 0) {
            throw CustomException('Actions array is required', 400);
        }

        if (actions.length > 20) {
            throw CustomException('Maximum 20 actions per request', 400);
        }

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        if (!firm.automations) firm.automations = {};
        if (!firm.automations.actions) firm.automations.actions = [];

        const results = { created: [], errors: [] };

        for (let i = 0; i < actions.length; i++) {
            try {
                const safeData = pickAllowedFields(actions[i], ALLOWED_ACTION_FIELDS);

                if (!safeData.name || !safeData.triggerModel || !safeData.triggerEvent) {
                    results.errors.push({ index: i, error: 'Missing required fields' });
                    continue;
                }

                const action = {
                    _id: new mongoose.Types.ObjectId(),
                    ...safeData,
                    isEnabled: false, // Start disabled for safety
                    executionCount: 0,
                    createdBy: req.userID,
                    createdAt: new Date()
                };

                firm.automations.actions.push(action);
                results.created.push({ index: i, id: action._id, name: action.name });
            } catch (err) {
                results.errors.push({ index: i, error: err.message });
            }
        }

        await firm.save();

        res.status(201).json({
            success: true,
            message: `Created ${results.created.length} actions, ${results.errors.length} errors`,
            data: results
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /bulk/enable - Bulk enable actions
 */
router.post('/bulk/enable', async (req, res, next) => {
    try {
        const { actionIds } = req.body;

        if (!Array.isArray(actionIds) || actionIds.length === 0) {
            throw CustomException('Action IDs array is required', 400);
        }

        const sanitizedIds = actionIds.map(id => sanitizeObjectId(id, 'actionId').toString());

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let enabledCount = 0;
        for (const action of (firm.automations?.actions || [])) {
            if (sanitizedIds.includes(action._id?.toString())) {
                action.isEnabled = true;
                action.toggledBy = req.userID;
                action.toggledAt = new Date();
                enabledCount++;
            }
        }

        await firm.save();

        res.json({
            success: true,
            message: `Enabled ${enabledCount} actions`,
            data: { enabledCount }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /bulk/disable - Bulk disable actions
 */
router.post('/bulk/disable', async (req, res, next) => {
    try {
        const { actionIds } = req.body;

        if (!Array.isArray(actionIds) || actionIds.length === 0) {
            throw CustomException('Action IDs array is required', 400);
        }

        const sanitizedIds = actionIds.map(id => sanitizeObjectId(id, 'actionId').toString());

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let disabledCount = 0;
        for (const action of (firm.automations?.actions || [])) {
            if (sanitizedIds.includes(action._id?.toString())) {
                action.isEnabled = false;
                action.toggledBy = req.userID;
                action.toggledAt = new Date();
                disabledCount++;
            }
        }

        await firm.save();

        res.json({
            success: true,
            message: `Disabled ${disabledCount} actions`,
            data: { disabledCount }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /bulk - Bulk delete actions
 */
router.delete('/bulk', async (req, res, next) => {
    try {
        const { actionIds } = req.body;

        if (!Array.isArray(actionIds) || actionIds.length === 0) {
            throw CustomException('Action IDs array is required', 400);
        }

        if (actionIds.length > 50) {
            throw CustomException('Maximum 50 deletions per request', 400);
        }

        const sanitizedIds = actionIds.map(id => sanitizeObjectId(id, 'actionId').toString());

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const initialCount = firm.automations?.actions?.length || 0;
        firm.automations.actions = (firm.automations?.actions || []).filter(
            a => !sanitizedIds.includes(a._id?.toString())
        );
        const deletedCount = initialCount - firm.automations.actions.length;

        await firm.save();

        res.json({
            success: true,
            message: `Deleted ${deletedCount} actions`,
            data: { deletedCount }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /models - Get available models for automation
 */
router.get('/models', async (req, res, next) => {
    try {
        res.json({
            success: true,
            data: AVAILABLE_MODELS
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /models/:modelName/fields - Get fields for a model
 */
router.get('/models/:modelName/fields', async (req, res, next) => {
    try {
        const { modelName } = req.params;

        const model = AVAILABLE_MODELS.find(
            m => m.name.toLowerCase() === modelName.toLowerCase()
        );

        if (!model) {
            throw CustomException('Model not found', 404);
        }

        // Return common fields based on model type
        const commonFields = [
            { name: '_id', type: 'ObjectId', displayName: 'ID' },
            { name: 'createdAt', type: 'Date', displayName: 'Created At' },
            { name: 'updatedAt', type: 'Date', displayName: 'Updated At' },
            { name: 'createdBy', type: 'ObjectId', displayName: 'Created By' }
        ];

        const modelSpecificFields = {
            Case: [
                { name: 'status', type: 'String', displayName: 'Status' },
                { name: 'title', type: 'String', displayName: 'Title' },
                { name: 'caseNumber', type: 'String', displayName: 'Case Number' },
                { name: 'clientId', type: 'ObjectId', displayName: 'Client' },
                { name: 'assignedTo', type: 'ObjectId', displayName: 'Assigned To' }
            ],
            Client: [
                { name: 'status', type: 'String', displayName: 'Status' },
                { name: 'name', type: 'String', displayName: 'Name' },
                { name: 'email', type: 'String', displayName: 'Email' },
                { name: 'type', type: 'String', displayName: 'Type' }
            ],
            Lead: [
                { name: 'status', type: 'String', displayName: 'Status' },
                { name: 'stage', type: 'String', displayName: 'Stage' },
                { name: 'value', type: 'Number', displayName: 'Value' },
                { name: 'source', type: 'String', displayName: 'Source' }
            ],
            Invoice: [
                { name: 'status', type: 'String', displayName: 'Status' },
                { name: 'total', type: 'Number', displayName: 'Total' },
                { name: 'dueDate', type: 'Date', displayName: 'Due Date' },
                { name: 'clientId', type: 'ObjectId', displayName: 'Client' }
            ],
            Task: [
                { name: 'status', type: 'String', displayName: 'Status' },
                { name: 'priority', type: 'String', displayName: 'Priority' },
                { name: 'dueDate', type: 'Date', displayName: 'Due Date' },
                { name: 'assignedTo', type: 'ObjectId', displayName: 'Assigned To' }
            ]
        };

        const fields = [
            ...commonFields,
            ...(modelSpecificFields[model.name] || [])
        ];

        res.json({
            success: true,
            data: {
                model: model.name,
                fields
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
