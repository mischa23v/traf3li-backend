# Task Controller Refactoring - Phase 2 Requirements

## Overview

Extract pure helper functions from `task.controller.js` (4,420 lines) to `task.service.js` to improve maintainability, testability, and reduce controller complexity.

**Scope:** Extract 4 pure helper functions (~200-300 lines)
**Risk Level:** Low (functions have no req/res dependencies)

---

## User Stories

### 1. Extract calculateNextDueDate Helper
As a developer, I want date calculation logic in a service so that I can unit test it independently.

**Current Location:** `task.controller.js` ~line 1500

**Acceptance Criteria:**
1. WHEN `calculateNextDueDate()` is called THE SYSTEM SHALL return the next due date based on recurring config
2. WHEN the function is moved THE SYSTEM SHALL maintain identical input/output behavior
3. WHEN the function is imported from service THE SYSTEM SHALL work in controller without changes
4. WHEN unit tests run THE SYSTEM SHALL be able to test this function in isolation

### 2. Extract hasCircularDependency Helper
As a developer, I want dependency checking logic in a service so that I can reuse it across modules.

**Current Location:** `task.controller.js` ~line 2100

**Acceptance Criteria:**
1. WHEN `hasCircularDependency()` is called THE SYSTEM SHALL detect circular task dependencies
2. WHEN the function is moved THE SYSTEM SHALL maintain identical algorithm
3. WHEN called from controller THE SYSTEM SHALL return same boolean result
4. WHEN dependencies form a cycle THE SYSTEM SHALL return `true`

### 3. Extract evaluateWorkflowRules Helper
As a developer, I want workflow evaluation logic in a service so that I can extend it for other models.

**Current Location:** `task.controller.js` ~line 2420

**Acceptance Criteria:**
1. WHEN `evaluateWorkflowRules()` is called THE SYSTEM SHALL evaluate task workflow conditions
2. WHEN rules match THE SYSTEM SHALL return actions to execute
3. WHEN the function is moved THE SYSTEM SHALL maintain identical rule evaluation
4. WHEN no rules match THE SYSTEM SHALL return empty actions array

### 4. Extract executeWorkflowAction Helper
As a developer, I want workflow execution logic in a service so that I can add new action types easily.

**Current Location:** `task.controller.js` ~line 2450

**Acceptance Criteria:**
1. WHEN `executeWorkflowAction()` is called THE SYSTEM SHALL perform the specified action on the task
2. WHEN action type is invalid THE SYSTEM SHALL skip without error
3. WHEN the function is moved THE SYSTEM SHALL maintain identical action execution
4. WHEN action modifies task THE SYSTEM SHALL return updated task state

---

## Non-Functional Requirements

### Code Quality
- THE SYSTEM SHALL maintain 100% backward compatibility
- THE SYSTEM SHALL pass `node scripts/verify-task-contract.js`
- THE SYSTEM SHALL have no syntax errors (`node --check`)

### Testing
- WHEN functions are extracted THE SYSTEM SHALL be testable with mock data
- THE SYSTEM SHALL not require database connection for unit tests

### Documentation
- THE SYSTEM SHALL update contract if any field names change (none expected)
- THE SYSTEM SHALL add JSDoc comments to extracted functions

---

## Out of Scope

- Document functions (lines 2928-3504) - Future phase
- Voice/NLP functions (lines 3505-4397) - Future phase
- Changing any API contracts - Not allowed
- Adding new features - Pure refactor only

---

## Open Questions

1. ~~Should we create a new task.service.js or use existing patterns?~~ → Create new file
2. ~~Should helper functions be exported individually or as a class?~~ → Export individually (matches codebase style)

---

## Verification Plan

After Phase 2, run:
```bash
# Syntax check
node --check src/controllers/task.controller.js
node --check src/services/task.service.js

# Contract verification
node scripts/verify-task-contract.js

# Manual test: Create, update, complete a task via API
```
