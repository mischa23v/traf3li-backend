/**
 * Pages Router API Handlers for Traf3li Auth
 *
 * Provides ready-to-use API handlers for Next.js Pages Router (pages/api directory)
 * Place these in pages/api/auth/[...trafauth].ts
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import type { AuthRouteHandlerConfig, NextApiHandler } from '../types';
import { serializeCookie, COOKIE_NAMES } from '../cookies';

// ═══════════════════════════════════════════════════════════════
// COOKIE HELPERS FOR PAGES ROUTER
// ═══════════════════════════════════════════════════════════════

/**
 * Set auth cookies in Pages Router response
 */
function setAuthCookiesPages(
  res: NextApiResponse,
  tokens: { accessToken: string; refreshToken: string }
) {
  const isProduction = process.env.NODE_ENV === 'production';

  const cookieOptions = {
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
  };

  // Set access token (15 minutes)
  res.setHeader('Set-Cookie', [
    serializeCookie(COOKIE_NAMES.ACCESS_TOKEN, tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60, // 15 minutes
    }),
    serializeCookie(COOKIE_NAMES.REFRESH_TOKEN, tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60, // 7 days
    }),
  ]);
}

/**
 * Clear auth cookies in Pages Router response
 */
function clearAuthCookiesPages(res: NextApiResponse) {
  const cookieOptions = {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 0,
  };

  res.setHeader('Set-Cookie', [
    serializeCookie(COOKIE_NAMES.ACCESS_TOKEN, '', cookieOptions),
    serializeCookie(COOKIE_NAMES.REFRESH_TOKEN, '', cookieOptions),
    serializeCookie(COOKIE_NAMES.SESSION_ID, '', cookieOptions),
  ]);
}

/**
 * Get auth cookies from Pages Router request
 */
function getAuthCookiesPages(req: NextApiRequest): {
  accessToken: string | null;
  refreshToken: string | null;
} {
  return {
    accessToken: req.cookies[COOKIE_NAMES.ACCESS_TOKEN] || null,
    refreshToken: req.cookies[COOKIE_NAMES.REFRESH_TOKEN] || null,
  };
}

// ═══════════════════════════════════════════════════════════════
// PAGES ROUTER AUTH HANDLER
// ═══════════════════════════════════════════════════════════════

/**
 * Create authentication handler for Pages Router
 *
 * @example
 * // pages/api/auth/[...trafauth].ts
 * import { createPagesAuthHandler } from '@traf3li/auth-nextjs/api/pages-handlers';
 *
 * export default createPagesAuthHandler({
 *   apiUrl: process.env.NEXT_PUBLIC_TRAF3LI_API_URL!,
 * });
 */
export function createPagesAuthHandler(config: AuthRouteHandlerConfig): NextApiHandler {
  const { apiUrl, onLogin, onLogout, onRegister, debug = false } = config;

  if (!apiUrl) {
    throw new Error('apiUrl is required in createPagesAuthHandler config');
  }

  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const { trafauth } = req.query;
      const action = Array.isArray(trafauth) ? trafauth[0] : trafauth;

      if (debug) {
        console.log(`[TrafAuth Pages] ${req.method} action:`, action);
      }

      // GET requests
      if (req.method === 'GET') {
        // Get session
        if (action === 'session') {
          const tokens = getAuthCookiesPages(req);

          if (!tokens.accessToken) {
            return res.status(200).json({ session: null });
          }

          // Verify with backend
          const response = await fetch(`${apiUrl}/api/auth/status`, {
            headers: {
              Authorization: `Bearer ${tokens.accessToken}`,
            },
          });

          if (!response.ok) {
            clearAuthCookiesPages(res);
            return res.status(200).json({ session: null });
          }

          const data = await response.json();

          return res.status(200).json({
            session: {
              user: data.user,
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              expiresAt: Date.now() + 15 * 60 * 1000,
            },
          });
        }

        // Get user
        if (action === 'user') {
          const tokens = getAuthCookiesPages(req);

          if (!tokens.accessToken) {
            return res.status(200).json({ user: null });
          }

          const response = await fetch(`${apiUrl}/api/auth/status`, {
            headers: {
              Authorization: `Bearer ${tokens.accessToken}`,
            },
          });

          if (!response.ok) {
            return res.status(200).json({ user: null });
          }

          const data = await response.json();
          return res.status(200).json({ user: data.user });
        }

        return res.status(400).json({ error: 'Unknown action' });
      }

      // POST requests
      if (req.method === 'POST') {
        // Login
        if (action === 'login') {
          const response = await fetch(`${apiUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
          });

          const data = await response.json();

          if (!response.ok) {
            return res.status(response.status).json(data);
          }

          // Set cookies
          if (data.accessToken && data.refreshToken) {
            setAuthCookiesPages(res, {
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
            });
          }

          // Call onLogin callback
          if (onLogin && data.user) {
            await onLogin(data.user);
          }

          return res.status(200).json(data);
        }

        // Register
        if (action === 'register') {
          const response = await fetch(`${apiUrl}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
          });

          const data = await response.json();

          if (!response.ok) {
            return res.status(response.status).json(data);
          }

          // Set cookies
          if (data.accessToken && data.refreshToken) {
            setAuthCookiesPages(res, {
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
            });
          }

          // Call onRegister callback
          if (onRegister && data.user) {
            await onRegister(data.user);
          }

          return res.status(200).json(data);
        }

        // Logout
        if (action === 'logout') {
          const tokens = getAuthCookiesPages(req);

          if (tokens.accessToken) {
            // Call backend logout
            try {
              await fetch(`${apiUrl}/api/auth/logout`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${tokens.accessToken}`,
                },
              });
            } catch (err) {
              if (debug) {
                console.error('[TrafAuth Pages] Backend logout error:', err);
              }
            }

            // Call onLogout callback
            if (onLogout) {
              try {
                await onLogout(tokens.accessToken);
              } catch (err) {
                if (debug) {
                  console.error('[TrafAuth Pages] onLogout callback error:', err);
                }
              }
            }
          }

          // Clear cookies
          clearAuthCookiesPages(res);

          return res.status(200).json({ success: true, message: 'Logged out' });
        }

        // Refresh token
        if (action === 'refresh') {
          const tokens = getAuthCookiesPages(req);

          if (!tokens.refreshToken) {
            return res.status(401).json({ error: 'No refresh token' });
          }

          const response = await fetch(`${apiUrl}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: tokens.refreshToken }),
          });

          const data = await response.json();

          if (!response.ok) {
            clearAuthCookiesPages(res);
            return res.status(response.status).json(data);
          }

          // Update access token
          if (data.accessToken) {
            setAuthCookiesPages(res, {
              accessToken: data.accessToken,
              refreshToken: tokens.refreshToken,
            });
          }

          return res.status(200).json(data);
        }

        // Google OAuth
        if (action === 'google') {
          const { credential } = req.body;

          if (!credential) {
            return res.status(400).json({ error: 'Missing credential' });
          }

          const response = await fetch(`${apiUrl}/api/oauth/google/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential }),
          });

          const data = await response.json();

          if (!response.ok) {
            return res.status(response.status).json(data);
          }

          // Set cookies
          if (data.accessToken && data.refreshToken) {
            setAuthCookiesPages(res, {
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
            });
          }

          return res.status(200).json(data);
        }

        return res.status(400).json({ error: 'Unknown action' });
      }

      // Method not allowed
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    } catch (error: any) {
      if (debug) {
        console.error('[TrafAuth Pages] Error:', error);
      }

      return res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// INDIVIDUAL PAGE HANDLERS
// ═══════════════════════════════════════════════════════════════

/**
 * Create standalone login handler for Pages Router
 *
 * @example
 * // pages/api/auth/login.ts
 * export default createPagesLoginHandler({ apiUrl: '...' });
 */
export function createPagesLoginHandler(config: AuthRouteHandlerConfig): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const response = await fetch(`${config.apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json(data);
      }

      // Set cookies
      if (data.accessToken && data.refreshToken) {
        setAuthCookiesPages(res, {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
      }

      if (config.onLogin && data.user) {
        await config.onLogin(data.user);
      }

      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({
        error: 'Login failed',
        message: error.message,
      });
    }
  };
}

/**
 * Create standalone logout handler for Pages Router
 *
 * @example
 * // pages/api/auth/logout.ts
 * export default createPagesLogoutHandler({ apiUrl: '...' });
 */
export function createPagesLogoutHandler(config: AuthRouteHandlerConfig): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const tokens = getAuthCookiesPages(req);

      if (tokens.accessToken) {
        await fetch(`${config.apiUrl}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        });

        if (config.onLogout) {
          await config.onLogout(tokens.accessToken);
        }
      }

      clearAuthCookiesPages(res);

      return res.status(200).json({ success: true, message: 'Logged out' });
    } catch (error: any) {
      return res.status(500).json({
        error: 'Logout failed',
        message: error.message,
      });
    }
  };
}

/**
 * Create standalone session handler for Pages Router
 *
 * @example
 * // pages/api/auth/session.ts
 * export default createPagesSessionHandler({ apiUrl: '...' });
 */
export function createPagesSessionHandler(config: AuthRouteHandlerConfig): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const tokens = getAuthCookiesPages(req);

      if (!tokens.accessToken) {
        return res.status(200).json({ session: null });
      }

      const response = await fetch(`${config.apiUrl}/api/auth/status`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });

      if (!response.ok) {
        clearAuthCookiesPages(res);
        return res.status(200).json({ session: null });
      }

      const data = await response.json();

      return res.status(200).json({
        session: {
          user: data.user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: Date.now() + 15 * 60 * 1000,
        },
      });
    } catch (error: any) {
      return res.status(200).json({ session: null });
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export type { AuthRouteHandlerConfig, NextApiHandler } from '../types';
