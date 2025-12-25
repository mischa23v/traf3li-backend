# Organization Templates System

## Overview

The Organization Templates system provides reusable firm configuration blueprints that standardize the setup of new law firms and allow consistent configuration across multiple organizations.

## Features

- **Reusable Configurations**: Create templates with predefined roles, permissions, settings, and features
- **Multiple Templates**: Support for different firm types (Solo, Standard, Boutique, Enterprise)
- **Template Application**: Apply templates to existing firms or create new firms from templates
- **Configuration Comparison**: Compare firm configurations with templates to identify drift
- **Template Cloning**: Duplicate and customize existing templates
- **Default Templates**: System-provided templates that cannot be modified
- **Version Tracking**: Track template changes and usage statistics

## Architecture

### Components

1. **Model** (`/src/models/organizationTemplate.model.js`)
   - Schema definition for templates
   - Role configurations with permissions
   - Settings and features configuration
   - Validation and helper methods

2. **Service** (`/src/services/organizationTemplate.service.js`)
   - Business logic for template operations
   - Template application to firms
   - Firm creation from templates
   - Configuration comparison

3. **Controller** (`/src/controllers/organizationTemplate.controller.js`)
   - HTTP request handlers
   - Input validation
   - Response formatting

4. **Routes** (`/src/routes/organizationTemplate.route.js`)
   - API endpoint definitions
   - Middleware integration
   - Access control

5. **Seed Data** (`/src/seeds/organizationTemplates.seed.js`)
   - Default template definitions
   - Database seeding script

## API Endpoints

### Public Endpoints (Authenticated Users)

#### Get Available Templates
```http
GET /api/templates/available?targetFirmSize=medium
```
Returns all active templates, optionally filtered by firm size.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "template_id",
      "name": "Standard Law Firm",
      "nameAr": "مكتب محاماة قياسي",
      "description": "Complete role hierarchy...",
      "descriptionAr": "هيكل أدوار كامل...",
      "isDefault": true,
      "metadata": {
        "targetFirmSize": "medium"
      },
      "usageCount": 42
    }
  ]
}
```

#### Get Default Template
```http
GET /api/templates/default
```
Returns the default template for new firm creation.

#### Preview Template Configuration
```http
GET /api/templates/:id/preview
```
Returns detailed template configuration for preview before application.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "template_id",
    "name": "Standard Law Firm",
    "configuration": {
      "roles": [
        {
          "name": "owner",
          "description": "Firm owner with complete control",
          "permissions": {
            "modules": {
              "clients": "full",
              "cases": "full"
            },
            "special": {
              "canApproveInvoices": true
            }
          }
        }
      ],
      "features": {
        "aiAssistant": false,
        "dealRooms": true
      },
      "subscriptionDefaults": {
        "plan": "professional",
        "maxUsers": 10
      }
    }
  }
}
```

### Admin Endpoints

#### Create Template
```http
POST /api/templates/admin
Authorization: Bearer <admin_token>

{
  "name": "Custom Template",
  "nameAr": "قالب مخصص",
  "description": "Custom firm configuration",
  "descriptionAr": "تكوين مكتب مخصص",
  "roles": [
    {
      "name": "owner",
      "permissions": {
        "clients": "full",
        "cases": "full"
      },
      "isDefault": true
    }
  ],
  "settings": {
    "maxConcurrentSessions": 5,
    "sessionTimeout": 7
  },
  "features": {
    "aiAssistant": true
  }
}
```

#### List All Templates
```http
GET /api/templates/admin?page=1&limit=20&sortBy=usageCount&sortOrder=-1
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `sortBy`: Sort field (default: usageCount)
- `sortOrder`: 1 (asc) or -1 (desc)
- `includeInactive`: Include inactive templates (default: false)
- `targetFirmSize`: Filter by firm size
- `isGlobal`: Filter by global/user-created
- `isActive`: Filter by active status

#### Get Template by ID
```http
GET /api/templates/admin/:id
Authorization: Bearer <admin_token>
```

#### Update Template
```http
PUT /api/templates/admin/:id
Authorization: Bearer <admin_token>

{
  "name": "Updated Template Name",
  "isActive": true
}
```

#### Delete Template
```http
DELETE /api/templates/admin/:id
Authorization: Bearer <admin_token>
```

**Note:** Cannot delete:
- System templates (`isGlobal: true`)
- The default template

#### Clone Template
```http
POST /api/templates/admin/:id/clone
Authorization: Bearer <admin_token>

{
  "name": "Cloned Template"
}
```

#### Set as Default
```http
POST /api/templates/admin/:id/set-default
Authorization: Bearer <admin_token>
```

#### Apply Template to Firm
```http
POST /api/templates/admin/:id/apply/:firmId
Authorization: Bearer <admin_token>

{
  "applySettings": true,
  "applyFeatures": true,
  "applyRolePermissions": false,
  "applySubscription": false,
  "preserveSubscription": true
}
```

**Options:**
- `applySettings`: Apply general settings (default: true)
- `applyFeatures`: Apply feature toggles (default: true)
- `applyRolePermissions`: Update existing member permissions (default: false)
- `applySubscription`: Apply subscription limits (default: false)
- `preserveSubscription`: Keep existing subscription plan (default: true)
- `applyEnterpriseSettings`: Apply enterprise security settings (default: false)

#### Compare Firm with Template
```http
GET /api/templates/admin/:id/compare/:firmId
Authorization: Bearer <admin_token>
```

Returns detailed comparison showing differences between firm configuration and template.

**Response:**
```json
{
  "success": true,
  "data": {
    "firm": {
      "id": "firm_id",
      "name": "Law Firm Name"
    },
    "template": {
      "id": "template_id",
      "name": "Standard Law Firm"
    },
    "differences": {
      "settings": {
        "sessionTimeout": {
          "firm": 5,
          "template": 7,
          "different": true
        }
      },
      "roles": {},
      "features": {},
      "subscription": {}
    },
    "summary": {
      "totalDifferences": 1,
      "driftScore": 2.5,
      "driftLevel": "low",
      "hasDifferences": true
    }
  }
}
```

#### Get Template Statistics
```http
GET /api/templates/admin/stats
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 10,
    "active": 8,
    "inactive": 2,
    "global": 4,
    "userCreated": 6,
    "mostUsed": [
      {
        "name": "Standard Law Firm",
        "usageCount": 42
      }
    ],
    "defaultTemplate": {
      "name": "Standard Law Firm"
    }
  }
}
```

## Creating a Firm with a Template

### Using Template in Firm Creation

```http
POST /api/firms
Authorization: Bearer <user_token>

{
  "name": "My Law Firm",
  "nameArabic": "مكتبي القانوني",
  "licenseNumber": "12345",
  "email": "contact@lawfirm.com",
  "phone": "+966XXXXXXXXX",
  "templateId": "template_id_here"
}
```

When a `templateId` is provided:
1. The template configuration is loaded
2. A new firm is created with the template's roles, settings, and features
3. The owner is assigned with permissions from the template's owner role
4. Template usage count is incremented

If template creation fails, the system falls back to standard firm creation.

## Default Templates

The system includes 4 default templates:

### 1. Standard Law Firm (Default)
- **Target Size**: Medium (5-20 employees)
- **Roles**: Owner, Admin, Partner, Lawyer, Paralegal, Secretary, Accountant
- **Features**: Advanced reports, deal rooms, client portal, audit logs
- **Subscription**: Professional plan, 10 users, 500 cases

### 2. Solo Practitioner
- **Target Size**: Solo (1-2 people)
- **Roles**: Owner, Secretary (optional)
- **Features**: Basic features, document sharing
- **Subscription**: Starter plan, 2 users, 50 cases

### 3. Enterprise Firm
- **Target Size**: Enterprise (50+ employees)
- **Roles**: Full hierarchy
- **Features**: All features including AI, SSO, encryption
- **Security**: MFA required, IP restriction, strict password policy
- **Subscription**: Enterprise plan, 100 users, 10,000 cases

### 4. Boutique Firm
- **Target Size**: Medium (5-20 lawyers)
- **Roles**: Owner, Partner, Lawyer, Paralegal, Accountant
- **Features**: Smart scheduling, ZATCA integration, custom branding
- **Subscription**: Professional plan, 20 users, 2,000 cases

## Template Schema

### Template Structure

```javascript
{
  name: String,              // Template name (English)
  nameAr: String,           // Template name (Arabic)
  description: String,       // Description (English)
  descriptionAr: String,    // Description (Arabic)
  isDefault: Boolean,        // Is this the default template?
  isActive: Boolean,         // Is template available for use?
  isGlobal: Boolean,         // System template (not editable)

  roles: [{
    name: String,           // Role name (owner, admin, partner, etc.)
    permissions: {
      // Module permissions
      clients: String,      // none, view, edit, full
      cases: String,
      invoices: String,
      // ... other modules

      // Special permissions
      canApproveInvoices: Boolean,
      canManageRetainers: Boolean,
      canExportData: Boolean,
      canDeleteRecords: Boolean,
      canViewFinance: Boolean,
      canManageTeam: Boolean
    },
    isDefault: Boolean,     // Default role for new members
    description: String,
    descriptionAr: String
  }],

  settings: {
    // Security
    maxConcurrentSessions: Number,
    sessionTimeout: Number,
    mfaRequired: Boolean,
    ipRestrictionEnabled: Boolean,

    // Rate limits
    defaultRateLimits: {
      api: Number,
      upload: Number,
      export: Number
    },

    // Password policy
    passwordPolicy: {
      minLength: Number,
      requireUppercase: Boolean,
      requireNumbers: Boolean,
      requireSpecialChars: Boolean,
      maxAgeDays: Number,
      preventReuse: Number
    },

    // Localization
    timezone: String,
    language: String,
    dateFormat: String,

    // Defaults
    defaultCasePrefix: String,
    defaultClientPrefix: String,
    numberingFormat: String
  },

  features: {
    // AI Features
    nlpTaskCreation: Boolean,
    voiceToTask: Boolean,
    smartScheduling: Boolean,
    aiAssistant: Boolean,

    // Advanced Features
    zatcaIntegration: Boolean,
    advancedReports: Boolean,
    multiCurrency: Boolean,
    apiAccess: Boolean,
    customBranding: Boolean,

    // Collaboration
    dealRooms: Boolean,
    clientPortal: Boolean,
    documentSharing: Boolean,

    // Security
    ssoEnabled: Boolean,
    auditLogs: Boolean,
    encryptionAtRest: Boolean
  },

  subscriptionDefaults: {
    plan: String,           // free, starter, professional, enterprise
    trialDays: Number,
    maxUsers: Number,
    maxCases: Number,
    maxClients: Number,
    maxStorageGB: Number
  },

  metadata: {
    targetFirmSize: String,  // solo, small, medium, large, enterprise
    targetPracticeAreas: [String],
    recommendedFor: [String],
    notes: String
  },

  usageCount: Number,
  lastUsedAt: Date,
  version: Number,
  parentTemplateId: ObjectId
}
```

## Seeding Default Templates

To seed the database with default templates:

```bash
node src/seeds/organizationTemplates.seed.js
```

This will:
1. Connect to MongoDB
2. Create default templates if they don't exist
3. Skip existing templates
4. Display summary of created/skipped/failed templates

## Best Practices

### Creating Custom Templates

1. **Start with a Default Template**: Clone an existing template and customize it
2. **Role Permissions**: Ensure at least one role has full permissions
3. **Default Role**: Set exactly one role as default for new members
4. **Owner Role**: Always include an owner role
5. **Testing**: Apply to a test firm before using in production

### Applying Templates

1. **Backup First**: Always backup firm data before applying templates
2. **Selective Application**: Use flags to control what gets applied
3. **Review Changes**: Compare first to understand the impact
4. **Staged Rollout**: Apply to one firm, verify, then roll out

### Template Maintenance

1. **Version Control**: Templates are versioned automatically
2. **Usage Tracking**: Monitor which templates are most used
3. **Regular Reviews**: Periodically review and update templates
4. **Deprecation**: Mark old templates as inactive rather than deleting

## Security Considerations

- All admin endpoints require admin authentication
- Mass assignment protection on all inputs
- Audit logging for all template operations
- Global templates cannot be modified or deleted
- Default template cannot be deleted
- Template validation before application

## Error Handling

The system handles errors gracefully:

- Invalid template ID: Returns 404
- Missing required fields: Returns 400 with validation errors
- Permission denied: Returns 403
- Template application failure: Falls back to standard creation
- Database errors: Logged and return 500

## Monitoring

Track template usage through:
- `usageCount`: Number of times template was used
- `lastUsedAt`: Most recent usage timestamp
- Statistics endpoint for overview
- Audit logs for all operations

## Future Enhancements

Potential improvements:
- Template versioning with rollback capability
- Template marketplace for sharing
- Template import/export
- Template testing framework
- Scheduled template audits
- Template usage analytics
- Role-based template access
- Template dependencies
- Template inheritance

## Support

For issues or questions:
- Check existing templates in `/api/templates/available`
- Review audit logs for template operations
- Contact system administrator for template modifications
