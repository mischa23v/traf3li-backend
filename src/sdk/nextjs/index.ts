/**
 * Traf3li Auth - Next.js SDK
 *
 * @packageDocumentation
 * Official Next.js SDK for Traf3li Authentication
 *
 * Features:
 * - Next.js App Router support (Server Components, Route Handlers)
 * - Next.js Pages Router support (API Routes, getServerSideProps)
 * - Edge Runtime compatible
 * - TypeScript first
 * - Automatic token refresh
 * - Google One Tap integration
 * - Cookie-based sessions
 * - Middleware for route protection
 *
 * @example
 * ```typescript
 * // Server Components (App Router)
 * import { getServerUser } from '@traf3li/auth-nextjs';
 *
 * export default async function Page() {
 *   const user = await getServerUser();
 *   return <div>Welcome {user?.firstName}</div>;
 * }
 *
 * // Client Components
 * 'use client';
 * import { useAuth } from '@traf3li/auth-nextjs';
 *
 * export default function Component() {
 *   const { user, signOut } = useAuth();
 *   return <button onClick={signOut}>Logout</button>;
 * }
 *
 * // Middleware
 * import { createAuthMiddleware } from '@traf3li/auth-nextjs';
 *
 * export default createAuthMiddleware({
 *   protectedRoutes: ['/dashboard/:path*'],
 *   publicRoutes: ['/login', '/register'],
 * });
 * ```
 */

// ═══════════════════════════════════════════════════════════════
// SERVER-SIDE EXPORTS
// ═══════════════════════════════════════════════════════════════

export {
  // Configuration
  configureAuth,

  // Server Components utilities
  getServerUser,
  getServerSession,
  requireAuth,
  hasRole,
  requireRole,

  // API Route utilities (Pages Router)
  getAuthFromRequest,
  withAuth,
  withRole,
  getSessionFromRequest,

  // Token utilities
  refreshAccessToken,
  verifyToken,
  getServerAuth,
} from './server';

// ═══════════════════════════════════════════════════════════════
// CLIENT-SIDE EXPORTS
// ═══════════════════════════════════════════════════════════════

export {
  // Provider
  TrafAuthProvider,

  // Hooks
  useAuth,
  useUser,
  useSession,
  useIsAuthenticated,
  useAuthLoading,
  useAuthError,

  // Components
  Protected,
} from './client';

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE EXPORTS
// ═══════════════════════════════════════════════════════════════

export {
  createAuthMiddleware,
  requireAuth as requireAuthMiddleware,
  requireRole as requireRoleMiddleware,
  redirectIfAuthenticated,
} from './middleware';

// Default export for middleware
export { default as createMiddleware } from './middleware';

// ═══════════════════════════════════════════════════════════════
// COOKIE UTILITIES EXPORTS
// ═══════════════════════════════════════════════════════════════

export {
  // Server-side cookie operations
  setAuthCookies,
  getAuthCookies,
  getAccessToken,
  getRefreshToken,
  clearAuthCookies,

  // Client-side cookie operations
  setClientCookie,
  getClientCookie,
  deleteClientCookie,

  // Edge runtime cookie operations
  setEdgeCookies,
  getEdgeCookies,
  clearEdgeCookies,

  // Utilities
  decodeToken,
  isTokenExpired,
  getTokenExpiresIn,
  shouldRefreshToken,
  serializeCookie,
  parseCookieHeader,

  // Constants
  COOKIE_NAMES,
} from './cookies';

// ═══════════════════════════════════════════════════════════════
// EDGE RUNTIME EXPORTS
// ═══════════════════════════════════════════════════════════════

export {
  // Edge JWT utilities
  decodeTokenEdge,
  isTokenExpiredEdge,
  getTokenExpiresInEdge,

  // Edge cookie utilities
  parseCookiesEdge,
  getAuthTokensEdge,
  getUserFromRequestEdge,

  // Edge response helpers
  createUnauthorizedResponse,
  createForbiddenResponse,
  createErrorResponse,
  createSuccessResponse,

  // Edge auth wrappers
  withEdgeAuth,
  withEdgeRole,

  // Edge utilities
  createAuthenticatedFetch,
  generateRandomString,
  hashString,
  withCORS,
  handlePreflight,
  createEdgeRateLimiter,
} from './edge';

// ═══════════════════════════════════════════════════════════════
// API ROUTE HANDLERS EXPORTS
// ═══════════════════════════════════════════════════════════════

export {
  // App Router (app directory)
  createAuthRouteHandler,
  createLoginHandler,
  createLogoutHandler,
  createSessionHandler,
} from './api/route-handlers';

export {
  // Pages Router (pages directory)
  createPagesAuthHandler,
  createPagesLoginHandler,
  createPagesLogoutHandler,
  createPagesSessionHandler,
} from './api/pages-handlers';

// ═══════════════════════════════════════════════════════════════
// COMPONENT EXPORTS
// ═══════════════════════════════════════════════════════════════

export {
  GoogleOneTap,
  GoogleSignInButton,
} from './components/GoogleOneTap';

// ═══════════════════════════════════════════════════════════════
// HOOKS EXPORTS
// ═══════════════════════════════════════════════════════════════

export {
  useServerAuth,
  useServerSession,
  useRequireAuth,
  useHasRole,
  useRequireRole,
} from './hooks/useServerAuth';

// ═══════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════

export type {
  // User & Session types
  User,
  Session,
  AuthTokens,

  // Configuration types
  TrafAuthConfig,
  CookieOptions,
  AuthMiddlewareConfig,
  RouteMatcherConfig,
  AuthRouteHandlerConfig,
  GoogleOAuthConfig,
  GitHubOAuthConfig,
  MicrosoftOAuthConfig,

  // API Handler types
  NextApiHandler,
  AuthenticatedNextApiHandler,
  AuthenticatedNextApiRequest,
  AppRouteHandler,
  AppRouteHandlerContext,
  AuthRouteHandlers,

  // Cookie types
  CookieStore,
  CookieAdapter,

  // Response types
  AuthResponse,
  LoginResponse,
  RegisterResponse,
  RefreshResponse,
  LogoutResponse,

  // Error types
  TrafAuthError,
  UnauthorizedError,
  ForbiddenError,
  TokenExpiredError,

  // Google One Tap types
  GoogleOneTapConfig,
  GoogleCredentialResponse,

  // Server types
  ServerAuthResult,

  // Utility types
  DecodedToken,
} from './types';

// ═══════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════

export const VERSION = '1.0.0';

// ═══════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════

/**
 * Default export - TrafAuthProvider for convenience
 */
export { TrafAuthProvider as default } from './client';
