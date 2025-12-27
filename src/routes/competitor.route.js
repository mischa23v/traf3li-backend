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

// Apply authentication middleware
router.use(verifyToken);

// ═══════════════════════════════════════════════════════════════
// COMPETITOR ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/v1/competitors
 * @desc    Get all competitors (with optional stats)
 * @access  Private
 */
router.get('/', competitorController.getCompetitors);

// TODO: getTopByLosses not implemented
// router.get('/top-losses', competitorController.getTopByLosses);

/**
 * @route   GET /api/v1/competitors/:id
 * @desc    Get competitor by ID
 * @access  Private
 */
router.get('/:id', validateIdParam, competitorController.getCompetitor);

/**
 * @route   POST /api/v1/competitors
 * @desc    Create a new competitor
 * @access  Private
 */
router.post('/', validateCreateCompetitor, competitorController.createCompetitor);

/**
 * @route   PUT /api/v1/competitors/:id
 * @desc    Update a competitor
 * @access  Private
 */
router.put('/:id', validateIdParam, validateUpdateCompetitor, competitorController.updateCompetitor);

/**
 * @route   DELETE /api/v1/competitors/:id
 * @desc    Delete a competitor
 * @access  Private
 */
router.delete('/:id', validateIdParam, competitorController.deleteCompetitor);

module.exports = router;
