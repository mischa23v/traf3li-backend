/**
 * HR Expense Policy Routes
 *
 * Routes for expense policies at /api/hr/expense-policies
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

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ALLOWED_POLICY_FIELDS = [
    'name', 'nameAr', 'code', 'description', 'descriptionAr',
    'expenseCategories', 'limits', 'requiresApproval', 'approvalLevels',
    'receiptRequired', 'receiptThreshold', 'mileageRate', 'perDiemRates',
    'advanceAllowed', 'advanceLimit', 'currency', 'isActive', 'isDefault',
    'applicableTo', 'excludedEmployees', 'effectiveFrom', 'effectiveTo'
];

/**
 * GET /api/hr/expense-policies
 * List all expense policies
 */
router.get('/', async (req, res) => {
    try {
        const { search, isActive } = req.query;
        const { page, limit, skip } = sanitizePagination(req.query, { maxLimit: 100 });

        // Get firm with expense policies
        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.expensePolicies');

        let policies = firm?.settings?.expensePolicies || [];

        // Filter by active status
        if (typeof isActive === 'string') {
            const activeFilter = isActive === 'true';
            policies = policies.filter(p => p.isActive === activeFilter);
        }

        // Filter by search
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
 * GET /api/hr/expense-policies/default
 * Get default expense policy
 */
router.get('/default', async (req, res) => {
    try {
        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.expensePolicies');

        const policies = firm?.settings?.expensePolicies || [];
        const defaultPolicy = policies.find(p => p.isDefault) || policies[0];

        return res.json({
            success: true,
            data: defaultPolicy || null
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/expense-policies/:id
 * Get single expense policy
 */
router.get('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid policy ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.expensePolicies');

        const policy = (firm?.settings?.expensePolicies || [])
            .find(p => p._id.toString() === sanitizedId);

        if (!policy) {
            throw CustomException('Expense policy not found', 404);
        }

        return res.json({ success: true, data: policy });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/expense-policies
 * Create expense policy
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
            { $push: { 'settings.expensePolicies': policyData } }
        );

        return res.status(201).json({
            success: true,
            message: 'Expense policy created successfully',
            data: policyData
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PUT /api/hr/expense-policies/:id
 * Update expense policy
 */
router.put('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid policy ID format', 400);
        }

        const allowedFields = pickAllowedFields(req.body, ALLOWED_POLICY_FIELDS);

        const result = await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.expensePolicies._id': sanitizedId
            },
            {
                $set: Object.keys(allowedFields).reduce((acc, key) => {
                    acc[`settings.expensePolicies.$.${key}`] = allowedFields[key];
                    return acc;
                }, {
                    'settings.expensePolicies.$.updatedAt': new Date(),
                    'settings.expensePolicies.$.updatedBy': req.userID
                })
            },
            { new: true }
        );

        if (!result) {
            throw CustomException('Expense policy not found', 404);
        }

        const policy = result.settings.expensePolicies.find(
            p => p._id.toString() === sanitizedId
        );

        return res.json({
            success: true,
            message: 'Expense policy updated successfully',
            data: policy
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * DELETE /api/hr/expense-policies/:id
 * Delete expense policy
 */
router.delete('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid policy ID format', 400);
        }

        const result = await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $pull: { 'settings.expensePolicies': { _id: sanitizedId } } },
            { new: true }
        );

        return res.json({
            success: true,
            message: 'Expense policy deleted successfully'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/hr/expense-policies/:id/default
 * Set policy as default
 */
router.patch('/:id/default', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid policy ID format', 400);
        }

        // First, unset all defaults
        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $set: { 'settings.expensePolicies.$[].isDefault': false } }
        );

        // Then set this one as default
        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.expensePolicies._id': sanitizedId
            },
            { $set: { 'settings.expensePolicies.$.isDefault': true } }
        );

        return res.json({
            success: true,
            message: 'Default expense policy updated'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/hr/expense-policies/:id/toggle-status
 * Toggle policy active status
 */
router.patch('/:id/toggle-status', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid policy ID format', 400);
        }

        // Get current status
        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.expensePolicies');

        const policy = (firm?.settings?.expensePolicies || [])
            .find(p => p._id.toString() === sanitizedId);

        if (!policy) {
            throw CustomException('Expense policy not found', 404);
        }

        // Toggle status
        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.expensePolicies._id': sanitizedId
            },
            { $set: { 'settings.expensePolicies.$.isActive': !policy.isActive } }
        );

        return res.json({
            success: true,
            message: `Expense policy ${policy.isActive ? 'deactivated' : 'activated'}`,
            data: { isActive: !policy.isActive }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/expense-policies/:id/duplicate
 * Duplicate expense policy
 */
router.post('/:id/duplicate', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid policy ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.expensePolicies');

        const sourcePolicy = (firm?.settings?.expensePolicies || [])
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
            { $push: { 'settings.expensePolicies': policyData } }
        );

        return res.status(201).json({
            success: true,
            message: 'Expense policy duplicated successfully',
            data: policyData
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

module.exports = router;
