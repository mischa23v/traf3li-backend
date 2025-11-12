const { Invoice, Case, Order, User } = require('../models');
const { CustomException } = require('../utils');
const stripe = require('stripe')(process.env.STRIPE_SECRET);

// Generate unique invoice number
const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-${year}${month}-${random}`;
};

// Create invoice
const createInvoice = async (request, response) => {
    const { caseId, contractId, items, dueDate } = request.body;
    try {
        // Check if user is a lawyer
        const user = await User.findById(request.userID);
        if (user.role !== 'lawyer') {
            throw CustomException('Only lawyers can create invoices!', 403);
        }

        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const vatAmount = subtotal * 0.15; // 15% VAT
        const total = subtotal + vatAmount;

        // Get client ID from case or contract
        let clientId;
        if (caseId) {
            const caseDoc = await Case.findById(caseId);
            clientId = caseDoc.clientId;
        } else if (contractId) {
            const contract = await Order.findById(contractId);
            clientId = contract.buyerID;
        }

        const invoice = new Invoice({
            invoiceNumber: generateInvoiceNumber(),
            caseId,
            contractId,
            lawyerId: request.userID,
            clientId,
            items,
            subtotal,
            vatRate: 15,
            vatAmount,
            total,
            dueDate: new Date(dueDate)
        });

        await invoice.save();

        return response.status(201).send({
            error: false,
            message: 'Invoice created successfully!',
            invoice
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get invoices
const getInvoices = async (request, response) => {
    const { status } = request.query;
    try {
        const user = await User.findById(request.userID);
        
        const filters = {
            ...(user.role === 'lawyer' 
                ? { lawyerId: request.userID } 
                : { clientId: request.userID }),
            ...(status && { status })
        };

        const invoices = await Invoice.find(filters)
            .populate('lawyerId', 'username image email')
            .populate('clientId', 'username image email')
            .sort({ createdAt: -1 });

        return response.send({
            error: false,
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
            .populate('clientId', 'username image email country phone')
            .populate('caseId')
            .populate('contractId');

        if (!invoice) {
            throw CustomException('Invoice not found!', 404);
        }

        // Check access
        if (invoice.lawyerId._id.toString() !== request.userID && invoice.clientId._id.toString() !== request.userID) {
            throw CustomException('You do not have access to this invoice!', 403);
        }

        return response.send({
            error: false,
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
    try {
        const invoice = await Invoice.findById(_id);

        if (!invoice) {
            throw CustomException('Invoice not found!', 404);
        }

        if (invoice.lawyerId.toString() !== request.userID) {
            throw CustomException('Only the lawyer can update invoices!', 403);
        }

        if (invoice.status !== 'draft') {
            throw CustomException('Cannot update sent or paid invoices!', 400);
        }

        const updatedInvoice = await Invoice.findByIdAndUpdate(
            _id,
            { $set: request.body },
            { new: true }
        );

        return response.status(202).send({
            error: false,
            message: 'Invoice updated successfully!',
            invoice: updatedInvoice
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

        if (invoice.lawyerId.toString() !== request.userID) {
            throw CustomException('Only the lawyer can send invoices!', 403);
        }

        invoice.status = 'sent';
        await invoice.save();

        // TODO: Send email notification to client

        return response.status(202).send({
            error: false,
            message: 'Invoice sent to client!',
            invoice
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

        const payment_intent = await stripe.paymentIntents.create({
            amount: Math.round(invoice.total * 100), // Convert to cents
            currency: "SAR", // Saudi Riyal
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
        const invoice = await Invoice.findOneAndUpdate(
            { paymentIntent },
            {
                $set: {
                    status: 'paid',
                    paidDate: new Date()
                }
            },
            { new: true }
        );

        if (!invoice) {
            throw CustomException('Invoice not found!', 404);
        }

        return response.status(202).send({
            error: false,
            message: 'Payment confirmed successfully!',
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
        const today = new Date();
        const invoices = await Invoice.find({
            lawyerId: request.userID,
            status: { $in: ['sent', 'overdue'] },
            dueDate: { $lt: today }
        }).populate('clientId', 'username email phone');

        // Update status to overdue
        await Invoice.updateMany(
            {
                lawyerId: request.userID,
                status: 'sent',
                dueDate: { $lt: today }
            },
            { status: 'overdue' }
        );

        return response.send({
            error: false,
            invoices
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
    sendInvoice,
    createPaymentIntent,
    confirmPayment,
    getOverdueInvoices
};
