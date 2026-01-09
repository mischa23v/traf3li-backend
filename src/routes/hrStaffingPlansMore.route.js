/**
 * HR Staffing Plans More Routes
 *
 * Additional staffing plan operations - close, active, department queries.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - POST /:planId/close              - Close staffing plan
 * - GET /active                      - Get active plans
 * - GET /department/:departmentId    - Get plans by department
 * - POST /:planId/bulk-update-details - Bulk update plan details
 * - POST /:planId/export             - Export plan data
 * - GET /templates                   - Get plan templates
 * - POST /from-template/:templateId  - Create plan from template
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Allowed fields for bulk detail updates
const ALLOWED_DETAIL_UPDATE_FIELDS = [
    'headcount', 'salaryBudget', 'priority', 'status', 'notes', 'targetDate'
];

/**
 * POST /:planId/close - Close staffing plan
 */
router.post('/:planId/close', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');
        const { reason, finalNotes, archiveJobOpenings } = req.body;

        const firm = await Firm.findOne(req.firmQuery).select('hr.staffingPlans hr.jobOpenings');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const plan = (firm.hr?.staffingPlans || []).find(
            p => p._id?.toString() === planId.toString()
        );

        if (!plan) {
            throw CustomException('Staffing plan not found', 404);
        }

        if (plan.status === 'closed') {
            throw CustomException('Plan is already closed', 400);
        }

        // Update plan status
        const previousStatus = plan.status;
        plan.status = 'closed';
        plan.closedAt = new Date();
        plan.closedBy = req.userID;
        plan.closeReason = reason;
        plan.finalNotes = finalNotes;

        // Track status history
        if (!plan.statusHistory) plan.statusHistory = [];
        plan.statusHistory.push({
            status: 'closed',
            previousStatus,
            changedAt: new Date(),
            changedBy: req.userID,
            reason
        });

        // Optionally archive linked job openings
        let archivedOpenings = 0;
        if (archiveJobOpenings) {
            const linkedIds = new Set();
            (plan.details || []).forEach(d => {
                (d.linkedJobOpenings || []).forEach(id => linkedIds.add(id.toString()));
            });

            (firm.hr?.jobOpenings || []).forEach(jo => {
                if (linkedIds.has(jo._id?.toString()) && jo.status === 'open') {
                    jo.status = 'closed';
                    jo.closedAt = new Date();
                    jo.closeReason = 'Staffing plan closed';
                    archivedOpenings++;
                }
            });
        }

        await firm.save();

        res.json({
            success: true,
            message: 'Staffing plan closed',
            data: {
                planId,
                status: 'closed',
                closedAt: plan.closedAt,
                archivedJobOpenings: archivedOpenings
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /active - Get active plans
 */
router.get('/active', async (req, res, next) => {
    try {
        const { fiscalYear, department } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('hr.staffingPlans').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let plans = (firm.hr?.staffingPlans || []).filter(
            p => ['active', 'approved', 'in_progress'].includes(p.status)
        );

        if (fiscalYear) {
            plans = plans.filter(p => p.fiscalYear === fiscalYear);
        }

        if (department) {
            plans = plans.filter(p =>
                (p.details || []).some(d => d.department === department)
            );
        }

        // Calculate summary for each plan
        const plansWithSummary = plans.map(plan => {
            const details = plan.details || [];
            return {
                ...plan,
                summary: {
                    totalHeadcount: details.reduce((s, d) => s + (d.headcount || 0), 0),
                    totalBudget: details.reduce((s, d) => s + (d.salaryBudget || 0), 0),
                    detailsCount: details.length,
                    departments: [...new Set(details.map(d => d.department).filter(Boolean))]
                }
            };
        });

        res.json({
            success: true,
            data: plansWithSummary,
            count: plansWithSummary.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /department/:departmentId - Get plans by department
 */
router.get('/department/:departmentId', async (req, res, next) => {
    try {
        const { departmentId } = req.params;
        const { status, fiscalYear } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('hr.staffingPlans').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let plans = (firm.hr?.staffingPlans || []).filter(p =>
            (p.details || []).some(d => d.department === departmentId)
        );

        if (status) {
            plans = plans.filter(p => p.status === status);
        }

        if (fiscalYear) {
            plans = plans.filter(p => p.fiscalYear === fiscalYear);
        }

        // Extract only relevant department details
        const plansWithDeptDetails = plans.map(plan => {
            const deptDetails = (plan.details || []).filter(d => d.department === departmentId);
            return {
                _id: plan._id,
                name: plan.name,
                fiscalYear: plan.fiscalYear,
                status: plan.status,
                departmentDetails: deptDetails,
                departmentSummary: {
                    totalHeadcount: deptDetails.reduce((s, d) => s + (d.headcount || 0), 0),
                    totalBudget: deptDetails.reduce((s, d) => s + (d.salaryBudget || 0), 0),
                    positionsCount: deptDetails.length
                }
            };
        });

        res.json({
            success: true,
            data: plansWithDeptDetails,
            count: plansWithDeptDetails.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:planId/bulk-update-details - Bulk update plan details
 */
router.post('/:planId/bulk-update-details', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');
        const { updates } = req.body;

        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            throw CustomException('Updates array is required', 400);
        }

        if (updates.length > 50) {
            throw CustomException('Maximum 50 updates per request', 400);
        }

        const firm = await Firm.findOne(req.firmQuery).select('hr.staffingPlans');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const plan = (firm.hr?.staffingPlans || []).find(
            p => p._id?.toString() === planId.toString()
        );

        if (!plan) {
            throw CustomException('Staffing plan not found', 404);
        }

        if (plan.status === 'closed') {
            throw CustomException('Cannot update closed plan', 400);
        }

        const results = {
            updated: [],
            notFound: [],
            errors: []
        };

        for (const update of updates) {
            try {
                if (!update.detailId) {
                    results.errors.push({ detailId: null, error: 'Detail ID is required' });
                    continue;
                }

                const safeDetailId = sanitizeObjectId(update.detailId, 'detailId');
                const detail = (plan.details || []).find(
                    d => d._id?.toString() === safeDetailId.toString()
                );

                if (!detail) {
                    results.notFound.push(update.detailId);
                    continue;
                }

                const safeUpdates = pickAllowedFields(update, ALLOWED_DETAIL_UPDATE_FIELDS);
                Object.assign(detail, safeUpdates);
                detail.updatedAt = new Date();
                detail.updatedBy = req.userID;

                results.updated.push(update.detailId);
            } catch (err) {
                results.errors.push({ detailId: update.detailId, error: err.message });
            }
        }

        if (results.updated.length > 0) {
            plan.lastModifiedAt = new Date();
            plan.lastModifiedBy = req.userID;
            await firm.save();
        }

        res.json({
            success: true,
            message: `Updated ${results.updated.length} detail(s)`,
            data: results
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:planId/export - Export plan data
 */
router.post('/:planId/export', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');
        const { format = 'json', includeHistory } = req.body;

        const firm = await Firm.findOne(req.firmQuery).select('hr.staffingPlans hr.jobOpenings').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const plan = (firm.hr?.staffingPlans || []).find(
            p => p._id?.toString() === planId.toString()
        );

        if (!plan) {
            throw CustomException('Staffing plan not found', 404);
        }

        // Prepare export data
        const exportData = {
            planInfo: {
                id: plan._id,
                name: plan.name,
                fiscalYear: plan.fiscalYear,
                status: plan.status,
                createdAt: plan.createdAt,
                approvedAt: plan.approvedAt
            },
            summary: {
                totalHeadcount: (plan.details || []).reduce((s, d) => s + (d.headcount || 0), 0),
                totalBudget: (plan.details || []).reduce((s, d) => s + (d.salaryBudget || 0), 0),
                detailsCount: (plan.details || []).length
            },
            details: (plan.details || []).map(d => ({
                department: d.department,
                jobFamily: d.jobFamily,
                jobTitle: d.jobTitle,
                location: d.location,
                headcount: d.headcount,
                currentHeadcount: d.currentHeadcount,
                vacancy: Math.max(0, (d.headcount || 0) - (d.currentHeadcount || 0)),
                salaryBudget: d.salaryBudget,
                priority: d.priority,
                status: d.status
            })),
            linkedJobOpenings: []
        };

        // Get linked job openings
        const linkedIds = new Set();
        (plan.details || []).forEach(d => {
            (d.linkedJobOpenings || []).forEach(id => linkedIds.add(id.toString()));
        });

        exportData.linkedJobOpenings = (firm.hr?.jobOpenings || [])
            .filter(jo => linkedIds.has(jo._id?.toString()))
            .map(jo => ({
                id: jo._id,
                title: jo.title,
                department: jo.department,
                status: jo.status,
                createdAt: jo.createdAt
            }));

        if (includeHistory && plan.statusHistory) {
            exportData.statusHistory = plan.statusHistory;
        }

        res.json({
            success: true,
            data: exportData,
            exportedAt: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /templates - Get plan templates
 */
router.get('/templates', async (req, res, next) => {
    try {
        const firm = await Firm.findOne(req.firmQuery).select('hr.staffingPlanTemplates').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const templates = firm.hr?.staffingPlanTemplates || [];

        res.json({
            success: true,
            data: templates,
            count: templates.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /from-template/:templateId - Create plan from template
 */
router.post('/from-template/:templateId', async (req, res, next) => {
    try {
        const templateId = sanitizeObjectId(req.params.templateId, 'templateId');
        const { name, fiscalYear, adjustments } = req.body;

        if (!name) {
            throw CustomException('Plan name is required', 400);
        }

        if (!fiscalYear) {
            throw CustomException('Fiscal year is required', 400);
        }

        const firm = await Firm.findOne(req.firmQuery).select('hr.staffingPlans hr.staffingPlanTemplates');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const template = (firm.hr?.staffingPlanTemplates || []).find(
            t => t._id?.toString() === templateId.toString()
        );

        if (!template) {
            throw CustomException('Template not found', 404);
        }

        if (!firm.hr.staffingPlans) firm.hr.staffingPlans = [];

        // Create plan from template
        const newPlan = {
            _id: new mongoose.Types.ObjectId(),
            name,
            fiscalYear,
            status: 'draft',
            createdFromTemplate: templateId,
            details: (template.details || []).map(d => ({
                _id: new mongoose.Types.ObjectId(),
                department: d.department,
                jobFamily: d.jobFamily,
                jobTitle: d.jobTitle,
                location: d.location,
                headcount: adjustments?.[d.department]?.headcount ?? d.headcount,
                salaryBudget: adjustments?.[d.department]?.salaryBudget ?? d.salaryBudget,
                priority: d.priority,
                linkedJobOpenings: []
            })),
            createdBy: req.userID,
            createdAt: new Date()
        };

        firm.hr.staffingPlans.push(newPlan);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Plan created from template',
            data: newPlan
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
