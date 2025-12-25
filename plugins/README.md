# Traf3li Plugin System

This directory contains plugins that extend the functionality of Traf3li.

## Plugin Structure

Each plugin should have the following structure:

```
plugins/
  my-plugin/
    index.js          # Entry point
    package.json      # Plugin metadata
    README.md         # Plugin documentation
```

## Plugin Entry Point (index.js)

```javascript
module.exports = {
  name: 'my-plugin',
  version: '1.0.0',

  // Initialize plugin with firm-specific settings
  initialize: async (settings) => {
    // Setup code here
  },

  // Hook handlers
  hooks: {
    'case:created': async (data, firmId) => {
      // Handle case created event
    },
    'invoice:paid': async (data, firmId) => {
      // Handle invoice paid event
    }
  },

  // Custom routes
  routes: {
    handleWebhook: async (req, res) => {
      // Handle webhook request
      res.json({ success: true });
    }
  }
};
```

## Registering a Plugin

Plugins are registered via the API:

```bash
POST /api/plugins/register
Content-Type: application/json

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
      "description": "Your API key for the service"
    },
    "webhookUrl": {
      "type": "string",
      "required": false,
      "label": "Webhook URL"
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
      "handler": "routes.handleWebhook",
      "auth": false
    }
  ]
}
```

## Available Hook Events

### Case Events
- `case:created` - When a case is created
- `case:updated` - When a case is updated
- `case:deleted` - When a case is deleted
- `case:status_changed` - When a case status changes

### Invoice Events
- `invoice:created` - When an invoice is created
- `invoice:sent` - When an invoice is sent to client
- `invoice:paid` - When an invoice is paid
- `invoice:overdue` - When an invoice becomes overdue

### Client Events
- `client:created` - When a client is created
- `client:updated` - When a client is updated

### Task Events
- `task:created` - When a task is created
- `task:completed` - When a task is marked complete
- `task:overdue` - When a task becomes overdue

### Document Events
- `document:uploaded` - When a document is uploaded
- `document:shared` - When a document is shared

## Plugin Categories

- `integration` - Third-party service integrations (Slack, Zapier, etc.)
- `automation` - Workflow automation
- `reporting` - Custom reports and analytics
- `ui` - UI enhancements
- `workflow` - Workflow customizations
- `utility` - Utility functions

## Sample Plugins

See the sample plugins in this directory for examples:

1. **slack-notifications** - Send Slack notifications on events
2. **custom-reports** - Generate custom PDF reports
3. **ai-suggestions** - AI-powered case suggestions
4. **document-templates** - Custom document template engine

## Security Considerations

1. Always validate plugin settings before use
2. Sanitize all user inputs in plugin routes
3. Use proper error handling to prevent crashes
4. Request only necessary permissions
5. Store sensitive data (API keys) encrypted
6. Implement rate limiting for external API calls

## Plugin Lifecycle

1. **Registration** - Plugin is registered in the system
2. **Installation** - Firm installs the plugin
3. **Configuration** - Firm configures plugin settings
4. **Activation** - Plugin is enabled for the firm
5. **Execution** - Plugin responds to hooks and API calls
6. **Deactivation** - Plugin is disabled
7. **Uninstallation** - Plugin is removed from firm

## Testing Plugins

Use the test endpoint to manually trigger hooks:

```bash
POST /api/plugins/hooks/execute
Content-Type: application/json

{
  "hookName": "case:created",
  "data": {
    "caseId": "123",
    "title": "Test Case"
  }
}
```

## Support

For plugin development support, contact: dev@traf3li.com
