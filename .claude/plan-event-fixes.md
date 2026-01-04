# Plan: Fix Event API for Gold Standard Compliance

## Executive Summary

The Event controller has **40+ instances** of the same anti-pattern that broke Tasks and Reminders for solo lawyers. All queries use `{ _id: id, firmId }` instead of `{ _id: id, ...req.firmQuery }`.

---

## Issues Identified

### 1. Controller: Direct `firmId` Usage (Anti-Pattern)

**Pattern Found (WRONG):**
```javascript
const event = await Event.findOne({ _id: id, firmId });
```

**Gold Standard (CORRECT):**
```javascript
const event = await Event.findOne({ _id: id, ...req.firmQuery });
```

**Why it breaks solo lawyers:**
- Solo lawyers have `req.firmId = null` and `req.firmQuery = { lawyerId: X }`
- Using `{ firmId: null }` returns nothing because events don't have `firmId: null`

### 2. Event.create Uses `firmId` Directly

**Pattern Found (WRONG):**
```javascript
const event = await Event.create({
    title,
    firmId,  // ❌ Wrong
    createdBy: userId
});
```

**Gold Standard (CORRECT):**
```javascript
const event = await Event.create(req.addFirmId({
    title,
    createdBy: userId
}));
```

### 3. Pre-Save Hook Needs Tenant-Scoped ID Generation

**Current (WRONG):**
```javascript
const count = await this.constructor.countDocuments({
    createdAt: { $gte: ..., $lt: ... }
});  // Global count - breaks isolation
```

**Gold Standard (CORRECT):**
```javascript
const tenantQuery = {};
if (this.firmId) tenantQuery.firmId = this.firmId;
else if (this.lawyerId) tenantQuery.lawyerId = this.lawyerId;

const count = await this.constructor.countDocuments({
    ...tenantQuery,
    createdAt: { $gte: ..., $lt: ... }
});  // Per-tenant count
```

---

## Files to Fix

### 1. `src/controllers/event.controller.js`

| Line | Current | Fix |
|------|---------|-----|
| 108 | `Case.findOne({ _id: caseId, firmId })` | `Case.findOne({ _id: caseId, ...req.firmQuery })` |
| 116 | `User.findOne({ _id: clientId, firmId })` | User lookup is OK (users are global) |
| 129-152 | `Event.create({ ..., firmId, ... })` | `Event.create(req.addFirmId({ ... }))` |
| 416 | `Event.findOne({ _id: id, firmId })` | `Event.findOne({ _id: id, ...req.firmQuery })` |
| 452 | `Event.findOne({ _id: id, firmId })` | `Event.findOne({ _id: id, ...req.firmQuery })` |
| 490 | `Case.findOne({ ..., firmId })` | `Case.findOne({ ..., ...req.firmQuery })` |
| 498 | `User.findOne({ ..., firmId })` | User lookup is OK |
| 512 | `Task.findOne({ _id: event.taskId, firmId })` | `Task.findOne({ _id: event.taskId, ...req.firmQuery })` |
| 589 | `Event.findOne({ _id: id, firmId })` | `Event.findOne({ _id: id, ...req.firmQuery })` |
| 605 | `Task.findOne({ ..., firmId })` | `Task.findOne({ ..., ...req.firmQuery })` |
| 617 | `Event.findOneAndDelete({ _id: id, firmId })` | `Event.findOneAndDelete({ _id: id, ...req.firmQuery })` |
| 635 | `Event.findOne({ _id: id, firmId })` | `Event.findOne({ _id: id, ...req.firmQuery })` |
| 676 | `Event.findOne({ _id: id, firmId })` | `Event.findOne({ _id: id, ...req.firmQuery })` |
| 718 | `Event.findOne({ _id: id, firmId })` | `Event.findOne({ _id: id, ...req.firmQuery })` |
| 763 | `Event.findOne({ _id: id, firmId })` | `Event.findOne({ _id: id, ...req.firmQuery })` |
| 810 | `Event.findOne({ _id: id, firmId })` | `Event.findOne({ _id: id, ...req.firmQuery })` |
| 843 | `Event.findOne({ _id: id, firmId })` | `Event.findOne({ _id: id, ...req.firmQuery })` |
| 881 | `Event.findOne({ _id: id, firmId })` | `Event.findOne({ _id: id, ...req.firmQuery })` |
| 920 | `Event.findOne({ _id: id, firmId })` | `Event.findOne({ _id: id, ...req.firmQuery })` |
| 960 | `Event.findOne({ _id: id, firmId })` | `Event.findOne({ _id: id, ...req.firmQuery })` |
| 991 | `Event.findOne({ _id: id, firmId })` | `Event.findOne({ _id: id, ...req.firmQuery })` |
| 1043 | `Event.findOne({ _id: id, firmId })` | `Event.findOne({ _id: id, ...req.firmQuery })` |
| 1339 | `Event.findOne({ _id: id, firmId })` | `Event.findOne({ _id: id, ...req.firmQuery })` |
| 1695-1705 | Case/User lookups with firmId | Case uses req.firmQuery, User is OK |
| 1755-1767 | `Event.create({ ..., firmId, ... })` | `Event.create(req.addFirmId({ ... }))` |
| 1869-1880 | Case/User lookups with firmId | Case uses req.firmQuery, User is OK |
| 1929-1941 | `Event.create({ ..., firmId, ... })` | `Event.create(req.addFirmId({ ... }))` |

### 2. `src/models/event.model.js`

| Line | Issue | Fix |
|------|-------|-----|
| 384-396 | Pre-save hook uses global countDocuments | Use tenant-scoped query with `this.firmId` or `this.lawyerId` |

---

## Tasks

1. **Create Event API Contract** - Document all endpoints, fields, enums
2. **Fix event.controller.js** - Replace all firmId patterns with req.firmQuery
3. **Fix event.model.js** - Tenant-scoped ID generation in pre-save hook
4. **Test all 3 contracts with curl** - Tasks, Reminders, Events
5. **Commit and push**

---

## Testing Plan

### Events to Test
- [ ] POST /api/events - Create event
- [ ] GET /api/events - List events
- [ ] GET /api/events/:id - Get single event
- [ ] PUT /api/events/:id - Update event
- [ ] DELETE /api/events/:id - Delete event
- [ ] POST /api/events/:id/complete - Complete event
- [ ] POST /api/events/:id/cancel - Cancel event

### Tasks to Test
- [ ] POST /api/tasks - Create task
- [ ] GET /api/tasks - List tasks
- [ ] GET /api/tasks/:id - Get single task
- [ ] DELETE /api/tasks/:id - Delete task

### Reminders to Test
- [ ] POST /api/reminders - Create reminder
- [ ] GET /api/reminders - List reminders
- [ ] GET /api/reminders/:id - Get single reminder
- [ ] DELETE /api/reminders/:id - Delete reminder

---

## Estimated Changes

- **event.controller.js**: ~40 line changes
- **event.model.js**: ~10 line changes
- **contracts/event-api-contract.md**: New file (~400 lines)
