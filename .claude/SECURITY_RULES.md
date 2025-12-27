# Security Rules for AI Assistants

**READ THIS BEFORE WRITING ANY CODE**

## Mandatory Rules

### 1. Database Queries - NEVER use findById

```javascript
// ❌ FORBIDDEN
Model.findById(id)
Model.findByIdAndUpdate(id, data)
Model.findByIdAndDelete(id)

// ✅ REQUIRED - Always include firmId/firmQuery
Model.findOne({ _id: id, ...req.firmQuery })
Model.findOneAndUpdate({ _id: id, ...req.firmQuery }, data)
Model.findOneAndDelete({ _id: id, ...req.firmQuery })
```

### 2. Mass Assignment - NEVER spread req.body

```javascript
// ❌ FORBIDDEN
new Model({ ...req.body })
Model.update({}, { $set: req.body })

// ✅ REQUIRED - Use allowlist
const allowed = pickAllowedFields(req.body, ['name', 'email']);
new Model({ ...allowed, firmId: req.firmId })
```

### 3. ID Parameters - ALWAYS sanitize

```javascript
// ✅ REQUIRED for all ID params
const sanitizedId = sanitizeObjectId(req.params.id);
```

### 4. Regex Search - ALWAYS escape

```javascript
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ✅ REQUIRED for user input in regex
{ name: { $regex: escapeRegex(search), $options: 'i' } }
```

### 5. Services - ALWAYS require firmId parameter

```javascript
// ✅ REQUIRED pattern for services
async function getItem(itemId, firmId) {
    return Model.findOne({ _id: itemId, firmId });
}
```

### 6. Responses - NEVER expose sensitive fields

```javascript
// ✅ REQUIRED - Exclude sensitive data
.select('-password -resetToken -apiKey -mfaSecret')
```

### 7. Errors - NEVER expose internal details

```javascript
// ❌ FORBIDDEN
res.json({ error: error.message, stack: error.stack })

// ✅ REQUIRED - Generic message
res.json({ error: true, message: 'An error occurred' })
```

## Quick Copy-Paste Templates

### Controller Function Start
```javascript
const sanitizedId = sanitizeObjectId(req.params.id);
const item = await Model.findOne({ _id: sanitizedId, ...req.firmQuery });
if (!item) throw CustomException('Not found', 404);
```

### Service Function Start
```javascript
if (!firmId) throw new Error('firmId is required');
const item = await Model.findOne({ _id: id, firmId });
```

### Safe Search Query
```javascript
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const query = { ...req.firmQuery };
if (search) query.name = { $regex: escapeRegex(search), $options: 'i' };
```

## Imports Required
```javascript
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
```
