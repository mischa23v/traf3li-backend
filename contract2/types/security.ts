/**
 * Security API Type Definitions
 *
 * Comprehensive TypeScript types for all security-related modules:
 * - OAuth/SSO
 * - MFA (Multi-Factor Authentication)
 * - WebAuthn (Hardware Security Keys)
 * - SAML/Enterprise SSO
 * - SSO Configuration
 * - Security Monitoring
 * - LDAP/Active Directory
 *
 * Total Endpoints: 61
 */

// ============================================================================
// COMMON TYPES & ENUMS
// ============================================================================

export type ApiResponse<T = any> = {
  error: boolean;
  message: string;
  messageAr?: string;
  messageEn?: string;
} & T;

export enum OAuthProvider {
  GOOGLE = 'google',
  MICROSOFT = 'microsoft',
  FACEBOOK = 'facebook',
  APPLE = 'apple',
  GITHUB = 'github',
  LINKEDIN = 'linkedin',
  TWITTER = 'twitter',
  OKTA = 'okta',
  AZURE = 'azure',
  AUTH0 = 'auth0',
  CUSTOM = 'custom'
}

export enum SSOProviderType {
  SAML = 'saml',
  OIDC = 'oidc'
}

export enum SAMLProvider {
  AZURE = 'azure',
  OKTA = 'okta',
  GOOGLE = 'google',
  CUSTOM = 'custom'
}

export enum VerificationMethod {
  DNS = 'dns',
  EMAIL = 'email',
  MANUAL = 'manual'
}

export enum IncidentType {
  BRUTE_FORCE = 'brute_force',
  ACCOUNT_TAKEOVER = 'account_takeover',
  ANOMALOUS_ACTIVITY = 'anomalous_activity',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  SUSPICIOUS_LOGIN = 'suspicious_login'
}

export enum IncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum IncidentStatus {
  OPEN = 'open',
  INVESTIGATING = 'investigating',
  RESOLVED = 'resolved',
  FALSE_POSITIVE = 'false_positive'
}

export enum WebAuthnDeviceType {
  PLATFORM = 'platform',
  CROSS_PLATFORM = 'cross-platform'
}

export enum LDAPSearchScope {
  BASE = 'base',
  ONE = 'one',
  SUB = 'sub'
}

export enum DefaultRole {
  LAWYER = 'lawyer',
  PARALEGAL = 'paralegal',
  SECRETARY = 'secretary',
  ACCOUNTANT = 'accountant',
  PARTNER = 'partner',
  CLIENT = 'client',
  ADMIN = 'admin'
}

// ============================================================================
// OAUTH/SSO TYPES (15 endpoints)
// ============================================================================

// GET /api/auth/sso/providers
export interface GetOAuthProvidersRequest {
  firmId?: string;
}

export interface OAuthProviderInfo {
  id: string;
  name: string;
  providerType: OAuthProvider;
  isEnabled: boolean;
}

export interface GetOAuthProvidersResponse {
  error: boolean;
  message: string;
  providers: OAuthProviderInfo[];
}

// POST /api/auth/sso/initiate
export interface InitiateSSORequest {
  provider: OAuthProvider;
  returnUrl?: string;
  firmId?: string;
  use_pkce?: boolean;
}

export interface InitiateSSOResponse {
  error: boolean;
  message: string;
  authorizationUrl: string;
  pkceEnabled: boolean;
}

// GET /api/auth/sso/:providerType/authorize
export interface AuthorizeOAuthRequest {
  returnUrl?: string;
  firmId?: string;
  use_pkce?: string; // Query param (string)
}

export interface AuthorizeOAuthResponse {
  error: boolean;
  message: string;
  authUrl: string;
  pkceEnabled?: boolean;
}

// POST /api/auth/sso/callback
export interface OAuthCallbackRequest {
  provider: OAuthProvider;
  code: string;
  state: string;
}

export interface UserProfile {
  _id?: string;
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role?: string;
  username?: string;
  firmId?: string;
  firmRole?: string;
}

export interface OAuthCallbackResponse {
  error: boolean;
  message: string;
  user: UserProfile;
  isNewUser: boolean;
  registrationRequired: boolean;
  access_token: string | null;
  refresh_token: string | null;
  token_type: string;
  expires_in: number;
  // Backwards compatibility
  accessToken: string | null;
  refreshToken: string | null;
}

// POST /api/auth/sso/link
export interface LinkOAuthAccountRequest {
  providerType: OAuthProvider;
  code: string;
  redirectUri: string;
  state?: string;
}

export interface LinkOAuthAccountResponse {
  error: boolean;
  message: string;
  messageAr: string;
  success?: boolean;
  provider?: string;
  providerUserId?: string;
  email?: string;
  displayName?: string;
  linkedAt?: string;
}

// DELETE /api/auth/sso/unlink/:providerType
export interface UnlinkOAuthAccountResponse {
  error: boolean;
  message: string;
  messageAr: string;
  success?: boolean;
}

// GET /api/auth/sso/linked
export interface LinkedOAuthProvider {
  providerType: OAuthProvider;
  externalEmail: string;
  lastLoginAt: string;
  isActive: boolean;
}

export interface GetLinkedAccountsResponse {
  error: boolean;
  message: string;
  links: LinkedOAuthProvider[];
}

// POST /api/auth/sso/detect
export interface DetectSSOProviderRequest {
  email: string;
  firmId?: string;
  returnUrl?: string;
}

export interface DetectedProvider {
  id: string;
  name: string;
  type: SSOProviderType;
  providerType: string;
  autoRedirect: boolean;
  domainVerified: boolean;
  priority: number;
}

export interface DetectSSOProviderResponse {
  error: boolean;
  detected: boolean;
  provider?: DetectedProvider;
  authUrl?: string;
  message: string;
  domain: string;
}

// GET /api/auth/sso/domain/:domain
export interface GetDomainConfigRequest {
  firmId?: string;
}

export interface DomainProvider {
  id: string;
  name: string;
  providerType: string;
  priority: number;
  autoRedirect: boolean;
  domainVerified: boolean;
  verificationMethod: VerificationMethod | null;
  verifiedAt?: string;
}

export interface GetDomainConfigResponse {
  error: boolean;
  message: string;
  messageAr: string;
  domain: string;
  providers: DomainProvider[];
  primaryProvider?: DomainProvider;
}

// POST /api/auth/sso/domain/:domain/verify/generate
export interface GenerateVerificationTokenRequest {
  providerId: string;
}

export interface TXTRecord {
  host: string;
  type: string;
  value: string;
  ttl: number;
}

export interface GenerateVerificationTokenResponse {
  error: boolean;
  message: string;
  messageAr: string;
  domain: string;
  verificationMethod: string;
  txtRecord: TXTRecord;
  instructions: string[];
  token: string;
}

// POST /api/auth/sso/domain/:domain/verify
export interface VerifyDomainRequest {
  providerId: string;
}

export interface VerifyDomainResponse {
  error: boolean;
  verified: boolean;
  message: string;
  verifiedAt?: string;
}

// POST /api/auth/sso/domain/:domain/verify/manual
export interface ManualVerifyDomainRequest {
  providerId: string;
}

export interface ManualVerifyDomainResponse {
  error: boolean;
  verified: boolean;
  message: string;
  verificationMethod: string;
}

// POST /api/auth/sso/domain/:domain/cache/invalidate
export interface InvalidateDomainCacheRequest {
  firmId?: string;
}

export interface InvalidateDomainCacheResponse {
  error: boolean;
  message: string;
  messageAr: string;
}

// ============================================================================
// MFA TYPES (9 endpoints)
// ============================================================================

// POST /api/auth/mfa/setup
export interface MFASetupResponse {
  error: boolean;
  message: string;
  messageEn: string;
  qrCode: string; // Data URL
  setupKey: string;
  instructions: {
    ar: string;
    en: string;
  };
}

// POST /api/auth/mfa/verify-setup
export interface VerifyMFASetupRequest {
  token: string; // 6-digit code
}

export interface VerifyMFASetupResponse {
  error: boolean;
  message: string;
  messageEn: string;
  enabled: boolean;
  backupCodes: string[];
  backupCodesWarning: {
    ar: string;
    en: string;
  };
}

// POST /api/auth/mfa/verify
export interface VerifyMFARequest {
  userId: string;
  token: string; // 6-digit code
}

export interface VerifyMFAResponse {
  error: boolean;
  message: string;
  messageEn: string;
  valid: boolean;
  code?: string;
}

// POST /api/auth/mfa/disable
export interface DisableMFARequest {
  password: string;
}

export interface DisableMFAResponse {
  error: boolean;
  message: string;
  messageEn: string;
  disabled: boolean;
  code?: string;
}

// GET /api/auth/mfa/status
export interface GetMFAStatusResponse {
  error: boolean;
  mfaEnabled: boolean;
  hasTOTP: boolean;
  hasBackupCodes: boolean;
  remainingCodes: number;
}

// POST /api/auth/mfa/backup-codes/generate
export interface GenerateBackupCodesResponse {
  error: boolean;
  message: string;
  messageEn: string;
  codes: string[];
  remainingCodes: number;
  totalCodes: number;
}

// POST /api/auth/mfa/backup-codes/verify
export interface VerifyBackupCodeRequest {
  userId: string;
  code: string; // Format: ABCD-1234
}

export interface VerifyBackupCodeResponse {
  error: boolean;
  message: string;
  messageEn: string;
  valid: boolean;
  remainingCodes: number;
  code?: string;
  warning?: {
    message: string;
    messageEn: string;
    remainingCodes: number;
  };
}

// POST /api/auth/mfa/backup-codes/regenerate
export interface RegenerateBackupCodesResponse {
  error: boolean;
  message: string;
  messageEn: string;
  codes: string[];
  remainingCodes: number;
  totalCodes: number;
  code?: string;
}

// GET /api/auth/mfa/backup-codes/count
export interface GetBackupCodesCountResponse {
  error: boolean;
  remainingCodes: number;
  warning?: {
    message: string;
    messageEn: string;
  };
}

// ============================================================================
// WEBAUTHN TYPES (7 endpoints)
// ============================================================================

// POST /api/auth/webauthn/register/start
export interface StartWebAuthnRegistrationResponse {
  success: boolean;
  data: any; // WebAuthn PublicKeyCredentialCreationOptions
}

// POST /api/auth/webauthn/register/finish
export interface FinishWebAuthnRegistrationRequest {
  credential: any; // WebAuthn credential object
  credentialName?: string;
}

export interface WebAuthnCredential {
  id: string;
  credentialId: string;
  name: string;
  deviceType: WebAuthnDeviceType;
  transports: string[];
  createdAt: string;
  lastUsedAt?: string;
  backedUp?: boolean;
}

export interface FinishWebAuthnRegistrationResponse {
  success: boolean;
  message: string;
  data: WebAuthnCredential;
}

// POST /api/auth/webauthn/authenticate/start
export interface StartWebAuthnAuthenticationRequest {
  email?: string;
  username?: string;
}

export interface StartWebAuthnAuthenticationResponse {
  success: boolean;
  data: {
    options: any; // WebAuthn PublicKeyCredentialRequestOptions
    userId: string;
  };
}

// POST /api/auth/webauthn/authenticate/finish
export interface FinishWebAuthnAuthenticationRequest {
  credential: any; // WebAuthn credential object
  userId: string;
}

export interface FinishWebAuthnAuthenticationResponse {
  success: boolean;
  message: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  // Backwards compatibility
  accessToken: string;
  refreshToken: string;
  data: {
    token: string;
    user: UserProfile;
    credential: WebAuthnCredential;
  };
}

// GET /api/auth/webauthn/credentials
export interface GetWebAuthnCredentialsResponse {
  success: boolean;
  data: WebAuthnCredential[];
}

// PATCH /api/auth/webauthn/credentials/:id
export interface UpdateWebAuthnCredentialNameRequest {
  name: string;
}

export interface UpdateWebAuthnCredentialNameResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    name: string;
  };
}

// DELETE /api/auth/webauthn/credentials/:id
export interface DeleteWebAuthnCredentialResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// SAML TYPES (8 endpoints)
// ============================================================================

// GET /api/auth/saml/metadata/:firmId
export type GetSAMLMetadataResponse = string; // XML string

// GET /api/auth/saml/login/:firmId
export interface InitiateSAMLLoginRequest {
  RelayState?: string;
}
// Response: 302 redirect

// POST /api/auth/saml/acs/:firmId
export interface SAMLAssertionConsumerRequest {
  SAMLResponse: string; // Base64-encoded
  RelayState?: string;
}
// Response: 302 redirect

// GET /api/auth/saml/logout/:firmId
// Response: 302 redirect

// POST /api/auth/saml/sls/:firmId
export interface SAMLSingleLogoutRequest {
  SAMLResponse: string; // Base64-encoded
}
// Response: 302 redirect

// GET /api/auth/saml/config
export interface SAMLConfig {
  ssoEnabled: boolean;
  ssoProvider: SAMLProvider | null;
  ssoEntityId: string | null;
  ssoSsoUrl: string | null;
  ssoMetadataUrl: string | null;
  hasCertificate: boolean;
  spEntityId: string;
  spAcsUrl: string;
  spSloUrl: string;
  spMetadataUrl: string;
}

export interface GetSAMLConfigResponse {
  error: boolean;
  message: string;
  config: SAMLConfig;
}

// PUT /api/auth/saml/config
export interface UpdateSAMLConfigRequest {
  ssoEnabled?: boolean;
  ssoProvider: SAMLProvider;
  ssoEntityId: string;
  ssoSsoUrl: string;
  ssoCertificate: string; // PEM format
  ssoMetadataUrl?: string;
}

export interface UpdateSAMLConfigResponse {
  error: boolean;
  message: string;
  config: {
    ssoEnabled: boolean;
    ssoProvider: string;
    ssoEntityId: string;
    ssoSsoUrl: string;
    ssoMetadataUrl?: string;
  };
}

// POST /api/auth/saml/config/test
export interface TestSAMLConfigResponse {
  error: boolean;
  message: string;
  valid: boolean;
  details?: string;
  errors?: string[];
}

// ============================================================================
// SSO CONFIGURATION TYPES (5 endpoints)
// ============================================================================

// GET /api/firms/:firmId/sso
export interface AttributeMapping {
  email: string;
  firstName: string;
  lastName: string;
  groups?: string;
}

export interface ServiceProviderUrls {
  entityId: string;
  acsUrl: string;
  sloUrl: string;
  metadataUrl: string;
}

export interface SSOConfiguration {
  enabled: boolean;
  provider: SAMLProvider | null;
  entityId: string | null;
  ssoUrl: string | null;
  sloUrl: string | null;
  certificate: string | null; // Masked as ***CONFIGURED***
  metadataUrl: string | null;
  attributeMapping: AttributeMapping;
  allowedDomains: string[];
  autoProvision: boolean;
  defaultRole: DefaultRole;
  requireEmailVerification: boolean;
  syncUserAttributes: boolean;
  lastTested: string | null;
  configuredAt: string | null;
  serviceProvider: ServiceProviderUrls;
}

export interface GetSSOConfigResponse {
  success: boolean;
  data: SSOConfiguration;
}

// PUT /api/firms/:firmId/sso
export interface UpdateSSOConfigRequest {
  enabled?: boolean;
  provider?: SAMLProvider;
  entityId?: string;
  ssoUrl?: string;
  sloUrl?: string;
  certificate?: string;
  metadataUrl?: string;
  attributeMapping?: Partial<AttributeMapping>;
  allowedDomains?: string[];
  autoProvision?: boolean;
  defaultRole?: DefaultRole;
  requireEmailVerification?: boolean;
  syncUserAttributes?: boolean;
}

export interface UpdateSSOConfigResponse {
  success: boolean;
  message: string;
  messageEn: string;
  data: {
    enabled: boolean;
    provider: string;
    configuredAt: string;
  };
}

// POST /api/firms/:firmId/sso/test
export interface TestResultDetails {
  configurationValid: boolean;
  certificateValid: boolean;
  urlsReachable: boolean;
  errors: string[];
}

export interface TestSSOConnectionResponse {
  success: boolean;
  message: string;
  messageEn: string;
  testResults: TestResultDetails;
  testPassed: boolean;
  testedAt: string;
  errors?: string[];
}

// POST /api/firms/:firmId/sso/upload-metadata
export interface UploadSSOMetadataRequest {
  metadataXml: string;
}

export interface UploadSSOMetadataResponse {
  success: boolean;
  message: string;
  messageEn: string;
  data: {
    entityId: string;
    ssoUrl: string;
    sloUrl?: string;
    certificateConfigured: boolean;
  };
}

// DELETE /api/firms/:firmId/sso
export interface DisableSSOResponse {
  success: boolean;
  message: string;
  messageEn: string;
}

// ============================================================================
// SECURITY MONITORING TYPES (11 endpoints)
// ============================================================================

// GET /api/security/dashboard
export interface SecurityDashboardRequest {
  startDate?: string;
  endDate?: string;
}

export interface SecurityDashboardStats {
  // Structure depends on securityMonitor.service implementation
  [key: string]: any;
}

export interface SecurityDashboardResponse {
  success: boolean;
  data: SecurityDashboardStats;
  meta: {
    firmId: string;
    dateRange: {
      startDate?: Date;
      endDate?: Date;
    };
    generatedAt: Date;
  };
}

// GET /api/security/incidents
export interface ListIncidentsRequest {
  page?: number;
  limit?: number;
  type?: IncidentType;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  userId?: string;
  ip?: string;
  startDate?: string;
  endDate?: string;
  sort?: string; // JSON string
}

export interface SecurityIncident {
  _id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  userId?: string;
  ip?: string;
  detectedAt: string;
  resolvedAt?: string;
  description?: string;
  metadata?: any;
}

export interface ListIncidentsResponse {
  success: boolean;
  data: SecurityIncident[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// GET /api/security/incidents/:id
export interface GetIncidentResponse {
  success: boolean;
  data: SecurityIncident;
}

// PUT /api/security/incidents/:id
export interface UpdateIncidentRequest {
  status: IncidentStatus;
  resolution?: string;
  notes?: string;
}

export interface UpdateIncidentResponse {
  success: boolean;
  data: SecurityIncident;
  message: string;
}

// POST /api/security/incidents/:id/acknowledge
export interface AcknowledgeIncidentResponse {
  success: boolean;
  message: string;
}

// POST /api/security/incidents/:id/notes
export interface AddIncidentNoteRequest {
  note: string;
}

export interface AddIncidentNoteResponse {
  success: boolean;
  message: string;
}

// POST /api/security/detect/brute-force
export interface DetectBruteForceRequest {
  userId?: string;
  ip?: string;
  email?: string;
  userAgent?: string;
}

export interface DetectBruteForceResponse {
  success: boolean;
  data: any; // Detection result
}

// POST /api/security/detect/account-takeover
export interface DetectAccountTakeoverRequest {
  userId: string;
  loginInfo?: any;
}

export interface DetectAccountTakeoverResponse {
  success: boolean;
  data: any; // Detection result
}

// POST /api/security/detect/anomalous-activity
export interface DetectAnomalousActivityRequest {
  userId: string;
  action: string;
}

export interface DetectAnomalousActivityResponse {
  success: boolean;
  data: any; // Detection result
}

// GET /api/security/stats
export interface GetSecurityStatsRequest {
  startDate?: string;
  endDate?: string;
}

export interface GetSecurityStatsResponse {
  success: boolean;
  data: any; // Statistics object
  meta: {
    firmId: string;
    dateRange: {
      startDate?: Date;
      endDate?: Date;
    };
    generatedAt: Date;
  };
}

// GET /api/security/incidents/open
export interface GetOpenIncidentsRequest {
  severity?: IncidentSeverity;
  limit?: number;
}

export interface GetOpenIncidentsResponse {
  success: boolean;
  data: SecurityIncident[];
  meta: {
    count: number;
    firmId: string;
  };
}

// ============================================================================
// LDAP TYPES (6 endpoints)
// ============================================================================

// GET /api/admin/ldap/config
export interface LDAPAttributeMapping {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phone?: string;
  memberOf?: string;
}

export interface LDAPConfigData {
  isEnabled: boolean;
  name?: string;
  serverUrl: string;
  baseDn: string;
  bindDn: string;
  userFilter: string;
  groupFilter?: string;
  attributeMapping: LDAPAttributeMapping;
  groupMapping?: Map<string, string>;
  defaultRole: DefaultRole;
  useSsl: boolean;
  useStarttls: boolean;
  verifyCertificate: boolean;
  tlsCaCert?: string;
  autoProvisionUsers: boolean;
  updateUserAttributes: boolean;
  allowLocalFallback?: boolean;
  timeout: number;
  searchScope: LDAPSearchScope;
  pageSize?: number;
}

export interface LDAPConfigStatus {
  configured: boolean;
  enabled: boolean;
  lastTested?: string;
  lastSync?: string;
}

export interface GetLDAPConfigResponse {
  error: boolean;
  config: LDAPConfigData;
  status?: LDAPConfigStatus;
  exists: boolean;
}

// POST /api/admin/ldap/config
export interface SaveLDAPConfigRequest {
  name?: string;
  serverUrl: string;
  baseDn: string;
  bindDn?: string;
  bindPassword?: string;
  userFilter?: string;
  groupFilter?: string;
  attributeMapping?: Partial<LDAPAttributeMapping>;
  groupMapping?: Record<string, string>;
  defaultRole?: DefaultRole;
  useSsl?: boolean;
  useStarttls?: boolean;
  verifyCertificate?: boolean;
  tlsCaCert?: string;
  isEnabled?: boolean;
  autoProvisionUsers?: boolean;
  updateUserAttributes?: boolean;
  allowLocalFallback?: boolean;
  timeout?: number;
  searchScope?: LDAPSearchScope;
  pageSize?: number;
}

export interface SaveLDAPConfigResponse {
  error: boolean;
  message: string;
  config: LDAPConfigData;
}

// POST /api/admin/ldap/test
export interface TestLDAPConnectionRequest {
  testUser?: string;
  testPassword?: string;
}

export interface TestLDAPConnectionResponse {
  error: boolean;
  success: boolean;
  message: string;
  details?: any;
  responseTime?: number;
}

// POST /api/admin/ldap/test-auth
export interface TestLDAPAuthRequest {
  username: string;
  password: string;
}

export interface TestLDAPAuthResponse {
  error: boolean;
  success: boolean;
  message: string;
  user?: any; // LDAP user attributes
}

// POST /api/admin/ldap/sync
export interface SyncLDAPUsersRequest {
  filter?: string;
}

export interface LDAPSyncStats {
  total: number;
  usersCreated: number;
  usersUpdated: number;
  usersFailed: number;
  duration: number;
}

export interface SyncLDAPUsersResponse {
  error: boolean;
  success: boolean;
  message: string;
  stats: LDAPSyncStats;
}

// POST /api/auth/ldap/login
export interface LDAPLoginRequest {
  firmId: string;
  username: string;
  password: string;
}

export interface LDAPLoginResponse {
  error: boolean;
  message: string;
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  // Backwards compatibility
  accessToken?: string;
  refreshToken?: string;
  user?: UserProfile;
  data?: UserProfile;
}

// ============================================================================
// ENDPOINT SUMMARY
// ============================================================================

/**
 * Total Endpoints by Module:
 *
 * OAuth/SSO: 15 endpoints
 * - GET    /api/auth/sso/providers
 * - POST   /api/auth/sso/initiate
 * - POST   /api/auth/sso/callback
 * - POST   /api/auth/sso/:provider/callback
 * - GET    /api/auth/sso/:providerType/authorize
 * - GET    /api/auth/sso/:providerType/callback
 * - POST   /api/auth/sso/link
 * - DELETE /api/auth/sso/unlink/:providerType
 * - GET    /api/auth/sso/linked
 * - POST   /api/auth/sso/detect
 * - GET    /api/auth/sso/domain/:domain
 * - POST   /api/auth/sso/domain/:domain/verify/generate
 * - POST   /api/auth/sso/domain/:domain/verify
 * - POST   /api/auth/sso/domain/:domain/verify/manual
 * - POST   /api/auth/sso/domain/:domain/cache/invalidate
 *
 * MFA: 9 endpoints
 * - POST   /api/auth/mfa/setup
 * - POST   /api/auth/mfa/verify-setup
 * - POST   /api/auth/mfa/verify
 * - POST   /api/auth/mfa/disable
 * - GET    /api/auth/mfa/status
 * - POST   /api/auth/mfa/backup-codes/generate
 * - POST   /api/auth/mfa/backup-codes/verify
 * - POST   /api/auth/mfa/backup-codes/regenerate
 * - GET    /api/auth/mfa/backup-codes/count
 *
 * WebAuthn: 7 endpoints
 * - POST   /api/auth/webauthn/register/start
 * - POST   /api/auth/webauthn/register/finish
 * - POST   /api/auth/webauthn/authenticate/start
 * - POST   /api/auth/webauthn/authenticate/finish
 * - GET    /api/auth/webauthn/credentials
 * - PATCH  /api/auth/webauthn/credentials/:id
 * - DELETE /api/auth/webauthn/credentials/:id
 *
 * SAML: 8 endpoints
 * - GET    /api/auth/saml/metadata/:firmId
 * - GET    /api/auth/saml/login/:firmId
 * - POST   /api/auth/saml/acs/:firmId
 * - GET    /api/auth/saml/logout/:firmId
 * - POST   /api/auth/saml/sls/:firmId
 * - GET    /api/auth/saml/config
 * - PUT    /api/auth/saml/config
 * - POST   /api/auth/saml/config/test
 *
 * SSO Configuration: 5 endpoints
 * - GET    /api/firms/:firmId/sso
 * - PUT    /api/firms/:firmId/sso
 * - POST   /api/firms/:firmId/sso/test
 * - POST   /api/firms/:firmId/sso/upload-metadata
 * - DELETE /api/firms/:firmId/sso
 *
 * Security Monitoring: 11 endpoints
 * - GET    /api/security/dashboard
 * - GET    /api/security/incidents
 * - GET    /api/security/incidents/:id
 * - PUT    /api/security/incidents/:id
 * - POST   /api/security/incidents/:id/acknowledge
 * - POST   /api/security/incidents/:id/notes
 * - POST   /api/security/detect/brute-force
 * - POST   /api/security/detect/account-takeover
 * - POST   /api/security/detect/anomalous-activity
 * - GET    /api/security/stats
 * - GET    /api/security/incidents/open
 *
 * LDAP: 6 endpoints
 * - GET    /api/admin/ldap/config
 * - POST   /api/admin/ldap/config
 * - POST   /api/admin/ldap/test
 * - POST   /api/admin/ldap/test-auth
 * - POST   /api/admin/ldap/sync
 * - POST   /api/auth/ldap/login
 *
 * TOTAL: 61 endpoints
 */
