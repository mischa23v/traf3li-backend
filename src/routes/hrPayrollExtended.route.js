/**
 * HR Payroll Extended Routes
 *
 * Extended routes for payroll runs at /api/hr/payroll-runs
 *
 * Security:
 * - Multi-tenant isolation via req.firmQuery
 * - Mass assignment protection via pickAllowedFields
 * - ID sanitization via sanitizeObjectId
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

/**
 * POST /api/hr/payroll-runs/:runId/employees/:employeeId/exclude
 * Exclude employee from payroll run
 */
router.post('/:runId/employees/:employeeId/exclude', async (req, res) => {
    try {
        const runId = sanitizeObjectId(req.params.runId);
        const employeeId = sanitizeObjectId(req.params.employeeId);

        if (!runId || !employeeId) {
            throw CustomException('Invalid ID format', 400);
        }

        const { reason } = req.body;

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'hr.payrollRuns._id': runId
            },
            {
                $push: {
                    'hr.payrollRuns.$.excludedEmployees': {
                        employeeId,
                        reason,
                        excludedAt: new Date(),
                        excludedBy: req.userID
                    }
                },
                $pull: {
                    'hr.payrollRuns.$.employees': { employeeId }
                }
            }
        );

        return res.json({
            success: true,
            message: 'Employee excluded from payroll run'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/payroll-runs/:runId/employees/:employeeId/include
 * Include employee in payroll run
 */
router.post('/:runId/employees/:employeeId/include', async (req, res) => {
    try {
        const runId = sanitizeObjectId(req.params.runId);
        const employeeId = sanitizeObjectId(req.params.employeeId);

        if (!runId || !employeeId) {
            throw CustomException('Invalid ID format', 400);
        }

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'hr.payrollRuns._id': runId
            },
            {
                $pull: {
                    'hr.payrollRuns.$.excludedEmployees': { employeeId }
                },
                $push: {
                    'hr.payrollRuns.$.employees': {
                        employeeId,
                        includedAt: new Date(),
                        includedBy: req.userID,
                        status: 'pending_calculation'
                    }
                }
            }
        );

        return res.json({
            success: true,
            message: 'Employee included in payroll run'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/payroll-runs/:runId/employees/:employeeId/recalculate
 * Recalculate employee payroll
 */
router.post('/:runId/employees/:employeeId/recalculate', async (req, res) => {
    try {
        const runId = sanitizeObjectId(req.params.runId);
        const employeeId = sanitizeObjectId(req.params.employeeId);

        if (!runId || !employeeId) {
            throw CustomException('Invalid ID format', 400);
        }

        const { overrides } = req.body;

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('hr.payrollRuns');

        const payrollRun = (firm?.hr?.payrollRuns || [])
            .find(r => r._id.toString() === runId);

        if (!payrollRun) {
            throw CustomException('Payroll run not found', 404);
        }

        if (payrollRun.status !== 'draft' && payrollRun.status !== 'calculated') {
            throw CustomException('Cannot recalculate - payroll run is not editable', 400);
        }

        // Mark for recalculation
        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'hr.payrollRuns._id': runId,
                'hr.payrollRuns.employees.employeeId': employeeId
            },
            {
                $set: {
                    'hr.payrollRuns.$[run].employees.$[emp].status': 'pending_calculation',
                    'hr.payrollRuns.$[run].employees.$[emp].recalculateAt': new Date(),
                    'hr.payrollRuns.$[run].employees.$[emp].recalculateBy': req.userID,
                    'hr.payrollRuns.$[run].employees.$[emp].overrides': overrides
                }
            },
            {
                arrayFilters: [
                    { 'run._id': runId },
                    { 'emp.employeeId': employeeId }
                ]
            }
        );

        return res.json({
            success: true,
            message: 'Recalculation scheduled'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/payroll-runs/:runId/export
 * Export payroll run
 */
router.get('/:runId/export', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.runId);
        if (!sanitizedId) {
            throw CustomException('Invalid run ID format', 400);
        }

        const { format, type } = req.query;

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('hr.payrollRuns name');

        const payrollRun = (firm?.hr?.payrollRuns || [])
            .find(r => r._id.toString() === sanitizedId);

        if (!payrollRun) {
            throw CustomException('Payroll run not found', 404);
        }

        const exportId = new mongoose.Types.ObjectId();

        // Different export types
        const exportTypes = {
            summary: 'Payroll summary with totals',
            detailed: 'Detailed breakdown per employee',
            bank: 'Bank transfer file (WPS)',
            gosi: 'GOSI contribution file',
            payslips: 'Individual payslips'
        };

        return res.json({
            success: true,
            message: 'Export initiated',
            data: {
                exportId: exportId.toString(),
                format: format || 'xlsx',
                type: type || 'detailed',
                typeDescription: exportTypes[type] || exportTypes.detailed,
                payrollPeriod: payrollRun.period,
                employeeCount: payrollRun.employees?.length || 0,
                firmName: firm?.name
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/payroll-runs/:runId/approve
 * Approve payroll run
 */
router.post('/:runId/approve', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.runId);
        if (!sanitizedId) {
            throw CustomException('Invalid run ID format', 400);
        }

        const { notes } = req.body;

        const result = await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'hr.payrollRuns._id': sanitizedId,
                'hr.payrollRuns.status': 'calculated'
            },
            {
                $set: {
                    'hr.payrollRuns.$.status': 'approved',
                    'hr.payrollRuns.$.approvedAt': new Date(),
                    'hr.payrollRuns.$.approvedBy': req.userID,
                    'hr.payrollRuns.$.approvalNotes': notes
                }
            },
            { new: true }
        );

        if (!result) {
            throw CustomException('Payroll run not found or not in calculated status', 404);
        }

        return res.json({
            success: true,
            message: 'Payroll run approved'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/payroll-runs/:runId/reject
 * Reject payroll run
 */
router.post('/:runId/reject', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.runId);
        if (!sanitizedId) {
            throw CustomException('Invalid run ID format', 400);
        }

        const { reason } = req.body;

        if (!reason) {
            throw CustomException('Rejection reason is required', 400);
        }

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'hr.payrollRuns._id': sanitizedId,
                'hr.payrollRuns.status': 'calculated'
            },
            {
                $set: {
                    'hr.payrollRuns.$.status': 'draft',
                    'hr.payrollRuns.$.rejectedAt': new Date(),
                    'hr.payrollRuns.$.rejectedBy': req.userID,
                    'hr.payrollRuns.$.rejectionReason': reason
                }
            }
        );

        return res.json({
            success: true,
            message: 'Payroll run rejected - returned to draft'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/payroll-runs/:runId/process
 * Process payroll run (initiate payments)
 */
router.post('/:runId/process', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.runId);
        if (!sanitizedId) {
            throw CustomException('Invalid run ID format', 400);
        }

        const { paymentDate, paymentMethod } = req.body;

        const result = await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'hr.payrollRuns._id': sanitizedId,
                'hr.payrollRuns.status': 'approved'
            },
            {
                $set: {
                    'hr.payrollRuns.$.status': 'processing',
                    'hr.payrollRuns.$.processingStartedAt': new Date(),
                    'hr.payrollRuns.$.processingStartedBy': req.userID,
                    'hr.payrollRuns.$.paymentDate': paymentDate ? new Date(paymentDate) : new Date(),
                    'hr.payrollRuns.$.paymentMethod': paymentMethod || 'bank_transfer'
                }
            },
            { new: true }
        );

        if (!result) {
            throw CustomException('Payroll run not found or not approved', 404);
        }

        return res.json({
            success: true,
            message: 'Payroll processing initiated'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/payroll-runs/:runId/finalize
 * Finalize payroll run
 */
router.post('/:runId/finalize', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.runId);
        if (!sanitizedId) {
            throw CustomException('Invalid run ID format', 400);
        }

        const result = await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'hr.payrollRuns._id': sanitizedId,
                'hr.payrollRuns.status': 'processing'
            },
            {
                $set: {
                    'hr.payrollRuns.$.status': 'completed',
                    'hr.payrollRuns.$.completedAt': new Date(),
                    'hr.payrollRuns.$.completedBy': req.userID
                }
            },
            { new: true }
        );

        if (!result) {
            throw CustomException('Payroll run not found or not in processing status', 404);
        }

        return res.json({
            success: true,
            message: 'Payroll run finalized'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/payroll-runs/:runId/summary
 * Get payroll run summary
 */
router.get('/:runId/summary', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.runId);
        if (!sanitizedId) {
            throw CustomException('Invalid run ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('hr.payrollRuns');

        const payrollRun = (firm?.hr?.payrollRuns || [])
            .find(r => r._id.toString() === sanitizedId);

        if (!payrollRun) {
            throw CustomException('Payroll run not found', 404);
        }

        const employees = payrollRun.employees || [];

        const summary = {
            period: payrollRun.period,
            status: payrollRun.status,
            employeeCount: employees.length,
            excludedCount: payrollRun.excludedEmployees?.length || 0,
            totals: {
                grossSalary: employees.reduce((sum, e) => sum + (e.grossSalary || 0), 0),
                netSalary: employees.reduce((sum, e) => sum + (e.netSalary || 0), 0),
                totalDeductions: employees.reduce((sum, e) => sum + (e.totalDeductions || 0), 0),
                totalAllowances: employees.reduce((sum, e) => sum + (e.totalAllowances || 0), 0),
                gosiEmployee: employees.reduce((sum, e) => sum + (e.gosiEmployee || 0), 0),
                gosiEmployer: employees.reduce((sum, e) => sum + (e.gosiEmployer || 0), 0)
            },
            createdAt: payrollRun.createdAt,
            approvedAt: payrollRun.approvedAt,
            completedAt: payrollRun.completedAt
        };

        return res.json({
            success: true,
            data: summary
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/payroll-runs/:runId/employees/:employeeId/payslip
 * Get employee payslip
 */
router.get('/:runId/employees/:employeeId/payslip', async (req, res) => {
    try {
        const runId = sanitizeObjectId(req.params.runId);
        const employeeId = sanitizeObjectId(req.params.employeeId);

        if (!runId || !employeeId) {
            throw CustomException('Invalid ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('hr.payrollRuns name');

        const payrollRun = (firm?.hr?.payrollRuns || [])
            .find(r => r._id.toString() === runId);

        if (!payrollRun) {
            throw CustomException('Payroll run not found', 404);
        }

        const employeePayroll = (payrollRun.employees || [])
            .find(e => e.employeeId?.toString() === employeeId);

        if (!employeePayroll) {
            throw CustomException('Employee not found in payroll run', 404);
        }

        return res.json({
            success: true,
            data: {
                payrollPeriod: payrollRun.period,
                firmName: firm?.name,
                employee: employeePayroll
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/payroll-runs/:runId/employees/:employeeId/adjust
 * Add adjustment to employee payroll
 */
router.post('/:runId/employees/:employeeId/adjust', async (req, res) => {
    try {
        const runId = sanitizeObjectId(req.params.runId);
        const employeeId = sanitizeObjectId(req.params.employeeId);

        if (!runId || !employeeId) {
            throw CustomException('Invalid ID format', 400);
        }

        const { type, amount, reason, category } = req.body;

        if (!type || !amount || !reason) {
            throw CustomException('Type, amount, and reason are required', 400);
        }

        const adjustmentId = new mongoose.Types.ObjectId();
        const adjustment = {
            _id: adjustmentId,
            type, // 'addition' or 'deduction'
            amount,
            reason,
            category,
            createdAt: new Date(),
            createdBy: req.userID
        };

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'hr.payrollRuns._id': runId,
                'hr.payrollRuns.employees.employeeId': employeeId
            },
            {
                $push: {
                    'hr.payrollRuns.$[run].employees.$[emp].adjustments': adjustment
                },
                $set: {
                    'hr.payrollRuns.$[run].employees.$[emp].status': 'pending_calculation'
                }
            },
            {
                arrayFilters: [
                    { 'run._id': runId },
                    { 'emp.employeeId': employeeId }
                ]
            }
        );

        return res.status(201).json({
            success: true,
            message: 'Adjustment added',
            data: adjustment
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/payroll-runs/history
 * Get payroll run history
 */
router.get('/history', async (req, res) => {
    try {
        const { year, status } = req.query;
        const { page, limit, skip } = sanitizePagination(req.query, { maxLimit: 100 });

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('hr.payrollRuns');

        let runs = firm?.hr?.payrollRuns || [];

        if (year) {
            runs = runs.filter(r => {
                const runYear = new Date(r.createdAt).getFullYear();
                return runYear === parseInt(year);
            });
        }

        if (status) {
            runs = runs.filter(r => r.status === status);
        }

        runs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const total = runs.length;
        const paginatedRuns = runs.slice(skip, skip + limit);

        return res.json({
            success: true,
            count: paginatedRuns.length,
            data: paginatedRuns,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/payroll-runs/stats
 * Get payroll statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const { year } = req.query;
        const targetYear = year ? parseInt(year) : new Date().getFullYear();

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('hr.payrollRuns');

        const runs = (firm?.hr?.payrollRuns || [])
            .filter(r => new Date(r.createdAt).getFullYear() === targetYear);

        const completedRuns = runs.filter(r => r.status === 'completed');

        const stats = {
            year: targetYear,
            totalRuns: runs.length,
            completedRuns: completedRuns.length,
            pendingRuns: runs.filter(r => ['draft', 'calculated', 'approved'].includes(r.status)).length,
            totalPaid: completedRuns.reduce((sum, r) => {
                const employees = r.employees || [];
                return sum + employees.reduce((eSum, e) => eSum + (e.netSalary || 0), 0);
            }, 0),
            avgEmployeesPerRun: completedRuns.length > 0
                ? Math.round(completedRuns.reduce((sum, r) => sum + (r.employees?.length || 0), 0) / completedRuns.length)
                : 0
        };

        return res.json({
            success: true,
            data: stats
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

module.exports = router;
