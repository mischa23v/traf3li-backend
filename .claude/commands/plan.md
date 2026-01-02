Create a spec-driven requirements document using EARS format. This is Phase 1 of the Kiro-style workflow.

**EARS = Easy Approach to Requirements Syntax**

Format: `WHEN [condition/event] THE SYSTEM SHALL [expected behavior]`

---

## 🎯 INSTRUCTIONS

1. **Read the user's feature request** and understand the scope
2. **Create a `requirements.md`** file in the project root (or `.specs/{feature-name}/requirements.md` for feature-specific specs)
3. **Use EARS format** for all acceptance criteria - this makes requirements testable and unambiguous
4. **DO NOT proceed to design or implementation** until user approves the requirements

---

## 📋 REQUIREMENTS.MD TEMPLATE

```markdown
# [Feature Name] - Requirements

## Overview
_One paragraph describing what this API/feature does and why it matters._

## User Stories

### 1. [Primary User Story Title]
As a [user type], I want to [action] so that [benefit].

**Acceptance Criteria:**
1. WHEN [trigger event] THE SYSTEM SHALL [expected behavior]
2. WHEN [condition] THE SYSTEM SHALL [expected behavior]
3. WHEN [error condition] THE SYSTEM SHALL [error handling behavior]

### 2. [Secondary User Story Title]
As a [user type], I want to [action] so that [benefit].

**Acceptance Criteria:**
1. WHEN [trigger event] THE SYSTEM SHALL [expected behavior]
2. WHEN [condition] THE SYSTEM SHALL [expected behavior]

---

## API Requirements

### Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/resource | List resources |
| POST | /api/v1/resource | Create resource |
| GET | /api/v1/resource/:id | Get single resource |
| PATCH | /api/v1/resource/:id | Update resource |
| DELETE | /api/v1/resource/:id | Delete resource |

### Request/Response Contracts
_Define expected request bodies and response shapes._

---

## Non-Functional Requirements

### Security
- WHEN request lacks valid JWT THE SYSTEM SHALL return 401 Unauthorized
- WHEN user lacks permission THE SYSTEM SHALL return 403 Forbidden
- WHEN accessing other tenant's data THE SYSTEM SHALL return 404 Not Found (IDOR protection)
- THE SYSTEM SHALL use `...req.firmQuery` for all database queries (multi-tenant isolation)

### Performance
- WHEN handling requests THE SYSTEM SHALL respond within 500ms (p95)
- WHEN logging activities THE SYSTEM SHALL use QueueService (non-blocking)

### Validation
- WHEN ObjectId is invalid THE SYSTEM SHALL return 400 with clear message
- WHEN required fields are missing THE SYSTEM SHALL return 400 with field-specific errors

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

---

## 💡 EXAMPLE: Invoice API Feature (Backend)

```markdown
# Invoice API - Requirements

## Overview
RESTful API for creating, managing, and tracking invoices in the legal practice management system. Supports multi-tenant isolation via firmId/lawyerId.

## User Stories

### 1. Create Invoice
As a lawyer, I want to create invoices for my clients so that I can bill for my services.

**Acceptance Criteria:**
1. WHEN POST /api/v1/invoices is called with valid data THE SYSTEM SHALL create invoice with auto-generated invoiceNumber
2. WHEN client does not exist THE SYSTEM SHALL return 404 with "Client not found"
3. WHEN required fields (clientId, items, dueDate) are missing THE SYSTEM SHALL return 400 with validation errors
4. WHEN invoice is created THE SYSTEM SHALL log activity via QueueService.logBillingActivity() (non-blocking)
5. WHEN invoice is created THE SYSTEM SHALL set firmId/lawyerId from req.addFirmId()

### 2. List Invoices
As a lawyer, I want to view all my invoices so that I can track billing status.

**Acceptance Criteria:**
1. WHEN GET /api/v1/invoices is called THE SYSTEM SHALL return only invoices matching req.firmQuery
2. WHEN status filter is provided THE SYSTEM SHALL filter by invoice status (draft, sent, paid, overdue)
3. WHEN pagination params provided THE SYSTEM SHALL return paginated results with metadata
4. WHEN no invoices exist THE SYSTEM SHALL return empty array with 200 status

### 3. Update Invoice
As a lawyer, I want to update draft invoices so that I can correct errors before sending.

**Acceptance Criteria:**
1. WHEN PATCH /api/v1/invoices/:id is called THE SYSTEM SHALL update only allowed fields via pickAllowedFields()
2. WHEN invoice is not 'draft' status THE SYSTEM SHALL return 400 "Cannot modify sent/paid invoice"
3. WHEN invoice belongs to different tenant THE SYSTEM SHALL return 404 (IDOR protection)
4. WHEN updating amounts THE SYSTEM SHALL use .save() to trigger pre-save hooks for recalculation

### 4. Delete Invoice
As a lawyer, I want to delete draft invoices so that I can remove mistakes.

**Acceptance Criteria:**
1. WHEN DELETE /api/v1/invoices/:id is called on draft invoice THE SYSTEM SHALL soft-delete the record
2. WHEN invoice is not 'draft' THE SYSTEM SHALL return 400 "Cannot delete sent/paid invoice"
3. WHEN invoice has payments THE SYSTEM SHALL return 400 "Cannot delete invoice with payments"

---

## API Requirements

### Endpoints
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | /api/v1/invoices | List invoices | billing:view |
| POST | /api/v1/invoices | Create invoice | billing:edit |
| GET | /api/v1/invoices/:id | Get invoice | billing:view |
| PATCH | /api/v1/invoices/:id | Update invoice | billing:edit |
| DELETE | /api/v1/invoices/:id | Delete invoice | billing:full |
| POST | /api/v1/invoices/:id/send | Send to client | billing:edit |

### Request Body (POST/PATCH)
```json
{
  "clientId": "ObjectId",
  "caseId": "ObjectId (optional)",
  "items": [
    { "description": "string", "quantity": "number", "rate": "number" }
  ],
  "dueDate": "ISO 8601 date",
  "notes": "string (optional)"
}
```

### Response Shape
```json
{
  "success": true,
  "data": {
    "_id": "ObjectId",
    "invoiceNumber": "INV-2024-0001",
    "client": { "_id": "...", "name": "..." },
    "items": [...],
    "subtotal": 1000,
    "tax": 150,
    "total": 1150,
    "status": "draft",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

## Non-Functional Requirements

### Security
- WHEN storing invoice THE SYSTEM SHALL enforce firmId/lawyerId via globalFirmIsolation plugin
- WHEN querying invoices THE SYSTEM SHALL always include ...req.firmQuery
- THE SYSTEM SHALL validate all ObjectIds via sanitizeObjectId()
- THE SYSTEM SHALL use pickAllowedFields() to prevent mass assignment

### Performance
- WHEN creating invoice THE SYSTEM SHALL respond within 500ms
- WHEN listing invoices THE SYSTEM SHALL support cursor-based pagination for large datasets
- THE SYSTEM SHALL use QueueService for all activity logging (non-blocking)

---

## Out of Scope (Future Phases)
- PDF generation (Phase 2)
- Payment gateway integration (Phase 3)
- Recurring invoices (Future)
- Multi-currency support (Future)

---

## Open Questions
1. Should invoice numbers be sequential per-firm or globally unique?
2. What tax calculation rules apply (fixed rate vs. configurable)?
3. Should we support partial payments?
```

---

## ✅ APPROVAL CHECKPOINT

**After creating requirements.md:**

1. Present the requirements to the user
2. Ask: "Do these requirements capture what you need? Any changes or additions?"
3. **DO NOT proceed to `/implementation` until user explicitly approves**

---

## 🔗 NEXT STEP

Once requirements are approved, run `/implementation` to create the design document.
