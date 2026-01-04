# API Security & Contract Test Plan

**Date:** 2026-01-04
**Purpose:** Comprehensive testing of all 4 API contracts against live server

---

## Test Scope

| API | Endpoints | Priority |
|-----|-----------|----------|
| Tasks | 45+ endpoints | High |
| Reminders | 30+ endpoints | High |
| Events | 30+ endpoints | High |
| Gantt | 36 endpoints | Medium |

---

## Security Checks (from CLAUDE.md & SECURITY_RULES.md)

### 1. Tenant Isolation (FIRM_ISOLATION.md)
- [ ] Solo lawyer can access their own data
- [ ] Firm member can access firm data
- [ ] Cannot access other firm's data (IDOR protection)

### 2. Input Validation
- [ ] Invalid ObjectId returns 400
- [ ] Mass assignment protection works
- [ ] Regex injection prevention

### 3. Response Security
- [ ] No sensitive fields exposed (password, tokens, etc.)
- [ ] Generic error messages (no stack traces)

---

## Test Categories

### Category A: Basic CRUD Operations
- Create with valid payload
- Read single resource
- Read list with pagination
- Update with valid payload
- Delete resource

### Category B: Input Validation
- Invalid ObjectId format
- Missing required fields
- Invalid enum values
- Future/past date validation

### Category C: Security Tests
- Access without token (401)
- Access other user's resource (403/404)
- Mass assignment attempt

### Category D: Edge Cases
- Empty body on POST
- Non-existent resource
- Duplicate resource
- Pagination limits

---

## Test Execution Order

1. **Authentication** - Get valid token
2. **Tasks API** - Full CRUD + actions
3. **Reminders API** - Full CRUD + actions
4. **Events API** - Full CRUD + actions
5. **Gantt API** - Data + operations

---

## Expected Results by Contract

### Tasks API Contract (task-api-contract.md)
| Endpoint | Method | Expected |
|----------|--------|----------|
| /tasks/stats | GET | 200 + stats object |
| /tasks/upcoming | GET | 200 + array |
| /tasks/overdue | GET | 200 + array |
| /tasks/due-today | GET | 200 + array |
| /tasks | GET | 200 + paginated list |
| /tasks | POST | 201 + task object |
| /tasks/:id | GET | 200 + task object |
| /tasks/:id | PUT | 200 + updated task |
| /tasks/:id | DELETE | 200 + success |
| /tasks/:id/complete | POST | 200 + completed task |
| /tasks/templates | GET | 200 + array |

### Reminders API Contract (reminder-api-contract.md)
| Endpoint | Method | Expected |
|----------|--------|----------|
| /reminders/stats | GET | 200 + stats object |
| /reminders/upcoming | GET | 200 + array |
| /reminders/overdue | GET | 200 + array |
| /reminders/delegated | GET | 200 + array |
| /reminders | GET | 200 + paginated list |
| /reminders | POST | 201 + reminder object |
| /reminders/:id | GET | 200 + reminder object |
| /reminders/:id | PUT | 200 + updated reminder |
| /reminders/:id | DELETE | 200 + success |
| /reminders/:id/snooze | POST | 200 + snoozed reminder |
| /reminders/:id/complete | POST | 200 + completed reminder |
| /reminders/location/summary | GET | 200 |
| /reminders/location/locations | GET | 200 + array |

### Events API Contract (event-api-contract.md)
| Endpoint | Method | Expected |
|----------|--------|----------|
| /events/stats | GET | 200 + stats object |
| /events/calendar | GET | 200 + array (requires dates) |
| /events/upcoming | GET | 200 + array |
| /events | GET | 200 + paginated list |
| /events | POST | 201 + event object |
| /events/:id | GET | 200 + event object |
| /events/:id | PUT | 200 + updated event |
| /events/:id | DELETE | 200 + success |
| /events/:id/complete | POST | 200 + completed event |
| /events/:id/cancel | POST | 200 + cancelled event |
| /events/:id/attendees | POST | 200 + updated attendees |
| /events/:id/rsvp | POST | 200 + RSVP status |
| /events/:id/agenda | POST | 200 + updated agenda |
| /events/:id/action-items | POST | 200 + action item |
| /events/availability | POST | 200 + availability data |

### Gantt API Contract (gantt-api-contract.md)
| Endpoint | Method | Expected |
|----------|--------|----------|
| /gantt/productivity | GET | 200 + unified data |
| /gantt/data | GET | 200 + gantt data |
| /gantt/resources | GET | 200 + resources |
| /gantt/collaboration/stats | GET | 200 + stats |

---

## Pass/Fail Criteria

| Result | Criteria |
|--------|----------|
| PASS | HTTP status matches expected, success=true |
| FAIL | HTTP error or success=false |
| SKIP | Endpoint requires setup not available |

---

## Rollback Strategy

- All test resources created with "API Test" prefix
- Cleanup deletes all test resources at end
- Failed cleanup logged for manual review

