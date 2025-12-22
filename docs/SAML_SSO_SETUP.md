# SAML/SSO Enterprise Authentication Setup Guide

This guide explains how to set up and configure SAML/SSO authentication for enterprise integration with Azure AD, Okta, Google Workspace, and other SAML 2.0 providers.

## Table of Contents

1. [Overview](#overview)
2. [Requirements](#requirements)
3. [Installation](#installation)
4. [Architecture](#architecture)
5. [Configuration](#configuration)
   - [Azure AD (Microsoft Entra ID)](#azure-ad-microsoft-entra-id)
   - [Okta](#okta)
   - [Google Workspace](#google-workspace)
6. [API Endpoints](#api-endpoints)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

## Overview

The SAML/SSO implementation provides:

- **Multi-tenancy**: Each firm can have its own IdP configuration
- **Just-in-Time (JIT) Provisioning**: Automatically creates users on first SSO login
- **Attribute Mapping**: Maps IdP attributes to user fields (email, firstName, lastName, groups)
- **Single Logout (SLO)**: Supports SAML Single Logout flow
- **JWT Integration**: Generates JWT tokens after successful SSO authentication
- **Multiple Providers**: Supports Azure AD, Okta, Google Workspace, and custom SAML 2.0 IdPs

## Requirements

### Backend Requirements

1. **Node.js** 14+ with npm
2. **MongoDB** database
3. **Environment Variables** configured (see `.env.example`)

### Package Dependencies

```json
{
  "@node-saml/passport-saml": "^5.0.0"
}
```

The package is already added to `package.json`. Install it with:

```bash
npm install
```

## Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set environment variables**:
   ```bash
   # Add to your .env file
   BACKEND_URL=https://api.traf3li.com
   DASHBOARD_URL=https://dashboard.traf3li.com
   JWT_SECRET=your_jwt_secret
   ```

3. **Restart the server**:
   ```bash
   npm start
   ```

## Architecture

### Components

1. **SAML Service** (`/src/services/saml.service.js`)
   - SP metadata generation
   - SAML strategy creation per firm
   - Assertion parsing and validation
   - Attribute mapping
   - JIT user provisioning

2. **SAML Controller** (`/src/controllers/saml.controller.js`)
   - Handles SAML requests/responses
   - Manages SSO login flow
   - Handles Single Logout (SLO)
   - Admin configuration endpoints

3. **SAML Routes** (`/src/routes/saml.route.js`)
   - Public SAML endpoints
   - Admin configuration endpoints

### Flow Diagram

```
User -> Dashboard (SSO Login Button)
  -> GET /api/auth/saml/login/{firmId}
  -> Redirect to IdP
  -> User authenticates at IdP
  -> IdP redirects to POST /api/auth/saml/acs/{firmId}
  -> Backend validates SAML assertion
  -> Backend creates/updates user (JIT)
  -> Backend generates JWT token
  -> Redirect to Dashboard with token
```

## Configuration

### Admin Dashboard Configuration

Firm admins can configure SAML through the dashboard:

1. Navigate to **Settings** → **Enterprise** → **SSO Configuration**
2. Fill in the IdP details:
   - **Provider Type**: azure, okta, google, or custom
   - **Entity ID**: IdP Entity ID / Issuer URL
   - **SSO URL**: IdP Sign-in URL
   - **Certificate**: X.509 certificate (PEM format)
   - **Metadata URL**: (Optional) IdP metadata URL

### Service Provider (SP) Information

Provide these URLs to your IdP administrator:

- **SP Entity ID**: `https://api.traf3li.com/api/auth/saml/{firmId}`
- **Assertion Consumer Service (ACS) URL**: `https://api.traf3li.com/api/auth/saml/acs/{firmId}`
- **Single Logout Service (SLS) URL**: `https://api.traf3li.com/api/auth/saml/sls/{firmId}`
- **SP Metadata URL**: `https://api.traf3li.com/api/auth/saml/metadata/{firmId}`

Replace `{firmId}` with your actual firm ID.

### Azure AD (Microsoft Entra ID)

#### Step 1: Create Enterprise Application

1. Go to **Azure Portal** → **Azure Active Directory** → **Enterprise Applications**
2. Click **+ New application** → **Create your own application**
3. Name: "Traf3li"
4. Select: **Integrate any other application you don't find in the gallery (Non-gallery)**
5. Click **Create**

#### Step 2: Configure Single Sign-On

1. In the application, go to **Single sign-on**
2. Select **SAML**
3. Click **Edit** on **Basic SAML Configuration**:
   - **Identifier (Entity ID)**: `https://api.traf3li.com/api/auth/saml/{firmId}`
   - **Reply URL (ACS)**: `https://api.traf3li.com/api/auth/saml/acs/{firmId}`
   - **Logout URL**: `https://api.traf3li.com/api/auth/saml/sls/{firmId}`
4. Save

#### Step 3: Configure Attributes & Claims

1. Click **Edit** on **Attributes & Claims**
2. Ensure these claims are present:
   - `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress` → user.mail
   - `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname` → user.givenname
   - `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname` → user.surname
   - `http://schemas.microsoft.com/identity/claims/objectidentifier` → user.objectid

#### Step 4: Get Configuration Details

1. In **SAML Signing Certificate** section:
   - Download **Certificate (Base64)**
   - Copy the certificate content (keep the BEGIN/END lines)

2. In **Set up Traf3li** section, copy:
   - **Login URL** (this is the SSO URL)
   - **Azure AD Identifier** (this is the Entity ID)

#### Step 5: Configure in Traf3li Dashboard

1. Go to Traf3li Dashboard → **Settings** → **Enterprise** → **SSO**
2. Enter:
   - **Provider**: Azure AD
   - **Entity ID**: (Azure AD Identifier from step 4)
   - **SSO URL**: (Login URL from step 4)
   - **Certificate**: (Certificate content from step 4)
3. Save configuration

### Okta

#### Step 1: Create SAML Application

1. Go to **Okta Admin Console** → **Applications** → **Applications**
2. Click **Create App Integration**
3. Select **SAML 2.0** → **Next**
4. **General Settings**:
   - **App name**: Traf3li
   - Click **Next**

#### Step 2: Configure SAML Settings

1. **Single sign on URL**: `https://api.traf3li.com/api/auth/saml/acs/{firmId}`
   - Check: **Use this for Recipient URL and Destination URL**
2. **Audience URI (SP Entity ID)**: `https://api.traf3li.com/api/auth/saml/{firmId}`
3. **Name ID format**: EmailAddress
4. **Application username**: Email
5. **Attribute Statements** (optional):
   - `email` → `user.email`
   - `firstName` → `user.firstName`
   - `lastName` → `user.lastName`
6. Click **Next** → **Finish**

#### Step 3: Get Configuration Details

1. Go to **Sign On** tab
2. Under **SAML 2.0**, click **View SAML setup instructions**
3. Copy:
   - **Identity Provider Single Sign-On URL** (SSO URL)
   - **Identity Provider Issuer** (Entity ID)
   - **X.509 Certificate** (Certificate)

#### Step 4: Configure in Traf3li Dashboard

1. Go to Traf3li Dashboard → **Settings** → **Enterprise** → **SSO**
2. Enter the details from step 3
3. Save configuration

### Google Workspace

#### Step 1: Create Custom SAML Application

1. Go to **Google Admin Console** → **Apps** → **Web and mobile apps**
2. Click **Add app** → **Add custom SAML app**
3. **App name**: Traf3li
4. Click **Continue**

#### Step 2: Download IdP Information

1. **Option 2**: Download Metadata
   - Download the **IDP metadata** XML file
   - Or manually copy:
     - **SSO URL**
     - **Entity ID**
     - **Certificate**
2. Click **Continue**

#### Step 3: Configure Service Provider Details

1. **ACS URL**: `https://api.traf3li.com/api/auth/saml/acs/{firmId}`
2. **Entity ID**: `https://api.traf3li.com/api/auth/saml/{firmId}`
3. **Name ID format**: EMAIL
4. **Name ID**: Basic Information > Primary email
5. Click **Continue**

#### Step 4: Attribute Mapping

1. Add mappings:
   - **email** → Primary email
   - **firstName** → First name
   - **lastName** → Last name
2. Click **Finish**

#### Step 5: Turn on the App

1. In the app settings, go to **User access**
2. Select **ON for everyone** or specific organizational units
3. Save

#### Step 6: Configure in Traf3li Dashboard

1. Go to Traf3li Dashboard → **Settings** → **Enterprise** → **SSO**
2. Enter the details from step 2
3. Save configuration

## API Endpoints

### Public SAML Endpoints

All endpoints use the firm ID for multi-tenancy.

#### Get SP Metadata
```
GET /api/auth/saml/metadata/{firmId}
```
Returns SAML SP metadata XML.

#### Initiate SSO Login
```
GET /api/auth/saml/login/{firmId}?RelayState=/dashboard
```
Redirects to IdP for authentication.

**Query Parameters:**
- `RelayState` (optional): URL to redirect after login

#### Assertion Consumer Service (ACS)
```
POST /api/auth/saml/acs/{firmId}
```
Receives SAML assertion from IdP. Automatically called by IdP.

**Body (form-urlencoded):**
- `SAMLResponse`: Base64-encoded SAML assertion
- `RelayState`: Original relay state

#### Initiate Single Logout
```
GET /api/auth/saml/logout/{firmId}
```
Initiates SAML logout flow.

#### Single Logout Service (SLS)
```
POST /api/auth/saml/sls/{firmId}
```
Receives logout response from IdP.

### Admin Configuration Endpoints

Require authentication (JWT token).

#### Get SAML Configuration
```
GET /api/auth/saml/config
Authorization: Bearer {token}
```

**Response:**
```json
{
  "error": false,
  "message": "Success",
  "config": {
    "ssoEnabled": true,
    "ssoProvider": "azure",
    "ssoEntityId": "https://sts.windows.net/...",
    "ssoSsoUrl": "https://login.microsoftonline.com/.../saml2",
    "ssoMetadataUrl": null,
    "hasCertificate": true,
    "spEntityId": "https://api.traf3li.com/api/auth/saml/507f1f77bcf86cd799439011",
    "spAcsUrl": "https://api.traf3li.com/api/auth/saml/acs/507f1f77bcf86cd799439011",
    "spSloUrl": "https://api.traf3li.com/api/auth/saml/sls/507f1f77bcf86cd799439011",
    "spMetadataUrl": "https://api.traf3li.com/api/auth/saml/metadata/507f1f77bcf86cd799439011"
  }
}
```

#### Update SAML Configuration
```
PUT /api/auth/saml/config
Authorization: Bearer {token}
Content-Type: application/json

{
  "ssoEnabled": true,
  "ssoProvider": "azure",
  "ssoEntityId": "https://sts.windows.net/...",
  "ssoSsoUrl": "https://login.microsoftonline.com/.../saml2",
  "ssoCertificate": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
  "ssoMetadataUrl": null
}
```

#### Test SAML Configuration
```
POST /api/auth/saml/config/test
Authorization: Bearer {token}
```

**Response:**
```json
{
  "error": false,
  "message": "SAML configuration is valid",
  "valid": true
}
```

## Testing

### Manual Testing

1. **Test Metadata Generation**:
   ```bash
   curl https://api.traf3li.com/api/auth/saml/metadata/{firmId}
   ```
   Should return valid XML metadata.

2. **Test SSO Login**:
   - Navigate to: `https://api.traf3li.com/api/auth/saml/login/{firmId}`
   - Should redirect to IdP login page
   - After authentication, should redirect back to dashboard with JWT token

3. **Test Configuration Endpoint**:
   ```bash
   curl -H "Authorization: Bearer {token}" \
        https://api.traf3li.com/api/auth/saml/config
   ```

### Common Test Scenarios

1. **New User (JIT Provisioning)**:
   - User doesn't exist in Traf3li
   - User logs in via SSO
   - User account is created automatically
   - User is added to the firm

2. **Existing User**:
   - User exists in Traf3li
   - User logs in via SSO
   - User information is updated
   - JWT token is generated

3. **Attribute Mapping**:
   - Verify email, firstName, lastName are correctly mapped
   - Check that user profile is updated with IdP data

## Troubleshooting

### Common Issues

#### 1. "SSO not enabled for this firm"

**Solution**: Enable SSO in the firm's enterprise settings:
```bash
# Via MongoDB
db.firms.updateOne(
  { _id: ObjectId("{firmId}") },
  { $set: { "enterpriseSettings.ssoEnabled": true } }
)
```

#### 2. "Invalid certificate format"

**Solution**: Ensure certificate is in PEM format with proper headers:
```
-----BEGIN CERTIFICATE-----
MIIDdDCCAlygAwIBAgIGAXoQWdE...
...
-----END CERTIFICATE-----
```

#### 3. "Email not found in SAML assertion"

**Solution**:
- Check attribute mappings in IdP configuration
- Verify NameID format is set to EmailAddress
- For Azure AD, ensure email claim is configured

#### 4. SAML Response Signature Validation Failed

**Solution**:
- Verify certificate matches the one in IdP
- Check that certificate hasn't expired
- Ensure there are no extra spaces or line breaks in certificate

#### 5. "User not associated with a firm"

**Solution**: Ensure the user logging in belongs to a firm with SSO enabled.

### Debug Mode

Enable debug logging:

```javascript
// In saml.service.js, add:
console.log('SAML Profile:', JSON.stringify(profile, null, 2));
console.log('Mapped Attributes:', attributes);
```

### Audit Logs

Check audit logs for SSO events:

```javascript
// Query audit logs
db.auditlogs.find({
  action: { $in: ['sso_login_success', 'sso_login_failed', 'sso_config_updated'] }
}).sort({ createdAt: -1 })
```

### Network Debugging

Use browser DevTools or curl to inspect SAML requests/responses:

```bash
# View SAML Response (decoded)
echo "{base64_saml_response}" | base64 -d | xmllint --format -
```

## Security Considerations

1. **Certificate Validation**: Always validate IdP certificates
2. **Assertion Expiry**: SAML assertions have a short validity window (5 seconds clock skew)
3. **HTTPS Only**: SAML should only be used over HTTPS in production
4. **Signature Validation**: Assertions must be signed by IdP
5. **Replay Protection**: Each assertion can only be used once

## Support

For issues or questions:
- Check the troubleshooting section above
- Review audit logs for error details
- Contact support with:
  - Firm ID
  - IdP provider type
  - Error message
  - SAML response (if available)

## Additional Resources

- [SAML 2.0 Specification](http://docs.oasis-open.org/security/saml/v2.0/)
- [Azure AD SAML Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/single-sign-on-saml-protocol)
- [Okta SAML Documentation](https://developer.okta.com/docs/concepts/saml/)
- [Google SAML Documentation](https://support.google.com/a/answer/6087519)
