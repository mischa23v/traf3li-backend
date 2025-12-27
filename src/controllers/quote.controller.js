/**
 * Quote/Quotation Controller
 * Security: All operations enforce multi-tenant isolation via firmQuery
 *
 * Complete quotation management with line items, signatures, and PDF support
 */

const Quote = require('../models/quote.model');
const Product = require('../models/product.model');
const Lead = require('../models/lead.model');
const Client = require('../models/client.model');
const Contact = require('../models/contact.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Create a new quote
 * @route POST /api/quotes
 */
exports.createQuote = async (req, res) => {
    try {
        const firmId = req.firmId;
        const lawyerId = req.userID;

        // ═══════════════════════════════════════════════════════════════
        // MASS ASSIGNMENT PROTECTION - Only allow specific fields
        // ═══════════════════════════════════════════════════════════════
        const allowedFields = pickAllowedFields(req.body, [
            'title', 'titleAr', 'description', 'descriptionAr',
            'leadId', 'clientId', 'contactId',
            'quoteDate', 'validUntil',
            'customerInfo', 'items',
            'currency', 'paymentTerms',
            'termsAndConditions', 'termsAndConditionsAr',
            'clientNotes', 'internalNotes',
            'assignedTo', 'tags'
        ]);

        // Validate required fields
        if (!allowedFields.title || typeof allowedFields.title !== 'string') {
            throw CustomException('Title is required', 400);
        }

        // Sanitize ID references
        if (allowedFields.leadId) {
            allowedFields.leadId = sanitizeObjectId(allowedFields.leadId);
            if (!allowedFields.leadId) {
                throw CustomException('Invalid lead ID', 400);
            }
            // Verify lead belongs to firm
            const lead = await Lead.findOne({
                _id: allowedFields.leadId,
                ...req.firmQuery
            });
            if (!lead) {
                throw CustomException('Lead not found', 404);
            }
        }

        if (allowedFields.clientId) {
            allowedFields.clientId = sanitizeObjectId(allowedFields.clientId);
            if (!allowedFields.clientId) {
                throw CustomException('Invalid client ID', 400);
            }
            // Verify client belongs to firm
            const client = await Client.findOne({
                _id: allowedFields.clientId,
                ...req.firmQuery
            });
            if (!client) {
                throw CustomException('Client not found', 404);
            }
        }

        if (allowedFields.contactId) {
            allowedFields.contactId = sanitizeObjectId(allowedFields.contactId);
            if (!allowedFields.contactId) {
                throw CustomException('Invalid contact ID', 400);
            }
            // Verify contact belongs to firm
            const contact = await Contact.findOne({
                _id: allowedFields.contactId,
                ...req.firmQuery
            });
            if (!contact) {
                throw CustomException('Contact not found', 404);
            }
        }

        if (allowedFields.assignedTo) {
            allowedFields.assignedTo = sanitizeObjectId(allowedFields.assignedTo);
        }

        // Validate and sanitize line items
        if (allowedFields.items && Array.isArray(allowedFields.items)) {
            allowedFields.items = allowedFields.items.map(item => {
                // Sanitize product reference
                if (item.productId) {
                    item.productId = sanitizeObjectId(item.productId);
                }

                return pickAllowedFields(item, [
                    'productId', 'description', 'descriptionAr',
                    'quantity', 'unit', 'unitPrice',
                    'discount', 'taxRate', 'sortOrder',
                    'isOptional', 'notes'
                ]);
            });
        }

        // Create quote with firm context
        const quote = new Quote({
            ...allowedFields,
            firmId,
            lawyerId,
            createdBy: lawyerId,
            status: 'draft'
        });

        await quote.save();

        // Populate for response
        const populated = await Quote.findOne({
            _id: quote._id,
            ...req.firmQuery
        })
            .populate('leadId', 'firstName lastName companyName email')
            .populate('clientId', 'firstName lastName companyName email')
            .populate('contactId', 'firstName lastName email')
            .populate('assignedTo', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName');

        return res.status(201).json({
            error: false,
            message: 'Quote created successfully',
            data: populated
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error creating quote:', message);
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get all quotes with filters
 * @route GET /api/quotes
 */
exports.getQuotes = async (req, res) => {
    try {
        const firmId = req.firmId;
        const {
            status, leadId, clientId, contactId, assignedTo,
            search, dateFrom, dateTo, expiringSoon,
            sortBy, sortOrder, page, limit
        } = req.query;

        const filters = {
            status,
            leadId,
            clientId,
            contactId,
            assignedTo,
            search,
            dateFrom,
            dateTo,
            expiringSoon,
            sortBy,
            sortOrder,
            page,
            limit
        };

        const result = await Quote.getQuotes(firmId, filters);

        return res.json({
            error: false,
            data: result.quotes,
            pagination: {
                page: result.page,
                limit: result.limit,
                total: result.total,
                pages: result.pages
            }
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error getting quotes:', message);
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get single quote by ID
 * @route GET /api/quotes/:id
 */
exports.getQuoteById = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid quote ID', 400);
        }

        // IDOR Protection: Query includes firmQuery
        const quote = await Quote.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        })
            .populate('leadId', 'firstName lastName companyName email phone')
            .populate('clientId', 'firstName lastName companyName email phone')
            .populate('contactId', 'firstName lastName email phone')
            .populate('assignedTo', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName')
            .populate('lostReasonId', 'reason reasonAr category')
            .populate('items.productId', 'productId name nameAr code');

        if (!quote) {
            throw CustomException('Quote not found', 404);
        }

        return res.json({ error: false, data: quote });
    } catch ({ message, status = 500 }) {
        logger.error('Error getting quote:', message);
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Update quote
 * @route PUT /api/quotes/:id
 */
exports.updateQuote = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid quote ID', 400);
        }

        // Mass assignment protection
        const allowedFields = pickAllowedFields(req.body, [
            'title', 'titleAr', 'description', 'descriptionAr',
            'leadId', 'clientId', 'contactId',
            'validUntil', 'customerInfo', 'items',
            'paymentTerms', 'termsAndConditions', 'termsAndConditionsAr',
            'clientNotes', 'internalNotes',
            'assignedTo', 'tags'
        ]);

        // Sanitize ID references
        if (allowedFields.leadId) {
            allowedFields.leadId = sanitizeObjectId(allowedFields.leadId);
        }
        if (allowedFields.clientId) {
            allowedFields.clientId = sanitizeObjectId(allowedFields.clientId);
        }
        if (allowedFields.contactId) {
            allowedFields.contactId = sanitizeObjectId(allowedFields.contactId);
        }
        if (allowedFields.assignedTo) {
            allowedFields.assignedTo = sanitizeObjectId(allowedFields.assignedTo);
        }

        // Validate and sanitize line items
        if (allowedFields.items && Array.isArray(allowedFields.items)) {
            allowedFields.items = allowedFields.items.map(item => {
                if (item.productId) {
                    item.productId = sanitizeObjectId(item.productId);
                }
                return pickAllowedFields(item, [
                    'itemId', 'productId', 'description', 'descriptionAr',
                    'quantity', 'unit', 'unitPrice',
                    'discount', 'taxRate', 'sortOrder',
                    'isOptional', 'notes'
                ]);
            });
        }

        // IDOR Protection: Query-level ownership check
        const quote = await Quote.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            {
                $set: {
                    ...allowedFields,
                    updatedAt: new Date()
                }
            },
            { new: true, runValidators: true }
        )
            .populate('leadId', 'firstName lastName companyName email')
            .populate('clientId', 'firstName lastName companyName email')
            .populate('contactId', 'firstName lastName email')
            .populate('assignedTo', 'firstName lastName email');

        if (!quote) {
            throw CustomException('Quote not found', 404);
        }

        return res.json({
            error: false,
            message: 'Quote updated successfully',
            data: quote
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error updating quote:', message);
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Delete quote
 * @route DELETE /api/quotes/:id
 */
exports.deleteQuote = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid quote ID', 400);
        }

        // IDOR Protection: Query-level ownership check
        const quote = await Quote.findOneAndDelete({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!quote) {
            throw CustomException('Quote not found', 404);
        }

        return res.json({
            error: false,
            message: 'Quote deleted successfully'
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error deleting quote:', message);
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Send quote to customer
 * @route POST /api/quotes/:id/send
 */
exports.sendQuote = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid quote ID', 400);
        }

        const allowedFields = pickAllowedFields(req.body, [
            'email', 'subject', 'message', 'ccEmails'
        ]);

        // IDOR Protection
        const quote = await Quote.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!quote) {
            throw CustomException('Quote not found', 404);
        }

        if (quote.status === 'accepted' || quote.status === 'rejected') {
            throw CustomException('Cannot send quote that has already been accepted or rejected', 400);
        }

        // Update quote status
        quote.status = 'sent';
        quote.sentAt = new Date();
        await quote.save();

        // TODO: Implement email sending logic here
        // This would integrate with email service (SendGrid, AWS SES, etc.)

        return res.json({
            error: false,
            message: 'Quote sent successfully',
            data: quote
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error sending quote:', message);
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Accept quote (with signature)
 * @route POST /api/quotes/:id/accept
 */
exports.acceptQuote = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid quote ID', 400);
        }

        const allowedFields = pickAllowedFields(req.body, [
            'signature', 'signedByName', 'signedByEmail', 'ipAddress'
        ]);

        // IDOR Protection
        const quote = await Quote.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!quote) {
            throw CustomException('Quote not found', 404);
        }

        if (quote.status === 'accepted') {
            throw CustomException('Quote has already been accepted', 400);
        }

        if (quote.status === 'rejected') {
            throw CustomException('Cannot accept a rejected quote', 400);
        }

        if (quote.isExpired) {
            throw CustomException('Quote has expired', 400);
        }

        // Update quote with client signature
        quote.status = 'accepted';
        quote.respondedAt = new Date();
        quote.signatures = quote.signatures || {};
        quote.signatures.clientSignature = {
            signedAt: new Date(),
            signature: allowedFields.signature,
            signedByName: allowedFields.signedByName,
            signedByEmail: allowedFields.signedByEmail,
            ipAddress: allowedFields.ipAddress
        };

        await quote.save();

        return res.json({
            error: false,
            message: 'Quote accepted successfully',
            data: quote
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error accepting quote:', message);
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Reject quote
 * @route POST /api/quotes/:id/reject
 */
exports.rejectQuote = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid quote ID', 400);
        }

        const allowedFields = pickAllowedFields(req.body, [
            'lostReasonId', 'lostNotes'
        ]);

        // Sanitize lostReasonId
        if (allowedFields.lostReasonId) {
            allowedFields.lostReasonId = sanitizeObjectId(allowedFields.lostReasonId);
        }

        // IDOR Protection
        const quote = await Quote.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!quote) {
            throw CustomException('Quote not found', 404);
        }

        if (quote.status === 'accepted') {
            throw CustomException('Cannot reject an accepted quote', 400);
        }

        if (quote.status === 'rejected') {
            throw CustomException('Quote has already been rejected', 400);
        }

        // Update quote status
        quote.status = 'rejected';
        quote.respondedAt = new Date();
        quote.lostReasonId = allowedFields.lostReasonId;
        quote.lostNotes = allowedFields.lostNotes;

        await quote.save();

        return res.json({
            error: false,
            message: 'Quote rejected successfully',
            data: quote
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error rejecting quote:', message);
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Generate PDF for quote
 * @route GET /api/quotes/:id/pdf
 */
exports.generatePdf = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid quote ID', 400);
        }

        // IDOR Protection
        const quote = await Quote.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        })
            .populate('leadId', 'firstName lastName companyName email phone')
            .populate('clientId', 'firstName lastName companyName email phone')
            .populate('items.productId', 'name nameAr code');

        if (!quote) {
            throw CustomException('Quote not found', 404);
        }

        // TODO: Implement PDF generation logic here
        // This would integrate with a PDF library (puppeteer, pdfmake, etc.)

        // For now, return quote data for PDF generation
        return res.json({
            error: false,
            message: 'PDF generation endpoint - implement PDF library integration',
            data: quote
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error generating PDF:', message);
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Duplicate quote
 * @route POST /api/quotes/:id/duplicate
 */
exports.duplicateQuote = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid quote ID', 400);
        }

        // IDOR Protection
        const originalQuote = await Quote.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        }).lean();

        if (!originalQuote) {
            throw CustomException('Quote not found', 404);
        }

        // Create duplicate with new ID
        const duplicateData = {
            ...originalQuote,
            _id: undefined,
            quoteId: undefined,
            title: `${originalQuote.title} (Copy)`,
            status: 'draft',
            createdAt: undefined,
            updatedAt: undefined,
            sentAt: null,
            viewedAt: null,
            respondedAt: null,
            viewHistory: [],
            signatures: {},
            pdfUrl: null,
            pdfGeneratedAt: null,
            revisionNumber: 1,
            previousVersionId: null,
            createdBy: req.userID
        };

        const duplicate = new Quote(duplicateData);
        await duplicate.save();

        return res.status(201).json({
            error: false,
            message: 'Quote duplicated successfully',
            data: duplicate
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error duplicating quote:', message);
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Add item to quote
 * @route POST /api/quotes/:id/items
 */
exports.addItem = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid quote ID', 400);
        }

        const allowedFields = pickAllowedFields(req.body, [
            'productId', 'description', 'descriptionAr',
            'quantity', 'unit', 'unitPrice',
            'discount', 'taxRate', 'sortOrder',
            'isOptional', 'notes'
        ]);

        // Validate required fields
        if (!allowedFields.description) {
            throw CustomException('Item description is required', 400);
        }

        // Sanitize product reference
        if (allowedFields.productId) {
            allowedFields.productId = sanitizeObjectId(allowedFields.productId);
            if (allowedFields.productId) {
                // Verify product belongs to firm
                const product = await Product.findOne({
                    _id: allowedFields.productId,
                    firmId: req.firmId
                });
                if (!product) {
                    throw CustomException('Product not found', 404);
                }
            }
        }

        // IDOR Protection
        const quote = await Quote.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!quote) {
            throw CustomException('Quote not found', 404);
        }

        // Add item
        quote.items.push(allowedFields);
        await quote.save();

        return res.json({
            error: false,
            message: 'Item added successfully',
            data: quote
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error adding item:', message);
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Update item in quote
 * @route PUT /api/quotes/:id/items/:itemId
 */
exports.updateItem = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { itemId } = req.params;

        if (!sanitizedId) {
            throw CustomException('Invalid quote ID', 400);
        }

        const allowedFields = pickAllowedFields(req.body, [
            'productId', 'description', 'descriptionAr',
            'quantity', 'unit', 'unitPrice',
            'discount', 'taxRate', 'sortOrder',
            'isOptional', 'notes'
        ]);

        // Sanitize product reference
        if (allowedFields.productId) {
            allowedFields.productId = sanitizeObjectId(allowedFields.productId);
        }

        // IDOR Protection
        const quote = await Quote.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!quote) {
            throw CustomException('Quote not found', 404);
        }

        // Find and update item
        const item = quote.items.find(i => i.itemId === itemId);
        if (!item) {
            throw CustomException('Item not found', 404);
        }

        Object.assign(item, allowedFields);
        await quote.save();

        return res.json({
            error: false,
            message: 'Item updated successfully',
            data: quote
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error updating item:', message);
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Remove item from quote
 * @route DELETE /api/quotes/:id/items/:itemId
 */
exports.removeItem = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        const { itemId } = req.params;

        if (!sanitizedId) {
            throw CustomException('Invalid quote ID', 400);
        }

        // IDOR Protection
        const quote = await Quote.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!quote) {
            throw CustomException('Quote not found', 404);
        }

        // Remove item
        quote.items = quote.items.filter(i => i.itemId !== itemId);
        await quote.save();

        return res.json({
            error: false,
            message: 'Item removed successfully',
            data: quote
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error removing item:', message);
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Record view event
 * @route POST /api/quotes/:id/view
 */
exports.recordView = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid quote ID', 400);
        }

        const { ipAddress, userAgent } = req.body;

        // IDOR Protection
        const quote = await Quote.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!quote) {
            throw CustomException('Quote not found', 404);
        }

        await quote.recordView(ipAddress || req.ip, userAgent || req.headers['user-agent']);

        return res.json({
            error: false,
            message: 'View recorded successfully'
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error recording view:', message);
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Revise quote (create new version)
 * @route POST /api/quotes/:id/revise
 */
exports.reviseQuote = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);
        if (!sanitizedId) {
            throw CustomException('Invalid quote ID', 400);
        }

        // IDOR Protection
        const originalQuote = await Quote.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        }).lean();

        if (!originalQuote) {
            throw CustomException('Quote not found', 404);
        }

        // Create revision with incremented version number
        const revisionData = {
            ...originalQuote,
            _id: undefined,
            quoteId: undefined,
            status: 'draft',
            createdAt: undefined,
            updatedAt: undefined,
            sentAt: null,
            viewedAt: null,
            respondedAt: null,
            viewHistory: [],
            signatures: {},
            pdfUrl: null,
            pdfGeneratedAt: null,
            revisionNumber: (originalQuote.revisionNumber || 1) + 1,
            previousVersionId: originalQuote._id,
            createdBy: req.userID
        };

        const revision = new Quote(revisionData);
        await revision.save();

        return res.status(201).json({
            error: false,
            message: 'Quote revision created successfully',
            data: revision
        });
    } catch ({ message, status = 500 }) {
        logger.error('Error revising quote:', message);
        return res.status(status).json({ error: true, message });
    }
};
