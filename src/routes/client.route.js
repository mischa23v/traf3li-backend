const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const { auditAction } = require('../middlewares/auditLog.middleware');
const { cacheResponse, invalidateCache } = require('../middlewares/cache.middleware');
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
    getWathqData
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
    firmFilter,
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
    firmFilter,
    cacheResponse(CLIENT_CACHE_TTL, (req) => `client:firm:${req.firmId || 'none'}:list:url:${req.originalUrl}`),
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
    firmFilter,
    validateSearchClients,
    cacheResponse(CLIENT_CACHE_TTL, (req) => `client:firm:${req.firmId || 'none'}:search:url:${req.originalUrl}`),
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
    firmFilter,
    cacheResponse(CLIENT_CACHE_TTL, (req) => `client:firm:${req.firmId || 'none'}:stats`),
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
    firmFilter,
    cacheResponse(CLIENT_CACHE_TTL, (req) => `client:firm:${req.firmId || 'none'}:top-revenue`),
    getTopClientsByRevenue
);

// ─────────────────────────────────────────────────────────
// SINGLE CLIENT
// ─────────────────────────────────────────────────────────

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
    firmFilter,
    validateIdParam,
    cacheResponse(CLIENT_CACHE_TTL, (req) => `client:firm:${req.firmId || 'none'}:${req.params.id}:details`),
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
    firmFilter,
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
    firmFilter,
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
    firmFilter,
    validateIdParam,
    cacheResponse(CLIENT_CACHE_TTL, (req) => `client:firm:${req.firmId || 'none'}:${req.params.id}:billing-info`),
    getBillingInfo
);

app.get('/:id/cases',
    userMiddleware,
    firmFilter,
    validateIdParam,
    cacheResponse(CLIENT_CACHE_TTL, (req) => `client:firm:${req.firmId || 'none'}:${req.params.id}:cases`),
    getClientCases
);

app.get('/:id/invoices',
    userMiddleware,
    firmFilter,
    validateIdParam,
    cacheResponse(CLIENT_CACHE_TTL, (req) => `client:firm:${req.firmId || 'none'}:${req.params.id}:invoices`),
    getClientInvoices
);

app.get('/:id/payments',
    userMiddleware,
    firmFilter,
    validateIdParam,
    cacheResponse(CLIENT_CACHE_TTL, (req) => `client:firm:${req.firmId || 'none'}:${req.params.id}:payments`),
    getClientPayments
);

// ─────────────────────────────────────────────────────────
// VERIFICATION (Saudi Government Portals)
// ─────────────────────────────────────────────────────────
app.post('/:id/verify/wathq',
    userMiddleware,
    firmFilter,
    validateIdParam,
    validateVerifyWathq,
    invalidateCache(['client:firm:{firmId}:{id}:*']),
    verifyWathq
);

app.get('/:id/wathq/:dataType',
    userMiddleware,
    firmFilter,
    validateIdParam,
    cacheResponse(CLIENT_CACHE_TTL, (req) => `client:firm:${req.firmId || 'none'}:${req.params.id}:wathq:${req.params.dataType}`),
    getWathqData
);

// ─────────────────────────────────────────────────────────
// ATTACHMENTS
// ─────────────────────────────────────────────────────────
app.post('/:id/attachments',
    userMiddleware,
    firmFilter,
    validateIdParam,
    upload.array('files', 10),
    invalidateCache(['client:firm:{firmId}:{id}:*']),
    uploadAttachments
);

app.delete('/:id/attachments/:attachmentId',
    userMiddleware,
    firmFilter,
    validateIdParam,
    invalidateCache(['client:firm:{firmId}:{id}:*']),
    deleteAttachment
);

// ─────────────────────────────────────────────────────────
// CONFLICT CHECK
// ─────────────────────────────────────────────────────────
app.post('/:id/conflict-check',
    userMiddleware,
    firmFilter,
    validateIdParam,
    validateConflictCheck,
    runConflictCheck
);

// ─────────────────────────────────────────────────────────
// STATUS & FLAGS
// ─────────────────────────────────────────────────────────
app.patch('/:id/status',
    userMiddleware,
    firmFilter,
    validateIdParam,
    validateUpdateStatus,
    invalidateCache(specificClientInvalidationPatterns),
    updateStatus
);

app.patch('/:id/flags',
    userMiddleware,
    firmFilter,
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
    firmFilter,
    validateBulkDelete,
    invalidateCache(clientInvalidationPatterns),
    bulkDeleteClients
);

module.exports = app;
