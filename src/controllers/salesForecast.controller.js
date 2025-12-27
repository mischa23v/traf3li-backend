/**
 * SalesForecast Controller
 *
 * Handles sales forecasting operations with multi-tenant isolation.
 * Security: All operations enforce firm-level access control via req.firmQuery
 */

const { SalesForecast } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Create a new sales forecast
 * POST /api/sales-forecasts
 */
const createForecast = asyncHandler(async (req, res) => {
    // Block departed users
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const lawyerId = req.userID;
    const firmId = req.firmId;

    // MASS ASSIGNMENT PROTECTION: Only allow specific fields
    const allowedFields = [
        'name', 'nameAr',
        'periodType', 'periodStart', 'periodEnd', 'fiscalYear', 'fiscalQuarter',
        'scopeType', 'salesTeamId', 'territoryId', 'userId',
        'quota', 'currency',
        'pipeline', 'bestCase', 'commit', 'closedWon',
        'notes'
    ];

    // Extract only allowed fields from request body
    const safeForecastData = pickAllowedFields(req.body, allowedFields);

    // INPUT VALIDATION: Validate required fields
    if (!safeForecastData.name || typeof safeForecastData.name !== 'string') {
        throw CustomException('Forecast name is required', 400);
    }

    if (!safeForecastData.periodType) {
        throw CustomException('Period type is required', 400);
    }

    if (!safeForecastData.periodStart) {
        throw CustomException('Period start date is required', 400);
    }

    if (!safeForecastData.periodEnd) {
        throw CustomException('Period end date is required', 400);
    }

    // Validate period dates
    const periodStart = new Date(safeForecastData.periodStart);
    const periodEnd = new Date(safeForecastData.periodEnd);

    if (periodStart >= periodEnd) {
        throw CustomException('Period end date must be after start date', 400);
    }

    // INPUT VALIDATION: Sanitize ObjectId references
    if (safeForecastData.salesTeamId) {
        safeForecastData.salesTeamId = sanitizeObjectId(safeForecastData.salesTeamId);
    }
    if (safeForecastData.territoryId) {
        safeForecastData.territoryId = sanitizeObjectId(safeForecastData.territoryId);
    }
    if (safeForecastData.userId) {
        safeForecastData.userId = sanitizeObjectId(safeForecastData.userId);
    }

    // Ensure these system fields are not overridable (IDOR protection)
    const forecastData = {
        ...safeForecastData,
        firmId,
        lawyerId,
        createdBy: lawyerId
    };

    const forecast = await SalesForecast.create(forecastData);

    // Fetch with population for response
    const populated = await SalesForecast.findOne({ _id: forecast._id, firmId })
        .populate('salesTeamId', 'name')
        .populate('territoryId', 'name')
        .populate('userId', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName');

    res.status(201).json({
        success: true,
        message: 'Sales forecast created successfully',
        data: populated
    });
});

/**
 * Get all forecasts with filters
 * GET /api/sales-forecasts
 */
const getForecasts = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const {
        status, periodType, scopeType, fiscalYear, fiscalQuarter,
        salesTeamId, territoryId, userId, search,
        periodStart, periodEnd,
        page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;

    const parsedLimit = Math.min(parseInt(limit) || 20, 100);
    const parsedPage = parseInt(page) || 1;

    const filters = {
        status,
        periodType,
        scopeType,
        fiscalYear: fiscalYear ? parseInt(fiscalYear) : undefined,
        fiscalQuarter: fiscalQuarter ? parseInt(fiscalQuarter) : undefined,
        salesTeamId: salesTeamId ? sanitizeObjectId(salesTeamId) : undefined,
        territoryId: territoryId ? sanitizeObjectId(territoryId) : undefined,
        userId: userId ? sanitizeObjectId(userId) : undefined,
        periodStart,
        periodEnd,
        sortBy,
        sortOrder,
        limit: parsedLimit,
        skip: (parsedPage - 1) * parsedLimit
    };

    const forecasts = await SalesForecast.getForecasts(firmId, filters);

    // Build count query
    const countQuery = { firmId };
    if (status) countQuery.status = status;
    if (periodType) countQuery.periodType = periodType;
    if (scopeType) countQuery.scopeType = scopeType;
    if (fiscalYear) countQuery.fiscalYear = parseInt(fiscalYear);
    if (fiscalQuarter) countQuery.fiscalQuarter = parseInt(fiscalQuarter);
    if (salesTeamId) countQuery.salesTeamId = sanitizeObjectId(salesTeamId);
    if (territoryId) countQuery.territoryId = sanitizeObjectId(territoryId);
    if (userId) countQuery.userId = sanitizeObjectId(userId);

    // Search filter (if provided)
    if (search) {
        countQuery.$or = [
            { name: { $regex: escapeRegex(search), $options: 'i' } },
            { nameAr: { $regex: escapeRegex(search), $options: 'i' } },
            { forecastId: { $regex: escapeRegex(search), $options: 'i' } }
        ];
    }

    const total = await SalesForecast.countDocuments(countQuery);

    res.json({
        success: true,
        data: forecasts,
        pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total,
            totalPages: Math.ceil(total / parsedLimit)
        }
    });
});

/**
 * Get single forecast by ID
 * GET /api/sales-forecasts/:id
 */
const getForecastById = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const firmId = req.firmId;

    // INPUT VALIDATION: Sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid forecast ID', 400);
    }

    // IDOR PROTECTION: Query includes firmId
    const forecast = await SalesForecast.getForecastById(sanitizedId, firmId);

    if (!forecast) {
        throw CustomException('Sales forecast not found', 404);
    }

    res.json({
        success: true,
        data: forecast
    });
});

/**
 * Update forecast
 * PUT /api/sales-forecasts/:id
 */
const updateForecast = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const firmId = req.firmId;
    const lawyerId = req.userID;

    // INPUT VALIDATION: Sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid forecast ID', 400);
    }

    // IDOR PROTECTION: Verify forecast belongs to user's firm
    const forecast = await SalesForecast.findOne({ _id: sanitizedId, firmId });

    if (!forecast) {
        throw CustomException('Sales forecast not found', 404);
    }

    // Check if forecast is locked
    if (forecast.status === 'locked') {
        throw CustomException('Cannot update locked forecast', 403);
    }

    // MASS ASSIGNMENT PROTECTION: Only allow specific fields
    const allowedFields = [
        'name', 'nameAr',
        'periodType', 'periodStart', 'periodEnd', 'fiscalYear', 'fiscalQuarter',
        'scopeType', 'salesTeamId', 'territoryId', 'userId',
        'quota', 'currency',
        'pipeline', 'bestCase', 'commit', 'closedWon',
        'notes'
    ];

    // Extract only allowed fields from request body
    const safeUpdateData = pickAllowedFields(req.body, allowedFields);

    // INPUT VALIDATION: Sanitize ObjectId references
    if (safeUpdateData.salesTeamId) {
        safeUpdateData.salesTeamId = sanitizeObjectId(safeUpdateData.salesTeamId);
    }
    if (safeUpdateData.territoryId) {
        safeUpdateData.territoryId = sanitizeObjectId(safeUpdateData.territoryId);
    }
    if (safeUpdateData.userId) {
        safeUpdateData.userId = sanitizeObjectId(safeUpdateData.userId);
    }

    // Validate period dates if provided
    if (safeUpdateData.periodStart && safeUpdateData.periodEnd) {
        const periodStart = new Date(safeUpdateData.periodStart);
        const periodEnd = new Date(safeUpdateData.periodEnd);

        if (periodStart >= periodEnd) {
            throw CustomException('Period end date must be after start date', 400);
        }
    }

    // Apply safe updates to forecast
    Object.keys(safeUpdateData).forEach(field => {
        forecast[field] = safeUpdateData[field];
    });

    // Ensure these system fields are not modifiable (IDOR protection)
    forecast.updatedBy = lawyerId;

    await forecast.save();

    // Fetch with population for response
    const populated = await SalesForecast.findOne({ _id: forecast._id, firmId })
        .populate('salesTeamId', 'name')
        .populate('territoryId', 'name')
        .populate('userId', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName');

    res.json({
        success: true,
        message: 'Sales forecast updated successfully',
        data: populated
    });
});

/**
 * Delete forecast
 * DELETE /api/sales-forecasts/:id
 */
const deleteForecast = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const firmId = req.firmId;

    // INPUT VALIDATION: Sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid forecast ID', 400);
    }

    // IDOR PROTECTION: Query includes firmId
    const forecast = await SalesForecast.findOne({ _id: sanitizedId, firmId });

    if (!forecast) {
        throw CustomException('Sales forecast not found', 404);
    }

    // Check if forecast is locked
    if (forecast.status === 'locked') {
        throw CustomException('Cannot delete locked forecast', 403);
    }

    await SalesForecast.findOneAndDelete({ _id: sanitizedId, firmId });

    res.json({
        success: true,
        message: 'Sales forecast deleted successfully'
    });
});

/**
 * Submit forecast for approval
 * POST /api/sales-forecasts/:id/submit
 */
const submitForecast = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const firmId = req.firmId;
    const lawyerId = req.userID;

    // INPUT VALIDATION: Sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid forecast ID', 400);
    }

    // IDOR PROTECTION: Query includes firmId
    const forecast = await SalesForecast.findOne({ _id: sanitizedId, firmId });

    if (!forecast) {
        throw CustomException('Sales forecast not found', 404);
    }

    if (forecast.status !== 'draft') {
        throw CustomException('Only draft forecasts can be submitted', 400);
    }

    forecast.status = 'submitted';
    forecast.submittedAt = new Date();
    forecast.submittedBy = lawyerId;
    forecast.updatedBy = lawyerId;

    await forecast.save();

    res.json({
        success: true,
        message: 'Sales forecast submitted successfully',
        data: forecast
    });
});

/**
 * Approve forecast
 * POST /api/sales-forecasts/:id/approve
 */
const approveForecast = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const firmId = req.firmId;
    const lawyerId = req.userID;

    // INPUT VALIDATION: Sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid forecast ID', 400);
    }

    // IDOR PROTECTION: Query includes firmId
    const forecast = await SalesForecast.findOne({ _id: sanitizedId, firmId });

    if (!forecast) {
        throw CustomException('Sales forecast not found', 404);
    }

    if (forecast.status !== 'submitted') {
        throw CustomException('Only submitted forecasts can be approved', 400);
    }

    forecast.status = 'approved';
    forecast.approvedAt = new Date();
    forecast.approvedBy = lawyerId;
    forecast.updatedBy = lawyerId;

    await forecast.save();

    res.json({
        success: true,
        message: 'Sales forecast approved successfully',
        data: forecast
    });
});

/**
 * Lock forecast
 * POST /api/sales-forecasts/:id/lock
 */
const lockForecast = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const firmId = req.firmId;
    const lawyerId = req.userID;

    // INPUT VALIDATION: Sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid forecast ID', 400);
    }

    // IDOR PROTECTION: Query includes firmId
    const forecast = await SalesForecast.findOne({ _id: sanitizedId, firmId });

    if (!forecast) {
        throw CustomException('Sales forecast not found', 404);
    }

    if (forecast.status !== 'approved') {
        throw CustomException('Only approved forecasts can be locked', 400);
    }

    forecast.status = 'locked';
    forecast.updatedBy = lawyerId;

    await forecast.save();

    res.json({
        success: true,
        message: 'Sales forecast locked successfully',
        data: forecast
    });
});

/**
 * Add adjustment to forecast
 * POST /api/sales-forecasts/:id/adjustments
 */
const addAdjustment = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { id } = req.params;
    const firmId = req.firmId;
    const lawyerId = req.userID;

    // INPUT VALIDATION: Sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('Invalid forecast ID', 400);
    }

    // IDOR PROTECTION: Query includes firmId
    const forecast = await SalesForecast.findOne({ _id: sanitizedId, firmId });

    if (!forecast) {
        throw CustomException('Sales forecast not found', 404);
    }

    if (forecast.status === 'locked') {
        throw CustomException('Cannot add adjustments to locked forecast', 403);
    }

    // MASS ASSIGNMENT PROTECTION
    const allowedFields = ['type', 'amount', 'reason'];
    const adjustmentData = pickAllowedFields(req.body, allowedFields);

    // Validate adjustment data
    if (!adjustmentData.type) {
        throw CustomException('Adjustment type is required', 400);
    }

    if (adjustmentData.amount === undefined || adjustmentData.amount === null) {
        throw CustomException('Adjustment amount is required', 400);
    }

    const adjustment = {
        ...adjustmentData,
        adjustedBy: lawyerId,
        adjustedAt: new Date()
    };

    forecast.adjustments.push(adjustment);
    forecast.updatedBy = lawyerId;

    await forecast.save();

    res.json({
        success: true,
        message: 'Adjustment added successfully',
        data: forecast
    });
});

/**
 * Get current quarter forecasts
 * GET /api/sales-forecasts/current-quarter
 */
const getCurrentQuarter = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;

    const forecasts = await SalesForecast.getCurrentQuarter(firmId);

    res.json({
        success: true,
        data: forecasts,
        count: forecasts.length
    });
});

/**
 * Get forecasts by period
 * GET /api/sales-forecasts/by-period
 */
const getByPeriod = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const firmId = req.firmId;
    const { periodStart, periodEnd } = req.query;

    if (!periodStart || !periodEnd) {
        throw CustomException('Period start and end dates are required', 400);
    }

    const forecasts = await SalesForecast.getByPeriod(
        firmId,
        new Date(periodStart),
        new Date(periodEnd)
    );

    res.json({
        success: true,
        data: forecasts,
        count: forecasts.length
    });
});

module.exports = {
    createForecast,
    getForecasts,
    getForecastById,
    updateForecast,
    deleteForecast,
    submitForecast,
    approveForecast,
    lockForecast,
    addAdjustment,
    getCurrentQuarter,
    getByPeriod
};
