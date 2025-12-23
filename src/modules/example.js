/**
 * Module System Usage Example
 *
 * This file demonstrates how to use the module manifest system.
 */

const logger = require('../utils/logger');
const {
  defineModule,
  registerModule,
  setupModules,
  getStatus
} = require('./index');

// Example 1: Define a custom module
const customModule = defineModule({
  name: 'crm',
  version: '1.0.0',
  description: 'Customer Relationship Management module',
  category: 'business',
  autoInstall: true,
  depends: ['core'],
  services: ['leadScoring', 'emailMarketing'],
  routes: ['lead', 'client', 'crmPipeline'],
  models: ['Lead', 'Client', 'CrmPipeline'],
  queues: [],
  middlewares: []
});

// Example 2: Register the module
registerModule(customModule);

// Example 3: Register the core module
const coreModule = require('./core/manifest');
registerModule(coreModule);

// Example 4: Setup all modules (in a real app, you'd pass the Express app)
const runExample = async () => {
  logger.info('\n=== Module System Example ===\n');

  // Show status before setup
  logger.info('Status before setup:');
  logger.info(JSON.stringify(getStatus(), null, 2));

  // In a real application, you would do:
  // const app = express();
  // await setupModules(app);

  logger.info('\nTo use in your Express app:');
  logger.info(`
const express = require('express');
const { setupModules, registerModule } = require('./modules');
const coreModule = require('./modules/core/manifest');

const app = express();

// Register modules
registerModule(coreModule);

// Setup all modules
await setupModules(app, {
  autoInstallOnly: true  // Only load modules with autoInstall: true
});

// Or load specific modules
await setupModules(app, {
  modules: ['core', 'crm']
});

app.listen(3000);
  `);
};

// Run example if called directly
if (require.main === module) {
  runExample().catch(logger.error);
}

module.exports = { runExample };
