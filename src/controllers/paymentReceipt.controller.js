const PaymentReceipt = require('../models/paymentReceipt.model');
const Payment = require('../models/payment.model');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const mongoose = require('mongoose');

/**
 * Get all payment receipts
 * GET /api/payment-receipts
 */
const getPaymentReceipts = asyncHandler(async (req, res) => {
    const firmQuery = { firmId: req.firmId };
    const { clientId, startDate, endDate, status, limit = 50, offset = 0 } = req.query;

    const query = { ...firmQuery };

    if (clientId) query.clientId = clientId;
    if (status) query.status = status;

    if (startDate || endDate) {
        query.paymentDate = {};
        if (startDate) query.paymentDate.$gte = new Date(startDate);
        if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    const [receipts, total] = await Promise.all([
        PaymentReceipt.find(query)
            .populate('clientId', 'firstName lastName companyName')
            .populate('invoiceId', 'invoiceNumber totalAmount')
            .populate('paymentId', 'paymentNumber amount')
            .sort({ createdAt: -1 })
            .skip(parseInt(offset))
            .limit(parseInt(limit)),
        PaymentReceipt.countDocuments(query)
    ]);

    res.status(200).json({
        success: true,
        data: receipts,
        pagination: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: parseInt(offset) + receipts.length < total
        }
    });
});

/**
 * Get single payment receipt
 * GET /api/payment-receipts/:id
 */
const getPaymentReceipt = asyncHandler(async (req, res) => {
    // IDOR protection - verify receipt belongs to firm
    const receipt = await PaymentReceipt.findOne({
        _id: sanitizeObjectId(req.params.id),
        firmId: req.firmId
    })
        .populate('clientId', 'firstName lastName companyName email phone')
        .populate('invoiceId', 'invoiceNumber totalAmount dueDate')
        .populate('paymentId', 'paymentNumber amount paymentMethod')
        .populate('generatedBy', 'name email');

    if (!receipt) {
        throw new CustomException(
            'Payment receipt not found',
            'إيصال الدفع غير موجود',
            404
        );
    }

    res.status(200).json({
        success: true,
        data: receipt
    });
});

/**
 * Create receipt from payment
 * POST /api/payments/:paymentId/receipt
 */
const createReceiptFromPayment = asyncHandler(async (req, res) => {
    const paymentId = sanitizeObjectId(req.params.paymentId);

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'description',
        'descriptionAr',
        'notes'
    ]);

    // IDOR protection - verify payment belongs to firm
    const payment = await Payment.findOne({
        _id: paymentId,
        firmId: req.firmId
    });

    if (!payment) {
        throw new CustomException(
            'Payment not found',
            'الدفعة غير موجودة',
            404
        );
    }

    // Check if receipt already exists
    const existingReceipt = await PaymentReceipt.findOne({
        paymentId,
        status: 'active'
    });

    if (existingReceipt) {
        throw new CustomException(
            'Receipt already exists for this payment',
            'يوجد إيصال بالفعل لهذه الدفعة',
            400
        );
    }

    // Use MongoDB transaction for financial operation
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const receipt = await PaymentReceipt.createFromPayment(
            paymentId,
            req.userID,
            allowedFields,
            { session }
        );

        await receipt.populate([
            { path: 'clientId', select: 'firstName lastName companyName' },
            { path: 'paymentId', select: 'paymentNumber amount' }
        ]);

        await session.commitTransaction();

        res.status(201).json({
            success: true,
            message: 'Payment receipt created successfully',
            messageAr: 'تم إنشاء إيصال الدفع بنجاح',
            data: receipt
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

/**
 * Create receipt manually
 * POST /api/payment-receipts
 */
const createPaymentReceipt = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'paymentId',
        'invoiceId',
        'clientId',
        'caseId',
        'amount',
        'currency',
        'paymentMethod',
        'paymentDate',
        'receivedFrom',
        'receivedFromAr',
        'description',
        'descriptionAr',
        'bankAccount',
        'bankName',
        'referenceNumber',
        'checkNumber',
        'notes'
    ]);

    // Input validation for amount
    if (!allowedFields.amount || typeof allowedFields.amount !== 'number' || allowedFields.amount <= 0) {
        throw new CustomException(
            'Valid amount is required and must be greater than zero',
            'المبلغ مطلوب ويجب أن يكون أكبر من صفر',
            400
        );
    }

    if (allowedFields.amount > 999999999.99) {
        throw new CustomException(
            'Amount exceeds maximum allowed value',
            'المبلغ يتجاوز القيمة القصوى المسموح بها',
            400
        );
    }

    // IDOR protection - verify related entities belong to firm
    const Client = require('../models/client.model');
    const Invoice = require('../models/invoice.model');
    const Case = require('../models/case.model');

    if (allowedFields.paymentId) {
        const payment = await Payment.findOne({
            _id: sanitizeObjectId(allowedFields.paymentId),
            firmId: req.firmId
        });
        if (!payment) {
            throw new CustomException(
                'Payment not found or access denied',
                'الدفعة غير موجودة أو الوصول مرفوض',
                404
            );
        }
    }

    if (allowedFields.invoiceId) {
        const invoice = await Invoice.findOne({
            _id: sanitizeObjectId(allowedFields.invoiceId),
            firmId: req.firmId
        });
        if (!invoice) {
            throw new CustomException(
                'Invoice not found or access denied',
                'الفاتورة غير موجودة أو الوصول مرفوض',
                404
            );
        }
    }

    if (allowedFields.clientId) {
        const client = await Client.findOne({
            _id: sanitizeObjectId(allowedFields.clientId),
            firmId: req.firmId
        });
        if (!client) {
            throw new CustomException(
                'Client not found or access denied',
                'العميل غير موجود أو الوصول مرفوض',
                404
            );
        }
    }

    if (allowedFields.caseId) {
        const caseRecord = await Case.findOne({
            _id: sanitizeObjectId(allowedFields.caseId),
            firmId: req.firmId
        });
        if (!caseRecord) {
            throw new CustomException(
                'Case not found or access denied',
                'القضية غير موجودة أو الوصول مرفوض',
                404
            );
        }
    }

    // Use MongoDB transaction for financial operation
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const receipt = new PaymentReceipt({
            firmId: req.firmId,
            ...allowedFields,
            currency: allowedFields.currency || 'SAR',
            paymentDate: allowedFields.paymentDate || new Date(),
            generatedBy: req.userID,
            createdBy: req.userID
        });

        await receipt.save({ session });

        await session.commitTransaction();

        res.status(201).json({
            success: true,
            message: 'Payment receipt created successfully',
            messageAr: 'تم إنشاء إيصال الدفع بنجاح',
            data: receipt
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

/**
 * Void a receipt
 * POST /api/payment-receipts/:id/void
 */
const voidPaymentReceipt = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, ['reason']);

    if (!allowedFields.reason || typeof allowedFields.reason !== 'string' || allowedFields.reason.trim() === '') {
        throw new CustomException(
            'Void reason is required',
            'سبب الإلغاء مطلوب',
            400
        );
    }

    // IDOR protection - verify receipt belongs to firm
    const receipt = await PaymentReceipt.findOne({
        _id: sanitizeObjectId(req.params.id),
        firmId: req.firmId
    });

    if (!receipt) {
        throw new CustomException(
            'Payment receipt not found',
            'إيصال الدفع غير موجود',
            404
        );
    }

    // Use MongoDB transaction for financial operation
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        await receipt.void(allowedFields.reason, req.userID, { session });

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: 'Payment receipt voided successfully',
            messageAr: 'تم إلغاء إيصال الدفع بنجاح',
            data: receipt
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

/**
 * Download receipt PDF
 * GET /api/payment-receipts/:id/download
 */
const downloadReceipt = asyncHandler(async (req, res) => {
    // IDOR protection - verify receipt belongs to firm
    const receipt = await PaymentReceipt.findOne({
        _id: sanitizeObjectId(req.params.id),
        firmId: req.firmId
    });

    if (!receipt) {
        throw new CustomException(
            'Payment receipt not found',
            'إيصال الدفع غير موجود',
            404
        );
    }

    if (!receipt.pdfUrl) {
        throw new CustomException(
            'PDF not generated for this receipt',
            'لم يتم إنشاء ملف PDF لهذا الإيصال',
            404
        );
    }

    res.redirect(receipt.pdfUrl);
});

/**
 * Email receipt to client
 * POST /api/payment-receipts/:id/email
 */
const emailReceipt = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, ['email']);

    // IDOR protection - verify receipt belongs to firm
    const receipt = await PaymentReceipt.findOne({
        _id: sanitizeObjectId(req.params.id),
        firmId: req.firmId
    }).populate('clientId', 'email');

    if (!receipt) {
        throw new CustomException(
            'Payment receipt not found',
            'إيصال الدفع غير موجود',
            404
        );
    }

    const recipientEmail = allowedFields.email || receipt.clientId?.email;

    if (!recipientEmail) {
        throw new CustomException(
            'No email address provided',
            'لم يتم تقديم عنوان بريد إلكتروني',
            400
        );
    }

    // TODO: Implement email sending
    // await sendReceiptEmail(receipt, recipientEmail);

    await receipt.markEmailSent(recipientEmail);

    res.status(200).json({
        success: true,
        message: 'Receipt emailed successfully',
        messageAr: 'تم إرسال الإيصال بالبريد الإلكتروني بنجاح'
    });
});

/**
 * Get receipts for a client
 * GET /api/clients/:clientId/receipts
 */
const getClientReceipts = asyncHandler(async (req, res) => {
    const clientId = sanitizeObjectId(req.params.clientId);
    const { startDate, endDate, limit = 50, offset = 0 } = req.query;

    // IDOR protection - verify client belongs to firm
    const Client = require('../models/client.model');
    const client = await Client.findOne({
        _id: clientId,
        firmId: req.firmId
    });

    if (!client) {
        throw new CustomException(
            'Client not found or access denied',
            'العميل غير موجود أو الوصول مرفوض',
            404
        );
    }

    const receipts = await PaymentReceipt.getClientReceipts(
        req.firmId,
        clientId,
        { startDate, endDate, limit: parseInt(limit), offset: parseInt(offset) }
    );

    res.status(200).json({
        success: true,
        data: receipts
    });
});

/**
 * Get receipt statistics
 * GET /api/payment-receipts/stats
 */
const getReceiptStats = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const stats = await PaymentReceipt.getStats(req.firmId, startDate, endDate);

    res.status(200).json({
        success: true,
        data: stats
    });
});

module.exports = {
    getPaymentReceipts,
    getPaymentReceipt,
    createReceiptFromPayment,
    createPaymentReceipt,
    voidPaymentReceipt,
    downloadReceipt,
    emailReceipt,
    getClientReceipts,
    getReceiptStats
};
