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

        const sessions = await sessionManager.getActiveSessions(userId);

        // Get current session token hash to mark it in the response
        const currentToken = request.cookies?.accessToken || request.headers.authorization?.replace('Bearer ', '');
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
                userId,
                userEmail: request.user?.email,
                userRole: request.user?.role,
                ipAddress: request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                userAgent: request.headers['user-agent'] || 'unknown',
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
        const currentToken = request.cookies?.accessToken || request.headers.authorization?.replace('Bearer ', '');

        if (!userId || !currentToken) {
            return response.status(401).json({
                error: true,
                message: 'Unauthorized'
            });
        }

        const session = await sessionManager.getSessionByToken(currentToken);

        if (!session) {
            return response.status(404).json({
                error: true,
                message: 'Current session not found'
            });
        }

        return response.status(200).json({
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
        });
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
        const sessionId = request.params.id;

        if (!userId) {
            return response.status(401).json({
                error: true,
                message: 'Unauthorized'
            });
        }

        if (!sessionId) {
            return response.status(400).json({
                error: true,
                message: 'Session ID is required'
            });
        }

        // Verify session belongs to user
        const session = await Session.findById(sessionId);

        if (!session) {
            return response.status(404).json({
                error: true,
                message: 'Session not found'
            });
        }

        if (session.userId.toString() !== userId.toString()) {
            return response.status(403).json({
                error: true,
                message: 'Forbidden: Cannot terminate another user\'s session'
            });
        }

        // Terminate the session
        await sessionManager.terminateSession(sessionId, 'user_terminated', userId);

        // Log session termination (fire-and-forget)
        auditLogService.log(
            'terminate_session',
            'session',
            sessionId,
            null,
            {
                userId,
                userEmail: request.user?.email,
                userRole: request.user?.role,
                ipAddress: request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                userAgent: request.headers['user-agent'] || 'unknown',
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
        const currentToken = request.cookies?.accessToken || request.headers.authorization?.replace('Bearer ', '');

        if (!userId || !currentToken) {
            return response.status(401).json({
                error: true,
                message: 'Unauthorized'
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

        // Terminate all sessions except current
        const result = await sessionManager.terminateAllSessions(
            userId,
            currentSession._id,
            'user_terminated',
            userId
        );

        // Log bulk termination (fire-and-forget)
        auditLogService.log(
            'terminate_all_sessions',
            'session',
            null,
            null,
            {
                userId,
                userEmail: request.user?.email,
                userRole: request.user?.role,
                ipAddress: request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
                userAgent: request.headers['user-agent'] || 'unknown',
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

        const stats = await sessionManager.getUserSessionStats(userId);

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
