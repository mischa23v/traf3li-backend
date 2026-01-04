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
