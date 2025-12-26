/**
 * Lost Reason Routes
 *
 * Routes for managing lost reasons for opportunities.
 */

const express = require('express');
const router = express.Router();
const lostReasonController = require('../controllers/lostReason.controller');
const {
    validateIdParam,
    validateCreateLostReason,
    validateUpdateLostReason
} = require('../validators/crm.validator');
const { verifyToken } = require('../middlewares/jwt');

// Apply authentication middleware
router.use(verifyToken);

// ═══════════════════════════════════════════════════════════════
// LOST REASON ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/v1/lost-reasons
 * @desc    Get all lost reasons
 * @access  Private
 */
router.get('/', lostReasonController.getAll);

/**
 * @route   GET /api/v1/lost-reasons/categories
 * @desc    Get valid lost reason categories
 * @access  Private
 */
router.get('/categories', lostReasonController.getCategories);

/**
 * @route   GET /api/v1/lost-reasons/:id
 * @desc    Get lost reason by ID
 * @access  Private
 */
router.get('/:id', validateIdParam, lostReasonController.getById);

/**
 * @route   POST /api/v1/lost-reasons
 * @desc    Create a new lost reason
 * @access  Private
 */
router.post('/', validateCreateLostReason, lostReasonController.create);

/**
 * @route   POST /api/v1/lost-reasons/defaults
 * @desc    Create default lost reasons
 * @access  Private
 */
router.post('/defaults', lostReasonController.createDefaults);

/**
 * @route   PUT /api/v1/lost-reasons/:id
 * @desc    Update a lost reason
 * @access  Private
 */
router.put('/:id', validateIdParam, validateUpdateLostReason, lostReasonController.update);

/**
 * @route   DELETE /api/v1/lost-reasons/:id
 * @desc    Delete a lost reason
 * @access  Private
 */
router.delete('/:id', validateIdParam, lostReasonController.delete);

module.exports = router;
