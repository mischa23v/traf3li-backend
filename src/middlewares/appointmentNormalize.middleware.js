/**
 * Appointment Normalization Middleware
 *
 * Transforms frontend field names to backend field names BEFORE validation.
 * This allows the frontend to send convenient field names while the backend
 * maintains consistent naming.
 *
 * Gold Standard: Same pattern used by Stripe, Twilio - accept multiple formats,
 * normalize internally before validation.
 *
 * Field Mappings:
 * - clientName -> customerName
 * - clientEmail -> customerEmail
 * - clientPhone -> customerPhone
 * - notes -> customerNotes
 * - lawyerId -> assignedTo
 * - date + startTime -> scheduledTime
 * - locationType aliases (video -> virtual, in-person -> office)
 * - status aliases (pending -> scheduled)
 */

/**
 * Field alias mapping: Frontend field names -> Backend field names
 */
const FIELD_ALIAS_MAP = {
    'clientName': 'customerName',
    'clientEmail': 'customerEmail',
    'clientPhone': 'customerPhone',
    'notes': 'customerNotes',
    'lawyerId': 'assignedTo'
};

/**
 * Location type mapping: Frontend values -> Backend values
 */
const LOCATION_TYPE_MAP = {
    'video': 'virtual',
    'in-person': 'office',
    'inperson': 'office',
    'in_person': 'office'
};

/**
 * Normalize appointment data from frontend format to backend format
 *
 * @param {Object} data - Raw request body data
 * @returns {Object} - Normalized data for backend validation
 */
const normalizeAppointmentData = (data) => {
    if (!data || typeof data !== 'object') {
        return data;
    }

    const normalized = { ...data };

    // 1. Map field aliases (frontend names -> backend names)
    for (const [frontendField, backendField] of Object.entries(FIELD_ALIAS_MAP)) {
        if (normalized[frontendField] !== undefined && normalized[backendField] === undefined) {
            normalized[backendField] = normalized[frontendField];
            delete normalized[frontendField];
        }
    }

    // 2. Convert date + startTime to scheduledTime
    if (normalized.date && normalized.startTime && !normalized.scheduledTime) {
        // Parse date (YYYY-MM-DD or ISO format) and time (HH:MM)
        const dateStr = normalized.date;
        const timeStr = normalized.startTime;

        // Handle various date formats
        let datePart;
        if (typeof dateStr === 'string' && dateStr.includes('T')) {
            // ISO format - extract date part
            datePart = dateStr.split('T')[0];
        } else {
            datePart = dateStr;
        }

        // Create ISO datetime string
        const isoDateTime = `${datePart}T${timeStr}:00`;
        normalized.scheduledTime = new Date(isoDateTime).toISOString();

        // Clean up temporary fields
        delete normalized.date;
        delete normalized.startTime;
    }

    // 3. Map locationType aliases and handle edge cases
    if (normalized.locationType !== undefined) {
        // Remove empty strings or null values
        if (normalized.locationType === '' || normalized.locationType === null) {
            delete normalized.locationType;
        } else if (LOCATION_TYPE_MAP[normalized.locationType]) {
            // Map known aliases
            normalized.locationType = LOCATION_TYPE_MAP[normalized.locationType];
        }
        // If it's a valid value (office, virtual, etc.), keep as-is
    }

    // 4. Map status aliases
    if (normalized.status === 'pending') {
        normalized.status = 'scheduled';
    }

    return normalized;
};

/**
 * Middleware to normalize appointment request body before validation
 *
 * Usage in routes:
 * router.post('/', normalizeAppointment, validateCreateAppointment, controller.create);
 */
const normalizeAppointment = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        req.body = normalizeAppointmentData(req.body);
    }
    next();
};

module.exports = {
    normalizeAppointment,
    normalizeAppointmentData,
    FIELD_ALIAS_MAP,
    LOCATION_TYPE_MAP
};
