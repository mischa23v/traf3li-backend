# Recurring Invoice Job Configuration

This document describes the enhanced recurring invoice job system and its configuration options.

## Overview

The recurring invoice job has been enhanced with:
- ✅ Configurable schedule via environment variables
- ✅ Automatic retry logic with exponential backoff
- ✅ Comprehensive error handling and notifications
- ✅ Job statistics tracking and health monitoring
- ✅ Audit logging for compliance
- ✅ Manual trigger support for testing/admin
- ✅ Service-based architecture for business logic separation
- ✅ Multi-tenant support with firm isolation

## Environment Variables

Add these to your `.env` file to customize the job behavior:

```bash
# Recurring Invoice Job Configuration
# ====================================

# Invoice Generation Job
# Schedule in cron format (default: '0 9 * * *' - daily at 9 AM)
RECURRING_INVOICE_CRON_SCHEDULE=0 9 * * *

# Maximum retries for failed invoice generation (default: 3)
RECURRING_INVOICE_MAX_RETRIES=3

# Notification Job
# Schedule for sending upcoming invoice notifications (default: '0 0 * * *' - daily at midnight)
RECURRING_INVOICE_NOTIFICATION_CRON=0 0 * * *

# Days ahead to look for upcoming invoices (default: 3)
RECURRING_INVOICE_NOTIFICATION_DAYS=3

# Cleanup Job
# Schedule for cleaning up cancelled invoices (default: '0 1 * * *' - daily at 1 AM)
RECURRING_INVOICE_CLEANUP_CRON=0 1 * * *

# Days to retain cancelled recurring invoices before deletion (default: 30)
RECURRING_INVOICE_CLEANUP_DAYS=30

# Timezone for all jobs (default: 'Asia/Riyadh')
TZ=Asia/Riyadh

# Job startup delay after server start (default: 3000ms)
CRON_STARTUP_DELAY_MS=3000
```

## Architecture

### Service Layer (`src/services/recurringInvoice.service.js`)

The service handles all business logic:
- `processDueRecurringInvoices()` - Process all due recurring invoices
- `processRecurringInvoice()` - Process a single recurring invoice
- `createInvoiceFromRecurring()` - Create invoice from template
- `sendUpcomingNotifications()` - Send upcoming invoice notifications
- `cleanupCancelledRecurring()` - Clean up old cancelled records
- `getStatistics()` - Get recurring invoice statistics

### Job Layer (`src/jobs/recurringInvoice.job.js`)

The job handles scheduling and monitoring:
- Three scheduled jobs: generation, notifications, cleanup
- Retry logic with exponential backoff
- Statistics tracking
- Health monitoring
- Manual trigger support

## Jobs

### 1. Invoice Generation Job

**Purpose:** Process all due recurring invoices and generate new invoices

**Default Schedule:** Daily at 9 AM (configurable)

**Process:**
1. Find all active recurring invoices due for generation
2. For each recurring invoice:
   - Check end conditions (end date, max occurrences)
   - Generate new invoice from template
   - Update recurring invoice record
   - Calculate next generation date
   - Send notification
   - Log to audit trail
3. Track statistics and handle failures
4. Auto-pause after 3 consecutive failures

**Environment Variables:**
- `RECURRING_INVOICE_CRON_SCHEDULE` - Cron schedule
- `RECURRING_INVOICE_MAX_RETRIES` - Max retry attempts

### 2. Notification Job

**Purpose:** Send notifications for upcoming recurring invoices

**Default Schedule:** Daily at midnight (configurable)

**Process:**
1. Find recurring invoices that will generate in the next N days
2. Send notification to invoice creator
3. Track sent notifications

**Environment Variables:**
- `RECURRING_INVOICE_NOTIFICATION_CRON` - Cron schedule
- `RECURRING_INVOICE_NOTIFICATION_DAYS` - Days ahead to look

### 3. Cleanup Job

**Purpose:** Clean up old cancelled recurring invoices

**Default Schedule:** Daily at 1 AM (configurable)

**Process:**
1. Find cancelled recurring invoices older than N days
2. Delete records with no generated invoices
3. Track deletion count

**Environment Variables:**
- `RECURRING_INVOICE_CLEANUP_CRON` - Cron schedule
- `RECURRING_INVOICE_CLEANUP_DAYS` - Retention period in days

## Retry Logic

The invoice generation job implements automatic retry with exponential backoff:

- **Attempt 1:** Immediate
- **Attempt 2:** After 1 second
- **Attempt 3:** After 2 seconds
- **Attempt 4:** After 4 seconds

After all retries are exhausted, the job logs the error and sends a notification.

Individual recurring invoices also have retry logic:
- **First failure:** Logged, notification sent
- **Second failure:** Logged, notification sent
- **Third failure:** Auto-paused, high-priority notification sent

## Statistics Tracking

The job tracks comprehensive statistics for monitoring:

```javascript
{
  generateInvoices: {
    lastRun: Date,
    lastSuccess: Date,
    lastError: { time: Date, message: String, stack: String },
    totalRuns: Number,
    totalProcessed: Number,
    totalGenerated: Number,
    totalFailed: Number,
    totalErrors: Number,
    consecutiveErrors: Number,
    healthStatus: 'healthy' | 'warning' | 'error' | 'unknown'
  },
  sendNotifications: { /* ... */ },
  cleanup: { /* ... */ }
}
```

## Health Monitoring

Each job has a health status calculated based on:
- Time since last run (error if > 48 hours)
- Consecutive errors (error if >= 3)
- Error rate (warning if > 50%)

Health statuses:
- **healthy** - Job running normally
- **warning** - High error rate
- **error** - Not running or too many errors
- **unknown** - Never run

## Manual Triggering

Jobs can be manually triggered for testing or admin purposes:

```javascript
const { triggerJob } = require('./jobs/recurringInvoice.job');

// Trigger specific job
await triggerJob('generateInvoices');
await triggerJob('sendNotifications');
await triggerJob('cleanup');

// Trigger all jobs
await triggerJob('all');
```

## API Endpoints

If you have job routes configured, you can trigger jobs via API:

```bash
# Get job status
GET /api/jobs/recurring-invoices/status

# Trigger job
POST /api/jobs/recurring-invoices/trigger
{
  "job": "generateInvoices" | "sendNotifications" | "cleanup" | "all"
}

# Reset statistics
POST /api/jobs/recurring-invoices/reset-stats
{
  "job": "generateInvoices" // optional, resets all if not provided
}
```

## Audit Logging

All job executions are logged to the audit trail:

**Actions logged:**
- `recurring_invoice_job_completed` - Job completed successfully
- `recurring_invoice_job_failed` - Job failed after all retries
- `recurring_invoice_generated` - Invoice generated from recurring template
- `recurring_invoice_notifications_sent` - Notifications sent
- `recurring_invoice_cleanup_completed` - Cleanup completed

**Audit entry includes:**
- Action type
- Entity type and ID
- Firm ID
- User ID (system)
- Timestamp
- Metadata (duration, results, errors, etc.)

## Notifications

### Success Notifications

Sent when an invoice is generated successfully:
- **Type:** invoice
- **Priority:** medium
- **Recipient:** Invoice creator
- **Content:** Invoice number, recurring invoice name, amount

### Failure Notifications

Sent when invoice generation fails:
- **Type:** error (if paused) or alert (if not paused)
- **Priority:** high (if paused) or medium
- **Recipient:** Invoice creator
- **Content:** Error message, failure count, paused status

### Completion Notifications

Sent when a recurring invoice completes (end date or max occurrences reached):
- **Type:** info
- **Priority:** low
- **Recipient:** Invoice creator
- **Content:** Completion reason, total invoices generated

## Testing

### Test job locally

```bash
# Start server
npm start

# In another terminal, trigger job manually
node -e "
const { triggerJob } = require('./src/jobs/recurringInvoice.job');
triggerJob('generateInvoices').then(console.log).catch(console.error);
"
```

### Check job status

```javascript
const { getJobStatus } = require('./src/jobs/recurringInvoice.job');
const status = getJobStatus();
console.log(JSON.stringify(status, null, 2));
```

## Monitoring

Monitor job health in your application:

```javascript
const { getJobStatus } = require('./src/jobs/recurringInvoice.job');

setInterval(() => {
  const status = getJobStatus();

  // Check health
  Object.entries(status.statistics).forEach(([jobName, stats]) => {
    if (stats.healthStatus === 'error') {
      console.error(`🚨 Job ${jobName} is unhealthy!`);
      // Send alert to monitoring system
    } else if (stats.healthStatus === 'warning') {
      console.warn(`⚠️ Job ${jobName} has high error rate`);
    }
  });
}, 60000); // Check every minute
```

## Troubleshooting

### Job not running

1. Check if job is enabled in server.js
2. Verify environment variables are set correctly
3. Check server logs for startup errors
4. Verify database connection is healthy

### High failure rate

1. Check job statistics: `getJobStatus()`
2. Review recent error messages
3. Check database connectivity
4. Verify recurring invoice model integrity
5. Check for data validation errors

### Job stuck or slow

1. Check for deadlocks or long-running queries
2. Review job statistics for performance metrics
3. Check database indexes
4. Monitor memory usage
5. Check for concurrent job execution issues

### Invoices not generating

1. Verify recurring invoices exist with status 'active'
2. Check `nextGenerationDate` is in the past
3. Review failure logs for specific recurring invoices
4. Manually trigger job to test: `triggerJob('generateInvoices')`
5. Check for auto-paused invoices (3+ failures)

## Performance Optimization

### Database Indexes

Ensure these indexes exist for optimal performance:

```javascript
// RecurringInvoice collection
db.recurringinvoices.createIndex({ status: 1, nextGenerationDate: 1 });
db.recurringinvoices.createIndex({ firmId: 1, status: 1 });
db.recurringinvoices.createIndex({ createdAt: 1, status: 1, generatedCount: 1 });

// Invoice collection
db.invoices.createIndex({ recurringInvoiceId: 1 });
```

### Batch Processing

The job processes recurring invoices sequentially to avoid overwhelming the database. For high-volume scenarios, consider:

1. Processing in smaller batches
2. Implementing queue-based processing
3. Horizontal scaling with job distribution

## Security Considerations

1. **Access Control:** Only system administrators should be able to trigger jobs manually
2. **Audit Logging:** All job executions are logged for compliance
3. **Data Isolation:** Jobs respect multi-tenant boundaries (firmId)
4. **Error Messages:** Sensitive information is not exposed in error messages
5. **Rate Limiting:** Jobs include overlap prevention to avoid duplicate processing

## Future Enhancements

Potential improvements:
- Queue-based processing for high volume
- Distributed job execution
- Real-time job monitoring dashboard
- Email/SMS alerts for job failures
- Job execution history and analytics
- A/B testing for job schedules
- Machine learning for optimal scheduling
- Webhook notifications for job events
