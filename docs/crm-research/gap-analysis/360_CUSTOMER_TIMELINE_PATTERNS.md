# 360° Customer Timeline Patterns: Research Report

**Project:** Traf3li Backend (Legal Case Management CRM)
**Date:** December 2024
**Focus:** Unified Activity Streams, Multi-Channel Integration, and Event Sourcing

---

## Executive Summary

The Traf3li backend implements a comprehensive **360° customer timeline** architecture that aggregates customer interactions across multiple channels (email, calls, meetings, invoices, documents) into unified activity streams. The system uses **polymorphic entity relationships**, **event-based audit trails**, and **multi-tenancy isolation** to track the complete customer journey.

---

## 1. Unified Activity Stream Architecture

### 1.1 Core Models for Timeline Aggregation

#### **Activity Model** (`/src/models/activity.model.js`)
The foundational timeline model that records scheduled activities and follow-ups:

```javascript
{
  // Polymorphic Reference Pattern
  res_model: String,      // 'Case', 'Client', 'Lead'
  res_id: ObjectId,       // The related entity ID

  // Activity Type & Status
  activity_type_id: ObjectId,
  state: ['scheduled', 'done', 'cancelled'],

  // Timeline Metadata
  date_deadline: Date,
  done_date: Date,
  feedback: String,

  // Chaining for Follow-ups
  chained_from_id: ObjectId,
  recommended_activity_type_id: ObjectId,
  previous_activity_type_id: ObjectId,

  // Automation Tracking
  automated: Boolean
}
```

**Key Features:**
- **Polymorphic pattern** allows activities to relate to any entity (Case, Client, Lead)
- **Activity chaining** creates follow-up sequences automatically
- **State machine** with scheduled → done → cancelled transitions
- **Completion tracking** with feedback and timestamps

#### **CRM Activity Model** (`/src/models/crmActivity.model.js`)
Extended timeline model for comprehensive activity logging with multiple communication types:

```javascript
{
  // Timeline Identification
  activityId: String,          // Auto-generated ACT-YYYYMM-XXXXXX

  // Polymorphic Entity Reference
  entityType: ['lead', 'client', 'contact', 'case', 'organization'],
  entityId: ObjectId,

  // Multi-Channel Activity Types
  type: [
    'call',           // Phone communications
    'email',          // Email tracking
    'sms',            // SMS messages
    'whatsapp',       // WhatsApp conversations
    'meeting',        // Meetings (in-person/video)
    'task',           // Tasks and follow-ups
    'document',       // Document actions
    'status_change',  // Entity state changes
    'case_created',   // Domain-specific events
    // ... more types
  ],

  // Type-Specific Data (Nested Schemas)
  emailData: {
    messageId: String,
    from: [String],
    to: [String],
    subject: String,
    opened: Boolean,
    clicked: Boolean,
    clickedLinks: [String]
  },

  callData: {
    direction: ['inbound', 'outbound'],
    duration: Number,
    outcome: ['connected', 'no_answer', 'voicemail'],
    recordingUrl: String,
    transcription: String
  },

  meetingData: {
    meetingType: ['in_person', 'video', 'phone', 'court'],
    participants: [{
      type: ['user', 'contact', 'client', 'lead'],
      entityId: ObjectId,
      attended: Boolean
    }],
    agenda: String,
    summary: String,
    nextSteps: String
  },

  // Core Timeline Fields
  status: ['scheduled', 'in_progress', 'completed', 'cancelled'],
  performedBy: ObjectId,
  createdAt: Date,
  completedAt: Date
}
```

**Key Capabilities:**
- **Multi-channel integration** in a single document
- **Type-specific nested schemas** for email, call, and meeting details
- **Participant tracking** with attendance confirmation
- **Denormalized data** for quick timeline display (entityName, secondaryEntityName)
- **Metadata flexibility** with Mixed type for custom fields

#### **Event Model** (`/src/models/event.model.js`)
Calendar-based event tracking with extensive metadata:

```javascript
{
  // Event Identification
  eventId: String,            // Auto-generated EVT-YYYYMM-XXXX
  title: String,
  type: [
    'hearing', 'court_date', 'meeting', 'client_meeting',
    'deposition', 'mediation', 'deadline', 'filing_deadline'
  ],

  // Temporal Tracking
  startDateTime: Date,
  endDateTime: Date,
  duration: Number,           // Virtual computed field

  // Participants & Organization
  organizer: ObjectId,
  attendees: [{
    userId: ObjectId,
    email: String,
    status: ['invited', 'confirmed', 'declined'],
    responseStatus: ['pending', 'accepted', 'declined']
  }],

  // Event Content
  agenda: [
    {
      title: String,
      duration: Number,
      presenter: ObjectId,
      completed: Boolean
    }
  ],

  actionItems: [{
    description: String,
    assignedTo: ObjectId,
    dueDate: Date,
    status: ['pending', 'in_progress', 'completed']
  }],

  // Billing Integration
  billing: {
    isBillable: Boolean,
    billingType: ['hourly', 'fixed_fee', 'retainer', 'pro_bono'],
    billableAmount: Number,
    linkedInvoiceId: ObjectId,
    invoiceStatus: ['not_invoiced', 'invoiced', 'paid']
  },

  // Completion & Follow-up
  completedAt: Date,
  outcome: String,
  followUpRequired: Boolean,
  followUpTaskId: ObjectId,

  // Recurrence Support
  recurrence: {
    enabled: Boolean,
    frequency: ['daily', 'weekly', 'monthly', 'yearly'],
    parentEventId: ObjectId,
    nextOccurrence: Date
  }
}
```

**Timeline Features:**
- **Virtual fields** for derived data (duration, isPast, isToday, isUpcoming)
- **Recurrence engine** for recurring events
- **RSVP tracking** with attendee status
- **Billing integration** linking events to invoices
- **Calendar sync** (Google, Outlook, Apple)

#### **Invoice Model** (`/src/models/invoice.model.js`)
Financial timeline integration with payment tracking:

```javascript
{
  // Invoice Identification
  invoiceNumber: String,
  status: [
    'draft', 'pending_approval', 'sent', 'viewed',
    'partial', 'paid', 'overdue', 'written_off'
  ],

  // Related Entities (Timeline Context)
  clientId: ObjectId,
  caseId: ObjectId,
  lawyerId: ObjectId,

  // Temporal Tracking
  issueDate: Date,
  dueDate: Date,
  paidDate: Date,

  // Financial Data
  totalAmount: Number,
  amountPaid: Number,
  balanceDue: Number,

  // Line Items (Granular Timeline)
  items: [{
    type: ['time', 'expense', 'flat_fee', 'product', 'discount'],
    date: Date,
    description: String,
    quantity: Number,
    unitPrice: Number,

    // Activity Code (UTBMS)
    activityCode: String,  // L110, L120, etc.
    timeEntryId: ObjectId,
    expenseId: ObjectId
  }],

  // Payment Tracking
  paymentPlan: {
    enabled: Boolean,
    installments: [2, 3, 4, 6, 12],
    installmentDetails: [{
      dueDate: Date,
      amount: Number,
      status: ['pending', 'paid', 'overdue'],
      paidAt: Date,
      paidAmount: Number
    }]
  },

  // ZATCA E-Invoice Integration
  zatca: {
    invoiceUUID: String,
    invoiceHash: String,
    qrCode: String,
    status: ['draft', 'cleared', 'reported']
  }
}
```

**Timeline Integration:**
- **Line item timestamps** for activity-level billing tracking
- **Payment history** showing installment progression
- **Status progression** tracking invoice lifecycle
- **E-invoicing compliance** with timestamp audit trail

---

## 2. Email/Call/Meeting/Invoice Integration

### 2.1 Communication Channels Integration

#### **WhatsApp Message Model** (`/src/models/whatsappMessage.model.js`)
Messaging timeline with delivery tracking:

```javascript
{
  // Message Identification
  conversationId: ObjectId,
  messageId: String,           // Unique message ID

  // Direction & Type
  direction: ['inbound', 'outbound'],
  type: ['text', 'template', 'image', 'video', 'document'],

  // Status Tracking (Event Timeline)
  status: ['pending', 'sent', 'delivered', 'read', 'failed'],
  statusHistory: [{
    status: String,
    timestamp: Date,
    errorCode: String,
    errorMessage: String
  }],

  sentAt: Date,
  deliveredAt: Date,
  readAt: Date,

  // Message Content
  content: {
    text: String,
    mediaUrl: String,
    mimeType: String,
    templateName: String,
    templateVariables: [String]
  },

  // Contact Information
  senderPhone: String,
  recipientPhone: String,
  sentBy: ObjectId,

  // Engagement Tracking
  tracking: {
    linkClicked: Boolean,
    linkClickedAt: Date,
    buttonClicked: String,
    buttonClickedAt: Date,
    responseTime: Number,    // Minutes to respond
    respondedAt: Date
  },

  // Campaign Context
  campaignId: ObjectId,
  provider: ['meta', 'msg91', 'twilio']
}
```

**Timeline Patterns:**
- **Status history** showing complete message journey
- **Engagement metrics** (link clicks, button interactions)
- **Response time** tracking for conversation analysis
- **Provider integration** for multi-channel reliability

#### **Email Event Model** (`/src/models/emailEvent.model.js`)
Email engagement timeline with detailed analytics:

```javascript
{
  // Event Identification
  campaignId: ObjectId,
  subscriberId: ObjectId,
  email: String,

  // Event Type (Timeline Event)
  eventType: [
    'sent', 'delivered', 'opened', 'clicked',
    'bounced', 'unsubscribed', 'complained', 'failed'
  ],

  // Metadata
  metadata: {
    linkClicked: String,      // Which link was clicked
    linkText: String,
    userAgent: String,
    deviceType: ['desktop', 'mobile', 'tablet'],
    browser: String,
    os: String,

    // Geolocation
    ipAddress: String,
    country: String,
    city: String,

    // Bounce Information
    bounceType: ['soft', 'hard'],
    bounceReason: String,

    // Timing
    processingTime: Number,   // milliseconds

    // A/B Testing
    variantId: String,
    variantName: String
  },

  timestamp: Date,
  source: ['campaign', 'drip', 'trigger', 'transactional']
}
```

**Timeline Features:**
- **Sequential event tracking** from sent → delivered → opened → clicked
- **Geolocation & device data** for engagement analysis
- **A/B variant tracking** for campaign optimization
- **TTL indexing** for automatic historical data retention

#### **Integrated Activity Timeline Service**
The `crmActivity` model provides unified tracking:

```javascript
// Single activity can represent:
{
  // Email Integration
  type: 'email',
  emailData: {
    messageId: String,
    from: [String],
    to: [String],
    opened: Boolean,
    openedAt: Date,
    clicked: Boolean,
    clickedLinks: [String]
  },

  // Call Integration
  type: 'call',
  callData: {
    direction: 'inbound',
    duration: 1500,        // seconds
    outcome: 'connected',
    recordingUrl: String,
    transcription: String
  },

  // Meeting Integration
  type: 'meeting',
  meetingData: {
    meetingType: 'video',
    scheduledStart: Date,
    actualStart: Date,
    actualDuration: 45,    // minutes
    participants: [
      { type: 'user', entityId: ObjectId, attended: true },
      { type: 'client', entityId: ObjectId, attended: true }
    ],
    agenda: String,
    summary: String,
    nextSteps: String
  },

  // Invoice Integration
  type: 'status_change',   // When linked to invoice
  description: 'Invoice #INV-20241201-001 issued',
  secondaryEntityType: 'invoice',
  secondaryEntityId: ObjectId
}
```

**Key Integration Points:**
- Single `CRMActivity` document can reference email, call, meeting, and invoice data
- **Secondary entity tracking** allows cross-entity relationships
- **Type-specific nested schemas** maintain data integrity
- **Denormalization strategy** enables quick timeline rendering

### 2.2 Timeline Queries across Channels

#### **Entity Activity Timeline**
```javascript
// Get all interactions for a client across all channels
CRMActivity.getEntityActivities('client', clientId, {
  type: null,              // All types
  startDate: Date,
  endDate: Date,
  limit: 100
})
// Returns activities sorted by createdAt DESC
// Includes calls, emails, meetings, tasks, document uploads
```

#### **Activity Statistics**
```javascript
CRMActivity.getStats(lawyerId, { start: Date, end: Date })
// Returns:
{
  total: 450,
  byType: {
    call: 120,
    email: 150,
    meeting: 80,
    task: 100
  },
  byEntity: {
    client: 200,
    case: 150,
    lead: 100
  },
  communications: [
    {
      type: 'call',
      count: 120,
      avgDuration: 12.5     // minutes
    },
    {
      type: 'email',
      count: 150,
      avgDuration: null
    },
    {
      type: 'meeting',
      count: 80,
      avgDuration: 45
    }
  ]
}
```

---

## 3. Filtering & Query Patterns

### 3.1 Advanced Filtering Capabilities

#### **Activity Filtering** (Activity Model)
```javascript
Activity.getActivitiesForRecord(res_model, res_id, {
  state: 'done',                    // Filter by status
  user_id: assignedUserId,          // Filter by assignee
  startDate: Date,                  // Date range filtering
  endDate: Date,
  limit: 50,
  skip: 0                           // Pagination
})
```

#### **CRM Activity Filtering** (CRM Activity Model)
```javascript
CRMActivity.getEntityActivities(entityType, entityId, {
  type: ['call', 'email', 'meeting'],  // Multiple activity types
  performedBy: userId,                 // Specific performer
  startDate: Date,
  endDate: Date,
  limit: 50,
  skip: 0
})
```

#### **Timeline Filtering**
```javascript
CRMActivity.getTimeline(lawyerId, {
  entityTypes: ['client', 'case'],     // Filter entities
  types: ['email', 'call', 'meeting'], // Filter activities
  startDate: Date,                     // Last 30 days default
  endDate: Date,
  limit: 100
})
```

#### **Event Filtering**
```javascript
Event.getCalendarEvents(userId, startDate, endDate, {
  caseId: caseId,           // Filter by case
  type: 'hearing',          // Event type
  status: 'scheduled',      // Event status
  // Returns events where user is creator, organizer, or attendee
})
```

#### **Email Event Filtering**
```javascript
EmailEvent.aggregate([
  {
    $match: {
      campaignId: ObjectId,
      eventType: { $in: ['opened', 'clicked'] },  // Multi-value filter
      timestamp: { $gte: startDate, $lte: endDate }
    }
  },
  {
    $group: {
      _id: '$metadata.deviceType',
      count: { $sum: 1 },
      opens: { $sum: { $cond: [{ $eq: ['$eventType', 'opened'] }, 1, 0] } }
    }
  }
])
```

### 3.2 Filtering Index Strategy

**Compound Indexes for Performance:**

```javascript
// Activity Model
activitySchema.index({ firmId: 1, res_model: 1, res_id: 1 });
activitySchema.index({ firmId: 1, user_id: 1, state: 1, date_deadline: 1 });
activitySchema.index({ firmId: 1, date_deadline: 1, state: 1 });

// CRM Activity Model
crmActivitySchema.index({ lawyerId: 1, entityType: 1, entityId: 1 });
crmActivitySchema.index({ lawyerId: 1, type: 1, createdAt: -1 });
crmActivitySchema.index({ lawyerId: 1, performedBy: 1, createdAt: -1 });
crmActivitySchema.index({ lawyerId: 1, 'taskData.dueDate': 1, 'taskData.status': 1 });

// Event Model
eventSchema.index({ createdBy: 1, startDateTime: 1 });
eventSchema.index({ caseId: 1, startDateTime: 1 });
eventSchema.index({ status: 1, startDateTime: 1 });
eventSchema.index({ 'attendees.userId': 1, startDateTime: 1 });

// WhatsApp Message Model
whatsappMessageSchema.index({ firmId: 1, conversationId: 1, timestamp: -1 });
whatsappMessageSchema.index({ firmId: 1, direction: 1, status: 1 });

// Email Event Model
emailEventSchema.index({ firmId: 1, campaignId: 1, eventType: 1 });
emailEventSchema.index({ subscriberId: 1, timestamp: -1 });
emailEventSchema.index({ firmId: 1, timestamp: -1 });
```

**Full-Text Search Indexes:**
```javascript
// Activity & CRM Activity
activitySchema.index({ summary: 'text', note: 'text' });
crmActivitySchema.index({ title: 'text', description: 'text' });

// WhatsApp
whatsappMessageSchema.index({ 'content.text': 'text' });
```

---

## 4. SLA Counters & Deadline Tracking

### 4.1 SLA Implementation Patterns

#### **Activity-Level SLA** (Activity Model)
```javascript
// Virtual field for overdue detection
activitySchema.virtual('is_overdue').get(function() {
  if (this.state !== 'scheduled') {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return this.date_deadline < today;
});
```

#### **State-Based SLA Tracking**
```javascript
Activity.statics.getOverdueActivities = async function(firmId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return await this.find({
    state: 'scheduled',
    date_deadline: { $lt: today }
  })
    .populate('activity_type_id', 'name icon color')
    .populate('user_id', 'firstName lastName avatar')
    .sort({ date_deadline: 1 });
};

// Today's Activities
Activity.statics.getTodayActivities = async function(firmId, userId = null) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return await this.find({
    state: 'scheduled',
    date_deadline: { $gte: startOfDay, $lte: endOfDay }
  })
    .sort({ date_deadline: 1 });
};
```

#### **Task-Level SLA** (CRM Activity Model)
```javascript
CRMActivity.statics.getUpcomingTasks = async function(lawyerId, options = {}) {
  const query = {
    lawyerId: new mongoose.Types.ObjectId(lawyerId),
    type: 'task',
    'taskData.status': { $in: ['pending', 'in_progress'] }
  };

  const endDate = options.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  query['taskData.dueDate'] = { $lte: endDate };

  return await this.find(query)
    .sort({ 'taskData.dueDate': 1 })
    .limit(options.limit || 20);
};
```

#### **Activity Statistics with SLA Counts** (Activity Service)
```javascript
async getActivityStats(firmId, userId = null) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Overdue activities
  const overdue_count = await Activity.countDocuments({
    firm_id: firmId,
    state: { $in: ['planned', 'today', 'overdue'] },
    date_deadline: { $lt: today }
  });

  // Today's activities (SLA due today)
  const today_count = await Activity.countDocuments({
    firm_id: firmId,
    state: { $in: ['planned', 'today'] },
    date_deadline: { $gte: today, $lt: tomorrow }
  });

  // Future planned (upcoming SLA)
  const planned_count = await Activity.countDocuments({
    firm_id: firmId,
    state: 'planned',
    date_deadline: { $gte: tomorrow }
  });

  // Recent completion
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const done_count = await Activity.countDocuments({
    firm_id: firmId,
    state: 'done',
    done_date: { $gte: sevenDaysAgo }
  });

  return {
    overdue_count,      // SLA Breaches
    today_count,        // Due Today
    planned_count,      // Upcoming
    done_count,         // Completed (7 days)
    total_pending: overdue_count + today_count + planned_count,
    by_type: [],        // Breakdown by activity type
    by_model: []        // Breakdown by entity type
  };
}
```

### 4.2 Invoice Payment SLA

#### **Payment Timeline SLA**
```javascript
Invoice.schema {
  dueDate: Date,           // SLA reference point
  paidDate: Date,          // Actual payment
  paymentTerms: [
    'due_on_receipt',
    'net_7',               // 7-day SLA
    'net_15',              // 15-day SLA
    'net_30',              // 30-day SLA
    'net_45', 'net_60', 'net_90'
  ],

  status: [
    'draft',
    'sent',
    'partial',
    'overdue',             // SLA status
    'paid'
  ],

  paymentPlan: {
    installments: [2, 3, 4, 6, 12],
    installmentDetails: [{
      dueDate: Date,       // Individual installment SLA
      status: ['pending', 'paid', 'overdue']
    }]
  }
}
```

#### **Event Billing SLA**
```javascript
Event.schema {
  billing: {
    isBillable: Boolean,
    invoiceStatus: [
      'not_invoiced',
      'invoiced',          // SLA trigger
      'paid'
    ],
    linkedInvoiceId: ObjectId
  }
}
```

### 4.3 SLA Queue & Reminders

#### **Activity Reminder Processing** (`/src/services/activity.service.js`)
```javascript
async processReminders() {
  const now = new Date();
  const oneDayFromNow = new Date(now);
  oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  // Find activities needing reminders
  const activitiesNeedingReminders = await Activity.find({
    state: { $in: ['planned', 'today'] },
    date_deadline: { $lte: threeDaysFromNow },
    reminder_sent: { $ne: true }
  });

  const reminders = {
    overdue: [],     // Past due
    today: [],       // Due today
    tomorrow: [],    // Due tomorrow
    upcoming: []     // 1-3 days away
  };

  // Categorize by urgency
  for (const activity of activitiesNeedingReminders) {
    const deadline = new Date(activity.date_deadline);
    deadline.setHours(0, 0, 0, 0);

    if (deadline < today) {
      reminders.overdue.push(activity);  // SLA breach
    } else if (deadline.getTime() === today.getTime()) {
      reminders.today.push(activity);    // Due today
    } else if (deadline.getTime() === tomorrow.getTime()) {
      reminders.tomorrow.push(activity); // Due tomorrow
    } else {
      reminders.upcoming.push(activity); // Upcoming
    }

    // Mark as reminded
    await Activity.findByIdAndUpdate(activity._id, {
      reminder_sent: true,
      reminder_sent_at: new Date()
    });
  }

  return reminders;  // For NotificationService
}
```

---

## 5. Event Sourcing & Audit Trail

### 5.1 Audit Log as Event Store

#### **Audit Log Model** (`/src/models/auditLog.model.js`)
Comprehensive event store tracking all system changes:

```javascript
auditLogSchema = {
  // WHO performed the action
  userId: ObjectId,
  userEmail: String,
  userRole: ['client', 'lawyer', 'admin'],
  userName: String,

  // WHAT action was performed (extensive enum)
  action: [
    // CRUD operations
    'create', 'read', 'update', 'delete',

    // Document actions
    'view_judgment', 'download_judgment',
    'upload_document', 'delete_document',

    // Case actions
    'create_case', 'update_case', 'view_case',

    // Payment/Invoice actions
    'create_payment', 'update_payment',
    'create_invoice', 'send_invoice',
    'view_invoice', 'paid_invoice',

    // Activity actions
    'create_activity', 'complete_activity',
    'reassign_activity', 'reschedule_activity',

    // More...
  ],

  // WHAT changed (Change Tracking)
  changes: {
    before: Mixed,      // Previous state
    after: Mixed        // New state
  },

  // WHERE it happened
  entityType: String,
  entityId: ObjectId,

  // WHEN it happened
  timestamp: Date,

  // HOW it happened
  metadata: {
    ip: String,
    userAgent: String,
    source: ['api', 'web', 'mobile'],
    requestId: String
  }
}
```

**Change Tracking Schema:**
```javascript
const changeSchema = new mongoose.Schema({
  field: String,           // Which field changed
  oldValue: Mixed,        // Previous value
  newValue: Mixed         // New value
}, { _id: false });
```

#### **Case Audit Log Model** (`/src/models/caseAuditLog.model.js`)
Domain-specific event log for case entities:

```javascript
caseAuditLogSchema = {
  userId: ObjectId,
  action: ['create', 'update', 'delete', 'view'],
  resource: [
    'case',
    'document',
    'hearing',
    'note',
    'claim',
    'timeline'             // Timeline entries as events
  ],
  resourceId: ObjectId,
  caseId: ObjectId,         // Always scoped to case

  changes: {
    before: Mixed,
    after: Mixed
  },

  // TTL Index: Auto-delete after 7 years (legal retention)
  createdAt: Date
}
```

**TTL Indexing:**
```javascript
// Auto-delete logs older than 7 years (legal retention requirement)
caseAuditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 7 * 365 * 24 * 60 * 60 }
);
```

### 5.2 Event Sequence and Reconstruction

#### **Activity Lifecycle Event Sourcing**
```javascript
// Event 1: Activity Created
auditLog {
  action: 'create_activity',
  entityType: 'Activity',
  entityId: activity._id,
  changes: {
    before: null,
    after: {
      res_model: 'Case',
      res_id: caseId,
      activity_type_id: typeId,
      date_deadline: Date,
      state: 'scheduled'
    }
  },
  timestamp: Date
}

// Event 2: Activity Rescheduled
auditLog {
  action: 'reschedule_activity',
  changes: {
    before: { date_deadline: oldDate },
    after: { date_deadline: newDate }
  },
  timestamp: Date
}

// Event 3: Activity Completed
auditLog {
  action: 'complete_activity',
  changes: {
    before: { state: 'scheduled' },
    after: {
      state: 'done',
      done_date: Date,
      feedback: 'Completed successfully'
    }
  },
  timestamp: Date
}

// Event 4: Follow-up Created (Chained Activity)
auditLog {
  action: 'create_activity',
  changes: {
    after: {
      chained_from_id: parentActivityId,
      previous_activity_type_id: parentTypeId
    }
  },
  timestamp: Date
}
```

#### **Case Timeline Event Sourcing**
```javascript
// Get complete event history
CaseAuditLog.getCaseHistory(caseId, {
  page: 1,
  limit: 50,
  resource: 'timeline'   // Filter timeline events only
})
// Returns: [
//   { action: 'create', resource: 'timeline', resourceId: ..., timestamp: ... },
//   { action: 'update', resource: 'timeline', resourceId: ..., timestamp: ... },
//   // Events in chronological order
// ]
```

### 5.3 Audit Log Service for Event Logging

#### **AuditLogService** (`/src/services/auditLog.service.js`)
```javascript
// Example: Logging activity completion
await AuditLogService.log(
  'complete_activity',      // Action
  'activity',               // Entity type
  activity._id.toString(),  // Entity ID
  null,                     // Before/After changes
  {
    firmId: context.firmId,
    userId: context.userId,
    details: {
      res_model: activity.res_model,
      res_id: activity.res_id,
      feedback: feedback
    }
  }
);

// Example: Logging case document upload
await CaseAuditLog.log({
  userId: userId,
  action: 'create',
  resource: 'document',
  resourceId: documentId,
  caseId: caseId,
  changes: {
    before: null,
    after: {
      name: 'contract.pdf',
      type: 'contract',
      uploadedAt: new Date()
    }
  }
});
```

### 5.4 Event Aggregation & Timeline Reconstruction

#### **Timeline Aggregation Query**
```javascript
// Reconstruct complete customer timeline from events
CRMActivity.getTimeline(lawyerId, {
  entityTypes: ['client'],
  startDate: Date,
  endDate: Date,
  limit: 100
})
// Returns: Chronologically sorted unified timeline
// containing all calls, emails, meetings, status changes, documents

// Alternative: Get from Audit Log perspective
AuditLog.find({
  entityType: 'Activity',
  action: { $in: ['create_activity', 'complete_activity'] }
})
.sort({ timestamp: -1 })
// Shows activity event history as event stream
```

#### **Entity Reconstruction from Events**
```javascript
// To reconstruct activity state at point in time:
const history = await CaseAuditLog.getCaseHistory(caseId);

// Starting from events:
let state = {};
for (const event of history) {
  if (event.resource === 'timeline') {
    if (event.action === 'create') {
      state = { ...state, ...event.changes.after };
    } else if (event.action === 'update') {
      state = { ...state, ...event.changes.after };
    } else if (event.action === 'delete') {
      state = null;
    }
  }
}
// Result: Complete reconstructed state
```

### 5.5 Email Event Sourcing

#### **Email Event Stream**
```javascript
// Email engagement event sequence
emailEvent {
  eventType: 'sent',
  timestamp: Date,
  metadata: { deliveryTime: Number }
}

emailEvent {
  eventType: 'delivered',
  timestamp: Date,
  metadata: { processingTime: Number }
}

emailEvent {
  eventType: 'opened',
  timestamp: Date,
  metadata: {
    deviceType: 'mobile',
    browser: 'Chrome',
    country: 'SA'
  }
}

emailEvent {
  eventType: 'clicked',
  timestamp: Date,
  metadata: {
    linkClicked: 'https://example.com/page',
    deviceType: 'mobile'
  }
}

// Reconstruction: Campaign engagement timeline
EmailEvent.getEngagementTimeline(campaignId, interval = 'day')
// Shows: sent → delivered → opened → clicked progression
```

---

## 6. Implementation Architecture Patterns

### 6.1 Polymorphic Entity Pattern

**Problem:** Track activities related to different entity types (Case, Client, Lead)
**Solution:** Use polymorphic references

```javascript
// Single activity document can reference any entity
{
  res_model: 'Case',     // or 'Client', 'Lead'
  res_id: caseId,
  activity_type_id: typeId,
  // ...
}

// Query activities for any entity
Activity.getActivitiesForRecord('Case', caseId)
Activity.getActivitiesForRecord('Client', clientId)
Activity.getActivitiesForRecord('Lead', leadId)
```

**Database Indexes:**
```javascript
// Efficient polymorphic queries
activitySchema.index({ firmId: 1, res_model: 1, res_id: 1 });
crmActivitySchema.index({ lawyerId: 1, entityType: 1, entityId: 1 });
```

### 6.2 Denormalization Strategy

**Problem:** Avoid N+1 queries when displaying timelines
**Solution:** Denormalize frequently accessed data

```javascript
// In CRM Activity
{
  entityType: 'client',
  entityId: clientId,
  entityName: 'Ahmed Al-Mansouri',  // Denormalized
  secondaryEntityType: 'case',
  secondaryEntityName: 'Case #2024-001'  // Denormalized
}
```

**Benefits:**
- Fast timeline rendering without populates
- Supports pagination at scale
- Historical data preservation (names don't change retroactively)

### 6.3 Nested Schema Pattern for Type-Specific Data

```javascript
// Instead of separate collections
// One document with type-specific nested schemas

crmActivity {
  type: 'call' | 'email' | 'meeting' | 'task',

  // Union type pattern
  emailData: emailTrackingSchema,      // Only if type === 'email'
  callData: callTrackingSchema,        // Only if type === 'call'
  meetingData: meetingTrackingSchema,  // Only if type === 'meeting'
  taskData: taskInfoSchema             // Only if type === 'task'
}
```

**Advantages:**
- Single document query for all activity data
- Type safety with enum validation
- Efficient storage (nulls are sparse)

### 6.4 Auto-Generated Identifiers

```javascript
// Activity
activityId: 'ACT-202412-000001'

// CRM Activity
activityId: 'ACT-202412-000001'

// Event
eventId: 'EVT-202412-0001'

// WhatsApp Message
messageId: Unique per provider

// Pattern: [TYPE]-[YYYYMM]-[SEQUENCE]
```

### 6.5 TTL (Time-To-Live) Indexes for Data Retention

```javascript
// Auto-delete logs after 365 days
emailEventSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 365 * 24 * 60 * 60 }
);

// Auto-delete case logs after 7 years (legal requirement)
caseAuditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 7 * 365 * 24 * 60 * 60 }
);
```

---

## 7. Multi-Channel Timeline Query Examples

### 7.1 Complete Customer 360° Timeline

```javascript
// Get all interactions for a client across all channels
async function getCustomer360Timeline(clientId, options = {}) {
  const { startDate, endDate, limit = 100, skip = 0 } = options;

  const query = {
    entityType: 'client',
    entityId: new mongoose.Types.ObjectId(clientId),
    createdAt: { $gte: startDate, $lte: endDate }
  };

  const timeline = await CRMActivity.find(query)
    .populate('performedBy', 'firstName lastName avatar')
    .populate('assignedTo', 'firstName lastName avatar')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();

  return timeline;
  // Returns: Unified stream with calls, emails, meetings, tasks, docs
  // [
  //   { type: 'email', emailData: {...}, createdAt: ..., performedBy: ... },
  //   { type: 'call', callData: {...}, createdAt: ..., performedBy: ... },
  //   { type: 'meeting', meetingData: {...}, createdAt: ..., performedBy: ... },
  //   { type: 'task', taskData: {...}, createdAt: ..., assignedTo: ... },
  //   ...
  // ]
}
```

### 7.2 Communication Timeline

```javascript
async function getCommunicationTimeline(clientId) {
  return await CRMActivity.find({
    entityType: 'client',
    entityId: clientId,
    type: { $in: ['email', 'call', 'sms', 'whatsapp', 'meeting'] }
  })
    .sort({ createdAt: -1 })
    .limit(50);
}
```

### 7.3 Case Activity Timeline

```javascript
async function getCaseTimeline(caseId) {
  // From CRM Activity
  const crmActivities = await CRMActivity.find({
    entityType: 'case',
    entityId: caseId
  })
    .sort({ createdAt: -1 })
    .limit(100);

  // From Scheduled Activities
  const scheduledActivities = await Activity.find({
    res_model: 'Case',
    res_id: caseId
  })
    .sort({ date_deadline: -1 })
    .limit(50);

  // From Events
  const events = await Event.find({
    caseId: caseId
  })
    .sort({ startDateTime: -1 })
    .limit(50);

  // From Case Audit Log
  const auditLog = await CaseAuditLog.getCaseHistory(caseId, {
    limit: 100
  });

  return {
    activities: crmActivities,        // Communication & tasks
    scheduledActivities: scheduledActivities,  // Future/ongoing
    events: events,                   // Meetings & hearings
    auditLog: auditLog.logs           // All changes
  };
}
```

### 7.4 Invoice Lifecycle Timeline

```javascript
async function getInvoiceTimeline(invoiceId) {
  const invoice = await Invoice.findById(invoiceId)
    .populate('clientId')
    .populate('caseId')
    .lean();

  // Find related activities
  const activities = await CRMActivity.find({
    secondaryEntityType: 'invoice',
    secondaryEntityId: invoiceId
  })
    .sort({ createdAt: -1 });

  // Find related events (billing events)
  const events = await Event.find({
    'billing.linkedInvoiceId': invoiceId
  });

  // Build timeline
  return {
    invoice: invoice,
    events: [
      {
        type: 'created',
        timestamp: invoice.createdAt,
        status: 'draft'
      },
      {
        type: 'sent',
        timestamp: invoice.sentAt || null,
        status: 'sent'
      },
      {
        type: 'viewed',
        timestamp: invoice.viewedAt || null,
        status: 'viewed'
      },
      // Payment installments timeline
      ...invoice.paymentPlan.installments.map(inst => ({
        type: 'installment_due',
        dueDate: inst.dueDate,
        amount: inst.amount,
        status: inst.status,
        paidAt: inst.paidAt
      })),
      {
        type: 'paid',
        timestamp: invoice.paidDate || null,
        totalPaid: invoice.amountPaid,
        status: 'paid'
      }
    ],
    relatedActivities: activities  // Calls, emails about invoice
  };
}
```

---

## 8. Performance Considerations

### 8.1 Query Optimization

**Problem:** Timeline queries at scale can be slow
**Solution:** Strategic indexing and pagination

```javascript
// Good: Paginated query with indexes
CRMActivity.find({
  lawyerId: firmId,
  entityType: 'client',
  entityId: clientId,
  createdAt: { $gte: startDate, $lte: endDate }
})
.sort({ createdAt: -1 })
.limit(20)
.skip((page - 1) * 20)

// Bad: Fetching all records
CRMActivity.find({
  lawyerId: firmId,
  entityType: 'client',
  entityId: clientId
})
.limit(10000)  // Too many records
```

### 8.2 Aggregation Pipeline for Complex Analytics

```javascript
// Get communication statistics
CRMActivity.aggregate([
  {
    $match: {
      lawyerId: firmId,
      type: { $in: ['call', 'email', 'meeting'] },
      createdAt: { $gte: startDate, $lte: endDate }
    }
  },
  {
    $group: {
      _id: '$type',
      count: { $sum: 1 },
      avgDuration: { $avg: '$duration' },
      lastActivity: { $max: '$createdAt' }
    }
  },
  { $sort: { count: -1 } }
])
```

### 8.3 Sparse Indexes for Optional Fields

```javascript
// Email tracking is optional
emailEventSchema.index(
  { trackingId: 1 },
  { unique: true, sparse: true }
);

// WhatsApp message ID is optional
whatsappMessageSchema.index(
  { messageId: 1 },
  { unique: true, sparse: true }
);
```

---

## 9. Data Privacy & Compliance

### 9.1 GDPR Compliance

**Soft Delete Pattern:**
```javascript
// WhatsApp messages support soft delete
{
  isDeleted: Boolean,
  deletedAt: Date,
  deletedBy: ObjectId
}

// Query excludes deleted records
whatsappMessageSchema.statics.getConversationMessages = async function(conversationId) {
  return await this.find({
    conversationId: conversationId,
    isDeleted: false  // Always exclude deleted
  });
};
```

**TTL-Based Automatic Deletion:**
```javascript
// Email events auto-delete after 365 days
emailEventSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 365 * 24 * 60 * 60 }
);

// Case logs auto-delete after 7 years (legal retention)
caseAuditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 7 * 365 * 24 * 60 * 60 }
);
```

### 9.2 Data Isolation

**Firm-Based Isolation:**
```javascript
// All timeline queries scoped to firm
{
  firmId: ObjectId,  // Always present
  // ...
}

// Prevent cross-tenant data leakage
CRMActivity.find({
  firmId: currentUsersFirmId,  // Only their firm's data
  entityId: clientId
})
```

---

## 10. Conclusion & Best Practices

### Key Patterns Implemented:

1. **Unified Activity Streams** - Polymorphic entity relationships aggregate all interactions
2. **Multi-Channel Integration** - Type-specific nested schemas for email, call, meeting data
3. **Advanced Filtering** - Compound indexes enable efficient queries across dimensions
4. **SLA Tracking** - Deadline-based counters with reminder automation
5. **Event Sourcing** - Complete audit trail enables data reconstruction and compliance

### Recommended Implementation Order:

1. Start with `CRMActivity` model for timeline aggregation
2. Integrate `Activity` model for scheduled tasks
3. Add `Event` model for calendar integration
4. Integrate communication models (Email, WhatsApp)
5. Link `Invoice` model for financial timeline
6. Implement `AuditLog` for compliance
7. Build timeline UI with pagination and filters
8. Add SLA reminder queue processor
9. Create analytics dashboards from aggregated data

### Scalability Notes:

- Use MongoDB sharding on `firmId` and `entityId` for horizontal scaling
- Implement caching layer for frequently accessed timelines
- Consider event streaming (Kafka) for real-time timeline updates
- Archive old audit logs to cold storage after retention period
- Use full-text search with MongoDB Atlas Search for activity search

---

## File References

**Core Models:**
- `/src/models/activity.model.js` - Activity scheduling & chaining
- `/src/models/crmActivity.model.js` - Unified timeline activities
- `/src/models/event.model.js` - Calendar events & meetings
- `/src/models/invoice.model.js` - Financial timeline
- `/src/models/whatsappMessage.model.js` - Message tracking
- `/src/models/emailEvent.model.js` - Email engagement

**Services:**
- `/src/services/activity.service.js` - Activity business logic
- `/src/services/auditLog.service.js` - Audit logging

**Controllers:**
- `/src/controllers/activity.controller.js` - Activity endpoints
- `/src/controllers/event.controller.js` - Event endpoints
- `/src/controllers/crmActivity.controller.js` - Timeline endpoints

---

**End of Report**
