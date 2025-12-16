/**
 * CRM Settings Routes
 *
 * Routes for managing CRM configuration settings.
 */

const express = require('express');
const router = express.Router();
const crmSettingsController = require('../controllers/crmSettings.controller');
const { validateUpdateCRMSettings } = require('../validators/crm.validator');
const { verifyToken } = require('../middlewares/jwt');
const { firmFilter } = require('../middlewares/firmFilter.middleware');

// Apply authentication and firm filter middleware
router.use(verifyToken, firmFilter);

// ═══════════════════════════════════════════════════════════════
// CRM SETTINGS ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/v1/settings/crm
 * @desc    Get CRM settings for the current firm
 * @access  Private
 */
router.get('/', crmSettingsController.getSettings);

/**
 * @route   PUT /api/v1/settings/crm
 * @desc    Update CRM settings (partial update supported)
 * @access  Private
 */
router.put('/', validateUpdateCRMSettings, crmSettingsController.updateSettings);

/**
 * @route   POST /api/v1/settings/crm/reset
 * @desc    Reset CRM settings to defaults
 * @access  Private
 */
router.post('/reset', crmSettingsController.resetSettings);

module.exports = router;
