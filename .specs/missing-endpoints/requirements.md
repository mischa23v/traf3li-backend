# Missing API Endpoints - Requirements

## Overview

This specification identifies **23 missing API endpoints** across Task, Reminder, and Event modules based on:
1. Contract gap analysis
2. Enterprise PM/ERP system research (Odoo, ERPNext, OpenProject, etc.)
3. Gold Standard compliance requirements

---

## Gold Standard Compliance

### Applicable Patterns (ALL Endpoints)
| Category | Pattern | Implementation |
|----------|---------|----------------|
| Security | Multi-tenant isolation | `...req.firmQuery` in ALL queries |
| Security | IDOR protection | `findOne({ _id, ...req.firmQuery })` never `findById()` |
| Security | Mass assignment | `pickAllowedFields(ALLOWED_FIELDS.X, req.body)` |
| Security | ID validation | `sanitizeObjectId()` for ALL ID parameters |
| Reliability | Non-blocking logging | `QueueService.logActivity()` fire-and-forget |
| Data | Pre-save hooks | Use `.save()` for calculated fields |

---

## Missing Task Endpoints (8)

### 1. GET /api/tasks/timers/active
**Purpose:** List all currently running timers for firm/user
**Value:** Users need visibility into active time tracking

**Acceptance Criteria:**
- WHEN GET /tasks/timers/active is called THE SYSTEM SHALL return all tasks with active timers
- THE SYSTEM SHALL filter by `...req.firmQuery`
- THE SYSTEM SHALL include elapsed time calculation

### 2. PATCH /api/tasks/:id/timer/pause
**Purpose:** Pause a running timer without stopping it
**Value:** Allows breaks without losing time entry context

**Acceptance Criteria:**
- WHEN timer is running THE SYSTEM SHALL pause and store elapsed time
- WHEN timer is not running THE SYSTEM SHALL return 400 "Timer not running"
- THE SYSTEM SHALL use `...req.firmQuery` for task lookup

### 3. PATCH /api/tasks/:id/timer/resume
**Purpose:** Resume a paused timer
**Value:** Continue tracking after break

**Acceptance Criteria:**
- WHEN timer is paused THE SYSTEM SHALL resume from paused state
- WHEN timer is not paused THE SYSTEM SHALL return 400 "Timer not paused"

### 4. POST /api/tasks/:id/clone
**Purpose:** Duplicate a task with all its subtasks/checklists
**Value:** Quickly create similar tasks

**Acceptance Criteria:**
- WHEN cloning THE SYSTEM SHALL copy all fields except: _id, createdAt, timeTracking.sessions
- THE SYSTEM SHALL reset status to 'todo' and progress to 0
- THE SYSTEM SHALL use `req.addFirmId()` for the clone

### 5. GET /api/tasks/:id/activity
**Purpose:** Get activity/change history for a task
**Value:** Audit trail for compliance

**Acceptance Criteria:**
- WHEN called THE SYSTEM SHALL return task.history with populated user references
- THE SYSTEM SHALL support pagination (?page, ?limit)

### 6. GET /api/tasks/client/:clientId
**Purpose:** Get all tasks for a specific client
**Value:** Client-centric task view

**Acceptance Criteria:**
- WHEN called THE SYSTEM SHALL filter by clientId AND `...req.firmQuery`
- THE SYSTEM SHALL validate clientId with `sanitizeObjectId()`

### 7. POST /api/tasks/:id/convert-to-event
**Purpose:** Convert a task to a calendar event
**Value:** Tasks with specific times should be events

**Acceptance Criteria:**
- WHEN converting THE SYSTEM SHALL create Event from task data
- THE SYSTEM SHALL link event to original task
- THE SYSTEM SHALL NOT delete the original task

### 8. GET /api/tasks/search
**Purpose:** Advanced search across all task fields
**Value:** Find tasks quickly by any criteria

**Acceptance Criteria:**
- WHEN query provided THE SYSTEM SHALL search title, description, notes
- THE SYSTEM SHALL use `escapeRegex()` for search terms
- THE SYSTEM SHALL support filters: status, priority, assignedTo, caseId, clientId, dateRange

---

## Missing Reminder Endpoints (7)

### 1. GET /api/reminders/:id/history
**Purpose:** Get reminder change history
**Value:** Audit trail for snooze/delegate actions

### 2. POST /api/reminders/:id/clone
**Purpose:** Duplicate a reminder
**Value:** Create similar reminders quickly

### 3. GET /api/reminders/client/:clientId
**Purpose:** Get reminders by client
**Value:** Client-centric view

### 4. GET /api/reminders/case/:caseId
**Purpose:** Get reminders by case
**Value:** Case-centric view (already have relatedCase filter, need dedicated endpoint)

### 5. POST /api/reminders/:id/reschedule
**Purpose:** Reschedule with reason tracking
**Value:** Better than update - tracks why it was moved

**Acceptance Criteria:**
- WHEN rescheduling THE SYSTEM SHALL record previousDateTime and reason
- THE SYSTEM SHALL add entry to history array

### 6. POST /api/reminders/from-task/:taskId
**Purpose:** Create reminder from existing task
**Value:** Quick reminder creation from task due dates

### 7. POST /api/reminders/from-event/:eventId
**Purpose:** Create reminder from existing event
**Value:** Quick reminder creation from event times

---

## Missing Event Endpoints (8)

### 1. DELETE /api/events/:id/action-items/:itemId
**Purpose:** Delete an action item from event
**Value:** Complete CRUD for action items (currently missing DELETE)

### 2. POST /api/events/:id/clone
**Purpose:** Duplicate an event
**Value:** Create recurring-like events manually

### 3. POST /api/events/:id/reschedule
**Purpose:** Reschedule with notification and reason
**Value:** Better UX than update, sends notifications

### 4. GET /api/events/conflicts
**Purpose:** Find scheduling conflicts
**Value:** Proactive conflict detection

**Acceptance Criteria:**
- WHEN called with userIds[] and dateRange THE SYSTEM SHALL return overlapping events
- THE SYSTEM SHALL check attendees, organizer, and createdBy

### 5. POST /api/events/bulk
**Purpose:** Create multiple events at once
**Value:** Batch creation for recurring patterns

### 6. PUT /api/events/bulk
**Purpose:** Update multiple events at once
**Value:** Bulk status updates

### 7. DELETE /api/events/bulk
**Purpose:** Delete multiple events at once
**Value:** Bulk cleanup

### 8. GET /api/events/client/:clientId
**Purpose:** Get events by client
**Value:** Client-centric calendar view

---

## Implementation Priority

| Priority | Endpoints | Rationale |
|----------|-----------|-----------|
| P0 | Timer pause/resume, active timers | High user demand |
| P0 | Event delete action-item | Contract gap |
| P1 | Clone endpoints (3) | Productivity boost |
| P1 | Client/case filters (4) | CRM integration |
| P2 | Bulk event operations (3) | Efficiency |
| P2 | History endpoints (2) | Audit compliance |
| P3 | Convert/reschedule (4) | Nice to have |

---

## API Contracts

### New Allowed Fields

```javascript
// Task - Clone
ALLOWED_FIELDS.CLONE = ['title', 'resetDueDate', 'includeSubtasks', 'includeChecklists']

// Task - Convert to Event
ALLOWED_FIELDS.CONVERT_TO_EVENT = ['eventType', 'duration', 'attendees']

// Reminder - Reschedule
ALLOWED_FIELDS.RESCHEDULE = ['newDateTime', 'reason']

// Event - Reschedule
ALLOWED_FIELDS.RESCHEDULE = ['newStartDateTime', 'newEndDateTime', 'reason', 'notifyAttendees']

// Event - Bulk
ALLOWED_FIELDS.BULK_CREATE = ['events']
ALLOWED_FIELDS.BULK_UPDATE = ['eventIds', 'updates']
ALLOWED_FIELDS.BULK_DELETE = ['eventIds']
```

---

## Verification Plan

After implementation:
- [ ] `node --check` passes on all modified files
- [ ] Run `/fix-isolation` - no tenant violations
- [ ] All queries use `...req.firmQuery`
- [ ] All IDs validated with `sanitizeObjectId()`
- [ ] All request bodies use `pickAllowedFields()`
- [ ] Activity logging uses QueueService (non-blocking)
