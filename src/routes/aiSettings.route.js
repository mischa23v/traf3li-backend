const express = require('express');
const { userMiddleware } = require('../middlewares');
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
router.get('/', userMiddleware, getAISettings);

// Get feature status (available to all users)
router.get('/features', userMiddleware, getFeatureStatus);

// Get usage statistics
router.get('/usage', userMiddleware, getUsageStats);

// Save an API key (validates before saving)
router.post('/keys', userMiddleware, saveApiKey);

// Validate an API key without saving
router.post('/validate', userMiddleware, validateApiKey);

// Remove an API key
router.delete('/keys/:provider', userMiddleware, removeApiKey);

// Update preferences
router.patch('/preferences', userMiddleware, updatePreferences);

module.exports = router;
