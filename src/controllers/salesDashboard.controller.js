/**
 * Sales Dashboard Controller
 *
 * Enterprise-grade sales dashboard with tiered views (Basic/Advanced)
 * Like Finance module - user CHOOSES their view complexity
 *
 * Backend does 90% of work - frontend just displays
 */

const mongoose = require('mongoose');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// Services
const SalesDashboardService = require('../services/salesDashboard.service');
const SalesReportsService = require('../services/salesReports.service');
const ForecastService = require('../services/forecast.service');
const PipelineMetricsService = require('../services/pipelineMetrics.service');
const QuoteCalculationService = require('../services/quoteCalculation.service');

// Models
const DashboardSettings = require('../models/dashboardSettings.model');

// Allowed fields for date range filtering
const ALLOWED_FILTER_FIELDS = ['startDate', 'endDate', 'period', 'groupBy', 'salesPersonId', 'status'];

/**
 * Helper to get user's view mode for sales module
 */
const getViewMode = async (userId) => {
    try {
        const viewMode = await DashboardSettings.getModuleViewMode(userId, 'sales');
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
 * GET /api/sales-dashboard
 * Get complete sales dashboard based on user's view mode preference
 * Single API call replaces 10+ calls - frontend just displays
 */
const getSalesDashboard = async (request, response) => {
    try {
        const userId = request.userID;
        const firmQuery = request.firmQuery;
        const options = parseDateRange(request.query);

        // Get user's preferred view mode
        const viewMode = await getViewMode(userId);

        let dashboardData;
        if (viewMode === 'advanced') {
            dashboardData = await SalesDashboardService.getAdvancedDashboard(firmQuery, options);
        } else {
            dashboardData = await SalesDashboardService.getBasicDashboard(firmQuery, options);
        }

        return response.json({
            success: true,
            viewMode,
            data: dashboardData
        });
    } catch (error) {
        logger.error('getSalesDashboard ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to fetch sales dashboard'
        });
    }
};

/**
 * GET /api/sales-dashboard/basic
 * Force basic view regardless of user preference
 */
const getBasicDashboard = async (request, response) => {
    try {
        const firmQuery = request.firmQuery;
        const options = parseDateRange(request.query);

        const dashboardData = await SalesDashboardService.getBasicDashboard(firmQuery, options);

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
 * GET /api/sales-dashboard/advanced
 * Force advanced view regardless of user preference
 */
const getAdvancedDashboard = async (request, response) => {
    try {
        const firmQuery = request.firmQuery;
        const options = parseDateRange(request.query);

        const dashboardData = await SalesDashboardService.getAdvancedDashboard(firmQuery, options);

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
 * GET /api/sales-dashboard/hero-stats
 * Get top-level KPIs for sales
 */
const getHeroStats = async (request, response) => {
    try {
        const firmQuery = request.firmQuery;
        const options = parseDateRange(request.query);

        const stats = await SalesDashboardService.getHeroStats(firmQuery, options);

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
// PIPELINE & FORECAST
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/sales-dashboard/pipeline
 * Get pipeline metrics and stage breakdown
 */
const getPipelineMetrics = async (request, response) => {
    try {
        const firmQuery = request.firmQuery;
        const options = parseDateRange(request.query);

        const [stageBreakdown, velocity, health] = await Promise.all([
            PipelineMetricsService.getStageBreakdown(firmQuery, options),
            PipelineMetricsService.getVelocityMetrics(firmQuery, options),
            PipelineMetricsService.getPipelineHealth(firmQuery, options)
        ]);

        return response.json({
            success: true,
            data: {
                stages: stageBreakdown,
                velocity,
                health
            }
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
 * GET /api/sales-dashboard/forecast
 * Get sales forecast with scenarios
 */
const getForecast = async (request, response) => {
    try {
        const firmQuery = request.firmQuery;
        const options = parseDateRange(request.query);

        const [weighted, scenarios, rolling] = await Promise.all([
            ForecastService.getWeightedPipeline(firmQuery, options),
            ForecastService.getScenarioForecasts(firmQuery, options),
            ForecastService.getRollingForecast(firmQuery, options)
        ]);

        return response.json({
            success: true,
            data: {
                weighted,
                scenarios,
                rolling
            }
        });
    } catch (error) {
        logger.error('getForecast ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to fetch forecast'
        });
    }
};

/**
 * GET /api/sales-dashboard/target-progress
 * Get progress toward sales targets
 */
const getTargetProgress = async (request, response) => {
    try {
        const firmQuery = request.firmQuery;
        const options = parseDateRange(request.query);

        // Optional: filter by sales person
        if (request.query.salesPersonId) {
            options.salesPersonId = sanitizeObjectId(request.query.salesPersonId);
        }

        const progress = await ForecastService.getTargetProgress(firmQuery, options);

        return response.json({
            success: true,
            data: progress
        });
    } catch (error) {
        logger.error('getTargetProgress ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to fetch target progress'
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/sales-dashboard/reports
 * Get all sales reports in one call
 */
const getAllReports = async (request, response) => {
    try {
        const firmQuery = request.firmQuery;
        const options = parseDateRange(request.query);

        const reports = await SalesReportsService.getAllReports(firmQuery, options);

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
 * GET /api/sales-dashboard/reports/summary
 * Get sales summary report
 */
const getSalesSummaryReport = async (request, response) => {
    try {
        const firmQuery = request.firmQuery;
        const options = parseDateRange(request.query);

        const report = await SalesReportsService.getSalesSummaryReport(firmQuery, options);

        return response.json({
            success: true,
            data: report
        });
    } catch (error) {
        logger.error('getSalesSummaryReport ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to fetch sales summary report'
        });
    }
};

/**
 * GET /api/sales-dashboard/reports/revenue
 * Get revenue by period report
 */
const getRevenueReport = async (request, response) => {
    try {
        const firmQuery = request.firmQuery;
        const options = parseDateRange(request.query);

        const report = await SalesReportsService.getRevenueByPeriodReport(firmQuery, options);

        return response.json({
            success: true,
            data: report
        });
    } catch (error) {
        logger.error('getRevenueReport ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to fetch revenue report'
        });
    }
};

/**
 * GET /api/sales-dashboard/reports/by-rep
 * Get sales by rep report
 */
const getSalesByRepReport = async (request, response) => {
    try {
        const firmQuery = request.firmQuery;
        const options = parseDateRange(request.query);

        const report = await SalesReportsService.getSalesByRepReport(firmQuery, options);

        return response.json({
            success: true,
            data: report
        });
    } catch (error) {
        logger.error('getSalesByRepReport ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to fetch sales by rep report'
        });
    }
};

/**
 * GET /api/sales-dashboard/reports/quotations
 * Get quotation analysis report
 */
const getQuotationReport = async (request, response) => {
    try {
        const firmQuery = request.firmQuery;
        const options = parseDateRange(request.query);

        const report = await SalesReportsService.getQuotationAnalysisReport(firmQuery, options);

        return response.json({
            success: true,
            data: report
        });
    } catch (error) {
        logger.error('getQuotationReport ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to fetch quotation report'
        });
    }
};

/**
 * GET /api/sales-dashboard/reports/commission
 * Get commission report
 */
const getCommissionReport = async (request, response) => {
    try {
        const firmQuery = request.firmQuery;
        const options = parseDateRange(request.query);

        const report = await SalesReportsService.getCommissionReport(firmQuery, options);

        return response.json({
            success: true,
            data: report
        });
    } catch (error) {
        logger.error('getCommissionReport ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to fetch commission report'
        });
    }
};

/**
 * GET /api/sales-dashboard/reports/products
 * Get product performance report
 */
const getProductReport = async (request, response) => {
    try {
        const firmQuery = request.firmQuery;
        const options = parseDateRange(request.query);

        const report = await SalesReportsService.getProductPerformanceReport(firmQuery, options);

        return response.json({
            success: true,
            data: report
        });
    } catch (error) {
        logger.error('getProductReport ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to fetch product report'
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// QUOTE CALCULATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/sales-dashboard/calculate-quote
 * Calculate quote totals server-side
 */
const calculateQuote = async (request, response) => {
    try {
        const allowedFields = ['items', 'additionalDiscountType', 'additionalDiscountValue',
                              'shippingCost', 'handlingCost', 'otherCharges', 'taxRate',
                              'pricesIncludeTax'];
        const quoteData = pickAllowedFields(request.body, allowedFields);

        if (!quoteData.items || !Array.isArray(quoteData.items)) {
            throw new CustomException('Items array is required', 400);
        }

        const options = {
            taxRate: quoteData.taxRate || 15,
            pricesIncludeTax: quoteData.pricesIncludeTax || false
        };

        const calculated = QuoteCalculationService.calculateQuote(quoteData, options);

        return response.json({
            success: true,
            data: calculated
        });
    } catch (error) {
        logger.error('calculateQuote ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to calculate quote'
        });
    }
};

/**
 * POST /api/sales-dashboard/simulate-discount
 * Simulate discount impact on quote
 */
const simulateDiscount = async (request, response) => {
    try {
        const { items, discountPercent } = request.body;

        if (!items || !Array.isArray(items)) {
            throw new CustomException('Items array is required', 400);
        }

        if (discountPercent === undefined || discountPercent < 0 || discountPercent > 100) {
            throw new CustomException('Valid discountPercent (0-100) is required', 400);
        }

        // Calculate items first
        const calculatedItems = QuoteCalculationService.calculateLineItems(items);
        const simulation = QuoteCalculationService.simulateDiscount(calculatedItems, discountPercent);

        return response.json({
            success: true,
            data: simulation
        });
    } catch (error) {
        logger.error('simulateDiscount ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to simulate discount'
        });
    }
};

/**
 * POST /api/sales-dashboard/suggest-discount
 * Suggest optimal discount for target price
 */
const suggestDiscount = async (request, response) => {
    try {
        const { currentTotal, targetPrice, costTotal, minimumMargin } = request.body;

        if (!currentTotal || !targetPrice) {
            throw new CustomException('currentTotal and targetPrice are required', 400);
        }

        const suggestion = QuoteCalculationService.suggestDiscount(
            currentTotal,
            targetPrice,
            costTotal || 0,
            minimumMargin || 10
        );

        return response.json({
            success: true,
            data: suggestion
        });
    } catch (error) {
        logger.error('suggestDiscount ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to suggest discount'
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// VIEW MODE SETTINGS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/sales-dashboard/settings
 * Get user's sales dashboard settings
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
                viewMode: settings.sales?.viewMode || settings.globalViewMode || 'basic',
                collapsedSections: settings.sales?.collapsedSections || [],
                pinnedWidgets: settings.sales?.pinnedWidgets || [],
                defaultPeriod: settings.sales?.defaultPeriod || 'month',
                preferredChartType: settings.sales?.preferredChartType || 'bar',
                pageSize: settings.sales?.pageSize || 20
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
 * PUT /api/sales-dashboard/settings/view-mode
 * Update user's view mode preference
 */
const updateViewMode = async (request, response) => {
    try {
        const userId = request.userID;
        const { viewMode } = request.body;

        if (!viewMode || !['basic', 'advanced'].includes(viewMode)) {
            throw new CustomException('viewMode must be "basic" or "advanced"', 400);
        }

        const settings = await DashboardSettings.updateModuleViewMode(userId, 'sales', viewMode);

        return response.json({
            success: true,
            message: `View mode updated to ${viewMode}`,
            data: {
                viewMode: settings.sales?.viewMode || viewMode
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
 * PUT /api/sales-dashboard/settings
 * Update sales dashboard settings
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
                        acc[`sales.${key}`] = updates[key];
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
            data: settings.sales
        });
    } catch (error) {
        logger.error('updateSettings ERROR:', error);
        return response.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to update settings'
        });
    }
};

module.exports = {
    // Main dashboard
    getSalesDashboard,
    getBasicDashboard,
    getAdvancedDashboard,

    // Hero stats
    getHeroStats,

    // Pipeline & Forecast
    getPipelineMetrics,
    getForecast,
    getTargetProgress,

    // Reports
    getAllReports,
    getSalesSummaryReport,
    getRevenueReport,
    getSalesByRepReport,
    getQuotationReport,
    getCommissionReport,
    getProductReport,

    // Calculations
    calculateQuote,
    simulateDiscount,
    suggestDiscount,

    // Settings
    getSettings,
    updateViewMode,
    updateSettings
};
