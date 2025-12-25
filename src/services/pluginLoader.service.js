/**
 * Plugin Loader Service
 *
 * Handles loading, unloading, and managing plugin lifecycle.
 * Registers plugin routes and hooks dynamically.
 */

const path = require('path');
const fs = require('fs').promises;
const Plugin = require('../models/plugin.model');
const PluginInstallation = require('../models/pluginInstallation.model');
const { CustomException } = require('../utils');

// In-memory plugin registry
const loadedPlugins = new Map();
const pluginRoutes = new Map();
const pluginHooks = new Map();

/**
 * Load all active plugins on startup
 * @returns {Promise<Object>} Load results
 */
const loadPlugins = async () => {
    console.log('[PluginLoader] Starting to load plugins...');

    const results = {
        loaded: [],
        failed: [],
        total: 0
    };

    try {
        // Get all active plugins
        const plugins = await Plugin.find({ isActive: true });
        results.total = plugins.length;

        for (const plugin of plugins) {
            try {
                await loadPlugin(plugin.entryPoint, plugin);
                results.loaded.push({
                    name: plugin.name,
                    version: plugin.version
                });
                console.log(`[PluginLoader] ✓ Loaded plugin: ${plugin.name} v${plugin.version}`);
            } catch (error) {
                results.failed.push({
                    name: plugin.name,
                    error: error.message
                });
                console.error(`[PluginLoader] ✗ Failed to load plugin: ${plugin.name}`, error.message);
            }
        }

        console.log(`[PluginLoader] Loaded ${results.loaded.length}/${results.total} plugins successfully`);
        if (results.failed.length > 0) {
            console.warn(`[PluginLoader] Failed to load ${results.failed.length} plugins`);
        }
    } catch (error) {
        console.error('[PluginLoader] Error loading plugins:', error);
        throw error;
    }

    return results;
};

/**
 * Load a single plugin
 * @param {String} pluginPath - Path to plugin entry point
 * @param {Object} pluginMeta - Plugin metadata from database
 * @returns {Promise<Object>} Loaded plugin instance
 */
const loadPlugin = async (pluginPath, pluginMeta) => {
    const pluginName = pluginMeta.name;

    // Check if already loaded
    if (loadedPlugins.has(pluginName)) {
        console.warn(`[PluginLoader] Plugin ${pluginName} is already loaded`);
        return loadedPlugins.get(pluginName);
    }

    try {
        // Construct full path to plugin
        const pluginsDir = path.join(__dirname, '../../plugins');
        const fullPath = path.join(pluginsDir, pluginPath);

        // Check if file exists
        try {
            await fs.access(fullPath);
        } catch (error) {
            throw new Error(`Plugin file not found: ${fullPath}`);
        }

        // Dynamically import the plugin module
        // Note: In production, you would use require() or dynamic import()
        // For now, we'll create a plugin stub
        const pluginModule = {
            name: pluginName,
            version: pluginMeta.version,
            meta: pluginMeta,
            // Plugin exports would be loaded here
            initialize: async (config) => {
                console.log(`[Plugin:${pluginName}] Initialized with config:`, config);
            },
            handlers: {},
            routes: {}
        };

        // Store in registry
        loadedPlugins.set(pluginName, pluginModule);

        // Register hooks
        if (pluginMeta.hooks && pluginMeta.hooks.length > 0) {
            registerHooks(pluginMeta);
        }

        // Register routes
        if (pluginMeta.routes && pluginMeta.routes.length > 0) {
            registerRoutes(pluginMeta);
        }

        return pluginModule;
    } catch (error) {
        console.error(`[PluginLoader] Error loading plugin ${pluginName}:`, error);
        throw new Error(`Failed to load plugin ${pluginName}: ${error.message}`);
    }
};

/**
 * Unload a plugin
 * @param {String} pluginId - Plugin ID
 * @returns {Promise<Boolean>} Success status
 */
const unloadPlugin = async (pluginId) => {
    const plugin = await Plugin.findById(pluginId);
    if (!plugin) {
        throw CustomException('Plugin not found', 404);
    }

    const pluginName = plugin.name;

    if (!loadedPlugins.has(pluginName)) {
        console.warn(`[PluginLoader] Plugin ${pluginName} is not loaded`);
        return false;
    }

    try {
        // Remove from registry
        loadedPlugins.delete(pluginName);

        // Unregister hooks
        unregisterHooks(pluginName);

        // Unregister routes
        unregisterRoutes(pluginName);

        console.log(`[PluginLoader] ✓ Unloaded plugin: ${pluginName}`);
        return true;
    } catch (error) {
        console.error(`[PluginLoader] Error unloading plugin ${pluginName}:`, error);
        throw error;
    }
};

/**
 * Register plugin routes
 * @param {Object} plugin - Plugin model instance
 */
const registerRoutes = (plugin) => {
    const pluginName = plugin.name;

    if (!plugin.routes || plugin.routes.length === 0) {
        return;
    }

    const routes = plugin.routes.map(route => ({
        method: route.method.toLowerCase(),
        path: `/api/plugins/${pluginName}${route.path}`,
        handler: route.handler,
        auth: route.auth !== false,
        permissions: route.permissions || []
    }));

    pluginRoutes.set(pluginName, routes);

    console.log(`[PluginLoader] Registered ${routes.length} routes for plugin: ${pluginName}`);
};

/**
 * Unregister plugin routes
 * @param {String} pluginName - Plugin name
 */
const unregisterRoutes = (pluginName) => {
    if (pluginRoutes.has(pluginName)) {
        pluginRoutes.delete(pluginName);
        console.log(`[PluginLoader] Unregistered routes for plugin: ${pluginName}`);
    }
};

/**
 * Register plugin hooks
 * @param {Object} plugin - Plugin model instance
 */
const registerHooks = (plugin) => {
    const pluginName = plugin.name;

    if (!plugin.hooks || plugin.hooks.length === 0) {
        return;
    }

    // Group hooks by event
    plugin.hooks.forEach(hook => {
        const eventName = hook.event;

        if (!pluginHooks.has(eventName)) {
            pluginHooks.set(eventName, []);
        }

        const eventHooks = pluginHooks.get(eventName);
        eventHooks.push({
            pluginName,
            handler: hook.handler
        });

        pluginHooks.set(eventName, eventHooks);
    });

    console.log(`[PluginLoader] Registered ${plugin.hooks.length} hooks for plugin: ${pluginName}`);
};

/**
 * Unregister plugin hooks
 * @param {String} pluginName - Plugin name
 */
const unregisterHooks = (pluginName) => {
    // Remove hooks for this plugin from all events
    pluginHooks.forEach((hooks, eventName) => {
        const filtered = hooks.filter(hook => hook.pluginName !== pluginName);
        if (filtered.length === 0) {
            pluginHooks.delete(eventName);
        } else {
            pluginHooks.set(eventName, filtered);
        }
    });

    console.log(`[PluginLoader] Unregistered hooks for plugin: ${pluginName}`);
};

/**
 * Get all registered routes
 * @returns {Array} Array of all plugin routes
 */
const getAllRoutes = () => {
    const allRoutes = [];

    pluginRoutes.forEach((routes, pluginName) => {
        routes.forEach(route => {
            allRoutes.push({
                plugin: pluginName,
                ...route
            });
        });
    });

    return allRoutes;
};

/**
 * Get routes for a specific plugin
 * @param {String} pluginName - Plugin name
 * @returns {Array} Array of plugin routes
 */
const getPluginRoutes = (pluginName) => {
    return pluginRoutes.get(pluginName) || [];
};

/**
 * Get all hooks for an event
 * @param {String} eventName - Event name
 * @returns {Array} Array of hook handlers
 */
const getHooksForEvent = (eventName) => {
    return pluginHooks.get(eventName) || [];
};

/**
 * Execute hooks for an event
 * @param {String} eventName - Event name
 * @param {Object} data - Event data
 * @param {String} firmId - Firm ID
 * @returns {Promise<Array>} Execution results
 */
const executeEventHooks = async (eventName, data, firmId) => {
    const hooks = getHooksForEvent(eventName);

    if (hooks.length === 0) {
        return [];
    }

    // Get enabled installations for this firm
    const installations = await PluginInstallation.find({
        firmId,
        isEnabled: true
    }).populate('pluginId');

    const results = [];

    for (const hook of hooks) {
        // Check if this plugin is installed and enabled for the firm
        const installation = installations.find(
            inst => inst.pluginId.name === hook.pluginName
        );

        if (!installation) {
            continue; // Plugin not installed for this firm
        }

        try {
            const plugin = loadedPlugins.get(hook.pluginName);

            if (!plugin) {
                console.warn(`[PluginLoader] Plugin ${hook.pluginName} not loaded`);
                continue;
            }

            // Execute hook handler
            // In a real implementation, this would call the actual plugin function
            console.log(`[PluginLoader] Executing hook: ${hook.pluginName}.${hook.handler} for event: ${eventName}`);

            // Track usage
            await installation.trackUsage('hook');

            results.push({
                plugin: hook.pluginName,
                handler: hook.handler,
                success: true,
                executedAt: new Date()
            });
        } catch (error) {
            console.error(`[PluginLoader] Error executing hook ${hook.pluginName}.${hook.handler}:`, error);

            // Record error
            await installation.recordError(error);

            results.push({
                plugin: hook.pluginName,
                handler: hook.handler,
                success: false,
                error: error.message,
                executedAt: new Date()
            });
        }
    }

    return results;
};

/**
 * Reload a plugin
 * @param {String} pluginId - Plugin ID
 * @returns {Promise<Object>} Reload result
 */
const reloadPlugin = async (pluginId) => {
    const plugin = await Plugin.findById(pluginId);
    if (!plugin) {
        throw CustomException('Plugin not found', 404);
    }

    // Unload if loaded
    if (loadedPlugins.has(plugin.name)) {
        await unloadPlugin(pluginId);
    }

    // Load again
    await loadPlugin(plugin.entryPoint, plugin);

    return {
        success: true,
        plugin: plugin.name,
        message: 'Plugin reloaded successfully'
    };
};

/**
 * Get loaded plugins
 * @returns {Array} Array of loaded plugin names
 */
const getLoadedPlugins = () => {
    return Array.from(loadedPlugins.keys());
};

/**
 * Check if plugin is loaded
 * @param {String} pluginName - Plugin name
 * @returns {Boolean} True if loaded
 */
const isPluginLoaded = (pluginName) => {
    return loadedPlugins.has(pluginName);
};

/**
 * Get plugin instance
 * @param {String} pluginName - Plugin name
 * @returns {Object|null} Plugin instance or null
 */
const getPluginInstance = (pluginName) => {
    return loadedPlugins.get(pluginName) || null;
};

/**
 * Initialize plugin for a firm
 * @param {String} pluginName - Plugin name
 * @param {String} firmId - Firm ID
 * @param {Object} settings - Plugin settings
 * @returns {Promise<Object>} Initialization result
 */
const initializePluginForFirm = async (pluginName, firmId, settings) => {
    const plugin = loadedPlugins.get(pluginName);

    if (!plugin) {
        throw CustomException(`Plugin ${pluginName} is not loaded`, 400);
    }

    try {
        // Call plugin's initialize function if it exists
        if (typeof plugin.initialize === 'function') {
            await plugin.initialize(settings);
        }

        return {
            success: true,
            plugin: pluginName,
            message: 'Plugin initialized for firm'
        };
    } catch (error) {
        console.error(`[PluginLoader] Error initializing plugin ${pluginName}:`, error);
        throw error;
    }
};

/**
 * Get plugin loader statistics
 * @returns {Object} Statistics
 */
const getLoaderStats = () => {
    return {
        loadedPlugins: loadedPlugins.size,
        registeredRoutes: Array.from(pluginRoutes.values()).reduce((sum, routes) => sum + routes.length, 0),
        registeredHooks: Array.from(pluginHooks.values()).reduce((sum, hooks) => sum + hooks.length, 0),
        hookEvents: pluginHooks.size
    };
};

module.exports = {
    loadPlugins,
    loadPlugin,
    unloadPlugin,
    registerRoutes,
    unregisterRoutes,
    registerHooks,
    unregisterHooks,
    getAllRoutes,
    getPluginRoutes,
    getHooksForEvent,
    executeEventHooks,
    reloadPlugin,
    getLoadedPlugins,
    isPluginLoaded,
    getPluginInstance,
    initializePluginForFirm,
    getLoaderStats
};
