/**
 * Session Manager Component
 * View and manage active user sessions
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Session, ComponentStyles } from '../types';
import { getButtonStyles, getErrorStyles, mergeStyles } from '../utils/styles';

export interface SessionManagerProps {
  /** Show device information */
  showDeviceInfo?: boolean;
  /** Show location information */
  showLocation?: boolean;
  /** Allow revoking all sessions */
  allowRevokeAll?: boolean;
  /** Callback on session revoked */
  onSessionRevoked?: (sessionId: string) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** API base URL */
  apiUrl?: string;
  /** Custom class name */
  className?: string;
  /** Custom styles */
  styles?: ComponentStyles;
}

export const SessionManager: React.FC<SessionManagerProps> = ({
  showDeviceInfo = true,
  showLocation = true,
  allowRevokeAll = true,
  onSessionRevoked,
  onError,
  apiUrl = '/api/auth',
  className = '',
  styles = {},
}) => {
  const { theme } = useTheme();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiUrl}/sessions`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch sessions');
      }

      setSessions(data.sessions || []);
    } catch (err: any) {
      setError(err.message);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setRevoking(sessionId);
    setError('');

    try {
      const response = await fetch(`${apiUrl}/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to revoke session');
      }

      // Remove session from list
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      onSessionRevoked?.(sessionId);
    } catch (err: any) {
      setError(err.message);
      onError?.(err);
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    if (!confirm('Are you sure you want to revoke all other sessions? You will be logged out on all other devices.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiUrl}/sessions`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to revoke sessions');
      }

      // Refresh sessions
      await fetchSessions();
    } catch (err: any) {
      setError(err.message);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
  };

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'mobile':
        return '📱';
      case 'tablet':
        return '📱';
      case 'desktop':
        return '💻';
      default:
        return '🖥️';
    }
  };

  const containerStyle: React.CSSProperties = mergeStyles(
    {
      width: '100%',
      maxWidth: '800px',
      fontFamily: theme.fonts.family,
    },
    styles.container
  );

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  };

  const sessionListStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
  };

  const sessionCardStyle = (isCurrent: boolean, isSuspicious: boolean): React.CSSProperties => ({
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    border: `2px solid ${
      isCurrent
        ? theme.colors.primary
        : isSuspicious
        ? theme.colors.error
        : theme.colors.border
    }`,
    padding: theme.spacing.lg,
    position: 'relative',
  });

  const sessionHeaderStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  };

  const deviceInfoStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    fontSize: '16px',
    fontWeight: '500',
  };

  const sessionDetailsStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
    fontSize: '14px',
    color: theme.colors.textSecondary,
  };

  const badgeStyle = (type: 'current' | 'suspicious' | 'new'): React.CSSProperties => {
    let bgColor = theme.colors.infoLight;
    let color = theme.colors.info;

    if (type === 'suspicious') {
      bgColor = theme.colors.errorLight;
      color = theme.colors.error;
    } else if (type === 'new') {
      bgColor = theme.colors.warningLight;
      color = theme.colors.warning;
    }

    return {
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: theme.borderRadius.sm,
      backgroundColor: bgColor,
      color,
      fontSize: '12px',
      fontWeight: '500',
      marginLeft: theme.spacing.sm,
    };
  };

  const warningBoxStyle: React.CSSProperties = {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.errorLight,
    border: `1px solid ${theme.colors.error}`,
    borderRadius: theme.borderRadius.md,
    color: theme.colors.error,
    fontSize: '13px',
    marginTop: theme.spacing.sm,
  };

  if (loading && sessions.length === 0) {
    return (
      <div className={className} style={containerStyle}>
        <div style={{ textAlign: 'center', padding: theme.spacing.xl }}>
          Loading sessions...
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0, marginBottom: theme.spacing.xs }}>Active Sessions</h2>
          <p style={{ margin: 0, color: theme.colors.textSecondary, fontSize: '14px' }}>
            {sessions.length} active session{sessions.length !== 1 ? 's' : ''}
          </p>
        </div>
        {allowRevokeAll && sessions.filter(s => !s.isCurrent).length > 0 && (
          <button
            onClick={handleRevokeAllOthers}
            disabled={loading}
            style={getButtonStyles(theme, 'danger', 'sm', loading)}
          >
            Revoke All Others
          </button>
        )}
      </div>

      {error && <div style={getErrorStyles(theme)}>{error}</div>}

      <div style={sessionListStyle}>
        {sessions.map((session) => (
          <div key={session.id} style={sessionCardStyle(session.isCurrent, session.isSuspicious || false)}>
            <div style={sessionHeaderStyle}>
              <div>
                <div style={deviceInfoStyle}>
                  <span>{getDeviceIcon(session.device)}</span>
                  <span>
                    {session.browser} on {session.os}
                  </span>
                  {session.isCurrent && <span style={badgeStyle('current')}>Current</span>}
                  {session.isNewDevice && <span style={badgeStyle('new')}>New Device</span>}
                  {session.isSuspicious && <span style={badgeStyle('suspicious')}>Suspicious</span>}
                </div>

                {showDeviceInfo && (
                  <div style={sessionDetailsStyle}>
                    <div>IP Address: {session.ip}</div>
                    {showLocation && session.location && (
                      <div>
                        Location: {session.location.city}, {session.location.country}
                      </div>
                    )}
                    <div>First seen: {formatDate(session.createdAt)}</div>
                    <div>Last active: {formatDate(session.lastActivityAt)}</div>
                  </div>
                )}

                {session.isSuspicious && session.suspiciousReasons && session.suspiciousReasons.length > 0 && (
                  <div style={warningBoxStyle}>
                    <strong>Security Alert:</strong>
                    <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                      {session.suspiciousReasons.map((reason, idx) => (
                        <li key={idx}>{reason.replace(/_/g, ' ')}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {!session.isCurrent && (
                <button
                  onClick={() => handleRevokeSession(session.id)}
                  disabled={revoking === session.id}
                  style={getButtonStyles(theme, 'outline', 'sm', revoking === session.id)}
                >
                  {revoking === session.id ? 'Revoking...' : 'Revoke'}
                </button>
              )}
            </div>
          </div>
        ))}

        {sessions.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: theme.spacing.xl,
              color: theme.colors.textSecondary,
            }}
          >
            No active sessions found
          </div>
        )}
      </div>
    </div>
  );
};
