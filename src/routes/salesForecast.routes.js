/**
 * SalesForecast Routes
 *
 * Routes for managing sales forecasts and revenue projections
 * All routes require authentication via userMiddleware
 *
 * Base route: /api/sales-forecasts
 */

const express = require('express');
const router = express.Router();
const salesForecastController = require('../controllers/salesForecast.controller');
const { userMiddleware } = require('../middlewares');

// ============================================
// APPLY AUTHENTICATION TO ALL ROUTES
// ============================================
router.use(userMiddleware);

// ============================================
// FORECAST QUERY ROUTES (must be before :id routes)
// ============================================

/**
 * @route   GET /api/sales-forecasts/current-quarter
 * @desc    Get forecasts for current quarter
 * @access  Private
 */
router.get('/current-quarter', salesForecastController.getCurrentQuarter);

/**
 * @route   GET /api/sales-forecasts/by-period
 * @desc    Get forecasts by period range
 * @query   periodStart, periodEnd
 * @access  Private
 */
router.get('/by-period', salesForecastController.getByPeriod);

// ============================================
// FORECAST CRUD OPERATIONS
// ============================================

/**
 * @route   POST /api/sales-forecasts
 * @desc    Create a new sales forecast
 * @access  Private
 */
router.post('/', salesForecastController.createForecast);

/**
 * @route   GET /api/sales-forecasts
 * @desc    Get all forecasts with filters
 * @query   status, periodType, scopeType, fiscalYear, fiscalQuarter, salesTeamId, territoryId, userId, search, periodStart, periodEnd, page, limit
 * @access  Private
 */
router.get('/', salesForecastController.getForecasts);

/**
 * @route   GET /api/sales-forecasts/:id
 * @desc    Get single forecast by ID
 * @access  Private
 */
router.get('/:id', salesForecastController.getForecastById);

/**
 * @route   PUT /api/sales-forecasts/:id
 * @desc    Update forecast
 * @access  Private
 */
router.put('/:id', salesForecastController.updateForecast);

/**
 * @route   DELETE /api/sales-forecasts/:id
 * @desc    Delete forecast
 * @access  Private
 */
router.delete('/:id', salesForecastController.deleteForecast);

// ============================================
// FORECAST STATUS OPERATIONS
// ============================================

/**
 * @route   POST /api/sales-forecasts/:id/submit
 * @desc    Submit forecast for approval
 * @access  Private
 */
router.post('/:id/submit', salesForecastController.submitForecast);

/**
 * @route   POST /api/sales-forecasts/:id/approve
 * @desc    Approve submitted forecast
 * @access  Private
 */
router.post('/:id/approve', salesForecastController.approveForecast);

/**
 * @route   POST /api/sales-forecasts/:id/lock
 * @desc    Lock approved forecast
 * @access  Private
 */
router.post('/:id/lock', salesForecastController.lockForecast);

// ============================================
// FORECAST ADJUSTMENTS
// ============================================

/**
 * @route   POST /api/sales-forecasts/:id/adjustments
 * @desc    Add adjustment to forecast
 * @body    type, amount, reason
 * @access  Private
 */
router.post('/:id/adjustments', salesForecastController.addAdjustment);

module.exports = router;
