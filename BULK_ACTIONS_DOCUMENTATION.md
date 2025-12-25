# Bulk Actions Framework Documentation

## Overview

The Bulk Actions Framework provides a unified, enterprise-grade solution for executing bulk operations across different entity types in the TRAF3LI backend. It supports batch processing, progress tracking, job queuing for large operations, and comprehensive error handling.

## Architecture

### Components

1. **Service Layer** (`src/services/bulkActions.service.js`)
   - Core business logic for bulk operations
   - Entity validation and permission checks
   - Batch processing with configurable batch sizes
   - Job queue integration for async operations

2. **Controller Layer** (`src/controllers/bulkActions.controller.js`)
   - REST API endpoints
   - Request validation and security
   - Mass assignment protection
   - Role-based access control

3. **Routes** (`src/routes/bulkActions.routes.js`)
   - Route definitions
   - Authentication and firm filtering middleware

4. **Queue Processor** (`src/queues/bulkActions.queue.js`)
   - Asynchronous job processing
   - Progress tracking
   - Event handling and logging

## Supported Entity Types and Actions

### Invoices
- `delete` - Delete draft/cancelled invoices
- `send` - Send invoices via email
- `void` - Void invoices
- `export` - Export invoice data
- `remind` - Send payment reminders

### Clients
- `delete` - Delete clients (with dependency checks)
- `merge` - Merge clients (requires targetClientId parameter)
- `export` - Export client data
- `archive` - Archive clients

### Payments
- `delete` - Delete draft/cancelled payments
- `export` - Export payment data
- `void` - Void completed payments

### Expenses
- `delete` - Delete draft/rejected expenses
- `approve` - Approve pending expenses
- `reject` - Reject pending expenses (requires reason parameter)
- `export` - Export expense data

### Cases
- `archive` - Archive cases
- `export` - Export case data
- `close` - Close cases

### Time Entries
- `approve` - Approve pending time entries
- `reject` - Reject pending time entries
- `invoice` - Mark time entries as invoiced
- `delete` - Delete draft/rejected time entries

## API Endpoints

### 1. Execute Bulk Action

**Endpoint:** `POST /api/bulk-actions/:entityType`

**Request Body:**
```json
{
  "action": "send",
  "ids": ["64a1b2c3d4e5f6g7h8i9j0k1", "64b2c3d4e5f6g7h8i9j0k1l2"],
  "params": {
    "firmName": "My Law Firm",
    "invoiceLink": "https://app.example.com/invoices"
  }
}
```

**Response (Synchronous):**
```json
{
  "success": true,
  "message": "تم تنفيذ الإجراء الجماعي بنجاح",
  "data": {
    "successCount": 45,
    "failureCount": 5,
    "totalEntities": 50,
    "errors": [
      {
        "entityId": "64c3d4e5f6g7h8i9j0k1l2m3",
        "error": "Client email not found"
      }
    ],
    "hasErrors": true
  }
}
```

**Response (Async - for large operations):**
```json
{
  "success": true,
  "message": "تم إضافة الإجراء الجماعي إلى قائمة الانتظار للمعالجة",
  "data": {
    "jobId": "bulk-invoices-send-1234567890-abc123",
    "status": "queued",
    "totalEntities": 500,
    "message": "Bulk action queued for processing"
  }
}
```

### 2. Validate Bulk Action

**Endpoint:** `POST /api/bulk-actions/:entityType/validate`

**Request Body:**
```json
{
  "action": "void",
  "ids": ["64a1b2c3d4e5f6g7h8i9j0k1", "64b2c3d4e5f6g7h8i9j0k1l2"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isValid": false,
    "errors": [
      "5 entities not found or don't belong to this firm",
      "3 invoices cannot be voided (already paid or voided)"
    ],
    "validCount": 42,
    "invalidCount": 8
  }
}
```

### 3. Get Job Progress

**Endpoint:** `GET /api/bulk-actions/:jobId/progress`

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "bulk-invoices-send-1234567890-abc123",
    "actionType": "send",
    "entityType": "invoices",
    "status": "processing",
    "progress": 65,
    "totalEntities": 500,
    "processedCount": 325,
    "successCount": 320,
    "failureCount": 5,
    "errors": [
      {
        "entityId": "64d4e5f6g7h8i9j0k1l2m3n4",
        "error": "Client email not found"
      }
    ],
    "createdAt": "2023-12-25T10:30:00.000Z",
    "startedAt": "2023-12-25T10:30:05.000Z"
  }
}
```

### 4. Cancel Job

**Endpoint:** `POST /api/bulk-actions/:jobId/cancel`

**Response:**
```json
{
  "success": true,
  "message": "تم إلغاء الإجراء الجماعي بنجاح",
  "data": {
    "jobId": "bulk-invoices-send-1234567890-abc123",
    "status": "cancelled",
    "message": "Bulk action cancelled successfully"
  }
}
```

### 5. Get Supported Actions

**Endpoint:** `GET /api/bulk-actions/supported/:entityType?`

**Example 1:** Get actions for specific entity type
```
GET /api/bulk-actions/supported/invoices
```

**Response:**
```json
{
  "success": true,
  "data": {
    "entityType": "invoices",
    "actions": ["delete", "send", "void", "export", "remind"]
  }
}
```

**Example 2:** Get all supported entity types and actions
```
GET /api/bulk-actions/supported
```

**Response:**
```json
{
  "success": true,
  "data": {
    "entityTypes": ["invoices", "clients", "payments", "expenses", "cases", "time_entries"],
    "actions": {
      "invoices": ["delete", "send", "void", "export", "remind"],
      "clients": ["delete", "merge", "export", "archive"],
      "payments": ["delete", "export", "void"],
      "expenses": ["delete", "approve", "reject", "export"],
      "cases": ["archive", "export", "close"],
      "time_entries": ["approve", "reject", "invoice", "delete"]
    }
  }
}
```

## Permission Requirements

### Admin/Owner Required
- `delete` - Delete operations
- `merge` - Merge clients
- `void` - Void invoices/payments

### Manager/Admin/Owner Required
- `approve` - Approve expenses/time entries
- `reject` - Reject expenses/time entries

### All Authenticated Users
- `export` - Export data
- `send` - Send invoices
- `remind` - Send reminders
- `archive` - Archive entities
- `close` - Close cases
- `invoice` - Mark time entries as invoiced

## Configuration

### Batch Processing
- **BATCH_SIZE**: 50 entities per batch (configurable)
- **MAX_BULK_SIZE**: 1000 entities maximum per operation

### Queue Settings
- **Attempts**: 3 retries on failure
- **Backoff**: Exponential (5 seconds initial delay)
- **Timeout**: 10 minutes per job
- **Retention**:
  - Completed jobs: 48 hours (100 max)
  - Failed jobs: 7 days

## Usage Examples

### Example 1: Send Multiple Invoices

```javascript
// Frontend code
const response = await fetch('/api/bulk-actions/invoices', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    action: 'send',
    ids: [
      '64a1b2c3d4e5f6g7h8i9j0k1',
      '64b2c3d4e5f6g7h8i9j0k1l2',
      '64c3d4e5f6g7h8i9j0k1l2m3'
    ],
    params: {
      firmName: 'Smith & Associates',
      invoiceLink: 'https://app.mylaw.com/invoices'
    }
  })
});

const result = await response.json();
console.log(result);
```

### Example 2: Approve Multiple Expenses

```javascript
const response = await fetch('/api/bulk-actions/expenses', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    action: 'approve',
    ids: [
      '64d4e5f6g7h8i9j0k1l2m3n4',
      '64e5f6g7h8i9j0k1l2m3n4o5'
    ]
  })
});

const result = await response.json();
if (result.success) {
  console.log(`Approved ${result.data.successCount} expenses`);
}
```

### Example 3: Merge Clients

```javascript
const response = await fetch('/api/bulk-actions/clients', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    action: 'merge',
    ids: [
      '64f6g7h8i9j0k1l2m3n4o5p6',  // Source client 1
      '64g7h8i9j0k1l2m3n4o5p6q7'   // Source client 2
    ],
    params: {
      targetClientId: '64h8i9j0k1l2m3n4o5p6q7r8'  // Target client
    }
  })
});

const result = await response.json();
```

### Example 4: Monitor Long-Running Job

```javascript
// Start bulk operation
const startResponse = await fetch('/api/bulk-actions/invoices', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    action: 'send',
    ids: [...Array(500)].map((_, i) => `invoice_${i}`)  // 500 invoices
  })
});

const { data: { jobId } } = await startResponse.json();

// Poll for progress
const intervalId = setInterval(async () => {
  const progressResponse = await fetch(`/api/bulk-actions/${jobId}/progress`, {
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN'
    }
  });

  const { data: progress } = await progressResponse.json();
  console.log(`Progress: ${progress.progress}% (${progress.successCount}/${progress.totalEntities})`);

  if (progress.status === 'completed') {
    clearInterval(intervalId);
    console.log('Bulk action completed!');
    console.log(`Success: ${progress.successCount}, Failed: ${progress.failureCount}`);
  }
}, 2000);  // Poll every 2 seconds
```

## Error Handling

### Validation Errors
- Invalid entity IDs are filtered out
- Entity type and action validation
- Firm ownership verification (IDOR protection)
- Permission checks

### Processing Errors
- Individual entity failures don't stop the entire operation
- Errors are collected and returned in the response
- Failed operations can be retried separately

### Common Error Messages
- `"نوع الإجراء مطلوب"` - Action type required
- `"يجب تحديد معرفات الكيانات كمصفوفة"` - Entity IDs must be an array
- `"نوع الكيان غير مدعوم"` - Unsupported entity type
- `"هذا الإجراء يتطلب صلاحيات المالك أو المدير"` - Admin/owner permission required
- `"الوظيفة غير موجودة"` - Job not found

## Security Features

1. **Mass Assignment Protection** - Only allowed fields are accepted
2. **IDOR Protection** - Firm ID verification on all operations
3. **Role-Based Access Control** - Different actions require different permissions
4. **Entity Validation** - All entities must exist and belong to the firm
5. **Audit Logging** - All bulk operations are logged for compliance

## Audit Trail

All bulk operations are logged with:
- User ID
- Firm ID
- Action type
- Entity type
- Total entities
- Success/failure counts
- Timestamp
- IP address (where applicable)

## Performance Considerations

### Synchronous vs Asynchronous Processing

- **Small operations (≤50 entities)**: Processed synchronously
- **Large operations (>50 entities)**: Queued for background processing

### Batch Processing

Operations are processed in batches of 50 entities to:
- Prevent memory issues
- Allow for progress tracking
- Enable graceful cancellation
- Reduce database load

## Extending the Framework

### Adding New Entity Types

1. Add model to `ENTITY_MODEL_MAP` in `bulkActions.service.js`
2. Define supported actions in `SUPPORTED_ACTIONS`
3. Implement action handlers in `ACTION_HANDLERS`

Example:
```javascript
// Add to ENTITY_MODEL_MAP
const ENTITY_MODEL_MAP = {
  // ... existing mappings
  tasks: Task
};

// Add to SUPPORTED_ACTIONS
const SUPPORTED_ACTIONS = {
  // ... existing actions
  tasks: ['delete', 'complete', 'archive', 'export']
};

// Add action handlers
static ACTION_HANDLERS = {
  // ... existing handlers
  tasks_complete: async (entityId, params, userId, firmId) => {
    const task = await Task.findOne({ _id: entityId, firmId });
    if (!task) throw new Error('Task not found');

    task.status = 'completed';
    task.completedAt = new Date();
    task.completedBy = userId;
    await task.save();

    return { completed: true };
  }
};
```

### Adding New Actions

Follow the same pattern as existing handlers:
```javascript
entity_type_action: async (entityId, params, userId, firmId) => {
  // 1. Fetch and validate entity
  // 2. Perform action
  // 3. Return result
}
```

## Testing

### Unit Testing
Test individual action handlers with various scenarios:
- Valid operations
- Invalid entity IDs
- Permission errors
- Status validation

### Integration Testing
Test complete workflows:
- Small batch operations
- Large async operations
- Job progress tracking
- Error handling

### Load Testing
Test with:
- Maximum batch sizes (1000 entities)
- Concurrent operations
- Queue performance

## Monitoring

### Metrics to Track
- Job completion rate
- Average processing time
- Error rate by entity type and action
- Queue depth
- Failed job count

### Logging
All operations are logged with appropriate log levels:
- **INFO**: Job start/completion, progress milestones
- **WARN**: Job stalled, queue warnings
- **ERROR**: Job failures, processing errors
- **DEBUG**: Queue events (waiting, removed)

## Troubleshooting

### Job Stuck in Queue
- Check queue service status
- Verify Redis/queue backend is running
- Check job timeout settings
- Review error logs

### High Failure Rate
- Validate entity statuses
- Check permission settings
- Verify data integrity
- Review action-specific requirements

### Performance Issues
- Adjust batch size
- Check database indexes
- Monitor queue load
- Consider scaling queue workers

## Future Enhancements

1. **Scheduled Bulk Actions** - Schedule operations for later execution
2. **Webhooks** - Notify external systems on completion
3. **Custom Actions** - Allow firms to define custom bulk actions
4. **Dry Run Mode** - Preview operation results without executing
5. **Rollback Support** - Undo bulk operations
6. **Enhanced Filtering** - Filter entities before bulk action
7. **Template Support** - Save and reuse bulk action configurations
8. **Analytics Dashboard** - Visual monitoring of bulk operations

## Support

For issues or questions:
- Check error messages in the response
- Review audit logs for detailed operation history
- Monitor job progress for async operations
- Contact development team for framework enhancements
