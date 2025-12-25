const { google } = require('googleapis');
const GoogleCalendarIntegration = require('../models/googleCalendarIntegration.model');
const Event = require('../models/event.model');
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
    logger.warn('Google Calendar integration not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables.');
}

const REDIRECT_URI = `${BACKEND_URL || API_URL || 'http://localhost:5000'}/api/google-calendar/callback`;

/**
 * Google Calendar Service
 *
 * Handles OAuth flow, calendar operations, and synchronization
 * between Google Calendar and TRAF3LI events.
 */
class GoogleCalendarService {
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
        const integration = await GoogleCalendarIntegration.findActiveIntegration(userId, firmId);

        if (!integration) {
            throw CustomException('Google Calendar not connected', 404);
        }

        const oauth2Client = this.createOAuth2Client();

        // Check if token is expired or expiring soon
        if (integration.isTokenExpiringSoon()) {
            // Refresh token
            await this.refreshToken(userId, firmId);

            // Reload integration with fresh tokens
            const refreshedIntegration = await GoogleCalendarIntegration.findActiveIntegration(userId, firmId);
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
        // In production, you might want to use Redis or cache service
        const stateData = {
            userId,
            firmId,
            timestamp: Date.now()
        };

        // You could store this in cache service similar to oauth.service.js
        // For now, we'll include it in the state parameter

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent', // Force consent to get refresh token
            scope: [
                'https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/calendar.events'
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
            const expiresAt = new Date(Date.now() + (tokens.expiry_date ? tokens.expiry_date - Date.now() : 3600 * 1000));

            // Find or create integration
            let integration = await GoogleCalendarIntegration.findOne({ userId, firmId });

            if (integration) {
                // Update existing integration
                integration.accessToken = tokens.access_token;
                integration.refreshToken = tokens.refresh_token || integration.refreshToken;
                integration.tokenType = tokens.token_type || 'Bearer';
                integration.expiresAt = expiresAt;
                integration.scope = tokens.scope;
                integration.isConnected = true;
                integration.connectedAt = new Date();
                integration.disconnectedAt = null;
                integration.disconnectedBy = null;
                integration.disconnectReason = null;
                await integration.save();
            } else {
                // Create new integration
                integration = await GoogleCalendarIntegration.create({
                    userId,
                    firmId,
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    tokenType: tokens.token_type || 'Bearer',
                    expiresAt,
                    scope: tokens.scope,
                    isConnected: true,
                    connectedAt: new Date()
                });
            }

            // Fetch user's calendars
            oauth2Client.setCredentials(tokens);
            const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

            const { data } = await calendar.calendarList.list();

            // Add primary calendar by default
            if (data.items && data.items.length > 0) {
                const primaryCalendar = data.items.find(c => c.primary) || data.items[0];

                await integration.addCalendar({
                    calendarId: primaryCalendar.id,
                    name: primaryCalendar.summary,
                    backgroundColor: primaryCalendar.backgroundColor,
                    isPrimary: primaryCalendar.primary || false,
                    syncEnabled: true
                });
            }

            logger.info('Google Calendar connected successfully', { userId, firmId });

            return {
                success: true,
                integration: integration.toObject()
            };
        } catch (error) {
            logger.error('Google Calendar OAuth callback failed', {
                error: error.message,
                userId,
                firmId
            });

            throw CustomException('Failed to connect Google Calendar', 500);
        }
    }

    /**
     * Refresh access token
     * @param {string} userId - User ID
     * @param {string} firmId - Firm ID
     * @returns {object} New tokens
     */
    async refreshToken(userId, firmId = null) {
        const integration = await GoogleCalendarIntegration.findActiveIntegration(userId, firmId);

        if (!integration) {
            throw CustomException('Google Calendar not connected', 404);
        }

        if (!integration.refreshToken) {
            throw CustomException('No refresh token available. Please reconnect Google Calendar.', 400);
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

            logger.info('Google Calendar token refreshed', { userId, firmId });

            return {
                success: true,
                expiresAt: integration.expiresAt
            };
        } catch (error) {
            logger.error('Failed to refresh Google Calendar token', {
                error: error.message,
                userId,
                firmId
            });

            // Mark as disconnected if refresh fails
            await integration.disconnect(userId, 'Token refresh failed');

            throw CustomException('Failed to refresh token. Please reconnect Google Calendar.', 401);
        }
    }

    /**
     * Disconnect Google Calendar
     * @param {string} userId - User ID
     * @param {string} firmId - Firm ID
     * @returns {object} Result
     */
    async disconnect(userId, firmId = null) {
        const integration = await GoogleCalendarIntegration.findOne({ userId, firmId });

        if (!integration) {
            throw CustomException('Google Calendar not connected', 404);
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

        // Stop webhook if exists
        if (integration.webhook && integration.webhook.channelId) {
            try {
                await this.stopWebhook(userId, firmId, integration.webhook.channelId);
            } catch (error) {
                logger.warn('Failed to stop webhook', { error: error.message });
            }
        }

        await integration.disconnect(userId, 'User disconnected');

        logger.info('Google Calendar disconnected', { userId, firmId });

        return { success: true };
    }

    // ═══════════════════════════════════════════════════════════════
    // CALENDAR OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get list of user's calendars
     * @param {string} userId - User ID
     * @param {string} firmId - Firm ID
     * @returns {array} List of calendars
     */
    async getCalendars(userId, firmId = null) {
        const oauth2Client = await this.getAuthenticatedClient(userId, firmId);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        try {
            const { data } = await calendar.calendarList.list({
                maxResults: 100,
                showHidden: false
            });

            return data.items || [];
        } catch (error) {
            logger.error('Failed to fetch calendars', { error: error.message, userId });
            throw CustomException('Failed to fetch calendars from Google', 500);
        }
    }

    /**
     * Get events from a calendar
     * @param {string} userId - User ID
     * @param {string} calendarId - Calendar ID
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {string} firmId - Firm ID
     * @returns {array} List of events
     */
    async getEvents(userId, calendarId, startDate, endDate, firmId = null) {
        const oauth2Client = await this.getAuthenticatedClient(userId, firmId);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        try {
            const { data } = await calendar.events.list({
                calendarId,
                timeMin: startDate.toISOString(),
                timeMax: endDate.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
                maxResults: 2500
            });

            return data.items || [];
        } catch (error) {
            logger.error('Failed to fetch events from Google Calendar', {
                error: error.message,
                userId,
                calendarId
            });
            throw CustomException('Failed to fetch events from Google Calendar', 500);
        }
    }

    /**
     * Create event in Google Calendar
     * @param {string} userId - User ID
     * @param {string} calendarId - Calendar ID
     * @param {object} eventData - Event data
     * @param {string} firmId - Firm ID
     * @returns {object} Created event
     */
    async createEvent(userId, calendarId, eventData, firmId = null) {
        const oauth2Client = await this.getAuthenticatedClient(userId, firmId);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const googleEvent = this.mapEventToGoogle(eventData);

        try {
            const { data } = await calendar.events.insert({
                calendarId,
                requestBody: googleEvent,
                sendUpdates: 'all'
            });

            logger.info('Event created in Google Calendar', { userId, calendarId, eventId: data.id });

            return data;
        } catch (error) {
            logger.error('Failed to create event in Google Calendar', {
                error: error.message,
                userId,
                calendarId
            });
            throw CustomException('Failed to create event in Google Calendar', 500);
        }
    }

    /**
     * Update event in Google Calendar
     * @param {string} userId - User ID
     * @param {string} calendarId - Calendar ID
     * @param {string} eventId - Google event ID
     * @param {object} eventData - Event data
     * @param {string} firmId - Firm ID
     * @returns {object} Updated event
     */
    async updateEvent(userId, calendarId, eventId, eventData, firmId = null) {
        const oauth2Client = await this.getAuthenticatedClient(userId, firmId);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const googleEvent = this.mapEventToGoogle(eventData);

        try {
            const { data } = await calendar.events.update({
                calendarId,
                eventId,
                requestBody: googleEvent,
                sendUpdates: 'all'
            });

            logger.info('Event updated in Google Calendar', { userId, calendarId, eventId });

            return data;
        } catch (error) {
            logger.error('Failed to update event in Google Calendar', {
                error: error.message,
                userId,
                calendarId,
                eventId
            });
            throw CustomException('Failed to update event in Google Calendar', 500);
        }
    }

    /**
     * Delete event from Google Calendar
     * @param {string} userId - User ID
     * @param {string} calendarId - Calendar ID
     * @param {string} eventId - Google event ID
     * @param {string} firmId - Firm ID
     * @returns {object} Result
     */
    async deleteEvent(userId, calendarId, eventId, firmId = null) {
        const oauth2Client = await this.getAuthenticatedClient(userId, firmId);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        try {
            await calendar.events.delete({
                calendarId,
                eventId,
                sendUpdates: 'all'
            });

            logger.info('Event deleted from Google Calendar', { userId, calendarId, eventId });

            return { success: true };
        } catch (error) {
            logger.error('Failed to delete event from Google Calendar', {
                error: error.message,
                userId,
                calendarId,
                eventId
            });
            throw CustomException('Failed to delete event from Google Calendar', 500);
        }
    }

    /**
     * Set up push notifications for calendar changes
     * @param {string} userId - User ID
     * @param {string} calendarId - Calendar ID
     * @param {string} firmId - Firm ID
     * @returns {object} Watch response
     */
    async watchCalendar(userId, calendarId, firmId = null) {
        const oauth2Client = await this.getAuthenticatedClient(userId, firmId);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const integration = await GoogleCalendarIntegration.findActiveIntegration(userId, firmId);

        // Generate unique channel ID
        const channelId = `${userId}-${calendarId}-${Date.now()}`;
        const webhookUrl = `${BACKEND_URL || API_URL}/api/google-calendar/webhook`;

        try {
            const { data } = await calendar.events.watch({
                calendarId,
                requestBody: {
                    id: channelId,
                    type: 'web_hook',
                    address: webhookUrl,
                    token: crypto.randomBytes(32).toString('hex')
                }
            });

            // Update integration with webhook details
            integration.webhook = {
                channelId: data.id,
                resourceId: data.resourceId,
                resourceUri: data.resourceUri,
                expiresAt: new Date(parseInt(data.expiration)),
                token: data.token
            };
            await integration.save();

            logger.info('Calendar watch set up', { userId, calendarId, channelId });

            return data;
        } catch (error) {
            logger.error('Failed to set up calendar watch', {
                error: error.message,
                userId,
                calendarId
            });
            throw CustomException('Failed to set up calendar notifications', 500);
        }
    }

    /**
     * Stop push notifications
     * @param {string} userId - User ID
     * @param {string} firmId - Firm ID
     * @param {string} channelId - Channel ID
     * @returns {object} Result
     */
    async stopWebhook(userId, firmId, channelId) {
        const oauth2Client = await this.getAuthenticatedClient(userId, firmId);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const integration = await GoogleCalendarIntegration.findActiveIntegration(userId, firmId);

        if (!integration.webhook || integration.webhook.channelId !== channelId) {
            throw CustomException('Webhook not found', 404);
        }

        try {
            await calendar.channels.stop({
                requestBody: {
                    id: integration.webhook.channelId,
                    resourceId: integration.webhook.resourceId
                }
            });

            // Clear webhook from integration
            integration.webhook = undefined;
            await integration.save();

            logger.info('Calendar watch stopped', { userId, channelId });

            return { success: true };
        } catch (error) {
            logger.error('Failed to stop calendar watch', {
                error: error.message,
                userId,
                channelId
            });
            throw CustomException('Failed to stop calendar notifications', 500);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SYNC OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Sync events from Google to TRAF3LI
     * @param {string} userId - User ID
     * @param {string} firmId - Firm ID
     * @returns {object} Sync result
     */
    async syncFromGoogle(userId, firmId = null) {
        const integration = await GoogleCalendarIntegration.findActiveIntegration(userId, firmId);

        if (!integration) {
            throw CustomException('Google Calendar not connected', 404);
        }

        if (!integration.autoSync.enabled && integration.autoSync.direction === 'export_only') {
            throw CustomException('Import sync is disabled', 400);
        }

        const selectedCalendars = integration.selectedCalendars.filter(c => c.syncEnabled);

        if (selectedCalendars.length === 0) {
            throw CustomException('No calendars selected for sync', 400);
        }

        const now = new Date();
        const startDate = new Date(now.getTime() - integration.autoSync.syncDaysBack * 24 * 60 * 60 * 1000);
        const endDate = new Date(now.getTime() + integration.autoSync.syncDaysForward * 24 * 60 * 60 * 1000);

        let importedCount = 0;
        const errors = [];

        for (const cal of selectedCalendars) {
            try {
                const googleEvents = await this.getEvents(userId, cal.calendarId, startDate, endDate, firmId);

                for (const googleEvent of googleEvents) {
                    try {
                        // Check if event already exists
                        const existingEvent = await Event.findOne({
                            'calendarSync.googleCalendarId': googleEvent.id,
                            createdBy: userId
                        });

                        if (existingEvent) {
                            // Update existing event based on conflict resolution
                            if (this.shouldUpdateFromGoogle(existingEvent, googleEvent, integration.autoSync.conflictResolution)) {
                                const mappedEvent = this.mapGoogleToEvent(googleEvent, userId, firmId);
                                Object.assign(existingEvent, mappedEvent);
                                existingEvent.calendarSync.lastSyncedAt = new Date();
                                existingEvent.calendarSync.syncStatus = 'synced';
                                await existingEvent.save();
                            }
                        } else {
                            // Create new event
                            const eventData = this.mapGoogleToEvent(googleEvent, userId, firmId);
                            await Event.create({
                                ...eventData,
                                createdBy: userId,
                                organizer: userId,
                                firmId,
                                calendarSync: {
                                    googleCalendarId: googleEvent.id,
                                    lastSyncedAt: new Date(),
                                    syncStatus: 'synced'
                                }
                            });
                            importedCount++;
                        }
                    } catch (error) {
                        logger.error('Failed to sync event from Google', {
                            error: error.message,
                            eventId: googleEvent.id
                        });
                        errors.push({ eventId: googleEvent.id, error: error.message });
                    }
                }
            } catch (error) {
                logger.error('Failed to sync calendar from Google', {
                    error: error.message,
                    calendarId: cal.calendarId
                });
                errors.push({ calendarId: cal.calendarId, error: error.message });
            }
        }

        // Update sync stats
        await integration.updateSyncStats(errors.length === 0, importedCount, 0);

        return {
            success: true,
            imported: importedCount,
            errors: errors.length > 0 ? errors : undefined
        };
    }

    /**
     * Sync TRAF3LI event to Google Calendar
     * @param {string} userId - User ID
     * @param {string} eventId - TRAF3LI event ID
     * @param {string} firmId - Firm ID
     * @returns {object} Sync result
     */
    async syncToGoogle(userId, eventId, firmId = null) {
        const integration = await GoogleCalendarIntegration.findActiveIntegration(userId, firmId);

        if (!integration) {
            throw CustomException('Google Calendar not connected', 404);
        }

        if (!integration.autoSync.enabled && integration.autoSync.direction === 'import_only') {
            throw CustomException('Export sync is disabled', 400);
        }

        const event = await Event.findById(eventId);

        if (!event) {
            throw CustomException('Event not found', 404);
        }

        const calendarId = integration.primaryCalendarId;

        if (!calendarId) {
            throw CustomException('No primary calendar selected', 400);
        }

        try {
            // Check if event already synced to Google
            if (event.calendarSync && event.calendarSync.googleCalendarId) {
                // Update existing Google event
                const googleEvent = await this.updateEvent(
                    userId,
                    calendarId,
                    event.calendarSync.googleCalendarId,
                    event,
                    firmId
                );

                event.calendarSync.lastSyncedAt = new Date();
                event.calendarSync.syncStatus = 'synced';
                await event.save();

                return { success: true, action: 'updated', googleEventId: googleEvent.id };
            } else {
                // Create new Google event
                const googleEvent = await this.createEvent(userId, calendarId, event, firmId);

                event.calendarSync = {
                    googleCalendarId: googleEvent.id,
                    lastSyncedAt: new Date(),
                    syncStatus: 'synced'
                };
                await event.save();

                await integration.updateSyncStats(true, 0, 1);

                return { success: true, action: 'created', googleEventId: googleEvent.id };
            }
        } catch (error) {
            event.calendarSync = event.calendarSync || {};
            event.calendarSync.syncStatus = 'failed';
            await event.save();

            throw error;
        }
    }

    /**
     * Enable auto-sync
     * @param {string} userId - User ID
     * @param {object} settings - Sync settings
     * @param {string} firmId - Firm ID
     * @returns {object} Result
     */
    async enableAutoSync(userId, settings, firmId = null) {
        const integration = await GoogleCalendarIntegration.findActiveIntegration(userId, firmId);

        if (!integration) {
            throw CustomException('Google Calendar not connected', 404);
        }

        // Update sync settings
        if (settings.direction) integration.autoSync.direction = settings.direction;
        if (settings.syncInterval) integration.autoSync.syncInterval = settings.syncInterval;
        if (settings.conflictResolution) integration.autoSync.conflictResolution = settings.conflictResolution;
        if (settings.syncPastEvents !== undefined) integration.autoSync.syncPastEvents = settings.syncPastEvents;
        if (settings.syncDaysBack) integration.autoSync.syncDaysBack = settings.syncDaysBack;
        if (settings.syncDaysForward) integration.autoSync.syncDaysForward = settings.syncDaysForward;

        integration.autoSync.enabled = true;
        await integration.save();

        logger.info('Auto-sync enabled', { userId, firmId, settings });

        return { success: true, settings: integration.autoSync };
    }

    /**
     * Disable auto-sync
     * @param {string} userId - User ID
     * @param {string} firmId - Firm ID
     * @returns {object} Result
     */
    async disableAutoSync(userId, firmId = null) {
        const integration = await GoogleCalendarIntegration.findActiveIntegration(userId, firmId);

        if (!integration) {
            throw CustomException('Google Calendar not connected', 404);
        }

        integration.autoSync.enabled = false;
        await integration.save();

        logger.info('Auto-sync disabled', { userId, firmId });

        return { success: true };
    }

    /**
     * Handle webhook notification from Google
     * @param {object} payload - Webhook payload
     * @param {object} headers - Request headers
     * @returns {object} Result
     */
    async handleWebhook(payload, headers) {
        const channelId = headers['x-goog-channel-id'];
        const resourceState = headers['x-goog-resource-state'];

        if (!channelId) {
            throw CustomException('Invalid webhook payload', 400);
        }

        // Find integration by channel ID
        const integration = await GoogleCalendarIntegration.findOne({
            'webhook.channelId': channelId,
            isConnected: true
        });

        if (!integration) {
            logger.warn('Webhook received for unknown channel', { channelId });
            return { success: false, message: 'Unknown channel' };
        }

        logger.info('Webhook received from Google Calendar', {
            channelId,
            resourceState,
            userId: integration.userId
        });

        // Trigger sync based on resource state
        if (resourceState === 'exists' || resourceState === 'update') {
            // Queue sync job or trigger immediate sync
            try {
                await this.syncFromGoogle(integration.userId, integration.firmId);
            } catch (error) {
                logger.error('Failed to sync from webhook', {
                    error: error.message,
                    userId: integration.userId
                });
            }
        }

        return { success: true };
    }

    // ═══════════════════════════════════════════════════════════════
    // EVENT MAPPING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Map Google Calendar event to TRAF3LI event
     * @param {object} googleEvent - Google Calendar event
     * @param {string} userId - User ID
     * @param {string} firmId - Firm ID
     * @returns {object} TRAF3LI event data
     */
    mapGoogleToEvent(googleEvent, userId, firmId) {
        const startDateTime = googleEvent.start.dateTime
            ? new Date(googleEvent.start.dateTime)
            : new Date(googleEvent.start.date);

        const endDateTime = googleEvent.end.dateTime
            ? new Date(googleEvent.end.dateTime)
            : new Date(googleEvent.end.date);

        const allDay = !googleEvent.start.dateTime;

        // Map attendees
        const attendees = (googleEvent.attendees || []).map(a => ({
            email: a.email,
            name: a.displayName,
            status: this.mapGoogleAttendeeStatus(a.responseStatus),
            role: a.optional ? 'optional' : 'required'
        }));

        // Map location
        let location = null;
        if (googleEvent.location) {
            location = {
                name: googleEvent.location,
                address: googleEvent.location
            };
        }

        // Check for conference data (virtual meeting)
        if (googleEvent.conferenceData && googleEvent.conferenceData.entryPoints) {
            const videoEntry = googleEvent.conferenceData.entryPoints.find(e => e.entryPointType === 'video');
            if (videoEntry) {
                location = location || {};
                location.virtualLink = videoEntry.uri;
                location.virtualPlatform = 'google_meet';
            }
        }

        return {
            title: googleEvent.summary || 'Untitled Event',
            description: googleEvent.description || '',
            startDateTime,
            endDateTime,
            allDay,
            location,
            attendees,
            type: 'meeting',
            status: this.mapGoogleEventStatus(googleEvent.status),
            visibility: googleEvent.visibility === 'public' ? 'public' : 'private'
        };
    }

    /**
     * Map TRAF3LI event to Google Calendar event
     * @param {object} event - TRAF3LI event
     * @returns {object} Google Calendar event data
     */
    mapEventToGoogle(event) {
        const googleEvent = {
            summary: event.title,
            description: event.description || '',
            start: {},
            end: {},
            attendees: [],
            reminders: {
                useDefault: false,
                overrides: []
            }
        };

        // Map start/end times
        if (event.allDay) {
            googleEvent.start.date = event.startDateTime.toISOString().split('T')[0];
            googleEvent.end.date = (event.endDateTime || event.startDateTime).toISOString().split('T')[0];
        } else {
            googleEvent.start.dateTime = event.startDateTime.toISOString();
            googleEvent.start.timeZone = event.timezone || 'Asia/Riyadh';
            googleEvent.end.dateTime = (event.endDateTime || event.startDateTime).toISOString();
            googleEvent.end.timeZone = event.timezone || 'Asia/Riyadh';
        }

        // Map location
        if (event.location) {
            if (event.location.virtualLink) {
                googleEvent.conferenceData = {
                    createRequest: {
                        requestId: crypto.randomBytes(16).toString('hex'),
                        conferenceSolutionKey: { type: 'hangoutsMeet' }
                    }
                };
            } else if (event.location.address || event.location.name) {
                googleEvent.location = event.location.address || event.location.name;
            }
        }

        // Map attendees
        if (event.attendees && event.attendees.length > 0) {
            googleEvent.attendees = event.attendees
                .filter(a => a.email)
                .map(a => ({
                    email: a.email,
                    displayName: a.name,
                    optional: a.role === 'optional',
                    responseStatus: this.mapTRAF3LIAttendeeStatus(a.status)
                }));
        }

        // Map reminders
        if (event.reminders && event.reminders.length > 0) {
            googleEvent.reminders.overrides = event.reminders.map(r => ({
                method: r.type === 'email' ? 'email' : 'popup',
                minutes: r.beforeMinutes
            }));
        }

        // Map visibility
        if (event.visibility === 'public') {
            googleEvent.visibility = 'public';
        } else {
            googleEvent.visibility = 'private';
        }

        return googleEvent;
    }

    /**
     * Map Google attendee status to TRAF3LI
     */
    mapGoogleAttendeeStatus(googleStatus) {
        const statusMap = {
            'accepted': 'confirmed',
            'declined': 'declined',
            'tentative': 'tentative',
            'needsAction': 'invited'
        };
        return statusMap[googleStatus] || 'invited';
    }

    /**
     * Map TRAF3LI attendee status to Google
     */
    mapTRAF3LIAttendeeStatus(traf3liStatus) {
        const statusMap = {
            'confirmed': 'accepted',
            'declined': 'declined',
            'tentative': 'tentative',
            'invited': 'needsAction',
            'no_response': 'needsAction'
        };
        return statusMap[traf3liStatus] || 'needsAction';
    }

    /**
     * Map Google event status to TRAF3LI
     */
    mapGoogleEventStatus(googleStatus) {
        const statusMap = {
            'confirmed': 'confirmed',
            'tentative': 'tentative',
            'cancelled': 'cancelled'
        };
        return statusMap[googleStatus] || 'scheduled';
    }

    /**
     * Determine if event should be updated from Google
     */
    shouldUpdateFromGoogle(traf3liEvent, googleEvent, conflictResolution) {
        if (conflictResolution === 'google_wins') return true;
        if (conflictResolution === 'traf3li_wins') return false;
        if (conflictResolution === 'manual') return false;

        // newest_wins: compare update times
        const googleUpdated = new Date(googleEvent.updated);
        const traf3liUpdated = traf3liEvent.updatedAt || traf3liEvent.createdAt;

        return googleUpdated > traf3liUpdated;
    }
}

module.exports = new GoogleCalendarService();
