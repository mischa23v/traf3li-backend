/**
 * Appointment Routes
 *
 * Routes for managing appointments and bookings.
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
const { verifyToken } = require('../middlewares/jwt');

// ═══════════════════════════════════════════════════════════════
// PUBLIC ROUTES (no auth required)
// ═══════════════════════════════════════════════════════════════

/**
 * @route   POST /api/v1/appointments/book/:firmId
 * @desc    Public booking endpoint
 * @access  Public
 */
router.post('/book/:firmId', validatePublicBooking, appointmentController.publicBook);

// Apply authentication middleware to remaining routes
router.use(verifyToken);

// ═══════════════════════════════════════════════════════════════
// PRIVATE ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/v1/appointments
 * @desc    Get all appointments with filters
 * @access  Private
 */
router.get('/', appointmentController.getAll);

/**
 * @route   GET /api/v1/appointments/slots
 * @desc    Get available time slots for booking
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
router.post('/', validateCreateAppointment, appointmentController.create);

/**
 * @route   PUT /api/v1/appointments/:id
 * @desc    Update an appointment
 * @access  Private
 */
router.put('/:id', validateIdParam, validateUpdateAppointment, appointmentController.update);

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
 * @route   DELETE /api/v1/appointments/:id
 * @desc    Cancel an appointment
 * @access  Private
 */
router.delete('/:id', validateIdParam, appointmentController.cancel);

module.exports = router;
