# Command Palette Service - Implementation Summary

## Overview

Enhanced the command palette service at `/home/user/traf3li-backend/src/services/commandPalette.service.js` with comprehensive keyboard-first navigation, dynamic command registration, permission-based filtering, and frecency-based ranking.

**File:** `/home/user/traf3li-backend/src/services/commandPalette.service.js`
**Total Lines:** 1,551
**Service Pattern:** Singleton

## Features Implemented

### 1. Dynamic Command Registration
- In-memory command registry using Map
- Support for custom commands
- Validation of command structure
- Category-based organization

### 2. Permission-Based Filtering
- Integration with PermissionEnforcer service
- Per-command permission requirements
- User role-based access control
- Graceful handling of permission checks

### 3. Frecency-Based Ranking
- Combines frequency and recency
- Exponential decay function (7-day half-life)
- Logarithmic frequency boosting
- Automatic tracking of command usage

### 4. Fuzzy Search
- Multi-field search (name, description, keywords)
- Arabic language support (nameAr, descriptionAr)
- Search score ranking
- Configurable result limits

### 5. Context-Aware Quick Actions
- Page-based suggestions
- Entity-based suggestions
- Limited to 6 most relevant actions

### 6. Keyboard Shortcuts Management
- Default shortcuts from commands
- User-customizable shortcuts
- Shortcut conflict resolution
- Persistent storage in UserActivity

## API Methods

### 1. registerCommand(command)

Register a new command dynamically.

**Parameters:**
```javascript
{
  id: String,              // Unique identifier
  name: String,            // English name
  nameAr: String,          // Arabic name
  description: String,     // English description
  descriptionAr: String,   // Arabic description
  action: String,          // Action identifier
  shortcuts: Array,        // Keyboard shortcuts
  category: String,        // Category (navigation, create, search, actions, settings)
  permissions: Array,      // Required permissions (e.g., ['invoice.view'])
  icon: String,            // Icon name
  path: String,            // Navigation path (optional)
  keywords: Array          // Search keywords (optional)
}
```

**Example:**
```javascript
const commandPalette = require('./services/commandPalette.service');

commandPalette.registerCommand({
  id: 'export_report',
  name: 'Export Report',
  nameAr: 'تصدير التقرير',
  description: 'Export current report to PDF',
  descriptionAr: 'تصدير التقرير الحالي إلى PDF',
  category: 'actions',
  shortcuts: [{ key: 'e', modifiers: ['ctrl', 'shift'] }],
  permissions: ['report.export'],
  icon: 'download',
  action: 'export_report'
});
```

---

### 2. getCommands(userId, firmId, context, options)

Get available commands for a user with permission filtering and frecency ranking.

**Parameters:**
```javascript
userId: String              // User ID
firmId: String              // Firm ID
context: {
  userRole: String          // User's role
}
options: {
  includeRecent: Boolean,   // Include frecency ranking (default: true)
  filterByPermissions: Boolean, // Filter by permissions (default: true)
  category: String          // Filter by category (optional)
}
```

**Returns:**
```javascript
{
  navigation: Array,        // Navigation commands
  create: Array,           // Create commands
  search: Array,           // Search commands
  actions: Array,          // Action commands
  settings: Array,         // Settings commands
  all: Array              // All commands with frecency scores
}
```

**Example:**
```javascript
const commands = await commandPalette.getCommands(
  userId,
  firmId,
  { userRole: 'admin' },
  { filterByPermissions: true, category: 'create' }
);

console.log(commands.create);
// [
//   { id: 'create_invoice', name: 'Create Invoice', frecency: 5.2, ... },
//   { id: 'create_client', name: 'Create Client', frecency: 3.8, ... }
// ]
```

---

### 3. searchCommands(query, userId, firmId, context, options)

Fuzzy search commands with ranking.

**Parameters:**
```javascript
query: String               // Search query
userId: String             // User ID
firmId: String             // Firm ID
context: {
  userRole: String         // User's role
}
options: {
  limit: Number,           // Max results (default: 10)
  fuzzy: Boolean          // Enable fuzzy matching (default: true)
}
```

**Returns:**
```javascript
Array // Ranked search results with scores
```

**Example:**
```javascript
const results = await commandPalette.searchCommands(
  'invoice',
  userId,
  firmId,
  { userRole: 'accountant' },
  { limit: 5, fuzzy: true }
);

console.log(results);
// [
//   { id: 'create_invoice', searchScore: 100, frecency: 5.2, ... },
//   { id: 'search_invoices', searchScore: 50, frecency: 4.1, ... },
//   { id: 'go_invoices', searchScore: 30, frecency: 3.5, ... }
// ]
```

---

### 4. executeCommand(commandId, userId, firmId, params, context)

Execute a command with permission validation and tracking.

**Parameters:**
```javascript
commandId: String          // Command ID
userId: String            // User ID
firmId: String            // Firm ID (optional for permission check)
params: Object            // Command parameters
context: {
  userRole: String        // User role (for permission check)
}
```

**Returns:**
```javascript
{
  success: Boolean,
  command: {
    id: String,
    name: String,
    nameAr: String,
    action: String,
    path: String
  },
  params: Object,
  executedAt: Date,
  error: String           // If success is false
}
```

**Example:**
```javascript
const result = await commandPalette.executeCommand(
  'create_invoice',
  userId,
  firmId,
  { clientId: '123' },
  { userRole: 'admin' }
);

if (result.success) {
  console.log('Command executed:', result.command.action);
} else {
  console.error('Error:', result.error);
}
```

---

### 5. getRecentCommands(userId, limit)

Get recently used commands with frecency ranking.

**Parameters:**
```javascript
userId: String             // User ID
limit: Number             // Max results (default: 10)
```

**Returns:**
```javascript
Array // Recent commands sorted by frecency
```

**Example:**
```javascript
const recentCommands = await commandPalette.getRecentCommands(userId, 5);

console.log(recentCommands);
// [
//   { id: 'create_invoice', lastUsed: Date, frecency: 5.2, ... },
//   { id: 'go_dashboard', lastUsed: Date, frecency: 4.8, ... }
// ]
```

---

### 6. getQuickActions(context)

Get context-aware quick actions based on current page/entity.

**Parameters:**
```javascript
context: {
  page: String,           // Current page (e.g., '/invoices')
  entity: String,         // Current entity type (e.g., 'client')
  entityId: String,       // Current entity ID
  userId: String,         // User ID
  firmId: String,         // Firm ID
  userRole: String       // User role
}
```

**Returns:**
```javascript
Array // Up to 6 context-relevant commands
```

**Example:**
```javascript
const quickActions = await commandPalette.getQuickActions({
  page: '/invoices',
  userId,
  firmId,
  userRole: 'admin'
});

console.log(quickActions);
// [
//   { id: 'create_invoice', ... },
//   { id: 'search_invoices', ... },
//   { id: 'go_clients', ... }
// ]
```

---

### 7. registerKeyboardShortcut(userId, shortcut)

Register a custom keyboard shortcut for a user.

**Parameters:**
```javascript
userId: String             // User ID
shortcut: {
  commandId: String,      // Command ID
  key: String,            // Key (e.g., 'k')
  modifiers: Array,       // Modifiers (e.g., ['ctrl', 'shift'])
  description: String     // Description (optional)
}
```

**Returns:**
```javascript
Object // Updated shortcuts object
```

**Example:**
```javascript
const shortcuts = await commandPalette.registerKeyboardShortcut(userId, {
  commandId: 'create_invoice',
  key: 'i',
  modifiers: ['ctrl', 'alt'],
  description: 'Quick create invoice'
});

console.log(shortcuts);
// {
//   'ctrl+alt+i': { commandId: 'create_invoice', key: 'i', ... }
// }
```

---

### 8. getKeyboardShortcuts(userId)

Get all keyboard shortcuts for a user (default + custom).

**Parameters:**
```javascript
userId: String             // User ID
```

**Returns:**
```javascript
Array // All shortcuts with command details
```

**Example:**
```javascript
const shortcuts = await commandPalette.getKeyboardShortcuts(userId);

console.log(shortcuts);
// [
//   { key: 'ctrl+k', commandId: 'open_command_palette', isDefault: true, ... },
//   { key: 'g+d', commandId: 'go_dashboard', isDefault: true, ... },
//   { key: 'ctrl+alt+i', commandId: 'create_invoice', isDefault: false, ... }
// ]
```

---

## Default Commands

### Navigation (10 commands)
- `go_dashboard` - Go to Dashboard (g+d)
- `go_leads` - Go to Leads (g+l)
- `go_cases` - Go to Cases (g+c)
- `go_tasks` - Go to Tasks (g+t)
- `go_invoices` - Go to Invoices (g+i)
- `go_clients` - Go to Clients (g+k)
- `go_contacts` - Go to Contacts (g+o)
- `go_calendar` - Go to Calendar (g+a)
- `go_reports` - Go to Reports (g+r)
- `go_settings` - Go to Settings (g+s)

### Create (6 commands)
- `create_invoice` - Create Invoice (n+i)
- `create_client` - Create Client (n+k)
- `create_case` - Create Case (n+c)
- `create_lead` - Create Lead (n+l)
- `create_task` - Create Task (n+t)
- `create_contact` - Create Contact (n+o)

### Search (3 commands)
- `search_invoices` - Search Invoices
- `search_clients` - Search Clients
- `search_cases` - Search Cases

### Actions (3 commands)
- `open_command_palette` - Command Palette (Ctrl+K or Ctrl+P)
- `switch_firm` - Switch Firm (Ctrl+Shift+F)
- `global_search` - Global Search (/)

**Total:** 22 default commands

---

## Categories

Commands are organized into 5 categories:

1. **navigation** - Navigate to different pages
2. **create** - Create new entities
3. **search** - Search within specific entity types
4. **actions** - Perform actions
5. **settings** - Access settings and configuration

---

## Permission System

Commands can specify required permissions:

```javascript
permissions: ['resource.action']
```

Examples:
- `['invoice.view']` - View invoices
- `['invoice.create']` - Create invoices
- `['client.edit']` - Edit clients
- `[]` - No permissions required (available to all)

Permissions are checked using the `PermissionEnforcer` service with:
- User ID
- Firm ID
- User role
- Resource namespace
- Action type

---

## Frecency Algorithm

The frecency score combines frequency and recency:

```javascript
frecency = sum(exp(-age_in_days / 7)) * (1 + log(execution_count + 1))
```

- **Recency:** Exponential decay with 7-day half-life
- **Frequency:** Logarithmic boost based on execution count
- Commands used recently and frequently rank higher

---

## Search Scoring

Search results are ranked by:

1. **Exact match in name:** +100 points
2. **Starts with query:** +50 points
3. **Contains query in name:** +30 points
4. **Keyword match:** +20 points
5. **Contains in description:** +15 points
6. **Fuzzy match:** +5-10 points (if enabled)

Results are sorted by search score, then by frecency.

---

## Data Storage

### Command Registry
- In-memory Map for fast access
- Persists during application runtime
- Can be extended at runtime via `registerCommand`

### User Activity
Uses the existing `UserActivity` model:

```javascript
{
  userId: ObjectId,
  firmId: ObjectId,
  recentCommands: [
    { command: String, timestamp: Date }
  ],
  shortcuts: {
    'ctrl+k': { commandId: String, key: String, modifiers: Array }
  }
}
```

---

## Integration Points

### PermissionEnforcer Service
- Used for checking command permissions
- Supports RBAC and ReBAC models
- Caches permission checks

### UserActivity Model
- Tracks command executions
- Stores custom shortcuts
- Maintains recent searches and records

### AuditLog Service
- Can be integrated for command execution logging
- Tracks who executed what and when

---

## Usage Examples

### Basic Usage

```javascript
const commandPalette = require('./services/commandPalette.service');

// Get all commands for a user
const commands = await commandPalette.getCommands(
  userId,
  firmId,
  { userRole: 'admin' }
);

// Search commands
const results = await commandPalette.searchCommands(
  'invoice',
  userId,
  firmId,
  { userRole: 'admin' }
);

// Execute a command
const result = await commandPalette.executeCommand(
  'create_invoice',
  userId,
  firmId,
  {},
  { userRole: 'admin' }
);
```

### Advanced Usage

```javascript
// Register custom command
commandPalette.registerCommand({
  id: 'bulk_export',
  name: 'Bulk Export',
  nameAr: 'التصدير الجماعي',
  category: 'actions',
  permissions: ['export.bulk'],
  shortcuts: [{ key: 'b', modifiers: ['ctrl', 'shift'] }],
  action: 'bulk_export'
});

// Get context-aware quick actions
const quickActions = await commandPalette.getQuickActions({
  page: '/clients/123',
  entity: 'client',
  entityId: '123',
  userId,
  firmId,
  userRole: 'manager'
});

// Register custom shortcut
await commandPalette.registerKeyboardShortcut(userId, {
  commandId: 'create_invoice',
  key: 'i',
  modifiers: ['alt']
});

// Get all shortcuts
const shortcuts = await commandPalette.getKeyboardShortcuts(userId);
```

---

## Frontend Integration

### React/Vue Example

```javascript
// Command palette component
import { useState, useEffect } from 'react';
import api from './api';

function CommandPalette({ userId, firmId, userRole }) {
  const [query, setQuery] = useState('');
  const [commands, setCommands] = useState([]);

  useEffect(() => {
    if (query.length >= 2) {
      api.searchCommands(query, userId, firmId, { userRole })
        .then(setCommands);
    } else {
      api.getCommands(userId, firmId, { userRole })
        .then(data => setCommands(data.all.slice(0, 10)));
    }
  }, [query, userId, firmId, userRole]);

  const handleExecute = async (commandId) => {
    const result = await api.executeCommand(commandId, userId, firmId, {}, { userRole });
    if (result.success) {
      // Navigate or perform action
      if (result.command.path) {
        navigate(result.command.path);
      }
    }
  };

  return (
    <div className="command-palette">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type a command or search..."
      />
      <ul>
        {commands.map(cmd => (
          <li key={cmd.id} onClick={() => handleExecute(cmd.id)}>
            <span className="icon">{cmd.icon}</span>
            <span className="name">{cmd.name}</span>
            {cmd.shortcuts?.[0] && (
              <span className="shortcut">
                {cmd.shortcuts[0].modifiers?.join('+')}+{cmd.shortcuts[0].key}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## API Routes (Recommended)

Create routes to expose the service:

```javascript
// routes/commandPalette.routes.js
const express = require('express');
const router = express.Router();
const commandPaletteService = require('../services/commandPalette.service');
const { authenticate } = require('../middleware/auth');

// Get all commands
router.get('/commands', authenticate, async (req, res) => {
  const commands = await commandPaletteService.getCommands(
    req.userID,
    req.firmId,
    { userRole: req.firmRole },
    { filterByPermissions: true }
  );
  res.json(commands);
});

// Search commands
router.get('/commands/search', authenticate, async (req, res) => {
  const { q, limit } = req.query;
  const results = await commandPaletteService.searchCommands(
    q,
    req.userID,
    req.firmId,
    { userRole: req.firmRole },
    { limit: parseInt(limit) || 10 }
  );
  res.json(results);
});

// Execute command
router.post('/commands/:commandId/execute', authenticate, async (req, res) => {
  const { commandId } = req.params;
  const result = await commandPaletteService.executeCommand(
    commandId,
    req.userID,
    req.firmId,
    req.body,
    { userRole: req.firmRole }
  );
  res.json(result);
});

// Get quick actions
router.get('/quick-actions', authenticate, async (req, res) => {
  const { page, entity, entityId } = req.query;
  const actions = await commandPaletteService.getQuickActions({
    page,
    entity,
    entityId,
    userId: req.userID,
    firmId: req.firmId,
    userRole: req.firmRole
  });
  res.json(actions);
});

// Get keyboard shortcuts
router.get('/shortcuts', authenticate, async (req, res) => {
  const shortcuts = await commandPaletteService.getKeyboardShortcuts(req.userID);
  res.json(shortcuts);
});

// Register keyboard shortcut
router.post('/shortcuts', authenticate, async (req, res) => {
  const shortcuts = await commandPaletteService.registerKeyboardShortcut(
    req.userID,
    req.body
  );
  res.json(shortcuts);
});

module.exports = router;
```

---

## Performance Considerations

1. **Caching:** Permission checks are cached in PermissionEnforcer
2. **Lazy Loading:** Commands are only filtered when requested
3. **Frecency Calculation:** Computed on-demand from user activity
4. **Search Optimization:** Early termination for exact matches

---

## Future Enhancements

1. **Command History:** Track command execution history
2. **Command Aliases:** Support multiple names for the same command
3. **Command Chains:** Execute multiple commands in sequence
4. **Command Templates:** Parameterized commands with user input
5. **Command Analytics:** Track most used commands per user/firm
6. **Command Suggestions:** ML-based command recommendations

---

## Testing

```javascript
// Example test
describe('CommandPaletteService', () => {
  it('should register a command', () => {
    const cmd = commandPalette.registerCommand({
      id: 'test_cmd',
      name: 'Test Command',
      category: 'actions'
    });
    expect(cmd.id).toBe('test_cmd');
  });

  it('should search commands', async () => {
    const results = await commandPalette.searchCommands(
      'invoice',
      userId,
      firmId,
      { userRole: 'admin' }
    );
    expect(results.length).toBeGreaterThan(0);
  });

  it('should calculate frecency correctly', () => {
    const recentCommands = [
      { command: 'create_invoice', timestamp: new Date() },
      { command: 'create_invoice', timestamp: new Date(Date.now() - 86400000) }
    ];
    const score = commandPalette._calculateFrecency('create_invoice', recentCommands);
    expect(score).toBeGreaterThan(0);
  });
});
```

---

## Conclusion

The enhanced Command Palette Service provides a comprehensive, keyboard-first navigation system with:

- ✅ 8 core API methods
- ✅ 22 default commands
- ✅ 5 command categories
- ✅ Permission-based filtering
- ✅ Frecency-based ranking
- ✅ Fuzzy search with Arabic support
- ✅ Context-aware quick actions
- ✅ Custom keyboard shortcuts
- ✅ Dynamic command registration

The service follows existing patterns in the codebase and integrates seamlessly with the UserActivity model and PermissionEnforcer service.
