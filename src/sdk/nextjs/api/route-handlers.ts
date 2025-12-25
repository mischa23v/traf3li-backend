/**
 * App Router API Route Handlers for Traf3li Auth
 *
 * Provides ready-to-use route handlers for Next.js App Router (app directory)
 * Place these in app/api/auth/[...trafauth]/route.ts
 */

import { NextResponse } from 'next/server';
import type { AuthRouteHandlerConfig, AuthRouteHandlers } from '../types';
import { setAuthCookies, clearAuthCookies, getAuthCookies, getAccessToken } from '../cookies';

// ═══════════════════════════════════════════════════════════════
// ROUTE HANDLER FACTORY
// ═══════════════════════════════════════════════════════════════

/**
 * Create authentication route handlers for App Router
 *
 * @example
 * // app/api/auth/[...trafauth]/route.ts
 * import { createAuthRouteHandler } from '@traf3li/auth-nextjs/api/route-handlers';
 *
 * const handlers = createAuthRouteHandler({
 *   apiUrl: process.env.NEXT_PUBLIC_TRAF3LI_API_URL!,
 * });
 *
 * export const GET = handlers.GET;
 * export const POST = handlers.POST;
 */
export function createAuthRouteHandler(config: AuthRouteHandlerConfig): AuthRouteHandlers {
  const { apiUrl, onLogin, onLogout, onRegister, debug = false } = config;

  if (!apiUrl) {
    throw new Error('apiUrl is required in createAuthRouteHandler config');
  }

  // GET handler - handles session, logout, etc.
  const GET = async (request: Request, context?: { params: any }) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const action = pathParts[pathParts.length - 1];

      if (debug) {
        console.log('[TrafAuth Route] GET action:', action);
      }

      // Get session
      if (action === 'session') {
        const tokens = await getAuthCookies();

        if (!tokens) {
          return NextResponse.json({ session: null });
        }

        // Verify session with backend
        const response = await fetch(`${apiUrl}/api/auth/status`, {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        });

        if (!response.ok) {
          await clearAuthCookies();
          return NextResponse.json({ session: null });
        }

        const data = await response.json();

        return NextResponse.json({
          session: {
            user: data.user,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
          },
        });
      }

      // Get user
      if (action === 'user') {
        const accessToken = await getAccessToken();

        if (!accessToken) {
          return NextResponse.json({ user: null });
        }

        const response = await fetch(`${apiUrl}/api/auth/status`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          return NextResponse.json({ user: null });
        }

        const data = await response.json();
        return NextResponse.json({ user: data.user });
      }

      return NextResponse.json(
        { error: 'Unknown action' },
        { status: 400 }
      );
    } catch (error: any) {
      if (debug) {
        console.error('[TrafAuth Route] GET error:', error);
      }

      return NextResponse.json(
        { error: 'Internal server error', message: error.message },
        { status: 500 }
      );
    }
  };

  // POST handler - handles login, register, logout, refresh
  const POST = async (request: Request, context?: { params: any }) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const action = pathParts[pathParts.length - 1];

      if (debug) {
        console.log('[TrafAuth Route] POST action:', action);
      }

      // Login
      if (action === 'login') {
        const body = await request.json();

        const response = await fetch(`${apiUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
          return NextResponse.json(data, { status: response.status });
        }

        // Set cookies if we got tokens
        if (data.accessToken && data.refreshToken) {
          await setAuthCookies({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          });
        }

        // Call onLogin callback
        if (onLogin && data.user) {
          await onLogin(data.user);
        }

        return NextResponse.json(data);
      }

      // Register
      if (action === 'register') {
        const body = await request.json();

        const response = await fetch(`${apiUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
          return NextResponse.json(data, { status: response.status });
        }

        // Set cookies if we got tokens
        if (data.accessToken && data.refreshToken) {
          await setAuthCookies({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          });
        }

        // Call onRegister callback
        if (onRegister && data.user) {
          await onRegister(data.user);
        }

        return NextResponse.json(data);
      }

      // Logout
      if (action === 'logout') {
        const accessToken = await getAccessToken();

        if (accessToken) {
          // Call backend logout
          try {
            await fetch(`${apiUrl}/api/auth/logout`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            });
          } catch (err) {
            // Continue even if backend logout fails
            if (debug) {
              console.error('[TrafAuth Route] Backend logout error:', err);
            }
          }

          // Call onLogout callback
          if (onLogout) {
            try {
              await onLogout(accessToken);
            } catch (err) {
              if (debug) {
                console.error('[TrafAuth Route] onLogout callback error:', err);
              }
            }
          }
        }

        // Clear cookies
        await clearAuthCookies();

        return NextResponse.json({ success: true, message: 'Logged out successfully' });
      }

      // Refresh token
      if (action === 'refresh') {
        const tokens = await getAuthCookies();

        if (!tokens || !tokens.refreshToken) {
          return NextResponse.json(
            { error: 'No refresh token' },
            { status: 401 }
          );
        }

        const response = await fetch(`${apiUrl}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        });

        const data = await response.json();

        if (!response.ok) {
          await clearAuthCookies();
          return NextResponse.json(data, { status: response.status });
        }

        // Update access token cookie
        if (data.accessToken) {
          await setAuthCookies({
            accessToken: data.accessToken,
            refreshToken: tokens.refreshToken, // Keep same refresh token
          });
        }

        return NextResponse.json(data);
      }

      // Google OAuth callback
      if (action === 'google') {
        const body = await request.json();
        const { credential } = body;

        if (!credential) {
          return NextResponse.json(
            { error: 'Missing credential' },
            { status: 400 }
          );
        }

        // Send credential to backend
        const response = await fetch(`${apiUrl}/api/oauth/google/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential }),
        });

        const data = await response.json();

        if (!response.ok) {
          return NextResponse.json(data, { status: response.status });
        }

        // Set cookies
        if (data.accessToken && data.refreshToken) {
          await setAuthCookies({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          });
        }

        return NextResponse.json(data);
      }

      return NextResponse.json(
        { error: 'Unknown action' },
        { status: 400 }
      );
    } catch (error: any) {
      if (debug) {
        console.error('[TrafAuth Route] POST error:', error);
      }

      return NextResponse.json(
        { error: 'Internal server error', message: error.message },
        { status: 500 }
      );
    }
  };

  return { GET, POST };
}

// ═══════════════════════════════════════════════════════════════
// INDIVIDUAL ROUTE HANDLERS
// ═══════════════════════════════════════════════════════════════

/**
 * Create standalone login handler
 *
 * @example
 * // app/api/auth/login/route.ts
 * export const POST = createLoginHandler({ apiUrl: '...' });
 */
export function createLoginHandler(config: AuthRouteHandlerConfig) {
  return async (request: Request) => {
    try {
      const body = await request.json();

      const response = await fetch(`${config.apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(data, { status: response.status });
      }

      // Set cookies
      if (data.accessToken && data.refreshToken) {
        await setAuthCookies({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
      }

      if (config.onLogin && data.user) {
        await config.onLogin(data.user);
      }

      return NextResponse.json(data);
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Login failed', message: error.message },
        { status: 500 }
      );
    }
  };
}

/**
 * Create standalone logout handler
 *
 * @example
 * // app/api/auth/logout/route.ts
 * export const POST = createLogoutHandler({ apiUrl: '...' });
 */
export function createLogoutHandler(config: AuthRouteHandlerConfig) {
  return async (request: Request) => {
    try {
      const accessToken = await getAccessToken();

      if (accessToken) {
        await fetch(`${config.apiUrl}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (config.onLogout) {
          await config.onLogout(accessToken);
        }
      }

      await clearAuthCookies();

      return NextResponse.json({ success: true, message: 'Logged out' });
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Logout failed', message: error.message },
        { status: 500 }
      );
    }
  };
}

/**
 * Create standalone session handler
 *
 * @example
 * // app/api/auth/session/route.ts
 * export const GET = createSessionHandler({ apiUrl: '...' });
 */
export function createSessionHandler(config: AuthRouteHandlerConfig) {
  return async (request: Request) => {
    try {
      const tokens = await getAuthCookies();

      if (!tokens) {
        return NextResponse.json({ session: null });
      }

      const response = await fetch(`${config.apiUrl}/api/auth/status`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });

      if (!response.ok) {
        await clearAuthCookies();
        return NextResponse.json({ session: null });
      }

      const data = await response.json();

      return NextResponse.json({
        session: {
          user: data.user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: Date.now() + 15 * 60 * 1000,
        },
      });
    } catch (error: any) {
      return NextResponse.json({ session: null });
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export type { AuthRouteHandlerConfig, AuthRouteHandlers } from '../types';
