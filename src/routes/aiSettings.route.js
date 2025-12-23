const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const {
    getAISettings,
    saveApiKey,
    removeApiKey,
    validateApiKey,
    updatePreferences,
    getFeatureStatus,
    getUsageStats
} = require('../controllers/aiSettings.controller');

const router = express.Router();

/**
 * AI Settings Routes
 * All routes require authentication and firm membership
 */

// Get AI settings (masked keys)
router.get('/', userMiddleware, firmFilter, getAISettings);

// Get feature status (available to all users)
router.get('/features', userMiddleware, firmFilter, getFeatureStatus);

// Get usage statistics
router.get('/usage', userMiddleware, firmFilter, getUsageStats);

// Save an API key (validates before saving)
router.post('/keys', userMiddleware, firmFilter, saveApiKey);

// Validate an API key without saving
router.post('/validate', userMiddleware, firmFilter, validateApiKey);

// Remove an API key
router.delete('/keys/:provider', userMiddleware, firmFilter, removeApiKey);

// Update preferences
router.patch('/preferences', userMiddleware, firmFilter, updatePreferences);

module.exports = router;
