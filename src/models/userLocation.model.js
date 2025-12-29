const mongoose = require('mongoose');

const userLocationSchema = new mongoose.Schema({
  // User and firm association
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  firmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Firm',
    index: true,
    required: false
   },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
  // Location names
  name: {
    type: String,
    required: true,
    trim: true
  },
  nameAr: {
    type: String,
    trim: true,
    required: false
  },

  // Location type
  type: {
    type: String,
    enum: ['home', 'office', 'court', 'client', 'custom'],
    required: true,
    default: 'custom'
  },

  // Address information
  address: {
    type: String,
    trim: true,
    required: false
  },
  addressAr: {
    type: String,
    trim: true,
    required: false
  },

  // Geospatial coordinates
  coordinates: {
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    }
  },

  // GeoJSON Point for MongoDB geospatial queries
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude] - GeoJSON format
      required: true
    }
  },

  // Proximity detection radius in meters
  radius: {
    type: Number,
    default: 100,
    min: 10,
    max: 10000 // Max 10km radius
  },

  // Default location flag
  isDefault: {
    type: Boolean,
    default: false
  },

  // Usage tracking
  lastVisited: {
    type: Date,
    required: false
  },
  visitCount: {
    type: Number,
    default: 0,
    min: 0
  },

  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },

  // Active status
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

// Compound index for user-specific queries
userLocationSchema.index({ userId: 1, isActive: 1 });

// Compound index for firm-specific queries
userLocationSchema.index({ firmId: 1, isActive: 1 });

// Geospatial index for proximity queries (2dsphere for accurate distance calculations)
userLocationSchema.index({ location: '2dsphere' });

// Compound index for default location lookups
userLocationSchema.index({ userId: 1, isDefault: 1 });

// Index for sorting by visit count
userLocationSchema.index({ userId: 1, visitCount: -1 });

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

// Pre-save hook to set GeoJSON location from coordinates
userLocationSchema.pre('save', function(next) {
  if (this.coordinates && this.coordinates.latitude && this.coordinates.longitude) {
    // GeoJSON uses [longitude, latitude] order
    this.location = {
      type: 'Point',
      coordinates: [this.coordinates.longitude, this.coordinates.latitude]
    };
  }
  next();
});

// Pre-save hook to ensure only one default location per user
userLocationSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    // Unset other default locations for this user
    await this.constructor.updateMany(
      {
        userId: this.userId,
        _id: { $ne: this._id },
        isDefault: true
      },
      {
        $set: { isDefault: false }
      }
    );
  }
  next();
});

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Calculate distance to a given point (in meters)
userLocationSchema.methods.distanceTo = function(latitude, longitude) {
  return calculateDistance(
    this.coordinates.latitude,
    this.coordinates.longitude,
    latitude,
    longitude
  );
};

// Check if a given point is within this location's radius
userLocationSchema.methods.isNearby = function(latitude, longitude) {
  const distance = this.distanceTo(latitude, longitude);
  return distance <= this.radius;
};

// Record a visit to this location
userLocationSchema.methods.recordVisit = function() {
  this.lastVisited = new Date();
  this.visitCount += 1;
  return this.save();
};

// Get location details for display
userLocationSchema.methods.getDisplayInfo = function() {
  return {
    id: this._id,
    name: this.name,
    nameAr: this.nameAr,
    type: this.type,
    address: this.address,
    addressAr: this.addressAr,
    coordinates: this.coordinates,
    radius: this.radius,
    isDefault: this.isDefault,
    visitCount: this.visitCount,
    lastVisited: this.lastVisited
  };
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Find locations near a specific point
 * @param {ObjectId} userId - User ID
 * @param {Number} latitude - Latitude of the point
 * @param {Number} longitude - Longitude of the point
 * @param {Number} radiusMeters - Search radius in meters (default: 1000)
 * @returns {Promise<Array>} Array of nearby locations with distances
 */
userLocationSchema.statics.findNearby = async function(userId, latitude, longitude, radiusMeters = 1000) {
  try {
    // Validate inputs
    if (!userId) {
      throw new Error('User ID is required');
    }
    if (!latitude || !longitude) {
      throw new Error('Latitude and longitude are required');
    }
    if (latitude < -90 || latitude > 90) {
      throw new Error('Invalid latitude value');
    }
    if (longitude < -180 || longitude > 180) {
      throw new Error('Invalid longitude value');
    }

    // Use MongoDB geospatial query with $near
    const locations = await this.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [longitude, latitude] // GeoJSON order: [lng, lat]
          },
          distanceField: 'distance',
          maxDistance: radiusMeters,
          query: {
            userId: new mongoose.Types.ObjectId(userId),
            isActive: true
          },
          spherical: true // Use spherical geometry for accurate Earth calculations
        }
      },
      {
        $sort: { distance: 1 }
      },
      {
        $project: {
          name: 1,
          nameAr: 1,
          type: 1,
          address: 1,
          addressAr: 1,
          coordinates: 1,
          radius: 1,
          isDefault: 1,
          visitCount: 1,
          lastVisited: 1,
          distance: 1,
          metadata: 1,
          createdAt: 1,
          updatedAt: 1
        }
      }
    ]);

    return locations;
  } catch (error) {
    throw new Error(`Error finding nearby locations: ${error.message}`);
  }
};

/**
 * Get most visited locations for a user
 * @param {ObjectId} userId - User ID
 * @param {Number} limit - Maximum number of locations to return (default: 10)
 * @returns {Promise<Array>} Array of most visited locations
 */
userLocationSchema.statics.getMostVisited = async function(userId, limit = 10) {
  try {
    // Validate inputs
    if (!userId) {
      throw new Error('User ID is required');
    }

    const locations = await this.find({
      userId,
      isActive: true,
      visitCount: { $gt: 0 } // Only include locations that have been visited
    })
      .sort({ visitCount: -1, lastVisited: -1 }) // Sort by visit count, then by most recent
      .limit(limit)
      .select('-location -__v') // Exclude internal fields
      .lean();

    return locations;
  } catch (error) {
    throw new Error(`Error getting most visited locations: ${error.message}`);
  }
};

/**
 * Get user's default location
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object|null>} Default location or null
 */
userLocationSchema.statics.getDefaultLocation = async function(userId) {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const location = await this.findOne({
      userId,
      isDefault: true,
      isActive: true
    }).lean();

    return location;
  } catch (error) {
    throw new Error(`Error getting default location: ${error.message}`);
  }
};

/**
 * Get all locations for a user grouped by type
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} Locations grouped by type
 */
userLocationSchema.statics.getLocationsByType = async function(userId) {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const locations = await this.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          isActive: true
        }
      },
      {
        $group: {
          _id: '$type',
          locations: {
            $push: {
              id: '$_id',
              name: '$name',
              nameAr: '$nameAr',
              address: '$address',
              addressAr: '$addressAr',
              coordinates: '$coordinates',
              radius: '$radius',
              isDefault: '$isDefault',
              visitCount: '$visitCount',
              lastVisited: '$lastVisited'
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Convert array to object with type as key
    const groupedLocations = {};
    locations.forEach(item => {
      groupedLocations[item._id] = {
        count: item.count,
        locations: item.locations
      };
    });

    return groupedLocations;
  } catch (error) {
    throw new Error(`Error getting locations by type: ${error.message}`);
  }
};

/**
 * Check if user is currently near any of their saved locations
 * @param {ObjectId} userId - User ID
 * @param {Number} latitude - Current latitude
 * @param {Number} longitude - Current longitude
 * @returns {Promise<Array>} Array of locations user is currently near
 */
userLocationSchema.statics.checkProximity = async function(userId, latitude, longitude) {
  try {
    if (!userId || !latitude || !longitude) {
      throw new Error('User ID, latitude, and longitude are required');
    }

    // Get all active locations for user
    const locations = await this.find({
      userId,
      isActive: true
    }).lean();

    // Check which locations are within their defined radius
    const nearbyLocations = locations.filter(location => {
      const distance = calculateDistance(
        location.coordinates.latitude,
        location.coordinates.longitude,
        latitude,
        longitude
      );
      return distance <= location.radius;
    }).map(location => ({
      ...location,
      distance: calculateDistance(
        location.coordinates.latitude,
        location.coordinates.longitude,
        latitude,
        longitude
      )
    })).sort((a, b) => a.distance - b.distance);

    return nearbyLocations;
  } catch (error) {
    throw new Error(`Error checking proximity: ${error.message}`);
  }
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate distance between two points using Haversine formula
 * @param {Number} lat1 - Latitude of point 1
 * @param {Number} lon1 - Longitude of point 1
 * @param {Number} lat2 - Latitude of point 2
 * @param {Number} lon2 - Longitude of point 2
 * @returns {Number} Distance in meters
 */
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

module.exports = mongoose.model('UserLocation', userLocationSchema);
