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
// ═══════════════════════════════════════════════════════════════
const ACCESS_TOKEN_COOKIE_MAX_AGE = 15 * 60 * 1000; // 15 minutes (matches JWT)
const REFRESH_TOKEN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days (matches JWT)
const REFRESH_TOKEN_REMEMBERED_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days for "Remember Me"
const CSRF_TOKEN_COOKIE_MAX_AGE = parseInt(process.env.CSRF_TOKEN_TTL || '3600', 10) * 1000; // Default: 1 hour

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

module.exports = {
    getCookieConfig,
    getCSRFCookieConfig,
    isProductionEnv,
    // Export constants for testing
    ACCESS_TOKEN_COOKIE_MAX_AGE,
    REFRESH_TOKEN_COOKIE_MAX_AGE,
    REFRESH_TOKEN_REMEMBERED_MAX_AGE,
    CSRF_TOKEN_COOKIE_MAX_AGE
};
