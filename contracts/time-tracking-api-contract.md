# Time Tracking API Contract

**Generated:** 2026-01-06
**Purpose:** Complete API reference for time tracking module with billing, approval workflows, and reporting.

---

## Valid Enum Values

### Time Type
```javascript
['billable', 'non_billable', 'pro_bono', 'internal']
```

### Bill Status
```javascript
['draft', 'unbilled', 'billed', 'written_off']
```

### Entry Status (Workflow)
```javascript
['draft', 'pending', 'submitted', 'changes_requested', 'approved', 'rejected', 'billed', 'locked']
```

### UTBMS Activity Codes (Legal Industry Standard)
```javascript
{
    // L100 - Case Assessment & Strategy
    'L110': { category: 'case_assessment', description: 'Legal consultation', descriptionAr: 'استشارة قانونية' },
    'L120': { category: 'case_assessment', description: 'Legal research', descriptionAr: 'بحث قانوني' },
    'L130': { category: 'case_assessment', description: 'Drafting documents', descriptionAr: 'صياغة مستندات' },
    'L140': { category: 'case_assessment', description: 'Document review', descriptionAr: 'مراجعة مستندات' },
    'L150': { category: 'case_assessment', description: 'Case analysis', descriptionAr: 'تحليل قضية' },

    // L200 - Court & Legal Proceedings
    'L210': { category: 'proceedings', description: 'Court attendance', descriptionAr: 'حضور جلسة محكمة' },
    'L220': { category: 'proceedings', description: 'Client meeting', descriptionAr: 'اجتماع مع العميل' },
    'L230': { category: 'proceedings', description: 'Phone call/conference', descriptionAr: 'مكالمة هاتفية/مؤتمر' },
    'L240': { category: 'proceedings', description: 'Correspondence', descriptionAr: 'مراسلات' },
    'L250': { category: 'proceedings', description: 'Negotiations', descriptionAr: 'مفاوضات' },
    'L260': { category: 'proceedings', description: 'Mediation', descriptionAr: 'وساطة' },
    'L270': { category: 'proceedings', description: 'Arbitration', descriptionAr: 'تحكيم' },

    // L300 - Travel & Waiting
    'L310': { category: 'travel', description: 'Travel time', descriptionAr: 'وقت السفر' },
    'L320': { category: 'travel', description: 'Waiting time', descriptionAr: 'وقت الانتظار' },

    // L400 - Administrative
    'L410': { category: 'administrative', description: 'Administrative tasks', descriptionAr: 'أعمال إدارية' },
    'L420': { category: 'administrative', description: 'File organization', descriptionAr: 'تنظيم ملفات' },

    // L500 - Training & Development
    'L510': { category: 'training', description: 'Training & development', descriptionAr: 'تدريب وتطوير' },
    'L520': { category: 'training', description: 'Legal research (educational)', descriptionAr: 'بحث قانوني (تعليمي)' }
}
```

---

## TimeEntry Schema

### Multi-Tenancy Fields
```javascript
{
    firmId: ObjectId,      // Reference to Firm (indexed)
    lawyerId: ObjectId     // Legacy field for backwards compatibility
}
```

### Core Fields
```javascript
{
    entryId: String,       // Auto-generated: TE-YYYY-NNNN (unique, indexed)
    description: String,   // 1-500 chars, trimmed

    // Assignment
    assigneeId: ObjectId,  // Attorney who performed work (ref: User)
    userId: ObjectId,      // Who created the entry (ref: User)

    // Related Entities
    clientId: ObjectId,    // Reference to Client
    caseId: ObjectId,      // Reference to Case (indexed)
    taskId: ObjectId,      // Reference to Task (indexed)

    // Time Data
    date: Date,            // Work date (indexed)
    startTime: String,     // HH:mm format
    endTime: String,       // HH:mm format
    breakMinutes: Number,  // 0-1440, subtracted from duration
    duration: Number,      // In minutes (0-1440)
    hours: Number,         // Computed: duration / 60

    // Activity Classification
    activityCode: String,  // UTBMS code (e.g., L110, L210)
    timeType: String,      // billable | non_billable | pro_bono | internal

    // Billing & Costs (amounts in halalas)
    hourlyRate: Number,    // Rate in halalas
    totalAmount: Number,   // Computed: (duration/60) * hourlyRate
    isBillable: Boolean,   // (indexed)
    isBilled: Boolean,     // (indexed)
    billStatus: String,    // draft | unbilled | billed | written_off
    invoiceId: ObjectId,   // Reference to Invoice (indexed)
    invoicedAt: Date
}
```

### Write-Off / Write-Down Fields
```javascript
{
    // Write-Off (full removal from billing)
    writeOff: Boolean,
    writeOffReason: String,   // Required if writeOff=true
    writeOffBy: ObjectId,     // Reference to User
    writeOffAt: Date,

    // Write-Down (partial reduction)
    writeDown: Boolean,
    writeDownAmount: Number,  // Required if writeDown=true
    writeDownReason: String,
    writeDownBy: ObjectId,    // Reference to User
    writeDownAt: Date,
    finalAmount: Number       // Calculated after write-down
}
```

### Status & Approval Fields
```javascript
{
    status: String,           // Enum: ENTRY_STATUSES
    submittedAt: Date,
    submittedBy: ObjectId,
    assignedManager: ObjectId,

    // Approval
    approvedBy: ObjectId,
    approvedAt: Date,

    // Rejection
    rejectedBy: ObjectId,
    rejectedAt: Date,
    rejectionReason: String,  // Max 500 chars

    // Changes Requested (NEW - 2026-01-06)
    changesRequestedBy: ObjectId,
    changesRequestedAt: Date,
    changesRequestedReason: String,  // Max 500 chars
    requestedChanges: [{
        field: String,
        currentValue: Mixed,
        suggestedValue: Mixed,
        note: String
    }],

    // Locking (fiscal period close)
    lockedAt: Date,
    lockedBy: ObjectId,
    lockReason: String        // Max 500 chars
}
```

### Timer-Based Fields
```javascript
{
    wasTimerBased: Boolean,
    timerStartedAt: Date,
    timerPausedDuration: Number  // In milliseconds
}
```

### Notes & Attachments
```javascript
{
    notes: String,  // Max 2000 chars
    attachments: [{
        fileName: String,
        fileUrl: String,
        fileType: String,
        fileSize: Number,
        uploadedAt: Date
    }]
}
```

### History & Audit
```javascript
{
    history: [{
        action: String,      // e.g., 'created', 'submitted', 'approved', 'changes_requested'
        performedBy: ObjectId,
        timestamp: Date,
        details: Mixed
    }],
    createdBy: ObjectId,
    createdAt: Date,
    updatedAt: Date
}
```

---

## API Endpoints

### Timer Operations
| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| POST | /timer/start | startTimer | Start in-app timer |
| POST | /timer/pause | pauseTimer | Pause running timer |
| POST | /timer/resume | resumeTimer | Resume paused timer |
| POST | /timer/stop | stopTimer | Stop timer and create entry |
| GET | /timer/status | getTimerStatus | Get current timer state |

### Time Entry CRUD
| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| POST | /entries | createTimeEntry | Create manual time entry |
| GET | /entries | getTimeEntries | List entries with filters |
| GET | /entries/:id | getTimeEntry | Get single entry |
| PATCH | /entries/:id | updateTimeEntry | Update entry |
| DELETE | /entries/:id | deleteTimeEntry | Delete entry |

### Write-Off / Write-Down
| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| POST | /entries/:id/write-off | writeOffTimeEntry | Write off entry fully |
| POST | /entries/:id/write-down | writeDownTimeEntry | Partial write-down |

### Approval Workflow
| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| POST | /entries/:id/submit | submitTimeEntry | Submit for approval |
| POST | /entries/:id/request-changes | requestChangesTimeEntry | Request modifications |
| POST | /entries/:id/approve | approveTimeEntry | Approve entry |
| POST | /entries/:id/reject | rejectTimeEntry | Reject entry |
| GET | /entries/pending-approval | getPendingApprovalEntries | Get pending entries |
| POST | /entries/bulk-submit | bulkSubmitTimeEntries | Bulk submit |
| POST | /entries/bulk-approve | bulkApproveTimeEntries | Bulk approve |
| POST | /entries/bulk-reject | bulkRejectTimeEntries | Bulk reject |

### Analytics & Reports
| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | /stats | getTimeStats | Time statistics |
| GET | /weekly | getWeeklyEntries | Weekly view |
| GET | /unbilled | getUnbilledEntries | Unbilled entries |

### Utilities
| Method | Endpoint | Handler | Description |
|--------|----------|---------|-------------|
| GET | /activity-codes | getActivityCodes | Get UTBMS codes |
| DELETE | /entries/bulk | bulkDeleteTimeEntries | Bulk delete |

---

## Allowed Request Body Fields

### POST /time-tracking/entries (Create Time Entry)
```javascript
[
    'description', 'date', 'startTime', 'endTime', 'breakMinutes', 'duration',
    'activityCode', 'timeType', 'hourlyRate', 'isBillable',
    'clientId', 'caseId', 'taskId', 'assigneeId', 'notes'
]
```

### PATCH /time-tracking/entries/:id (Update Time Entry)
```javascript
[
    'description', 'date', 'startTime', 'endTime', 'breakMinutes', 'duration',
    'activityCode', 'timeType', 'hourlyRate', 'isBillable', 'notes',
    'clientId', 'caseId', 'taskId'
]
```

### POST /time-tracking/timer/start
```javascript
['caseId', 'clientId', 'taskId', 'description', 'activityCode']
```

### POST /time-tracking/timer/stop
```javascript
['description', 'activityCode', 'isBillable', 'notes']
```

### POST /time-tracking/entries/:id/write-off
```javascript
['reason']  // Required
```

### POST /time-tracking/entries/:id/write-down
```javascript
['amount', 'reason']  // amount is required
```

### POST /time-tracking/entries/:id/request-changes
```javascript
['reason', 'requestedChanges']  // reason is required
```

### POST /time-tracking/entries/:id/reject
```javascript
['reason']  // Required
```

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
    "message": "Error message | رسالة الخطأ"
}
```

### TimeEntry Object Shape
```json
{
    "_id": "ObjectId",
    "entryId": "TE-2026-0001",
    "description": "Legal research on contract law",
    "date": "2026-01-06T00:00:00.000Z",
    "startTime": "09:00",
    "endTime": "11:30",
    "breakMinutes": 15,
    "duration": 135,
    "hours": 2.25,
    "activityCode": "L120",
    "timeType": "billable",
    "hourlyRate": 50000,
    "totalAmount": 112500,
    "isBillable": true,
    "isBilled": false,
    "billStatus": "unbilled",
    "status": "approved",
    "assigneeId": { "_id": "...", "firstName": "...", "lastName": "...", "email": "..." },
    "clientId": { "_id": "...", "firstName": "...", "lastName": "..." },
    "caseId": { "_id": "...", "title": "...", "caseNumber": "..." },
    "taskId": { "_id": "...", "title": "..." },
    "submittedAt": "2026-01-06T10:00:00.000Z",
    "submittedBy": { "_id": "...", "firstName": "...", "lastName": "..." },
    "approvedBy": { "_id": "...", "firstName": "...", "lastName": "..." },
    "approvedAt": "2026-01-06T11:00:00.000Z",
    "history": [...],
    "notes": "Additional notes here",
    "createdAt": "2026-01-06T09:00:00.000Z",
    "updatedAt": "2026-01-06T11:00:00.000Z"
}
```

---

## Workflow States

### Entry Status Flow
```
draft → submitted → approved → billed → locked
                  ↘ changes_requested → submitted (resubmit)
                  ↘ rejected → draft (revise)
```

### Valid Transitions
| From | To | Action |
|------|-----|--------|
| draft | submitted | Submit for approval |
| submitted | approved | Approve |
| submitted | rejected | Reject |
| submitted | changes_requested | Request changes |
| changes_requested | submitted | Resubmit after changes |
| rejected | draft | Revise |
| rejected | submitted | Resubmit |
| approved | billed | Invoice |
| approved | locked | Period close |
| billed | locked | Period close |

---

## Timer Operations

### POST /time-tracking/timer/start

Start a new timer session.

**Request Body:**
```json
{
    "caseId": "ObjectId (optional)",
    "clientId": "ObjectId (optional)",
    "taskId": "ObjectId (optional)",
    "description": "Working on contract review",
    "activityCode": "L140"
}
```

**Success Response (200):**
```json
{
    "success": true,
    "message": "Timer started | بدأ المؤقت",
    "data": {
        "timerId": "...",
        "startedAt": "2026-01-06T09:00:00.000Z",
        "caseId": "...",
        "clientId": "...",
        "description": "Working on contract review"
    }
}
```

### POST /time-tracking/timer/stop

Stop the running timer and create a time entry.

**Request Body:**
```json
{
    "description": "Completed contract review",
    "activityCode": "L140",
    "isBillable": true,
    "notes": "Found 3 issues to address"
}
```

**Success Response (200):**
```json
{
    "success": true,
    "message": "Timer stopped and time entry created | توقف المؤقت وتم إنشاء سجل الوقت",
    "data": {
        "timeEntry": { /* TimeEntry object */ },
        "duration": 135,
        "hours": 2.25
    }
}
```

---

## Approval Workflow Endpoints

### POST /time-tracking/entries/:id/submit

Submit a time entry for approval.

**Success Response (200):**
```json
{
    "success": true,
    "message": "Time entry submitted for approval | تم تقديم السجل للموافقة",
    "data": { "timeEntry": { ... } }
}
```

### POST /time-tracking/entries/:id/request-changes

Request changes to a submitted time entry.

**Request Body:**
```json
{
    "reason": "Please update the activity code",
    "requestedChanges": [
        {
            "field": "activityCode",
            "currentValue": "L110",
            "suggestedValue": "L120",
            "note": "This was research, not consultation"
        }
    ]
}
```

**Success Response (200):**
```json
{
    "success": true,
    "message": "Changes requested for time entry | تم طلب تغييرات للسجل",
    "data": { "timeEntry": { ... } }
}
```

### POST /time-tracking/entries/:id/approve

Approve a submitted time entry.

**Success Response (200):**
```json
{
    "success": true,
    "message": "Time entry approved | تمت الموافقة على السجل",
    "data": { "timeEntry": { ... } }
}
```

### POST /time-tracking/entries/:id/reject

Reject a submitted time entry.

**Request Body:**
```json
{
    "reason": "Duration seems excessive for this task"
}
```

**Success Response (200):**
```json
{
    "success": true,
    "message": "Time entry rejected | تم رفض السجل",
    "data": { "timeEntry": { ... } }
}
```

---

## Write-Off / Write-Down

### POST /time-tracking/entries/:id/write-off

Write off a time entry completely (removes from billing).

**Request Body:**
```json
{
    "reason": "Client goodwill - initial consultation"
}
```

**Success Response (200):**
```json
{
    "success": true,
    "message": "Time entry written off | تم شطب السجل",
    "data": {
        "timeEntry": { ... },
        "originalAmount": 112500,
        "writtenOffAmount": 112500
    }
}
```

### POST /time-tracking/entries/:id/write-down

Reduce the billable amount of a time entry.

**Request Body:**
```json
{
    "amount": 50000,
    "reason": "Reduced rate for repeat client"
}
```

**Success Response (200):**
```json
{
    "success": true,
    "message": "Time entry written down | تم تخفيض السجل",
    "data": {
        "timeEntry": { ... },
        "originalAmount": 112500,
        "writeDownAmount": 50000,
        "finalAmount": 62500
    }
}
```

---

## Analytics Endpoints

### GET /time-tracking/stats

Get time tracking statistics.

**Query Parameters:**
- `startDate`: ISO date (default: start of month)
- `endDate`: ISO date (default: end of month)
- `assigneeId`: Filter by attorney
- `caseId`: Filter by case
- `clientId`: Filter by client

**Success Response (200):**
```json
{
    "success": true,
    "data": {
        "totalHours": 160.5,
        "billableHours": 140.25,
        "nonBillableHours": 20.25,
        "totalAmount": 7012500,
        "billedAmount": 3500000,
        "unbilledAmount": 3512500,
        "byActivityCode": {
            "L110": { "hours": 40, "amount": 2000000 },
            "L120": { "hours": 30, "amount": 1500000 }
        },
        "byTimeType": {
            "billable": { "hours": 140.25, "amount": 7012500 },
            "non_billable": { "hours": 20.25, "amount": 0 }
        }
    }
}
```

### GET /time-tracking/weekly

Get weekly time entries view.

**Query Parameters:**
- `weekStart`: ISO date (Monday of the week)
- `assigneeId`: Filter by attorney

**Success Response (200):**
```json
{
    "success": true,
    "data": {
        "weekStart": "2026-01-06",
        "weekEnd": "2026-01-12",
        "dailyTotals": {
            "2026-01-06": { "hours": 8.5, "entries": 3 },
            "2026-01-07": { "hours": 7.25, "entries": 2 }
        },
        "totalHours": 40.5,
        "entries": [...]
    }
}
```

### GET /time-tracking/unbilled

Get all unbilled time entries for invoicing.

**Query Parameters:**
- `clientId`: Filter by client (required for invoicing)
- `caseId`: Filter by case
- `startDate`: Filter by date range
- `endDate`: Filter by date range

**Success Response (200):**
```json
{
    "success": true,
    "data": {
        "entries": [...],
        "totalHours": 25.5,
        "totalAmount": 1275000,
        "count": 12
    }
}
```

---

## Bulk Operations

### POST /time-tracking/entries/bulk-submit

Submit multiple time entries for approval.

**Request Body:**
```json
{
    "entryIds": ["id1", "id2", "id3"]
}
```

**Success Response (200):**
```json
{
    "success": true,
    "message": "3 entries submitted | تم تقديم 3 سجلات",
    "data": {
        "submitted": 3,
        "failed": 0
    }
}
```

### POST /time-tracking/entries/bulk-approve

Approve multiple time entries at once.

**Request Body:**
```json
{
    "entryIds": ["id1", "id2", "id3"]
}
```

**Success Response (200):**
```json
{
    "success": true,
    "message": "3 entries approved | تمت الموافقة على 3 سجلات",
    "data": {
        "approved": 3,
        "failed": 0
    }
}
```

### POST /time-tracking/entries/bulk-reject

Reject multiple time entries at once.

**Request Body:**
```json
{
    "entryIds": ["id1", "id2", "id3"],
    "reason": "Insufficient documentation"
}
```

**Success Response (200):**
```json
{
    "success": true,
    "message": "3 entries rejected | تم رفض 3 سجلات",
    "data": {
        "rejected": 3,
        "failed": 0
    }
}
```

---

## Firm Isolation (Multi-Tenancy)

### Gold Standard Compliance

All time tracking queries use proper firm isolation:

```javascript
// Controller uses getFirmFilter helper
const firmFilter = getFirmFilter(req);

// All queries include firm filter
const entries = await TimeEntry.find({ ...firmFilter, status: 'submitted' });

// Creates use addFirmId helper
const entry = await TimeEntry.create(req.addFirmId({ ...data }));
```

### Isolation Behavior

| User Type | Filter Applied | Can Access |
|-----------|---------------|------------|
| Firm Member | `{ firmId: X }` | All firm entries |
| Solo Lawyer | `{ lawyerId: Y }` | Only their own entries |
| Departed | `{ lawyerId: Y }` + restrictions | Read-only, own entries |

---

## Change Log

| Date | Change | Breaking? |
|------|--------|-----------|
| 2026-01-06 | Initial comprehensive contract created | N/A |
| 2026-01-06 | Added `changes_requested` status to ENTRY_STATUSES enum | No |
| 2026-01-06 | Added changesRequestedBy, changesRequestedAt, changesRequestedReason fields | No |
| 2026-01-06 | Added requestedChanges array field for detailed change requests | No |
| 2026-01-06 | Updated submit method to allow resubmission from changes_requested status | No |

---

## Security Checklist

- [x] All endpoints use `sanitizeObjectId()` for ID parameters
- [x] All endpoints use `pickAllowedFields()` for request body
- [x] All queries include firm isolation via `firmFilter`
- [x] Race conditions prevented in approval workflow
- [x] Departed users blocked from modifications
- [x] No direct firmId queries (uses helper functions)

---

## Quick Verification Commands

```bash
# Check firm filter usage
grep -c "firmFilter" src/controllers/timeTracking.controller.js

# Check sanitization
grep -c "sanitizeObjectId" src/controllers/timeTracking.controller.js

# Check allowed fields protection
grep -c "pickAllowedFields" src/controllers/timeTracking.controller.js

# Verify syntax
node --check src/controllers/timeTracking.controller.js
node --check src/models/timeEntry.model.js
```
