# Security Development Guidelines

**Based on patterns from Stripe, AWS, Google, Salesforce, and other enterprise companies.**

> Give these instructions to any developer or AI assistant before writing code.

---

## Table of Contents
1. [Multi-Tenancy & IDOR Prevention](#1-multi-tenancy--idor-prevention)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Input Validation](#3-input-validation)
4. [Database Query Security](#4-database-query-security)
5. [Response Sanitization](#5-response-sanitization)
6. [Regex & ReDoS Prevention](#6-regex--redos-prevention)
7. [Error Handling](#7-error-handling)
8. [File Templates](#8-file-templates)

---

## 1. Multi-Tenancy & IDOR Prevention

### NEVER use `findById()` - ALWAYS use `findOne()` with ownership check

```javascript
// ❌ NEVER DO THIS - IDOR VULNERABILITY
const item = await Model.findById(id);
if (item.firmId !== req.firmId) throw new Error('Forbidden');

// ✅ ALWAYS DO THIS - Query-level protection
const item = await Model.findOne({
    _id: id,
    ...req.firmQuery  // or explicitly: firmId: req.firmId
});
if (!item) throw CustomException('Not found', 404);
```

### All CRUD Operations Must Include Firm Isolation

```javascript
// ✅ CREATE - Include firmId from request context
const newItem = new Model({
    ...allowedFields,
    firmId: req.firmId,
    lawyerId: req.userID,
    createdBy: req.userID
});

// ✅ READ - Always include firmQuery
const item = await Model.findOne({ _id: id, ...req.firmQuery });

// ✅ UPDATE - Include firmQuery in the query, not just the update
await Model.findOneAndUpdate(
    { _id: id, ...req.firmQuery },  // Query includes ownership
    { $set: updateData },
    { new: true }
);

// ✅ DELETE - Include firmQuery
await Model.findOneAndDelete({ _id: id, ...req.firmQuery });

// ✅ LIST - Always scope to firm
const items = await Model.find({ ...req.firmQuery, ...filters });
```

### Services Must Accept firmId as Parameter

```javascript
// ✅ Service methods receive firmId explicitly
async function getInvoice(invoiceId, firmId) {
    return Invoice.findOne({ _id: invoiceId, firmId });
}

async function updateInvoice(invoiceId, firmId, data) {
    return Invoice.findOneAndUpdate(
        { _id: invoiceId, firmId },
        { $set: data },
        { new: true }
    );
}
```

---

## 2. Authentication & Authorization

### Route Protection Pattern (Like Stripe/AWS)

```javascript
// ✅ Global auth middleware with explicit whitelist
const PUBLIC_ROUTES = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/webhooks/stripe',
    '/api/webhooks/twilio',
    '/api/health'
];

app.use((req, res, next) => {
    if (PUBLIC_ROUTES.some(route => req.path.startsWith(route))) {
        return next();
    }
    return authMiddleware(req, res, next);
});
```

### Permission Middleware Pattern

```javascript
// ✅ Centralized permission checking
const checkPermission = (requiredPermission) => {
    return async (req, res, next) => {
        const userPermissions = await getUserPermissions(req.userID, req.firmId);

        if (!userPermissions.includes(requiredPermission)) {
            return res.status(403).json({
                error: true,
                message: 'Insufficient permissions'
            });
        }
        next();
    };
};

// Usage in routes
router.delete('/invoices/:id',
    authMiddleware,
    checkPermission('invoice:delete'),
    invoiceController.delete
);
```

### Admin Operations - Explicit Role Check

```javascript
// ✅ Admin operations MUST verify admin role
const adminOnly = async (req, res, next) => {
    const user = await User.findById(req.userID).select('role');
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: true, message: 'Admin access required' });
    }
    next();
};
```

---

## 3. Input Validation

### Always Validate and Sanitize IDs

```javascript
const { sanitizeObjectId } = require('../utils/securityUtils');

// ✅ Sanitize all IDs from user input
const sanitizedId = sanitizeObjectId(req.params.id);
const sanitizedClientId = sanitizeObjectId(req.body.clientId);
```

### Use Allowlist for Mass Assignment Protection

```javascript
const { pickAllowedFields } = require('../utils/securityUtils');

// ✅ Only allow specific fields - NEVER spread req.body directly
const allowedFields = pickAllowedFields(req.body, [
    'name',
    'email',
    'phone',
    'address'
]);

// ❌ NEVER DO THIS - Mass assignment vulnerability
const user = new User({ ...req.body, firmId: req.firmId });

// ✅ ALWAYS DO THIS
const user = new User({
    ...allowedFields,
    firmId: req.firmId,
    createdBy: req.userID
});
```

### Validate Input Types and Lengths

```javascript
// ✅ Validate before processing
if (!content || typeof content !== 'string') {
    throw CustomException('Content is required', 400);
}

if (content.length > 10000) {
    throw CustomException('Content too long (max 10000 chars)', 400);
}

if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    throw CustomException('Invalid email format', 400);
}
```

---

## 4. Database Query Security

### Prevent NoSQL Injection

```javascript
// ❌ VULNERABLE - User input directly in query
const users = await User.find({ role: req.query.role });

// ✅ SAFE - Validate against allowlist
const VALID_ROLES = ['user', 'admin', 'lawyer'];
const role = VALID_ROLES.includes(req.query.role) ? req.query.role : 'user';
const users = await User.find({ role, ...req.firmQuery });
```

### Use Parameterized Queries for Aggregations

```javascript
// ✅ Safe aggregation with sanitized inputs
const pipeline = [
    { $match: {
        firmId: new mongoose.Types.ObjectId(req.firmId),
        status: { $in: ['active', 'pending'] }  // Hardcoded allowlist
    }},
    { $group: { _id: '$category', total: { $sum: '$amount' } }}
];
```

---

## 5. Response Sanitization

### Never Expose Sensitive Fields

```javascript
// ✅ Use .select() to exclude sensitive fields
const user = await User.findOne({ _id: userId, ...req.firmQuery })
    .select('-password -resetToken -mfaSecret -apiKeys');

// ✅ Or use a response serializer
const safeUser = serializeUser(user);

function serializeUser(user) {
    const { password, resetToken, mfaSecret, apiKeys, ...safe } = user.toObject();
    return safe;
}
```

### Create Response DTOs (Data Transfer Objects)

```javascript
// ✅ Define what fields are safe to return
const UserResponseDTO = {
    _id: true,
    email: true,
    firstName: true,
    lastName: true,
    role: true,
    createdAt: true
    // password, tokens, secrets are NOT listed = NOT returned
};

function toDTO(doc, dto) {
    const obj = doc.toObject ? doc.toObject() : doc;
    return Object.keys(dto).reduce((acc, key) => {
        if (obj[key] !== undefined) acc[key] = obj[key];
        return acc;
    }, {});
}
```

---

## 6. Regex & ReDoS Prevention

### ALWAYS Escape User Input in Regex

```javascript
// ✅ Add this helper to every file that uses regex
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ❌ VULNERABLE - ReDoS attack possible
const results = await Model.find({
    name: { $regex: userInput, $options: 'i' }
});

// ✅ SAFE - Escaped input
const results = await Model.find({
    name: { $regex: escapeRegex(userInput), $options: 'i' }
});

// ❌ VULNERABLE
const regex = new RegExp(userInput, 'i');

// ✅ SAFE
const regex = new RegExp(escapeRegex(userInput), 'i');
```

---

## 7. Error Handling

### Don't Leak Internal Details

```javascript
// ❌ VULNERABLE - Leaks internal info
catch (error) {
    return res.status(500).json({
        error: true,
        message: error.message,
        stack: error.stack  // NEVER expose stack traces
    });
}

// ✅ SAFE - Generic error response
catch (error) {
    console.error('Invoice creation failed:', error);  // Log internally

    // Return generic message to client
    const status = error.status || 500;
    const message = error.status ? error.message : 'An error occurred';

    return res.status(status).json({
        error: true,
        message
    });
}
```

### Use Custom Exceptions with Safe Messages

```javascript
// ✅ Custom exception pattern
const CustomException = (message, status = 500) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

// Usage
if (!invoice) {
    throw CustomException('Invoice not found', 404);  // Safe to return
}

if (invoice.firmId.toString() !== req.firmId) {
    throw CustomException('Invoice not found', 404);  // Return 404, not 403
    // Don't reveal that the invoice exists but belongs to another firm
}
```

---

## 8. File Templates

### Controller Template

```javascript
/**
 * [Resource] Controller
 * Security: All operations enforce multi-tenant isolation via firmQuery
 */

const { Model } = require('../models');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Create a new [resource]
 * @route POST /api/[resources]
 */
const create = async (req, res) => {
    try {
        // 1. Validate required fields
        const { name, description } = req.body;
        if (!name || typeof name !== 'string') {
            throw CustomException('Name is required', 400);
        }

        // 2. Sanitize IDs from body if any
        const sanitizedClientId = req.body.clientId
            ? sanitizeObjectId(req.body.clientId)
            : null;

        // 3. Mass assignment protection
        const allowedFields = pickAllowedFields(req.body, ['name', 'description']);

        // 4. Create with firm context
        const item = new Model({
            ...allowedFields,
            clientId: sanitizedClientId,
            firmId: req.firmId,
            lawyerId: req.userID,
            createdBy: req.userID
        });

        await item.save();

        // 5. Fetch with population for response
        const populated = await Model.findOne({
            _id: item._id,
            ...req.firmQuery
        }).populate('clientId', 'name email');

        return res.status(201).json({
            error: false,
            message: 'Created successfully',
            data: populated
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Get single [resource] by ID
 * @route GET /api/[resources]/:id
 */
const getById = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        // IDOR Protection: Query includes firmQuery
        const item = await Model.findOne({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!item) {
            throw CustomException('Not found', 404);
        }

        return res.json({ error: false, data: item });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Update [resource]
 * @route PUT /api/[resources]/:id
 */
const update = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        // Mass assignment protection
        const allowedFields = pickAllowedFields(req.body, ['name', 'description', 'status']);

        // IDOR Protection: Query-level ownership check
        const item = await Model.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            {
                $set: {
                    ...allowedFields,
                    updatedBy: req.userID,
                    updatedAt: new Date()
                }
            },
            { new: true }
        );

        if (!item) {
            throw CustomException('Not found', 404);
        }

        return res.json({
            error: false,
            message: 'Updated successfully',
            data: item
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * Delete [resource]
 * @route DELETE /api/[resources]/:id
 */
const remove = async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.id);

        // IDOR Protection: Query-level ownership check
        const item = await Model.findOneAndDelete({
            _id: sanitizedId,
            ...req.firmQuery
        });

        if (!item) {
            throw CustomException('Not found', 404);
        }

        return res.json({
            error: false,
            message: 'Deleted successfully'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

/**
 * List [resources] with search/filter
 * @route GET /api/[resources]
 */
const list = async (req, res) => {
    try {
        const { search, status, page = 1, limit = 20 } = req.query;

        // Build query with firm isolation
        const query = { ...req.firmQuery };

        // Safe search with escaped regex
        if (search) {
            query.name = { $regex: escapeRegex(search), $options: 'i' };
        }

        // Validate status against allowlist
        const VALID_STATUSES = ['active', 'inactive', 'pending'];
        if (status && VALID_STATUSES.includes(status)) {
            query.status = status;
        }

        const items = await Model.find(query)
            .skip((page - 1) * limit)
            .limit(Math.min(limit, 100))  // Cap at 100
            .sort({ createdAt: -1 });

        const total = await Model.countDocuments(query);

        return res.json({
            error: false,
            data: items,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ error: true, message });
    }
};

module.exports = { create, getById, update, remove, list };
```

### Service Template

```javascript
/**
 * [Resource] Service
 * Security: All methods require firmId parameter for multi-tenant isolation
 */

const { Model, RelatedModel } = require('../models');
const mongoose = require('mongoose');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class ResourceService {
    /**
     * Get resource by ID
     * @param {string} resourceId - Resource ID
     * @param {string} firmId - Firm ID for isolation (REQUIRED)
     */
    async getById(resourceId, firmId) {
        if (!firmId) throw new Error('firmId is required');

        return Model.findOne({
            _id: resourceId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });
    }

    /**
     * Update resource
     * @param {string} resourceId - Resource ID
     * @param {string} firmId - Firm ID for isolation (REQUIRED)
     * @param {object} data - Update data
     */
    async update(resourceId, firmId, data) {
        if (!firmId) throw new Error('firmId is required');

        return Model.findOneAndUpdate(
            {
                _id: resourceId,
                firmId: new mongoose.Types.ObjectId(firmId)
            },
            { $set: data },
            { new: true }
        );
    }

    /**
     * Delete resource
     * @param {string} resourceId - Resource ID
     * @param {string} firmId - Firm ID for isolation (REQUIRED)
     */
    async delete(resourceId, firmId) {
        if (!firmId) throw new Error('firmId is required');

        return Model.findOneAndDelete({
            _id: resourceId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });
    }

    /**
     * Search resources
     * @param {string} firmId - Firm ID for isolation (REQUIRED)
     * @param {object} filters - Search filters
     */
    async search(firmId, filters = {}) {
        if (!firmId) throw new Error('firmId is required');

        const query = { firmId: new mongoose.Types.ObjectId(firmId) };

        if (filters.search) {
            query.name = { $regex: escapeRegex(filters.search), $options: 'i' };
        }

        return Model.find(query).lean();
    }
}

module.exports = new ResourceService();
```

### Model Template

```javascript
/**
 * [Resource] Model
 * Security: Includes firmId for multi-tenant isolation
 */

const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema({
    // Multi-tenancy fields (REQUIRED)
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true  // Index for query performance
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Resource fields
    name: {
        type: String,
        required: true,
        maxlength: 200,
        trim: true
    },
    description: {
        type: String,
        maxlength: 5000
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'pending'],
        default: 'active'
    },

    // Audit fields
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Sensitive fields - NEVER return by default
    internalNotes: {
        type: String,
        select: false  // Won't be included in queries by default
    },
    apiKey: {
        type: String,
        select: false
    }
}, {
    timestamps: true,
    toJSON: {
        transform: (doc, ret) => {
            // Remove sensitive fields from JSON output
            delete ret.__v;
            delete ret.internalNotes;
            delete ret.apiKey;
            return ret;
        }
    }
});

// Compound index for common queries
ResourceSchema.index({ firmId: 1, status: 1 });
ResourceSchema.index({ firmId: 1, createdAt: -1 });

// Apply global firm isolation plugin
ResourceSchema.plugin(require('../plugins/globalFirmIsolation.plugin'));

module.exports = mongoose.model('Resource', ResourceSchema);
```

---

## Quick Checklist for Code Review

### Before Approving Any PR, Verify:

- [ ] **No `findById()` without ownership check** - Use `findOne({ _id, firmId })`
- [ ] **No `findByIdAndUpdate/Delete()`** - Use `findOneAndUpdate/Delete({ _id, firmId })`
- [ ] **No direct `req.body` spreading** - Use `pickAllowedFields()`
- [ ] **All IDs sanitized** - Use `sanitizeObjectId()`
- [ ] **All regex escaped** - Use `escapeRegex()` for user input
- [ ] **No sensitive data in responses** - Use `.select('-password')` or DTOs
- [ ] **Error messages are generic** - No stack traces or internal details
- [ ] **Routes have auth middleware** - Unless explicitly public
- [ ] **Services require firmId parameter** - For multi-tenant isolation

---

## Summary: The 10 Commandments

1. **NEVER use `findById()`** - Always `findOne({ _id, firmId })`
2. **NEVER spread `req.body`** - Always use allowlists
3. **NEVER trust user input** - Sanitize and validate everything
4. **NEVER expose errors** - Return generic messages
5. **NEVER skip auth** - Whitelist public routes explicitly
6. **ALWAYS include firmId** - In every query
7. **ALWAYS escape regex** - Use `escapeRegex()` helper
8. **ALWAYS validate types** - Check strings, numbers, arrays
9. **ALWAYS limit results** - Paginate with max limits
10. **ALWAYS audit sensitive ops** - Log who did what when

---

*Last updated: 2025-12-27*
*Based on security patterns from Stripe, AWS, Google, Salesforce*
