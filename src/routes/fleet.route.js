/**
 * Fleet Management Routes
 *
 * Enterprise fleet and vehicle management endpoints
 * Inspired by: SAP Fleet, Oracle Fleet, Fleetio, Samsara, Geotab
 *
 * SECURITY: All routes require authentication (via global middleware)
 */

const express = require('express');
const router = express.Router();
const fleetController = require('../controllers/fleet.controller');

// ═══════════════════════════════════════════════════════════════
// STATISTICS & ALERTS (Place before parameterized routes)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/hr/fleet/stats
 * Get fleet statistics and overview
 */
router.get('/stats', fleetController.getFleetStats);

/**
 * GET /api/hr/fleet/expiring-documents
 * Get vehicles with expiring registration/insurance
 * Query: days (default 30)
 */
router.get('/expiring-documents', fleetController.getExpiringDocuments);

/**
 * GET /api/hr/fleet/maintenance-due
 * Get vehicles due for maintenance
 * Query: days (default 14)
 */
router.get('/maintenance-due', fleetController.getMaintenanceDue);

/**
 * GET /api/hr/fleet/driver-rankings
 * Get driver safety rankings
 * Query: limit (default 10)
 */
router.get('/driver-rankings', fleetController.getDriverRankings);

// ═══════════════════════════════════════════════════════════════
// VEHICLE ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/hr/fleet/vehicles
 * Get all vehicles with filtering
 * Query: status, vehicleType, currentDriverId, assignedDepartmentId, search, page, limit
 */
router.get('/vehicles', fleetController.getVehicles);

/**
 * GET /api/hr/fleet/vehicles/:id
 * Get single vehicle details
 */
router.get('/vehicles/:id', fleetController.getVehicleById);

/**
 * POST /api/hr/fleet/vehicles
 * Create new vehicle
 */
router.post('/vehicles', fleetController.createVehicle);

/**
 * PATCH /api/hr/fleet/vehicles/:id
 * Update vehicle
 */
router.patch('/vehicles/:id', fleetController.updateVehicle);

/**
 * DELETE /api/hr/fleet/vehicles/:id
 * Soft delete vehicle (marks as disposed)
 */
router.delete('/vehicles/:id', fleetController.deleteVehicle);

/**
 * PUT /api/hr/fleet/vehicles/:id/location
 * Update vehicle GPS location
 */
router.put('/vehicles/:id/location', fleetController.updateVehicleLocation);

/**
 * GET /api/hr/fleet/vehicles/:id/location-history
 * Get vehicle GPS location history
 * Query: dateFrom, dateTo, page, limit
 */
router.get('/vehicles/:id/location-history', fleetController.getLocationHistory);

// ═══════════════════════════════════════════════════════════════
// FUEL LOG ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/hr/fleet/fuel-logs
 * Get fuel logs with filtering
 * Query: vehicleId, driverId, dateFrom, dateTo, fuelType, page, limit
 */
router.get('/fuel-logs', fleetController.getFuelLogs);

/**
 * POST /api/hr/fleet/fuel-logs
 * Create fuel log entry
 */
router.post('/fuel-logs', fleetController.createFuelLog);

/**
 * POST /api/hr/fleet/fuel-logs/:id/verify
 * Verify a fuel log entry
 */
router.post('/fuel-logs/:id/verify', fleetController.verifyFuelLog);

// ═══════════════════════════════════════════════════════════════
// MAINTENANCE ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/hr/fleet/maintenance
 * Get maintenance records
 * Query: vehicleId, status, maintenanceType, maintenanceCategory, priority, page, limit
 */
router.get('/maintenance', fleetController.getMaintenanceRecords);

/**
 * POST /api/hr/fleet/maintenance
 * Create maintenance record
 */
router.post('/maintenance', fleetController.createMaintenanceRecord);

/**
 * PATCH /api/hr/fleet/maintenance/:id
 * Update maintenance record
 */
router.patch('/maintenance/:id', fleetController.updateMaintenanceRecord);

// ═══════════════════════════════════════════════════════════════
// INSPECTION ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/hr/fleet/inspections/checklist
 * Get standard inspection checklist items (DVIR compliant)
 */
router.get('/inspections/checklist', fleetController.getInspectionChecklist);

/**
 * GET /api/hr/fleet/inspections
 * Get vehicle inspections
 * Query: vehicleId, inspectorId, inspectionType, overallStatus, dateFrom, dateTo, page, limit
 */
router.get('/inspections', fleetController.getInspections);

/**
 * POST /api/hr/fleet/inspections
 * Create vehicle inspection
 */
router.post('/inspections', fleetController.createInspection);

// ═══════════════════════════════════════════════════════════════
// TRIP ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/hr/fleet/trips
 * Get trip logs
 * Query: vehicleId, driverId, tripType, status, dateFrom, dateTo, page, limit
 */
router.get('/trips', fleetController.getTrips);

/**
 * POST /api/hr/fleet/trips
 * Create/start a trip
 */
router.post('/trips', fleetController.createTrip);

/**
 * POST /api/hr/fleet/trips/:id/end
 * End a trip
 */
router.post('/trips/:id/end', fleetController.endTrip);

// ═══════════════════════════════════════════════════════════════
// INCIDENT ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/hr/fleet/incidents
 * Get vehicle incidents
 * Query: vehicleId, driverId, incidentType, severity, status, dateFrom, dateTo, page, limit
 */
router.get('/incidents', fleetController.getIncidents);

/**
 * GET /api/hr/fleet/incidents/:id
 * Get single incident details
 */
router.get('/incidents/:id', fleetController.getIncidentById);

/**
 * POST /api/hr/fleet/incidents
 * Report new incident
 */
router.post('/incidents', fleetController.createIncident);

/**
 * PATCH /api/hr/fleet/incidents/:id
 * Update incident
 */
router.patch('/incidents/:id', fleetController.updateIncident);

// ═══════════════════════════════════════════════════════════════
// DRIVER PROFILE ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/hr/fleet/drivers
 * Get driver profiles
 * Query: status, search, page, limit
 */
router.get('/drivers', fleetController.getDriverProfiles);

/**
 * GET /api/hr/fleet/drivers/:id
 * Get single driver profile
 */
router.get('/drivers/:id', fleetController.getDriverProfileById);

/**
 * POST /api/hr/fleet/drivers
 * Create driver profile
 */
router.post('/drivers', fleetController.createDriverProfile);

/**
 * PATCH /api/hr/fleet/drivers/:id
 * Update driver profile
 */
router.patch('/drivers/:id', fleetController.updateDriverProfile);

// ═══════════════════════════════════════════════════════════════
// ASSIGNMENT ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/hr/fleet/assignments
 * Assign vehicle to driver
 */
router.post('/assignments', fleetController.assignVehicle);

/**
 * POST /api/hr/fleet/assignments/:id/end
 * End vehicle assignment
 */
router.post('/assignments/:id/end', fleetController.endAssignment);

module.exports = router;
