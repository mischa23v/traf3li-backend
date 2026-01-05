# Event API Contract

**Generated:** 2026-01-04
**Purpose:** Verify refactoring doesn't break frontend expectations

---

## Valid Enum Values

### Type
```javascript
[
    'hearing', 'court_date', 'meeting', 'client_meeting', 'deposition',
    'mediation', 'arbitration', 'deadline', 'filing_deadline', 'conference_call',
    'internal_meeting', 'training', 'webinar', 'consultation', 'task', 'other'
]
```

### Status
```javascript
['scheduled', 'confirmed', 'tentative', 'canceled', 'cancelled', 'postponed', 'completed', 'in_progress', 'rescheduled']
```

### Priority
```javascript
['low', 'medium', 'high', 'critical']
```

### Visibility
```javascript
['public', 'private', 'confidential']
```

### Attendee Role
```javascript
['organizer', 'required', 'optional', 'resource']
```

### Attendee Status
```javascript
['invited', 'confirmed', 'declined', 'tentative', 'no_response']
```

### RSVP Status
```javascript
['pending', 'accepted', 'declined', 'tentative']
```

### Recurrence Frequency
```javascript
['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom']
```

### Reminder Type
```javascript
['notification', 'push', 'email', 'sms', 'whatsapp']
```

### Virtual Platform
```javascript
['zoom', 'teams', 'google_meet', 'webex', 'other']
```

### Court Type
```javascript
[
    'general_court', 'criminal_court', 'family_court', 'commercial_court',
    'labor_court', 'appeal_court', 'supreme_court', 'administrative_court',
    'enforcement_court'
]
```

### Billing Type
```javascript
['hourly', 'fixed_fee', 'retainer', 'pro_bono', 'not_billable']
```

### Invoice Status
```javascript
['not_invoiced', 'invoiced', 'paid']
```

---

## Allowed Request Body Fields

### POST /api/events (Create Event)
```javascript
[
    'title', 'type', 'description', 'startDateTime', 'endDateTime',
    'allDay', 'timezone', 'location', 'caseId', 'clientId',
    'attendees', 'agenda', 'reminders', 'recurrence',
    'priority', 'visibility', 'color', 'tags', 'notes'
]
```

### PUT/PATCH /api/events/:id (Update Event)
```javascript
[
    'title', 'type', 'description', 'startDateTime', 'endDateTime',
    'allDay', 'timezone', 'location', 'caseId', 'clientId',
    'attendees', 'agenda', 'actionItems', 'reminders', 'recurrence',
    'priority', 'visibility', 'color', 'tags', 'notes', 'minutesNotes'
]
```

### POST /api/events/:id/complete
```javascript
['minutesNotes']
```

### POST /api/events/:id/cancel
```javascript
['reason']
```

### POST /api/events/:id/postpone
```javascript
['newDateTime', 'reason']
```
**Note:** `newDateTime` is required and must be after current event start

### POST /api/events/:id/attendees (Add Attendee)
```javascript
['userId', 'email', 'name', 'role', 'isRequired']
```

### POST /api/events/:id/rsvp
```javascript
['status', 'responseNote']
```
**Note:** `status` must be one of: 'confirmed', 'declined', 'tentative'

### POST /api/events/:id/agenda (Add Agenda Item)
```javascript
['title', 'description', 'duration', 'presenter', 'notes']
```

### PUT /api/events/:id/agenda/:agendaId (Update Agenda Item)
```javascript
['title', 'description', 'duration', 'presenter', 'notes', 'order', 'completed']
```

### POST /api/events/:id/action-items (Add Action Item)
```javascript
['description', 'assignedTo', 'dueDate', 'priority']
```

### PUT /api/events/:id/action-items/:itemId (Update Action Item)
```javascript
['description', 'assignedTo', 'dueDate', 'status', 'priority']
```

### POST /api/events/availability (Check Availability)
```javascript
['userIds', 'startDateTime', 'endDateTime', 'excludeEventId']
```

### POST /api/events/parse (Natural Language)
```javascript
['text', 'timezone']
```
**Note:** `timezone` defaults to 'Asia/Riyadh'

### POST /api/events/voice (Voice Transcription)
```javascript
['transcription', 'timezone']
```
**Note:** `timezone` defaults to 'Asia/Riyadh'

---

## API Endpoints

### Calendar Views
| Method | Endpoint | Handler |
|--------|----------|---------|
| GET | /stats | getEventStats |
| GET | /calendar | getCalendarEvents |
| GET | /upcoming | getUpcomingEvents |
| GET | /month/:year/:month | getEventsByMonth |
| GET | /date/:date | getEventsByDate |
| POST | /availability | checkAvailability |

### Import/Export
| Method | Endpoint | Handler |
|--------|----------|---------|
| GET | /:id/export/ics | exportEventToICS |
| POST | /import/ics | importEventsFromICS |

### NLP & Voice
| Method | Endpoint | Handler |
|--------|----------|---------|
| POST | /parse | createEventFromNaturalLanguage |
| POST | /voice | createEventFromVoice |

### Core CRUD
| Method | Endpoint | Handler |
|--------|----------|---------|
| POST | / | createEvent |
| GET | / | getEvents |
| GET | /:id | getEvent |
| PUT | /:id | updateEvent |
| PATCH | /:id | updateEvent |
| DELETE | /:id | deleteEvent |

### Event Actions
| Method | Endpoint | Handler |
|--------|----------|---------|
| POST | /:id/complete | completeEvent |
| POST | /:id/cancel | cancelEvent |
| POST | /:id/postpone | postponeEvent |

### Attendee Management
| Method | Endpoint | Handler |
|--------|----------|---------|
| POST | /:id/attendees | addAttendee |
| DELETE | /:id/attendees/:attendeeId | removeAttendee |
| POST | /:id/rsvp | rsvpEvent |

### Agenda Management
| Method | Endpoint | Handler |
|--------|----------|---------|
| POST | /:id/agenda | addAgendaItem |
| PUT | /:id/agenda/:agendaId | updateAgendaItem |
| DELETE | /:id/agenda/:agendaId | deleteAgendaItem |

### Action Items
| Method | Endpoint | Handler |
|--------|----------|---------|
| POST | /:id/action-items | addActionItem |
| PUT | /:id/action-items/:itemId | updateActionItem |

---

## Query Parameters

### GET /api/events
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| startDate | ISO date | - | Filter by start date |
| endDate | ISO date | - | Filter by end date |
| type | string | - | Filter by event type |
| caseId | ObjectId | - | Filter by case |
| clientId | ObjectId | - | Filter by client |
| status | string | - | Filter by status |
| page | number | 1 | Page number |
| limit | number | 50 | Items per page |
| sortBy | string | 'startDateTime' | Sort field |
| sortOrder | string | 'asc' | Sort order (asc/desc) |
| includeStats | string | 'false' | Include aggregated stats |

### GET /api/events/calendar
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| startDate | ISO date | required | Calendar start date |
| endDate | ISO date | required | Calendar end date |
| caseId | ObjectId | - | Filter by case |
| type | string | - | Filter by event type |
| status | string | - | Filter by status |

### GET /api/events/upcoming
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| days | number | 7 | Number of days ahead |

### GET /api/events/stats
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| startDate | ISO date | - | Stats start date |
| endDate | ISO date | - | Stats end date |

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
    "events": [...],
    "tasks": [...],
    "data": { "events": [...], "tasks": [...] },
    "total": 100,
    "pagination": {
        "page": 1,
        "limit": 50,
        "total": 100,
        "totalPages": 2,
        "pages": 2,
        "hasMore": true
    }
}
```

### List Response with Stats (includeStats=true)
```json
{
    "success": true,
    "events": [...],
    "stats": {
        "total": 100,
        "upcoming": 50,
        "past": 30,
        "today": 5,
        "byType": {
            "meeting": 40,
            "session": 20,
            "hearing": 15,
            "deadline": 25
        }
    }
}
```

### Event Object Shape
```json
{
    "_id": "ObjectId",
    "eventId": "EVT-202601-0001",
    "title": "string (max 300 chars)",
    "description": "string (max 5000 chars)",
    "type": "meeting|hearing|deadline|...",
    "status": "scheduled|confirmed|completed|...",
    "startDateTime": "ISO date",
    "endDateTime": "ISO date",
    "allDay": false,
    "timezone": "Asia/Riyadh",
    "location": {
        "name": "string",
        "address": "string",
        "room": "string",
        "virtualLink": "string",
        "virtualPlatform": "zoom|teams|...",
        "instructions": "string",
        "coordinates": { "latitude": 0.0, "longitude": 0.0 }
    },
    "organizer": { "_id": "...", "firstName": "...", "lastName": "...", "image": "..." },
    "attendees": [{
        "_id": "...",
        "userId": { "_id": "...", "firstName": "...", "lastName": "...", "email": "..." },
        "email": "string",
        "name": "string",
        "role": "required|optional|...",
        "status": "invited|confirmed|...",
        "isRequired": true,
        "responseNote": "string",
        "respondedAt": "ISO date"
    }],
    "caseId": { "_id": "...", "title": "...", "caseNumber": "..." },
    "clientId": { "_id": "...", "firstName": "...", "lastName": "..." },
    "taskId": { "_id": "...", "title": "...", "status": "...", "dueDate": "..." },
    "courtDetails": {
        "courtType": "general_court|criminal_court|...",
        "courtCaseNumber": "string",
        "caseYear": 2026,
        "najizCaseNumber": "string"
    },
    "virtualMeeting": {
        "platform": "zoom|teams|...",
        "meetingUrl": "string",
        "meetingId": "string",
        "meetingPassword": "string"
    },
    "agenda": [{
        "_id": "...",
        "title": "string",
        "description": "string",
        "duration": 30,
        "presenter": { "_id": "...", "firstName": "...", "lastName": "..." },
        "notes": "string",
        "order": 1,
        "completed": false
    }],
    "actionItems": [{
        "_id": "...",
        "description": "string",
        "assignedTo": { "_id": "...", "firstName": "...", "lastName": "..." },
        "dueDate": "ISO date",
        "status": "pending|in_progress|completed|cancelled",
        "completedAt": "ISO date",
        "priority": "low|medium|high"
    }],
    "reminders": [{
        "_id": "...",
        "type": "notification|push|email|sms|whatsapp",
        "beforeMinutes": 60,
        "sent": false,
        "sentAt": "ISO date"
    }],
    "recurrence": {
        "enabled": false,
        "frequency": "daily|weekly|monthly|...",
        "interval": 1,
        "daysOfWeek": [0, 1, 2, 3, 4, 5, 6],
        "dayOfMonth": 1,
        "endType": "never|after_occurrences|on_date",
        "endDate": "ISO date",
        "maxOccurrences": 10,
        "occurrencesCompleted": 0,
        "nextOccurrence": "ISO date"
    },
    "billing": {
        "isBillable": false,
        "billingType": "hourly|fixed_fee|...",
        "hourlyRate": 0,
        "fixedAmount": 0,
        "currency": "SAR",
        "billableAmount": 0,
        "invoiceStatus": "not_invoiced|invoiced|paid"
    },
    "minutesNotes": "string (max 10000 chars)",
    "minutesRecordedBy": { "_id": "...", "firstName": "...", "lastName": "..." },
    "minutesRecordedAt": "ISO date",
    "completedAt": "ISO date",
    "completedBy": { "_id": "...", "firstName": "...", "lastName": "..." },
    "cancelledAt": "ISO date",
    "cancelledBy": { "_id": "...", "firstName": "...", "lastName": "..." },
    "cancellationReason": "string",
    "postponedTo": "ISO date",
    "postponementReason": "string",
    "priority": "low|medium|high|critical",
    "visibility": "public|private|confidential",
    "color": "#3b82f6",
    "tags": ["string"],
    "notes": "string (max 2000 chars)",
    "firmId": "ObjectId",
    "lawyerId": "ObjectId",
    "createdBy": { "_id": "...", "firstName": "...", "lastName": "..." },
    "lastModifiedBy": { "_id": "...", "firstName": "...", "lastName": "..." },
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
            "scheduled": 40,
            "confirmed": 30,
            "completed": 20,
            "cancelled": 5,
            "postponed": 5
        },
        "byType": {
            "meeting": 40,
            "hearing": 20,
            "deadline": 15,
            "consultation": 25
        },
        "today": 5,
        "thisWeek": 20
    }
}
```

### Availability Response Shape
```json
{
    "success": true,
    "data": {
        "available": true,
        "conflicts": []
    }
}
```

### NLP/Voice Response Shape
```json
{
    "success": true,
    "message": "Event created successfully from natural language",
    "data": { ... },
    "parsing": {
        "confidence": 0.85,
        "originalText": "Meeting tomorrow at 3pm",
        "tokensUsed": 50
    }
}
```

---

## Validation Rules

### Date/Time
- `startDateTime` is required for new events
- `endDateTime` must be after `startDateTime`
- New events cannot have `startDateTime` in the past

### Attendees
- `userId` must be valid ObjectId if provided
- Duplicate attendees are not allowed

### Agenda Items
- `title` is required
- `duration` is in minutes

### Action Items
- `description` is required
- `dueDate` cannot be before event start date

### ICS Import
- File must be `.ics` or have `text/calendar` MIME type
- Max file size: 5MB

---

## Verification Checklist

After refactoring, verify:

- [ ] All endpoints still work
- [ ] Field names match frontend expectations
- [ ] Enum values haven't changed
- [ ] Response shapes are identical
- [ ] Error messages are consistent
- [ ] Date validation works correctly
- [ ] ICS export/import works

### Quick Verification Commands

```bash
# Check enum values in model
grep -A20 "type:" src/models/event.model.js

# Check allowed fields in controller
grep -A30 "allowedFields" src/controllers/event.controller.js

# Verify no syntax errors
node --check src/controllers/event.controller.js
node --check src/models/event.model.js
```

---

## Change Log

| Date | Change | Breaking? |
|------|--------|-----------|
| 2026-01-04 | Initial contract documentation | No |
| 2026-01-04 | Added missing endpoints for feature parity | No |
| 2026-01-05 | Added bulk complete/archive/unarchive, archive schema, isArchived filter | No |
| 2026-01-05 | Added location triggers (Gold Standard - matches Tasks/Reminders) | No |
| 2026-01-05 | Added sortOrder field, exportEvents, reorderEvents (Gold Standard feature parity) | No |

---

## NEW: Additional Endpoints (2026-01-04)

### GET /api/events/search
```
Query params:
- q: search query
- type, status, priority, visibility: filters
- caseId, clientId, organizer: entity filters
- startDate, endDate: date range
- allDay: "true"/"false"
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

### GET /api/events/:id/activity
```
Query params: page, limit
```

**Response:**
```json
{
    "success": true,
    "data": [{ "activityType": "rescheduled", "user": {...}, "timestamp": "..." }],
    "pagination": { ... }
}
```

### POST /api/events/:id/clone
```javascript
['title', 'startDateTime', 'includeAttendees', 'includeAgenda']
```

### POST /api/events/:id/reschedule
```javascript
['newStartDateTime', 'newEndDateTime', 'reason', 'notifyAttendees']
```

### GET /api/events/client/:clientId
```
Query params: page, limit, status, type
```

### DELETE /api/events/:id/action-items/:itemId
Removes an action item from an event.

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
status, type, eventType, caseId, clientId, assignee, organizer,
createdBy, lawyerId, tags, category, startDate, endDate
```

### Examples

| Request | Classification | Rate Limit |
|---------|---------------|------------|
| `GET /events` | General | 400/min |
| `GET /events?status=scheduled` | Search/Filter | 120/min |
| `GET /events?search=meeting` | Search/Filter | 120/min |
| `GET /events?type=hearing&status=confirmed` | Search/Filter | 120/min |
| `GET /events?startDate=2026-01-01&endDate=2026-12-31` | Search/Filter | 120/min |
| `GET /events/calendar?startDate=...&endDate=...` | Search/Filter | 120/min |
| `POST /events` | General (write) | 400/min |
| `PUT /events/:id` | General (write) | 400/min |

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

---

## NEW: Bulk Operations & Archive System (2026-01-05)

### Schema Additions
The following fields were added to the Event schema:
```javascript
{
    isArchived: { type: Boolean, default: false, index: true },
    archivedAt: Date,
    archivedBy: { type: ObjectId, ref: 'User' }
}
```

### New Bulk Endpoints

#### POST /api/events/bulk/complete
Complete multiple events at once.
```javascript
// Request body
{ "eventIds": ["id1", "id2", "id3"], "completionNote": "optional note" }

// Response
{
    "success": true,
    "message": "3 event(s) completed successfully",
    "data": {
        "completed": 3,
        "failed": 0,
        "failedIds": []
    }
}
```

#### POST /api/events/bulk/archive
Archive multiple events (soft delete).
```javascript
// Request body
{ "eventIds": ["id1", "id2", "id3"] }

// Response
{
    "success": true,
    "message": "3 event(s) archived successfully",
    "data": {
        "archived": 3,
        "failed": 0,
        "failedIds": []
    }
}
```

#### POST /api/events/bulk/unarchive
Restore archived events.
```javascript
// Request body
{ "eventIds": ["id1", "id2", "id3"] }

// Response
{
    "success": true,
    "message": "3 event(s) unarchived successfully",
    "data": {
        "unarchived": 3,
        "failed": 0,
        "failedIds": []
    }
}
```

### Single Archive Endpoints

#### POST /api/events/:id/archive
Archive a single event.

#### POST /api/events/:id/unarchive
Unarchive a single event.

### Utility Endpoints

#### GET /api/events/ids
Get all event IDs (for "Select All" functionality).
```
Query params: status, type, isArchived, startDate, endDate
```
```json
{
    "success": true,
    "data": ["id1", "id2", "id3"],
    "count": 3
}
```

#### GET /api/events/archived
Get archived events with pagination.
```
Query params: page, limit, sortBy, sortOrder
```

#### GET /api/events/case/:caseId
Get events for a specific case.
```
Query params: page, limit, status, type
```

### Updated Query Parameters for GET /api/events

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| isArchived | string | 'false' | Filter by archived status. Options: 'false' (hide archived), 'true'/'only' (show only archived) |

**Note:** By default, archived events are excluded from the main list. Use `isArchived=true` or `isArchived=only` to show archived events.

---

## NEW: Location Triggers (2026-01-05)

Events now support location-based triggers (matching Reminders/Tasks).

### Schema Additions
```javascript
// Location Trigger Configuration
locationTrigger: {
    enabled: Boolean,           // Default: false
    type: 'arrive' | 'leave' | 'nearby',
    radius: Number,             // meters, default: 100
    triggered: Boolean,         // Has it fired?
    triggeredAt: Date,
    lastCheckedAt: Date,
    repeatTrigger: Boolean,     // Can re-trigger after cooldown
    cooldownMinutes: Number     // Default: 60
}
```

**Note:** Events already have a full `location` schema with coordinates. Location triggers use `location.coordinates.latitude` and `location.coordinates.longitude`.

### PUT /api/events/:id/location-trigger

Configure location-based trigger for an event.

**Request Body:**
```javascript
['enabled', 'type', 'radius', 'repeatTrigger', 'cooldownMinutes']
```

**Example:**
```json
{
    "enabled": true,
    "type": "arrive",
    "radius": 200,
    "repeatTrigger": false
}
```

**Response:**
```json
{
    "success": true,
    "message": "Location trigger updated successfully",
    "data": { /* event object */ }
}
```

### POST /api/events/:id/location/check

Check if current location should trigger the event's location alert.

**Request Body:**
```json
{
    "latitude": 24.7136,
    "longitude": 46.6753
}
```

**Response:**
```json
{
    "success": true,
    "triggered": true,
    "data": {
        "eventId": "...",
        "title": "Court Hearing",
        "locationTrigger": { ... },
        "location": { ... }
    }
}
```

### GET /api/events/location-triggers

Get all events with location triggers enabled (for mobile app background polling).

**Query Parameters:**
- `untriggeredOnly`: 'true' | 'false' (default: 'true')

**Response:**
```json
{
    "success": true,
    "count": 3,
    "data": [
        {
            "_id": "...",
            "title": "Court Hearing",
            "startDateTime": "...",
            "location": { ... },
            "locationTrigger": { ... }
        }
    ]
}
```

### POST /api/events/location/check

Bulk check all user's events against current location.

**Request Body:**
```json
{
    "latitude": 24.7136,
    "longitude": 46.6753
}
```

**Response:**
```json
{
    "success": true,
    "totalChecked": 5,
    "triggered": 1,
    "data": [
        { /* triggered event */ }
    ]
}
```

### Updated Endpoint Summary

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| PUT | /:id/location-trigger | updateLocationTrigger | Configure location trigger |
| POST | /:id/location/check | checkLocationTrigger | Check single event location |
| GET | /location-triggers | getEventsWithLocationTriggers | Get all location-enabled events |
| POST | /location/check | bulkCheckLocationTriggers | Bulk check all events |

---

## NEW: Export & Reorder (2026-01-05)

Events now support export and drag-and-drop reordering (matching Tasks API - Gold Standard feature parity).

### Schema Additions
```javascript
{
    sortOrder: { type: Number, default: 0, index: true }
}
```

Indexes added:
- `{ firmId: 1, sortOrder: 1 }`
- `{ createdBy: 1, sortOrder: 1 }`

### GET /api/events/export

Export events data in JSON or CSV format.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| format | string | 'json' | Export format: 'json' or 'csv' |
| status | string | - | Filter by status |
| type | string | - | Filter by event type |
| startDate | ISO date | - | Filter events starting after |
| endDate | ISO date | - | Filter events ending before |
| isArchived | string | 'false' | Include archived events |

**Response (JSON format):**
```json
{
    "success": true,
    "format": "json",
    "count": 25,
    "data": [
        {
            "_id": "...",
            "eventId": "EVT-202601-0001",
            "title": "Court Hearing",
            "type": "hearing",
            "status": "scheduled",
            "startDateTime": "2026-01-15T09:00:00.000Z",
            "endDateTime": "2026-01-15T10:00:00.000Z",
            "location": { ... },
            "caseId": { "_id": "...", "title": "...", "caseNumber": "..." },
            "clientId": { "_id": "...", "firstName": "...", "lastName": "..." },
            "priority": "high",
            "createdBy": { ... },
            "createdAt": "..."
        }
    ],
    "exportedAt": "2026-01-05T12:00:00.000Z"
}
```

**Response (CSV format):**
```json
{
    "success": true,
    "format": "csv",
    "count": 25,
    "data": "Event ID,Title,Type,Status,Start Date Time,End Date Time,Location,Case,Client,Priority,Created At\nEVT-202601-0001,Court Hearing,hearing,scheduled,2026-01-15T09:00:00.000Z,2026-01-15T10:00:00.000Z,\"Riyadh Court\",\"Smith vs. Jones\",\"John Smith\",high,2026-01-04T10:00:00.000Z\n...",
    "exportedAt": "2026-01-05T12:00:00.000Z"
}
```

### PATCH /api/events/reorder

Reorder events for drag-and-drop functionality.

**Request Body:**
```javascript
['eventIds', 'orders']
```

**Example Request:**
```json
{
    "eventIds": ["eventId1", "eventId2", "eventId3"],
    "orders": [0, 1, 2]
}
```

**Validation:**
- `eventIds` must be an array of valid ObjectIds
- `orders` must be an array of numbers
- Both arrays must have the same length
- All event IDs must belong to the requesting user's firm/account

**Response:**
```json
{
    "success": true,
    "message": "Events reordered successfully",
    "data": {
        "modifiedCount": 3
    }
}
```

**Security:**
- All events are verified to belong to the user's firm (using `...req.firmQuery`)
- IDOR protection via sanitizeObjectId
- Bulk operations use tenant-scoped queries

### Updated Endpoint Summary (Import/Export)

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | /:id/export/ics | exportEventToICS | Export single event to ICS |
| POST | /import/ics | importEventsFromICS | Import events from ICS file |
| GET | /export | exportEvents | Export events (JSON/CSV) |
| PATCH | /reorder | reorderEvents | Reorder events (drag & drop) |
