# Security Audit Command

Perform a comprehensive security audit of the codebase against Gold Standard patterns.

---

## Audit Categories

### 1. Tenant Isolation (Critical)

```bash
# Check for isolation violations
grep -rn "firmId\}" src/controllers/ src/services/
grep -rn "findById" src/controllers/
grep -rn "if.*firmId" src/controllers/
```

| Pattern | Expected | Violation |
|---------|----------|-----------|
| Query filters | `...req.firmQuery` | Direct `firmId` |
| User lookups | `User.findById(id)` | `User.findOne({ firmId })` |
| Record creation | `req.addFirmId(data)` | `{ firmId: req.firmId }` |

---

### 2. IDOR Protection (Critical)

```bash
# Check for findById usage (should be findOne with firmQuery)
grep -rn "\.findById\(" src/controllers/

# Check for proper ID sanitization
grep -rn "req\.params\." src/controllers/ | grep -v "sanitizeObjectId"
```

| Pattern | Expected | Violation |
|---------|----------|-----------|
| Single record | `findOne({ _id, ...req.firmQuery })` | `findById(id)` |
| ID params | `sanitizeObjectId(id)` | Direct `req.params.id` |

---

### 3. Mass Assignment Protection (High)

```bash
# Check for direct req.body usage
grep -rn "req\.body\." src/controllers/ | grep -v "pickAllowedFields"
grep -rn "\.create(req\.body" src/controllers/
grep -rn "Object\.assign.*req\.body" src/controllers/
```

| Pattern | Expected | Violation |
|---------|----------|-----------|
| Request body | `pickAllowedFields(body, ALLOWED)` | Direct `req.body` |
| Create | `Model.create(safeData)` | `Model.create(req.body)` |

---

### 4. Injection Prevention (High)

```bash
# Check for regex without escaping
grep -rn "new RegExp" src/controllers/ | grep -v "escapeRegex"
grep -rn "\$regex" src/controllers/ | grep -v "escapeRegex"
```

| Pattern | Expected | Violation |
|---------|----------|-----------|
| Search/filter | `new RegExp(escapeRegex(q))` | `new RegExp(q)` |
| MongoDB regex | `{ $regex: escapeRegex(q) }` | `{ $regex: q }` |

---

### 5. Activity Logging (Medium)

```bash
# Check for blocking activity logging
grep -rn "await.*logActivity" src/controllers/
grep -rn "await.*logBillingActivity" src/controllers/
grep -rn "await.*logTeamActivity" src/controllers/
grep -rn "await QueueService" src/controllers/
```

| Pattern | Expected | Violation |
|---------|----------|-----------|
| Queue logging | `QueueService.log*()` (no await) | `await QueueService.log*()` |
| Direct model | Use QueueService | `await Model.logActivity()` |

---

### 6. OAuth Security (Critical if applicable)

```bash
# Check OAuth state handling
grep -rn "state.*base64" src/services/
grep -rn "Buffer.from.*state" src/services/
grep -rn "timingSafeEqual" src/services/
```

| Pattern | Expected | Violation |
|---------|----------|-----------|
| State creation | HMAC-SHA256 signed | Base64 encoded |
| State verify | `crypto.timingSafeEqual()` | `===` comparison |
| Scope check | Validate before operation | No validation |

---

### 7. External API Calls (Medium)

```bash
# Check for direct external calls
grep -rn "axios\." src/controllers/ src/services/ | grep -v "wrapExternalCall"
grep -rn "fetch\(" src/controllers/ src/services/ | grep -v "wrapExternalCall"
```

| Pattern | Expected | Violation |
|---------|----------|-----------|
| External calls | `wrapExternalCall(fn, 'service')` | Direct axios/fetch |
| Retry logic | Exponential backoff | No retry |

---

### 8. Pre-save Hooks (Medium)

```bash
# Check for findOneAndUpdate on models with calculated fields
grep -rn "findOneAndUpdate" src/controllers/ | grep -E "(Appointment|Invoice|Payment)"
```

| Pattern | Expected | Violation |
|---------|----------|-----------|
| Updates with calcs | `.save()` | `findOneAndUpdate()` |

---

## Audit Report Template

```markdown
# Security Audit Report

**Date:** YYYY-MM-DD
**Auditor:** Claude
**Scope:** Full codebase

## Executive Summary

| Category | Status | Issues Found |
|----------|--------|--------------|
| Tenant Isolation | ✅/❌ | X |
| IDOR Protection | ✅/❌ | X |
| Mass Assignment | ✅/❌ | X |
| Injection Prevention | ✅/❌ | X |
| Activity Logging | ✅/❌ | X |
| OAuth Security | ✅/❌ | X |
| External API | ✅/❌ | X |
| Pre-save Hooks | ✅/❌ | X |

**Total Issues:** X Critical, Y High, Z Medium

---

## Detailed Findings

### Critical Issues

| # | Category | File:Line | Description | Fix |
|---|----------|-----------|-------------|-----|
| 1 | Isolation | task.controller.js:156 | Uses firmId directly | Use ...req.firmQuery |

### High Issues

| # | Category | File:Line | Description | Fix |
|---|----------|-----------|-------------|-----|

### Medium Issues

| # | Category | File:Line | Description | Fix |
|---|----------|-----------|-------------|-----|

---

## Recommendations

1. **Immediate:** Fix all Critical and High issues
2. **Short-term:** Fix Medium issues
3. **Ongoing:** Add pre-commit hooks to prevent regressions

---

## Verification Commands

After fixes, these should return NO results:

```bash
# Isolation violations
grep -rn "firmId\}" src/controllers/ | grep -v "req.firmQuery" | grep -v "//"

# IDOR violations (excluding User model)
grep -rn "\.findById\(" src/controllers/ | grep -v "User.findById"

# Mass assignment violations
grep -rn "\.create(req\.body" src/controllers/
```
```

---

## Severity Definitions

| Level | Description | SLA |
|-------|-------------|-----|
| Critical | Data breach possible, tenant isolation broken | Fix immediately |
| High | Security vulnerability, OWASP Top 10 | Fix within 24h |
| Medium | Best practice violation, minor risk | Fix within 1 week |
| Low | Code quality, potential future risk | Fix when convenient |

---

## After Audit

1. Fix all Critical issues immediately
2. Create GitHub issues for High/Medium items if not fixing now
3. Update CLAUDE.md if new patterns discovered
4. Consider adding automated checks (ESLint rules, pre-commit hooks)
