# Rate Limiting System

## Overview

The rate limiting system provides comprehensive protection against API abuse with tiered limits based on subscription plans, burst protection, adaptive rate limiting, and detailed analytics.

## Features

### Core Rate Limiting
- **Redis-based distributed rate limiting** - Works across multiple server instances
- **Tiered limits** - Different limits for free, starter, professional, and enterprise tiers
- **Per-endpoint limits** - Different limits for auth, API, upload, export, etc.
- **Per-user limits** - Individual user rate limiting
- **Per-firm limits** - Firm-wide rate limiting

### Advanced Features
- **Burst protection** - Prevents rapid-fire requests
- **Adaptive rate limiting** - Automatically adjusts limits based on user behavior
- **Usage analytics** - Track request patterns and throttled requests
- **Rate limit headers** - Standard X-RateLimit-* headers in responses

## Subscription Tier Limits

### Free Tier
- **Requests per minute**: 100
- **Requests per day**: 1,000
- **Burst limit**: 20 requests per 10 seconds
- **Concurrent requests**: 5
- **API access**: No

### Starter Tier
- **Requests per minute**: 300
- **Requests per day**: 10,000
- **Burst limit**: 50 requests per 10 seconds
- **Concurrent requests**: 10
- **API access**: No

### Professional Tier
- **Requests per minute**: 1,000
- **Requests per day**: 100,000
- **Burst limit**: 150 requests per 10 seconds
- **Concurrent requests**: 25
- **API access**: Yes

### Enterprise Tier
- **Requests per minute**: 5,000
- **Requests per day**: Unlimited
- **Burst limit**: 500 requests per 10 seconds
- **Concurrent requests**: 100
- **API access**: Yes

## Endpoint Categories

Different endpoint categories have different rate limits:

### Authentication Endpoints
- **Login**: 5 req/min, 20 req/hour
- **Register**: 3 req/min, 10 req/hour
- **Password Reset**: 3 req/hour, 5 req/day
- **MFA**: 10 req/min, 30 req/hour

### Upload Endpoints
- **Document**: 10 req/min, 50 req/hour, 200 req/day
- **Image**: 20 req/min, 100 req/hour, 500 req/day
- **Bulk**: 2 req/min, 10 req/hour, 50 req/day

### Export Endpoints
- **PDF**: 10 req/min, 50 req/hour
- **Excel**: 10 req/min, 50 req/hour
- **Bulk**: 2 req/min, 10 req/hour

### Payment Endpoints
- **Very strict**: 5 req/min, 20 req/hour, 50 req/day

### Search Endpoints
- **Moderate**: 30 req/min, 500 req/hour

## Usage

### Basic Middleware

```javascript
const {
  smartRateLimiter,
  authRateLimiter,
  uploadRateLimiter,
  paymentRateLimiter
} = require('./middlewares/rateLimiter.middleware');

// Apply smart rate limiter globally (automatically chooses authenticated or unauthenticated)
app.use(smartRateLimiter);

// Apply to specific routes
router.post('/auth/login', authRateLimiter, loginController);
router.post('/upload', uploadRateLimiter, uploadController);
router.post('/payment', paymentRateLimiter, paymentController);
```

### Enhanced Middleware

```javascript
const {
  globalRateLimiter,
  perUserRateLimiter,
  perFirmRateLimiter,
  burstProtectionMiddleware,
  endpointRateLimiter
} = require('./middlewares/rateLimiter.middleware');

// Global rate limiter (IP-based)
app.use(globalRateLimiter);

// Per-user rate limiter (subscription tier-based)
app.use(perUserRateLimiter);

// Per-firm rate limiter
app.use(perFirmRateLimiter);

// Burst protection
app.use(burstProtectionMiddleware);

// Endpoint-specific rate limiter
router.post('/api/upload', endpointRateLimiter('upload', 'document'), uploadController);
router.get('/api/export/pdf', endpointRateLimiter('export', 'pdf'), exportController);
```

### Service Layer

```javascript
const rateLimitingService = require('./services/rateLimiting.service');

// Check if limit is exceeded
const key = `rate-limit:user:${userId}`;
const result = await rateLimitingService.checkLimit(key, 100, 60);
if (!result.allowed) {
  // Rate limit exceeded
  return res.status(429).json({ error: 'Rate limit exceeded' });
}

// Increment counter
await rateLimitingService.incrementCounter(key, 60);

// Get remaining requests
const remaining = await rateLimitingService.getRemaining(key, 100, 60);

// Reset limit
await rateLimitingService.resetLimit(key);

// Get user's limits
const limits = await rateLimitingService.getLimitForUser(userId);

// Get firm's limits
const firmLimits = await rateLimitingService.getLimitForFirm(firmId);

// Track request for analytics
await rateLimitingService.trackRequest(userId, '/api/endpoint', false);

// Get usage statistics
const stats = await rateLimitingService.getUsageStats(userId, 'day');
```

## Adaptive Rate Limiting

The system automatically adjusts rate limits based on user behavior:

### Good Behavior
- If user consistently uses < 50% of their limit
- Limit is increased by 50%
- Duration: 7 days
- Minimum observation period: 24 hours

### Suspicious Behavior
- If user consistently hits > 95% of their limit
- Limit is decreased by 30%
- Duration: 24 hours
- Minimum violations: 3

### Manual Adjustment

Admins can manually adjust limits:

```javascript
const rateLimitingService = require('./services/rateLimiting.service');

// Increase limit by 50% for 24 hours
await rateLimitingService.adjustLimit(`rate-limit:user:${userId}`, 1.5, 86400);

// Decrease limit by 30% for 24 hours
await rateLimitingService.adjustLimit(`rate-limit:user:${userId}`, 0.7, 86400);
```

## Analytics

### Get Usage Statistics

```javascript
// Get user statistics
const stats = await rateLimitingService.getUsageStats(userId, 'day');
// Returns: { total, throttled, successful, throttleRate }

// Get top users for a firm
const topUsers = await rateLimitingService.getTopUsers(firmId, 'day', 10);

// Get throttled requests for a firm
const throttled = await rateLimitingService.getThrottledRequests(firmId, 'day');

// Get top endpoints for a user
const endpoints = await rateLimitingService.getTopEndpoints(userId, 10);
```

### Admin Endpoints

#### Get Configuration
```
GET /api/admin/rate-limits/config
```

#### Get Overview
```
GET /api/admin/rate-limits/overview
```

#### Get Tier Configuration
```
GET /api/admin/rate-limits/tiers/:tier
```

#### Get User Limits
```
GET /api/admin/rate-limits/users/:userId
```

#### Get User Statistics
```
GET /api/admin/rate-limits/users/:userId/stats?period=day
```

#### Reset User Limit
```
POST /api/admin/rate-limits/users/:userId/reset
```

#### Adjust User Limit
```
POST /api/admin/rate-limits/users/:userId/adjust
Body: { factor: 1.5, duration: 86400 }
```

#### Get Firm Limits
```
GET /api/admin/rate-limits/firms/:firmId
```

#### Get Top Users for Firm
```
GET /api/admin/rate-limits/firms/:firmId/top-users?period=day&limit=10
```

#### Get Throttled Requests for Firm
```
GET /api/admin/rate-limits/firms/:firmId/throttled?period=day
```

#### Reset Firm Limit
```
POST /api/admin/rate-limits/firms/:firmId/reset
```

## Rate Limit Headers

All rate-limited endpoints return the following headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 75
X-RateLimit-Reset: 1640000000
X-RateLimit-Window: 60s
Retry-After: 30 (only when limit exceeded)
```

## Error Responses

### Rate Limit Exceeded

```json
{
  "success": false,
  "error": "طلبات كثيرة جداً - حاول مرة أخرى لاحقاً",
  "error_en": "Too many requests - Please try again later",
  "code": "RATE_LIMIT_EXCEEDED",
  "resetIn": 45,
  "tier": "professional"
}
```

### Burst Limit Exceeded

```json
{
  "success": false,
  "error": "كثرة الطلبات السريعة - أبطئ قليلاً",
  "error_en": "Burst limit exceeded - Slow down",
  "code": "BURST_LIMIT_EXCEEDED",
  "resetIn": 8
}
```

## Configuration

### Tier Limits

Edit `/src/config/rateLimits.js` to modify tier limits:

```javascript
const TIER_LIMITS = {
  free: {
    requestsPerMinute: 100,
    requestsPerDay: 1000,
    burstLimit: 20,
    // ...
  },
  // ...
};
```

### Endpoint Limits

Edit `/src/config/rateLimits.js` to modify endpoint limits:

```javascript
const ENDPOINT_LIMITS = {
  auth: {
    login: {
      requestsPerMinute: 5,
      requestsPerHour: 20,
      // ...
    },
    // ...
  },
  // ...
};
```

### Adaptive Configuration

Edit `/src/config/rateLimits.js` to modify adaptive behavior:

```javascript
const ADAPTIVE_CONFIG = {
  enabled: true,
  goodBehavior: {
    threshold: 0.5,
    multiplier: 1.5,
    // ...
  },
  suspiciousBehavior: {
    threshold: 0.95,
    multiplier: 0.7,
    // ...
  }
};
```

## Best Practices

### 1. Apply Multiple Layers
```javascript
// Layer 1: Global rate limiter
app.use(globalRateLimiter);

// Layer 2: User/Firm rate limiter
app.use(perUserRateLimiter);

// Layer 3: Burst protection
app.use(burstProtectionMiddleware);

// Layer 4: Endpoint-specific limits
router.post('/sensitive-action', endpointRateLimiter('sensitive'), controller);
```

### 2. Skip Health Checks
All rate limiters automatically skip `/health` and `/health/*` endpoints.

### 3. Track Analytics
```javascript
// Track successful requests
await rateLimitingService.trackRequest(userId, req.path, false);

// Track throttled requests
await rateLimitingService.trackRequest(userId, req.path, true);
```

### 4. Monitor and Adjust
- Regularly review top users and throttled requests
- Adjust limits based on actual usage patterns
- Use adaptive rate limiting for automatic adjustments

### 5. Fail Open
The system is designed to fail open - if Redis is unavailable or there's an error, requests are allowed through to avoid blocking legitimate users.

## Testing

### Test Rate Limiting

```bash
# Test basic rate limit
for i in {1..150}; do
  curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/endpoint
done

# Test burst protection
for i in {1..30}; do
  curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/endpoint &
done
wait

# Check rate limit headers
curl -i -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/endpoint
```

### Monitor Redis

```bash
# Connect to Redis
redis-cli

# View all rate limit keys
KEYS rate-limit:*

# View specific user's limit
GET rate-limit:user:USER_ID:minute:TIMESTAMP

# View analytics
HGETALL rate-limit:analytics:USER_ID:day:2025-12-25
```

## Troubleshooting

### Rate Limit Not Working
1. Check if Redis is connected
2. Verify middleware is applied in correct order
3. Check if user is authenticated (for user-based limits)
4. Review logs for errors

### Rate Limit Too Strict
1. Check user's subscription tier
2. Review endpoint category limits
3. Check if adaptive limiting has decreased limit
4. Manually adjust limit as admin

### Rate Limit Too Lenient
1. Verify tier configuration
2. Check if multiple middleware are conflicting
3. Review burst protection settings
4. Manually decrease limit as admin

## Support

For questions or issues with the rate limiting system, please contact the development team.
