/**
 * HR Leave Policy Assignment Routes
 *
 * Routes for leave policy assignments at /api/hr/leave-policy-assignments
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
const User = require('../models/user.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

const ALLOWED_ASSIGNMENT_FIELDS = [
    'employeeId', 'policyId', 'effectiveFrom', 'effectiveTo',
    'overrides', 'status', 'notes'
];

/**
 * GET /api/hr/leave-policy-assignments
 * List all leave policy assignments
 */
router.get('/', async (req, res) => {
    try {
        const { employeeId, policyId, status } = req.query;
        const { page, limit, skip } = sanitizePagination(req.query, { maxLimit: 100 });

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leavePolicyAssignments');

        let assignments = firm?.settings?.leavePolicyAssignments || [];

        if (employeeId) {
            const sanitizedEmployeeId = sanitizeObjectId(employeeId);
            if (sanitizedEmployeeId) {
                assignments = assignments.filter(a =>
                    a.employeeId?.toString() === sanitizedEmployeeId
                );
            }
        }

        if (policyId) {
            const sanitizedPolicyId = sanitizeObjectId(policyId);
            if (sanitizedPolicyId) {
                assignments = assignments.filter(a =>
                    a.policyId?.toString() === sanitizedPolicyId
                );
            }
        }

        if (status) {
            assignments = assignments.filter(a => a.status === status);
        }

        const total = assignments.length;
        const paginatedAssignments = assignments.slice(skip, skip + limit);

        return res.json({
            success: true,
            count: paginatedAssignments.length,
            data: paginatedAssignments,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/leave-policy-assignments/unassigned-employees
 * Get employees without active policy assignments
 */
router.get('/unassigned-employees', async (req, res) => {
    try {
        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leavePolicyAssignments');

        const assignments = firm?.settings?.leavePolicyAssignments || [];
        const assignedEmployeeIds = assignments
            .filter(a => a.status === 'active')
            .map(a => a.employeeId?.toString());

        // Get employees from firm
        const employees = await User.find({
            ...req.firmQuery,
            role: { $in: ['employee', 'staff', 'member'] },
            isActive: true
        }).select('firstName lastName email');

        const unassigned = employees.filter(e =>
            !assignedEmployeeIds.includes(e._id.toString())
        );

        return res.json({
            success: true,
            count: unassigned.length,
            data: unassigned
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/leave-policy-assignments/:id
 * Get single assignment
 */
router.get('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid assignment ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leavePolicyAssignments');

        const assignment = (firm?.settings?.leavePolicyAssignments || [])
            .find(a => a._id.toString() === sanitizedId);

        if (!assignment) {
            throw CustomException('Leave policy assignment not found', 404);
        }

        return res.json({ success: true, data: assignment });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/leave-policy-assignments/employee/:employeeId/current
 * Get current active assignment for an employee
 */
router.get('/employee/:employeeId/current', async (req, res) => {
    try {
        const sanitizedEmployeeId = sanitizeObjectId(req.params.employeeId);
        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employee ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leavePolicyAssignments settings.leavePolicies');

        const assignment = (firm?.settings?.leavePolicyAssignments || [])
            .find(a =>
                a.employeeId?.toString() === sanitizedEmployeeId &&
                a.status === 'active'
            );

        if (!assignment) {
            return res.json({
                success: true,
                data: null,
                message: 'No active assignment found'
            });
        }

        // Include policy details
        const policy = (firm?.settings?.leavePolicies || [])
            .find(p => p._id.toString() === assignment.policyId?.toString());

        return res.json({
            success: true,
            data: {
                ...assignment.toObject(),
                policy
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/leave-policy-assignments/employee/:employeeId/history
 * Get assignment history for an employee
 */
router.get('/employee/:employeeId/history', async (req, res) => {
    try {
        const sanitizedEmployeeId = sanitizeObjectId(req.params.employeeId);
        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employee ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leavePolicyAssignments');

        const history = (firm?.settings?.leavePolicyAssignments || [])
            .filter(a => a.employeeId?.toString() === sanitizedEmployeeId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return res.json({
            success: true,
            count: history.length,
            data: history
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/leave-policy-assignments/employee/:employeeId/allocation-summary
 * Get leave allocation summary for an employee
 */
router.get('/employee/:employeeId/allocation-summary', async (req, res) => {
    try {
        const sanitizedEmployeeId = sanitizeObjectId(req.params.employeeId);
        if (!sanitizedEmployeeId) {
            throw CustomException('Invalid employee ID format', 400);
        }

        const { year } = req.query;
        const targetYear = year ? parseInt(year) : new Date().getFullYear();

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leavePolicyAssignments settings.leavePolicies');

        const assignment = (firm?.settings?.leavePolicyAssignments || [])
            .find(a =>
                a.employeeId?.toString() === sanitizedEmployeeId &&
                a.status === 'active'
            );

        if (!assignment) {
            return res.json({
                success: true,
                data: {
                    hasActivePolicy: false,
                    allocations: []
                }
            });
        }

        const policy = (firm?.settings?.leavePolicies || [])
            .find(p => p._id.toString() === assignment.policyId?.toString());

        return res.json({
            success: true,
            data: {
                hasActivePolicy: true,
                policy: policy?.name,
                year: targetYear,
                allocations: policy?.leaveTypes || []
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/leave-policy-assignments
 * Create leave policy assignment
 */
router.post('/', async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, ALLOWED_ASSIGNMENT_FIELDS);

        if (!allowedFields.employeeId || !allowedFields.policyId) {
            throw CustomException('Employee ID and Policy ID are required', 400);
        }

        allowedFields.employeeId = sanitizeObjectId(allowedFields.employeeId);
        allowedFields.policyId = sanitizeObjectId(allowedFields.policyId);

        if (!allowedFields.employeeId || !allowedFields.policyId) {
            throw CustomException('Invalid ID format', 400);
        }

        const assignmentId = new mongoose.Types.ObjectId();
        const assignmentData = {
            _id: assignmentId,
            ...allowedFields,
            status: allowedFields.status || 'active',
            createdAt: new Date(),
            createdBy: req.userID
        };

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $push: { 'settings.leavePolicyAssignments': assignmentData } }
        );

        return res.status(201).json({
            success: true,
            message: 'Leave policy assignment created successfully',
            data: assignmentData
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/leave-policy-assignments/bulk
 * Bulk create assignments
 */
router.post('/bulk', async (req, res) => {
    try {
        const { assignments } = req.body;

        if (!Array.isArray(assignments) || assignments.length === 0) {
            throw CustomException('Array of assignments is required', 400);
        }

        if (assignments.length > 50) {
            throw CustomException('Maximum 50 assignments per bulk create', 400);
        }

        const results = [];
        const errors = [];

        for (let i = 0; i < assignments.length; i++) {
            try {
                const fields = pickAllowedFields(assignments[i], ALLOWED_ASSIGNMENT_FIELDS);

                if (!fields.employeeId || !fields.policyId) {
                    throw new Error('Employee ID and Policy ID are required');
                }

                fields.employeeId = sanitizeObjectId(fields.employeeId);
                fields.policyId = sanitizeObjectId(fields.policyId);

                const assignmentId = new mongoose.Types.ObjectId();
                const assignmentData = {
                    _id: assignmentId,
                    ...fields,
                    status: fields.status || 'active',
                    createdAt: new Date(),
                    createdBy: req.userID
                };

                await Firm.findOneAndUpdate(
                    { _id: req.firmId },
                    { $push: { 'settings.leavePolicyAssignments': assignmentData } }
                );

                results.push({ index: i, success: true, data: assignmentData });
            } catch (error) {
                errors.push({ index: i, success: false, error: error.message });
            }
        }

        return res.status(201).json({
            success: true,
            message: `Created ${results.length} assignments, ${errors.length} failed`,
            data: { created: results, errors }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/leave-policy-assignments/preview
 * Preview assignment impact
 */
router.post('/preview', async (req, res) => {
    try {
        const { employeeIds, policyId } = req.body;

        if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
            throw CustomException('Array of employee IDs is required', 400);
        }

        const sanitizedPolicyId = sanitizeObjectId(policyId);
        if (!sanitizedPolicyId) {
            throw CustomException('Invalid policy ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leavePolicies settings.leavePolicyAssignments');

        const policy = (firm?.settings?.leavePolicies || [])
            .find(p => p._id.toString() === sanitizedPolicyId);

        if (!policy) {
            throw CustomException('Policy not found', 404);
        }

        // Check current assignments
        const currentAssignments = (firm?.settings?.leavePolicyAssignments || [])
            .filter(a =>
                employeeIds.includes(a.employeeId?.toString()) &&
                a.status === 'active'
            );

        return res.json({
            success: true,
            data: {
                policy: { name: policy.name, code: policy.code },
                affectedEmployees: employeeIds.length,
                currentlyAssigned: currentAssignments.length,
                newAssignments: employeeIds.length - currentAssignments.length
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/leave-policy-assignments/:id/cancel
 * Cancel assignment
 */
router.post('/:id/cancel', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid assignment ID format', 400);
        }

        const { reason } = req.body;

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.leavePolicyAssignments._id': sanitizedId
            },
            {
                $set: {
                    'settings.leavePolicyAssignments.$.status': 'cancelled',
                    'settings.leavePolicyAssignments.$.cancelledAt': new Date(),
                    'settings.leavePolicyAssignments.$.cancelReason': reason,
                    'settings.leavePolicyAssignments.$.cancelledBy': req.userID
                }
            }
        );

        return res.json({
            success: true,
            message: 'Leave policy assignment cancelled'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/hr/leave-policy-assignments/:id/dates
 * Update assignment dates
 */
router.patch('/:id/dates', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid assignment ID format', 400);
        }

        const { effectiveFrom, effectiveTo } = req.body;

        const updates = {};
        if (effectiveFrom) {
            updates['settings.leavePolicyAssignments.$.effectiveFrom'] = new Date(effectiveFrom);
        }
        if (effectiveTo) {
            updates['settings.leavePolicyAssignments.$.effectiveTo'] = new Date(effectiveTo);
        }

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.leavePolicyAssignments._id': sanitizedId
            },
            { $set: updates }
        );

        return res.json({
            success: true,
            message: 'Assignment dates updated'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

module.exports = router;
