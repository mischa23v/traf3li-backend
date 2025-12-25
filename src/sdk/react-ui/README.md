# Traf3li Auth React UI Components

Pre-built, production-ready React authentication UI components for Traf3li Auth. Beautiful, accessible, and fully customizable.

## Features

- 🎨 **Beautiful Design** - Clean, modern interface with light and dark themes
- ♿ **Fully Accessible** - WCAG 2.1 AA compliant
- 🌍 **RTL Support** - Built-in support for Arabic and other RTL languages
- 🎨 **Customizable** - Full theme customization with CSS variables
- 📱 **Responsive** - Mobile-first design that works on all devices
- 🔒 **Secure** - Built with security best practices
- 🚀 **Zero Dependencies** - No external UI library dependencies
- 💪 **TypeScript** - Full TypeScript support

## Installation

```bash
npm install @traf3li/auth-react-ui
```

## Quick Start

```tsx
import { ThemeProvider, LoginForm } from '@traf3li/auth-react-ui';

function App() {
  return (
    <ThemeProvider theme="light">
      <LoginForm
        onSuccess={(user) => {
          console.log('Logged in:', user);
        }}
        showSocialLogins={true}
        providers={['google', 'microsoft']}
        showMagicLink={true}
      />
    </ThemeProvider>
  );
}
```

## Components

### Authentication Forms

#### LoginForm

Full-featured login form with email/password, social logins, magic link, and MFA support.

```tsx
<LoginForm
  onSuccess={(user) => router.push('/dashboard')}
  onError={(error) => toast.error(error.message)}
  showSocialLogins={true}
  showMagicLink={true}
  showRememberMe={true}
  providers={['google', 'microsoft']}
  redirectUrl="/dashboard"
  apiUrl="/api/auth"
/>
```

#### SignupForm

Registration form with customizable fields and password strength indicator.

```tsx
<SignupForm
  onSuccess={(user) => router.push('/verify-email')}
  fields={['email', 'password', 'firstName', 'lastName', 'phone']}
  passwordStrengthIndicator={true}
  termsUrl="/terms"
  privacyUrl="/privacy"
  requireTermsAcceptance={true}
/>
```

#### ForgotPasswordForm

Password reset request form.

```tsx
<ForgotPasswordForm
  onSuccess={() => toast.success('Check your email')}
  onBackToLogin={() => setView('login')}
/>
```

#### ResetPasswordForm

Password reset form with token validation.

```tsx
<ResetPasswordForm
  token={token}
  onSuccess={() => router.push('/login')}
  passwordRequirements={true}
/>
```

### MFA Components

#### MFASetup

TOTP setup with QR code and backup codes.

```tsx
<MFASetup
  onComplete={() => toast.success('MFA enabled')}
  showBackupCodes={true}
/>
```

#### MFAVerify

TOTP verification during login.

```tsx
<MFAVerify
  userId={userId}
  onSuccess={(user) => router.push('/dashboard')}
  showBackupCodeOption={true}
/>
```

### User Management

#### UserProfile

User profile display and edit form.

```tsx
<UserProfile
  editableFields={['firstName', 'lastName', 'phone', 'avatar']}
  showPasswordChange={true}
  showMFASettings={true}
  showSessionsLink={true}
/>
```

#### SessionManager

Active session management with device info and location.

```tsx
<SessionManager
  showDeviceInfo={true}
  showLocation={true}
  allowRevokeAll={true}
/>
```

#### PasswordChangeForm

Password change form for authenticated users.

```tsx
<PasswordChangeForm
  onSuccess={() => toast.success('Password changed')}
  showPasswordStrength={true}
/>
```

### Core Components

#### OTPInput

6-digit OTP input with auto-focus and paste support.

```tsx
<OTPInput
  length={6}
  onComplete={(otp) => handleVerify(otp)}
  autoSubmit={true}
  error={false}
/>
```

#### PasswordStrength

Password strength indicator with requirements checklist.

```tsx
<PasswordStrength
  password={password}
  showRequirements={true}
  showLabel={true}
  showBar={true}
/>
```

#### SocialLoginButtons

Social OAuth provider buttons.

```tsx
<SocialLoginButtons
  providers={['google', 'microsoft', 'apple']}
  layout="vertical"
  size="md"
  onProviderClick={(provider) => handleSocialLogin(provider)}
/>
```

#### GoogleOneTapButton

Google One Tap sign-in button.

```tsx
<GoogleOneTapButton
  clientId={GOOGLE_CLIENT_ID}
  onCredentialResponse={(response) => handleGoogleLogin(response)}
  autoSelect={true}
/>
```

## Theming

### Using Built-in Themes

```tsx
import { ThemeProvider, defaultTheme, darkTheme } from '@traf3li/auth-react-ui';

<ThemeProvider theme="light">
  {/* Your components */}
</ThemeProvider>

// or

<ThemeProvider theme="dark">
  {/* Your components */}
</ThemeProvider>
```

### Custom Theme

```tsx
import { ThemeProvider, defaultTheme } from '@traf3li/auth-react-ui';

const customTheme = {
  ...defaultTheme,
  colors: {
    ...defaultTheme.colors,
    primary: '#7c3aed',
    primaryHover: '#6d28d9',
  },
};

<ThemeProvider theme={customTheme}>
  {/* Your components */}
</ThemeProvider>
```

### RTL Support

```tsx
const arabicTheme = {
  ...defaultTheme,
  rtl: true,
};

<ThemeProvider theme={arabicTheme}>
  {/* Components will render in RTL */}
</ThemeProvider>
```

### Custom Styling

All components accept a `styles` prop for custom CSS:

```tsx
<LoginForm
  styles={{
    container: { maxWidth: '500px' },
    input: { borderRadius: '16px' },
    button: { height: '56px' },
  }}
/>
```

Or use the `className` prop for Tailwind CSS:

```tsx
<LoginForm className="max-w-md mx-auto" />
```

## TypeScript

Full TypeScript support with exported types:

```tsx
import type { User, Session, MFAStatus, ComponentStyles } from '@traf3li/auth-react-ui';
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT

## Support

For issues and feature requests, visit: https://github.com/traf3li/traf3li-backend/issues
