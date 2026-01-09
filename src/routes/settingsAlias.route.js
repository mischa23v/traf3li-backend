/**
 * Settings Alias Routes
 *
 * Routes for settings at /api/settings to match frontend expected paths
 * Maps to existing controllers and provides unified settings endpoints
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
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// ═══════════════════════════════════════════════════════════════
// GENERAL SETTINGS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/settings
 * Get all user/firm settings
 */
router.get('/', async (req, res) => {
    try {
        const user = await User.findById(req.userID)
            .select('preferences settings theme locale timezone');

        let firmSettings = null;
        if (req.firmId) {
            const firm = await Firm.findOne({ _id: req.firmId })
                .select('settings preferences name');
            firmSettings = firm?.settings || {};
        }

        return res.json({
            success: true,
            data: {
                user: user?.preferences || {},
                firm: firmSettings,
                theme: user?.theme || 'system',
                locale: user?.locale || 'en',
                timezone: user?.timezone || 'Asia/Riyadh'
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/settings/account
 * Update account settings
 */
router.patch('/account', async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, [
            'firstName', 'lastName', 'phone', 'language', 'timezone'
        ]);

        const user = await User.findByIdAndUpdate(
            req.userID,
            { $set: allowedFields },
            { new: true }
        ).select('-password -mfaSecret -resetToken');

        return res.json({
            success: true,
            message: 'Account settings updated',
            data: user
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/settings/appearance
 * Update appearance settings
 */
router.patch('/appearance', async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, [
            'theme', 'colorScheme', 'fontSize', 'compactMode', 'sidebarCollapsed'
        ]);

        const user = await User.findByIdAndUpdate(
            req.userID,
            { $set: { 'preferences.appearance': allowedFields } },
            { new: true }
        ).select('preferences.appearance');

        return res.json({
            success: true,
            message: 'Appearance settings updated',
            data: user?.preferences?.appearance
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/settings/display
 * Update display settings
 */
router.patch('/display', async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, [
            'dateFormat', 'timeFormat', 'numberFormat', 'currency',
            'language', 'rtl', 'showWelcome', 'dashboardLayout'
        ]);

        const user = await User.findByIdAndUpdate(
            req.userID,
            { $set: { 'preferences.display': allowedFields } },
            { new: true }
        ).select('preferences.display');

        return res.json({
            success: true,
            message: 'Display settings updated',
            data: user?.preferences?.display
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/settings/notifications
 * Update notification settings
 */
router.patch('/notifications', async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, [
            'email', 'push', 'sms', 'inApp',
            'taskReminders', 'invoiceAlerts', 'caseUpdates',
            'digestFrequency', 'quietHoursStart', 'quietHoursEnd'
        ]);

        const user = await User.findByIdAndUpdate(
            req.userID,
            { $set: { 'preferences.notifications': allowedFields } },
            { new: true }
        ).select('preferences.notifications');

        return res.json({
            success: true,
            message: 'Notification settings updated',
            data: user?.preferences?.notifications
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

// ═══════════════════════════════════════════════════════════════
// HR SETTINGS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/settings/hr
 * Get HR settings
 */
router.get('/hr', async (req, res) => {
    try {
        if (!req.firmId) {
            return res.json({ success: true, data: {} });
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.hr');

        return res.json({
            success: true,
            data: firm?.settings?.hr || {
                employee: {},
                leave: {},
                attendance: {},
                payroll: {},
                expense: {}
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/settings/hr
 * Update all HR settings
 */
router.patch('/hr', async (req, res) => {
    try {
        if (!req.firmId) {
            throw CustomException('Firm context required', 400);
        }

        const allowedFields = pickAllowedFields(req.body, [
            'employee', 'leave', 'attendance', 'payroll', 'expense'
        ]);

        const firm = await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $set: { 'settings.hr': allowedFields } },
            { new: true }
        ).select('settings.hr');

        return res.json({
            success: true,
            message: 'HR settings updated',
            data: firm?.settings?.hr
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/settings/hr/employee
 * Update employee settings
 */
router.patch('/hr/employee', async (req, res) => {
    try {
        if (!req.firmId) {
            throw CustomException('Firm context required', 400);
        }

        const allowedFields = pickAllowedFields(req.body, [
            'autoGenerateEmployeeId', 'employeeIdPrefix', 'employeeIdFormat',
            'probationPeriodDays', 'noticePeriodDays', 'requireDocuments',
            'enableSelfService', 'allowProfileEdit'
        ]);

        const firm = await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $set: { 'settings.hr.employee': allowedFields } },
            { new: true }
        ).select('settings.hr.employee');

        return res.json({
            success: true,
            message: 'Employee settings updated',
            data: firm?.settings?.hr?.employee
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/settings/hr/leave
 * Update leave settings
 */
router.patch('/hr/leave', async (req, res) => {
    try {
        if (!req.firmId) {
            throw CustomException('Firm context required', 400);
        }

        const allowedFields = pickAllowedFields(req.body, [
            'leaveYearStart', 'leaveYearEnd', 'carryForwardDeadline',
            'maxCarryForwardDays', 'encashmentDeadline', 'approvalLevels',
            'allowBackdatedLeave', 'backdatedDaysLimit', 'allowFutureLeave',
            'futureDaysLimit', 'halfDayAllowed', 'minimumNoticeDays'
        ]);

        const firm = await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $set: { 'settings.hr.leave': allowedFields } },
            { new: true }
        ).select('settings.hr.leave');

        return res.json({
            success: true,
            message: 'Leave settings updated',
            data: firm?.settings?.hr?.leave
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/settings/hr/attendance
 * Update attendance settings
 */
router.patch('/hr/attendance', async (req, res) => {
    try {
        if (!req.firmId) {
            throw CustomException('Firm context required', 400);
        }

        const allowedFields = pickAllowedFields(req.body, [
            'enableGeofencing', 'geofenceRadius', 'enableFaceRecognition',
            'autoCheckout', 'autoCheckoutTime', 'lateGracePeriod',
            'earlyExitGracePeriod', 'overtimeThreshold', 'weekendDays',
            'trackBreaks', 'requirePhotoOnCheckIn'
        ]);

        const firm = await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $set: { 'settings.hr.attendance': allowedFields } },
            { new: true }
        ).select('settings.hr.attendance');

        return res.json({
            success: true,
            message: 'Attendance settings updated',
            data: firm?.settings?.hr?.attendance
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/settings/hr/payroll
 * Update payroll settings
 */
router.patch('/hr/payroll', async (req, res) => {
    try {
        if (!req.firmId) {
            throw CustomException('Firm context required', 400);
        }

        const allowedFields = pickAllowedFields(req.body, [
            'payrollCycle', 'payDay', 'currency', 'bankName', 'bankAccountNumber',
            'gosiEnabled', 'gosiEmployerRate', 'gosiEmployeeRate',
            'taxEnabled', 'taxRate', 'allowAdvances', 'maxAdvancePercentage'
        ]);

        const firm = await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $set: { 'settings.hr.payroll': allowedFields } },
            { new: true }
        ).select('settings.hr.payroll');

        return res.json({
            success: true,
            message: 'Payroll settings updated',
            data: firm?.settings?.hr?.payroll
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/settings/hr/expense
 * Update expense settings
 */
router.patch('/hr/expense', async (req, res) => {
    try {
        if (!req.firmId) {
            throw CustomException('Firm context required', 400);
        }

        const allowedFields = pickAllowedFields(req.body, [
            'requireReceipts', 'receiptThreshold', 'autoApproveLimit',
            'approvalLevels', 'mileageRate', 'perDiemRates',
            'allowedCategories', 'maxClaimAmount'
        ]);

        const firm = await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $set: { 'settings.hr.expense': allowedFields } },
            { new: true }
        ).select('settings.hr.expense');

        return res.json({
            success: true,
            message: 'Expense settings updated',
            data: firm?.settings?.hr?.expense
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

// ═══════════════════════════════════════════════════════════════
// CRM SETTINGS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/settings/crm
 * Get CRM settings
 */
router.get('/crm', async (req, res) => {
    try {
        if (!req.firmId) {
            return res.json({ success: true, data: {} });
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.crm');

        return res.json({
            success: true,
            data: firm?.settings?.crm || {}
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PUT /api/settings/crm
 * Update CRM settings
 */
router.put('/crm', async (req, res) => {
    try {
        if (!req.firmId) {
            throw CustomException('Firm context required', 400);
        }

        const allowedFields = pickAllowedFields(req.body, [
            'defaultPipeline', 'leadSources', 'salesStages',
            'dealRotting', 'autoAssignment', 'leadScoring',
            'emailTracking', 'activityTracking', 'quotaTracking'
        ]);

        const firm = await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $set: { 'settings.crm': allowedFields } },
            { new: true }
        ).select('settings.crm');

        return res.json({
            success: true,
            message: 'CRM settings updated',
            data: firm?.settings?.crm
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

// ═══════════════════════════════════════════════════════════════
// FINANCE SETTINGS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/settings/finance
 * Get finance settings
 */
router.get('/finance', async (req, res) => {
    try {
        if (!req.firmId) {
            return res.json({ success: true, data: {} });
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.finance');

        return res.json({
            success: true,
            data: firm?.settings?.finance || {}
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PUT /api/settings/finance
 * Update finance settings
 */
router.put('/finance', async (req, res) => {
    try {
        if (!req.firmId) {
            throw CustomException('Firm context required', 400);
        }

        const allowedFields = pickAllowedFields(req.body, [
            'currency', 'currencySymbol', 'currencyPosition', 'decimalPlaces',
            'thousandSeparator', 'decimalSeparator', 'fiscalYearStart',
            'fiscalYearEnd', 'taxNumber', 'vatNumber', 'invoicePrefix',
            'invoiceStartNumber', 'defaultPaymentTerms', 'lateFeeEnabled',
            'lateFeePercentage', 'lateFeeGraceDays'
        ]);

        const firm = await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $set: { 'settings.finance': allowedFields } },
            { new: true }
        ).select('settings.finance');

        return res.json({
            success: true,
            message: 'Finance settings updated',
            data: firm?.settings?.finance
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

// ═══════════════════════════════════════════════════════════════
// TAX SETTINGS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/settings/taxes
 * Get tax configurations
 */
router.get('/taxes', async (req, res) => {
    try {
        if (!req.firmId) {
            return res.json({ success: true, data: [] });
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.taxes');

        return res.json({
            success: true,
            data: firm?.settings?.taxes || []
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/settings/taxes
 * Add tax configuration
 */
router.post('/taxes', async (req, res) => {
    try {
        if (!req.firmId) {
            throw CustomException('Firm context required', 400);
        }

        const allowedFields = pickAllowedFields(req.body, [
            'name', 'nameAr', 'code', 'rate', 'type', 'isDefault', 'isActive'
        ]);

        if (!allowedFields.name || !allowedFields.rate) {
            throw CustomException('Tax name and rate are required', 400);
        }

        const taxId = new mongoose.Types.ObjectId();
        const taxData = { _id: taxId, ...allowedFields };

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $push: { 'settings.taxes': taxData } }
        );

        return res.status(201).json({
            success: true,
            message: 'Tax configuration added',
            data: taxData
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PUT /api/settings/taxes/:id
 * Update tax configuration
 */
router.put('/taxes/:id', async (req, res) => {
    try {
        if (!req.firmId) {
            throw CustomException('Firm context required', 400);
        }

        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid tax ID format', 400);
        }

        const allowedFields = pickAllowedFields(req.body, [
            'name', 'nameAr', 'code', 'rate', 'type', 'isDefault', 'isActive'
        ]);

        const updateFields = {};
        Object.keys(allowedFields).forEach(key => {
            updateFields[`settings.taxes.$.${key}`] = allowedFields[key];
        });

        const firm = await Firm.findOneAndUpdate(
            { _id: req.firmId, 'settings.taxes._id': sanitizedId },
            { $set: updateFields },
            { new: true }
        ).select('settings.taxes');

        if (!firm) {
            throw CustomException('Tax configuration not found', 404);
        }

        return res.json({
            success: true,
            message: 'Tax configuration updated',
            data: firm.settings.taxes.find(t => t._id.toString() === sanitizedId)
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * DELETE /api/settings/taxes/:id
 * Delete tax configuration
 */
router.delete('/taxes/:id', async (req, res) => {
    try {
        if (!req.firmId) {
            throw CustomException('Firm context required', 400);
        }

        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid tax ID format', 400);
        }

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $pull: { 'settings.taxes': { _id: sanitizedId } } }
        );

        return res.json({
            success: true,
            message: 'Tax configuration deleted'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/settings/taxes/:id/default
 * Set tax as default
 */
router.patch('/taxes/:id/default', async (req, res) => {
    try {
        if (!req.firmId) {
            throw CustomException('Firm context required', 400);
        }

        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid tax ID format', 400);
        }

        // Unset all defaults first
        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $set: { 'settings.taxes.$[].isDefault': false } }
        );

        // Set new default
        await Firm.findOneAndUpdate(
            { _id: req.firmId, 'settings.taxes._id': sanitizedId },
            { $set: { 'settings.taxes.$.isDefault': true } }
        );

        return res.json({
            success: true,
            message: 'Default tax updated'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

// ═══════════════════════════════════════════════════════════════
// PAYMENT MODES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/settings/payment-modes
 * Get payment modes
 */
router.get('/payment-modes', async (req, res) => {
    try {
        if (!req.firmId) {
            return res.json({ success: true, data: [] });
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('settings.paymentModes');

        return res.json({
            success: true,
            data: firm?.settings?.paymentModes || []
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/settings/payment-modes
 * Add payment mode
 */
router.post('/payment-modes', async (req, res) => {
    try {
        if (!req.firmId) {
            throw CustomException('Firm context required', 400);
        }

        const allowedFields = pickAllowedFields(req.body, [
            'name', 'nameAr', 'code', 'type', 'accountId', 'isDefault', 'isActive'
        ]);

        if (!allowedFields.name) {
            throw CustomException('Payment mode name is required', 400);
        }

        const modeId = new mongoose.Types.ObjectId();
        const modeData = { _id: modeId, ...allowedFields };

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $push: { 'settings.paymentModes': modeData } }
        );

        return res.status(201).json({
            success: true,
            message: 'Payment mode added',
            data: modeData
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PUT /api/settings/payment-modes/:id
 * Update payment mode
 */
router.put('/payment-modes/:id', async (req, res) => {
    try {
        if (!req.firmId) {
            throw CustomException('Firm context required', 400);
        }

        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid payment mode ID format', 400);
        }

        const allowedFields = pickAllowedFields(req.body, [
            'name', 'nameAr', 'code', 'type', 'accountId', 'isDefault', 'isActive'
        ]);

        const updateFields = {};
        Object.keys(allowedFields).forEach(key => {
            updateFields[`settings.paymentModes.$.${key}`] = allowedFields[key];
        });

        const firm = await Firm.findOneAndUpdate(
            { _id: req.firmId, 'settings.paymentModes._id': sanitizedId },
            { $set: updateFields },
            { new: true }
        ).select('settings.paymentModes');

        if (!firm) {
            throw CustomException('Payment mode not found', 404);
        }

        return res.json({
            success: true,
            message: 'Payment mode updated',
            data: firm.settings.paymentModes.find(p => p._id.toString() === sanitizedId)
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * DELETE /api/settings/payment-modes/:id
 * Delete payment mode
 */
router.delete('/payment-modes/:id', async (req, res) => {
    try {
        if (!req.firmId) {
            throw CustomException('Firm context required', 400);
        }

        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid payment mode ID format', 400);
        }

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $pull: { 'settings.paymentModes': { _id: sanitizedId } } }
        );

        return res.json({
            success: true,
            message: 'Payment mode deleted'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/settings/payment-modes/:id/default
 * Set payment mode as default
 */
router.patch('/payment-modes/:id/default', async (req, res) => {
    try {
        if (!req.firmId) {
            throw CustomException('Firm context required', 400);
        }

        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid payment mode ID format', 400);
        }

        // Unset all defaults first
        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $set: { 'settings.paymentModes.$[].isDefault': false } }
        );

        // Set new default
        await Firm.findOneAndUpdate(
            { _id: req.firmId, 'settings.paymentModes._id': sanitizedId },
            { $set: { 'settings.paymentModes.$.isDefault': true } }
        );

        return res.json({
            success: true,
            message: 'Default payment mode updated'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

module.exports = router;
