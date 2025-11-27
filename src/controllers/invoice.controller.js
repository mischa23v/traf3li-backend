const { Invoice, Case, Order, User, BillingActivity } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const stripe = require('stripe')(process.env.STRIPE_SECRET);

// Generate unique invoice number
const generateInvoiceNumber = async () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = await Invoice.countDocuments({
        invoiceNumber: new RegExp(`^INV-${year}${month}`)
    });
    return `INV-${year}${month}-${String(count + 1).padStart(4, '0')}`;
};

// Create invoice
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
        notes,
        discountType,
        discountValue = 0
    } = req.body;

    const lawyerId = req.userID;

    // Check if user is a lawyer
    const user = await User.findById(lawyerId);
    if (user.role !== 'lawyer') {
        throw CustomException('Only lawyers can create invoices!', 403);
    }

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
        throw CustomException('Invoice items are required', 400);
    }

    if (!dueDate) {
        throw CustomException('Due date is required', 400);
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
        subtotal = items.reduce((sum, item) => sum + (item.total || item.quantity * item.unitPrice), 0);
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

    const invoice = new Invoice({
        invoiceNumber: await generateInvoiceNumber(),
        caseId,
        contractId,
        lawyerId,
        clientId,
        items,
        subtotal,
        vatRate,
        vatAmount,
        totalAmount,
        balanceDue: totalAmount,
        discountType,
        discountValue,
        dueDate: new Date(dueDate),
        notes,
        history: [{
            action: 'created',
            date: new Date(),
            user: lawyerId
        }]
    });

    await invoice.save();

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
        { path: 'clientId', select: 'firstName lastName username email' }
    ]);

    return res.status(201).json({
        success: true,
        message: 'Invoice created successfully!',
        invoice
    });
});

// Get invoices with pagination and filters
const getInvoices = asyncHandler(async (req, res) => {
    const {
        status,
        clientId,
        caseId,
        startDate,
        endDate,
        page = 1,
        limit = 10
    } = req.query;

    const user = await User.findById(req.userID);

    const filters = {
        ...(user.role === 'lawyer'
            ? { lawyerId: req.userID }
            : { clientId: req.userID })
    };

    if (status) filters.status = status;
    if (clientId) filters.clientId = clientId;
    if (caseId) filters.caseId = caseId;

    if (startDate || endDate) {
        filters.issueDate = {};
        if (startDate) filters.issueDate.$gte = new Date(startDate);
        if (endDate) filters.issueDate.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(filters)
        .populate('lawyerId', 'firstName lastName username image email')
        .populate('clientId', 'firstName lastName username image email')
        .populate('caseId', 'title caseNumber')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Invoice.countDocuments(filters);

    return res.json({
        success: true,
        invoices,
        total,
        page: parseInt(page),
        limit: parseInt(limit)
    });
});

// Get single invoice
const getInvoice = asyncHandler(async (req, res) => {
    const { id, _id } = req.params;
    const invoiceId = id || _id;

    const invoice = await Invoice.findById(invoiceId)
        .populate('lawyerId', 'firstName lastName username image email country phone')
        .populate('clientId', 'firstName lastName username image email country phone')
        .populate('caseId', 'title caseNumber')
        .populate('contractId');

    if (!invoice) {
        throw CustomException('Invoice not found!', 404);
    }

    // Check access
    const lawyerIdStr = invoice.lawyerId._id ? invoice.lawyerId._id.toString() : invoice.lawyerId.toString();
    const clientIdStr = invoice.clientId._id ? invoice.clientId._id.toString() : invoice.clientId.toString();

    if (lawyerIdStr !== req.userID && clientIdStr !== req.userID) {
        throw CustomException('You do not have access to this invoice!', 403);
    }

    return res.json({
        success: true,
        invoice
    });
});

// Update invoice
const updateInvoice = asyncHandler(async (req, res) => {
    const { id, _id } = req.params;
    const invoiceId = id || _id;

    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
        throw CustomException('Invoice not found!', 404);
    }

    if (invoice.lawyerId.toString() !== req.userID) {
        throw CustomException('Only the lawyer can update invoices!', 403);
    }

    if (!['draft', 'pending'].includes(invoice.status)) {
        throw CustomException('Cannot update sent or paid invoices!', 400);
    }

    // Update fields
    const allowedFields = [
        'items', 'subtotal', 'vatRate', 'vatAmount', 'totalAmount',
        'dueDate', 'notes', 'discountType', 'discountValue'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            invoice[field] = req.body[field];
        }
    });

    // Recalculate balance due if totalAmount changed
    if (req.body.totalAmount !== undefined) {
        invoice.balanceDue = req.body.totalAmount - (invoice.amountPaid || 0);
    }

    // Add to history
    invoice.history.push({
        action: 'updated',
        date: new Date(),
        user: req.userID
    });

    await invoice.save();

    await invoice.populate([
        { path: 'lawyerId', select: 'firstName lastName username email' },
        { path: 'clientId', select: 'firstName lastName username email' }
    ]);

    return res.json({
        success: true,
        message: 'Invoice updated successfully!',
        invoice
    });
});

// Delete invoice
const deleteInvoice = asyncHandler(async (req, res) => {
    const { id, _id } = req.params;
    const invoiceId = id || _id;

    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
        throw CustomException('Invoice not found!', 404);
    }

    if (invoice.lawyerId.toString() !== req.userID) {
        throw CustomException('Only the lawyer can delete invoices!', 403);
    }

    // Cannot delete paid invoices
    if (invoice.status === 'paid') {
        throw CustomException('Cannot delete paid invoices!', 400);
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
        message: 'Invoice deleted successfully'
    });
});

// Send invoice to client
const sendInvoice = asyncHandler(async (req, res) => {
    const { id, _id } = req.params;
    const invoiceId = id || _id;

    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
        throw CustomException('Invoice not found!', 404);
    }

    if (invoice.lawyerId.toString() !== req.userID) {
        throw CustomException('Only the lawyer can send invoices!', 403);
    }

    invoice.status = 'sent';
    invoice.history.push({
        action: 'sent',
        date: new Date(),
        user: req.userID
    });

    await invoice.save();

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'invoice_sent',
        userId: req.userID,
        clientId: invoice.clientId,
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
        message: 'Invoice sent to client!',
        invoice
    });
});

// Create payment intent
const createPaymentIntent = asyncHandler(async (req, res) => {
    const { id, _id } = req.params;
    const invoiceId = id || _id;

    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
        throw CustomException('Invoice not found!', 404);
    }

    if (invoice.clientId.toString() !== req.userID) {
        throw CustomException('Only the client can pay this invoice!', 403);
    }

    const payment_intent = await stripe.paymentIntents.create({
        amount: Math.round(invoice.totalAmount * 100), // Convert to cents
        currency: "SAR",
        automatic_payment_methods: {
            enabled: true,
        },
        metadata: {
            invoiceId: invoice._id.toString()
        }
    });

    invoice.paymentIntent = payment_intent.id;
    await invoice.save();

    return res.json({
        success: true,
        clientSecret: payment_intent.client_secret
    });
});

// Confirm payment
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
        invoice
    });
});

// Get overdue invoices
const getOverdueInvoices = asyncHandler(async (req, res) => {
    const today = new Date();

    // Update status to overdue for past-due invoices
    await Invoice.updateMany(
        {
            lawyerId: req.userID,
            status: { $in: ['sent', 'partial'] },
            dueDate: { $lt: today }
        },
        { status: 'overdue' }
    );

    const invoices = await Invoice.find({
        lawyerId: req.userID,
        status: 'overdue'
    })
        .populate('clientId', 'firstName lastName username email phone')
        .populate('caseId', 'title caseNumber')
        .sort({ dueDate: 1 });

    return res.json({
        success: true,
        invoices
    });
});

module.exports = {
    createInvoice,
    getInvoices,
    getInvoice,
    updateInvoice,
    deleteInvoice,
    sendInvoice,
    createPaymentIntent,
    confirmPayment,
    getOverdueInvoices
};
