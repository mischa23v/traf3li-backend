# Firm Isolation Rules - MANDATORY READING

## CRITICAL: Read This Before Writing ANY Query

This document defines the ONLY correct way to handle multi-tenancy in this codebase.

## The Three-Layer System

| Layer | Responsibility | Centralized? |
|-------|---------------|--------------|
| **Middleware** | Sets `req.firmQuery`, `req.hasPermission()`, `req.addFirmId()` | ✅ YES |
| **Controller** | Uses `...req.firmQuery` in every query | ❌ NO (per-query) |
| **Mongoose Plugin** | Throws `FIRM_ISOLATION_VIOLATION` if query lacks tenant filter | ✅ YES (safety net) |

## What Middleware Sets Automatically

The `authenticatedApi.middleware.js` sets these on EVERY request:

```javascript
// For firm members:
req.firmQuery = { firmId: user.firmId };
req.firmId = user.firmId;

// For solo lawyers:
req.firmQuery = { lawyerId: userId };
req.firmId = null;  // Solo lawyers don't have firmId!

// Always available:
req.addFirmId(data)      // Adds firmId/lawyerId to data for creates
req.hasPermission(module, level)  // Permission checker
```

## Controller Pattern - THE ONLY CORRECT WAY

### READ Operations
```javascript
// CORRECT - Always spread req.firmQuery
const item = await Model.findOne({ _id: id, ...req.firmQuery });
const items = await Model.find({ ...req.firmQuery, status: 'active' });

// WRONG - Never use findById alone
const item = await Model.findById(id);  // NO! Missing tenant filter

// WRONG - Never check firmId manually
if (!req.firmId) {
    throw CustomException('Firm ID required', 403);  // NO! Solo lawyers don't have firmId
}
```

### CREATE Operations
```javascript
// CORRECT - Use req.addFirmId()
const newItem = await Model.create(req.addFirmId({
    name: data.name,
    createdBy: req.userID
}));

// WRONG - Manually setting firmId
const newItem = await Model.create({
    name: data.name,
    firmId: req.firmId  // NO! Breaks for solo lawyers
});
```

### UPDATE Operations
```javascript
// CORRECT
await Model.findOneAndUpdate(
    { _id: id, ...req.firmQuery },
    { $set: allowedUpdates }
);

// WRONG
await Model.findByIdAndUpdate(id, { $set: allowedUpdates });
```

### DELETE Operations
```javascript
// CORRECT
await Model.findOneAndDelete({ _id: id, ...req.firmQuery });

// WRONG
await Model.findByIdAndDelete(id);
```

## DO NOT Add These Checks - They're Already Handled

```javascript
// DON'T DO THIS - Middleware already handles it
if (!hasTenantContext(req)) {
    throw CustomException('...', 403);
}

// DON'T DO THIS - The Mongoose plugin catches missing filters
if (!req.firmQuery) {
    throw CustomException('...', 403);
}

// DON'T DO THIS - Solo lawyers won't have firmId
if (!req.firmId) {
    throw CustomException('Firm ID required', 403);
}
```

## Service Layer Pattern

When calling services, pass `req.firmQuery` not `req.firmId`:

```javascript
// CORRECT - Pass the full query object
const result = await SomeService.getData(resourceId, req.firmQuery);

// In the service:
async getData(resourceId, firmQuery) {
    return Model.findOne({ _id: resourceId, ...firmQuery });
}

// WRONG - Passing firmId breaks for solo lawyers
const result = await SomeService.getData(resourceId, req.firmId);
```

## Model Static Methods

When models have static methods that query data, they MUST accept firmQuery:

```javascript
// CORRECT - Model method accepts and uses firmQuery
static async getStats(userId, firmQuery = {}) {
    return this.aggregate([
        { $match: { ...firmQuery, createdBy: userId } }
    ]);
}

// Called from controller:
const stats = await Model.getStats(req.userID, req.firmQuery);

// WRONG - Ignores tenant context
static async getStats(userId) {
    return this.aggregate([
        { $match: { createdBy: userId } }  // Missing firmQuery!
    ]);
}
```

## Aggregation Pipelines

For aggregations, convert to ObjectId:

```javascript
const mongoose = require('mongoose');

// Build match filter from req.firmQuery
const matchFilter = {};
if (req.firmQuery.firmId) {
    matchFilter.firmId = new mongoose.Types.ObjectId(req.firmQuery.firmId);
} else if (req.firmQuery.lawyerId) {
    matchFilter.lawyerId = new mongoose.Types.ObjectId(req.firmQuery.lawyerId);
}

const results = await Model.aggregate([
    { $match: matchFilter },
    // ... rest of pipeline
]);
```

## FIRM_ISOLATION_VIOLATION Error

If you see this error, it means a query is missing tenant filters:

```
Error: FIRM_ISOLATION_VIOLATION - Query must include firmId or lawyerId
```

**To fix:**
1. Find the query that triggered it
2. Add `...req.firmQuery` to the query
3. For model static methods, pass `req.firmQuery` as a parameter

## Quick Reference

| Need to... | Use this pattern |
|------------|------------------|
| Read one | `Model.findOne({ _id, ...req.firmQuery })` |
| Read many | `Model.find({ ...req.firmQuery, ...filters })` |
| Create | `Model.create(req.addFirmId(data))` |
| Update | `Model.findOneAndUpdate({ _id, ...req.firmQuery }, update)` |
| Delete | `Model.findOneAndDelete({ _id, ...req.firmQuery })` |
| Service call | `service.method(id, req.firmQuery)` |
| Aggregation | Build filter from `req.firmQuery` with ObjectId conversion |

## Summary

1. **NEVER** check `if (!req.firmId)` - solo lawyers don't have firmId
2. **ALWAYS** use `...req.firmQuery` in queries
3. **ALWAYS** use `req.addFirmId()` for creates
4. **NEVER** add redundant validation - the plugin catches issues
5. **PASS** `req.firmQuery` to services, not `req.firmId`
