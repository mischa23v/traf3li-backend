# @traf3li/auth-core

Core JavaScript/TypeScript SDK for Traf3li Authentication.

## Features

- 🔐 **Complete Authentication** - Email/password, OAuth, passwordless (Magic Link, OTP)
- 🔑 **Multi-Factor Authentication** - TOTP, backup codes
- 📱 **Session Management** - Multiple sessions, device tracking, revocation
- 🔄 **Auto Token Refresh** - Automatic token refresh before expiration
- 💾 **Flexible Storage** - localStorage, sessionStorage, cookies, memory, or custom
- 🌐 **Universal** - Works in browser and Node.js (SSR-ready)
- 📦 **Zero Dependencies** - No external runtime dependencies
- 🎯 **TypeScript** - Fully typed with comprehensive type definitions
- 🌳 **Tree-shakeable** - Only include what you use
- ⚡ **Production-Ready** - Error handling, retry logic, CSRF protection

## Installation

```bash
npm install @traf3li/auth-core
```

## Quick Start

```typescript
import { TrafAuthClient } from '@traf3li/auth-core';

// Initialize the client
const auth = new TrafAuthClient({
  apiUrl: 'https://api.traf3li.com',
  storageType: 'localStorage',
  autoRefreshToken: true,
});

// Login
const result = await auth.login('user@example.com', 'password');
console.log('Logged in:', result.user);

// Get current user
const user = await auth.getUser();
console.log('Current user:', user);

// Logout
await auth.logout();
```

## Configuration

```typescript
const auth = new TrafAuthClient({
  // Required
  apiUrl: 'https://api.traf3li.com',

  // Optional
  storageType: 'localStorage', // 'localStorage' | 'sessionStorage' | 'cookie' | 'memory' | 'custom'
  storageKeyPrefix: 'traf3li_',
  autoRefreshToken: true,
  refreshThreshold: 60, // Refresh token 60 seconds before expiry
  persistSession: true,
  redirectUrl: 'https://app.traf3li.com/callback',
  debug: false,
  timeout: 30000,
  retry: true,
  maxRetries: 3,
  csrfProtection: true,
  headers: {
    'X-Custom-Header': 'value',
  },
});
```

## Authentication Methods

### Email/Password

```typescript
// Register
const result = await auth.register({
  username: 'john_doe',
  email: 'john@example.com',
  password: 'SecurePass123!',
  firstName: 'John',
  lastName: 'Doe',
  role: 'client',
});

// Login
const result = await auth.login('john@example.com', 'SecurePass123!', {
  rememberMe: true,
});

// Logout
await auth.logout();

// Logout from all devices
await auth.logoutAll();
```

### Passwordless

```typescript
// Magic Link
await auth.sendMagicLink('user@example.com');
const result = await auth.verifyMagicLink(token);

// OTP
await auth.sendOTP('user@example.com');
const result = await auth.verifyOTP('user@example.com', '123456');
```

### OAuth

```typescript
// Google
await auth.loginWithGoogle();

// Microsoft
await auth.loginWithMicrosoft();

// Any provider
await auth.loginWithProvider('github', {
  scopes: ['user:email'],
  prompt: 'consent',
});

// Handle callback (after redirect)
const result = await auth.handleOAuthCallback();

// Google One Tap
const result = await auth.handleGoogleOneTap(credential);
```

### Anonymous Users

```typescript
// Create anonymous session
const result = await auth.loginAnonymously();

// Convert to full account
const result = await auth.convertAnonymousUser({
  email: 'user@example.com',
  password: 'SecurePass123!',
  firstName: 'John',
  lastName: 'Doe',
});
```

## Multi-Factor Authentication (MFA)

```typescript
// Setup MFA
const setup = await auth.setupMFA();
console.log('QR Code:', setup.qrCode);
console.log('Secret:', setup.secret);

// Verify and enable MFA
await auth.verifyMFA('123456');

// Generate backup codes
const codes = await auth.generateBackupCodes();
console.log('Backup codes:', codes.codes);

// Verify backup code
const result = await auth.verifyBackupCode('ABC123DEF456');

// Get MFA status
const status = await auth.getMFAStatus();
console.log('MFA enabled:', status.enabled);

// Disable MFA
await auth.disableMFA('123456');
```

## Session Management

```typescript
// Get current user
const user = await auth.getUser();

// Refresh token manually
const result = await auth.refreshToken();

// Get all sessions
const sessions = await auth.getSessions();

// Revoke a specific session
await auth.revokeSession(sessionId);
```

## Password Management

```typescript
// Change password
await auth.changePassword('oldPassword', 'newPassword');

// Forgot password
await auth.forgotPassword('user@example.com');

// Reset password
await auth.resetPassword(token, 'newPassword');
```

## Utility Methods

```typescript
// Check availability
const result = await auth.checkAvailability('email', 'user@example.com');
console.log('Available:', result.available);

// Verify email
await auth.verifyEmail(token);

// Resend verification email
await auth.resendVerificationEmail();

// Get onboarding status
const status = await auth.getOnboardingStatus();
```

## Event Handling

```typescript
// Listen to auth state changes
const unsubscribe = auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event, session);
});

// Listen to specific events
auth.on('SIGNED_IN', (event, session) => {
  console.log('User signed in:', session);
});

auth.on('SIGNED_OUT', (event, session) => {
  console.log('User signed out');
});

auth.on('TOKEN_REFRESHED', (event, session) => {
  console.log('Token refreshed:', session);
});

auth.on('SESSION_EXPIRED', (event, session) => {
  console.log('Session expired');
});

auth.on('MFA_REQUIRED', (event, session) => {
  console.log('MFA required');
});

// Listen to errors
auth.onError((error) => {
  console.error('Auth error:', error);
});

// Unsubscribe
unsubscribe();
// or
auth.off('SIGNED_IN', callback);
```

## Error Handling

```typescript
import {
  TrafAuthError,
  InvalidCredentialsError,
  MFARequiredError,
  EmailNotVerifiedError,
} from '@traf3li/auth-core';

try {
  await auth.login(email, password);
} catch (error) {
  if (error instanceof MFARequiredError) {
    // Show MFA input
    console.log('MFA Token:', error.mfaToken);
  } else if (error instanceof InvalidCredentialsError) {
    // Show error message
    console.error('Invalid credentials');
  } else if (error instanceof EmailNotVerifiedError) {
    // Prompt to verify email
    console.error('Please verify your email');
  } else if (TrafAuthError.isTrafAuthError(error)) {
    // Handle other auth errors
    console.error('Auth error:', error.message, error.code);
  } else {
    // Unknown error
    console.error('Unknown error:', error);
  }
}
```

## Custom Storage Adapter

```typescript
import { TrafAuthClient, StorageAdapter } from '@traf3li/auth-core';

class CustomStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    // Your implementation
    return null;
  }

  async setItem(key: string, value: string): Promise<void> {
    // Your implementation
  }

  async removeItem(key: string): Promise<void> {
    // Your implementation
  }

  async clear(): Promise<void> {
    // Your implementation
  }
}

const auth = new TrafAuthClient({
  apiUrl: 'https://api.traf3li.com',
  storageType: 'custom',
  storageAdapter: new CustomStorageAdapter(),
});
```

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type {
  User,
  AuthResult,
  Session,
  MFASetupResult,
  OAuthProvider,
} from '@traf3li/auth-core';

const handleLogin = async (email: string, password: string): Promise<User> => {
  const result: AuthResult = await auth.login(email, password);
  return result.user;
};
```

## Tree-shaking

Import only what you need:

```typescript
// Import specific parts
import { TrafAuthClient } from '@traf3li/auth-core/client';
import { LocalStorageAdapter } from '@traf3li/auth-core/storage';
import { isValidEmail, isValidPassword } from '@traf3li/auth-core/utils';
import type { User, AuthResult } from '@traf3li/auth-core/types';
```

## SSR (Server-Side Rendering)

Works seamlessly in SSR environments:

```typescript
// Automatically uses memory storage in Node.js
const auth = new TrafAuthClient({
  apiUrl: 'https://api.traf3li.com',
  storageType: 'memory', // Explicitly use memory storage
});

// Or use custom adapter for Redis, database, etc.
const auth = new TrafAuthClient({
  apiUrl: 'https://api.traf3li.com',
  storageType: 'custom',
  storageAdapter: new RedisStorageAdapter(),
});
```

## License

MIT

## Support

- Documentation: https://docs.traf3li.com
- Issues: https://github.com/traf3li/traf3li-backend/issues
- Email: support@traf3li.com
