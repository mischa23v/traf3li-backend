Create a spec-driven requirements document using EARS format. This is Phase 1 of the Kiro-style workflow.

**EARS = Easy Approach to Requirements Syntax**

Format: `WHEN [condition/event] THE SYSTEM SHALL [expected behavior]`

---

## 📏 SCALE ASSESSMENT (Do This First)

Before deep planning, determine the scope to avoid over-engineering simple tasks:

| Scale | Criteria | Process |
|-------|----------|---------|
| **Quick Fix** | Bug fix, typo, < 3 files, < 30 min | Minimal spec → quick approval → implement |
| **Standard** | Feature, 3-10 files, < 1 day | Full requirements → design → implement |
| **Complex** | Major feature, 10+ files, multi-day | Full spec + risk analysis + phased delivery |

### Quick Fix Template (Use for bug fixes, small changes)
```markdown
# Quick Fix: {Title}

## Problem
{One sentence describing the bug/issue}

## Solution
{One sentence describing the fix}

## Files to Change
- [ ] `src/controllers/x.controller.js` - {what changes}
- [ ] `src/routes/x.route.js` - {what changes}

## Verification
- [ ] `node --check` passes
- [ ] Original issue fixed
- [ ] No regressions introduced

**Approve? (yes/no)**
```

### Standard/Complex: Continue with full spec below ↓

---

## 🏆 GOLD STANDARD COMPLIANCE (MANDATORY)

**Every plan MUST meet enterprise standards from AWS, Google, Microsoft, Apple, SAP, Netflix.**

Before creating any requirements, verify the plan addresses ALL applicable categories:

### Security Checklist (AWS/Google/Microsoft)
| Pattern | Requirement | When Applicable |
|---------|-------------|-----------------|
| Multi-tenant isolation | Use `req.firmQuery` in ALL queries | Always |
| IDOR protection | Use `findOne({ _id, ...req.firmQuery })` never `findById()` | Always |
| Mass assignment | Use `pickAllowedFields()` for ALL request bodies | Always |
| ObjectId validation | Use `sanitizeObjectId()` for ALL ID parameters | Always |
| Regex injection | Use `escapeRegex()` for ALL search/filter strings | Search features |
| OAuth state | HMAC-SHA256 signed state with timing-safe verify | OAuth integrations |
| Scope validation | Validate permissions BEFORE operations | External APIs |
| Data redaction | Sanitize sensitive data (SSN, CC) in exports | Export features |
| Permission checks | Use `req.hasPermission()` for restricted ops | Role-based features |

### ⛔ Critical Anti-Patterns (NEVER DO)
| Anti-Pattern | Why It Breaks | Correct Pattern |
|--------------|---------------|-----------------|
| `{ _id: id, firmId }` | Solo lawyers have firmId=null | `{ _id: id, ...req.firmQuery }` |
| `if (firmId) query.firmId = firmId` | Skips solo lawyers entirely | Always spread `...req.firmQuery` |
| `{ firmId: req.firmId }` in create | Missing lawyerId for solo lawyers | Use `req.addFirmId(data)` |
| `User.findOne({ _id, firmId })` | Users are global, not tenant-scoped | Use `User.findById(id)` |

**Run `/fix-isolation` after implementation to verify no violations.**

### Reliability Checklist (AWS/Netflix/Calendly)
| Pattern | Requirement | When Applicable |
|---------|-------------|-----------------|
| Non-blocking logging | Use `QueueService.log*()` - never await | Activity logging |
| Retry with backoff | Use `wrapExternalCall()` with service config | External API calls |
| Proactive refresh | Refresh tokens 5min BEFORE expiry | Token-based auth |
| Background jobs | Schedule token refresh 24h ahead | OAuth integrations |
| Circuit breaker | Fail fast after N consecutive failures | External services |
| Graceful degradation | Core operation succeeds if sync fails | Calendar/email sync |

### Data Integrity Checklist (SAP/Salesforce)
| Pattern | Requirement | When Applicable |
|---------|-------------|-----------------|
| Pre-save hooks | Use `.save()` for calculated fields | Updates with derived values |
| Audit trail | Log changes via QueueService | Data modifications |
| Conflict detection | Check ALL relationships (organizer, attendees, creator) | Scheduling features |
| Calculated fields | endTime, totals, etc. via model hooks | Derived values |

### Compliance Checklist (Apple/Google/RFC)
| Pattern | Requirement | When Applicable |
|---------|-------------|-----------------|
| RFC 5545 ICS | Include CREATED, LAST-MODIFIED, TRANSP, CLASS | Calendar exports |
| ISO 8601 | Use ISO format for ALL dates in API | Always |
| API contracts | Return `{ success, data/message }` shape | Always |
| Error format | Return `{ success: false, message }` for errors | Always |

---

## 🎯 INSTRUCTIONS

1. **Read the user's feature request** and understand the scope
2. **Review Gold Standard checklists above** - identify which patterns apply
3. **Create a `requirements.md`** file in `.specs/{feature-name}/requirements.md`
4. **Include Gold Standard section** with applicable patterns
5. **Use EARS format** for all acceptance criteria
6. **DO NOT proceed to design or implementation** until user approves

---

## 📋 REQUIREMENTS.MD TEMPLATE

```markdown
# [Feature Name] - Requirements

## Overview
_One paragraph describing what this API/feature does and why it matters._

---

## 🧠 Reasoning (Thinking Out Loud)

### What I Searched
_Document what was explored before making decisions:_
- Searched `src/controllers/*` → Found X existing controllers
- Searched `existing-pattern` → Found usage in Y files
- Checked `src/models/` → Model already exists / needs creation

### Decisions Made
| Decision | Why | Alternatives Considered |
|----------|-----|------------------------|
| Extend existing controller | Keeps related logic together | New controller (rejected: fragmentation) |
| Use existing service | Pattern already established | Inline logic (rejected: no reuse) |
| Add to existing model | Fields are related | New model (rejected: over-normalization) |

### What Could Break
| File | Risk | Likelihood | Mitigation |
|------|------|------------|------------|
| `existing.controller.js` | Adding new function | Low | Function is additive |
| `existing.route.js` | Adding new route | Low | Check for path conflicts |
| `Model.js` | Schema change | Medium | Test existing queries still work |

---

## Gold Standard Compliance

### Applicable Patterns
| Category | Pattern | How It Applies |
|----------|---------|----------------|
| Security | Multi-tenant isolation | All queries use `...req.firmQuery` |
| Security | IDOR protection | Use `findOne({ _id, ...req.firmQuery })` |
| Security | Mass assignment | `pickAllowedFields(ALLOWED_FIELDS.X, req.body)` |
| Reliability | Non-blocking logging | `QueueService.logActivity()` for all actions |
| Data Integrity | Pre-save hooks | Use `.save()` for updates with calculated fields |

### Not Applicable (with justification)
| Pattern | Why N/A |
|---------|---------|
| OAuth state | No external OAuth in this feature |
| RFC 5545 | No calendar export functionality |

---

## User Stories

### 1. [Primary User Story Title]
As a [user type], I want to [action] so that [benefit].

**Acceptance Criteria:**
1. WHEN [trigger event] THE SYSTEM SHALL [expected behavior]
2. WHEN [condition] THE SYSTEM SHALL [expected behavior]
3. WHEN [error condition] THE SYSTEM SHALL [error handling behavior]

**Gold Standard Requirements:**
- THE SYSTEM SHALL use `...req.firmQuery` in the database query
- THE SYSTEM SHALL validate IDs via `sanitizeObjectId()`
- THE SYSTEM SHALL log activity via `QueueService` (non-blocking)

### 2. [Secondary User Story Title]
As a [user type], I want to [action] so that [benefit].

**Acceptance Criteria:**
1. WHEN [trigger event] THE SYSTEM SHALL [expected behavior]
2. WHEN [condition] THE SYSTEM SHALL [expected behavior]

---

## API Requirements

### Endpoints
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | /api/v1/resource | List resources | module:view |
| POST | /api/v1/resource | Create resource | module:edit |
| GET | /api/v1/resource/:id | Get single resource | module:view |
| PATCH | /api/v1/resource/:id | Update resource | module:edit |
| DELETE | /api/v1/resource/:id | Delete resource | module:full |

### Request/Response Contracts

**Request Body Fields (allowlist - mass assignment protection):**
```javascript
const ALLOWED_FIELDS = {
    CREATE: ['field1', 'field2', 'field3'],
    UPDATE: ['field1', 'field2']
};
```

**Response Shape:**
```json
{
    "success": true,
    "message": "Resource created",
    "data": { ... }
}
```

**Error Shape:**
```json
{
    "success": false,
    "message": "Validation error: field1 is required"
}
```

---

## Non-Functional Requirements

### Security (Gold Standard)
- WHEN request lacks valid JWT THE SYSTEM SHALL return 401 Unauthorized
- WHEN user lacks permission THE SYSTEM SHALL return 403 Forbidden
- WHEN accessing other tenant's data THE SYSTEM SHALL return 404 Not Found (IDOR protection)
- THE SYSTEM SHALL use `...req.firmQuery` for ALL database queries
- THE SYSTEM SHALL use `req.addFirmId(data)` when creating records
- THE SYSTEM SHALL use `pickAllowedFields()` for ALL request body processing
- THE SYSTEM SHALL use `sanitizeObjectId()` for ALL ID parameters
- THE SYSTEM SHALL NEVER use `findById()` - always `findOne({ _id, ...req.firmQuery })`

### Reliability (Gold Standard)
- WHEN logging activities THE SYSTEM SHALL use QueueService (non-blocking, fire-and-forget)
- WHEN calling external APIs THE SYSTEM SHALL use retry with exponential backoff
- WHEN external service fails THE SYSTEM SHALL NOT fail the primary operation
- THE SYSTEM SHALL respond within 500ms (p95) for standard operations

### Data Integrity (Gold Standard)
- WHEN updating records with calculated fields THE SYSTEM SHALL use `.save()` (triggers pre-save hooks)
- WHEN modifying data THE SYSTEM SHALL log audit trail via QueueService

### Validation
- WHEN ObjectId format is invalid THE SYSTEM SHALL return 400 with clear message
- WHEN required fields are missing THE SYSTEM SHALL return 400 with field-specific errors
- THE SYSTEM SHALL validate enum values against defined constants (e.g., VALID_STATUSES)

---

## External Integrations (if applicable)

### OAuth Integrations (Gold Standard)
- THE SYSTEM SHALL sign OAuth state with HMAC-SHA256
- THE SYSTEM SHALL verify state with timing-safe comparison
- THE SYSTEM SHALL validate scopes BEFORE performing operations
- THE SYSTEM SHALL proactively refresh tokens 5 minutes before expiry
- THE SYSTEM SHALL have background job to refresh tokens 24 hours ahead

### Calendar Sync (Gold Standard)
- THE SYSTEM SHALL sync to calendar in non-blocking manner
- WHEN calendar sync fails THE SYSTEM SHALL log warning but complete primary operation
- THE SYSTEM SHALL generate RFC 5545 compliant ICS with CREATED, LAST-MODIFIED, TRANSP, CLASS
- THE SYSTEM SHALL sanitize sensitive data (SSN, CC patterns) before export

### External API Calls (Gold Standard)
- THE SYSTEM SHALL use `wrapExternalCall()` with appropriate service config
- THE SYSTEM SHALL retry with exponential backoff (configurable per service)
- THE SYSTEM SHALL implement circuit breaker for repeated failures

---

## Out of Scope
_List what this feature explicitly does NOT include (for future phases)._

- Feature A (Phase 2)
- Feature B (Future consideration)

---

## Open Questions
_List any ambiguities that need user clarification before proceeding._

1. [Question about requirement X]
2. [Question about edge case Y]

---

## Verification Plan

After implementation, verify:
- [ ] `node --check` passes on all modified files
- [ ] **Run `/fix-isolation`** - confirms no tenant isolation violations
- [ ] All queries include `...req.firmQuery`
- [ ] No `findById()` usage (use `findOne({ _id, ...req.firmQuery })`)
- [ ] All request bodies use `pickAllowedFields()`
- [ ] All IDs validated with `sanitizeObjectId()`
- [ ] Activity logging uses QueueService (non-blocking)
- [ ] External calls use retry with backoff
- [ ] API contract matches expected response shape
- [ ] **Run `/security-audit`** for full Gold Standard compliance check
```

---

## 📝 EARS SYNTAX VARIATIONS

### Basic Event Trigger
```
WHEN POST /api/clients is called THE SYSTEM SHALL create a new client record
```

### Conditional Requirement
```
IF user has 'cases:edit' permission THEN THE SYSTEM SHALL allow case updates
```

### Combined Event + Condition
```
WHEN creating invoice AND client has outstanding balance THE SYSTEM SHALL add warning flag
```

### Negative/Exception Handling
```
WHEN external API call fails THE SYSTEM SHALL retry with exponential backoff (max 3 attempts)
```

### State-Based
```
WHILE file upload is in progress THE SYSTEM SHALL track upload status in Redis
```

### Gold Standard Specific
```
THE SYSTEM SHALL use `...req.firmQuery` in ALL database queries (multi-tenant isolation)
THE SYSTEM SHALL NEVER use `findById()` - always `findOne({ _id, ...req.firmQuery })`
THE SYSTEM SHALL log activity via QueueService (non-blocking, fire-and-forget)
```

---

## 💡 EXAMPLE: Payment Integration (Gold Standard Backend)

```markdown
# Payment Gateway Integration - Requirements

## Overview
Integrate Stripe payment gateway for invoice payments. Supports webhooks for async payment status updates. Multi-tenant isolated.

---

## Gold Standard Compliance

### Applicable Patterns
| Category | Pattern | How It Applies |
|----------|---------|----------------|
| Security | Multi-tenant isolation | All queries use `...req.firmQuery` |
| Security | IDOR protection | Payment records validated against tenant |
| Security | Webhook verification | HMAC signature validation |
| Reliability | Retry with backoff | Stripe API calls via `wrapExternalCall('payment')` |
| Reliability | Non-blocking logging | `QueueService.logBillingActivity()` |
| Reliability | Idempotency | Use idempotency keys for payment creation |
| Data Integrity | Audit trail | Log all payment state changes |

### Not Applicable
| Pattern | Why N/A |
|---------|---------|
| OAuth state | Using API keys, not OAuth |
| RFC 5545 | No calendar functionality |
| Pre-save hooks | No calculated fields in payment model |

---

## User Stories

### 1. Process Invoice Payment
As a client, I want to pay my invoice online so that I can settle my account quickly.

**Acceptance Criteria:**
1. WHEN POST /api/v1/invoices/:id/pay is called THE SYSTEM SHALL create Stripe PaymentIntent
2. WHEN payment succeeds THE SYSTEM SHALL update invoice status to 'paid'
3. WHEN payment fails THE SYSTEM SHALL return error without changing invoice status
4. WHEN invoice already paid THE SYSTEM SHALL return 400 "Invoice already paid"
5. WHEN invoice belongs to different tenant THE SYSTEM SHALL return 404 (IDOR)

**Gold Standard Requirements:**
- THE SYSTEM SHALL use `wrapExternalCall('payment')` for Stripe API calls
- THE SYSTEM SHALL use idempotency key to prevent duplicate charges
- THE SYSTEM SHALL log payment attempt via `QueueService.logBillingActivity()` (non-blocking)
- THE SYSTEM SHALL NOT fail if activity logging fails

### 2. Handle Payment Webhook
As the system, I want to receive Stripe webhooks so that I can update payment status asynchronously.

**Acceptance Criteria:**
1. WHEN webhook received THE SYSTEM SHALL verify HMAC signature (timing-safe)
2. WHEN signature invalid THE SYSTEM SHALL return 401 and log security event
3. WHEN payment.succeeded event THE SYSTEM SHALL update invoice and create Payment record
4. WHEN payment.failed event THE SYSTEM SHALL log failure and notify user
5. WHEN duplicate webhook received THE SYSTEM SHALL return 200 (idempotent)

**Gold Standard Requirements:**
- THE SYSTEM SHALL use `crypto.timingSafeEqual()` for signature comparison
- THE SYSTEM SHALL process webhook idempotently (check eventId)
- THE SYSTEM SHALL respond to webhook within 5 seconds (async processing)

---

## API Requirements

### Endpoints
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/invoices/:id/pay | Initiate payment | JWT |
| POST | /api/v1/webhooks/stripe | Receive webhook | Signature |
| GET | /api/v1/payments | List payments | JWT + billing:view |
| GET | /api/v1/payments/:id | Get payment detail | JWT + billing:view |

### Request Body Fields
```javascript
const ALLOWED_FIELDS = {
    PAY: ['paymentMethodId', 'saveCard'],
    // Webhook body is validated by signature, not allowlist
};
```

---

## Non-Functional Requirements

### Security (Gold Standard)
- THE SYSTEM SHALL verify Stripe webhook signatures with timing-safe comparison
- THE SYSTEM SHALL store Stripe secret keys in environment variables only
- THE SYSTEM SHALL NEVER log full card numbers or CVV
- THE SYSTEM SHALL use `...req.firmQuery` for all payment queries

### Reliability (Gold Standard)
- WHEN Stripe API fails THE SYSTEM SHALL retry with exponential backoff (max 2 attempts)
- THE SYSTEM SHALL use idempotency keys for all payment creation
- THE SYSTEM SHALL process webhooks idempotently (dedupe by eventId)
- THE SYSTEM SHALL respond to webhooks within 5 seconds

### Compliance
- THE SYSTEM SHALL comply with PCI-DSS (no card data stored)
- THE SYSTEM SHALL maintain audit log of all payment events

---

## Verification Plan

- [ ] `node --check` passes
- [ ] Stripe signature verification uses `timingSafeEqual()`
- [ ] All Stripe calls use `wrapExternalCall('payment')`
- [ ] Idempotency keys used for PaymentIntent creation
- [ ] Webhook processing is idempotent (eventId check)
- [ ] No card numbers in logs
- [ ] All queries include `...req.firmQuery`
```

---

## 🔒 ANTI-PATTERNS TO FLAG IN REQUIREMENTS

When reviewing requirements, explicitly call out these anti-patterns:

| Anti-Pattern | Gold Standard Fix |
|--------------|-------------------|
| `Model.findById(id)` | `Model.findOne({ _id: id, ...req.firmQuery })` |
| `await QueueService.log*()` | `QueueService.log*()` (no await, fire-and-forget) |
| Direct `req.body` usage | `pickAllowedFields(ALLOWED_FIELDS.X, req.body)` |
| String ID comparison | `sanitizeObjectId(id)` first |
| `await externalApi.call()` | `await wrapExternalCall(() => api.call(), 'service')` |
| `findOneAndUpdate` for calcs | `.save()` to trigger pre-save hooks |
| Plain base64 OAuth state | HMAC-SHA256 signed state |
| Sync calendar then respond | Non-blocking sync, respond immediately |

---

## ✅ APPROVAL CHECKPOINT

**After creating requirements.md:**

1. Present the requirements to the user
2. Highlight the Gold Standard patterns being applied
3. Ask: "Do these requirements meet your needs? I've included [X] Gold Standard patterns for [security/reliability/compliance]."
4. **DO NOT proceed to `/implementation` until user explicitly approves**

---

## 🔗 NEXT STEP

Once requirements are approved, run `/implementation` to create the design document.
