/**
 * Module Registry
 *
 * Central registry for all modules in the system.
 * Handles module registration, dependency resolution, and loading order.
 */

const modules = new Map();

/**
 * Register a module in the registry
 * @param {Object} manifest - Module manifest
 * @returns {boolean} Success status
 */
const registerModule = (manifest) => {
  if (!manifest.name) {
    throw new Error('Module must have a name');
  }

  if (modules.has(manifest.name)) {
    console.warn(`Module "${manifest.name}" is already registered. Skipping.`);
    return false;
  }

  modules.set(manifest.name, {
    ...manifest,
    loaded: false,
    initialized: false
  });

  console.log(`✓ Registered module: ${manifest.name} v${manifest.version}`);
  return true;
};

/**
 * Get a module by name
 * @param {string} name - Module name
 * @returns {Object|undefined} Module manifest or undefined
 */
const getModule = (name) => {
  return modules.get(name);
};

/**
 * Get all registered modules
 * @returns {Array} Array of all module manifests
 */
const getAllModules = () => {
  return Array.from(modules.values());
};

/**
 * Check if all dependencies for a module are satisfied
 * @param {string} moduleName - Module name to check
 * @returns {Object} { satisfied: boolean, missing: string[] }
 */
const checkDependencies = (moduleName) => {
  const module = modules.get(moduleName);

  if (!module) {
    throw new Error(`Module "${moduleName}" not found`);
  }

  const missing = [];

  for (const dep of module.depends) {
    if (!modules.has(dep)) {
      missing.push(dep);
    }
  }

  return {
    satisfied: missing.length === 0,
    missing
  };
};

/**
 * Get modules in dependency order (topological sort)
 * @returns {Array} Ordered array of module names
 */
const getDependencyOrder = () => {
  const sorted = [];
  const visited = new Set();
  const visiting = new Set();

  const visit = (name) => {
    if (visited.has(name)) return;
    if (visiting.has(name)) {
      throw new Error(`Circular dependency detected involving module: ${name}`);
    }

    visiting.add(name);

    const module = modules.get(name);
    if (!module) {
      throw new Error(`Module "${name}" not found`);
    }

    // Visit dependencies first
    for (const dep of module.depends) {
      visit(dep);
    }

    visiting.delete(name);
    visited.add(name);
    sorted.push(name);
  };

  // Visit all modules
  for (const name of modules.keys()) {
    visit(name);
  }

  return sorted;
};

/**
 * Load all modules in dependency order
 * @param {Object} [options={}] - Loading options
 * @param {boolean} [options.autoInstallOnly=false] - Only load modules with autoInstall=true
 * @returns {Array} Array of loaded module names
 */
const loadModules = (options = {}) => {
  const { autoInstallOnly = false } = options;

  try {
    const order = getDependencyOrder();
    const loaded = [];

    console.log('Module loading order:', order);

    for (const name of order) {
      const module = modules.get(name);

      // Skip if autoInstallOnly and module doesn't have autoInstall
      if (autoInstallOnly && !module.autoInstall) {
        continue;
      }

      // Check dependencies
      const depCheck = checkDependencies(name);
      if (!depCheck.satisfied) {
        console.error(`Cannot load "${name}": missing dependencies:`, depCheck.missing);
        continue;
      }

      loaded.push(name);
      module.loaded = true;
    }

    console.log(`Loaded ${loaded.length} modules:`, loaded);
    return loaded;
  } catch (error) {
    console.error('Error loading modules:', error.message);
    throw error;
  }
};

/**
 * Clear all registered modules (useful for testing)
 */
const clearModules = () => {
  modules.clear();
};

/**
 * Mark a module as initialized
 * @param {string} name - Module name
 */
const markModuleInitialized = (name) => {
  const module = modules.get(name);
  if (module) {
    module.initialized = true;
  }
};

module.exports = {
  registerModule,
  getModule,
  getAllModules,
  getDependencyOrder,
  checkDependencies,
  loadModules,
  clearModules,
  markModuleInitialized
};
