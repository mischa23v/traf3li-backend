# Frontend Implementation Guide

This document provides detailed instructions for implementing the frontend components to support the new ERP/Finance backend features.

---

## Table of Contents

1. [Sidebar Navigation Updates](#1-sidebar-navigation-updates)
2. [New Pages to Create](#2-new-pages-to-create)
3. [Settings Pages](#3-settings-pages)
4. [Components to Build](#4-components-to-build)
5. [API Endpoints Reference](#5-api-endpoints-reference)
6. [Keyboard Shortcuts](#6-keyboard-shortcuts)
7. [Implementation Priority](#7-implementation-priority)

---

## 1. Sidebar Navigation Updates

### Primary Navigation (Add to existing sidebar)

```
├── Dashboard
├── Cases
├── Clients
├── Invoices
│   ├── All Invoices
│   ├── Recurring Invoices
│   ├── AR Aging Report          ← NEW
│   └── Dunning Management       ← NEW
├── Expenses
├── Time Tracking
├── Reports
│   ├── Financial Reports
│   ├── AR Aging                 ← NEW
│   └── SLO Dashboard            ← NEW
├── Integrations                 ← NEW SECTION
│   ├── Accounting
│   │   ├── QuickBooks
│   │   └── Xero
│   ├── Calendars
│   │   ├── Google Calendar
│   │   └── Microsoft 365
│   └── Cloud Storage
│       ├── Google Drive
│       ├── Dropbox
│       └── OneDrive
├── Settings
│   ├── General
│   ├── Integrations             ← NEW
│   ├── Custom Fields            ← NEW
│   ├── Keyboard Shortcuts       ← NEW
│   ├── Plugins                  ← NEW
│   └── Webhooks                 ← NEW
└── Admin (if admin role)
    ├── Status Page              ← NEW
    ├── SLO Monitoring           ← NEW
    ├── Rate Limiting            ← NEW
    └── Playbooks                ← NEW
```

### Sidebar Item Definitions

```typescript
// Add to your sidebar configuration
const newSidebarItems = [
  // Finance Section
  {
    id: 'ar-aging',
    label: 'AR Aging',
    labelAr: 'تقادم الذمم المدينة',
    icon: 'ChartBarIcon',
    path: '/invoices/ar-aging',
    permission: 'invoices:read'
  },
  {
    id: 'dunning',
    label: 'Dunning',
    labelAr: 'المطالبات',
    icon: 'BellAlertIcon',
    path: '/invoices/dunning',
    permission: 'invoices:manage'
  },

  // Integrations Section
  {
    id: 'integrations',
    label: 'Integrations',
    labelAr: 'التكاملات',
    icon: 'PuzzlePieceIcon',
    children: [
      {
        id: 'quickbooks',
        label: 'QuickBooks',
        path: '/integrations/quickbooks',
        icon: 'BuildingOfficeIcon'
      },
      {
        id: 'xero',
        label: 'Xero',
        path: '/integrations/xero',
        icon: 'BuildingOffice2Icon'
      },
      {
        id: 'google-calendar',
        label: 'Google Calendar',
        path: '/integrations/google-calendar',
        icon: 'CalendarIcon'
      },
      {
        id: 'microsoft-calendar',
        label: 'Microsoft 365',
        path: '/integrations/microsoft-calendar',
        icon: 'CalendarDaysIcon'
      },
      {
        id: 'cloud-storage',
        label: 'Cloud Storage',
        path: '/integrations/storage',
        icon: 'CloudIcon'
      }
    ]
  },

  // Admin Section
  {
    id: 'admin-status',
    label: 'Status Page',
    labelAr: 'صفحة الحالة',
    icon: 'SignalIcon',
    path: '/admin/status',
    permission: 'admin:status'
  },
  {
    id: 'admin-slo',
    label: 'SLO Monitoring',
    labelAr: 'مراقبة SLO',
    icon: 'ChartPieIcon',
    path: '/admin/slo',
    permission: 'admin:slo'
  }
];
```

---

## 2. New Pages to Create

### 2.1 AR Aging Report Page

**Path:** `/invoices/ar-aging`

**Components:**
- Summary cards (Total Outstanding, Current, 1-30, 31-60, 61-90, 90+ days)
- Aging chart (bar chart by bucket)
- Client-wise aging table
- Export buttons (PDF, Excel, CSV)
- Date range picker
- Filter by client/status

**API Endpoints:**
```
GET /api/ar-aging/summary
GET /api/ar-aging/by-client
GET /api/ar-aging/by-invoice
GET /api/ar-aging/export?format=pdf|excel|csv
```

**Sample Page Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ AR Aging Report                        [Export ▼] [Refresh] │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│ │ Total   │ │ Current │ │ 1-30    │ │ 31-60   │ │ 61-90   │ │
│ │ $50,000 │ │ $20,000 │ │ $15,000 │ │ $8,000  │ │ $7,000  │ │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
├─────────────────────────────────────────────────────────────┤
│ [Bar Chart - Aging by Bucket]                               │
├─────────────────────────────────────────────────────────────┤
│ Client          │ Current │ 1-30   │ 31-60  │ 61-90 │ 90+  │
│ ────────────────┼─────────┼────────┼────────┼───────┼───── │
│ Acme Corp       │ $5,000  │ $2,000 │ $1,000 │ $500  │ $0   │
│ Beta Industries │ $3,000  │ $1,500 │ $0     │ $0    │ $500 │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.2 Dunning Management Page

**Path:** `/invoices/dunning`

**Sub-pages:**
- `/invoices/dunning` - Dashboard with active dunning cases
- `/invoices/dunning/policies` - Policy configuration
- `/invoices/dunning/history` - Historical dunning actions

**Components:**
- Active dunning cases table
- Policy configuration form
- Dunning stage timeline
- Manual action buttons (Send Reminder, Escalate, Pause)

**API Endpoints:**
```
GET    /api/dunning/policies
POST   /api/dunning/policies
PUT    /api/dunning/policies/:id
DELETE /api/dunning/policies/:id

GET    /api/dunning/active
GET    /api/dunning/history/:invoiceId
POST   /api/dunning/process/:invoiceId
POST   /api/dunning/pause/:invoiceId
POST   /api/dunning/resume/:invoiceId
```

**Policy Configuration Form Fields:**
```typescript
interface DunningPolicy {
  name: string;
  description?: string;
  isActive: boolean;
  triggerDays: number; // Days after due date to start
  stages: DunningStage[];
  lateFeeSettings: {
    enabled: boolean;
    type: 'percentage' | 'fixed';
    value: number;
    maxFee?: number;
    gracePeriodDays: number;
  };
  escalationRules: {
    maxAttempts: number;
    finalAction: 'suspend' | 'collection' | 'writeoff' | 'none';
  };
}

interface DunningStage {
  name: string;
  daysAfterDue: number;
  action: 'email' | 'sms' | 'letter' | 'call' | 'escalate';
  template: string;
  assignee?: 'owner' | 'manager' | 'collections';
}
```

---

### 2.3 Integrations Hub Page

**Path:** `/integrations`

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Integrations                                                │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐ ┌─────────────────────┐             │
│ │ [QB Logo]           │ │ [Xero Logo]         │             │
│ │ QuickBooks Online   │ │ Xero                │             │
│ │ ● Connected         │ │ ○ Not Connected     │             │
│ │ [Manage] [Sync Now] │ │ [Connect]           │             │
│ └─────────────────────┘ └─────────────────────┘             │
│                                                             │
│ ┌─────────────────────┐ ┌─────────────────────┐             │
│ │ [Google Logo]       │ │ [Microsoft Logo]    │             │
│ │ Google Calendar     │ │ Microsoft 365       │             │
│ │ ● Connected         │ │ ○ Not Connected     │             │
│ │ [Manage] [Sync Now] │ │ [Connect]           │             │
│ └─────────────────────┘ └─────────────────────┘             │
│                                                             │
│ Cloud Storage                                               │
│ ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────┐ │
│ │ Google Drive        │ │ Dropbox             │ │ OneDrive│ │
│ │ ○ Not Connected     │ │ ○ Not Connected     │ │ ○ ...   │ │
│ └─────────────────────┘ └─────────────────────┘ └─────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.4 QuickBooks Integration Page

**Path:** `/integrations/quickbooks`

**Components:**
- Connection status card
- OAuth connect button
- Sync settings form
- Sync history table
- Entity mapping configuration
- Manual sync buttons

**API Endpoints:**
```
GET    /api/integrations/quickbooks/status
GET    /api/integrations/quickbooks/auth-url
GET    /api/integrations/quickbooks/callback (OAuth callback)
POST   /api/integrations/quickbooks/disconnect
POST   /api/integrations/quickbooks/sync
GET    /api/integrations/quickbooks/sync-history
PUT    /api/integrations/quickbooks/settings
GET    /api/integrations/quickbooks/mappings
PUT    /api/integrations/quickbooks/mappings
```

**Sync Settings Form:**
```typescript
interface QuickBooksSyncSettings {
  autoSync: boolean;
  syncFrequency: 'hourly' | 'daily' | 'weekly';
  syncEntities: {
    customers: boolean;
    invoices: boolean;
    payments: boolean;
    expenses: boolean;
    chartOfAccounts: boolean;
  };
  syncDirection: 'bidirectional' | 'to_quickbooks' | 'from_quickbooks';
  conflictResolution: 'local_wins' | 'remote_wins' | 'manual';
}
```

---

### 2.5 Google Calendar Integration Page

**Path:** `/integrations/google-calendar`

**Components:**
- Connection status
- Calendar selection (which calendars to sync)
- Event type mapping (which events sync)
- Two-way sync toggle
- Sync status indicator

**API Endpoints:**
```
GET    /api/google-calendar/status
GET    /api/google-calendar/auth-url
GET    /api/google-calendar/callback
POST   /api/google-calendar/disconnect
GET    /api/google-calendar/calendars
PUT    /api/google-calendar/settings
POST   /api/google-calendar/sync
```

---

### 2.6 Cloud Storage Page

**Path:** `/integrations/storage`

**Components:**
- Provider cards (Google Drive, Dropbox, OneDrive)
- Connection status for each
- Default storage selection
- File browser (optional)
- Usage statistics

**API Endpoints:**
```
GET    /api/storage/status
GET    /api/storage/google-drive/auth-url
GET    /api/storage/dropbox/auth-url
GET    /api/storage/onedrive/auth-url
POST   /api/storage/:provider/disconnect
PUT    /api/storage/default
GET    /api/storage/files
POST   /api/storage/upload
```

---

### 2.7 Status Page (Admin)

**Path:** `/admin/status`

**Sub-pages:**
- `/admin/status` - Dashboard
- `/admin/status/components` - System components
- `/admin/status/incidents` - Incident management
- `/admin/status/maintenance` - Maintenance windows
- `/admin/status/subscribers` - Subscriber management

**Public Status Page:** `/status` (no auth required)

**API Endpoints:**
```
# Public
GET    /api/status/public

# Admin
GET    /api/status/components
POST   /api/status/components
PUT    /api/status/components/:id
DELETE /api/status/components/:id

GET    /api/status/incidents
POST   /api/status/incidents
PUT    /api/status/incidents/:id
POST   /api/status/incidents/:id/updates

GET    /api/status/maintenance
POST   /api/status/maintenance
PUT    /api/status/maintenance/:id

GET    /api/status/subscribers
POST   /api/status/subscribers
DELETE /api/status/subscribers/:id
```

**Component Form:**
```typescript
interface SystemComponent {
  name: string;
  nameAr?: string;
  description?: string;
  status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance';
  displayOrder: number;
  isVisible: boolean;
  group?: string;
}
```

---

### 2.8 SLO Monitoring Page (Admin)

**Path:** `/admin/slo`

**Components:**
- SLO summary cards (API Latency, Error Rate, Uptime)
- Time series charts
- SLO definition management
- Alert configuration
- Violation history

**API Endpoints:**
```
GET    /api/slo/metrics
GET    /api/slo/definitions
POST   /api/slo/definitions
PUT    /api/slo/definitions/:id
DELETE /api/slo/definitions/:id
GET    /api/slo/violations
GET    /api/slo/history?period=7d|30d|90d
```

**Page Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ SLO Monitoring                              [Time: 7 days ▼]│
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐             │
│ │ API Latency │ │ Error Rate  │ │ Uptime      │             │
│ │ P99: 245ms  │ │ 0.02%       │ │ 99.98%      │             │
│ │ Target: <300│ │ Target: <1% │ │ Target: 99.9│             │
│ │ ✅ Meeting  │ │ ✅ Meeting  │ │ ✅ Meeting  │             │
│ └─────────────┘ └─────────────┘ └─────────────┘             │
├─────────────────────────────────────────────────────────────┤
│ [Latency Chart Over Time]                                   │
├─────────────────────────────────────────────────────────────┤
│ Recent Violations                                           │
│ ─────────────────────────────────────────────────────────── │
│ Dec 24, 2:30 PM │ API Latency │ P99 exceeded 300ms (312ms) │
│ Dec 22, 9:15 AM │ Error Rate  │ Spike to 2.3% for 5 min    │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.9 Walkthroughs Page

**Path:** `/admin/walkthroughs`

**Components:**
- Walkthrough list table
- Walkthrough builder/editor
- Step configuration
- Preview mode
- Analytics (completion rates)

**API Endpoints:**
```
GET    /api/walkthroughs
POST   /api/walkthroughs
PUT    /api/walkthroughs/:id
DELETE /api/walkthroughs/:id
GET    /api/walkthroughs/:id/analytics
POST   /api/walkthroughs/:id/trigger
```

**Walkthrough Model:**
```typescript
interface Walkthrough {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  trigger: 'auto' | 'manual' | 'first_visit' | 'feature_flag';
  targetPage?: string;
  targetRole?: string[];
  steps: WalkthroughStep[];
  isActive: boolean;
}

interface WalkthroughStep {
  order: number;
  title: string;
  titleAr?: string;
  content: string;
  contentAr?: string;
  targetSelector: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'input' | 'wait';
}
```

---

### 2.10 Custom Fields Page

**Path:** `/settings/custom-fields`

**Components:**
- Entity type tabs (Client, Case, Invoice, etc.)
- Field list table
- Field creation/edit modal
- Drag-and-drop reordering
- Field type previews

**API Endpoints:**
```
GET    /api/custom-fields?entity=client|case|invoice|...
POST   /api/custom-fields
PUT    /api/custom-fields/:id
DELETE /api/custom-fields/:id
PUT    /api/custom-fields/reorder
```

**Field Configuration:**
```typescript
interface CustomField {
  id: string;
  name: string;
  nameAr?: string;
  entityType: 'client' | 'case' | 'invoice' | 'expense' | 'task';
  fieldType: 'text' | 'number' | 'date' | 'select' | 'multiselect' |
             'checkbox' | 'url' | 'email' | 'phone' | 'currency' | 'user';
  options?: { label: string; value: string }[]; // For select/multiselect
  required: boolean;
  showInList: boolean;
  showInForm: boolean;
  showInFilters: boolean;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  displayOrder: number;
}
```

---

### 2.11 Keyboard Shortcuts Page

**Path:** `/settings/keyboard-shortcuts`

**Components:**
- Shortcut list grouped by category
- Edit shortcut modal
- Reset to defaults button
- Conflict detection
- Quick reference panel

**API Endpoints:**
```
GET    /api/keyboard-shortcuts
PUT    /api/keyboard-shortcuts
POST   /api/keyboard-shortcuts/reset
```

**Default Shortcuts:**
```typescript
const defaultShortcuts = {
  global: {
    'command_palette': { keys: ['mod', 'k'], description: 'Open command palette' },
    'quick_search': { keys: ['mod', '/'], description: 'Quick search' },
    'new_item': { keys: ['mod', 'n'], description: 'Create new item' },
    'save': { keys: ['mod', 's'], description: 'Save current item' },
    'help': { keys: ['mod', '?'], description: 'Show keyboard shortcuts' }
  },
  navigation: {
    'go_dashboard': { keys: ['g', 'd'], description: 'Go to dashboard' },
    'go_cases': { keys: ['g', 'c'], description: 'Go to cases' },
    'go_clients': { keys: ['g', 'l'], description: 'Go to clients' },
    'go_invoices': { keys: ['g', 'i'], description: 'Go to invoices' },
    'go_settings': { keys: ['g', 's'], description: 'Go to settings' }
  },
  lists: {
    'select_all': { keys: ['mod', 'a'], description: 'Select all items' },
    'deselect_all': { keys: ['escape'], description: 'Deselect all' },
    'delete_selected': { keys: ['mod', 'backspace'], description: 'Delete selected' },
    'next_item': { keys: ['j'], description: 'Next item' },
    'prev_item': { keys: ['k'], description: 'Previous item' },
    'open_item': { keys: ['enter'], description: 'Open selected item' }
  }
};
```

---

### 2.12 Plugins Page

**Path:** `/settings/plugins`

**Components:**
- Installed plugins list
- Plugin marketplace (available plugins)
- Plugin settings modal
- Enable/disable toggles
- Version management

**API Endpoints:**
```
GET    /api/plugins
GET    /api/plugins/available
POST   /api/plugins/:id/install
DELETE /api/plugins/:id/uninstall
PUT    /api/plugins/:id/settings
POST   /api/plugins/:id/enable
POST   /api/plugins/:id/disable
```

---

### 2.13 Webhooks Page

**Path:** `/settings/webhooks`

**Components:**
- Webhook list table
- Create/edit webhook modal
- Event type selector
- Delivery history table
- Secret key management
- Test webhook button

**API Endpoints:**
```
GET    /api/webhooks
POST   /api/webhooks
PUT    /api/webhooks/:id
DELETE /api/webhooks/:id
POST   /api/webhooks/:id/test
GET    /api/webhooks/:id/deliveries
POST   /api/webhooks/:id/deliveries/:deliveryId/retry
```

**Webhook Configuration:**
```typescript
interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret: string;
  headers?: Record<string, string>;
  retryPolicy: {
    maxRetries: number;
    retryDelay: number;
  };
}

// Available events
const webhookEvents = [
  'invoice.created', 'invoice.updated', 'invoice.paid', 'invoice.overdue',
  'client.created', 'client.updated', 'client.deleted',
  'case.created', 'case.updated', 'case.closed',
  'payment.received', 'payment.failed',
  'expense.created', 'expense.approved', 'expense.rejected',
  'task.created', 'task.completed', 'task.overdue'
];
```

---

### 2.14 Field History Modal

**Usage:** Add to any entity detail page (Client, Case, Invoice, etc.)

**Component:** `<FieldHistoryModal entityType="client" entityId={clientId} />`

**API Endpoint:**
```
GET /api/field-history/:entityType/:entityId
```

**Display:**
```
┌─────────────────────────────────────────────────────────────┐
│ Change History                                         [X]  │
├─────────────────────────────────────────────────────────────┤
│ Dec 24, 2024 3:45 PM - John Doe                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Status: Draft → Sent                                   │ │
│ │ Amount: $1,000 → $1,200                                │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Dec 23, 2024 10:30 AM - Jane Smith                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Due Date: Dec 30 → Jan 15                              │ │
│ │ Notes: Added payment terms                             │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.15 Playbooks Page (Admin)

**Path:** `/admin/playbooks`

**Components:**
- Playbook list
- Playbook editor (workflow builder)
- Trigger configuration
- Execution history
- Step templates

**API Endpoints:**
```
GET    /api/playbooks
POST   /api/playbooks
PUT    /api/playbooks/:id
DELETE /api/playbooks/:id
POST   /api/playbooks/:id/execute
GET    /api/playbooks/:id/executions
```

---

## 3. Settings Pages

### Settings Page Structure

```
/settings
├── /settings/general
├── /settings/profile
├── /settings/notifications
├── /settings/integrations        ← NEW
│   ├── /settings/integrations/accounting
│   ├── /settings/integrations/calendar
│   └── /settings/integrations/storage
├── /settings/custom-fields       ← NEW
├── /settings/keyboard-shortcuts  ← NEW
├── /settings/plugins             ← NEW
├── /settings/webhooks            ← NEW
├── /settings/api-keys
└── /settings/security
```

### Settings Sidebar Update

```typescript
const settingsNavItems = [
  { id: 'general', label: 'General', icon: 'CogIcon', path: '/settings/general' },
  { id: 'profile', label: 'Profile', icon: 'UserIcon', path: '/settings/profile' },
  { id: 'notifications', label: 'Notifications', icon: 'BellIcon', path: '/settings/notifications' },

  // NEW ITEMS
  { id: 'integrations', label: 'Integrations', icon: 'PuzzlePieceIcon', path: '/settings/integrations' },
  { id: 'custom-fields', label: 'Custom Fields', icon: 'TableCellsIcon', path: '/settings/custom-fields' },
  { id: 'keyboard-shortcuts', label: 'Keyboard Shortcuts', icon: 'CommandLineIcon', path: '/settings/keyboard-shortcuts' },
  { id: 'plugins', label: 'Plugins', icon: 'CubeIcon', path: '/settings/plugins' },
  { id: 'webhooks', label: 'Webhooks', icon: 'ArrowsRightLeftIcon', path: '/settings/webhooks' },

  { id: 'api-keys', label: 'API Keys', icon: 'KeyIcon', path: '/settings/api-keys' },
  { id: 'security', label: 'Security', icon: 'ShieldCheckIcon', path: '/settings/security' }
];
```

---

## 4. Components to Build

### 4.1 Command Palette Component

**Location:** Global component, mounted at app root

**Features:**
- Fuzzy search across all entities
- Recent items
- Quick actions
- Keyboard navigation

**Implementation:**
```tsx
import { useEffect, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useHotkeys('mod+k', (e) => {
    e.preventDefault();
    setIsOpen(true);
  });

  useEffect(() => {
    if (query.length > 1) {
      fetch(`/api/command-palette/search?q=${query}`)
        .then(res => res.json())
        .then(data => setResults(data.results));
    }
  }, [query]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="command-palette">
        <input
          type="text"
          placeholder="Search or type a command..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="results">
          {results.map(result => (
            <CommandPaletteItem key={result.id} item={result} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**API Endpoints:**
```
GET /api/command-palette/search?q=query
GET /api/command-palette/recent
GET /api/command-palette/actions
POST /api/command-palette/execute
```

---

### 4.2 Bulk Actions Component

**Location:** List pages (Clients, Invoices, Cases, etc.)

**Features:**
- Multi-select with checkboxes
- Floating action bar when items selected
- Batch operations (delete, update status, assign, export)

**Implementation:**
```tsx
export function BulkActionsBar({ selectedIds, entityType, onComplete }) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBulkAction = async (action: string, data?: any) => {
    setIsProcessing(true);
    const response = await fetch('/api/bulk-actions', {
      method: 'POST',
      body: JSON.stringify({
        entityType,
        entityIds: selectedIds,
        action,
        data
      })
    });
    const result = await response.json();
    onComplete(result);
    setIsProcessing(false);
  };

  return (
    <div className="bulk-actions-bar">
      <span>{selectedIds.length} selected</span>
      <button onClick={() => handleBulkAction('delete')}>Delete</button>
      <button onClick={() => handleBulkAction('export')}>Export</button>
      <button onClick={() => handleBulkAction('update_status', { status: 'active' })}>
        Set Active
      </button>
    </div>
  );
}
```

---

### 4.3 Saved Filters Component

**Location:** List pages

**Features:**
- Save current filter state
- Name and share filters
- Quick filter switching
- Filter management modal

**API Endpoints:**
```
GET    /api/saved-filters?entity=invoices
POST   /api/saved-filters
PUT    /api/saved-filters/:id
DELETE /api/saved-filters/:id
```

---

### 4.4 Walkthrough Overlay Component

**Location:** Global component

**Library Recommendation:** [react-joyride](https://react-joyride.com/) or [driver.js](https://driverjs.com/)

**Implementation:**
```tsx
import Joyride from 'react-joyride';

export function WalkthroughProvider({ children }) {
  const [walkthrough, setWalkthrough] = useState(null);
  const [run, setRun] = useState(false);

  useEffect(() => {
    // Check for pending walkthroughs on mount
    fetch('/api/walkthroughs/pending')
      .then(res => res.json())
      .then(data => {
        if (data.walkthrough) {
          setWalkthrough(data.walkthrough);
          setRun(true);
        }
      });
  }, []);

  return (
    <>
      {children}
      {walkthrough && (
        <Joyride
          steps={walkthrough.steps.map(step => ({
            target: step.targetSelector,
            content: step.content,
            placement: step.placement
          }))}
          run={run}
          continuous
          showProgress
          showSkipButton
        />
      )}
    </>
  );
}
```

---

### 4.5 Offline Indicator Component

**Location:** App header/status bar

**Features:**
- Connection status indicator
- Pending sync count
- Manual sync button
- Offline mode banner

**Implementation:**
```tsx
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && pendingSync === 0) return null;

  return (
    <div className={`offline-indicator ${isOnline ? 'syncing' : 'offline'}`}>
      {isOnline ? (
        <span>Syncing {pendingSync} changes...</span>
      ) : (
        <span>You're offline. Changes will sync when connected.</span>
      )}
    </div>
  );
}
```

---

## 5. API Endpoints Reference

### Complete New Endpoints List

```typescript
// AR Aging
GET    /api/ar-aging/summary
GET    /api/ar-aging/by-client
GET    /api/ar-aging/by-invoice
GET    /api/ar-aging/export

// Dunning
GET    /api/dunning/policies
POST   /api/dunning/policies
PUT    /api/dunning/policies/:id
DELETE /api/dunning/policies/:id
GET    /api/dunning/active
POST   /api/dunning/process/:invoiceId
POST   /api/dunning/pause/:invoiceId
POST   /api/dunning/resume/:invoiceId
GET    /api/dunning/history/:invoiceId

// Integrations - QuickBooks
GET    /api/integrations/quickbooks/status
GET    /api/integrations/quickbooks/auth-url
POST   /api/integrations/quickbooks/disconnect
POST   /api/integrations/quickbooks/sync
GET    /api/integrations/quickbooks/sync-history
PUT    /api/integrations/quickbooks/settings

// Integrations - Xero
GET    /api/integrations/xero/status
GET    /api/integrations/xero/auth-url
POST   /api/integrations/xero/disconnect
POST   /api/integrations/xero/sync
GET    /api/integrations/xero/sync-history
PUT    /api/integrations/xero/settings

// Google Calendar
GET    /api/google-calendar/status
GET    /api/google-calendar/auth-url
POST   /api/google-calendar/disconnect
GET    /api/google-calendar/calendars
PUT    /api/google-calendar/settings
POST   /api/google-calendar/sync

// Microsoft Calendar
GET    /api/microsoft-calendar/status
GET    /api/microsoft-calendar/auth-url
POST   /api/microsoft-calendar/disconnect
GET    /api/microsoft-calendar/calendars
PUT    /api/microsoft-calendar/settings
POST   /api/microsoft-calendar/sync

// Cloud Storage
GET    /api/storage/status
GET    /api/storage/:provider/auth-url
POST   /api/storage/:provider/disconnect
PUT    /api/storage/default
GET    /api/storage/files
POST   /api/storage/upload

// Status Page
GET    /api/status/public
GET    /api/status/components
POST   /api/status/components
PUT    /api/status/components/:id
GET    /api/status/incidents
POST   /api/status/incidents
PUT    /api/status/incidents/:id
GET    /api/status/maintenance
POST   /api/status/maintenance

// SLO Monitoring
GET    /api/slo/metrics
GET    /api/slo/definitions
POST   /api/slo/definitions
PUT    /api/slo/definitions/:id
GET    /api/slo/violations
GET    /api/slo/history

// Walkthroughs
GET    /api/walkthroughs
POST   /api/walkthroughs
PUT    /api/walkthroughs/:id
DELETE /api/walkthroughs/:id
GET    /api/walkthroughs/pending
POST   /api/walkthroughs/:id/complete

// Custom Fields
GET    /api/custom-fields
POST   /api/custom-fields
PUT    /api/custom-fields/:id
DELETE /api/custom-fields/:id
PUT    /api/custom-fields/reorder

// Keyboard Shortcuts
GET    /api/keyboard-shortcuts
PUT    /api/keyboard-shortcuts
POST   /api/keyboard-shortcuts/reset

// Plugins
GET    /api/plugins
GET    /api/plugins/available
POST   /api/plugins/:id/install
DELETE /api/plugins/:id/uninstall
PUT    /api/plugins/:id/settings

// Webhooks
GET    /api/webhooks
POST   /api/webhooks
PUT    /api/webhooks/:id
DELETE /api/webhooks/:id
POST   /api/webhooks/:id/test
GET    /api/webhooks/:id/deliveries

// Field History
GET    /api/field-history/:entityType/:entityId

// Command Palette
GET    /api/command-palette/search
GET    /api/command-palette/recent
POST   /api/command-palette/execute

// Bulk Actions
POST   /api/bulk-actions

// Saved Filters
GET    /api/saved-filters
POST   /api/saved-filters
PUT    /api/saved-filters/:id
DELETE /api/saved-filters/:id

// Offline Sync
GET    /api/offline/pending
POST   /api/offline/sync
GET    /api/offline/conflicts
POST   /api/offline/resolve-conflict

// Rate Limits (Admin)
GET    /api/rate-limits/usage
GET    /api/rate-limits/tiers
PUT    /api/rate-limits/tiers/:id

// Playbooks
GET    /api/playbooks
POST   /api/playbooks
PUT    /api/playbooks/:id
DELETE /api/playbooks/:id
POST   /api/playbooks/:id/execute
```

---

## 6. Keyboard Shortcuts

### Default Keyboard Shortcuts to Implement

| Shortcut | Action | Context |
|----------|--------|---------|
| `Cmd/Ctrl + K` | Open command palette | Global |
| `Cmd/Ctrl + /` | Quick search | Global |
| `Cmd/Ctrl + N` | Create new item | Lists |
| `Cmd/Ctrl + S` | Save | Forms |
| `Cmd/Ctrl + Enter` | Submit form | Forms |
| `Escape` | Close modal/cancel | Global |
| `G + D` | Go to Dashboard | Global |
| `G + C` | Go to Cases | Global |
| `G + L` | Go to Clients | Global |
| `G + I` | Go to Invoices | Global |
| `G + S` | Go to Settings | Global |
| `J` | Next item | Lists |
| `K` | Previous item | Lists |
| `X` | Toggle selection | Lists |
| `Cmd/Ctrl + A` | Select all | Lists |
| `Enter` | Open selected | Lists |
| `Cmd/Ctrl + Backspace` | Delete selected | Lists |
| `?` | Show shortcuts help | Global |

### Implementation with react-hotkeys-hook

```tsx
import { useHotkeys } from 'react-hotkeys-hook';
import { useNavigate } from 'react-router-dom';

export function useGlobalShortcuts() {
  const navigate = useNavigate();

  // Navigation shortcuts (g + key)
  useHotkeys('g+d', () => navigate('/dashboard'));
  useHotkeys('g+c', () => navigate('/cases'));
  useHotkeys('g+l', () => navigate('/clients'));
  useHotkeys('g+i', () => navigate('/invoices'));
  useHotkeys('g+s', () => navigate('/settings'));

  // Global actions
  useHotkeys('mod+k', (e) => {
    e.preventDefault();
    openCommandPalette();
  });

  useHotkeys('?', () => showShortcutsHelp());
}
```

---

## 7. Implementation Priority

### Phase 1: Core Features (Week 1-2)

1. **Command Palette** - High impact, improves UX significantly
2. **Keyboard Shortcuts** - Works with command palette
3. **Bulk Actions** - Needed for efficiency
4. **Saved Filters** - Common user request

### Phase 2: Finance Features (Week 2-3)

5. **AR Aging Report** - Critical for finance teams
6. **Dunning Management** - Automates collections
7. **Field History** - Audit trail requirement

### Phase 3: Integrations (Week 3-4)

8. **Integrations Hub Page** - Navigation entry point
9. **QuickBooks Integration** - Most requested
10. **Xero Integration** - Second most requested
11. **Google Calendar** - High value
12. **Cloud Storage** - Convenience feature

### Phase 4: Admin Features (Week 4-5)

13. **Status Page** - Public and admin views
14. **SLO Monitoring** - Internal tool
15. **Webhooks** - Developer feature
16. **Custom Fields** - Flexibility feature

### Phase 5: Advanced Features (Week 5-6)

17. **Plugins** - Extensibility
18. **Walkthroughs** - Onboarding
19. **Playbooks** - Automation
20. **Offline Sync** - PWA enhancement

---

## Appendix: Type Definitions

See `/home/user/traf3li-backend/docs/api/types/` for complete TypeScript type definitions for all API responses.

---

## Questions?

For API documentation, see Swagger UI at `/api-docs`.
For backend implementation details, see the service files in `src/services/`.
