# Traf3li Auth React UI - Installation Guide

Complete guide to installing and setting up Traf3li Auth React UI components in your React application.

## Prerequisites

- React 17.0.0 or higher
- Node.js 14.0.0 or higher
- TypeScript 4.0.0 or higher (optional, but recommended)

## Installation

### NPM

```bash
npm install @traf3li/auth-react-ui
```

### Yarn

```bash
yarn add @traf3li/auth-react-ui
```

### PNPM

```bash
pnpm add @traf3li/auth-react-ui
```

## Quick Start

### 1. Wrap your app with ThemeProvider

```tsx
// App.tsx or _app.tsx (Next.js)
import { ThemeProvider } from '@traf3li/auth-react-ui';

function App() {
  return (
    <ThemeProvider theme="light">
      {/* Your app components */}
    </ThemeProvider>
  );
}
```

### 2. Use components

```tsx
// LoginPage.tsx
import { LoginForm } from '@traf3li/auth-react-ui';

function LoginPage() {
  return (
    <LoginForm
      onSuccess={(user) => {
        console.log('Logged in:', user);
        // Redirect to dashboard
        window.location.href = '/dashboard';
      }}
      showSocialLogins={true}
      providers={['google', 'microsoft']}
    />
  );
}
```

## Configuration

### Setting up API URL

Configure the API base URL for all components:

```tsx
<LoginForm
  apiUrl="https://api.yourapp.com/auth"
  onSuccess={(user) => console.log(user)}
/>
```

Or set it globally using environment variables:

```bash
# .env
REACT_APP_API_URL=https://api.yourapp.com/auth
```

```tsx
const API_URL = process.env.REACT_APP_API_URL;

<LoginForm
  apiUrl={API_URL}
  onSuccess={(user) => console.log(user)}
/>
```

### Customizing Theme

#### Using Built-in Themes

```tsx
import { ThemeProvider } from '@traf3li/auth-react-ui';

// Light theme (default)
<ThemeProvider theme="light">
  <App />
</ThemeProvider>

// Dark theme
<ThemeProvider theme="dark">
  <App />
</ThemeProvider>
```

#### Custom Theme

```tsx
import { ThemeProvider, defaultTheme } from '@traf3li/auth-react-ui';

const customTheme = {
  ...defaultTheme,
  colors: {
    ...defaultTheme.colors,
    primary: '#7c3aed', // Purple
    primaryHover: '#6d28d9',
    primaryActive: '#5b21b6',
  },
  borderRadius: {
    ...defaultTheme.borderRadius,
    md: '16px', // More rounded
  },
};

<ThemeProvider theme={customTheme}>
  <App />
</ThemeProvider>
```

#### Partial Theme Override

```tsx
<ThemeProvider
  theme="light"
  customTheme={{
    colors: {
      primary: '#7c3aed',
    },
  }}
>
  <App />
</ThemeProvider>
```

### RTL Support (Arabic, Hebrew, etc.)

```tsx
const arabicTheme = {
  ...defaultTheme,
  rtl: true,
};

<ThemeProvider theme={arabicTheme}>
  <App />
</ThemeProvider>
```

## Framework-Specific Setup

### Next.js

#### App Router (Next.js 13+)

```tsx
// app/layout.tsx
import { ThemeProvider } from '@traf3li/auth-react-ui';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider theme="light">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

```tsx
// app/login/page.tsx
import { LoginForm } from '@traf3li/auth-react-ui';

export default function LoginPage() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <LoginForm
        onSuccess={(user) => {
          // Handle success
        }}
      />
    </div>
  );
}
```

#### Pages Router (Next.js 12 and below)

```tsx
// pages/_app.tsx
import { ThemeProvider } from '@traf3li/auth-react-ui';
import type { AppProps } from 'next/app';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider theme="light">
      <Component {...pageProps} />
    </ThemeProvider>
  );
}

export default MyApp;
```

### Create React App

```tsx
// index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@traf3li/auth-react-ui';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ThemeProvider theme="light">
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
```

### Vite

```tsx
// main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@traf3li/auth-react-ui';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme="light">
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
```

### Remix

```tsx
// app/root.tsx
import { ThemeProvider } from '@traf3li/auth-react-ui';

export default function App() {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <ThemeProvider theme="light">
          <Outlet />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
```

## Using with CSS Frameworks

### Tailwind CSS

Traf3li Auth React UI components work seamlessly with Tailwind CSS:

```tsx
<LoginForm
  className="shadow-2xl"
  styles={{
    container: {
      // Additional custom styles
    },
  }}
/>
```

### CSS Modules

```tsx
import styles from './Login.module.css';

<LoginForm
  className={styles.loginForm}
/>
```

### Styled Components

```tsx
import styled from 'styled-components';

const StyledLoginContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

function LoginPage() {
  return (
    <StyledLoginContainer>
      <LoginForm onSuccess={(user) => console.log(user)} />
    </StyledLoginContainer>
  );
}
```

## TypeScript Support

All components are fully typed. Import types as needed:

```tsx
import type {
  User,
  Session,
  MFAStatus,
  ComponentStyles,
} from '@traf3li/auth-react-ui';

function MyComponent() {
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  return (
    <LoginForm
      onSuccess={(user: User) => {
        setUser(user);
      }}
    />
  );
}
```

## Error Handling

### Global Error Handler

```tsx
function App() {
  const handleError = (error: Error) => {
    console.error('Auth error:', error);
    // Log to error tracking service
    // Sentry, LogRocket, etc.
  };

  return (
    <ThemeProvider theme="light">
      <LoginForm
        onSuccess={(user) => console.log(user)}
        onError={handleError}
      />
    </ThemeProvider>
  );
}
```

### Toast Notifications

```tsx
import { toast } from 'react-hot-toast';

<LoginForm
  onSuccess={(user) => {
    toast.success('Successfully logged in!');
  }}
  onError={(error) => {
    toast.error(error.message);
  }}
/>
```

## API Integration

### Setting up Axios

```tsx
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.yourapp.com',
  withCredentials: true,
});

// Custom login handler
const handleLogin = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data.user;
};
```

### Using with React Query

```tsx
import { useMutation } from '@tanstack/react-query';

function LoginPage() {
  const loginMutation = useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      api.post('/auth/login', credentials),
    onSuccess: (data) => {
      console.log('Logged in:', data.user);
    },
  });

  // Use default LoginForm or create custom form
  return <LoginForm />;
}
```

## State Management

### With Redux

```tsx
import { useDispatch } from 'react-redux';
import { setUser } from './store/authSlice';

function LoginPage() {
  const dispatch = useDispatch();

  return (
    <LoginForm
      onSuccess={(user) => {
        dispatch(setUser(user));
        // Navigate to dashboard
      }}
    />
  );
}
```

### With Zustand

```tsx
import { useAuthStore } from './store/authStore';

function LoginPage() {
  const setUser = useAuthStore((state) => state.setUser);

  return (
    <LoginForm
      onSuccess={(user) => {
        setUser(user);
      }}
    />
  );
}
```

### With Context API

```tsx
import { useAuth } from './contexts/AuthContext';

function LoginPage() {
  const { login } = useAuth();

  return (
    <LoginForm
      onSuccess={(user) => {
        login(user);
      }}
    />
  );
}
```

## Routing

### React Router

```tsx
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const navigate = useNavigate();

  return (
    <LoginForm
      onSuccess={(user) => {
        navigate('/dashboard');
      }}
    />
  );
}
```

### Next.js Router

```tsx
import { useRouter } from 'next/router';

function LoginPage() {
  const router = useRouter();

  return (
    <LoginForm
      onSuccess={(user) => {
        router.push('/dashboard');
      }}
    />
  );
}
```

## Best Practices

### 1. Environment Variables

Store sensitive data in environment variables:

```bash
# .env
REACT_APP_API_URL=https://api.yourapp.com
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
```

### 2. Protected Routes

```tsx
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}
```

### 3. Loading States

```tsx
function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    checkAuth().then((user) => {
      setUser(user);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return user ? <Dashboard /> : <LoginPage />;
}
```

### 4. Error Boundaries

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function App() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <ThemeProvider theme="light">
        <LoginForm />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
```

## Troubleshooting

### Common Issues

#### Components not styled correctly

Make sure ThemeProvider is wrapping your app:

```tsx
<ThemeProvider theme="light">
  <App />
</ThemeProvider>
```

#### TypeScript errors

Install type definitions:

```bash
npm install --save-dev @types/react @types/react-dom
```

#### CORS errors

Ensure your API server allows credentials and has proper CORS headers:

```javascript
// Express.js example
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

## Next Steps

- Read the [Component API Reference](./COMPONENT_API.md)
- Check out [Usage Examples](./examples/basic-usage.tsx)
- Explore [Theme Customization](./README.md#theming)
- Learn about [Security Best Practices](../../../AUTHENTICATION_SETUP_GUIDE.md)

## Support

For issues and questions:
- GitHub Issues: https://github.com/traf3li/traf3li-backend/issues
- Documentation: https://github.com/traf3li/traf3li-backend

## License

MIT
