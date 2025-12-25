# Traf3li Auth - Complete Frontend Integration Guide

This guide covers everything you need to integrate Traf3li Auth into your frontend application.

---

## Table of Contents

1. [Quick Start (5 minutes)](#quick-start)
2. [Installation](#installation)
3. [React Integration](#react-integration)
4. [Next.js Integration](#nextjs-integration)
5. [Google One Tap](#google-one-tap)
6. [Domain-Based SSO](#domain-based-sso)
7. [Pre-built Components](#pre-built-components)
8. [Complete Examples](#complete-examples)
9. [API Reference](#api-reference)

---

## Quick Start

### Option 1: Using Pre-built Components (Fastest)

```tsx
// 1. Install packages
npm install @traf3li/auth-react @traf3li/auth-react-ui

// 2. Wrap your app
import { TrafAuthProvider } from '@traf3li/auth-react';
import { ThemeProvider } from '@traf3li/auth-react-ui';

function App() {
  return (
    <TrafAuthProvider apiUrl="https://api.traf3li.com">
      <ThemeProvider>
        <YourApp />
      </ThemeProvider>
    </TrafAuthProvider>
  );
}

// 3. Use pre-built login form
import { LoginForm } from '@traf3li/auth-react-ui';

function LoginPage() {
  return (
    <LoginForm
      onSuccess={(user) => window.location.href = '/dashboard'}
      showSocialLogins={true}
      providers={['google', 'microsoft']}
    />
  );
}
```

### Option 2: Using Hooks (More Control)

```tsx
import { useAuth } from '@traf3li/auth-react';

function LoginPage() {
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login({ email, password });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button disabled={isLoading}>Login</button>
      {error && <p>{error.message}</p>}
    </form>
  );
}
```

---

## Installation

### For React Applications

```bash
# Core SDK (required)
npm install @traf3li/auth-core

# React SDK (required for React)
npm install @traf3li/auth-react

# Pre-built UI Components (optional, saves time)
npm install @traf3li/auth-react-ui
```

### For Next.js Applications

```bash
# All packages
npm install @traf3li/auth-core @traf3li/auth-react @traf3li/auth-nextjs

# Optional: Pre-built components
npm install @traf3li/auth-react-ui
```

### Package Sizes

| Package | Size (gzipped) |
|---------|----------------|
| @traf3li/auth-core | ~8 KB |
| @traf3li/auth-react | ~4 KB |
| @traf3li/auth-nextjs | ~6 KB |
| @traf3li/auth-react-ui | ~15 KB |

---

## React Integration

### Step 1: Setup Provider

```tsx
// src/App.tsx
import { TrafAuthProvider } from '@traf3li/auth-react';

function App() {
  return (
    <TrafAuthProvider
      apiUrl={process.env.REACT_APP_API_URL || 'https://api.traf3li.com'}
      firmId="your-firm-id" // Optional: for multi-tenancy
      autoRefreshToken={true}
      onAuthStateChange={(user) => {
        console.log('Auth state changed:', user);
      }}
    >
      <Router>
        <Routes />
      </Router>
    </TrafAuthProvider>
  );
}
```

### Step 2: Use Authentication Hook

```tsx
// src/pages/Login.tsx
import { useAuth } from '@traf3li/auth-react';

function LoginPage() {
  const {
    user,              // Current user or null
    isAuthenticated,   // Boolean
    isLoading,         // Loading state
    error,             // Error object
    login,             // Login function
    loginWithGoogle,   // OAuth login
    logout,            // Logout function
  } = useAuth();

  // Redirect if already logged in
  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  const handleLogin = async (email: string, password: string) => {
    try {
      const result = await login({ email, password });

      if (result.mfaRequired) {
        // Redirect to MFA verification
        navigate('/mfa-verify');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      // Error is automatically set in the hook
      console.error('Login failed:', err);
    }
  };

  return (
    <div>
      {error && <Alert type="error">{error.message}</Alert>}
      <LoginForm onSubmit={handleLogin} isLoading={isLoading} />
    </div>
  );
}
```

### Step 3: Protect Routes

```tsx
// src/components/ProtectedRoute.tsx
import { AuthGuard } from '@traf3li/auth-react';

// Option 1: Using AuthGuard component
function ProtectedRoute({ children }) {
  return (
    <AuthGuard
      requireAuth={true}
      redirectTo="/login"
      loadingComponent={<LoadingSpinner />}
    >
      {children}
    </AuthGuard>
  );
}

// Option 2: Using HOC
import { withAuth } from '@traf3li/auth-react';

const DashboardPage = withAuth(
  function Dashboard() {
    return <div>Protected Dashboard</div>;
  },
  { requireAuth: true, redirectTo: '/login' }
);
```

### Step 4: User Profile & Sessions

```tsx
// src/pages/Profile.tsx
import { useUser, useSessions } from '@traf3li/auth-react';

function ProfilePage() {
  const { user, updateProfile, isLoading } = useUser();
  const { sessions, currentSession, revokeSession, revokeAllOther } = useSessions();

  return (
    <div>
      <h1>Welcome, {user.firstName}</h1>

      {/* Profile Form */}
      <form onSubmit={(e) => {
        e.preventDefault();
        updateProfile({ firstName: 'New Name' });
      }}>
        <input defaultValue={user.firstName} name="firstName" />
        <button type="submit">Update</button>
      </form>

      {/* Active Sessions */}
      <h2>Your Sessions</h2>
      {sessions.map((session) => (
        <div key={session.id}>
          <span>{session.device} - {session.location}</span>
          {session.id !== currentSession?.id && (
            <button onClick={() => revokeSession(session.id)}>
              Revoke
            </button>
          )}
        </div>
      ))}

      <button onClick={revokeAllOther}>
        Logout All Other Devices
      </button>
    </div>
  );
}
```

### Step 5: MFA Setup

```tsx
// src/pages/MFASetup.tsx
import { useMFA } from '@traf3li/auth-react';

function MFASetupPage() {
  const {
    isEnabled,
    setupMFA,
    verifySetup,
    backupCodes,
    isLoading,
  } = useMFA();

  const [qrCode, setQrCode] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');

  // Step 1: Generate QR Code
  const handleSetup = async () => {
    const result = await setupMFA();
    setQrCode(result.qrCode); // Display this QR code
  };

  // Step 2: Verify and Enable
  const handleVerify = async () => {
    const result = await verifySetup(verificationCode);
    if (result.success) {
      // Show backup codes to user
      console.log('Backup codes:', result.backupCodes);
    }
  };

  if (isEnabled) {
    return <div>MFA is already enabled!</div>;
  }

  return (
    <div>
      {!qrCode ? (
        <button onClick={handleSetup}>Enable MFA</button>
      ) : (
        <div>
          <img src={qrCode} alt="Scan with authenticator app" />
          <input
            placeholder="Enter 6-digit code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
          />
          <button onClick={handleVerify}>Verify & Enable</button>
        </div>
      )}
    </div>
  );
}
```

---

## Next.js Integration

### App Router Setup

#### Step 1: Create Provider

```tsx
// app/providers.tsx
'use client';

import { TrafAuthProvider } from '@traf3li/auth-nextjs';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TrafAuthProvider
      config={{
        apiUrl: process.env.NEXT_PUBLIC_API_URL!,
        autoRefreshToken: true,
      }}
    >
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

#### Step 2: Setup Middleware

```typescript
// middleware.ts
import { createAuthMiddleware } from '@traf3li/auth-nextjs';

export default createAuthMiddleware({
  // Public routes (no auth required)
  publicRoutes: [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password/:token',
  ],

  // Protected routes (auth required)
  protectedRoutes: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/settings/:path*',
  ],

  // Redirect destinations
  loginPage: '/login',
  afterLoginUrl: '/dashboard',

  // Optional: Role-based access
  roleBasedRoutes: {
    '/admin/:path*': ['admin', 'owner'],
    '/lawyer/:path*': ['lawyer', 'partner', 'admin'],
  },
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

#### Step 3: Server Components

```tsx
// app/dashboard/page.tsx
import { getServerUser, requireAuth } from '@traf3li/auth-nextjs/server';

// Option 1: Get user (may be null)
export default async function DashboardPage() {
  const user = await getServerUser();

  if (!user) {
    redirect('/login');
  }

  return <Dashboard user={user} />;
}

// Option 2: Require auth (throws if not authenticated)
export default async function DashboardPage() {
  const user = await requireAuth(); // Automatically redirects if not auth

  return <Dashboard user={user} />;
}
```

#### Step 4: API Route Handlers

```typescript
// app/api/auth/[...trafauth]/route.ts
import { createAuthRouteHandler } from '@traf3li/auth-nextjs/api/route-handlers';

const handlers = createAuthRouteHandler({
  apiUrl: process.env.TRAF3LI_API_URL!,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
});

export const GET = handlers.GET;
export const POST = handlers.POST;
```

### Pages Router Setup

```tsx
// pages/_app.tsx
import { TrafAuthProvider } from '@traf3li/auth-nextjs';

export default function App({ Component, pageProps }) {
  return (
    <TrafAuthProvider config={{ apiUrl: process.env.NEXT_PUBLIC_API_URL }}>
      <Component {...pageProps} />
    </TrafAuthProvider>
  );
}

// pages/api/auth/[...trafauth].ts
import { createPagesAuthHandler } from '@traf3li/auth-nextjs/api/pages-handlers';

export default createPagesAuthHandler({
  apiUrl: process.env.TRAF3LI_API_URL!,
});

// pages/dashboard.tsx
import { withPageAuth } from '@traf3li/auth-nextjs';

function DashboardPage({ user }) {
  return <div>Welcome, {user.email}</div>;
}

export const getServerSideProps = withPageAuth({
  requireAuth: true,
  redirectTo: '/login',
});

export default DashboardPage;
```

---

## Google One Tap

### Backend Configuration

```bash
# Add to your .env file
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### Frontend Implementation

#### Option 1: Using Component

```tsx
import { GoogleOneTap } from '@traf3li/auth-nextjs';
// OR
import { GoogleOneTapButton } from '@traf3li/auth-react-ui';

function LoginPage() {
  const handleSuccess = (user) => {
    console.log('Logged in:', user);
    router.push('/dashboard');
  };

  return (
    <div>
      <GoogleOneTap
        clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
        onSuccess={handleSuccess}
        onError={(error) => console.error(error)}
        autoSelect={true}
        context="signin"
      />

      {/* Rest of your login form */}
    </div>
  );
}
```

#### Option 2: Using Hook

```tsx
import { useAuth } from '@traf3li/auth-react';

function LoginPage() {
  const { handleGoogleOneTap } = useAuth();

  useEffect(() => {
    // Load Google One Tap script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            const result = await handleGoogleOneTap(response.credential);
            router.push('/dashboard');
          } catch (error) {
            console.error('One Tap failed:', error);
          }
        },
      });

      google.accounts.id.prompt();
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return <div>Loading...</div>;
}
```

#### Option 3: Vanilla JavaScript

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>

<div id="g_id_onload"
     data-client_id="YOUR_GOOGLE_CLIENT_ID"
     data-callback="handleCredentialResponse"
     data-auto_select="true">
</div>

<script>
async function handleCredentialResponse(response) {
  const res = await fetch('/api/auth/google/one-tap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      credential: response.credential,
      firmId: 'optional-firm-id'
    }),
    credentials: 'include',
  });

  const data = await res.json();

  if (data.error) {
    console.error('Login failed:', data.message);
  } else {
    console.log('Logged in:', data.user);
    window.location.href = '/dashboard';
  }
}
</script>
```

---

## Domain-Based SSO

### How It Works

1. User enters email on login page
2. Frontend calls `/api/auth/sso/detect` with email
3. Backend checks if email domain has configured SSO
4. If found, returns SSO provider info and auth URL
5. Frontend redirects to SSO provider or shows SSO button

### Implementation

```tsx
import { useAuth, useOAuth } from '@traf3li/auth-react';
import { useState } from 'react';

function SmartLoginForm() {
  const { login } = useAuth();
  const { detectSSO } = useOAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ssoProvider, setSsoProvider] = useState(null);
  const [showPasswordField, setShowPasswordField] = useState(false);

  // Check for SSO when email is entered
  const handleEmailBlur = async () => {
    if (!email.includes('@')) return;

    try {
      const result = await detectSSO(email);

      if (result.detected) {
        setSsoProvider(result.provider);

        if (result.provider.autoRedirect) {
          // Auto-redirect to SSO
          window.location.href = result.authUrl;
        }
      } else {
        // No SSO, show password field
        setShowPasswordField(true);
      }
    } catch (error) {
      // SSO detection failed, show password field
      setShowPasswordField(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (ssoProvider) {
      // Redirect to SSO
      window.location.href = ssoProvider.authUrl;
    } else {
      // Regular login
      await login({ email, password });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={handleEmailBlur}
        placeholder="Enter your email"
      />

      {ssoProvider && (
        <div className="sso-detected">
          <p>Sign in with your {ssoProvider.name} account</p>
          <button type="submit">
            Continue with {ssoProvider.name}
          </button>
        </div>
      )}

      {showPasswordField && !ssoProvider && (
        <>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />
          <button type="submit">Sign In</button>
        </>
      )}
    </form>
  );
}
```

### API Endpoint Details

```typescript
// POST /api/auth/sso/detect
const response = await fetch('/api/auth/sso/detect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'john@biglaw.com',
    returnUrl: '/dashboard', // Where to redirect after SSO
  }),
});

// Response when SSO is configured
{
  "detected": true,
  "provider": {
    "id": "provider-id",
    "name": "BigLaw Okta",
    "type": "saml",
    "autoRedirect": true,
    "domainVerified": true
  },
  "authUrl": "https://biglaw.okta.com/oauth2/v1/authorize?...",
  "message": "Sign in with your BigLaw account"
}

// Response when no SSO
{
  "detected": false,
  "message": "No SSO provider configured for this domain"
}
```

---

## Pre-built Components

### Available Components

| Component | Description |
|-----------|-------------|
| `LoginForm` | Complete login form with OAuth |
| `SignupForm` | Registration form with validation |
| `ForgotPasswordForm` | Password reset request |
| `ResetPasswordForm` | Set new password |
| `MFASetup` | Enable MFA with QR code |
| `MFAVerify` | Enter MFA code |
| `SessionManager` | View/revoke sessions |
| `UserProfile` | Edit user profile |
| `PasswordChangeForm` | Change password |
| `SocialLoginButtons` | OAuth provider buttons |
| `GoogleOneTapButton` | Google One Tap |
| `OTPInput` | 6-digit code input |
| `PasswordStrength` | Password meter |

### Theme Configuration

```tsx
import { ThemeProvider, defaultTheme, darkTheme } from '@traf3li/auth-react-ui';

// Use default theme
<ThemeProvider theme="light">
  <App />
</ThemeProvider>

// Use dark theme
<ThemeProvider theme="dark">
  <App />
</ThemeProvider>

// Custom theme
const customTheme = {
  ...defaultTheme,
  colors: {
    ...defaultTheme.colors,
    primary: '#your-brand-color',
    primaryHover: '#your-brand-hover',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
  },
};

<ThemeProvider theme={customTheme}>
  <App />
</ThemeProvider>
```

### RTL Support (Arabic)

```tsx
<ThemeProvider theme="light" direction="rtl">
  <LoginForm />
</ThemeProvider>
```

### Component Customization

```tsx
<LoginForm
  // Event handlers
  onSuccess={(user) => router.push('/dashboard')}
  onError={(error) => toast.error(error.message)}
  onMFARequired={() => router.push('/mfa-verify')}

  // Features
  showSocialLogins={true}
  providers={['google', 'microsoft', 'apple']}
  showMagicLink={true}
  showRememberMe={true}
  showForgotPassword={true}

  // Styling
  className="my-login-form"
  styles={{
    container: { maxWidth: '400px' },
    input: { borderRadius: '8px' },
    button: { backgroundColor: '#your-color' },
  }}

  // Content
  title="Welcome Back"
  subtitle="Sign in to continue"
  submitText="Sign In"
/>
```

---

## Complete Examples

### Example 1: Full Authentication Flow (React)

```tsx
// src/App.tsx
import { TrafAuthProvider, AuthGuard } from '@traf3li/auth-react';
import { ThemeProvider } from '@traf3li/auth-react-ui';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <TrafAuthProvider apiUrl={process.env.REACT_APP_API_URL}>
      <ThemeProvider theme="light">
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route
              path="/dashboard/*"
              element={
                <AuthGuard requireAuth redirectTo="/login">
                  <DashboardRoutes />
                </AuthGuard>
              }
            />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </TrafAuthProvider>
  );
}

// src/pages/Login.tsx
import { LoginForm } from '@traf3li/auth-react-ui';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="auth-page">
      <LoginForm
        onSuccess={() => navigate('/dashboard')}
        onMFARequired={() => navigate('/mfa-verify')}
        showSocialLogins={true}
        providers={['google', 'microsoft']}
        showMagicLink={true}
      />
    </div>
  );
}
```

### Example 2: Next.js App Router

```tsx
// app/layout.tsx
import { TrafAuthProvider } from '@traf3li/auth-nextjs';
import { ThemeProvider } from '@traf3li/auth-react-ui';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <TrafAuthProvider config={{ apiUrl: process.env.NEXT_PUBLIC_API_URL }}>
          <ThemeProvider>{children}</ThemeProvider>
        </TrafAuthProvider>
      </body>
    </html>
  );
}

// middleware.ts
import { createAuthMiddleware } from '@traf3li/auth-nextjs';

export default createAuthMiddleware({
  publicRoutes: ['/login', '/register', '/'],
  protectedRoutes: ['/dashboard/:path*'],
  loginPage: '/login',
});

// app/login/page.tsx
'use client';
import { LoginForm, GoogleOneTap } from '@traf3li/auth-react-ui';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  return (
    <>
      <GoogleOneTap
        clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
        onSuccess={() => router.push('/dashboard')}
      />
      <LoginForm
        onSuccess={() => router.push('/dashboard')}
        showSocialLogins={true}
      />
    </>
  );
}

// app/dashboard/page.tsx
import { requireAuth } from '@traf3li/auth-nextjs/server';

export default async function DashboardPage() {
  const user = await requireAuth();

  return (
    <div>
      <h1>Welcome, {user.firstName}!</h1>
      <p>Email: {user.email}</p>
    </div>
  );
}
```

---

## API Reference

### Hooks

#### useAuth()

```typescript
const {
  user: User | null,
  isAuthenticated: boolean,
  isLoading: boolean,
  error: Error | null,

  // Methods
  login: (credentials: { email: string; password: string }) => Promise<AuthResult>,
  register: (data: RegisterData) => Promise<AuthResult>,
  logout: () => Promise<void>,
  logoutAll: () => Promise<void>,
  loginWithGoogle: () => void,
  loginWithMicrosoft: () => void,
  loginWithProvider: (provider: string) => void,
  handleGoogleOneTap: (credential: string) => Promise<AuthResult>,
  refreshToken: () => Promise<void>,
} = useAuth();
```

#### useUser()

```typescript
const {
  user: User | null,
  isLoading: boolean,
  error: Error | null,
  updateProfile: (data: Partial<User>) => Promise<void>,
  refetch: () => Promise<void>,
} = useUser();
```

#### useMFA()

```typescript
const {
  isEnabled: boolean,
  isLoading: boolean,
  setupMFA: () => Promise<{ qrCode: string; secret: string }>,
  verifySetup: (code: string) => Promise<{ backupCodes: string[] }>,
  disable: (code: string) => Promise<void>,
  backupCodes: string[],
  regenerateBackupCodes: () => Promise<string[]>,
} = useMFA();
```

#### useSessions()

```typescript
const {
  sessions: Session[],
  currentSession: Session | null,
  isLoading: boolean,
  revokeSession: (sessionId: string) => Promise<void>,
  revokeAllOther: () => Promise<void>,
  refetch: () => Promise<void>,
} = useSessions();
```

#### usePasswordless()

```typescript
const {
  sendMagicLink: (email: string) => Promise<void>,
  verifyMagicLink: (token: string) => Promise<AuthResult>,
  sendOTP: (email: string) => Promise<void>,
  verifyOTP: (email: string, code: string) => Promise<AuthResult>,
  isLoading: boolean,
  error: Error | null,
} = usePasswordless();
```

#### useOAuth()

```typescript
const {
  loginWithProvider: (provider: string) => void,
  handleCallback: () => Promise<AuthResult>,
  detectSSO: (email: string) => Promise<SSODetectionResult>,
  availableProviders: string[],
  isLoading: boolean,
} = useOAuth();
```

### Types

```typescript
interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isEmailVerified: boolean;
  isMfaEnabled: boolean;
  createdAt: string;
}

interface Session {
  id: string;
  device: string;
  browser: string;
  location: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

interface AuthResult {
  user: User;
  mfaRequired?: boolean;
  isNewUser?: boolean;
}

interface SSODetectionResult {
  detected: boolean;
  provider?: {
    id: string;
    name: string;
    type: 'saml' | 'oidc';
    autoRedirect: boolean;
  };
  authUrl?: string;
}
```

---

## Environment Variables

### Frontend (.env.local)

```bash
# Required
NEXT_PUBLIC_API_URL=https://api.traf3li.com
# OR for React
REACT_APP_API_URL=https://api.traf3li.com

# Optional: Google One Tap
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Optional: Multi-tenancy
NEXT_PUBLIC_FIRM_ID=your-firm-id
```

### Backend (.env)

```bash
# Required for Google One Tap
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Required for OAuth
GOOGLE_CLIENT_SECRET=your-google-secret
MICROSOFT_CLIENT_ID=your-ms-client-id
MICROSOFT_CLIENT_SECRET=your-ms-secret
```

---

## Troubleshooting

### Common Issues

#### 1. "Unauthorized" errors after login

```typescript
// Make sure credentials are included in fetch
fetch('/api/...', {
  credentials: 'include', // Required for cookies
});
```

#### 2. Google One Tap not showing

- Check that the client ID is correct
- Check that the origin is added in Google Console
- Check browser console for errors

#### 3. SSO redirect not working

- Make sure the returnUrl is whitelisted in backend
- Check that the SSO provider is properly configured
- Verify domain ownership in admin panel

#### 4. Token refresh failing

```typescript
// Enable autoRefreshToken in provider
<TrafAuthProvider
  apiUrl="..."
  autoRefreshToken={true} // Make sure this is true
>
```

---

*Last updated: December 25, 2025*
