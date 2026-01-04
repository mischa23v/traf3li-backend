# API Contract Testing - Requirements

## Overview
Test ALL endpoints defined in the three API contract files (Tasks, Reminders, Events) against the live server to verify functionality for solo lawyers.

---

## Scale Assessment: Quick Fix
This is a **testing task**, not implementation. Execute tests and report results.

---

## Test Scope

### Contract Files
| Contract | Location | Endpoints |
|----------|----------|-----------|
| Tasks | `contracts/task-api-contract.md` | ~15 endpoints |
| Reminders | `contracts/reminder-api-contract.md` | ~10 endpoints |
| Events | `contracts/event-api-contract.md` | ~25 endpoints |

### Test User
- **Email:** mischa23v@gmail.com
- **Type:** Solo Lawyer (`isSoloLawyer: true`)
- **Tenant Isolation:** `lawyerId` (not `firmId`)

---

## Test Plan

### Phase 1: Authentication
1. Login and obtain JWT token
2. Verify user is solo lawyer

### Phase 2: Tasks API
Test all CRUD + action endpoints

### Phase 3: Reminders API
Test all CRUD + action endpoints

### Phase 4: Events API
Test all CRUD + action endpoints

### Phase 5: Report
Generate summary table with pass/fail status

---

## Expected Results Format

| API | Endpoint | Method | Status | Response |
|-----|----------|--------|--------|----------|
| Tasks | /api/tasks | GET | ✅/❌ | Summary |
| ... | ... | ... | ... | ... |

---

## Verification Criteria

WHEN endpoint returns `{"success": true}` THE TEST SHALL pass
WHEN endpoint returns `{"success": false}` THE TEST SHALL fail with error message
WHEN endpoint returns 500 error THE TEST SHALL flag as critical bug
