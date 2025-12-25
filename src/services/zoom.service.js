const axios = require('axios');
const crypto = require('crypto');
const ZoomIntegration = require('../models/zoomIntegration.model');
const { CustomException } = require('../utils');
const logger = require('../utils/contextLogger');

const {
    ZOOM_CLIENT_ID,
    ZOOM_CLIENT_SECRET,
    BACKEND_URL,
    API_URL
} = process.env;

// Validate required environment variables
if (!ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
    logger.warn('Zoom integration not configured. Set ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET in environment variables.');
}

const REDIRECT_URI = `${BACKEND_URL || API_URL || 'http://localhost:5000'}/api/zoom/callback`;
const ZOOM_OAUTH_BASE = 'https://zoom.us/oauth';
const ZOOM_API_BASE = 'https://api.zoom.us/v2';

/**
 * Zoom Service
 *
 * Handles OAuth flow, meeting operations, and webhook events
 * for Zoom integration.
 */
class ZoomService {
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
            'meeting:write',
            'meeting:read',
            'user:read',
            'recording:read',
            'webinar:write',
            'webinar:read'
        ].join(' ');

        const authUrl = `${ZOOM_OAUTH_BASE}/authorize?` +
            `response_type=code&` +
            `client_id=${ZOOM_CLIENT_ID}&` +
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
            const userInfo = await this.getZoomUserInfo(tokenResponse.access_token);

            // Calculate token expiry
            const tokenExpiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

            // Find or create integration
            let integration = await ZoomIntegration.findOne({ userId, firmId });

            if (integration) {
                // Update existing integration
                integration.accessToken = tokenResponse.access_token;
                integration.refreshToken = tokenResponse.refresh_token;
                integration.tokenType = tokenResponse.token_type || 'Bearer';
                integration.tokenExpiresAt = tokenExpiresAt;
                integration.scopes = tokenResponse.scope ? tokenResponse.scope.split(' ') : [];
                integration.zoomUserId = userInfo.id;
                integration.email = userInfo.email;
                integration.accountId = userInfo.account_id;
                integration.isActive = true;
                integration.connectedAt = new Date();
                integration.disconnectedAt = null;
                integration.disconnectedBy = null;
                integration.disconnectReason = null;
                await integration.save();
            } else {
                // Create new integration
                integration = await ZoomIntegration.create({
                    userId,
                    firmId,
                    accessToken: tokenResponse.access_token,
                    refreshToken: tokenResponse.refresh_token,
                    tokenType: tokenResponse.token_type || 'Bearer',
                    tokenExpiresAt,
                    scopes: tokenResponse.scope ? tokenResponse.scope.split(' ') : [],
                    zoomUserId: userInfo.id,
                    email: userInfo.email,
                    accountId: userInfo.account_id,
                    isActive: true,
                    connectedAt: new Date()
                });
            }

            logger.info('Zoom connected successfully', { userId, firmId, zoomUserId: userInfo.id });

            return {
                success: true,
                integration: integration.toObject()
            };
        } catch (error) {
            logger.error('Zoom OAuth callback failed', {
                error: error.message,
                userId,
                firmId
            });

            throw CustomException('Failed to connect Zoom account', 500);
        }
    }

    /**
     * Exchange authorization code for tokens
     * @param {string} code - Authorization code
     * @returns {object} Token response
     */
    async exchangeCode(code) {
        const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');

        try {
            const response = await axios.post(
                `${ZOOM_OAUTH_BASE}/token`,
                new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: REDIRECT_URI
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
            logger.error('Failed to exchange Zoom code', { error: error.message });
            throw CustomException('Failed to obtain Zoom access token', 500);
        }
    }

    /**
     * Refresh access token
     * @param {string} userId - User ID
     * @param {string} firmId - Firm ID
     * @returns {object} New tokens
     */
    async refreshToken(userId, firmId = null) {
        const integration = await ZoomIntegration.findActiveIntegration(userId, firmId);

        if (!integration) {
            throw CustomException('Zoom not connected', 404);
        }

        if (!integration.refreshToken) {
            throw CustomException('No refresh token available. Please reconnect Zoom.', 400);
        }

        const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');

        try {
            const response = await axios.post(
                `${ZOOM_OAUTH_BASE}/token`,
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

            logger.info('Zoom token refreshed', { userId, firmId });

            return {
                success: true,
                expiresAt: integration.tokenExpiresAt
            };
        } catch (error) {
            logger.error('Failed to refresh Zoom token', {
                error: error.message,
                userId,
                firmId
            });

            // Mark as disconnected if refresh fails
            await integration.disconnect(userId, 'Token refresh failed');

            throw CustomException('Failed to refresh token. Please reconnect Zoom.', 401);
        }
    }

    /**
     * Get authenticated access token for user
     */
    async getAccessToken(userId, firmId = null) {
        const integration = await ZoomIntegration.findActiveIntegration(userId, firmId);

        if (!integration) {
            throw CustomException('Zoom not connected', 404);
        }

        // Check if token is expired or expiring soon
        if (integration.isTokenExpiringSoon()) {
            await this.refreshToken(userId, firmId);
            const refreshedIntegration = await ZoomIntegration.findActiveIntegration(userId, firmId);
            return refreshedIntegration.accessToken;
        }

        return integration.accessToken;
    }

    /**
     * Get Zoom user info
     */
    async getZoomUserInfo(accessToken) {
        try {
            const response = await axios.get(`${ZOOM_API_BASE}/users/me`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            return response.data;
        } catch (error) {
            logger.error('Failed to get Zoom user info', { error: error.message });
            throw CustomException('Failed to get Zoom user info', 500);
        }
    }

    /**
     * Disconnect Zoom
     * @param {string} userId - User ID
     * @param {string} firmId - Firm ID
     * @returns {object} Result
     */
    async disconnect(userId, firmId = null) {
        const integration = await ZoomIntegration.findOne({ userId, firmId });

        if (!integration) {
            throw CustomException('Zoom not connected', 404);
        }

        // Revoke token with Zoom
        try {
            const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');

            await axios.post(
                `${ZOOM_OAUTH_BASE}/revoke`,
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
            logger.warn('Failed to revoke Zoom token', { error: error.message });
            // Continue with disconnection even if revocation fails
        }

        await integration.disconnect(userId, 'User disconnected');

        logger.info('Zoom disconnected', { userId, firmId });

        return { success: true };
    }

    // ═══════════════════════════════════════════════════════════════
    // MEETING OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create a scheduled meeting
     * @param {string} userId - User ID
     * @param {object} meetingData - Meeting details
     * @param {string} firmId - Firm ID
     * @returns {object} Created meeting
     */
    async createMeeting(userId, meetingData, firmId = null) {
        const accessToken = await this.getAccessToken(userId, firmId);
        const integration = await ZoomIntegration.findActiveIntegration(userId, firmId);

        const zoomMeetingData = this.mapToZoomMeeting(meetingData, integration.meetingSettings);

        try {
            const response = await axios.post(
                `${ZOOM_API_BASE}/users/me/meetings`,
                zoomMeetingData,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Update stats
            await integration.updateMeetingStats({ created: true });

            logger.info('Zoom meeting created', { userId, firmId, meetingId: response.data.id });

            return response.data;
        } catch (error) {
            logger.error('Failed to create Zoom meeting', {
                error: error.response?.data || error.message,
                userId,
                firmId
            });
            throw CustomException('Failed to create Zoom meeting', 500);
        }
    }

    /**
     * Create instant meeting
     * @param {string} userId - User ID
     * @param {object} meetingData - Meeting details
     * @param {string} firmId - Firm ID
     * @returns {object} Created meeting
     */
    async createInstantMeeting(userId, meetingData, firmId = null) {
        const instantMeetingData = {
            ...meetingData,
            type: 1, // Instant meeting
            settings: {
                ...meetingData.settings,
                join_before_host: true
            }
        };

        return await this.createMeeting(userId, instantMeetingData, firmId);
    }

    /**
     * Schedule meeting for case/client
     * @param {string} userId - User ID
     * @param {object} meetingData - Meeting details with case/client info
     * @param {string} firmId - Firm ID
     * @returns {object} Created meeting
     */
    async scheduleMeetingForCase(userId, meetingData, firmId = null) {
        const { caseId, clientId, ...restMeetingData } = meetingData;

        // Add case/client info to meeting agenda
        let agenda = restMeetingData.agenda || '';
        if (caseId) {
            agenda += `\n\nCase ID: ${caseId}`;
        }
        if (clientId) {
            agenda += `\nClient ID: ${clientId}`;
        }

        const scheduledMeetingData = {
            ...restMeetingData,
            agenda,
            type: 2 // Scheduled meeting
        };

        return await this.createMeeting(userId, scheduledMeetingData, firmId);
    }

    /**
     * Get meeting details
     * @param {string} userId - User ID
     * @param {string} meetingId - Zoom meeting ID
     * @param {string} firmId - Firm ID
     * @returns {object} Meeting details
     */
    async getMeeting(userId, meetingId, firmId = null) {
        const accessToken = await this.getAccessToken(userId, firmId);

        try {
            const response = await axios.get(
                `${ZOOM_API_BASE}/meetings/${meetingId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );

            return response.data;
        } catch (error) {
            logger.error('Failed to get Zoom meeting', {
                error: error.response?.data || error.message,
                userId,
                meetingId
            });
            throw CustomException('Failed to get Zoom meeting', 500);
        }
    }

    /**
     * List user's meetings
     * @param {string} userId - User ID
     * @param {object} options - Query options
     * @param {string} firmId - Firm ID
     * @returns {object} Meetings list
     */
    async listMeetings(userId, options = {}, firmId = null) {
        const accessToken = await this.getAccessToken(userId, firmId);

        const params = {
            type: options.type || 'scheduled', // scheduled, live, upcoming
            page_size: options.pageSize || 30,
            page_number: options.page || 1
        };

        try {
            const response = await axios.get(
                `${ZOOM_API_BASE}/users/me/meetings`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    },
                    params
                }
            );

            return response.data;
        } catch (error) {
            logger.error('Failed to list Zoom meetings', {
                error: error.response?.data || error.message,
                userId
            });
            throw CustomException('Failed to list Zoom meetings', 500);
        }
    }

    /**
     * Update meeting
     * @param {string} userId - User ID
     * @param {string} meetingId - Zoom meeting ID
     * @param {object} updateData - Update data
     * @param {string} firmId - Firm ID
     * @returns {object} Result
     */
    async updateMeeting(userId, meetingId, updateData, firmId = null) {
        const accessToken = await this.getAccessToken(userId, firmId);
        const integration = await ZoomIntegration.findActiveIntegration(userId, firmId);

        const zoomUpdateData = this.mapToZoomMeeting(updateData, integration.meetingSettings);

        try {
            await axios.patch(
                `${ZOOM_API_BASE}/meetings/${meetingId}`,
                zoomUpdateData,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            logger.info('Zoom meeting updated', { userId, firmId, meetingId });

            return { success: true, meetingId };
        } catch (error) {
            logger.error('Failed to update Zoom meeting', {
                error: error.response?.data || error.message,
                userId,
                meetingId
            });
            throw CustomException('Failed to update Zoom meeting', 500);
        }
    }

    /**
     * Delete meeting
     * @param {string} userId - User ID
     * @param {string} meetingId - Zoom meeting ID
     * @param {string} firmId - Firm ID
     * @returns {object} Result
     */
    async deleteMeeting(userId, meetingId, firmId = null) {
        const accessToken = await this.getAccessToken(userId, firmId);

        try {
            await axios.delete(
                `${ZOOM_API_BASE}/meetings/${meetingId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );

            logger.info('Zoom meeting deleted', { userId, firmId, meetingId });

            return { success: true };
        } catch (error) {
            logger.error('Failed to delete Zoom meeting', {
                error: error.response?.data || error.message,
                userId,
                meetingId
            });
            throw CustomException('Failed to delete Zoom meeting', 500);
        }
    }

    /**
     * Get meeting recordings
     * @param {string} userId - User ID
     * @param {string} meetingId - Zoom meeting ID
     * @param {string} firmId - Firm ID
     * @returns {object} Recordings
     */
    async getRecordings(userId, meetingId = null, firmId = null) {
        const accessToken = await this.getAccessToken(userId, firmId);

        try {
            let url;
            if (meetingId) {
                url = `${ZOOM_API_BASE}/meetings/${meetingId}/recordings`;
            } else {
                // Get all recordings for user
                url = `${ZOOM_API_BASE}/users/me/recordings`;
            }

            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            return response.data;
        } catch (error) {
            logger.error('Failed to get Zoom recordings', {
                error: error.response?.data || error.message,
                userId,
                meetingId
            });
            throw CustomException('Failed to get Zoom recordings', 500);
        }
    }

    /**
     * Generate join URL for meeting
     * @param {string} meetingId - Zoom meeting ID
     * @param {string} userName - User name
     * @param {string} userEmail - User email
     * @returns {string} Join URL
     */
    generateJoinUrl(meetingId, userName, userEmail = null) {
        let joinUrl = `https://zoom.us/j/${meetingId}`;

        if (userName) {
            joinUrl += `?uname=${encodeURIComponent(userName)}`;
        }

        if (userEmail) {
            joinUrl += `${userName ? '&' : '?'}email=${encodeURIComponent(userEmail)}`;
        }

        return joinUrl;
    }

    /**
     * Update default meeting settings
     * @param {string} userId - User ID
     * @param {object} settings - Meeting settings
     * @param {string} firmId - Firm ID
     * @returns {object} Result
     */
    async updateSettings(userId, settings, firmId = null) {
        const integration = await ZoomIntegration.findActiveIntegration(userId, firmId);

        if (!integration) {
            throw CustomException('Zoom not connected', 404);
        }

        await integration.updateSettings(settings);

        logger.info('Zoom settings updated', { userId, firmId });

        return {
            success: true,
            settings: integration.meetingSettings
        };
    }

    /**
     * Test Zoom connection
     * @param {string} userId - User ID
     * @param {string} firmId - Firm ID
     * @returns {object} Connection status
     */
    async testConnection(userId, firmId = null) {
        try {
            const accessToken = await this.getAccessToken(userId, firmId);
            const userInfo = await this.getZoomUserInfo(accessToken);

            return {
                success: true,
                connected: true,
                user: {
                    id: userInfo.id,
                    email: userInfo.email,
                    firstName: userInfo.first_name,
                    lastName: userInfo.last_name,
                    accountId: userInfo.account_id
                }
            };
        } catch (error) {
            logger.error('Zoom connection test failed', {
                error: error.message,
                userId,
                firmId
            });

            return {
                success: false,
                connected: false,
                error: error.message
            };
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // WEBHOOK HANDLERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Handle webhook event from Zoom
     * @param {object} payload - Webhook payload
     * @param {object} headers - Request headers
     * @returns {object} Result
     */
    async handleWebhook(payload, headers) {
        const { event, payload: eventData } = payload;

        logger.info('Zoom webhook received', { event, meetingId: eventData?.object?.id });

        try {
            switch (event) {
                case 'meeting.started':
                    await this.handleMeetingStarted(eventData);
                    break;

                case 'meeting.ended':
                    await this.handleMeetingEnded(eventData);
                    break;

                case 'meeting.participant_joined':
                    await this.handleParticipantJoined(eventData);
                    break;

                case 'meeting.participant_left':
                    await this.handleParticipantLeft(eventData);
                    break;

                case 'recording.completed':
                    await this.handleRecordingCompleted(eventData);
                    break;

                default:
                    logger.info('Unhandled Zoom webhook event', { event });
            }

            return { success: true };
        } catch (error) {
            logger.error('Failed to handle Zoom webhook', {
                error: error.message,
                event
            });

            return { success: false, error: error.message };
        }
    }

    /**
     * Handle meeting started event
     */
    async handleMeetingStarted(eventData) {
        const { object } = eventData;
        const meetingId = object.id;

        // Find integration by host ID
        const integration = await ZoomIntegration.findByZoomUserId(object.host_id);

        if (integration) {
            await integration.updateMeetingStats({ hosted: true });
            logger.info('Meeting started', { meetingId, userId: integration.userId });
        }

        // TODO: Update event/meeting status in database if stored
    }

    /**
     * Handle meeting ended event
     */
    async handleMeetingEnded(eventData) {
        const { object } = eventData;
        const meetingId = object.id;

        // Find integration by host ID
        const integration = await ZoomIntegration.findByZoomUserId(object.host_id);

        if (integration) {
            const duration = object.duration || 0;
            await integration.updateMeetingStats({ duration });
            logger.info('Meeting ended', { meetingId, duration, userId: integration.userId });
        }

        // TODO: Update event/meeting status in database
    }

    /**
     * Handle participant joined event
     */
    async handleParticipantJoined(eventData) {
        const { object } = eventData;
        const meetingId = object.id;

        // Find integration by host ID
        const integration = await ZoomIntegration.findByZoomUserId(object.host_id);

        if (integration) {
            await integration.updateMeetingStats({ participants: 1 });
            logger.info('Participant joined', {
                meetingId,
                participantName: object.participant?.user_name
            });
        }

        // TODO: Track participant attendance
    }

    /**
     * Handle participant left event
     */
    async handleParticipantLeft(eventData) {
        const { object } = eventData;

        logger.info('Participant left', {
            meetingId: object.id,
            participantName: object.participant?.user_name
        });

        // TODO: Update participant attendance
    }

    /**
     * Handle recording completed event
     */
    async handleRecordingCompleted(eventData) {
        const { object } = eventData;

        logger.info('Recording completed', {
            meetingId: object.id,
            recordingFiles: object.recording_files?.length
        });

        // TODO: Download and store recording if needed
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Map meeting data to Zoom format
     */
    mapToZoomMeeting(meetingData, defaultSettings = {}) {
        const zoomMeeting = {
            topic: meetingData.topic || meetingData.title,
            type: meetingData.type || 2, // 1=instant, 2=scheduled, 3=recurring, 8=recurring with fixed time
            agenda: meetingData.agenda || meetingData.description || '',
            settings: {}
        };

        // Add start time and duration for scheduled meetings
        if (meetingData.startTime || meetingData.start_time) {
            zoomMeeting.start_time = meetingData.startTime || meetingData.start_time;
        }

        if (meetingData.duration) {
            zoomMeeting.duration = meetingData.duration;
        } else if (defaultSettings.defaultDuration) {
            zoomMeeting.duration = defaultSettings.defaultDuration;
        }

        if (meetingData.timezone) {
            zoomMeeting.timezone = meetingData.timezone;
        }

        // Map settings
        const settings = meetingData.settings || {};

        zoomMeeting.settings = {
            host_video: settings.hostVideo ?? defaultSettings.hostVideo ?? true,
            participant_video: settings.participantVideo ?? defaultSettings.participantVideo ?? true,
            join_before_host: settings.joinBeforeHost ?? defaultSettings.joinBeforeHost ?? false,
            mute_upon_entry: settings.muteUponEntry ?? defaultSettings.muteUponEntry ?? false,
            waiting_room: settings.waitingRoom ?? defaultSettings.waitingRoom ?? true,
            auto_recording: settings.autoRecording ?? defaultSettings.autoRecording ?? 'none',
            meeting_authentication: settings.meetingAuthentication ?? defaultSettings.meetingAuthentication ?? false,
            audio: settings.audio ?? defaultSettings.audio ?? 'both',
            allow_multiple_devices: true
        };

        // Add password if provided
        if (meetingData.password) {
            zoomMeeting.password = meetingData.password;
        }

        // Add recurrence if provided
        if (meetingData.recurrence) {
            zoomMeeting.recurrence = meetingData.recurrence;
        }

        return zoomMeeting;
    }
}

module.exports = new ZoomService();
