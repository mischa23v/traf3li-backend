/**
 * Dropbox Storage Service
 *
 * Provides Dropbox integration for cloud storage:
 * - OAuth 2.0 authentication
 * - File upload, download, delete, move
 * - Folder creation and management
 * - File sharing and permissions
 * - Metadata retrieval
 */

const axios = require('axios');
const { CustomException } = require('../../utils');
const logger = require('../../utils/contextLogger');
const cacheService = require('../cache.service');
const { encrypt, decrypt } = require('../../utils/encryption');

// OAuth2 configuration
const DROPBOX_CLIENT_ID = process.env.DROPBOX_CLIENT_ID;
const DROPBOX_CLIENT_SECRET = process.env.DROPBOX_CLIENT_SECRET;
const DROPBOX_REDIRECT_URI = process.env.DROPBOX_REDIRECT_URI || `${process.env.BACKEND_URL}/api/storage/dropbox/callback`;

// Dropbox API endpoints
const DROPBOX_API_URL = 'https://api.dropboxapi.com/2';
const DROPBOX_CONTENT_API_URL = 'https://content.dropboxapi.com/2';
const DROPBOX_AUTH_URL = 'https://www.dropbox.com/oauth2/authorize';
const DROPBOX_TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token';

class DropboxService {
    constructor() {
        this.configured = !!(DROPBOX_CLIENT_ID && DROPBOX_CLIENT_SECRET);
    }

    /**
     * Check if Dropbox is configured
     * @returns {boolean}
     */
    isConfigured() {
        return this.configured;
    }

    // ═══════════════════════════════════════════════════════════════
    // OAUTH FLOW
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get authorization URL for OAuth flow
     * @param {string} userId - User ID
     * @returns {Promise<string>} - Authorization URL
     */
    async getAuthUrl(userId) {
        if (!this.isConfigured()) {
            throw CustomException('Dropbox not configured. Please set DROPBOX_CLIENT_ID and DROPBOX_CLIENT_SECRET', 500);
        }

        const state = Buffer.from(JSON.stringify({ userId, provider: 'dropbox' })).toString('base64');

        const authUrl = `${DROPBOX_AUTH_URL}?` + new URLSearchParams({
            client_id: DROPBOX_CLIENT_ID,
            redirect_uri: DROPBOX_REDIRECT_URI,
            response_type: 'code',
            state,
            token_access_type: 'offline' // Request refresh token
        }).toString();

        logger.info('Dropbox auth URL generated', { userId });

        return authUrl;
    }

    /**
     * Handle OAuth callback and exchange code for tokens
     * @param {string} code - Authorization code
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - Token and account info
     */
    async handleCallback(code, userId) {
        if (!this.isConfigured()) {
            throw CustomException('Dropbox not configured', 500);
        }

        try {
            // Exchange code for tokens
            const tokenResponse = await axios.post(DROPBOX_TOKEN_URL, null, {
                params: {
                    code,
                    grant_type: 'authorization_code',
                    client_id: DROPBOX_CLIENT_ID,
                    client_secret: DROPBOX_CLIENT_SECRET,
                    redirect_uri: DROPBOX_REDIRECT_URI
                }
            });

            const { access_token, refresh_token } = tokenResponse.data;

            // Get account info
            const accountInfo = await axios.post(
                `${DROPBOX_API_URL}/users/get_current_account`,
                null,
                {
                    headers: {
                        'Authorization': `Bearer ${access_token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Encrypt and store tokens
            const encryptedTokens = {
                access_token: encrypt(access_token),
                refresh_token: refresh_token ? encrypt(refresh_token) : null
            };

            await cacheService.set(
                `cloud_storage:dropbox:${userId}:tokens`,
                encryptedTokens,
                86400 * 30 // 30 days
            );

            logger.info('Dropbox OAuth callback successful', {
                userId,
                email: accountInfo.data.email
            });

            return {
                success: true,
                accountEmail: accountInfo.data.email,
                accountName: accountInfo.data.name.display_name,
                accountId: accountInfo.data.account_id
            };
        } catch (error) {
            logger.error('Dropbox OAuth callback failed', {
                userId,
                error: error.message
            });
            throw CustomException('Failed to authenticate with Dropbox: ' + error.message, 400);
        }
    }

    /**
     * Refresh access token
     * @param {string} userId - User ID
     * @returns {Promise<string>} - New access token
     */
    async refreshToken(userId) {
        const storedTokens = await cacheService.get(`cloud_storage:dropbox:${userId}:tokens`);

        if (!storedTokens || !storedTokens.refresh_token) {
            throw CustomException('No refresh token available. Please reconnect to Dropbox.', 401);
        }

        try {
            const response = await axios.post(DROPBOX_TOKEN_URL, null, {
                params: {
                    grant_type: 'refresh_token',
                    refresh_token: decrypt(storedTokens.refresh_token),
                    client_id: DROPBOX_CLIENT_ID,
                    client_secret: DROPBOX_CLIENT_SECRET
                }
            });

            const { access_token } = response.data;

            // Update stored tokens
            const encryptedTokens = {
                access_token: encrypt(access_token),
                refresh_token: storedTokens.refresh_token // Keep existing refresh token
            };

            await cacheService.set(
                `cloud_storage:dropbox:${userId}:tokens`,
                encryptedTokens,
                86400 * 30 // 30 days
            );

            logger.info('Dropbox token refreshed', { userId });

            return access_token;
        } catch (error) {
            logger.error('Failed to refresh Dropbox token', {
                userId,
                error: error.message
            });
            throw CustomException('Failed to refresh token. Please reconnect to Dropbox.', 401);
        }
    }

    /**
     * Get access token
     * @param {string} userId - User ID
     * @returns {Promise<string>} - Access token
     */
    async getAccessToken(userId) {
        const storedTokens = await cacheService.get(`cloud_storage:dropbox:${userId}:tokens`);

        if (!storedTokens) {
            throw CustomException('Not connected to Dropbox. Please connect first.', 401);
        }

        return decrypt(storedTokens.access_token);
    }

    /**
     * Make authenticated API request
     * @param {string} userId - User ID
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request data
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - Response data
     */
    async apiRequest(userId, endpoint, data = null, options = {}) {
        let accessToken = await this.getAccessToken(userId);

        try {
            const response = await axios.post(`${DROPBOX_API_URL}${endpoint}`, data, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            return response.data;
        } catch (error) {
            // Token expired, try refreshing
            if (error.response && error.response.status === 401) {
                accessToken = await this.refreshToken(userId);

                // Retry request with new token
                const response = await axios.post(`${DROPBOX_API_URL}${endpoint}`, data, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        ...options.headers
                    },
                    ...options
                });

                return response.data;
            }

            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CONNECTION MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Connect to Dropbox (handled by OAuth callback)
     * @param {string} userId - User ID
     * @param {Object} credentials - OAuth credentials
     * @returns {Promise<Object>} - Connection result
     */
    async connect(userId, credentials) {
        return await this.handleCallback(credentials.code, userId);
    }

    /**
     * Disconnect from Dropbox
     * @param {string} userId - User ID
     */
    async disconnect(userId) {
        // Revoke token
        try {
            const accessToken = await this.getAccessToken(userId);
            await axios.post(`${DROPBOX_API_URL}/auth/token/revoke`, null, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
        } catch (error) {
            logger.warn('Failed to revoke Dropbox token', { error: error.message });
        }

        await cacheService.del(`cloud_storage:dropbox:${userId}:tokens`);
        logger.info('Dropbox disconnected', { userId });
    }

    /**
     * Check if user is connected
     * @param {string} userId - User ID
     * @returns {Promise<boolean>}
     */
    async isConnected(userId) {
        const tokens = await cacheService.get(`cloud_storage:dropbox:${userId}:tokens`);
        return !!tokens;
    }

    // ═══════════════════════════════════════════════════════════════
    // FILE OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * List files
     * @param {string} userId - User ID
     * @param {string} path - Folder path
     * @param {Object} options - List options
     * @returns {Promise<Object>} - List of files
     */
    async listFiles(userId, path = '', options = {}) {
        try {
            const folderPath = path || '';
            const result = await this.apiRequest(userId, '/files/list_folder', {
                path: folderPath,
                include_deleted: false,
                include_media_info: true,
                limit: options.pageSize || 100
            });

            return {
                files: result.entries.map(entry => ({
                    id: entry.id,
                    name: entry.name,
                    path: entry.path_display,
                    isFolder: entry['.tag'] === 'folder',
                    size: entry.size || 0,
                    mimeType: entry['.tag'] === 'folder' ? 'folder' : 'file',
                    modifiedAt: entry.client_modified ? new Date(entry.client_modified) : null,
                    serverModifiedAt: entry.server_modified ? new Date(entry.server_modified) : null,
                    rev: entry.rev
                })),
                hasMore: result.has_more,
                cursor: result.cursor
            };
        } catch (error) {
            logger.error('Failed to list Dropbox files', {
                userId,
                path,
                error: error.message
            });
            throw CustomException('Failed to list files: ' + error.message, 500);
        }
    }

    /**
     * Upload file
     * @param {string} userId - User ID
     * @param {string} path - Upload path
     * @param {Object} file - File object
     * @param {Object} options - Upload options
     * @returns {Promise<Object>} - Uploaded file metadata
     */
    async uploadFile(userId, path, file, options = {}) {
        try {
            const accessToken = await this.getAccessToken(userId);
            const uploadPath = `${path}/${file.originalname}`.replace('//', '/');

            const response = await axios.post(
                `${DROPBOX_CONTENT_API_URL}/files/upload`,
                file.buffer || file,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/octet-stream',
                        'Dropbox-API-Arg': JSON.stringify({
                            path: uploadPath,
                            mode: 'add',
                            autorename: true,
                            mute: false
                        })
                    }
                }
            );

            return {
                id: response.data.id,
                name: response.data.name,
                path: response.data.path_display,
                size: response.data.size,
                rev: response.data.rev,
                serverModifiedAt: new Date(response.data.server_modified)
            };
        } catch (error) {
            logger.error('Failed to upload file to Dropbox', {
                userId,
                path,
                fileName: file.originalname,
                error: error.message
            });
            throw CustomException('Failed to upload file: ' + error.message, 500);
        }
    }

    /**
     * Download file
     * @param {string} userId - User ID
     * @param {string} fileId - File ID (path)
     * @returns {Promise<Object>} - File stream and metadata
     */
    async downloadFile(userId, fileId) {
        try {
            const accessToken = await this.getAccessToken(userId);

            const response = await axios.post(
                `${DROPBOX_CONTENT_API_URL}/files/download`,
                null,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Dropbox-API-Arg': JSON.stringify({ path: fileId })
                    },
                    responseType: 'stream'
                }
            );

            const metadata = JSON.parse(response.headers['dropbox-api-result']);

            return {
                stream: response.data,
                fileName: metadata.name,
                size: metadata.size,
                mimeType: 'application/octet-stream'
            };
        } catch (error) {
            logger.error('Failed to download file from Dropbox', {
                userId,
                fileId,
                error: error.message
            });
            throw CustomException('Failed to download file: ' + error.message, 500);
        }
    }

    /**
     * Delete file
     * @param {string} userId - User ID
     * @param {string} fileId - File ID (path)
     */
    async deleteFile(userId, fileId) {
        try {
            await this.apiRequest(userId, '/files/delete_v2', {
                path: fileId
            });

            logger.info('File deleted from Dropbox', { userId, fileId });
        } catch (error) {
            logger.error('Failed to delete file from Dropbox', {
                userId,
                fileId,
                error: error.message
            });
            throw CustomException('Failed to delete file: ' + error.message, 500);
        }
    }

    /**
     * Move file
     * @param {string} userId - User ID
     * @param {string} fileId - File ID (path)
     * @param {string} fromPath - Source path
     * @param {string} toPath - Destination path
     * @returns {Promise<Object>} - Moved file metadata
     */
    async moveFile(userId, fileId, fromPath, toPath) {
        try {
            const result = await this.apiRequest(userId, '/files/move_v2', {
                from_path: fileId,
                to_path: toPath,
                autorename: true
            });

            return {
                id: result.metadata.id,
                name: result.metadata.name,
                path: result.metadata.path_display,
                rev: result.metadata.rev
            };
        } catch (error) {
            logger.error('Failed to move file in Dropbox', {
                userId,
                fileId,
                error: error.message
            });
            throw CustomException('Failed to move file: ' + error.message, 500);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // FOLDER OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create folder
     * @param {string} userId - User ID
     * @param {string} folderPath - Folder path
     * @param {Object} options - Folder options
     * @returns {Promise<Object>} - Created folder metadata
     */
    async createFolder(userId, folderPath, options = {}) {
        try {
            const result = await this.apiRequest(userId, '/files/create_folder_v2', {
                path: folderPath,
                autorename: false
            });

            return {
                id: result.metadata.id,
                name: result.metadata.name,
                path: result.metadata.path_display,
                isFolder: true
            };
        } catch (error) {
            logger.error('Failed to create folder in Dropbox', {
                userId,
                folderPath,
                error: error.message
            });
            throw CustomException('Failed to create folder: ' + error.message, 500);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SHARING OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Share file
     * @param {string} userId - User ID
     * @param {string} fileId - File ID (path)
     * @param {Object} shareOptions - Share options
     * @returns {Promise<Object>} - Share result
     */
    async shareFile(userId, fileId, shareOptions) {
        try {
            const { email } = shareOptions;

            if (email) {
                // Share with specific user
                await this.apiRequest(userId, '/sharing/add_file_member', {
                    file: fileId,
                    members: [{
                        '.tag': 'email',
                        email: email
                    }],
                    quiet: false,
                    access_level: 'viewer'
                });
            }

            // Create shared link
            const linkResult = await this.apiRequest(userId, '/sharing/create_shared_link_with_settings', {
                path: fileId,
                settings: {
                    requested_visibility: 'public'
                }
            });

            return {
                success: true,
                url: linkResult.url,
                sharedWith: email || 'public'
            };
        } catch (error) {
            // Link might already exist
            if (error.response?.data?.error?.error?.['.tag'] === 'shared_link_already_exists') {
                const links = await this.apiRequest(userId, '/sharing/list_shared_links', {
                    path: fileId
                });

                if (links.links && links.links.length > 0) {
                    return {
                        success: true,
                        url: links.links[0].url,
                        sharedWith: email || 'public'
                    };
                }
            }

            logger.error('Failed to share file in Dropbox', {
                userId,
                fileId,
                error: error.message
            });
            throw CustomException('Failed to share file: ' + error.message, 500);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // METADATA OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get file metadata
     * @param {string} userId - User ID
     * @param {string} fileId - File ID (path)
     * @returns {Promise<Object>} - File metadata
     */
    async getFileMetadata(userId, fileId) {
        try {
            const result = await this.apiRequest(userId, '/files/get_metadata', {
                path: fileId,
                include_media_info: true
            });

            return {
                id: result.id,
                name: result.name,
                path: result.path_display,
                isFolder: result['.tag'] === 'folder',
                size: result.size || 0,
                rev: result.rev,
                clientModifiedAt: result.client_modified ? new Date(result.client_modified) : null,
                serverModifiedAt: result.server_modified ? new Date(result.server_modified) : null
            };
        } catch (error) {
            logger.error('Failed to get file metadata from Dropbox', {
                userId,
                fileId,
                error: error.message
            });
            throw CustomException('Failed to get file metadata: ' + error.message, 500);
        }
    }
}

module.exports = new DropboxService();
