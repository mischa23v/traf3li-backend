/**
 * @traf3li/auth-react - Auth Provider
 * Main provider component for Traf3li Authentication
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TrafAuthContext } from './context';
import type {
  TrafAuthConfig,
  User,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  OAuthProvider,
  OAuthCallbackParams,
  MagicLinkOptions,
  PasswordlessResponse,
  UpdateProfileData,
  AuthError as AuthErrorType,
} from './types';
import { AuthError } from './types';

// ═══════════════════════════════════════════════════════════════
// PROVIDER PROPS
// ═══════════════════════════════════════════════════════════════

export interface TrafAuthProviderProps extends TrafAuthConfig {
  children: React.ReactNode;
}

// ═══════════════════════════════════════════════════════════════
// STORAGE HELPERS
// ═══════════════════════════════════════════════════════════════

const isSSR = typeof window === 'undefined';

const storage = {
  get: (key: string): string | null => {
    if (isSSR) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string): void => {
    if (isSSR) return;
    try {
      localStorage.setItem(key, value);
    } catch {
      // Silently fail
    }
  },
  remove: (key: string): void => {
    if (isSSR) return;
    try {
      localStorage.removeItem(key);
    } catch {
      // Silently fail
    }
  },
};

// ═══════════════════════════════════════════════════════════════
// PROVIDER COMPONENT
// ═══════════════════════════════════════════════════════════════

export const TrafAuthProvider: React.FC<TrafAuthProviderProps> = ({
  children,
  apiUrl,
  firmId,
  onAuthStateChange,
  onError,
  autoRefreshToken = true,
  tokenRefreshInterval = 14 * 60 * 1000, // 14 minutes (token expires at 15)
  persistSession = true,
  storageKey = 'traf_auth_user',
}) => {
  // State
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  // Refs for cleanup
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Memoize API URL with firmId
  const baseApiUrl = useMemo(() => {
    const url = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    return firmId ? `${url}?firmId=${firmId}` : url;
  }, [apiUrl, firmId]);

  // ═══════════════════════════════════════════════════════════════
  // API HELPERS
  // ═══════════════════════════════════════════════════════════════

  const fetchAPI = useCallback(
    async <T = any>(
      endpoint: string,
      options: RequestInit = {}
    ): Promise<T> => {
      const url = `${baseApiUrl}${endpoint}`;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      // Add CSRF token if available
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      try {
        const response = await fetch(url, {
          ...options,
          headers,
          credentials: 'include', // Important for cookies
        });

        const data = await response.json();

        if (!response.ok) {
          throw new AuthError(
            data.message || data.messageEn || 'Request failed',
            data.code,
            response.status,
            data.details
          );
        }

        return data;
      } catch (err) {
        if (err instanceof AuthError) {
          throw err;
        }
        throw new AuthError(
          err instanceof Error ? err.message : 'Network error',
          'NETWORK_ERROR'
        );
      }
    },
    [baseApiUrl, csrfToken]
  );

  // ═══════════════════════════════════════════════════════════════
  // SESSION PERSISTENCE
  // ═══════════════════════════════════════════════════════════════

  const saveSession = useCallback(
    (userData: User | null) => {
      if (!persistSession) return;
      if (userData) {
        storage.set(storageKey, JSON.stringify(userData));
      } else {
        storage.remove(storageKey);
      }
    },
    [persistSession, storageKey]
  );

  const loadSession = useCallback((): User | null => {
    if (!persistSession) return null;
    const saved = storage.get(storageKey);
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }, [persistSession, storageKey]);

  // ═══════════════════════════════════════════════════════════════
  // AUTH STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  const updateUser = useCallback(
    (userData: User | null) => {
      if (!isMountedRef.current) return;

      setUser(userData);
      saveSession(userData);
      onAuthStateChange?.(userData);
    },
    [saveSession, onAuthStateChange]
  );

  const handleError = useCallback(
    (err: Error) => {
      if (!isMountedRef.current) return;

      setError(err);
      onError?.(err);
    },
    [onError]
  );

  // ═══════════════════════════════════════════════════════════════
  // CSRF TOKEN MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  const refreshCsrfToken = useCallback(async () => {
    if (!user) return;

    try {
      const data = await fetchAPI<{ csrfToken: string | null }>('/auth/csrf');
      if (data.csrfToken) {
        setCsrfToken(data.csrfToken);
      }
    } catch (err) {
      // CSRF token refresh is non-critical
      console.warn('Failed to refresh CSRF token:', err);
    }
  }, [user, fetchAPI]);

  // ═══════════════════════════════════════════════════════════════
  // AUTH METHODS
  // ═══════════════════════════════════════════════════════════════

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<AuthResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchAPI<AuthResponse>('/auth/login', {
          method: 'POST',
          body: JSON.stringify(credentials),
        });

        if (data.user) {
          updateUser(data.user);
        }

        if (data.csrfToken) {
          setCsrfToken(data.csrfToken);
        }

        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Login failed');
        handleError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchAPI, updateUser, handleError]
  );

  const register = useCallback(
    async (registerData: RegisterData): Promise<AuthResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchAPI<AuthResponse>('/auth/register', {
          method: 'POST',
          body: JSON.stringify(registerData),
        });

        // Note: Registration might not auto-login
        // Check if user is returned before updating
        if (data.user) {
          updateUser(data.user);
        }

        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Registration failed');
        handleError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchAPI, updateUser, handleError]
  );

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await fetchAPI('/auth/logout', { method: 'POST' });
    } catch (err) {
      // Log error but still clear local state
      console.error('Logout error:', err);
    } finally {
      updateUser(null);
      setCsrfToken(null);
      setIsLoading(false);
    }
  }, [fetchAPI, updateUser]);

  const logoutAll = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await fetchAPI('/auth/logout-all', { method: 'POST' });
    } catch (err) {
      console.error('Logout all error:', err);
    } finally {
      updateUser(null);
      setCsrfToken(null);
      setIsLoading(false);
    }
  }, [fetchAPI, updateUser]);

  const refreshToken = useCallback(async (): Promise<void> => {
    try {
      const data = await fetchAPI<AuthResponse>('/auth/refresh', {
        method: 'POST',
      });

      if (data.user) {
        updateUser(data.user);
      }
    } catch (err) {
      // If refresh fails, logout
      console.error('Token refresh failed:', err);
      updateUser(null);
      setCsrfToken(null);
    }
  }, [fetchAPI, updateUser]);

  // ═══════════════════════════════════════════════════════════════
  // OAUTH METHODS
  // ═══════════════════════════════════════════════════════════════

  const loginWithProvider = useCallback(
    async (provider: OAuthProvider): Promise<void> => {
      if (isSSR) return;

      const redirectUri = `${window.location.origin}/auth/callback/${provider}`;
      const state = Math.random().toString(36).substring(7);

      // Store state for verification
      storage.set('oauth_state', state);

      // Redirect to OAuth endpoint
      window.location.href = `${baseApiUrl}/oauth/${provider}?redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    },
    [baseApiUrl]
  );

  const loginWithGoogle = useCallback(() => loginWithProvider('google'), [loginWithProvider]);
  const loginWithMicrosoft = useCallback(() => loginWithProvider('microsoft'), [loginWithProvider]);
  const loginWithApple = useCallback(() => loginWithProvider('apple'), [loginWithProvider]);

  const handleOAuthCallback = useCallback(
    async (params: OAuthCallbackParams): Promise<AuthResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        // Verify state
        const savedState = storage.get('oauth_state');
        if (savedState && savedState !== params.state) {
          throw new AuthError('Invalid OAuth state', 'INVALID_STATE');
        }
        storage.remove('oauth_state');

        if (params.error) {
          throw new AuthError(
            params.error_description || params.error,
            'OAUTH_ERROR'
          );
        }

        const data = await fetchAPI<AuthResponse>('/oauth/callback', {
          method: 'POST',
          body: JSON.stringify(params),
        });

        if (data.user) {
          updateUser(data.user);
        }

        if (data.csrfToken) {
          setCsrfToken(data.csrfToken);
        }

        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('OAuth callback failed');
        handleError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchAPI, updateUser, handleError]
  );

  const handleGoogleOneTap = useCallback(
    async (credential: string): Promise<AuthResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchAPI<AuthResponse>('/oauth/google/one-tap', {
          method: 'POST',
          body: JSON.stringify({ credential }),
        });

        if (data.user) {
          updateUser(data.user);
        }

        if (data.csrfToken) {
          setCsrfToken(data.csrfToken);
        }

        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Google One Tap failed');
        handleError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchAPI, updateUser, handleError]
  );

  // ═══════════════════════════════════════════════════════════════
  // PASSWORDLESS METHODS
  // ═══════════════════════════════════════════════════════════════

  const sendMagicLink = useCallback(
    async (options: MagicLinkOptions): Promise<PasswordlessResponse> => {
      try {
        return await fetchAPI<PasswordlessResponse>('/auth/magic-link/send', {
          method: 'POST',
          body: JSON.stringify(options),
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to send magic link');
        handleError(error);
        throw error;
      }
    },
    [fetchAPI, handleError]
  );

  const verifyMagicLink = useCallback(
    async (token: string): Promise<AuthResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchAPI<AuthResponse>('/auth/magic-link/verify', {
          method: 'POST',
          body: JSON.stringify({ token }),
        });

        if (data.user) {
          updateUser(data.user);
        }

        if (data.csrfToken) {
          setCsrfToken(data.csrfToken);
        }

        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Magic link verification failed');
        handleError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchAPI, updateUser, handleError]
  );

  // ═══════════════════════════════════════════════════════════════
  // PASSWORD RESET METHODS
  // ═══════════════════════════════════════════════════════════════

  const forgotPassword = useCallback(
    async (email: string): Promise<PasswordlessResponse> => {
      try {
        return await fetchAPI<PasswordlessResponse>('/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email }),
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to request password reset');
        handleError(error);
        throw error;
      }
    },
    [fetchAPI, handleError]
  );

  const resetPassword = useCallback(
    async (token: string, newPassword: string): Promise<PasswordlessResponse> => {
      try {
        return await fetchAPI<PasswordlessResponse>('/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({ token, newPassword }),
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to reset password');
        handleError(error);
        throw error;
      }
    },
    [fetchAPI, handleError]
  );

  // ═══════════════════════════════════════════════════════════════
  // EMAIL VERIFICATION METHODS
  // ═══════════════════════════════════════════════════════════════

  const verifyEmail = useCallback(
    async (token: string): Promise<PasswordlessResponse> => {
      try {
        const data = await fetchAPI<PasswordlessResponse>('/auth/verify-email', {
          method: 'POST',
          body: JSON.stringify({ token }),
        });

        // Refresh user data after verification
        if (user) {
          await refetchUser();
        }

        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Email verification failed');
        handleError(error);
        throw error;
      }
    },
    [fetchAPI, handleError, user]
  );

  const resendVerificationEmail = useCallback(
    async (): Promise<PasswordlessResponse> => {
      try {
        return await fetchAPI<PasswordlessResponse>('/auth/resend-verification', {
          method: 'POST',
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to resend verification email');
        handleError(error);
        throw error;
      }
    },
    [fetchAPI, handleError]
  );

  // ═══════════════════════════════════════════════════════════════
  // USER MANAGEMENT METHODS
  // ═══════════════════════════════════════════════════════════════

  const updateProfile = useCallback(
    async (data: UpdateProfileData): Promise<User> => {
      try {
        const response = await fetchAPI<{ user: User }>('/user/profile', {
          method: 'PATCH',
          body: JSON.stringify(data),
        });

        if (response.user) {
          updateUser(response.user);
        }

        return response.user;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update profile');
        handleError(error);
        throw error;
      }
    },
    [fetchAPI, updateUser, handleError]
  );

  const refetchUser = useCallback(async (): Promise<void> => {
    try {
      const data = await fetchAPI<AuthResponse>('/auth/status');
      if (data.user) {
        updateUser(data.user);
      }
    } catch (err) {
      // If status check fails, user might not be authenticated
      updateUser(null);
      setCsrfToken(null);
    }
  }, [fetchAPI, updateUser]);

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZATION & AUTO-REFRESH
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    isMountedRef.current = true;

    // Initialize: Check auth status
    const initialize = async () => {
      setIsLoading(true);

      // Try to load from storage first
      const savedUser = loadSession();
      if (savedUser) {
        setUser(savedUser);
      }

      // Verify with server
      try {
        const data = await fetchAPI<AuthResponse>('/auth/status');
        if (data.user) {
          updateUser(data.user);
        }
        if (data.csrfToken) {
          setCsrfToken(data.csrfToken);
        }
      } catch (err) {
        // Not authenticated or network error
        updateUser(null);
        setCsrfToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();

    return () => {
      isMountedRef.current = false;
    };
  }, []); // Only run once on mount

  useEffect(() => {
    // Setup auto-refresh if enabled and user is authenticated
    if (autoRefreshToken && user) {
      refreshIntervalRef.current = setInterval(() => {
        refreshToken();
      }, tokenRefreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [autoRefreshToken, user, tokenRefreshInterval, refreshToken]);

  // ═══════════════════════════════════════════════════════════════
  // CONTEXT VALUE
  // ═══════════════════════════════════════════════════════════════

  const contextValue = useMemo(
    () => ({
      // State
      user,
      isAuthenticated: !!user,
      isLoading,
      error,
      csrfToken,

      // Auth Methods
      login,
      register,
      logout,
      logoutAll,
      refreshToken,

      // OAuth Methods
      loginWithGoogle,
      loginWithMicrosoft,
      loginWithApple,
      loginWithProvider,
      handleOAuthCallback,
      handleGoogleOneTap,

      // Passwordless Methods
      sendMagicLink,
      verifyMagicLink,

      // Password Reset
      forgotPassword,
      resetPassword,

      // Email Verification
      verifyEmail,
      resendVerificationEmail,

      // User Management
      updateProfile,
      refetchUser,

      // CSRF
      refreshCsrfToken,
    }),
    [
      user,
      isLoading,
      error,
      csrfToken,
      login,
      register,
      logout,
      logoutAll,
      refreshToken,
      loginWithGoogle,
      loginWithMicrosoft,
      loginWithApple,
      loginWithProvider,
      handleOAuthCallback,
      handleGoogleOneTap,
      sendMagicLink,
      verifyMagicLink,
      forgotPassword,
      resetPassword,
      verifyEmail,
      resendVerificationEmail,
      updateProfile,
      refetchUser,
      refreshCsrfToken,
    ]
  );

  return (
    <TrafAuthContext.Provider value={contextValue}>
      {children}
    </TrafAuthContext.Provider>
  );
};
