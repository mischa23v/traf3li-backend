const axios = require('axios');
const crypto = require('crypto');
const DocuSignIntegration = require('../models/docusignIntegration.model');
const { CustomException } = require('../utils');
const logger = require('../utils/contextLogger');

const {
    DOCUSIGN_CLIENT_ID,
    DOCUSIGN_CLIENT_SECRET,
    DOCUSIGN_INTEGRATION_KEY,
    BACKEND_URL,
    API_URL,
    DOCUSIGN_ENVIRONMENT = 'demo' // 'demo' or 'production'
} = process.env;

// Validate required environment variables
if (!DOCUSIGN_CLIENT_ID || !DOCUSIGN_CLIENT_SECRET) {
    logger.warn('DocuSign integration not configured. Set DOCUSIGN_CLIENT_ID and DOCUSIGN_CLIENT_SECRET in environment variables.');
}

const INTEGRATION_KEY = DOCUSIGN_INTEGRATION_KEY || DOCUSIGN_CLIENT_ID;
const REDIRECT_URI = `${BACKEND_URL || API_URL || 'http://localhost:5000'}/api/docusign/callback`;

// DocuSign OAuth and API base URLs
const DOCUSIGN_AUTH_BASE = DOCUSIGN_ENVIRONMENT === 'production'
    ? 'https://account.docusign.com'
    : 'https://account-d.docusign.com';

const DOCUSIGN_API_BASE = DOCUSIGN_ENVIRONMENT === 'production'
    ? 'https://api.docusign.net/restapi'
    : 'https://demo.docusign.net/restapi';

/**
 * DocuSign Service
 *
 * Handles OAuth flow, envelope operations, templates, and webhook events
 * for DocuSign e-signature integration. Critical for law firms.
 */
class DocuSignService {
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
        // Generate state for CSRF protection
        const state = crypto.randomBytes(32).toString('hex');

        const stateData = {
            userId,
            firmId,
            timestamp: Date.now()
        };

        const encodedState = Buffer.from(JSON.stringify(stateData)).toString('base64');

        const scopes = [
            'signature',
            'impersonation'
        ].join(' ');

        const authUrl = `${DOCUSIGN_AUTH_BASE}/oauth/auth?` +
            `response_type=code&` +
            `client_id=${INTEGRATION_KEY}&` +
            `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
            `state=${encodedState}&` +
            `scope=${encodeURIComponent(scopes)}`;

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

        try {
            // Exchange code for tokens
            const tokenResponse = await this.exchangeCode(code);

            // Get user info
            const userInfo = await this.getUserInfo(tokenResponse.access_token);

            // Get account info (base URI)
            const accountInfo = userInfo.accounts && userInfo.accounts.length > 0
                ? userInfo.accounts[0]
                : null;

            if (!accountInfo) {
                throw CustomException('No DocuSign account found for this user', 400);
            }

            // Calculate token expiry
            const tokenExpiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

            // Find or create integration
            let integration = await DocuSignIntegration.findOne({ userId, firmId });

            if (integration) {
                // Update existing integration
                integration.accessToken = tokenResponse.access_token;
                integration.refreshToken = tokenResponse.refresh_token;
                integration.tokenType = tokenResponse.token_type || 'Bearer';
                integration.tokenExpiresAt = tokenExpiresAt;
                integration.scope = tokenResponse.scope;
                integration.accountId = accountInfo.account_id;
                integration.accountName = accountInfo.account_name;
                integration.baseUri = accountInfo.base_uri;
                integration.email = userInfo.email;
                integration.userName = userInfo.name;
                integration.isActive = true;
                integration.connectedAt = new Date();
                integration.disconnectedAt = null;
                integration.disconnectedBy = null;
                integration.disconnectReason = null;
                await integration.save();
            } else {
                // Create new integration
                integration = await DocuSignIntegration.create({
                    userId,
                    firmId,
                    accessToken: tokenResponse.access_token,
                    refreshToken: tokenResponse.refresh_token,
                    tokenType: tokenResponse.token_type || 'Bearer',
                    tokenExpiresAt,
                    scope: tokenResponse.scope,
                    accountId: accountInfo.account_id,
                    accountName: accountInfo.account_name,
                    baseUri: accountInfo.base_uri,
                    email: userInfo.email,
                    userName: userInfo.name,
                    isActive: true,
                    connectedAt: new Date()
                });
            }

            logger.info('DocuSign connected successfully', {
                userId,
                firmId,
                accountId: accountInfo.account_id
            });

            return {
                success: true,
                integration: integration.toObject()
            };
        } catch (error) {
            logger.error('DocuSign OAuth callback failed', {
                error: error.message,
                userId,
                firmId
            });

            throw CustomException('Failed to connect DocuSign account', 500);
        }
    }

    /**
     * Exchange authorization code for tokens
     * @param {string} code - Authorization code
     * @returns {object} Token response
     */
    async exchangeCode(code) {
        const credentials = Buffer.from(`${INTEGRATION_KEY}:${DOCUSIGN_CLIENT_SECRET}`).toString('base64');

        try {
            const response = await axios.post(
                `${DOCUSIGN_AUTH_BASE}/oauth/token`,
                new URLSearchParams({
                    grant_type: 'authorization_code',
                    code
                }),
                {
                    headers: {
                        'Authorization': `Basic ${credentials}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            return response.data;
        } catch (error) {
            logger.error('Failed to exchange DocuSign code', {
                error: error.response?.data || error.message
            });
            throw CustomException('Failed to obtain DocuSign access token', 500);
        }
    }

    /**
     * Refresh access token
     * @param {string} userId - User ID
     * @param {string} firmId - Firm ID
     * @returns {object} New tokens
     */
    async refreshToken(userId, firmId = null) {
        const integration = await DocuSignIntegration.findActiveIntegration(userId, firmId);

        if (!integration) {
            throw CustomException('DocuSign not connected', 404);
        }

        if (!integration.refreshToken) {
            throw CustomException('No refresh token available. Please reconnect DocuSign.', 400);
        }

        const credentials = Buffer.from(`${INTEGRATION_KEY}:${DOCUSIGN_CLIENT_SECRET}`).toString('base64');

        try {
            const response = await axios.post(
                `${DOCUSIGN_AUTH_BASE}/oauth/token`,
                new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: integration.refreshToken
                }),
                {
                    headers: {
                        'Authorization': `Basic ${credentials}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            // Update integration with new tokens
            integration.accessToken = response.data.access_token;
            if (response.data.refresh_token) {
                integration.refreshToken = response.data.refresh_token;
            }
            integration.tokenExpiresAt = new Date(Date.now() + response.data.expires_in * 1000);
            integration.tokenType = response.data.token_type || 'Bearer';
            await integration.save();

            logger.info('DocuSign token refreshed', { userId, firmId });

            return {
                success: true,
                expiresAt: integration.tokenExpiresAt
            };
        } catch (error) {
            logger.error('Failed to refresh DocuSign token', {
                error: error.response?.data || error.message,
                userId,
                firmId
            });

            // Mark as disconnected if refresh fails
            await integration.disconnect(userId, 'Token refresh failed');

            throw CustomException('Failed to refresh token. Please reconnect DocuSign.', 401);
        }
    }

    /**
     * Get authenticated access token for user
     */
    async getAccessToken(userId, firmId = null) {
        const integration = await DocuSignIntegration.findActiveIntegration(userId, firmId);

        if (!integration) {
            throw CustomException('DocuSign not connected', 404);
        }

        // Check if token is expired or expiring soon
        if (integration.isTokenExpiringSoon()) {
            await this.refreshToken(userId, firmId);
            const refreshedIntegration = await DocuSignIntegration.findActiveIntegration(userId, firmId);
            return refreshedIntegration;
        }

        return integration;
    }

    /**
     * Get DocuSign user info
     */
    async getUserInfo(accessToken) {
        try {
            const response = await axios.get(`${DOCUSIGN_AUTH_BASE}/oauth/userinfo`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            return response.data;
        } catch (error) {
            logger.error('Failed to get DocuSign user info', {
                error: error.response?.data || error.message
            });
            throw CustomException('Failed to get DocuSign user info', 500);
        }
    }

    /**
     * Disconnect DocuSign
     * @param {string} userId - User ID
     * @param {string} firmId - Firm ID
     * @returns {object} Result
     */
    async disconnect(userId, firmId = null) {
        const integration = await DocuSignIntegration.findOne({ userId, firmId });

        if (!integration) {
            throw CustomException('DocuSign not connected', 404);
        }

        // Revoke token with DocuSign
        try {
            const credentials = Buffer.from(`${INTEGRATION_KEY}:${DOCUSIGN_CLIENT_SECRET}`).toString('base64');

            await axios.post(
                `${DOCUSIGN_AUTH_BASE}/oauth/revoke`,
                new URLSearchParams({
                    token: integration.accessToken
                }),
                {
                    headers: {
                        'Authorization': `Basic ${credentials}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );
        } catch (error) {
            logger.warn('Failed to revoke DocuSign token', { error: error.message });
            // Continue with disconnection even if revocation fails
        }

        await integration.disconnect(userId, 'User disconnected');

        logger.info('DocuSign disconnected', { userId, firmId });

        return { success: true };
    }

    // ═══════════════════════════════════════════════════════════════
    // ENVELOPE OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create and send envelope for signature
     * @param {string} userId - User ID
     * @param {object} envelopeData - Envelope details
     * @param {string} firmId - Firm ID
     * @returns {object} Created envelope
     */
    async createEnvelope(userId, envelopeData, firmId = null) {
        const integration = await this.getAccessToken(userId, firmId);

        const envelope = this.buildEnvelopeDefinition(envelopeData);

        try {
            const response = await axios.post(
                `${integration.baseUri}/restapi/v2.1/accounts/${integration.accountId}/envelopes`,
                envelope,
                {
                    headers: {
                        'Authorization': `Bearer ${integration.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Track envelope
            await integration.trackEnvelope({
                envelopeId: response.data.envelopeId,
                subject: envelopeData.emailSubject,
                status: response.data.status,
                linkedTo: envelopeData.linkedTo,
                recipients: envelopeData.recipients,
                sentAt: new Date()
            });

            // Update stats
            await integration.updateStats('envelope_sent');

            logger.info('DocuSign envelope created', {
                userId,
                firmId,
                envelopeId: response.data.envelopeId
            });

            return response.data;
        } catch (error) {
            logger.error('Failed to create DocuSign envelope', {
                error: error.response?.data || error.message,
                userId,
                firmId
            });
            throw CustomException('Failed to create envelope', 500);
        }
    }

    /**
     * Create envelope from template
     * @param {string} userId - User ID
     * @param {object} templateData - Template details
     * @param {string} firmId - Firm ID
     * @returns {object} Created envelope
     */
    async createEnvelopeFromTemplate(userId, templateData, firmId = null) {
        const integration = await this.getAccessToken(userId, firmId);

        const envelope = {
            templateId: templateData.templateId,
            templateRoles: templateData.recipients || [],
            status: templateData.status || 'sent',
            emailSubject: templateData.emailSubject,
            emailBlurb: templateData.emailBlurb
        };

        try {
            const response = await axios.post(
                `${integration.baseUri}/restapi/v2.1/accounts/${integration.accountId}/envelopes`,
                envelope,
                {
                    headers: {
                        'Authorization': `Bearer ${integration.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Track envelope
            await integration.trackEnvelope({
                envelopeId: response.data.envelopeId,
                subject: templateData.emailSubject,
                status: response.data.status,
                linkedTo: templateData.linkedTo,
                recipients: templateData.recipients,
                sentAt: new Date()
            });

            // Update stats
            await integration.updateStats('envelope_sent');

            logger.info('DocuSign envelope created from template', {
                userId,
                firmId,
                envelopeId: response.data.envelopeId,
                templateId: templateData.templateId
            });

            return response.data;
        } catch (error) {
            logger.error('Failed to create envelope from template', {
                error: error.response?.data || error.message,
                userId,
                firmId
            });
            throw CustomException('Failed to create envelope from template', 500);
        }
    }

    /**
     * Get envelope status
     * @param {string} userId - User ID
     * @param {string} envelopeId - Envelope ID
     * @param {string} firmId - Firm ID
     * @returns {object} Envelope status
     */
    async getEnvelope(userId, envelopeId, firmId = null) {
        const integration = await this.getAccessToken(userId, firmId);

        try {
            const response = await axios.get(
                `${integration.baseUri}/restapi/v2.1/accounts/${integration.accountId}/envelopes/${envelopeId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${integration.accessToken}`
                    }
                }
            );

            return response.data;
        } catch (error) {
            logger.error('Failed to get DocuSign envelope', {
                error: error.response?.data || error.message,
                userId,
                envelopeId
            });
            throw CustomException('Failed to get envelope', 500);
        }
    }

    /**
     * List envelopes
     * @param {string} userId - User ID
     * @param {object} options - Query options
     * @param {string} firmId - Firm ID
     * @returns {object} Envelopes list
     */
    async listEnvelopes(userId, options = {}, firmId = null) {
        const integration = await this.getAccessToken(userId, firmId);

        const params = {
            from_date: options.fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: options.status || 'sent,delivered,completed',
            count: options.count || 100,
            start_position: options.startPosition || 0
        };

        try {
            const response = await axios.get(
                `${integration.baseUri}/restapi/v2.1/accounts/${integration.accountId}/envelopes`,
                {
                    headers: {
                        'Authorization': `Bearer ${integration.accessToken}`
                    },
                    params
                }
            );

            return response.data;
        } catch (error) {
            logger.error('Failed to list DocuSign envelopes', {
                error: error.response?.data || error.message,
                userId
            });
            throw CustomException('Failed to list envelopes', 500);
        }
    }

    /**
     * Download signed documents
     * @param {string} userId - User ID
     * @param {string} envelopeId - Envelope ID
     * @param {string} firmId - Firm ID
     * @returns {object} Document download info
     */
    async downloadDocuments(userId, envelopeId, firmId = null) {
        const integration = await this.getAccessToken(userId, firmId);

        try {
            const response = await axios.get(
                `${integration.baseUri}/restapi/v2.1/accounts/${integration.accountId}/envelopes/${envelopeId}/documents/combined`,
                {
                    headers: {
                        'Authorization': `Bearer ${integration.accessToken}`,
                        'Accept': 'application/pdf'
                    },
                    responseType: 'arraybuffer'
                }
            );

            return {
                success: true,
                contentType: 'application/pdf',
                data: response.data,
                filename: `envelope_${envelopeId}.pdf`
            };
        } catch (error) {
            logger.error('Failed to download DocuSign documents', {
                error: error.response?.data || error.message,
                userId,
                envelopeId
            });
            throw CustomException('Failed to download documents', 500);
        }
    }

    /**
     * Void envelope
     * @param {string} userId - User ID
     * @param {string} envelopeId - Envelope ID
     * @param {string} reason - Void reason
     * @param {string} firmId - Firm ID
     * @returns {object} Result
     */
    async voidEnvelope(userId, envelopeId, reason, firmId = null) {
        const integration = await this.getAccessToken(userId, firmId);

        try {
            await axios.put(
                `${integration.baseUri}/restapi/v2.1/accounts/${integration.accountId}/envelopes/${envelopeId}`,
                {
                    status: 'voided',
                    voidedReason: reason
                },
                {
                    headers: {
                        'Authorization': `Bearer ${integration.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Update envelope status
            await integration.updateEnvelopeStatus(envelopeId, 'voided');

            // Update stats
            await integration.updateStats('envelope_voided');

            logger.info('DocuSign envelope voided', { userId, firmId, envelopeId });

            return { success: true };
        } catch (error) {
            logger.error('Failed to void DocuSign envelope', {
                error: error.response?.data || error.message,
                userId,
                envelopeId
            });
            throw CustomException('Failed to void envelope', 500);
        }
    }

    /**
     * Resend envelope
     * @param {string} userId - User ID
     * @param {string} envelopeId - Envelope ID
     * @param {string} firmId - Firm ID
     * @returns {object} Result
     */
    async resendEnvelope(userId, envelopeId, firmId = null) {
        const integration = await this.getAccessToken(userId, firmId);

        try {
            await axios.put(
                `${integration.baseUri}/restapi/v2.1/accounts/${integration.accountId}/envelopes/${envelopeId}`,
                {
                    resendEnvelope: 'true'
                },
                {
                    headers: {
                        'Authorization': `Bearer ${integration.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            logger.info('DocuSign envelope resent', { userId, firmId, envelopeId });

            return { success: true };
        } catch (error) {
            logger.error('Failed to resend DocuSign envelope', {
                error: error.response?.data || error.message,
                userId,
                envelopeId
            });
            throw CustomException('Failed to resend envelope', 500);
        }
    }

    /**
     * Get recipient view URL for embedded signing
     * @param {string} userId - User ID
     * @param {string} envelopeId - Envelope ID
     * @param {object} recipientData - Recipient details
     * @param {string} firmId - Firm ID
     * @returns {object} Signing URL
     */
    async getRecipientView(userId, envelopeId, recipientData, firmId = null) {
        const integration = await this.getAccessToken(userId, firmId);

        const returnUrl = recipientData.returnUrl || `${BACKEND_URL || API_URL}/docusign/signing-complete`;

        const viewRequest = {
            returnUrl,
            authenticationMethod: 'none',
            email: recipientData.email,
            userName: recipientData.userName,
            clientUserId: recipientData.clientUserId || recipientData.email
        };

        try {
            const response = await axios.post(
                `${integration.baseUri}/restapi/v2.1/accounts/${integration.accountId}/envelopes/${envelopeId}/views/recipient`,
                viewRequest,
                {
                    headers: {
                        'Authorization': `Bearer ${integration.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            logger.info('DocuSign recipient view generated', {
                userId,
                firmId,
                envelopeId
            });

            return {
                success: true,
                url: response.data.url
            };
        } catch (error) {
            logger.error('Failed to get recipient view', {
                error: error.response?.data || error.message,
                userId,
                envelopeId
            });
            throw CustomException('Failed to get signing URL', 500);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // TEMPLATE OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * List templates
     * @param {string} userId - User ID
     * @param {string} firmId - Firm ID
     * @returns {object} Templates list
     */
    async listTemplates(userId, firmId = null) {
        const integration = await this.getAccessToken(userId, firmId);

        try {
            const response = await axios.get(
                `${integration.baseUri}/restapi/v2.1/accounts/${integration.accountId}/templates`,
                {
                    headers: {
                        'Authorization': `Bearer ${integration.accessToken}`
                    },
                    params: {
                        count: 100
                    }
                }
            );

            return response.data;
        } catch (error) {
            logger.error('Failed to list DocuSign templates', {
                error: error.response?.data || error.message,
                userId
            });
            throw CustomException('Failed to list templates', 500);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SETTINGS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Update notification settings
     * @param {string} userId - User ID
     * @param {object} settings - Notification settings
     * @param {string} firmId - Firm ID
     * @returns {object} Result
     */
    async updateSettings(userId, settings, firmId = null) {
        const integration = await DocuSignIntegration.findActiveIntegration(userId, firmId);

        if (!integration) {
            throw CustomException('DocuSign not connected', 404);
        }

        await integration.updateNotificationSettings(settings);

        logger.info('DocuSign settings updated', { userId, firmId });

        return {
            success: true,
            settings: integration.notificationSettings
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // WEBHOOK HANDLERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Handle webhook event from DocuSign
     * @param {object} payload - Webhook payload
     * @param {object} headers - Request headers
     * @returns {object} Result
     */
    async handleWebhook(payload, headers) {
        const { event, data } = payload;

        logger.info('DocuSign webhook received', {
            event,
            envelopeId: data?.envelopeId || data?.envelopeSummary?.envelopeId
        });

        try {
            switch (event) {
                case 'envelope-sent':
                    await this.handleEnvelopeSent(data);
                    break;

                case 'envelope-delivered':
                    await this.handleEnvelopeDelivered(data);
                    break;

                case 'envelope-completed':
                    await this.handleEnvelopeCompleted(data);
                    break;

                case 'envelope-declined':
                    await this.handleEnvelopeDeclined(data);
                    break;

                case 'envelope-voided':
                    await this.handleEnvelopeVoided(data);
                    break;

                case 'recipient-sent':
                case 'recipient-delivered':
                    await this.handleRecipientDelivered(data);
                    break;

                case 'recipient-completed':
                case 'recipient-signed':
                    await this.handleRecipientSigned(data);
                    break;

                default:
                    logger.info('Unhandled DocuSign webhook event', { event });
            }

            return { success: true };
        } catch (error) {
            logger.error('Failed to handle DocuSign webhook', {
                error: error.message,
                event
            });

            return { success: false, error: error.message };
        }
    }

    /**
     * Handle envelope sent event
     */
    async handleEnvelopeSent(data) {
        const envelopeId = data.envelopeId || data.envelopeSummary?.envelopeId;
        const integration = await DocuSignIntegration.findByEnvelopeId(envelopeId);

        if (integration) {
            await integration.updateEnvelopeStatus(envelopeId, 'sent', {
                sentAt: new Date()
            });
            logger.info('Envelope sent', { envelopeId });
        }
    }

    /**
     * Handle envelope delivered event
     */
    async handleEnvelopeDelivered(data) {
        const envelopeId = data.envelopeId || data.envelopeSummary?.envelopeId;
        const integration = await DocuSignIntegration.findByEnvelopeId(envelopeId);

        if (integration) {
            await integration.updateEnvelopeStatus(envelopeId, 'delivered');
            logger.info('Envelope delivered', { envelopeId });
        }
    }

    /**
     * Handle envelope completed event
     */
    async handleEnvelopeCompleted(data) {
        const envelopeId = data.envelopeId || data.envelopeSummary?.envelopeId;
        const integration = await DocuSignIntegration.findByEnvelopeId(envelopeId);

        if (integration) {
            await integration.updateEnvelopeStatus(envelopeId, 'completed', {
                completedAt: new Date()
            });

            await integration.updateStats('envelope_completed', {
                documentCount: data.documentCount || 1
            });

            logger.info('Envelope completed', { envelopeId });
        }
    }

    /**
     * Handle envelope declined event
     */
    async handleEnvelopeDeclined(data) {
        const envelopeId = data.envelopeId || data.envelopeSummary?.envelopeId;
        const integration = await DocuSignIntegration.findByEnvelopeId(envelopeId);

        if (integration) {
            await integration.updateEnvelopeStatus(envelopeId, 'declined');
            await integration.updateStats('envelope_declined');
            logger.info('Envelope declined', { envelopeId });
        }
    }

    /**
     * Handle envelope voided event
     */
    async handleEnvelopeVoided(data) {
        const envelopeId = data.envelopeId || data.envelopeSummary?.envelopeId;
        const integration = await DocuSignIntegration.findByEnvelopeId(envelopeId);

        if (integration) {
            await integration.updateEnvelopeStatus(envelopeId, 'voided');
            logger.info('Envelope voided', { envelopeId });
        }
    }

    /**
     * Handle recipient delivered event
     */
    async handleRecipientDelivered(data) {
        const envelopeId = data.envelopeId || data.envelopeSummary?.envelopeId;
        logger.info('Recipient delivered', {
            envelopeId,
            recipientEmail: data.recipientEmail
        });
    }

    /**
     * Handle recipient signed event
     */
    async handleRecipientSigned(data) {
        const envelopeId = data.envelopeId || data.envelopeSummary?.envelopeId;
        const integration = await DocuSignIntegration.findByEnvelopeId(envelopeId);

        if (integration) {
            await integration.updateStats('recipient_signed');
            logger.info('Recipient signed', {
                envelopeId,
                recipientEmail: data.recipientEmail
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Build envelope definition
     */
    buildEnvelopeDefinition(envelopeData) {
        const envelope = {
            emailSubject: envelopeData.emailSubject,
            emailBlurb: envelopeData.emailBlurb,
            status: envelopeData.status || 'sent',
            documents: envelopeData.documents || [],
            recipients: {
                signers: envelopeData.recipients || []
            }
        };

        // Add carbon copies if provided
        if (envelopeData.carbonCopies && envelopeData.carbonCopies.length > 0) {
            envelope.recipients.carbonCopies = envelopeData.carbonCopies;
        }

        return envelope;
    }

    /**
     * Get integration status
     */
    async getStatus(userId, firmId = null) {
        const integration = await DocuSignIntegration.findOne({ userId, firmId });

        if (!integration) {
            return {
                connected: false
            };
        }

        return {
            connected: integration.isActive,
            data: {
                isActive: integration.isActive,
                connectedAt: integration.connectedAt,
                email: integration.email,
                accountId: integration.accountId,
                accountName: integration.accountName,
                notificationSettings: integration.notificationSettings,
                stats: integration.stats,
                lastSyncedAt: integration.lastSyncedAt
            }
        };
    }
}

module.exports = new DocuSignService();
