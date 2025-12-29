/**
 * Traf3li Auth SDK - Main Client
 *
 * Complete authentication client with support for:
 * - Email/password authentication
 * - Passwordless (Magic Link, OTP)
 * - OAuth (Google, Microsoft, etc.)
 * - MFA (TOTP, Backup Codes)
 * - Session management
 * - Password management
 */

import type {
  TrafAuthConfig,
  AuthResult,
  User,
  Session,
  LoginCredentials,
  RegisterData,
  ChangePasswordData,
  ResetPasswordData,
  MFASetupResult,
  MFAVerifyData,
  MFAStatus,
  BackupCodes,
  MagicLinkData,
  OTPData,
  OTPVerifyData,
  OTPStatus,
  OAuthProvider,
  OAuthOptions,
  OAuthCallbackData,
  AvailabilityCheck,
  AvailabilityResult,
  EmailVerificationData,
  OnboardingStatus,
  CSRFToken,
  StepUpChallenge,
  StepUpVerification,
  AnonymousConversionData,
  AuthChangeEvent,
  AuthChangeCallback,
  ErrorCallback,
  APIResponse,
} from './types';

import { BaseStorage, StorageFactory, STORAGE_KEYS } from './storage';
import { HTTPClient, createHTTPClient } from './fetch';
import { createAuthEvents, AuthEventEmitter, AuthStateHandler } from './events';
import {
  ConfigurationError,
  MFARequiredError,
  parseErrorResponse,
} from './errors';
import {
  isBrowser,
  log,
  logError,
  isTokenExpired,
  getTimeUntilExpiration,
  getQueryParam,
  removeQueryParam,
  generateRandomString,
  buildURL,
} from './utils';

/**
 * Traf3li Auth Client
 */
export class TrafAuthClient {
  private config: Required<TrafAuthConfig>;
  private storage: BaseStorage;
  private http: HTTPClient;
  private emitter: AuthEventEmitter;
  private stateHandler: AuthStateHandler;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private initialized = false;

  constructor(config: TrafAuthConfig) {
    // Validate config
    if (!config.apiUrl) {
      throw new ConfigurationError('apiUrl is required');
    }

    // Set default config
    this.config = {
      storageType: 'localStorage',
      storageKeyPrefix: 'traf3li_',
      autoRefreshToken: true,
      refreshThreshold: 60,
      persistSession: true,
      debug: false,
      timeout: 30000,
      retry: true,
      maxRetries: 3,
      csrfProtection: true,
      headers: {},
      ...config,
    } as Required<TrafAuthConfig>;

    // Initialize storage
    if (this.config.storageType === 'custom' && !this.config.storageAdapter) {
      throw new ConfigurationError('storageAdapter is required when using custom storage type');
    }

    this.storage = this.config.storageType === 'custom'
      ? StorageFactory.create('custom', {
          keyPrefix: this.config.storageKeyPrefix,
          customAdapter: this.config.storageAdapter,
        })
      : StorageFactory.create(this.config.storageType, {
          keyPrefix: this.config.storageKeyPrefix,
        });

    // Initialize event system
    const { emitter, handler } = createAuthEvents(this.config.debug);
    this.emitter = emitter;
    this.stateHandler = handler;

    // Initialize HTTP client
    this.http = createHTTPClient({
      baseURL: this.config.apiUrl,
      storage: this.storage,
      timeout: this.config.timeout,
      debug: this.config.debug,
      retry: this.config.retry,
      maxRetries: this.config.maxRetries,
      headers: this.config.headers,
      csrfProtection: this.config.csrfProtection,
      onTokenRefresh: () => this.handleTokenRefresh(),
      onUnauthorized: () => this.handleUnauthorized(),
    });

    // Initialize session
    this.initialize();
  }

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Initialize SDK
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    log('Initializing Traf3li Auth SDK', undefined, this.config.debug);

    try {
      // Restore session from storage if persist is enabled
      if (this.config.persistSession) {
        await this.restoreSession();
      }

      // Fetch CSRF token if protection is enabled
      if (this.config.csrfProtection) {
        await this.fetchCSRFToken();
      }

      this.initialized = true;
      log('Traf3li Auth SDK initialized successfully', undefined, this.config.debug);
    } catch (error) {
      logError('Failed to initialize SDK', error);
      this.initialized = true; // Mark as initialized even on error
    }
  }

  /**
   * Restore session from storage
   */
  private async restoreSession(): Promise<void> {
    try {
      const tokenStorage = await this.storage.getTokenStorage();

      if (!tokenStorage) {
        log('No session to restore', undefined, this.config.debug);
        return;
      }

      // Check if token is expired
      if (isTokenExpired(tokenStorage.accessToken)) {
        log('Stored token is expired, attempting refresh', undefined, this.config.debug);

        try {
          await this.refreshToken();
        } catch (error) {
          log('Token refresh failed, clearing session', error, this.config.debug);
          await this.clearSession();
        }
      } else {
        log('Session restored from storage', undefined, this.config.debug);

        // Create session object
        const session: Session = {
          id: '', // Will be populated from server if needed
          userId: tokenStorage.user.id,
          deviceInfo: {
            userAgent: isBrowser() ? navigator.userAgent : 'Node.js',
          },
          createdAt: '',
          lastActivity: new Date().toISOString(),
          expiresAt: tokenStorage.expiresAt,
          isCurrent: true,
        };

        this.stateHandler.onSignIn(session);

        // Setup auto-refresh
        if (this.config.autoRefreshToken) {
          this.scheduleTokenRefresh(tokenStorage.accessToken);
        }
      }
    } catch (error) {
      logError('Failed to restore session', error);
    }
  }

  /**
   * Fetch CSRF token
   */
  private async fetchCSRFToken(): Promise<void> {
    try {
      const response = await this.http.get<APIResponse<CSRFToken>>('/api/auth/csrf-token', {
        skipAuth: true,
      });

      if (response.data?.token) {
        this.http.setCSRFToken(response.data.token);
        log('CSRF token fetched', undefined, this.config.debug);
      }
    } catch (error) {
      // CSRF token fetch is not critical, just log the error
      log('Failed to fetch CSRF token', error, this.config.debug);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // AUTHENTICATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Login with email and password
   */
  async login(email: string, password: string, options?: { rememberMe?: boolean; captchaToken?: string }): Promise<AuthResult> {
    log('Logging in', { email }, this.config.debug);

    try {
      const credentials: LoginCredentials = {
        email,
        password,
        rememberMe: options?.rememberMe,
        captchaToken: options?.captchaToken,
      };

      const response = await this.http.post<AuthResult>('/api/auth/login', credentials, {
        skipAuth: true,
      });

      // Handle MFA requirement
      if (response.requiresMFA) {
        log('MFA required', undefined, this.config.debug);
        this.stateHandler.onMFARequired();
        throw new MFARequiredError('Multi-factor authentication required', response.mfaToken);
      }

      await this.handleAuthSuccess(response);
      return response;
    } catch (error) {
      logError('Login failed', error);
      throw parseErrorResponse(error);
    }
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<AuthResult> {
    log('Registering new user', { email: data.email }, this.config.debug);

    try {
      const response = await this.http.post<AuthResult>('/api/auth/register', data, {
        skipAuth: true,
      });

      await this.handleAuthSuccess(response);
      return response;
    } catch (error) {
      logError('Registration failed', error);
      throw parseErrorResponse(error);
    }
  }

  /**
   * Logout current session
   */
  async logout(): Promise<void> {
    log('Logging out', undefined, this.config.debug);

    try {
      await this.http.post('/api/auth/logout');
    } catch (error) {
      logError('Logout failed', error);
      // Continue with local cleanup even if server request fails
    } finally {
      await this.clearSession();
      this.stateHandler.onSignOut();
    }
  }

  /**
   * Logout from all sessions/devices
   */
  async logoutAll(): Promise<void> {
    log('Logging out from all devices', undefined, this.config.debug);

    try {
      await this.http.post('/api/auth/logout-all');
    } catch (error) {
      logError('Logout all failed', error);
      // Continue with local cleanup even if server request fails
    } finally {
      await this.clearSession();
      this.stateHandler.onSignOut();
    }
  }

  /**
   * Create anonymous session
   */
  async loginAnonymously(): Promise<AuthResult> {
    log('Creating anonymous session', undefined, this.config.debug);

    try {
      const response = await this.http.post<AuthResult>('/api/auth/anonymous', {}, {
        skipAuth: true,
      });

      await this.handleAuthSuccess(response);
      return response;
    } catch (error) {
      logError('Anonymous login failed', error);
      throw parseErrorResponse(error);
    }
  }

  /**
   * Convert anonymous user to full account
   */
  async convertAnonymousUser(data: AnonymousConversionData): Promise<AuthResult> {
    log('Converting anonymous user', { email: data.email }, this.config.debug);

    try {
      const response = await this.http.post<AuthResult>('/api/auth/anonymous/convert', data);

      await this.handleAuthSuccess(response);
      return response;
    } catch (error) {
      logError('Anonymous conversion failed', error);
      throw parseErrorResponse(error);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PASSWORDLESS AUTHENTICATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Send magic link to email
   */
  async sendMagicLink(email: string, redirectUrl?: string): Promise<void> {
    log('Sending magic link', { email }, this.config.debug);

    try {
      const data: MagicLinkData = {
        email,
        redirectUrl: redirectUrl || this.config.redirectUrl,
      };

      await this.http.post('/api/auth/magic-link/send', data, {
        skipAuth: true,
      });

      log('Magic link sent successfully', undefined, this.config.debug);
    } catch (error) {
      logError('Failed to send magic link', error);
      throw parseErrorResponse(error);
    }
  }

  /**
   * Verify magic link token
   */
  async verifyMagicLink(token: string): Promise<AuthResult> {
    log('Verifying magic link', undefined, this.config.debug);

    try {
      const response = await this.http.post<AuthResult>('/api/auth/magic-link/verify', { token }, {
        skipAuth: true,
      });

      await this.handleAuthSuccess(response);
      return response;
    } catch (error) {
      logError('Magic link verification failed', error);
      throw parseErrorResponse(error);
    }
  }

  /**
   * Send OTP to email
   */
  async sendOTP(email: string, purpose?: 'login' | 'verify' | 'passwordless'): Promise<void> {
    log('Sending OTP', { email, purpose }, this.config.debug);

    try {
      const data: OTPData = {
        email,
        purpose,
      };

      await this.http.post('/api/auth/otp/send', data, {
        skipAuth: true,
      });

      log('OTP sent successfully', undefined, this.config.debug);
    } catch (error) {
      logError('Failed to send OTP', error);
      throw parseErrorResponse(error);
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(email: string, code: string): Promise<AuthResult> {
    log('Verifying OTP', { email }, this.config.debug);

    try {
      const data: OTPVerifyData = {
        email,
        code,
      };

      const response = await this.http.post<AuthResult>('/api/auth/otp/verify', data, {
        skipAuth: true,
      });

      await this.handleAuthSuccess(response);
      return response;
    } catch (error) {
      logError('OTP verification failed', error);
      throw parseErrorResponse(error);
    }
  }

  /**
   * Check OTP status
   */
  async checkOTPStatus(email: string): Promise<OTPStatus> {
    log('Checking OTP status', { email }, this.config.debug);

    try {
      const response = await this.http.post<APIResponse<OTPStatus>>('/api/auth/otp/status', { email }, {
        skipAuth: true,
      });

      return response.data!;
    } catch (error) {
      logError('Failed to check OTP status', error);
      throw parseErrorResponse(error);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // OAUTH AUTHENTICATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Login with Google
   */
  async loginWithGoogle(options?: Partial<OAuthOptions>): Promise<void> {
    return this.loginWithProvider('google', options);
  }

  /**
   * Login with Microsoft
   */
  async loginWithMicrosoft(options?: Partial<OAuthOptions>): Promise<void> {
    return this.loginWithProvider('microsoft', options);
  }

  /**
   * Login with OAuth provider
   */
  async loginWithProvider(provider: OAuthProvider, options?: Partial<OAuthOptions>): Promise<void> {
    if (!isBrowser()) {
      throw new ConfigurationError('OAuth login is only available in browser environment');
    }

    log('Starting OAuth login', { provider }, this.config.debug);

    try {
      // Generate state for CSRF protection
      const state = generateRandomString(32);

      // Store state in session storage for verification
      sessionStorage.setItem('traf3li_oauth_state', state);

      // Build OAuth URL
      const oauthUrl = buildURL(`${this.config.apiUrl}/api/oauth/${provider}`, {
        redirect_uri: options?.redirectUrl || this.config.redirectUrl || window.location.origin,
        state,
        scope: options?.scopes?.join(' '),
        prompt: options?.prompt,
      });

      // Redirect to OAuth provider
      window.location.href = oauthUrl;
    } catch (error) {
      logError('OAuth login failed', error);
      throw parseErrorResponse(error);
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(url?: string): Promise<AuthResult> {
    if (!isBrowser()) {
      throw new ConfigurationError('OAuth callback handling is only available in browser environment');
    }

    log('Handling OAuth callback', undefined, this.config.debug);

    try {
      const callbackUrl = url || window.location.href;

      // Parse callback parameters
      const code = getQueryParam('code', callbackUrl);
      const state = getQueryParam('state', callbackUrl);
      const error = getQueryParam('error', callbackUrl);
      const errorDescription = getQueryParam('error_description', callbackUrl);

      // Check for errors
      if (error) {
        throw new Error(errorDescription || error);
      }

      if (!code) {
        throw new Error('Authorization code not found in callback URL');
      }

      // Verify state (CSRF protection)
      const storedState = sessionStorage.getItem('traf3li_oauth_state');
      if (state !== storedState) {
        throw new Error('Invalid state parameter - possible CSRF attack');
      }

      // Clean up state
      sessionStorage.removeItem('traf3li_oauth_state');

      // Exchange code for tokens
      const data: OAuthCallbackData = {
        code,
        state: state!,
      };

      const response = await this.http.post<AuthResult>('/api/oauth/callback', data, {
        skipAuth: true,
      });

      await this.handleAuthSuccess(response);

      // Clean up URL
      if (!url) {
        const cleanUrl = removeQueryParam('code', removeQueryParam('state', window.location.href));
        window.history.replaceState({}, document.title, cleanUrl);
      }

      return response;
    } catch (error) {
      logError('OAuth callback handling failed', error);
      throw parseErrorResponse(error);
    }
  }

  /**
   * Handle Google One Tap credential
   */
  async handleGoogleOneTap(credential: string): Promise<AuthResult> {
    log('Handling Google One Tap credential', undefined, this.config.debug);

    try {
      const response = await this.http.post<AuthResult>('/api/oauth/google/one-tap', { credential }, {
        skipAuth: true,
      });

      await this.handleAuthSuccess(response);
      return response;
    } catch (error) {
      logError('Google One Tap failed', error);
      throw parseErrorResponse(error);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SESSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get current user
   */
  async getUser(): Promise<User | null> {
    try {
      const tokenStorage = await this.storage.getTokenStorage();
      return tokenStorage?.user || null;
    } catch (error) {
      logError('Failed to get user', error);
      return null;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<AuthResult> {
    log('Refreshing token', undefined, this.config.debug);

    try {
      const response = await this.http.post<AuthResult>('/api/auth/refresh', {}, {
        skipAuth: true,
        skipRefresh: true,
      });

      await this.handleAuthSuccess(response);
      return response;
    } catch (error) {
      logError('Token refresh failed', error);
      await this.clearSession();
      this.stateHandler.onSessionExpired();
      throw parseErrorResponse(error);
    }
  }

  /**
   * Get all active sessions
   */
  async getSessions(): Promise<Session[]> {
    log('Fetching sessions', undefined, this.config.debug);

    try {
      const response = await this.http.get<APIResponse<{ sessions: Session[] }>>('/api/auth/sessions');
      return response.data?.sessions || [];
    } catch (error) {
      logError('Failed to get sessions', error);
      throw parseErrorResponse(error);
    }
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string): Promise<void> {
    log('Revoking session', { sessionId }, this.config.debug);

    try {
      await this.http.post(`/api/auth/sessions/${sessionId}/revoke`);
      log('Session revoked successfully', undefined, this.config.debug);
    } catch (error) {
      logError('Failed to revoke session', error);
      throw parseErrorResponse(error);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MFA (MULTI-FACTOR AUTHENTICATION)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Setup MFA (TOTP)
   */
  async setupMFA(): Promise<MFASetupResult> {
    log('Setting up MFA', undefined, this.config.debug);

    try {
      const response = await this.http.post<APIResponse<MFASetupResult>>('/api/auth/mfa/setup');
      return response.data!;
    } catch (error) {
      logError('MFA setup failed', error);
      throw parseErrorResponse(error);
    }
  }

  /**
   * Verify MFA code (enable MFA or complete login)
   */
  async verifyMFA(code: string, mfaToken?: string): Promise<AuthResult> {
    log('Verifying MFA', undefined, this.config.debug);

    try {
      const data: MFAVerifyData = {
        code,
        mfaToken,
      };

      const response = await this.http.post<AuthResult>('/api/auth/mfa/verify', data, {
        skipAuth: !mfaToken, // Skip auth if verifying during login
      });

      // If this was a login verification, handle auth success
      if (mfaToken) {
        await this.handleAuthSuccess(response);
      }

      return response;
    } catch (error) {
      logError('MFA verification failed', error);
      throw parseErrorResponse(error);
    }
  }

  /**
   * Disable MFA
   */
  async disableMFA(code: string): Promise<void> {
    log('Disabling MFA', undefined, this.config.debug);

    try {
      await this.http.post('/api/auth/mfa/disable', { code });
      log('MFA disabled successfully', undefined, this.config.debug);
    } catch (error) {
      logError('Failed to disable MFA', error);
      throw parseErrorResponse(error);
    }
  }

  /**
   * Get MFA status
   */
  async getMFAStatus(): Promise<MFAStatus> {
    log('Getting MFA status', undefined, this.config.debug);

    try {
      const response = await this.http.get<APIResponse<MFAStatus>>('/api/auth/mfa/status');
      return response.data!;
    } catch (error) {
      logError('Failed to get MFA status', error);
      throw parseErrorResponse(error);
    }
  }

  /**
   * Generate backup codes
   */
  async generateBackupCodes(): Promise<BackupCodes> {
    log('Generating backup codes', undefined, this.config.debug);

    try {
      const response = await this.http.post<APIResponse<BackupCodes>>('/api/auth/mfa/backup-codes/generate');
      return response.data!;
    } catch (error) {
      logError('Failed to generate backup codes', error);
      throw parseErrorResponse(error);
    }
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(code: string): Promise<AuthResult> {
    log('Verifying backup code', undefined, this.config.debug);

    try {
      const response = await this.http.post<AuthResult>('/api/auth/mfa/backup-codes/verify', { code });

      await this.handleAuthSuccess(response);
      return response;
    } catch (error) {
      logError('Backup code verification failed', error);
      throw parseErrorResponse(error);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PASSWORD MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    log('Changing password', undefined, this.config.debug);

    try {
      const data: ChangePasswordData = {
        currentPassword,
        newPassword,
      };

      await this.http.post('/api/auth/password/change', data);
      log('Password changed successfully', undefined, this.config.debug);
    } catch (error) {
      logError('Password change failed', error);
      throw parseErrorResponse(error);
    }
  }

  /**
   * Request password reset (forgot password)
   */
  async forgotPassword(email: string): Promise<void> {
    log('Requesting password reset', { email }, this.config.debug);

    try {
      await this.http.post('/api/auth/password/forgot', { email }, {
        skipAuth: true,
      });

      log('Password reset email sent', undefined, this.config.debug);
    } catch (error) {
      logError('Password reset request failed', error);
      throw parseErrorResponse(error);
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    log('Resetting password', undefined, this.config.debug);

    try {
      const data: ResetPasswordData = {
        token,
        newPassword,
      };

      await this.http.post('/api/auth/reset-password', data, {
        skipAuth: true,
      });

      log('Password reset successful', undefined, this.config.debug);
    } catch (error) {
      logError('Password reset failed', error);
      throw parseErrorResponse(error);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Check email/username/phone availability
   */
  async checkAvailability(field: 'email' | 'username' | 'phone', value: string): Promise<AvailabilityResult> {
    log('Checking availability', { field, value }, this.config.debug);

    try {
      const data: AvailabilityCheck = {
        field,
        value,
      };

      const response = await this.http.post<APIResponse<AvailabilityResult>>('/api/auth/check-availability', data, {
        skipAuth: true,
      });

      return response.data!;
    } catch (error) {
      logError('Availability check failed', error);
      throw parseErrorResponse(error);
    }
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<void> {
    log('Verifying email', undefined, this.config.debug);

    try {
      const data: EmailVerificationData = {
        token,
      };

      await this.http.post('/api/auth/email/verify', data, {
        skipAuth: true,
      });

      log('Email verified successfully', undefined, this.config.debug);
    } catch (error) {
      logError('Email verification failed', error);
      throw parseErrorResponse(error);
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(): Promise<void> {
    log('Resending verification email', undefined, this.config.debug);

    try {
      await this.http.post('/api/auth/email/resend');
      log('Verification email sent', undefined, this.config.debug);
    } catch (error) {
      logError('Failed to resend verification email', error);
      throw parseErrorResponse(error);
    }
  }

  /**
   * Get onboarding status
   */
  async getOnboardingStatus(): Promise<OnboardingStatus> {
    log('Getting onboarding status', undefined, this.config.debug);

    try {
      const response = await this.http.get<APIResponse<OnboardingStatus>>('/api/auth/onboarding/status');
      return response.data!;
    } catch (error) {
      logError('Failed to get onboarding status', error);
      throw parseErrorResponse(error);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // EVENT HANDLING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: AuthChangeCallback): () => void {
    return this.emitter.on('SIGNED_IN', callback as any) ||
           this.emitter.on('SIGNED_OUT', callback as any) ||
           this.emitter.on('TOKEN_REFRESHED', callback as any) ||
           this.emitter.on('SESSION_EXPIRED', callback as any);
  }

  /**
   * Subscribe to specific auth event
   */
  on(event: AuthChangeEvent, callback: AuthChangeCallback): () => void {
    return this.emitter.on(event, callback);
  }

  /**
   * Subscribe to errors
   */
  onError(callback: ErrorCallback): () => void {
    return this.emitter.on('error', callback as any);
  }

  /**
   * Unsubscribe from event
   */
  off(event: AuthChangeEvent | 'error', callback?: AuthChangeCallback | ErrorCallback): void {
    this.emitter.off(event, callback as any);
  }

  // ═══════════════════════════════════════════════════════════════
  // INTERNAL HELPERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Handle successful authentication
   */
  private async handleAuthSuccess(authResult: AuthResult): Promise<void> {
    log('Handling auth success', undefined, this.config.debug);

    // Store tokens and user
    await this.storage.setTokenStorage({
      accessToken: authResult.accessToken,
      refreshToken: authResult.refreshToken,
      expiresAt: authResult.expiresAt,
      user: authResult.user,
    });

    // Create session object
    const session: Session = authResult.session || {
      id: '',
      userId: authResult.user.id,
      deviceInfo: {
        userAgent: isBrowser() ? navigator.userAgent : 'Node.js',
      },
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      expiresAt: authResult.expiresAt,
      isCurrent: true,
    };

    // Emit sign in event
    this.stateHandler.onSignIn(session);

    // Schedule token refresh
    if (this.config.autoRefreshToken) {
      this.scheduleTokenRefresh(authResult.accessToken);
    }
  }

  /**
   * Handle token refresh
   */
  private async handleTokenRefresh(): Promise<{ accessToken: string; refreshToken: string }> {
    const result = await this.refreshToken();

    // Create session for event
    const session: Session = {
      id: '',
      userId: result.user.id,
      deviceInfo: {
        userAgent: isBrowser() ? navigator.userAgent : 'Node.js',
      },
      createdAt: '',
      lastActivity: new Date().toISOString(),
      expiresAt: result.expiresAt,
      isCurrent: true,
    };

    this.stateHandler.onTokenRefresh(session);

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  /**
   * Handle unauthorized (401) response
   */
  private handleUnauthorized(): void {
    log('Unauthorized - clearing session', undefined, this.config.debug);
    this.clearSession();
    this.stateHandler.onSessionExpired();
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(accessToken: string): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Calculate time until token expires
    const timeUntilExpiration = getTimeUntilExpiration(accessToken);
    const refreshTime = Math.max(0, timeUntilExpiration - this.config.refreshThreshold);

    log(`Scheduling token refresh in ${refreshTime} seconds`, undefined, this.config.debug);

    // Schedule refresh
    this.refreshTimer = setTimeout(async () => {
      try {
        log('Auto-refreshing token', undefined, this.config.debug);
        await this.refreshToken();
      } catch (error) {
        logError('Auto token refresh failed', error);
        this.stateHandler.onError(parseErrorResponse(error));
      }
    }, refreshTime * 1000);
  }

  /**
   * Clear session
   */
  private async clearSession(): Promise<void> {
    log('Clearing session', undefined, this.config.debug);

    // Clear refresh timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Clear storage
    await this.storage.clearTokenStorage();
  }
}
