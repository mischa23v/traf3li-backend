/**
 * API v2 Routes
 *
 * Central export for all v2 API routes with enhanced features:
 * - Standardized response formats
 * - Enhanced pagination (cursor-based)
 * - Comprehensive error codes
 * - Better filtering and sorting
 * - Batch operations support
 * - Improved metadata in responses
 *
 * Breaking Changes from v1:
 * - Response format changed to standardized structure
 * - Date fields now use ISO 8601 format exclusively
 * - Pagination changed from offset-based to cursor-based
 * - Error response structure standardized
 * - Field naming conventions updated (snake_case for consistency)
 */

const express = require('express');
const router = express.Router();
const apiResponse = require('../../utils/apiResponse');
const apiVersionService = require('../../services/apiVersion.service');
const { getVersionConfig, getBreakingChanges } = require('../../config/apiVersions');
const {
    transformV1toV2,
    wrapInVersionedFormat,
    transformPagination
} = require('../../middlewares/responseTransformer.middleware');

// Import v1 routes for backward compatibility (initially)
// As v2 evolves, these will be replaced with v2-specific implementations
const v1Routes = require('../v1');

// ============================================
// V2 MIDDLEWARE
// ============================================

// Apply v2 response transformation middleware to all routes
router.use(wrapInVersionedFormat({ defaultMessage: 'Success' }));
router.use(transformPagination);

// ============================================
// V2 META ENDPOINTS
// ============================================

/**
 * Health check endpoint for v2
 * Enhanced with additional system information
 */
router.get('/health', (req, res) => {
    const versionConfig = getVersionConfig('v2');

    res.json({
        success: true,
        data: {
            status: 'healthy',
            version: 'v2',
            versionStatus: versionConfig?.status || 'unknown',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            nodeVersion: process.version,
            memoryUsage: {
                heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                unit: 'MB'
            }
        },
        message: 'API v2 is running',
        meta: {
            timestamp: new Date().toISOString(),
            apiVersion: 'v2'
        }
    });
});

/**
 * Version info endpoint
 * Comprehensive version information and features
 */
router.get('/version', (req, res) => {
    const versionConfig = getVersionConfig('v2');
    const breakingChanges = getBreakingChanges('v1', 'v2');

    res.json({
        success: true,
        data: {
            version: 'v2',
            name: versionConfig?.name || 'API Version 2.0',
            status: versionConfig?.status || 'stable',
            released: versionConfig?.released || '2025-01-01',
            description: versionConfig?.description,
            features: versionConfig?.features || [],
            breakingChanges: versionConfig?.breakingChanges || [],
            breakingChangesDetails: breakingChanges?.changes || [],
            documentation: versionConfig?.documentation || 'https://docs.traf3li.com/api/v2',
            migrationGuide: versionConfig?.migrationGuide || 'https://docs.traf3li.com/api/migration/v1-to-v2'
        },
        message: 'API v2 version information',
        meta: {
            timestamp: new Date().toISOString(),
            apiVersion: 'v2'
        }
    });
});

/**
 * API capabilities endpoint
 * Lists all v2-specific capabilities and features
 */
router.get('/capabilities', (req, res) => {
    res.json({
        success: true,
        data: {
            pagination: {
                type: 'cursor-based',
                description: 'Cursor-based pagination for better performance with large datasets',
                parameters: ['cursor', 'limit'],
                example: '/api/v2/cases?cursor=eyJpZCI6MTIzfQ==&limit=20'
            },
            filtering: {
                support: 'advanced',
                operators: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'contains', 'startsWith', 'endsWith'],
                example: '/api/v2/cases?filter[status]=eq:active&filter[created_at]=gte:2024-01-01'
            },
            sorting: {
                support: 'multiple-fields',
                format: 'field:direction',
                example: '/api/v2/cases?sort=created_at:desc,priority:asc'
            },
            fieldSelection: {
                support: 'sparse-fieldsets',
                description: 'Request only specific fields to reduce payload size',
                example: '/api/v2/cases?fields=id,title,status,created_at'
            },
            includes: {
                support: 'relationship-inclusion',
                description: 'Include related resources in a single request',
                example: '/api/v2/cases?include=client,lawyer,documents'
            },
            batchOperations: {
                support: 'partial',
                endpoints: ['/api/v2/batch/create', '/api/v2/batch/update', '/api/v2/batch/delete'],
                description: 'Perform operations on multiple resources in a single request'
            },
            responseFormat: {
                structure: 'standardized',
                envelope: true,
                metadata: true,
                example: {
                    success: true,
                    data: {},
                    message: 'Success',
                    meta: {
                        timestamp: '2025-01-01T00:00:00.000Z',
                        apiVersion: 'v2'
                    }
                }
            }
        },
        message: 'API v2 capabilities',
        meta: {
            timestamp: new Date().toISOString(),
            apiVersion: 'v2'
        }
    });
});

/**
 * API root endpoint
 * Provides navigation and available endpoints
 */
router.get('/', (req, res) => {
    const versionConfig = getVersionConfig('v2');

    res.json({
        success: true,
        data: {
            message: 'Welcome to Traf3li API v2',
            version: 'v2',
            status: versionConfig?.status || 'stable',
            documentation: versionConfig?.documentation || 'https://docs.traf3li.com/api/v2',
            endpoints: {
                meta: [
                    { path: '/api/v2/health', method: 'GET', description: 'Health check' },
                    { path: '/api/v2/version', method: 'GET', description: 'Version information' },
                    { path: '/api/v2/capabilities', method: 'GET', description: 'API capabilities' }
                ],
                resources: [
                    { path: '/api/v2/cases', methods: ['GET', 'POST', 'PUT', 'DELETE'], description: 'Case management' },
                    { path: '/api/v2/clients', methods: ['GET', 'POST', 'PUT', 'DELETE'], description: 'Client management' },
                    { path: '/api/v2/invoices', methods: ['GET', 'POST', 'PUT', 'DELETE'], description: 'Invoice management' },
                    { path: '/api/v2/documents', methods: ['GET', 'POST', 'PUT', 'DELETE'], description: 'Document management' }
                ],
                batch: [
                    { path: '/api/v2/batch/create', method: 'POST', description: 'Batch create resources' },
                    { path: '/api/v2/batch/update', method: 'PUT', description: 'Batch update resources' },
                    { path: '/api/v2/batch/delete', method: 'DELETE', description: 'Batch delete resources' }
                ]
            },
            note: 'V2 API with enhanced features and standardized responses'
        },
        message: 'API v2 root endpoint',
        meta: {
            timestamp: new Date().toISOString(),
            apiVersion: 'v2'
        }
    });
});

// ============================================
// V2 BATCH OPERATIONS ENDPOINTS
// ============================================

/**
 * Batch create endpoint
 * Create multiple resources in a single request
 */
router.post('/batch/create', (req, res) => {
    res.status(501).json({
        success: false,
        error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Batch create endpoint coming soon',
            details: 'This feature is planned for a future release'
        },
        meta: {
            timestamp: new Date().toISOString(),
            apiVersion: 'v2'
        }
    });
});

/**
 * Batch update endpoint
 * Update multiple resources in a single request
 */
router.put('/batch/update', (req, res) => {
    res.status(501).json({
        success: false,
        error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Batch update endpoint coming soon',
            details: 'This feature is planned for a future release'
        },
        meta: {
            timestamp: new Date().toISOString(),
            apiVersion: 'v2'
        }
    });
});

/**
 * Batch delete endpoint
 * Delete multiple resources in a single request
 */
router.delete('/batch/delete', (req, res) => {
    res.status(501).json({
        success: false,
        error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Batch delete endpoint coming soon',
            details: 'This feature is planned for a future release'
        },
        meta: {
            timestamp: new Date().toISOString(),
            apiVersion: 'v2'
        }
    });
});

// ============================================
// INHERIT V1 ROUTES WITH TRANSFORMATION
// ============================================
// For now, v2 inherits all v1 routes with automatic transformation
// As we develop v2-specific implementations, we'll replace these
router.use('/', transformV1toV2, v1Routes);

// ============================================
// V2 ENHANCED ENDPOINTS (Coming Soon)
// ============================================
// TODO: Add v2-specific route implementations here
// Examples:
// - Enhanced search endpoints with advanced filtering
// - GraphQL support
// - Webhook management endpoints
// - Real-time subscriptions via WebSocket
// - Advanced analytics endpoints
// - Export/Import endpoints with multiple formats
// - Workflow automation endpoints

module.exports = router;
