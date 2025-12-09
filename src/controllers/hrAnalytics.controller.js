const HRAnalyticsService = require('../services/hrAnalytics.service');
const HRPredictionsService = require('../services/hrPredictions.service');
const asyncHandler = require('express-async-handler');

/**
 * HR Analytics Controller
 * Handles all HR analytics and predictions endpoints
 */

class HRAnalyticsController {
    /**
     * @desc    Get comprehensive dashboard data
     * @route   GET /api/hr-analytics/dashboard
     * @access  Private (HR, Admin)
     */
    static getDashboard = asyncHandler(async (req, res) => {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;

        const filters = {
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            department: req.query.department,
            status: req.query.status
        };

        const dashboard = await HRAnalyticsService.getDashboard(firmId, lawyerId, filters);

        res.status(200).json({
            success: true,
            data: dashboard
        });
    });

    /**
     * @desc    Get workforce demographics
     * @route   GET /api/hr-analytics/demographics
     * @access  Private (HR, Admin)
     */
    static getDemographics = asyncHandler(async (req, res) => {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;

        const filters = {
            department: req.query.department,
            status: req.query.status
        };

        const demographics = await HRAnalyticsService.getWorkforceDemographics(firmId, lawyerId, filters);

        res.status(200).json({
            success: true,
            data: demographics
        });
    });

    /**
     * @desc    Get turnover analysis
     * @route   GET /api/hr-analytics/turnover
     * @access  Private (HR, Admin)
     */
    static getTurnover = asyncHandler(async (req, res) => {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;

        const filters = {
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            department: req.query.department
        };

        const turnover = await HRAnalyticsService.getTurnoverAnalysis(firmId, lawyerId, filters);

        res.status(200).json({
            success: true,
            data: turnover
        });
    });

    /**
     * @desc    Get absenteeism metrics
     * @route   GET /api/hr-analytics/absenteeism
     * @access  Private (HR, Admin)
     */
    static getAbsenteeism = asyncHandler(async (req, res) => {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;

        const filters = {
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            department: req.query.department
        };

        const absenteeism = await HRAnalyticsService.getAbsenteeismMetrics(firmId, lawyerId, filters);

        res.status(200).json({
            success: true,
            data: absenteeism
        });
    });

    /**
     * @desc    Get attendance analytics
     * @route   GET /api/hr-analytics/attendance
     * @access  Private (HR, Admin)
     */
    static getAttendance = asyncHandler(async (req, res) => {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;

        const filters = {
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            department: req.query.department
        };

        const attendance = await HRAnalyticsService.getAttendanceAnalytics(firmId, lawyerId, filters);

        res.status(200).json({
            success: true,
            data: attendance
        });
    });

    /**
     * @desc    Get performance analytics
     * @route   GET /api/hr-analytics/performance
     * @access  Private (HR, Admin)
     */
    static getPerformance = asyncHandler(async (req, res) => {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;

        const filters = {
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            department: req.query.department
        };

        const performance = await HRAnalyticsService.getPerformanceAnalytics(firmId, lawyerId, filters);

        res.status(200).json({
            success: true,
            data: performance
        });
    });

    /**
     * @desc    Get recruitment analytics
     * @route   GET /api/hr-analytics/recruitment
     * @access  Private (HR, Admin)
     */
    static getRecruitment = asyncHandler(async (req, res) => {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;

        const filters = {
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            department: req.query.department
        };

        const recruitment = await HRAnalyticsService.getRecruitmentAnalytics(firmId, lawyerId, filters);

        res.status(200).json({
            success: true,
            data: recruitment
        });
    });

    /**
     * @desc    Get compensation analytics
     * @route   GET /api/hr-analytics/compensation
     * @access  Private (HR, Admin)
     */
    static getCompensation = asyncHandler(async (req, res) => {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;

        const filters = {
            department: req.query.department
        };

        const compensation = await HRAnalyticsService.getCompensationAnalytics(firmId, lawyerId, filters);

        res.status(200).json({
            success: true,
            data: compensation
        });
    });

    /**
     * @desc    Get training analytics
     * @route   GET /api/hr-analytics/training
     * @access  Private (HR, Admin)
     */
    static getTraining = asyncHandler(async (req, res) => {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;

        const filters = {
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            department: req.query.department
        };

        const training = await HRAnalyticsService.getTrainingAnalytics(firmId, lawyerId, filters);

        res.status(200).json({
            success: true,
            data: training
        });
    });

    /**
     * @desc    Get leave analytics
     * @route   GET /api/hr-analytics/leave
     * @access  Private (HR, Admin)
     */
    static getLeave = asyncHandler(async (req, res) => {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;

        const filters = {
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            department: req.query.department
        };

        const leave = await HRAnalyticsService.getLeaveAnalytics(firmId, lawyerId, filters);

        res.status(200).json({
            success: true,
            data: leave
        });
    });

    /**
     * @desc    Get Saudization compliance
     * @route   GET /api/hr-analytics/saudization
     * @access  Private (HR, Admin)
     */
    static getSaudization = asyncHandler(async (req, res) => {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;

        const saudization = await HRAnalyticsService.getSaudizationCompliance(firmId, lawyerId);

        res.status(200).json({
            success: true,
            data: saudization
        });
    });

    /**
     * @desc    Take analytics snapshot
     * @route   POST /api/hr-analytics/snapshot
     * @access  Private (HR, Admin)
     */
    static takeSnapshot = asyncHandler(async (req, res) => {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const { snapshotType = 'monthly' } = req.body;

        const snapshot = await HRAnalyticsService.takeSnapshot(firmId, lawyerId, snapshotType);

        res.status(201).json({
            success: true,
            message: 'Analytics snapshot created successfully',
            data: snapshot
        });
    });

    /**
     * @desc    Get historical trends
     * @route   GET /api/hr-analytics/trends
     * @access  Private (HR, Admin)
     */
    static getTrends = asyncHandler(async (req, res) => {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const { snapshotType = 'monthly', limit = 12 } = req.query;

        const HRAnalyticsSnapshot = require('../models/hrAnalyticsSnapshot.model');

        const trends = await HRAnalyticsSnapshot.getTrend(
            firmId || lawyerId,
            snapshotType,
            parseInt(limit)
        );

        res.status(200).json({
            success: true,
            data: trends
        });
    });

    /**
     * @desc    Export analytics report
     * @route   GET /api/hr-analytics/export
     * @access  Private (HR, Admin)
     */
    static exportReport = asyncHandler(async (req, res) => {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;

        const filters = {
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            department: req.query.department
        };

        const dashboard = await HRAnalyticsService.getDashboard(firmId, lawyerId, filters);

        // For now, return JSON. In production, generate Excel/PDF
        res.status(200).json({
            success: true,
            message: 'Export functionality - to be implemented with Excel/PDF generation',
            data: dashboard,
            exportFormat: req.query.format || 'json'
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // PREDICTIONS ENDPOINTS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @desc    Get attrition risk scores for all employees
     * @route   GET /api/hr-predictions/attrition
     * @access  Private (HR, Admin)
     */
    static getAttritionRisk = asyncHandler(async (req, res) => {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;

        const filters = {
            department: req.query.department
        };

        const attritionRisk = await HRPredictionsService.getAttritionRiskScores(firmId, lawyerId, filters);

        res.status(200).json({
            success: true,
            data: attritionRisk
        });
    });

    /**
     * @desc    Get attrition risk for specific employee
     * @route   GET /api/hr-predictions/attrition/:employeeId
     * @access  Private (HR, Admin, Manager)
     */
    static getEmployeeAttritionRisk = asyncHandler(async (req, res) => {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const { employeeId } = req.params;

        const attritionRisk = await HRPredictionsService.getEmployeeAttritionRisk(
            firmId,
            lawyerId,
            employeeId
        );

        res.status(200).json({
            success: true,
            data: attritionRisk
        });
    });

    /**
     * @desc    Get workforce forecast
     * @route   GET /api/hr-predictions/workforce
     * @access  Private (HR, Admin)
     */
    static getWorkforceForecast = asyncHandler(async (req, res) => {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const { months = 12 } = req.query;

        const forecast = await HRPredictionsService.getWorkforceForecast(
            firmId,
            lawyerId,
            parseInt(months)
        );

        res.status(200).json({
            success: true,
            data: forecast
        });
    });

    /**
     * @desc    Get high potential employees
     * @route   GET /api/hr-predictions/high-potential
     * @access  Private (HR, Admin)
     */
    static getHighPotential = asyncHandler(async (req, res) => {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const { limit = 20 } = req.query;

        const highPotential = await HRPredictionsService.getHighPotentialEmployees(
            firmId,
            lawyerId,
            parseInt(limit)
        );

        res.status(200).json({
            success: true,
            data: highPotential
        });
    });

    /**
     * @desc    Get flight risk employees
     * @route   GET /api/hr-predictions/flight-risk
     * @access  Private (HR, Admin)
     */
    static getFlightRisk = asyncHandler(async (req, res) => {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;

        const engagement = await HRPredictionsService.getEngagementPredictions(firmId, lawyerId);

        res.status(200).json({
            success: true,
            data: {
                flightRiskEmployees: engagement.flightRiskEmployees,
                summary: engagement.summary
            }
        });
    });

    /**
     * @desc    Get absence predictions
     * @route   GET /api/hr-predictions/absence
     * @access  Private (HR, Admin)
     */
    static getAbsencePredictions = asyncHandler(async (req, res) => {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;

        const absencePredictions = await HRPredictionsService.getAbsencePredictions(firmId, lawyerId);

        res.status(200).json({
            success: true,
            data: absencePredictions
        });
    });

    /**
     * @desc    Get engagement predictions
     * @route   GET /api/hr-predictions/engagement
     * @access  Private (HR, Admin)
     */
    static getEngagementPredictions = asyncHandler(async (req, res) => {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;

        const engagement = await HRPredictionsService.getEngagementPredictions(firmId, lawyerId);

        res.status(200).json({
            success: true,
            data: engagement
        });
    });
}

module.exports = HRAnalyticsController;
