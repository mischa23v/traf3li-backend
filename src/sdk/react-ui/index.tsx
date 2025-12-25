/**
 * Traf3li Auth React UI Components
 * Pre-built, customizable authentication components for React applications
 *
 * @packageDocumentation
 */

// Theme
export { ThemeProvider, useTheme } from './theme/ThemeProvider';
export { defaultTheme } from './theme/defaultTheme';
export { darkTheme } from './theme/darkTheme';
export type { Theme, ThemeColors, ThemeFonts, ThemeSizes, ThemeSpacing, ThemeBorderRadius, ThemeShadows } from './theme/defaultTheme';

// Types
export type {
  User,
  AuthTokens,
  Session,
  MFAStatus,
  BackupCodes,
  PasswordStrengthResult,
  ApiError,
  ApiResponse,
  OAuthProvider,
  ButtonSize,
  ButtonVariant,
  InputType,
  ComponentStyles,
} from './types';

// Core UI Components
export { OTPInput } from './components/OTPInput';
export type { OTPInputProps } from './components/OTPInput';

export { PasswordStrength } from './components/PasswordStrength';
export type { PasswordStrengthProps } from './components/PasswordStrength';

export { SocialLoginButtons } from './components/SocialLoginButtons';
export type { SocialLoginButtonsProps } from './components/SocialLoginButtons';

export { GoogleOneTapButton } from './components/GoogleOneTapButton';
export type { GoogleOneTapButtonProps } from './components/GoogleOneTapButton';

// Authentication Forms
export { LoginForm } from './components/LoginForm';
export type { LoginFormProps } from './components/LoginForm';

export { SignupForm } from './components/SignupForm';
export type { SignupFormProps } from './components/SignupForm';

export { ForgotPasswordForm } from './components/ForgotPasswordForm';
export type { ForgotPasswordFormProps } from './components/ForgotPasswordForm';

export { ResetPasswordForm } from './components/ResetPasswordForm';
export type { ResetPasswordFormProps } from './components/ResetPasswordForm';

// MFA Components
export { MFASetup } from './components/MFASetup';
export type { MFASetupProps } from './components/MFASetup';

export { MFAVerify } from './components/MFAVerify';
export type { MFAVerifyProps } from './components/MFAVerify';

// User Management Components
export { UserProfile } from './components/UserProfile';
export type { UserProfileProps } from './components/UserProfile';

export { SessionManager } from './components/SessionManager';
export type { SessionManagerProps } from './components/SessionManager';

export { PasswordChangeForm } from './components/PasswordChangeForm';
export type { PasswordChangeFormProps } from './components/PasswordChangeForm';

// Utility Functions
export {
  getButtonStyles,
  getInputStyles,
  getLabelStyles,
  getErrorStyles,
  getCardStyles,
  getLinkStyles,
  mergeStyles
} from './utils/styles';
