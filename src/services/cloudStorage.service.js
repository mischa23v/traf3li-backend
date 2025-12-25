/**
 * Cloud Storage Service - Base Interface
 *
 * Unified interface for multiple cloud storage providers:
 * - Google Drive
 * - Dropbox
 * - OneDrive
 *
 * Provides consistent API for:
 * - Connection management
 * - File operations (upload, download, delete, move)
 * - Folder operations (create, list)
 * - Sharing operations
 * - File metadata retrieval
 */

const googleDriveService = require('./storage/googleDrive.service');
const dropboxService = require('./storage/dropbox.service');
const oneDriveService = require('./storage/oneDrive.service');
const logger = require('../utils/contextLogger');
const { CustomException } = require('../utils');
const cacheService = require('./cache.service');

// Provider registry
const PROVIDERS = {
    google_drive: googleDriveService,
    dropbox: dropboxService,
    onedrive: oneDriveService
};

// Supported providers list
const SUPPORTED_PROVIDERS = Object.keys(PROVIDERS);

class CloudStorageService {
    /**
     * Get provider service instance
     * @param {string} provider - Provider name (google_drive, dropbox, onedrive)
     * @returns {Object} - Provider service instance
     */
    getProvider(provider) {
        const providerKey = provider.toLowerCase();

        if (!PROVIDERS[providerKey]) {
            throw CustomException(
                `Provider '${provider}' not supported. Supported providers: ${SUPPORTED_PROVIDERS.join(', ')}`,
                400
            );
        }

        return PROVIDERS[providerKey];
    }

    /**
     * Get list of supported providers
     * @returns {Array} - List of provider configurations
     */
    getSupportedProviders() {
        return SUPPORTED_PROVIDERS.map(key => ({
            id: key,
            name: this._getProviderDisplayName(key),
            status: PROVIDERS[key].isConfigured() ? 'configured' : 'not_configured',
            features: {
                upload: true,
                download: true,
                delete: true,
                move: true,
                share: true,
                folders: true
            }
        }));
    }

    /**
     * Get provider display name
     * @private
     */
    _getProviderDisplayName(key) {
        const names = {
            google_drive: 'Google Drive',
            dropbox: 'Dropbox',
            onedrive: 'OneDrive'
        };
        return names[key] || key;
    }

    // ═══════════════════════════════════════════════════════════════
    // CONNECTION MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Connect to a cloud storage provider
     * @param {string} provider - Provider name
     * @param {string} userId - User ID
     * @param {Object} credentials - Provider credentials
     * @returns {Promise<Object>} - Connection result
     */
    async connect(provider, userId, credentials) {
        const providerService = this.getProvider(provider);

        try {
            const result = await providerService.connect(userId, credentials);

            // Cache connection status
            await cacheService.set(
                `cloud_storage:${provider}:${userId}:connected`,
                true,
                3600 // 1 hour
            );

            logger.info('Cloud storage connected', {
                provider,
                userId,
                accountEmail: result.accountEmail
            });

            return {
                success: true,
                provider,
                accountEmail: result.accountEmail,
                accountName: result.accountName,
                connectedAt: new Date()
            };
        } catch (error) {
            logger.error('Cloud storage connection failed', {
                provider,
                userId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Disconnect from a cloud storage provider
     * @param {string} provider - Provider name
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - Disconnection result
     */
    async disconnect(provider, userId) {
        const providerService = this.getProvider(provider);

        try {
            await providerService.disconnect(userId);

            // Clear connection cache
            await cacheService.del(`cloud_storage:${provider}:${userId}:connected`);

            logger.info('Cloud storage disconnected', {
                provider,
                userId
            });

            return {
                success: true,
                provider,
                disconnectedAt: new Date()
            };
        } catch (error) {
            logger.error('Cloud storage disconnection failed', {
                provider,
                userId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Check if user is connected to provider
     * @param {string} provider - Provider name
     * @param {string} userId - User ID
     * @returns {Promise<boolean>} - Connection status
     */
    async isConnected(provider, userId) {
        const providerService = this.getProvider(provider);
        return await providerService.isConnected(userId);
    }

    // ═══════════════════════════════════════════════════════════════
    // FILE OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * List files in a directory
     * @param {string} provider - Provider name
     * @param {string} userId - User ID
     * @param {string} path - Directory path (optional, default: root)
     * @param {Object} options - List options (pageSize, pageToken, query)
     * @returns {Promise<Object>} - List of files
     */
    async listFiles(provider, userId, path = '', options = {}) {
        const providerService = this.getProvider(provider);

        try {
            const result = await providerService.listFiles(userId, path, options);

            logger.debug('Files listed', {
                provider,
                userId,
                path,
                fileCount: result.files.length
            });

            return result;
        } catch (error) {
            logger.error('Failed to list files', {
                provider,
                userId,
                path,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Upload a file
     * @param {string} provider - Provider name
     * @param {string} userId - User ID
     * @param {string} path - Upload path (folder)
     * @param {Object} file - File object (buffer, originalname, mimetype)
     * @param {Object} options - Upload options
     * @returns {Promise<Object>} - Uploaded file metadata
     */
    async uploadFile(provider, userId, path, file, options = {}) {
        const providerService = this.getProvider(provider);

        try {
            const result = await providerService.uploadFile(userId, path, file, options);

            logger.info('File uploaded', {
                provider,
                userId,
                path,
                fileName: file.originalname,
                fileSize: file.size
            });

            return result;
        } catch (error) {
            logger.error('Failed to upload file', {
                provider,
                userId,
                path,
                fileName: file.originalname,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Download a file
     * @param {string} provider - Provider name
     * @param {string} userId - User ID
     * @param {string} fileId - File ID
     * @returns {Promise<Object>} - File stream and metadata
     */
    async downloadFile(provider, userId, fileId) {
        const providerService = this.getProvider(provider);

        try {
            const result = await providerService.downloadFile(userId, fileId);

            logger.info('File downloaded', {
                provider,
                userId,
                fileId,
                fileName: result.fileName
            });

            return result;
        } catch (error) {
            logger.error('Failed to download file', {
                provider,
                userId,
                fileId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Delete a file
     * @param {string} provider - Provider name
     * @param {string} userId - User ID
     * @param {string} fileId - File ID
     * @returns {Promise<Object>} - Deletion result
     */
    async deleteFile(provider, userId, fileId) {
        const providerService = this.getProvider(provider);

        try {
            await providerService.deleteFile(userId, fileId);

            logger.info('File deleted', {
                provider,
                userId,
                fileId
            });

            return {
                success: true,
                fileId,
                deletedAt: new Date()
            };
        } catch (error) {
            logger.error('Failed to delete file', {
                provider,
                userId,
                fileId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Move a file
     * @param {string} provider - Provider name
     * @param {string} userId - User ID
     * @param {string} fileId - File ID
     * @param {string} fromPath - Source path
     * @param {string} toPath - Destination path
     * @returns {Promise<Object>} - Moved file metadata
     */
    async moveFile(provider, userId, fileId, fromPath, toPath) {
        const providerService = this.getProvider(provider);

        try {
            const result = await providerService.moveFile(userId, fileId, fromPath, toPath);

            logger.info('File moved', {
                provider,
                userId,
                fileId,
                fromPath,
                toPath
            });

            return result;
        } catch (error) {
            logger.error('Failed to move file', {
                provider,
                userId,
                fileId,
                fromPath,
                toPath,
                error: error.message
            });
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // FOLDER OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create a folder
     * @param {string} provider - Provider name
     * @param {string} userId - User ID
     * @param {string} path - Folder path/name
     * @param {Object} options - Folder options
     * @returns {Promise<Object>} - Created folder metadata
     */
    async createFolder(provider, userId, path, options = {}) {
        const providerService = this.getProvider(provider);

        try {
            const result = await providerService.createFolder(userId, path, options);

            logger.info('Folder created', {
                provider,
                userId,
                path
            });

            return result;
        } catch (error) {
            logger.error('Failed to create folder', {
                provider,
                userId,
                path,
                error: error.message
            });
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SHARING OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Share a file
     * @param {string} provider - Provider name
     * @param {string} userId - User ID
     * @param {string} fileId - File ID
     * @param {Object} shareOptions - Share options (email, role, type)
     * @returns {Promise<Object>} - Share result with link
     */
    async shareFile(provider, userId, fileId, shareOptions) {
        const providerService = this.getProvider(provider);

        try {
            const result = await providerService.shareFile(userId, fileId, shareOptions);

            logger.info('File shared', {
                provider,
                userId,
                fileId,
                shareWith: shareOptions.email || 'public'
            });

            return result;
        } catch (error) {
            logger.error('Failed to share file', {
                provider,
                userId,
                fileId,
                error: error.message
            });
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // METADATA OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get file metadata
     * @param {string} provider - Provider name
     * @param {string} userId - User ID
     * @param {string} fileId - File ID
     * @returns {Promise<Object>} - File metadata
     */
    async getFileMetadata(provider, userId, fileId) {
        const providerService = this.getProvider(provider);

        try {
            const result = await providerService.getFileMetadata(userId, fileId);

            logger.debug('File metadata retrieved', {
                provider,
                userId,
                fileId
            });

            return result;
        } catch (error) {
            logger.error('Failed to get file metadata', {
                provider,
                userId,
                fileId,
                error: error.message
            });
            throw error;
        }
    }
}

module.exports = new CloudStorageService();
