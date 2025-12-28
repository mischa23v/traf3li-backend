/**
 * CRM Dashboard Controller
 *
 * Enterprise-grade CRM dashboard with tiered views (Basic/Advanced)
 * Like Finance module - user CHOOSES their view complexity
 *
 * Backend does 90% of work - frontend just displays
 */

const mongoose = require('mongoose');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// Services
const CRMDashboardService = require('../services/crmDashboard.service');
const CRMReportsService = require('../services/crmReports.service');
const LeadScoringService = require('../services/leadScoring.service');
const PipelineMetricsService = require('../services/pipelineMetrics.service');
const ConflictCheckService = require('../services/conflictCheck.service');
const StateMachineService = require('../services/stateMachine.service');

// Models
const DashboardSettings = require('../models/dashboardSettings.model');

// Allowed fields for date range filtering
const ALLOWED_FILTER_FIELDS = ['startDate', 'endDate', 'period', 'groupBy', 'assignedTo', 'source', 'status'];

/**
 * Helper to get user's view mode for CRM module
 */
const getViewMode = async (userId) => {
    try {
        const viewMode = await DashboardSettings.getModuleViewMode(userId, 'crm');
        return viewMode || 'basic';
    } catch (error) {
        logger.warn('Failed to get view mode, defaulting to basic:', error.message);
        return 'basic';
    }
};

/**
 * Helper to parse date range from query
 */
const parseDateRange = (query) => {
    const options = {};

    if (query.startDate) {
        options.startDate = new Date(query.startDate);
        if (isNaN(options.startDate.getTime())) {
            throw new CustomException('Invalid startDate format', 400);
        }
    }

    if (query.endDate) {
        options.endDate = new Date(query.endDate);
        if (isNaN(options.endDate.getTime())) {
            throw new CustomException('Invalid endDate format', 400);
        }
    }

    if (query.period && ['week', 'month', 'quarter', 'year'].includes(query.period)) {
        options.period = query.period;
    }

    if (query.groupBy && ['day', 'week', 'month', 'quarter', 'year'].includes(query.groupBy)) {
        options.groupBy = query.groupBy;
    }

    return options;
};

// ═══════════════════════════════════════════════════════════════
// MAIN DASHBOARD ENDPOINT - SINGLE API CALL
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/crm-dashboard
 * Get complete CRM dashboard based on user's view mode preference
 * Single API call replaces 10+ calls - frontend just displays
 */
const getCRMDashboard = async (request, response) => {
    try {
        const userId = request.userID;
        const firmQuery = request.firmQuery;
        const options = parseDateRange(request.query);

        // Get user's preferred view mode
        const viewMode = await getViewMode(userId);

        let dashboardData;
        if (viewMode === 'advanced') {
            dashboardData = await CRMDashboardService.getAdvancedDashboard(firmQuery, options);
        } else {
            dashboardData = await CRMDashboardService.getBasicDashboard(firmQuery, options);
        }

        return response.json({
            success: true,
            viewMode,
            data: dashboardData
        });
    } catch (error) {
        logger.error('getCRMDashboard ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to fetch CRM dashboard'
        });
    }
};

/**
 * GET /api/crm-dashboard/basic
 * Force basic view regardless of user preference
 */
const getBasicDashboard = async (request, response) => {
    try {
        const firmQuery = request.firmQuery;
        const options = parseDateRange(request.query);

        const dashboardData = await CRMDashboardService.getBasicDashboard(firmQuery, options);

        return response.json({
            success: true,
            viewMode: 'basic',
            data: dashboardData
        });
    } catch (error) {
        logger.error('getBasicDashboard ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to fetch basic dashboard'
        });
    }
};

/**
 * GET /api/crm-dashboard/advanced
 * Force advanced view regardless of user preference
 */
const getAdvancedDashboard = async (request, response) => {
    try {
        const firmQuery = request.firmQuery;
        const options = parseDateRange(request.query);

        const dashboardData = await CRMDashboardService.getAdvancedDashboard(firmQuery, options);

        return response.json({
            success: true,
            viewMode: 'advanced',
            data: dashboardData
        });
    } catch (error) {
        logger.error('getAdvancedDashboard ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to fetch advanced dashboard'
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// HERO STATS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/crm-dashboard/hero-stats
 * Get top-level KPIs for CRM
 */
const getHeroStats = async (request, response) => {
    try {
        const firmQuery = request.firmQuery;
        const options = parseDateRange(request.query);

        const stats = await CRMDashboardService.getHeroStats(firmQuery, options);

        return response.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('getHeroStats ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to fetch hero stats'
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// PIPELINE & LEAD SCORING
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/crm-dashboard/pipeline
 * Get pipeline metrics and stage breakdown
 */
const getPipelineMetrics = async (request, response) => {
    try {
        const firmQuery = request.firmQuery;
        const options = parseDateRange(request.query);

        const pipeline = await CRMDashboardService.getPipelineBreakdown(firmQuery, options);

        return response.json({
            success: true,
            data: pipeline
        });
    } catch (error) {
        logger.error('getPipelineMetrics ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to fetch pipeline metrics'
        });
    }
};

/**
 * GET /api/crm-dashboard/lead-scoring
 * Get lead scoring metrics and distribution
 */
const getLeadScoringMetrics = async (request, response) => {
    try {
        const firmQuery = request.firmQuery;
        const options = parseDateRange(request.query);

        const scoring = await CRMDashboardService.getLeadScoringMetrics(firmQuery, options);

        return response.json({
            success: true,
            data: scoring
        });
    } catch (error) {
        logger.error('getLeadScoringMetrics ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to fetch lead scoring metrics'
        });
    }
};

/**
 * POST /api/crm-dashboard/calculate-score
 * Calculate score for a lead (used before saving)
 */
const calculateLeadScore = async (request, response) => {
    try {
        const allowedFields = ['budget', 'authority', 'need', 'timeline',
                              'engagementScore', 'source', 'industry'];
        const leadData = pickAllowedFields(request.body, allowedFields);

        const score = await LeadScoringService.calculateScore(leadData, request.firmQuery);

        return response.json({
            success: true,
            data: score
        });
    } catch (error) {
        logger.error('calculateLeadScore ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to calculate lead score'
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/crm-dashboard/reports
 * Get all CRM reports in one call
 */
const getAllReports = async (request, response) => {
    try {
        const firmQuery = request.firmQuery;
        const options = parseDateRange(request.query);

        const reports = await CRMReportsService.getAllReports(firmQuery, options);

        return response.json({
            success: true,
            data: reports
        });
    } catch (error) {
        logger.error('getAllReports ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to fetch reports'
        });
    }
};

/**
 * GET /api/crm-dashboard/reports/summary
 * Get CRM summary report
 */
const getCRMSummaryReport = async (request, response) => {
    try {
        const firmQuery = request.firmQuery;
        const options = parseDateRange(request.query);

        const report = await CRMReportsService.getQuickStats(firmQuery, options);

        return response.json({
            success: true,
            data: report
        });
    } catch (error) {
        logger.error('getCRMSummaryReport ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to fetch CRM summary report'
        });
    }
};

/**
 * GET /api/crm-dashboard/reports/funnel
 * Get sales funnel report
 */
const getFunnelReport = async (request, response) => {
    try {
        const firmQuery = request.firmQuery;
        const options = parseDateRange(request.query);

        const report = await CRMReportsService.getFunnelOverview(firmQuery, options);

        return response.json({
            success: true,
            data: report
        });
    } catch (error) {
        logger.error('getFunnelReport ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to fetch funnel report'
        });
    }
};

/**
 * GET /api/crm-dashboard/reports/sources
 * Get leads by source report
 */
const getSourcesReport = async (request, response) => {
    try {
        const firmQuery = request.firmQuery;
        const options = parseDateRange(request.query);

        const report = await CRMReportsService.getLeadsBySourceOverview(firmQuery, options);

        return response.json({
            success: true,
            data: report
        });
    } catch (error) {
        logger.error('getSourcesReport ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to fetch sources report'
        });
    }
};

/**
 * GET /api/crm-dashboard/reports/win-loss
 * Get win/loss analysis report
 */
const getWinLossReport = async (request, response) => {
    try {
        const firmQuery = request.firmQuery;
        const options = parseDateRange(request.query);

        const report = await CRMReportsService.getWinLossOverview(firmQuery, options);

        return response.json({
            success: true,
            data: report
        });
    } catch (error) {
        logger.error('getWinLossReport ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to fetch win/loss report'
        });
    }
};

/**
 * GET /api/crm-dashboard/reports/activities
 * Get activity analytics report
 */
const getActivityReport = async (request, response) => {
    try {
        const firmQuery = request.firmQuery;
        const options = parseDateRange(request.query);

        const report = await CRMReportsService.getActivityOverview(firmQuery, options);

        return response.json({
            success: true,
            data: report
        });
    } catch (error) {
        logger.error('getActivityReport ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to fetch activity report'
        });
    }
};

/**
 * GET /api/crm-dashboard/reports/forecast
 * Get revenue forecast report
 */
const getForecastReport = async (request, response) => {
    try {
        const firmQuery = request.firmQuery;
        const options = parseDateRange(request.query);

        const report = await CRMReportsService.getRevenueForecastOverview(firmQuery, options);

        return response.json({
            success: true,
            data: report
        });
    } catch (error) {
        logger.error('getForecastReport ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to fetch forecast report'
        });
    }
};

/**
 * GET /api/crm-dashboard/reports/aging
 * Get deal aging report
 */
const getAgingReport = async (request, response) => {
    try {
        const firmQuery = request.firmQuery;
        const options = parseDateRange(request.query);

        const report = await CRMReportsService.getDealAgingOverview(firmQuery, options);

        return response.json({
            success: true,
            data: report
        });
    } catch (error) {
        logger.error('getAgingReport ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to fetch aging report'
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// CONFLICT CHECK
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/crm-dashboard/check-conflicts
 * Check for conflicts of interest
 */
const checkConflicts = async (request, response) => {
    try {
        const allowedFields = ['nationalId', 'crNumber', 'phone', 'email',
                              'companyName', 'name', 'excludeId'];
        const checkData = pickAllowedFields(request.body, allowedFields);

        if (!checkData.nationalId && !checkData.crNumber && !checkData.phone &&
            !checkData.email && !checkData.companyName && !checkData.name) {
            throw new CustomException('At least one identifier is required', 400);
        }

        const conflicts = await ConflictCheckService.checkConflicts(checkData, request.firmQuery);

        return response.json({
            success: true,
            data: conflicts
        });
    } catch (error) {
        logger.error('checkConflicts ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to check conflicts'
        });
    }
};

/**
 * POST /api/crm-dashboard/batch-conflict-check
 * Check conflicts for multiple entries
 */
const batchConflictCheck = async (request, response) => {
    try {
        const { entries } = request.body;

        if (!entries || !Array.isArray(entries) || entries.length === 0) {
            throw new CustomException('entries array is required', 400);
        }

        if (entries.length > 100) {
            throw new CustomException('Maximum 100 entries per batch', 400);
        }

        const results = await ConflictCheckService.batchCheck(entries, request.firmQuery);

        return response.json({
            success: true,
            data: results
        });
    } catch (error) {
        logger.error('batchConflictCheck ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to batch check conflicts'
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// STATE TRANSITIONS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/crm-dashboard/lead/:id/transitions
 * Get available transitions for a lead
 */
const getLeadTransitions = async (request, response) => {
    try {
        const leadId = sanitizeObjectId(request.params.id);
        if (!leadId) {
            throw new CustomException('Invalid lead ID', 400);
        }

        const Lead = mongoose.model('Lead');
        const lead = await Lead.findOne({ _id: leadId, ...request.firmQuery }).lean();

        if (!lead) {
            throw new CustomException('Lead not found', 404);
        }

        const transitions = StateMachineService.getAvailableLeadTransitions(lead.status);

        return response.json({
            success: true,
            data: {
                currentStatus: lead.status,
                availableTransitions: transitions
            }
        });
    } catch (error) {
        logger.error('getLeadTransitions ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to get lead transitions'
        });
    }
};

/**
 * POST /api/crm-dashboard/lead/:id/transition
 * Transition a lead to a new status
 */
const transitionLead = async (request, response) => {
    try {
        const leadId = sanitizeObjectId(request.params.id);
        if (!leadId) {
            throw new CustomException('Invalid lead ID', 400);
        }

        const { toStatus, reason, notes } = request.body;
        if (!toStatus) {
            throw new CustomException('toStatus is required', 400);
        }

        const result = await StateMachineService.transitionLead(
            leadId,
            toStatus,
            request.userID,
            request.firmQuery,
            { reason, notes }
        );

        return response.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('transitionLead ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to transition lead'
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// VIEW MODE SETTINGS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/crm-dashboard/settings
 * Get user's CRM dashboard settings
 */
const getSettings = async (request, response) => {
    try {
        const userId = request.userID;
        const firmId = request.firmQuery?.firmId;
        const lawyerId = request.firmQuery?.lawyerId;

        const settings = await DashboardSettings.getOrCreate(userId, firmId, lawyerId);

        return response.json({
            success: true,
            data: {
                viewMode: settings.crm?.viewMode || settings.globalViewMode || 'basic',
                collapsedSections: settings.crm?.collapsedSections || [],
                pinnedWidgets: settings.crm?.pinnedWidgets || [],
                defaultPeriod: settings.crm?.defaultPeriod || 'month',
                preferredChartType: settings.crm?.preferredChartType || 'bar',
                pageSize: settings.crm?.pageSize || 20
            }
        });
    } catch (error) {
        logger.error('getSettings ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to fetch settings'
        });
    }
};

/**
 * PUT /api/crm-dashboard/settings/view-mode
 * Update user's view mode preference
 */
const updateViewMode = async (request, response) => {
    try {
        const userId = request.userID;
        const { viewMode } = request.body;

        if (!viewMode || !['basic', 'advanced'].includes(viewMode)) {
            throw new CustomException('viewMode must be "basic" or "advanced"', 400);
        }

        const settings = await DashboardSettings.updateModuleViewMode(userId, 'crm', viewMode);

        return response.json({
            success: true,
            message: `View mode updated to ${viewMode}`,
            data: {
                viewMode: settings.crm?.viewMode || viewMode
            }
        });
    } catch (error) {
        logger.error('updateViewMode ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to update view mode'
        });
    }
};

/**
 * PUT /api/crm-dashboard/settings
 * Update CRM dashboard settings
 */
const updateSettings = async (request, response) => {
    try {
        const userId = request.userID;
        const allowedFields = ['collapsedSections', 'pinnedWidgets', 'defaultPeriod',
                              'preferredChartType', 'pageSize', 'defaultSort'];
        const updates = pickAllowedFields(request.body, allowedFields);

        const settings = await DashboardSettings.findOneAndUpdate(
            { userId },
            {
                $set: {
                    ...Object.keys(updates).reduce((acc, key) => {
                        acc[`crm.${key}`] = updates[key];
                        return acc;
                    }, {}),
                    lastModifiedAt: new Date()
                },
                $inc: { version: 1 }
            },
            { new: true, upsert: true }
        );

        return response.json({
            success: true,
            message: 'Settings updated',
            data: settings.crm
        });
    } catch (error) {
        logger.error('updateSettings ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to update settings'
        });
    }
};

/**
 * GET /api/crm-dashboard/recent-activity
 * Get recent activity feed
 */
const getRecentActivity = async (request, response) => {
    try {
        const firmQuery = request.firmQuery;
        const limit = Math.min(parseInt(request.query.limit) || 10, 50);

        const activity = await CRMReportsService.getRecentActivity(firmQuery, limit);

        return response.json({
            success: true,
            data: activity
        });
    } catch (error) {
        logger.error('getRecentActivity ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to fetch recent activity'
        });
    }
};

module.exports = {
    // Main dashboard
    getCRMDashboard,
    getBasicDashboard,
    getAdvancedDashboard,

    // Hero stats
    getHeroStats,

    // Pipeline & Lead Scoring
    getPipelineMetrics,
    getLeadScoringMetrics,
    calculateLeadScore,

    // Reports
    getAllReports,
    getCRMSummaryReport,
    getFunnelReport,
    getSourcesReport,
    getWinLossReport,
    getActivityReport,
    getForecastReport,
    getAgingReport,

    // Conflict Check
    checkConflicts,
    batchConflictCheck,

    // State Transitions
    getLeadTransitions,
    transitionLead,

    // Settings
    getSettings,
    updateViewMode,
    updateSettings,

    // Activity
    getRecentActivity
};
