/**
 * Next.js Middleware for Traf3li Auth
 *
 * Provides authentication middleware for protecting routes in Next.js
 * Runs on Edge Runtime for optimal performance
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { AuthMiddlewareConfig, User } from './types';
import { getEdgeCookies, isTokenExpired, decodeToken, COOKIE_NAMES } from './cookies';

// ═══════════════════════════════════════════════════════════════
// PATH MATCHING UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Convert path pattern to regex
 * Supports wildcards: /path/:param, /path/*, /path/:path*
 */
function pathToRegex(pattern: string): RegExp {
  // Escape special regex characters except * and :
  let regexPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    // Replace :path* with regex for multi-segment wildcard
    .replace(/:(\w+)\*/g, '(?<$1>.*)')
    // Replace :param with regex for single segment
    .replace(/:(\w+)/g, '(?<$1>[^/]+)')
    // Replace * with regex for any characters
    .replace(/\*/g, '.*');

  return new RegExp(`^${regexPattern}$`);
}

/**
 * Check if path matches any of the patterns
 */
function matchesPath(pathname: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    const regex = pathToRegex(pattern);
    return regex.test(pathname);
  });
}

// ═══════════════════════════════════════════════════════════════
// USER VERIFICATION
// ═══════════════════════════════════════════════════════════════

/**
 * Verify user from access token
 * This is a lightweight check using JWT decoding
 * For full verification, use server-side utilities
 */
function getUserFromToken(accessToken: string): User | null {
  try {
    if (isTokenExpired(accessToken)) {
      return null;
    }

    const decoded = decodeToken(accessToken);
    if (!decoded || !decoded.id) {
      return null;
    }

    // Reconstruct user object from token claims
    return {
      id: decoded.id,
      email: decoded.email || '',
      role: decoded.role || 'client',
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      username: decoded.username,
      isAnonymous: decoded.is_anonymous || false,
    };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE FACTORY
// ═══════════════════════════════════════════════════════════════

/**
 * Create authentication middleware for Next.js
 *
 * @example
 * // middleware.ts
 * import { createAuthMiddleware } from '@traf3li/auth-nextjs/middleware';
 *
 * export default createAuthMiddleware({
 *   publicRoutes: ['/login', '/register', '/'],
 *   protectedRoutes: ['/dashboard/:path*'],
 *   loginPage: '/login',
 *   afterLoginUrl: '/dashboard',
 * });
 *
 * export const config = {
 *   matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
 * };
 */
export function createAuthMiddleware(config: AuthMiddlewareConfig = {}) {
  const {
    publicRoutes = ['/login', '/register', '/'],
    protectedRoutes = [],
    loginPage = '/login',
    afterLoginUrl = '/dashboard',
    afterLogoutUrl = '/',
    onAuthRequired,
    onAuthSuccess,
    roleAccess = {},
    debug = false,
  } = config;

  return async function authMiddleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (debug) {
      console.log(`[TrafAuth Middleware] Processing: ${pathname}`);
    }

    // Check if route is public
    const isPublicRoute = matchesPath(pathname, publicRoutes);

    // Check if route requires authentication
    const isProtectedRoute =
      protectedRoutes.length > 0
        ? matchesPath(pathname, protectedRoutes)
        : !isPublicRoute; // If no protected routes specified, protect all non-public routes

    // Get tokens from cookies
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = new Map<string, string>();

    cookieHeader.split(';').forEach(cookie => {
      const [name, ...rest] = cookie.trim().split('=');
      if (name && rest.length > 0) {
        cookies.set(name, decodeURIComponent(rest.join('=')));
      }
    });

    const accessToken = cookies.get(COOKIE_NAMES.ACCESS_TOKEN);
    const user = accessToken ? getUserFromToken(accessToken) : null;

    if (debug) {
      console.log(`[TrafAuth Middleware] User:`, user ? user.email : 'Not authenticated');
      console.log(`[TrafAuth Middleware] Public route:`, isPublicRoute);
      console.log(`[TrafAuth Middleware] Protected route:`, isProtectedRoute);
    }

    // Handle protected routes
    if (isProtectedRoute && !user) {
      if (debug) {
        console.log(`[TrafAuth Middleware] Redirecting to login: ${loginPage}`);
      }

      // Custom handler for auth required
      if (onAuthRequired) {
        return onAuthRequired(request);
      }

      // Default: redirect to login with return URL
      const loginUrl = new URL(loginPage, request.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Handle role-based access control
    if (user && isProtectedRoute) {
      const requiredRoles = roleAccess[pathname];

      if (requiredRoles && requiredRoles.length > 0) {
        if (!requiredRoles.includes(user.role)) {
          if (debug) {
            console.log(`[TrafAuth Middleware] Access denied. Required roles:`, requiredRoles);
          }

          // Redirect to unauthorized page or home
          return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
      }

      // Check wildcard role patterns
      for (const [pattern, roles] of Object.entries(roleAccess)) {
        if (matchesPath(pathname, [pattern]) && !roles.includes(user.role)) {
          if (debug) {
            console.log(`[TrafAuth Middleware] Access denied for pattern: ${pattern}`);
          }
          return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
      }
    }

    // Handle public routes when user is already authenticated
    // Redirect from login/register to dashboard
    if (user && (pathname === loginPage || pathname === '/register')) {
      if (debug) {
        console.log(`[TrafAuth Middleware] User already authenticated, redirecting to: ${afterLoginUrl}`);
      }
      return NextResponse.redirect(new URL(afterLoginUrl, request.url));
    }

    // Call success handler if provided
    if (user && onAuthSuccess) {
      const response = await onAuthSuccess(request, user);
      if (response) {
        return response;
      }
    }

    // Continue to the route
    return NextResponse.next();
  };
}

// ═══════════════════════════════════════════════════════════════
// HELPER MIDDLEWARES
// ═══════════════════════════════════════════════════════════════

/**
 * Middleware to require authentication
 * Simpler alternative to createAuthMiddleware for basic auth checks
 *
 * @example
 * export default requireAuth({ loginPage: '/login' });
 */
export function requireAuth(options: { loginPage?: string } = {}) {
  const loginPage = options.loginPage || '/login';

  return async function middleware(request: NextRequest) {
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = new Map<string, string>();

    cookieHeader.split(';').forEach(cookie => {
      const [name, ...rest] = cookie.trim().split('=');
      if (name && rest.length > 0) {
        cookies.set(name, decodeURIComponent(rest.join('=')));
      }
    });

    const accessToken = cookies.get(COOKIE_NAMES.ACCESS_TOKEN);
    const user = accessToken ? getUserFromToken(accessToken) : null;

    if (!user) {
      const loginUrl = new URL(loginPage, request.url);
      loginUrl.searchParams.set('returnUrl', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  };
}

/**
 * Middleware to require specific role(s)
 *
 * @example
 * export default requireRole(['admin'], { unauthorizedPage: '/forbidden' });
 */
export function requireRole(
  roles: string[],
  options: { unauthorizedPage?: string; loginPage?: string } = {}
) {
  const unauthorizedPage = options.unauthorizedPage || '/unauthorized';
  const loginPage = options.loginPage || '/login';

  return async function middleware(request: NextRequest) {
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = new Map<string, string>();

    cookieHeader.split(';').forEach(cookie => {
      const [name, ...rest] = cookie.trim().split('=');
      if (name && rest.length > 0) {
        cookies.set(name, decodeURIComponent(rest.join('=')));
      }
    });

    const accessToken = cookies.get(COOKIE_NAMES.ACCESS_TOKEN);
    const user = accessToken ? getUserFromToken(accessToken) : null;

    // Not authenticated
    if (!user) {
      const loginUrl = new URL(loginPage, request.url);
      loginUrl.searchParams.set('returnUrl', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Insufficient role
    if (!roles.includes(user.role)) {
      return NextResponse.redirect(new URL(unauthorizedPage, request.url));
    }

    return NextResponse.next();
  };
}

/**
 * Middleware to redirect authenticated users
 * Useful for login/register pages
 *
 * @example
 * export default redirectIfAuthenticated({ destination: '/dashboard' });
 */
export function redirectIfAuthenticated(options: { destination?: string } = {}) {
  const destination = options.destination || '/dashboard';

  return async function middleware(request: NextRequest) {
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = new Map<string, string>();

    cookieHeader.split(';').forEach(cookie => {
      const [name, ...rest] = cookie.trim().split('=');
      if (name && rest.length > 0) {
        cookies.set(name, decodeURIComponent(rest.join('=')));
      }
    });

    const accessToken = cookies.get(COOKIE_NAMES.ACCESS_TOKEN);
    const user = accessToken ? getUserFromToken(accessToken) : null;

    if (user) {
      return NextResponse.redirect(new URL(destination, request.url));
    }

    return NextResponse.next();
  };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export default createAuthMiddleware;
