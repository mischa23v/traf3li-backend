/**
 * Payroll Extended Routes
 *
 * Extended payroll operations - CRUD, approval, processing.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - GET /:id                     - Get payroll run by ID
 * - PUT /:id                     - Update payroll run
 * - DELETE /:id                  - Delete payroll run
 * - POST /:id/approve            - Approve payroll run
 * - POST /:id/process            - Process payroll payments
 * - POST /:id/recalculate        - Recalculate payroll
 * - GET /:id/slips               - Get payslips for run
 * - POST /:id/finalize           - Finalize payroll run
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

// Allowed update fields
const ALLOWED_UPDATE_FIELDS = [
    'name', 'notes', 'paymentDate', 'paymentMethod',
    'bankAccount', 'includeBonus', 'includeDeductions'
];

// Valid statuses
const VALID_STATUSES = ['draft', 'pending_approval', 'approved', 'processing', 'completed', 'cancelled'];

/**
 * GET /:id - Get payroll run by ID
 */
router.get('/:id', async (req, res, next) => {
    try {
        const payrollId = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery).select('hr.payrollRuns').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const payroll = (firm.hr?.payrollRuns || []).find(
            p => p._id?.toString() === payrollId.toString()
        );

        if (!payroll) {
            throw CustomException('Payroll run not found', 404);
        }

        // Calculate summary
        const entries = payroll.entries || [];
        const summary = {
            employeeCount: entries.length,
            totalGross: entries.reduce((sum, e) => sum + (e.grossSalary || 0), 0),
            totalDeductions: entries.reduce((sum, e) => sum + (e.totalDeductions || 0), 0),
            totalNet: entries.reduce((sum, e) => sum + (e.netSalary || 0), 0),
            totalBonus: entries.reduce((sum, e) => sum + (e.bonus || 0), 0),
            totalOvertime: entries.reduce((sum, e) => sum + (e.overtime || 0), 0)
        };

        res.json({
            success: true,
            data: {
                ...payroll,
                summary
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /:id - Update payroll run
 */
router.put('/:id', async (req, res, next) => {
    try {
        const payrollId = sanitizeObjectId(req.params.id, 'id');
        const safeData = pickAllowedFields(req.body, ALLOWED_UPDATE_FIELDS);

        const firm = await Firm.findOne(req.firmQuery).select('hr.payrollRuns');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const payroll = (firm.hr?.payrollRuns || []).find(
            p => p._id?.toString() === payrollId.toString()
        );

        if (!payroll) {
            throw CustomException('Payroll run not found', 404);
        }

        // Can only update draft or pending_approval
        if (!['draft', 'pending_approval'].includes(payroll.status)) {
            throw CustomException(`Cannot update payroll in ${payroll.status} status`, 400);
        }

        // Validate payment date if provided
        if (safeData.paymentDate) {
            const paymentDate = new Date(safeData.paymentDate);
            if (paymentDate < new Date()) {
                throw CustomException('Payment date cannot be in the past', 400);
            }
            safeData.paymentDate = paymentDate;
        }

        // Apply updates
        Object.assign(payroll, safeData);
        payroll.updatedBy = req.userID;
        payroll.updatedAt = new Date();

        await firm.save();

        res.json({
            success: true,
            message: 'Payroll run updated',
            data: payroll
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:id - Delete payroll run
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const payrollId = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery).select('hr.payrollRuns');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const payrollIndex = (firm.hr?.payrollRuns || []).findIndex(
            p => p._id?.toString() === payrollId.toString()
        );

        if (payrollIndex === -1) {
            throw CustomException('Payroll run not found', 404);
        }

        const payroll = firm.hr.payrollRuns[payrollIndex];

        // Can only delete draft or cancelled
        if (!['draft', 'cancelled'].includes(payroll.status)) {
            throw CustomException(`Cannot delete payroll in ${payroll.status} status`, 400);
        }

        firm.hr.payrollRuns.splice(payrollIndex, 1);
        await firm.save();

        res.json({
            success: true,
            message: 'Payroll run deleted'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/approve - Approve payroll run
 */
router.post('/:id/approve', async (req, res, next) => {
    try {
        const payrollId = sanitizeObjectId(req.params.id, 'id');
        const { comments } = req.body;

        const firm = await Firm.findOne(req.firmQuery).select('hr.payrollRuns');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const payroll = (firm.hr?.payrollRuns || []).find(
            p => p._id?.toString() === payrollId.toString()
        );

        if (!payroll) {
            throw CustomException('Payroll run not found', 404);
        }

        if (payroll.status !== 'pending_approval') {
            throw CustomException(`Cannot approve payroll in ${payroll.status} status`, 400);
        }

        // Validate entries exist
        if (!payroll.entries || payroll.entries.length === 0) {
            throw CustomException('Cannot approve payroll with no entries', 400);
        }

        payroll.status = 'approved';
        payroll.approvedBy = req.userID;
        payroll.approvedAt = new Date();
        payroll.approvalComments = comments;

        await firm.save();

        res.json({
            success: true,
            message: 'Payroll run approved',
            data: {
                payrollId,
                status: 'approved',
                approvedAt: payroll.approvedAt,
                employeeCount: payroll.entries.length
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/process - Process payroll payments
 */
router.post('/:id/process', async (req, res, next) => {
    try {
        const payrollId = sanitizeObjectId(req.params.id, 'id');
        const { paymentMethod, bankAccount } = req.body;

        const firm = await Firm.findOne(req.firmQuery).select('hr.payrollRuns');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const payroll = (firm.hr?.payrollRuns || []).find(
            p => p._id?.toString() === payrollId.toString()
        );

        if (!payroll) {
            throw CustomException('Payroll run not found', 404);
        }

        if (payroll.status !== 'approved') {
            throw CustomException(`Cannot process payroll in ${payroll.status} status`, 400);
        }

        // Mark as processing
        payroll.status = 'processing';
        payroll.processingStartedAt = new Date();
        payroll.processingBy = req.userID;

        if (paymentMethod) payroll.paymentMethod = paymentMethod;
        if (bankAccount) payroll.bankAccount = bankAccount;

        // Mark entries as processing
        (payroll.entries || []).forEach(entry => {
            entry.paymentStatus = 'processing';
            entry.processedAt = new Date();
        });

        await firm.save();

        res.json({
            success: true,
            message: 'Payroll processing started',
            data: {
                payrollId,
                status: 'processing',
                processingStartedAt: payroll.processingStartedAt,
                entriesProcessing: payroll.entries?.length || 0
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/recalculate - Recalculate payroll
 */
router.post('/:id/recalculate', async (req, res, next) => {
    try {
        const payrollId = sanitizeObjectId(req.params.id, 'id');
        const { employeeIds } = req.body;

        const firm = await Firm.findOne(req.firmQuery)
            .select('hr.payrollRuns hr.employees hr.salaryComponents');

        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const payroll = (firm.hr?.payrollRuns || []).find(
            p => p._id?.toString() === payrollId.toString()
        );

        if (!payroll) {
            throw CustomException('Payroll run not found', 404);
        }

        // Can only recalculate draft or pending_approval
        if (!['draft', 'pending_approval'].includes(payroll.status)) {
            throw CustomException(`Cannot recalculate payroll in ${payroll.status} status`, 400);
        }

        const employeeMap = {};
        (firm.hr?.employees || []).forEach(e => {
            employeeMap[e._id?.toString()] = e;
        });

        // Get entries to recalculate
        let entriesToRecalc = payroll.entries || [];
        if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
            const safeIds = new Set(employeeIds.map(id =>
                sanitizeObjectId(id, 'employeeId').toString()
            ));
            entriesToRecalc = entriesToRecalc.filter(e =>
                safeIds.has(e.employeeId?.toString())
            );
        }

        let recalculated = 0;

        // Recalculate each entry
        entriesToRecalc.forEach(entry => {
            const employee = employeeMap[entry.employeeId?.toString()];
            if (!employee) return;

            // Basic calculation
            const baseSalary = employee.salary || employee.baseSalary || 0;
            const bonus = entry.bonus || 0;
            const overtime = entry.overtime || 0;

            // Calculate gross
            const grossSalary = baseSalary + bonus + overtime;

            // Calculate deductions
            const deductions = entry.deductions || [];
            const totalDeductions = deductions.reduce((sum, d) => sum + (d.amount || 0), 0);

            // GOSI calculation (Saudi social insurance)
            const gosiEmployee = Math.round(baseSalary * 0.0975 * 100) / 100; // 9.75% employee
            const gosiEmployer = Math.round(baseSalary * 0.1175 * 100) / 100; // 11.75% employer

            // Calculate net
            const netSalary = grossSalary - totalDeductions - gosiEmployee;

            // Update entry
            entry.baseSalary = baseSalary;
            entry.grossSalary = grossSalary;
            entry.totalDeductions = totalDeductions + gosiEmployee;
            entry.netSalary = Math.round(netSalary * 100) / 100;
            entry.gosi = {
                employee: gosiEmployee,
                employer: gosiEmployer
            };
            entry.recalculatedAt = new Date();

            recalculated++;
        });

        payroll.lastRecalculatedAt = new Date();
        payroll.lastRecalculatedBy = req.userID;

        await firm.save();

        // Calculate new totals
        const entries = payroll.entries || [];
        const summary = {
            totalGross: entries.reduce((sum, e) => sum + (e.grossSalary || 0), 0),
            totalDeductions: entries.reduce((sum, e) => sum + (e.totalDeductions || 0), 0),
            totalNet: entries.reduce((sum, e) => sum + (e.netSalary || 0), 0)
        };

        res.json({
            success: true,
            message: 'Payroll recalculated',
            data: {
                payrollId,
                entriesRecalculated: recalculated,
                summary
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:id/slips - Get payslips for run
 */
router.get('/:id/slips', async (req, res, next) => {
    try {
        const payrollId = sanitizeObjectId(req.params.id, 'id');
        const { page, limit } = sanitizePagination(req.query);
        const { department, status } = req.query;

        const firm = await Firm.findOne(req.firmQuery)
            .select('hr.payrollRuns hr.employees')
            .lean();

        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const payroll = (firm.hr?.payrollRuns || []).find(
            p => p._id?.toString() === payrollId.toString()
        );

        if (!payroll) {
            throw CustomException('Payroll run not found', 404);
        }

        // Build employee map
        const employeeMap = {};
        (firm.hr?.employees || []).forEach(e => {
            employeeMap[e._id?.toString()] = e;
        });

        let slips = (payroll.entries || []).map(entry => {
            const emp = employeeMap[entry.employeeId?.toString()];
            return {
                ...entry,
                employeeName: emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : 'Unknown',
                employeeNumber: emp?.employeeNumber,
                department: emp?.department,
                designation: emp?.designation
            };
        });

        // Apply filters
        if (department) {
            slips = slips.filter(s => s.department === department);
        }

        if (status) {
            slips = slips.filter(s => s.paymentStatus === status);
        }

        const total = slips.length;
        slips = slips.slice((page - 1) * limit, page * limit);

        res.json({
            success: true,
            data: slips,
            payrollInfo: {
                name: payroll.name,
                period: payroll.period,
                status: payroll.status,
                paymentDate: payroll.paymentDate
            },
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
 * POST /:id/finalize - Finalize payroll run
 */
router.post('/:id/finalize', async (req, res, next) => {
    try {
        const payrollId = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery).select('hr.payrollRuns');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const payroll = (firm.hr?.payrollRuns || []).find(
            p => p._id?.toString() === payrollId.toString()
        );

        if (!payroll) {
            throw CustomException('Payroll run not found', 404);
        }

        if (payroll.status !== 'processing') {
            throw CustomException(`Cannot finalize payroll in ${payroll.status} status`, 400);
        }

        // Check all entries are paid
        const unpaid = (payroll.entries || []).filter(e =>
            e.paymentStatus !== 'paid' && e.paymentStatus !== 'completed'
        );

        if (unpaid.length > 0) {
            throw CustomException(`${unpaid.length} entries not yet paid. Complete all payments first.`, 400);
        }

        payroll.status = 'completed';
        payroll.completedAt = new Date();
        payroll.completedBy = req.userID;

        // Mark all entries as completed
        (payroll.entries || []).forEach(entry => {
            entry.paymentStatus = 'completed';
        });

        await firm.save();

        // Calculate final summary
        const entries = payroll.entries || [];
        const summary = {
            totalPaid: entries.reduce((sum, e) => sum + (e.netSalary || 0), 0),
            employeesPaid: entries.length
        };

        res.json({
            success: true,
            message: 'Payroll run finalized',
            data: {
                payrollId,
                status: 'completed',
                completedAt: payroll.completedAt,
                summary
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
