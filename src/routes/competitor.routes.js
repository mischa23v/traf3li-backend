/**
 * Competitor Routes
 *
 * Routes for managing competitors in legal CRM
 * All routes require authentication via userMiddleware
 *
 * Base route: /api/competitors
 */

const express = require('express');
const router = express.Router();
const competitorController = require('../controllers/competitor.controller');
const { userMiddleware } = require('../middlewares');

// ============================================
// APPLY AUTHENTICATION TO ALL ROUTES
// ============================================
router.use(userMiddleware);

// ============================================
// COMPETITOR CRUD OPERATIONS
// ============================================

/**
 * @route   POST /api/competitors
 * @desc    Create a new competitor
 * @access  Private
 */
router.post('/', competitorController.createCompetitor);

/**
 * @route   GET /api/competitors
 * @desc    Get all competitors with filters
 * @query   search, status, competitorType, threatLevel, page, limit
 * @access  Private
 */
router.get('/', competitorController.getCompetitors);

/**
 * @route   GET /api/competitors/:id
 * @desc    Get single competitor by ID
 * @access  Private
 */
router.get('/:id', competitorController.getCompetitor);

/**
 * @route   PUT /api/competitors/:id
 * @desc    Update competitor
 * @access  Private
 */
router.put('/:id', competitorController.updateCompetitor);

/**
 * @route   DELETE /api/competitors/:id
 * @desc    Delete competitor
 * @access  Private
 */
router.delete('/:id', competitorController.deleteCompetitor);

// ============================================
// COMPETITOR WIN/LOSS TRACKING
// ============================================

/**
 * @route   POST /api/competitors/:id/record-win
 * @desc    Record a win against competitor
 * @access  Private
 */
router.post('/:id/record-win', competitorController.recordWin);

/**
 * @route   POST /api/competitors/:id/record-loss
 * @desc    Record a loss to competitor
 * @access  Private
 */
router.post('/:id/record-loss', competitorController.recordLoss);

module.exports = router;
