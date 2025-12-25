/**
 * Forgot Password Form Component
 * Request password reset link via email
 */

import React, { useState, FormEvent } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { ComponentStyles } from '../types';
import { getButtonStyles, getInputStyles, getLabelStyles, getErrorStyles, mergeStyles } from '../utils/styles';

export interface ForgotPasswordFormProps {
  /** Callback on success */
  onSuccess?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Callback to navigate back to login */
  onBackToLogin?: () => void;
  /** API base URL */
  apiUrl?: string;
  /** Custom class name */
  className?: string;
  /** Custom styles */
  styles?: ComponentStyles;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSuccess,
  onError,
  onBackToLogin,
  apiUrl = '/api/auth',
  className = '',
  styles = {},
}) => {
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.messageEn || 'Failed to send reset link');
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
          Check Your Email
        </h2>
        <div style={successMessageStyle}>
          <p style={{ margin: 0, marginBottom: theme.spacing.sm }}>
            We've sent a password reset link to <strong>{email}</strong>
          </p>
          <p style={{ margin: 0 }}>
            Click the link in the email to reset your password. The link will expire in 30 minutes.
          </p>
        </div>
        <button
          onClick={onBackToLogin || (() => window.location.href = '/login')}
          style={mergeStyles(
            getButtonStyles(theme, 'outline', 'md', false, true),
            { marginTop: theme.spacing.lg }
          )}
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className={className} style={containerStyle}>
      <h2 style={{ margin: 0, marginBottom: theme.spacing.sm, textAlign: 'center' }}>
        Forgot Password?
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
        Enter your email address and we'll send you a link to reset your password.
      </p>

      <form onSubmit={handleSubmit} style={formStyle}>
        <div style={inputGroupStyle}>
          <label style={getLabelStyles(theme)}>Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={loading}
            style={mergeStyles(getInputStyles(theme, !!error), styles.input)}
          />
        </div>

        {error && <div style={getErrorStyles(theme)}>{error}</div>}

        <button
          type="submit"
          disabled={loading || !email}
          style={mergeStyles(getButtonStyles(theme, 'primary', 'md', loading || !email, true), styles.button)}
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>

        <button
          type="button"
          onClick={onBackToLogin || (() => window.location.href = '/login')}
          disabled={loading}
          style={mergeStyles(getButtonStyles(theme, 'ghost', 'md', loading, true))}
        >
          Back to Login
        </button>
      </form>
    </div>
  );
};
