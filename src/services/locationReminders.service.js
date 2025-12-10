const { Reminder, UserLocation, User } = require('../models');
const mongoose = require('mongoose');

/**
 * Location-Based Reminders Service
 *
 * This service extends the existing Reminder model with location-based triggers.
 * It leverages the GeofenceZone Haversine distance calculations and UserLocation
 * infrastructure to provide "remind when I arrive" and "remind when I leave" functionality.
 *
 * Features:
 * - Create reminders that trigger based on user location
 * - Check user location against pending location reminders
 * - Support arrive/leave/nearby trigger types
 * - Manage user's saved locations
 * - Calculate distances using existing Haversine formula
 */

class LocationRemindersService {
  /**
   * Create a location-based reminder
   *
   * @param {ObjectId} userId - User ID
   * @param {ObjectId} firmId - Firm ID (optional)
   * @param {Object} reminderData - Base reminder data
   * @param {Object} locationTrigger - Location trigger configuration
   * @param {String} locationTrigger.type - Trigger type: 'arrive'|'leave'|'nearby'
   * @param {Object} locationTrigger.location - Location details
   * @param {String} locationTrigger.location.name - Location name
   * @param {String} locationTrigger.location.address - Location address (optional)
   * @param {Number} locationTrigger.location.latitude - Latitude
   * @param {Number} locationTrigger.location.longitude - Longitude
   * @param {Number} locationTrigger.radius - Trigger radius in meters (default: 100)
   * @param {Boolean} locationTrigger.repeatTrigger - Allow repeated triggers (default: false)
   * @param {Number} locationTrigger.cooldownMinutes - Cooldown between triggers (default: 60)
   * @returns {Promise<Object>} Created reminder
   */
  async createLocationReminder(userId, firmId, reminderData, locationTrigger) {
    try {
      // Validate required fields
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!locationTrigger) {
        throw new Error('Location trigger configuration is required');
      }

      const { type, location, radius = 100, repeatTrigger = false, cooldownMinutes = 60 } = locationTrigger;

      // Validate trigger type
      const validTypes = ['arrive', 'leave', 'nearby'];
      if (!type || !validTypes.includes(type)) {
        throw new Error(`Invalid trigger type. Must be one of: ${validTypes.join(', ')}`);
      }

      // Validate location coordinates
      if (!location || !location.latitude || !location.longitude) {
        throw new Error('Location with latitude and longitude is required');
      }

      if (location.latitude < -90 || location.latitude > 90) {
        throw new Error('Invalid latitude. Must be between -90 and 90');
      }

      if (location.longitude < -180 || location.longitude > 180) {
        throw new Error('Invalid longitude. Must be between -180 and 180');
      }

      if (!location.name) {
        throw new Error('Location name is required');
      }

      // Validate radius
      if (radius < 10 || radius > 10000) {
        throw new Error('Radius must be between 10 and 10000 meters');
      }

      // If savedLocationId is provided, validate it exists
      let savedLocationId = null;
      if (location.savedLocationId) {
        const savedLocation = await UserLocation.findById(location.savedLocationId);
        if (!savedLocation || savedLocation.userId.toString() !== userId.toString()) {
          throw new Error('Invalid saved location ID');
        }
        savedLocationId = location.savedLocationId;
      }

      // Prepare reminder data
      const reminderPayload = {
        ...reminderData,
        userId,
        status: 'pending',
        locationTrigger: {
          enabled: true,
          type,
          location: {
            name: location.name,
            address: location.address || '',
            latitude: location.latitude,
            longitude: location.longitude,
            savedLocationId
          },
          radius,
          triggered: false,
          triggeredAt: null,
          lastCheckedAt: null,
          repeatTrigger,
          cooldownMinutes
        }
      };

      // Set a far future date for the reminder if not provided
      // Location-based reminders don't necessarily need a specific time
      if (!reminderPayload.reminderDateTime) {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 10);
        reminderPayload.reminderDateTime = futureDate;
      }

      // Create the reminder
      const reminder = await Reminder.create(reminderPayload);

      // Populate related fields
      await reminder.populate([
        { path: 'relatedCase', select: 'title caseNumber' },
        { path: 'relatedTask', select: 'title dueDate' },
        { path: 'relatedEvent', select: 'title startDateTime' },
        { path: 'clientId', select: 'firstName lastName' },
        { path: 'locationTrigger.location.savedLocationId', select: 'name type address coordinates' }
      ]);

      return {
        success: true,
        message: `Location-based reminder created: "${type}" at "${location.name}"`,
        data: reminder
      };
    } catch (error) {
      throw new Error(`Failed to create location reminder: ${error.message}`);
    }
  }

  /**
   * Check user's current location against pending location reminders
   *
   * @param {ObjectId} userId - User ID
   * @param {ObjectId} firmId - Firm ID (optional, for future multi-tenancy)
   * @param {Object} currentLocation - Current location
   * @param {Number} currentLocation.latitude - Current latitude
   * @param {Number} currentLocation.longitude - Current longitude
   * @param {Number} currentLocation.accuracy - GPS accuracy in meters (optional)
   * @returns {Promise<Array>} Array of triggered reminders
   */
  async checkLocationTriggers(userId, firmId, currentLocation) {
    try {
      // Validate inputs
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!currentLocation || !currentLocation.latitude || !currentLocation.longitude) {
        throw new Error('Current location with latitude and longitude is required');
      }

      const { latitude, longitude, accuracy = 50 } = currentLocation;

      // Validate coordinates
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        throw new Error('Invalid coordinates');
      }

      // Find all pending location-based reminders for the user
      const reminders = await Reminder.find({
        userId,
        status: 'pending',
        'locationTrigger.enabled': true,
        $or: [
          { 'locationTrigger.triggered': false },
          {
            'locationTrigger.repeatTrigger': true,
            'locationTrigger.triggered': true
          }
        ]
      }).populate([
        { path: 'relatedCase', select: 'title caseNumber' },
        { path: 'relatedTask', select: 'title dueDate' },
        { path: 'relatedEvent', select: 'title startDateTime' }
      ]);

      const triggeredReminders = [];
      const now = new Date();

      // Check each reminder
      for (const reminder of reminders) {
        // Check if reminder should trigger based on location
        const shouldTrigger = reminder.checkLocationTrigger(latitude, longitude);

        if (shouldTrigger) {
          // Update the reminder
          reminder.locationTrigger.triggered = true;
          reminder.locationTrigger.triggeredAt = now;
          reminder.locationTrigger.lastCheckedAt = now;

          // Calculate actual distance for logging
          const distance = this.calculateDistance(
            latitude,
            longitude,
            reminder.locationTrigger.location.latitude,
            reminder.locationTrigger.location.longitude
          );

          await reminder.save();

          triggeredReminders.push({
            reminderId: reminder._id,
            reminderIdString: reminder.reminderId,
            title: reminder.title,
            description: reminder.description,
            triggerType: reminder.locationTrigger.type,
            locationName: reminder.locationTrigger.location.name,
            distance: Math.round(distance),
            triggered: true,
            triggeredAt: now,
            accuracy,
            reminder: reminder.toObject()
          });
        } else {
          // Update last checked time even if not triggered
          reminder.locationTrigger.lastCheckedAt = now;
          await reminder.save();
        }
      }

      return {
        success: true,
        message: `Checked ${reminders.length} location reminders, ${triggeredReminders.length} triggered`,
        data: {
          total: reminders.length,
          triggered: triggeredReminders.length,
          reminders: triggeredReminders,
          currentLocation: {
            latitude,
            longitude,
            accuracy,
            checkedAt: now
          }
        }
      };
    } catch (error) {
      throw new Error(`Failed to check location triggers: ${error.message}`);
    }
  }

  /**
   * Get nearby reminders for a specific location
   *
   * @param {ObjectId} userId - User ID
   * @param {ObjectId} firmId - Firm ID (optional)
   * @param {Object} location - Location to check
   * @param {Number} location.latitude - Latitude
   * @param {Number} location.longitude - Longitude
   * @param {Number} radiusMeters - Search radius in meters (default: 500)
   * @returns {Promise<Array>} Reminders within radius
   */
  async getNearbyReminders(userId, firmId, location, radiusMeters = 500) {
    try {
      // Validate inputs
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!location || !location.latitude || !location.longitude) {
        throw new Error('Location with latitude and longitude is required');
      }

      const { latitude, longitude } = location;

      // Validate coordinates
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        throw new Error('Invalid coordinates');
      }

      // Validate radius
      if (radiusMeters < 10 || radiusMeters > 50000) {
        throw new Error('Radius must be between 10 and 50000 meters');
      }

      // Find all pending location-based reminders for the user
      const reminders = await Reminder.find({
        userId,
        status: { $in: ['pending', 'snoozed'] },
        'locationTrigger.enabled': true
      }).populate([
        { path: 'relatedCase', select: 'title caseNumber' },
        { path: 'relatedTask', select: 'title dueDate' },
        { path: 'relatedEvent', select: 'title startDateTime' },
        { path: 'clientId', select: 'firstName lastName' }
      ]);

      // Filter reminders by distance and add distance information
      const nearbyReminders = reminders
        .map(reminder => {
          const distance = this.calculateDistance(
            latitude,
            longitude,
            reminder.locationTrigger.location.latitude,
            reminder.locationTrigger.location.longitude
          );

          return {
            reminder: reminder.toObject(),
            distance: Math.round(distance),
            isWithinTriggerRadius: distance <= reminder.locationTrigger.radius
          };
        })
        .filter(item => item.distance <= radiusMeters)
        .sort((a, b) => a.distance - b.distance);

      return {
        success: true,
        message: `Found ${nearbyReminders.length} reminders within ${radiusMeters}m`,
        data: {
          searchLocation: { latitude, longitude },
          searchRadius: radiusMeters,
          count: nearbyReminders.length,
          reminders: nearbyReminders
        }
      };
    } catch (error) {
      throw new Error(`Failed to get nearby reminders: ${error.message}`);
    }
  }

  /**
   * Save a user location for use in reminders
   *
   * @param {ObjectId} userId - User ID
   * @param {ObjectId} firmId - Firm ID (optional)
   * @param {Object} locationData - Location data
   * @param {String} locationData.name - Location name
   * @param {String} locationData.address - Address (optional)
   * @param {Number} locationData.lat - Latitude
   * @param {Number} locationData.lng - Longitude
   * @param {String} locationData.type - Type: 'home'|'office'|'court'|'client'|'custom'
   * @param {Number} locationData.radius - Default radius in meters (optional, default: 100)
   * @param {Boolean} locationData.isDefault - Set as default location (optional)
   * @returns {Promise<Object>} Created/updated location
   */
  async saveUserLocation(userId, firmId, locationData) {
    try {
      // Validate inputs
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!locationData) {
        throw new Error('Location data is required');
      }

      const { name, address, lat, lng, type = 'custom', radius = 100, isDefault = false } = locationData;

      // Validate required fields
      if (!name) {
        throw new Error('Location name is required');
      }

      if (!lat || !lng) {
        throw new Error('Latitude and longitude are required');
      }

      // Validate coordinates
      if (lat < -90 || lat > 90) {
        throw new Error('Invalid latitude. Must be between -90 and 90');
      }

      if (lng < -180 || lng > 180) {
        throw new Error('Invalid longitude. Must be between -180 and 180');
      }

      // Validate type
      const validTypes = ['home', 'office', 'court', 'client', 'custom'];
      if (!validTypes.includes(type)) {
        throw new Error(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
      }

      // Validate radius
      if (radius < 10 || radius > 10000) {
        throw new Error('Radius must be between 10 and 10000 meters');
      }

      // Create location payload
      const locationPayload = {
        userId,
        firmId: firmId || null,
        name,
        address: address || '',
        type,
        coordinates: {
          latitude: lat,
          longitude: lng
        },
        radius,
        isDefault,
        isActive: true
      };

      // Create the location
      const location = await UserLocation.create(locationPayload);

      return {
        success: true,
        message: `Location "${name}" saved successfully`,
        data: location
      };
    } catch (error) {
      throw new Error(`Failed to save user location: ${error.message}`);
    }
  }

  /**
   * Get all saved locations for a user
   *
   * @param {ObjectId} userId - User ID
   * @param {ObjectId} firmId - Firm ID (optional)
   * @param {Object} options - Query options
   * @param {String} options.type - Filter by type (optional)
   * @param {Boolean} options.activeOnly - Only active locations (default: true)
   * @param {Boolean} options.groupByType - Group results by type (default: false)
   * @returns {Promise<Array>} User's saved locations
   */
  async getUserLocations(userId, firmId, options = {}) {
    try {
      // Validate inputs
      if (!userId) {
        throw new Error('User ID is required');
      }

      const { type, activeOnly = true, groupByType = false } = options;

      // Build query
      const query = {
        userId,
        ...(firmId && { firmId }),
        ...(activeOnly && { isActive: true }),
        ...(type && { type })
      };

      // If groupByType is requested, use the static method
      if (groupByType) {
        const groupedLocations = await UserLocation.getLocationsByType(userId);
        return {
          success: true,
          message: 'Locations retrieved and grouped by type',
          data: groupedLocations
        };
      }

      // Otherwise, return flat list
      const locations = await UserLocation.find(query)
        .sort({ isDefault: -1, visitCount: -1, name: 1 })
        .select('-location -__v')
        .lean();

      // Add reminder count for each location
      const locationsWithStats = await Promise.all(
        locations.map(async (location) => {
          const reminderCount = await Reminder.countDocuments({
            userId,
            'locationTrigger.enabled': true,
            'locationTrigger.location.savedLocationId': location._id,
            status: { $in: ['pending', 'snoozed'] }
          });

          return {
            ...location,
            reminderCount
          };
        })
      );

      return {
        success: true,
        message: `Retrieved ${locationsWithStats.length} saved locations`,
        data: locationsWithStats
      };
    } catch (error) {
      throw new Error(`Failed to get user locations: ${error.message}`);
    }
  }

  /**
   * Update a saved location
   *
   * @param {ObjectId} userId - User ID
   * @param {ObjectId} locationId - Location ID to update
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated location
   */
  async updateUserLocation(userId, locationId, updateData) {
    try {
      // Validate inputs
      if (!userId || !locationId) {
        throw new Error('User ID and Location ID are required');
      }

      // Find the location
      const location = await UserLocation.findOne({
        _id: locationId,
        userId
      });

      if (!location) {
        throw new Error('Location not found or access denied');
      }

      // Update allowed fields
      const allowedFields = ['name', 'nameAr', 'address', 'addressAr', 'type', 'radius', 'isDefault', 'isActive'];

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          location[field] = updateData[field];
        }
      });

      // Update coordinates if provided
      if (updateData.lat !== undefined && updateData.lng !== undefined) {
        location.coordinates = {
          latitude: updateData.lat,
          longitude: updateData.lng
        };
      }

      await location.save();

      return {
        success: true,
        message: 'Location updated successfully',
        data: location
      };
    } catch (error) {
      throw new Error(`Failed to update location: ${error.message}`);
    }
  }

  /**
   * Delete a saved location
   *
   * @param {ObjectId} userId - User ID
   * @param {ObjectId} locationId - Location ID to delete
   * @returns {Promise<Object>} Deletion result
   */
  async deleteUserLocation(userId, locationId) {
    try {
      // Validate inputs
      if (!userId || !locationId) {
        throw new Error('User ID and Location ID are required');
      }

      // Find the location
      const location = await UserLocation.findOne({
        _id: locationId,
        userId
      });

      if (!location) {
        throw new Error('Location not found or access denied');
      }

      // Check if any active reminders are using this location
      const activeReminders = await Reminder.countDocuments({
        userId,
        'locationTrigger.enabled': true,
        'locationTrigger.location.savedLocationId': locationId,
        status: { $in: ['pending', 'snoozed'] }
      });

      if (activeReminders > 0) {
        // Soft delete - just deactivate
        location.isActive = false;
        await location.save();

        return {
          success: true,
          message: `Location deactivated (${activeReminders} active reminders still reference it)`,
          data: {
            locationId,
            deactivated: true,
            activeReminderCount: activeReminders
          }
        };
      }

      // Hard delete if no active reminders
      await UserLocation.findByIdAndDelete(locationId);

      return {
        success: true,
        message: 'Location deleted successfully',
        data: {
          locationId,
          deleted: true
        }
      };
    } catch (error) {
      throw new Error(`Failed to delete location: ${error.message}`);
    }
  }

  /**
   * Get location-based reminders summary for a user
   *
   * @param {ObjectId} userId - User ID
   * @param {ObjectId} firmId - Firm ID (optional)
   * @returns {Promise<Object>} Summary statistics
   */
  async getLocationRemindersSummary(userId, firmId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Get counts by trigger type
      const summary = await Reminder.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            'locationTrigger.enabled': true,
            status: { $in: ['pending', 'snoozed'] }
          }
        },
        {
          $group: {
            _id: '$locationTrigger.type',
            count: { $sum: 1 },
            triggered: {
              $sum: { $cond: ['$locationTrigger.triggered', 1, 0] }
            },
            pending: {
              $sum: { $cond: ['$locationTrigger.triggered', 0, 1] }
            }
          }
        }
      ]);

      // Get total counts
      const totalLocationReminders = await Reminder.countDocuments({
        userId,
        'locationTrigger.enabled': true,
        status: { $in: ['pending', 'snoozed'] }
      });

      const totalSavedLocations = await UserLocation.countDocuments({
        userId,
        isActive: true
      });

      // Format summary
      const summaryByType = {};
      summary.forEach(item => {
        summaryByType[item._id] = {
          total: item.count,
          triggered: item.triggered,
          pending: item.pending
        };
      });

      return {
        success: true,
        data: {
          totalLocationReminders,
          totalSavedLocations,
          byTriggerType: summaryByType,
          types: {
            arrive: summaryByType.arrive || { total: 0, triggered: 0, pending: 0 },
            leave: summaryByType.leave || { total: 0, triggered: 0, pending: 0 },
            nearby: summaryByType.nearby || { total: 0, triggered: 0, pending: 0 }
          }
        }
      };
    } catch (error) {
      throw new Error(`Failed to get location reminders summary: ${error.message}`);
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   * (Uses same implementation as GeofenceZone model)
   *
   * @param {Number} lat1 - Latitude of point 1
   * @param {Number} lng1 - Longitude of point 1
   * @param {Number} lat2 - Latitude of point 2
   * @param {Number} lng2 - Longitude of point 2
   * @returns {Number} Distance in meters
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Batch check locations for multiple users (useful for background jobs)
   *
   * @param {Array} userLocationPairs - Array of {userId, location} objects
   * @returns {Promise<Array>} Results for each user
   */
  async batchCheckLocationTriggers(userLocationPairs) {
    try {
      if (!Array.isArray(userLocationPairs) || userLocationPairs.length === 0) {
        throw new Error('User location pairs array is required');
      }

      const results = [];

      for (const pair of userLocationPairs) {
        try {
          const result = await this.checkLocationTriggers(
            pair.userId,
            pair.firmId || null,
            pair.location
          );
          results.push({
            userId: pair.userId,
            success: true,
            ...result
          });
        } catch (error) {
          results.push({
            userId: pair.userId,
            success: false,
            error: error.message
          });
        }
      }

      return {
        success: true,
        message: `Batch processed ${results.length} users`,
        data: {
          total: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          results
        }
      };
    } catch (error) {
      throw new Error(`Batch check failed: ${error.message}`);
    }
  }

  /**
   * Reset a triggered location reminder (for testing or manual reset)
   *
   * @param {ObjectId} userId - User ID
   * @param {ObjectId} reminderId - Reminder ID
   * @returns {Promise<Object>} Reset result
   */
  async resetLocationTrigger(userId, reminderId) {
    try {
      if (!userId || !reminderId) {
        throw new Error('User ID and Reminder ID are required');
      }

      const reminder = await Reminder.findOne({
        _id: reminderId,
        userId
      });

      if (!reminder) {
        throw new Error('Reminder not found or access denied');
      }

      if (!reminder.locationTrigger?.enabled) {
        throw new Error('This is not a location-based reminder');
      }

      // Reset trigger state
      reminder.locationTrigger.triggered = false;
      reminder.locationTrigger.triggeredAt = null;
      await reminder.save();

      return {
        success: true,
        message: 'Location trigger reset successfully',
        data: reminder
      };
    } catch (error) {
      throw new Error(`Failed to reset location trigger: ${error.message}`);
    }
  }
}

// Export singleton instance
module.exports = new LocationRemindersService();
