/**
 * OneDrive Storage Service
 *
 * Provides Microsoft OneDrive integration for cloud storage:
 * - OAuth 2.0 authentication (Microsoft Graph API)
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
const ONEDRIVE_CLIENT_ID = process.env.ONEDRIVE_CLIENT_ID;
const ONEDRIVE_CLIENT_SECRET = process.env.ONEDRIVE_CLIENT_SECRET;
const ONEDRIVE_REDIRECT_URI = process.env.ONEDRIVE_REDIRECT_URI || `${process.env.BACKEND_URL}/api/storage/onedrive/callback`;

// Microsoft Graph API endpoints
const GRAPH_API_URL = 'https://graph.microsoft.com/v1.0';
const MS_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MS_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

// Scopes required for OneDrive operations
const SCOPES = [
    'offline_access',
    'Files.ReadWrite',
    'Files.ReadWrite.All',
    'User.Read'
];

class OneDriveService {
    constructor() {
        this.configured = !!(ONEDRIVE_CLIENT_ID && ONEDRIVE_CLIENT_SECRET);
    }

    /**
     * Check if OneDrive is configured
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
            throw CustomException('OneDrive not configured. Please set ONEDRIVE_CLIENT_ID and ONEDRIVE_CLIENT_SECRET', 500);
        }

        const state = Buffer.from(JSON.stringify({ userId, provider: 'onedrive' })).toString('base64');

        const authUrl = `${MS_AUTH_URL}?` + new URLSearchParams({
            client_id: ONEDRIVE_CLIENT_ID,
            redirect_uri: ONEDRIVE_REDIRECT_URI,
            response_type: 'code',
            scope: SCOPES.join(' '),
            state,
            response_mode: 'query'
        }).toString();

        logger.info('OneDrive auth URL generated', { userId });

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
            throw CustomException('OneDrive not configured', 500);
        }

        try {
            // Exchange code for tokens
            const tokenResponse = await axios.post(
                MS_TOKEN_URL,
                new URLSearchParams({
                    client_id: ONEDRIVE_CLIENT_ID,
                    client_secret: ONEDRIVE_CLIENT_SECRET,
                    code,
                    redirect_uri: ONEDRIVE_REDIRECT_URI,
                    grant_type: 'authorization_code'
                }).toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            const { access_token, refresh_token, expires_in } = tokenResponse.data;

            // Get user info
            const userInfo = await axios.get(`${GRAPH_API_URL}/me`, {
                headers: {
                    'Authorization': `Bearer ${access_token}`
                }
            });

            // Encrypt and store tokens
            const encryptedTokens = {
                access_token: encrypt(access_token),
                refresh_token: refresh_token ? encrypt(refresh_token) : null,
                expiry_date: Date.now() + (expires_in * 1000)
            };

            await cacheService.set(
                `cloud_storage:onedrive:${userId}:tokens`,
                encryptedTokens,
                86400 * 30 // 30 days
            );

            logger.info('OneDrive OAuth callback successful', {
                userId,
                email: userInfo.data.mail || userInfo.data.userPrincipalName
            });

            return {
                success: true,
                accountEmail: userInfo.data.mail || userInfo.data.userPrincipalName,
                accountName: userInfo.data.displayName,
                accountId: userInfo.data.id
            };
        } catch (error) {
            logger.error('OneDrive OAuth callback failed', {
                userId,
                error: error.message
            });
            throw CustomException('Failed to authenticate with OneDrive: ' + error.message, 400);
        }
    }

    /**
     * Refresh access token
     * @param {string} userId - User ID
     * @returns {Promise<string>} - New access token
     */
    async refreshToken(userId) {
        const storedTokens = await cacheService.get(`cloud_storage:onedrive:${userId}:tokens`);

        if (!storedTokens || !storedTokens.refresh_token) {
            throw CustomException('No refresh token available. Please reconnect to OneDrive.', 401);
        }

        try {
            const response = await axios.post(
                MS_TOKEN_URL,
                new URLSearchParams({
                    client_id: ONEDRIVE_CLIENT_ID,
                    client_secret: ONEDRIVE_CLIENT_SECRET,
                    refresh_token: decrypt(storedTokens.refresh_token),
                    grant_type: 'refresh_token'
                }).toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            const { access_token, refresh_token, expires_in } = response.data;

            // Update stored tokens
            const encryptedTokens = {
                access_token: encrypt(access_token),
                refresh_token: refresh_token ? encrypt(refresh_token) : storedTokens.refresh_token,
                expiry_date: Date.now() + (expires_in * 1000)
            };

            await cacheService.set(
                `cloud_storage:onedrive:${userId}:tokens`,
                encryptedTokens,
                86400 * 30 // 30 days
            );

            logger.info('OneDrive token refreshed', { userId });

            return access_token;
        } catch (error) {
            logger.error('Failed to refresh OneDrive token', {
                userId,
                error: error.message
            });
            throw CustomException('Failed to refresh token. Please reconnect to OneDrive.', 401);
        }
    }

    /**
     * Get access token
     * @param {string} userId - User ID
     * @returns {Promise<string>} - Access token
     */
    async getAccessToken(userId) {
        const storedTokens = await cacheService.get(`cloud_storage:onedrive:${userId}:tokens`);

        if (!storedTokens) {
            throw CustomException('Not connected to OneDrive. Please connect first.', 401);
        }

        // Check if token is expired
        if (storedTokens.expiry_date && storedTokens.expiry_date < Date.now()) {
            return await this.refreshToken(userId);
        }

        return decrypt(storedTokens.access_token);
    }

    /**
     * Make authenticated API request
     * @param {string} userId - User ID
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request data
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - Response data
     */
    async apiRequest(userId, method, endpoint, data = null, options = {}) {
        let accessToken = await this.getAccessToken(userId);

        try {
            const response = await axios({
                method,
                url: `${GRAPH_API_URL}${endpoint}`,
                data,
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
                const response = await axios({
                    method,
                    url: `${GRAPH_API_URL}${endpoint}`,
                    data,
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
     * Connect to OneDrive (handled by OAuth callback)
     * @param {string} userId - User ID
     * @param {Object} credentials - OAuth credentials
     * @returns {Promise<Object>} - Connection result
     */
    async connect(userId, credentials) {
        return await this.handleCallback(credentials.code, userId);
    }

    /**
     * Disconnect from OneDrive
     * @param {string} userId - User ID
     */
    async disconnect(userId) {
        await cacheService.del(`cloud_storage:onedrive:${userId}:tokens`);
        logger.info('OneDrive disconnected', { userId });
    }

    /**
     * Check if user is connected
     * @param {string} userId - User ID
     * @returns {Promise<boolean>}
     */
    async isConnected(userId) {
        const tokens = await cacheService.get(`cloud_storage:onedrive:${userId}:tokens`);
        return !!tokens;
    }

    // ═══════════════════════════════════════════════════════════════
    // FILE OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * List files
     * @param {string} userId - User ID
     * @param {string} itemId - Item ID (optional, default: root)
     * @param {Object} options - List options
     * @returns {Promise<Object>} - List of files
     */
    async listFiles(userId, itemId = 'root', options = {}) {
        try {
            const endpoint = itemId === 'root' || !itemId
                ? '/me/drive/root/children'
                : `/me/drive/items/${itemId}/children`;

            const result = await this.apiRequest(userId, 'GET', endpoint, null, {
                params: {
                    $top: options.pageSize || 100,
                    $select: 'id,name,size,folder,file,createdDateTime,lastModifiedDateTime,webUrl,@microsoft.graph.downloadUrl'
                }
            });

            return {
                files: result.value.map(item => ({
                    id: item.id,
                    name: item.name,
                    isFolder: !!item.folder,
                    size: item.size || 0,
                    mimeType: item.file?.mimeType || (item.folder ? 'folder' : 'file'),
                    createdAt: new Date(item.createdDateTime),
                    modifiedAt: new Date(item.lastModifiedDateTime),
                    webUrl: item.webUrl,
                    downloadUrl: item['@microsoft.graph.downloadUrl']
                })),
                nextLink: result['@odata.nextLink'] || null
            };
        } catch (error) {
            logger.error('Failed to list OneDrive files', {
                userId,
                itemId,
                error: error.message
            });
            throw CustomException('Failed to list files: ' + error.message, 500);
        }
    }

    /**
     * Upload file
     * @param {string} userId - User ID
     * @param {string} parentId - Parent folder ID
     * @param {Object} file - File object
     * @param {Object} options - Upload options
     * @returns {Promise<Object>} - Uploaded file metadata
     */
    async uploadFile(userId, parentId = 'root', file, options = {}) {
        try {
            const accessToken = await this.getAccessToken(userId);
            const fileName = file.originalname;

            const endpoint = parentId === 'root'
                ? `/me/drive/root:/${fileName}:/content`
                : `/me/drive/items/${parentId}:/${fileName}:/content`;

            const response = await axios.put(
                `${GRAPH_API_URL}${endpoint}`,
                file.buffer || file,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': file.mimetype || 'application/octet-stream'
                    }
                }
            );

            return {
                id: response.data.id,
                name: response.data.name,
                size: response.data.size,
                mimeType: response.data.file?.mimeType,
                createdAt: new Date(response.data.createdDateTime),
                modifiedAt: new Date(response.data.lastModifiedDateTime),
                webUrl: response.data.webUrl
            };
        } catch (error) {
            logger.error('Failed to upload file to OneDrive', {
                userId,
                parentId,
                fileName: file.originalname,
                error: error.message
            });
            throw CustomException('Failed to upload file: ' + error.message, 500);
        }
    }

    /**
     * Download file
     * @param {string} userId - User ID
     * @param {string} fileId - File ID
     * @returns {Promise<Object>} - File stream and metadata
     */
    async downloadFile(userId, fileId) {
        try {
            // Get file metadata including download URL
            const metadata = await this.apiRequest(
                userId,
                'GET',
                `/me/drive/items/${fileId}`,
                null,
                {
                    params: {
                        $select: 'id,name,size,file,@microsoft.graph.downloadUrl'
                    }
                }
            );

            // Download file content
            const response = await axios.get(metadata['@microsoft.graph.downloadUrl'], {
                responseType: 'stream'
            });

            return {
                stream: response.data,
                fileName: metadata.name,
                size: metadata.size,
                mimeType: metadata.file?.mimeType || 'application/octet-stream'
            };
        } catch (error) {
            logger.error('Failed to download file from OneDrive', {
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
     * @param {string} fileId - File ID
     */
    async deleteFile(userId, fileId) {
        try {
            await this.apiRequest(userId, 'DELETE', `/me/drive/items/${fileId}`);
            logger.info('File deleted from OneDrive', { userId, fileId });
        } catch (error) {
            logger.error('Failed to delete file from OneDrive', {
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
     * @param {string} fileId - File ID
     * @param {string} fromParentId - Source parent ID
     * @param {string} toParentId - Destination parent ID
     * @returns {Promise<Object>} - Moved file metadata
     */
    async moveFile(userId, fileId, fromParentId, toParentId) {
        try {
            const result = await this.apiRequest(
                userId,
                'PATCH',
                `/me/drive/items/${fileId}`,
                {
                    parentReference: {
                        id: toParentId
                    }
                }
            );

            return {
                id: result.id,
                name: result.name,
                parentId: result.parentReference.id
            };
        } catch (error) {
            logger.error('Failed to move file in OneDrive', {
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
     * @param {string} folderName - Folder name
     * @param {Object} options - Folder options
     * @returns {Promise<Object>} - Created folder metadata
     */
    async createFolder(userId, folderName, options = {}) {
        try {
            const { parentId = 'root' } = options;

            const endpoint = parentId === 'root'
                ? '/me/drive/root/children'
                : `/me/drive/items/${parentId}/children`;

            const result = await this.apiRequest(userId, 'POST', endpoint, {
                name: folderName,
                folder: {},
                '@microsoft.graph.conflictBehavior': 'rename'
            });

            return {
                id: result.id,
                name: result.name,
                isFolder: true,
                createdAt: new Date(result.createdDateTime),
                webUrl: result.webUrl
            };
        } catch (error) {
            logger.error('Failed to create folder in OneDrive', {
                userId,
                folderName,
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
     * @param {string} fileId - File ID
     * @param {Object} shareOptions - Share options
     * @returns {Promise<Object>} - Share result
     */
    async shareFile(userId, fileId, shareOptions) {
        try {
            const { email, role = 'read' } = shareOptions;

            if (email) {
                // Share with specific user
                await this.apiRequest(userId, 'POST', `/me/drive/items/${fileId}/invite`, {
                    requireSignIn: true,
                    sendInvitation: true,
                    roles: [role],
                    recipients: [{
                        email: email
                    }]
                });
            }

            // Create sharing link
            const linkResult = await this.apiRequest(
                userId,
                'POST',
                `/me/drive/items/${fileId}/createLink`,
                {
                    type: email ? 'view' : 'view',
                    scope: email ? 'organization' : 'anonymous'
                }
            );

            return {
                success: true,
                webUrl: linkResult.link.webUrl,
                sharedWith: email || 'public'
            };
        } catch (error) {
            logger.error('Failed to share file in OneDrive', {
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
     * @param {string} fileId - File ID
     * @returns {Promise<Object>} - File metadata
     */
    async getFileMetadata(userId, fileId) {
        try {
            const result = await this.apiRequest(
                userId,
                'GET',
                `/me/drive/items/${fileId}`,
                null,
                {
                    params: {
                        $select: 'id,name,size,folder,file,createdDateTime,lastModifiedDateTime,webUrl,createdBy,lastModifiedBy,parentReference,@microsoft.graph.downloadUrl'
                    }
                }
            );

            return {
                id: result.id,
                name: result.name,
                isFolder: !!result.folder,
                size: result.size || 0,
                mimeType: result.file?.mimeType || (result.folder ? 'folder' : 'file'),
                createdAt: new Date(result.createdDateTime),
                modifiedAt: new Date(result.lastModifiedDateTime),
                webUrl: result.webUrl,
                downloadUrl: result['@microsoft.graph.downloadUrl'],
                createdBy: result.createdBy?.user?.displayName,
                modifiedBy: result.lastModifiedBy?.user?.displayName,
                parentId: result.parentReference?.id
            };
        } catch (error) {
            logger.error('Failed to get file metadata from OneDrive', {
                userId,
                fileId,
                error: error.message
            });
            throw CustomException('Failed to get file metadata: ' + error.message, 500);
        }
    }
}

module.exports = new OneDriveService();
