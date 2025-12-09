# Gantt Chart API Reference for Frontend

> **IMPORTANT FOR DHTMLX GANTT INTEGRATION**
>
> This document contains the complete backend API specification for the Gantt chart functionality.
> The frontend MUST configure DHTMLX Gantt to match these formats.

---

## Critical: Date Format Configuration

### Backend Date Format
The backend sends dates in this exact format:
```
YYYY-MM-DD HH:mm
```

**Examples:**
- `2025-01-15 00:00`
- `2025-12-09 14:30`

### Required Frontend Gantt Configuration
```javascript
// REQUIRED: Configure gantt to parse backend dates correctly
gantt.config.date_format = "%Y-%m-%d %H:%i";

// Initialize gantt AFTER setting config
gantt.init("gantt_container");

// When loading data, use gantt.parse() NOT manual parsing
gantt.parse(response.data);
```

### Sending Dates TO Backend
When updating tasks (drag-drop, resize), send dates in the same format:
```javascript
// Format date for API calls
const formatDateForAPI = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};
```

---

## API Endpoints

### Base URL
```
/api/gantt
```

All endpoints require authentication (JWT token in Authorization header).

---

## 1. GET GANTT DATA

### GET `/api/gantt/data`
Get all Gantt data for the firm.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `caseId` | string | Filter by case/project ID |
| `assigneeId` | string | Filter by assigned user ID |
| `status` | string | Comma-separated statuses: `backlog,todo,in_progress,done,canceled` |
| `startDate` | string | Filter start date (YYYY-MM-DD) |
| `endDate` | string | Filter end date (YYYY-MM-DD) |

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "507f1f77bcf86cd799439011",
        "text": "Task title",
        "start_date": "2025-01-15 00:00",
        "end_date": "2025-01-20 00:00",
        "duration": 5,
        "progress": 0.6,
        "parent": "507f1f77bcf86cd799439010",
        "type": "task",
        "open": true,
        "assignee": {
          "id": "507f1f77bcf86cd799439012",
          "name": "John Doe",
          "avatar": "https://example.com/avatar.jpg"
        },
        "priority": "high",
        "status": "in_progress",
        "caseId": "507f1f77bcf86cd799439013",
        "caseName": "Case ABC-123",
        "taskType": "general",
        "label": "feature",
        "tags": ["urgent", "client"],
        "color": "#f97316",
        "textColor": "#ffffff",
        "isCritical": false,
        "isOverdue": false,
        "description": "Task description text",
        "estimatedMinutes": 480,
        "actualMinutes": 240,
        "subtaskCount": 3,
        "completedSubtaskCount": 1,
        "blockedByCount": 1,
        "blocksCount": 2
      }
    ],
    "links": [
      {
        "id": "link_1",
        "source": "507f1f77bcf86cd799439011",
        "target": "507f1f77bcf86cd799439014",
        "type": "0"
      }
    ],
    "resources": [
      {
        "id": "507f1f77bcf86cd799439012",
        "name": "John Doe",
        "email": "john@example.com",
        "avatar": "https://example.com/avatar.jpg",
        "taskCount": 5
      }
    ],
    "summary": {
      "totalTasks": 45,
      "completedTasks": 20,
      "inProgressTasks": 15,
      "overdueTasks": 3,
      "projectStart": "2025-01-01",
      "projectEnd": "2025-03-15",
      "completionPercentage": 44
    }
  }
}
```

---

### GET `/api/gantt/data/case/:caseId`
Get Gantt data for a specific case/project.

**URL Parameters:**
- `caseId` - The case/project ObjectId

**Response:** Same as `/api/gantt/data`

---

### GET `/api/gantt/data/assigned/:userId`
Get Gantt data for tasks assigned to a specific user.

**URL Parameters:**
- `userId` - The user's ObjectId

**Response:** Same as `/api/gantt/data`

---

### POST `/api/gantt/data/filter`
Filter Gantt data with complex criteria.

**Request Body:**
```json
{
  "caseId": "507f1f77bcf86cd799439013",
  "assigneeId": "507f1f77bcf86cd799439012",
  "status": ["todo", "in_progress"],
  "dateRange": {
    "start": "2025-01-01",
    "end": "2025-03-31"
  }
}
```

**Response:** Same as `/api/gantt/data`

---

## 2. PRODUCTIVITY VIEW (Unified Data)

### GET `/api/gantt/productivity`
Get unified productivity data combining tasks, reminders, and events.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | string | Filter start date (YYYY-MM-DD) |
| `endDate` | string | Filter end date (YYYY-MM-DD) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "task_507f1f77bcf86cd799439011",
      "text": "Complete project proposal",
      "start_date": "2025-01-15 00:00",
      "end_date": "2025-01-20 00:00",
      "duration": 5,
      "progress": 0.6,
      "type": "task",
      "priority": "high",
      "status": "in_progress",
      "assignee": "John Doe",
      "assigneeId": "507f1f77bcf86cd799439012",
      "color": "#f97316",
      "textColor": "#ffffff",
      "sourceType": "task",
      "sourceId": "507f1f77bcf86cd799439011",
      "caseId": "507f1f77bcf86cd799439013",
      "caseName": "Case ABC-123",
      "isOverdue": false,
      "isCritical": false,
      "subtaskCount": 3,
      "completedSubtaskCount": 1
    },
    {
      "id": "reminder_507f1f77bcf86cd799439015",
      "text": "🔔 Client follow-up call",
      "start_date": "2025-01-18 09:00",
      "end_date": "2025-01-18 09:00",
      "duration": 0,
      "progress": 0,
      "type": "milestone",
      "priority": "high",
      "status": "pending",
      "color": "#f59e0b",
      "textColor": "#ffffff",
      "sourceType": "reminder",
      "sourceId": "507f1f77bcf86cd799439015",
      "caseId": "507f1f77bcf86cd799439013",
      "caseName": "Case ABC-123",
      "relatedTaskId": "507f1f77bcf86cd799439011"
    },
    {
      "id": "event_507f1f77bcf86cd799439016",
      "text": "📅 Team Meeting",
      "start_date": "2025-01-17 14:00",
      "end_date": "2025-01-17 15:00",
      "duration": 1,
      "progress": 0,
      "type": "task",
      "priority": "medium",
      "status": "scheduled",
      "eventType": "meeting",
      "color": "#3b82f6",
      "textColor": "#ffffff",
      "sourceType": "event",
      "sourceId": "507f1f77bcf86cd799439016",
      "organizer": "Jane Smith",
      "isAllDay": false,
      "location": "Conference Room A"
    }
  ],
  "links": [
    {
      "id": 1,
      "source": "task_507f1f77bcf86cd799439010",
      "target": "task_507f1f77bcf86cd799439011",
      "type": "0"
    }
  ],
  "collections": {
    "priorities": ["critical", "urgent", "high", "medium", "low"],
    "types": ["task", "reminder", "event"],
    "statuses": {
      "task": ["backlog", "todo", "in_progress", "review", "done", "canceled"],
      "reminder": ["pending", "snoozed", "completed", "dismissed", "delegated"],
      "event": ["scheduled", "confirmed", "tentative", "canceled", "postponed", "completed", "in_progress"]
    }
  },
  "summary": {
    "totalItems": 25,
    "tasks": {
      "total": 15,
      "completed": 5,
      "inProgress": 8,
      "overdue": 2
    },
    "reminders": {
      "total": 6,
      "pending": 4,
      "completed": 2
    },
    "events": {
      "total": 4,
      "upcoming": 3,
      "completed": 1
    }
  }
}
```

**Important Notes for Productivity Endpoint:**
- Task IDs are prefixed with `task_`
- Reminder IDs are prefixed with `reminder_`
- Event IDs are prefixed with `event_`
- Reminders are displayed as milestones (duration = 0)
- Check `sourceType` to determine the item type

---

## 3. TASK OPERATIONS

### PUT `/api/gantt/task/:id/dates`
Update task dates (for drag-drop operations).

**URL Parameters:**
- `id` - Task ObjectId (without prefix)

**Request Body:**
```json
{
  "startDate": "2025-01-20 00:00",
  "endDate": "2025-01-25 00:00"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Task dates updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Task title",
    "startDate": "2025-01-20T00:00:00.000Z",
    "dueDate": "2025-01-25T00:00:00.000Z"
  }
}
```

---

### PUT `/api/gantt/task/:id/duration`
Update task duration.

**Request Body:**
```json
{
  "duration": 7
}
```

**Response:**
```json
{
  "success": true,
  "message": "Task duration updated successfully",
  "data": { /* updated task */ }
}
```

---

### PUT `/api/gantt/task/:id/progress`
Update task progress (0-100).

**Request Body:**
```json
{
  "progress": 75
}
```

**Response:**
```json
{
  "success": true,
  "message": "Task progress updated successfully",
  "data": { /* updated task */ }
}
```

---

### PUT `/api/gantt/task/:id/parent`
Change task parent (hierarchy).

**Request Body:**
```json
{
  "parentId": "507f1f77bcf86cd799439010"
}
```

Set `parentId` to `null` to make it a root task.

**Response:**
```json
{
  "success": true,
  "message": "Task parent updated successfully",
  "data": { /* updated task */ }
}
```

---

### POST `/api/gantt/task/reorder`
Reorder tasks.

**Request Body:**
```json
{
  "taskIds": [
    "507f1f77bcf86cd799439011",
    "507f1f77bcf86cd799439012",
    "507f1f77bcf86cd799439013"
  ]
}
```

---

## 4. DEPENDENCIES/LINKS

### POST `/api/gantt/link`
Create a dependency link between tasks.

**Request Body:**
```json
{
  "source": "507f1f77bcf86cd799439011",
  "target": "507f1f77bcf86cd799439012",
  "type": 0
}
```

**Link Types:**
| Type | Name | Description |
|------|------|-------------|
| `0` | Finish-to-Start (FS) | Target starts after source finishes (most common) |
| `1` | Start-to-Start (SS) | Target starts when source starts |
| `2` | Finish-to-Finish (FF) | Target finishes when source finishes |
| `3` | Start-to-Finish (SF) | Target finishes when source starts |

**Response:**
```json
{
  "success": true,
  "message": "Dependency link created successfully",
  "data": {
    "source": { /* source task */ },
    "target": { /* target task */ }
  }
}
```

---

### DELETE `/api/gantt/link/:source/:target`
Delete a dependency link.

**URL Parameters:**
- `source` - Source task ObjectId
- `target` - Target task ObjectId

**Response:**
```json
{
  "success": true,
  "message": "Dependency link removed successfully"
}
```

---

### GET `/api/gantt/dependencies/:taskId`
Get dependency chain for a task.

**Response:**
```json
{
  "success": true,
  "data": {
    "upstream": [/* tasks that this task depends on */],
    "downstream": [/* tasks that depend on this task */]
  }
}
```

---

## 5. CRITICAL PATH ANALYSIS

### GET `/api/gantt/critical-path/:projectId`
Calculate and get the critical path for a project.

**Response:**
```json
{
  "success": true,
  "data": {
    "projectId": "507f1f77bcf86cd799439013",
    "criticalPath": [
      {
        "id": "507f1f77bcf86cd799439011",
        "title": "Critical Task 1",
        "earlyStart": "2025-01-15",
        "earlyFinish": "2025-01-20",
        "lateStart": "2025-01-15",
        "lateFinish": "2025-01-20",
        "slack": 0
      }
    ]
  }
}
```

---

### GET `/api/gantt/slack/:taskId`
Get slack time for a specific task.

**Response:**
```json
{
  "success": true,
  "data": {
    "taskId": "507f1f77bcf86cd799439011",
    "slackTime": 2
  }
}
```

---

### GET `/api/gantt/bottlenecks/:projectId`
Identify bottleneck tasks in a project.

---

### GET `/api/gantt/timeline/:projectId`
Get project timeline summary.

---

## 6. RESOURCE MANAGEMENT

### GET `/api/gantt/resources`
Get resource allocation overview.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | string | Start of date range |
| `endDate` | string | End of date range |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439012",
      "name": "John Doe",
      "email": "john@example.com",
      "taskCount": 8,
      "workload": {
        "2025-01-15": { "hours": 6, "tasks": 2 },
        "2025-01-16": { "hours": 8, "tasks": 3 },
        "2025-01-17": { "hours": 10, "tasks": 4 }
      },
      "isOverloaded": true
    }
  ]
}
```

---

### GET `/api/gantt/resources/:userId/workload`
Get workload for a specific user.

---

### GET `/api/gantt/resources/conflicts`
Check for resource overallocation.

**Query Parameters:**
- `userId` - User ID to check
- `startDate` - Start date
- `endDate` - End date

---

### POST `/api/gantt/resources/suggest`
Suggest optimal assignee for a task.

**Request Body:**
```json
{
  "taskId": "507f1f77bcf86cd799439011"
}
```

---

## 7. AUTO-SCHEDULING

### POST `/api/gantt/auto-schedule/:projectId`
Auto-schedule all tasks in a project based on dependencies.

**Request Body:**
```json
{
  "startDate": "2025-01-15"
}
```

---

### POST `/api/gantt/level-resources/:projectId`
Level resources to balance workload.

---

## 8. BASELINES

### POST `/api/gantt/baseline/:projectId`
Create a baseline snapshot of current project state.

### GET `/api/gantt/baseline/:projectId`
Get the baseline for a project.

### GET `/api/gantt/baseline/:projectId/compare`
Compare current project state to baseline.

---

## 9. MILESTONES

### POST `/api/gantt/milestone`
Create a milestone.

**Request Body:**
```json
{
  "title": "Project Kickoff",
  "date": "2025-01-15",
  "caseId": "507f1f77bcf86cd799439013"
}
```

### GET `/api/gantt/milestones/:projectId`
Get all milestones for a project.

---

## 10. EXPORT

### GET `/api/gantt/export/:projectId/msproject`
Export to MS Project XML format.

**Response:** XML file download

### GET `/api/gantt/export/:projectId/excel`
Export to Excel format.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "Task ID": "507f1f77bcf86cd799439011",
      "Title": "Task title",
      "Description": "Description",
      "Status": "in_progress",
      "Priority": "high",
      "Assigned To": "John Doe",
      "Start Date": "2025-01-15 00:00",
      "Due Date": "2025-01-20 00:00",
      "Progress": "60%",
      "Estimated Hours": "8.00",
      "Actual Hours": "4.00",
      "Case": "Case ABC-123"
    }
  ]
}
```

---

## Data Type Reference

### Task Object (Gantt Format)
```typescript
interface GanttTask {
  // Required DHTMLX fields
  id: string;                    // MongoDB ObjectId as string
  text: string;                  // Task title
  start_date: string;            // "YYYY-MM-DD HH:mm"
  end_date: string;              // "YYYY-MM-DD HH:mm"
  duration: number;              // Days
  progress: number;              // 0 to 1 (NOT 0-100)
  parent: string | null;         // Parent task ID or null
  type: "task" | "project" | "milestone";
  open: boolean;                 // Expanded in tree view

  // Custom fields
  assignee: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
  priority: "none" | "low" | "medium" | "high" | "critical";
  status: "backlog" | "todo" | "in_progress" | "done" | "canceled";
  caseId: string | null;
  caseName: string | null;
  taskType: string;
  label: string | null;
  tags: string[];

  // Visual
  color: string;                 // Hex color
  textColor: string;             // Hex color

  // Flags
  isCritical: boolean;
  isOverdue: boolean;

  // Additional data
  description: string;
  estimatedMinutes: number;
  actualMinutes: number;
  subtaskCount: number;
  completedSubtaskCount: number;
  blockedByCount: number;
  blocksCount: number;
}
```

### Link Object
```typescript
interface GanttLink {
  id: string | number;           // Unique link identifier
  source: string;                // Source task ID
  target: string;                // Target task ID
  type: "0" | "1" | "2" | "3";  // Link type as string
}
```

### Productivity Item (Extended)
```typescript
interface ProductivityItem extends GanttTask {
  sourceType: "task" | "reminder" | "event";
  sourceId: string;              // Original MongoDB ID (without prefix)

  // Reminder-specific
  relatedTaskId?: string;

  // Event-specific
  eventType?: string;
  organizer?: string;
  isAllDay?: boolean;
  location?: string;
}
```

---

## Task Status Values
| Status | Description |
|--------|-------------|
| `backlog` | Not yet scheduled |
| `todo` | Scheduled but not started |
| `in_progress` | Currently being worked on |
| `done` | Completed |
| `canceled` | Cancelled/abandoned |

## Priority Values
| Priority | Color |
|----------|-------|
| `critical` | `#dc2626` (red-600) |
| `high` | `#f97316` (orange-500) |
| `medium` | `#3b82f6` (blue-500) |
| `low` | `#8b5cf6` (purple-500) |
| `none` | `#6b7280` (gray-500) |

## Task Types (Legal Domain)
| Type | Is Milestone |
|------|--------------|
| `general` | No |
| `court_hearing` | No |
| `document_review` | No |
| `client_meeting` | No |
| `filing_deadline` | Yes |
| `appeal_deadline` | Yes |
| `discovery` | No |
| `deposition` | No |
| `mediation` | No |
| `settlement` | No |
| `research` | No |
| `drafting` | No |
| `other` | No |

---

## Frontend Integration Example

```javascript
// 1. Configure Gantt BEFORE init
gantt.config.date_format = "%Y-%m-%d %H:%i";
gantt.config.xml_date = "%Y-%m-%d %H:%i";
gantt.config.scale_unit = "day";
gantt.config.duration_unit = "day";

// 2. Initialize
gantt.init("gantt_container");

// 3. Load data
async function loadGanttData() {
  try {
    const response = await fetch('/api/gantt/data', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const result = await response.json();

    if (result.success) {
      // Clear existing data
      gantt.clearAll();

      // Parse the data - gantt.parse handles the format automatically
      gantt.parse({
        data: result.data.data,
        links: result.data.links
      });
    }
  } catch (error) {
    console.error('Failed to load Gantt data:', error);
  }
}

// 4. Handle task updates (drag-drop)
gantt.attachEvent("onAfterTaskDrag", async function(id, mode, e) {
  const task = gantt.getTask(id);

  // Format dates for API
  const startDate = gantt.date.date_to_str("%Y-%m-%d %H:%i")(task.start_date);
  const endDate = gantt.date.date_to_str("%Y-%m-%d %H:%i")(task.end_date);

  try {
    await fetch(`/api/gantt/task/${id}/dates`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ startDate, endDate })
    });
  } catch (error) {
    console.error('Failed to update task dates:', error);
    // Optionally reload data to revert
    loadGanttData();
  }
});

// 5. Handle progress updates
gantt.attachEvent("onAfterTaskUpdate", async function(id, task) {
  // Progress in Gantt is 0-1, API expects 0-100
  const progress = Math.round(task.progress * 100);

  try {
    await fetch(`/api/gantt/task/${id}/progress`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ progress })
    });
  } catch (error) {
    console.error('Failed to update task progress:', error);
  }
});

// 6. Handle link creation
gantt.attachEvent("onAfterLinkAdd", async function(id, link) {
  try {
    await fetch('/api/gantt/link', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: link.source,
        target: link.target,
        type: parseInt(link.type)
      })
    });
  } catch (error) {
    console.error('Failed to create link:', error);
    gantt.deleteLink(id);
  }
});

// 7. Handle link deletion
gantt.attachEvent("onAfterLinkDelete", async function(id, link) {
  try {
    await fetch(`/api/gantt/link/${link.source}/${link.target}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  } catch (error) {
    console.error('Failed to delete link:', error);
  }
});
```

---

## Error Responses

All endpoints return errors in this format:
```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE"
}
```

Common HTTP status codes:
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (no permission)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

---

## Socket.io Events (Real-time Updates)

If the frontend uses real-time collaboration, listen for these events:

```javascript
socket.emit('gantt:join', { projectId: 'xxx' });

socket.on('gantt:task:updated', (data) => {
  // Refresh task in Gantt
  gantt.updateTask(data.taskId);
});

socket.on('gantt:link:added', (link) => {
  gantt.addLink(link);
});

socket.on('gantt:link:removed', (linkId) => {
  gantt.deleteLink(linkId);
});
```
