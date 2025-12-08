const mongoose = require('mongoose');

const biometricEnrollmentSchema = new mongoose.Schema({
  firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },

  status: {
    type: String,
    enum: ['pending', 'enrolled', 'failed', 'expired', 'revoked'],
    default: 'pending'
  },
  enrolledAt: Date,
  expiresAt: Date,

  // Fingerprint Templates (encrypted)
  fingerprints: [{
    finger: { type: String, enum: ['thumb_r', 'index_r', 'middle_r', 'ring_r', 'pinky_r', 'thumb_l', 'index_l', 'middle_l', 'ring_l', 'pinky_l'] },
    template: Buffer,
    quality: Number,
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'BiometricDevice' },
    enrolledAt: Date
  }],

  // Facial Template
  facial: {
    template: Buffer,
    photo: String, // S3 URL
    quality: Number,
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'BiometricDevice' },
    enrolledAt: Date,
    antiSpoofingPassed: Boolean
  },

  // Card/Badge
  card: {
    cardNumber: String,
    cardType: { type: String, enum: ['rfid', 'nfc', 'magnetic', 'smartcard'] },
    facilityCode: String,
    issuedAt: Date,
    expiresAt: Date,
    isActive: { type: Boolean, default: true }
  },

  // PIN
  pin: {
    hash: String,
    issuedAt: Date,
    lastChangedAt: Date,
    failedAttempts: { type: Number, default: 0 },
    lockedUntil: Date
  },

  // Devices where enrolled
  enrolledDevices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BiometricDevice' }],

  // Audit
  enrolledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  revokedAt: Date,
  revokeReason: String,
  notes: String
}, { timestamps: true });

biometricEnrollmentSchema.index({ firmId: 1, employeeId: 1 }, { unique: true });
biometricEnrollmentSchema.index({ firmId: 1, status: 1 });
biometricEnrollmentSchema.index({ 'card.cardNumber': 1 });

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Complete enrollment
biometricEnrollmentSchema.methods.completeEnrollment = function() {
  this.status = 'enrolled';
  this.enrolledAt = new Date();
  // Set expiration to 1 year from now
  this.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  return this.save();
};

// Revoke enrollment
biometricEnrollmentSchema.methods.revoke = function(userId, reason) {
  this.status = 'revoked';
  this.revokedBy = userId;
  this.revokedAt = new Date();
  this.revokeReason = reason;
  return this.save();
};

// Check if enrollment is active
biometricEnrollmentSchema.methods.isActive = function() {
  if (this.status !== 'enrolled') return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  return true;
};

// Add fingerprint
biometricEnrollmentSchema.methods.addFingerprint = function(finger, template, quality, deviceId) {
  this.fingerprints.push({
    finger,
    template,
    quality,
    deviceId,
    enrolledAt: new Date()
  });
  return this.save();
};

// Record failed PIN attempt
biometricEnrollmentSchema.methods.recordFailedPIN = function() {
  if (!this.pin) this.pin = {};
  this.pin.failedAttempts = (this.pin.failedAttempts || 0) + 1;

  // Lock after 5 failed attempts for 30 minutes
  if (this.pin.failedAttempts >= 5) {
    this.pin.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
  }

  return this.save();
};

// Reset PIN attempts
biometricEnrollmentSchema.methods.resetPINAttempts = function() {
  if (this.pin) {
    this.pin.failedAttempts = 0;
    this.pin.lockedUntil = null;
  }
  return this.save();
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Find by employee
biometricEnrollmentSchema.statics.findByEmployee = function(firmId, employeeId) {
  return this.findOne({ firmId, employeeId })
    .populate('employeeId', 'personalInfo.fullNameArabic personalInfo.fullNameEnglish employeeId')
    .populate('enrolledDevices', 'deviceName deviceType status');
};

// Get all enrolled employees
biometricEnrollmentSchema.statics.getEnrolledEmployees = function(firmId) {
  return this.find({ firmId, status: 'enrolled' })
    .populate('employeeId', 'personalInfo.fullNameArabic personalInfo.fullNameEnglish employeeId')
    .sort({ enrolledAt: -1 });
};

// Find by card number
biometricEnrollmentSchema.statics.findByCard = function(cardNumber) {
  return this.findOne({
    'card.cardNumber': cardNumber,
    'card.isActive': true,
    status: 'enrolled'
  }).populate('employeeId');
};

// Get enrollment statistics
biometricEnrollmentSchema.statics.getStats = async function(firmId) {
  const stats = await this.aggregate([
    { $match: { firmId: mongoose.Types.ObjectId(firmId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = {
    total: 0,
    enrolled: 0,
    pending: 0,
    failed: 0,
    expired: 0,
    revoked: 0
  };

  stats.forEach(s => {
    result[s._id] = s.count;
    result.total += s.count;
  });

  return result;
};

module.exports = mongoose.model('BiometricEnrollment', biometricEnrollmentSchema);
