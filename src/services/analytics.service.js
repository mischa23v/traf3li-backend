/**
 * Analytics Service
 *
 * Tracks events for consistency with frontend analytics.
 * Matches the frontend event taxonomy defined in src/lib/analytics.ts
 *
 * Events tracked:
 * - page_view: Page navigation
 * - search: Search queries
 * - form_submit: Form submissions
 * - error: Client-side errors (from frontend)
 * - api_call: API endpoint calls (backend-specific)
 * - user_action: User actions
 */

const logger = require('../utils/logger');

// In-memory event buffer for batch processing
let eventBuffer = [];
const BUFFER_FLUSH_INTERVAL = 30000; // 30 seconds
const MAX_BUFFER_SIZE = 100;

/**
 * Event types matching frontend taxonomy
 */
const EventTypes = {
    PAGE_VIEW: 'page_view',
    SEARCH: 'search',
    FORM_SUBMIT: 'form_submit',
    ERROR: 'error',
    API_CALL: 'api_call',
    USER_ACTION: 'user_action',
    LOGIN: 'login',
    LOGOUT: 'logout',
    SIGNUP: 'signup'
};

/**
 * Analytics Service class
 */
class AnalyticsService {
    /**
     * Track a generic event
     * @param {string} eventType - Type of event (from EventTypes)
     * @param {Object} properties - Event properties
     * @param {Object} context - Request context (req object)
     */
    static track(eventType, properties = {}, context = {}) {
        const event = {
            type: eventType,
            properties,
            context: {
                userId: context.userID || context.userId || null,
                firmId: context.firmId || null,
                requestId: context.id || null,
                userAgent: context.headers?.['user-agent'] || null,
                ip: context.ip || context.headers?.['x-forwarded-for']?.split(',')[0] || null,
                path: context.originalUrl || context.path || null,
                method: context.method || null
            },
            timestamp: new Date().toISOString()
        };

        // Add to buffer
        eventBuffer.push(event);

        // Log event for debugging (in development) or structured logging (in production)
        if (process.env.NODE_ENV !== 'production') {
            logger.debug('Analytics event tracked', { event });
        }

        // Flush if buffer is full
        if (eventBuffer.length >= MAX_BUFFER_SIZE) {
            this.flush();
        }

        return event;
    }

    /**
     * Track page view event (for SSR or API-tracked navigation)
     * @param {string} page - Page path
     * @param {Object} context - Request context
     */
    static trackPageView(page, context = {}) {
        return this.track(EventTypes.PAGE_VIEW, { page }, context);
    }

    /**
     * Track search event
     * @param {string} query - Search query
     * @param {string} searchType - Type of search (clients, cases, tasks, etc.)
     * @param {number} resultsCount - Number of results returned
     * @param {Object} context - Request context
     */
    static trackSearch(query, searchType, resultsCount = 0, context = {}) {
        return this.track(EventTypes.SEARCH, {
            query: query.substring(0, 100), // Truncate for privacy
            searchType,
            resultsCount,
            hasResults: resultsCount > 0
        }, context);
    }

    /**
     * Track form submission event
     * @param {string} formName - Name of the form
     * @param {boolean} success - Whether submission was successful
     * @param {Object} context - Request context
     */
    static trackFormSubmit(formName, success = true, context = {}) {
        return this.track(EventTypes.FORM_SUBMIT, {
            formName,
            success
        }, context);
    }

    /**
     * Track error event
     * @param {Error|string} error - Error object or message
     * @param {string} source - Error source (frontend, backend, api)
     * @param {Object} context - Request context
     */
    static trackError(error, source = 'backend', context = {}) {
        const errorMessage = error instanceof Error ? error.message : error;
        const errorStack = error instanceof Error ? error.stack : null;

        return this.track(EventTypes.ERROR, {
            message: errorMessage,
            source,
            stack: process.env.NODE_ENV !== 'production' ? errorStack : null
        }, context);
    }

    /**
     * Track API call event
     * @param {string} endpoint - API endpoint
     * @param {string} method - HTTP method
     * @param {number} statusCode - Response status code
     * @param {number} duration - Request duration in ms
     * @param {Object} context - Request context
     */
    static trackApiCall(endpoint, method, statusCode, duration, context = {}) {
        return this.track(EventTypes.API_CALL, {
            endpoint,
            method,
            statusCode,
            duration,
            success: statusCode >= 200 && statusCode < 400
        }, context);
    }

    /**
     * Track user action event
     * @param {string} action - Action name
     * @param {string} category - Action category
     * @param {Object} metadata - Additional metadata
     * @param {Object} context - Request context
     */
    static trackUserAction(action, category, metadata = {}, context = {}) {
        return this.track(EventTypes.USER_ACTION, {
            action,
            category,
            ...metadata
        }, context);
    }

    /**
     * Track login event
     * @param {string} method - Login method (email, oauth, etc.)
     * @param {boolean} success - Whether login was successful
     * @param {Object} context - Request context
     */
    static trackLogin(method, success, context = {}) {
        return this.track(EventTypes.LOGIN, {
            method,
            success
        }, context);
    }

    /**
     * Track logout event
     * @param {Object} context - Request context
     */
    static trackLogout(context = {}) {
        return this.track(EventTypes.LOGOUT, {}, context);
    }

    /**
     * Track signup event
     * @param {string} method - Signup method
     * @param {boolean} success - Whether signup was successful
     * @param {Object} context - Request context
     */
    static trackSignup(method, success, context = {}) {
        return this.track(EventTypes.SIGNUP, {
            method,
            success
        }, context);
    }

    /**
     * Flush event buffer
     * Processes buffered events (send to external service, save to DB, etc.)
     */
    static flush() {
        if (eventBuffer.length === 0) return;

        const events = [...eventBuffer];
        eventBuffer = [];

        // Log events summary
        logger.info('Analytics events flushed', {
            count: events.length,
            types: events.reduce((acc, e) => {
                acc[e.type] = (acc[e.type] || 0) + 1;
                return acc;
            }, {})
        });

        // TODO: Send to external analytics service (Google Analytics, Mixpanel, etc.)
        // This is where you would integrate with external services:
        // - Google Analytics Measurement Protocol
        // - Mixpanel
        // - Segment
        // - Custom analytics endpoint

        return events;
    }

    /**
     * Get analytics summary for a time period
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Object} Analytics summary
     */
    static getSummary(startDate, endDate) {
        // This would typically query a database
        // For now, return buffered events summary
        const filteredEvents = eventBuffer.filter(e => {
            const eventDate = new Date(e.timestamp);
            return eventDate >= startDate && eventDate <= endDate;
        });

        return {
            totalEvents: filteredEvents.length,
            byType: filteredEvents.reduce((acc, e) => {
                acc[e.type] = (acc[e.type] || 0) + 1;
                return acc;
            }, {}),
            period: {
                start: startDate.toISOString(),
                end: endDate.toISOString()
            }
        };
    }
}

// Store interval ID for cleanup
let flushIntervalId = null;

// Start periodic flush
const startPeriodicFlush = () => {
    if (!flushIntervalId) {
        flushIntervalId = setInterval(() => {
            AnalyticsService.flush();
        }, BUFFER_FLUSH_INTERVAL);
    }
};

// Stop periodic flush (for graceful shutdown)
const stopPeriodicFlush = () => {
    if (flushIntervalId) {
        clearInterval(flushIntervalId);
        flushIntervalId = null;
        AnalyticsService.flush(); // Final flush
    }
};

// Start the periodic flush
startPeriodicFlush();

// Flush on process exit
process.on('beforeExit', () => {
    stopPeriodicFlush();
});

// Graceful shutdown handlers
process.on('SIGTERM', () => {
    stopPeriodicFlush();
});

process.on('SIGINT', () => {
    stopPeriodicFlush();
});

module.exports = AnalyticsService;
module.exports.EventTypes = EventTypes;
module.exports.stopPeriodicFlush = stopPeriodicFlush;
