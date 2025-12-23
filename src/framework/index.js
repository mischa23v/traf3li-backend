/**
 * DocTypes-Lite Framework
 *
 * A lightweight ERPNext-inspired metadata-driven schema framework for Node.js/Mongoose.
 * Provides auto-generation of:
 * - Mongoose schemas from JSON definitions
 * - Express CRUD routes with permissions
 * - Form field configurations
 * - Validation rules
 *
 * Usage:
 * ```javascript
 * const { registry, mountAllRoutes } = require('./framework');
 *
 * // Load DocTypes from directory
 * registry.loadFromDirectory('./src/doctypes');
 *
 * // Or register programmatically
 * registry.register({
 *   name: 'Task',
 *   module: 'Projects',
 *   fields: [
 *     { fieldname: 'title', fieldtype: 'Data', reqd: 1 },
 *     { fieldname: 'status', fieldtype: 'Select', options: 'Open\nClosed' }
 *   ]
 * });
 *
 * // Mount routes
 * mountAllRoutes(app);
 * ```
 *
 * @module framework
 */

const { DocTypeRegistry, registry, FIELD_TYPE_MAP } = require('./doctype-registry');
const { generateRoutes, mountAllRoutes, PERMISSION_LEVELS } = require('./doctype-routes');

module.exports = {
    // Registry
    DocTypeRegistry,
    registry,

    // Route Generation
    generateRoutes,
    mountAllRoutes,

    // Constants
    FIELD_TYPE_MAP,
    PERMISSION_LEVELS,

    // Helper to initialize framework
    initialize(app, docTypesDir) {
        // Load DocTypes from directory
        if (docTypesDir) {
            registry.loadFromDirectory(docTypesDir);
        }

        // Mount all routes
        mountAllRoutes(app);

        return registry;
    }
};
