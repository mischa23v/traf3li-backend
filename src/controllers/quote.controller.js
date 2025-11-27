const { Quote, Invoice, Client, Case, User, FinanceSettings, BillingActivity } = require('../models');
const { CustomException } = require('../utils');

// Helper to calculate quote totals
const calculateQuoteTotals = (items, discount = 0, discountType = 'fixed', taxRate = 15) => {
    const subTotal = items.reduce((sum, item) => {
        const itemTotal = (item.quantity || 1) * (item.price || 0);
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

// Create quote
const createQuote = async (request, response) => {
    const { clientId, caseId, items, discount, discountType, taxRate, expiredDate, notes, notesAr, terms, termsAr, currency } = request.body;

    try {
        const user = await User.findById(request.userID);
        if (!user || (user.role !== 'lawyer' && user.role !== 'admin')) {
            throw CustomException('Only lawyers or admins can create quotes!', 403);
        }

        // Verify client exists
        const client = await Client.findById(clientId);
        if (!client) {
            throw CustomException('Client not found!', 404);
        }

        // Verify case exists if provided
        if (caseId) {
            const caseDoc = await Case.findById(caseId);
            if (!caseDoc) {
                throw CustomException('Case not found!', 404);
            }
        }

        // Calculate items totals
        const processedItems = items.map(item => ({
            ...item,
            total: (item.quantity || 1) * (item.price || 0)
        }));

        // Calculate quote totals
        const effectiveTaxRate = taxRate !== undefined ? taxRate : 15;
        const { subTotal, taxTotal, total } = calculateQuoteTotals(
            processedItems,
            discount || 0,
            discountType || 'fixed',
            effectiveTaxRate
        );

        // Generate quote number
        const quoteNumber = await Quote.generateQuoteNumber();

        const quote = new Quote({
            quoteNumber,
            clientId,
            caseId,
            createdBy: request.userID,
            items: processedItems,
            subTotal,
            discount: discount || 0,
            discountType: discountType || 'fixed',
            taxRate: effectiveTaxRate,
            taxTotal,
            total,
            currency: currency || 'SAR',
            expiredDate: new Date(expiredDate),
            notes,
            notesAr,
            terms,
            termsAr
        });

        await quote.save();

        // Log activity
        if (BillingActivity && BillingActivity.logActivity) {
            await BillingActivity.logActivity({
                activityType: 'quote_created',
                userId: request.userID,
                clientId,
                relatedModel: 'Quote',
                relatedId: quote._id,
                description: `Quote ${quoteNumber} created`,
                ipAddress: request.ip
            });
        }

        return response.status(201).send({
            error: false,
            message: 'Quote created successfully!',
            data: { quote }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get all quotes
const getQuotes = async (request, response) => {
    const {
        page = 1,
        limit = 20,
        status,
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
            filters.createdBy = request.userID;
        } else if (user.role === 'client') {
            filters.clientId = request.userID;
        }

        // Apply filters
        if (status) filters.status = status;
        if (clientId) filters.clientId = clientId;
        if (caseId) filters.caseId = caseId;

        if (startDate || endDate) {
            filters.date = {};
            if (startDate) filters.date.$gte = new Date(startDate);
            if (endDate) filters.date.$lte = new Date(endDate);
        }

        if (search) {
            filters.$or = [
                { quoteNumber: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

        const [quotes, total] = await Promise.all([
            Quote.find(filters)
                .populate('clientId', 'name email phone')
                .populate('caseId', 'caseNumber title')
                .populate('createdBy', 'username email')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            Quote.countDocuments(filters)
        ]);

        return response.send({
            success: true,
            data: {
                quotes,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get single quote
const getQuote = async (request, response) => {
    const { _id } = request.params;

    try {
        const quote = await Quote.findById(_id)
            .populate('clientId', 'name email phone address')
            .populate('caseId', 'caseNumber title')
            .populate('createdBy', 'username email phone')
            .populate('invoiceId');

        if (!quote) {
            throw CustomException('Quote not found!', 404);
        }

        return response.send({
            success: true,
            data: { quote }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Update quote
const updateQuote = async (request, response) => {
    const { _id } = request.params;
    const updates = request.body;

    try {
        const quote = await Quote.findById(_id);

        if (!quote) {
            throw CustomException('Quote not found!', 404);
        }

        if (quote.createdBy.toString() !== request.userID) {
            throw CustomException('Only the creator can update this quote!', 403);
        }

        if (!['draft', 'pending'].includes(quote.status)) {
            throw CustomException('Cannot update quote with this status!', 400);
        }

        // Recalculate if items changed
        if (updates.items) {
            updates.items = updates.items.map(item => ({
                ...item,
                total: (item.quantity || 1) * (item.price || 0)
            }));

            const { subTotal, taxTotal, total } = calculateQuoteTotals(
                updates.items,
                updates.discount !== undefined ? updates.discount : quote.discount,
                updates.discountType || quote.discountType,
                updates.taxRate !== undefined ? updates.taxRate : quote.taxRate
            );

            updates.subTotal = subTotal;
            updates.taxTotal = taxTotal;
            updates.total = total;
        }

        const updatedQuote = await Quote.findByIdAndUpdate(
            _id,
            { $set: updates },
            { new: true }
        );

        return response.send({
            success: true,
            message: 'Quote updated successfully!',
            data: { quote: updatedQuote }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Delete quote
const deleteQuote = async (request, response) => {
    const { _id } = request.params;

    try {
        const quote = await Quote.findById(_id);

        if (!quote) {
            throw CustomException('Quote not found!', 404);
        }

        if (quote.createdBy.toString() !== request.userID) {
            throw CustomException('Only the creator can delete this quote!', 403);
        }

        if (quote.status !== 'draft') {
            throw CustomException('Only draft quotes can be deleted!', 400);
        }

        await Quote.findByIdAndDelete(_id);

        return response.send({
            success: true,
            message: 'Quote deleted successfully!'
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Send quote
const sendQuote = async (request, response) => {
    const { _id } = request.params;

    try {
        const quote = await Quote.findById(_id);

        if (!quote) {
            throw CustomException('Quote not found!', 404);
        }

        if (quote.createdBy.toString() !== request.userID) {
            throw CustomException('Only the creator can send this quote!', 403);
        }

        quote.status = 'sent';
        quote.sentDate = new Date();
        await quote.save();

        // TODO: Send email notification to client

        return response.send({
            success: true,
            message: 'Quote sent to client!',
            data: { quote }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Accept quote
const acceptQuote = async (request, response) => {
    const { _id } = request.params;

    try {
        const quote = await Quote.findById(_id);

        if (!quote) {
            throw CustomException('Quote not found!', 404);
        }

        if (quote.status !== 'sent') {
            throw CustomException('Only sent quotes can be accepted!', 400);
        }

        quote.status = 'accepted';
        await quote.save();

        return response.send({
            success: true,
            message: 'Quote accepted!',
            data: { quote }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Decline quote
const declineQuote = async (request, response) => {
    const { _id } = request.params;

    try {
        const quote = await Quote.findById(_id);

        if (!quote) {
            throw CustomException('Quote not found!', 404);
        }

        if (quote.status !== 'sent') {
            throw CustomException('Only sent quotes can be declined!', 400);
        }

        quote.status = 'declined';
        await quote.save();

        return response.send({
            success: true,
            message: 'Quote declined!',
            data: { quote }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Convert quote to invoice
const convertToInvoice = async (request, response) => {
    const { _id } = request.params;
    const { dueDate } = request.body;

    try {
        const quote = await Quote.findById(_id);

        if (!quote) {
            throw CustomException('Quote not found!', 404);
        }

        if (quote.convertedToInvoice) {
            throw CustomException('Quote has already been converted to invoice!', 400);
        }

        if (quote.status !== 'accepted') {
            throw CustomException('Only accepted quotes can be converted to invoices!', 400);
        }

        // Generate invoice number
        const invoiceNumber = await Invoice.generateInvoiceNumber();

        // Create invoice from quote data
        const invoice = new Invoice({
            invoiceNumber,
            clientId: quote.clientId,
            caseId: quote.caseId,
            createdBy: quote.createdBy,
            lawyerId: quote.createdBy,
            items: quote.items.map(item => ({
                itemName: item.itemName,
                itemNameAr: item.itemNameAr,
                description: item.description,
                descriptionAr: item.descriptionAr,
                quantity: item.quantity,
                price: item.price,
                total: item.total
            })),
            subTotal: quote.subTotal,
            subtotal: quote.subTotal,
            discount: quote.discount,
            discountType: quote.discountType,
            taxRate: quote.taxRate,
            vatRate: quote.taxRate,
            taxTotal: quote.taxTotal,
            vatAmount: quote.taxTotal,
            total: quote.total,
            currency: quote.currency,
            dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
            notes: quote.notes,
            notesAr: quote.notesAr,
            terms: quote.terms,
            termsAr: quote.termsAr,
            quoteId: quote._id,
            status: 'draft',
            paymentStatus: 'unpaid',
            history: [{
                action: 'created',
                date: new Date(),
                user: request.userID,
                note: `Created from quote ${quote.quoteNumber}`
            }]
        });

        await invoice.save();

        // Update quote
        quote.convertedToInvoice = true;
        quote.invoiceId = invoice._id;
        await quote.save();

        // Log activity
        if (BillingActivity && BillingActivity.logActivity) {
            await BillingActivity.logActivity({
                activityType: 'quote_converted',
                userId: request.userID,
                clientId: quote.clientId,
                relatedModel: 'Quote',
                relatedId: quote._id,
                description: `Quote ${quote.quoteNumber} converted to invoice ${invoiceNumber}`,
                ipAddress: request.ip
            });
        }

        return response.status(201).send({
            success: true,
            message: 'Quote converted to invoice successfully!',
            data: { quote, invoice }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get quote summary
const getQuoteSummary = async (request, response) => {
    try {
        const user = await User.findById(request.userID);
        const filter = user.role === 'lawyer' ? { createdBy: request.userID } : {};

        const result = await Quote.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    draft: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
                    pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                    sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
                    accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
                    declined: { $sum: { $cond: [{ $eq: ['$status', 'declined'] }, 1, 0] } },
                    expired: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
                    cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                    converted: { $sum: { $cond: ['$convertedToInvoice', 1, 0] } },
                    totalAmount: { $sum: '$total' },
                    acceptedAmount: {
                        $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, '$total', 0] }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    total: 1,
                    draft: 1,
                    pending: 1,
                    sent: 1,
                    accepted: 1,
                    declined: 1,
                    expired: 1,
                    cancelled: 1,
                    converted: 1,
                    totalAmount: 1,
                    acceptedAmount: 1,
                    conversionRate: {
                        $cond: [
                            { $gt: ['$total', 0] },
                            { $multiply: [{ $divide: ['$converted', '$total'] }, 100] },
                            0
                        ]
                    }
                }
            }
        ]);

        return response.send({
            success: true,
            data: result[0] || {
                total: 0,
                draft: 0,
                pending: 0,
                sent: 0,
                accepted: 0,
                declined: 0,
                expired: 0,
                cancelled: 0,
                converted: 0,
                totalAmount: 0,
                acceptedAmount: 0,
                conversionRate: 0
            }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

module.exports = {
    createQuote,
    getQuotes,
    getQuote,
    updateQuote,
    deleteQuote,
    sendQuote,
    acceptQuote,
    declineQuote,
    convertToInvoice,
    getQuoteSummary
};
