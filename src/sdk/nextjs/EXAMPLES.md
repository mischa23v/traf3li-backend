# Traf3li Auth Next.js SDK - Examples

Comprehensive examples for using the Traf3li Auth Next.js SDK.

## Table of Contents

- [App Router Examples](#app-router-examples)
- [Pages Router Examples](#pages-router-examples)
- [Middleware Examples](#middleware-examples)
- [Google OAuth Examples](#google-oauth-examples)
- [Edge Runtime Examples](#edge-runtime-examples)

---

## App Router Examples

### 1. Basic Setup

#### app/layout.tsx
```tsx
import { TrafAuthProvider } from '@traf3li/auth-nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TrafAuthProvider
          config={{
            apiUrl: process.env.NEXT_PUBLIC_TRAF3LI_API_URL!,
            debug: process.env.NODE_ENV === 'development',
            tokenRefresh: {
              enabled: true,
              refreshBeforeExpiry: 60,
            }
          }}
        >
          {children}
        </TrafAuthProvider>
      </body>
    </html>
  );
}
```

#### app/api/auth/[...trafauth]/route.ts
```typescript
import { createAuthRouteHandler } from '@traf3li/auth-nextjs/api/route-handlers';

const handlers = createAuthRouteHandler({
  apiUrl: process.env.NEXT_PUBLIC_TRAF3LI_API_URL!,

  onLogin: async (user) => {
    console.log('User logged in:', user.email);
    // Track login event, send analytics, etc.
  },

  onLogout: async (userId) => {
    console.log('User logged out:', userId);
    // Clean up user data, revoke sessions, etc.
  },

  onRegister: async (user) => {
    console.log('New user registered:', user.email);
    // Send welcome email, create user profile, etc.
  },
});

export const GET = handlers.GET;
export const POST = handlers.POST;
```

### 2. Protected Dashboard Page

#### app/dashboard/page.tsx
```tsx
import { getServerUser } from '@traf3li/auth-nextjs';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const user = await getServerUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="dashboard">
      <h1>Welcome to Your Dashboard</h1>
      <div className="user-info">
        <img src={user.image || '/default-avatar.png'} alt={user.firstName} />
        <div>
          <h2>{user.firstName} {user.lastName}</h2>
          <p>{user.email}</p>
          <span className="badge">{user.role}</span>
        </div>
      </div>
    </div>
  );
}
```

### 3. Admin-Only Page

#### app/admin/page.tsx
```tsx
import { requireRole } from '@traf3li/auth-nextjs';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  try {
    const user = await requireRole(['admin']);

    return (
      <div>
        <h1>Admin Dashboard</h1>
        <p>Welcome, {user.firstName}. You have admin access.</p>
      </div>
    );
  } catch (error) {
    redirect('/unauthorized');
  }
}
```

### 4. Server Action with Auth

#### app/actions/profile.ts
```typescript
'use server';

import { getServerUser } from '@traf3li/auth-nextjs';
import { revalidatePath } from 'next/cache';

export async function updateProfile(formData: FormData) {
  const user = await getServerUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;

  // Update user profile via API
  const response = await fetch(`${process.env.TRAF3LI_API_URL}/api/users/${user.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${/* access token */}`,
    },
    body: JSON.stringify({ firstName, lastName }),
  });

  if (!response.ok) {
    throw new Error('Failed to update profile');
  }

  revalidatePath('/profile');
  return { success: true };
}
```

### 5. Client Component with Auth

#### app/components/UserMenu.tsx
```tsx
'use client';

import { useAuth } from '@traf3li/auth-nextjs';
import { useRouter } from 'next/navigation';

export function UserMenu() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (loading) {
    return <div className="skeleton">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="auth-buttons">
        <a href="/login">Login</a>
        <a href="/register" className="btn-primary">Sign Up</a>
      </div>
    );
  }

  return (
    <div className="user-menu">
      <button className="avatar">
        <img src={user.image || '/default-avatar.png'} alt={user.firstName} />
      </button>
      <div className="dropdown">
        <a href="/profile">Profile</a>
        <a href="/settings">Settings</a>
        <button onClick={handleSignOut}>Logout</button>
      </div>
    </div>
  );
}
```

### 6. Protected Component

#### app/components/PremiumContent.tsx
```tsx
'use client';

import { Protected } from '@traf3li/auth-nextjs';

export function PremiumContent() {
  return (
    <Protected
      fallback={
        <div className="upgrade-prompt">
          <h3>Premium Content</h3>
          <p>Sign in to access this content</p>
          <a href="/login" className="btn">Sign In</a>
        </div>
      }
      requiredRole={['lawyer', 'admin']}
    >
      <div className="premium-content">
        <h3>Exclusive Legal Resources</h3>
        <p>Access to premium legal documents and templates...</p>
      </div>
    </Protected>
  );
}
```

---

## Pages Router Examples

### 1. Basic Setup

#### pages/_app.tsx
```tsx
import { TrafAuthProvider } from '@traf3li/auth-nextjs';
import type { AppProps } from 'next/app';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <TrafAuthProvider config={{ apiUrl: process.env.NEXT_PUBLIC_TRAF3LI_API_URL! }}>
      <Component {...pageProps} />
    </TrafAuthProvider>
  );
}
```

#### pages/api/auth/[...trafauth].ts
```typescript
import { createPagesAuthHandler } from '@traf3li/auth-nextjs/api/pages-handlers';

export default createPagesAuthHandler({
  apiUrl: process.env.NEXT_PUBLIC_TRAF3LI_API_URL!,
});
```

### 2. Server-Side Protected Page

#### pages/dashboard.tsx
```tsx
import { GetServerSideProps } from 'next';
import { getAuthFromRequest } from '@traf3li/auth-nextjs';

export default function Dashboard({ user }) {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user.firstName}</p>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const user = await getAuthFromRequest(req);

  if (!user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  return {
    props: { user },
  };
};
```

### 3. API Route with Auth

#### pages/api/profile.ts
```typescript
import { withAuth } from '@traf3li/auth-nextjs';

export default withAuth(async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // req.user is available because of withAuth
  return res.json({
    user: req.user,
    message: 'Profile data',
  });
});
```

---

## Middleware Examples

### 1. Basic Auth Middleware

#### middleware.ts
```typescript
import { createAuthMiddleware } from '@traf3li/auth-nextjs/middleware';

export default createAuthMiddleware({
  publicRoutes: ['/', '/login', '/register', '/about'],
  protectedRoutes: ['/dashboard/:path*', '/profile/:path*'],
  loginPage: '/login',
  afterLoginUrl: '/dashboard',
  debug: process.env.NODE_ENV === 'development',
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
```

### 2. Role-Based Access Control

#### middleware.ts
```typescript
import { createAuthMiddleware } from '@traf3li/auth-nextjs/middleware';

export default createAuthMiddleware({
  publicRoutes: ['/', '/login', '/register'],
  protectedRoutes: ['/dashboard/:path*'],
  loginPage: '/login',
  afterLoginUrl: '/dashboard',

  // Role-based access control
  roleAccess: {
    '/admin/:path*': ['admin'],
    '/lawyer/:path*': ['lawyer', 'admin'],
    '/client/:path*': ['client', 'lawyer', 'admin'],
  },

  // Custom handlers
  onAuthRequired: (req) => {
    const url = new URL('/login', req.url);
    url.searchParams.set('returnUrl', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  },

  onAuthSuccess: async (req, user) => {
    // Log successful auth, track analytics, etc.
    console.log(`User ${user.email} accessed ${req.nextUrl.pathname}`);
  },
});
```

### 3. Multiple Middlewares

#### middleware.ts
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAuthMiddleware } from '@traf3li/auth-nextjs/middleware';

const authMiddleware = createAuthMiddleware({
  publicRoutes: ['/login', '/register'],
  protectedRoutes: ['/dashboard/:path*'],
});

export default function middleware(request: NextRequest) {
  // Run auth middleware
  const authResponse = authMiddleware(request);

  if (authResponse) {
    return authResponse;
  }

  // Add custom headers
  const response = NextResponse.next();
  response.headers.set('x-custom-header', 'value');

  return response;
}
```

---

## Google OAuth Examples

### 1. Google One Tap

#### app/login/page.tsx
```tsx
'use client';

import { GoogleOneTap } from '@traf3li/auth-nextjs/components/GoogleOneTap';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const handleGoogleSuccess = async (credential: string) => {
    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });

      if (response.ok) {
        router.push('/dashboard');
      } else {
        const error = await response.json();
        alert(`Login failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Google login error:', error);
    }
  };

  return (
    <div className="login-page">
      <h1>Login to Traf3li</h1>

      <GoogleOneTap
        clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}
        onSuccess={handleGoogleSuccess}
        onError={(error) => console.error('Google One Tap error:', error)}
        autoSelect={true}
        context="signin"
      />

      <form>
        {/* Traditional email/password login */}
      </form>
    </div>
  );
}
```

### 2. Google Sign In Button

#### app/components/GoogleButton.tsx
```tsx
'use client';

import { GoogleSignInButton } from '@traf3li/auth-nextjs/components/GoogleOneTap';

export function GoogleAuthButton() {
  const handleSuccess = async (credential: string) => {
    const response = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });

    if (response.ok) {
      window.location.href = '/dashboard';
    }
  };

  return (
    <GoogleSignInButton
      clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}
      onSuccess={handleSuccess}
      theme="filled_blue"
      size="large"
      text="continue_with"
      shape="pill"
    />
  );
}
```

---

## Edge Runtime Examples

### 1. Edge API Route

#### app/api/user/route.ts
```typescript
import { withEdgeAuth } from '@traf3li/auth-nextjs/edge';

export const runtime = 'edge';

export const GET = withEdgeAuth(async (request, user) => {
  return new Response(
    JSON.stringify({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
});
```

### 2. Edge Route with Rate Limiting

#### app/api/search/route.ts
```typescript
import { createEdgeRateLimiter, withEdgeAuth } from '@traf3li/auth-nextjs/edge';

export const runtime = 'edge';

const limiter = createEdgeRateLimiter({
  maxRequests: 20,
  windowMs: 60000, // 1 minute
});

export const GET = withEdgeAuth(async (request, user) => {
  const identifier = `${user.id}-search`;

  if (!limiter.check(identifier)) {
    return new Response('Too many requests', { status: 429 });
  }

  // Handle search logic
  return new Response(JSON.stringify({ results: [] }));
});
```

### 3. Edge Route with CORS

#### app/api/public/route.ts
```typescript
import { withCORS, handlePreflight } from '@traf3li/auth-nextjs/edge';

export const runtime = 'edge';

export async function OPTIONS() {
  return handlePreflight({
    origin: ['https://example.com', 'https://app.example.com'],
    methods: ['GET', 'POST'],
  });
}

export async function GET(request: Request) {
  const response = new Response(JSON.stringify({ data: 'Hello' }), {
    headers: { 'Content-Type': 'application/json' },
  });

  return withCORS(response, {
    origin: ['https://example.com'],
  });
}
```

---

## Advanced Patterns

### 1. Custom Auth Provider with Persistence

```tsx
'use client';

import { TrafAuthProvider } from '@traf3li/auth-nextjs';
import { useEffect, useState } from 'react';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [initialSession, setInitialSession] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load session from localStorage for faster initial load
    const savedSession = localStorage.getItem('traf3li_session');
    if (savedSession) {
      setInitialSession(JSON.parse(savedSession));
    }
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return (
    <TrafAuthProvider
      config={{
        apiUrl: process.env.NEXT_PUBLIC_TRAF3LI_API_URL!,
        tokenRefresh: { enabled: true },
      }}
      initialSession={initialSession}
    >
      {children}
    </TrafAuthProvider>
  );
}
```

### 2. Session Monitoring

```tsx
'use client';

import { useAuth } from '@traf3li/auth-nextjs';
import { useEffect } from 'react';

export function SessionMonitor() {
  const { session, refreshSession } = useAuth();

  useEffect(() => {
    if (!session) return;

    const checkSession = () => {
      const expiresIn = session.expiresAt - Date.now();

      // Refresh if expiring in less than 5 minutes
      if (expiresIn < 5 * 60 * 1000) {
        refreshSession();
      }
    };

    // Check every minute
    const interval = setInterval(checkSession, 60 * 1000);
    return () => clearInterval(interval);
  }, [session, refreshSession]);

  return null;
}
```

This examples file provides comprehensive real-world usage patterns for the Traf3li Auth Next.js SDK.
