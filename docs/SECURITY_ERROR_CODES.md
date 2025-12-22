# Security Error Codes Reference

Complete reference of all security-related error codes used in the authentication and authorization system.

## Table of Contents

- [Authentication Errors](#authentication-errors)
- [MFA/TOTP Errors](#mfatotp-errors)
- [WebAuthn Errors](#webauthn-errors)
- [SAML/SSO Errors](#samlsso-errors)
- [Session Management Errors](#session-management-errors)
- [Account Security Errors](#account-security-errors)
- [Rate Limiting Errors](#rate-limiting-errors)
- [Validation Errors](#validation-errors)
- [Permission Errors](#permission-errors)
- [Frontend Error Handling Guide](#frontend-error-handling-guide)

---

## Authentication Errors

### UNAUTHORIZED

**HTTP Status:** `401`

**Description:** User is not authenticated or authentication token is invalid/expired.

**Response:**
```json
{
  "error": true,
  "message": "Unauthorized access",
  "messageAr": "غير مصرح بالوصول",
  "code": "UNAUTHORIZED"
}
```

**Frontend Handling:**
- Clear stored authentication state
- Redirect to login page
- Show "Session expired, please login again" message
- Preserve return URL for redirect after login

**Example Scenarios:**
- Missing or invalid JWT token
- Expired authentication token
- Token signature verification failed
- User not found for token

---

### INVALID_CREDENTIALS

**HTTP Status:** `401`

**Description:** Email/username or password is incorrect.

**Response:**
```json
{
  "error": true,
  "message": "Invalid email or password",
  "messageAr": "البريد الإلكتروني أو كلمة المرور غير صحيحة",
  "code": "INVALID_CREDENTIALS"
}
```

**Frontend Handling:**
- Show error message on login form
- Clear password field
- Keep email/username field populated
- Increment failed login counter (for UX)
- Suggest password reset after 3 failed attempts

**Example Scenarios:**
- Wrong password
- Non-existent email/username
- Case-sensitive email mismatch

---

### TOKEN_EXPIRED

**HTTP Status:** `401`

**Description:** JWT token has expired and needs to be refreshed.

**Response:**
```json
{
  "error": true,
  "message": "Token has expired",
  "messageAr": "انتهت صلاحية الرمز",
  "code": "TOKEN_EXPIRED"
}
```

**Frontend Handling:**
- Attempt silent token refresh if refresh token available
- If refresh fails, redirect to login
- Show "Your session has expired" message
- Save current application state if possible

**Example Scenarios:**
- JWT expiration time passed
- Token issued before user's last password change
- Token revoked by user (logout-all)

---

## MFA/TOTP Errors

### MFA_REQUIRED

**HTTP Status:** `401`

**Description:** Login successful but MFA verification required to complete authentication.

**Response:**
```json
{
  "error": true,
  "message": "MFA verification required",
  "messageAr": "مطلوب التحقق من المصادقة الثنائية",
  "code": "MFA_REQUIRED",
  "userId": "507f1f77bcf86cd799439011"
}
```

**Frontend Handling:**
- Store userId temporarily (session storage only)
- Redirect to MFA verification page
- Show TOTP input field (6 digits)
- Provide link to use backup code instead
- Clear stored userId after successful verification

**Example Scenarios:**
- User has MFA enabled
- Password authentication successful
- TOTP verification pending

---

### MFA_ALREADY_ENABLED

**HTTP Status:** `400`

**Description:** Attempting to setup MFA when it's already enabled.

**Response:**
```json
{
  "error": true,
  "message": "MFA is already enabled",
  "messageEn": "MFA is already enabled",
  "code": "MFA_ALREADY_ENABLED"
}
```

**Frontend Handling:**
- Show message: "MFA is already enabled for your account"
- Redirect to MFA settings page
- Highlight "Disable MFA" or "Regenerate backup codes" options
- Don't allow re-setup without disabling first

**Example Scenarios:**
- User clicking setup MFA when already configured
- Duplicate setup request
- Navigation error to setup page

---

### MFA_NOT_ENABLED

**HTTP Status:** `400`

**Description:** Attempting MFA operation when MFA is not enabled.

**Response:**
```json
{
  "error": true,
  "message": "MFA is not enabled",
  "messageEn": "MFA is not enabled",
  "code": "MFA_NOT_ENABLED"
}
```

**Frontend Handling:**
- Show message: "MFA is not enabled for your account"
- Provide "Enable MFA" button
- Redirect to MFA setup flow
- Explain benefits of MFA

**Example Scenarios:**
- Trying to disable MFA when not enabled
- Requesting backup codes without MFA
- Direct URL access to MFA management

---

### MFA_SETUP_NOT_STARTED

**HTTP Status:** `400`

**Description:** Attempting to verify MFA setup without starting the setup process.

**Response:**
```json
{
  "error": true,
  "message": "MFA setup not started",
  "messageEn": "MFA setup not started",
  "code": "MFA_SETUP_NOT_STARTED"
}
```

**Frontend Handling:**
- Redirect to MFA setup start page
- Generate new QR code
- Clear any stored setup state
- Show error: "Setup session expired, please start again"

**Example Scenarios:**
- Session timeout during setup
- Direct access to verify page
- Lost setup state (page refresh)

---

### INVALID_TOKEN

**HTTP Status:** `400`

**Description:** TOTP token is invalid or expired.

**Response:**
```json
{
  "error": true,
  "message": "Invalid verification token",
  "messageEn": "Invalid verification token",
  "code": "INVALID_TOKEN"
}
```

**Frontend Handling:**
- Show error inline with TOTP input
- Clear TOTP input field
- Allow retry without page reload
- Show hint: "Enter the current 6-digit code from your authenticator app"
- Provide "Use backup code instead" option

**Example Scenarios:**
- Expired TOTP code (30-second window)
- Incorrect 6-digit code
- Clock drift between server and authenticator
- Typo in code entry

---

### INVALID_FORMAT

**HTTP Status:** `400`

**Description:** Backup code format is invalid.

**Response:**
```json
{
  "error": true,
  "message": "Invalid backup code format",
  "messageEn": "Invalid backup code format",
  "code": "INVALID_FORMAT"
}
```

**Frontend Handling:**
- Show format hint: "Format should be XXXX-XXXX"
- Auto-format input as user types
- Show example: "ABCD-1234"
- Validate before submission

**Example Scenarios:**
- Missing hyphen in backup code
- Wrong length
- Invalid characters
- Extra spaces

---

### INVALID_CODE

**HTTP Status:** `401`

**Description:** Backup code is invalid or already used.

**Response:**
```json
{
  "error": true,
  "message": "Invalid backup code",
  "messageEn": "Invalid backup code",
  "code": "INVALID_CODE"
}
```

**Frontend Handling:**
- Show error: "This backup code is invalid or has already been used"
- Allow retry with different code
- Show remaining attempts if available
- Suggest "Try TOTP code instead"
- Warning if few backup codes remain

**Example Scenarios:**
- Code already used
- Wrong backup code
- Code from different account
- Regenerated codes (old codes invalid)

---

### INVALID_PASSWORD

**HTTP Status:** `400`

**Description:** Password provided for verification is incorrect.

**Response:**
```json
{
  "error": true,
  "message": "Invalid password",
  "messageEn": "Invalid password",
  "code": "INVALID_PASSWORD"
}
```

**Frontend Handling:**
- Show error on password field
- Clear password input
- Increment failed attempt counter
- Lock form after 3 failed attempts
- Suggest password reset

**Example Scenarios:**
- Wrong password for MFA disable
- Wrong password for sensitive operations
- Password change required

---

## WebAuthn Errors

### WEBAUTHN_NOT_SUPPORTED

**HTTP Status:** `400`

**Description:** WebAuthn is not supported by the browser or device.

**Response:**
```json
{
  "success": false,
  "message": "WebAuthn is not supported on this device",
  "code": "WEBAUTHN_NOT_SUPPORTED"
}
```

**Frontend Handling:**
- Check `window.PublicKeyCredential` before showing WebAuthn option
- Show fallback message: "Security keys are not supported on this browser"
- Suggest alternative authentication methods
- List supported browsers

**Example Scenarios:**
- Old browser version
- Insecure context (HTTP instead of HTTPS)
- Browser without WebAuthn API

---

### WEBAUTHN_REGISTRATION_FAILED

**HTTP Status:** `400`

**Description:** WebAuthn credential registration failed.

**Response:**
```json
{
  "success": false,
  "message": "Failed to register security key",
  "code": "WEBAUTHN_REGISTRATION_FAILED",
  "details": "User cancelled the operation"
}
```

**Frontend Handling:**
- Show specific error based on details
- User cancelled: "Security key registration cancelled"
- Timeout: "Registration timeout, please try again"
- Allow retry
- Provide help link

**Example Scenarios:**
- User cancelled browser prompt
- Timeout waiting for user action
- Hardware security key not detected
- Invalid credential response

---

### WEBAUTHN_AUTHENTICATION_FAILED

**HTTP Status:** `401`

**Description:** WebAuthn authentication verification failed.

**Response:**
```json
{
  "success": false,
  "message": "Security key authentication failed",
  "code": "WEBAUTHN_AUTHENTICATION_FAILED"
}
```

**Frontend Handling:**
- Show error: "Authentication failed. Please try again."
- Allow retry
- Suggest fallback: "Use password instead"
- Check for common issues (security key removed too early)

**Example Scenarios:**
- Wrong security key used
- Signature verification failed
- Security key removed during process
- Challenge mismatch

---

### CREDENTIAL_ALREADY_REGISTERED

**HTTP Status:** `409`

**Description:** This WebAuthn credential is already registered.

**Response:**
```json
{
  "success": false,
  "message": "This security key is already registered",
  "code": "CREDENTIAL_ALREADY_REGISTERED"
}
```

**Frontend Handling:**
- Show message: "This security key is already registered to your account"
- List existing credentials
- Suggest using different key
- Provide "Manage security keys" link

**Example Scenarios:**
- Re-registering same key
- Key registered to same account
- Duplicate credential ID

---

### CANNOT_DELETE_LAST_CREDENTIAL

**HTTP Status:** `400`

**Description:** Cannot delete the last WebAuthn credential.

**Response:**
```json
{
  "success": false,
  "message": "Cannot delete last credential. Please add another credential first.",
  "code": "CANNOT_DELETE_LAST_CREDENTIAL"
}
```

**Frontend Handling:**
- Disable delete button for last credential
- Show tooltip: "Add another security key before removing this one"
- Suggest adding password authentication first
- Explain risk of account lockout

**Example Scenarios:**
- Only one credential registered
- Trying to delete primary credential
- Account security requirement

---

## SAML/SSO Errors

### SSO_NOT_ENABLED

**HTTP Status:** `400`

**Description:** SSO is not enabled for this firm.

**Response:**
```json
{
  "error": true,
  "message": "SSO is not enabled for this firm",
  "code": "SSO_NOT_ENABLED"
}
```

**Frontend Handling:**
- Hide SSO login button
- Show standard login form
- If admin, show "Configure SSO" button
- Redirect to normal login

**Example Scenarios:**
- SSO disabled in settings
- Firm doesn't have SSO configured
- SSO feature not available for plan

---

### SSO_CONFIGURATION_INVALID

**HTTP Status:** `400`

**Description:** SAML/SSO configuration is invalid or incomplete.

**Response:**
```json
{
  "error": true,
  "message": "SSO configuration is invalid",
  "code": "SSO_CONFIGURATION_INVALID",
  "details": ["Invalid certificate format", "Missing entity ID"]
}
```

**Frontend Handling:**
- Show error to admin only
- List specific configuration issues
- Provide "Fix SSO Configuration" button
- Show documentation link
- Fallback to password login for users

**Example Scenarios:**
- Invalid certificate
- Missing required fields
- IdP metadata unreachable
- Certificate expired

---

### SAML_RESPONSE_INVALID

**HTTP Status:** `400`

**Description:** SAML response from IdP is invalid.

**Response:**
```json
{
  "error": true,
  "message": "Invalid SAML response",
  "code": "SAML_RESPONSE_INVALID"
}
```

**Frontend Handling:**
- Show error: "SSO login failed. Please try again or use password login."
- Log technical details for admin
- Provide fallback login option
- Contact support if persists

**Example Scenarios:**
- Tampered SAML response
- Signature verification failed
- Expired assertion
- Response not matching request

---

### SSO_USER_NOT_FOUND

**HTTP Status:** `404`

**Description:** User authenticated via SSO but not found in system.

**Response:**
```json
{
  "error": true,
  "message": "User not found. Please contact your administrator.",
  "code": "SSO_USER_NOT_FOUND",
  "email": "user@example.com"
}
```

**Frontend Handling:**
- Show: "Your SSO login was successful, but you don't have an account. Contact your administrator."
- Show email from SAML assertion
- Provide admin contact information
- Suggest account creation if self-service enabled

**Example Scenarios:**
- User deleted from system
- Email mismatch between IdP and system
- Account not provisioned
- Wrong IdP used

---

## Session Management Errors

### SESSION_NOT_FOUND

**HTTP Status:** `404`

**Description:** Session not found or already terminated.

**Response:**
```json
{
  "error": true,
  "message": "Session not found",
  "code": "SESSION_NOT_FOUND"
}
```

**Frontend Handling:**
- Refresh session list
- Remove session from UI
- Show: "Session already terminated"
- No retry needed

**Example Scenarios:**
- Session already deleted
- Invalid session ID
- Session expired

---

### SESSION_EXPIRED

**HTTP Status:** `401`

**Description:** Session has expired due to inactivity.

**Response:**
```json
{
  "error": true,
  "message": "Your session has expired due to inactivity",
  "code": "SESSION_EXPIRED"
}
```

**Frontend Handling:**
- Show modal: "Session expired due to inactivity"
- Redirect to login
- Clear authentication state
- Save work if possible (draft save)

**Example Scenarios:**
- 7 days of inactivity
- Session timeout configured by admin
- Forced session expiration

---

### CANNOT_TERMINATE_CURRENT_SESSION

**HTTP Status:** `400`

**Description:** Cannot terminate the current active session.

**Response:**
```json
{
  "error": true,
  "message": "Cannot terminate current session. Use logout instead.",
  "code": "CANNOT_TERMINATE_CURRENT_SESSION"
}
```

**Frontend Handling:**
- Disable "Terminate" button for current session
- Show "Logout" button instead
- Tooltip: "Use logout to end your current session"
- Highlight current session differently

**Example Scenarios:**
- Trying to delete current session
- Should use logout endpoint instead

---

## Account Security Errors

### ACCOUNT_LOCKED

**HTTP Status:** `403`

**Description:** Account is locked due to security reasons.

**Response:**
```json
{
  "error": true,
  "message": "Account locked due to suspicious activity",
  "messageEn": "Account locked due to suspicious activity",
  "code": "ACCOUNT_LOCKED",
  "lockedUntil": "2024-01-15T10:30:00.000Z"
}
```

**Frontend Handling:**
- Show prominent error message
- Display lock duration if available
- Provide "Contact Support" option
- Show unlock time countdown
- Suggest password reset for permanent locks

**Example Scenarios:**
- Multiple failed login attempts
- Suspicious activity detected
- Manual admin lock
- Security policy violation

---

### ACCOUNT_SUSPENDED

**HTTP Status:** `403`

**Description:** Account has been suspended by administrator.

**Response:**
```json
{
  "error": true,
  "message": "Your account has been suspended. Contact support.",
  "code": "ACCOUNT_SUSPENDED"
}
```

**Frontend Handling:**
- Show: "Your account has been suspended"
- Provide support contact information
- Don't allow any account operations
- Show suspension reason if available

**Example Scenarios:**
- Admin suspension
- Policy violation
- Payment failure
- Terms violation

---

### ACCOUNT_ANONYMIZED

**HTTP Status:** `403`

**Description:** Account has been anonymized (GDPR/data retention).

**Response:**
```json
{
  "error": true,
  "message": "This account is no longer active",
  "code": "ACCOUNT_ANONYMIZED"
}
```

**Frontend Handling:**
- Show: "This account is no longer available"
- Don't reveal it's anonymized (privacy)
- Suggest creating new account
- Provide support contact

**Example Scenarios:**
- User requested account deletion
- Data retention policy applied
- GDPR right to erasure

---

### WEAK_PASSWORD

**HTTP Status:** `400`

**Description:** Password doesn't meet security requirements.

**Response:**
```json
{
  "error": true,
  "message": "Password does not meet security requirements",
  "code": "WEAK_PASSWORD",
  "requirements": {
    "minLength": 8,
    "requireUppercase": true,
    "requireLowercase": true,
    "requireNumbers": true,
    "requireSpecialChars": true
  }
}
```

**Frontend Handling:**
- Show password requirements inline
- Real-time validation as user types
- Visual indicators for each requirement
- Strength meter
- Don't submit until all requirements met

**Example Scenarios:**
- Password too short
- Missing required character types
- Common password
- Previously breached password

---

## Rate Limiting Errors

### RATE_LIMIT_EXCEEDED

**HTTP Status:** `429`

**Description:** General rate limit exceeded.

**Response:**
```json
{
  "success": false,
  "error": "Too many requests - Please try again later",
  "error_en": "Too many requests - Please try again later",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

**Headers:**
```
RateLimit-Limit: 300
RateLimit-Remaining: 0
RateLimit-Reset: 1705320000
```

**Frontend Handling:**
- Parse `RateLimit-Reset` header
- Calculate time until reset
- Show countdown timer
- Disable form submissions
- Implement exponential backoff
- Show: "Too many requests. Please wait X minutes."

**Example Scenarios:**
- Rapid API calls
- Automated requests
- API abuse

---

### AUTH_RATE_LIMIT_EXCEEDED

**HTTP Status:** `429`

**Description:** Too many authentication attempts.

**Response:**
```json
{
  "success": false,
  "error": "Too many authentication attempts - Try again after 15 minutes",
  "error_en": "Too many authentication attempts - Try again after 15 minutes",
  "code": "AUTH_RATE_LIMIT_EXCEEDED"
}
```

**Frontend Handling:**
- Disable login form
- Show countdown: "Too many login attempts. Try again in X minutes."
- Suggest password reset
- Show CAPTCHA if available
- Clear after timeout

**Example Scenarios:**
- Multiple failed logins (15 in 15 minutes)
- Brute force attempt
- Multiple users on same IP

---

### SENSITIVE_RATE_LIMIT_EXCEEDED

**HTTP Status:** `429`

**Description:** Too many attempts for sensitive operation.

**Response:**
```json
{
  "success": false,
  "error": "Too many attempts for this sensitive action - Try again after 1 hour",
  "error_en": "Too many attempts for this sensitive action - Try again after 1 hour",
  "code": "SENSITIVE_RATE_LIMIT_EXCEEDED"
}
```

**Frontend Handling:**
- Disable sensitive operation buttons
- Show: "Too many attempts. Try again in X hour(s)."
- Explain why it's rate limited
- Show exact reset time
- Send email notification to user

**Example Scenarios:**
- MFA setup attempts (3 per hour)
- Password changes
- WebAuthn registration
- Security settings changes

---

## Validation Errors

### VALIDATION_ERROR

**HTTP Status:** `400`

**Description:** Request validation failed.

**Response:**
```json
{
  "error": true,
  "message": "Validation failed",
  "messageAr": "فشل التحقق من البيانات",
  "code": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "password",
      "message": "Password is required"
    }
  ]
}
```

**Frontend Handling:**
- Map errors to form fields
- Show error under each field
- Highlight fields in error state
- Focus first error field
- Don't submit until validation passes

**Example Scenarios:**
- Missing required fields
- Invalid format (email, phone)
- Field constraints violated
- Type mismatch

---

### INVALID_INPUT

**HTTP Status:** `400`

**Description:** Input data is invalid.

**Response:**
```json
{
  "error": true,
  "message": "Invalid input provided",
  "messageAr": "المدخلات غير صالحة",
  "code": "INVALID_INPUT"
}
```

**Frontend Handling:**
- Show specific field error if available
- Generic message if field unknown
- Clear invalid input
- Show expected format
- Provide examples

**Example Scenarios:**
- Malformed JSON
- Invalid data type
- Out of range values
- SQL injection attempt blocked

---

## Permission Errors

### FORBIDDEN

**HTTP Status:** `403`

**Description:** User doesn't have permission for this action.

**Response:**
```json
{
  "error": true,
  "message": "Access denied",
  "messageAr": "تم رفض الوصول",
  "code": "FORBIDDEN"
}
```

**Frontend Handling:**
- Hide UI elements user can't access
- Show: "You don't have permission to perform this action"
- Suggest contacting administrator
- Redirect to accessible page
- Log for security monitoring

**Example Scenarios:**
- Non-admin accessing admin endpoint
- Wrong role for operation
- Firm-level permission missing
- Resource belongs to another user

---

### INSUFFICIENT_PERMISSIONS

**HTTP Status:** `403`

**Description:** User has partial but insufficient permissions.

**Response:**
```json
{
  "error": true,
  "message": "Insufficient permissions",
  "messageAr": "صلاحيات غير كافية",
  "code": "INSUFFICIENT_PERMISSIONS",
  "required": ["admin", "manage_users"]
}
```

**Frontend Handling:**
- Show required permissions
- Explain what's needed
- Link to permission request process
- Show admin contact
- Hide unavailable features

**Example Scenarios:**
- Need admin role
- Need specific permission
- Plan upgrade required
- Firm owner only

---

## Frontend Error Handling Guide

### Global Error Handler

```javascript
// Global error handler for all API responses
function handleSecurityError(error) {
  const { code, status } = error;

  switch (code) {
    case 'UNAUTHORIZED':
    case 'TOKEN_EXPIRED':
      // Clear auth and redirect to login
      clearAuth();
      redirectToLogin();
      break;

    case 'MFA_REQUIRED':
      // Show MFA verification page
      showMFAVerification(error.userId);
      break;

    case 'ACCOUNT_LOCKED':
      // Show account locked message with countdown
      showAccountLockedModal(error.lockedUntil);
      break;

    case 'RATE_LIMIT_EXCEEDED':
    case 'AUTH_RATE_LIMIT_EXCEEDED':
    case 'SENSITIVE_RATE_LIMIT_EXCEEDED':
      // Show rate limit message with countdown
      showRateLimitError(error);
      break;

    default:
      // Show generic error
      showErrorNotification(error.message || error.messageEn);
  }
}
```

### Rate Limit Handling

```javascript
// Handle rate limiting with exponential backoff
class RateLimitHandler {
  constructor() {
    this.retryAfter = null;
    this.retryCount = 0;
  }

  async handleRateLimit(response) {
    const resetTime = parseInt(response.headers.get('RateLimit-Reset'));
    const resetDate = new Date(resetTime * 1000);

    this.retryAfter = resetDate;
    this.retryCount++;

    // Show countdown to user
    this.showCountdown(resetDate);

    // Disable form
    this.disableForm();

    // Wait and enable
    setTimeout(() => {
      this.enableForm();
      this.retryCount = 0;
    }, resetDate - Date.now());
  }

  showCountdown(resetDate) {
    const updateCountdown = () => {
      const now = new Date();
      const diff = resetDate - now;

      if (diff <= 0) {
        this.hideCountdown();
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      this.updateUI(`Please wait ${minutes}m ${seconds}s`);

      setTimeout(updateCountdown, 1000);
    };

    updateCountdown();
  }
}
```

### MFA Flow Handling

```javascript
// Complete MFA authentication flow
async function handleMFALogin(email, password) {
  try {
    const response = await login(email, password);

    // Check if MFA required
    if (response.code === 'MFA_REQUIRED') {
      // Store userId temporarily
      sessionStorage.setItem('mfaUserId', response.userId);

      // Show MFA input
      showMFAVerification();

      return;
    }

    // Login successful
    handleSuccessfulLogin(response);

  } catch (error) {
    handleLoginError(error);
  }
}

async function verifyMFA(token) {
  const userId = sessionStorage.getItem('mfaUserId');

  if (!userId) {
    showError('MFA session expired. Please login again.');
    redirectToLogin();
    return;
  }

  try {
    const response = await verifyMFAToken(userId, token);

    // Clear temporary data
    sessionStorage.removeItem('mfaUserId');

    // Complete login
    handleSuccessfulLogin(response);

  } catch (error) {
    if (error.code === 'INVALID_TOKEN') {
      showError('Invalid code. Please try again.');
      // Don't redirect, allow retry
    } else {
      handleLoginError(error);
    }
  }
}
```

### WebAuthn Error Handling

```javascript
// Handle WebAuthn-specific errors
async function registerWebAuthn() {
  // Check browser support
  if (!window.PublicKeyCredential) {
    showError('Security keys are not supported on this browser.');
    showAlternativeAuthMethods();
    return;
  }

  try {
    // Start registration
    const options = await startWebAuthnRegistration();

    // Call browser API
    const credential = await navigator.credentials.create({
      publicKey: options
    });

    // Finish registration
    await finishWebAuthnRegistration(credential);

    showSuccess('Security key registered successfully!');

  } catch (error) {
    // Handle specific WebAuthn errors
    if (error.name === 'NotAllowedError') {
      showError('Registration cancelled or timed out.');
    } else if (error.name === 'InvalidStateError') {
      showError('This security key is already registered.');
    } else if (error.name === 'NotSupportedError') {
      showError('This security key is not supported.');
    } else {
      showError('Failed to register security key. Please try again.');
      console.error('WebAuthn error:', error);
    }
  }
}
```

### Session Management

```javascript
// Monitor and manage sessions
class SessionManager {
  constructor() {
    this.sessions = [];
    this.currentSessionId = null;
  }

  async loadSessions() {
    try {
      const response = await fetch('/api/auth/sessions', {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });

      const data = await response.json();
      this.sessions = data.sessions;

      // Find current session
      this.currentSessionId = data.sessions.find(s => s.isCurrent)?.id;

      this.renderSessions();

    } catch (error) {
      handleSecurityError(error);
    }
  }

  async terminateSession(sessionId) {
    if (sessionId === this.currentSessionId) {
      showError('Cannot terminate current session. Use logout instead.');
      return;
    }

    try {
      await fetch(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });

      showSuccess('Session terminated successfully');
      this.loadSessions(); // Refresh list

    } catch (error) {
      if (error.code === 'SESSION_NOT_FOUND') {
        // Already terminated, just refresh
        this.loadSessions();
      } else {
        handleSecurityError(error);
      }
    }
  }

  async terminateAllOthers() {
    if (!confirm('This will log you out of all other devices. Continue?')) {
      return;
    }

    try {
      const response = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });

      const data = await response.json();
      showSuccess(`Terminated ${data.terminatedCount} session(s)`);
      this.loadSessions();

    } catch (error) {
      handleSecurityError(error);
    }
  }
}
```

### Validation Helpers

```javascript
// Form validation with error display
function validateAndShowErrors(formData, errors) {
  // Clear previous errors
  clearAllErrors();

  if (!errors || errors.length === 0) {
    return true;
  }

  // Map errors to fields
  errors.forEach(error => {
    const field = document.querySelector(`[name="${error.field}"]`);
    if (field) {
      showFieldError(field, error.message);
    }
  });

  // Focus first error
  const firstError = errors[0];
  const firstField = document.querySelector(`[name="${firstError.field}"]`);
  if (firstField) {
    firstField.focus();
  }

  return false;
}

function showFieldError(field, message) {
  // Add error class
  field.classList.add('error');

  // Create error message element
  const errorEl = document.createElement('div');
  errorEl.className = 'field-error';
  errorEl.textContent = message;

  // Insert after field
  field.parentNode.insertBefore(errorEl, field.nextSibling);
}

function clearAllErrors() {
  document.querySelectorAll('.error').forEach(el => {
    el.classList.remove('error');
  });

  document.querySelectorAll('.field-error').forEach(el => {
    el.remove();
  });
}
```

---

## Best Practices

### 1. User-Friendly Error Messages

- Use clear, non-technical language
- Explain what went wrong
- Provide actionable next steps
- Show expected format/requirements
- Include support contact for critical errors

### 2. Security Considerations

- Don't reveal sensitive information in errors
- Use generic messages for authentication failures
- Log detailed errors server-side only
- Rate limit error responses
- Monitor repeated errors (possible attack)

### 3. Progressive Disclosure

- Show basic error first
- Provide "Show details" for technical info
- Log full errors for debugging
- Show help links contextually
- Escalate to support when needed

### 4. Accessibility

- Use proper ARIA attributes for errors
- Announce errors to screen readers
- Provide keyboard navigation
- Use color + text (not color alone)
- Support high contrast mode

### 5. Error Recovery

- Allow retry for transient errors
- Save form data before error
- Auto-retry for network errors (with backoff)
- Provide alternative flows
- Clear error state on input change

---

## Support & Resources

### Documentation
- [API Security Endpoints](./API_SECURITY_ENDPOINTS.md)
- [SAML SSO Setup](./SAML_SSO_SETUP.md)
- [MFA Implementation Guide](../MFA_BACKUP_CODES_IMPLEMENTATION.md)

### Security
- Report security issues: security@example.com
- Bug reports: support@example.com

### Compliance
- NCA ECC-2:2024 Compliance
- OWASP Top 10 Standards
- GDPR/Data Protection

---

**Last Updated:** 2024-01-15
**Version:** 1.0
**Maintained By:** Security Team
