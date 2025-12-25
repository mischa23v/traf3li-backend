# Step-Up Authentication / Reauthentication Flow

## Overview

This implementation provides Supabase-style step-up authentication (reauthentication) for sensitive operations in the traf3li-backend application. It requires users to re-verify their identity before performing high-risk actions like changing passwords, modifying MFA settings, or making payments.

## Architecture

### Components

1. **Model** (`/src/models/reauthChallenge.model.js`)
   - Stores OTP challenges for reauthentication
   - Supports email and SMS delivery methods
   - Built-in rate limiting and expiry management
   - Timing-safe OTP verification

2. **Service** (`/src/services/stepUpAuth.service.js`)
   - Core business logic for reauthentication
   - Redis-backed timestamp storage
   - Multiple verification methods (password, TOTP, email OTP, SMS OTP)
   - Configurable time windows

3. **Middleware** (`/src/middlewares/stepUpAuth.middleware.js`)
   - Enforces recent authentication requirements
   - Returns 401 with `REAUTHENTICATION_REQUIRED` code
   - Provides predefined middleware for common use cases

4. **Controller** (`/src/controllers/stepUpAuth.controller.js`)
   - HTTP handlers for reauthentication endpoints
   - Input validation and error handling

5. **Email Service Extension** (`/src/services/email.service.js`)
   - New method: `sendReauthenticationOTP()`
   - Sends styled HTML emails with OTP codes
   - Bilingual support (Arabic/English)

## API Endpoints

### POST /api/auth/reauthenticate
Verify password or MFA TOTP for reauthentication.

**Request:**
```json
{
  "method": "password",
  "password": "user_password",
  "ttlMinutes": 60
}
```
or
```json
{
  "method": "totp",
  "totpCode": "123456",
  "ttlMinutes": 60
}
```

**Response (Success):**
```json
{
  "error": false,
  "message": "Reauthentication successful",
  "messageAr": "تمت إعادة المصادقة بنجاح",
  "authenticatedAt": "2025-12-25T15:00:00.000Z",
  "expiresAt": "2025-12-25T16:00:00.000Z"
}
```

### POST /api/auth/reauthenticate/challenge
Request OTP for reauthentication via email or SMS.

**Request:**
```json
{
  "method": "email",
  "purpose": "password_change"
}
```

**Response:**
```json
{
  "error": false,
  "message": "Verification code sent via email",
  "messageAr": "تم إرسال رمز التحقق عبر البريد الإلكتروني",
  "challengeId": "507f1f77bcf86cd799439011",
  "method": "email",
  "expiresAt": "2025-12-25T15:10:00.000Z"
}
```

### POST /api/auth/reauthenticate/verify
Verify OTP code sent via email or SMS.

**Request:**
```json
{
  "code": "123456",
  "purpose": "password_change"
}
```

**Response:**
```json
{
  "error": false,
  "message": "Reauthentication successful",
  "messageAr": "تمت إعادة المصادقة بنجاح",
  "authenticatedAt": "2025-12-25T15:00:00.000Z"
}
```

### GET /api/auth/reauthenticate/status
Check current reauthentication status.

**Query Parameters:**
- `maxAgeMinutes` (optional): Maximum age in minutes (default: 1440 = 24 hours)

**Response:**
```json
{
  "error": false,
  "isRecent": true,
  "authenticatedAt": "2025-12-25T14:00:00.000Z",
  "expiresAt": "2025-12-26T14:00:00.000Z",
  "reason": null,
  "maxAgeMinutes": 1440
}
```

## Usage

### Protecting Routes with Middleware

#### Basic Usage
```javascript
const { requireRecentAuth } = require('../middlewares/stepUpAuth.middleware');

// Require auth within last 24 hours (default)
router.post('/sensitive-operation',
  authenticate,
  requireRecentAuth(),
  controller
);

// Custom time window (5 minutes)
router.post('/payment',
  authenticate,
  requireRecentAuth(5, { purpose: 'payment processing' }),
  controller
);
```

#### Predefined Middleware
```javascript
const {
  requireVeryRecentAuth,    // 5 minutes
  requireRecentAuthHourly,  // 1 hour
  requireRecentAuthDaily    // 24 hours
} = require('../middlewares/stepUpAuth.middleware');

// Critical operations (payments, account deletion)
router.post('/delete-account',
  authenticate,
  requireVeryRecentAuth({ purpose: 'account deletion' }),
  controller
);

// Sensitive settings
router.post('/change-password',
  authenticate,
  requireRecentAuthHourly({ purpose: 'password change' }),
  controller
);

// General sensitive operations
router.post('/update-profile',
  authenticate,
  requireRecentAuthDaily({ purpose: 'profile update' }),
  controller
);
```

### Programmatic Usage

```javascript
const stepUpAuthService = require('../services/stepUpAuth.service');

// Check if user has recently authenticated
const status = await stepUpAuthService.verifyRecentAuth(userId, 60); // 60 minutes
if (!status.isRecent) {
  // Require reauthentication
  return res.status(401).json({
    code: 'REAUTHENTICATION_REQUIRED',
    reauthUrl: '/api/auth/reauthenticate'
  });
}

// Verify password
const result = await stepUpAuthService.verifyPasswordReauth(userId, password);

// Verify TOTP
const result = await stepUpAuthService.verifyTOTPReauth(userId, totpCode);

// Create OTP challenge
const challenge = await stepUpAuthService.createReauthChallenge(
  userId,
  'email',
  'password_change',
  { ipAddress, userAgent }
);

// Verify OTP challenge
const result = await stepUpAuthService.verifyReauthChallenge(
  userId,
  otpCode,
  'password_change',
  { ipAddress, userAgent }
);
```

## Configuration

### Time Windows

Default windows can be customized per operation:

- **Very Recent**: 5 minutes (critical operations like payments, account deletion)
- **Recent Hourly**: 1 hour (sensitive settings like password change, MFA)
- **Recent Daily**: 24 hours (general sensitive operations)

### Supported Purposes

The following purposes are supported for OTP challenges:
- `password_change`
- `mfa_enable`
- `mfa_disable`
- `account_deletion`
- `payment_method`
- `security_settings`
- `sensitive_operation` (default)

### Verification Methods

The system supports multiple verification methods:
1. **Password**: Direct password verification
2. **MFA TOTP**: Time-based one-time password from authenticator app
3. **Email OTP**: 6-digit code sent via email
4. **SMS OTP**: 6-digit code sent via SMS (requires SMS provider integration)

## Security Features

### Rate Limiting
- **Challenge Generation**: 5 requests per hour per user
- **Minimum Wait**: 60 seconds between requests
- **OTP Attempts**: Maximum 3 attempts per OTP

### OTP Security
- Timing-safe comparison to prevent timing attacks
- Hash storage (never store plain OTP)
- 10-minute expiry by default
- Automatic cleanup of expired challenges

### Redis Storage
- Reauthentication timestamps stored in Redis
- Automatic expiry using TTL
- Fail-closed: requires reauthentication on error

### Audit Logging
All reauthentication attempts are logged for security monitoring.

## Protected Operations

The following operations now require recent authentication:

### 1 Hour Window
- Password change (`/api/auth/change-password`)
- MFA setup (`/api/auth/mfa/setup`)
- MFA disable (`/api/auth/mfa/disable`)
- MFA backup code generation (`/api/auth/mfa/backup-codes/generate`)
- MFA backup code regeneration (`/api/auth/mfa/backup-codes/regenerate`)

### Custom Windows
You can apply different windows to other operations:

```javascript
// 5 minutes for payments
router.post('/payment/process',
  authenticate,
  requireVeryRecentAuth({ purpose: 'payment' }),
  processPayment
);

// 24 hours for security settings
router.post('/security/settings',
  authenticate,
  requireRecentAuthDaily({ purpose: 'security settings' }),
  updateSecuritySettings
);
```

## Error Handling

### Client-Side Flow

When a protected endpoint returns `REAUTHENTICATION_REQUIRED`:

```javascript
try {
  const response = await fetch('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ newPassword })
  });

  const data = await response.json();

  if (data.code === 'REAUTHENTICATION_REQUIRED') {
    // Redirect to reauthentication page
    window.location.href = data.reauthUrl + '?redirect=/settings/password';
  }
} catch (error) {
  console.error(error);
}
```

### Server-Side Error Response

```json
{
  "error": true,
  "message": "Recent authentication required for this operation",
  "messageAr": "يتطلب هذا الإجراء إعادة المصادقة",
  "code": "REAUTHENTICATION_REQUIRED",
  "reauthUrl": "/api/auth/reauthenticate",
  "maxAgeMinutes": 60,
  "authenticatedAt": "2025-12-25T12:00:00.000Z",
  "reason": "AUTH_EXPIRED",
  "details": {
    "message": "Please verify your identity to continue",
    "messageAr": "الرجاء التحقق من هويتك للمتابعة"
  }
}
```

## Automatic Timestamp Update

The reauthentication timestamp is automatically updated on:
- Successful login (via password + optional MFA)
- Successful reauthentication (via any method)

## Testing

### Manual Testing with cURL

```bash
# 1. Login first
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}' \
  -c cookies.txt

# 2. Try a protected operation (will fail if not recently authenticated)
curl -X POST http://localhost:5000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -b cookies.txt

# 3. Reauthenticate with password
curl -X POST http://localhost:5000/api/auth/reauthenticate \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"method":"password","password":"password123"}'

# 4. Try protected operation again (should succeed now)
curl -X POST http://localhost:5000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"currentPassword":"password123","newPassword":"newPassword456"}'

# Alternative: Request OTP via email
curl -X POST http://localhost:5000/api/auth/reauthenticate/challenge \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"method":"email","purpose":"password_change"}'

# Verify OTP
curl -X POST http://localhost:5000/api/auth/reauthenticate/verify \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"code":"123456","purpose":"password_change"}'

# Check status
curl http://localhost:5000/api/auth/reauthenticate/status \
  -b cookies.txt
```

## Files Modified

1. **Created:**
   - `/src/models/reauthChallenge.model.js`
   - `/src/services/stepUpAuth.service.js`
   - `/src/middlewares/stepUpAuth.middleware.js`
   - `/src/controllers/stepUpAuth.controller.js`

2. **Modified:**
   - `/src/services/email.service.js` - Added `sendReauthenticationOTP()` method
   - `/src/routes/auth.route.js` - Added reauthentication endpoints and applied middleware
   - `/src/routes/mfa.route.js` - Applied middleware to MFA routes
   - `/src/controllers/auth.controller.js` - Added timestamp update on login

## Future Enhancements

1. **SMS Integration**: Complete SMS OTP delivery (currently logs to console)
2. **WebAuthn**: Add biometric/hardware key verification as a method
3. **Risk-Based Auth**: Adjust time windows based on risk factors
4. **Admin Override**: Allow admins to clear reauthentication requirements
5. **Analytics**: Track reauthentication patterns for security insights

## Dependencies

- `bcrypt` - Password verification
- `speakeasy` - TOTP verification (via mfa.service)
- `ioredis` - Redis storage for timestamps
- `crypto` - OTP generation and hashing
- `mongoose` - Database models

## Environment Variables

No new environment variables required. Uses existing:
- `REDIS_URL` - Redis connection (already configured)
- `OTP_SECRET_SALT` - OTP hashing salt (already configured)
- `CLIENT_URL` / `DASHBOARD_URL` - For email links

## License

Part of the traf3li-backend project.
