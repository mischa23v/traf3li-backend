/**
 * Module Loader
 *
 * Handles the loading and initialization of module components:
 * - Services
 * - Routes
 * - Models
 * - Queues
 * - Middlewares
 */

const logger = require('../utils/logger');
const path = require('path');
const { markModuleInitialized } = require('./registry');

/**
 * Load and register services for a module
 * @param {Object} manifest - Module manifest
 * @returns {Object} Loaded services
 */
const loadServices = (manifest) => {
  const services = {};

  if (!manifest.services || manifest.services.length === 0) {
    return services;
  }

  logger.info(`  Loading services for module "${manifest.name}":`, manifest.services);

  for (const serviceName of manifest.services) {
    try {
      // Try multiple service naming conventions
      const possiblePaths = [
        path.join(process.cwd(), 'src', 'services', `${serviceName}.service.js`),
        path.join(process.cwd(), 'src', 'services', `${serviceName}Service.js`),
        path.join(process.cwd(), 'src', 'services', `${serviceName}.js`)
      ];

      let service = null;
      let loadedFrom = null;

      for (const servicePath of possiblePaths) {
        try {
          service = require(servicePath);
          loadedFrom = servicePath;
          break;
        } catch (err) {
          // Try next path
          continue;
        }
      }

      if (service) {
        services[serviceName] = service;
        logger.info(`    ✓ Loaded service: ${serviceName} from ${path.basename(loadedFrom)}`);
      } else {
        logger.warn(`    ✗ Service not found: ${serviceName}`);
      }
    } catch (error) {
      logger.error(`    ✗ Error loading service "${serviceName}":`, error.message);
    }
  }

  return services;
};

/**
 * Load and mount routes for a module
 * @param {Object} manifest - Module manifest
 * @param {Object} app - Express app instance
 * @returns {Object} Loaded routes
 */
const loadRoutes = (manifest, app) => {
  const routes = {};

  if (!manifest.routes || manifest.routes.length === 0) {
    return routes;
  }

  if (!app) {
    logger.warn(`  Cannot load routes for "${manifest.name}": app instance not provided`);
    return routes;
  }

  logger.info(`  Loading routes for module "${manifest.name}":`, manifest.routes);

  for (const routeName of manifest.routes) {
    try {
      // Try multiple route naming conventions
      const possiblePaths = [
        path.join(process.cwd(), 'src', 'routes', `${routeName}.route.js`),
        path.join(process.cwd(), 'src', 'routes', `${routeName}Route.js`),
        path.join(process.cwd(), 'src', 'routes', `${routeName}.js`)
      ];

      let route = null;
      let loadedFrom = null;

      for (const routePath of possiblePaths) {
        try {
          route = require(routePath);
          loadedFrom = routePath;
          break;
        } catch (err) {
          // Try next path
          continue;
        }
      }

      if (route) {
        // Mount the route
        const mountPath = `/api/${routeName}`;
        app.use(mountPath, route);
        routes[routeName] = route;
        logger.info(`    ✓ Mounted route: ${mountPath} from ${path.basename(loadedFrom)}`);
      } else {
        logger.warn(`    ✗ Route not found: ${routeName}`);
      }
    } catch (error) {
      logger.error(`    ✗ Error loading route "${routeName}":`, error.message);
    }
  }

  return routes;
};

/**
 * Load and register models for a module
 * @param {Object} manifest - Module manifest
 * @returns {Object} Loaded models
 */
const loadModels = (manifest) => {
  const models = {};

  if (!manifest.models || manifest.models.length === 0) {
    return models;
  }

  logger.info(`  Loading models for module "${manifest.name}":`, manifest.models);

  for (const modelName of manifest.models) {
    try {
      // Try multiple model naming conventions
      const possiblePaths = [
        path.join(process.cwd(), 'src', 'models', `${modelName}.model.js`),
        path.join(process.cwd(), 'src', 'models', `${modelName}Model.js`),
        path.join(process.cwd(), 'src', 'models', `${modelName}.js`)
      ];

      let model = null;
      let loadedFrom = null;

      for (const modelPath of possiblePaths) {
        try {
          model = require(modelPath);
          loadedFrom = modelPath;
          break;
        } catch (err) {
          // Try next path
          continue;
        }
      }

      if (model) {
        models[modelName] = model;
        logger.info(`    ✓ Loaded model: ${modelName} from ${path.basename(loadedFrom)}`);
      } else {
        logger.warn(`    ✗ Model not found: ${modelName}`);
      }
    } catch (error) {
      logger.error(`    ✗ Error loading model "${modelName}":`, error.message);
    }
  }

  return models;
};

/**
 * Load and register queues for a module
 * @param {Object} manifest - Module manifest
 * @returns {Object} Loaded queues
 */
const loadQueues = (manifest) => {
  const queues = {};

  if (!manifest.queues || manifest.queues.length === 0) {
    return queues;
  }

  logger.info(`  Loading queues for module "${manifest.name}":`, manifest.queues);

  for (const queueName of manifest.queues) {
    try {
      // Try multiple queue naming conventions
      const possiblePaths = [
        path.join(process.cwd(), 'src', 'queues', `${queueName}.queue.js`),
        path.join(process.cwd(), 'src', 'queues', `${queueName}Queue.js`),
        path.join(process.cwd(), 'src', 'queues', `${queueName}.js`)
      ];

      let queue = null;
      let loadedFrom = null;

      for (const queuePath of possiblePaths) {
        try {
          queue = require(queuePath);
          loadedFrom = queuePath;
          break;
        } catch (err) {
          // Try next path
          continue;
        }
      }

      if (queue) {
        queues[queueName] = queue;
        logger.info(`    ✓ Loaded queue: ${queueName} from ${path.basename(loadedFrom)}`);
      } else {
        logger.warn(`    ✗ Queue not found: ${queueName}`);
      }
    } catch (error) {
      logger.error(`    ✗ Error loading queue "${queueName}":`, error.message);
    }
  }

  return queues;
};

/**
 * Load and register middlewares for a module
 * @param {Object} manifest - Module manifest
 * @returns {Object} Loaded middlewares
 */
const loadMiddlewares = (manifest) => {
  const middlewares = {};

  if (!manifest.middlewares || manifest.middlewares.length === 0) {
    return middlewares;
  }

  logger.info(`  Loading middlewares for module "${manifest.name}":`, manifest.middlewares);

  for (const middlewareName of manifest.middlewares) {
    try {
      // Try multiple middleware naming conventions
      const possiblePaths = [
        path.join(process.cwd(), 'src', 'middlewares', `${middlewareName}.middleware.js`),
        path.join(process.cwd(), 'src', 'middlewares', `${middlewareName}Middleware.js`),
        path.join(process.cwd(), 'src', 'middlewares', `${middlewareName}.js`)
      ];

      let middleware = null;
      let loadedFrom = null;

      for (const middlewarePath of possiblePaths) {
        try {
          middleware = require(middlewarePath);
          loadedFrom = middlewarePath;
          break;
        } catch (err) {
          // Try next path
          continue;
        }
      }

      if (middleware) {
        middlewares[middlewareName] = middleware;
        logger.info(`    ✓ Loaded middleware: ${middlewareName} from ${path.basename(loadedFrom)}`);
      } else {
        logger.warn(`    ✗ Middleware not found: ${middlewareName}`);
      }
    } catch (error) {
      logger.error(`    ✗ Error loading middleware "${middlewareName}":`, error.message);
    }
  }

  return middlewares;
};

/**
 * Load all components of a module
 * @param {Object} manifest - Module manifest
 * @param {Object} [app] - Express app instance (required for routes)
 * @returns {Object} All loaded components
 */
const loadModule = (manifest, app = null) => {
  logger.info(`Loading module: ${manifest.name} v${manifest.version}`);

  const components = {
    services: loadServices(manifest),
    models: loadModels(manifest),
    queues: loadQueues(manifest),
    middlewares: loadMiddlewares(manifest),
    routes: loadRoutes(manifest, app)
  };

  return components;
};

/**
 * Initialize a module (run any setup logic)
 * @param {Object} manifest - Module manifest
 * @param {Object} components - Loaded module components
 * @returns {Promise<boolean>} Success status
 */
const initializeModule = async (manifest, components) => {
  logger.info(`Initializing module: ${manifest.name}`);

  try {
    // Call any initialization hooks if they exist
    // This is a hook for future expansion - modules can define init functions

    markModuleInitialized(manifest.name);
    logger.info(`✓ Initialized module: ${manifest.name}`);
    return true;
  } catch (error) {
    logger.error(`✗ Error initializing module "${manifest.name}":`, error.message);
    return false;
  }
};

module.exports = {
  loadModule,
  loadServices,
  loadRoutes,
  loadModels,
  loadQueues,
  loadMiddlewares,
  initializeModule
};
