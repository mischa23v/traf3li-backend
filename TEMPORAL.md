# Temporal Workflow Orchestration

## Overview

Temporal is a durable execution platform that orchestrates workflows and activities with built-in reliability, fault tolerance, and observability. This guide covers setting up Temporal for local development with the Traf3li backend.

## Quick Start

### 1. Start Temporal Services

```bash
# Start all Temporal services (temporal, postgresql, ui, admin-tools)
npm run temporal:up

# Verify services are running
docker-compose -f docker-compose.temporal.yml ps
```

### 2. Access Temporal UI

```bash
# Print UI URL
npm run temporal:ui

# Open in browser: http://localhost:8088
```

### 3. View Logs

```bash
# Follow Temporal server logs
npm run temporal:logs

# View all services logs
docker-compose -f docker-compose.temporal.yml logs -f
```

### 4. Stop Temporal Services

```bash
# Stop all services
npm run temporal:down

# Stop and remove volumes (clean slate)
docker-compose -f docker-compose.temporal.yml down -v
```

## Architecture Overview

### Services

1. **Temporal Server** (`temporal`)
   - Port: 7233 (gRPC)
   - Manages workflow execution and state
   - Stores workflow history in PostgreSQL
   - Configuration: `/temporal-config/development-sql.yaml`

2. **PostgreSQL** (`temporal-postgresql`)
   - Port: 5433 (mapped from 5432 to avoid conflicts)
   - Stores workflow state, history, and visibility data
   - Credentials: temporal/temporal
   - Database: temporal

3. **Temporal UI** (`temporal-ui`)
   - Port: 8088 (mapped from 8080 to avoid conflicts)
   - Web interface for monitoring workflows
   - View workflow executions, task queues, search attributes
   - Debug workflow histories and failures

4. **Admin Tools** (`temporal-admin-tools`)
   - Interactive container with `tctl` CLI
   - Manage namespaces, workflows, and cluster settings
   - Access via: `npm run temporal:cli`

### Network Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Temporal Network                       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐         ┌──────────────────┐          │
│  │ Temporal UI  │────────▶│ Temporal Server  │          │
│  │ :8088        │         │ :7233            │          │
│  └──────────────┘         └─────────┬────────┘          │
│                                      │                   │
│  ┌──────────────┐                   │                   │
│  │ Admin Tools  │───────────────────┘                   │
│  │ (tctl)       │                                        │
│  └──────────────┘         ┌──────────────────┐          │
│                           │   PostgreSQL     │          │
│  ┌──────────────┐         │   :5432 (5433)   │          │
│  │ Your App     │────────▶│   temporal DB    │          │
│  │ Worker       │         └──────────────────┘          │
│  └──────────────┘                                        │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Workflow Development Guide

### Installing Temporal SDK

```bash
npm install @temporalio/worker @temporalio/client @temporalio/workflow @temporalio/activity
```

### Project Structure

```
src/
├── workflows/
│   ├── definitions/          # Workflow definitions
│   │   ├── invoiceProcessing.ts
│   │   ├── reportGeneration.ts
│   │   └── dataSync.ts
│   ├── activities/           # Activity implementations
│   │   ├── invoiceActivities.ts
│   │   ├── reportActivities.ts
│   │   └── syncActivities.ts
│   └── worker.ts            # Worker process
├── temporal/
│   ├── client.ts            # Temporal client singleton
│   └── config.ts            # Temporal configuration
└── server.js
```

### Example: Invoice Processing Workflow

**1. Define Activities** (`src/workflows/activities/invoiceActivities.ts`)

```typescript
import { Activity } from '@temporalio/activity';

export async function validateInvoice(invoiceId: string): Promise<boolean> {
  // Validate invoice data
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    throw new Error(`Invoice ${invoiceId} not found`);
  }
  return invoice.isValid();
}

export async function sendInvoiceEmail(invoiceId: string): Promise<void> {
  // Send invoice via email
  const invoice = await Invoice.findById(invoiceId);
  await emailService.sendInvoice(invoice);
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: string
): Promise<void> {
  await Invoice.findByIdAndUpdate(invoiceId, { status });
}
```

**2. Define Workflow** (`src/workflows/definitions/invoiceProcessing.ts`)

```typescript
import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../activities/invoiceActivities';

const {
  validateInvoice,
  sendInvoiceEmail,
  updateInvoiceStatus
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '1m',
    maximumAttempts: 5,
  },
});

export async function processInvoiceWorkflow(invoiceId: string): Promise<void> {
  // Step 1: Validate invoice
  await updateInvoiceStatus(invoiceId, 'validating');
  const isValid = await validateInvoice(invoiceId);

  if (!isValid) {
    await updateInvoiceStatus(invoiceId, 'invalid');
    throw new Error('Invoice validation failed');
  }

  // Step 2: Send invoice email
  await updateInvoiceStatus(invoiceId, 'sending');
  await sendInvoiceEmail(invoiceId);

  // Step 3: Mark as sent
  await updateInvoiceStatus(invoiceId, 'sent');
}
```

**3. Create Worker** (`src/workflows/worker.ts`)

```typescript
import { Worker } from '@temporalio/worker';
import * as activities from './activities/invoiceActivities';
import { getTemporalConnection } from '../temporal/client';

async function run() {
  const connection = await getTemporalConnection();

  const worker = await Worker.create({
    connection,
    namespace: 'default',
    taskQueue: 'traf3li-invoices',
    workflowsPath: require.resolve('./definitions/invoiceProcessing'),
    activities,
    maxConcurrentActivityTaskExecutions: 10,
    maxConcurrentWorkflowTaskExecutions: 10,
  });

  console.log('Worker started on task queue: traf3li-invoices');
  await worker.run();
}

run().catch(err => {
  console.error('Worker failed:', err);
  process.exit(1);
});
```

**4. Create Temporal Client** (`src/temporal/client.ts`)

```typescript
import { Connection, Client } from '@temporalio/client';

let connection: Connection | null = null;
let client: Client | null = null;

export async function getTemporalConnection(): Promise<Connection> {
  if (!connection) {
    connection = await Connection.connect({
      address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    });
  }
  return connection;
}

export async function getTemporalClient(): Promise<Client> {
  if (!client) {
    const conn = await getTemporalConnection();
    client = new Client({
      connection: conn,
      namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    });
  }
  return client;
}
```

**5. Start Workflow from API** (`src/routes/invoices.js`)

```typescript
import { getTemporalClient } from '../temporal/client';
import { processInvoiceWorkflow } from '../workflows/definitions/invoiceProcessing';

router.post('/invoices/:id/process', async (req, res) => {
  const { id } = req.params;

  try {
    const client = await getTemporalClient();

    const handle = await client.workflow.start(processInvoiceWorkflow, {
      args: [id],
      taskQueue: 'traf3li-invoices',
      workflowId: `invoice-${id}-${Date.now()}`,
    });

    res.json({
      success: true,
      workflowId: handle.workflowId,
      runId: handle.firstExecutionRunId,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Use Cases for Temporal in Traf3li

1. **Invoice Processing**
   - Validate invoice data
   - Generate PDF
   - Send email notifications
   - Update accounting records
   - Handle payment webhooks

2. **Report Generation**
   - Aggregate data from multiple sources
   - Generate charts and visualizations
   - Export to PDF/Excel
   - Email to recipients
   - Archive in S3

3. **Data Synchronization**
   - Sync with external accounting systems
   - Import bank statements
   - Reconcile transactions
   - Handle failures and retries

4. **Scheduled Jobs**
   - Monthly financial close
   - Weekly backup operations
   - Daily report generation
   - Quarterly tax calculations

5. **Multi-step Business Processes**
   - Purchase order approval workflow
   - Expense reimbursement
   - Contract renewal reminders
   - Customer onboarding

## Configuration

### Environment Variables

Update `.env` or `.env.temporal.example`:

```env
# Temporal Server Connection
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default

# Temporal Worker Configuration
TEMPORAL_TASK_QUEUE=traf3li-default
TEMPORAL_MAX_CONCURRENT_ACTIVITIES=10
TEMPORAL_MAX_CONCURRENT_WORKFLOWS=10

# Temporal Logging
TEMPORAL_LOG_LEVEL=info

# Temporal Namespace (if using custom namespace)
TEMPORAL_NAMESPACE=traf3li-production
```

### Dynamic Configuration

Edit `temporal-config/development-sql.yaml`:

```yaml
# Maximum workflow ID length
limit.maxIDLength:
  - value: 1000
    constraints: {}

# Force cache refresh for search attributes
system.forceSearchAttributesCacheRefreshOnRead:
  - value: true
    constraints: {}

# Workflow execution timeout
system.defaultWorkflowTaskTimeout:
  - value: 10s
    constraints: {}

# Activity execution timeout
system.defaultActivityTaskTimeout:
  - value: 5m
    constraints: {}
```

## CLI Commands

### Using tctl (Temporal CLI)

```bash
# Access tctl
npm run temporal:cli

# Or directly
docker-compose -f docker-compose.temporal.yml exec temporal-admin-tools tctl

# List workflows
tctl workflow list

# Describe workflow
tctl workflow describe -w <workflow-id>

# Show workflow history
tctl workflow show -w <workflow-id>

# Signal workflow
tctl workflow signal -w <workflow-id> -n <signal-name> -i <signal-data>

# Cancel workflow
tctl workflow cancel -w <workflow-id>

# Terminate workflow
tctl workflow terminate -w <workflow-id>

# Create namespace
tctl namespace register --global_namespace false traf3li-production

# List namespaces
tctl namespace list

# Describe task queue
tctl taskqueue describe -t <task-queue-name>
```

## Testing Workflows

### Unit Testing Activities

```typescript
import { validateInvoice } from '../activities/invoiceActivities';

describe('Invoice Activities', () => {
  it('should validate valid invoice', async () => {
    const result = await validateInvoice('invoice-123');
    expect(result).toBe(true);
  });

  it('should reject invalid invoice', async () => {
    await expect(validateInvoice('invalid-id')).rejects.toThrow();
  });
});
```

### Integration Testing Workflows

```typescript
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { processInvoiceWorkflow } from '../definitions/invoiceProcessing';
import * as activities from '../activities/invoiceActivities';

describe('Invoice Processing Workflow', () => {
  let testEnv: TestWorkflowEnvironment;

  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createLocal();
  });

  afterAll(async () => {
    await testEnv?.teardown();
  });

  it('should process invoice successfully', async () => {
    const { client, nativeConnection } = testEnv;

    const worker = await Worker.create({
      connection: nativeConnection,
      taskQueue: 'test-queue',
      workflowsPath: require.resolve('../definitions/invoiceProcessing'),
      activities,
    });

    await worker.runUntil(async () => {
      const handle = await client.workflow.start(processInvoiceWorkflow, {
        args: ['invoice-123'],
        taskQueue: 'test-queue',
        workflowId: 'test-workflow',
      });

      const result = await handle.result();
      expect(result).toBeDefined();
    });
  });
});
```

## Monitoring and Observability

### Temporal UI

Access at http://localhost:8088

**Features:**
- View all workflow executions
- Filter by status (Running, Completed, Failed, etc.)
- Search workflows by ID or attributes
- Inspect workflow history and event timeline
- View task queue backlogs
- Debug failures with stack traces

### Key Metrics to Monitor

1. **Workflow Metrics**
   - Workflow execution rate
   - Workflow success/failure ratio
   - Workflow duration
   - Long-running workflows

2. **Activity Metrics**
   - Activity execution rate
   - Activity retry count
   - Activity timeout frequency
   - Activity failure patterns

3. **Task Queue Metrics**
   - Queue backlog size
   - Task dispatch latency
   - Worker availability
   - Task processing rate

4. **System Metrics**
   - Database connection pool
   - Memory usage
   - CPU utilization
   - Network latency

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

**Error:** `Bind for 0.0.0.0:7233 failed: port is already allocated`

**Solution:**
```bash
# Check what's using the port
lsof -i :7233

# Stop conflicting service or change port in docker-compose.temporal.yml
```

#### 2. Worker Not Connecting

**Error:** `Failed to connect to Temporal server`

**Solution:**
```bash
# Verify Temporal is running
docker-compose -f docker-compose.temporal.yml ps

# Check logs
npm run temporal:logs

# Verify connection settings
echo $TEMPORAL_ADDRESS
```

#### 3. Workflow Stuck in Running State

**Solution:**
```bash
# Check if worker is running
ps aux | grep worker

# View workflow history in UI
# Navigate to: http://localhost:8088

# Describe workflow via CLI
npm run temporal:cli
tctl workflow describe -w <workflow-id>
```

#### 4. Database Connection Issues

**Error:** `Error connecting to PostgreSQL`

**Solution:**
```bash
# Check PostgreSQL logs
docker-compose -f docker-compose.temporal.yml logs temporal-postgresql

# Restart PostgreSQL
docker-compose -f docker-compose.temporal.yml restart temporal-postgresql

# Verify database is created
docker-compose -f docker-compose.temporal.yml exec temporal-postgresql psql -U temporal -c '\l'
```

#### 5. Activity Timeout

**Error:** `Activity task timed out`

**Solution:**
```typescript
// Increase activity timeout
const activities = proxyActivities({
  startToCloseTimeout: '10 minutes', // Increased from 5 minutes
  scheduleToCloseTimeout: '15 minutes',
});
```

#### 6. Workflow History Too Large

**Error:** `Workflow history size limit exceeded`

**Solution:**
```typescript
// Use continueAsNew for long-running workflows
import { continueAsNew } from '@temporalio/workflow';

export async function longRunningWorkflow(iteration: number): Promise<void> {
  // Process data
  await processData();

  // Continue as new after certain iterations
  if (iteration >= 100) {
    await continueAsNew<typeof longRunningWorkflow>(0);
  } else {
    await continueAsNew<typeof longRunningWorkflow>(iteration + 1);
  }
}
```

### Reset Development Environment

```bash
# Stop all services
npm run temporal:down

# Remove all data (clean slate)
docker-compose -f docker-compose.temporal.yml down -v

# Start fresh
npm run temporal:up
```

### Debug Mode

Enable detailed logging:

```bash
# Edit temporal-config/development-sql.yaml
system.enableDebugMode:
  - value: true
    constraints: {}

# Restart Temporal
npm run temporal:down && npm run temporal:up
```

## Production Considerations

### High Availability

For production deployments:

1. **Use Temporal Cloud** (Recommended)
   - Managed service
   - Built-in HA and disaster recovery
   - Global replication
   - https://temporal.io/cloud

2. **Self-Hosted HA Setup**
   - Multiple Temporal server instances
   - Load balancer (nginx/HAProxy)
   - PostgreSQL replication
   - Redis for caching (optional)

### Security

1. **mTLS Authentication**
   ```typescript
   const connection = await Connection.connect({
     address: 'temporal.production.com:7233',
     tls: {
       clientCertPair: {
         crt: fs.readFileSync('client.crt'),
         key: fs.readFileSync('client.key'),
       },
       serverNameOverride: 'temporal.production.com',
       serverRootCACertificate: fs.readFileSync('ca.crt'),
     },
   });
   ```

2. **Namespace Isolation**
   - Separate namespaces per environment (dev, staging, prod)
   - Separate namespaces per tenant (multi-tenancy)

3. **Data Encryption**
   - Encrypt sensitive data in workflow inputs
   - Use data converters for payload encryption

### Performance Tuning

1. **Worker Scaling**
   ```typescript
   const worker = await Worker.create({
     maxConcurrentActivityTaskExecutions: 100,
     maxConcurrentWorkflowTaskExecutions: 100,
     maxCachedWorkflows: 1000,
   });
   ```

2. **Database Optimization**
   - Regular VACUUM on PostgreSQL
   - Archive old workflow executions
   - Monitor query performance

3. **Resource Limits**
   - Set appropriate memory limits
   - Configure CPU affinity
   - Monitor GC pauses

## Resources

- [Temporal Documentation](https://docs.temporal.io/)
- [TypeScript SDK](https://typescript.temporal.io/)
- [Temporal Samples](https://github.com/temporalio/samples-typescript)
- [Temporal Community](https://community.temporal.io/)
- [Temporal Academy](https://learn.temporal.io/)

## Support

For issues or questions:
1. Check Temporal UI at http://localhost:8088
2. Review workflow logs: `npm run temporal:logs`
3. Consult this documentation
4. Visit Temporal community forums
5. Contact DevOps team
