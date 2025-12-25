/**
 * Cloud Storage Controller
 *
 * Handles HTTP requests for cloud storage operations:
 * - Provider management
 * - OAuth authentication
 * - File operations (list, upload, download, delete)
 * - Folder operations
 */

const cloudStorageService = require('../services/cloudStorage.service');
const logger = require('../utils/contextLogger');
const { CustomException } = require('../utils');
const multer = require('multer');

// Configure multer for file uploads (memory storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    }
});

/**
 * Get list of available providers
 * GET /api/storage/providers
 */
const getProviders = async (request, response) => {
    try {
        const providers = cloudStorageService.getSupportedProviders();

        return response.status(200).json({
            error: false,
            message: 'Providers retrieved successfully',
            messageAr: 'تم جلب قائمة مزودي التخزين السحابي بنجاح',
            providers
        });
    } catch (error) {
        logger.error('Failed to get providers', { error: error.message });
        return response.status(error.status || 500).json({
            error: true,
            message: error.message,
            messageAr: 'فشل في جلب قائمة المزودين'
        });
    }
};

/**
 * Get OAuth authorization URL
 * GET /api/storage/:provider/auth
 */
const getAuthUrl = async (request, response) => {
    try {
        const { provider } = request.params;
        const userId = request.userID;

        const providerService = cloudStorageService.getProvider(provider);
        const authUrl = await providerService.getAuthUrl(userId);

        return response.status(200).json({
            error: false,
            message: 'Authorization URL generated',
            messageAr: 'تم إنشاء رابط المصادقة',
            authUrl,
            provider
        });
    } catch (error) {
        logger.error('Failed to get auth URL', {
            provider: request.params.provider,
            error: error.message
        });
        return response.status(error.status || 500).json({
            error: true,
            message: error.message,
            messageAr: 'فشل في إنشاء رابط المصادقة'
        });
    }
};

/**
 * Handle OAuth callback
 * GET /api/storage/:provider/callback
 */
const handleCallback = async (request, response) => {
    try {
        const { provider } = request.params;
        const { code, state } = request.query;

        if (!code) {
            throw CustomException('Authorization code is required', 400);
        }

        // Parse state to get userId
        let userId;
        try {
            const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
            userId = stateData.userId;
        } catch {
            throw CustomException('Invalid state parameter', 400);
        }

        // Connect to provider
        const result = await cloudStorageService.connect(provider, userId, { code });

        // Redirect to frontend with success
        const redirectUrl = `${process.env.FRONTEND_URL || process.env.DASHBOARD_URL}/settings/integrations?provider=${provider}&status=connected&email=${encodeURIComponent(result.accountEmail)}`;

        return response.redirect(redirectUrl);
    } catch (error) {
        logger.error('OAuth callback failed', {
            provider: request.params.provider,
            error: error.message
        });

        // Redirect to frontend with error
        const redirectUrl = `${process.env.FRONTEND_URL || process.env.DASHBOARD_URL}/settings/integrations?provider=${request.params.provider}&status=error&message=${encodeURIComponent(error.message)}`;

        return response.redirect(redirectUrl);
    }
};

/**
 * Disconnect from provider
 * POST /api/storage/:provider/disconnect
 */
const disconnect = async (request, response) => {
    try {
        const { provider } = request.params;
        const userId = request.userID;

        const result = await cloudStorageService.disconnect(provider, userId);

        logger.info('Cloud storage disconnected', {
            userId,
            provider
        });

        return response.status(200).json({
            error: false,
            message: 'Disconnected successfully',
            messageAr: 'تم قطع الاتصال بنجاح',
            data: result
        });
    } catch (error) {
        logger.error('Failed to disconnect', {
            provider: request.params.provider,
            userId: request.userID,
            error: error.message
        });
        return response.status(error.status || 500).json({
            error: true,
            message: error.message,
            messageAr: 'فشل في قطع الاتصال'
        });
    }
};

/**
 * List files in a directory
 * GET /api/storage/:provider/files
 */
const listFiles = async (request, response) => {
    try {
        const { provider } = request.params;
        const userId = request.userID;
        const { path, pageSize, pageToken, query } = request.query;

        const options = {
            pageSize: pageSize ? parseInt(pageSize) : 100,
            pageToken,
            query
        };

        const result = await cloudStorageService.listFiles(provider, userId, path || '', options);

        return response.status(200).json({
            error: false,
            message: 'Files listed successfully',
            messageAr: 'تم جلب قائمة الملفات بنجاح',
            data: result
        });
    } catch (error) {
        logger.error('Failed to list files', {
            provider: request.params.provider,
            userId: request.userID,
            error: error.message
        });
        return response.status(error.status || 500).json({
            error: true,
            message: error.message,
            messageAr: 'فشل في جلب قائمة الملفات'
        });
    }
};

/**
 * Upload file
 * POST /api/storage/:provider/files
 */
const uploadFile = async (request, response) => {
    try {
        const { provider } = request.params;
        const userId = request.userID;
        const { path } = request.body;

        if (!request.file) {
            throw CustomException('No file uploaded', 400);
        }

        const result = await cloudStorageService.uploadFile(
            provider,
            userId,
            path || '',
            request.file
        );

        logger.info('File uploaded to cloud storage', {
            userId,
            provider,
            fileName: request.file.originalname
        });

        return response.status(201).json({
            error: false,
            message: 'File uploaded successfully',
            messageAr: 'تم رفع الملف بنجاح',
            data: result
        });
    } catch (error) {
        logger.error('Failed to upload file', {
            provider: request.params.provider,
            userId: request.userID,
            error: error.message
        });
        return response.status(error.status || 500).json({
            error: true,
            message: error.message,
            messageAr: 'فشل في رفع الملف'
        });
    }
};

/**
 * Download file
 * GET /api/storage/:provider/files/:fileId
 */
const downloadFile = async (request, response) => {
    try {
        const { provider, fileId } = request.params;
        const userId = request.userID;

        const result = await cloudStorageService.downloadFile(provider, userId, fileId);

        // Set response headers
        response.setHeader('Content-Type', result.mimeType || 'application/octet-stream');
        response.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
        if (result.size) {
            response.setHeader('Content-Length', result.size);
        }

        // Stream the file
        result.stream.pipe(response);
    } catch (error) {
        logger.error('Failed to download file', {
            provider: request.params.provider,
            fileId: request.params.fileId,
            userId: request.userID,
            error: error.message
        });
        return response.status(error.status || 500).json({
            error: true,
            message: error.message,
            messageAr: 'فشل في تحميل الملف'
        });
    }
};

/**
 * Delete file
 * DELETE /api/storage/:provider/files/:fileId
 */
const deleteFile = async (request, response) => {
    try {
        const { provider, fileId } = request.params;
        const userId = request.userID;

        const result = await cloudStorageService.deleteFile(provider, userId, fileId);

        logger.info('File deleted from cloud storage', {
            userId,
            provider,
            fileId
        });

        return response.status(200).json({
            error: false,
            message: 'File deleted successfully',
            messageAr: 'تم حذف الملف بنجاح',
            data: result
        });
    } catch (error) {
        logger.error('Failed to delete file', {
            provider: request.params.provider,
            fileId: request.params.fileId,
            userId: request.userID,
            error: error.message
        });
        return response.status(error.status || 500).json({
            error: true,
            message: error.message,
            messageAr: 'فشل في حذف الملف'
        });
    }
};

/**
 * Move file
 * POST /api/storage/:provider/files/:fileId/move
 */
const moveFile = async (request, response) => {
    try {
        const { provider, fileId } = request.params;
        const userId = request.userID;
        const { fromPath, toPath } = request.body;

        if (!toPath) {
            throw CustomException('Destination path is required', 400);
        }

        const result = await cloudStorageService.moveFile(
            provider,
            userId,
            fileId,
            fromPath || '',
            toPath
        );

        logger.info('File moved in cloud storage', {
            userId,
            provider,
            fileId,
            fromPath,
            toPath
        });

        return response.status(200).json({
            error: false,
            message: 'File moved successfully',
            messageAr: 'تم نقل الملف بنجاح',
            data: result
        });
    } catch (error) {
        logger.error('Failed to move file', {
            provider: request.params.provider,
            fileId: request.params.fileId,
            userId: request.userID,
            error: error.message
        });
        return response.status(error.status || 500).json({
            error: true,
            message: error.message,
            messageAr: 'فشل في نقل الملف'
        });
    }
};

/**
 * Create folder
 * POST /api/storage/:provider/folders
 */
const createFolder = async (request, response) => {
    try {
        const { provider } = request.params;
        const userId = request.userID;
        const { name, path, parentId } = request.body;

        if (!name) {
            throw CustomException('Folder name is required', 400);
        }

        const result = await cloudStorageService.createFolder(
            provider,
            userId,
            path || name,
            { parentId }
        );

        logger.info('Folder created in cloud storage', {
            userId,
            provider,
            folderName: name
        });

        return response.status(201).json({
            error: false,
            message: 'Folder created successfully',
            messageAr: 'تم إنشاء المجلد بنجاح',
            data: result
        });
    } catch (error) {
        logger.error('Failed to create folder', {
            provider: request.params.provider,
            userId: request.userID,
            error: error.message
        });
        return response.status(error.status || 500).json({
            error: true,
            message: error.message,
            messageAr: 'فشل في إنشاء المجلد'
        });
    }
};

/**
 * Share file
 * POST /api/storage/:provider/files/:fileId/share
 */
const shareFile = async (request, response) => {
    try {
        const { provider, fileId } = request.params;
        const userId = request.userID;
        const { email, role, type } = request.body;

        const result = await cloudStorageService.shareFile(provider, userId, fileId, {
            email,
            role: role || 'reader',
            type: type || 'user'
        });

        logger.info('File shared in cloud storage', {
            userId,
            provider,
            fileId,
            sharedWith: email || 'public'
        });

        return response.status(200).json({
            error: false,
            message: 'File shared successfully',
            messageAr: 'تم مشاركة الملف بنجاح',
            data: result
        });
    } catch (error) {
        logger.error('Failed to share file', {
            provider: request.params.provider,
            fileId: request.params.fileId,
            userId: request.userID,
            error: error.message
        });
        return response.status(error.status || 500).json({
            error: true,
            message: error.message,
            messageAr: 'فشل في مشاركة الملف'
        });
    }
};

/**
 * Get file metadata
 * GET /api/storage/:provider/files/:fileId/metadata
 */
const getFileMetadata = async (request, response) => {
    try {
        const { provider, fileId } = request.params;
        const userId = request.userID;

        const result = await cloudStorageService.getFileMetadata(provider, userId, fileId);

        return response.status(200).json({
            error: false,
            message: 'File metadata retrieved successfully',
            messageAr: 'تم جلب معلومات الملف بنجاح',
            data: result
        });
    } catch (error) {
        logger.error('Failed to get file metadata', {
            provider: request.params.provider,
            fileId: request.params.fileId,
            userId: request.userID,
            error: error.message
        });
        return response.status(error.status || 500).json({
            error: true,
            message: error.message,
            messageAr: 'فشل في جلب معلومات الملف'
        });
    }
};

/**
 * Check connection status
 * GET /api/storage/:provider/status
 */
const getConnectionStatus = async (request, response) => {
    try {
        const { provider } = request.params;
        const userId = request.userID;

        const isConnected = await cloudStorageService.isConnected(provider, userId);

        return response.status(200).json({
            error: false,
            message: 'Connection status retrieved',
            messageAr: 'تم جلب حالة الاتصال',
            data: {
                provider,
                connected: isConnected
            }
        });
    } catch (error) {
        logger.error('Failed to get connection status', {
            provider: request.params.provider,
            userId: request.userID,
            error: error.message
        });
        return response.status(error.status || 500).json({
            error: true,
            message: error.message,
            messageAr: 'فشل في جلب حالة الاتصال'
        });
    }
};

module.exports = {
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
    upload // Export multer middleware
};
