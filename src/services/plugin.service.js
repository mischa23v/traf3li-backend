/**
 * Plugin Service
 *
 * Business logic for plugin management, installation, and execution.
 */

const Plugin = require('../models/plugin.model');
const PluginInstallation = require('../models/pluginInstallation.model');
const { CustomException } = require('../utils');

/**
 * Register a new plugin
 * @param {Object} pluginConfig - Plugin configuration
 * @returns {Promise<Object>} Created plugin
 */
const registerPlugin = async (pluginConfig) => {
    // Validate required fields
    if (!pluginConfig.name) {
        throw CustomException('Plugin name is required', 400);
    }

    if (!pluginConfig.entryPoint) {
        throw CustomException('Plugin entryPoint is required', 400);
    }

    // Check if plugin already exists
    const existingPlugin = await Plugin.findOne({ name: pluginConfig.name });
    if (existingPlugin) {
        throw CustomException(`Plugin with name '${pluginConfig.name}' already exists`, 409);
    }

    // Validate category
    const validCategories = ['integration', 'automation', 'reporting', 'ui', 'workflow', 'utility'];
    if (pluginConfig.category && !validCategories.includes(pluginConfig.category)) {
        throw CustomException(`Invalid category. Must be one of: ${validCategories.join(', ')}`, 400);
    }

    // Create the plugin
    const plugin = await Plugin.create({
        name: pluginConfig.name,
        displayName: pluginConfig.displayName || pluginConfig.name,
        description: pluginConfig.description,
        version: pluginConfig.version || '1.0.0',
        author: pluginConfig.author,
        category: pluginConfig.category || 'utility',
        entryPoint: pluginConfig.entryPoint,
        permissions: pluginConfig.permissions || [],
        settings: pluginConfig.settings || {},
        hooks: pluginConfig.hooks || [],
        routes: pluginConfig.routes || [],
        isSystem: pluginConfig.isSystem || false,
        isActive: pluginConfig.isActive !== false,
        dependencies: pluginConfig.dependencies || [],
        icon: pluginConfig.icon,
        screenshots: pluginConfig.screenshots || [],
        documentation: pluginConfig.documentation,
        supportUrl: pluginConfig.supportUrl,
        repositoryUrl: pluginConfig.repositoryUrl
    });

    return plugin;
};

/**
 * Install plugin for a firm
 * @param {String} pluginId - Plugin ID
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID who is installing
 * @param {Object} settings - Initial plugin settings
 * @returns {Promise<Object>} Plugin installation
 */
const installPlugin = async (pluginId, firmId, userId, settings = {}) => {
    // Check if plugin exists
    const plugin = await Plugin.findById(pluginId);
    if (!plugin) {
        throw CustomException('Plugin not found', 404);
    }

    if (!plugin.isActive) {
        throw CustomException('Plugin is not active and cannot be installed', 400);
    }

    // Check if already installed
    const existingInstallation = await PluginInstallation.findOne({ pluginId, firmId });
    if (existingInstallation) {
        throw CustomException('Plugin is already installed for this firm', 409);
    }

    // Validate settings against plugin schema
    const validation = plugin.validateConfig(settings);
    if (!validation.valid) {
        throw CustomException(`Invalid plugin settings: ${validation.errors.join(', ')}`, 400);
    }

    // Check dependencies
    if (plugin.dependencies && plugin.dependencies.length > 0) {
        for (const depName of plugin.dependencies) {
            const depPlugin = await Plugin.findOne({ name: depName });
            if (!depPlugin) {
                throw CustomException(`Dependency plugin '${depName}' not found`, 400);
            }

            const depInstalled = await PluginInstallation.isInstalled(depPlugin._id, firmId);
            if (!depInstalled) {
                throw CustomException(`Dependency plugin '${depName}' must be installed first`, 400);
            }
        }
    }

    // Create installation
    const installation = await PluginInstallation.create({
        pluginId,
        firmId,
        isEnabled: true,
        settings,
        installedAt: new Date(),
        installedBy: userId,
        installedVersion: plugin.version,
        currentVersion: plugin.version
    });

    // Update plugin install count
    await Plugin.findByIdAndUpdate(pluginId, { $inc: { installCount: 1 } });

    // Populate and return
    return PluginInstallation.findById(installation._id)
        .populate('pluginId')
        .populate('installedBy', 'firstName lastName email');
};

/**
 * Uninstall plugin from a firm
 * @param {String} pluginId - Plugin ID
 * @param {String} firmId - Firm ID
 * @returns {Promise<Object>} Result
 */
const uninstallPlugin = async (pluginId, firmId) => {
    const installation = await PluginInstallation.findOne({ pluginId, firmId });

    if (!installation) {
        throw CustomException('Plugin is not installed for this firm', 404);
    }

    // Check if other plugins depend on this one
    const plugin = await Plugin.findById(pluginId);
    if (plugin) {
        const dependentPlugins = await Plugin.find({ dependencies: plugin.name });

        if (dependentPlugins.length > 0) {
            // Check if any dependent plugins are installed
            for (const depPlugin of dependentPlugins) {
                const depInstalled = await PluginInstallation.isInstalled(depPlugin._id, firmId);
                if (depInstalled) {
                    throw CustomException(
                        `Cannot uninstall: Plugin '${depPlugin.displayName}' depends on this plugin`,
                        400
                    );
                }
            }
        }
    }

    // Delete installation
    await PluginInstallation.findByIdAndDelete(installation._id);

    // Update plugin install count
    await Plugin.findByIdAndUpdate(pluginId, { $inc: { installCount: -1 } });

    return {
        success: true,
        message: 'Plugin uninstalled successfully'
    };
};

/**
 * Enable a plugin installation
 * @param {String} installationId - Installation ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Updated installation
 */
const enablePlugin = async (installationId, userId) => {
    const installation = await PluginInstallation.findById(installationId);

    if (!installation) {
        throw CustomException('Plugin installation not found', 404);
    }

    if (installation.isEnabled) {
        throw CustomException('Plugin is already enabled', 400);
    }

    await installation.enable(userId);

    return PluginInstallation.findById(installationId)
        .populate('pluginId')
        .populate('lastUpdatedBy', 'firstName lastName email');
};

/**
 * Disable a plugin installation
 * @param {String} installationId - Installation ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Updated installation
 */
const disablePlugin = async (installationId, userId) => {
    const installation = await PluginInstallation.findById(installationId);

    if (!installation) {
        throw CustomException('Plugin installation not found', 404);
    }

    if (!installation.isEnabled) {
        throw CustomException('Plugin is already disabled', 400);
    }

    await installation.disable(userId);

    return PluginInstallation.findById(installationId)
        .populate('pluginId')
        .populate('lastUpdatedBy', 'firstName lastName email');
};

/**
 * Update plugin settings for a firm
 * @param {String} installationId - Installation ID
 * @param {Object} settings - New settings
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Updated installation
 */
const updatePluginSettings = async (installationId, settings, userId) => {
    const installation = await PluginInstallation.findById(installationId).populate('pluginId');

    if (!installation) {
        throw CustomException('Plugin installation not found', 404);
    }

    // Validate settings against plugin schema
    const validation = installation.pluginId.validateConfig(settings);
    if (!validation.valid) {
        throw CustomException(`Invalid plugin settings: ${validation.errors.join(', ')}`, 400);
    }

    await installation.updateSettings(settings, userId);

    return PluginInstallation.findById(installationId)
        .populate('pluginId')
        .populate('lastUpdatedBy', 'firstName lastName email');
};

/**
 * Get installed plugins for a firm
 * @param {String} firmId - Firm ID
 * @param {Boolean} enabledOnly - Only return enabled plugins
 * @returns {Promise<Array>} Array of installations
 */
const getInstalledPlugins = async (firmId, enabledOnly = false) => {
    if (enabledOnly) {
        return PluginInstallation.getEnabledForFirm(firmId);
    }
    return PluginInstallation.getAllForFirm(firmId);
};

/**
 * Get available plugins (not yet installed for firm)
 * @param {String} firmId - Firm ID
 * @param {String} category - Optional category filter
 * @returns {Promise<Array>} Array of available plugins
 */
const getAvailablePlugins = async (firmId, category = null) => {
    // Get all active plugins
    const allPlugins = await Plugin.findAvailable(category);

    // Get installed plugin IDs for this firm
    const installations = await PluginInstallation.find({ firmId }).select('pluginId');
    const installedPluginIds = installations.map(inst => inst.pluginId.toString());

    // Filter out installed plugins
    const availablePlugins = allPlugins.filter(plugin =>
        !installedPluginIds.includes(plugin._id.toString())
    );

    return availablePlugins.map(plugin => plugin.getManifest());
};

/**
 * Execute a hook for all enabled plugins
 * @param {String} hookName - Hook event name
 * @param {Object} data - Data to pass to hook handlers
 * @param {String} firmId - Firm ID
 * @returns {Promise<Array>} Results from hook executions
 */
const executeHook = async (hookName, data, firmId) => {
    // Get enabled installations for this firm
    const installations = await PluginInstallation.getEnabledForFirm(firmId);

    const results = [];

    for (const installation of installations) {
        const plugin = installation.pluginId;

        // Find hooks that match this event
        const matchingHooks = plugin.hooks.filter(hook => hook.event === hookName);

        for (const hook of matchingHooks) {
            try {
                // Dynamic import of plugin module would happen here
                // For now, we'll just track the execution
                await installation.trackUsage('hook');

                results.push({
                    pluginName: plugin.name,
                    hook: hook.handler,
                    success: true,
                    executedAt: new Date()
                });
            } catch (error) {
                // Record error
                await installation.recordError(error);

                results.push({
                    pluginName: plugin.name,
                    hook: hook.handler,
                    success: false,
                    error: error.message,
                    executedAt: new Date()
                });
            }
        }
    }

    return results;
};

/**
 * Validate plugin configuration structure
 * @param {Object} pluginConfig - Plugin configuration to validate
 * @returns {Object} Validation result
 */
const validatePlugin = (pluginConfig) => {
    const errors = [];

    // Required fields
    if (!pluginConfig.name) {
        errors.push('Plugin name is required');
    }

    if (!pluginConfig.entryPoint) {
        errors.push('Plugin entryPoint is required');
    }

    // Validate name format (lowercase, alphanumeric, hyphens only)
    if (pluginConfig.name && !/^[a-z0-9-]+$/.test(pluginConfig.name)) {
        errors.push('Plugin name must be lowercase alphanumeric with hyphens only');
    }

    // Validate version format (semantic versioning)
    if (pluginConfig.version && !/^\d+\.\d+\.\d+$/.test(pluginConfig.version)) {
        errors.push('Plugin version must follow semantic versioning (e.g., 1.0.0)');
    }

    // Validate category
    const validCategories = ['integration', 'automation', 'reporting', 'ui', 'workflow', 'utility'];
    if (pluginConfig.category && !validCategories.includes(pluginConfig.category)) {
        errors.push(`Category must be one of: ${validCategories.join(', ')}`);
    }

    // Validate hooks
    if (pluginConfig.hooks && Array.isArray(pluginConfig.hooks)) {
        pluginConfig.hooks.forEach((hook, index) => {
            if (!hook.event) {
                errors.push(`Hook at index ${index} is missing 'event' field`);
            }
            if (!hook.handler) {
                errors.push(`Hook at index ${index} is missing 'handler' field`);
            }
        });
    }

    // Validate routes
    if (pluginConfig.routes && Array.isArray(pluginConfig.routes)) {
        const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
        pluginConfig.routes.forEach((route, index) => {
            if (!route.method) {
                errors.push(`Route at index ${index} is missing 'method' field`);
            } else if (!validMethods.includes(route.method)) {
                errors.push(`Route at index ${index} has invalid method. Must be one of: ${validMethods.join(', ')}`);
            }
            if (!route.path) {
                errors.push(`Route at index ${index} is missing 'path' field`);
            }
            if (!route.handler) {
                errors.push(`Route at index ${index} is missing 'handler' field`);
            }
        });
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

/**
 * Get plugin by ID
 * @param {String} pluginId - Plugin ID
 * @returns {Promise<Object>} Plugin
 */
const getPluginById = async (pluginId) => {
    const plugin = await Plugin.findById(pluginId);
    if (!plugin) {
        throw CustomException('Plugin not found', 404);
    }
    return plugin;
};

/**
 * Get plugin installation by ID
 * @param {String} installationId - Installation ID
 * @returns {Promise<Object>} Installation
 */
const getInstallationById = async (installationId) => {
    const installation = await PluginInstallation.findById(installationId)
        .populate('pluginId')
        .populate('installedBy', 'firstName lastName email')
        .populate('lastUpdatedBy', 'firstName lastName email');

    if (!installation) {
        throw CustomException('Plugin installation not found', 404);
    }
    return installation;
};

/**
 * Search plugins
 * @param {String} searchTerm - Search term
 * @param {String} firmId - Optional firm ID to exclude installed plugins
 * @returns {Promise<Array>} Matching plugins
 */
const searchPlugins = async (searchTerm, firmId = null) => {
    const plugins = await Plugin.searchPlugins(searchTerm);

    if (firmId) {
        // Get installed plugin IDs for this firm
        const installations = await PluginInstallation.find({ firmId }).select('pluginId');
        const installedPluginIds = installations.map(inst => inst.pluginId.toString());

        // Add isInstalled flag
        return plugins.map(plugin => ({
            ...plugin.getManifest(),
            isInstalled: installedPluginIds.includes(plugin._id.toString())
        }));
    }

    return plugins.map(plugin => plugin.getManifest());
};

/**
 * Get plugin statistics
 * @param {String} pluginId - Plugin ID
 * @returns {Promise<Object>} Statistics
 */
const getPluginStats = async (pluginId) => {
    const plugin = await Plugin.findById(pluginId);
    if (!plugin) {
        throw CustomException('Plugin not found', 404);
    }

    const installations = await PluginInstallation.find({ pluginId });
    const enabledInstallations = installations.filter(inst => inst.isEnabled);

    // Calculate aggregate statistics
    const totalUsage = installations.reduce((sum, inst) =>
        sum + (inst.statistics?.usageCount || 0), 0
    );
    const totalHookExecutions = installations.reduce((sum, inst) =>
        sum + (inst.statistics?.hookExecutions || 0), 0
    );
    const totalApiCalls = installations.reduce((sum, inst) =>
        sum + (inst.statistics?.apiCalls || 0), 0
    );
    const totalErrors = installations.reduce((sum, inst) =>
        sum + (inst.errorCount || 0), 0
    );

    return {
        plugin: plugin.getManifest(),
        installations: {
            total: installations.length,
            enabled: enabledInstallations.length,
            disabled: installations.length - enabledInstallations.length
        },
        usage: {
            total: totalUsage,
            hookExecutions: totalHookExecutions,
            apiCalls: totalApiCalls
        },
        errors: {
            total: totalErrors,
            rate: installations.length > 0 ? (totalErrors / installations.length).toFixed(2) : 0
        }
    };
};

module.exports = {
    registerPlugin,
    installPlugin,
    uninstallPlugin,
    enablePlugin,
    disablePlugin,
    updatePluginSettings,
    getInstalledPlugins,
    getAvailablePlugins,
    executeHook,
    validatePlugin,
    getPluginById,
    getInstallationById,
    searchPlugins,
    getPluginStats
};
