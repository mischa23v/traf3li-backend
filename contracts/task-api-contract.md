# Task API Contract

**Generated:** 2026-01-02
**Purpose:** Verify refactoring doesn't break frontend expectations

---

## Valid Enum Values

### Priority
```javascript
['low', 'medium', 'high', 'urgent']
```

### Status
```javascript
['todo', 'pending', 'in_progress', 'done', 'canceled']
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
| PUT | /bulk | bulkUpdateTasks |
| DELETE | /bulk | bulkDeleteTasks |

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
    "updatedAt": "ISO date"
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
