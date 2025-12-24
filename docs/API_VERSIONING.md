# API Versioning Strategy

## Overview

The Traf3li Backend implements a comprehensive API versioning strategy to ensure backward compatibility while allowing for API evolution and improvements. This document explains how to use and maintain versioned APIs.

## Versioning Approach

We use **URL-based versioning** as the primary versioning method, with additional support for header-based versioning.

### Supported Version Formats

1. **URL Path** (Recommended): `/api/v1/resource`, `/api/v2/resource`
2. **API-Version Header**: `API-Version: v1` or `API-Version: 1`
3. **Accept Header**: `Accept: application/vnd.traf3li.v1+json`

## Current API Versions

| Version | Status | Released | Deprecated | Sunset | Notes |
|---------|--------|----------|------------|--------|-------|
| v1 | Stable | 2024-01-01 | - | - | Current production version |
| v2 | Beta | 2025-01-01 | - | - | Next-generation API (in development) |

## Using Versioned APIs

### Client Examples

#### 1. URL-Based Versioning (Recommended)

```javascript
// Fetch v1 API
fetch('https://api.traf3li.com/api/v1/cases')
  .then(res => res.json())
  .then(data => console.log(data));

// Fetch v2 API
fetch('https://api.traf3li.com/api/v2/cases')
  .then(res => res.json())
  .then(data => console.log(data));
```

#### 2. Header-Based Versioning

```javascript
// Using API-Version header
fetch('https://api.traf3li.com/api/cases', {
  headers: {
    'API-Version': 'v1'
  }
})
  .then(res => res.json())
  .then(data => console.log(data));
```

#### 3. Accept Header Versioning

```javascript
// Using Accept header
fetch('https://api.traf3li.com/api/cases', {
  headers: {
    'Accept': 'application/vnd.traf3li.v2+json'
  }
})
  .then(res => res.json())
  .then(data => console.log(data));
```

### Response Headers

All API responses include version information headers:

```http
HTTP/1.1 200 OK
X-API-Version: v1
X-API-Status: stable
```

## Backward Compatibility

### Legacy Routes

For backward compatibility, non-versioned routes (`/api/resource`) default to v1:

```javascript
// These are equivalent:
fetch('/api/cases')  // Defaults to v1
fetch('/api/v1/cases')  // Explicit v1
```

**Note**: Non-versioned routes include a deprecation warning header:

```http
X-API-Warning: Non-versioned endpoint. Please use versioned endpoints...
X-API-Migration-Info: https://docs.traf3li.com/api/versioning
```

## Adding Deprecation Warnings

### 1. Deprecate an Endpoint

```javascript
const { deprecationWarning } = require('../middlewares/deprecation.middleware');

// Apply to a specific route
router.get('/old-endpoint',
  deprecationWarning('v1', '2025-12-31', '/api/v2/new-endpoint'),
  controller.handleRequest
);
```

**Client receives:**

```http
HTTP/1.1 200 OK
Deprecation: true
X-API-Deprecated-Version: v1
Sunset: 2025-12-31
X-API-Sunset-Date: 2025-12-31
X-API-Alternate: /api/v2/new-endpoint
Warning: 299 - "Deprecated API version v1. Will be removed on 2025-12-31. Use /api/v2/new-endpoint instead."
Link: <https://docs.traf3li.com/api/migration>; rel="alternate", </api/v2/new-endpoint>; rel="successor-version"
```

### 2. Soft Deprecation (Advance Notice)

Give clients advance warning before official deprecation:

```javascript
const { softDeprecationWarning } = require('../middlewares/deprecation.middleware');

router.get('/future-deprecated',
  softDeprecationWarning('v1', '2025-06-30', '2025-12-31', '/api/v2/new-endpoint'),
  controller.handleRequest
);
```

**Client receives:**

```http
HTTP/1.1 200 OK
X-API-Future-Deprecation: 2025-06-30
X-API-Planned-Sunset: 2025-12-31
X-API-Recommended-Alternative: /api/v2/new-endpoint
Warning: 299 - "This endpoint (v1) will be deprecated on 2025-06-30. Removal planned for 2025-12-31. Migrate to /api/v2/new-endpoint."
```

### 3. Endpoint Removal (Sunset)

Block access to removed endpoints:

```javascript
const { endpointRemovalWarning } = require('../middlewares/deprecation.middleware');

router.get('/removed-endpoint',
  endpointRemovalWarning('v1', '2024-12-31', '/api/v2/new-endpoint'),
  controller.handleRequest  // This won't be reached
);
```

**Client receives:**

```http
HTTP/1.1 410 Gone
Sunset: 2024-12-31
X-API-Sunset-Date: 2024-12-31
X-API-Alternate: /api/v2/new-endpoint

{
  "success": false,
  "error": {
    "code": "ENDPOINT_GONE",
    "message": "This endpoint (v1) was removed on 2024-12-31. Please use /api/v2/new-endpoint instead"
  }
}
```

## Creating a New API Version

### Step 1: Update Version Configuration

Edit `/home/user/traf3li-backend/src/middlewares/apiVersion.middleware.js`:

```javascript
// Add new version to supported versions
const SUPPORTED_VERSIONS = ['v1', 'v2', 'v3'];

// Add version metadata
const VERSION_INFO = {
    // ... existing versions
    v3: {
        released: '2026-01-01',
        deprecationDate: null,
        sunsetDate: null,
        status: 'beta'
    }
};
```

### Step 2: Create Version Directory

```bash
mkdir -p /home/user/traf3li-backend/src/routes/v3
```

### Step 3: Create Version Router

Create `/home/user/traf3li-backend/src/routes/v3/index.js`:

```javascript
const express = require('express');
const router = express.Router();

// Import v3-specific routes
const casesRouteV3 = require('./cases.route');

// Mount v3 routes
router.use('/cases', casesRouteV3);

// For routes not yet migrated, inherit from v2
const v2Routes = require('../v2');
router.use('/', v2Routes);

module.exports = router;
```

### Step 4: Update Server Configuration

Edit `/home/user/traf3li-backend/src/server.js`:

```javascript
// Import versioned routes
const v1Routes = require('./routes/v1');
const v2Routes = require('./routes/v2');
const v3Routes = require('./routes/v3');  // Add this

// Mount versioned routes
app.use('/api/v1', v1Routes);
app.use('/api/v2', v2Routes);
app.use('/api/v3', v3Routes);  // Add this
```

### Step 5: Implement Version-Specific Routes

Create `/home/user/traf3li-backend/src/routes/v3/cases.route.js`:

```javascript
const express = require('express');
const router = express.Router();
const casesController = require('../../controllers/v3/cases.controller');
const { authenticate } = require('../../middlewares/authenticate');

// V3-specific implementation
router.get('/', authenticate, casesController.getAll);
router.post('/', authenticate, casesController.create);

module.exports = router;
```

## Deprecation Timeline

When deprecating a version, follow this timeline:

1. **T-6 months**: Add soft deprecation warnings
2. **T-3 months**: Announce official deprecation
3. **T-0**: Mark as deprecated (add Deprecation headers)
4. **T+6 months**: Sunset (remove endpoint, return 410 Gone)

### Example Timeline

```javascript
// T-6 months: Soft deprecation
router.get('/endpoint',
  softDeprecationWarning('v1', '2025-06-30', '2025-12-31'),
  controller.handle
);

// T-0: Official deprecation
// Update VERSION_INFO in apiVersion.middleware.js
v1: {
    released: '2024-01-01',
    deprecationDate: '2025-06-30',  // Add this
    sunsetDate: '2025-12-31',        // Add this
    status: 'deprecated'             // Change to deprecated
}

// T+6 months: Sunset
router.get('/endpoint',
  endpointRemovalWarning('v1', '2025-12-31', '/api/v2/endpoint')
);
```

## Version Priority

When multiple version indicators are present, the following priority is used:

1. **URL Path** (highest priority)
2. **API-Version Header**
3. **Accept Header**
4. **Default Version** (v1)

## Error Handling

### Invalid Version

```http
HTTP/1.1 400 Bad Request

{
  "success": false,
  "error": {
    "code": "INVALID_API_VERSION",
    "message": "Unsupported API version: v99"
  },
  "supportedVersions": ["v1", "v2"],
  "requestedVersion": "v99"
}
```

### Sunset Version

```http
HTTP/1.1 410 Gone

{
  "success": false,
  "error": {
    "code": "API_VERSION_SUNSET",
    "message": "API version v0 has been sunset and is no longer available"
  },
  "supportedVersions": ["v1", "v2"],
  "sunsetDate": "2024-01-01",
  "migrationGuide": "https://docs.traf3li.com/api/migration"
}
```

## Monitoring and Analytics

All version usage is logged for analytics:

```javascript
// Logs include:
{
  version: 'v1',
  source: 'path',  // or 'header', 'accept', 'default'
  path: '/api/v1/cases',
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  userId: '507f1f77bcf86cd799439011',
  firmId: '507f1f77bcf86cd799439012',
  timestamp: '2025-12-24T12:00:00.000Z'
}
```

## Best Practices

### For API Developers

1. **Always version new endpoints** - Use `/api/v1/resource` instead of `/api/resource`
2. **Document breaking changes** - Clearly document what changed between versions
3. **Maintain backward compatibility** - Don't break existing v1 clients when adding v2
4. **Use semantic versioning** - Major version changes for breaking changes
5. **Provide migration guides** - Help clients upgrade to new versions

### For API Consumers

1. **Always specify version** - Use explicit versioning in production code
2. **Handle deprecation headers** - Monitor for `Deprecation` and `Sunset` headers
3. **Test new versions early** - Try beta versions before they become stable
4. **Plan migrations** - Don't wait until sunset to migrate
5. **Use latest stable** - Upgrade to latest stable version when possible

## Testing

### Test Version Detection

```javascript
// Test URL-based versioning
const res = await request(app)
  .get('/api/v1/cases')
  .expect(200);

expect(res.headers['x-api-version']).toBe('v1');
```

### Test Deprecation Warnings

```javascript
// Test deprecation headers
const res = await request(app)
  .get('/api/deprecated-endpoint')
  .expect(200);

expect(res.headers['deprecation']).toBe('true');
expect(res.headers['sunset']).toBeDefined();
```

## References

- [RFC 8594 - Sunset HTTP Header](https://tools.ietf.org/html/rfc8594)
- [RFC 8288 - Web Linking](https://tools.ietf.org/html/rfc8288)
- [API Versioning Best Practices](https://www.freecodecamp.org/news/how-to-version-a-rest-api/)

## Support

For questions or issues with API versioning:

- Documentation: https://docs.traf3li.com/api/versioning
- Migration Guide: https://docs.traf3li.com/api/migration
- Support: support@traf3li.com
