/**
 * Traf3li API Client - Simple Version
 *
 * A lightweight API client without React dependencies.
 * Copy this file to your frontend project.
 *
 * Usage:
 *   import { api, auth } from './api-client-simple';
 *
 *   await auth.login('email@example.com', 'password');
 *   const cases = await api.get('/api/v1/cases');
 */

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const API_URL = 'https://api.traf3li.com'; // Change this for your environment

// ═══════════════════════════════════════════════════════════════
// CSRF TOKEN MANAGEMENT
// ═══════════════════════════════════════════════════════════════

let csrfToken = null;

function getCSRFToken() {
  if (csrfToken) return csrfToken;

  // Read from cookie
  const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function setCSRFToken(token) {
  csrfToken = token;
}

function clearCSRFToken() {
  csrfToken = null;
}

// ═══════════════════════════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════════════════════════

async function request(method, endpoint, data = null, options = {}) {
  const url = `${API_URL}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };

  // Add CSRF token for state-changing requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const token = getCSRFToken();
    if (token) {
      headers['X-CSRF-Token'] = token;
    }
  }

  const fetchOptions = {
    method,
    headers,
    credentials: 'include', // CRITICAL: Required for cross-origin cookies
    ...options,
  };

  if (data && method !== 'GET') {
    fetchOptions.body = JSON.stringify(data);
  }

  const response = await fetch(url, fetchOptions);

  // Check for rotated CSRF token in response header
  const newToken = response.headers.get('X-CSRF-Token');
  if (newToken) {
    setCSRFToken(newToken);
  }

  const json = await response.json();

  // Handle CSRF errors with retry
  if (json.code && json.code.startsWith('CSRF_') && !options._csrfRetry) {
    console.warn('[API] CSRF error, refreshing token and retrying...');

    // Fetch fresh CSRF token
    await auth.refreshCSRF();

    // Retry original request
    return request(method, endpoint, data, { ...options, _csrfRetry: true });
  }

  if (!response.ok) {
    const error = new Error(json.message || 'Request failed');
    error.response = response;
    error.data = json;
    throw error;
  }

  return json;
}

export const api = {
  get: (endpoint, options) => request('GET', endpoint, null, options),
  post: (endpoint, data, options) => request('POST', endpoint, data, options),
  put: (endpoint, data, options) => request('PUT', endpoint, data, options),
  patch: (endpoint, data, options) => request('PATCH', endpoint, data, options),
  delete: (endpoint, options) => request('DELETE', endpoint, null, options),
};

// ═══════════════════════════════════════════════════════════════
// AUTH SERVICE
// ═══════════════════════════════════════════════════════════════

export const auth = {
  user: null,

  /**
   * Login with email and password
   */
  async login(email, password, mfaCode = null) {
    const result = await api.post('/api/auth/login', {
      username: email,
      password,
      mfaCode,
    });

    if (result.mfaRequired) {
      return { mfaRequired: true, userId: result.userId };
    }

    if (result.csrfToken) {
      setCSRFToken(result.csrfToken);
    }

    this.user = result.user;
    return result;
  },

  /**
   * Logout
   */
  async logout() {
    try {
      await api.post('/api/auth/logout');
    } catch (e) {
      console.warn('Logout request failed:', e);
    }
    clearCSRFToken();
    this.user = null;
  },

  /**
   * Check authentication status
   */
  async checkStatus() {
    try {
      const result = await api.get('/api/auth/status');
      if (result.user) {
        this.user = result.user;
        await this.refreshCSRF();
        return result.user;
      }
    } catch (e) {
      console.warn('Status check failed:', e);
    }
    this.user = null;
    return null;
  },

  /**
   * Refresh CSRF token
   */
  async refreshCSRF() {
    try {
      const result = await api.get('/api/auth/csrf');
      if (result.csrfToken) {
        setCSRFToken(result.csrfToken);
      }
    } catch (e) {
      console.warn('CSRF refresh failed:', e);
    }
  },

  /**
   * Refresh access token
   */
  async refreshToken() {
    try {
      await api.post('/api/auth/refresh');
      return true;
    } catch (e) {
      console.warn('Token refresh failed:', e);
      return false;
    }
  },

  /**
   * Start OAuth login
   */
  async startOAuth(provider, returnUrl = '/dashboard') {
    const result = await api.post('/api/auth/sso/initiate', {
      provider,
      returnUrl,
    });
    window.location.href = result.authorizationUrl;
  },

  /**
   * Handle OAuth callback (call this on callback page)
   */
  async handleOAuthCallback() {
    const params = new URLSearchParams(window.location.search);

    if (params.get('sso') === 'success') {
      return this.checkStatus();
    }

    if (params.get('error')) {
      throw new Error(`OAuth failed: ${params.get('error')}`);
    }

    return null;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.user;
  },

  /**
   * Check permission
   */
  hasPermission(permission) {
    if (!this.user) return false;
    if (this.user.isSoloLawyer) return true;
    return this.user.permissions?.[permission] === true;
  },
};

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Initialize on app start
 */
export async function init() {
  await auth.checkStatus();
}

// ═══════════════════════════════════════════════════════════════
// USAGE EXAMPLES
// ═══════════════════════════════════════════════════════════════

/*
// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  await init();

  if (auth.isAuthenticated()) {
    console.log('Logged in as:', auth.user.email);
    showDashboard();
  } else {
    showLoginForm();
  }
});

// Login form handler
async function handleLoginSubmit(e) {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const result = await auth.login(email, password);

    if (result.mfaRequired) {
      showMFAForm(result.userId);
      return;
    }

    console.log('Login successful!');
    window.location.href = '/dashboard';
  } catch (error) {
    console.error('Login failed:', error.data?.message || error.message);
    showError(error.data?.message || 'Login failed');
  }
}

// Google OAuth
document.getElementById('google-login').addEventListener('click', () => {
  auth.startOAuth('google');
});

// Fetch data example
async function loadCases() {
  try {
    const result = await api.get('/api/v1/cases');
    console.log('Cases:', result.cases);
    return result.cases;
  } catch (error) {
    console.error('Failed to load cases:', error);
    throw error;
  }
}

// Create data example
async function createCase(caseData) {
  try {
    const result = await api.post('/api/v1/cases', caseData);
    console.log('Case created:', result);
    return result;
  } catch (error) {
    console.error('Failed to create case:', error);
    throw error;
  }
}

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
  await auth.logout();
  window.location.href = '/login';
});
*/
