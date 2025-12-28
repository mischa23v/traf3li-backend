const mongoose = require('mongoose');

const geofenceZoneSchema = new mongoose.Schema({
  firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', index: true },,

    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
  name: { type: String },
  nameAr: String,
  description: String,

  type: { type: String, enum: ['circle', 'polygon'], default: 'circle' },

  // For circle type
  center: {
    latitude: { type: Number },
    longitude: { type: Number }
  },
  radius: { type: Number, default: 100 }, // meters

  // For polygon type
  polygon: [{
    latitude: Number,
    longitude: Number
  }],

  // Settings
  settings: {
    allowCheckIn: { type: Boolean, default: true },
    allowCheckOut: { type: Boolean, default: true },
    requirePhoto: { type: Boolean, default: false },
    strictMode: { type: Boolean, default: false }, // Must be exactly within zone
    graceDistance: { type: Number, default: 20 }, // Extra meters allowed
    minAccuracy: { type: Number, default: 50 } // Minimum GPS accuracy required (meters)
  },

  // Restrictions
  restrictions: {
    allowedDays: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] }, // 0=Sunday
    startTime: String, // "08:00"
    endTime: String,   // "18:00"
    allowedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
    allowedDepartments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrganizationalUnit' }]
  },

  // Linked devices
  linkedDevices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BiometricDevice' }],

  // Address
  address: {
    street: String,
    city: String,
    state: String,
    country: { type: String, default: 'Saudi Arabia' },
    postalCode: String
  },

  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

geofenceZoneSchema.index({ firmId: 1, isActive: 1 });
geofenceZoneSchema.index({ center: '2dsphere' });

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Check if coordinates are within geofence
geofenceZoneSchema.methods.isWithinZone = function(latitude, longitude) {
  if (this.type === 'circle') {
    return this.isWithinCircle(latitude, longitude);
  } else if (this.type === 'polygon') {
    return this.isWithinPolygon(latitude, longitude);
  }
  return false;
};

// Calculate distance from center (for circle type)
geofenceZoneSchema.methods.distanceFromCenter = function(latitude, longitude) {
  return calculateDistance(
    this.center.latitude,
    this.center.longitude,
    latitude,
    longitude
  );
};

// Check if point is within circle
geofenceZoneSchema.methods.isWithinCircle = function(latitude, longitude) {
  const distance = this.distanceFromCenter(latitude, longitude);
  const allowedRadius = this.radius + (this.settings.graceDistance || 0);
  return distance <= allowedRadius;
};

// Check if point is within polygon (Ray Casting Algorithm)
geofenceZoneSchema.methods.isWithinPolygon = function(latitude, longitude) {
  if (!this.polygon || this.polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = this.polygon.length - 1; i < this.polygon.length; j = i++) {
    const xi = this.polygon[i].latitude;
    const yi = this.polygon[i].longitude;
    const xj = this.polygon[j].latitude;
    const yj = this.polygon[j].longitude;

    const intersect = ((yi > longitude) !== (yj > longitude)) &&
      (latitude < (xj - xi) * (longitude - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
};

// Check if employee is allowed in this zone
geofenceZoneSchema.methods.isEmployeeAllowed = function(employeeId, departmentId) {
  // If no restrictions, allow all
  if (!this.restrictions.allowedEmployees || this.restrictions.allowedEmployees.length === 0) {
    if (!this.restrictions.allowedDepartments || this.restrictions.allowedDepartments.length === 0) {
      return true;
    }
  }

  // Check employee whitelist
  if (this.restrictions.allowedEmployees && this.restrictions.allowedEmployees.length > 0) {
    const isAllowed = this.restrictions.allowedEmployees.some(
      emp => emp.toString() === employeeId.toString()
    );
    if (isAllowed) return true;
  }

  // Check department whitelist
  if (departmentId && this.restrictions.allowedDepartments && this.restrictions.allowedDepartments.length > 0) {
    const isAllowed = this.restrictions.allowedDepartments.some(
      dept => dept.toString() === departmentId.toString()
    );
    if (isAllowed) return true;
  }

  return false;
};

// Check if current time is within allowed hours
geofenceZoneSchema.methods.isWithinAllowedHours = function() {
  if (!this.restrictions.startTime || !this.restrictions.endTime) {
    return true; // No time restrictions
  }

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return currentTime >= this.restrictions.startTime && currentTime <= this.restrictions.endTime;
};

// Check if current day is allowed
geofenceZoneSchema.methods.isDayAllowed = function() {
  if (!this.restrictions.allowedDays || this.restrictions.allowedDays.length === 0) {
    return true; // No day restrictions
  }

  const today = new Date().getDay(); // 0=Sunday, 6=Saturday
  return this.restrictions.allowedDays.includes(today);
};

// Validate check-in attempt
geofenceZoneSchema.methods.validateCheckIn = function(latitude, longitude, accuracy, employeeId, departmentId) {
  const validation = {
    allowed: false,
    withinZone: false,
    distance: null,
    reasons: []
  };

  // Check if zone is active
  if (!this.isActive) {
    validation.reasons.push('Geofence zone is not active');
    return validation;
  }

  // Check if check-in is allowed
  if (!this.settings.allowCheckIn) {
    validation.reasons.push('Check-in not allowed in this zone');
    return validation;
  }

  // Check GPS accuracy
  if (accuracy > this.settings.minAccuracy) {
    validation.reasons.push(`GPS accuracy too low: ${accuracy}m (required: ${this.settings.minAccuracy}m)`);
    if (this.settings.strictMode) {
      return validation;
    }
  }

  // Check if within zone
  validation.withinZone = this.isWithinZone(latitude, longitude);
  if (this.type === 'circle') {
    validation.distance = this.distanceFromCenter(latitude, longitude);
  }

  if (!validation.withinZone) {
    validation.reasons.push(`Outside geofence zone (distance: ${validation.distance?.toFixed(0)}m)`);
    if (this.settings.strictMode) {
      return validation;
    }
  }

  // Check day restrictions
  if (!this.isDayAllowed()) {
    validation.reasons.push('Check-in not allowed on this day');
    return validation;
  }

  // Check time restrictions
  if (!this.isWithinAllowedHours()) {
    validation.reasons.push('Check-in not allowed at this time');
    return validation;
  }

  // Check employee restrictions
  if (!this.isEmployeeAllowed(employeeId, departmentId)) {
    validation.reasons.push('Employee not authorized for this zone');
    return validation;
  }

  // All checks passed
  validation.allowed = true;
  return validation;
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Find zones containing a point
geofenceZoneSchema.statics.findZonesContainingPoint = function(firmId, latitude, longitude) {
  return this.find({ firmId, isActive: true }).then(zones => {
    return zones.filter(zone => zone.isWithinZone(latitude, longitude));
  });
};

// Get active zones for firm
geofenceZoneSchema.statics.getActiveZones = function(firmId) {
  return this.find({ firmId, isActive: true })
    .populate('linkedDevices', 'deviceName deviceType status')
    .sort({ name: 1 });
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

module.exports = mongoose.model('GeofenceZone', geofenceZoneSchema);
