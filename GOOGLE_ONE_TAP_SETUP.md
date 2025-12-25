# Google One Tap Authentication - Setup Guide

## Overview

This implementation provides production-ready Google One Tap authentication for the Traf3li backend. It allows users to sign in or sign up with their Google account using a single tap/click.

## Features

✅ **Security**
- Token verification with Google's public keys
- Audience validation (ensures token is for your app)
- Expiration validation
- Issuer validation
- Email verification requirement
- Replay attack prevention (5-minute token cache)
- Account linking security checks

✅ **User Experience**
- Seamless sign-in/sign-up flow
- Automatic account creation for new users
- Account linking for existing users
- Multi-tenancy support (firmId parameter)
- Profile picture and name auto-population

✅ **Integration**
- Follows existing codebase patterns
- Rate limiting (authRateLimiter)
- Audit logging for all operations
- Session management
- Geographic anomaly detection
- Refresh token rotation
- CSRF protection compatible
- Webhook support

## Setup

### 1. Install Dependencies

The `google-auth-library` package has been added to `package.json`. Install it:

```bash
npm install
```

### 2. Configure Google OAuth Client

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen
6. Create **Web application** credentials
7. Add authorized JavaScript origins:
   - `http://localhost:3000` (development)
   - `https://yourdomain.com` (production)
8. Add authorized redirect URIs (optional for One Tap):
   - `http://localhost:3000`
   - `https://yourdomain.com`
9. Copy the **Client ID**

### 3. Environment Variables

Add to your `.env` file:

```env
# Google One Tap Authentication
GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
```

**Note:** The service will also use `GOOGLE_CALENDAR_CLIENT_ID` as a fallback if `GOOGLE_CLIENT_ID` is not set.

## API Endpoint

### POST `/api/auth/google/one-tap`

Authenticates user with Google One Tap credential.

**Request Body:**
```json
{
  "credential": "eyJhbGciOiJSUzI1NiIsImtpZCI6...", // Required: Google One Tap JWT
  "firmId": "507f1f77bcf86cd799439011"           // Optional: For multi-tenancy
}
```

**Success Response (200):**
```json
{
  "error": false,
  "message": "تم تسجيل الدخول بنجاح",
  "messageEn": "Login successful",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "client",
    "ssoProvider": "google",
    "ssoExternalId": "google_user_id",
    "isEmailVerified": true,
    "firmId": "firm_id",
    "firmRole": "member",
    "permissions": { ... }
  },
  "isNewUser": false,
  "accountLinked": false
}
```

**Response Headers:**
- `Set-Cookie: accessToken=...` (httpOnly, 15 minutes)
- `Set-Cookie: refreshToken=...` (httpOnly, 7 days)

**Error Responses:**

- `400 Bad Request` - Invalid credential or firm ID
- `401 Unauthorized` - Token verification failed
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Google One Tap not configured

## Frontend Integration

### 1. Add Google One Tap Script

Add to your HTML `<head>`:

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

### 2. Initialize One Tap

```javascript
// Initialize Google One Tap
function initializeGoogleOneTap() {
  google.accounts.id.initialize({
    client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    callback: handleGoogleOneTapResponse,
    auto_select: false,
    cancel_on_tap_outside: true,
  });

  // Display the One Tap prompt
  google.accounts.id.prompt((notification) => {
    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
      console.log('One Tap not displayed:', notification.getNotDisplayedReason());
    }
  });
}

// Handle the response
async function handleGoogleOneTapResponse(response) {
  try {
    const res = await fetch('/api/auth/google/one-tap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        credential: response.credential,
        // firmId: 'optional_firm_id', // Optional
      }),
      credentials: 'include', // Important for cookies
    });

    const data = await res.json();

    if (data.error) {
      console.error('Authentication failed:', data.message);
      return;
    }

    // Success!
    console.log('User authenticated:', data.user);

    if (data.isNewUser) {
      console.log('New user created!');
      // Redirect to onboarding
    } else if (data.accountLinked) {
      console.log('Account linked to Google!');
    }

    // Redirect to dashboard or update UI
    window.location.href = '/dashboard';
  } catch (error) {
    console.error('Error:', error);
  }
}

// Initialize when page loads
window.addEventListener('load', initializeGoogleOneTap);
```

### 3. Add Sign-In Button (Optional)

```html
<div id="buttonDiv"></div>

<script>
  google.accounts.id.renderButton(
    document.getElementById("buttonDiv"),
    {
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "rectangular"
    }
  );
</script>
```

## User Flow

### New User Flow

1. User clicks "Sign in with Google"
2. Google One Tap displays
3. User selects Google account
4. Frontend receives credential JWT
5. Frontend sends credential to `/api/auth/google/one-tap`
6. Backend verifies token with Google
7. Backend creates new user account:
   - Email from Google (verified)
   - Name from Google profile
   - Profile picture from Google
   - Unique username generated
   - Random password (not needed for Google login)
8. Backend generates access + refresh tokens
9. User is logged in

### Existing User Flow (No Google Link)

1. User with email account clicks "Sign in with Google"
2. Google One Tap displays
3. User selects Google account (same email as existing account)
4. Frontend sends credential
5. Backend verifies token
6. Backend finds existing user by email
7. Backend links Google account to existing user
8. Backend generates tokens
9. User is logged in
10. Response includes `accountLinked: true`

### Existing User Flow (Already Linked)

1. User clicks "Sign in with Google"
2. Google One Tap displays
3. User selects Google account
4. Frontend sends credential
5. Backend verifies token
6. Backend finds existing user with Google link
7. Backend generates tokens
8. User is logged in

## Security Features

### Token Verification

```javascript
// Service verifies:
✓ Token signature with Google's public keys
✓ Audience matches your GOOGLE_CLIENT_ID
✓ Issuer is Google (accounts.google.com)
✓ Token not expired
✓ Email is verified by Google
```

### Replay Attack Prevention

- Tokens are cached for 5 minutes after use
- Each token (jti) can only be used once
- Automatic cleanup of expired tokens

### Account Linking Security

- Checks if Google account already linked to another user
- Requires implicit consent (user clicked Google login)
- Email must match existing account for auto-linking
- Logs all linking operations for audit

## Database Schema

### User Model Fields

```javascript
{
  ssoExternalId: String,      // Google user ID (sub)
  ssoProvider: 'google',      // SSO provider type
  isSSOUser: true,            // Flag for SSO users
  createdViaSSO: true,        // Created through SSO
  lastSSOLogin: Date,         // Last SSO login time
  isEmailVerified: true,      // Email verified by Google
  emailVerifiedAt: Date,      // Verification timestamp
}
```

## Rate Limiting

The endpoint uses `authRateLimiter`:
- **15 requests per 15 minutes per IP**
- `skipSuccessfulRequests: true` - Only failed attempts count
- Redis-backed for distributed systems

## Audit Logging

All operations are logged:

```javascript
// New user registration
'google_one_tap_register'

// Existing user login
'google_one_tap_login'

// With metadata:
{
  userId, userEmail, userRole,
  isNewUser, accountLinked,
  googleId, ipAddress, userAgent
}
```

## Error Handling

All errors return consistent format:

```json
{
  "error": true,
  "message": "رسالة بالعربية",
  "messageEn": "English message",
  "code": "ERROR_CODE"
}
```

**Error Codes:**
- `CREDENTIAL_REQUIRED` - No credential provided
- `INVALID_FIRM_ID` - Invalid MongoDB ObjectId
- `FIRM_NOT_FOUND` - Firm doesn't exist
- `TOKEN_EXPIRED` - Google token expired
- `INVALID_TOKEN` - Token signature invalid
- `INVALID_AUDIENCE` - Token not for this app
- `TOKEN_VERIFICATION_FAILED` - Generic verification error
- `GOOGLE_ACCOUNT_ALREADY_LINKED` - Google account linked to different user

## Testing

### Manual Testing

1. **Test New User Registration:**
```bash
curl -X POST http://localhost:5000/api/auth/google/one-tap \
  -H "Content-Type: application/json" \
  -d '{
    "credential": "VALID_GOOGLE_JWT_TOKEN"
  }'
```

2. **Test With Firm ID:**
```bash
curl -X POST http://localhost:5000/api/auth/google/one-tap \
  -H "Content-Type: application/json" \
  -d '{
    "credential": "VALID_GOOGLE_JWT_TOKEN",
    "firmId": "507f1f77bcf86cd799439011"
  }'
```

### Integration Tests

```javascript
describe('Google One Tap Authentication', () => {
  it('should create new user with valid credential', async () => {
    const response = await request(app)
      .post('/api/auth/google/one-tap')
      .send({ credential: validGoogleToken });

    expect(response.status).toBe(200);
    expect(response.body.isNewUser).toBe(true);
    expect(response.body.user.ssoProvider).toBe('google');
  });

  it('should link existing user account', async () => {
    // Create user first
    await User.create({ email: 'test@example.com', ... });

    const response = await request(app)
      .post('/api/auth/google/one-tap')
      .send({ credential: googleTokenForTestEmail });

    expect(response.status).toBe(200);
    expect(response.body.accountLinked).toBe(true);
  });

  it('should reject expired token', async () => {
    const response = await request(app)
      .post('/api/auth/google/one-tap')
      .send({ credential: expiredToken });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('TOKEN_EXPIRED');
  });
});
```

## Monitoring

### Logs to Monitor

```javascript
// Success
'Google One Tap: Token verified successfully'
'Google One Tap: Created new user from Google'
'Google One Tap: Linked existing account to Google'

// Warnings
'Google One Tap: Token replay attack detected'
'Google One Tap: GOOGLE_CLIENT_ID not configured'

// Errors
'Google One Tap: Token verification failed'
```

### Metrics to Track

- Total One Tap authentications
- New users vs returning users
- Account linking rate
- Token verification failures
- Geographic anomalies detected
- Average response time

## Troubleshooting

### Issue: "Google One Tap is not configured"

**Solution:** Add `GOOGLE_CLIENT_ID` to your `.env` file

### Issue: "Invalid token audience"

**Solution:** Ensure your `GOOGLE_CLIENT_ID` matches the client ID used in the frontend

### Issue: "Email not verified by Google"

**Solution:** This is a security feature. The user must have a verified email with Google.

### Issue: Cookies not set

**Solution:**
- Check `CORS` configuration
- Ensure `credentials: 'include'` in frontend fetch
- Verify cookie domain settings

### Issue: Token already used

**Solution:** This is replay attack protection. Generate a fresh token from Google.

## Production Checklist

- [ ] `GOOGLE_CLIENT_ID` set in production environment
- [ ] CORS configured for frontend domain
- [ ] HTTPS enabled (required for cookies in production)
- [ ] Rate limiting configured
- [ ] Monitoring and alerts set up
- [ ] Database indexes created for `ssoExternalId`
- [ ] Webhook endpoints configured (if using)
- [ ] Frontend updated with correct client ID
- [ ] Authorized origins added in Google Console
- [ ] Testing completed on staging

## Files Created/Modified

### New Files
- `/src/services/googleOneTap.service.js` - Core verification and authentication logic
- `/src/controllers/googleOneTap.controller.js` - HTTP request handler
- `GOOGLE_ONE_TAP_SETUP.md` - This documentation

### Modified Files
- `/src/routes/auth.route.js` - Added POST /api/auth/google/one-tap route
- `/src/validators/auth.validator.js` - Added googleOneTapSchema validation
- `/package.json` - Added google-auth-library dependency

## Support

For issues or questions:
1. Check logs for detailed error messages
2. Verify environment variables
3. Test with Google's [Token Debugger](https://developers.google.com/identity/gsi/web/tools/token-debugger)
4. Review Google Cloud Console configuration

## References

- [Google Identity Services](https://developers.google.com/identity/gsi/web/guides/overview)
- [Google One Tap Documentation](https://developers.google.com/identity/gsi/web/guides/display-google-one-tap)
- [google-auth-library NPM](https://www.npmjs.com/package/google-auth-library)
