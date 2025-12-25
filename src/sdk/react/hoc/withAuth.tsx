/**
 * @traf3li/auth-react - withAuth HOC
 * Higher-Order Component for authentication
 */

import React from 'react';
import { AuthGuard } from '../components/AuthGuard';
import type { WithAuthOptions } from '../types';

/**
 * Default loader component
 */
const DefaultLoader: React.FC = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
  }}>
    <div>Loading...</div>
  </div>
);

/**
 * withAuth Higher-Order Component
 *
 * Wraps a component with authentication checks
 *
 * @example
 * ```tsx
 * // Basic usage - require authentication
 * const ProtectedPage = withAuth(DashboardPage);
 *
 * // With options
 * const AdminPage = withAuth(AdminPanel, {
 *   requireAuth: true,
 *   requireRoles: ['admin'],
 *   redirectTo: '/login',
 *   loader: CustomLoader
 * });
 *
 * // Multiple roles
 * const LawyerPage = withAuth(LawyerDashboard, {
 *   requireRoles: ['lawyer', 'admin'],
 *   requirePermissions: ['cases.read']
 * });
 * ```
 *
 * @param Component - Component to wrap
 * @param options - Authentication options
 * @returns Wrapped component with auth checks
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: WithAuthOptions = {}
): React.FC<P> {
  const {
    requireAuth = true,
    requireRoles = [],
    requirePermissions = [],
    redirectTo = '/login',
    loader: LoaderComponent = DefaultLoader,
  } = options;

  const WrappedComponent: React.FC<P> = (props) => {
    return (
      <AuthGuard
        requireAuth={requireAuth}
        requireRoles={requireRoles}
        requirePermissions={requirePermissions}
        redirectTo={redirectTo}
        fallback={<LoaderComponent />}
      >
        <Component {...props} />
      </AuthGuard>
    );
  };

  // Set display name for debugging
  const displayName = Component.displayName || Component.name || 'Component';
  WrappedComponent.displayName = `withAuth(${displayName})`;

  return WrappedComponent;
}
