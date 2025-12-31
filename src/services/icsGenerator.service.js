/**
 * ICS Calendar File Generator Service
 *
 * Generates iCalendar (.ics) files for appointments.
 * Compatible with Google Calendar, Apple Calendar, Microsoft Outlook, and all standard calendar apps.
 *
 * Gold Standard: Follows RFC 5545 (iCalendar) specification
 * Used by: Calendly, Cal.com, Acuity, Google Calendar, Microsoft Outlook
 */

const crypto = require('crypto');

/**
 * Format date to iCalendar format (YYYYMMDDTHHMMSSZ)
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatICSDate(date) {
    const d = new Date(date);
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Format date for all-day events (YYYYMMDD)
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatICSDateOnly(date) {
    const d = new Date(date);
    return d.toISOString().slice(0, 10).replace(/-/g, '');
}

/**
 * Escape special characters in ICS text fields
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeICSText(text) {
    if (!text) return '';
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}

/**
 * Fold long lines per RFC 5545 (max 75 chars per line)
 * @param {string} line - Line to fold
 * @returns {string} Folded line
 */
function foldLine(line) {
    const maxLength = 75;
    if (line.length <= maxLength) return line;

    const result = [];
    let remaining = line;

    // First line can be full length
    result.push(remaining.substring(0, maxLength));
    remaining = remaining.substring(maxLength);

    // Continuation lines start with space and are 74 chars
    while (remaining.length > 0) {
        result.push(' ' + remaining.substring(0, maxLength - 1));
        remaining = remaining.substring(maxLength - 1);
    }

    return result.join('\r\n');
}

/**
 * Generate a unique identifier for the event
 * @param {string} appointmentId - Appointment ID
 * @param {string} domain - Domain for the UID
 * @returns {string} Unique identifier
 */
function generateUID(appointmentId, domain = 'traf3li.com') {
    return `${appointmentId}@${domain}`;
}

/**
 * Generate ICS content for an appointment
 *
 * @param {Object} appointment - Appointment object
 * @param {string} appointment._id - Appointment ID
 * @param {string} appointment.customerName - Customer name
 * @param {string} appointment.customerEmail - Customer email
 * @param {Date} appointment.scheduledTime - Start time
 * @param {Date} appointment.endTime - End time
 * @param {number} appointment.duration - Duration in minutes
 * @param {string} appointment.notes - Appointment notes
 * @param {string} appointment.location - Physical location
 * @param {string} appointment.meetingLink - Virtual meeting link
 * @param {string} appointment.locationType - Location type (office, virtual, client_site, other)
 * @param {Object} organizer - Organizer details
 * @param {string} organizer.name - Organizer name
 * @param {string} organizer.email - Organizer email
 * @param {Object} options - Additional options
 * @param {string} options.prodId - Product identifier
 * @param {string} options.method - Calendar method (REQUEST, PUBLISH, CANCEL)
 * @param {number} options.sequence - Sequence number for updates
 * @param {string} options.status - Event status (CONFIRMED, TENTATIVE, CANCELLED)
 * @returns {string} ICS file content
 */
function generateICS(appointment, organizer = {}, options = {}) {
    const {
        _id,
        customerName,
        customerEmail,
        scheduledTime,
        endTime,
        duration = 30,
        notes = '',
        location = '',
        meetingLink = '',
        locationType = 'office'
    } = appointment;

    const {
        name: organizerName = 'Traf3li',
        email: organizerEmail = 'noreply@traf3li.com'
    } = organizer;

    const {
        prodId = '-//Traf3li//Appointments//EN',
        method = 'PUBLISH',
        sequence = 0,
        status = 'CONFIRMED'
    } = options;

    // Calculate end time if not provided
    const start = new Date(scheduledTime);
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + duration * 60000);

    // Determine location string
    let locationStr = location;
    if (locationType === 'virtual' && meetingLink) {
        locationStr = meetingLink;
    } else if (locationType === 'virtual') {
        locationStr = 'Virtual Meeting';
    }

    // Build description
    let description = notes || '';
    if (meetingLink) {
        description = description ? `${description}\\n\\nMeeting Link: ${meetingLink}` : `Meeting Link: ${meetingLink}`;
    }

    // Generate the ICS content
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        foldLine(`PRODID:${prodId}`),
        'CALSCALE:GREGORIAN',
        `METHOD:${method}`,
        'BEGIN:VEVENT',
        foldLine(`UID:${generateUID(_id.toString())}`),
        `DTSTAMP:${formatICSDate(new Date())}`,
        `DTSTART:${formatICSDate(start)}`,
        `DTEND:${formatICSDate(end)}`,
        foldLine(`SUMMARY:${escapeICSText(`Appointment with ${customerName}`)}`),
        `STATUS:${status}`,
        `SEQUENCE:${sequence}`,
        foldLine(`ORGANIZER;CN=${escapeICSText(organizerName)}:mailto:${organizerEmail}`)
    ];

    // Add attendee if customer email exists
    if (customerEmail) {
        lines.push(foldLine(`ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;CN=${escapeICSText(customerName)}:mailto:${customerEmail}`));
    }

    // Add location if exists
    if (locationStr) {
        lines.push(foldLine(`LOCATION:${escapeICSText(locationStr)}`));
    }

    // Add description if exists
    if (description) {
        lines.push(foldLine(`DESCRIPTION:${escapeICSText(description)}`));
    }

    // Add URL if meeting link exists
    if (meetingLink) {
        lines.push(foldLine(`URL:${meetingLink}`));
    }

    // Add alarm (reminder) - 15 minutes before
    lines.push(
        'BEGIN:VALARM',
        'TRIGGER:-PT15M',
        'ACTION:DISPLAY',
        foldLine(`DESCRIPTION:Reminder: Appointment with ${escapeICSText(customerName)}`),
        'END:VALARM'
    );

    lines.push('END:VEVENT', 'END:VCALENDAR');

    return lines.join('\r\n');
}

/**
 * Generate ICS for appointment cancellation
 *
 * @param {Object} appointment - Appointment object
 * @param {Object} organizer - Organizer details
 * @returns {string} ICS file content for cancellation
 */
function generateCancellationICS(appointment, organizer = {}) {
    return generateICS(appointment, organizer, {
        method: 'CANCEL',
        status: 'CANCELLED',
        sequence: 1
    });
}

/**
 * Generate "Add to Calendar" links for various calendar services
 *
 * Gold Standard: Same links used by Eventbrite, Meetup, LinkedIn Events
 *
 * @param {Object} appointment - Appointment object
 * @param {string} baseUrl - Base URL for ICS download
 * @returns {Object} Object containing calendar links
 */
function generateAddToCalendarLinks(appointment, baseUrl = 'https://api.traf3li.com') {
    const {
        _id,
        customerName,
        scheduledTime,
        endTime,
        duration = 30,
        notes = '',
        location = '',
        meetingLink = '',
        locationType = 'office'
    } = appointment;

    const start = new Date(scheduledTime);
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + duration * 60000);

    const title = `Appointment with ${customerName}`;
    const encodedTitle = encodeURIComponent(title);
    const encodedNotes = encodeURIComponent(notes || '');

    // Determine location
    let locationStr = location;
    if (locationType === 'virtual' && meetingLink) {
        locationStr = meetingLink;
    }
    const encodedLocation = encodeURIComponent(locationStr || '');

    // Format dates for Google Calendar (YYYYMMDDTHHmmssZ)
    const googleStart = start.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const googleEnd = end.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    // Format dates for Outlook (ISO 8601)
    const outlookStart = start.toISOString();
    const outlookEnd = end.toISOString();

    // Format for Yahoo (YYYYMMDDTHHMMSS without Z, duration in HHMM)
    const yahooStart = start.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, '');
    const durationHours = Math.floor(duration / 60);
    const durationMins = duration % 60;
    const yahooDuration = String(durationHours).padStart(2, '0') + String(durationMins).padStart(2, '0');

    return {
        // Google Calendar
        google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodedTitle}&dates=${googleStart}/${googleEnd}&details=${encodedNotes}&location=${encodedLocation}&sf=true&output=xml`,

        // Microsoft Outlook Web
        outlook: `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodedTitle}&startdt=${outlookStart}&enddt=${outlookEnd}&body=${encodedNotes}&location=${encodedLocation}`,

        // Microsoft Office 365
        office365: `https://outlook.office.com/calendar/0/deeplink/compose?subject=${encodedTitle}&startdt=${outlookStart}&enddt=${outlookEnd}&body=${encodedNotes}&location=${encodedLocation}`,

        // Yahoo Calendar
        yahoo: `https://calendar.yahoo.com/?v=60&title=${encodedTitle}&st=${yahooStart}&dur=${yahooDuration}&desc=${encodedNotes}&in_loc=${encodedLocation}`,

        // ICS file download (works with Apple Calendar, Outlook Desktop, any calendar app)
        ics: `${baseUrl}/api/appointments/${_id}/calendar.ics`,

        // Apple Calendar (uses the ICS file)
        apple: `${baseUrl}/api/appointments/${_id}/calendar.ics`
    };
}

/**
 * Generate calendar links in both Arabic and English
 *
 * @param {Object} appointment - Appointment object
 * @param {string} baseUrl - Base URL
 * @returns {Object} Calendar links with labels
 */
function generateCalendarLinksWithLabels(appointment, baseUrl) {
    const links = generateAddToCalendarLinks(appointment, baseUrl);

    return {
        links,
        labels: {
            google: { en: 'Google Calendar', ar: 'تقويم جوجل' },
            outlook: { en: 'Outlook.com', ar: 'أوتلوك' },
            office365: { en: 'Office 365', ar: 'أوفيس 365' },
            yahoo: { en: 'Yahoo Calendar', ar: 'تقويم ياهو' },
            apple: { en: 'Apple Calendar', ar: 'تقويم أبل' },
            ics: { en: 'Download .ics', ar: 'تحميل ملف .ics' }
        }
    };
}

module.exports = {
    generateICS,
    generateCancellationICS,
    generateAddToCalendarLinks,
    generateCalendarLinksWithLabels,
    formatICSDate,
    escapeICSText
};
