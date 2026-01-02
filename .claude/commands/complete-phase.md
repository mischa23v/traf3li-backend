Create implementation tasks from approved design, then execute ONE task at a time. This is Phase 3 of the Kiro-style workflow.

**Prerequisites:** User MUST have approved both `requirements.md` and `design.md` first.

---

## 🛫 PRE-FLIGHT CHECKS (Before Starting)

**Run these checks BEFORE writing any code:**

### 1. Environment Verification
```bash
# Verify syntax on files you'll modify
node --check src/controllers/[target].controller.js
node --check src/routes/[target].route.js

# Check current branch state
git status  # Should be clean or have only spec files
```

### 2. Dependency Check
| Check | Command | Expected |
|-------|---------|----------|
| Route conflicts | `grep -r "GET /api/v1/[path]" src/routes/` | No conflicts |
| Model exists | `ls src/models/[model].model.js` | Exists or planned |
| Service exists | `ls src/services/[service].service.js` | Exists or planned |
| Import paths | Check relative paths in design.md | Valid paths |

### 3. Baseline Snapshot
```bash
# Record current state for rollback
git log -1 --oneline  # Note the commit hash
git stash list        # Check for stashed changes

# Run existing verification (if any)
node scripts/verify-task-contract.js  # For task refactoring
```

### 4. Risk Acknowledgment
Before proceeding, confirm:
- [ ] I've read the Impact Analysis in design.md
- [ ] I understand which files are safe vs risky
- [ ] I have a rollback plan if something breaks

---

## 🎯 INSTRUCTIONS

1. **Read `requirements.md` and `design.md`** to understand what to build
2. **Create `tasks.md`** with ordered implementation checklist
3. **Execute ONE task at a time**, stopping for user verification after each
4. **Mark tasks complete** as you finish them
5. **When all tasks done**, ask user if they want to add more features

---

## 📋 TASKS.MD TEMPLATE

```markdown
# [Feature Name] - Implementation Tasks

## Overview
Step-by-step implementation plan based on the approved design.

**Requirements:** [Link to requirements.md]
**Design:** [Link to design.md]

---

## Task List

### Phase 1: Data Layer
- [ ] **Task 1.1**: Create Mongoose model
  - File: `src/models/[resource].model.js`
  - Includes: schema, indexes, pre-save hooks, virtuals
  - Refs: REQ-1.1, REQ-1.5

- [ ] **Task 1.2**: Add model to exports
  - File: `src/models/index.js`
  - Refs: Design - Architecture

### Phase 2: Controller Layer
- [ ] **Task 2.1**: Create controller with CRUD operations
  - File: `src/controllers/[resource].controller.js`
  - Methods: list, create, getById, update, delete
  - Refs: REQ-1.x, REQ-2.x, REQ-3.x, REQ-4.x

- [ ] **Task 2.2**: Add permission checks
  - Verify: req.hasPermission() for each endpoint
  - Refs: Design - Security

### Phase 3: Routes Layer
- [ ] **Task 3.1**: Create route file
  - File: `src/routes/[resource].routes.js`
  - Refs: Design - API Endpoints

- [ ] **Task 3.2**: Register routes in server.js
  - File: `src/server.js` or `src/routes/index.js`
  - Refs: Design - Architecture

### Phase 4: Integration
- [ ] **Task 4.1**: Add activity logging
  - Use: QueueService.logActivity() or QueueService.logBillingActivity()
  - Refs: REQ-1.4

- [ ] **Task 4.2**: Manual API testing
  - Test: All CRUD operations via Postman/curl
  - Verify: Multi-tenant isolation works

---

## Progress Tracking

| Phase | Status | Completed |
|-------|--------|-----------|
| Phase 1: Data Layer | ⏳ Not Started | |
| Phase 2: Controller | ⏳ Not Started | |
| Phase 3: Routes | ⏳ Not Started | |
| Phase 4: Integration | ⏳ Not Started | |

**Current Task:** _Task 1.1_
**Started:** _[Date]_
**Baseline Commit:** _[hash]_
```

---

## 🔙 ROLLBACK STRATEGY

### Per-Task Commits
**Each task = One atomic commit** for easy rollback.

```bash
# After each task completion:
git add src/[modified-files]
git commit -m "feat(resource): Task X.Y - [description]"
```

### If Something Breaks

#### Option 1: Revert Last Task
```bash
git log --oneline -5  # Find the bad commit
git revert <commit-hash>  # Create a revert commit
```

#### Option 2: Reset to Baseline
```bash
git reset --hard <baseline-commit>  # Nuclear option - loses all changes
```

#### Option 3: Selective File Restore
```bash
git checkout <baseline-commit> -- src/path/to/broken/file.js
```

### Recovery Checklist
If rollback needed:
1. [ ] Note the error message
2. [ ] Identify which task caused the issue
3. [ ] Check if it's a simple fix vs rollback
4. [ ] If rollback: revert the specific commit
5. [ ] Run verification: `node --check [file]`
6. [ ] Update tasks.md with learnings

### Files Changed Tracking
Add to each task in tasks.md:
```markdown
- [x] **Task 2.1**: Create controller
  - Files: `src/controllers/x.controller.js` (NEW)
  - Commit: `abc1234`
  - Rollback: `git revert abc1234`
```

---

## 🔄 EXECUTION WORKFLOW

### Step 1: Create tasks.md
Based on the design document, create a tasks.md file with specific, atomic tasks.

### Step 2: Execute ONE Task
```
1. Mark task as "🔄 In Progress"
2. Write the code
3. Verify it follows project patterns (CLAUDE.md, SECURITY_RULES.md)
4. Mark task as "✅ Complete"
5. STOP and show user what was done
```

### Step 3: Wait for User
**After each task:**
- Show the user what was implemented
- Ask: "Task X complete. Ready for the next task?"
- Only proceed when user confirms

### Step 4: Repeat Until Done
Continue executing one task at a time until all are complete.

---

## 📝 KIRO PRINCIPLE: Single-Task Execution

**CRITICAL: Execute ONE task, then STOP.**

```
❌ WRONG: Complete all tasks in one go
✅ RIGHT: Complete one task, wait for user, then continue
```

This ensures:
- User can review each change
- Errors caught early
- Easy to course-correct
- No overwhelming PRs

---

## 💡 EXAMPLE: Invoice API Tasks (Backend)

```markdown
# Invoice API - Implementation Tasks

## Overview
Implementation plan for the Invoice API based on approved design.

**Requirements:** requirements.md
**Design:** design.md

---

## Task List

### Phase 1: Data Layer

- [x] **Task 1.1**: Create Invoice Mongoose model
  - File: `src/models/invoice.model.js`
  - Schema fields: firmId, lawyerId, invoiceNumber, clientId, caseId, items[], subtotal, taxRate, taxAmount, total, status, dates, notes, audit fields
  - Pre-save hooks: auto-calculate amounts, auto-generate invoiceNumber
  - Indexes: { firmId: 1, status: 1 }, { lawyerId: 1, createdAt: -1 }
  - Refs: REQ-1.1, REQ-3.4

- [ ] **Task 1.2**: Export Invoice model
  - File: `src/models/index.js`
  - Add: `Invoice: require('./invoice.model')`

### Phase 2: Controller Layer

- [ ] **Task 2.1**: Create invoice.controller.js - List invoices
  - File: `src/controllers/invoice.controller.js`
  - Method: `listInvoices(req, res)`
  - Features: pagination, status filter, search, populate client
  - Security: ...req.firmQuery, escapeRegex for search
  - Refs: REQ-2.1, REQ-2.2, REQ-2.3, REQ-2.4

- [ ] **Task 2.2**: Create invoice - createInvoice()
  - Method: `createInvoice(req, res)`
  - Features: validate client exists, pickAllowedFields, req.addFirmId
  - Activity: QueueService.logBillingActivity()
  - Refs: REQ-1.1, REQ-1.2, REQ-1.3, REQ-1.4, REQ-1.5

- [ ] **Task 2.3**: Get invoice by ID - getInvoiceById()
  - Method: `getInvoiceById(req, res)`
  - Security: sanitizeObjectId, findOne with ...req.firmQuery
  - Refs: Design - CRUD Pattern

- [ ] **Task 2.4**: Update invoice - updateInvoice()
  - Method: `updateInvoice(req, res)`
  - Validation: only draft invoices can be updated
  - Use .save() for pre-save hooks
  - Refs: REQ-3.1, REQ-3.2, REQ-3.3, REQ-3.4

- [ ] **Task 2.5**: Delete invoice - deleteInvoice()
  - Method: `deleteInvoice(req, res)`
  - Validation: only draft, no payments
  - Soft delete: isDeleted = true
  - Refs: REQ-4.1, REQ-4.2, REQ-4.3

- [ ] **Task 2.6**: Add permission checks to all methods
  - List/Get: req.hasPermission('billing', 'view')
  - Create/Update: req.hasPermission('billing', 'edit')
  - Delete: req.hasPermission('billing', 'full')
  - Refs: Design - API Endpoints table

### Phase 3: Routes Layer

- [ ] **Task 3.1**: Create invoice.routes.js
  - File: `src/routes/invoice.routes.js`
  - Routes: GET /, POST /, GET /:id, PATCH /:id, DELETE /:id
  - NO middleware (handled by authenticatedApi globally)
  - Refs: Design - API Endpoints

- [ ] **Task 3.2**: Register invoice routes
  - File: `src/routes/index.js` or `src/server.js`
  - Add: `app.use('/api/v1/invoices', invoiceRoutes)`
  - Refs: Design - Architecture

### Phase 4: Integration & Verification

- [ ] **Task 4.1**: Verify multi-tenant isolation
  - Test: Create invoices with different firmIds
  - Test: Query should only return tenant's data
  - Test: Cannot access other tenant's invoices (404, not 403)

- [ ] **Task 4.2**: Verify activity logging
  - Test: Create invoice, check BillingActivity collection
  - Verify: QueueService is non-blocking

- [ ] **Task 4.3**: Manual API testing
  - Test all endpoints with valid/invalid data
  - Verify error responses match spec

---

## Progress Tracking

| Phase | Status | Completed |
|-------|--------|-----------|
| Phase 1: Data Layer | ✅ Complete | 2024-01-15 |
| Phase 2: Controller | 🔄 In Progress | |
| Phase 3: Routes | ⏳ Not Started | |
| Phase 4: Integration | ⏳ Not Started | |

**Current Task:** Task 2.1
**Started:** 2024-01-15
```

---

## 🤔 WHEN ALL TASKS COMPLETE

### If all phases are done:

1. **Announce completion:**
   ```
   "All Invoice API tasks complete! The feature is ready for testing."
   ```

2. **Ask about next steps:**
   ```
   "Would you like to:
   - Add more features to this API? (e.g., PDF generation, email sending)
   - Start a new feature?
   - Run tests/verification?
   ```

3. **If user wants more features:**
   - Update requirements.md with new user stories
   - Update design.md with new components
   - Add new phases to tasks.md
   - Continue execution

---

## ✅ COMPLETION CHECKLIST

Before marking a task complete, verify:

### Syntax & Runtime
```bash
# MUST pass before committing
node --check src/[modified-file].js

# If routes changed
node --check src/routes/[route-file].js

# If contract verification exists
node scripts/verify-task-contract.js
```

### Security (from CLAUDE.md)
- [ ] Uses `...req.firmQuery` in all queries
- [ ] Uses `req.addFirmId(data)` for creates
- [ ] Uses `pickAllowedFields()` for request body
- [ ] Uses `sanitizeObjectId()` for IDs
- [ ] Uses `escapeRegex()` for search strings
- [ ] NO `findById()` - uses `findOne({ _id, ...req.firmQuery })`

### Patterns (from CLAUDE.md)
- [ ] Uses `.save()` for updates (not findOneAndUpdate) when hooks needed
- [ ] Uses QueueService for activity logging (non-blocking)
- [ ] Throws CustomException for errors
- [ ] Returns standard response shape `{ success: true, data: ... }`

### Code Quality
- [ ] Follows existing file structure
- [ ] Imports are correct
- [ ] No hardcoded values
- [ ] Proper error messages

---

## 🚨 ANTI-LAZINESS CHECK

**From CLAUDE.md: Complete the FULL task, not just an example.**

Before marking Phase complete:
```bash
# Verify all patterns are correct
grep -r "findById" src/controllers/  # Should be empty
grep -r "req.firmQuery" src/controllers/[new-file].js  # Should have matches
```

---

## 🔗 WORKFLOW SUMMARY

```
/plan → requirements.md (EARS format) → User Approval
                ↓
/implementation → design.md (technical spec) → User Approval
                ↓
/complete-phase → tasks.md → Execute ONE task → User Approval → Repeat
                ↓
         Feature Complete!
```
