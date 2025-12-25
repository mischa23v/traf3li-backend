# Field History Tracking - Usage Guide

This guide demonstrates how to use the field-level history tracking system in your application.

## Overview

The field history tracking system provides granular change tracking at the field level, enabling:
- Automatic tracking of field changes
- Version comparison
- Field-specific timelines
- Revert functionality
- User activity tracking

## Files Created

1. **Model**: `/src/models/fieldHistory.model.js` - Mongoose schema and static methods
2. **Service**: `/src/services/fieldHistory.service.js` - Business logic for tracking changes
3. **Plugin**: `/src/plugins/fieldHistoryPlugin.js` - Mongoose plugin for automatic tracking
4. **Controller**: `/src/controllers/fieldHistory.controller.js` - API endpoints
5. **Routes**: `/src/routes/fieldHistory.routes.js` - Route definitions

## Setup

### 1. Register Routes in Main App

Add the field history routes to your main app file (e.g., `app.js` or `server.js`):

```javascript
const fieldHistoryRoutes = require('./routes/fieldHistory.routes');

// Register routes
app.use('/api/field-history', fieldHistoryRoutes);
```

### 2. Apply Plugin to Models

You can apply the field history plugin to any Mongoose model for automatic tracking:

#### Option A: Automatic Tracking (Recommended)

```javascript
// In your model file (e.g., src/models/invoice.model.js)
const mongoose = require('mongoose');
const fieldHistoryPlugin = require('../plugins/fieldHistoryPlugin');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: String,
  status: String,
  total: Number,
  dueDate: Date,
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  // ... other fields
});

// Apply plugin with custom options
invoiceSchema.plugin(fieldHistoryPlugin, {
  trackFields: ['status', 'total', 'dueDate', 'clientId'],
  excludeFields: ['internalNotes'],
  trackOnCreate: true,
  trackOnUpdate: true,
  trackOnDelete: false
});

module.exports = mongoose.model('Invoice', invoiceSchema);
```

#### Option B: Manual Tracking

```javascript
const fieldHistoryService = require('../services/fieldHistory.service');

// In your controller or service
async function updateInvoice(invoiceId, updates, userId, firmId, metadata) {
  const oldInvoice = await Invoice.findById(invoiceId).lean();

  // Apply updates
  const updatedInvoice = await Invoice.findByIdAndUpdate(
    invoiceId,
    updates,
    { new: true }
  ).lean();

  // Track changes
  await fieldHistoryService.trackChanges(
    'Invoice',
    invoiceId,
    oldInvoice,
    updatedInvoice,
    userId,
    firmId,
    metadata
  );

  return updatedInvoice;
}
```

## Usage Examples

### Using the Plugin (Automatic Tracking)

When using the plugin, you need to set the field history context before saving:

```javascript
// In your controller
const invoice = await Invoice.findById(invoiceId);

// Set context (userId, firmId, metadata)
invoice.setFieldHistoryContext(req.userID, req.firmId, {
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  sessionId: req.sessionID,
  method: req.method,
  endpoint: req.originalUrl
});

// Make changes
invoice.status = 'paid';
invoice.total = 1500;

// Save (changes will be tracked automatically)
await invoice.save();
```

### Accessing History via Instance Methods

```javascript
// Get all field history for a document
const history = await invoice.getFieldHistory();

// Get history for a specific field
const statusHistory = await invoice.getFieldHistory('status');

// Get timeline for a field
const timeline = await invoice.getFieldTimeline('status');
```

### Using Static Methods

```javascript
// Compare two versions
const comparison = await Invoice.compareVersions(
  invoiceId,
  new Date('2025-01-01'),
  new Date('2025-01-15')
);

console.log(comparison);
// Output:
// {
//   entityType: 'Invoice',
//   entityId: '...',
//   version1: Date,
//   version2: Date,
//   totalChanges: 5,
//   fieldsModified: 3,
//   changes: {
//     status: [...],
//     total: [...],
//     dueDate: [...]
//   }
// }
```

## API Endpoints

All endpoints require authentication and firm filtering.

### Get Entity History
```
GET /api/field-history/:entityType/:entityId

Query Parameters:
- limit: Number of results (default: 100)
- skip: Offset for pagination (default: 0)
- includeReverted: Include reverted changes (default: false)
- startDate: Filter by start date
- endDate: Filter by end date
- changedBy: Filter by user ID
- fieldName: Filter by field name
- changeType: Filter by change type (created, updated, deleted, restored)

Example:
GET /api/field-history/Invoice/507f1f77bcf86cd799439011?limit=50&fieldName=status
```

### Get Field History
```
GET /api/field-history/:entityType/:entityId/field/:fieldName

Query Parameters:
- limit: Number of results (default: 50)
- skip: Offset for pagination
- includeReverted: Include reverted changes

Example:
GET /api/field-history/Invoice/507f1f77bcf86cd799439011/field/status
```

### Get Field Timeline
```
GET /api/field-history/:entityType/:entityId/timeline/:fieldName

Example:
GET /api/field-history/Invoice/507f1f77bcf86cd799439011/timeline/status
```

### Compare Versions
```
GET /api/field-history/:entityType/:entityId/compare?version1=2025-01-01&version2=2025-01-15

Example:
GET /api/field-history/Invoice/507f1f77bcf86cd799439011/compare?version1=2025-01-01T00:00:00Z&version2=2025-01-15T00:00:00Z
```

### Revert Field
```
POST /api/field-history/:historyId/revert

Requires: admin or owner role

Example:
POST /api/field-history/507f1f77bcf86cd799439011/revert
```

### Get User Changes
```
GET /api/field-history/user/:userId

Query Parameters:
- limit: Number of results (default: 100)
- skip: Offset for pagination
- startDate: Filter by start date
- endDate: Filter by end date
- entityType: Filter by entity type

Example:
GET /api/field-history/user/507f1f77bcf86cd799439011?startDate=2025-01-01&entityType=Invoice
```

### Get Recent Changes
```
GET /api/field-history/recent

Query Parameters:
- limit: Number of results (default: 50)
- entityType: Filter by entity type
- changeType: Filter by change type

Requires: admin or owner role

Example:
GET /api/field-history/recent?limit=100&entityType=Invoice
```

### Get Entity History Stats
```
GET /api/field-history/:entityType/:entityId/stats

Example:
GET /api/field-history/Invoice/507f1f77bcf86cd799439011/stats

Response:
{
  "success": true,
  "data": {
    "totalChanges": 15,
    "fieldsChanged": 5,
    "contributors": 3,
    "changesByType": {
      "created": 1,
      "updated": 13,
      "deleted": 1
    },
    "firstChange": "2025-01-01T00:00:00Z",
    "lastChange": "2025-01-15T12:00:00Z"
  }
}
```

## Manual Service Usage

You can use the service directly without the plugin:

```javascript
const fieldHistoryService = require('../services/fieldHistory.service');

// Track changes
await fieldHistoryService.trackChanges(
  'Invoice',
  invoiceId,
  oldInvoice,
  newInvoice,
  userId,
  firmId,
  {
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    sessionId: 'session123',
    method: 'PUT',
    endpoint: '/api/invoices/123'
  }
);

// Get field history
const history = await fieldHistoryService.getFieldHistory(
  'Invoice',
  invoiceId,
  'status',
  { limit: 50 }
);

// Get entity history
const allHistory = await fieldHistoryService.getEntityHistory(
  'Invoice',
  invoiceId,
  {
    limit: 100,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-31')
  }
);

// Compare versions
const comparison = await fieldHistoryService.compareVersions(
  'Invoice',
  invoiceId,
  new Date('2025-01-01'),
  new Date('2025-01-15')
);

// Get field timeline
const timeline = await fieldHistoryService.getFieldTimeline(
  'Invoice',
  invoiceId,
  'status'
);

// Get user changes
const userChanges = await fieldHistoryService.getUserChanges(
  userId,
  { startDate: new Date('2025-01-01'), endDate: new Date('2025-01-31') },
  { limit: 100, firmId }
);

// Get recent changes
const recentChanges = await fieldHistoryService.getRecentChanges(
  firmId,
  50,
  { entityType: 'Invoice' }
);

// Revert field
const revertResult = await fieldHistoryService.revertField(
  historyId,
  userId
);
```

## Advanced Configuration

### Custom Field Tracking

```javascript
// Define custom trackable fields per entity type
invoiceSchema.plugin(fieldHistoryPlugin, {
  trackFields: [
    'invoiceNumber',
    'status',
    'total',
    'dueDate',
    'clientId',
    'items',
    'taxAmount',
    'notes'
  ],
  excludeFields: ['internalNotes', 'systemMetadata'],
  trackOnCreate: true,
  trackOnUpdate: true,
  trackOnDelete: true
});
```

### Custom Context Extraction

```javascript
invoiceSchema.plugin(fieldHistoryPlugin, {
  getUserContext: (doc) => {
    return {
      userId: doc._userId || doc.lastModifiedBy,
      firmId: doc.firmId,
      metadata: {
        ipAddress: doc._metadata?.ip,
        userAgent: doc._metadata?.userAgent,
        reason: doc._metadata?.changeReason
      }
    };
  }
});
```

### Custom Field Filter

```javascript
invoiceSchema.plugin(fieldHistoryPlugin, {
  shouldTrackField: (fieldName) => {
    // Only track specific fields
    const trackedFields = ['status', 'total', 'dueDate'];
    return trackedFields.includes(fieldName);
  }
});
```

## Best Practices

1. **Set Context Before Saving**: Always set the field history context before saving documents when using the plugin.

2. **Choose Appropriate Fields**: Only track fields that are important for audit/compliance. Don't track every field to avoid database bloat.

3. **Exclude Sensitive Data**: Always exclude passwords, tokens, and other sensitive data from tracking.

4. **Use Pagination**: When querying history, always use limit/skip parameters to avoid performance issues.

5. **Archive Old History**: Consider implementing archiving for very old history records (older than retention period).

6. **Permissions**: Ensure proper permission checks are in place before allowing users to view or revert changes.

## Integration with Existing Models

To integrate with existing models like Invoice, Client, Case, etc.:

1. Add the plugin to the schema file
2. Update controllers to set context before saves
3. The tracking will happen automatically

Example for Invoice model:

```javascript
// In src/models/invoice.model.js
const fieldHistoryPlugin = require('../plugins/fieldHistoryPlugin');

// Add at the end of the file, before module.exports
invoiceSchema.plugin(fieldHistoryPlugin, {
  trackFields: ['status', 'total', 'dueDate', 'items'],
  trackOnCreate: true,
  trackOnUpdate: true
});

// In src/controllers/invoice.controller.js
const updateInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);

  // Set context
  invoice.setFieldHistoryContext(req.userID, req.firmId, {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    method: req.method,
    endpoint: req.originalUrl
  });

  // Apply updates
  Object.assign(invoice, req.body);

  // Save (tracking happens automatically)
  await invoice.save();

  res.json({ success: true, data: invoice });
});
```

## Troubleshooting

### Changes Not Being Tracked

1. Verify the plugin is applied to the schema
2. Check that context is set before saving: `doc.setFieldHistoryContext(...)`
3. Ensure the field is not in the excluded list
4. Check server logs for any errors

### Performance Issues

1. Add appropriate indexes (already included in model)
2. Use pagination for large result sets
3. Consider archiving old history records
4. Limit the number of tracked fields

### Revert Not Working

1. Ensure user has admin/owner role
2. Check that the history entry exists and is not already reverted
3. Remember that revert only creates history records - you must update the actual document separately

## License

This implementation follows the existing patterns in the traf3li-backend codebase.
