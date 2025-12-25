/**
 * Login Form Component
 * Comprehensive login form with email/password, social logins, magic link, and MFA support
 */

import React, { useState, FormEvent } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { User, OAuthProvider, ComponentStyles } from '../types';
import { SocialLoginButtons } from './SocialLoginButtons';
import { OTPInput } from './OTPInput';
import { getButtonStyles, getInputStyles, getLabelStyles, getErrorStyles, mergeStyles } from '../utils/styles';

export interface LoginFormProps {
  /** Callback on successful login */
  onSuccess: (user: User) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Show social login buttons */
  showSocialLogins?: boolean;
  /** Social login providers */
  providers?: OAuthProvider[];
  /** Callback for social login */
  onSocialLogin?: (provider: OAuthProvider) => void;
  /** Show magic link option */
  showMagicLink?: boolean;
  /** Callback for magic link request */
  onMagicLinkRequest?: (email: string) => Promise<void>;
  /** Show remember me checkbox */
  showRememberMe?: boolean;
  /** Redirect URL after login */
  redirectUrl?: string;
  /** API base URL */
  apiUrl?: string;
  /** Custom class name */
  className?: string;
  /** Custom styles */
  styles?: ComponentStyles;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onError,
  showSocialLogins = true,
  providers = ['google', 'microsoft'],
  onSocialLogin,
  showMagicLink = true,
  onMagicLinkRequest,
  showRememberMe = true,
  redirectUrl,
  apiUrl = '/api/auth',
  className = '',
  styles = {},
}) => {
  const { theme } = useTheme();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<'login' | 'magicLink' | 'mfa'>('login');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [userId, setUserId] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
          rememberMe,
          redirectUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.messageEn || 'Login failed');
      }

      // Check if MFA is required
      if (data.mfaRequired) {
        setMfaRequired(true);
        setUserId(data.userId);
        setView('mfa');
        return;
      }

      // Success
      onSuccess(data.user);
    } catch (err: any) {
      setError(err.message);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (onMagicLinkRequest) {
        await onMagicLinkRequest(email);
      } else {
        const response = await fetch(`${apiUrl}/magic-link/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            purpose: 'login',
            redirectUrl,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || data.messageEn || 'Failed to send magic link');
        }
      }

      setMagicLinkSent(true);
    } catch (err: any) {
      setError(err.message);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMFAVerify = async (code: string) => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/mfa/verify`, {
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
        throw new Error(data.message || data.messageEn || 'Invalid MFA code');
      }

      onSuccess(data.user);
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

  const checkboxContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
  };

  const linkStyle: React.CSSProperties = {
    color: theme.colors.primary,
    textDecoration: 'none',
    fontSize: '14px',
    cursor: 'pointer',
    ':hover': {
      textDecoration: 'underline',
    },
  };

  const dividerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
    margin: `${theme.spacing.md} 0`,
    color: theme.colors.textSecondary,
    fontSize: '14px',
  };

  const dividerLineStyle: React.CSSProperties = {
    flex: 1,
    height: '1px',
    backgroundColor: theme.colors.border,
  };

  // MFA View
  if (view === 'mfa') {
    return (
      <div className={className} style={containerStyle}>
        <h2 style={{ margin: 0, marginBottom: theme.spacing.lg, textAlign: 'center' }}>
          Two-Factor Authentication
        </h2>
        <p style={{ textAlign: 'center', color: theme.colors.textSecondary, marginBottom: theme.spacing.lg }}>
          Enter the 6-digit code from your authenticator app
        </p>
        <OTPInput
          length={6}
          onComplete={handleMFAVerify}
          autoSubmit={true}
          error={!!error}
          errorMessage={error}
          disabled={loading}
        />
        <button
          onClick={() => setView('login')}
          style={mergeStyles(getButtonStyles(theme, 'ghost', 'md', false, true), { marginTop: theme.spacing.md })}
        >
          Back to Login
        </button>
      </div>
    );
  }

  // Magic Link View
  if (view === 'magicLink') {
    if (magicLinkSent) {
      return (
        <div className={className} style={containerStyle}>
          <h2 style={{ margin: 0, marginBottom: theme.spacing.lg, textAlign: 'center' }}>
            Check Your Email
          </h2>
          <p style={{ textAlign: 'center', color: theme.colors.textSecondary, marginBottom: theme.spacing.lg }}>
            We've sent a magic link to <strong>{email}</strong>. Click the link to sign in.
          </p>
          <button
            onClick={() => { setView('login'); setMagicLinkSent(false); }}
            style={mergeStyles(getButtonStyles(theme, 'outline', 'md', false, true))}
          >
            Back to Login
          </button>
        </div>
      );
    }

    return (
      <div className={className} style={containerStyle}>
        <h2 style={{ margin: 0, marginBottom: theme.spacing.lg, textAlign: 'center' }}>
          Sign in with Magic Link
        </h2>
        <form onSubmit={handleMagicLink} style={formStyle}>
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
            disabled={loading}
            style={mergeStyles(getButtonStyles(theme, 'primary', 'md', loading, true), styles.button)}
          >
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>

          <button
            type="button"
            onClick={() => setView('login')}
            style={mergeStyles(getButtonStyles(theme, 'ghost', 'md', false, true))}
          >
            Back to Login
          </button>
        </form>
      </div>
    );
  }

  // Login View (default)
  return (
    <div className={className} style={containerStyle}>
      <h2 style={{ margin: 0, marginBottom: theme.spacing.lg, textAlign: 'center' }}>
        Sign In
      </h2>

      {showSocialLogins && providers.length > 0 && (
        <>
          <SocialLoginButtons
            providers={providers}
            layout="vertical"
            size="md"
            onProviderClick={onSocialLogin || (() => {})}
            disabled={loading}
          />
          <div style={dividerStyle}>
            <div style={dividerLineStyle} />
            <span>or</span>
            <div style={dividerLineStyle} />
          </div>
        </>
      )}

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

        <div style={inputGroupStyle}>
          <label style={getLabelStyles(theme)}>Password</label>
          <div style={passwordContainerStyle}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {showRememberMe && (
            <div style={checkboxContainerStyle}>
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
              />
              <label htmlFor="rememberMe" style={{ fontSize: '14px', cursor: 'pointer' }}>
                Remember me
              </label>
            </div>
          )}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = '/forgot-password';
            }}
            style={linkStyle}
          >
            Forgot password?
          </a>
        </div>

        {error && <div style={getErrorStyles(theme)}>{error}</div>}

        <button
          type="submit"
          disabled={loading}
          style={mergeStyles(getButtonStyles(theme, 'primary', 'md', loading, true), styles.button)}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        {showMagicLink && (
          <button
            type="button"
            onClick={() => setView('magicLink')}
            disabled={loading}
            style={mergeStyles(getButtonStyles(theme, 'ghost', 'md', loading, true))}
          >
            Sign in with Magic Link
          </button>
        )}
      </form>

      <div style={{ textAlign: 'center', marginTop: theme.spacing.lg, fontSize: '14px' }}>
        Don't have an account?{' '}
        <a href="/signup" style={linkStyle}>
          Sign up
        </a>
      </div>
    </div>
  );
};
