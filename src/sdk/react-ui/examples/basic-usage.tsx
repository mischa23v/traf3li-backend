/**
 * Basic Usage Examples for Traf3li Auth React UI Components
 */

import React, { useState } from 'react';
import {
  ThemeProvider,
  LoginForm,
  SignupForm,
  ForgotPasswordForm,
  ResetPasswordForm,
  MFASetup,
  MFAVerify,
  UserProfile,
  SessionManager,
  PasswordChangeForm,
  User,
} from '../index';

// Example 1: Basic Login Page
export function LoginPage() {
  const [user, setUser] = useState<User | null>(null);

  return (
    <ThemeProvider theme="light">
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <LoginForm
          onSuccess={(user) => {
            setUser(user);
            // Redirect to dashboard
            window.location.href = '/dashboard';
          }}
          onError={(error) => {
            console.error('Login error:', error);
          }}
          showSocialLogins={true}
          providers={['google', 'microsoft']}
          showMagicLink={true}
          showRememberMe={true}
        />
      </div>
    </ThemeProvider>
  );
}

// Example 2: Signup Page
export function SignupPage() {
  return (
    <ThemeProvider theme="light">
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <SignupForm
          onSuccess={(user) => {
            // Redirect to verify email page
            window.location.href = '/verify-email';
          }}
          fields={['email', 'password', 'firstName', 'lastName', 'phone']}
          passwordStrengthIndicator={true}
          requireTermsAcceptance={true}
        />
      </div>
    </ThemeProvider>
  );
}

// Example 3: Dark Theme
export function DarkThemeExample() {
  return (
    <ThemeProvider theme="dark">
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <LoginForm
          onSuccess={(user) => console.log('Logged in:', user)}
          showSocialLogins={true}
          providers={['google', 'microsoft', 'apple']}
        />
      </div>
    </ThemeProvider>
  );
}

// Example 4: Custom Theme
export function CustomThemeExample() {
  const customTheme = {
    colors: {
      primary: '#7c3aed',
      primaryHover: '#6d28d9',
      primaryActive: '#5b21b6',
      // ... other colors
    },
    // ... other theme properties
  };

  return (
    <ThemeProvider customTheme={customTheme}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <LoginForm onSuccess={(user) => console.log('Logged in:', user)} />
      </div>
    </ThemeProvider>
  );
}

// Example 5: Multi-Step Auth Flow
export function MultiStepAuthFlow() {
  const [step, setStep] = useState<'login' | 'mfa' | 'dashboard'>('login');
  const [userId, setUserId] = useState('');

  if (step === 'mfa') {
    return (
      <ThemeProvider theme="light">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <MFAVerify
            userId={userId}
            onSuccess={(user) => {
              console.log('MFA verified:', user);
              setStep('dashboard');
            }}
            showBackupCodeOption={true}
          />
        </div>
      </ThemeProvider>
    );
  }

  if (step === 'dashboard') {
    return <div>Dashboard - User is authenticated!</div>;
  }

  return (
    <ThemeProvider theme="light">
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <LoginForm
          onSuccess={(user) => {
            // Check if MFA is required
            // This would come from the API response
            const mfaRequired = false;
            if (mfaRequired) {
              setUserId(user.id);
              setStep('mfa');
            } else {
              setStep('dashboard');
            }
          }}
        />
      </div>
    </ThemeProvider>
  );
}

// Example 6: Password Reset Flow
export function PasswordResetFlow() {
  const [view, setView] = useState<'request' | 'reset'>('request');
  const [resetToken, setResetToken] = useState('');

  if (view === 'reset') {
    return (
      <ThemeProvider theme="light">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <ResetPasswordForm
            token={resetToken}
            onSuccess={() => {
              // Redirect to login
              window.location.href = '/login';
            }}
            passwordRequirements={true}
          />
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme="light">
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <ForgotPasswordForm
          onSuccess={() => {
            // Show success message or redirect
          }}
          onBackToLogin={() => {
            window.location.href = '/login';
          }}
        />
      </div>
    </ThemeProvider>
  );
}

// Example 7: User Dashboard with Profile and Sessions
export function UserDashboard() {
  const [view, setView] = useState<'profile' | 'sessions' | 'mfa' | 'password'>('profile');

  return (
    <ThemeProvider theme="light">
      <div style={{ padding: '20px' }}>
        <nav style={{ marginBottom: '20px' }}>
          <button onClick={() => setView('profile')}>Profile</button>
          <button onClick={() => setView('sessions')}>Sessions</button>
          <button onClick={() => setView('mfa')}>MFA Setup</button>
          <button onClick={() => setView('password')}>Change Password</button>
        </nav>

        {view === 'profile' && (
          <UserProfile
            editableFields={['firstName', 'lastName', 'phone', 'avatar']}
            showPasswordChange={true}
            showMFASettings={true}
            showSessionsLink={true}
            onUpdate={(user) => {
              console.log('Profile updated:', user);
            }}
          />
        )}

        {view === 'sessions' && (
          <SessionManager
            showDeviceInfo={true}
            showLocation={true}
            allowRevokeAll={true}
            onSessionRevoked={(sessionId) => {
              console.log('Session revoked:', sessionId);
            }}
          />
        )}

        {view === 'mfa' && (
          <MFASetup
            onComplete={() => {
              console.log('MFA setup complete');
              setView('profile');
            }}
            showBackupCodes={true}
          />
        )}

        {view === 'password' && (
          <PasswordChangeForm
            onSuccess={() => {
              console.log('Password changed');
              setView('profile');
            }}
            showPasswordStrength={true}
          />
        )}
      </div>
    </ThemeProvider>
  );
}

// Example 8: RTL (Arabic) Support
export function RTLExample() {
  const arabicTheme = {
    rtl: true,
  };

  return (
    <ThemeProvider customTheme={arabicTheme}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <LoginForm
          onSuccess={(user) => console.log('تسجيل الدخول:', user)}
          showSocialLogins={true}
          providers={['google', 'microsoft']}
        />
      </div>
    </ThemeProvider>
  );
}

// Example 9: Custom Styling with Tailwind
export function TailwindExample() {
  return (
    <ThemeProvider theme="light">
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md">
          <LoginForm
            className="shadow-2xl"
            onSuccess={(user) => console.log('Logged in:', user)}
            styles={{
              container: { padding: '40px' },
              input: { fontSize: '16px' },
              button: { fontSize: '16px', fontWeight: '600' },
            }}
          />
        </div>
      </div>
    </ThemeProvider>
  );
}

// Example 10: Social Login Only
export function SocialLoginOnly() {
  return (
    <ThemeProvider theme="light">
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <LoginForm
          onSuccess={(user) => console.log('Logged in:', user)}
          showSocialLogins={true}
          providers={['google', 'microsoft', 'apple', 'github']}
          showMagicLink={false}
          showRememberMe={false}
          onSocialLogin={(provider) => {
            console.log('Social login with:', provider);
            // Handle OAuth redirect
            window.location.href = `/api/auth/sso/${provider}`;
          }}
        />
      </div>
    </ThemeProvider>
  );
}
