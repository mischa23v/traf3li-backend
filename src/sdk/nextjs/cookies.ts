/**
 * Cookie Utilities for Traf3li Auth Next.js SDK
 *
 * Provides utilities for managing authentication cookies in Next.js
 * Supports both client-side and server-side cookie operations
 */

import { cookies } from 'next/headers';
import type { AuthTokens, CookieOptions, DecodedToken } from './types';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'traf3li_access_token',
  REFRESH_TOKEN: 'traf3li_refresh_token',
  SESSION_ID: 'traf3li_session_id',
} as const;

const DEFAULT_COOKIE_OPTIONS: CookieOptions = {
  path: '/',
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
};

// Access token expires in 15 minutes
const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15 minutes in seconds

// Refresh token expires in 7 days
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

// ═══════════════════════════════════════════════════════════════
// SERVER-SIDE COOKIE OPERATIONS (Next.js App Router)
// ═══════════════════════════════════════════════════════════════

/**
 * Set authentication cookies on the server
 * Use in Server Components, Server Actions, or Route Handlers
 *
 * @example
 * import { cookies } from 'next/headers';
 * await setAuthCookies({ accessToken, refreshToken });
 */
export async function setAuthCookies(
  tokens: AuthTokens,
  options?: Partial<CookieOptions>
): Promise<void> {
  const cookieStore = cookies();
  const mergedOptions = { ...DEFAULT_COOKIE_OPTIONS, ...options };

  // Set access token (short-lived, httpOnly)
  cookieStore.set(COOKIE_NAMES.ACCESS_TOKEN, tokens.accessToken, {
    ...mergedOptions,
    maxAge: ACCESS_TOKEN_MAX_AGE,
    httpOnly: true, // Always httpOnly for security
  });

  // Set refresh token (long-lived, httpOnly)
  cookieStore.set(COOKIE_NAMES.REFRESH_TOKEN, tokens.refreshToken, {
    ...mergedOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE,
    httpOnly: true, // Always httpOnly for security
  });
}

/**
 * Get authentication cookies from the server
 * Use in Server Components, Server Actions, or Route Handlers
 *
 * @example
 * import { cookies } from 'next/headers';
 * const tokens = await getAuthCookies();
 */
export async function getAuthCookies(): Promise<AuthTokens | null> {
  const cookieStore = cookies();

  const accessToken = cookieStore.get(COOKIE_NAMES.ACCESS_TOKEN)?.value;
  const refreshToken = cookieStore.get(COOKIE_NAMES.REFRESH_TOKEN)?.value;

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
  };
}

/**
 * Get only the access token from cookies
 */
export async function getAccessToken(): Promise<string | null> {
  const cookieStore = cookies();
  return cookieStore.get(COOKIE_NAMES.ACCESS_TOKEN)?.value ?? null;
}

/**
 * Get only the refresh token from cookies
 */
export async function getRefreshToken(): Promise<string | null> {
  const cookieStore = cookies();
  return cookieStore.get(COOKIE_NAMES.REFRESH_TOKEN)?.value ?? null;
}

/**
 * Clear authentication cookies on the server
 * Use for logout functionality
 *
 * @example
 * await clearAuthCookies();
 */
export async function clearAuthCookies(options?: Partial<CookieOptions>): Promise<void> {
  const cookieStore = cookies();
  const mergedOptions = { ...DEFAULT_COOKIE_OPTIONS, ...options };

  // Delete cookies by setting maxAge to 0
  cookieStore.set(COOKIE_NAMES.ACCESS_TOKEN, '', {
    ...mergedOptions,
    maxAge: 0,
  });

  cookieStore.set(COOKIE_NAMES.REFRESH_TOKEN, '', {
    ...mergedOptions,
    maxAge: 0,
  });

  cookieStore.set(COOKIE_NAMES.SESSION_ID, '', {
    ...mergedOptions,
    maxAge: 0,
  });
}

// ═══════════════════════════════════════════════════════════════
// CLIENT-SIDE COOKIE OPERATIONS (Browser)
// ═══════════════════════════════════════════════════════════════

/**
 * Set cookie in the browser (client-side)
 * Note: HttpOnly cookies cannot be set from client-side
 * This is primarily for non-sensitive data
 */
export function setClientCookie(
  name: string,
  value: string,
  options?: Partial<CookieOptions>
): void {
  if (typeof document === 'undefined') {
    throw new Error('setClientCookie can only be used in browser environment');
  }

  const mergedOptions = { ...DEFAULT_COOKIE_OPTIONS, ...options };
  const cookieParts = [`${name}=${value}`];

  if (mergedOptions.maxAge) {
    cookieParts.push(`max-age=${mergedOptions.maxAge}`);
  }

  if (mergedOptions.path) {
    cookieParts.push(`path=${mergedOptions.path}`);
  }

  if (mergedOptions.domain) {
    cookieParts.push(`domain=${mergedOptions.domain}`);
  }

  if (mergedOptions.secure) {
    cookieParts.push('secure');
  }

  if (mergedOptions.sameSite) {
    cookieParts.push(`samesite=${mergedOptions.sameSite}`);
  }

  document.cookie = cookieParts.join('; ');
}

/**
 * Get cookie value in the browser (client-side)
 * Note: Cannot read HttpOnly cookies
 */
export function getClientCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === name) {
      return cookieValue;
    }
  }

  return null;
}

/**
 * Delete cookie in the browser (client-side)
 */
export function deleteClientCookie(name: string, options?: Partial<CookieOptions>): void {
  setClientCookie(name, '', { ...options, maxAge: 0 });
}

// ═══════════════════════════════════════════════════════════════
// EDGE RUNTIME COOKIE OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Set cookies in Edge Runtime (Middleware, Edge API Routes)
 * Returns Response with Set-Cookie headers
 */
export function setEdgeCookies(
  response: Response,
  tokens: AuthTokens,
  options?: Partial<CookieOptions>
): Response {
  const mergedOptions = { ...DEFAULT_COOKIE_OPTIONS, ...options };

  const accessTokenCookie = serializeCookie(
    COOKIE_NAMES.ACCESS_TOKEN,
    tokens.accessToken,
    { ...mergedOptions, maxAge: ACCESS_TOKEN_MAX_AGE }
  );

  const refreshTokenCookie = serializeCookie(
    COOKIE_NAMES.REFRESH_TOKEN,
    tokens.refreshToken,
    { ...mergedOptions, maxAge: REFRESH_TOKEN_MAX_AGE }
  );

  // Clone response and add Set-Cookie headers
  const newResponse = new Response(response.body, response);
  newResponse.headers.append('Set-Cookie', accessTokenCookie);
  newResponse.headers.append('Set-Cookie', refreshTokenCookie);

  return newResponse;
}

/**
 * Get cookies from Edge Runtime Request
 */
export function getEdgeCookies(request: Request): AuthTokens | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) {
    return null;
  }

  const cookies = parseCookieHeader(cookieHeader);
  const accessToken = cookies.get(COOKIE_NAMES.ACCESS_TOKEN);
  const refreshToken = cookies.get(COOKIE_NAMES.REFRESH_TOKEN);

  if (!accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
}

/**
 * Clear cookies in Edge Runtime
 */
export function clearEdgeCookies(
  response: Response,
  options?: Partial<CookieOptions>
): Response {
  const mergedOptions = { ...DEFAULT_COOKIE_OPTIONS, ...options };

  const deleteCookies = [
    serializeCookie(COOKIE_NAMES.ACCESS_TOKEN, '', { ...mergedOptions, maxAge: 0 }),
    serializeCookie(COOKIE_NAMES.REFRESH_TOKEN, '', { ...mergedOptions, maxAge: 0 }),
    serializeCookie(COOKIE_NAMES.SESSION_ID, '', { ...mergedOptions, maxAge: 0 }),
  ];

  const newResponse = new Response(response.body, response);
  deleteCookies.forEach(cookie => {
    newResponse.headers.append('Set-Cookie', cookie);
  });

  return newResponse;
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Serialize cookie to Set-Cookie header format
 */
export function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }

  if (options.path) {
    parts.push(`Path=${options.path}`);
  }

  if (options.secure) {
    parts.push('Secure');
  }

  if (options.httpOnly) {
    parts.push('HttpOnly');
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite.charAt(0).toUpperCase() + options.sameSite.slice(1)}`);
  }

  return parts.join('; ');
}

/**
 * Parse Cookie header into Map
 */
export function parseCookieHeader(cookieHeader: string): Map<string, string> {
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
 * Decode JWT token (without verification)
 * Useful for extracting expiration time
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decoded = JSON.parse(
      Buffer.from(payload, 'base64').toString('utf-8')
    );

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  return decoded.exp < now;
}

/**
 * Get token expiration time in seconds
 */
export function getTokenExpiresIn(token: string): number {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return 0;
  }

  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, decoded.exp - now);
}

/**
 * Check if token should be refreshed
 * Returns true if token expires in less than specified seconds
 */
export function shouldRefreshToken(token: string, refreshBeforeExpiry: number = 60): boolean {
  const expiresIn = getTokenExpiresIn(token);
  return expiresIn > 0 && expiresIn < refreshBeforeExpiry;
}
