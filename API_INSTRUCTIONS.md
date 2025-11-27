# Calendar API Backend - Implementation Guide

## Overview

This document provides implementation details for the Calendar API backend that integrates Tasks, Events, Reminders, and Case Hearings.

---

## Base URLs

| Module | Base URL |
|--------|----------|
| Calendar | `/api/calendar` |
| Events | `/api/events` |
| Tasks | `/api/tasks` |
| Reminders | `/api/reminders` |
| Cases | `/api/cases` |

---

## Authentication

All endpoints require authentication via JWT token or session cookie.

**Header:**
```
Authorization: Bearer <token>
```

**OR Cookie:**
```
Cookie: accessToken=<token>
```

---

## 1. Calendar Unified API

### 1.1 Get Unified Calendar View
```
GET /api/calendar
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | ISO 8601 | No | Start of date range (defaults to current month) |
| endDate | ISO 8601 | No | End of date range |
| type | string | No | Filter: 'event', 'task', 'reminder' |
| caseId | string | No | Filter by case ID |

**Response:**
```json
{
  "success": true,
  "data": {
    "events": [...],
    "tasks": [...],
    "reminders": [...],
    "combined": [...],
    "summary": {
      "totalItems": 15,
      "eventCount": 5,
      "taskCount": 7,
      "reminderCount": 3
    }
  },
  "dateRange": {
    "start": "2025-01-01T00:00:00.000Z",
    "end": "2025-01-31T23:59:59.000Z"
  }
}
```

### 1.2 Get Calendar By Date
```
GET /api/calendar/date/:date
```

**URL Parameters:**
- `date` - ISO 8601 date string (YYYY-MM-DD)

### 1.3 Get Calendar By Month
```
GET /api/calendar/month/:year/:month
```

**URL Parameters:**
- `year` - Year (e.g., 2025)
- `month` - Month (1-12)

### 1.4 Get Upcoming Items
```
GET /api/calendar/upcoming
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| days | number | 7 | Number of days to look ahead |

### 1.5 Get Overdue Items
```
GET /api/calendar/overdue
```

### 1.6 Get Calendar Statistics
```
GET /api/calendar/stats
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | string | Optional start date |
| endDate | string | Optional end date |

**Response:**
```json
{
  "success": true,
  "data": {
    "totalEvents": 25,
    "totalTasks": 42,
    "totalReminders": 18,
    "upcomingHearings": 5,
    "overdueItems": 3,
    "completedThisMonth": 15,
    "byType": {
      "hearing": 8,
      "meeting": 12,
      "deadline": 5
    },
    "byPriority": {
      "critical": 2,
      "high": 8,
      "medium": 10,
      "low": 5
    }
  }
}
```

---

## 2. Events API

### 2.1 Get Events
```
GET /api/events
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Filter by event type |
| status | string | Filter by status |
| startDate | string | Start date range |
| endDate | string | End date range |
| caseId | string | Filter by case |
| clientId | string | Filter by client |
| page | number | Pagination page (default: 1) |
| limit | number | Items per page (default: 50) |
| sortBy | string | Sort field (default: startDateTime) |
| sortOrder | string | 'asc' or 'desc' |

### 2.2 Create Event
```
POST /api/events
```

**Request Body:**
```json
{
  "title": "جلسة محكمة - قضية ABC",
  "description": "جلسة الاستماع الأولى",
  "type": "hearing",
  "startDateTime": "2025-01-15T09:00:00Z",
  "endDateTime": "2025-01-15T11:00:00Z",
  "allDay": false,
  "timezone": "Asia/Riyadh",
  "location": {
    "type": "physical",
    "address": "محكمة الرياض",
    "city": "الرياض"
  },
  "caseId": "case_456",
  "status": "scheduled",
  "priority": "high",
  "attendees": [
    {
      "userId": "user_123",
      "role": "required",
      "isRequired": true
    }
  ],
  "reminders": [
    {
      "type": "notification",
      "beforeMinutes": 1440
    }
  ]
}
```

**Event Types:**
- `hearing` - Court hearing
- `court_session` - Court session
- `meeting` - General meeting
- `deadline` - Deadline
- `task` - Task event
- `conference` - Conference
- `consultation` - Consultation
- `document_review` - Document review
- `training` - Training session
- `other` - Other

**Event Statuses:**
- `scheduled`
- `confirmed`
- `in_progress`
- `completed`
- `cancelled`
- `postponed`

### 2.3 Get Single Event
```
GET /api/events/:id
```

### 2.4 Update Event
```
PUT /api/events/:id
PATCH /api/events/:id
```

### 2.5 Delete Event
```
DELETE /api/events/:id
```

### 2.6 Complete Event
```
POST /api/events/:id/complete
```

**Request Body:**
```json
{
  "minutesNotes": "ملاحظات الاجتماع"
}
```

### 2.7 Cancel Event
```
POST /api/events/:id/cancel
```

**Request Body:**
```json
{
  "reason": "تم تأجيل الجلسة"
}
```

### 2.8 Postpone Event
```
POST /api/events/:id/postpone
```

**Request Body:**
```json
{
  "newDateTime": "2025-01-20T09:00:00Z",
  "reason": "سبب التأجيل"
}
```

### 2.9 RSVP to Event
```
POST /api/events/:id/rsvp
```

**Request Body:**
```json
{
  "status": "confirmed",
  "responseNote": "سأحضر"
}
```

**RSVP Statuses:** `confirmed`, `declined`, `tentative`

### 2.10 Get Upcoming Events
```
GET /api/events/upcoming
```

**Query Parameters:**
- `days` - Number of days (default: 7)

### 2.11 Export Event to ICS
```
GET /api/events/:id/export/ics
```

**Response:** ICS file download with `Content-Type: text/calendar`

### 2.12 Import Events from ICS
```
POST /api/events/import/ics
```

**Request:** `multipart/form-data` with field `file` containing the ICS file

**Response:**
```json
{
  "success": true,
  "message": "3 event(s) imported successfully",
  "data": {
    "imported": 3,
    "failed": 0,
    "events": [...],
    "errors": []
  }
}
```

### 2.13 Attendee Management
```
POST /api/events/:id/attendees        # Add attendee
DELETE /api/events/:id/attendees/:attendeeId  # Remove attendee
```

### 2.14 Agenda Management
```
POST /api/events/:id/agenda           # Add agenda item
PUT /api/events/:id/agenda/:agendaId  # Update agenda item
DELETE /api/events/:id/agenda/:agendaId # Delete agenda item
```

### 2.15 Action Items
```
POST /api/events/:id/action-items     # Add action item
PUT /api/events/:id/action-items/:itemId  # Update action item
```

---

## 3. Tasks API

### 3.1 Get Tasks
```
GET /api/tasks
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status |
| priority | string | Filter by priority |
| assignedTo | string | Filter by assigned user |
| caseId | string | Filter by case |
| label | string | Filter by label |
| overdue | string | 'true' to get overdue tasks |
| search | string | Text search |
| startDate | string | Start date range |
| endDate | string | End date range |
| page | number | Pagination page |
| limit | number | Items per page |

### 3.2 Create Task
```
POST /api/tasks
```

**Request Body:**
```json
{
  "title": "إعداد مذكرة الدفاع",
  "description": "إعداد المذكرة للجلسة القادمة",
  "status": "todo",
  "priority": "high",
  "dueDate": "2025-01-14T23:59:59Z",
  "dueTime": "17:00",
  "assignedTo": "user_123",
  "caseId": "case_456",
  "label": "legal",
  "subtasks": [
    { "title": "مراجعة المستندات", "completed": false },
    { "title": "كتابة المذكرة", "completed": false }
  ],
  "reminders": [
    { "type": "notification", "beforeMinutes": 1440 }
  ]
}
```

**Task Statuses:** `backlog`, `todo`, `in_progress`, `done`, `canceled`

**Task Priorities:** `none`, `low`, `medium`, `high`, `critical`

### 3.3 Get Single Task
```
GET /api/tasks/:id
```

### 3.4 Update Task
```
PUT /api/tasks/:id
PATCH /api/tasks/:id
```

### 3.5 Delete Task
```
DELETE /api/tasks/:id
```

### 3.6 Complete Task
```
POST /api/tasks/:id/complete
```

**Request Body:**
```json
{
  "completionNote": "تم الانتهاء بنجاح"
}
```

### 3.7 Get Task Statistics
```
GET /api/tasks/stats
```

### 3.8 Get Upcoming Tasks
```
GET /api/tasks/upcoming
```

**Query Parameters:**
- `days` - Number of days (default: 7)

### 3.9 Get Overdue Tasks
```
GET /api/tasks/overdue
```

### 3.10 Get Tasks Due Today
```
GET /api/tasks/due-today
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 5,
  "date": "2025-01-15"
}
```

### 3.11 Get Tasks By Case
```
GET /api/tasks/case/:caseId
```

### 3.12 Subtask Management
```
POST /api/tasks/:id/subtasks               # Add subtask
PATCH /api/tasks/:id/subtasks/:subtaskId/toggle  # Toggle subtask
DELETE /api/tasks/:id/subtasks/:subtaskId  # Delete subtask
```

### 3.13 Time Tracking
```
POST /api/tasks/:id/timer/start   # Start timer
POST /api/tasks/:id/timer/stop    # Stop timer
POST /api/tasks/:id/time          # Add manual time entry
```

### 3.14 Bulk Operations
```
PUT /api/tasks/bulk     # Bulk update tasks
DELETE /api/tasks/bulk  # Bulk delete tasks
```

---

## 4. Reminders API

### 4.1 Get Reminders
```
GET /api/reminders
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Filter by reminder type |
| status | string | Filter by status |
| priority | string | Filter by priority |

### 4.2 Create Reminder
```
POST /api/reminders
```

**Request Body:**
```json
{
  "title": "تذكير بجلسة المحكمة",
  "description": "الجلسة غداً الساعة 9 صباحاً",
  "type": "hearing",
  "reminderDateTime": "2025-01-14T08:00:00Z",
  "priority": "high",
  "relatedCase": "case_456",
  "relatedEvent": "event_123",
  "notification": {
    "channels": ["push", "email", "sms"],
    "escalation": {
      "enabled": true,
      "escalateTo": "user_manager",
      "afterMinutes": 30
    }
  }
}
```

**Reminder Types:** `task`, `hearing`, `deadline`, `meeting`, `payment`, `general`, `follow_up`, `court_date`, `document_submission`, `client_call`

**Reminder Statuses:** `pending`, `snoozed`, `triggered`, `completed`, `dismissed`, `expired`, `delegated`

### 4.3 Get Single Reminder
```
GET /api/reminders/:id
```

### 4.4 Update Reminder
```
PUT /api/reminders/:id
PATCH /api/reminders/:id
```

### 4.5 Delete Reminder
```
DELETE /api/reminders/:id
```

### 4.6 Complete Reminder
```
POST /api/reminders/:id/complete
```

### 4.7 Dismiss Reminder
```
POST /api/reminders/:id/dismiss
```

### 4.8 Snooze Reminder
```
POST /api/reminders/:id/snooze
```

**Request Body (Option 1 - by minutes):**
```json
{
  "minutes": 30,
  "reason": "مشغول حالياً"
}
```

**Request Body (Option 2 - until specific time):**
```json
{
  "until": "2025-01-14T10:00:00Z"
}
```

### 4.9 Delegate Reminder
```
POST /api/reminders/:id/delegate
```

**Request Body:**
```json
{
  "delegateTo": "user_456",
  "notes": "من فضلك تابع هذا الموضوع"
}
```

### 4.10 Get Upcoming Reminders
```
GET /api/reminders/upcoming
```

### 4.11 Get Overdue Reminders
```
GET /api/reminders/overdue
```

### 4.12 Get Snoozed Due Reminders
```
GET /api/reminders/snoozed-due
```

### 4.13 Get Delegated Reminders
```
GET /api/reminders/delegated
```

### 4.14 Get Reminder Statistics
```
GET /api/reminders/stats
```

---

## 5. Case Hearings Integration

### CRITICAL: Auto-Creation Feature

When a hearing is added to a case via `POST /api/cases/:id/hearing`, the system **automatically**:

1. **Creates a Calendar Event** with:
   - Title: `جلسة محكمة - {case.title}`
   - Type: `hearing`
   - Priority: `high`
   - Color: `#ef4444` (red)
   - Duration: 2 hours (default)
   - Links to the case via `caseId`

2. **Creates a Reminder** (1 day before):
   - Title: `تذكير: جلسة محكمة - {case.title}`
   - Type: `hearing`
   - Time: 9:00 AM the day before
   - Notification channels: `push`, `email`
   - Links to case and event

### 5.1 Add Hearing to Case
```
POST /api/cases/:id/hearing
```

**Request Body:**
```json
{
  "date": "2025-01-15T09:00:00Z",
  "location": "محكمة الرياض",
  "notes": "جلسة الاستماع الأولى"
}
```

**Response:**
```json
{
  "error": false,
  "message": "Hearing added successfully!",
  "case": {...},
  "event": {...},
  "reminder": {...}
}
```

### 5.2 Update Hearing
```
PATCH /api/cases/:id/hearings/:hearingId
```

**Request Body:**
```json
{
  "date": "2025-01-20T10:00:00Z",
  "location": "محكمة جدة",
  "status": "scheduled",
  "notes": "تم تغيير الموقع"
}
```

**Note:** Updates are automatically synced to linked Event and Reminder.

### 5.3 Delete Hearing
```
DELETE /api/cases/:id/hearings/:hearingId
```

**Note:** Linked Event and Reminder are automatically deleted.

---

## 6. Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "حقل العنوان مطلوب",
    "details": {
      "field": "title",
      "type": "required"
    }
  }
}
```

### Standard Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Invalid input data |
| NOT_FOUND | 404 | Resource not found |
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | Access denied |
| CONFLICT | 409 | Resource conflict |
| INTERNAL_ERROR | 500 | Server error |

---

## 7. Data Models

### CalendarEvent (Unified Response)
```typescript
interface CalendarEvent {
  id: string;
  type: 'event' | 'task' | 'reminder';
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  allDay: boolean;
  eventType?: string;
  location?: string;
  status: string;
  color: string;
  caseId?: string;
  caseName?: string;
  caseNumber?: string;
  priority?: string;
  isOverdue?: boolean;
  createdBy?: UserRef;
  assignedTo?: UserRef;
  attendees?: any[];
}
```

---

## 8. Implementation Checklist

### Calendar API
- [x] `GET /api/calendar` - Unified calendar view
- [x] `GET /api/calendar/date/:date`
- [x] `GET /api/calendar/month/:year/:month`
- [x] `GET /api/calendar/upcoming`
- [x] `GET /api/calendar/overdue`
- [x] `GET /api/calendar/stats`

### Events API
- [x] Events CRUD (Create, Read, Update, Delete)
- [x] Event actions (complete, cancel, postpone)
- [x] RSVP functionality
- [x] Attendee management
- [x] Agenda management
- [x] Action items
- [x] ICS Export (`GET /api/events/:id/export/ics`)
- [x] ICS Import (`POST /api/events/import/ics`)

### Tasks API
- [x] Tasks CRUD
- [x] Task completion
- [x] Subtask management
- [x] Time tracking
- [x] Bulk operations
- [x] Get tasks due today (`GET /api/tasks/due-today`)

### Reminders API
- [x] Reminders CRUD
- [x] Complete/Dismiss/Snooze
- [x] Delegation
- [x] Statistics

### Case Hearings Integration
- [x] Auto-create Event when hearing added
- [x] Auto-create Reminder when hearing added
- [x] Sync updates to linked Event/Reminder
- [x] Delete linked Event/Reminder when hearing deleted

---

## 9. Usage Examples

### Create a Court Hearing (with auto-event/reminder)
```bash
curl -X POST /api/cases/64abc123/hearing \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-01-15T09:00:00Z",
    "location": "محكمة الرياض",
    "notes": "جلسة الاستماع الأولى"
  }'
```

### Export Event to ICS
```bash
curl -X GET /api/events/64def456/export/ics \
  -H "Authorization: Bearer <token>" \
  -o event.ics
```

### Import Events from ICS
```bash
curl -X POST /api/events/import/ics \
  -H "Authorization: Bearer <token>" \
  -F "file=@calendar.ics"
```

### Get Tasks Due Today
```bash
curl -X GET /api/tasks/due-today \
  -H "Authorization: Bearer <token>"
```

---

**Last Updated:** November 27, 2025
