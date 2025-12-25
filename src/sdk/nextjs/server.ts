/**
 * Server-Side Utilities for Traf3li Auth Next.js SDK
 *
 * Provides utilities for server-side authentication in Next.js
 * - Server Components (App Router)
 * - API Routes (Pages Router)
 * - Server Actions
 */

import { cookies } from 'next/headers';
import type { NextApiRequest, NextApiResponse } from 'next';
import type {
  User,
  Session,
  TrafAuthConfig,
  NextApiHandler,
  AuthenticatedNextApiHandler,
  UnauthorizedError,
  ServerAuthResult,
} from './types';
import {
  getAuthCookies,
  getAccessToken,
  decodeToken,
  isTokenExpired,
  COOKIE_NAMES,
} from './cookies';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

let globalConfig: TrafAuthConfig | null = null;

/**
 * Configure the server-side auth client
 * Call this once in your app initialization
 */
export function configureAuth(config: TrafAuthConfig): void {
  globalConfig = config;
}

/**
 * Get the current configuration
 */
function getConfig(): TrafAuthConfig {
  if (!globalConfig) {
    // Try to get from environment variables as fallback
    const apiUrl = process.env.NEXT_PUBLIC_TRAF3LI_API_URL || process.env.TRAF3LI_API_URL;
    if (!apiUrl) {
      throw new Error(
        'Traf3li Auth not configured. Call configureAuth() or set NEXT_PUBLIC_TRAF3LI_API_URL environment variable.'
      );
    }
    globalConfig = { apiUrl };
  }
  return globalConfig;
}

// ═══════════════════════════════════════════════════════════════
// SERVER COMPONENT UTILITIES (App Router)
// ═══════════════════════════════════════════════════════════════

/**
 * Get the current user from server-side cookies
 * Use in Server Components, Server Actions, or Route Handlers
 *
 * @example
 * import { getServerUser } from '@traf3li/auth-nextjs/server';
 *
 * export default async function DashboardPage() {
 *   const user = await getServerUser();
 *   if (!user) redirect('/login');
 *   return <div>Welcome {user.firstName}</div>;
 * }
 */
export async function getServerUser(): Promise<User | null> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return null;
    }

    // Check if token is expired
    if (isTokenExpired(accessToken)) {
      return null;
    }

    // Decode token to get user info
    const decoded = decodeToken(accessToken);
    if (!decoded) {
      return null;
    }

    // Verify token with backend and get full user info
    const config = getConfig();
    const response = await fetch(`${config.apiUrl}/api/auth/status`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store', // Don't cache auth checks
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.user || null;
  } catch (error) {
    if (globalConfig?.debug) {
      console.error('[TrafAuth] getServerUser error:', error);
    }
    return null;
  }
}

/**
 * Get the current session from server-side cookies
 * Use in Server Components, Server Actions, or Route Handlers
 *
 * @example
 * import { getServerSession } from '@traf3li/auth-nextjs/server';
 *
 * export default async function Page() {
 *   const session = await getServerSession();
 *   return <div>{session ? 'Logged in' : 'Not logged in'}</div>;
 * }
 */
export async function getServerSession(): Promise<Session | null> {
  try {
    const tokens = await getAuthCookies();
    if (!tokens) {
      return null;
    }

    const user = await getServerUser();
    if (!user) {
      return null;
    }

    const decoded = decodeToken(tokens.accessToken);
    const expiresAt = decoded?.exp ? decoded.exp * 1000 : Date.now() + 15 * 60 * 1000;

    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt,
    };
  } catch (error) {
    if (globalConfig?.debug) {
      console.error('[TrafAuth] getServerSession error:', error);
    }
    return null;
  }
}

/**
 * Require authentication in Server Components
 * Throws UnauthorizedError if user is not authenticated
 *
 * @example
 * import { requireAuth } from '@traf3li/auth-nextjs/server';
 *
 * export default async function ProtectedPage() {
 *   const user = await requireAuth();
 *   return <div>Welcome {user.firstName}</div>;
 * }
 */
export async function requireAuth(): Promise<User> {
  const user = await getServerUser();
  if (!user) {
    throw new Error('Unauthorized: Authentication required');
  }
  return user;
}

/**
 * Check if user has specific role
 *
 * @example
 * const isAdmin = await hasRole(['admin']);
 */
export async function hasRole(roles: string[]): Promise<boolean> {
  const user = await getServerUser();
  if (!user) {
    return false;
  }
  return roles.includes(user.role);
}

/**
 * Require specific role(s)
 * Throws error if user doesn't have required role
 */
export async function requireRole(roles: string[]): Promise<User> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    throw new Error(`Forbidden: Required role(s): ${roles.join(', ')}`);
  }
  return user;
}

// ═══════════════════════════════════════════════════════════════
// API ROUTE UTILITIES (Pages Router)
// ═══════════════════════════════════════════════════════════════

/**
 * Get authenticated user from API request
 * Use in Pages Router API routes
 *
 * @example
 * import { getAuthFromRequest } from '@traf3li/auth-nextjs/server';
 *
 * export default async function handler(req, res) {
 *   const user = await getAuthFromRequest(req);
 *   if (!user) return res.status(401).json({ error: 'Unauthorized' });
 *   res.json({ user });
 * }
 */
export async function getAuthFromRequest(req: NextApiRequest): Promise<User | null> {
  try {
    // Try to get token from Authorization header first
    const authHeader = req.headers.authorization;
    let accessToken: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    } else {
      // Fall back to cookies
      accessToken = req.cookies[COOKIE_NAMES.ACCESS_TOKEN] || null;
    }

    if (!accessToken) {
      return null;
    }

    // Check if token is expired
    if (isTokenExpired(accessToken)) {
      return null;
    }

    // Verify token with backend
    const config = getConfig();
    const response = await fetch(`${config.apiUrl}/api/auth/status`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.user || null;
  } catch (error) {
    if (globalConfig?.debug) {
      console.error('[TrafAuth] getAuthFromRequest error:', error);
    }
    return null;
  }
}

/**
 * Higher-order function to protect API routes
 * Wraps your API handler with authentication check
 *
 * @example
 * import { withAuth } from '@traf3li/auth-nextjs/server';
 *
 * export default withAuth(async (req, res) => {
 *   // req.user is available here
 *   res.json({ user: req.user });
 * });
 */
export function withAuth(handler: AuthenticatedNextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const user = await getAuthFromRequest(req);

      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Attach user to request
      (req as any).user = user;

      // Call the original handler
      return handler(req as any, res);
    } catch (error: any) {
      if (globalConfig?.debug) {
        console.error('[TrafAuth] withAuth error:', error);
      }

      return res.status(500).json({
        error: 'Internal Server Error',
        message: error.message || 'An error occurred',
      });
    }
  };
}

/**
 * Higher-order function to protect API routes with role check
 *
 * @example
 * import { withRole } from '@traf3li/auth-nextjs/server';
 *
 * export default withRole(['admin'], async (req, res) => {
 *   res.json({ message: 'Admin only' });
 * });
 */
export function withRole(
  roles: string[],
  handler: AuthenticatedNextApiHandler
): NextApiHandler {
  return withAuth(async (req: any, res: NextApiResponse) => {
    const user = req.user as User;

    if (!roles.includes(user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Required role(s): ${roles.join(', ')}`,
      });
    }

    return handler(req, res);
  });
}

// ═══════════════════════════════════════════════════════════════
// SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Get session info from request
 */
export async function getSessionFromRequest(req: NextApiRequest): Promise<Session | null> {
  try {
    const accessToken = req.cookies[COOKIE_NAMES.ACCESS_TOKEN];
    const refreshToken = req.cookies[COOKIE_NAMES.REFRESH_TOKEN];

    if (!accessToken || !refreshToken) {
      return null;
    }

    const user = await getAuthFromRequest(req);
    if (!user) {
      return null;
    }

    const decoded = decodeToken(accessToken);
    const expiresAt = decoded?.exp ? decoded.exp * 1000 : Date.now() + 15 * 60 * 1000;

    return {
      user,
      accessToken,
      refreshToken,
      expiresAt,
    };
  } catch (error) {
    if (globalConfig?.debug) {
      console.error('[TrafAuth] getSessionFromRequest error:', error);
    }
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// TOKEN REFRESH
// ═══════════════════════════════════════════════════════════════

/**
 * Refresh access token using refresh token
 * This should be called when access token is expired
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: number;
} | null> {
  try {
    const config = getConfig();
    const response = await fetch(`${config.apiUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      accessToken: data.accessToken,
      expiresAt: data.expiresAt || Date.now() + 15 * 60 * 1000,
    };
  } catch (error) {
    if (globalConfig?.debug) {
      console.error('[TrafAuth] refreshAccessToken error:', error);
    }
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Verify if a token is valid by checking with the backend
 */
export async function verifyToken(token: string): Promise<boolean> {
  try {
    const config = getConfig();
    const response = await fetch(`${config.apiUrl}/api/auth/status`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get complete auth result (user + session + error handling)
 * Useful for loading states in Server Components
 */
export async function getServerAuth(): Promise<ServerAuthResult> {
  try {
    const session = await getServerSession();
    if (!session) {
      return { user: null, session: null };
    }

    return {
      user: session.user,
      session,
    };
  } catch (error: any) {
    return {
      user: null,
      session: null,
      error: error.message || 'Authentication failed',
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export {
  // Re-export cookie utilities for convenience
  getAuthCookies,
  getAccessToken,
  decodeToken,
  isTokenExpired,
} from './cookies';
