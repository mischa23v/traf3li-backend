# API Versioning Implementation Guide

## Overview

This document provides technical details on how API versioning has been implemented in the Traf3li backend.

## Files Created

### 1. `/src/utils/apiResponse.js`

Standardized API response utility that provides consistent response formats across all API versions.

**Key Functions:**
- `success(res, data, message, meta, statusCode)` - Standard success response
- `error(res, message, code, details, statusCode)` - Standard error response
- `paginated(res, data, pagination, message, meta)` - Paginated response
- `created(res, data, message, meta)` - 201 Created response
- `badRequest(res, message, details)` - 400 Bad Request
- `unauthorized(res, message, details)` - 401 Unauthorized
- `forbidden(res, message, details)` - 403 Forbidden
- `notFound(res, message, details)` - 404 Not Found
- `validationError(res, message, errors)` - 422 Validation Error
- `internalError(res, message, details)` - 500 Internal Server Error

**Usage Example:**
```javascript
const apiResponse = require('../utils/apiResponse');

// Success response
return apiResponse.success(res, { user }, 'User retrieved successfully');

// Error response
return apiResponse.notFound(res, 'User not found');

// Paginated response
return apiResponse.paginated(
    res,
    users,
    { page: 1, limit: 10, total: 100, totalPages: 10, hasNextPage: true, hasPrevPage: false },
    'Users retrieved successfully'
);
```

### 2. `/src/middlewares/apiVersion.middleware.js`

Middleware for extracting, validating, and managing API versions.

**Key Features:**
- Extracts version from URL path (`/api/v1/`), header (`API-Version`), or Accept header
- Validates version against supported versions
- Adds deprecation warnings for old versions
- Handles sunset (removed) versions
- Sets `req.apiVersion` and `res.locals.apiVersion`

**Key Functions:**
- `apiVersionMiddleware` - Main middleware for version extraction and validation
- `addNonVersionedDeprecationWarning` - Adds deprecation warnings for non-versioned endpoints

**Configuration:**
```javascript
const SUPPORTED_VERSIONS = ['v1', 'v2'];
const DEFAULT_VERSION = 'v1';
const DEPRECATED_VERSIONS = []; // Add versions here when deprecated
const SUNSET_VERSIONS = []; // Add versions here when sunset
```

### 3. `/src/routes/v1/index.js`

Central router for all v1 API endpoints. Contains all existing routes for backward compatibility.

### 4. `/src/routes/v2/index.js`

Placeholder router for v2 API endpoints. Currently inherits from v1 while in beta.

### 5. `/src/docs/API_VERSIONING.md`

Comprehensive documentation for API versioning policy, deprecation timeline, and migration guides.

## Server.js Modifications

### Imports Added

```javascript
const {
    apiVersionMiddleware,
    addNonVersionedDeprecationWarning
} = require('./middlewares/apiVersion.middleware');

const v1Routes = require('./routes/v1');
const v2Routes = require('./routes/v2');
```

### Middleware Added

```javascript
// API versioning middleware (after CSRF validation)
app.use('/api', apiVersionMiddleware);
```

### Routes Added

```javascript
// Versioned routes (primary endpoints)
app.use('/api/v1', v1Routes);
app.use('/api/v2', v2Routes);

// Backward compatibility with deprecation warnings
app.use('/api', addNonVersionedDeprecationWarning);

// All existing /api/* routes remain for backward compatibility
```

### CORS Configuration Updated

```javascript
allowedHeaders: [
    // ... existing headers
    'API-Version' // API versioning header
],
```

## Controller Updates

Sample controllers have been updated to demonstrate the new response format:

### Before:
```javascript
return response.send({
    error: false,
    user
});
```

### After:
```javascript
return apiResponse.success(
    res,
    { user },
    'User profile retrieved successfully'
);
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "user": { ... }
  },
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
  "message": "User not found",
  "code": "NOT_FOUND",
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
  "message": "Users retrieved successfully",
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

## Version Headers

### Request Headers
Clients can specify version using:
```
API-Version: v1
```
or
```
Accept: application/vnd.traf3li.v1+json
```

### Response Headers
All versioned responses include:
```
X-API-Version: v1
X-API-Status: stable
```

### Deprecation Headers
Deprecated versions include additional headers:
```
Deprecation: true
X-API-Deprecated-Since: 2025-01-01
Sunset: 2025-07-01
X-API-Sunset-Date: 2025-07-01
X-API-Deprecation-Info: https://docs.traf3li.com/api/deprecation
Link: <https://docs.traf3li.com/api/migration>; rel="alternate"
```

### Non-Versioned Deprecation
Non-versioned endpoints (`/api/*`) include:
```
X-API-Warning: Non-versioned endpoint. Please use versioned endpoints
X-API-Migration-Info: https://docs.traf3li.com/api/versioning
```

## Backward Compatibility

All existing endpoints continue to work without changes:
- `/api/users` → Maps to v1, includes deprecation warning
- `/api/v1/users` → Explicit v1 endpoint (recommended)
- `/api/v2/users` → v2 endpoint (beta)

## Migration Path for Existing Code

### Step 1: Update Response Format (Optional but Recommended)
```javascript
// Old format
return response.send({ error: false, data: user });

// New format
const apiResponse = require('../utils/apiResponse');
return apiResponse.success(res, { user }, 'User retrieved successfully');
```

### Step 2: Update Error Handling (Optional but Recommended)
```javascript
// Old format
return response.status(404).send({ error: true, message: 'Not found' });

// New format
return apiResponse.notFound(res, 'User not found');
```

### Step 3: Add Version Headers (For Clients)
```javascript
// Add API-Version header to requests
fetch('/api/users', {
    headers: {
        'API-Version': 'v1'
    }
});

// Or use versioned URL (recommended)
fetch('/api/v1/users');
```

## Testing

### Test Version Extraction
```bash
# URL-based version
curl https://api.traf3li.com/api/v1/users

# Header-based version
curl -H "API-Version: v1" https://api.traf3li.com/api/users

# Accept header version
curl -H "Accept: application/vnd.traf3li.v1+json" https://api.traf3li.com/api/users
```

### Test Deprecation Warnings
```bash
# Non-versioned endpoint should include deprecation warning
curl -i https://api.traf3li.com/api/users
# Check for X-API-Warning header
```

### Test Invalid Version
```bash
# Should return 400 error
curl https://api.traf3li.com/api/v99/users
```

## Adding a New Version

### Step 1: Update Middleware Configuration
```javascript
// In src/middlewares/apiVersion.middleware.js
const SUPPORTED_VERSIONS = ['v1', 'v2', 'v3']; // Add v3
```

### Step 2: Create New Version Router
```javascript
// Create src/routes/v3/index.js
const express = require('express');
const router = express.Router();

// Add v3-specific routes
// ...

module.exports = router;
```

### Step 3: Mount New Version in Server
```javascript
// In src/server.js
const v3Routes = require('./routes/v3');
app.use('/api/v3', v3Routes);
```

### Step 4: Update Documentation
- Update `/src/docs/API_VERSIONING.md` with v3 details
- Document breaking changes from v2 to v3
- Provide migration guide

## Deprecating a Version

### Step 1: Announce Deprecation
- Update documentation
- Set deprecation date in middleware

### Step 2: Update Middleware Configuration
```javascript
// In src/middlewares/apiVersion.middleware.js
const DEPRECATED_VERSIONS = ['v1']; // Add version to deprecated list

VERSION_INFO.v1 = {
    released: '2024-01-01',
    deprecationDate: '2025-06-01',
    sunsetDate: '2025-12-01', // 6 months later
    status: 'deprecated'
};
```

### Step 3: Monitor Usage
- Track v1 usage in logs
- Send notifications to users still using v1

### Step 4: Sunset (Remove) Version
After sunset date:
```javascript
const SUNSET_VERSIONS = ['v1']; // Move to sunset list
```

## Best Practices

1. **Always specify version explicitly**: Use `/api/v1/` in URL
2. **Use standardized response format**: Use `apiResponse` utility
3. **Handle version headers**: Check for deprecation warnings in client code
4. **Test against multiple versions**: During migration periods
5. **Plan for deprecation**: Give users minimum 6 months notice
6. **Document all changes**: Update API_VERSIONING.md

## Troubleshooting

### Issue: Version not detected
- Check that `apiVersionMiddleware` is mounted before routes
- Verify API-Version header is included in CORS allowedHeaders
- Check that URL format is correct (`/api/v1/` not `/api/v1`)

### Issue: Deprecation headers not showing
- Verify version is in DEPRECATED_VERSIONS array
- Check VERSION_INFO has deprecation dates set

### Issue: Routes not working
- Verify routes are exported from v1/index.js or v2/index.js
- Check that routes are imported correctly from parent directory
- Ensure middleware order is correct in server.js

## Support

For implementation questions or issues:
- Review `/src/docs/API_VERSIONING.md` for policy details
- Check middleware logs for version detection issues
- Contact backend team for migration assistance

---

**Implementation Date**: 2025-01-01
**Last Updated**: 2025-01-01
