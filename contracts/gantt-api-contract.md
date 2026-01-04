# Gantt API Contract

**Generated:** 2026-01-04
**Purpose:** Document Gantt Chart API endpoints for frontend integration and refactoring verification

---

## Valid Enum Values

### Dependency Link Types
```javascript
[0, 1, 2, 3]
// 0: finish-to-start (default)
// 1: start-to-start
// 2: finish-to-finish
// 3: start-to-finish
```

### Source Types (Productivity Data)
```javascript
['task', 'reminder', 'event']
```

### Task Priorities
```javascript
['critical', 'urgent', 'high', 'medium', 'low']
```

### Task Statuses
```javascript
['backlog', 'todo', 'in_progress', 'review', 'done', 'canceled']
```

### Reminder Statuses
```javascript
['pending', 'snoozed', 'completed', 'dismissed', 'delegated']
```

### Event Statuses
```javascript
['scheduled', 'confirmed', 'tentative', 'canceled', 'postponed', 'completed', 'in_progress']
```

---

## Allowed Request Body Fields

### POST /api/gantt/data/filter (Filter Gantt Data)
```javascript
['caseId', 'assigneeId', 'status', 'priority', 'dateRange', 'tags', 'search']
```

### PUT /api/gantt/task/:id/dates (Update Task Dates)
```javascript
['startDate', 'endDate']
```

### PUT /api/gantt/task/:id/duration (Update Task Duration)
```javascript
['duration']
```

### PUT /api/gantt/task/:id/progress (Update Task Progress)
```javascript
['progress']
```

### PUT /api/gantt/task/:id/parent (Update Task Parent)
```javascript
['parentId']
```

### POST /api/gantt/task/reorder (Reorder Tasks)
```javascript
['taskIds']
```

### POST /api/gantt/link (Create Dependency Link)
```javascript
['source', 'target', 'type']
```

### POST /api/gantt/auto-schedule/:projectId (Auto-Schedule Project)
```javascript
['startDate']
```

### POST /api/gantt/milestone (Create Milestone)
```javascript
['title', 'description', 'dueDate', 'caseId', 'projectId', 'priority', 'status', 'tags', 'color']
```

### POST /api/gantt/resources/suggest (Suggest Assignee)
```javascript
['taskId']
```

### POST /api/gantt/collaboration/presence (Update Presence)
```javascript
['location']  // Object: { type: string, id: string }
```

---

## Query Parameters

### GET /api/gantt/data
| Parameter | Type | Description |
|-----------|------|-------------|
| caseId | ObjectId | Filter by case/project |
| assigneeId | ObjectId | Filter by assignee |
| status | string | Comma-separated list of statuses |
| startDate | ISO date | Date range start |
| endDate | ISO date | Date range end |

### GET /api/gantt/productivity
| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | ISO date | Filter items starting from this date |
| endDate | ISO date | Filter items ending before this date |

### GET /api/gantt/resources
| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | ISO date | Date range start |
| endDate | ISO date | Date range end |

### GET /api/gantt/resources/conflicts
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | ObjectId | Yes | User to check conflicts for |
| startDate | ISO date | Yes | Date range start |
| endDate | ISO date | Yes | Date range end |

### GET /api/gantt/resources/:userId/workload
| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | ISO date | Date range start |
| endDate | ISO date | Date range end |

### GET /api/gantt/collaboration/activities/:firmId
| Parameter | Type | Description |
|-----------|------|-------------|
| limit | number | Max activities to return (default: 50) |

---

## API Endpoints

### Gantt Data
| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | /productivity | getProductivityData | Unified view: tasks, reminders, events |
| POST | /data/filter | filterGanttData | Filter with complex criteria |
| GET | /data | getGanttData | All Gantt data for firm |
| GET | /data/case/:caseId | getGanttDataForCase | Gantt data for specific case |
| GET | /data/assigned/:userId | getGanttDataByAssignee | Gantt data by assignee |
| GET | /hierarchy/:taskId | getTaskHierarchy | Task hierarchy tree |

### Task Operations (Drag-Drop UI)
| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| PUT | /task/:id/dates | updateTaskDates | Update start/end dates |
| PUT | /task/:id/duration | updateTaskDuration | Update duration |
| PUT | /task/:id/progress | updateTaskProgress | Update progress (0-100) |
| PUT | /task/:id/parent | updateTaskParent | Change parent task |
| POST | /task/reorder | reorderTasks | Reorder tasks in list |

### Dependencies/Links
| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | /dependencies/:taskId | getDependencyChain | Get dependency chain |
| POST | /link | createLink | Create dependency link |
| DELETE | /link/:source/:target | deleteLink | Delete dependency link |

### Critical Path Analysis
| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | /critical-path/:projectId | getCriticalPath | Calculate critical path |
| GET | /slack/:taskId | getSlackTime | Get task slack time |
| GET | /bottlenecks/:projectId | getBottlenecks | Identify bottleneck tasks |
| GET | /timeline/:projectId | getProjectTimeline | Project timeline summary |

### Resource Management
| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | /resources | getResourceAllocation | Resource allocation overview |
| GET | /resources/conflicts | getResourceConflicts | Check for conflicts |
| POST | /resources/suggest | suggestAssignee | Suggest optimal assignee |
| GET | /resources/:userId/workload | getUserWorkload | User workload summary |

### Baselines
| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| POST | /baseline/:projectId | createBaseline | Create project baseline |
| GET | /baseline/:projectId | getBaseline | Get baseline snapshot |
| GET | /baseline/:projectId/compare | compareToBaseline | Compare current vs baseline |

### Auto-Scheduling
| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| POST | /auto-schedule/:projectId | autoSchedule | Auto-schedule all tasks |
| POST | /level-resources/:projectId | levelResources | Level/redistribute resources |

### Milestones
| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| POST | /milestone | createMilestone | Create milestone |
| GET | /milestones/:projectId | getMilestones | Get project milestones |

### Export
| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | /export/:projectId/msproject | exportToMSProject | Export to MS Project XML |
| GET | /export/:projectId/pdf | exportToPDF | Export to PDF |
| GET | /export/:projectId/excel | exportToExcel | Export to Excel |

### Collaboration
| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | /collaboration/presence/:resourceId | getActiveUsers | Active users on resource |
| POST | /collaboration/presence | updatePresence | Update user presence |
| GET | /collaboration/activities/:firmId | getRecentActivities | Recent firm activities |
| GET | /collaboration/stats | getCollaborationStats | Collaboration statistics |

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

### Productivity Data Response (GET /api/gantt/productivity)
```json
{
    "success": true,
    "data": [
        {
            "id": "task_<objectId>",
            "text": "Task Title",
            "start_date": "2026-01-01 09:00",
            "end_date": "2026-01-02 17:00",
            "duration": 2,
            "progress": 0.5,
            "type": "task|project|milestone",
            "priority": "high",
            "status": "in_progress",
            "assignee": "John Doe",
            "assigneeId": "ObjectId",
            "color": "#10b981",
            "textColor": "#ffffff",
            "sourceType": "task|reminder|event",
            "sourceId": "ObjectId",
            "caseId": "ObjectId",
            "caseName": "Case Title",
            "isOverdue": false,
            "isCritical": false
        }
    ],
    "links": [
        {
            "id": 1,
            "source": "task_<objectId>",
            "target": "task_<objectId>",
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
        "totalItems": 50,
        "tasks": {
            "total": 30,
            "completed": 10,
            "inProgress": 15,
            "overdue": 5
        },
        "reminders": {
            "total": 10,
            "pending": 5,
            "completed": 5
        },
        "events": {
            "total": 10,
            "upcoming": 8,
            "completed": 2
        }
    }
}
```

### Gantt Task Item Shape
```json
{
    "id": "task_<objectId>",
    "text": "Task title",
    "start_date": "YYYY-MM-DD HH:mm",
    "end_date": "YYYY-MM-DD HH:mm",
    "duration": 1,
    "progress": 0.5,
    "type": "task|project|milestone",
    "priority": "low|medium|high|urgent|critical",
    "status": "todo|in_progress|done|canceled",
    "assignee": "Name",
    "assigneeId": "ObjectId",
    "color": "#hex",
    "textColor": "#hex",
    "sourceType": "task|reminder|event",
    "sourceId": "ObjectId",
    "caseId": "ObjectId",
    "caseName": "Case Title",
    "isOverdue": false,
    "isCritical": false,
    "subtaskCount": 0,
    "completedSubtaskCount": 0
}
```

### Link Object Shape
```json
{
    "id": 1,
    "source": "task_<objectId>",
    "target": "task_<objectId>",
    "type": "0"
}
```

---

## Validation Rules

### ID Validation
- All ObjectIds must be valid 24-character hex strings
- Use `sanitizeObjectId()` for all ID parameters
- Invalid IDs return 400 with "Invalid X ID format"

### Date Validation
- All dates must be valid ISO 8601 format
- End date must be after start date
- Invalid dates return 400 with "Invalid X date format"

### Progress Validation
- Must be a number between 0 and 100
- Invalid progress returns 400

### Duration Validation
- Must be a non-negative number
- Invalid duration returns 400

### Dependency Rules
- A task cannot depend on itself
- Source and target must belong to same case
- Link type must be 0, 1, 2, or 3

---

## IDOR Protection

All endpoints verify resource ownership via `firmId`:

```javascript
// Task operations
const task = await Task.findOne({ _id: sanitizedTaskId, firmId });
if (!task) {
    throw CustomException('Resource not found', 404);
}

// Case operations
const caseExists = await Case.findOne({ _id: sanitizedCaseId, ...req.firmQuery });
if (!caseExists) {
    throw CustomException('Case not found or access denied', 404);
}
```

---

## Known Issues / TODO

### Tenant Isolation Anti-Pattern
Several endpoints use `firmId` directly instead of `...req.firmQuery`:

| Function | Line | Current | Should Be |
|----------|------|---------|-----------|
| getGanttData | 25 | `firmId` | `req.firmQuery` |
| getGanttDataForCase | 49 | `firmId` | `req.firmQuery` |
| getGanttDataByAssignee | 82 | `firmId` | `req.firmQuery` |
| filterGanttData | 107 | `firmId` | `req.firmQuery` |
| getTaskHierarchy | 148 | `{ firmId }` | `...req.firmQuery` |
| updateTaskDates | 464 | `{ firmId }` | `...req.firmQuery` |
| updateTaskDuration | 529 | `{ firmId }` | `...req.firmQuery` |
| updateTaskProgress | 585 | `{ firmId }` | `...req.firmQuery` |
| updateTaskParent | 640-668 | `{ firmId }` | `...req.firmQuery` |
| reorderTasks | 726 | `{ firmId }` | `...req.firmQuery` |
| createLink | 785-790 | `{ firmId }` | `...req.firmQuery` |
| deleteLink | 842-850 | `{ firmId }` | `...req.firmQuery` |
| getDependencyChain | 886 | `{ firmId }` | `...req.firmQuery` |
| autoSchedule | 1140 | `{ firmId }` | `...req.firmQuery` |
| createMilestone | 1225, 1251 | `{ firmId }` | `...req.firmQuery` |

**Impact:** Solo lawyers (without firmId) cannot use Gantt features.

---

## Verification Checklist

After refactoring, verify:

- [ ] All endpoints still work
- [ ] Field names match frontend expectations
- [ ] Enum values haven't changed
- [ ] Response shapes are identical
- [ ] Error messages are consistent
- [ ] IDOR protection is intact
- [ ] Solo lawyers can access Gantt features

### Quick Verification Commands

```bash
# Check tenant isolation patterns
grep -n "findOne.*firmId" src/controllers/gantt.controller.js
grep -n "req\.firmQuery" src/controllers/gantt.controller.js

# Verify no syntax errors
node --check src/controllers/gantt.controller.js

# Check allowed fields
grep -A10 "pickAllowedFields" src/controllers/gantt.controller.js
```

---

## Change Log

| Date | Change | Breaking? |
|------|--------|-----------|
| 2026-01-04 | Initial contract creation | No |

