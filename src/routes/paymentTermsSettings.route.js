/**
 * Payment Terms Settings Routes
 *
 * Firm-level payment terms configuration for invoices and billing.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - GET /                        - Get all payment terms
 * - GET /:id                     - Get payment term by ID
 * - POST /                       - Create payment term
 * - PUT /:id                     - Update payment term
 * - DELETE /:id                  - Delete payment term
 * - POST /:id/set-default        - Set as default payment term
 * - GET /templates               - Get payment term templates
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Allowed fields for payment terms
const ALLOWED_TERM_FIELDS = [
    'name', 'code', 'description', 'daysUntilDue', 'discountPercentage',
    'discountDays', 'lateFeePercentage', 'lateFeeType', 'isActive',
    'applicableTo', 'minimumAmount', 'maximumAmount', 'conditions'
];

// Valid late fee types
const VALID_LATE_FEE_TYPES = ['percentage', 'flat', 'compound', 'none'];
const VALID_APPLICABLE_TO = ['all', 'invoices', 'retainers', 'expenses'];

// Standard payment term templates
const PAYMENT_TERM_TEMPLATES = [
    {
        name: 'Net 30',
        code: 'NET30',
        description: 'Payment due within 30 days of invoice date',
        daysUntilDue: 30,
        discountPercentage: 0,
        discountDays: 0
    },
    {
        name: 'Net 15',
        code: 'NET15',
        description: 'Payment due within 15 days of invoice date',
        daysUntilDue: 15,
        discountPercentage: 0,
        discountDays: 0
    },
    {
        name: 'Net 60',
        code: 'NET60',
        description: 'Payment due within 60 days of invoice date',
        daysUntilDue: 60,
        discountPercentage: 0,
        discountDays: 0
    },
    {
        name: 'Due on Receipt',
        code: 'DOR',
        description: 'Payment due immediately upon receipt',
        daysUntilDue: 0,
        discountPercentage: 0,
        discountDays: 0
    },
    {
        name: '2/10 Net 30',
        code: '2-10-NET30',
        description: '2% discount if paid within 10 days, otherwise due in 30 days',
        daysUntilDue: 30,
        discountPercentage: 2,
        discountDays: 10
    },
    {
        name: '1/10 Net 60',
        code: '1-10-NET60',
        description: '1% discount if paid within 10 days, otherwise due in 60 days',
        daysUntilDue: 60,
        discountPercentage: 1,
        discountDays: 10
    },
    {
        name: 'End of Month',
        code: 'EOM',
        description: 'Payment due at end of invoice month',
        daysUntilDue: -1, // Special: end of month
        discountPercentage: 0,
        discountDays: 0
    },
    {
        name: 'Net 45',
        code: 'NET45',
        description: 'Payment due within 45 days of invoice date',
        daysUntilDue: 45,
        discountPercentage: 0,
        discountDays: 0
    }
];

/**
 * GET / - Get all payment terms
 */
router.get('/', async (req, res, next) => {
    try {
        const { isActive, search, applicableTo } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('settings.paymentTerms').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let terms = firm.settings?.paymentTerms || [];

        if (isActive !== undefined) {
            const active = isActive === 'true';
            terms = terms.filter(t => t.isActive === active);
        }

        if (applicableTo && VALID_APPLICABLE_TO.includes(applicableTo)) {
            terms = terms.filter(t =>
                !t.applicableTo || t.applicableTo === 'all' || t.applicableTo === applicableTo
            );
        }

        if (search) {
            const pattern = escapeRegex(search).toLowerCase();
            terms = terms.filter(t =>
                t.name?.toLowerCase().includes(pattern) ||
                t.code?.toLowerCase().includes(pattern) ||
                t.description?.toLowerCase().includes(pattern)
            );
        }

        // Sort: default first, then by name
        terms.sort((a, b) => {
            if (a.isDefault && !b.isDefault) return -1;
            if (!a.isDefault && b.isDefault) return 1;
            return (a.name || '').localeCompare(b.name || '');
        });

        res.json({
            success: true,
            data: terms,
            count: terms.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /templates - Get payment term templates
 */
router.get('/templates', async (req, res, next) => {
    try {
        res.json({
            success: true,
            data: PAYMENT_TERM_TEMPLATES,
            count: PAYMENT_TERM_TEMPLATES.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:id - Get payment term by ID
 */
router.get('/:id', async (req, res, next) => {
    try {
        const termId = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery).select('settings.paymentTerms').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const term = (firm.settings?.paymentTerms || []).find(
            t => t._id?.toString() === termId.toString()
        );

        if (!term) {
            throw CustomException('Payment term not found', 404);
        }

        res.json({
            success: true,
            data: term
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST / - Create payment term
 */
router.post('/', async (req, res, next) => {
    try {
        const safeData = pickAllowedFields(req.body, ALLOWED_TERM_FIELDS);

        if (!safeData.name) {
            throw CustomException('Payment term name is required', 400);
        }

        if (safeData.daysUntilDue === undefined || safeData.daysUntilDue < -1) {
            throw CustomException('Days until due is required and must be >= -1', 400);
        }

        if (safeData.lateFeeType && !VALID_LATE_FEE_TYPES.includes(safeData.lateFeeType)) {
            throw CustomException(`Invalid late fee type. Must be one of: ${VALID_LATE_FEE_TYPES.join(', ')}`, 400);
        }

        if (safeData.applicableTo && !VALID_APPLICABLE_TO.includes(safeData.applicableTo)) {
            throw CustomException(`Invalid applicableTo. Must be one of: ${VALID_APPLICABLE_TO.join(', ')}`, 400);
        }

        // Validate discount
        if (safeData.discountPercentage && safeData.discountPercentage > 0) {
            if (!safeData.discountDays || safeData.discountDays <= 0) {
                throw CustomException('Discount days required when discount percentage is set', 400);
            }
            if (safeData.discountDays > safeData.daysUntilDue && safeData.daysUntilDue !== -1) {
                throw CustomException('Discount days cannot exceed days until due', 400);
            }
        }

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        if (!firm.settings) firm.settings = {};
        if (!firm.settings.paymentTerms) firm.settings.paymentTerms = [];

        // Check for duplicate code
        if (safeData.code) {
            const existing = firm.settings.paymentTerms.find(
                t => t.code?.toLowerCase() === safeData.code.toLowerCase()
            );
            if (existing) {
                throw CustomException('Payment term with this code already exists', 400);
            }
        }

        const term = {
            _id: new mongoose.Types.ObjectId(),
            ...safeData,
            isDefault: firm.settings.paymentTerms.length === 0, // First term is default
            isActive: safeData.isActive !== false,
            createdBy: req.userID,
            createdAt: new Date()
        };

        firm.settings.paymentTerms.push(term);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Payment term created',
            data: term
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /:id - Update payment term
 */
router.put('/:id', async (req, res, next) => {
    try {
        const termId = sanitizeObjectId(req.params.id, 'id');
        const safeData = pickAllowedFields(req.body, ALLOWED_TERM_FIELDS);

        if (safeData.lateFeeType && !VALID_LATE_FEE_TYPES.includes(safeData.lateFeeType)) {
            throw CustomException(`Invalid late fee type. Must be one of: ${VALID_LATE_FEE_TYPES.join(', ')}`, 400);
        }

        if (safeData.applicableTo && !VALID_APPLICABLE_TO.includes(safeData.applicableTo)) {
            throw CustomException(`Invalid applicableTo. Must be one of: ${VALID_APPLICABLE_TO.join(', ')}`, 400);
        }

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const termIndex = (firm.settings?.paymentTerms || []).findIndex(
            t => t._id?.toString() === termId.toString()
        );

        if (termIndex === -1) {
            throw CustomException('Payment term not found', 404);
        }

        // Check for duplicate code
        if (safeData.code) {
            const existing = firm.settings.paymentTerms.find(
                (t, idx) => idx !== termIndex && t.code?.toLowerCase() === safeData.code.toLowerCase()
            );
            if (existing) {
                throw CustomException('Payment term with this code already exists', 400);
            }
        }

        // Validate discount
        const updatedDaysUntilDue = safeData.daysUntilDue ?? firm.settings.paymentTerms[termIndex].daysUntilDue;
        const updatedDiscountPercentage = safeData.discountPercentage ?? firm.settings.paymentTerms[termIndex].discountPercentage;
        const updatedDiscountDays = safeData.discountDays ?? firm.settings.paymentTerms[termIndex].discountDays;

        if (updatedDiscountPercentage && updatedDiscountPercentage > 0) {
            if (!updatedDiscountDays || updatedDiscountDays <= 0) {
                throw CustomException('Discount days required when discount percentage is set', 400);
            }
            if (updatedDiscountDays > updatedDaysUntilDue && updatedDaysUntilDue !== -1) {
                throw CustomException('Discount days cannot exceed days until due', 400);
            }
        }

        Object.assign(firm.settings.paymentTerms[termIndex], safeData, {
            updatedBy: req.userID,
            updatedAt: new Date()
        });

        await firm.save();

        res.json({
            success: true,
            message: 'Payment term updated',
            data: firm.settings.paymentTerms[termIndex]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:id - Delete payment term
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const termId = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const termIndex = (firm.settings?.paymentTerms || []).findIndex(
            t => t._id?.toString() === termId.toString()
        );

        if (termIndex === -1) {
            throw CustomException('Payment term not found', 404);
        }

        const term = firm.settings.paymentTerms[termIndex];

        // Cannot delete default term if there are other terms
        if (term.isDefault && firm.settings.paymentTerms.length > 1) {
            throw CustomException('Cannot delete default payment term. Set another term as default first.', 400);
        }

        firm.settings.paymentTerms.splice(termIndex, 1);

        // If we deleted the last term, nothing special to do
        // If there are remaining terms and none is default, set first as default
        if (firm.settings.paymentTerms.length > 0 && !firm.settings.paymentTerms.some(t => t.isDefault)) {
            firm.settings.paymentTerms[0].isDefault = true;
        }

        await firm.save();

        res.json({
            success: true,
            message: 'Payment term deleted'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/set-default - Set as default payment term
 */
router.post('/:id/set-default', async (req, res, next) => {
    try {
        const termId = sanitizeObjectId(req.params.id, 'id');

        const firm = await Firm.findOne(req.firmQuery);
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const terms = firm.settings?.paymentTerms || [];
        const termIndex = terms.findIndex(
            t => t._id?.toString() === termId.toString()
        );

        if (termIndex === -1) {
            throw CustomException('Payment term not found', 404);
        }

        const term = terms[termIndex];

        if (!term.isActive) {
            throw CustomException('Cannot set inactive term as default', 400);
        }

        // Remove default from all other terms
        terms.forEach((t, idx) => {
            t.isDefault = idx === termIndex;
        });

        await firm.save();

        res.json({
            success: true,
            message: `"${term.name}" is now the default payment term`,
            data: term
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
