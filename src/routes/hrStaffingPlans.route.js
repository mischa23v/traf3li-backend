/**
 * HR Staffing Plans Routes
 *
 * Workforce planning and staffing management.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - GET /                           - Get all staffing plans
 * - GET /:planId                    - Get staffing plan by ID
 * - POST /                          - Create staffing plan
 * - PATCH /:planId                  - Update staffing plan
 * - DELETE /:planId                 - Delete staffing plan
 * - POST /:planId/positions         - Add position to plan
 * - PATCH /:planId/positions/:posId - Update position in plan
 * - DELETE /:planId/positions/:posId - Remove position from plan
 * - POST /:planId/approve           - Approve staffing plan
 * - POST /:planId/reject            - Reject staffing plan
 * - POST /:planId/submit            - Submit plan for approval
 * - POST /:planId/activate          - Activate staffing plan
 * - POST /:planId/archive           - Archive staffing plan
 * - POST /:planId/duplicate         - Duplicate staffing plan
 * - GET /:planId/progress           - Get plan progress
 * - GET /:planId/budget             - Get plan budget breakdown
 * - GET /:planId/timeline           - Get plan timeline
 * - GET /:planId/positions/open     - Get open positions
 * - GET /:planId/positions/filled   - Get filled positions
 * - POST /:planId/fill/:posId       - Mark position as filled
 * - POST /bulk-delete               - Bulk delete plans
 * - POST /bulk-archive              - Bulk archive plans
 * - GET /analytics                  - Get staffing analytics
 * - GET /forecast                   - Get workforce forecast
 * - GET /gaps                       - Get staffing gaps
 * - GET /export                     - Export staffing plans
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Allowed fields for staffing plans
const ALLOWED_PLAN_FIELDS = [
    'name', 'description', 'department', 'startDate', 'endDate',
    'budget', 'headcountTarget', 'fiscalYear', 'quarter', 'status',
    'priority', 'justification', 'approvers', 'metadata'
];

// Allowed fields for positions
const ALLOWED_POSITION_FIELDS = [
    'title', 'department', 'level', 'salaryRange', 'targetStartDate',
    'requiredSkills', 'preferredSkills', 'headcount', 'priority',
    'justification', 'reportingTo', 'employmentType', 'location', 'status'
];

// Valid statuses
const VALID_STATUSES = ['draft', 'pending', 'approved', 'rejected', 'active', 'completed', 'archived'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

/**
 * GET / - Get all staffing plans
 */
router.get('/', async (req, res, next) => {
    try {
        const { page, limit, skip } = sanitizePagination(req.query.page, req.query.limit);
        const { status, department, fiscalYear, search } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('hr.staffingPlans').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let plans = firm.hr?.staffingPlans || [];

        if (status) {
            plans = plans.filter(p => p.status === status);
        }
        if (department) {
            plans = plans.filter(p => p.department === department);
        }
        if (fiscalYear) {
            plans = plans.filter(p => p.fiscalYear === fiscalYear);
        }
        if (search) {
            const pattern = escapeRegex(search).toLowerCase();
            plans = plans.filter(p =>
                p.name?.toLowerCase().includes(pattern) ||
                p.description?.toLowerCase().includes(pattern)
            );
        }

        plans.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const total = plans.length;
        const paginatedPlans = plans.slice(skip, skip + limit);

        res.json({
            success: true,
            data: paginatedPlans,
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
 * GET /analytics - Get staffing analytics
 */
router.get('/analytics', async (req, res, next) => {
    try {
        const { fiscalYear, department } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('hr.staffingPlans').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let plans = firm.hr?.staffingPlans || [];

        if (fiscalYear) {
            plans = plans.filter(p => p.fiscalYear === fiscalYear);
        }
        if (department) {
            plans = plans.filter(p => p.department === department);
        }

        const statusCounts = {};
        let totalBudget = 0;
        let totalHeadcount = 0;
        let totalPositions = 0;
        let filledPositions = 0;

        plans.forEach(plan => {
            statusCounts[plan.status] = (statusCounts[plan.status] || 0) + 1;
            totalBudget += plan.budget || 0;
            totalHeadcount += plan.headcountTarget || 0;

            (plan.positions || []).forEach(pos => {
                totalPositions += pos.headcount || 1;
                if (pos.status === 'filled') {
                    filledPositions += pos.headcount || 1;
                }
            });
        });

        res.json({
            success: true,
            data: {
                totalPlans: plans.length,
                byStatus: statusCounts,
                totalBudget,
                totalHeadcount,
                positions: {
                    total: totalPositions,
                    filled: filledPositions,
                    open: totalPositions - filledPositions,
                    fillRate: totalPositions > 0
                        ? Math.round((filledPositions / totalPositions) * 100)
                        : 0
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /forecast - Get workforce forecast
 */
router.get('/forecast', async (req, res, next) => {
    try {
        const { months = 12 } = req.query;
        const numMonths = Math.min(parseInt(months) || 12, 24);

        const firm = await Firm.findOne(req.firmQuery).select('hr.staffingPlans hr.employees').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const plans = (firm.hr?.staffingPlans || []).filter(p =>
            ['approved', 'active'].includes(p.status)
        );
        const currentEmployees = (firm.hr?.employees || []).length;

        const forecast = [];
        const now = new Date();

        for (let i = 0; i < numMonths; i++) {
            const month = new Date(now.getFullYear(), now.getMonth() + i, 1);
            let projectedHires = 0;

            plans.forEach(plan => {
                (plan.positions || []).forEach(pos => {
                    if (pos.status === 'open' && pos.targetStartDate) {
                        const targetDate = new Date(pos.targetStartDate);
                        if (targetDate.getMonth() === month.getMonth() &&
                            targetDate.getFullYear() === month.getFullYear()) {
                            projectedHires += pos.headcount || 1;
                        }
                    }
                });
            });

            forecast.push({
                month: month.toISOString().slice(0, 7),
                projectedHires,
                cumulativeTotal: currentEmployees + forecast.reduce((sum, f) => sum + f.projectedHires, 0) + projectedHires
            });
        }

        res.json({
            success: true,
            data: {
                currentHeadcount: currentEmployees,
                forecast
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /gaps - Get staffing gaps analysis
 */
router.get('/gaps', async (req, res, next) => {
    try {
        const { department } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('hr.staffingPlans hr.employees').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const plans = (firm.hr?.staffingPlans || []).filter(p =>
            ['approved', 'active'].includes(p.status)
        );

        const gaps = [];
        const departmentGaps = {};

        plans.forEach(plan => {
            if (department && plan.department !== department) return;

            (plan.positions || []).filter(pos => pos.status === 'open').forEach(pos => {
                gaps.push({
                    planId: plan._id,
                    planName: plan.name,
                    department: plan.department,
                    position: pos.title,
                    headcount: pos.headcount || 1,
                    priority: pos.priority || 'medium',
                    targetStartDate: pos.targetStartDate,
                    daysOverdue: pos.targetStartDate
                        ? Math.max(0, Math.floor((Date.now() - new Date(pos.targetStartDate)) / (1000 * 60 * 60 * 24)))
                        : 0
                });

                const dept = plan.department || 'Unknown';
                departmentGaps[dept] = (departmentGaps[dept] || 0) + (pos.headcount || 1);
            });
        });

        gaps.sort((a, b) => {
            const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
            return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
        });

        res.json({
            success: true,
            data: {
                totalGaps: gaps.reduce((sum, g) => sum + g.headcount, 0),
                byDepartment: departmentGaps,
                gaps
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /export - Export staffing plans
 */
router.get('/export', async (req, res, next) => {
    try {
        const { format = 'json', status, fiscalYear } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('hr.staffingPlans').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let plans = firm.hr?.staffingPlans || [];

        if (status) {
            plans = plans.filter(p => p.status === status);
        }
        if (fiscalYear) {
            plans = plans.filter(p => p.fiscalYear === fiscalYear);
        }

        if (format === 'csv') {
            const headers = ['Name', 'Department', 'Status', 'Budget', 'Headcount Target', 'Fiscal Year', 'Start Date', 'End Date'];
            const csvRows = [headers.join(',')];

            for (const plan of plans) {
                const row = [
                    `"${(plan.name || '').replace(/"/g, '""')}"`,
                    plan.department || '',
                    plan.status || '',
                    plan.budget || 0,
                    plan.headcountTarget || 0,
                    plan.fiscalYear || '',
                    plan.startDate ? new Date(plan.startDate).toISOString().slice(0, 10) : '',
                    plan.endDate ? new Date(plan.endDate).toISOString().slice(0, 10) : ''
                ];
                csvRows.push(row.join(','));
            }

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=staffing-plans.csv');
            return res.send(csvRows.join('\n'));
        }

        res.json({
            success: true,
            data: plans,
            exportedAt: new Date(),
            count: plans.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:planId - Get staffing plan by ID
 */
router.get('/:planId', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');

        const firm = await Firm.findOne(req.firmQuery).select('hr.staffingPlans').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const plan = (firm.hr?.staffingPlans || []).find(
            p => p._id?.toString() === planId.toString()
        );

        if (!plan) {
            throw CustomException('Staffing plan not found', 404);
        }

        res.json({
            success: true,
            data: plan
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:planId/progress - Get plan progress
 */
router.get('/:planId/progress', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');

        const firm = await Firm.findOne(req.firmQuery).select('hr.staffingPlans').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const plan = (firm.hr?.staffingPlans || []).find(
            p => p._id?.toString() === planId.toString()
        );

        if (!plan) {
            throw CustomException('Staffing plan not found', 404);
        }

        const positions = plan.positions || [];
        const totalPositions = positions.reduce((sum, pos) => sum + (pos.headcount || 1), 0);
        const filledPositions = positions
            .filter(pos => pos.status === 'filled')
            .reduce((sum, pos) => sum + (pos.headcount || 1), 0);

        const byDepartment = {};
        positions.forEach(pos => {
            const dept = pos.department || 'Unknown';
            if (!byDepartment[dept]) {
                byDepartment[dept] = { total: 0, filled: 0 };
            }
            byDepartment[dept].total += pos.headcount || 1;
            if (pos.status === 'filled') {
                byDepartment[dept].filled += pos.headcount || 1;
            }
        });

        res.json({
            success: true,
            data: {
                planId: plan._id,
                planName: plan.name,
                progress: {
                    total: totalPositions,
                    filled: filledPositions,
                    open: totalPositions - filledPositions,
                    percentage: totalPositions > 0
                        ? Math.round((filledPositions / totalPositions) * 100)
                        : 0
                },
                byDepartment,
                timeline: {
                    startDate: plan.startDate,
                    endDate: plan.endDate,
                    daysRemaining: plan.endDate
                        ? Math.max(0, Math.ceil((new Date(plan.endDate) - Date.now()) / (1000 * 60 * 60 * 24)))
                        : null
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:planId/budget - Get plan budget breakdown
 */
router.get('/:planId/budget', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');

        const firm = await Firm.findOne(req.firmQuery).select('hr.staffingPlans').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const plan = (firm.hr?.staffingPlans || []).find(
            p => p._id?.toString() === planId.toString()
        );

        if (!plan) {
            throw CustomException('Staffing plan not found', 404);
        }

        const positions = plan.positions || [];
        let allocatedBudget = 0;
        const byPosition = [];

        positions.forEach(pos => {
            const avgSalary = pos.salaryRange
                ? (pos.salaryRange.min + pos.salaryRange.max) / 2
                : 0;
            const positionCost = avgSalary * (pos.headcount || 1);
            allocatedBudget += positionCost;

            byPosition.push({
                title: pos.title,
                headcount: pos.headcount || 1,
                salaryRange: pos.salaryRange,
                estimatedCost: positionCost,
                status: pos.status
            });
        });

        res.json({
            success: true,
            data: {
                planId: plan._id,
                planName: plan.name,
                totalBudget: plan.budget || 0,
                allocatedBudget,
                remainingBudget: (plan.budget || 0) - allocatedBudget,
                utilizationRate: plan.budget > 0
                    ? Math.round((allocatedBudget / plan.budget) * 100)
                    : 0,
                byPosition
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:planId/timeline - Get plan timeline
 */
router.get('/:planId/timeline', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');

        const firm = await Firm.findOne(req.firmQuery).select('hr.staffingPlans').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const plan = (firm.hr?.staffingPlans || []).find(
            p => p._id?.toString() === planId.toString()
        );

        if (!plan) {
            throw CustomException('Staffing plan not found', 404);
        }

        const positions = plan.positions || [];
        const milestones = [];

        positions
            .filter(pos => pos.targetStartDate)
            .sort((a, b) => new Date(a.targetStartDate) - new Date(b.targetStartDate))
            .forEach(pos => {
                milestones.push({
                    date: pos.targetStartDate,
                    type: 'position_target',
                    title: pos.title,
                    headcount: pos.headcount || 1,
                    status: pos.status
                });
            });

        res.json({
            success: true,
            data: {
                planId: plan._id,
                planName: plan.name,
                planStartDate: plan.startDate,
                planEndDate: plan.endDate,
                milestones
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:planId/positions/open - Get open positions
 */
router.get('/:planId/positions/open', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');

        const firm = await Firm.findOne(req.firmQuery).select('hr.staffingPlans').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const plan = (firm.hr?.staffingPlans || []).find(
            p => p._id?.toString() === planId.toString()
        );

        if (!plan) {
            throw CustomException('Staffing plan not found', 404);
        }

        const openPositions = (plan.positions || []).filter(pos => pos.status === 'open');

        res.json({
            success: true,
            data: openPositions,
            count: openPositions.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:planId/positions/filled - Get filled positions
 */
router.get('/:planId/positions/filled', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');

        const firm = await Firm.findOne(req.firmQuery).select('hr.staffingPlans').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const plan = (firm.hr?.staffingPlans || []).find(
            p => p._id?.toString() === planId.toString()
        );

        if (!plan) {
            throw CustomException('Staffing plan not found', 404);
        }

        const filledPositions = (plan.positions || []).filter(pos => pos.status === 'filled');

        res.json({
            success: true,
            data: filledPositions,
            count: filledPositions.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST / - Create staffing plan
 */
router.post('/', async (req, res, next) => {
    try {
        const safeData = pickAllowedFields(req.body, ALLOWED_PLAN_FIELDS);

        if (!safeData.name) {
            throw CustomException('Plan name is required', 400);
        }

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        if (!firm.hr) firm.hr = {};
        if (!firm.hr.staffingPlans) firm.hr.staffingPlans = [];

        const plan = {
            _id: new mongoose.Types.ObjectId(),
            ...safeData,
            status: 'draft',
            positions: [],
            createdBy: req.userID,
            createdAt: new Date()
        };

        firm.hr.staffingPlans.push(plan);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Staffing plan created',
            data: plan
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /:planId - Update staffing plan
 */
router.patch('/:planId', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');
        const safeData = pickAllowedFields(req.body, ALLOWED_PLAN_FIELDS);

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const planIndex = (firm.hr?.staffingPlans || []).findIndex(
            p => p._id?.toString() === planId.toString()
        );

        if (planIndex === -1) {
            throw CustomException('Staffing plan not found', 404);
        }

        Object.assign(firm.hr.staffingPlans[planIndex], safeData, {
            updatedBy: req.userID,
            updatedAt: new Date()
        });

        await firm.save();

        res.json({
            success: true,
            message: 'Staffing plan updated',
            data: firm.hr.staffingPlans[planIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:planId - Delete staffing plan
 */
router.delete('/:planId', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const planIndex = (firm.hr?.staffingPlans || []).findIndex(
            p => p._id?.toString() === planId.toString()
        );

        if (planIndex === -1) {
            throw CustomException('Staffing plan not found', 404);
        }

        firm.hr.staffingPlans.splice(planIndex, 1);
        await firm.save();

        res.json({
            success: true,
            message: 'Staffing plan deleted'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:planId/positions - Add position to plan
 */
router.post('/:planId/positions', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');
        const safeData = pickAllowedFields(req.body, ALLOWED_POSITION_FIELDS);

        if (!safeData.title) {
            throw CustomException('Position title is required', 400);
        }

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const plan = (firm.hr?.staffingPlans || []).find(
            p => p._id?.toString() === planId.toString()
        );

        if (!plan) {
            throw CustomException('Staffing plan not found', 404);
        }

        const position = {
            _id: new mongoose.Types.ObjectId(),
            ...safeData,
            status: 'open',
            createdAt: new Date()
        };

        if (!plan.positions) plan.positions = [];
        plan.positions.push(position);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Position added to plan',
            data: position
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /:planId/positions/:posId - Update position in plan
 */
router.patch('/:planId/positions/:posId', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');
        const posId = sanitizeObjectId(req.params.posId, 'posId');
        const safeData = pickAllowedFields(req.body, ALLOWED_POSITION_FIELDS);

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const plan = (firm.hr?.staffingPlans || []).find(
            p => p._id?.toString() === planId.toString()
        );

        if (!plan) {
            throw CustomException('Staffing plan not found', 404);
        }

        const posIndex = (plan.positions || []).findIndex(
            pos => pos._id?.toString() === posId.toString()
        );

        if (posIndex === -1) {
            throw CustomException('Position not found', 404);
        }

        Object.assign(plan.positions[posIndex], safeData, {
            updatedAt: new Date()
        });

        await firm.save();

        res.json({
            success: true,
            message: 'Position updated',
            data: plan.positions[posIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:planId/positions/:posId - Remove position from plan
 */
router.delete('/:planId/positions/:posId', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');
        const posId = sanitizeObjectId(req.params.posId, 'posId');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const plan = (firm.hr?.staffingPlans || []).find(
            p => p._id?.toString() === planId.toString()
        );

        if (!plan) {
            throw CustomException('Staffing plan not found', 404);
        }

        const posIndex = (plan.positions || []).findIndex(
            pos => pos._id?.toString() === posId.toString()
        );

        if (posIndex === -1) {
            throw CustomException('Position not found', 404);
        }

        plan.positions.splice(posIndex, 1);
        await firm.save();

        res.json({
            success: true,
            message: 'Position removed from plan'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:planId/approve - Approve staffing plan
 */
router.post('/:planId/approve', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');
        const { comments } = req.body;

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const plan = (firm.hr?.staffingPlans || []).find(
            p => p._id?.toString() === planId.toString()
        );

        if (!plan) {
            throw CustomException('Staffing plan not found', 404);
        }

        if (plan.status !== 'pending') {
            throw CustomException('Plan must be pending approval', 400);
        }

        plan.status = 'approved';
        plan.approvedBy = req.userID;
        plan.approvedAt = new Date();
        plan.approvalComments = comments;
        plan.updatedAt = new Date();

        await firm.save();

        res.json({
            success: true,
            message: 'Staffing plan approved',
            data: plan
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:planId/reject - Reject staffing plan
 */
router.post('/:planId/reject', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');
        const { reason } = req.body;

        if (!reason) {
            throw CustomException('Rejection reason is required', 400);
        }

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const plan = (firm.hr?.staffingPlans || []).find(
            p => p._id?.toString() === planId.toString()
        );

        if (!plan) {
            throw CustomException('Staffing plan not found', 404);
        }

        if (plan.status !== 'pending') {
            throw CustomException('Plan must be pending approval', 400);
        }

        plan.status = 'rejected';
        plan.rejectedBy = req.userID;
        plan.rejectedAt = new Date();
        plan.rejectionReason = reason;
        plan.updatedAt = new Date();

        await firm.save();

        res.json({
            success: true,
            message: 'Staffing plan rejected',
            data: plan
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:planId/submit - Submit plan for approval
 */
router.post('/:planId/submit', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const plan = (firm.hr?.staffingPlans || []).find(
            p => p._id?.toString() === planId.toString()
        );

        if (!plan) {
            throw CustomException('Staffing plan not found', 404);
        }

        if (plan.status !== 'draft' && plan.status !== 'rejected') {
            throw CustomException('Plan must be in draft or rejected status', 400);
        }

        plan.status = 'pending';
        plan.submittedBy = req.userID;
        plan.submittedAt = new Date();
        plan.updatedAt = new Date();

        await firm.save();

        res.json({
            success: true,
            message: 'Staffing plan submitted for approval',
            data: plan
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:planId/activate - Activate staffing plan
 */
router.post('/:planId/activate', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const plan = (firm.hr?.staffingPlans || []).find(
            p => p._id?.toString() === planId.toString()
        );

        if (!plan) {
            throw CustomException('Staffing plan not found', 404);
        }

        if (plan.status !== 'approved') {
            throw CustomException('Plan must be approved first', 400);
        }

        plan.status = 'active';
        plan.activatedBy = req.userID;
        plan.activatedAt = new Date();
        plan.updatedAt = new Date();

        await firm.save();

        res.json({
            success: true,
            message: 'Staffing plan activated',
            data: plan
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:planId/archive - Archive staffing plan
 */
router.post('/:planId/archive', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const plan = (firm.hr?.staffingPlans || []).find(
            p => p._id?.toString() === planId.toString()
        );

        if (!plan) {
            throw CustomException('Staffing plan not found', 404);
        }

        plan.status = 'archived';
        plan.archivedBy = req.userID;
        plan.archivedAt = new Date();
        plan.updatedAt = new Date();

        await firm.save();

        res.json({
            success: true,
            message: 'Staffing plan archived',
            data: plan
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:planId/duplicate - Duplicate staffing plan
 */
router.post('/:planId/duplicate', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const originalPlan = (firm.hr?.staffingPlans || []).find(
            p => p._id?.toString() === planId.toString()
        );

        if (!originalPlan) {
            throw CustomException('Staffing plan not found', 404);
        }

        const newPlan = {
            ...JSON.parse(JSON.stringify(originalPlan)),
            _id: new mongoose.Types.ObjectId(),
            name: `${originalPlan.name} (Copy)`,
            status: 'draft',
            createdBy: req.userID,
            createdAt: new Date(),
            approvedBy: null,
            approvedAt: null,
            submittedBy: null,
            submittedAt: null
        };

        // Regenerate position IDs
        if (newPlan.positions) {
            newPlan.positions = newPlan.positions.map(pos => ({
                ...pos,
                _id: new mongoose.Types.ObjectId(),
                status: 'open'
            }));
        }

        firm.hr.staffingPlans.push(newPlan);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Staffing plan duplicated',
            data: newPlan
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:planId/fill/:posId - Mark position as filled
 */
router.post('/:planId/fill/:posId', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');
        const posId = sanitizeObjectId(req.params.posId, 'posId');
        const { employeeId, startDate } = req.body;

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const plan = (firm.hr?.staffingPlans || []).find(
            p => p._id?.toString() === planId.toString()
        );

        if (!plan) {
            throw CustomException('Staffing plan not found', 404);
        }

        const position = (plan.positions || []).find(
            pos => pos._id?.toString() === posId.toString()
        );

        if (!position) {
            throw CustomException('Position not found', 404);
        }

        position.status = 'filled';
        position.filledBy = employeeId ? sanitizeObjectId(employeeId, 'employeeId') : null;
        position.filledAt = new Date();
        position.actualStartDate = startDate ? new Date(startDate) : new Date();
        position.updatedAt = new Date();

        await firm.save();

        res.json({
            success: true,
            message: 'Position marked as filled',
            data: position
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /bulk-delete - Bulk delete plans
 */
router.post('/bulk-delete', async (req, res, next) => {
    try {
        const { planIds } = req.body;

        if (!Array.isArray(planIds) || planIds.length === 0) {
            throw CustomException('Plan IDs array is required', 400);
        }

        if (planIds.length > 50) {
            throw CustomException('Maximum 50 plans per request', 400);
        }

        const sanitizedIds = planIds.map(id => sanitizeObjectId(id, 'planId').toString());

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const initialCount = (firm.hr?.staffingPlans || []).length;
        firm.hr.staffingPlans = (firm.hr?.staffingPlans || []).filter(
            p => !sanitizedIds.includes(p._id?.toString())
        );
        const deletedCount = initialCount - firm.hr.staffingPlans.length;

        await firm.save();

        res.json({
            success: true,
            message: `Deleted ${deletedCount} staffing plans`,
            deleted: deletedCount
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /bulk-archive - Bulk archive plans
 */
router.post('/bulk-archive', async (req, res, next) => {
    try {
        const { planIds } = req.body;

        if (!Array.isArray(planIds) || planIds.length === 0) {
            throw CustomException('Plan IDs array is required', 400);
        }

        if (planIds.length > 50) {
            throw CustomException('Maximum 50 plans per request', 400);
        }

        const sanitizedIds = planIds.map(id => sanitizeObjectId(id, 'planId').toString());

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let archivedCount = 0;
        (firm.hr?.staffingPlans || []).forEach(plan => {
            if (sanitizedIds.includes(plan._id?.toString()) && plan.status !== 'archived') {
                plan.status = 'archived';
                plan.archivedBy = req.userID;
                plan.archivedAt = new Date();
                plan.updatedAt = new Date();
                archivedCount++;
            }
        });

        await firm.save();

        res.json({
            success: true,
            message: `Archived ${archivedCount} staffing plans`,
            archived: archivedCount
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
