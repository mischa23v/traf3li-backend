/**
 * Payment Terms Controller
 *
 * Handles payment terms templates CRUD and utility functions
 */

const Joi = require('joi');
const PaymentTerms = require('../models/paymentTerms.model');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// ============ VALIDATION SCHEMAS ============

const installmentSchema = Joi.object({
    percentage: Joi.number().min(0).max(100).required(),
    days: Joi.number().integer().min(0).required(),
    description: Joi.string().optional(),
    descriptionAr: Joi.string().optional()
});

const discountSchema = Joi.object({
    percentage: Joi.number().min(0).max(100).required(),
    days: Joi.number().integer().min(0).required(),
    description: Joi.string().optional(),
    descriptionAr: Joi.string().optional()
});

const lateFeeSchema = Joi.object({
    type: Joi.string().valid('percentage', 'flat').required(),
    value: Joi.number().min(0).required(),
    gracePeriodDays: Joi.number().integer().min(0).optional(),
    maxAmount: Joi.number().min(0).optional(),
    description: Joi.string().optional(),
    descriptionAr: Joi.string().optional()
});

const paymentTermSchema = Joi.object({
    name: Joi.string().required().max(200),
    nameAr: Joi.string().optional().max(200),
    code: Joi.string().optional().max(50),
    description: Joi.string().optional().max(1000),
    descriptionAr: Joi.string().optional().max(1000),
    termType: Joi.string().valid('net', 'eom', 'custom', 'installment', 'due_on_receipt').required(),
    netDays: Joi.number().integer().min(0).max(365).optional(),
    endOfMonth: Joi.boolean().optional(),
    customDate: Joi.date().optional(),
    installments: Joi.array().items(installmentSchema).optional(),
    earlyPaymentDiscounts: Joi.array().items(discountSchema).optional(),
    lateFee: lateFeeSchema.optional(),
    displayText: Joi.string().optional().max(500),
    displayTextAr: Joi.string().optional().max(500),
    invoiceFooterText: Joi.string().optional().max(1000),
    invoiceFooterTextAr: Joi.string().optional().max(1000),
    isActive: Joi.boolean().optional()
});

// ============ HELPER FUNCTIONS ============

/**
 * Validate installments total to 100%
 */
const validateInstallments = (installments) => {
    if (!installments || installments.length === 0) return true;

    const total = installments.reduce((sum, inst) => sum + inst.percentage, 0);
    if (Math.abs(total - 100) > 0.01) {
        throw CustomException('Installment percentages must total 100%', 400, {
            messageAr: 'يجب أن يكون مجموع نسب الأقساط 100٪'
        });
    }

    return true;
};

/**
 * Verify firmId ownership for IDOR protection
 */
const verifyFirmOwnership = async (termId, firmQuery) => {
    const term = await PaymentTerms.findOne({
        _id: sanitizeObjectId(termId),
        ...firmQuery
    });

    if (!term) {
        throw CustomException('Payment term not found or access denied', 404, {
            messageAr: 'لم يتم العثور على شروط الدفع أو تم رفض الوصول'
        });
    }

    return term;
};

/**
 * Get all payment terms
 */
const getPaymentTerms = asyncHandler(async (req, res) => {
    const { isActive, termType } = req.query;

    const query = { ...req.firmQuery };
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (termType) query.termType = termType;

    const paymentTerms = await PaymentTerms.find(query)
        .sort({ isDefault: -1, isSystem: -1, name: 1 });

    res.json({
        success: true,
        data: paymentTerms
    });
});

/**
 * Get single payment term
 */
const getPaymentTerm = asyncHandler(async (req, res) => {
    // IDOR Protection: Verify firmId ownership
    const term = await verifyFirmOwnership(req.params.id, req.firmQuery);

    res.json({
        success: true,
        data: term
    });
});

/**
 * Get default payment term
 */
const getDefaultTerm = asyncHandler(async (req, res) => {
    const term = await PaymentTerms.getDefault(req.firmId, req.firmId ? null : req.userID);

    res.json({
        success: true,
        data: term
    });
});

/**
 * Create payment term
 */
const createPaymentTerm = asyncHandler(async (req, res) => {
    // Mass Assignment Protection: Use pickAllowedFields
    const allowedFields = [
        'name', 'nameAr', 'code', 'description', 'descriptionAr',
        'termType', 'netDays', 'endOfMonth', 'customDate', 'installments',
        'earlyPaymentDiscounts', 'lateFee',
        'displayText', 'displayTextAr', 'invoiceFooterText', 'invoiceFooterTextAr'
    ];
    const data = pickAllowedFields(req.body, allowedFields);

    // Input Validation: Validate against schema
    const { error, value } = paymentTermSchema.validate(data, { abortEarly: false });
    if (error) {
        throw CustomException(
            error.details.map(d => d.message).join(', '),
            400,
            { messageAr: 'بيانات غير صالحة' }
        );
    }

    // Validate installments total 100% if provided
    if (value.installments && value.installments.length > 0) {
        validateInstallments(value.installments);
    }

    // Validate days and percentage values
    if (value.netDays !== undefined && (value.netDays < 0 || value.netDays > 365)) {
        throw CustomException('Net days must be between 0 and 365', 400, {
            messageAr: 'يجب أن تكون صافي الأيام بين 0 و 365'
        });
    }

    // Check for duplicate code
    if (value.code) {
        const existing = await PaymentTerms.findOne({
            ...req.firmQuery,
            code: value.code
        });
        if (existing) {
            throw CustomException('Payment term with this code already exists', 400, {
                messageAr: 'يوجد بالفعل شروط دفع بهذا الرمز'
            });
        }
    }

    // IDOR Protection: Enforce firmId from authenticated user
    const term = new PaymentTerms({
        ...value,
        firmId: req.firmId,
        lawyerId: req.firmId ? null : req.userID,
        isSystem: false,
        createdBy: req.userID
    });

    await term.save();

    res.status(201).json({
        success: true,
        data: term,
        message: 'Payment term created',
        messageAr: 'تم إنشاء شروط الدفع'
    });
});

/**
 * Update payment term
 */
const updatePaymentTerm = asyncHandler(async (req, res) => {
    // IDOR Protection: Verify firmId ownership
    const term = await verifyFirmOwnership(req.params.id, req.firmQuery);

    // Can't modify certain fields of system terms
    if (term.isSystem) {
        const systemProtectedFields = ['termType', 'netDays', 'code'];
        const attemptedChanges = systemProtectedFields.filter(f => req.body[f] !== undefined);
        if (attemptedChanges.length > 0) {
            throw CustomException('Cannot modify core settings of system payment terms', 400, {
                messageAr: 'لا يمكن تعديل الإعدادات الأساسية لشروط الدفع النظامية'
            });
        }
    }

    // Mass Assignment Protection: Use pickAllowedFields
    const allowedFields = [
        'name', 'nameAr', 'description', 'descriptionAr',
        'termType', 'netDays', 'endOfMonth', 'customDate', 'installments',
        'earlyPaymentDiscounts', 'lateFee',
        'displayText', 'displayTextAr', 'invoiceFooterText', 'invoiceFooterTextAr',
        'isActive'
    ];

    if (!term.isSystem) {
        allowedFields.push('code');
    }

    const data = pickAllowedFields(req.body, allowedFields);

    // Input Validation: Validate against schema (partial validation for updates)
    const updateSchema = paymentTermSchema.fork(
        ['name', 'termType'],
        (schema) => schema.optional()
    );

    const { error, value } = updateSchema.validate(data, { abortEarly: false });
    if (error) {
        throw CustomException(
            error.details.map(d => d.message).join(', '),
            400,
            { messageAr: 'بيانات غير صالحة' }
        );
    }

    // Validate installments total 100% if provided
    if (value.installments && value.installments.length > 0) {
        validateInstallments(value.installments);
    }

    // Validate days and percentage values
    if (value.netDays !== undefined && (value.netDays < 0 || value.netDays > 365)) {
        throw CustomException('Net days must be between 0 and 365', 400, {
            messageAr: 'يجب أن تكون صافي الأيام بين 0 و 365'
        });
    }

    // Check for duplicate code if code is being changed
    if (value.code && value.code !== term.code) {
        const existing = await PaymentTerms.findOne({
            ...req.firmQuery,
            code: value.code,
            _id: { $ne: term._id }
        });
        if (existing) {
            throw CustomException('Payment term with this code already exists', 400, {
                messageAr: 'يوجد بالفعل شروط دفع بهذا الرمز'
            });
        }
    }

    // Apply validated changes
    Object.keys(value).forEach(field => {
        term[field] = value[field];
    });

    term.updatedBy = req.userID;
    await term.save();

    res.json({
        success: true,
        data: term,
        message: 'Payment term updated',
        messageAr: 'تم تحديث شروط الدفع'
    });
});

/**
 * Delete payment term
 */
const deletePaymentTerm = asyncHandler(async (req, res) => {
    // IDOR Protection: Verify firmId ownership
    const term = await verifyFirmOwnership(req.params.id, req.firmQuery);

    if (term.isSystem) {
        throw CustomException('Cannot delete system payment terms', 400, {
            messageAr: 'لا يمكن حذف شروط الدفع النظامية'
        });
    }

    if (term.isDefault) {
        throw CustomException('Cannot delete default payment term. Set another as default first.', 400, {
            messageAr: 'لا يمكن حذف شروط الدفع الافتراضية. قم بتعيين شروط أخرى كافتراضية أولاً.'
        });
    }

    // Check if in use
    const Invoice = require('../models/invoice.model');
    const inUse = await Invoice.exists({
        ...req.firmQuery,
        paymentTermsId: term._id
    });

    if (inUse) {
        throw CustomException('Payment term is in use by invoices', 400, {
            messageAr: 'شروط الدفع مستخدمة في فواتير'
        });
    }

    await term.deleteOne();

    res.json({
        success: true,
        message: 'Payment term deleted',
        messageAr: 'تم حذف شروط الدفع'
    });
});

/**
 * Set as default payment term
 */
const setAsDefault = asyncHandler(async (req, res) => {
    // IDOR Protection: Verify firmId ownership
    const term = await verifyFirmOwnership(req.params.id, req.firmQuery);

    if (!term.isActive) {
        throw CustomException('Cannot set inactive term as default', 400, {
            messageAr: 'لا يمكن تعيين شروط دفع غير نشطة كافتراضية'
        });
    }

    await term.setAsDefault(req.userID);

    res.json({
        success: true,
        data: term,
        message: 'Default payment term updated',
        messageAr: 'تم تحديث شروط الدفع الافتراضية'
    });
});

/**
 * Initialize default templates
 */
const initializeTemplates = asyncHandler(async (req, res) => {
    const created = await PaymentTerms.initializeDefaults(
        req.firmId,
        req.firmId ? null : req.userID,
        req.userID
    );

    res.json({
        success: true,
        data: created,
        message: `${created.length} payment terms initialized`,
        messageAr: `تم إنشاء ${created.length} من شروط الدفع`
    });
});

/**
 * Calculate due date using payment term
 */
const calculateDueDate = asyncHandler(async (req, res) => {
    const { invoiceDate } = req.body;

    // Input Validation: Validate invoice date
    if (!invoiceDate) {
        throw CustomException('Invoice date is required', 400, {
            messageAr: 'تاريخ الفاتورة مطلوب'
        });
    }

    const date = new Date(invoiceDate);
    if (isNaN(date.getTime())) {
        throw CustomException('Invalid invoice date format', 400, {
            messageAr: 'تنسيق تاريخ الفاتورة غير صالح'
        });
    }

    // IDOR Protection: Verify firmId ownership
    const term = await verifyFirmOwnership(req.params.id, req.firmQuery);

    const dueDate = term.calculateDueDate(invoiceDate);

    res.json({
        success: true,
        data: {
            invoiceDate,
            dueDate,
            paymentTerms: term.displayText || term.name
        }
    });
});

/**
 * Calculate installment schedule
 */
const calculateInstallments = asyncHandler(async (req, res) => {
    const { invoiceDate, totalAmount } = req.body;

    // Input Validation: Validate required fields
    if (!invoiceDate || !totalAmount) {
        throw CustomException('Invoice date and total amount are required', 400, {
            messageAr: 'تاريخ الفاتورة والمبلغ الإجمالي مطلوبان'
        });
    }

    // Validate invoice date format
    const date = new Date(invoiceDate);
    if (isNaN(date.getTime())) {
        throw CustomException('Invalid invoice date format', 400, {
            messageAr: 'تنسيق تاريخ الفاتورة غير صالح'
        });
    }

    // Validate total amount
    const amount = parseFloat(totalAmount);
    if (isNaN(amount) || amount <= 0) {
        throw CustomException('Total amount must be a positive number', 400, {
            messageAr: 'يجب أن يكون المبلغ الإجمالي رقمًا موجبًا'
        });
    }

    // IDOR Protection: Verify firmId ownership
    const term = await verifyFirmOwnership(req.params.id, req.firmQuery);

    const schedule = term.calculateInstallmentSchedule(invoiceDate, totalAmount);

    res.json({
        success: true,
        data: {
            invoiceDate,
            totalAmount,
            schedule
        }
    });
});

module.exports = {
    getPaymentTerms,
    getPaymentTerm,
    getDefaultTerm,
    createPaymentTerm,
    updatePaymentTerm,
    deletePaymentTerm,
    setAsDefault,
    initializeTemplates,
    calculateDueDate,
    calculateInstallments
};
