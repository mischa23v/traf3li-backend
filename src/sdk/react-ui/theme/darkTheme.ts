/**
 * Dark Theme for Traf3li Auth React UI Components
 * A modern dark theme optimized for low-light environments
 */

import { Theme } from './defaultTheme';

export const darkTheme: Theme = {
  colors: {
    // Primary - Brighter blue for dark mode
    primary: '#60a5fa',
    primaryHover: '#3b82f6',
    primaryActive: '#2563eb',
    primaryDisabled: '#1e40af',

    // Secondary
    secondary: '#94a3b8',
    secondaryHover: '#cbd5e1',

    // Status colors
    success: '#34d399',
    successLight: '#064e3b',
    error: '#f87171',
    errorLight: '#7f1d1d',
    warning: '#fbbf24',
    warningLight: '#78350f',
    info: '#60a5fa',
    infoLight: '#1e3a8a',

    // Neutral colors - inverted from light theme
    background: '#0f172a',
    surface: '#1e293b',
    surfaceHover: '#334155',
    border: '#334155',
    borderFocus: '#60a5fa',
    text: '#f8fafc',
    textSecondary: '#cbd5e1',
    textDisabled: '#475569',
    placeholder: '#64748b',

    // Password strength
    passwordWeak: '#f87171',
    passwordMedium: '#fbbf24',
    passwordStrong: '#34d399',
    passwordVeryStrong: '#10b981',
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
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
  },

  transitions: {
    default: 'all 0.2s ease-in-out',
    fast: 'all 0.1s ease-in-out',
    slow: 'all 0.3s ease-in-out',
  },

  rtl: false,
};
