# Missing Features Report: Ultimate Legal Practice Management System

**Generated:** 2026-01-04
**Source Analysis:** Odoo, ERPNext, OpenProject, Redmine, Taiga, Vikunja, Leantime, OFBiz, iDempiere, Dolibarr
**Current Contracts:** Tasks (45+ endpoints), Reminders (30+), Events (30+), Gantt (36)

---

## Executive Summary

After analyzing 10 leading project management and ERP systems, this report identifies **47 high-value features** missing from the current traf3li-backend API contracts. These features are prioritized by:
1. **Revenue Impact** - Features that directly enable billing
2. **Competitive Advantage** - Unique legal practice features
3. **User Productivity** - Time savings for lawyers
4. **Client Satisfaction** - Portal and communication features

---

## Current Contract Coverage

| Contract | Endpoints | Key Strengths |
|----------|-----------|---------------|
| Tasks | 45+ | Templates, subtasks, timer, NLP, voice, dependencies |
| Reminders | 30+ | Location-based, delegation, snooze, escalation |
| Events | 30+ | Calendar views, ICS, attendees, agenda, RSVP |
| Gantt | 36 | Critical path, baselines, auto-schedule, resources |

**Overall Assessment:** Strong foundation, but missing advanced billing, client collaboration, and strategic planning features found in enterprise systems.

---

## Priority 1: Revenue-Critical (Missing)

### 1.1 Dual-Rate Time Tracking (ERPNext, OFBiz)

**Current State:** Single time tracking with `isBillable` flag
**Missing:** Separate cost rate vs billing rate for profitability analysis

```javascript
// PROPOSED: Enhanced time entry schema
{
  "minutes": 60,
  "costRate": 150,        // Internal hourly cost (salary + overhead)
  "billingRate": 350,     // Client-facing rate
  "costAmount": 150,      // Auto-calculated
  "billingAmount": 350,   // Auto-calculated
  "margin": 200,          // billingAmount - costAmount
  "marginPercent": 57.1   // (margin / billingAmount) * 100
}
```

**New Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /time-entries/profitability | Profitability report by lawyer/case |
| GET | /time-entries/utilization | Billable vs non-billable ratio |
| PUT | /settings/billing-rates | Configure default rates by seniority |

---

### 1.2 Timesheet-to-Invoice Automation (ERPNext, iDempiere)

**Current State:** Manual invoice creation
**Missing:** One-click invoice generation from approved timesheets

```javascript
// PROPOSED: POST /invoices/from-timesheets
{
  "caseId": "ObjectId",
  "startDate": "2026-01-01",
  "endDate": "2026-01-31",
  "timeEntryIds": ["id1", "id2"],  // Optional: specific entries
  "includeExpenses": true,
  "groupBy": "task|date|attorney",
  "discountPercent": 10
}
```

**New Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /timesheets/unbilled | Unbilled time entries by case/client |
| POST | /timesheets/:id/approve | Approve timesheet for billing |
| POST | /invoices/from-timesheets | Generate invoice from entries |
| GET | /invoices/draft-preview | Preview before sending |

---

### 1.3 Budget Alerts & Tracking (OFBiz, iDempiere)

**Current State:** No budget tracking
**Missing:** Case/matter budgets with threshold alerts

```javascript
// PROPOSED: Budget schema on Case model
{
  "budget": {
    "totalAmount": 50000,
    "currency": "SAR",
    "alertThresholds": [50, 75, 90, 100],  // Percentage triggers
    "currentSpend": 42500,
    "spendPercent": 85,
    "alertsSent": [50, 75],
    "overBudgetAllowed": false
  }
}
```

**New Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | /cases/:id/budget | Set/update case budget |
| GET | /cases/:id/budget/status | Budget health check |
| GET | /cases/over-budget | List cases over/near budget |
| POST | /cases/:id/budget/alert-config | Configure alerts |

---

## Priority 2: Competitive Advantage (Missing)

### 2.1 Task Dependencies with Auto-Rescheduling (Odoo, OpenProject)

**Current State:** Basic `dependsOn` field, no auto-rescheduling
**Missing:** When predecessor moves, successors auto-adjust

```javascript
// PROPOSED: Enhanced dependency with lag
{
  "dependencies": [
    {
      "dependsOn": "task_123",
      "type": 0,  // 0=finish-to-start
      "lag": 2,   // 2 days gap between predecessor end and successor start
      "lagUnit": "days"
    }
  ],
  "scheduling": {
    "mode": "auto",  // auto | manual | constraint
    "constraint": "start_no_earlier_than",
    "constraintDate": "2026-02-01"
  }
}
```

**New Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /tasks/:id/reschedule-chain | Cascade reschedule all successors |
| GET | /tasks/:id/impact-analysis | Preview impact of date change |
| PUT | /tasks/:id/scheduling-mode | Set auto/manual scheduling |

---

### 2.2 Skill-Based Assignment (Odoo)

**Current State:** Manual assignment
**Missing:** Suggest optimal assignee based on skills/workload

```javascript
// PROPOSED: User skill profile
{
  "skills": [
    { "name": "Corporate Law", "level": "expert", "yearsExp": 10 },
    { "name": "Litigation", "level": "intermediate", "yearsExp": 3 },
    { "name": "Arabic Contracts", "level": "expert", "yearsExp": 8 }
  ],
  "certifications": ["Saudi Bar Association", "CIPP/M"],
  "languages": ["ar", "en"],
  "availability": {
    "hoursPerWeek": 40,
    "currentAllocation": 32
  }
}
```

**New Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /users/:id/skills | Get user skill profile |
| PUT | /users/:id/skills | Update skills |
| POST | /tasks/:id/suggest-assignee | AI-powered assignment suggestion |
| GET | /skills/matrix | Firm-wide skill matrix |

---

### 2.3 Client Portal with Limited Access (Vikunja, Leantime)

**Current State:** No client-facing access
**Missing:** Clients can view case progress, documents, bills

```javascript
// PROPOSED: Client role with limited permissions
{
  "clientAccess": {
    "enabled": true,
    "permissions": {
      "viewCaseProgress": true,
      "viewDocuments": ["final", "approved"],  // Not drafts
      "viewInvoices": true,
      "viewTasks": false,  // Internal only
      "uploadDocuments": true,
      "requestMeeting": true
    },
    "lastLogin": "2026-01-04T10:30:00Z"
  }
}
```

**New Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /clients/:id/portal-access | Enable/configure portal |
| GET | /portal/cases | Client view of their cases |
| GET | /portal/documents | Client accessible documents |
| POST | /portal/messages | Secure messaging |
| GET | /portal/invoices | View/pay invoices |

---

### 2.4 Goal/OKR Hierarchy (Leantime, Vikunja)

**Current State:** Flat task structure
**Missing:** Strategy → Goals → Projects → Tasks hierarchy

```javascript
// PROPOSED: Goal model
{
  "goal": {
    "title": "Increase litigation win rate to 85%",
    "type": "quarterly",
    "targetDate": "2026-03-31",
    "metrics": [
      {
        "name": "Win Rate",
        "target": 85,
        "current": 78,
        "unit": "percent"
      }
    ],
    "linkedCases": ["case_1", "case_2"],
    "progress": 78,
    "status": "on_track"
  }
}
```

**New Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /goals | Create firm goal |
| GET | /goals | List goals with progress |
| GET | /goals/:id/cascade | Show goal → projects → tasks |
| PUT | /goals/:id/update-progress | Auto-calculate from linked items |
| GET | /goals/dashboard | OKR dashboard view |

---

## Priority 3: User Productivity (Missing)

### 3.1 Custom Fields System (Redmine, OpenProject)

**Current State:** Fixed schema
**Missing:** User-defined fields per entity type

```javascript
// PROPOSED: Custom field definition
{
  "customFieldDefinitions": [
    {
      "name": "Court Circuit",
      "fieldType": "dropdown",
      "options": ["First", "Second", "Third", "Appeal"],
      "appliesTo": ["Case", "Event"],
      "required": false,
      "searchable": true
    },
    {
      "name": "Estimated Settlement",
      "fieldType": "currency",
      "appliesTo": ["Case"],
      "required": false
    }
  ]
}
```

**New Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /custom-fields | Define custom field |
| GET | /custom-fields | List field definitions |
| PUT | /:entity/:id/custom-fields | Set custom field values |
| GET | /search/custom-fields | Search by custom field |

---

### 3.2 Activity History/Audit Trail (Redmine, Taiga)

**Current State:** Limited history in `Task.history`
**Missing:** Comprehensive audit trail across all entities

```javascript
// PROPOSED: Activity feed
{
  "activity": {
    "entityType": "Task",
    "entityId": "task_123",
    "action": "status_changed",
    "changes": {
      "status": { "from": "todo", "to": "in_progress" }
    },
    "userId": "user_456",
    "userName": "Ahmed Al-Farsi",
    "timestamp": "2026-01-04T14:30:00Z",
    "ipAddress": "192.168.1.1"
  }
}
```

**New Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /activity-feed | Firm-wide activity stream |
| GET | /activity-feed/case/:caseId | Case activity history |
| GET | /activity-feed/user/:userId | User activity history |
| GET | /activity-feed/entity/:type/:id | Entity changelog |

---

### 3.3 Kanban Board API (Taiga, Vikunja)

**Current State:** No Kanban-specific endpoints
**Missing:** Board configuration, column management, WIP limits

```javascript
// PROPOSED: Board configuration
{
  "board": {
    "name": "Case Pipeline",
    "columns": [
      { "id": "intake", "name": "Intake", "wipLimit": 5, "color": "#gray" },
      { "id": "review", "name": "Under Review", "wipLimit": 10 },
      { "id": "active", "name": "Active", "wipLimit": null },
      { "id": "closed", "name": "Closed", "wipLimit": null }
    ],
    "cardFields": ["priority", "assignee", "dueDate", "client"],
    "swimlanes": { "enabled": true, "groupBy": "caseType" }
  }
}
```

**New Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /boards | List boards |
| POST | /boards | Create board |
| PUT | /boards/:id/columns | Configure columns |
| POST | /boards/:id/move-card | Move task between columns |
| GET | /boards/:id/wip-violations | WIP limit violations |

---

### 3.4 Time Tracking Timer API Enhancements (OpenProject)

**Current State:** Basic start/stop timer
**Missing:** Running timer status, timer pause/resume, auto-stop

```javascript
// PROPOSED: Enhanced timer state
{
  "activeTimer": {
    "taskId": "task_123",
    "startedAt": "2026-01-04T09:00:00Z",
    "pausedAt": null,
    "totalPausedMinutes": 15,
    "currentDuration": 90,  // minutes
    "autoStopAfter": 480,   // Auto-stop after 8 hours
    "reminderSent": true
  }
}
```

**New Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /timers/active | Get current running timer |
| POST | /timers/:id/pause | Pause timer |
| POST | /timers/:id/resume | Resume timer |
| PUT | /settings/timer-defaults | Auto-stop, reminders |
| GET | /timers/forgotten | Timers running > 8 hours |

---

## Priority 4: Strategic Features (Missing)

### 4.1 Baseline Comparison (OpenProject)

**Current State:** Single baseline endpoint
**Missing:** Multiple baselines, variance analysis, trend tracking

```javascript
// PROPOSED: Enhanced baseline
{
  "baseline": {
    "name": "Original Plan",
    "createdAt": "2026-01-01",
    "snapshot": {
      "tasks": [
        { "taskId": "t1", "plannedStart": "...", "plannedEnd": "...", "plannedHours": 40 }
      ],
      "totalBudget": 50000,
      "totalHours": 200
    },
    "currentVariance": {
      "scheduleVariance": "+5 days",
      "costVariance": "-2000 SAR",
      "scopeChange": "+3 tasks"
    }
  }
}
```

**New Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /baselines/:projectId/list | List all baselines |
| GET | /baselines/:projectId/variance | Current vs baseline variance |
| GET | /baselines/:projectId/trend | Variance trend over time |
| POST | /baselines/:projectId/rebaseline | Create new baseline |

---

### 4.2 Retrospectives/Lessons Learned (Leantime)

**Current State:** None
**Missing:** Post-case review, lessons database, pattern detection

```javascript
// PROPOSED: Retrospective model
{
  "retrospective": {
    "caseId": "case_123",
    "completedDate": "2026-01-04",
    "outcome": "won",
    "participants": ["user_1", "user_2"],
    "wentWell": ["Strong evidence preparation", "Client communication"],
    "needsImprovement": ["Document filing delays"],
    "actionItems": [
      { "action": "Implement filing checklist", "assignee": "user_1" }
    ],
    "lessonsLearned": [
      {
        "category": "evidence_prep",
        "lesson": "Start evidence collection 2 weeks earlier",
        "applicableCaseTypes": ["litigation", "criminal"]
      }
    ]
  }
}
```

**New Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /retrospectives | Create case retrospective |
| GET | /retrospectives | List retrospectives |
| GET | /lessons-learned | Searchable lessons database |
| GET | /lessons-learned/suggest | Suggest lessons for new case |

---

### 4.3 Workflow Automation Engine (Odoo, ERPNext)

**Current State:** Recurring tasks only
**Missing:** Event-driven automation rules

```javascript
// PROPOSED: Workflow rule
{
  "workflow": {
    "name": "Auto-assign court filings",
    "trigger": {
      "event": "task_created",
      "conditions": [
        { "field": "type", "operator": "equals", "value": "filing" },
        { "field": "priority", "operator": "in", "value": ["high", "urgent"] }
      ]
    },
    "actions": [
      { "type": "assign_to", "value": "paralegal_queue" },
      { "type": "set_due_date", "value": "+2 business_days" },
      { "type": "send_notification", "to": "senior_partner" },
      { "type": "add_checklist", "template": "court_filing_checklist" }
    ],
    "enabled": true
  }
}
```

**New Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /workflows | Create automation rule |
| GET | /workflows | List rules |
| PUT | /workflows/:id/toggle | Enable/disable |
| GET | /workflows/:id/executions | Execution history |
| POST | /workflows/test | Dry-run a rule |

---

### 4.4 Resource Capacity Planning (Odoo)

**Current State:** Basic workload view
**Missing:** 80% allocation rule, overallocation prevention

```javascript
// PROPOSED: Capacity settings
{
  "capacitySettings": {
    "maxUtilization": 80,  // Target 80% billable
    "workingHoursPerDay": 8,
    "workingDays": ["Sun", "Mon", "Tue", "Wed", "Thu"],  // Saudi week
    "holidays": ["2026-09-23"],  // National Day
    "overallocationAlert": true
  },
  "userCapacity": {
    "userId": "user_123",
    "totalHours": 160,      // per month
    "allocated": 145,
    "available": 15,
    "utilizationPercent": 90,
    "overallocatedDays": ["2026-01-15", "2026-01-16"]
  }
}
```

**New Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /capacity/overview | Firm-wide capacity view |
| GET | /capacity/user/:id | User capacity details |
| GET | /capacity/forecast | 30/60/90 day forecast |
| PUT | /settings/capacity | Configure capacity rules |
| GET | /capacity/overallocated | List overallocated users |

---

## Priority 5: Integration Features (Missing)

### 5.1 CalDAV/CardDAV Integration (Vikunja)

**Current State:** ICS export only
**Missing:** Two-way sync with CalDAV servers

**New Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /integrations/caldav/connect | Connect CalDAV server |
| POST | /integrations/caldav/sync | Trigger sync |
| GET | /integrations/caldav/status | Sync status |
| DELETE | /integrations/caldav | Disconnect |

---

### 5.2 HATEOAS API Pattern (OpenProject)

**Current State:** Basic JSON responses
**Missing:** Self-documenting hypermedia links

```javascript
// PROPOSED: HATEOAS response
{
  "success": true,
  "data": {
    "_id": "task_123",
    "title": "Draft motion",
    "_links": {
      "self": { "href": "/api/tasks/task_123" },
      "update": { "href": "/api/tasks/task_123", "method": "PUT" },
      "delete": { "href": "/api/tasks/task_123", "method": "DELETE" },
      "complete": { "href": "/api/tasks/task_123/complete", "method": "POST" },
      "comments": { "href": "/api/tasks/task_123/comments" },
      "case": { "href": "/api/cases/case_456" },
      "assignee": { "href": "/api/users/user_789" }
    }
  }
}
```

---

### 5.3 Webhook System (OpenProject, ERPNext)

**Current State:** None
**Missing:** External system notifications

```javascript
// PROPOSED: Webhook configuration
{
  "webhook": {
    "name": "Notify Billing System",
    "url": "https://billing.example.com/webhook",
    "events": ["task.completed", "time_entry.created"],
    "headers": { "X-API-Key": "***" },
    "retryPolicy": { "maxRetries": 3, "backoff": "exponential" },
    "enabled": true
  }
}
```

**New Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /webhooks | Create webhook |
| GET | /webhooks | List webhooks |
| GET | /webhooks/:id/deliveries | Delivery history |
| POST | /webhooks/:id/test | Test webhook |

---

## Implementation Roadmap

### Phase 1: Revenue (4-6 weeks)
1. Dual-rate time tracking
2. Timesheet approval workflow
3. Timesheet-to-invoice automation
4. Budget tracking & alerts

### Phase 2: Collaboration (4-6 weeks)
1. Client portal MVP
2. Activity feed
3. Custom fields (basic)
4. Webhook system

### Phase 3: Productivity (4-6 weeks)
1. Enhanced dependencies with auto-reschedule
2. Kanban board API
3. Timer enhancements
4. Skill-based assignment

### Phase 4: Strategic (4-6 weeks)
1. Goals/OKR system
2. Workflow automation engine
3. Retrospectives
4. Capacity planning

### Phase 5: Integration (2-4 weeks)
1. CalDAV integration
2. HATEOAS responses
3. Multiple baselines

---

## Feature Value Matrix

| Feature | Revenue | Productivity | Competitive | Complexity |
|---------|---------|--------------|-------------|------------|
| Dual-Rate Billing | HIGH | Medium | HIGH | Medium |
| Timesheet→Invoice | HIGH | HIGH | Medium | Medium |
| Budget Alerts | HIGH | Medium | Medium | Low |
| Client Portal | HIGH | Medium | HIGH | High |
| Auto-Reschedule | Medium | HIGH | HIGH | High |
| Custom Fields | Medium | HIGH | Medium | Medium |
| Workflow Automation | Medium | HIGH | HIGH | High |
| Goals/OKR | Medium | Medium | HIGH | Medium |
| Retrospectives | Low | Medium | HIGH | Low |
| Webhooks | Medium | Medium | Medium | Medium |

---

## Conclusion

The current traf3li-backend has a **solid foundation** with 140+ endpoints across 4 API contracts. However, to create the **ultimate legal practice management system**, the highest-priority additions are:

1. **Revenue-Critical:** Dual-rate billing, timesheet automation, budget tracking
2. **Competitive Edge:** Client portal, skill-based assignment, workflow automation
3. **Productivity:** Enhanced dependencies, custom fields, activity feed
4. **Strategic:** Goals/OKR, retrospectives, capacity planning

The recommended implementation approach is **phased**, starting with revenue-generating features that provide immediate ROI, then building collaboration and productivity features.

---

## Appendix: Research Sources

| System | Key Features Extracted |
|--------|----------------------|
| Odoo | Dependencies, capacity planning, skills, milestone billing |
| ERPNext | Dual-rate billing, Frappe Gantt, workflow states |
| OpenProject | HATEOAS, baselines, custom fields, time tracking |
| Redmine | Custom fields, activity history, extensive plugins |
| Taiga | Epic management, Kanban, burndown charts |
| Vikunja | CalDAV, goals, client portal, ADHD-friendly |
| Leantime | Goals/OKR, retrospectives, client portal |
| OFBiz | Work effort hierarchy, timesheet automation |
| iDempiere | Budget alerts, resource utilization |
| Dolibarr | Invoice workflow, document management |

