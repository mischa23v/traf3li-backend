/**
 * Module Manifest Definition
 *
 * Defines the structure and metadata for a module in the system.
 * Modules can declare dependencies, services, routes, models, queues, and middlewares.
 */

/**
 * Define a module with its configuration
 * @param {Object} config - Module configuration
 * @param {string} config.name - Module name (unique identifier)
 * @param {string} [config.version='1.0.0'] - Module version
 * @param {string[]} [config.depends=[]] - Array of module names this module depends on
 * @param {string} config.description - Module description
 * @param {string[]} [config.services=[]] - Array of service names to load
 * @param {string[]} [config.routes=[]] - Array of route names to load
 * @param {string[]} [config.models=[]] - Array of model names to load
 * @param {string[]} [config.queues=[]] - Array of queue names to load
 * @param {string[]} [config.middlewares=[]] - Array of middleware names to load
 * @param {boolean} [config.autoInstall=false] - Whether to auto-install this module
 * @param {string} [config.category='general'] - Module category for grouping
 * @returns {Object} Module manifest object
 */
const defineModule = (config) => ({
  name: config.name,
  version: config.version || '1.0.0',
  depends: config.depends || [],
  description: config.description,
  services: config.services || [],
  routes: config.routes || [],
  models: config.models || [],
  queues: config.queues || [],
  middlewares: config.middlewares || [],
  autoInstall: config.autoInstall || false,
  category: config.category || 'general',
});

module.exports = {
  defineModule
};
