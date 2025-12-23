const HRAnalyticsService = require('../services/hrAnalytics.service');
const HRPredictionsService = require('../services/hrPredictions.service');
const asyncHandler = require('express-async-handler');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const Firm = require('../models/firm.model');

/**
 * HR Analytics Controller
 * Handles all HR analytics and predictions endpoints
 */

/**
 * Verify user has access to the firm (IDOR protection)
 */
const verifyFirmAccess = async (firmId, userId) => {
    if (!firmId) {
        throw new Error('Firm ID is required');
    }

    const sanitizedFirmId = sanitizeObjectId(firmId);
    const sanitizedUserId = sanitizeObjectId(userId);

    const firm = await Firm.findById(sanitizedFirmId);
    if (!firm) {
        throw new Error('Firm not found');
    }

    // Verify user belongs to this firm
    const hasAccess = firm.lawyers?.some(lawyer =>
        lawyer.toString() === sanitizedUserId
    ) || firm.staff?.some(staff =>
        staff.toString() === sanitizedUserId
    );

    if (!hasAccess) {
        throw new Error('Unauthorized access to firm data');
    }

    return sanitizedFirmId;
};

/**
 * Validate and sanitize date range
 */
const validateDateRange = (startDate, endDate) => {
    if (!startDate && !endDate) {
        return { startDate: null, endDate: null };
    }

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start && isNaN(start.getTime())) {
        throw new Error('Invalid start date format');
    }

    if (end && isNaN(end.getTime())) {
        throw new Error('Invalid end date format');
    }

    if (start && end && start > end) {
        throw new Error('Start date must be before end date');
    }

    // Prevent queries beyond reasonable date ranges (e.g., 10 years)
    const maxRangeMs = 10 * 365 * 24 * 60 * 60 * 1000; // 10 years
    if (start && end && (end - start) > maxRangeMs) {
        throw new Error('Date range cannot exceed 10 years');
    }

    return {
        startDate: start ? start.toISOString() : null,
        endDate: end ? end.toISOString() : null
    };
};

/**
 * Validate and sanitize analytics filters
 */
const validateAnalyticsFilters = (query) => {
    const allowedFields = {
        startDate: query.startDate,
        endDate: query.endDate,
        department: query.department,
        status: query.status,
        limit: query.limit,
        months: query.months,
        snapshotType: query.snapshotType,
        format: query.format
    };

    const filters = pickAllowedFields(allowedFields, Object.keys(allowedFields));

    // Validate date range if provided
    if (filters.startDate || filters.endDate) {
        const validatedDates = validateDateRange(filters.startDate, filters.endDate);
        filters.startDate = validatedDates.startDate;
        filters.endDate = validatedDates.endDate;
    }

    // Validate department if provided
    if (filters.department) {
        filters.department = String(filters.department).trim();
        if (filters.department.length > 100) {
            throw new Error('Department name too long');
        }
    }

    // Validate status if provided
    if (filters.status) {
        const validStatuses = ['active', 'inactive', 'terminated', 'on_leave'];
        filters.status = String(filters.status).toLowerCase().trim();
        if (!validStatuses.includes(filters.status)) {
            throw new Error('Invalid status value');
        }
    }

    // Validate numeric fields
    if (filters.limit) {
        filters.limit = parseInt(filters.limit);
        if (isNaN(filters.limit) || filters.limit < 1 || filters.limit > 1000) {
            throw new Error('Limit must be between 1 and 1000');
        }
    }

    if (filters.months) {
        filters.months = parseInt(filters.months);
        if (isNaN(filters.months) || filters.months < 1 || filters.months > 120) {
            throw new Error('Months must be between 1 and 120');
        }
    }

    // Validate snapshot type
    if (filters.snapshotType) {
        const validTypes = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
        filters.snapshotType = String(filters.snapshotType).toLowerCase().trim();
        if (!validTypes.includes(filters.snapshotType)) {
            throw new Error('Invalid snapshot type');
        }
    }

    // Validate export format
    if (filters.format) {
        const validFormats = ['json', 'csv', 'excel', 'pdf'];
        filters.format = String(filters.format).toLowerCase().trim();
        if (!validFormats.includes(filters.format)) {
            throw new Error('Invalid export format');
        }
    }

    return filters;
};

class HRAnalyticsController {
    /**
     * @desc    Get comprehensive dashboard data
     * @route   GET /api/hr-analytics/dashboard
     * @access  Private (HR, Admin)
     */
    static getDashboard = asyncHandler(async (req, res) => {
        const lawyerId = req.userID || req.userId;

        // IDOR Protection: Verify firm access
        const firmId = await verifyFirmAccess(req.firmId, lawyerId);

        // Input validation
        const validatedFilters = validateAnalyticsFilters(req.query);
        const filters = {
            startDate: validatedFilters.startDate,
            endDate: validatedFilters.endDate,
            department: validatedFilters.department,
            status: validatedFilters.status
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
        const lawyerId = req.userID || req.userId;

        // IDOR Protection: Verify firm access
        const firmId = await verifyFirmAccess(req.firmId, lawyerId);

        // Input validation
        const validatedFilters = validateAnalyticsFilters(req.query);
        const filters = {
            department: validatedFilters.department,
            status: validatedFilters.status
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
        const lawyerId = req.userID || req.userId;

        // IDOR Protection: Verify firm access
        const firmId = await verifyFirmAccess(req.firmId, lawyerId);

        // Input validation
        const validatedFilters = validateAnalyticsFilters(req.query);
        const filters = {
            startDate: validatedFilters.startDate,
            endDate: validatedFilters.endDate,
            department: validatedFilters.department
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
        const lawyerId = req.userID || req.userId;

        // IDOR Protection: Verify firm access
        const firmId = await verifyFirmAccess(req.firmId, lawyerId);

        // Input validation
        const validatedFilters = validateAnalyticsFilters(req.query);
        const filters = {
            startDate: validatedFilters.startDate,
            endDate: validatedFilters.endDate,
            department: validatedFilters.department
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
        const lawyerId = req.userID || req.userId;

        // IDOR Protection: Verify firm access
        const firmId = await verifyFirmAccess(req.firmId, lawyerId);

        // Input validation
        const validatedFilters = validateAnalyticsFilters(req.query);
        const filters = {
            startDate: validatedFilters.startDate,
            endDate: validatedFilters.endDate,
            department: validatedFilters.department
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
        const lawyerId = req.userID || req.userId;

        // IDOR Protection: Verify firm access
        const firmId = await verifyFirmAccess(req.firmId, lawyerId);

        // Input validation
        const validatedFilters = validateAnalyticsFilters(req.query);
        const filters = {
            startDate: validatedFilters.startDate,
            endDate: validatedFilters.endDate,
            department: validatedFilters.department
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
        const lawyerId = req.userID || req.userId;

        // IDOR Protection: Verify firm access
        const firmId = await verifyFirmAccess(req.firmId, lawyerId);

        // Input validation
        const validatedFilters = validateAnalyticsFilters(req.query);
        const filters = {
            startDate: validatedFilters.startDate,
            endDate: validatedFilters.endDate,
            department: validatedFilters.department
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
        const lawyerId = req.userID || req.userId;

        // IDOR Protection: Verify firm access
        const firmId = await verifyFirmAccess(req.firmId, lawyerId);

        // Input validation
        const validatedFilters = validateAnalyticsFilters(req.query);
        const filters = {
            department: validatedFilters.department
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
        const lawyerId = req.userID || req.userId;

        // IDOR Protection: Verify firm access
        const firmId = await verifyFirmAccess(req.firmId, lawyerId);

        // Input validation
        const validatedFilters = validateAnalyticsFilters(req.query);
        const filters = {
            startDate: validatedFilters.startDate,
            endDate: validatedFilters.endDate,
            department: validatedFilters.department
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
        const lawyerId = req.userID || req.userId;

        // IDOR Protection: Verify firm access
        const firmId = await verifyFirmAccess(req.firmId, lawyerId);

        // Input validation
        const validatedFilters = validateAnalyticsFilters(req.query);
        const filters = {
            startDate: validatedFilters.startDate,
            endDate: validatedFilters.endDate,
            department: validatedFilters.department
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
        const lawyerId = req.userID || req.userId;

        // IDOR Protection: Verify firm access
        const firmId = await verifyFirmAccess(req.firmId, lawyerId);

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
        const lawyerId = req.userID || req.userId;

        // IDOR Protection: Verify firm access
        const firmId = await verifyFirmAccess(req.firmId, lawyerId);

        // Input validation
        const validatedFilters = validateAnalyticsFilters({ snapshotType: req.body.snapshotType });
        const snapshotType = validatedFilters.snapshotType || 'monthly';

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
        const lawyerId = req.userID || req.userId;

        // IDOR Protection: Verify firm access
        const firmId = await verifyFirmAccess(req.firmId, lawyerId);

        // Input validation
        const validatedFilters = validateAnalyticsFilters(req.query);
        const snapshotType = validatedFilters.snapshotType || 'monthly';
        const limit = validatedFilters.limit || 12;

        const HRAnalyticsSnapshot = require('../models/hrAnalyticsSnapshot.model');

        const trends = await HRAnalyticsSnapshot.getTrend(
            firmId || lawyerId,
            snapshotType,
            limit
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
        const lawyerId = req.userID || req.userId;

        // IDOR Protection: Verify firm access
        const firmId = await verifyFirmAccess(req.firmId, lawyerId);

        // Input validation
        const validatedFilters = validateAnalyticsFilters(req.query);
        const filters = {
            startDate: validatedFilters.startDate,
            endDate: validatedFilters.endDate,
            department: validatedFilters.department
        };

        const dashboard = await HRAnalyticsService.getDashboard(firmId, lawyerId, filters);

        // For now, return JSON. In production, generate Excel/PDF
        res.status(200).json({
            success: true,
            message: 'Export functionality - to be implemented with Excel/PDF generation',
            data: dashboard,
            exportFormat: validatedFilters.format || 'json'
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
        const lawyerId = req.userID || req.userId;

        // IDOR Protection: Verify firm access
        const firmId = await verifyFirmAccess(req.firmId, lawyerId);

        // Input validation
        const validatedFilters = validateAnalyticsFilters(req.query);
        const filters = {
            department: validatedFilters.department
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
        const lawyerId = req.userID || req.userId;

        // IDOR Protection: Verify firm access
        const firmId = await verifyFirmAccess(req.firmId, lawyerId);

        // Sanitize employee ID
        const employeeId = sanitizeObjectId(req.params.employeeId);

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
        const lawyerId = req.userID || req.userId;

        // IDOR Protection: Verify firm access
        const firmId = await verifyFirmAccess(req.firmId, lawyerId);

        // Input validation
        const validatedFilters = validateAnalyticsFilters(req.query);
        const months = validatedFilters.months || 12;

        const forecast = await HRPredictionsService.getWorkforceForecast(
            firmId,
            lawyerId,
            months
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
        const lawyerId = req.userID || req.userId;

        // IDOR Protection: Verify firm access
        const firmId = await verifyFirmAccess(req.firmId, lawyerId);

        // Input validation
        const validatedFilters = validateAnalyticsFilters(req.query);
        const limit = validatedFilters.limit || 20;

        const highPotential = await HRPredictionsService.getHighPotentialEmployees(
            firmId,
            lawyerId,
            limit
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
        const lawyerId = req.userID || req.userId;

        // IDOR Protection: Verify firm access
        const firmId = await verifyFirmAccess(req.firmId, lawyerId);

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
        const lawyerId = req.userID || req.userId;

        // IDOR Protection: Verify firm access
        const firmId = await verifyFirmAccess(req.firmId, lawyerId);

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
        const lawyerId = req.userID || req.userId;

        // IDOR Protection: Verify firm access
        const firmId = await verifyFirmAccess(req.firmId, lawyerId);

        const engagement = await HRPredictionsService.getEngagementPredictions(firmId, lawyerId);

        res.status(200).json({
            success: true,
            data: engagement
        });
    });
}

module.exports = HRAnalyticsController;
