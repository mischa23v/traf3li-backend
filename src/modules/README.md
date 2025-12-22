# Module Manifest System

A modular architecture system for organizing and managing application components (services, routes, models, queues, middlewares) with dependency resolution and automatic loading.

## Overview

The module system provides:

- **Modular Architecture**: Organize code into logical, self-contained modules
- **Dependency Management**: Automatic dependency resolution with topological sorting
- **Auto-loading**: Automatically load and initialize components
- **Flexible Configuration**: Control which modules are loaded and when
- **Convention-based Loading**: Supports multiple naming conventions for files

## Directory Structure

```
src/modules/
├── manifest.js          # Module definition function
├── registry.js          # Module registration and dependency management
├── loader.js            # Component loading logic
├── index.js             # Main entry point
├── example.js           # Usage examples
├── README.md            # This file
├── core/
│   └── manifest.js      # Core module definition
└── examples/
    ├── hr.manifest.js       # HR module example
    └── finance.manifest.js  # Finance module example
```

## Quick Start

### 1. Define a Module

```javascript
const { defineModule } = require('./modules');

const myModule = defineModule({
  name: 'crm',
  version: '1.0.0',
  description: 'Customer Relationship Management',
  category: 'business',
  autoInstall: true,
  depends: ['core'],
  services: ['leadScoring', 'emailMarketing'],
  routes: ['lead', 'client'],
  models: ['Lead', 'Client'],
  queues: [],
  middlewares: []
});

module.exports = myModule;
```

### 2. Register and Setup Modules

```javascript
const express = require('express');
const { setupModules, registerModule } = require('./modules');

const app = express();

// Register modules
registerModule(require('./modules/core/manifest'));
registerModule(require('./modules/examples/hr.manifest'));

// Setup all auto-install modules
await setupModules(app, { autoInstallOnly: true });

// Or setup specific modules
await setupModules(app, { modules: ['core', 'hr'] });
```

## Module Manifest Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `name` | string | Yes | - | Unique module identifier |
| `version` | string | No | '1.0.0' | Module version (semver) |
| `description` | string | Yes | - | Module description |
| `category` | string | No | 'general' | Module category for grouping |
| `autoInstall` | boolean | No | false | Auto-load module on startup |
| `depends` | string[] | No | [] | Array of module dependencies |
| `services` | string[] | No | [] | Service files to load |
| `routes` | string[] | No | [] | Route files to load and mount |
| `models` | string[] | No | [] | Model files to load |
| `queues` | string[] | No | [] | Queue files to load |
| `middlewares` | string[] | No | [] | Middleware files to load |

## API Reference

### Core Functions

#### `defineModule(config)`

Define a module with its configuration.

```javascript
const manifest = defineModule({
  name: 'myModule',
  version: '1.0.0',
  description: 'My custom module',
  // ... other properties
});
```

#### `registerModule(manifest)`

Register a module in the registry.

```javascript
registerModule(myModuleManifest);
```

#### `setupModules(app, options)`

Setup and initialize all modules.

**Options:**
- `autoInstallOnly`: Only load modules with `autoInstall: true`
- `modules`: Array of specific module names to load

```javascript
// Load all auto-install modules
await setupModules(app, { autoInstallOnly: true });

// Load specific modules
await setupModules(app, { modules: ['core', 'crm'] });
```

### Registry Functions

#### `getModule(name)`

Get a module by name.

```javascript
const coreModule = getModule('core');
```

#### `getAllModules()`

Get all registered modules.

```javascript
const allModules = getAllModules();
```

#### `getDependencyOrder()`

Get modules in dependency order (topological sort).

```javascript
const order = getDependencyOrder();
// ['core', 'crm', 'hr'] - dependencies loaded first
```

#### `checkDependencies(moduleName)`

Check if all dependencies are satisfied.

```javascript
const check = checkDependencies('crm');
// { satisfied: true, missing: [] }
```

### Loader Functions

#### `loadModule(manifest, app)`

Load all components of a module.

```javascript
const components = loadModule(manifest, app);
// { services: {...}, routes: {...}, models: {...}, ... }
```

#### `loadServices(manifest)`

Load only services for a module.

```javascript
const services = loadServices(manifest);
```

#### `loadRoutes(manifest, app)`

Load and mount routes for a module.

```javascript
const routes = loadRoutes(manifest, app);
```

#### `loadModels(manifest)`

Load models for a module.

```javascript
const models = loadModels(manifest);
```

### Utility Functions

#### `getStatus()`

Get module system status.

```javascript
const status = getStatus();
console.log(status);
// {
//   totalModules: 3,
//   loadedModules: 2,
//   initializedModules: 2,
//   modules: [...]
// }
```

#### `registerModuleFromFile(path)`

Register a module from a manifest file.

```javascript
registerModuleFromFile('./modules/custom/manifest.js');
```

## File Naming Conventions

The loader supports multiple naming conventions:

### Services
- `serviceName.service.js` (preferred)
- `serviceNameService.js`
- `serviceName.js`

### Routes
- `routeName.route.js` (preferred)
- `routeNameRoute.js`
- `routeName.js`

### Models
- `ModelName.model.js` (preferred)
- `ModelNameModel.js`
- `ModelName.js`

### Queues
- `queueName.queue.js` (preferred)
- `queueNameQueue.js`
- `queueName.js`

### Middlewares
- `middlewareName.middleware.js` (preferred)
- `middlewareNameMiddleware.js`
- `middlewareName.js`

## Example Modules

### Core Module

```javascript
// src/modules/core/manifest.js
const { defineModule } = require('../manifest');

module.exports = defineModule({
  name: 'core',
  version: '1.0.0',
  description: 'Core system functionality',
  category: 'system',
  autoInstall: true,
  depends: [],
  services: ['cacheAudit', 'documentVersion'],
  routes: ['case', 'client', 'user', 'firm'],
  models: ['Case', 'Client', 'User', 'Firm']
});
```

### HR Module

```javascript
// src/modules/examples/hr.manifest.js
const { defineModule } = require('../manifest');

module.exports = defineModule({
  name: 'hr',
  version: '1.2.0',
  description: 'Human Resources management system',
  category: 'business',
  autoInstall: false,
  depends: ['core'],
  services: ['hrAnalytics', 'hrPredictions'],
  routes: ['hr', 'attendance', 'payroll'],
  models: ['Staff', 'Attendance', 'PayrollRun']
});
```

## Dependency Resolution

The system uses topological sorting to ensure modules are loaded in the correct order:

1. Modules with no dependencies are loaded first
2. Modules are only loaded after all their dependencies
3. Circular dependencies are detected and throw an error

Example:

```javascript
// Module dependencies:
// core -> []
// crm -> [core]
// analytics -> [core, crm]

// Loading order will be:
// 1. core
// 2. crm
// 3. analytics
```

## Integration with Express

Routes are automatically mounted at `/api/{routeName}`:

```javascript
// If module has routes: ['case', 'client']
// The system will:
// 1. Require the route files
// 2. Mount them at:
//    - /api/case
//    - /api/client
```

## Best Practices

1. **Module Naming**: Use kebab-case for module names (e.g., 'hr-analytics')
2. **Dependencies**: Keep dependency chains shallow
3. **Auto-install**: Only set `autoInstall: true` for essential modules
4. **Categories**: Use consistent categories (system, business, integration, etc.)
5. **Versioning**: Follow semantic versioning (semver)

## Error Handling

The system provides detailed error messages for:

- Missing dependencies
- Circular dependencies
- File not found errors
- Loading failures

```javascript
// Example error output
✗ Service not found: invalidService
✗ Error loading route "badRoute": Cannot find module
Cannot load "analytics": missing dependencies: ["core", "crm"]
Circular dependency detected involving module: analytics
```

## Testing

```javascript
// test/modules.test.js
const { defineModule, registerModule, getStatus } = require('../src/modules');

describe('Module System', () => {
  it('should register a module', () => {
    const manifest = defineModule({
      name: 'test',
      description: 'Test module'
    });

    const result = registerModule(manifest);
    expect(result).toBe(true);
  });

  it('should detect missing dependencies', () => {
    const check = checkDependencies('analytics');
    expect(check.satisfied).toBe(false);
    expect(check.missing).toContain('core');
  });
});
```

## Roadmap

Future enhancements:

- [ ] Module initialization hooks
- [ ] Module lifecycle events (onLoad, onInit, onDestroy)
- [ ] Hot module reloading
- [ ] Module permissions and access control
- [ ] Module configuration management
- [ ] Inter-module communication
- [ ] Module marketplace/discovery

## License

Part of the traf3li-backend project.
