/**
 * Theme Provider for Traf3li Auth React UI Components
 * Provides theme context to all child components with CSS variable support
 */

import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { Theme, defaultTheme } from './defaultTheme';
import { darkTheme } from './darkTheme';

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: defaultTheme,
  isDark: false,
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
  theme?: Theme | 'light' | 'dark';
  customTheme?: Partial<Theme>;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  theme = 'light',
  customTheme,
}) => {
  // Resolve theme
  const resolvedTheme = useMemo(() => {
    let baseTheme: Theme;

    if (typeof theme === 'string') {
      baseTheme = theme === 'dark' ? darkTheme : defaultTheme;
    } else {
      baseTheme = theme;
    }

    // Merge with custom theme if provided
    if (customTheme) {
      return {
        ...baseTheme,
        colors: { ...baseTheme.colors, ...customTheme.colors },
        fonts: { ...baseTheme.fonts, ...customTheme.fonts },
        sizes: { ...baseTheme.sizes, ...customTheme.sizes },
        spacing: { ...baseTheme.spacing, ...customTheme.spacing },
        borderRadius: { ...baseTheme.borderRadius, ...customTheme.borderRadius },
        shadows: { ...baseTheme.shadows, ...customTheme.shadows },
        transitions: { ...baseTheme.transitions, ...customTheme.transitions },
        rtl: customTheme.rtl ?? baseTheme.rtl,
      };
    }

    return baseTheme;
  }, [theme, customTheme]);

  const isDark = useMemo(() => {
    if (typeof theme === 'string') {
      return theme === 'dark';
    }
    return theme === darkTheme;
  }, [theme]);

  // Apply CSS variables to root
  useEffect(() => {
    const root = document.documentElement;

    // Apply colors
    Object.entries(resolvedTheme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--traf3li-color-${camelToKebab(key)}`, value);
    });

    // Apply spacing
    Object.entries(resolvedTheme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--traf3li-spacing-${key}`, value);
    });

    // Apply border radius
    Object.entries(resolvedTheme.borderRadius).forEach(([key, value]) => {
      root.style.setProperty(`--traf3li-radius-${key}`, value);
    });

    // Apply shadows
    Object.entries(resolvedTheme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--traf3li-shadow-${key}`, value);
    });

    // Apply fonts
    root.style.setProperty('--traf3li-font-family', resolvedTheme.fonts.family);
    root.style.setProperty('--traf3li-font-family-mono', resolvedTheme.fonts.familyMono);

    // Apply RTL
    root.setAttribute('dir', resolvedTheme.rtl ? 'rtl' : 'ltr');
  }, [resolvedTheme]);

  const value = useMemo(() => ({
    theme: resolvedTheme,
    isDark,
  }), [resolvedTheme, isDark]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Helper function to convert camelCase to kebab-case
function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
