/**
 * Traf3li API Client - Frontend Integration Example
 *
 * This file provides a complete, production-ready API client that handles:
 * - Cross-origin cookie authentication
 * - CSRF token management (double-submit pattern)
 * - Token rotation
 * - Automatic retry on CSRF failures
 * - OAuth/SSO flow support
 *
 * Usage:
 *   import { api, authService } from './api-client';
 *
 *   // Login
 *   await authService.login(email, password);
 *
 *   // Make authenticated requests
 *   const cases = await api.get('/api/v1/cases');
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.traf3li.com';

// CSRF error codes from backend
const CSRF_ERROR_CODES = [
  'CSRF_TOKEN_MISSING',
  'CSRF_NOT_FOUND',
  'CSRF_EXPIRED',
  'CSRF_ALREADY_USED',
  'CSRF_INVALID_FORMAT',
  'CSRF_SESSION_MISMATCH',
  'CSRF_ORIGIN_INVALID',
  'CSRF_NO_SESSION',
];

// ═══════════════════════════════════════════════════════════════
// CSRF TOKEN MANAGEMENT
// ═══════════════════════════════════════════════════════════════

class CSRFManager {
  private memoryToken: string | null = null;

  /**
   * Get CSRF token from cookie or memory
   * Priority: Memory (faster) > Cookie
   */
  getToken(): string | null {
    // Check memory first (faster, updated from response headers)
    if (this.memoryToken) {
      return this.memoryToken;
    }

    // Fallback to cookie
    return this.getTokenFromCookie();
  }

  /**
   * Get CSRF token from cookie
   */
  getTokenFromCookie(): string | null {
    if (typeof document === 'undefined') return null;

    const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  /**
   * Update token in memory (called when backend rotates token)
   */
  setToken(token: string): void {
    this.memoryToken = token;
  }

  /**
   * Clear token (on logout)
   */
  clearToken(): void {
    this.memoryToken = null;
  }

  /**
   * Check if a token exists
   */
  hasToken(): boolean {
    return !!this.getToken();
  }
}

const csrfManager = new CSRFManager();

// ═══════════════════════════════════════════════════════════════
// AXIOS INSTANCE CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/**
 * Create configured Axios instance
 */
function createAPIClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    withCredentials: true, // CRITICAL: Required for cross-origin cookies
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  // ─────────────────────────────────────────────────────────────
  // REQUEST INTERCEPTOR: Add CSRF token to state-changing requests
  // ─────────────────────────────────────────────────────────────
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const method = config.method?.toUpperCase() || 'GET';

      // Add CSRF token to state-changing requests
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        const csrfToken = csrfManager.getToken();
        if (csrfToken) {
          config.headers['X-CSRF-Token'] = csrfToken;
        }
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  // ─────────────────────────────────────────────────────────────
  // RESPONSE INTERCEPTOR: Handle token rotation & errors
  // ─────────────────────────────────────────────────────────────
  instance.interceptors.response.use(
    (response) => {
      // Check for rotated CSRF token in response header
      const newToken = response.headers['x-csrf-token'];
      if (newToken) {
        csrfManager.setToken(newToken);
      }

      return response;
    },
    async (error: AxiosError<{ code?: string; message?: string }>) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _csrfRetry?: boolean };

      // Handle CSRF errors with automatic retry
      if (error.response?.data?.code && CSRF_ERROR_CODES.includes(error.response.data.code)) {
        console.warn('[API] CSRF error:', error.response.data.code);

        // Only retry once
        if (!originalRequest._csrfRetry) {
          originalRequest._csrfRetry = true;

          try {
            // Fetch fresh CSRF token
            const csrfResponse = await instance.get('/api/auth/csrf');

            if (csrfResponse.data.csrfToken) {
              csrfManager.setToken(csrfResponse.data.csrfToken);

              // Retry original request with new token
              originalRequest.headers['X-CSRF-Token'] = csrfResponse.data.csrfToken;
              return instance(originalRequest);
            }
          } catch (csrfError) {
            console.error('[API] Failed to refresh CSRF token:', csrfError);
            // Redirect to login on CSRF refresh failure
            authService.handleAuthFailure('csrf_refresh_failed');
          }
        }
      }

      // Handle authentication errors
      if (error.response?.status === 401) {
        const code = error.response.data?.code;

        // Don't redirect for MFA required
        if (code !== 'MFA_REQUIRED') {
          authService.handleAuthFailure('session_expired');
        }
      }

      return Promise.reject(error);
    }
  );

  return instance;
}

// Create the API client instance
export const api = createAPIClient();

// ═══════════════════════════════════════════════════════════════
// AUTH SERVICE
// ═══════════════════════════════════════════════════════════════

interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  isSoloLawyer?: boolean;
  firmId?: string;
  firmRole?: string;
  permissions?: Record<string, boolean>;
  tenant?: {
    id: string;
    name: string;
    status: string;
  } | null;
}

interface LoginResponse {
  error: boolean;
  message: string;
  user?: User;
  csrfToken?: string;
  mfaRequired?: boolean;
  userId?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

class AuthService {
  private state: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
  };

  private listeners: Set<(state: AuthState) => void> = new Set();

  /**
   * Subscribe to auth state changes
   */
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state); // Immediate callback with current state
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  private updateState(updates: Partial<AuthState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  /**
   * Login with email/username and password
   */
  async login(identifier: string, password: string, mfaCode?: string): Promise<LoginResponse> {
    try {
      const response = await api.post<LoginResponse>('/api/auth/login', {
        username: identifier,
        password,
        mfaCode,
      });

      if (response.data.mfaRequired) {
        return response.data;
      }

      if (response.data.user) {
        // Store CSRF token if provided
        if (response.data.csrfToken) {
          csrfManager.setToken(response.data.csrfToken);
        }

        this.updateState({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false,
        });
      }

      return response.data;
    } catch (error) {
      this.updateState({ isLoading: false });
      throw error;
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      console.warn('[Auth] Logout request failed:', error);
    } finally {
      csrfManager.clearToken();
      this.updateState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(): Promise<void> {
    try {
      await api.post('/api/auth/logout/all');
    } catch (error) {
      console.warn('[Auth] Logout all request failed:', error);
    } finally {
      csrfManager.clearToken();
      this.updateState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }

  /**
   * Check current authentication status
   */
  async checkStatus(): Promise<User | null> {
    try {
      this.updateState({ isLoading: true });

      const response = await api.get<{ error: boolean; user?: User }>('/api/auth/status');

      if (response.data.user) {
        // Initialize CSRF token for authenticated session
        await this.initializeCSRF();

        this.updateState({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false,
        });

        return response.data.user;
      }

      this.updateState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      return null;
    } catch (error) {
      this.updateState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return null;
    }
  }

  /**
   * Initialize CSRF token for the session
   */
  async initializeCSRF(): Promise<void> {
    try {
      const response = await api.get<{ csrfToken?: string; enabled: boolean }>('/api/auth/csrf');

      if (response.data.csrfToken) {
        csrfManager.setToken(response.data.csrfToken);
      }
    } catch (error) {
      console.warn('[Auth] Failed to initialize CSRF token:', error);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<boolean> {
    try {
      const response = await api.post('/api/auth/refresh');
      return !response.data.error;
    } catch (error) {
      console.warn('[Auth] Token refresh failed:', error);
      return false;
    }
  }

  /**
   * Handle OAuth/SSO callback
   */
  async handleOAuthCallback(): Promise<User | null> {
    const params = new URLSearchParams(window.location.search);

    if (params.get('sso') === 'success') {
      // Backend has already set cookies during OAuth callback
      // Just fetch user status and CSRF token
      return this.checkStatus();
    }

    if (params.get('error')) {
      const error = params.get('error');
      const description = params.get('description');
      throw new Error(`OAuth failed: ${error} - ${description}`);
    }

    return null;
  }

  /**
   * Initiate OAuth/SSO flow
   */
  async initiateSSO(provider: 'google' | 'microsoft' | 'apple', returnUrl?: string): Promise<string> {
    const response = await api.post<{ authorizationUrl: string }>('/api/auth/sso/initiate', {
      provider,
      returnUrl: returnUrl || '/dashboard',
    });

    return response.data.authorizationUrl;
  }

  /**
   * Handle authentication failure
   */
  handleAuthFailure(reason: string): void {
    csrfManager.clearToken();
    this.updateState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });

    // Redirect to login with reason
    const currentPath = window.location.pathname;
    if (currentPath !== '/auth/login') {
      window.location.href = `/auth/login?reason=${reason}&returnUrl=${encodeURIComponent(currentPath)}`;
    }
  }

  /**
   * Get current auth state
   */
  getState(): AuthState {
    return this.state;
  }

  /**
   * Check if user has permission
   */
  hasPermission(permission: string): boolean {
    if (!this.state.user) return false;

    // Solo lawyers have full access
    if (this.state.user.isSoloLawyer) return true;

    // Check user permissions
    return this.state.user.permissions?.[permission] === true;
  }
}

export const authService = new AuthService();

// ═══════════════════════════════════════════════════════════════
// REACT HOOKS (Optional - for React projects)
// ═══════════════════════════════════════════════════════════════

/**
 * React hook for auth state
 *
 * Usage:
 *   const { user, isAuthenticated, isLoading } = useAuth();
 */
export function useAuth() {
  // Note: This requires React. Remove if not using React.
  const [state, setState] = (window as any).React?.useState<AuthState>(authService.getState());

  (window as any).React?.useEffect(() => {
    return authService.subscribe(setState);
  }, []);

  return {
    ...state,
    login: authService.login.bind(authService),
    logout: authService.logout.bind(authService),
    checkStatus: authService.checkStatus.bind(authService),
    hasPermission: authService.hasPermission.bind(authService),
  };
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Helper to get CSRF token (for manual use)
 */
export function getCSRFToken(): string | null {
  return csrfManager.getToken();
}

/**
 * Helper to check if CSRF token exists
 */
export function hasCSRFToken(): boolean {
  return csrfManager.hasToken();
}

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Initialize the API client
 * Call this on app startup
 */
export async function initializeAPI(): Promise<void> {
  // Check authentication status on app load
  await authService.checkStatus();
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE USAGE
// ═══════════════════════════════════════════════════════════════

/*
// In your app entry point (main.ts or App.tsx):
import { initializeAPI, authService, api } from './api-client';

// Initialize on app start
initializeAPI();

// Login example:
async function handleLogin(email: string, password: string) {
  try {
    const result = await authService.login(email, password);

    if (result.mfaRequired) {
      // Show MFA input
      return { mfaRequired: true, userId: result.userId };
    }

    // Login successful
    console.log('Logged in as:', result.user);
  } catch (error) {
    console.error('Login failed:', error);
  }
}

// OAuth login example:
async function handleGoogleLogin() {
  const authUrl = await authService.initiateSSO('google', '/dashboard');
  window.location.href = authUrl;
}

// Making authenticated API calls:
async function fetchCases() {
  const response = await api.get('/api/v1/cases');
  return response.data.cases;
}

async function createCase(caseData: any) {
  const response = await api.post('/api/v1/cases', caseData);
  return response.data;
}

// React component example:
function Dashboard() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  return (
    <div>
      <h1>Welcome, {user.firstName}!</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
*/
