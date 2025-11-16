/**
 * API Call Logger Utility
 * Intercepts and logs all API calls with timing and error tracking
 */

import { logInfo, logError, logWarn, logDebug, time, timeEnd } from './logger.js';

export interface ApiCallLog {
  method: string;
  url: string;
  status?: number;
  duration: number;
  success: boolean;
  error?: string;
  timestamp: string;
}

const SLOW_REQUEST_THRESHOLD = 3000; // 3 seconds

/**
 * Sanitize request body to remove sensitive data
 */
function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization', 'apikey'];
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(body)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeBody(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Log API request
 */
export function logApiRequest(
  method: string,
  url: string,
  body?: unknown
): void {
  const sanitizedBody = body ? sanitizeBody(body) : undefined;
  
  logDebug('API request', {
    category: 'API',
    method,
    url,
    body: sanitizedBody,
  });
  
  // Start timing
  time(`api-${method}-${url}`);
}

/**
 * Log API response
 */
export function logApiResponse(
  method: string,
  url: string,
  status: number,
  duration: number,
  response?: unknown
): void {
  const logContext = {
    category: 'API',
    method,
    url,
    status,
    duration: `${duration}ms`,
  };
  
  // End timing
  timeEnd(`api-${method}-${url}`, logContext);
  
  if (status >= 500) {
    logError('API request failed with server error', new Error(`Status: ${status}`), logContext);
  } else if (status >= 400) {
    logWarn('API request failed with client error', {
      ...logContext,
      response,
    });
  } else if (duration > SLOW_REQUEST_THRESHOLD) {
    logWarn('Slow API request detected', {
      ...logContext,
      threshold: `${SLOW_REQUEST_THRESHOLD}ms`,
    });
  } else {
    logInfo('API request completed', logContext);
  }
}

/**
 * Log API error
 */
export function logApiError(
  method: string,
  url: string,
  error: Error | unknown,
  duration?: number
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  // End timing if started
  if (duration !== undefined) {
    timeEnd(`api-${method}-${url}`, {
      category: 'API',
      method,
      url,
      duration: `${duration}ms`,
    });
  }
  
  logError('API request failed', error instanceof Error ? error : new Error(errorMessage), {
    category: 'API',
    method,
    url,
    error: errorMessage,
    stack: errorStack,
    duration: duration ? `${duration}ms` : undefined,
  });
}

/**
 * Wrap fetch to automatically log API calls
 */
export function createLoggedFetch(originalFetch: typeof fetch): typeof fetch {
  return async function loggedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method || 'GET';
    const body = init?.body ? (typeof init.body === 'string' ? JSON.parse(init.body) : init.body) : undefined;
    
    const startTime = performance.now();
    
    // Log request
    logApiRequest(method, url, body);
    
    try {
      const response = await originalFetch(input, init);
      const duration = performance.now() - startTime;
      
      // Clone response to read body without consuming it
      const clonedResponse = response.clone();
      let responseData: unknown = undefined;
      
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          responseData = await clonedResponse.json();
        } else {
          responseData = await clonedResponse.text();
        }
      } catch {
        // Ignore errors reading response body
      }
      
      // Log response
      logApiResponse(method, url, response.status, duration, responseData);
      
      return response;
    } catch (error) {
      const duration = performance.now() - startTime;
      logApiError(method, url, error, duration);
      throw error;
    }
  };
}

/**
 * Track retry attempts
 */
export function logApiRetry(
  method: string,
  url: string,
  attempt: number,
  maxRetries: number,
  error?: Error | unknown
): void {
  logWarn('API request retry', {
    category: 'API',
    method,
    url,
    attempt,
    maxRetries,
    error: error instanceof Error ? error.message : String(error),
  });
}

