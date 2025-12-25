/**
 * Default Theme for Traf3li Auth React UI Components
 * A clean, modern theme with full customization support
 */

export interface ThemeColors {
  // Primary colors
  primary: string;
  primaryHover: string;
  primaryActive: string;
  primaryDisabled: string;

  // Secondary colors
  secondary: string;
  secondaryHover: string;

  // Status colors
  success: string;
  successLight: string;
  error: string;
  errorLight: string;
  warning: string;
  warningLight: string;
  info: string;
  infoLight: string;

  // Neutral colors
  background: string;
  surface: string;
  surfaceHover: string;
  border: string;
  borderFocus: string;
  text: string;
  textSecondary: string;
  textDisabled: string;
  placeholder: string;

  // Password strength colors
  passwordWeak: string;
  passwordMedium: string;
  passwordStrong: string;
  passwordVeryStrong: string;
}

export interface ThemeFonts {
  family: string;
  familyMono: string;
}

export interface ThemeSizes {
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
}

export interface ThemeBorderRadius {
  sm: string;
  md: string;
  lg: string;
  full: string;
}

export interface ThemeShadows {
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface Theme {
  colors: ThemeColors;
  fonts: ThemeFonts;
  sizes: ThemeSizes;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  shadows: ThemeShadows;
  transitions: {
    default: string;
    fast: string;
    slow: string;
  };
  rtl: boolean;
}

export const defaultTheme: Theme = {
  colors: {
    // Primary - Modern blue
    primary: '#3b82f6',
    primaryHover: '#2563eb',
    primaryActive: '#1d4ed8',
    primaryDisabled: '#93c5fd',

    // Secondary - Slate
    secondary: '#64748b',
    secondaryHover: '#475569',

    // Status colors
    success: '#10b981',
    successLight: '#d1fae5',
    error: '#ef4444',
    errorLight: '#fee2e2',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    info: '#3b82f6',
    infoLight: '#dbeafe',

    // Neutral colors
    background: '#ffffff',
    surface: '#f8fafc',
    surfaceHover: '#f1f5f9',
    border: '#e2e8f0',
    borderFocus: '#3b82f6',
    text: '#0f172a',
    textSecondary: '#64748b',
    textDisabled: '#cbd5e1',
    placeholder: '#94a3b8',

    // Password strength
    passwordWeak: '#ef4444',
    passwordMedium: '#f59e0b',
    passwordStrong: '#10b981',
    passwordVeryStrong: '#059669',
  },

  fonts: {
    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    familyMono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
  },

  sizes: {
    sm: '32px',
    md: '40px',
    lg: '48px',
    xl: '56px',
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },

  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },

  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },

  transitions: {
    default: 'all 0.2s ease-in-out',
    fast: 'all 0.1s ease-in-out',
    slow: 'all 0.3s ease-in-out',
  },

  rtl: false,
};
