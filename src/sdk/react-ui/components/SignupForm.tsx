/**
 * Signup Form Component
 * Comprehensive registration form with customizable fields and password strength indicator
 */

import React, { useState, FormEvent } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { User, ComponentStyles } from '../types';
import { PasswordStrength } from './PasswordStrength';
import { getButtonStyles, getInputStyles, getLabelStyles, getErrorStyles, mergeStyles } from '../utils/styles';

export interface SignupFormProps {
  /** Callback on successful signup */
  onSuccess: (user: User) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Fields to include in the form */
  fields?: ('email' | 'password' | 'firstName' | 'lastName' | 'phone' | 'username')[];
  /** Show password strength indicator */
  passwordStrengthIndicator?: boolean;
  /** Terms of service URL */
  termsUrl?: string;
  /** Privacy policy URL */
  privacyUrl?: string;
  /** Require terms acceptance */
  requireTermsAcceptance?: boolean;
  /** API base URL */
  apiUrl?: string;
  /** Custom class name */
  className?: string;
  /** Custom styles */
  styles?: ComponentStyles;
}

export const SignupForm: React.FC<SignupFormProps> = ({
  onSuccess,
  onError,
  fields = ['email', 'password', 'firstName', 'lastName'],
  passwordStrengthIndicator = true,
  termsUrl = '/terms',
  privacyUrl = '/privacy',
  requireTermsAcceptance = true,
  apiUrl = '/api/auth',
  className = '',
  styles = {},
}) => {
  const { theme } = useTheme();

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    username: '',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user types
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate required fields
    if (fields.includes('email') && !formData.email) {
      errors.email = 'Email is required';
    } else if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (fields.includes('password')) {
      if (!formData.password) {
        errors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
      }

      if (!formData.confirmPassword) {
        errors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    if (fields.includes('firstName') && !formData.firstName) {
      errors.firstName = 'First name is required';
    }

    if (fields.includes('lastName') && !formData.lastName) {
      errors.lastName = 'Last name is required';
    }

    if (fields.includes('phone') && formData.phone && !/^\+?[1-9]\d{1,14}$/.test(formData.phone)) {
      errors.phone = 'Invalid phone number';
    }

    if (requireTermsAcceptance && !acceptedTerms) {
      errors.terms = 'You must accept the terms and privacy policy';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Build request body based on selected fields
      const requestBody: any = {};
      fields.forEach((field) => {
        if (formData[field]) {
          requestBody[field] = formData[field];
        }
      });

      const response = await fetch(`${apiUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.messageEn || 'Registration failed');
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

  const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: theme.spacing.md,
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
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  };

  const linkStyle: React.CSSProperties = {
    color: theme.colors.primary,
    textDecoration: 'none',
  };

  return (
    <div className={className} style={containerStyle}>
      <h2 style={{ margin: 0, marginBottom: theme.spacing.lg, textAlign: 'center' }}>
        Create Account
      </h2>

      <form onSubmit={handleSubmit} style={formStyle}>
        {/* Name fields (side by side if both included) */}
        {fields.includes('firstName') && fields.includes('lastName') ? (
          <div style={rowStyle}>
            <div style={inputGroupStyle}>
              <label style={getLabelStyles(theme)}>First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="John"
                disabled={loading}
                style={mergeStyles(getInputStyles(theme, !!fieldErrors.firstName), styles.input)}
              />
              {fieldErrors.firstName && (
                <span style={getErrorStyles(theme)}>{fieldErrors.firstName}</span>
              )}
            </div>
            <div style={inputGroupStyle}>
              <label style={getLabelStyles(theme)}>Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Doe"
                disabled={loading}
                style={mergeStyles(getInputStyles(theme, !!fieldErrors.lastName), styles.input)}
              />
              {fieldErrors.lastName && (
                <span style={getErrorStyles(theme)}>{fieldErrors.lastName}</span>
              )}
            </div>
          </div>
        ) : (
          <>
            {fields.includes('firstName') && (
              <div style={inputGroupStyle}>
                <label style={getLabelStyles(theme)}>First Name</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  placeholder="John"
                  disabled={loading}
                  style={mergeStyles(getInputStyles(theme, !!fieldErrors.firstName), styles.input)}
                />
                {fieldErrors.firstName && (
                  <span style={getErrorStyles(theme)}>{fieldErrors.firstName}</span>
                )}
              </div>
            )}
            {fields.includes('lastName') && (
              <div style={inputGroupStyle}>
                <label style={getLabelStyles(theme)}>Last Name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  placeholder="Doe"
                  disabled={loading}
                  style={mergeStyles(getInputStyles(theme, !!fieldErrors.lastName), styles.input)}
                />
                {fieldErrors.lastName && (
                  <span style={getErrorStyles(theme)}>{fieldErrors.lastName}</span>
                )}
              </div>
            )}
          </>
        )}

        {/* Username */}
        {fields.includes('username') && (
          <div style={inputGroupStyle}>
            <label style={getLabelStyles(theme)}>Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => handleChange('username', e.target.value)}
              placeholder="johndoe"
              disabled={loading}
              style={mergeStyles(getInputStyles(theme, !!fieldErrors.username), styles.input)}
            />
            {fieldErrors.username && (
              <span style={getErrorStyles(theme)}>{fieldErrors.username}</span>
            )}
          </div>
        )}

        {/* Email */}
        {fields.includes('email') && (
          <div style={inputGroupStyle}>
            <label style={getLabelStyles(theme)}>Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="you@example.com"
              disabled={loading}
              style={mergeStyles(getInputStyles(theme, !!fieldErrors.email), styles.input)}
            />
            {fieldErrors.email && (
              <span style={getErrorStyles(theme)}>{fieldErrors.email}</span>
            )}
          </div>
        )}

        {/* Phone */}
        {fields.includes('phone') && (
          <div style={inputGroupStyle}>
            <label style={getLabelStyles(theme)}>Phone Number (Optional)</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+1234567890"
              disabled={loading}
              style={mergeStyles(getInputStyles(theme, !!fieldErrors.phone), styles.input)}
            />
            {fieldErrors.phone && (
              <span style={getErrorStyles(theme)}>{fieldErrors.phone}</span>
            )}
          </div>
        )}

        {/* Password */}
        {fields.includes('password') && (
          <>
            <div style={inputGroupStyle}>
              <label style={getLabelStyles(theme)}>Password</label>
              <div style={passwordContainerStyle}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="Create a strong password"
                  disabled={loading}
                  style={mergeStyles(getInputStyles(theme, !!fieldErrors.password), styles.input)}
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
              {fieldErrors.password && (
                <span style={getErrorStyles(theme)}>{fieldErrors.password}</span>
              )}
            </div>

            {passwordStrengthIndicator && formData.password && (
              <PasswordStrength password={formData.password} />
            )}

            <div style={inputGroupStyle}>
              <label style={getLabelStyles(theme)}>Confirm Password</label>
              <div style={passwordContainerStyle}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  placeholder="Re-enter your password"
                  disabled={loading}
                  style={mergeStyles(getInputStyles(theme, !!fieldErrors.confirmPassword), styles.input)}
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
              {fieldErrors.confirmPassword && (
                <span style={getErrorStyles(theme)}>{fieldErrors.confirmPassword}</span>
              )}
            </div>
          </>
        )}

        {/* Terms and Privacy */}
        {requireTermsAcceptance && (
          <div style={inputGroupStyle}>
            <div style={checkboxContainerStyle}>
              <input
                type="checkbox"
                id="acceptTerms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                disabled={loading}
              />
              <label htmlFor="acceptTerms" style={{ fontSize: '14px', lineHeight: '1.5' }}>
                I agree to the{' '}
                <a href={termsUrl} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href={privacyUrl} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                  Privacy Policy
                </a>
              </label>
            </div>
            {fieldErrors.terms && (
              <span style={getErrorStyles(theme)}>{fieldErrors.terms}</span>
            )}
          </div>
        )}

        {/* General error */}
        {error && <div style={getErrorStyles(theme)}>{error}</div>}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          style={mergeStyles(getButtonStyles(theme, 'primary', 'md', loading, true), styles.button)}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: theme.spacing.lg, fontSize: '14px' }}>
        Already have an account?{' '}
        <a href="/login" style={linkStyle}>
          Sign in
        </a>
      </div>
    </div>
  );
};
