/**
 * Session Manager Service - Concurrent Session Management
 *
 * Provides high-level API for managing user sessions with concurrent session control.
 * Features:
 * - Create and track sessions
 * - Enforce session limits per user/firm
 * - Device fingerprinting and detection
 * - Session termination (single or bulk)
 * - Activity tracking
 * - Security notifications
 */

const Session = require('../models/session.model');
const Notification = require('../models/notification.model');
const Firm = require('../models/firm.model');
const UAParser = require('ua-parser-js');

class SessionManagerService {
    /**
     * Create a new session for a user
     * @param {String} userId - User ID
     * @param {String} token - JWT token
     * @param {Object} deviceInfo - Device information from request
     * @returns {Promise<Object>} Created session
     */
    async createSession(userId, token, deviceInfo = {}) {
        try {
            const tokenHash = Session.hashToken(token);

            // Parse user agent for device details
            const parser = new UAParser(deviceInfo.userAgent);
            const ua = parser.getResult();

            // Build device info
            const parsedDeviceInfo = {
                userAgent: deviceInfo.userAgent || 'unknown',
                ip: deviceInfo.ip || 'unknown',
                device: this._getDeviceType(ua),
                browser: ua.browser?.name || 'unknown',
                os: ua.os?.name || 'unknown',
                platform: ua.os?.version || ''
            };

            // Build location info (basic for now, can be enhanced with GeoIP)
            const locationInfo = {
                ip: deviceInfo.ip || 'unknown',
                country: deviceInfo.country || null,
                city: deviceInfo.city || null,
                region: deviceInfo.region || null,
                timezone: deviceInfo.timezone || null
            };

            // Check if this is a new device
            const isKnownDevice = await Session.isKnownDevice(userId, parsedDeviceInfo);

            // Calculate expiration (7 days default, matching JWT expiration)
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            // Create session
            const session = new Session({
                userId,
                firmId: deviceInfo.firmId || null,
                tokenHash,
                deviceInfo: parsedDeviceInfo,
                location: locationInfo,
                createdAt: new Date(),
                lastActivityAt: new Date(),
                expiresAt,
                isActive: true,
                isNewDevice: !isKnownDevice,
                metadata: deviceInfo.metadata || {}
            });

            await session.save();

            // Send notification if new device (async, non-blocking)
            if (!isKnownDevice) {
                this._notifyNewDevice(userId, parsedDeviceInfo, locationInfo, session._id)
                    .catch(err => console.error('Failed to send new device notification:', err));
            }

            return session;
        } catch (error) {
            console.error('SessionManager.createSession failed:', error.message);
            throw error;
        }
    }

    /**
     * Get all active sessions for a user
     * @param {String} userId - User ID
     * @returns {Promise<Array>} Active sessions
     */
    async getActiveSessions(userId) {
        try {
            return await Session.getActiveSessions(userId);
        } catch (error) {
            console.error('SessionManager.getActiveSessions failed:', error.message);
            return [];
        }
    }

    /**
     * Terminate a specific session
     * @param {String} sessionId - Session ID
     * @param {String} reason - Termination reason
     * @param {String} terminatedBy - User ID who terminated the session
     * @returns {Promise<Object>} Terminated session
     */
    async terminateSession(sessionId, reason = 'user_terminated', terminatedBy = null) {
        try {
            const session = await Session.terminateSession(sessionId, reason, terminatedBy);

            if (session) {
                // Send notification (async, non-blocking)
                this._notifySessionTerminated(session.userId, session, reason)
                    .catch(err => console.error('Failed to send termination notification:', err));
            }

            return session;
        } catch (error) {
            console.error('SessionManager.terminateSession failed:', error.message);
            throw error;
        }
    }

    /**
     * Terminate all sessions for a user except the current one
     * @param {String} userId - User ID
     * @param {String} exceptSessionId - Session ID to keep active
     * @param {String} reason - Termination reason
     * @param {String} terminatedBy - User ID who terminated the sessions
     * @returns {Promise<Object>} Result with count of terminated sessions
     */
    async terminateAllSessions(userId, exceptSessionId = null, reason = 'user_terminated', terminatedBy = null) {
        try {
            let result;

            if (exceptSessionId) {
                result = await Session.terminateAllExcept(userId, exceptSessionId, reason, terminatedBy);
            } else {
                result = await Session.terminateAll(userId, reason, terminatedBy);
            }

            // Send notification if sessions were terminated (async, non-blocking)
            if (result.modifiedCount > 0) {
                this._notifyBulkTermination(userId, result.modifiedCount, reason)
                    .catch(err => console.error('Failed to send bulk termination notification:', err));
            }

            return {
                success: true,
                terminatedCount: result.modifiedCount,
                message: `${result.modifiedCount} session(s) terminated`
            };
        } catch (error) {
            console.error('SessionManager.terminateAllSessions failed:', error.message);
            throw error;
        }
    }

    /**
     * Enforce session limit for a user
     * Terminates oldest sessions if limit is exceeded
     * @param {String} userId - User ID
     * @param {Number} maxSessions - Maximum allowed sessions
     * @returns {Promise<Object>} Result with count of terminated sessions
     */
    async enforceSessionLimit(userId, maxSessions = 5) {
        try {
            // Get all active sessions sorted by creation date (oldest first)
            const sessions = await Session.find({
                userId,
                isActive: true,
                expiresAt: { $gt: new Date() }
            }).sort({ createdAt: 1 });

            const currentCount = sessions.length;

            // If within limit, no action needed
            if (currentCount <= maxSessions) {
                return {
                    success: true,
                    terminatedCount: 0,
                    message: 'Session count within limit'
                };
            }

            // Calculate how many sessions to terminate
            const toTerminate = currentCount - maxSessions;
            const sessionsToTerminate = sessions.slice(0, toTerminate);

            // Terminate oldest sessions
            const terminatePromises = sessionsToTerminate.map(session =>
                Session.terminateSession(session._id, 'limit_exceeded', userId)
            );

            await Promise.all(terminatePromises);

            return {
                success: true,
                terminatedCount: toTerminate,
                message: `${toTerminate} session(s) terminated due to limit exceeded`,
                currentCount: maxSessions
            };
        } catch (error) {
            console.error('SessionManager.enforceSessionLimit failed:', error.message);
            throw error;
        }
    }

    /**
     * Update session activity timestamp
     * @param {String} sessionId - Session ID
     * @returns {Promise<Object>} Updated session
     */
    async updateSessionActivity(sessionId) {
        try {
            const session = await Session.findById(sessionId);
            if (session && session.isActive) {
                return await session.updateActivity();
            }
            return null;
        } catch (error) {
            console.error('SessionManager.updateSessionActivity failed:', error.message);
            return null;
        }
    }

    /**
     * Update session activity by token
     * @param {String} token - JWT token
     * @returns {Promise<Object>} Updated session
     */
    async updateSessionActivityByToken(token) {
        try {
            const tokenHash = Session.hashToken(token);
            const session = await Session.findOne({
                tokenHash,
                isActive: true,
                expiresAt: { $gt: new Date() }
            });

            if (session) {
                return await session.updateActivity();
            }
            return null;
        } catch (error) {
            console.error('SessionManager.updateSessionActivityByToken failed:', error.message);
            return null;
        }
    }

    /**
     * Get session by token
     * @param {String} token - JWT token
     * @returns {Promise<Object>} Session
     */
    async getSessionByToken(token) {
        try {
            return await Session.findByToken(token);
        } catch (error) {
            console.error('SessionManager.getSessionByToken failed:', error.message);
            return null;
        }
    }

    /**
     * Get session statistics for a user
     * @param {String} userId - User ID
     * @returns {Promise<Object>} Session statistics
     */
    async getUserSessionStats(userId) {
        try {
            return await Session.getUserStats(userId);
        } catch (error) {
            console.error('SessionManager.getUserSessionStats failed:', error.message);
            return { activeCount: 0, totalCount: 0, recentSessions: [] };
        }
    }

    /**
     * Get session limit for a user (from firm settings or default)
     * @param {String} userId - User ID
     * @param {String} firmId - Firm ID (optional)
     * @returns {Promise<Number>} Maximum sessions allowed
     */
    async getSessionLimit(userId, firmId = null) {
        try {
            // If no firmId provided, try to get from user sessions
            if (!firmId) {
                const session = await Session.findOne({ userId }).select('firmId');
                firmId = session?.firmId;
            }

            // If still no firmId, return default
            if (!firmId) {
                return 5; // Default limit
            }

            // Get firm's session limit
            const firm = await Firm.findById(firmId).select('enterpriseSettings.maxSessionsPerUser');
            const limit = firm?.enterpriseSettings?.maxSessionsPerUser;

            return limit && limit > 0 ? limit : 5; // Default to 5 if not set
        } catch (error) {
            console.error('SessionManager.getSessionLimit failed:', error.message);
            return 5; // Default limit
        }
    }

    /**
     * Clean up expired sessions
     * @returns {Promise<Number>} Count of cleaned up sessions
     */
    async cleanupExpired() {
        try {
            return await Session.cleanupExpired();
        } catch (error) {
            console.error('SessionManager.cleanupExpired failed:', error.message);
            return 0;
        }
    }

    /**
     * Get sessions by IP address (for security monitoring)
     * @param {String} ipAddress - IP address
     * @param {Number} limit - Maximum results
     * @returns {Promise<Array>} Sessions from that IP
     */
    async getSessionsByIP(ipAddress, limit = 100) {
        try {
            return await Session.getSessionsByIP(ipAddress, limit);
        } catch (error) {
            console.error('SessionManager.getSessionsByIP failed:', error.message);
            return [];
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE HELPER METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Determine device type from parsed UA
     * @private
     */
    _getDeviceType(ua) {
        if (ua.device?.type === 'mobile') return 'mobile';
        if (ua.device?.type === 'tablet') return 'tablet';
        if (ua.device?.type === 'console') return 'console';
        if (ua.device?.type === 'tv') return 'tv';
        return 'desktop';
    }

    /**
     * Send notification for new device login
     * @private
     */
    async _notifyNewDevice(userId, deviceInfo, locationInfo, sessionId) {
        try {
            const deviceDesc = `${deviceInfo.browser} on ${deviceInfo.os}`;
            const locationDesc = locationInfo.city
                ? `${locationInfo.city}, ${locationInfo.country}`
                : locationInfo.country || 'Unknown location';

            await Notification.createNotification({
                userId,
                type: 'alert',
                title: 'New Device Login',
                titleAr: 'تسجيل دخول من جهاز جديد',
                message: `New login detected from ${deviceDesc} at ${locationDesc}. If this wasn't you, please secure your account immediately.`,
                messageAr: `تم اكتشاف تسجيل دخول جديد من ${deviceDesc} في ${locationDesc}. إذا لم يكن هذا أنت، يرجى تأمين حسابك فوراً.`,
                priority: 'high',
                channels: ['in_app', 'email'],
                actionRequired: true,
                actionUrl: '/settings/security',
                actionLabel: 'Review Sessions',
                actionLabelAr: 'مراجعة الجلسات',
                data: {
                    sessionId: sessionId.toString(),
                    deviceInfo,
                    locationInfo
                }
            });
        } catch (error) {
            console.error('Failed to create new device notification:', error.message);
        }
    }

    /**
     * Send notification when session is terminated
     * @private
     */
    async _notifySessionTerminated(userId, session, reason) {
        try {
            // Only notify for security-related terminations
            if (!['security', 'admin_terminated'].includes(reason)) {
                return;
            }

            const deviceDesc = `${session.deviceInfo.browser} on ${session.deviceInfo.os}`;
            const reasonText = reason === 'security' ? 'security reasons' : 'administrator action';
            const reasonTextAr = reason === 'security' ? 'أسباب أمنية' : 'إجراء من المسؤول';

            await Notification.createNotification({
                userId,
                type: 'alert',
                title: 'Session Terminated',
                titleAr: 'تم إنهاء الجلسة',
                message: `Your session on ${deviceDesc} was terminated due to ${reasonText}.`,
                messageAr: `تم إنهاء جلستك على ${deviceDesc} بسبب ${reasonTextAr}.`,
                priority: 'high',
                channels: ['in_app', 'email'],
                data: {
                    sessionId: session._id.toString(),
                    reason,
                    terminatedAt: session.terminatedAt
                }
            });
        } catch (error) {
            console.error('Failed to create session termination notification:', error.message);
        }
    }

    /**
     * Send notification for bulk session termination
     * @private
     */
    async _notifyBulkTermination(userId, count, reason) {
        try {
            // Only notify for user-initiated bulk terminations
            if (reason !== 'user_terminated') {
                return;
            }

            await Notification.createNotification({
                userId,
                type: 'system',
                title: 'Sessions Terminated',
                titleAr: 'تم إنهاء الجلسات',
                message: `${count} session(s) have been terminated as requested.`,
                messageAr: `تم إنهاء ${count} جلسة كما طلبت.`,
                priority: 'normal',
                channels: ['in_app'],
                data: {
                    count,
                    reason
                }
            });
        } catch (error) {
            console.error('Failed to create bulk termination notification:', error.message);
        }
    }
}

// Export singleton instance
module.exports = new SessionManagerService();
