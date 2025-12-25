# Offline Sync API Documentation

Backend APIs to support offline/PWA functionality for the Traf3li platform.

## Overview

The Offline Sync API provides comprehensive support for Progressive Web App (PWA) offline functionality, including:
- Data synchronization between online and offline states
- Conflict resolution for concurrent changes
- Sync manifest generation for intelligent caching
- Delta sync (only changes since last sync)
- Validation of offline changes

## Endpoints

### 1. GET /api/offline/manifest
Get sync manifest with data to cache.

**Query Parameters:**
- `firmId` (optional): Firm ID

**Response:**
```json
{
  "success": true,
  "message": "Sync manifest generated successfully",
  "data": {
    "version": "1.0.0",
    "generatedAt": "2025-12-25T08:00:00Z",
    "userId": "user-id",
    "firmId": "firm-id",
    "entities": {
      "user": { "type": "user", "count": 1, "priority": 1, "cacheStrategy": "always" },
      "clients": { "type": "client", "count": 50, "priority": 2, "cacheStrategy": "recent", "limit": 50 },
      "invoices": { "type": "invoice", "count": 100, "priority": 3, "cacheStrategy": "recent", "limit": 100 }
    },
    "totalSize": 152
  }
}
```

### 2. GET /api/offline/data
Get essential data for offline caching.

**Query Parameters:**
- `firmId` (optional): Firm ID
- `entityTypes` (optional): Comma-separated list (e.g., "clients,invoices,cases")

**Response:**
```json
{
  "success": true,
  "message": "Offline data retrieved successfully",
  "data": {
    "user": { /* user profile */ },
    "clients": [ /* array of recent clients */ ],
    "invoices": [ /* array of recent invoices */ ],
    "cases": [ /* array of cases */ ],
    "expenses": [ /* array of expenses */ ],
    "billingRates": [ /* array of billing rates */ ],
    "expenseCategories": [ /* array of expense categories */ ],
    "paymentMethods": [ /* array of payment methods */ ],
    "_metadata": {
      "fetchedAt": "2025-12-25T08:00:00Z",
      "userId": "user-id",
      "firmId": "firm-id",
      "entityTypes": ["user", "clients", "invoices"],
      "version": "1.0.0"
    }
  }
}
```

### 3. POST /api/offline/sync
Sync changes from offline queue.

**Request Body:**
```json
{
  "changes": [
    {
      "id": "change-1",
      "entityType": "client",
      "entityId": "entity-id",
      "operation": "update",
      "timestamp": "2025-12-25T07:00:00Z",
      "data": { /* changed fields */ }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Processed 5 changes: 4 succeeded, 1 failed",
  "data": {
    "processed": 5,
    "succeeded": 4,
    "failed": 1,
    "conflicts": [ /* array of conflicts */ ],
    "errors": [ /* array of errors */ ],
    "details": [ /* array of processed changes */ ]
  }
}
```

### 4. GET /api/offline/changes
Get changes since last sync.

**Query Parameters:**
- `since` (optional): ISO timestamp (defaults to last sync time)
- `firmId` (optional): Firm ID
- `entityTypes` (optional): Comma-separated list

**Response:**
```json
{
  "success": true,
  "message": "Changes retrieved successfully",
  "data": {
    "since": "2025-12-25T06:00:00Z",
    "fetchedAt": "2025-12-25T08:00:00Z",
    "hasChanges": true,
    "entities": {
      "clients": [ /* changed clients */ ],
      "invoices": [ /* changed invoices */ ],
      "cases": [ /* changed cases */ ],
      "expenses": [ /* changed expenses */ ]
    }
  }
}
```

### 5. POST /api/offline/conflicts/resolve
Resolve sync conflicts.

**Request Body:**
```json
{
  "conflicts": [
    {
      "entityType": "invoice",
      "entityId": "entity-id",
      "resolution": "useLocal",  // or "useServer" or "merge"
      "localData": { /* local version */ },
      "serverData": { /* server version */ }
    }
  ]
}
```

**Resolution Strategies:**
- `useLocal`: Apply local changes
- `useServer`: Keep server version
- `merge`: Merge both versions (local takes precedence)

**Response:**
```json
{
  "success": true,
  "message": "Resolved 3 conflicts, 0 failed",
  "data": {
    "resolved": 3,
    "failed": 0,
    "details": [ /* resolution details */ ]
  }
}
```

### 6. GET /api/offline/status
Get current sync status.

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user-id",
    "firmId": "firm-id",
    "lastSyncedAt": "2025-12-25T07:00:00Z",
    "timeSinceSync": {
      "milliseconds": 3600000,
      "minutes": 60,
      "hours": 1,
      "days": 0
    },
    "syncStatus": "recent",  // "never", "current", "recent", "stale", "outdated"
    "hasChanges": true,
    "isOnline": true
  }
}
```

## Change Object Structure

```javascript
{
  id: String,           // Unique change ID (required)
  entityType: String,   // Entity type (required): client, invoice, case, expense, timeEntry
  entityId: String,     // Entity ID (required for update/delete)
  operation: String,    // Operation (required): create, update, delete
  timestamp: String,    // ISO timestamp (required)
  data: Object         // Entity data (required for create/update)
}
```

## Essential Offline Data

The API caches the following data for offline use:

1. **User Profile**: User settings and preferences
2. **Recent Clients**: Last 50 clients (sorted by recent activity)
3. **Recent Invoices**: Last 100 invoices (sorted by date)
4. **Time Entry Rates**: Billing rates for time entries
5. **Expense Categories**: Chart of accounts for expenses
6. **Case List**: All cases for the firm
7. **Payment Methods**: Bank accounts and cash accounts

## Error Handling

All endpoints follow the standard error response format:

```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "changeId": "change-1",
      "entityType": "client",
      "error": "Validation failed"
    }
  ]
}
```

## Validation

Changes are validated for:
- Required fields (id, entityType, operation)
- Valid operation types (create, update, delete)
- Valid entity types
- Data presence for create/update operations
- Valid timestamp format

## Sync Status Levels

- **never**: User has never synced
- **current**: Last sync < 5 minutes ago
- **recent**: Last sync < 60 minutes ago
- **stale**: Last sync < 24 hours ago
- **outdated**: Last sync > 24 hours ago

## Implementation Notes

1. All endpoints require authentication via `userMiddleware`
2. No caching is applied (`noCache` middleware) to ensure fresh data
3. The service automatically updates `lastSyncedAt` timestamp after successful sync
4. Conflict detection is based on `updatedAt` timestamps
5. Delta sync is supported via `getChangesSince` endpoint

## Usage Example

```javascript
// 1. Check sync status
const status = await fetch('/api/offline/status');

// 2. Get offline data on first load
const data = await fetch('/api/offline/data?entityTypes=clients,invoices');

// 3. Sync changes when back online
const syncResult = await fetch('/api/offline/sync', {
  method: 'POST',
  body: JSON.stringify({ changes: queuedChanges })
});

// 4. Handle conflicts if any
if (syncResult.data.conflicts.length > 0) {
  const resolution = await fetch('/api/offline/conflicts/resolve', {
    method: 'POST',
    body: JSON.stringify({ conflicts: resolvedConflicts })
  });
}

// 5. Get incremental changes
const changes = await fetch('/api/offline/changes?since=2025-12-25T06:00:00Z');
```

## Files Created

1. `/src/services/offlineSync.service.js` - Core sync logic and data retrieval
2. `/src/controllers/offlineSync.controller.js` - API endpoint handlers
3. `/src/routes/offlineSync.routes.js` - Route definitions
4. Updated `/src/routes/index.js` - Added route exports
5. Updated `/src/server.js` - Added route registration

## Future Enhancements

Potential improvements for future versions:

1. **Compression**: Compress sync data for faster transfer
2. **Partial Updates**: Support field-level changes instead of full entity
3. **Binary Data**: Handle file attachments in offline mode
4. **Smart Caching**: ML-based prediction of what to cache
5. **Background Sync**: Use Service Worker Background Sync API
6. **Versioning**: Track schema versions for offline data
7. **Encryption**: Encrypt offline data for security
