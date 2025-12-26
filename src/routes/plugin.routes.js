/**
 * Plugin Routes
 *
 * Routes for plugin/extension management.
 * Allows firms to install, configure, and manage plugins.
 *
 * Base route: /api/plugins
 */

const express = require('express');
const router = express.Router();
const pluginController = require('../controllers/plugin.controller');
const { userMiddleware } = require('../middlewares');

// ============ PUBLIC PLUGIN DISCOVERY ============
// These routes don't require firm filtering

/**
 * Search plugins
 * GET /api/plugins/search?q=slack
 */
router.get('/search', userMiddleware, pluginController.searchPlugins);

/**
 * Get all plugins (System Admin Only)
 * GET /api/plugins/all
 */
router.get('/all', userMiddleware, pluginController.getAllPlugins);

/**
 * Get plugin loader statistics (System Admin Only)
 * GET /api/plugins/loader/stats
 */
router.get('/loader/stats', userMiddleware, pluginController.getLoaderStats);

/**
 * Get available plugins for installation
 * GET /api/plugins/available?category=integration
 */
router.get('/available', userMiddleware, pluginController.getAvailablePlugins);

/**
 * Get installed plugins for current firm
 * GET /api/plugins/installed?enabled=true
 */
router.get('/installed', userMiddleware, pluginController.getInstalledPlugins);

// ============ PLUGIN ADMINISTRATION ============

/**
 * Register a new plugin (System Admin Only)
 * POST /api/plugins/register
 */
router.post('/register', userMiddleware, pluginController.registerPlugin);

/**
 * Execute a hook manually (for testing)
 * POST /api/plugins/hooks/execute
 */
router.post('/hooks/execute', userMiddleware, pluginController.executeHook);

// ============ PLUGIN DETAILS ============

/**
 * Get plugin by ID
 * GET /api/plugins/:id
 */
router.get('/:id', userMiddleware, pluginController.getPlugin);

/**
 * Get plugin statistics
 * GET /api/plugins/:id/stats
 */
router.get('/:id/stats', userMiddleware, pluginController.getPluginStats);

/**
 * Reload a plugin (System Admin Only)
 * POST /api/plugins/:id/reload
 */
router.post('/:id/reload', userMiddleware, pluginController.reloadPlugin);

/**
 * Install a plugin
 * POST /api/plugins/:id/install
 */
router.post('/:id/install', userMiddleware, pluginController.installPlugin);

/**
 * Uninstall a plugin
 * DELETE /api/plugins/:id/uninstall
 */
router.delete('/:id/uninstall', userMiddleware, pluginController.uninstallPlugin);

// ============ INSTALLATION MANAGEMENT ============

/**
 * Get plugin installation details
 * GET /api/plugins/installations/:installationId
 */
router.get('/installations/:installationId', userMiddleware, pluginController.getInstallation);

/**
 * Update plugin settings
 * PATCH /api/plugins/installations/:installationId/settings
 */
router.patch('/installations/:installationId/settings', userMiddleware, pluginController.updateSettings);

/**
 * Enable a plugin installation
 * POST /api/plugins/installations/:installationId/enable
 */
router.post('/installations/:installationId/enable', userMiddleware, pluginController.enablePlugin);

/**
 * Disable a plugin installation
 * POST /api/plugins/installations/:installationId/disable
 */
router.post('/installations/:installationId/disable', userMiddleware, pluginController.disablePlugin);

module.exports = router;
