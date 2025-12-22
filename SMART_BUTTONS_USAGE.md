# Smart Buttons API Usage

This API provides Odoo-style smart buttons that display counts of related records for any entity.

## Endpoints

### Get Counts for a Single Record

```
GET /api/smart-buttons/:model/:recordId/counts
```

**Supported Models:**
- `client` - Client entity
- `case` - Case entity
- `contact` - Contact entity
- `invoice` - Invoice entity
- `lead` - Lead entity
- `task` - Task entity
- `expense` - Expense entity
- `payment` - Payment entity
- `document` - Document entity
- `timeentry` - Time Entry entity
- `event` - Event entity

**Example Request:**
```bash
GET /api/smart-buttons/client/507f1f77bcf86cd799439011/counts
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "cases": 5,
    "invoices": 12,
    "documents": 23,
    "contacts": 3,
    "tasks": 8,
    "timeEntries": 45,
    "expenses": 7,
    "payments": 10,
    "activities": 15,
    "events": 4
  }
}
```

### Get Batch Counts

```
POST /api/smart-buttons/:model/batch-counts
```

**Request Body:**
```json
{
  "recordIds": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "507f1f77bcf86cd799439011": {
      "cases": 5,
      "invoices": 12,
      "documents": 23,
      "tasks": 8,
      "payments": 10
    },
    "507f1f77bcf86cd799439012": {
      "cases": 2,
      "invoices": 3,
      "documents": 8,
      "tasks": 1,
      "payments": 2
    }
  }
}
```

## Relationship Mapping

### Client
- **cases**: Cases linked to this client
- **invoices**: Invoices for this client
- **documents**: Documents associated with this client
- **contacts**: Contacts under this client
- **tasks**: Tasks assigned to this client
- **timeEntries**: Time entries for this client
- **expenses**: Expenses for this client
- **payments**: Payments from this client
- **activities**: Activities (Odoo-style) for this client
- **events**: Calendar events involving this client

### Case
- **documents**: Documents linked to this case
- **tasks**: Tasks for this case
- **timeEntries**: Time entries for this case
- **invoices**: Invoices for this case
- **expenses**: Expenses for this case
- **payments**: Payments for this case
- **activities**: Activities for this case
- **events**: Events for this case

### Contact
- **cases**: Cases involving this contact
- **invoices**: Invoices for this contact
- **activities**: Activities for this contact
- **events**: Events involving this contact
- **tasks**: Tasks assigned to this contact

### Invoice
- **payments**: Payments applied to this invoice
- **documents**: Documents attached to this invoice
- **timeEntries**: Time entries billed on this invoice
- **expenses**: Expenses billed on this invoice

### Lead
- **activities**: Follow-up activities for this lead
- **documents**: Documents for this lead
- **tasks**: Tasks for this lead
- **events**: Events/meetings for this lead

### Task
- **subtasks**: Sub-tasks within this task
- **documents**: Documents attached to this task
- **timeEntries**: Time tracked on this task
- **comments**: Comments on this task
- **attachments**: File attachments on this task

### Expense
- **attachments**: File attachments
- **receipts**: Receipt documents

### Payment
- **invoices**: Invoices this payment is applied to
- **attachments**: File attachments

### Document
- **versions**: Version history of this document

### TimeEntry
- **attachments**: File attachments
- **history**: Edit and approval history

### Event
- **participants**: Event participants
- **attachments**: Event attachments
- **reminders**: Event reminders

## Features

1. **Multi-tenancy Support**: Automatically filters by firmId when available
2. **Caching**: Results are cached for 60 seconds for better performance
3. **Flexible Relationships**: Handles both direct references and polymorphic relationships (Activities)
4. **Embedded Arrays**: Counts items in embedded arrays (subtasks, comments, etc.)
5. **Legacy Support**: Handles both new and legacy field names (e.g., clientId/customerId)

## Authorization

All endpoints require:
- Valid JWT token (via `userMiddleware`)
- Firm context (via `firmFilter`)

## Error Handling

**Invalid Model:**
```json
{
  "success": false,
  "message": "Unsupported model: invalidModel"
}
```

**Invalid Record ID:**
```json
{
  "success": false,
  "message": "Invalid record ID"
}
```

## Performance Notes

- Smart button counts are cached for 60 seconds
- Batch operations are more efficient for multiple records
- Only supported models for batch operations: `client`, `case`
