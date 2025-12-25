# Xero Integration Quick Setup Guide

Quick start guide to get Xero integration up and running.

## Prerequisites

- Node.js 14+
- MongoDB
- Active Xero account
- Xero Developer account

## Installation Steps

### 1. Install Dependencies

```bash
npm install xero-node
```

### 2. Set Up Environment Variables

Add to your `.env` file:

```bash
# Generate encryption key first
ENCRYPTION_KEY=your_64_char_hex_key

# Xero OAuth Configuration
XERO_CLIENT_ID=your_xero_client_id
XERO_CLIENT_SECRET=your_xero_client_secret
XERO_REDIRECT_URI=https://your-domain.com/api/integrations/xero/callback

# Backend URL
BACKEND_URL=https://your-domain.com
```

Generate encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Configure Xero Developer Account

1. Go to https://developer.xero.com
2. Sign in with your Xero account
3. Click "New App"
4. Fill in app details:
   - App name: TRAF3LI Integration
   - Integration type: Web app
   - Company or application URL: https://your-domain.com
   - OAuth 2.0 redirect URI: https://your-domain.com/api/integrations/xero/callback
5. Click "Create App"
6. Copy Client ID and Client Secret to your `.env` file

### 4. Update Firm Model

The integration fields are already added to the Firm model at `/home/user/traf3li-backend/src/models/firm.model.js`:

```javascript
integrations: {
    xero: {
        connected: Boolean,
        accessToken: String, // Encrypted
        refreshToken: String, // Encrypted
        tenantId: String,
        // ... other fields
    }
}
```

### 5. Create API Routes (Optional)

Create `src/routes/xero.routes.js`:

```javascript
const express = require('express');
const router = express.Router();
const xeroService = require('../services/xero.service');
const { authenticate } = require('../middleware/auth');

// Get auth URL
router.get('/auth', authenticate, async (req, res) => {
    try {
        const { authUrl, state } = await xeroService.getAuthUrl(req.user.firmId);
        res.json({ success: true, authUrl, state });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// OAuth callback
router.get('/callback', async (req, res) => {
    try {
        const { code, state } = req.query;
        const result = await xeroService.handleCallback(code, state);
        res.redirect(`${process.env.FRONTEND_URL}/settings/integrations/xero?status=connected`);
    } catch (error) {
        res.redirect(`${process.env.FRONTEND_URL}/settings/integrations/xero?status=error`);
    }
});

// Get status
router.get('/status', authenticate, async (req, res) => {
    try {
        const status = await xeroService.getConnectionStatus(req.user.firmId);
        res.json({ success: true, data: status });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Sync invoices
router.post('/sync/invoices', authenticate, async (req, res) => {
    try {
        const result = await xeroService.syncInvoices(req.user.firmId);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
```

Register routes in `src/server.js`:

```javascript
const xeroRoutes = require('./routes/xero.routes');
app.use('/api/integrations/xero', xeroRoutes);
```

### 6. Test the Integration

```bash
# Start your server
npm start

# Test connection (using Postman or curl)
curl -X GET http://localhost:5000/api/integrations/xero/auth \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Quick Test Flow

### 1. Get Authorization URL

```bash
curl -X GET http://localhost:5000/api/integrations/xero/auth \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "success": true,
  "authUrl": "https://login.xero.com/identity/connect/authorize?...",
  "state": "abc123..."
}
```

### 2. Connect to Xero

1. Open the `authUrl` in a browser
2. Sign in to Xero
3. Select organization
4. Click "Allow access"
5. You'll be redirected to your callback URL

### 3. Check Connection Status

```bash
curl -X GET http://localhost:5000/api/integrations/xero/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "success": true,
  "data": {
    "connected": true,
    "tenantId": "...",
    "tenantName": "My Company",
    "connectedAt": "2024-01-15T10:30:00.000Z",
    "tokenExpired": false,
    "expiresIn": 1800
  }
}
```

### 4. Sync Data

```bash
# Sync invoices
curl -X POST http://localhost:5000/api/integrations/xero/sync/invoices \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Sync contacts
curl -X POST http://localhost:5000/api/integrations/xero/sync/contacts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"direction": "bidirectional"}'
```

## Usage Examples

### Basic Usage

```javascript
const xeroService = require('./services/xero.service');

// Connect to Xero
const { authUrl } = await xeroService.getAuthUrl(firmId);
// Redirect user to authUrl

// After callback
const result = await xeroService.handleCallback(code, state);
console.log('Connected to:', result.tenantName);

// Sync invoices
const invoices = await xeroService.syncInvoices(firmId);
console.log(`Imported ${invoices.imported} invoices`);

// Get status
const status = await xeroService.getConnectionStatus(firmId);
console.log('Connected:', status.connected);
```

### Advanced Usage

```javascript
// Sync with date filter
const lastSync = new Date('2024-01-01');
const result = await xeroService.syncInvoices(firmId, lastSync);

// Bidirectional contact sync
const contacts = await xeroService.syncContacts(firmId, 'bidirectional');

// Update sync settings
await xeroService.updateSyncSettings(firmId, {
    autoSync: true,
    syncInterval: 'daily',
    syncDirection: 'bidirectional'
});

// Test connection
const test = await xeroService.testConnection(firmId);
if (test.success) {
    console.log('Connected to:', test.organization.name);
}
```

## Troubleshooting

### Common Issues

#### 1. "Xero not configured" Error

**Solution**: Check that `XERO_CLIENT_ID` and `XERO_CLIENT_SECRET` are set in `.env`

```bash
# Verify environment variables
echo $XERO_CLIENT_ID
echo $XERO_CLIENT_SECRET
```

#### 2. "Invalid redirect URI" Error

**Solution**: Ensure redirect URI in Xero Developer Portal matches exactly:

```
Xero Portal: https://your-domain.com/api/integrations/xero/callback
.env file:   https://your-domain.com/api/integrations/xero/callback
```

Note: No trailing slashes, exact protocol (http/https)

#### 3. "Encryption key not set" Error

**Solution**: Generate and set encryption key:

```bash
# Generate key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
ENCRYPTION_KEY=your_generated_key_here
```

#### 4. "Access token expired" Error

**Solution**: Refresh the token:

```javascript
await xeroService.refreshToken(firmId);
```

Or implement automatic refresh in your auth middleware.

#### 5. Webhook Signature Verification Failed

**Solution**: Ensure you're using raw body for webhook endpoint:

```javascript
app.post('/api/integrations/xero/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
        // Handler code
    }
);
```

## Production Checklist

Before going to production:

- [ ] Environment variables are set correctly
- [ ] HTTPS is enabled (required for OAuth)
- [ ] Redirect URI matches production domain
- [ ] Encryption key is securely stored
- [ ] Error logging is configured
- [ ] Rate limiting is implemented
- [ ] Webhook endpoint is secured
- [ ] Database indexes are created
- [ ] Token refresh logic is tested
- [ ] Backup/restore procedures are in place

## Security Best Practices

1. **Token Storage**:
   - Tokens are encrypted at rest
   - Never log tokens
   - Rotate encryption keys regularly

2. **API Keys**:
   - Keep Client Secret secure
   - Never commit to version control
   - Use environment variables

3. **Webhooks**:
   - Always verify signatures
   - Use HTTPS only
   - Implement replay attack prevention

4. **Access Control**:
   - Restrict integration routes to admin users
   - Audit all integration activities
   - Monitor for unusual patterns

## Performance Optimization

1. **Caching**:
   - Cache organization data
   - Cache chart of accounts
   - Use Redis for session storage

2. **Batch Operations**:
   - Batch sync operations
   - Use parallel requests where possible
   - Implement queue for large syncs

3. **Rate Limiting**:
   - Respect Xero's limits (60/min, 5000/day)
   - Implement exponential backoff
   - Use webhooks instead of polling

## Next Steps

1. Implement specific sync logic for your data models
2. Create UI for Xero connection management
3. Set up automated sync schedules
4. Configure webhook subscriptions
5. Implement error notifications
6. Set up monitoring and alerting

## Support Resources

- Xero API Docs: https://developer.xero.com/documentation
- TRAF3LI Integration Docs: `/docs/XERO_INTEGRATION.md`
- API Routes Examples: `/docs/XERO_API_ROUTES_EXAMPLE.md`

## License

Copyright © 2024 TRAF3LI. All rights reserved.
