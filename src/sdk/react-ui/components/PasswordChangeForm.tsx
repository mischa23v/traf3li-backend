/**
 * Password Change Form Component
 * Allow authenticated users to change their password
 */

import React, { useState, FormEvent } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { ComponentStyles } from '../types';
import { PasswordStrength } from './PasswordStrength';
import { getButtonStyles, getInputStyles, getLabelStyles, getErrorStyles, mergeStyles } from '../utils/styles';

export interface PasswordChangeFormProps {
  /** Callback on success */
  onSuccess?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Show password strength indicator */
  showPasswordStrength?: boolean;
  /** API base URL */
  apiUrl?: string;
  /** Custom class name */
  className?: string;
  /** Custom styles */
  styles?: ComponentStyles;
}

export const PasswordChangeForm: React.FC<PasswordChangeFormProps> = ({
  onSuccess,
  onError,
  showPasswordStrength = true,
  apiUrl = '/api/auth',
  className = '',
  styles = {},
}) => {
  const { theme } = useTheme();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    // Validate password strength
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    // Validate new password is different from current
    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.messageEn || 'Failed to change password');
      }

      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
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
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  };

  return (
    <div className={className} style={containerStyle}>
      <h2 style={{ margin: 0, marginBottom: theme.spacing.lg, textAlign: 'center' }}>
        Change Password
      </h2>

      {success && (
        <div style={successMessageStyle}>
          Password changed successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} style={formStyle}>
        <div style={inputGroupStyle}>
          <label style={getLabelStyles(theme)}>Current Password</label>
          <div style={passwordContainerStyle}>
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              required
              disabled={loading}
              style={mergeStyles(getInputStyles(theme, !!error), styles.input)}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              style={passwordToggleStyle}
              tabIndex={-1}
            >
              {showCurrentPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div style={inputGroupStyle}>
          <label style={getLabelStyles(theme)}>New Password</label>
          <div style={passwordContainerStyle}>
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
              disabled={loading}
              style={mergeStyles(getInputStyles(theme, !!error), styles.input)}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              style={passwordToggleStyle}
              tabIndex={-1}
            >
              {showNewPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {showPasswordStrength && newPassword && (
          <PasswordStrength password={newPassword} />
        )}

        <div style={inputGroupStyle}>
          <label style={getLabelStyles(theme)}>Confirm New Password</label>
          <div style={passwordContainerStyle}>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
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
          disabled={loading || !currentPassword || !newPassword || !confirmPassword}
          style={mergeStyles(
            getButtonStyles(theme, 'primary', 'md', loading || !currentPassword || !newPassword || !confirmPassword, true),
            styles.button
          )}
        >
          {loading ? 'Changing Password...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
};
