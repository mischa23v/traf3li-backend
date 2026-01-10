# Email Verification - Frontend Integration Guide

## Overview

This document provides comprehensive frontend integration guidance for the Gold Standard Email Verification System. This implementation follows enterprise patterns from Google, Microsoft, AWS, and Apple.

## Key Changes Summary

| Issue | Solution | Impact |
|-------|----------|--------|
| Circular dependency (can't resend if blocked) | New PUBLIC endpoint `/auth/request-verification-email` | Users can resend verification without being logged in |
| Emails not sending | Fixed to use direct Resend API (bypasses broken queue) | Verification emails now actually send |
| Token security | SHA-256 hashing + timing-safe comparison | Database breach doesn't expose usable tokens |
| User enumeration | Random timing delay + generic responses | Attackers can't discover registered emails |
| Brute force | 10 attempts per token + 30 min lockout | Prevents token guessing attacks |

---

## API Endpoints

### 1. POST /api/auth/request-verification-email (PUBLIC - NO AUTH)

**Purpose:** Request verification email by email address. Solves the circular dependency where users blocked from login couldn't resend verification.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK - Always returns this regardless of email existence):**
```json
{
  "error": false,
  "message": "إذا كان هذا البريد الإلكتروني مسجلاً وغير مُفعّل، سيتم إرسال رابط التفعيل.",
  "messageEn": "If this email is registered and not verified, a verification link will be sent.",
  "email": "u***@example.com"
}
```

**Response (429 Too Many Requests - Rate Limited):**
```json
{
  "error": true,
  "message": "يرجى الانتظار 45 ثانية قبل إعادة الإرسال",
  "messageEn": "Please wait 45 seconds before resending",
  "code": "RATE_LIMITED",
  "waitSeconds": 45,
  "waitMinutes": 1
}
```

**Response (400 Bad Request - Invalid Input):**
```json
{
  "error": true,
  "message": "صيغة البريد الإلكتروني غير صحيحة",
  "messageEn": "Invalid email format",
  "code": "INVALID_EMAIL_FORMAT"
}
```

**Rate Limiting:**
- 3 requests per email per hour
- 1 minute minimum between requests
- Uses `sensitiveRateLimiter` (3 req/hour per IP)

---

### 2. POST /api/auth/verify-email (PUBLIC)

**Purpose:** Verify email using token from verification link.

**Request:**
```json
{
  "token": "abc123...64chars..."
}
```

**Response (200 OK - Success):**
```json
{
  "error": false,
  "message": "تم تفعيل البريد الإلكتروني بنجاح",
  "messageEn": "Email verified successfully",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "username": "johndoe",
    "name": "John Doe",
    "isEmailVerified": true,
    "emailVerifiedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Response (400 Bad Request - Token Issues):**
```json
{
  "error": true,
  "message": "رمز التفعيل غير صالح أو منتهي الصلاحية",
  "messageEn": "Invalid or expired verification token",
  "code": "TOKEN_INVALID_OR_EXPIRED"
}
```

**Response (400 Bad Request - Token Locked):**
```json
{
  "error": true,
  "message": "تم قفل هذا الرمز مؤقتاً. حاول بعد 25 دقيقة.",
  "messageEn": "This token is temporarily locked. Try again in 25 minutes.",
  "code": "TOKEN_LOCKED",
  "waitMinutes": 25
}
```

**Error Codes:**
- `TOKEN_REQUIRED` - No token provided
- `TOKEN_INVALID_OR_EXPIRED` - Token doesn't exist or expired
- `TOKEN_LOCKED` - Too many failed attempts (10 attempts = 30 min lockout)
- `USER_NOT_FOUND` - User account was deleted

---

### 3. POST /api/auth/resend-verification (AUTHENTICATED)

**Purpose:** Resend verification email for the currently logged-in user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "error": false,
  "message": "تم إرسال رابط التفعيل إلى بريدك الإلكتروني",
  "messageEn": "Verification link sent to your email",
  "expiresAt": "2024-01-16T10:30:00.000Z",
  "email": "u***@example.com"
}
```

**Response (429 Too Many Requests):**
```json
{
  "error": true,
  "message": "يرجى الانتظار 45 ثانية قبل إعادة الإرسال",
  "messageEn": "Please wait 45 seconds before resending",
  "code": "RATE_LIMITED",
  "waitSeconds": 45,
  "waitMinutes": 1
}
```

**Response (400 Already Verified):**
```json
{
  "error": true,
  "message": "البريد الإلكتروني مُفعّل بالفعل",
  "messageEn": "Email already verified",
  "code": "ALREADY_VERIFIED"
}
```

---

### 4. POST /api/auth/login (Login Response Changes)

**When email is not verified, login returns 403:**

```json
{
  "error": true,
  "message": "يرجى تفعيل بريدك الإلكتروني للمتابعة. تم إرسال رابط التفعيل إلى بريدك.",
  "messageEn": "Please verify your email to continue. A verification link has been sent.",
  "code": "EMAIL_NOT_VERIFIED",
  "email": "u***@example.com",
  "verificationResent": true
}
```

**Key Fields:**
- `code: "EMAIL_NOT_VERIFIED"` - Use this to detect this specific case
- `verificationResent: true/false` - Whether a new verification email was sent
- `email` - Masked email for display

---

## Frontend Flow Recommendations

### 1. Login Page - Handle EMAIL_NOT_VERIFIED

```javascript
async function handleLogin(email, password) {
  try {
    const response = await api.post('/auth/login', { email, password });
    // Success - redirect to dashboard
  } catch (error) {
    if (error.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
      // Store email for verification page
      sessionStorage.setItem('pendingVerificationEmail', email);

      // Show verification UI
      showVerificationModal({
        email: error.response.data.email,
        verificationResent: error.response.data.verificationResent
      });
    } else {
      // Handle other login errors
      showError(error.response?.data?.messageEn || 'Login failed');
    }
  }
}
```

### 2. Verification Modal/Page Component

```jsx
function EmailVerificationPrompt({ email, onClose }) {
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState('');

  const handleResend = async () => {
    if (cooldown > 0) return;

    setLoading(true);
    try {
      const response = await api.post('/auth/request-verification-email', { email });
      setMessage(response.data.messageEn);
      // Start cooldown timer (1 minute)
      setCooldown(60);
    } catch (error) {
      if (error.response?.data?.code === 'RATE_LIMITED') {
        setCooldown(error.response.data.waitSeconds || 60);
        setMessage(error.response.data.messageEn);
      }
    } finally {
      setLoading(false);
    }
  };

  // Countdown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  return (
    <div className="verification-modal">
      <h2>Verify Your Email</h2>
      <p>A verification link has been sent to <strong>{email}</strong></p>
      <p>Please check your inbox and click the verification link.</p>

      <button
        onClick={handleResend}
        disabled={loading || cooldown > 0}
      >
        {cooldown > 0
          ? `Resend in ${cooldown}s`
          : loading
            ? 'Sending...'
            : 'Resend Verification Email'}
      </button>

      {message && <p className="message">{message}</p>}

      <p className="help-text">
        Didn't receive the email? Check your spam folder or try a different email address.
      </p>
    </div>
  );
}
```

### 3. Verify Email Page (from email link)

```jsx
function VerifyEmailPage() {
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [error, setError] = useState(null);
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('No verification token provided');
      return;
    }

    verifyEmail(token);
  }, [token]);

  const verifyEmail = async (token) => {
    try {
      const response = await api.post('/auth/verify-email', { token });
      setStatus('success');

      // Optional: Auto-redirect to login after 3 seconds
      setTimeout(() => {
        window.location.href = '/login?verified=true';
      }, 3000);
    } catch (error) {
      setStatus('error');
      setError(error.response?.data?.messageEn || 'Verification failed');

      // Handle specific error codes
      if (error.response?.data?.code === 'TOKEN_LOCKED') {
        setError(`Too many attempts. Please wait ${error.response.data.waitMinutes} minutes.`);
      }
    }
  };

  return (
    <div className="verify-page">
      {status === 'verifying' && <Spinner />}

      {status === 'success' && (
        <div className="success">
          <CheckIcon />
          <h2>Email Verified Successfully!</h2>
          <p>You can now log in to your account.</p>
          <Link href="/login">Go to Login</Link>
        </div>
      )}

      {status === 'error' && (
        <div className="error">
          <ErrorIcon />
          <h2>Verification Failed</h2>
          <p>{error}</p>
          <button onClick={() => window.location.href = '/resend-verification'}>
            Request New Verification Link
          </button>
        </div>
      )}
    </div>
  );
}
```

### 4. Standalone Resend Page (for users who can't login)

```jsx
function ResendVerificationPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.post('/auth/request-verification-email', { email });
      setSubmitted(true);
    } catch (error) {
      if (error.response?.data?.code === 'RATE_LIMITED') {
        setError(`Please wait ${error.response.data.waitMinutes} minute(s) before trying again.`);
      } else if (error.response?.data?.code === 'INVALID_EMAIL_FORMAT') {
        setError('Please enter a valid email address.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="success-message">
        <h2>Check Your Email</h2>
        <p>
          If an account exists with this email and it hasn't been verified,
          you'll receive a verification link shortly.
        </p>
        <p>Don't forget to check your spam folder!</p>
        <Link href="/login">Back to Login</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Resend Verification Email</h2>
      <p>Enter your email address to receive a new verification link.</p>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
      />

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Verification Link'}
      </button>

      <Link href="/login">Back to Login</Link>
    </form>
  );
}
```

---

## Error Codes Reference

| Code | HTTP Status | Description | Frontend Action |
|------|-------------|-------------|-----------------|
| `EMAIL_NOT_VERIFIED` | 403 | Login blocked - email not verified | Show verification prompt with resend option |
| `EMAIL_REQUIRED` | 400 | No email provided | Show form validation error |
| `INVALID_EMAIL_FORMAT` | 400 | Email format invalid | Show form validation error |
| `TOKEN_REQUIRED` | 400 | No verification token | Show error + resend option |
| `TOKEN_INVALID_OR_EXPIRED` | 400 | Token doesn't exist or expired | Show error + resend option |
| `TOKEN_LOCKED` | 400 | Too many failed attempts | Show lockout message with wait time |
| `RATE_LIMITED` | 429 | Too many requests | Show cooldown timer |
| `ALREADY_VERIFIED` | 400 | Email already verified | Redirect to login |
| `USER_NOT_FOUND` | 400 | User account deleted | Show account not found message |
| `EMAIL_SEND_FAILED` | 500 | Email service error | Show retry option |

---

## Rate Limiting Summary

| Endpoint | Limit | Window | Notes |
|----------|-------|--------|-------|
| `/request-verification-email` | 3 per IP | 1 hour | Public endpoint uses sensitiveRateLimiter |
| `/resend-verification` | 10 per user | 1 hour | Authenticated, per-user limit |
| Token creation | 3 per email | 1 hour | Prevents spam to user's inbox |
| Token verification | 10 attempts | Per token | Brute force protection |
| Minimum resend interval | 1 minute | Per user | Prevents accidental double-clicks |

---

## Security Considerations

### For Frontend Developers

1. **Never expose raw tokens** in logs or analytics
2. **Use HTTPS only** for all API calls
3. **Handle rate limits gracefully** with countdown timers
4. **Don't reveal user existence** - the API returns generic responses for `/request-verification-email`
5. **Store tokens securely** - don't put verification tokens in localStorage
6. **Validate token format** before sending to API (64-char hex string)

### Token Format

Verification tokens are 64-character hexadecimal strings:
```
abc123def456...64 characters total...
```

---

## Testing Checklist

### Happy Path
- [ ] User registers → receives verification email → clicks link → email verified
- [ ] User logs in before verifying → sees EMAIL_NOT_VERIFIED → clicks resend → gets new email
- [ ] User uses `/request-verification-email` → gets generic response (even if email doesn't exist)

### Error Cases
- [ ] Invalid token → shows error with resend option
- [ ] Expired token (24h) → shows error with resend option
- [ ] Rate limited → shows cooldown timer
- [ ] Token locked (10 failed attempts) → shows lockout message
- [ ] Already verified → redirects to login

### Edge Cases
- [ ] Double-click on resend → rate limit prevents duplicate emails
- [ ] Refresh on verify page → handles gracefully
- [ ] Network error during verification → shows retry option
- [ ] User deletes account while token pending → shows appropriate error

---

## Migration Notes

### Breaking Changes
- None - all existing endpoints maintain backwards compatibility

### New Endpoints
- `POST /api/auth/request-verification-email` - New public endpoint

### Response Format Changes
- `resendVerificationEmail` now returns `waitSeconds` and `waitMinutes` instead of `waitTime`
- `email` field in responses is now masked (e.g., `u***@example.com`)

---

## Questions?

Contact the backend team if you have questions about:
- Rate limiting configuration
- Error response formats
- Security requirements
- Testing environments
