# Frontend API Guide - Appointments & Calendar

**Generated: 2025-12-31**
**Backend Version: Gold Standard Compliant**

---

## CRITICAL MISMATCHES - FRONTEND MUST FIX

The frontend specification has several field naming mismatches with the actual backend implementation. This document provides the **correct** API contract.

---

## Field Name Corrections

| Frontend Uses (WRONG) | Backend Uses (CORRECT) | Notes |
|------------------------|------------------------|-------|
| `clientName` | `customerName` | Max 200 chars |
| `clientEmail` | `customerEmail` | RFC 5322 compliant |
| `clientPhone` | `customerPhone` | Saudi format |
| `lawyerId` | `assignedTo` | ObjectId of user |
| `type` (appointment type) | `appointmentWith` | `lead`, `client`, `contact` |
| `status: 'pending'` | `status: 'scheduled'` | Default status |
| `date` + `startTime` | `scheduledTime` | Single ISO DateTime |
| `locationType: 'video'` | `locationType: 'virtual'` | See full enum below |
| `source` | NOT IN MODEL | Remove from requests |
| `notes` (on create) | `customerNotes` | Max 1000 chars |

---

## Location Type Enum

| Frontend Uses (WRONG) | Backend Accepts (CORRECT) |
|----------------------|---------------------------|
| `video` | `virtual` |
| `in-person` | `office` OR `client_site` |
| `phone` | `other` |

**Backend enum:** `['office', 'virtual', 'client_site', 'other']`

---

## Status Values

| Frontend Uses | Backend Uses | Meaning |
|---------------|--------------|---------|
| `pending` | `scheduled` | Newly created |
| `confirmed` | `confirmed` | Confirmed |
| `cancelled` | `cancelled` | Cancelled |
| `completed` | `completed` | Done |
| `no_show` | `no_show` | Client didn't show |

---

## Appointment Type vs AppointmentWith

Frontend uses `type` for appointment classification, but backend uses `appointmentWith` for a different purpose:

| Field | Purpose | Values |
|-------|---------|--------|
| `appointmentWith` | Who the appointment is with | `lead`, `client`, `contact` |
| (no equivalent) | Appointment category | Not implemented |

**Frontend should NOT send `type: 'consultation'` etc.** These are not supported.

---

# APPOINTMENTS MODULE - COMPLETE API REFERENCE

## Base URL: `/api/v1/appointments`

---

## 1. GET /available-slots (PRIMARY - Use This!)

**Get available time slots for booking.**

### Request
```
GET /api/v1/appointments/available-slots?lawyerId=XXX&startDate=2025-12-31&endDate=2025-12-31&duration=30
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lawyerId` | ObjectId | **YES** | Valid 24-char ObjectId of lawyer |
| `startDate` | string | **YES** | YYYY-MM-DD format |
| `endDate` | string | **YES** | YYYY-MM-DD format |
| `duration` | number | No | Minutes (default: 30) |
| `date` | string | No | Convenience alias for single day |

**IMPORTANT:** `lawyerId` must be a valid ObjectId. Do NOT send `"current"` or `"me"`. Frontend must send `user._id` from auth context.

### Response
```json
{
  "success": true,
  "data": {
    "slots": [
      {
        "date": "2025-12-31",
        "startTime": "09:00",
        "endTime": "09:30",
        "isAvailable": true,
        "conflictReason": null
      },
      {
        "date": "2025-12-31",
        "startTime": "10:00",
        "endTime": "10:30",
        "isAvailable": false,
        "conflictReason": "booked"
      }
    ],
    "dateRange": {
      "start": "2025-12-31",
      "end": "2025-12-31"
    }
  }
}
```

### Conflict Reasons
- `booked` - Already has appointment
- `blocked` - Lawyer blocked this time
- `past` - Time has already passed

---

## 2. GET /slots (Legacy - CRMSettings Based)

**Alternative slots endpoint using CRMSettings working hours.**

### Request
```
GET /api/v1/appointments/slots?date=2025-12-31&assignedTo=XXX&duration=30
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `date` | string | **YES** | YYYY-MM-DD format |
| `assignedTo` | ObjectId | No | Lawyer ObjectId |
| `duration` | number | No | Minutes (default: 30) |

### Response
```json
{
  "success": true,
  "data": {
    "date": "2025-12-31",
    "dayOfWeek": "wednesday",
    "working": true,
    "workingHours": {
      "enabled": true,
      "start": "09:00",
      "end": "17:00"
    },
    "slots": [
      {
        "start": "09:00",
        "end": "09:30",
        "startTime": "2025-12-31T09:00:00.000Z",
        "endTime": "2025-12-31T09:30:00.000Z",
        "available": true
      }
    ]
  }
}
```

---

## 3. GET / (List Appointments)

### Request
```
GET /api/v1/appointments?status=scheduled&startDate=2025-01-01&endDate=2025-12-31&page=1&limit=50
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | `scheduled`, `confirmed`, `completed`, `cancelled`, `no_show` |
| `startDate` | string | Filter from date (ISO) |
| `endDate` | string | Filter to date (ISO) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 50) |
| `partyId` | ObjectId | Filter by party |
| `caseId` | ObjectId | Filter by case |
| `assignedTo` | ObjectId | Filter by lawyer |

### Response
```json
{
  "success": true,
  "data": {
    "appointments": [
      {
        "_id": "xxx",
        "appointmentNumber": "APT-2025-00001",
        "firmId": "xxx",
        "scheduledTime": "2025-12-31T09:00:00.000Z",
        "endTime": "2025-12-31T09:30:00.000Z",
        "duration": 30,
        "status": "scheduled",
        "customerName": "أحمد محمد",
        "customerEmail": "ahmed@example.com",
        "customerPhone": "+966501234567",
        "appointmentWith": "lead",
        "locationType": "office",
        "assignedTo": {
          "_id": "xxx",
          "firstName": "محمد",
          "lastName": "المحامي",
          "email": "lawyer@example.com"
        },
        "partyId": null,
        "caseId": null,
        "createdBy": { "_id": "xxx", "firstName": "محمد" },
        "createdAt": "2025-12-25T10:00:00.000Z",
        "updatedAt": "2025-12-28T14:30:00.000Z"
      }
    ],
    "total": 45,
    "page": 1,
    "limit": 50
  }
}
```

---

## 4. GET /:id (Single Appointment)

### Request
```
GET /api/v1/appointments/507f1f77bcf86cd799439011
```

### Response
Same structure as list item, plus:
- Full `partyId` populated
- Full `caseId` populated with `title`, `caseNumber`, `description`
- `cancelledBy` if cancelled

---

## 5. POST / (Create Appointment)

### Request Body
```json
{
  "customerName": "أحمد محمد",
  "customerEmail": "ahmed@example.com",
  "customerPhone": "+966501234567",
  "scheduledTime": "2025-12-31T09:00:00.000Z",
  "duration": 30,
  "appointmentWith": "lead",
  "locationType": "virtual",
  "notes": "Initial consultation",
  "assignedTo": "507f1f77bcf86cd799439011",
  "partyId": "507f1f77bcf86cd799439012",
  "caseId": "507f1f77bcf86cd799439013",
  "sendReminder": true
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `customerName` | string | **YES** | Max 200 chars |
| `customerEmail` | string | **YES** | RFC 5322 email |
| `customerPhone` | string | No | Saudi phone format |
| `scheduledTime` | ISO DateTime | **YES** | Must be future |
| `duration` | number | **YES** | 15-480 minutes |
| `appointmentWith` | string | No | `lead`, `client`, `contact` |
| `locationType` | string | No | `office`, `virtual`, `client_site`, `other` |
| `notes` | string | No | Max 1000 chars (saved as `customerNotes`) |
| `assignedTo` | ObjectId | No | Defaults to current user |
| `partyId` | ObjectId | No | Link to Lead/Client/Contact |
| `caseId` | ObjectId | No | Link to Case |
| `sendReminder` | boolean | No | Default: true |

### Response
```json
{
  "success": true,
  "message": "تم إنشاء الموعد بنجاح / Appointment created successfully",
  "data": { /* appointment object */ },
  "calendarLinks": {
    "google": "https://calendar.google.com/...",
    "outlook": "https://outlook.live.com/...",
    "yahoo": "https://calendar.yahoo.com/...",
    "ics": "https://api.traf3li.com/api/v1/appointments/xxx/calendar.ics"
  },
  "calendarSync": {
    "google": { "success": true, "eventId": "xxx" },
    "microsoft": { "success": false, "error": "Not connected" }
  }
}
```

### Conflict Response (409)
```json
{
  "success": false,
  "message": "الوقت المحدد يتعارض مع / Time slot conflicts with: existing appointments",
  "conflicts": [
    {
      "type": "appointment",
      "id": "xxx",
      "reference": "APT-2025-00001",
      "title": "Appointment with Ahmed",
      "startTime": "2025-12-31T09:00:00.000Z",
      "endTime": "2025-12-31T09:30:00.000Z"
    }
  ]
}
```

---

## 6. PUT /:id (Update Appointment)

### Request Body (All Optional)
```json
{
  "customerName": "Updated Name",
  "customerEmail": "new@example.com",
  "customerPhone": "+966509876543",
  "scheduledTime": "2025-12-31T10:00:00.000Z",
  "duration": 45,
  "locationType": "office",
  "notes": "Updated notes"
}
```

**Note:** Status changes should use dedicated endpoints (`/confirm`, `/complete`, `/no-show`).

---

## 7. DELETE /:id (Cancel Appointment)

### Request Body (Optional)
```json
{
  "reason": "Client requested cancellation"
}
```

### Response
```json
{
  "success": true,
  "message": "تم إلغاء الموعد بنجاح / Appointment cancelled successfully",
  "data": {
    "_id": "xxx",
    "status": "cancelled",
    "cancelledAt": "2025-12-30T10:00:00.000Z",
    "cancelledBy": "xxx",
    "cancellationReason": "Client requested cancellation"
  },
  "calendarSync": { /* sync result */ }
}
```

---

## 8. PUT /:id/confirm

Confirm a scheduled appointment.

### Response
```json
{
  "success": true,
  "message": "تم تأكيد الموعد / Appointment confirmed",
  "data": { /* appointment with status: 'confirmed' */ },
  "calendarSync": { /* sync result */ }
}
```

---

## 9. PUT /:id/complete

Mark appointment as completed.

### Request Body (Optional)
```json
{
  "outcome": "Session completed successfully",
  "followUpRequired": true,
  "followUpDate": "2026-01-15T09:00:00.000Z"
}
```

---

## 10. PUT /:id/no-show

Mark client as no-show.

---

## 11. POST /:id/reschedule

### Request Body
```json
{
  "date": "2026-01-05",
  "startTime": "14:00"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `date` | string | **YES** | YYYY-MM-DD |
| `startTime` | string | **YES** | HH:MM (24-hour) |

**Note:** Backend combines these into a new `scheduledTime`.

---

## 12. POST /book/:firmId (Public Booking)

**No authentication required.**

### Request Body
```json
{
  "customerName": "New Client",
  "customerEmail": "client@example.com",
  "customerPhone": "+966501234567",
  "scheduledTime": "2025-12-31T09:00:00.000Z",
  "duration": 30,
  "notes": "Initial inquiry"
}
```

### Response
```json
{
  "success": true,
  "message": "تم حجز الموعد بنجاح / Appointment booked successfully",
  "data": {
    "appointmentNumber": "APT-2025-00123",
    "scheduledTime": "2025-12-31T09:00:00.000Z",
    "duration": 30,
    "status": "scheduled"
  },
  "calendarLinks": { /* links */ },
  "calendarSync": { /* sync result */ }
}
```

---

# AVAILABILITY MANAGEMENT

## 13. GET /availability

Get lawyer's weekly availability schedule.

### Request
```
GET /api/v1/appointments/availability?lawyerId=XXX
```

### Response
```json
{
  "success": true,
  "data": [
    {
      "_id": "xxx",
      "lawyerId": "xxx",
      "dayOfWeek": 0,
      "startTime": "09:00",
      "endTime": "17:00",
      "isActive": true,
      "slotDuration": 30,
      "breakBetweenSlots": 5
    }
  ]
}
```

---

## 14. POST /availability

### Request Body
```json
{
  "dayOfWeek": 0,
  "startTime": "09:00",
  "endTime": "17:00",
  "slotDuration": 30,
  "breakBetweenSlots": 5,
  "isActive": true,
  "targetLawyerId": "xxx"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `dayOfWeek` | number | 0=Sunday, 1=Monday, ..., 6=Saturday |
| `startTime` | string | HH:MM format |
| `endTime` | string | HH:MM format |
| `slotDuration` | number | Minutes per slot |
| `breakBetweenSlots` | number | Buffer minutes |
| `isActive` | boolean | Is day active |
| `targetLawyerId` | ObjectId | For firm admins managing others |

---

## 15. POST /availability/bulk

Replace entire week schedule.

### Request Body
```json
{
  "slots": [
    { "dayOfWeek": 0, "startTime": "09:00", "endTime": "17:00", "isActive": true },
    { "dayOfWeek": 6, "isActive": false }
  ],
  "targetLawyerId": "xxx"
}
```

---

## 16. PUT /availability/:id

Update single availability slot.

---

## 17. DELETE /availability/:id

Delete availability slot.

---

# BLOCKED TIMES

## 18. GET /blocked-times

### Request
```
GET /api/v1/appointments/blocked-times?startDate=2025-12-01&endDate=2025-12-31
```

---

## 19. POST /blocked-times

### Request Body
```json
{
  "startDateTime": "2025-12-25T00:00:00.000Z",
  "endDateTime": "2025-12-26T23:59:59.000Z",
  "reason": "Holiday",
  "isAllDay": true,
  "isRecurring": false,
  "targetLawyerId": "xxx"
}
```

For recurring:
```json
{
  "startDateTime": "2025-01-03T12:00:00.000Z",
  "endDateTime": "2025-01-03T13:00:00.000Z",
  "reason": "Weekly team meeting",
  "isRecurring": true,
  "recurrencePattern": {
    "frequency": "weekly",
    "interval": 1,
    "endDate": "2025-12-31"
  }
}
```

---

## 20. DELETE /blocked-times/:id

---

# SETTINGS

## 21. GET /settings

### Response
```json
{
  "success": true,
  "data": {
    "lawyerId": "xxx",
    "enabled": true,
    "defaultDuration": 30,
    "allowedDurations": [15, 30, 45, 60],
    "advanceBookingDays": 30,
    "minAdvanceBookingHours": 24,
    "bufferBetweenAppointments": 15,
    "sendReminders": true,
    "reminderHoursBefore": 24,
    "publicBookingEnabled": false
  }
}
```

---

## 22. PUT /settings

### Request Body
```json
{
  "enabled": true,
  "defaultDuration": 45,
  "allowedDurations": [30, 45, 60],
  "advanceBookingDays": 60,
  "minAdvanceBookingHours": 48,
  "bufferBetweenAppointments": 10,
  "sendReminders": true,
  "reminderHoursBefore": 48,
  "publicBookingEnabled": true,
  "requirePhoneVerification": false
}
```

---

# STATISTICS

## 23. GET /stats

### Request
```
GET /api/v1/appointments/stats?startDate=2025-01-01&endDate=2025-12-31
```

### Response
```json
{
  "success": true,
  "data": {
    "total": 250,
    "pending": 12,
    "confirmed": 45,
    "completed": 180,
    "cancelled": 10,
    "noShow": 3,
    "todayCount": 5,
    "weekCount": 18,
    "monthCount": 45
  }
}
```

**Note:** `pending` maps to `status: 'scheduled'` in backend.

---

# CALENDAR INTEGRATION

## 24. GET /calendar-status

Check user's calendar connections.

### Response
```json
{
  "success": true,
  "data": {
    "connections": {
      "google": {
        "connected": true,
        "email": "user@gmail.com",
        "expiresAt": "2026-01-15T00:00:00.000Z"
      },
      "microsoft": {
        "connected": false
      }
    },
    "message": {
      "en": "Calendar connected. Appointments will sync automatically.",
      "ar": "التقويم متصل. ستتم مزامنة المواعيد تلقائياً."
    }
  }
}
```

---

## 25. GET /:id/calendar-links

Get "Add to Calendar" links.

### Response
```json
{
  "success": true,
  "data": {
    "appointmentId": "xxx",
    "appointmentNumber": "APT-2025-00001",
    "scheduledTime": "2025-12-31T09:00:00.000Z",
    "links": {
      "google": { "url": "https://...", "label": "Add to Google Calendar" },
      "outlook": { "url": "https://...", "label": "Add to Outlook" },
      "yahoo": { "url": "https://...", "label": "Add to Yahoo Calendar" },
      "ics": { "url": "https://...", "label": "Download .ics" }
    }
  }
}
```

---

## 26. GET /:id/calendar.ics

Download ICS file (works with Apple Calendar, Outlook).

**Returns:** `text/calendar` file

---

## 27. POST /:id/sync-calendar

Manually sync appointment to connected calendars.

### Response
```json
{
  "success": true,
  "message": "تم مزامنة الموعد بنجاح / Appointment synced successfully",
  "data": {
    "appointmentId": "xxx",
    "appointmentNumber": "APT-2025-00001",
    "syncResult": {
      "google": { "success": true, "eventId": "xxx" },
      "microsoft": { "success": true, "eventId": "yyy" }
    }
  }
}
```

---

# CALENDAR MODULE

## Base URL: `/api/v1/calendar`

All optimized endpoints are **IMPLEMENTED**.

---

## Legacy Endpoints (Full Data)

| Endpoint | Description |
|----------|-------------|
| `GET /` | Unified calendar view |
| `GET /date/:date` | Items for specific date |
| `GET /month/:year/:month` | Items for month |
| `GET /upcoming?days=7` | Upcoming items |
| `GET /overdue` | Overdue items |
| `GET /stats` | Statistics |

---

## Optimized Endpoints (IMPLEMENTED!)

### GET /grid-summary

Counts only - for calendar badges.

```
GET /api/v1/calendar/grid-summary?startDate=2025-12-01&endDate=2025-12-31&types=event,task
```

### Response
```json
{
  "success": true,
  "data": {
    "days": [
      {
        "date": "2025-12-01",
        "total": 5,
        "events": 2,
        "tasks": 2,
        "reminders": 1,
        "caseDocuments": 0,
        "hasHighPriority": true,
        "hasOverdue": false
      }
    ],
    "totalDays": 31,
    "dateRange": { "start": "...", "end": "..." }
  },
  "cached": true
}
```

---

### GET /grid-items

Minimal event data (~150 bytes/item).

```
GET /api/v1/calendar/grid-items?startDate=2025-12-01&endDate=2025-12-31&types=event,task&caseId=XXX
```

---

### GET /item/:type/:id

Full details on click (lazy-load).

```
GET /api/v1/calendar/item/event/507f1f77bcf86cd799439011
```

Types: `event`, `task`, `reminder`, `case-document`

---

### GET /list

Cursor-based pagination for infinite scroll.

```
GET /api/v1/calendar/list?cursor=XXX&limit=20&types=event,task&sortOrder=asc&priority=high&status=pending
```

### Response
```json
{
  "success": true,
  "data": [ /* items */ ],
  "pagination": {
    "cursor": "next-cursor-token",
    "hasMore": true,
    "limit": 20,
    "count": 20
  },
  "filters": {
    "types": ["event", "task"],
    "priority": "high",
    "status": "pending",
    "dateRange": { "start": "...", "end": "..." }
  }
}
```

---

### GET /sidebar-data

Combined calendar events + reminders (replaces 2 API calls).

```
GET /api/v1/calendar/sidebar-data?startDate=2025-12-31&endDate=2026-01-05&reminderDays=7
```

---

# ERROR RESPONSE FORMAT

All errors return:

```json
{
  "success": false,
  "message": "Error message in English / رسالة الخطأ بالعربية",
  "error": "Technical details (optional)"
}
```

For conflicts (409):
```json
{
  "success": false,
  "message": "Conflict description",
  "conflicts": [ /* array of conflicting items */ ]
}
```

---

# AUTHENTICATION

All endpoints (except `/book/:firmId` and `/:id/calendar.ics`) require authentication via JWT token in header:

```
Authorization: Bearer <token>
```

---

# SUMMARY: What Frontend Must Fix

1. **Field Names:**
   - `clientName` → `customerName`
   - `clientEmail` → `customerEmail`
   - `clientPhone` → `customerPhone`
   - `lawyerId` → `assignedTo`

2. **Enums:**
   - `locationType: 'video'` → `'virtual'`
   - `status: 'pending'` → `'scheduled'`

3. **Date Format:**
   - Combine `date` + `startTime` into single `scheduledTime` ISO DateTime

4. **Remove Non-Existent Fields:**
   - `source` - Not in model
   - `type: 'consultation'` etc. - Not supported

5. **ObjectIds:**
   - Always send valid 24-char ObjectId, never `"current"` or `"me"`

---

# Optimized Calendar Endpoints - READY TO USE

The frontend spec marked these as "BACKEND-PENDING" but they are **FULLY IMPLEMENTED**:

| Endpoint | Status |
|----------|--------|
| `GET /calendar/grid-summary` | IMPLEMENTED |
| `GET /calendar/grid-items` | IMPLEMENTED |
| `GET /calendar/item/:type/:id` | IMPLEMENTED |
| `GET /calendar/list` | IMPLEMENTED |
| `GET /calendar/sidebar-data` | IMPLEMENTED (BONUS) |

Frontend can start using these immediately for better performance.
