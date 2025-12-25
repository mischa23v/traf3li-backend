/**
 * @traf3li/auth-react - usePasswordless Hook
 * Passwordless authentication hook (Magic Links, OTP)
 */

import { useState, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import type {
  UsePasswordlessReturn,
  MagicLinkOptions,
  OTPOptions,
  PasswordlessResponse,
  AuthResponse,
} from '../types';

/**
 * usePasswordless Hook
 *
 * Passwordless authentication methods (Magic Links, OTP)
 *
 * @example
 * ```tsx
 * const {
 *   sendMagicLink,
 *   verifyMagicLink,
 *   sendOTP,
 *   verifyOTP,
 *   isLoading,
 *   error
 * } = usePasswordless();
 *
 * // Send magic link
 * await sendMagicLink({
 *   email: 'user@example.com',
 *   purpose: 'login',
 *   redirectUrl: '/dashboard'
 * });
 *
 * // Verify magic link (from URL parameter)
 * await verifyMagicLink(token);
 * ```
 */
export const usePasswordless = (): UsePasswordlessReturn => {
  const {
    sendMagicLink: sendMagicLinkContext,
    verifyMagicLink: verifyMagicLinkContext,
  } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Send magic link
   */
  const sendMagicLink = useCallback(
    async (options: MagicLinkOptions): Promise<PasswordlessResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await sendMagicLinkContext(options);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to send magic link');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [sendMagicLinkContext]
  );

  /**
   * Verify magic link
   */
  const verifyMagicLink = useCallback(
    async (token: string): Promise<AuthResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await verifyMagicLinkContext(token);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to verify magic link');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [verifyMagicLinkContext]
  );

  /**
   * Send OTP (SMS/WhatsApp)
   */
  const sendOTP = useCallback(
    async (options: OTPOptions): Promise<PasswordlessResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/auth/otp/send', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(options),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to send OTP');
        }

        const data: PasswordlessResponse = await response.json();
        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to send OTP');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Verify OTP
   */
  const verifyOTP = useCallback(
    async (phone: string, code: string): Promise<AuthResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/auth/otp/verify', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phone, code }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to verify OTP');
        }

        const data: AuthResponse = await response.json();
        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to verify OTP');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return useMemo(
    () => ({
      sendMagicLink,
      verifyMagicLink,
      sendOTP,
      verifyOTP,
      isLoading,
      error,
    }),
    [sendMagicLink, verifyMagicLink, sendOTP, verifyOTP, isLoading, error]
  );
};
