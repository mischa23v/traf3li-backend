/**
 * Google One Tap Button Component
 * Implements Google's One Tap sign-in
 */

import React, { useEffect, useRef } from 'react';

export interface GoogleOneTapButtonProps {
  /** Google OAuth Client ID */
  clientId: string;
  /** Callback when credential is received */
  onCredentialResponse: (response: { credential: string }) => void;
  /** Auto-select account if only one is available */
  autoSelect?: boolean;
  /** Cancel on tap outside */
  cancelOnTapOutside?: boolean;
  /** Custom class name */
  className?: string;
  /** Custom container ID */
  containerId?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: () => void;
          renderButton: (element: HTMLElement, config: any) => void;
        };
      };
    };
  }
}

export const GoogleOneTapButton: React.FC<GoogleOneTapButtonProps> = ({
  clientId,
  onCredentialResponse,
  autoSelect = true,
  cancelOnTapOutside = true,
  className = '',
  containerId = 'google-one-tap-button',
}) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    // Load Google One Tap script
    if (!scriptLoaded.current && !window.google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        scriptLoaded.current = true;
        initializeGoogleOneTap();
      };
      document.body.appendChild(script);
    } else if (window.google) {
      initializeGoogleOneTap();
    }

    return () => {
      // Cleanup
      if (scriptLoaded.current && window.google) {
        // Google One Tap doesn't have a cleanup method
        // The script stays loaded for the session
      }
    };
  }, [clientId]);

  const initializeGoogleOneTap = () => {
    if (!window.google || !buttonRef.current) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: onCredentialResponse,
      auto_select: autoSelect,
      cancel_on_tap_outside: cancelOnTapOutside,
    });

    // Render the button
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: 280,
    });

    // Also show the One Tap prompt
    window.google.accounts.id.prompt();
  };

  return (
    <div
      ref={buttonRef}
      id={containerId}
      className={className}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    />
  );
};
