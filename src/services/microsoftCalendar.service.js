/**
 * Microsoft 365 Calendar Integration Service
 *
 * Provides comprehensive Microsoft Graph API integration for calendar operations:
 * - OAuth 2.0 authentication flow with PKCE
 * - Calendar management and event operations
 * - Bidirectional sync between TRAF3LI and Microsoft Calendar
 * - Auto-sync configuration and management
 * - Event mapping between systems
 *
 * Features:
 * - Secure token storage with encryption
 * - Automatic token refresh
 * - Comprehensive error handling and logging
 * - Rate limiting and retry logic
 *
 * @requires @microsoft/microsoft-graph-client
 */

const { Client } = require('@microsoft/microsoft-graph-client');
const crypto = require('crypto');
const { encrypt, decrypt } = require('../utils/encryption');
const { withCircuitBreaker } = require('../utils/circuitBreaker');
const logger = require('../utils/logger');
const User = require('../models/user.model');
const Firm = require('../models/firm.model');
const Event = require('../models/event.model');
const cacheService = require('./cache.service');
const { CustomException } = require('../utils');

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const MS_CONFIG = {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    redirectUri: process.env.MICROSOFT_REDIRECT_URI || `${process.env.BACKEND_URL || process.env.API_URL}/api/microsoft-calendar/callback`,
    authority: 'https://login.microsoftonline.com/common',
    scopes: [
        'offline_access',
        'User.Read',
        'Calendars.ReadWrite',
        'Calendars.ReadWrite.Shared'
    ]
};

// Microsoft Graph API endpoints
const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

// Sync direction constants
const SYNC_DIRECTION = {
    TO_MICROSOFT: 'to_microsoft',
    FROM_MICROSOFT: 'from_microsoft',
    BIDIRECTIONAL: 'bidirectional'
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if Microsoft Calendar is configured
 * @returns {boolean}
 */
function isConfigured() {
    return !!(MS_CONFIG.clientId && MS_CONFIG.clientSecret);
}

/**
 * Generate PKCE code verifier and challenge
 * @returns {Object} { codeVerifier, codeChallenge }
 */
function generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

    return { codeVerifier, codeChallenge };
}

/**
 * Store Microsoft tokens securely in user settings
 * @param {string} userId - User ID
 * @param {string} firmId - Firm ID
 * @param {Object} tokenData - Token data from Microsoft
 */
async function storeTokens(userId, firmId, tokenData) {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    // Encrypt sensitive tokens
    const encryptedAccessToken = encrypt(tokenData.accessToken);
    const encryptedRefreshToken = tokenData.refreshToken ? encrypt(tokenData.refreshToken) : null;

    // Initialize integrations if it doesn't exist
    if (!user.integrations) {
        user.integrations = {};
    }

    user.integrations.microsoftCalendar = {
        connected: true,
        firmId,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: new Date(Date.now() + (tokenData.expiresIn || 3600) * 1000),
        tokenType: tokenData.tokenType || 'Bearer',
        scope: tokenData.scope,
        connectedAt: user.integrations.microsoftCalendar?.connectedAt || new Date(),
        lastSyncedAt: user.integrations.microsoftCalendar?.lastSyncedAt,
        lastRefreshedAt: new Date(),
        syncSettings: user.integrations.microsoftCalendar?.syncSettings || {
            enabled: false,
            syncInterval: 'manual', // manual, hourly, daily
            syncDirection: SYNC_DIRECTION.BIDIRECTIONAL,
            defaultCalendarId: null,
            syncPastDays: 30,
            syncFutureDays: 90,
            lastSync: null
        }
    };

    await user.save();

    logger.info('Microsoft Calendar tokens stored securely', {
        userId,
        firmId,
        expiresAt: user.integrations.microsoftCalendar.expiresAt
    });
}

/**
 * Retrieve and decrypt Microsoft tokens
 * @param {string} userId - User ID
 * @returns {Object} Decrypted token data
 */
async function getTokens(userId) {
    const user = await User.findById(userId).select('integrations');
    if (!user || !user.integrations?.microsoftCalendar?.connected) {
        throw new Error('Microsoft Calendar not connected for this user');
    }

    const msConfig = user.integrations.microsoftCalendar;

    // Check if token is expired
    if (new Date() >= msConfig.expiresAt) {
        throw new Error('Access token expired. Please refresh the token.');
    }

    return {
        accessToken: decrypt(msConfig.accessToken),
        refreshToken: msConfig.refreshToken ? decrypt(msConfig.refreshToken) : null,
        tokenType: msConfig.tokenType,
        expiresAt: msConfig.expiresAt,
        firmId: msConfig.firmId
    };
}

/**
 * Get authenticated Microsoft Graph client
 * @param {string} userId - User ID
 * @returns {Object} Microsoft Graph client
 */
async function getAuthenticatedClient(userId) {
    const tokens = await getTokens(userId);

    const client = Client.init({
        authProvider: (done) => {
            done(null, tokens.accessToken);
        }
    });

    return client;
}

// ═══════════════════════════════════════════════════════════════
// MICROSOFT CALENDAR SERVICE CLASS
// ═══════════════════════════════════════════════════════════════

class MicrosoftCalendarService {
    /**
     * Check if Microsoft Calendar is configured
     * @returns {boolean}
     */
    isConfigured() {
        return isConfigured();
    }

    // ═══════════════════════════════════════════════════════════════
    // OAUTH FLOW
    // ═══════════════════════════════════════════════════════════════

    /**
     * Generate OAuth authorization URL
     * @param {string} userId - User ID
     * @param {string} firmId - Firm ID
     * @param {string} state - Optional state parameter
     * @returns {Promise<Object>} Authorization URL and state
     */
    async getAuthUrl(userId, firmId, state = null) {
        if (!this.isConfigured()) {
            throw CustomException('Microsoft Calendar not configured. Please set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET environment variables.', 500);
        }

        const { codeVerifier, codeChallenge } = generatePKCE();

        // Generate state token for CSRF protection
        const stateToken = state || crypto.randomBytes(16).toString('hex');

        // Store state and code verifier in cache (15 minutes)
        await cacheService.set(
            `ms-calendar:oauth:${stateToken}`,
            { userId, firmId, codeVerifier },
            900
        );

        // Build authorization URL
        const params = new URLSearchParams({
            client_id: MS_CONFIG.clientId,
            response_type: 'code',
            redirect_uri: MS_CONFIG.redirectUri,
            response_mode: 'query',
            scope: MS_CONFIG.scopes.join(' '),
            state: stateToken,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
            prompt: 'consent' // Force consent to get refresh token
        });

        const authUrl = `${MS_CONFIG.authority}/oauth2/v2.0/authorize?${params.toString()}`;

        logger.info('Microsoft Calendar OAuth URL generated', { userId, firmId, state: stateToken });

        return {
            authUrl,
            state: stateToken
        };
    }

    /**
     * Handle OAuth callback and exchange code for tokens
     * @param {string} code - Authorization code
     * @param {string} state - State parameter from authorization
     * @returns {Promise<Object>} Connection result
     */
    async handleCallback(code, state) {
        if (!this.isConfigured()) {
            throw CustomException('Microsoft Calendar not configured', 500);
        }

        // Retrieve and verify state
        const stateData = await cacheService.get(`ms-calendar:oauth:${state}`);
        if (!stateData) {
            throw CustomException('Invalid or expired state token', 400);
        }

        const { userId, firmId, codeVerifier } = stateData;

        return withCircuitBreaker('microsoft-calendar', async () => {
            // Exchange code for tokens
            const params = new URLSearchParams({
                client_id: MS_CONFIG.clientId,
                client_secret: MS_CONFIG.clientSecret,
                code,
                redirect_uri: MS_CONFIG.redirectUri,
                grant_type: 'authorization_code',
                code_verifier: codeVerifier
            });

            const response = await fetch(`${MS_CONFIG.authority}/oauth2/v2.0/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params.toString()
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
            }

            const tokenData = await response.json();

            // Store tokens
            await storeTokens(userId, firmId, {
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                expiresIn: tokenData.expires_in,
                tokenType: tokenData.token_type,
                scope: tokenData.scope
            });

            // Delete state from cache
            await cacheService.del(`ms-calendar:oauth:${state}`);

            logger.info('Microsoft Calendar connection established', { userId, firmId });

            return {
                success: true,
                userId,
                firmId,
                connectedAt: new Date()
            };
        });
    }

    /**
     * Refresh expired access token
     * @param {string} userId - User ID
     * @returns {Promise<Object>} New token data
     */
    async refreshToken(userId) {
        const user = await User.findById(userId).select('integrations');
        if (!user || !user.integrations?.microsoftCalendar?.connected) {
            throw CustomException('Microsoft Calendar not connected for this user', 404);
        }

        const msConfig = user.integrations.microsoftCalendar;
        if (!msConfig.refreshToken) {
            throw CustomException('No refresh token available', 400);
        }

        return withCircuitBreaker('microsoft-calendar', async () => {
            const params = new URLSearchParams({
                client_id: MS_CONFIG.clientId,
                client_secret: MS_CONFIG.clientSecret,
                refresh_token: decrypt(msConfig.refreshToken),
                grant_type: 'refresh_token',
                scope: MS_CONFIG.scopes.join(' ')
            });

            const response = await fetch(`${MS_CONFIG.authority}/oauth2/v2.0/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params.toString()
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
            }

            const tokenData = await response.json();

            // Store new tokens
            await storeTokens(userId, msConfig.firmId, {
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token || decrypt(msConfig.refreshToken),
                expiresIn: tokenData.expires_in,
                tokenType: tokenData.token_type,
                scope: tokenData.scope
            });

            logger.info('Microsoft Calendar token refreshed', { userId });

            return {
                success: true,
                expiresAt: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000)
            };
        });
    }

    /**
     * Disconnect Microsoft Calendar integration
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Disconnection result
     */
    async disconnect(userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw CustomException('User not found', 404);
        }

        if (!user.integrations?.microsoftCalendar?.connected) {
            throw CustomException('Microsoft Calendar not connected', 400);
        }

        // Clear Microsoft Calendar configuration
        user.integrations.microsoftCalendar = {
            connected: false,
            disconnectedAt: new Date()
        };

        await user.save();

        logger.info('Microsoft Calendar disconnected', { userId });

        return { success: true };
    }

    // ═══════════════════════════════════════════════════════════════
    // CALENDAR OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get user's calendars
     * @param {string} userId - User ID
     * @returns {Promise<Array>} List of calendars
     */
    async getCalendars(userId) {
        const client = await getAuthenticatedClient(userId);

        return withCircuitBreaker('microsoft-calendar', async () => {
            const response = await client
                .api('/me/calendars')
                .get();

            const calendars = response.value || [];

            return calendars.map(cal => ({
                id: cal.id,
                name: cal.name,
                color: cal.hexColor || cal.color,
                canEdit: cal.canEdit,
                canShare: cal.canShare,
                canViewPrivateItems: cal.canViewPrivateItems,
                isDefaultCalendar: cal.isDefaultCalendar,
                owner: cal.owner
            }));
        });
    }

    /**
     * Get events from Microsoft Calendar
     * @param {string} userId - User ID
     * @param {string} calendarId - Calendar ID (default: primary)
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise<Array>} List of events
     */
    async getEvents(userId, calendarId = null, startDate = null, endDate = null) {
        const client = await getAuthenticatedClient(userId);

        return withCircuitBreaker('microsoft-calendar', async () => {
            let endpoint = calendarId
                ? `/me/calendars/${calendarId}/events`
                : '/me/calendar/events';

            let query = client.api(endpoint)
                .select('id,subject,body,start,end,location,attendees,organizer,isAllDay,isCancelled,recurrence,webLink,categories')
                .top(250);

            // Add date filter if provided
            if (startDate && endDate) {
                const filter = `start/dateTime ge '${startDate.toISOString()}' and end/dateTime le '${endDate.toISOString()}'`;
                query = query.filter(filter);
            }

            const response = await query.get();

            return response.value || [];
        });
    }

    /**
     * Create event in Microsoft Calendar
     * @param {string} userId - User ID
     * @param {string} calendarId - Calendar ID (default: primary)
     * @param {Object} eventData - Event data
     * @returns {Promise<Object>} Created event
     */
    async createEvent(userId, calendarId = null, eventData) {
        const client = await getAuthenticatedClient(userId);

        return withCircuitBreaker('microsoft-calendar', async () => {
            const endpoint = calendarId
                ? `/me/calendars/${calendarId}/events`
                : '/me/calendar/events';

            const msEvent = this.mapEventToMicrosoft(eventData);

            const response = await client
                .api(endpoint)
                .post(msEvent);

            logger.info('Event created in Microsoft Calendar', {
                userId,
                eventId: response.id,
                subject: response.subject
            });

            return response;
        });
    }

    /**
     * Update event in Microsoft Calendar
     * @param {string} userId - User ID
     * @param {string} calendarId - Calendar ID
     * @param {string} eventId - Microsoft event ID
     * @param {Object} eventData - Updated event data
     * @returns {Promise<Object>} Updated event
     */
    async updateEvent(userId, calendarId, eventId, eventData) {
        const client = await getAuthenticatedClient(userId);

        return withCircuitBreaker('microsoft-calendar', async () => {
            const msEvent = this.mapEventToMicrosoft(eventData);

            const response = await client
                .api(`/me/events/${eventId}`)
                .patch(msEvent);

            logger.info('Event updated in Microsoft Calendar', {
                userId,
                eventId,
                subject: response.subject
            });

            return response;
        });
    }

    /**
     * Delete event from Microsoft Calendar
     * @param {string} userId - User ID
     * @param {string} calendarId - Calendar ID
     * @param {string} eventId - Microsoft event ID
     * @returns {Promise<Object>} Deletion result
     */
    async deleteEvent(userId, calendarId, eventId) {
        const client = await getAuthenticatedClient(userId);

        return withCircuitBreaker('microsoft-calendar', async () => {
            await client
                .api(`/me/events/${eventId}`)
                .delete();

            logger.info('Event deleted from Microsoft Calendar', {
                userId,
                eventId
            });

            return { success: true };
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // SYNC OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Sync events from Microsoft to TRAF3LI
     * @param {string} userId - User ID
     * @param {Object} options - Sync options
     * @returns {Promise<Object>} Sync result
     */
    async syncFromMicrosoft(userId, options = {}) {
        const user = await User.findById(userId).select('integrations firmId');
        const msConfig = user.integrations?.microsoftCalendar;

        if (!msConfig?.connected) {
            throw CustomException('Microsoft Calendar not connected', 400);
        }

        const {
            calendarId = msConfig.syncSettings?.defaultCalendarId,
            startDate = new Date(Date.now() - msConfig.syncSettings?.syncPastDays * 24 * 60 * 60 * 1000),
            endDate = new Date(Date.now() + msConfig.syncSettings?.syncFutureDays * 24 * 60 * 60 * 1000)
        } = options;

        const results = {
            imported: 0,
            updated: 0,
            skipped: 0,
            errors: []
        };

        try {
            // Get events from Microsoft
            const msEvents = await this.getEvents(userId, calendarId, startDate, endDate);

            for (const msEvent of msEvents) {
                try {
                    // Skip cancelled events
                    if (msEvent.isCancelled) {
                        results.skipped++;
                        continue;
                    }

                    // Check if event already exists
                    const existingEvent = await Event.findOne({
                        'calendarSync.outlookEventId': msEvent.id
                    });

                    const mappedEvent = this.mapMicrosoftToEvent(msEvent, userId, user.firmId);

                    if (existingEvent) {
                        // Update existing event
                        await Event.findOneAndUpdate(
                            { _id: existingEvent._id, firmId: user.firmId },
                            {
                                ...mappedEvent,
                                'calendarSync.outlookEventId': msEvent.id,
                                'calendarSync.lastSyncedAt': new Date(),
                                'calendarSync.syncStatus': 'synced'
                            }
                        );
                        results.updated++;
                    } else {
                        // Create new event
                        await Event.create({
                            ...mappedEvent,
                            calendarSync: {
                                outlookEventId: msEvent.id,
                                lastSyncedAt: new Date(),
                                syncStatus: 'synced'
                            }
                        });
                        results.imported++;
                    }
                } catch (error) {
                    logger.error('Failed to sync event from Microsoft', {
                        eventId: msEvent.id,
                        error: error.message
                    });
                    results.errors.push({
                        eventId: msEvent.id,
                        subject: msEvent.subject,
                        error: error.message
                    });
                }
            }

            // Update last sync timestamp
            await User.findOneAndUpdate(
                { _id: userId, firmId: user.firmId },
                {
                    'integrations.microsoftCalendar.syncSettings.lastSync': new Date(),
                    'integrations.microsoftCalendar.lastSyncedAt': new Date()
                }
            );

            logger.info('Microsoft Calendar sync completed', { userId, results });

            return results;
        } catch (error) {
            logger.error('Microsoft Calendar sync failed', {
                userId,
                error: error.message
            });
            throw CustomException('Failed to sync from Microsoft Calendar: ' + error.message, 500);
        }
    }

    /**
     * Sync TRAF3LI event to Microsoft Calendar
     * @param {string} userId - User ID
     * @param {string} eventId - TRAF3LI event ID
     * @returns {Promise<Object>} Sync result
     */
    async syncToMicrosoft(userId, eventId) {
        const user = await User.findById(userId).select('integrations firmId');
        if (!user) {
            throw CustomException('User not found', 404);
        }

        const event = await Event.findOne({ _id: eventId, firmId: user.firmId });
        if (!event) {
            throw CustomException('Event not found', 404);
        }

        const msConfig = user.integrations?.microsoftCalendar;

        if (!msConfig?.connected) {
            throw CustomException('Microsoft Calendar not connected', 400);
        }

        try {
            const calendarId = msConfig.syncSettings?.defaultCalendarId;

            if (event.calendarSync?.outlookEventId) {
                // Update existing event
                const msEvent = await this.updateEvent(
                    userId,
                    calendarId,
                    event.calendarSync.outlookEventId,
                    event
                );

                await Event.findOneAndUpdate(
                    { _id: eventId, firmId: user.firmId },
                    {
                        'calendarSync.lastSyncedAt': new Date(),
                        'calendarSync.syncStatus': 'synced'
                    }
                );

                return {
                    success: true,
                    action: 'updated',
                    msEventId: msEvent.id
                };
            } else {
                // Create new event
                const msEvent = await this.createEvent(userId, calendarId, event);

                await Event.findOneAndUpdate(
                    { _id: eventId, firmId: user.firmId },
                    {
                        'calendarSync.outlookEventId': msEvent.id,
                        'calendarSync.lastSyncedAt': new Date(),
                        'calendarSync.syncStatus': 'synced'
                    }
                );

                return {
                    success: true,
                    action: 'created',
                    msEventId: msEvent.id
                };
            }
        } catch (error) {
            logger.error('Failed to sync event to Microsoft', {
                eventId,
                error: error.message
            });

            await Event.findOneAndUpdate(
                { _id: eventId, firmId: user.firmId },
                {
                    'calendarSync.syncStatus': 'failed'
                }
            );

            throw CustomException('Failed to sync to Microsoft Calendar: ' + error.message, 500);
        }
    }

    /**
     * Enable auto-sync for user
     * @param {string} userId - User ID
     * @param {Object} settings - Sync settings
     * @returns {Promise<Object>} Updated settings
     */
    async enableAutoSync(userId, settings) {
        const user = await User.findById(userId).select('integrations firmId');
        if (!user?.integrations?.microsoftCalendar?.connected) {
            throw CustomException('Microsoft Calendar not connected', 400);
        }

        const syncSettings = {
            enabled: true,
            syncInterval: settings.syncInterval || 'hourly',
            syncDirection: settings.syncDirection || SYNC_DIRECTION.BIDIRECTIONAL,
            defaultCalendarId: settings.defaultCalendarId || null,
            syncPastDays: settings.syncPastDays || 30,
            syncFutureDays: settings.syncFutureDays || 90,
            lastSync: user.integrations.microsoftCalendar.syncSettings?.lastSync || null
        };

        await User.findOneAndUpdate(
            { _id: userId, firmId: user.firmId },
            {
                'integrations.microsoftCalendar.syncSettings': syncSettings
            }
        );

        logger.info('Microsoft Calendar auto-sync enabled', { userId, settings: syncSettings });

        return syncSettings;
    }

    /**
     * Disable auto-sync for user
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Result
     */
    async disableAutoSync(userId) {
        const user = await User.findById(userId).select('firmId');
        if (!user) {
            throw CustomException('User not found', 404);
        }

        await User.findOneAndUpdate(
            { _id: userId, firmId: user.firmId },
            {
                'integrations.microsoftCalendar.syncSettings.enabled': false
            }
        );

        logger.info('Microsoft Calendar auto-sync disabled', { userId });

        return { success: true };
    }

    // ═══════════════════════════════════════════════════════════════
    // EVENT MAPPING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Map Microsoft event to TRAF3LI event format
     * @param {Object} msEvent - Microsoft event
     * @param {string} userId - User ID
     * @param {string} firmId - Firm ID
     * @returns {Object} TRAF3LI event format
     */
    mapMicrosoftToEvent(msEvent, userId, firmId) {
        return {
            firmId,
            createdBy: userId,
            organizer: userId,
            title: msEvent.subject || 'Untitled Event',
            description: msEvent.body?.content || '',
            startDateTime: new Date(msEvent.start.dateTime),
            endDateTime: new Date(msEvent.end.dateTime),
            allDay: msEvent.isAllDay || false,
            timezone: msEvent.start.timeZone || 'Asia/Riyadh',
            location: msEvent.location?.displayName ? {
                name: msEvent.location.displayName,
                address: msEvent.location.address?.street || '',
                virtualLink: msEvent.onlineMeeting?.joinUrl || null
            } : null,
            attendees: (msEvent.attendees || []).map(att => ({
                email: att.emailAddress.address,
                name: att.emailAddress.name,
                status: this.mapMicrosoftResponseStatus(att.status?.response),
                isRequired: att.type === 'required'
            })),
            status: msEvent.isCancelled ? 'cancelled' : 'scheduled',
            type: 'meeting',
            visibility: msEvent.sensitivity === 'private' ? 'private' : 'public',
            tags: msEvent.categories || []
        };
    }

    /**
     * Map TRAF3LI event to Microsoft format
     * @param {Object} event - TRAF3LI event
     * @returns {Object} Microsoft event format
     */
    mapEventToMicrosoft(event) {
        return {
            subject: event.title || 'Untitled Event',
            body: {
                contentType: 'HTML',
                content: event.description || ''
            },
            start: {
                dateTime: event.startDateTime.toISOString(),
                timeZone: event.timezone || 'Asia/Riyadh'
            },
            end: {
                dateTime: (event.endDateTime || new Date(event.startDateTime.getTime() + 60 * 60 * 1000)).toISOString(),
                timeZone: event.timezone || 'Asia/Riyadh'
            },
            isAllDay: event.allDay || false,
            location: event.location ? {
                displayName: event.location.name || event.location.address || '',
                address: event.location.address ? {
                    street: event.location.address
                } : undefined
            } : undefined,
            attendees: (event.attendees || []).map(att => ({
                emailAddress: {
                    address: att.email,
                    name: att.name || att.email
                },
                type: att.isRequired ? 'required' : 'optional'
            })),
            sensitivity: event.visibility === 'private' ? 'private' : 'normal',
            categories: event.tags || []
        };
    }

    /**
     * Map Microsoft response status to TRAF3LI status
     * @param {string} msStatus - Microsoft response status
     * @returns {string} TRAF3LI status
     */
    mapMicrosoftResponseStatus(msStatus) {
        const statusMap = {
            'accepted': 'confirmed',
            'tentativelyAccepted': 'tentative',
            'declined': 'declined',
            'notResponded': 'invited'
        };

        return statusMap[msStatus] || 'invited';
    }

    // ═══════════════════════════════════════════════════════════════
    // STATUS & UTILITY METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get Microsoft Calendar connection status
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Connection status
     */
    async getConnectionStatus(userId) {
        const user = await User.findById(userId).select('integrations');

        if (!user?.integrations?.microsoftCalendar) {
            return {
                connected: false,
                message: 'Microsoft Calendar not configured'
            };
        }

        const msConfig = user.integrations.microsoftCalendar;

        if (!msConfig.connected) {
            return {
                connected: false,
                message: 'Microsoft Calendar disconnected',
                disconnectedAt: msConfig.disconnectedAt
            };
        }

        const now = new Date();
        const tokenExpired = now >= msConfig.expiresAt;

        return {
            connected: true,
            firmId: msConfig.firmId,
            connectedAt: msConfig.connectedAt,
            lastSyncedAt: msConfig.lastSyncedAt,
            lastRefreshedAt: msConfig.lastRefreshedAt,
            tokenExpired,
            expiresAt: msConfig.expiresAt,
            expiresIn: tokenExpired ? 0 : Math.floor((msConfig.expiresAt - now) / 1000),
            syncSettings: msConfig.syncSettings
        };
    }
}

// Export singleton instance
module.exports = new MicrosoftCalendarService();

// Export class and constants for testing
module.exports.MicrosoftCalendarService = MicrosoftCalendarService;
module.exports.SYNC_DIRECTION = SYNC_DIRECTION;
