/**
 * @traf3li/auth-react - Type Definitions
 * React-specific types for Traf3li Authentication SDK
 */

// ═══════════════════════════════════════════════════════════════
// USER & SESSION TYPES
// ═══════════════════════════════════════════════════════════════

export interface User {
  _id: string;
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  image?: string;
  role: 'client' | 'lawyer' | 'admin' | 'super_admin';
  isSeller?: boolean;
  isSoloLawyer?: boolean;
  lawyerWorkMode?: 'solo' | 'firm_owner' | 'firm_member';

  // Firm/Tenant Context
  firmId?: string;
  firmRole?: 'owner' | 'admin' | 'lawyer' | 'staff';
  firmStatus?: 'active' | 'pending' | 'suspended';
  firm?: {
    id: string;
    name: string;
    nameEn?: string;
    status: string;
  };
  tenant?: {
    id: string;
    name: string;
    nameEn?: string;
    status: string;
    subscription?: {
      plan: string;
      status: string;
    };
  };

  // Permissions
  permissions?: Record<string, any>;

  // Profile
  description?: string;
  country?: string;
  nationality?: string;
  region?: string;
  city?: string;
  timezone?: string;

  // Lawyer Profile
  lawyerProfile?: LawyerProfile;

  // Email Verification
  emailVerified?: boolean;
  emailVerifiedAt?: string;

  // MFA
  mfaEnabled?: boolean;
  mfaVerifiedAt?: string;

  // Notification Preferences
  notificationPreferences?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
    whatsapp?: boolean;
  };

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
}

export interface LawyerProfile {
  isLicensed: boolean;
  licenseNumber?: string;
  yearsExperience?: number;
  workType?: string;
  firmName?: string;
  firmID?: string;
  specialization?: string[];
  languages?: string[];
  courts?: Array<{
    courtId: string;
    courtName: string;
    caseCount?: number;
  }>;
  isRegisteredKhebra?: boolean;
  serviceType?: string;
  pricingModel?: string[];
  hourlyRateMin?: number;
  hourlyRateMax?: number;
  acceptsRemote?: boolean | null;
}

export interface Session {
  _id: string;
  userId: string;
  token: string;
  deviceInfo?: {
    userAgent?: string;
    ip?: string;
    deviceId?: string;
    browser?: string;
    os?: string;
    device?: string;
  };
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };
  isActive: boolean;
  isCurrent?: boolean;
  expiresAt: string;
  createdAt: string;
  lastActivity?: string;
}

// ═══════════════════════════════════════════════════════════════
// AUTH REQUEST/RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════

export interface LoginCredentials {
  username?: string;
  email?: string;
  password: string;
  mfaCode?: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  image?: string;
  description?: string;

  // Location
  country?: string;
  nationality?: string;
  region?: string;
  city?: string;

  // Role & Type
  isSeller?: boolean;
  role?: 'lawyer' | 'client';
  lawyerMode?: 'dashboard' | 'marketplace';

  // Lawyer Work Mode
  lawyerWorkMode?: 'solo' | 'create_firm' | 'join_firm';
  firmData?: {
    name: string;
    nameEn?: string;
    licenseNumber: string;
    email?: string;
    phone?: string;
    region?: string;
    city?: string;
    address?: string;
    website?: string;
    description?: string;
    specializations?: string[];
  };
  invitationCode?: string;

  // Lawyer Profile
  isLicensed?: boolean;
  licenseNumber?: string;
  courts?: Record<string, any>;
  yearsOfExperience?: number;
  workType?: string;
  firmName?: string;
  specializations?: string[];
  languages?: string[];
  isRegisteredKhebra?: boolean;
  serviceType?: string;
  pricingModel?: string[];
  hourlyRateMin?: number;
  hourlyRateMax?: number;
  acceptsRemote?: boolean | null;
}

export interface AuthResponse {
  error: boolean;
  message: string;
  messageEn?: string;
  user?: User;
  csrfToken?: string;
  mfaRequired?: boolean;
  code?: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  image?: string;
  description?: string;
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  notificationPreferences?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
    whatsapp?: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════
// MFA TYPES
// ═══════════════════════════════════════════════════════════════

export interface MFASetupResponse {
  success: boolean;
  secret: string;
  qrCode: string;
  backupCodes: string[];
  message?: string;
}

export interface MFAVerifyResponse {
  success: boolean;
  message?: string;
  remainingCodes?: number;
}

export interface MFAStatusResponse {
  enabled: boolean;
  verifiedAt?: string;
  backupCodesRemaining?: number;
}

// ═══════════════════════════════════════════════════════════════
// PASSWORDLESS TYPES
// ═══════════════════════════════════════════════════════════════

export interface MagicLinkOptions {
  email: string;
  purpose?: 'login' | 'register' | 'verify_email';
  redirectUrl?: string;
}

export interface OTPOptions {
  phone: string;
  purpose?: 'login' | 'register' | 'verify_phone';
}

export interface PasswordlessResponse {
  error: boolean;
  success: boolean;
  message: string;
  messageEn?: string;
  expiresInMinutes?: number;
  code?: string;
}

// ═══════════════════════════════════════════════════════════════
// OAUTH TYPES
// ═══════════════════════════════════════════════════════════════

export type OAuthProvider = 'google' | 'microsoft' | 'apple' | 'github';

export interface OAuthConfig {
  provider: OAuthProvider;
  clientId?: string;
  redirectUri?: string;
  scope?: string;
}

export interface OAuthCallbackParams {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

// ═══════════════════════════════════════════════════════════════
// CONTEXT & PROVIDER TYPES
// ═══════════════════════════════════════════════════════════════

export interface TrafAuthConfig {
  apiUrl: string;
  firmId?: string;
  onAuthStateChange?: (user: User | null) => void;
  onError?: (error: Error) => void;
  autoRefreshToken?: boolean;
  tokenRefreshInterval?: number; // in milliseconds
  persistSession?: boolean;
  storageKey?: string;
}

export interface AuthContextValue {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;

  // Auth Methods
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (data: RegisterData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshToken: () => Promise<void>;

  // OAuth Methods
  loginWithGoogle: () => Promise<void>;
  loginWithMicrosoft: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  loginWithProvider: (provider: OAuthProvider) => Promise<void>;
  handleOAuthCallback: (params: OAuthCallbackParams) => Promise<AuthResponse>;

  // Google One Tap
  handleGoogleOneTap: (credential: string) => Promise<AuthResponse>;

  // Passwordless Methods
  sendMagicLink: (options: MagicLinkOptions) => Promise<PasswordlessResponse>;
  verifyMagicLink: (token: string) => Promise<AuthResponse>;

  // Password Reset
  forgotPassword: (email: string) => Promise<PasswordlessResponse>;
  resetPassword: (token: string, newPassword: string) => Promise<PasswordlessResponse>;

  // Email Verification
  verifyEmail: (token: string) => Promise<PasswordlessResponse>;
  resendVerificationEmail: () => Promise<PasswordlessResponse>;

  // User Management
  updateProfile: (data: UpdateProfileData) => Promise<User>;
  refetchUser: () => Promise<void>;

  // CSRF Token
  csrfToken: string | null;
  refreshCsrfToken: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════
// HOOK RETURN TYPES
// ═══════════════════════════════════════════════════════════════

export interface UseAuthReturn extends AuthContextValue {}

export interface UseUserReturn {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<User>;
}

export interface UseMFAReturn {
  isEnabled: boolean;
  isLoading: boolean;
  error: Error | null;

  // Setup & Verification
  setupMFA: () => Promise<MFASetupResponse>;
  verifySetup: (code: string) => Promise<MFAVerifyResponse>;

  // Disable MFA
  disable: (password: string) => Promise<{ success: boolean }>;

  // Backup Codes
  backupCodes: string[] | null;
  backupCodesRemaining: number;
  regenerateBackupCodes: (password: string) => Promise<string[]>;

  // Refresh
  refetch: () => Promise<void>;
}

export interface UseSessionsReturn {
  sessions: Session[];
  currentSession: Session | null;
  isLoading: boolean;
  error: Error | null;

  revokeSession: (sessionId: string) => Promise<void>;
  revokeAllOther: () => Promise<void>;
  refetch: () => Promise<void>;
}

export interface UsePasswordlessReturn {
  // Magic Link
  sendMagicLink: (options: MagicLinkOptions) => Promise<PasswordlessResponse>;
  verifyMagicLink: (token: string) => Promise<AuthResponse>;

  // OTP (if supported)
  sendOTP: (options: OTPOptions) => Promise<PasswordlessResponse>;
  verifyOTP: (phone: string, code: string) => Promise<AuthResponse>;

  // State
  isLoading: boolean;
  error: Error | null;
}

export interface UseOAuthReturn {
  loginWithProvider: (provider: OAuthProvider, redirectUri?: string) => Promise<void>;
  handleCallback: (params: OAuthCallbackParams) => Promise<AuthResponse>;
  availableProviders: OAuthProvider[];
  isLoading: boolean;
  error: Error | null;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT TYPES
// ═══════════════════════════════════════════════════════════════

export interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireRoles?: string[];
  requirePermissions?: string[];
  redirectTo?: string;
  fallback?: React.ReactNode;
  onUnauthorized?: () => void;
}

export interface WithAuthOptions {
  requireAuth?: boolean;
  requireRoles?: string[];
  requirePermissions?: string[];
  redirectTo?: string;
  loader?: React.ComponentType;
}

// ═══════════════════════════════════════════════════════════════
// API ERROR TYPES
// ═══════════════════════════════════════════════════════════════

export interface APIError {
  error: true;
  message: string;
  messageEn?: string;
  code?: string;
  details?: any;
  status?: number;
}

export class AuthError extends Error {
  public code?: string;
  public status?: number;
  public details?: any;

  constructor(message: string, code?: string, status?: number, details?: any) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}
