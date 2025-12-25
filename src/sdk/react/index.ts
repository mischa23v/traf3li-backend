/**
 * @traf3li/auth-react
 * React SDK for Traf3li Authentication
 *
 * Complete authentication solution for React applications with:
 * - Email/Password authentication
 * - OAuth (Google, Microsoft, Apple, GitHub)
 * - Magic Links (passwordless)
 * - Multi-Factor Authentication (MFA/2FA)
 * - Session management
 * - User profile management
 *
 * @example
 * ```tsx
 * import { TrafAuthProvider, useAuth } from '@traf3li/auth-react';
 *
 * // Wrap your app
 * function App() {
 *   return (
 *     <TrafAuthProvider apiUrl="https://api.traf3li.com">
 *       <YourApp />
 *     </TrafAuthProvider>
 *   );
 * }
 *
 * // Use in components
 * function LoginPage() {
 *   const { login, isLoading } = useAuth();
 *
 *   const handleLogin = async (email, password) => {
 *     await login({ email, password });
 *   };
 *
 *   return <LoginForm onSubmit={handleLogin} />;
 * }
 * ```
 */

// ═══════════════════════════════════════════════════════════════
// PROVIDER & CONTEXT
// ═══════════════════════════════════════════════════════════════

export { TrafAuthProvider } from './provider';
export type { TrafAuthProviderProps } from './provider';
export { TrafAuthContext } from './context';

// ═══════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════

export { useAuth } from './hooks/useAuth';
export { useUser } from './hooks/useUser';
export { useMFA } from './hooks/useMFA';
export { useSessions } from './hooks/useSessions';
export { usePasswordless } from './hooks/usePasswordless';
export { useOAuth } from './hooks/useOAuth';

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

export { AuthGuard } from './components/AuthGuard';

// ═══════════════════════════════════════════════════════════════
// HOC (Higher-Order Components)
// ═══════════════════════════════════════════════════════════════

export { withAuth } from './hoc/withAuth';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type {
  // User & Session
  User,
  LawyerProfile,
  Session,

  // Auth Request/Response
  LoginCredentials,
  RegisterData,
  AuthResponse,
  UpdateProfileData,

  // MFA
  MFASetupResponse,
  MFAVerifyResponse,
  MFAStatusResponse,

  // Passwordless
  MagicLinkOptions,
  OTPOptions,
  PasswordlessResponse,

  // OAuth
  OAuthProvider,
  OAuthConfig,
  OAuthCallbackParams,

  // Context & Provider
  TrafAuthConfig,
  AuthContextValue,

  // Hook Return Types
  UseAuthReturn,
  UseUserReturn,
  UseMFAReturn,
  UseSessionsReturn,
  UsePasswordlessReturn,
  UseOAuthReturn,

  // Component Props
  AuthGuardProps,
  WithAuthOptions,

  // Errors
  APIError,
} from './types';

export { AuthError } from './types';

// ═══════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════

export const VERSION = '1.0.0';
