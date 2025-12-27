const { Payment, Invoice, Retainer, Client, BillingActivity } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const webhookService = require('../services/webhook.service');
const mongoose = require('mongoose');
const { pickAllowedFields } = require('../utils/securityUtils');

// ═══════════════════════════════════════════════════════════════
// ALLOWED FIELDS FOR MASS ASSIGNMENT PROTECTION
// ═══════════════════════════════════════════════════════════════
const PAYMENT_CREATE_ALLOWED_FIELDS = [
    'paymentType',
    'paymentDate',
    'referenceNumber',
    'amount',
    'currency',
    'exchangeRate',
    'customerId',
    'clientId',
    'vendorId',
    'paymentMethod',
    'bankAccountId',
    'checkDetails',
    'checkNumber',
    'checkDate',
    'bankName',
    'cardDetails',
    'gatewayProvider',
    'transactionId',
    'gatewayResponse',
    'invoiceApplications',
    'allocations',
    'invoiceId',
    'caseId',
    'fees',
    'departmentId',
    'locationId',
    'receivedBy',
    'customerNotes',
    'internalNotes',
    'memo',
    'notes',
    'attachments',
    'idempotency_key'
];

const PAYMENT_UPDATE_ALLOWED_FIELDS = [
    'paymentType',
    'paymentDate',
    'referenceNumber',
    'amount',
    'currency',
    'exchangeRate',
    'paymentMethod',
    'bankAccountId',
    'checkDetails',
    'checkNumber',
    'checkDate',
    'bankName',
    'cardDetails',
    'gatewayProvider',
    'transactionId',
    'gatewayResponse',
    'fees',
    'departmentId',
    'locationId',
    'receivedBy',
    'customerNotes',
    'internalNotes',
    'memo',
    'notes',
    'attachments'
];

// ═══════════════════════════════════════════════════════════════
// CREATE PAYMENT
// POST /api/payments
// ═══════════════════════════════════════════════════════════════
const createPayment = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى المدفوعات', 403);
    }

    // SECURITY: Idempotency - Check for idempotency key in header or body
    const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotency_key;

    if (idempotencyKey) {
        // Check if payment with this idempotency key already exists
        const existingPayment = await Payment.findOne({
            idempotencyKey,
            firmId: firmId || null,
            lawyerId: firmId ? undefined : lawyerId
        })
            .populate([
                { path: 'customerId', select: 'firstName lastName companyName email' },
                { path: 'clientId', select: 'firstName lastName companyName email' },
                { path: 'lawyerId', select: 'firstName lastName username' },
                { path: 'invoiceId', select: 'invoiceNumber totalAmount' },
                { path: 'caseId', select: 'title caseNumber' }
            ]);

        if (existingPayment) {
            return res.status(200).json({
                success: true,
                message: 'Payment already exists (idempotent)',
                payment: existingPayment,
                isIdempotent: true
            });
        }
    }

    // SECURITY: Mass Assignment Protection - Only allow specific fields
    const safeData = pickAllowedFields(req.body, PAYMENT_CREATE_ALLOWED_FIELDS);

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
    } = safeData;

    // Validate required fields - SECURITY: Ensure amount is positive number
    if (!amount || typeof amount !== 'number' || amount <= 0 || !Number.isFinite(amount)) {
        throw CustomException('Amount must be a positive number', 400);
    }

    if (!paymentMethod) {
        throw CustomException('Payment method is required', 400);
    }

    // SECURITY: Validate exchangeRate if provided - must be positive
    if (exchangeRate && (typeof exchangeRate !== 'number' || exchangeRate <= 0 || !Number.isFinite(exchangeRate))) {
        throw CustomException('Exchange rate must be a positive number', 400);
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

    // Validate customer exists and belongs to firm
    if (actualCustomerId) {
        const client = await Client.findOne({
            _id: actualCustomerId,
            firmId: firmId || null
        });
        if (!client) {
            throw CustomException('Client not found', 404);
        }
    }

    // Validate invoice if provided and belongs to firm
    if (invoiceId) {
        const query = { _id: invoiceId };
        if (firmId) {
            query.firmId = firmId;
        } else {
            query.lawyerId = lawyerId;
        }
        const invoice = await Invoice.findOne(query);
        if (!invoice) {
            throw CustomException('Invoice not found', 404);
        }
    }

    // Validate check details for check payments
    if (paymentMethod === 'check') {
        const checkNum = checkDetails?.checkNumber || checkNumber;
        if (!checkNum) {
            throw CustomException('Check number is required for check payments', 400);
        }
    }

    // Start transaction for payment creation
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const payment = await Payment.create([{
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
            // Idempotency
            idempotencyKey: idempotencyKey || undefined,
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
        }], { session });

        const paymentDoc = payment[0];

        // Log activity
        await BillingActivity.logActivity({
            activityType: 'payment_received',
            userId: lawyerId,
            clientId: actualCustomerId,
            relatedModel: 'Payment',
            relatedId: paymentDoc._id,
            description: `Payment ${paymentDoc.paymentNumber} created for ${amount} ${currency || 'SAR'}`,
            amount,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        // Update client balance within the same transaction
        if (actualCustomerId) {
            const client = await Client.findOne({
                _id: actualCustomerId,
                firmId: firmId || null
            }).session(session);
            if (client) {
                await client.updateBalance();
            }
        }

        await session.commitTransaction();

        await paymentDoc.populate([
            { path: 'customerId', select: 'firstName lastName companyName email' },
            { path: 'clientId', select: 'firstName lastName companyName email' },
            { path: 'lawyerId', select: 'firstName lastName username' },
            { path: 'invoiceId', select: 'invoiceNumber totalAmount' },
            { path: 'caseId', select: 'title caseNumber' }
        ]);

        res.status(201).json({
            success: true,
            message: 'Payment created successfully',
            payment: paymentDoc
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
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
    const isSoloLawyer = req.isSoloLawyer;
    const query = {};
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

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
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean();

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

    // Build access query with firmId for IDOR protection
    const query = { _id: id };
    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const payment = await Payment.findOne(query)
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

    // SECURITY: IDOR Protection - Query with firmId scope
    const query = { _id: id };
    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const payment = await Payment.findOne(query);

    if (!payment) {
        throw CustomException('Payment not found', 404);
    }

    // Cannot update completed, reconciled, or refunded payments (except notes)
    if (['completed', 'reconciled', 'refunded'].includes(payment.status)) {
        // Only allow updating notes and attachments
        const limitedAllowedFields = ['notes', 'internalNotes', 'customerNotes', 'memo', 'attachments'];
        const safeData = pickAllowedFields(req.body, limitedAllowedFields);
        const updateKeys = Object.keys(safeData);

        if (updateKeys.length === 0 || Object.keys(req.body).some(key => !limitedAllowedFields.includes(key))) {
            throw CustomException('Cannot update a completed, reconciled, or refunded payment. Only notes can be modified.', 400);
        }

        // Use limited fields for completed payments
        safeData.updatedBy = lawyerId;
        const updatedPayment = await Payment.findOneAndUpdate(
            query,
            { $set: safeData },
            { new: true, runValidators: true }
        )
            .populate('customerId', 'firstName lastName companyName email')
            .populate('invoiceId', 'invoiceNumber totalAmount');

        res.status(200).json({
            success: true,
            message: 'Payment notes updated successfully',
            payment: updatedPayment
        });
        return;
    }

    // SECURITY: Mass Assignment Protection - Only allow specific fields
    const safeData = pickAllowedFields(req.body, PAYMENT_UPDATE_ALLOWED_FIELDS);

    // SECURITY: Validate amount if provided - must be positive number
    if (safeData.amount && (typeof safeData.amount !== 'number' || safeData.amount <= 0 || !Number.isFinite(safeData.amount))) {
        throw CustomException('Amount must be a positive number', 400);
    }

    // SECURITY: Validate exchangeRate if provided - must be positive
    if (safeData.exchangeRate && (typeof safeData.exchangeRate !== 'number' || safeData.exchangeRate <= 0 || !Number.isFinite(safeData.exchangeRate))) {
        throw CustomException('Exchange rate must be a positive number', 400);
    }

    // Add updatedBy
    safeData.updatedBy = lawyerId;

    // Start transaction for payment update
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const updatedPayment = await Payment.findOneAndUpdate(
            query,
            { $set: safeData },
            { new: true, runValidators: true, session }
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

        // Update client balance within the same transaction
        const clientId = updatedPayment.customerId || updatedPayment.clientId;
        if (clientId) {
            const client = await Client.findOne({
                _id: clientId,
                firmId: firmId || null
            }).session(session);
            if (client) {
                await client.updateBalance();
            }
        }

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: 'Payment updated successfully',
            payment: updatedPayment
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
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

    // SECURITY: IDOR Protection - Query with firmId scope
    const query = { _id: id };
    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const payment = await Payment.findOne(query);

    if (!payment) {
        throw CustomException('Payment not found', 404);
    }

    // Cannot delete completed, reconciled, or refunded payments
    if (['completed', 'reconciled', 'refunded'].includes(payment.status)) {
        throw CustomException('Cannot delete a completed, reconciled, or refunded payment', 400);
    }

    // Store client ID before deletion
    const clientId = payment.customerId || payment.clientId;

    const accessQuery = firmId
        ? { _id: id, firmId }
        : { _id: id, lawyerId };

    // Start transaction for payment deletion
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        await Payment.findOneAndDelete(accessQuery, { session });

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

        // Update client balance within the same transaction
        if (clientId) {
            const client = await Client.findOne({
                _id: clientId,
                firmId: firmId || null
            }).session(session);
            if (client) {
                await client.updateBalance();
            }
        }

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: 'Payment deleted successfully'
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
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

    // SECURITY: IDOR Protection - Build access query
    const accessQuery = firmId
        ? { firmId: firmId }
        : { lawyerId: lawyerId };

    // SECURITY: Use atomic findOneAndUpdate to prevent race conditions
    // This ensures only one request can transition the payment to 'processing' status
    const payment = await Payment.findOneAndUpdate(
        {
            _id: id,
            ...accessQuery,
            status: { $in: ['pending', 'failed'] }
        },
        {
            $set: {
                status: 'processing',
                processedBy: lawyerId
            }
        },
        { new: false }
    );

    if (!payment) {
        // Payment not found, already completed, or user doesn't have access
        const existingPayment = await Payment.findOne({ _id: id, ...accessQuery });
        if (!existingPayment) {
            throw CustomException('Payment not found or access denied', 404);
        }
        if (existingPayment.status === 'completed' || existingPayment.status === 'reconciled') {
            throw CustomException('Payment already completed', 400);
        }
        if (existingPayment.status === 'processing') {
            throw CustomException('Payment is already being processed', 409);
        }
        throw CustomException('Payment cannot be completed in current status', 400);
    }

    // Use session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Reload payment in session to get updated version
        const paymentDoc = await Payment.findOne({ _id: id, ...accessQuery }).session(session);

        // Apply to invoices if provided
        if (invoiceApplications && invoiceApplications.length > 0) {
            await paymentDoc.applyToInvoices(invoiceApplications);
        } else if (paymentDoc.invoiceId && paymentDoc.invoiceApplications.length === 0) {
            // Apply to single invoice if specified and not already applied
            await paymentDoc.applyToInvoices([{
                invoiceId: paymentDoc.invoiceId,
                amount: paymentDoc.amount
            }]);
        }

        paymentDoc.status = 'completed';
        paymentDoc.processedBy = lawyerId;
        await paymentDoc.save({ session });

        // Post to General Ledger
        const glEntry = await paymentDoc.postToGL(session);

        // Update retainer if this is an advance/retainer payment
        if (paymentDoc.paymentType === 'retainer' || paymentDoc.paymentType === 'advance') {
            const retainer = await Retainer.findOne({
                clientId: paymentDoc.customerId || paymentDoc.clientId,
                lawyerId: paymentDoc.lawyerId,
                status: { $in: ['active', 'depleted'] }
            }).sort({ createdAt: -1 });

            if (retainer) {
                await retainer.replenish(paymentDoc.amount, paymentDoc._id);
            }
        }

        // Log activity
        await BillingActivity.logActivity({
            activityType: 'payment_completed',
            userId: lawyerId,
            clientId: paymentDoc.customerId || paymentDoc.clientId,
            relatedModel: 'Payment',
            relatedId: paymentDoc._id,
            description: `Payment ${paymentDoc.paymentNumber} completed for ${paymentDoc.amount} ${paymentDoc.currency}`,
            amount: paymentDoc.amount,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        await session.commitTransaction();

        await paymentDoc.populate([
            { path: 'customerId', select: 'firstName lastName companyName email' },
            { path: 'invoiceId', select: 'invoiceNumber totalAmount status' },
            { path: 'invoiceApplications.invoiceId', select: 'invoiceNumber totalAmount status' }
        ]);

        // SECURITY: Update client balance after payment completion using MongoDB transaction
        // to prevent race conditions on balance updates
        const clientId = paymentDoc.customerId || paymentDoc.clientId;
        if (clientId) {
            const balanceSession = await mongoose.startSession();
            balanceSession.startTransaction();
            try {
                const client = await Client.findOne({
                    _id: clientId,
                    firmId: firmId || null
                }).session(balanceSession);
                if (client) {
                    await client.updateBalance();
                }
                await balanceSession.commitTransaction();
            } catch (error) {
                await balanceSession.abortTransaction();
                throw error;
            } finally {
                balanceSession.endSession();
            }
        }

        res.status(200).json({
            success: true,
            message: 'Payment completed successfully',
            payment: paymentDoc,
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

    // SECURITY: IDOR Protection - Build access query
    const accessQuery = firmId
        ? { firmId: firmId }
        : { lawyerId: lawyerId };

    // SECURITY: Use atomic findOneAndUpdate to prevent race conditions
    const payment = await Payment.findOneAndUpdate(
        {
            _id: id,
            ...accessQuery,
            status: { $in: ['pending', 'processing'] }
        },
        {
            $set: {
                status: 'failed',
                failureReason: reason || 'Payment failed',
                failureDate: new Date()
            },
            $inc: { retryCount: 1 }
        },
        { new: true }
    );

    if (!payment) {
        // Payment not found or already in final status
        const existingPayment = await Payment.findOne({ _id: id, ...accessQuery });
        if (!existingPayment) {
            throw CustomException('Payment not found or access denied', 404);
        }
        throw CustomException('Payment cannot be marked as failed in current status', 400);
    }

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

    // SECURITY: IDOR Protection - Query with firmId scope
    const query = { _id: id };
    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const originalPayment = await Payment.findOne(query);

    if (!originalPayment) {
        throw CustomException('Original payment not found', 404);
    }

    if (originalPayment.status !== 'completed' && originalPayment.status !== 'reconciled') {
        throw CustomException('Only completed or reconciled payments can be refunded', 400);
    }

    const refundAmount = amount || originalPayment.amount;

    // SECURITY: Validate refund amount - must be positive number
    if (!refundAmount || typeof refundAmount !== 'number' || refundAmount <= 0 || !Number.isFinite(refundAmount)) {
        throw CustomException('Refund amount must be a positive number', 400);
    }

    if (refundAmount > originalPayment.amount) {
        throw CustomException('Refund amount cannot exceed original payment amount', 400);
    }

    // Start transaction for refund creation
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Create refund payment
        const refund = await Payment.create([{
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
        }], { session });

        const refundDoc = refund[0];

        // Update original payment status
        originalPayment.status = 'refunded';
        originalPayment.refundReason = reason;
        originalPayment.refundDate = new Date();
        await originalPayment.save({ session });

        // Update invoice if linked
        if (originalPayment.invoiceId) {
            const invoiceQuery = { _id: originalPayment.invoiceId };
            if (firmId) {
                invoiceQuery.firmId = firmId;
            } else {
                invoiceQuery.lawyerId = lawyerId;
            }
            const invoice = await Invoice.findOne(invoiceQuery).session(session);
            if (invoice) {
                invoice.amountPaid = Math.max(0, (invoice.amountPaid || 0) - refundAmount);
                invoice.balanceDue = invoice.totalAmount - invoice.amountPaid;

                if (invoice.status === 'paid' && invoice.balanceDue > 0) {
                    invoice.status = 'partial';
                }

                await invoice.save({ session });
            }
        }

        // Log activity
        await BillingActivity.logActivity({
            activityType: 'payment_refunded',
            userId: lawyerId,
            clientId: originalPayment.customerId || originalPayment.clientId,
            relatedModel: 'Payment',
            relatedId: refundDoc._id,
            description: `Refund of ${refundAmount} ${originalPayment.currency} created for payment ${originalPayment.paymentNumber}. Reason: ${reason}`,
            amount: refundAmount,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        // Update client balance within the same transaction
        const clientId = originalPayment.customerId || originalPayment.clientId;
        if (clientId) {
            const client = await Client.findOne({
                _id: clientId,
                firmId: firmId || null
            }).session(session);
            if (client) {
                await client.updateBalance();
            }
        }

        await session.commitTransaction();

        await refundDoc.populate([
            { path: 'customerId', select: 'firstName lastName companyName email' },
            { path: 'originalPaymentId', select: 'paymentNumber amount paymentDate' }
        ]);

        res.status(201).json({
            success: true,
            message: 'Refund created successfully',
            refund: refundDoc
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
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

    // SECURITY: IDOR Protection - Query with firmId scope
    const query = { _id: id };
    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const payment = await Payment.findOne(query);

    if (!payment) {
        throw CustomException('Payment not found', 404);
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

    // SECURITY: IDOR Protection - Query with firmId scope
    const query = { _id: id };
    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const payment = await Payment.findOne(query);

    if (!payment) {
        throw CustomException('Payment not found', 404);
    }

    // Calculate total to be applied
    const totalToApply = invoiceApplications.reduce((sum, app) => sum + app.amount, 0);

    // SECURITY: Validate application amounts - must be positive numbers
    if (totalToApply <= 0 || !Number.isFinite(totalToApply)) {
        throw CustomException('Total application amount must be a positive number', 400);
    }

    if (totalToApply > payment.unappliedAmount) {
        throw CustomException(`Cannot apply more than unapplied amount (${payment.unappliedAmount})`, 400);
    }

    // Start transaction for applying payment to invoices
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Use the model method
        await payment.applyToInvoices(invoiceApplications, { session });

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

        // Update client balance within the same transaction
        const clientId = payment.customerId || payment.clientId;
        if (clientId) {
            const client = await Client.findOne({
                _id: clientId,
                firmId: firmId || null
            }).session(session);
            if (client) {
                await client.updateBalance();
            }
        }

        await session.commitTransaction();

        await payment.populate([
            { path: 'invoiceApplications.invoiceId', select: 'invoiceNumber totalAmount status balanceDue' }
        ]);

        res.status(200).json({
            success: true,
            message: 'Payment applied to invoices',
            payment
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
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

    // SECURITY: IDOR Protection - Query with firmId scope
    const query = { _id: id };
    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const payment = await Payment.findOne(query);

    if (!payment) {
        throw CustomException('Payment not found', 404);
    }

    if (payment.status === 'reconciled') {
        throw CustomException('Cannot unapply from a reconciled payment', 400);
    }

    // Start transaction for unapplying payment from invoice
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Use the model method
        await payment.unapplyFromInvoice(invoiceId, { session });

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

        // Update client balance within the same transaction
        const clientId = payment.customerId || payment.clientId;
        if (clientId) {
            const client = await Client.findOne({
                _id: clientId,
                firmId: firmId || null
            }).session(session);
            if (client) {
                await client.updateBalance();
            }
        }

        await session.commitTransaction();

        await payment.populate([
            { path: 'invoiceApplications.invoiceId', select: 'invoiceNumber totalAmount status' }
        ]);

        res.status(200).json({
            success: true,
            message: 'Payment unapplied from invoice',
            payment
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
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

    // SECURITY: IDOR Protection - Query with firmId scope
    const query = { _id: id };
    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const payment = await Payment.findOne(query);

    if (!payment) {
        throw CustomException('Payment not found', 404);
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

    // SECURITY: IDOR Protection - Query with firmId scope
    const query = { _id: id };
    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const payment = await Payment.findOne(query)
        .populate('customerId', 'firstName lastName email')
        .populate('clientId', 'firstName lastName email')
        .populate('lawyerId', 'firstName lastName email firmName')
        .populate('invoiceId', 'invoiceNumber');

    if (!payment) {
        throw CustomException('Payment not found', 404);
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
    const isSoloLawyer = req.isSoloLawyer;
    const filters = {};
    if (isSoloLawyer || !firmId) {
        filters.lawyerId = lawyerId;
    } else {
        filters.firmId = firmId;
    }
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (customerId || clientId) filters.customerId = customerId || clientId;

    // Get overall stats
    const stats = await Payment.getPaymentStats(filters);

    // Get by payment method
    const byMethod = await Payment.getPaymentsByMethod(filters);

    // Get unreconciled payments
    const unreconciledQuery = {};
    if (isSoloLawyer || !firmId) {
        unreconciledQuery.lawyerId = lawyerId;
    } else {
        unreconciledQuery.firmId = firmId;
    }
    const unreconciled = await Payment.getUnreconciledPayments(unreconciledQuery);

    // Get pending checks
    const pendingChecksQuery = {};
    if (isSoloLawyer || !firmId) {
        pendingChecksQuery.lawyerId = lawyerId;
    } else {
        pendingChecksQuery.firmId = firmId;
    }
    const pendingChecks = await Payment.getPendingChecks(pendingChecksQuery);

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
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = new mongoose.Types.ObjectId(lawyerId);
    } else {
        baseQuery.firmId = new mongoose.Types.ObjectId(firmId);
    }
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

    const isSoloLawyer = req.isSoloLawyer;
    const filters = {};
    if (isSoloLawyer || !firmId) {
        filters.lawyerId = lawyerId;
    } else {
        filters.firmId = firmId;
    }
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

    const isSoloLawyer = req.isSoloLawyer;
    const filters = {};
    if (isSoloLawyer || !firmId) {
        filters.lawyerId = lawyerId;
    } else {
        filters.firmId = firmId;
    }
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
        notes,
        idempotency_key
    } = req.body;

    const lawyerId = req.userID;
    const firmId = req.firmId;

    // SECURITY: Idempotency - Check for idempotency key in header or body
    const idempotencyKey = req.headers['idempotency-key'] || idempotency_key;

    if (idempotencyKey) {
        // Check if payment with this idempotency key already exists for this invoice
        const existingPayment = await Payment.findOne({
            idempotencyKey,
            invoiceId,
            firmId: firmId || null,
            lawyerId: firmId ? undefined : lawyerId
        })
            .populate([
                { path: 'customerId', select: 'firstName lastName companyName email' },
                { path: 'invoiceId', select: 'invoiceNumber totalAmount status balanceDue' }
            ]);

        if (existingPayment) {
            const invoiceQuery = { _id: invoiceId };
            if (firmId) {
                invoiceQuery.firmId = firmId;
            } else {
                invoiceQuery.lawyerId = lawyerId;
            }
            const invoice = await Invoice.findOne(invoiceQuery);
            return res.status(200).json({
                success: true,
                message: 'Payment already recorded (idempotent)',
                payment: existingPayment,
                invoice: invoice ? {
                    _id: invoice._id,
                    invoiceNumber: invoice.invoiceNumber,
                    totalAmount: invoice.totalAmount,
                    amountPaid: invoice.amountPaid,
                    balanceDue: invoice.balanceDue,
                    status: invoice.status
                } : null,
                isIdempotent: true
            });
        }
    }

    // SECURITY: Validate amount - must be a positive number
    if (!amount || typeof amount !== 'number' || amount <= 0 || !Number.isFinite(amount)) {
        throw CustomException('Amount is required and must be a positive number', 400);
    }

    // SECURITY: IDOR Protection - Build access query
    const accessQuery = firmId
        ? { firmId: firmId }
        : { lawyerId: lawyerId };

    // SECURITY: Use atomic findOneAndUpdate to prevent double payment race conditions
    // This atomically checks the invoice status and transitions it to 'processing'
    const invoice = await Invoice.findOneAndUpdate(
        {
            _id: invoiceId,
            ...accessQuery,
            status: { $in: ['pending', 'overdue', 'partial'] },
            balanceDue: { $gte: amount }
        },
        {
            $set: { paymentProcessing: true }
        },
        { new: false }
    );

    if (!invoice) {
        // Invoice not found, already paid, or insufficient balance
        const existingInvoice = await Invoice.findOne({ _id: invoiceId, ...accessQuery });
        if (!existingInvoice) {
            throw CustomException('Invoice not found or access denied', 404);
        }
        if (existingInvoice.status === 'paid') {
            throw CustomException('Invoice is already paid in full', 400);
        }
        if (existingInvoice.status === 'cancelled') {
            throw CustomException('Cannot record payment for cancelled invoice', 400);
        }
        if (amount > existingInvoice.balanceDue) {
            throw CustomException(`Payment amount exceeds balance due (${existingInvoice.balanceDue} SAR)`, 400);
        }
        if (existingInvoice.paymentProcessing) {
            throw CustomException('Invoice payment is already being processed', 409);
        }
        throw CustomException('Invoice cannot accept payment in current status', 400);
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
            idempotencyKey: idempotencyKey || undefined,
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

        // SECURITY: Clear payment processing flag
        invoice.paymentProcessing = false;

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

        // SECURITY: Update client balance after invoice payment using MongoDB transaction
        // to prevent race conditions on balance updates
        if (invoice.clientId) {
            const balanceSession = await mongoose.startSession();
            balanceSession.startTransaction();
            try {
                const client = await Client.findOne({
                    _id: invoice.clientId,
                    firmId: firmId || null
                }).session(balanceSession);
                if (client) {
                    await client.updateBalance();
                }
                await balanceSession.commitTransaction();
            } catch (error) {
                await balanceSession.abortTransaction();
                throw error;
            } finally {
                balanceSession.endSession();
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
        // SECURITY: Clear payment processing flag on error
        try {
            const cleanupQuery = { _id: invoiceId };
            if (firmId) {
                cleanupQuery.firmId = firmId;
            } else {
                cleanupQuery.lawyerId = lawyerId;
            }
            await Invoice.findOneAndUpdate(cleanupQuery, { $set: { paymentProcessing: false } });
        } catch (cleanupError) {
            // Log cleanup error but don't mask original error
            console.error('Failed to clear payment processing flag:', cleanupError);
        }
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
    const isSoloLawyer = req.isSoloLawyer;
    const accessQuery = {};
    if (isSoloLawyer || !firmId) {
        accessQuery.lawyerId = lawyerId;
    } else {
        accessQuery.firmId = firmId;
    }

    // Verify all payments belong to user/firm and are not completed/refunded
    const payments = await Payment.find({
        _id: { $in: paymentIds },
        ...accessQuery,
        status: { $nin: ['completed', 'reconciled', 'refunded'] }
    });

    if (payments.length !== paymentIds.length) {
        throw CustomException('Some payments are invalid or cannot be deleted', 400);
    }

    // SECURITY: Include accessQuery in deleteMany to prevent race condition attacks
    await Payment.deleteMany({ _id: { $in: paymentIds }, ...accessQuery });

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
