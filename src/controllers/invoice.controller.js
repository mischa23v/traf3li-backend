/**
 * Invoice Controller
 *
 * Comprehensive invoice management including CRUD operations,
 * payment processing, ZATCA e-invoicing, approval workflows,
 * and reporting functionality.
 */

const mongoose = require('mongoose');
const { Invoice, Case, Order, User, Payment, Retainer, BillingActivity } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const webhookService = require('../services/webhook.service');
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const {
    generateQRCode,
    generateInvoiceHash,
    generateUUID,
    generateUBLXML,
    submitToZATCA,
    validateForZATCA,
    getComplianceStatus
} = require('../services/zatcaService');

// ============ HELPER FUNCTIONS ============

/**
 * Generate unique invoice number
 */
const generateInvoiceNumber = async () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = await Invoice.countDocuments({
        invoiceNumber: new RegExp(`^INV-${year}${month}`)
    });
    return `INV-${year}${month}-${String(count + 1).padStart(4, '0')}`;
};

/**
 * Calculate due date based on payment terms
 */
const calculateDueDate = (paymentTerms, issueDate = new Date()) => {
    const date = new Date(issueDate);
    const daysMap = {
        'due_on_receipt': 0,
        'net_7': 7,
        'net_15': 15,
        'net_30': 30,
        'net_45': 45,
        'net_60': 60,
        'net_90': 90
    };

    if (paymentTerms === 'eom') {
        date.setMonth(date.getMonth() + 1);
        date.setDate(0);
    } else {
        date.setDate(date.getDate() + (daysMap[paymentTerms] || 30));
    }

    return date;
};

/**
 * Get date filter for reports
 */
const getDateFilter = (period) => {
    const now = new Date();
    switch (period) {
        case 'week':
            return { $gte: new Date(now.setDate(now.getDate() - 7)) };
        case 'month':
            return { $gte: new Date(now.setMonth(now.getMonth() - 1)) };
        case 'quarter':
            return { $gte: new Date(now.setMonth(now.getMonth() - 3)) };
        case 'year':
            return { $gte: new Date(now.setFullYear(now.getFullYear() - 1)) };
        default:
            return { $gte: new Date(now.setMonth(now.getMonth() - 1)) };
    }
};

// ============ CRUD OPERATIONS ============

/**
 * Create invoice
 * POST /api/invoices
 */
const createInvoice = asyncHandler(async (req, res) => {
    const {
        clientId: bodyClientId,
        caseId,
        contractId,
        items,
        subtotal: bodySubtotal,
        vatRate = 15,
        vatAmount: bodyVatAmount,
        totalAmount: bodyTotalAmount,
        dueDate,
        paymentTerms = 'net_30',
        notes,
        customerNotes,
        internalNotes,
        discountType,
        discountValue = 0,
        clientType,
        responsibleAttorneyId,
        billingArrangement,
        departmentId,
        locationId,
        firmSize,
        customerPONumber,
        matterNumber,
        termsTemplate,
        termsAndConditions,
        zatca,
        applyFromRetainer,
        paymentPlan,
        bankAccountId,
        paymentInstructions,
        enableOnlinePayment,
        lateFees,
        approval,
        email,
        attachments,
        wip,
        budget
    } = req.body;

    const lawyerId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الفواتير', 403);
    }

    // Check if user is a lawyer
    const user = await User.findById(lawyerId);
    if (user.role !== 'lawyer') {
        throw CustomException('Only lawyers can create invoices!', 403);
    }

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
        throw CustomException('Invoice items are required', 400);
    }

    // Determine client ID
    let clientId = bodyClientId;
    if (!clientId && caseId) {
        const caseDoc = await Case.findById(caseId);
        if (caseDoc) clientId = caseDoc.clientId;
    } else if (!clientId && contractId) {
        const contract = await Order.findById(contractId);
        if (contract) clientId = contract.buyerID;
    }

    if (!clientId) {
        throw CustomException('Client ID is required', 400);
    }

    // Calculate totals
    let subtotal = bodySubtotal;
    if (!subtotal && items && items.length > 0) {
        subtotal = items.reduce((sum, item) => {
            if (item.type === 'discount' || item.type === 'comment' || item.type === 'subtotal') {
                return sum;
            }
            return sum + (item.total || item.quantity * item.unitPrice);
        }, 0);
    }

    // Apply discount before VAT
    let discountedSubtotal = subtotal;
    if (discountType === 'percentage' && discountValue > 0) {
        discountedSubtotal = subtotal * (1 - discountValue / 100);
    } else if (discountType === 'fixed' && discountValue > 0) {
        discountedSubtotal = subtotal - discountValue;
    }

    const vatAmount = bodyVatAmount !== undefined ? bodyVatAmount : discountedSubtotal * (vatRate / 100);
    const totalAmount = bodyTotalAmount !== undefined ? bodyTotalAmount : discountedSubtotal + vatAmount;

    // Calculate due date if not provided
    const finalDueDate = dueDate ? new Date(dueDate) : calculateDueDate(paymentTerms);

    // Handle retainer application validation
    if (applyFromRetainer > 0) {
        const retainerQuery = firmId ? { clientId, firmId, status: 'active' } : { clientId, lawyerId, status: 'active' };
        const retainer = await Retainer.findOne(retainerQuery);

        if (!retainer || retainer.currentBalance < applyFromRetainer) {
            throw CustomException('رصيد العربون غير كافٍ - Insufficient retainer balance', 400);
        }
    }

    const invoice = new Invoice({
        invoiceNumber: await generateInvoiceNumber(),
        caseId,
        contractId,
        lawyerId,
        firmId, // Add firmId for multi-tenancy
        clientId,
        clientType: clientType || 'individual',
        items,
        subtotal,
        vatRate,
        vatAmount,
        totalAmount,
        balanceDue: totalAmount - (applyFromRetainer || 0),
        discountType,
        discountValue,
        dueDate: finalDueDate,
        paymentTerms,
        notes,
        customerNotes,
        internalNotes,
        responsibleAttorneyId: responsibleAttorneyId || lawyerId,
        billingArrangement,
        departmentId,
        locationId,
        firmSize,
        customerPONumber,
        matterNumber,
        termsTemplate,
        termsAndConditions,
        zatca: zatca || {},
        applyFromRetainer: applyFromRetainer || 0,
        paymentPlan: paymentPlan || { enabled: false },
        bankAccountId,
        paymentInstructions,
        enableOnlinePayment: enableOnlinePayment || false,
        lateFees: lateFees || { enabled: false },
        approval: approval || { required: false },
        email: email || {},
        attachments: attachments || [],
        wip: wip || {},
        budget: budget || {},
        createdBy: lawyerId,
        history: [{
            action: 'created',
            date: new Date(),
            user: lawyerId
        }]
    });

    await invoice.save();

    // Apply retainer if specified
    if (applyFromRetainer > 0) {
        const retainer = await Retainer.findOne({
            clientId,
            lawyerId,
            status: 'active'
        });

        if (retainer) {
            await retainer.consume(applyFromRetainer, invoice._id, `Applied to invoice ${invoice.invoiceNumber}`);
            invoice.retainerTransactionId = retainer._id;
            await invoice.save();
        }
    }

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'invoice_created',
        userId: lawyerId,
        clientId,
        relatedModel: 'Invoice',
        relatedId: invoice._id,
        description: `Invoice ${invoice.invoiceNumber} created for ${totalAmount} SAR`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    await invoice.populate([
        { path: 'lawyerId', select: 'firstName lastName username email' },
        { path: 'clientId', select: 'firstName lastName username email' },
        { path: 'caseId', select: 'title caseNumber' },
        { path: 'responsibleAttorneyId', select: 'firstName lastName' }
    ]);

    return res.status(201).json({
        success: true,
        message: 'تم إنشاء الفاتورة بنجاح',
        message_en: 'Invoice created successfully!',
        data: invoice
    });
});

/**
 * Get invoices with pagination and filters
 * GET /api/invoices
 */
const getInvoices = asyncHandler(async (req, res) => {
    const {
        status,
        clientId,
        caseId,
        startDate,
        endDate,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
    } = req.query;

    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الفواتير', 403);
    }

    const user = await User.findById(req.userID);
    const firmId = req.firmId; // From firmFilter middleware

    // Build filters based on firmId or user role
    let filters;
    if (firmId) {
        // If user has firmId, show all firm invoices
        filters = { firmId };
    } else if (user.role === 'lawyer') {
        filters = { lawyerId: req.userID };
    } else {
        filters = { clientId: req.userID };
    }

    if (status) filters.status = status;
    if (clientId) filters.clientId = clientId;
    if (caseId) filters.caseId = caseId;

    if (startDate || endDate) {
        filters.issueDate = {};
        if (startDate) filters.issueDate.$gte = new Date(startDate);
        if (endDate) filters.issueDate.$lte = new Date(endDate);
    }

    if (search) {
        filters.$or = [
            { invoiceNumber: { $regex: search, $options: 'i' } }
        ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [invoices, total] = await Promise.all([
        Invoice.find(filters)
            .populate('lawyerId', 'firstName lastName username image email')
            .populate('clientId', 'firstName lastName username image email')
            .populate('caseId', 'title caseNumber')
            .populate('responsibleAttorneyId', 'firstName lastName')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        Invoice.countDocuments(filters)
    ]);

    return res.json({
        success: true,
        data: invoices,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single invoice
 * GET /api/invoices/:id
 */
const getInvoice = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الفواتير', 403);
    }

    const { id, _id } = req.params;
    const invoiceId = id || _id;
    const firmId = req.firmId; // From firmFilter middleware

    const invoice = await Invoice.findById(invoiceId)
        .populate('lawyerId', 'firstName lastName username image email country phone')
        .populate('clientId', 'firstName lastName username image email country phone')
        .populate('caseId', 'title caseNumber')
        .populate('contractId')
        .populate('responsibleAttorneyId', 'firstName lastName email')
        .populate('items.attorneyId', 'firstName lastName')
        .populate('bankAccountId')
        .populate('approval.chain.approverId', 'firstName lastName email');

    if (!invoice) {
        throw CustomException('Invoice not found!', 404);
    }

    // Check access - firmId takes precedence for multi-tenancy
    const lawyerIdStr = invoice.lawyerId._id ? invoice.lawyerId._id.toString() : invoice.lawyerId.toString();
    const clientIdStr = invoice.clientId._id ? invoice.clientId._id.toString() : invoice.clientId.toString();

    let hasAccess = false;
    if (firmId) {
        hasAccess = invoice.firmId && invoice.firmId.toString() === firmId.toString();
    }
    if (!hasAccess) {
        hasAccess = lawyerIdStr === req.userID || clientIdStr === req.userID;
    }

    if (!hasAccess) {
        throw CustomException('You do not have access to this invoice!', 403);
    }

    // Mark as viewed if client is viewing
    if (clientIdStr === req.userID && !invoice.viewedAt) {
        invoice.viewedAt = new Date();
        if (invoice.status === 'sent') {
            invoice.status = 'viewed';
        }
        invoice.history.push({
            action: 'viewed',
            date: new Date(),
            user: req.userID
        });
        await invoice.save();
    }

    return res.json({
        success: true,
        data: invoice
    });
});

/**
 * Update invoice
 * PATCH /api/invoices/:id
 */
const updateInvoice = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية لتعديل الفواتير', 403);
    }

    const { id, _id } = req.params;
    const invoiceId = id || _id;
    const firmId = req.firmId;

    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
        throw CustomException('Invoice not found!', 404);
    }

    // Check access - firmId takes precedence
    const hasAccess = firmId
        ? invoice.firmId && invoice.firmId.toString() === firmId.toString()
        : invoice.lawyerId.toString() === req.userID;

    if (!hasAccess) {
        throw CustomException('Only the lawyer can update invoices!', 403);
    }

    if (!['draft', 'pending_approval'].includes(invoice.status)) {
        throw CustomException('Cannot update sent or paid invoices!', 400);
    }

    // Update allowed fields
    const allowedFields = [
        'items', 'subtotal', 'vatRate', 'vatAmount', 'totalAmount',
        'dueDate', 'paymentTerms', 'notes', 'customerNotes', 'internalNotes',
        'discountType', 'discountValue', 'clientType', 'responsibleAttorneyId',
        'billingArrangement', 'departmentId', 'locationId', 'firmSize',
        'customerPONumber', 'matterNumber', 'termsTemplate', 'termsAndConditions',
        'zatca', 'paymentPlan', 'bankAccountId', 'paymentInstructions',
        'enableOnlinePayment', 'lateFees', 'approval', 'email', 'attachments',
        'wip', 'budget'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            invoice[field] = req.body[field];
        }
    });

    // Recalculate balance due if totalAmount changed
    if (req.body.totalAmount !== undefined) {
        invoice.balanceDue = req.body.totalAmount - (invoice.amountPaid || 0) - (invoice.applyFromRetainer || 0);
    }

    invoice.updatedBy = req.userID;

    // Add to history
    invoice.history.push({
        action: 'updated',
        date: new Date(),
        user: req.userID
    });

    await invoice.save();

    await invoice.populate([
        { path: 'lawyerId', select: 'firstName lastName username email' },
        { path: 'clientId', select: 'firstName lastName username email' },
        { path: 'caseId', select: 'title caseNumber' }
    ]);

    return res.json({
        success: true,
        message: 'تم تحديث الفاتورة بنجاح',
        message_en: 'Invoice updated successfully!',
        data: invoice
    });
});

/**
 * Delete invoice
 * DELETE /api/invoices/:id
 */
const deleteInvoice = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية لحذف الفواتير', 403);
    }

    const { id, _id } = req.params;
    const invoiceId = id || _id;

    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
        throw CustomException('Invoice not found!', 404);
    }

    if (invoice.lawyerId.toString() !== req.userID) {
        throw CustomException('Only the lawyer can delete invoices!', 403);
    }

    // Cannot delete paid or partially paid invoices
    if (['paid', 'partial'].includes(invoice.status)) {
        throw CustomException('Cannot delete paid invoices! Use void instead.', 400);
    }

    // Reverse retainer application if any
    if (invoice.applyFromRetainer > 0 && invoice.retainerTransactionId) {
        const retainer = await Retainer.findById(invoice.retainerTransactionId);
        if (retainer) {
            await retainer.deposit(invoice.applyFromRetainer);
        }
    }

    await Invoice.findByIdAndDelete(invoiceId);

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'invoice_deleted',
        userId: req.userID,
        relatedModel: 'Invoice',
        relatedId: invoiceId,
        description: `Invoice ${invoice.invoiceNumber} deleted`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    return res.json({
        success: true,
        message: 'تم حذف الفاتورة بنجاح',
        message_en: 'Invoice deleted successfully'
    });
});

// ============ INVOICE ACTIONS ============

/**
 * Send invoice to client
 * POST /api/invoices/:id/send
 */
const sendInvoice = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الفواتير', 403);
    }

    const { id, _id } = req.params;
    const invoiceId = id || _id;

    const invoice = await Invoice.findById(invoiceId)
        .populate('clientId', 'firstName lastName email');

    if (!invoice) {
        throw CustomException('Invoice not found!', 404);
    }

    if (invoice.lawyerId.toString() !== req.userID) {
        throw CustomException('Only the lawyer can send invoices!', 403);
    }

    // Check if approval is required but not approved
    if (invoice.approval?.required && invoice.status !== 'pending_approval') {
        if (!invoice.approval.approvedAt) {
            throw CustomException('الفاتورة تحتاج موافقة قبل الإرسال - Invoice requires approval before sending', 400);
        }
    }

    // Generate ZATCA QR code for B2C invoices
    if (invoice.zatca?.invoiceSubtype === '0200000' || !invoice.zatca?.invoiceSubtype) {
        const qrCode = await generateQRCode(invoice);
        invoice.zatca = invoice.zatca || {};
        invoice.zatca.qrCode = qrCode;
        invoice.zatca.invoiceUUID = invoice.zatca.invoiceUUID || generateUUID();
    }

    invoice.status = 'sent';
    invoice.sentAt = new Date();
    invoice.email = invoice.email || {};
    invoice.email.sentAt = new Date();

    invoice.history.push({
        action: 'sent',
        date: new Date(),
        user: req.userID
    });

    await invoice.save();

    // TODO: Send email notification to client

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'invoice_sent',
        userId: req.userID,
        clientId: invoice.clientId._id || invoice.clientId,
        relatedModel: 'Invoice',
        relatedId: invoice._id,
        description: `Invoice ${invoice.invoiceNumber} sent to client`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    await invoice.populate([
        { path: 'lawyerId', select: 'firstName lastName username email' },
        { path: 'clientId', select: 'firstName lastName username email' }
    ]);

    return res.json({
        success: true,
        message: 'تم إرسال الفاتورة بنجاح',
        message_en: 'Invoice sent to client!',
        data: invoice
    });
});

/**
 * Record payment for invoice
 * POST /api/invoices/:id/record-payment
 */
const recordPayment = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الفواتير', 403);
    }

    const { id, _id } = req.params;
    const invoiceId = id || _id;
    const { amount, paymentMethod, reference, paymentDate, notes, bankAccountId } = req.body;

    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
        throw CustomException('الفاتورة غير موجودة - Invoice not found!', 404);
    }

    if (invoice.lawyerId.toString() !== req.userID) {
        throw CustomException('Only the lawyer can record payments!', 403);
    }

    if (invoice.status === 'void' || invoice.status === 'paid') {
        throw CustomException('لا يمكن تسجيل دفعة لهذه الفاتورة', 400);
    }

    if (amount > invoice.balanceDue) {
        throw CustomException('مبلغ الدفعة أكبر من المبلغ المستحق - Payment exceeds balance due', 400);
    }

    // Create payment record
    const payment = new Payment({
        clientId: invoice.clientId,
        invoiceId: invoice._id,
        caseId: invoice.caseId,
        lawyerId: invoice.lawyerId,
        amount,
        paymentMethod: paymentMethod || 'bank_transfer',
        transactionId: reference,
        paymentDate: paymentDate || new Date(),
        notes,
        bankAccountId,
        status: 'completed',
        createdBy: req.userID,
        processedBy: req.userID
    });

    await payment.save();

    // Update invoice
    invoice.amountPaid = (invoice.amountPaid || 0) + amount;
    invoice.balanceDue = invoice.totalAmount - invoice.amountPaid - (invoice.applyFromRetainer || 0);

    if (invoice.balanceDue <= 0) {
        invoice.status = 'paid';
        invoice.paidDate = new Date();
    } else if (invoice.amountPaid > 0) {
        invoice.status = 'partial';
    }

    invoice.history.push({
        action: 'payment_received',
        date: new Date(),
        user: req.userID,
        note: `Payment of ${amount} SAR received`
    });

    await invoice.save();

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'payment_received',
        userId: req.userID,
        clientId: invoice.clientId,
        relatedModel: 'Payment',
        relatedId: payment._id,
        description: `Payment of ${amount} SAR received for invoice ${invoice.invoiceNumber}`,
        amount,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    await payment.populate([
        { path: 'clientId', select: 'firstName lastName email' },
        { path: 'invoiceId', select: 'invoiceNumber totalAmount status balanceDue' }
    ]);

    return res.json({
        success: true,
        message: 'تم تسجيل الدفعة بنجاح',
        message_en: 'Payment recorded successfully',
        data: {
            payment,
            invoice: {
                _id: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                totalAmount: invoice.totalAmount,
                amountPaid: invoice.amountPaid,
                balanceDue: invoice.balanceDue,
                status: invoice.status
            }
        }
    });
});

/**
 * Void invoice
 * POST /api/invoices/:id/void
 */
const voidInvoice = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الفواتير', 403);
    }

    const { id, _id } = req.params;
    const invoiceId = id || _id;
    const { reason } = req.body;

    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
        throw CustomException('الفاتورة غير موجودة', 404);
    }

    if (invoice.lawyerId.toString() !== req.userID) {
        throw CustomException('Only the lawyer can void invoices!', 403);
    }

    if (invoice.status === 'void') {
        throw CustomException('الفاتورة ملغاة مسبقاً', 400);
    }

    if (invoice.amountPaid > 0) {
        throw CustomException('لا يمكن إلغاء فاتورة بها دفعات. قم بإنشاء إشعار دائن بدلاً من ذلك', 400);
    }

    // Reverse retainer application if any
    if (invoice.applyFromRetainer > 0 && invoice.retainerTransactionId) {
        const retainer = await Retainer.findById(invoice.retainerTransactionId);
        if (retainer) {
            await retainer.deposit(invoice.applyFromRetainer);
        }
    }

    invoice.status = 'void';
    invoice.voidedAt = new Date();
    invoice.voidReason = reason;
    invoice.updatedBy = req.userID;

    invoice.history.push({
        action: 'voided',
        date: new Date(),
        user: req.userID,
        note: reason
    });

    await invoice.save();

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'invoice_voided',
        userId: req.userID,
        relatedModel: 'Invoice',
        relatedId: invoice._id,
        description: `Invoice ${invoice.invoiceNumber} voided. Reason: ${reason}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    return res.json({
        success: true,
        message: 'تم إلغاء الفاتورة بنجاح',
        message_en: 'Invoice voided successfully',
        data: invoice
    });
});

/**
 * Duplicate invoice
 * POST /api/invoices/:id/duplicate
 */
const duplicateInvoice = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الفواتير', 403);
    }

    const { id, _id } = req.params;
    const invoiceId = id || _id;

    const originalInvoice = await Invoice.findById(invoiceId);

    if (!originalInvoice) {
        throw CustomException('الفاتورة غير موجودة', 404);
    }

    if (originalInvoice.lawyerId.toString() !== req.userID) {
        throw CustomException('Only the lawyer can duplicate invoices!', 403);
    }

    // Generate new invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Create duplicate
    const duplicateData = originalInvoice.toObject();
    delete duplicateData._id;
    delete duplicateData.invoiceNumber;
    delete duplicateData.status;
    delete duplicateData.amountPaid;
    delete duplicateData.paidDate;
    delete duplicateData.sentAt;
    delete duplicateData.viewedAt;
    delete duplicateData.voidedAt;
    delete duplicateData.voidReason;
    delete duplicateData.zatca;
    delete duplicateData.glEntries;
    delete duplicateData.paymentIntent;
    delete duplicateData.history;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;

    const newInvoice = new Invoice({
        ...duplicateData,
        invoiceNumber,
        status: 'draft',
        issueDate: new Date(),
        dueDate: calculateDueDate(duplicateData.paymentTerms),
        createdBy: req.userID,
        applyFromRetainer: 0,
        balanceDue: duplicateData.totalAmount,
        zatca: {},
        history: [{
            action: 'created',
            date: new Date(),
            user: req.userID,
            note: `Duplicated from ${originalInvoice.invoiceNumber}`
        }]
    });

    await newInvoice.save();

    await newInvoice.populate([
        { path: 'lawyerId', select: 'firstName lastName username email' },
        { path: 'clientId', select: 'firstName lastName username email' }
    ]);

    return res.status(201).json({
        success: true,
        message: 'تم نسخ الفاتورة بنجاح',
        message_en: 'Invoice duplicated successfully',
        data: newInvoice
    });
});

/**
 * Send reminder
 * POST /api/invoices/:id/send-reminder
 */
const sendReminder = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الفواتير', 403);
    }

    const { id, _id } = req.params;
    const invoiceId = id || _id;
    const { template, customMessage, ccRecipients } = req.body;

    const invoice = await Invoice.findById(invoiceId)
        .populate('clientId', 'firstName lastName email');

    if (!invoice) {
        throw CustomException('الفاتورة غير موجودة', 404);
    }

    if (invoice.lawyerId.toString() !== req.userID) {
        throw CustomException('Only the lawyer can send reminders!', 403);
    }

    if (!['sent', 'viewed', 'partial', 'overdue'].includes(invoice.status)) {
        throw CustomException('Cannot send reminder for this invoice status', 400);
    }

    // Update reminder tracking
    invoice.email = invoice.email || {};
    invoice.email.lastReminderAt = new Date();
    invoice.email.reminderCount = (invoice.email.reminderCount || 0) + 1;
    invoice.email.template = template || 'reminder';

    invoice.history.push({
        action: 'reminded',
        date: new Date(),
        user: req.userID,
        note: `Reminder #${invoice.email.reminderCount} sent`
    });

    await invoice.save();

    // TODO: Send email reminder

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'invoice_reminder_sent',
        userId: req.userID,
        clientId: invoice.clientId._id || invoice.clientId,
        relatedModel: 'Invoice',
        relatedId: invoice._id,
        description: `Reminder sent for invoice ${invoice.invoiceNumber}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    return res.json({
        success: true,
        message: 'تم إرسال التذكير بنجاح',
        message_en: 'Reminder sent successfully',
        data: {
            reminderCount: invoice.email.reminderCount,
            lastReminderAt: invoice.email.lastReminderAt
        }
    });
});

/**
 * Convert to credit note
 * POST /api/invoices/:id/convert-to-credit-note
 */
const convertToCreditNote = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الفواتير', 403);
    }

    const { id, _id } = req.params;
    const invoiceId = id || _id;
    const { reason, amount } = req.body;

    const originalInvoice = await Invoice.findById(invoiceId);

    if (!originalInvoice) {
        throw CustomException('الفاتورة غير موجودة', 404);
    }

    if (originalInvoice.lawyerId.toString() !== req.userID) {
        throw CustomException('Only the lawyer can create credit notes!', 403);
    }

    // Generate credit note number
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = await Invoice.countDocuments({
        invoiceNumber: new RegExp(`^CN-${year}${month}`)
    });
    const creditNoteNumber = `CN-${year}${month}-${String(count + 1).padStart(4, '0')}`;

    const creditAmount = amount || originalInvoice.totalAmount;

    const creditNote = new Invoice({
        invoiceNumber: creditNoteNumber,
        clientId: originalInvoice.clientId,
        caseId: originalInvoice.caseId,
        lawyerId: originalInvoice.lawyerId,
        clientType: originalInvoice.clientType,
        status: 'sent',
        items: originalInvoice.items.map(item => ({
            ...item.toObject(),
            unitPrice: -Math.abs(item.unitPrice),
            lineTotal: -Math.abs(item.lineTotal)
        })),
        subtotal: -creditAmount / (1 + originalInvoice.vatRate / 100),
        vatRate: originalInvoice.vatRate,
        vatAmount: -(creditAmount - creditAmount / (1 + originalInvoice.vatRate / 100)),
        totalAmount: -creditAmount,
        balanceDue: -creditAmount,
        notes: `Credit note for invoice ${originalInvoice.invoiceNumber}. Reason: ${reason}`,
        zatca: {
            invoiceType: '381',  // Credit Note
            invoiceSubtype: originalInvoice.zatca?.invoiceSubtype || '0200000'
        },
        createdBy: req.userID,
        history: [{
            action: 'created',
            date: new Date(),
            user: req.userID,
            note: `Credit note for invoice ${originalInvoice.invoiceNumber}`
        }]
    });

    await creditNote.save();

    // Update original invoice
    originalInvoice.history.push({
        action: 'updated',
        date: new Date(),
        user: req.userID,
        note: `Credit note ${creditNoteNumber} created`
    });
    await originalInvoice.save();

    await creditNote.populate([
        { path: 'clientId', select: 'firstName lastName email' }
    ]);

    return res.status(201).json({
        success: true,
        message: 'تم إنشاء إشعار الدائن بنجاح',
        message_en: 'Credit note created successfully',
        data: creditNote
    });
});

// ============ APPROVAL WORKFLOW ============

/**
 * Submit invoice for approval
 * POST /api/invoices/:id/submit-for-approval
 */
const submitForApproval = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الفواتير', 403);
    }

    const { id, _id } = req.params;
    const invoiceId = id || _id;

    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
        throw CustomException('الفاتورة غير موجودة', 404);
    }

    if (invoice.lawyerId.toString() !== req.userID) {
        throw CustomException('Only the creator can submit for approval!', 403);
    }

    if (invoice.status !== 'draft') {
        throw CustomException('Only draft invoices can be submitted for approval', 400);
    }

    invoice.status = 'pending_approval';
    invoice.history.push({
        action: 'updated',
        date: new Date(),
        user: req.userID,
        note: 'Submitted for approval'
    });

    await invoice.save();

    return res.json({
        success: true,
        message: 'تم تقديم الفاتورة للموافقة',
        message_en: 'Invoice submitted for approval',
        data: invoice
    });
});

/**
 * Approve invoice
 * POST /api/invoices/:id/approve
 */
const approveInvoice = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الفواتير', 403);
    }

    const { id, _id } = req.params;
    const invoiceId = id || _id;
    const { notes } = req.body;

    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
        throw CustomException('الفاتورة غير موجودة', 404);
    }

    // Check if user has approval permission (lawyer or admin)
    const user = await User.findById(req.userID);
    if (user.role !== 'admin' && invoice.lawyerId.toString() !== req.userID) {
        throw CustomException('You do not have permission to approve this invoice', 403);
    }

    if (invoice.status !== 'pending_approval') {
        throw CustomException('Invoice is not pending approval', 400);
    }

    invoice.approval = invoice.approval || {};
    invoice.approval.approvedAt = new Date();
    invoice.approval.approvedBy = req.userID;
    invoice.approval.chain = invoice.approval.chain || [];
    invoice.approval.chain.push({
        approverId: req.userID,
        status: 'approved',
        date: new Date(),
        notes
    });

    // If auto-send is enabled, change status to sent
    if (invoice.email?.autoSendOnApproval) {
        invoice.status = 'sent';
        invoice.sentAt = new Date();
    } else {
        invoice.status = 'draft';  // Return to draft for manual sending
    }

    invoice.history.push({
        action: 'approved',
        date: new Date(),
        user: req.userID,
        note: notes || 'Invoice approved'
    });

    await invoice.save();

    return res.json({
        success: true,
        message: 'تمت الموافقة على الفاتورة',
        message_en: 'Invoice approved successfully',
        data: invoice
    });
});

/**
 * Reject invoice
 * POST /api/invoices/:id/reject
 */
const rejectInvoice = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الفواتير', 403);
    }

    const { id, _id } = req.params;
    const invoiceId = id || _id;
    const { reason } = req.body;

    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
        throw CustomException('الفاتورة غير موجودة', 404);
    }

    // Check if user has approval permission
    const user = await User.findById(req.userID);
    if (user.role !== 'admin' && invoice.lawyerId.toString() !== req.userID) {
        throw CustomException('You do not have permission to reject this invoice', 403);
    }

    if (invoice.status !== 'pending_approval') {
        throw CustomException('Invoice is not pending approval', 400);
    }

    invoice.status = 'draft';  // Return to draft for editing
    invoice.approval = invoice.approval || {};
    invoice.approval.chain = invoice.approval.chain || [];
    invoice.approval.chain.push({
        approverId: req.userID,
        status: 'rejected',
        date: new Date(),
        notes: reason
    });

    invoice.history.push({
        action: 'rejected',
        date: new Date(),
        user: req.userID,
        note: reason
    });

    await invoice.save();

    return res.json({
        success: true,
        message: 'تم رفض الفاتورة',
        message_en: 'Invoice rejected',
        data: invoice
    });
});

// ============ ZATCA ============

/**
 * Submit invoice to ZATCA
 * POST /api/invoices/:id/zatca/submit
 */
const submitToZATCAHandler = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الفواتير', 403);
    }

    const { id, _id } = req.params;
    const invoiceId = id || _id;

    const invoice = await Invoice.findById(invoiceId)
        .populate('clientId');

    if (!invoice) {
        throw CustomException('الفاتورة غير موجودة', 404);
    }

    if (invoice.lawyerId.toString() !== req.userID) {
        throw CustomException('Only the lawyer can submit to ZATCA', 403);
    }

    // Validate ZATCA requirements
    const validation = validateForZATCA(invoice);
    if (!validation.isValid) {
        return res.status(400).json({
            success: false,
            message: 'الفاتورة غير متوافقة مع متطلبات هيئة الزكاة',
            message_en: 'Invoice does not meet ZATCA requirements',
            errors: validation.errors,
            warnings: validation.warnings
        });
    }

    // Submit to ZATCA
    const result = await submitToZATCA(invoice);

    // Update invoice with ZATCA response
    invoice.zatca = invoice.zatca || {};
    invoice.zatca.status = result.status;
    invoice.zatca.invoiceUUID = result.invoiceUUID;
    invoice.zatca.invoiceHash = result.invoiceHash;
    invoice.zatca.qrCode = result.qrCode;
    invoice.zatca.xmlInvoice = result.xmlInvoice;

    if (result.status === 'cleared' || result.status === 'reported') {
        invoice.zatca.cryptographicStamp = result.cryptographicStamp;
        invoice.zatca.clearanceDate = result.clearanceDate;
    } else if (result.status === 'rejected') {
        invoice.zatca.rejectionReason = result.rejectionReason;
    }

    await invoice.save();

    const message = result.status === 'cleared' || result.status === 'reported'
        ? 'تم اعتماد الفاتورة من هيئة الزكاة والضريبة'
        : 'تم رفض الفاتورة من هيئة الزكاة';

    return res.json({
        success: result.status !== 'rejected',
        message,
        data: {
            status: result.status,
            clearanceDate: result.clearanceDate,
            rejectionReason: result.rejectionReason,
            warnings: result.warnings
        }
    });
});

/**
 * Get ZATCA status
 * GET /api/invoices/:id/zatca/status
 */
const getZATCAStatus = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الفواتير', 403);
    }

    const { id, _id } = req.params;
    const invoiceId = id || _id;

    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
        throw CustomException('الفاتورة غير موجودة', 404);
    }

    const complianceStatus = getComplianceStatus(invoice);

    return res.json({
        success: true,
        data: complianceStatus
    });
});

// ============ STATISTICS & REPORTS ============

/**
 * Get invoice statistics
 * GET /api/invoices/stats
 */
const getStats = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الفواتير', 403);
    }

    const { period = 'month' } = req.query;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const dateFilter = getDateFilter(period);

    // Build match filter based on firmId or lawyerId
    const matchFilter = firmId
        ? { firmId: new mongoose.Types.ObjectId(firmId), createdAt: dateFilter }
        : { lawyerId: new mongoose.Types.ObjectId(lawyerId), createdAt: dateFilter };

    const stats = await Invoice.aggregate([
        { $match: matchFilter },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                total: { $sum: '$totalAmount' },
                paid: { $sum: '$amountPaid' },
                balance: { $sum: '$balanceDue' }
            }
        }
    ]);

    const overdueMatchFilter = firmId
        ? { firmId: new mongoose.Types.ObjectId(firmId) }
        : { lawyerId: new mongoose.Types.ObjectId(lawyerId) };

    const overdue = await Invoice.aggregate([
        {
            $match: {
                ...overdueMatchFilter,
                status: { $in: ['sent', 'viewed', 'partial'] },
                dueDate: { $lt: new Date() }
            }
        },
        {
            $group: {
                _id: null,
                count: { $sum: 1 },
                total: { $sum: '$balanceDue' }
            }
        }
    ]);

    // Calculate totals
    const totals = stats.reduce((acc, s) => {
        acc.totalInvoices += s.count;
        acc.totalAmount += s.total;
        acc.totalPaid += s.paid;
        acc.totalBalance += s.balance;
        return acc;
    }, { totalInvoices: 0, totalAmount: 0, totalPaid: 0, totalBalance: 0 });

    return res.json({
        success: true,
        data: {
            byStatus: stats,
            overdue: overdue[0] || { count: 0, total: 0 },
            totals
        }
    });
});

/**
 * Get overdue invoices
 * GET /api/invoices/overdue
 */
const getOverdueInvoices = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الفواتير', 403);
    }

    const today = new Date();
    const firmId = req.firmId;

    // Build filter based on firmId or lawyerId
    const queryFilter = firmId ? { firmId } : { lawyerId: req.userID };

    // Update status to overdue for past-due invoices
    await Invoice.updateMany(
        {
            ...queryFilter,
            status: { $in: ['sent', 'viewed', 'partial'] },
            dueDate: { $lt: today }
        },
        { status: 'overdue' }
    );

    const invoices = await Invoice.find({
        ...queryFilter,
        status: 'overdue'
    })
        .populate('clientId', 'firstName lastName username email phone')
        .populate('caseId', 'title caseNumber')
        .sort({ dueDate: 1 });

    return res.json({
        success: true,
        data: invoices
    });
});

// ============ PAYMENT GATEWAY ============

/**
 * Create payment intent (Stripe)
 * POST /api/invoices/:id/payment
 */
const createPaymentIntent = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول إلى الفواتير', 403);
    }

    const { id, _id } = req.params;
    const invoiceId = id || _id;

    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
        throw CustomException('Invoice not found!', 404);
    }

    if (invoice.clientId.toString() !== req.userID) {
        throw CustomException('Only the client can pay this invoice!', 403);
    }

    if (!invoice.enableOnlinePayment) {
        throw CustomException('Online payment is not enabled for this invoice', 400);
    }

    const payment_intent = await stripe.paymentIntents.create({
        amount: Math.round(invoice.balanceDue * 100), // Convert to cents
        currency: invoice.currency.toLowerCase(),
        automatic_payment_methods: {
            enabled: true,
        },
        metadata: {
            invoiceId: invoice._id.toString(),
            invoiceNumber: invoice.invoiceNumber
        }
    });

    invoice.paymentIntent = payment_intent.id;
    await invoice.save();

    return res.json({
        success: true,
        clientSecret: payment_intent.client_secret
    });
});

/**
 * Confirm payment (Stripe webhook handler)
 * POST /api/invoices/confirm-payment
 */
const confirmPayment = asyncHandler(async (req, res) => {
    const { paymentIntent } = req.body;

    const invoice = await Invoice.findOne({ paymentIntent });

    if (!invoice) {
        throw CustomException('Invoice not found!', 404);
    }

    invoice.status = 'paid';
    invoice.paidDate = new Date();
    invoice.amountPaid = invoice.totalAmount;
    invoice.balanceDue = 0;
    invoice.history.push({
        action: 'paid',
        date: new Date(),
        note: 'Payment confirmed via Stripe'
    });

    await invoice.save();

    // Create payment record
    await Payment.create({
        clientId: invoice.clientId,
        invoiceId: invoice._id,
        caseId: invoice.caseId,
        lawyerId: invoice.lawyerId,
        amount: invoice.totalAmount,
        currency: invoice.currency,
        paymentMethod: 'online_gateway',
        gatewayProvider: 'stripe',
        transactionId: paymentIntent,
        status: 'completed',
        paymentDate: new Date()
    });

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'invoice_paid',
        userId: invoice.clientId,
        clientId: invoice.clientId,
        relatedModel: 'Invoice',
        relatedId: invoice._id,
        description: `Invoice ${invoice.invoiceNumber} paid in full`,
        amount: invoice.totalAmount,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    return res.json({
        success: true,
        message: 'Payment confirmed successfully!',
        data: invoice
    });
});

/**
 * Apply retainer to invoice
 * POST /api/invoices/:id/apply-retainer
 */
const applyRetainer = asyncHandler(async (req, res) => {
    const { id, _id } = req.params;
    const invoiceId = id || _id;
    const { amount, retainerId } = req.body;

    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
        throw CustomException('الفاتورة غير موجودة', 404);
    }

    if (invoice.lawyerId.toString() !== req.userID) {
        throw CustomException('Only the lawyer can apply retainer', 403);
    }

    if (amount > invoice.balanceDue) {
        throw CustomException('المبلغ أكبر من المستحق - Amount exceeds balance due', 400);
    }

    await invoice.applyRetainer(amount, retainerId, req.userID);

    await invoice.populate([
        { path: 'clientId', select: 'firstName lastName email' }
    ]);

    return res.json({
        success: true,
        message: 'تم تطبيق العربون بنجاح',
        message_en: 'Retainer applied successfully',
        data: invoice
    });
});

// ============ EXPORT ============

/**
 * Generate XML (for download or ZATCA)
 * GET /api/invoices/:id/xml
 */
const generateXML = asyncHandler(async (req, res) => {
    const { id, _id } = req.params;
    const invoiceId = id || _id;

    const invoice = await Invoice.findById(invoiceId)
        .populate('clientId');

    if (!invoice) {
        throw CustomException('الفاتورة غير موجودة', 404);
    }

    const uuid = invoice.zatca?.invoiceUUID || generateUUID();
    const hash = invoice.zatca?.invoiceHash || generateInvoiceHash(invoice);
    const xml = generateUBLXML(invoice, uuid, hash);

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.xml`);
    res.send(xml);
});

/**
 * Generate PDF (placeholder - requires PDF library)
 * GET /api/invoices/:id/pdf
 */
const generatePDF = asyncHandler(async (req, res) => {
    const { id, _id } = req.params;
    const invoiceId = id || _id;
    const { download = false } = req.query;

    const invoice = await Invoice.findById(invoiceId)
        .populate('clientId', 'name email phone address')
        .populate('lawyerId', 'name')
        .populate('caseId', 'caseNumber title');

    if (!invoice) {
        throw CustomException('الفاتورة غير موجودة', 404);
    }

    // Import QueueService
    const QueueService = require('../services/queue.service');

    // Prepare invoice data for PDF generation
    const invoiceData = {
        invoiceNumber: invoice.invoiceNumber,
        invoiceId: invoice._id.toString(),
        date: invoice.issueDate,
        dueDate: invoice.dueDate,
        clientName: invoice.clientId?.name || 'N/A',
        clientEmail: invoice.clientId?.email,
        clientPhone: invoice.clientId?.phone,
        clientAddress: invoice.clientId?.address,
        items: invoice.items || [],
        subtotal: invoice.subtotal,
        vatRate: invoice.vatRate || 15,
        vatAmount: invoice.vatAmount,
        totalAmount: invoice.totalAmount,
        currency: invoice.currency || 'SAR',
        notes: invoice.notes,
        paymentTerms: invoice.paymentTerms
    };

    // Queue PDF generation
    const job = await QueueService.generatePDF(
        { invoiceId: invoice._id, invoiceData },
        'invoice',
        { priority: download ? 1 : 3 }
    );

    return res.json({
        success: true,
        message: 'PDF generation queued successfully',
        jobId: job.jobId,
        queueName: job.queueName,
        note: 'PDF will be available shortly. Check job status at /api/queues/pdf/jobs/' + job.jobId
    });
});

// ============ UNIFIED DATA ENDPOINTS ============

/**
 * Get billable items (unbilled time entries, expenses, tasks)
 * GET /api/invoices/billable-items
 *
 * This endpoint aggregates all unbilled items from various sources
 * to enable seamless invoice creation without duplicate data entry.
 *
 * Query params:
 * - clientId: Filter by client
 * - caseId: Filter by case
 * - startDate: Filter items from this date
 * - endDate: Filter items until this date
 */
const getBillableItems = asyncHandler(async (req, res) => {
    const { clientId, caseId, startDate, endDate } = req.query;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Base query based on firmId or lawyerId
    const baseQuery = firmId
        ? { firmId: new mongoose.Types.ObjectId(firmId) }
        : { lawyerId: new mongoose.Types.ObjectId(lawyerId) };
    if (clientId) baseQuery.clientId = new mongoose.Types.ObjectId(clientId);
    if (caseId) baseQuery.caseId = new mongoose.Types.ObjectId(caseId);

    // Get unbilled time entries
    const TimeEntry = mongoose.model('TimeEntry');
    const timeQuery = {
        ...baseQuery,
        isBillable: true,
        isBilled: false,
        status: { $in: ['approved', 'draft'] }
    };
    if (Object.keys(dateFilter).length > 0) timeQuery.date = dateFilter;

    const timeEntries = await TimeEntry.find(timeQuery)
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'fullNameArabic companyName clientNumber')
        .sort({ date: -1 })
        .lean();

    // Get unbilled expenses
    const Expense = mongoose.model('Expense');
    const expenseQuery = {
        ...baseQuery,
        isBillable: true,
        isBilled: false,
        status: { $nin: ['rejected', 'cancelled'] }
    };
    if (Object.keys(dateFilter).length > 0) expenseQuery.date = dateFilter;

    const expenses = await Expense.find(expenseQuery)
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'fullNameArabic companyName clientNumber')
        .sort({ date: -1 })
        .lean();

    // Get billable tasks (completed tasks with billing info)
    const Task = mongoose.model('Task');
    const taskQuery = {
        ...baseQuery,
        'billing.isBillable': true,
        'billing.isBilled': false,
        status: 'completed'
    };

    const tasks = await Task.find(taskQuery)
        .populate('caseId', 'title caseNumber')
        .select('title billing dueDate completedAt caseId')
        .sort({ completedAt: -1 })
        .lean();

    // Get billable events (attended events with billing info)
    const Event = mongoose.model('Event');
    const eventQuery = {
        ...baseQuery,
        'billing.isBillable': true,
        'billing.isBilled': false,
        status: 'completed'
    };

    const events = await Event.find(eventQuery)
        .populate('caseId', 'title caseNumber')
        .select('title billing startTime endTime caseId eventType')
        .sort({ startTime: -1 })
        .lean();

    // Format items for invoice creation
    const billableItems = {
        timeEntries: timeEntries.map(entry => ({
            type: 'time',
            id: entry._id,
            date: entry.date,
            description: entry.description,
            quantity: entry.hours || (entry.duration / 60),
            unitPrice: entry.hourlyRate,
            totalAmount: entry.totalAmount,
            caseId: entry.caseId?._id,
            caseName: entry.caseId?.title,
            caseNumber: entry.caseId?.caseNumber,
            clientId: entry.clientId?._id,
            clientName: entry.clientId?.fullNameArabic || entry.clientId?.companyName,
            activityCode: entry.activityCode,
            taskType: entry.taskType
        })),
        expenses: expenses.map(expense => ({
            type: 'expense',
            id: expense._id,
            date: expense.date,
            description: expense.description,
            quantity: 1,
            unitPrice: expense.amount,
            totalAmount: expense.amount,
            caseId: expense.caseId?._id,
            caseName: expense.caseId?.title,
            caseNumber: expense.caseId?.caseNumber,
            clientId: expense.clientId?._id,
            clientName: expense.clientId?.fullNameArabic || expense.clientId?.companyName,
            category: expense.category,
            receiptUrl: expense.receiptUrl
        })),
        tasks: tasks.map(task => ({
            type: 'flat_fee',
            id: task._id,
            date: task.completedAt || task.dueDate,
            description: task.title,
            quantity: 1,
            unitPrice: task.billing?.amount || 0,
            totalAmount: task.billing?.amount || 0,
            caseId: task.caseId?._id,
            caseName: task.caseId?.title,
            caseNumber: task.caseId?.caseNumber
        })),
        events: events.map(event => ({
            type: 'time',
            id: event._id,
            date: event.startTime,
            description: `${event.eventType || 'اجتماع'}: ${event.title}`,
            quantity: event.billing?.hours || 1,
            unitPrice: event.billing?.hourlyRate || 0,
            totalAmount: event.billing?.amount || 0,
            caseId: event.caseId?._id,
            caseName: event.caseId?.title,
            caseNumber: event.caseId?.caseNumber
        }))
    };

    // Calculate totals
    const totals = {
        timeEntries: {
            count: billableItems.timeEntries.length,
            totalHours: billableItems.timeEntries.reduce((sum, e) => sum + (e.quantity || 0), 0),
            totalAmount: billableItems.timeEntries.reduce((sum, e) => sum + (e.totalAmount || 0), 0)
        },
        expenses: {
            count: billableItems.expenses.length,
            totalAmount: billableItems.expenses.reduce((sum, e) => sum + (e.totalAmount || 0), 0)
        },
        tasks: {
            count: billableItems.tasks.length,
            totalAmount: billableItems.tasks.reduce((sum, e) => sum + (e.totalAmount || 0), 0)
        },
        events: {
            count: billableItems.events.length,
            totalAmount: billableItems.events.reduce((sum, e) => sum + (e.totalAmount || 0), 0)
        },
        grandTotal: 0
    };

    totals.grandTotal = totals.timeEntries.totalAmount +
                        totals.expenses.totalAmount +
                        totals.tasks.totalAmount +
                        totals.events.totalAmount;

    res.json({
        success: true,
        data: billableItems,
        totals
    });
});

/**
 * Get open invoices for a client (for payment allocation)
 * GET /api/invoices/open/:clientId
 */
const getOpenInvoices = asyncHandler(async (req, res) => {
    const { clientId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Build filter based on firmId or lawyerId
    const queryFilter = firmId ? { firmId } : { lawyerId };

    const invoices = await Invoice.find({
        ...queryFilter,
        clientId,
        status: { $in: ['sent', 'viewed', 'partial', 'overdue'] },
        balanceDue: { $gt: 0 }
    })
    .select('invoiceNumber issueDate dueDate totalAmount amountPaid balanceDue status')
    .sort({ dueDate: 1 })
    .lean();

    const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balanceDue, 0);

    res.json({
        success: true,
        data: invoices,
        totalOutstanding
    });
});

// ============ BULK DELETE ============

/**
 * Bulk delete invoices
 * POST /api/invoices/bulk-delete
 */
const bulkDeleteInvoices = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية لحذف الفواتير', 403);
    }

    const { ids } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw CustomException('يجب توفير قائمة المعرفات / IDs list is required', 400);
    }

    // Build access query - can only delete draft or sent invoices (not paid/partial)
    const accessQuery = firmId
        ? { _id: { $in: ids }, firmId, status: { $nin: ['paid', 'partial'] } }
        : { _id: { $in: ids }, lawyerId, status: { $nin: ['paid', 'partial'] } };

    // Find invoices to check retainer applications
    const invoices = await Invoice.find(accessQuery);

    // Reverse retainer applications for all invoices being deleted
    for (const invoice of invoices) {
        if (invoice.applyFromRetainer > 0 && invoice.retainerTransactionId) {
            const retainer = await Retainer.findById(invoice.retainerTransactionId);
            if (retainer) {
                await retainer.deposit(invoice.applyFromRetainer);
            }
        }
    }

    const result = await Invoice.deleteMany(accessQuery);

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'invoices_bulk_deleted',
        userId: lawyerId,
        relatedModel: 'Invoice',
        description: `${result.deletedCount} invoices bulk deleted`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    return res.json({
        success: true,
        message: `تم حذف ${result.deletedCount} فاتورة بنجاح / ${result.deletedCount} invoice(s) deleted successfully`,
        deletedCount: result.deletedCount
    });
});

module.exports = {
    // CRUD
    createInvoice,
    getInvoices,
    getInvoice,
    updateInvoice,
    deleteInvoice,
    bulkDeleteInvoices,

    // Actions
    sendInvoice,
    recordPayment,
    voidInvoice,
    duplicateInvoice,
    sendReminder,
    convertToCreditNote,

    // Approval
    submitForApproval,
    approveInvoice,
    rejectInvoice,

    // ZATCA
    submitToZATCA: submitToZATCAHandler,
    getZATCAStatus,

    // Stats
    getStats,
    getOverdueInvoices,

    // Payment
    createPaymentIntent,
    confirmPayment,
    applyRetainer,

    // Export
    generateXML,
    generatePDF,

    // Unified Data (No duplicate entry)
    getBillableItems,
    getOpenInvoices
};
