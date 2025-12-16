/**
 * Finance Setup Wizard Routes
 *
 * Routes for managing the finance configuration wizard
 */

const express = require('express');
const router = express.Router();
const { userMiddleware } = require('../middlewares');
const { firmFilter, firmAdminOnly } = require('../middlewares/firmFilter.middleware');
const {
    getSetupStatus,
    getSetup,
    updateSetup,
    updateStep,
    completeSetup,
    resetSetup,
    getTemplates
} = require('../controllers/financeSetup.controller');

// All routes require authentication and firm filter
router.use(userMiddleware);
router.use(firmFilter);

/**
 * @route   GET /api/finance-setup/status
 * @desc    Get setup status (completed/current step)
 * @access  Private
 */
router.get('/status', getSetupStatus);

/**
 * @route   GET /api/finance-setup/templates
 * @desc    Get available chart of accounts templates
 * @access  Private
 */
router.get('/templates', getTemplates);

/**
 * @route   GET /api/finance-setup
 * @desc    Get current setup data
 * @access  Private
 */
router.get('/', getSetup);

/**
 * @route   PUT /api/finance-setup
 * @desc    Update setup (save progress)
 * @access  Private - Admin only
 */
router.put('/', firmAdminOnly, updateSetup);

/**
 * @route   PUT /api/finance-setup/step/:step
 * @desc    Update specific step
 * @access  Private - Admin only
 */
router.put('/step/:step', firmAdminOnly, updateStep);

/**
 * @route   POST /api/finance-setup/complete
 * @desc    Complete the setup wizard
 * @access  Private - Admin only
 */
router.post('/complete', firmAdminOnly, completeSetup);

/**
 * @route   POST /api/finance-setup/reset
 * @desc    Reset setup (for re-configuration)
 * @access  Private - Admin only
 */
router.post('/reset', firmAdminOnly, resetSetup);

module.exports = router;
