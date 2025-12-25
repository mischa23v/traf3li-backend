/**
 * Traf3li Auth SDK - Storage Adapters
 *
 * Flexible storage abstraction for tokens and session data
 * Supports localStorage, sessionStorage, cookies, memory, and custom adapters
 */

import type { StorageAdapter, TokenStorage } from './types';
import { StorageError } from './errors';
import { isBrowser, isLocalStorageAvailable, isSessionStorageAvailable, areCookiesAvailable, safeJSONParse, safeJSONStringify } from './utils';

/**
 * Storage key constants
 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  EXPIRES_AT: 'expires_at',
  SESSION: 'session',
} as const;

/**
 * Abstract base storage class
 */
export abstract class BaseStorage implements StorageAdapter {
  constructor(protected keyPrefix: string = 'traf3li_') {}

  protected getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  abstract getItem(key: string): Promise<string | null> | string | null;
  abstract setItem(key: string, value: string): Promise<void> | void;
  abstract removeItem(key: string): Promise<void> | void;
  abstract clear?(): Promise<void> | void;

  /**
   * Get token storage
   */
  async getTokenStorage(): Promise<TokenStorage | null> {
    try {
      const accessToken = await this.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const refreshToken = await this.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      const expiresAt = await this.getItem(STORAGE_KEYS.EXPIRES_AT);
      const userStr = await this.getItem(STORAGE_KEYS.USER);

      if (!accessToken || !refreshToken || !userStr) {
        return null;
      }

      const user = safeJSONParse(userStr, null);
      if (!user) return null;

      return {
        accessToken,
        refreshToken,
        expiresAt: expiresAt || '',
        user,
      };
    } catch (error) {
      throw new StorageError('Failed to get token storage', error);
    }
  }

  /**
   * Set token storage
   */
  async setTokenStorage(storage: TokenStorage): Promise<void> {
    try {
      await this.setItem(STORAGE_KEYS.ACCESS_TOKEN, storage.accessToken);
      await this.setItem(STORAGE_KEYS.REFRESH_TOKEN, storage.refreshToken);
      await this.setItem(STORAGE_KEYS.EXPIRES_AT, storage.expiresAt);
      await this.setItem(STORAGE_KEYS.USER, safeJSONStringify(storage.user));
    } catch (error) {
      throw new StorageError('Failed to set token storage', error);
    }
  }

  /**
   * Clear token storage
   */
  async clearTokenStorage(): Promise<void> {
    try {
      await this.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      await this.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      await this.removeItem(STORAGE_KEYS.EXPIRES_AT);
      await this.removeItem(STORAGE_KEYS.USER);
      await this.removeItem(STORAGE_KEYS.SESSION);
    } catch (error) {
      throw new StorageError('Failed to clear token storage', error);
    }
  }
}

/**
 * LocalStorage adapter
 */
export class LocalStorageAdapter extends BaseStorage {
  private available: boolean;

  constructor(keyPrefix?: string) {
    super(keyPrefix);
    this.available = isLocalStorageAvailable();
  }

  getItem(key: string): string | null {
    if (!this.available) return null;

    try {
      return localStorage.getItem(this.getKey(key));
    } catch (error) {
      throw new StorageError(`Failed to get item from localStorage: ${key}`, error);
    }
  }

  setItem(key: string, value: string): void {
    if (!this.available) {
      throw new StorageError('localStorage is not available');
    }

    try {
      localStorage.setItem(this.getKey(key), value);
    } catch (error) {
      // Handle QuotaExceededError
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new StorageError('localStorage quota exceeded', error);
      }
      throw new StorageError(`Failed to set item in localStorage: ${key}`, error);
    }
  }

  removeItem(key: string): void {
    if (!this.available) return;

    try {
      localStorage.removeItem(this.getKey(key));
    } catch (error) {
      throw new StorageError(`Failed to remove item from localStorage: ${key}`, error);
    }
  }

  clear(): void {
    if (!this.available) return;

    try {
      // Only clear items with our prefix
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(this.keyPrefix)) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      throw new StorageError('Failed to clear localStorage', error);
    }
  }
}

/**
 * SessionStorage adapter
 */
export class SessionStorageAdapter extends BaseStorage {
  private available: boolean;

  constructor(keyPrefix?: string) {
    super(keyPrefix);
    this.available = isSessionStorageAvailable();
  }

  getItem(key: string): string | null {
    if (!this.available) return null;

    try {
      return sessionStorage.getItem(this.getKey(key));
    } catch (error) {
      throw new StorageError(`Failed to get item from sessionStorage: ${key}`, error);
    }
  }

  setItem(key: string, value: string): void {
    if (!this.available) {
      throw new StorageError('sessionStorage is not available');
    }

    try {
      sessionStorage.setItem(this.getKey(key), value);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new StorageError('sessionStorage quota exceeded', error);
      }
      throw new StorageError(`Failed to set item in sessionStorage: ${key}`, error);
    }
  }

  removeItem(key: string): void {
    if (!this.available) return;

    try {
      sessionStorage.removeItem(this.getKey(key));
    } catch (error) {
      throw new StorageError(`Failed to remove item from sessionStorage: ${key}`, error);
    }
  }

  clear(): void {
    if (!this.available) return;

    try {
      const keys = Object.keys(sessionStorage);
      for (const key of keys) {
        if (key.startsWith(this.keyPrefix)) {
          sessionStorage.removeItem(key);
        }
      }
    } catch (error) {
      throw new StorageError('Failed to clear sessionStorage', error);
    }
  }
}

/**
 * Cookie adapter
 */
export class CookieAdapter extends BaseStorage {
  private available: boolean;

  constructor(keyPrefix?: string) {
    super(keyPrefix);
    this.available = areCookiesAvailable();
  }

  getItem(key: string): string | null {
    if (!this.available || !isBrowser()) return null;

    try {
      const name = this.getKey(key) + '=';
      const decodedCookie = decodeURIComponent(document.cookie);
      const cookies = decodedCookie.split(';');

      for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.indexOf(name) === 0) {
          return cookie.substring(name.length);
        }
      }

      return null;
    } catch (error) {
      throw new StorageError(`Failed to get cookie: ${key}`, error);
    }
  }

  setItem(key: string, value: string): void {
    if (!this.available || !isBrowser()) {
      throw new StorageError('Cookies are not available');
    }

    try {
      // Set cookie with secure flags
      const secure = window.location.protocol === 'https:';
      const sameSite = 'Lax';
      const maxAge = 7 * 24 * 60 * 60; // 7 days

      let cookie = `${this.getKey(key)}=${encodeURIComponent(value)}`;
      cookie += `; max-age=${maxAge}`;
      cookie += `; path=/`;
      cookie += `; SameSite=${sameSite}`;

      if (secure) {
        cookie += `; Secure`;
      }

      document.cookie = cookie;
    } catch (error) {
      throw new StorageError(`Failed to set cookie: ${key}`, error);
    }
  }

  removeItem(key: string): void {
    if (!this.available || !isBrowser()) return;

    try {
      document.cookie = `${this.getKey(key)}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    } catch (error) {
      throw new StorageError(`Failed to remove cookie: ${key}`, error);
    }
  }

  clear(): void {
    if (!this.available || !isBrowser()) return;

    try {
      const cookies = document.cookie.split(';');

      for (let cookie of cookies) {
        cookie = cookie.trim();
        const name = cookie.split('=')[0];

        if (name.startsWith(this.keyPrefix)) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      }
    } catch (error) {
      throw new StorageError('Failed to clear cookies', error);
    }
  }
}

/**
 * Memory adapter (for SSR/Node.js or when storage is not available)
 */
export class MemoryAdapter extends BaseStorage {
  private storage: Map<string, string>;

  constructor(keyPrefix?: string) {
    super(keyPrefix);
    this.storage = new Map();
  }

  getItem(key: string): string | null {
    return this.storage.get(this.getKey(key)) || null;
  }

  setItem(key: string, value: string): void {
    this.storage.set(this.getKey(key), value);
  }

  removeItem(key: string): void {
    this.storage.delete(this.getKey(key));
  }

  clear(): void {
    // Only clear items with our prefix
    const keys = Array.from(this.storage.keys());
    for (const key of keys) {
      if (key.startsWith(this.keyPrefix)) {
        this.storage.delete(key);
      }
    }
  }

  /**
   * Get all stored data (useful for debugging)
   */
  getAll(): Record<string, string> {
    const result: Record<string, string> = {};

    this.storage.forEach((value, key) => {
      if (key.startsWith(this.keyPrefix)) {
        result[key] = value;
      }
    });

    return result;
  }
}

/**
 * Custom adapter wrapper
 */
export class CustomAdapter extends BaseStorage {
  constructor(
    private adapter: StorageAdapter,
    keyPrefix?: string
  ) {
    super(keyPrefix);
  }

  async getItem(key: string): Promise<string | null> {
    try {
      return await this.adapter.getItem(this.getKey(key));
    } catch (error) {
      throw new StorageError(`Failed to get item from custom adapter: ${key}`, error);
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await this.adapter.setItem(this.getKey(key), value);
    } catch (error) {
      throw new StorageError(`Failed to set item in custom adapter: ${key}`, error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await this.adapter.removeItem(this.getKey(key));
    } catch (error) {
      throw new StorageError(`Failed to remove item from custom adapter: ${key}`, error);
    }
  }

  async clear(): Promise<void> {
    if (this.adapter.clear) {
      try {
        await this.adapter.clear();
      } catch (error) {
        throw new StorageError('Failed to clear custom adapter', error);
      }
    }
  }
}

/**
 * Storage factory
 */
export class StorageFactory {
  /**
   * Create storage adapter based on type
   */
  static create(
    type: 'localStorage' | 'sessionStorage' | 'cookie' | 'memory' | 'custom',
    options: {
      keyPrefix?: string;
      customAdapter?: StorageAdapter;
    } = {}
  ): BaseStorage {
    const { keyPrefix = 'traf3li_', customAdapter } = options;

    switch (type) {
      case 'localStorage':
        return new LocalStorageAdapter(keyPrefix);

      case 'sessionStorage':
        return new SessionStorageAdapter(keyPrefix);

      case 'cookie':
        return new CookieAdapter(keyPrefix);

      case 'memory':
        return new MemoryAdapter(keyPrefix);

      case 'custom':
        if (!customAdapter) {
          throw new StorageError('Custom adapter is required when using custom storage type');
        }
        return new CustomAdapter(customAdapter, keyPrefix);

      default:
        throw new StorageError(`Unknown storage type: ${type}`);
    }
  }

  /**
   * Auto-detect best available storage
   */
  static autoDetect(keyPrefix?: string): BaseStorage {
    if (isLocalStorageAvailable()) {
      return new LocalStorageAdapter(keyPrefix);
    } else if (isSessionStorageAvailable()) {
      return new SessionStorageAdapter(keyPrefix);
    } else if (areCookiesAvailable()) {
      return new CookieAdapter(keyPrefix);
    } else {
      // Fallback to memory storage
      return new MemoryAdapter(keyPrefix);
    }
  }
}
