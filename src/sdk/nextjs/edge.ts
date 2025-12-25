/**
 * Edge Runtime Compatible Utilities for Traf3li Auth
 *
 * Provides authentication utilities that work in Next.js Edge Runtime
 * - Edge Middleware
 * - Edge API Routes
 * - Edge Functions
 *
 * Note: Edge Runtime has limitations:
 * - No Node.js APIs (fs, crypto module, etc.)
 * - Limited npm packages
 * - Uses Web Crypto API instead
 */

import type { User, Session, DecodedToken } from './types';
import { COOKIE_NAMES } from './cookies';

// ═══════════════════════════════════════════════════════════════
// EDGE-COMPATIBLE JWT UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Decode JWT token (without verification) - Edge compatible
 * Uses Web APIs only, no Node.js dependencies
 */
export function decodeTokenEdge(token: string): DecodedToken | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Base64 decode using Web APIs
    const payload = parts[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired - Edge compatible
 */
export function isTokenExpiredEdge(token: string): boolean {
  const decoded = decodeTokenEdge(token);
  if (!decoded || !decoded.exp) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  return decoded.exp < now;
}

/**
 * Get token expiration time in seconds - Edge compatible
 */
export function getTokenExpiresInEdge(token: string): number {
  const decoded = decodeTokenEdge(token);
  if (!decoded || !decoded.exp) {
    return 0;
  }

  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, decoded.exp - now);
}

// ═══════════════════════════════════════════════════════════════
// EDGE COOKIE UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Parse cookie header - Edge compatible
 */
export function parseCookiesEdge(cookieHeader: string | null): Map<string, string> {
  const cookies = new Map<string, string>();

  if (!cookieHeader) {
    return cookies;
  }

  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name && rest.length > 0) {
      cookies.set(name, decodeURIComponent(rest.join('=')));
    }
  });

  return cookies;
}

/**
 * Get auth tokens from Request - Edge compatible
 */
export function getAuthTokensEdge(request: Request): {
  accessToken: string | null;
  refreshToken: string | null;
} {
  const cookieHeader = request.headers.get('cookie');
  const cookies = parseCookiesEdge(cookieHeader);

  return {
    accessToken: cookies.get(COOKIE_NAMES.ACCESS_TOKEN) || null,
    refreshToken: cookies.get(COOKIE_NAMES.REFRESH_TOKEN) || null,
  };
}

/**
 * Get user from Request - Edge compatible
 */
export function getUserFromRequestEdge(request: Request): User | null {
  const { accessToken } = getAuthTokensEdge(request);

  if (!accessToken) {
    return null;
  }

  if (isTokenExpiredEdge(accessToken)) {
    return null;
  }

  const decoded = decodeTokenEdge(accessToken);
  if (!decoded || !decoded.id) {
    return null;
  }

  return {
    id: decoded.id,
    email: decoded.email || '',
    role: decoded.role || 'client',
    firstName: decoded.firstName,
    lastName: decoded.lastName,
    username: decoded.username,
    phone: decoded.phone,
    image: decoded.image,
    firmId: decoded.firmId,
    firmRole: decoded.firmRole,
    isAnonymous: decoded.is_anonymous || false,
    isSSOUser: decoded.isSSOUser,
    ssoProvider: decoded.ssoProvider,
  };
}

// ═══════════════════════════════════════════════════════════════
// EDGE RESPONSE HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Create unauthorized response - Edge compatible
 */
export function createUnauthorizedResponse(message: string = 'Unauthorized'): Response {
  return new Response(
    JSON.stringify({
      error: 'Unauthorized',
      message,
    }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Create forbidden response - Edge compatible
 */
export function createForbiddenResponse(message: string = 'Forbidden'): Response {
  return new Response(
    JSON.stringify({
      error: 'Forbidden',
      message,
    }),
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Create error response - Edge compatible
 */
export function createErrorResponse(
  message: string,
  status: number = 400,
  code?: string
): Response {
  return new Response(
    JSON.stringify({
      error: code || 'Error',
      message,
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Create success response - Edge compatible
 */
export function createSuccessResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// EDGE AUTH WRAPPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Wrap edge route handler with authentication check
 *
 * @example
 * import { withEdgeAuth } from '@traf3li/auth-nextjs/edge';
 *
 * export const runtime = 'edge';
 *
 * export default withEdgeAuth(async (request, user) => {
 *   return new Response(JSON.stringify({ user }));
 * });
 */
export function withEdgeAuth(
  handler: (request: Request, user: User) => Response | Promise<Response>
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const user = getUserFromRequestEdge(request);

    if (!user) {
      return createUnauthorizedResponse('Authentication required');
    }

    return handler(request, user);
  };
}

/**
 * Wrap edge route handler with role check
 *
 * @example
 * import { withEdgeRole } from '@traf3li/auth-nextjs/edge';
 *
 * export const runtime = 'edge';
 *
 * export default withEdgeRole(['admin'], async (request, user) => {
 *   return new Response('Admin only');
 * });
 */
export function withEdgeRole(
  roles: string[],
  handler: (request: Request, user: User) => Response | Promise<Response>
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const user = getUserFromRequestEdge(request);

    if (!user) {
      return createUnauthorizedResponse('Authentication required');
    }

    if (!roles.includes(user.role)) {
      return createForbiddenResponse(`Required role(s): ${roles.join(', ')}`);
    }

    return handler(request, user);
  };
}

// ═══════════════════════════════════════════════════════════════
// EDGE-COMPATIBLE FETCH WRAPPER
// ═══════════════════════════════════════════════════════════════

/**
 * Create authenticated fetch for edge runtime
 * Automatically includes auth token in requests
 */
export function createAuthenticatedFetch(apiUrl: string) {
  return async (
    request: Request,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const { accessToken } = getAuthTokensEdge(request);

    if (!accessToken) {
      throw new Error('No access token found');
    }

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${accessToken}`);

    return fetch(`${apiUrl}${endpoint}`, {
      ...options,
      headers,
    });
  };
}

// ═══════════════════════════════════════════════════════════════
// WEB CRYPTO UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Generate random string using Web Crypto API - Edge compatible
 * Useful for CSRF tokens, nonces, etc.
 */
export async function generateRandomString(length: number = 32): Promise<string> {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  // Convert to base64url
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .substring(0, length);
}

/**
 * Hash string using Web Crypto API - Edge compatible
 */
export async function hashString(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ═══════════════════════════════════════════════════════════════
// CORS HELPERS FOR EDGE
// ═══════════════════════════════════════════════════════════════

/**
 * Add CORS headers to response - Edge compatible
 */
export function withCORS(
  response: Response,
  options: {
    origin?: string | string[];
    methods?: string[];
    headers?: string[];
    credentials?: boolean;
  } = {}
): Response {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    headers = ['Content-Type', 'Authorization'],
    credentials = true,
  } = options;

  const newResponse = new Response(response.body, response);

  // Set CORS headers
  if (Array.isArray(origin)) {
    newResponse.headers.set('Access-Control-Allow-Origin', origin.join(', '));
  } else {
    newResponse.headers.set('Access-Control-Allow-Origin', origin);
  }

  newResponse.headers.set('Access-Control-Allow-Methods', methods.join(', '));
  newResponse.headers.set('Access-Control-Allow-Headers', headers.join(', '));

  if (credentials) {
    newResponse.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return newResponse;
}

/**
 * Handle OPTIONS preflight request - Edge compatible
 */
export function handlePreflight(
  options: {
    origin?: string | string[];
    methods?: string[];
    headers?: string[];
  } = {}
): Response {
  const response = new Response(null, { status: 204 });
  return withCORS(response, options);
}

// ═══════════════════════════════════════════════════════════════
// RATE LIMITING HELPERS (Edge compatible)
// ═══════════════════════════════════════════════════════════════

/**
 * Simple in-memory rate limiter for Edge
 * Note: This is per-instance, for distributed rate limiting use external service
 */
class EdgeRateLimiter {
  private requests = new Map<string, number[]>();

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  check(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests
    let requests = this.requests.get(identifier) || [];

    // Filter out old requests
    requests = requests.filter(time => time > windowStart);

    // Check if limit exceeded
    if (requests.length >= this.maxRequests) {
      return false;
    }

    // Add new request
    requests.push(now);
    this.requests.set(identifier, requests);

    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      this.cleanup();
    }

    return true;
  }

  private cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [key, requests] of this.requests.entries()) {
      const filtered = requests.filter(time => time > windowStart);
      if (filtered.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, filtered);
      }
    }
  }
}

/**
 * Create rate limiter instance
 *
 * @example
 * const limiter = createEdgeRateLimiter({ maxRequests: 10, windowMs: 60000 });
 *
 * export default async function handler(request) {
 *   const ip = request.headers.get('x-forwarded-for') || 'unknown';
 *   if (!limiter.check(ip)) {
 *     return new Response('Too many requests', { status: 429 });
 *   }
 *   // ...
 * }
 */
export function createEdgeRateLimiter(options: {
  maxRequests: number;
  windowMs: number;
}): EdgeRateLimiter {
  return new EdgeRateLimiter(options.maxRequests, options.windowMs);
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export { COOKIE_NAMES } from './cookies';
export type { User, Session, DecodedToken } from './types';
