const { google } = require('googleapis');
const GmailIntegration = require('../models/gmailIntegration.model');
const Client = require('../models/client.model');
const { CustomException } = require('../utils');
const logger = require('../utils/contextLogger');
const crypto = require('crypto');

const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    BACKEND_URL,
    API_URL
} = process.env;

// Validate required environment variables
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    logger.warn('Gmail integration not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables.');
}

const REDIRECT_URI = `${BACKEND_URL || API_URL || 'http://localhost:5000'}/api/gmail/callback`;

/**
 * Gmail Service
 *
 * Handles OAuth flow, email operations, and synchronization
 * between Gmail and TRAF3LI.
 */
class GmailService {
    /**
     * Create OAuth2 client
     */
    createOAuth2Client() {
        return new google.auth.OAuth2(
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET,
            REDIRECT_URI
        );
    }

    /**
     * Get authenticated OAuth2 client for user
     */
    async getAuthenticatedClient(userId, firmId = null) {
        const integration = await GmailIntegration.findActiveIntegration(userId, firmId);

        if (!integration) {
            throw CustomException('Gmail not connected', 404);
        }

        const oauth2Client = this.createOAuth2Client();

        // Check if token is expired or expiring soon
        if (integration.isTokenExpiringSoon()) {
            // Refresh token
            await this.refreshToken(userId, firmId);

            // Reload integration with fresh tokens
            const refreshedIntegration = await GmailIntegration.findActiveIntegration(userId, firmId);
            oauth2Client.setCredentials({
                access_token: refreshedIntegration.accessToken,
                refresh_token: refreshedIntegration.refreshToken,
                token_type: refreshedIntegration.tokenType,
                expiry_date: refreshedIntegration.expiresAt.getTime()
            });
        } else {
            oauth2Client.setCredentials({
                access_token: integration.accessToken,
                refresh_token: integration.refreshToken,
                token_type: integration.tokenType,
                expiry_date: integration.expiresAt.getTime()
            });
        }

        return oauth2Client;
    }

    // ═══════════════════════════════════════════════════════════════
    // OAUTH FLOW
    // ═══════════════════════════════════════════════════════════════

    /**
     * Generate OAuth URL for user to authorize
     * @param {string} userId - User ID
     * @param {string} firmId - Firm ID
     * @returns {string} Authorization URL
     */
    async getAuthUrl(userId, firmId = null) {
        const oauth2Client = this.createOAuth2Client();

        // Generate state for CSRF protection
        const state = crypto.randomBytes(32).toString('hex');

        // Store state in integration (temporary)
        const stateData = {
            userId,
            firmId,
            timestamp: Date.now()
        };

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent', // Force consent to get refresh token
            scope: [
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/gmail.send',
                'https://www.googleapis.com/auth/gmail.compose',
                'https://www.googleapis.com/auth/gmail.modify',
                'https://www.googleapis.com/auth/gmail.labels',
                'https://mail.google.com/'
            ],
            state: Buffer.from(JSON.stringify(stateData)).toString('base64')
        });

        return authUrl;
    }

    /**
     * Handle OAuth callback
     * @param {string} code - Authorization code
     * @param {string} state - State parameter
     * @returns {object} Integration result
     */
    async handleCallback(code, state) {
        // Decode state
        let stateData;
        try {
            stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        } catch (error) {
            throw CustomException('Invalid state parameter', 400);
        }

        const { userId, firmId, timestamp } = stateData;

        // Validate state timestamp (prevent replay attacks)
        const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
        if (timestamp < fifteenMinutesAgo) {
            throw CustomException('Authorization expired. Please try again.', 400);
        }

        const oauth2Client = this.createOAuth2Client();

        try {
            // Exchange code for tokens
            const { tokens } = await oauth2Client.getToken(code);

            // Calculate token expiry
            const expiresAt = new Date(tokens.expiry_date || (Date.now() + 3600 * 1000));

            // Get user's email address
            oauth2Client.setCredentials(tokens);
            const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
            const { data: profile } = await gmail.users.getProfile({ userId: 'me' });

            // Find or create integration
            let integration = await GmailIntegration.findOne({ userId, firmId });

            if (integration) {
                // Update existing integration
                integration.accessToken = tokens.access_token;
                integration.refreshToken = tokens.refresh_token || integration.refreshToken;
                integration.tokenType = tokens.token_type || 'Bearer';
                integration.expiresAt = expiresAt;
                integration.scope = tokens.scope;
                integration.email = profile.emailAddress;
                integration.historyId = profile.historyId;
                integration.isActive = true;
                integration.connectedAt = new Date();
                integration.disconnectedAt = null;
                integration.disconnectedBy = null;
                integration.disconnectReason = null;
                await integration.save();
            } else {
                // Create new integration
                integration = await GmailIntegration.create({
                    userId,
                    firmId,
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    tokenType: tokens.token_type || 'Bearer',
                    expiresAt,
                    scope: tokens.scope,
                    email: profile.emailAddress,
                    historyId: profile.historyId,
                    isActive: true,
                    connectedAt: new Date()
                });
            }

            logger.info('Gmail connected successfully', { userId, firmId, email: profile.emailAddress });

            return {
                success: true,
                integration: integration.toObject()
            };
        } catch (error) {
            logger.error('Gmail OAuth callback failed', {
                error: error.message,
                userId,
                firmId
            });

            throw CustomException('Failed to connect Gmail', 500);
        }
    }

    /**
     * Refresh access token
     * @param {string} userId - User ID
     * @param {string} firmId - Firm ID
     * @returns {object} New tokens
     */
    async refreshToken(userId, firmId = null) {
        const integration = await GmailIntegration.findActiveIntegration(userId, firmId);

        if (!integration) {
            throw CustomException('Gmail not connected', 404);
        }

        if (!integration.refreshToken) {
            throw CustomException('No refresh token available. Please reconnect Gmail.', 400);
        }

        const oauth2Client = this.createOAuth2Client();
        oauth2Client.setCredentials({
            refresh_token: integration.refreshToken
        });

        try {
            const { credentials } = await oauth2Client.refreshAccessToken();

            // Update integration with new tokens
            integration.accessToken = credentials.access_token;
            if (credentials.refresh_token) {
                integration.refreshToken = credentials.refresh_token;
            }
            integration.expiresAt = new Date(credentials.expiry_date);
            integration.tokenType = credentials.token_type || 'Bearer';
            await integration.save();

            logger.info('Gmail token refreshed', { userId, firmId });

            return {
                success: true,
                expiresAt: integration.expiresAt
            };
        } catch (error) {
            logger.error('Failed to refresh Gmail token', {
                error: error.message,
                userId,
                firmId
            });

            // Mark as disconnected if refresh fails
            await integration.disconnect(userId, 'Token refresh failed');

            throw CustomException('Failed to refresh token. Please reconnect Gmail.', 401);
        }
    }

    /**
     * Disconnect Gmail
     * @param {string} userId - User ID
     * @param {string} firmId - Firm ID
     * @returns {object} Result
     */
    async disconnect(userId, firmId = null) {
        const integration = await GmailIntegration.findOne({ userId, firmId });

        if (!integration) {
            throw CustomException('Gmail not connected', 404);
        }

        // Revoke token with Google
        try {
            const oauth2Client = this.createOAuth2Client();
            oauth2Client.setCredentials({
                access_token: integration.accessToken
            });

            await oauth2Client.revokeToken(integration.accessToken);
        } catch (error) {
            logger.warn('Failed to revoke Google token', { error: error.message });
            // Continue with disconnection even if revocation fails
        }

        // Stop watch if exists
        if (integration.watchExpiration && new Date() < integration.watchExpiration) {
            try {
                await this.stopWatch(userId, firmId);
            } catch (error) {
                logger.warn('Failed to stop Gmail watch', { error: error.message });
            }
        }

        await integration.disconnect(userId, 'User disconnected');

        logger.info('Gmail disconnected', { userId, firmId });

        return { success: true };
    }

    // ═══════════════════════════════════════════════════════════════
    // EMAIL OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * List messages
     * @param {string} userId - User ID
     * @param {object} options - Query options
     * @param {string} firmId - Firm ID
     * @returns {array} List of messages
     */
    async listMessages(userId, options = {}, firmId = null) {
        const oauth2Client = await this.getAuthenticatedClient(userId, firmId);
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        const {
            maxResults = 50,
            pageToken,
            q = '',
            labelIds = []
        } = options;

        try {
            const { data } = await gmail.users.messages.list({
                userId: 'me',
                maxResults,
                pageToken,
                q,
                labelIds: labelIds.length > 0 ? labelIds : undefined
            });

            return {
                messages: data.messages || [],
                nextPageToken: data.nextPageToken,
                resultSizeEstimate: data.resultSizeEstimate
            };
        } catch (error) {
            logger.error('Failed to list Gmail messages', { error: error.message, userId });
            throw CustomException('Failed to fetch emails from Gmail', 500);
        }
    }

    /**
     * Get message details
     * @param {string} userId - User ID
     * @param {string} messageId - Message ID
     * @param {string} firmId - Firm ID
     * @returns {object} Message details
     */
    async getMessage(userId, messageId, firmId = null) {
        const oauth2Client = await this.getAuthenticatedClient(userId, firmId);
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        try {
            const { data } = await gmail.users.messages.get({
                userId: 'me',
                id: messageId,
                format: 'full'
            });

            return this.parseMessage(data);
        } catch (error) {
            logger.error('Failed to get Gmail message', { error: error.message, userId, messageId });
            throw CustomException('Failed to fetch email from Gmail', 500);
        }
    }

    /**
     * Send email
     * @param {string} userId - User ID
     * @param {object} emailData - Email data
     * @param {string} firmId - Firm ID
     * @returns {object} Sent message
     */
    async sendEmail(userId, emailData, firmId = null) {
        const oauth2Client = await this.getAuthenticatedClient(userId, firmId);
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        const rawMessage = this.createRawMessage(emailData);

        try {
            const { data } = await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: rawMessage
                }
            });

            logger.info('Email sent via Gmail', { userId, messageId: data.id });

            return data;
        } catch (error) {
            logger.error('Failed to send Gmail message', { error: error.message, userId });
            throw CustomException('Failed to send email via Gmail', 500);
        }
    }

    /**
     * Reply to email
     * @param {string} userId - User ID
     * @param {string} messageId - Original message ID
     * @param {object} replyData - Reply data
     * @param {string} firmId - Firm ID
     * @returns {object} Sent reply
     */
    async replyToEmail(userId, messageId, replyData, firmId = null) {
        const oauth2Client = await this.getAuthenticatedClient(userId, firmId);
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Get original message to extract thread ID and headers
        const { data: originalMessage } = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'metadata',
            metadataHeaders: ['Message-ID', 'References', 'In-Reply-To', 'Subject']
        });

        const headers = this.getHeaders(originalMessage);
        const rawMessage = this.createRawMessage({
            ...replyData,
            threadId: originalMessage.threadId,
            inReplyTo: headers['message-id'],
            references: headers['references'] ? `${headers['references']} ${headers['message-id']}` : headers['message-id'],
            subject: replyData.subject || `Re: ${headers['subject'] || ''}`
        });

        try {
            const { data } = await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: rawMessage,
                    threadId: originalMessage.threadId
                }
            });

            logger.info('Reply sent via Gmail', { userId, messageId: data.id, threadId: data.threadId });

            return data;
        } catch (error) {
            logger.error('Failed to send Gmail reply', { error: error.message, userId });
            throw CustomException('Failed to send reply via Gmail', 500);
        }
    }

    /**
     * Create draft
     * @param {string} userId - User ID
     * @param {object} emailData - Email data
     * @param {string} firmId - Firm ID
     * @returns {object} Created draft
     */
    async createDraft(userId, emailData, firmId = null) {
        const oauth2Client = await this.getAuthenticatedClient(userId, firmId);
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        const rawMessage = this.createRawMessage(emailData);

        try {
            const { data } = await gmail.users.drafts.create({
                userId: 'me',
                requestBody: {
                    message: {
                        raw: rawMessage
                    }
                }
            });

            logger.info('Draft created in Gmail', { userId, draftId: data.id });

            return data;
        } catch (error) {
            logger.error('Failed to create Gmail draft', { error: error.message, userId });
            throw CustomException('Failed to create draft in Gmail', 500);
        }
    }

    /**
     * List drafts
     * @param {string} userId - User ID
     * @param {string} firmId - Firm ID
     * @returns {array} List of drafts
     */
    async listDrafts(userId, firmId = null) {
        const oauth2Client = await this.getAuthenticatedClient(userId, firmId);
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        try {
            const { data } = await gmail.users.drafts.list({
                userId: 'me'
            });

            return data.drafts || [];
        } catch (error) {
            logger.error('Failed to list Gmail drafts', { error: error.message, userId });
            throw CustomException('Failed to fetch drafts from Gmail', 500);
        }
    }

    /**
     * Search messages
     * @param {string} userId - User ID
     * @param {string} query - Search query
     * @param {object} options - Additional options
     * @param {string} firmId - Firm ID
     * @returns {array} Search results
     */
    async searchMessages(userId, query, options = {}, firmId = null) {
        return await this.listMessages(userId, { ...options, q: query }, firmId);
    }

    /**
     * Get email threads
     * @param {string} userId - User ID
     * @param {string} threadId - Thread ID
     * @param {string} firmId - Firm ID
     * @returns {object} Thread details
     */
    async getThread(userId, threadId, firmId = null) {
        const oauth2Client = await this.getAuthenticatedClient(userId, firmId);
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        try {
            const { data } = await gmail.users.threads.get({
                userId: 'me',
                id: threadId,
                format: 'full'
            });

            return {
                id: data.id,
                historyId: data.historyId,
                messages: data.messages.map(msg => this.parseMessage(msg))
            };
        } catch (error) {
            logger.error('Failed to get Gmail thread', { error: error.message, userId, threadId });
            throw CustomException('Failed to fetch thread from Gmail', 500);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // LABEL OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get labels
     * @param {string} userId - User ID
     * @param {string} firmId - Firm ID
     * @returns {array} List of labels
     */
    async getLabels(userId, firmId = null) {
        const oauth2Client = await this.getAuthenticatedClient(userId, firmId);
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        try {
            const { data } = await gmail.users.labels.list({
                userId: 'me'
            });

            return data.labels || [];
        } catch (error) {
            logger.error('Failed to get Gmail labels', { error: error.message, userId });
            throw CustomException('Failed to fetch labels from Gmail', 500);
        }
    }

    /**
     * Create label
     * @param {string} userId - User ID
     * @param {object} labelData - Label data
     * @param {string} firmId - Firm ID
     * @returns {object} Created label
     */
    async createLabel(userId, labelData, firmId = null) {
        const oauth2Client = await this.getAuthenticatedClient(userId, firmId);
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        try {
            const { data } = await gmail.users.labels.create({
                userId: 'me',
                requestBody: {
                    name: labelData.name,
                    labelListVisibility: labelData.labelListVisibility || 'labelShow',
                    messageListVisibility: labelData.messageListVisibility || 'show'
                }
            });

            logger.info('Label created in Gmail', { userId, labelId: data.id, name: data.name });

            return data;
        } catch (error) {
            logger.error('Failed to create Gmail label', { error: error.message, userId });
            throw CustomException('Failed to create label in Gmail', 500);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // PUSH NOTIFICATIONS (WATCH)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Set up push notifications for mailbox changes
     * @param {string} userId - User ID
     * @param {string} firmId - Firm ID
     * @returns {object} Watch response
     */
    async setupWatch(userId, firmId = null) {
        const oauth2Client = await this.getAuthenticatedClient(userId, firmId);
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        const integration = await GmailIntegration.findActiveIntegration(userId, firmId);

        const topicName = process.env.GMAIL_PUBSUB_TOPIC || 'projects/YOUR_PROJECT/topics/gmail-notifications';

        try {
            const { data } = await gmail.users.watch({
                userId: 'me',
                requestBody: {
                    topicName,
                    labelIds: ['INBOX']
                }
            });

            // Update integration with watch details
            await integration.updateWatchExpiration(data.expiration, data.historyId);

            logger.info('Gmail watch set up', { userId, firmId, expiration: data.expiration });

            return data;
        } catch (error) {
            logger.error('Failed to set up Gmail watch', {
                error: error.message,
                userId,
                firmId
            });
            throw CustomException('Failed to set up Gmail notifications', 500);
        }
    }

    /**
     * Stop push notifications
     * @param {string} userId - User ID
     * @param {string} firmId - Firm ID
     * @returns {object} Result
     */
    async stopWatch(userId, firmId = null) {
        const oauth2Client = await this.getAuthenticatedClient(userId, firmId);
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        const integration = await GmailIntegration.findActiveIntegration(userId, firmId);

        try {
            await gmail.users.stop({
                userId: 'me'
            });

            // Clear watch expiration
            integration.watchExpiration = null;
            integration.watchHistoryId = null;
            await integration.save();

            logger.info('Gmail watch stopped', { userId, firmId });

            return { success: true };
        } catch (error) {
            logger.error('Failed to stop Gmail watch', {
                error: error.message,
                userId,
                firmId
            });
            throw CustomException('Failed to stop Gmail notifications', 500);
        }
    }

    /**
     * Handle push notification webhook
     * @param {object} notification - Pub/Sub notification
     * @returns {object} Result
     */
    async handleWebhook(notification) {
        try {
            // Decode the Pub/Sub message
            const message = notification.message;
            const data = message.data
                ? JSON.parse(Buffer.from(message.data, 'base64').toString())
                : {};

            const { emailAddress, historyId } = data;

            if (!emailAddress || !historyId) {
                logger.warn('Invalid Gmail webhook notification', { data });
                return { success: false, message: 'Invalid notification' };
            }

            // Find integration by email
            const integration = await GmailIntegration.findOne({
                email: emailAddress,
                isActive: true
            });

            if (!integration) {
                logger.warn('Gmail webhook received for unknown email', { emailAddress });
                return { success: false, message: 'Unknown email address' };
            }

            logger.info('Gmail webhook received', {
                email: emailAddress,
                historyId,
                userId: integration.userId
            });

            // Process history changes (implement sync logic here)
            // This would typically queue a background job to sync new emails
            // await this.syncHistoryChanges(integration.userId, integration.firmId, historyId);

            return { success: true };
        } catch (error) {
            logger.error('Failed to handle Gmail webhook', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CLIENT/CASE LINKING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Link email to client by email address
     * @param {string} emailAddress - Email address to search
     * @param {string} firmId - Firm ID
     * @returns {object|null} Linked client
     */
    async linkEmailToClient(emailAddress, firmId = null) {
        try {
            const client = await Client.findOne({
                firmId,
                $or: [
                    { email: emailAddress },
                    { 'contactInfo.email': emailAddress }
                ]
            });

            return client;
        } catch (error) {
            logger.error('Failed to link email to client', { error: error.message, emailAddress });
            return null;
        }
    }

    /**
     * Update sync settings
     * @param {string} userId - User ID
     * @param {object} settings - Settings to update
     * @param {string} firmId - Firm ID
     * @returns {object} Updated settings
     */
    async updateSettings(userId, settings, firmId = null) {
        const integration = await GmailIntegration.findActiveIntegration(userId, firmId);

        if (!integration) {
            throw CustomException('Gmail not connected', 404);
        }

        // Update sync settings
        if (settings.labelsToSync !== undefined) integration.syncSettings.labelsToSync = settings.labelsToSync;
        if (settings.skipLabels !== undefined) integration.syncSettings.skipLabels = settings.skipLabels;
        if (settings.autoLinkToClients !== undefined) integration.syncSettings.autoLinkToClients = settings.autoLinkToClients;
        if (settings.autoLinkToCases !== undefined) integration.syncSettings.autoLinkToCases = settings.autoLinkToCases;
        if (settings.syncAttachments !== undefined) integration.syncSettings.syncAttachments = settings.syncAttachments;
        if (settings.maxAttachmentSize !== undefined) integration.syncSettings.maxAttachmentSize = settings.maxAttachmentSize;
        if (settings.syncSent !== undefined) integration.syncSettings.syncSent = settings.syncSent;
        if (settings.syncReceived !== undefined) integration.syncSettings.syncReceived = settings.syncReceived;
        if (settings.autoArchive !== undefined) integration.syncSettings.autoArchive = settings.autoArchive;

        await integration.save();

        logger.info('Gmail settings updated', { userId, firmId, settings });

        return { success: true, settings: integration.syncSettings };
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Parse Gmail message to structured format
     */
    parseMessage(message) {
        const headers = this.getHeaders(message);

        return {
            id: message.id,
            threadId: message.threadId,
            labelIds: message.labelIds || [],
            snippet: message.snippet,
            historyId: message.historyId,
            internalDate: message.internalDate,
            from: headers.from,
            to: headers.to,
            cc: headers.cc,
            bcc: headers.bcc,
            subject: headers.subject,
            date: headers.date,
            body: this.getBody(message),
            attachments: this.getAttachments(message)
        };
    }

    /**
     * Extract headers from message
     */
    getHeaders(message) {
        const headers = {};
        if (message.payload && message.payload.headers) {
            message.payload.headers.forEach(header => {
                headers[header.name.toLowerCase()] = header.value;
            });
        }
        return headers;
    }

    /**
     * Extract body from message
     */
    getBody(message) {
        let body = { text: '', html: '' };

        if (!message.payload) return body;

        const parts = message.payload.parts || [message.payload];

        for (const part of parts) {
            if (part.mimeType === 'text/plain' && part.body && part.body.data) {
                body.text = Buffer.from(part.body.data, 'base64').toString();
            } else if (part.mimeType === 'text/html' && part.body && part.body.data) {
                body.html = Buffer.from(part.body.data, 'base64').toString();
            } else if (part.parts) {
                // Recursively search nested parts
                const nestedBody = this.getBody({ payload: part });
                body.text = body.text || nestedBody.text;
                body.html = body.html || nestedBody.html;
            }
        }

        // If no text body but HTML exists, use snippet as fallback
        if (!body.text && !body.html && message.snippet) {
            body.text = message.snippet;
        }

        return body;
    }

    /**
     * Extract attachments from message
     */
    getAttachments(message) {
        const attachments = [];

        if (!message.payload) return attachments;

        const parts = message.payload.parts || [];

        for (const part of parts) {
            if (part.filename && part.body && part.body.attachmentId) {
                attachments.push({
                    filename: part.filename,
                    mimeType: part.mimeType,
                    size: part.body.size,
                    attachmentId: part.body.attachmentId
                });
            }
        }

        return attachments;
    }

    /**
     * Create raw email message for sending
     */
    createRawMessage(emailData) {
        const {
            to,
            cc,
            bcc,
            subject,
            body,
            inReplyTo,
            references
        } = emailData;

        const lines = [];
        lines.push(`To: ${to}`);
        if (cc) lines.push(`Cc: ${cc}`);
        if (bcc) lines.push(`Bcc: ${bcc}`);
        lines.push(`Subject: ${subject}`);
        if (inReplyTo) lines.push(`In-Reply-To: ${inReplyTo}`);
        if (references) lines.push(`References: ${references}`);
        lines.push('Content-Type: text/html; charset=utf-8');
        lines.push('');
        lines.push(body);

        const email = lines.join('\r\n');
        return Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
}

module.exports = new GmailService();
