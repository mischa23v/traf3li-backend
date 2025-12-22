# Frontend Security Integration Guide

Complete integration guide for all security features including SAML/SSO, MFA/TOTP, WebAuthn, and Session Management.

---

## Table of Contents

1. [SAML/SSO Integration](#1-samlsso-integration)
2. [MFA/TOTP Integration](#2-mfatotp-integration)
3. [WebAuthn/Security Keys](#3-webauthnsecurity-keys)
4. [Session Management](#4-session-management)
5. [Error Handling](#5-error-handling)
6. [TypeScript Types](#6-typescript-types)

---

## 1. SAML/SSO Integration

### 1.1 Endpoints

#### Check SSO Configuration
```typescript
GET /api/auth/saml/config
Headers: Authorization: Bearer {token}
```

#### Initiate SSO Login
```typescript
GET /api/auth/saml/login/{firmId}?RelayState={returnUrl}
// Redirects to IdP for authentication
```

#### SSO Callback (Assertion Consumer Service)
```typescript
POST /api/auth/saml/acs/{firmId}
Content-Type: application/x-www-form-urlencoded

SAMLResponse={base64EncodedAssertion}
RelayState={returnUrl}
```

#### Initiate SSO Logout
```typescript
GET /api/auth/saml/logout/{firmId}
// Redirects to IdP for logout
```

#### Get Service Provider Metadata
```typescript
GET /api/auth/saml/metadata/{firmId}
Content-Type: application/xml
```

#### Update SSO Configuration (Admin Only)
```typescript
PUT /api/auth/saml/config
Headers: Authorization: Bearer {token}

{
  "ssoEnabled": true,
  "ssoProvider": "azure" | "okta" | "google" | "custom",
  "ssoEntityId": "https://idp.example.com",
  "ssoSsoUrl": "https://idp.example.com/sso",
  "ssoCertificate": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
  "ssoMetadataUrl": "https://idp.example.com/metadata.xml" // optional
}
```

#### Test SSO Configuration (Admin Only)
```typescript
POST /api/auth/saml/config/test
Headers: Authorization: Bearer {token}
```

### 1.2 Frontend Implementation

#### Check if Firm Has SSO Enabled

```typescript
// hooks/useSSO.ts
import { useState, useEffect } from 'react';

interface SSOConfig {
  ssoEnabled: boolean;
  ssoProvider?: 'azure' | 'okta' | 'google' | 'custom';
  ssoEntityId?: string;
  ssoSsoUrl?: string;
  ssoMetadataUrl?: string;
  hasCertificate?: boolean;
  spEntityId?: string;
  spAcsUrl?: string;
  spSloUrl?: string;
  spMetadataUrl?: string;
}

export const useSSO = (firmId?: string) => {
  const [ssoConfig, setSSOConfig] = useState<SSOConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firmId) {
      setLoading(false);
      return;
    }

    const checkSSO = async () => {
      try {
        const response = await fetch('/api/auth/saml/config', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        const data = await response.json();

        if (!data.error) {
          setSSOConfig(data.config);
        } else {
          setError(data.message);
        }
      } catch (err) {
        setError('Failed to check SSO configuration');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    checkSSO();
  }, [firmId]);

  return { ssoConfig, loading, error };
};
```

#### Login Component with SSO Support

```typescript
// components/LoginForm.tsx
import React, { useState } from 'react';
import { useSSO } from '../hooks/useSSO';

interface LoginFormProps {
  firmId?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ firmId }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { ssoConfig, loading } = useSSO(firmId);

  const handleSSOLogin = () => {
    // Save current path to return after SSO
    const returnUrl = window.location.pathname;

    // Redirect to SSO login endpoint
    window.location.href = `/api/auth/saml/login/${firmId}?RelayState=${encodeURIComponent(returnUrl)}`;
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.mfaRequired) {
        // Redirect to MFA verification page
        window.location.href = `/verify-mfa?userId=${data.userId}`;
      } else if (data.token) {
        // Store token and redirect
        localStorage.setItem('token', data.token);
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="login-form">
      <h1>Sign In</h1>

      {/* SSO Login Button (if enabled) */}
      {ssoConfig?.ssoEnabled && (
        <div className="sso-section">
          <button
            onClick={handleSSOLogin}
            className="btn btn-primary btn-sso"
          >
            <svg className="icon" viewBox="0 0 24 24">
              {/* SSO Icon */}
            </svg>
            Sign in with {ssoConfig.ssoProvider || 'SSO'}
          </button>

          <div className="divider">
            <span>OR</span>
          </div>
        </div>
      )}

      {/* Password Login Form */}
      <form onSubmit={handlePasswordLogin}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary">
          Sign In
        </button>
      </form>
    </div>
  );
};
```

#### SSO Configuration Page (Admin)

```typescript
// pages/settings/SSOSettings.tsx
import React, { useState } from 'react';

interface SSOSettingsFormData {
  ssoEnabled: boolean;
  ssoProvider: 'azure' | 'okta' | 'google' | 'custom';
  ssoEntityId: string;
  ssoSsoUrl: string;
  ssoCertificate: string;
  ssoMetadataUrl?: string;
}

export const SSOSettings: React.FC = () => {
  const [formData, setFormData] = useState<SSOSettingsFormData>({
    ssoEnabled: false,
    ssoProvider: 'azure',
    ssoEntityId: '',
    ssoSsoUrl: '',
    ssoCertificate: '',
    ssoMetadataUrl: ''
  });
  const [testing, setTesting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/auth/saml/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!data.error) {
        alert('SSO configuration updated successfully');
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Failed to update SSO config:', error);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);

    try {
      const response = await fetch('/api/auth/saml/config/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (data.valid) {
        alert('SSO configuration is valid!');
      } else {
        alert(`Configuration error: ${data.message}`);
      }
    } catch (error) {
      alert('Failed to test SSO configuration');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="sso-settings">
      <h2>SSO Configuration</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={formData.ssoEnabled}
              onChange={(e) => setFormData({ ...formData, ssoEnabled: e.target.checked })}
            />
            Enable SSO
          </label>
        </div>

        <div className="form-group">
          <label htmlFor="provider">SSO Provider</label>
          <select
            id="provider"
            value={formData.ssoProvider}
            onChange={(e) => setFormData({ ...formData, ssoProvider: e.target.value as any })}
          >
            <option value="azure">Microsoft Azure AD</option>
            <option value="okta">Okta</option>
            <option value="google">Google Workspace</option>
            <option value="custom">Custom SAML</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="entityId">IdP Entity ID</label>
          <input
            id="entityId"
            type="text"
            value={formData.ssoEntityId}
            onChange={(e) => setFormData({ ...formData, ssoEntityId: e.target.value })}
            placeholder="https://sts.windows.net/..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="ssoUrl">IdP SSO URL</label>
          <input
            id="ssoUrl"
            type="url"
            value={formData.ssoSsoUrl}
            onChange={(e) => setFormData({ ...formData, ssoSsoUrl: e.target.value })}
            placeholder="https://login.microsoftonline.com/..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="certificate">IdP X.509 Certificate</label>
          <textarea
            id="certificate"
            value={formData.ssoCertificate}
            onChange={(e) => setFormData({ ...formData, ssoCertificate: e.target.value })}
            placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
            rows={8}
          />
        </div>

        <div className="form-group">
          <label htmlFor="metadataUrl">IdP Metadata URL (Optional)</label>
          <input
            id="metadataUrl"
            type="url"
            value={formData.ssoMetadataUrl}
            onChange={(e) => setFormData({ ...formData, ssoMetadataUrl: e.target.value })}
            placeholder="https://login.microsoftonline.com/.../federationmetadata/..."
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="btn btn-secondary"
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>

          <button type="submit" className="btn btn-primary">
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
};
```

---

## 2. MFA/TOTP Integration

### 2.1 Endpoints

#### Get MFA Status
```typescript
GET /api/auth/mfa/status
Headers: Authorization: Bearer {token}

Response:
{
  "error": false,
  "mfaEnabled": boolean,
  "hasTOTP": boolean,
  "hasBackupCodes": boolean,
  "remainingCodes": number
}
```

#### Start MFA Setup
```typescript
POST /api/auth/mfa/setup
Headers: Authorization: Bearer {token}

Response:
{
  "error": false,
  "qrCode": "data:image/png;base64,...",
  "setupKey": "JBSWY3DPEHPK3PXP"
}
```

#### Verify and Enable MFA
```typescript
POST /api/auth/mfa/verify-setup
Headers: Authorization: Bearer {token}

{
  "token": "123456"  // 6-digit code from authenticator app
}

Response:
{
  "error": false,
  "enabled": true,
  "backupCodes": [
    "ABCD-1234",
    "EFGH-5678",
    // ... 10 codes total
  ]
}
```

#### Verify MFA Code During Login
```typescript
POST /api/auth/mfa/verify
{
  "userId": "user_id_from_login_response",
  "token": "123456"  // 6-digit TOTP or backup code (XXXX-XXXX)
}

Response:
{
  "error": false,
  "valid": true
}
```

#### Disable MFA
```typescript
POST /api/auth/mfa/disable
Headers: Authorization: Bearer {token}

{
  "password": "user_password"
}

Response:
{
  "error": false,
  "disabled": true
}
```

#### Generate/Regenerate Backup Codes
```typescript
POST /api/auth/mfa/backup-codes/generate
POST /api/auth/mfa/backup-codes/regenerate
Headers: Authorization: Bearer {token}

Response:
{
  "error": false,
  "message": "Backup codes generated successfully",
  "codes": ["ABCD-1234", "EFGH-5678", ...],
  "remainingCodes": 10
}
```

#### Get Backup Codes Count
```typescript
GET /api/auth/mfa/backup-codes/count
Headers: Authorization: Bearer {token}

Response:
{
  "error": false,
  "remainingCodes": 8
}
```

### 2.2 Frontend Implementation

#### MFA Setup Flow

```typescript
// components/MFASetup.tsx
import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';

interface MFASetupProps {
  onComplete: () => void;
}

export const MFASetup: React.FC<MFASetupProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'qr' | 'verify' | 'backup'>('qr');
  const [qrCode, setQrCode] = useState<string>('');
  const [setupKey, setSetupKey] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Start MFA setup
    const startSetup = async () => {
      try {
        const response = await fetch('/api/auth/mfa/setup', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        const data = await response.json();

        if (!data.error) {
          setQrCode(data.qrCode);
          setSetupKey(data.setupKey);
        } else {
          setError(data.message);
        }
      } catch (err) {
        setError('Failed to start MFA setup');
      }
    };

    startSetup();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/mfa/verify-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ token: verificationCode })
      });

      const data = await response.json();

      if (!data.error && data.enabled) {
        setBackupCodes(data.backupCodes);
        setStep('backup');
      } else {
        setError(data.message || 'Invalid verification code');
      }
    } catch (err) {
      setError('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBackupCodes = () => {
    const blob = new Blob(
      [backupCodes.join('\n')],
      { type: 'text/plain' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'traf3li-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (step === 'qr') {
    return (
      <div className="mfa-setup">
        <h2>Set Up Two-Factor Authentication</h2>

        <div className="setup-instructions">
          <h3>Step 1: Scan QR Code</h3>
          <p>Use your authenticator app (Google Authenticator, Authy, etc.) to scan this QR code:</p>

          {qrCode && (
            <div className="qr-code-container">
              <img src={qrCode} alt="MFA QR Code" />
            </div>
          )}

          <div className="manual-entry">
            <p>Or enter this code manually:</p>
            <code className="setup-key">{setupKey}</code>
            <button
              onClick={() => navigator.clipboard.writeText(setupKey)}
              className="btn-copy"
            >
              Copy
            </button>
          </div>
        </div>

        <button
          onClick={() => setStep('verify')}
          className="btn btn-primary"
        >
          Next: Verify Code
        </button>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="mfa-setup">
        <h2>Verify Your Authenticator</h2>

        <form onSubmit={handleVerify}>
          <div className="form-group">
            <label htmlFor="code">Enter 6-digit code from your app:</label>
            <input
              id="code"
              type="text"
              pattern="[0-9]{6}"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="123456"
              required
            />
          </div>

          {error && <div className="error">{error}</div>}

          <div className="form-actions">
            <button
              type="button"
              onClick={() => setStep('qr')}
              className="btn btn-secondary"
            >
              Back
            </button>

            <button
              type="submit"
              disabled={loading || verificationCode.length !== 6}
              className="btn btn-primary"
            >
              {loading ? 'Verifying...' : 'Verify & Enable'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (step === 'backup') {
    return (
      <div className="mfa-setup">
        <h2>Save Your Backup Codes</h2>

        <div className="backup-codes-warning">
          <strong>⚠️ Important:</strong> Save these backup codes in a secure place.
          Each code can only be used once.
        </div>

        <div className="backup-codes-list">
          {backupCodes.map((code, index) => (
            <div key={index} className="backup-code">
              <span className="code-number">{index + 1}.</span>
              <code>{code}</code>
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button
            onClick={handleDownloadBackupCodes}
            className="btn btn-secondary"
          >
            Download Codes
          </button>

          <button
            onClick={onComplete}
            className="btn btn-primary"
          >
            I've Saved My Codes
          </button>
        </div>
      </div>
    );
  }

  return null;
};
```

#### MFA Verification During Login

```typescript
// components/MFAVerification.tsx
import React, { useState } from 'react';
import { useRouter } from 'next/router';

interface MFAVerificationProps {
  userId: string;
  onSuccess: (token: string) => void;
}

export const MFAVerification: React.FC<MFAVerificationProps> = ({
  userId,
  onSuccess
}) => {
  const [code, setCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Verify MFA code
      const verifyResponse = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token: code })
      });

      const verifyData = await verifyResponse.json();

      if (!verifyData.error && verifyData.valid) {
        // MFA verified, now complete login
        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            mfaCode: code,
            mfaVerified: true
          })
        });

        const loginData = await loginResponse.json();

        if (loginData.token) {
          // Show warning if backup codes are low
          if (verifyData.remainingCodes !== undefined && verifyData.remainingCodes <= 2) {
            alert(`Warning: You have only ${verifyData.remainingCodes} backup codes remaining. Please regenerate them soon.`);
          }

          onSuccess(loginData.token);
        }
      } else {
        setError(verifyData.message || 'Invalid code');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mfa-verification">
      <h2>Two-Factor Authentication</h2>

      <form onSubmit={handleVerify}>
        <div className="form-group">
          <label htmlFor="mfa-code">
            {useBackupCode
              ? 'Enter backup code (XXXX-XXXX):'
              : 'Enter 6-digit code from your authenticator app:'
            }
          </label>
          <input
            id="mfa-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={useBackupCode ? 'ABCD-1234' : '123456'}
            pattern={useBackupCode ? '[A-Z0-9]{4}-[A-Z0-9]{4}' : '[0-9]{6}'}
            maxLength={useBackupCode ? 9 : 6}
            required
          />
        </div>

        {error && <div className="error">{error}</div>}

        <button
          type="submit"
          disabled={loading || (!useBackupCode && code.length !== 6) || (useBackupCode && code.length !== 9)}
          className="btn btn-primary"
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>
      </form>

      <div className="backup-code-toggle">
        <button
          type="button"
          onClick={() => {
            setUseBackupCode(!useBackupCode);
            setCode('');
            setError('');
          }}
          className="btn-link"
        >
          {useBackupCode
            ? 'Use authenticator app instead'
            : 'Use backup code instead'
          }
        </button>
      </div>
    </div>
  );
};
```

#### MFA Settings/Management

```typescript
// components/MFASettings.tsx
import React, { useState, useEffect } from 'react';

interface MFAStatus {
  mfaEnabled: boolean;
  hasTOTP: boolean;
  hasBackupCodes: boolean;
  remainingCodes: number;
}

export const MFASettings: React.FC = () => {
  const [status, setStatus] = useState<MFAStatus | null>(null);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMFAStatus();
  }, []);

  const fetchMFAStatus = async () => {
    try {
      const response = await fetch('/api/auth/mfa/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (!data.error) {
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch MFA status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    if (!confirm('This will invalidate all existing backup codes. Continue?')) {
      return;
    }

    try {
      const response = await fetch('/api/auth/mfa/backup-codes/regenerate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (!data.error) {
        setBackupCodes(data.codes);
        setShowBackupCodes(true);
        await fetchMFAStatus(); // Refresh status
      }
    } catch (err) {
      alert('Failed to regenerate backup codes');
    }
  };

  const handleDisableMFA = async () => {
    const password = prompt('Enter your password to disable MFA:');
    if (!password) return;

    try {
      const response = await fetch('/api/auth/mfa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (!data.error && data.disabled) {
        alert('MFA has been disabled');
        await fetchMFAStatus();
      } else {
        alert(data.message || 'Failed to disable MFA');
      }
    } catch (err) {
      alert('Failed to disable MFA');
    }
  };

  if (loading) {
    return <div>Loading MFA settings...</div>;
  }

  return (
    <div className="mfa-settings">
      <h2>Two-Factor Authentication</h2>

      {status?.mfaEnabled ? (
        <div className="mfa-enabled">
          <div className="status-badge success">
            ✓ MFA Enabled
          </div>

          <div className="mfa-info">
            <h3>Backup Codes</h3>
            <p>
              You have <strong>{status.remainingCodes}</strong> backup codes remaining.
              {status.remainingCodes <= 2 && (
                <span className="warning"> ⚠️ Running low! Consider regenerating.</span>
              )}
            </p>

            <button
              onClick={handleRegenerateBackupCodes}
              className="btn btn-secondary"
            >
              Regenerate Backup Codes
            </button>
          </div>

          {showBackupCodes && backupCodes.length > 0 && (
            <div className="backup-codes-display">
              <h4>New Backup Codes</h4>
              <div className="codes-grid">
                {backupCodes.map((code, index) => (
                  <code key={index}>{code}</code>
                ))}
              </div>
              <button
                onClick={() => setShowBackupCodes(false)}
                className="btn btn-sm"
              >
                Hide Codes
              </button>
            </div>
          )}

          <div className="danger-zone">
            <h3>Disable MFA</h3>
            <p>This will remove two-factor authentication from your account.</p>
            <button
              onClick={handleDisableMFA}
              className="btn btn-danger"
            >
              Disable MFA
            </button>
          </div>
        </div>
      ) : (
        <div className="mfa-disabled">
          <div className="status-badge warning">
            ⚠ MFA Not Enabled
          </div>

          <p>
            Two-factor authentication adds an extra layer of security to your account.
            We recommend enabling it to protect your data.
          </p>

          <button
            onClick={() => window.location.href = '/settings/mfa/setup'}
            className="btn btn-primary"
          >
            Enable MFA
          </button>
        </div>
      )}
    </div>
  );
};
```

---

## 3. WebAuthn/Security Keys

### 3.1 Endpoints

#### Start Registration
```typescript
POST /api/auth/webauthn/register/start
Headers: Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    // PublicKeyCredentialCreationOptions
  }
}
```

#### Complete Registration
```typescript
POST /api/auth/webauthn/register/finish
Headers: Authorization: Bearer {token}

{
  "credential": {}, // PublicKeyCredential from navigator.credentials.create()
  "credentialName": "YubiKey 5 NFC"  // Optional user-friendly name
}

Response:
{
  "success": true,
  "message": "Security key registered successfully",
  "data": {
    "id": "credential_id",
    "credentialId": "base64_cred_id",
    "name": "YubiKey 5 NFC",
    "deviceType": "cross-platform",
    "transports": ["usb", "nfc"],
    "createdAt": "2024-01-20T..."
  }
}
```

#### Start Authentication
```typescript
POST /api/auth/webauthn/authenticate/start
{
  "email": "user@example.com"
  // OR
  "username": "johndoe"
}

Response:
{
  "success": true,
  "data": {
    "options": {}, // PublicKeyCredentialRequestOptions
    "userId": "user_id"
  }
}
```

#### Complete Authentication
```typescript
POST /api/auth/webauthn/authenticate/finish
{
  "credential": {}, // PublicKeyCredential from navigator.credentials.get()
  "userId": "user_id_from_start"
}

Response:
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "token": "jwt_token",
    "user": {},
    "credential": {}
  }
}
```

#### List Credentials
```typescript
GET /api/auth/webauthn/credentials
Headers: Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "id": "credential_id",
      "credentialId": "base64_cred_id",
      "name": "YubiKey 5 NFC",
      "deviceType": "cross-platform",
      "transports": ["usb", "nfc"],
      "createdAt": "2024-01-20T...",
      "lastUsedAt": "2024-01-21T...",
      "backedUp": false
    }
  ]
}
```

#### Update Credential Name
```typescript
PATCH /api/auth/webauthn/credentials/{id}
Headers: Authorization: Bearer {token}

{
  "name": "My Primary YubiKey"
}
```

#### Delete Credential
```typescript
DELETE /api/auth/webauthn/credentials/{id}
Headers: Authorization: Bearer {token}
```

### 3.2 Frontend Implementation

#### WebAuthn Registration Flow

```typescript
// components/WebAuthnRegistration.tsx
import React, { useState } from 'react';
import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';

interface WebAuthnRegistrationProps {
  onComplete: () => void;
}

export const WebAuthnRegistration: React.FC<WebAuthnRegistrationProps> = ({ onComplete }) => {
  const [credentialName, setCredentialName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!browserSupportsWebAuthn()) {
      setError('Your browser does not support WebAuthn/Security Keys');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Step 1: Get registration options from server
      const startResponse = await fetch('/api/auth/webauthn/register/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const startData = await startResponse.json();

      if (!startData.success) {
        throw new Error(startData.message || 'Failed to start registration');
      }

      // Step 2: Prompt user to use their security key
      let credential;
      try {
        credential = await startRegistration(startData.data);
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          throw new Error('Registration cancelled or timed out');
        }
        throw err;
      }

      // Step 3: Send credential to server for verification
      const finishResponse = await fetch('/api/auth/webauthn/register/finish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          credential,
          credentialName: credentialName || 'Security Key'
        })
      });

      const finishData = await finishResponse.json();

      if (!finishData.success) {
        throw new Error(finishData.message || 'Failed to complete registration');
      }

      alert('Security key registered successfully!');
      onComplete();

    } catch (err: any) {
      setError(err.message || 'Registration failed');
      console.error('WebAuthn registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="webauthn-registration">
      <h2>Register Security Key</h2>

      <div className="info-box">
        <p>
          Security keys (like YubiKey) provide the strongest form of two-factor authentication.
          You can also use built-in biometrics (fingerprint, Face ID).
        </p>
      </div>

      <form onSubmit={handleRegister}>
        <div className="form-group">
          <label htmlFor="name">Give your security key a name:</label>
          <input
            id="name"
            type="text"
            value={credentialName}
            onChange={(e) => setCredentialName(e.target.value)}
            placeholder="e.g., YubiKey 5 NFC, MacBook Touch ID"
            maxLength={50}
          />
        </div>

        {error && <div className="error">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Waiting for security key...' : 'Register Security Key'}
        </button>
      </form>
    </div>
  );
};
```

#### WebAuthn Authentication Flow

```typescript
// components/WebAuthnLogin.tsx
import React, { useState } from 'react';
import { startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';

interface WebAuthnLoginProps {
  email?: string;
  onSuccess: (token: string) => void;
}

export const WebAuthnLogin: React.FC<WebAuthnLoginProps> = ({ email, onSuccess }) => {
  const [emailInput, setEmailInput] = useState(email || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!browserSupportsWebAuthn()) {
      setError('Your browser does not support WebAuthn/Security Keys');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Step 1: Get authentication options from server
      const startResponse = await fetch('/api/auth/webauthn/authenticate/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput })
      });

      const startData = await startResponse.json();

      if (!startData.success) {
        throw new Error(startData.message || 'Failed to start authentication');
      }

      // Step 2: Prompt user to use their security key
      let credential;
      try {
        credential = await startAuthentication(startData.data.options);
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          throw new Error('Authentication cancelled or timed out');
        }
        throw err;
      }

      // Step 3: Send credential to server for verification
      const finishResponse = await fetch('/api/auth/webauthn/authenticate/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential,
          userId: startData.data.userId
        })
      });

      const finishData = await finishResponse.json();

      if (!finishData.success) {
        throw new Error(finishData.message || 'Authentication failed');
      }

      // Success! Store token and redirect
      onSuccess(finishData.data.token);

    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      console.error('WebAuthn authentication error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="webauthn-login">
      <h2>Sign in with Security Key</h2>

      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            id="email"
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="your@email.com"
            required
          />
        </div>

        {error && <div className="error">{error}</div>}

        <button
          type="submit"
          disabled={loading || !emailInput}
          className="btn btn-primary"
        >
          {loading ? 'Waiting for security key...' : 'Sign in with Security Key'}
        </button>
      </form>
    </div>
  );
};
```

#### WebAuthn Credentials Management

```typescript
// components/WebAuthnCredentials.tsx
import React, { useState, useEffect } from 'react';

interface Credential {
  id: string;
  credentialId: string;
  name: string;
  deviceType: 'platform' | 'cross-platform';
  transports: string[];
  createdAt: string;
  lastUsedAt: string | null;
  backedUp: boolean;
}

export const WebAuthnCredentials: React.FC = () => {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      const response = await fetch('/api/auth/webauthn/credentials', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setCredentials(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch credentials:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateName = async (credentialId: string) => {
    try {
      const response = await fetch(`/api/auth/webauthn/credentials/${credentialId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name: editName })
      });

      const data = await response.json();

      if (data.success) {
        await fetchCredentials();
        setEditingId(null);
        setEditName('');
      }
    } catch (err) {
      alert('Failed to update credential name');
    }
  };

  const handleDelete = async (credentialId: string, name: string) => {
    if (!confirm(`Delete security key "${name}"? You won't be able to use it to log in anymore.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/auth/webauthn/credentials/${credentialId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        await fetchCredentials();
      } else {
        alert(data.message || 'Failed to delete credential');
      }
    } catch (err) {
      alert('Failed to delete credential');
    }
  };

  if (loading) {
    return <div>Loading security keys...</div>;
  }

  return (
    <div className="webauthn-credentials">
      <h2>Security Keys & Biometrics</h2>

      {credentials.length === 0 ? (
        <div className="empty-state">
          <p>You haven't registered any security keys yet.</p>
          <button
            onClick={() => window.location.href = '/settings/webauthn/register'}
            className="btn btn-primary"
          >
            Register Security Key
          </button>
        </div>
      ) : (
        <div className="credentials-list">
          {credentials.map((cred) => (
            <div key={cred.id} className="credential-item">
              <div className="credential-icon">
                {cred.deviceType === 'platform' ? '📱' : '🔑'}
              </div>

              <div className="credential-info">
                {editingId === cred.id ? (
                  <div className="edit-mode">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => handleUpdateName(cred.id)}
                      onKeyPress={(e) => e.key === 'Enter' && handleUpdateName(cred.id)}
                      autoFocus
                    />
                  </div>
                ) : (
                  <h3
                    onClick={() => {
                      setEditingId(cred.id);
                      setEditName(cred.name);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {cred.name}
                  </h3>
                )}

                <div className="credential-meta">
                  <span className="device-type">
                    {cred.deviceType === 'platform' ? 'Built-in' : 'External'}
                  </span>
                  <span className="transports">
                    {cred.transports.join(', ')}
                  </span>
                  {cred.backedUp && <span className="backed-up">☁️ Backed up</span>}
                </div>

                <div className="credential-dates">
                  <div>Added: {new Date(cred.createdAt).toLocaleDateString()}</div>
                  {cred.lastUsedAt && (
                    <div>Last used: {new Date(cred.lastUsedAt).toLocaleDateString()}</div>
                  )}
                </div>
              </div>

              <div className="credential-actions">
                <button
                  onClick={() => handleDelete(cred.id, cred.name)}
                  className="btn btn-danger btn-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

---

## 4. Session Management

### 4.1 Endpoints

#### Get Active Sessions
```typescript
GET /api/auth/sessions
Headers: Authorization: Bearer {token}

Response:
{
  "error": false,
  "message": "Active sessions retrieved successfully",
  "sessions": [
    {
      "id": "session_id",
      "device": "Chrome on Windows",
      "browser": "Chrome 120.0.0",
      "os": "Windows 10",
      "ip": "192.168.1.1",
      "location": {
        "city": "Riyadh",
        "country": "Saudi Arabia"
      },
      "createdAt": "2024-01-20T10:00:00Z",
      "lastActivityAt": "2024-01-20T15:30:00Z",
      "isCurrent": true
    }
  ],
  "count": 3
}
```

#### Get Current Session
```typescript
GET /api/auth/sessions/current
Headers: Authorization: Bearer {token}

Response:
{
  "error": false,
  "message": "Current session retrieved successfully",
  "session": {
    "id": "session_id",
    "device": "Chrome on Windows",
    ...
  }
}
```

#### Get Session Statistics
```typescript
GET /api/auth/sessions/stats
Headers: Authorization: Bearer {token}

Response:
{
  "error": false,
  "activeCount": 3,
  "recentSessions": [...]
}
```

#### Terminate Specific Session
```typescript
DELETE /api/auth/sessions/{sessionId}
Headers: Authorization: Bearer {token}

Response:
{
  "error": false,
  "message": "Session terminated successfully"
}
```

#### Terminate All Other Sessions
```typescript
DELETE /api/auth/sessions
Headers: Authorization: Bearer {token}

Response:
{
  "error": false,
  "message": "All other sessions terminated successfully",
  "terminatedCount": 2
}
```

### 4.2 Frontend Implementation

#### Active Sessions List

```typescript
// components/ActiveSessions.tsx
import React, { useState, useEffect } from 'react';

interface Session {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location?: {
    city?: string;
    country?: string;
  };
  createdAt: string;
  lastActivityAt: string;
  isCurrent: boolean;
}

export const ActiveSessions: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [terminating, setTerminating] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/auth/sessions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (!data.error) {
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId: string, isCurrent: boolean) => {
    if (isCurrent) {
      alert('You cannot terminate your current session. Use logout instead.');
      return;
    }

    if (!confirm('Terminate this session? The device will be logged out immediately.')) {
      return;
    }

    setTerminating(sessionId);

    try {
      const response = await fetch(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (!data.error) {
        await fetchSessions(); // Refresh the list
      } else {
        alert(data.message || 'Failed to terminate session');
      }
    } catch (err) {
      alert('Failed to terminate session');
    } finally {
      setTerminating(null);
    }
  };

  const handleTerminateAllOthers = async () => {
    if (!confirm('Terminate all other sessions? All other devices will be logged out immediately.')) {
      return;
    }

    try {
      const response = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (!data.error) {
        alert(`${data.terminatedCount} session(s) terminated successfully`);
        await fetchSessions(); // Refresh the list
      } else {
        alert(data.message || 'Failed to terminate sessions');
      }
    } catch (err) {
      alert('Failed to terminate sessions');
    }
  };

  const formatLastActivity = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  if (loading) {
    return <div>Loading sessions...</div>;
  }

  return (
    <div className="active-sessions">
      <div className="sessions-header">
        <h2>Active Sessions</h2>
        {sessions.length > 1 && (
          <button
            onClick={handleTerminateAllOthers}
            className="btn btn-danger btn-sm"
          >
            Terminate All Other Sessions
          </button>
        )}
      </div>

      <div className="sessions-list">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`session-item ${session.isCurrent ? 'current' : ''}`}
          >
            <div className="session-icon">
              {session.os.includes('Windows') && '💻'}
              {session.os.includes('Mac') && '🍎'}
              {session.os.includes('iOS') && '📱'}
              {session.os.includes('Android') && '📱'}
              {!session.os.includes('Windows') && !session.os.includes('Mac') &&
               !session.os.includes('iOS') && !session.os.includes('Android') && '🖥️'}
            </div>

            <div className="session-info">
              <div className="session-header">
                <h3>{session.device}</h3>
                {session.isCurrent && (
                  <span className="current-badge">Current Session</span>
                )}
              </div>

              <div className="session-details">
                <div className="detail-row">
                  <span className="label">Browser:</span>
                  <span>{session.browser}</span>
                </div>

                <div className="detail-row">
                  <span className="label">IP Address:</span>
                  <span>{session.ip}</span>
                </div>

                {session.location && (
                  <div className="detail-row">
                    <span className="label">Location:</span>
                    <span>
                      {session.location.city && `${session.location.city}, `}
                      {session.location.country}
                    </span>
                  </div>
                )}

                <div className="detail-row">
                  <span className="label">Last active:</span>
                  <span>{formatLastActivity(session.lastActivityAt)}</span>
                </div>

                <div className="detail-row">
                  <span className="label">Signed in:</span>
                  <span>{new Date(session.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="session-actions">
              {!session.isCurrent && (
                <button
                  onClick={() => handleTerminateSession(session.id, session.isCurrent)}
                  disabled={terminating === session.id}
                  className="btn btn-danger btn-sm"
                >
                  {terminating === session.id ? 'Terminating...' : 'Terminate'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 5. Error Handling

### 5.1 Error Codes

All security endpoints may return the following error codes:

```typescript
interface SecurityError {
  error: boolean;
  code: string;
  message: string;
  messageEn?: string;
}
```

#### Common Error Codes

| Code | Description | Recommended Action |
|------|-------------|-------------------|
| `MFA_REQUIRED` | User has MFA enabled, code needed | Redirect to MFA verification screen |
| `INVALID_MFA_CODE` | MFA code verification failed | Show error, allow retry |
| `INVALID_FORMAT` | Code format is incorrect | Show format hint (6 digits or XXXX-XXXX) |
| `SSO_REQUIRED` | Firm requires SSO login | Redirect to SSO login endpoint |
| `ACCOUNT_SUSPENDED` | User account is suspended | Show suspension message, contact admin |
| `SESSION_EXPIRED` | Session has expired | Force re-login |
| `UNAUTHORIZED` | Invalid or missing authentication | Redirect to login |
| `FORBIDDEN` | Insufficient permissions | Show permission denied message |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Show cooldown message, retry after delay |

### 5.2 Error Handling Implementation

```typescript
// utils/errorHandler.ts
export class SecurityError extends Error {
  code: string;
  messageAr?: string;

  constructor(code: string, message: string, messageAr?: string) {
    super(message);
    this.code = code;
    this.messageAr = messageAr;
    this.name = 'SecurityError';
  }
}

export const handleSecurityError = (error: any, navigate: (path: string) => void) => {
  const code = error.code || error.response?.data?.code;
  const message = error.message || error.response?.data?.message;

  switch (code) {
    case 'MFA_REQUIRED':
      // Store userId for MFA verification
      const userId = error.userId || error.response?.data?.userId;
      sessionStorage.setItem('mfaUserId', userId);
      navigate('/verify-mfa');
      break;

    case 'SSO_REQUIRED':
      // Redirect to SSO login
      const firmId = error.firmId || error.response?.data?.firmId;
      window.location.href = `/api/auth/saml/login/${firmId}`;
      break;

    case 'ACCOUNT_SUSPENDED':
      navigate('/account-suspended');
      break;

    case 'SESSION_EXPIRED':
    case 'UNAUTHORIZED':
      // Clear tokens and redirect to login
      localStorage.removeItem('token');
      sessionStorage.clear();
      navigate('/login');
      break;

    case 'FORBIDDEN':
      alert('You do not have permission to perform this action.');
      break;

    case 'RATE_LIMIT_EXCEEDED':
      const retryAfter = error.retryAfter || error.response?.data?.retryAfter;
      alert(`Too many requests. Please try again in ${retryAfter} seconds.`);
      break;

    case 'INVALID_MFA_CODE':
      // Let the component handle this
      return { error: true, message };

    default:
      console.error('Unhandled security error:', error);
      alert(message || 'An error occurred. Please try again.');
  }
};
```

#### API Client with Error Handling

```typescript
// utils/apiClient.ts
import { handleSecurityError } from './errorHandler';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

export class APIClient {
  private baseURL: string;
  private navigate: (path: string) => void;

  constructor(baseURL: string, navigate: (path: string) => void) {
    this.baseURL = baseURL;
    this.navigate = navigate;
  }

  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { requiresAuth = true, ...fetchOptions } = options;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers
    };

    // Add authentication token if required
    if (requiresAuth) {
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...fetchOptions,
        headers
      });

      const data = await response.json();

      // Handle security errors
      if (data.error && data.code) {
        handleSecurityError(data, this.navigate);
        throw new Error(data.message);
      }

      // Handle HTTP errors
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return data;

    } catch (error: any) {
      // Network errors
      if (!error.code) {
        console.error('Network error:', error);
        throw new Error('Network error. Please check your connection.');
      }

      throw error;
    }
  }

  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  put<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  patch<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Usage example
// const api = new APIClient('/api', useNavigate());
// const sessions = await api.get<SessionsResponse>('/auth/sessions');
```

---

## 6. TypeScript Types

### 6.1 Authentication Types

```typescript
// types/auth.ts

export interface LoginRequest {
  email?: string;
  username?: string;
  password: string;
  mfaCode?: string;
}

export interface LoginResponse {
  error: boolean;
  token?: string;
  user?: User;
  mfaRequired?: boolean;
  userId?: string;
  code?: string;
  message?: string;
  messageEn?: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'lawyer' | 'staff' | 'client';
  firmId?: string;
  mfaEnabled?: boolean;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}
```

### 6.2 MFA Types

```typescript
// types/mfa.ts

export interface MFAStatus {
  error: boolean;
  mfaEnabled: boolean;
  hasTOTP: boolean;
  hasBackupCodes: boolean;
  remainingCodes: number;
}

export interface MFASetupResponse {
  error: boolean;
  qrCode: string;
  setupKey: string;
}

export interface MFAVerifySetupRequest {
  token: string;
}

export interface MFAVerifySetupResponse {
  error: boolean;
  enabled: boolean;
  backupCodes: string[];
}

export interface MFAVerifyRequest {
  userId: string;
  token: string;
}

export interface MFAVerifyResponse {
  error: boolean;
  valid: boolean;
  remainingCodes?: number;
}

export interface BackupCodesResponse {
  error: boolean;
  message: string;
  codes: string[];
  remainingCodes: number;
}
```

### 6.3 WebAuthn Types

```typescript
// types/webauthn.ts

export interface WebAuthnCredential {
  id: string;
  credentialId: string;
  name: string;
  deviceType: 'platform' | 'cross-platform';
  transports: string[];
  createdAt: string;
  lastUsedAt: string | null;
  backedUp: boolean;
}

export interface WebAuthnRegistrationStartResponse {
  success: boolean;
  data: PublicKeyCredentialCreationOptions;
}

export interface WebAuthnRegistrationFinishRequest {
  credential: any; // PublicKeyCredential from browser
  credentialName?: string;
}

export interface WebAuthnRegistrationFinishResponse {
  success: boolean;
  message: string;
  data: WebAuthnCredential;
}

export interface WebAuthnAuthenticationStartRequest {
  email?: string;
  username?: string;
}

export interface WebAuthnAuthenticationStartResponse {
  success: boolean;
  data: {
    options: PublicKeyCredentialRequestOptions;
    userId: string;
  };
}

export interface WebAuthnAuthenticationFinishRequest {
  credential: any; // PublicKeyCredential from browser
  userId: string;
}

export interface WebAuthnAuthenticationFinishResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: User;
    credential: WebAuthnCredential;
  };
}

export interface WebAuthnCredentialsListResponse {
  success: boolean;
  data: WebAuthnCredential[];
}
```

### 6.4 Session Types

```typescript
// types/session.ts

export interface Session {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location?: {
    city?: string;
    country?: string;
    region?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  createdAt: string;
  lastActivityAt: string;
  isCurrent: boolean;
}

export interface SessionsListResponse {
  error: boolean;
  message: string;
  sessions: Session[];
  count: number;
}

export interface SessionStatsResponse {
  error: boolean;
  activeCount: number;
  recentSessions: Session[];
}

export interface TerminateSessionResponse {
  error: boolean;
  message: string;
}

export interface TerminateAllSessionsResponse {
  error: boolean;
  message: string;
  terminatedCount: number;
}
```

### 6.5 SSO/SAML Types

```typescript
// types/saml.ts

export interface SSOConfig {
  ssoEnabled: boolean;
  ssoProvider?: 'azure' | 'okta' | 'google' | 'custom';
  ssoEntityId?: string;
  ssoSsoUrl?: string;
  ssoMetadataUrl?: string;
  hasCertificate?: boolean;
  spEntityId?: string;
  spAcsUrl?: string;
  spSloUrl?: string;
  spMetadataUrl?: string;
}

export interface SSOConfigResponse {
  error: boolean;
  message: string;
  config: SSOConfig;
}

export interface UpdateSSOConfigRequest {
  ssoEnabled: boolean;
  ssoProvider: 'azure' | 'okta' | 'google' | 'custom';
  ssoEntityId: string;
  ssoSsoUrl: string;
  ssoCertificate: string;
  ssoMetadataUrl?: string;
}

export interface TestSSOConfigResponse {
  error: boolean;
  message: string;
  valid: boolean;
}
```

---

## 7. Complete Integration Example

Here's a complete example showing how all security features work together:

```typescript
// App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { LoginForm } from './components/LoginForm';
import { MFAVerification } from './components/MFAVerification';
import { MFASetup } from './components/MFASetup';
import { WebAuthnLogin } from './components/WebAuthnLogin';
import { Dashboard } from './pages/Dashboard';
import { SecuritySettings } from './pages/SecuritySettings';
import { APIClient } from './utils/apiClient';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginForm />} />
        <Route path="/login/webauthn" element={<WebAuthnLogin onSuccess={(token) => {
          localStorage.setItem('token', token);
          window.location.href = '/dashboard';
        }} />} />
        <Route path="/verify-mfa" element={<MFAVerification
          userId={sessionStorage.getItem('mfaUserId') || ''}
          onSuccess={(token) => {
            localStorage.setItem('token', token);
            sessionStorage.removeItem('mfaUserId');
            window.location.href = '/dashboard';
          }}
        />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />

        <Route path="/settings/security" element={
          <ProtectedRoute>
            <SecuritySettings />
          </ProtectedRoute>
        } />

        <Route path="/settings/mfa/setup" element={
          <ProtectedRoute>
            <MFASetup onComplete={() => window.location.href = '/settings/security'} />
          </ProtectedRoute>
        } />

        {/* Default Route */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
```

---

## Summary

This documentation covers:

✅ **SAML/SSO** - Complete enterprise SSO integration with admin configuration
✅ **MFA/TOTP** - Two-factor authentication with authenticator apps and backup codes
✅ **WebAuthn** - Hardware security keys and biometric authentication
✅ **Session Management** - Multi-device session tracking and termination
✅ **Error Handling** - Comprehensive error codes and handling strategies
✅ **TypeScript Types** - Full type definitions for all APIs

All examples are production-ready with proper error handling, loading states, and user feedback.
