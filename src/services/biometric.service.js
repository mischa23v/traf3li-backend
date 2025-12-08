/**
 * Biometric Attendance Service
 * Comprehensive biometric attendance and geo-fencing management
 */

const BiometricDevice = require('../models/biometricDevice.model');
const BiometricEnrollment = require('../models/biometricEnrollment.model');
const BiometricLog = require('../models/biometricLog.model');
const GeofenceZone = require('../models/geofenceZone.model');
const AttendanceRecord = require('../models/attendanceRecord.model');
const Employee = require('../models/employee.model');
const crypto = require('crypto');

class BiometricService {
  // ═══════════════════════════════════════════════════════════════
  // DEVICE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Register a new biometric device
   */
  static async registerDevice(firmId, deviceData, userId) {
    const device = new BiometricDevice({
      ...deviceData,
      firmId,
      createdBy: userId,
      status: 'offline'
    });

    await device.save();
    return device;
  }

  /**
   * Update device status and heartbeat
   */
  static async updateDeviceHeartbeat(deviceId, firmId) {
    const device = await BiometricDevice.findOne({ _id: deviceId, firmId });
    if (!device) {
      throw new Error('Device not found');
    }

    return device.updateHeartbeat();
  }

  /**
   * Sync device data (users, logs, etc.)
   */
  static async syncDevice(deviceId, firmId) {
    const device = await BiometricDevice.findOne({ _id: deviceId, firmId });
    if (!device) {
      throw new Error('Device not found');
    }

    // TODO: Implement actual device sync based on manufacturer
    // For now, just update last sync time
    device.lastSyncAt = new Date();
    device.status = 'online';
    await device.save();

    return {
      success: true,
      deviceId: device.deviceId,
      syncedAt: device.lastSyncAt
    };
  }

  /**
   * Get device health status
   */
  static async getDeviceHealth(deviceId, firmId) {
    const device = await BiometricDevice.findOne({ _id: deviceId, firmId });
    if (!device) {
      throw new Error('Device not found');
    }

    const health = {
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      status: device.status,
      lastHeartbeat: device.lastHeartbeat,
      lastSyncAt: device.lastSyncAt,
      isOnline: device.status === 'online',
      stats: device.stats,
      errorMessage: device.errorMessage
    };

    // Check if device is stale (no heartbeat in last 5 minutes)
    if (device.lastHeartbeat) {
      const timeSinceHeartbeat = Date.now() - device.lastHeartbeat.getTime();
      health.isStale = timeSinceHeartbeat > 5 * 60 * 1000;
    }

    return health;
  }

  // ═══════════════════════════════════════════════════════════════
  // ENROLLMENT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Enroll employee biometric data
   */
  static async enrollEmployee(firmId, employeeId, enrollmentData, userId) {
    // Check if employee exists
    const employee = await Employee.findOne({ _id: employeeId, firmId });
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Check if already enrolled
    let enrollment = await BiometricEnrollment.findOne({ firmId, employeeId });

    if (enrollment) {
      // Update existing enrollment
      if (enrollmentData.fingerprints) {
        enrollment.fingerprints.push(...enrollmentData.fingerprints);
      }
      if (enrollmentData.facial) {
        enrollment.facial = enrollmentData.facial;
      }
      if (enrollmentData.card) {
        enrollment.card = enrollmentData.card;
      }
      if (enrollmentData.pin) {
        enrollment.pin = enrollmentData.pin;
      }
    } else {
      // Create new enrollment
      enrollment = new BiometricEnrollment({
        firmId,
        employeeId,
        ...enrollmentData,
        enrolledBy: userId
      });
    }

    await enrollment.completeEnrollment();
    return enrollment;
  }

  /**
   * Add fingerprint template to enrollment
   */
  static async addFingerprint(firmId, employeeId, finger, templateData, quality, deviceId) {
    const enrollment = await BiometricEnrollment.findOne({ firmId, employeeId });
    if (!enrollment) {
      throw new Error('Employee not enrolled');
    }

    // Convert template to Buffer
    const template = Buffer.from(templateData, 'base64');

    return enrollment.addFingerprint(finger, template, quality, deviceId);
  }

  /**
   * Enroll facial recognition
   */
  static async enrollFacial(firmId, employeeId, photoUrl, templateData, quality, deviceId) {
    const enrollment = await BiometricEnrollment.findOne({ firmId, employeeId });
    if (!enrollment) {
      throw new Error('Employee not enrolled');
    }

    const template = Buffer.from(templateData, 'base64');

    enrollment.facial = {
      template,
      photo: photoUrl,
      quality,
      deviceId,
      enrolledAt: new Date(),
      antiSpoofingPassed: true
    };

    return enrollment.save();
  }

  /**
   * Issue card/badge to employee
   */
  static async issueCard(firmId, employeeId, cardData) {
    const enrollment = await BiometricEnrollment.findOne({ firmId, employeeId });
    if (!enrollment) {
      throw new Error('Employee not enrolled');
    }

    enrollment.card = {
      ...cardData,
      issuedAt: new Date(),
      isActive: true
    };

    return enrollment.save();
  }

  /**
   * Set PIN for employee
   */
  static async setPIN(firmId, employeeId, pin) {
    const enrollment = await BiometricEnrollment.findOne({ firmId, employeeId });
    if (!enrollment) {
      throw new Error('Employee not enrolled');
    }

    // Hash PIN
    const hash = crypto.createHash('sha256').update(pin).digest('hex');

    enrollment.pin = {
      hash,
      issuedAt: new Date(),
      lastChangedAt: new Date(),
      failedAttempts: 0,
      lockedUntil: null
    };

    return enrollment.save();
  }

  /**
   * Revoke employee enrollment
   */
  static async revokeEnrollment(firmId, employeeId, userId, reason) {
    const enrollment = await BiometricEnrollment.findOne({ firmId, employeeId });
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    return enrollment.revoke(userId, reason);
  }

  // ═══════════════════════════════════════════════════════════════
  // VERIFICATION & IDENTIFICATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Verify employee identity using biometric data
   */
  static async verifyIdentity(firmId, deviceId, verificationData) {
    const startTime = Date.now();

    const { employeeId, method, data, location } = verificationData;

    // Get device
    const device = await BiometricDevice.findOne({ _id: deviceId, firmId });
    if (!device) {
      throw new Error('Device not found');
    }

    // Get enrollment
    const enrollment = await BiometricEnrollment.findByEmployee(firmId, employeeId);
    if (!enrollment || !enrollment.isActive()) {
      await this.logVerification(firmId, deviceId, employeeId, method, false, 'Not enrolled or expired', location);
      throw new Error('Employee not enrolled or enrollment expired');
    }

    let verificationResult = null;

    // Perform verification based on method
    switch (method) {
      case 'fingerprint':
        verificationResult = await this.verifyFingerprint(enrollment, data, device);
        break;
      case 'facial':
        verificationResult = await this.verifyFacial(enrollment, data, device);
        break;
      case 'card':
        verificationResult = await this.verifyCard(enrollment, data);
        break;
      case 'pin':
        verificationResult = await this.verifyPIN(enrollment, data);
        break;
      case 'multi':
        verificationResult = await this.verifyMultiModal(enrollment, data, device);
        break;
      default:
        throw new Error('Invalid verification method');
    }

    const verificationTime = Date.now() - startTime;

    // Record verification in device stats
    await device.recordVerification(verificationResult.success, verificationTime);

    // Log verification
    await this.logVerification(
      firmId,
      deviceId,
      employeeId,
      method,
      verificationResult.success,
      verificationResult.message,
      location,
      verificationResult.score,
      device.config.verificationThreshold,
      verificationTime
    );

    return {
      ...verificationResult,
      verificationTime,
      employeeId: enrollment.employeeId
    };
  }

  /**
   * Identify employee from biometric data (1:N matching)
   */
  static async identifyEmployee(firmId, deviceId, identificationData) {
    const { method, data, location } = identificationData;

    // Get device
    const device = await BiometricDevice.findOne({ _id: deviceId, firmId });
    if (!device) {
      throw new Error('Device not found');
    }

    // Get all enrolled employees
    const enrollments = await BiometricEnrollment.getEnrolledEmployees(firmId);

    let bestMatch = null;
    let bestScore = 0;

    // Search through enrollments
    for (const enrollment of enrollments) {
      let score = 0;

      if (method === 'fingerprint' && enrollment.fingerprints.length > 0) {
        score = await this.matchFingerprint(data, enrollment);
      } else if (method === 'facial' && enrollment.facial) {
        score = await this.matchFacial(data, enrollment);
      } else if (method === 'card' && enrollment.card) {
        if (enrollment.card.cardNumber === data.cardNumber) {
          score = 1.0;
        }
      }

      if (score > bestScore && score >= device.config.identificationThreshold) {
        bestScore = score;
        bestMatch = enrollment;
      }
    }

    if (bestMatch) {
      await this.logVerification(
        firmId,
        deviceId,
        bestMatch.employeeId._id,
        method,
        true,
        'Identification successful',
        location,
        bestScore,
        device.config.identificationThreshold
      );

      return {
        success: true,
        employeeId: bestMatch.employeeId._id,
        employee: bestMatch.employeeId,
        score: bestScore,
        message: 'Employee identified successfully'
      };
    }

    await this.logVerification(
      firmId,
      deviceId,
      null,
      method,
      false,
      'No matching employee found',
      location
    );

    return {
      success: false,
      message: 'No matching employee found'
    };
  }

  /**
   * Verify fingerprint (stub - implement with actual SDK)
   */
  static async verifyFingerprint(enrollment, fingerprintData, device) {
    // TODO: Implement actual fingerprint verification using SDK
    // For now, simulate verification

    if (!enrollment.fingerprints || enrollment.fingerprints.length === 0) {
      return { success: false, message: 'No fingerprint templates enrolled', score: 0 };
    }

    // Simulate matching score
    const score = Math.random() * 0.4 + 0.6; // Random score between 0.6 and 1.0

    if (score >= device.config.verificationThreshold) {
      return { success: true, message: 'Fingerprint verified', score };
    } else {
      return { success: false, message: 'Fingerprint verification failed', score };
    }
  }

  /**
   * Verify facial recognition (stub - implement with actual SDK)
   */
  static async verifyFacial(enrollment, facialData, device) {
    // TODO: Implement actual facial recognition using SDK

    if (!enrollment.facial) {
      return { success: false, message: 'No facial template enrolled', score: 0 };
    }

    // Simulate matching score
    const score = Math.random() * 0.3 + 0.7; // Random score between 0.7 and 1.0

    // Check anti-spoofing
    const livenessScore = Math.random() * 0.2 + 0.8; // Random liveness score

    if (livenessScore < 0.7) {
      await this.logSpoofingAttempt(enrollment.firmId, device._id, enrollment.employeeId._id);
      return { success: false, message: 'Liveness check failed - possible spoofing', score };
    }

    if (score >= device.config.verificationThreshold) {
      return { success: true, message: 'Face verified', score, livenessScore };
    } else {
      return { success: false, message: 'Face verification failed', score };
    }
  }

  /**
   * Verify card/badge
   */
  static async verifyCard(enrollment, cardData) {
    if (!enrollment.card || !enrollment.card.isActive) {
      return { success: false, message: 'No active card assigned', score: 0 };
    }

    if (enrollment.card.cardNumber === cardData.cardNumber) {
      return { success: true, message: 'Card verified', score: 1.0 };
    } else {
      return { success: false, message: 'Card verification failed', score: 0 };
    }
  }

  /**
   * Verify PIN
   */
  static async verifyPIN(enrollment, pinData) {
    if (!enrollment.pin || !enrollment.pin.hash) {
      return { success: false, message: 'No PIN set', score: 0 };
    }

    // Check if locked
    if (enrollment.pin.lockedUntil && enrollment.pin.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((enrollment.pin.lockedUntil - new Date()) / 60000);
      return {
        success: false,
        message: `PIN locked. Try again in ${remainingMinutes} minutes`,
        score: 0
      };
    }

    // Hash provided PIN
    const hash = crypto.createHash('sha256').update(pinData.pin).digest('hex');

    if (hash === enrollment.pin.hash) {
      await enrollment.resetPINAttempts();
      return { success: true, message: 'PIN verified', score: 1.0 };
    } else {
      await enrollment.recordFailedPIN();
      return {
        success: false,
        message: `Invalid PIN. ${5 - (enrollment.pin.failedAttempts || 0)} attempts remaining`,
        score: 0
      };
    }
  }

  /**
   * Multi-modal verification (combine multiple methods)
   */
  static async verifyMultiModal(enrollment, data, device) {
    const results = [];
    let totalScore = 0;
    let methodCount = 0;

    // Try each available method
    if (data.fingerprint && enrollment.fingerprints.length > 0) {
      const result = await this.verifyFingerprint(enrollment, data.fingerprint, device);
      results.push({ method: 'fingerprint', ...result });
      totalScore += result.score;
      methodCount++;
    }

    if (data.facial && enrollment.facial) {
      const result = await this.verifyFacial(enrollment, data.facial, device);
      results.push({ method: 'facial', ...result });
      totalScore += result.score;
      methodCount++;
    }

    if (data.card && enrollment.card) {
      const result = await this.verifyCard(enrollment, data.card);
      results.push({ method: 'card', ...result });
      totalScore += result.score;
      methodCount++;
    }

    if (methodCount === 0) {
      return { success: false, message: 'No verification methods available', score: 0 };
    }

    const averageScore = totalScore / methodCount;
    const successCount = results.filter(r => r.success).length;

    // Require at least 2 methods to pass or average score above threshold
    if (successCount >= 2 || averageScore >= device.config.verificationThreshold) {
      return {
        success: true,
        message: 'Multi-modal verification successful',
        score: averageScore,
        methods: results
      };
    } else {
      return {
        success: false,
        message: 'Multi-modal verification failed',
        score: averageScore,
        methods: results
      };
    }
  }

  /**
   * Match fingerprint (stub)
   */
  static async matchFingerprint(fingerprintData, enrollment) {
    // TODO: Implement actual fingerprint matching
    return Math.random() * 0.4 + 0.5; // Random score 0.5-0.9
  }

  /**
   * Match facial (stub)
   */
  static async matchFacial(facialData, enrollment) {
    // TODO: Implement actual facial matching
    return Math.random() * 0.3 + 0.6; // Random score 0.6-0.9
  }

  // ═══════════════════════════════════════════════════════════════
  // GEO-FENCING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Validate check-in location against geofence
   */
  static async validateGeofence(firmId, latitude, longitude, accuracy, employeeId, departmentId) {
    // Find zones containing this point
    const zones = await GeofenceZone.findZonesContainingPoint(firmId, latitude, longitude);

    if (zones.length === 0) {
      return {
        allowed: false,
        withinZone: false,
        message: 'Not within any geofence zone'
      };
    }

    // Try each zone
    for (const zone of zones) {
      const validation = zone.validateCheckIn(latitude, longitude, accuracy, employeeId, departmentId);
      if (validation.allowed) {
        return {
          ...validation,
          zone: {
            id: zone._id,
            name: zone.name,
            nameAr: zone.nameAr
          }
        };
      }
    }

    // None of the zones allowed check-in
    return {
      allowed: false,
      withinZone: true,
      message: 'Check-in not allowed in detected zones',
      zones: zones.map(z => z.name)
    };
  }

  /**
   * Check-in with GPS location
   */
  static async checkInWithGPS(firmId, employeeId, locationData) {
    const { latitude, longitude, accuracy, address } = locationData;

    // Get employee
    const employee = await Employee.findOne({ _id: employeeId, firmId });
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Validate geofence
    const geofenceValidation = await this.validateGeofence(
      firmId,
      latitude,
      longitude,
      accuracy,
      employeeId,
      employee.organization?.departmentId
    );

    if (!geofenceValidation.allowed && geofenceValidation.withinZone === false) {
      throw new Error('Check-in location outside all geofence zones');
    }

    // Create attendance record
    const checkInData = {
      source: 'mobile_app',
      deviceType: 'mobile',
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
        address,
        isWithinGeofence: geofenceValidation.withinZone,
        geofenceId: geofenceValidation.zone?.id,
        accuracy
      },
      biometric: {
        method: 'mobile_gps',
        verified: geofenceValidation.allowed
      }
    };

    const record = await AttendanceRecord.checkIn(employeeId, firmId, null, checkInData);

    return {
      success: true,
      attendanceRecord: record,
      geofenceValidation
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // LOGGING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Log verification attempt
   */
  static async logVerification(firmId, deviceId, employeeId, method, success, message, location, score, threshold, verificationTime) {
    const eventType = success ? 'verify_success' : 'verify_fail';

    const log = new BiometricLog({
      firmId,
      deviceId,
      employeeId,
      eventType,
      verificationMethod: method,
      verification: {
        score,
        threshold,
        passed: success,
        verificationTime,
        attempts: 1
      },
      location: location ? {
        coordinates: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        accuracy: location.accuracy,
        address: location.address
      } : undefined,
      timestamp: new Date()
    });

    await log.save();
    return log;
  }

  /**
   * Log spoofing attempt
   */
  static async logSpoofingAttempt(firmId, deviceId, employeeId) {
    const log = new BiometricLog({
      firmId,
      deviceId,
      employeeId,
      eventType: 'spoofing_detected',
      verificationMethod: 'facial',
      verification: {
        antiSpoofingPassed: false,
        passed: false
      },
      timestamp: new Date()
    });

    await log.save();
    return log;
  }

  /**
   * Process unprocessed logs and create/update attendance records
   */
  static async processLogs(firmId) {
    const logs = await BiometricLog.getUnprocessedLogs(firmId);
    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      errors: []
    };

    for (const log of logs) {
      try {
        if (!log.employeeId) {
          continue;
        }

        const date = new Date(log.timestamp);
        date.setHours(0, 0, 0, 0);

        // Get or create attendance record
        let record = await AttendanceRecord.findOne({
          employeeId: log.employeeId._id,
          date,
          firmId
        });

        if (!record) {
          record = await AttendanceRecord.getOrCreateRecord(
            log.employeeId._id,
            date,
            firmId,
            null
          );
        }

        // Update record based on event type
        if (log.eventType === 'check_in' && !record.checkIn?.time) {
          record.checkIn = {
            time: log.timestamp,
            biometric: {
              method: log.verificationMethod,
              deviceId: log.deviceId?.deviceId,
              verified: log.verification?.passed
            },
            location: log.location
          };
          await record.save();
          results.created++;
        } else if (log.eventType === 'check_out' && !record.checkOut?.time) {
          record.checkOut = {
            time: log.timestamp,
            biometric: {
              method: log.verificationMethod,
              deviceId: log.deviceId?.deviceId,
              verified: log.verification?.passed
            },
            location: log.location
          };
          await record.save();
          results.updated++;
        }

        // Mark log as processed
        await log.markProcessed(record._id);
        results.processed++;
      } catch (error) {
        results.errors.push({
          logId: log._id,
          error: error.message
        });
      }
    }

    return results;
  }

  // ═══════════════════════════════════════════════════════════════
  // ZKTeco ADAPTER (STUB)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Connect to ZKTeco device
   */
  static async connectZKTeco(device) {
    // TODO: Implement actual ZKTeco SDK connection
    // This would use the ZKTeco SDK for Node.js
    return {
      success: true,
      message: 'ZKTeco connection stub - implement with actual SDK'
    };
  }

  /**
   * Sync users to ZKTeco device
   */
  static async syncUsersToZKTeco(deviceId, firmId) {
    // TODO: Implement actual user sync to ZKTeco device
    const enrollments = await BiometricEnrollment.getEnrolledEmployees(firmId);

    return {
      success: true,
      synced: enrollments.length,
      message: 'User sync stub - implement with actual SDK'
    };
  }

  /**
   * Pull attendance logs from ZKTeco device
   */
  static async pullZKTecoLogs(deviceId, firmId) {
    // TODO: Implement actual log pulling from ZKTeco device
    return {
      success: true,
      logs: [],
      message: 'Log pull stub - implement with actual SDK'
    };
  }
}

module.exports = BiometricService;
