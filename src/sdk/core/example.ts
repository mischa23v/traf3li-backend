/**
 * Traf3li Auth SDK - Usage Examples
 *
 * This file demonstrates how to use the Traf3li Auth SDK
 */

import { TrafAuthClient } from './client';
import type { User, AuthResult } from './types';
import {
  MFARequiredError,
  InvalidCredentialsError,
  EmailNotVerifiedError,
} from './errors';

// ═══════════════════════════════════════════════════════════════
// 1. INITIALIZATION
// ═══════════════════════════════════════════════════════════════

const auth = new TrafAuthClient({
  apiUrl: 'http://localhost:5000', // or 'https://api.traf3li.com'
  storageType: 'localStorage',
  autoRefreshToken: true,
  refreshThreshold: 60,
  persistSession: true,
  debug: true,
});

// ═══════════════════════════════════════════════════════════════
// 2. EMAIL/PASSWORD AUTHENTICATION
// ═══════════════════════════════════════════════════════════════

async function registerExample() {
  try {
    const result = await auth.register({
      username: 'john_doe',
      email: 'john@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      country: 'United States',
      city: 'New York',
      role: 'client',
    });

    console.log('Registration successful:', result.user);
    console.log('Access token:', result.accessToken);
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      console.error('Invalid credentials');
    } else {
      console.error('Registration failed:', error);
    }
  }
}

async function loginExample() {
  try {
    const result = await auth.login('john@example.com', 'SecurePass123!', {
      rememberMe: true,
    });

    console.log('Login successful:', result.user);
  } catch (error) {
    if (error instanceof MFARequiredError) {
      // User has MFA enabled, need to verify MFA code
      console.log('MFA required, token:', error.mfaToken);
      await handleMFAVerification(error.mfaToken!);
    } else if (error instanceof InvalidCredentialsError) {
      console.error('Invalid email or password');
    } else {
      console.error('Login failed:', error);
    }
  }
}

async function logoutExample() {
  try {
    await auth.logout();
    console.log('Logged out successfully');
  } catch (error) {
    console.error('Logout failed:', error);
  }
}

async function logoutAllExample() {
  try {
    await auth.logoutAll();
    console.log('Logged out from all devices');
  } catch (error) {
    console.error('Logout all failed:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// 3. PASSWORDLESS AUTHENTICATION
// ═══════════════════════════════════════════════════════════════

async function magicLinkExample() {
  try {
    // Send magic link
    await auth.sendMagicLink('john@example.com', 'https://app.example.com/auth/callback');
    console.log('Magic link sent to email');

    // After user clicks the link and is redirected with token
    const token = 'magic_link_token_from_url';
    const result = await auth.verifyMagicLink(token);
    console.log('Magic link verified:', result.user);
  } catch (error) {
    console.error('Magic link failed:', error);
  }
}

async function otpExample() {
  try {
    // Send OTP
    await auth.sendOTP('john@example.com', 'login');
    console.log('OTP sent to email');

    // Check OTP status
    const status = await auth.checkOTPStatus('john@example.com');
    console.log('OTP status:', status);

    // Verify OTP
    const code = '123456'; // User enters this
    const result = await auth.verifyOTP('john@example.com', code);
    console.log('OTP verified:', result.user);
  } catch (error) {
    console.error('OTP failed:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// 4. OAUTH AUTHENTICATION
// ═══════════════════════════════════════════════════════════════

async function oauthExample() {
  try {
    // Initiate Google OAuth (redirects to Google)
    await auth.loginWithGoogle({
      scopes: ['email', 'profile'],
      prompt: 'consent',
    });
  } catch (error) {
    console.error('OAuth initiation failed:', error);
  }
}

async function oauthCallbackExample() {
  try {
    // Handle OAuth callback after redirect
    const result = await auth.handleOAuthCallback();
    console.log('OAuth successful:', result.user);
  } catch (error) {
    console.error('OAuth callback failed:', error);
  }
}

async function googleOneTapExample() {
  try {
    // Handle Google One Tap credential
    const credential = 'google_one_tap_credential';
    const result = await auth.handleGoogleOneTap(credential);
    console.log('Google One Tap successful:', result.user);
  } catch (error) {
    console.error('Google One Tap failed:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// 5. MULTI-FACTOR AUTHENTICATION (MFA)
// ═══════════════════════════════════════════════════════════════

async function setupMFAExample() {
  try {
    // Generate QR code for authenticator app
    const setup = await auth.setupMFA();
    console.log('QR Code:', setup.qrCode);
    console.log('Secret:', setup.secret);
    console.log('Setup Key:', setup.setupKey);

    // User scans QR code and enters the code from their authenticator app
    const code = '123456';
    await auth.verifyMFA(code);
    console.log('MFA enabled successfully');

    // Generate backup codes
    const codes = await auth.generateBackupCodes();
    console.log('Backup codes:', codes.codes);
  } catch (error) {
    console.error('MFA setup failed:', error);
  }
}

async function handleMFAVerification(mfaToken: string) {
  try {
    // User enters MFA code
    const code = '123456';
    const result = await auth.verifyMFA(code, mfaToken);
    console.log('MFA verified, logged in:', result.user);
  } catch (error) {
    console.error('MFA verification failed:', error);
  }
}

async function mfaStatusExample() {
  try {
    const status = await auth.getMFAStatus();
    console.log('MFA enabled:', status.enabled);
    console.log('Backup codes remaining:', status.backupCodesCount);
  } catch (error) {
    console.error('Failed to get MFA status:', error);
  }
}

async function disableMFAExample() {
  try {
    const code = '123456';
    await auth.disableMFA(code);
    console.log('MFA disabled');
  } catch (error) {
    console.error('Failed to disable MFA:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// 6. SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

async function sessionManagementExample() {
  try {
    // Get current user
    const user = await auth.getUser();
    console.log('Current user:', user);

    // Get all sessions
    const sessions = await auth.getSessions();
    console.log('Active sessions:', sessions);

    // Revoke a specific session
    const sessionId = sessions[0].id;
    await auth.revokeSession(sessionId);
    console.log('Session revoked');

    // Manually refresh token
    const result = await auth.refreshToken();
    console.log('Token refreshed:', result.accessToken);
  } catch (error) {
    console.error('Session management failed:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// 7. PASSWORD MANAGEMENT
// ═══════════════════════════════════════════════════════════════

async function changePasswordExample() {
  try {
    await auth.changePassword('oldPassword123!', 'newPassword456!');
    console.log('Password changed successfully');
  } catch (error) {
    console.error('Password change failed:', error);
  }
}

async function forgotPasswordExample() {
  try {
    await auth.forgotPassword('john@example.com');
    console.log('Password reset email sent');
  } catch (error) {
    console.error('Forgot password failed:', error);
  }
}

async function resetPasswordExample() {
  try {
    const token = 'reset_token_from_email';
    await auth.resetPassword(token, 'newPassword789!');
    console.log('Password reset successful');
  } catch (error) {
    console.error('Password reset failed:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// 8. UTILITY METHODS
// ═══════════════════════════════════════════════════════════════

async function utilityMethodsExample() {
  try {
    // Check email availability
    const emailCheck = await auth.checkAvailability('email', 'john@example.com');
    console.log('Email available:', emailCheck.available);

    // Check username availability
    const usernameCheck = await auth.checkAvailability('username', 'john_doe');
    console.log('Username available:', usernameCheck.available);

    // Verify email with token
    const token = 'email_verification_token';
    await auth.verifyEmail(token);
    console.log('Email verified');

    // Resend verification email
    await auth.resendVerificationEmail();
    console.log('Verification email sent');

    // Get onboarding status
    const onboarding = await auth.getOnboardingStatus();
    console.log('Onboarding completed:', onboarding.completed);
  } catch (error) {
    console.error('Utility method failed:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// 9. EVENT HANDLING
// ═══════════════════════════════════════════════════════════════

function eventHandlingExample() {
  // Listen to all auth state changes
  const unsubscribe = auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event);
    console.log('Session:', session);

    switch (event) {
      case 'SIGNED_IN':
        console.log('User signed in');
        break;
      case 'SIGNED_OUT':
        console.log('User signed out');
        break;
      case 'TOKEN_REFRESHED':
        console.log('Token refreshed');
        break;
      case 'SESSION_EXPIRED':
        console.log('Session expired');
        break;
      case 'MFA_REQUIRED':
        console.log('MFA required');
        break;
    }
  });

  // Listen to specific events
  auth.on('SIGNED_IN', (event, session) => {
    console.log('Signed in event:', session);
  });

  auth.on('SIGNED_OUT', (event, session) => {
    console.log('Signed out event');
  });

  // Listen to errors
  auth.onError((error) => {
    console.error('Auth error:', error);
  });

  // Unsubscribe when needed
  // unsubscribe();
}

// ═══════════════════════════════════════════════════════════════
// 10. ANONYMOUS USERS
// ═══════════════════════════════════════════════════════════════

async function anonymousUserExample() {
  try {
    // Create anonymous session
    const result = await auth.loginAnonymously();
    console.log('Anonymous user created:', result.user);
    console.log('Is anonymous:', result.user.isAnonymous);

    // User can use the app anonymously...

    // Later, convert to full account
    const convertedResult = await auth.convertAnonymousUser({
      email: 'john@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
    });

    console.log('Anonymous user converted:', convertedResult.user);
    console.log('Is anonymous:', convertedResult.user.isAnonymous); // false
  } catch (error) {
    console.error('Anonymous user operation failed:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// 11. ERROR HANDLING
// ═══════════════════════════════════════════════════════════════

async function errorHandlingExample() {
  try {
    await auth.login('john@example.com', 'wrongpassword');
  } catch (error) {
    if (error instanceof MFARequiredError) {
      console.log('MFA is required');
      console.log('MFA token:', error.mfaToken);
    } else if (error instanceof InvalidCredentialsError) {
      console.log('Invalid email or password');
    } else if (error instanceof EmailNotVerifiedError) {
      console.log('Please verify your email address');
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 12. COMPLETE AUTHENTICATION FLOW
// ═══════════════════════════════════════════════════════════════

async function completeAuthFlow() {
  // Setup event listeners
  auth.onAuthStateChange((event, session) => {
    console.log(`[${new Date().toISOString()}] Auth state: ${event}`);

    if (event === 'SIGNED_IN' && session) {
      console.log('Welcome:', session.userId);
    } else if (event === 'SIGNED_OUT') {
      console.log('Goodbye!');
    }
  });

  try {
    // 1. Check if user is already logged in
    let user = await auth.getUser();

    if (user) {
      console.log('Already logged in as:', user.email);
      return;
    }

    // 2. Check email availability
    const emailCheck = await auth.checkAvailability('email', 'john@example.com');

    if (emailCheck.available) {
      // 3. Register new user
      console.log('Email available, registering...');
      const registerResult = await auth.register({
        username: 'john_doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'client',
      });

      user = registerResult.user;
      console.log('Registered successfully:', user.email);
    } else {
      // 4. Login existing user
      console.log('Email exists, logging in...');

      try {
        const loginResult = await auth.login('john@example.com', 'SecurePass123!');
        user = loginResult.user;
        console.log('Logged in successfully:', user.email);
      } catch (error) {
        if (error instanceof MFARequiredError) {
          // 5. Handle MFA if enabled
          console.log('MFA required');
          const mfaCode = '123456'; // Get from user input
          const mfaResult = await auth.verifyMFA(mfaCode, error.mfaToken);
          user = mfaResult.user;
          console.log('MFA verified:', user.email);
        } else {
          throw error;
        }
      }
    }

    // 6. Check if email is verified
    if (!user.emailVerified) {
      console.log('Email not verified, sending verification email...');
      await auth.resendVerificationEmail();
    }

    // 7. Get user sessions
    const sessions = await auth.getSessions();
    console.log('Active sessions:', sessions.length);

    // 8. Setup MFA if not already enabled
    if (!user.mfaEnabled) {
      console.log('MFA not enabled, would you like to enable it?');
      // const setup = await auth.setupMFA();
      // Show QR code and verify...
    }

    // 9. Continue using the app...
    console.log('Authentication flow completed successfully!');

    // 10. Logout when done
    // await auth.logout();
  } catch (error) {
    console.error('Authentication flow failed:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// RUN EXAMPLES
// ═══════════════════════════════════════════════════════════════

// Uncomment to run examples
// completeAuthFlow();
// registerExample();
// loginExample();
// magicLinkExample();
// otpExample();
// setupMFAExample();
// sessionManagementExample();
// anonymousUserExample();

export {
  registerExample,
  loginExample,
  logoutExample,
  magicLinkExample,
  otpExample,
  oauthExample,
  setupMFAExample,
  sessionManagementExample,
  changePasswordExample,
  completeAuthFlow,
};
