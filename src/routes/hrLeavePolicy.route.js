/**
 * HR Leave Policy Routes
 *
 * Routes for leave policies and assignments at /api/hr/leave-policies
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

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ALLOWED_POLICY_FIELDS = [
    'name', 'nameAr', 'code', 'description', 'descriptionAr',
    'leaveTypes', 'accrualRules', 'carryForwardRules', 'encashmentRules',
    'eligibilityRules', 'documentationRequired', 'approvalWorkflow',
    'halfDayAllowed', 'negativeBalanceAllowed', 'maxNegativeBalance',
    'probationRestrictions', 'noticeRequirements', 'blackoutDates',
    'isActive', 'isDefault', 'applicableTo', 'excludedEmployees',
    'effectiveFrom', 'effectiveTo', 'priority'
];

const ALLOWED_ASSIGNMENT_FIELDS = [
    'employeeId', 'policyId', 'effectiveFrom', 'effectiveTo',
    'overrides', 'status', 'notes'
];

/**
 * GET /api/hr/leave-policies
 * List all leave policies
 */
router.get('/', async (req, res) => {
    try {
        const { search, isActive } = req.query;
        const { page, limit, skip } = sanitizePagination(req.query, { maxLimit: 100 });

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leavePolicies');

        let policies = firm?.settings?.leavePolicies || [];

        if (typeof isActive === 'string') {
            policies = policies.filter(p => p.isActive === (isActive === 'true'));
        }

        if (search && search.trim()) {
            const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
            policies = policies.filter(p =>
                searchRegex.test(p.name) ||
                searchRegex.test(p.nameAr) ||
                searchRegex.test(p.code)
            );
        }

        const total = policies.length;
        const paginatedPolicies = policies.slice(skip, skip + limit);

        return res.json({
            success: true,
            count: paginatedPolicies.length,
            data: paginatedPolicies,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/leave-policies/stats
 * Get leave policy statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leavePolicies settings.leavePolicyAssignments');

        const policies = firm?.settings?.leavePolicies || [];
        const assignments = firm?.settings?.leavePolicyAssignments || [];

        const stats = {
            totalPolicies: policies.length,
            activePolicies: policies.filter(p => p.isActive).length,
            defaultPolicy: policies.find(p => p.isDefault)?.name || null,
            totalAssignments: assignments.length,
            activeAssignments: assignments.filter(a => a.status === 'active').length,
            policiesWithAssignments: [...new Set(assignments.map(a => a.policyId?.toString()))].length
        };

        return res.json({ success: true, data: stats });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/leave-policies/:id
 * Get single leave policy
 */
router.get('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid policy ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leavePolicies');

        const policy = (firm?.settings?.leavePolicies || [])
            .find(p => p._id.toString() === sanitizedId);

        if (!policy) {
            throw CustomException('Leave policy not found', 404);
        }

        return res.json({ success: true, data: policy });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/leave-policies
 * Create leave policy
 */
router.post('/', async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, ALLOWED_POLICY_FIELDS);

        if (!allowedFields.name) {
            throw CustomException('Policy name is required', 400);
        }

        const policyId = new mongoose.Types.ObjectId();
        const policyData = {
            _id: policyId,
            ...allowedFields,
            createdAt: new Date(),
            createdBy: req.userID
        };

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $push: { 'settings.leavePolicies': policyData } }
        );

        return res.status(201).json({
            success: true,
            message: 'Leave policy created successfully',
            data: policyData
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/leave-policies/bulk
 * Bulk create leave policies
 */
router.post('/bulk', async (req, res) => {
    try {
        const { policies } = req.body;

        if (!Array.isArray(policies) || policies.length === 0) {
            throw CustomException('Array of policies is required', 400);
        }

        if (policies.length > 20) {
            throw CustomException('Maximum 20 policies per bulk create', 400);
        }

        const results = [];
        const errors = [];

        for (let i = 0; i < policies.length; i++) {
            try {
                const policyFields = pickAllowedFields(policies[i], ALLOWED_POLICY_FIELDS);
                if (!policyFields.name) {
                    throw new Error('Policy name is required');
                }

                const policyId = new mongoose.Types.ObjectId();
                const policyData = {
                    _id: policyId,
                    ...policyFields,
                    createdAt: new Date(),
                    createdBy: req.userID
                };

                await Firm.findOneAndUpdate(
                    { _id: req.firmId },
                    { $push: { 'settings.leavePolicies': policyData } }
                );

                results.push({ index: i, success: true, data: policyData });
            } catch (error) {
                errors.push({ index: i, success: false, error: error.message });
            }
        }

        return res.status(201).json({
            success: true,
            message: `Created ${results.length} policies, ${errors.length} failed`,
            data: { created: results, errors }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/hr/leave-policies/:id
 * Update leave policy
 */
router.patch('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid policy ID format', 400);
        }

        const allowedFields = pickAllowedFields(req.body, ALLOWED_POLICY_FIELDS);

        const result = await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.leavePolicies._id': sanitizedId
            },
            {
                $set: Object.keys(allowedFields).reduce((acc, key) => {
                    acc[`settings.leavePolicies.$.${key}`] = allowedFields[key];
                    return acc;
                }, {
                    'settings.leavePolicies.$.updatedAt': new Date(),
                    'settings.leavePolicies.$.updatedBy': req.userID
                })
            },
            { new: true }
        );

        if (!result) {
            throw CustomException('Leave policy not found', 404);
        }

        const policy = result.settings.leavePolicies.find(
            p => p._id.toString() === sanitizedId
        );

        return res.json({
            success: true,
            message: 'Leave policy updated successfully',
            data: policy
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * DELETE /api/hr/leave-policies/:id
 * Delete leave policy
 */
router.delete('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid policy ID format', 400);
        }

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $pull: { 'settings.leavePolicies': { _id: sanitizedId } } }
        );

        return res.json({
            success: true,
            message: 'Leave policy deleted successfully'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/leave-policies/:id/set-default
 * Set policy as default
 */
router.post('/:id/set-default', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid policy ID format', 400);
        }

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $set: { 'settings.leavePolicies.$[].isDefault': false } }
        );

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.leavePolicies._id': sanitizedId
            },
            { $set: { 'settings.leavePolicies.$.isDefault': true } }
        );

        return res.json({
            success: true,
            message: 'Default leave policy updated'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/hr/leave-policies/:id/status
 * Toggle policy active status
 */
router.patch('/:id/status', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid policy ID format', 400);
        }

        const { isActive } = req.body;
        if (typeof isActive !== 'boolean') {
            throw CustomException('isActive boolean is required', 400);
        }

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.leavePolicies._id': sanitizedId
            },
            { $set: { 'settings.leavePolicies.$.isActive': isActive } }
        );

        return res.json({
            success: true,
            message: `Leave policy ${isActive ? 'activated' : 'deactivated'}`
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/leave-policies/:id/duplicate
 * Duplicate leave policy
 */
router.post('/:id/duplicate', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid policy ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leavePolicies');

        const sourcePolicy = (firm?.settings?.leavePolicies || [])
            .find(p => p._id.toString() === sanitizedId);

        if (!sourcePolicy) {
            throw CustomException('Source policy not found', 404);
        }

        const newPolicyId = new mongoose.Types.ObjectId();
        const policyData = {
            ...sourcePolicy.toObject(),
            _id: newPolicyId,
            name: `${sourcePolicy.name} (Copy)`,
            nameAr: sourcePolicy.nameAr ? `${sourcePolicy.nameAr} (نسخة)` : undefined,
            code: `${sourcePolicy.code}_COPY`,
            isDefault: false,
            createdAt: new Date(),
            createdBy: req.userID
        };

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $push: { 'settings.leavePolicies': policyData } }
        );

        return res.status(201).json({
            success: true,
            message: 'Leave policy duplicated successfully',
            data: policyData
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/leave-policies/compare
 * Compare multiple policies
 */
router.post('/compare', async (req, res) => {
    try {
        const { policyIds } = req.body;

        if (!Array.isArray(policyIds) || policyIds.length < 2) {
            throw CustomException('At least 2 policy IDs are required', 400);
        }

        if (policyIds.length > 5) {
            throw CustomException('Maximum 5 policies can be compared', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.leavePolicies');

        const policies = (firm?.settings?.leavePolicies || [])
            .filter(p => policyIds.includes(p._id.toString()));

        if (policies.length < 2) {
            throw CustomException('Not enough valid policies found', 404);
        }

        return res.json({
            success: true,
            data: {
                policies,
                comparison: {
                    // Basic comparison data
                    fields: ['name', 'leaveTypes', 'accrualRules', 'carryForwardRules'],
                    differences: policies.length
                }
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

module.exports = router;
