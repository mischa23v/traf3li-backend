# Gold Standard Email Verification - Frontend Integration Guide

## Overview

Email verification uses **feature-based access control**. Users can login without verifying their email, but access to sensitive features is restricted until verification is complete.

**Key Principle:** Login is ALLOWED, sensitive features are BLOCKED

---

## User Experience Flow

```
User registers
    ↓
Verification email sent automatically
    ↓
User can LOGIN immediately (no 403 block!)
    ↓
Dashboard loads with verification banner
"Verify your email for full access"
    ↓
┌─────────────────────────────────────────┐
│        ALLOWED FEATURES                 │
│ - Tasks (full CRUD)                     │
│ - Reminders (full CRUD)                 │
│ - Events (full CRUD)                    │
│ - Gantt Chart (full access)             │
│ - Calendar (view and sync)              │
│ - Notifications (all)                   │
│ - Profile (view)                        │
│ - Resend verification email             │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│        BLOCKED FEATURES                 │
│ - Cases (all operations) → 403          │
│ - Clients (all operations) → 403        │
│ - Billing/Invoices → 403                │
│ - Documents → 403                       │
│ - Integrations → 403                    │
│ - Team Management → 403                 │
│ - Reports/Analytics → 403               │
│ - HR/Payroll → 403                      │
│ - CRM (create/edit) → 403               │
│ - Settings (sensitive) → 403            │
└─────────────────────────────────────────┘
    ↓
User clicks verification link
    ↓
All features unlocked!
```

---

## API Responses

### 1. Login Response (POST /api/auth/verify-otp)

```json
{
  "success": true,
  "message": "Login successful",
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "isEmailVerified": false,
    "emailVerifiedAt": null,
    "firstName": "John",
    "lastName": "Doe"
  },
  "emailVerification": {
    "isVerified": false,
    "requiresVerification": true,
    "verificationSentAt": "2025-01-10T12:00:00.000Z",
    "allowedFeatures": ["tasks", "reminders", "events", "gantt", "calendar", "notifications", "profile-view"],
    "blockedFeatures": ["cases", "clients", "billing", "invoices", "documents", "integrations", "team", "reports", "analytics", "hr", "crm-write"]
  }
}
```

### 2. Get Current User (GET /api/auth/me)

```json
{
  "error": false,
  "message": "Success!",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "isEmailVerified": false,
    "emailVerifiedAt": null,
    "firstName": "John",
    "lastName": "Doe"
  },
  "emailVerification": {
    "isVerified": false,
    "requiresVerification": true,
    "emailVerifiedAt": null,
    "allowedFeatures": ["tasks", "reminders", "events", "gantt", "calendar", "notifications", "profile-view"],
    "blockedFeatures": ["cases", "clients", "billing", "invoices", "documents", "integrations", "team", "reports", "analytics", "hr", "crm-write"]
  }
}
```

### 3. Blocked Feature Response (403)

When an unverified user tries to access a blocked feature:

```json
{
  "error": true,
  "code": "EMAIL_VERIFICATION_REQUIRED",
  "message": "يرجى تفعيل بريدك الإلكتروني للوصول إلى هذه الميزة",
  "messageEn": "Please verify your email to access this feature",
  "redirectTo": "/verify-email",
  "emailVerification": {
    "isVerified": false,
    "requiresVerification": true,
    "allowedFeatures": ["tasks", "reminders", "events", "gantt", "calendar", "notifications", "profile-view"],
    "blockedFeature": "cases"
  }
}
```

### 4. Response Header

Every authenticated response includes:

```
X-Email-Verification-Required: true|false
```

Use this for global interceptor handling.

---

## Frontend Implementation

### 1. Auth Context / Store

```typescript
// types.ts
interface EmailVerification {
  isVerified: boolean;
  requiresVerification: boolean;
  emailVerifiedAt: string | null;
  allowedFeatures: string[];
  blockedFeatures: string[];
}

interface User {
  _id: string;
  email: string;
  isEmailVerified: boolean;
  emailVerifiedAt: string | null;
  // ... other fields
}

interface AuthState {
  user: User | null;
  emailVerification: EmailVerification | null;
  isAuthenticated: boolean;
}
```

```typescript
// authContext.tsx
const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    emailVerification: null,
    isAuthenticated: false
  });

  // Store emailVerification from login response
  const login = async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    // ... OTP flow ...
    const otpResponse = await api.post('/auth/verify-otp', { ... });

    setAuthState({
      user: otpResponse.user,
      emailVerification: otpResponse.emailVerification,
      isAuthenticated: true
    });
  };

  // Refresh on /auth/me
  const refreshUser = async () => {
    const response = await api.get('/auth/me');
    setAuthState(prev => ({
      ...prev,
      user: response.user,
      emailVerification: response.emailVerification
    }));
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 2. Route Guard Component

```tsx
// components/VerifiedEmailRoute.tsx
interface VerifiedEmailRouteProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const VerifiedEmailRoute: React.FC<VerifiedEmailRouteProps> = ({
  feature,
  children,
  fallback
}) => {
  const { emailVerification } = useAuth();

  // If email is verified, render children
  if (emailVerification?.isVerified) {
    return <>{children}</>;
  }

  // If this feature is blocked, show fallback or redirect
  if (emailVerification?.blockedFeatures?.includes(feature)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="verification-required">
        <h2>Email Verification Required</h2>
        <p>Please verify your email to access {feature}.</p>
        <Link to="/verify-email">Verify Now</Link>
      </div>
    );
  }

  // Feature is allowed, render children
  return <>{children}</>;
};

// Usage in routes
<Route path="/cases" element={
  <VerifiedEmailRoute feature="cases">
    <CasesPage />
  </VerifiedEmailRoute>
} />
```

### 3. Email Verification Banner

```tsx
// components/EmailVerificationBanner.tsx
const EmailVerificationBanner: React.FC = () => {
  const { user, emailVerification } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Don't show if verified
  if (emailVerification?.isVerified) {
    return null;
  }

  const handleResend = async () => {
    if (cooldown > 0) return;

    setIsResending(true);
    try {
      await api.post('/auth/request-verification-email', {
        email: user.email
      });

      // Start 60 second cooldown
      setCooldown(60);
      const interval = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      toast.success('Verification email sent!');
    } catch (error) {
      if (error.response?.status === 429) {
        toast.error('Please wait before requesting another email');
      } else {
        toast.error('Failed to send verification email');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <WarningIcon className="h-5 w-5 text-yellow-500" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            Please verify your email address to unlock all features.
            Some features are currently restricted.
          </p>
        </div>
        <div className="ml-auto">
          <button
            onClick={handleResend}
            disabled={isResending || cooldown > 0}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
          >
            {isResending ? 'Sending...' : cooldown > 0 ? `Resend (${cooldown}s)` : 'Resend Email'}
          </button>
        </div>
      </div>
      <div className="mt-2 text-xs text-yellow-600">
        Restricted: Cases, Clients, Billing, Documents, Integrations, Team, Reports
      </div>
    </div>
  );
};
```

### 4. API Interceptor (Global Error Handling)

```typescript
// api/interceptor.ts
api.interceptors.response.use(
  (response) => {
    // Check header for verification status
    const verificationRequired = response.headers['x-email-verification-required'];
    if (verificationRequired === 'true') {
      // Update context if needed
      store.dispatch(setEmailVerificationRequired(true));
    }
    return response;
  },
  (error) => {
    // Handle 403 EMAIL_VERIFICATION_REQUIRED
    if (error.response?.status === 403 &&
        error.response?.data?.code === 'EMAIL_VERIFICATION_REQUIRED') {

      // Option 1: Show toast
      toast.warning('Please verify your email to access this feature');

      // Option 2: Redirect to verification page
      // router.push('/verify-email');

      // Option 3: Show modal
      // store.dispatch(showVerificationModal());

      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);
```

### 5. Navigation Guard

```tsx
// hooks/useFeatureAccess.ts
const useFeatureAccess = (feature: string) => {
  const { emailVerification } = useAuth();

  return {
    isAllowed: emailVerification?.isVerified ||
               emailVerification?.allowedFeatures?.includes(feature),
    isBlocked: !emailVerification?.isVerified &&
               emailVerification?.blockedFeatures?.includes(feature),
    requiresVerification: emailVerification?.requiresVerification
  };
};

// Usage in sidebar/navigation
const SidebarLink = ({ to, feature, icon, label }) => {
  const { isBlocked } = useFeatureAccess(feature);

  if (isBlocked) {
    return (
      <div className="sidebar-link disabled" title="Verify email to access">
        {icon}
        <span>{label}</span>
        <LockIcon className="ml-auto text-gray-400" />
      </div>
    );
  }

  return (
    <Link to={to} className="sidebar-link">
      {icon}
      <span>{label}</span>
    </Link>
  );
};
```

---

## API Endpoints Reference

### Request Verification Email (Public - No Auth Required)

```
POST /api/auth/request-verification-email
```

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم إرسال رابط التفعيل إلى بريدك الإلكتروني",
  "messageEn": "Verification link sent to your email"
}
```

**Rate Limited (429):**
```json
{
  "success": false,
  "code": "RATE_LIMITED",
  "message": "يرجى الانتظار قبل طلب رابط تفعيل جديد",
  "messageEn": "Please wait before requesting another verification link"
}
```

### Verify Email (Public)

```
GET /api/auth/verify-email?token=<token>
```

**Success (200):**
```json
{
  "success": true,
  "message": "تم تفعيل البريد الإلكتروني بنجاح",
  "messageEn": "Email verified successfully"
}
```

### Resend Verification (Authenticated)

```
POST /api/auth/resend-verification-email
Authorization: Bearer <token>
```

---

## Feature Mapping

| Feature Key | Routes | Description |
|-------------|--------|-------------|
| `tasks` | `/tasks/*` | Task management |
| `reminders` | `/reminders/*` | Reminders |
| `events` | `/events/*` | Events/Calendar events |
| `gantt` | `/gantt/*` | Gantt chart |
| `calendar` | `/calendar/*` | Calendar view |
| `notifications` | `/notifications/*` | Notifications |
| `profile-view` | `/profile`, `/settings/profile` | View profile |
| `cases` | `/cases/*` | Case management |
| `clients` | `/clients/*` | Client management |
| `billing` | `/billing/*`, `/invoices/*` | Billing & invoices |
| `documents` | `/documents/*` | Document management |
| `integrations` | `/integrations/*`, `/settings/integrations` | Third-party integrations |
| `team` | `/team/*`, `/members/*` | Team management |
| `reports` | `/reports/*`, `/analytics/*` | Reports & analytics |
| `hr` | `/hr/*`, `/payroll/*` | HR & payroll |
| `crm-write` | POST/PUT/DELETE on `/leads/*`, `/crm/*` | CRM write operations |

---

## Testing Checklist

### Happy Path
- [ ] Unverified user can log in successfully
- [ ] Unverified user sees verification banner
- [ ] Unverified user can access tasks, reminders, events, gantt, calendar
- [ ] Unverified user gets 403 on cases, clients, billing, documents
- [ ] Verified user can access all features
- [ ] Verification banner disappears after email is verified

### Error Cases
- [ ] 403 error shows appropriate message
- [ ] Rate limiting on resend shows cooldown
- [ ] Invalid/expired token shows error
- [ ] Network error on resend shows retry option

### Edge Cases
- [ ] User refreshes page - verification status persists
- [ ] User logs out and back in - status is current
- [ ] Sidebar shows locked icons for blocked features
- [ ] Deep linking to blocked route redirects appropriately

---

## Security Notes

1. **No Data Leakage**: Blocked routes return generic 403, no data
2. **Token Security**: Verification tokens are SHA-256 hashed in database
3. **Rate Limiting**: 3 requests per email per hour for resend
4. **Audit Trail**: All blocked access attempts are logged
5. **Timing-Safe**: Token comparisons are timing-safe to prevent attacks

---

## Questions?

Contact backend team for any clarification on:
- Which routes are blocked/allowed
- Custom feature restrictions
- Enterprise SSO users (email pre-verified)
