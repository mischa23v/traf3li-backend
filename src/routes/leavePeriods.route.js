/**
 * Leave Periods Routes
 *
 * Leave period management - fiscal leave periods and allocations.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - GET /                        - List all leave periods
 * - POST /                       - Create leave period
 * - GET /:id                     - Get leave period by ID
 * - PATCH /:id                   - Update leave period
 * - DELETE /:id                  - Delete leave period
 * - POST /:id/activate           - Activate leave period
 * - POST /:id/close              - Close leave period
 * - GET /:id/allocations         - Get period allocations
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

// Allowed fields for create/update
const ALLOWED_FIELDS = [
    'name', 'startDate', 'endDate', 'description',
    'carryOverLimit', 'carryOverExpiry', 'autoAllocate'
];

// Valid statuses
const VALID_STATUSES = ['draft', 'active', 'closed'];

/**
 * GET / - List all leave periods
 */
router.get('/', async (req, res, next) => {
    try {
        const { page, limit } = sanitizePagination(req.query);
        const { status, year, current } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('hr.leavePeriods').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let periods = firm.hr?.leavePeriods || [];

        // Apply filters
        if (status) {
            if (!VALID_STATUSES.includes(status)) {
                throw CustomException(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, 400);
            }
            periods = periods.filter(p => p.status === status);
        }

        if (year) {
            const yearNum = parseInt(year);
            periods = periods.filter(p => {
                const startYear = new Date(p.startDate).getFullYear();
                const endYear = new Date(p.endDate).getFullYear();
                return startYear === yearNum || endYear === yearNum;
            });
        }

        if (current === 'true') {
            const now = new Date();
            periods = periods.filter(p =>
                p.status === 'active' &&
                new Date(p.startDate) <= now &&
                new Date(p.endDate) >= now
            );
        }

        // Sort by start date descending
        periods.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

        const total = periods.length;
        periods = periods.slice((page - 1) * limit, page * limit);

        res.json({
            success: true,
            data: periods,
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
 * POST / - Create leave period
 */
router.post('/', async (req, res, next) => {
    try {
        const safeData = pickAllowedFields(req.body, ALLOWED_FIELDS);

        if (!safeData.name || !safeData.startDate || !safeData.endDate) {
            throw CustomException('Name, start date, and end date are required', 400);
        }

        const startDate = new Date(safeData.startDate);
        const endDate = new Date(safeData.endDate);

        if (endDate <= startDate) {
            throw CustomException('End date must be after start date', 400);
        }

        const firm = await Firm.findOne(req.firmQuery).select('hr.leavePeriods');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        if (!firm.hr) firm.hr = {};
        if (!firm.hr.leavePeriods) firm.hr.leavePeriods = [];

        // Check for overlapping periods
        const overlapping = firm.hr.leavePeriods.find(p => {
            const pStart = new Date(p.startDate);
            const pEnd = new Date(p.endDate);
            return (startDate <= pEnd && endDate >= pStart);
        });

        if (overlapping) {
            throw CustomException(`Period overlaps with existing period: ${overlapping.name}`, 400);
        }

        const period = {
            _id: new mongoose.Types.ObjectId(),
            ...safeData,
            startDate,
            endDate,
            status: 'draft',
            allocations: [],
            createdBy: req.userID,
            createdAt: new Date()
        };

        firm.hr.leavePeriods.push(period);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Leave period created',
            data: period
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:id - Get leave period by ID
 */
router.get('/:id', async (req, res, next) => {
    try {
        const periodId = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery).select('hr.leavePeriods').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const period = (firm.hr?.leavePeriods || []).find(
            p => p._id?.toString() === periodId.toString()
        );

        if (!period) {
            throw CustomException('Leave period not found', 404);
        }

        // Calculate summary
        const allocations = period.allocations || [];
        const totalAllocated = allocations.reduce((sum, a) => sum + (a.days || 0), 0);
        const totalUsed = allocations.reduce((sum, a) => sum + (a.used || 0), 0);

        res.json({
            success: true,
            data: {
                ...period,
                summary: {
                    employeesAllocated: allocations.length,
                    totalDaysAllocated: totalAllocated,
                    totalDaysUsed: totalUsed,
                    totalDaysRemaining: totalAllocated - totalUsed
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /:id - Update leave period
 */
router.patch('/:id', async (req, res, next) => {
    try {
        const periodId = sanitizeObjectId(req.params.id, 'id');
        const safeData = pickAllowedFields(req.body, ALLOWED_FIELDS);

        const firm = await Firm.findOne(req.firmQuery).select('hr.leavePeriods');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const period = (firm.hr?.leavePeriods || []).find(
            p => p._id?.toString() === periodId.toString()
        );

        if (!period) {
            throw CustomException('Leave period not found', 404);
        }

        if (period.status === 'closed') {
            throw CustomException('Cannot update closed leave period', 400);
        }

        // Validate dates if changing
        if (safeData.startDate || safeData.endDate) {
            const startDate = safeData.startDate ? new Date(safeData.startDate) : new Date(period.startDate);
            const endDate = safeData.endDate ? new Date(safeData.endDate) : new Date(period.endDate);

            if (endDate <= startDate) {
                throw CustomException('End date must be after start date', 400);
            }

            // Check for overlapping periods (excluding this one)
            const overlapping = firm.hr.leavePeriods.find(p => {
                if (p._id.toString() === periodId.toString()) return false;
                const pStart = new Date(p.startDate);
                const pEnd = new Date(p.endDate);
                return (startDate <= pEnd && endDate >= pStart);
            });

            if (overlapping) {
                throw CustomException(`Period would overlap with: ${overlapping.name}`, 400);
            }

            if (safeData.startDate) safeData.startDate = startDate;
            if (safeData.endDate) safeData.endDate = endDate;
        }

        // Apply updates
        Object.assign(period, safeData);
        period.updatedBy = req.userID;
        period.updatedAt = new Date();

        await firm.save();

        res.json({
            success: true,
            message: 'Leave period updated',
            data: period
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:id - Delete leave period
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const periodId = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery).select('hr.leavePeriods');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const periodIndex = (firm.hr?.leavePeriods || []).findIndex(
            p => p._id?.toString() === periodId.toString()
        );

        if (periodIndex === -1) {
            throw CustomException('Leave period not found', 404);
        }

        const period = firm.hr.leavePeriods[periodIndex];

        // Cannot delete active period
        if (period.status === 'active') {
            throw CustomException('Cannot delete active leave period. Close it first.', 400);
        }

        // Check for allocations
        if (period.allocations && period.allocations.length > 0) {
            const hasUsedLeave = period.allocations.some(a => a.used > 0);
            if (hasUsedLeave) {
                throw CustomException('Cannot delete period with used leave allocations', 400);
            }
        }

        firm.hr.leavePeriods.splice(periodIndex, 1);
        await firm.save();

        res.json({
            success: true,
            message: 'Leave period deleted'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/activate - Activate leave period
 */
router.post('/:id/activate', async (req, res, next) => {
    try {
        const periodId = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery).select('hr.leavePeriods');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const period = (firm.hr?.leavePeriods || []).find(
            p => p._id?.toString() === periodId.toString()
        );

        if (!period) {
            throw CustomException('Leave period not found', 404);
        }

        if (period.status === 'active') {
            throw CustomException('Period is already active', 400);
        }

        if (period.status === 'closed') {
            throw CustomException('Cannot activate closed period', 400);
        }

        // Check for existing active period that overlaps
        const existing = firm.hr.leavePeriods.find(p => {
            if (p._id.toString() === periodId.toString()) return false;
            if (p.status !== 'active') return false;

            const pStart = new Date(p.startDate);
            const pEnd = new Date(p.endDate);
            const thisStart = new Date(period.startDate);
            const thisEnd = new Date(period.endDate);

            return (thisStart <= pEnd && thisEnd >= pStart);
        });

        if (existing) {
            throw CustomException(`Active period already exists for this timeframe: ${existing.name}`, 400);
        }

        period.status = 'active';
        period.activatedAt = new Date();
        period.activatedBy = req.userID;

        await firm.save();

        res.json({
            success: true,
            message: 'Leave period activated',
            data: period
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/close - Close leave period
 */
router.post('/:id/close', async (req, res, next) => {
    try {
        const periodId = sanitizeObjectId(req.params.id, 'id');
        const { processCarryOver } = req.body;

        const firm = await Firm.findOne(req.firmQuery).select('hr.leavePeriods');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const period = (firm.hr?.leavePeriods || []).find(
            p => p._id?.toString() === periodId.toString()
        );

        if (!period) {
            throw CustomException('Leave period not found', 404);
        }

        if (period.status === 'closed') {
            throw CustomException('Period is already closed', 400);
        }

        // Calculate carry over if requested
        let carryOverStats = null;
        if (processCarryOver && period.allocations) {
            carryOverStats = {
                processed: 0,
                totalDaysCarried: 0
            };

            const carryOverLimit = period.carryOverLimit || 0;

            period.allocations.forEach(alloc => {
                const remaining = (alloc.days || 0) - (alloc.used || 0);
                if (remaining > 0) {
                    const carryOver = Math.min(remaining, carryOverLimit);
                    alloc.carryOver = carryOver;
                    carryOverStats.totalDaysCarried += carryOver;
                    carryOverStats.processed++;
                }
            });
        }

        period.status = 'closed';
        period.closedAt = new Date();
        period.closedBy = req.userID;

        await firm.save();

        res.json({
            success: true,
            message: 'Leave period closed',
            data: {
                periodId,
                status: 'closed',
                closedAt: period.closedAt,
                carryOverStats
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:id/allocations - Get period allocations
 */
router.get('/:id/allocations', async (req, res, next) => {
    try {
        const periodId = sanitizeObjectId(req.params.id, 'id');
        const { page, limit } = sanitizePagination(req.query);
        const { leaveType, department } = req.query;

        const firm = await Firm.findOne(req.firmQuery)
            .select('hr.leavePeriods hr.employees')
            .lean();

        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const period = (firm.hr?.leavePeriods || []).find(
            p => p._id?.toString() === periodId.toString()
        );

        if (!period) {
            throw CustomException('Leave period not found', 404);
        }

        let allocations = period.allocations || [];

        // Apply filters
        if (leaveType) {
            allocations = allocations.filter(a => a.leaveType === leaveType);
        }

        // Build employee map for department filtering
        const employeeMap = {};
        (firm.hr?.employees || []).forEach(e => {
            employeeMap[e._id?.toString()] = e;
        });

        if (department) {
            allocations = allocations.filter(a => {
                const emp = employeeMap[a.employeeId?.toString()];
                return emp?.department === department;
            });
        }

        // Enrich with employee details
        const enrichedAllocations = allocations.map(a => {
            const emp = employeeMap[a.employeeId?.toString()];
            return {
                ...a,
                employeeName: emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : 'Unknown',
                employeeNumber: emp?.employeeNumber,
                department: emp?.department,
                remaining: (a.days || 0) - (a.used || 0)
            };
        });

        const total = enrichedAllocations.length;
        const paginatedAllocations = enrichedAllocations.slice((page - 1) * limit, page * limit);

        res.json({
            success: true,
            data: paginatedAllocations,
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
