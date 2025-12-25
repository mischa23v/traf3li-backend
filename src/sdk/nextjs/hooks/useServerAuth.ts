/**
 * Server Component Hooks for Traf3li Auth
 *
 * Provides hooks for use in Next.js Server Components (App Router)
 * These are not React hooks - they're async functions for server use
 */

import { getServerUser, getServerSession, requireAuth, hasRole, requireRole } from '../server';
import type { User, Session } from '../types';

// ═══════════════════════════════════════════════════════════════
// SERVER AUTH HOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * Get current user in Server Component
 * This is a convenience wrapper around getServerUser()
 *
 * @example
 * // app/dashboard/page.tsx
 * import { useServerAuth } from '@traf3li/auth-nextjs/hooks';
 *
 * export default async function DashboardPage() {
 *   const user = await useServerAuth();
 *
 *   if (!user) {
 *     redirect('/login');
 *   }
 *
 *   return (
 *     <div>
 *       <h1>Welcome, {user.firstName}!</h1>
 *     </div>
 *   );
 * }
 */
export async function useServerAuth(): Promise<User | null> {
  return getServerUser();
}

/**
 * Get current session in Server Component
 *
 * @example
 * const session = await useServerSession();
 */
export async function useServerSession(): Promise<Session | null> {
  return getServerSession();
}

/**
 * Require authentication in Server Component
 * Throws error if not authenticated
 *
 * @example
 * // This will throw if user is not authenticated
 * const user = await useRequireAuth();
 */
export async function useRequireAuth(): Promise<User> {
  return requireAuth();
}

/**
 * Check if user has specific role in Server Component
 *
 * @example
 * const isAdmin = await useHasRole(['admin']);
 */
export async function useHasRole(roles: string[]): Promise<boolean> {
  return hasRole(roles);
}

/**
 * Require specific role in Server Component
 * Throws error if user doesn't have required role
 *
 * @example
 * const user = await useRequireRole(['admin', 'lawyer']);
 */
export async function useRequireRole(roles: string[]): Promise<User> {
  return requireRole(roles);
}

// ═══════════════════════════════════════════════════════════════
// TYPED RE-EXPORTS
// ═══════════════════════════════════════════════════════════════

export type { User, Session } from '../types';
