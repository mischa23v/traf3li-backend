# Security Fix Tracker

## Summary of All Issues Found

| Category | Count | Status |
|----------|-------|--------|
| Service Layer IDOR (findById without firmId) | 205 | PENDING |
| Routes needing security registry | 3,418 | PENDING |
| Error message disclosure | 3,000+ | PENDING |
| Hardcoded secrets | 60+ | PENDING |
| Models needing firmId index | 11 | PENDING |
| Manual firmId checks (should be middleware) | 82 | PENDING |
| Regex injection vulnerabilities | 167 | PENDING |
| Financial operations needing transactions | 20 | PENDING |
| Permission checks in controllers | 145 | PENDING |
| File upload issues | 14 | PENDING |

---

## 1. SERVICE LAYER IDOR - VULNERABLE findById CALLS

### Controllers (47 vulnerable)
- [ ] task.controller.js:579 - findByIdAndDelete
- [ ] task.controller.js:572 - findByIdAndDelete (linkedEventId)
- [ ] event.controller.js:644 - findByIdAndDelete
- [ ] timeTracking.controller.js:794 - findByIdAndDelete
- [ ] training.controller.js:631 - findByIdAndDelete
- [ ] onboarding.controller.js:406 - findByIdAndDelete
- [ ] leaveRequest.controller.js:516 - findByIdAndDelete
- [ ] bill.controller.js:248 - findByIdAndUpdate
- [ ] bill.controller.js:282 - findByIdAndDelete
- [ ] review.controller.js:147 - findByIdAndUpdate
- [ ] review.controller.js:152 - findByIdAndDelete
- [ ] jobPosition.controller.js:413,541,547,615 - findByIdAndUpdate (4 instances)
- [ ] employeeAdvance.controller.js:761 - findByIdAndDelete
- [ ] employeeLoan.controller.js:668 - findByIdAndDelete
- [ ] matterBudget.controller.js:255,495 - findByIdAndDelete (2 instances)
- [ ] offboarding.controller.js:569,1610 - findByIdAndDelete/Update (2 instances)
- [ ] payment.controller.js:679 - findByIdAndDelete
- [ ] payroll.controller.js:515 - findByIdAndDelete
- [ ] threadMessage.controller.js:582 - findByIdAndDelete
- [ ] transaction.controller.js:371 - findByIdAndDelete
- [ ] view.controller.js:476 - findByIdAndDelete
- [ ] client.controller.js:796 - findByIdAndDelete
- [ ] creditNote.controller.js:462 - findByIdAndUpdate
- [ ] debitNote.controller.js:459 - findByIdAndUpdate
- [ ] performanceReview.controller.js:487,520,1421,2167 - findByIdAndUpdate (4 instances)
- [ ] firm.controller.js:203,281,1011,1062 - findByIdAndUpdate (4 instances)
- [ ] biometric.controller.js:147,793 - findByIdAndDelete (2 instances)
- [ ] answer.controller.js:44 - findByIdAndUpdate

### Services (28 vulnerable)
- [ ] approval.service.js:144,179,215,387,675 - findByIdAndUpdate (5 instances)
- [ ] activity.service.js:133,188,239,291 - findByIdAndUpdate (4 instances)
- [ ] organizationTemplate.service.js:299 - findByIdAndUpdate

---

## 2. HARDCODED SECRETS TO REMOVE

### CRITICAL (Remove immediately)
- [ ] docs/NOTIFICATION_SYSTEM.md:29-30 - VAPID keys exposed
- [ ] docs/FRONTEND_INTEGRATION_COMPLETE.md:38-39 - VAPID keys exposed
- [ ] src/services/aiSettings.service.js:14 - Default encryption key

### HIGH (OTP salts)
- [ ] src/utils/otp.utils.js:34 - Default OTP salt
- [ ] src/models/phoneOtp.model.js:92 - Default OTP salt
- [ ] src/models/emailOtp.model.js:92 - Default OTP salt
- [ ] src/models/reauthChallenge.model.js:108 - Default OTP salt

### MEDIUM (WhatsApp token)
- [ ] src/services/whatsapp.service.js:691 - Default webhook verify token

---

## 3. MODELS NEEDING FIRMID INDEX

- [ ] src/models/assetAssignment.model.js - Add index: true to firmId
- [ ] src/models/biometricDevice.model.js - Add index: true to firmId
- [ ] src/models/biometricEnrollment.model.js - Add index: true to firmId
- [ ] src/models/biometricLog.model.js - Add index: true to firmId
- [ ] src/models/firm.model.js - Add index: true to firmId
- [ ] src/models/geofenceZone.model.js - Add index: true to firmId
- [ ] src/models/permission.model.js - Add index: true to firmId
- [ ] src/models/policyDecision.model.js - Add index: true to firmId
- [ ] src/models/relationTuple.model.js - Add index: true to firmId
- [ ] src/models/training.model.js - Add index: true to firmId
- [ ] src/models/uiAccessConfig.model.js - Add index: true to firmId

---

## 4. FINANCIAL OPERATIONS NEEDING TRANSACTIONS

### payment.controller.js
- [ ] Line 222-326: createPayment
- [ ] Line 597-641: updatePayment
- [ ] Line 679-715: deletePayment
- [ ] Line 973-1018: createRefund
- [ ] Line 1165-1200: applyPaymentToInvoices
- [ ] Line 1242-1277: unapplyPaymentFromInvoice

### invoice.controller.js
- [ ] Line 287-352: createInvoice
- [ ] Line 777-785: applyToInvoices
- [ ] Line 946-982: recordPayment
- [ ] Line 1066-1072: voidInvoice
- [ ] Line 1329-1369: convertToCreditNote
- [ ] Line 1944-1969: confirmPayment

### payment.model.js
- [ ] Line 685-733: applyToInvoices()
- [ ] Line 739-784: unapplyFromInvoice()
- [ ] Line 860-921: postToGL()
- [ ] Line 929-962: processRefund()

### invoice.model.js
- [ ] Line 720-781: postToGL()
- [ ] Line 790-880: recordPayment()
- [ ] Line 918-958: applyRetainer()

---

## 5. NOSQL/REGEX INJECTION TO FIX

### Controllers
- [ ] adminAudit.controller.js:114 - Unvalidated sort field
- [ ] corporateCard.controller.js:219 - Regex injection
- [ ] brokers.controller.js:126,450 - Unescaped regex (2 instances)
- [ ] tradingAccounts.controller.js:126,127,461,462 - Unescaped regex (4 instances)

### Services
- [ ] view.service.js:1176,1178,1180,1182 - Unescaped regex in $regex
- [ ] reportBuilder.service.js:300,303,306,309 - Unescaped regex
- [ ] automatedAction.service.js:811 - Dynamic field injection

---

## 6. MANUAL FIRMID CHECKS TO CENTRALIZE

### bankReconciliation.controller.js (21 instances)
Lines: 70, 135, 225, 283, 330, 389, 469, 542, 606, 642, 695, 733, 779, 826, 931, 986, 1019, 1052, 1446, 1478, 1522

### aiSettings.controller.js (6 instances)
Lines: 28, 62, 116, 253, 309, 338

### permission.controller.js (18 instances)
Lines: 204, 267, 462, 544, 630, 670, 721, 746, 776, 805, 855, 984, 1053, 1188, 1253, 1291, 1316

---

## 7. FILE UPLOAD ISSUES

### Missing Multer Middleware (CRITICAL)
- [ ] src/routes/expenseClaim.route.js:111
- [ ] src/routes/employeeAdvance.route.js:116
- [ ] src/routes/onboarding.route.js:87
- [ ] src/routes/leaveRequest.route.js:59
- [ ] src/routes/dealRoom.routes.js:49
- [ ] src/routes/employeeLoan.route.js:123

### Missing Malware Scanning
- [ ] src/routes/cloudStorage.routes.js:94

### Malware Scanning Disabled by Default
- [ ] src/middlewares/malwareScan.middleware.js:35

---

## Progress Tracking

**Started:** 2025-12-27
**Last Updated:** 2025-12-27

### Batches Completed
- [ ] Batch 1: Database Indexes (11 files)
- [ ] Batch 2: Hardcoded Secrets (8 files)
- [ ] Batch 3: NoSQL Injection (10 files)
- [ ] Batch 4: IDOR Controllers Part 1 (15 files)
- [ ] Batch 5: IDOR Controllers Part 2 (15 files)
- [ ] Batch 6: IDOR Controllers Part 3 (17 files)
- [ ] Batch 7: IDOR Services (10 files)
- [ ] Batch 8: Financial Transactions (4 files)
- [ ] Batch 9: File Uploads (7 files)
- [ ] Batch 10: SecurityStack Middleware (1 file)
- [ ] Batch 11: Route Security Registry (235 files)
- [ ] Batch 12: Error Message Sanitization (TBD)
