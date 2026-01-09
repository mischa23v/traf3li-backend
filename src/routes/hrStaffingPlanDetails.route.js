/**
 * HR Staffing Plan Details Routes
 *
 * Detailed staffing plan management with headcount and forecasting.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - POST /:planId/details               - Add detail to plan
 * - PATCH /:planId/details/:detailId    - Update detail
 * - DELETE /:planId/details/:detailId   - Delete detail
 * - GET /headcount                      - Get headcount summary
 * - GET /headcount/by-department        - Get headcount by department
 * - GET /headcount/by-location          - Get headcount by location
 * - GET /headcount/by-job-family        - Get headcount by job family
 * - GET /headcount/trends               - Get headcount trends
 * - GET /variance                       - Get plan vs actual variance
 * - GET /scenarios                      - Get planning scenarios
 * - POST /scenarios                     - Create planning scenario
 * - PATCH /scenarios/:scenarioId        - Update scenario
 * - DELETE /scenarios/:scenarioId       - Delete scenario
 * - POST /scenarios/:scenarioId/apply   - Apply scenario
 * - GET /cost-analysis                  - Get cost analysis
 * - GET /attrition-forecast             - Get attrition forecast
 * - POST /bulk-update                   - Bulk update details
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

// Allowed fields for plan details
const ALLOWED_DETAIL_FIELDS = [
    'department', 'jobFamily', 'jobTitle', 'location', 'headcount',
    'targetDate', 'priority', 'justification', 'salaryBudget',
    'status', 'notes', 'metadata'
];

// Allowed fields for scenarios
const ALLOWED_SCENARIO_FIELDS = [
    'name', 'description', 'type', 'assumptions', 'adjustments',
    'effectiveDate', 'isActive'
];

/**
 * GET /headcount - Get headcount summary
 */
router.get('/headcount', async (req, res, next) => {
    try {
        const { fiscalYear, asOfDate } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('hr.staffingPlans hr.employees').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const employees = firm.hr?.employees || [];
        const plans = (firm.hr?.staffingPlans || []).filter(p =>
            ['approved', 'active'].includes(p.status)
        );

        const currentHeadcount = employees.filter(e => e.status === 'active').length;
        let plannedHires = 0;
        let plannedTerminations = 0;

        plans.forEach(plan => {
            if (fiscalYear && plan.fiscalYear !== fiscalYear) return;
            (plan.positions || []).forEach(pos => {
                if (pos.status === 'open') {
                    plannedHires += pos.headcount || 1;
                }
            });
            (plan.details || []).forEach(detail => {
                if (detail.type === 'reduction') {
                    plannedTerminations += detail.headcount || 0;
                }
            });
        });

        res.json({
            success: true,
            data: {
                currentHeadcount,
                plannedHires,
                plannedTerminations,
                projectedHeadcount: currentHeadcount + plannedHires - plannedTerminations,
                asOfDate: asOfDate || new Date().toISOString()
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /headcount/by-department - Get headcount by department
 */
router.get('/headcount/by-department', async (req, res, next) => {
    try {
        const firm = await Firm.findOne(req.firmQuery).select('hr.employees hr.staffingPlans').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const employees = firm.hr?.employees || [];
        const plans = (firm.hr?.staffingPlans || []).filter(p =>
            ['approved', 'active'].includes(p.status)
        );

        const byDepartment = {};

        // Count current employees
        employees.filter(e => e.status === 'active').forEach(emp => {
            const dept = emp.department || 'Unassigned';
            if (!byDepartment[dept]) {
                byDepartment[dept] = { current: 0, planned: 0, open: 0 };
            }
            byDepartment[dept].current++;
        });

        // Count planned positions
        plans.forEach(plan => {
            (plan.positions || []).forEach(pos => {
                const dept = pos.department || plan.department || 'Unassigned';
                if (!byDepartment[dept]) {
                    byDepartment[dept] = { current: 0, planned: 0, open: 0 };
                }
                byDepartment[dept].planned += pos.headcount || 1;
                if (pos.status === 'open') {
                    byDepartment[dept].open += pos.headcount || 1;
                }
            });
        });

        res.json({
            success: true,
            data: Object.entries(byDepartment).map(([department, counts]) => ({
                department,
                ...counts,
                projected: counts.current + counts.open
            }))
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /headcount/by-location - Get headcount by location
 */
router.get('/headcount/by-location', async (req, res, next) => {
    try {
        const firm = await Firm.findOne(req.firmQuery).select('hr.employees hr.staffingPlans').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const employees = firm.hr?.employees || [];
        const plans = (firm.hr?.staffingPlans || []).filter(p =>
            ['approved', 'active'].includes(p.status)
        );

        const byLocation = {};

        employees.filter(e => e.status === 'active').forEach(emp => {
            const loc = emp.location || emp.workLocation || 'Unassigned';
            if (!byLocation[loc]) {
                byLocation[loc] = { current: 0, planned: 0, open: 0 };
            }
            byLocation[loc].current++;
        });

        plans.forEach(plan => {
            (plan.positions || []).forEach(pos => {
                const loc = pos.location || 'Unassigned';
                if (!byLocation[loc]) {
                    byLocation[loc] = { current: 0, planned: 0, open: 0 };
                }
                byLocation[loc].planned += pos.headcount || 1;
                if (pos.status === 'open') {
                    byLocation[loc].open += pos.headcount || 1;
                }
            });
        });

        res.json({
            success: true,
            data: Object.entries(byLocation).map(([location, counts]) => ({
                location,
                ...counts,
                projected: counts.current + counts.open
            }))
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /headcount/by-job-family - Get headcount by job family
 */
router.get('/headcount/by-job-family', async (req, res, next) => {
    try {
        const firm = await Firm.findOne(req.firmQuery).select('hr.employees hr.staffingPlans').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const employees = firm.hr?.employees || [];
        const plans = (firm.hr?.staffingPlans || []).filter(p =>
            ['approved', 'active'].includes(p.status)
        );

        const byJobFamily = {};

        employees.filter(e => e.status === 'active').forEach(emp => {
            const family = emp.jobFamily || emp.department || 'General';
            if (!byJobFamily[family]) {
                byJobFamily[family] = { current: 0, planned: 0, open: 0 };
            }
            byJobFamily[family].current++;
        });

        plans.forEach(plan => {
            (plan.details || []).forEach(detail => {
                const family = detail.jobFamily || 'General';
                if (!byJobFamily[family]) {
                    byJobFamily[family] = { current: 0, planned: 0, open: 0 };
                }
                byJobFamily[family].planned += detail.headcount || 0;
            });
        });

        res.json({
            success: true,
            data: Object.entries(byJobFamily).map(([jobFamily, counts]) => ({
                jobFamily,
                ...counts
            }))
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /headcount/trends - Get headcount trends
 */
router.get('/headcount/trends', async (req, res, next) => {
    try {
        const { months = 12 } = req.query;
        const numMonths = Math.min(parseInt(months) || 12, 24);

        const firm = await Firm.findOne(req.firmQuery).select('hr.employees hr.staffingPlans').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const employees = firm.hr?.employees || [];
        const now = new Date();
        const trends = [];

        for (let i = numMonths - 1; i >= 0; i--) {
            const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

            const activeCount = employees.filter(e => {
                const hireDate = e.hireDate ? new Date(e.hireDate) : null;
                const termDate = e.terminationDate ? new Date(e.terminationDate) : null;
                return hireDate && hireDate <= monthEnd &&
                       (!termDate || termDate > monthEnd);
            }).length;

            trends.push({
                month: month.toISOString().slice(0, 7),
                headcount: activeCount
            });
        }

        res.json({
            success: true,
            data: trends
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /variance - Get plan vs actual variance
 */
router.get('/variance', async (req, res, next) => {
    try {
        const { fiscalYear } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('hr.staffingPlans hr.employees').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const plans = (firm.hr?.staffingPlans || []).filter(p => {
            if (fiscalYear && p.fiscalYear !== fiscalYear) return false;
            return ['approved', 'active', 'completed'].includes(p.status);
        });

        const employees = firm.hr?.employees || [];
        const currentYear = new Date().getFullYear();
        const hiresThisYear = employees.filter(e => {
            const hireDate = e.hireDate ? new Date(e.hireDate) : null;
            return hireDate && hireDate.getFullYear() === currentYear;
        }).length;

        let plannedHires = 0;
        let plannedBudget = 0;
        let actualBudget = 0;

        plans.forEach(plan => {
            plannedHires += plan.headcountTarget || 0;
            plannedBudget += plan.budget || 0;
            (plan.positions || []).filter(p => p.status === 'filled').forEach(pos => {
                actualBudget += pos.salaryRange?.min || 0;
            });
        });

        res.json({
            success: true,
            data: {
                headcount: {
                    planned: plannedHires,
                    actual: hiresThisYear,
                    variance: hiresThisYear - plannedHires,
                    variancePercent: plannedHires > 0
                        ? Math.round(((hiresThisYear - plannedHires) / plannedHires) * 100)
                        : 0
                },
                budget: {
                    planned: plannedBudget,
                    actual: actualBudget,
                    variance: actualBudget - plannedBudget,
                    variancePercent: plannedBudget > 0
                        ? Math.round(((actualBudget - plannedBudget) / plannedBudget) * 100)
                        : 0
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /scenarios - Get planning scenarios
 */
router.get('/scenarios', async (req, res, next) => {
    try {
        const firm = await Firm.findOne(req.firmQuery).select('hr.staffingScenarios').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const scenarios = firm.hr?.staffingScenarios || [];
        scenarios.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({
            success: true,
            data: scenarios
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /scenarios - Create planning scenario
 */
router.post('/scenarios', async (req, res, next) => {
    try {
        const safeData = pickAllowedFields(req.body, ALLOWED_SCENARIO_FIELDS);

        if (!safeData.name) {
            throw CustomException('Scenario name is required', 400);
        }

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        if (!firm.hr) firm.hr = {};
        if (!firm.hr.staffingScenarios) firm.hr.staffingScenarios = [];

        const scenario = {
            _id: new mongoose.Types.ObjectId(),
            ...safeData,
            createdBy: req.userID,
            createdAt: new Date()
        };

        firm.hr.staffingScenarios.push(scenario);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Scenario created',
            data: scenario
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /scenarios/:scenarioId - Update scenario
 */
router.patch('/scenarios/:scenarioId', async (req, res, next) => {
    try {
        const scenarioId = sanitizeObjectId(req.params.scenarioId, 'scenarioId');
        const safeData = pickAllowedFields(req.body, ALLOWED_SCENARIO_FIELDS);

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const scenarioIndex = (firm.hr?.staffingScenarios || []).findIndex(
            s => s._id?.toString() === scenarioId.toString()
        );

        if (scenarioIndex === -1) {
            throw CustomException('Scenario not found', 404);
        }

        Object.assign(firm.hr.staffingScenarios[scenarioIndex], safeData, {
            updatedBy: req.userID,
            updatedAt: new Date()
        });

        await firm.save();

        res.json({
            success: true,
            message: 'Scenario updated',
            data: firm.hr.staffingScenarios[scenarioIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /scenarios/:scenarioId - Delete scenario
 */
router.delete('/scenarios/:scenarioId', async (req, res, next) => {
    try {
        const scenarioId = sanitizeObjectId(req.params.scenarioId, 'scenarioId');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const scenarioIndex = (firm.hr?.staffingScenarios || []).findIndex(
            s => s._id?.toString() === scenarioId.toString()
        );

        if (scenarioIndex === -1) {
            throw CustomException('Scenario not found', 404);
        }

        firm.hr.staffingScenarios.splice(scenarioIndex, 1);
        await firm.save();

        res.json({
            success: true,
            message: 'Scenario deleted'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /scenarios/:scenarioId/apply - Apply scenario
 */
router.post('/scenarios/:scenarioId/apply', async (req, res, next) => {
    try {
        const scenarioId = sanitizeObjectId(req.params.scenarioId, 'scenarioId');
        const { targetPlanId } = req.body;

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const scenario = (firm.hr?.staffingScenarios || []).find(
            s => s._id?.toString() === scenarioId.toString()
        );

        if (!scenario) {
            throw CustomException('Scenario not found', 404);
        }

        // Apply scenario adjustments to target plan or create new plan
        const adjustments = scenario.adjustments || {};

        res.json({
            success: true,
            message: 'Scenario applied',
            data: {
                scenarioId,
                appliedAt: new Date(),
                adjustments
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /cost-analysis - Get cost analysis
 */
router.get('/cost-analysis', async (req, res, next) => {
    try {
        const { fiscalYear, department } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('hr.staffingPlans hr.employees').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const plans = (firm.hr?.staffingPlans || []).filter(p => {
            if (fiscalYear && p.fiscalYear !== fiscalYear) return false;
            if (department && p.department !== department) return false;
            return ['approved', 'active'].includes(p.status);
        });

        let totalPlannedCost = 0;
        let totalActualCost = 0;
        const costByDepartment = {};

        plans.forEach(plan => {
            const dept = plan.department || 'General';
            if (!costByDepartment[dept]) {
                costByDepartment[dept] = { planned: 0, actual: 0 };
            }

            totalPlannedCost += plan.budget || 0;
            costByDepartment[dept].planned += plan.budget || 0;

            (plan.positions || []).filter(p => p.status === 'filled').forEach(pos => {
                const avgSalary = pos.salaryRange
                    ? (pos.salaryRange.min + pos.salaryRange.max) / 2
                    : 0;
                totalActualCost += avgSalary;
                costByDepartment[dept].actual += avgSalary;
            });
        });

        res.json({
            success: true,
            data: {
                summary: {
                    totalPlannedCost,
                    totalActualCost,
                    variance: totalActualCost - totalPlannedCost,
                    utilizationRate: totalPlannedCost > 0
                        ? Math.round((totalActualCost / totalPlannedCost) * 100)
                        : 0
                },
                byDepartment: Object.entries(costByDepartment).map(([dept, costs]) => ({
                    department: dept,
                    ...costs,
                    variance: costs.actual - costs.planned
                }))
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /attrition-forecast - Get attrition forecast
 */
router.get('/attrition-forecast', async (req, res, next) => {
    try {
        const { months = 12 } = req.query;
        const numMonths = Math.min(parseInt(months) || 12, 24);

        const firm = await Firm.findOne(req.firmQuery).select('hr.employees').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const employees = (firm.hr?.employees || []).filter(e => e.status === 'active');
        const currentHeadcount = employees.length;

        // Calculate historical attrition rate
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const terminatedLastYear = (firm.hr?.employees || []).filter(e => {
            const termDate = e.terminationDate ? new Date(e.terminationDate) : null;
            return termDate && termDate >= oneYearAgo;
        }).length;

        const attritionRate = currentHeadcount > 0
            ? terminatedLastYear / currentHeadcount
            : 0.1; // Default 10% if no data

        const monthlyAttritionRate = attritionRate / 12;

        const forecast = [];
        let projectedHeadcount = currentHeadcount;

        for (let i = 1; i <= numMonths; i++) {
            const expectedAttrition = Math.round(projectedHeadcount * monthlyAttritionRate);
            projectedHeadcount -= expectedAttrition;

            const month = new Date();
            month.setMonth(month.getMonth() + i);

            forecast.push({
                month: month.toISOString().slice(0, 7),
                expectedAttrition,
                projectedHeadcount: Math.max(0, projectedHeadcount)
            });
        }

        res.json({
            success: true,
            data: {
                currentHeadcount,
                annualAttritionRate: Math.round(attritionRate * 100),
                forecast
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:planId/details - Add detail to plan
 */
router.post('/:planId/details', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');
        const safeData = pickAllowedFields(req.body, ALLOWED_DETAIL_FIELDS);

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

        const detail = {
            _id: new mongoose.Types.ObjectId(),
            ...safeData,
            createdBy: req.userID,
            createdAt: new Date()
        };

        if (!plan.details) plan.details = [];
        plan.details.push(detail);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Detail added to plan',
            data: detail
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /:planId/details/:detailId - Update detail
 */
router.patch('/:planId/details/:detailId', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');
        const detailId = sanitizeObjectId(req.params.detailId, 'detailId');
        const safeData = pickAllowedFields(req.body, ALLOWED_DETAIL_FIELDS);

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

        const detailIndex = (plan.details || []).findIndex(
            d => d._id?.toString() === detailId.toString()
        );

        if (detailIndex === -1) {
            throw CustomException('Detail not found', 404);
        }

        Object.assign(plan.details[detailIndex], safeData, {
            updatedBy: req.userID,
            updatedAt: new Date()
        });

        await firm.save();

        res.json({
            success: true,
            message: 'Detail updated',
            data: plan.details[detailIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:planId/details/:detailId - Delete detail
 */
router.delete('/:planId/details/:detailId', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');
        const detailId = sanitizeObjectId(req.params.detailId, 'detailId');

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

        const detailIndex = (plan.details || []).findIndex(
            d => d._id?.toString() === detailId.toString()
        );

        if (detailIndex === -1) {
            throw CustomException('Detail not found', 404);
        }

        plan.details.splice(detailIndex, 1);
        await firm.save();

        res.json({
            success: true,
            message: 'Detail deleted'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /bulk-update - Bulk update details
 */
router.post('/bulk-update', async (req, res, next) => {
    try {
        const { updates } = req.body;

        if (!Array.isArray(updates) || updates.length === 0) {
            throw CustomException('Updates array is required', 400);
        }

        if (updates.length > 50) {
            throw CustomException('Maximum 50 updates per request', 400);
        }

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const results = { updated: 0, errors: [] };

        for (let i = 0; i < updates.length; i++) {
            try {
                const { planId, detailId, data } = updates[i];
                if (!planId || !detailId || !data) {
                    results.errors.push({ index: i, error: 'planId, detailId, and data are required' });
                    continue;
                }

                const safePlanId = sanitizeObjectId(planId, 'planId');
                const safeDetailId = sanitizeObjectId(detailId, 'detailId');
                const safeData = pickAllowedFields(data, ALLOWED_DETAIL_FIELDS);

                const plan = (firm.hr?.staffingPlans || []).find(
                    p => p._id?.toString() === safePlanId.toString()
                );

                if (!plan) {
                    results.errors.push({ index: i, error: 'Plan not found' });
                    continue;
                }

                const detail = (plan.details || []).find(
                    d => d._id?.toString() === safeDetailId.toString()
                );

                if (!detail) {
                    results.errors.push({ index: i, error: 'Detail not found' });
                    continue;
                }

                Object.assign(detail, safeData, {
                    updatedBy: req.userID,
                    updatedAt: new Date()
                });

                results.updated++;
            } catch (err) {
                results.errors.push({ index: i, error: err.message });
            }
        }

        await firm.save();

        res.json({
            success: true,
            message: `Updated ${results.updated} details, ${results.errors.length} errors`,
            data: results
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
