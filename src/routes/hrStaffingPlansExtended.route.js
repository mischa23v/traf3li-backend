/**
 * HR Staffing Plans Extended Routes
 *
 * Extended staffing plan operations - job openings, vacancies, linking.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - POST /:planId/calculate-vacancies       - Calculate plan vacancies
 * - GET /vacancies-summary                  - Get vacancies summary
 * - POST /:planId/details/:detailId/create-job-opening - Create job opening from detail
 * - POST /:planId/details/:detailId/link-job-opening   - Link existing job opening
 * - DELETE /:planId/details/:detailId/unlink-job-opening - Unlink job opening
 * - GET /:planId/job-openings               - Get linked job openings
 * - POST /:planId/sync-headcount            - Sync headcount from HR
 * - GET /:planId/fulfillment-status         - Get fulfillment status
 * - POST /:planId/generate-requisitions     - Generate requisitions from plan
 * - GET /comparison                         - Compare multiple plans
 * - POST /:planId/rollover                  - Rollover plan to next period
 * - GET /:planId/timeline                   - Get plan timeline/milestones
 * - POST /:planId/approve                   - Approve staffing plan
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

/**
 * POST /:planId/calculate-vacancies - Calculate plan vacancies
 */
router.post('/:planId/calculate-vacancies', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');
        const { asOfDate, includeProjected } = req.body;

        const firm = await Firm.findOne(req.firmQuery).select('hr.staffingPlans hr.employees');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const plan = (firm.hr?.staffingPlans || []).find(
            p => p._id?.toString() === planId.toString()
        );

        if (!plan) {
            throw CustomException('Staffing plan not found', 404);
        }

        // Calculate vacancies for each detail
        const employees = firm.hr?.employees || [];
        const activeEmployees = employees.filter(e => e.status === 'active');

        const vacancies = (plan.details || []).map(detail => {
            // Count current headcount matching this detail's criteria
            const currentCount = activeEmployees.filter(e => {
                const matchDept = !detail.department || e.department === detail.department;
                const matchLocation = !detail.location || e.location === detail.location;
                const matchJobFamily = !detail.jobFamily || e.jobFamily === detail.jobFamily;
                return matchDept && matchLocation && matchJobFamily;
            }).length;

            const targetHeadcount = detail.headcount || 0;
            const vacancy = targetHeadcount - currentCount;

            return {
                detailId: detail._id,
                department: detail.department,
                jobFamily: detail.jobFamily,
                location: detail.location,
                targetHeadcount,
                currentHeadcount: currentCount,
                vacancy: Math.max(0, vacancy),
                overstaffed: Math.max(0, -vacancy),
                fulfillmentPercentage: targetHeadcount > 0
                    ? Math.round((currentCount / targetHeadcount) * 100)
                    : 100
            };
        });

        // Update plan with calculated vacancies
        plan.calculatedVacancies = vacancies;
        plan.lastVacancyCalculation = new Date();
        await firm.save();

        const summary = {
            totalTarget: vacancies.reduce((sum, v) => sum + v.targetHeadcount, 0),
            totalCurrent: vacancies.reduce((sum, v) => sum + v.currentHeadcount, 0),
            totalVacancies: vacancies.reduce((sum, v) => sum + v.vacancy, 0),
            totalOverstaffed: vacancies.reduce((sum, v) => sum + v.overstaffed, 0),
            overallFulfillment: 0
        };
        summary.overallFulfillment = summary.totalTarget > 0
            ? Math.round((summary.totalCurrent / summary.totalTarget) * 100)
            : 100;

        res.json({
            success: true,
            data: {
                planId,
                calculatedAt: plan.lastVacancyCalculation,
                summary,
                vacancies
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /vacancies-summary - Get vacancies summary across all plans
 */
router.get('/vacancies-summary', async (req, res, next) => {
    try {
        const { fiscalYear, status } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('hr.staffingPlans').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let plans = firm.hr?.staffingPlans || [];

        if (fiscalYear) {
            plans = plans.filter(p => p.fiscalYear === fiscalYear);
        }

        if (status) {
            plans = plans.filter(p => p.status === status);
        }

        // Aggregate vacancies
        const summary = {
            totalPlans: plans.length,
            byDepartment: {},
            byLocation: {},
            byJobFamily: {},
            totalVacancies: 0,
            totalOverstaffed: 0,
            criticalVacancies: [] // Vacancies > 50% unfilled
        };

        plans.forEach(plan => {
            (plan.calculatedVacancies || []).forEach(v => {
                // By department
                if (v.department) {
                    if (!summary.byDepartment[v.department]) {
                        summary.byDepartment[v.department] = { target: 0, current: 0, vacancy: 0 };
                    }
                    summary.byDepartment[v.department].target += v.targetHeadcount;
                    summary.byDepartment[v.department].current += v.currentHeadcount;
                    summary.byDepartment[v.department].vacancy += v.vacancy;
                }

                // By location
                if (v.location) {
                    if (!summary.byLocation[v.location]) {
                        summary.byLocation[v.location] = { target: 0, current: 0, vacancy: 0 };
                    }
                    summary.byLocation[v.location].target += v.targetHeadcount;
                    summary.byLocation[v.location].current += v.currentHeadcount;
                    summary.byLocation[v.location].vacancy += v.vacancy;
                }

                // Totals
                summary.totalVacancies += v.vacancy;
                summary.totalOverstaffed += v.overstaffed || 0;

                // Critical vacancies
                if (v.fulfillmentPercentage < 50 && v.vacancy > 0) {
                    summary.criticalVacancies.push({
                        planId: plan._id,
                        planName: plan.name,
                        ...v
                    });
                }
            });
        });

        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:planId/details/:detailId/create-job-opening - Create job opening from detail
 */
router.post('/:planId/details/:detailId/create-job-opening', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');
        const detailId = sanitizeObjectId(req.params.detailId, 'detailId');
        const { title, description, requirements, salaryRange, urgency } = req.body;

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

        const detail = (plan.details || []).find(
            d => d._id?.toString() === detailId.toString()
        );

        if (!detail) {
            throw CustomException('Plan detail not found', 404);
        }

        // Create job opening
        if (!firm.hr.jobOpenings) firm.hr.jobOpenings = [];

        const jobOpening = {
            _id: new mongoose.Types.ObjectId(),
            title: title || detail.jobTitle || `${detail.jobFamily} Position`,
            department: detail.department,
            location: detail.location,
            jobFamily: detail.jobFamily,
            description,
            requirements,
            salaryRange: salaryRange || {
                min: detail.salaryBudget * 0.9,
                max: detail.salaryBudget * 1.1
            },
            urgency: urgency || detail.priority,
            status: 'open',
            sourceType: 'staffing_plan',
            sourcePlanId: planId,
            sourceDetailId: detailId,
            createdBy: req.userID,
            createdAt: new Date()
        };

        firm.hr.jobOpenings.push(jobOpening);

        // Link back to detail
        if (!detail.linkedJobOpenings) detail.linkedJobOpenings = [];
        detail.linkedJobOpenings.push(jobOpening._id);

        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Job opening created from staffing plan',
            data: jobOpening
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:planId/details/:detailId/link-job-opening - Link existing job opening
 */
router.post('/:planId/details/:detailId/link-job-opening', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');
        const detailId = sanitizeObjectId(req.params.detailId, 'detailId');
        const { jobOpeningId } = req.body;

        if (!jobOpeningId) {
            throw CustomException('Job opening ID is required', 400);
        }

        const safeJobOpeningId = sanitizeObjectId(jobOpeningId, 'jobOpeningId');

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

        const detail = (plan.details || []).find(
            d => d._id?.toString() === detailId.toString()
        );

        if (!detail) {
            throw CustomException('Plan detail not found', 404);
        }

        // Verify job opening exists
        const jobOpening = (firm.hr?.jobOpenings || []).find(
            j => j._id?.toString() === safeJobOpeningId.toString()
        );

        if (!jobOpening) {
            throw CustomException('Job opening not found', 404);
        }

        // Check not already linked
        if (!detail.linkedJobOpenings) detail.linkedJobOpenings = [];
        if (detail.linkedJobOpenings.some(id => id.toString() === safeJobOpeningId.toString())) {
            throw CustomException('Job opening already linked to this detail', 400);
        }

        detail.linkedJobOpenings.push(safeJobOpeningId);

        // Update job opening source reference
        jobOpening.sourcePlanId = planId;
        jobOpening.sourceDetailId = detailId;

        await firm.save();

        res.json({
            success: true,
            message: 'Job opening linked to staffing plan detail',
            data: {
                detailId,
                jobOpeningId: safeJobOpeningId,
                linkedCount: detail.linkedJobOpenings.length
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:planId/details/:detailId/unlink-job-opening - Unlink job opening
 */
router.delete('/:planId/details/:detailId/unlink-job-opening', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');
        const detailId = sanitizeObjectId(req.params.detailId, 'detailId');
        const { jobOpeningId } = req.body;

        if (!jobOpeningId) {
            throw CustomException('Job opening ID is required', 400);
        }

        const safeJobOpeningId = sanitizeObjectId(jobOpeningId, 'jobOpeningId');

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

        const detail = (plan.details || []).find(
            d => d._id?.toString() === detailId.toString()
        );

        if (!detail) {
            throw CustomException('Plan detail not found', 404);
        }

        // Remove link
        const linkIndex = (detail.linkedJobOpenings || []).findIndex(
            id => id.toString() === safeJobOpeningId.toString()
        );

        if (linkIndex === -1) {
            throw CustomException('Job opening not linked to this detail', 404);
        }

        detail.linkedJobOpenings.splice(linkIndex, 1);

        // Clear source reference from job opening
        const jobOpening = (firm.hr?.jobOpenings || []).find(
            j => j._id?.toString() === safeJobOpeningId.toString()
        );

        if (jobOpening) {
            jobOpening.sourcePlanId = null;
            jobOpening.sourceDetailId = null;
        }

        await firm.save();

        res.json({
            success: true,
            message: 'Job opening unlinked from staffing plan detail'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:planId/job-openings - Get linked job openings
 */
router.get('/:planId/job-openings', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');
        const { status, detailId } = req.query;

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

        // Collect all linked job opening IDs
        let linkedIds = [];
        (plan.details || []).forEach(detail => {
            if (detailId && detail._id?.toString() !== detailId) return;
            (detail.linkedJobOpenings || []).forEach(id => {
                linkedIds.push(id.toString());
            });
        });

        // Get job openings
        let jobOpenings = (firm.hr?.jobOpenings || []).filter(
            j => linkedIds.includes(j._id?.toString())
        );

        if (status) {
            jobOpenings = jobOpenings.filter(j => j.status === status);
        }

        res.json({
            success: true,
            data: jobOpenings,
            count: jobOpenings.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:planId/sync-headcount - Sync headcount from HR
 */
router.post('/:planId/sync-headcount', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');

        const firm = await Firm.findOne(req.firmQuery).select('hr.staffingPlans hr.employees');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const plan = (firm.hr?.staffingPlans || []).find(
            p => p._id?.toString() === planId.toString()
        );

        if (!plan) {
            throw CustomException('Staffing plan not found', 404);
        }

        // Recalculate current headcount for each detail
        const employees = (firm.hr?.employees || []).filter(e => e.status === 'active');
        const updates = [];

        (plan.details || []).forEach(detail => {
            const currentCount = employees.filter(e => {
                const matchDept = !detail.department || e.department === detail.department;
                const matchLocation = !detail.location || e.location === detail.location;
                return matchDept && matchLocation;
            }).length;

            const previousCount = detail.currentHeadcount || 0;
            detail.currentHeadcount = currentCount;
            detail.lastSyncedAt = new Date();

            if (previousCount !== currentCount) {
                updates.push({
                    detailId: detail._id,
                    department: detail.department,
                    previousCount,
                    currentCount,
                    change: currentCount - previousCount
                });
            }
        });

        plan.lastHeadcountSync = new Date();
        await firm.save();

        res.json({
            success: true,
            message: 'Headcount synced from HR data',
            data: {
                syncedAt: plan.lastHeadcountSync,
                detailsUpdated: updates.length,
                updates
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:planId/fulfillment-status - Get fulfillment status
 */
router.get('/:planId/fulfillment-status', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');

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

        const jobOpenings = firm.hr?.jobOpenings || [];
        const details = plan.details || [];

        const fulfillment = details.map(detail => {
            const linkedOpenings = (detail.linkedJobOpenings || []).map(id => {
                return jobOpenings.find(j => j._id?.toString() === id.toString());
            }).filter(Boolean);

            const filledOpenings = linkedOpenings.filter(j => j.status === 'filled').length;
            const openOpenings = linkedOpenings.filter(j => j.status === 'open').length;
            const closedOpenings = linkedOpenings.filter(j => j.status === 'closed').length;

            return {
                detailId: detail._id,
                department: detail.department,
                location: detail.location,
                targetHeadcount: detail.headcount || 0,
                currentHeadcount: detail.currentHeadcount || 0,
                linkedOpenings: linkedOpenings.length,
                filledOpenings,
                openOpenings,
                closedOpenings,
                remaining: Math.max(0, (detail.headcount || 0) - (detail.currentHeadcount || 0) - filledOpenings),
                status: this.calculateFulfillmentStatus(detail, linkedOpenings)
            };
        });

        const summary = {
            totalTarget: fulfillment.reduce((s, f) => s + f.targetHeadcount, 0),
            totalCurrent: fulfillment.reduce((s, f) => s + f.currentHeadcount, 0),
            totalLinkedOpenings: fulfillment.reduce((s, f) => s + f.linkedOpenings, 0),
            totalFilledOpenings: fulfillment.reduce((s, f) => s + f.filledOpenings, 0),
            onTrack: fulfillment.filter(f => f.status === 'on_track').length,
            atRisk: fulfillment.filter(f => f.status === 'at_risk').length,
            behind: fulfillment.filter(f => f.status === 'behind').length
        };

        res.json({
            success: true,
            data: {
                planId,
                planName: plan.name,
                summary,
                details: fulfillment
            }
        });
    } catch (error) {
        next(error);
    }
});

// Helper function for fulfillment status
function calculateFulfillmentStatus(detail, linkedOpenings) {
    const target = detail.headcount || 0;
    const current = detail.currentHeadcount || 0;
    const pending = linkedOpenings.filter(j => j.status === 'open').length;

    if (current >= target) return 'complete';
    if (current + pending >= target) return 'on_track';
    if (current + pending >= target * 0.7) return 'at_risk';
    return 'behind';
}

/**
 * POST /:planId/generate-requisitions - Generate requisitions from plan
 */
router.post('/:planId/generate-requisitions', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');
        const { detailIds, autoApprove } = req.body;

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

        // Filter details to process
        let detailsToProcess = plan.details || [];
        if (detailIds && Array.isArray(detailIds) && detailIds.length > 0) {
            const safeIds = detailIds.map(id => sanitizeObjectId(id, 'detailId').toString());
            detailsToProcess = detailsToProcess.filter(
                d => safeIds.includes(d._id?.toString())
            );
        }

        if (!firm.hr.jobOpenings) firm.hr.jobOpenings = [];

        const created = [];
        detailsToProcess.forEach(detail => {
            const vacancy = (detail.headcount || 0) - (detail.currentHeadcount || 0);
            const existingOpenings = (detail.linkedJobOpenings || []).length;
            const toCreate = Math.max(0, vacancy - existingOpenings);

            for (let i = 0; i < toCreate; i++) {
                const jobOpening = {
                    _id: new mongoose.Types.ObjectId(),
                    title: detail.jobTitle || `${detail.jobFamily} Position`,
                    department: detail.department,
                    location: detail.location,
                    jobFamily: detail.jobFamily,
                    salaryRange: {
                        min: (detail.salaryBudget || 0) * 0.9,
                        max: (detail.salaryBudget || 0) * 1.1
                    },
                    urgency: detail.priority,
                    status: autoApprove ? 'open' : 'pending_approval',
                    sourceType: 'staffing_plan',
                    sourcePlanId: planId,
                    sourceDetailId: detail._id,
                    createdBy: req.userID,
                    createdAt: new Date()
                };

                firm.hr.jobOpenings.push(jobOpening);

                if (!detail.linkedJobOpenings) detail.linkedJobOpenings = [];
                detail.linkedJobOpenings.push(jobOpening._id);

                created.push(jobOpening);
            }
        });

        await firm.save();

        res.status(201).json({
            success: true,
            message: `Generated ${created.length} job requisitions`,
            data: {
                created: created.length,
                requisitions: created.map(r => ({
                    _id: r._id,
                    title: r.title,
                    department: r.department,
                    status: r.status
                }))
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /comparison - Compare multiple plans
 */
router.get('/comparison', async (req, res, next) => {
    try {
        const { planIds } = req.query;

        if (!planIds) {
            throw CustomException('Plan IDs are required (comma-separated)', 400);
        }

        const ids = planIds.split(',').map(id => sanitizeObjectId(id.trim(), 'planId'));

        if (ids.length < 2) {
            throw CustomException('At least 2 plan IDs required for comparison', 400);
        }

        if (ids.length > 5) {
            throw CustomException('Maximum 5 plans can be compared', 400);
        }

        const firm = await Firm.findOne(req.firmQuery).select('hr.staffingPlans').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const plans = (firm.hr?.staffingPlans || []).filter(
            p => ids.some(id => id.toString() === p._id?.toString())
        );

        if (plans.length !== ids.length) {
            throw CustomException('One or more plans not found', 404);
        }

        const comparison = plans.map(plan => {
            const details = plan.details || [];
            return {
                planId: plan._id,
                name: plan.name,
                fiscalYear: plan.fiscalYear,
                status: plan.status,
                totalHeadcount: details.reduce((s, d) => s + (d.headcount || 0), 0),
                totalBudget: details.reduce((s, d) => s + (d.salaryBudget || 0), 0),
                departmentBreakdown: this.aggregateByField(details, 'department'),
                locationBreakdown: this.aggregateByField(details, 'location')
            };
        });

        res.json({
            success: true,
            data: {
                plansCompared: plans.length,
                comparison
            }
        });
    } catch (error) {
        next(error);
    }
});

// Helper to aggregate by field
function aggregateByField(details, field) {
    const result = {};
    details.forEach(d => {
        const key = d[field] || 'Unspecified';
        if (!result[key]) result[key] = { headcount: 0, budget: 0 };
        result[key].headcount += d.headcount || 0;
        result[key].budget += d.salaryBudget || 0;
    });
    return result;
}

/**
 * POST /:planId/rollover - Rollover plan to next period
 */
router.post('/:planId/rollover', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');
        const { newFiscalYear, adjustments } = req.body;

        if (!newFiscalYear) {
            throw CustomException('New fiscal year is required', 400);
        }

        const firm = await Firm.findOne(req.firmQuery).select('hr.staffingPlans');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const sourcePlan = (firm.hr?.staffingPlans || []).find(
            p => p._id?.toString() === planId.toString()
        );

        if (!sourcePlan) {
            throw CustomException('Staffing plan not found', 404);
        }

        // Create new plan based on source
        const newPlan = {
            _id: new mongoose.Types.ObjectId(),
            name: `${sourcePlan.name} - ${newFiscalYear}`,
            fiscalYear: newFiscalYear,
            status: 'draft',
            rolledOverFrom: planId,
            details: (sourcePlan.details || []).map(d => ({
                _id: new mongoose.Types.ObjectId(),
                department: d.department,
                jobFamily: d.jobFamily,
                jobTitle: d.jobTitle,
                location: d.location,
                headcount: adjustments?.[d._id?.toString()]?.headcount ?? d.headcount,
                salaryBudget: adjustments?.[d._id?.toString()]?.salaryBudget ?? d.salaryBudget,
                priority: d.priority,
                notes: d.notes,
                linkedJobOpenings: [] // Don't carry over job openings
            })),
            createdBy: req.userID,
            createdAt: new Date()
        };

        firm.hr.staffingPlans.push(newPlan);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Plan rolled over to new fiscal year',
            data: newPlan
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:planId/timeline - Get plan timeline/milestones
 */
router.get('/:planId/timeline', async (req, res, next) => {
    try {
        const planId = sanitizeObjectId(req.params.planId, 'planId');

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

        const jobOpenings = firm.hr?.jobOpenings || [];
        const timeline = [];

        // Plan creation
        timeline.push({
            date: plan.createdAt,
            type: 'plan_created',
            description: 'Staffing plan created'
        });

        // Status changes (if tracked)
        if (plan.statusHistory) {
            plan.statusHistory.forEach(h => {
                timeline.push({
                    date: h.changedAt,
                    type: 'status_change',
                    description: `Status changed to ${h.status}`
                });
            });
        }

        // Job openings created
        const linkedOpenings = jobOpenings.filter(
            j => j.sourcePlanId?.toString() === planId.toString()
        );

        linkedOpenings.forEach(jo => {
            timeline.push({
                date: jo.createdAt,
                type: 'job_opening_created',
                description: `Job opening created: ${jo.title}`
            });

            if (jo.status === 'filled' && jo.filledAt) {
                timeline.push({
                    date: jo.filledAt,
                    type: 'job_opening_filled',
                    description: `Position filled: ${jo.title}`
                });
            }
        });

        // Sort by date descending
        timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({
            success: true,
            data: {
                planId,
                planName: plan.name,
                timeline
            }
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

        if (plan.status === 'approved') {
            throw CustomException('Plan is already approved', 400);
        }

        if (plan.status !== 'pending_approval' && plan.status !== 'draft') {
            throw CustomException('Plan cannot be approved in current status', 400);
        }

        // Update status
        const previousStatus = plan.status;
        plan.status = 'approved';
        plan.approvedAt = new Date();
        plan.approvedBy = req.userID;
        plan.approvalComments = comments;

        // Track status history
        if (!plan.statusHistory) plan.statusHistory = [];
        plan.statusHistory.push({
            status: 'approved',
            previousStatus,
            changedAt: new Date(),
            changedBy: req.userID,
            comments
        });

        await firm.save();

        res.json({
            success: true,
            message: 'Staffing plan approved',
            data: {
                planId,
                status: 'approved',
                approvedAt: plan.approvedAt
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
