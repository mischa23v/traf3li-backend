const { Payment, Invoice, Retainer, Client, BillingActivity } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// CREATE PAYMENT
// POST /api/payments
// ═══════════════════════════════════════════════════════════════
const createPayment = asyncHandler(async (req, res) => {
    const {
        // Basic info
        paymentType,
        paymentDate,
        referenceNumber,
        // Amount
        amount,
        currency,
        exchangeRate,
        // Parties
        customerId,
        clientId,
        vendorId,
        // Payment method
        paymentMethod,
        bankAccountId,
        // Check details
        checkDetails,
        checkNumber,
        checkDate,
        bankName,
        // Card details
        cardDetails,
        // Gateway details
        gatewayProvider,
        transactionId,
        gatewayResponse,
        // Invoice applications
        invoiceApplications,
        allocations,
        invoiceId,
        caseId,
        // Fees
        fees,
        // Organization
        departmentId,
        locationId,
        receivedBy,
        // Notes
        customerNotes,
        internalNotes,
        memo,
        notes,
        // Attachments
        attachments
    } = req.body;

    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى المدفوعات', 403);
    }

    // Validate required fields
    if (!amount || amount <= 0) {
        throw CustomException('Amount must be greater than 0', 400);
    }

    if (!paymentMethod) {
        throw CustomException('Payment method is required', 400);
    }

    // For customer_payment, either customerId or clientId is required
    const actualCustomerId = customerId || clientId;
    if ((paymentType === 'customer_payment' || !paymentType) && !actualCustomerId) {
        throw CustomException('Customer/Client ID is required for customer payments', 400);
    }

    // For vendor_payment, vendorId is required
    if (paymentType === 'vendor_payment' && !vendorId) {
        throw CustomException('Vendor ID is required for vendor payments', 400);
    }

    // Validate customer exists
    if (actualCustomerId) {
        const client = await Client.findById(actualCustomerId);
        if (!client) {
            throw CustomException('Client not found', 404);
        }
    }

    // Validate invoice if provided
    if (invoiceId) {
        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) {
            throw CustomException('Invoice not found', 404);
        }
        // Check access via firmId or lawyerId
        const hasAccess = firmId
            ? invoice.firmId && invoice.firmId.toString() === firmId.toString()
            : invoice.lawyerId.toString() === lawyerId;
        if (!hasAccess) {
            throw CustomException('You do not have access to this invoice', 403);
        }
    }

    // Validate check details for check payments
    if (paymentMethod === 'check') {
        const checkNum = checkDetails?.checkNumber || checkNumber;
        if (!checkNum) {
            throw CustomException('Check number is required for check payments', 400);
        }
    }

    const payment = await Payment.create({
        // Basic info
        paymentType: paymentType || 'customer_payment',
        paymentDate: paymentDate || new Date(),
        referenceNumber,
        status: 'pending',
        // Amount
        amount,
        currency: currency || 'SAR',
        exchangeRate: exchangeRate || 1,
        // Parties
        customerId: actualCustomerId,
        clientId: actualCustomerId,
        vendorId,
        lawyerId,
        firmId,
        // Payment method
        paymentMethod,
        bankAccountId,
        // Check details
        checkDetails: checkDetails || (checkNumber ? {
            checkNumber,
            checkDate,
            bank: bankName,
            status: 'received'
        } : undefined),
        checkNumber,
        checkDate,
        bankName,
        // Card details
        cardDetails,
        // Gateway
        gatewayProvider,
        transactionId,
        gatewayResponse,
        // Invoice applications
        invoiceApplications: invoiceApplications || [],
        allocations: allocations || [],
        invoiceId,
        caseId,
        // Fees
        fees: fees || { bankFees: 0, processingFees: 0, otherFees: 0, paidBy: 'office' },
        // Organization
        departmentId,
        locationId,
        receivedBy: receivedBy || lawyerId,
        // Notes
        customerNotes,
        internalNotes,
        memo,
        notes,
        // Attachments
        attachments: attachments || [],
        // Audit
        createdBy: lawyerId
    });

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'payment_received',
        userId: lawyerId,
        clientId: actualCustomerId,
        relatedModel: 'Payment',
        relatedId: payment._id,
        description: `Payment ${payment.paymentNumber} created for ${amount} ${currency || 'SAR'}`,
        amount,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    await payment.populate([
        { path: 'customerId', select: 'firstName lastName companyName email' },
        { path: 'clientId', select: 'firstName lastName companyName email' },
        { path: 'lawyerId', select: 'firstName lastName username' },
        { path: 'invoiceId', select: 'invoiceNumber totalAmount' },
        { path: 'caseId', select: 'title caseNumber' }
    ]);

    // Update client balance after payment creation
    if (actualCustomerId) {
        const client = await Client.findById(actualCustomerId);
        if (client) {
            await client.updateBalance();
        }
    }

    res.status(201).json({
        success: true,
        message: 'Payment created successfully',
        payment
    });
});

// ═══════════════════════════════════════════════════════════════
// GET PAYMENTS WITH FILTERS
// GET /api/payments
// ═══════════════════════════════════════════════════════════════
const getPayments = asyncHandler(async (req, res) => {
    const {
        status,
        paymentType,
        paymentMethod,
        customerId,
        clientId,
        vendorId,
        invoiceId,
        caseId,
        isReconciled,
        startDate,
        endDate,
        page = 1,
        limit = 50,
        sortBy = 'paymentDate',
        order = 'desc'
    } = req.query;

    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى المدفوعات', 403);
    }

    // Build query based on firmId or lawyerId
    const query = firmId ? { firmId } : { lawyerId };

    if (status) query.status = status;
    if (paymentType) query.paymentType = paymentType;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (customerId || clientId) query.$or = [
        { customerId: customerId || clientId },
        { clientId: customerId || clientId }
    ];
    if (vendorId) query.vendorId = vendorId;
    if (invoiceId) query.invoiceId = invoiceId;
    if (caseId) query.caseId = caseId;
    if (isReconciled !== undefined) {
        query['reconciliation.isReconciled'] = isReconciled === 'true';
    }

    if (startDate || endDate) {
        query.paymentDate = {};
        if (startDate) query.paymentDate.$gte = new Date(startDate);
        if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    // Build sort
    const sortOrder = order === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder, createdAt: -1 };

    const payments = await Payment.find(query)
        .populate('customerId', 'firstName lastName companyName email')
        .populate('clientId', 'firstName lastName companyName email')
        .populate('vendorId', 'name')
        .populate('lawyerId', 'firstName lastName username')
        .populate('invoiceId', 'invoiceNumber totalAmount status')
        .populate('caseId', 'title caseNumber')
        .populate('createdBy', 'firstName lastName')
        .populate('processedBy', 'firstName lastName')
        .populate('reconciliation.reconciledBy', 'firstName lastName')
        .sort(sort)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Payment.countDocuments(query);

    // Calculate totals
    const totals = await Payment.aggregate([
        { $match: query },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' }
            }
        }
    ]);

    res.status(200).json({
        success: true,
        data: payments,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        },
        summary: totals
    });
});

// ═══════════════════════════════════════════════════════════════
// GET NEW PAYMENT DEFAULTS
// GET /api/payments/new
// ═══════════════════════════════════════════════════════════════
const getNewPaymentDefaults = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الدفعات', 403);
    }

    res.status(200).json({
        success: true,
        data: {
            paymentType: 'customer_payment',
            customerId: null,
            invoiceId: null,
            caseId: null,
            amount: 0,
            currency: 'SAR',
            exchangeRate: 1,
            paymentMethod: 'bank_transfer',
            paymentDate: new Date().toISOString().split('T')[0],
            fees: {
                bankFees: 0,
                processingFees: 0,
                otherFees: 0,
                paidBy: 'office'
            },
            invoiceApplications: [],
            notes: '',
            internalNotes: '',
            customerNotes: ''
        },
        enums: {
            paymentTypes: Payment.PAYMENT_TYPES,
            paymentMethods: Payment.PAYMENT_METHODS,
            paymentStatuses: Payment.PAYMENT_STATUSES,
            checkStatuses: Payment.CHECK_STATUSES,
            refundReasons: Payment.REFUND_REASONS,
            cardTypes: Payment.CARD_TYPES
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET SINGLE PAYMENT
// GET /api/payments/:id
// ═══════════════════════════════════════════════════════════════
const getPayment = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الدفعات', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const payment = await Payment.findById(id)
        .populate('customerId', 'firstName lastName companyName email phone')
        .populate('clientId', 'firstName lastName companyName email phone')
        .populate('vendorId', 'name email')
        .populate('lawyerId', 'firstName lastName username email')
        .populate('invoiceId', 'invoiceNumber totalAmount dueDate status')
        .populate('caseId', 'title caseNumber category')
        .populate('createdBy', 'firstName lastName')
        .populate('processedBy', 'firstName lastName')
        .populate('receivedBy', 'firstName lastName')
        .populate('reconciliation.reconciledBy', 'firstName lastName')
        .populate('originalPaymentId', 'paymentNumber amount paymentDate')
        .populate('invoiceApplications.invoiceId', 'invoiceNumber totalAmount')
        .populate('allocations.invoiceId', 'invoiceNumber totalAmount');

    if (!payment) {
        throw CustomException('Payment not found', 404);
    }

    // Check access via firmId or lawyerId
    const hasAccess = firmId
        ? payment.firmId && payment.firmId.toString() === firmId.toString()
        : payment.lawyerId._id.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('You do not have access to this payment', 403);
    }

    res.status(200).json({
        success: true,
        data: payment
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE PAYMENT
// PUT /api/payments/:id
// ═══════════════════════════════════════════════════════════════
const updatePayment = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية لتعديل الدفعات', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const payment = await Payment.findById(id);

    if (!payment) {
        throw CustomException('Payment not found', 404);
    }

    // Check access via firmId or lawyerId
    const hasAccess = firmId
        ? payment.firmId && payment.firmId.toString() === firmId.toString()
        : payment.lawyerId.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('You do not have access to this payment', 403);
    }

    // Cannot update completed, reconciled, or refunded payments (except notes)
    if (['completed', 'reconciled', 'refunded'].includes(payment.status)) {
        // Only allow updating notes and attachments
        const allowedFields = ['notes', 'internalNotes', 'customerNotes', 'memo', 'attachments'];
        const updateKeys = Object.keys(req.body);
        const hasDisallowedFields = updateKeys.some(key => !allowedFields.includes(key));

        if (hasDisallowedFields) {
            throw CustomException('Cannot update a completed, reconciled, or refunded payment. Only notes can be modified.', 400);
        }
    }

    // Add updatedBy
    req.body.updatedBy = lawyerId;

    const updatedPayment = await Payment.findByIdAndUpdate(
        id,
        { $set: req.body },
        { new: true, runValidators: true }
    )
        .populate('customerId', 'firstName lastName companyName email')
        .populate('invoiceId', 'invoiceNumber totalAmount');

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'payment_updated',
        userId: lawyerId,
        relatedModel: 'Payment',
        relatedId: payment._id,
        description: `Payment ${payment.paymentNumber} updated`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    // Update client balance after payment update
    const clientId = updatedPayment.customerId || updatedPayment.clientId;
    if (clientId) {
        const client = await Client.findById(clientId);
        if (client) {
            await client.updateBalance();
        }
    }

    res.status(200).json({
        success: true,
        message: 'Payment updated successfully',
        payment: updatedPayment
    });
});

// ═══════════════════════════════════════════════════════════════
// DELETE PAYMENT
// DELETE /api/payments/:id
// ═══════════════════════════════════════════════════════════════
const deletePayment = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية لحذف الدفعات', 403);
    }

    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const payment = await Payment.findById(id);

    if (!payment) {
        throw CustomException('Payment not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? payment.firmId && payment.firmId.toString() === firmId.toString()
        : payment.lawyerId.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('You do not have access to this payment', 403);
    }

    // Cannot delete completed, reconciled, or refunded payments
    if (['completed', 'reconciled', 'refunded'].includes(payment.status)) {
        throw CustomException('Cannot delete a completed, reconciled, or refunded payment', 400);
    }

    // Store client ID before deletion
    const clientId = payment.customerId || payment.clientId;

    await Payment.findByIdAndDelete(id);

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'payment_deleted',
        userId: lawyerId,
        relatedModel: 'Payment',
        relatedId: payment._id,
        description: `Payment ${payment.paymentNumber} deleted`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    // Update client balance after payment deletion
    if (clientId) {
        const client = await Client.findById(clientId);
        if (client) {
            await client.updateBalance();
        }
    }

    res.status(200).json({
        success: true,
        message: 'Payment deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// COMPLETE PAYMENT
// POST /api/payments/:id/complete
// ═══════════════════════════════════════════════════════════════
const completePayment = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الدفعات', 403);
    }

    const { id } = req.params;
    const { invoiceApplications } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const payment = await Payment.findById(id);

    if (!payment) {
        throw CustomException('Payment not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? payment.firmId && payment.firmId.toString() === firmId.toString()
        : payment.lawyerId.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('You do not have access to this payment', 403);
    }

    if (payment.status === 'completed' || payment.status === 'reconciled') {
        throw CustomException('Payment already completed', 400);
    }

    // Use session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Apply to invoices if provided
        if (invoiceApplications && invoiceApplications.length > 0) {
            await payment.applyToInvoices(invoiceApplications);
        } else if (payment.invoiceId && payment.invoiceApplications.length === 0) {
            // Apply to single invoice if specified and not already applied
            await payment.applyToInvoices([{
                invoiceId: payment.invoiceId,
                amount: payment.amount
            }]);
        }

        payment.status = 'completed';
        payment.processedBy = lawyerId;
        await payment.save({ session });

        // Post to General Ledger
        const glEntry = await payment.postToGL(session);

        // Update retainer if this is an advance/retainer payment
        if (payment.paymentType === 'retainer' || payment.paymentType === 'advance') {
            const retainer = await Retainer.findOne({
                clientId: payment.customerId || payment.clientId,
                lawyerId: payment.lawyerId,
                status: { $in: ['active', 'depleted'] }
            }).sort({ createdAt: -1 });

            if (retainer) {
                await retainer.replenish(payment.amount, payment._id);
            }
        }

        // Log activity
        await BillingActivity.logActivity({
            activityType: 'payment_completed',
            userId: lawyerId,
            clientId: payment.customerId || payment.clientId,
            relatedModel: 'Payment',
            relatedId: payment._id,
            description: `Payment ${payment.paymentNumber} completed for ${payment.amount} ${payment.currency}`,
            amount: payment.amount,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        await session.commitTransaction();

        await payment.populate([
            { path: 'customerId', select: 'firstName lastName companyName email' },
            { path: 'invoiceId', select: 'invoiceNumber totalAmount status' },
            { path: 'invoiceApplications.invoiceId', select: 'invoiceNumber totalAmount status' }
        ]);

        // Update client balance after payment completion
        const clientId = payment.customerId || payment.clientId;
        if (clientId) {
            const client = await Client.findById(clientId);
            if (client) {
                await client.updateBalance();
            }
        }

        res.status(200).json({
            success: true,
            message: 'Payment completed successfully',
            payment,
            glEntryId: glEntry ? glEntry._id : null
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

// ═══════════════════════════════════════════════════════════════
// FAIL PAYMENT
// POST /api/payments/:id/fail
// ═══════════════════════════════════════════════════════════════
const failPayment = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الدفعات', 403);
    }

    const { id } = req.params;
    const { reason } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const payment = await Payment.findById(id);

    if (!payment) {
        throw CustomException('Payment not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? payment.firmId && payment.firmId.toString() === firmId.toString()
        : payment.lawyerId.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('You do not have access to this payment', 403);
    }

    payment.status = 'failed';
    payment.failureReason = reason || 'Payment failed';
    payment.failureDate = new Date();
    payment.retryCount = (payment.retryCount || 0) + 1;
    await payment.save();

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'payment_failed',
        userId: lawyerId,
        clientId: payment.customerId || payment.clientId,
        relatedModel: 'Payment',
        relatedId: payment._id,
        description: `Payment ${payment.paymentNumber} failed: ${reason}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    res.status(200).json({
        success: true,
        message: 'Payment marked as failed',
        payment
    });
});

// ═══════════════════════════════════════════════════════════════
// CREATE REFUND
// POST /api/payments/:id/refund
// ═══════════════════════════════════════════════════════════════
const createRefund = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الدفعات', 403);
    }

    const { id } = req.params;
    const { amount, reason, method } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const originalPayment = await Payment.findById(id);

    if (!originalPayment) {
        throw CustomException('Original payment not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? originalPayment.firmId && originalPayment.firmId.toString() === firmId.toString()
        : originalPayment.lawyerId.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('You do not have access to this payment', 403);
    }

    if (originalPayment.status !== 'completed' && originalPayment.status !== 'reconciled') {
        throw CustomException('Only completed or reconciled payments can be refunded', 400);
    }

    const refundAmount = amount || originalPayment.amount;

    if (refundAmount > originalPayment.amount) {
        throw CustomException('Refund amount cannot exceed original payment amount', 400);
    }

    // Create refund payment
    const refund = await Payment.create({
        paymentType: 'refund',
        customerId: originalPayment.customerId,
        clientId: originalPayment.clientId,
        invoiceId: originalPayment.invoiceId,
        caseId: originalPayment.caseId,
        lawyerId,
        firmId,
        amount: refundAmount,
        currency: originalPayment.currency,
        paymentMethod: method || originalPayment.paymentMethod,
        paymentDate: new Date(),
        status: 'completed',
        isRefund: true,
        refundDetails: {
            originalPaymentId: originalPayment._id,
            reason: reason || 'refund',
            method: method || 'original'
        },
        originalPaymentId: originalPayment._id,
        refundReason: reason,
        refundDate: new Date(),
        createdBy: lawyerId,
        processedBy: lawyerId
    });

    // Update original payment status
    originalPayment.status = 'refunded';
    originalPayment.refundReason = reason;
    originalPayment.refundDate = new Date();
    await originalPayment.save();

    // Update invoice if linked
    if (originalPayment.invoiceId) {
        const invoice = await Invoice.findById(originalPayment.invoiceId);
        if (invoice) {
            invoice.amountPaid = Math.max(0, (invoice.amountPaid || 0) - refundAmount);
            invoice.balanceDue = invoice.totalAmount - invoice.amountPaid;

            if (invoice.status === 'paid' && invoice.balanceDue > 0) {
                invoice.status = 'partial';
            }

            await invoice.save();
        }
    }

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'payment_refunded',
        userId: lawyerId,
        clientId: originalPayment.customerId || originalPayment.clientId,
        relatedModel: 'Payment',
        relatedId: refund._id,
        description: `Refund of ${refundAmount} ${originalPayment.currency} created for payment ${originalPayment.paymentNumber}. Reason: ${reason}`,
        amount: refundAmount,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    await refund.populate([
        { path: 'customerId', select: 'firstName lastName companyName email' },
        { path: 'originalPaymentId', select: 'paymentNumber amount paymentDate' }
    ]);

    // Update client balance after refund creation
    const clientId = originalPayment.customerId || originalPayment.clientId;
    if (clientId) {
        const client = await Client.findById(clientId);
        if (client) {
            await client.updateBalance();
        }
    }

    res.status(201).json({
        success: true,
        message: 'Refund created successfully',
        refund
    });
});

// ═══════════════════════════════════════════════════════════════
// RECONCILE PAYMENT
// POST /api/payments/:id/reconcile
// ═══════════════════════════════════════════════════════════════
const reconcilePayment = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية لمطابقة الدفعات', 403);
    }

    const { id } = req.params;
    const { bankStatementRef } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const payment = await Payment.findById(id);

    if (!payment) {
        throw CustomException('Payment not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? payment.firmId && payment.firmId.toString() === firmId.toString()
        : payment.lawyerId.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('You do not have access to this payment', 403);
    }

    // Use the model method
    await payment.reconcile(lawyerId, bankStatementRef);

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'payment_reconciled',
        userId: lawyerId,
        relatedModel: 'Payment',
        relatedId: payment._id,
        description: `Payment ${payment.paymentNumber} reconciled`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    await payment.populate([
        { path: 'reconciliation.reconciledBy', select: 'firstName lastName' }
    ]);

    res.status(200).json({
        success: true,
        message: 'Payment reconciled successfully',
        payment
    });
});

// ═══════════════════════════════════════════════════════════════
// APPLY PAYMENT TO INVOICES
// PUT /api/payments/:id/apply
// ═══════════════════════════════════════════════════════════════
const applyPaymentToInvoices = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الدفعات', 403);
    }

    const { id } = req.params;
    const { invoiceApplications } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    if (!invoiceApplications || !Array.isArray(invoiceApplications) || invoiceApplications.length === 0) {
        throw CustomException('Invoice applications are required', 400);
    }

    const payment = await Payment.findById(id);

    if (!payment) {
        throw CustomException('Payment not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? payment.firmId && payment.firmId.toString() === firmId.toString()
        : payment.lawyerId.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('You do not have access to this payment', 403);
    }

    // Calculate total to be applied
    const totalToApply = invoiceApplications.reduce((sum, app) => sum + app.amount, 0);

    if (totalToApply > payment.unappliedAmount) {
        throw CustomException(`Cannot apply more than unapplied amount (${payment.unappliedAmount})`, 400);
    }

    // Use the model method
    await payment.applyToInvoices(invoiceApplications);

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'payment_applied',
        userId: lawyerId,
        relatedModel: 'Payment',
        relatedId: payment._id,
        description: `Payment ${payment.paymentNumber} applied to ${invoiceApplications.length} invoice(s)`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    await payment.populate([
        { path: 'invoiceApplications.invoiceId', select: 'invoiceNumber totalAmount status balanceDue' }
    ]);

    // Update client balance after applying payment
    const clientId = payment.customerId || payment.clientId;
    if (clientId) {
        const client = await Client.findById(clientId);
        if (client) {
            await client.updateBalance();
        }
    }

    res.status(200).json({
        success: true,
        message: 'Payment applied to invoices',
        payment
    });
});

// ═══════════════════════════════════════════════════════════════
// UNAPPLY PAYMENT FROM INVOICE
// DELETE /api/payments/:id/unapply/:invoiceId
// ═══════════════════════════════════════════════════════════════
const unapplyPaymentFromInvoice = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الدفعات', 403);
    }

    const { id, invoiceId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const payment = await Payment.findById(id);

    if (!payment) {
        throw CustomException('Payment not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? payment.firmId && payment.firmId.toString() === firmId.toString()
        : payment.lawyerId.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('You do not have access to this payment', 403);
    }

    if (payment.status === 'reconciled') {
        throw CustomException('Cannot unapply from a reconciled payment', 400);
    }

    // Use the model method
    await payment.unapplyFromInvoice(invoiceId);

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'payment_unapplied',
        userId: lawyerId,
        relatedModel: 'Payment',
        relatedId: payment._id,
        description: `Payment ${payment.paymentNumber} unapplied from invoice`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    await payment.populate([
        { path: 'invoiceApplications.invoiceId', select: 'invoiceNumber totalAmount status' }
    ]);

    // Update client balance after unapplying payment
    const clientId = payment.customerId || payment.clientId;
    if (clientId) {
        const client = await Client.findById(clientId);
        if (client) {
            await client.updateBalance();
        }
    }

    res.status(200).json({
        success: true,
        message: 'Payment unapplied from invoice',
        payment
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE CHECK STATUS
// PUT /api/payments/:id/check-status
// ═══════════════════════════════════════════════════════════════
const updateCheckStatus = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الدفعات', 403);
    }

    const { id } = req.params;
    const { status, bounceReason, depositDate, clearanceDate } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    if (!status) {
        throw CustomException('Status is required', 400);
    }

    const payment = await Payment.findById(id);

    if (!payment) {
        throw CustomException('Payment not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? payment.firmId && payment.firmId.toString() === firmId.toString()
        : payment.lawyerId.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('You do not have access to this payment', 403);
    }

    // Use the model method
    await payment.updateCheckStatus(status, { bounceReason, depositDate, clearanceDate });

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'check_status_updated',
        userId: lawyerId,
        relatedModel: 'Payment',
        relatedId: payment._id,
        description: `Check ${payment.checkDetails?.checkNumber || payment.checkNumber} status updated to ${status}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    res.status(200).json({
        success: true,
        message: `Check status updated to ${status}`,
        payment
    });
});

// ═══════════════════════════════════════════════════════════════
// SEND RECEIPT
// POST /api/payments/:id/send-receipt
// ═══════════════════════════════════════════════════════════════
const sendReceipt = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الدفعات', 403);
    }

    const { id } = req.params;
    const { email, template } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const payment = await Payment.findById(id)
        .populate('customerId', 'firstName lastName email')
        .populate('clientId', 'firstName lastName email')
        .populate('lawyerId', 'firstName lastName email firmName')
        .populate('invoiceId', 'invoiceNumber');

    if (!payment) {
        throw CustomException('Payment not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? payment.firmId && payment.firmId.toString() === firmId.toString()
        : payment.lawyerId._id.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('You do not have access to this payment', 403);
    }

    if (payment.status !== 'completed' && payment.status !== 'reconciled') {
        throw CustomException('Receipts can only be sent for completed or reconciled payments', 400);
    }

    const recipientEmail = email || payment.customerId?.email || payment.clientId?.email;

    if (!recipientEmail) {
        throw CustomException('No email address available for receipt', 400);
    }

    // TODO: Generate PDF receipt and send email
    // For now, just mark as sent
    payment.receiptSent = true;
    payment.receiptSentAt = new Date();
    payment.receiptSentTo = recipientEmail;
    payment.emailTemplate = template;
    await payment.save();

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'receipt_sent',
        userId: lawyerId,
        relatedModel: 'Payment',
        relatedId: payment._id,
        description: `Receipt sent to ${recipientEmail} for payment ${payment.paymentNumber}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    res.status(200).json({
        success: true,
        message: `Receipt sent to ${recipientEmail}`,
        payment
    });
});

// ═══════════════════════════════════════════════════════════════
// GET PAYMENT STATISTICS
// GET /api/payments/stats
// ═══════════════════════════════════════════════════════════════
const getPaymentStats = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الدفعات', 403);
    }

    const { startDate, endDate, customerId, clientId } = req.query;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Build filters
    const filters = firmId ? { firmId } : { lawyerId };
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (customerId || clientId) filters.customerId = customerId || clientId;

    // Get overall stats
    const stats = await Payment.getPaymentStats(filters);

    // Get by payment method
    const byMethod = await Payment.getPaymentsByMethod(filters);

    // Get unreconciled payments
    const unreconciled = await Payment.getUnreconciledPayments(
        firmId ? { firmId } : { lawyerId }
    );

    // Get pending checks
    const pendingChecks = await Payment.getPendingChecks(
        firmId ? { firmId } : { lawyerId }
    );

    res.status(200).json({
        success: true,
        data: {
            overall: stats,
            byMethod,
            unreconciledCount: unreconciled.length,
            unreconciledAmount: unreconciled.reduce((sum, p) => sum + p.amount, 0),
            pendingChecksCount: pendingChecks.length,
            pendingChecksAmount: pendingChecks.reduce((sum, p) => sum + p.amount, 0)
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET PAYMENTS SUMMARY
// GET /api/payments/summary
// ═══════════════════════════════════════════════════════════════
const getPaymentsSummary = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الدفعات', 403);
    }

    const { startDate, endDate } = req.query;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Build query based on firmId or lawyerId
    const baseQuery = firmId
        ? { firmId: new mongoose.Types.ObjectId(firmId) }
        : { lawyerId: new mongoose.Types.ObjectId(lawyerId) };
    const matchQuery = { ...baseQuery, status: 'completed', isRefund: { $ne: true } };

    if (startDate || endDate) {
        matchQuery.paymentDate = {};
        if (startDate) matchQuery.paymentDate.$gte = new Date(startDate);
        if (endDate) matchQuery.paymentDate.$lte = new Date(endDate);
    }

    // Calculate total received
    const totalReceived = await Payment.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: null,
                total: { $sum: '$amount' }
            }
        }
    ]);

    // Calculate this month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthQuery = {
        ...matchQuery,
        paymentDate: { $gte: firstDayOfMonth }
    };

    const thisMonth = await Payment.aggregate([
        { $match: thisMonthQuery },
        {
            $group: {
                _id: null,
                total: { $sum: '$amount' }
            }
        }
    ]);

    // Calculate pending payments
    const pendingQuery = { ...baseQuery, status: 'pending' };
    const pending = await Payment.aggregate([
        { $match: pendingQuery },
        {
            $group: {
                _id: null,
                total: { $sum: '$amount' }
            }
        }
    ]);

    // By payment method
    const byMethod = await Payment.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$paymentMethod',
                total: { $sum: '$amount' }
            }
        }
    ]);

    const byMethodObj = {};
    byMethod.forEach(item => {
        byMethodObj[item._id || 'other'] = item.total;
    });

    res.status(200).json({
        success: true,
        summary: {
            totalReceived: totalReceived[0]?.total || 0,
            thisMonth: thisMonth[0]?.total || 0,
            pending: pending[0]?.total || 0,
            byMethod: byMethodObj
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET UNRECONCILED PAYMENTS
// GET /api/payments/unreconciled
// ═══════════════════════════════════════════════════════════════
const getUnreconciledPayments = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الدفعات', 403);
    }

    const { paymentMethod } = req.query;
    const firmId = req.firmId;
    const lawyerId = req.userID;

    const filters = firmId ? { firmId } : { lawyerId };
    if (paymentMethod) filters.paymentMethod = paymentMethod;

    const payments = await Payment.getUnreconciledPayments(filters);

    res.status(200).json({
        success: true,
        data: payments,
        total: payments.length,
        totalAmount: payments.reduce((sum, p) => sum + p.amount, 0)
    });
});

// ═══════════════════════════════════════════════════════════════
// GET PENDING CHECKS
// GET /api/payments/pending-checks
// ═══════════════════════════════════════════════════════════════
const getPendingChecks = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الدفعات', 403);
    }

    const firmId = req.firmId;
    const lawyerId = req.userID;

    const filters = firmId ? { firmId } : { lawyerId };
    const checks = await Payment.getPendingChecks(filters);

    res.status(200).json({
        success: true,
        data: checks,
        total: checks.length,
        totalAmount: checks.reduce((sum, p) => sum + p.amount, 0)
    });
});

// ═══════════════════════════════════════════════════════════════
// RECORD INVOICE PAYMENT
// POST /api/invoices/:invoiceId/payments
// ═══════════════════════════════════════════════════════════════
const recordInvoicePayment = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الدفعات', 403);
    }

    const { invoiceId } = req.params;
    const {
        amount,
        paymentMethod,
        transactionId,
        notes
    } = req.body;

    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Validate amount
    if (!amount || amount <= 0) {
        throw CustomException('Amount is required and must be positive', 400);
    }

    // Validate and get invoice
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
        throw CustomException('Invoice not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? invoice.firmId && invoice.firmId.toString() === firmId.toString()
        : invoice.lawyerId.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('You do not have access to this invoice', 403);
    }

    if (invoice.status === 'paid') {
        throw CustomException('Invoice is already paid in full', 400);
    }

    if (invoice.status === 'cancelled') {
        throw CustomException('Cannot record payment for cancelled invoice', 400);
    }

    // Check if payment exceeds balance due
    if (amount > invoice.balanceDue) {
        throw CustomException(`Payment amount exceeds balance due (${invoice.balanceDue} SAR)`, 400);
    }

    // Use session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Create payment record
        const payment = await Payment.create([{
            paymentType: 'customer_payment',
            customerId: invoice.clientId,
            clientId: invoice.clientId,
            invoiceId: invoice._id,
            caseId: invoice.caseId,
            lawyerId,
            firmId,
            amount,
            currency: 'SAR',
            paymentMethod: paymentMethod || 'bank_transfer',
            transactionId,
            status: 'completed',
            paymentDate: new Date(),
            notes,
            invoiceApplications: [{
                invoiceId: invoice._id,
                amount,
                appliedAt: new Date()
            }],
            totalApplied: amount,
            unappliedAmount: 0,
            createdBy: lawyerId,
            processedBy: lawyerId
        }], { session });

        const paymentDoc = payment[0];

        // Post to General Ledger
        const glEntry = await paymentDoc.postToGL(session);

        // Update invoice
        invoice.amountPaid = (invoice.amountPaid || 0) + amount;
        invoice.balanceDue = invoice.totalAmount - invoice.amountPaid;

        if (invoice.balanceDue <= 0) {
            invoice.status = 'paid';
            invoice.paidDate = new Date();
        } else if (invoice.amountPaid > 0) {
            invoice.status = 'partial';
        }

        if (!invoice.paymentHistory) {
            invoice.paymentHistory = [];
        }
        invoice.paymentHistory.push({
            paymentId: paymentDoc._id,
            amount,
            date: new Date(),
            method: paymentMethod || 'bank_transfer'
        });

        await invoice.save({ session });

        // Log activity
        await BillingActivity.logActivity({
            activityType: 'payment_received',
            userId: lawyerId,
            clientId: invoice.clientId,
            relatedModel: 'Payment',
            relatedId: paymentDoc._id,
            description: `Payment of ${amount} SAR received for invoice ${invoice.invoiceNumber}`,
            amount,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        await session.commitTransaction();

        await paymentDoc.populate([
            { path: 'customerId', select: 'firstName lastName companyName email' },
            { path: 'invoiceId', select: 'invoiceNumber totalAmount status balanceDue' }
        ]);

        // Update client balance after invoice payment
        if (invoice.clientId) {
            const client = await Client.findById(invoice.clientId);
            if (client) {
                await client.updateBalance();
            }
        }

        res.status(201).json({
            success: true,
            message: 'Payment recorded successfully',
            payment: paymentDoc,
            invoice: {
                _id: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                totalAmount: invoice.totalAmount,
                amountPaid: invoice.amountPaid,
                balanceDue: invoice.balanceDue,
                status: invoice.status
            },
            glEntryId: glEntry ? glEntry._id : null
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

// ═══════════════════════════════════════════════════════════════
// BULK DELETE PAYMENTS
// DELETE /api/payments/bulk
// ═══════════════════════════════════════════════════════════════
const bulkDeletePayments = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية لحذف الدفعات', 403);
    }

    const { paymentIds } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
        throw CustomException('Payment IDs are required', 400);
    }

    // Build query based on firmId or lawyerId
    const accessQuery = firmId
        ? { firmId }
        : { lawyerId };

    // Verify all payments belong to user/firm and are not completed/refunded
    const payments = await Payment.find({
        _id: { $in: paymentIds },
        ...accessQuery,
        status: { $nin: ['completed', 'reconciled', 'refunded'] }
    });

    if (payments.length !== paymentIds.length) {
        throw CustomException('Some payments are invalid or cannot be deleted', 400);
    }

    await Payment.deleteMany({ _id: { $in: paymentIds } });

    res.status(200).json({
        success: true,
        message: `${payments.length} payments deleted successfully`,
        count: payments.length
    });
});

module.exports = {
    createPayment,
    getPayments,
    getPayment,
    getNewPaymentDefaults,
    updatePayment,
    deletePayment,
    completePayment,
    failPayment,
    createRefund,
    reconcilePayment,
    applyPaymentToInvoices,
    unapplyPaymentFromInvoice,
    updateCheckStatus,
    sendReceipt,
    getPaymentStats,
    getPaymentsSummary,
    getUnreconciledPayments,
    getPendingChecks,
    recordInvoicePayment,
    bulkDeletePayments
};
