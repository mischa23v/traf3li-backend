/**
 * SLA Routes
 *
 * Routes for Service Level Agreement (SLA) configuration and management.
 * Allows firms to create SLA policies and track ticket/case compliance.
 *
 * Base route: /api/sla
 */

const express = require('express');
const router = express.Router();
const slaController = require('../controllers/sla.controller');
const { userMiddleware, firmAdminOnly } = require('../middlewares');

// ============ APPLY MIDDLEWARE ============
// All SLA routes require authentication and firm filtering
router.use(userMiddleware);

// ============ STATS & INFORMATIONAL ENDPOINTS ============
// These should come before /:id routes to avoid conflicts

// Get SLA statistics and metrics
// GET /api/sla/stats
router.get('/stats', slaController.getStats);

// ============ SLA CONFIGURATION CRUD ============

// Get all SLA configurations for the firm
// GET /api/sla
router.get('/', slaController.listSLAs);

// Create a new SLA configuration (admin/owner only)
// POST /api/sla
router.post('/', firmAdminOnly, slaController.createSLA);

// Get single SLA configuration by ID
// GET /api/sla/:id
router.get('/:id', slaController.getSLA);

// Update SLA configuration (admin/owner only)
// PUT /api/sla/:id
router.put('/:id', firmAdminOnly, slaController.updateSLA);

// Delete SLA configuration (admin/owner only)
// DELETE /api/sla/:id
router.delete('/:id', firmAdminOnly, slaController.deleteSLA);

// ============ SLA APPLICATION ROUTES ============

// Apply SLA to a specific ticket
// POST /api/sla/:id/apply/:ticketId
router.post('/:id/apply/:ticketId', slaController.applySLAToTicket);

// ============ SLA INSTANCE MANAGEMENT ============

// Get SLA instance for a specific ticket
// GET /api/sla/instance/:ticketId
router.get('/instance/:ticketId', slaController.getSLAForTicket);

// Pause SLA instance
// POST /api/sla/instance/:id/pause
router.post('/instance/:id/pause', slaController.pauseSLA);

// Resume SLA instance
// POST /api/sla/instance/:id/resume
router.post('/instance/:id/resume', slaController.resumeSLA);

module.exports = router;
