# PKCE (Proof Key for Code Exchange) Implementation

## Overview

This document describes the PKCE implementation for OAuth 2.0 authentication flows in the traf3li-backend application. PKCE is an extension to the OAuth 2.0 authorization code flow that mitigates authorization code interception attacks, particularly important for mobile and native applications.

## What is PKCE?

PKCE (RFC 7636) adds an additional layer of security to OAuth 2.0 by:
- Creating a cryptographic link between the authorization request and token request
- Eliminating the need for client secrets in public clients (mobile apps, SPAs)
- Preventing authorization code interception attacks

## Implementation Details

### 1. PKCE Helper Functions

Located in `/src/services/oauth.service.js`:

```javascript
/**
 * Generate PKCE code verifier
 * Random URL-safe string between 43-128 characters
 */
generateCodeVerifier() {
    return crypto.randomBytes(32)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

/**
 * Generate PKCE code challenge from verifier
 * SHA256 hash of the verifier, base64url encoded
 */
generateCodeChallenge(verifier) {
    return crypto.createHash('sha256')
        .update(verifier)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}
```

### 2. Provider Configuration

Providers are configured with PKCE support levels in `PROVIDER_CONFIGS`:

```javascript
const PROVIDER_CONFIGS = {
    google: {
        pkceSupport: 'optional' // Supports but doesn't require PKCE
    },
    microsoft: {
        pkceSupport: 'optional' // Supports but doesn't require PKCE
    },
    twitter: {
        pkceSupport: 'required' // Requires PKCE for all flows
    },
    apple: {
        pkceSupport: 'none' // Does not support PKCE
    }
};
```

**PKCE Support Levels:**
- `required`: Provider mandates PKCE (e.g., Twitter)
- `optional`: Provider supports but doesn't require PKCE (e.g., Google, Microsoft)
- `none`: Provider doesn't support PKCE (e.g., Apple)

### 3. Authorization Flow

The authorization flow has been enhanced to support PKCE:

1. **Client Request**: Mobile app requests authorization with `use_pkce=true` parameter
   ```
   GET /api/auth/sso/google/authorize?use_pkce=true&returnUrl=/dashboard
   ```

2. **Server Processing**:
   - Checks if provider supports/requires PKCE
   - Generates `code_verifier` (43-128 character random string)
   - Generates `code_challenge` (SHA256 hash of verifier)
   - Stores `code_verifier` with state in Redis (15 min TTL)
   - Adds `code_challenge` and `code_challenge_method=S256` to authorization URL

3. **Authorization URL**:
   ```
   https://accounts.google.com/o/oauth2/v2/auth?
     client_id=...&
     redirect_uri=...&
     response_type=code&
     scope=...&
     state=...&
     code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&
     code_challenge_method=S256
   ```

### 4. Token Exchange Flow

The token exchange has been updated to include the code verifier:

1. **Callback Processing**:
   - Verifies state token (CSRF protection)
   - Retrieves `code_verifier` from stored state
   - Validates that PKCE was used if required

2. **Token Request**:
   ```javascript
   POST https://oauth2.googleapis.com/token
   Content-Type: application/x-www-form-urlencoded

   grant_type=authorization_code&
   code=...&
   redirect_uri=...&
   client_id=...&
   client_secret=...&
   code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
   ```

3. **Provider Validation**:
   - Provider computes SHA256(code_verifier)
   - Compares with stored code_challenge
   - Issues tokens only if they match

## Usage

### For Mobile Apps

Mobile applications should always use PKCE by adding the `use_pkce=true` query parameter:

```javascript
// Step 1: Request authorization URL
const response = await fetch('/api/auth/sso/google/authorize?use_pkce=true&returnUrl=/dashboard');
const { authUrl, pkceEnabled } = await response.json();

// Step 2: Open browser with authorization URL
openBrowser(authUrl);

// Step 3: Handle callback (automatic - server handles code_verifier)
// Your app will be redirected back with authentication token
```

### For Web Applications

Web applications can optionally use PKCE for enhanced security:

```javascript
// Optional PKCE for web apps
const response = await fetch('/api/auth/sso/google/authorize?use_pkce=true');
```

### Provider-Specific Behavior

#### Google OAuth (Optional PKCE)
```javascript
// Without PKCE (traditional flow)
GET /api/auth/sso/google/authorize

// With PKCE (enhanced security)
GET /api/auth/sso/google/authorize?use_pkce=true
```

#### Twitter OAuth (Required PKCE)
```javascript
// PKCE automatically enabled (required by provider)
GET /api/auth/sso/twitter/authorize
```

## Security Benefits

### Attack Mitigation

PKCE protects against:

1. **Authorization Code Interception**
   - Attacker intercepts authorization code
   - Cannot use it without code_verifier
   - Code_verifier never transmitted in authorization request

2. **Malicious Apps**
   - Malicious app on same device registers same redirect URI
   - Intercepts authorization code
   - Cannot exchange code without original code_verifier

3. **MITM Attacks**
   - Man-in-the-middle intercepts authorization code
   - Cannot use code without code_verifier
   - Code_verifier is dynamically generated per request

### Key Security Properties

- **Code Verifier**:
  - Kept secret on client
  - Never sent in authorization request
  - Only sent in token exchange (over HTTPS)
  - Single-use (deleted after verification)

- **Code Challenge**:
  - One-way hash (SHA256) of verifier
  - Sent in authorization request
  - Computationally infeasible to reverse

- **Binding**:
  - Authorization code cryptographically bound to client
  - Only client with original verifier can exchange code

## Testing

Run PKCE tests:

```bash
npm test tests/pkce.test.js
```

The test suite includes:
- Code verifier generation validation
- Code challenge generation validation
- Complete flow simulation
- Security property verification

## API Reference

### Controller: `oauth.controller.js`

#### GET /api/auth/sso/:providerType/authorize

Start OAuth authorization flow with optional PKCE.

**Parameters:**
- `providerType` (path): Provider type (google, microsoft, twitter, etc.)
- `returnUrl` (query): URL to return after authentication
- `firmId` (query): Optional firm ID
- `use_pkce` (query): Enable PKCE (true/false/1/yes)

**Response:**
```json
{
  "error": false,
  "message": "Authorization URL generated successfully",
  "authUrl": "https://...",
  "pkceEnabled": true
}
```

#### GET /api/auth/sso/:providerType/callback

Handle OAuth callback (automatic PKCE verification).

### Service: `oauth.service.js`

#### `generateCodeVerifier()`
Generates a cryptographically random code verifier (43-128 characters).

**Returns:** String (base64url encoded)

#### `generateCodeChallenge(verifier)`
Generates SHA256 code challenge from verifier.

**Parameters:**
- `verifier`: The code verifier string

**Returns:** String (base64url encoded SHA256 hash)

#### `isPKCERequired(providerType)`
Check if PKCE is required for a provider.

**Parameters:**
- `providerType`: Provider type string

**Returns:** Boolean

#### `isPKCESupported(providerType)`
Check if PKCE is supported for a provider.

**Parameters:**
- `providerType`: Provider type string

**Returns:** Boolean

#### `getAuthorizationUrl(providerId, returnUrl, firmId, usePKCE)`
Generate authorization URL with optional PKCE.

**Parameters:**
- `providerId`: Provider ID or type
- `returnUrl`: Return URL after auth (default: '/')
- `firmId`: Optional firm ID (default: null)
- `usePKCE`: Enable PKCE (default: false)

**Returns:** String (authorization URL)

## Configuration

### Environment Variables

No additional environment variables required. PKCE uses existing Redis/cache configuration.

### Cache Storage

PKCE data is stored in Redis with state tokens:

```javascript
{
  providerId: "...",
  providerType: "google",
  returnUrl: "/dashboard",
  firmId: null,
  redirectUri: "...",
  codeVerifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
  usePKCE: true,
  timestamp: 1234567890
}
```

**TTL**: 15 minutes (900 seconds)

## Best Practices

### For Mobile Apps

1. **Always use PKCE**: Add `?use_pkce=true` to all authorization requests
2. **Store verifier securely**: Keep code_verifier in memory, don't persist
3. **Use system browser**: Use system browser for OAuth (not WebView)
4. **Validate redirects**: Ensure redirect URI matches registered URI

### For Backend

1. **Validate state**: Always verify state token (CSRF protection)
2. **Validate verifier**: Check code_verifier exists if PKCE was used
3. **Single use**: Delete code_verifier after token exchange
4. **Short TTL**: Keep state TTL short (15 minutes)
5. **Log PKCE usage**: Log when PKCE is used for monitoring

### For Providers

1. **Configure correctly**: Set correct `pkceSupport` level
2. **Test thoroughly**: Test PKCE flow with each provider
3. **Document requirements**: Document which providers require PKCE

## Troubleshooting

### Error: "PKCE verification failed: code_verifier missing"

**Cause**: PKCE was used in authorization but code_verifier not found in state.

**Solutions:**
- Check Redis is running and accessible
- Verify state TTL hasn't expired (15 minutes)
- Ensure state token is correctly passed in callback

### Error: "invalid_grant" from OAuth provider

**Cause**: Code verifier doesn't match code challenge.

**Solutions:**
- Verify code_verifier is correctly stored and retrieved
- Check base64url encoding is correct (no +/= characters)
- Ensure code_verifier isn't modified between authorization and token exchange

### PKCE not being used for mobile apps

**Cause**: `use_pkce` parameter not set or incorrect.

**Solutions:**
- Add `?use_pkce=true` to authorization URL
- Check query parameter parsing in controller
- Verify provider supports PKCE

## References

- [RFC 7636: Proof Key for Code Exchange](https://tools.ietf.org/html/rfc7636)
- [OAuth 2.0 for Native Apps](https://tools.ietf.org/html/rfc8252)
- [OAuth 2.0 Security Best Current Practice](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)

## Version History

- **v1.0.0** (2024): Initial PKCE implementation
  - Added PKCE helper functions
  - Updated authorization flow
  - Updated token exchange flow
  - Added provider configuration
  - Mobile app support via `use_pkce` parameter
