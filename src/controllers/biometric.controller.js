const BiometricDevice = require('../models/biometricDevice.model');
const BiometricEnrollment = require('../models/biometricEnrollment.model');
const BiometricLog = require('../models/biometricLog.model');
const GeofenceZone = require('../models/geofenceZone.model');
const BiometricService = require('../services/biometric.service');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');

// ═══════════════════════════════════════════════════════════════
// DEVICE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Register a new biometric device
 * POST /api/biometric/devices
 */
const registerDevice = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const userId = req.userID;

  if (!firmId) {
    throw CustomException('Firm ID is required', 400);
  }

  const device = await BiometricService.registerDevice(firmId, req.body, userId);

  return res.status(201).json({
    success: true,
    message: 'Device registered successfully',
    device
  });
});

/**
 * Get all devices
 * GET /api/biometric/devices
 */
const getDevices = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const { status, deviceType, isActive } = req.query;

  const filters = { firmId };
  if (status) filters.status = status;
  if (deviceType) filters.deviceType = deviceType;
  if (isActive !== undefined) filters.isActive = isActive === 'true';

  const devices = await BiometricDevice.find(filters)
    .populate('createdBy', 'firstName lastName')
    .sort({ createdAt: -1 });

  return res.json({
    success: true,
    devices
  });
});

/**
 * Get single device
 * GET /api/biometric/devices/:id
 */
const getDevice = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const { id } = req.params;

  const device = await BiometricDevice.findOne({ _id: id, firmId })
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName');

  if (!device) {
    throw CustomException('Device not found', 404);
  }

  // Get device health
  const health = await BiometricService.getDeviceHealth(id, firmId);

  return res.json({
    success: true,
    device,
    health
  });
});

/**
 * Update device
 * PUT /api/biometric/devices/:id
 */
const updateDevice = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const userId = req.userID;
  const { id } = req.params;

  const device = await BiometricDevice.findOne({ _id: id, firmId });

  if (!device) {
    throw CustomException('Device not found', 404);
  }

  Object.assign(device, req.body);
  device.updatedBy = userId;

  await device.save();

  return res.json({
    success: true,
    message: 'Device updated successfully',
    device
  });
});

/**
 * Delete device
 * DELETE /api/biometric/devices/:id
 */
const deleteDevice = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const { id } = req.params;

  const device = await BiometricDevice.findOne({ _id: id, firmId });

  if (!device) {
    throw CustomException('Device not found', 404);
  }

  await BiometricDevice.findByIdAndDelete(id);

  return res.json({
    success: true,
    message: 'Device deleted successfully'
  });
});

/**
 * Update device heartbeat
 * POST /api/biometric/devices/:id/heartbeat
 */
const updateHeartbeat = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const { id } = req.params;

  const device = await BiometricService.updateDeviceHeartbeat(id, firmId);

  return res.json({
    success: true,
    message: 'Heartbeat updated',
    device
  });
});

/**
 * Sync device
 * POST /api/biometric/devices/:id/sync
 */
const syncDevice = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const { id } = req.params;

  const result = await BiometricService.syncDevice(id, firmId);

  return res.json({
    success: true,
    message: 'Device synced successfully',
    ...result
  });
});

// ═══════════════════════════════════════════════════════════════
// ENROLLMENT MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Enroll employee
 * POST /api/biometric/enrollments
 */
const enrollEmployee = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const userId = req.userID;
  const { employeeId, ...enrollmentData } = req.body;

  if (!employeeId) {
    throw CustomException('Employee ID is required', 400);
  }

  const enrollment = await BiometricService.enrollEmployee(firmId, employeeId, enrollmentData, userId);

  return res.status(201).json({
    success: true,
    message: 'Employee enrolled successfully',
    enrollment
  });
});

/**
 * Get all enrollments
 * GET /api/biometric/enrollments
 */
const getEnrollments = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const { status, employeeId } = req.query;

  const filters = { firmId };
  if (status) filters.status = status;
  if (employeeId) filters.employeeId = employeeId;

  const enrollments = await BiometricEnrollment.find(filters)
    .populate('employeeId', 'personalInfo.fullNameArabic personalInfo.fullNameEnglish employeeId')
    .populate('enrolledBy', 'firstName lastName')
    .populate('enrolledDevices', 'deviceName deviceType')
    .sort({ enrolledAt: -1 });

  return res.json({
    success: true,
    enrollments
  });
});

/**
 * Get single enrollment
 * GET /api/biometric/enrollments/:id
 */
const getEnrollment = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const { id } = req.params;

  const enrollment = await BiometricEnrollment.findOne({ _id: id, firmId })
    .populate('employeeId', 'personalInfo.fullNameArabic personalInfo.fullNameEnglish employeeId personalInfo.mobile')
    .populate('enrolledBy', 'firstName lastName')
    .populate('revokedBy', 'firstName lastName')
    .populate('enrolledDevices', 'deviceName deviceType status location.name');

  if (!enrollment) {
    throw CustomException('Enrollment not found', 404);
  }

  return res.json({
    success: true,
    enrollment
  });
});

/**
 * Get enrollment by employee
 * GET /api/biometric/enrollments/employee/:employeeId
 */
const getEnrollmentByEmployee = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const { employeeId } = req.params;

  const enrollment = await BiometricEnrollment.findByEmployee(firmId, employeeId);

  if (!enrollment) {
    throw CustomException('Enrollment not found', 404);
  }

  return res.json({
    success: true,
    enrollment
  });
});

/**
 * Add fingerprint to enrollment
 * POST /api/biometric/enrollments/:id/fingerprint
 */
const addFingerprint = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const { id } = req.params;
  const { finger, template, quality, deviceId } = req.body;

  if (!finger || !template) {
    throw CustomException('Finger and template are required', 400);
  }

  const enrollment = await BiometricEnrollment.findOne({ _id: id, firmId });

  if (!enrollment) {
    throw CustomException('Enrollment not found', 404);
  }

  await BiometricService.addFingerprint(firmId, enrollment.employeeId, finger, template, quality, deviceId);

  return res.json({
    success: true,
    message: 'Fingerprint added successfully'
  });
});

/**
 * Enroll facial recognition
 * POST /api/biometric/enrollments/:id/facial
 */
const enrollFacial = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const { id } = req.params;
  const { photo, template, quality, deviceId } = req.body;

  if (!photo || !template) {
    throw CustomException('Photo and template are required', 400);
  }

  const enrollment = await BiometricEnrollment.findOne({ _id: id, firmId });

  if (!enrollment) {
    throw CustomException('Enrollment not found', 404);
  }

  await BiometricService.enrollFacial(firmId, enrollment.employeeId, photo, template, quality, deviceId);

  return res.json({
    success: true,
    message: 'Facial recognition enrolled successfully'
  });
});

/**
 * Issue card to employee
 * POST /api/biometric/enrollments/:id/card
 */
const issueCard = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const { id } = req.params;
  const cardData = req.body;

  if (!cardData.cardNumber) {
    throw CustomException('Card number is required', 400);
  }

  const enrollment = await BiometricEnrollment.findOne({ _id: id, firmId });

  if (!enrollment) {
    throw CustomException('Enrollment not found', 404);
  }

  await BiometricService.issueCard(firmId, enrollment.employeeId, cardData);

  return res.json({
    success: true,
    message: 'Card issued successfully'
  });
});

/**
 * Set PIN for employee
 * POST /api/biometric/enrollments/:id/pin
 */
const setPIN = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const { id } = req.params;
  const { pin } = req.body;

  if (!pin || pin.length < 4) {
    throw CustomException('PIN must be at least 4 digits', 400);
  }

  const enrollment = await BiometricEnrollment.findOne({ _id: id, firmId });

  if (!enrollment) {
    throw CustomException('Enrollment not found', 404);
  }

  await BiometricService.setPIN(firmId, enrollment.employeeId, pin);

  return res.json({
    success: true,
    message: 'PIN set successfully'
  });
});

/**
 * Revoke enrollment
 * POST /api/biometric/enrollments/:id/revoke
 */
const revokeEnrollment = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const userId = req.userID;
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    throw CustomException('Reason is required', 400);
  }

  const enrollment = await BiometricEnrollment.findOne({ _id: id, firmId });

  if (!enrollment) {
    throw CustomException('Enrollment not found', 404);
  }

  await BiometricService.revokeEnrollment(firmId, enrollment.employeeId, userId, reason);

  return res.json({
    success: true,
    message: 'Enrollment revoked successfully'
  });
});

/**
 * Get enrollment statistics
 * GET /api/biometric/enrollments/stats
 */
const getEnrollmentStats = asyncHandler(async (req, res) => {
  const firmId = req.firmId;

  const stats = await BiometricEnrollment.getStats(firmId);

  return res.json({
    success: true,
    stats
  });
});

// ═══════════════════════════════════════════════════════════════
// VERIFICATION & IDENTIFICATION
// ═══════════════════════════════════════════════════════════════

/**
 * Verify employee identity
 * POST /api/biometric/verify
 */
const verifyIdentity = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const { deviceId, employeeId, method, data, location } = req.body;

  if (!deviceId || !employeeId || !method || !data) {
    throw CustomException('Device ID, employee ID, method, and data are required', 400);
  }

  const result = await BiometricService.verifyIdentity(firmId, deviceId, {
    employeeId,
    method,
    data,
    location
  });

  return res.json({
    success: result.success,
    message: result.message,
    result
  });
});

/**
 * Identify employee (1:N matching)
 * POST /api/biometric/identify
 */
const identifyEmployee = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const { deviceId, method, data, location } = req.body;

  if (!deviceId || !method || !data) {
    throw CustomException('Device ID, method, and data are required', 400);
  }

  const result = await BiometricService.identifyEmployee(firmId, deviceId, {
    method,
    data,
    location
  });

  return res.json({
    success: result.success,
    message: result.message,
    result
  });
});

/**
 * Check-in with GPS location
 * POST /api/biometric/checkin-gps
 */
const checkInWithGPS = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const { employeeId, latitude, longitude, accuracy, address } = req.body;

  if (!employeeId || !latitude || !longitude) {
    throw CustomException('Employee ID, latitude, and longitude are required', 400);
  }

  const result = await BiometricService.checkInWithGPS(firmId, employeeId, {
    latitude,
    longitude,
    accuracy: accuracy || 10,
    address
  });

  return res.json({
    success: true,
    message: 'Check-in successful',
    ...result
  });
});

// ═══════════════════════════════════════════════════════════════
// GEOFENCE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Create geofence zone
 * POST /api/biometric/geofence
 */
const createGeofenceZone = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const userId = req.userID;

  const zone = new GeofenceZone({
    ...req.body,
    firmId,
    createdBy: userId
  });

  await zone.save();

  return res.status(201).json({
    success: true,
    message: 'Geofence zone created successfully',
    zone
  });
});

/**
 * Get all geofence zones
 * GET /api/biometric/geofence
 */
const getGeofenceZones = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const { isActive } = req.query;

  const filters = { firmId };
  if (isActive !== undefined) filters.isActive = isActive === 'true';

  const zones = await GeofenceZone.find(filters)
    .populate('linkedDevices', 'deviceName deviceType status')
    .populate('createdBy', 'firstName lastName')
    .sort({ name: 1 });

  return res.json({
    success: true,
    zones
  });
});

/**
 * Get single geofence zone
 * GET /api/biometric/geofence/:id
 */
const getGeofenceZone = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const { id } = req.params;

  const zone = await GeofenceZone.findOne({ _id: id, firmId })
    .populate('linkedDevices', 'deviceName deviceType status location.name')
    .populate('createdBy', 'firstName lastName');

  if (!zone) {
    throw CustomException('Geofence zone not found', 404);
  }

  return res.json({
    success: true,
    zone
  });
});

/**
 * Update geofence zone
 * PUT /api/biometric/geofence/:id
 */
const updateGeofenceZone = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const { id } = req.params;

  const zone = await GeofenceZone.findOne({ _id: id, firmId });

  if (!zone) {
    throw CustomException('Geofence zone not found', 404);
  }

  Object.assign(zone, req.body);
  await zone.save();

  return res.json({
    success: true,
    message: 'Geofence zone updated successfully',
    zone
  });
});

/**
 * Delete geofence zone
 * DELETE /api/biometric/geofence/:id
 */
const deleteGeofenceZone = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const { id } = req.params;

  const zone = await GeofenceZone.findOne({ _id: id, firmId });

  if (!zone) {
    throw CustomException('Geofence zone not found', 404);
  }

  await GeofenceZone.findByIdAndDelete(id);

  return res.json({
    success: true,
    message: 'Geofence zone deleted successfully'
  });
});

/**
 * Validate geofence location
 * POST /api/biometric/geofence/validate
 */
const validateGeofence = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const { latitude, longitude, accuracy, employeeId, departmentId } = req.body;

  if (!latitude || !longitude) {
    throw CustomException('Latitude and longitude are required', 400);
  }

  const validation = await BiometricService.validateGeofence(
    firmId,
    latitude,
    longitude,
    accuracy || 10,
    employeeId,
    departmentId
  );

  return res.json({
    success: validation.allowed,
    validation
  });
});

// ═══════════════════════════════════════════════════════════════
// LOGS & REPORTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get biometric logs
 * GET /api/biometric/logs
 */
const getLogs = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const { employeeId, deviceId, eventType, startDate, endDate, limit = 100 } = req.query;

  const filters = { firmId };
  if (employeeId) filters.employeeId = employeeId;
  if (deviceId) filters.deviceId = deviceId;
  if (eventType) filters.eventType = eventType;

  if (startDate || endDate) {
    filters.timestamp = {};
    if (startDate) filters.timestamp.$gte = new Date(startDate);
    if (endDate) filters.timestamp.$lte = new Date(endDate);
  }

  const logs = await BiometricLog.find(filters)
    .populate('employeeId', 'personalInfo.fullNameArabic personalInfo.fullNameEnglish employeeId')
    .populate('deviceId', 'deviceName deviceType location.name')
    .populate('attendanceRecordId', 'attendanceId date status')
    .sort({ timestamp: -1 })
    .limit(parseInt(limit));

  const total = await BiometricLog.countDocuments(filters);

  return res.json({
    success: true,
    logs,
    total
  });
});

/**
 * Get verification statistics
 * GET /api/biometric/logs/stats
 */
const getVerificationStats = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const { startDate, endDate } = req.query;

  const stats = await BiometricLog.getVerificationStats(firmId, startDate, endDate);

  return res.json({
    success: true,
    stats
  });
});

/**
 * Get failed verification attempts
 * GET /api/biometric/logs/failed
 */
const getFailedAttempts = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const { hours = 24 } = req.query;

  const attempts = await BiometricLog.getFailedAttempts(firmId, parseInt(hours));

  return res.json({
    success: true,
    attempts,
    total: attempts.length
  });
});

/**
 * Get spoofing attempts
 * GET /api/biometric/logs/spoofing
 */
const getSpoofingAttempts = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const { days = 7 } = req.query;

  const attempts = await BiometricLog.getSpoofingAttempts(firmId, parseInt(days));

  return res.json({
    success: true,
    attempts,
    total: attempts.length
  });
});

/**
 * Get daily summary
 * GET /api/biometric/logs/daily-summary
 */
const getDailySummary = asyncHandler(async (req, res) => {
  const firmId = req.firmId;
  const { date = new Date() } = req.query;

  const summary = await BiometricLog.getDailySummary(firmId, new Date(date));

  return res.json({
    success: true,
    summary
  });
});

/**
 * Process unprocessed logs
 * POST /api/biometric/logs/process
 */
const processLogs = asyncHandler(async (req, res) => {
  const firmId = req.firmId;

  const result = await BiometricService.processLogs(firmId);

  return res.json({
    success: true,
    message: 'Logs processed successfully',
    ...result
  });
});

module.exports = {
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
};
