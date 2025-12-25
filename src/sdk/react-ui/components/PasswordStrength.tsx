/**
 * Password Strength Indicator Component
 * Visual strength meter with requirements checklist and real-time validation
 */

import React, { useMemo } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { PasswordStrengthResult } from '../types';

export interface PasswordStrengthProps {
  /** Password value to check */
  password: string;
  /** Show requirements checklist */
  showRequirements?: boolean;
  /** Show strength label */
  showLabel?: boolean;
  /** Show visual bar */
  showBar?: boolean;
  /** Minimum length requirement */
  minLength?: number;
  /** Custom class name */
  className?: string;
  /** Custom styles */
  styles?: {
    container?: React.CSSProperties;
    bar?: React.CSSProperties;
    label?: React.CSSProperties;
    requirements?: React.CSSProperties;
  };
}

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({
  password,
  showRequirements = true,
  showLabel = true,
  showBar = true,
  minLength = 8,
  className = '',
  styles = {},
}) => {
  const { theme } = useTheme();

  const strength = useMemo((): PasswordStrengthResult => {
    if (!password) {
      return {
        score: 0,
        label: 'Very Weak',
        feedback: [],
        requirements: {
          minLength: false,
          hasUppercase: false,
          hasLowercase: false,
          hasNumber: false,
          hasSpecialChar: false,
        },
      };
    }

    const requirements = {
      minLength: password.length >= minLength,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };

    // Calculate score (0-4)
    let score = 0;
    const metRequirements = Object.values(requirements).filter(Boolean).length;

    if (requirements.minLength) score++;
    if (metRequirements >= 3) score++;
    if (metRequirements >= 4) score++;
    if (metRequirements === 5 && password.length >= 12) score++;

    // Determine label
    const labels: PasswordStrengthResult['label'][] = [
      'Very Weak',
      'Weak',
      'Medium',
      'Strong',
      'Very Strong',
    ];
    const label = labels[score];

    // Generate feedback
    const feedback: string[] = [];
    if (!requirements.minLength) {
      feedback.push(`Use at least ${minLength} characters`);
    }
    if (!requirements.hasUppercase) {
      feedback.push('Include uppercase letters');
    }
    if (!requirements.hasLowercase) {
      feedback.push('Include lowercase letters');
    }
    if (!requirements.hasNumber) {
      feedback.push('Include numbers');
    }
    if (!requirements.hasSpecialChar) {
      feedback.push('Include special characters');
    }

    return { score, label, feedback, requirements };
  }, [password, minLength]);

  const getStrengthColor = () => {
    switch (strength.score) {
      case 0:
      case 1:
        return theme.colors.passwordWeak;
      case 2:
        return theme.colors.passwordMedium;
      case 3:
        return theme.colors.passwordStrong;
      case 4:
        return theme.colors.passwordVeryStrong;
      default:
        return theme.colors.border;
    }
  };

  const containerStyle: React.CSSProperties = {
    fontFamily: theme.fonts.family,
    ...styles.container,
  };

  const barContainerStyle: React.CSSProperties = {
    width: '100%',
    height: '6px',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
    marginBottom: showLabel || showRequirements ? theme.spacing.sm : 0,
  };

  const barFillStyle: React.CSSProperties = {
    height: '100%',
    backgroundColor: getStrengthColor(),
    width: `${(strength.score / 4) * 100}%`,
    transition: theme.transitions.default,
    ...styles.bar,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: '500',
    color: getStrengthColor(),
    marginBottom: showRequirements ? theme.spacing.sm : 0,
    ...styles.label,
  };

  const requirementsStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
    fontSize: '13px',
    ...styles.requirements,
  };

  const requirementItemStyle = (met: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    color: met ? theme.colors.success : theme.colors.textSecondary,
  });

  const checkIconStyle = (met: boolean): React.CSSProperties => ({
    width: '16px',
    height: '16px',
    borderRadius: theme.borderRadius.full,
    backgroundColor: met ? theme.colors.success : theme.colors.surface,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 'bold',
  });

  if (!password) return null;

  return (
    <div className={className} style={containerStyle}>
      {showBar && (
        <div style={barContainerStyle}>
          <div style={barFillStyle} />
        </div>
      )}

      {showLabel && (
        <div style={labelStyle}>
          Password Strength: {strength.label}
        </div>
      )}

      {showRequirements && (
        <div style={requirementsStyle}>
          <div style={requirementItemStyle(strength.requirements.minLength)}>
            <div style={checkIconStyle(strength.requirements.minLength)}>
              {strength.requirements.minLength ? '✓' : ''}
            </div>
            <span>At least {minLength} characters</span>
          </div>
          <div style={requirementItemStyle(strength.requirements.hasUppercase)}>
            <div style={checkIconStyle(strength.requirements.hasUppercase)}>
              {strength.requirements.hasUppercase ? '✓' : ''}
            </div>
            <span>Uppercase letter (A-Z)</span>
          </div>
          <div style={requirementItemStyle(strength.requirements.hasLowercase)}>
            <div style={checkIconStyle(strength.requirements.hasLowercase)}>
              {strength.requirements.hasLowercase ? '✓' : ''}
            </div>
            <span>Lowercase letter (a-z)</span>
          </div>
          <div style={requirementItemStyle(strength.requirements.hasNumber)}>
            <div style={checkIconStyle(strength.requirements.hasNumber)}>
              {strength.requirements.hasNumber ? '✓' : ''}
            </div>
            <span>Number (0-9)</span>
          </div>
          <div style={requirementItemStyle(strength.requirements.hasSpecialChar)}>
            <div style={checkIconStyle(strength.requirements.hasSpecialChar)}>
              {strength.requirements.hasSpecialChar ? '✓' : ''}
            </div>
            <span>Special character (!@#$%...)</span>
          </div>
        </div>
      )}
    </div>
  );
};
