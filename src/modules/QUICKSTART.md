# Module System - Quick Start Guide

## What Was Created

A complete modular architecture system at `/home/user/traf3li-backend/src/modules/`

## 🚀 Instant Usage

### 1. Basic Module Definition

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
  routes: ['lead', 'client', 'crmPipeline'],
  models: ['Lead', 'Client']
});

module.exports = myModule;
```

### 2. Integration in Express App

```javascript
const express = require('express');
const { setupModules, registerModule } = require('./modules');

const app = express();

// Register modules
registerModule(require('./modules/core/manifest'));

// Load all auto-install modules
await setupModules(app, { autoInstallOnly: true });

// Start server
app.listen(3000);
```

## 📁 File Structure

```
src/modules/
├── index.js                    # Main entry (import from here)
├── manifest.js                 # defineModule function
├── registry.js                 # Module registration & dependencies
├── loader.js                   # Component loading logic
├── example.js                  # Usage examples
├── README.md                   # Full documentation
├── SUMMARY.md                  # Implementation details
├── QUICKSTART.md              # This file
├── core/
│   └── manifest.js            # Core module (user, auth, firm)
└── examples/
    ├── hr.manifest.js         # HR module example
    └── finance.manifest.js    # Finance module example
```

## ⚡ Key Features

### 1. Auto-Loading Components

The system automatically loads:
- ✅ Services from `/src/services/`
- ✅ Routes from `/src/routes/` (auto-mounted at `/api/{route}`)
- ✅ Models from `/src/models/`
- ✅ Queues from `/src/queues/`
- ✅ Middlewares from `/src/middlewares/`

### 2. Dependency Resolution

```javascript
// Core module loaded first
const core = defineModule({
  name: 'core',
  depends: []
});

// CRM depends on core
const crm = defineModule({
  name: 'crm',
  depends: ['core']  // ← Automatically loaded after core
});
```

### 3. Flexible Loading

```javascript
// Option 1: Load all auto-install modules
await setupModules(app, { autoInstallOnly: true });

// Option 2: Load specific modules
await setupModules(app, { modules: ['core', 'crm', 'hr'] });

// Option 3: Load all registered modules
await setupModules(app);
```

## 🎯 API Quick Reference

### defineModule(config)
Define a module manifest

```javascript
const manifest = defineModule({
  name: 'myModule',
  description: 'My module',
  services: ['myService'],
  routes: ['myRoute']
});
```

### registerModule(manifest)
Register a module in the registry

```javascript
registerModule(manifest);
```

### setupModules(app, options)
Load and initialize modules

```javascript
await setupModules(app, { autoInstallOnly: true });
```

### getStatus()
Get module system status

```javascript
const status = getStatus();
console.log(status.totalModules);
```

### getDependencyOrder()
Get module loading order

```javascript
const order = getDependencyOrder();
// ['core', 'crm', 'hr']
```

## 🔧 Module Manifest Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | ✅ | Unique identifier |
| `version` | string | ❌ | Default: '1.0.0' |
| `description` | string | ✅ | Module description |
| `category` | string | ❌ | Default: 'general' |
| `autoInstall` | boolean | ❌ | Auto-load on startup |
| `depends` | array | ❌ | Module dependencies |
| `services` | array | ❌ | Services to load |
| `routes` | array | ❌ | Routes to mount |
| `models` | array | ❌ | Models to load |
| `queues` | array | ❌ | Queues to load |
| `middlewares` | array | ❌ | Middlewares to load |

## 📝 Naming Conventions

The loader tries multiple file naming patterns:

### Services
- `leadScoring.service.js` ← Preferred
- `leadScoringService.js`
- `leadScoring.js`

### Routes
- `lead.route.js` ← Preferred
- `leadRoute.js`
- `lead.js`

### Models
- `Lead.model.js` ← Preferred
- `LeadModel.js`
- `Lead.js`

## 🧪 Test It

```bash
# Run the example
node src/modules/example.js

# Run the verification test
node /tmp/module_test.js
```

## 📚 More Information

- **Full Documentation**: `/src/modules/README.md`
- **Implementation Details**: `/src/modules/SUMMARY.md`
- **Examples**: `/src/modules/examples/`

## 🎉 Next Steps

1. Create module manifests for your features
2. Register them in your server.js
3. Replace manual route/service imports with `setupModules()`
4. Enjoy modular architecture!

---

**Quick Help**: The main entry point is `/src/modules/index.js` - import everything from there!
