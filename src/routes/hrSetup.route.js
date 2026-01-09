/**
 * HR Setup Routes
 *
 * Routes for HR setup wizard and configuration at /api/hr
 * Includes: departments, designations, leave-types, shift-types, salary-components, attendance-rules
 *
 * Security:
 * - Multi-tenant isolation via req.firmQuery
 * - Mass assignment protection via pickAllowedFields
 * - ID sanitization via sanitizeObjectId
 * - Regex injection prevention via escapeRegex
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const OrganizationalUnit = require('../models/organizationalUnit.model');
const LeaveType = require('../models/leaveType.model');
const ShiftType = require('../models/shiftType.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ═══════════════════════════════════════════════════════════════
// DEPARTMENTS (using OrganizationalUnit with type='department')
// ═══════════════════════════════════════════════════════════════

const ALLOWED_DEPARTMENT_FIELDS = [
    'name', 'nameAr', 'code', 'description', 'descriptionAr',
    'parentId', 'managerId', 'headCount', 'budget',
    'costCenter', 'location', 'isActive', 'sortOrder', 'color'
];

/**
 * GET /api/hr/departments
 * List all departments
 */
router.get('/departments', async (req, res) => {
    try {
        const { search, isActive, parentId } = req.query;
        const { page, limit, skip } = sanitizePagination(req.query, { maxLimit: 100 });

        const query = { ...req.firmQuery, unitType: 'department' };

        if (typeof isActive === 'string') {
            query.isActive = isActive === 'true';
        }

        if (parentId) {
            const sanitizedParentId = sanitizeObjectId(parentId);
            if (sanitizedParentId) {
                query.parentUnit = sanitizedParentId;
            }
        }

        if (search && search.trim()) {
            query.$or = [
                { name: { $regex: escapeRegex(search.trim()), $options: 'i' } },
                { nameAr: { $regex: escapeRegex(search.trim()), $options: 'i' } },
                { code: { $regex: escapeRegex(search.trim()), $options: 'i' } }
            ];
        }

        const [departments, total] = await Promise.all([
            OrganizationalUnit.find(query)
                .populate('parentUnit', 'name nameAr code')
                .populate('headOfUnit', 'firstName lastName')
                .skip(skip)
                .limit(limit)
                .sort({ sortOrder: 1, name: 1 }),
            OrganizationalUnit.countDocuments(query)
        ]);

        return res.json({
            success: true,
            count: departments.length,
            data: departments,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/departments/:id
 * Get single department
 */
router.get('/departments/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid department ID format', 400);
        }

        const department = await OrganizationalUnit.findOne({
            _id: sanitizedId,
            ...req.firmQuery,
            unitType: 'department'
        })
            .populate('parentUnit', 'name nameAr code')
            .populate('headOfUnit', 'firstName lastName email');

        if (!department) {
            throw CustomException('Department not found', 404);
        }

        return res.json({ success: true, data: department });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/departments
 * Create department
 */
router.post('/departments', async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, ALLOWED_DEPARTMENT_FIELDS);

        if (!allowedFields.name) {
            throw CustomException('Department name is required', 400);
        }

        // Sanitize parent ID if provided
        if (allowedFields.parentId) {
            allowedFields.parentUnit = sanitizeObjectId(allowedFields.parentId);
            delete allowedFields.parentId;
        }
        if (allowedFields.managerId) {
            allowedFields.headOfUnit = sanitizeObjectId(allowedFields.managerId);
            delete allowedFields.managerId;
        }

        const department = await OrganizationalUnit.create(req.addFirmId({
            ...allowedFields,
            unitType: 'department',
            createdBy: req.userID
        }));

        return res.status(201).json({
            success: true,
            message: 'Department created successfully',
            data: department
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/departments/bulk
 * Bulk create departments (for setup wizard)
 */
router.post('/departments/bulk', async (req, res) => {
    try {
        const { departments } = req.body;

        if (!Array.isArray(departments) || departments.length === 0) {
            throw CustomException('Array of departments is required', 400);
        }

        if (departments.length > 50) {
            throw CustomException('Maximum 50 departments per bulk create', 400);
        }

        const results = [];
        const errors = [];

        for (let i = 0; i < departments.length; i++) {
            try {
                const deptData = pickAllowedFields(departments[i], ALLOWED_DEPARTMENT_FIELDS);
                if (!deptData.name) {
                    throw new Error('Department name is required');
                }

                if (deptData.parentId) {
                    deptData.parentUnit = sanitizeObjectId(deptData.parentId);
                    delete deptData.parentId;
                }

                const dept = await OrganizationalUnit.create(req.addFirmId({
                    ...deptData,
                    unitType: 'department',
                    createdBy: req.userID
                }));
                results.push({ index: i, success: true, data: dept });
            } catch (error) {
                errors.push({ index: i, success: false, error: error.message });
            }
        }

        return res.status(201).json({
            success: true,
            message: `Created ${results.length} departments, ${errors.length} failed`,
            data: { created: results, errors }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PUT /api/hr/departments/:id
 * Update department
 */
router.put('/departments/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid department ID format', 400);
        }

        const allowedFields = pickAllowedFields(req.body, ALLOWED_DEPARTMENT_FIELDS);

        if (allowedFields.parentId) {
            allowedFields.parentUnit = sanitizeObjectId(allowedFields.parentId);
            delete allowedFields.parentId;
        }
        if (allowedFields.managerId) {
            allowedFields.headOfUnit = sanitizeObjectId(allowedFields.managerId);
            delete allowedFields.managerId;
        }

        const department = await OrganizationalUnit.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery, unitType: 'department' },
            { $set: { ...allowedFields, updatedBy: req.userID } },
            { new: true }
        );

        if (!department) {
            throw CustomException('Department not found', 404);
        }

        return res.json({
            success: true,
            message: 'Department updated successfully',
            data: department
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * DELETE /api/hr/departments/:id
 * Delete department
 */
router.delete('/departments/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid department ID format', 400);
        }

        const result = await OrganizationalUnit.findOneAndDelete({
            _id: sanitizedId,
            ...req.firmQuery,
            unitType: 'department'
        });

        if (!result) {
            throw CustomException('Department not found', 404);
        }

        return res.json({
            success: true,
            message: 'Department deleted successfully'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

// ═══════════════════════════════════════════════════════════════
// DESIGNATIONS (Job Positions/Titles)
// ═══════════════════════════════════════════════════════════════

const ALLOWED_DESIGNATION_FIELDS = [
    'name', 'nameAr', 'code', 'description', 'descriptionAr',
    'level', 'grade', 'departmentId', 'minSalary', 'maxSalary',
    'responsibilities', 'requirements', 'isActive', 'sortOrder'
];

/**
 * GET /api/hr/designations
 * List all designations (job positions)
 */
router.get('/designations', async (req, res) => {
    try {
        const { search, isActive, departmentId } = req.query;
        const { page, limit, skip } = sanitizePagination(req.query, { maxLimit: 100 });

        const query = { ...req.firmQuery, unitType: 'designation' };

        if (typeof isActive === 'string') {
            query.isActive = isActive === 'true';
        }

        if (departmentId) {
            const sanitizedDeptId = sanitizeObjectId(departmentId);
            if (sanitizedDeptId) {
                query.parentUnit = sanitizedDeptId;
            }
        }

        if (search && search.trim()) {
            query.$or = [
                { name: { $regex: escapeRegex(search.trim()), $options: 'i' } },
                { nameAr: { $regex: escapeRegex(search.trim()), $options: 'i' } },
                { code: { $regex: escapeRegex(search.trim()), $options: 'i' } }
            ];
        }

        const [designations, total] = await Promise.all([
            OrganizationalUnit.find(query)
                .populate('parentUnit', 'name nameAr')
                .skip(skip)
                .limit(limit)
                .sort({ sortOrder: 1, name: 1 }),
            OrganizationalUnit.countDocuments(query)
        ]);

        return res.json({
            success: true,
            count: designations.length,
            data: designations,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/designations/:id
 * Get single designation
 */
router.get('/designations/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid designation ID format', 400);
        }

        const designation = await OrganizationalUnit.findOne({
            _id: sanitizedId,
            ...req.firmQuery,
            unitType: 'designation'
        }).populate('parentUnit', 'name nameAr');

        if (!designation) {
            throw CustomException('Designation not found', 404);
        }

        return res.json({ success: true, data: designation });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/designations
 * Create designation
 */
router.post('/designations', async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, ALLOWED_DESIGNATION_FIELDS);

        if (!allowedFields.name) {
            throw CustomException('Designation name is required', 400);
        }

        if (allowedFields.departmentId) {
            allowedFields.parentUnit = sanitizeObjectId(allowedFields.departmentId);
            delete allowedFields.departmentId;
        }

        const designation = await OrganizationalUnit.create(req.addFirmId({
            ...allowedFields,
            unitType: 'designation',
            createdBy: req.userID
        }));

        return res.status(201).json({
            success: true,
            message: 'Designation created successfully',
            data: designation
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/designations/bulk
 * Bulk create designations (for setup wizard)
 */
router.post('/designations/bulk', async (req, res) => {
    try {
        const { designations } = req.body;

        if (!Array.isArray(designations) || designations.length === 0) {
            throw CustomException('Array of designations is required', 400);
        }

        if (designations.length > 100) {
            throw CustomException('Maximum 100 designations per bulk create', 400);
        }

        const results = [];
        const errors = [];

        for (let i = 0; i < designations.length; i++) {
            try {
                const desigData = pickAllowedFields(designations[i], ALLOWED_DESIGNATION_FIELDS);
                if (!desigData.name) {
                    throw new Error('Designation name is required');
                }

                if (desigData.departmentId) {
                    desigData.parentUnit = sanitizeObjectId(desigData.departmentId);
                    delete desigData.departmentId;
                }

                const desig = await OrganizationalUnit.create(req.addFirmId({
                    ...desigData,
                    unitType: 'designation',
                    createdBy: req.userID
                }));
                results.push({ index: i, success: true, data: desig });
            } catch (error) {
                errors.push({ index: i, success: false, error: error.message });
            }
        }

        return res.status(201).json({
            success: true,
            message: `Created ${results.length} designations, ${errors.length} failed`,
            data: { created: results, errors }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PUT /api/hr/designations/:id
 * Update designation
 */
router.put('/designations/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid designation ID format', 400);
        }

        const allowedFields = pickAllowedFields(req.body, ALLOWED_DESIGNATION_FIELDS);

        if (allowedFields.departmentId) {
            allowedFields.parentUnit = sanitizeObjectId(allowedFields.departmentId);
            delete allowedFields.departmentId;
        }

        const designation = await OrganizationalUnit.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery, unitType: 'designation' },
            { $set: { ...allowedFields, updatedBy: req.userID } },
            { new: true }
        );

        if (!designation) {
            throw CustomException('Designation not found', 404);
        }

        return res.json({
            success: true,
            message: 'Designation updated successfully',
            data: designation
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * DELETE /api/hr/designations/:id
 * Delete designation
 */
router.delete('/designations/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid designation ID format', 400);
        }

        const result = await OrganizationalUnit.findOneAndDelete({
            _id: sanitizedId,
            ...req.firmQuery,
            unitType: 'designation'
        });

        if (!result) {
            throw CustomException('Designation not found', 404);
        }

        return res.json({
            success: true,
            message: 'Designation deleted successfully'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

// ═══════════════════════════════════════════════════════════════
// LEAVE TYPES
// ═══════════════════════════════════════════════════════════════

const ALLOWED_LEAVE_TYPE_FIELDS = [
    'code', 'name', 'nameAr', 'description', 'descriptionAr',
    'laborLawArticle', 'laborLawArticleAr', 'maxDays', 'minDays',
    'isPaid', 'payPercentage', 'requiresApproval', 'requiresDocument',
    'documentType', 'isAccrued', 'accrualRate', 'allowCarryForward',
    'maxCarryForwardDays', 'allowEncashment', 'maxEncashableDays',
    'applicableGender', 'applicableEmploymentTypes', 'minServiceDays',
    'color', 'icon', 'sortOrder', 'isActive'
];

/**
 * GET /api/hr/leave-types
 * List all leave types
 */
router.get('/leave-types', async (req, res) => {
    try {
        const { search, isActive } = req.query;
        const { page, limit, skip } = sanitizePagination(req.query, { maxLimit: 100 });

        const query = { ...req.firmQuery };

        if (typeof isActive === 'string') {
            query.isActive = isActive === 'true';
        }

        if (search && search.trim()) {
            query.$or = [
                { name: { $regex: escapeRegex(search.trim()), $options: 'i' } },
                { nameAr: { $regex: escapeRegex(search.trim()), $options: 'i' } },
                { code: { $regex: escapeRegex(search.trim()), $options: 'i' } }
            ];
        }

        const [leaveTypes, total] = await Promise.all([
            LeaveType.find(query)
                .skip(skip)
                .limit(limit)
                .sort({ sortOrder: 1, name: 1 }),
            LeaveType.countDocuments(query)
        ]);

        return res.json({
            success: true,
            count: leaveTypes.length,
            data: leaveTypes,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/leave-types/:id
 * Get single leave type
 */
router.get('/leave-types/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid leave type ID format', 400);
        }

        const leaveType = await LeaveType.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!leaveType) {
            throw CustomException('Leave type not found', 404);
        }

        return res.json({ success: true, data: leaveType });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/leave-types
 * Create leave type
 */
router.post('/leave-types', async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, ALLOWED_LEAVE_TYPE_FIELDS);

        if (!allowedFields.name || !allowedFields.code) {
            throw CustomException('Leave type name and code are required', 400);
        }

        const leaveType = await LeaveType.create(req.addFirmId({
            ...allowedFields,
            createdBy: req.userID
        }));

        return res.status(201).json({
            success: true,
            message: 'Leave type created successfully',
            data: leaveType
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/leave-types/bulk
 * Bulk create leave types (for setup wizard)
 */
router.post('/leave-types/bulk', async (req, res) => {
    try {
        const { leaveTypes } = req.body;

        if (!Array.isArray(leaveTypes) || leaveTypes.length === 0) {
            throw CustomException('Array of leave types is required', 400);
        }

        if (leaveTypes.length > 50) {
            throw CustomException('Maximum 50 leave types per bulk create', 400);
        }

        const results = [];
        const errors = [];

        for (let i = 0; i < leaveTypes.length; i++) {
            try {
                const ltData = pickAllowedFields(leaveTypes[i], ALLOWED_LEAVE_TYPE_FIELDS);
                if (!ltData.name || !ltData.code) {
                    throw new Error('Leave type name and code are required');
                }

                const lt = await LeaveType.create(req.addFirmId({
                    ...ltData,
                    createdBy: req.userID
                }));
                results.push({ index: i, success: true, data: lt });
            } catch (error) {
                errors.push({ index: i, success: false, error: error.message });
            }
        }

        return res.status(201).json({
            success: true,
            message: `Created ${results.length} leave types, ${errors.length} failed`,
            data: { created: results, errors }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/leave-types/initialize
 * Initialize default Saudi Labor Law leave types
 */
router.post('/leave-types/initialize', async (req, res) => {
    try {
        const firmId = req.firmQuery.firmId || req.firmQuery.lawyerId;
        const createdTypes = await LeaveType.initializeForFirm(firmId, req.userID);

        return res.status(201).json({
            success: true,
            message: `Initialized ${createdTypes.length} default leave types`,
            data: createdTypes
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PUT /api/hr/leave-types/:id
 * Update leave type
 */
router.put('/leave-types/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid leave type ID format', 400);
        }

        const allowedFields = pickAllowedFields(req.body, ALLOWED_LEAVE_TYPE_FIELDS);

        const leaveType = await LeaveType.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            { $set: { ...allowedFields, updatedBy: req.userID } },
            { new: true }
        );

        if (!leaveType) {
            throw CustomException('Leave type not found', 404);
        }

        return res.json({
            success: true,
            message: 'Leave type updated successfully',
            data: leaveType
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * DELETE /api/hr/leave-types/:id
 * Delete leave type
 */
router.delete('/leave-types/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid leave type ID format', 400);
        }

        // Prevent deletion of system defaults
        const existing = await LeaveType.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!existing) {
            throw CustomException('Leave type not found', 404);
        }

        if (existing.isSystemDefault) {
            throw CustomException('Cannot delete system default leave types', 400);
        }

        await LeaveType.findOneAndDelete({
            _id: sanitizedId,
            ...req.firmQuery
        });

        return res.json({
            success: true,
            message: 'Leave type deleted successfully'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

// ═══════════════════════════════════════════════════════════════
// SHIFT TYPES
// ═══════════════════════════════════════════════════════════════

const ALLOWED_SHIFT_TYPE_FIELDS = [
    'name', 'nameAr', 'description', 'startTime', 'endTime',
    'workingHours', 'enableAutoAttendance', 'processAttendanceAfter',
    'determineCheckInAndCheckOutFromBiometric', 'beginCheckInBeforeShiftStart',
    'allowCheckOutAfterShiftEnd', 'lateEntryGracePeriod', 'earlyExitGracePeriod',
    'workingHoursThresholdForHalfDay', 'workingHoursThresholdForAbsent',
    'breakDuration', 'breakType', 'breakStartTime', 'breakEndTime',
    'allowOvertime', 'maxOvertimeHours', 'overtimeMultiplier',
    'weekendOvertimeMultiplier', 'holidayOvertimeMultiplier',
    'isRamadanShift', 'ramadanStartTime', 'ramadanEndTime', 'ramadanWorkingHours',
    'applicableDays', 'isNightShift', 'nightShiftAllowance',
    'isFlexibleShift', 'coreHoursStart', 'coreHoursEnd', 'minHoursRequired',
    'color', 'isActive', 'isDefault'
];

/**
 * GET /api/hr/shift-types
 * List all shift types
 */
router.get('/shift-types', async (req, res) => {
    try {
        const { search, isActive } = req.query;
        const { page, limit, skip } = sanitizePagination(req.query, { maxLimit: 100 });

        const query = { ...req.firmQuery };

        if (typeof isActive === 'string') {
            query.isActive = isActive === 'true';
        }

        if (search && search.trim()) {
            query.$or = [
                { name: { $regex: escapeRegex(search.trim()), $options: 'i' } },
                { nameAr: { $regex: escapeRegex(search.trim()), $options: 'i' } }
            ];
        }

        const [shiftTypes, total] = await Promise.all([
            ShiftType.find(query)
                .skip(skip)
                .limit(limit)
                .sort({ isDefault: -1, name: 1 }),
            ShiftType.countDocuments(query)
        ]);

        return res.json({
            success: true,
            count: shiftTypes.length,
            data: shiftTypes,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/shift-types/:id
 * Get single shift type
 */
router.get('/shift-types/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid shift type ID format', 400);
        }

        const shiftType = await ShiftType.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!shiftType) {
            throw CustomException('Shift type not found', 404);
        }

        return res.json({ success: true, data: shiftType });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/shift-types
 * Create shift type
 */
router.post('/shift-types', async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, ALLOWED_SHIFT_TYPE_FIELDS);

        if (!allowedFields.name || !allowedFields.startTime || !allowedFields.endTime) {
            throw CustomException('Shift type name, start time, and end time are required', 400);
        }

        const shiftType = await ShiftType.create(req.addFirmId({
            ...allowedFields,
            createdBy: req.userID
        }));

        return res.status(201).json({
            success: true,
            message: 'Shift type created successfully',
            data: shiftType
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/shift-types/bulk
 * Bulk create shift types (for setup wizard)
 */
router.post('/shift-types/bulk', async (req, res) => {
    try {
        const { shiftTypes } = req.body;

        if (!Array.isArray(shiftTypes) || shiftTypes.length === 0) {
            throw CustomException('Array of shift types is required', 400);
        }

        if (shiftTypes.length > 20) {
            throw CustomException('Maximum 20 shift types per bulk create', 400);
        }

        const results = [];
        const errors = [];

        for (let i = 0; i < shiftTypes.length; i++) {
            try {
                const stData = pickAllowedFields(shiftTypes[i], ALLOWED_SHIFT_TYPE_FIELDS);
                if (!stData.name || !stData.startTime || !stData.endTime) {
                    throw new Error('Shift type name, start time, and end time are required');
                }

                const st = await ShiftType.create(req.addFirmId({
                    ...stData,
                    createdBy: req.userID
                }));
                results.push({ index: i, success: true, data: st });
            } catch (error) {
                errors.push({ index: i, success: false, error: error.message });
            }
        }

        return res.status(201).json({
            success: true,
            message: `Created ${results.length} shift types, ${errors.length} failed`,
            data: { created: results, errors }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PUT /api/hr/shift-types/:id
 * Update shift type
 */
router.put('/shift-types/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid shift type ID format', 400);
        }

        const allowedFields = pickAllowedFields(req.body, ALLOWED_SHIFT_TYPE_FIELDS);

        const shiftType = await ShiftType.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            { $set: { ...allowedFields, updatedBy: req.userID } },
            { new: true }
        );

        if (!shiftType) {
            throw CustomException('Shift type not found', 404);
        }

        return res.json({
            success: true,
            message: 'Shift type updated successfully',
            data: shiftType
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * DELETE /api/hr/shift-types/:id
 * Delete shift type
 */
router.delete('/shift-types/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid shift type ID format', 400);
        }

        const result = await ShiftType.findOneAndDelete({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!result) {
            throw CustomException('Shift type not found', 404);
        }

        return res.json({
            success: true,
            message: 'Shift type deleted successfully'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/hr/shift-types/:id/default
 * Set shift type as default
 */
router.patch('/shift-types/:id/default', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid shift type ID format', 400);
        }

        // Get firmId for the update
        const firmId = req.firmQuery.firmId || req.firmQuery.lawyerId;

        // Unset current default
        await ShiftType.updateMany(
            { firmId, isDefault: true },
            { $set: { isDefault: false } }
        );

        // Set new default
        const shiftType = await ShiftType.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            { $set: { isDefault: true, updatedBy: req.userID } },
            { new: true }
        );

        if (!shiftType) {
            throw CustomException('Shift type not found', 404);
        }

        return res.json({
            success: true,
            message: 'Default shift type updated',
            data: shiftType
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

// ═══════════════════════════════════════════════════════════════
// HR ANALYTICS DASHBOARD
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/hr/analytics/dashboard
 * Get HR analytics dashboard data
 */
router.get('/analytics/dashboard', async (req, res) => {
    try {
        const firmId = req.firmQuery.firmId || req.firmQuery.lawyerId;
        const firmIdObj = new mongoose.Types.ObjectId(firmId);

        const [
            departmentCount,
            designationCount,
            leaveTypeCount,
            shiftTypeCount
        ] = await Promise.all([
            OrganizationalUnit.countDocuments({ firmId: firmIdObj, unitType: 'department', isActive: true }),
            OrganizationalUnit.countDocuments({ firmId: firmIdObj, unitType: 'designation', isActive: true }),
            LeaveType.countDocuments({ firmId: firmIdObj, isActive: true }),
            ShiftType.countDocuments({ firmId: firmIdObj, isActive: true })
        ]);

        return res.json({
            success: true,
            data: {
                departments: departmentCount,
                designations: designationCount,
                leaveTypes: leaveTypeCount,
                shiftTypes: shiftTypeCount,
                setupComplete: departmentCount > 0 && designationCount > 0 && leaveTypeCount > 0 && shiftTypeCount > 0
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

module.exports = router;
