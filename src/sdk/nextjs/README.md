# @traf3li/auth-nextjs

Official Next.js SDK for Traf3li Authentication. Provides seamless authentication for Next.js applications with support for both App Router and Pages Router.

## Features

- ✅ **App Router Support** - Server Components, Route Handlers, Server Actions
- ✅ **Pages Router Support** - API Routes, getServerSideProps, getStaticProps
- ✅ **Edge Runtime Compatible** - Works in middleware and edge functions
- ✅ **TypeScript First** - Full type safety
- ✅ **Cookie-based Sessions** - Secure HTTP-only cookies
- ✅ **Automatic Token Refresh** - Seamless token rotation
- ✅ **Google One Tap** - Built-in Google authentication
- ✅ **Route Protection** - Middleware for auth checks
- ✅ **SSR Ready** - Server-side rendering support
- ✅ **Production Ready** - Battle-tested and secure

## Installation

```bash
npm install @traf3li/auth-nextjs
# or
yarn add @traf3li/auth-nextjs
# or
pnpm add @traf3li/auth-nextjs
```

## Quick Start

### 1. App Router Setup

#### Configure Provider (app/layout.tsx)

```tsx
import { TrafAuthProvider } from '@traf3li/auth-nextjs';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <TrafAuthProvider config={{ apiUrl: process.env.NEXT_PUBLIC_TRAF3LI_API_URL }}>
          {children}
        </TrafAuthProvider>
      </body>
    </html>
  );
}
```

#### Create Auth Route Handler (app/api/auth/[...trafauth]/route.ts)

```typescript
import { createAuthRouteHandler } from '@traf3li/auth-nextjs/api/route-handlers';

const handlers = createAuthRouteHandler({
  apiUrl: process.env.NEXT_PUBLIC_TRAF3LI_API_URL!,
});

export const GET = handlers.GET;
export const POST = handlers.POST;
```

#### Create Middleware (middleware.ts)

```typescript
import { createAuthMiddleware } from '@traf3li/auth-nextjs/middleware';

export default createAuthMiddleware({
  publicRoutes: ['/login', '/register', '/'],
  protectedRoutes: ['/dashboard/:path*'],
  loginPage: '/login',
  afterLoginUrl: '/dashboard',
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
```

### 2. Pages Router Setup

#### Configure Provider (_app.tsx)

```tsx
import { TrafAuthProvider } from '@traf3li/auth-nextjs';

export default function MyApp({ Component, pageProps }) {
  return (
    <TrafAuthProvider config={{ apiUrl: process.env.NEXT_PUBLIC_TRAF3LI_API_URL }}>
      <Component {...pageProps} />
    </TrafAuthProvider>
  );
}
```

#### Create Auth Handler (pages/api/auth/[...trafauth].ts)

```typescript
import { createPagesAuthHandler } from '@traf3li/auth-nextjs/api/pages-handlers';

export default createPagesAuthHandler({
  apiUrl: process.env.NEXT_PUBLIC_TRAF3LI_API_URL!,
});
```

## Usage Examples

### Server Components (App Router)

```tsx
import { getServerUser } from '@traf3li/auth-nextjs';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const user = await getServerUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div>
      <h1>Welcome, {user.firstName}!</h1>
      <p>Email: {user.email}</p>
    </div>
  );
}
```

### Client Components

```tsx
'use client';

import { useAuth } from '@traf3li/auth-nextjs';

export default function ProfileButton() {
  const { user, signOut, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return <a href="/login">Login</a>;
  }

  return (
    <div>
      <p>Welcome, {user.firstName}</p>
      <button onClick={signOut}>Logout</button>
    </div>
  );
}
```

### Protected Routes with Role Check

```tsx
import { requireRole } from '@traf3li/auth-nextjs';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  try {
    const user = await requireRole(['admin']);
    return <div>Admin Dashboard for {user.email}</div>;
  } catch {
    redirect('/unauthorized');
  }
}
```

### API Routes (App Router)

```typescript
import { NextRequest } from 'next/server';
import { withEdgeAuth } from '@traf3li/auth-nextjs/edge';

export const runtime = 'edge';

export const GET = withEdgeAuth(async (request: NextRequest, user) => {
  return new Response(JSON.stringify({ user }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### API Routes (Pages Router)

```typescript
import { withAuth } from '@traf3li/auth-nextjs';

export default withAuth(async (req, res) => {
  // req.user is available here
  res.json({ user: req.user });
});
```

### Google One Tap

```tsx
'use client';

import { GoogleOneTap } from '@traf3li/auth-nextjs/components/GoogleOneTap';

export default function LoginPage() {
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
    <div>
      <h1>Login</h1>
      <GoogleOneTap
        clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}
        onSuccess={handleSuccess}
        onError={(error) => console.error(error)}
      />
    </div>
  );
}
```

### Server Actions

```typescript
'use server';

import { getServerUser } from '@traf3li/auth-nextjs';
import { revalidatePath } from 'next/cache';

export async function updateProfile(formData: FormData) {
  const user = await getServerUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // Update profile logic

  revalidatePath('/profile');
}
```

## Advanced Features

### Custom Middleware with Role-Based Access

```typescript
import { createAuthMiddleware } from '@traf3li/auth-nextjs/middleware';

export default createAuthMiddleware({
  publicRoutes: ['/login', '/register'],
  protectedRoutes: ['/dashboard/:path*', '/admin/:path*'],
  loginPage: '/login',
  afterLoginUrl: '/dashboard',
  roleAccess: {
    '/admin/:path*': ['admin'],
    '/lawyer/:path*': ['lawyer', 'admin'],
  },
});
```

### Token Refresh

```tsx
'use client';

import { useAuth } from '@traf3li/auth-nextjs';
import { useEffect } from 'react';

export default function App({ children }) {
  const { refreshSession } = useAuth();

  // Auto-refresh every 10 minutes
  useEffect(() => {
    const interval = setInterval(refreshSession, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshSession]);

  return <>{children}</>;
}
```

### Edge Runtime Rate Limiting

```typescript
import { createEdgeRateLimiter } from '@traf3li/auth-nextjs/edge';

const limiter = createEdgeRateLimiter({
  maxRequests: 10,
  windowMs: 60000, // 1 minute
});

export const runtime = 'edge';

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';

  if (!limiter.check(ip)) {
    return new Response('Too many requests', { status: 429 });
  }

  return new Response('OK');
}
```

## Environment Variables

```bash
# Required
NEXT_PUBLIC_TRAF3LI_API_URL=https://api.traf3li.com

# Optional - Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

## API Reference

### Server Functions

- `getServerUser()` - Get current user in Server Components
- `getServerSession()` - Get current session
- `requireAuth()` - Require authentication (throws if not authenticated)
- `hasRole(roles)` - Check if user has specific role
- `requireRole(roles)` - Require specific role (throws if not authorized)

### Client Hooks

- `useAuth()` - Access auth context
- `useUser()` - Get current user
- `useSession()` - Get current session
- `useIsAuthenticated()` - Check if authenticated
- `useAuthLoading()` - Check loading state
- `useAuthError()` - Get auth error

### Middleware

- `createAuthMiddleware(config)` - Create auth middleware
- `requireAuth(options)` - Simple auth check middleware
- `requireRole(roles, options)` - Role-based middleware
- `redirectIfAuthenticated(options)` - Redirect authenticated users

### Components

- `<TrafAuthProvider>` - Auth provider
- `<Protected>` - Protected route wrapper
- `<GoogleOneTap>` - Google One Tap authentication
- `<GoogleSignInButton>` - Google Sign In button

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type { User, Session, TrafAuthConfig } from '@traf3li/auth-nextjs';

const config: TrafAuthConfig = {
  apiUrl: 'https://api.traf3li.com',
  debug: true,
  tokenRefresh: {
    enabled: true,
    refreshBeforeExpiry: 60,
  },
};
```

## License

MIT

## Support

For issues and questions, please visit: https://github.com/traf3li/traf3li-backend
