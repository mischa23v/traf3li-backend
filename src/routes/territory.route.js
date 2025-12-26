/**
 * Territory Routes
 *
 * Routes for managing sales territories.
 */

const express = require('express');
const router = express.Router();
const territoryController = require('../controllers/territory.controller');
const {
    validateIdParam,
    validateCreateTerritory,
    validateUpdateTerritory
} = require('../validators/crm.validator');
const { verifyToken } = require('../middlewares/jwt');

// Apply authentication middleware
router.use(verifyToken);

// ═══════════════════════════════════════════════════════════════
// TERRITORY ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/v1/territories
 * @desc    Get all territories with filters
 * @access  Private
 */
router.get('/', territoryController.getAll);

/**
 * @route   GET /api/v1/territories/tree
 * @desc    Get territories in hierarchical tree structure
 * @access  Private
 */
router.get('/tree', territoryController.getTree);

/**
 * @route   GET /api/v1/territories/:id
 * @desc    Get territory by ID
 * @access  Private
 */
router.get('/:id', validateIdParam, territoryController.getById);

/**
 * @route   POST /api/v1/territories
 * @desc    Create a new territory
 * @access  Private
 */
router.post('/', validateCreateTerritory, territoryController.create);

/**
 * @route   PUT /api/v1/territories/:id
 * @desc    Update a territory
 * @access  Private
 */
router.put('/:id', validateIdParam, validateUpdateTerritory, territoryController.update);

/**
 * @route   DELETE /api/v1/territories/:id
 * @desc    Delete a territory
 * @access  Private
 */
router.delete('/:id', validateIdParam, territoryController.delete);

module.exports = router;
