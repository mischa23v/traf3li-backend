const mongoose = require('mongoose');

const biometricDeviceSchema = new mongoose.Schema({
  firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', index: true },
  deviceId: { type: String, unique: true },
  deviceName: { type: String },
  deviceType: {
    type: String,
    enum: ['fingerprint', 'facial', 'card_reader', 'iris', 'palm', 'multi_modal']
  },
  manufacturer: { type: String, enum: ['zkteco', 'suprema', 'hikvision', 'dahua', 'generic'] },
  model: String,
  serialNumber: String,

  // Connection Settings
  connection: {
    type: { type: String, enum: ['tcp', 'usb', 'api', 'cloud'], default: 'tcp' },
    ipAddress: String,
    port: { type: Number, default: 4370 },
    apiEndpoint: String,
    apiKey: String,
    username: String,
    password: String
  },

  // Location for geo-fencing
  location: {
    name: String,
    address: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    geofenceRadius: { type: Number, default: 100 }, // meters
    timezone: { type: String, default: 'Asia/Riyadh' }
  },

  // Status
  status: { type: String, enum: ['online', 'offline', 'maintenance', 'error'], default: 'offline' },
  lastHeartbeat: Date,
  lastSyncAt: Date,
  errorMessage: String,

  // Capabilities
  capabilities: {
    fingerprint: { type: Boolean, default: false },
    facial: { type: Boolean, default: false },
    card: { type: Boolean, default: false },
    pin: { type: Boolean, default: false },
    antiSpoofing: { type: Boolean, default: true },
    liveness: { type: Boolean, default: true },
    capacity: { type: Number, default: 3000 }
  },

  // Configuration
  config: {
    verificationThreshold: { type: Number, default: 0.7, min: 0, max: 1 },
    identificationThreshold: { type: Number, default: 0.8, min: 0, max: 1 },
    allowFallback: { type: Boolean, default: true },
    requirePhoto: { type: Boolean, default: true },
    maxRetries: { type: Number, default: 3 },
    timeoutSeconds: { type: Number, default: 30 },
    workingHours: {
      start: { type: String, default: '06:00' },
      end: { type: String, default: '22:00' }
    }
  },

  // Statistics
  stats: {
    enrolledUsers: { type: Number, default: 0 },
    totalVerifications: { type: Number, default: 0 },
    successfulVerifications: { type: Number, default: 0 },
    failedVerifications: { type: Number, default: 0 },
    averageVerificationTime: { type: Number, default: 0 }
  },

  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

biometricDeviceSchema.index({ firmId: 1, deviceId: 1 }, { unique: true });
biometricDeviceSchema.index({ firmId: 1, status: 1 });
biometricDeviceSchema.index({ 'location.coordinates': '2dsphere' });

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Update device heartbeat
biometricDeviceSchema.methods.updateHeartbeat = function() {
  this.lastHeartbeat = new Date();
  this.status = 'online';
  this.errorMessage = null;
  return this.save();
};

// Record verification attempt
biometricDeviceSchema.methods.recordVerification = function(success, verificationTime) {
  this.stats.totalVerifications += 1;
  if (success) {
    this.stats.successfulVerifications += 1;
  } else {
    this.stats.failedVerifications += 1;
  }

  // Update average verification time
  const total = this.stats.totalVerifications;
  const currentAvg = this.stats.averageVerificationTime || 0;
  this.stats.averageVerificationTime = ((currentAvg * (total - 1)) + verificationTime) / total;

  return this.save();
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get online devices
biometricDeviceSchema.statics.getOnlineDevices = function(firmId) {
  return this.find({ firmId, status: 'online', isActive: true });
};

// Find nearest device to coordinates
biometricDeviceSchema.statics.findNearestDevice = function(firmId, latitude, longitude, maxDistance = 1000) {
  return this.findOne({
    firmId,
    isActive: true,
    status: { $in: ['online', 'offline'] },
    'location.coordinates.latitude': { $exists: true },
    'location.coordinates.longitude': { $exists: true }
  }).sort({
    // Simple distance calculation (for more accuracy, use geospatial queries)
    $expr: {
      $add: [
        { $pow: [{ $subtract: ['$location.coordinates.latitude', latitude] }, 2] },
        { $pow: [{ $subtract: ['$location.coordinates.longitude', longitude] }, 2] }
      ]
    }
  }).limit(1);
};

module.exports = mongoose.model('BiometricDevice', biometricDeviceSchema);
