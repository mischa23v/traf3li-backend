# Invoice Approval Temporal Workflow

## Overview

This implementation provides a complete Temporal workflow system for multi-level invoice approvals with automatic escalation, timeout handling, and email notifications.

## Architecture

### Components

1. **Workflow** (`/src/temporal/workflows/invoiceApproval.workflow.js`)
   - Multi-level approval process
   - Automatic escalation after 48-hour timeout
   - Signal handlers for approval/rejection/cancellation
   - Query handler for status checks

2. **Activities** (`/src/temporal/activities/invoiceApproval.activities.js`)
   - Email notifications to approvers
   - Invoice status updates
   - Escalation handling
   - Approval logging

3. **Routes** (`/src/routes/temporalInvoice.route.js`)
   - REST API endpoints for workflow management
   - Temporal client integration

4. **Worker** (`/src/temporal/worker.js`)
   - Processes workflow and activity tasks
   - Already configured to include invoice approval activities

## API Endpoints

All endpoints are prefixed with `/api/temporal-invoices` and require authentication.

### 1. Submit Invoice for Approval
```
POST /api/temporal-invoices/:id/submit-approval
```

**Request Body:**
```json
{
  "approvalLevels": 2,  // Optional: auto-calculated from amount if not provided
  "notes": "Please review and approve"  // Optional
}
```

**Response:**
```json
{
  "message": "Invoice approval workflow started",
  "workflowId": "invoice-approval-<invoiceId>",
  "workflowRunId": "<runId>",
  "invoice": {
    "id": "<invoiceId>",
    "invoiceNumber": "INV-202312-0001",
    "status": "pending_approval"
  }
}
```

### 2. Approve Invoice
```
POST /api/temporal-invoices/:id/approve
```

**Request Body:**
```json
{
  "comment": "Looks good, approved"  // Optional
}
```

**Response:**
```json
{
  "message": "Approval signal sent successfully",
  "invoice": {
    "id": "<invoiceId>",
    "invoiceNumber": "INV-202312-0001",
    "status": "pending_approval"
  }
}
```

### 3. Reject Invoice
```
POST /api/temporal-invoices/:id/reject
```

**Request Body:**
```json
{
  "reason": "Amount is too high, please review"  // Required
}
```

**Response:**
```json
{
  "message": "Rejection signal sent successfully",
  "invoice": {
    "id": "<invoiceId>",
    "invoiceNumber": "INV-202312-0001",
    "status": "draft"
  }
}
```

### 4. Get Approval Status
```
GET /api/temporal-invoices/:id/approval-status
```

**Response:**
```json
{
  "invoice": {
    "id": "<invoiceId>",
    "invoiceNumber": "INV-202312-0001",
    "status": "pending_approval"
  },
  "workflow": {
    "workflowId": "invoice-approval-<invoiceId>",
    "runId": "<runId>",
    "status": "RUNNING",
    "startTime": "2023-12-23T10:00:00Z"
  },
  "approval": {
    "currentLevel": 1,
    "maxLevel": 2,
    "decisions": [],
    "status": "pending",
    "escalated": false
  }
}
```

### 5. Cancel Approval
```
POST /api/temporal-invoices/:id/cancel-approval
```

**Request Body:**
```json
{
  "reason": "Invoice needs to be revised"  // Optional
}
```

**Response:**
```json
{
  "message": "Approval workflow cancelled successfully",
  "invoice": {
    "id": "<invoiceId>",
    "invoiceNumber": "INV-202312-0001",
    "status": "draft"
  }
}
```

### 6. Get Pending Approvals
```
GET /api/temporal-invoices/pending-approvals
```

**Response:**
```json
{
  "count": 2,
  "approvals": [
    {
      "invoice": {
        "id": "<invoiceId>",
        "invoiceNumber": "INV-202312-0001",
        "amount": 5000000,
        "client": {
          "name": "ABC Company",
          "email": "client@abc.com"
        },
        "issueDate": "2023-12-20",
        "dueDate": "2024-01-20"
      },
      "approval": {
        "workflowId": "invoice-approval-<invoiceId>",
        "submittedAt": "2023-12-22T10:00:00Z",
        "submittedBy": {
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@firm.com"
        },
        "currentLevel": 1,
        "maxLevel": 2,
        "status": "pending",
        "decisions": []
      }
    }
  ]
}
```

## Approval Levels

The system automatically determines the number of approval levels based on the invoice amount:

- **< 10,000 SAR**: 1 level (Manager)
- **10,000 - 100,000 SAR**: 2 levels (Manager + Director/Partner)
- **> 100,000 SAR**: 3 levels (Manager + Director + Partner/CFO)

Amounts are stored in halalas (1 SAR = 100 halalas).

## Workflow Logic

### 1. Initialization
- Workflow starts when invoice is submitted for approval
- System calculates approval levels based on amount
- First level approver is notified via email

### 2. Approval Process
- For each level:
  - Get appropriate approver from firm configuration
  - Send email notification with approval link
  - Wait for decision or 48-hour timeout
  - If approved, move to next level
  - If rejected, workflow ends and requester is notified
  - If timeout, escalate to firm admin/partners

### 3. Completion
- When all levels approve: Invoice status → "approved"
- When any level rejects: Invoice status → "draft"
- When cancelled: Invoice status → "draft"

## Email Notifications

The system sends emails for the following events:

1. **Approval Request**: Sent to approver at each level
2. **Escalation Alert**: Sent to firm admins when timeout occurs
3. **Rejection Notice**: Sent to invoice creator when rejected
4. **Approval Complete**: Sent to invoice creator when fully approved

All emails include:
- Invoice details (number, amount, client)
- Action links (approve/reject)
- Contextual information

## Configuration

### Environment Variables

```env
# Temporal Server
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default

# Frontend URLs
FRONTEND_URL=http://localhost:3000

# Email Service (Resend)
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@traf3li.com
EMAIL_FROM_NAME=Traf3li
```

### Approval Configuration

Approvers are automatically determined based on user roles in the firm:
- Level 1: Manager or Senior Lawyer
- Level 2: Director or Partner
- Level 3: Partner or CFO (for high amounts)

To customize, modify the `getApprovalConfig` function in `/src/temporal/activities/invoiceApproval.activities.js`.

## Running the Worker

The Temporal worker must be running to process workflows:

```bash
# Start the worker
node src/temporal/worker.js

# Or with PM2
pm2 start src/temporal/worker.js --name temporal-worker
```

The worker is already configured to handle invoice approval workflows in the `invoice-approval` task queue.

## Database Schema

### Invoice Model Updates

The invoice model includes approval-related fields:

```javascript
{
  approval: {
    required: Boolean,
    workflowId: String,
    workflowRunId: String,
    submittedAt: Date,
    submittedBy: ObjectId,
    notes: String,
    status: String,
    cancelledAt: Date,
    cancelledBy: ObjectId
  },
  status: {
    type: String,
    enum: [
      'draft',
      'pending_approval',  // New status
      'sent',
      'viewed',
      'partial',
      'paid',
      'overdue',
      'void',
      'written_off',
      'cancelled'
    ]
  },
  history: [{
    action: String,
    date: Date,
    user: ObjectId,
    note: String
  }]
}
```

## Integration with Existing System

This Temporal-based approval system works alongside the existing `InvoiceApproval` model but provides:

1. **Better reliability**: Workflows survive server restarts
2. **Automatic escalation**: No cron jobs needed
3. **Built-in retry logic**: Activities retry on failure
4. **Better visibility**: Query workflow status anytime
5. **Flexible signals**: Approve/reject/cancel from anywhere

## Testing

### Manual Testing

1. **Submit an invoice for approval:**
```bash
curl -X POST http://localhost:5000/api/temporal-invoices/<invoiceId>/submit-approval \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Please review"}'
```

2. **Check approval status:**
```bash
curl http://localhost:5000/api/temporal-invoices/<invoiceId>/approval-status \
  -H "Authorization: Bearer <token>"
```

3. **Approve the invoice:**
```bash
curl -X POST http://localhost:5000/api/temporal-invoices/<invoiceId>/approve \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Approved"}'
```

## Troubleshooting

### Workflow Not Starting
- Check if Temporal server is running
- Verify `TEMPORAL_ADDRESS` environment variable
- Check worker logs for connection issues

### Emails Not Sending
- Verify `RESEND_API_KEY` is configured
- Check email service logs
- Ensure approver emails are valid

### Workflow Stuck
- Query workflow status to see current state
- Check worker logs for activity errors
- Verify approvers exist in the database

### Timeout Issues
- Default timeout is 48 hours
- Modify `TIMEOUT_MS` in workflow if needed
- Check escalation notifications are working

## Future Enhancements

Possible improvements:
1. Custom approval chains per firm
2. Parallel approvals (multiple approvers at same level)
3. Conditional routing based on invoice type
4. Integration with Slack/Teams notifications
5. Mobile push notifications
6. Approval delegation
7. Bulk approval actions
8. Approval analytics dashboard

## File Structure

```
src/
├── temporal/
│   ├── workflows/
│   │   └── invoiceApproval.workflow.js    # Workflow definition
│   ├── activities/
│   │   └── invoiceApproval.activities.js  # Activity implementations
│   └── worker.js                           # Worker configuration
├── routes/
│   ├── temporalInvoice.route.js          # REST API routes
│   └── index.js                           # Route exports (updated)
├── models/
│   ├── invoice.model.js                   # Invoice model (existing)
│   └── invoiceApproval.model.js          # Approval tracking (existing)
└── server.js                              # Server setup (updated)
```

## Support

For issues or questions:
- Check Temporal UI at http://localhost:8080
- Review worker logs
- Check activity retry attempts
- Monitor email delivery logs
