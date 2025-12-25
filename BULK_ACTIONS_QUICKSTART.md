# Bulk Actions Framework - Quick Start Guide

## Files Created

### Core Implementation
1. ✅ **Service**: `/src/services/bulkActions.service.js` (28KB)
   - Core business logic and action handlers
   - Batch processing and validation
   - Job queue integration

2. ✅ **Controller**: `/src/controllers/bulkActions.controller.js` (11KB)
   - REST API endpoints
   - Security and validation
   - Permission checks

3. ✅ **Routes**: `/src/routes/bulkActions.routes.js` (3.4KB)
   - Route definitions
   - Middleware configuration

4. ✅ **Queue Processor**: `/src/queues/bulkActions.queue.js` (4.4KB)
   - Background job processing
   - Event handling

### Integration Updates
5. ✅ **Queue Service**: Updated to import bulk actions queue
6. ✅ **Routes Index**: Added bulk actions routes export
7. ✅ **Server**: Registered `/api/bulk-actions` endpoint

## Quick Test

### Test 1: Get Supported Actions
```bash
curl -X GET http://localhost:3000/api/bulk-actions/supported/invoices \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 2: Validate Bulk Action
```bash
curl -X POST http://localhost:3000/api/bulk-actions/invoices/validate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "send",
    "ids": ["INVOICE_ID_1", "INVOICE_ID_2"]
  }'
```

### Test 3: Execute Bulk Action (Small Batch)
```bash
curl -X POST http://localhost:3000/api/bulk-actions/invoices \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "send",
    "ids": ["INVOICE_ID_1", "INVOICE_ID_2"],
    "params": {
      "firmName": "Test Firm"
    }
  }'
```

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bulk-actions/:entityType` | Execute bulk action |
| POST | `/api/bulk-actions/:entityType/validate` | Validate before execution |
| GET | `/api/bulk-actions/:jobId/progress` | Get job progress |
| POST | `/api/bulk-actions/:jobId/cancel` | Cancel running job |
| GET | `/api/bulk-actions/supported/:entityType?` | Get supported actions |

## Supported Operations

### Invoices
- ✉️ `send` - Email invoices to clients
- ❌ `delete` - Delete draft/cancelled invoices
- 🚫 `void` - Void invoices
- 📥 `export` - Export invoice data
- 🔔 `remind` - Send payment reminders

### Clients
- ❌ `delete` - Delete clients
- 🔀 `merge` - Merge multiple clients
- 📥 `export` - Export client data
- 📦 `archive` - Archive clients

### Payments
- ❌ `delete` - Delete draft payments
- 🚫 `void` - Void payments
- 📥 `export` - Export payment data

### Expenses
- ❌ `delete` - Delete draft expenses
- ✅ `approve` - Approve expenses
- ❌ `reject` - Reject expenses
- 📥 `export` - Export expense data

### Cases
- 📦 `archive` - Archive cases
- 🔒 `close` - Close cases
- 📥 `export` - Export case data

### Time Entries
- ✅ `approve` - Approve time entries
- ❌ `reject` - Reject time entries
- 💰 `invoice` - Mark as invoiced
- ❌ `delete` - Delete time entries

## Permission Matrix

| Action | Required Permission |
|--------|-------------------|
| `delete`, `merge`, `void` | Owner or Admin |
| `approve`, `reject` | Owner, Admin, or Manager |
| `send`, `export`, `remind`, `archive`, `close`, `invoice` | Any authenticated user |

## Processing Modes

### Synchronous (≤50 entities)
- Immediate execution
- Direct response with results
- Best for small operations

### Asynchronous (>50 entities)
- Background job queued
- Job ID returned
- Monitor via progress endpoint
- Best for large operations

## Configuration

```javascript
// In bulkActions.service.js
const BATCH_SIZE = 50;       // Entities per batch
const MAX_BULK_SIZE = 1000;  // Maximum entities allowed

// Queue settings (in bulkActions.queue.js)
{
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  timeout: 600000  // 10 minutes
}
```

## Common Use Cases

### 1. Monthly Invoice Batch Send
```javascript
POST /api/bulk-actions/invoices
{
  "action": "send",
  "ids": [...500 invoice IDs],
  "params": {
    "firmName": "Smith & Associates",
    "invoiceLink": "https://portal.firm.com/invoices"
  }
}
// Returns jobId for monitoring
```

### 2. Expense Approval
```javascript
POST /api/bulk-actions/expenses
{
  "action": "approve",
  "ids": [...50 expense IDs]
}
// Returns immediate results
```

### 3. Client Data Export
```javascript
POST /api/bulk-actions/clients
{
  "action": "export",
  "ids": [...client IDs]
}
// Returns client data array
```

## Error Handling

### Partial Failures
The framework continues processing even if some entities fail:

```json
{
  "successCount": 47,
  "failureCount": 3,
  "errors": [
    {
      "entityId": "64abc...",
      "error": "Invoice already paid"
    },
    {
      "entityId": "64def...",
      "error": "Client email not found"
    }
  ]
}
```

### Complete Validation Before Execution
Always validate first to catch issues early:

```javascript
// 1. Validate
const validation = await fetch('/api/bulk-actions/invoices/validate', {
  method: 'POST',
  body: JSON.stringify({ action: 'void', ids: [...] })
});

// 2. If valid, execute
if (validation.data.isValid) {
  await fetch('/api/bulk-actions/invoices', {
    method: 'POST',
    body: JSON.stringify({ action: 'void', ids: [...] })
  });
}
```

## Monitoring Jobs

### Poll for Progress
```javascript
async function monitorJob(jobId) {
  const interval = setInterval(async () => {
    const res = await fetch(`/api/bulk-actions/${jobId}/progress`);
    const { data } = await res.json();

    console.log(`${data.progress}% - ${data.successCount}/${data.totalEntities}`);

    if (data.status === 'completed' || data.status === 'failed') {
      clearInterval(interval);
      console.log('Final status:', data.status);
      console.log('Errors:', data.errors);
    }
  }, 2000);
}
```

## Security Notes

1. **IDOR Protection**: All entities verified to belong to user's firm
2. **Mass Assignment Protection**: Only allowed fields accepted
3. **Role-Based Access**: Different permissions for different actions
4. **Audit Logging**: All operations logged for compliance
5. **Rate Limiting**: Consider implementing for production

## Next Steps

1. ✅ Framework is ready to use
2. 🧪 Test with real data in development
3. 📊 Monitor queue performance
4. 🔒 Review security settings
5. 📈 Set up monitoring dashboards
6. 🎯 Add custom actions as needed

## Extending the Framework

### Add New Entity Type
```javascript
// 1. Add to ENTITY_MODEL_MAP
documents: Document

// 2. Add to SUPPORTED_ACTIONS
documents: ['delete', 'archive', 'export']

// 3. Add handlers
documents_archive: async (entityId, params, userId, firmId) => {
  const doc = await Document.findOne({ _id: entityId, firmId });
  doc.archived = true;
  await doc.save();
  return { archived: true };
}
```

### Add New Action
```javascript
// Example: Add 'duplicate' action for invoices
invoices_duplicate: async (entityId, params, userId, firmId) => {
  const original = await Invoice.findOne({ _id: entityId, firmId });
  const duplicate = new Invoice({
    ...original.toObject(),
    _id: new mongoose.Types.ObjectId(),
    status: 'draft',
    invoiceNumber: await generateInvoiceNumber(firmId),
    createdAt: new Date()
  });
  await duplicate.save();
  return { duplicated: true, newId: duplicate._id };
}
```

## Troubleshooting

### Jobs Not Processing
- Check if queue service is running
- Verify Redis/queue backend connection
- Review queue processor logs

### High Error Rate
- Use validate endpoint before execution
- Check entity statuses match action requirements
- Verify user permissions

### Performance Issues
- Reduce batch size for slower operations
- Check database indexes on frequently queried fields
- Monitor queue depth and worker count

## Support

For detailed documentation, see: `/BULK_ACTIONS_DOCUMENTATION.md`

For framework issues:
1. Check error logs
2. Review audit trail
3. Monitor job progress
4. Contact development team
