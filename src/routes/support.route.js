/**
 * Support Module Routes
 *
 * Comprehensive support ticket management API routes including CRUD operations,
 * ticket lifecycle management, SLA configuration, statistics, and settings.
 *
 * Base route: /api/support
 */

const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const {
    validateCreateTicket,
    validateUpdateTicket,
    validateReplyToTicket,
    validateCreateSLA,
    validateUpdateSLA,
    validateUpdateSettings
} = require('../validators/support.validator');
const {
    // Ticket CRUD
    getTickets,
    getTicketById,
    createTicket,
    updateTicket,
    deleteTicket,

    // Ticket Actions
    replyToTicket,
    resolveTicket,
    closeTicket,

    // SLA Management
    getSLAs,
    getSLAById,
    createSLA,
    updateSLA,
    deleteSLA,

    // Stats & Settings
    getStats,
    getSettings,
    updateSettings
} = require('../controllers/support.controller');

const router = express.Router();

// Apply authentication and firm filter to all routes
router.use(userMiddleware, firmFilter);

// ============================================
// STATISTICS & REPORTS
// ============================================
// These need to be before /:id routes to avoid conflicts

// Get support statistics
router.get('/stats', getStats);

// Get support settings
router.get('/settings', getSettings);

// Update support settings
router.put('/settings', validateUpdateSettings, updateSettings);

// ============================================
// TICKET ROUTES
// ============================================

// Get all tickets (with filters: status, priority, ticketType, assignedTo, raisedBy, clientId)
router.get('/tickets', getTickets);

// Create new ticket
router.post('/tickets', validateCreateTicket, createTicket);

// Get single ticket
router.get('/tickets/:id', getTicketById);

// Update ticket
router.put('/tickets/:id', validateUpdateTicket, updateTicket);

// Delete ticket
router.delete('/tickets/:id', deleteTicket);

// Ticket Actions
router.post('/tickets/:id/reply', validateReplyToTicket, replyToTicket);
router.post('/tickets/:id/resolve', resolveTicket);
router.post('/tickets/:id/close', closeTicket);

// ============================================
// SLA ROUTES
// ============================================

// Get all SLAs
router.get('/slas', getSLAs);

// Create new SLA
router.post('/slas', validateCreateSLA, createSLA);

// Get single SLA
router.get('/slas/:id', getSLAById);

// Update SLA
router.put('/slas/:id', validateUpdateSLA, updateSLA);

// Delete SLA
router.delete('/slas/:id', deleteSLA);

module.exports = router;
