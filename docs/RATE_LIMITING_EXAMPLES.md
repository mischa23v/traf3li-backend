# Rate Limiting - Usage Examples

## Table of Contents
1. [Basic Setup](#basic-setup)
2. [Route Examples](#route-examples)
3. [Service Layer Examples](#service-layer-examples)
4. [Admin Management Examples](#admin-management-examples)
5. [Custom Rate Limiters](#custom-rate-limiters)
6. [Analytics Examples](#analytics-examples)

## Basic Setup

### 1. Global Application Setup

```javascript
// app.js or server.js
const express = require('express');
const {
  globalRateLimiter,
  perUserRateLimiter,
  burstProtectionMiddleware,
  adaptiveRateLimiter
} = require('./middlewares/rateLimiter.middleware');

const app = express();

// Apply rate limiting middleware (in order)
app.use(globalRateLimiter);           // Layer 1: Global IP-based limit
app.use(burstProtectionMiddleware);   // Layer 2: Burst protection
app.use(perUserRateLimiter);          // Layer 3: User-based limit
app.use(adaptiveRateLimiter);         // Layer 4: Adaptive adjustment
```

### 2. Legacy Middleware (Backward Compatible)

```javascript
// If you're already using the old middleware, it still works
const { smartRateLimiter } = require('./middlewares/rateLimiter.middleware');

app.use(smartRateLimiter); // Automatically applies authenticated or unauthenticated limits
```

## Route Examples

### 1. Authentication Routes

```javascript
// routes/auth.route.js
const express = require('express');
const { authRateLimiter, sensitiveRateLimiter } = require('../middlewares/rateLimiter.middleware');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// Login - 5 attempts per 15 minutes
router.post('/login', authRateLimiter, authController.login);

// Register - 3 attempts per 15 minutes
router.post('/register', authRateLimiter, authController.register);

// Password reset - 3 attempts per hour (very strict)
router.post('/password-reset', sensitiveRateLimiter, authController.resetPassword);

// MFA verification
router.post('/mfa/verify', authRateLimiter, authController.verifyMFA);

module.exports = router;
```

### 2. API Routes with Endpoint-Specific Limits

```javascript
// routes/api.route.js
const express = require('express');
const { endpointRateLimiter } = require('../middlewares/rateLimiter.middleware');
const { authenticate } = require('../middlewares');
const apiController = require('../controllers/api.controller');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Upload endpoints - strict limits
router.post('/upload/document',
  endpointRateLimiter('upload', 'document'),
  apiController.uploadDocument
);

router.post('/upload/image',
  endpointRateLimiter('upload', 'image'),
  apiController.uploadImage
);

router.post('/upload/bulk',
  endpointRateLimiter('upload', 'bulk'),
  apiController.bulkUpload
);

// Export endpoints
router.get('/export/pdf',
  endpointRateLimiter('export', 'pdf'),
  apiController.exportPDF
);

router.get('/export/excel',
  endpointRateLimiter('export', 'excel'),
  apiController.exportExcel
);

// Search endpoints
router.get('/search',
  endpointRateLimiter('search'),
  apiController.search
);

// Payment endpoints - very strict
router.post('/payment/process',
  endpointRateLimiter('payment'),
  apiController.processPayment
);

module.exports = router;
```

### 3. Admin Routes

```javascript
// routes/admin/index.js
const express = require('express');
const { authenticate } = require('../middlewares');
const { adminAuth } = require('../middlewares/adminAuth.middleware');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(adminAuth);
router.use(apiRateLimiter); // Higher limit for admins

// Mount rate limit management routes
router.use('/rate-limits', require('./rateLimit.route'));

module.exports = router;
```

## Service Layer Examples

### 1. Manual Rate Limit Check

```javascript
// controllers/custom.controller.js
const rateLimitingService = require('../services/rateLimiting.service');

const customAction = async (req, res) => {
  try {
    const userId = req.userId || req.userID;
    const key = `rate-limit:custom-action:${userId}`;

    // Check limit: 10 requests per hour
    const limit = 10;
    const window = 3600; // 1 hour in seconds

    const result = await rateLimitingService.checkLimit(key, limit, window);

    if (!result.allowed) {
      // Track throttled request
      await rateLimitingService.trackRequest(userId.toString(), req.path, true);

      return res.status(429).json({
        success: false,
        error: 'تم تجاوز حد الطلبات لهذا الإجراء',
        error_en: 'Rate limit exceeded for this action',
        resetIn: result.resetIn
      });
    }

    // Increment counter
    await rateLimitingService.incrementCounter(key, window);

    // Track successful request
    await rateLimitingService.trackRequest(userId.toString(), req.path, false);

    // Perform action
    // ...

    res.json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

### 2. Get User's Limits

```javascript
// controllers/account.controller.js
const rateLimitingService = require('../services/rateLimiting.service');

const getMyLimits = async (req, res) => {
  try {
    const userId = req.userId || req.userID;

    // Get user's current limits
    const limits = await rateLimitingService.getLimitForUser(userId);

    // Get current usage
    const usageStats = await rateLimitingService.getUsageStats(userId, 'day');

    // Get adaptive limit info
    const key = `rate-limit:user:${userId}`;
    const adaptiveLimit = await rateLimitingService.getAdaptiveLimit(
      key,
      limits.requestsPerMinute
    );

    res.json({
      success: true,
      limits: {
        tier: limits.tier,
        requestsPerMinute: limits.requestsPerMinute,
        requestsPerDay: limits.requestsPerDay,
        burstLimit: limits.burstLimit,
        adaptive: adaptiveLimit.adjusted,
        effectiveLimit: adaptiveLimit.adaptiveLimit
      },
      usage: {
        today: usageStats.total,
        throttled: usageStats.throttled,
        remaining: limits.requestsPerDay - usageStats.total
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

### 3. Reset Limit After Special Action

```javascript
// controllers/subscription.controller.js
const rateLimitingService = require('../services/rateLimiting.service');

const upgradePlan = async (req, res) => {
  try {
    const userId = req.userId || req.userID;
    const { newPlan } = req.body;

    // Upgrade subscription
    // ... (upgrade logic)

    // Reset rate limits after upgrade
    const key = `rate-limit:user:${userId}`;
    await rateLimitingService.resetLimit(key);

    // Log upgrade
    logger.info(`User ${userId} upgraded to ${newPlan} - rate limits reset`);

    res.json({
      success: true,
      message: 'تم ترقية الخطة بنجاح',
      message_en: 'Plan upgraded successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

## Admin Management Examples

### 1. View User's Rate Limit Status

```javascript
// Client-side request
const getUserRateLimitStatus = async (userId) => {
  const response = await fetch(`/api/admin/rate-limits/users/${userId}`, {
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  });

  const data = await response.json();

  console.log('User:', data.user);
  console.log('Limits:', data.limits);
  console.log('Adaptive:', data.adaptiveLimit);
  console.log('Usage:', data.usage);
};
```

### 2. Reset User's Rate Limit

```javascript
// Client-side request
const resetUserRateLimit = async (userId) => {
  const response = await fetch(`/api/admin/rate-limits/users/${userId}/reset`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();

  if (data.success) {
    console.log('Rate limit reset successfully');
  }
};
```

### 3. Adjust User's Rate Limit

```javascript
// Client-side request
const adjustUserRateLimit = async (userId, factor, duration) => {
  const response = await fetch(`/api/admin/rate-limits/users/${userId}/adjust`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      factor: factor,      // e.g., 1.5 for 50% increase, 0.7 for 30% decrease
      duration: duration   // in seconds, e.g., 86400 for 24 hours
    })
  });

  const data = await response.json();

  if (data.success) {
    console.log(`Rate limit adjusted by factor ${factor} for ${duration}s`);
  }
};

// Example: Increase user's limit by 50% for 7 days
adjustUserRateLimit('user123', 1.5, 7 * 24 * 60 * 60);

// Example: Decrease user's limit by 30% for 24 hours
adjustUserRateLimit('user456', 0.7, 24 * 60 * 60);
```

### 4. View Firm's Top Users

```javascript
// Client-side request
const getFirmTopUsers = async (firmId, period = 'day', limit = 10) => {
  const response = await fetch(
    `/api/admin/rate-limits/firms/${firmId}/top-users?period=${period}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    }
  );

  const data = await response.json();

  console.log('Top Users:');
  data.topUsers.forEach((user, index) => {
    console.log(`${index + 1}. ${user.user.name} (${user.user.email})`);
    console.log(`   Total requests: ${user.total}`);
    console.log(`   Throttled: ${user.throttled}`);
  });
};
```

### 5. Monitor Throttled Requests

```javascript
// Client-side request
const getFirmThrottledRequests = async (firmId, period = 'day') => {
  const response = await fetch(
    `/api/admin/rate-limits/firms/${firmId}/throttled?period=${period}`,
    {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    }
  );

  const data = await response.json();

  console.log(`Total requests: ${data.total}`);
  console.log(`Throttled requests: ${data.throttled}`);
  console.log(`Throttle rate: ${data.throttleRate}%`);

  console.log('\nUsers with throttled requests:');
  data.users.forEach(user => {
    console.log(`- ${user.user.name}: ${user.throttled} throttled`);
  });
};
```

## Custom Rate Limiters

### 1. Create Custom Rate Limiter for Specific Feature

```javascript
// middleware/customRateLimiter.js
const rateLimitingService = require('../services/rateLimiting.service');

// Rate limiter for AI chat feature
const aiChatRateLimiter = async (req, res, next) => {
  try {
    const userId = req.userId || req.userID;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const key = `rate-limit:ai-chat:${userId}`;

    // Different limits based on subscription tier
    const userLimits = await rateLimitingService.getLimitForUser(userId);
    const tier = userLimits.tier;

    // Define AI chat limits per tier
    const limits = {
      free: { perMinute: 5, perDay: 50 },
      starter: { perMinute: 10, perDay: 200 },
      professional: { perMinute: 30, perDay: 1000 },
      enterprise: { perMinute: 100, perDay: -1 }
    };

    const limit = limits[tier] || limits.free;

    // Check per-minute limit
    const minuteResult = await rateLimitingService.checkLimit(
      `${key}:minute`,
      limit.perMinute,
      60
    );

    if (!minuteResult.allowed) {
      return res.status(429).json({
        success: false,
        error: 'تم تجاوز حد استخدام الذكاء الاصطناعي',
        error_en: 'AI chat rate limit exceeded',
        resetIn: minuteResult.resetIn
      });
    }

    // Check per-day limit (if not unlimited)
    if (limit.perDay !== -1) {
      const dayResult = await rateLimitingService.checkLimit(
        `${key}:day`,
        limit.perDay,
        86400
      );

      if (!dayResult.allowed) {
        return res.status(429).json({
          success: false,
          error: 'تم تجاوز الحد اليومي لاستخدام الذكاء الاصطناعي',
          error_en: 'Daily AI chat limit exceeded',
          resetIn: dayResult.resetIn
        });
      }

      await rateLimitingService.incrementCounter(`${key}:day`, 86400);
    }

    await rateLimitingService.incrementCounter(`${key}:minute`, 60);

    next();
  } catch (error) {
    logger.error('AI chat rate limiter error:', error.message);
    // Fail open
    next();
  }
};

module.exports = { aiChatRateLimiter };
```

### 2. Use Custom Rate Limiter

```javascript
// routes/aiChat.route.js
const express = require('express');
const { authenticate } = require('../middlewares');
const { aiChatRateLimiter } = require('../middlewares/customRateLimiter');
const aiChatController = require('../controllers/aiChat.controller');

const router = express.Router();

router.use(authenticate);

// Apply custom rate limiter
router.post('/chat', aiChatRateLimiter, aiChatController.sendMessage);
router.get('/history', aiChatRateLimiter, aiChatController.getHistory);

module.exports = router;
```

## Analytics Examples

### 1. Display User's Usage Dashboard

```javascript
// Client-side component
const UserUsageDashboard = () => {
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    const fetchUsage = async () => {
      const response = await fetch('/api/account/rate-limits', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      setUsage(data);
    };

    fetchUsage();
  }, []);

  if (!usage) return <div>Loading...</div>;

  return (
    <div className="usage-dashboard">
      <h2>API Usage</h2>

      <div className="tier-info">
        <span>Current Plan: {usage.limits.tier}</span>
        {usage.limits.adaptive && (
          <span className="adaptive-badge">Adaptive Limit Active</span>
        )}
      </div>

      <div className="limits">
        <div className="limit-item">
          <span>Requests per minute:</span>
          <span>{usage.limits.effectiveLimit}</span>
        </div>
        <div className="limit-item">
          <span>Requests per day:</span>
          <span>{usage.limits.requestsPerDay === -1 ? 'Unlimited' : usage.limits.requestsPerDay}</span>
        </div>
        <div className="limit-item">
          <span>Burst limit:</span>
          <span>{usage.limits.burstLimit}</span>
        </div>
      </div>

      <div className="usage-stats">
        <h3>Today's Usage</h3>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${(usage.usage.today / usage.limits.requestsPerDay) * 100}%` }}
          />
        </div>
        <div className="stats">
          <span>Used: {usage.usage.today}</span>
          <span>Throttled: {usage.usage.throttled}</span>
          <span>Remaining: {usage.usage.remaining}</span>
        </div>
      </div>
    </div>
  );
};
```

### 2. Admin Analytics Dashboard

```javascript
// Admin component to view firm statistics
const FirmAnalyticsDashboard = ({ firmId }) => {
  const [stats, setStats] = useState(null);
  const [topUsers, setTopUsers] = useState([]);
  const [throttled, setThrottled] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      // Get firm limits
      const limitsRes = await fetch(`/api/admin/rate-limits/firms/${firmId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const limitsData = await limitsRes.json();
      setStats(limitsData);

      // Get top users
      const topUsersRes = await fetch(
        `/api/admin/rate-limits/firms/${firmId}/top-users?period=day&limit=10`,
        { headers: { 'Authorization': `Bearer ${adminToken}` } }
      );
      const topUsersData = await topUsersRes.json();
      setTopUsers(topUsersData.topUsers);

      // Get throttled requests
      const throttledRes = await fetch(
        `/api/admin/rate-limits/firms/${firmId}/throttled?period=day`,
        { headers: { 'Authorization': `Bearer ${adminToken}` } }
      );
      const throttledData = await throttledRes.json();
      setThrottled(throttledData);
    };

    fetchData();
  }, [firmId]);

  if (!stats) return <div>Loading...</div>;

  return (
    <div className="firm-analytics">
      <h2>Firm: {stats.firm.name}</h2>
      <p>Tier: {stats.limits.tier}</p>

      <div className="overview">
        <h3>Usage Overview</h3>
        <p>Total Requests: {throttled?.total || 0}</p>
        <p>Throttled: {throttled?.throttled || 0} ({throttled?.throttleRate}%)</p>
      </div>

      <div className="top-users">
        <h3>Top Users (Today)</h3>
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Total Requests</th>
              <th>Throttled</th>
            </tr>
          </thead>
          <tbody>
            {topUsers.map(user => (
              <tr key={user.userId}>
                <td>{user.user?.name} ({user.user?.email})</td>
                <td>{user.total}</td>
                <td>{user.throttled}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

## Testing Examples

### 1. Unit Test for Rate Limiting Service

```javascript
// tests/services/rateLimiting.service.test.js
const rateLimitingService = require('../../src/services/rateLimiting.service');

describe('Rate Limiting Service', () => {
  test('checkLimit should return allowed when under limit', async () => {
    const key = 'test-key';
    const result = await rateLimitingService.checkLimit(key, 100, 60);

    expect(result.allowed).toBe(true);
    expect(result.current).toBeLessThan(100);
  });

  test('checkLimit should return exceeded when over limit', async () => {
    const key = 'test-key-exceeded';

    // Make 101 requests
    for (let i = 0; i < 101; i++) {
      await rateLimitingService.incrementCounter(key, 60);
    }

    const result = await rateLimitingService.checkLimit(key, 100, 60);

    expect(result.allowed).toBe(false);
    expect(result.exceeded).toBe(true);
  });

  test('resetLimit should clear counter', async () => {
    const key = 'test-key-reset';

    await rateLimitingService.incrementCounter(key, 60);
    await rateLimitingService.resetLimit(key);

    const result = await rateLimitingService.checkLimit(key, 100, 60);
    expect(result.current).toBe(0);
  });
});
```

### 2. Integration Test for Rate Limiter Middleware

```javascript
// tests/integration/rateLimiter.test.js
const request = require('supertest');
const app = require('../../src/app');

describe('Rate Limiter Middleware', () => {
  test('should allow requests under limit', async () => {
    const token = 'valid-jwt-token';

    for (let i = 0; i < 10; i++) {
      const response = await request(app)
        .get('/api/test-endpoint')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).not.toBe(429);
    }
  });

  test('should block requests over limit', async () => {
    const token = 'valid-jwt-token';

    // Make requests until rate limited
    let rateLimited = false;
    for (let i = 0; i < 500; i++) {
      const response = await request(app)
        .get('/api/test-endpoint')
        .set('Authorization', `Bearer ${token}`);

      if (response.status === 429) {
        rateLimited = true;
        expect(response.body.code).toBe('RATE_LIMIT_EXCEEDED');
        break;
      }
    }

    expect(rateLimited).toBe(true);
  });
});
```

These examples cover the most common use cases for the rate limiting system. For more specific scenarios, refer to the main documentation in `RATE_LIMITING.md`.
