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

// ═══════════════════════════════════════════════════════════════
// SECURITY CONSTANTS
// ═══════════════════════════════════════════════════════════════

/**
 * Allowed fields for appointment creation
 */
const ALLOWED_CREATE_FIELDS = [
    'customerName',
    'customerEmail',
    'customerPhone',
    'scheduledTime',
    'duration',
    'notes',
    'assignedTo',
    'partyId',
    'caseId',
    'appointmentWith',
    'locationType',
    'sendReminder'
];

/**
 * Allowed fields for appointment updates
 */
const ALLOWED_UPDATE_FIELDS = [
    'customerName',
    'customerEmail',
    'customerPhone',
    'scheduledTime',
    'duration',
    'notes',
    'assignedTo',
    'partyId',
    'caseId',
    'locationType',
    'sendReminder'
];

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
    const eventQuery = {
        ...firmQuery,
        status: { $nin: ['canceled', 'cancelled'] },
        $or: [
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
    try {
        if (req.isDeparted) {
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
        logger.error('Error getting appointments:', error);
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
    try {
        if (req.isDeparted) {
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
        logger.error('Error getting appointment:', error);
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
        // GOLD STANDARD: Lazy initialization fallback - if settings don't exist, create them
        // Enterprise systems never block users with "Settings not found" errors
        let settings = await CRMSettings.findOne(tenantFilter);

        if (!settings && tenantFilter.firmId) {
            // Auto-create CRM settings with sensible defaults
            settings = await CRMSettings.getOrCreate(tenantFilter.firmId);
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
        const workingHours = settings.getWorkingHours(dayOfWeek);

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
        logger.error('Error getting available slots:', error);
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
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const userId = req.userID;

        // Mass assignment protection: only allow specific fields
        const safeData = pickAllowedFields(req.body, ALLOWED_CREATE_FIELDS);

        // Validate appointment data
        const validation = validateAppointmentData(safeData);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.error
            });
        }

        // Enterprise: Check for schedule conflicts before creating
        const assignedTo = safeData.assignedTo || userId;
        const conflictCheck = await checkScheduleConflicts(
            req.firmQuery,
            assignedTo,
            safeData.scheduledTime,
            safeData.duration || 30
        );

        if (conflictCheck.hasConflict) {
            return res.status(409).json({
                success: false,
                message: conflictCheck.message,
                conflicts: conflictCheck.conflicts
            });
        }

        // Multi-tenancy: Use req.addFirmId() for proper firm/solo lawyer isolation
        const appointmentData = req.addFirmId({
            ...safeData,
            createdBy: userId,
            status: 'scheduled' // Force status to prevent mass assignment
        });

        const appointment = await Appointment.create(appointmentData);

        // Populate for response
        await appointment.populate([
            { path: 'assignedTo', select: 'firstName lastName avatar email' },
            { path: 'partyId' },
            { path: 'caseId', select: 'title caseNumber' }
        ]);

        // Log activity
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

        res.status(201).json({
            success: true,
            message: 'تم إنشاء الموعد بنجاح / Appointment created successfully',
            data: appointment
        });
    } catch (error) {
        logger.error('Error creating appointment:', error);
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
    try {
        const { firmId } = req.params;

        // Mass assignment protection: extract only allowed fields
        const publicAllowedFields = [
            'customerName',
            'customerEmail',
            'customerPhone',
            'scheduledTime',
            'duration',
            'notes'
        ];
        const safeInputData = pickAllowedFields(req.body, publicAllowedFields);

        // Get CRM settings
        const settings = await CRMSettings.findOne({ firmId });

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
            customerNotes: safeInputData.notes,
            scheduledTime: requestedDate,
            duration: safeInputData.duration || settings.appointmentSettings.defaultDuration || 30,
            assignedTo,
            appointmentWith: 'lead',
            locationType: 'office',
            status: 'scheduled',
            sendReminder: settings.appointmentSettings.sendReminders
        };

        const appointment = await Appointment.create(appointmentData);

        // TODO: Send confirmation email to customer

        res.status(201).json({
            success: true,
            message: 'تم حجز الموعد بنجاح / Appointment booked successfully',
            data: {
                appointmentNumber: appointment.appointmentNumber,
                scheduledTime: appointment.scheduledTime,
                duration: appointment.duration,
                status: appointment.status
            }
        });
    } catch (error) {
        logger.error('Error with public booking:', error);
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
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Sanitize ID param to prevent NoSQL injection
        const id = sanitizeObjectId(req.params.id);
        const userId = req.userID;

        // Mass assignment protection: only allow specific fields
        const safeData = pickAllowedFields(req.body, ALLOWED_UPDATE_FIELDS);

        // Validate appointment data
        const validation = validateAppointmentData(safeData);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.error
            });
        }

        // IDOR Protection: Update with firmQuery to prevent race condition
        const appointment = await Appointment.findOneAndUpdate(
            { _id: id, ...req.firmQuery },
            { $set: safeData },
            { new: true, runValidators: true }
        ).populate([
            { path: 'assignedTo', select: 'firstName lastName avatar email' },
            { path: 'partyId' },
            { path: 'caseId', select: 'title caseNumber' }
        ]);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'الموعد غير موجود / Appointment not found'
            });
        }

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

        res.json({
            success: true,
            message: 'تم تحديث الموعد بنجاح / Appointment updated successfully',
            data: appointment
        });
    } catch (error) {
        logger.error('Error updating appointment:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث الموعد / Error updating appointment',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// CANCEL APPOINTMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Cancel an appointment
 */
exports.cancel = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Sanitize ID param to prevent NoSQL injection
        const id = sanitizeObjectId(req.params.id);
        const userId = req.userID;

        // Mass assignment protection: only allow reason field
        const safeData = pickAllowedFields(req.body, ALLOWED_CANCEL_FIELDS);
        const reason = safeData.reason;

        // IDOR Protection: Verify appointment belongs to user's firm/lawyer
        const appointment = await Appointment.findOne({ _id: id, ...req.firmQuery });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'الموعد غير موجود / Appointment not found'
            });
        }

        if (['cancelled', 'completed'].includes(appointment.status)) {
            return res.status(400).json({
                success: false,
                message: 'لا يمكن إلغاء هذا الموعد / Cannot cancel this appointment'
            });
        }

        await appointment.cancel(userId, reason);

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'appointment_cancelled',
            entityType: 'appointment',
            entityId: appointment._id,
            entityName: appointment.appointmentNumber,
            title: `Appointment cancelled: ${appointment.appointmentNumber}`,
            description: reason || 'No reason provided',
            performedBy: userId
        });

        res.json({
            success: true,
            message: 'تم إلغاء الموعد بنجاح / Appointment cancelled successfully',
            data: appointment
        });
    } catch (error) {
        logger.error('Error cancelling appointment:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في إلغاء الموعد / Error cancelling appointment',
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
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Sanitize ID param to prevent NoSQL injection
        const id = sanitizeObjectId(req.params.id);
        const userId = req.userID;

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
            data: appointment
        });
    } catch (error) {
        logger.error('Error completing appointment:', error);
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
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Sanitize ID param to prevent NoSQL injection
        const id = sanitizeObjectId(req.params.id);
        const userId = req.userID;

        // IDOR Protection: Verify appointment belongs to user's firm/lawyer
        const appointment = await Appointment.findOne({ _id: id, ...req.firmQuery });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'الموعد غير موجود / Appointment not found'
            });
        }

        await appointment.markNoShow();

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
            data: appointment
        });
    } catch (error) {
        logger.error('Error marking no-show:', error);
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
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Sanitize ID param to prevent NoSQL injection
        const id = sanitizeObjectId(req.params.id);
        const userId = req.userID;

        // IDOR Protection: Verify appointment belongs to user's firm/lawyer
        const appointment = await Appointment.findOne({ _id: id, ...req.firmQuery });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'الموعد غير موجود / Appointment not found'
            });
        }

        await appointment.confirm();

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
            data: appointment
        });
    } catch (error) {
        logger.error('Error confirming appointment:', error);
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
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const { lawyerId } = req.query;
        const targetLawyerId = lawyerId || req.userID;

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
        logger.error('Error getting availability:', error);
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
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Mass assignment protection
        const safeData = pickAllowedFields(req.body, ALLOWED_AVAILABILITY_FIELDS);

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
        logger.error('Error creating availability:', error);
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
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Sanitize ID param to prevent NoSQL injection
        const id = sanitizeObjectId(req.params.id);

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
        logger.error('Error updating availability:', error);
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
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Sanitize ID param to prevent NoSQL injection
        const id = sanitizeObjectId(req.params.id);

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
        logger.error('Error deleting availability:', error);
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
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const { slots, targetLawyerId } = req.body;

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
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const userId = req.userID;
        const { startDate, endDate } = req.query;

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
        logger.error('Error getting blocked times:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب أوقات الحظر / Error fetching blocked times',
            error: error.message
        });
    }
};

/**
 * Create blocked time
 *
 * Enterprise Feature: Supports cross-lawyer schedule management
 * - If no targetLawyerId provided: blocks time for current user
 * - If targetLawyerId provided: requires 'appointments' 'full' permission and firm membership validation
 */
exports.createBlockedTime = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const userId = req.userID;

        // Mass assignment protection
        const safeData = pickAllowedFields(req.body, ALLOWED_BLOCKED_TIME_FIELDS);

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

        // Validate dates
        if (!safeData.startDateTime || !safeData.endDateTime) {
            return res.status(400).json({
                success: false,
                message: 'startDateTime and endDateTime are required'
            });
        }

        // Use req.addFirmId() for proper firm/solo lawyer isolation
        const blockedTimeData = req.addFirmId({
            ...safeData,
            lawyerId: targetValidation.lawyerId,
            createdBy: userId
        });

        const blockedTime = await BlockedTime.create(blockedTimeData);

        // Log if managing another lawyer's schedule
        if (targetValidation.isManagingOther) {
            logger.info(`User ${userId} created blocked time for lawyer ${targetValidation.lawyerId}`);
        }

        res.status(201).json({
            success: true,
            message: 'تم إنشاء وقت الحظر بنجاح / Blocked time created successfully',
            data: blockedTime
        });
    } catch (error) {
        logger.error('Error creating blocked time:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في إنشاء وقت الحظر / Error creating blocked time',
            error: error.message
        });
    }
};

/**
 * Delete blocked time
 */
exports.deleteBlockedTime = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Sanitize ID param to prevent NoSQL injection
        const id = sanitizeObjectId(req.params.id);

        // IDOR Protection: Delete with firmQuery
        const blockedTime = await BlockedTime.findOneAndDelete({
            _id: id,
            ...req.firmQuery
        });

        if (!blockedTime) {
            return res.status(404).json({
                success: false,
                message: 'وقت الحظر غير موجود / Blocked time not found'
            });
        }

        res.json({
            success: true,
            message: 'تم حذف وقت الحظر بنجاح / Blocked time deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting blocked time:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في حذف وقت الحظر / Error deleting blocked time',
            error: error.message
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
    try {
        const { lawyerId, startDate, endDate, duration = 30 } = req.query;

        if (!lawyerId || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'lawyerId, startDate, and endDate are required'
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
        logger.error('Error getting available slots:', error);
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

        // Get settings from CRM Settings - use findOne with tenant filter
        let settings = await CRMSettings.findOne(tenantFilter);

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
        }

        res.json({
            success: true,
            data: {
                lawyerId: req.userID,
                ...settings.appointmentSettings?.toObject?.() || settings.appointmentSettings || {}
            }
        });
    } catch (error) {
        logger.error('Error getting settings:', error);
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

        res.json({
            success: true,
            message: 'تم تحديث الإعدادات بنجاح / Settings updated successfully',
            data: settings.appointmentSettings
        });
    } catch (error) {
        logger.error('Error updating settings:', error);
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
 * Get appointment statistics
 */
exports.getStats = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const { startDate, endDate } = req.query;

        // IDOR Protection: Use firmQuery for firm isolation
        const baseQuery = { ...req.firmQuery };

        if (startDate || endDate) {
            baseQuery.scheduledTime = {};
            if (startDate) baseQuery.scheduledTime.$gte = new Date(startDate);
            if (endDate) baseQuery.scheduledTime.$lte = new Date(endDate);
        }

        // Get counts by status
        const [
            total,
            pending,
            confirmed,
            completed,
            cancelled,
            noShow
        ] = await Promise.all([
            Appointment.countDocuments(baseQuery),
            Appointment.countDocuments({ ...baseQuery, status: 'scheduled' }),
            Appointment.countDocuments({ ...baseQuery, status: 'confirmed' }),
            Appointment.countDocuments({ ...baseQuery, status: 'completed' }),
            Appointment.countDocuments({ ...baseQuery, status: 'cancelled' }),
            Appointment.countDocuments({ ...baseQuery, status: 'no_show' })
        ]);

        // Get today's count
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayCount = await Appointment.countDocuments({
            ...req.firmQuery,
            scheduledTime: { $gte: today, $lt: tomorrow },
            status: { $in: ['scheduled', 'confirmed'] }
        });

        // Get this week's count
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const weekCount = await Appointment.countDocuments({
            ...req.firmQuery,
            scheduledTime: { $gte: weekStart, $lt: weekEnd },
            status: { $in: ['scheduled', 'confirmed'] }
        });

        // Get this month's count
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const monthCount = await Appointment.countDocuments({
            ...req.firmQuery,
            scheduledTime: { $gte: monthStart, $lte: monthEnd },
            status: { $in: ['scheduled', 'confirmed'] }
        });

        res.json({
            success: true,
            data: {
                total,
                pending,
                confirmed,
                completed,
                cancelled,
                noShow,
                todayCount,
                weekCount,
                monthCount
            }
        });
    } catch (error) {
        logger.error('Error getting stats:', error);
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
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Sanitize ID param to prevent NoSQL injection
        const id = sanitizeObjectId(req.params.id);
        const userId = req.userID;

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

        // Populate for response
        await appointment.populate([
            { path: 'assignedTo', select: 'firstName lastName avatar email' },
            { path: 'partyId' },
            { path: 'caseId', select: 'title caseNumber' }
        ]);

        res.json({
            success: true,
            message: 'تم إعادة جدولة الموعد بنجاح / Appointment rescheduled successfully',
            data: appointment
        });
    } catch (error) {
        logger.error('Error rescheduling appointment:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في إعادة جدولة الموعد / Error rescheduling appointment',
            error: error.message
        });
    }
};
