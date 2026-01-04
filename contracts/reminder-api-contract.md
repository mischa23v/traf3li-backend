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
| 2026-01-04 | Added missing endpoints for feature parity | No |

---

## NEW: Additional Endpoints (2026-01-04)

### POST /api/reminders/bulk (Bulk Create)
```javascript
// Request body
{ "reminders": [...] }

// Each reminder in array follows same fields as POST /api/reminders
// Max 50 reminders per request
```

**Response:**
```json
{
    "success": true,
    "message": "X reminder(s) created successfully",
    "data": {
        "created": 10,
        "failed": 2,
        "reminders": [...],
        "errors": [{ "index": 3, "title": "...", "error": "..." }]
    }
}
```

### GET /api/reminders/search
```
Query params:
- q: search query
- status, priority, type: filters
- relatedCase, clientId: entity filters
- startDate, endDate: date range
- overdue: "true"/"false"
- page, limit, sortBy, sortOrder: pagination
```

**Response:**
```json
{
    "success": true,
    "data": [...],
    "query": "search term",
    "filters": { ... },
    "pagination": { ... }
}
```

### GET /api/reminders/conflicts
```
Query params:
- userIds (optional): comma-separated list of user IDs
- startDateTime, endDateTime (optional): time range
- reminderDate (optional): specific date
```

**Response:**
```json
{
    "success": true,
    "data": {
        "hasConflicts": true,
        "totalReminders": 15,
        "remindersByUser": { "userId1": [...], "userId2": [...] },
        "conflictTimeSlots": { "2026-01-05T10:00:00Z": { "userId1": [...] } },
        "filters": { ... }
    }
}
```

### POST /api/reminders/:id/clone
```javascript
['title', 'reminderDateTime']
```

### POST /api/reminders/:id/reschedule
```javascript
['newDateTime', 'reason']
```

### GET /api/reminders/:id/activity
```
Query params: page, limit
```

**Response:**
```json
{
    "success": true,
    "data": [{ "activityType": "rescheduled", "user": {...}, ... }],
    "pagination": { ... }
}
```

### GET /api/reminders/client/:clientId
```
Query params: page, limit, status, priority
```

### GET /api/reminders/case/:caseId
```
Query params: page, limit, status, priority
```

### POST /api/reminders/from-task/:taskId
```javascript
['beforeMinutes', 'priority', 'notification']
```
Creates a reminder linked to a task, set to trigger before task due date.

### POST /api/reminders/from-event/:eventId
```javascript
['beforeMinutes', 'priority', 'notification']
```
Creates a reminder linked to an event, set to trigger before event start.

---

## Rate Limiting (Gold Standard - 2026-01-04)

### Overview

Rate limiting follows the **AWS/Algolia/Elastic pattern** with operation-type-aware throttling:
- **Search/Filter operations**: Higher burst limits (read-only, expected to be bursty)
- **General API operations**: Standard limits
- **Authenticated vs Unauthenticated**: Different quotas

### Rate Limits

| User Type | Operation Type | Limit | Window |
|-----------|---------------|-------|--------|
| Authenticated | Search/Filter (GET with params) | 120 req/min | 1 minute |
| Authenticated | General API | 400 req/min | 1 minute |
| Unauthenticated | Search/Filter | 20 req/min | 1 minute |
| Unauthenticated | General API | 30 req/min | 1 minute |

### Search/Filter Detection

Requests are classified as **search/filter operations** when:
1. Method is `GET`
2. Request includes any of these query parameters:

**Text Search:**
```
search, q, query, keyword, text
```

**Filter Parameters:**
```
status, priority, type, relatedCase, relatedTo, clientId,
createdBy, lawyerId, tags, category, startDate, endDate, reminderDate
```

### Examples

| Request | Classification | Rate Limit |
|---------|---------------|------------|
| `GET /reminders` | General | 400/min |
| `GET /reminders?status=pending` | Search/Filter | 120/min |
| `GET /reminders?search=deadline` | Search/Filter | 120/min |
| `GET /reminders?priority=high&type=hearing` | Search/Filter | 120/min |
| `GET /reminders?startDate=2026-01-01&endDate=2026-12-31` | Search/Filter | 120/min |
| `POST /reminders` | General (write) | 400/min |
| `PUT /reminders/:id` | General (write) | 400/min |

### Response Headers (Gold Standard - AWS/Stripe Pattern)

**On ALL API responses:**
```
X-RateLimit-Limit: 400          # Max requests per window
X-RateLimit-Remaining: 385      # Requests remaining in current window
X-RateLimit-Reset: 1704412800   # Unix timestamp when window resets
RateLimit-Limit: 400            # Draft standard format
RateLimit-Remaining: 385        # Draft standard format
RateLimit-Reset: 60             # Seconds until reset
```

**On 429 responses (rate limited):**
```
HTTP/1.1 429 Too Many Requests
Retry-After: 60                 # Seconds to wait before retry (RFC 7231)
X-RateLimit-Limit: 400
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704412800
```

### Error Response (429)
```json
{
    "success": false,
    "error": "بحث كثير جداً - أبطئ قليلاً",
    "error_en": "Too many search requests - Slow down",
    "code": "SEARCH_RATE_LIMIT_EXCEEDED",
    "retryAfter": 60,
    "resetAt": "2026-01-04T12:00:00.000Z",
    "message": "Rate limit exceeded. Try again in 60 seconds.",
    "message_ar": "تم تجاوز الحد الأقصى. حاول مرة أخرى بعد 60 ثانية."
}
```

### Why This Matters

1. **Search is bursty**: Users typing in search boxes generate many requests rapidly
2. **Read operations are safe**: Higher limits for reads don't risk data corruption
3. **Separate buckets**: Search limits don't consume general API quota
4. **Gold standard compliance**: Follows AWS API Gateway, Algolia, Elasticsearch patterns
