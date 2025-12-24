# 360° Customer Timeline Patterns

## 1. Unified Activity Stream Architecture

### Core Models
- Activity, CRM Activity, Event, Invoice
- Polymorphic entity patterns (res_model + res_id)
- Activity chaining for automatic follow-ups
- Type-specific nested schemas

### Implementation Pattern
```javascript
// Unified timeline entry
{
  entityType: 'contact|company|deal|case',
  entityId: ObjectId,
  activityType: 'email|call|meeting|note|task|invoice|ticket',
  timestamp: Date,
  user: ObjectId,
  metadata: {
    // Type-specific data
  },
  visibility: 'internal|external',
  tags: [String]
}
```

## 2. Integration Points

### Email Integration
- Email events with engagement tracking
- Opened, clicked, bounced, replied
- Thread linking to entity

### Call Integration
- Call logs with duration, outcome
- Recording references
- Disposition codes

### Meeting Integration
- Participant tracking
- Agenda and notes
- Calendar sync

### Invoice Integration
- Billing lifecycle events
- Payment status changes
- Due date tracking

### Support Tickets
- Ticket creation/updates
- Resolution tracking
- SLA counters

## 3. Filtering & Query Patterns

### Filter Types
- Entity type
- Activity type
- Date range
- User/team
- Tags
- Full-text search

### Optimized Indexes
```javascript
// Compound indexes for common queries
{ entityType: 1, entityId: 1, timestamp: -1 }
{ entityId: 1, activityType: 1, timestamp: -1 }
{ timestamp: -1, entityType: 1 }
```

### Pagination
- Cursor-based for timeline
- Infinite scroll support
- Batch loading

## 4. SLA Counters & Deadline Tracking

### Virtual Fields
```javascript
// Overdue detection
isOverdue: function() {
  return this.dueDate && this.dueDate < new Date() && !this.completed;
}
```

### State Categories
- Overdue (past due date)
- Due Today
- Due Tomorrow
- Upcoming (future)
- Completed

### Activity Reminders
- Queue-based processing
- Email/SMS/push notifications
- Snooze functionality

## 5. Event Sourcing & Audit Trail

### Event Store Pattern
```javascript
{
  eventId: UUID,
  entityType: String,
  entityId: ObjectId,
  eventType: String,
  payload: Object,
  metadata: {
    userId: ObjectId,
    timestamp: Date,
    source: String,
    correlationId: String
  }
}
```

### Benefits
- Complete history reconstruction
- Time-travel queries
- Audit compliance
- Analytics foundation

### Retention
- TTL indexes for auto-cleanup
- Archive to cold storage
- GDPR compliance support

---

## Traf3li Current State

### ✅ Implemented
- Activity model with polymorphic refs
- CRM Activity for sales tracking
- Email events with engagement
- WhatsApp message tracking
- Audit logging with before/after

### ⚠️ Partial
- Timeline aggregation (manual)
- SLA tracking (case-specific)
- Activity reminders (basic)

### ❌ Missing
- Unified timeline API endpoint
- Timeline filters UI component
- SLA dashboard widgets
- Real-time timeline updates via WebSocket
- Timeline export functionality

---

## Recommendations

### Priority 1: Unified Timeline Service
```javascript
// Timeline aggregation service
class TimelineService {
  async getTimeline(entityType, entityId, filters) {
    // Aggregate from multiple collections
    // Apply filters and pagination
    // Return unified timeline
  }
}
```

### Priority 2: SLA Dashboard
- Visual SLA status indicators
- Overdue item counts by category
- SLA trend charts
- Alert configurations

### Priority 3: Real-Time Updates
- WebSocket channel per entity
- Activity broadcast on creation
- Optimistic UI updates
