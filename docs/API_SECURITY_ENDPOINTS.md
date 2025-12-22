# API Security Endpoints Documentation

## Table of Contents

- [Authentication](#authentication)
- [SAML/SSO Endpoints](#samlsso-endpoints)
- [MFA/TOTP Endpoints](#mfatotp-endpoints)
- [WebAuthn Endpoints](#webauthn-endpoints)
- [Session Management Endpoints](#session-management-endpoints)
- [Rate Limiting](#rate-limiting)
- [Error Responses](#error-responses)

---

## Authentication

All protected endpoints require authentication via JWT token in one of the following formats:

### Authorization Header
```
Authorization: Bearer <token>
```

### Cookie
```
accessToken=<token>
```

---

## SAML/SSO Endpoints

Enterprise SSO authentication using SAML 2.0 protocol.

### GET /api/auth/saml/metadata/:firmId

Get Service Provider metadata XML for IdP configuration.

**Parameters:**
- `firmId` (path, required) - Firm ID

**Headers:**
- None required (public endpoint)

**Rate Limiting:** `publicRateLimiter` (300 requests per 15 minutes)

**Response:**

**Success (200 OK):**
```xml
Content-Type: application/xml

<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata">
  <!-- SAML SP Metadata -->
</EntityDescriptor>
```

**Error Responses:**
- `404 Not Found` - Firm not found
- `500 Internal Server Error` - Failed to generate metadata

**Example:**
```bash
curl -X GET "https://api.example.com/api/auth/saml/metadata/507f1f77bcf86cd799439011"
```

---

### GET /api/auth/saml/login/:firmId

Initiate SSO login flow - redirects to IdP for authentication.

**Parameters:**
- `firmId` (path, required) - Firm ID
- `RelayState` (query, optional) - Redirect path after successful login

**Headers:**
- None required (public endpoint)

**Rate Limiting:** `authRateLimiter` (15 attempts per 15 minutes)

**Response:**

**Success (302 Found):**
```
Location: https://idp.example.com/saml/sso?SAMLRequest=...
```

**Error Responses:**
- `400 Bad Request` - SSO not enabled for this firm
  ```json
  {
    "error": true,
    "message": "SSO is not enabled for this firm"
  }
  ```
- `404 Not Found` - Firm not found

**Example:**
```bash
curl -X GET "https://api.example.com/api/auth/saml/login/507f1f77bcf86cd799439011?RelayState=/dashboard"
```

---

### POST /api/auth/saml/acs/:firmId

Assertion Consumer Service - receives and processes SAML assertion from IdP.

**Parameters:**
- `firmId` (path, required) - Firm ID

**Headers:**
- `Content-Type: application/x-www-form-urlencoded`

**Request Body:**
```
SAMLResponse=<base64-encoded-saml-assertion>
RelayState=/dashboard
```

**Rate Limiting:** None (IdP callback)

**Response:**

**Success (302 Found):**
```
Location: /dashboard
Set-Cookie: accessToken=<jwt-token>; HttpOnly; Secure; SameSite=Strict
```

**Error Responses:**
- `400 Bad Request` - Invalid SAML response
  ```json
  {
    "error": true,
    "message": "Invalid SAML response"
  }
  ```
- `404 Not Found` - Firm not found

---

### GET /api/auth/saml/logout/:firmId

Initiate Single Logout (SLO) flow.

**Parameters:**
- `firmId` (path, required) - Firm ID

**Headers:**
- None required

**Rate Limiting:** None

**Response:**

**Success (302 Found):**
```
Location: https://idp.example.com/saml/logout?SAMLRequest=...
```

**Error Responses:**
- `404 Not Found` - Firm not found

---

### POST /api/auth/saml/sls/:firmId

Single Logout Service - receives logout response from IdP.

**Parameters:**
- `firmId` (path, required) - Firm ID

**Headers:**
- `Content-Type: application/x-www-form-urlencoded`

**Request Body:**
```
SAMLResponse=<base64-encoded-saml-logout-response>
```

**Rate Limiting:** None (IdP callback)

**Response:**

**Success (302 Found):**
```
Location: /login
Set-Cookie: accessToken=; Max-Age=0
```

**Error Responses:**
- `404 Not Found` - Firm not found

---

### GET /api/auth/saml/config

Get current SAML configuration for firm (Admin only).

**Authentication:** Required (Bearer token)

**Permissions:** Admin only

**Headers:**
```
Authorization: Bearer <token>
```

**Rate Limiting:** `authenticate` middleware + no additional limit

**Response:**

**Success (200 OK):**
```json
{
  "error": false,
  "message": "Success",
  "config": {
    "ssoEnabled": true,
    "ssoProvider": "azure",
    "ssoEntityId": "https://sts.windows.net/...",
    "ssoSsoUrl": "https://login.microsoftonline.com/.../saml2",
    "ssoMetadataUrl": "https://login.microsoftonline.com/.../federationmetadata/2007-06/...",
    "hasCertificate": true,
    "spEntityId": "https://api.example.com/saml/metadata/507f1f77bcf86cd799439011",
    "spAcsUrl": "https://api.example.com/api/auth/saml/acs/507f1f77bcf86cd799439011",
    "spSloUrl": "https://api.example.com/api/auth/saml/logout/507f1f77bcf86cd799439011",
    "spMetadataUrl": "https://api.example.com/api/auth/saml/metadata/507f1f77bcf86cd799439011"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions

**Example:**
```bash
curl -X GET "https://api.example.com/api/auth/saml/config" \
  -H "Authorization: Bearer <token>"
```

---

### PUT /api/auth/saml/config

Update SAML configuration for firm (Admin only).

**Authentication:** Required (Bearer token)

**Permissions:** Admin only

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "ssoEnabled": true,
  "ssoProvider": "azure",
  "ssoEntityId": "https://sts.windows.net/...",
  "ssoSsoUrl": "https://login.microsoftonline.com/.../saml2",
  "ssoCertificate": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
  "ssoMetadataUrl": "https://login.microsoftonline.com/.../federationmetadata/2007-06/..."
}
```

**Required Fields:**
- `ssoProvider` - One of: `azure`, `okta`, `google`, `custom`
- `ssoEntityId` - IdP Entity ID
- `ssoSsoUrl` - IdP SSO URL
- `ssoCertificate` - IdP X.509 certificate (PEM format)

**Optional Fields:**
- `ssoEnabled` - Enable/disable SSO (default: false)
- `ssoMetadataUrl` - IdP metadata URL

**Rate Limiting:** `authenticate` middleware + no additional limit

**Response:**

**Success (200 OK):**
```json
{
  "error": false,
  "message": "SAML configuration updated successfully",
  "config": {
    "ssoEnabled": true,
    "ssoProvider": "azure",
    "ssoEntityId": "https://sts.windows.net/...",
    "ssoSsoUrl": "https://login.microsoftonline.com/.../saml2",
    "hasCertificate": true
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid configuration
  ```json
  {
    "error": true,
    "message": "Invalid SAML configuration",
    "details": ["Invalid certificate format"]
  }
  ```
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions

**Example:**
```bash
curl -X PUT "https://api.example.com/api/auth/saml/config" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "ssoEnabled": true,
    "ssoProvider": "azure",
    "ssoEntityId": "https://sts.windows.net/...",
    "ssoSsoUrl": "https://login.microsoftonline.com/.../saml2",
    "ssoCertificate": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
  }'
```

---

### POST /api/auth/saml/config/test

Test SAML configuration validity (Admin only).

**Authentication:** Required (Bearer token)

**Permissions:** Admin only

**Headers:**
```
Authorization: Bearer <token>
```

**Rate Limiting:** `authenticate` middleware + no additional limit

**Response:**

**Success (200 OK):**
```json
{
  "error": false,
  "message": "SAML configuration is valid",
  "valid": true
}
```

**Error Responses:**
- `400 Bad Request` - Configuration is invalid
  ```json
  {
    "error": true,
    "message": "SAML configuration is invalid",
    "valid": false,
    "errors": [
      "Unable to connect to IdP metadata URL",
      "Invalid certificate"
    ]
  }
  ```
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions

---

## MFA/TOTP Endpoints

Multi-Factor Authentication using Time-based One-Time Passwords (TOTP).

### POST /api/auth/mfa/setup

Start MFA setup - generates TOTP secret and QR code.

**Authentication:** Required (Bearer token)

**Headers:**
```
Authorization: Bearer <token>
```

**Rate Limiting:** `sensitiveRateLimiter` (3 attempts per hour)

**Response:**

**Success (200 OK):**
```json
{
  "error": false,
  "message": "Scan the QR code with your authenticator app",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "setupKey": "JBSWY3DPEHPK3PXP",
  "instructions": {
    "ar": "افتح تطبيق المصادقة (Google Authenticator أو Authy) وامسح رمز QR أو أدخل المفتاح يدوياً",
    "en": "Open your authenticator app (Google Authenticator or Authy) and scan the QR code or enter the key manually"
  }
}
```

**Error Responses:**
- `400 Bad Request` - MFA already enabled
  ```json
  {
    "error": true,
    "message": "MFA is already enabled",
    "messageEn": "MFA is already enabled",
    "code": "MFA_ALREADY_ENABLED"
  }
  ```
- `401 Unauthorized` - Authentication required
- `404 Not Found` - User not found

**Example:**
```bash
curl -X POST "https://api.example.com/api/auth/mfa/setup" \
  -H "Authorization: Bearer <token>"
```

---

### POST /api/auth/mfa/verify-setup

Verify setup code and enable MFA.

**Authentication:** Required (Bearer token)

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "token": "123456"
}
```

**Required Fields:**
- `token` - 6-digit TOTP code from authenticator app

**Rate Limiting:** `authRateLimiter` (15 attempts per 15 minutes)

**Response:**

**Success (200 OK):**
```json
{
  "error": false,
  "message": "MFA enabled successfully",
  "enabled": true,
  "backupCodes": [
    "ABCD-1234",
    "EFGH-5678",
    "IJKL-9012",
    "MNOP-3456",
    "QRST-7890",
    "UVWX-1234",
    "YZAB-5678",
    "CDEF-9012",
    "GHIJ-3456",
    "KLMN-7890"
  ]
}
```

**Error Responses:**
- `400 Bad Request` - Invalid or missing token
  ```json
  {
    "error": true,
    "message": "Invalid verification token",
    "messageEn": "Invalid verification token",
    "code": "INVALID_TOKEN"
  }
  ```
- `400 Bad Request` - MFA setup not started
  ```json
  {
    "error": true,
    "message": "MFA setup not started",
    "messageEn": "MFA setup not started",
    "code": "MFA_SETUP_NOT_STARTED"
  }
  ```
- `401 Unauthorized` - Authentication required

**Example:**
```bash
curl -X POST "https://api.example.com/api/auth/mfa/verify-setup" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"token": "123456"}'
```

---

### POST /api/auth/mfa/verify

Verify TOTP code during login.

**Authentication:** Not required (used during login flow)

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "token": "123456"
}
```

**Required Fields:**
- `userId` - User ID (from login response)
- `token` - 6-digit TOTP code or backup code

**Rate Limiting:** `authRateLimiter` (15 attempts per 15 minutes)

**Response:**

**Success (200 OK):**
```json
{
  "error": false,
  "valid": true,
  "message": "MFA verification successful"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid token
  ```json
  {
    "error": true,
    "message": "Invalid MFA token",
    "messageEn": "Invalid MFA token",
    "code": "INVALID_TOKEN"
  }
  ```
- `400 Bad Request` - MFA not enabled
  ```json
  {
    "error": true,
    "message": "MFA is not enabled",
    "messageEn": "MFA is not enabled",
    "code": "MFA_NOT_ENABLED"
  }
  ```
- `401 Unauthorized` - User not found

**Example:**
```bash
curl -X POST "https://api.example.com/api/auth/mfa/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "token": "123456"
  }'
```

---

### POST /api/auth/mfa/disable

Disable MFA for authenticated user.

**Authentication:** Required (Bearer token)

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "password": "user_password"
}
```

**Required Fields:**
- `password` - User password for verification

**Rate Limiting:** `sensitiveRateLimiter` (3 attempts per hour)

**Response:**

**Success (200 OK):**
```json
{
  "error": false,
  "message": "MFA disabled successfully",
  "disabled": true
}
```

**Error Responses:**
- `400 Bad Request` - Invalid password
  ```json
  {
    "error": true,
    "message": "Invalid password",
    "messageEn": "Invalid password",
    "code": "INVALID_PASSWORD"
  }
  ```
- `400 Bad Request` - MFA not enabled
  ```json
  {
    "error": true,
    "message": "MFA is not enabled",
    "messageEn": "MFA is not enabled",
    "code": "MFA_NOT_ENABLED"
  }
  ```
- `401 Unauthorized` - Authentication required

**Example:**
```bash
curl -X POST "https://api.example.com/api/auth/mfa/disable" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"password": "user_password"}'
```

---

### GET /api/auth/mfa/status

Get MFA status for authenticated user.

**Authentication:** Required (Bearer token)

**Headers:**
```
Authorization: Bearer <token>
```

**Rate Limiting:** `publicRateLimiter` (300 requests per 15 minutes)

**Response:**

**Success (200 OK):**
```json
{
  "error": false,
  "mfaEnabled": true,
  "hasTOTP": true,
  "hasBackupCodes": true,
  "remainingCodes": 8
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required

**Example:**
```bash
curl -X GET "https://api.example.com/api/auth/mfa/status" \
  -H "Authorization: Bearer <token>"
```

---

### POST /api/auth/mfa/backup-codes/generate

Generate new backup codes for MFA recovery.

**Authentication:** Required (Bearer token)

**Headers:**
```
Authorization: Bearer <token>
```

**Rate Limiting:** `sensitiveRateLimiter` (3 attempts per hour)

**Response:**

**Success (200 OK):**
```json
{
  "error": false,
  "message": "Backup codes generated successfully",
  "codes": [
    "ABCD-1234",
    "EFGH-5678",
    "IJKL-9012",
    "MNOP-3456",
    "QRST-7890",
    "UVWX-1234",
    "YZAB-5678",
    "CDEF-9012",
    "GHIJ-3456",
    "KLMN-7890"
  ],
  "remainingCodes": 10
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required

**Example:**
```bash
curl -X POST "https://api.example.com/api/auth/mfa/backup-codes/generate" \
  -H "Authorization: Bearer <token>"
```

---

### POST /api/auth/mfa/backup-codes/verify

Verify backup code during login (alternative to TOTP).

**Authentication:** Not required (used during login flow)

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "code": "ABCD-1234"
}
```

**Required Fields:**
- `userId` - User ID
- `code` - Backup code in format XXXX-XXXX

**Rate Limiting:** `authRateLimiter` (15 attempts per 15 minutes)

**Response:**

**Success (200 OK):**
```json
{
  "error": false,
  "valid": true,
  "remainingCodes": 9,
  "message": "Backup code verified successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid format
  ```json
  {
    "error": true,
    "message": "Invalid backup code format",
    "messageEn": "Invalid backup code format",
    "code": "INVALID_FORMAT"
  }
  ```
- `401 Unauthorized` - Invalid code
  ```json
  {
    "error": true,
    "message": "Invalid backup code",
    "messageEn": "Invalid backup code",
    "code": "INVALID_CODE"
  }
  ```

**Example:**
```bash
curl -X POST "https://api.example.com/api/auth/mfa/backup-codes/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "code": "ABCD-1234"
  }'
```

---

### GET /api/auth/mfa/backup-codes/count

Get number of unused backup codes.

**Authentication:** Required (Bearer token)

**Headers:**
```
Authorization: Bearer <token>
```

**Rate Limiting:** `publicRateLimiter` (300 requests per 15 minutes)

**Response:**

**Success (200 OK):**
```json
{
  "error": false,
  "remainingCodes": 8
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required

**Example:**
```bash
curl -X GET "https://api.example.com/api/auth/mfa/backup-codes/count" \
  -H "Authorization: Bearer <token>"
```

---

## WebAuthn Endpoints

Hardware security key and biometric authentication using FIDO2/WebAuthn.

### POST /api/auth/webauthn/register/start

Start WebAuthn credential registration.

**Authentication:** Required (Bearer token)

**Headers:**
```
Authorization: Bearer <token>
```

**Rate Limiting:** `sensitiveRateLimiter` (3 attempts per hour)

**Response:**

**Success (200 OK):**
```json
{
  "success": true,
  "data": {
    "challenge": "base64-encoded-challenge",
    "rp": {
      "name": "Traf3li",
      "id": "example.com"
    },
    "user": {
      "id": "base64-encoded-user-id",
      "name": "user@example.com",
      "displayName": "John Doe"
    },
    "pubKeyCredParams": [
      {"type": "public-key", "alg": -7},
      {"type": "public-key", "alg": -257}
    ],
    "timeout": 60000,
    "authenticatorSelection": {
      "authenticatorAttachment": "cross-platform",
      "requireResidentKey": false,
      "userVerification": "preferred"
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `429 Too Many Requests` - Rate limit exceeded

**Example:**
```bash
curl -X POST "https://api.example.com/api/auth/webauthn/register/start" \
  -H "Authorization: Bearer <token>"
```

---

### POST /api/auth/webauthn/register/finish

Complete WebAuthn credential registration.

**Authentication:** Required (Bearer token)

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "credential": {
    "id": "base64-credential-id",
    "rawId": "base64-credential-raw-id",
    "response": {
      "clientDataJSON": "base64-client-data",
      "attestationObject": "base64-attestation-object"
    },
    "type": "public-key"
  },
  "credentialName": "YubiKey 5 NFC"
}
```

**Required Fields:**
- `credential` - WebAuthn credential response from client
- `credentialName` (optional) - User-friendly name for the credential

**Rate Limiting:** `sensitiveRateLimiter` (3 attempts per hour)

**Response:**

**Success (201 Created):**
```json
{
  "success": true,
  "message": "Security key registered successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "credentialId": "base64-credential-id",
    "name": "YubiKey 5 NFC",
    "deviceType": "cross-platform",
    "transports": ["usb", "nfc"],
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid credential data
  ```json
  {
    "success": false,
    "message": "Invalid credential data"
  }
  ```
- `401 Unauthorized` - Authentication required
- `409 Conflict` - Credential already registered

**Example:**
```bash
curl -X POST "https://api.example.com/api/auth/webauthn/register/finish" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "credential": {...},
    "credentialName": "YubiKey 5 NFC"
  }'
```

---

### POST /api/auth/webauthn/authenticate/start

Start WebAuthn authentication for login.

**Authentication:** Not required (public endpoint for login)

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Required Fields:**
- `email` OR `username` - User identifier

**Rate Limiting:** `authRateLimiter` (15 attempts per 15 minutes)

**Response:**

**Success (200 OK):**
```json
{
  "success": true,
  "data": {
    "options": {
      "challenge": "base64-encoded-challenge",
      "timeout": 60000,
      "rpId": "example.com",
      "allowCredentials": [
        {
          "type": "public-key",
          "id": "base64-credential-id",
          "transports": ["usb", "nfc"]
        }
      ],
      "userVerification": "preferred"
    },
    "userId": "507f1f77bcf86cd799439011"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Email or username required
- `401 Unauthorized` - Invalid credentials
- `404 Not Found` - No credentials registered for this user

**Example:**
```bash
curl -X POST "https://api.example.com/api/auth/webauthn/authenticate/start" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

---

### POST /api/auth/webauthn/authenticate/finish

Complete WebAuthn authentication and log in.

**Authentication:** Not required (public endpoint for login)

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "credential": {
    "id": "base64-credential-id",
    "rawId": "base64-credential-raw-id",
    "response": {
      "clientDataJSON": "base64-client-data",
      "authenticatorData": "base64-authenticator-data",
      "signature": "base64-signature",
      "userHandle": "base64-user-handle"
    },
    "type": "public-key"
  },
  "userId": "507f1f77bcf86cd799439011"
}
```

**Required Fields:**
- `credential` - WebAuthn authentication response from client
- `userId` - User ID from start authentication response

**Rate Limiting:** `authRateLimiter` (15 attempts per 15 minutes)

**Response:**

**Success (200 OK):**
```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "token": "jwt-token-here",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user"
    },
    "credential": {
      "id": "507f1f77bcf86cd799439011",
      "name": "YubiKey 5 NFC",
      "lastUsedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields
- `401 Unauthorized` - Authentication failed
- `403 Forbidden` - Account suspended or anonymized
- `404 Not Found` - User or credential not found

**Example:**
```bash
curl -X POST "https://api.example.com/api/auth/webauthn/authenticate/finish" \
  -H "Content-Type: application/json" \
  -d '{
    "credential": {...},
    "userId": "507f1f77bcf86cd799439011"
  }'
```

---

### GET /api/auth/webauthn/credentials

List all registered credentials for authenticated user.

**Authentication:** Required (Bearer token)

**Headers:**
```
Authorization: Bearer <token>
```

**Rate Limiting:** None (authenticated endpoint)

**Response:**

**Success (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "credentialId": "base64-credential-id",
      "name": "YubiKey 5 NFC",
      "deviceType": "cross-platform",
      "transports": ["usb", "nfc"],
      "createdAt": "2024-01-10T10:30:00.000Z",
      "lastUsedAt": "2024-01-15T10:30:00.000Z",
      "backedUp": false
    },
    {
      "id": "507f1f77bcf86cd799439012",
      "credentialId": "base64-credential-id-2",
      "name": "MacBook Touch ID",
      "deviceType": "platform",
      "transports": ["internal"],
      "createdAt": "2024-01-12T14:20:00.000Z",
      "lastUsedAt": null,
      "backedUp": true
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required

**Example:**
```bash
curl -X GET "https://api.example.com/api/auth/webauthn/credentials" \
  -H "Authorization: Bearer <token>"
```

---

### PATCH /api/auth/webauthn/credentials/:id

Update credential name.

**Authentication:** Required (Bearer token)

**Parameters:**
- `id` (path, required) - Credential ID

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "My Primary YubiKey"
}
```

**Required Fields:**
- `name` - New name for the credential

**Rate Limiting:** `sensitiveRateLimiter` (3 attempts per hour)

**Response:**

**Success (200 OK):**
```json
{
  "success": true,
  "message": "Credential name updated successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "My Primary YubiKey"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid name
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Credential belongs to another user
- `404 Not Found` - Credential not found

**Example:**
```bash
curl -X PATCH "https://api.example.com/api/auth/webauthn/credentials/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Primary YubiKey"}'
```

---

### DELETE /api/auth/webauthn/credentials/:id

Delete a registered credential.

**Authentication:** Required (Bearer token)

**Parameters:**
- `id` (path, required) - Credential ID

**Headers:**
```
Authorization: Bearer <token>
```

**Rate Limiting:** `sensitiveRateLimiter` (3 attempts per hour)

**Response:**

**Success (200 OK):**
```json
{
  "success": true,
  "message": "Credential deleted successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Cannot delete last credential
  ```json
  {
    "success": false,
    "message": "Cannot delete last credential. Please add another credential first."
  }
  ```
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Credential belongs to another user
- `404 Not Found` - Credential not found

**Example:**
```bash
curl -X DELETE "https://api.example.com/api/auth/webauthn/credentials/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer <token>"
```

---

## Session Management Endpoints

Manage active user sessions across devices.

### GET /api/auth/sessions

List all active sessions for authenticated user.

**Authentication:** Required (Bearer token)

**Headers:**
```
Authorization: Bearer <token>
```

**Rate Limiting:** `publicRateLimiter` (300 requests per 15 minutes)

**Response:**

**Success (200 OK):**
```json
{
  "error": false,
  "message": "Active sessions retrieved successfully",
  "sessions": [
    {
      "id": "507f1f77bcf86cd799439011",
      "device": "Desktop",
      "browser": "Chrome 120",
      "os": "macOS 14.0",
      "ip": "192.168.1.100",
      "location": {
        "country": "Saudi Arabia",
        "city": "Riyadh",
        "region": "Riyadh Region"
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "lastActivityAt": "2024-01-15T12:45:00.000Z",
      "expiresAt": "2024-01-22T10:30:00.000Z",
      "isCurrent": true,
      "isNewDevice": false
    },
    {
      "id": "507f1f77bcf86cd799439012",
      "device": "Mobile",
      "browser": "Safari 17",
      "os": "iOS 17.2",
      "ip": "192.168.1.200",
      "location": {
        "country": "Saudi Arabia",
        "city": "Jeddah",
        "region": "Makkah Region"
      },
      "createdAt": "2024-01-14T08:20:00.000Z",
      "lastActivityAt": "2024-01-15T09:15:00.000Z",
      "expiresAt": "2024-01-21T08:20:00.000Z",
      "isCurrent": false,
      "isNewDevice": true
    }
  ],
  "count": 2
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required

**Example:**
```bash
curl -X GET "https://api.example.com/api/auth/sessions" \
  -H "Authorization: Bearer <token>"
```

---

### DELETE /api/auth/sessions/:id

Terminate a specific session.

**Authentication:** Required (Bearer token)

**Parameters:**
- `id` (path, required) - Session ID to terminate

**Headers:**
```
Authorization: Bearer <token>
```

**Rate Limiting:** `authRateLimiter` (15 attempts per 15 minutes)

**Response:**

**Success (200 OK):**
```json
{
  "error": false,
  "message": "Session terminated successfully"
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Cannot terminate another user's session
- `404 Not Found` - Session not found

**Example:**
```bash
curl -X DELETE "https://api.example.com/api/auth/sessions/507f1f77bcf86cd799439012" \
  -H "Authorization: Bearer <token>"
```

---

### DELETE /api/auth/sessions

Terminate all other sessions (keep current session active).

**Authentication:** Required (Bearer token)

**Headers:**
```
Authorization: Bearer <token>
```

**Rate Limiting:** `authRateLimiter` (15 attempts per 15 minutes)

**Response:**

**Success (200 OK):**
```json
{
  "error": false,
  "message": "All other sessions terminated successfully",
  "terminatedCount": 3
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required

**Example:**
```bash
curl -X DELETE "https://api.example.com/api/auth/sessions" \
  -H "Authorization: Bearer <token>"
```

---

### POST /api/auth/logout-all

Logout from all devices (including current session).

**Authentication:** Required (Bearer token)

**Headers:**
```
Authorization: Bearer <token>
```

**Rate Limiting:** None

**Response:**

**Success (200 OK):**
```json
{
  "error": false,
  "message": "Successfully logged out from all devices"
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required

**Example:**
```bash
curl -X POST "https://api.example.com/api/auth/logout-all" \
  -H "Authorization: Bearer <token>"
```

---

## Rate Limiting

All security endpoints are protected by rate limiters to prevent abuse.

### Rate Limiter Types

| Limiter | Window | Max Requests | Usage |
|---------|--------|--------------|-------|
| `publicRateLimiter` | 15 minutes | 300 | Public endpoints (metadata, status checks) |
| `authRateLimiter` | 15 minutes | 15 | Authentication attempts (login, MFA verify) |
| `sensitiveRateLimiter` | 1 hour | 3 | Sensitive operations (MFA setup, disable, WebAuthn registration) |

### Rate Limit Headers

All responses include rate limit information in headers:

```
RateLimit-Limit: 15
RateLimit-Remaining: 12
RateLimit-Reset: 1705320000
```

### Rate Limit Exceeded Response

**Status Code:** `429 Too Many Requests`

```json
{
  "success": false,
  "error": "Too many requests - Please try again later",
  "error_en": "Too many requests - Please try again later",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

For specific rate limiters:

**Auth Rate Limiter:**
```json
{
  "success": false,
  "error": "Too many authentication attempts - Try again after 15 minutes",
  "error_en": "Too many authentication attempts - Try again after 15 minutes",
  "code": "AUTH_RATE_LIMIT_EXCEEDED"
}
```

**Sensitive Rate Limiter:**
```json
{
  "success": false,
  "error": "Too many attempts for this sensitive action - Try again after 1 hour",
  "error_en": "Too many attempts for this sensitive action - Try again after 1 hour",
  "code": "SENSITIVE_RATE_LIMIT_EXCEEDED"
}
```

---

## Error Responses

All security endpoints follow a consistent error response format.

### Standard Error Response

```json
{
  "error": true,
  "message": "Error message in Arabic",
  "messageEn": "Error message in English",
  "code": "ERROR_CODE"
}
```

Or for WebAuthn/newer endpoints:

```json
{
  "success": false,
  "message": "Error message",
  "code": "ERROR_CODE"
}
```

### Common HTTP Status Codes

| Status Code | Meaning | Common Scenarios |
|-------------|---------|------------------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 302 | Found | Redirect (SAML flows) |
| 400 | Bad Request | Invalid input, validation failed |
| 401 | Unauthorized | Authentication required or failed |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Security-Specific Error Codes

See [SECURITY_ERROR_CODES.md](./SECURITY_ERROR_CODES.md) for a complete list of error codes and recommended frontend handling.

---

## Security Best Practices

### Frontend Implementation

1. **Token Storage:**
   - Store JWT tokens in httpOnly cookies (automatically handled by backend)
   - Never store tokens in localStorage
   - Use secure, sameSite=strict cookies

2. **HTTPS Only:**
   - All security endpoints MUST be accessed over HTTPS
   - Backend enforces secure cookies in production

3. **Rate Limiting:**
   - Implement exponential backoff on 429 responses
   - Show clear error messages to users
   - Track rate limit headers to predict limits

4. **MFA Flow:**
   - Store QR code temporarily (in-memory only)
   - Show backup codes only once
   - Prompt users to save backup codes securely

5. **WebAuthn:**
   - Check browser support before showing WebAuthn option
   - Provide clear fallback options
   - Handle credential prompts gracefully

6. **Session Management:**
   - Show active sessions clearly
   - Allow users to terminate suspicious sessions
   - Highlight new/unusual devices

### Backend Security

1. **Password Security:**
   - Passwords hashed using bcrypt
   - Minimum password requirements enforced
   - Password reset requires verification

2. **Token Security:**
   - JWT tokens with 7-day expiration
   - Tokens hashed before storage
   - Token rotation on security events

3. **Audit Logging:**
   - All security events logged
   - Failed authentication attempts tracked
   - Suspicious activity monitored

4. **Data Protection:**
   - MFA secrets encrypted at rest
   - WebAuthn credentials stored securely
   - Session data includes device fingerprinting

---

## Support

For questions or issues:
- Technical Documentation: See `/docs` directory
- Security Issues: Report to security@example.com
- API Support: api-support@example.com

---

**Last Updated:** 2024-01-15
**API Version:** 1.0
**Compliance:** NCA ECC-2:2024, OWASP Top 10
