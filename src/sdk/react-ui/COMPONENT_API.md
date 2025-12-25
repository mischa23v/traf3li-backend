# Traf3li Auth React UI - Component API Reference

Complete API documentation for all components.

## Table of Contents

- [Theme](#theme)
- [Authentication Forms](#authentication-forms)
- [MFA Components](#mfa-components)
- [User Management](#user-management)
- [Core Components](#core-components)

---

## Theme

### ThemeProvider

Context provider for theming all components.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | Child components |
| `theme` | `Theme \| 'light' \| 'dark'` | `'light'` | Theme object or preset |
| `customTheme` | `Partial<Theme>` | - | Custom theme overrides |

**Example:**

```tsx
<ThemeProvider theme="dark">
  <LoginForm />
</ThemeProvider>
```

### useTheme

Hook to access current theme.

```tsx
const { theme, isDark } = useTheme();
```

---

## Authentication Forms

### LoginForm

Full-featured login form with email/password, social logins, magic link, and MFA.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSuccess` | `(user: User) => void` | required | Callback on successful login |
| `onError` | `(error: Error) => void` | - | Callback on error |
| `showSocialLogins` | `boolean` | `true` | Show social login buttons |
| `providers` | `OAuthProvider[]` | `['google', 'microsoft']` | OAuth providers to display |
| `onSocialLogin` | `(provider: OAuthProvider) => void` | - | Custom social login handler |
| `showMagicLink` | `boolean` | `true` | Show magic link option |
| `onMagicLinkRequest` | `(email: string) => Promise<void>` | - | Custom magic link handler |
| `showRememberMe` | `boolean` | `true` | Show remember me checkbox |
| `redirectUrl` | `string` | - | Redirect URL after login |
| `apiUrl` | `string` | `'/api/auth'` | API base URL |
| `className` | `string` | - | Custom CSS class |
| `styles` | `ComponentStyles` | - | Custom inline styles |

**Features:**
- Email/password authentication
- Social OAuth login (Google, Microsoft, Apple, GitHub, Facebook)
- Magic link (passwordless) authentication
- Remember me option
- MFA code input (auto-shown when required)
- Forgot password link
- Loading states
- Error handling

**Example:**

```tsx
<LoginForm
  onSuccess={(user) => router.push('/dashboard')}
  onError={(error) => toast.error(error.message)}
  showSocialLogins={true}
  providers={['google', 'microsoft']}
  showMagicLink={true}
  redirectUrl="/dashboard"
/>
```

---

### SignupForm

Registration form with customizable fields and validation.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSuccess` | `(user: User) => void` | required | Callback on successful signup |
| `onError` | `(error: Error) => void` | - | Callback on error |
| `fields` | `Array<'email' \| 'password' \| 'firstName' \| 'lastName' \| 'phone' \| 'username'>` | `['email', 'password', 'firstName', 'lastName']` | Fields to include |
| `passwordStrengthIndicator` | `boolean` | `true` | Show password strength meter |
| `termsUrl` | `string` | `'/terms'` | Terms of service URL |
| `privacyUrl` | `string` | `'/privacy'` | Privacy policy URL |
| `requireTermsAcceptance` | `boolean` | `true` | Require terms checkbox |
| `apiUrl` | `string` | `'/api/auth'` | API base URL |
| `className` | `string` | - | Custom CSS class |
| `styles` | `ComponentStyles` | - | Custom inline styles |

**Features:**
- Flexible field configuration
- Real-time password strength validation
- Email format validation
- Phone number validation
- Terms and privacy acceptance
- Confirm password validation
- Field-level error messages

**Example:**

```tsx
<SignupForm
  onSuccess={(user) => router.push('/verify-email')}
  fields={['email', 'password', 'firstName', 'lastName', 'phone']}
  passwordStrengthIndicator={true}
  requireTermsAcceptance={true}
/>
```

---

### ForgotPasswordForm

Password reset request form.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSuccess` | `() => void` | - | Callback on success |
| `onError` | `(error: Error) => void` | - | Callback on error |
| `onBackToLogin` | `() => void` | - | Back to login callback |
| `apiUrl` | `string` | `'/api/auth'` | API base URL |
| `className` | `string` | - | Custom CSS class |
| `styles` | `ComponentStyles` | - | Custom inline styles |

**Features:**
- Email validation
- Success confirmation
- Back to login navigation
- Loading states

**Example:**

```tsx
<ForgotPasswordForm
  onSuccess={() => toast.success('Check your email')}
  onBackToLogin={() => setView('login')}
/>
```

---

### ResetPasswordForm

Password reset form with token validation.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `token` | `string` | required | Reset token from URL |
| `onSuccess` | `() => void` | - | Callback on success |
| `onError` | `(error: Error) => void` | - | Callback on error |
| `passwordRequirements` | `boolean` | `true` | Show password requirements |
| `apiUrl` | `string` | `'/api/auth'` | API base URL |
| `className` | `string` | - | Custom CSS class |
| `styles` | `ComponentStyles` | - | Custom inline styles |

**Features:**
- Token validation
- Password strength indicator
- Confirm password matching
- Success message
- Auto-redirect to login

**Example:**

```tsx
<ResetPasswordForm
  token={searchParams.get('token')}
  onSuccess={() => router.push('/login')}
  passwordRequirements={true}
/>
```

---

## MFA Components

### MFASetup

TOTP-based two-factor authentication setup.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onComplete` | `() => void` | - | Callback on setup complete |
| `onError` | `(error: Error) => void` | - | Callback on error |
| `showBackupCodes` | `boolean` | `true` | Show backup codes |
| `apiUrl` | `string` | `'/api/auth'` | API base URL |
| `className` | `string` | - | Custom CSS class |
| `styles` | `ComponentStyles` | - | Custom inline styles |

**Features:**
- QR code display
- Manual entry code
- Step-by-step instructions
- TOTP code verification
- Backup codes generation
- Copy to clipboard
- Warning messages

**Example:**

```tsx
<MFASetup
  onComplete={() => {
    toast.success('MFA enabled');
    router.push('/dashboard');
  }}
  showBackupCodes={true}
/>
```

---

### MFAVerify

TOTP verification during login.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `userId` | `string` | required | User ID for verification |
| `onSuccess` | `(user: User) => void` | required | Callback on success |
| `onError` | `(error: Error) => void` | - | Callback on error |
| `showBackupCodeOption` | `boolean` | `true` | Show backup code option |
| `apiUrl` | `string` | `'/api/auth'` | API base URL |
| `className` | `string` | - | Custom CSS class |
| `styles` | `ComponentStyles` | - | Custom inline styles |

**Features:**
- 6-digit TOTP input
- Auto-submit on complete
- Backup code fallback
- Error handling
- Switch between TOTP/backup

**Example:**

```tsx
<MFAVerify
  userId={userId}
  onSuccess={(user) => router.push('/dashboard')}
  showBackupCodeOption={true}
/>
```

---

## User Management

### UserProfile

User profile display and edit form.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `editableFields` | `Array<'firstName' \| 'lastName' \| 'phone' \| 'avatar' \| 'username'>` | `['firstName', 'lastName', 'phone', 'avatar']` | Editable fields |
| `showPasswordChange` | `boolean` | `true` | Show password change link |
| `showMFASettings` | `boolean` | `true` | Show MFA settings link |
| `showSessionsLink` | `boolean` | `true` | Show sessions link |
| `onUpdate` | `(user: User) => void` | - | Callback on update |
| `onError` | `(error: Error) => void` | - | Callback on error |
| `apiUrl` | `string` | `'/api/auth'` | API base URL |
| `className` | `string` | - | Custom CSS class |
| `styles` | `ComponentStyles` | - | Custom inline styles |

**Features:**
- Avatar display
- Edit/view mode toggle
- Field validation
- Success messages
- Security settings links
- Loading states

**Example:**

```tsx
<UserProfile
  editableFields={['firstName', 'lastName', 'phone', 'avatar']}
  showPasswordChange={true}
  showMFASettings={true}
  onUpdate={(user) => console.log('Updated:', user)}
/>
```

---

### SessionManager

Active session management.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showDeviceInfo` | `boolean` | `true` | Show device information |
| `showLocation` | `boolean` | `true` | Show location data |
| `allowRevokeAll` | `boolean` | `true` | Allow revoking all sessions |
| `onSessionRevoked` | `(sessionId: string) => void` | - | Callback on revoke |
| `onError` | `(error: Error) => void` | - | Callback on error |
| `apiUrl` | `string` | `'/api/auth'` | API base URL |
| `className` | `string` | - | Custom CSS class |
| `styles` | `ComponentStyles` | - | Custom inline styles |

**Features:**
- List all active sessions
- Current session highlighting
- Device icons (desktop, mobile, tablet)
- Location display (city, country)
- Last active timestamp
- Revoke individual sessions
- Revoke all other sessions
- Suspicious activity warnings
- Security alerts

**Example:**

```tsx
<SessionManager
  showDeviceInfo={true}
  showLocation={true}
  allowRevokeAll={true}
  onSessionRevoked={(id) => console.log('Revoked:', id)}
/>
```

---

### PasswordChangeForm

Password change form for authenticated users.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSuccess` | `() => void` | - | Callback on success |
| `onError` | `(error: Error) => void` | - | Callback on error |
| `showPasswordStrength` | `boolean` | `true` | Show strength indicator |
| `apiUrl` | `string` | `'/api/auth'` | API base URL |
| `className` | `string` | - | Custom CSS class |
| `styles` | `ComponentStyles` | - | Custom inline styles |

**Features:**
- Current password validation
- New password strength meter
- Confirm password matching
- Success messages
- Password visibility toggle

**Example:**

```tsx
<PasswordChangeForm
  onSuccess={() => toast.success('Password changed')}
  showPasswordStrength={true}
/>
```

---

## Core Components

### OTPInput

6-digit OTP input with auto-focus and paste support.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `length` | `number` | `6` | Number of digits |
| `onComplete` | `(otp: string) => void` | required | Callback when complete |
| `onChange` | `(otp: string) => void` | - | Callback on each change |
| `autoSubmit` | `boolean` | `true` | Auto-submit on complete |
| `error` | `boolean` | `false` | Error state |
| `errorMessage` | `string` | - | Error message to display |
| `disabled` | `boolean` | `false` | Disabled state |
| `className` | `string` | - | Custom CSS class |
| `styles` | `object` | - | Custom inline styles |

**Features:**
- Auto-focus next input
- Paste support (full OTP)
- Backspace navigation
- Arrow key navigation
- Enter to submit
- Monospace font
- Accessibility labels

**Example:**

```tsx
<OTPInput
  length={6}
  onComplete={(otp) => verifyOTP(otp)}
  autoSubmit={true}
  error={!!error}
  errorMessage={error}
/>
```

---

### PasswordStrength

Password strength indicator with requirements.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `password` | `string` | required | Password to check |
| `showRequirements` | `boolean` | `true` | Show requirements list |
| `showLabel` | `boolean` | `true` | Show strength label |
| `showBar` | `boolean` | `true` | Show visual bar |
| `minLength` | `number` | `8` | Minimum length |
| `className` | `string` | - | Custom CSS class |
| `styles` | `object` | - | Custom inline styles |

**Features:**
- Visual strength meter (0-4)
- Color-coded (weak to very strong)
- Requirements checklist
- Real-time validation
- Feedback messages

**Scoring:**
- Score 0-1: Very Weak / Weak
- Score 2: Medium
- Score 3: Strong
- Score 4: Very Strong

**Example:**

```tsx
<PasswordStrength
  password={password}
  showRequirements={true}
  showLabel={true}
  minLength={8}
/>
```

---

### SocialLoginButtons

OAuth provider buttons.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `providers` | `OAuthProvider[]` | required | Providers to display |
| `layout` | `'horizontal' \| 'vertical'` | `'vertical'` | Layout orientation |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `onProviderClick` | `(provider: OAuthProvider) => void` | required | Click handler |
| `loading` | `boolean` | `false` | Loading state |
| `disabled` | `boolean` | `false` | Disabled state |
| `className` | `string` | - | Custom CSS class |
| `styles` | `object` | - | Custom inline styles |

**Supported Providers:**
- `google` - Google
- `microsoft` - Microsoft
- `apple` - Apple
- `github` - GitHub
- `facebook` - Facebook

**Example:**

```tsx
<SocialLoginButtons
  providers={['google', 'microsoft', 'apple']}
  layout="vertical"
  size="md"
  onProviderClick={(provider) => {
    window.location.href = `/api/auth/sso/${provider}`;
  }}
/>
```

---

### GoogleOneTapButton

Google One Tap sign-in button.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `clientId` | `string` | required | Google OAuth Client ID |
| `onCredentialResponse` | `(response: {credential: string}) => void` | required | Callback with JWT |
| `autoSelect` | `boolean` | `true` | Auto-select account |
| `cancelOnTapOutside` | `boolean` | `true` | Cancel on tap outside |
| `className` | `string` | - | Custom CSS class |
| `containerId` | `string` | `'google-one-tap-button'` | Container ID |

**Features:**
- One Tap prompt
- Account auto-select
- JWT credential response
- Automatic Google script loading

**Example:**

```tsx
<GoogleOneTapButton
  clientId="YOUR_GOOGLE_CLIENT_ID"
  onCredentialResponse={(response) => {
    // Send response.credential to your backend
    loginWithGoogle(response.credential);
  }}
  autoSelect={true}
/>
```

---

## Type Definitions

### User

```typescript
interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  role?: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  isMfaEnabled?: boolean;
  isAnonymous?: boolean;
  emailVerifiedAt?: string;
  phoneVerifiedAt?: string;
  createdAt?: string;
  lastLoginAt?: string;
}
```

### Session

```typescript
interface Session {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  isCurrent: boolean;
  isNewDevice?: boolean;
  isSuspicious?: boolean;
  suspiciousReasons?: string[];
  suspiciousDetectedAt?: string;
}
```

### ComponentStyles

```typescript
interface ComponentStyles {
  container?: React.CSSProperties;
  input?: React.CSSProperties;
  button?: React.CSSProperties;
  label?: React.CSSProperties;
  error?: React.CSSProperties;
  link?: React.CSSProperties;
}
```

---

## Utility Functions

### Style Utilities

```typescript
// Get button styles
getButtonStyles(theme, variant, size, disabled, fullWidth)

// Get input styles
getInputStyles(theme, error, disabled)

// Get label styles
getLabelStyles(theme)

// Get error styles
getErrorStyles(theme)

// Get card styles
getCardStyles(theme)

// Get link styles
getLinkStyles(theme)

// Merge styles
mergeStyles(...styles)
```

---

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## Accessibility

All components follow WCAG 2.1 AA guidelines:

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Focus management
- Screen reader support
- Color contrast compliance

---

## License

MIT
