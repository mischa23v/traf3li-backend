/**
 * Social Login Buttons Component
 * Pre-styled buttons for OAuth providers with customizable layout
 */

import React from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { OAuthProvider, ButtonSize } from '../types';

export interface SocialLoginButtonsProps {
  /** OAuth providers to display */
  providers: OAuthProvider[];
  /** Layout orientation */
  layout?: 'horizontal' | 'vertical';
  /** Button size */
  size?: ButtonSize;
  /** Callback when provider is clicked */
  onProviderClick: (provider: OAuthProvider) => void;
  /** Loading state */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
  /** Custom styles */
  styles?: {
    container?: React.CSSProperties;
    button?: React.CSSProperties;
  };
}

export const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({
  providers,
  layout = 'vertical',
  size = 'md',
  onProviderClick,
  loading = false,
  disabled = false,
  className = '',
  styles = {},
}) => {
  const { theme } = useTheme();

  const providerConfig: Record<OAuthProvider, {
    name: string;
    icon: string;
    color: string;
    textColor: string;
  }> = {
    google: {
      name: 'Google',
      icon: 'G',
      color: '#ffffff',
      textColor: '#3c4043',
    },
    microsoft: {
      name: 'Microsoft',
      icon: 'M',
      color: '#2f2f2f',
      textColor: '#ffffff',
    },
    apple: {
      name: 'Apple',
      icon: '',
      color: '#000000',
      textColor: '#ffffff',
    },
    github: {
      name: 'GitHub',
      icon: '',
      color: '#24292e',
      textColor: '#ffffff',
    },
    facebook: {
      name: 'Facebook',
      icon: 'f',
      color: '#1877f2',
      textColor: '#ffffff',
    },
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: layout === 'vertical' ? 'column' : 'row',
    gap: theme.spacing.sm,
    width: '100%',
    ...styles.container,
  };

  const getButtonHeight = () => {
    switch (size) {
      case 'sm': return '36px';
      case 'lg': return '48px';
      default: return '42px';
    }
  };

  const getButtonStyle = (provider: OAuthProvider): React.CSSProperties => {
    const config = providerConfig[provider];
    return {
      height: getButtonHeight(),
      padding: `0 ${theme.spacing.md}`,
      border: provider === 'google' ? `1px solid ${theme.colors.border}` : 'none',
      borderRadius: theme.borderRadius.md,
      backgroundColor: config.color,
      color: config.textColor,
      fontSize: size === 'sm' ? '14px' : '15px',
      fontWeight: '500',
      fontFamily: theme.fonts.family,
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      transition: theme.transitions.default,
      opacity: disabled || loading ? 0.6 : 1,
      width: '100%',
      ...styles.button,
    };
  };

  const iconStyle: React.CSSProperties = {
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '16px',
  };

  const handleClick = (provider: OAuthProvider) => {
    if (disabled || loading) return;
    onProviderClick(provider);
  };

  return (
    <div className={className} style={containerStyle}>
      {providers.map((provider) => {
        const config = providerConfig[provider];
        return (
          <button
            key={provider}
            onClick={() => handleClick(provider)}
            disabled={disabled || loading}
            style={getButtonStyle(provider)}
            aria-label={`Continue with ${config.name}`}
            onMouseEnter={(e) => {
              if (!disabled && !loading) {
                e.currentTarget.style.opacity = '0.9';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!disabled && !loading) {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <span style={iconStyle}>{config.icon}</span>
            <span>Continue with {config.name}</span>
          </button>
        );
      })}
    </div>
  );
};
