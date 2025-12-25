const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
  getPreferences,
  updatePreferences,
  resetToDefaults,
  getDefaults,
  updateChannelSettings,
  updateCategoryPreferences,
  updateQuietHours,
  muteCategory,
  unmuteCategory,
  getStats,
  checkQuietHours,
  testPreferences
} = require('../controllers/notificationPreference.controller');

const app = express.Router();

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (must come before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// Get default preferences
// GET /api/notification-preferences/defaults
app.get('/defaults', getDefaults);

// Get notification statistics
// GET /api/notification-preferences/stats
app.get('/stats', userMiddleware, getStats);

// Reset preferences to defaults
// POST /api/notification-preferences/reset
app.post('/reset', userMiddleware, resetToDefaults);

// Check quiet hours status
// GET /api/notification-preferences/quiet-hours/status
app.get('/quiet-hours/status', userMiddleware, checkQuietHours);

// Update quiet hours settings
// PUT /api/notification-preferences/quiet-hours
app.put('/quiet-hours', userMiddleware, updateQuietHours);

// Test notification preferences
// POST /api/notification-preferences/test
// Body: { category: 'invoices', channel: 'email', isUrgent: false }
app.post('/test', userMiddleware, testPreferences);

// Get user notification preferences
// GET /api/notification-preferences
app.get('/', userMiddleware, getPreferences);

// Update user notification preferences
// PUT /api/notification-preferences
// Body: { channels, categories, quietHours, urgentOverride, digestTime, language }
app.put('/', userMiddleware, updatePreferences);

// ═══════════════════════════════════════════════════════════════
// CHANNEL ROUTES
// ═══════════════════════════════════════════════════════════════

// Update channel settings
// PUT /api/notification-preferences/channels/:channel
// Params: channel = email|push|sms|inApp|whatsapp
// Body: { enabled: true, digest: 'instant' } (for email)
app.put('/channels/:channel', userMiddleware, updateChannelSettings);

// ═══════════════════════════════════════════════════════════════
// CATEGORY ROUTES
// ═══════════════════════════════════════════════════════════════

// Update category preferences
// PUT /api/notification-preferences/categories/:category
// Params: category = invoices|payments|cases|tasks|clients|approvals|reminders|mentions|system|billing|security|updates
// Body: { email: true, push: true, sms: false, inApp: true, whatsapp: false }
app.put('/categories/:category', userMiddleware, updateCategoryPreferences);

// Mute a category
// POST /api/notification-preferences/mute/:category
app.post('/mute/:category', userMiddleware, muteCategory);

// Unmute a category
// POST /api/notification-preferences/unmute/:category
app.post('/unmute/:category', userMiddleware, unmuteCategory);

module.exports = app;
