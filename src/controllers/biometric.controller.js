const BiometricDevice = require('../models/biometricDevice.model');
const BiometricEnrollment = require('../models/biometricEnrollment.model');
const BiometricLog = require('../models/biometricLog.model');
const GeofenceZone = require('../models/geofenceZone.model');
const BiometricService = require('../services/biometric.service');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

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

  // Mass assignment protection
  const allowedFields = ['deviceName', 'deviceType', 'serialNumber', 'manufacturer', 'model',
                        'ipAddress', 'macAddress', 'location', 'features', 'configuration', 'isActive'];
  const deviceData = pickAllowedFields(req.body, allowedFields);

  const device = await BiometricService.registerDevice(firmId, deviceData, userId);

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

  // Sanitize ID
  const sanitizedId = sanitizeObjectId(id);

  // IDOR protection - verify ownership
  const device = await BiometricDevice.findOne({ _id: sanitizedId, firmId })
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName');

  if (!device) {
    throw CustomException('Device not found', 404);
  }

  // Get device health
  const health = await BiometricService.getDeviceHealth(sanitizedId, firmId);

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

  // Sanitize and validate ID
  const sanitizedId = sanitizeObjectId(id);

  // IDOR protection - verify ownership
  const device = await BiometricDevice.findOne({ _id: sanitizedId, firmId });

  if (!device) {
    throw CustomException('Device not found', 404);
  }

  // Mass assignment protection
  const allowedFields = ['deviceName', 'deviceType', 'ipAddress', 'macAddress', 'location',
                        'features', 'configuration', 'isActive', 'status'];
  const updateData = pickAllowedFields(req.body, allowedFields);

  Object.assign(device, updateData);
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

  // Sanitize ID
  const sanitizedId = sanitizeObjectId(id);

  // IDOR protection - verify ownership
  const device = await BiometricDevice.findOne({ _id: sanitizedId, firmId });

  if (!device) {
    throw CustomException('Device not found', 404);
  }

  // IDOR PROTECTION: Use firm-scoped delete
  await BiometricDevice.findOneAndDelete({ _id: sanitizedId, firmId });

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

  // Sanitize ID
  const sanitizedId = sanitizeObjectId(id);

  const device = await BiometricService.updateDeviceHeartbeat(sanitizedId, firmId);

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

  // Sanitize ID
  const sanitizedId = sanitizeObjectId(id);

  const result = await BiometricService.syncDevice(sanitizedId, firmId);

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

  if (!req.body.employeeId) {
    throw CustomException('Employee ID is required', 400);
  }

  // Sanitize employee ID
  const employeeId = sanitizeObjectId(req.body.employeeId);

  // Mass assignment protection
  const allowedFields = ['enrollmentType', 'priority', 'notes'];
  const enrollmentData = pickAllowedFields(req.body, allowedFields);

  // IDOR protection - verify employee belongs to firm is handled in service
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

  // Sanitize ID
  const sanitizedId = sanitizeObjectId(id);

  // IDOR protection - verify ownership
  const enrollment = await BiometricEnrollment.findOne({ _id: sanitizedId, firmId })
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

  // Sanitize ID
  const sanitizedId = sanitizeObjectId(id);

  // Input validation for biometric data
  const { finger, template, quality, deviceId } = req.body;

  if (!finger || !template) {
    throw CustomException('Finger and template are required', 400);
  }

  // Validate finger type
  const validFingers = ['right_thumb', 'right_index', 'right_middle', 'right_ring', 'right_pinky',
                       'left_thumb', 'left_index', 'left_middle', 'left_ring', 'left_pinky'];
  if (!validFingers.includes(finger)) {
    throw CustomException('Invalid finger type', 400);
  }

  // Validate quality score (0-100)
  if (quality !== undefined && (quality < 0 || quality > 100)) {
    throw CustomException('Quality score must be between 0 and 100', 400);
  }

  // Validate template is non-empty string
  if (typeof template !== 'string' || template.length === 0) {
    throw CustomException('Template must be a non-empty string', 400);
  }

  // IDOR protection - verify enrollment belongs to firm
  const enrollment = await BiometricEnrollment.findOne({ _id: sanitizedId, firmId });

  if (!enrollment) {
    throw CustomException('Enrollment not found', 404);
  }

  // Sanitize deviceId if provided
  const sanitizedDeviceId = deviceId ? sanitizeObjectId(deviceId) : undefined;

  await BiometricService.addFingerprint(firmId, enrollment.employeeId, finger, template, quality, sanitizedDeviceId);

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

  // Sanitize ID
  const sanitizedId = sanitizeObjectId(id);

  // Input validation for biometric data
  const { photo, template, quality, deviceId } = req.body;

  if (!photo || !template) {
    throw CustomException('Photo and template are required', 400);
  }

  // Validate photo is non-empty string (base64 or URL)
  if (typeof photo !== 'string' || photo.length === 0) {
    throw CustomException('Photo must be a non-empty string', 400);
  }

  // Validate template is non-empty string
  if (typeof template !== 'string' || template.length === 0) {
    throw CustomException('Template must be a non-empty string', 400);
  }

  // Validate quality score (0-100)
  if (quality !== undefined && (quality < 0 || quality > 100)) {
    throw CustomException('Quality score must be between 0 and 100', 400);
  }

  // IDOR protection - verify enrollment belongs to firm
  const enrollment = await BiometricEnrollment.findOne({ _id: sanitizedId, firmId });

  if (!enrollment) {
    throw CustomException('Enrollment not found', 404);
  }

  // Sanitize deviceId if provided
  const sanitizedDeviceId = deviceId ? sanitizeObjectId(deviceId) : undefined;

  await BiometricService.enrollFacial(firmId, enrollment.employeeId, photo, template, quality, sanitizedDeviceId);

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

  // Sanitize ID
  const sanitizedId = sanitizeObjectId(id);

  if (!req.body.cardNumber) {
    throw CustomException('Card number is required', 400);
  }

  // Mass assignment protection
  const allowedFields = ['cardNumber', 'cardType', 'validFrom', 'validUntil', 'accessLevel'];
  const cardData = pickAllowedFields(req.body, allowedFields);

  // Validate card number format
  if (typeof cardData.cardNumber !== 'string' || cardData.cardNumber.length === 0) {
    throw CustomException('Card number must be a non-empty string', 400);
  }

  // IDOR protection - verify enrollment belongs to firm
  const enrollment = await BiometricEnrollment.findOne({ _id: sanitizedId, firmId });

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

  // Sanitize ID
  const sanitizedId = sanitizeObjectId(id);

  // Enhanced PIN validation
  if (!pin) {
    throw CustomException('PIN is required', 400);
  }

  if (typeof pin !== 'string') {
    throw CustomException('PIN must be a string', 400);
  }

  if (pin.length < 4 || pin.length > 8) {
    throw CustomException('PIN must be between 4 and 8 digits', 400);
  }

  if (!/^\d+$/.test(pin)) {
    throw CustomException('PIN must contain only digits', 400);
  }

  // IDOR protection - verify enrollment belongs to firm
  const enrollment = await BiometricEnrollment.findOne({ _id: sanitizedId, firmId });

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

  // Sanitize IDs
  const sanitizedDeviceId = sanitizeObjectId(deviceId);
  const sanitizedEmployeeId = sanitizeObjectId(employeeId);

  // Validate verification method
  const validMethods = ['fingerprint', 'facial', 'card', 'pin', 'iris'];
  if (!validMethods.includes(method)) {
    throw CustomException('Invalid verification method', 400);
  }

  // Validate biometric data
  if (typeof data !== 'string' || data.length === 0) {
    throw CustomException('Biometric data must be a non-empty string', 400);
  }

  // Mass assignment protection for location data
  const sanitizedLocation = location ? pickAllowedFields(location, ['latitude', 'longitude', 'accuracy']) : undefined;

  const result = await BiometricService.verifyIdentity(firmId, sanitizedDeviceId, {
    employeeId: sanitizedEmployeeId,
    method,
    data,
    location: sanitizedLocation
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

  // Sanitize device ID
  const sanitizedDeviceId = sanitizeObjectId(deviceId);

  // Validate identification method
  const validMethods = ['fingerprint', 'facial', 'card', 'iris'];
  if (!validMethods.includes(method)) {
    throw CustomException('Invalid identification method', 400);
  }

  // Validate biometric data
  if (typeof data !== 'string' || data.length === 0) {
    throw CustomException('Biometric data must be a non-empty string', 400);
  }

  // Mass assignment protection for location data
  const sanitizedLocation = location ? pickAllowedFields(location, ['latitude', 'longitude', 'accuracy']) : undefined;

  const result = await BiometricService.identifyEmployee(firmId, sanitizedDeviceId, {
    method,
    data,
    location: sanitizedLocation
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

  // Sanitize employee ID
  const sanitizedEmployeeId = sanitizeObjectId(employeeId);

  // Validate GPS coordinates
  if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
    throw CustomException('Latitude must be a number between -90 and 90', 400);
  }

  if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
    throw CustomException('Longitude must be a number between -180 and 180', 400);
  }

  // Validate accuracy
  const validAccuracy = accuracy && typeof accuracy === 'number' ? accuracy : 10;
  if (validAccuracy < 0 || validAccuracy > 1000) {
    throw CustomException('Accuracy must be between 0 and 1000 meters', 400);
  }

  // Mass assignment protection for location data
  const locationData = {
    latitude,
    longitude,
    accuracy: validAccuracy
  };

  if (address && typeof address === 'string') {
    locationData.address = address;
  }

  const result = await BiometricService.checkInWithGPS(firmId, sanitizedEmployeeId, locationData);

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

  // Mass assignment protection
  const allowedFields = ['name', 'description', 'zoneType', 'center', 'radius', 'polygon',
                        'allowedDepartments', 'allowedEmployees', 'workingHours', 'isActive'];
  const zoneData = pickAllowedFields(req.body, allowedFields);

  const zone = new GeofenceZone({
    ...zoneData,
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

  // Sanitize ID
  const sanitizedId = sanitizeObjectId(id);

  // IDOR protection - verify ownership
  const zone = await GeofenceZone.findOne({ _id: sanitizedId, firmId });

  if (!zone) {
    throw CustomException('Geofence zone not found', 404);
  }

  // Mass assignment protection
  const allowedFields = ['name', 'description', 'zoneType', 'center', 'radius', 'polygon',
                        'allowedDepartments', 'allowedEmployees', 'workingHours', 'isActive'];
  const updateData = pickAllowedFields(req.body, allowedFields);

  Object.assign(zone, updateData);
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

  // IDOR PROTECTION: Use firm-scoped delete
  await GeofenceZone.findOneAndDelete({ _id: id, firmId });

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

  // Validate GPS coordinates
  if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
    throw CustomException('Latitude must be a number between -90 and 90', 400);
  }

  if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
    throw CustomException('Longitude must be a number between -180 and 180', 400);
  }

  // Validate accuracy
  const validAccuracy = accuracy && typeof accuracy === 'number' ? accuracy : 10;
  if (validAccuracy < 0 || validAccuracy > 1000) {
    throw CustomException('Accuracy must be between 0 and 1000 meters', 400);
  }

  // Sanitize IDs if provided
  const sanitizedEmployeeId = employeeId ? sanitizeObjectId(employeeId) : undefined;
  const sanitizedDepartmentId = departmentId ? sanitizeObjectId(departmentId) : undefined;

  const validation = await BiometricService.validateGeofence(
    firmId,
    latitude,
    longitude,
    validAccuracy,
    sanitizedEmployeeId,
    sanitizedDepartmentId
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
