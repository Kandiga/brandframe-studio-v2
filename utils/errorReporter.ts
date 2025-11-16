/**
 * Error Reporter Utility
 * Captures React errors and sends them to backend with full context
 */

import { logError, logWarn } from './logger.js';

export interface ErrorReport {
  error: {
    message: string;
    stack?: string;
    name: string;
  };
  componentStack?: string;
  context?: {
    component?: string;
    props?: Record<string, unknown>;
    state?: Record<string, unknown>;
    userActions?: string[];
    url?: string;
    userAgent?: string;
    viewport?: {
      width: number;
      height: number;
    };
  };
  timestamp: string;
  userAgent: string;
  url: string;
}

// Store errors locally for offline debugging
const ERROR_STORAGE_KEY = 'brandframe_error_reports';
const MAX_STORED_ERRORS = 50;
const MAX_ERROR_REPORTS_PER_HOUR = 10;

// Track error reports to prevent spam
const errorReportTimestamps: number[] = [];

/**
 * Sanitize error context (remove sensitive data)
 */
function sanitizeContext(context: ErrorReport['context']): ErrorReport['context'] {
  if (!context) return context;
  
  const sanitized = { ...context };
  
  // Remove sensitive fields from props/state
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
  
  if (sanitized.props) {
    const sanitizedProps: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(sanitized.props)) {
      if (!sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitizedProps[key] = value;
      } else {
        sanitizedProps[key] = '[REDACTED]';
      }
    }
    sanitized.props = sanitizedProps;
  }
  
  if (sanitized.state) {
    const sanitizedState: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(sanitized.state)) {
      if (!sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitizedState[key] = value;
      } else {
        sanitizedState[key] = '[REDACTED]';
      }
    }
    sanitized.state = sanitizedState;
  }
  
  return sanitized;
}

/**
 * Store error locally (for offline debugging)
 */
function storeErrorLocally(errorReport: ErrorReport): void {
  try {
    const stored = localStorage.getItem(ERROR_STORAGE_KEY);
    const errors: ErrorReport[] = stored ? JSON.parse(stored) : [];
    
    errors.push(errorReport);
    
    // Keep only last MAX_STORED_ERRORS errors
    if (errors.length > MAX_STORED_ERRORS) {
      errors.shift();
    }
    
    localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(errors));
  } catch (error) {
    logWarn('Failed to store error locally', {
      category: 'ERROR',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Check if we should report this error (rate limiting)
 */
function shouldReportError(): boolean {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  
  // Remove old timestamps
  const recentTimestamps = errorReportTimestamps.filter(ts => ts > oneHourAgo);
  errorReportTimestamps.length = 0;
  errorReportTimestamps.push(...recentTimestamps);
  
  // Check if we've exceeded the limit
  if (errorReportTimestamps.length >= MAX_ERROR_REPORTS_PER_HOUR) {
    return false;
  }
  
  errorReportTimestamps.push(now);
  return true;
}

/**
 * Send error report to backend
 */
async function sendErrorReport(errorReport: ErrorReport): Promise<void> {
  if (!shouldReportError()) {
    logWarn('Error report rate limit exceeded, skipping', {
      category: 'ERROR',
    });
    return;
  }
  
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';
    const response = await fetch(`${API_BASE_URL}/api/logs/error`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorReport),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to report error: ${response.status} ${response.statusText}`);
    }
    
    logInfo('Error reported to backend successfully', {
      category: 'ERROR',
    });
  } catch (error) {
    logWarn('Failed to send error report to backend', {
      category: 'ERROR',
      error: error instanceof Error ? error.message : String(error),
    });
    // Store locally for later retry
    storeErrorLocally(errorReport);
  }
}

/**
 * Capture React error with full context
 */
export function captureError(
  error: Error,
  errorInfo?: {
    componentStack?: string;
    component?: string;
    props?: Record<string, unknown>;
    state?: Record<string, unknown>;
    userActions?: string[];
  }
): void {
  // Log error locally first
  logError('React error captured', error, {
    category: 'ERROR',
    component: errorInfo?.component,
    componentStack: errorInfo?.componentStack,
  });
  
  // Build error report
  const errorReport: ErrorReport = {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    componentStack: errorInfo?.componentStack,
    context: sanitizeContext({
      component: errorInfo?.component,
      props: errorInfo?.props,
      state: errorInfo?.state,
      userActions: errorInfo?.userActions,
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    }),
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
  };
  
  // Store locally
  storeErrorLocally(errorReport);
  
  // Send to backend (async, don't block)
  sendErrorReport(errorReport).catch(() => {
    // Already logged in sendErrorReport
  });
}

/**
 * Get stored errors (for debugging)
 */
export function getStoredErrors(): ErrorReport[] {
  try {
    const stored = localStorage.getItem(ERROR_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Clear stored errors
 */
export function clearStoredErrors(): void {
  try {
    localStorage.removeItem(ERROR_STORAGE_KEY);
  } catch (error) {
    logWarn('Failed to clear stored errors', {
      category: 'ERROR',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Capture browser console errors
 */
export function setupGlobalErrorHandlers(): void {
  // Capture unhandled errors
  window.addEventListener('error', (event) => {
    captureError(event.error || new Error(event.message), {
      componentStack: event.filename ? `at ${event.filename}:${event.lineno}:${event.colno}` : undefined,
    });
  });
  
  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    captureError(error);
  });
}

