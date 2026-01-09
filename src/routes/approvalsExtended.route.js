/**
 * Approvals Extended Routes
 *
 * Extended approval management for workflow approvals.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - GET /templates              - Get approval templates
 * - POST /templates             - Create approval template
 * - GET /templates/:id          - Get template by ID
 * - PUT /templates/:id          - Update template
 * - DELETE /templates/:id       - Delete template
 * - GET /my-requests            - Get my approval requests
 * - GET /stats                  - Get approval statistics
 * - POST /check                 - Check if approval is required
 * - DELETE /rules/:ruleId       - Delete approval rule
 * - GET /pending                - Get pending approvals
 * - GET /history                - Get approval history
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Allowed fields for templates
const ALLOWED_TEMPLATE_FIELDS = [
    'name', 'description', 'entityType', 'conditions', 'approvers',
    'escalationRules', 'autoApproveAfter', 'requireAllApprovers',
    'notifyOnSubmit', 'notifyOnApprove', 'notifyOnReject', 'isActive'
];

// Valid entity types for approvals
const VALID_ENTITY_TYPES = ['expense', 'leave', 'invoice', 'purchase', 'document', 'timesheet', 'payroll'];

/**
 * GET /templates - Get approval templates
 */
router.get('/templates', async (req, res, next) => {
    try {
        const { entityType, isActive, search } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('settings.approvalTemplates').lean();

        let templates = firm?.settings?.approvalTemplates || [];

        if (entityType) {
            templates = templates.filter(t => t.entityType === entityType);
        }
        if (isActive !== undefined) {
            templates = templates.filter(t => t.isActive === (isActive === 'true'));
        }
        if (search) {
            const pattern = escapeRegex(search).toLowerCase();
            templates = templates.filter(t =>
                t.name?.toLowerCase().includes(pattern) ||
                t.description?.toLowerCase().includes(pattern)
            );
        }

        res.json({
            success: true,
            data: templates
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /templates - Create approval template
 */
router.post('/templates', async (req, res, next) => {
    try {
        const safeData = pickAllowedFields(req.body, ALLOWED_TEMPLATE_FIELDS);

        if (!safeData.name) {
            throw CustomException('Template name is required', 400);
        }
        if (!safeData.entityType || !VALID_ENTITY_TYPES.includes(safeData.entityType)) {
            throw CustomException(`Entity type is required and must be one of: ${VALID_ENTITY_TYPES.join(', ')}`, 400);
        }

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        if (!firm.settings) firm.settings = {};
        if (!firm.settings.approvalTemplates) firm.settings.approvalTemplates = [];

        // Check for duplicate
        const existing = firm.settings.approvalTemplates.find(
            t => t.name.toLowerCase() === safeData.name.toLowerCase()
        );
        if (existing) {
            throw CustomException('Template with this name already exists', 400);
        }

        const template = {
            _id: new mongoose.Types.ObjectId(),
            ...safeData,
            isActive: safeData.isActive !== false,
            createdBy: req.userID,
            createdAt: new Date()
        };

        firm.settings.approvalTemplates.push(template);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Approval template created',
            data: template
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /templates/:id - Get template by ID
 */
router.get('/templates/:id', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery).select('settings.approvalTemplates').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const template = (firm.settings?.approvalTemplates || []).find(
            t => t._id?.toString() === id.toString()
        );

        if (!template) {
            throw CustomException('Template not found', 404);
        }

        res.json({
            success: true,
            data: template
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /templates/:id - Update template
 */
router.put('/templates/:id', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');
        const safeData = pickAllowedFields(req.body, ALLOWED_TEMPLATE_FIELDS);

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const templateIndex = (firm.settings?.approvalTemplates || []).findIndex(
            t => t._id?.toString() === id.toString()
        );

        if (templateIndex === -1) {
            throw CustomException('Template not found', 404);
        }

        Object.assign(firm.settings.approvalTemplates[templateIndex], safeData, {
            updatedBy: req.userID,
            updatedAt: new Date()
        });

        await firm.save();

        res.json({
            success: true,
            message: 'Template updated',
            data: firm.settings.approvalTemplates[templateIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /templates/:id - Delete template
 */
router.delete('/templates/:id', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const templateIndex = (firm.settings?.approvalTemplates || []).findIndex(
            t => t._id?.toString() === id.toString()
        );

        if (templateIndex === -1) {
            throw CustomException('Template not found', 404);
        }

        firm.settings.approvalTemplates.splice(templateIndex, 1);
        await firm.save();

        res.json({
            success: true,
            message: 'Template deleted'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /my-requests - Get current user's approval requests
 */
router.get('/my-requests', async (req, res, next) => {
    try {
        const { page, limit, skip } = sanitizePagination(req.query.page, req.query.limit);
        const { status, entityType } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('approvals').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let requests = (firm.approvals || []).filter(
            a => a.requestedBy?.toString() === req.userID
        );

        if (status) {
            requests = requests.filter(r => r.status === status);
        }
        if (entityType) {
            requests = requests.filter(r => r.entityType === entityType);
        }

        requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const total = requests.length;
        const paginatedRequests = requests.slice(skip, skip + limit);

        res.json({
            success: true,
            data: paginatedRequests,
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
 * GET /stats - Get approval statistics
 */
router.get('/stats', async (req, res, next) => {
    try {
        const { dateFrom, dateTo } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('approvals').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let approvals = firm.approvals || [];

        if (dateFrom || dateTo) {
            const fromDate = dateFrom ? new Date(dateFrom) : new Date('1970-01-01');
            const toDate = dateTo ? new Date(dateTo) : new Date();
            approvals = approvals.filter(a => {
                const created = new Date(a.createdAt);
                return created >= fromDate && created <= toDate;
            });
        }

        const statusCounts = {};
        const entityTypeCounts = {};
        let totalProcessingTime = 0;
        let processedCount = 0;

        for (const approval of approvals) {
            statusCounts[approval.status] = (statusCounts[approval.status] || 0) + 1;
            if (approval.entityType) {
                entityTypeCounts[approval.entityType] = (entityTypeCounts[approval.entityType] || 0) + 1;
            }
            if (approval.processedAt && approval.createdAt) {
                totalProcessingTime += new Date(approval.processedAt) - new Date(approval.createdAt);
                processedCount++;
            }
        }

        res.json({
            success: true,
            data: {
                total: approvals.length,
                pending: statusCounts.pending || 0,
                approved: statusCounts.approved || 0,
                rejected: statusCounts.rejected || 0,
                byStatus: statusCounts,
                byEntityType: entityTypeCounts,
                averageProcessingTimeHours: processedCount > 0
                    ? Math.round((totalProcessingTime / processedCount / (1000 * 60 * 60)) * 10) / 10
                    : 0,
                approvalRate: approvals.length > 0
                    ? Math.round(((statusCounts.approved || 0) / approvals.length) * 100)
                    : 0
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /check - Check if approval is required for an action
 */
router.post('/check', async (req, res, next) => {
    try {
        const { entityType, entityId, action, amount, userId } = req.body;

        if (!entityType) {
            throw CustomException('Entity type is required', 400);
        }

        const firm = await Firm.findOne(req.firmQuery).select('settings.approvalTemplates settings.approvalRules').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        // Find applicable template
        const template = (firm.settings?.approvalTemplates || []).find(
            t => t.entityType === entityType && t.isActive
        );

        if (!template) {
            return res.json({
                success: true,
                data: {
                    requiresApproval: false,
                    reason: 'No active approval template found for this entity type'
                }
            });
        }

        // Check conditions
        let requiresApproval = true;
        let matchedConditions = [];

        if (template.conditions) {
            for (const condition of template.conditions) {
                if (condition.field === 'amount' && amount !== undefined) {
                    if (condition.operator === 'gt' && amount > condition.value) {
                        matchedConditions.push(`Amount ${amount} > ${condition.value}`);
                    } else if (condition.operator === 'lt' && amount < condition.value) {
                        matchedConditions.push(`Amount ${amount} < ${condition.value}`);
                    } else if (condition.operator === 'gte' && amount >= condition.value) {
                        matchedConditions.push(`Amount ${amount} >= ${condition.value}`);
                    }
                }
            }
            requiresApproval = matchedConditions.length > 0 || template.conditions.length === 0;
        }

        res.json({
            success: true,
            data: {
                requiresApproval,
                templateId: template._id,
                templateName: template.name,
                approvers: template.approvers || [],
                matchedConditions,
                requireAllApprovers: template.requireAllApprovers || false
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /rules/:ruleId - Delete approval rule
 */
router.delete('/rules/:ruleId', async (req, res, next) => {
    try {
        const ruleId = sanitizeObjectId(req.params.ruleId, 'ruleId');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        if (!firm.settings) firm.settings = {};
        if (!firm.settings.approvalRules) firm.settings.approvalRules = [];

        const ruleIndex = firm.settings.approvalRules.findIndex(
            r => r._id?.toString() === ruleId.toString()
        );

        if (ruleIndex === -1) {
            throw CustomException('Approval rule not found', 404);
        }

        firm.settings.approvalRules.splice(ruleIndex, 1);
        await firm.save();

        res.json({
            success: true,
            message: 'Approval rule deleted'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /pending - Get pending approvals for current user
 */
router.get('/pending', async (req, res, next) => {
    try {
        const { page, limit, skip } = sanitizePagination(req.query.page, req.query.limit);
        const { entityType, priority } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('approvals').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let pendingApprovals = (firm.approvals || []).filter(a => {
            if (a.status !== 'pending') return false;
            // Check if current user is an approver
            return a.approvers?.some(
                approver => approver.userId?.toString() === req.userID && !approver.decision
            );
        });

        if (entityType) {
            pendingApprovals = pendingApprovals.filter(a => a.entityType === entityType);
        }
        if (priority) {
            pendingApprovals = pendingApprovals.filter(a => a.priority === priority);
        }

        pendingApprovals.sort((a, b) => {
            // Sort by priority first, then by date
            const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
            const priorityDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
            if (priorityDiff !== 0) return priorityDiff;
            return new Date(a.createdAt) - new Date(b.createdAt);
        });

        const total = pendingApprovals.length;
        const paginatedApprovals = pendingApprovals.slice(skip, skip + limit);

        res.json({
            success: true,
            data: paginatedApprovals,
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
 * GET /history - Get approval history
 */
router.get('/history', async (req, res, next) => {
    try {
        const { page, limit, skip } = sanitizePagination(req.query.page, req.query.limit);
        const { entityType, status, dateFrom, dateTo } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('approvals').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let approvals = firm.approvals || [];

        // Filter completed approvals (not pending)
        approvals = approvals.filter(a => a.status !== 'pending');

        if (entityType) {
            approvals = approvals.filter(a => a.entityType === entityType);
        }
        if (status) {
            approvals = approvals.filter(a => a.status === status);
        }
        if (dateFrom || dateTo) {
            const fromDate = dateFrom ? new Date(dateFrom) : new Date('1970-01-01');
            const toDate = dateTo ? new Date(dateTo) : new Date();
            approvals = approvals.filter(a => {
                const processed = new Date(a.processedAt || a.createdAt);
                return processed >= fromDate && processed <= toDate;
            });
        }

        approvals.sort((a, b) => new Date(b.processedAt || b.createdAt) - new Date(a.processedAt || a.createdAt));

        const total = approvals.length;
        const paginatedApprovals = approvals.slice(skip, skip + limit);

        res.json({
            success: true,
            data: paginatedApprovals,
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
