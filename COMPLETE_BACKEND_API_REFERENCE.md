# Complete Backend API Reference for Frontend

> **Version:** 1.0
> **Last Updated:** 2025-12-09
> **Base URL:** `/api`

---

## Table of Contents
1. [Global Configuration](#global-configuration)
2. [Authentication](#authentication)
3. [Users](#users)
4. [Dashboard](#dashboard)
5. [Cases](#cases)
6. [Tasks](#tasks)
7. [Events](#events)
8. [Reminders](#reminders)
9. [Gantt Chart](#gantt-chart)
10. [Clients](#clients)
11. [Invoices](#invoices)
12. [Payments](#payments)
13. [Time Tracking](#time-tracking)
14. [Documents](#documents)
15. [HR Module](#hr-module)
16. [CRM & Leads](#crm--leads)
17. [Notifications](#notifications)

---

## Global Configuration

### Date/Time Format
All dates are returned in **ISO 8601 format** from MongoDB:
```
2025-01-15T00:00:00.000Z
```

**Exception: Gantt endpoints** return dates as:
```
YYYY-MM-DD HH:mm
```
Example: `2025-01-15 00:00`

### Default Timezone
```
Asia/Riyadh (UTC+3)
```

### Standard Response Format
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Optional message",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE",
  "details": { /* optional error details */ }
}
```

### Standard Query Parameters (All List Endpoints)
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |
| `sort` | string | Sort field (prefix with `-` for descending) |
| `search` | string | Search term |
| `status` | string | Filter by status |

### Authentication Header
```
Authorization: Bearer <jwt_token>
```

---

## Authentication

### Base Path: `/api/auth`

#### POST `/api/auth/check-availability`
Check if email/username/phone is available.

**Request:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "phone": "+966501234567"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "email": { "available": true },
    "username": { "available": false, "message": "Username taken" },
    "phone": { "available": true }
  }
}
```

---

#### POST `/api/auth/register`
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+966501234567",
  "role": "lawyer",
  "lawyerWorkMode": "solo"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { /* user object */ },
    "token": "jwt_token_here"
  },
  "message": "Registration successful"
}
```

---

#### POST `/api/auth/login`
Login with credentials.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "lawyer",
      "firmId": "507f1f77bcf86cd799439012",
      "firmRole": "owner"
    },
    "token": "jwt_token_here"
  }
}
```

---

#### POST `/api/auth/send-otp`
Send OTP to email for verification.

**Request:**
```json
{
  "email": "user@example.com"
}
```

---

#### POST `/api/auth/verify-otp`
Verify OTP and login.

**Request:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

---

#### GET `/api/auth/me`
Get current authenticated user.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+966501234567",
    "role": "lawyer",
    "firmId": "507f1f77bcf86cd799439012",
    "firmRole": "owner",
    "isSoloLawyer": false,
    "lawyerWorkMode": "firm_owner",
    "timezone": "Asia/Riyadh",
    "lawyerProfile": {
      "isLicensed": true,
      "licenseNumber": "12345",
      "yearsExperience": 10,
      "specialization": ["commercial", "labor"],
      "languages": ["Arabic", "English"]
    }
  }
}
```

---

## Users

### Base Path: `/api/users`

#### GET `/api/users/team`
Get team members for current firm.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@firm.com",
      "firmRole": "partner",
      "firmStatus": "active",
      "image": "https://..."
    }
  ]
}
```

---

#### GET `/api/users/:_id`
Get user profile.

---

#### PATCH `/api/users/:_id`
Update user profile.

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+966501234567",
  "timezone": "Asia/Riyadh"
}
```

---

## Dashboard

### Base Path: `/api/dashboard`

#### GET `/api/dashboard/hero-stats`
Get top-level dashboard metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "activeCases": 15,
    "pendingTasks": 8,
    "upcomingEvents": 3,
    "overdueInvoices": 2,
    "totalRevenue": 150000,
    "monthlyRevenue": 25000,
    "completedTasksThisWeek": 12
  }
}
```

---

#### GET `/api/dashboard/today-events`
Get today's events.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "Client Meeting",
      "startDateTime": "2025-01-15T09:00:00.000Z",
      "endDateTime": "2025-01-15T10:00:00.000Z",
      "type": "client_meeting",
      "status": "scheduled"
    }
  ]
}
```

---

## Cases

### Base Path: `/api/cases`

### Case Object Structure
```typescript
interface Case {
  _id: string;
  firmId: string;
  lawyerId: string;
  clientId: string;
  clientName?: string;
  title: string;
  description?: string;
  category: string;
  caseNumber?: string;
  court?: string;
  judge?: string;
  nextHearing?: string; // ISO date
  priority: "low" | "medium" | "high" | "critical";
  progress: number; // 0-100
  status: "active" | "closed" | "appeal" | "settlement" | "on-hold" | "completed" | "won" | "lost" | "settled";
  outcome: "won" | "lost" | "settled" | "ongoing";
  claimAmount: number;
  expectedWinAmount: number;
  startDate: string; // ISO date
  endDate?: string; // ISO date
  timeline: TimelineEvent[];
  claims: Claim[];
  notes: Note[];
  documents: Document[];
  richDocuments: RichDocument[];
  hearings: Hearing[];
  laborCaseDetails?: {
    plaintiff: { name, nationalId, phone, address, city };
    company: { name, registrationNumber, address, city };
  };
  createdAt: string;
  updatedAt: string;
}
```

---

#### GET `/api/cases/statistics`
Get case statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 45,
    "byStatus": {
      "active": 20,
      "closed": 15,
      "appeal": 5,
      "on-hold": 5
    },
    "byOutcome": {
      "won": 10,
      "lost": 3,
      "settled": 7,
      "ongoing": 25
    },
    "byPriority": {
      "critical": 2,
      "high": 8,
      "medium": 25,
      "low": 10
    }
  }
}
```

---

#### POST `/api/cases`
Create a new case.

**Request:**
```json
{
  "title": "Employment Dispute - ABC Corp",
  "description": "Wrongful termination case",
  "category": "labor",
  "clientId": "507f1f77bcf86cd799439011",
  "priority": "high",
  "caseNumber": "1446/123456",
  "court": "Labor Court - Riyadh",
  "claimAmount": 150000,
  "laborCaseDetails": {
    "plaintiff": {
      "name": "Ahmed Ali",
      "nationalId": "1234567890",
      "phone": "+966501234567"
    },
    "company": {
      "name": "ABC Corporation",
      "registrationNumber": "1010123456"
    }
  }
}
```

---

#### GET `/api/cases`
Get all cases with filters.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status |
| `caseType` | string | Filter by category |
| `clientId` | string | Filter by client |
| `priority` | string | Filter by priority |
| `search` | string | Search in title/description |

---

#### GET `/api/cases/:_id`
Get case by ID.

---

#### PATCH `/api/cases/:_id`
Update case.

---

#### DELETE `/api/cases/:_id`
Delete case (cascades to documents).

---

#### PATCH `/api/cases/:_id/progress`
Update case progress.

**Request:**
```json
{
  "progress": 75
}
```

---

#### PATCH `/api/cases/:_id/status`
Update case status.

**Request:**
```json
{
  "status": "closed",
  "outcome": "won"
}
```

---

### Case Notes

#### POST `/api/cases/:_id/note`
Add note to case.

**Request:**
```json
{
  "text": "Client confirmed attendance for next hearing"
}
```

---

### Case Documents

#### POST `/api/cases/:_id/documents/upload-url`
Get presigned S3 upload URL.

**Request:**
```json
{
  "filename": "contract.pdf",
  "fileType": "application/pdf",
  "category": "contract"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://s3.amazonaws.com/...",
    "fileKey": "cases/507f.../contract.pdf",
    "expiresIn": 3600
  }
}
```

---

#### POST `/api/cases/:_id/documents/confirm`
Confirm document upload.

**Request:**
```json
{
  "fileKey": "cases/507f.../contract.pdf",
  "filename": "contract.pdf",
  "fileType": "application/pdf",
  "size": 1024000,
  "category": "contract"
}
```

---

### Case Hearings

#### POST `/api/cases/:_id/hearing`
Add hearing.

**Request:**
```json
{
  "date": "2025-02-15T09:00:00.000Z",
  "location": "Labor Court - Riyadh, Room 5",
  "notes": "Witness testimony scheduled"
}
```

---

### Rich Documents (CKEditor)

#### POST `/api/cases/:_id/rich-documents`
Create rich text document.

**Request:**
```json
{
  "title": "Legal Memorandum",
  "titleAr": "مذكرة قانونية",
  "content": "<p>Document content in HTML...</p>",
  "documentType": "legal_memo",
  "language": "ar",
  "textDirection": "rtl"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Legal Memorandum",
    "titleAr": "مذكرة قانونية",
    "content": "<p>Document content...</p>",
    "documentType": "legal_memo",
    "status": "draft",
    "language": "ar",
    "textDirection": "rtl",
    "version": 1,
    "wordCount": 150,
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

---

#### GET `/api/cases/:_id/rich-documents/:docId/export/pdf`
Export document to PDF.

---

## Tasks

### Base Path: `/api/tasks`

### Task Object Structure
```typescript
interface Task {
  _id: string;
  firmId: string;
  title: string;
  description?: string;
  status: "backlog" | "todo" | "in_progress" | "done" | "canceled";
  priority: "none" | "low" | "medium" | "high" | "critical";
  label?: "bug" | "feature" | "documentation" | "enhancement" | "question" | "legal" | "administrative" | "urgent";
  tags: string[];
  dueDate?: string; // ISO date
  dueTime?: string; // HH:mm format
  startDate?: string; // ISO date
  assignedTo: string; // User ID
  createdBy: string; // User ID
  caseId?: string;
  clientId?: string;
  parentTaskId?: string;
  subtasks: Subtask[];
  progress: number; // 0-100
  manualProgress: boolean;
  timeTracking: {
    estimatedMinutes: number;
    actualMinutes: number;
    sessions: TimeSession[];
    isTracking: boolean;
    currentSessionStart?: string;
  };
  recurring?: RecurringConfig;
  reminders: TaskReminder[];
  attachments: Attachment[];
  comments: Comment[];
  dependencies: Dependency[];
  blockedBy: string[]; // Task IDs
  blocks: string[]; // Task IDs
  taskType: "general" | "court_hearing" | "document_review" | "client_meeting" | "filing_deadline" | "appeal_deadline" | "discovery" | "deposition" | "mediation" | "settlement" | "research" | "drafting" | "other";
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface Subtask {
  _id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
  order: number;
}
```

---

#### GET `/api/tasks/stats`
Get task statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 45,
    "byStatus": {
      "backlog": 5,
      "todo": 15,
      "in_progress": 10,
      "done": 12,
      "canceled": 3
    },
    "overdue": 4,
    "dueToday": 3,
    "completedThisWeek": 8
  }
}
```

---

#### GET `/api/tasks/upcoming`
Get upcoming tasks (next 7 days).

---

#### GET `/api/tasks/overdue`
Get overdue tasks.

---

#### GET `/api/tasks/due-today`
Get tasks due today.

---

#### GET `/api/tasks/case/:caseId`
Get tasks for a specific case.

---

#### POST `/api/tasks`
Create task.

**Request:**
```json
{
  "title": "Review contract draft",
  "description": "Review and annotate the employment contract",
  "status": "todo",
  "priority": "high",
  "dueDate": "2025-01-20T17:00:00.000Z",
  "assignedTo": "507f1f77bcf86cd799439011",
  "caseId": "507f1f77bcf86cd799439012",
  "taskType": "document_review",
  "timeTracking": {
    "estimatedMinutes": 120
  },
  "subtasks": [
    { "title": "Read contract" },
    { "title": "Add annotations" },
    { "title": "Send to client" }
  ]
}
```

---

#### GET `/api/tasks`
Get all tasks.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status (comma-separated) |
| `priority` | string | Filter by priority |
| `assignedTo` | string | Filter by assignee |
| `caseId` | string | Filter by case |
| `dueDate` | string | Filter by due date |
| `taskType` | string | Filter by task type |

---

#### GET `/api/tasks/:id`
Get task by ID.

---

#### PUT `/api/tasks/:id`
Update task.

---

#### DELETE `/api/tasks/:id`
Delete task.

---

#### POST `/api/tasks/:id/complete`
Mark task as complete.

---

#### POST `/api/tasks/:id/status`
Update task status.

**Request:**
```json
{
  "status": "in_progress"
}
```

---

### Subtasks

#### POST `/api/tasks/:id/subtask`
Add subtask.

**Request:**
```json
{
  "title": "Review section 3"
}
```

---

#### POST `/api/tasks/:id/subtasks/:subtaskId/toggle`
Toggle subtask completion.

---

### Time Tracking

#### POST `/api/tasks/:id/timer/start`
Start timer on task.

---

#### POST `/api/tasks/:id/timer/stop`
Stop timer on task.

**Response:**
```json
{
  "success": true,
  "data": {
    "duration": 45,
    "session": {
      "_id": "507f1f77bcf86cd799439011",
      "startedAt": "2025-01-15T10:00:00.000Z",
      "endedAt": "2025-01-15T10:45:00.000Z",
      "duration": 45
    }
  }
}
```

---

### Task Dependencies

#### POST `/api/tasks/:id/dependencies`
Add dependency.

**Request:**
```json
{
  "taskId": "507f1f77bcf86cd799439011",
  "type": "blocked_by"
}
```

---

### Task Templates

#### GET `/api/tasks/templates`
Get all task templates.

---

#### POST `/api/tasks/templates`
Create task template.

---

#### POST `/api/tasks/templates/:templateId/create`
Create task from template.

**Request:**
```json
{
  "caseId": "507f1f77bcf86cd799439011",
  "assignedTo": "507f1f77bcf86cd799439012",
  "dueDate": "2025-01-20T17:00:00.000Z"
}
```

---

## Events

### Base Path: `/api/events`

### Event Object Structure
```typescript
interface Event {
  _id: string;
  eventId: string; // EVT-202501-0001
  firmId: string;
  title: string;
  description?: string;
  type: "hearing" | "court_date" | "meeting" | "client_meeting" | "deposition" | "mediation" | "arbitration" | "deadline" | "filing_deadline" | "conference_call" | "internal_meeting" | "training" | "webinar" | "consultation" | "task" | "other";
  status: "scheduled" | "confirmed" | "tentative" | "canceled" | "cancelled" | "postponed" | "completed" | "in_progress" | "rescheduled";
  startDateTime: string; // ISO date
  endDateTime?: string; // ISO date
  allDay: boolean;
  timezone: string;
  location?: {
    name: string;
    address?: string;
    room?: string;
    virtualLink?: string;
    virtualPlatform?: "zoom" | "teams" | "google_meet" | "webex" | "other";
  };
  organizer: string; // User ID
  attendees: Attendee[];
  caseId?: string;
  clientId?: string;
  taskId?: string;
  courtDetails?: {
    courtType: string;
    courtCaseNumber: string;
    najizCaseNumber?: string;
  };
  virtualMeeting?: {
    platform: string;
    meetingUrl: string;
    meetingId?: string;
    meetingPassword?: string;
  };
  agenda: AgendaItem[];
  actionItems: ActionItem[];
  reminders: EventReminder[];
  recurrence?: RecurrenceConfig;
  priority: "low" | "medium" | "high" | "critical";
  color: string; // Hex color
  billing?: {
    isBillable: boolean;
    billingType: string;
    hourlyRate?: number;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Attendee {
  _id: string;
  userId?: string;
  email: string;
  name: string;
  role: "organizer" | "required" | "optional" | "resource";
  status: "invited" | "confirmed" | "declined" | "tentative" | "no_response";
  responseStatus: "pending" | "accepted" | "declined" | "tentative";
}
```

---

#### GET `/api/events/stats`
Get event statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 50,
    "byStatus": {
      "scheduled": 20,
      "confirmed": 15,
      "completed": 10,
      "cancelled": 5
    },
    "byType": {
      "hearing": 8,
      "client_meeting": 15,
      "internal_meeting": 12
    },
    "today": 3,
    "thisWeek": 12
  }
}
```

---

#### GET `/api/events/calendar`
Get calendar events for a date range.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | string | Range start (ISO date) |
| `endDate` | string | Range end (ISO date) |
| `caseId` | string | Filter by case |
| `type` | string | Filter by event type |

---

#### GET `/api/events/upcoming`
Get upcoming events (next 7 days).

---

#### POST `/api/events`
Create event.

**Request:**
```json
{
  "title": "Client Meeting - ABC Corp",
  "description": "Discuss case strategy",
  "type": "client_meeting",
  "startDateTime": "2025-01-20T10:00:00.000Z",
  "endDateTime": "2025-01-20T11:00:00.000Z",
  "location": {
    "name": "Office Conference Room",
    "room": "Room 3"
  },
  "attendees": [
    {
      "email": "client@example.com",
      "name": "Ahmed Ali",
      "role": "required"
    }
  ],
  "caseId": "507f1f77bcf86cd799439011",
  "reminders": [
    { "type": "notification", "beforeMinutes": 30 },
    { "type": "email", "beforeMinutes": 1440 }
  ]
}
```

---

#### GET `/api/events/:id`
Get event by ID.

---

#### PUT `/api/events/:id`
Update event.

---

#### DELETE `/api/events/:id`
Delete event.

---

#### POST `/api/events/:id/cancel`
Cancel event.

**Request:**
```json
{
  "reason": "Client requested reschedule"
}
```

---

#### POST `/api/events/:id/rsvp`
RSVP to event.

**Request:**
```json
{
  "status": "accepted",
  "responseNote": "Will attend"
}
```

---

#### POST `/api/events/:id/check-availability`
Check attendee availability.

**Request:**
```json
{
  "attendeeIds": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
  "startDateTime": "2025-01-20T10:00:00.000Z",
  "endDateTime": "2025-01-20T11:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "available": false,
    "conflicts": [
      {
        "_id": "507f1f77bcf86cd799439013",
        "title": "Another Meeting",
        "startDateTime": "2025-01-20T09:30:00.000Z",
        "endDateTime": "2025-01-20T10:30:00.000Z"
      }
    ]
  }
}
```

---

## Reminders

### Base Path: `/api/reminders`

### Reminder Object Structure
```typescript
interface Reminder {
  _id: string;
  reminderId: string; // REM-202501-0001
  title: string;
  description?: string;
  userId: string;
  reminderDateTime: string; // ISO date
  priority: "low" | "medium" | "high" | "critical";
  type: "task_due" | "hearing" | "deadline" | "meeting" | "payment" | "contract_renewal" | "statute_limitation" | "follow_up" | "general";
  status: "pending" | "snoozed" | "completed" | "dismissed" | "delegated";
  snooze?: {
    snoozedAt: string;
    snoozeUntil: string;
    snoozeCount: number;
  };
  notification: {
    channels: ("push" | "email" | "sms" | "whatsapp" | "in_app")[];
    sent: boolean;
    sentAt?: string;
  };
  relatedCase?: string;
  relatedTask?: string;
  relatedEvent?: string;
  delegatedTo?: string;
  recurring?: RecurringConfig;
  createdAt: string;
  updatedAt: string;
}
```

---

#### GET `/api/reminders`
Get all reminders.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status |
| `type` | string | Filter by type |
| `startDate` | string | Filter from date |
| `endDate` | string | Filter to date |

---

#### POST `/api/reminders`
Create reminder.

**Request:**
```json
{
  "title": "Follow up with client",
  "description": "Check case status",
  "reminderDateTime": "2025-01-20T09:00:00.000Z",
  "priority": "high",
  "type": "follow_up",
  "relatedCase": "507f1f77bcf86cd799439011",
  "notification": {
    "channels": ["push", "email"]
  }
}
```

---

#### PUT `/api/reminders/:id`
Update reminder.

---

#### DELETE `/api/reminders/:id`
Delete reminder.

---

## Gantt Chart

### Base Path: `/api/gantt`

> **IMPORTANT: Date Format**
> Gantt endpoints use a special date format: `YYYY-MM-DD HH:mm`
> Example: `2025-01-15 00:00`

### Gantt Task Object (DHTMLX Format)
```typescript
interface GanttTask {
  id: string;
  text: string;
  start_date: string; // "YYYY-MM-DD HH:mm"
  end_date: string; // "YYYY-MM-DD HH:mm"
  duration: number; // days
  progress: number; // 0 to 1
  parent: string | null;
  type: "task" | "project" | "milestone";
  open: boolean;
  assignee: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
  priority: string;
  status: string;
  caseId: string | null;
  caseName: string | null;
  color: string;
  textColor: string;
  isCritical: boolean;
  isOverdue: boolean;
}

interface GanttLink {
  id: string | number;
  source: string;
  target: string;
  type: "0" | "1" | "2" | "3"; // 0=FS, 1=SS, 2=FF, 3=SF
}
```

---

#### GET `/api/gantt/data`
Get Gantt chart data.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `caseId` | string | Filter by case |
| `assigneeId` | string | Filter by assignee |
| `status` | string | Comma-separated statuses |
| `startDate` | string | Date range start |
| `endDate` | string | Date range end |

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "507f1f77bcf86cd799439011",
        "text": "Review Contract",
        "start_date": "2025-01-15 00:00",
        "end_date": "2025-01-20 00:00",
        "duration": 5,
        "progress": 0.6,
        "parent": null,
        "type": "task",
        "open": true,
        "assignee": {
          "id": "507f1f77bcf86cd799439012",
          "name": "John Doe",
          "avatar": null
        },
        "priority": "high",
        "status": "in_progress",
        "color": "#f97316",
        "textColor": "#ffffff",
        "isCritical": false,
        "isOverdue": false
      }
    ],
    "links": [
      {
        "id": "link_1",
        "source": "507f1f77bcf86cd799439011",
        "target": "507f1f77bcf86cd799439013",
        "type": "0"
      }
    ],
    "resources": [
      {
        "id": "507f1f77bcf86cd799439012",
        "name": "John Doe",
        "email": "john@example.com",
        "taskCount": 5
      }
    ],
    "summary": {
      "totalTasks": 45,
      "completedTasks": 20,
      "overdueTasks": 3,
      "completionPercentage": 44
    }
  }
}
```

---

#### GET `/api/gantt/productivity`
Get unified productivity data (tasks + reminders + events).

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
      "sourceType": "task",
      "sourceId": "507f1f77bcf86cd799439011"
    },
    {
      "id": "reminder_507f1f77bcf86cd799439015",
      "text": "Client follow-up call",
      "start_date": "2025-01-18 09:00",
      "end_date": "2025-01-18 09:00",
      "duration": 0,
      "type": "milestone",
      "sourceType": "reminder",
      "sourceId": "507f1f77bcf86cd799439015"
    },
    {
      "id": "event_507f1f77bcf86cd799439016",
      "text": "Team Meeting",
      "start_date": "2025-01-17 14:00",
      "end_date": "2025-01-17 15:00",
      "sourceType": "event",
      "sourceId": "507f1f77bcf86cd799439016"
    }
  ],
  "links": [],
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
    "tasks": { "total": 15, "completed": 5, "inProgress": 8, "overdue": 2 },
    "reminders": { "total": 6, "pending": 4, "completed": 2 },
    "events": { "total": 4, "upcoming": 3, "completed": 1 }
  }
}
```

---

#### PUT `/api/gantt/task/:id/dates`
Update task dates (for drag-drop).

**Request:**
```json
{
  "startDate": "2025-01-20 00:00",
  "endDate": "2025-01-25 00:00"
}
```

---

#### PUT `/api/gantt/task/:id/progress`
Update task progress.

**Request:**
```json
{
  "progress": 75
}
```
Note: Send 0-100, backend converts to 0-1 for Gantt.

---

#### POST `/api/gantt/link`
Create dependency link.

**Request:**
```json
{
  "source": "507f1f77bcf86cd799439011",
  "target": "507f1f77bcf86cd799439012",
  "type": 0
}
```

---

#### DELETE `/api/gantt/link/:source/:target`
Delete dependency link.

---

## Clients

### Base Path: `/api/clients`

### Client Object Structure
```typescript
interface Client {
  _id: string;
  clientNumber: string; // CLT-00001
  firmId: string;
  clientType: "individual" | "company";

  // Individual fields
  nationalId?: string;
  firstName?: string;
  lastName?: string;
  fullNameArabic?: string;
  fullNameEnglish?: string;
  gender?: "male" | "female";
  nationality?: string;
  dateOfBirth?: string;

  // Company fields
  crNumber?: string;
  companyName?: string;
  companyNameEnglish?: string;

  // Contact
  phone: string;
  email?: string;
  whatsapp?: string;
  preferredContact: "phone" | "email" | "whatsapp" | "sms";
  preferredLanguage: "ar" | "en";

  // Address (Saudi National Address)
  address?: {
    city: string;
    district: string;
    street: string;
    buildingNumber: string;
    postalCode: string;
    additionalNumber: string;
  };

  // Billing
  billing: {
    type: "hourly" | "flat_fee" | "contingency" | "retainer";
    hourlyRate?: number;
    currency: string;
    paymentTerms: string;
  };
  vatRegistration?: {
    isRegistered: boolean;
    vatNumber?: string;
  };

  // Status
  status: "active" | "inactive" | "archived" | "pending";
  flags: {
    isVip: boolean;
    isHighRisk: boolean;
    isBlacklisted: boolean;
  };

  // Statistics
  totalCases: number;
  activeCases: number;
  totalInvoices: number;
  totalPaid: number;
  totalOutstanding: number;

  // CRM
  clientSource: string;
  clientTier: "standard" | "premium" | "vip";
  lifetimeValue: number;
  lastContactedAt?: string;
  nextFollowUpDate?: string;

  createdAt: string;
  updatedAt: string;
}
```

---

#### GET `/api/clients/stats`
Get client statistics.

---

#### POST `/api/clients`
Create client.

**Request (Individual):**
```json
{
  "clientType": "individual",
  "firstName": "Ahmed",
  "lastName": "Ali",
  "fullNameArabic": "أحمد علي",
  "nationalId": "1234567890",
  "phone": "+966501234567",
  "email": "ahmed@example.com",
  "address": {
    "city": "Riyadh",
    "district": "Al Olaya",
    "street": "King Fahd Road",
    "buildingNumber": "1234",
    "postalCode": "12345"
  },
  "billing": {
    "type": "hourly",
    "hourlyRate": 500,
    "currency": "SAR"
  }
}
```

**Request (Company):**
```json
{
  "clientType": "company",
  "companyName": "ABC Corporation",
  "crNumber": "1010123456",
  "phone": "+966112345678",
  "email": "legal@abc.com",
  "legalRepresentative": {
    "name": "Mohammed Ali",
    "nationalId": "1234567890",
    "position": "CEO",
    "phone": "+966501234567"
  }
}
```

---

#### GET `/api/clients`
Get all clients.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search name/email/phone |
| `clientType` | string | individual/company |
| `status` | string | Filter by status |
| `clientTier` | string | standard/premium/vip |

---

#### GET `/api/clients/:id`
Get client by ID.

---

#### PUT `/api/clients/:id`
Update client.

---

#### DELETE `/api/clients/:id`
Delete client.

---

#### GET `/api/clients/:id/cases`
Get client's cases.

---

#### GET `/api/clients/:id/invoices`
Get client's invoices.

---

#### POST `/api/clients/:id/verify/wathq`
Verify company with Wathq API (Saudi CR verification).

---

## Invoices

### Base Path: `/api/invoices`

### Invoice Object Structure
```typescript
interface Invoice {
  _id: string;
  invoiceNumber: string; // INV-202501-0001
  firmId: string;
  status: "draft" | "pending_approval" | "sent" | "viewed" | "partial" | "paid" | "overdue" | "void" | "cancelled";
  clientId: string;
  caseId?: string;
  lawyerId: string;

  // Dates
  issueDate: string;
  dueDate: string;
  paymentTerms: "due_on_receipt" | "net_7" | "net_15" | "net_30" | "net_45" | "net_60";
  currency: string;

  // Line Items
  items: LineItem[];

  // Totals (in halalas for SAR)
  subtotal: number;
  discountType: "percentage" | "fixed";
  discountValue: number;
  discountAmount: number;
  taxableAmount: number;
  vatRate: number; // 15 for Saudi
  vatAmount: number;
  totalAmount: number;

  // Payments
  amountPaid: number;
  balanceDue: number;

  // ZATCA E-Invoice
  zatca?: {
    invoiceType: string;
    qrCode?: string;
    status: "draft" | "pending" | "cleared" | "reported" | "rejected";
  };

  // Notes
  notes?: string;
  termsAndConditions?: string;

  createdAt: string;
  updatedAt: string;
}

interface LineItem {
  _id: string;
  type: "time" | "expense" | "flat_fee" | "product" | "discount";
  date?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  taxable: boolean;
  timeEntryId?: string;
  expenseId?: string;
}
```

---

#### GET `/api/invoices/stats`
Get invoice statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 100,
    "byStatus": {
      "draft": 10,
      "sent": 30,
      "partial": 15,
      "paid": 40,
      "overdue": 5
    },
    "totalRevenue": 500000,
    "totalOutstanding": 75000,
    "averageInvoiceAmount": 5000,
    "averageDaysToPayment": 18
  }
}
```

---

#### GET `/api/invoices/billable-items`
Get unbilled time entries and expenses.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `clientId` | string | Filter by client |
| `caseId` | string | Filter by case |

**Response:**
```json
{
  "success": true,
  "data": {
    "timeEntries": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "date": "2025-01-15",
        "description": "Legal research",
        "duration": 120,
        "rate": 500,
        "amount": 1000,
        "userId": "507f1f77bcf86cd799439012",
        "userName": "John Doe"
      }
    ],
    "expenses": [
      {
        "_id": "507f1f77bcf86cd799439013",
        "date": "2025-01-14",
        "description": "Court filing fees",
        "amount": 500,
        "category": "filing_fees"
      }
    ],
    "totals": {
      "timeAmount": 5000,
      "expenseAmount": 1500,
      "totalAmount": 6500
    }
  }
}
```

---

#### POST `/api/invoices`
Create invoice.

**Request:**
```json
{
  "clientId": "507f1f77bcf86cd799439011",
  "caseId": "507f1f77bcf86cd799439012",
  "dueDate": "2025-02-15T00:00:00.000Z",
  "paymentTerms": "net_30",
  "items": [
    {
      "type": "time",
      "description": "Legal consultation",
      "quantity": 2,
      "unitPrice": 50000,
      "taxable": true,
      "timeEntryId": "507f1f77bcf86cd799439013"
    },
    {
      "type": "expense",
      "description": "Court filing fees",
      "quantity": 1,
      "unitPrice": 50000,
      "taxable": false,
      "expenseId": "507f1f77bcf86cd799439014"
    }
  ],
  "discountType": "percentage",
  "discountValue": 10,
  "notes": "Thank you for your business"
}
```

---

#### GET `/api/invoices/:id`
Get invoice by ID.

---

#### PUT `/api/invoices/:id`
Update invoice.

---

#### DELETE `/api/invoices/:id`
Delete invoice (draft only).

---

#### POST `/api/invoices/:id/send`
Send invoice to client.

---

#### POST `/api/invoices/:id/record-payment`
Record payment on invoice.

**Request:**
```json
{
  "amount": 50000,
  "paymentDate": "2025-01-20T00:00:00.000Z",
  "paymentMethod": "bank_transfer",
  "reference": "TRX-12345"
}
```

---

#### POST `/api/invoices/:id/void`
Void invoice.

**Request:**
```json
{
  "reason": "Duplicate invoice"
}
```

---

#### GET `/api/invoices/:id/export/pdf`
Generate PDF.

---

## Payments

### Base Path: `/api/payments`

### Payment Object Structure
```typescript
interface Payment {
  _id: string;
  paymentNumber: string; // PAY-202501-0001
  firmId: string;
  clientId: string;
  invoiceId?: string;
  caseId?: string;
  amount: number; // in halalas
  paymentDate: string;
  paymentMethod: "cash" | "bank_transfer" | "credit_card" | "check" | "online" | "mada" | "apple_pay";
  status: "pending" | "completed" | "failed" | "refunded" | "reconciled";
  reference?: string;
  notes?: string;
  isRefund: boolean;
  createdAt: string;
}
```

---

#### GET `/api/payments`
Get all payments.

---

#### POST `/api/payments`
Create payment.

---

#### POST `/api/payments/:id/refund`
Create refund.

---

## Time Tracking

### Base Path: `/api/time-tracking`

### Time Entry Object
```typescript
interface TimeEntry {
  _id: string;
  firmId: string;
  userId: string;
  caseId?: string;
  clientId?: string;
  taskId?: string;
  date: string;
  description: string;
  duration: number; // minutes
  rate: number; // hourly rate
  amount: number; // calculated
  billable: boolean;
  billed: boolean;
  invoiceId?: string;
  activityCode?: string; // UTBMS
  status: "draft" | "submitted" | "approved" | "rejected";
  createdAt: string;
}
```

---

#### POST `/api/time-tracking/timer/start`
Start timer.

**Request:**
```json
{
  "caseId": "507f1f77bcf86cd799439011",
  "taskId": "507f1f77bcf86cd799439012",
  "description": "Legal research"
}
```

---

#### POST `/api/time-tracking/timer/stop`
Stop timer.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "duration": 45,
    "amount": 37500
  }
}
```

---

#### GET `/api/time-tracking/timer/status`
Get current timer status.

---

#### POST `/api/time-tracking`
Create manual time entry.

**Request:**
```json
{
  "date": "2025-01-15",
  "description": "Client consultation",
  "duration": 60,
  "caseId": "507f1f77bcf86cd799439011",
  "billable": true
}
```

---

#### GET `/api/time-tracking`
Get time entries.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | Filter by user |
| `caseId` | string | Filter by case |
| `clientId` | string | Filter by client |
| `startDate` | string | Date range start |
| `endDate` | string | Date range end |
| `billable` | boolean | Filter by billable |
| `billed` | boolean | Filter by billed |
| `status` | string | Filter by status |

---

## Documents

### Base Path: `/api/documents`

---

#### POST `/api/documents`
Create/upload document.

---

#### GET `/api/documents`
Get all documents.

---

#### GET `/api/documents/:id`
Get document.

---

#### DELETE `/api/documents/:id`
Delete document.

---

## HR Module

### Base Paths

| Module | Path |
|--------|------|
| Employees | `/api/hr/employees` |
| Attendance | `/api/attendance` |
| Leave Requests | `/api/leave-requests` |
| Payroll | `/api/hr/payroll` |
| Performance Reviews | `/api/hr/performance-reviews` |
| Employee Loans | `/api/hr/employee-loans` |

### Employee Object
```typescript
interface Employee {
  _id: string;
  userId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  hireDate: string;
  status: "active" | "inactive" | "terminated";
  salary: {
    basic: number;
    housing: number;
    transport: number;
    total: number;
  };
  allowances: Allowance[];
  leaveBalance: {
    annual: number;
    sick: number;
    emergency: number;
  };
}
```

---

## CRM & Leads

### Base Path: `/api/leads`

### Lead Object
```typescript
interface Lead {
  _id: string;
  leadNumber: string;
  firmId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  company?: string;
  source: "website" | "referral" | "ads" | "social" | "walkin" | "cold_call" | "event";
  status: "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
  pipelineId?: string;
  stageId?: string;
  score: number;
  value?: number;
  assignedTo: string;
  nextFollowUp?: string;
  notes?: string;
  activities: Activity[];
  createdAt: string;
}
```

---

#### GET `/api/leads`
Get all leads.

---

#### POST `/api/leads`
Create lead.

---

#### POST `/api/leads/:id/convert`
Convert lead to client.

---

## Notifications

### Base Path: `/api/notifications`

---

#### GET `/api/notifications`
Get user notifications.

---

#### POST `/api/notifications/:id/read`
Mark notification as read.

---

#### POST `/api/notifications/read-all`
Mark all as read.

---

## WebSocket Events

### Connection
```javascript
const socket = io('wss://api.example.com', {
  auth: { token: 'jwt_token' }
});
```

### Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `notification` | Server -> Client | New notification |
| `task:updated` | Server -> Client | Task was updated |
| `event:reminder` | Server -> Client | Event reminder |
| `gantt:task:updated` | Server -> Client | Gantt task changed |
| `gantt:link:added` | Server -> Client | New dependency |
| `presence:update` | Bidirectional | User presence |

---

## Enums Reference

### Task Status
```
backlog | todo | in_progress | done | canceled
```

### Task Priority
```
none | low | medium | high | critical
```

### Case Status
```
active | closed | appeal | settlement | on-hold | completed | won | lost | settled
```

### Event Types
```
hearing | court_date | meeting | client_meeting | deposition | mediation | arbitration | deadline | filing_deadline | conference_call | internal_meeting | training | webinar | consultation | task | other
```

### Event Status
```
scheduled | confirmed | tentative | canceled | cancelled | postponed | completed | in_progress | rescheduled
```

### Reminder Status
```
pending | snoozed | completed | dismissed | delegated
```

### Invoice Status
```
draft | pending_approval | sent | viewed | partial | paid | overdue | void | written_off | cancelled
```

### Payment Methods
```
cash | bank_transfer | credit_card | check | online | mada | apple_pay
```

### Client Types
```
individual | company
```

### Billing Types
```
hourly | flat_fee | contingency | retainer | blended | monthly_retainer | percentage
```

---

## Currency Handling

All monetary values in the database are stored in **halalas** (1 SAR = 100 halalas) to avoid floating-point precision issues.

**Frontend conversion:**
```javascript
// Display: Convert halalas to SAR
const displayAmount = (halalas) => (halalas / 100).toFixed(2);

// Input: Convert SAR to halalas
const toHalalas = (sar) => Math.round(sar * 100);
```

---

## Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| Auth endpoints | 5 requests/minute |
| General API | 100 requests/minute |
| File uploads | 10 requests/minute |

---

## Error Codes

| Code | Description |
|------|-------------|
| `AUTH_REQUIRED` | Authentication required |
| `TOKEN_EXPIRED` | JWT token expired |
| `FORBIDDEN` | No permission |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Invalid input |
| `DUPLICATE_ENTRY` | Resource already exists |
| `RATE_LIMITED` | Too many requests |
