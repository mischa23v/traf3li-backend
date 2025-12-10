# Location-Based Reminders Service

A comprehensive service for managing location-based reminders in the Traf3li law firm management system. This service extends the existing Reminder model with geospatial functionality, allowing reminders to trigger when users arrive at or leave specific locations.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [Usage Examples](#usage-examples)
- [Integration Guide](#integration-guide)
- [Testing](#testing)

## Overview

The Location-Based Reminders service integrates with:
- **Reminder Model**: Existing reminder infrastructure with `locationTrigger` field
- **UserLocation Model**: User's saved locations with geospatial queries
- **GeofenceZone Model**: Haversine distance calculation for accuracy

## Features

### Core Functionality

1. **Location Trigger Types**
   - `arrive`: Trigger when user enters a location radius
   - `leave`: Trigger when user exits a location radius
   - `nearby`: Trigger when user is near a location

2. **Saved Locations**
   - Store frequently used locations (home, office, court, client sites)
   - Automatic visit tracking and statistics
   - Default location support

3. **Smart Triggering**
   - Cooldown periods to prevent repeated triggers
   - GPS accuracy validation
   - Repeat trigger support for recurring reminders

4. **Distance Calculations**
   - Haversine formula for accurate Earth-surface distances
   - Support for custom radius per reminder (10-10,000 meters)
   - Nearby reminders search within specified radius

## Architecture

### Service Layer
```
locationReminders.service.js
├── createLocationReminder()      - Create location-based reminder
├── checkLocationTriggers()       - Check user location against pending reminders
├── getNearbyReminders()          - Find reminders near a location
├── saveUserLocation()            - Save a location for reuse
├── getUserLocations()            - Get user's saved locations
├── updateUserLocation()          - Update saved location
├── deleteUserLocation()          - Delete saved location
├── getLocationRemindersSummary() - Get statistics
├── resetLocationTrigger()        - Reset triggered reminder
├── calculateDistance()           - Haversine distance calculation
└── batchCheckLocationTriggers()  - Batch process for background jobs
```

### Controller Layer
```
locationReminder.controller.js
├── Express route handlers
├── Request validation
├── Response formatting
└── Error handling
```

### Models
```
Reminder.model.js
└── locationTrigger: {
    enabled: Boolean,
    type: String (arrive|leave|nearby),
    location: {
        name: String,
        address: String,
        latitude: Number,
        longitude: Number,
        savedLocationId: ObjectId
    },
    radius: Number,
    triggered: Boolean,
    triggeredAt: Date,
    lastCheckedAt: Date,
    repeatTrigger: Boolean,
    cooldownMinutes: Number
}

UserLocation.model.js
├── coordinates: { latitude, longitude }
├── location: GeoJSON Point
├── type: home|office|court|client|custom
├── radius: Number
└── Methods:
    ├── distanceTo(lat, lng)
    ├── isNearby(lat, lng)
    └── recordVisit()
```

## API Endpoints

### Create Location-Based Reminder
```http
POST /api/reminders/location
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Pick up documents",
  "description": "Get the signed contract from the client",
  "priority": "high",
  "type": "task_due",
  "locationTrigger": {
    "type": "arrive",
    "location": {
      "name": "Client Office - Acme Corp",
      "address": "123 Business St, Riyadh",
      "latitude": 24.7136,
      "longitude": 46.6753
    },
    "radius": 200,
    "repeatTrigger": false,
    "cooldownMinutes": 60
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Location-based reminder created: \"arrive\" at \"Client Office - Acme Corp\"",
  "data": {
    "_id": "...",
    "reminderId": "REM-202501-0001",
    "title": "Pick up documents",
    "locationTrigger": {
      "enabled": true,
      "type": "arrive",
      "location": {
        "name": "Client Office - Acme Corp",
        "latitude": 24.7136,
        "longitude": 46.6753
      },
      "radius": 200,
      "triggered": false
    }
  }
}
```

### Check Location Triggers
```http
POST /api/reminders/location/check
Authorization: Bearer {token}
Content-Type: application/json

{
  "latitude": 24.7140,
  "longitude": 46.6750,
  "accuracy": 15
}
```

**Response:**
```json
{
  "success": true,
  "message": "Checked 5 location reminders, 2 triggered",
  "data": {
    "total": 5,
    "triggered": 2,
    "reminders": [
      {
        "reminderId": "...",
        "reminderIdString": "REM-202501-0001",
        "title": "Pick up documents",
        "triggerType": "arrive",
        "locationName": "Client Office - Acme Corp",
        "distance": 45,
        "triggered": true,
        "triggeredAt": "2025-01-15T10:30:00.000Z"
      }
    ],
    "currentLocation": {
      "latitude": 24.7140,
      "longitude": 46.6750,
      "accuracy": 15,
      "checkedAt": "2025-01-15T10:30:00.000Z"
    }
  }
}
```

### Save User Location
```http
POST /api/reminders/location/save
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Riyadh Courthouse",
  "address": "King Fahd Road, Riyadh",
  "lat": 24.7136,
  "lng": 46.6753,
  "type": "court",
  "radius": 150,
  "isDefault": false
}
```

### Get User Locations
```http
GET /api/reminders/location/locations?type=court&groupByType=false
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Retrieved 8 saved locations",
  "data": [
    {
      "_id": "...",
      "name": "Riyadh Courthouse",
      "type": "court",
      "coordinates": {
        "latitude": 24.7136,
        "longitude": 46.6753
      },
      "radius": 150,
      "isDefault": false,
      "visitCount": 12,
      "reminderCount": 3,
      "lastVisited": "2025-01-10T14:30:00.000Z"
    }
  ]
}
```

### Get Nearby Reminders
```http
POST /api/reminders/location/nearby
Authorization: Bearer {token}
Content-Type: application/json

{
  "latitude": 24.7136,
  "longitude": 46.6753,
  "radius": 1000
}
```

### Get Location Reminders Summary
```http
GET /api/reminders/location/summary
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalLocationReminders": 15,
    "totalSavedLocations": 8,
    "byTriggerType": {
      "arrive": {
        "total": 10,
        "triggered": 3,
        "pending": 7
      },
      "leave": {
        "total": 3,
        "triggered": 1,
        "pending": 2
      },
      "nearby": {
        "total": 2,
        "triggered": 0,
        "pending": 2
      }
    }
  }
}
```

### Calculate Distance
```http
POST /api/reminders/location/distance
Authorization: Bearer {token}
Content-Type: application/json

{
  "lat1": 24.7136,
  "lng1": 46.6753,
  "lat2": 24.7200,
  "lng2": 46.6800
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "distance": 823,
    "distanceKm": "0.82",
    "point1": { "latitude": 24.7136, "longitude": 46.6753 },
    "point2": { "latitude": 24.7200, "longitude": 46.6800 }
  }
}
```

### Update User Location
```http
PUT /api/reminders/location/locations/{locationId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Courthouse Name",
  "radius": 200
}
```

### Delete User Location
```http
DELETE /api/reminders/location/locations/{locationId}
Authorization: Bearer {token}
```

### Reset Location Trigger
```http
POST /api/reminders/location/{reminderId}/reset
Authorization: Bearer {token}
```

## Usage Examples

### Example 1: Arrive at Court
```javascript
// Create reminder to check in when arriving at courthouse
const reminder = await locationRemindersService.createLocationReminder(
  userId,
  firmId,
  {
    title: "Check in at courthouse",
    description: "Don't forget to sign in at the registry",
    priority: "high",
    type: "hearing"
  },
  {
    type: "arrive",
    location: {
      name: "Riyadh Courthouse",
      address: "King Fahd Road, Riyadh",
      latitude: 24.7136,
      longitude: 46.6753
    },
    radius: 150
  }
);
```

### Example 2: Leave Client Office
```javascript
// Create reminder when leaving client meeting
const reminder = await locationRemindersService.createLocationReminder(
  userId,
  firmId,
  {
    title: "Send meeting notes",
    description: "Email summary to client within 24 hours",
    priority: "medium",
    type: "follow_up"
  },
  {
    type: "leave",
    location: {
      name: "Client Office - Acme Corp",
      latitude: 24.7140,
      longitude: 46.6750
    },
    radius: 100,
    repeatTrigger: true,
    cooldownMinutes: 120
  }
);
```

### Example 3: Background Location Check
```javascript
// Check user location (called by mobile app or background job)
const result = await locationRemindersService.checkLocationTriggers(
  userId,
  firmId,
  {
    latitude: currentLat,
    longitude: currentLng,
    accuracy: gpsAccuracy
  }
);

if (result.data.triggered > 0) {
  // Send push notifications for triggered reminders
  result.data.reminders.forEach(reminder => {
    notificationService.sendPush(userId, {
      title: reminder.title,
      body: `You are ${reminder.distance}m from ${reminder.locationName}`,
      data: { reminderId: reminder.reminderId }
    });
  });
}
```

### Example 4: Save Frequently Visited Location
```javascript
// Save office location for reuse
const location = await locationRemindersService.saveUserLocation(
  userId,
  firmId,
  {
    name: "Main Office",
    address: "Tower 5, Business District, Riyadh",
    lat: 24.7136,
    lng: 46.6753,
    type: "office",
    radius: 100,
    isDefault: true
  }
);

// Use saved location in reminder
const reminder = await locationRemindersService.createLocationReminder(
  userId,
  firmId,
  { title: "Morning briefing", description: "Team standup at 9 AM" },
  {
    type: "arrive",
    location: {
      name: location.data.name,
      latitude: location.data.coordinates.latitude,
      longitude: location.data.coordinates.longitude,
      savedLocationId: location.data._id
    },
    radius: 100
  }
);
```

## Integration Guide

### Mobile App Integration

1. **Request Location Permissions**
   ```javascript
   // Request "When In Use" or "Always" location permission
   const permission = await requestLocationPermission();
   ```

2. **Periodic Location Checks**
   ```javascript
   // Check location every 5 minutes when app is active
   setInterval(async () => {
     const position = await getCurrentPosition();

     const result = await fetch('/api/reminders/location/check', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${token}`,
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({
         latitude: position.coords.latitude,
         longitude: position.coords.longitude,
         accuracy: position.coords.accuracy
       })
     });

     const data = await result.json();

     // Handle triggered reminders
     if (data.data.triggered > 0) {
       showLocalNotifications(data.data.reminders);
     }
   }, 5 * 60 * 1000);
   ```

3. **Geofencing (iOS/Android)**
   ```javascript
   // Register geofences for active location reminders
   const reminders = await getLocationReminders();

   reminders.forEach(reminder => {
     registerGeofence({
       identifier: reminder._id,
       latitude: reminder.locationTrigger.location.latitude,
       longitude: reminder.locationTrigger.location.longitude,
       radius: reminder.locationTrigger.radius,
       notifyOnEntry: reminder.locationTrigger.type === 'arrive',
       notifyOnExit: reminder.locationTrigger.type === 'leave'
     });
   });
   ```

### Background Job Integration

Create a cron job to check user locations for users who have shared their location:

```javascript
// jobs/checkLocationReminders.js
const cron = require('node-cron');
const locationRemindersService = require('../services/locationReminders.service');

// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    // Get users with active location sharing
    const activeUsers = await getUsersWithLocationSharing();

    const userLocationPairs = activeUsers.map(user => ({
      userId: user._id,
      firmId: user.firmId,
      location: {
        latitude: user.lastKnownLocation.latitude,
        longitude: user.lastKnownLocation.longitude,
        accuracy: user.lastKnownLocation.accuracy
      }
    }));

    const result = await locationRemindersService.batchCheckLocationTriggers(
      userLocationPairs
    );

    console.log(`Checked ${result.data.total} users, ${result.data.successful} successful`);
  } catch (error) {
    console.error('Location check job failed:', error);
  }
});
```

### Notification Integration

```javascript
// Send notification when location trigger fires
const { checkLocationTriggers } = require('../services/locationReminders.service');
const notificationService = require('../services/notification.service');

async function handleLocationUpdate(userId, firmId, currentLocation) {
  const result = await checkLocationTriggers(userId, firmId, currentLocation);

  if (result.data.triggered > 0) {
    for (const reminder of result.data.reminders) {
      // Send in-app notification
      await notificationService.create({
        userId,
        type: 'location_reminder',
        title: reminder.title,
        message: `${reminder.description} (${reminder.distance}m from ${reminder.locationName})`,
        priority: reminder.priority,
        data: {
          reminderId: reminder.reminderId,
          triggerType: reminder.triggerType,
          location: reminder.locationName
        }
      });

      // Send push notification
      await notificationService.sendPush(userId, {
        title: reminder.title,
        body: reminder.description,
        data: { reminderId: reminder.reminderId }
      });
    }
  }

  return result;
}
```

## Testing

### Unit Tests

```javascript
// tests/locationReminders.service.test.js
const locationRemindersService = require('../services/locationReminders.service');
const { Reminder, UserLocation } = require('../models');

describe('LocationRemindersService', () => {
  describe('createLocationReminder', () => {
    it('should create a location-based reminder', async () => {
      const result = await locationRemindersService.createLocationReminder(
        userId,
        firmId,
        { title: 'Test Reminder' },
        {
          type: 'arrive',
          location: {
            name: 'Test Location',
            latitude: 24.7136,
            longitude: 46.6753
          },
          radius: 100
        }
      );

      expect(result.success).toBe(true);
      expect(result.data.locationTrigger.enabled).toBe(true);
      expect(result.data.locationTrigger.type).toBe('arrive');
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance correctly', () => {
      const distance = locationRemindersService.calculateDistance(
        24.7136, 46.6753,  // Point 1
        24.7200, 46.6800   // Point 2
      );

      expect(distance).toBeGreaterThan(800);
      expect(distance).toBeLessThan(850);
    });
  });
});
```

### Integration Tests

```javascript
// tests/integration/locationReminders.test.js
describe('Location Reminders Integration', () => {
  it('should trigger reminder when user arrives', async () => {
    // Create reminder
    const reminder = await createLocationReminder({
      type: 'arrive',
      location: { latitude: 24.7136, longitude: 46.6753 },
      radius: 100
    });

    // Simulate user arriving at location
    const result = await checkLocationTriggers({
      latitude: 24.7140,  // Within 100m
      longitude: 46.6750
    });

    expect(result.data.triggered).toBe(1);
    expect(result.data.reminders[0].triggered).toBe(true);
  });
});
```

## Best Practices

1. **Radius Selection**
   - Urban areas: 50-100m
   - Suburban areas: 100-200m
   - Rural areas: 200-500m
   - Consider GPS accuracy (typically 5-50m)

2. **Battery Optimization**
   - Use geofencing APIs instead of continuous GPS polling
   - Set appropriate cooldown periods (60-120 minutes)
   - Limit active location reminders to 20-50 per user

3. **Privacy**
   - Only track location when user has active location reminders
   - Clear location data when reminders are completed
   - Respect user's location sharing preferences

4. **Accuracy Handling**
   - Reject location updates with accuracy > 100m
   - Use grace distances for geofence boundaries
   - Handle GPS signal loss gracefully

5. **Error Handling**
   - Validate coordinates before storing
   - Handle location permission denials
   - Provide fallback to time-based reminders

## License

Internal use only - Traf3li Law Firm Management System
