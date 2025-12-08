# Bull Background Job Queue System

This directory contains all queue processors for handling background jobs asynchronously.

## Overview

The queue system uses Bull (built on Redis) to handle background jobs:
- **Email sending** - Transactional, bulk, and campaign emails
- **PDF generation** - Invoices, reports, contracts, statements
- **Push notifications** - Web push, SMS, in-app notifications
- **Report generation** - Financial reports, analytics, data exports
- **Data cleanup** - Old logs, temp files, expired sessions
- **External API sync** - WhatsApp, banking, payments, government systems

## Architecture

```
src/
├── configs/
│   └── queue.js          # Queue factory and configuration
├── queues/               # Job processors
│   ├── email.queue.js
│   ├── pdf.queue.js
│   ├── notification.queue.js
│   ├── report.queue.js
│   ├── cleanup.queue.js
│   └── sync.queue.js
├── services/
│   └── queue.service.js  # Unified queue service API
└── routes/
    └── queue.route.js    # Admin queue management endpoints
```

## Queue Configuration

### Default Job Options

All queues use these default options (can be overridden per job):

```javascript
{
  attempts: 3,                    // Retry failed jobs 3 times
  backoff: {
    type: 'exponential',          // Exponential backoff between retries
    delay: 2000                   // Start with 2 second delay
  },
  removeOnComplete: {
    age: 86400,                   // Keep completed jobs for 24 hours
    count: 1000                   // Keep last 1000 completed jobs
  },
  removeOnFail: {
    age: 172800                   // Keep failed jobs for 48 hours
  }
}
```

### Redis Connection

Configured via environment variables:
```env
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_password_here
```

## Usage Examples

### 1. Sending Emails

```javascript
const QueueService = require('../services/queue.service');

// Send single email
await QueueService.sendEmail({
  to: 'client@example.com',
  subject: 'Invoice #12345',
  html: '<h1>Your invoice is ready</h1>',
  replyTo: 'support@traf3li.com'
});

// Send bulk emails
await QueueService.sendBulkEmails(
  [
    { email: 'user1@example.com', name: 'User 1' },
    { email: 'user2@example.com', name: 'User 2' }
  ],
  'Newsletter Title',
  '<p>Hello {{name}}, ...</p>'
);
```

### 2. Generating PDFs

```javascript
// Generate invoice PDF
await QueueService.generatePDF(
  {
    invoiceId: '507f1f77bcf86cd799439011',
    invoiceData: {
      invoiceNumber: 'INV-2024-001',
      clientName: 'Client Name',
      items: [/* ... */],
      totalAmount: 5000
    }
  },
  'invoice',
  { priority: 1 } // High priority
);

// Generate report PDF
await QueueService.generatePDF(
  {
    reportId: '507f1f77bcf86cd799439012',
    reportData: {/* ... */},
    reportType: 'financial'
  },
  'report'
);
```

### 3. Sending Notifications

```javascript
// In-app notification
await QueueService.sendNotification({
  userId: '507f1f77bcf86cd799439013',
  title: 'Payment Received',
  message: 'Your payment of SAR 5,000 has been received',
  type: 'success',
  link: '/invoices/123'
}, 'in-app');

// Push notification
await QueueService.sendNotification({
  userId: '507f1f77bcf86cd799439013',
  subscription: pushSubscription,
  title: 'New Message',
  body: 'You have a new message from your lawyer'
}, 'push');
```

### 4. Generating Reports

```javascript
await QueueService.generateReport(
  {
    firmId: '507f1f77bcf86cd799439014',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    reportType: 'financial'
  },
  'financial',
  { priority: 2 }
);
```

### 5. Scheduling Cleanup Tasks

```javascript
// Clean old logs
await QueueService.scheduleCleanup('old-logs', {
  retentionDays: 30
});

// Clean temporary files
await QueueService.scheduleCleanup('temp-files', {
  maxAgeHours: 24
});

// Clean expired sessions
await QueueService.scheduleCleanup('sessions');
```

### 6. Syncing External APIs

```javascript
// Sync WhatsApp messages
await QueueService.scheduleSync('whatsapp-messages', {
  firmId: '507f1f77bcf86cd799439014',
  phoneNumberId: 'whatsapp_phone_id'
});

// Sync bank transactions
await QueueService.scheduleSync('bank-transactions', {
  firmId: '507f1f77bcf86cd799439014',
  bankAccountId: '507f1f77bcf86cd799439015',
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});

// Sync payment status
await QueueService.scheduleSync('payment-status', {
  paymentId: '507f1f77bcf86cd799439016',
  paymentProvider: 'stripe'
});
```

## Advanced Usage

### Adding Custom Job Options

```javascript
await QueueService.addJob('email', {
  type: 'transactional',
  data: {/* ... */}
}, {
  priority: 1,          // Higher priority (1-10, lower is higher priority)
  delay: 5000,          // Delay job by 5 seconds
  attempts: 5,          // Override default attempts
  backoff: {
    type: 'fixed',
    delay: 10000
  },
  timeout: 30000,       // Job timeout (30 seconds)
  removeOnComplete: true
});
```

### Adding Bulk Jobs

```javascript
const jobs = [
  { data: { type: 'transactional', data: email1 }, options: { priority: 1 } },
  { data: { type: 'transactional', data: email2 }, options: { priority: 2 } },
  { data: { type: 'transactional', data: email3 }, options: { priority: 3 } }
];

await QueueService.addBulkJobs('email', jobs);
```

### Monitoring Job Status

```javascript
// Get job status
const status = await QueueService.getJobStatus('email', 'job-id-123');
console.log(status);
// {
//   jobId: 'job-id-123',
//   state: 'completed',
//   progress: 100,
//   returnValue: { success: true, messageId: 'msg-456' },
//   ...
// }

// Get queue statistics
const stats = await QueueService.getQueueStats('email');
console.log(stats);
// {
//   name: 'email',
//   waiting: 5,
//   active: 2,
//   completed: 1000,
//   failed: 10,
//   delayed: 0,
//   paused: false
// }
```

## Queue Management (Admin Only)

All queue management endpoints require authentication and admin role:

### List All Queues

```bash
GET /api/queues
```

Response:
```json
{
  "success": true,
  "count": 6,
  "data": [
    {
      "name": "email",
      "waiting": 5,
      "active": 2,
      "completed": 1000,
      "failed": 10,
      "delayed": 0,
      "paused": false
    },
    // ...
  ]
}
```

### Get Queue Jobs

```bash
GET /api/queues/email/jobs?status=failed&start=0&end=10
```

### Retry Failed Job

```bash
POST /api/queues/email/retry/job-id-123
```

### Remove Job

```bash
DELETE /api/queues/email/jobs/job-id-123
```

### Pause/Resume Queue

```bash
POST /api/queues/email/pause
POST /api/queues/email/resume
```

### Clean Old Jobs

```bash
POST /api/queues/email/clean
Content-Type: application/json

{
  "gracePeriod": 86400000,
  "type": "completed"
}
```

### Empty Queue

```bash
POST /api/queues/email/empty
```

## Event Handlers

Each queue automatically logs important events:

- ✅ **completed** - Job finished successfully
- ❌ **failed** - Job failed after all retry attempts
- ⚠️  **stalled** - Job is taking too long (worker may have crashed)
- ⏳ **waiting** - Job added to queue
- 🔄 **active** - Job is being processed
- 📊 **progress** - Job progress updated
- 🗑️  **removed** - Job removed from queue
- 🧹 **cleaned** - Old jobs cleaned up
- ✨ **drained** - All jobs in queue processed
- ⏸️  **paused** - Queue paused
- ▶️  **resumed** - Queue resumed
- 💥 **error** - Queue error

## Best Practices

1. **Use queues for time-consuming tasks**
   - Email sending
   - PDF generation
   - Report generation
   - External API calls
   - File processing

2. **Set appropriate priorities**
   - Critical: 1 (e.g., password reset emails)
   - High: 2 (e.g., invoice PDFs)
   - Normal: 3-5 (e.g., regular emails)
   - Low: 6-10 (e.g., cleanup tasks)

3. **Monitor queue health**
   - Check `/api/queues` endpoint regularly
   - Set up alerts for high failure rates
   - Monitor queue length to prevent backlog

4. **Handle failures gracefully**
   - Set appropriate retry attempts
   - Use exponential backoff
   - Log failures for debugging
   - Alert admins for critical job failures

5. **Clean up old jobs**
   - Schedule regular cleanup tasks
   - Keep completed jobs for 24-48 hours
   - Keep failed jobs longer for debugging

## Troubleshooting

### Queue not processing jobs

1. Check Redis connection:
   ```bash
   redis-cli ping
   ```

2. Check queue status:
   ```bash
   GET /api/queues/email
   ```

3. Resume paused queue:
   ```bash
   POST /api/queues/email/resume
   ```

### High failure rate

1. Check failed jobs:
   ```bash
   GET /api/queues/email/jobs?status=failed
   ```

2. Check job details:
   ```bash
   GET /api/queues/email/jobs/job-id-123
   ```

3. Retry failed jobs:
   ```bash
   POST /api/queues/email/retry/job-id-123
   ```

### Queue growing too fast

1. Check queue metrics:
   ```bash
   GET /api/queues
   ```

2. Increase concurrency (in queue processor file):
   ```javascript
   queue.process(5, async (job) => {
     // Process 5 jobs concurrently
   });
   ```

3. Pause queue temporarily if needed:
   ```bash
   POST /api/queues/email/pause
   ```

## Environment Variables

```env
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password

# Email Configuration (Resend)
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@traf3li.com
FROM_NAME=Traf3li

# Push Notification (Web Push)
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
CONTACT_EMAIL=support@traf3li.com
```

## Integration with Existing Code

The queue system is already integrated with:

1. **Email Service** (`src/services/email.service.js`)
   - All emails now use queue by default
   - Fallback to sync sending if queue fails

2. **Invoice Controller** (`src/controllers/invoice.controller.js`)
   - PDF generation endpoint uses queue
   - Returns job ID for status tracking

3. **Report Controller** (`src/controllers/report.controller.js`)
   - Report generation uses queue
   - Reports marked as 'queued' status

## Next Steps

To add a new queue processor:

1. Create new file in `src/queues/` (e.g., `myqueue.queue.js`)
2. Define queue and processor logic
3. Import in `src/services/queue.service.js`
4. Add convenience methods to QueueService
5. Update this README with usage examples

Example:
```javascript
// src/queues/myqueue.queue.js
const { createQueue } = require('../configs/queue');

const myQueue = createQueue('myqueue');

myQueue.process(async (job) => {
  const { type, data } = job.data;

  // Process job
  console.log(`Processing ${type}:`, data);

  // Update progress
  await job.progress(50);

  // Return result
  return { success: true };
});

module.exports = myQueue;
```
