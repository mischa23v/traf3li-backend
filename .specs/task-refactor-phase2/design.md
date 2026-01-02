# Task Controller Refactoring - Phase 2 Design

## Overview

Extract helper functions from `task.controller.js` to `task.service.js`.

**Requirements:** [requirements.md](./requirements.md)

---

## Function Analysis

| Function | Lines | Pure? | DB Calls | Extraction Risk |
|----------|-------|-------|----------|-----------------|
| `calculateNextDueDate` | 1496-1524 | ✅ Yes | None | Low |
| `hasCircularDependency` | 2102-2125 | ❌ No | `Task.findOne` | Medium |
| `evaluateWorkflowRules` | 2425-2453 | ❌ No | Calls executeWorkflowAction | Medium |
| `executeWorkflowAction` | 2459-2511 | ❌ No | `Task.create` | Medium |

---

## Architecture

### File Structure
```
src/
├── controllers/
│   └── task.controller.js     # Imports from task.service.js
└── services/
    └── task.service.js        # NEW - Helper functions
```

### Data Flow
```
Controller (handles req/res)
    ↓
Service (business logic, can access models)
    ↓
Model (database operations)
```

---

## Implementation Design

### task.service.js Structure

```javascript
/**
 * Task Service
 *
 * Business logic helpers for task operations.
 * Extracted from task.controller.js for maintainability.
 */

const { Task } = require('../models');

/**
 * Calculate next due date for recurring tasks
 * @param {Date} currentDueDate - Current due date
 * @param {Object} recurring - Recurring configuration
 * @param {string} recurring.frequency - daily|weekly|biweekly|monthly|quarterly|yearly
 * @param {number} [recurring.interval=1] - Interval multiplier
 * @returns {Date} Next due date
 */
function calculateNextDueDate(currentDueDate, recurring) {
    // Pure function - no DB calls
}

/**
 * Check for circular dependencies between tasks
 * @param {ObjectId} taskId - Task being checked
 * @param {ObjectId} dependsOnId - Potential dependency
 * @param {ObjectId} firmId - Firm for isolation
 * @param {Set} [visited] - Visited nodes (internal)
 * @returns {Promise<boolean>} True if circular dependency exists
 */
async function hasCircularDependency(taskId, dependsOnId, firmId, visited = new Set()) {
    // Uses Task.findOne for dependency traversal
}

/**
 * Evaluate and execute workflow rules on task
 * @param {Object} task - Task document
 * @param {string} triggerType - Trigger type (e.g., 'completion')
 * @param {Object} context - Execution context
 * @param {ObjectId} context.userId - User performing action
 * @param {string} context.userName - User's display name
 */
async function evaluateWorkflowRules(task, triggerType, context) {
    // Evaluates conditions, calls executeWorkflowAction
}

/**
 * Execute a single workflow action
 * @param {Object} task - Task document
 * @param {Object} action - Action configuration
 * @param {Object} context - Execution context
 */
async function executeWorkflowAction(task, action, context) {
    // Handles create_task, assign_user, update_field
}

module.exports = {
    calculateNextDueDate,
    hasCircularDependency,
    evaluateWorkflowRules,
    executeWorkflowAction
};
```

---

## Controller Changes

### Before (task.controller.js)
```javascript
// Helper function to calculate next due date
function calculateNextDueDate(currentDueDate, recurring) {
    // ... 28 lines
}
```

### After (task.controller.js)
```javascript
const {
    calculateNextDueDate,
    hasCircularDependency,
    evaluateWorkflowRules,
    executeWorkflowAction
} = require('../services/task.service');
```

---

## Migration Strategy

### Phase 2a: Create Service File (Low Risk)
1. Create `src/services/task.service.js`
2. Copy functions (don't delete from controller yet)
3. Verify syntax: `node --check src/services/task.service.js`

### Phase 2b: Update Controller Imports (Medium Risk)
1. Add import statement to controller
2. Delete inline function definitions
3. Verify syntax: `node --check src/controllers/task.controller.js`

### Phase 2c: Verify Contract (Critical)
1. Run: `node scripts/verify-task-contract.js`
2. Test API endpoints manually
3. Confirm no breaking changes

---

## Functions to Extract

### 1. calculateNextDueDate (lines 1496-1524)

**Current:**
```javascript
function calculateNextDueDate(currentDueDate, recurring) {
    const nextDate = new Date(currentDueDate);
    const interval = recurring.interval || 1;

    switch (recurring.frequency) {
        case 'daily':
            nextDate.setDate(nextDate.getDate() + interval);
            break;
        case 'weekly':
            nextDate.setDate(nextDate.getDate() + (7 * interval));
            break;
        case 'biweekly':
            nextDate.setDate(nextDate.getDate() + 14);
            break;
        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + interval);
            break;
        case 'quarterly':
            nextDate.setMonth(nextDate.getMonth() + 3);
            break;
        case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + interval);
            break;
        default:
            nextDate.setDate(nextDate.getDate() + 1);
    }

    return nextDate;
}
```

### 2. hasCircularDependency (lines 2102-2125)

**Current:**
```javascript
async function hasCircularDependency(taskId, dependsOnId, firmId, visited = new Set()) {
    if (taskId.toString() === dependsOnId.toString()) {
        return true;
    }

    if (visited.has(dependsOnId.toString())) {
        return false;
    }

    visited.add(dependsOnId.toString());

    const dependentTask = await Task.findOne({ _id: dependsOnId, firmId }).select('blockedBy');
    if (!dependentTask || !dependentTask.blockedBy) {
        return false;
    }

    for (const blockedById of dependentTask.blockedBy) {
        if (await hasCircularDependency(taskId, blockedById, firmId, visited)) {
            return true;
        }
    }

    return false;
}
```

### 3. evaluateWorkflowRules (lines 2425-2453)

**Current:** 29 lines - evaluates conditions and calls executeWorkflowAction

### 4. executeWorkflowAction (lines 2459-2511)

**Current:** 53 lines - handles create_task, assign_user, update_field actions

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Import path wrong | Use relative path `../services/task.service` |
| Function signature change | Copy exactly, no modifications |
| Missing Task model | Import Task in service file |
| Circular dependency in requires | Service imports model, controller imports service |

---

## Verification Checklist

- [ ] `node --check src/services/task.service.js` passes
- [ ] `node --check src/controllers/task.controller.js` passes
- [ ] `node scripts/verify-task-contract.js` passes
- [ ] No new lint errors
- [ ] API endpoints work (manual test)

---

## Estimated Impact

| Metric | Before | After |
|--------|--------|-------|
| task.controller.js lines | 4,420 | ~4,280 |
| task.service.js lines | 0 | ~140 |
| Functions extracted | 0 | 4 |
| Net reduction | - | ~140 lines |
