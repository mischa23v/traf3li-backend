# Quick Start Guide - @traf3li/auth-react

Get started with Traf3li Auth in 5 minutes.

## Installation

```bash
npm install @traf3li/auth-react
```

## Step 1: Setup Provider

Wrap your app with `TrafAuthProvider`:

```tsx
// App.tsx
import { TrafAuthProvider } from '@traf3li/auth-react';

function App() {
  return (
    <TrafAuthProvider apiUrl="https://api.traf3li.com">
      <YourApp />
    </TrafAuthProvider>
  );
}
```

## Step 2: Use Authentication

### Simple Login

```tsx
import { useAuth } from '@traf3li/auth-react';

function LoginPage() {
  const { login, isLoading } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    await login({
      email: formData.get('email'),
      password: formData.get('password')
    });
  };

  return (
    <form onSubmit={handleLogin}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit" disabled={isLoading}>Login</button>
    </form>
  );
}
```

### Get Current User

```tsx
import { useAuth } from '@traf3li/auth-react';

function Profile() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <div>Please login</div>;
  }

  return (
    <div>
      <h1>Welcome, {user.firstName}!</h1>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>
    </div>
  );
}
```

### Protect Routes

```tsx
import { AuthGuard } from '@traf3li/auth-react';

function DashboardPage() {
  return (
    <AuthGuard requireAuth redirectTo="/login">
      <Dashboard />
    </AuthGuard>
  );
}
```

### Logout

```tsx
import { useAuth } from '@traf3li/auth-react';

function Header() {
  const { logout, user } = useAuth();

  return (
    <header>
      <span>{user?.firstName}</span>
      <button onClick={logout}>Logout</button>
    </header>
  );
}
```

## Step 3: Advanced Features

### Social Login

```tsx
import { useAuth } from '@traf3li/auth-react';

function SocialLogin() {
  const { loginWithGoogle, loginWithMicrosoft } = useAuth();

  return (
    <div>
      <button onClick={loginWithGoogle}>Google</button>
      <button onClick={loginWithMicrosoft}>Microsoft</button>
    </div>
  );
}
```

### Magic Link (Passwordless)

```tsx
import { usePasswordless } from '@traf3li/auth-react';

function MagicLinkLogin() {
  const { sendMagicLink } = usePasswordless();

  const handleSendLink = async (email) => {
    await sendMagicLink({
      email,
      purpose: 'login',
      redirectUrl: '/dashboard'
    });
    alert('Check your email!');
  };

  return (
    <input
      type="email"
      onBlur={(e) => handleSendLink(e.target.value)}
    />
  );
}
```

### Enable MFA/2FA

```tsx
import { useMFA } from '@traf3li/auth-react';

function EnableMFA() {
  const { setupMFA, verifySetup } = useMFA();
  const [qrCode, setQRCode] = useState('');

  const handleEnable = async () => {
    const { qrCode } = await setupMFA();
    setQRCode(qrCode);
    // User scans QR code
    const code = prompt('Enter code from app');
    await verifySetup(code);
  };

  return <button onClick={handleEnable}>Enable 2FA</button>;
}
```

### Manage Sessions

```tsx
import { useSessions } from '@traf3li/auth-react';

function Sessions() {
  const { sessions, revokeAllOther } = useSessions();

  return (
    <div>
      <p>Active devices: {sessions.length}</p>
      <button onClick={revokeAllOther}>
        Logout all other devices
      </button>
    </div>
  );
}
```

## Common Patterns

### Protected Admin Route

```tsx
import { AuthGuard } from '@traf3li/auth-react';

function AdminPanel() {
  return (
    <AuthGuard
      requireRoles={['admin']}
      redirectTo="/unauthorized"
    >
      <AdminContent />
    </AuthGuard>
  );
}
```

### Role-Based UI

```tsx
import { useAuth } from '@traf3li/auth-react';

function Header() {
  const { user } = useAuth();

  return (
    <nav>
      <Link to="/dashboard">Dashboard</Link>
      {user?.role === 'admin' && (
        <Link to="/admin">Admin</Link>
      )}
    </nav>
  );
}
```

### Loading State

```tsx
import { useAuth } from '@traf3li/auth-react';

function App() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <Spinner />;
  }

  return isAuthenticated ? <Dashboard /> : <Login />;
}
```

## Next Steps

- Read the full [README](./README.md)
- Check out [Examples](./EXAMPLES.md)
- Review [API Documentation](./types.ts)
- See [Changelog](./CHANGELOG.md)

## Need Help?

- GitHub Issues: https://github.com/traf3li/traf3li-backend/issues
- Documentation: https://docs.traf3li.com
- Email: support@traf3li.com
