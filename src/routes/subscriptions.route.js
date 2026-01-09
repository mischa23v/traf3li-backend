/**
 * Subscriptions Routes
 *
 * Routes for subscription management at /api/subscriptions
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

const ALLOWED_SUBSCRIPTION_FIELDS = [
    'clientId', 'planId', 'name', 'description', 'amount', 'currency',
    'billingCycle', 'startDate', 'endDate', 'nextBillingDate', 'status',
    'autoRenew', 'paymentMethod', 'includedHours', 'usedHours', 'notes'
];

const VALID_STATUSES = ['active', 'paused', 'cancelled', 'expired', 'pending', 'trial'];
const VALID_BILLING_CYCLES = ['monthly', 'quarterly', 'semi-annual', 'annual'];

/**
 * GET /api/subscriptions
 * List all subscriptions
 */
router.get('/', async (req, res) => {
    try {
        const { search, status, clientId, billingCycle } = req.query;
        const { page, limit, skip } = sanitizePagination(req.query, { maxLimit: 100 });

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('subscriptions');

        let subscriptions = firm?.subscriptions || [];

        if (status && VALID_STATUSES.includes(status)) {
            subscriptions = subscriptions.filter(s => s.status === status);
        }

        if (clientId) {
            const sanitizedClientId = sanitizeObjectId(clientId);
            if (sanitizedClientId) {
                subscriptions = subscriptions.filter(s =>
                    s.clientId?.toString() === sanitizedClientId
                );
            }
        }

        if (billingCycle && VALID_BILLING_CYCLES.includes(billingCycle)) {
            subscriptions = subscriptions.filter(s => s.billingCycle === billingCycle);
        }

        if (search && search.trim()) {
            const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
            subscriptions = subscriptions.filter(s =>
                searchRegex.test(s.name) ||
                searchRegex.test(s.description)
            );
        }

        subscriptions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const total = subscriptions.length;
        const paginatedSubscriptions = subscriptions.slice(skip, skip + limit);

        return res.json({
            success: true,
            count: paginatedSubscriptions.length,
            data: paginatedSubscriptions,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/subscriptions/:id
 * Get single subscription
 */
router.get('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid subscription ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('subscriptions');

        const subscription = (firm?.subscriptions || [])
            .find(s => s._id.toString() === sanitizedId);

        if (!subscription) {
            throw CustomException('Subscription not found', 404);
        }

        return res.json({ success: true, data: subscription });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/subscriptions
 * Create subscription
 */
router.post('/', async (req, res) => {
    try {
        const allowedFields = pickAllowedFields(req.body, ALLOWED_SUBSCRIPTION_FIELDS);

        if (!allowedFields.clientId || !allowedFields.name || !allowedFields.amount) {
            throw CustomException('Client ID, name, and amount are required', 400);
        }

        allowedFields.clientId = sanitizeObjectId(allowedFields.clientId);
        if (!allowedFields.clientId) {
            throw CustomException('Invalid client ID format', 400);
        }

        const subscriptionId = new mongoose.Types.ObjectId();
        const subscriptionData = {
            _id: subscriptionId,
            ...allowedFields,
            status: allowedFields.status || 'pending',
            currency: allowedFields.currency || 'SAR',
            billingCycle: allowedFields.billingCycle || 'monthly',
            autoRenew: allowedFields.autoRenew !== false,
            usedHours: 0,
            invoices: [],
            createdAt: new Date(),
            createdBy: req.userID
        };

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $push: { subscriptions: subscriptionData } }
        );

        return res.status(201).json({
            success: true,
            message: 'Subscription created successfully',
            data: subscriptionData
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/subscriptions/:id
 * Update subscription
 */
router.patch('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid subscription ID format', 400);
        }

        const allowedFields = pickAllowedFields(req.body, ALLOWED_SUBSCRIPTION_FIELDS);

        if (allowedFields.status && !VALID_STATUSES.includes(allowedFields.status)) {
            throw CustomException(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, 400);
        }

        const result = await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'subscriptions._id': sanitizedId
            },
            {
                $set: Object.keys(allowedFields).reduce((acc, key) => {
                    acc[`subscriptions.$.${key}`] = allowedFields[key];
                    return acc;
                }, {
                    'subscriptions.$.updatedAt': new Date(),
                    'subscriptions.$.updatedBy': req.userID
                })
            },
            { new: true }
        );

        if (!result) {
            throw CustomException('Subscription not found', 404);
        }

        return res.json({
            success: true,
            message: 'Subscription updated'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * DELETE /api/subscriptions/:id
 * Delete subscription
 */
router.delete('/:id', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid subscription ID format', 400);
        }

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $pull: { subscriptions: { _id: sanitizedId } } }
        );

        return res.json({
            success: true,
            message: 'Subscription deleted'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/subscriptions/:id/activate
 * Activate subscription
 */
router.post('/:id/activate', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid subscription ID format', 400);
        }

        const result = await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'subscriptions._id': sanitizedId,
                'subscriptions.status': { $in: ['pending', 'paused'] }
            },
            {
                $set: {
                    'subscriptions.$.status': 'active',
                    'subscriptions.$.activatedAt': new Date(),
                    'subscriptions.$.activatedBy': req.userID
                }
            },
            { new: true }
        );

        if (!result) {
            throw CustomException('Subscription not found or cannot be activated', 404);
        }

        return res.json({
            success: true,
            message: 'Subscription activated'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/subscriptions/:id/pause
 * Pause subscription
 */
router.post('/:id/pause', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid subscription ID format', 400);
        }

        const { reason } = req.body;

        const result = await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'subscriptions._id': sanitizedId,
                'subscriptions.status': 'active'
            },
            {
                $set: {
                    'subscriptions.$.status': 'paused',
                    'subscriptions.$.pausedAt': new Date(),
                    'subscriptions.$.pausedBy': req.userID,
                    'subscriptions.$.pauseReason': reason
                }
            },
            { new: true }
        );

        if (!result) {
            throw CustomException('Subscription not found or cannot be paused', 404);
        }

        return res.json({
            success: true,
            message: 'Subscription paused'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/subscriptions/:id/resume
 * Resume paused subscription
 */
router.post('/:id/resume', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid subscription ID format', 400);
        }

        const result = await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'subscriptions._id': sanitizedId,
                'subscriptions.status': 'paused'
            },
            {
                $set: {
                    'subscriptions.$.status': 'active',
                    'subscriptions.$.resumedAt': new Date(),
                    'subscriptions.$.resumedBy': req.userID
                },
                $unset: {
                    'subscriptions.$.pauseReason': 1
                }
            },
            { new: true }
        );

        if (!result) {
            throw CustomException('Subscription not found or not paused', 404);
        }

        return res.json({
            success: true,
            message: 'Subscription resumed'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/subscriptions/:id/cancel
 * Cancel subscription
 */
router.post('/:id/cancel', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid subscription ID format', 400);
        }

        const { reason, cancelImmediately } = req.body;

        const updates = {
            'subscriptions.$.status': 'cancelled',
            'subscriptions.$.cancelledAt': new Date(),
            'subscriptions.$.cancelledBy': req.userID,
            'subscriptions.$.cancelReason': reason,
            'subscriptions.$.autoRenew': false
        };

        if (cancelImmediately) {
            updates['subscriptions.$.endDate'] = new Date();
        }

        const result = await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'subscriptions._id': sanitizedId,
                'subscriptions.status': { $in: ['active', 'paused', 'pending'] }
            },
            { $set: updates },
            { new: true }
        );

        if (!result) {
            throw CustomException('Subscription not found or cannot be cancelled', 404);
        }

        return res.json({
            success: true,
            message: 'Subscription cancelled'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/subscriptions/:id/renew
 * Renew subscription
 */
router.post('/:id/renew', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid subscription ID format', 400);
        }

        const { periods } = req.body;
        const renewPeriods = periods || 1;

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('subscriptions');

        const subscription = (firm?.subscriptions || [])
            .find(s => s._id.toString() === sanitizedId);

        if (!subscription) {
            throw CustomException('Subscription not found', 404);
        }

        // Calculate new end date based on billing cycle
        const currentEnd = subscription.endDate ? new Date(subscription.endDate) : new Date();
        let newEndDate = new Date(currentEnd);

        for (let i = 0; i < renewPeriods; i++) {
            switch (subscription.billingCycle) {
                case 'monthly':
                    newEndDate.setMonth(newEndDate.getMonth() + 1);
                    break;
                case 'quarterly':
                    newEndDate.setMonth(newEndDate.getMonth() + 3);
                    break;
                case 'semi-annual':
                    newEndDate.setMonth(newEndDate.getMonth() + 6);
                    break;
                case 'annual':
                    newEndDate.setFullYear(newEndDate.getFullYear() + 1);
                    break;
                default:
                    newEndDate.setMonth(newEndDate.getMonth() + 1);
            }
        }

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'subscriptions._id': sanitizedId
            },
            {
                $set: {
                    'subscriptions.$.status': 'active',
                    'subscriptions.$.endDate': newEndDate,
                    'subscriptions.$.renewedAt': new Date(),
                    'subscriptions.$.renewedBy': req.userID
                }
            }
        );

        return res.json({
            success: true,
            message: 'Subscription renewed',
            data: { newEndDate }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/subscriptions/:id/change-plan
 * Change subscription plan
 */
router.post('/:id/change-plan', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid subscription ID format', 400);
        }

        const { planId, amount, includedHours, effectiveDate } = req.body;

        if (!planId && !amount) {
            throw CustomException('New plan ID or amount is required', 400);
        }

        const updates = {
            'subscriptions.$.planChangedAt': new Date(),
            'subscriptions.$.planChangedBy': req.userID
        };

        if (planId) updates['subscriptions.$.planId'] = sanitizeObjectId(planId);
        if (amount !== undefined) updates['subscriptions.$.amount'] = amount;
        if (includedHours !== undefined) updates['subscriptions.$.includedHours'] = includedHours;

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'subscriptions._id': sanitizedId
            },
            { $set: updates }
        );

        return res.json({
            success: true,
            message: 'Plan changed successfully'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/subscriptions/:id/consume-hours
 * Consume hours from subscription
 */
router.post('/:id/consume-hours', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid subscription ID format', 400);
        }

        const { hours, description, taskId } = req.body;

        if (typeof hours !== 'number' || hours <= 0) {
            throw CustomException('Valid positive hours are required', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('subscriptions');

        const subscription = (firm?.subscriptions || [])
            .find(s => s._id.toString() === sanitizedId);

        if (!subscription) {
            throw CustomException('Subscription not found', 404);
        }

        const newUsedHours = (subscription.usedHours || 0) + hours;
        const remainingHours = (subscription.includedHours || 0) - newUsedHours;

        const usage = {
            _id: new mongoose.Types.ObjectId(),
            hours,
            description,
            taskId: taskId ? sanitizeObjectId(taskId) : null,
            usedAt: new Date(),
            usedBy: req.userID
        };

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'subscriptions._id': sanitizedId
            },
            {
                $set: { 'subscriptions.$.usedHours': newUsedHours },
                $push: { 'subscriptions.$.hoursUsage': usage }
            }
        );

        return res.json({
            success: true,
            message: 'Hours consumed',
            data: {
                consumed: hours,
                totalUsed: newUsedHours,
                remaining: Math.max(0, remainingHours)
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/subscriptions/:id/hours-usage
 * Get hours usage history
 */
router.get('/:id/hours-usage', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid subscription ID format', 400);
        }

        const { page, limit, skip } = sanitizePagination(req.query, { maxLimit: 100 });

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('subscriptions');

        const subscription = (firm?.subscriptions || [])
            .find(s => s._id.toString() === sanitizedId);

        if (!subscription) {
            throw CustomException('Subscription not found', 404);
        }

        const usage = subscription.hoursUsage || [];
        usage.sort((a, b) => new Date(b.usedAt) - new Date(a.usedAt));

        const total = usage.length;
        const paginatedUsage = usage.slice(skip, skip + limit);

        return res.json({
            success: true,
            count: paginatedUsage.length,
            data: paginatedUsage,
            summary: {
                totalHours: subscription.includedHours || 0,
                usedHours: subscription.usedHours || 0,
                remainingHours: Math.max(0, (subscription.includedHours || 0) - (subscription.usedHours || 0))
            },
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/subscriptions/:id/reset-hours
 * Reset hours usage (new billing period)
 */
router.post('/:id/reset-hours', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid subscription ID format', 400);
        }

        const { reason } = req.body;

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'subscriptions._id': sanitizedId
            },
            {
                $set: {
                    'subscriptions.$.usedHours': 0,
                    'subscriptions.$.hoursResetAt': new Date(),
                    'subscriptions.$.hoursResetBy': req.userID,
                    'subscriptions.$.hoursResetReason': reason
                },
                $push: {
                    'subscriptions.$.hoursResetHistory': {
                        resetAt: new Date(),
                        resetBy: req.userID,
                        reason
                    }
                }
            }
        );

        return res.json({
            success: true,
            message: 'Hours reset to zero'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/subscriptions/:id/invoices
 * Get subscription invoices
 */
router.get('/:id/invoices', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid subscription ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('subscriptions');

        const subscription = (firm?.subscriptions || [])
            .find(s => s._id.toString() === sanitizedId);

        if (!subscription) {
            throw CustomException('Subscription not found', 404);
        }

        const invoices = subscription.invoices || [];
        invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return res.json({
            success: true,
            count: invoices.length,
            data: invoices
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/subscriptions/:id/generate-invoice
 * Generate invoice for subscription
 */
router.post('/:id/generate-invoice', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid subscription ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('subscriptions');

        const subscription = (firm?.subscriptions || [])
            .find(s => s._id.toString() === sanitizedId);

        if (!subscription) {
            throw CustomException('Subscription not found', 404);
        }

        const invoiceId = new mongoose.Types.ObjectId();
        const invoiceNumber = `INV-${Date.now()}`;

        const invoice = {
            _id: invoiceId,
            invoiceNumber,
            amount: subscription.amount,
            currency: subscription.currency,
            status: 'pending',
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            periodStart: subscription.nextBillingDate || new Date(),
            periodEnd: new Date(new Date(subscription.nextBillingDate || new Date()).getTime() + 30 * 24 * 60 * 60 * 1000),
            createdAt: new Date(),
            createdBy: req.userID
        };

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'subscriptions._id': sanitizedId
            },
            {
                $push: { 'subscriptions.$.invoices': invoice }
            }
        );

        return res.status(201).json({
            success: true,
            message: 'Invoice generated',
            data: invoice
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/subscriptions/:id/upcoming-invoice
 * Preview upcoming invoice
 */
router.get('/:id/upcoming-invoice', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid subscription ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('subscriptions');

        const subscription = (firm?.subscriptions || [])
            .find(s => s._id.toString() === sanitizedId);

        if (!subscription) {
            throw CustomException('Subscription not found', 404);
        }

        const preview = {
            amount: subscription.amount,
            currency: subscription.currency,
            billingDate: subscription.nextBillingDate,
            billingCycle: subscription.billingCycle,
            additionalCharges: 0,
            discounts: 0,
            total: subscription.amount
        };

        return res.json({
            success: true,
            data: preview
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/subscriptions/:id/renewal-preview
 * Preview renewal details
 */
router.get('/:id/renewal-preview', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid subscription ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('subscriptions');

        const subscription = (firm?.subscriptions || [])
            .find(s => s._id.toString() === sanitizedId);

        if (!subscription) {
            throw CustomException('Subscription not found', 404);
        }

        const endDate = subscription.endDate ? new Date(subscription.endDate) : new Date();
        let newEndDate = new Date(endDate);

        switch (subscription.billingCycle) {
            case 'monthly':
                newEndDate.setMonth(newEndDate.getMonth() + 1);
                break;
            case 'quarterly':
                newEndDate.setMonth(newEndDate.getMonth() + 3);
                break;
            case 'semi-annual':
                newEndDate.setMonth(newEndDate.getMonth() + 6);
                break;
            case 'annual':
                newEndDate.setFullYear(newEndDate.getFullYear() + 1);
                break;
        }

        return res.json({
            success: true,
            data: {
                currentEndDate: endDate,
                newEndDate,
                amount: subscription.amount,
                billingCycle: subscription.billingCycle,
                autoRenew: subscription.autoRenew
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/subscriptions/stats
 * Get subscription statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const firm = await Firm.findOne({ _id: req.firmId })
            .select('subscriptions');

        const subscriptions = firm?.subscriptions || [];

        const stats = {
            total: subscriptions.length,
            byStatus: {},
            totalMRR: 0,
            totalARR: 0
        };

        VALID_STATUSES.forEach(status => {
            stats.byStatus[status] = subscriptions.filter(s => s.status === status).length;
        });

        // Calculate MRR (Monthly Recurring Revenue)
        subscriptions.filter(s => s.status === 'active').forEach(s => {
            let monthlyAmount = s.amount;
            switch (s.billingCycle) {
                case 'quarterly':
                    monthlyAmount = s.amount / 3;
                    break;
                case 'semi-annual':
                    monthlyAmount = s.amount / 6;
                    break;
                case 'annual':
                    monthlyAmount = s.amount / 12;
                    break;
            }
            stats.totalMRR += monthlyAmount;
        });

        stats.totalARR = stats.totalMRR * 12;

        return res.json({
            success: true,
            data: stats
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/subscriptions/upcoming-renewals
 * Get subscriptions with upcoming renewals
 */
router.get('/upcoming-renewals', async (req, res) => {
    try {
        const { days } = req.query;
        const daysAhead = parseInt(days) || 30;

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('subscriptions');

        const cutoffDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

        const upcoming = (firm?.subscriptions || [])
            .filter(s =>
                s.status === 'active' &&
                s.autoRenew &&
                s.endDate &&
                new Date(s.endDate) <= cutoffDate
            )
            .sort((a, b) => new Date(a.endDate) - new Date(b.endDate));

        return res.json({
            success: true,
            count: upcoming.length,
            data: upcoming
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/subscriptions/past-due
 * Get past due subscriptions
 */
router.get('/past-due', async (req, res) => {
    try {
        const firm = await Firm.findOne({ _id: req.firmId })
            .select('subscriptions');

        const now = new Date();

        const pastDue = (firm?.subscriptions || [])
            .filter(s =>
                s.status === 'active' &&
                s.nextBillingDate &&
                new Date(s.nextBillingDate) < now
            )
            .sort((a, b) => new Date(a.nextBillingDate) - new Date(b.nextBillingDate));

        return res.json({
            success: true,
            count: pastDue.length,
            data: pastDue
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

module.exports = router;
