# IMPLEMENTATION RECOMMENDATIONS - Priority Actions

Based on the comprehensive 900+ file audit, here are the priority implementation recommendations.

---

## CRITICAL FIXES (Implement Immediately)

### 1. Fix Missing Job Initializations

**File:** `/src/server.js` (around line 1204)

Add these missing job initializations:

```javascript
// Add after existing job starts:
const { startEmailCampaignJobs } = require('./jobs/emailCampaign.job');
const { mlScoringJobs } = require('./jobs/mlScoring.job');
const { runAuditArchiving } = require('./jobs/auditLogArchiving.job');

// In the startup section:
startEmailCampaignJobs();
mlScoringJobs.startAllJobs();
scheduleSessionCleanup(); // Already imported, just call it
// Note: priceUpdater is for investments, enable if needed
```

---

### 2. Create Automatic FirmId Query Plugin

**New File:** `/src/models/plugins/autoFirmFilter.plugin.js`

```javascript
/**
 * Automatic Firm Filter Plugin
 * Prevents data leakage between firms by auto-injecting firmId in queries
 */
const logger = require('../../utils/logger');

module.exports = function autoFirmFilterPlugin(schema, options = {}) {
  const { skipPaths = [] } = options;

  // List of query operations to intercept
  const queryOps = ['find', 'findOne', 'findById', 'count', 'countDocuments', 'estimatedDocumentCount'];

  queryOps.forEach(op => {
    schema.pre(op, function(next) {
      // Skip if explicitly bypassed
      if (this.options.skipFirmFilter) {
        return next();
      }

      // Skip if no firm context provided
      if (!this.options.firmId && !this.options.userId) {
        logger.warn('Query executed without firm context', {
          model: this.model.modelName,
          operation: op
        });
        return next();
      }

      // Apply firm filter
      if (this.options.firmId) {
        this.where({ firmId: this.options.firmId });
      } else if (this.options.userId && this.options.isSoloLawyer) {
        // Solo lawyers filter by userId
        this.where({ lawyerId: this.options.userId });
      }

      next();
    });
  });

  // Update operations
  schema.pre(['updateOne', 'updateMany', 'findOneAndUpdate'], function(next) {
    if (this.options.skipFirmFilter) {
      return next();
    }

    if (this.options.firmId) {
      this.where({ firmId: this.options.firmId });
    }
    next();
  });

  // Delete operations
  schema.pre(['deleteOne', 'deleteMany', 'findOneAndDelete'], function(next) {
    if (this.options.skipFirmFilter) {
      return next();
    }

    if (this.options.firmId) {
      this.where({ firmId: this.options.firmId });
    }
    next();
  });
};
```

**Usage in models:**
```javascript
const autoFirmFilterPlugin = require('./plugins/autoFirmFilter.plugin');
invoiceSchema.plugin(autoFirmFilterPlugin);
```

**Usage in controllers:**
```javascript
// Queries will automatically filter by firmId
const invoices = await Invoice.find(
  { status: 'paid' },
  null,
  { firmId: req.firmId }
);
```

---

### 3. Token Revocation on Password Change

**File:** `/src/controllers/auth/passwordChange.controller.js`

Add after successful password change:

```javascript
const RefreshToken = require('../../models/refreshToken.model');
const Session = require('../../models/session.model');
const { tokenRevocationService } = require('../../services/tokenRevocation.service');

// Inside password change handler, after password is updated:
async function revokeAllTokens(userId, currentTokenId) {
  // Revoke all refresh token families except current session
  await RefreshToken.deleteMany({
    userId,
    _id: { $ne: currentTokenId }
  });

  // Terminate all sessions except current
  await Session.updateMany(
    { userId, _id: { $ne: currentTokenId } },
    { $set: { isTerminated: true, terminatedAt: new Date(), terminationReason: 'password_change' } }
  );

  // Add to token blacklist
  await tokenRevocationService.revokeAllUserTokens(userId, 'password_change');

  logger.info('All tokens revoked due to password change', { userId });
}
```

---

### 4. Create Stripe Service

**New File:** `/src/services/stripe.service.js`

```javascript
const Stripe = require('stripe');
const logger = require('../utils/logger');
const { withCircuitBreaker } = require('../utils/circuitBreaker');

class StripeService {
  constructor() {
    if (process.env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16',
        timeout: 30000
      });
    }
  }

  isConfigured() {
    return !!this.stripe;
  }

  async createPaymentIntent(amount, currency, metadata) {
    if (!this.isConfigured()) {
      throw new Error('Stripe not configured');
    }

    return withCircuitBreaker('stripe', async () => {
      return this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata,
        automatic_payment_methods: { enabled: true }
      });
    });
  }

  async confirmPaymentIntent(paymentIntentId) {
    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  async createRefund(paymentIntentId, amount, reason) {
    return this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
      reason: reason || 'requested_by_customer'
    });
  }

  verifyWebhookSignature(payload, signature) {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('Stripe webhook secret not configured');
    }

    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  }

  async createCustomer(email, name, metadata) {
    return this.stripe.customers.create({
      email,
      name,
      metadata
    });
  }

  async retrieveCustomer(customerId) {
    return this.stripe.customers.retrieve(customerId);
  }
}

module.exports = new StripeService();
```

---

### 5. Add Webhook Signature Verification

**File:** `/src/controllers/webhook.controller.js`

Add Stripe webhook handler:

```javascript
const stripeService = require('../services/stripe.service');

exports.handleStripeWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['stripe-signature'];

  if (!signature) {
    return res.status(400).json({ error: 'Missing signature' });
  }

  let event;
  try {
    event = stripeService.verifyWebhookSignature(req.rawBody, signature);
  } catch (err) {
    logger.error('Stripe webhook signature verification failed', { error: err.message });
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Handle event
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailure(event.data.object);
      break;
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object);
      break;
  }

  res.json({ received: true });
});
```

---

### 6. Fix Webhook FirmId Filtering

**File:** `/src/services/webhook.service.js`

Add firmId filtering to webhook delivery:

```javascript
async emit(event, data) {
  // Ensure firmId is present
  if (!data.firmId) {
    logger.warn('Webhook emitted without firmId', { event });
    return;
  }

  // Find webhooks for this firm and event
  const webhooks = await Webhook.find({
    firmId: data.firmId,
    events: event,
    isActive: true
  });

  // Filter sensitive data
  const sanitizedData = this.sanitizePayload(data);

  for (const webhook of webhooks) {
    await this.deliver(webhook, event, sanitizedData);
  }
}

sanitizePayload(data) {
  // Remove internal IDs, sensitive fields
  const sanitized = { ...data };
  delete sanitized._id;
  delete sanitized.__v;
  delete sanitized.internalNotes;
  delete sanitized.apiKeys;
  return sanitized;
}
```

---

### 7. Implement Circuit Breaker for External APIs

**File:** `/src/services/externalService.wrapper.js`

```javascript
const { withCircuitBreaker, getStats } = require('../utils/circuitBreaker');
const { withRetry } = require('../utils/retryWithBackoff');
const logger = require('../utils/logger');

// Pre-configured wrappers for each external service
const serviceConfigs = {
  stripe: { timeout: 30000, volumeThreshold: 10, errorThreshold: 50 },
  zatca: { timeout: 45000, volumeThreshold: 5, errorThreshold: 60 },
  resend: { timeout: 15000, volumeThreshold: 20, errorThreshold: 40 },
  whatsapp: { timeout: 20000, volumeThreshold: 15, errorThreshold: 50 },
  leantech: { timeout: 60000, volumeThreshold: 3, errorThreshold: 70 },
  wathq: { timeout: 45000, volumeThreshold: 5, errorThreshold: 60 },
  yakeen: { timeout: 45000, volumeThreshold: 5, errorThreshold: 60 },
  sadad: { timeout: 30000, volumeThreshold: 10, errorThreshold: 50 }
};

async function callExternalService(serviceName, fn, options = {}) {
  const config = serviceConfigs[serviceName] || serviceConfigs.stripe;

  return withCircuitBreaker(serviceName, async () => {
    return withRetry(fn, {
      maxAttempts: options.maxRetries || 3,
      initialDelay: 1000,
      maxDelay: 10000,
      retryIf: (error) => {
        // Retry on network errors and 5xx
        return error.code === 'ECONNREFUSED' ||
               error.code === 'ETIMEDOUT' ||
               (error.response && error.response.status >= 500);
      }
    });
  }, { timeout: config.timeout });
}

function getServiceHealth() {
  return Object.keys(serviceConfigs).map(name => ({
    service: name,
    ...getStats(name)
  }));
}

module.exports = { callExternalService, getServiceHealth };
```

---

## HIGH PRIORITY IMPROVEMENTS

### 8. Enable Validator Patterns in Production

**File:** `/src/validators/client.validator.js`

Change the pattern flags:

```javascript
// Replace:
// const DISABLE_PHONE_VALIDATION = true; // Playwright testing

// With:
const DISABLE_PHONE_VALIDATION = process.env.NODE_ENV === 'test';
const DISABLE_EMAIL_VALIDATION = process.env.NODE_ENV === 'test';
const DISABLE_NATIONALID_VALIDATION = process.env.NODE_ENV === 'test';
```

---

### 9. Add Dead Letter Queue

**File:** `/src/configs/queue.js`

Add DLQ configuration:

```javascript
const deadLetterQueue = new Bull('dead-letter', redisConfig);

// Configure each queue with DLQ
function createQueueWithDLQ(name, options = {}) {
  const queue = new Bull(name, redisConfig);

  queue.on('failed', async (job, err) => {
    if (job.attemptsMade >= job.opts.attempts) {
      // Move to dead letter queue
      await deadLetterQueue.add({
        originalQueue: name,
        jobData: job.data,
        error: err.message,
        failedAt: new Date(),
        attempts: job.attemptsMade
      });

      logger.error('Job moved to DLQ', {
        queue: name,
        jobId: job.id,
        error: err.message
      });
    }
  });

  return queue;
}

// Monitor DLQ
deadLetterQueue.process(async (job) => {
  // Alert admins about failed jobs
  await notificationService.alertAdmins({
    type: 'dlq_job',
    queue: job.data.originalQueue,
    error: job.data.error
  });
});
```

---

### 10. Add Health Check for Dependencies

**File:** `/src/routes/health.route.js`

Enhance health endpoint:

```javascript
router.get('/ready', asyncHandler(async (req, res) => {
  const checks = await Promise.allSettled([
    checkMongoDB(),
    checkRedis(),
    checkTemporalConnection(),
    checkExternalServices()
  ]);

  const results = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      mongodb: checks[0].status === 'fulfilled' ? 'up' : 'down',
      redis: checks[1].status === 'fulfilled' ? 'up' : 'down',
      temporal: checks[2].status === 'fulfilled' ? 'up' : 'down',
      external: checks[3].value || {}
    }
  };

  // If any critical service is down, return 503
  if (checks[0].status !== 'fulfilled' || checks[1].status !== 'fulfilled') {
    results.status = 'unhealthy';
    return res.status(503).json(results);
  }

  res.json(results);
}));

async function checkMongoDB() {
  await mongoose.connection.db.admin().ping();
}

async function checkRedis() {
  const client = getRedisClient();
  await client.ping();
}

async function checkExternalServices() {
  const { getServiceHealth } = require('../services/externalService.wrapper');
  return getServiceHealth();
}
```

---

## MEDIUM PRIORITY IMPROVEMENTS

### 11. Add Temporal FirmId Context

**File:** `/src/temporal/activities/invoiceApproval.activities.js`

Pass firmId to all activities:

```javascript
async function sendApprovalNotification(params) {
  const { invoiceId, approverId, firmId } = params;

  // Always include firmId in database queries
  const invoice = await Invoice.findOne(
    { _id: invoiceId },
    null,
    { firmId } // Pass firmId to auto-filter plugin
  );

  // Include firmId in notifications
  await notificationQueue.add({
    type: 'approval_request',
    userId: approverId,
    firmId,
    data: { invoiceId, amount: invoice.totalAmount }
  });
}
```

---

### 12. API Rate Limit Enforcement for Origin

**File:** `/src/middlewares/rateLimiter.middleware.js`

Add origin validation:

```javascript
const validateOrigin = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    const origin = req.headers.origin || req.headers.referer;

    // Allow requests with valid origin or from internal services
    if (!origin && !req.headers['x-internal-service']) {
      return res.status(403).json({
        success: false,
        error: 'Origin header required'
      });
    }
  }
  next();
};

// Apply before rate limiting
app.use('/api', validateOrigin);
```

---

## Summary Checklist

### Immediate Actions
- [ ] Add missing job initializations in server.js
- [ ] Create autoFirmFilter plugin
- [ ] Implement token revocation on password change
- [ ] Create Stripe service file
- [ ] Add webhook signature verification

### This Week
- [ ] Add circuit breaker to external API calls
- [ ] Implement dead letter queue
- [ ] Enable validator patterns in production
- [ ] Add comprehensive health checks

### This Month
- [ ] Add Temporal firmId context passing
- [ ] Complete MSG91/Twilio WhatsApp implementations
- [ ] Complete Leantech integration
- [ ] Add E2E tests with Playwright
- [ ] Implement API versioning enforcement

---

*Implementation guide generated from comprehensive 900+ file audit*
