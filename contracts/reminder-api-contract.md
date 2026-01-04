# Reminder API Contract

**Generated:** 2026-01-04
**Purpose:** Verify refactoring doesn't break frontend expectations

---

## Valid Enum Values

### Priority
```javascript
['low', 'medium', 'high', 'critical']
```
**Note:** Frontend may send `'urgent'` which is mapped to `'critical'`, and `'normal'` which is mapped to `'medium'`.

### Status
```javascript
['pending', 'snoozed', 'completed', 'dismissed', 'delegated']
```

### Type
```javascript
['task_due', 'hearing', 'deadline', 'meeting', 'payment', 'contract_renewal', 'statute_limitation', 'follow_up', 'general', 'task']
```

### Notification Channels
```javascript
['push', 'email', 'sms', 'whatsapp', 'in_app']
```

### Acknowledgment Actions
```javascript
['completed', 'dismissed', 'snoozed', 'delegated']
```

### Recurring Frequency
```javascript
['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom']
```

### Location Trigger Types
```javascript
['arrive', 'leave', 'nearby']
```

---

## Allowed Request Body Fields

### POST /api/reminders (Create Reminder)
```javascript
[
    'title', 'description', 'reminderDateTime', 'reminderDate', 'reminderTime',
    'priority', 'type', 'relatedCase', 'relatedTask', 'relatedEvent',
    'relatedInvoice', 'clientId', 'recurring', 'notification', 'tags', 'notes'
]
```

### PUT/PATCH /api/reminders/:id (Update Reminder)
```javascript
[
    'title', 'description', 'reminderDateTime', 'priority', 'type',
    'relatedCase', 'relatedTask', 'relatedEvent', 'relatedInvoice',
    'clientId', 'recurring', 'notification', 'tags', 'notes'
]
```

### POST /api/reminders/:id/complete
```javascript
['completionNote']
```

### POST /api/reminders/:id/snooze
```javascript
['snoozeMinutes', 'snoozeUntil', 'snoozeReason']
```
**Notes:**
- `snoozeMinutes`: Number between 1-10080 (max 1 week)
- `snoozeUntil`: ISO date string (must be future date)
- Default snooze: 15 minutes if neither provided

### POST /api/reminders/:id/delegate
```javascript
['delegateTo', 'delegationNote']
```
**Note:** `delegateTo` is required (valid ObjectId)

### POST /api/reminders/:id/dismiss
```javascript
// No body fields - empty request
[]
```

### PUT /api/reminders/bulk (Bulk Update)
```javascript
// Request wrapper
['reminderIds', 'updates']

// Allowed update fields within 'updates'
['status', 'priority', 'reminderDateTime']
```

### DELETE /api/reminders/bulk (Bulk Delete)
```javascript
['reminderIds']
```

### POST /api/reminders/parse (Natural Language)
```javascript
['text', 'timezone']
```
**Note:** `timezone` defaults to `'Asia/Riyadh'`

### POST /api/reminders/voice (Voice Transcription)
```javascript
['transcription', 'timezone', 'language']
```
**Notes:**
- `timezone` defaults to `'Asia/Riyadh'`
- `language` defaults to `'en'`

---

## Location-Based Reminder Fields

### POST /api/reminders/location (Create Location Reminder)
```javascript
[
    'title', 'description', 'priority', 'type', 'relatedCase', 'relatedTask',
    'relatedEvent', 'relatedInvoice', 'clientId', 'notification', 'tags',
    'notes', 'locationTrigger'
]
```

### POST /api/reminders/location/check (Check Location Triggers)
```javascript
['latitude', 'longitude', 'accuracy']
```

### POST /api/reminders/location/nearby (Get Nearby Reminders)
```javascript
['latitude', 'longitude', 'radius']
```
**Note:** `radius` defaults to 500 meters

### POST /api/reminders/location/save (Save User Location)
```javascript
['name', 'address', 'lat', 'lng', 'type', 'radius', 'isDefault']
```
**Notes:**
- `type` defaults to `'custom'`
- `radius` defaults to 100 meters
- `isDefault` defaults to false

### PUT /api/reminders/location/locations/:locationId (Update Location)
```javascript
['name', 'address', 'lat', 'lng', 'type', 'radius', 'isDefault', 'isActive']
```

### POST /api/reminders/location/distance (Calculate Distance)
```javascript
['lat1', 'lng1', 'lat2', 'lng2']
```

---

## API Endpoints

### Stats & Filters
| Method | Endpoint | Handler |
|--------|----------|---------|
| GET | /stats | getReminderStats |
| GET | /upcoming | getUpcomingReminders |
| GET | /overdue | getOverdueReminders |
| GET | /snoozed-due | getSnoozedDueReminders |
| GET | /delegated | getDelegatedReminders |

### NLP/Voice Features
| Method | Endpoint | Handler |
|--------|----------|---------|
| POST | /parse | createReminderFromNaturalLanguage |
| POST | /voice | createReminderFromVoice |

### Bulk Operations
| Method | Endpoint | Handler |
|--------|----------|---------|
| PUT | /bulk | bulkUpdateReminders |
| DELETE | /bulk | bulkDeleteReminders |

### Core CRUD
| Method | Endpoint | Handler |
|--------|----------|---------|
| POST | / | createReminder |
| GET | / | getReminders |
| GET | /:id | getReminder |
| PUT | /:id | updateReminder |
| PATCH | /:id | updateReminder |
| DELETE | /:id | deleteReminder |

### Reminder Actions
| Method | Endpoint | Handler |
|--------|----------|---------|
| POST | /:id/complete | completeReminder |
| POST | /:id/dismiss | dismissReminder |
| POST | /:id/snooze | snoozeReminder |
| POST | /:id/delegate | delegateReminder |

### Location-Based Reminders
| Method | Endpoint | Handler |
|--------|----------|---------|
| GET | /location/summary | getLocationRemindersSummary |
| GET | /location/locations | getUserLocations |
| POST | /location | createLocationReminder |
| POST | /location/check | checkLocationTriggers |
| POST | /location/nearby | getNearbyReminders |
| POST | /location/save | saveUserLocation |
| POST | /location/distance | calculateDistance |
| PUT | /location/locations/:locationId | updateUserLocation |
| DELETE | /location/locations/:locationId | deleteUserLocation |
| POST | /location/:reminderId/reset | resetLocationTrigger |

---

## Query Parameters

### GET /api/reminders
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| status | string | - | Filter by status |
| priority | string | - | Filter by priority |
| type | string | - | Filter by type |
| relatedCase | ObjectId | - | Filter by case |
| clientId | ObjectId | - | Filter by client |
| startDate | ISO date | - | Filter by start date |
| endDate | ISO date | - | Filter by end date |
| page | number | 1 | Page number |
| limit | number | 50 | Items per page |
| sortBy | string | 'reminderDateTime' | Sort field |
| sortOrder | string | 'asc' | Sort order (asc/desc) |
| includeStats | string | 'false' | Include aggregated stats |

### GET /api/reminders/upcoming
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| days | number | 7 | Number of days ahead |

### GET /api/reminders/location/locations
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| type | string | - | Filter by location type |
| activeOnly | string | 'true' | Only active locations |
| groupByType | string | 'false' | Group results by type |

---

## Response Shapes

### Success Response
```json
{
    "success": true,
    "message": "...",
    "data": { ... }
}
```

### Error Response
```json
{
    "success": false,
    "message": "Error message"
}
```

### List Response with Pagination
```json
{
    "success": true,
    "data": [...],
    "pagination": {
        "page": 1,
        "limit": 50,
        "total": 100,
        "pages": 2
    }
}
```

### List Response with Stats (includeStats=true)
```json
{
    "success": true,
    "data": [...],
    "pagination": { ... },
    "stats": {
        "total": 100,
        "pending": 50,
        "completed": 30,
        "snoozed": 10,
        "overdue": 5
    }
}
```

### Reminder Object Shape
```json
{
    "_id": "ObjectId",
    "reminderId": "REM-202601-0001",
    "title": "string (max 200 chars)",
    "description": "string (max 1000 chars)",
    "userId": { "_id": "...", "firstName": "...", "lastName": "..." },
    "firmId": "ObjectId",
    "lawyerId": "ObjectId",
    "reminderDateTime": "ISO date",
    "reminderDate": "ISO date (legacy)",
    "reminderTime": "HH:mm (legacy)",
    "priority": "low|medium|high|critical",
    "type": "task_due|hearing|deadline|meeting|payment|contract_renewal|statute_limitation|follow_up|general|task",
    "status": "pending|snoozed|completed|dismissed|delegated",
    "snooze": {
        "snoozedAt": "ISO date",
        "snoozeUntil": "ISO date",
        "snoozeCount": 0,
        "snoozeReason": "string",
        "maxSnoozeCount": 5
    },
    "notification": {
        "channels": ["push", "email"],
        "advanceNotifications": [
            { "beforeMinutes": 30, "channels": ["push"], "sent": false }
        ],
        "escalation": {
            "enabled": false,
            "escalateAfterMinutes": 30,
            "escalateTo": "ObjectId",
            "escalated": false
        },
        "sent": false,
        "failedAttempts": 0
    },
    "acknowledgedAt": "ISO date",
    "acknowledgedBy": { "_id": "...", "firstName": "...", "lastName": "..." },
    "acknowledgmentAction": "completed|dismissed|snoozed|delegated",
    "delegatedTo": { "_id": "...", "firstName": "...", "lastName": "...", "email": "..." },
    "delegatedAt": "ISO date",
    "delegationNote": "string",
    "relatedCase": { "_id": "...", "title": "...", "caseNumber": "..." },
    "relatedTask": { "_id": "...", "title": "...", "dueDate": "..." },
    "relatedEvent": { "_id": "...", "title": "...", "startDateTime": "..." },
    "relatedInvoice": "ObjectId",
    "clientId": { "_id": "...", "firstName": "...", "lastName": "..." },
    "recurring": {
        "enabled": false,
        "frequency": "daily|weekly|biweekly|monthly|quarterly|yearly|custom",
        "interval": 1,
        "daysOfWeek": [0, 1, 2, 3, 4, 5, 6],
        "dayOfMonth": 1,
        "endDate": "ISO date",
        "maxOccurrences": 10,
        "occurrencesCompleted": 0,
        "nextOccurrence": "ISO date",
        "parentReminderId": "ObjectId"
    },
    "locationTrigger": {
        "enabled": false,
        "type": "arrive|leave|nearby",
        "location": {
            "name": "string",
            "address": "string",
            "latitude": 0.0,
            "longitude": 0.0,
            "savedLocationId": "ObjectId"
        },
        "radius": 100,
        "triggered": false,
        "repeatTrigger": false,
        "cooldownMinutes": 60
    },
    "completedAt": "ISO date",
    "completedBy": { "_id": "...", "firstName": "...", "lastName": "..." },
    "completionNote": "string",
    "notes": "string (max 1000 chars)",
    "tags": ["string"],
    "attachments": [
        { "fileName": "...", "fileUrl": "...", "fileType": "...", "uploadedAt": "..." }
    ],
    "createdBy": "ObjectId",
    "createdAt": "ISO date",
    "updatedAt": "ISO date"
}
```

### Stats Response Shape
```json
{
    "success": true,
    "data": {
        "total": 100,
        "byStatus": {
            "pending": 50,
            "snoozed": 10,
            "completed": 30,
            "dismissed": 5,
            "delegated": 5
        },
        "overdue": 8,
        "dueToday": 12,
        "dueThisWeek": 25
    }
}
```

### NLP/Voice Response Shape
```json
{
    "success": true,
    "message": "Reminder created successfully from natural language",
    "data": { ... },
    "parsing": {
        "confidence": {
            "overall": 0.85,
            "title": 0.9,
            "dateTime": 0.8
        },
        "warnings": ["Low confidence - please review"],
        "suggestions": ["Try saying..."],
        "transcriptionQuality": 0.95
    }
}
```

---

## Validation Rules

### Coordinates
- Latitude: -90 to 90
- Longitude: -180 to 180

### Snooze
- `snoozeMinutes`: 1-10080 (1 week max)
- `maxSnoozeCount`: Default 5

### Time Format
- `reminderTime`: HH:MM format (24-hour)

### ID Formats
- All IDs must be valid 24-character MongoDB ObjectIds

---

## Verification Checklist

After refactoring, verify:

- [ ] All endpoints still work
- [ ] Field names match frontend expectations
- [ ] Enum values haven't changed
- [ ] Response shapes are identical
- [ ] Error messages are consistent
- [ ] Priority mapping (urgent→critical, normal→medium) works
- [ ] Location coordinate validation works

### Quick Verification Commands

```bash
# Check enum values in model
grep -A5 "enum:" src/models/reminder.model.js

# Check allowed fields in controller
grep -A20 "allowedFields" src/controllers/reminder.controller.js

# Verify no syntax errors
node --check src/controllers/reminder.controller.js
node --check src/controllers/locationReminder.controller.js
```

---

## Change Log

| Date | Change | Breaking? |
|------|--------|-----------|
| 2026-01-04 | Initial contract documentation | No |
