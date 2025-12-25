/**
 * @traf3li/auth-react - React Context
 * Authentication context for React applications
 */

import { createContext } from 'react';
import type { AuthContextValue } from './types';

/**
 * Authentication Context
 * Provides auth state and methods to all child components
 */
export const TrafAuthContext = createContext<AuthContextValue | null>(null);

/**
 * Display name for better debugging
 */
TrafAuthContext.displayName = 'TrafAuthContext';
