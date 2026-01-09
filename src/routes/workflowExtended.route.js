/**
 * Workflow Extended Routes
 *
 * Provides extended workflow management including instances, templates, and case workflows.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - GET /instances               - List workflow instances
 * - GET /instances/:id           - Get instance by ID
 * - POST /instances/:id/advance  - Advance workflow instance
 * - POST /instances/:id/cancel   - Cancel workflow instance
 * - POST /instances/:id/pause    - Pause workflow instance
 * - POST /instances/:id/resume   - Resume workflow instance
 * - GET /templates               - List workflow templates
 * - GET /templates/:id           - Get template by ID
 * - GET /entity/:entityType/:entityId - Get workflow for entity
 * - GET /presets                 - Get workflow presets
 * - GET /presets/:presetType     - Get preset by type
 * - GET /stats                   - Get workflow statistics
 * - GET /category/:category      - Get workflows by category
 * - POST /cases/:caseId/initialize  - Initialize case workflow
 * - POST /cases/:caseId/move        - Move case in workflow
 * - GET /cases/:caseId/progress     - Get case workflow progress
 * - POST /cases/:caseId/requirements/:requirementId/complete - Complete requirement
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Workflow = require('../models/workflow.model');
const Case = require('../models/case.model');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Valid statuses
const VALID_INSTANCE_STATUSES = ['active', 'paused', 'completed', 'cancelled', 'failed'];
const VALID_CATEGORIES = ['legal', 'finance', 'hr', 'sales', 'support', 'general'];

/**
 * GET /instances - List workflow instances
 */
router.get('/instances', async (req, res, next) => {
    try {
        const { page, limit, skip } = sanitizePagination(req.query.page, req.query.limit);
        const { status, workflowId, entityType, entityId, search } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('workflows.instances').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let instances = firm.workflows?.instances || [];

        // Apply filters
        if (status) {
            if (!VALID_INSTANCE_STATUSES.includes(status)) {
                throw CustomException(`Invalid status. Must be one of: ${VALID_INSTANCE_STATUSES.join(', ')}`, 400);
            }
            instances = instances.filter(i => i.status === status);
        }
        if (workflowId) {
            const sanitizedWorkflowId = sanitizeObjectId(workflowId, 'workflowId');
            instances = instances.filter(i => i.workflowId?.toString() === sanitizedWorkflowId.toString());
        }
        if (entityType) {
            instances = instances.filter(i => i.entityType === entityType);
        }
        if (entityId) {
            const sanitizedEntityId = sanitizeObjectId(entityId, 'entityId');
            instances = instances.filter(i => i.entityId?.toString() === sanitizedEntityId.toString());
        }
        if (search) {
            const searchPattern = escapeRegex(search).toLowerCase();
            instances = instances.filter(i =>
                i.name?.toLowerCase().includes(searchPattern) ||
                i.description?.toLowerCase().includes(searchPattern)
            );
        }

        // Sort by created date descending
        instances.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const total = instances.length;
        const paginatedInstances = instances.slice(skip, skip + limit);

        res.json({
            success: true,
            data: paginatedInstances,
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
 * GET /instances/:id - Get workflow instance by ID
 */
router.get('/instances/:id', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery).select('workflows.instances workflows.templates').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const instance = (firm.workflows?.instances || []).find(
            i => i._id?.toString() === id.toString()
        );

        if (!instance) {
            throw CustomException('Workflow instance not found', 404);
        }

        // Get workflow template details
        let template = null;
        if (instance.workflowId) {
            template = (firm.workflows?.templates || []).find(
                t => t._id?.toString() === instance.workflowId.toString()
            );
        }

        res.json({
            success: true,
            data: {
                ...instance,
                template
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /instances/:id/advance - Advance workflow instance to next step
 */
router.post('/instances/:id/advance', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');
        const { targetStepId, notes, completionData } = req.body;

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const instanceIndex = (firm.workflows?.instances || []).findIndex(
            i => i._id?.toString() === id.toString()
        );

        if (instanceIndex === -1) {
            throw CustomException('Workflow instance not found', 404);
        }

        const instance = firm.workflows.instances[instanceIndex];

        if (instance.status !== 'active') {
            throw CustomException(`Cannot advance workflow in ${instance.status} status`, 400);
        }

        // Get workflow template to find next step
        const template = (firm.workflows?.templates || []).find(
            t => t._id?.toString() === instance.workflowId?.toString()
        );

        if (!template) {
            throw CustomException('Workflow template not found', 404);
        }

        // Find current step index
        const currentStepIndex = template.steps?.findIndex(
            s => s._id?.toString() === instance.currentStepId?.toString()
        ) ?? -1;

        let nextStep;
        if (targetStepId) {
            // Move to specific step
            nextStep = template.steps?.find(s => s._id?.toString() === targetStepId);
            if (!nextStep) {
                throw CustomException('Target step not found in workflow', 400);
            }
        } else {
            // Move to next sequential step
            nextStep = template.steps?.[currentStepIndex + 1];
        }

        // Record step completion
        if (!instance.stepHistory) instance.stepHistory = [];
        instance.stepHistory.push({
            stepId: instance.currentStepId,
            completedAt: new Date(),
            completedBy: req.userID,
            notes,
            completionData
        });

        if (nextStep) {
            // Move to next step
            instance.currentStepId = nextStep._id;
            instance.currentStepName = nextStep.name;
            instance.updatedAt = new Date();
        } else {
            // No more steps - complete the workflow
            instance.status = 'completed';
            instance.completedAt = new Date();
            instance.completedBy = req.userID;
        }

        firm.workflows.instances[instanceIndex] = instance;
        await firm.save();

        res.json({
            success: true,
            message: nextStep ? 'Workflow advanced to next step' : 'Workflow completed',
            data: instance
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /instances/:id/cancel - Cancel workflow instance
 */
router.post('/instances/:id/cancel', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');
        const { reason } = req.body;

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const instanceIndex = (firm.workflows?.instances || []).findIndex(
            i => i._id?.toString() === id.toString()
        );

        if (instanceIndex === -1) {
            throw CustomException('Workflow instance not found', 404);
        }

        if (['completed', 'cancelled'].includes(firm.workflows.instances[instanceIndex].status)) {
            throw CustomException('Cannot cancel a completed or already cancelled workflow', 400);
        }

        firm.workflows.instances[instanceIndex].status = 'cancelled';
        firm.workflows.instances[instanceIndex].cancelledAt = new Date();
        firm.workflows.instances[instanceIndex].cancelledBy = req.userID;
        if (reason) {
            firm.workflows.instances[instanceIndex].cancellationReason = reason;
        }

        await firm.save();

        res.json({
            success: true,
            message: 'Workflow cancelled',
            data: firm.workflows.instances[instanceIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /instances/:id/pause - Pause workflow instance
 */
router.post('/instances/:id/pause', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');
        const { reason } = req.body;

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const instanceIndex = (firm.workflows?.instances || []).findIndex(
            i => i._id?.toString() === id.toString()
        );

        if (instanceIndex === -1) {
            throw CustomException('Workflow instance not found', 404);
        }

        if (firm.workflows.instances[instanceIndex].status !== 'active') {
            throw CustomException('Can only pause active workflows', 400);
        }

        firm.workflows.instances[instanceIndex].status = 'paused';
        firm.workflows.instances[instanceIndex].pausedAt = new Date();
        firm.workflows.instances[instanceIndex].pausedBy = req.userID;
        if (reason) {
            firm.workflows.instances[instanceIndex].pauseReason = reason;
        }

        await firm.save();

        res.json({
            success: true,
            message: 'Workflow paused',
            data: firm.workflows.instances[instanceIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /instances/:id/resume - Resume paused workflow instance
 */
router.post('/instances/:id/resume', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const instanceIndex = (firm.workflows?.instances || []).findIndex(
            i => i._id?.toString() === id.toString()
        );

        if (instanceIndex === -1) {
            throw CustomException('Workflow instance not found', 404);
        }

        if (firm.workflows.instances[instanceIndex].status !== 'paused') {
            throw CustomException('Can only resume paused workflows', 400);
        }

        firm.workflows.instances[instanceIndex].status = 'active';
        firm.workflows.instances[instanceIndex].resumedAt = new Date();
        firm.workflows.instances[instanceIndex].resumedBy = req.userID;
        firm.workflows.instances[instanceIndex].pausedAt = undefined;
        firm.workflows.instances[instanceIndex].pausedBy = undefined;
        firm.workflows.instances[instanceIndex].pauseReason = undefined;

        await firm.save();

        res.json({
            success: true,
            message: 'Workflow resumed',
            data: firm.workflows.instances[instanceIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /templates - List workflow templates
 */
router.get('/templates', async (req, res, next) => {
    try {
        const { page, limit, skip } = sanitizePagination(req.query.page, req.query.limit);
        const { category, isActive, search } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('workflows.templates').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let templates = firm.workflows?.templates || [];

        // Apply filters
        if (category) {
            templates = templates.filter(t => t.category === category);
        }
        if (isActive !== undefined) {
            const active = isActive === 'true';
            templates = templates.filter(t => t.isActive === active);
        }
        if (search) {
            const searchPattern = escapeRegex(search).toLowerCase();
            templates = templates.filter(t =>
                t.name?.toLowerCase().includes(searchPattern) ||
                t.description?.toLowerCase().includes(searchPattern)
            );
        }

        // Sort by name
        templates.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        const total = templates.length;
        const paginatedTemplates = templates.slice(skip, skip + limit);

        res.json({
            success: true,
            data: paginatedTemplates,
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
 * GET /templates/:id - Get workflow template by ID
 */
router.get('/templates/:id', async (req, res, next) => {
    try {
        const id = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery).select('workflows.templates').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const template = (firm.workflows?.templates || []).find(
            t => t._id?.toString() === id.toString()
        );

        if (!template) {
            throw CustomException('Workflow template not found', 404);
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
 * GET /entity/:entityType/:entityId - Get workflow for specific entity
 */
router.get('/entity/:entityType/:entityId', async (req, res, next) => {
    try {
        const { entityType, entityId } = req.params;
        const sanitizedEntityId = sanitizeObjectId(entityId, 'entityId');

        const firm = await Firm.findOne(req.firmQuery).select('workflows.instances workflows.templates').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const instances = (firm.workflows?.instances || []).filter(i =>
            i.entityType === entityType && i.entityId?.toString() === sanitizedEntityId.toString()
        );

        // Enrich with template data
        const enrichedInstances = instances.map(instance => {
            const template = (firm.workflows?.templates || []).find(
                t => t._id?.toString() === instance.workflowId?.toString()
            );
            return {
                ...instance,
                template: template ? { name: template.name, steps: template.steps } : null
            };
        });

        res.json({
            success: true,
            data: enrichedInstances
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /presets - Get workflow presets
 */
router.get('/presets', async (req, res, next) => {
    try {
        const presets = [
            {
                type: 'case-management',
                name: 'Case Management',
                description: 'Standard workflow for legal case management',
                steps: [
                    { name: 'Intake', description: 'Initial client consultation and case assessment' },
                    { name: 'Research', description: 'Legal research and document gathering' },
                    { name: 'Preparation', description: 'Case preparation and strategy' },
                    { name: 'Filing', description: 'Court filings and submissions' },
                    { name: 'Discovery', description: 'Discovery process and evidence collection' },
                    { name: 'Resolution', description: 'Settlement, trial, or case closure' }
                ]
            },
            {
                type: 'client-onboarding',
                name: 'Client Onboarding',
                description: 'New client onboarding process',
                steps: [
                    { name: 'Initial Contact', description: 'First contact and inquiry' },
                    { name: 'Consultation', description: 'Initial consultation meeting' },
                    { name: 'KYC/Verification', description: 'Identity verification and background checks' },
                    { name: 'Agreement', description: 'Engagement letter and fee agreement' },
                    { name: 'Setup', description: 'System setup and access provisioning' },
                    { name: 'Welcome', description: 'Welcome package and orientation' }
                ]
            },
            {
                type: 'document-review',
                name: 'Document Review',
                description: 'Document review and approval workflow',
                steps: [
                    { name: 'Upload', description: 'Document upload and categorization' },
                    { name: 'Initial Review', description: 'First-level review' },
                    { name: 'Legal Review', description: 'Legal team review' },
                    { name: 'Approval', description: 'Final approval' },
                    { name: 'Distribution', description: 'Document distribution' }
                ]
            },
            {
                type: 'billing-cycle',
                name: 'Billing Cycle',
                description: 'Monthly billing and invoicing workflow',
                steps: [
                    { name: 'Time Entry Review', description: 'Review and approve time entries' },
                    { name: 'Invoice Generation', description: 'Generate draft invoices' },
                    { name: 'Review', description: 'Partner review of invoices' },
                    { name: 'Client Delivery', description: 'Send invoices to clients' },
                    { name: 'Follow-up', description: 'Payment follow-up' },
                    { name: 'Collection', description: 'Collection activities if needed' }
                ]
            }
        ];

        res.json({
            success: true,
            data: presets
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /presets/:presetType - Get specific workflow preset
 */
router.get('/presets/:presetType', async (req, res, next) => {
    try {
        const { presetType } = req.params;

        const presets = {
            'case-management': {
                type: 'case-management',
                name: 'Case Management',
                description: 'Standard workflow for legal case management',
                category: 'legal',
                steps: [
                    { name: 'Intake', description: 'Initial client consultation and case assessment', durationDays: 3 },
                    { name: 'Research', description: 'Legal research and document gathering', durationDays: 7 },
                    { name: 'Preparation', description: 'Case preparation and strategy', durationDays: 14 },
                    { name: 'Filing', description: 'Court filings and submissions', durationDays: 5 },
                    { name: 'Discovery', description: 'Discovery process and evidence collection', durationDays: 30 },
                    { name: 'Resolution', description: 'Settlement, trial, or case closure', durationDays: 14 }
                ]
            },
            'client-onboarding': {
                type: 'client-onboarding',
                name: 'Client Onboarding',
                description: 'New client onboarding process',
                category: 'sales',
                steps: [
                    { name: 'Initial Contact', description: 'First contact and inquiry', durationDays: 1 },
                    { name: 'Consultation', description: 'Initial consultation meeting', durationDays: 3 },
                    { name: 'KYC/Verification', description: 'Identity verification', durationDays: 5 },
                    { name: 'Agreement', description: 'Engagement letter and fee agreement', durationDays: 7 },
                    { name: 'Setup', description: 'System setup and access provisioning', durationDays: 2 },
                    { name: 'Welcome', description: 'Welcome package and orientation', durationDays: 1 }
                ]
            }
        };

        const preset = presets[presetType];
        if (!preset) {
            throw CustomException('Preset not found', 404);
        }

        res.json({
            success: true,
            data: preset
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /stats - Get workflow statistics
 */
router.get('/stats', async (req, res, next) => {
    try {
        const { dateFrom, dateTo } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('workflows.instances workflows.templates').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let instances = firm.workflows?.instances || [];

        // Filter by date range if provided
        if (dateFrom || dateTo) {
            const fromDate = dateFrom ? new Date(dateFrom) : new Date('1970-01-01');
            const toDate = dateTo ? new Date(dateTo) : new Date();
            instances = instances.filter(i => {
                const created = new Date(i.createdAt);
                return created >= fromDate && created <= toDate;
            });
        }

        // Calculate statistics
        const statusCounts = {};
        const templateCounts = {};
        let totalDuration = 0;
        let completedCount = 0;

        for (const instance of instances) {
            // By status
            statusCounts[instance.status] = (statusCounts[instance.status] || 0) + 1;

            // By template
            const templateId = instance.workflowId?.toString() || 'unknown';
            templateCounts[templateId] = (templateCounts[templateId] || 0) + 1;

            // Duration for completed workflows
            if (instance.status === 'completed' && instance.completedAt && instance.createdAt) {
                totalDuration += new Date(instance.completedAt) - new Date(instance.createdAt);
                completedCount++;
            }
        }

        // Enrich template counts with names
        const templates = firm.workflows?.templates || [];
        const byTemplate = Object.entries(templateCounts).map(([id, count]) => {
            const template = templates.find(t => t._id?.toString() === id);
            return {
                templateId: id,
                templateName: template?.name || 'Unknown',
                count
            };
        });

        const avgDurationMs = completedCount > 0 ? totalDuration / completedCount : 0;

        res.json({
            success: true,
            data: {
                total: instances.length,
                active: statusCounts.active || 0,
                paused: statusCounts.paused || 0,
                completed: statusCounts.completed || 0,
                cancelled: statusCounts.cancelled || 0,
                byStatus: statusCounts,
                byTemplate,
                averageCompletionDays: Math.round(avgDurationMs / (1000 * 60 * 60 * 24) * 10) / 10,
                completionRate: instances.length > 0
                    ? Math.round(((statusCounts.completed || 0) / instances.length) * 100)
                    : 0
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /category/:category - Get workflows by category
 */
router.get('/category/:category', async (req, res, next) => {
    try {
        const { category } = req.params;
        const { page, limit, skip } = sanitizePagination(req.query.page, req.query.limit);

        if (!VALID_CATEGORIES.includes(category)) {
            throw CustomException(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`, 400);
        }

        const firm = await Firm.findOne(req.firmQuery).select('workflows.templates').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let templates = (firm.workflows?.templates || []).filter(t => t.category === category);

        const total = templates.length;
        const paginatedTemplates = templates.slice(skip, skip + limit);

        res.json({
            success: true,
            data: paginatedTemplates,
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
 * POST /cases/:caseId/initialize - Initialize workflow for a case
 */
router.post('/cases/:caseId/initialize', async (req, res, next) => {
    try {
        const caseId = sanitizeObjectId(req.params.caseId, 'caseId');
        const { workflowId, templateId } = req.body;

        // Verify case exists
        const caseDoc = await Case.findOne({ _id: caseId, ...req.firmQuery });
        if (!caseDoc) {
            throw CustomException('Case not found', 404);
        }

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        // Get workflow template
        const templateIdToUse = workflowId || templateId;
        if (!templateIdToUse) {
            throw CustomException('Workflow or template ID is required', 400);
        }

        const template = (firm.workflows?.templates || []).find(
            t => t._id?.toString() === templateIdToUse.toString()
        );

        if (!template) {
            throw CustomException('Workflow template not found', 404);
        }

        // Check if case already has an active workflow
        const existingInstance = (firm.workflows?.instances || []).find(
            i => i.entityId?.toString() === caseId.toString() &&
                i.entityType === 'case' &&
                i.status === 'active'
        );

        if (existingInstance) {
            throw CustomException('Case already has an active workflow', 400);
        }

        // Create workflow instance
        if (!firm.workflows) firm.workflows = {};
        if (!firm.workflows.instances) firm.workflows.instances = [];

        const firstStep = template.steps?.[0];
        const instance = {
            _id: new mongoose.Types.ObjectId(),
            workflowId: template._id,
            name: `${template.name} - ${caseDoc.title || caseDoc.caseNumber}`,
            entityType: 'case',
            entityId: caseId,
            status: 'active',
            currentStepId: firstStep?._id,
            currentStepName: firstStep?.name,
            stepHistory: [],
            createdBy: req.userID,
            createdAt: new Date()
        };

        firm.workflows.instances.push(instance);

        // Update case with workflow reference
        caseDoc.workflowInstanceId = instance._id;
        await Promise.all([firm.save(), caseDoc.save()]);

        res.status(201).json({
            success: true,
            message: 'Workflow initialized for case',
            data: instance
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /cases/:caseId/move - Move case to a different workflow step
 */
router.post('/cases/:caseId/move', async (req, res, next) => {
    try {
        const caseId = sanitizeObjectId(req.params.caseId, 'caseId');
        const { stepId, notes } = req.body;

        if (!stepId) {
            throw CustomException('Target step ID is required', 400);
        }

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const instanceIndex = (firm.workflows?.instances || []).findIndex(
            i => i.entityId?.toString() === caseId.toString() &&
                i.entityType === 'case' &&
                i.status === 'active'
        );

        if (instanceIndex === -1) {
            throw CustomException('No active workflow found for this case', 404);
        }

        const instance = firm.workflows.instances[instanceIndex];

        // Get template to validate step
        const template = (firm.workflows?.templates || []).find(
            t => t._id?.toString() === instance.workflowId?.toString()
        );

        if (!template) {
            throw CustomException('Workflow template not found', 404);
        }

        const targetStep = template.steps?.find(s => s._id?.toString() === stepId);
        if (!targetStep) {
            throw CustomException('Target step not found in workflow', 400);
        }

        // Record step change
        if (!instance.stepHistory) instance.stepHistory = [];
        instance.stepHistory.push({
            stepId: instance.currentStepId,
            movedTo: targetStep._id,
            movedAt: new Date(),
            movedBy: req.userID,
            notes
        });

        instance.currentStepId = targetStep._id;
        instance.currentStepName = targetStep.name;
        instance.updatedAt = new Date();

        firm.workflows.instances[instanceIndex] = instance;
        await firm.save();

        res.json({
            success: true,
            message: 'Case moved to new workflow step',
            data: instance
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /cases/:caseId/progress - Get case workflow progress
 */
router.get('/cases/:caseId/progress', async (req, res, next) => {
    try {
        const caseId = sanitizeObjectId(req.params.caseId, 'caseId');

        const firm = await Firm.findOne(req.firmQuery).select('workflows.instances workflows.templates').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const instance = (firm.workflows?.instances || []).find(
            i => i.entityId?.toString() === caseId.toString() && i.entityType === 'case'
        );

        if (!instance) {
            return res.json({
                success: true,
                data: null,
                message: 'No workflow found for this case'
            });
        }

        // Get template
        const template = (firm.workflows?.templates || []).find(
            t => t._id?.toString() === instance.workflowId?.toString()
        );

        if (!template) {
            throw CustomException('Workflow template not found', 404);
        }

        // Calculate progress
        const totalSteps = template.steps?.length || 1;
        const currentStepIndex = template.steps?.findIndex(
            s => s._id?.toString() === instance.currentStepId?.toString()
        ) ?? 0;
        const completedSteps = instance.stepHistory?.length || 0;
        const progressPercentage = Math.round(((currentStepIndex + 1) / totalSteps) * 100);

        res.json({
            success: true,
            data: {
                instance,
                template: {
                    name: template.name,
                    totalSteps,
                    steps: template.steps
                },
                progress: {
                    currentStep: currentStepIndex + 1,
                    totalSteps,
                    completedSteps,
                    percentage: progressPercentage,
                    remainingSteps: totalSteps - currentStepIndex - 1
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /cases/:caseId/requirements/:requirementId/complete - Complete a workflow requirement
 */
router.post('/cases/:caseId/requirements/:requirementId/complete', async (req, res, next) => {
    try {
        const caseId = sanitizeObjectId(req.params.caseId, 'caseId');
        const { requirementId } = req.params;
        const { notes, evidence } = req.body;

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const instanceIndex = (firm.workflows?.instances || []).findIndex(
            i => i.entityId?.toString() === caseId.toString() && i.entityType === 'case'
        );

        if (instanceIndex === -1) {
            throw CustomException('No workflow found for this case', 404);
        }

        const instance = firm.workflows.instances[instanceIndex];

        // Get template to find requirement
        const template = (firm.workflows?.templates || []).find(
            t => t._id?.toString() === instance.workflowId?.toString()
        );

        // Find current step
        const currentStep = template?.steps?.find(
            s => s._id?.toString() === instance.currentStepId?.toString()
        );

        if (!currentStep) {
            throw CustomException('Current workflow step not found', 404);
        }

        // Find requirement in current step
        const requirement = currentStep.requirements?.find(
            r => r._id?.toString() === requirementId || r.id === requirementId
        );

        if (!requirement) {
            throw CustomException('Requirement not found in current step', 404);
        }

        // Track completed requirements
        if (!instance.completedRequirements) instance.completedRequirements = [];
        instance.completedRequirements.push({
            requirementId,
            stepId: instance.currentStepId,
            completedAt: new Date(),
            completedBy: req.userID,
            notes,
            evidence
        });

        firm.workflows.instances[instanceIndex] = instance;
        await firm.save();

        res.json({
            success: true,
            message: 'Requirement completed',
            data: {
                requirementId,
                completedAt: new Date()
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
