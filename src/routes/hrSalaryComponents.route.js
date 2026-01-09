/**
 * HR Salary Components Routes
 *
 * Routes for salary components at /api/hr/salary-components
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

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ALLOWED_COMPONENT_FIELDS = [
    'name', 'nameAr', 'code', 'description', 'descriptionAr',
    'type', 'category', 'calculationType', 'formula', 'percentage',
    'flatAmount', 'minAmount', 'maxAmount', 'taxable', 'gosiApplicable',
    'affectsGratuity', 'affectsOvertime', 'affectsLeaveEncashment',
    'frequency', 'prorated', 'sortOrder', 'isActive', 'isDefault',
    'applicableTo', 'conditions', 'effectiveFrom', 'effectiveTo'
];

const VALID_TYPES = ['earning', 'deduction', 'employer_contribution'];
const VALID_CATEGORIES = ['basic', 'allowance', 'bonus', 'deduction', 'statutory', 'benefit'];
const VALID_CALCULATION_TYPES = ['fixed', 'percentage', 'formula'];

/**
 * GET /api/hr/salary-components
 * List all salary components
 */
router.get('/', async (req, res) => {
    try {
        const { search, type, category, isActive } = req.query;
        const { page, limit, skip } = sanitizePagination(req.query, { maxLimit: 100 });

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.salaryComponents');

        let components = firm?.settings?.salaryComponents || [];

        if (typeof isActive === 'string') {
            components = components.filter(c => c.isActive === (isActive === 'true'));
        }

        if (type && VALID_TYPES.includes(type)) {
            components = components.filter(c => c.type === type);
        }

        if (category && VALID_CATEGORIES.includes(category)) {
            components = components.filter(c => c.category === category);
        }

        if (search && search.trim()) {
            const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
            components = components.filter(c =>
                searchRegex.test(c.name) ||
                searchRegex.test(c.nameAr) ||
                searchRegex.test(c.code)
            );
        }

        const total = components.length;
        const paginatedComponents = components.slice(skip, skip + limit);

        return res.json({
            success: true,
            count: paginatedComponents.length,
            data: paginatedComponents,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/salary-components/earnings
 * Get only earning components
 */
router.get('/earnings', async (req, res) => {
    try {
        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.salaryComponents');

        const earnings = (firm?.settings?.salaryComponents || [])
            .filter(c => c.type === 'earning' && c.isActive)
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        return res.json({
            success: true,
            count: earnings.length,
            data: earnings
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/salary-components/deductions
 * Get only deduction components
 */
router.get('/deductions', async (req, res) => {
    try {
        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.salaryComponents');

        const deductions = (firm?.settings?.salaryComponents || [])
            .filter(c => c.type === 'deduction' && c.isActive)
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        return res.json({
            success: true,
            count: deductions.length,
            data: deductions
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/salary-components/:id
 * Get single salary component
 */
router.get('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid component ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.salaryComponents');

        const component = (firm?.settings?.salaryComponents || [])
            .find(c => c._id.toString() === sanitizedId);

        if (!component) {
            throw CustomException('Salary component not found', 404);
        }

        return res.json({ success: true, data: component });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/salary-components
 * Create salary component
 */
router.post('/', async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, ALLOWED_COMPONENT_FIELDS);

        if (!allowedFields.name) {
            throw CustomException('Component name is required', 400);
        }

        if (!allowedFields.type || !VALID_TYPES.includes(allowedFields.type)) {
            throw CustomException(`Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`, 400);
        }

        if (allowedFields.calculationType && !VALID_CALCULATION_TYPES.includes(allowedFields.calculationType)) {
            throw CustomException(`Invalid calculationType. Must be one of: ${VALID_CALCULATION_TYPES.join(', ')}`, 400);
        }

        const componentId = new mongoose.Types.ObjectId();
        const componentData = {
            _id: componentId,
            ...allowedFields,
            createdAt: new Date(),
            createdBy: req.userID
        };

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $push: { 'settings.salaryComponents': componentData } }
        );

        return res.status(201).json({
            success: true,
            message: 'Salary component created successfully',
            data: componentData
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/salary-components/bulk
 * Bulk create salary components
 */
router.post('/bulk', async (req, res) => {
    try {
        const { components } = req.body;

        if (!Array.isArray(components) || components.length === 0) {
            throw CustomException('Array of components is required', 400);
        }

        if (components.length > 50) {
            throw CustomException('Maximum 50 components per bulk create', 400);
        }

        const results = [];
        const errors = [];

        for (let i = 0; i < components.length; i++) {
            try {
                const compFields = pickAllowedFields(components[i], ALLOWED_COMPONENT_FIELDS);
                if (!compFields.name) {
                    throw new Error('Component name is required');
                }

                if (!compFields.type || !VALID_TYPES.includes(compFields.type)) {
                    throw new Error(`Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`);
                }

                const componentId = new mongoose.Types.ObjectId();
                const componentData = {
                    _id: componentId,
                    ...compFields,
                    createdAt: new Date(),
                    createdBy: req.userID
                };

                await Firm.findOneAndUpdate(
                    { _id: req.firmId },
                    { $push: { 'settings.salaryComponents': componentData } }
                );

                results.push({ index: i, success: true, data: componentData });
            } catch (error) {
                errors.push({ index: i, success: false, error: error.message });
            }
        }

        return res.status(201).json({
            success: true,
            message: `Created ${results.length} components, ${errors.length} failed`,
            data: { created: results, errors }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/salary-components/initialize-defaults
 * Initialize default Saudi salary components
 */
router.post('/initialize-defaults', async (req, res) => {
    try {
        const defaultComponents = [
            // Earnings
            { name: 'Basic Salary', nameAr: 'الراتب الأساسي', code: 'BASIC', type: 'earning', category: 'basic', calculationType: 'fixed', taxable: true, gosiApplicable: true, affectsGratuity: true, sortOrder: 1 },
            { name: 'Housing Allowance', nameAr: 'بدل السكن', code: 'HOUSING', type: 'earning', category: 'allowance', calculationType: 'percentage', percentage: 25, taxable: true, gosiApplicable: false, sortOrder: 2 },
            { name: 'Transportation Allowance', nameAr: 'بدل المواصلات', code: 'TRANSPORT', type: 'earning', category: 'allowance', calculationType: 'fixed', taxable: true, gosiApplicable: false, sortOrder: 3 },
            { name: 'Food Allowance', nameAr: 'بدل الطعام', code: 'FOOD', type: 'earning', category: 'allowance', calculationType: 'fixed', taxable: true, gosiApplicable: false, sortOrder: 4 },
            { name: 'Phone Allowance', nameAr: 'بدل الهاتف', code: 'PHONE', type: 'earning', category: 'allowance', calculationType: 'fixed', taxable: true, gosiApplicable: false, sortOrder: 5 },
            { name: 'Overtime', nameAr: 'العمل الإضافي', code: 'OT', type: 'earning', category: 'bonus', calculationType: 'formula', taxable: true, gosiApplicable: false, sortOrder: 10 },

            // Deductions
            { name: 'GOSI Employee', nameAr: 'التأمينات الاجتماعية - الموظف', code: 'GOSI_EMP', type: 'deduction', category: 'statutory', calculationType: 'percentage', percentage: 9.75, taxable: false, sortOrder: 20 },
            { name: 'Absence Deduction', nameAr: 'خصم الغياب', code: 'ABSENCE', type: 'deduction', category: 'deduction', calculationType: 'formula', taxable: false, sortOrder: 25 },
            { name: 'Late Arrival Deduction', nameAr: 'خصم التأخير', code: 'LATE', type: 'deduction', category: 'deduction', calculationType: 'formula', taxable: false, sortOrder: 26 },

            // Employer Contributions
            { name: 'GOSI Employer', nameAr: 'التأمينات الاجتماعية - صاحب العمل', code: 'GOSI_ER', type: 'employer_contribution', category: 'statutory', calculationType: 'percentage', percentage: 11.75, sortOrder: 30 }
        ];

        const results = [];

        for (const comp of defaultComponents) {
            const componentId = new mongoose.Types.ObjectId();
            const componentData = {
                _id: componentId,
                ...comp,
                isActive: true,
                createdAt: new Date(),
                createdBy: req.userID
            };

            await Firm.findOneAndUpdate(
                { _id: req.firmId },
                { $push: { 'settings.salaryComponents': componentData } }
            );

            results.push(componentData);
        }

        return res.status(201).json({
            success: true,
            message: `Initialized ${results.length} default salary components`,
            data: results
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PUT /api/hr/salary-components/:id
 * Update salary component
 */
router.put('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid component ID format', 400);
        }

        const allowedFields = pickAllowedFields(req.body, ALLOWED_COMPONENT_FIELDS);

        if (allowedFields.type && !VALID_TYPES.includes(allowedFields.type)) {
            throw CustomException(`Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`, 400);
        }

        const result = await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.salaryComponents._id': sanitizedId
            },
            {
                $set: Object.keys(allowedFields).reduce((acc, key) => {
                    acc[`settings.salaryComponents.$.${key}`] = allowedFields[key];
                    return acc;
                }, {
                    'settings.salaryComponents.$.updatedAt': new Date(),
                    'settings.salaryComponents.$.updatedBy': req.userID
                })
            },
            { new: true }
        );

        if (!result) {
            throw CustomException('Salary component not found', 404);
        }

        const component = result.settings.salaryComponents.find(
            c => c._id.toString() === sanitizedId
        );

        return res.json({
            success: true,
            message: 'Salary component updated successfully',
            data: component
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * DELETE /api/hr/salary-components/:id
 * Delete salary component
 */
router.delete('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid component ID format', 400);
        }

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $pull: { 'settings.salaryComponents': { _id: sanitizedId } } }
        );

        return res.json({
            success: true,
            message: 'Salary component deleted successfully'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/hr/salary-components/:id/toggle-status
 * Toggle component active status
 */
router.patch('/:id/toggle-status', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid component ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.salaryComponents');

        const component = (firm?.settings?.salaryComponents || [])
            .find(c => c._id.toString() === sanitizedId);

        if (!component) {
            throw CustomException('Salary component not found', 404);
        }

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.salaryComponents._id': sanitizedId
            },
            { $set: { 'settings.salaryComponents.$.isActive': !component.isActive } }
        );

        return res.json({
            success: true,
            message: `Salary component ${component.isActive ? 'deactivated' : 'activated'}`,
            data: { isActive: !component.isActive }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/hr/salary-components/reorder
 * Reorder salary components
 */
router.patch('/reorder', async (req, res) => {
    try {
        const { order } = req.body;

        if (!Array.isArray(order)) {
            throw CustomException('Array of component IDs with order is required', 400);
        }

        for (const item of order) {
            const sanitizedId = sanitizeObjectId(item.id);
            if (sanitizedId && typeof item.sortOrder === 'number') {
                await Firm.findOneAndUpdate(
                    {
                        _id: req.firmId,
                        'settings.salaryComponents._id': sanitizedId
                    },
                    { $set: { 'settings.salaryComponents.$.sortOrder': item.sortOrder } }
                );
            }
        }

        return res.json({
            success: true,
            message: 'Salary components reordered successfully'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

module.exports = router;
