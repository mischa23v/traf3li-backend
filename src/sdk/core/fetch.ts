/**
 * Traf3li Auth SDK - HTTP Client
 *
 * Enhanced fetch wrapper with:
 * - Automatic token injection
 * - Automatic token refresh on 401
 * - Request/response interceptors
 * - Retry logic with exponential backoff
 * - Timeout handling
 * - CSRF protection
 */

import type { RequestOptions } from './types';
import type { BaseStorage } from './storage';
import { STORAGE_KEYS } from './storage';
import {
  NetworkError,
  TimeoutError,
  TrafAuthError,
  parseErrorResponse,
} from './errors';
import {
  createTimeoutController,
  retry,
  log,
  logError,
  safeJSONParse,
} from './utils';

/**
 * HTTP client configuration
 */
export interface HTTPClientConfig {
  baseURL: string;
  storage: BaseStorage;
  timeout?: number;
  debug?: boolean;
  retry?: boolean;
  maxRetries?: number;
  headers?: Record<string, string>;
  csrfProtection?: boolean;
  onTokenRefresh?: () => Promise<{ accessToken: string; refreshToken: string }>;
  onUnauthorized?: () => void;
}

/**
 * Request interceptor
 */
export type RequestInterceptor = (
  url: string,
  options: RequestOptions
) => Promise<{ url: string; options: RequestOptions }> | { url: string; options: RequestOptions };

/**
 * Response interceptor
 */
export type ResponseInterceptor = (response: Response) => Promise<Response> | Response;

/**
 * HTTP Client
 */
export class HTTPClient {
  private config: Required<HTTPClientConfig>;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];
  private csrfToken: string | null = null;

  constructor(config: HTTPClientConfig) {
    this.config = {
      timeout: 30000,
      debug: false,
      retry: true,
      maxRetries: 3,
      headers: {},
      csrfProtection: true,
      onTokenRefresh: async () => {
        throw new Error('onTokenRefresh handler not implemented');
      },
      onUnauthorized: () => {
        // Default: do nothing
      },
      ...config,
    };
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);

    // Return function to remove interceptor
    return () => {
      const index = this.requestInterceptors.indexOf(interceptor);
      if (index !== -1) {
        this.requestInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);

    return () => {
      const index = this.responseInterceptors.indexOf(interceptor);
      if (index !== -1) {
        this.responseInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * Set CSRF token
   */
  setCSRFToken(token: string | null): void {
    this.csrfToken = token;
  }

  /**
   * Get CSRF token
   */
  getCSRFToken(): string | null {
    return this.csrfToken;
  }

  /**
   * Make HTTP request
   */
  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      skipAuth = false,
      skipRefresh = false,
      timeout = this.config.timeout,
      signal,
    } = options;

    // Build full URL
    let url = endpoint.startsWith('http')
      ? endpoint
      : `${this.config.baseURL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    // Build request options
    let requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
        ...headers,
      },
      credentials: 'include', // Include cookies for cross-origin requests
      signal,
    };

    // Add body for non-GET requests
    if (body && method !== 'GET') {
      requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    // Add authorization header
    if (!skipAuth) {
      const accessToken = await this.config.storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (accessToken) {
        (requestOptions.headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
      }
    }

    // Add CSRF token for mutation requests
    if (
      this.config.csrfProtection &&
      this.csrfToken &&
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
    ) {
      (requestOptions.headers as Record<string, string>)['X-CSRF-Token'] = this.csrfToken;
    }

    // Run request interceptors
    for (const interceptor of this.requestInterceptors) {
      const result = await interceptor(url, { ...options, headers: requestOptions.headers as Record<string, string> });
      url = result.url;
      requestOptions.headers = result.options.headers as HeadersInit;
    }

    log(`Making ${method} request to ${url}`, { body }, this.config.debug);

    // Make request with retry logic
    const makeRequest = async (): Promise<Response> => {
      // Create timeout controller if timeout is specified
      let timeoutController: { controller: AbortController; timeoutId: NodeJS.Timeout } | null = null;

      if (timeout && !signal) {
        timeoutController = createTimeoutController(timeout);
        requestOptions.signal = timeoutController.controller.signal;
      }

      try {
        const response = await fetch(url, requestOptions);

        // Clear timeout
        if (timeoutController) {
          clearTimeout(timeoutController.timeoutId);
        }

        return response;
      } catch (error: any) {
        // Clear timeout
        if (timeoutController) {
          clearTimeout(timeoutController.timeoutId);
        }

        // Handle abort/timeout
        if (error.name === 'AbortError') {
          throw new TimeoutError('Request timeout');
        }

        throw new NetworkError('Network request failed', error);
      }
    };

    // Execute request with retry logic
    let response: Response;

    if (this.config.retry && !signal) {
      response = await retry(makeRequest, {
        maxAttempts: this.config.maxRetries,
        delay: 1000,
        backoff: 2,
        onRetry: (error, attempt) => {
          log(`Retrying request (attempt ${attempt})`, { error: error.message }, this.config.debug);
        },
      });
    } else {
      response = await makeRequest();
    }

    // Run response interceptors
    for (const interceptor of this.responseInterceptors) {
      response = await interceptor(response);
    }

    // Handle 401 - Unauthorized (try to refresh token)
    if (response.status === 401 && !skipAuth && !skipRefresh) {
      log('Received 401, attempting token refresh', undefined, this.config.debug);

      try {
        await this.refreshAccessToken();

        // Retry original request with new token
        return this.request<T>(endpoint, { ...options, skipRefresh: true });
      } catch (error) {
        // Token refresh failed, call onUnauthorized handler
        this.config.onUnauthorized();
        throw error;
      }
    }

    // Parse response
    return this.parseResponse<T>(response);
  }

  /**
   * Parse response
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    const isJSON = contentType?.includes('application/json');

    // Get response body
    let data: any;

    if (isJSON) {
      const text = await response.text();
      data = text ? safeJSONParse(text, {}) : {};
    } else {
      data = await response.text();
    }

    // Handle error responses
    if (!response.ok) {
      logError(`Request failed with status ${response.status}`, data);

      const error = parseErrorResponse({
        ...data,
        statusCode: response.status,
      });

      throw error;
    }

    log(`Request successful`, data, this.config.debug);

    return data as T;
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(): Promise<void> {
    // If already refreshing, wait for it to complete
    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.refreshSubscribers.push((token: string) => {
          resolve();
        });
      });
    }

    this.isRefreshing = true;

    try {
      log('Refreshing access token', undefined, this.config.debug);

      const result = await this.config.onTokenRefresh();

      // Update tokens in storage
      await this.config.storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, result.accessToken);
      await this.config.storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, result.refreshToken);

      // Notify subscribers
      this.refreshSubscribers.forEach((callback) => callback(result.accessToken));
      this.refreshSubscribers = [];

      log('Access token refreshed successfully', undefined, this.config.debug);
    } catch (error) {
      logError('Failed to refresh access token', error);

      // Clear subscribers
      this.refreshSubscribers = [];

      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

/**
 * Create HTTP client
 */
export function createHTTPClient(config: HTTPClientConfig): HTTPClient {
  return new HTTPClient(config);
}
