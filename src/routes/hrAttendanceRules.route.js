/**
 * HR Attendance Rules Routes
 *
 * Routes for attendance rules at /api/hr/attendance-rules
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

const ALLOWED_RULE_FIELDS = [
    'name', 'nameAr', 'code', 'description', 'descriptionAr',
    'workingHours', 'flexibleHours', 'coreHours', 'breakDuration',
    'overtimeRules', 'lateArrivalGrace', 'earlyDepartureGrace',
    'minimumWorkHours', 'halfDayHours', 'roundingRules',
    'penaltyRules', 'bonusRules', 'geofencing', 'ipRestrictions',
    'biometricRequired', 'selfieRequired', 'remoteWorkAllowed',
    'isActive', 'isDefault', 'applicableTo', 'excludedEmployees',
    'effectiveFrom', 'effectiveTo', 'workDays'
];

/**
 * GET /api/hr/attendance-rules
 * List all attendance rules
 */
router.get('/', async (req, res) => {
    try {
        const { search, isActive } = req.query;
        const { page, limit, skip } = sanitizePagination(req.query, { maxLimit: 100 });

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.attendanceRules');

        let rules = firm?.settings?.attendanceRules || [];

        if (typeof isActive === 'string') {
            rules = rules.filter(r => r.isActive === (isActive === 'true'));
        }

        if (search && search.trim()) {
            const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
            rules = rules.filter(r =>
                searchRegex.test(r.name) ||
                searchRegex.test(r.nameAr) ||
                searchRegex.test(r.code)
            );
        }

        const total = rules.length;
        const paginatedRules = rules.slice(skip, skip + limit);

        return res.json({
            success: true,
            count: paginatedRules.length,
            data: paginatedRules,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/attendance-rules/default
 * Get default attendance rule
 */
router.get('/default', async (req, res) => {
    try {
        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.attendanceRules');

        const rules = firm?.settings?.attendanceRules || [];
        const defaultRule = rules.find(r => r.isDefault) || rules[0];

        return res.json({
            success: true,
            data: defaultRule || null
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/attendance-rules/:id
 * Get single attendance rule
 */
router.get('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid rule ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.attendanceRules');

        const rule = (firm?.settings?.attendanceRules || [])
            .find(r => r._id.toString() === sanitizedId);

        if (!rule) {
            throw CustomException('Attendance rule not found', 404);
        }

        return res.json({ success: true, data: rule });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/attendance-rules
 * Create attendance rule
 */
router.post('/', async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, ALLOWED_RULE_FIELDS);

        if (!allowedFields.name) {
            throw CustomException('Rule name is required', 400);
        }

        const ruleId = new mongoose.Types.ObjectId();
        const ruleData = {
            _id: ruleId,
            ...allowedFields,
            createdAt: new Date(),
            createdBy: req.userID
        };

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $push: { 'settings.attendanceRules': ruleData } }
        );

        return res.status(201).json({
            success: true,
            message: 'Attendance rule created successfully',
            data: ruleData
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/attendance-rules/bulk
 * Bulk create attendance rules
 */
router.post('/bulk', async (req, res) => {
    try {
        const { rules } = req.body;

        if (!Array.isArray(rules) || rules.length === 0) {
            throw CustomException('Array of rules is required', 400);
        }

        if (rules.length > 20) {
            throw CustomException('Maximum 20 rules per bulk create', 400);
        }

        const results = [];
        const errors = [];

        for (let i = 0; i < rules.length; i++) {
            try {
                const ruleFields = pickAllowedFields(rules[i], ALLOWED_RULE_FIELDS);
                if (!ruleFields.name) {
                    throw new Error('Rule name is required');
                }

                const ruleId = new mongoose.Types.ObjectId();
                const ruleData = {
                    _id: ruleId,
                    ...ruleFields,
                    createdAt: new Date(),
                    createdBy: req.userID
                };

                await Firm.findOneAndUpdate(
                    { _id: req.firmId },
                    { $push: { 'settings.attendanceRules': ruleData } }
                );

                results.push({ index: i, success: true, data: ruleData });
            } catch (error) {
                errors.push({ index: i, success: false, error: error.message });
            }
        }

        return res.status(201).json({
            success: true,
            message: `Created ${results.length} rules, ${errors.length} failed`,
            data: { created: results, errors }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PUT /api/hr/attendance-rules/:id
 * Update attendance rule
 */
router.put('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid rule ID format', 400);
        }

        const allowedFields = pickAllowedFields(req.body, ALLOWED_RULE_FIELDS);

        const result = await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.attendanceRules._id': sanitizedId
            },
            {
                $set: Object.keys(allowedFields).reduce((acc, key) => {
                    acc[`settings.attendanceRules.$.${key}`] = allowedFields[key];
                    return acc;
                }, {
                    'settings.attendanceRules.$.updatedAt': new Date(),
                    'settings.attendanceRules.$.updatedBy': req.userID
                })
            },
            { new: true }
        );

        if (!result) {
            throw CustomException('Attendance rule not found', 404);
        }

        const rule = result.settings.attendanceRules.find(
            r => r._id.toString() === sanitizedId
        );

        return res.json({
            success: true,
            message: 'Attendance rule updated successfully',
            data: rule
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * DELETE /api/hr/attendance-rules/:id
 * Delete attendance rule
 */
router.delete('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid rule ID format', 400);
        }

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $pull: { 'settings.attendanceRules': { _id: sanitizedId } } }
        );

        return res.json({
            success: true,
            message: 'Attendance rule deleted successfully'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/hr/attendance-rules/:id/default
 * Set rule as default
 */
router.patch('/:id/default', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid rule ID format', 400);
        }

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $set: { 'settings.attendanceRules.$[].isDefault': false } }
        );

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.attendanceRules._id': sanitizedId
            },
            { $set: { 'settings.attendanceRules.$.isDefault': true } }
        );

        return res.json({
            success: true,
            message: 'Default attendance rule updated'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/hr/attendance-rules/:id/toggle-status
 * Toggle rule active status
 */
router.patch('/:id/toggle-status', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid rule ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.attendanceRules');

        const rule = (firm?.settings?.attendanceRules || [])
            .find(r => r._id.toString() === sanitizedId);

        if (!rule) {
            throw CustomException('Attendance rule not found', 404);
        }

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'settings.attendanceRules._id': sanitizedId
            },
            { $set: { 'settings.attendanceRules.$.isActive': !rule.isActive } }
        );

        return res.json({
            success: true,
            message: `Attendance rule ${rule.isActive ? 'deactivated' : 'activated'}`,
            data: { isActive: !rule.isActive }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/attendance-rules/:id/duplicate
 * Duplicate attendance rule
 */
router.post('/:id/duplicate', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid rule ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.attendanceRules');

        const sourceRule = (firm?.settings?.attendanceRules || [])
            .find(r => r._id.toString() === sanitizedId);

        if (!sourceRule) {
            throw CustomException('Source rule not found', 404);
        }

        const newRuleId = new mongoose.Types.ObjectId();
        const ruleData = {
            ...sourceRule.toObject(),
            _id: newRuleId,
            name: `${sourceRule.name} (Copy)`,
            nameAr: sourceRule.nameAr ? `${sourceRule.nameAr} (نسخة)` : undefined,
            code: `${sourceRule.code}_COPY`,
            isDefault: false,
            createdAt: new Date(),
            createdBy: req.userID
        };

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $push: { 'settings.attendanceRules': ruleData } }
        );

        return res.status(201).json({
            success: true,
            message: 'Attendance rule duplicated successfully',
            data: ruleData
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

module.exports = router;
