# OAuth SSO Service Documentation

## Overview

The OAuth SSO service provides enterprise-grade OAuth 2.0 authentication for Traf3li, enabling users to sign in with Google, Microsoft, and other OAuth providers. This service complements the existing SAML authentication system.

## Features

- **Multiple OAuth Providers**: Support for Google, Microsoft, Okta, Auth0, and custom OAuth providers
- **Auto-Provisioning**: Just-In-Time (JIT) user creation on first SSO login
- **Account Linking**: Link OAuth accounts to existing user accounts
- **Domain Restrictions**: Whitelist email domains for auto-provisioning
- **Multi-Tenancy**: Firm-specific and global provider configurations
- **Security**: CSRF protection with state tokens, encrypted client secrets
- **Audit Trail**: Comprehensive logging of SSO authentication events

## Architecture

### Components

1. **Models**:
   - `SsoProvider`: OAuth provider configurations (client ID, secret, URLs, settings)
   - `SsoUserLink`: Links between local users and OAuth provider identities

2. **Service** (`oauth.service.js`):
   - OAuth flow management
   - Token exchange
   - User provisioning
   - Account linking/unlinking

3. **Controller** (`oauth.controller.js`):
   - HTTP request handling
   - Response formatting
   - Error handling

4. **Routes** (`oauth.route.js`):
   - REST API endpoints for OAuth operations

## API Endpoints

### Public Endpoints

#### GET /api/auth/sso/providers
Get list of enabled OAuth providers.

**Query Parameters:**
- `firmId` (optional): Firm ID to get firm-specific providers

**Response:**
```json
{
  "error": false,
  "message": "OAuth providers retrieved successfully",
  "providers": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "Google Workspace",
      "providerType": "google",
      "isEnabled": true
    }
  ]
}
```

#### GET /api/auth/sso/:providerType/authorize
Start OAuth authorization flow.

**Path Parameters:**
- `providerType`: `google`, `microsoft`, `okta`, `auth0`

**Query Parameters:**
- `returnUrl` (optional): URL to return after authentication (default: `/`)
- `firmId` (optional): Firm ID for firm-specific provider

**Response:**
```json
{
  "error": false,
  "message": "Authorization URL generated successfully",
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=..."
}
```

#### GET /api/auth/sso/:providerType/callback
OAuth callback endpoint (called by OAuth provider).

**Query Parameters:**
- `code`: Authorization code
- `state`: State token for CSRF protection
- `error` (optional): Error code if authorization failed
- `error_description` (optional): Error description

**Response:**
Redirects to frontend with success or error.

### Authenticated Endpoints

#### POST /api/auth/sso/link
Link OAuth account to existing user.

**Headers:**
- `Authorization: Bearer <token>` or Cookie with `accessToken`

**Body:**
```json
{
  "providerType": "google",
  "code": "authorization_code_from_oauth_flow",
  "redirectUri": "http://localhost:5000/api/auth/sso/google/callback"
}
```

**Response:**
```json
{
  "error": false,
  "message": "OAuth account linked successfully",
  "messageAr": "تم ربط حساب OAuth بنجاح",
  "success": true,
  "link": {
    "providerType": "google",
    "externalEmail": "user@example.com",
    "isActive": true
  }
}
```

#### DELETE /api/auth/sso/unlink/:providerType
Unlink OAuth account from user.

**Headers:**
- `Authorization: Bearer <token>` or Cookie with `accessToken`

**Path Parameters:**
- `providerType`: Provider type to unlink

**Response:**
```json
{
  "error": false,
  "message": "OAuth account unlinked successfully",
  "messageAr": "تم إلغاء ربط حساب OAuth بنجاح",
  "success": true
}
```

#### GET /api/auth/sso/linked
Get user's linked OAuth accounts.

**Headers:**
- `Authorization: Bearer <token>` or Cookie with `accessToken`

**Response:**
```json
{
  "error": false,
  "message": "Linked accounts retrieved successfully",
  "links": [
    {
      "providerType": "google",
      "externalEmail": "user@gmail.com",
      "lastLoginAt": "2025-01-01T12:00:00.000Z",
      "isActive": true,
      "loginCount": 5
    }
  ]
}
```

## Setup Guide

### 1. Configure OAuth Provider

First, create an OAuth provider configuration in the database:

```javascript
const SsoProvider = require('./models/ssoProvider.model');

// For Google OAuth
const googleProvider = await SsoProvider.create({
  name: 'Google Workspace',
  providerType: 'google',
  clientId: 'your-google-client-id.apps.googleusercontent.com',
  clientSecret: 'your-google-client-secret', // Will be encrypted automatically
  scopes: ['openid', 'email', 'profile'],
  isEnabled: true,
  autoCreateUsers: true, // Enable JIT provisioning
  allowedDomains: ['example.com'], // Only allow users from example.com
  defaultRole: 'lawyer',
  firmId: null, // null for global provider, or specify firm ID
  createdBy: adminUserId
});
```

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: Web application
6. Authorized redirect URIs:
   - `http://localhost:5000/api/auth/sso/google/callback` (development)
   - `https://api.traf3li.com/api/auth/sso/google/callback` (production)
7. Copy Client ID and Client Secret

### 3. Microsoft OAuth Setup

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" → "App registrations"
3. Click "New registration"
4. Name: "Traf3li SSO"
5. Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
6. Redirect URI: Web → `https://api.traf3li.com/api/auth/sso/microsoft/callback`
7. Click "Register"
8. Copy "Application (client) ID"
9. Go to "Certificates & secrets" → "New client secret"
10. Copy the secret value

### 4. Environment Variables

Add to your `.env` file:

```bash
# Backend URL for OAuth callbacks
BACKEND_URL=https://api.traf3li.com
# or for local development:
# BACKEND_URL=http://localhost:5000

# Frontend URL for redirects after authentication
FRONTEND_URL=https://dashboard.traf3li.com
# or for local development:
# FRONTEND_URL=http://localhost:3000

# Encryption key (already exists in your .env)
ENCRYPTION_KEY=your-32-byte-hex-encryption-key

# JWT Secret (already exists)
JWT_SECRET=your-jwt-secret
```

## Usage Examples

### Frontend Integration

#### 1. Display Available Providers

```javascript
// Fetch available OAuth providers
const response = await fetch('/api/auth/sso/providers');
const { providers } = await response.json();

// Display login buttons
providers.forEach(provider => {
  console.log(`${provider.name} - ${provider.providerType}`);
});
```

#### 2. Initiate OAuth Login

```javascript
// Get authorization URL
const response = await fetch(
  `/api/auth/sso/google/authorize?returnUrl=/dashboard`
);
const { authUrl } = await response.json();

// Redirect user to OAuth provider
window.location.href = authUrl;
```

#### 3. Handle OAuth Callback

The OAuth provider will redirect to:
```
http://localhost:5000/api/auth/sso/google/callback?code=xxx&state=yyy
```

The backend will:
1. Verify state token
2. Exchange code for tokens
3. Get user info from provider
4. Create/link user account
5. Generate JWT token
6. Redirect to frontend with token in cookie

Frontend redirect:
```
http://localhost:3000/dashboard?sso=success&isNewUser=false
```

#### 4. Link OAuth Account (for existing users)

```javascript
// User is already logged in
// Start OAuth flow to get authorization code
const authResponse = await fetch(
  '/api/auth/sso/google/authorize?returnUrl=/settings/security'
);
const { authUrl } = await authResponse.json();

// Open OAuth flow in popup or redirect
const popup = window.open(authUrl, 'OAuth', 'width=500,height=600');

// After OAuth flow completes, you'll receive a code
// Link the account
const linkResponse = await fetch('/api/auth/sso/link', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    providerType: 'google',
    code: authorizationCode,
    redirectUri: 'http://localhost:5000/api/auth/sso/google/callback'
  })
});

const result = await linkResponse.json();
if (!result.error) {
  console.log('Account linked successfully!');
}
```

#### 5. Unlink OAuth Account

```javascript
const response = await fetch('/api/auth/sso/unlink/google', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
});

const result = await response.json();
if (!result.error) {
  console.log('Account unlinked successfully!');
}
```

## Security Considerations

### 1. State Token (CSRF Protection)
- Each OAuth flow generates a unique state token
- State is stored in Redis with 15-minute TTL
- State is verified on callback to prevent CSRF attacks
- State is single-use (deleted after verification)

### 2. Client Secret Encryption
- OAuth client secrets are encrypted at rest using AES-256-GCM
- Encryption is handled automatically by the encryption plugin
- Secrets are only decrypted when needed for token exchange

### 3. Domain Whitelisting
- `allowedDomains` field restricts which email domains can authenticate
- Empty array = allow all domains
- Specified domains = only users with matching email domains

### 4. JIT Provisioning Control
- `autoCreateUsers` controls whether new users are auto-created
- Set to `false` to require manual user creation before SSO login

### 5. Audit Logging
- All SSO events are logged via `auditLogService`
- Logged events: login success, account linking, account unlinking
- Includes IP address, user agent, and user details

## Common Workflows

### Workflow 1: New User SSO Login (Auto-Provisioning)

1. User clicks "Sign in with Google"
2. Frontend calls `/api/auth/sso/google/authorize`
3. User is redirected to Google OAuth consent screen
4. User grants permission
5. Google redirects to `/api/auth/sso/google/callback?code=xxx&state=yyy`
6. Backend:
   - Verifies state token
   - Exchanges code for access token
   - Gets user info from Google
   - Checks if user exists (by email)
   - User doesn't exist → creates new user (JIT provisioning)
   - Creates SSO link
   - Generates JWT token
   - Sets cookie
7. Redirects to frontend `/dashboard?sso=success&isNewUser=true`

### Workflow 2: Existing User SSO Login

Same as Workflow 1, but:
- User already exists with matching email
- No new user is created
- SSO link is created if it doesn't exist
- Redirects with `isNewUser=false`

### Workflow 3: Existing User Links OAuth Account

1. User is logged in with email/password
2. Goes to Settings → Security
3. Clicks "Link Google Account"
4. Frontend initiates OAuth flow
5. User grants permission on Google
6. Frontend calls `/api/auth/sso/link` with authorization code
7. Backend:
   - Verifies user is authenticated
   - Exchanges code for tokens
   - Gets user info from Google
   - Verifies email matches user's email
   - Creates SSO link
8. Returns success

## Troubleshooting

### Error: "Invalid or expired state token"
- State tokens expire after 15 minutes
- Ensure user completes OAuth flow quickly
- Check Redis is running and accessible

### Error: "SSO provider not found"
- Verify provider is created in database
- Check `isEnabled` is `true`
- Verify `providerType` matches request

### Error: "Email domain not allowed for auto-provisioning"
- Check `allowedDomains` in provider configuration
- User's email domain must match one of the allowed domains
- Set `allowedDomains` to `[]` to allow all domains

### Error: "No account found with this email"
- `autoCreateUsers` is `false`
- Create user account first, then link OAuth account

### Error: "Cannot unlink SSO: no password set"
- User has no password (created via SSO only)
- User must set a password before unlinking SSO
- Prevents users from being locked out of their account

## Testing

### Manual Testing

1. Create OAuth provider configuration:
```bash
# In MongoDB shell or via API
db.ssoproviders.insertOne({
  name: "Google Test",
  providerType: "google",
  clientId: "your-test-client-id",
  clientSecret: "your-test-client-secret",
  isEnabled: true,
  autoCreateUsers: true,
  allowedDomains: [],
  defaultRole: "lawyer",
  scopes: ["openid", "email", "profile"],
  createdBy: ObjectId("..."),
  createdAt: new Date(),
  updatedAt: new Date()
});
```

2. Test authorization URL generation:
```bash
curl http://localhost:5000/api/auth/sso/providers
curl http://localhost:5000/api/auth/sso/google/authorize?returnUrl=/dashboard
```

3. Complete OAuth flow manually:
- Open the authorization URL in browser
- Sign in with Google
- Observe callback and redirect

## Performance Considerations

- State tokens are cached in Redis for fast lookup
- Provider configurations are fetched from database (consider adding cache)
- SSO links are indexed on `userId`, `providerId`, and `externalId`
- Token exchange happens synchronously during callback (consider timeout)

## Future Enhancements

- [ ] Add support for OIDC Discovery
- [ ] Cache provider configurations in Redis
- [ ] Add token refresh logic for long-lived sessions
- [ ] Support for provider-specific scopes
- [ ] Admin UI for provider management
- [ ] SSO analytics and reporting
- [ ] Support for PKCE flow
- [ ] Automatic token rotation

## Related Documentation

- [SAML SSO Service](./saml.service.js) - Enterprise SAML authentication
- [MFA Service](./mfa.service.js) - Multi-factor authentication
- [Session Manager](./sessionManager.service.js) - Session management
- [Audit Log Service](./auditLog.service.js) - Security audit logging
