/**
 * Lead Source Routes
 *
 * Routes for managing lead sources.
 */

const express = require('express');
const router = express.Router();
const leadSourceController = require('../controllers/leadSource.controller');
const {
    validateIdParam,
    validateCreateLeadSource,
    validateUpdateLeadSource
} = require('../validators/crm.validator');
const { verifyToken } = require('../middlewares/jwt');

// Apply authentication middleware
router.use(verifyToken);

// ═══════════════════════════════════════════════════════════════
// LEAD SOURCE ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/v1/lead-sources
 * @desc    Get all lead sources
 * @access  Private
 */
router.get('/', leadSourceController.getAll);

/**
 * @route   GET /api/v1/lead-sources/:id
 * @desc    Get lead source by ID
 * @access  Private
 */
router.get('/:id', validateIdParam, leadSourceController.getById);

/**
 * @route   POST /api/v1/lead-sources
 * @desc    Create a new lead source
 * @access  Private
 */
router.post('/', validateCreateLeadSource, leadSourceController.create);

/**
 * @route   POST /api/v1/lead-sources/defaults
 * @desc    Create default lead sources
 * @access  Private
 */
router.post('/defaults', leadSourceController.createDefaults);

/**
 * @route   PUT /api/v1/lead-sources/:id
 * @desc    Update a lead source
 * @access  Private
 */
router.put('/:id', validateIdParam, validateUpdateLeadSource, leadSourceController.update);

/**
 * @route   DELETE /api/v1/lead-sources/:id
 * @desc    Delete a lead source
 * @access  Private
 */
router.delete('/:id', validateIdParam, leadSourceController.delete);

module.exports = router;
