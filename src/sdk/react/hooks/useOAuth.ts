/**
 * @traf3li/auth-react - useOAuth Hook
 * OAuth authentication hook
 */

import { useState, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import type {
  UseOAuthReturn,
  OAuthProvider,
  OAuthCallbackParams,
  AuthResponse,
} from '../types';

/**
 * useOAuth Hook
 *
 * OAuth social authentication (Google, Microsoft, Apple, GitHub)
 *
 * @example
 * ```tsx
 * const {
 *   loginWithProvider,
 *   handleCallback,
 *   availableProviders,
 *   isLoading
 * } = useOAuth();
 *
 * // Login with Google
 * <button onClick={() => loginWithProvider('google')}>
 *   Sign in with Google
 * </button>
 *
 * // Handle OAuth callback
 * useEffect(() => {
 *   const params = new URLSearchParams(window.location.search);
 *   if (params.get('code')) {
 *     handleCallback({
 *       code: params.get('code'),
 *       state: params.get('state')
 *     });
 *   }
 * }, []);
 * ```
 */
export const useOAuth = (): UseOAuthReturn => {
  const {
    loginWithProvider: loginWithProviderContext,
    handleOAuthCallback: handleOAuthCallbackContext,
  } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Available OAuth providers
  const availableProviders: OAuthProvider[] = useMemo(
    () => ['google', 'microsoft', 'apple', 'github'],
    []
  );

  /**
   * Login with OAuth provider
   */
  const loginWithProvider = useCallback(
    async (provider: OAuthProvider, redirectUri?: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        // This will redirect, so loading state won't be reset
        await loginWithProviderContext(provider);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('OAuth login failed');
        setError(error);
        setIsLoading(false);
        throw error;
      }
    },
    [loginWithProviderContext]
  );

  /**
   * Handle OAuth callback
   */
  const handleCallback = useCallback(
    async (params: OAuthCallbackParams): Promise<AuthResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await handleOAuthCallbackContext(params);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('OAuth callback failed');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [handleOAuthCallbackContext]
  );

  return useMemo(
    () => ({
      loginWithProvider,
      handleCallback,
      availableProviders,
      isLoading,
      error,
    }),
    [loginWithProvider, handleCallback, availableProviders, isLoading, error]
  );
};
