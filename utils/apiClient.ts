import { API_CONFIG } from '../constants/index.js';
import { createErrorMessage } from './errorHandler.js';
import { logApiRequest, logApiResponse, logApiError } from './apiLogger.js';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  statusCode?: number;
}

/**
 * API Client for making HTTP requests
 */
class ApiClient {
  private baseURL: string;
  private timeout: number;

  constructor(baseURL: string = API_CONFIG.BASE_URL, timeout: number = API_CONFIG.TIMEOUT) {
    this.baseURL = baseURL;
    this.timeout = timeout;
  }

  /**
   * Makes a fetch request with timeout and error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    const url = `${this.baseURL}${endpoint}`;
    const method = options.method || 'GET';
    const startTime = performance.now();

    // Parse body for logging
    let body: unknown = undefined;
    if (options.body) {
      try {
        body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
      } catch {
        body = options.body;
      }
    }

    // Log request
    logApiRequest(method, url, body);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);
      const duration = performance.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Log error response
        logApiResponse(method, url, response.status, duration, errorData);
        
        return {
          success: false,
          error: errorData.error || `Request failed: ${response.statusText}`,
          code: errorData.code,
          statusCode: response.status,
        };
      }

      const data = await response.json();
      
      // Log success response
      logApiResponse(method, url, response.status, duration);
      
      return {
        success: data.success !== false,
        data: data.data || data,
        error: data.error,
        code: data.code,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      const duration = performance.now() - startTime;
      
      // Log error
      logApiError(method, url, error, duration);
      
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout. Please try again.',
        };
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          success: false,
          error: `Cannot connect to server at ${this.baseURL}. Please make sure the backend server is running.`,
        };
      }

      return {
        success: false,
        error: createErrorMessage(error),
      };
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class for custom instances
export { ApiClient };

