/**
 * Session Timeout Middleware
 *
 * Implements session timeout policy:
 * - Idle timeout: 30 minutes of inactivity
 * - Absolute timeout: 24 hours since login (even if active)
 * - Remember me: 7 days (existing behavior)
 *
 * Security compliance: Nafath, DocuSign, OWASP session management
 *
 * UPDATED: Now uses Redis for horizontal scaling across multiple instances
 */

const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');
const cacheService = require('../services/cache.service');

// Session timeout configuration
const SESSION_POLICY = {
    idleTimeout: 30 * 60 * 1000,      // 30 minutes idle timeout
    absoluteTimeout: 24 * 60 * 60 * 1000, // 24 hours absolute timeout
    rememberMeTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days for remember me
    warningBefore: 5 * 60 * 1000,     // Warn 5 minutes before expiry
};

// Cache key prefix for session activity
const SESSION_KEY_PREFIX = 'session:activity:';

// TTL for session activity records (24 hours in seconds)
const SESSION_TTL_SECONDS = 24 * 60 * 60;

/**
 * Session timeout check middleware
 * Validates that the session hasn't exceeded idle or absolute timeout
 */
const checkSessionTimeout = async (req, res, next) => {
    // Debug flag - set AUTH_DEBUG=true in env to enable detailed logging
    const DEBUG = process.env.AUTH_DEBUG === 'true';

    try {
        // Skip if no user (not authenticated)
        if (!req.userID) {
            return next();
        }

        const token = req.cookies?.accessToken;
        if (!token) {
            return next();
        }

        // Decode token to get timestamps
        const decoded = jwt.decode(token);
        if (!decoded) {
            return next();
        }

        const now = Date.now();
        const sessionKey = `${SESSION_KEY_PREFIX}${req.userID}`;

        // Check absolute timeout (24 hours since token was issued)
        const tokenIssuedAt = decoded.iat * 1000; // JWT iat is in seconds
        const absoluteExpiry = tokenIssuedAt + SESSION_POLICY.absoluteTimeout;

        // Debug: Log session timing info
        if (DEBUG) {
            const lastActivityFromCache = await cacheService.get(sessionKey);
            // eslint-disable-next-line no-console
            console.log(`[SESSION-DEBUG] ${new Date().toISOString()} | Session check`, {
                userId: req.userID,
                path: req.path,
                tokenIssuedAt: new Date(tokenIssuedAt).toISOString(),
                absoluteExpiry: new Date(absoluteExpiry).toISOString(),
                absoluteRemainingMinutes: ((absoluteExpiry - now) / 60000).toFixed(2),
                lastActivity: lastActivityFromCache ? new Date(lastActivityFromCache).toISOString() : 'none (using tokenIssuedAt)',
                idleTimeoutMinutes: SESSION_POLICY.idleTimeout / 60000,
                absoluteTimeoutHours: SESSION_POLICY.absoluteTimeout / 3600000
            });
        }

        if (now > absoluteExpiry) {
            // Debug: Log absolute timeout trigger
            if (DEBUG) {
                // eslint-disable-next-line no-console
                console.log('[SESSION-DEBUG] ABSOLUTE TIMEOUT triggered', {
                    userId: req.userID,
                    tokenIssuedAt: new Date(tokenIssuedAt).toISOString(),
                    absoluteExpiry: new Date(absoluteExpiry).toISOString(),
                    currentTime: new Date(now).toISOString(),
                    expiredAgoMinutes: ((now - absoluteExpiry) / 60000).toFixed(2)
                });
            }

            // Clear the last activity record from Redis
            await cacheService.del(sessionKey);

            // Clear the auth cookie (true server-side logout)
            res.clearCookie('accessToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                path: '/',
            });

            // Add debug header for frontend
            res.setHeader('X-Session-Debug', 'absolute_timeout');

            return res.status(401).json({
                error: true,
                message: 'انتهت صلاحية الجلسة. الرجاء تسجيل الدخول مرة أخرى',
                messageEn: 'Session expired. Please log in again',
                code: 'SESSION_ABSOLUTE_TIMEOUT',
                reason: 'absolute_timeout',
                loggedOut: true,
                // Include debug info in response if DEBUG enabled
                ...(DEBUG && {
                    debug: {
                        serverTime: new Date().toISOString(),
                        tokenIssuedAt: new Date(tokenIssuedAt).toISOString(),
                        absoluteExpiry: new Date(absoluteExpiry).toISOString(),
                        sessionDurationHours: ((now - tokenIssuedAt) / 3600000).toFixed(2)
                    }
                })
            });
        }

        // Check idle timeout (30 minutes since last activity)
        const lastActivity = await cacheService.get(sessionKey) || tokenIssuedAt;
        const idleExpiry = lastActivity + SESSION_POLICY.idleTimeout;

        if (now > idleExpiry) {
            // Debug: Log idle timeout trigger
            if (DEBUG) {
                // eslint-disable-next-line no-console
                console.log('[SESSION-DEBUG] IDLE TIMEOUT triggered', {
                    userId: req.userID,
                    lastActivity: new Date(lastActivity).toISOString(),
                    idleExpiry: new Date(idleExpiry).toISOString(),
                    currentTime: new Date(now).toISOString(),
                    idleDurationMinutes: ((now - lastActivity) / 60000).toFixed(2),
                    expiredAgoMinutes: ((now - idleExpiry) / 60000).toFixed(2)
                });
            }

            // Clear the last activity record from Redis
            await cacheService.del(sessionKey);

            // Clear the auth cookie (true server-side logout)
            res.clearCookie('accessToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                path: '/',
            });

            // Add debug header for frontend
            res.setHeader('X-Session-Debug', 'idle_timeout');

            return res.status(401).json({
                error: true,
                message: 'انتهت صلاحية الجلسة بسبب عدم النشاط. الرجاء تسجيل الدخول مرة أخرى',
                messageEn: 'Session expired due to inactivity. Please log in again',
                code: 'SESSION_IDLE_TIMEOUT',
                reason: 'idle_timeout',
                loggedOut: true,
                // Include debug info in response if DEBUG enabled
                ...(DEBUG && {
                    debug: {
                        serverTime: new Date().toISOString(),
                        lastActivity: new Date(lastActivity).toISOString(),
                        idleExpiry: new Date(idleExpiry).toISOString(),
                        idleDurationMinutes: ((now - lastActivity) / 60000).toFixed(2)
                    }
                })
            });
        }

        // Update last activity timestamp in Redis
        await cacheService.set(sessionKey, now, SESSION_TTL_SECONDS);

        // Add session info to response headers (for frontend to display warnings)
        const idleRemaining = Math.max(0, idleExpiry - now);
        const absoluteRemaining = Math.max(0, absoluteExpiry - now);

        // Only add warning headers if close to expiry
        if (idleRemaining < SESSION_POLICY.warningBefore) {
            res.setHeader('X-Session-Idle-Warning', 'true');
            res.setHeader('X-Session-Idle-Remaining', Math.ceil(idleRemaining / 1000));

            if (DEBUG) {
                // eslint-disable-next-line no-console
                console.log('[SESSION-DEBUG] Idle warning issued', {
                    userId: req.userID,
                    idleRemainingSeconds: Math.ceil(idleRemaining / 1000)
                });
            }
        }

        if (absoluteRemaining < SESSION_POLICY.warningBefore) {
            res.setHeader('X-Session-Absolute-Warning', 'true');
            res.setHeader('X-Session-Absolute-Remaining', Math.ceil(absoluteRemaining / 1000));

            if (DEBUG) {
                // eslint-disable-next-line no-console
                console.log('[SESSION-DEBUG] Absolute warning issued', {
                    userId: req.userID,
                    absoluteRemainingSeconds: Math.ceil(absoluteRemaining / 1000)
                });
            }
        }

        next();
    } catch (error) {
        logger.error('Session timeout check error:', error.message);
        // Fail open - don't block requests due to timeout check errors
        next();
    }
};

/**
 * Record activity for a user (call on successful auth)
 * @param {string} userId - User ID
 */
async function recordActivity(userId) {
    if (userId) {
        try {
            await cacheService.set(`${SESSION_KEY_PREFIX}${userId}`, Date.now(), SESSION_TTL_SECONDS);
        } catch (error) {
            logger.error('Error recording session activity:', error.message);
        }
    }
}

/**
 * Clear session activity (call on logout)
 * @param {string} userId - User ID
 */
async function clearSessionActivity(userId) {
    if (userId) {
        try {
            await cacheService.del(`${SESSION_KEY_PREFIX}${userId}`);
        } catch (error) {
            logger.error('Error clearing session activity:', error.message);
        }
    }
}

/**
 * Get session info for a user
 * @param {string} userId - User ID
 * @param {object} tokenData - Decoded JWT data
 * @returns {Promise<object>} Session information
 */
async function getSessionInfo(userId, tokenData) {
    const now = Date.now();
    const sessionKey = `${SESSION_KEY_PREFIX}${userId}`;
    const lastActivity = await cacheService.get(sessionKey);
    const tokenIssuedAt = tokenData?.iat ? tokenData.iat * 1000 : now;

    const idleRemaining = lastActivity
        ? Math.max(0, (lastActivity + SESSION_POLICY.idleTimeout) - now)
        : SESSION_POLICY.idleTimeout;

    const absoluteRemaining = Math.max(0, (tokenIssuedAt + SESSION_POLICY.absoluteTimeout) - now);

    return {
        lastActivity: lastActivity ? new Date(lastActivity) : null,
        idleRemaining: Math.ceil(idleRemaining / 1000 / 60), // minutes
        absoluteRemaining: Math.ceil(absoluteRemaining / 1000 / 60), // minutes
        idleTimeout: SESSION_POLICY.idleTimeout / 1000 / 60, // minutes
        absoluteTimeout: SESSION_POLICY.absoluteTimeout / 1000 / 60, // minutes
    };
}

module.exports = {
    checkSessionTimeout,
    recordActivity,
    clearSessionActivity,
    getSessionInfo,
    SESSION_POLICY,
};
