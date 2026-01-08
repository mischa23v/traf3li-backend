/**
 * Fleet Management Routes
 *
 * Vehicle and fleet management endpoints
 *
 * SECURITY: All routes require authentication (via global middleware)
 */

const express = require('express');
const router = express.Router();
const fleetController = require('../controllers/fleet.controller');

// ═══════════════════════════════════════════════════════════════
// VEHICLE ROUTES
// ═══════════════════════════════════════════════════════════════

router.get('/stats', fleetController.getFleetStats);
router.get('/vehicles', fleetController.getVehicles);
router.get('/vehicles/:id', fleetController.getVehicleById);
router.post('/vehicles', fleetController.createVehicle);
router.patch('/vehicles/:id', fleetController.updateVehicle);
router.delete('/vehicles/:id', fleetController.deleteVehicle);

// ═══════════════════════════════════════════════════════════════
// FUEL LOG ROUTES
// ═══════════════════════════════════════════════════════════════

router.get('/fuel-logs', fleetController.getFuelLogs);
router.post('/fuel-logs', fleetController.createFuelLog);

// ═══════════════════════════════════════════════════════════════
// MAINTENANCE ROUTES
// ═══════════════════════════════════════════════════════════════

router.get('/maintenance', fleetController.getMaintenanceRecords);
router.post('/maintenance', fleetController.createMaintenanceRecord);
router.patch('/maintenance/:id', fleetController.updateMaintenanceRecord);

// ═══════════════════════════════════════════════════════════════
// ASSIGNMENT ROUTES
// ═══════════════════════════════════════════════════════════════

router.post('/assignments', fleetController.assignVehicle);
router.post('/assignments/:id/end', fleetController.endAssignment);

module.exports = router;
