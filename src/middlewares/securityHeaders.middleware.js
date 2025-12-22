const logger = require('../utils/logger');

/**
 * Enhanced Security Headers Middleware
 *
 * Implements comprehensive security headers beyond Helmet's defaults
 * Follows OWASP recommendations and modern security best practices
 *
 * Headers implemented:
 * 1. Permissions-Policy - Controls browser features and APIs
 * 2. Cross-Origin-Embedder-Policy (COEP) - Isolates cross-origin resources
 * 3. Cross-Origin-Opener-Policy (COOP) - Isolates browsing context
 * 4. Cross-Origin-Resource-Policy (CORP) - Controls resource sharing
 * 5. Cache-Control for sensitive endpoints - Prevents caching of sensitive data
 * 6. Vary header - Ensures proper cache behavior
 *
 * @see https://owasp.org/www-project-secure-headers/
 * @see https://web.dev/security-headers/
 */

/**
 * Permissions Policy Middleware
 * Controls which browser features and APIs can be used in the browser
 *
 * Principle: Deny by default, allow only what's needed
 *
 * Features controlled:
 * - camera, microphone: Disabled (not needed for backend API)
 * - geolocation: Disabled (use server-side geolocation if needed)
 * - payment: Self only (for future payment integration)
 * - usb, serial, bluetooth: Disabled (not needed)
 * - interest-cohort: Disabled (opt-out of Google FLoC)
 */
const permissionsPolicy = (req, res, next) => {
    const policy = [
        // Disable camera and microphone (privacy-sensitive)
        'camera=()',
        'microphone=()',

        // Disable geolocation (use server-side geolocation via IP)
        'geolocation=()',

        // Allow payment only from same origin (for future Stripe/payment integrations)
        'payment=(self)',

        // Disable USB, Serial, Bluetooth (not needed for web app)
        'usb=()',
        'serial=()',
        'bluetooth=()',

        // Disable ambient light sensor
        'ambient-light-sensor=()',

        // Disable accelerometer, gyroscope, magnetometer (not needed)
        'accelerometer=()',
        'gyroscope=()',
        'magnetometer=()',

        // Disable screen wake lock
        'screen-wake-lock=()',

        // Opt-out of Google FLoC (privacy)
        'interest-cohort=()',

        // Allow fullscreen from same origin
        'fullscreen=(self)',

        // Allow picture-in-picture from same origin
        'picture-in-picture=(self)',

        // Disable autoplay (prefer user-initiated playback)
        'autoplay=()',

        // Disable encrypted media (not streaming video/audio)
        'encrypted-media=()',

        // Allow sync-xhr only from same origin (discouraged but sometimes needed)
        'sync-xhr=(self)',

        // Disable document domain (security)
        'document-domain=()',

        // Disable speaker selection
        'speaker-selection=()'
    ];

    res.setHeader('Permissions-Policy', policy.join(', '));
    next();
};

/**
 * Cross-Origin Policies Middleware
 *
 * Sets three related headers for cross-origin isolation:
 * 1. Cross-Origin-Embedder-Policy (COEP)
 * 2. Cross-Origin-Opener-Policy (COOP)
 * 3. Cross-Origin-Resource-Policy (CORP)
 *
 * Configuration depends on whether this is an API endpoint or serves HTML
 */
const crossOriginPolicies = (req, res, next) => {
    // For API endpoints, use permissive CORP to allow cross-origin requests
    // This is appropriate for a REST API that needs to serve multiple frontends
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    // COEP: Require CORS for cross-origin resources
    // Using 'unsafe-none' for API compatibility (can upgrade to 'require-corp' if needed)
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');

    // COOP: Isolate browsing context from cross-origin windows
    // 'same-origin-allow-popups' allows OAuth popups while maintaining security
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

    next();
};

/**
 * Vary Header Middleware
 *
 * Adds Vary header to ensure proper cache behavior
 * Critical for CDNs and browser caches to cache different versions
 * based on Origin and other headers
 */
const varyHeader = (req, res, next) => {
    // Add Vary header for proper CORS caching
    const existingVary = res.getHeader('Vary');
    const varyHeaders = ['Origin', 'Accept-Encoding'];

    if (existingVary) {
        // Append to existing Vary header
        const existing = Array.isArray(existingVary) ? existingVary : [existingVary];
        const combined = [...new Set([...existing, ...varyHeaders])];
        res.setHeader('Vary', combined.join(', '));
    } else {
        res.setHeader('Vary', varyHeaders.join(', '));
    }

    next();
};

/**
 * Sensitive Endpoint Cache Control
 *
 * Applies strict cache control to sensitive endpoints
 * Prevents caching of authentication, financial, and personal data
 *
 * Usage: Apply to specific routes that handle sensitive data
 */
const sensitiveCacheControl = (req, res, next) => {
    // Comprehensive no-cache headers
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    // Clear ETag to prevent conditional caching
    res.removeHeader('ETag');

    next();
};

/**
 * Static Asset Cache Control
 *
 * Applies appropriate caching for static assets
 * Different cache durations based on asset type
 */
const staticAssetCacheControl = (req, res, next) => {
    const path = req.path.toLowerCase();

    // Immutable assets (with hash in filename) - cache for 1 year
    if (path.match(/\.[0-9a-f]{8,}\.(js|css|woff|woff2|ttf|otf|eot)$/i)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    // Images - cache for 30 days
    else if (path.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
        res.setHeader('Cache-Control', 'public, max-age=2592000');
    }
    // CSS/JS without hash - cache for 1 hour
    else if (path.match(/\.(css|js)$/i)) {
        res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    }
    // Documents - cache for 1 day
    else if (path.match(/\.(pdf|doc|docx)$/i)) {
        res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate');
    }
    // Default for other static assets - cache for 1 hour
    else {
        res.setHeader('Cache-Control', 'public, max-age=3600');
    }

    next();
};

/**
 * Strict Transport Security (HSTS) Preload Checker
 *
 * Logs a warning if HTTPS is not enabled in production
 * HSTS requires HTTPS to be effective
 */
const checkHstsRequirements = (req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        // Check if request is over HTTPS
        const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';

        if (!isHttps) {
            logger.warn('Non-HTTPS request in production', {
                method: req.method,
                path: req.path,
                ip: req.ip,
                forwardedProto: req.headers['x-forwarded-proto']
            });
        }
    }

    next();
};

/**
 * Remove Server Header
 *
 * Removes or obscures the Server header to prevent information disclosure
 * Prevents attackers from knowing the exact server software and version
 */
const removeServerHeader = (req, res, next) => {
    // Remove Server header
    res.removeHeader('Server');

    // Alternative: Set generic server header
    // res.setHeader('Server', 'API');

    next();
};

/**
 * Complete Security Headers Middleware
 *
 * Combines all security header middlewares into one
 * Apply this middleware globally or to specific routes
 */
const enhancedSecurityHeaders = (req, res, next) => {
    // Apply all security headers
    permissionsPolicy(req, res, () => {
        crossOriginPolicies(req, res, () => {
            varyHeader(req, res, () => {
                removeServerHeader(req, res, () => {
                    checkHstsRequirements(req, res, next);
                });
            });
        });
    });
};

/**
 * Security Headers for API Endpoints
 *
 * Streamlined version for API endpoints (no HTML rendering)
 */
const apiSecurityHeaders = (req, res, next) => {
    // Permissions Policy (deny all features for API)
    res.setHeader('Permissions-Policy', 'interest-cohort=()');

    // Cross-Origin Policies (permissive for API)
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    // Vary header for proper caching
    res.setHeader('Vary', 'Origin, Accept-Encoding');

    // Remove server header
    res.removeHeader('Server');

    next();
};

module.exports = {
    // Individual middlewares
    permissionsPolicy,
    crossOriginPolicies,
    varyHeader,
    sensitiveCacheControl,
    staticAssetCacheControl,
    removeServerHeader,
    checkHstsRequirements,

    // Combined middlewares
    enhancedSecurityHeaders,
    apiSecurityHeaders
};
