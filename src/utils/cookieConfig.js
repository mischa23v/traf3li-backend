/**
 * Cookie Configuration Utility
 *
 * Centralized cookie configuration for secure token storage.
 * Handles cross-origin and same-origin proxy scenarios.
 *
 * Security features:
 * - httpOnly: Prevents XSS attacks by blocking JavaScript access
 * - secure: Ensures cookies are only sent over HTTPS in production
 * - sameSite: Prevents CSRF attacks
 * - domain: Proper scoping for subdomain cookie sharing
 * - partitioned: CHIPS support for cross-site cookies
 */

const logger = require('./logger');
const { NODE_ENV } = process.env;

// ═══════════════════════════════════════════════════════════════
// ENVIRONMENT DETECTION
// ═══════════════════════════════════════════════════════════════

// Robust production detection for cross-origin cookie settings
// Checks multiple indicators to determine if we're in a production environment
const isProductionEnv = NODE_ENV === 'production' ||
                        NODE_ENV === 'prod' ||
                        process.env.RENDER === 'true' ||
                        process.env.VERCEL_ENV === 'production' ||
                        process.env.RAILWAY_ENVIRONMENT === 'production';

// ═══════════════════════════════════════════════════════════════
// COOKIE EXPIRY CONSTANTS - Must match JWT expiry times
// Configurable via environment variables for enterprise flexibility
// ═══════════════════════════════════════════════════════════════
const REFRESH_TOKEN_DAYS = parseInt(process.env.REFRESH_TOKEN_DAYS || '7', 10);
const REMEMBER_ME_DAYS = parseInt(process.env.REMEMBER_ME_DAYS || '30', 10);

const ACCESS_TOKEN_COOKIE_MAX_AGE = 15 * 60 * 1000; // 15 minutes (matches JWT)
const REFRESH_TOKEN_COOKIE_MAX_AGE = REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000; // Default: 7 days
const REFRESH_TOKEN_REMEMBERED_MAX_AGE = REMEMBER_ME_DAYS * 24 * 60 * 60 * 1000; // Default: 30 days for "Remember Me"
const CSRF_TOKEN_COOKIE_MAX_AGE = parseInt(process.env.CSRF_TOKEN_TTL || '3600', 10) * 1000; // Default: 1 hour

// ═══════════════════════════════════════════════════════════════
// REFRESH TOKEN COOKIE CONFIGURATION (Frontend Contract)
// ═══════════════════════════════════════════════════════════════

/**
 * Cookie name for refresh token - MUST match frontend expectations
 * Frontend expects: 'refresh_token' (snake_case per OAuth 2.0 convention)
 */
const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';

/**
 * Refresh token path - defaults to /api/auth (restricted to auth endpoints only)
 * This reduces attack surface by not sending refresh token on every request
 */
const REFRESH_TOKEN_PATH_RAW = process.env.REFRESH_TOKEN_PATH || '/api/auth';

/**
 * Validate and normalize the refresh token path
 * @param {string} path - Raw path from env
 * @returns {string} - Validated path
 */
const validateRefreshTokenPath = (path) => {
    if (!path || typeof path !== 'string') {
        logger.warn('[CookieConfig] Invalid REFRESH_TOKEN_PATH, defaulting to /api/auth');
        return '/api/auth';
    }

    // Normalize: ensure leading slash, remove trailing slash
    let normalized = path.trim();
    if (!normalized.startsWith('/')) {
        normalized = '/' + normalized;
    }
    if (normalized.length > 1 && normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1);
    }

    // Warn if using root path (less secure)
    if (normalized === '/') {
        logger.warn('[CookieConfig] REFRESH_TOKEN_PATH=/ sends refresh token on ALL requests. Consider /api/auth for better security.');
    }

    return normalized;
};

const REFRESH_TOKEN_PATH = validateRefreshTokenPath(REFRESH_TOKEN_PATH_RAW);

/**
 * SameSite policy for refresh tokens
 * Default: 'auto' for adaptive behavior based on request origin
 *
 * GOLD STANDARD: For multi-subdomain apps (dashboard.x.com → api.x.com),
 * 'auto' mode automatically uses 'none' for cross-origin requests in production.
 *
 * Options:
 * - 'strict': Maximum security, breaks cross-site navigations (OAuth redirects, magic links, cross-origin API)
 * - 'lax': Secure default, allows top-level navigations (recommended for OAuth/SSO)
 * - 'none': Required for cross-origin requests (use with caution)
 * - 'auto': Adaptive behavior - 'lax' for same-origin, 'none' for cross-origin in production (RECOMMENDED)
 */
const REFRESH_TOKEN_SAMESITE_RAW = process.env.REFRESH_TOKEN_SAMESITE || 'auto';

/**
 * Validate SameSite value
 */
const validateSameSite = (value) => {
    const normalized = (value || '').toLowerCase().trim();
    const valid = ['strict', 'lax', 'none', 'auto'];

    if (!valid.includes(normalized)) {
        logger.warn(`[CookieConfig] Invalid REFRESH_TOKEN_SAMESITE="${value}", defaulting to auto`);
        return 'auto';
    }

    // Warn about strict mode implications
    if (normalized === 'strict') {
        logger.warn('[CookieConfig] SameSite=Strict enabled. Cross-origin API calls, OAuth/SSO redirects, and magic links will NOT include the refresh token cookie. Consider using "auto" for multi-subdomain apps.');
    }

    return normalized;
};

const REFRESH_TOKEN_SAMESITE = validateSameSite(REFRESH_TOKEN_SAMESITE_RAW);

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Detect if request is coming through a TRUE same-origin proxy
 * A true same-origin proxy is when:
 * 1. The frontend proxies API calls through itself (e.g., Vercel rewrites /api/* to backend)
 * 2. The browser sees the API call as going to the same origin as the frontend
 *
 * IMPORTANT: Just because Origin header is "dashboard.traf3li.com" does NOT mean it's same-origin!
 * If the frontend at dashboard.traf3li.com makes a fetch() to api.traf3li.com, that's cross-origin.
 *
 * Detection strategy (in order of preference):
 * 1. X-Forwarded-Host: Set by reverse proxies (Vercel, Nginx, etc.) with original host
 * 2. Host: Direct request host (may be backend's host when proxied)
 *
 * @param {Object} request - Express request object
 * @returns {boolean} - True if request is from same-origin proxy
 */
const isSameOriginProxy = (request) => {
    const origin = request.headers.origin || '';
    // Prefer X-Forwarded-Host (set by reverse proxies) over Host header
    // This is crucial for Vercel rewrites where Host is the backend's host
    const forwardedHost = request.headers['x-forwarded-host'] || '';
    const host = request.headers.host || '';

    // Use forwarded host if available (indicates proxy), otherwise use direct host
    const effectiveHost = forwardedHost || host;

    // If no origin header, can't determine (treat as cross-origin for safety)
    if (!origin || !effectiveHost) {
        return false;
    }

    try {
        const originHost = new URL(origin).host;
        // True same-origin: the effective host matches the Origin header's host
        // This happens when frontend proxies requests through itself (Vercel rewrites)
        const isSame = originHost === effectiveHost;
        return isSame;
    } catch {
        return false;
    }
};

/**
 * Get cookie domain based on request origin
 * - For same-origin proxy requests: don't set domain (browser scopes to proxy host)
 * - For cross-origin *.traf3li.com: use '.traf3li.com' to share cookies across subdomains
 * - For other origins (e.g., *.vercel.app): don't set domain
 *
 * @param {Object} request - Express request object
 * @returns {string|undefined} - Cookie domain or undefined
 */
const getCookieDomain = (request) => {
    if (!isProductionEnv) return undefined;

    // GOLD STANDARD: Check Host header FIRST
    // For multi-subdomain apps on traf3li.com, ALWAYS return .traf3li.com
    // This ensures cookies work across ALL subdomains (api, dashboard, etc.)
    // regardless of whether request came through proxy or directly
    const host = request.headers.host || '';
    if (host === 'traf3li.com' || host.endsWith('.traf3li.com')) {
        return '.traf3li.com';
    }

    // For non-traf3li.com hosts, check Origin/Referer headers
    const origin = request.headers.origin || request.headers.referer || '';

    // SECURITY FIX: Use proper URL parsing to prevent domain spoofing
    // Previous code would match 'traf3li.com.attacker.com'
    if (origin) {
        try {
            const url = new URL(origin);
            const hostname = url.hostname;

            // Check if hostname ends with traf3li.com (exact match or subdomain)
            if (hostname === 'traf3li.com' || hostname.endsWith('.traf3li.com')) {
                return '.traf3li.com';
            }
        } catch (error) {
            // Invalid URL, return undefined for safety
            logger.warn('Invalid origin URL in getCookieDomain', { origin });
            return undefined;
        }
    }

    return undefined;
};

/**
 * Compute the effective SameSite value based on config and request context
 * @param {Object} request - Express request object
 * @returns {string} - The sameSite value to use
 */
const getEffectiveSameSite = (request) => {
    const isSameOrigin = isSameOriginProxy(request);

    switch (REFRESH_TOKEN_SAMESITE) {
        case 'strict':
            return 'strict';
        case 'lax':
            return 'lax';
        case 'none':
            return 'none';
        case 'auto':
        default:
            // Auto mode: Use adaptive behavior
            // Same-origin: lax (better browser compatibility)
            // Cross-origin: none (required for cross-origin cookies)
            return isSameOrigin ? 'lax' : (isProductionEnv ? 'none' : 'lax');
    }
};

// ═══════════════════════════════════════════════════════════════
// MAIN EXPORT FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get cookie configuration based on request context
 *
 * GOLD STANDARD APPROACH (used by Auth0, Stripe, Okta, Google):
 * - For multi-subdomain apps, ALWAYS set domain to parent domain
 * - This ensures cookies work across api.domain.com, dashboard.domain.com, etc.
 * - Use SameSite=None for cross-origin, SameSite=Lax for same-origin
 *
 * @param {Object} request - Express request object
 * @param {string} tokenType - 'access', 'refresh', or 'csrf' to set appropriate maxAge
 * @param {Object} options - Additional options
 * @param {boolean} options.rememberMe - If true, extends refresh token cookie to 30 days
 * @returns {Object} - Cookie configuration object
 */
const getCookieConfig = (request, tokenType = 'access', options = {}) => {
    const { rememberMe = false } = options;

    // Determine maxAge based on token type
    let maxAge;
    switch (tokenType) {
        case 'refresh':
            // Use extended expiry for "Remember Me" sessions
            maxAge = rememberMe ? REFRESH_TOKEN_REMEMBERED_MAX_AGE : REFRESH_TOKEN_COOKIE_MAX_AGE;
            break;
        case 'csrf':
            maxAge = CSRF_TOKEN_COOKIE_MAX_AGE;
            break;
        case 'access':
        default:
            maxAge = ACCESS_TOKEN_COOKIE_MAX_AGE;
            break;
    }

    // GOLD STANDARD: Always get cookie domain for multi-subdomain support
    // This ensures cookies work across api.traf3li.com, dashboard.traf3li.com, etc.
    const cookieDomain = getCookieDomain(request);
    const isSameOrigin = isSameOriginProxy(request);

    // For same-origin proxy requests: use Lax (better browser compatibility)
    // For cross-origin requests: use None (required for cross-origin cookies)
    // IMPORTANT: Even for same-origin proxy, we set domain for subdomain sharing
    if (isSameOrigin) {
        return {
            httpOnly: true,
            sameSite: 'lax',
            secure: isProductionEnv,
            maxAge,
            path: '/',
            // GOLD STANDARD: Always set domain for multi-subdomain apps
            // This ensures cookies work even if user later makes direct API calls
            domain: cookieDomain
        };
    }

    // Cross-origin: use None with all the cross-site cookie requirements
    // Note: secure must be true for SameSite=None in production
    // But for localhost development, we need secure=false to work over HTTP
    return {
        httpOnly: true,
        sameSite: isProductionEnv ? 'none' : 'lax', // 'lax' works better for localhost
        secure: isProductionEnv, // false for localhost (HTTP), true for production (HTTPS)
        maxAge,
        path: '/',
        domain: cookieDomain,
        partitioned: isProductionEnv // CHIPS only needed in production
    };
};

/**
 * Get CSRF token cookie configuration
 * CSRF tokens need httpOnly: false to allow JavaScript access
 *
 * GOLD STANDARD: Same domain strategy as auth cookies
 * - Always set domain for multi-subdomain apps
 * - Ensures CSRF tokens work across all subdomains
 *
 * @param {Object} request - Express request object
 * @returns {Object} - Cookie configuration object for CSRF tokens
 */
const getCSRFCookieConfig = (request) => {
    const isSameOrigin = isSameOriginProxy(request);
    const cookieDomain = getCookieDomain(request);

    // GOLD STANDARD: Always set domain for multi-subdomain support
    // This ensures CSRF tokens work across api.traf3li.com, dashboard.traf3li.com, etc.
    if (isSameOrigin) {
        return {
            httpOnly: false, // Allow JavaScript access for sending in headers
            sameSite: 'lax',
            secure: isProductionEnv,
            maxAge: CSRF_TOKEN_COOKIE_MAX_AGE,
            path: '/',
            domain: cookieDomain // GOLD STANDARD: Always set for subdomain sharing
        };
    }

    // Cross-origin configuration
    return {
        httpOnly: false, // Allow JavaScript access for sending in headers
        sameSite: isProductionEnv ? 'none' : 'lax',
        secure: isProductionEnv,
        maxAge: CSRF_TOKEN_COOKIE_MAX_AGE,
        path: '/',
        domain: cookieDomain,
        partitioned: isProductionEnv
    };
};

/**
 * Get httpOnly refresh token cookie configuration
 *
 * GOLD STANDARD (AWS, Google, Microsoft):
 * - httpOnly: true - Prevents XSS attacks by blocking JavaScript access
 * - secure: true - HTTPS only in production
 * - sameSite: 'strict' - Maximum CSRF protection (default, configurable)
 * - path: '/api/auth' - Only sent to auth endpoints (default, configurable)
 *
 * ⚠️  WARNING: Default SameSite=Strict breaks OAuth/SSO and magic links!
 * Set REFRESH_TOKEN_SAMESITE=lax if using OAuth providers or magic links.
 *
 * @param {Object} request - Express request object
 * @param {Object} options - Additional options
 * @param {boolean} options.rememberMe - If true, extends cookie to 30 days
 * @returns {Object} - Cookie configuration object for httpOnly refresh tokens
 */
const getHttpOnlyRefreshCookieConfig = (request, options = {}) => {
    const { rememberMe = false } = options;
    const cookieDomain = getCookieDomain(request);
    const isSameOrigin = isSameOriginProxy(request);
    const sameSite = getEffectiveSameSite(request);

    // Determine maxAge based on rememberMe option
    const maxAge = rememberMe ? REFRESH_TOKEN_REMEMBERED_MAX_AGE : REFRESH_TOKEN_COOKIE_MAX_AGE;

    // Build base config
    const config = {
        httpOnly: true,           // JS cannot access - prevents XSS theft
        secure: isProductionEnv,  // HTTPS only in production
        sameSite,
        maxAge,
        path: REFRESH_TOKEN_PATH, // Restricted path (default: '/api/auth')
        domain: cookieDomain
    };

    // Add partitioned flag for cross-origin in production (CHIPS support)
    if (isProductionEnv && !isSameOrigin && sameSite === 'none') {
        config.partitioned = true;
    }

    return config;
};

/**
 * Get configuration for clearing the refresh token cookie
 * MUST match the path/domain/sameSite used when setting the cookie
 *
 * @param {Object} request - Express request object
 * @returns {Object} - Cookie configuration for clearing refresh token
 */
const getClearRefreshCookieConfig = (request) => {
    const cookieDomain = getCookieDomain(request);
    const sameSite = getEffectiveSameSite(request);

    return {
        httpOnly: true,
        secure: isProductionEnv,
        sameSite, // MUST match the sameSite used when setting the cookie
        path: REFRESH_TOKEN_PATH,
        domain: cookieDomain
    };
};

module.exports = {
    getCookieConfig,
    getCSRFCookieConfig,
    getHttpOnlyRefreshCookieConfig,
    getClearRefreshCookieConfig,
    isProductionEnv,
    // Export cookie name for controllers
    REFRESH_TOKEN_COOKIE_NAME,
    REFRESH_TOKEN_PATH,
    // Export constants for testing
    ACCESS_TOKEN_COOKIE_MAX_AGE,
    REFRESH_TOKEN_COOKIE_MAX_AGE,
    REFRESH_TOKEN_REMEMBERED_MAX_AGE,
    CSRF_TOKEN_COOKIE_MAX_AGE
};
