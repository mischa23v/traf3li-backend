/**
 * Session Controller - Concurrent Session Management
 *
 * Handles HTTP requests for session management:
 * - List active sessions
 * - Get current session info
 * - Terminate specific session
 * - Terminate all other sessions
 * - Session statistics
 */

const sessionManager = require('../services/sessionManager.service');
const auditLogService = require('../services/auditLog.service');
const Session = require('../models/session.model');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

/**
 * Extract IP address from request
 */
const getClientIP = (request) => {
    return request.ip ||
           request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           request.connection?.remoteAddress ||
           'unknown';
};

/**
 * Extract user agent from request
 */
const getClientUserAgent = (request) => {
    return request.headers['user-agent'] || 'unknown';
};

/**
 * Validate session token format
 */
const validateSessionToken = (token) => {
    if (!token || typeof token !== 'string') {
        return null;
    }

    // Remove any whitespace and validate it's not empty
    const trimmedToken = token.trim();
    if (trimmedToken.length === 0 || trimmedToken.length > 500) {
        return null;
    }

    return trimmedToken;
};

/**
 * Detect suspicious session activity
 */
const detectSuspiciousActivity = (session, request) => {
    const currentIP = getClientIP(request);
    const currentUserAgent = getClientUserAgent(request);
    const sessionIP = session.location?.ip || 'unknown';
    const sessionUserAgent = session.deviceInfo?.userAgent || 'unknown';

    const warnings = [];

    // IP mismatch detection
    if (currentIP !== 'unknown' && sessionIP !== 'unknown' && currentIP !== sessionIP) {
        warnings.push({
            type: 'ip_mismatch',
            message: 'IP address changed',
            details: { sessionIP, currentIP }
        });
    }

    // User agent mismatch detection
    if (currentUserAgent !== 'unknown' && sessionUserAgent !== 'unknown' && currentUserAgent !== sessionUserAgent) {
        warnings.push({
            type: 'user_agent_mismatch',
            message: 'User agent changed',
            details: { sessionUserAgent: sessionUserAgent.substring(0, 100), currentUserAgent: currentUserAgent.substring(0, 100) }
        });
    }

    return warnings;
};

/**
 * Get all active sessions for the current user
 * GET /api/auth/sessions
 */
const getActiveSessions = async (request, response) => {
    try {
        const userId = request.userID || request.user?._id || request.user?.id;

        if (!userId) {
            return response.status(401).json({
                error: true,
                message: 'Unauthorized'
            });
        }

        // Sanitize userId to prevent NoSQL injection
        const sanitizedUserId = sanitizeObjectId(userId.toString());
        if (!sanitizedUserId) {
            return response.status(400).json({
                error: true,
                message: 'Invalid user ID format'
            });
        }

        const sessions = await sessionManager.getActiveSessions(sanitizedUserId);

        // Get current session token and validate it
        const rawToken = request.cookies?.accessToken || request.headers.authorization?.replace('Bearer ', '');
        const currentToken = validateSessionToken(rawToken);
        const currentTokenHash = currentToken ? Session.hashToken(currentToken) : null;

        // Format sessions for response
        const formattedSessions = sessions.map(session => ({
            id: session._id,
            device: session.deviceInfo?.device || 'unknown',
            browser: session.deviceInfo?.browser || 'unknown',
            os: session.deviceInfo?.os || 'unknown',
            ip: session.location?.ip || 'unknown',
            location: {
                country: session.location?.country,
                city: session.location?.city,
                region: session.location?.region
            },
            createdAt: session.createdAt,
            lastActivityAt: session.lastActivityAt,
            expiresAt: session.expiresAt,
            isCurrent: session.tokenHash === currentTokenHash,
            isNewDevice: session.isNewDevice
        }));

        // Log access to sessions list (fire-and-forget)
        auditLogService.log(
            'view_sessions',
            'session',
            null,
            null,
            {
                userId: sanitizedUserId,
                userEmail: request.user?.email,
                userRole: request.user?.role,
                ipAddress: getClientIP(request),
                userAgent: getClientUserAgent(request),
                method: request.method,
                endpoint: request.originalUrl,
                severity: 'low',
                details: {
                    sessionCount: sessions.length
                }
            }
        );

        return response.status(200).json({
            error: false,
            message: 'Active sessions retrieved successfully',
            sessions: formattedSessions,
            count: formattedSessions.length
        });
    } catch (error) {
        console.error('getActiveSessions error:', error.message);
        return response.status(500).json({
            error: true,
            message: 'Failed to retrieve active sessions'
        });
    }
};

/**
 * Get current session information
 * GET /api/auth/sessions/current
 */
const getCurrentSession = async (request, response) => {
    try {
        const userId = request.userID || request.user?._id || request.user?.id;
        const rawToken = request.cookies?.accessToken || request.headers.authorization?.replace('Bearer ', '');

        if (!userId || !rawToken) {
            return response.status(401).json({
                error: true,
                message: 'Unauthorized'
            });
        }

        // Sanitize userId to prevent NoSQL injection
        const sanitizedUserId = sanitizeObjectId(userId.toString());
        if (!sanitizedUserId) {
            return response.status(400).json({
                error: true,
                message: 'Invalid user ID format'
            });
        }

        // Validate session token
        const currentToken = validateSessionToken(rawToken);
        if (!currentToken) {
            return response.status(400).json({
                error: true,
                message: 'Invalid session token format'
            });
        }

        const session = await sessionManager.getSessionByToken(currentToken);

        if (!session) {
            return response.status(404).json({
                error: true,
                message: 'Current session not found'
            });
        }

        // IDOR Protection: Verify session belongs to authenticated user
        if (session.userId.toString() !== sanitizedUserId) {
            // Log suspicious activity
            auditLogService.log(
                'unauthorized_session_access_attempt',
                'session',
                session._id,
                null,
                {
                    userId: sanitizedUserId,
                    attemptedSessionUserId: session.userId.toString(),
                    ipAddress: getClientIP(request),
                    userAgent: getClientUserAgent(request),
                    severity: 'high'
                }
            );

            return response.status(403).json({
                error: true,
                message: 'Forbidden: Cannot access another user\'s session'
            });
        }

        // Detect suspicious activity (IP/user-agent changes)
        const warnings = detectSuspiciousActivity(session, request);
        if (warnings.length > 0) {
            // Log suspicious activity
            auditLogService.log(
                'suspicious_session_activity',
                'session',
                session._id,
                null,
                {
                    userId: sanitizedUserId,
                    userEmail: request.user?.email,
                    ipAddress: getClientIP(request),
                    userAgent: getClientUserAgent(request),
                    severity: 'medium',
                    warnings
                }
            );
        }

        const responseData = {
            error: false,
            message: 'Current session retrieved successfully',
            session: {
                id: session._id,
                device: session.deviceInfo?.device || 'unknown',
                browser: session.deviceInfo?.browser || 'unknown',
                os: session.deviceInfo?.os || 'unknown',
                ip: session.location?.ip || 'unknown',
                location: {
                    country: session.location?.country,
                    city: session.location?.city,
                    region: session.location?.region
                },
                createdAt: session.createdAt,
                lastActivityAt: session.lastActivityAt,
                expiresAt: session.expiresAt,
                isCurrent: true
            }
        };

        // Include security warnings if any
        if (warnings.length > 0) {
            responseData.securityWarnings = warnings;
        }

        return response.status(200).json(responseData);
    } catch (error) {
        console.error('getCurrentSession error:', error.message);
        return response.status(500).json({
            error: true,
            message: 'Failed to retrieve current session'
        });
    }
};

/**
 * Terminate a specific session
 * DELETE /api/auth/sessions/:id
 */
const terminateSession = async (request, response) => {
    try {
        const userId = request.userID || request.user?._id || request.user?.id;
        const rawSessionId = request.params.id;

        if (!userId) {
            return response.status(401).json({
                error: true,
                message: 'Unauthorized'
            });
        }

        // Sanitize userId to prevent NoSQL injection
        const sanitizedUserId = sanitizeObjectId(userId.toString());
        if (!sanitizedUserId) {
            return response.status(400).json({
                error: true,
                message: 'Invalid user ID format'
            });
        }

        // Validate and sanitize session ID to prevent IDOR and NoSQL injection
        const sessionId = sanitizeObjectId(rawSessionId);
        if (!sessionId) {
            return response.status(400).json({
                error: true,
                message: 'Invalid session ID format'
            });
        }

        // IDOR Protection: Verify session belongs to user
        const session = await Session.findById(sessionId);

        if (!session) {
            return response.status(404).json({
                error: true,
                message: 'Session not found'
            });
        }

        // IDOR Protection: Verify session ownership
        if (session.userId.toString() !== sanitizedUserId) {
            // Log unauthorized access attempt
            auditLogService.log(
                'unauthorized_session_termination_attempt',
                'session',
                sessionId,
                null,
                {
                    userId: sanitizedUserId,
                    attemptedSessionUserId: session.userId.toString(),
                    ipAddress: getClientIP(request),
                    userAgent: getClientUserAgent(request),
                    severity: 'high'
                }
            );

            return response.status(403).json({
                error: true,
                message: 'Forbidden: Cannot terminate another user\'s session'
            });
        }

        // Secure session invalidation
        await sessionManager.terminateSession(sessionId, 'user_terminated', sanitizedUserId);

        // Log session termination (fire-and-forget)
        auditLogService.log(
            'terminate_session',
            'session',
            sessionId,
            null,
            {
                userId: sanitizedUserId,
                userEmail: request.user?.email,
                userRole: request.user?.role,
                ipAddress: getClientIP(request),
                userAgent: getClientUserAgent(request),
                method: request.method,
                endpoint: request.originalUrl,
                severity: 'medium',
                details: {
                    terminatedDevice: session.deviceInfo?.device,
                    terminatedBrowser: session.deviceInfo?.browser,
                    terminatedIp: session.location?.ip
                }
            }
        );

        return response.status(200).json({
            error: false,
            message: 'Session terminated successfully'
        });
    } catch (error) {
        console.error('terminateSession error:', error.message);
        return response.status(500).json({
            error: true,
            message: 'Failed to terminate session'
        });
    }
};

/**
 * Terminate all other sessions (keep current)
 * DELETE /api/auth/sessions
 */
const terminateAllOtherSessions = async (request, response) => {
    try {
        const userId = request.userID || request.user?._id || request.user?.id;
        const rawToken = request.cookies?.accessToken || request.headers.authorization?.replace('Bearer ', '');

        if (!userId || !rawToken) {
            return response.status(401).json({
                error: true,
                message: 'Unauthorized'
            });
        }

        // Sanitize userId to prevent NoSQL injection
        const sanitizedUserId = sanitizeObjectId(userId.toString());
        if (!sanitizedUserId) {
            return response.status(400).json({
                error: true,
                message: 'Invalid user ID format'
            });
        }

        // Validate session token
        const currentToken = validateSessionToken(rawToken);
        if (!currentToken) {
            return response.status(400).json({
                error: true,
                message: 'Invalid session token format'
            });
        }

        // Get current session to exclude it
        const currentSession = await sessionManager.getSessionByToken(currentToken);

        if (!currentSession) {
            return response.status(404).json({
                error: true,
                message: 'Current session not found'
            });
        }

        // IDOR Protection: Verify current session belongs to user
        if (currentSession.userId.toString() !== sanitizedUserId) {
            // Log suspicious activity
            auditLogService.log(
                'unauthorized_bulk_session_termination_attempt',
                'session',
                null,
                null,
                {
                    userId: sanitizedUserId,
                    attemptedSessionUserId: currentSession.userId.toString(),
                    ipAddress: getClientIP(request),
                    userAgent: getClientUserAgent(request),
                    severity: 'critical'
                }
            );

            return response.status(403).json({
                error: true,
                message: 'Forbidden: Session ownership mismatch'
            });
        }

        // Secure session invalidation - terminate all sessions except current
        const result = await sessionManager.terminateAllSessions(
            sanitizedUserId,
            currentSession._id,
            'user_terminated',
            sanitizedUserId
        );

        // Log bulk termination (fire-and-forget)
        auditLogService.log(
            'terminate_all_sessions',
            'session',
            null,
            null,
            {
                userId: sanitizedUserId,
                userEmail: request.user?.email,
                userRole: request.user?.role,
                ipAddress: getClientIP(request),
                userAgent: getClientUserAgent(request),
                method: request.method,
                endpoint: request.originalUrl,
                severity: 'medium',
                details: {
                    terminatedCount: result.terminatedCount,
                    keptSessionId: currentSession._id
                }
            }
        );

        return response.status(200).json({
            error: false,
            message: result.message,
            terminatedCount: result.terminatedCount
        });
    } catch (error) {
        console.error('terminateAllOtherSessions error:', error.message);
        return response.status(500).json({
            error: true,
            message: 'Failed to terminate sessions'
        });
    }
};

/**
 * Get session statistics
 * GET /api/auth/sessions/stats
 */
const getSessionStats = async (request, response) => {
    try {
        const userId = request.userID || request.user?._id || request.user?.id;

        if (!userId) {
            return response.status(401).json({
                error: true,
                message: 'Unauthorized'
            });
        }

        // Sanitize userId to prevent NoSQL injection
        const sanitizedUserId = sanitizeObjectId(userId.toString());
        if (!sanitizedUserId) {
            return response.status(400).json({
                error: true,
                message: 'Invalid user ID format'
            });
        }

        const stats = await sessionManager.getUserSessionStats(sanitizedUserId);

        return response.status(200).json({
            error: false,
            message: 'Session statistics retrieved successfully',
            stats: {
                activeCount: stats.activeCount,
                totalCount: stats.totalCount,
                recentSessions: stats.recentSessions.map(session => ({
                    id: session._id,
                    device: session.deviceInfo?.device,
                    browser: session.deviceInfo?.browser,
                    os: session.deviceInfo?.os,
                    location: session.location,
                    createdAt: session.createdAt,
                    lastActivityAt: session.lastActivityAt,
                    isActive: session.isActive
                }))
            }
        });
    } catch (error) {
        console.error('getSessionStats error:', error.message);
        return response.status(500).json({
            error: true,
            message: 'Failed to retrieve session statistics'
        });
    }
};

module.exports = {
    getActiveSessions,
    getCurrentSession,
    terminateSession,
    terminateAllOtherSessions,
    getSessionStats
};
