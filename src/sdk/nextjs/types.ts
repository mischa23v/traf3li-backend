/**
 * Next.js SDK Types for Traf3li Auth
 *
 * Provides TypeScript type definitions for Next.js-specific auth features
 */

import { NextRequest, NextResponse } from 'next/server';
import { NextApiRequest, NextApiResponse } from 'next';
import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

// ═══════════════════════════════════════════════════════════════
// USER & SESSION TYPES
// ═══════════════════════════════════════════════════════════════

export interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  image?: string;
  role: 'client' | 'lawyer' | 'admin';
  firmId?: string;
  firmRole?: 'owner' | 'admin' | 'partner' | 'lawyer' | 'paralegal' | 'secretary' | 'accountant' | 'departed' | null;
  mfaEnabled?: boolean;
  isAnonymous?: boolean;
  isSSOUser?: boolean;
  ssoProvider?: 'azure' | 'okta' | 'google' | 'custom' | null;
  createdAt?: string;
  lastLogin?: string;
}

export interface Session {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  sessionId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION TYPES
// ═══════════════════════════════════════════════════════════════

export interface TrafAuthConfig {
  /**
   * Backend API URL (e.g., https://api.traf3li.com)
   */
  apiUrl: string;

  /**
   * Optional: Custom fetch implementation (useful for testing)
   */
  fetch?: typeof fetch;

  /**
   * Optional: Debug mode for additional logging
   */
  debug?: boolean;

  /**
   * Optional: Custom cookie options
   */
  cookies?: CookieOptions;

  /**
   * Optional: Token refresh configuration
   */
  tokenRefresh?: {
    /**
     * Enable automatic token refresh (default: true)
     */
    enabled?: boolean;

    /**
     * Refresh tokens this many seconds before expiry (default: 60)
     */
    refreshBeforeExpiry?: number;
  };
}

export interface CookieOptions {
  /**
   * Cookie domain (e.g., '.traf3li.com' for subdomain sharing)
   */
  domain?: string;

  /**
   * Cookie path (default: '/')
   */
  path?: string;

  /**
   * Secure flag - true in production (default: auto-detect)
   */
  secure?: boolean;

  /**
   * SameSite policy (default: 'lax')
   */
  sameSite?: 'strict' | 'lax' | 'none';

  /**
   * HttpOnly flag for sensitive cookies (default: true for tokens)
   */
  httpOnly?: boolean;

  /**
   * Max age in seconds (default: 7 days for refresh, 15 min for access)
   */
  maxAge?: number;
}

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE TYPES
// ═══════════════════════════════════════════════════════════════

export interface AuthMiddlewareConfig {
  /**
   * Routes that don't require authentication
   * Supports wildcards: '/blog/:path*', '/api/public/*'
   */
  publicRoutes?: string[];

  /**
   * Routes that require authentication
   * Supports wildcards: '/dashboard/:path*', '/admin/*'
   */
  protectedRoutes?: string[];

  /**
   * Login page URL (default: '/login')
   */
  loginPage?: string;

  /**
   * Where to redirect after login (default: '/dashboard')
   */
  afterLoginUrl?: string;

  /**
   * Where to redirect after logout (default: '/')
   */
  afterLogoutUrl?: string;

  /**
   * Optional: Custom redirect handler
   */
  onAuthRequired?: (req: NextRequest) => NextResponse | Promise<NextResponse>;

  /**
   * Optional: Custom success handler
   */
  onAuthSuccess?: (req: NextRequest, user: User) => NextResponse | Promise<NextResponse> | void;

  /**
   * Optional: Role-based access control
   */
  roleAccess?: {
    [route: string]: ('client' | 'lawyer' | 'admin')[];
  };

  /**
   * Optional: Debug mode
   */
  debug?: boolean;
}

export interface RouteMatcherConfig {
  /**
   * Path patterns to match (from Next.js middleware config)
   */
  matcher?: string | string[];
}

// ═══════════════════════════════════════════════════════════════
// API ROUTE HANDLER TYPES
// ═══════════════════════════════════════════════════════════════

export interface AuthRouteHandlerConfig extends TrafAuthConfig {
  /**
   * Optional: Custom callback after login
   */
  onLogin?: (user: User) => void | Promise<void>;

  /**
   * Optional: Custom callback after logout
   */
  onLogout?: (userId: string) => void | Promise<void>;

  /**
   * Optional: Custom callback after registration
   */
  onRegister?: (user: User) => void | Promise<void>;

  /**
   * Optional: OAuth provider configurations
   */
  oauth?: {
    google?: GoogleOAuthConfig;
    github?: GitHubOAuthConfig;
    microsoft?: MicrosoftOAuthConfig;
  };
}

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope?: string[];
}

export interface GitHubOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope?: string[];
}

export interface MicrosoftOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tenant?: string;
  scope?: string[];
}

// ═══════════════════════════════════════════════════════════════
// NEXT.JS API HANDLER TYPES
// ═══════════════════════════════════════════════════════════════

export type NextApiHandler = (
  req: NextApiRequest,
  res: NextApiResponse
) => void | Promise<void>;

export interface AuthenticatedNextApiRequest extends NextApiRequest {
  user: User;
  session: Session;
}

export type AuthenticatedNextApiHandler = (
  req: AuthenticatedNextApiRequest,
  res: NextApiResponse
) => void | Promise<void>;

// ═══════════════════════════════════════════════════════════════
// APP ROUTER TYPES (Next.js 13+)
// ═══════════════════════════════════════════════════════════════

export interface AppRouteHandlerContext {
  params: Record<string, string | string[]>;
}

export type AppRouteHandler = (
  req: Request,
  context?: AppRouteHandlerContext
) => Response | Promise<Response>;

export interface AuthRouteHandlers {
  GET: AppRouteHandler;
  POST: AppRouteHandler;
}

// ═══════════════════════════════════════════════════════════════
// COOKIE TYPES
// ═══════════════════════════════════════════════════════════════

export type CookieStore = ReadonlyRequestCookies | Map<string, string>;

export interface CookieAdapter {
  get: (name: string) => string | undefined;
  set: (name: string, value: string, options?: CookieOptions) => void;
  delete: (name: string) => void;
}

// ═══════════════════════════════════════════════════════════════
// RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
  session?: Session;
  error?: string;
}

export interface LoginResponse extends AuthResponse {
  user: User;
  session: Session;
  requiresMfa?: boolean;
  mfaToken?: string;
}

export interface RegisterResponse extends AuthResponse {
  user: User;
  session: Session;
  emailVerificationRequired?: boolean;
}

export interface RefreshResponse {
  success: boolean;
  accessToken: string;
  expiresAt: number;
  error?: string;
}

export interface LogoutResponse {
  success: boolean;
  message?: string;
}

// ═══════════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════════

export class TrafAuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'TrafAuthError';
  }
}

export class UnauthorizedError extends TrafAuthError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends TrafAuthError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class TokenExpiredError extends TrafAuthError {
  constructor(message: string = 'Token expired') {
    super(message, 'TOKEN_EXPIRED', 401);
    this.name = 'TokenExpiredError';
  }
}

// ═══════════════════════════════════════════════════════════════
// GOOGLE ONE TAP TYPES
// ═══════════════════════════════════════════════════════════════

export interface GoogleOneTapConfig {
  /**
   * Google OAuth client ID
   */
  clientId: string;

  /**
   * Callback when sign-in succeeds
   */
  onSuccess: (credential: string) => void | Promise<void>;

  /**
   * Callback when sign-in fails
   */
  onError?: (error: Error) => void;

  /**
   * Enable auto-select (default: true)
   */
  autoSelect?: boolean;

  /**
   * Cancel the prompt if user clicks outside (default: true)
   */
  cancelOnTapOutside?: boolean;

  /**
   * Context for the One Tap prompt
   */
  context?: 'signin' | 'signup' | 'use';

  /**
   * Nonce for additional security
   */
  nonce?: string;
}

export interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
  clientId: string;
}

// ═══════════════════════════════════════════════════════════════
// SERVER COMPONENT TYPES
// ═══════════════════════════════════════════════════════════════

export interface ServerAuthResult {
  user: User | null;
  session: Session | null;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// UTILITY TYPES
// ═══════════════════════════════════════════════════════════════

export type AsyncReturnType<T extends (...args: any) => Promise<any>> =
  T extends (...args: any) => Promise<infer R> ? R : any;

export type DecodedToken = {
  id: string;
  email?: string;
  role?: string;
  exp?: number;
  iat?: number;
  iss?: string;
  aud?: string;
  is_anonymous?: boolean;
  [key: string]: any;
};
