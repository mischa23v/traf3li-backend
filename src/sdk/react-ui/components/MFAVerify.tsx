/**
 * MFA Verify Component
 * Verify TOTP code or backup code during login
 */

import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { User, ComponentStyles } from '../types';
import { OTPInput } from './OTPInput';
import { getButtonStyles, getInputStyles, getLabelStyles, getErrorStyles, mergeStyles } from '../utils/styles';

export interface MFAVerifyProps {
  /** User ID for MFA verification */
  userId: string;
  /** Callback on successful verification */
  onSuccess: (user: User) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Show backup code option */
  showBackupCodeOption?: boolean;
  /** API base URL */
  apiUrl?: string;
  /** Custom class name */
  className?: string;
  /** Custom styles */
  styles?: ComponentStyles;
}

export const MFAVerify: React.FC<MFAVerifyProps> = ({
  userId,
  onSuccess,
  onError,
  showBackupCodeOption = true,
  apiUrl = '/api/auth',
  className = '',
  styles = {},
}) => {
  const { theme } = useTheme();

  const [mode, setMode] = useState<'totp' | 'backup'>('totp');
  const [backupCode, setBackupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTOTPVerify = async (code: string) => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/mfa/totp/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          totpCode: code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.messageEn || 'Invalid verification code');
      }

      onSuccess(data.user);
    } catch (err: any) {
      setError(err.message);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackupCodeVerify = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/mfa/backup-codes/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          code: backupCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.messageEn || 'Invalid backup code');
      }

      if (!data.valid) {
        throw new Error('Invalid backup code');
      }

      // Fetch user data after successful verification
      const userResponse = await fetch(`${apiUrl}/me`, {
        credentials: 'include',
      });
      const userData = await userResponse.json();

      onSuccess(userData.data);
    } catch (err: any) {
      setError(err.message);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const containerStyle: React.CSSProperties = mergeStyles(
    {
      width: '100%',
      maxWidth: '400px',
      fontFamily: theme.fonts.family,
    },
    styles.container
  );

  const linkStyle: React.CSSProperties = {
    color: theme.colors.primary,
    textDecoration: 'none',
    fontSize: '14px',
    cursor: 'pointer',
    ':hover': {
      textDecoration: 'underline',
    },
  };

  const inputGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
  };

  const infoBoxStyle: React.CSSProperties = {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.infoLight,
    border: `1px solid ${theme.colors.info}`,
    borderRadius: theme.borderRadius.md,
    fontSize: '13px',
    lineHeight: '1.5',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  };

  if (mode === 'backup') {
    return (
      <div className={className} style={containerStyle}>
        <h2 style={{ margin: 0, marginBottom: theme.spacing.sm, textAlign: 'center' }}>
          Use Backup Code
        </h2>
        <p style={{ textAlign: 'center', color: theme.colors.textSecondary, marginBottom: theme.spacing.lg }}>
          Enter one of your backup codes
        </p>

        <div style={infoBoxStyle}>
          Backup codes are provided when you set up two-factor authentication. Each code can only be used once.
        </div>

        <div style={inputGroupStyle}>
          <label style={getLabelStyles(theme)}>Backup Code</label>
          <input
            type="text"
            value={backupCode}
            onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX"
            disabled={loading}
            style={mergeStyles(getInputStyles(theme, !!error), styles.input, {
              fontFamily: theme.fonts.familyMono,
              textAlign: 'center',
            })}
          />
        </div>

        {error && <div style={getErrorStyles(theme)}>{error}</div>}

        <button
          onClick={handleBackupCodeVerify}
          disabled={loading || !backupCode}
          style={mergeStyles(
            getButtonStyles(theme, 'primary', 'md', loading || !backupCode, true),
            { marginTop: theme.spacing.lg }
          )}
        >
          {loading ? 'Verifying...' : 'Verify Backup Code'}
        </button>

        <div style={{ textAlign: 'center', marginTop: theme.spacing.lg }}>
          <a
            onClick={() => {
              setMode('totp');
              setBackupCode('');
              setError('');
            }}
            style={linkStyle}
          >
            Use authenticator app instead
          </a>
        </div>
      </div>
    );
  }

  // TOTP mode (default)
  return (
    <div className={className} style={containerStyle}>
      <h2 style={{ margin: 0, marginBottom: theme.spacing.sm, textAlign: 'center' }}>
        Two-Factor Authentication
      </h2>
      <p style={{ textAlign: 'center', color: theme.colors.textSecondary, marginBottom: theme.spacing.lg }}>
        Enter the 6-digit code from your authenticator app
      </p>

      <OTPInput
        length={6}
        onComplete={handleTOTPVerify}
        autoSubmit={true}
        error={!!error}
        errorMessage={error}
        disabled={loading}
      />

      {showBackupCodeOption && (
        <div style={{ textAlign: 'center', marginTop: theme.spacing.lg }}>
          <a
            onClick={() => {
              setMode('backup');
              setError('');
            }}
            style={linkStyle}
          >
            Use a backup code instead
          </a>
        </div>
      )}
    </div>
  );
};
