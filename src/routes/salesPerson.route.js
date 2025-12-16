/**
 * Sales Person Routes
 *
 * Routes for managing sales persons.
 */

const express = require('express');
const router = express.Router();
const salesPersonController = require('../controllers/salesPerson.controller');
const {
    validateIdParam,
    validateCreateSalesPerson,
    validateUpdateSalesPerson
} = require('../validators/crm.validator');
const { verifyToken } = require('../middlewares/jwt');
const { firmFilter } = require('../middlewares/firmFilter.middleware');

// Apply authentication and firm filter middleware
router.use(verifyToken, firmFilter);

// ═══════════════════════════════════════════════════════════════
// SALES PERSON ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/v1/sales-persons
 * @desc    Get all sales persons with filters
 * @access  Private
 */
router.get('/', salesPersonController.getAll);

/**
 * @route   GET /api/v1/sales-persons/tree
 * @desc    Get sales persons in hierarchical tree structure
 * @access  Private
 */
router.get('/tree', salesPersonController.getTree);

/**
 * @route   GET /api/v1/sales-persons/:id
 * @desc    Get sales person by ID
 * @access  Private
 */
router.get('/:id', validateIdParam, salesPersonController.getById);

/**
 * @route   GET /api/v1/sales-persons/:id/stats
 * @desc    Get performance statistics for a sales person
 * @access  Private
 */
router.get('/:id/stats', validateIdParam, salesPersonController.getStats);

/**
 * @route   POST /api/v1/sales-persons
 * @desc    Create a new sales person
 * @access  Private
 */
router.post('/', validateCreateSalesPerson, salesPersonController.create);

/**
 * @route   PUT /api/v1/sales-persons/:id
 * @desc    Update a sales person
 * @access  Private
 */
router.put('/:id', validateIdParam, validateUpdateSalesPerson, salesPersonController.update);

/**
 * @route   DELETE /api/v1/sales-persons/:id
 * @desc    Delete a sales person
 * @access  Private
 */
router.delete('/:id', validateIdParam, salesPersonController.delete);

module.exports = router;
