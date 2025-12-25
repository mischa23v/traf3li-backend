# Plugin/Extension System for Traf3li

## Overview

The Traf3li plugin system allows developers to extend the platform's functionality through custom plugins. Plugins can:

- Listen to system events via hooks
- Add custom API routes
- Modify entity data on save/load
- Add custom fields to entities
- Provide custom reports and analytics
- Integrate with third-party services

## Architecture

### Components

1. **Plugin Model** (`/src/models/plugin.model.js`)
   - Stores plugin metadata and configuration schema
   - Defines hooks, routes, and permissions
   - Tracks installation statistics

2. **Plugin Installation Model** (`/src/models/pluginInstallation.model.js`)
   - Tracks plugin installations per firm
   - Stores firm-specific settings
   - Monitors usage and errors

3. **Plugin Service** (`/src/services/plugin.service.js`)
   - Business logic for plugin management
   - Installation, configuration, and validation
   - Hook execution

4. **Plugin Loader Service** (`/src/services/pluginLoader.service.js`)
   - Loads plugins on startup
   - Manages plugin lifecycle
   - Registers routes and hooks dynamically

5. **Plugin Controller** (`/src/controllers/plugin.controller.js`)
   - HTTP request handlers
   - Installation and configuration endpoints

6. **Plugin Routes** (`/src/routes/plugin.routes.js`)
   - API endpoints for plugin management

## API Endpoints

### Plugin Discovery

```bash
# Get available plugins
GET /api/plugins/available?category=integration

# Search plugins
GET /api/plugins/search?q=slack

# Get plugin details
GET /api/plugins/:id

# Get plugin statistics
GET /api/plugins/:id/stats
```

### Plugin Installation

```bash
# Install a plugin
POST /api/plugins/:id/install
{
  "settings": {
    "apiKey": "your-api-key",
    "webhookUrl": "https://hooks.slack.com/..."
  }
}

# Uninstall a plugin
DELETE /api/plugins/:id/uninstall

# Get installed plugins
GET /api/plugins/installed?enabled=true
```

### Plugin Configuration

```bash
# Get installation details
GET /api/plugins/installations/:installationId

# Update plugin settings
PATCH /api/plugins/installations/:installationId/settings
{
  "settings": {
    "apiKey": "new-api-key"
  }
}

# Enable plugin
POST /api/plugins/installations/:installationId/enable

# Disable plugin
POST /api/plugins/installations/:installationId/disable
```

### Plugin Administration (System Admin Only)

```bash
# Register new plugin
POST /api/plugins/register
{
  "name": "my-plugin",
  "displayName": "My Plugin",
  "category": "integration",
  "entryPoint": "my-plugin/index.js",
  ...
}

# Get all plugins
GET /api/plugins/all

# Reload plugin
POST /api/plugins/:id/reload

# Get loader statistics
GET /api/plugins/loader/stats
```

### Hook Execution

```bash
# Execute hook manually (for testing)
POST /api/plugins/hooks/execute
{
  "hookName": "case:created",
  "data": {
    "caseId": "123",
    "title": "Test Case"
  }
}
```

## Plugin Structure

### Basic Plugin

```javascript
// plugins/my-plugin/index.js
module.exports = {
  name: 'my-plugin',
  version: '1.0.0',

  initialize: async (settings) => {
    // Setup code
    return { success: true };
  },

  hooks: {
    'case:created': async (data, firmId, settings) => {
      // Handle case created event
    }
  },

  routes: {
    customEndpoint: async (req, res) => {
      // Handle custom API request
      res.json({ success: true });
    }
  }
};
```

### Plugin Registration

```json
{
  "name": "my-plugin",
  "displayName": "My Awesome Plugin",
  "description": "Does awesome things",
  "version": "1.0.0",
  "author": "Your Name",
  "category": "integration",
  "entryPoint": "my-plugin/index.js",
  "permissions": ["cases:read", "invoices:write"],
  "settings": {
    "apiKey": {
      "type": "string",
      "required": true,
      "label": "API Key",
      "description": "Your API key"
    }
  },
  "hooks": [
    {
      "event": "case:created",
      "handler": "hooks.case:created"
    }
  ],
  "routes": [
    {
      "method": "POST",
      "path": "/webhook",
      "handler": "routes.customEndpoint",
      "auth": false
    }
  ]
}
```

## Available Hooks

### Case Events
- `case:created` - New case created
- `case:updated` - Case updated
- `case:deleted` - Case deleted
- `case:status_changed` - Case status changed
- `case:assigned` - Case assigned to user

### Invoice Events
- `invoice:created` - New invoice created
- `invoice:sent` - Invoice sent to client
- `invoice:paid` - Invoice paid
- `invoice:overdue` - Invoice overdue
- `invoice:cancelled` - Invoice cancelled

### Client Events
- `client:created` - New client created
- `client:updated` - Client updated
- `client:deleted` - Client deleted

### Task Events
- `task:created` - New task created
- `task:updated` - Task updated
- `task:completed` - Task marked complete
- `task:overdue` - Task overdue

### Document Events
- `document:uploaded` - New document uploaded
- `document:shared` - Document shared
- `document:deleted` - Document deleted

### Payment Events
- `payment:received` - Payment received
- `payment:failed` - Payment failed

## Plugin Categories

1. **integration** - Third-party service integrations
   - Slack, Microsoft Teams
   - Zapier, Make
   - CRM systems
   - Accounting software

2. **automation** - Workflow automation
   - Auto-assign cases
   - Auto-send notifications
   - Scheduled reports

3. **reporting** - Custom reports and analytics
   - PDF reports
   - Excel exports
   - Custom dashboards

4. **ui** - UI enhancements
   - Custom widgets
   - Themes
   - Layouts

5. **workflow** - Workflow customizations
   - Custom approval flows
   - Stage transitions
   - Validation rules

6. **utility** - Utility functions
   - Data import/export
   - Backup tools
   - Cleanup scripts

## Sample Plugins

### 1. Slack Notifications

Sends Slack notifications when events occur.

**Location:** `/plugins/slack-notifications/`

**Features:**
- Notify on case creation
- Notify on invoice payment
- Notify on task overdue
- Test connection endpoint

**Settings:**
```json
{
  "webhookUrl": "https://hooks.slack.com/...",
  "notifyOnCaseCreated": true,
  "notifyOnInvoicePaid": true,
  "notifyOnTaskOverdue": true
}
```

### 2. Custom Reports

Generate advanced PDF reports.

**Location:** `/plugins/custom-reports/`

**Features:**
- Case summary reports
- Financial reports
- Time tracking reports
- Monthly automated reports

**Endpoints:**
- `POST /api/plugins/custom-reports/case-summary`
- `POST /api/plugins/custom-reports/financial`
- `POST /api/plugins/custom-reports/time-tracking`

### 3. AI-Powered Suggestions

Provides AI-powered insights and suggestions.

**Location:** `/plugins/ai-suggestions/`

**Features:**
- Find similar cases
- Document analysis and summary
- Suggest research topics
- Predict case outcomes

**Endpoints:**
- `POST /api/plugins/ai-suggestions/analyze-case`
- `POST /api/plugins/ai-suggestions/summarize-document`
- `POST /api/plugins/ai-suggestions/research-topics`

## Security Considerations

1. **Permissions**
   - Plugins must declare required permissions
   - Permissions are enforced at runtime
   - Firms can override plugin permissions

2. **Data Access**
   - Plugins only access data for their firm
   - Firm isolation is enforced
   - Sensitive data is encrypted

3. **Error Handling**
   - Plugin errors don't crash the system
   - Errors are logged and tracked
   - Auto-disable after 10 errors

4. **API Keys**
   - Store encrypted in database
   - Never expose in logs
   - Validate before use

5. **Rate Limiting**
   - Implement rate limits for external APIs
   - Prevent abuse
   - Track usage

## Plugin Development Best Practices

1. **Validation**
   - Validate all settings
   - Check for required fields
   - Provide helpful error messages

2. **Error Handling**
   - Wrap async operations in try-catch
   - Return meaningful errors
   - Don't crash on failures

3. **Logging**
   - Log important events
   - Don't log sensitive data
   - Use structured logging

4. **Performance**
   - Keep hook handlers fast
   - Use async operations
   - Cache when possible

5. **Testing**
   - Test all hook handlers
   - Test custom routes
   - Test error scenarios

## Plugin Lifecycle

1. **Development** - Create plugin code
2. **Registration** - Register plugin via API
3. **Discovery** - Firms browse available plugins
4. **Installation** - Firm installs plugin
5. **Configuration** - Firm configures settings
6. **Activation** - Plugin is enabled
7. **Execution** - Plugin responds to events
8. **Monitoring** - Track usage and errors
9. **Updates** - Deploy new versions
10. **Deactivation** - Plugin is disabled
11. **Uninstallation** - Plugin is removed

## Future Enhancements

1. **Plugin Marketplace**
   - Public plugin directory
   - Ratings and reviews
   - Paid plugins

2. **Versioning**
   - Automatic updates
   - Rollback capability
   - Migration scripts

3. **Sandbox Environment**
   - Test plugins before production
   - Isolated testing

4. **Plugin SDK**
   - TypeScript definitions
   - Testing utilities
   - CLI tools

5. **Analytics**
   - Usage metrics
   - Performance monitoring
   - Error tracking

## Support

For plugin development support:
- Email: dev@traf3li.com
- Documentation: https://docs.traf3li.com/plugins
- GitHub: https://github.com/traf3li/plugins

## License

Plugins are distributed under their own licenses. The Traf3li plugin system is proprietary.
