/**
 * @traf3li/auth-react - useSessions Hook
 * Session management hook
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import type { UseSessionsReturn, Session } from '../types';

/**
 * useSessions Hook
 *
 * Manage active sessions across devices
 *
 * @example
 * ```tsx
 * const {
 *   sessions,
 *   currentSession,
 *   isLoading,
 *   revokeSession,
 *   revokeAllOther
 * } = useSessions();
 *
 * // List all active sessions
 * sessions.map(session => (
 *   <SessionCard
 *     key={session._id}
 *     session={session}
 *     onRevoke={() => revokeSession(session._id)}
 *   />
 * ));
 *
 * // Logout from all other devices
 * await revokeAllOther();
 * ```
 */
export const useSessions = (): UseSessionsReturn => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch all active sessions
   */
  const fetchSessions = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sessions', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }

      const data = await response.json();

      if (data.sessions) {
        setSessions(data.sessions);

        // Find current session (marked by backend)
        const current = data.sessions.find((s: Session) => s.isCurrent);
        setCurrentSession(current || null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch sessions');
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Revoke a specific session
   */
  const revokeSession = useCallback(
    async (sessionId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to revoke session');
        }

        // Refresh sessions list
        await fetchSessions();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to revoke session');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchSessions]
  );

  /**
   * Revoke all sessions except current
   */
  const revokeAllOther = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sessions/revoke-all-other', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to revoke other sessions');
      }

      // Refresh sessions list
      await fetchSessions();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to revoke other sessions');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [fetchSessions]);

  /**
   * Fetch sessions on mount and when user changes
   */
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    currentSession,
    isLoading,
    error,
    revokeSession,
    revokeAllOther,
    refetch: fetchSessions,
  };
};
