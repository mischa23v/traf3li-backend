/**
 * Analytics Service - Event-based Analytics System
 *
 * Comprehensive analytics service for tracking user interactions, feature usage,
 * and system events. Provides both real-time event tracking and advanced analytics queries.
 *
 * Features:
 * - Event tracking (page views, feature usage, actions, errors)
 * - User engagement metrics (DAU, WAU, MAU)
 * - Feature adoption analytics
 * - Funnel analysis
 * - Retention cohorts
 * - User journey tracking
 * - Performance metrics
 */

const mongoose = require('mongoose');
const AnalyticsEvent = require('../models/analyticsEvent.model');
const logger = require('../utils/logger');

/**
 * Event types
 */
const EventTypes = {
    PAGE_VIEW: 'page_view',
    FEATURE_USED: 'feature_used',
    ACTION_COMPLETED: 'action_completed',
    ERROR: 'error',
    API_CALL: 'api_call',
    SEARCH: 'search',
    FORM_SUBMIT: 'form_submit',
    LOGIN: 'login',
    LOGOUT: 'logout',
    SIGNUP: 'signup',
    USER_ACTION: 'user_action',
    CUSTOM: 'custom'
};

class AnalyticsService {
    // ═══════════════════════════════════════════════════════════════
    // EVENT TRACKING METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Track a generic event
     * @param {String} eventType - Type of event
     * @param {String} eventName - Specific event name
     * @param {String} userId - User ID
     * @param {String} firmId - Firm ID
     * @param {Object} properties - Event-specific properties
     * @param {Object} metadata - Context metadata
     * @returns {Promise<Object>} - Created event
     */
    static async trackEvent(eventType, eventName, userId = null, firmId = null, properties = {}, metadata = {}) {
        try {
            const event = await AnalyticsEvent.create({
                eventType,
                eventName,
                userId: userId ? new mongoose.Types.ObjectId(userId) : null,
                firmId: firmId ? new mongoose.Types.ObjectId(firmId) : null,
                sessionId: metadata.sessionId || null,
                properties,
                metadata: {
                    page: metadata.page,
                    referrer: metadata.referrer,
                    url: metadata.url,
                    device: metadata.device,
                    browser: metadata.browser,
                    os: metadata.os,
                    userAgent: metadata.userAgent,
                    ip: metadata.ip,
                    country: metadata.country,
                    city: metadata.city,
                    method: metadata.method,
                    statusCode: metadata.statusCode,
                    endpoint: metadata.endpoint,
                    custom: metadata.custom
                },
                timestamp: new Date(),
                duration: properties.duration || null
            });

            logger.debug('Analytics event tracked', {
                eventType,
                eventName,
                userId,
                firmId
            });

            return event;
        } catch (error) {
            logger.error('AnalyticsService.trackEvent failed:', error.message);
            return null;
        }
    }

    /**
     * Track page view
     * @param {String} page - Page path
     * @param {String} userId - User ID
     * @param {String} firmId - Firm ID
     * @param {Object} metadata - Context metadata
     * @returns {Promise<Object>} - Created event
     */
    static async trackPageView(page, userId = null, firmId = null, metadata = {}) {
        return this.trackEvent(
            EventTypes.PAGE_VIEW,
            page,
            userId,
            firmId,
            { page },
            { ...metadata, page }
        );
    }

    /**
     * Track feature usage
     * @param {String} featureName - Feature name
     * @param {String} userId - User ID
     * @param {String} firmId - Firm ID
     * @param {Object} properties - Additional properties
     * @returns {Promise<Object>} - Created event
     */
    static async trackFeatureUsage(featureName, userId = null, firmId = null, properties = {}) {
        return this.trackEvent(
            EventTypes.FEATURE_USED,
            featureName,
            userId,
            firmId,
            properties,
            {}
        );
    }

    /**
     * Track action completed
     * @param {String} actionName - Action name
     * @param {String} userId - User ID
     * @param {String} firmId - Firm ID
     * @param {Number} duration - Action duration in ms
     * @param {Object} properties - Additional properties
     * @returns {Promise<Object>} - Created event
     */
    static async trackActionCompleted(actionName, userId = null, firmId = null, duration = null, properties = {}) {
        return this.trackEvent(
            EventTypes.ACTION_COMPLETED,
            actionName,
            userId,
            firmId,
            { ...properties, duration },
            {}
        );
    }

    /**
     * Track error
     * @param {String} errorType - Error type
     * @param {String} errorMessage - Error message
     * @param {String} userId - User ID
     * @param {String} firmId - Firm ID
     * @param {Object} context - Error context
     * @returns {Promise<Object>} - Created event
     */
    static async trackError(errorType, errorMessage, userId = null, firmId = null, context = {}) {
        return this.trackEvent(
            EventTypes.ERROR,
            errorType,
            userId,
            firmId,
            {
                errorType,
                errorMessage,
                stack: context.stack,
                ...context
            },
            {}
        );
    }

    /**
     * Track API call
     * @param {String} endpoint - API endpoint
     * @param {String} method - HTTP method
     * @param {Number} statusCode - Response status code
     * @param {Number} duration - Request duration in ms
     * @param {Object} req - Express request object (optional)
     * @returns {Promise<Object>} - Created event
     */
    static async trackApiCall(endpoint, method, statusCode, duration, req = null) {
        const userId = req?.userID || req?.userId || null;
        const firmId = req?.firmId || null;

        return this.trackEvent(
            EventTypes.API_CALL,
            `${method} ${endpoint}`,
            userId,
            firmId,
            {
                endpoint,
                method,
                statusCode,
                duration
            },
            {
                endpoint,
                method,
                statusCode,
                userAgent: req?.headers?.['user-agent'],
                ip: req?.ip || req?.connection?.remoteAddress
            }
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // ANALYTICS QUERY METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get event counts
     * @param {String} firmId - Firm ID
     * @param {String} eventType - Event type filter
     * @param {Object} dateRange - Date range {start, end}
     * @returns {Promise<Object>} - Event counts
     */
    static async getEventCounts(firmId, eventType = null, dateRange = {}) {
        try {
            const { start, end } = this._parseDateRange(dateRange);

            const matchQuery = {
                firmId: new mongoose.Types.ObjectId(firmId),
                timestamp: { $gte: start, $lte: end }
            };

            if (eventType) {
                matchQuery.eventType = eventType;
            }

            const counts = await AnalyticsEvent.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: '$eventType',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ]);

            const total = counts.reduce((sum, item) => sum + item.count, 0);

            return {
                total,
                byType: counts.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {})
            };
        } catch (error) {
            logger.error('AnalyticsService.getEventCounts failed:', error.message);
            return { total: 0, byType: {} };
        }
    }

    /**
     * Get feature usage statistics
     * @param {String} firmId - Firm ID
     * @param {Object} dateRange - Date range {start, end}
     * @returns {Promise<Array>} - Feature usage stats
     */
    static async getFeatureUsageStats(firmId, dateRange = {}) {
        try {
            const { start, end } = this._parseDateRange(dateRange);

            const stats = await AnalyticsEvent.aggregate([
                {
                    $match: {
                        firmId: new mongoose.Types.ObjectId(firmId),
                        eventType: EventTypes.FEATURE_USED,
                        timestamp: { $gte: start, $lte: end }
                    }
                },
                {
                    $group: {
                        _id: '$eventName',
                        usageCount: { $sum: 1 },
                        uniqueUsers: { $addToSet: '$userId' },
                        firstUsed: { $min: '$timestamp' },
                        lastUsed: { $max: '$timestamp' }
                    }
                },
                {
                    $project: {
                        featureName: '$_id',
                        usageCount: 1,
                        uniqueUserCount: { $size: '$uniqueUsers' },
                        firstUsed: 1,
                        lastUsed: 1
                    }
                },
                { $sort: { usageCount: -1 } }
            ]);

            return stats;
        } catch (error) {
            logger.error('AnalyticsService.getFeatureUsageStats failed:', error.message);
            return [];
        }
    }

    /**
     * Get user engagement metrics (DAU, WAU, MAU)
     * @param {String} firmId - Firm ID
     * @param {Object} dateRange - Date range {start, end}
     * @returns {Promise<Object>} - Engagement metrics
     */
    static async getUserEngagementMetrics(firmId, dateRange = {}) {
        try {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            const monthAgo = new Date(today);
            monthAgo.setDate(monthAgo.getDate() - 30);

            const [dau, wau, mau] = await Promise.all([
                AnalyticsEvent.getUniqueUsersCount(firmId, today, now),
                AnalyticsEvent.getUniqueUsersCount(firmId, weekAgo, now),
                AnalyticsEvent.getUniqueUsersCount(firmId, monthAgo, now)
            ]);

            return {
                dau,
                wau,
                mau,
                dauWauRatio: wau > 0 ? (dau / wau * 100).toFixed(2) : 0,
                wauMauRatio: mau > 0 ? (wau / mau * 100).toFixed(2) : 0
            };
        } catch (error) {
            logger.error('AnalyticsService.getUserEngagementMetrics failed:', error.message);
            return { dau: 0, wau: 0, mau: 0, dauWauRatio: 0, wauMauRatio: 0 };
        }
    }

    /**
     * Get funnel analysis
     * @param {String} firmId - Firm ID
     * @param {Array} funnelSteps - Array of step event names
     * @param {Object} dateRange - Date range {start, end}
     * @returns {Promise<Object>} - Funnel analysis
     */
    static async getFunnelAnalysis(firmId, funnelSteps = [], dateRange = {}) {
        try {
            const { start, end } = this._parseDateRange(dateRange);

            const results = [];
            let previousCount = 0;

            for (let i = 0; i < funnelSteps.length; i++) {
                const stepName = funnelSteps[i];

                const count = await AnalyticsEvent.countDocuments({
                    firmId: new mongoose.Types.ObjectId(firmId),
                    eventName: stepName,
                    timestamp: { $gte: start, $lte: end }
                });

                const conversionRate = i > 0 && previousCount > 0
                    ? ((count / previousCount) * 100).toFixed(2)
                    : 100;

                results.push({
                    step: i + 1,
                    stepName,
                    count,
                    conversionRate: parseFloat(conversionRate),
                    dropoff: i > 0 ? previousCount - count : 0
                });

                previousCount = count;
            }

            return {
                steps: results,
                overallConversion: results.length > 0 && results[0].count > 0
                    ? ((results[results.length - 1].count / results[0].count) * 100).toFixed(2)
                    : 0
            };
        } catch (error) {
            logger.error('AnalyticsService.getFunnelAnalysis failed:', error.message);
            return { steps: [], overallConversion: 0 };
        }
    }

    /**
     * Get retention cohorts
     * @param {String} firmId - Firm ID
     * @param {Object} dateRange - Date range {start, end}
     * @returns {Promise<Array>} - Retention cohorts
     */
    static async getRetentionCohorts(firmId, dateRange = {}) {
        try {
            const { start, end } = this._parseDateRange(dateRange);

            // Get users grouped by signup week
            const cohorts = await AnalyticsEvent.aggregate([
                {
                    $match: {
                        firmId: new mongoose.Types.ObjectId(firmId),
                        eventType: EventTypes.SIGNUP,
                        timestamp: { $gte: start, $lte: end }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$timestamp' },
                            week: { $week: '$timestamp' }
                        },
                        users: { $addToSet: '$userId' },
                        signupDate: { $min: '$timestamp' }
                    }
                },
                { $sort: { signupDate: 1 } }
            ]);

            // Calculate retention for each cohort
            const retentionData = [];
            for (const cohort of cohorts) {
                const cohortStart = cohort.signupDate;
                const cohortUsers = cohort.users;

                // Check activity in subsequent weeks
                const weeks = [];
                for (let week = 0; week < 12; week++) {
                    const weekStart = new Date(cohortStart);
                    weekStart.setDate(weekStart.getDate() + (week * 7));
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekEnd.getDate() + 7);

                    const activeUsers = await AnalyticsEvent.distinct('userId', {
                        firmId: new mongoose.Types.ObjectId(firmId),
                        userId: { $in: cohortUsers },
                        timestamp: { $gte: weekStart, $lte: weekEnd }
                    });

                    const retention = cohortUsers.length > 0
                        ? ((activeUsers.length / cohortUsers.length) * 100).toFixed(2)
                        : 0;

                    weeks.push({
                        week,
                        activeUsers: activeUsers.length,
                        retention: parseFloat(retention)
                    });
                }

                retentionData.push({
                    cohortId: `${cohort._id.year}-W${cohort._id.week}`,
                    signupDate: cohort.signupDate,
                    totalUsers: cohortUsers.length,
                    weeks
                });
            }

            return retentionData;
        } catch (error) {
            logger.error('AnalyticsService.getRetentionCohorts failed:', error.message);
            return [];
        }
    }

    /**
     * Get user journey (event timeline)
     * SECURITY: Requires firmId for multi-tenant isolation
     * @param {String} firmId - Firm ID (required for isolation)
     * @param {String} userId - User ID
     * @param {Object} dateRange - Date range {start, end}
     * @returns {Promise<Array>} - User's event timeline
     */
    static async getUserJourney(firmId, userId, dateRange = {}) {
        try {
            // SECURITY: firmId is required to prevent cross-firm data exposure
            if (!firmId) {
                logger.warn('AnalyticsService.getUserJourney called without firmId');
                return [];
            }

            const { start, end } = this._parseDateRange(dateRange);

            const events = await AnalyticsEvent.find({
                firmId: new mongoose.Types.ObjectId(firmId),
                userId: new mongoose.Types.ObjectId(userId),
                timestamp: { $gte: start, $lte: end }
            })
                .select('eventType eventName timestamp properties metadata')
                .sort({ timestamp: 1 })
                .limit(1000)
                .lean();

            return events;
        } catch (error) {
            logger.error('AnalyticsService.getUserJourney failed:', error.message);
            return [];
        }
    }

    /**
     * Get popular features
     * @param {String} firmId - Firm ID
     * @param {Object} dateRange - Date range {start, end}
     * @param {Number} limit - Limit results
     * @returns {Promise<Array>} - Most used features
     */
    static async getPopularFeatures(firmId, dateRange = {}, limit = 10) {
        try {
            const { start, end } = this._parseDateRange(dateRange);

            const features = await AnalyticsEvent.aggregate([
                {
                    $match: {
                        firmId: new mongoose.Types.ObjectId(firmId),
                        eventType: EventTypes.FEATURE_USED,
                        timestamp: { $gte: start, $lte: end }
                    }
                },
                {
                    $group: {
                        _id: '$eventName',
                        usageCount: { $sum: 1 },
                        uniqueUsers: { $addToSet: '$userId' }
                    }
                },
                {
                    $project: {
                        featureName: '$_id',
                        usageCount: 1,
                        uniqueUserCount: { $size: '$uniqueUsers' }
                    }
                },
                { $sort: { usageCount: -1 } },
                { $limit: limit }
            ]);

            return features;
        } catch (error) {
            logger.error('AnalyticsService.getPopularFeatures failed:', error.message);
            return [];
        }
    }

    /**
     * Get dropoff points in a workflow
     * @param {String} firmId - Firm ID
     * @param {Array} workflow - Array of step event names
     * @param {Object} dateRange - Date range {start, end}
     * @returns {Promise<Array>} - Dropoff points
     */
    static async getDropoffPoints(firmId, workflow = [], dateRange = {}) {
        try {
            const { start, end } = this._parseDateRange(dateRange);

            const dropoffs = [];

            for (let i = 0; i < workflow.length - 1; i++) {
                const currentStep = workflow[i];
                const nextStep = workflow[i + 1];

                const [currentCount, nextCount] = await Promise.all([
                    AnalyticsEvent.countDocuments({
                        firmId: new mongoose.Types.ObjectId(firmId),
                        eventName: currentStep,
                        timestamp: { $gte: start, $lte: end }
                    }),
                    AnalyticsEvent.countDocuments({
                        firmId: new mongoose.Types.ObjectId(firmId),
                        eventName: nextStep,
                        timestamp: { $gte: start, $lte: end }
                    })
                ]);

                const dropoffCount = currentCount - nextCount;
                const dropoffRate = currentCount > 0
                    ? ((dropoffCount / currentCount) * 100).toFixed(2)
                    : 0;

                dropoffs.push({
                    fromStep: currentStep,
                    toStep: nextStep,
                    startedCount: currentCount,
                    completedCount: nextCount,
                    dropoffCount,
                    dropoffRate: parseFloat(dropoffRate)
                });
            }

            return dropoffs;
        } catch (error) {
            logger.error('AnalyticsService.getDropoffPoints failed:', error.message);
            return [];
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Parse date range
     * @private
     * @param {Object} dateRange - Date range object
     * @returns {Object} - Parsed start and end dates
     */
    static _parseDateRange(dateRange = {}) {
        const now = new Date();
        const defaultStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);

        return {
            start: dateRange.start ? new Date(dateRange.start) : defaultStart,
            end: dateRange.end ? new Date(dateRange.end) : now
        };
    }

    /**
     * Get analytics summary for dashboard
     * @param {String} firmId - Firm ID
     * @param {Object} dateRange - Date range {start, end}
     * @returns {Promise<Object>} - Analytics summary
     */
    static async getAnalyticsSummary(firmId, dateRange = {}) {
        try {
            const [
                eventCounts,
                featureUsage,
                engagement,
                popularFeatures
            ] = await Promise.all([
                this.getEventCounts(firmId, null, dateRange),
                this.getFeatureUsageStats(firmId, dateRange),
                this.getUserEngagementMetrics(firmId, dateRange),
                this.getPopularFeatures(firmId, dateRange, 5)
            ]);

            return {
                eventCounts,
                featureUsage: featureUsage.slice(0, 10),
                engagement,
                popularFeatures
            };
        } catch (error) {
            logger.error('AnalyticsService.getAnalyticsSummary failed:', error.message);
            return null;
        }
    }
}

module.exports = AnalyticsService;
module.exports.EventTypes = EventTypes;
