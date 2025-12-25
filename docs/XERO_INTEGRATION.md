# Xero Integration Guide

Comprehensive guide for integrating Xero accounting software with TRAF3LI.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [OAuth Flow](#oauth-flow)
6. [Sync Operations](#sync-operations)
7. [Mapping](#mapping)
8. [Webhooks](#webhooks)
9. [API Reference](#api-reference)
10. [Troubleshooting](#troubleshooting)

## Overview

The Xero integration service provides bidirectional synchronization between TRAF3LI and Xero accounting software, including:

- **OAuth 2.0 Authentication**: Secure connection with PKCE support
- **Chart of Accounts Sync**: Import/export account structures
- **Contact Management**: Sync customers and vendors
- **Invoice Synchronization**: Bidirectional invoice sync
- **Payment Tracking**: Import payment records
- **Bills Management**: Sync vendor bills
- **Bank Transactions**: Import bank transactions
- **Items/Products**: Sync products and services
- **Webhooks**: Real-time updates from Xero

## Prerequisites

1. **Xero Account**: Active Xero subscription
2. **Xero Developer Account**: Sign up at https://developer.xero.com
3. **Xero OAuth App**: Create an OAuth 2.0 app in Xero Developer portal
4. **Node.js**: Version 14 or higher
5. **MongoDB**: For storing integration settings and sync data

## Installation

### 1. Install Required Packages

```bash
npm install xero-node
```

### 2. Environment Variables

Add the following to your `.env` file:

```bash
# Xero OAuth Configuration
XERO_CLIENT_ID=your_xero_client_id
XERO_CLIENT_SECRET=your_xero_client_secret
XERO_REDIRECT_URI=https://your-domain.com/api/integrations/xero/callback

# Encryption Key (required for secure token storage)
ENCRYPTION_KEY=your_64_character_hex_encryption_key

# Backend URL
BACKEND_URL=https://your-domain.com
```

### 3. Generate Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Configuration

### Xero Developer Portal Setup

1. **Create OAuth App**:
   - Go to https://developer.xero.com/app/manage
   - Click "New App"
   - Choose "OAuth 2.0"
   - Set redirect URI: `https://your-domain.com/api/integrations/xero/callback`

2. **Get Credentials**:
   - Copy Client ID and Client Secret
   - Add to `.env` file

3. **Set Scopes**:
   The service automatically requests these scopes:
   - `offline_access` - Refresh tokens
   - `openid`, `profile`, `email` - User info
   - `accounting.transactions` - Invoices, payments, bills
   - `accounting.contacts` - Customers and vendors
   - `accounting.settings` - Chart of accounts
   - `accounting.attachments` - Document attachments

## OAuth Flow

### 1. Generate Authorization URL

```javascript
const xeroService = require('./services/xero.service');

// Generate auth URL
const { authUrl, state } = await xeroService.getAuthUrl(firmId);

// Redirect user to authUrl
res.redirect(authUrl);
```

### 2. Handle OAuth Callback

```javascript
// In your callback route
const { code, state } = req.query;

const result = await xeroService.handleCallback(code, state);

// Result contains:
// {
//   success: true,
//   tenantId: '...',
//   tenantName: 'Company Name',
//   tenantType: 'COMPANY'
// }
```

### 3. Token Refresh

Tokens are automatically refreshed when expired. Manual refresh:

```javascript
await xeroService.refreshToken(firmId);
```

### 4. Disconnect

```javascript
await xeroService.disconnect(firmId);
```

## Sync Operations

### Chart of Accounts

```javascript
// Sync from Xero to TRAF3LI
const result = await xeroService.syncChartOfAccounts(
    firmId,
    'from_xero'
);

// Sync to Xero from TRAF3LI
const result = await xeroService.syncChartOfAccounts(
    firmId,
    'to_xero'
);

// Bidirectional sync
const result = await xeroService.syncChartOfAccounts(
    firmId,
    'bidirectional'
);
```

### Contacts (Customers/Vendors)

```javascript
const result = await xeroService.syncContacts(
    firmId,
    'bidirectional'
);

// Result:
// {
//   direction: 'bidirectional',
//   imported: 150,
//   exported: 25,
//   errors: []
// }
```

### Invoices

```javascript
// Sync all invoices
const result = await xeroService.syncInvoices(firmId);

// Sync invoices modified since last sync
const lastSyncDate = new Date('2024-01-01');
const result = await xeroService.syncInvoices(firmId, lastSyncDate);
```

### Payments

```javascript
const result = await xeroService.syncPayments(firmId);

// With date filter
const result = await xeroService.syncPayments(firmId, lastSyncDate);
```

### Bills

```javascript
const result = await xeroService.syncBills(firmId);

// With date filter
const result = await xeroService.syncBills(firmId, lastSyncDate);
```

### Bank Transactions

```javascript
const result = await xeroService.syncBankTransactions(firmId);

// With date filter
const result = await xeroService.syncBankTransactions(firmId, lastSyncDate);
```

### Items/Products

```javascript
const result = await xeroService.syncItems(
    firmId,
    'bidirectional'
);
```

## Mapping

### Invoice Mapping (TRAF3LI to Xero)

```javascript
const xeroInvoice = xeroService.mapInvoiceToXero({
    invoiceNumber: 'INV-2024-001',
    clientName: 'Client Name',
    clientId: '...',
    issueDate: new Date(),
    dueDate: new Date(),
    status: 'sent',
    currency: 'SAR',
    lineItems: [
        {
            description: 'Legal Consultation',
            quantity: 2,
            unitPrice: 500,
            lineTotal: 1000,
            taxable: true
        }
    ],
    subtotal: 1000,
    vatAmount: 150,
    total: 1150
});
```

### Invoice Mapping (Xero to TRAF3LI)

```javascript
const traf3liInvoice = xeroService.mapXeroToInvoice(xeroInvoice);

// Returns:
// {
//   xeroInvoiceId: '...',
//   invoiceNumber: 'INV-001',
//   clientName: 'Client Name',
//   issueDate: Date,
//   dueDate: Date,
//   status: 'sent',
//   currency: 'SAR',
//   lineItems: [...],
//   subtotal: 1000,
//   vatAmount: 150,
//   total: 1150,
//   amountDue: 1150,
//   amountPaid: 0
// }
```

### Status Mapping

| TRAF3LI Status | Xero Status |
|---------------|-------------|
| draft | DRAFT |
| sent | SUBMITTED |
| partial | AUTHORISED |
| paid | PAID |
| void | VOIDED |
| cancelled | DELETED |

## Webhooks

### Enable Webhooks

```javascript
// Update sync settings to enable webhooks
await xeroService.updateSyncSettings(firmId, {
    webhooks: {
        enabled: true
    }
});
```

### Webhook Endpoint

Create a route to handle Xero webhooks:

```javascript
app.post('/api/integrations/xero/webhook', async (req, res) => {
    const signature = req.headers['x-xero-signature'];
    const payload = req.body;
    const firmId = req.body.tenantId; // Map to your firm

    try {
        const result = await xeroService.handleWebhook(
            payload,
            signature,
            firmId
        );

        res.json(result);
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(400).json({ error: error.message });
    }
});
```

### Configure Webhook in Xero

1. Go to Xero Developer Portal
2. Select your app
3. Navigate to Webhooks section
4. Add webhook URL: `https://your-domain.com/api/integrations/xero/webhook`
5. Select events to subscribe to

### Supported Webhook Events

- `INVOICE` (CREATE, UPDATE, DELETE)
- `CONTACT` (CREATE, UPDATE, DELETE)
- `PAYMENT` (CREATE, UPDATE)
- `BANKTRANSACTION` (CREATE, UPDATE)

## API Reference

### Connection Management

#### `getAuthUrl(firmId, state?)`
Generate OAuth authorization URL.

**Parameters:**
- `firmId` (string): Firm ID
- `state` (string, optional): Custom state parameter

**Returns:** `{ authUrl: string, state: string }`

#### `handleCallback(code, state)`
Handle OAuth callback and store tokens.

**Parameters:**
- `code` (string): Authorization code
- `state` (string): State parameter

**Returns:** `{ success: boolean, tenantId: string, tenantName: string, tenantType: string }`

#### `refreshToken(firmId)`
Refresh expired access token.

**Parameters:**
- `firmId` (string): Firm ID

**Returns:** `{ success: boolean, expiresAt: Date }`

#### `disconnect(firmId)`
Disconnect Xero integration.

**Parameters:**
- `firmId` (string): Firm ID

**Returns:** `{ success: boolean }`

#### `getTenants(firmId)`
Get connected Xero organizations.

**Parameters:**
- `firmId` (string): Firm ID

**Returns:** Array of tenant objects

### Sync Operations

#### `syncChartOfAccounts(firmId, direction)`
Sync chart of accounts.

**Parameters:**
- `firmId` (string): Firm ID
- `direction` (string): 'to_xero', 'from_xero', or 'bidirectional'

**Returns:** `{ direction: string, imported: number, exported: number, errors: Array }`

#### `syncContacts(firmId, direction)`
Sync contacts (customers/vendors).

#### `syncInvoices(firmId, lastSyncDate?)`
Sync invoices.

#### `syncPayments(firmId, lastSyncDate?)`
Sync payments.

#### `syncBills(firmId, lastSyncDate?)`
Sync bills.

#### `syncBankTransactions(firmId, lastSyncDate?)`
Sync bank transactions.

#### `syncItems(firmId, direction)`
Sync items/products.

### Status and Utilities

#### `getConnectionStatus(firmId)`
Get Xero connection status.

**Returns:**
```javascript
{
    connected: boolean,
    tenantId: string,
    tenantName: string,
    connectedAt: Date,
    lastSyncedAt: Date,
    tokenExpired: boolean,
    expiresAt: Date,
    expiresIn: number, // seconds
    autoSync: boolean,
    syncInterval: string,
    webhooksEnabled: boolean
}
```

#### `getSyncStatus(firmId)`
Get sync status for all entities.

**Returns:**
```javascript
{
    autoSync: boolean,
    syncInterval: string,
    syncDirection: string,
    lastSync: {
        chartOfAccounts: Date,
        contacts: Date,
        invoices: Date,
        payments: Date,
        bills: Date,
        bankTransactions: Date,
        items: Date
    },
    mapping: {
        defaultAccountCode: string,
        defaultTaxType: string,
        currencyMapping: object
    }
}
```

#### `updateSyncSettings(firmId, settings)`
Update sync settings.

#### `testConnection(firmId)`
Test Xero connection.

## Troubleshooting

### Token Expired Error

If you get "Access token expired" error:

```javascript
await xeroService.refreshToken(firmId);
```

### Connection Issues

1. **Check credentials**: Verify XERO_CLIENT_ID and XERO_CLIENT_SECRET
2. **Check redirect URI**: Must match exactly in Xero Developer Portal
3. **Check scopes**: Ensure all required scopes are enabled
4. **Test connection**:
   ```javascript
   const result = await xeroService.testConnection(firmId);
   console.log(result);
   ```

### Sync Errors

Common sync errors and solutions:

1. **Rate Limit Exceeded**: Wait and retry (60 calls/minute, 5000/day)
2. **Invalid Account Code**: Check account code mapping in sync settings
3. **Missing Contact**: Sync contacts before syncing invoices
4. **Currency Mismatch**: Ensure currency codes match

### Webhook Verification Failed

1. Check webhook secret in firm settings
2. Verify signature calculation
3. Ensure raw body is used (not parsed JSON)

### Debug Mode

Enable debug logging:

```javascript
// In your logger configuration
logger.level = 'debug';
```

## Best Practices

1. **Token Management**:
   - Tokens are automatically refreshed
   - Store tokens securely (encrypted)
   - Handle token expiration gracefully

2. **Sync Strategy**:
   - Use incremental sync with `lastSyncDate`
   - Implement retry logic for failed syncs
   - Monitor sync errors and handle them appropriately

3. **Rate Limiting**:
   - Respect Xero's rate limits (60/minute, 5000/day)
   - Implement exponential backoff for retries
   - Use webhooks instead of frequent polling

4. **Data Mapping**:
   - Maintain consistent mapping between systems
   - Store Xero IDs for bidirectional sync
   - Handle edge cases (missing fields, invalid data)

5. **Error Handling**:
   - Log all errors for debugging
   - Provide meaningful error messages to users
   - Implement circuit breaker pattern for resilience

6. **Security**:
   - Encrypt tokens at rest
   - Use HTTPS for all API calls
   - Validate webhook signatures
   - Implement proper access control

## Support

For issues or questions:
- Xero Developer Support: https://developer.xero.com/support
- Xero API Documentation: https://developer.xero.com/documentation
- TRAF3LI Support: support@traf3li.com

## License

Copyright © 2024 TRAF3LI. All rights reserved.
