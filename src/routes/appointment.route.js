/**
 * Appointment Routes
 *
 * Routes for managing appointments, availability, blocked times, and settings.
 */

const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointment.controller');
const {
    validateIdParam,
    validateCreateAppointment,
    validateUpdateAppointment,
    validatePublicBooking,
    validateGetAvailableSlots
} = require('../validators/crm.validator');
const { normalizeAppointment } = require('../middlewares/appointmentNormalize.middleware');

// ═══════════════════════════════════════════════════════════════
// PUBLIC ROUTES (no auth required)
// ═══════════════════════════════════════════════════════════════

/**
 * @route   POST /api/v1/appointments/book/:firmId
 * @desc    Public booking endpoint
 * @access  Public
 */
router.post('/book/:firmId', normalizeAppointment, validatePublicBooking, appointmentController.publicBook);

/**
 * @route   GET /api/v1/appointments/available-slots
 * @desc    Get available time slots for booking (public for clients/marketplace)
 * @access  Public
 */
router.get('/available-slots', appointmentController.getAvailableSlotsEnhanced);

/**
 * @route   GET /api/v1/appointments/:id/calendar.ics
 * @desc    Download ICS calendar file for appointment (works with Apple Calendar, Outlook, etc.)
 * @access  Public (for email links) or Private
 * @note    Gold Standard: Same pattern used by Calendly, Cal.com, Eventbrite
 */
router.get('/:id/calendar.ics', appointmentController.downloadICS);

// ═══════════════════════════════════════════════════════════════
// AVAILABILITY ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/v1/appointments/availability
 * @desc    Get lawyer's weekly availability schedule
 * @access  Private
 */
router.get('/availability', appointmentController.getAvailability);

/**
 * @route   POST /api/v1/appointments/availability
 * @desc    Create new availability slot
 * @access  Private
 */
router.post('/availability', appointmentController.createAvailability);

/**
 * @route   POST /api/v1/appointments/availability/bulk
 * @desc    Bulk update entire week schedule
 * @access  Private
 */
router.post('/availability/bulk', appointmentController.bulkUpdateAvailability);

/**
 * @route   PUT /api/v1/appointments/availability/:id
 * @desc    Update availability slot
 * @access  Private
 */
router.put('/availability/:id', validateIdParam, appointmentController.updateAvailability);

/**
 * @route   DELETE /api/v1/appointments/availability/:id
 * @desc    Delete availability slot
 * @access  Private
 */
router.delete('/availability/:id', validateIdParam, appointmentController.deleteAvailability);

// ═══════════════════════════════════════════════════════════════
// BLOCKED TIMES ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/v1/appointments/blocked-times
 * @desc    Get blocked time periods
 * @access  Private
 */
router.get('/blocked-times', appointmentController.getBlockedTimes);

/**
 * @route   POST /api/v1/appointments/blocked-times
 * @desc    Create blocked time
 * @access  Private
 */
router.post('/blocked-times', appointmentController.createBlockedTime);

/**
 * @route   DELETE /api/v1/appointments/blocked-times/:id
 * @desc    Delete blocked time
 * @access  Private
 */
router.delete('/blocked-times/:id', validateIdParam, appointmentController.deleteBlockedTime);

// ═══════════════════════════════════════════════════════════════
// SETTINGS ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/v1/appointments/settings
 * @desc    Get lawyer's appointment settings
 * @access  Private
 */
router.get('/settings', appointmentController.getSettings);

/**
 * @route   PUT /api/v1/appointments/settings
 * @desc    Update appointment settings
 * @access  Private
 */
router.put('/settings', appointmentController.updateSettings);

// ═══════════════════════════════════════════════════════════════
// STATISTICS ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/v1/appointments/stats
 * @desc    Get appointment statistics
 * @access  Private
 */
router.get('/stats', appointmentController.getStats);

/**
 * @route   GET /api/v1/appointments/debug
 * @desc    Diagnostic endpoint to debug tenant context issues
 * @access  Private (Admin/Debug only)
 */
router.get('/debug', appointmentController.debug);

// ═══════════════════════════════════════════════════════════════
// CALENDAR INTEGRATION ROUTES
// Gold Standard: Same pattern used by Calendly, Cal.com, Acuity
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/v1/appointments/calendar-status
 * @desc    Get user's calendar connection status (Google, Microsoft)
 * @access  Private
 */
router.get('/calendar-status', appointmentController.getCalendarStatus);

/**
 * @route   GET /api/v1/appointments/:id/calendar-links
 * @desc    Get "Add to Calendar" links for an appointment (Google, Outlook, Yahoo, Apple)
 * @access  Private
 * @note    Returns links that work with any calendar service
 */
router.get('/:id/calendar-links', validateIdParam, appointmentController.getCalendarLinks);

/**
 * @route   POST /api/v1/appointments/:id/sync-calendar
 * @desc    Manually sync appointment to connected calendars (Google, Microsoft)
 * @access  Private
 * @note    Gold Standard: Allows retry if initial sync failed, or sync after connecting calendar
 */
router.post('/:id/sync-calendar', validateIdParam, appointmentController.syncToCalendar);

// ═══════════════════════════════════════════════════════════════
// APPOINTMENT CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/v1/appointments
 * @desc    Get all appointments with filters
 * @access  Private
 */
router.get('/', appointmentController.getAll);

/**
 * @route   GET /api/v1/appointments/slots
 * @desc    Get available time slots for booking (legacy)
 * @access  Private
 */
router.get('/slots', validateGetAvailableSlots, appointmentController.getAvailableSlots);

/**
 * @route   GET /api/v1/appointments/:id
 * @desc    Get appointment by ID
 * @access  Private
 */
router.get('/:id', validateIdParam, appointmentController.getById);

/**
 * @route   POST /api/v1/appointments
 * @desc    Create a new appointment
 * @access  Private
 */
router.post('/', normalizeAppointment, validateCreateAppointment, appointmentController.create);

/**
 * @route   PUT /api/v1/appointments/:id
 * @desc    Update an appointment
 * @access  Private
 */
router.put('/:id', validateIdParam, normalizeAppointment, validateUpdateAppointment, appointmentController.update);

/**
 * @route   PUT /api/v1/appointments/:id/confirm
 * @desc    Confirm an appointment
 * @access  Private
 */
router.put('/:id/confirm', validateIdParam, appointmentController.confirm);

/**
 * @route   PUT /api/v1/appointments/:id/complete
 * @desc    Mark appointment as completed
 * @access  Private
 */
router.put('/:id/complete', validateIdParam, appointmentController.complete);

/**
 * @route   PUT /api/v1/appointments/:id/no-show
 * @desc    Mark appointment as no-show
 * @access  Private
 */
router.put('/:id/no-show', validateIdParam, appointmentController.markNoShow);

/**
 * @route   POST /api/v1/appointments/:id/reschedule
 * @desc    Reschedule appointment
 * @access  Private
 */
router.post('/:id/reschedule', validateIdParam, normalizeAppointment, appointmentController.reschedule);

/**
 * @route   DELETE /api/v1/appointments/:id
 * @desc    Cancel an appointment
 * @access  Private
 */
router.delete('/:id', validateIdParam, appointmentController.cancel);

module.exports = router;
