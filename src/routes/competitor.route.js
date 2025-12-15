/**
 * Competitor Routes
 *
 * Routes for managing competitors.
 */

const express = require('express');
const router = express.Router();
const competitorController = require('../controllers/competitor.controller');
const {
    validateIdParam,
    validateCreateCompetitor,
    validateUpdateCompetitor
} = require('../validators/crm.validator');
const { verifyToken } = require('../middlewares/jwt');
const firmFilter = require('../middlewares/firmFilter.middleware');

// Apply authentication and firm filter middleware
router.use(verifyToken, firmFilter);

// ═══════════════════════════════════════════════════════════════
// COMPETITOR ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/v1/competitors
 * @desc    Get all competitors (with optional stats)
 * @access  Private
 */
router.get('/', competitorController.getAll);

/**
 * @route   GET /api/v1/competitors/top-losses
 * @desc    Get top competitors by cases lost
 * @access  Private
 */
router.get('/top-losses', competitorController.getTopByLosses);

/**
 * @route   GET /api/v1/competitors/:id
 * @desc    Get competitor by ID
 * @access  Private
 */
router.get('/:id', validateIdParam, competitorController.getById);

/**
 * @route   POST /api/v1/competitors
 * @desc    Create a new competitor
 * @access  Private
 */
router.post('/', validateCreateCompetitor, competitorController.create);

/**
 * @route   PUT /api/v1/competitors/:id
 * @desc    Update a competitor
 * @access  Private
 */
router.put('/:id', validateIdParam, validateUpdateCompetitor, competitorController.update);

/**
 * @route   DELETE /api/v1/competitors/:id
 * @desc    Delete a competitor
 * @access  Private
 */
router.delete('/:id', validateIdParam, competitorController.delete);

module.exports = router;
