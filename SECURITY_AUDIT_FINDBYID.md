# Security Audit: findById IDOR Vulnerabilities

**Date:** 2025-12-27
**Audit Type:** Insecure Direct Object Reference (IDOR) via findById
**Total Occurrences:** 1,124 across 261 files

## Executive Summary

This audit identifies potential IDOR vulnerabilities where `Model.findById()` is used without proper multi-tenant isolation via `firmId` scoping. The codebase has 1,124 occurrences across 261 files, with an estimated 400-600 requiring immediate security fixes.

## Risk Classification

### 🔴 CRITICAL RISK (Immediate Fix Required)
Files with direct access to sensitive firm-scoped data without proper access controls.

#### Controllers (Top Priority)
| File | Count | Est. Vulnerable | Risk Level |
|------|-------|----------------|------------|
| `caseNotion.controller.js` | 42 | 25-30 | CRITICAL |
| `event.controller.js` | 26 | 12-15 | CRITICAL |
| `bankReconciliation.controller.js` | 25 | 5-8 | CRITICAL |
| `adminTools.controller.js` | 23 | 0-2 | LOW (admin ops) |
| `bill.controller.js` | 22 | 10-12 | CRITICAL |
| `payment.controller.js` | 22 | 15-18 | CRITICAL |
| `performanceReview.controller.js` | 21 | 12-15 | HIGH |
| `task.controller.js` | 20 | 8-10 | HIGH |
| `onboarding.controller.js` | 17 | 10-12 | HIGH |
| `offboarding.controller.js` | 16 | 8-10 | HIGH |
| `reminder.controller.js` | 14 | 8-10 | MEDIUM |
| `employeeAdvance.controller.js` | 12 | 6-8 | MEDIUM |

### 🟡 MEDIUM RISK (Verification Required)
Files with subsequent access checks that could be optimized.

#### Services
| File | Count | Notes |
|------|-------|-------|
| `approval.service.js` | 17 | Verify cross-firm approval access |
| `caseNotion.service.js` | 16 | Template and database access |
| `whatsapp.service.js` | 15 | Message access control |
| `dispute.service.js` | 12 | Payment dispute isolation |
| `plugin.service.js` | 12 | Plugin data scope |
| `omnichannelInbox.service.js` | 9 | Multi-channel message access |

### 🟢 LOW RISK (May Not Require Changes)
- Admin system operations (already verified admin role)
- User self-lookups (`User.findById(req.userID)`)
- Just-created records with immediate population
- System/infrastructure operations

## Vulnerability Patterns

### Pattern 1: Direct findById without firmId
```javascript
// VULNERABLE
const case = await Case.findById(caseId);

// SECURE
const case = await Case.findOne({ _id: caseId, firmId });
```

### Pattern 2: findByIdAndUpdate without firmId scope
```javascript
// VULNERABLE
await Invoice.findByIdAndUpdate(invoiceId, updates);

// SECURE
await Invoice.findOneAndUpdate({ _id: invoiceId, firmId }, updates);
```

### Pattern 3: findByIdAndDelete without firmId scope
```javascript
// VULNERABLE
await Payment.findByIdAndDelete(paymentId);

// SECURE
await Payment.findOneAndDelete({ _id: paymentId, firmId });
```

### Pattern 4: Cross-model findById without validation
```javascript
// VULNERABLE - Linked event without scope
const linkedEvent = await Event.findById(task.linkedEventId);

// SECURE
const linkedEvent = await Event.findOne({
    _id: task.linkedEventId,
    firmId: task.firmId
});
```

## Files Requiring Immediate Attention

### Controllers (78 files)
```
src/controllers/payment.controller.js - 22 occurrences
src/controllers/bill.controller.js - 22 occurrences
src/controllers/task.controller.js - 20 occurrences
src/controllers/event.controller.js - 26 occurrences
src/controllers/caseNotion.controller.js - 42 occurrences
src/controllers/performanceReview.controller.js - 21 occurrences
src/controllers/onboarding.controller.js - 17 occurrences
src/controllers/offboarding.controller.js - 16 occurrences
src/controllers/reminder.controller.js - 14 occurrences
src/controllers/employeeAdvance.controller.js - 12 occurrences
src/controllers/adminTools.controller.js - 23 occurrences
src/controllers/bankReconciliation.controller.js - 25 occurrences
src/controllers/casePipeline.controller.js - 6 occurrences
src/controllers/bankTransaction.controller.js - 6 occurrences
src/controllers/retainer.controller.js - 9 occurrences
src/controllers/billPayment.controller.js - 6 occurrences
src/controllers/expense.controller.js - 3 occurrences
src/controllers/invoiceApproval.controller.js - 3 occurrences
src/controllers/saml.controller.js - 11 occurrences
src/controllers/user.controller.js - 2 occurrences
src/controllers/sla.controller.js - 6 occurrences
src/controllers/lead.controller.js - 2 occurrences
src/controllers/oauth.controller.js - 2 occurrences
src/controllers/compensationReward.controller.js - 2 occurrences
src/controllers/accountingReports.controller.js - 2 occurrences
... and 53 more controller files
```

### Services (90+ files)
```
src/services/approval.service.js - 17 occurrences
src/services/caseNotion.service.js - 16 occurrences
src/services/whatsapp.service.js - 15 occurrences
src/services/dispute.service.js - 12 occurrences
src/services/plugin.service.js - 12 occurrences
src/services/omnichannelInbox.service.js - 9 occurrences
src/services/churnIntervention.service.js - 9 occurrences
src/services/microsoftCalendar.service.js - 9 occurrences
src/services/xero.service.js - 8 occurrences
src/services/organizationTemplate.service.js - 8 occurrences
... and 80+ more service files
```

### Models (60+ files)
Many models use findById in pre/post hooks and static methods.

## Recommended Fix Strategy

### Phase 1: Critical Controllers (Week 1)
**Priority:** Immediate
**Files:** 12-15 high-risk controller files
**Estimated effort:** 40-60 hours

Focus on:
- Payment & financial controllers
- Case & client controllers
- Invoice & billing controllers

### Phase 2: Secondary Controllers (Week 2)
**Priority:** High
**Files:** 30-40 medium-risk controller files
**Estimated effort:** 60-80 hours

### Phase 3: Service Layer (Week 3)
**Priority:** Medium-High
**Files:** 90+ service files
**Estimated effort:** 80-100 hours

### Phase 4: Models & Infrastructure (Week 4)
**Priority:** Medium
**Files:** 60+ model files, routes, middlewares
**Estimated effort:** 40-60 hours

## Testing Strategy

For each fix:
1. ✅ Unit test: Verify own-firm data accessible
2. ✅ Unit test: Verify cross-firm data blocked (404/403)
3. ✅ Integration test: Verify end-to-end scenarios
4. ✅ Regression test: Verify existing functionality intact

## Example Fixes

### Fix Template 1: Simple findById
```javascript
// BEFORE
const invoice = await Invoice.findById(invoiceId);

// AFTER
const invoice = await Invoice.findOne({
    _id: invoiceId,
    firmId: req.firmId
});
```

### Fix Template 2: findByIdAndUpdate
```javascript
// BEFORE
const updated = await Case.findByIdAndUpdate(
    caseId,
    updates,
    { new: true }
);

// AFTER
const updated = await Case.findOneAndUpdate(
    { _id: caseId, firmId: req.firmId },
    updates,
    { new: true }
);
```

### Fix Template 3: Cross-model references
```javascript
// BEFORE
if (task.linkedEventId) {
    const event = await Event.findById(task.linkedEventId);
}

// AFTER
if (task.linkedEventId) {
    const event = await Event.findOne({
        _id: task.linkedEventId,
        firmId: task.firmId
    });
}
```

## Automation Opportunities

Consider creating a codemod or script to:
1. Identify all `findById` calls
2. Analyze surrounding context for firmId availability
3. Suggest or apply automatic fixes
4. Flag complex cases for manual review

## Sign-off

**Audit Completed By:** Security Team
**Date:** 2025-12-27
**Status:** In Progress
**Next Review:** After Phase 1 completion

---

## Appendix A: Complete File List (261 files)

See separate file: `SECURITY_AUDIT_FILES_COMPLETE_LIST.md`

## Appendix B: Testing Checklist

See separate file: `SECURITY_AUDIT_TESTING_CHECKLIST.md`
