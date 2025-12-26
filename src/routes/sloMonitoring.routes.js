/**
 * SLO Monitoring Routes
 *
 * Routes for Service Level Objective (SLO) monitoring and management.
 * Allows firms to track system performance metrics and receive alerts.
 *
 * Base route: /api/slo-monitoring
 */

const express = require('express');
const router = express.Router();
const sloMonitoringController = require('../controllers/sloMonitoring.controller');
const { userMiddleware, firmAdminOnly } = require('../middlewares');

// ============ APPLY MIDDLEWARE ============
// All SLO monitoring routes require authentication
router.use(userMiddleware);

// ============ INFORMATIONAL ENDPOINTS ============
// These should come before /:id routes to avoid conflicts

// Get SLO dashboard
// GET /api/slo-monitoring/dashboard
router.get('/dashboard', sloMonitoringController.getDashboard);

// Generate SLO report
// GET /api/slo-monitoring/report
router.get('/report', sloMonitoringController.generateReport);

// Get available SLO categories
// GET /api/slo-monitoring/categories
router.get('/categories', sloMonitoringController.getCategories);

// Get available time windows
// GET /api/slo-monitoring/time-windows
router.get('/time-windows', sloMonitoringController.getTimeWindows);

// Get breached SLOs
// GET /api/slo-monitoring/breached
router.get('/breached', sloMonitoringController.getBreachedSLOs);

// Calculate availability metrics
// GET /api/slo-monitoring/metrics/availability
router.get('/metrics/availability', sloMonitoringController.calculateAvailability);

// Calculate latency metrics
// GET /api/slo-monitoring/metrics/latency
router.get('/metrics/latency', sloMonitoringController.calculateLatency);

// ============ ADMIN OPERATIONS ============

// Initialize default SLOs (admin/owner only)
// POST /api/slo-monitoring/initialize-defaults
router.post('/initialize-defaults', firmAdminOnly, sloMonitoringController.initializeDefaults);

// Check SLO alerts manually (admin/owner only)
// POST /api/slo-monitoring/check-alerts
router.post('/check-alerts', firmAdminOnly, sloMonitoringController.checkAlerts);

// ============ SLO CRUD ============

// Get all SLOs for the firm
// GET /api/slo-monitoring
router.get('/', sloMonitoringController.listSLOs);

// Create a new SLO (admin/owner only)
// POST /api/slo-monitoring
router.post('/', firmAdminOnly, sloMonitoringController.createSLO);

// Get single SLO by ID
// GET /api/slo-monitoring/:id
router.get('/:id', sloMonitoringController.getSLO);

// Update SLO (admin/owner only)
// PUT /api/slo-monitoring/:id
router.put('/:id', firmAdminOnly, sloMonitoringController.updateSLO);

// Delete SLO (admin/owner only)
// DELETE /api/slo-monitoring/:id
router.delete('/:id', firmAdminOnly, sloMonitoringController.deleteSLO);

// ============ SLO MONITORING OPERATIONS ============

// Take a measurement for an SLO
// POST /api/slo-monitoring/:id/measure
router.post('/:id/measure', sloMonitoringController.measureSLO);

// Get current status of an SLO
// GET /api/slo-monitoring/:id/status
router.get('/:id/status', sloMonitoringController.getSLOStatus);

// Get SLO measurement history
// GET /api/slo-monitoring/:id/history
router.get('/:id/history', sloMonitoringController.getSLOHistory);

// Get error budget for an SLO
// GET /api/slo-monitoring/:id/error-budget
router.get('/:id/error-budget', sloMonitoringController.getErrorBudget);

module.exports = router;
