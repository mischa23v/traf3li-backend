# Rate Limiting System - Integration Guide

## Files Created

The following files have been created for the enhanced rate limiting system:

### 1. Configuration
- `/src/config/rateLimits.js` - Rate limit configuration by tier and endpoint

### 2. Service Layer
- `/src/services/rateLimiting.service.js` - Core rate limiting service with all functionality

### 3. Middleware
- `/src/middlewares/rateLimiter.middleware.js` - Enhanced middleware (replaces existing with backward compatibility)

### 4. Controllers
- `/src/controllers/rateLimit.controller.js` - Admin controller for rate limit management

### 5. Routes
- `/src/routes/rateLimit.route.js` - Admin routes for rate limit management

### 6. Documentation
- `/docs/RATE_LIMITING.md` - Comprehensive documentation
- `/docs/RATE_LIMITING_EXAMPLES.md` - Usage examples

## Integration Steps

### Step 1: Register Admin Routes

Add the following to `/src/server.js`:

```javascript
// Import the rate limit routes (add with other route imports)
const rateLimitRoute = require('./routes/rateLimit.route');

// Register the routes (add with other admin routes around line 778-784)
app.use('/api/admin/rate-limits', noCache, rateLimitRoute); // Rate limit management (admin endpoints)
```

Find this section in server.js (around line 778):
```javascript
app.use('/api/admin', noCache, adminRoute);
app.use('/api/admin-api', noCache, adminApiRoute);
app.use('/api/admin/tools', noCache, adminToolsRoute);
```

And add:
```javascript
app.use('/api/admin/rate-limits', noCache, rateLimitRoute);
```

### Step 2: Import Required Modules

At the top of `/src/server.js`, add the import (with other route imports around line 60-100):

```javascript
const rateLimitRoute = require('./routes/rateLimit.route');
```

### Step 3: Optional - Apply Global Rate Limiting

If you want to apply the enhanced rate limiting globally, you can add this to your middleware stack in `/src/server.js`:

```javascript
// Import enhanced rate limiting middleware
const {
  globalRateLimiter,
  perUserRateLimiter,
  burstProtectionMiddleware
} = require('./middlewares/rateLimiter.middleware');

// Apply middleware (add after other global middleware, but before routes)
app.use(globalRateLimiter);           // Global IP-based rate limiting
app.use(burstProtectionMiddleware);   // Burst protection
app.use(perUserRateLimiter);          // User-based tiered rate limiting
```

**Note**: The existing `smartRateLimiter` is already included in the enhanced middleware for backward compatibility, so your existing routes will continue to work.

### Step 4: Update Specific Routes (Optional)

For routes that need specific rate limiting, you can use the new endpoint-specific middleware:

```javascript
const { endpointRateLimiter } = require('./middlewares/rateLimiter.middleware');

// Example for upload routes
router.post('/upload/document', endpointRateLimiter('upload', 'document'), uploadController);

// Example for export routes
router.get('/export/pdf', endpointRateLimiter('export', 'pdf'), exportController);

// Example for payment routes
router.post('/payment', endpointRateLimiter('payment'), paymentController);
```

### Step 5: Test the Integration

After adding the routes, test that the admin endpoints work:

```bash
# Test admin config endpoint (requires admin authentication)
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:3000/api/admin/rate-limits/config

# Test getting user limits
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:3000/api/admin/rate-limits/users/USER_ID

# Test getting firm limits
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:3000/api/admin/rate-limits/firms/FIRM_ID
```

## Configuration

### Modify Tier Limits

Edit `/src/config/rateLimits.js` to adjust tier limits:

```javascript
const TIER_LIMITS = {
  free: {
    requestsPerMinute: 100,  // Adjust as needed
    requestsPerDay: 1000,
    burstLimit: 20,
    // ...
  },
  // ... other tiers
};
```

### Modify Endpoint Limits

Edit `/src/config/rateLimits.js` to adjust endpoint-specific limits:

```javascript
const ENDPOINT_LIMITS = {
  auth: {
    login: {
      requestsPerMinute: 5,  // Adjust as needed
      requestsPerHour: 20,
      // ...
    },
    // ... other endpoints
  },
  // ... other categories
};
```

### Enable/Disable Adaptive Rate Limiting

Edit `/src/config/rateLimits.js`:

```javascript
const ADAPTIVE_CONFIG = {
  enabled: true,  // Set to false to disable adaptive limiting
  // ...
};
```

## Admin Endpoints

Once integrated, the following admin endpoints will be available:

### Configuration
- `GET /api/admin/rate-limits/config` - Get all rate limit configuration
- `GET /api/admin/rate-limits/overview` - Get system overview
- `GET /api/admin/rate-limits/tiers/:tier` - Get tier configuration
- `GET /api/admin/rate-limits/effective` - Calculate effective limit

### User Management
- `GET /api/admin/rate-limits/users/:userId` - Get user limits
- `GET /api/admin/rate-limits/users/:userId/stats` - Get user statistics
- `POST /api/admin/rate-limits/users/:userId/reset` - Reset user limit
- `POST /api/admin/rate-limits/users/:userId/adjust` - Adjust user limit

### Firm Management
- `GET /api/admin/rate-limits/firms/:firmId` - Get firm limits
- `GET /api/admin/rate-limits/firms/:firmId/top-users` - Get top users
- `GET /api/admin/rate-limits/firms/:firmId/throttled` - Get throttled requests
- `POST /api/admin/rate-limits/firms/:firmId/reset` - Reset firm limit

All endpoints require:
1. Authentication (valid JWT token)
2. Admin role (checked by adminAuth middleware)

## Backward Compatibility

The enhanced middleware maintains backward compatibility with existing code:

- All existing rate limiter exports are preserved
- Existing routes using `smartRateLimiter`, `authRateLimiter`, etc. will continue to work
- The middleware has been enhanced, not replaced

## Next Steps

1. Register the admin routes in server.js (required)
2. Test the admin endpoints (recommended)
3. Review and adjust tier limits if needed (optional)
4. Apply global rate limiting if desired (optional)
5. Update specific routes with endpoint-specific limiters (optional)

## Monitoring

Monitor rate limiting with the admin endpoints:

```bash
# Check system overview
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/api/admin/rate-limits/overview

# Monitor a specific firm
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/api/admin/rate-limits/firms/FIRM_ID/throttled?period=day

# Check top API users
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/api/admin/rate-limits/firms/FIRM_ID/top-users?period=day&limit=10
```

## Troubleshooting

### Routes not working
- Verify routes are registered in server.js
- Check adminAuth middleware is working
- Verify Redis is connected (rate limiting uses Redis)

### Rate limits not applying
- Check if middleware is applied in correct order
- Verify subscription tier is set correctly in firm model
- Check Redis for rate limit keys: `redis-cli KEYS "rate-limit:*"`

### Need help?
Refer to the detailed documentation in `/docs/RATE_LIMITING.md` and examples in `/docs/RATE_LIMITING_EXAMPLES.md`.
