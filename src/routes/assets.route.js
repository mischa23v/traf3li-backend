/**
 * Assets Routes
 *
 * Comprehensive asset management routes including:
 * - Fixed assets with depreciation tracking
 * - Asset categories and hierarchies
 * - Maintenance scheduling
 * - Asset movements (transfers, issues, receipts)
 * - Statistics and reporting
 * - Settings management
 */

const express = require('express');
const router = express.Router();
const assetsController = require('../controllers/assets.controller');
const {
    validateCreateAsset,
    validateUpdateAsset,
    validateCreateCategory,
    validateUpdateCategory,
    validateCreateMaintenanceSchedule,
    validateUpdateMaintenanceSchedule,
    validateCreateMovement,
    validateUpdateSettings
} = require('../validators/assets.validator');
const { authenticate } = require('../middlewares');
const { firmFilter } = require('../middlewares/firmFilter.middleware');

// Apply authentication and firm filter middleware to all routes
router.use(authenticate, firmFilter);

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (must come before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────
// Asset Static Routes
// ───────────────────────────────────────────────────────────────

/**
 * @route   GET /api/assets/stats
 * @desc    Get asset statistics
 * @access  Private
 */
router.get('/stats', assetsController.getStats);

// ───────────────────────────────────────────────────────────────
// Category Static Routes
// ───────────────────────────────────────────────────────────────

/**
 * @route   GET /api/assets/categories
 * @desc    Get all asset categories
 * @access  Private
 */
router.get('/categories', assetsController.getCategories);

/**
 * @route   POST /api/assets/categories
 * @desc    Create a new asset category
 * @access  Private
 */
router.post('/categories', validateCreateCategory, assetsController.createCategory);

/**
 * @route   GET /api/assets/categories/:id
 * @desc    Get category by ID
 * @access  Private
 */
router.get('/categories/:id', assetsController.getCategory);

/**
 * @route   PUT /api/assets/categories/:id
 * @desc    Update a category
 * @access  Private
 */
router.put('/categories/:id', validateUpdateCategory, assetsController.updateCategory);

/**
 * @route   DELETE /api/assets/categories/:id
 * @desc    Delete a category
 * @access  Private
 */
router.delete('/categories/:id', assetsController.deleteCategory);

// ───────────────────────────────────────────────────────────────
// Maintenance Static Routes
// ───────────────────────────────────────────────────────────────

/**
 * @route   GET /api/assets/maintenance
 * @desc    Get all maintenance schedules with filters
 * @access  Private
 */
router.get('/maintenance', assetsController.getMaintenanceSchedules);

/**
 * @route   POST /api/assets/maintenance
 * @desc    Create a new maintenance schedule
 * @access  Private
 */
router.post('/maintenance', validateCreateMaintenanceSchedule, assetsController.createMaintenanceSchedule);

/**
 * @route   GET /api/assets/maintenance/:id
 * @desc    Get maintenance schedule by ID
 * @access  Private
 */
router.get('/maintenance/:id', assetsController.getMaintenanceSchedule);

/**
 * @route   PUT /api/assets/maintenance/:id
 * @desc    Update a maintenance schedule
 * @access  Private
 */
router.put('/maintenance/:id', validateUpdateMaintenanceSchedule, assetsController.updateMaintenanceSchedule);

/**
 * @route   POST /api/assets/maintenance/:id/complete
 * @desc    Complete a maintenance schedule
 * @access  Private
 */
router.post('/maintenance/:id/complete', assetsController.completeMaintenanceSchedule);

// ───────────────────────────────────────────────────────────────
// Movement Static Routes
// ───────────────────────────────────────────────────────────────

/**
 * @route   GET /api/assets/movements
 * @desc    Get all asset movements with filters
 * @access  Private
 */
router.get('/movements', assetsController.getMovements);

/**
 * @route   POST /api/assets/movements
 * @desc    Create a new asset movement
 * @access  Private
 */
router.post('/movements', validateCreateMovement, assetsController.createMovement);

// ───────────────────────────────────────────────────────────────
// Settings Static Routes
// ───────────────────────────────────────────────────────────────

/**
 * @route   GET /api/assets/settings
 * @desc    Get asset settings
 * @access  Private
 */
router.get('/settings', assetsController.getSettings);

/**
 * @route   PUT /api/assets/settings
 * @desc    Update asset settings
 * @access  Private
 */
router.put('/settings', validateUpdateSettings, assetsController.updateSettings);

// ═══════════════════════════════════════════════════════════════
// ASSET CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/assets
 * @desc    Get all assets with filters
 * @query   status, assetCategory, location, custodian, department
 * @access  Private
 */
router.get('/', assetsController.getAssets);

/**
 * @route   POST /api/assets
 * @desc    Create a new asset
 * @access  Private
 */
router.post('/', validateCreateAsset, assetsController.createAsset);

/**
 * @route   GET /api/assets/:id
 * @desc    Get asset by ID
 * @access  Private
 */
router.get('/:id', assetsController.getAsset);

/**
 * @route   PUT /api/assets/:id
 * @desc    Update an asset
 * @access  Private
 */
router.put('/:id', validateUpdateAsset, assetsController.updateAsset);

/**
 * @route   POST /api/assets/:id/submit
 * @desc    Submit an asset for approval
 * @access  Private
 */
router.post('/:id/submit', assetsController.submitAsset);

/**
 * @route   DELETE /api/assets/:id
 * @desc    Delete an asset
 * @access  Private
 */
router.delete('/:id', assetsController.deleteAsset);

module.exports = router;
