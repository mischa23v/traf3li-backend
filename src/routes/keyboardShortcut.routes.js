const express = require('express');
const router = express.Router();
const keyboardShortcutController = require('../controllers/keyboardShortcut.controller');
const { userMiddleware } = require('../middlewares');

// Apply authentication to all routes
router.use(userMiddleware);

// ============================================
// KEYBOARD SHORTCUT ROUTES
// ============================================

// Get default shortcuts (public - no user-specific data)
router.get('/defaults', keyboardShortcutController.getDefaults);

// Check for conflicts
router.post('/check-conflict', keyboardShortcutController.checkConflict);

// Reset all shortcuts
router.post('/reset-all', keyboardShortcutController.resetAllShortcuts);

// Get all user shortcuts
router.get('/', keyboardShortcutController.getShortcuts);

// Create custom shortcut
router.post('/', keyboardShortcutController.createShortcut);

// Get specific shortcut by ID
router.get('/:id', keyboardShortcutController.getShortcutById);

// Update shortcut
router.put('/:id', keyboardShortcutController.updateShortcut);

// Delete custom shortcut
router.delete('/:id', keyboardShortcutController.deleteShortcut);

// Reset shortcut to default
router.post('/:id/reset', keyboardShortcutController.resetShortcut);

module.exports = router;
