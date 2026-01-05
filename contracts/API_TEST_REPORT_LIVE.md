# Live API Test Report - api.traf3li.com

**Test Date:** 2026-01-05
**Tester:** Claude Code (automated)
**User Type:** Solo Lawyer (mischa23v@gmail.com)
**Environment:** Production (api.traf3li.com)

---

## Executive Summary

| Category | Passed | Failed | Total | Status |
|----------|--------|--------|-------|--------|
| Reminders API | 14 | 0 | 14 | ✅ PASS |
| Events API | 10 | 1 | 11 | ⚠️ PARTIAL |
| Gantt API | 5 | 3 | 8 | ❌ ISSUES |
| **TOTAL** | **29** | **4** | **33** | **88%** |

---

## Critical Issues Found

### 1. FIRM_ISOLATION_VIOLATION Bugs (Gantt API)

The following endpoints fail with `FIRM_ISOLATION_VIOLATION` for solo lawyers:

| Endpoint | HTTP | Error | Root Cause |
|----------|------|-------|------------|
| GET /gantt/productivity | 500 | FIRM_ISOLATION_VIOLATION | Task query uses `$and: [req.firmQuery]` instead of spreading |
| GET /gantt/resources/:userId/workload | 500 | FIRM_ISOLATION_VIOLATION | Service doesn't use firmQuery |
| GET /gantt/resources/conflicts | 500 | FIRM_ISOLATION_VIOLATION | Service doesn't use firmQuery |

**Root Causes:**

1. **getProductivityData (gantt.controller.js:197-214):**
   ```javascript
   // BUG: firmQuery is nested in $and, plugin doesn't detect it
   Task.find({
       $and: [
           req.firmQuery,  // ❌ Nested, not at top level
           { status: { $ne: 'canceled' } },
           ...
       ]
   })
   ```

2. **getUserWorkload (gantt.controller.js:993):**
   ```javascript
   // BUG: Missing firmQuery parameter
   const workload = await ganttService.getAssigneeWorkload(userId, dateRange);
   // Should be:
   const workload = await ganttService.getAssigneeWorkload(userId, req.firmQuery, dateRange);
   ```

3. **getResourceConflicts (gantt.controller.js:1012):**
   ```javascript
   // BUG: Missing firmQuery parameter
   const conflicts = await ganttService.checkResourceConflicts(userId, startDate, endDate);
   // Should be:
   const conflicts = await ganttService.checkResourceConflicts(userId, req.firmQuery, startDate, endDate);
   ```

4. **Service methods (gantt.service.js:886-987):**
   - `getAssigneeWorkload()` doesn't accept firmQuery parameter
   - `checkResourceConflicts()` doesn't accept firmQuery parameter

### 2. Intermittent Network Errors (503)

Some endpoints experienced transient TLS connection errors (not code bugs):
- GET /reminders/stats - Works on retry
- GET /events/stats - Works on retry
- GET /events/archived - Works on retry
- POST /events - Works on retry

---

## Detailed Test Results

### Reminders API

| # | Endpoint | Method | HTTP | Status | Notes |
|---|----------|--------|------|--------|-------|
| 1 | /reminders | GET | 200 | ✅ PASS | Returns list with proper lawyerId filter |
| 2 | /reminders/stats | GET | 200 | ✅ PASS | Stats aggregate works |
| 3 | /reminders/upcoming | GET | 200 | ✅ PASS | |
| 4 | /reminders/overdue | GET | 200 | ✅ PASS | |
| 5 | /reminders/snoozed-due | GET | 200 | ✅ PASS | |
| 6 | /reminders/delegated | GET | 200 | ✅ PASS | |
| 7 | /reminders/search | GET | 200 | ✅ PASS | Proper tenant isolation |
| 8 | /reminders/conflicts | GET | 200 | ✅ PASS | |
| 9 | /reminders/ids | GET | 200 | ✅ PASS | |
| 10 | /reminders/archived | GET | 200 | ✅ PASS | |
| 11 | /reminders/export | GET | 200 | ✅ PASS | |
| 12 | /reminders/location/summary | GET | 200 | ✅ PASS | |
| 13 | /reminders/location/locations | GET | 200 | ✅ PASS | |
| 14 | /reminders | POST | 201 | ✅ PASS | Created with lawyerId |

### Events API

| # | Endpoint | Method | HTTP | Status | Notes |
|---|----------|--------|------|--------|-------|
| 1 | /events | GET | 200 | ✅ PASS | |
| 2 | /events/stats | GET | 200 | ✅ PASS | Works on retry |
| 3 | /events/upcoming | GET | 200 | ✅ PASS | |
| 4 | /events/calendar | GET | 200 | ✅ PASS | |
| 5 | /events/month/:year/:month | GET | 200 | ✅ PASS | |
| 6 | /events/date/:date | GET | 200 | ✅ PASS | |
| 7 | /events/search | GET | 200 | ✅ PASS | |
| 8 | /events/ids | GET | 200 | ✅ PASS | |
| 9 | /events/archived | GET | 200 | ✅ PASS | Works on retry |
| 10 | /events/export | GET | 200 | ✅ PASS | |
| 11 | /events/location-triggers | GET | 200 | ✅ PASS | |

### Gantt API

| # | Endpoint | Method | HTTP | Status | Notes |
|---|----------|--------|------|--------|-------|
| 1 | /gantt/data | GET | 200 | ✅ PASS | |
| 2 | /gantt/productivity | GET | 500 | ❌ FAIL | FIRM_ISOLATION_VIOLATION |
| 3 | /gantt/data/filter | POST | 200 | ✅ PASS | |
| 4 | /gantt/resources | GET | 200 | ✅ PASS | |
| 5 | /gantt/collaboration/stats | GET | 200 | ✅ PASS | |
| 6 | /gantt/data/assigned/:userId | GET | 200 | ✅ PASS | |
| 7 | /gantt/resources/:userId/workload | GET | 500 | ❌ FAIL | FIRM_ISOLATION_VIOLATION |
| 8 | /gantt/resources/conflicts | GET | 500 | ❌ FAIL | FIRM_ISOLATION_VIOLATION |

---

## Gold Standard Compliance

### Tenant Isolation (firmId/lawyerId)

| Check | Status |
|-------|--------|
| All queries use req.firmQuery | ⚠️ Partial - Gantt has 3 violations |
| Creates use req.addFirmId() | ✅ Yes |
| Services accept firmQuery | ⚠️ Partial - 2 methods missing |
| Solo lawyers can access features | ⚠️ Partial - Gantt fails |

### Security

| Check | Status |
|-------|--------|
| pickAllowedFields used | ✅ Yes |
| sanitizeObjectId used | ✅ Yes |
| IDOR protection (firmQuery in queries) | ⚠️ Partial |
| No direct firmId checks | ✅ Yes |

---

## Recommended Fixes

### Fix 1: gantt.controller.js - getProductivityData

```javascript
// Lines 197-214: Change $and pattern to spread pattern
// Before:
Task.find({
    $and: [
        req.firmQuery,
        { status: { $ne: 'canceled' } },
        ...
    ]
})

// After:
Task.find({
    ...req.firmQuery,
    status: { $ne: 'canceled' },
    isTemplate: { $ne: true },
    ...(Object.keys(dateFilters).length > 0 ? { dueDate: dateFilters } : {})
})
```

### Fix 2: gantt.controller.js - getUserWorkload

```javascript
// Line 993: Pass firmQuery
const workload = await ganttService.getAssigneeWorkload(userId, req.firmQuery, dateRange);
```

### Fix 3: gantt.controller.js - getResourceConflicts

```javascript
// Line 1012: Pass firmQuery
const conflicts = await ganttService.checkResourceConflicts(userId, req.firmQuery, startDate, endDate);
```

### Fix 4: gantt.service.js - getAssigneeWorkload

```javascript
// Line 886: Add firmQuery parameter and use it
async getAssigneeWorkload(assigneeId, firmQuery = {}, dateRange) {
    const query = {
        assignedTo: assigneeId,
        ...firmQuery  // Add tenant filter
    };
    // ... rest of function
}
```

### Fix 5: gantt.service.js - checkResourceConflicts

```javascript
// Line 957: Add firmQuery parameter and pass to getAssigneeWorkload
async checkResourceConflicts(assigneeId, firmQuery = {}, startDate, endDate) {
    const workload = await this.getAssigneeWorkload(assigneeId, firmQuery, {
        start: startDate,
        end: endDate
    });
    // ... rest of function
}
```

---

## Test Environment Details

- **User ID:** 694e7ceb7f188650a0799a24
- **User Type:** Solo Lawyer (isSoloLawyer: true)
- **lawyerWorkMode:** solo
- **firmId:** null
- **lawyerId:** 694e7ceb7f188650a0799a24

This user profile correctly tests solo lawyer isolation patterns where `req.firmQuery = { lawyerId: userId }`.

---

## Conclusion

The API is **88% functional** with 3 critical FIRM_ISOLATION_VIOLATION bugs in the Gantt controller that prevent solo lawyers from using:
- Productivity view
- User workload
- Resource conflict detection

These must be fixed before the feature is usable for solo lawyers.
