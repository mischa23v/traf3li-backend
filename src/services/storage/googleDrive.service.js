/**
 * Google Drive Storage Service
 *
 * Provides Google Drive integration for cloud storage:
 * - OAuth 2.0 authentication
 * - File upload, download, delete, move
 * - Folder creation and management
 * - File sharing and permissions
 * - Metadata retrieval
 */

const { google } = require('googleapis');
const { CustomException } = require('../../utils');
const logger = require('../../utils/contextLogger');
const cacheService = require('../cache.service');
const { encrypt, decrypt } = require('../../utils/encryption');

// OAuth2 configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_DRIVE_REDIRECT_URI || `${process.env.BACKEND_URL}/api/storage/google_drive/callback`;

// Scopes required for Drive operations
const SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
];

class GoogleDriveService {
    constructor() {
        this.configured = !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
    }

    /**
     * Check if Google Drive is configured
     * @returns {boolean}
     */
    isConfigured() {
        return this.configured;
    }

    /**
     * Get OAuth2 client
     * @param {Object} credentials - OAuth credentials (optional)
     * @returns {Object} - OAuth2 client
     */
    getOAuth2Client(credentials = null) {
        if (!this.isConfigured()) {
            throw CustomException('Google Drive not configured. Please set GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET', 500);
        }

        const oauth2Client = new google.auth.OAuth2(
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET,
            GOOGLE_REDIRECT_URI
        );

        if (credentials) {
            oauth2Client.setCredentials(credentials);
        }

        return oauth2Client;
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
        const oauth2Client = this.getOAuth2Client();

        const state = Buffer.from(JSON.stringify({ userId, provider: 'google_drive' })).toString('base64');

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            state,
            prompt: 'consent' // Force consent to get refresh token
        });

        logger.info('Google Drive auth URL generated', { userId });

        return authUrl;
    }

    /**
     * Handle OAuth callback and exchange code for tokens
     * @param {string} code - Authorization code
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - Token and account info
     */
    async handleCallback(code, userId) {
        const oauth2Client = this.getOAuth2Client();

        try {
            // Exchange code for tokens
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);

            // Get user info
            const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
            const { data: userInfo } = await oauth2.userinfo.get();

            // Encrypt and store tokens
            const encryptedTokens = {
                access_token: encrypt(tokens.access_token),
                refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
                expiry_date: tokens.expiry_date
            };

            await cacheService.set(
                `cloud_storage:google_drive:${userId}:tokens`,
                encryptedTokens,
                86400 * 30 // 30 days
            );

            logger.info('Google Drive OAuth callback successful', {
                userId,
                email: userInfo.email
            });

            return {
                success: true,
                accountEmail: userInfo.email,
                accountName: userInfo.name,
                picture: userInfo.picture,
                expiresAt: new Date(tokens.expiry_date)
            };
        } catch (error) {
            logger.error('Google Drive OAuth callback failed', {
                userId,
                error: error.message
            });
            throw CustomException('Failed to authenticate with Google Drive: ' + error.message, 400);
        }
    }

    /**
     * Refresh access token
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - New tokens
     */
    async refreshToken(userId) {
        const storedTokens = await cacheService.get(`cloud_storage:google_drive:${userId}:tokens`);

        if (!storedTokens || !storedTokens.refresh_token) {
            throw CustomException('No refresh token available. Please reconnect to Google Drive.', 401);
        }

        const oauth2Client = this.getOAuth2Client({
            access_token: decrypt(storedTokens.access_token),
            refresh_token: decrypt(storedTokens.refresh_token),
            expiry_date: storedTokens.expiry_date
        });

        try {
            const { credentials } = await oauth2Client.refreshAccessToken();

            // Update stored tokens
            const encryptedTokens = {
                access_token: encrypt(credentials.access_token),
                refresh_token: storedTokens.refresh_token, // Keep existing refresh token
                expiry_date: credentials.expiry_date
            };

            await cacheService.set(
                `cloud_storage:google_drive:${userId}:tokens`,
                encryptedTokens,
                86400 * 30 // 30 days
            );

            logger.info('Google Drive token refreshed', { userId });

            return credentials;
        } catch (error) {
            logger.error('Failed to refresh Google Drive token', {
                userId,
                error: error.message
            });
            throw CustomException('Failed to refresh token. Please reconnect to Google Drive.', 401);
        }
    }

    /**
     * Get authenticated Drive client
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - Drive client
     */
    async getDriveClient(userId) {
        const storedTokens = await cacheService.get(`cloud_storage:google_drive:${userId}:tokens`);

        if (!storedTokens) {
            throw CustomException('Not connected to Google Drive. Please connect first.', 401);
        }

        const credentials = {
            access_token: decrypt(storedTokens.access_token),
            refresh_token: storedTokens.refresh_token ? decrypt(storedTokens.refresh_token) : null,
            expiry_date: storedTokens.expiry_date
        };

        // Check if token is expired
        if (credentials.expiry_date && credentials.expiry_date < Date.now()) {
            await this.refreshToken(userId);
            return this.getDriveClient(userId); // Recursive call with new token
        }

        const oauth2Client = this.getOAuth2Client(credentials);
        return google.drive({ version: 'v3', auth: oauth2Client });
    }

    // ═══════════════════════════════════════════════════════════════
    // CONNECTION MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Connect to Google Drive (handled by OAuth callback)
     * @param {string} userId - User ID
     * @param {Object} credentials - OAuth credentials
     * @returns {Promise<Object>} - Connection result
     */
    async connect(userId, credentials) {
        // Connection is handled by OAuth flow
        return await this.handleCallback(credentials.code, userId);
    }

    /**
     * Disconnect from Google Drive
     * @param {string} userId - User ID
     */
    async disconnect(userId) {
        await cacheService.del(`cloud_storage:google_drive:${userId}:tokens`);
        logger.info('Google Drive disconnected', { userId });
    }

    /**
     * Check if user is connected
     * @param {string} userId - User ID
     * @returns {Promise<boolean>}
     */
    async isConnected(userId) {
        const tokens = await cacheService.get(`cloud_storage:google_drive:${userId}:tokens`);
        return !!tokens;
    }

    // ═══════════════════════════════════════════════════════════════
    // FILE OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * List files
     * @param {string} userId - User ID
     * @param {string} folderId - Folder ID (optional)
     * @param {Object} options - List options
     * @returns {Promise<Object>} - List of files
     */
    async listFiles(userId, folderId = 'root', options = {}) {
        const drive = await this.getDriveClient(userId);
        const { pageSize = 100, pageToken, query } = options;

        try {
            let q = `'${folderId}' in parents and trashed=false`;
            if (query) {
                q += ` and name contains '${query}'`;
            }

            const response = await drive.files.list({
                q,
                pageSize,
                pageToken,
                fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, thumbnailLink, iconLink)',
                orderBy: 'modifiedTime desc'
            });

            return {
                files: response.data.files.map(file => ({
                    id: file.id,
                    name: file.name,
                    mimeType: file.mimeType,
                    size: file.size ? parseInt(file.size) : 0,
                    isFolder: file.mimeType === 'application/vnd.google-apps.folder',
                    createdAt: new Date(file.createdTime),
                    modifiedAt: new Date(file.modifiedTime),
                    webViewLink: file.webViewLink,
                    thumbnailLink: file.thumbnailLink,
                    iconLink: file.iconLink
                })),
                nextPageToken: response.data.nextPageToken || null
            };
        } catch (error) {
            logger.error('Failed to list Google Drive files', {
                userId,
                folderId,
                error: error.message
            });
            throw CustomException('Failed to list files: ' + error.message, 500);
        }
    }

    /**
     * Upload file
     * @param {string} userId - User ID
     * @param {string} folderId - Folder ID
     * @param {Object} file - File object
     * @param {Object} options - Upload options
     * @returns {Promise<Object>} - Uploaded file metadata
     */
    async uploadFile(userId, folderId = 'root', file, options = {}) {
        const drive = await this.getDriveClient(userId);

        try {
            const fileMetadata = {
                name: file.originalname,
                parents: [folderId]
            };

            const media = {
                mimeType: file.mimetype,
                body: file.buffer ? require('stream').Readable.from(file.buffer) : file
            };

            const response = await drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink'
            });

            return {
                id: response.data.id,
                name: response.data.name,
                mimeType: response.data.mimeType,
                size: response.data.size ? parseInt(response.data.size) : 0,
                createdAt: new Date(response.data.createdTime),
                modifiedAt: new Date(response.data.modifiedTime),
                webViewLink: response.data.webViewLink
            };
        } catch (error) {
            logger.error('Failed to upload file to Google Drive', {
                userId,
                folderId,
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
        const drive = await this.getDriveClient(userId);

        try {
            // Get file metadata
            const metadata = await drive.files.get({
                fileId,
                fields: 'id, name, mimeType, size'
            });

            // Download file content
            const response = await drive.files.get(
                { fileId, alt: 'media' },
                { responseType: 'stream' }
            );

            return {
                stream: response.data,
                fileName: metadata.data.name,
                mimeType: metadata.data.mimeType,
                size: metadata.data.size ? parseInt(metadata.data.size) : 0
            };
        } catch (error) {
            logger.error('Failed to download file from Google Drive', {
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
        const drive = await this.getDriveClient(userId);

        try {
            await drive.files.delete({ fileId });
            logger.info('File deleted from Google Drive', { userId, fileId });
        } catch (error) {
            logger.error('Failed to delete file from Google Drive', {
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
        const drive = await this.getDriveClient(userId);

        try {
            const response = await drive.files.update({
                fileId,
                addParents: toParentId,
                removeParents: fromParentId,
                fields: 'id, name, parents'
            });

            return {
                id: response.data.id,
                name: response.data.name,
                parents: response.data.parents
            };
        } catch (error) {
            logger.error('Failed to move file in Google Drive', {
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
        const drive = await this.getDriveClient(userId);
        const { parentId = 'root' } = options;

        try {
            const fileMetadata = {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentId]
            };

            const response = await drive.files.create({
                resource: fileMetadata,
                fields: 'id, name, mimeType, createdTime'
            });

            return {
                id: response.data.id,
                name: response.data.name,
                isFolder: true,
                createdAt: new Date(response.data.createdTime)
            };
        } catch (error) {
            logger.error('Failed to create folder in Google Drive', {
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
        const drive = await this.getDriveClient(userId);
        const { email, role = 'reader', type = 'user' } = shareOptions;

        try {
            // Create permission
            if (email) {
                await drive.permissions.create({
                    fileId,
                    requestBody: {
                        type,
                        role,
                        emailAddress: email
                    },
                    sendNotificationEmail: true
                });
            } else {
                // Public link
                await drive.permissions.create({
                    fileId,
                    requestBody: {
                        type: 'anyone',
                        role: 'reader'
                    }
                });
            }

            // Get shareable link
            const file = await drive.files.get({
                fileId,
                fields: 'webViewLink, webContentLink'
            });

            return {
                success: true,
                webViewLink: file.data.webViewLink,
                webContentLink: file.data.webContentLink,
                sharedWith: email || 'public'
            };
        } catch (error) {
            logger.error('Failed to share file in Google Drive', {
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
        const drive = await this.getDriveClient(userId);

        try {
            const response = await drive.files.get({
                fileId,
                fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, thumbnailLink, iconLink, owners, permissions'
            });

            return {
                id: response.data.id,
                name: response.data.name,
                mimeType: response.data.mimeType,
                size: response.data.size ? parseInt(response.data.size) : 0,
                isFolder: response.data.mimeType === 'application/vnd.google-apps.folder',
                createdAt: new Date(response.data.createdTime),
                modifiedAt: new Date(response.data.modifiedTime),
                webViewLink: response.data.webViewLink,
                webContentLink: response.data.webContentLink,
                thumbnailLink: response.data.thumbnailLink,
                iconLink: response.data.iconLink,
                owners: response.data.owners,
                permissions: response.data.permissions
            };
        } catch (error) {
            logger.error('Failed to get file metadata from Google Drive', {
                userId,
                fileId,
                error: error.message
            });
            throw CustomException('Failed to get file metadata: ' + error.message, 500);
        }
    }
}

module.exports = new GoogleDriveService();
