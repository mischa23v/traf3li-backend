/**
 * @traf3li/auth-react - AuthGuard Component
 * Protected route component
 */

import React, { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { AuthGuardProps } from '../types';

/**
 * AuthGuard Component
 *
 * Protect routes by checking authentication and authorization
 *
 * @example
 * ```tsx
 * // Require authentication
 * <AuthGuard requireAuth redirectTo="/login">
 *   <DashboardPage />
 * </AuthGuard>
 *
 * // Require specific role
 * <AuthGuard requireRoles={['admin']} redirectTo="/unauthorized">
 *   <AdminPanel />
 * </AuthGuard>
 *
 * // Require specific permissions
 * <AuthGuard requirePermissions={['users.write']} fallback={<AccessDenied />}>
 *   <UserManagement />
 * </AuthGuard>
 * ```
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAuth = true,
  requireRoles = [],
  requirePermissions = [],
  redirectTo,
  fallback = null,
  onUnauthorized,
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    // Handle unauthorized access
    if (!isLoading && requireAuth && !isAuthenticated) {
      onUnauthorized?.();

      if (redirectTo) {
        // Client-side redirect
        if (typeof window !== 'undefined') {
          window.location.href = redirectTo;
        }
      }
    }
  }, [isLoading, requireAuth, isAuthenticated, redirectTo, onUnauthorized]);

  // Show loading state
  if (isLoading) {
    return <>{fallback}</>;
  }

  // Check authentication
  if (requireAuth && !isAuthenticated) {
    return <>{fallback}</>;
  }

  // Check roles
  if (requireRoles.length > 0 && user) {
    const hasRequiredRole = requireRoles.some((role) => user.role === role);
    if (!hasRequiredRole) {
      onUnauthorized?.();
      return <>{fallback}</>;
    }
  }

  // Check permissions
  if (requirePermissions.length > 0 && user) {
    const userPermissions = user.permissions || {};

    const hasAllPermissions = requirePermissions.every((permission) => {
      // Support nested permissions (e.g., 'users.write')
      const keys = permission.split('.');
      let current: any = userPermissions;

      for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key];
        } else {
          return false;
        }
      }

      // Permission value should be truthy
      return !!current;
    });

    if (!hasAllPermissions) {
      onUnauthorized?.();
      return <>{fallback}</>;
    }
  }

  // All checks passed - render children
  return <>{children}</>;
};

/**
 * Default loading fallback
 */
AuthGuard.defaultProps = {
  requireAuth: true,
  requireRoles: [],
  requirePermissions: [],
  fallback: null,
};
