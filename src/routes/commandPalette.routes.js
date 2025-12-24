const express = require('express');
const router = express.Router();
const commandPaletteController = require('../controllers/commandPalette.controller');
const { userMiddleware, firmFilter } = require('../middlewares');

// Apply authentication and firm filtering to all routes
router.use(userMiddleware);
router.use(firmFilter);

// ============================================
// COMMAND PALETTE ROUTES
// ============================================

// Search and discovery
router.get('/search', commandPaletteController.search);
router.get('/commands', commandPaletteController.getCommands);
router.get('/recent', commandPaletteController.getRecentItems);

// Tracking
router.post('/track/record', commandPaletteController.trackRecordView);
router.post('/track/search', commandPaletteController.trackSearch);
router.post('/track/command', commandPaletteController.trackCommand);

// Saved searches
router.get('/saved-searches', commandPaletteController.getSavedSearches);
router.post('/saved-searches', commandPaletteController.saveSearch);
router.delete('/saved-searches/:name', commandPaletteController.deleteSavedSearch);

module.exports = router;
