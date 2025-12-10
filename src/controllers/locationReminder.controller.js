const locationRemindersService = require('../services/locationReminders.service');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Create a location-based reminder
 * POST /api/reminders/location
 */
const createLocationReminder = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    priority = 'medium',
    type = 'general',
    relatedCase,
    relatedTask,
    relatedEvent,
    relatedInvoice,
    clientId,
    notification,
    tags,
    notes,
    locationTrigger
  } = req.body;

  const userId = req.userID;
  const firmId = req.firmID || null;

  // Validate required fields
  if (!title) {
    throw CustomException('Title is required', 400);
  }

  if (!locationTrigger) {
    throw CustomException('Location trigger configuration is required', 400);
  }

  // Prepare reminder data
  const reminderData = {
    title,
    description,
    priority,
    type,
    relatedCase,
    relatedTask,
    relatedEvent,
    relatedInvoice,
    clientId,
    notification: notification || { channels: ['push'] },
    tags: tags || [],
    notes
  };

  // Create location-based reminder
  const result = await locationRemindersService.createLocationReminder(
    userId,
    firmId,
    reminderData,
    locationTrigger
  );

  res.status(201).json(result);
});

/**
 * Check current location against pending location reminders
 * POST /api/reminders/location/check
 */
const checkLocationTriggers = asyncHandler(async (req, res) => {
  const { latitude, longitude, accuracy } = req.body;

  const userId = req.userID;
  const firmId = req.firmID || null;

  // Validate required fields
  if (!latitude || !longitude) {
    throw CustomException('Latitude and longitude are required', 400);
  }

  const currentLocation = {
    latitude,
    longitude,
    accuracy: accuracy || 50
  };

  const result = await locationRemindersService.checkLocationTriggers(
    userId,
    firmId,
    currentLocation
  );

  res.status(200).json(result);
});

/**
 * Get nearby reminders for a location
 * POST /api/reminders/location/nearby
 */
const getNearbyReminders = asyncHandler(async (req, res) => {
  const { latitude, longitude, radius = 500 } = req.body;

  const userId = req.userID;
  const firmId = req.firmID || null;

  // Validate required fields
  if (!latitude || !longitude) {
    throw CustomException('Latitude and longitude are required', 400);
  }

  const location = { latitude, longitude };

  const result = await locationRemindersService.getNearbyReminders(
    userId,
    firmId,
    location,
    radius
  );

  res.status(200).json(result);
});

/**
 * Save a user location
 * POST /api/reminders/location/save
 */
const saveUserLocation = asyncHandler(async (req, res) => {
  const {
    name,
    address,
    lat,
    lng,
    type = 'custom',
    radius = 100,
    isDefault = false
  } = req.body;

  const userId = req.userID;
  const firmId = req.firmID || null;

  // Validate required fields
  if (!name) {
    throw CustomException('Location name is required', 400);
  }

  if (!lat || !lng) {
    throw CustomException('Latitude and longitude are required', 400);
  }

  const locationData = {
    name,
    address,
    lat,
    lng,
    type,
    radius,
    isDefault
  };

  const result = await locationRemindersService.saveUserLocation(
    userId,
    firmId,
    locationData
  );

  res.status(201).json(result);
});

/**
 * Get user's saved locations
 * GET /api/reminders/location/locations
 */
const getUserLocations = asyncHandler(async (req, res) => {
  const { type, activeOnly = 'true', groupByType = 'false' } = req.query;

  const userId = req.userID;
  const firmId = req.firmID || null;

  const options = {
    type,
    activeOnly: activeOnly === 'true',
    groupByType: groupByType === 'true'
  };

  const result = await locationRemindersService.getUserLocations(
    userId,
    firmId,
    options
  );

  res.status(200).json(result);
});

/**
 * Update a saved location
 * PUT /api/reminders/location/locations/:locationId
 */
const updateUserLocation = asyncHandler(async (req, res) => {
  const { locationId } = req.params;
  const updateData = req.body;

  const userId = req.userID;

  if (!locationId) {
    throw CustomException('Location ID is required', 400);
  }

  const result = await locationRemindersService.updateUserLocation(
    userId,
    locationId,
    updateData
  );

  res.status(200).json(result);
});

/**
 * Delete a saved location
 * DELETE /api/reminders/location/locations/:locationId
 */
const deleteUserLocation = asyncHandler(async (req, res) => {
  const { locationId } = req.params;
  const userId = req.userID;

  if (!locationId) {
    throw CustomException('Location ID is required', 400);
  }

  const result = await locationRemindersService.deleteUserLocation(
    userId,
    locationId
  );

  res.status(200).json(result);
});

/**
 * Get location reminders summary
 * GET /api/reminders/location/summary
 */
const getLocationRemindersSummary = asyncHandler(async (req, res) => {
  const userId = req.userID;
  const firmId = req.firmID || null;

  const result = await locationRemindersService.getLocationRemindersSummary(
    userId,
    firmId
  );

  res.status(200).json(result);
});

/**
 * Reset a location trigger
 * POST /api/reminders/location/:reminderId/reset
 */
const resetLocationTrigger = asyncHandler(async (req, res) => {
  const { reminderId } = req.params;
  const userId = req.userID;

  if (!reminderId) {
    throw CustomException('Reminder ID is required', 400);
  }

  const result = await locationRemindersService.resetLocationTrigger(
    userId,
    reminderId
  );

  res.status(200).json(result);
});

/**
 * Calculate distance between two points
 * POST /api/reminders/location/distance
 */
const calculateDistance = asyncHandler(async (req, res) => {
  const { lat1, lng1, lat2, lng2 } = req.body;

  // Validate required fields
  if (!lat1 || !lng1 || !lat2 || !lng2) {
    throw CustomException('All coordinates (lat1, lng1, lat2, lng2) are required', 400);
  }

  const distance = locationRemindersService.calculateDistance(
    lat1,
    lng1,
    lat2,
    lng2
  );

  res.status(200).json({
    success: true,
    data: {
      distance: Math.round(distance),
      distanceKm: (distance / 1000).toFixed(2),
      point1: { latitude: lat1, longitude: lng1 },
      point2: { latitude: lat2, longitude: lng2 }
    }
  });
});

module.exports = {
  createLocationReminder,
  checkLocationTriggers,
  getNearbyReminders,
  saveUserLocation,
  getUserLocations,
  updateUserLocation,
  deleteUserLocation,
  getLocationRemindersSummary,
  resetLocationTrigger,
  calculateDistance
};
