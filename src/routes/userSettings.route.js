/**
 * User Settings Routes
 *
 * API for user dashboard preferences (view mode, etc.)
 */

const express = require('express');
const {
    getSettings,
    getModuleViewMode,
    updateModuleViewMode,
    updateGlobalViewMode,
    updateModuleSettings,
    toggleSection
} = require('../controllers/userSettings.controller');

const app = express.Router();

// Get all settings
app.get('/', getSettings);

// View mode for specific module
app.get('/view-mode/:module', getModuleViewMode);
app.put('/view-mode/:module', updateModuleViewMode);

// Global view mode (all modules at once)
app.put('/global-view-mode', updateGlobalViewMode);

// Module-specific settings (period, chart type, etc.)
app.put('/module/:module', updateModuleSettings);

// Toggle section collapsed/expanded
app.post('/toggle-section', toggleSection);

module.exports = app;
