# Domain-Based SSO Routing

## Overview

The Domain-Based SSO Routing feature automatically detects which Identity Provider (IdP) to use based on the user's email domain. This eliminates the need for users to manually select their SSO provider and enables seamless single sign-on experiences for enterprise customers.

## Features

- **Automatic IdP Detection**: Extracts email domain and matches to configured SSO provider
- **Priority-Based Routing**: Handles multiple providers for the same domain with priority system
- **Redis Caching**: High-performance lookups with 10-minute cache TTL
- **Domain Verification**: DNS TXT record verification for security
- **Auto-Redirect**: Optional automatic redirect to IdP (requires domain verification)
- **Multi-Tenant Support**: Firm-specific and global provider configurations

## Architecture

### Files Created/Modified

1. **`/src/models/ssoProvider.model.js`** (Modified)
   - Added fields: `priority`, `autoRedirect`, `domainVerified`, `verificationToken`, `verificationMethod`, `verifiedAt`, `verifiedBy`
   - Added indexes: `allowedDomains`, `priority`
   - Added static methods: `findByDomain()`, `getProviderForDomain()`

2. **`/src/services/ssoRouting.service.js`** (New)
   - Domain extraction and validation
   - Provider detection with caching
   - Domain verification (DNS TXT records)
   - Cache invalidation

3. **`/src/controllers/ssoRouting.controller.js`** (New)
   - `detectProvider`: Public endpoint for SSO detection
   - `getDomainConfig`: Admin endpoint for domain configuration
   - `generateVerificationToken`: Generate DNS TXT record for verification
   - `verifyDomain`: Verify domain ownership via DNS
   - `manualVerifyDomain`: Admin override for domain verification
   - `invalidateDomainCache`: Clear cached domain lookups

4. **`/src/routes/oauth.route.js`** (Modified)
   - Added 6 new routes for SSO routing

## API Endpoints

### 1. Detect SSO Provider (Public)

**Endpoint**: `POST /api/auth/sso/detect`

**Description**: Auto-detects SSO provider from email address

**Request**:
```json
{
  "email": "john.doe@biglaw.com",
  "firmId": "507f1f77bcf86cd799439011",  // Optional
  "returnUrl": "/dashboard"              // Optional
}
```

**Response (Provider Found)**:
```json
{
  "error": false,
  "detected": true,
  "provider": {
    "id": "507f1f77bcf86cd799439011",
    "name": "BigLaw Okta",
    "type": "saml",
    "providerType": "okta",
    "autoRedirect": true,
    "domainVerified": true,
    "priority": 10
  },
  "authUrl": "https://biglaw.okta.com/oauth2/v1/authorize?...",
  "message": "Sign in with your BigLaw account",
  "messageAr": "تسجيل الدخول باستخدام حساب BigLaw الخاص بك",
  "domain": "biglaw.com"
}
```

**Response (No Provider)**:
```json
{
  "error": false,
  "detected": false,
  "message": "No SSO provider configured for this email domain",
  "messageAr": "لا يوجد موفر SSO مهيأ لنطاق البريد الإلكتروني هذا",
  "domain": "example.com"
}
```

### 2. Get Domain Configuration (Admin)

**Endpoint**: `GET /api/auth/sso/domain/:domain`

**Authentication**: Required

**Query Parameters**:
- `firmId` (optional): Filter by firm

**Example**: `GET /api/auth/sso/domain/biglaw.com?firmId=507f1f77bcf86cd799439011`

**Response**:
```json
{
  "error": false,
  "message": "Domain configuration retrieved successfully",
  "domain": "biglaw.com",
  "providers": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "BigLaw Okta",
      "providerType": "okta",
      "priority": 10,
      "autoRedirect": true,
      "domainVerified": true,
      "verificationMethod": "dns",
      "verifiedAt": "2024-01-01T00:00:00.000Z",
      "isEnabled": true,
      "firmId": "507f1f77bcf86cd799439011"
    }
  ],
  "primaryProvider": {
    "id": "507f1f77bcf86cd799439011",
    "name": "BigLaw Okta",
    "providerType": "okta"
  }
}
```

### 3. Generate Verification Token

**Endpoint**: `POST /api/auth/sso/domain/:domain/verify/generate`

**Authentication**: Required (Admin)

**Request**:
```json
{
  "providerId": "507f1f77bcf86cd799439011"
}
```

**Response**:
```json
{
  "error": false,
  "message": "Verification token generated successfully",
  "domain": "biglaw.com",
  "verificationMethod": "dns",
  "txtRecord": {
    "host": "_traf3li.biglaw.com",
    "type": "TXT",
    "value": "traf3li-verify=abc123def456...",
    "ttl": 3600
  },
  "instructions": [
    "Add a DNS TXT record to your domain biglaw.com",
    "Host/Name: _traf3li.biglaw.com or _traf3li",
    "Type: TXT",
    "Value: traf3li-verify=abc123def456...",
    "TTL: 3600 (or default)",
    "Wait for DNS propagation (can take up to 48 hours)",
    "Click 'Verify Domain' to complete verification"
  ],
  "token": "abc123def456..."
}
```

### 4. Verify Domain (DNS)

**Endpoint**: `POST /api/auth/sso/domain/:domain/verify`

**Authentication**: Required (Admin)

**Request**:
```json
{
  "providerId": "507f1f77bcf86cd799439011"
}
```

**Response (Success)**:
```json
{
  "error": false,
  "verified": true,
  "message": "Domain verified successfully",
  "messageAr": "تم التحقق من النطاق بنجاح",
  "verifiedAt": "2024-01-01T00:00:00.000Z"
}
```

**Response (Failed)**:
```json
{
  "error": true,
  "verified": false,
  "message": "DNS TXT record not found. Please add the TXT record and wait for DNS propagation.",
  "expectedRecord": {
    "host": "_traf3li.biglaw.com",
    "type": "TXT",
    "value": "traf3li-verify=abc123def456..."
  },
  "foundRecords": []
}
```

### 5. Verify Domain Manually (Admin Override)

**Endpoint**: `POST /api/auth/sso/domain/:domain/verify/manual`

**Authentication**: Required (Admin)

**Request**:
```json
{
  "providerId": "507f1f77bcf86cd799439011"
}
```

**Response**:
```json
{
  "error": false,
  "verified": true,
  "message": "Domain verified manually by administrator",
  "verifiedAt": "2024-01-01T00:00:00.000Z",
  "verificationMethod": "manual"
}
```

### 6. Invalidate Domain Cache

**Endpoint**: `POST /api/auth/sso/domain/:domain/cache/invalidate`

**Authentication**: Required (Admin)

**Request**:
```json
{
  "firmId": "507f1f77bcf86cd799439011"  // Optional
}
```

**Response**:
```json
{
  "error": false,
  "message": "Domain cache invalidated successfully"
}
```

## Usage Examples

### Frontend Integration (Login Page)

```javascript
// When user enters email on login page
async function handleEmailSubmit(email) {
  try {
    const response = await fetch('/api/auth/sso/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        returnUrl: '/dashboard'
      })
    });

    const result = await response.json();

    if (result.detected) {
      if (result.provider.autoRedirect) {
        // Auto-redirect to SSO provider
        window.location.href = result.authUrl;
      } else {
        // Show SSO button
        showSSOButton(result.provider.name, result.authUrl);
      }
    } else {
      // Show standard login form
      showPasswordForm();
    }
  } catch (error) {
    console.error('SSO detection failed:', error);
    showPasswordForm(); // Fallback to standard login
  }
}
```

### Admin Dashboard - Domain Configuration

```javascript
// Configure SSO provider with domain routing
async function setupSSOProvider(providerId, domain) {
  // 1. Add domain to provider's allowedDomains
  await updateProvider(providerId, {
    allowedDomains: ['biglaw.com'],
    priority: 10,
    autoRedirect: false  // Don't auto-redirect until verified
  });

  // 2. Generate verification token
  const verification = await fetch(`/api/auth/sso/domain/${domain}/verify/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ providerId })
  }).then(r => r.json());

  // 3. Show DNS instructions to admin
  displayDNSInstructions(verification.txtRecord, verification.instructions);

  // 4. Admin adds DNS record and clicks "Verify"
  // ...

  // 5. Verify domain
  const result = await fetch(`/api/auth/sso/domain/${domain}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ providerId })
  }).then(r => r.json());

  if (result.verified) {
    // 6. Enable auto-redirect
    await updateProvider(providerId, {
      autoRedirect: true
    });

    alert('Domain verified! Auto-redirect enabled.');
  }
}
```

## Configuration

### SsoProvider Model Fields

| Field | Type | Description |
|-------|------|-------------|
| `allowedDomains` | String[] | Email domains for this provider (e.g., `['biglaw.com']`) |
| `priority` | Number | Priority when multiple providers match (higher = higher priority) |
| `autoRedirect` | Boolean | Auto-redirect to IdP (requires `domainVerified = true`) |
| `domainVerified` | Boolean | Domain ownership verified |
| `verificationToken` | String | DNS TXT record verification token |
| `verificationMethod` | String | Verification method: `dns`, `email`, `manual`, or `null` |
| `verifiedAt` | Date | When domain was verified |
| `verifiedBy` | ObjectId | Admin user who verified domain |

### Priority System

When multiple providers match the same domain, the system uses priority to determine which provider to use:

```javascript
// Example: biglaw.com has two providers
{
  name: "BigLaw Okta",
  allowedDomains: ["biglaw.com"],
  priority: 10  // Higher priority
}

{
  name: "BigLaw Azure AD",
  allowedDomains: ["biglaw.com"],
  priority: 5   // Lower priority
}

// Result: "BigLaw Okta" will be returned for user@biglaw.com
```

### Caching Strategy

- **Cache Key**: `sso:domain:{firmId}:{domain}`
- **TTL**: 600 seconds (10 minutes)
- **Invalidation**: Automatic on provider updates, or manual via API
- **Negative Caching**: "No provider found" cached for 60 seconds

## Security Measures

### 1. Domain Verification

Domain verification is **required** for `autoRedirect` to prevent SSO hijacking:

- **Unverified Domain**: Users must click SSO button manually
- **Verified Domain**: Users can be auto-redirected to IdP

### 2. DNS TXT Record Verification

```
Host: _traf3li.biglaw.com
Type: TXT
Value: traf3li-verify=abc123def456...
```

### 3. Input Validation

All inputs are validated:
- Email format validation
- Domain format validation (RFC compliant)
- XSS prevention (dangerous characters filtered)
- SQL injection prevention (parameterized queries)

### 4. Rate Limiting

- Public endpoints: Standard public rate limit
- Admin endpoints: Auth rate limit

## Testing

### Test Email Domain Detection

```bash
# Test with valid domain
curl -X POST http://localhost:5000/api/auth/sso/detect \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@biglaw.com",
    "returnUrl": "/dashboard"
  }'

# Expected: Provider detected or not detected
```

### Test Domain Verification

```bash
# 1. Generate verification token
curl -X POST http://localhost:5000/api/auth/sso/domain/biglaw.com/verify/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "providerId": "507f1f77bcf86cd799439011"
  }'

# 2. Add DNS TXT record (use your DNS provider)
# Host: _traf3li.biglaw.com
# Type: TXT
# Value: traf3li-verify=abc123...

# 3. Verify domain
curl -X POST http://localhost:5000/api/auth/sso/domain/biglaw.com/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "providerId": "507f1f77bcf86cd799439011"
  }'
```

### Test Cache Performance

```bash
# First request (cache miss)
time curl -X POST http://localhost:5000/api/auth/sso/detect \
  -H "Content-Type: application/json" \
  -d '{"email": "john@biglaw.com"}'

# Second request (cache hit - should be faster)
time curl -X POST http://localhost:5000/api/auth/sso/detect \
  -H "Content-Type: application/json" \
  -d '{"email": "john@biglaw.com"}'
```

## Database Indexes

The following indexes are created automatically:

```javascript
// For domain-based lookups
{ allowedDomains: 1, isEnabled: 1 }

// For prioritized routing
{ allowedDomains: 1, isEnabled: 1, priority: -1 }
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid email format" | Malformed email | Check email format |
| "No SSO provider configured" | Domain not in `allowedDomains` | Add domain to provider |
| "DNS TXT record not found" | DNS not propagated or incorrect | Wait for DNS propagation (up to 48h) |
| "Invalid domain format" | Malformed domain | Check domain format |

### Error Response Format

```json
{
  "error": true,
  "message": "Error message in English",
  "messageAr": "رسالة الخطأ بالعربية"
}
```

## Performance Metrics

### Cache Hit Rate

Monitor cache performance:

```javascript
const cacheStats = await cacheService.getStats();
console.log(`Hit Rate: ${cacheStats.hitRatePercent}`);
```

### Expected Performance

- **Cache Hit**: < 10ms
- **Cache Miss (Database)**: 50-100ms
- **DNS Verification**: 1-5 seconds

## Migration Guide

If you have existing SSO providers, run this migration:

```javascript
// Update existing providers with new fields
await SsoProvider.updateMany(
  {},
  {
    $set: {
      priority: 0,
      autoRedirect: false,
      domainVerified: false,
      verificationToken: null,
      verificationMethod: null,
      verifiedAt: null,
      verifiedBy: null
    }
  }
);
```

## Monitoring & Logging

The feature logs important events:

```
INFO: SSO provider detected successfully
  - domain: biglaw.com
  - provider: BigLaw Okta
  - autoRedirect: true

INFO: Domain verification token generated
  - domain: biglaw.com
  - providerId: 507f1f77bcf86cd799439011

INFO: Domain verified successfully
  - domain: biglaw.com
  - method: dns

WARN: Invalid email format for SSO detection
  - email: inv***
```

## Future Enhancements

Potential improvements:

1. **Email Verification**: Alternative to DNS for small businesses
2. **Bulk Domain Import**: CSV upload for large domain lists
3. **Analytics Dashboard**: Track SSO usage by domain
4. **Smart Routing**: ML-based provider recommendations
5. **Fallback Providers**: Secondary provider if primary fails

## Support

For questions or issues:
- GitHub Issues: [traf3li-backend/issues](https://github.com/mischa23v/traf3li-backend/issues)
- Documentation: [docs/SSO_DOMAIN_ROUTING.md](./SSO_DOMAIN_ROUTING.md)
