# TRAF3LI Notification System - Frontend Integration Guide

## Overview

The backend now has a complete notification delivery system with:
- **Email**: Resend (working - 100 emails/day free)
- **In-App**: Socket.io (working)
- **Push**: Web Push ready (needs frontend integration)
- **SMS/WhatsApp**: Stubs ready for MSG91/Twilio (when company registered)

---

## 1. Environment Variables (Backend)

Add these to your `.env` file:

```env
# ========== RESEND (Email) ==========
RESEND_API_KEY=re_xxxxxxxxxx
FROM_EMAIL=onboarding@resend.dev  # or your verified domain email
FROM_NAME=TRAF3LI

# ========== OTP Configuration ==========
OTP_EXPIRY_MINUTES=5
OTP_LENGTH=6
OTP_SECRET_SALT=your-random-secret-string-here

# ========== Push Notifications (VAPID) ==========
VAPID_PUBLIC_KEY=BBPHXE1quI58UtPRW7BUWKGyqX7G2dJuYwsBpJi27_seabDaBY2J_c5GzN83rzBthjcx_iCtIkWX1z3x1iwf6J0
VAPID_PRIVATE_KEY=LTVebQxXKGp9lqMjHdDJn92ZuBRvSyoJcHWH9PjE2m8
VAPID_SUBJECT=mailto:admin@trafeli.com

# ========== Client URLs ==========
CLIENT_URL=https://your-frontend-url.com
DASHBOARD_URL=https://your-dashboard-url.com
```

---

## 2. Email Rate Limiting

To prevent spam and blacklisting:

| Email Type | Rate Limited? | Notes |
|------------|---------------|-------|
| **OTP** | NO | Users must log in - has own rate limit (5/hour) |
| **Password Reset** | NO | User-initiated, critical |
| **Welcome Email** | NO | Sent once on registration |
| **Reminder Emails** | YES - 1/hour | System-generated |
| **Notification Emails** | YES - 1/hour | System-generated |

---

## 3. Cron Jobs Running

The backend runs these scheduled jobs:

| Job | Schedule | Description |
|-----|----------|-------------|
| Task Reminders | Daily 9 AM | Tasks due in 24 hours |
| Hearing Reminders | Hourly | Court hearings in 24 hours |
| Reminder Trigger | Every minute | Send due reminders |
| Advance Notifications | Every minute | 15min/1hr before reminders |
| Recurring Generator | Daily midnight | Create recurring reminder instances |
| Escalation Checker | Every 5 min | Escalate unacknowledged reminders |
| Snoozed Checker | Every minute | Reactivate expired snoozes |
| Event Reminders | Hourly | Calendar event reminders |
| Overdue Tasks | Daily 10 AM | Flag overdue tasks |

---

## 4. Frontend Integration Tasks

### 4.1 Email OTP Login/Registration

**Backend Service**: `NotificationDeliveryService.sendEmailOTP(email, otpCode, userName)`

**Frontend Flow**:
1. User enters email
2. Call `POST /api/auth/send-otp` with `{ email }`
3. Backend generates OTP, stores hash in `EmailOTP` model, sends email
4. User enters OTP from email
5. Call `POST /api/auth/verify-otp` with `{ email, otp, purpose }`
6. Backend verifies and returns JWT tokens

**Rate Limits** (handled by EmailOTP model):
- Max 5 OTP requests per email per hour
- Must wait 60 seconds between OTP requests
- Max 3 verification attempts per OTP

**Example API Endpoints to Create**:

```javascript
// POST /api/auth/send-otp
// Request: { email: "user@example.com", purpose: "login" | "registration" }
// Response: { success: true, message: "OTP sent" }

// POST /api/auth/verify-otp
// Request: { email: "user@example.com", otp: "123456", purpose: "login" }
// Response: { success: true, accessToken: "...", refreshToken: "..." }
```

### 4.2 Push Notifications (Web Push)

**VAPID Public Key** (for frontend):
```
BBPHXE1quI58UtPRW7BUWKGyqX7G2dJuYwsBpJi27_seabDaBY2J_c5GzN83rzBthjcx_iCtIkWX1z3x1iwf6J0
```

**Frontend Setup Steps**:

#### Step 1: Create Service Worker (`public/sw.js`)

```javascript
// public/sw.js
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};

  const options = {
    body: data.body || 'لديك إشعار جديد',
    icon: '/logo192.png',
    badge: '/badge.png',
    dir: 'rtl',
    lang: 'ar',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      ...data
    },
    actions: [
      { action: 'open', title: 'فتح' },
      { action: 'close', title: 'إغلاق' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'ترافعلي', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    const url = event.notification.data?.url || '/';
    event.waitUntil(clients.openWindow(url));
  }
});
```

#### Step 2: Register Service Worker & Subscribe

```javascript
// utils/pushNotifications.js
const VAPID_PUBLIC_KEY = 'BBPHXE1quI58UtPRW7BUWKGyqX7G2dJuYwsBpJi27_seabDaBY2J_c5GzN83rzBthjcx_iCtIkWX1z3x1iwf6J0';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPushNotifications() {
  try {
    // Check support
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return null;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Push notification permission denied');
      return null;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    // Send subscription to backend
    await fetch('/api/users/push-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      },
      body: JSON.stringify({ subscription })
    });

    console.log('Push subscription successful');
    return subscription;
  } catch (error) {
    console.error('Push subscription failed:', error);
    return null;
  }
}

export async function unsubscribeFromPush() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();

      // Notify backend
      await fetch('/api/users/push-subscription', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
    }
  } catch (error) {
    console.error('Unsubscribe failed:', error);
  }
}
```

#### Step 3: Call on Login

```javascript
// After successful login
import { subscribeToPushNotifications } from './utils/pushNotifications';

async function handleLoginSuccess() {
  // ... existing login logic ...

  // Ask user to enable push notifications
  await subscribeToPushNotifications();
}
```

### 4.3 In-App Notifications (Socket.io)

**Already Working!** Connect to socket on login:

```javascript
import { io } from 'socket.io-client';

const socket = io(process.env.REACT_APP_API_URL, {
  auth: { token: accessToken }
});

// Listen for notifications
socket.on('notification', (notification) => {
  // Show in-app notification
  // notification = { type, title, message, link, icon, priority, data }
  showToast(notification);
  updateNotificationBadge();
});

// Listen for notification count update
socket.on('notificationCount', (count) => {
  setUnreadCount(count);
});
```

### 4.4 Notification Preferences UI

Create a settings page for users to configure:

```javascript
// Example notification preferences
const notificationPreferences = {
  channels: {
    email: true,      // Receive email notifications
    push: true,       // Receive push notifications
    sms: false,       // SMS (when available)
    whatsapp: false,  // WhatsApp (when available)
    in_app: true      // Always on
  },
  types: {
    task_reminders: true,
    hearing_reminders: true,
    case_updates: true,
    messages: true,
    payments: true
  }
};
```

---

## 5. API Endpoints Reference

### Notifications

```
GET    /api/notifications           - Get user notifications (paginated)
GET    /api/notifications/unread    - Get unread count
PUT    /api/notifications/:id/read  - Mark as read
PUT    /api/notifications/read-all  - Mark all as read
DELETE /api/notifications/:id       - Delete notification
```

### Reminders

```
GET    /api/reminders               - Get user reminders
POST   /api/reminders               - Create reminder
GET    /api/reminders/:id           - Get reminder
PUT    /api/reminders/:id           - Update reminder
DELETE /api/reminders/:id           - Delete reminder
POST   /api/reminders/:id/snooze    - Snooze reminder
POST   /api/reminders/:id/complete  - Complete reminder
POST   /api/reminders/:id/dismiss   - Dismiss reminder
GET    /api/reminders/stats         - Get reminder statistics
```

### Events

```
GET    /api/events                  - Get events (with date range filter)
POST   /api/events                  - Create event
GET    /api/events/:id              - Get event
PUT    /api/events/:id              - Update event
DELETE /api/events/:id              - Delete event
POST   /api/events/:id/rsvp         - Update RSVP status
GET    /api/events/calendar         - Get calendar view
```

---

## 6. Backend Services Available

### NotificationDeliveryService

```javascript
const NotificationDeliveryService = require('./services/notificationDelivery.service');

// Send via multiple channels
await NotificationDeliveryService.send({
  userId: '...',
  channels: ['email', 'push', 'in_app'],
  title: 'تذكير هام',
  message: 'لديك مهمة مستحقة',
  data: { taskId: '...' }
});

// Send OTP (no rate limit)
await NotificationDeliveryService.sendEmailOTP(email, otpCode, userName);

// Send Welcome Email
await NotificationDeliveryService.sendWelcomeEmail(email, userName, 'lawyer');

// Send Password Reset
await NotificationDeliveryService.sendPasswordResetEmail(email, resetToken, userName);

// Check service status
const status = NotificationDeliveryService.getServiceStatus();
```

### EmailOTP Model

```javascript
const EmailOTP = require('./models/emailOtp.model');

// Check rate limit before sending
const rateLimit = await EmailOTP.checkRateLimit(email, 'login');
if (rateLimit.limited) {
  return res.status(429).json({ error: rateLimit.messageAr });
}

// Create OTP
const otp = generateOTP(); // from utils/otp.utils.js
await EmailOTP.createOTP(email, hashOTP(otp), 'login', 5);

// Verify OTP
const result = await EmailOTP.verifyOTP(email, hashOTP(otp), 'login');
if (!result.success) {
  return res.status(400).json({ error: result.errorAr });
}
```

---

## 7. Testing Checklist

### Email
- [ ] OTP email sends and displays correctly (RTL Arabic)
- [ ] Welcome email sends on registration
- [ ] Password reset email works
- [ ] Rate limiting works (1 email/hour for notifications)

### Push Notifications
- [ ] Service worker registers
- [ ] Permission prompt appears
- [ ] Subscription saved to backend
- [ ] Push notification received when triggered

### In-App Notifications
- [ ] Socket connects on login
- [ ] Real-time notifications received
- [ ] Notification badge updates
- [ ] Mark as read works

### Reminders
- [ ] Create reminder with channels
- [ ] Snooze reminder
- [ ] Complete/dismiss reminder
- [ ] Recurring reminders generate

---

## 8. Troubleshooting

### Email not sending
1. Check `RESEND_API_KEY` is set
2. Check Resend dashboard for errors
3. Verify `FROM_EMAIL` is verified domain or use `onboarding@resend.dev`

### Push not working
1. Check HTTPS (required for push)
2. Check service worker registered: `navigator.serviceWorker.getRegistration()`
3. Check permission: `Notification.permission`
4. Check VAPID keys match frontend and backend

### Rate limit issues
1. OTP has NO rate limit (but EmailOTP model has 5/hour, 1min between)
2. Other emails limited to 1/hour per user
3. Check logs for "rate limited" messages

---

## 9. Future Enhancements (When Company Registered)

### SMS via MSG91
```env
MSG91_AUTH_KEY=your-auth-key
MSG91_SENDER_ID=TRAF3L
MSG91_TEMPLATE_ID=your-template-id
```

### WhatsApp via MSG91/Twilio
```env
MSG91_WHATSAPP_KEY=your-key
# or
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_WHATSAPP=+14155238886
```

---

## Contact

For questions about this integration, contact the backend team.
