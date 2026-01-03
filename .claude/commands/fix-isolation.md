# Fix Tenant Isolation Violations

Scan and fix all tenant isolation violations in the codebase.

## What This Command Does

1. **Scan** all controllers and services for isolation anti-patterns
2. **Report** violations with file:line references
3. **Fix** all violations using the gold standard patterns
4. **Verify** no violations remain

---

## Anti-Pattern Detection

Search for these WRONG patterns and replace with CORRECT ones:

| Anti-Pattern (WRONG) | Gold Standard (CORRECT) |
|---------------------|------------------------|
| `{ _id: id, firmId }` | `{ _id: id, ...req.firmQuery }` |
| `if (firmId) query.firmId = firmId` | `{ ...req.firmQuery }` (always spread) |
| `Model.findById(id)` | `Model.findOne({ _id: id, ...req.firmQuery })` |
| `User.findOne({ _id, firmId })` | `User.findById(id)` (user lookups by ID are safe) |
| `firmId: req.firmId` in create | `req.addFirmId(data)` |

---

## Why This Matters

Solo lawyers have `firmId = null`. When code does:
```javascript
const task = await Task.findOne({ _id: id, firmId });  // firmId is null for solo lawyers
```

The query becomes `{ _id: id, firmId: null }` which:
- Returns nothing (tasks don't have `firmId: null`, they have `lawyerId: X`)
- Breaks the entire feature for solo lawyers
- Is a **critical security/functionality bug**

The middleware sets `req.firmQuery` correctly for both user types:
- Firm members: `{ firmId: ObjectId("...") }`
- Solo lawyers: `{ lawyerId: ObjectId("...") }`

---

## Step-by-Step Process

### Step 1: Search for Violations

```bash
# Find direct firmId usage in queries (potential violations)
grep -rn "firmId\}" src/controllers/ src/services/

# Find findById usage (always wrong for tenant-scoped models)
grep -rn "findById" src/controllers/ --include="*.js"

# Find manual firmId checks
grep -rn "if.*firmId" src/controllers/ src/services/
```

### Step 2: For Each Violation

1. Read the file to understand context
2. Determine if it's a genuine violation:
   - Task, Case, Client, Appointment queries → MUST use `req.firmQuery`
   - User lookups by ID → Safe to use `findById()`
   - Creating records → Use `req.addFirmId(data)`
3. Apply the fix
4. Remove unused `const firmId = req.firmId` declarations

### Step 3: Verify No Violations Remain

```bash
# These should return NO results after fixes:
grep -rn "firmId\}" src/controllers/ | grep -v "req.firmQuery" | grep -v "// firmId"
```

---

## Files to Check (Priority Order)

1. `src/controllers/*.controller.js` - All controller files
2. `src/services/*.service.js` - All service files that take firmId
3. `src/models/*.js` - Static methods that query with firmId

---

## Example Fix

**Before (WRONG):**
```javascript
const createFromTemplate = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    // Validate assignedTo
    const assignedUser = await User.findOne({ _id: assignedTo, firmId });

    // Create task
    const taskData = {
        title,
        firmId,  // Direct assignment
        createdBy: userId
    };

    const task = await Task.create(taskData);
});
```

**After (CORRECT):**
```javascript
const createFromTemplate = asyncHandler(async (req, res) => {
    const userId = req.userID;

    // User lookup by ID is safe (no firmId needed)
    const assignedUser = await User.findById(assignedTo);

    // Use req.addFirmId for proper tenant isolation
    const taskData = req.addFirmId({
        title,
        createdBy: userId
    });

    const task = await Task.create(taskData);
});
```

---

## Report Format

After scanning, report in this format:

```markdown
## Tenant Isolation Audit Report

### Violations Found: X

| File | Line | Issue | Severity |
|------|------|-------|----------|
| task.controller.js | 156 | Uses `{ firmId }` instead of `...req.firmQuery` | Critical |
| task.service.js | 45 | `hasCircularDependency` takes `firmId` not `firmQuery` | Critical |

### Fixed: X violations
### Remaining: 0 violations

### Verification
- [ ] `grep -rn "firmId\}" src/controllers/` shows no violations
- [ ] All task operations work for solo lawyers
- [ ] All task operations work for firm members
```

---

## Completion Checklist

- [ ] All controllers scanned
- [ ] All services scanned
- [ ] All violations fixed
- [ ] Unused `firmId` declarations removed
- [ ] Verification grep shows clean results
- [ ] Changes committed
