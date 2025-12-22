/**
 * Core Module Manifest
 *
 * Defines the core functionality of the system.
 * This module contains essential services, routes, and models.
 */

const { defineModule } = require('../manifest');

module.exports = defineModule({
  name: 'core',
  version: '1.0.0',
  description: 'Core system functionality',
  category: 'system',
  autoInstall: true,
  depends: [],

  // Core services
  services: [
    'cacheAudit',
    'documentVersion',
    'notificationDelivery',
    'documentExport'
  ],

  // Core routes
  routes: [
    'case',
    'client',
    'user',
    'firm'
  ],

  // Core models
  models: [
    'Case',
    'Client',
    'User',
    'Firm'
  ],

  queues: [],
  middlewares: []
});
