const express = require('express');
const { userMiddleware } = require('../middlewares');
const { auditAction } = require('../middlewares/auditLog.middleware');
const { cacheResponse, invalidateCache } = require('../middlewares/cache.middleware');
const { sanitizeObjectId } = require('../utils/securityUtils');
const upload = require('../configs/multer');
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

/**
 * @openapi
 * /api/clients:
 *   post:
 *     summary: Create a new client
 *     description: Creates a new client record in the system
 *     tags:
 *       - Clients
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateClientRequest'
 *     responses:
 *       201:
 *         description: Client created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClientResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
app.post('/',
    userMiddleware,
    validateCreateClient,
    auditAction('create', 'client'),
    invalidateCache(clientInvalidationPatterns),
    createClient
);

/**
 * @openapi
 * /api/clients:
 *   get:
 *     summary: Get all clients
 *     description: Retrieves a paginated list of clients with optional filtering
 *     tags:
 *       - Clients
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/pageParam'
 *       - $ref: '#/components/parameters/limitParam'
 *       - $ref: '#/components/parameters/sortParam'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, suspended, blacklisted]
 *         description: Filter by client status
 *       - in: query
 *         name: clientType
 *         schema:
 *           type: string
 *           enum: [individual, company, government]
 *         description: Filter by client type
 *     responses:
 *       200:
 *         description: Clients retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClientListResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
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

/**
 * @openapi
 * /api/clients/search:
 *   get:
 *     summary: Search clients
 *     description: Search clients by name, email, phone, or other fields
 *     tags:
 *       - Clients
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/searchParam'
 *       - $ref: '#/components/parameters/limitParam'
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClientListResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.get('/search',
    userMiddleware,
    validateSearchClients,
    cacheResponse(CLIENT_CACHE_TTL, (req) => {
        const sanitizedFirmId = sanitizeObjectId(req.firmId) || 'none';
        return `client:firm:${sanitizedFirmId}:search:url:${req.originalUrl}`;
    }),
    searchClients
);

/**
 * @openapi
 * /api/clients/stats:
 *   get:
 *     summary: Get client statistics
 *     description: Returns aggregated statistics about clients
 *     tags:
 *       - Clients
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClientStats'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.get('/stats',
    userMiddleware,
    cacheResponse(CLIENT_CACHE_TTL, (req) => {
        const sanitizedFirmId = sanitizeObjectId(req.firmId) || 'none';
        return `client:firm:${sanitizedFirmId}:stats`;
    }),
    getClientStats
);

/**
 * @openapi
 * /api/clients/top-revenue:
 *   get:
 *     summary: Get top clients by revenue
 *     description: Returns the top clients sorted by revenue generated
 *     tags:
 *       - Clients
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of top clients to return
 *     responses:
 *       200:
 *         description: Top clients retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClientListResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
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

/**
 * @openapi
 * /api/clients/{id}:
 *   get:
 *     summary: Get client by ID
 *     description: Retrieves detailed information about a specific client
 *     tags:
 *       - Clients
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/idParam'
 *     responses:
 *       200:
 *         description: Client retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClientResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
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

/**
 * @openapi
 * /api/clients/{id}:
 *   put:
 *     summary: Update client
 *     description: Updates an existing client's information
 *     tags:
 *       - Clients
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/idParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateClientRequest'
 *     responses:
 *       200:
 *         description: Client updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClientResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
app.put('/:id',
    userMiddleware,
    validateIdParam,
    validateUpdateClient,
    auditAction('update', 'client', { captureChanges: true }),
    invalidateCache(specificClientInvalidationPatterns),
    updateClient
);

/**
 * @openapi
 * /api/clients/{id}:
 *   delete:
 *     summary: Delete client
 *     description: Deletes a client from the system
 *     tags:
 *       - Clients
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/idParam'
 *     responses:
 *       200:
 *         description: Client deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Client deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
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

            // SECURITY: Build query with firmId for multi-tenant isolation
            const firmId = req.firmId;
            const lawyerId = req.userID;
            const clientQuery = { _id: sanitizedId };
            if (firmId) {
                clientQuery.firmId = firmId;
            } else {
                clientQuery.lawyerId = lawyerId;
            }

            const client = await Client.findOne(clientQuery);

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

            // SECURITY: Build query with firmId for multi-tenant isolation
            const firmId = req.firmId;
            const lawyerId = req.userID;
            const clientQuery = { _id: sanitizedId };
            if (firmId) {
                clientQuery.firmId = firmId;
            } else {
                clientQuery.lawyerId = lawyerId;
            }

            const client = await Client.findOne(clientQuery);

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
app.post('/:id/attachments',
    userMiddleware,
    validateIdParam,
    upload.array('files', 10),
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
