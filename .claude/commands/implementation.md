Create a technical design document based on approved requirements. This is Phase 2 of the Kiro-style workflow.

**Prerequisites:** User MUST have approved `requirements.md` from `/plan` command first.

---

## 🎯 INSTRUCTIONS

1. **Read the approved `requirements.md`** file
2. **Create a `design.md`** file in the same location as requirements.md
3. **Define technical architecture** - models, controllers, services, routes
4. **Map requirements to implementation** - each EARS requirement should trace to code
5. **DO NOT proceed to coding** until user approves the design

---

## 📋 DESIGN.MD TEMPLATE

```markdown
# [Feature Name] - Design Document

## Overview
_Technical approach for implementing the requirements._

**Requirements Document:** [Link to requirements.md]

---

## Architecture

### File Structure
```
src/
├── models/
│   └── [resource].model.js          # Mongoose schema
├── controllers/
│   └── [resource].controller.js     # Request handlers
├── services/
│   └── [resource].service.js        # Business logic (if complex)
├── routes/
│   └── [resource].routes.js         # Express routes
└── validators/
    └── [resource].validator.js      # Joi/express-validator schemas
```

### Data Flow
```
Request → Route → Controller → Service (optional) → Model → Database
                      ↓
              QueueService (non-blocking logging)
```

---

## Data Model

### [Resource] Schema
```javascript
const resourceSchema = new mongoose.Schema({
    // Tenant isolation (REQUIRED)
    firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', index: true },
    lawyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    // Core fields
    field1: { type: String, required: true },
    field2: { type: Number, default: 0 },

    // Relationships
    relatedModel: { type: mongoose.Schema.Types.ObjectId, ref: 'RelatedModel' },

    // Audit fields
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Soft delete
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date }
}, {
    timestamps: true
});

// Indexes for query performance
resourceSchema.index({ firmId: 1, status: 1 });
resourceSchema.index({ lawyerId: 1, createdAt: -1 });
```

### Relationships
_Describe how this model relates to existing models._

| Relationship | Type | Model | Description |
|--------------|------|-------|-------------|
| belongsTo | N:1 | Client | Each resource belongs to a client |
| hasMany | 1:N | Activity | Resource has activity log entries |

---

## API Endpoints

### Endpoint Details

#### GET /api/v1/[resources]
**Description:** List resources with filtering and pagination

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 20, max: 100) |
| status | string | No | Filter by status |
| search | string | No | Search in name/description |

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

#### POST /api/v1/[resources]
**Description:** Create new resource

**Request Body:**
```json
{
  "field1": "value",
  "field2": 100
}
```

**Allowed Fields:** field1, field2, relatedModelId

**Controller Pattern:**
```javascript
const safeData = pickAllowedFields(req.body, ALLOWED_FIELDS);
const resource = await Resource.create(req.addFirmId({
    ...safeData,
    createdBy: req.userID
}));
```

---

## Controller Implementation

### Required Imports
```javascript
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const QueueService = require('../services/queue.service');
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
```

### CRUD Pattern
```javascript
// CREATE
async function create(req, res) {
    const safeData = pickAllowedFields(req.body, ALLOWED_FIELDS);
    const resource = await Resource.create(req.addFirmId({
        ...safeData,
        createdBy: req.userID
    }));

    // Non-blocking activity log
    QueueService.logActivity({
        activityType: 'resource_created',
        userId: req.userID,
        firmId: req.firmId,
        relatedModel: 'Resource',
        relatedId: resource._id
    });

    return res.status(201).json({ success: true, data: resource });
}

// READ (single)
async function getById(req, res) {
    const id = sanitizeObjectId(req.params.id);
    const resource = await Resource.findOne({ _id: id, ...req.firmQuery });
    if (!resource) throw CustomException('Resource not found', 404);
    return res.json({ success: true, data: resource });
}

// UPDATE
async function update(req, res) {
    const id = sanitizeObjectId(req.params.id);
    const resource = await Resource.findOne({ _id: id, ...req.firmQuery });
    if (!resource) throw CustomException('Resource not found', 404);

    const safeData = pickAllowedFields(req.body, ALLOWED_UPDATE_FIELDS);
    Object.assign(resource, safeData);
    resource.updatedBy = req.userID;
    await resource.save(); // Triggers pre-save hooks

    return res.json({ success: true, data: resource });
}

// DELETE
async function remove(req, res) {
    const id = sanitizeObjectId(req.params.id);
    const resource = await Resource.findOneAndUpdate(
        { _id: id, ...req.firmQuery },
        { isDeleted: true, deletedAt: new Date() }
    );
    if (!resource) throw CustomException('Resource not found', 404);
    return res.json({ success: true, message: 'Resource deleted' });
}
```

---

## Service Layer (if needed)

_Only create service layer for complex business logic._

### When to Use Services
- Complex calculations or transformations
- External API integrations
- Operations spanning multiple models
- Reusable business logic

### Service Pattern
```javascript
class ResourceService {
    async calculateTotal(resourceId, firmQuery) {
        const resource = await Resource.findOne({ _id: resourceId, ...firmQuery });
        if (!resource) throw CustomException('Resource not found', 404);

        // Complex business logic here
        return result;
    }
}
```

---

## Error Handling

### Standard Error Responses
| Code | Scenario | Response |
|------|----------|----------|
| 400 | Validation error | `{ success: false, message: "Field X is required" }` |
| 401 | No/invalid JWT | `{ success: false, message: "Unauthorized" }` |
| 403 | No permission | `{ success: false, message: "Permission denied" }` |
| 404 | Not found / IDOR | `{ success: false, message: "Resource not found" }` |
| 500 | Server error | `{ success: false, message: "Internal server error" }` |

---

## Security Considerations

### Multi-Tenant Isolation
- [ ] All queries include `...req.firmQuery`
- [ ] Create operations use `req.addFirmId(data)`
- [ ] No `findById()` - always `findOne({ _id, ...req.firmQuery })`

### Input Validation
- [ ] All ObjectIds validated via `sanitizeObjectId()`
- [ ] Request body filtered via `pickAllowedFields()`
- [ ] Search strings escaped via `escapeRegex()`

### Permission Checks
- [ ] Endpoint permissions defined in routes
- [ ] Controller checks `req.hasPermission()` where needed

---

## Testing Strategy

### Unit Tests
- Model validation
- Service business logic

### Integration Tests
- API endpoint responses
- Multi-tenant isolation verification
- Permission enforcement

---

## Requirement Traceability

| Requirement | Implementation |
|-------------|----------------|
| REQ-1: Create resource | POST /api/v1/resources → create() |
| REQ-2: List resources | GET /api/v1/resources → list() |
| REQ-3: Tenant isolation | ...req.firmQuery in all queries |
```

---

## 💡 EXAMPLE: Invoice API Design (Backend)

```markdown
# Invoice API - Design Document

## Overview
Technical design for the Invoice API implementing requirements from requirements.md.

---

## Architecture

### File Structure
```
src/
├── models/
│   └── invoice.model.js
├── controllers/
│   └── invoice.controller.js
├── services/
│   └── invoice.service.js          # For PDF generation, calculations
├── routes/
│   └── invoice.routes.js
└── validators/
    └── invoice.validator.js
```

---

## Data Model

### Invoice Schema
```javascript
const invoiceSchema = new mongoose.Schema({
    // Tenant isolation
    firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', index: true },
    lawyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    // Auto-generated
    invoiceNumber: { type: String, unique: true },

    // Relationships
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' },

    // Line items
    items: [{
        description: { type: String, required: true },
        quantity: { type: Number, required: true, min: 0 },
        rate: { type: Number, required: true, min: 0 },
        amount: { type: Number } // Calculated in pre-save
    }],

    // Calculated fields (pre-save hook)
    subtotal: { type: Number, default: 0 },
    taxRate: { type: Number, default: 15 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },

    // Status
    status: {
        type: String,
        enum: ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'],
        default: 'draft'
    },

    // Dates
    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    paidDate: { type: Date },

    // Notes
    notes: { type: String, maxlength: 2000 },

    // Audit
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

// Pre-save hook for calculations
invoiceSchema.pre('save', function(next) {
    // Calculate line item amounts
    this.items.forEach(item => {
        item.amount = item.quantity * item.rate;
    });

    // Calculate totals
    this.subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);
    this.taxAmount = this.subtotal * (this.taxRate / 100);
    this.total = this.subtotal + this.taxAmount;

    next();
});

// Auto-generate invoice number
invoiceSchema.pre('save', async function(next) {
    if (this.isNew && !this.invoiceNumber) {
        const count = await this.constructor.countDocuments({ firmId: this.firmId });
        this.invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});
```

---

## Controller Implementation

### invoice.controller.js
```javascript
const ALLOWED_CREATE_FIELDS = ['clientId', 'caseId', 'items', 'dueDate', 'notes', 'taxRate'];
const ALLOWED_UPDATE_FIELDS = ['items', 'dueDate', 'notes', 'taxRate'];

async function createInvoice(req, res) {
    // Permission check
    if (!req.hasPermission('billing', 'edit')) {
        throw CustomException('Permission denied', 403);
    }

    const safeData = pickAllowedFields(req.body, ALLOWED_CREATE_FIELDS);

    // Validate client exists and belongs to tenant
    const clientId = sanitizeObjectId(safeData.clientId);
    const client = await Client.findOne({ _id: clientId, ...req.firmQuery });
    if (!client) throw CustomException('Client not found', 404);

    // Create invoice
    const invoice = await Invoice.create(req.addFirmId({
        ...safeData,
        clientId,
        createdBy: req.userID
    }));

    // Populate for response
    await invoice.populate('clientId', 'name email');

    // Non-blocking activity log
    QueueService.logBillingActivity({
        activityType: 'invoice_created',
        userId: req.userID,
        firmId: req.firmId,
        relatedModel: 'Invoice',
        relatedId: invoice._id,
        description: `Invoice ${invoice.invoiceNumber} created for ${client.name}`
    });

    return res.status(201).json({ success: true, data: invoice });
}
```

---

## Requirement Traceability

| Requirement ID | EARS Requirement | Implementation |
|----------------|------------------|----------------|
| REQ-1.1 | WHEN POST with valid data THE SYSTEM SHALL create invoice | createInvoice() with auto-generated invoiceNumber |
| REQ-1.4 | WHEN invoice created THE SYSTEM SHALL log activity | QueueService.logBillingActivity() call |
| REQ-2.1 | WHEN GET invoices THE SYSTEM SHALL return tenant data only | list() uses ...req.firmQuery |
| REQ-3.4 | WHEN updating amounts THE SYSTEM SHALL recalculate | pre-save hook + .save() in update() |
```

---

## ✅ APPROVAL CHECKPOINT

**After creating design.md:**

1. Present the design to the user
2. Ask: "Does this technical design look correct? Any concerns about the approach?"
3. **DO NOT proceed to `/complete-phase` until user explicitly approves**

---

## 🔗 NEXT STEP

Once design is approved, run `/complete-phase` to create the implementation tasks and start coding.
