/**
 * Lead Conversion Routes
 *
 * Routes for converting leads to cases and managing CRM stages.
 */

const express = require('express');
const router = express.Router();
const leadConversionController = require('../controllers/leadConversion.controller');
const {
    validateIdParam,
    validateCreateCaseFromLead,
    validateUpdateCrmStage,
    validateMarkWon,
    validateMarkLost
} = require('../validators/crm.validator');
const { verifyToken } = require('../middlewares/jwt');

// Apply authentication middleware
router.use(verifyToken);

// ═══════════════════════════════════════════════════════════════
// LEAD CONVERSION ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   POST /api/v1/lead-conversion/:id/convert
 * @desc    Convert a lead to a case
 * @access  Private
 */
router.post('/:id/convert', validateIdParam, validateCreateCaseFromLead, leadConversionController.createCaseFromLead);

/**
 * @route   GET /api/v1/lead-conversion/:id/cases
 * @desc    Get all cases created from a lead
 * @access  Private
 */
router.get('/:id/cases', validateIdParam, leadConversionController.getLeadCases);

/**
 * @route   PUT /api/v1/lead-conversion/case/:caseId/stage
 * @desc    Update CRM stage for a case
 * @access  Private
 */
router.put('/case/:caseId/stage', validateUpdateCrmStage, leadConversionController.updateCrmStage);

/**
 * @route   PUT /api/v1/lead-conversion/case/:caseId/won
 * @desc    Mark a case as won
 * @access  Private
 */
router.put('/case/:caseId/won', validateMarkWon, leadConversionController.markCaseAsWon);

/**
 * @route   PUT /api/v1/lead-conversion/case/:caseId/lost
 * @desc    Mark a case as lost
 * @access  Private
 */
router.put('/case/:caseId/lost', validateMarkLost, leadConversionController.markCaseAsLost);

/**
 * @route   GET /api/v1/lead-conversion/case/:caseId/quotes
 * @desc    Get quotes for a case
 * @access  Private
 */
router.get('/case/:caseId/quotes', leadConversionController.getCaseQuotes);

module.exports = router;
