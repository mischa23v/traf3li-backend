# Task API Contract

**Generated:** 2026-01-02
**Purpose:** Verify refactoring doesn't break frontend expectations

---

## Valid Enum Values

### Priority
```javascript
['none', 'low', 'medium', 'high', 'critical']
```

### Status
```javascript
['backlog', 'todo', 'in_progress', 'done', 'canceled']
```

---

## Allowed Request Body Fields

### POST /api/tasks (Create Task)
```javascript
[
    'title', 'description', 'priority', 'status', 'label', 'tags',
    'dueDate', 'dueTime', 'startDate', 'assignedTo', 'caseId', 'clientId',
    'parentTaskId', 'subtasks', 'checklists', 'timeTracking', 'recurring',
    'reminders', 'notes', 'points'
]
```

### PUT/PATCH /api/tasks/:id (Update Task)
```javascript
[
    'title', 'description', 'status', 'priority', 'label', 'tags',
    'dueDate', 'dueTime', 'startDate', 'assignedTo', 'caseId', 'clientId',
    'subtasks', 'checklists', 'timeTracking', 'recurring', 'reminders',
    'notes', 'points', 'progress'
]
```

### POST /api/tasks/:id/complete
```javascript
['completionNote']
```

### POST /api/tasks/:id/subtasks (Add Subtask)
```javascript
['title', 'autoReset']
```

### PATCH /api/tasks/:id/subtasks/:subtaskId (Update Subtask)
```javascript
['title', 'completed']
```

### POST /api/tasks/:id/timer/start
```javascript
['notes']
```

### POST /api/tasks/:id/timer/stop
```javascript
['notes', 'isBillable']
```

### POST /api/tasks/:id/time (Manual Time Entry)
```javascript
['minutes', 'notes', 'date', 'isBillable']
```

### POST /api/tasks/:id/comments
```javascript
['content', 'text', 'mentions']
```

### PUT /api/tasks/:id/comments/:commentId
```javascript
['content', 'text']
```

### PUT /api/tasks/bulk (Bulk Update)
```javascript
// Request wrapper
['taskIds', 'updates']

// Allowed update fields
['status', 'priority', 'assignedTo', 'dueDate', 'label', 'tags']
```

### DELETE /api/tasks/bulk (Bulk Delete)
```javascript
['taskIds']
```

### POST /api/tasks/templates (Create Template)
```javascript
[
    'title', 'templateName', 'description', 'priority', 'label', 'tags',
    'subtasks', 'checklists', 'timeTracking', 'reminders', 'notes', 'isPublic'
]
```

### PUT/PATCH /api/tasks/templates/:templateId (Update Template)
```javascript
[
    'title', 'templateName', 'description', 'priority', 'label', 'tags',
    'subtasks', 'checklists', 'timeTracking', 'reminders', 'notes', 'isPublic'
]
```

### POST /api/tasks/templates/:templateId/create (Create from Template)
```javascript
['title', 'dueDate', 'dueTime', 'assignedTo', 'caseId', 'clientId', 'notes']
```

### POST /api/tasks/:id/save-as-template
```javascript
['templateName', 'isPublic']
```

### POST /api/tasks/:id/dependencies (Add Dependency)
```javascript
['dependsOn', 'type']
```

### PATCH /api/tasks/:id/status (Update Status)
```javascript
['status']
```

### PATCH /api/tasks/:id/progress (Update Progress)
```javascript
['progress', 'autoCalculate']
```

---

## API Endpoints

### Templates
| Method | Endpoint | Handler |
|--------|----------|---------|
| GET | /templates | getTemplates |
| POST | /templates | createTemplate |
| GET | /templates/:templateId | getTemplate |
| PUT/PATCH | /templates/:templateId | updateTemplate |
| DELETE | /templates/:templateId | deleteTemplate |
| POST | /templates/:templateId/create | createFromTemplate |

### Overview & Stats
| Method | Endpoint | Handler |
|--------|----------|---------|
| GET | /overview | getTasksOverview |
| GET | /stats | getTaskStats |
| GET | /upcoming | getUpcomingTasks |
| GET | /overdue | getOverdueTasks |
| GET | /due-today | getTasksDueToday |
| GET | /case/:caseId | getTasksByCase |

### Bulk Operations
| Method | Endpoint | Handler |
|--------|----------|---------|
| POST | /bulk | bulkCreateTasks |
| PUT | /bulk | bulkUpdateTasks |
| DELETE | /bulk | bulkDeleteTasks |
| POST | /bulk/complete | bulkCompleteTasks |
| POST | /bulk/assign | bulkAssignTasks |
| POST | /bulk/archive | bulkArchiveTasks |
| POST | /bulk/unarchive | bulkUnarchiveTasks |

### Export & Select All
| Method | Endpoint | Handler |
|--------|----------|---------|
| GET | /export | exportTasks |
| GET | /ids | getAllTaskIds |
| GET | /archived | getArchivedTasks |
| PATCH | /reorder | reorderTasks |

### AI/NLP Features
| Method | Endpoint | Handler |
|--------|----------|---------|
| POST | /parse | createTaskFromNaturalLanguage |
| POST | /voice | createTaskFromVoice |
| GET | /smart-schedule | getSmartScheduleSuggestions |
| POST | /auto-schedule | autoScheduleTasks |
| POST | /voice-to-item | processVoiceToItem |
| POST | /voice-to-item/batch | batchProcessVoiceMemos |

### Core CRUD
| Method | Endpoint | Handler |
|--------|----------|---------|
| POST | / | createTask |
| GET | / | getTasks |
| GET | /:id/full | getTaskFull |
| GET | /:id | getTask |
| PUT/PATCH | /:id | updateTask |
| DELETE | /:id | deleteTask |

### Task Actions
| Method | Endpoint | Handler |
|--------|----------|---------|
| POST | /:id/complete | completeTask |
| POST | /:id/reopen | reopenTask |
| POST | /:id/clone | cloneTask |
| POST | /:id/reschedule | rescheduleTask |
| POST | /:id/archive | archiveTask |
| POST | /:id/unarchive | unarchiveTask |
| GET | /:id/activity | getTaskActivity |
| POST | /:id/convert-to-event | convertTaskToEvent |

### Subtasks
| Method | Endpoint | Handler |
|--------|----------|---------|
| POST | /:id/subtasks | addSubtask |
| PATCH | /:id/subtasks/:subtaskId/toggle | toggleSubtask |
| DELETE | /:id/subtasks/:subtaskId | deleteSubtask |

### Time Tracking
| Method | Endpoint | Handler |
|--------|----------|---------|
| POST | /:id/timer/start | startTimer |
| POST | /:id/timer/stop | stopTimer |
| POST | /:id/time | addManualTime |

### Comments
| Method | Endpoint | Handler |
|--------|----------|---------|
| POST | /:id/comments | addComment |
| PUT | /:id/comments/:commentId | updateComment |
| DELETE | /:id/comments/:commentId | deleteComment |

### Attachments
| Method | Endpoint | Handler |
|--------|----------|---------|
| POST | /:id/attachments | addAttachment |
| GET | /:id/attachments/:attachmentId/download-url | getAttachmentDownloadUrl |
| GET | /:id/attachments/:attachmentId/versions | getAttachmentVersions |
| DELETE | /:id/attachments/:attachmentId | deleteAttachment |

### Documents
| Method | Endpoint | Handler |
|--------|----------|---------|
| POST | /:id/documents | createDocument |
| GET | /:id/documents | getDocuments |
| GET | /:id/documents/:documentId | getDocument |
| PATCH | /:id/documents/:documentId | updateDocument |
| GET | /:id/documents/:documentId/versions | getDocumentVersions |
| GET | /:id/documents/:documentId/versions/:versionId | getDocumentVersion |
| POST | /:id/documents/:documentId/versions/:versionId/restore | restoreDocumentVersion |

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

### Task Object Shape
```json
{
    "_id": "ObjectId",
    "title": "string",
    "description": "string (HTML allowed)",
    "priority": "low|medium|high|urgent",
    "status": "todo|pending|in_progress|done|canceled",
    "label": "string",
    "tags": ["string"],
    "dueDate": "ISO date",
    "dueTime": "HH:mm",
    "startDate": "ISO date",
    "assignedTo": { "_id": "...", "firstName": "...", "lastName": "...", "email": "...", "image": "..." },
    "createdBy": { "_id": "...", "firstName": "...", "lastName": "...", "email": "...", "image": "..." },
    "caseId": { "_id": "...", "title": "...", "caseNumber": "..." },
    "clientId": { "_id": "...", "firstName": "...", "lastName": "..." },
    "subtasks": [{ "_id": "...", "title": "...", "completed": false, "autoReset": false }],
    "checklists": [...],
    "timeTracking": {
        "estimatedMinutes": 0,
        "actualMinutes": 0,
        "isTracking": false,
        "sessions": [...]
    },
    "recurring": { ... },
    "reminders": [...],
    "notes": "string (HTML allowed)",
    "points": 0,
    "progress": 0,
    "comments": [...],
    "history": [...],
    "linkedEventId": "ObjectId",
    "createdAt": "ISO date",
    "updatedAt": "ISO date",
    "isArchived": false,
    "archivedAt": "ISO date (null if not archived)",
    "archivedBy": { "_id": "...", "firstName": "...", "lastName": "..." },
    "sortOrder": 0
}
```

---

## Verification Checklist

After refactoring, verify:

- [ ] All endpoints still work
- [ ] Field names match frontend expectations
- [ ] Enum values haven't changed
- [ ] Response shapes are identical
- [ ] Error messages are consistent

### Quick Verification Commands

```bash
# Check constants match this contract
grep -A5 "VALID_PRIORITIES\|VALID_STATUSES" src/controllers/task.controller.js

# Check ALLOWED_FIELDS object
grep -A30 "const ALLOWED_FIELDS" src/controllers/task.controller.js

# Verify no syntax errors
node --check src/controllers/task.controller.js
```

---

## Change Log

| Date | Change | Breaking? |
|------|--------|-----------|
| 2026-01-02 | Extracted inline arrays to ALLOWED_FIELDS constant | No |
| 2026-01-02 | Extracted validation arrays to VALID_PRIORITIES/VALID_STATUSES | No |
| 2026-01-04 | Added missing endpoints for feature parity | No |
| 2026-01-05 | Added bulk complete, assign, archive, unarchive endpoints | No |
| 2026-01-05 | Added export endpoint (CSV/Excel/PDF/JSON) | No |
| 2026-01-05 | Added getAllTaskIds for "Select All" feature | No |
| 2026-01-05 | Added drag & drop reorder endpoint | No |
| 2026-01-05 | Added isArchived, archivedAt, archivedBy, sortOrder fields to Task model | No |
| 2026-01-06 | Added POST /:id/reopen endpoint for reopening completed/canceled tasks | No |
| 2026-01-06 | Fixed enum values in contract to match actual model (priority: none/critical, status: backlog) | No |

---

## NEW: Bulk Operations & Features (2026-01-05)

### POST /api/tasks/bulk/complete
Bulk mark multiple tasks as completed.
```javascript
// Request body
{
    "taskIds": ["id1", "id2", ...],
    "completionNote": "Optional note" // optional
}
// Max 100 tasks per request
```

**Response:**
```json
{
    "success": true,
    "message": "X task(s) completed successfully",
    "data": {
        "completed": 10,
        "failed": 2,
        "failedIds": ["id1", "id2"]
    }
}
```

### POST /api/tasks/bulk/assign
Bulk reassign multiple tasks to a different team member.
```javascript
// Request body
{
    "taskIds": ["id1", "id2", ...],
    "assignedTo": "userId"
}
// Max 100 tasks per request
```

**Response:**
```json
{
    "success": true,
    "message": "X task(s) assigned successfully",
    "data": {
        "assigned": 10,
        "assignedTo": { "_id": "...", "firstName": "...", "lastName": "...", "email": "..." },
        "failed": 0
    }
}
```

### POST /api/tasks/bulk/archive
Bulk archive multiple tasks (soft delete).
```javascript
// Request body
{
    "taskIds": ["id1", "id2", ...]
}
// Max 100 tasks per request
```

**Response:**
```json
{
    "success": true,
    "message": "X task(s) archived successfully",
    "data": {
        "archived": 10,
        "failed": 2,
        "failedIds": ["id1", "id2"]
    }
}
```

### POST /api/tasks/bulk/unarchive
Bulk restore archived tasks.
```javascript
// Request body
{
    "taskIds": ["id1", "id2", ...]
}
// Max 100 tasks per request
```

**Response:**
```json
{
    "success": true,
    "message": "X task(s) unarchived successfully",
    "data": {
        "unarchived": 10,
        "failed": 0
    }
}
```

### POST /api/tasks/:id/archive
Archive a single task (soft delete).

**Response:**
```json
{
    "success": true,
    "message": "Task archived successfully",
    "data": { /* task */ }
}
```

### POST /api/tasks/:id/unarchive
Restore a single archived task.

**Response:**
```json
{
    "success": true,
    "message": "Task unarchived successfully",
    "data": { /* task */ }
}
```

### GET /api/tasks/archived
List all archived tasks with pagination.
```
Query params:
- page (default: 1)
- limit (default: 50)
- sortBy (default: archivedAt)
- sortOrder (default: desc)
```

**Response:**
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

### GET /api/tasks/ids
Get all task IDs matching current filters (for "Select All" feature).
```
Query params: Same as GET /api/tasks
- status, priority, label, assignedTo, caseId, clientId
- overdue, search, startDate, endDate
- isArchived (true/only/false)
```

**Response:**
```json
{
    "success": true,
    "message": "Found X task(s)",
    "data": {
        "taskIds": ["id1", "id2", ...],
        "count": 150
    }
}
```

### GET /api/tasks/export
Export tasks to CSV, Excel, PDF, or JSON.
```
Query params:
- format: csv | xlsx | pdf | json (default: csv)
- fields: comma-separated list of fields to include (optional)
- All filter params from GET /api/tasks
```

**Response for CSV:**
Downloads CSV file directly.

**Response for xlsx/pdf:**
```json
{
    "success": true,
    "format": "xlsx",
    "message": "Excel export data ready. Use xlsx library to generate file.",
    "exportDate": "ISO date",
    "totalRecords": 100,
    "headers": ["Title", "Status", ...],
    "data": [...]
}
```

**Response for JSON:**
Downloads JSON file directly.

### PATCH /api/tasks/reorder
Reorder tasks for drag & drop functionality.
```javascript
// Request body
{
    "reorderItems": [
        { "taskId": "id1", "sortOrder": 0 },
        { "taskId": "id2", "sortOrder": 1 },
        { "taskId": "id3", "sortOrder": 2 }
    ]
}
// Max 100 tasks per request
```

**Response:**
```json
{
    "success": true,
    "message": "X task(s) reordered successfully",
    "data": {
        "modified": 3,
        "matched": 3
    }
}
```

---

## NEW: Additional Endpoints (2026-01-04)

### POST /api/tasks/bulk (Bulk Create)
```javascript
// Request body
{ "tasks": [...] }

// Each task in array follows same fields as POST /api/tasks
// Max 50 tasks per request
```

**Response:**
```json
{
    "success": true,
    "message": "X task(s) created successfully",
    "data": {
        "created": 10,
        "failed": 2,
        "tasks": [...],
        "errors": [{ "index": 3, "title": "...", "error": "..." }]
    }
}
```

### POST /api/tasks/:id/reschedule
```javascript
['newDueDate', 'newDueTime', 'reason']
```

**Response:**
```json
{
    "success": true,
    "message": "Task rescheduled successfully",
    "data": { /* task */ },
    "previousDueDate": "ISO date",
    "previousDueTime": "HH:mm"
}
```

### GET /api/tasks/conflicts
```
Query params:
- userIds (optional): comma-separated list of user IDs
- dueDate (optional): specific date
- dueDateStart (optional): range start
- dueDateEnd (optional): range end
```

**Response:**
```json
{
    "success": true,
    "data": {
        "hasConflicts": true,
        "totalTasks": 15,
        "tasksByUser": { "userId1": [...], "userId2": [...] },
        "overloadedDates": { "2026-01-05": { "userId1": [...] } },
        "filters": { ... }
    }
}
```

### GET /api/tasks/search
```
Query params:
- q: search query
- status, priority, assignedTo, caseId, clientId: filters
- startDate, endDate: date range
- overdue: "true"/"false"
- hasAttachments, hasComments: "true"/"false"
- page, limit, sortBy, sortOrder: pagination
```

### POST /api/tasks/:id/clone
```javascript
['title', 'resetDueDate', 'includeSubtasks', 'includeChecklists', 'includeAttachments']
```

### GET /api/tasks/:id/activity
```
Query params: page, limit
```

**Response:**
```json
{
    "success": true,
    "data": [{ "action": "...", "userId": "...", "timestamp": "...", "user": {...} }],
    "pagination": { ... }
}
```

### POST /api/tasks/:id/convert-to-event
```javascript
['eventType', 'duration', 'attendees', 'location']
```

### GET /api/tasks/client/:clientId
```
Query params: page, limit, status, priority
```

### PATCH /api/tasks/:id/timer/pause
```javascript
['reason']
```

### PATCH /api/tasks/:id/timer/resume
```javascript
['notes']
```

### GET /api/tasks/timers/active
Returns all tasks with active timers for current user.

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
status, priority, type, caseId, clientId, assignedTo,
createdBy, lawyerId, tags, category, dueDate, dateRange
```

### Examples

| Request | Classification | Rate Limit |
|---------|---------------|------------|
| `GET /tasks` | General | 400/min |
| `GET /tasks?status=todo` | Search/Filter | 120/min |
| `GET /tasks?search=contract` | Search/Filter | 120/min |
| `GET /tasks?priority=high&status=in_progress` | Search/Filter | 120/min |
| `POST /tasks` | General (write) | 400/min |
| `PUT /tasks/:id` | General (write) | 400/min |

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

## NEW: Location Trigger & Calendar Sync (2026-01-05)

### Schema Additions

Tasks now support location-based triggers (matching Reminders) and calendar synchronization (matching Events):

```javascript
// Location (for location-based reminders)
location: {
    name: String,
    address: String,
    latitude: Number,
    longitude: Number,
    room: String,
    instructions: String,
    savedLocationId: ObjectId  // Reference to UserLocation
}

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

// Calendar Sync
calendarSync: {
    googleCalendarId: String,
    outlookEventId: String,
    appleCalendarId: String,
    iCalUid: String,
    lastSyncedAt: Date,
    syncStatus: 'synced' | 'pending' | 'failed' | 'not_synced'
}
```

### PUT /api/tasks/:id/location-trigger

Configure location-based trigger for a task.

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
    "repeatTrigger": true,
    "cooldownMinutes": 120
}
```

**Response:**
```json
{
    "success": true,
    "message": "Location trigger updated successfully",
    "data": { /* task object */ }
}
```

### POST /api/tasks/:id/location/check

Check if current location should trigger the task's location alert.

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
        "taskId": "...",
        "title": "Review contract at client office",
        "locationTrigger": { ... },
        "location": { ... }
    }
}
```

### GET /api/tasks/location-triggers

Get all tasks with location triggers enabled (for mobile app background polling).

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
            "title": "...",
            "location": { ... },
            "locationTrigger": { ... }
        }
    ]
}
```

### POST /api/tasks/location/check

Bulk check all user's tasks against current location.

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
        { /* triggered task */ }
    ]
}
```

### Updated Endpoint Summary

| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| PUT | /:id/location-trigger | updateLocationTrigger | Configure location trigger |
| POST | /:id/location/check | checkLocationTrigger | Check single task location |
| GET | /location-triggers | getTasksWithLocationTriggers | Get all location-enabled tasks |
| POST | /location/check | bulkCheckLocationTriggers | Bulk check all tasks |

---

## NEW: Task Reopen Endpoint (2026-01-06)

### POST /api/tasks/:id/reopen

Reopen a completed or canceled task, setting its status back to `in_progress`.

**Use Cases:**
- Task was marked complete by mistake
- Additional work is required on a completed task
- Canceled task needs to be revisited

**Constraints:**
- Only tasks with status `done` or `canceled` can be reopened
- Progress value is preserved (not reset to 0)
- History is updated with `reopened` action

**Request Body:**
```javascript
// No body required - empty object acceptable
{}
```

**Success Response (200):**
```json
{
    "success": true,
    "message": "Task reopened successfully | تم إعادة فتح المهمة بنجاح",
    "data": {
        "_id": "...",
        "title": "...",
        "status": "in_progress",
        "completedAt": null,
        "completedBy": null,
        "progress": 75,
        "history": [
            {
                "action": "reopened",
                "userId": "...",
                "oldValue": { "status": "done" },
                "newValue": { "status": "in_progress" },
                "timestamp": "2026-01-06T..."
            }
        ],
        "assignedTo": { "_id": "...", "firstName": "...", "lastName": "..." },
        "createdBy": { "_id": "...", "firstName": "...", "lastName": "..." }
    }
}
```

**Error Response (400) - Invalid Status:**
```json
{
    "success": false,
    "message": "Only completed or canceled tasks can be reopened | يمكن إعادة فتح المهام المكتملة أو الملغاة فقط"
}
```

**Error Response (404) - Task Not Found:**
```json
{
    "success": false,
    "message": "Task not found | المهمة غير موجودة"
}
```

### Related Endpoints

| Endpoint | Description |
|----------|-------------|
| POST /:id/complete | Complete a task (sets status to `done`) |
| POST /:id/reopen | Reopen a completed/canceled task (sets status to `in_progress`) |
| PATCH /:id/status | Update task status to any valid value |
