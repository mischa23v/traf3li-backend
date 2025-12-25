# App Integrations Setup Guide

This guide covers setting up all app integrations for the Traf3li lawyer dashboard. Each integration allows **users (lawyers)** to connect their own accounts via OAuth.

## Architecture Overview

```
Frontend (Apps Settings Page)
    ↓
GET /api/apps → List all available apps + connection status
    ↓
User clicks "Connect"
    ↓
GET /api/{app}/auth → Returns OAuth URL with CSRF state
    ↓
User redirects to provider (Slack, GitHub, etc.)
    ↓
User authorizes
    ↓
Provider redirects back to callback URL
    ↓
GET /api/{app}/callback → Exchange code for tokens, store encrypted
    ↓
User now connected!
```

## Environment Variables Summary

Add these to your `.env` file. The app will work without them, but the specific integration will be disabled.

```bash
# Communication Apps
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=
SLACK_REDIRECT_URI=https://api.traf3li.com/api/slack/callback

DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_BOT_TOKEN=
DISCORD_REDIRECT_URI=https://api.traf3li.com/api/discord/callback

TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_URL=https://api.traf3li.com/api/telegram/webhook

ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=
ZOOM_REDIRECT_URI=https://api.traf3li.com/api/zoom/callback

# Productivity Apps
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=https://api.traf3li.com/api/github/callback
GITHUB_WEBHOOK_SECRET=

TRELLO_API_KEY=
TRELLO_API_SECRET=
TRELLO_REDIRECT_URI=https://api.traf3li.com/api/trello/callback

GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REDIRECT_URI=https://api.traf3li.com/api/gmail/callback

# E-Signature
DOCUSIGN_INTEGRATION_KEY=
DOCUSIGN_SECRET_KEY=
DOCUSIGN_ACCOUNT_ID=
DOCUSIGN_REDIRECT_URI=https://api.traf3li.com/api/docusign/callback
DOCUSIGN_ENVIRONMENT=developer
DOCUSIGN_BASE_URL=https://demo.docusign.net/restapi

# Finance (already configured)
QUICKBOOKS_CLIENT_ID=
QUICKBOOKS_CLIENT_SECRET=
QUICKBOOKS_REDIRECT_URI=https://api.traf3li.com/api/integrations/quickbooks/callback

XERO_CLIENT_ID=
XERO_CLIENT_SECRET=
XERO_REDIRECT_URI=https://api.traf3li.com/api/integrations/xero/callback
```

---

## Integration Setup Instructions

### 1. Slack

**Developer Portal:** https://api.slack.com/apps

**Steps:**
1. Click "Create New App" → "From scratch"
2. Name: "Traf3li" (or your app name)
3. Pick your Slack workspace for development
4. Go to "OAuth & Permissions":
   - Add Redirect URL: `https://api.traf3li.com/api/slack/callback`
   - Add scopes under "Bot Token Scopes":
     - `chat:write` - Send messages
     - `channels:read` - Read channel list
     - `users:read` - Read user info
     - `files:write` - Upload files
5. Go to "Basic Information":
   - Copy **Client ID** → `SLACK_CLIENT_ID`
   - Copy **Client Secret** → `SLACK_CLIENT_SECRET`
   - Copy **Signing Secret** → `SLACK_SIGNING_SECRET`

**Frontend Features:**
- Send case updates to Slack channels
- Receive notifications for new leads
- Share documents with team

---

### 2. Discord

**Developer Portal:** https://discord.com/developers/applications

**Steps:**
1. Click "New Application"
2. Name: "Traf3li Bot"
3. Go to "OAuth2" → "General":
   - Copy **Client ID** → `DISCORD_CLIENT_ID`
   - Copy **Client Secret** → `DISCORD_CLIENT_SECRET`
   - Add Redirect: `https://api.traf3li.com/api/discord/callback`
4. Go to "Bot":
   - Click "Add Bot"
   - Copy **Token** → `DISCORD_BOT_TOKEN`
   - Enable:
     - "Send Messages"
     - "Embed Links"
     - "Read Message History"

**Frontend Features:**
- Case notifications to Discord server
- Team collaboration channels
- Automated updates

---

### 3. Telegram

**BotFather:** https://t.me/BotFather

**Steps:**
1. Open Telegram, search for @BotFather
2. Send `/newbot`
3. Follow prompts to name your bot
4. Copy the **API Token** → `TELEGRAM_BOT_TOKEN`
5. Set webhook:
   ```bash
   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://api.traf3li.com/api/telegram/webhook"
   ```

**Frontend Features:**
- Receive task reminders via Telegram
- Check case status with `/status` command
- Get instant notifications

---

### 4. Zoom

**Marketplace:** https://marketplace.zoom.us/develop/create

**Steps:**
1. Click "Build App"
2. Choose "OAuth" app type
3. Fill in app info
4. Add scopes:
   - `meeting:write:admin`
   - `meeting:read:admin`
   - `user:read:admin`
5. Add Redirect URL: `https://api.traf3li.com/api/zoom/callback`
6. Copy credentials:
   - **Client ID** → `ZOOM_CLIENT_ID`
   - **Client Secret** → `ZOOM_CLIENT_SECRET`

**Frontend Features:**
- Create meetings for case consultations
- Sync meeting recordings
- Schedule client calls

---

### 5. GitHub

**Developer Settings:** https://github.com/settings/developers

**Steps:**
1. Go to "OAuth Apps" → "New OAuth App"
2. Fill in:
   - Application name: "Traf3li"
   - Homepage URL: `https://traf3li.com`
   - Authorization callback URL: `https://api.traf3li.com/api/github/callback`
3. Copy credentials:
   - **Client ID** → `GITHUB_CLIENT_ID`
   - **Client Secret** → `GITHUB_CLIENT_SECRET`
4. (Optional) For webhooks, generate a secret:
   ```bash
   openssl rand -hex 32
   ```
   → `GITHUB_WEBHOOK_SECRET`

**Frontend Features:**
- Link commits to cases
- Track issue discussions
- Sync code documentation

---

### 6. Trello

**Power-Ups Admin:** https://trello.com/power-ups/admin

**Steps:**
1. Click "New" to create a Power-Up
2. Fill in details
3. Go to "API Key":
   - Generate API Key → `TRELLO_API_KEY`
   - Generate Secret → `TRELLO_API_SECRET`
4. Set callback URL: `https://api.traf3li.com/api/trello/callback`

**Note:** Trello uses OAuth 1.0a (older protocol), already handled in the backend.

**Frontend Features:**
- Sync tasks with Trello boards
- Create cards from cases
- Track project progress

---

### 7. Gmail

**Google Cloud Console:** https://console.cloud.google.com/apis/credentials

**Steps:**
1. Create new project (or use existing)
2. Enable Gmail API:
   - Go to "APIs & Services" → "Enable APIs"
   - Search "Gmail API" → Enable
3. Create OAuth credentials:
   - Go to "Credentials" → "Create Credentials" → "OAuth client ID"
   - Type: "Web application"
   - Add redirect URI: `https://api.traf3li.com/api/gmail/callback`
4. Copy credentials:
   - **Client ID** → `GMAIL_CLIENT_ID`
   - **Client Secret** → `GMAIL_CLIENT_SECRET`
5. Configure OAuth consent screen (if not done)

**Frontend Features:**
- Read/send emails from dashboard
- Link emails to cases
- Track client communications

---

### 8. DocuSign

**Developer Portal:** https://developers.docusign.com

**Steps:**
1. Create developer account
2. Go to "Admin" → "Integrations" → "API and Keys"
3. Create new app:
   - Integration Key (Client ID) → `DOCUSIGN_INTEGRATION_KEY`
   - Secret Key → `DOCUSIGN_SECRET_KEY`
   - Account ID → `DOCUSIGN_ACCOUNT_ID`
4. Add redirect URI: `https://api.traf3li.com/api/docusign/callback`
5. Set environment:
   - Development: `DOCUSIGN_ENVIRONMENT=developer`
   - Production: `DOCUSIGN_ENVIRONMENT=production`

**Frontend Features:**
- Send documents for e-signature
- Track signature status
- Download signed documents
- Use templates for common documents

---

### 9. QuickBooks

**Developer Portal:** https://developer.intuit.com

**Steps:**
1. Create app
2. Select "QuickBooks Online and Payments"
3. Get credentials:
   - Client ID → `QUICKBOOKS_CLIENT_ID`
   - Client Secret → `QUICKBOOKS_CLIENT_SECRET`
4. Add redirect URI: `https://api.traf3li.com/api/integrations/quickbooks/callback`

**Frontend Features:**
- Sync invoices to QuickBooks
- Import clients
- Track payments

---

### 10. Xero

**Developer Portal:** https://developer.xero.com/app/manage

**Steps:**
1. Create new app
2. Select OAuth 2.0
3. Get credentials:
   - Client ID → `XERO_CLIENT_ID`
   - Client Secret → `XERO_CLIENT_SECRET`
4. Add redirect URI: `https://api.traf3li.com/api/integrations/xero/callback`

**Frontend Features:**
- Sync invoices to Xero
- Import contacts
- Reconcile payments

---

## Frontend Implementation Guide

### 1. Apps Settings Page

Create `/settings/apps` page that:
1. Calls `GET /api/apps` to get all apps and their status
2. Shows each app with:
   - Icon
   - Name
   - Description
   - Connection status (connected/not connected)
   - "Connect" or "Disconnect" button

**API Endpoints:**

```javascript
// List all apps with connection status
GET /api/apps
Response: {
  apps: [
    {
      id: 'slack',
      name: 'Slack',
      description: 'Team communication',
      category: 'communication',
      icon: 'slack-icon.svg',
      connected: true,
      connectedAt: '2024-01-15T10:30:00Z',
      syncEnabled: true,
      lastSync: '2024-01-15T14:00:00Z'
    },
    ...
  ]
}

// Connect an app (returns OAuth URL)
POST /api/apps/:appId/connect
Response: {
  authUrl: 'https://slack.com/oauth/v2/authorize?...'
}

// Disconnect an app
DELETE /api/apps/:appId/disconnect

// Sync an app
POST /api/apps/:appId/sync

// Get app details
GET /api/apps/:appId
```

### 2. Integration-Specific Pages

For each integration, create feature-specific pages:

**Slack (`/settings/apps/slack`):**
- List connected channels
- Configure notification settings
- Test message sending

**GitHub (`/settings/apps/github`):**
- List connected repositories
- Link repos to cases
- View recent commits

**DocuSign (`/settings/apps/docusign`):**
- List templates
- View pending signatures
- Send document for signature

### 3. Component Structure

```
src/
├── pages/
│   └── settings/
│       └── apps/
│           ├── index.tsx          # Main apps list
│           ├── [appId]/
│           │   └── index.tsx      # App detail page
│           └── components/
│               ├── AppCard.tsx    # Individual app card
│               ├── ConnectButton.tsx
│               └── AppStatusBadge.tsx
├── hooks/
│   └── useApps.ts                 # API hooks
└── services/
    └── apps.service.ts            # API calls
```

### 4. OAuth Flow Implementation

```typescript
// When user clicks "Connect"
const connectApp = async (appId: string) => {
  try {
    // Get OAuth URL from backend
    const response = await fetch(`/api/apps/${appId}/connect`, {
      method: 'POST',
      credentials: 'include'
    });
    const { authUrl } = await response.json();

    // Redirect to provider
    window.location.href = authUrl;
  } catch (error) {
    toast.error('Failed to initiate connection');
  }
};

// Handle callback (create /settings/apps/callback page)
// The backend handles the OAuth exchange and redirects back
```

### 5. Sample Apps Page Code

```tsx
// pages/settings/apps/index.tsx
import { useQuery, useMutation } from '@tanstack/react-query';
import { AppCard } from './components/AppCard';

export default function AppsPage() {
  const { data: apps, isLoading } = useQuery({
    queryKey: ['apps'],
    queryFn: () => fetch('/api/apps').then(r => r.json())
  });

  const connectMutation = useMutation({
    mutationFn: async (appId: string) => {
      const res = await fetch(`/api/apps/${appId}/connect`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      window.location.href = data.authUrl;
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: async (appId: string) => {
      await fetch(`/api/apps/${appId}/disconnect`, {
        method: 'DELETE',
        credentials: 'include'
      });
    },
    onSuccess: () => queryClient.invalidateQueries(['apps'])
  });

  if (isLoading) return <Spinner />;

  const categories = {
    communication: apps.filter(a => a.category === 'communication'),
    productivity: apps.filter(a => a.category === 'productivity'),
    finance: apps.filter(a => a.category === 'finance'),
    esignature: apps.filter(a => a.category === 'esignature')
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">App Integrations</h1>

      {Object.entries(categories).map(([category, categoryApps]) => (
        <section key={category} className="mb-8">
          <h2 className="text-xl font-semibold mb-4 capitalize">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryApps.map(app => (
              <AppCard
                key={app.id}
                app={app}
                onConnect={() => connectMutation.mutate(app.id)}
                onDisconnect={() => disconnectMutation.mutate(app.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
```

---

## API Reference

### Apps API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/apps` | GET | List all apps with status |
| `/api/apps/:id` | GET | Get app details |
| `/api/apps/:id/connect` | POST | Initiate OAuth |
| `/api/apps/:id/disconnect` | DELETE | Disconnect app |
| `/api/apps/:id/sync` | POST | Manual sync |
| `/api/apps/:id/settings` | PUT | Update app settings |

### Individual Integration APIs

**Slack:**
- `GET /api/slack/channels` - List channels
- `POST /api/slack/message` - Send message
- `POST /api/slack/notification` - Post notification

**Discord:**
- `GET /api/discord/channels` - List channels
- `POST /api/discord/message` - Send message
- `POST /api/discord/embed` - Send rich embed

**Zoom:**
- `POST /api/zoom/meetings` - Create meeting
- `GET /api/zoom/meetings` - List meetings
- `GET /api/zoom/recordings` - Get recordings

**GitHub:**
- `GET /api/github/repositories` - List repos
- `GET /api/github/issues` - List issues
- `POST /api/github/issues` - Create issue
- `GET /api/github/pulls` - List PRs

**Gmail:**
- `GET /api/gmail/messages` - List messages
- `POST /api/gmail/send` - Send email
- `POST /api/gmail/reply` - Reply to email

**DocuSign:**
- `POST /api/docusign/envelopes` - Create envelope
- `GET /api/docusign/envelopes/:id` - Get envelope status
- `POST /api/docusign/templates/:id/send` - Send from template
- `GET /api/docusign/documents/:envelopeId/:documentId` - Download signed doc

---

## Testing

1. Set up environment variables
2. Start the server
3. Navigate to `/api/apps` - should list all apps
4. Click "Connect" on any app
5. Complete OAuth flow
6. Verify connection appears in database

Test with development/sandbox credentials first before going to production.

---

## Troubleshooting

**OAuth Error: Invalid redirect_uri**
- Ensure callback URL in provider matches exactly (https vs http, trailing slash)

**Token expired errors**
- Check if refresh token logic is working
- Re-authenticate if refresh fails

**Webhook not receiving**
- Verify webhook URL is publicly accessible
- Check provider webhook logs

**CSRF state mismatch**
- Cookies may not be sent correctly
- Check CORS and credentials settings

---

## Security Notes

1. **All tokens are encrypted** at rest using AES-256-GCM
2. **OAuth state parameter** prevents CSRF attacks
3. **Webhook signatures** are verified for incoming webhooks
4. **Scopes are minimal** - only request what's needed
5. **Firm isolation** - each firm's tokens are separate

---

## Need Help?

- Check the `.env.example` file for complete variable list
- Review individual service files in `src/services/*.service.js`
- Check route files for available endpoints in `src/routes/*.route.js`
