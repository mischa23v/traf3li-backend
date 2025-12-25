/**
 * Reset Password Form Component
 * Reset password with token from email
 */

import React, { useState, FormEvent } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { ComponentStyles } from '../types';
import { PasswordStrength } from './PasswordStrength';
import { getButtonStyles, getInputStyles, getLabelStyles, getErrorStyles, mergeStyles } from '../utils/styles';

export interface ResetPasswordFormProps {
  /** Reset token from URL */
  token: string;
  /** Callback on success */
  onSuccess?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Show password requirements */
  passwordRequirements?: boolean;
  /** API base URL */
  apiUrl?: string;
  /** Custom class name */
  className?: string;
  /** Custom styles */
  styles?: ComponentStyles;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  token,
  onSuccess,
  onError,
  passwordRequirements = true,
  apiUrl = '/api/auth',
  className = '',
  styles = {},
}) => {
  const { theme } = useTheme();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.messageEn || 'Failed to reset password');
      }

      setSuccess(true);
      onSuccess?.();
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

  const formStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
  };

  const inputGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
  };

  const passwordContainerStyle: React.CSSProperties = {
    position: 'relative',
  };

  const passwordToggleStyle: React.CSSProperties = {
    position: 'absolute',
    right: theme.spacing.md,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: theme.colors.textSecondary,
    fontSize: '14px',
    padding: '4px 8px',
  };

  const successMessageStyle: React.CSSProperties = {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.successLight,
    color: theme.colors.success,
    fontSize: '14px',
    lineHeight: '1.5',
    textAlign: 'center',
  };

  if (success) {
    return (
      <div className={className} style={containerStyle}>
        <h2 style={{ margin: 0, marginBottom: theme.spacing.lg, textAlign: 'center' }}>
          Password Reset Successful
        </h2>
        <div style={successMessageStyle}>
          <p style={{ margin: 0, marginBottom: theme.spacing.sm }}>
            Your password has been successfully reset.
          </p>
          <p style={{ margin: 0 }}>
            You can now sign in with your new password.
          </p>
        </div>
        <button
          onClick={() => window.location.href = '/login'}
          style={mergeStyles(
            getButtonStyles(theme, 'primary', 'md', false, true),
            { marginTop: theme.spacing.lg }
          )}
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className={className} style={containerStyle}>
      <h2 style={{ margin: 0, marginBottom: theme.spacing.sm, textAlign: 'center' }}>
        Reset Your Password
      </h2>
      <p
        style={{
          margin: 0,
          marginBottom: theme.spacing.lg,
          textAlign: 'center',
          color: theme.colors.textSecondary,
          fontSize: '14px',
        }}
      >
        Enter your new password below.
      </p>

      <form onSubmit={handleSubmit} style={formStyle}>
        <div style={inputGroupStyle}>
          <label style={getLabelStyles(theme)}>New Password</label>
          <div style={passwordContainerStyle}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              required
              disabled={loading}
              style={mergeStyles(getInputStyles(theme, !!error), styles.input)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={passwordToggleStyle}
              tabIndex={-1}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {passwordRequirements && password && (
          <PasswordStrength password={password} />
        )}

        <div style={inputGroupStyle}>
          <label style={getLabelStyles(theme)}>Confirm New Password</label>
          <div style={passwordContainerStyle}>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
              disabled={loading}
              style={mergeStyles(getInputStyles(theme, !!error), styles.input)}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={passwordToggleStyle}
              tabIndex={-1}
            >
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {error && <div style={getErrorStyles(theme)}>{error}</div>}

        <button
          type="submit"
          disabled={loading || !password || !confirmPassword}
          style={mergeStyles(
            getButtonStyles(theme, 'primary', 'md', loading || !password || !confirmPassword, true),
            styles.button
          )}
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
};
