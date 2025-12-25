/**
 * Client-Side Provider for Traf3li Auth Next.js SDK
 *
 * Provides client-side authentication context and hooks for Next.js App Router
 * Handles hydration safely and provides automatic token refresh
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session, TrafAuthConfig } from './types';
import { decodeToken, isTokenExpired, shouldRefreshToken } from './cookies';

// ═══════════════════════════════════════════════════════════════
// CONTEXT TYPES
// ═══════════════════════════════════════════════════════════════

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username?: string;
  phone?: string;
}

// ═══════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ═══════════════════════════════════════════════════════════════
// PROVIDER PROPS
// ═══════════════════════════════════════════════════════════════

interface TrafAuthProviderProps {
  children: React.ReactNode;
  config?: Partial<TrafAuthConfig>;
  initialSession?: Session | null;
}

// ═══════════════════════════════════════════════════════════════
// PROVIDER COMPONENT
// ═══════════════════════════════════════════════════════════════

/**
 * TrafAuthProvider - Client-side authentication provider
 *
 * @example
 * // app/layout.tsx
 * import { TrafAuthProvider } from '@traf3li/auth-nextjs/client';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <TrafAuthProvider config={{ apiUrl: process.env.NEXT_PUBLIC_API_URL }}>
 *           {children}
 *         </TrafAuthProvider>
 *       </body>
 *     </html>
 *   );
 * }
 */
export function TrafAuthProvider({
  children,
  config,
  initialSession = null,
}: TrafAuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null);
  const [session, setSession] = useState<Session | null>(initialSession);
  const [loading, setLoading] = useState(!initialSession);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Get API URL from config or environment
  const apiUrl = config?.apiUrl || process.env.NEXT_PUBLIC_TRAF3LI_API_URL || '';

  if (!apiUrl && typeof window !== 'undefined') {
    console.warn('[TrafAuth] API URL not configured. Set NEXT_PUBLIC_TRAF3LI_API_URL or pass config.apiUrl');
  }

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch current session on mount
  useEffect(() => {
    if (!mounted) return;

    const fetchSession = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/auth/session');

        if (response.ok) {
          const data = await response.json();
          if (data.session) {
            setSession(data.session);
            setUser(data.session.user);
          }
        }
      } catch (err) {
        console.error('[TrafAuth] Failed to fetch session:', err);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we don't have an initial session
    if (!initialSession) {
      fetchSession();
    } else {
      setLoading(false);
    }
  }, [mounted, initialSession]);

  // Auto-refresh token
  useEffect(() => {
    if (!session?.accessToken || !config?.tokenRefresh?.enabled) {
      return;
    }

    const refreshBeforeExpiry = config.tokenRefresh.refreshBeforeExpiry ?? 60;

    const checkAndRefresh = async () => {
      if (shouldRefreshToken(session.accessToken, refreshBeforeExpiry)) {
        await refreshSession();
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkAndRefresh, 30000);
    return () => clearInterval(interval);
  }, [session, config]);

  // Sign in
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Session is set via HTTP-only cookies
      // Fetch the session to update state
      const sessionResponse = await fetch('/api/auth/session');
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        setSession(sessionData.session);
        setUser(sessionData.session.user);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  // Sign up
  const signUp = useCallback(async (data: SignUpData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Registration failed');
      }

      // Fetch session after registration
      const sessionResponse = await fetch('/api/auth/session');
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        setSession(sessionData.session);
        setUser(sessionData.session.user);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await fetch(`${apiUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      // Clear local state
      setSession(null);
      setUser(null);
    } catch (err: any) {
      setError(err.message || 'Logout failed');
      console.error('[TrafAuth] Logout error:', err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  // Refresh session
  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
        }
      }
    } catch (err) {
      console.error('[TrafAuth] Failed to refresh session:', err);
    }
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ═══════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * useAuth - Hook to access auth context
 *
 * @example
 * import { useAuth } from '@traf3li/auth-nextjs/client';
 *
 * function ProfileButton() {
 *   const { user, signOut } = useAuth();
 *
 *   if (!user) return <Link href="/login">Login</Link>;
 *
 *   return (
 *     <div>
 *       <p>Welcome, {user.firstName}</p>
 *       <button onClick={signOut}>Logout</button>
 *     </div>
 *   );
 * }
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within TrafAuthProvider');
  }
  return context;
}

/**
 * useUser - Hook to get current user
 *
 * @example
 * const user = useUser();
 */
export function useUser(): User | null {
  const { user } = useAuth();
  return user;
}

/**
 * useSession - Hook to get current session
 *
 * @example
 * const session = useSession();
 */
export function useSession(): Session | null {
  const { session } = useAuth();
  return session;
}

/**
 * useIsAuthenticated - Hook to check if user is authenticated
 *
 * @example
 * const isAuthenticated = useIsAuthenticated();
 */
export function useIsAuthenticated(): boolean {
  const { user } = useAuth();
  return user !== null;
}

/**
 * useAuthLoading - Hook to check if auth is loading
 *
 * @example
 * const isLoading = useAuthLoading();
 */
export function useAuthLoading(): boolean {
  const { loading } = useAuth();
  return loading;
}

/**
 * useAuthError - Hook to get auth error
 *
 * @example
 * const error = useAuthError();
 */
export function useAuthError(): string | null {
  const { error } = useAuth();
  return error;
}

// ═══════════════════════════════════════════════════════════════
// PROTECTED COMPONENT WRAPPER
// ═══════════════════════════════════════════════════════════════

interface ProtectedProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requiredRole?: string | string[];
  onUnauthorized?: () => void;
}

/**
 * Protected - Component wrapper for protected routes
 *
 * @example
 * <Protected fallback={<LoginPage />}>
 *   <DashboardContent />
 * </Protected>
 */
export function Protected({
  children,
  fallback = null,
  requiredRole,
  onUnauthorized,
}: ProtectedProps) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user && onUnauthorized) {
      onUnauthorized();
    }
  }, [loading, user, onUnauthorized]);

  // Show loading state
  if (loading) {
    return fallback;
  }

  // Not authenticated
  if (!user) {
    return fallback;
  }

  // Check role if required
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(user.role)) {
      return fallback;
    }
  }

  return <>{children}</>;
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export type { AuthContextValue, SignUpData };
