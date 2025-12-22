/**
 * Module System Entry Point
 *
 * Main entry point for the module system.
 * Provides a unified interface for module management.
 */

const { defineModule } = require('./manifest');
const registry = require('./registry');
const loader = require('./loader');

/**
 * Setup and initialize all modules
 * @param {Object} app - Express app instance
 * @param {Object} [options={}] - Setup options
 * @param {boolean} [options.autoInstallOnly=false] - Only load modules with autoInstall=true
 * @param {string[]} [options.modules=[]] - Specific modules to load (if empty, loads all)
 * @returns {Promise<Object>} Setup results
 */
const setupModules = async (app, options = {}) => {
  const { autoInstallOnly = false, modules: moduleNames = [] } = options;

  console.log('\n========================================');
  console.log('Module System Initialization');
  console.log('========================================\n');

  try {
    // Get modules to load
    let modulesToLoad;

    if (moduleNames.length > 0) {
      // Load specific modules
      modulesToLoad = moduleNames;
      console.log('Loading specific modules:', modulesToLoad);
    } else {
      // Load all modules (respecting autoInstallOnly)
      modulesToLoad = registry.loadModules({ autoInstallOnly });
    }

    const loadedModules = [];
    const failedModules = [];

    // Load and initialize each module
    for (const moduleName of modulesToLoad) {
      try {
        const manifest = registry.getModule(moduleName);

        if (!manifest) {
          console.warn(`Module "${moduleName}" not found in registry`);
          failedModules.push({ name: moduleName, error: 'Not found in registry' });
          continue;
        }

        // Load module components
        const components = loader.loadModule(manifest, app);

        // Initialize module
        await loader.initializeModule(manifest, components);

        loadedModules.push({
          name: moduleName,
          version: manifest.version,
          components
        });
      } catch (error) {
        console.error(`Failed to load module "${moduleName}":`, error.message);
        failedModules.push({ name: moduleName, error: error.message });
      }
    }

    console.log('\n========================================');
    console.log(`Module System Ready`);
    console.log(`Loaded: ${loadedModules.length} modules`);
    console.log(`Failed: ${failedModules.length} modules`);
    console.log('========================================\n');

    return {
      success: true,
      loaded: loadedModules,
      failed: failedModules,
      total: loadedModules.length
    };
  } catch (error) {
    console.error('\n========================================');
    console.error('Module System Initialization Failed');
    console.error('Error:', error.message);
    console.error('========================================\n');

    return {
      success: false,
      error: error.message,
      loaded: [],
      failed: [],
      total: 0
    };
  }
};

/**
 * Register a module from a manifest file
 * @param {string} manifestPath - Path to manifest file
 * @returns {boolean} Success status
 */
const registerModuleFromFile = (manifestPath) => {
  try {
    const manifest = require(manifestPath);
    return registry.registerModule(manifest);
  } catch (error) {
    console.error(`Failed to register module from "${manifestPath}":`, error.message);
    return false;
  }
};

/**
 * Get module system status
 * @returns {Object} Status information
 */
const getStatus = () => {
  const allModules = registry.getAllModules();

  return {
    totalModules: allModules.length,
    loadedModules: allModules.filter(m => m.loaded).length,
    initializedModules: allModules.filter(m => m.initialized).length,
    modules: allModules.map(m => ({
      name: m.name,
      version: m.version,
      category: m.category,
      loaded: m.loaded,
      initialized: m.initialized,
      autoInstall: m.autoInstall,
      depends: m.depends
    }))
  };
};

module.exports = {
  // Core exports
  defineModule,
  registry,
  loader,

  // Main setup function
  setupModules,

  // Utility functions
  registerModuleFromFile,
  getStatus,

  // Re-export commonly used registry functions
  registerModule: registry.registerModule,
  getModule: registry.getModule,
  getAllModules: registry.getAllModules,
  getDependencyOrder: registry.getDependencyOrder,
  checkDependencies: registry.checkDependencies
};
