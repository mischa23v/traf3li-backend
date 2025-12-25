/**
 * @traf3li/auth-react - useAuth Hook
 * Main authentication hook
 */

import { useContext } from 'react';
import { TrafAuthContext } from '../context';
import type { UseAuthReturn } from '../types';

/**
 * useAuth Hook
 *
 * Access authentication state and methods
 *
 * @example
 * ```tsx
 * const {
 *   user,
 *   isAuthenticated,
 *   isLoading,
 *   login,
 *   logout,
 *   loginWithGoogle
 * } = useAuth();
 * ```
 *
 * @throws {Error} If used outside TrafAuthProvider
 */
export const useAuth = (): UseAuthReturn => {
  const context = useContext(TrafAuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within a TrafAuthProvider. ' +
      'Wrap your app with <TrafAuthProvider> to use this hook.'
    );
  }

  return context;
};
