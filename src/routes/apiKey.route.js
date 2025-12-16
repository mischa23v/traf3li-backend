/**
 * API Key Routes
 *
 * Routes for API key management.
 * Requires Professional or Enterprise plan.
 */

const express = require('express');
const router = express.Router();
const apiKeyController = require('../controllers/apiKey.controller');
const { userMiddleware } = require('../middlewares');
const { firmFilter, firmAdminOnly } = require('../middlewares/firmFilter.middleware');
const { requireFeature } = require('../middlewares/planCheck.middleware');

// All routes require authentication and firm membership
router.use(userMiddleware);
router.use(firmFilter);

// All routes require api_access feature (Professional+)
router.use(requireFeature('api_access'));

// Get all API keys
router.get('/', apiKeyController.getApiKeys);

// Get API key statistics
router.get('/stats', apiKeyController.getApiKeyStats);

// Get specific API key
router.get('/:id', apiKeyController.getApiKey);

// Admin only routes
router.post('/', firmAdminOnly, apiKeyController.createApiKey);
router.patch('/:id', firmAdminOnly, apiKeyController.updateApiKey);
router.delete('/:id', firmAdminOnly, apiKeyController.revokeApiKey);
router.post('/:id/regenerate', firmAdminOnly, apiKeyController.regenerateApiKey);

module.exports = router;
