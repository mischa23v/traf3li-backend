/**
 * Appointment Calendar Sync Service
 *
 * Gold Standard: Automatic bi-directional sync between appointments and external calendars.
 * Modeled after Calendly, Cal.com, Acuity Scheduling, Microsoft Bookings.
 *
 * Features:
 * - Auto-sync appointments to Google Calendar
 * - Auto-sync appointments to Microsoft 365 Calendar
 * - Update calendar events when appointments change
 * - Delete calendar events when appointments are cancelled
 * - Send calendar invites to attendees
 */

const GoogleCalendarIntegration = require('../models/googleCalendarIntegration.model');
const googleCalendarService = require('./googleCalendar.service');
const microsoftCalendarService = require('./microsoftCalendar.service');
const User = require('../models/user.model');
const logger = require('../utils/contextLogger');

/**
 * Sync appointment to user's connected calendars
 *
 * Called when an appointment is created or updated.
 * Creates/updates events in Google Calendar and Microsoft Calendar if connected.
 *
 * @param {Object} appointment - Appointment document
 * @param {string} userId - User ID (lawyer/assignee)
 * @param {string} firmId - Firm ID (optional for solo lawyers)
 * @param {string} action - 'create' | 'update' | 'cancel'
 * @returns {Object} Sync results { google: {...}, microsoft: {...} }
 */
async function syncAppointmentToCalendars(appointment, userId, firmId = null, action = 'create') {
    const results = {
        google: { synced: false, eventId: null, error: null },
        microsoft: { synced: false, eventId: null, error: null }
    };

    try {
        // Try Google Calendar sync
        results.google = await syncToGoogleCalendar(appointment, userId, firmId, action);
    } catch (error) {
        logger.error('Google Calendar sync error:', error);
        results.google.error = error.message;
    }

    try {
        // Try Microsoft Calendar sync
        results.microsoft = await syncToMicrosoftCalendar(appointment, userId, firmId, action);
    } catch (error) {
        logger.error('Microsoft Calendar sync error:', error);
        results.microsoft.error = error.message;
    }

    return results;
}

/**
 * Sync appointment to Google Calendar
 *
 * @param {Object} appointment - Appointment document
 * @param {string} userId - User ID
 * @param {string} firmId - Firm ID
 * @param {string} action - 'create' | 'update' | 'cancel'
 * @returns {Object} Sync result
 */
async function syncToGoogleCalendar(appointment, userId, firmId, action) {
    const result = { synced: false, eventId: null, error: null };

    try {
        // Check if user has Google Calendar connected
        const integration = await GoogleCalendarIntegration.findOne({
            userId,
            ...(firmId && { firmId }),
            isActive: true
        });

        if (!integration) {
            result.error = 'Google Calendar not connected';
            return result;
        }

        // Check if auto-sync is enabled
        if (!integration.settings?.autoSync) {
            result.error = 'Auto-sync disabled';
            return result;
        }

        // Get the default calendar ID
        const calendarId = integration.settings?.defaultCalendarId || 'primary';

        // Build event data
        const eventData = buildGoogleCalendarEvent(appointment);

        if (action === 'create') {
            // Create new event
            const event = await googleCalendarService.createEvent(
                userId,
                firmId,
                calendarId,
                eventData
            );
            result.eventId = event.id;
            result.synced = true;

            logger.info(`Created Google Calendar event ${event.id} for appointment ${appointment._id}`);

        } else if (action === 'update' && appointment.calendarEventId) {
            // Update existing event
            await googleCalendarService.updateEvent(
                userId,
                firmId,
                calendarId,
                appointment.calendarEventId,
                eventData
            );
            result.eventId = appointment.calendarEventId;
            result.synced = true;

            logger.info(`Updated Google Calendar event ${appointment.calendarEventId}`);

        } else if (action === 'cancel' && appointment.calendarEventId) {
            // Delete event
            await googleCalendarService.deleteEvent(
                userId,
                firmId,
                calendarId,
                appointment.calendarEventId
            );
            result.synced = true;

            logger.info(`Deleted Google Calendar event ${appointment.calendarEventId}`);
        }

    } catch (error) {
        logger.error('Google Calendar sync failed:', error);
        result.error = error.message;
    }

    return result;
}

/**
 * Build Google Calendar event data from appointment
 *
 * @param {Object} appointment - Appointment document
 * @returns {Object} Google Calendar event data
 */
function buildGoogleCalendarEvent(appointment) {
    const {
        customerName,
        customerEmail,
        scheduledTime,
        endTime,
        duration = 30,
        notes,
        location,
        meetingLink,
        locationType
    } = appointment;

    // Calculate end time if not set
    const start = new Date(scheduledTime);
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + duration * 60000);

    // Determine location
    let eventLocation = location || '';
    if (locationType === 'virtual' && meetingLink) {
        eventLocation = meetingLink;
    } else if (locationType === 'virtual') {
        eventLocation = 'Virtual Meeting';
    }

    // Build description
    let description = `Appointment with ${customerName}`;
    if (notes) {
        description += `\n\nNotes:\n${notes}`;
    }
    if (meetingLink) {
        description += `\n\nMeeting Link: ${meetingLink}`;
    }
    if (customerEmail) {
        description += `\n\nClient Email: ${customerEmail}`;
    }

    const event = {
        summary: `Appointment - ${customerName}`,
        description,
        start: {
            dateTime: start.toISOString(),
            timeZone: 'Asia/Riyadh'  // Saudi Arabia timezone
        },
        end: {
            dateTime: end.toISOString(),
            timeZone: 'Asia/Riyadh'
        },
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'email', minutes: 60 },
                { method: 'popup', minutes: 15 }
            ]
        }
    };

    // Add location
    if (eventLocation) {
        event.location = eventLocation;
    }

    // Add conference link if virtual
    if (locationType === 'virtual' && meetingLink) {
        event.conferenceData = {
            entryPoints: [{
                entryPointType: 'video',
                uri: meetingLink,
                label: 'Join Meeting'
            }]
        };
    }

    // Add attendee if email provided
    if (customerEmail) {
        event.attendees = [{
            email: customerEmail,
            displayName: customerName,
            responseStatus: 'needsAction'
        }];
    }

    return event;
}

/**
 * Sync appointment to Microsoft Calendar
 *
 * @param {Object} appointment - Appointment document
 * @param {string} userId - User ID
 * @param {string} firmId - Firm ID
 * @param {string} action - 'create' | 'update' | 'cancel'
 * @returns {Object} Sync result
 */
async function syncToMicrosoftCalendar(appointment, userId, firmId, action) {
    const result = { synced: false, eventId: null, error: null };

    try {
        // Check if Microsoft Calendar service is configured
        if (!microsoftCalendarService.isConfigured()) {
            result.error = 'Microsoft Calendar not configured';
            return result;
        }

        // Check if user has Microsoft Calendar connected
        const user = await User.findById(userId).select('integrations');
        if (!user?.integrations?.microsoftCalendar?.connected) {
            result.error = 'Microsoft Calendar not connected';
            return result;
        }

        const msConfig = user.integrations.microsoftCalendar;

        // Check if auto-sync is enabled
        if (!msConfig.syncSettings?.enabled) {
            result.error = 'Auto-sync disabled';
            return result;
        }

        // Get the default calendar ID
        const calendarId = msConfig.syncSettings?.defaultCalendarId || null;

        // Build event data for Microsoft
        const eventData = buildMicrosoftCalendarEvent(appointment);

        if (action === 'create') {
            // Create new event
            const event = await microsoftCalendarService.createEvent(
                userId,
                calendarId,
                eventData
            );
            result.eventId = event.id;
            result.synced = true;

            logger.info(`Created Microsoft Calendar event ${event.id} for appointment ${appointment._id}`);

        } else if (action === 'update' && appointment.microsoftCalendarEventId) {
            // Update existing event
            await microsoftCalendarService.updateEvent(
                userId,
                calendarId,
                appointment.microsoftCalendarEventId,
                eventData
            );
            result.eventId = appointment.microsoftCalendarEventId;
            result.synced = true;

            logger.info(`Updated Microsoft Calendar event ${appointment.microsoftCalendarEventId}`);

        } else if (action === 'cancel' && appointment.microsoftCalendarEventId) {
            // Delete event
            await microsoftCalendarService.deleteEvent(
                userId,
                calendarId,
                appointment.microsoftCalendarEventId
            );
            result.synced = true;

            logger.info(`Deleted Microsoft Calendar event ${appointment.microsoftCalendarEventId}`);
        }

    } catch (error) {
        logger.error('Microsoft Calendar sync failed:', error);
        result.error = error.message;
    }

    return result;
}

/**
 * Build Microsoft Calendar event data from appointment
 *
 * @param {Object} appointment - Appointment document
 * @returns {Object} Microsoft Calendar event data
 */
function buildMicrosoftCalendarEvent(appointment) {
    const {
        customerName,
        customerEmail,
        scheduledTime,
        endTime,
        duration = 30,
        notes,
        location,
        meetingLink,
        locationType
    } = appointment;

    // Calculate end time if not set
    const start = new Date(scheduledTime);
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + duration * 60000);

    // Determine location
    let eventLocation = location || '';
    if (locationType === 'virtual' && meetingLink) {
        eventLocation = meetingLink;
    } else if (locationType === 'virtual') {
        eventLocation = 'Virtual Meeting';
    }

    // Build description
    let description = `Appointment with ${customerName}`;
    if (notes) {
        description += `<br><br>Notes:<br>${notes}`;
    }
    if (meetingLink) {
        description += `<br><br>Meeting Link: <a href="${meetingLink}">${meetingLink}</a>`;
    }
    if (customerEmail) {
        description += `<br><br>Client Email: ${customerEmail}`;
    }

    const event = {
        title: `Appointment - ${customerName}`,
        description,
        startDateTime: start,
        endDateTime: end,
        timezone: 'Asia/Riyadh',
        location: eventLocation ? {
            name: eventLocation
        } : null,
        attendees: []
    };

    // Add attendee if email provided
    if (customerEmail) {
        event.attendees.push({
            email: customerEmail,
            name: customerName,
            isRequired: true
        });
    }

    return event;
}

/**
 * Check if user has any calendar connected
 *
 * @param {string} userId - User ID
 * @param {string} firmId - Firm ID
 * @returns {Object} Connection status for each calendar
 */
async function getCalendarConnectionStatus(userId, firmId = null) {
    const status = {
        google: { connected: false, autoSync: false, calendarId: null },
        microsoft: { connected: false, autoSync: false, calendarId: null }
    };

    // Check Google Calendar status
    try {
        const googleIntegration = await GoogleCalendarIntegration.findOne({
            userId,
            ...(firmId && { firmId }),
            isActive: true
        });

        if (googleIntegration) {
            status.google.connected = true;
            status.google.autoSync = googleIntegration.settings?.autoSync || false;
            status.google.calendarId = googleIntegration.settings?.defaultCalendarId || 'primary';
        }
    } catch (error) {
        logger.error('Error checking Google Calendar status:', error);
    }

    // Check Microsoft Calendar status
    try {
        const user = await User.findById(userId).select('integrations');

        if (user?.integrations?.microsoftCalendar?.connected) {
            const msConfig = user.integrations.microsoftCalendar;
            status.microsoft.connected = true;
            status.microsoft.autoSync = msConfig.syncSettings?.enabled || false;
            status.microsoft.calendarId = msConfig.syncSettings?.defaultCalendarId || null;
            status.microsoft.connectedAt = msConfig.connectedAt;
            status.microsoft.lastSyncedAt = msConfig.lastSyncedAt;

            // Check if token is expired
            if (msConfig.expiresAt) {
                status.microsoft.tokenExpired = new Date() >= new Date(msConfig.expiresAt);
            }
        }
    } catch (error) {
        logger.error('Error checking Microsoft Calendar status:', error);
    }

    return status;
}

/**
 * Enable auto-sync for a user's calendar
 *
 * @param {string} userId - User ID
 * @param {string} firmId - Firm ID
 * @param {string} provider - 'google' | 'microsoft'
 * @param {string} calendarId - Calendar ID to sync to
 * @returns {boolean} Success status
 */
async function enableAutoSync(userId, firmId, provider, calendarId = 'primary') {
    try {
        if (provider === 'google') {
            await GoogleCalendarIntegration.findOneAndUpdate(
                { userId, ...(firmId && { firmId }) },
                {
                    $set: {
                        'settings.autoSync': true,
                        'settings.defaultCalendarId': calendarId
                    }
                }
            );
            return true;
        }
        return false;
    } catch (error) {
        logger.error('Error enabling auto-sync:', error);
        return false;
    }
}

/**
 * Disable auto-sync for a user's calendar
 *
 * @param {string} userId - User ID
 * @param {string} firmId - Firm ID
 * @param {string} provider - 'google' | 'microsoft'
 * @returns {boolean} Success status
 */
async function disableAutoSync(userId, firmId, provider) {
    try {
        if (provider === 'google') {
            await GoogleCalendarIntegration.findOneAndUpdate(
                { userId, ...(firmId && { firmId }) },
                { $set: { 'settings.autoSync': false } }
            );
            return true;
        }
        return false;
    } catch (error) {
        logger.error('Error disabling auto-sync:', error);
        return false;
    }
}

module.exports = {
    syncAppointmentToCalendars,
    syncToGoogleCalendar,
    syncToMicrosoftCalendar,
    getCalendarConnectionStatus,
    enableAutoSync,
    disableAutoSync,
    buildGoogleCalendarEvent,
    buildMicrosoftCalendarEvent
};
