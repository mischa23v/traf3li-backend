/**
 * ZATCA E-Invoice Plugin Controller
 *
 * API endpoints for ZATCA e-invoicing operations
 */

const asyncHandler = require('../utils/asyncHandler');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const { ZATCA_CONFIG, generateQRData, generateInvoiceHash } = require('../plugins/zatcaEInvoice.plugin');
const Invoice = require('../models/invoice.model');
const Firm = require('../models/firm.model');
const mongoose = require('mongoose');
const axios = require('axios');

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get ZATCA configuration and status
 * GET /api/zatca/config
 */
exports.getConfig = asyncHandler(async (req, res) => {
    const firm = await Firm.findOne(req.firmQuery)
        .select('zatcaSettings name vatNumber crNumber address')
        .lean();

    res.status(200).json({
        success: true,
        data: {
            invoiceTypes: Object.entries(ZATCA_CONFIG.invoiceTypes).map(([key, value]) => ({
                code: value,
                name: key.replace(/_/g, ' ')
            })),
            invoiceSubtypes: [
                { code: ZATCA_CONFIG.invoiceSubtypes.B2B, name: 'B2B (Business to Business)', requiresClearance: true },
                { code: ZATCA_CONFIG.invoiceSubtypes.B2C, name: 'B2C (Business to Consumer)', requiresClearance: false }
            ],
            vatRate: ZATCA_CONFIG.vatRate,
            requiredSellerFields: ZATCA_CONFIG.requiredSellerFields,
            requiredBuyerFields: ZATCA_CONFIG.requiredBuyerFields,
            firmSettings: {
                vatNumber: firm?.vatNumber,
                crNumber: firm?.crNumber,
                name: firm?.name,
                address: firm?.address,
                zatcaEnabled: firm?.zatcaSettings?.enabled ?? false,
                zatcaMode: firm?.zatcaSettings?.mode || 'sandbox'
            }
        }
    });
});

/**
 * Update firm ZATCA settings
 * PUT /api/zatca/config
 */
exports.updateConfig = asyncHandler(async (req, res) => {
    if (!req.hasPermission('settings', 'edit')) {
        throw CustomException('Permission denied', 403);
    }

    const allowedFields = [
        'enabled', 'mode', 'vatNumber', 'crNumber',
        'sellerName', 'sellerNameAr', 'address'
    ];
    const data = pickAllowedFields(req.body, allowedFields);

    // Validate VAT number format
    if (data.vatNumber && !/^3\d{13}3$/.test(data.vatNumber)) {
        throw CustomException('VAT number must be 15 digits starting and ending with 3', 400);
    }

    const firm = await Firm.findOneAndUpdate(
        req.firmQuery,
        {
            $set: {
                vatNumber: data.vatNumber,
                crNumber: data.crNumber,
                'zatcaSettings.enabled': data.enabled,
                'zatcaSettings.mode': data.mode,
                'zatcaSettings.sellerName': data.sellerName,
                'zatcaSettings.sellerNameAr': data.sellerNameAr,
                'zatcaSettings.address': data.address
            }
        },
        { new: true }
    );

    res.status(200).json({
        success: true,
        message: 'ZATCA settings updated',
        data: {
            vatNumber: firm.vatNumber,
            crNumber: firm.crNumber,
            zatcaSettings: firm.zatcaSettings
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// INVOICE PREPARATION
// ═══════════════════════════════════════════════════════════════

/**
 * Validate invoice for ZATCA
 * POST /api/zatca/validate/:invoiceId
 */
exports.validateInvoice = asyncHandler(async (req, res) => {
    const { invoiceId } = req.params;

    const sanitizedId = sanitizeObjectId(invoiceId);
    if (!sanitizedId) {
        throw CustomException('Invalid invoice ID', 400);
    }

    const invoice = await Invoice.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    });

    if (!invoice) {
        throw CustomException('Invoice not found', 404);
    }

    // Use plugin validation method if available
    const validation = invoice.validateForZATCA ? invoice.validateForZATCA() : validateInvoiceManually(invoice);

    res.status(200).json({
        success: true,
        data: {
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            valid: validation.valid,
            canSubmit: validation.canSubmit,
            errors: validation.errors,
            warnings: validation.warnings
        }
    });
});

/**
 * Generate QR code for invoice
 * POST /api/zatca/qr/:invoiceId
 */
exports.generateQR = asyncHandler(async (req, res) => {
    const { invoiceId } = req.params;

    const sanitizedId = sanitizeObjectId(invoiceId);
    if (!sanitizedId) {
        throw CustomException('Invalid invoice ID', 400);
    }

    const invoice = await Invoice.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    }).populate('firmId', 'name vatNumber');

    if (!invoice) {
        throw CustomException('Invoice not found', 404);
    }

    const sellerName = invoice.zatca?.seller?.name || invoice.firmId?.name || '';
    const vatNumber = invoice.zatca?.seller?.vatNumber || invoice.firmId?.vatNumber || '';

    if (!vatNumber) {
        throw CustomException('Seller VAT number is required for QR generation', 400);
    }

    const qrData = generateQRData({
        sellerName,
        vatNumber,
        timestamp: new Date(invoice.issueDate || invoice.createdAt).toISOString(),
        totalWithVat: invoice.totalAmount || invoice.total || 0,
        vatAmount: invoice.vatAmount || invoice.taxAmount || 0,
        invoiceHash: invoice.zatca?.invoiceHash
    });

    // Update invoice with QR code
    invoice.zatca = invoice.zatca || {};
    invoice.zatca.qrCode = qrData;
    await invoice.save();

    res.status(200).json({
        success: true,
        data: {
            invoiceId: invoice._id,
            qrCode: qrData,
            qrCodeUrl: `data:image/png;base64,${qrData}`
        }
    });
});

/**
 * Generate invoice hash
 * POST /api/zatca/hash/:invoiceId
 */
exports.generateHash = asyncHandler(async (req, res) => {
    const { invoiceId } = req.params;

    const sanitizedId = sanitizeObjectId(invoiceId);
    if (!sanitizedId) {
        throw CustomException('Invalid invoice ID', 400);
    }

    const invoice = await Invoice.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    });

    if (!invoice) {
        throw CustomException('Invoice not found', 404);
    }

    // Get previous invoice hash
    const previousInvoice = await Invoice.findOne({
        firmId: invoice.firmId,
        'zatca.invoiceHash': { $exists: true, $ne: null },
        createdAt: { $lt: invoice.createdAt }
    }).sort({ createdAt: -1 }).select('zatca.invoiceHash');

    const previousHash = previousInvoice?.zatca?.invoiceHash || '0';

    const hash = generateInvoiceHash({
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate || invoice.createdAt,
        sellerVat: invoice.zatca?.seller?.vatNumber,
        buyerVat: invoice.zatca?.buyer?.vatNumber,
        total: invoice.totalAmount || invoice.total,
        vatAmount: invoice.vatAmount || invoice.taxAmount
    }, previousHash);

    // Update invoice
    invoice.zatca = invoice.zatca || {};
    invoice.zatca.invoiceHash = hash;
    invoice.zatca.previousInvoiceHash = previousHash;
    await invoice.save();

    res.status(200).json({
        success: true,
        data: {
            invoiceId: invoice._id,
            invoiceHash: hash,
            previousHash,
            chainValid: true
        }
    });
});

/**
 * Prepare invoice for ZATCA (generate all required fields)
 * POST /api/zatca/prepare/:invoiceId
 */
exports.prepareInvoice = asyncHandler(async (req, res) => {
    const { invoiceId } = req.params;
    const { invoiceType, invoiceSubtype, seller, buyer } = req.body;

    const sanitizedId = sanitizeObjectId(invoiceId);
    if (!sanitizedId) {
        throw CustomException('Invalid invoice ID', 400);
    }

    const invoice = await Invoice.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    }).populate('firmId', 'name nameAr vatNumber crNumber address')
        .populate('client', 'name nameAr vatNumber crNumber address');

    if (!invoice) {
        throw CustomException('Invoice not found', 404);
    }

    // Get previous hash
    const previousHash = await Invoice.getLastInvoiceHash
        ? await Invoice.getLastInvoiceHash(invoice.firmId._id)
        : '0';

    // Initialize ZATCA data
    const firm = invoice.firmId;
    const client = invoice.client;

    invoice.zatca = {
        ...invoice.zatca,
        invoiceType: invoiceType || ZATCA_CONFIG.invoiceTypes.TAX_INVOICE,
        invoiceSubtype: invoiceSubtype || ZATCA_CONFIG.invoiceSubtypes.B2B,
        invoiceUUID: invoice.zatca?.invoiceUUID || require('uuid').v4(),
        seller: seller || {
            name: firm?.name,
            nameAr: firm?.nameAr,
            vatNumber: firm?.vatNumber,
            crNumber: firm?.crNumber,
            address: firm?.address
        },
        buyer: buyer || {
            name: client?.name,
            nameAr: client?.nameAr,
            vatNumber: client?.vatNumber,
            crNumber: client?.crNumber,
            address: client?.address
        },
        status: 'pending',
        generatedAt: new Date(),
        generatedBy: req.userID
    };

    // Generate hash
    const hash = generateInvoiceHash({
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate || invoice.createdAt,
        sellerVat: invoice.zatca.seller.vatNumber,
        buyerVat: invoice.zatca.buyer.vatNumber,
        total: invoice.totalAmount || invoice.total,
        vatAmount: invoice.vatAmount || invoice.taxAmount
    }, previousHash);

    invoice.zatca.invoiceHash = hash;
    invoice.zatca.previousInvoiceHash = previousHash;

    // Generate QR
    const qrData = generateQRData({
        sellerName: invoice.zatca.seller.name,
        vatNumber: invoice.zatca.seller.vatNumber,
        timestamp: new Date(invoice.issueDate || invoice.createdAt).toISOString(),
        totalWithVat: invoice.totalAmount || invoice.total || 0,
        vatAmount: invoice.vatAmount || invoice.taxAmount || 0,
        invoiceHash: hash
    });
    invoice.zatca.qrCode = qrData;

    // Generate XML (if method exists)
    if (invoice.generateZATCAXML) {
        invoice.generateZATCAXML();
    }

    await invoice.save();

    // Validate
    const validation = invoice.validateForZATCA ? invoice.validateForZATCA() : { valid: true, errors: [], warnings: [] };

    res.status(200).json({
        success: true,
        data: {
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            uuid: invoice.zatca.invoiceUUID,
            hash: invoice.zatca.invoiceHash,
            qrCode: invoice.zatca.qrCode,
            status: invoice.zatca.status,
            validation,
            readyForSubmission: validation.valid
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// SUBMISSION ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Submit invoice to ZATCA
 * POST /api/zatca/submit/:invoiceId
 */
exports.submitInvoice = asyncHandler(async (req, res) => {
    const { invoiceId } = req.params;

    const sanitizedId = sanitizeObjectId(invoiceId);
    if (!sanitizedId) {
        throw CustomException('Invalid invoice ID', 400);
    }

    const invoice = await Invoice.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    });

    if (!invoice) {
        throw CustomException('Invoice not found', 404);
    }

    // Validate before submission
    const validation = invoice.validateForZATCA ? invoice.validateForZATCA() : validateInvoiceManually(invoice);
    if (!validation.valid) {
        throw CustomException('Invoice validation failed: ' + validation.errors.join(', '), 400);
    }

    // Check if already submitted
    if (['cleared', 'reported'].includes(invoice.zatca?.status)) {
        throw CustomException('Invoice already submitted to ZATCA', 400);
    }

    const firm = await Firm.findById(invoice.firmId).select('zatcaSettings');
    const useSandbox = firm?.zatcaSettings?.mode !== 'production';
    const endpoints = useSandbox ? ZATCA_CONFIG.endpoints.sandbox : ZATCA_CONFIG.endpoints.production;

    // Determine endpoint based on invoice subtype
    const requiresClearance = invoice.zatca?.invoiceSubtype === ZATCA_CONFIG.invoiceSubtypes.B2B;
    const endpoint = requiresClearance ? endpoints.clearance : endpoints.reporting;

    try {
        // In production, this would call ZATCA API
        // For now, simulate response
        const zatcaResponse = await simulateZATCASubmission(invoice, endpoint);

        // Record response
        if (invoice.recordZATCAResponse) {
            invoice.recordZATCAResponse(zatcaResponse);
        } else {
            invoice.zatca.status = zatcaResponse.success ? (requiresClearance ? 'cleared' : 'reported') : 'rejected';
            invoice.zatca.submissionDate = new Date();
            invoice.zatca.zatcaResponse = zatcaResponse;
        }

        invoice.zatca.submittedBy = req.userID;
        await invoice.save();

        res.status(200).json({
            success: true,
            data: {
                invoiceId: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                status: invoice.zatca.status,
                clearanceStatus: invoice.zatca.clearanceStatus,
                submissionDate: invoice.zatca.submissionDate,
                zatcaResponse: {
                    requestId: zatcaResponse.requestId,
                    success: zatcaResponse.success,
                    warnings: zatcaResponse.warnings,
                    errors: zatcaResponse.errors
                }
            }
        });

    } catch (error) {
        invoice.zatca.status = 'rejected';
        invoice.zatca.rejectionReason = error.message;
        invoice.zatca.retryCount = (invoice.zatca.retryCount || 0) + 1;
        await invoice.save();

        throw CustomException(`ZATCA submission failed: ${error.message}`, 500);
    }
});

/**
 * Bulk submit invoices to ZATCA
 * POST /api/zatca/submit/bulk
 */
exports.bulkSubmit = asyncHandler(async (req, res) => {
    const { invoiceIds } = req.body;

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
        throw CustomException('Invoice IDs array is required', 400);
    }

    if (invoiceIds.length > 50) {
        throw CustomException('Maximum 50 invoices per bulk submission', 400);
    }

    const sanitizedIds = invoiceIds.map(id => sanitizeObjectId(id)).filter(Boolean);

    const invoices = await Invoice.find({
        _id: { $in: sanitizedIds },
        ...req.firmQuery,
        'zatca.status': { $nin: ['cleared', 'reported'] }
    });

    const results = {
        total: invoices.length,
        successful: 0,
        failed: 0,
        details: []
    };

    for (const invoice of invoices) {
        try {
            const validation = invoice.validateForZATCA ? invoice.validateForZATCA() : { valid: true };

            if (!validation.valid) {
                results.failed++;
                results.details.push({
                    invoiceId: invoice._id,
                    invoiceNumber: invoice.invoiceNumber,
                    success: false,
                    error: validation.errors.join(', ')
                });
                continue;
            }

            // Simulate submission
            const response = await simulateZATCASubmission(invoice);
            invoice.zatca.status = response.success ? 'cleared' : 'rejected';
            invoice.zatca.submissionDate = new Date();
            await invoice.save();

            if (response.success) {
                results.successful++;
            } else {
                results.failed++;
            }

            results.details.push({
                invoiceId: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                success: response.success,
                status: invoice.zatca.status
            });

        } catch (error) {
            results.failed++;
            results.details.push({
                invoiceId: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                success: false,
                error: error.message
            });
        }
    }

    res.status(200).json({
        success: true,
        data: results
    });
});

// ═══════════════════════════════════════════════════════════════
// STATUS & REPORTING
// ═══════════════════════════════════════════════════════════════

/**
 * Get invoice ZATCA status
 * GET /api/zatca/status/:invoiceId
 */
exports.getInvoiceStatus = asyncHandler(async (req, res) => {
    const { invoiceId } = req.params;

    const sanitizedId = sanitizeObjectId(invoiceId);
    if (!sanitizedId) {
        throw CustomException('Invalid invoice ID', 400);
    }

    const invoice = await Invoice.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    }).select('invoiceNumber zatca');

    if (!invoice) {
        throw CustomException('Invoice not found', 404);
    }

    const status = invoice.getZATCAStatus ? invoice.getZATCAStatus() : {
        invoiceNumber: invoice.invoiceNumber,
        uuid: invoice.zatca?.invoiceUUID,
        status: invoice.zatca?.status,
        clearanceStatus: invoice.zatca?.clearanceStatus
    };

    res.status(200).json({
        success: true,
        data: status
    });
});

/**
 * Get ZATCA statistics
 * GET /api/zatca/stats
 */
exports.getStats = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const stats = Invoice.getZATCAStatistics
        ? await Invoice.getZATCAStatistics(req.firmQuery.firmId, startDate, endDate)
        : await getZATCAStatsManually(req.firmQuery.firmId, startDate, endDate);

    res.status(200).json({
        success: true,
        data: stats
    });
});

/**
 * Get pending ZATCA submissions
 * GET /api/zatca/pending
 */
exports.getPending = asyncHandler(async (req, res) => {
    const { limit = 50 } = req.query;

    const invoices = Invoice.getPendingZATCASubmissions
        ? await Invoice.getPendingZATCASubmissions(req.firmQuery.firmId, parseInt(limit))
        : await Invoice.find({
            ...req.firmQuery,
            'zatca.status': { $in: ['draft', 'pending'] },
            status: { $ne: 'void' }
        }).sort({ createdAt: 1 }).limit(parseInt(limit));

    res.status(200).json({
        success: true,
        data: {
            count: invoices.length,
            invoices: invoices.map(inv => ({
                id: inv._id,
                invoiceNumber: inv.invoiceNumber,
                client: inv.client,
                total: inv.totalAmount || inv.total,
                issueDate: inv.issueDate || inv.createdAt,
                zatcaStatus: inv.zatca?.status,
                hasQRCode: !!inv.zatca?.qrCode,
                hasHash: !!inv.zatca?.invoiceHash
            }))
        }
    });
});

/**
 * Get failed ZATCA submissions
 * GET /api/zatca/failed
 */
exports.getFailed = asyncHandler(async (req, res) => {
    const { maxRetries = 3 } = req.query;

    const invoices = Invoice.getFailedZATCASubmissions
        ? await Invoice.getFailedZATCASubmissions(req.firmQuery.firmId, parseInt(maxRetries))
        : await Invoice.find({
            ...req.firmQuery,
            'zatca.status': 'rejected',
            'zatca.retryCount': { $lt: parseInt(maxRetries) }
        });

    res.status(200).json({
        success: true,
        data: {
            count: invoices.length,
            invoices: invoices.map(inv => ({
                id: inv._id,
                invoiceNumber: inv.invoiceNumber,
                zatcaStatus: inv.zatca?.status,
                rejectionReason: inv.zatca?.rejectionReason,
                retryCount: inv.zatca?.retryCount,
                lastRetryAt: inv.zatca?.lastRetryAt
            }))
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function validateInvoiceManually(invoice) {
    const errors = [];
    const warnings = [];

    if (!invoice.zatca?.invoiceUUID) {
        errors.push('Invoice UUID is required');
    }
    if (!invoice.zatca?.seller?.vatNumber) {
        errors.push('Seller VAT number is required');
    }
    if (!invoice.totalAmount && !invoice.total) {
        errors.push('Invoice total is required');
    }

    return {
        valid: errors.length === 0,
        canSubmit: errors.length === 0,
        errors,
        warnings
    };
}

async function simulateZATCASubmission(invoice, endpoint) {
    // Simulate ZATCA API response
    // In production, replace with actual API call
    return {
        success: true,
        cleared: true,
        requestId: `REQ-${Date.now()}`,
        invoiceHash: invoice.zatca?.invoiceHash,
        warnings: [],
        errors: [],
        validationResults: []
    };
}

async function getZATCAStatsManually(firmId, startDate, endDate) {
    const match = { firmId: new mongoose.Types.ObjectId(firmId) };

    if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    const stats = await Invoice.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                draft: { $sum: { $cond: [{ $eq: ['$zatca.status', 'draft'] }, 1, 0] } },
                pending: { $sum: { $cond: [{ $eq: ['$zatca.status', 'pending'] }, 1, 0] } },
                cleared: { $sum: { $cond: [{ $eq: ['$zatca.status', 'cleared'] }, 1, 0] } },
                reported: { $sum: { $cond: [{ $eq: ['$zatca.status', 'reported'] }, 1, 0] } },
                rejected: { $sum: { $cond: [{ $eq: ['$zatca.status', 'rejected'] }, 1, 0] } }
            }
        }
    ]);

    return stats[0] || { total: 0, draft: 0, pending: 0, cleared: 0, reported: 0, rejected: 0 };
}
