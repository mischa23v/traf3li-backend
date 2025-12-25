# @traf3li/auth-react

React SDK for Traf3li Authentication - Complete authentication solution for React applications.

## Features

- ✅ **Email/Password Authentication** - Traditional login/register
- ✅ **OAuth Social Login** - Google, Microsoft, Apple, GitHub
- ✅ **Passwordless Authentication** - Magic Links, OTP
- ✅ **Multi-Factor Authentication (MFA/2FA)** - TOTP with backup codes
- ✅ **Session Management** - Multi-device session control
- ✅ **User Profile Management** - Update user information
- ✅ **SSR Compatible** - Works with Next.js and other SSR frameworks
- ✅ **TypeScript** - Full type safety
- ✅ **Tree-shakeable** - Import only what you need
- ✅ **Production Ready** - Battle-tested and optimized

## Installation

```bash
npm install @traf3li/auth-react
# or
yarn add @traf3li/auth-react
# or
pnpm add @traf3li/auth-react
```

## Quick Start

### 1. Wrap your app with TrafAuthProvider

```tsx
import { TrafAuthProvider } from '@traf3li/auth-react';

function App() {
  return (
    <TrafAuthProvider
      apiUrl="https://api.traf3li.com"
      onAuthStateChange={(user) => console.log('Auth state:', user)}
    >
      <YourApp />
    </TrafAuthProvider>
  );
}
```

### 2. Use the useAuth hook

```tsx
import { useAuth } from '@traf3li/auth-react';

function LoginPage() {
  const { login, isLoading, error } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      await login({
        email: formData.get('email'),
        password: formData.get('password')
      });
      // Redirect to dashboard
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
      {error && <p>{error.message}</p>}
    </form>
  );
}
```

## Provider Configuration

```tsx
<TrafAuthProvider
  apiUrl="https://api.traf3li.com"           // Required: Your API URL
  firmId="optional-firm-id"                  // Optional: Firm context
  onAuthStateChange={(user) => {}}           // Optional: Auth state callback
  onError={(error) => {}}                    // Optional: Error callback
  autoRefreshToken={true}                    // Optional: Auto-refresh tokens (default: true)
  tokenRefreshInterval={14 * 60 * 1000}      // Optional: Refresh interval (default: 14 min)
  persistSession={true}                      // Optional: Persist to localStorage (default: true)
  storageKey="traf_auth_user"                // Optional: Storage key (default: traf_auth_user)
>
  <App />
</TrafAuthProvider>
```

## Hooks

### useAuth

Main authentication hook with all auth methods.

```tsx
import { useAuth } from '@traf3li/auth-react';

function Component() {
  const {
    // State
    user,              // Current user or null
    isAuthenticated,   // Boolean
    isLoading,         // Loading state
    error,             // Error object or null
    csrfToken,         // CSRF token

    // Auth Methods
    login,             // (credentials) => Promise<AuthResponse>
    register,          // (data) => Promise<AuthResponse>
    logout,            // () => Promise<void>
    logoutAll,         // () => Promise<void>
    refreshToken,      // () => Promise<void>

    // OAuth Methods
    loginWithGoogle,   // () => Promise<void>
    loginWithMicrosoft,
    loginWithApple,
    loginWithProvider, // (provider) => Promise<void>
    handleOAuthCallback,
    handleGoogleOneTap,

    // Passwordless Methods
    sendMagicLink,     // (options) => Promise<PasswordlessResponse>
    verifyMagicLink,   // (token) => Promise<AuthResponse>

    // Password Reset
    forgotPassword,    // (email) => Promise<PasswordlessResponse>
    resetPassword,     // (token, newPassword) => Promise<PasswordlessResponse>

    // Email Verification
    verifyEmail,       // (token) => Promise<PasswordlessResponse>
    resendVerificationEmail,

    // User Management
    updateProfile,     // (data) => Promise<User>
    refetchUser,       // () => Promise<void>

    // CSRF
    refreshCsrfToken,  // () => Promise<void>
  } = useAuth();

  return <div>...</div>;
}
```

### useUser

Simplified hook for user data and profile management.

```tsx
import { useUser } from '@traf3li/auth-react';

function ProfilePage() {
  const { user, isLoading, updateProfile } = useUser();

  const handleUpdate = async () => {
    await updateProfile({
      firstName: 'John',
      lastName: 'Doe',
      phone: '+966501234567'
    });
  };

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <div>Not logged in</div>;

  return (
    <div>
      <h1>{user.firstName} {user.lastName}</h1>
      <button onClick={handleUpdate}>Update Profile</button>
    </div>
  );
}
```

### useMFA

Multi-Factor Authentication management.

```tsx
import { useMFA } from '@traf3li/auth-react';

function MFASettings() {
  const {
    isEnabled,
    isLoading,
    setupMFA,
    verifySetup,
    disable,
    backupCodes,
    regenerateBackupCodes
  } = useMFA();

  const handleEnable = async () => {
    // Step 1: Setup MFA
    const { qrCode, secret, backupCodes } = await setupMFA();

    // Step 2: Show QR code to user
    setQRCode(qrCode);

    // Step 3: User enters code from authenticator app
    const code = prompt('Enter code from authenticator app');
    await verifySetup(code);

    // Step 4: Show backup codes
    alert('Save these backup codes: ' + backupCodes.join(', '));
  };

  const handleDisable = async () => {
    const password = prompt('Enter your password to disable MFA');
    await disable(password);
  };

  return (
    <div>
      <h2>Multi-Factor Authentication</h2>
      <p>Status: {isEnabled ? 'Enabled' : 'Disabled'}</p>
      {isEnabled ? (
        <button onClick={handleDisable}>Disable MFA</button>
      ) : (
        <button onClick={handleEnable}>Enable MFA</button>
      )}
    </div>
  );
}
```

### useSessions

Session management across devices.

```tsx
import { useSessions } from '@traf3li/auth-react';

function SessionsPage() {
  const {
    sessions,
    currentSession,
    isLoading,
    revokeSession,
    revokeAllOther
  } = useSessions();

  return (
    <div>
      <h2>Active Sessions</h2>
      {sessions.map(session => (
        <div key={session._id}>
          <p>{session.deviceInfo?.device} - {session.deviceInfo?.browser}</p>
          <p>{session.location?.city}, {session.location?.country}</p>
          {!session.isCurrent && (
            <button onClick={() => revokeSession(session._id)}>
              Revoke
            </button>
          )}
        </div>
      ))}
      <button onClick={revokeAllOther}>
        Logout from all other devices
      </button>
    </div>
  );
}
```

### usePasswordless

Passwordless authentication (Magic Links, OTP).

```tsx
import { usePasswordless } from '@traf3li/auth-react';

function PasswordlessLogin() {
  const { sendMagicLink, isLoading } = usePasswordless();

  const handleSendLink = async (email) => {
    await sendMagicLink({
      email,
      purpose: 'login',
      redirectUrl: '/dashboard'
    });
    alert('Check your email for the magic link!');
  };

  return (
    <div>
      <input type="email" id="email" />
      <button onClick={() => handleSendLink(document.getElementById('email').value)}>
        Send Magic Link
      </button>
    </div>
  );
}

// Handle magic link verification
function MagicLinkCallback() {
  const { verifyMagicLink } = usePasswordless();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      verifyMagicLink(token)
        .then(() => navigate('/dashboard'))
        .catch(err => console.error(err));
    }
  }, [searchParams]);

  return <div>Verifying...</div>;
}
```

### useOAuth

OAuth social authentication.

```tsx
import { useOAuth } from '@traf3li/auth-react';

function SocialLogin() {
  const { loginWithProvider, availableProviders } = useOAuth();

  return (
    <div>
      <button onClick={() => loginWithProvider('google')}>
        Sign in with Google
      </button>
      <button onClick={() => loginWithProvider('microsoft')}>
        Sign in with Microsoft
      </button>
      <button onClick={() => loginWithProvider('apple')}>
        Sign in with Apple
      </button>
    </div>
  );
}

// Handle OAuth callback
function OAuthCallback() {
  const { handleCallback } = useOAuth();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (code) {
      handleCallback({ code, state })
        .then(() => navigate('/dashboard'))
        .catch(err => console.error(err));
    }
  }, [searchParams]);

  return <div>Authenticating...</div>;
}
```

## Components

### AuthGuard

Protect routes with authentication and authorization checks.

```tsx
import { AuthGuard } from '@traf3li/auth-react';

// Require authentication
function DashboardPage() {
  return (
    <AuthGuard requireAuth redirectTo="/login">
      <Dashboard />
    </AuthGuard>
  );
}

// Require specific role
function AdminPage() {
  return (
    <AuthGuard
      requireRoles={['admin', 'super_admin']}
      redirectTo="/unauthorized"
      fallback={<Loading />}
    >
      <AdminPanel />
    </AuthGuard>
  );
}

// Require specific permissions
function UserManagementPage() {
  return (
    <AuthGuard
      requirePermissions={['users.write', 'users.delete']}
      fallback={<AccessDenied />}
      onUnauthorized={() => console.log('Access denied')}
    >
      <UserManagement />
    </AuthGuard>
  );
}
```

## Higher-Order Components

### withAuth

HOC for wrapping components with authentication.

```tsx
import { withAuth } from '@traf3li/auth-react';

// Basic usage
const ProtectedPage = withAuth(DashboardPage);

// With options
const AdminPage = withAuth(AdminPanel, {
  requireAuth: true,
  requireRoles: ['admin'],
  redirectTo: '/login',
  loader: CustomLoader
});

// Multiple roles
const LawyerPage = withAuth(LawyerDashboard, {
  requireRoles: ['lawyer', 'admin'],
  requirePermissions: ['cases.read']
});

export default AdminPage;
```

## TypeScript Support

Full TypeScript support with comprehensive types:

```tsx
import type {
  User,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  MFASetupResponse,
  Session,
} from '@traf3li/auth-react';

const handleLogin = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  // Fully typed
};
```

## SSR Support (Next.js)

The SDK is fully compatible with Server-Side Rendering:

```tsx
// app/providers.tsx (Next.js App Router)
'use client';

import { TrafAuthProvider } from '@traf3li/auth-react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TrafAuthProvider apiUrl={process.env.NEXT_PUBLIC_API_URL}>
      {children}
    </TrafAuthProvider>
  );
}

// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

## Error Handling

All methods throw `AuthError` with detailed information:

```tsx
import { useAuth, AuthError } from '@traf3li/auth-react';

function LoginPage() {
  const { login } = useAuth();

  const handleLogin = async (credentials) => {
    try {
      await login(credentials);
    } catch (error) {
      if (error instanceof AuthError) {
        console.error('Code:', error.code);
        console.error('Status:', error.status);
        console.error('Message:', error.message);
        console.error('Details:', error.details);
      }
    }
  };
}
```

## Examples

### Complete Login Form

```tsx
import { useAuth } from '@traf3li/auth-react';
import { useState } from 'react';

function LoginForm() {
  const { login, loginWithGoogle, isLoading, error } = useAuth();
  const [credentials, setCredentials] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await login(credentials);

      if (result.mfaRequired) {
        // Show MFA input
        const mfaCode = prompt('Enter your MFA code');
        await login({ ...credentials, mfaCode });
      }

      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={credentials.email}
        onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={credentials.password}
        onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
        placeholder="Password"
        required
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>

      <hr />

      <button type="button" onClick={loginWithGoogle}>
        Sign in with Google
      </button>

      {error && <p style={{ color: 'red' }}>{error.message}</p>}
    </form>
  );
}
```

### Protected Dashboard

```tsx
import { useAuth, AuthGuard } from '@traf3li/auth-react';

function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <AuthGuard requireAuth redirectTo="/login">
      <div>
        <h1>Welcome, {user?.firstName}!</h1>
        <p>Email: {user?.email}</p>
        <p>Role: {user?.role}</p>

        {user?.firmId && (
          <div>
            <h2>Firm: {user.firm?.name}</h2>
            <p>Your role: {user.firmRole}</p>
          </div>
        )}

        <button onClick={logout}>Logout</button>
      </div>
    </AuthGuard>
  );
}
```

## License

MIT

## Support

For issues and questions, please visit [GitHub Issues](https://github.com/traf3li/traf3li-backend/issues)
