# Recurring Invoice Job - Implementation Summary

## Overview

Successfully enhanced the recurring invoice job system with enterprise-grade features for automated invoice generation, monitoring, and error handling.

## Files Created/Modified

### 1. **NEW:** `/src/services/recurringInvoice.service.js`
Business logic layer for recurring invoice operations.

**Key Functions:**
- `processDueRecurringInvoices()` - Process all due recurring invoices
- `processRecurringInvoice()` - Process single recurring invoice with retry logic
- `createInvoiceFromRecurring()` - Create invoice from template
- `sendUpcomingNotifications()` - Send upcoming invoice notifications
- `cleanupCancelledRecurring()` - Clean up old cancelled records
- `sendInvoiceGeneratedNotification()` - Success notifications
- `sendFailureNotification()` - Failure notifications
- `sendCompletionNotification()` - Completion notifications
- `getStatistics()` - Get recurring invoice statistics
- `logRecurringInvoiceAudit()` - Audit trail logging

### 2. **ENHANCED:** `/src/jobs/recurringInvoice.job.js`
Job scheduler with advanced monitoring and error handling.

**Enhancements:**
- ✅ Configurable schedule via environment variables
- ✅ Automatic retry logic with exponential backoff (1s, 2s, 4s)
- ✅ Comprehensive statistics tracking
- ✅ Health monitoring and status reporting
- ✅ Job overlap prevention
- ✅ Audit logging for all operations
- ✅ Success/failure notifications
- ✅ Manual trigger support
- ✅ Graceful shutdown handling
- ✅ Timezone configuration

**Jobs:**
1. **Generate Invoices** - Process due recurring invoices (default: daily at 9 AM)
2. **Send Notifications** - Notify about upcoming invoices (default: daily at midnight)
3. **Cleanup** - Remove old cancelled records (default: daily at 1 AM)

### 3. **NEW:** `/RECURRING_INVOICE_JOB_CONFIG.md`
Comprehensive configuration and usage documentation.

## Features Implemented

### ✅ 1. Configurable Schedule (Daily by Default)

```bash
# Environment variables
RECURRING_INVOICE_CRON_SCHEDULE=0 9 * * *  # Daily at 9 AM
RECURRING_INVOICE_NOTIFICATION_CRON=0 0 * * *  # Daily at midnight
RECURRING_INVOICE_CLEANUP_CRON=0 1 * * *  # Daily at 1 AM
TZ=Asia/Riyadh  # Timezone
```

### ✅ 2. Process All Due Recurring Invoices

Uses the service layer to:
- Find all active recurring invoices with `nextGenerationDate <= now`
- Process each one sequentially
- Handle end conditions (end date, max occurrences)
- Generate new invoices from templates
- Update recurring invoice records
- Calculate next generation dates

### ✅ 3. Use Service for Business Logic

Complete separation of concerns:
- **Service Layer:** Business logic, data operations, validations
- **Job Layer:** Scheduling, monitoring, error handling, statistics

### ✅ 4. Graceful Error Handling with Retry Logic

**Job-Level Retries:**
- Exponential backoff: 1s → 2s → 4s
- Max retries: 3 (configurable via `RECURRING_INVOICE_MAX_RETRIES`)
- Failure notifications after all retries exhausted

**Recurring Invoice-Level Retries:**
- Tracks failure count per recurring invoice
- Auto-pause after 3 consecutive failures
- Notifications at each failure
- High-priority notification on auto-pause

### ✅ 5. Notifications on Success/Failure

**Success Notifications:**
- Invoice generated successfully
- Type: invoice
- Priority: medium
- Contains: invoice number, amount, recurring invoice name

**Failure Notifications:**
- Generation failed
- Type: error (if paused) or alert
- Priority: high (if paused) or medium
- Contains: error message, failure count, paused status

**Completion Notifications:**
- Recurring invoice completed
- Type: info
- Priority: low
- Contains: completion reason, total generated

**Job Summary Notifications:**
- Sent to system admins/monitoring
- Contains: statistics, errors, duration

### ✅ 6. Comprehensive Audit Logging

All operations logged to audit trail:
- `recurring_invoice_job_completed`
- `recurring_invoice_job_failed`
- `recurring_invoice_generated`
- `recurring_invoice_notifications_sent`
- `recurring_invoice_cleanup_completed`

Each entry includes:
- Action type
- Entity details
- Firm ID
- Timestamp
- Metadata (duration, results, errors)

### ✅ 7. Manual Trigger Support

```javascript
const { triggerJob } = require('./jobs/recurringInvoice.job');

// Trigger specific jobs
await triggerJob('generateInvoices');
await triggerJob('sendNotifications');
await triggerJob('cleanup');

// Trigger all jobs
await triggerJob('all');
```

### ✅ 8. Job Statistics Tracking

Comprehensive statistics for each job:

```javascript
{
  lastRun: Date,                    // Last execution time
  lastSuccess: Date,                // Last successful execution
  lastError: {                      // Last error details
    time: Date,
    message: String,
    stack: String
  },
  totalRuns: Number,                // Total executions
  totalProcessed: Number,           // Total items processed
  totalGenerated: Number,           // Total invoices generated
  totalFailed: Number,              // Total failures
  totalErrors: Number,              // Total errors
  consecutiveErrors: Number,        // Consecutive error count
  healthStatus: String              // 'healthy', 'warning', 'error', 'unknown'
}
```

**Health Status Calculation:**
- **healthy:** Running normally
- **warning:** Error rate > 50%
- **error:** Not run in 48 hours OR 3+ consecutive errors
- **unknown:** Never run

## Integration

The job is already integrated with server.js:

```javascript
// File: src/server.js (line 55)
const { startRecurringInvoiceJobs } = require('./jobs/recurringInvoice.job');

// Called on server startup (line 1259)
startRecurringInvoiceJobs();
```

The enhanced version will work seamlessly without any changes to server.js.

## Usage Examples

### Get Job Status

```javascript
const { getJobStatus } = require('./src/jobs/recurringInvoice.job');

const status = getJobStatus();
console.log(status);
```

**Output:**
```json
{
  "jobs": {
    "generateInvoices": {
      "running": false,
      "schedule": "0 9 * * *",
      "timezone": "Asia/Riyadh",
      "retries": 3,
      "description": "Process due recurring invoices and generate new invoices"
    },
    "sendNotifications": { "..." },
    "cleanup": { "..." }
  },
  "statistics": {
    "generateInvoices": {
      "lastRun": "2025-12-25T09:00:00.000Z",
      "lastSuccess": "2025-12-25T09:00:00.000Z",
      "totalRuns": 42,
      "totalProcessed": 150,
      "totalGenerated": 145,
      "totalFailed": 5,
      "totalErrors": 2,
      "consecutiveErrors": 0,
      "healthStatus": "healthy"
    }
  }
}
```

### Manual Trigger

```javascript
const { triggerJob } = require('./src/jobs/recurringInvoice.job');

// Trigger invoice generation
const result = await triggerJob('generateInvoices');
console.log(result);
```

**Output:**
```json
{
  "success": true,
  "processed": 15,
  "generated": 14,
  "failed": 1,
  "paused": 0,
  "completed": 2,
  "duration": 2345,
  "details": [
    {
      "recurringId": "...",
      "name": "Monthly Retainer",
      "action": "generated",
      "invoiceNumber": "INV-2025-001",
      "message": "Invoice INV-2025-001 generated successfully"
    }
  ]
}
```

### Reset Statistics

```javascript
const { resetJobStatistics } = require('./src/jobs/recurringInvoice.job');

// Reset specific job
resetJobStatistics('generateInvoices');

// Reset all jobs
resetJobStatistics();
```

## Environment Configuration

Add to `.env`:

```bash
# Recurring Invoice Job Configuration
RECURRING_INVOICE_CRON_SCHEDULE=0 9 * * *
RECURRING_INVOICE_MAX_RETRIES=3
RECURRING_INVOICE_NOTIFICATION_CRON=0 0 * * *
RECURRING_INVOICE_NOTIFICATION_DAYS=3
RECURRING_INVOICE_CLEANUP_CRON=0 1 * * *
RECURRING_INVOICE_CLEANUP_DAYS=30
TZ=Asia/Riyadh
```

## Testing

### Syntax Validation

Both files have been validated:
```bash
✓ Job file syntax is valid
✓ Service file syntax is valid
```

### Test Job Execution

```bash
# Start server
npm start

# In logs, you should see:
# [Recurring Invoice Jobs] Starting recurring invoice job scheduler...
# [Recurring Invoice Jobs] ✓ Invoice generation job: 0 9 * * * (Asia/Riyadh)
# [Recurring Invoice Jobs] ✓ Upcoming notifications job: 0 0 * * * (Asia/Riyadh)
# [Recurring Invoice Jobs] ✓ Cleanup job: 0 1 * * * (Asia/Riyadh)
# [Recurring Invoice Jobs] All recurring invoice jobs started successfully
```

### Manual Test

```bash
node -e "
const { triggerJob } = require('./src/jobs/recurringInvoice.job');
triggerJob('generateInvoices')
  .then(result => console.log('Success:', JSON.stringify(result, null, 2)))
  .catch(error => console.error('Error:', error));
"
```

## Monitoring

### Health Check

```javascript
const { getJobStatus } = require('./src/jobs/recurringInvoice.job');

setInterval(() => {
  const status = getJobStatus();

  Object.entries(status.statistics).forEach(([jobName, stats]) => {
    if (stats.healthStatus === 'error') {
      console.error(`🚨 Job ${jobName} is unhealthy!`);
      // Send alert
    }
  });
}, 60000); // Every minute
```

### Metrics to Monitor

1. **Execution Frequency:** Jobs should run on schedule
2. **Success Rate:** Should be > 95%
3. **Processing Time:** Monitor for slowdowns
4. **Error Rate:** Should be < 5%
5. **Health Status:** Should be 'healthy'

## Key Improvements Over Original

| Feature | Original | Enhanced |
|---------|----------|----------|
| Schedule | Hardcoded (every 15 min) | Configurable (default: daily at 9 AM) |
| Retry Logic | None | Exponential backoff, 3 retries |
| Statistics | Basic logging | Comprehensive tracking |
| Health Monitoring | None | Automatic health status |
| Error Notifications | Basic | Detailed with context |
| Audit Logging | None | Full audit trail |
| Manual Trigger | Basic | Advanced with options |
| Service Layer | Inline logic | Separate service |
| Timezone Support | None | Configurable |
| Job Overlap Prevention | Basic | Robust |

## Next Steps

1. **Monitor:** Check job execution logs after deployment
2. **Configure:** Set environment variables for your schedule
3. **Test:** Manually trigger jobs to verify functionality
4. **Alert:** Set up monitoring for job health status
5. **Optimize:** Review statistics and adjust configuration as needed

## Documentation

- **Configuration Guide:** `/RECURRING_INVOICE_JOB_CONFIG.md`
- **Service API:** See JSDoc comments in service file
- **Job API:** See JSDoc comments in job file

## Support

For issues or questions:
1. Check job status: `getJobStatus()`
2. Review logs for error messages
3. Check audit trail for execution history
4. Verify environment configuration
5. Test manually: `triggerJob('generateInvoices')`
