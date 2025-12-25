/**
 * @traf3li/auth-react - useUser Hook
 * User profile management hook
 */

import { useMemo } from 'react';
import { useAuth } from './useAuth';
import type { UseUserReturn } from '../types';

/**
 * useUser Hook
 *
 * Simplified hook focused on user data and profile management
 *
 * @example
 * ```tsx
 * const {
 *   user,
 *   isLoading,
 *   error,
 *   refetch,
 *   updateProfile
 * } = useUser();
 *
 * // Update user profile
 * await updateProfile({
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   phone: '+966501234567'
 * });
 * ```
 */
export const useUser = (): UseUserReturn => {
  const {
    user,
    isLoading,
    error,
    refetchUser,
    updateProfile,
  } = useAuth();

  return useMemo(
    () => ({
      user,
      isLoading,
      error,
      refetch: refetchUser,
      updateProfile,
    }),
    [user, isLoading, error, refetchUser, updateProfile]
  );
};
