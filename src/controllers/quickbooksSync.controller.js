/**
 * QuickBooks Sync Controller
 *
 * Handles QuickBooks Online integration including:
 * - OAuth authentication flow
 * - Two-way data synchronization
 * - Entity mapping management
 * - Sync status and error tracking
 * - Conflict resolution
 */

const asyncHandler = require('../utils/asyncHandler');
const { CustomException } = require('../utils');
const logger = require('../utils/logger');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const quickbooksService = require('../services/quickbooks.service');
const Joi = require('joi');

// ============================================
// VALIDATION SCHEMAS
// ============================================

const syncOptionsSchema = Joi.object({
    fullSync: Joi.boolean().default(false),
    syncDirection: Joi.string().valid('pull', 'push', 'bidirectional').default('bidirectional'),
    batchSize: Joi.number().integer().min(10).max(1000).default(100),
    overwriteExisting: Joi.boolean().default(false),
    syncFrom: Joi.date().iso().optional(),
    syncTo: Joi.date().iso().optional()
});

const mappingUpdateSchema = Joi.object({
    mappings: Joi.array().items(Joi.object({
        localEntityId: Joi.string().required(),
        quickbooksEntityId: Joi.string().required(),
        entityType: Joi.string().valid('account', 'customer', 'vendor', 'invoice', 'payment').required(),
        syncEnabled: Joi.boolean().default(true)
    })).min(1).required()
});

const conflictResolutionSchema = Joi.object({
    resolution: Joi.string().valid('use_local', 'use_quickbooks', 'merge', 'skip').required(),
    mergeStrategy: Joi.object({
        preferredSource: Joi.string().valid('local', 'quickbooks').optional(),
        fieldOverrides: Joi.object().optional()
    }).optional()
});

// ============================================
// OAUTH & CONNECTION MANAGEMENT
// ============================================

/**
 * Get QuickBooks OAuth authorization URL
 * @route GET /api/integrations/quickbooks/auth-url
 * @access Private (authenticated users)
 */
const getAuthUrl = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('You do not have permission to access integrations', 403);
    }

    // Get the return URL from query parameters (for redirect after auth)
    const returnUrl = req.query.returnUrl || '/settings/integrations';

    // Generate OAuth URL with CSRF protection
    const authUrl = await quickbooksService.getAuthorizationUrl(firmId, userId, returnUrl);

    return res.status(200).json({
        error: false,
        message: 'QuickBooks authorization URL generated successfully',
        messageAr: 'تم إنشاء رابط تفويض QuickBooks بنجاح',
        authUrl,
        expiresIn: 600 // URL expires in 10 minutes
    });
});

/**
 * Handle QuickBooks OAuth callback
 * @route GET /api/integrations/quickbooks/callback
 * @access Public (OAuth callback endpoint)
 */
const handleCallback = asyncHandler(async (req, res) => {
    const { code, state, realmId, error: oauthError, error_description } = req.query;

    // Check for OAuth errors
    if (oauthError) {
        logger.warn('QuickBooks OAuth authorization failed', {
            error: oauthError,
            description: error_description
        });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(
            `${frontendUrl}/settings/integrations?error=${encodeURIComponent(oauthError)}&description=${encodeURIComponent(error_description || 'QuickBooks authorization failed')}`
        );
    }

    // Validate required parameters
    if (!code || !state || !realmId) {
        logger.error('Missing QuickBooks OAuth callback parameters', {
            hasCode: !!code,
            hasState: !!state,
            hasRealmId: !!realmId
        });
        throw CustomException('Missing required OAuth parameters', 400);
    }

    // Get client IP and user agent for security logging
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Handle the OAuth callback
    const result = await quickbooksService.handleCallback(
        code,
        state,
        realmId,
        ipAddress,
        userAgent
    );

    // Redirect to frontend with success
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const returnUrl = result.returnUrl || '/settings/integrations';

    return res.redirect(
        `${frontendUrl}${returnUrl}?quickbooks=connected&companyName=${encodeURIComponent(result.companyName || 'QuickBooks')}`
    );
});

/**
 * Disconnect QuickBooks integration
 * @route POST /api/integrations/quickbooks/disconnect
 * @access Private
 */
const disconnect = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('You do not have permission to manage integrations', 403);
    }

    const { reason } = req.body;

    // Disconnect and revoke tokens
    await quickbooksService.disconnect(firmId, userId, reason);

    return res.status(200).json({
        error: false,
        message: 'QuickBooks integration disconnected successfully',
        messageAr: 'تم قطع اتصال QuickBooks بنجاح'
    });
});

/**
 * Get QuickBooks connection status
 * @route GET /api/integrations/quickbooks/status
 * @access Private
 */
const getConnectionStatus = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('You do not have permission to view integrations', 403);
    }

    const status = await quickbooksService.getConnectionStatus(firmId);

    return res.status(200).json({
        error: false,
        message: 'Connection status retrieved successfully',
        messageAr: 'تم استرجاع حالة الاتصال بنجاح',
        ...status
    });
});

// ============================================
// SYNC OPERATIONS
// ============================================

/**
 * Sync chart of accounts from QuickBooks
 * @route POST /api/integrations/quickbooks/sync/accounts
 * @access Private
 */
const syncAccounts = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('You do not have permission to sync data', 403);
    }

    // Validate sync options
    const { error, value: options } = syncOptionsSchema.validate(req.body);
    if (error) {
        throw CustomException(error.details[0].message, 400);
    }

    // Start sync operation
    const result = await quickbooksService.syncAccounts(firmId, userId, options);

    return res.status(200).json({
        error: false,
        message: 'Chart of accounts sync started successfully',
        messageAr: 'بدأت مزامنة دليل الحسابات بنجاح',
        ...result
    });
});

/**
 * Sync customers from QuickBooks
 * @route POST /api/integrations/quickbooks/sync/customers
 * @access Private
 */
const syncCustomers = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('You do not have permission to sync data', 403);
    }

    // Validate sync options
    const { error, value: options } = syncOptionsSchema.validate(req.body);
    if (error) {
        throw CustomException(error.details[0].message, 400);
    }

    // Start sync operation
    const result = await quickbooksService.syncCustomers(firmId, userId, options);

    return res.status(200).json({
        error: false,
        message: 'Customers sync started successfully',
        messageAr: 'بدأت مزامنة العملاء بنجاح',
        ...result
    });
});

/**
 * Sync vendors from QuickBooks
 * @route POST /api/integrations/quickbooks/sync/vendors
 * @access Private
 */
const syncVendors = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('You do not have permission to sync data', 403);
    }

    // Validate sync options
    const { error, value: options } = syncOptionsSchema.validate(req.body);
    if (error) {
        throw CustomException(error.details[0].message, 400);
    }

    // Start sync operation
    const result = await quickbooksService.syncVendors(firmId, userId, options);

    return res.status(200).json({
        error: false,
        message: 'Vendors sync started successfully',
        messageAr: 'بدأت مزامنة الموردين بنجاح',
        ...result
    });
});

/**
 * Sync invoices with QuickBooks
 * @route POST /api/integrations/quickbooks/sync/invoices
 * @access Private
 */
const syncInvoices = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('You do not have permission to sync data', 403);
    }

    // Validate sync options
    const { error, value: options } = syncOptionsSchema.validate(req.body);
    if (error) {
        throw CustomException(error.details[0].message, 400);
    }

    // Start sync operation
    const result = await quickbooksService.syncInvoices(firmId, userId, options);

    return res.status(200).json({
        error: false,
        message: 'Invoices sync started successfully',
        messageAr: 'بدأت مزامنة الفواتير بنجاح',
        ...result
    });
});

/**
 * Sync payments with QuickBooks
 * @route POST /api/integrations/quickbooks/sync/payments
 * @access Private
 */
const syncPayments = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('You do not have permission to sync data', 403);
    }

    // Validate sync options
    const { error, value: options } = syncOptionsSchema.validate(req.body);
    if (error) {
        throw CustomException(error.details[0].message, 400);
    }

    // Start sync operation
    const result = await quickbooksService.syncPayments(firmId, userId, options);

    return res.status(200).json({
        error: false,
        message: 'Payments sync started successfully',
        messageAr: 'بدأت مزامنة المدفوعات بنجاح',
        ...result
    });
});

/**
 * Perform full sync of all entities
 * @route POST /api/integrations/quickbooks/sync/all
 * @access Private
 */
const syncAll = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('You do not have permission to sync data', 403);
    }

    // Validate sync options
    const { error, value: options } = syncOptionsSchema.validate(req.body);
    if (error) {
        throw CustomException(error.details[0].message, 400);
    }

    // Start full sync operation (runs in background)
    const result = await quickbooksService.syncAll(firmId, userId, options);

    return res.status(202).json({
        error: false,
        message: 'Full sync started successfully. This may take several minutes.',
        messageAr: 'بدأت المزامنة الكاملة بنجاح. قد يستغرق هذا عدة دقائق.',
        ...result
    });
});

// ============================================
// SYNC STATUS & MONITORING
// ============================================

/**
 * Get sync status and history
 * @route GET /api/integrations/quickbooks/sync/status
 * @access Private
 */
const getSyncStatus = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('You do not have permission to view sync status', 403);
    }

    const { limit = 20, offset = 0, entityType } = req.query;

    const status = await quickbooksService.getSyncStatus(firmId, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        entityType
    });

    return res.status(200).json({
        error: false,
        message: 'Sync status retrieved successfully',
        messageAr: 'تم استرجاع حالة المزامنة بنجاح',
        ...status
    });
});

/**
 * Get sync errors
 * @route GET /api/integrations/quickbooks/sync/errors
 * @access Private
 */
const getSyncErrors = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('You do not have permission to view sync errors', 403);
    }

    const {
        limit = 50,
        offset = 0,
        entityType,
        severity,
        startDate,
        endDate,
        resolved
    } = req.query;

    const errors = await quickbooksService.getSyncErrors(firmId, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        entityType,
        severity,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        resolved: resolved === 'true' ? true : resolved === 'false' ? false : undefined
    });

    return res.status(200).json({
        error: false,
        message: 'Sync errors retrieved successfully',
        messageAr: 'تم استرجاع أخطاء المزامنة بنجاح',
        ...errors
    });
});

/**
 * Get sync conflicts
 * @route GET /api/integrations/quickbooks/sync/conflicts
 * @access Private
 */
const getSyncConflicts = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('You do not have permission to view sync conflicts', 403);
    }

    const {
        limit = 50,
        offset = 0,
        entityType,
        resolved
    } = req.query;

    const conflicts = await quickbooksService.getSyncConflicts(firmId, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        entityType,
        resolved: resolved === 'true' ? true : resolved === 'false' ? false : undefined
    });

    return res.status(200).json({
        error: false,
        message: 'Sync conflicts retrieved successfully',
        messageAr: 'تم استرجاع تعارضات المزامنة بنجاح',
        ...conflicts
    });
});

/**
 * Resolve a sync conflict
 * @route POST /api/integrations/quickbooks/sync/conflicts/:id/resolve
 * @access Private
 */
const resolveConflict = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { id } = req.params;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('You do not have permission to resolve sync conflicts', 403);
    }

    // Validate conflict ID
    const conflictId = sanitizeObjectId(id);
    if (!conflictId) {
        throw CustomException('Invalid conflict ID', 400);
    }

    // Validate resolution data
    const { error, value: resolutionData } = conflictResolutionSchema.validate(req.body);
    if (error) {
        throw CustomException(error.details[0].message, 400);
    }

    // Resolve the conflict
    const result = await quickbooksService.resolveConflict(
        firmId,
        conflictId,
        userId,
        resolutionData
    );

    return res.status(200).json({
        error: false,
        message: 'Conflict resolved successfully',
        messageAr: 'تم حل التعارض بنجاح',
        ...result
    });
});

// ============================================
// ENTITY MAPPING MANAGEMENT
// ============================================

/**
 * Get entity mappings between local and QuickBooks entities
 * @route GET /api/integrations/quickbooks/mapping
 * @access Private
 */
const getMappings = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('You do not have permission to view mappings', 403);
    }

    const {
        entityType,
        limit = 100,
        offset = 0,
        search
    } = req.query;

    const mappings = await quickbooksService.getMappings(firmId, {
        entityType,
        limit: parseInt(limit),
        offset: parseInt(offset),
        search
    });

    return res.status(200).json({
        error: false,
        message: 'Entity mappings retrieved successfully',
        messageAr: 'تم استرجاع تعيينات الكيانات بنجاح',
        ...mappings
    });
});

/**
 * Update entity mappings
 * @route PUT /api/integrations/quickbooks/mapping
 * @access Private
 */
const updateMappings = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('You do not have permission to update mappings', 403);
    }

    // Validate mapping data
    const { error, value: mappingData } = mappingUpdateSchema.validate(req.body);
    if (error) {
        throw CustomException(error.details[0].message, 400);
    }

    // Update mappings
    const result = await quickbooksService.updateMappings(firmId, userId, mappingData.mappings);

    return res.status(200).json({
        error: false,
        message: 'Entity mappings updated successfully',
        messageAr: 'تم تحديث تعيينات الكيانات بنجاح',
        ...result
    });
});

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // OAuth & Connection
    getAuthUrl,
    handleCallback,
    disconnect,
    getConnectionStatus,

    // Sync Operations
    syncAccounts,
    syncCustomers,
    syncVendors,
    syncInvoices,
    syncPayments,
    syncAll,

    // Sync Status & Monitoring
    getSyncStatus,
    getSyncErrors,
    getSyncConflicts,
    resolveConflict,

    // Entity Mapping
    getMappings,
    updateMappings
};
