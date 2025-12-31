/**
 * Appointment Controller
 *
 * Handles appointment scheduling, management, and public booking.
 */

const Appointment = require('../models/appointment.model');
const CRMSettings = require('../models/crmSettings.model');
const CrmActivity = require('../models/crmActivity.model');
const Firm = require('../models/firm.model');
const Event = require('../models/event.model');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

// Calendar integration services (Gold Standard: Calendly, Cal.com pattern)
const { generateICS, generateCancellationICS, generateCalendarLinksWithLabels } = require('../services/icsGenerator.service');
const { syncAppointmentToCalendars, getCalendarConnectionStatus } = require('../services/appointmentCalendarSync.service');

// Cache service for CRM settings optimization (Issue #5 fix - 40s load time)
const cache = require('../services/cache.service');

// ═══════════════════════════════════════════════════════════════
// CRM SETTINGS CACHE HELPER (PERFORMANCE OPTIMIZATION)
// ═══════════════════════════════════════════════════════════════

const CRM_SETTINGS_CACHE_TTL = 300; // 5 minutes cache TTL

/**
 * Generate cache key for CRM settings
 * @param {Object} firmQuery - Tenant query { firmId } or { lawyerId }
 * @returns {string} Cache key
 */
const getCrmSettingsCacheKey = (firmQuery) => {
    if (firmQuery?.firmId) {
        return `crm-settings:firm:${firmQuery.firmId}`;
    }
    if (firmQuery?.lawyerId) {
        return `crm-settings:lawyer:${firmQuery.lawyerId}`;
    }
    return null;
};

/**
 * Get CRM settings with caching (GOLD STANDARD: Performance optimization)
 * Reduces 40s load time to near-instant for subsequent requests
 * @param {Object} tenantFilter - { firmId } or { lawyerId }
 * @returns {Promise<Object|null>} CRM settings
 */
const getCRMSettingsWithCache = async (tenantFilter) => {
    const cacheKey = getCrmSettingsCacheKey(tenantFilter);

    // Try cache first
    if (cacheKey) {
        const cachedSettings = await cache.get(cacheKey);
        if (cachedSettings) {
            return cachedSettings;
        }
    }

    // Fetch from database with .lean() for performance
    let settings = await CRMSettings.findOne(tenantFilter).lean();

    // Cache the result
    if (settings && cacheKey) {
        await cache.set(cacheKey, settings, CRM_SETTINGS_CACHE_TTL);
    }

    return settings;
};

/**
 * Invalidate CRM settings cache
 * @param {Object} tenantFilter - { firmId } or { lawyerId }
 */
const invalidateCRMSettingsCache = async (tenantFilter) => {
    const cacheKey = getCrmSettingsCacheKey(tenantFilter);
    if (cacheKey) {
        await cache.del(cacheKey);
    }
};

// ═══════════════════════════════════════════════════════════════
// DEBUG LOGGING HELPER
// ═══════════════════════════════════════════════════════════════

/**
 * Log debug information for appointment API requests
 * @param {string} endpoint - Name of the endpoint
 * @param {Object} req - Express request object
 * @param {Object} extra - Additional data to log
 */
const debugLog = (endpoint, req, extra = {}) => {
    // Include key values directly in log string for Render visibility
    const debugInfo = {
        endpoint,
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        params: req.params,
        query: req.query,
        body: req.body,
        userId: req.userID,
        firmId: req.firmId,
        firmQuery: req.firmQuery,
        isSoloLawyer: req.isSoloLawyer,
        isDeparted: req.isDeparted,
        ...extra
    };
    const stepInfo = extra.step ? ` [${extra.step}]` : '';
    logger.info(`[APPOINTMENT-DEBUG] ${endpoint}${stepInfo}: userId=${req.userID} firmId=${req.firmId} isSoloLawyer=${req.isSoloLawyer} firmQuery=${JSON.stringify(req.firmQuery)} | ${JSON.stringify(debugInfo)}`);
};

/**
 * Log error with full context for debugging
 * @param {string} endpoint - Name of the endpoint
 * @param {Error} error - The error object
 * @param {Object} context - Additional context
 */
const debugError = (endpoint, error, context = {}) => {
    // Include error message directly in log string for Render visibility
    // Winston JSON format truncates secondary arguments
    const errorInfo = {
        endpoint,
        timestamp: new Date().toISOString(),
        errorMessage: error.message,
        errorName: error.name,
        errorStack: error.stack,
        ...context
    };
    logger.error(`[APPOINTMENT-ERROR] ${endpoint}: ${error.message} | Full: ${JSON.stringify(errorInfo)}`);
};

// ═══════════════════════════════════════════════════════════════
// SECURITY CONSTANTS
// ═══════════════════════════════════════════════════════════════

/**
 * Allowed fields for appointment creation
 * Includes both backend and frontend field names (aliases mapped in normalizeAppointmentData)
 */
const ALLOWED_CREATE_FIELDS = [
    // Backend field names
    'customerName',
    'customerEmail',
    'customerPhone',
    'customerNotes',
    'subject',
    'scheduledTime',
    'duration',
    'assignedTo',
    'partyId',
    'caseId',
    'appointmentWith',
    'locationType',
    'location',
    'meetingLink',
    'sendReminder',
    // New fields
    'type',
    'source',
    'price',
    'currency',
    // Frontend alias names (will be mapped)
    'clientName',
    'clientEmail',
    'clientPhone',
    'notes',
    'lawyerId',
    'date',
    'startTime'
];

/**
 * Allowed fields for appointment updates
 */
const ALLOWED_UPDATE_FIELDS = [
    // Backend field names
    'customerName',
    'customerEmail',
    'customerPhone',
    'customerNotes',
    'subject',
    'scheduledTime',
    'duration',
    'assignedTo',
    'partyId',
    'caseId',
    'locationType',
    'location',
    'meetingLink',
    'sendReminder',
    // New fields
    'type',
    'source',
    'price',
    'currency',
    'isPaid',
    'paymentId',
    'paymentMethod',
    // Frontend alias names (will be mapped)
    'clientName',
    'clientEmail',
    'clientPhone',
    'notes',
    'lawyerId',
    'date',
    'startTime'
];

/**
 * Field alias mapping: Frontend field names -> Backend field names
 * This enables frontend compatibility while keeping backend consistent
 */
const FIELD_ALIAS_MAP = {
    'clientName': 'customerName',
    'clientEmail': 'customerEmail',
    'clientPhone': 'customerPhone',
    'notes': 'customerNotes',
    'lawyerId': 'assignedTo'
};

/**
 * Normalize appointment data from frontend format to backend format
 *
 * Handles:
 * 1. Field name aliases (clientName -> customerName)
 * 2. date + startTime -> scheduledTime conversion
 * 3. locationType mapping (video -> virtual)
 * 4. status mapping (pending -> scheduled)
 *
 * @param {Object} data - Raw request data
 * @returns {Object} - Normalized data for backend
 */
const normalizeAppointmentData = (data) => {
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
        // Parse date (YYYY-MM-DD) and time (HH:MM)
        const dateStr = normalized.date;
        const timeStr = normalized.startTime;

        // Handle various date formats
        let datePart;
        if (dateStr.includes('T')) {
            // ISO format - extract date part
            datePart = dateStr.split('T')[0];
        } else {
            datePart = dateStr;
        }

        // Create ISO datetime string
        const isoDateTime = `${datePart}T${timeStr}:00`;
        normalized.scheduledTime = new Date(isoDateTime);

        // Clean up temporary fields
        delete normalized.date;
        delete normalized.startTime;
    }

    // 3. Map locationType aliases
    if (normalized.locationType) {
        const locationTypeMap = {
            'video': 'virtual',
            'in-person': 'office',
            'inperson': 'office',
            'in_person': 'office'
        };
        if (locationTypeMap[normalized.locationType]) {
            normalized.locationType = locationTypeMap[normalized.locationType];
        }
    }

    // 4. Map status aliases
    if (normalized.status === 'pending') {
        normalized.status = 'scheduled';
    }

    return normalized;
};

/**
 * Allowed fields for appointment completion
 */
const ALLOWED_COMPLETE_FIELDS = [
    'outcome',
    'followUpRequired',
    'followUpDate'
];

/**
 * Allowed fields for appointment cancellation
 */
const ALLOWED_CANCEL_FIELDS = [
    'reason'
];

// ═══════════════════════════════════════════════════════════════
// SECURITY HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Validate that a date is valid and optionally in the future
 * @param {Date|string} date - Date to validate
 * @param {boolean} mustBeFuture - Whether date must be in the future
 * @returns {boolean} - True if valid
 */
const isValidDate = (date, mustBeFuture = false) => {
    if (!date) return false;

    const dateObj = new Date(date);

    // Check if date is valid
    if (isNaN(dateObj.getTime())) return false;

    // Check if must be in future
    if (mustBeFuture && dateObj <= new Date()) return false;

    return true;
};

/**
 * Validate appointment data
 * @param {Object} data - Appointment data to validate
 * @param {boolean} isPublic - Whether this is a public booking
 * @returns {Object} - { valid: boolean, error: string|null }
 */
const validateAppointmentData = (data, isPublic = false) => {
    // Validate scheduledTime if present
    if (data.scheduledTime) {
        if (!isValidDate(data.scheduledTime, true)) {
            return {
                valid: false,
                error: 'تاريخ الموعد غير صحيح أو في الماضي / Invalid or past scheduled time'
            };
        }
    }

    // Validate duration if present
    if (data.duration) {
        const duration = parseInt(data.duration, 10);
        if (isNaN(duration) || duration < 15 || duration > 480) {
            return {
                valid: false,
                error: 'مدة الموعد يجب أن تكون بين 15 و 480 دقيقة / Duration must be between 15 and 480 minutes'
            };
        }
    }

    // Validate followUpDate if present
    if (data.followUpDate && !isValidDate(data.followUpDate, true)) {
        return {
            valid: false,
            error: 'تاريخ المتابعة غير صحيح أو في الماضي / Invalid or past follow-up date'
        };
    }

    return { valid: true, error: null };
};

/**
 * Validate and resolve target lawyer for cross-lawyer schedule management
 * Enterprise-grade validation following AWS/Azure IAM patterns
 *
 * @param {Object} req - Express request object
 * @param {string|null} targetLawyerId - Target lawyer ID from request body (optional)
 * @returns {Promise<Object>} - { valid: boolean, lawyerId: ObjectId, error: string|null, isManagingOther: boolean }
 *
 * Business Rules:
 * 1. If no targetLawyerId provided → use current user (self-management)
 * 2. If targetLawyerId === current user → self-management (no special permissions needed)
 * 3. If targetLawyerId !== current user → requires 'appointments' 'full' permission
 * 4. Target lawyer must belong to the same firm (CRITICAL: prevents cross-tenant access)
 * 5. Solo lawyers cannot manage other lawyers (they have no firm)
 */
const validateTargetLawyer = async (req, targetLawyerId) => {
    const currentUserId = req.userID;
    const firmId = req.firmQuery?.firmId;

    // Case 1: No target specified - self-management
    if (!targetLawyerId) {
        return {
            valid: true,
            lawyerId: currentUserId,
            error: null,
            isManagingOther: false
        };
    }

    // Sanitize the target lawyer ID
    const sanitizedTargetId = sanitizeObjectId(targetLawyerId);
    if (!sanitizedTargetId) {
        return {
            valid: false,
            lawyerId: null,
            error: 'targetLawyerId must be a valid ObjectId',
            isManagingOther: false
        };
    }

    // Case 2: Target is self - no special permissions needed
    if (sanitizedTargetId.toString() === currentUserId.toString()) {
        return {
            valid: true,
            lawyerId: currentUserId,
            error: null,
            isManagingOther: false
        };
    }

    // Case 3: Managing another lawyer - requires firm context and permissions

    // Solo lawyers cannot manage other lawyers
    if (!firmId) {
        return {
            valid: false,
            lawyerId: null,
            error: 'Solo lawyers cannot manage other lawyers\' schedules. Only firm members can do this.',
            isManagingOther: true
        };
    }

    // Check permission - requires 'appointments' 'full' permission
    if (!req.hasPermission || !req.hasPermission('appointments', 'full')) {
        return {
            valid: false,
            lawyerId: null,
            error: 'Permission denied. Managing other lawyers\' schedules requires \'appointments\' full permission.',
            isManagingOther: true
        };
    }

    // CRITICAL: Validate target lawyer belongs to the same firm
    // This prevents IDOR attacks where an admin tries to manage lawyers in other firms
    const firm = await Firm.findOne({
        _id: firmId,
        'members.userId': sanitizedTargetId,
        'members.status': { $ne: 'departed' }
    }).select('_id');

    if (!firm) {
        return {
            valid: false,
            lawyerId: null,
            error: 'Target lawyer not found in your firm. You can only manage schedules for active members of your firm.',
            isManagingOther: true
        };
    }

    // All validations passed
    return {
        valid: true,
        lawyerId: sanitizedTargetId,
        error: null,
        isManagingOther: true
    };
};

/**
 * Check for schedule conflicts before creating/rescheduling appointments
 * Enterprise-grade conflict detection following SAP/Microsoft/AWS patterns
 *
 * @param {Object} firmQuery - Tenant isolation query (firmId or lawyerId)
 * @param {ObjectId} assignedTo - Lawyer the appointment is assigned to
 * @param {Date} scheduledTime - Start time of the appointment
 * @param {Number} duration - Duration in minutes
 * @param {ObjectId|null} excludeAppointmentId - Exclude this appointment ID (for reschedule)
 * @returns {Promise<Object>} - { hasConflict: boolean, conflicts: Array, message: string }
 */
const checkScheduleConflicts = async (firmQuery, assignedTo, scheduledTime, duration, excludeAppointmentId = null) => {
    const startTime = new Date(scheduledTime);
    const endTime = new Date(startTime.getTime() + (duration || 30) * 60 * 1000);
    const conflicts = [];

    // 1. Check existing appointments
    const appointmentQuery = {
        ...firmQuery,
        assignedTo: assignedTo,
        status: { $in: ['scheduled', 'confirmed'] },
        $or: [
            // New appointment starts during existing
            { scheduledTime: { $lte: startTime }, endTime: { $gt: startTime } },
            // New appointment ends during existing
            { scheduledTime: { $lt: endTime }, endTime: { $gte: endTime } },
            // Existing appointment is within new appointment
            { scheduledTime: { $gte: startTime }, endTime: { $lte: endTime } },
            // New appointment is within existing
            { scheduledTime: { $lte: startTime }, endTime: { $gte: endTime } }
        ]
    };

    // Exclude current appointment if rescheduling
    if (excludeAppointmentId) {
        appointmentQuery._id = { $ne: excludeAppointmentId };
    }

    const conflictingAppointments = await Appointment.find(appointmentQuery)
        .select('appointmentNumber scheduledTime endTime customerName')
        .limit(5);

    for (const apt of conflictingAppointments) {
        conflicts.push({
            type: 'appointment',
            id: apt._id,
            reference: apt.appointmentNumber,
            title: `Appointment with ${apt.customerName}`,
            startTime: apt.scheduledTime,
            endTime: apt.endTime
        });
    }

    // 2. Check blocked times
    const BlockedTime = require('../models/blockedTime.model');
    const blockedTimeQuery = {
        ...firmQuery,
        lawyerId: assignedTo,
        $or: [
            { startDateTime: { $lte: startTime }, endDateTime: { $gt: startTime } },
            { startDateTime: { $lt: endTime }, endDateTime: { $gte: endTime } },
            { startDateTime: { $gte: startTime }, endDateTime: { $lte: endTime } },
            { startDateTime: { $lte: startTime }, endDateTime: { $gte: endTime } }
        ]
    };

    const conflictingBlocked = await BlockedTime.find(blockedTimeQuery)
        .select('startDateTime endDateTime reason')
        .limit(5);

    for (const blocked of conflictingBlocked) {
        conflicts.push({
            type: 'blocked_time',
            id: blocked._id,
            title: blocked.reason || 'Blocked time',
            startTime: blocked.startDateTime,
            endTime: blocked.endDateTime
        });
    }

    // 3. Check events (court hearings, meetings, etc.)
    // Gold Standard: Check all ways a lawyer can be associated with an event
    // - As organizer (primary owner)
    // - As attendee (invited participant)
    // - As creator (person who created the event)
    const eventQuery = {
        ...firmQuery,
        status: { $nin: ['canceled', 'cancelled'] },
        $or: [
            { organizer: assignedTo },
            { 'attendees.userId': assignedTo },
            { createdBy: assignedTo }
        ],
        $and: [
            {
                $or: [
                    { startDateTime: { $lte: startTime }, endDateTime: { $gt: startTime } },
                    { startDateTime: { $lt: endTime }, endDateTime: { $gte: endTime } },
                    { startDateTime: { $gte: startTime }, endDateTime: { $lte: endTime } },
                    { startDateTime: { $lte: startTime }, endDateTime: { $gte: endTime } }
                ]
            }
        ]
    };

    const conflictingEvents = await Event.find(eventQuery)
        .select('eventId title type startDateTime endDateTime')
        .limit(5);

    for (const event of conflictingEvents) {
        conflicts.push({
            type: 'event',
            subType: event.type,
            id: event._id,
            reference: event.eventId,
            title: event.title || `${event.type} event`,
            startTime: event.startDateTime,
            endTime: event.endDateTime
        });
    }

    // Build response
    if (conflicts.length === 0) {
        return {
            hasConflict: false,
            conflicts: [],
            message: null
        };
    }

    // Create human-readable message
    const conflictTypes = [...new Set(conflicts.map(c => c.type))];
    let message = 'الوقت المحدد يتعارض مع / Time slot conflicts with: ';
    if (conflictTypes.includes('appointment')) message += 'existing appointments, ';
    if (conflictTypes.includes('blocked_time')) message += 'blocked times, ';
    if (conflictTypes.includes('event')) message += 'scheduled events, ';
    message = message.slice(0, -2); // Remove trailing comma

    return {
        hasConflict: true,
        conflicts,
        message
    };
};

// ═══════════════════════════════════════════════════════════════
// LIST APPOINTMENTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all appointments with filters
 */
exports.getAll = async (req, res) => {
    debugLog('getAll', req);
    try {
        if (req.isDeparted) {
            debugLog('getAll', req, { blocked: 'isDeparted' });
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const {
            startDate,
            endDate,
            assignedTo,
            status,
            partyId,
            caseId,
            page = 1,
            limit = 50
        } = req.query;

        // IDOR Protection: Use firmQuery for firm isolation
        const query = { ...req.firmQuery };

        if (startDate || endDate) {
            query.scheduledTime = {};
            if (startDate) query.scheduledTime.$gte = new Date(startDate);
            if (endDate) query.scheduledTime.$lte = new Date(endDate);
        }
        if (assignedTo) query.assignedTo = assignedTo;
        if (status) query.status = status;
        if (partyId) query.partyId = partyId;
        if (caseId) query.caseId = caseId;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [appointments, total] = await Promise.all([
            Appointment.find(query)
                .populate('assignedTo', 'firstName lastName avatar email')
                .populate('partyId')
                .populate('caseId', 'title caseNumber')
                .populate('createdBy', 'firstName lastName')
                .sort({ scheduledTime: 1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Appointment.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: {
                appointments,
                total,
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        debugError('getAll', error, { query: req.query });
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب المواعيد / Error fetching appointments',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET SINGLE APPOINTMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Get appointment by ID
 */
exports.getById = async (req, res) => {
    debugLog('getById', req);
    try {
        if (req.isDeparted) {
            debugLog('getById', req, { blocked: 'isDeparted' });
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Sanitize ID param to prevent NoSQL injection
        const id = sanitizeObjectId(req.params.id);

        // IDOR Protection: Use firmQuery for firm isolation
        const appointment = await Appointment.findOne({ _id: id, ...req.firmQuery })
            .populate('assignedTo', 'firstName lastName avatar email phone')
            .populate('partyId')
            .populate('caseId', 'title caseNumber description')
            .populate('createdBy', 'firstName lastName')
            .populate('cancelledBy', 'firstName lastName');

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'الموعد غير موجود / Appointment not found'
            });
        }

        res.json({
            success: true,
            data: appointment
        });
    } catch (error) {
        debugError('getById', error, { appointmentId: req.params.id });
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب الموعد / Error fetching appointment',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET AVAILABLE SLOTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get available time slots for booking
 */
exports.getAvailableSlots = async (req, res) => {
    debugLog('getAvailableSlots', req);
    try {
        const { date, assignedTo, duration = 30 } = req.query;

        // Build tenant filter for CRM settings query
        const tenantFilter = {};
        if (req.firmQuery?.firmId) {
            tenantFilter.firmId = req.firmQuery.firmId;
        } else if (req.firmQuery?.lawyerId) {
            tenantFilter.lawyerId = req.firmQuery.lawyerId;
        }

        // Get CRM settings for working hours
        // GOLD STANDARD: Use cached settings for performance (Issue #5 fix)
        // Reduces 40s load time to near-instant for subsequent requests
        let settings = await getCRMSettingsWithCache(tenantFilter);

        if (!settings && (tenantFilter.firmId || tenantFilter.lawyerId)) {
            // Auto-create CRM settings with sensible defaults (supports firms AND solo lawyers)
            settings = await CRMSettings.getOrCreateByQuery(tenantFilter);
            // Cache the newly created settings
            const cacheKey = getCrmSettingsCacheKey(tenantFilter);
            if (cacheKey) {
                await cache.set(cacheKey, settings.toObject ? settings.toObject() : settings, CRM_SETTINGS_CACHE_TTL);
            }
        }

        if (!settings) {
            return res.status(400).json({
                success: false,
                message: 'لم يتم العثور على إعدادات / Settings not found. Please contact support.'
            });
        }

        if (!settings.appointmentSettings?.enabled) {
            return res.status(400).json({
                success: false,
                message: 'المواعيد غير مفعلة / Appointments are disabled'
            });
        }

        const requestedDate = new Date(date);
        const dayOfWeek = requestedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        // OPTIMIZATION: Direct property access (compatible with .lean() cached objects)
        const workingHours = settings.appointmentSettings?.workingHours?.[dayOfWeek] || {
            enabled: false,
            start: '09:00',
            end: '17:00'
        };

        if (!workingHours.enabled) {
            return res.json({
                success: true,
                data: {
                    date: date,
                    dayOfWeek,
                    working: false,
                    slots: []
                }
            });
        }

        const buffer = settings.appointmentSettings.bufferBetweenAppointments || 15;

        // Pass firmQuery for tenant isolation
        const slots = await Appointment.getAvailableSlots(
            req.firmQuery,
            requestedDate,
            assignedTo,
            parseInt(duration),
            workingHours,
            buffer
        );

        res.json({
            success: true,
            data: {
                date: date,
                dayOfWeek,
                working: true,
                workingHours,
                slots
            }
        });
    } catch (error) {
        debugError('getAvailableSlots', error, { query: req.query });
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب الفترات المتاحة / Error fetching available slots',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// CREATE APPOINTMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new appointment
 */
exports.create = async (req, res) => {
    debugLog('create', req, {
        isSoloLawyer: req.isSoloLawyer,
        firmId: req.firmId,
        firmQuery: req.firmQuery
    });
    try {
        if (req.isDeparted) {
            debugLog('create', req, { blocked: 'isDeparted' });
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // CRITICAL: Verify tenant context is properly set up
        // If firmQuery is empty, the user wasn't recognized as solo lawyer or firm member
        const hasTenantContext = req.firmQuery && (req.firmQuery.firmId || req.firmQuery.lawyerId);
        if (!hasTenantContext) {
            logger.error('[APPOINTMENT-ERROR] Missing tenant context:', {
                userId: req.userID,
                firmId: req.firmId,
                isSoloLawyer: req.isSoloLawyer,
                firmQuery: req.firmQuery,
                message: 'User not recognized as solo lawyer or firm member. Check user.role in database.'
            });
            return res.status(403).json({
                success: false,
                message: 'Access denied. You must be part of a firm or registered as a solo lawyer.',
                code: 'MISSING_TENANT_CONTEXT',
                hint: 'Ensure your user account has role="lawyer" or is associated with a firm.'
            });
        }

        const userId = req.userID;

        // FRONTEND COMPATIBILITY: Normalize field names and convert date+startTime
        const normalizedBody = normalizeAppointmentData(req.body);
        debugLog('create', req, { step: 'normalized', normalizedBody });

        // Mass assignment protection: only allow specific fields
        const safeData = pickAllowedFields(normalizedBody, ALLOWED_CREATE_FIELDS);
        debugLog('create', req, { step: 'safeData', safeData });

        // Set default source if not provided
        if (!safeData.source) {
            safeData.source = 'manual';
        }

        // Validate appointment data
        const validation = validateAppointmentData(safeData);
        if (!validation.valid) {
            debugLog('create', req, { step: 'validation_failed', validation, safeData });
            return res.status(400).json({
                success: false,
                message: validation.error
            });
        }

        // GOLD STANDARD: Validate working hours before creating appointment
        // Same pattern as publicBook - prevents scheduling on disabled days
        // OPTIMIZATION: Use cached settings for performance (Issue #5 fix)
        if (safeData.scheduledTime) {
            let settings = await getCRMSettingsWithCache(req.firmQuery);
            if (!settings) {
                settings = await CRMSettings.getOrCreateByQuery(req.firmQuery);
                // Cache the newly created settings
                const cacheKey = getCrmSettingsCacheKey(req.firmQuery);
                if (cacheKey) {
                    await cache.set(cacheKey, settings.toObject ? settings.toObject() : settings, CRM_SETTINGS_CACHE_TTL);
                }
            }

            if (settings?.appointmentSettings?.enabled) {
                const requestedDate = new Date(safeData.scheduledTime);
                const dayOfWeek = requestedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
                const workingHours = settings.appointmentSettings?.workingHours?.[dayOfWeek];

                if (!workingHours?.enabled) {
                    debugLog('create', req, { step: 'working_hours_disabled', dayOfWeek, workingHours });
                    return res.status(400).json({
                        success: false,
                        message: 'هذا اليوم غير متاح للمواعيد / This day is not available for appointments',
                        dayOfWeek,
                        workingHoursEnabled: false
                    });
                }

                // Also validate time is within working hours
                const requestedTime = requestedDate.getHours() * 60 + requestedDate.getMinutes();
                const [startHour, startMin] = (workingHours.start || '09:00').split(':').map(Number);
                const [endHour, endMin] = (workingHours.end || '17:00').split(':').map(Number);
                const workStart = startHour * 60 + startMin;
                const workEnd = endHour * 60 + endMin;

                if (requestedTime < workStart || requestedTime >= workEnd) {
                    debugLog('create', req, { step: 'outside_working_hours', requestedTime, workStart, workEnd });
                    return res.status(400).json({
                        success: false,
                        message: 'الوقت المحدد خارج ساعات العمل / Requested time is outside working hours',
                        workingHours: { start: workingHours.start, end: workingHours.end }
                    });
                }
            }
        }

        // Enterprise: Check for schedule conflicts before creating
        // Default assignedTo to current user if not provided
        const assignedTo = safeData.assignedTo || userId;
        const conflictCheck = await checkScheduleConflicts(
            req.firmQuery,
            assignedTo,
            safeData.scheduledTime,
            safeData.duration || 30
        );

        if (conflictCheck.hasConflict) {
            debugLog('create', req, { step: 'conflict_found', conflictCheck });
            return res.status(409).json({
                success: false,
                message: conflictCheck.message,
                conflicts: conflictCheck.conflicts
            });
        }

        // Multi-tenancy: Use req.addFirmId() for proper firm/solo lawyer isolation
        const appointmentData = req.addFirmId({
            ...safeData,
            assignedTo,  // Use the resolved assignedTo (with default)
            createdBy: userId,
            status: 'scheduled' // Force status to prevent mass assignment
        });
        debugLog('create', req, { step: 'appointmentData', appointmentData });

        const appointment = await Appointment.create(appointmentData);
        debugLog('create', req, { step: 'created', appointmentId: appointment._id, appointmentNumber: appointment.appointmentNumber });

        // Populate for response
        await appointment.populate([
            { path: 'assignedTo', select: 'firstName lastName avatar email' },
            { path: 'partyId' },
            { path: 'caseId', select: 'title caseNumber' }
        ]);

        // Log activity (non-blocking - don't fail request if activity logging fails)
        try {
            await CrmActivity.logActivity({
                lawyerId: userId,
                type: 'appointment_created',
                entityType: 'appointment',
                entityId: appointment._id,
                entityName: appointment.appointmentNumber,
                title: `Appointment created: ${appointment.appointmentNumber}`,
                description: `With ${appointment.customerName} on ${appointment.scheduledTime}`,
                performedBy: userId
            });
        } catch (activityError) {
            logger.warn('Activity logging failed (non-blocking):', activityError.message);
        }

        // Gold Standard: Auto-sync to connected calendars (Google, Microsoft)
        let calendarSync = null;
        try {
            const syncResult = await syncAppointmentToCalendars(
                appointment,
                assignedTo,
                req.firmQuery,
                'create'
            );

            // Update appointment with calendar event IDs if synced
            const calendarUpdateFields = {};
            if (syncResult.google?.eventId) {
                calendarUpdateFields.calendarEventId = syncResult.google.eventId;
                appointment.calendarEventId = syncResult.google.eventId;
            }
            if (syncResult.microsoft?.eventId) {
                calendarUpdateFields.microsoftCalendarEventId = syncResult.microsoft.eventId;
                appointment.microsoftCalendarEventId = syncResult.microsoft.eventId;
            }
            if (Object.keys(calendarUpdateFields).length > 0) {
                // SECURITY: Use findOneAndUpdate with firmQuery instead of findByIdAndUpdate
                await Appointment.findOneAndUpdate(
                    { _id: appointment._id, ...req.firmQuery },
                    calendarUpdateFields
                );
            }

            calendarSync = syncResult;
        } catch (syncError) {
            logger.warn('Calendar sync failed (non-blocking):', syncError.message);
        }

        // Generate "Add to Calendar" links for the response (non-blocking)
        let calendarLinks = { links: {} };
        try {
            calendarLinks = generateCalendarLinksWithLabels(
                appointment,
                process.env.API_URL || 'https://api.traf3li.com'
            );
        } catch (linksError) {
            logger.warn('Calendar links generation failed (non-blocking):', linksError.message);
        }

        res.status(201).json({
            success: true,
            message: 'تم إنشاء الموعد بنجاح / Appointment created successfully',
            data: appointment,
            calendarLinks: calendarLinks.links,
            calendarSync
        });
    } catch (error) {
        debugError('create', error, {
            body: req.body,
            userId: req.userID,
            firmQuery: req.firmQuery,
            errorCode: error.code,
            errorName: error.name,
            keyPattern: error.keyPattern,
            keyValue: error.keyValue
        });

        // Handle MongoDB duplicate key error specifically
        if (error.code === 11000) {
            logger.error('[APPOINTMENT-ERROR] Duplicate key error - possible index issue with solo lawyers:', {
                keyPattern: error.keyPattern,
                keyValue: error.keyValue,
                message: 'This may be caused by old unique index on (firmId, appointmentNumber). Drop old index: db.appointments.dropIndex({ firmId: 1, appointmentNumber: 1 })'
            });
            return res.status(409).json({
                success: false,
                message: 'رقم الموعد موجود بالفعل / Appointment number already exists',
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'خطأ في إنشاء الموعد / Error creating appointment',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// PUBLIC BOOKING
// ═══════════════════════════════════════════════════════════════

/**
 * Public booking endpoint (no auth required)
 */
exports.publicBook = async (req, res) => {
    debugLog('publicBook', req, { firmIdParam: req.params.firmId });
    try {
        const { firmId } = req.params;

        // FRONTEND COMPATIBILITY: Normalize field names and convert date+startTime
        const normalizedBody = normalizeAppointmentData(req.body);
        debugLog('publicBook', req, { step: 'normalized', normalizedBody });

        // Mass assignment protection: extract only allowed fields
        const publicAllowedFields = [
            'customerName',
            'customerEmail',
            'customerPhone',
            'customerNotes',
            'subject',
            'scheduledTime',
            'duration',
            'type',
            'locationType'
        ];
        const safeInputData = pickAllowedFields(normalizedBody, publicAllowedFields);

        // Get CRM settings - OPTIMIZED: Use cached settings (Issue #5 fix)
        const tenantFilter = { firmId: mongoose.Types.ObjectId.isValid(firmId) ? firmId : null };
        const settings = await getCRMSettingsWithCache(tenantFilter);

        if (!settings?.appointmentSettings?.publicBookingEnabled) {
            return res.status(400).json({
                success: false,
                message: 'الحجز العام غير مفعل / Public booking is disabled'
            });
        }

        // Validate input data
        const validation = validateAppointmentData(safeInputData, true);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.error
            });
        }

        // Validate slot availability
        const requestedDate = new Date(safeInputData.scheduledTime);
        const dayOfWeek = requestedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const workingHours = settings.appointmentSettings?.workingHours?.[dayOfWeek];

        if (!workingHours?.enabled) {
            return res.status(400).json({
                success: false,
                message: 'هذا اليوم غير متاح للحجز / This day is not available for booking'
            });
        }

        // Select an agent (round robin or first available)
        const agentList = settings.appointmentSettings?.agentList || [];
        if (agentList.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'لا يوجد وكلاء متاحين / No agents available'
            });
        }

        // Simple round-robin: pick first agent
        const assignedTo = agentList[0];

        const appointmentData = {
            firmId,
            customerName: safeInputData.customerName,
            customerEmail: safeInputData.customerEmail,
            customerPhone: safeInputData.customerPhone,
            customerNotes: safeInputData.customerNotes,
            scheduledTime: requestedDate,
            duration: safeInputData.duration || settings.appointmentSettings.defaultDuration || 30,
            assignedTo,
            appointmentWith: 'lead',
            type: safeInputData.type || 'consultation',
            locationType: safeInputData.locationType || 'office',
            source: 'public_booking',
            status: 'scheduled',
            sendReminder: settings.appointmentSettings.sendReminders
        };

        const appointment = await Appointment.create(appointmentData);

        // Gold Standard: Auto-sync public bookings to assigned lawyer's calendar
        let calendarSync = null;
        try {
            const syncResult = await syncAppointmentToCalendars(
                appointment,
                assignedTo,
                firmId,
                'create'
            );

            // Update appointment with calendar event IDs if synced
            const calendarUpdateFields = {};
            if (syncResult.google?.eventId) {
                calendarUpdateFields.calendarEventId = syncResult.google.eventId;
            }
            if (syncResult.microsoft?.eventId) {
                calendarUpdateFields.microsoftCalendarEventId = syncResult.microsoft.eventId;
            }
            if (Object.keys(calendarUpdateFields).length > 0) {
                // SECURITY: Use findOneAndUpdate with firmId instead of findByIdAndUpdate
                await Appointment.findOneAndUpdate(
                    { _id: appointment._id, firmId },
                    calendarUpdateFields
                );
            }

            calendarSync = syncResult;
        } catch (syncError) {
            logger.warn('Public booking calendar sync failed (non-blocking):', syncError.message);
        }

        // Generate "Add to Calendar" links for customer
        const calendarLinks = generateCalendarLinksWithLabels(
            appointment,
            process.env.API_URL || 'https://api.traf3li.com'
        );

        // TODO: Send confirmation email to customer with calendar links

        res.status(201).json({
            success: true,
            message: 'تم حجز الموعد بنجاح / Appointment booked successfully',
            data: {
                appointmentNumber: appointment.appointmentNumber,
                scheduledTime: appointment.scheduledTime,
                duration: appointment.duration,
                status: appointment.status
            },
            calendarLinks: calendarLinks.links,
            calendarSync
        });
    } catch (error) {
        debugError('publicBook', error, { body: req.body, firmId: req.params.firmId });
        res.status(500).json({
            success: false,
            message: 'خطأ في الحجز / Error booking appointment',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// UPDATE APPOINTMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Update an appointment
 */
exports.update = async (req, res) => {
    debugLog('update', req);
    try {
        if (req.isDeparted) {
            debugLog('update', req, { blocked: 'isDeparted' });
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Sanitize ID param to prevent NoSQL injection
        const id = sanitizeObjectId(req.params.id);
        const userId = req.userID;

        // FRONTEND COMPATIBILITY: Normalize field names and convert date+startTime
        const normalizedBody = normalizeAppointmentData(req.body);
        debugLog('update', req, { step: 'normalized', normalizedBody, appointmentId: id });

        // Mass assignment protection: only allow specific fields
        const safeData = pickAllowedFields(normalizedBody, ALLOWED_UPDATE_FIELDS);

        // Validate appointment data
        const validation = validateAppointmentData(safeData);
        if (!validation.valid) {
            debugLog('update', req, { step: 'validation_failed', validation, safeData });
            return res.status(400).json({
                success: false,
                message: validation.error
            });
        }

        // IDOR Protection: Find with firmQuery first
        const appointment = await Appointment.findOne({ _id: id, ...req.firmQuery });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'الموعد غير موجود / Appointment not found'
            });
        }

        // Gold Standard: Use .save() instead of findOneAndUpdate to trigger pre-save hooks
        // This ensures endTime is recalculated when duration changes (same pattern as SAP, Salesforce)
        Object.assign(appointment, safeData);
        await appointment.save();

        // Populate for response
        await appointment.populate([
            { path: 'assignedTo', select: 'firstName lastName avatar email' },
            { path: 'partyId' },
            { path: 'caseId', select: 'title caseNumber' }
        ]);

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'appointment_updated',
            entityType: 'appointment',
            entityId: appointment._id,
            entityName: appointment.appointmentNumber,
            title: `Appointment updated: ${appointment.appointmentNumber}`,
            performedBy: userId
        });

        // Gold Standard: Sync update to connected calendars
        let calendarSync = null;
        try {
            if (appointment.calendarEventId || appointment.microsoftCalendarEventId) {
                calendarSync = await syncAppointmentToCalendars(
                    appointment,
                    appointment.assignedTo,
                    req.firmQuery,
                    'update'
                );
            }
        } catch (syncError) {
            logger.warn('Calendar update sync failed (non-blocking):', syncError.message);
        }

        res.json({
            success: true,
            message: 'تم تحديث الموعد بنجاح / Appointment updated successfully',
            data: appointment,
            calendarSync
        });
    } catch (error) {
        debugError('update', error, { body: req.body, appointmentId: req.params.id });
        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث الموعد / Error updating appointment',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// DELETE APPOINTMENT (Hard Delete)
// ═══════════════════════════════════════════════════════════════

/**
 * Delete an appointment permanently (DELETE /api/v1/appointments/:id)
 *
 * This performs a HARD DELETE - the appointment is removed from the database.
 * Users should reschedule if they want to change the date, or delete if they
 * no longer need the appointment.
 */
exports.cancel = async (req, res) => {
    const totalStart = Date.now();
    debugLog('delete', req, {
        step: 'START',
        appointmentId: req.params.id
    });

    logger.info(`🗑️ [APPOINTMENT-DELETE] START: appointmentId=${req.params.id} userId=${req.userID}`);

    try {
        if (req.isDeparted) {
            debugLog('delete', req, { step: 'BLOCKED', reason: 'isDeparted' });
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Sanitize ID param to prevent NoSQL injection
        const id = sanitizeObjectId(req.params.id);
        const userId = req.userID;

        if (!id) {
            debugLog('delete', req, { step: 'INVALID_ID', rawId: req.params.id });
            return res.status(400).json({
                success: false,
                message: 'معرف الموعد غير صالح / Invalid appointment ID'
            });
        }

        // IDOR Protection: Find appointment with tenant isolation
        const dbStart = Date.now();
        const appointment = await Appointment.findOne({ _id: id, ...req.firmQuery });
        const dbTime = Date.now() - dbStart;

        debugLog('delete', req, {
            step: 'DB_QUERY_DONE',
            dbTime,
            found: !!appointment,
            appointmentNumber: appointment?.appointmentNumber
        });

        if (!appointment) {
            logger.warn(`🗑️ [APPOINTMENT-DELETE] NOT_FOUND: id=${id}`);
            return res.status(404).json({
                success: false,
                message: 'الموعد غير موجود / Appointment not found'
            });
        }

        // Store appointment info before deletion for logging and calendar sync
        const appointmentInfo = {
            _id: appointment._id,
            appointmentNumber: appointment.appointmentNumber,
            customerName: appointment.customerName,
            scheduledTime: appointment.scheduledTime,
            assignedTo: appointment.assignedTo,
            calendarEventId: appointment.calendarEventId,
            microsoftCalendarEventId: appointment.microsoftCalendarEventId
        };

        // Delete from connected calendars BEFORE deleting from database
        let calendarSync = null;
        try {
            if (appointmentInfo.calendarEventId || appointmentInfo.microsoftCalendarEventId) {
                debugLog('delete', req, { step: 'CALENDAR_SYNC_START' });
                calendarSync = await syncAppointmentToCalendars(
                    appointment,
                    appointmentInfo.assignedTo,
                    req.firmQuery,
                    'cancel' // 'cancel' action deletes from calendar
                );
                debugLog('delete', req, { step: 'CALENDAR_SYNC_DONE', calendarSync });
            }
        } catch (syncError) {
            debugLog('delete', req, { step: 'CALENDAR_SYNC_ERROR', error: syncError.message });
            logger.warn('Calendar deletion sync failed (non-blocking):', syncError.message);
        }

        // HARD DELETE from database
        const deleteStart = Date.now();
        await Appointment.findOneAndDelete({ _id: id, ...req.firmQuery });
        const deleteTime = Date.now() - deleteStart;

        debugLog('delete', req, { step: 'DELETED', deleteTime });
        logger.info(`🗑️ [APPOINTMENT-DELETE] SUCCESS: appointmentNumber=${appointmentInfo.appointmentNumber} deleteTime=${deleteTime}ms`);

        // Log activity
        const activityStart = Date.now();
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'appointment_deleted',
            entityType: 'appointment',
            entityId: appointmentInfo._id,
            entityName: appointmentInfo.appointmentNumber,
            title: `Appointment deleted: ${appointmentInfo.appointmentNumber}`,
            description: `Deleted appointment with ${appointmentInfo.customerName}`,
            performedBy: userId
        });
        const activityTime = Date.now() - activityStart;

        const totalTime = Date.now() - totalStart;
        debugLog('delete', req, {
            step: 'SUCCESS',
            totalTime,
            dbTime,
            deleteTime,
            activityTime,
            appointmentNumber: appointmentInfo.appointmentNumber
        });

        res.json({
            success: true,
            message: 'تم حذف الموعد بنجاح / Appointment deleted successfully',
            data: {
                deletedAppointment: appointmentInfo.appointmentNumber,
                customerName: appointmentInfo.customerName
            },
            calendarSync,
            timing: { total: totalTime, db: dbTime, delete: deleteTime, activity: activityTime }
        });
    } catch (error) {
        debugError('delete', error, { appointmentId: req.params.id });
        logger.error(`🗑️ [APPOINTMENT-DELETE] ERROR: ${error.message}`, {
            appointmentId: req.params.id
        });
        res.status(500).json({
            success: false,
            message: 'خطأ في حذف الموعد / Error deleting appointment',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// COMPLETE APPOINTMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Mark appointment as completed
 */
exports.complete = async (req, res) => {
    debugLog('complete', req);
    try {
        if (req.isDeparted) {
            debugLog('complete', req, { blocked: 'isDeparted' });
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Sanitize ID param to prevent NoSQL injection
        const id = sanitizeObjectId(req.params.id);
        const userId = req.userID;
        debugLog('complete', req, { step: 'starting', appointmentId: id });

        // Mass assignment protection: only allow specific fields
        const safeData = pickAllowedFields(req.body, ALLOWED_COMPLETE_FIELDS);

        // Validate appointment data
        const validation = validateAppointmentData(safeData);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.error
            });
        }

        // IDOR Protection: Verify appointment belongs to user's firm/lawyer
        const appointment = await Appointment.findOne({ _id: id, ...req.firmQuery });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'الموعد غير موجود / Appointment not found'
            });
        }

        await appointment.complete(safeData.outcome, safeData.followUpRequired, safeData.followUpDate);

        // Gold Standard: Sync completion status to connected calendars
        let calendarSync = null;
        try {
            if (appointment.calendarEventId || appointment.microsoftCalendarEventId) {
                calendarSync = await syncAppointmentToCalendars(
                    appointment,
                    appointment.assignedTo,
                    req.firmQuery,
                    'update'
                );
            }
        } catch (syncError) {
            logger.warn('Calendar complete sync failed (non-blocking):', syncError.message);
        }

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'appointment_completed',
            entityType: 'appointment',
            entityId: appointment._id,
            entityName: appointment.appointmentNumber,
            title: `Appointment completed: ${appointment.appointmentNumber}`,
            description: safeData.outcome,
            performedBy: userId
        });

        res.json({
            success: true,
            message: 'تم إكمال الموعد بنجاح / Appointment completed successfully',
            data: appointment,
            calendarSync
        });
    } catch (error) {
        debugError('complete', error, { body: req.body, appointmentId: req.params.id });
        res.status(500).json({
            success: false,
            message: 'خطأ في إكمال الموعد / Error completing appointment',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// MARK NO-SHOW
// ═══════════════════════════════════════════════════════════════

/**
 * Mark appointment as no-show
 */
exports.markNoShow = async (req, res) => {
    debugLog('markNoShow', req);
    try {
        if (req.isDeparted) {
            debugLog('markNoShow', req, { blocked: 'isDeparted' });
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Sanitize ID param to prevent NoSQL injection
        const id = sanitizeObjectId(req.params.id);
        const userId = req.userID;
        debugLog('markNoShow', req, { step: 'starting', appointmentId: id });

        // IDOR Protection: Verify appointment belongs to user's firm/lawyer
        const appointment = await Appointment.findOne({ _id: id, ...req.firmQuery });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'الموعد غير موجود / Appointment not found'
            });
        }

        await appointment.markNoShow();

        // Gold Standard: Sync no-show status to connected calendars
        let calendarSync = null;
        try {
            if (appointment.calendarEventId || appointment.microsoftCalendarEventId) {
                calendarSync = await syncAppointmentToCalendars(
                    appointment,
                    appointment.assignedTo,
                    req.firmQuery,
                    'update'
                );
            }
        } catch (syncError) {
            logger.warn('Calendar no-show sync failed (non-blocking):', syncError.message);
        }

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'appointment_no_show',
            entityType: 'appointment',
            entityId: appointment._id,
            entityName: appointment.appointmentNumber,
            title: `No-show: ${appointment.appointmentNumber}`,
            performedBy: userId
        });

        res.json({
            success: true,
            message: 'تم تسجيل عدم الحضور / No-show recorded',
            data: appointment,
            calendarSync
        });
    } catch (error) {
        debugError('markNoShow', error, { appointmentId: req.params.id });
        res.status(500).json({
            success: false,
            message: 'خطأ في تسجيل عدم الحضور / Error marking no-show',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// CONFIRM APPOINTMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Confirm an appointment
 */
exports.confirm = async (req, res) => {
    debugLog('confirm', req);
    try {
        if (req.isDeparted) {
            debugLog('confirm', req, { blocked: 'isDeparted' });
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Sanitize ID param to prevent NoSQL injection
        const id = sanitizeObjectId(req.params.id);
        const userId = req.userID;
        debugLog('confirm', req, { step: 'starting', appointmentId: id });

        // IDOR Protection: Verify appointment belongs to user's firm/lawyer
        const appointment = await Appointment.findOne({ _id: id, ...req.firmQuery });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'الموعد غير موجود / Appointment not found'
            });
        }

        await appointment.confirm();

        // Gold Standard: Sync confirmation status to connected calendars
        let calendarSync = null;
        try {
            if (appointment.calendarEventId || appointment.microsoftCalendarEventId) {
                calendarSync = await syncAppointmentToCalendars(
                    appointment,
                    appointment.assignedTo,
                    req.firmId,
                    'update'
                );
            }
        } catch (syncError) {
            logger.warn('Calendar confirm sync failed (non-blocking):', syncError.message);
        }

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'appointment_confirmed',
            entityType: 'appointment',
            entityId: appointment._id,
            entityName: appointment.appointmentNumber,
            title: `Appointment confirmed: ${appointment.appointmentNumber}`,
            performedBy: userId
        });

        res.json({
            success: true,
            message: 'تم تأكيد الموعد / Appointment confirmed',
            data: appointment,
            calendarSync
        });
    } catch (error) {
        debugError('confirm', error, { appointmentId: req.params.id });
        res.status(500).json({
            success: false,
            message: 'خطأ في تأكيد الموعد / Error confirming appointment',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// AVAILABILITY MANAGEMENT
// ═══════════════════════════════════════════════════════════════

const AvailabilitySlot = require('../models/availabilitySlot.model');
const BlockedTime = require('../models/blockedTime.model');

/**
 * Allowed fields for availability creation/update
 */
const ALLOWED_AVAILABILITY_FIELDS = [
    'dayOfWeek',
    'startTime',
    'endTime',
    'slotDuration',
    'breakBetweenSlots',
    'isActive',
    'targetLawyerId' // Enterprise: allows firm admins to manage other lawyers' availability
];

/**
 * Allowed fields for blocked time creation
 */
const ALLOWED_BLOCKED_TIME_FIELDS = [
    'startDateTime',
    'endDateTime',
    'reason',
    'isAllDay',
    'isRecurring',
    'recurrencePattern',
    'targetLawyerId' // Enterprise: allows firm admins to manage other lawyers' blocked times
];

/**
 * Get lawyer's availability schedule
 */
exports.getAvailability = async (req, res) => {
    debugLog('getAvailability', req);
    try {
        if (req.isDeparted) {
            debugLog('getAvailability', req, { blocked: 'isDeparted' });
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const { lawyerId } = req.query;
        const targetLawyerId = lawyerId || req.userID;
        debugLog('getAvailability', req, { step: 'starting', targetLawyerId });

        // IDOR Protection: Use firmQuery for firm isolation
        const slots = await AvailabilitySlot.find({
            ...req.firmQuery,
            lawyerId: targetLawyerId
        }).sort({ dayOfWeek: 1, startTime: 1 });

        res.json({
            success: true,
            data: slots
        });
    } catch (error) {
        debugError('getAvailability', error, { query: req.query });
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب جدول التوفر / Error fetching availability',
            error: error.message
        });
    }
};

/**
 * Create availability slot
 *
 * Enterprise Feature: Supports cross-lawyer schedule management
 * - If no targetLawyerId provided: creates availability for current user
 * - If targetLawyerId provided: requires 'appointments' 'full' permission and firm membership validation
 */
exports.createAvailability = async (req, res) => {
    debugLog('createAvailability', req);
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Mass assignment protection
        const safeData = pickAllowedFields(req.body, ALLOWED_AVAILABILITY_FIELDS);
        debugLog('createAvailability', req, { step: 'safeData', safeData });

        // Enterprise: Validate target lawyer (self or another firm member with permissions)
        const targetValidation = await validateTargetLawyer(req, safeData.targetLawyerId);
        if (!targetValidation.valid) {
            return res.status(403).json({
                success: false,
                message: targetValidation.error
            });
        }

        // Remove targetLawyerId from data (it's not a model field)
        delete safeData.targetLawyerId;

        // Use req.addFirmId() for proper firm/solo lawyer isolation
        const slotData = req.addFirmId({
            ...safeData,
            lawyerId: targetValidation.lawyerId
        });

        const slot = await AvailabilitySlot.create(slotData);

        // Log if managing another lawyer's schedule
        if (targetValidation.isManagingOther) {
            logger.info(`User ${req.userID} created availability slot for lawyer ${targetValidation.lawyerId}`);
        }

        res.status(201).json({
            success: true,
            message: 'تم إنشاء فترة التوفر بنجاح / Availability slot created successfully',
            data: slot
        });
    } catch (error) {
        debugError('createAvailability', error, { body: req.body });
        res.status(500).json({
            success: false,
            message: 'خطأ في إنشاء فترة التوفر / Error creating availability',
            error: error.message
        });
    }
};

/**
 * Update availability slot
 */
exports.updateAvailability = async (req, res) => {
    debugLog('updateAvailability', req);
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Sanitize ID param to prevent NoSQL injection
        const id = sanitizeObjectId(req.params.id);
        debugLog('updateAvailability', req, { step: 'starting', slotId: id });

        // Mass assignment protection
        const safeData = pickAllowedFields(req.body, ALLOWED_AVAILABILITY_FIELDS);

        // IDOR Protection: Update with firmQuery
        const slot = await AvailabilitySlot.findOneAndUpdate(
            { _id: id, ...req.firmQuery },
            { $set: safeData },
            { new: true, runValidators: true }
        );

        if (!slot) {
            return res.status(404).json({
                success: false,
                message: 'فترة التوفر غير موجودة / Availability slot not found'
            });
        }

        res.json({
            success: true,
            message: 'تم تحديث فترة التوفر بنجاح / Availability slot updated successfully',
            data: slot
        });
    } catch (error) {
        debugError('updateAvailability', error, { body: req.body, slotId: req.params.id });
        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث فترة التوفر / Error updating availability',
            error: error.message
        });
    }
};

/**
 * Delete availability slot
 */
exports.deleteAvailability = async (req, res) => {
    debugLog('deleteAvailability', req);
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Sanitize ID param to prevent NoSQL injection
        const id = sanitizeObjectId(req.params.id);
        debugLog('deleteAvailability', req, { step: 'starting', slotId: id });

        // IDOR Protection: Delete with firmQuery
        const slot = await AvailabilitySlot.findOneAndDelete({
            _id: id,
            ...req.firmQuery
        });

        if (!slot) {
            return res.status(404).json({
                success: false,
                message: 'فترة التوفر غير موجودة / Availability slot not found'
            });
        }

        res.json({
            success: true,
            message: 'تم حذف فترة التوفر بنجاح / Availability slot deleted successfully'
        });
    } catch (error) {
        debugError('deleteAvailability', error, { slotId: req.params.id });
        res.status(500).json({
            success: false,
            message: 'خطأ في حذف فترة التوفر / Error deleting availability',
            error: error.message
        });
    }
};

/**
 * Bulk update availability (replace entire schedule)
 *
 * Enterprise Feature: Supports cross-lawyer schedule management
 * - If no targetLawyerId provided: updates current user's schedule
 * - If targetLawyerId provided: requires 'appointments' 'full' permission and firm membership validation
 */
exports.bulkUpdateAvailability = async (req, res) => {
    debugLog('bulkUpdateAvailability', req);
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const { slots, targetLawyerId } = req.body;
        debugLog('bulkUpdateAvailability', req, { step: 'starting', slotsCount: slots?.length, targetLawyerId });

        if (!Array.isArray(slots)) {
            return res.status(400).json({
                success: false,
                message: 'slots must be an array'
            });
        }

        // Enterprise: Validate target lawyer (self or another firm member with permissions)
        const targetValidation = await validateTargetLawyer(req, targetLawyerId);
        if (!targetValidation.valid) {
            return res.status(403).json({
                success: false,
                message: targetValidation.error
            });
        }

        // Validate each slot and remove targetLawyerId if present
        const safeSlots = slots.map(slot => {
            const safeSlot = pickAllowedFields(slot, ALLOWED_AVAILABILITY_FIELDS);
            delete safeSlot.targetLawyerId; // Remove from individual slots
            return safeSlot;
        });

        // Bulk update - pass req.firmQuery for proper tenant isolation
        const result = await AvailabilitySlot.bulkUpdate(targetValidation.lawyerId, req.firmQuery, safeSlots);

        // Log if managing another lawyer's schedule
        if (targetValidation.isManagingOther) {
            logger.info(`User ${req.userID} bulk updated availability for lawyer ${targetValidation.lawyerId}`);
        }

        res.json({
            success: true,
            message: 'تم تحديث جدول التوفر بنجاح / Availability schedule updated successfully',
            data: result
        });
    } catch (error) {
        logger.error('Error bulk updating availability:', error);
        debugError('bulkUpdateAvailability', error, { body: req.body });
        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث جدول التوفر / Error updating availability schedule',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// BLOCKED TIMES MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Get blocked times
 */
exports.getBlockedTimes = async (req, res) => {
    debugLog('getBlockedTimes', req);
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const userId = req.userID;
        const { startDate, endDate } = req.query;
        debugLog('getBlockedTimes', req, { step: 'starting', startDate, endDate });

        // IDOR Protection: Use firmQuery for firm isolation
        const query = {
            ...req.firmQuery,
            lawyerId: userId
        };

        if (startDate || endDate) {
            if (startDate && endDate) {
                query.$or = [
                    { startDateTime: { $gte: new Date(startDate), $lte: new Date(endDate) } },
                    { endDateTime: { $gte: new Date(startDate), $lte: new Date(endDate) } },
                    { startDateTime: { $lte: new Date(startDate) }, endDateTime: { $gte: new Date(endDate) } }
                ];
            } else if (startDate) {
                query.endDateTime = { $gte: new Date(startDate) };
            } else if (endDate) {
                query.startDateTime = { $lte: new Date(endDate) };
            }
        }

        const blockedTimes = await BlockedTime.find(query).sort({ startDateTime: 1 });

        res.json({
            success: true,
            data: blockedTimes
        });
    } catch (error) {
        debugError('getBlockedTimes', error, { query: req.query });
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب أوقات الحظر / Error fetching blocked times',
            error: error.message
        });
    }
};

/**
 * Create blocked time (حظر وقت)
 * POST /api/v1/appointments/blocked-times
 *
 * Enterprise Feature: Supports cross-lawyer schedule management
 * - If no targetLawyerId provided: blocks time for current user
 * - If targetLawyerId provided: requires 'appointments' 'full' permission and firm membership validation
 *
 * DEBUG: Extensive logging for Block Time troubleshooting
 */
exports.createBlockedTime = async (req, res) => {
    const totalStart = Date.now();
    debugLog('createBlockedTime', req, {
        step: 'START',
        bodyKeys: Object.keys(req.body || {}),
        body: req.body
    });

    // Log full request for debugging
    logger.info(`🚫 [BLOCKED-TIME-DEBUG] createBlockedTime START: body=${JSON.stringify(req.body)} userId=${req.userID} firmQuery=${JSON.stringify(req.firmQuery)}`);

    try {
        if (req.isDeparted) {
            debugLog('createBlockedTime', req, { step: 'BLOCKED', reason: 'isDeparted' });
            logger.warn(`🚫 [BLOCKED-TIME-DEBUG] createBlockedTime BLOCKED: isDeparted=true`);
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied',
                debug: { reason: 'isDeparted' }
            });
        }

        const userId = req.userID;
        debugLog('createBlockedTime', req, { step: 'USER_VALIDATED', userId });

        // Mass assignment protection
        const safeData = pickAllowedFields(req.body, ALLOWED_BLOCKED_TIME_FIELDS);
        debugLog('createBlockedTime', req, {
            step: 'SAFE_DATA',
            safeData,
            allowedFields: ALLOWED_BLOCKED_TIME_FIELDS,
            receivedFields: Object.keys(req.body || {}),
            droppedFields: Object.keys(req.body || {}).filter(k => !ALLOWED_BLOCKED_TIME_FIELDS.includes(k))
        });

        logger.info(`🚫 [BLOCKED-TIME-DEBUG] createBlockedTime SAFE_DATA: ${JSON.stringify(safeData)}`);

        // Enterprise: Validate target lawyer (self or another firm member with permissions)
        const validationStart = Date.now();
        const targetValidation = await validateTargetLawyer(req, safeData.targetLawyerId);
        const validationTime = Date.now() - validationStart;

        debugLog('createBlockedTime', req, {
            step: 'TARGET_VALIDATION',
            validationTime,
            valid: targetValidation.valid,
            lawyerId: targetValidation.lawyerId,
            isManagingOther: targetValidation.isManagingOther,
            error: targetValidation.error
        });

        if (!targetValidation.valid) {
            debugLog('createBlockedTime', req, { step: 'VALIDATION_FAILED', error: targetValidation.error });
            logger.warn(`🚫 [BLOCKED-TIME-DEBUG] createBlockedTime VALIDATION_FAILED: ${targetValidation.error}`);
            return res.status(403).json({
                success: false,
                message: targetValidation.error,
                debug: {
                    reason: 'Target lawyer validation failed',
                    targetLawyerId: safeData.targetLawyerId
                }
            });
        }

        // Remove targetLawyerId from data (it's not a model field)
        delete safeData.targetLawyerId;

        // Validate dates
        if (!safeData.startDateTime || !safeData.endDateTime) {
            debugLog('createBlockedTime', req, {
                step: 'DATE_VALIDATION_ERROR',
                startDateTime: safeData.startDateTime,
                endDateTime: safeData.endDateTime
            });
            logger.warn(`🚫 [BLOCKED-TIME-DEBUG] createBlockedTime DATE_ERROR: startDateTime=${safeData.startDateTime} endDateTime=${safeData.endDateTime}`);
            return res.status(400).json({
                success: false,
                message: 'startDateTime and endDateTime are required',
                debug: {
                    receivedStartDateTime: safeData.startDateTime,
                    receivedEndDateTime: safeData.endDateTime,
                    expectedFormat: 'ISO 8601 date string (e.g., 2025-12-31T09:00:00.000Z)',
                    hint: 'Both startDateTime and endDateTime must be provided'
                }
            });
        }

        // Parse and validate dates
        const startDate = new Date(safeData.startDateTime);
        const endDate = new Date(safeData.endDateTime);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            debugLog('createBlockedTime', req, {
                step: 'DATE_PARSE_ERROR',
                startDateTime: safeData.startDateTime,
                endDateTime: safeData.endDateTime,
                parsedStart: startDate.toString(),
                parsedEnd: endDate.toString()
            });
            return res.status(400).json({
                success: false,
                message: 'Invalid date format',
                debug: {
                    startDateTime: safeData.startDateTime,
                    endDateTime: safeData.endDateTime,
                    hint: 'Use ISO 8601 format (e.g., 2025-12-31T09:00:00.000Z)'
                }
            });
        }

        if (endDate <= startDate) {
            debugLog('createBlockedTime', req, {
                step: 'DATE_ORDER_ERROR',
                startDateTime: startDate.toISOString(),
                endDateTime: endDate.toISOString()
            });
            return res.status(400).json({
                success: false,
                message: 'endDateTime must be after startDateTime',
                debug: {
                    startDateTime: startDate.toISOString(),
                    endDateTime: endDate.toISOString()
                }
            });
        }

        // Use req.addFirmId() for proper firm/solo lawyer isolation
        const blockedTimeData = req.addFirmId({
            ...safeData,
            lawyerId: targetValidation.lawyerId,
            createdBy: userId
        });

        debugLog('createBlockedTime', req, {
            step: 'BLOCKED_TIME_DATA',
            blockedTimeData: {
                ...blockedTimeData,
                startDateTime: blockedTimeData.startDateTime,
                endDateTime: blockedTimeData.endDateTime
            }
        });

        logger.info(`🚫 [BLOCKED-TIME-DEBUG] createBlockedTime DB_CREATE: ${JSON.stringify(blockedTimeData)}`);

        const dbStart = Date.now();
        const blockedTime = await BlockedTime.create(blockedTimeData);
        const dbTime = Date.now() - dbStart;

        debugLog('createBlockedTime', req, {
            step: 'DB_CREATE_DONE',
            dbTime,
            blockedTimeId: blockedTime._id?.toString()
        });

        // Log if managing another lawyer's schedule
        if (targetValidation.isManagingOther) {
            logger.info(`User ${userId} created blocked time for lawyer ${targetValidation.lawyerId}`);
        }

        const totalTime = Date.now() - totalStart;
        debugLog('createBlockedTime', req, {
            step: 'SUCCESS',
            totalTime,
            dbTime,
            blockedTimeId: blockedTime._id?.toString()
        });

        logger.info(`🚫 [BLOCKED-TIME-DEBUG] createBlockedTime SUCCESS: id=${blockedTime._id} totalTime=${totalTime}ms`);

        res.status(201).json({
            success: true,
            message: 'تم إنشاء وقت الحظر بنجاح / Blocked time created successfully',
            data: blockedTime,
            timing: { total: totalTime, db: dbTime }
        });
    } catch (error) {
        debugError('createBlockedTime', error, { body: req.body });
        logger.error(`🚫 [BLOCKED-TIME-DEBUG] createBlockedTime ERROR: ${error.message}`, {
            body: req.body,
            stack: error.stack?.split('\n').slice(0, 5).join(' | ')
        });
        res.status(500).json({
            success: false,
            message: 'خطأ في إنشاء وقت الحظر / Error creating blocked time',
            error: error.message,
            debug: {
                errorName: error.name,
                body: req.body,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }
        });
    }
};

/**
 * Delete blocked time
 * DELETE /api/v1/appointments/blocked-times/:id
 * DEBUG: Extensive logging for troubleshooting
 */
exports.deleteBlockedTime = async (req, res) => {
    const totalStart = Date.now();
    debugLog('deleteBlockedTime', req, {
        step: 'START',
        blockedTimeId: req.params.id
    });

    logger.info(`🚫 [BLOCKED-TIME-DEBUG] deleteBlockedTime START: id=${req.params.id} userId=${req.userID}`);

    try {
        if (req.isDeparted) {
            debugLog('deleteBlockedTime', req, { step: 'BLOCKED', reason: 'isDeparted' });
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied',
                debug: { reason: 'isDeparted' }
            });
        }

        // Sanitize ID param to prevent NoSQL injection
        const id = sanitizeObjectId(req.params.id);

        if (!id) {
            debugLog('deleteBlockedTime', req, { step: 'INVALID_ID', rawId: req.params.id });
            return res.status(400).json({
                success: false,
                message: 'Invalid blocked time ID',
                debug: { rawId: req.params.id }
            });
        }

        debugLog('deleteBlockedTime', req, { step: 'ID_VALIDATED', sanitizedId: id });

        // IDOR Protection: Delete with firmQuery
        const dbStart = Date.now();
        const blockedTime = await BlockedTime.findOneAndDelete({
            _id: id,
            ...req.firmQuery
        });
        const dbTime = Date.now() - dbStart;

        debugLog('deleteBlockedTime', req, {
            step: 'DB_DELETE_DONE',
            dbTime,
            found: !!blockedTime,
            deletedId: blockedTime?._id?.toString()
        });

        logger.info(`🚫 [BLOCKED-TIME-DEBUG] deleteBlockedTime DB_DELETE: found=${!!blockedTime} dbTime=${dbTime}ms`);

        if (!blockedTime) {
            debugLog('deleteBlockedTime', req, {
                step: 'NOT_FOUND',
                searchedId: id,
                firmQuery: req.firmQuery
            });
            return res.status(404).json({
                success: false,
                message: 'وقت الحظر غير موجود / Blocked time not found',
                debug: {
                    searchedId: id,
                    firmQuery: req.firmQuery
                }
            });
        }

        const totalTime = Date.now() - totalStart;
        debugLog('deleteBlockedTime', req, {
            step: 'SUCCESS',
            totalTime,
            dbTime,
            deletedId: blockedTime._id?.toString()
        });

        logger.info(`🚫 [BLOCKED-TIME-DEBUG] deleteBlockedTime SUCCESS: deletedId=${blockedTime._id} totalTime=${totalTime}ms`);

        res.json({
            success: true,
            message: 'تم حذف وقت الحظر بنجاح / Blocked time deleted successfully',
            data: blockedTime,
            timing: { total: totalTime, db: dbTime }
        });
    } catch (error) {
        debugError('deleteBlockedTime', error, { blockedTimeId: req.params.id });
        logger.error(`🚫 [BLOCKED-TIME-DEBUG] deleteBlockedTime ERROR: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'خطأ في حذف وقت الحظر / Error deleting blocked time',
            error: error.message,
            debug: {
                blockedTimeId: req.params.id,
                errorName: error.name
            }
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// ENHANCED AVAILABLE SLOTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get available time slots (enhanced with blocked times check)
 */
exports.getAvailableSlotsEnhanced = async (req, res) => {
    debugLog('getAvailableSlotsEnhanced', req);
    try {
        const { lawyerId, duration = 30 } = req.query;
        debugLog('getAvailableSlotsEnhanced', req, { step: 'starting', lawyerId, duration, query: req.query });

        // Support both date range (startDate/endDate) and single date convenience param
        // If only 'date' is provided, use it as both startDate and endDate
        let { startDate, endDate } = req.query;
        if (!startDate && !endDate && req.query.date) {
            startDate = req.query.date;
            endDate = req.query.date;
        }

        if (!lawyerId || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'lawyerId and either (startDate + endDate) or date are required'
            });
        }

        // Validate lawyerId is a valid ObjectId
        if (!/^[0-9a-fA-F]{24}$/.test(lawyerId)) {
            return res.status(400).json({
                success: false,
                message: 'lawyerId must be a valid ObjectId. Frontend should send user._id from auth context, not "current"'
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const durationNum = parseInt(duration);

        // Build tenant query - use firmQuery if available (authenticated), otherwise empty for public
        const tenantQuery = req.firmQuery || {};

        // Get availability slots for the lawyer
        const availabilitySlots = await AvailabilitySlot.find({
            ...tenantQuery,
            lawyerId,
            isActive: true
        });

        // Get blocked times in the date range
        const blockedTimes = await BlockedTime.getForDateRange(lawyerId, start, end, tenantQuery);

        // Get existing appointments in the date range
        const appointments = await Appointment.find({
            ...tenantQuery,
            assignedTo: lawyerId,
            scheduledTime: { $gte: start, $lte: end },
            status: { $in: ['scheduled', 'confirmed'] }
        });

        // Generate available slots
        const slots = [];
        const currentDate = new Date(start);

        while (currentDate <= end) {
            const dayOfWeek = currentDate.getDay();
            const dayAvailability = availabilitySlots.filter(s => s.dayOfWeek === dayOfWeek);

            for (const avail of dayAvailability) {
                const generatedSlots = avail.generateTimeSlots();

                for (const slot of generatedSlots) {
                    const [startHour, startMin] = slot.startTime.split(':').map(Number);
                    const [endHour, endMin] = slot.endTime.split(':').map(Number);

                    const slotStart = new Date(currentDate);
                    slotStart.setHours(startHour, startMin, 0, 0);

                    const slotEnd = new Date(currentDate);
                    slotEnd.setHours(endHour, endMin, 0, 0);

                    // Check if slot is in the past
                    if (slotStart < new Date()) {
                        slots.push({
                            date: currentDate.toISOString().split('T')[0],
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                            isAvailable: false,
                            conflictReason: 'past'
                        });
                        continue;
                    }

                    // Check if blocked
                    const isBlocked = blockedTimes.some(bt =>
                        (slotStart >= bt.startDateTime && slotStart < bt.endDateTime) ||
                        (slotEnd > bt.startDateTime && slotEnd <= bt.endDateTime)
                    );

                    if (isBlocked) {
                        slots.push({
                            date: currentDate.toISOString().split('T')[0],
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                            isAvailable: false,
                            conflictReason: 'blocked'
                        });
                        continue;
                    }

                    // Check if booked
                    const isBooked = appointments.some(apt => {
                        const aptStart = apt.scheduledTime;
                        const aptEnd = apt.endTime;
                        return (
                            (slotStart >= aptStart && slotStart < aptEnd) ||
                            (slotEnd > aptStart && slotEnd <= aptEnd)
                        );
                    });

                    slots.push({
                        date: currentDate.toISOString().split('T')[0],
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        isAvailable: !isBooked,
                        conflictReason: isBooked ? 'booked' : null
                    });
                }
            }

            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
        }

        res.json({
            success: true,
            data: {
                slots,
                dateRange: {
                    start: startDate,
                    end: endDate
                }
            }
        });
    } catch (error) {
        debugError('getAvailableSlotsEnhanced', error, { query: req.query });
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب الفترات المتاحة / Error fetching available slots',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// APPOINTMENT SETTINGS
// ═══════════════════════════════════════════════════════════════

/**
 * Get appointment settings
 */
exports.getSettings = async (req, res) => {
    debugLog('getSettings', req);
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Build tenant filter for proper firm/solo lawyer isolation
        const tenantFilter = {};
        if (req.firmQuery?.firmId) {
            tenantFilter.firmId = req.firmQuery.firmId;
        } else if (req.firmQuery?.lawyerId) {
            tenantFilter.lawyerId = req.firmQuery.lawyerId;
        }

        // Get settings from CRM Settings - OPTIMIZED: Use cached settings (Issue #5 fix)
        let settings = await getCRMSettingsWithCache(tenantFilter);

        // Create default settings if not found
        if (!settings) {
            settings = await CRMSettings.create(req.addFirmId({
                appointmentSettings: {
                    enabled: false,
                    defaultDuration: 30,
                    allowedDurations: [15, 30, 45, 60],
                    advanceBookingDays: 30,
                    minAdvanceBookingHours: 24,
                    bufferBetweenAppointments: 15,
                    sendReminders: true,
                    reminderHoursBefore: 24,
                    publicBookingEnabled: false
                }
            }));
            // Cache the newly created settings
            const cacheKey = getCrmSettingsCacheKey(tenantFilter);
            if (cacheKey) {
                await cache.set(cacheKey, settings.toObject ? settings.toObject() : settings, CRM_SETTINGS_CACHE_TTL);
            }
        }

        res.json({
            success: true,
            data: {
                lawyerId: req.userID,
                // OPTIMIZATION: Direct property access (compatible with .lean() cached objects)
                ...(settings.appointmentSettings || {})
            }
        });
    } catch (error) {
        debugError('getSettings', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب الإعدادات / Error fetching settings',
            error: error.message
        });
    }
};

/**
 * Update appointment settings
 */
exports.updateSettings = async (req, res) => {
    debugLog('updateSettings', req);
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        debugLog('updateSettings', req, { step: 'starting', body: req.body });
        // Build tenant filter for proper firm/solo lawyer isolation
        const tenantFilter = {};
        if (req.firmQuery?.firmId) {
            tenantFilter.firmId = req.firmQuery.firmId;
        } else if (req.firmQuery?.lawyerId) {
            tenantFilter.lawyerId = req.firmQuery.lawyerId;
        }

        // Allowed settings fields
        const allowedFields = [
            'enabled',
            'defaultDuration',
            'allowedDurations',
            'advanceBookingDays',
            'minAdvanceBookingHours',
            'bufferBetweenAppointments',
            'sendReminders',
            'reminderHoursBefore',
            'publicBookingEnabled',
            'requirePhoneVerification'
        ];

        const safeData = pickAllowedFields(req.body, allowedFields);

        // Update CRM settings with tenant filter
        let settings = await CRMSettings.findOneAndUpdate(
            tenantFilter,
            { $set: { appointmentSettings: safeData } },
            { new: true }
        );

        // If settings don't exist, create them
        if (!settings) {
            settings = await CRMSettings.create(req.addFirmId({
                appointmentSettings: safeData
            }));
        }

        // OPTIMIZATION: Invalidate cache after update (Issue #5 fix)
        await invalidateCRMSettingsCache(tenantFilter);

        res.json({
            success: true,
            message: 'تم تحديث الإعدادات بنجاح / Settings updated successfully',
            data: settings.appointmentSettings
        });
    } catch (error) {
        debugError('updateSettings', error, { body: req.body });
        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث الإعدادات / Error updating settings',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════

/**
 * Get appointment statistics (including revenue)
 */
exports.getStats = async (req, res) => {
    debugLog('getStats', req);
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const { startDate, endDate } = req.query;
        debugLog('getStats', req, { step: 'starting', startDate, endDate });

        // Parse dates if provided
        let start = null;
        let end = null;
        if (startDate) start = new Date(startDate);
        if (endDate) end = new Date(endDate);

        // Use the model's getFullStats method which includes revenue
        const stats = await Appointment.getFullStats(req.firmQuery, start, end);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        debugError('getStats', error, { query: req.query });
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب الإحصائيات / Error fetching statistics',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// RESCHEDULE APPOINTMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Reschedule an appointment
 */
exports.reschedule = async (req, res) => {
    debugLog('reschedule', req);
    try {
        if (req.isDeparted) {
            debugLog('reschedule', req, { blocked: 'isDeparted' });
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Sanitize ID param to prevent NoSQL injection
        const id = sanitizeObjectId(req.params.id);
        const userId = req.userID;
        debugLog('reschedule', req, { step: 'starting', appointmentId: id, body: req.body });

        // Only allow date and startTime for rescheduling
        const { date, startTime } = req.body;

        if (!date || !startTime) {
            return res.status(400).json({
                success: false,
                message: 'date and startTime are required'
            });
        }

        // IDOR Protection: Verify appointment belongs to user's firm/lawyer
        const appointment = await Appointment.findOne({ _id: id, ...req.firmQuery });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'الموعد غير موجود / Appointment not found'
            });
        }

        if (['cancelled', 'completed', 'no_show'].includes(appointment.status)) {
            return res.status(400).json({
                success: false,
                message: 'لا يمكن إعادة جدولة هذا الموعد / Cannot reschedule this appointment'
            });
        }

        // Parse new scheduled time
        const [hour, min] = startTime.split(':').map(Number);
        const newScheduledTime = new Date(date);
        newScheduledTime.setHours(hour, min, 0, 0);

        // Validate new time is in the future
        if (newScheduledTime <= new Date()) {
            return res.status(400).json({
                success: false,
                message: 'الوقت الجديد يجب أن يكون في المستقبل / New time must be in the future'
            });
        }

        // Enterprise: Check for schedule conflicts before rescheduling
        const conflictCheck = await checkScheduleConflicts(
            req.firmQuery,
            appointment.assignedTo,
            newScheduledTime,
            appointment.duration || 30,
            appointment._id // Exclude current appointment
        );

        if (conflictCheck.hasConflict) {
            return res.status(409).json({
                success: false,
                message: conflictCheck.message,
                conflicts: conflictCheck.conflicts
            });
        }

        // Update the appointment
        appointment.scheduledTime = newScheduledTime;
        await appointment.save();

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'appointment_rescheduled',
            entityType: 'appointment',
            entityId: appointment._id,
            entityName: appointment.appointmentNumber,
            title: `Appointment rescheduled: ${appointment.appointmentNumber}`,
            description: `Rescheduled to ${newScheduledTime.toISOString()}`,
            performedBy: userId
        });

        // Gold Standard: Sync reschedule to connected calendars
        let calendarSync = null;
        try {
            if (appointment.calendarEventId || appointment.microsoftCalendarEventId) {
                calendarSync = await syncAppointmentToCalendars(
                    appointment,
                    appointment.assignedTo,
                    req.firmId,
                    'update'
                );
            }
        } catch (syncError) {
            logger.warn('Calendar reschedule sync failed (non-blocking):', syncError.message);
        }

        // Populate for response
        await appointment.populate([
            { path: 'assignedTo', select: 'firstName lastName avatar email' },
            { path: 'partyId' },
            { path: 'caseId', select: 'title caseNumber' }
        ]);

        res.json({
            success: true,
            message: 'تم إعادة جدولة الموعد بنجاح / Appointment rescheduled successfully',
            data: appointment,
            calendarSync
        });
    } catch (error) {
        debugError('reschedule', error, { body: req.body, appointmentId: req.params.id });
        res.status(500).json({
            success: false,
            message: 'خطأ في إعادة جدولة الموعد / Error rescheduling appointment',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// CALENDAR INTEGRATION ENDPOINTS
// Gold Standard: Same pattern used by Calendly, Cal.com, Acuity
// ═══════════════════════════════════════════════════════════════

/**
 * Download ICS calendar file for an appointment
 * GET /api/appointments/:id/calendar.ics
 *
 * Enables "Add to Apple Calendar" and works with any calendar app.
 * Can be accessed publicly (for email links) or authenticated.
 */
exports.downloadICS = async (req, res) => {
    debugLog('downloadICS', req);
    try {
        const id = sanitizeObjectId(req.params.id);
        debugLog('downloadICS', req, { step: 'starting', appointmentId: id });

        // Find appointment - allow public access ONLY for public bookings
        // Otherwise restrict to authenticated user's tenant
        let appointment;
        if (req.userID && req.firmQuery) {
            // Authenticated user - use tenant isolation
            appointment = await Appointment.findOne({ _id: id, ...req.firmQuery })
                .populate('assignedTo', 'firstName lastName email');
        } else {
            // Public access - ONLY allow for appointments created via public booking
            // This prevents IDOR where anyone could download any appointment's ICS
            appointment = await Appointment.findOne({
                _id: id,
                source: { $in: ['public_booking', 'marketplace', 'website'] }
            }).populate('assignedTo', 'firstName lastName email');

            if (!appointment) {
                // Don't reveal if appointment exists - return generic not found
                return res.status(404).json({
                    success: false,
                    message: 'الموعد غير موجود / Appointment not found'
                });
            }
        }

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'الموعد غير موجود / Appointment not found'
            });
        }

        // Build organizer info from assigned lawyer
        const organizer = {
            name: appointment.assignedTo
                ? `${appointment.assignedTo.firstName} ${appointment.assignedTo.lastName}`
                : 'Traf3li',
            email: appointment.assignedTo?.email || 'noreply@traf3li.com'
        };

        // Generate ICS content
        const icsContent = generateICS(appointment, organizer);

        // Set headers for file download
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="appointment-${appointment.appointmentNumber}.ics"`);

        res.send(icsContent);
    } catch (error) {
        debugError('downloadICS', error, { appointmentId: req.params.id });
        res.status(500).json({
            success: false,
            message: 'خطأ في إنشاء ملف التقويم / Error generating calendar file',
            error: error.message
        });
    }
};

/**
 * Get "Add to Calendar" links for an appointment
 * GET /api/appointments/:id/calendar-links
 *
 * Returns links for Google Calendar, Outlook, Yahoo, and ICS download.
 * Gold Standard: Same links used by Eventbrite, Meetup, LinkedIn Events.
 */
exports.getCalendarLinks = async (req, res) => {
    debugLog('getCalendarLinks', req);
    try {
        const id = sanitizeObjectId(req.params.id);
        debugLog('getCalendarLinks', req, { step: 'starting', appointmentId: id });

        // IDOR Protection: Verify appointment belongs to user's firm/lawyer
        const appointment = await Appointment.findOne({ _id: id, ...req.firmQuery });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'الموعد غير موجود / Appointment not found'
            });
        }

        // Generate calendar links
        const baseUrl = process.env.API_URL || 'https://api.traf3li.com';
        const calendarData = generateCalendarLinksWithLabels(appointment, baseUrl);

        res.json({
            success: true,
            data: {
                appointmentId: appointment._id,
                appointmentNumber: appointment.appointmentNumber,
                scheduledTime: appointment.scheduledTime,
                ...calendarData
            }
        });
    } catch (error) {
        debugError('getCalendarLinks', error, { appointmentId: req.params.id });
        res.status(500).json({
            success: false,
            message: 'خطأ في إنشاء روابط التقويم / Error generating calendar links',
            error: error.message
        });
    }
};

/**
 * Get user's calendar connection status
 * GET /api/appointments/calendar-status
 *
 * Returns which calendars are connected and if auto-sync is enabled.
 */
exports.getCalendarStatus = async (req, res) => {
    debugLog('getCalendarStatus', req);
    try {
        const userId = req.userID;
        const firmId = req.firmId;
        debugLog('getCalendarStatus', req, { step: 'starting', userId, firmId });

        const status = await getCalendarConnectionStatus(userId, firmId);

        res.json({
            success: true,
            data: {
                connections: status,
                message: {
                    en: status.google.connected || status.microsoft.connected
                        ? 'Calendar connected. Appointments will sync automatically.'
                        : 'No calendar connected. Connect Google or Microsoft Calendar for auto-sync.',
                    ar: status.google.connected || status.microsoft.connected
                        ? 'التقويم متصل. ستتم مزامنة المواعيد تلقائياً.'
                        : 'لا يوجد تقويم متصل. اربط تقويم جوجل أو مايكروسوفت للمزامنة التلقائية.'
                }
            }
        });
    } catch (error) {
        debugError('getCalendarStatus', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب حالة التقويم / Error getting calendar status',
            error: error.message
        });
    }
};

/**
 * Manually sync an appointment to connected calendars
 * POST /api/appointments/:id/sync-calendar
 *
 * Gold Standard: Allows manual sync/re-sync if initial sync failed or
 * after user connects their calendar. Same pattern as Calendly, Cal.com.
 */
exports.syncToCalendar = async (req, res) => {
    debugLog('syncToCalendar', req);
    try {
        if (req.isDeparted) {
            debugLog('syncToCalendar', req, { blocked: 'isDeparted' });
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const id = sanitizeObjectId(req.params.id);
        debugLog('syncToCalendar', req, { step: 'starting', appointmentId: id });

        // IDOR Protection: Verify appointment belongs to user's firm/lawyer
        const appointment = await Appointment.findOne({ _id: id, ...req.firmQuery })
            .populate('assignedTo', 'firstName lastName email');

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'الموعد غير موجود / Appointment not found'
            });
        }

        // Don't sync cancelled or completed appointments
        if (['cancelled', 'completed', 'no_show'].includes(appointment.status)) {
            return res.status(400).json({
                success: false,
                message: 'لا يمكن مزامنة هذا الموعد / Cannot sync this appointment status'
            });
        }

        // Determine action based on existing calendar event IDs
        const hasExistingEvent = appointment.calendarEventId || appointment.microsoftCalendarEventId;
        const action = hasExistingEvent ? 'update' : 'create';

        // Perform sync
        const syncResult = await syncAppointmentToCalendars(
            appointment,
            appointment.assignedTo?._id || appointment.assignedTo,
            req.firmId,
            action
        );

        // Update appointment with new calendar event IDs if created
        const calendarUpdateFields = {};
        if (syncResult.google?.eventId && !appointment.calendarEventId) {
            calendarUpdateFields.calendarEventId = syncResult.google.eventId;
        }
        if (syncResult.microsoft?.eventId && !appointment.microsoftCalendarEventId) {
            calendarUpdateFields.microsoftCalendarEventId = syncResult.microsoft.eventId;
        }
        if (Object.keys(calendarUpdateFields).length > 0) {
            // SECURITY: Use findOneAndUpdate with firmQuery instead of findByIdAndUpdate
            await Appointment.findOneAndUpdate(
                { _id: appointment._id, ...req.firmQuery },
                calendarUpdateFields
            );
        }

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: req.userID,
            type: 'appointment_synced',
            entityType: 'appointment',
            entityId: appointment._id,
            entityName: appointment.appointmentNumber,
            title: `Appointment synced to calendar: ${appointment.appointmentNumber}`,
            performedBy: req.userID
        });

        res.json({
            success: true,
            message: 'تم مزامنة الموعد بنجاح / Appointment synced successfully',
            data: {
                appointmentId: appointment._id,
                appointmentNumber: appointment.appointmentNumber,
                syncResult
            }
        });
    } catch (error) {
        debugError('syncToCalendar', error, { appointmentId: req.params.id });
        res.status(500).json({
            success: false,
            message: 'خطأ في مزامنة الموعد / Error syncing appointment',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// DEBUG / DIAGNOSTIC ENDPOINT
// ═══════════════════════════════════════════════════════════════

/**
 * Diagnostic endpoint to debug tenant context issues
 * Helps identify why appointments may not be displaying
 */
exports.debug = async (req, res) => {
    debugLog('debug', req);
    try {
        // Get counts with and without tenant filter
        const [
            totalAppointments,
            tenantAppointments,
            sampleWithoutFilter,
            sampleWithFilter
        ] = await Promise.all([
            // Total appointments in system (bypassing tenant filter for diagnosis)
            Appointment.countDocuments({}).setOptions({ bypassFirmFilter: true }),
            // Appointments matching tenant filter
            Appointment.countDocuments(req.firmQuery),
            // Sample appointment without filter (to see what firmId/lawyerId it has)
            Appointment.findOne({})
                .select('_id appointmentNumber firmId lawyerId createdAt')
                .setOptions({ bypassFirmFilter: true })
                .lean(),
            // Sample appointment with filter
            Appointment.findOne(req.firmQuery)
                .select('_id appointmentNumber firmId lawyerId createdAt')
                .lean()
        ]);

        res.json({
            success: true,
            message: 'Diagnostic information for debugging tenant context',
            data: {
                currentUser: {
                    userId: req.userID,
                    firmId: req.firmId,
                    isSoloLawyer: req.isSoloLawyer,
                    firmQuery: req.firmQuery
                },
                counts: {
                    totalAppointmentsInSystem: totalAppointments,
                    appointmentsMatchingTenantFilter: tenantAppointments,
                    mismatchedAppointments: totalAppointments - tenantAppointments
                },
                samples: {
                    withoutFilter: sampleWithoutFilter ? {
                        id: sampleWithoutFilter._id,
                        appointmentNumber: sampleWithoutFilter.appointmentNumber,
                        firmId: sampleWithoutFilter.firmId?.toString() || null,
                        lawyerId: sampleWithoutFilter.lawyerId?.toString() || null
                    } : null,
                    withFilter: sampleWithFilter ? {
                        id: sampleWithFilter._id,
                        appointmentNumber: sampleWithFilter.appointmentNumber,
                        firmId: sampleWithFilter.firmId?.toString() || null,
                        lawyerId: sampleWithFilter.lawyerId?.toString() || null
                    } : null
                },
                diagnosis: totalAppointments > 0 && tenantAppointments === 0
                    ? 'TENANT_MISMATCH: Appointments exist but none match your tenant context. Check if firmId/lawyerId in appointments matches your user context.'
                    : tenantAppointments > 0
                        ? 'OK: Appointments found matching your tenant context.'
                        : 'EMPTY: No appointments in the system.'
            }
        });
    } catch (error) {
        debugError('debug', error);
        res.status(500).json({
            success: false,
            message: 'Error running diagnostics',
            error: error.message
        });
    }
};
