# Xero Integration API Routes Example

Example Express routes for Xero integration endpoints.

## Complete Route Implementation

```javascript
const express = require('express');
const router = express.Router();
const xeroService = require('../services/xero.service');
const { authenticate } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const logger = require('../utils/logger');

/**
 * @route   GET /api/integrations/xero/auth
 * @desc    Get Xero OAuth authorization URL
 * @access  Private (Admin/Owner)
 */
router.get('/auth', authenticate, checkPermission('settings', 'full'), async (req, res) => {
    try {
        const firmId = req.user.firmId;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                message: 'User not associated with a firm'
            });
        }

        const { authUrl, state } = await xeroService.getAuthUrl(firmId);

        res.json({
            success: true,
            authUrl,
            state
        });
    } catch (error) {
        logger.error('Failed to generate Xero auth URL', {
            error: error.message,
            userId: req.user._id
        });
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   GET /api/integrations/xero/callback
 * @desc    Handle Xero OAuth callback
 * @access  Public (OAuth callback)
 */
router.get('/callback', async (req, res) => {
    try {
        const { code, state } = req.query;

        if (!code || !state) {
            return res.status(400).json({
                success: false,
                message: 'Missing code or state parameter'
            });
        }

        const result = await xeroService.handleCallback(code, state);

        // Redirect to success page
        res.redirect(`${process.env.FRONTEND_URL}/settings/integrations/xero?status=connected&tenant=${result.tenantName}`);
    } catch (error) {
        logger.error('Xero callback failed', { error: error.message });

        // Redirect to error page
        res.redirect(`${process.env.FRONTEND_URL}/settings/integrations/xero?status=error&message=${encodeURIComponent(error.message)}`);
    }
});

/**
 * @route   POST /api/integrations/xero/refresh
 * @desc    Refresh Xero access token
 * @access  Private (Admin/Owner)
 */
router.post('/refresh', authenticate, checkPermission('settings', 'full'), async (req, res) => {
    try {
        const firmId = req.user.firmId;

        const result = await xeroService.refreshToken(firmId);

        res.json({
            success: true,
            message: 'Token refreshed successfully',
            expiresAt: result.expiresAt
        });
    } catch (error) {
        logger.error('Failed to refresh Xero token', {
            error: error.message,
            firmId: req.user.firmId
        });
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   POST /api/integrations/xero/disconnect
 * @desc    Disconnect Xero integration
 * @access  Private (Admin/Owner)
 */
router.post('/disconnect', authenticate, checkPermission('settings', 'full'), async (req, res) => {
    try {
        const firmId = req.user.firmId;

        await xeroService.disconnect(firmId);

        res.json({
            success: true,
            message: 'Xero disconnected successfully'
        });
    } catch (error) {
        logger.error('Failed to disconnect Xero', {
            error: error.message,
            firmId: req.user.firmId
        });
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   GET /api/integrations/xero/status
 * @desc    Get Xero connection status
 * @access  Private
 */
router.get('/status', authenticate, async (req, res) => {
    try {
        const firmId = req.user.firmId;

        const status = await xeroService.getConnectionStatus(firmId);

        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        logger.error('Failed to get Xero status', {
            error: error.message,
            firmId: req.user.firmId
        });
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   GET /api/integrations/xero/tenants
 * @desc    Get connected Xero organizations
 * @access  Private (Admin/Owner)
 */
router.get('/tenants', authenticate, checkPermission('settings', 'edit'), async (req, res) => {
    try {
        const firmId = req.user.firmId;

        const tenants = await xeroService.getTenants(firmId);

        res.json({
            success: true,
            data: tenants
        });
    } catch (error) {
        logger.error('Failed to get Xero tenants', {
            error: error.message,
            firmId: req.user.firmId
        });
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   POST /api/integrations/xero/test
 * @desc    Test Xero connection
 * @access  Private (Admin/Owner)
 */
router.post('/test', authenticate, checkPermission('settings', 'edit'), async (req, res) => {
    try {
        const firmId = req.user.firmId;

        const result = await xeroService.testConnection(firmId);

        res.json({
            success: result.success,
            data: result
        });
    } catch (error) {
        logger.error('Xero connection test failed', {
            error: error.message,
            firmId: req.user.firmId
        });
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   GET /api/integrations/xero/sync/status
 * @desc    Get sync status
 * @access  Private
 */
router.get('/sync/status', authenticate, async (req, res) => {
    try {
        const firmId = req.user.firmId;

        const status = await xeroService.getSyncStatus(firmId);

        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        logger.error('Failed to get sync status', {
            error: error.message,
            firmId: req.user.firmId
        });
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   POST /api/integrations/xero/sync/accounts
 * @desc    Sync chart of accounts
 * @access  Private (Admin/Accountant)
 */
router.post('/sync/accounts', authenticate, checkPermission('settings', 'edit'), async (req, res) => {
    try {
        const firmId = req.user.firmId;
        const { direction = 'from_xero' } = req.body;

        const result = await xeroService.syncChartOfAccounts(firmId, direction);

        res.json({
            success: true,
            message: 'Chart of accounts synced successfully',
            data: result
        });
    } catch (error) {
        logger.error('Failed to sync chart of accounts', {
            error: error.message,
            firmId: req.user.firmId
        });
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   POST /api/integrations/xero/sync/contacts
 * @desc    Sync contacts
 * @access  Private (Admin/Accountant)
 */
router.post('/sync/contacts', authenticate, checkPermission('settings', 'edit'), async (req, res) => {
    try {
        const firmId = req.user.firmId;
        const { direction = 'bidirectional' } = req.body;

        const result = await xeroService.syncContacts(firmId, direction);

        res.json({
            success: true,
            message: 'Contacts synced successfully',
            data: result
        });
    } catch (error) {
        logger.error('Failed to sync contacts', {
            error: error.message,
            firmId: req.user.firmId
        });
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   POST /api/integrations/xero/sync/invoices
 * @desc    Sync invoices
 * @access  Private (Admin/Accountant)
 */
router.post('/sync/invoices', authenticate, checkPermission('invoices', 'edit'), async (req, res) => {
    try {
        const firmId = req.user.firmId;
        const { lastSyncDate } = req.body;

        const result = await xeroService.syncInvoices(
            firmId,
            lastSyncDate ? new Date(lastSyncDate) : null
        );

        res.json({
            success: true,
            message: 'Invoices synced successfully',
            data: result
        });
    } catch (error) {
        logger.error('Failed to sync invoices', {
            error: error.message,
            firmId: req.user.firmId
        });
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   POST /api/integrations/xero/sync/payments
 * @desc    Sync payments
 * @access  Private (Admin/Accountant)
 */
router.post('/sync/payments', authenticate, checkPermission('payments', 'edit'), async (req, res) => {
    try {
        const firmId = req.user.firmId;
        const { lastSyncDate } = req.body;

        const result = await xeroService.syncPayments(
            firmId,
            lastSyncDate ? new Date(lastSyncDate) : null
        );

        res.json({
            success: true,
            message: 'Payments synced successfully',
            data: result
        });
    } catch (error) {
        logger.error('Failed to sync payments', {
            error: error.message,
            firmId: req.user.firmId
        });
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   POST /api/integrations/xero/sync/bills
 * @desc    Sync bills
 * @access  Private (Admin/Accountant)
 */
router.post('/sync/bills', authenticate, checkPermission('expenses', 'edit'), async (req, res) => {
    try {
        const firmId = req.user.firmId;
        const { lastSyncDate } = req.body;

        const result = await xeroService.syncBills(
            firmId,
            lastSyncDate ? new Date(lastSyncDate) : null
        );

        res.json({
            success: true,
            message: 'Bills synced successfully',
            data: result
        });
    } catch (error) {
        logger.error('Failed to sync bills', {
            error: error.message,
            firmId: req.user.firmId
        });
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   POST /api/integrations/xero/sync/transactions
 * @desc    Sync bank transactions
 * @access  Private (Admin/Accountant)
 */
router.post('/sync/transactions', authenticate, checkPermission('settings', 'edit'), async (req, res) => {
    try {
        const firmId = req.user.firmId;
        const { lastSyncDate } = req.body;

        const result = await xeroService.syncBankTransactions(
            firmId,
            lastSyncDate ? new Date(lastSyncDate) : null
        );

        res.json({
            success: true,
            message: 'Bank transactions synced successfully',
            data: result
        });
    } catch (error) {
        logger.error('Failed to sync bank transactions', {
            error: error.message,
            firmId: req.user.firmId
        });
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   POST /api/integrations/xero/sync/items
 * @desc    Sync items/products
 * @access  Private (Admin/Accountant)
 */
router.post('/sync/items', authenticate, checkPermission('settings', 'edit'), async (req, res) => {
    try {
        const firmId = req.user.firmId;
        const { direction = 'bidirectional' } = req.body;

        const result = await xeroService.syncItems(firmId, direction);

        res.json({
            success: true,
            message: 'Items synced successfully',
            data: result
        });
    } catch (error) {
        logger.error('Failed to sync items', {
            error: error.message,
            firmId: req.user.firmId
        });
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   POST /api/integrations/xero/sync/all
 * @desc    Sync all entities
 * @access  Private (Admin/Owner)
 */
router.post('/sync/all', authenticate, checkPermission('settings', 'full'), async (req, res) => {
    try {
        const firmId = req.user.firmId;

        // Run all sync operations in parallel
        const [accounts, contacts, invoices, payments, bills, transactions, items] = await Promise.all([
            xeroService.syncChartOfAccounts(firmId, 'from_xero').catch(err => ({ error: err.message })),
            xeroService.syncContacts(firmId, 'bidirectional').catch(err => ({ error: err.message })),
            xeroService.syncInvoices(firmId).catch(err => ({ error: err.message })),
            xeroService.syncPayments(firmId).catch(err => ({ error: err.message })),
            xeroService.syncBills(firmId).catch(err => ({ error: err.message })),
            xeroService.syncBankTransactions(firmId).catch(err => ({ error: err.message })),
            xeroService.syncItems(firmId, 'bidirectional').catch(err => ({ error: err.message }))
        ]);

        res.json({
            success: true,
            message: 'Full sync completed',
            data: {
                accounts,
                contacts,
                invoices,
                payments,
                bills,
                transactions,
                items
            }
        });
    } catch (error) {
        logger.error('Failed to run full sync', {
            error: error.message,
            firmId: req.user.firmId
        });
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   PUT /api/integrations/xero/settings
 * @desc    Update sync settings
 * @access  Private (Admin/Owner)
 */
router.put('/settings', authenticate, checkPermission('settings', 'full'), async (req, res) => {
    try {
        const firmId = req.user.firmId;
        const settings = req.body;

        const updatedSettings = await xeroService.updateSyncSettings(firmId, settings);

        res.json({
            success: true,
            message: 'Sync settings updated',
            data: updatedSettings
        });
    } catch (error) {
        logger.error('Failed to update sync settings', {
            error: error.message,
            firmId: req.user.firmId
        });
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   POST /api/integrations/xero/webhook
 * @desc    Handle Xero webhooks
 * @access  Public (Webhook endpoint)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const signature = req.headers['x-xero-signature'];
        const payload = JSON.parse(req.body.toString());

        // Extract firmId from payload or lookup based on tenantId
        // You may need to implement a mapping between Xero tenantId and firmId
        const tenantId = payload.tenantId;

        // TODO: Lookup firmId from tenantId
        // const firm = await Firm.findOne({ 'integrations.xero.tenantId': tenantId });
        // const firmId = firm._id;

        const firmId = 'lookup-firm-id-here';

        const result = await xeroService.handleWebhook(payload, signature, firmId);

        res.json({
            success: true,
            processed: result.processed
        });
    } catch (error) {
        logger.error('Webhook processing failed', {
            error: error.message
        });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
```

## Usage in Main App

```javascript
// In your main app.js or server.js
const xeroRoutes = require('./routes/xero.routes');

app.use('/api/integrations/xero', xeroRoutes);
```

## Frontend Integration Example

```javascript
// React/Vue/Angular example

// 1. Connect to Xero
async function connectXero() {
    try {
        const response = await fetch('/api/integrations/xero/auth', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const { authUrl } = await response.json();

        // Redirect to Xero authorization page
        window.location.href = authUrl;
    } catch (error) {
        console.error('Failed to connect:', error);
    }
}

// 2. Check connection status
async function getXeroStatus() {
    try {
        const response = await fetch('/api/integrations/xero/status', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const { data } = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to get status:', error);
    }
}

// 3. Sync data
async function syncInvoices() {
    try {
        const response = await fetch('/api/integrations/xero/sync/invoices', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                lastSyncDate: localStorage.getItem('lastInvoiceSync')
            })
        });

        const { data } = await response.json();

        // Update last sync date
        localStorage.setItem('lastInvoiceSync', new Date().toISOString());

        return data;
    } catch (error) {
        console.error('Failed to sync invoices:', error);
    }
}

// 4. Disconnect
async function disconnectXero() {
    try {
        await fetch('/api/integrations/xero/disconnect', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        alert('Xero disconnected successfully');
    } catch (error) {
        console.error('Failed to disconnect:', error);
    }
}
```

## Testing with Postman

### 1. Get Auth URL
```
GET /api/integrations/xero/auth
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
```

### 2. Sync Invoices
```
POST /api/integrations/xero/sync/invoices
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
  Content-Type: application/json
Body:
{
  "lastSyncDate": "2024-01-01T00:00:00.000Z"
}
```

### 3. Get Status
```
GET /api/integrations/xero/status
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
```

## Notes

1. **Authentication**: All routes except `/callback` and `/webhook` require authentication
2. **Permissions**: Most routes require appropriate permissions (admin/owner)
3. **Error Handling**: All routes include comprehensive error handling
4. **Logging**: All operations are logged for debugging
5. **Rate Limiting**: Consider adding rate limiting middleware to prevent abuse
