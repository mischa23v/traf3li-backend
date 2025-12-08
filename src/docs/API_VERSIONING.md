# API Versioning Policy

## Overview

Traf3li API uses URL-based versioning to provide a stable, predictable API while allowing for evolution and improvements over time. This document outlines our versioning policy, deprecation timeline, and migration guidelines.

## Version Format

API versions follow the format: `/api/v{N}/` where N is the version number (1, 2, 3, etc.)

### Examples
- `/api/v1/users`
- `/api/v2/invoices`
- `/api/v1/cases`

## Version Detection

The API version can be specified in three ways (in order of precedence):

### 1. URL Path (Recommended)
```
GET /api/v1/users
```

### 2. API-Version Header
```
GET /api/users
Headers: {
  "API-Version": "v1"
}
```

### 3. Accept Header (Content Negotiation)
```
GET /api/users
Headers: {
  "Accept": "application/vnd.traf3li.v1+json"
}
```

## Supported Versions

| Version | Status | Released | Deprecated | Sunset | Notes |
|---------|--------|----------|------------|---------|-------|
| v1 | Stable | 2024-01-01 | - | - | Current stable version |
| v2 | Beta | 2025-01-01 | - | - | Preview features, not production-ready |

## Backward Compatibility

### Legacy Routes
For backward compatibility, non-versioned routes (`/api/*`) are supported and map to `v1`:

```
/api/users → /api/v1/users (with deprecation warning)
```

**Deprecation Warning**: Non-versioned endpoints include the following headers:
- `X-API-Warning`: Notice about non-versioned endpoint
- `X-API-Migration-Info`: Link to migration guide

## Breaking Changes

Breaking changes are only introduced in new major versions. Examples include:

- Removing endpoints or fields
- Changing response structure
- Modifying authentication mechanisms
- Altering status codes
- Renaming parameters

## Non-Breaking Changes

The following changes are considered non-breaking and may be introduced within a version:

- Adding new endpoints
- Adding optional request parameters
- Adding fields to responses
- Adding new error codes
- Improving performance
- Bug fixes

## Response Format

All versioned API responses include version metadata:

```json
{
  "success": true,
  "message": "Success",
  "data": { ... },
  "meta": {
    "timestamp": "2025-01-01T12:00:00.000Z",
    "apiVersion": "v1",
    "requestId": "req_123abc"
  }
}
```

### Success Response
```json
{
  "success": true,
  "message": "Resource retrieved successfully",
  "data": { ... },
  "meta": {
    "timestamp": "2025-01-01T12:00:00.000Z",
    "apiVersion": "v1",
    "requestId": "req_123abc"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": true,
  "message": "Error description",
  "code": "ERROR_CODE",
  "meta": {
    "timestamp": "2025-01-01T12:00:00.000Z",
    "apiVersion": "v1",
    "requestId": "req_123abc"
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Resources retrieved successfully",
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "meta": {
    "timestamp": "2025-01-01T12:00:00.000Z",
    "apiVersion": "v1",
    "requestId": "req_123abc"
  }
}
```

## Deprecation Process

### Timeline

1. **Announcement (T+0)**: Deprecation is announced via:
   - Documentation updates
   - API response headers
   - Developer newsletter
   - Dashboard notifications

2. **Deprecation Period (6 months minimum)**: Version continues to work with warnings
   - `Deprecation: true` header
   - `X-API-Deprecated-Since` header with date
   - `Sunset` header with removal date
   - `X-API-Deprecation-Info` header with documentation link

3. **Sunset Date (T+6 months)**: Version is removed
   - Requests return `410 Gone` status
   - Response includes migration guide link

### Deprecation Headers

When a version is deprecated, the following headers are included:

```
Deprecation: true
X-API-Deprecated-Since: 2025-01-01
Sunset: 2025-07-01
X-API-Sunset-Date: 2025-07-01
X-API-Deprecation-Info: https://docs.traf3li.com/api/deprecation
Link: <https://docs.traf3li.com/api/migration>; rel="alternate"
```

## Migration Guide Template

### Migrating from v1 to v2

#### Overview of Changes

1. **Enhanced Response Format**
   - All responses now include standardized metadata
   - Error responses include error codes for better handling

2. **Breaking Changes**
   - [List specific breaking changes]
   - [Include before/after examples]

3. **New Features**
   - [List new endpoints or capabilities]

#### Step-by-Step Migration

##### 1. Update Base URL
```diff
- GET /api/users
+ GET /api/v2/users
```

##### 2. Update Response Parsing
```javascript
// v1
const users = response.data;

// v2
const users = response.data;
const metadata = response.meta;
```

##### 3. Update Error Handling
```javascript
// v1
if (response.error) {
  console.error(response.message);
}

// v2
if (!response.success) {
  console.error(`[${response.code}] ${response.message}`);
}
```

#### Testing Checklist

- [ ] Update API endpoints to use versioned URLs
- [ ] Update response parsing logic
- [ ] Update error handling
- [ ] Test all affected endpoints
- [ ] Update integration tests
- [ ] Monitor error rates in production

#### Rollback Plan

If issues arise:
1. Revert to v1 endpoints immediately
2. Keep both versions running in parallel during transition
3. Gradually migrate traffic using feature flags

## Best Practices

### For API Consumers

1. **Always Specify Version**: Use explicit version in URL path
   ```
   ✅ GET /api/v1/users
   ❌ GET /api/users
   ```

2. **Handle Version Headers**: Check for deprecation warnings
   ```javascript
   if (response.headers['deprecation']) {
     console.warn('API version is deprecated. Check:',
       response.headers['x-api-deprecation-info']);
   }
   ```

3. **Test Against Multiple Versions**: Test your integration against both current and next version during transition periods

4. **Monitor Sunset Dates**: Set up alerts for approaching sunset dates

5. **Use Pagination**: Always implement pagination for list endpoints
   ```
   GET /api/v1/users?page=1&limit=10
   ```

### For API Developers

1. **Maintain Version Consistency**: Keep version-specific logic isolated

2. **Document All Changes**: Update this document with any changes

3. **Test Backwards Compatibility**: Ensure v1 continues to work when adding v2

4. **Provide Migration Tools**: Create scripts or tools to help users migrate

## Error Codes

### Version-Related Errors

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_API_VERSION` | 400 | Requested version is not supported |
| `API_VERSION_SUNSET` | 410 | Requested version has been removed |

### Example Error Response

```json
{
  "success": false,
  "error": true,
  "message": "Unsupported API version: v3",
  "code": "INVALID_API_VERSION",
  "supportedVersions": ["v1", "v2"],
  "requestedVersion": "v3",
  "meta": {
    "timestamp": "2025-01-01T12:00:00.000Z",
    "apiVersion": "v1",
    "requestId": "req_123abc"
  }
}
```

## FAQ

### How long are API versions supported?

Each version is supported for a minimum of 6 months after deprecation is announced. Critical versions (with high usage) may be supported longer.

### Can I use multiple versions in the same application?

Yes, you can use different versions for different endpoints during migration. However, we recommend migrating all endpoints to the same version for consistency.

### What happens if I don't specify a version?

Non-versioned requests default to v1 but include deprecation warnings. We strongly recommend explicitly specifying the version.

### How do I know when a new version is released?

New version releases are announced via:
- API documentation updates
- Developer newsletter
- Dashboard notifications
- Response headers on existing endpoints

### Are there rate limits per version?

No, rate limits are applied per account across all versions.

### Can I access beta versions in production?

Beta versions (like v2 currently) are available but not recommended for production use. They may include breaking changes without notice.

## Support

For questions or concerns about API versioning:

- Documentation: https://docs.traf3li.com/api
- Support Email: api-support@traf3li.com
- Developer Forum: https://community.traf3li.com

## Changelog

### 2025-01-01
- Added API versioning structure
- Released v1 as stable
- Released v2 as beta
- Implemented backward compatibility for non-versioned routes

---

**Last Updated**: 2025-01-01
**Document Version**: 1.0
