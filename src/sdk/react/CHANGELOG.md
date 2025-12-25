# Changelog

All notable changes to @traf3li/auth-react will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-01

### Added

#### Core Features
- **TrafAuthProvider** - Main provider component with configuration options
- **TrafAuthContext** - React context for auth state management
- Full TypeScript support with comprehensive type definitions

#### Hooks
- **useAuth** - Main authentication hook with all auth methods
- **useUser** - Simplified hook for user data and profile management
- **useMFA** - Multi-Factor Authentication management hook
- **useSessions** - Session management across devices hook
- **usePasswordless** - Passwordless authentication (Magic Links, OTP) hook
- **useOAuth** - OAuth social authentication hook

#### Components
- **AuthGuard** - Protected route component with role/permission checks
- **withAuth** - Higher-Order Component for wrapping components with auth

#### Authentication Methods
- Email/Password login and registration
- OAuth social login (Google, Microsoft, Apple, GitHub)
- Google One Tap integration
- Magic Links (passwordless email authentication)
- OTP (SMS/WhatsApp authentication)
- Multi-Factor Authentication (TOTP with backup codes)
- Password reset flow
- Email verification

#### Session Management
- Multi-device session tracking
- Session revocation (individual and all other devices)
- Device fingerprinting
- Location tracking
- Session expiration management

#### Security Features
- CSRF token management
- Automatic token refresh
- Secure cookie handling
- Session persistence with localStorage
- SSR compatibility

#### Developer Experience
- Complete TypeScript types
- Tree-shakeable exports
- Comprehensive documentation
- Example code for all features
- Next.js integration examples
- Error handling with AuthError class

#### Configuration Options
- API URL configuration
- Firm ID context support
- Auth state change callbacks
- Error callbacks
- Auto token refresh settings
- Session persistence settings
- Custom storage keys

### Documentation
- Comprehensive README with usage examples
- EXAMPLES.md with detailed implementation examples
- Type definitions for all public APIs
- Inline JSDoc comments

### Developer Tools
- TypeScript configuration (tsconfig.json)
- NPM package configuration
- .npmignore for clean publishing
- Changelog (this file)

## [Unreleased]

### Planned Features
- Biometric authentication support (WebAuthn)
- Remember me functionality
- Account lockout handling
- Password strength meter component
- Pre-built UI components (optional)
- React Native support
- Offline mode support
- Enhanced analytics integration
- Custom authentication flows
- Multi-language support

---

## Version History

### 1.0.0 - Initial Release
First stable release with full authentication feature set.
