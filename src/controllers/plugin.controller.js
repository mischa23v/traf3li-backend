/**
 * Plugin Controller
 *
 * Handles HTTP requests for plugin management.
 */

const asyncHandler = require('../utils/asyncHandler');
const { CustomException } = require('../utils');
const pluginService = require('../services/plugin.service');
const pluginLoaderService = require('../services/pluginLoader.service');
const { Firm } = require('../models');

// ═══════════════════════════════════════════════════════════════
// PLUGIN MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Get all available plugins
 * GET /api/plugins/available
 */
const getAvailablePlugins = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { category } = req.query;

    const plugins = await pluginService.getAvailablePlugins(firmId, category);

    res.json({
        success: true,
        data: plugins,
        count: plugins.length
    });
});

/**
 * Get installed plugins for current firm
 * GET /api/plugins/installed
 */
const getInstalledPlugins = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { enabled } = req.query;

    const enabledOnly = enabled === 'true';
    const installations = await pluginService.getInstalledPlugins(firmId, enabledOnly);

    res.json({
        success: true,
        data: installations,
        count: installations.length
    });
});

/**
 * Get plugin by ID
 * GET /api/plugins/:id
 */
const getPlugin = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const plugin = await pluginService.getPluginById(id);

    res.json({
        success: true,
        data: plugin.getManifest()
    });
});

/**
 * Search plugins
 * GET /api/plugins/search
 */
const searchPlugins = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { q } = req.query;

    if (!q) {
        throw CustomException('Search query is required', 400);
    }

    const plugins = await pluginService.searchPlugins(q, firmId);

    res.json({
        success: true,
        data: plugins,
        count: plugins.length
    });
});

// ═══════════════════════════════════════════════════════════════
// PLUGIN INSTALLATION
// ═══════════════════════════════════════════════════════════════

/**
 * Install a plugin
 * POST /api/plugins/:id/install
 */
const installPlugin = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;
    const userId = req.userID;
    const { settings = {} } = req.body;

    // Check firm permissions
    const firm = await Firm.findById(firmId);
    const member = firm.members.find(m => m.userId.toString() === userId);

    if (!member || !['owner', 'admin'].includes(member.role)) {
        throw CustomException('Only firm owners and admins can install plugins', 403);
    }

    const installation = await pluginService.installPlugin(id, firmId, userId, settings);

    // Initialize plugin for this firm
    const plugin = installation.pluginId;
    if (pluginLoaderService.isPluginLoaded(plugin.name)) {
        await pluginLoaderService.initializePluginForFirm(plugin.name, firmId, settings);
    }

    res.status(201).json({
        success: true,
        message: 'Plugin installed successfully',
        data: installation
    });
});

/**
 * Uninstall a plugin
 * DELETE /api/plugins/:id/uninstall
 */
const uninstallPlugin = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;
    const userId = req.userID;

    // Check firm permissions
    const firm = await Firm.findById(firmId);
    const member = firm.members.find(m => m.userId.toString() === userId);

    if (!member || !['owner', 'admin'].includes(member.role)) {
        throw CustomException('Only firm owners and admins can uninstall plugins', 403);
    }

    const result = await pluginService.uninstallPlugin(id, firmId);

    res.json({
        success: true,
        message: result.message
    });
});

// ═══════════════════════════════════════════════════════════════
// PLUGIN CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/**
 * Get plugin installation details
 * GET /api/plugins/installations/:installationId
 */
const getInstallation = asyncHandler(async (req, res) => {
    const { installationId } = req.params;
    const firmId = req.firmId;

    const installation = await pluginService.getInstallationById(installationId);

    // Verify installation belongs to current firm
    if (installation.firmId.toString() !== firmId) {
        throw CustomException('Installation not found', 404);
    }

    res.json({
        success: true,
        data: installation
    });
});

/**
 * Update plugin settings
 * PATCH /api/plugins/installations/:installationId/settings
 */
const updateSettings = asyncHandler(async (req, res) => {
    const { installationId } = req.params;
    const firmId = req.firmId;
    const userId = req.userID;
    const { settings } = req.body;

    // Check firm permissions
    const firm = await Firm.findById(firmId);
    const member = firm.members.find(m => m.userId.toString() === userId);

    if (!member || !['owner', 'admin'].includes(member.role)) {
        throw CustomException('Only firm owners and admins can update plugin settings', 403);
    }

    const installation = await pluginService.getInstallationById(installationId);

    // Verify installation belongs to current firm
    if (installation.firmId.toString() !== firmId) {
        throw CustomException('Installation not found', 404);
    }

    const updated = await pluginService.updatePluginSettings(installationId, settings, userId);

    res.json({
        success: true,
        message: 'Plugin settings updated successfully',
        data: updated
    });
});

/**
 * Enable a plugin
 * POST /api/plugins/installations/:installationId/enable
 */
const enablePlugin = asyncHandler(async (req, res) => {
    const { installationId } = req.params;
    const firmId = req.firmId;
    const userId = req.userID;

    // Check firm permissions
    const firm = await Firm.findById(firmId);
    const member = firm.members.find(m => m.userId.toString() === userId);

    if (!member || !['owner', 'admin'].includes(member.role)) {
        throw CustomException('Only firm owners and admins can enable plugins', 403);
    }

    const installation = await pluginService.getInstallationById(installationId);

    // Verify installation belongs to current firm
    if (installation.firmId.toString() !== firmId) {
        throw CustomException('Installation not found', 404);
    }

    const updated = await pluginService.enablePlugin(installationId, userId);

    res.json({
        success: true,
        message: 'Plugin enabled successfully',
        data: updated
    });
});

/**
 * Disable a plugin
 * POST /api/plugins/installations/:installationId/disable
 */
const disablePlugin = asyncHandler(async (req, res) => {
    const { installationId } = req.params;
    const firmId = req.firmId;
    const userId = req.userID;

    // Check firm permissions
    const firm = await Firm.findById(firmId);
    const member = firm.members.find(m => m.userId.toString() === userId);

    if (!member || !['owner', 'admin'].includes(member.role)) {
        throw CustomException('Only firm owners and admins can disable plugins', 403);
    }

    const installation = await pluginService.getInstallationById(installationId);

    // Verify installation belongs to current firm
    if (installation.firmId.toString() !== firmId) {
        throw CustomException('Installation not found', 404);
    }

    const updated = await pluginService.disablePlugin(installationId, userId);

    res.json({
        success: true,
        message: 'Plugin disabled successfully',
        data: updated
    });
});

// ═══════════════════════════════════════════════════════════════
// PLUGIN ADMINISTRATION (System Admin Only)
// ═══════════════════════════════════════════════════════════════

/**
 * Register a new plugin (System Admin Only)
 * POST /api/plugins/register
 */
const registerPlugin = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const pluginConfig = req.body;

    // Verify user is system admin
    const user = await require('../models/user.model').findById(userId);
    if (user.role !== 'admin') {
        throw CustomException('Only system administrators can register plugins', 403);
    }

    // Validate plugin structure
    const validation = pluginService.validatePlugin(pluginConfig);
    if (!validation.valid) {
        throw CustomException(`Invalid plugin configuration: ${validation.errors.join(', ')}`, 400);
    }

    const plugin = await pluginService.registerPlugin(pluginConfig);

    // Load the plugin
    try {
        await pluginLoaderService.loadPlugin(plugin.entryPoint, plugin);
    } catch (error) {
        console.error('[PluginController] Failed to load newly registered plugin:', error);
        // Don't fail the registration, just log the error
    }

    res.status(201).json({
        success: true,
        message: 'Plugin registered successfully',
        data: plugin.getManifest()
    });
});

/**
 * Get all plugins (System Admin Only)
 * GET /api/plugins/all
 */
const getAllPlugins = asyncHandler(async (req, res) => {
    const userId = req.userID;

    // Verify user is system admin
    const user = await require('../models/user.model').findById(userId);
    if (user.role !== 'admin') {
        throw CustomException('Only system administrators can view all plugins', 403);
    }

    const Plugin = require('../models/plugin.model');
    const plugins = await Plugin.find().sort({ createdAt: -1 });

    res.json({
        success: true,
        data: plugins,
        count: plugins.length
    });
});

/**
 * Get plugin statistics
 * GET /api/plugins/:id/stats
 */
const getPluginStats = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const stats = await pluginService.getPluginStats(id);

    res.json({
        success: true,
        data: stats
    });
});

/**
 * Reload a plugin (System Admin Only)
 * POST /api/plugins/:id/reload
 */
const reloadPlugin = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    // Verify user is system admin
    const user = await require('../models/user.model').findById(userId);
    if (user.role !== 'admin') {
        throw CustomException('Only system administrators can reload plugins', 403);
    }

    const result = await pluginLoaderService.reloadPlugin(id);

    res.json({
        success: true,
        message: result.message,
        data: result
    });
});

/**
 * Get plugin loader statistics (System Admin Only)
 * GET /api/plugins/loader/stats
 */
const getLoaderStats = asyncHandler(async (req, res) => {
    const userId = req.userID;

    // Verify user is system admin
    const user = await require('../models/user.model').findById(userId);
    if (user.role !== 'admin') {
        throw CustomException('Only system administrators can view loader stats', 403);
    }

    const stats = pluginLoaderService.getLoaderStats();
    const loadedPlugins = pluginLoaderService.getLoadedPlugins();

    res.json({
        success: true,
        data: {
            ...stats,
            loadedPluginNames: loadedPlugins
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// HOOK EXECUTION
// ═══════════════════════════════════════════════════════════════

/**
 * Execute a hook manually (for testing)
 * POST /api/plugins/hooks/execute
 */
const executeHook = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const { hookName, data } = req.body;

    if (!hookName) {
        throw CustomException('Hook name is required', 400);
    }

    const results = await pluginLoaderService.executeEventHooks(hookName, data, firmId);

    res.json({
        success: true,
        message: `Executed ${results.length} hooks`,
        data: results
    });
});

module.exports = {
    // Public endpoints
    getAvailablePlugins,
    getInstalledPlugins,
    getPlugin,
    searchPlugins,

    // Installation
    installPlugin,
    uninstallPlugin,

    // Configuration
    getInstallation,
    updateSettings,
    enablePlugin,
    disablePlugin,

    // Administration
    registerPlugin,
    getAllPlugins,
    getPluginStats,
    reloadPlugin,
    getLoaderStats,

    // Hooks
    executeHook
};
