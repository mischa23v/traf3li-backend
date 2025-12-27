/**
 * Lost Reason Routes
 * Security: All routes protected with userMiddleware for authentication
 */

const express = require('express');
const router = express.Router();
const lostReasonController = require('../controllers/lostReason.controller');
const { userMiddleware } = require('../middlewares');

// Apply authentication to all routes
router.use(userMiddleware);

// ═══════════════════════════════════════════════════════════════
// LOST REASON ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/lost-reasons/stats
 * @desc    Get usage statistics for lost reasons
 * @access  Private (authenticated users)
 */
router.get('/stats', lostReasonController.getUsageStats);

/**
 * @route   PUT /api/lost-reasons/reorder
 * @desc    Reorder lost reasons by updating sortOrder
 * @access  Private (authenticated users)
 */
router.put('/reorder', lostReasonController.reorderLostReasons);

/**
 * @route   GET /api/lost-reasons
 * @desc    Get all lost reasons with optional filters
 * @access  Private (authenticated users)
 * @query   category - Filter by category (price/competition/timing/needs/internal/other)
 * @query   applicableTo - Filter by applicable type (lead/opportunity/quote)
 * @query   isActive - Filter by active status (true/false)
 * @query   search - Search in name and nameAr
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 50, max: 100)
 */
router.get('/', lostReasonController.getLostReasons);

/**
 * @route   POST /api/lost-reasons
 * @desc    Create a new lost reason
 * @access  Private (authenticated users)
 */
router.post('/', lostReasonController.createLostReason);

/**
 * @route   GET /api/lost-reasons/:id
 * @desc    Get single lost reason by ID
 * @access  Private (authenticated users)
 */
router.get('/:id', lostReasonController.getLostReasonById);

/**
 * @route   PUT /api/lost-reasons/:id
 * @desc    Update lost reason
 * @access  Private (authenticated users)
 */
router.put('/:id', lostReasonController.updateLostReason);

/**
 * @route   DELETE /api/lost-reasons/:id
 * @desc    Delete lost reason
 * @access  Private (authenticated users)
 */
router.delete('/:id', lostReasonController.deleteLostReason);

module.exports = router;
