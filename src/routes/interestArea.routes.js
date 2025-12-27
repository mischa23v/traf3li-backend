/**
 * Interest Area Routes
 *
 * Routes for managing interest areas in legal CRM
 * All routes require authentication via userMiddleware
 *
 * Base route: /api/interest-areas
 */

const express = require('express');
const router = express.Router();
const interestAreaController = require('../controllers/interestArea.controller');
const { userMiddleware } = require('../middlewares');

// ============================================
// APPLY AUTHENTICATION TO ALL ROUTES
// ============================================
router.use(userMiddleware);

// ============================================
// INTEREST AREA CRUD OPERATIONS
// ============================================

/**
 * @route   POST /api/interest-areas
 * @desc    Create a new interest area
 * @access  Private
 */
router.post('/', interestAreaController.createInterestArea);

/**
 * @route   GET /api/interest-areas/tree
 * @desc    Get hierarchical tree of interest areas
 * @query   category, status
 * @access  Private
 */
router.get('/tree', interestAreaController.getInterestAreasTree);

/**
 * @route   GET /api/interest-areas
 * @desc    Get all interest areas with filters
 * @query   search, status, category, parentId, page, limit
 * @access  Private
 */
router.get('/', interestAreaController.getInterestAreas);

/**
 * @route   GET /api/interest-areas/:id
 * @desc    Get single interest area by ID
 * @access  Private
 */
router.get('/:id', interestAreaController.getInterestArea);

/**
 * @route   PUT /api/interest-areas/:id
 * @desc    Update interest area
 * @access  Private
 */
router.put('/:id', interestAreaController.updateInterestArea);

/**
 * @route   DELETE /api/interest-areas/:id
 * @desc    Delete interest area
 * @access  Private
 */
router.delete('/:id', interestAreaController.deleteInterestArea);

module.exports = router;
