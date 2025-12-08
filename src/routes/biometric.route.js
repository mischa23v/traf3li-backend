const express = require('express');
const router = express.Router();
const {
  // Device management
  registerDevice,
  getDevices,
  getDevice,
  updateDevice,
  deleteDevice,
  updateHeartbeat,
  syncDevice,

  // Enrollment management
  enrollEmployee,
  getEnrollments,
  getEnrollment,
  getEnrollmentByEmployee,
  addFingerprint,
  enrollFacial,
  issueCard,
  setPIN,
  revokeEnrollment,
  getEnrollmentStats,

  // Verification & identification
  verifyIdentity,
  identifyEmployee,
  checkInWithGPS,

  // Geofence management
  createGeofenceZone,
  getGeofenceZones,
  getGeofenceZone,
  updateGeofenceZone,
  deleteGeofenceZone,
  validateGeofence,

  // Logs & reports
  getLogs,
  getVerificationStats,
  getFailedAttempts,
  getSpoofingAttempts,
  getDailySummary,
  processLogs
} = require('../controllers/biometric.controller');

const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');

// All routes require authentication
router.use(verifyToken);
router.use(attachFirmContext);

// ═══════════════════════════════════════════════════════════════
// DEVICE ROUTES
// ═══════════════════════════════════════════════════════════════

// Device CRUD
router.post('/devices', registerDevice);
router.get('/devices', getDevices);
router.get('/devices/:id', getDevice);
router.put('/devices/:id', updateDevice);
router.delete('/devices/:id', deleteDevice);

// Device operations
router.post('/devices/:id/heartbeat', updateHeartbeat);
router.post('/devices/:id/sync', syncDevice);

// ═══════════════════════════════════════════════════════════════
// ENROLLMENT ROUTES
// ═══════════════════════════════════════════════════════════════

// Enrollment stats (must be before /:id routes)
router.get('/enrollments/stats', getEnrollmentStats);

// Enrollment CRUD
router.post('/enrollments', enrollEmployee);
router.get('/enrollments', getEnrollments);
router.get('/enrollments/:id', getEnrollment);

// Get by employee
router.get('/enrollments/employee/:employeeId', getEnrollmentByEmployee);

// Enrollment operations
router.post('/enrollments/:id/fingerprint', addFingerprint);
router.post('/enrollments/:id/facial', enrollFacial);
router.post('/enrollments/:id/card', issueCard);
router.post('/enrollments/:id/pin', setPIN);
router.post('/enrollments/:id/revoke', revokeEnrollment);

// ═══════════════════════════════════════════════════════════════
// VERIFICATION & IDENTIFICATION ROUTES
// ═══════════════════════════════════════════════════════════════

router.post('/verify', verifyIdentity);
router.post('/identify', identifyEmployee);
router.post('/checkin-gps', checkInWithGPS);

// ═══════════════════════════════════════════════════════════════
// GEOFENCE ROUTES
// ═══════════════════════════════════════════════════════════════

// Geofence validation (must be before /:id routes)
router.post('/geofence/validate', validateGeofence);

// Geofence CRUD
router.post('/geofence', createGeofenceZone);
router.get('/geofence', getGeofenceZones);
router.get('/geofence/:id', getGeofenceZone);
router.put('/geofence/:id', updateGeofenceZone);
router.delete('/geofence/:id', deleteGeofenceZone);

// ═══════════════════════════════════════════════════════════════
// LOGS & REPORTS ROUTES
// ═══════════════════════════════════════════════════════════════

// Log stats and reports (must be before generic /logs route)
router.get('/logs/stats', getVerificationStats);
router.get('/logs/failed', getFailedAttempts);
router.get('/logs/spoofing', getSpoofingAttempts);
router.get('/logs/daily-summary', getDailySummary);
router.post('/logs/process', processLogs);

// Logs
router.get('/logs', getLogs);

module.exports = router;
