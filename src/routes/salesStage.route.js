/**
 * Sales Stage Routes
 *
 * Routes for managing sales pipeline stages.
 */

const express = require('express');
const router = express.Router();
const salesStageController = require('../controllers/salesStage.controller');
const {
    validateIdParam,
    validateCreateSalesStage,
    validateUpdateSalesStage,
    validateReorderStages
} = require('../validators/crm.validator');
const { verifyToken } = require('../middlewares/jwt');
const firmFilter = require('../middlewares/firmFilter.middleware');

// Apply authentication and firm filter middleware
router.use(verifyToken, firmFilter);

// ═══════════════════════════════════════════════════════════════
// SALES STAGE ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/v1/sales-stages
 * @desc    Get all sales stages
 * @access  Private
 */
router.get('/', salesStageController.getAll);

/**
 * @route   GET /api/v1/sales-stages/:id
 * @desc    Get sales stage by ID
 * @access  Private
 */
router.get('/:id', validateIdParam, salesStageController.getById);

/**
 * @route   POST /api/v1/sales-stages
 * @desc    Create a new sales stage
 * @access  Private
 */
router.post('/', validateCreateSalesStage, salesStageController.create);

/**
 * @route   POST /api/v1/sales-stages/defaults
 * @desc    Create default sales stages
 * @access  Private
 */
router.post('/defaults', salesStageController.createDefaults);

/**
 * @route   PUT /api/v1/sales-stages/reorder
 * @desc    Reorder sales stages
 * @access  Private
 */
router.put('/reorder', validateReorderStages, salesStageController.reorder);

/**
 * @route   PUT /api/v1/sales-stages/:id
 * @desc    Update a sales stage
 * @access  Private
 */
router.put('/:id', validateIdParam, validateUpdateSalesStage, salesStageController.update);

/**
 * @route   DELETE /api/v1/sales-stages/:id
 * @desc    Delete a sales stage
 * @access  Private
 */
router.delete('/:id', validateIdParam, salesStageController.delete);

module.exports = router;
