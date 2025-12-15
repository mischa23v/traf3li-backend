/**
 * Payment Terms Controller
 *
 * Handles payment terms templates CRUD and utility functions
 */

const PaymentTerms = require('../models/paymentTerms.model');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

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
    const term = await PaymentTerms.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!term) {
        throw CustomException('Payment term not found', 404, {
            messageAr: 'لم يتم العثور على شروط الدفع'
        });
    }

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
    const {
        name, nameAr, code, description, descriptionAr,
        termType, netDays, endOfMonth, customDate, installments,
        earlyPaymentDiscounts, lateFee,
        displayText, displayTextAr, invoiceFooterText, invoiceFooterTextAr
    } = req.body;

    // Check for duplicate code
    if (code) {
        const existing = await PaymentTerms.findOne({
            ...req.firmQuery,
            code
        });
        if (existing) {
            throw CustomException('Payment term with this code already exists', 400, {
                messageAr: 'يوجد بالفعل شروط دفع بهذا الرمز'
            });
        }
    }

    const term = new PaymentTerms({
        firmId: req.firmId,
        lawyerId: req.firmId ? null : req.userID,
        name,
        nameAr,
        code,
        description,
        descriptionAr,
        termType,
        netDays,
        endOfMonth,
        customDate,
        installments,
        earlyPaymentDiscounts,
        lateFee,
        displayText,
        displayTextAr,
        invoiceFooterText,
        invoiceFooterTextAr,
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
    const term = await PaymentTerms.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!term) {
        throw CustomException('Payment term not found', 404, {
            messageAr: 'لم يتم العثور على شروط الدفع'
        });
    }

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

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            term[field] = req.body[field];
        }
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
    const term = await PaymentTerms.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!term) {
        throw CustomException('Payment term not found', 404, {
            messageAr: 'لم يتم العثور على شروط الدفع'
        });
    }

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
    const term = await PaymentTerms.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!term) {
        throw CustomException('Payment term not found', 404, {
            messageAr: 'لم يتم العثور على شروط الدفع'
        });
    }

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

    if (!invoiceDate) {
        throw CustomException('Invoice date is required', 400, {
            messageAr: 'تاريخ الفاتورة مطلوب'
        });
    }

    const term = await PaymentTerms.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!term) {
        throw CustomException('Payment term not found', 404, {
            messageAr: 'لم يتم العثور على شروط الدفع'
        });
    }

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

    if (!invoiceDate || !totalAmount) {
        throw CustomException('Invoice date and total amount are required', 400, {
            messageAr: 'تاريخ الفاتورة والمبلغ الإجمالي مطلوبان'
        });
    }

    const term = await PaymentTerms.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!term) {
        throw CustomException('Payment term not found', 404, {
            messageAr: 'لم يتم العثور على شروط الدفع'
        });
    }

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
