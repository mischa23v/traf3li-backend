/**
 * Session Configuration
 *
 * Centralized configuration for session management including:
 * - Concurrent session limits
 * - Inactivity timeouts
 * - Security policies
 * - Anomaly detection settings
 */

const config = {
    // Maximum concurrent sessions per user
    maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS) || 5,

    // Session inactivity timeout (in milliseconds)
    // Default: 7 days (604800 seconds = 604800000 ms)
    inactivityTimeout: (parseInt(process.env.SESSION_INACTIVITY_TIMEOUT) || 604800) * 1000,

    // Force logout all sessions on password change
    forceLogoutOnPasswordChange: process.env.FORCE_LOGOUT_ON_PASSWORD_CHANGE !== 'false',

    // Send notification on new session/device
    notifyNewSession: process.env.NOTIFY_NEW_SESSION !== 'false',

    // Enable session anomaly detection
    enableAnomalyDetection: process.env.ENABLE_SESSION_ANOMALY_DETECTION !== 'false',

    // Session expiry (in milliseconds)
    // This should match JWT expiration
    // Default: 7 days
    sessionExpiry: 7 * 24 * 60 * 60 * 1000,

    // Anomaly detection thresholds
    anomalyDetection: {
        // Flag IP changes as suspicious
        detectIPChanges: true,

        // Flag user agent changes as suspicious
        detectUserAgentChanges: true,

        // Flag impossible travel (login from different locations too quickly)
        detectImpossibleTravel: true,

        // Minimum time between logins from different countries (in hours)
        // Used to detect impossible travel
        impossibleTravelThresholdHours: 2,

        // Maximum allowed distance for same-country logins (in km)
        // Used to detect unusual location changes
        maxLocationChangeKm: 500
    },

    // Session cleanup settings
    cleanup: {
        // How often to run cleanup job (in milliseconds)
        // Default: every 6 hours
        interval: 6 * 60 * 60 * 1000,

        // Delete expired sessions after this many days
        // TTL index handles deletion, but this is for manual cleanup
        deleteAfterDays: 30
    }
};

module.exports = config;
