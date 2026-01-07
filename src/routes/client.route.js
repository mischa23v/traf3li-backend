const express = require('express');
const { userMiddleware } = require('../middlewares');
const { auditAction } = require('../middlewares/auditLog.middleware');
const { cacheResponse, invalidateCache } = require('../middlewares/cache.middleware');
const { sanitizeObjectId } = require('../utils/securityUtils');
const upload = require('../configs/multer');
const malwareScanMiddleware = require('../middlewares/malwareScan.middleware');
const {
    validateCreateClient,
    validateUpdateClient,
    validateUpdateBalance,
    validateUpdateStatus,
    validateUpdateFlags,
    validateSearchClients,
    validateConflictCheck,
    validateVerifyWathq,
    validateBulkDelete,
    validateIdParam
} = require('../validators/client.validator');
const {
    createClient,
    getClients,
    getClient,
    getBillingInfo,
    getClientCases,
    getClientInvoices,
    getClientPayments,
    updateClient,
    deleteClient,
    searchClients,
    getClientStats,
    getTopClientsByRevenue,
    bulkDeleteClients,
    runConflictCheck,
    updateStatus,
    updateFlags,
    uploadAttachments,
    deleteAttachment,
    verifyWathq,
    getWathqData,
    getClientFull
} = require('../controllers/client.controller');

const app = express.Router();

// Cache TTL: 300 seconds (5 minutes) for client endpoints
const CLIENT_CACHE_TTL = 300;

// Cache invalidation patterns for client mutations
const clientInvalidationPatterns = [
    'client:firm:{firmId}:*',       // All client caches for the firm
    'dashboard:firm:{firmId}:*'     // Dashboard caches (client counts, stats)
];

// Cache invalidation patterns for specific client
const specificClientInvalidationPatterns = [
    'client:firm:{firmId}:{id}:*',  // Specific client caches
    'client:firm:{firmId}:list:*',  // Client list caches
    'dashboard:firm:{firmId}:*'     // Dashboard caches
];

// ─────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────

app.post('/',
    userMiddleware,
    validateCreateClient,
    auditAction('create', 'client'),
    invalidateCache(clientInvalidationPatterns),
    createClient
);

app.get('/',
    userMiddleware,
    cacheResponse(CLIENT_CACHE_TTL, (req) => {
        const sanitizedFirmId = sanitizeObjectId(req.firmId) || 'none';
        return `client:firm:${sanitizedFirmId}:list:url:${req.originalUrl}`;
    }),
    getClients
);

// ─────────────────────────────────────────────────────────
// SPECIAL QUERIES
// ─────────────────────────────────────────────────────────

app.get('/search',
    userMiddleware,
    validateSearchClients,
    cacheResponse(CLIENT_CACHE_TTL, (req) => {
        const sanitizedFirmId = sanitizeObjectId(req.firmId) || 'none';
        return `client:firm:${sanitizedFirmId}:search:url:${req.originalUrl}`;
    }),
    searchClients
);

app.get('/stats',
    userMiddleware,
    cacheResponse(CLIENT_CACHE_TTL, (req) => {
        const sanitizedFirmId = sanitizeObjectId(req.firmId) || 'none';
        return `client:firm:${sanitizedFirmId}:stats`;
    }),
    getClientStats
);

app.get('/top-revenue',
    userMiddleware,
    cacheResponse(CLIENT_CACHE_TTL, (req) => {
        const sanitizedFirmId = sanitizeObjectId(req.firmId) || 'none';
        return `client:firm:${sanitizedFirmId}:top-revenue`;
    }),
    getTopClientsByRevenue
);

// ─────────────────────────────────────────────────────────
// SINGLE CLIENT
// ─────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH ENDPOINT: Client Full Details - Replaces 3 separate API calls
// Returns: client details, cases, invoices, payments with summary stats
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/:id/full',
    userMiddleware,
    validateIdParam,
    cacheResponse(CLIENT_CACHE_TTL, (req) => {
        const sanitizedFirmId = sanitizeObjectId(req.firmId) || 'none';
        const sanitizedId = sanitizeObjectId(req.params.id);
        return `client:firm:${sanitizedFirmId}:${sanitizedId}:full`;
    }),
    getClientFull
);

app.get('/:id',
    userMiddleware,
    validateIdParam,
    cacheResponse(CLIENT_CACHE_TTL, (req) => {
        const sanitizedFirmId = sanitizeObjectId(req.firmId) || 'none';
        const sanitizedId = sanitizeObjectId(req.params.id);
        return `client:firm:${sanitizedFirmId}:${sanitizedId}:details`;
    }),
    getClient
);

app.put('/:id',
    userMiddleware,
    validateIdParam,
    validateUpdateClient,
    auditAction('update', 'client', { captureChanges: true }),
    invalidateCache(specificClientInvalidationPatterns),
    updateClient
);

app.delete('/:id',
    userMiddleware,
    validateIdParam,
    auditAction('delete', 'client', { severity: 'high' }),
    invalidateCache(specificClientInvalidationPatterns),
    deleteClient
);

// ─────────────────────────────────────────────────────────
// BILLING & FINANCE LINKED DATA
// ─────────────────────────────────────────────────────────
app.get('/:id/billing-info',
    userMiddleware,
    validateIdParam,
    cacheResponse(CLIENT_CACHE_TTL, (req) => {
        const sanitizedFirmId = sanitizeObjectId(req.firmId) || 'none';
        const sanitizedId = sanitizeObjectId(req.params.id);
        return `client:firm:${sanitizedFirmId}:${sanitizedId}:billing-info`;
    }),
    getBillingInfo
);

app.get('/:id/cases',
    userMiddleware,
    validateIdParam,
    cacheResponse(CLIENT_CACHE_TTL, (req) => {
        const sanitizedFirmId = sanitizeObjectId(req.firmId) || 'none';
        const sanitizedId = sanitizeObjectId(req.params.id);
        return `client:firm:${sanitizedFirmId}:${sanitizedId}:cases`;
    }),
    getClientCases
);

app.get('/:id/invoices',
    userMiddleware,
    validateIdParam,
    cacheResponse(CLIENT_CACHE_TTL, (req) => {
        const sanitizedFirmId = sanitizeObjectId(req.firmId) || 'none';
        const sanitizedId = sanitizeObjectId(req.params.id);
        return `client:firm:${sanitizedFirmId}:${sanitizedId}:invoices`;
    }),
    getClientInvoices
);

app.get('/:id/payments',
    userMiddleware,
    validateIdParam,
    cacheResponse(CLIENT_CACHE_TTL, (req) => {
        const sanitizedFirmId = sanitizeObjectId(req.firmId) || 'none';
        const sanitizedId = sanitizeObjectId(req.params.id);
        return `client:firm:${sanitizedFirmId}:${sanitizedId}:payments`;
    }),
    getClientPayments
);

// ─────────────────────────────────────────────────────────
// VERIFICATION (Saudi Government Portals - Najiz Integration)
// ─────────────────────────────────────────────────────────

// Wathq - Commercial Registration Verification
app.post('/:id/verify/wathq',
    userMiddleware,
    validateIdParam,
    validateVerifyWathq,
    invalidateCache(['client:firm:{firmId}:{id}:*']),
    verifyWathq
);

app.get('/:id/wathq/:dataType',
    userMiddleware,
    validateIdParam,
    cacheResponse(CLIENT_CACHE_TTL, (req) => {
        const sanitizedFirmId = sanitizeObjectId(req.firmId) || 'none';
        const sanitizedId = sanitizeObjectId(req.params.id);
        const sanitizedDataType = sanitizeObjectId(req.params.dataType) || req.params.dataType;
        return `client:firm:${sanitizedFirmId}:${sanitizedId}:wathq:${sanitizedDataType}`;
    }),
    getWathqData
);

// Absher - National ID / Iqama Verification (Najiz)
app.post('/:id/verify/absher',
    userMiddleware,
    validateIdParam,
    invalidateCache(['client:firm:{firmId}:{id}:*']),
    async (req, res) => {
        try {
            const sanitizedId = sanitizeObjectId(req.params.id);
            if (!sanitizedId) {
                return res.status(400).json({ success: false, message: 'Invalid client ID' });
            }

            const Client = require('../models/client.model');

            // SECURITY FIX: Use req.firmQuery for proper tenant isolation
            // This supports both firm members (firmQuery = { firmId }) and solo lawyers (firmQuery = { lawyerId })
            const client = await Client.findOne({ _id: sanitizedId, ...req.firmQuery });

            if (!client) {
                return res.status(404).json({ success: false, message: 'Client not found or access denied' });
            }

            // TODO: Integrate with actual Absher API
            // For now, mark as manually verified
            client.isVerified = true;
            client.verificationSource = 'absher';
            client.verifiedAt = new Date();
            client.verificationData = {
                method: 'manual',
                verifiedBy: req.userID,
                nationalId: req.body.nationalId || client.nationalId,
                iqamaNumber: req.body.iqamaNumber || client.iqamaNumber
            };
            await client.save();

            res.json({
                success: true,
                message: 'Verification recorded',
                data: {
                    isVerified: client.isVerified,
                    verificationSource: client.verificationSource,
                    verifiedAt: client.verifiedAt
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
);

// Saudi Post - National Address Verification (Najiz)
app.post('/:id/verify/address',
    userMiddleware,
    validateIdParam,
    invalidateCache(['client:firm:{firmId}:{id}:*']),
    async (req, res) => {
        try {
            const sanitizedId = sanitizeObjectId(req.params.id);
            if (!sanitizedId) {
                return res.status(400).json({ success: false, message: 'Invalid client ID' });
            }

            const Client = require('../models/client.model');

            // SECURITY FIX: Use req.firmQuery for proper tenant isolation
            // This supports both firm members (firmQuery = { firmId }) and solo lawyers (firmQuery = { lawyerId })
            const client = await Client.findOne({ _id: sanitizedId, ...req.firmQuery });

            if (!client) {
                return res.status(404).json({ success: false, message: 'Client not found or access denied' });
            }

            // TODO: Integrate with actual Saudi Post API
            // For now, mark address as manually verified
            if (!client.nationalAddress) {
                client.nationalAddress = {};
            }

            // Update address with request data if provided
            if (req.body) {
                Object.assign(client.nationalAddress, req.body);
            }

            client.nationalAddress.isVerified = true;
            client.nationalAddress.verifiedAt = new Date();
            await client.save();

            res.json({
                success: true,
                message: 'Address verification recorded',
                data: {
                    nationalAddress: client.nationalAddress
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
);

// ─────────────────────────────────────────────────────────
// ATTACHMENTS
// ─────────────────────────────────────────────────────────
// Gold Standard: Malware scan before storing client attachments
app.post('/:id/attachments',
    userMiddleware,
    validateIdParam,
    upload.array('files', 10),
    malwareScanMiddleware,
    invalidateCache(['client:firm:{firmId}:{id}:*']),
    uploadAttachments
);

app.delete('/:id/attachments/:attachmentId',
    userMiddleware,
    validateIdParam,
    invalidateCache(['client:firm:{firmId}:{id}:*']),
    deleteAttachment
);

// ─────────────────────────────────────────────────────────
// CONFLICT CHECK
// ─────────────────────────────────────────────────────────
app.post('/:id/conflict-check',
    userMiddleware,
    validateIdParam,
    validateConflictCheck,
    runConflictCheck
);

// ─────────────────────────────────────────────────────────
// STATUS & FLAGS
// ─────────────────────────────────────────────────────────
app.patch('/:id/status',
    userMiddleware,
    validateIdParam,
    validateUpdateStatus,
    invalidateCache(specificClientInvalidationPatterns),
    updateStatus
);

app.patch('/:id/flags',
    userMiddleware,
    validateIdParam,
    validateUpdateFlags,
    invalidateCache(['client:firm:{firmId}:{id}:*']),
    updateFlags
);

// ─────────────────────────────────────────────────────────
// BULK OPERATIONS
// ─────────────────────────────────────────────────────────
app.delete('/bulk',
    userMiddleware,
    validateBulkDelete,
    invalidateCache(clientInvalidationPatterns),
    bulkDeleteClients
);

module.exports = app;
