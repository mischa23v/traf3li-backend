/**
 * Appointment Controller
 *
 * Handles appointment scheduling, management, and public booking.
 */

const Appointment = require('../models/appointment.model');
const CRMSettings = require('../models/crmSettings.model');
const CrmActivity = require('../models/crmActivity.model');

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

        const firmId = req.firmId;
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

        const query = { firmId };

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
        console.error('Error getting appointments:', error);
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

        const { id } = req.params;
        const firmId = req.firmId;

        const appointment = await Appointment.findOne({ _id: id, firmId })
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
        console.error('Error getting appointment:', error);
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
        const firmId = req.firmId;
        const { date, assignedTo, duration = 30 } = req.query;

        // Get CRM settings for working hours
        const settings = await CRMSettings.getOrCreate(firmId);

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

        const slots = await Appointment.getAvailableSlots(
            firmId,
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
        console.error('Error getting available slots:', error);
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

        const firmId = req.firmId;
        const userId = req.userID;

        const appointmentData = {
            ...req.body,
            firmId,
            createdBy: userId
        };

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
        console.error('Error creating appointment:', error);
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
        const { customerName, customerEmail, customerPhone, scheduledTime, duration, notes } = req.body;

        // Get CRM settings
        const settings = await CRMSettings.findOne({ firmId });

        if (!settings?.appointmentSettings?.publicBookingEnabled) {
            return res.status(400).json({
                success: false,
                message: 'الحجز العام غير مفعل / Public booking is disabled'
            });
        }

        // Validate slot availability
        const requestedDate = new Date(scheduledTime);
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
            customerName,
            customerEmail,
            customerPhone,
            customerNotes: notes,
            scheduledTime: requestedDate,
            duration: duration || settings.appointmentSettings.defaultDuration || 30,
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
        console.error('Error with public booking:', error);
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

        const { id } = req.params;
        const firmId = req.firmId;
        const userId = req.userID;

        const appointment = await Appointment.findOneAndUpdate(
            { _id: id, firmId },
            { $set: req.body },
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
        console.error('Error updating appointment:', error);
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

        const { id } = req.params;
        const firmId = req.firmId;
        const userId = req.userID;
        const { reason } = req.body;

        const appointment = await Appointment.findOne({ _id: id, firmId });

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
        console.error('Error cancelling appointment:', error);
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

        const { id } = req.params;
        const firmId = req.firmId;
        const userId = req.userID;
        const { outcome, followUpRequired, followUpDate } = req.body;

        const appointment = await Appointment.findOne({ _id: id, firmId });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'الموعد غير موجود / Appointment not found'
            });
        }

        await appointment.complete(outcome, followUpRequired, followUpDate);

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'appointment_completed',
            entityType: 'appointment',
            entityId: appointment._id,
            entityName: appointment.appointmentNumber,
            title: `Appointment completed: ${appointment.appointmentNumber}`,
            description: outcome,
            performedBy: userId
        });

        res.json({
            success: true,
            message: 'تم إكمال الموعد بنجاح / Appointment completed successfully',
            data: appointment
        });
    } catch (error) {
        console.error('Error completing appointment:', error);
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

        const { id } = req.params;
        const firmId = req.firmId;
        const userId = req.userID;

        const appointment = await Appointment.findOne({ _id: id, firmId });

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
        console.error('Error marking no-show:', error);
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

        const { id } = req.params;
        const firmId = req.firmId;
        const userId = req.userID;

        const appointment = await Appointment.findOne({ _id: id, firmId });

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
        console.error('Error confirming appointment:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تأكيد الموعد / Error confirming appointment',
            error: error.message
        });
    }
};
