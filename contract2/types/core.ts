/**
 * Core API Type Definitions for Traf3li Backend
 *
 * This file contains TypeScript type definitions for the following modules:
 * - Auth (Authentication & Authorization)
 * - User (User Profiles & Management)
 * - Case (Legal Case Management)
 * - Task (Task & Project Management)
 * - Client (Client Relationship Management)
 *
 * Generated from route and controller analysis
 * Last updated: 2026-01-06
 */

// ═══════════════════════════════════════════════════════════════
// COMMON TYPES & ENUMS
// ═══════════════════════════════════════════════════════════════

export interface ApiResponse<T = any> {
  success: boolean;
  error?: boolean;
  message?: string;
  messageEn?: string;
  messageAr?: string;
  data?: T;
  code?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ErrorResponse {
  error: boolean;
  message: string;
  messageEn?: string;
  code?: string;
  details?: any[];
  errors?: string[];
}

// User Role Enums
export type UserRole = 'client' | 'lawyer' | 'admin';
export type FirmRole = 'owner' | 'admin' | 'partner' | 'lawyer' | 'paralegal' | 'secretary' | 'accountant' | 'departed';
export type FirmStatus = 'active' | 'departed' | 'suspended' | 'pending';
export type LawyerMode = 'marketplace' | 'dashboard';
export type LawyerWorkMode = 'solo' | 'firm_owner' | 'firm_member';

// Case Enums
export type CaseStatus = 'active' | 'closed' | 'appeal' | 'settlement' | 'on-hold' | 'completed' | 'won' | 'lost' | 'settled';
export type CaseOutcome = 'won' | 'lost' | 'settled' | 'ongoing';
export type CasePriority = 'low' | 'medium' | 'high' | 'critical';
export type EntityType = 'court' | 'committee' | 'arbitration';

// Task Enums
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'done' | 'canceled';
export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'critical';
export type TaskLabel = 'bug' | 'feature' | 'documentation' | 'enhancement' | 'question' | 'legal' | 'administrative' | 'urgent';

// Client Enums
export type ClientType = 'individual' | 'company';
export type ClientStatus = 'active' | 'inactive' | 'suspended' | 'blacklisted';
export type ClientSource = 'website' | 'referral' | 'returning' | 'ads' | 'social' | 'walkin' | 'platform' | 'external' | 'cold_call' | 'event';

// ═══════════════════════════════════════════════════════════════
// AUTH MODULE
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// Registration & Login
// ─────────────────────────────────────────────────────────────

// POST /api/auth/check-availability - Check username/email/phone availability
export interface CheckAvailabilityRequest {
  email?: string;
  username?: string;
  phone?: string;
}

export interface CheckAvailabilityResponse {
  error: boolean;
  available: boolean;
  field?: string;
  message?: string;
}

// POST /api/auth/register - Register new user
export interface RegisterRequest {
  // Basic info
  username: string;
  email: string;
  password?: string; // Optional for OAuth users
  firstName: string;
  lastName: string;
  phone: string;
  image?: string;
  description?: string;

  // Location
  country?: string;
  nationality?: string;
  region?: string;
  city?: string;

  // Role
  isSeller?: boolean;
  role?: UserRole;
  lawyerMode?: LawyerMode;

  // Lawyer work mode
  lawyerWorkMode?: LawyerWorkMode;
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

  // Lawyer profile
  isLicensed?: boolean;
  licenseNumber?: string;
  courts?: Record<string, { selected: boolean; name: string; caseCount?: number }>;
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
  acceptsRemote?: boolean;

  // OAuth
  oauthProvider?: string;
  oauthVerified?: boolean;
}

export interface RegisterResponse {
  error: boolean;
  message: string;
  user: {
    id: string;
    username: string;
    email: string;
    role: UserRole;
    isSoloLawyer: boolean;
    firmId: string | null;
    firmRole: FirmRole | null;
  };
  firm?: {
    id: string;
    name: string;
    licenseNumber?: string;
    role?: FirmRole;
  };
  isNewUser?: boolean;
  accountLinked?: boolean;
}

// POST /api/auth/anonymous - Create anonymous session
export interface AnonymousLoginResponse {
  error: boolean;
  message: string;
  messageEn: string;
  user: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isAnonymous: boolean;
  };
  isAnonymous: boolean;
}

// POST /api/auth/anonymous/convert - Convert anonymous to full account
export interface ConvertAnonymousRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface ConvertAnonymousResponse {
  error: boolean;
  message: string;
  messageEn: string;
  user: UserProfile;
}

// POST /api/auth/login - Login with credentials
export interface LoginRequest {
  email: string;
  password: string;
  captchaToken?: string;
}

export interface LoginResponse {
  error: boolean;
  message: string;
  messageEn?: string;
  user: UserProfile;
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
}

// POST /api/auth/google/one-tap - Google One Tap authentication
export interface GoogleOneTapRequest {
  credential: string;
  firmId?: string;
}

export interface GoogleOneTapResponse {
  error: boolean;
  message: string;
  messageEn: string;
  user: UserProfile;
  isNewUser: boolean;
  accountLinked: boolean;
}

// POST /api/auth/logout - Logout current session
export interface LogoutResponse {
  success: boolean;
  message: string;
}

// POST /api/auth/logout-all - Logout from all devices
export interface LogoutAllResponse {
  error: boolean;
  message: string;
}

// POST /api/auth/refresh - Refresh access token
export interface RefreshTokenRequest {
  refreshToken?: string;
}

export interface RefreshTokenResponse {
  error: boolean;
  message: string;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  user: any;
}

// GET /api/auth/me - Get current user
export interface AuthStatusResponse {
  success: boolean;
  data: UserProfile;
}

// GET /api/auth/onboarding-status - Get onboarding status
export interface OnboardingStatusResponse {
  success: boolean;
  data: {
    isComplete: boolean;
    hasStarted: boolean;
    progress: {
      total: number;
      completed: number;
      percentage: number;
    };
    required: {
      total: number;
      completed: number;
      isComplete: boolean;
    };
    nextTask: {
      taskId: string;
      name: string;
      route: string;
    } | null;
  };
}

// ─────────────────────────────────────────────────────────────
// OTP Authentication
// ─────────────────────────────────────────────────────────────

// POST /api/auth/send-otp - Send OTP to email
export interface SendOTPRequest {
  email: string;
  purpose?: 'login' | 'registration' | 'verify_email' | 'password_reset';
}

export interface OTPResponse {
  error: boolean;
  message: string;
  messageEn?: string;
  expiresIn: number;
}

// POST /api/auth/verify-otp - Verify OTP
export interface VerifyOTPRequest {
  email: string;
  otp: string;
  purpose?: string;
}

// POST /api/auth/resend-otp - Resend OTP
// Uses SendOTPRequest

// GET /api/auth/otp-status - Check OTP status
export interface OTPStatusResponse {
  success: boolean;
  data: {
    attemptsRemaining: number;
    resetTime: string;
  };
}

// ─────────────────────────────────────────────────────────────
// Phone OTP
// ─────────────────────────────────────────────────────────────

// POST /api/auth/phone/send-otp - Send OTP via SMS
export interface SendPhoneOTPRequest {
  phone: string;
  purpose?: 'login' | 'registration' | 'verify_phone' | 'password_reset' | 'transaction';
}

export interface SendPhoneOTPResponse {
  success: boolean;
  message: string;
  messageAr: string;
  expiresIn: number;
  phone: string;
  provider: 'twilio' | 'msg91';
}

// POST /api/auth/phone/verify-otp - Verify phone OTP
export interface VerifyPhoneOTPRequest {
  phone: string;
  otp: string;
  purpose?: string;
}

export interface VerifyPhoneOTPResponse {
  success: boolean;
  message: string;
  messageAr: string;
  user?: any;
}

// GET /api/auth/phone/otp-status - Check phone OTP status
export interface PhoneOTPStatusResponse {
  success: boolean;
  canRequest: boolean;
  waitTime: number;
  message: string;
  messageAr: string;
}

// ─────────────────────────────────────────────────────────────
// Magic Link
// ─────────────────────────────────────────────────────────────

// POST /api/auth/magic-link/send - Send magic link
export interface SendMagicLinkRequest {
  email: string;
  purpose?: 'login' | 'register' | 'verify_email';
  redirectUrl?: string;
}

export interface SendMagicLinkResponse {
  error: boolean;
  message: string;
  messageEn: string;
  expiresInMinutes: number;
}

// POST /api/auth/magic-link/verify - Verify magic link
export interface VerifyMagicLinkRequest {
  token: string;
}

export interface VerifyMagicLinkResponse {
  error: boolean;
  message: string;
  messageEn: string;
  user: UserProfile;
  redirectUrl?: string;
}

// ─────────────────────────────────────────────────────────────
// MFA (Multi-Factor Authentication)
// ─────────────────────────────────────────────────────────────

// POST /api/auth/mfa/backup-codes/generate - Generate backup codes
export interface GenerateBackupCodesResponse {
  error: boolean;
  message: string;
  codes: string[];
  remainingCodes: number;
}

// POST /api/auth/mfa/backup-codes/verify - Verify backup code
export interface VerifyBackupCodeRequest {
  userId: string;
  code: string;
}

export interface VerifyBackupCodeResponse {
  error: boolean;
  valid: boolean;
  remainingCodes: number;
}

// POST /api/auth/mfa/backup-codes/regenerate - Regenerate backup codes
// Returns same as GenerateBackupCodesResponse

// GET /api/auth/mfa/backup-codes/count - Get backup codes count
export interface BackupCodesCountResponse {
  error: boolean;
  remainingCodes: number;
}

// GET /api/auth/mfa/status - Get MFA status
export interface MFAStatusResponse {
  error: boolean;
  mfaEnabled: boolean;
  hasTOTP: boolean;
  hasBackupCodes: boolean;
  remainingCodes: number;
}

// ─────────────────────────────────────────────────────────────
// Session Management
// ─────────────────────────────────────────────────────────────

export interface SessionInfo {
  id: string;
  device: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ip: string;
  location?: {
    country: string;
    city: string;
    region: string;
  };
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  isCurrent: boolean;
  isNewDevice?: boolean;
  isSuspicious: boolean;
  suspiciousReasons: ('ip_mismatch' | 'user_agent_mismatch' | 'impossible_travel' | 'location_change' | 'multiple_locations' | 'abnormal_activity_pattern')[];
  suspiciousDetectedAt?: string;
}

// GET /api/auth/sessions - List active sessions
export interface GetActiveSessionsResponse {
  error: boolean;
  message: string;
  sessions: SessionInfo[];
  count: number;
}

// GET /api/auth/sessions/current - Get current session
export interface GetCurrentSessionResponse {
  error: boolean;
  message: string;
  session: SessionInfo;
  securityWarnings?: Array<{
    type: 'ip_mismatch' | 'user_agent_mismatch';
    message: string;
    details: any;
  }>;
}

// GET /api/auth/sessions/stats - Get session statistics
export interface SessionStatsResponse {
  error: boolean;
  message: string;
  stats: {
    activeCount: number;
    totalCount: number;
    suspiciousCount: number;
    maxConcurrentSessions: number;
    inactivityTimeoutSeconds: number;
    recentSessions: SessionInfo[];
  };
}

// DELETE /api/auth/sessions/:id - Terminate specific session
export interface TerminateSessionResponse {
  error: boolean;
  message: string;
}

// DELETE /api/auth/sessions - Terminate all other sessions
export interface TerminateAllSessionsResponse {
  error: boolean;
  message: string;
  terminatedCount: number;
}

// ─────────────────────────────────────────────────────────────
// Password Management
// ─────────────────────────────────────────────────────────────

// POST /api/auth/change-password - Change password
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  error: boolean;
  message: string;
  messageAr: string;
  data: {
    passwordChangedAt: string;
    passwordExpiresAt: string;
    strengthScore: number;
    strengthLabel: string;
  };
}

// GET /api/auth/password-status - Get password status
export interface PasswordStatusResponse {
  error: boolean;
  data: {
    mustChangePassword: boolean;
    passwordChangedAt: string;
    passwordExpiresAt: string;
    expirationEnabled: boolean;
    daysOld: number;
    daysRemaining: number;
    needsRotation: boolean;
    showWarning: boolean;
  };
}

// POST /api/auth/forgot-password - Request password reset
export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  error: boolean;
  message: string;
  messageEn: string;
  expiresInMinutes: number;
}

// POST /api/auth/reset-password - Reset password with token
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  error: boolean;
  message: string;
  messageEn: string;
}

// ─────────────────────────────────────────────────────────────
// Email Verification
// ─────────────────────────────────────────────────────────────

// POST /api/auth/verify-email - Verify email
export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyEmailResponse {
  error: boolean;
  message: string;
  messageEn: string;
  user: {
    id: string;
    email: string;
    username: string;
    name: string;
    isEmailVerified: boolean;
    emailVerifiedAt: string;
  };
}

// POST /api/auth/resend-verification - Resend verification email
export interface ResendVerificationResponse {
  error: boolean;
  message: string;
  messageEn: string;
  expiresAt: string;
}

// ─────────────────────────────────────────────────────────────
// CSRF Protection
// ─────────────────────────────────────────────────────────────

// GET /api/auth/csrf - Get CSRF token
export interface GetCSRFTokenResponse {
  error: boolean;
  csrfToken: string;
  enabled: boolean;
  expiresAt: string;
  ttl: number;
}

// ─────────────────────────────────────────────────────────────
// Reauthentication / Step-Up Auth
// ─────────────────────────────────────────────────────────────

// POST /api/auth/reauthenticate - Reauthenticate user
export interface ReauthenticateRequest {
  method: 'password' | 'totp';
  password?: string;
  totpCode?: string;
  ttlMinutes?: number;
}

export interface ReauthenticateResponse {
  error: boolean;
  message: string;
}

// POST /api/auth/reauthenticate/challenge - Create reauth challenge
export interface CreateReauthChallengeRequest {
  method: 'email' | 'sms';
  purpose?: 'password_change' | 'mfa_enable' | 'mfa_disable' | 'account_deletion' | 'payment_method' | 'security_settings' | 'sensitive_operation';
}

export interface CreateReauthChallengeResponse {
  error: boolean;
  message: string;
}

// POST /api/auth/reauthenticate/verify - Verify reauth OTP
export interface VerifyReauthChallengeRequest {
  code: string;
  purpose?: string;
}

export interface VerifyReauthChallengeResponse {
  error: boolean;
  message: string;
}

// GET /api/auth/reauthenticate/status - Check reauth status
export interface ReauthStatusResponse {
  error: boolean;
  authenticated: boolean;
  expiresAt?: string;
}

// ═══════════════════════════════════════════════════════════════
// USER MODULE
// ═══════════════════════════════════════════════════════════════

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  image?: string;
  description?: string;
  country: string;
  nationality?: string;
  region?: string;
  city?: string;
  timezone: string;
  role: UserRole;
  isSeller: boolean;
  lawyerMode?: LawyerMode;
  isSoloLawyer: boolean;
  lawyerWorkMode?: LawyerWorkMode;
  firmId?: string;
  firmRole?: FirmRole;
  firmStatus?: FirmStatus;
  isEmailVerified: boolean;
  emailVerifiedAt?: string;
  isAnonymous?: boolean;
  isSSOUser?: boolean;
  ssoProvider?: string;
  lawyerProfile?: LawyerProfile;
  createdAt: string;
  updatedAt: string;
}

export interface LawyerProfile {
  isLicensed: boolean;
  licenseNumber?: string;
  barAssociation?: string;
  verified: boolean;
  yearsExperience: number;
  workType?: string;
  firmName?: string;
  specialization: string[];
  languages: string[];
  courts: Array<{
    courtId: string;
    courtName: string;
    caseCount?: string;
  }>;
  isRegisteredKhebra: boolean;
  serviceType?: string;
  pricingModel: string[];
  hourlyRateMin?: number;
  hourlyRateMax?: number;
  acceptsRemote?: boolean;
  rating?: number;
  totalReviews?: number;
}

// GET /api/users/lawyers - Get all lawyers
export interface GetLawyersRequest {
  search?: string;
  specialization?: string;
  city?: string;
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export interface GetLawyersResponse {
  error: boolean;
  lawyers: Array<UserProfile & {
    priceRange: { min: number; max: number };
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// GET /api/users/team - Get team members
export interface GetTeamMembersResponse {
  success: boolean;
  data: UserProfile[];
}

// GET /api/users/:_id - Get user profile
export interface GetUserProfileResponse {
  success: boolean;
  user: UserProfile;
}

// GET /api/users/lawyer/:username - Get lawyer profile
export interface GetLawyerProfileResponse {
  error: boolean;
  profile: {
    user: UserProfile;
    gigs: any[];
    reviews: any[];
    stats: {
      totalProjects: number;
      activeProjects: number;
      averageRating: number;
      totalReviews: number;
      completionRate: number;
      responseTime: string;
      memberDuration: string;
      memberSince: string;
    };
  };
}

// PATCH /api/users/:_id - Update user profile
export interface UpdateUserProfileRequest {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  image?: string;
  country?: string;
  description?: string;
  lawyerProfile?: Partial<LawyerProfile>;
  language?: string;
  timezone?: string;
  notifications?: any;
}

export interface UpdateUserProfileResponse {
  success: boolean;
  message: string;
  data: UserProfile;
}

// DELETE /api/users/:_id - Delete user account
export interface DeleteUserResponse {
  success: boolean;
  message: string;
}

// ─────────────────────────────────────────────────────────────
// Push Notifications
// ─────────────────────────────────────────────────────────────

// GET /api/users/vapid-public-key - Get VAPID public key
export interface GetVapidKeyResponse {
  success: boolean;
  publicKey: string;
}

// GET /api/users/push-subscription - Get subscription status
export interface PushSubscriptionStatusResponse {
  success: boolean;
  subscribed: boolean;
  subscription?: any;
}

// POST /api/users/push-subscription - Save push subscription
export interface SavePushSubscriptionRequest {
  subscription: any;
}

export interface SavePushSubscriptionResponse {
  success: boolean;
  message: string;
}

// DELETE /api/users/push-subscription - Delete subscription
export interface DeletePushSubscriptionResponse {
  success: boolean;
  message: string;
}

// PUT /api/users/notification-preferences - Update preferences
export interface UpdateNotificationPreferencesRequest {
  preferences: Record<string, any>;
}

export interface UpdateNotificationPreferencesResponse {
  success: boolean;
  message: string;
  data: any;
}

// ─────────────────────────────────────────────────────────────
// Firm Conversion
// ─────────────────────────────────────────────────────────────

// POST /api/users/convert-to-firm - Convert solo to firm
export interface ConvertToFirmRequest {
  firmName: string;
  licenseNumber: string;
  email?: string;
  phone?: string;
  address?: any;
}

export interface ConvertToFirmResponse {
  success: boolean;
  message: string;
  firm: any;
}

// ═══════════════════════════════════════════════════════════════
// CASE MODULE
// ═══════════════════════════════════════════════════════════════

export interface CaseDocument {
  filename: string;
  url: string;
  uploadedBy?: string;
  uploadedAt?: string;
  fileType?: string;
  fileSize?: number;
  fileKey?: string;
}

export interface CaseNote {
  _id?: string;
  text: string;
  date: string;
  createdBy: string;
  createdAt: string;
  isPrivate: boolean;
  stageId?: string;
  attachments?: Array<{
    filename: string;
    url: string;
    size: number;
  }>;
}

export interface CaseHearing {
  _id?: string;
  date: string;
  court: string;
  judge?: string;
  type: string;
  status: 'scheduled' | 'completed' | 'postponed' | 'canceled';
  outcome?: string;
  notes?: string;
  nextHearingDate?: string;
}

export interface CaseTimelineEvent {
  _id?: string;
  event: string;
  date: string;
  type: 'court' | 'filing' | 'deadline' | 'general';
  status: 'upcoming' | 'completed';
}

export interface CaseClaim {
  _id?: string;
  type: string;
  amount: number;
  period?: string;
  description?: string;
}

export interface CaseParty {
  type: 'individual' | 'company' | 'government';
  fullNameArabic?: string;
  nationalId?: string;
  phone?: string;
  email?: string;
  nationalAddress?: any;
  companyName?: string;
  unifiedNumber?: string;
  crNumber?: string;
  authorizedRepresentative?: {
    name: string;
    position: string;
  };
}

export interface CaseInfo {
  _id: string;
  firmId?: string;
  contractId?: string;
  lawyerId: string;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  title: string;
  description?: string;
  category: string;
  subCategory?: string;
  caseNumber?: string;
  internalReference: string;
  entityType: EntityType;
  court?: string;
  committee?: string;
  arbitrationCenter?: string;
  region?: string;
  city?: string;
  circuitNumber?: string;
  judge?: string;
  filingDate?: string;
  nextHearing?: string;
  priority: CasePriority;
  progress: number;
  status: CaseStatus;
  outcome: CaseOutcome;
  claimAmount: number;
  expectedWinAmount: number;
  caseSubject?: string;
  legalBasis?: string;
  powerOfAttorney?: {
    number?: string;
    date?: string;
    expiry?: string;
    scope?: string;
  };
  plaintiff?: CaseParty;
  plaintiffName?: string;
  defendant?: CaseParty;
  defendantName?: string;
  timeline: CaseTimelineEvent[];
  claims: CaseClaim[];
  notes: CaseNote[];
  documents: CaseDocument[];
  hearings: CaseHearing[];
  source: 'platform' | 'external';
  createdAt: string;
  updatedAt: string;
}

// GET /api/cases/overview - Get cases overview (batch endpoint)
export interface GetCasesOverviewResponse {
  success: boolean;
  data: {
    cases: CaseInfo[];
    statistics: CaseStatistics;
    pipelineStats: any;
    clientStats: any;
  };
}

// GET /api/cases/statistics - Get case statistics
export interface CaseStatistics {
  total: number;
  byStatus: Record<CaseStatus, number>;
  byCategory: Record<string, number>;
  byPriority: Record<CasePriority, number>;
  byOutcome: Record<CaseOutcome, number>;
}

export interface GetCaseStatisticsResponse {
  success: boolean;
  data: CaseStatistics;
}

// POST /api/cases - Create case
export interface CreateCaseRequest {
  contractId?: string;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  title: string;
  description?: string;
  category: string;
  subCategory?: string;
  caseNumber?: string;
  court?: string;
  startDate?: string;
  documents?: CaseDocument[];
  entityType?: EntityType;
  committee?: string;
  arbitrationCenter?: string;
  region?: string;
  city?: string;
  circuitNumber?: string;
  judge?: string;
  internalReference?: string;
  filingDate?: string;
  caseSubject?: string;
  legalBasis?: string;
  powerOfAttorney?: any;
  plaintiff?: CaseParty;
  plaintiffType?: string;
  plaintiffName?: string;
  defendant?: CaseParty;
  defendantType?: string;
  defendantName?: string;
  claims?: CaseClaim[];
  claimAmount?: number;
  expectedWinAmount?: number;
  priority?: CasePriority;
  status?: CaseStatus;
  nextHearing?: string;
}

export interface CreateCaseResponse {
  success: boolean;
  message: string;
  data: CaseInfo;
}

// GET /api/cases - Get all cases
export interface GetCasesRequest {
  page?: number;
  limit?: number;
  sort?: string;
  status?: CaseStatus | CaseStatus[];
  caseType?: string;
  clientId?: string;
  search?: string;
  priority?: CasePriority;
}

export interface GetCasesResponse extends PaginatedResponse<CaseInfo> {}

// GET /api/cases/:_id/full - Get case with full details (batch endpoint)
export interface GetCaseFullResponse {
  success: boolean;
  data: {
    case: CaseInfo;
    audit: any[];
    tasks: any[];
    documents: CaseDocument[];
  };
}

// GET /api/cases/:_id - Get single case
export interface GetCaseResponse {
  success: boolean;
  data: CaseInfo;
}

// PATCH /api/cases/:_id - Update case
export interface UpdateCaseRequest {
  title?: string;
  description?: string;
  category?: string;
  status?: CaseStatus;
  priority?: CasePriority;
  outcome?: CaseOutcome;
  progress?: number;
  caseNumber?: string;
  court?: string;
  judge?: string;
  nextHearing?: string;
  claimAmount?: number;
  expectedWinAmount?: number;
  plaintiff?: CaseParty;
  defendant?: CaseParty;
}

export interface UpdateCaseResponse {
  success: boolean;
  message: string;
  data: CaseInfo;
}

// DELETE /api/cases/:_id - Delete case
export interface DeleteCaseResponse {
  success: boolean;
  message: string;
}

// PATCH /api/cases/:_id/progress - Update progress
export interface UpdateCaseProgressRequest {
  progress: number;
}

export interface UpdateCaseProgressResponse {
  success: boolean;
  data: CaseInfo;
}

// ─────────────────────────────────────────────────────────────
// Case Notes
// ─────────────────────────────────────────────────────────────

// GET /api/cases/:_id/notes - Get notes
export interface GetCaseNotesRequest {
  limit?: number;
  offset?: number;
  sort?: string;
}

export interface GetCaseNotesResponse {
  success: boolean;
  data: CaseNote[];
  total: number;
}

// POST /api/cases/:_id/notes - Add note
export interface AddCaseNoteRequest {
  text: string;
  isPrivate?: boolean;
  stageId?: string;
}

export interface AddCaseNoteResponse {
  success: boolean;
  data: CaseInfo;
}

// PUT /api/cases/:_id/notes/:noteId - Update note
export interface UpdateCaseNoteRequest {
  text?: string;
  isPrivate?: boolean;
}

export interface UpdateCaseNoteResponse {
  success: boolean;
  data: CaseInfo;
}

// DELETE /api/cases/:_id/notes/:noteId - Delete note
export interface DeleteCaseNoteResponse {
  success: boolean;
  message: string;
}

// ─────────────────────────────────────────────────────────────
// Case Documents
// ─────────────────────────────────────────────────────────────

// POST /api/cases/:_id/documents/upload-url - Get upload URL
export interface GetDocumentUploadUrlRequest {
  filename: string;
  fileType: string;
  fileSize: number;
}

export interface GetDocumentUploadUrlResponse {
  success: boolean;
  uploadUrl: string;
  fileKey: string;
  expiresIn: number;
}

// POST /api/cases/:_id/documents/confirm - Confirm upload
export interface ConfirmDocumentUploadRequest {
  fileKey: string;
  filename: string;
  fileType: string;
  fileSize: number;
  category?: string;
}

export interface ConfirmDocumentUploadResponse {
  success: boolean;
  message: string;
  document: CaseDocument;
}

// GET /api/cases/:_id/documents/:docId/download - Get download URL
export interface GetDocumentDownloadUrlResponse {
  success: boolean;
  downloadUrl: string;
  expiresIn: number;
}

// DELETE /api/cases/:_id/documents/:docId - Delete document
export interface DeleteDocumentResponse {
  success: boolean;
  message: string;
}

// ─────────────────────────────────────────────────────────────
// Case Hearings
// ─────────────────────────────────────────────────────────────

// POST /api/cases/:_id/hearing - Add hearing
export interface AddHearingRequest {
  date: string;
  court: string;
  judge?: string;
  type: string;
  status?: string;
  notes?: string;
}

export interface AddHearingResponse {
  success: boolean;
  data: CaseInfo;
}

// PATCH /api/cases/:_id/hearings/:hearingId - Update hearing
export interface UpdateHearingRequest {
  date?: string;
  court?: string;
  judge?: string;
  type?: string;
  status?: string;
  outcome?: string;
  notes?: string;
  nextHearingDate?: string;
}

export interface UpdateHearingResponse {
  success: boolean;
  data: CaseInfo;
}

// DELETE /api/cases/:_id/hearings/:hearingId - Delete hearing
export interface DeleteHearingResponse {
  success: boolean;
  message: string;
}

// ─────────────────────────────────────────────────────────────
// Case Timeline
// ─────────────────────────────────────────────────────────────

// POST /api/cases/:_id/timeline - Add timeline event
export interface AddTimelineEventRequest {
  event: string;
  date: string;
  type: 'court' | 'filing' | 'deadline' | 'general';
  status?: 'upcoming' | 'completed';
}

export interface AddTimelineEventResponse {
  success: boolean;
  data: CaseInfo;
}

// PATCH /api/cases/:_id/timeline/:eventId - Update timeline event
export interface UpdateTimelineEventRequest {
  event?: string;
  date?: string;
  type?: string;
  status?: string;
}

export interface UpdateTimelineEventResponse {
  success: boolean;
  data: CaseInfo;
}

// DELETE /api/cases/:_id/timeline/:eventId - Delete timeline event
export interface DeleteTimelineEventResponse {
  success: boolean;
  message: string;
}

// ─────────────────────────────────────────────────────────────
// Case Claims
// ─────────────────────────────────────────────────────────────

// POST /api/cases/:_id/claim - Add claim
export interface AddClaimRequest {
  type: string;
  amount: number;
  period?: string;
  description?: string;
}

export interface AddClaimResponse {
  success: boolean;
  data: CaseInfo;
}

// PATCH /api/cases/:_id/claims/:claimId - Update claim
export interface UpdateClaimRequest {
  type?: string;
  amount?: number;
  period?: string;
  description?: string;
}

export interface UpdateClaimResponse {
  success: boolean;
  data: CaseInfo;
}

// DELETE /api/cases/:_id/claims/:claimId - Delete claim
export interface DeleteClaimResponse {
  success: boolean;
  message: string;
}

// ─────────────────────────────────────────────────────────────
// Case Status & Outcome
// ─────────────────────────────────────────────────────────────

// PATCH /api/cases/:_id/status - Update status
export interface UpdateCaseStatusRequest {
  status: CaseStatus;
}

export interface UpdateCaseStatusResponse {
  success: boolean;
  data: CaseInfo;
}

// PATCH /api/cases/:_id/outcome - Update outcome
export interface UpdateCaseOutcomeRequest {
  outcome: CaseOutcome;
  outcomeNotes?: string;
  outcomeDate?: string;
}

export interface UpdateCaseOutcomeResponse {
  success: boolean;
  data: CaseInfo;
}

// PUT /api/cases/:_id/close - Close case
export interface CloseCaseResponse {
  success: boolean;
  data: CaseInfo;
}

// ─────────────────────────────────────────────────────────────
// Case Audit
// ─────────────────────────────────────────────────────────────

// GET /api/cases/:_id/audit - Get audit history
export interface GetCaseAuditResponse {
  success: boolean;
  data: any[];
}

// ─────────────────────────────────────────────────────────────
// Rich Documents (CKEditor)
// ─────────────────────────────────────────────────────────────

export interface RichDocument {
  _id: string;
  title: string;
  content: string;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// POST /api/cases/:_id/rich-documents - Create rich document
export interface CreateRichDocumentRequest {
  title: string;
  content: string;
  documentType?: string;
}

export interface CreateRichDocumentResponse {
  success: boolean;
  data: RichDocument;
}

// GET /api/cases/:_id/rich-documents - Get all rich documents
export interface GetRichDocumentsResponse {
  success: boolean;
  data: RichDocument[];
}

// GET /api/cases/:_id/rich-documents/:docId - Get single rich document
export interface GetRichDocumentResponse {
  success: boolean;
  data: RichDocument;
}

// PATCH /api/cases/:_id/rich-documents/:docId - Update rich document
export interface UpdateRichDocumentRequest {
  title?: string;
  content?: string;
}

export interface UpdateRichDocumentResponse {
  success: boolean;
  data: RichDocument;
}

// DELETE /api/cases/:_id/rich-documents/:docId - Delete rich document
export interface DeleteRichDocumentResponse {
  success: boolean;
  message: string;
}

// GET /api/cases/:_id/rich-documents/:docId/versions - Get versions
export interface GetRichDocumentVersionsResponse {
  success: boolean;
  data: any[];
}

// POST /api/cases/:_id/rich-documents/:docId/versions/:versionNumber/restore - Restore version
export interface RestoreRichDocumentVersionResponse {
  success: boolean;
  data: RichDocument;
}

// ─────────────────────────────────────────────────────────────
// Rich Document Export
// ─────────────────────────────────────────────────────────────

// GET /api/cases/:_id/rich-documents/:docId/export/pdf - Export to PDF
// Returns PDF file

// GET /api/cases/:_id/rich-documents/:docId/export/latex - Export to LaTeX
// Returns LaTeX file

// GET /api/cases/:_id/rich-documents/:docId/export/markdown - Export to Markdown
// Returns Markdown file

// GET /api/cases/:_id/rich-documents/:docId/preview - Get HTML preview
export interface GetRichDocumentPreviewResponse {
  success: boolean;
  html: string;
}

// ─────────────────────────────────────────────────────────────
// Case Pipeline
// ─────────────────────────────────────────────────────────────

// GET /api/cases/pipeline - Get cases for pipeline view
export interface GetCasesForPipelineRequest {
  category?: string;
  outcome?: string;
  priority?: string;
}

export interface GetCasesForPipelineResponse {
  success: boolean;
  data: any[];
}

// GET /api/cases/pipeline/statistics - Get pipeline statistics
export interface GetPipelineStatisticsResponse {
  success: boolean;
  data: any;
}

// GET /api/cases/pipeline/stages/:category - Get valid stages
export interface GetValidStagesResponse {
  success: boolean;
  stages: string[];
}

// GET /api/cases/pipeline/grouped - Get cases grouped by stage
export interface GetCasesByStageResponse {
  success: boolean;
  data: Record<string, any[]>;
}

// PATCH /api/cases/:_id/stage - Move case to stage
export interface MoveCaseToStageRequest {
  newStage: string;
  notes?: string;
}

export interface MoveCaseToStageResponse {
  success: boolean;
  data: CaseInfo;
}

// PATCH /api/cases/:_id/end - End case
export interface EndCaseRequest {
  outcome: 'won' | 'lost' | 'settled';
  endReason: 'final_judgment' | 'settlement' | 'withdrawal' | 'dismissal' | 'reconciliation' | 'execution_complete' | 'other';
  finalAmount?: number;
  notes?: string;
  endDate?: string;
}

export interface EndCaseResponse {
  success: boolean;
  data: CaseInfo;
}

// ═══════════════════════════════════════════════════════════════
// TASK MODULE
// ═══════════════════════════════════════════════════════════════

export interface TaskSubtask {
  _id?: string;
  title: string;
  completed: boolean;
  completedAt?: string;
  autoReset?: boolean;
  order?: number;
}

export interface TaskChecklist {
  _id?: string;
  title: string;
  items: Array<{
    text: string;
    completed: boolean;
    completedAt?: string;
  }>;
}

export interface TaskTimeSession {
  _id?: string;
  startedAt: string;
  endedAt?: string;
  duration?: number;
  userId: string;
  notes?: string;
  isBillable: boolean;
}

export interface TaskReminder {
  _id?: string;
  type: 'due_date' | 'start_date' | 'custom';
  beforeMinutes: number;
  sent: boolean;
  sentAt?: string;
}

export interface TaskComment {
  _id?: string;
  userId: string;
  content: string;
  mentions?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface TaskAttachment {
  _id?: string;
  fileName: string;
  fileUrl: string;
  fileKey?: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
  storageType: 'local' | 's3';
  isEditable?: boolean;
  isVoiceMemo?: boolean;
  duration?: number;
  transcription?: string;
}

export interface TaskDependency {
  _id?: string;
  taskId: string;
  type: 'blocks' | 'blocked_by' | 'related';
}

export interface TaskInfo {
  _id: string;
  firmId?: string;
  lawyerId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  label?: TaskLabel;
  tags: string[];
  dueDate?: string;
  dueTime?: string;
  startDate?: string;
  assignedTo: string;
  createdBy: string;
  caseId?: string;
  clientId?: string;
  linkedEventId?: string;
  parentTaskId?: string;
  subtasks: TaskSubtask[];
  checklists: TaskChecklist[];
  timeTracking: {
    estimatedMinutes: number;
    actualMinutes: number;
    sessions: TaskTimeSession[];
    isTracking: boolean;
    currentSessionStart?: string;
  };
  recurring?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
    type: 'due_date' | 'completion_date';
    interval?: number;
    endDate?: string;
    maxOccurrences?: number;
    nextDue?: string;
  };
  reminders: TaskReminder[];
  attachments: TaskAttachment[];
  comments: TaskComment[];
  history: any[];
  points: number;
  progress: number;
  manualProgress: boolean;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
  isTemplate: boolean;
  templateId?: string;
  isPublic: boolean;
  templateName?: string;
  dependencies: TaskDependency[];
  outcome?: 'successful' | 'unsuccessful' | 'appealed' | 'settled' | 'dismissed';
  outcomeNotes?: string;
  outcomeDate?: string;
  budget?: {
    estimatedHours: number;
    hourlyRate: number;
    estimatedCost: number;
    actualCost: number;
  };
  archived?: boolean;
  archivedAt?: string;
  sortOrder?: number;
  locationTrigger?: {
    enabled: boolean;
    latitude: number;
    longitude: number;
    radius: number;
    address?: string;
    triggerType: 'arrival' | 'departure';
    triggered?: boolean;
    triggeredAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// GET /api/tasks/overview - Get tasks overview (batch endpoint)
export interface GetTasksOverviewResponse {
  success: boolean;
  data: {
    tasks: TaskInfo[];
    stats: TaskStats;
    upcoming: TaskInfo[];
    overdue: TaskInfo[];
  };
}

// GET /api/tasks/stats - Get task statistics
export interface TaskStats {
  total: number;
  byStatus: Record<TaskStatus, number>;
  byPriority: Record<TaskPriority, number>;
  completed: number;
  overdue: number;
  dueToday: number;
}

export interface GetTaskStatsResponse {
  success: boolean;
  data: TaskStats;
}

// GET /api/tasks/upcoming - Get upcoming tasks
export interface GetUpcomingTasksResponse {
  success: boolean;
  data: TaskInfo[];
}

// GET /api/tasks/overdue - Get overdue tasks
export interface GetOverdueTasksResponse {
  success: boolean;
  data: TaskInfo[];
}

// GET /api/tasks/due-today - Get tasks due today
export interface GetTasksDueTodayResponse {
  success: boolean;
  data: TaskInfo[];
}

// GET /api/tasks/case/:caseId - Get tasks by case
export interface GetTasksByCaseResponse {
  success: boolean;
  data: TaskInfo[];
}

// GET /api/tasks/client/:clientId - Get tasks by client
export interface GetTasksByClientResponse {
  success: boolean;
  data: TaskInfo[];
}

// GET /api/tasks/timers/active - Get active timers
export interface GetActiveTimersResponse {
  success: boolean;
  data: TaskInfo[];
}

// GET /api/tasks/search - Search tasks
export interface SearchTasksRequest {
  q: string;
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assignedTo?: string;
  caseId?: string;
  limit?: number;
}

export interface SearchTasksResponse {
  success: boolean;
  data: TaskInfo[];
}

// GET /api/tasks/conflicts - Get task conflicts
export interface GetTaskConflictsResponse {
  success: boolean;
  conflicts: Array<{
    task: TaskInfo;
    conflictsWith: TaskInfo[];
    reason: string;
  }>;
}

// POST /api/tasks - Create task
export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  label?: TaskLabel;
  tags?: string[];
  dueDate?: string;
  dueTime?: string;
  startDate?: string;
  assignedTo?: string;
  caseId?: string;
  clientId?: string;
  parentTaskId?: string;
  subtasks?: TaskSubtask[];
  checklists?: TaskChecklist[];
  timeTracking?: {
    estimatedMinutes?: number;
  };
  recurring?: any;
  reminders?: TaskReminder[];
  notes?: string;
  points?: number;
}

export interface CreateTaskResponse {
  success: boolean;
  message: string;
  data: TaskInfo;
}

// GET /api/tasks - Get all tasks
export interface GetTasksRequest {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  label?: TaskLabel | TaskLabel[];
  assignedTo?: string;
  caseId?: string;
  clientId?: string;
  overdue?: boolean;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GetTasksResponse extends PaginatedResponse<TaskInfo> {}

// GET /api/tasks/:id/full - Get task with full details (batch endpoint)
export interface GetTaskFullResponse {
  success: boolean;
  data: {
    task: TaskInfo;
    relatedTasks: TaskInfo[];
    activity: any[];
  };
}

// GET /api/tasks/:id - Get single task
export interface GetTaskResponse {
  success: boolean;
  data: TaskInfo;
}

// PUT /api/tasks/:id - Update task
// PATCH /api/tasks/:id - Update task
export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  label?: TaskLabel;
  tags?: string[];
  dueDate?: string;
  dueTime?: string;
  startDate?: string;
  assignedTo?: string;
  caseId?: string;
  clientId?: string;
  subtasks?: TaskSubtask[];
  checklists?: TaskChecklist[];
  timeTracking?: any;
  recurring?: any;
  reminders?: TaskReminder[];
  notes?: string;
  points?: number;
  progress?: number;
}

export interface UpdateTaskResponse {
  success: boolean;
  message: string;
  data: TaskInfo;
}

// DELETE /api/tasks/:id - Delete task
export interface DeleteTaskResponse {
  success: boolean;
  message: string;
}

// POST /api/tasks/:id/complete - Complete task
export interface CompleteTaskRequest {
  completionNote?: string;
}

export interface CompleteTaskResponse {
  success: boolean;
  data: TaskInfo;
}

// POST /api/tasks/:id/clone - Clone task
export interface CloneTaskRequest {
  title?: string;
  resetDueDate?: boolean;
  includeSubtasks?: boolean;
  includeChecklists?: boolean;
  includeAttachments?: boolean;
}

export interface CloneTaskResponse {
  success: boolean;
  data: TaskInfo;
}

// POST /api/tasks/:id/reschedule - Reschedule task
export interface RescheduleTaskRequest {
  newDueDate: string;
  newDueTime?: string;
  reason?: string;
}

export interface RescheduleTaskResponse {
  success: boolean;
  data: TaskInfo;
}

// GET /api/tasks/:id/activity - Get task activity
export interface GetTaskActivityResponse {
  success: boolean;
  data: any[];
}

// POST /api/tasks/:id/convert-to-event - Convert task to event
export interface ConvertTaskToEventRequest {
  eventType: string;
  duration?: number;
  attendees?: string[];
  location?: string;
}

export interface ConvertTaskToEventResponse {
  success: boolean;
  event: any;
}

// POST /api/tasks/:id/archive - Archive task
export interface ArchiveTaskResponse {
  success: boolean;
  message: string;
}

// POST /api/tasks/:id/unarchive - Unarchive task
export interface UnarchiveTaskResponse {
  success: boolean;
  message: string;
}

// GET /api/tasks/archived - Get archived tasks
export interface GetArchivedTasksResponse {
  success: boolean;
  data: TaskInfo[];
}

// ─────────────────────────────────────────────────────────────
// Task Subtasks
// ─────────────────────────────────────────────────────────────

// POST /api/tasks/:id/subtasks - Add subtask
export interface AddSubtaskRequest {
  title: string;
  autoReset?: boolean;
}

export interface AddSubtaskResponse {
  success: boolean;
  data: TaskInfo;
}

// PATCH /api/tasks/:id/subtasks/:subtaskId - Update subtask
export interface UpdateSubtaskRequest {
  title?: string;
  completed?: boolean;
}

export interface UpdateSubtaskResponse {
  success: boolean;
  data: TaskInfo;
}

// PATCH /api/tasks/:id/subtasks/:subtaskId/toggle - Toggle subtask
export interface ToggleSubtaskResponse {
  success: boolean;
  data: TaskInfo;
}

// DELETE /api/tasks/:id/subtasks/:subtaskId - Delete subtask
export interface DeleteSubtaskResponse {
  success: boolean;
  message: string;
}

// ─────────────────────────────────────────────────────────────
// Task Time Tracking
// ─────────────────────────────────────────────────────────────

// POST /api/tasks/:id/timer/start - Start timer
export interface StartTimerRequest {
  notes?: string;
}

export interface StartTimerResponse {
  success: boolean;
  data: TaskInfo;
}

// POST /api/tasks/:id/timer/stop - Stop timer
export interface StopTimerRequest {
  notes?: string;
  isBillable?: boolean;
}

export interface StopTimerResponse {
  success: boolean;
  data: TaskInfo;
  session: TaskTimeSession;
}

// PATCH /api/tasks/:id/timer/pause - Pause timer
export interface PauseTimerRequest {
  reason?: string;
}

export interface PauseTimerResponse {
  success: boolean;
  data: TaskInfo;
}

// PATCH /api/tasks/:id/timer/resume - Resume timer
export interface ResumeTimerRequest {
  notes?: string;
}

export interface ResumeTimerResponse {
  success: boolean;
  data: TaskInfo;
}

// POST /api/tasks/:id/time - Add manual time entry
export interface AddManualTimeRequest {
  minutes: number;
  notes?: string;
  date?: string;
  isBillable?: boolean;
}

export interface AddManualTimeResponse {
  success: boolean;
  data: TaskInfo;
}

// GET /api/tasks/:id/time-tracking/summary - Get time tracking summary
export interface GetTimeTrackingSummaryResponse {
  success: boolean;
  data: {
    estimatedMinutes: number;
    actualMinutes: number;
    billableMinutes: number;
    variance: number;
    sessions: TaskTimeSession[];
  };
}

// ─────────────────────────────────────────────────────────────
// Task Comments
// ─────────────────────────────────────────────────────────────

// POST /api/tasks/:id/comments - Add comment
export interface AddCommentRequest {
  content?: string;
  text?: string;
  mentions?: string[];
}

export interface AddCommentResponse {
  success: boolean;
  data: TaskInfo;
}

// PUT /api/tasks/:id/comments/:commentId - Update comment
export interface UpdateCommentRequest {
  content?: string;
  text?: string;
}

export interface UpdateCommentResponse {
  success: boolean;
  data: TaskInfo;
}

// DELETE /api/tasks/:id/comments/:commentId - Delete comment
export interface DeleteCommentResponse {
  success: boolean;
  message: string;
}

// ─────────────────────────────────────────────────────────────
// Task Attachments
// ─────────────────────────────────────────────────────────────

// POST /api/tasks/:id/attachments - Add attachment
// Multipart form data with 'file' field

export interface AddAttachmentResponse {
  success: boolean;
  attachment: TaskAttachment;
}

// GET /api/tasks/:id/attachments/:attachmentId/download-url - Get download URL
export interface GetAttachmentDownloadUrlResponse {
  success: boolean;
  downloadUrl: string;
  expiresIn: number;
}

// GET /api/tasks/:id/attachments/:attachmentId/versions - Get attachment versions
export interface GetAttachmentVersionsResponse {
  success: boolean;
  versions: any[];
}

// DELETE /api/tasks/:id/attachments/:attachmentId - Delete attachment
export interface DeleteAttachmentResponse {
  success: boolean;
  message: string;
}

// ─────────────────────────────────────────────────────────────
// Task Documents (In-app text editor)
// ─────────────────────────────────────────────────────────────

export interface TaskDocument {
  _id: string;
  title: string;
  content: string;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// POST /api/tasks/:id/documents - Create document
export interface CreateTaskDocumentRequest {
  title: string;
  content: string;
}

export interface CreateTaskDocumentResponse {
  success: boolean;
  data: TaskDocument;
}

// GET /api/tasks/:id/documents - Get all documents
export interface GetTaskDocumentsResponse {
  success: boolean;
  data: TaskDocument[];
}

// GET /api/tasks/:id/documents/:documentId - Get single document
export interface GetTaskDocumentResponse {
  success: boolean;
  data: TaskDocument;
}

// PATCH /api/tasks/:id/documents/:documentId - Update document
export interface UpdateTaskDocumentRequest {
  title?: string;
  content?: string;
}

export interface UpdateTaskDocumentResponse {
  success: boolean;
  data: TaskDocument;
}

// GET /api/tasks/:id/documents/:documentId/versions - Get versions
export interface GetTaskDocumentVersionsResponse {
  success: boolean;
  data: any[];
}

// GET /api/tasks/:id/documents/:documentId/versions/:versionId - Get specific version
export interface GetTaskDocumentVersionResponse {
  success: boolean;
  data: any;
}

// POST /api/tasks/:id/documents/:documentId/versions/:versionId/restore - Restore version
export interface RestoreTaskDocumentVersionResponse {
  success: boolean;
  data: TaskDocument;
}

// ─────────────────────────────────────────────────────────────
// Task Voice Memos
// ─────────────────────────────────────────────────────────────

// POST /api/tasks/:id/voice-memos - Add voice memo
// Multipart form data with 'file' field

export interface AddVoiceMemoResponse {
  success: boolean;
  attachment: TaskAttachment;
}

// PATCH /api/tasks/:id/voice-memos/:memoId/transcription - Update transcription
export interface UpdateVoiceMemoTranscriptionRequest {
  transcription: string;
}

export interface UpdateVoiceMemoTranscriptionResponse {
  success: boolean;
  data: TaskInfo;
}

// ─────────────────────────────────────────────────────────────
// Task Dependencies
// ─────────────────────────────────────────────────────────────

// POST /api/tasks/:id/dependencies - Add dependency
export interface AddDependencyRequest {
  dependsOn: string;
  type: 'blocks' | 'blocked_by' | 'related';
}

export interface AddDependencyResponse {
  success: boolean;
  data: TaskInfo;
}

// DELETE /api/tasks/:id/dependencies/:dependencyTaskId - Remove dependency
export interface RemoveDependencyResponse {
  success: boolean;
  message: string;
}

// PATCH /api/tasks/:id/status - Update task status
export interface UpdateTaskStatusRequest {
  status: TaskStatus;
}

export interface UpdateTaskStatusResponse {
  success: boolean;
  data: TaskInfo;
}

// ─────────────────────────────────────────────────────────────
// Task Progress
// ─────────────────────────────────────────────────────────────

// PATCH /api/tasks/:id/progress - Update progress
export interface UpdateTaskProgressRequest {
  progress: number;
  autoCalculate?: boolean;
}

export interface UpdateTaskProgressResponse {
  success: boolean;
  data: TaskInfo;
}

// ─────────────────────────────────────────────────────────────
// Task Workflow
// ─────────────────────────────────────────────────────────────

// POST /api/tasks/:id/workflow-rules - Add workflow rule
export interface AddWorkflowRuleRequest {
  name: string;
  trigger: any;
  conditions?: any[];
  actions: any[];
  isActive?: boolean;
}

export interface AddWorkflowRuleResponse {
  success: boolean;
  data: TaskInfo;
}

// PATCH /api/tasks/:id/outcome - Update outcome
export interface UpdateTaskOutcomeRequest {
  outcome: 'successful' | 'unsuccessful' | 'appealed' | 'settled' | 'dismissed';
  outcomeNotes?: string;
  outcomeDate?: string;
}

export interface UpdateTaskOutcomeResponse {
  success: boolean;
  data: TaskInfo;
}

// ─────────────────────────────────────────────────────────────
// Task Budget
// ─────────────────────────────────────────────────────────────

// PATCH /api/tasks/:id/estimate - Update estimate
export interface UpdateTaskEstimateRequest {
  estimatedHours?: number;
  hourlyRate?: number;
  estimatedCost?: number;
}

export interface UpdateTaskEstimateResponse {
  success: boolean;
  data: TaskInfo;
}

// ─────────────────────────────────────────────────────────────
// Task Templates
// ─────────────────────────────────────────────────────────────

// GET /api/tasks/templates - Get all templates
export interface GetTaskTemplatesResponse {
  success: boolean;
  data: TaskInfo[];
}

// POST /api/tasks/templates - Create template
export interface CreateTaskTemplateRequest {
  title: string;
  templateName: string;
  description?: string;
  priority?: TaskPriority;
  label?: TaskLabel;
  tags?: string[];
  subtasks?: TaskSubtask[];
  checklists?: TaskChecklist[];
  timeTracking?: any;
  reminders?: TaskReminder[];
  notes?: string;
  isPublic?: boolean;
}

export interface CreateTaskTemplateResponse {
  success: boolean;
  data: TaskInfo;
}

// GET /api/tasks/templates/:templateId - Get template
export interface GetTaskTemplateResponse {
  success: boolean;
  data: TaskInfo;
}

// PUT /api/tasks/templates/:templateId - Update template
// PATCH /api/tasks/templates/:templateId - Update template
export interface UpdateTaskTemplateRequest {
  title?: string;
  templateName?: string;
  description?: string;
  priority?: TaskPriority;
  label?: TaskLabel;
  tags?: string[];
  subtasks?: TaskSubtask[];
  checklists?: TaskChecklist[];
  timeTracking?: any;
  reminders?: TaskReminder[];
  notes?: string;
  isPublic?: boolean;
}

export interface UpdateTaskTemplateResponse {
  success: boolean;
  data: TaskInfo;
}

// DELETE /api/tasks/templates/:templateId - Delete template
export interface DeleteTaskTemplateResponse {
  success: boolean;
  message: string;
}

// POST /api/tasks/templates/:templateId/create - Create task from template
export interface CreateTaskFromTemplateRequest {
  title?: string;
  dueDate?: string;
  dueTime?: string;
  assignedTo?: string;
  caseId?: string;
  clientId?: string;
  notes?: string;
}

export interface CreateTaskFromTemplateResponse {
  success: boolean;
  data: TaskInfo;
}

// POST /api/tasks/:id/save-as-template - Save task as template
export interface SaveTaskAsTemplateRequest {
  templateName: string;
  isPublic?: boolean;
}

export interface SaveTaskAsTemplateResponse {
  success: boolean;
  data: TaskInfo;
}

// ─────────────────────────────────────────────────────────────
// Task Bulk Operations
// ─────────────────────────────────────────────────────────────

// POST /api/tasks/bulk - Bulk create tasks
export interface BulkCreateTasksRequest {
  tasks: CreateTaskRequest[];
}

export interface BulkCreateTasksResponse {
  success: boolean;
  created: TaskInfo[];
  failed: Array<{ index: number; error: string }>;
}

// PUT /api/tasks/bulk - Bulk update tasks
export interface BulkUpdateTasksRequest {
  taskIds: string[];
  updates: UpdateTaskRequest;
}

export interface BulkUpdateTasksResponse {
  success: boolean;
  updated: number;
  failed: Array<{ taskId: string; error: string }>;
}

// DELETE /api/tasks/bulk - Bulk delete tasks
export interface BulkDeleteTasksRequest {
  taskIds: string[];
}

export interface BulkDeleteTasksResponse {
  success: boolean;
  deleted: number;
  failed: Array<{ taskId: string; error: string }>;
}

// POST /api/tasks/bulk/complete - Bulk complete tasks
export interface BulkCompleteTasksRequest {
  taskIds: string[];
  completionNote?: string;
}

export interface BulkCompleteTasksResponse {
  success: boolean;
  completed: number;
  failed: Array<{ taskId: string; error: string }>;
}

// POST /api/tasks/bulk/assign - Bulk assign tasks
export interface BulkAssignTasksRequest {
  taskIds: string[];
  assignedTo: string;
}

export interface BulkAssignTasksResponse {
  success: boolean;
  assigned: number;
  failed: Array<{ taskId: string; error: string }>;
}

// POST /api/tasks/bulk/archive - Bulk archive tasks
export interface BulkArchiveTasksRequest {
  taskIds: string[];
}

export interface BulkArchiveTasksResponse {
  success: boolean;
  archived: number;
  failed: Array<{ taskId: string; error: string }>;
}

// POST /api/tasks/bulk/unarchive - Bulk unarchive tasks
export interface BulkUnarchiveTasksRequest {
  taskIds: string[];
}

export interface BulkUnarchiveTasksResponse {
  success: boolean;
  unarchived: number;
  failed: Array<{ taskId: string; error: string }>;
}

// ─────────────────────────────────────────────────────────────
// Task Export & Select All
// ─────────────────────────────────────────────────────────────

// GET /api/tasks/export - Export tasks
export interface ExportTasksRequest {
  format?: 'csv' | 'json' | 'excel';
  filters?: GetTasksRequest;
}

// Returns file download

// GET /api/tasks/ids - Get all task IDs (for select all)
export interface GetAllTaskIdsRequest {
  filters?: GetTasksRequest;
}

export interface GetAllTaskIdsResponse {
  success: boolean;
  taskIds: string[];
  total: number;
}

// ─────────────────────────────────────────────────────────────
// Task Reordering
// ─────────────────────────────────────────────────────────────

// PATCH /api/tasks/reorder - Reorder tasks
export interface ReorderTasksRequest {
  taskId?: string;
  newSortOrder?: number;
  reorderItems?: Array<{ taskId: string; sortOrder: number }>;
}

export interface ReorderTasksResponse {
  success: boolean;
  message: string;
}

// ─────────────────────────────────────────────────────────────
// Task Location Triggers
// ─────────────────────────────────────────────────────────────

// PUT /api/tasks/:id/location-trigger - Update location trigger
export interface UpdateLocationTriggerRequest {
  enabled: boolean;
  latitude?: number;
  longitude?: number;
  radius?: number;
  address?: string;
  triggerType?: 'arrival' | 'departure';
}

export interface UpdateLocationTriggerResponse {
  success: boolean;
  data: TaskInfo;
}

// POST /api/tasks/:id/location/check - Check location trigger
export interface CheckLocationTriggerRequest {
  latitude: number;
  longitude: number;
}

export interface CheckLocationTriggerResponse {
  success: boolean;
  triggered: boolean;
  distance?: number;
}

// GET /api/tasks/location-triggers - Get tasks with location triggers
export interface GetTasksWithLocationTriggersResponse {
  success: boolean;
  data: TaskInfo[];
}

// POST /api/tasks/location/check - Bulk check location triggers
export interface BulkCheckLocationTriggersRequest {
  latitude: number;
  longitude: number;
}

export interface BulkCheckLocationTriggersResponse {
  success: boolean;
  triggeredTasks: TaskInfo[];
}

// ─────────────────────────────────────────────────────────────
// Task Voice & NLP
// ─────────────────────────────────────────────────────────────

// POST /api/tasks/parse - Create task from natural language
export interface CreateTaskFromNLRequest {
  text: string;
}

export interface CreateTaskFromNLResponse {
  success: boolean;
  data: TaskInfo;
  parsed: {
    title: string;
    dueDate?: string;
    priority?: TaskPriority;
    assignedTo?: string;
  };
}

// POST /api/tasks/voice - Create task from voice
// Multipart form data with 'audio' field

export interface CreateTaskFromVoiceResponse {
  success: boolean;
  data: TaskInfo;
  transcription: string;
}

// GET /api/tasks/smart-schedule - Get smart schedule suggestions
export interface GetSmartScheduleSuggestionsResponse {
  success: boolean;
  suggestions: Array<{
    taskId: string;
    suggestedDate: string;
    suggestedTime: string;
    reason: string;
  }>;
}

// POST /api/tasks/auto-schedule - Auto schedule tasks
export interface AutoScheduleTasksRequest {
  taskIds: string[];
  constraints?: {
    workingHours?: { start: string; end: string };
    workingDays?: number[];
  };
}

export interface AutoScheduleTasksResponse {
  success: boolean;
  scheduled: Array<{
    taskId: string;
    dueDate: string;
    dueTime: string;
  }>;
}

// POST /api/tasks/voice-to-item - Process voice to task
// Multipart form data with 'audio' field

export interface ProcessVoiceToItemResponse {
  success: boolean;
  task: TaskInfo;
  transcription: string;
}

// POST /api/tasks/voice-to-item/batch - Batch process voice memos
export interface BatchProcessVoiceMemosRequest {
  audioFiles: any[];
}

export interface BatchProcessVoiceMemosResponse {
  success: boolean;
  processed: TaskInfo[];
  failed: Array<{ index: number; error: string }>;
}

// ═══════════════════════════════════════════════════════════════
// CLIENT MODULE
// ═══════════════════════════════════════════════════════════════

export interface ClientInfo {
  _id: string;
  firmId?: string;
  clientNumber: string;
  clientType: ClientType;

  // Individual fields
  nationalId?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  fullNameArabic?: string;
  fullNameEnglish?: string;
  gender?: 'male' | 'female';
  nationality?: string;
  dateOfBirth?: string;
  identityType?: string;
  iqamaNumber?: string;

  // Company fields
  crNumber?: string;
  companyName?: string;
  companyNameEnglish?: string;
  unifiedNumber?: string;
  crStatus?: string;
  capital?: number;
  industry?: string;
  numberOfEmployees?: string;

  // Contact info
  phone: string;
  alternatePhone?: string;
  email?: string;
  secondaryEmail?: string;
  whatsapp?: string;
  preferredContact: 'phone' | 'email' | 'whatsapp' | 'sms';
  preferredLanguage: 'ar' | 'en';

  // Address
  address?: {
    city?: string;
    district?: string;
    street?: string;
    buildingNumber?: string;
    postalCode?: string;
    fullAddress?: string;
  };
  nationalAddress?: any;

  // Assignment
  lawyerId: string;
  assignments?: {
    responsibleLawyerId?: string;
    assistantLawyerId?: string;
    paralegalId?: string;
  };

  // Status & Source
  status: ClientStatus;
  clientSource: ClientSource;
  clientTier?: 'bronze' | 'silver' | 'gold' | 'platinum';

  // Verification
  isVerified: boolean;
  verificationSource?: string;
  verifiedAt?: string;
  verificationData?: any;
  wathqVerified?: boolean;

  // Conflict check
  conflictCheckStatus: 'not_checked' | 'clear' | 'potential' | 'blocked';
  conflictCheckDate?: string;
  conflictNotes?: string;

  // Power of Attorney
  powerOfAttorney?: {
    hasPOA: boolean;
    attorneyName?: string;
    poaNumber?: string;
    issueDate?: string;
    expiryDate?: string;
  };

  // Financial
  billing?: {
    paymentTerms?: string;
    creditLimit?: number;
    iban?: string;
  };

  // Metadata
  notes?: string;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// POST /api/clients - Create client
export interface CreateClientRequest {
  firstName?: string;
  lastName?: string;
  fullNameArabic?: string;
  fullNameEnglish?: string;
  companyName?: string;
  companyNameEnglish?: string;
  clientType: ClientType;
  email?: string;
  phone: string;
  address?: any;
  nationalId?: string;
  crNumber?: string;
  unifiedNumber?: string;
  notes?: string;
  tags?: string[];
  status?: ClientStatus;
  clientSource?: ClientSource;
  clientTier?: string;
  vatRegistration?: any;
  billing?: any;
  contactInfo?: any;
}

export interface CreateClientResponse {
  success: boolean;
  message: string;
  data: ClientInfo;
}

// GET /api/clients - Get all clients
export interface GetClientsRequest {
  status?: ClientStatus;
  clientType?: ClientType;
  search?: string;
  responsibleLawyerId?: string;
  tags?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface GetClientsResponse extends PaginatedResponse<ClientInfo> {}

// GET /api/clients/search - Search clients
export interface SearchClientsRequest {
  search: string;
  limit?: number;
}

export interface SearchClientsResponse {
  success: boolean;
  data: ClientInfo[];
}

// GET /api/clients/stats - Get client statistics
export interface ClientStats {
  total: number;
  byType: Record<ClientType, number>;
  byStatus: Record<ClientStatus, number>;
  byTier: Record<string, number>;
  verified: number;
}

export interface GetClientStatsResponse {
  success: boolean;
  data: ClientStats;
}

// GET /api/clients/top-revenue - Get top clients by revenue
export interface GetTopClientsByRevenueRequest {
  limit?: number;
}

export interface GetTopClientsByRevenueResponse {
  success: boolean;
  data: ClientInfo[];
}

// GET /api/clients/:id/full - Get client with full details (batch endpoint)
export interface GetClientFullResponse {
  success: boolean;
  data: {
    client: ClientInfo;
    cases: any[];
    invoices: any[];
    payments: any[];
    summary: {
      totalCases: number;
      totalInvoices: number;
      totalInvoiced: number;
      totalPaid: number;
      outstandingBalance: number;
    };
  };
}

// GET /api/clients/:id - Get single client
export interface GetClientResponse {
  success: boolean;
  data: ClientInfo & {
    relatedData: {
      cases: any[];
      invoices: any[];
      payments: any[];
    };
    summary: {
      totalCases: number;
      totalInvoices: number;
      totalInvoiced: number;
      totalPaid: number;
      outstandingBalance: number;
    };
  };
}

// PUT /api/clients/:id - Update client
export interface UpdateClientRequest {
  firstName?: string;
  lastName?: string;
  fullNameArabic?: string;
  fullNameEnglish?: string;
  companyName?: string;
  companyNameEnglish?: string;
  email?: string;
  phone?: string;
  address?: any;
  notes?: string;
  tags?: string[];
  clientSource?: ClientSource;
  clientTier?: string;
  vatRegistration?: any;
  billing?: any;
  contactInfo?: any;
}

export interface UpdateClientResponse {
  success: boolean;
  message: string;
  data: ClientInfo;
}

// DELETE /api/clients/:id - Delete client
export interface DeleteClientResponse {
  success: boolean;
  message: string;
}

// ─────────────────────────────────────────────────────────────
// Client Related Data
// ─────────────────────────────────────────────────────────────

// GET /api/clients/:id/billing-info - Get billing info
export interface GetClientBillingInfoResponse {
  success: boolean;
  data: {
    billing: any;
    invoices: any[];
    payments: any[];
    totalInvoiced: number;
    totalPaid: number;
    outstandingBalance: number;
  };
}

// GET /api/clients/:id/cases - Get client cases
export interface GetClientCasesResponse {
  success: boolean;
  data: any[];
}

// GET /api/clients/:id/invoices - Get client invoices
export interface GetClientInvoicesResponse {
  success: boolean;
  data: any[];
}

// GET /api/clients/:id/payments - Get client payments
export interface GetClientPaymentsResponse {
  success: boolean;
  data: any[];
}

// ─────────────────────────────────────────────────────────────
// Client Verification (Saudi Government Integration)
// ─────────────────────────────────────────────────────────────

// POST /api/clients/:id/verify/wathq - Verify with Wathq (Commercial Registration)
export interface VerifyWathqRequest {
  crNumber: string;
}

export interface VerifyWathqResponse {
  success: boolean;
  message: string;
  data: {
    verified: boolean;
    crNumber: string;
    companyName?: string;
    crStatus?: string;
    verifiedAt: string;
  };
}

// GET /api/clients/:id/wathq/:dataType - Get Wathq data
export interface GetWathqDataResponse {
  success: boolean;
  data: any;
}

// POST /api/clients/:id/verify/absher - Verify with Absher (National ID/Iqama)
export interface VerifyAbsherRequest {
  nationalId?: string;
  iqamaNumber?: string;
}

export interface VerifyAbsherResponse {
  success: boolean;
  message: string;
  data: {
    isVerified: boolean;
    verificationSource: string;
    verifiedAt: string;
  };
}

// POST /api/clients/:id/verify/address - Verify with Saudi Post (National Address)
export interface VerifyAddressRequest {
  buildingNumber?: string;
  streetName?: string;
  district?: string;
  city?: string;
  postalCode?: string;
  additionalNumber?: string;
}

export interface VerifyAddressResponse {
  success: boolean;
  message: string;
  data: {
    nationalAddress: any;
  };
}

// ─────────────────────────────────────────────────────────────
// Client Attachments
// ─────────────────────────────────────────────────────────────

// POST /api/clients/:id/attachments - Upload attachments
// Multipart form data with 'files' field (max 10)

export interface UploadClientAttachmentsResponse {
  success: boolean;
  message: string;
  attachments: any[];
}

// DELETE /api/clients/:id/attachments/:attachmentId - Delete attachment
export interface DeleteClientAttachmentResponse {
  success: boolean;
  message: string;
}

// ─────────────────────────────────────────────────────────────
// Client Conflict Check
// ─────────────────────────────────────────────────────────────

// POST /api/clients/:id/conflict-check - Run conflict check
export interface RunConflictCheckRequest {
  againstParties?: string[];
  caseType?: string;
}

export interface RunConflictCheckResponse {
  success: boolean;
  result: {
    status: 'clear' | 'potential' | 'blocked';
    conflicts: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      relatedCases?: any[];
    }>;
  };
}

// ─────────────────────────────────────────────────────────────
// Client Status & Flags
// ─────────────────────────────────────────────────────────────

// PATCH /api/clients/:id/status - Update status
export interface UpdateClientStatusRequest {
  status: ClientStatus;
  reason?: string;
}

export interface UpdateClientStatusResponse {
  success: boolean;
  message: string;
  data: ClientInfo;
}

// PATCH /api/clients/:id/flags - Update flags
export interface UpdateClientFlagsRequest {
  flags: Record<string, boolean>;
}

export interface UpdateClientFlagsResponse {
  success: boolean;
  message: string;
  data: ClientInfo;
}

// ─────────────────────────────────────────────────────────────
// Client Bulk Operations
// ─────────────────────────────────────────────────────────────

// DELETE /api/clients/bulk - Bulk delete clients
export interface BulkDeleteClientsRequest {
  clientIds: string[];
}

export interface BulkDeleteClientsResponse {
  success: boolean;
  deleted: number;
  failed: Array<{ clientId: string; error: string }>;
}

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════

/**
 * Total Endpoints Documented:
 *
 * AUTH MODULE: ~50 endpoints
 * - Registration & Login: 10
 * - OTP (Email & Phone): 8
 * - Magic Link: 2
 * - MFA: 5
 * - Sessions: 5
 * - Password Management: 4
 * - Email Verification: 2
 * - CSRF: 1
 * - Reauthentication: 4
 *
 * USER MODULE: ~13 endpoints
 * - User profiles: 6
 * - Push notifications: 5
 * - Firm conversion: 1
 * - Team management: 1
 *
 * CASE MODULE: ~60 endpoints
 * - Case CRUD: 8
 * - Notes: 4
 * - Documents (S3): 4
 * - Hearings: 3
 * - Timeline: 3
 * - Claims: 3
 * - Status & Outcome: 3
 * - Audit: 1
 * - Rich Documents: 10
 * - Pipeline: 6
 *
 * TASK MODULE: ~80 endpoints
 * - Task CRUD: 10
 * - Subtasks: 4
 * - Time Tracking: 6
 * - Comments: 3
 * - Attachments: 4
 * - Documents: 7
 * - Voice Memos: 2
 * - Dependencies: 3
 * - Progress: 1
 * - Workflow: 2
 * - Budget: 1
 * - Templates: 7
 * - Bulk Operations: 8
 * - Export: 2
 * - Reordering: 1
 * - Location Triggers: 4
 * - Voice & NLP: 6
 *
 * CLIENT MODULE: ~25 endpoints
 * - Client CRUD: 8
 * - Related Data: 4
 * - Verification (Najiz): 3
 * - Attachments: 2
 * - Conflict Check: 1
 * - Status & Flags: 2
 * - Bulk Operations: 1
 *
 * GRAND TOTAL: ~228 endpoints documented
 */
