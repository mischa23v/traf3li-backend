const { Invoice, Case, Order, User, Payment, Client, FinanceSettings, BillingActivity } = require('../models');
const { CustomException } = require('../utils');
const stripe = require('stripe')(process.env.STRIPE_SECRET);

// Helper to calculate invoice totals
const calculateInvoiceTotals = (items, discount = 0, discountType = 'fixed', taxRate = 15) => {
    const subTotal = items.reduce((sum, item) => {
        const itemTotal = (item.quantity || 1) * (item.price || item.unitPrice || 0);
        return sum + itemTotal;
    }, 0);

    let discountAmount = 0;
    if (discountType === 'percentage') {
        discountAmount = (subTotal * discount) / 100;
    } else {
        discountAmount = discount;
    }

    const taxableAmount = subTotal - discountAmount;
    const taxTotal = (taxableAmount * taxRate) / 100;
    const total = taxableAmount + taxTotal;

    return { subTotal, discountAmount, taxTotal, total };
};

// Create invoice
const createInvoice = async (request, response) => {
    const { clientId, caseId, contractId, items, dueDate, discount, discountType, taxRate, notes, notesAr, terms, termsAr, currency } = request.body;
    try {
        // Check if user is a lawyer
        const user = await User.findById(request.userID);
        if (user.role !== 'lawyer' && user.role !== 'admin') {
            throw CustomException('Only lawyers or admins can create invoices!', 403);
        }

        // Get client ID from case or contract if not provided directly
        let resolvedClientId = clientId;
        if (!resolvedClientId) {
            if (caseId) {
                const caseDoc = await Case.findById(caseId);
                if (caseDoc) resolvedClientId = caseDoc.clientId;
            } else if (contractId) {
                const contract = await Order.findById(contractId);
                if (contract) resolvedClientId = contract.buyerID;
            }
        }

        if (!resolvedClientId) {
            throw CustomException('Client ID is required!', 400);
        }

        // Calculate items totals
        const processedItems = items.map(item => ({
            ...item,
            itemName: item.itemName || item.description,
            price: item.price || item.unitPrice,
            total: (item.quantity || 1) * (item.price || item.unitPrice || 0)
        }));

        // Calculate invoice totals
        const effectiveTaxRate = taxRate !== undefined ? taxRate : 15;
        const { subTotal, taxTotal, total } = calculateInvoiceTotals(
            processedItems,
            discount || 0,
            discountType || 'fixed',
            effectiveTaxRate
        );

        // Generate invoice number
        const invoiceNumber = await Invoice.generateInvoiceNumber();

        const invoice = new Invoice({
            invoiceNumber,
            clientId: resolvedClientId,
            caseId,
            contractId,
            createdBy: request.userID,
            lawyerId: request.userID,
            items: processedItems,
            subTotal,
            subtotal: subTotal,
            discount: discount || 0,
            discountType: discountType || 'fixed',
            taxRate: effectiveTaxRate,
            vatRate: effectiveTaxRate,
            taxTotal,
            vatAmount: taxTotal,
            total,
            currency: currency || 'SAR',
            dueDate: new Date(dueDate),
            notes,
            notesAr,
            terms,
            termsAr,
            status: 'draft',
            paymentStatus: 'unpaid',
            history: [{
                action: 'created',
                date: new Date(),
                user: request.userID
            }]
        });

        await invoice.save();

        // Log activity
        if (BillingActivity && BillingActivity.logActivity) {
            await BillingActivity.logActivity({
                activityType: 'invoice_created',
                userId: request.userID,
                clientId: resolvedClientId,
                relatedModel: 'Invoice',
                relatedId: invoice._id,
                description: `Invoice ${invoiceNumber} created`,
                ipAddress: request.ip
            });
        }

        return response.status(201).send({
            success: true,
            error: false,
            message: 'Invoice created successfully!',
            data: { invoice },
            invoice
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get invoices with pagination
const getInvoices = async (request, response) => {
    const {
        page = 1,
        limit = 20,
        status,
        paymentStatus,
        clientId,
        caseId,
        startDate,
        endDate,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = request.query;

    try {
        const user = await User.findById(request.userID);

        const filters = {};

        // Role-based filtering
        if (user.role === 'lawyer') {
            filters.$or = [
                { lawyerId: request.userID },
                { createdBy: request.userID }
            ];
        } else if (user.role === 'client') {
            filters.clientId = request.userID;
        }

        // Apply filters
        if (status) filters.status = status;
        if (paymentStatus) filters.paymentStatus = paymentStatus;
        if (clientId) filters.clientId = clientId;
        if (caseId) filters.caseId = caseId;

        if (startDate || endDate) {
            filters.date = {};
            if (startDate) filters.date.$gte = new Date(startDate);
            if (endDate) filters.date.$lte = new Date(endDate);
        }

        if (search) {
            filters.$or = [
                { invoiceNumber: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

        const [invoices, total] = await Promise.all([
            Invoice.find(filters)
                .populate('lawyerId', 'username image email')
                .populate('createdBy', 'username image email')
                .populate('clientId', 'name email phone')
                .populate('caseId', 'caseNumber title')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            Invoice.countDocuments(filters)
        ]);

        return response.send({
            success: true,
            error: false,
            data: {
                invoices,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit))
                }
            },
            invoices
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get single invoice
const getInvoice = async (request, response) => {
    const { _id } = request.params;
    try {
        const invoice = await Invoice.findById(_id)
            .populate('lawyerId', 'username image email country phone')
            .populate('createdBy', 'username image email country phone')
            .populate('clientId', 'name email phone address')
            .populate('caseId')
            .populate('contractId')
            .populate('quoteId');

        if (!invoice) {
            throw CustomException('Invoice not found!', 404);
        }

        return response.send({
            success: true,
            error: false,
            data: { invoice },
            invoice
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Update invoice
const updateInvoice = async (request, response) => {
    const { _id } = request.params;
    const updates = request.body;

    try {
        const invoice = await Invoice.findById(_id);

        if (!invoice) {
            throw CustomException('Invoice not found!', 404);
        }

        const userId = invoice.lawyerId?.toString() || invoice.createdBy?.toString();
        if (userId !== request.userID) {
            throw CustomException('Only the creator can update invoices!', 403);
        }

        if (!['draft', 'pending'].includes(invoice.status)) {
            throw CustomException('Cannot update invoice with this status!', 400);
        }

        // Recalculate if items changed
        if (updates.items) {
            updates.items = updates.items.map(item => ({
                ...item,
                itemName: item.itemName || item.description,
                price: item.price || item.unitPrice,
                total: (item.quantity || 1) * (item.price || item.unitPrice || 0)
            }));

            const { subTotal, taxTotal, total } = calculateInvoiceTotals(
                updates.items,
                updates.discount !== undefined ? updates.discount : invoice.discount,
                updates.discountType || invoice.discountType,
                updates.taxRate !== undefined ? updates.taxRate : invoice.taxRate
            );

            updates.subTotal = subTotal;
            updates.subtotal = subTotal;
            updates.taxTotal = taxTotal;
            updates.vatAmount = taxTotal;
            updates.total = total;
        }

        // Add to history
        if (!updates.history) {
            updates.$push = {
                history: {
                    action: 'updated',
                    date: new Date(),
                    user: request.userID
                }
            };
        }

        const updatedInvoice = await Invoice.findByIdAndUpdate(
            _id,
            updates,
            { new: true }
        );

        return response.send({
            success: true,
            error: false,
            message: 'Invoice updated successfully!',
            data: { invoice: updatedInvoice },
            invoice: updatedInvoice
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Delete invoice
const deleteInvoice = async (request, response) => {
    const { _id } = request.params;

    try {
        const invoice = await Invoice.findById(_id);

        if (!invoice) {
            throw CustomException('Invoice not found!', 404);
        }

        const userId = invoice.lawyerId?.toString() || invoice.createdBy?.toString();
        if (userId !== request.userID) {
            throw CustomException('Only the creator can delete invoices!', 403);
        }

        if (invoice.status !== 'draft') {
            throw CustomException('Only draft invoices can be deleted!', 400);
        }

        await Invoice.findByIdAndDelete(_id);

        return response.send({
            success: true,
            error: false,
            message: 'Invoice deleted successfully!'
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Send invoice to client
const sendInvoice = async (request, response) => {
    const { _id } = request.params;
    try {
        const invoice = await Invoice.findById(_id);

        if (!invoice) {
            throw CustomException('Invoice not found!', 404);
        }

        const userId = invoice.lawyerId?.toString() || invoice.createdBy?.toString();
        if (userId !== request.userID) {
            throw CustomException('Only the creator can send invoices!', 403);
        }

        invoice.status = 'sent';
        invoice.sentDate = new Date();
        invoice.history.push({
            action: 'sent',
            date: new Date(),
            user: request.userID
        });
        await invoice.save();

        // TODO: Send email notification to client

        return response.send({
            success: true,
            error: false,
            message: 'Invoice sent to client!',
            data: { invoice },
            invoice
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Record payment for invoice
const recordPayment = async (request, response) => {
    const { _id } = request.params;
    const { amount, paymentModeId, paymentDate, referenceNumber, notes } = request.body;

    try {
        const invoice = await Invoice.findById(_id);

        if (!invoice) {
            throw CustomException('Invoice not found!', 404);
        }

        if (!amount || amount <= 0) {
            throw CustomException('Invalid payment amount!', 400);
        }

        const currentPaid = invoice.paidAmount || invoice.amountPaid || 0;
        const remaining = invoice.total - currentPaid;

        if (amount > remaining) {
            throw CustomException(`Payment amount cannot exceed remaining balance of ${remaining}!`, 400);
        }

        // Create payment record if Payment model exists
        let payment = null;
        try {
            const Payment = require('../models/payment.model');
            const paymentNumber = `PAY-${Date.now()}`;

            payment = new Payment({
                paymentNumber,
                clientId: invoice.clientId,
                invoiceId: invoice._id,
                createdBy: request.userID,
                amount,
                currency: invoice.currency,
                paymentModeId,
                paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
                referenceNumber,
                notes,
                status: 'completed'
            });

            await payment.save();
        } catch (e) {
            // Payment model might not exist, continue without creating payment record
        }

        // Update invoice
        const newPaidAmount = currentPaid + amount;
        const newRemainingAmount = invoice.total - newPaidAmount;

        invoice.paidAmount = newPaidAmount;
        invoice.amountPaid = newPaidAmount;
        invoice.remainingAmount = newRemainingAmount;
        invoice.balanceDue = newRemainingAmount;

        if (newPaidAmount >= invoice.total) {
            invoice.paymentStatus = 'paid';
            invoice.status = 'paid';
            invoice.paidDate = new Date();
        } else if (newPaidAmount > 0) {
            invoice.paymentStatus = 'partially';
            invoice.status = 'partially_paid';
        }

        invoice.history.push({
            action: newPaidAmount >= invoice.total ? 'paid' : 'partially_paid',
            date: new Date(),
            user: request.userID,
            note: `Payment of ${amount} ${invoice.currency} recorded`,
            metadata: { amount, paymentId: payment?._id }
        });

        await invoice.save();

        return response.status(201).send({
            success: true,
            error: false,
            message: 'Payment recorded successfully!',
            data: { invoice, payment }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Create payment intent
const createPaymentIntent = async (request, response) => {
    const { _id } = request.params;
    try {
        const invoice = await Invoice.findById(_id);

        if (!invoice) {
            throw CustomException('Invoice not found!', 404);
        }

        if (invoice.clientId.toString() !== request.userID) {
            throw CustomException('Only the client can pay this invoice!', 403);
        }

        const amountToPay = invoice.remainingAmount || invoice.balanceDue || invoice.total;

        const payment_intent = await stripe.paymentIntents.create({
            amount: Math.round(amountToPay * 100), // Convert to cents
            currency: (invoice.currency || 'SAR').toLowerCase(),
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                invoiceId: invoice._id.toString()
            }
        });

        invoice.paymentIntent = payment_intent.id;
        await invoice.save();

        return response.send({
            success: true,
            error: false,
            clientSecret: payment_intent.client_secret
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Confirm payment
const confirmPayment = async (request, response) => {
    const { paymentIntent } = request.body;
    try {
        const invoice = await Invoice.findOne({ paymentIntent });

        if (!invoice) {
            throw CustomException('Invoice not found!', 404);
        }

        invoice.status = 'paid';
        invoice.paymentStatus = 'paid';
        invoice.paidDate = new Date();
        invoice.paidAmount = invoice.total;
        invoice.amountPaid = invoice.total;
        invoice.remainingAmount = 0;
        invoice.balanceDue = 0;
        invoice.history.push({
            action: 'paid',
            date: new Date(),
            note: 'Payment confirmed via Stripe'
        });

        await invoice.save();

        return response.send({
            success: true,
            error: false,
            message: 'Payment confirmed successfully!',
            data: { invoice },
            invoice
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get overdue invoices
const getOverdueInvoices = async (request, response) => {
    try {
        const user = await User.findById(request.userID);
        const today = new Date();

        const filters = {
            status: { $in: ['sent', 'overdue', 'partially_paid'] },
            dueDate: { $lt: today },
            paymentStatus: { $ne: 'paid' }
        };

        if (user.role === 'lawyer') {
            filters.$or = [
                { lawyerId: request.userID },
                { createdBy: request.userID }
            ];
        }

        const invoices = await Invoice.find(filters)
            .populate('clientId', 'name email phone')
            .sort({ dueDate: 1 });

        // Update status to overdue
        await Invoice.updateMany(
            {
                ...filters,
                status: { $in: ['sent', 'pending'] }
            },
            { status: 'overdue', isOverdue: true }
        );

        return response.send({
            success: true,
            error: false,
            data: { invoices },
            invoices
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get invoice summary
const getInvoiceSummary = async (request, response) => {
    try {
        const user = await User.findById(request.userID);
        const summary = await Invoice.getSummary(
            user.role === 'lawyer' ? request.userID : null
        );

        return response.send({
            success: true,
            error: false,
            data: summary
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

module.exports = {
    createInvoice,
    getInvoices,
    getInvoice,
    updateInvoice,
    deleteInvoice,
    sendInvoice,
    recordPayment,
    createPaymentIntent,
    confirmPayment,
    getOverdueInvoices,
    getInvoiceSummary
};
