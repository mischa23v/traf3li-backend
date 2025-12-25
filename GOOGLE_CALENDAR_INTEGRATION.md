# Google Calendar Integration

Complete Google Calendar integration for TRAF3LI backend with OAuth2 flow, bidirectional sync, and webhook support.

## Created Files

### 1. Model
- **Location**: `/home/user/traf3li-backend/src/models/googleCalendarIntegration.model.js`
- **Purpose**: Stores OAuth tokens, sync settings, and integration state per user/firm
- **Features**:
  - Encrypted access/refresh tokens (AES-256-GCM)
  - Token expiry tracking
  - Calendar selection management
  - Auto-sync configuration
  - Sync statistics tracking
  - Webhook channel management

### 2. Service
- **Location**: `/home/user/traf3li-backend/src/services/googleCalendar.service.js`
- **Purpose**: Core integration logic with Google Calendar API
- **Features**:
  - OAuth2 flow (authorization, callback, refresh, disconnect)
  - Calendar operations (list, create, update, delete events)
  - Calendar management (get calendars, select calendars)
  - Bidirectional sync (import from Google, export to Google)
  - Auto-sync with conflict resolution
  - Webhook/push notifications
  - Event mapping between Google and TRAF3LI formats

### 3. Controller
- **Location**: `/home/user/traf3li-backend/src/controllers/googleCalendar.controller.js`
- **Purpose**: HTTP request handlers for all Google Calendar endpoints
- **Features**:
  - OAuth endpoints (auth URL, callback, disconnect, status)
  - Calendar operations (CRUD for calendars and events)
  - Settings management (calendar selection, webhooks)
  - Sync operations (import, export, auto-sync)
  - Webhook handler

### 4. Routes
- **Location**: `/home/user/traf3li-backend/src/routes/googleCalendar.route.js`
- **Purpose**: API route definitions
- **Features**:
  - Protected routes with userMiddleware and firmFilter
  - Public callback and webhook endpoints
  - RESTful API design

## Installation

### 1. Install Required Package

```bash
npm install googleapis
```

### 2. Environment Variables

Add the following to your `.env` file:

```env
# Google Calendar OAuth Credentials
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# These should already exist
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000
```

### 3. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable **Google Calendar API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Navigate to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:5000/api/google-calendar/callback` (development)
     - `https://your-domain.com/api/google-calendar/callback` (production)
   - Copy the Client ID and Client Secret

### 4. Database Migration

The model will be automatically registered when the server starts. No manual migration needed.

## API Endpoints

### OAuth Flow

#### Get Authorization URL
```http
GET /api/google-calendar/auth
Authorization: Bearer <token>
```

Returns an authorization URL for the user to grant access.

#### OAuth Callback (Auto-handled)
```http
GET /api/google-calendar/callback?code=...&state=...
```

Google redirects here after user authorization. Automatically handled and redirects to frontend.

#### Disconnect
```http
POST /api/google-calendar/disconnect
Authorization: Bearer <token>
```

Disconnects Google Calendar integration.

#### Get Status
```http
GET /api/google-calendar/status
Authorization: Bearer <token>
```

Returns connection status and integration details.

### Calendar Operations

#### List Calendars
```http
GET /api/google-calendar/calendars
Authorization: Bearer <token>
```

#### Get Events
```http
GET /api/google-calendar/calendars/:calendarId/events?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>
```

#### Create Event
```http
POST /api/google-calendar/calendars/:calendarId/events
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Meeting with Client",
  "description": "Discuss case details",
  "startDateTime": "2024-01-15T10:00:00Z",
  "endDateTime": "2024-01-15T11:00:00Z",
  "attendees": [
    {
      "email": "client@example.com",
      "name": "John Doe"
    }
  ]
}
```

#### Update Event
```http
PUT /api/google-calendar/calendars/:calendarId/events/:eventId
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Meeting Title",
  "startDateTime": "2024-01-15T14:00:00Z"
}
```

#### Delete Event
```http
DELETE /api/google-calendar/calendars/:calendarId/events/:eventId
Authorization: Bearer <token>
```

### Settings

#### Update Selected Calendars
```http
PUT /api/google-calendar/settings/calendars
Authorization: Bearer <token>
Content-Type: application/json

{
  "calendars": [
    {
      "calendarId": "primary",
      "name": "My Calendar",
      "syncEnabled": true
    }
  ],
  "primaryCalendarId": "primary"
}
```

#### Watch Calendar (Push Notifications)
```http
POST /api/google-calendar/watch/:calendarId
Authorization: Bearer <token>
```

#### Stop Watch
```http
DELETE /api/google-calendar/watch/:channelId
Authorization: Bearer <token>
```

### Sync Operations

#### Import from Google
```http
POST /api/google-calendar/sync/import
Authorization: Bearer <token>
```

Imports events from Google Calendar to TRAF3LI.

#### Export to Google
```http
POST /api/google-calendar/sync/export/:eventId
Authorization: Bearer <token>
```

Exports a TRAF3LI event to Google Calendar.

#### Enable Auto-Sync
```http
POST /api/google-calendar/sync/auto/enable
Authorization: Bearer <token>
Content-Type: application/json

{
  "direction": "both",
  "syncInterval": 15,
  "conflictResolution": "newest_wins",
  "syncPastEvents": false,
  "syncDaysBack": 30,
  "syncDaysForward": 90
}
```

**Sync Direction Options:**
- `both`: Bidirectional sync
- `import_only`: Only sync from Google to TRAF3LI
- `export_only`: Only sync from TRAF3LI to Google

**Conflict Resolution Options:**
- `google_wins`: Google Calendar changes always win
- `traf3li_wins`: TRAF3LI changes always win
- `newest_wins`: Most recent change wins
- `manual`: Don't auto-resolve conflicts

#### Disable Auto-Sync
```http
POST /api/google-calendar/sync/auto/disable
Authorization: Bearer <token>
```

#### Get Sync Settings
```http
GET /api/google-calendar/sync/settings
Authorization: Bearer <token>
```

### Webhook (Auto-handled)
```http
POST /api/google-calendar/webhook
X-Goog-Channel-Id: <channel-id>
X-Goog-Resource-State: <state>
```

Google posts to this endpoint when calendar changes occur.

## Usage Flow

### 1. Connect Google Calendar

**Frontend:**
```javascript
// Get authorization URL
const response = await fetch('/api/google-calendar/auth', {
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
});

const { authUrl } = await response.json();

// Redirect user to Google
window.location.href = authUrl;
```

After authorization, Google redirects back to your backend callback, which then redirects to:
```
https://your-frontend.com/settings/integrations?google_calendar=connected
```

### 2. Check Connection Status

```javascript
const response = await fetch('/api/google-calendar/status', {
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
});

const { connected, data } = await response.json();

if (connected) {
  console.log('Connected!', data);
}
```

### 3. Configure Calendars

```javascript
// Get available calendars
const calendars = await fetch('/api/google-calendar/calendars', {
  headers: { 'Authorization': `Bearer ${userToken}` }
});

// Select calendars to sync
await fetch('/api/google-calendar/settings/calendars', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    calendars: [
      {
        calendarId: 'primary',
        name: 'My Calendar',
        syncEnabled: true
      }
    ],
    primaryCalendarId: 'primary'
  })
});
```

### 4. Enable Auto-Sync

```javascript
await fetch('/api/google-calendar/sync/auto/enable', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    direction: 'both',
    syncInterval: 15,
    conflictResolution: 'newest_wins',
    syncDaysForward: 90
  })
});
```

### 5. Manual Sync

```javascript
// Import from Google
await fetch('/api/google-calendar/sync/import', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
});

// Export specific event
await fetch(`/api/google-calendar/sync/export/${eventId}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
});
```

## Event Mapping

### TRAF3LI to Google

- `title` → `summary`
- `description` → `description`
- `startDateTime` → `start.dateTime` or `start.date`
- `endDateTime` → `end.dateTime` or `end.date`
- `allDay` → determines date vs dateTime format
- `location.address` → `location`
- `location.virtualLink` → `conferenceData`
- `attendees` → `attendees`
- `reminders` → `reminders.overrides`

### Google to TRAF3LI

- `summary` → `title`
- `description` → `description`
- `start.dateTime/date` → `startDateTime`
- `end.dateTime/date` → `endDateTime`
- No `start.dateTime` → `allDay = true`
- `location` → `location.address`
- `conferenceData` → `location.virtualLink`
- `attendees` → `attendees`

## Security Features

1. **Encrypted Tokens**: Access and refresh tokens stored with AES-256-GCM encryption
2. **Token Rotation**: Automatic token refresh before expiry
3. **State Validation**: CSRF protection with state parameter
4. **Scope Limitation**: Only requests necessary Calendar scopes
5. **Multi-tenancy**: Firm-level isolation with firmFilter middleware
6. **Rate Limiting**: Protected endpoints use rate limiters
7. **No Cache**: Sensitive data never cached

## Background Jobs (Optional)

You can create a cron job to sync calendars periodically:

```javascript
// In jobs/googleCalendarSync.job.js
const cron = require('node-cron');
const GoogleCalendarIntegration = require('../models/googleCalendarIntegration.model');
const googleCalendarService = require('../services/googleCalendar.service');

// Run every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  const integrations = await GoogleCalendarIntegration.find({
    isConnected: true,
    'autoSync.enabled': true
  });

  for (const integration of integrations) {
    try {
      await googleCalendarService.syncFromGoogle(
        integration.userId,
        integration.firmId
      );
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
});
```

## Webhook Setup (Optional)

To receive real-time updates from Google Calendar:

1. Ensure your backend is publicly accessible (use ngrok for development)
2. Call the watch endpoint:

```javascript
await fetch(`/api/google-calendar/watch/${calendarId}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
});
```

3. Google will send push notifications to `/api/google-calendar/webhook` when events change
4. The webhook handler automatically triggers a sync

**Note**: Webhook channels expire after ~1 week and need to be renewed.

## Testing

### Manual Testing

1. Start the server: `npm start`
2. Use Postman or curl to test endpoints
3. Get auth URL and complete OAuth flow in browser
4. Test sync operations
5. Create events in Google Calendar and verify they appear in TRAF3LI
6. Create events in TRAF3LI and verify they appear in Google Calendar

### Integration Testing

```javascript
// Example test
describe('Google Calendar Integration', () => {
  it('should connect to Google Calendar', async () => {
    // Mock OAuth flow
    const authUrl = await googleCalendarService.getAuthUrl(userId, firmId);
    expect(authUrl).toContain('accounts.google.com');
  });

  it('should sync events from Google', async () => {
    // Setup test integration
    const result = await googleCalendarService.syncFromGoogle(userId, firmId);
    expect(result.success).toBe(true);
  });
});
```

## Troubleshooting

### Issue: "Failed to refresh token"
**Solution**: User needs to reconnect. Refresh tokens can expire if not used for 6 months.

### Issue: "Webhook not receiving updates"
**Solution**:
- Check that backend URL is publicly accessible
- Verify webhook channel hasn't expired
- Renew the watch channel

### Issue: "Events not syncing"
**Solution**:
- Check that calendars are selected and syncEnabled is true
- Verify auto-sync is enabled
- Check sync settings (date ranges, direction)
- Review syncStats for errors

### Issue: "Duplicate events"
**Solution**:
- Check that event mapping is working correctly
- Verify calendarSync.googleCalendarId is being set
- Review conflict resolution settings

## Next Steps

1. **Install googleapis package**: `npm install googleapis`
2. **Set up Google OAuth credentials** in Google Cloud Console
3. **Add environment variables** to `.env`
4. **Restart the server** to register new routes
5. **Test the integration** using the provided endpoints
6. **Implement frontend UI** for:
   - Connection button
   - Calendar selection
   - Sync settings
   - Sync status display
7. **Set up background job** for automatic sync (optional)
8. **Configure webhooks** for real-time updates (optional)

## Support

For issues or questions:
- Check the code documentation in service, controller, and route files
- Review the Google Calendar API documentation: https://developers.google.com/calendar/api
- Check integration status via `/api/google-calendar/status`
- Review sync stats for error details

---

**Created**: December 25, 2024
**Status**: Ready for deployment
**Dependencies**: googleapis package
