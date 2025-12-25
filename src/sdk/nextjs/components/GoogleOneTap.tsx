/**
 * Google One Tap Component for Traf3li Auth
 *
 * Provides a React component for Google One Tap authentication
 * Works in both App Router and Pages Router
 */

'use client';

import React, { useEffect, useRef } from 'react';
import type { GoogleOneTapConfig, GoogleCredentialResponse } from '../types';

// ═══════════════════════════════════════════════════════════════
// GLOBAL TYPES
// ═══════════════════════════════════════════════════════════════

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          disableAutoSelect: () => void;
          revoke: (email: string, callback: () => void) => void;
          cancel: () => void;
        };
      };
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT PROPS
// ═══════════════════════════════════════════════════════════════

export interface GoogleOneTapProps extends Omit<GoogleOneTapConfig, 'onSuccess'> {
  /**
   * Callback when sign-in succeeds
   */
  onSuccess: (credential: string) => void | Promise<void>;

  /**
   * Callback when sign-in fails
   */
  onError?: (error: Error) => void;

  /**
   * Enable auto-select (default: true)
   */
  autoSelect?: boolean;

  /**
   * Cancel the prompt if user clicks outside (default: true)
   */
  cancelOnTapOutside?: boolean;

  /**
   * Context for the One Tap prompt
   * - 'signin': Show "Sign in with Google"
   * - 'signup': Show "Sign up with Google"
   * - 'use': Show "Use Google"
   */
  context?: 'signin' | 'signup' | 'use';

  /**
   * Nonce for additional security
   */
  nonce?: string;

  /**
   * Show the One Tap prompt immediately (default: true)
   */
  promptMoment?: boolean;

  /**
   * Show the button instead of One Tap
   */
  showButton?: boolean;

  /**
   * Button theme
   */
  buttonTheme?: 'outline' | 'filled_blue' | 'filled_black';

  /**
   * Button size
   */
  buttonSize?: 'large' | 'medium' | 'small';

  /**
   * Button text
   */
  buttonText?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';

  /**
   * Button shape
   */
  buttonShape?: 'rectangular' | 'pill' | 'circle' | 'square';

  /**
   * Button logo alignment
   */
  buttonLogoAlignment?: 'left' | 'center';

  /**
   * Button width (in pixels)
   */
  buttonWidth?: number;
}

// ═══════════════════════════════════════════════════════════════
// GOOGLE ONE TAP COMPONENT
// ═══════════════════════════════════════════════════════════════

/**
 * GoogleOneTap - Component for Google One Tap authentication
 *
 * @example
 * // Basic usage
 * import { GoogleOneTap } from '@traf3li/auth-nextjs/components/GoogleOneTap';
 *
 * export default function LoginPage() {
 *   const handleSuccess = async (credential: string) => {
 *     const response = await fetch('/api/auth/google', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({ credential }),
 *     });
 *     const data = await response.json();
 *     // Handle successful login
 *   };
 *
 *   return (
 *     <div>
 *       <h1>Login</h1>
 *       <GoogleOneTap
 *         clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}
 *         onSuccess={handleSuccess}
 *         onError={(error) => console.error(error)}
 *       />
 *     </div>
 *   );
 * }
 */
export function GoogleOneTap({
  clientId,
  onSuccess,
  onError,
  autoSelect = true,
  cancelOnTapOutside = true,
  context = 'signin',
  nonce,
  promptMoment = true,
  showButton = false,
  buttonTheme = 'outline',
  buttonSize = 'large',
  buttonText = 'signin_with',
  buttonShape = 'rectangular',
  buttonLogoAlignment = 'left',
  buttonWidth,
}: GoogleOneTapProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    // Load Google Identity Services script
    if (scriptLoaded.current) {
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      scriptLoaded.current = true;
      initializeGoogleOneTap();
    };

    script.onerror = () => {
      if (onError) {
        onError(new Error('Failed to load Google Identity Services'));
      }
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup: Cancel any active prompts
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.cancel();
        } catch (err) {
          // Ignore errors during cleanup
        }
      }
    };
  }, []);

  const initializeGoogleOneTap = () => {
    if (!window.google?.accounts?.id) {
      if (onError) {
        onError(new Error('Google Identity Services not available'));
      }
      return;
    }

    try {
      // Initialize Google One Tap
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: autoSelect,
        cancel_on_tap_outside: cancelOnTapOutside,
        context,
        nonce,
        ux_mode: 'popup',
        itp_support: true,
      });

      // Show One Tap prompt or render button
      if (showButton && buttonRef.current) {
        // Render Sign In button
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: buttonTheme,
          size: buttonSize,
          text: buttonText,
          shape: buttonShape,
          logo_alignment: buttonLogoAlignment,
          width: buttonWidth,
        });
      } else if (promptMoment) {
        // Show One Tap prompt
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // Log notification reason
            if (onError) {
              const reason = notification.getNotDisplayedReason() || notification.getSkippedReason();
              console.warn('[GoogleOneTap] Not displayed:', reason);
            }
          }
        });
      }
    } catch (error) {
      if (onError) {
        onError(error as Error);
      }
    }
  };

  const handleCredentialResponse = async (response: GoogleCredentialResponse) => {
    try {
      await onSuccess(response.credential);
    } catch (error) {
      if (onError) {
        onError(error as Error);
      }
    }
  };

  // Re-initialize when props change
  useEffect(() => {
    if (scriptLoaded.current && window.google?.accounts?.id) {
      initializeGoogleOneTap();
    }
  }, [
    clientId,
    autoSelect,
    cancelOnTapOutside,
    context,
    nonce,
    promptMoment,
    showButton,
    buttonTheme,
    buttonSize,
    buttonText,
    buttonShape,
    buttonLogoAlignment,
    buttonWidth,
  ]);

  // Render button container if showButton is true
  if (showButton) {
    return <div ref={buttonRef} />;
  }

  // One Tap doesn't render anything visible
  return null;
}

// ═══════════════════════════════════════════════════════════════
// GOOGLE SIGN IN BUTTON COMPONENT
// ═══════════════════════════════════════════════════════════════

export interface GoogleSignInButtonProps {
  clientId: string;
  onSuccess: (credential: string) => void | Promise<void>;
  onError?: (error: Error) => void;
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logoAlignment?: 'left' | 'center';
  width?: number;
  nonce?: string;
}

/**
 * GoogleSignInButton - Standalone Google Sign In button
 *
 * @example
 * import { GoogleSignInButton } from '@traf3li/auth-nextjs/components/GoogleOneTap';
 *
 * <GoogleSignInButton
 *   clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}
 *   onSuccess={handleSuccess}
 *   theme="filled_blue"
 *   text="continue_with"
 * />
 */
export function GoogleSignInButton({
  clientId,
  onSuccess,
  onError,
  theme = 'outline',
  size = 'large',
  text = 'signin_with',
  shape = 'rectangular',
  logoAlignment = 'left',
  width,
  nonce,
}: GoogleSignInButtonProps) {
  return (
    <GoogleOneTap
      clientId={clientId}
      onSuccess={onSuccess}
      onError={onError}
      showButton={true}
      buttonTheme={theme}
      buttonSize={size}
      buttonText={text}
      buttonShape={shape}
      buttonLogoAlignment={logoAlignment}
      buttonWidth={width}
      nonce={nonce}
      promptMoment={false}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export default GoogleOneTap;
export type { GoogleOneTapProps, GoogleSignInButtonProps };
