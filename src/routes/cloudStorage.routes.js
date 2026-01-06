/**
 * Cloud Storage Routes
 *
 * Defines API endpoints for cloud storage operations:
 * - Provider management
 * - OAuth authentication
 * - File operations (CRUD)
 * - Folder operations
 * - Sharing operations
 */

const express = require('express');
const { userMiddleware } = require('../middlewares');
const malwareScanMiddleware = require('../middlewares/malwareScan.middleware');
const {
    getProviders,
    getAuthUrl,
    handleCallback,
    disconnect,
    listFiles,
    uploadFile,
    downloadFile,
    deleteFile,
    moveFile,
    createFolder,
    shareFile,
    getFileMetadata,
    getConnectionStatus,
    upload
} = require('../controllers/cloudStorage.controller');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// PROVIDER MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Get list of available providers
 * GET /api/storage/providers
 * Public endpoint (can be accessed without auth to see available options)
 */
router.get('/providers', getProviders);

// ═══════════════════════════════════════════════════════════════
// OAUTH AUTHENTICATION
// ═══════════════════════════════════════════════════════════════

/**
 * Get OAuth authorization URL
 * GET /api/storage/:provider/auth
 * Requires authentication
 */
router.get('/:provider/auth', userMiddleware, getAuthUrl);

/**
 * Handle OAuth callback
 * GET /api/storage/:provider/callback
 * Public endpoint (OAuth callback from provider)
 */
router.get('/:provider/callback', handleCallback);

/**
 * Check connection status
 * GET /api/storage/:provider/status
 * Requires authentication
 */
router.get('/:provider/status', userMiddleware, getConnectionStatus);

/**
 * Disconnect from provider
 * POST /api/storage/:provider/disconnect
 * Requires authentication
 */
router.post('/:provider/disconnect', userMiddleware, disconnect);

// ═══════════════════════════════════════════════════════════════
// FILE OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * List files in a directory
 * GET /api/storage/:provider/files
 * Query params: path, pageSize, pageToken, query
 * Requires authentication
 */
router.get('/:provider/files', userMiddleware, listFiles);

/**
 * Upload file
 * POST /api/storage/:provider/files
 * Body: file (multipart/form-data), path
 * Requires authentication
 * Gold Standard: Malware scan before uploading to external providers
 */
router.post('/:provider/files', userMiddleware, upload.single('file'), malwareScanMiddleware, uploadFile);

/**
 * Get file metadata
 * GET /api/storage/:provider/files/:fileId/metadata
 * Requires authentication
 */
router.get('/:provider/files/:fileId/metadata', userMiddleware, getFileMetadata);

/**
 * Download file
 * GET /api/storage/:provider/files/:fileId
 * Requires authentication
 */
router.get('/:provider/files/:fileId', userMiddleware, downloadFile);

/**
 * Delete file
 * DELETE /api/storage/:provider/files/:fileId
 * Requires authentication
 */
router.delete('/:provider/files/:fileId', userMiddleware, deleteFile);

/**
 * Move file
 * POST /api/storage/:provider/files/:fileId/move
 * Body: fromPath, toPath
 * Requires authentication
 */
router.post('/:provider/files/:fileId/move', userMiddleware, moveFile);

/**
 * Share file
 * POST /api/storage/:provider/files/:fileId/share
 * Body: email (optional), role, type
 * Requires authentication
 */
router.post('/:provider/files/:fileId/share', userMiddleware, shareFile);

// ═══════════════════════════════════════════════════════════════
// FOLDER OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create folder
 * POST /api/storage/:provider/folders
 * Body: name, path (optional), parentId (optional)
 * Requires authentication
 */
router.post('/:provider/folders', userMiddleware, createFolder);

module.exports = router;
