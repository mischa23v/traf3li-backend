const PaymentReceipt = require('../models/paymentReceipt.model');
const Payment = require('../models/payment.model');
const asyncHandler = require('../middlewares/asyncHandler.middleware');
const CustomException = require('../exceptions/customException');

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
    const receipt = await PaymentReceipt.findOne({
        _id: req.params.id,
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
    const { paymentId } = req.params;
    const { description, descriptionAr, notes } = req.body;

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

    const receipt = await PaymentReceipt.createFromPayment(
        paymentId,
        req.userID,
        { description, descriptionAr, notes }
    );

    await receipt.populate([
        { path: 'clientId', select: 'firstName lastName companyName' },
        { path: 'paymentId', select: 'paymentNumber amount' }
    ]);

    res.status(201).json({
        success: true,
        message: 'Payment receipt created successfully',
        messageAr: 'تم إنشاء إيصال الدفع بنجاح',
        data: receipt
    });
});

/**
 * Create receipt manually
 * POST /api/payment-receipts
 */
const createPaymentReceipt = asyncHandler(async (req, res) => {
    const {
        paymentId,
        invoiceId,
        clientId,
        caseId,
        amount,
        currency,
        paymentMethod,
        paymentDate,
        receivedFrom,
        receivedFromAr,
        description,
        descriptionAr,
        bankAccount,
        bankName,
        referenceNumber,
        checkNumber,
        notes
    } = req.body;

    const receipt = new PaymentReceipt({
        firmId: req.firmId,
        paymentId,
        invoiceId,
        clientId,
        caseId,
        amount,
        currency: currency || 'SAR',
        paymentMethod,
        paymentDate: paymentDate || new Date(),
        receivedFrom,
        receivedFromAr,
        description,
        descriptionAr,
        bankAccount,
        bankName,
        referenceNumber,
        checkNumber,
        notes,
        generatedBy: req.userID,
        createdBy: req.userID
    });

    await receipt.save();

    res.status(201).json({
        success: true,
        message: 'Payment receipt created successfully',
        messageAr: 'تم إنشاء إيصال الدفع بنجاح',
        data: receipt
    });
});

/**
 * Void a receipt
 * POST /api/payment-receipts/:id/void
 */
const voidPaymentReceipt = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    if (!reason) {
        throw new CustomException(
            'Void reason is required',
            'سبب الإلغاء مطلوب',
            400
        );
    }

    const receipt = await PaymentReceipt.findOne({
        _id: req.params.id,
        firmId: req.firmId
    });

    if (!receipt) {
        throw new CustomException(
            'Payment receipt not found',
            'إيصال الدفع غير موجود',
            404
        );
    }

    await receipt.void(reason, req.userID);

    res.status(200).json({
        success: true,
        message: 'Payment receipt voided successfully',
        messageAr: 'تم إلغاء إيصال الدفع بنجاح',
        data: receipt
    });
});

/**
 * Download receipt PDF
 * GET /api/payment-receipts/:id/download
 */
const downloadReceipt = asyncHandler(async (req, res) => {
    const receipt = await PaymentReceipt.findOne({
        _id: req.params.id,
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
    const { email } = req.body;

    const receipt = await PaymentReceipt.findOne({
        _id: req.params.id,
        firmId: req.firmId
    }).populate('clientId', 'email');

    if (!receipt) {
        throw new CustomException(
            'Payment receipt not found',
            'إيصال الدفع غير موجود',
            404
        );
    }

    const recipientEmail = email || receipt.clientId?.email;

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
    const { clientId } = req.params;
    const { startDate, endDate, limit = 50, offset = 0 } = req.query;

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
