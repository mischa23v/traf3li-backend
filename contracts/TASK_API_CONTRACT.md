# Task API Contract (v1.0)

**Base URL:** `/api/tasks`
**Authentication:** Bearer Token (JWT)
**Tenant Isolation:** Automatic via `req.firmQuery` (firmId for firm members, lawyerId for solo lawyers)

---

## Enums (Source of Truth: Model Schema)

### Status
```javascript
['backlog', 'todo', 'in_progress', 'done', 'canceled']
// Default: 'todo'
```

### Priority
```javascript
['none', 'low', 'medium', 'high', 'critical']
// Default: 'medium'
```

### Label
```javascript
['bug', 'feature', 'documentation', 'enhancement', 'question', 'legal', 'administrative', 'urgent']
// Optional
```

### Task Type
```javascript
['general', 'court_hearing', 'document_review', 'client_meeting',
 'filing_deadline', 'appeal_deadline', 'discovery', 'deposition',
 'mediation', 'settlement', 'research', 'drafting', 'other']
// Default: 'general'
```

### Recurring Frequency
```javascript
['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom']
```

### Outcome
```javascript
['successful', 'unsuccessful', 'appealed', 'settled', 'dismissed', null]
```

---

## Endpoints

### Core CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create task |
| GET | `/` | List tasks (paginated) |
| GET | `/:id` | Get single task |
| GET | `/:id/full` | Get task with all related data |
| PUT/PATCH | `/:id` | Update task |
| DELETE | `/:id` | Delete task |

### Task Actions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/:id/complete` | Mark task complete |
| PATCH | `/:id/status` | Update status only |
| PATCH | `/:id/progress` | Update progress |
| PATCH | `/:id/outcome` | Update outcome |
| PATCH | `/:id/estimate` | Update time estimate |

### Subtasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/:id/subtasks` | Add subtask |
| PATCH | `/:id/subtasks/:subtaskId` | Update subtask |
| PATCH | `/:id/subtasks/:subtaskId/toggle` | Toggle completion |
| DELETE | `/:id/subtasks/:subtaskId` | Delete subtask |

### Time Tracking

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/:id/timer/start` | Start timer |
| POST | `/:id/timer/stop` | Stop timer |
| POST | `/:id/time` | Add manual time |
| GET | `/:id/time-tracking/summary` | Get time summary |

### Comments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/:id/comments` | Add comment |
| PUT | `/:id/comments/:commentId` | Update comment |
| DELETE | `/:id/comments/:commentId` | Delete comment |

### Attachments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/:id/attachments` | Upload file (multipart) |
| GET | `/:id/attachments/:attachmentId/download-url` | Get download URL |
| GET | `/:id/attachments/:attachmentId/versions` | Get file versions |
| DELETE | `/:id/attachments/:attachmentId` | Delete attachment |

### Documents (In-App Editor)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/:id/documents` | Create document |
| GET | `/:id/documents` | List documents |
| GET | `/:id/documents/:documentId` | Get document |
| PATCH | `/:id/documents/:documentId` | Update document |
| GET | `/:id/documents/:documentId/versions` | Get versions |
| POST | `/:id/documents/:documentId/versions/:versionId/restore` | Restore version |

### Voice Memos

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/:id/voice-memos` | Upload voice memo |
| PATCH | `/:id/voice-memos/:memoId/transcription` | Update transcription |

### Dependencies

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/:id/dependencies` | Add dependency |
| DELETE | `/:id/dependencies/:dependencyTaskId` | Remove dependency |

### Workflow

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/:id/workflow-rules` | Add workflow rule |

### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/templates` | List templates |
| POST | `/templates` | Create template |
| GET | `/templates/:templateId` | Get template |
| PUT/PATCH | `/templates/:templateId` | Update template |
| DELETE | `/templates/:templateId` | Delete template |
| POST | `/templates/:templateId/create` | Create task from template |
| POST | `/:id/save-as-template` | Save task as template |

### Bulk Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/bulk` | Bulk update tasks |
| DELETE | `/bulk` | Bulk delete tasks |

### Query Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/overview` | Dashboard overview |
| GET | `/stats` | Task statistics |
| GET | `/upcoming` | Upcoming tasks |
| GET | `/overdue` | Overdue tasks |
| GET | `/due-today` | Tasks due today |
| GET | `/case/:caseId` | Tasks by case |

### AI/NLP

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/parse` | Create from natural language |
| POST | `/voice` | Create from voice |
| GET | `/smart-schedule` | AI schedule suggestions |
| POST | `/auto-schedule` | Auto-schedule tasks |
| POST | `/voice-to-item` | Convert voice to task |
| POST | `/voice-to-item/batch` | Batch voice conversion |

---

## Request/Response Examples

### POST `/` - Create Task

**Request:**
```json
{
  "title": "Review contract for Smith case",
  "description": "Review NDA and service agreement",
  "priority": "high",
  "status": "todo",
  "label": "legal",
  "tags": ["contract", "urgent"],
  "dueDate": "2025-01-15T00:00:00.000Z",
  "dueTime": "17:00",
  "assignedTo": "507f1f77bcf86cd799439011",
  "caseId": "507f1f77bcf86cd799439022",
  "subtasks": [
    { "title": "Read NDA" },
    { "title": "Check liability clauses" }
  ],
  "timeTracking": {
    "estimatedMinutes": 120
  },
  "reminders": [
    { "type": "due_date", "beforeMinutes": 60 }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439033",
    "title": "Review contract for Smith case",
    "status": "todo",
    "priority": "high",
    "firmId": "507f1f77bcf86cd799439000",
    "createdBy": "507f1f77bcf86cd799439001",
    "createdAt": "2025-01-03T10:00:00.000Z"
  }
}
```

### GET `/` - List Tasks

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |
| status | string | Filter by status |
| priority | string | Filter by priority |
| assignedTo | ObjectId | Filter by assignee |
| caseId | ObjectId | Filter by case |
| search | string | Search in title/description |
| sortBy | string | Sort field |
| sortOrder | string | 'asc' or 'desc' |

**Response (200):**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

### PATCH `/:id/status` - Update Status

**Request:**
```json
{
  "status": "in_progress"
}
```

### POST `/:id/subtasks` - Add Subtask

**Request:**
```json
{
  "title": "Call client",
  "autoReset": false
}
```

### POST `/:id/timer/start` - Start Timer

**Request:**
```json
{
  "notes": "Working on document review"
}
```

### POST `/:id/timer/stop` - Stop Timer

**Request:**
```json
{
  "notes": "Completed first pass",
  "isBillable": true
}
```

### POST `/:id/time` - Add Manual Time

**Request:**
```json
{
  "minutes": 45,
  "notes": "Phone call with opposing counsel",
  "date": "2025-01-03",
  "isBillable": true
}
```

### POST `/:id/comments` - Add Comment

**Request:**
```json
{
  "content": "Client approved the draft",
  "mentions": ["507f1f77bcf86cd799439011"]
}
```

### PUT `/bulk` - Bulk Update

**Request:**
```json
{
  "taskIds": ["id1", "id2", "id3"],
  "updates": {
    "status": "done",
    "priority": "low"
  }
}
```

---

## Allowed Fields by Operation

| Operation | Allowed Fields |
|-----------|---------------|
| CREATE | title, description, priority, status, label, tags, dueDate, dueTime, startDate, assignedTo, caseId, clientId, parentTaskId, subtasks, checklists, timeTracking, recurring, reminders, notes, points |
| UPDATE | title, description, status, priority, label, tags, dueDate, dueTime, startDate, assignedTo, caseId, clientId, subtasks, checklists, timeTracking, recurring, reminders, notes, points, progress |
| BULK_UPDATE | status, priority, assignedTo, dueDate, label, tags |

---

## Validation Rules

| Field | Validation |
|-------|------------|
| title | Required, string, max 500 chars |
| description | Optional, max 5000 chars, XSS sanitized |
| status | Must be valid enum value |
| priority | Must be valid enum value |
| estimatedMinutes | Non-negative number, max 525600 (1 year) |
| ObjectId fields | Valid 24-character hex string |

---

## Error Responses

```json
{
  "success": false,
  "message": "Error description"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Invalid input (bad enum, missing required field) |
| 403 | Permission denied |
| 404 | Task not found |
| 500 | Server error |

---

**Version:** 1.0
**Last Updated:** 2025-01-03
**Fixes Applied:** Enum alignment, Solo lawyer tenant isolation
