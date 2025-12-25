# Webhook Integration Guide

This guide shows how to integrate the outgoing webhooks system with your application events.

## Overview

The webhook system consists of:
- **Models**: `/src/models/webhook.model.js` and `/src/models/webhookDelivery.model.js`
- **Service**: `/src/services/webhook.service.js`
- **Controller**: `/src/controllers/webhook.controller.js`
- **Routes**: `/src/routes/webhook.route.js`
- **Job**: `/src/jobs/webhookDelivery.job.js`

## Supported Events

```javascript
// Invoice events
'invoice.created'
'invoice.sent'
'invoice.paid'
'invoice.voided'
'invoice.updated'
'invoice.overdue'

// Payment events
'payment.received'
'payment.failed'
'payment.refunded'

// Client events
'client.created'
'client.updated'
'client.deleted'

// Case events
'case.created'
'case.closed'
'case.updated'
'case.status_changed'
'case.deleted'

// Expense events
'expense.submitted'
'expense.approved'
'expense.rejected'
'expense.paid'

// Time entry events
'time_entry.submitted'
'time_entry.approved'
'time_entry.rejected'

// Document events
'document.uploaded'
'document.signed'
'document.deleted'
'document.shared'
```

## Integration Examples

### 1. Trigger Webhook from Invoice Service

Update `/src/services/invoice.service.js` to trigger webhooks:

```javascript
const webhookService = require('./webhook.service');

// In createInvoice function, after invoice is saved:
async createInvoice(data, firmId, userId, context = {}) {
    // ... existing code ...

    await invoice.save();

    // Trigger webhook
    try {
        await webhookService.trigger('invoice.created', {
            _id: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            clientId: invoice.clientId,
            totalAmount: invoice.totalAmount,
            dueDate: invoice.dueDate,
            status: invoice.status
        }, firmId);
    } catch (error) {
        logger.error('Failed to trigger invoice.created webhook:', error);
        // Don't fail the invoice creation if webhook fails
    }

    return invoice;
}

// In sendInvoice function:
async sendInvoice(invoiceId, firmId, userId, context = {}) {
    // ... existing code ...

    invoice.status = 'sent';
    invoice.sentAt = new Date();
    await invoice.save();

    // Trigger webhook
    try {
        await webhookService.trigger('invoice.sent', {
            _id: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            clientId: invoice.clientId,
            totalAmount: invoice.totalAmount,
            dueDate: invoice.dueDate,
            sentAt: invoice.sentAt
        }, firmId);
    } catch (error) {
        logger.error('Failed to trigger invoice.sent webhook:', error);
    }

    return invoice;
}

// In applyPayment function:
async applyPayment(invoiceId, paymentData, firmId, userId, context = {}) {
    // ... existing code ...

    if (invoice.balanceDue <= 0) {
        invoice.status = 'paid';
        invoice.paidDate = new Date();
    }

    await invoice.save();

    // Trigger webhook
    try {
        const event = invoice.status === 'paid' ? 'invoice.paid' : 'payment.received';
        await webhookService.trigger(event, {
            _id: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            clientId: invoice.clientId,
            totalAmount: invoice.totalAmount,
            amountPaid: invoice.amountPaid,
            balanceDue: invoice.balanceDue,
            payment: {
                _id: payment._id,
                amount: payment.amount,
                paymentMethod: payment.paymentMethod,
                paymentDate: payment.paymentDate
            }
        }, firmId);
    } catch (error) {
        logger.error('Failed to trigger payment webhook:', error);
    }

    return { payment, invoice };
}

// In voidInvoice function:
async voidInvoice(invoiceId, reason, firmId, userId, context = {}) {
    // ... existing code ...

    invoice.status = 'void';
    invoice.voidedAt = new Date();
    invoice.voidReason = reason;
    await invoice.save();

    // Trigger webhook
    try {
        await webhookService.trigger('invoice.voided', {
            _id: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            clientId: invoice.clientId,
            reason: reason,
            voidedAt: invoice.voidedAt
        }, firmId);
    } catch (error) {
        logger.error('Failed to trigger invoice.voided webhook:', error);
    }

    return invoice;
}
```

### 2. Trigger Webhook from Other Services

#### Client Service Example
```javascript
// In client.service.js or client.controller.js

// After creating a client
try {
    await webhookService.trigger('client.created', {
        _id: client._id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phone: client.phone,
        type: client.type
    }, firmId);
} catch (error) {
    logger.error('Failed to trigger client.created webhook:', error);
}

// After updating a client
try {
    await webhookService.trigger('client.updated', {
        _id: client._id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        changes: changedFields // optional: track what changed
    }, firmId);
} catch (error) {
    logger.error('Failed to trigger client.updated webhook:', error);
}
```

#### Case Service Example
```javascript
// After creating a case
try {
    await webhookService.trigger('case.created', {
        _id: caseDoc._id,
        caseNumber: caseDoc.caseNumber,
        title: caseDoc.title,
        clientId: caseDoc.clientId,
        status: caseDoc.status,
        assignedTo: caseDoc.assignedTo
    }, firmId);
} catch (error) {
    logger.error('Failed to trigger case.created webhook:', error);
}

// After closing a case
try {
    await webhookService.trigger('case.closed', {
        _id: caseDoc._id,
        caseNumber: caseDoc.caseNumber,
        title: caseDoc.title,
        clientId: caseDoc.clientId,
        closedAt: caseDoc.closedAt,
        closureReason: caseDoc.closureReason
    }, firmId);
} catch (error) {
    logger.error('Failed to trigger case.closed webhook:', error);
}
```

#### Expense Service Example
```javascript
// After submitting an expense
try {
    await webhookService.trigger('expense.submitted', {
        _id: expense._id,
        userId: expense.userId,
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
        description: expense.description
    }, firmId);
} catch (error) {
    logger.error('Failed to trigger expense.submitted webhook:', error);
}

// After approving an expense
try {
    await webhookService.trigger('expense.approved', {
        _id: expense._id,
        userId: expense.userId,
        amount: expense.amount,
        approvedBy: userId,
        approvedAt: new Date()
    }, firmId);
} catch (error) {
    logger.error('Failed to trigger expense.approved webhook:', error);
}
```

#### Time Entry Service Example
```javascript
// After submitting a time entry
try {
    await webhookService.trigger('time_entry.submitted', {
        _id: timeEntry._id,
        userId: timeEntry.userId,
        caseId: timeEntry.caseId,
        hours: timeEntry.hours,
        date: timeEntry.date,
        description: timeEntry.description,
        billable: timeEntry.billable
    }, firmId);
} catch (error) {
    logger.error('Failed to trigger time_entry.submitted webhook:', error);
}
```

#### Document Service Example
```javascript
// After uploading a document
try {
    await webhookService.trigger('document.uploaded', {
        _id: document._id,
        fileName: document.fileName,
        fileType: document.fileType,
        fileSize: document.fileSize,
        caseId: document.caseId,
        uploadedBy: userId,
        uploadedAt: new Date()
    }, firmId);
} catch (error) {
    logger.error('Failed to trigger document.uploaded webhook:', error);
}

// After signing a document
try {
    await webhookService.trigger('document.signed', {
        _id: document._id,
        fileName: document.fileName,
        signedBy: userId,
        signedAt: new Date(),
        signatures: document.signatures
    }, firmId);
} catch (error) {
    logger.error('Failed to trigger document.signed webhook:', error);
}
```

## Best Practices

### 1. Error Handling
Always wrap webhook triggers in try-catch blocks to prevent webhook failures from breaking your main business logic:

```javascript
try {
    await webhookService.trigger(eventName, payload, firmId);
} catch (error) {
    logger.error(`Failed to trigger ${eventName} webhook:`, error);
    // Don't throw - webhook failures shouldn't break the main operation
}
```

### 2. Payload Structure
Include only necessary data in the payload. Don't send sensitive information unless required:

```javascript
// Good - minimal, necessary data
{
    _id: invoice._id,
    invoiceNumber: invoice.invoiceNumber,
    totalAmount: invoice.totalAmount,
    status: invoice.status
}

// Avoid - too much data, potential security issues
{
    ...invoice.toObject(),  // Includes everything, even internal fields
    client: { ...fullClientObject }  // Unnecessarily large
}
```

### 3. Performance
Webhook delivery is asynchronous. The trigger method creates delivery records and returns immediately without waiting for HTTP requests:

```javascript
// This is fast - just creates delivery records
await webhookService.trigger('invoice.created', payload, firmId);

// Actual HTTP delivery happens in background via the job
```

### 4. Testing Webhooks
Use the test endpoint to verify webhook configuration:

```javascript
POST /api/webhooks/:id/test
{
    "customField": "test data"
}
```

## Job Scheduler

The webhook delivery job runs automatically:
- **Pending deliveries**: Every 5 minutes
- **Retry failed**: Every 10 minutes
- **Cleanup old records**: Daily at 2 AM
- **Health check**: Every 6 hours

### Manual Job Triggers
```javascript
const { triggerJob } = require('./jobs/webhookDelivery.job');

// Trigger specific job
await triggerJob('processDeliveries');
await triggerJob('retryFailed');
await triggerJob('cleanup');
await triggerJob('healthCheck');

// Trigger all jobs
await triggerJob('all');
```

## Webhook Signature Verification

Recipients can verify webhook authenticity using the HMAC-SHA256 signature:

```javascript
// Recipient's code
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

// In webhook receiver endpoint
app.post('/webhook', (req, res) => {
    const signature = req.headers['x-webhook-signature'];
    const secret = 'your-webhook-secret';

    if (!verifyWebhookSignature(req.body, signature, secret)) {
        return res.status(401).json({ error: 'Invalid signature' });
    }

    // Process webhook...
    res.status(200).json({ received: true });
});
```

## Configuration

### Environment Variables
```bash
# Webhook delivery job
WEBHOOK_DELIVERY_CRON="*/5 * * * *"  # Every 5 minutes
WEBHOOK_DELIVERY_BATCH_SIZE=100

# Retry job
WEBHOOK_RETRY_CRON="*/10 * * * *"  # Every 10 minutes
WEBHOOK_RETRY_BATCH_SIZE=50

# Cleanup job
WEBHOOK_CLEANUP_CRON="0 2 * * *"  # Daily at 2 AM
WEBHOOK_RETENTION_DAYS=90

# Health check job
WEBHOOK_HEALTH_CRON="0 */6 * * *"  # Every 6 hours
WEBHOOK_FAILURE_THRESHOLD=80  # Auto-disable at 80% failure rate
WEBHOOK_MIN_DELIVERIES=10  # Minimum deliveries before auto-disable
```

## API Endpoints

```
POST   /api/webhooks              - Register new webhook
GET    /api/webhooks              - List all webhooks
GET    /api/webhooks/:id          - Get webhook details
PUT    /api/webhooks/:id          - Update webhook
DELETE /api/webhooks/:id          - Delete webhook

POST   /api/webhooks/:id/test     - Send test event
POST   /api/webhooks/:id/enable   - Enable webhook
POST   /api/webhooks/:id/disable  - Disable webhook

GET    /api/webhooks/:id/deliveries              - Get delivery history
GET    /api/webhooks/:id/deliveries/:deliveryId  - Get delivery details
POST   /api/webhooks/:id/deliveries/:deliveryId/retry - Retry failed delivery

GET    /api/webhooks/stats        - Get webhook statistics
GET    /api/webhooks/events       - List available events

GET    /api/webhooks/:id/secret           - Get webhook secret
POST   /api/webhooks/:id/regenerate-secret - Regenerate secret
```

## Monitoring

### Check Job Status
```javascript
const { getJobStatus } = require('./jobs/webhookDelivery.job');

const status = getJobStatus();
console.log(status);
```

### Check Webhook Statistics
```javascript
GET /api/webhooks/stats

{
    "webhooks": {
        "totalWebhooks": 5,
        "activeWebhooks": 4,
        "inactiveWebhooks": 1,
        "totalDeliveries": 1250,
        "successfulDeliveries": 1180,
        "failedDeliveries": 70
    },
    "deliveries": {
        "totalDeliveries": 1250,
        "successfulDeliveries": 1180,
        "failedDeliveries": 70,
        "pendingDeliveries": 15,
        "averageDuration": 234
    }
}
```

## Security Features

1. **SSRF Protection**: URLs are validated before registration and delivery
2. **HMAC Signatures**: All webhooks include HMAC-SHA256 signatures
3. **Firm Isolation**: Webhooks are isolated per firm (multi-tenant)
4. **Rate Limiting**: Optional rate limiting per webhook
5. **Auto-disable**: Webhooks with high failure rates are auto-disabled
6. **DNS Rebinding Protection**: URLs are re-validated before each delivery

## Troubleshooting

### Webhooks Not Firing
1. Check if webhook is active: `GET /api/webhooks/:id`
2. Verify event is subscribed: Check `events` array
3. Check filters: Ensure payload matches webhook filters
4. Review delivery history: `GET /api/webhooks/:id/deliveries`

### High Failure Rate
1. Test webhook endpoint: `POST /api/webhooks/:id/test`
2. Check delivery errors: Review error messages in delivery history
3. Verify signature verification on recipient side
4. Check webhook endpoint availability and response times

### Deliveries Not Retrying
1. Check retry policy configuration
2. Verify job scheduler is running
3. Check job status: `getJobStatus()`
4. Review job logs for errors

## Example: Complete Integration

Here's a complete example of integrating webhooks into an invoice workflow:

```javascript
// services/invoice.service.js
const webhookService = require('./webhook.service');
const logger = require('../utils/logger');

class InvoiceService {
    async createInvoice(data, firmId, userId) {
        // Create invoice
        const invoice = new Invoice({
            ...data,
            firmId,
            createdBy: userId
        });

        await invoice.save();

        // Trigger webhook (non-blocking)
        this.triggerWebhook('invoice.created', invoice, firmId);

        return invoice;
    }

    async sendInvoice(invoiceId, firmId) {
        const invoice = await Invoice.findById(invoiceId);
        invoice.status = 'sent';
        invoice.sentAt = new Date();
        await invoice.save();

        // Trigger webhook
        this.triggerWebhook('invoice.sent', invoice, firmId);

        return invoice;
    }

    async recordPayment(invoiceId, paymentData, firmId) {
        const invoice = await Invoice.findById(invoiceId);
        const payment = await Payment.create(paymentData);

        invoice.amountPaid += payment.amount;
        invoice.balanceDue -= payment.amount;

        if (invoice.balanceDue <= 0) {
            invoice.status = 'paid';
            invoice.paidDate = new Date();
        }

        await invoice.save();

        // Trigger appropriate webhook
        const event = invoice.status === 'paid' ? 'invoice.paid' : 'payment.received';
        this.triggerWebhook(event, { invoice, payment }, firmId);

        return { invoice, payment };
    }

    // Helper method to trigger webhooks safely
    async triggerWebhook(event, data, firmId) {
        try {
            // Prepare payload
            const payload = this.prepareWebhookPayload(event, data);

            // Trigger webhook (async, non-blocking)
            await webhookService.trigger(event, payload, firmId);

            logger.info(`Webhook triggered: ${event} for firm ${firmId}`);
        } catch (error) {
            // Log but don't throw - webhook failures shouldn't break business logic
            logger.error(`Failed to trigger ${event} webhook:`, error);
        }
    }

    // Prepare webhook payload based on event type
    prepareWebhookPayload(event, data) {
        // Extract invoice (could be invoice object or { invoice, payment } object)
        const invoice = data.invoice || data;

        // Base payload
        const payload = {
            _id: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            clientId: invoice.clientId,
            totalAmount: invoice.totalAmount,
            status: invoice.status
        };

        // Add event-specific data
        switch (event) {
            case 'invoice.paid':
                payload.paidDate = invoice.paidDate;
                payload.amountPaid = invoice.amountPaid;
                if (data.payment) {
                    payload.payment = {
                        _id: data.payment._id,
                        amount: data.payment.amount,
                        paymentMethod: data.payment.paymentMethod
                    };
                }
                break;

            case 'invoice.sent':
                payload.sentAt = invoice.sentAt;
                payload.dueDate = invoice.dueDate;
                break;

            case 'invoice.voided':
                payload.voidedAt = invoice.voidedAt;
                payload.voidReason = invoice.voidReason;
                break;
        }

        return payload;
    }
}

module.exports = new InvoiceService();
```

This integration guide provides everything needed to implement and use the webhook system throughout your application.
