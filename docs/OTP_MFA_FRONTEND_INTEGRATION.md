# OTP/MFA Frontend Integration Guide

> **Status**: All endpoints are LIVE and ready for integration.
> **Email Provider**: Resend (configured)
> **SMS Provider**: Twilio (requires configuration)

---

## Quick Start

### 1. Email OTP Login Flow

```typescript
// Step 1: Send OTP to user's email
const sendOtp = async (email: string, purpose: 'login' | 'registration' | 'password_reset' | 'email_verification') => {
  const response = await fetch('/api/auth/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, purpose })
  });
  return response.json();
};

// Step 2: Verify OTP
const verifyOtp = async (email: string, otp: string, purpose: string) => {
  const response = await fetch('/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, purpose })
  });
  return response.json();
};
```

---

## Email OTP Endpoints

### `POST /api/auth/send-otp`

Send OTP to user's email address.

**Request:**
```json
{
  "email": "user@example.com",
  "purpose": "login"
}
```

| Field | Type | Required | Values |
|-------|------|----------|--------|
| `email` | string | Yes | Valid email address |
| `purpose` | string | Yes | `login`, `registration`, `password_reset`, `email_verification` |

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم إرسال رمز التحقق",
  "messageAr": "تم إرسال رمز التحقق",
  "messageEn": "Verification code sent",
  "expiresIn": 300
}
```

**Rate Limited Response (429):**
```json
{
  "success": false,
  "error": "يرجى الانتظار قبل طلب رمز جديد",
  "errorAr": "يرجى الانتظار قبل طلب رمز جديد",
  "errorEn": "Please wait before requesting a new code",
  "waitTime": 45,
  "nextRequestAt": "2024-01-15T10:30:00.000Z"
}
```

**Rate Limits:**
- 5 OTP requests per hour per email
- 60 seconds minimum between requests

---

### `POST /api/auth/verify-otp`

Verify the OTP code entered by user.

**Request:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "purpose": "login"
}
```

**Success Response - Login (200):**
```json
{
  "success": true,
  "verified": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "firstName": "محمد",
    "lastName": "أحمد",
    "role": "lawyer",
    "image": "https://...",
    "country": "SA",
    "phone": "+966501234567"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Success Response - Password Reset (200):**
```json
{
  "success": true,
  "verified": true,
  "resetToken": "a1b2c3d4e5f6...",
  "expiresInMinutes": 30
}
```

**Invalid OTP Response (400):**
```json
{
  "success": false,
  "error": "رمز التحقق غير صحيح",
  "errorAr": "رمز التحقق غير صحيح",
  "errorEn": "Invalid verification code",
  "attemptsLeft": 2
}
```

**Expired OTP Response (400):**
```json
{
  "success": false,
  "error": "انتهت صلاحية رمز التحقق",
  "errorAr": "انتهت صلاحية رمز التحقق",
  "errorEn": "Verification code has expired"
}
```

---

### `POST /api/auth/resend-otp`

Resend OTP to user's email (respects rate limits).

**Request:**
```json
{
  "email": "user@example.com",
  "purpose": "login"
}
```

**Response:** Same as `send-otp`

---

### `GET /api/auth/otp-status`

Check OTP rate limit status for an email.

**Query Parameters:**
- `email` (required): User's email address

**Example:** `GET /api/auth/otp-status?email=user@example.com`

**Response (200):**
```json
{
  "success": true,
  "canRequest": true,
  "requestsRemaining": 4,
  "requestsPerHour": 5,
  "waitTimeSeconds": 0,
  "nextRequestAt": null
}
```

**Response - Rate Limited (200):**
```json
{
  "success": true,
  "canRequest": false,
  "requestsRemaining": 0,
  "requestsPerHour": 5,
  "waitTimeSeconds": 45,
  "nextRequestAt": "2024-01-15T10:30:00.000Z"
}
```

---

## Phone/SMS OTP Endpoints

### `POST /api/auth/phone/send-otp`

Send OTP via SMS to user's phone.

**Request:**
```json
{
  "phone": "+966501234567",
  "purpose": "verify_phone"
}
```

| Field | Type | Required | Values |
|-------|------|----------|--------|
| `phone` | string | Yes | E.164 format (e.g., `+966501234567`) |
| `purpose` | string | Yes | `verify_phone`, `login`, `mfa` |

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم إرسال رمز التحقق",
  "expiresIn": 300
}
```

---

### `POST /api/auth/phone/verify-otp`

Verify phone OTP code.

**Request:**
```json
{
  "phone": "+966501234567",
  "otp": "123456",
  "purpose": "verify_phone"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "verified": true,
  "phoneVerified": true
}
```

---

### `POST /api/auth/phone/resend-otp`

Resend SMS OTP.

**Request:**
```json
{
  "phone": "+966501234567",
  "purpose": "verify_phone"
}
```

---

### `GET /api/auth/phone/otp-status`

Check SMS OTP rate limit status.

**Query:** `GET /api/auth/phone/otp-status?phone=+966501234567`

---

## MFA (TOTP) Endpoints

### `GET /api/auth/mfa/status`

Get user's MFA status. **Requires authentication.**

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "mfaEnabled": false,
  "methods": [],
  "backupCodesCount": 0
}
```

**Response - MFA Enabled (200):**
```json
{
  "success": true,
  "mfaEnabled": true,
  "methods": ["totp", "backup_code"],
  "backupCodesCount": 8
}
```

---

### `POST /api/auth/mfa/setup`

Generate TOTP secret and QR code for authenticator app setup. **Requires authentication.**

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "qrCode": "data:image/png;base64,iVBORw0KGgo...",
  "secret": "JBSWY3DPEHPK3PXP",
  "otpauthUrl": "otpauth://totp/Traf3li:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Traf3li"
}
```

**Frontend Usage:**
```tsx
// Display QR code for Google Authenticator / Authy
<img src={response.qrCode} alt="Scan with authenticator app" />

// Show manual entry option
<p>Manual entry code: {response.secret}</p>
```

---

### `POST /api/auth/mfa/verify-setup`

Verify TOTP code to complete MFA setup. **Requires authentication.**

**Request:**
```json
{
  "token": "123456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "mfaEnabled": true,
  "backupCodes": [
    "A1B2C3D4",
    "E5F6G7H8",
    "I9J0K1L2",
    "M3N4O5P6",
    "Q7R8S9T0",
    "U1V2W3X4",
    "Y5Z6A7B8",
    "C9D0E1F2",
    "G3H4I5J6",
    "K7L8M9N0"
  ],
  "message": "تم تفعيل المصادقة الثنائية بنجاح"
}
```

**Important:** Show backup codes to user and instruct them to save securely!

---

### `POST /api/auth/mfa/verify`

Verify MFA code during login (when MFA is required).

**Request:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "token": "123456",
  "method": "totp"
}
```

| Field | Type | Required | Values |
|-------|------|----------|--------|
| `userId` | string | Yes | User ID from login response |
| `token` | string | Yes | 6-digit TOTP code or backup code |
| `method` | string | Yes | `totp`, `backup_code`, `sms`, `email` |

**Success Response (200):**
```json
{
  "success": true,
  "user": { ... },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### `POST /api/auth/mfa/disable`

Disable MFA for user account. **Requires authentication + current TOTP code.**

**Request:**
```json
{
  "token": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "mfaEnabled": false,
  "message": "تم تعطيل المصادقة الثنائية"
}
```

---

### `POST /api/auth/mfa/backup-codes/generate`

Generate new backup codes. **Requires authentication.**

**Response (200):**
```json
{
  "success": true,
  "backupCodes": [
    "A1B2C3D4",
    "E5F6G7H8",
    ...
  ],
  "message": "تم إنشاء رموز احتياطية جديدة"
}
```

---

### `GET /api/auth/mfa/backup-codes/count`

Get count of remaining unused backup codes. **Requires authentication.**

**Response (200):**
```json
{
  "success": true,
  "count": 8,
  "total": 10
}
```

---

## Complete Login Flow with OTP

```typescript
// login.tsx
import { useState } from 'react';

export function OTPLogin() {
  const [step, setStep] = useState<'email' | 'otp' | 'mfa'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [pendingUser, setPendingUser] = useState<any>(null);

  // Step 1: Send OTP
  const handleSendOtp = async () => {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, purpose: 'login' })
    });
    const data = await res.json();

    if (data.success) {
      setStep('otp');
    } else if (res.status === 429) {
      alert(`يرجى الانتظار ${data.waitTime} ثانية`);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, purpose: 'login' })
    });
    const data = await res.json();

    if (data.success) {
      if (data.mfaRequired) {
        // User has MFA enabled - need to verify
        setPendingUser(data);
        setStep('mfa');
      } else {
        // Login complete!
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        window.location.href = '/dashboard';
      }
    }
  };

  // Step 3: Verify MFA (if enabled)
  const handleVerifyMfa = async () => {
    const res = await fetch('/api/auth/mfa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: pendingUser.userId,
        token: mfaToken,
        method: 'totp'
      })
    });
    const data = await res.json();

    if (data.success) {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      window.location.href = '/dashboard';
    }
  };

  // Render based on step...
}
```

---

## Error Codes Reference

| Code | Message (AR) | Message (EN) | Action |
|------|-------------|--------------|--------|
| `OTP_SENT` | تم إرسال رمز التحقق | Verification code sent | Show OTP input |
| `OTP_INVALID` | رمز التحقق غير صحيح | Invalid verification code | Show error, allow retry |
| `OTP_EXPIRED` | انتهت صلاحية رمز التحقق | Verification code expired | Request new OTP |
| `OTP_MAX_ATTEMPTS` | تم تجاوز الحد الأقصى للمحاولات | Maximum attempts exceeded | Request new OTP |
| `RATE_LIMITED` | يرجى الانتظار قبل طلب رمز جديد | Please wait before requesting | Show countdown |
| `MFA_REQUIRED` | المصادقة الثنائية مطلوبة | Two-factor authentication required | Show MFA input |
| `MFA_INVALID` | رمز المصادقة غير صحيح | Invalid authentication code | Show error |

---

## Security Notes

1. **OTP Expiry**: 5 minutes (300 seconds)
2. **Max Attempts**: 3 per OTP code
3. **Rate Limits**: 5 requests/hour, 60s between requests
4. **Backup Codes**: 10 codes, 8 characters each, one-time use
5. **TOTP**: Standard 6-digit, 30-second window

---

## Testing

### Test Email OTP:
```bash
# Send OTP
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "purpose": "login"}'

# Verify OTP (use code from email)
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "otp": "123456", "purpose": "login"}'
```

### Test MFA Setup:
```bash
# Get MFA status
curl http://localhost:5000/api/auth/mfa/status \
  -H "Authorization: Bearer <token>"

# Setup MFA
curl -X POST http://localhost:5000/api/auth/mfa/setup \
  -H "Authorization: Bearer <token>"
```

---

## Environment Requirements

Ensure these are set in backend `.env`:

```bash
# Required for Email OTP
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@traf3li.com

# Required for SMS OTP (optional)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```
