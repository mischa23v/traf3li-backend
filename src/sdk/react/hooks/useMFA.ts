/**
 * @traf3li/auth-react - useMFA Hook
 * Multi-Factor Authentication management hook
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import type {
  UseMFAReturn,
  MFASetupResponse,
  MFAVerifyResponse,
  MFAStatusResponse,
} from '../types';

/**
 * useMFA Hook
 *
 * Manage Multi-Factor Authentication (MFA/2FA)
 *
 * @example
 * ```tsx
 * const {
 *   isEnabled,
 *   isLoading,
 *   setupMFA,
 *   verifySetup,
 *   disable,
 *   backupCodes,
 *   regenerateBackupCodes
 * } = useMFA();
 *
 * // Enable MFA
 * const { qrCode, secret, backupCodes } = await setupMFA();
 * // Show QR code to user
 * // User scans with authenticator app
 * await verifySetup(totpCode);
 * ```
 */
export const useMFA = (): UseMFAReturn => {
  const { user, refetchUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [backupCodesRemaining, setBackupCodesRemaining] = useState(0);

  const isEnabled = user?.mfaEnabled ?? false;

  // Fetch MFA status on mount
  useEffect(() => {
    const fetchMFAStatus = async () => {
      if (!user) return;

      try {
        const response = await fetch('/api/mfa/status', {
          credentials: 'include',
        });

        if (!response.ok) return;

        const data: MFAStatusResponse = await response.json();
        if (data.backupCodesRemaining !== undefined) {
          setBackupCodesRemaining(data.backupCodesRemaining);
        }
      } catch (err) {
        console.error('Failed to fetch MFA status:', err);
      }
    };

    fetchMFAStatus();
  }, [user]);

  /**
   * Setup MFA - Generate QR code and secret
   */
  const setupMFA = useCallback(async (): Promise<MFASetupResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mfa/setup', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to setup MFA');
      }

      const data: MFASetupResponse = await response.json();

      // Store backup codes
      if (data.backupCodes) {
        setBackupCodes(data.backupCodes);
        setBackupCodesRemaining(data.backupCodes.length);
      }

      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to setup MFA');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Verify MFA setup with TOTP code
   */
  const verifySetup = useCallback(
    async (code: string): Promise<MFAVerifyResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/mfa/verify-setup', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to verify MFA setup');
        }

        const data: MFAVerifyResponse = await response.json();

        // Refresh user data to update mfaEnabled status
        await refetchUser();

        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to verify MFA setup');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [refetchUser]
  );

  /**
   * Disable MFA
   */
  const disable = useCallback(
    async (password: string): Promise<{ success: boolean }> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/mfa/disable', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to disable MFA');
        }

        const data = await response.json();

        // Clear backup codes
        setBackupCodes(null);
        setBackupCodesRemaining(0);

        // Refresh user data
        await refetchUser();

        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to disable MFA');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [refetchUser]
  );

  /**
   * Regenerate backup codes
   */
  const regenerateBackupCodes = useCallback(
    async (password: string): Promise<string[]> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/mfa/regenerate-backup-codes', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to regenerate backup codes');
        }

        const data = await response.json();

        if (data.backupCodes) {
          setBackupCodes(data.backupCodes);
          setBackupCodesRemaining(data.backupCodes.length);
        }

        return data.backupCodes;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to regenerate backup codes');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Refresh MFA status
   */
  const refetch = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      const response = await fetch('/api/mfa/status', {
        credentials: 'include',
      });

      if (!response.ok) return;

      const data: MFAStatusResponse = await response.json();
      if (data.backupCodesRemaining !== undefined) {
        setBackupCodesRemaining(data.backupCodesRemaining);
      }
    } catch (err) {
      console.error('Failed to refetch MFA status:', err);
    }
  }, [user]);

  return {
    isEnabled,
    isLoading,
    error,
    setupMFA,
    verifySetup,
    disable,
    backupCodes,
    backupCodesRemaining,
    regenerateBackupCodes,
    refetch,
  };
};
