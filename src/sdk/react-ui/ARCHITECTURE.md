# Traf3li Auth React UI - Architecture

Visual architecture and component relationships for the React UI library.

## Component Hierarchy

```
ThemeProvider (Root)
│
├── Authentication Flow Components
│   ├── LoginForm
│   │   ├── SocialLoginButtons
│   │   ├── OTPInput (for MFA)
│   │   └── Standard inputs (email, password)
│   │
│   ├── SignupForm
│   │   ├── PasswordStrength
│   │   └── Standard inputs
│   │
│   ├── ForgotPasswordForm
│   │   └── Standard inputs (email)
│   │
│   └── ResetPasswordForm
│       ├── PasswordStrength
│       └── Standard inputs (password)
│
├── MFA Components
│   ├── MFASetup
│   │   ├── QR Code Display
│   │   ├── OTPInput (verification)
│   │   └── Backup Codes Display
│   │
│   └── MFAVerify
│       └── OTPInput
│
├── User Management Components
│   ├── UserProfile
│   │   └── Standard inputs (editable fields)
│   │
│   ├── SessionManager
│   │   └── Session cards (list)
│   │
│   └── PasswordChangeForm
│       ├── PasswordStrength
│       └── Standard inputs
│
├── Core UI Components (Reusable)
│   ├── OTPInput
│   ├── PasswordStrength
│   ├── SocialLoginButtons
│   └── GoogleOneTapButton
│
└── Theme System
    ├── defaultTheme
    ├── darkTheme
    └── Custom themes
```

## Data Flow

```
User Interaction
      ↓
Component State
      ↓
API Call (fetch)
      ↓
Backend (/api/auth/*)
      ↓
Response (User/Session/etc.)
      ↓
Callback (onSuccess/onError)
      ↓
Parent Component
      ↓
State Management (Redux/Context/etc.)
      ↓
UI Update
```

## Component Dependencies

### High-Level Components (Use Core Components)

```
LoginForm
  ↓ uses
  ├── SocialLoginButtons
  └── OTPInput (when MFA required)

SignupForm
  ↓ uses
  └── PasswordStrength

ResetPasswordForm
  ↓ uses
  └── PasswordStrength

PasswordChangeForm
  ↓ uses
  └── PasswordStrength

MFASetup
  ↓ uses
  └── OTPInput

MFAVerify
  ↓ uses
  └── OTPInput
```

### Core Components (No Dependencies)

```
OTPInput          - Standalone
PasswordStrength  - Standalone
SocialLoginButtons - Standalone
GoogleOneTapButton - External: Google SDK
```

## Theme System Architecture

```
ThemeProvider
      ↓
   Context API
      ↓
   useTheme() hook
      ↓
  All Components
      ↓
  Apply theme values
      ↓
  CSS variables (--traf3li-*)
```

## API Integration Points

```
Component                API Endpoint
────────────────────────────────────────────────────
LoginForm               POST /api/auth/login
SignupForm              POST /api/auth/register
ForgotPasswordForm      POST /api/auth/forgot-password
ResetPasswordForm       POST /api/auth/reset-password
MFASetup               POST /api/auth/mfa/totp/setup
                       POST /api/auth/mfa/totp/verify
                       POST /api/auth/mfa/backup-codes/generate
MFAVerify              POST /api/auth/mfa/totp/login
                       POST /api/auth/mfa/backup-codes/verify
UserProfile            GET  /api/auth/me
                       PATCH /api/auth/profile
SessionManager         GET  /api/auth/sessions
                       DELETE /api/auth/sessions/:id
                       DELETE /api/auth/sessions
PasswordChangeForm     POST /api/auth/change-password
SocialLoginButtons     GET  /api/auth/sso/:provider
```

## State Management Integration

```
Component Level (Internal)
      ↓
Parent Component (Props/Callbacks)
      ↓
Application State (Optional)
  ├── Redux Store
  ├── Zustand Store
  ├── Context API
  └── React Query Cache
```

## Styling Architecture

```
Theme Definition
      ↓
ThemeProvider
      ↓
CSS Variables (--traf3li-*)
      ↓
Style Utilities (getButtonStyles, etc.)
      ↓
Component Styles (Base)
      ↓
Custom Styles (styles prop)
      ↓
Custom Classes (className prop)
      ↓
Final Rendered Styles
```

## File Structure Breakdown

```
react-ui/
│
├── components/              # All React components
│   ├── Authentication/
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   ├── ForgotPasswordForm.tsx
│   │   └── ResetPasswordForm.tsx
│   │
│   ├── MFA/
│   │   ├── MFASetup.tsx
│   │   └── MFAVerify.tsx
│   │
│   ├── UserManagement/
│   │   ├── UserProfile.tsx
│   │   ├── SessionManager.tsx
│   │   └── PasswordChangeForm.tsx
│   │
│   └── Core/
│       ├── OTPInput.tsx
│       ├── PasswordStrength.tsx
│       ├── SocialLoginButtons.tsx
│       └── GoogleOneTapButton.tsx
│
├── theme/                   # Theme system
│   ├── ThemeProvider.tsx   # Context provider
│   ├── defaultTheme.ts     # Light theme
│   └── darkTheme.ts        # Dark theme
│
├── types/                   # TypeScript definitions
│   └── index.ts            # All types
│
├── utils/                   # Utility functions
│   └── styles.ts           # Style helpers
│
├── examples/               # Usage examples
│   └── basic-usage.tsx    # 10 examples
│
├── index.tsx              # Main exports
├── package.json           # Package config
└── tsconfig.json         # TS config
```

## Component Interaction Flow

### Authentication Flow

```
1. User lands on login page
   ↓
2. LoginForm renders
   ↓
3. User enters credentials
   ↓
4. Form validation (client-side)
   ↓
5. API call to /api/auth/login
   ↓
6a. Success → Check if MFA required
    ├─ Yes → Show MFAVerify component
    └─ No → Call onSuccess callback
   ↓
6b. MFA Required → User enters TOTP
   ↓
7. API call to /api/auth/mfa/totp/login
   ↓
8. Success → Call onSuccess callback
   ↓
9. Parent component handles navigation
```

### User Profile Flow

```
1. User navigates to profile page
   ↓
2. UserProfile fetches user data
   ↓
3. GET /api/auth/me
   ↓
4. Display user information
   ↓
5. User clicks "Edit"
   ↓
6. Form becomes editable
   ↓
7. User makes changes
   ↓
8. User clicks "Save"
   ↓
9. PATCH /api/auth/profile
   ↓
10. Success → Update display
    ├─ Call onUpdate callback
    └─ Show success message
```

## Security Architecture

```
Component Layer
      ↓
Client-side Validation
      ↓
API Call with Credentials
      ↓
HTTPS Transport
      ↓
Backend Validation
      ↓
Authentication Check
      ↓
Authorization Check
      ↓
Response with HttpOnly Cookies
      ↓
Component Updates
```

## Error Handling Flow

```
API Error
      ↓
Component Catch Block
      ↓
Set Error State
      ↓
Display Error Message
      ↓
Call onError Callback
      ↓
Parent Component Handling
      ↓
Toast/Modal/Logger
```

## Performance Optimization

```
Component Level:
├── React.memo for pure components
├── useMemo for expensive calculations
├── useCallback for event handlers
└── Lazy loading for heavy components

Theme Level:
├── CSS variables (no re-computation)
├── Minimal re-renders
└── Context optimization

Bundle Level:
├── Tree shaking
├── Code splitting (via dynamic imports)
└── No external dependencies
```

## Browser Compatibility

```
Modern Browsers (ES2020+)
├── Chrome 80+
├── Firefox 75+
├── Safari 13+
├── Edge 80+
└── Mobile browsers (iOS 13+, Android 5+)

Polyfills Needed:
└── None (uses modern browser APIs only)
```

## Testing Strategy

```
Unit Tests:
├── Component rendering
├── Props validation
├── Event handlers
└── State updates

Integration Tests:
├── Form submissions
├── API interactions
└── Navigation flows

Accessibility Tests:
├── Keyboard navigation
├── Screen reader support
└── Color contrast

Visual Regression:
├── Theme variations
├── Responsive layouts
└── Dark mode
```

## Deployment Architecture

```
Development:
src/sdk/react-ui → TypeScript files

Build:
npm run build → Compiled JS + Type definitions

Distribution:
NPM Registry → @traf3li/auth-react-ui

Consumer App:
npm install → node_modules/@traf3li/auth-react-ui

Import:
import { LoginForm } from '@traf3li/auth-react-ui'

Usage:
<LoginForm {...props} />
```

## Future Extensibility

### Plugin System

```
Future Enhancement:
├── Custom validators
├── Custom themes
├── Custom components
└── Middleware hooks
```

### Additional Components (Roadmap)

```
Future Components:
├── BiometricAuth (Face ID, Touch ID)
├── EmailVerification
├── PhoneVerification
├── AccountRecovery
└── SecuritySettings
```

## Version Compatibility

```
React Versions:
├── React 17.x ✅
├── React 18.x ✅
└── React 19.x (expected) ✅

TypeScript Versions:
├── TypeScript 4.x ✅
└── TypeScript 5.x ✅

Node Versions:
├── Node 14.x ✅
├── Node 16.x ✅
├── Node 18.x ✅
└── Node 20.x ✅
```

---

This architecture is designed for:
- **Scalability** - Easy to add new components
- **Maintainability** - Clear separation of concerns
- **Flexibility** - Highly customizable
- **Performance** - Optimized for production
- **Developer Experience** - Simple, intuitive API
