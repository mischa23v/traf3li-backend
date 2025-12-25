# @traf3li/auth-react - Examples

Comprehensive examples for using the Traf3li Auth React SDK.

## Table of Contents

- [Setup](#setup)
- [Authentication](#authentication)
- [OAuth Social Login](#oauth-social-login)
- [Passwordless Authentication](#passwordless-authentication)
- [Multi-Factor Authentication](#multi-factor-authentication)
- [Session Management](#session-management)
- [User Profile Management](#user-profile-management)
- [Protected Routes](#protected-routes)
- [Next.js Integration](#nextjs-integration)

## Setup

### Basic Setup

```tsx
// app.tsx
import { TrafAuthProvider } from '@traf3li/auth-react';
import { Router } from './router';

function App() {
  return (
    <TrafAuthProvider
      apiUrl="https://api.traf3li.com"
      onAuthStateChange={(user) => {
        console.log('User state changed:', user);
        // Track authentication with analytics
        if (user) {
          analytics.identify(user.id, {
            email: user.email,
            role: user.role
          });
        }
      }}
      onError={(error) => {
        console.error('Auth error:', error);
        // Send to error tracking service
        errorTracker.capture(error);
      }}
    >
      <Router />
    </TrafAuthProvider>
  );
}

export default App;
```

### Advanced Setup with Firm Context

```tsx
// app.tsx
import { TrafAuthProvider } from '@traf3li/auth-react';

function App() {
  const firmId = getFirmIdFromSubdomain(); // e.g., "firm123"

  return (
    <TrafAuthProvider
      apiUrl="https://api.traf3li.com"
      firmId={firmId}
      autoRefreshToken={true}
      tokenRefreshInterval={14 * 60 * 1000} // 14 minutes
      persistSession={true}
      storageKey={`traf_auth_${firmId}`} // Unique key per firm
    >
      <Router />
    </TrafAuthProvider>
  );
}
```

## Authentication

### Login Form

```tsx
// LoginPage.tsx
import { useAuth } from '@traf3li/auth-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const { login, isLoading, error } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    mfaCode: ''
  });
  const [showMFA, setShowMFA] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await login({
        email: formData.email,
        password: formData.password,
        mfaCode: formData.mfaCode || undefined
      });

      // Check if MFA is required
      if (result.mfaRequired) {
        setShowMFA(true);
        return;
      }

      // Success - redirect
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="login-page">
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="Email"
          required
          disabled={showMFA}
        />
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="Password"
          required
          disabled={showMFA}
        />

        {showMFA && (
          <input
            type="text"
            value={formData.mfaCode}
            onChange={(e) => setFormData({ ...formData, mfaCode: e.target.value })}
            placeholder="Enter MFA Code"
            required
          />
        )}

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Loading...' : showMFA ? 'Verify' : 'Login'}
        </button>

        {error && <p className="error">{error.message}</p>}
      </form>
    </div>
  );
}
```

### Registration Form

```tsx
// RegisterPage.tsx
import { useAuth } from '@traf3li/auth-react';
import { useState } from 'react';

function RegisterPage() {
  const { register, isLoading, error } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'client',
    isSeller: false,
    lawyerWorkMode: 'solo' // solo, create_firm, join_firm
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await register(formData);
      console.log('Registration successful:', result);
      // Show success message or redirect
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={formData.username}
        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
        placeholder="Username"
        required
      />
      <input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        placeholder="Password"
        required
      />
      <input
        type="text"
        value={formData.firstName}
        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
        placeholder="First Name"
        required
      />
      <input
        type="text"
        value={formData.lastName}
        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
        placeholder="Last Name"
        required
      />
      <input
        type="tel"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        placeholder="Phone"
      />

      <select
        value={formData.role}
        onChange={(e) => setFormData({
          ...formData,
          role: e.target.value as 'client' | 'lawyer',
          isSeller: e.target.value === 'lawyer'
        })}
      >
        <option value="client">Client</option>
        <option value="lawyer">Lawyer</option>
      </select>

      {formData.role === 'lawyer' && (
        <select
          value={formData.lawyerWorkMode}
          onChange={(e) => setFormData({ ...formData, lawyerWorkMode: e.target.value })}
        >
          <option value="solo">Solo Lawyer</option>
          <option value="create_firm">Create Firm</option>
          <option value="join_firm">Join Firm</option>
        </select>
      )}

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating account...' : 'Register'}
      </button>

      {error && <p className="error">{error.message}</p>}
    </form>
  );
}
```

## OAuth Social Login

### Social Login Buttons

```tsx
// SocialLogin.tsx
import { useOAuth } from '@traf3li/auth-react';

function SocialLogin() {
  const { loginWithProvider, isLoading } = useOAuth();

  const handleSocialLogin = async (provider: 'google' | 'microsoft' | 'apple') => {
    try {
      // This will redirect to OAuth provider
      await loginWithProvider(provider);
    } catch (err) {
      console.error('OAuth login failed:', err);
    }
  };

  return (
    <div className="social-login">
      <button
        onClick={() => handleSocialLogin('google')}
        disabled={isLoading}
        className="google-btn"
      >
        <GoogleIcon /> Sign in with Google
      </button>

      <button
        onClick={() => handleSocialLogin('microsoft')}
        disabled={isLoading}
        className="microsoft-btn"
      >
        <MicrosoftIcon /> Sign in with Microsoft
      </button>

      <button
        onClick={() => handleSocialLogin('apple')}
        disabled={isLoading}
        className="apple-btn"
      >
        <AppleIcon /> Sign in with Apple
      </button>
    </div>
  );
}
```

### OAuth Callback Handler

```tsx
// OAuthCallbackPage.tsx
import { useOAuth } from '@traf3li/auth-react';
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

function OAuthCallbackPage() {
  const { handleCallback } = useOAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        setStatus(`Error: ${searchParams.get('error_description') || error}`);
        return;
      }

      if (!code) {
        setStatus('Invalid callback - missing code');
        return;
      }

      try {
        await handleCallback({ code, state });
        setStatus('Success! Redirecting...');
        setTimeout(() => navigate('/dashboard'), 1000);
      } catch (err) {
        setStatus(`Failed: ${err.message}`);
      }
    };

    processCallback();
  }, [searchParams, handleCallback, navigate]);

  return (
    <div className="oauth-callback">
      <h2>{status}</h2>
      {status.includes('Failed') && (
        <button onClick={() => navigate('/login')}>
          Back to Login
        </button>
      )}
    </div>
  );
}
```

### Google One Tap

```tsx
// GoogleOneTap.tsx
import { useAuth } from '@traf3li/auth-react';
import { useEffect } from 'react';

function GoogleOneTap() {
  const { handleGoogleOneTap } = useAuth();

  useEffect(() => {
    // Load Google Identity Services script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      // Initialize Google One Tap
      window.google.accounts.id.initialize({
        client_id: 'YOUR_GOOGLE_CLIENT_ID',
        callback: async (response) => {
          try {
            await handleGoogleOneTap(response.credential);
            // Redirect or update UI
          } catch (err) {
            console.error('Google One Tap failed:', err);
          }
        }
      });

      // Display the One Tap dialog
      window.google.accounts.id.prompt();
    };

    return () => {
      document.body.removeChild(script);
    };
  }, [handleGoogleOneTap]);

  return null; // This component doesn't render anything
}
```

## Passwordless Authentication

### Magic Link Login

```tsx
// MagicLinkLogin.tsx
import { usePasswordless } from '@traf3li/auth-react';
import { useState } from 'react';

function MagicLinkLogin() {
  const { sendMagicLink, isLoading } = usePasswordless();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await sendMagicLink({
        email,
        purpose: 'login',
        redirectUrl: '/dashboard'
      });
      setSent(true);
    } catch (err) {
      console.error('Failed to send magic link:', err);
    }
  };

  if (sent) {
    return (
      <div>
        <h2>Check your email!</h2>
        <p>We've sent a magic link to {email}</p>
        <p>Click the link to sign in.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Sign in with Magic Link</h2>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Sending...' : 'Send Magic Link'}
      </button>
    </form>
  );
}
```

### Magic Link Verification

```tsx
// MagicLinkVerify.tsx
import { usePasswordless } from '@traf3li/auth-react';
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

function MagicLinkVerify() {
  const { verifyMagicLink } = usePasswordless();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Verifying...');

  useEffect(() => {
    const verify = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('Invalid link');
        return;
      }

      try {
        await verifyMagicLink(token);
        setStatus('Success! Redirecting...');
        setTimeout(() => navigate('/dashboard'), 1000);
      } catch (err) {
        setStatus(`Verification failed: ${err.message}`);
      }
    };

    verify();
  }, [searchParams, verifyMagicLink, navigate]);

  return (
    <div className="magic-link-verify">
      <h2>{status}</h2>
    </div>
  );
}
```

## Multi-Factor Authentication

### MFA Setup

```tsx
// MFASetup.tsx
import { useMFA } from '@traf3li/auth-react';
import { useState } from 'react';
import QRCode from 'qrcode.react';

function MFASetup() {
  const { setupMFA, verifySetup, isLoading } = useMFA();
  const [step, setStep] = useState<'initial' | 'setup' | 'verify' | 'complete'>('initial');
  const [qrCode, setQRCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');

  const handleSetup = async () => {
    try {
      const result = await setupMFA();
      setQRCode(result.qrCode);
      setSecret(result.secret);
      setBackupCodes(result.backupCodes);
      setStep('setup');
    } catch (err) {
      console.error('MFA setup failed:', err);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await verifySetup(verificationCode);
      setStep('complete');
    } catch (err) {
      console.error('MFA verification failed:', err);
      alert('Invalid code. Please try again.');
    }
  };

  if (step === 'initial') {
    return (
      <div>
        <h2>Enable Two-Factor Authentication</h2>
        <p>Add an extra layer of security to your account</p>
        <button onClick={handleSetup} disabled={isLoading}>
          Get Started
        </button>
      </div>
    );
  }

  if (step === 'setup') {
    return (
      <div>
        <h2>Scan QR Code</h2>
        <p>Use an authenticator app (Google Authenticator, Authy, etc.) to scan:</p>
        <QRCode value={qrCode} size={256} />
        <p>Or enter this code manually: <code>{secret}</code></p>
        <button onClick={() => setStep('verify')}>
          I've Scanned the Code
        </button>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div>
        <h2>Verify Setup</h2>
        <p>Enter the 6-digit code from your authenticator app:</p>
        <form onSubmit={handleVerify}>
          <input
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="000000"
            maxLength={6}
            required
          />
          <button type="submit" disabled={isLoading}>
            Verify
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h2>MFA Enabled!</h2>
      <p>Save these backup codes in a safe place:</p>
      <ul>
        {backupCodes.map((code, i) => (
          <li key={i}><code>{code}</code></li>
        ))}
      </ul>
      <button onClick={() => window.print()}>
        Print Backup Codes
      </button>
    </div>
  );
}
```

## Session Management

### Sessions List

```tsx
// SessionsPage.tsx
import { useSessions } from '@traf3li/auth-react';

function SessionsPage() {
  const {
    sessions,
    currentSession,
    isLoading,
    revokeSession,
    revokeAllOther
  } = useSessions();

  if (isLoading) return <div>Loading sessions...</div>;

  return (
    <div className="sessions-page">
      <h1>Active Sessions</h1>
      <p>Manage your active sessions across devices</p>

      <div className="sessions-list">
        {sessions.map(session => (
          <div
            key={session._id}
            className={`session-card ${session.isCurrent ? 'current' : ''}`}
          >
            <div className="session-device">
              <strong>{session.deviceInfo?.device || 'Unknown Device'}</strong>
              <span>{session.deviceInfo?.browser}</span>
              <span>{session.deviceInfo?.os}</span>
            </div>

            <div className="session-location">
              <span>{session.location?.city}, {session.location?.country}</span>
              <span>IP: {session.deviceInfo?.ip}</span>
            </div>

            <div className="session-time">
              <span>Last active: {new Date(session.lastActivity).toLocaleString()}</span>
              <span>Created: {new Date(session.createdAt).toLocaleString()}</span>
            </div>

            {session.isCurrent ? (
              <span className="current-badge">Current Session</span>
            ) : (
              <button
                onClick={() => revokeSession(session._id)}
                className="revoke-btn"
              >
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={revokeAllOther}
        className="revoke-all-btn"
      >
        Logout from all other devices
      </button>
    </div>
  );
}
```

## User Profile Management

### Profile Page

```tsx
// ProfilePage.tsx
import { useUser } from '@traf3li/auth-react';
import { useState } from 'react';

function ProfilePage() {
  const { user, isLoading, updateProfile } = useUser();
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    timezone: user?.timezone || 'Asia/Riyadh',
    notificationPreferences: {
      email: user?.notificationPreferences?.email ?? true,
      push: user?.notificationPreferences?.push ?? true,
      sms: user?.notificationPreferences?.sms ?? false,
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateProfile(formData);
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Profile update failed:', err);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <form onSubmit={handleSubmit}>
      <h1>Profile Settings</h1>

      <input
        type="text"
        value={formData.firstName}
        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
        placeholder="First Name"
      />

      <input
        type="text"
        value={formData.lastName}
        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
        placeholder="Last Name"
      />

      <input
        type="tel"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        placeholder="Phone"
      />

      <select
        value={formData.timezone}
        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
      >
        <option value="Asia/Riyadh">Riyadh (GMT+3)</option>
        <option value="Asia/Dubai">Dubai (GMT+4)</option>
        <option value="Europe/London">London (GMT+0)</option>
        <option value="America/New_York">New York (GMT-5)</option>
      </select>

      <h2>Notification Preferences</h2>
      <label>
        <input
          type="checkbox"
          checked={formData.notificationPreferences.email}
          onChange={(e) => setFormData({
            ...formData,
            notificationPreferences: {
              ...formData.notificationPreferences,
              email: e.target.checked
            }
          })}
        />
        Email Notifications
      </label>

      <label>
        <input
          type="checkbox"
          checked={formData.notificationPreferences.push}
          onChange={(e) => setFormData({
            ...formData,
            notificationPreferences: {
              ...formData.notificationPreferences,
              push: e.target.checked
            }
          })}
        />
        Push Notifications
      </label>

      <button type="submit">Save Changes</button>
    </form>
  );
}
```

## Protected Routes

### Using AuthGuard

```tsx
// router.tsx
import { AuthGuard } from '@traf3li/auth-react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <AuthGuard requireAuth redirectTo="/login">
              <DashboardPage />
            </AuthGuard>
          }
        />

        {/* Admin only */}
        <Route
          path="/admin"
          element={
            <AuthGuard
              requireRoles={['admin', 'super_admin']}
              redirectTo="/unauthorized"
              fallback={<Loading />}
            >
              <AdminPage />
            </AuthGuard>
          }
        />

        {/* Permission-based */}
        <Route
          path="/users"
          element={
            <AuthGuard
              requirePermissions={['users.read']}
              fallback={<AccessDenied />}
            >
              <UsersPage />
            </AuthGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

### Using withAuth HOC

```tsx
// pages/DashboardPage.tsx
import { withAuth } from '@traf3li/auth-react';

function DashboardPage() {
  return <div>Dashboard Content</div>;
}

export default withAuth(DashboardPage, {
  requireAuth: true,
  redirectTo: '/login'
});

// pages/AdminPage.tsx
import { withAuth } from '@traf3li/auth-react';

function AdminPage() {
  return <div>Admin Panel</div>;
}

export default withAuth(AdminPage, {
  requireRoles: ['admin'],
  redirectTo: '/unauthorized'
});
```

## Next.js Integration

### App Router (Next.js 13+)

```tsx
// app/providers.tsx
'use client';

import { TrafAuthProvider } from '@traf3li/auth-react';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <TrafAuthProvider apiUrl={process.env.NEXT_PUBLIC_API_URL!}>
      {children}
    </TrafAuthProvider>
  );
}

// app/layout.tsx
import { AuthProvider } from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

// app/dashboard/page.tsx
'use client';

import { useAuth, AuthGuard } from '@traf3li/auth-react';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <AuthGuard requireAuth redirectTo="/login">
      <div>
        <h1>Dashboard</h1>
        <p>Welcome, {user?.firstName}!</p>
      </div>
    </AuthGuard>
  );
}
```

### Pages Router (Next.js 12 and below)

```tsx
// pages/_app.tsx
import { TrafAuthProvider } from '@traf3li/auth-react';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <TrafAuthProvider apiUrl={process.env.NEXT_PUBLIC_API_URL!}>
      <Component {...pageProps} />
    </TrafAuthProvider>
  );
}

// pages/dashboard.tsx
import { withAuth } from '@traf3li/auth-react';

function Dashboard() {
  return <div>Protected Dashboard</div>;
}

export default withAuth(Dashboard, {
  requireAuth: true,
  redirectTo: '/login'
});
```
