/**
 * Traf3li Auth SDK - Event Emitter
 *
 * Type-safe event emitter for authentication state changes
 */

import type { AuthChangeEvent, AuthChangeCallback, ErrorCallback, Session } from './types';

/**
 * Event listener
 */
interface EventListener {
  callback: Function;
  once: boolean;
}

/**
 * Auth event emitter
 */
export class AuthEventEmitter {
  private listeners: Map<string, EventListener[]>;
  private debug: boolean;

  constructor(debug: boolean = false) {
    this.listeners = new Map();
    this.debug = debug;
  }

  /**
   * Subscribe to auth state changes
   */
  on(event: AuthChangeEvent | 'error', callback: AuthChangeCallback | ErrorCallback): () => void {
    return this.addEventListener(event, callback, false);
  }

  /**
   * Subscribe to auth state changes (one-time)
   */
  once(event: AuthChangeEvent | 'error', callback: AuthChangeCallback | ErrorCallback): () => void {
    return this.addEventListener(event, callback, true);
  }

  /**
   * Unsubscribe from auth state changes
   */
  off(event: AuthChangeEvent | 'error', callback?: AuthChangeCallback | ErrorCallback): void {
    if (!callback) {
      // Remove all listeners for this event
      this.listeners.delete(event);
      return;
    }

    const listeners = this.listeners.get(event);
    if (!listeners) return;

    const index = listeners.findIndex((listener) => listener.callback === callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }

    if (listeners.length === 0) {
      this.listeners.delete(event);
    }
  }

  /**
   * Emit an event
   */
  emit(event: AuthChangeEvent | 'error', ...args: any[]): void {
    if (this.debug) {
      console.log(`[Traf3li Auth SDK] Event emitted: ${event}`, args);
    }

    const listeners = this.listeners.get(event);
    if (!listeners || listeners.length === 0) return;

    // Create a copy to avoid issues if listeners are removed during iteration
    const listenersCopy = [...listeners];

    for (const listener of listenersCopy) {
      try {
        listener.callback(...args);

        // Remove one-time listeners after execution
        if (listener.once) {
          this.off(event, listener.callback);
        }
      } catch (error) {
        console.error(`[Traf3li Auth SDK] Error in event listener for ${event}:`, error);

        // Emit error event if this isn't already an error event
        if (event !== 'error') {
          this.emit('error', error);
        }
      }
    }
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(event?: AuthChangeEvent | 'error'): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event: AuthChangeEvent | 'error'): number {
    const listeners = this.listeners.get(event);
    return listeners ? listeners.length : 0;
  }

  /**
   * Get all event names that have listeners
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Check if there are any listeners for an event
   */
  hasListeners(event: AuthChangeEvent | 'error'): boolean {
    return this.listenerCount(event) > 0;
  }

  /**
   * Add event listener (internal)
   */
  private addEventListener(
    event: AuthChangeEvent | 'error',
    callback: AuthChangeCallback | ErrorCallback,
    once: boolean
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const listeners = this.listeners.get(event)!;
    listeners.push({ callback, once });

    if (this.debug) {
      console.log(`[Traf3li Auth SDK] Listener added for event: ${event}`);
    }

    // Return unsubscribe function
    return () => this.off(event, callback);
  }
}

/**
 * Auth state change handler
 */
export class AuthStateHandler {
  private emitter: AuthEventEmitter;
  private currentSession: Session | null = null;

  constructor(emitter: AuthEventEmitter) {
    this.emitter = emitter;
  }

  /**
   * Handle sign in event
   */
  onSignIn(session: Session): void {
    this.currentSession = session;
    this.emitter.emit('SIGNED_IN', 'SIGNED_IN', session);
  }

  /**
   * Handle sign out event
   */
  onSignOut(): void {
    const previousSession = this.currentSession;
    this.currentSession = null;
    this.emitter.emit('SIGNED_OUT', 'SIGNED_OUT', null);

    // Also emit session expired if there was a session
    if (previousSession) {
      this.emitter.emit('SESSION_EXPIRED', 'SESSION_EXPIRED', null);
    }
  }

  /**
   * Handle token refresh event
   */
  onTokenRefresh(session: Session): void {
    this.currentSession = session;
    this.emitter.emit('TOKEN_REFRESHED', 'TOKEN_REFRESHED', session);
  }

  /**
   * Handle user update event
   */
  onUserUpdate(session: Session): void {
    this.currentSession = session;
    this.emitter.emit('USER_UPDATED', 'USER_UPDATED', session);
  }

  /**
   * Handle session expired event
   */
  onSessionExpired(): void {
    this.currentSession = null;
    this.emitter.emit('SESSION_EXPIRED', 'SESSION_EXPIRED', null);
  }

  /**
   * Handle MFA required event
   */
  onMFARequired(): void {
    this.emitter.emit('MFA_REQUIRED', 'MFA_REQUIRED', null);
  }

  /**
   * Handle error event
   */
  onError(error: Error): void {
    this.emitter.emit('error', error);
  }

  /**
   * Get current session
   */
  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  /**
   * Check if user is signed in
   */
  isSignedIn(): boolean {
    return this.currentSession !== null;
  }
}

/**
 * Create auth event system
 */
export function createAuthEvents(debug: boolean = false): {
  emitter: AuthEventEmitter;
  handler: AuthStateHandler;
} {
  const emitter = new AuthEventEmitter(debug);
  const handler = new AuthStateHandler(emitter);

  return { emitter, handler };
}
