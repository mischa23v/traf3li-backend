/**
 * Style utility functions for Traf3li Auth React UI Components
 * CSS-in-JS with theme support
 */

import { Theme } from '../theme/defaultTheme';

export const getButtonStyles = (
  theme: Theme,
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' = 'primary',
  size: 'sm' | 'md' | 'lg' = 'md',
  disabled: boolean = false,
  fullWidth: boolean = false
): React.CSSProperties => {
  const baseStyles: React.CSSProperties = {
    fontFamily: theme.fonts.family,
    fontSize: size === 'sm' ? '14px' : size === 'lg' ? '16px' : '15px',
    height: theme.sizes[size],
    padding: size === 'sm' ? '0 12px' : size === 'lg' ? '0 24px' : '0 16px',
    borderRadius: theme.borderRadius.md,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: '500',
    transition: theme.transitions.default,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled ? 0.6 : 1,
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: theme.colors.primary,
      color: '#ffffff',
      ':hover': {
        backgroundColor: theme.colors.primaryHover,
      },
    },
    secondary: {
      backgroundColor: theme.colors.secondary,
      color: '#ffffff',
      ':hover': {
        backgroundColor: theme.colors.secondaryHover,
      },
    },
    outline: {
      backgroundColor: 'transparent',
      color: theme.colors.primary,
      border: `1px solid ${theme.colors.border}`,
      ':hover': {
        backgroundColor: theme.colors.surface,
      },
    },
    ghost: {
      backgroundColor: 'transparent',
      color: theme.colors.text,
      ':hover': {
        backgroundColor: theme.colors.surface,
      },
    },
    danger: {
      backgroundColor: theme.colors.error,
      color: '#ffffff',
      ':hover': {
        backgroundColor: '#dc2626',
      },
    },
  };

  return { ...baseStyles, ...variantStyles[variant] };
};

export const getInputStyles = (
  theme: Theme,
  error: boolean = false,
  disabled: boolean = false
): React.CSSProperties => {
  return {
    fontFamily: theme.fonts.family,
    fontSize: '15px',
    height: theme.sizes.md,
    padding: `0 ${theme.spacing.md}`,
    borderRadius: theme.borderRadius.md,
    border: `1px solid ${error ? theme.colors.error : theme.colors.border}`,
    backgroundColor: disabled ? theme.colors.surface : theme.colors.background,
    color: theme.colors.text,
    transition: theme.transitions.default,
    width: '100%',
    outline: 'none',
    ':focus': {
      borderColor: error ? theme.colors.error : theme.colors.borderFocus,
      boxShadow: `0 0 0 3px ${error ? theme.colors.errorLight : theme.colors.infoLight}`,
    },
    '::placeholder': {
      color: theme.colors.placeholder,
    },
  };
};

export const getLabelStyles = (theme: Theme): React.CSSProperties => {
  return {
    fontFamily: theme.fonts.family,
    fontSize: '14px',
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    display: 'block',
  };
};

export const getErrorStyles = (theme: Theme): React.CSSProperties => {
  return {
    fontFamily: theme.fonts.family,
    fontSize: '13px',
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
    display: 'block',
  };
};

export const getCardStyles = (theme: Theme): React.CSSProperties => {
  return {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    border: `1px solid ${theme.colors.border}`,
    padding: theme.spacing.xl,
    boxShadow: theme.shadows.md,
  };
};

export const getLinkStyles = (theme: Theme): React.CSSProperties => {
  return {
    fontFamily: theme.fonts.family,
    fontSize: '14px',
    color: theme.colors.primary,
    textDecoration: 'none',
    cursor: 'pointer',
    transition: theme.transitions.default,
    ':hover': {
      textDecoration: 'underline',
    },
  };
};

// Helper to merge custom styles with default styles
export const mergeStyles = (...styles: (React.CSSProperties | undefined)[]): React.CSSProperties => {
  return Object.assign({}, ...styles.filter(Boolean));
};
