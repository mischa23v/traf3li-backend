# API Versioning Quick Start Guide

## TL;DR

The Traf3li backend now supports comprehensive API versioning with URL-based and header-based versioning, deprecation warnings, and sunset policies.

## Quick Examples

### 1. Use Versioned Endpoints (Client-Side)

```javascript
// Recommended: Use explicit versioning
fetch('https://api.traf3li.com/api/v1/cases')

// Or use header-based versioning
fetch('https://api.traf3li.com/api/cases', {
  headers: { 'API-Version': 'v1' }
})
```

### 2. Add Deprecation Warning (Server-Side)

```javascript
const { deprecationWarning } = require('./middlewares/deprecation.middleware');

router.get('/old-endpoint',
  deprecationWarning('v1', '2025-12-31', '/api/v2/new-endpoint'),
  controller.handle
);
```

### 3. Check Version in Controller

```javascript
// The API version is automatically available in req.apiVersion
router.get('/data', (req, res) => {
  const version = req.apiVersion; // 'v1', 'v2', etc.

  if (version === 'v2') {
    // Return enhanced v2 format
    return res.json({ data: enhancedData, meta: { version: 'v2' } });
  }

  // Return v1 format
  res.json({ data: basicData });
});
```

## Current API Versions

| Version | Status | Use Case |
|---------|--------|----------|
| v1 | Stable | Production (current) |
| v2 | Beta | Testing new features |

## Implementation Checklist

### For New Endpoints
- [ ] Use `/api/v1/resource` format (not `/api/resource`)
- [ ] Add version check in controller if behavior differs
- [ ] Document endpoint in API docs

### For Deprecating Endpoints
- [ ] Add `deprecationWarning` middleware
- [ ] Set sunset date (6+ months out)
- [ ] Update API documentation
- [ ] Notify clients via email/changelog

### For Creating New Version
- [ ] Update `apiVersion.middleware.js` with new version
- [ ] Create `/routes/vX/index.js`
- [ ] Mount in `server.js`
- [ ] Update documentation
- [ ] Announce in changelog

## Response Headers

All versioned endpoints include:

```http
X-API-Version: v1          # Current version
X-API-Status: stable       # Version status
```

Deprecated endpoints also include:

```http
Deprecation: true
Sunset: 2025-12-31
X-API-Alternate: /api/v2/new-endpoint
Warning: 299 - "Deprecated API version v1..."
```

## Migration Path

1. **Today**: Use v1 endpoints
2. **New features**: Available in v2 (beta)
3. **6 months notice**: v1 marked deprecated
4. **12 months**: v1 sunset (removed)

## Files Added

```
src/
├── middlewares/
│   ├── apiVersion.middleware.js      # Version detection & validation
│   └── deprecation.middleware.js     # Deprecation warnings
├── routes/
│   ├── v1/
│   │   └── index.js                  # V1 routes
│   └── v2/
│       └── index.js                  # V2 routes
docs/
└── API_VERSIONING.md                 # Full documentation
examples/
└── api-versioning-usage.js           # Usage examples
tests/
└── unit/middlewares/
    └── apiVersioning.test.js         # Tests
```

## Common Patterns

### Pattern 1: Version-Specific Logic

```javascript
router.get('/api/:version(v1|v2)/resource', (req, res) => {
  const data = getResourceData();

  if (req.params.version === 'v2') {
    // Enhanced v2 format
    return res.json({
      success: true,
      data: { ...data, metadata: getMetadata() },
      meta: { version: 'v2' }
    });
  }

  // Simple v1 format
  res.json({ success: true, data });
});
```

### Pattern 2: Soft Deprecation

```javascript
const { softDeprecationWarning } = require('./middlewares/deprecation.middleware');

// Give 6 months advance notice before official deprecation
router.get('/endpoint',
  softDeprecationWarning('v1', '2025-06-30', '2025-12-31', '/api/v2/endpoint'),
  controller.handle
);
```

### Pattern 3: Hard Removal

```javascript
const { endpointRemovalWarning } = require('./middlewares/deprecation.middleware');

// Block access to removed endpoint
router.get('/removed',
  endpointRemovalWarning('v1', '2024-12-31', '/api/v2/replacement')
);
```

## Testing

Run tests to verify versioning works:

```bash
npm test -- apiVersioning.test.js
```

## Full Documentation

See [docs/API_VERSIONING.md](/home/user/traf3li-backend/docs/API_VERSIONING.md) for complete documentation.

## Support

- **Documentation**: https://docs.traf3li.com/api/versioning
- **Migration Guide**: https://docs.traf3li.com/api/migration
- **Issues**: Create issue in repository
