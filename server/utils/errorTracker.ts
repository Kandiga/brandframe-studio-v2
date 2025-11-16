import { Request } from 'express';
import { createHash } from 'crypto';

export type ErrorCategory = 
  | 'API' 
  | 'VALIDATION' 
  | 'GENERATION' 
  | 'STORAGE' 
  | 'AUTHENTICATION'
  | 'NETWORK'
  | 'FRONTEND_ERROR'
  | 'UNKNOWN';

export interface ErrorContext {
  category: ErrorCategory;
  code?: string;
  request?: {
    method: string;
    url: string;
    ip: string;
    userAgent?: string;
    headers?: Record<string, string>;
  };
  userActions?: string[];
  state?: Record<string, unknown>;
  stack?: string;
  [key: string]: unknown;
}

/**
 * Categorize error based on error message, code, or type
 */
export function categorizeError(error: Error | unknown, code?: string): ErrorCategory {
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const errorCode = code?.toUpperCase() || '';
  
  // Check error code first
  if (errorCode.includes('VALIDATION') || errorCode.includes('INVALID')) {
    return 'VALIDATION';
  }
  if (errorCode.includes('AUTH') || errorCode.includes('UNAUTHORIZED') || errorCode.includes('FORBIDDEN')) {
    return 'AUTHENTICATION';
  }
  if (errorCode.includes('NETWORK') || errorCode.includes('TIMEOUT') || errorCode.includes('FETCH')) {
    return 'NETWORK';
  }
  
  // Check error message
  if (errorMessage.includes('validation') || errorMessage.includes('invalid') || errorMessage.includes('required')) {
    return 'VALIDATION';
  }
  if (errorMessage.includes('api') || errorMessage.includes('endpoint') || errorMessage.includes('request failed')) {
    return 'API';
  }
  if (errorMessage.includes('generation') || errorMessage.includes('storyboard') || errorMessage.includes('gemini')) {
    return 'GENERATION';
  }
  if (errorMessage.includes('storage') || errorMessage.includes('localstorage') || errorMessage.includes('database')) {
    return 'STORAGE';
  }
  if (errorMessage.includes('auth') || errorMessage.includes('unauthorized') || errorMessage.includes('permission')) {
    return 'AUTHENTICATION';
  }
  if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('fetch') || errorMessage.includes('connection')) {
    return 'NETWORK';
  }
  
  return 'UNKNOWN';
}

/**
 * Build error context from request
 */
export function buildErrorContext(
  error: Error | unknown,
  req?: Request,
  additionalContext?: Record<string, unknown>
): ErrorContext {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  const context: ErrorContext = {
    category: categorizeError(error, additionalContext?.code as string),
    code: additionalContext?.code as string,
    message: errorMessage,
    stack: errorStack,
    ...additionalContext,
  };
  
  if (req) {
    // Sanitize headers (remove sensitive data)
    const sanitizedHeaders: Record<string, string> = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'api-key'];
    
    Object.keys(req.headers).forEach(key => {
      if (!sensitiveHeaders.includes(key.toLowerCase())) {
        sanitizedHeaders[key] = String(req.headers[key] || '');
      } else {
        sanitizedHeaders[key] = '[REDACTED]';
      }
    });
    
    context.request = {
      method: req.method,
      url: req.url,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.get('user-agent'),
      headers: sanitizedHeaders,
    };
  }
  
  return context;
}

/**
 * Create error fingerprint for deduplication
 * Groups similar errors together based on message and stack trace
 */
export function createErrorFingerprint(error: Error | unknown, context?: ErrorContext): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : '';
  const category = context?.category || categorizeError(error);
  
  // Normalize error message (remove dynamic values like IDs, timestamps)
  const normalizedMessage = errorMessage
    .replace(/\d+/g, '[NUMBER]')
    .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '[UUID]')
    .replace(/\/[^\/\s]+/g, '/[PATH]')
    .toLowerCase()
    .trim();
  
  // Get first few lines of stack trace (most relevant)
  const stackLines = errorStack
    .split('\n')
    .slice(0, 3)
    .join('\n')
    .replace(/\d+/g, '[NUMBER]')
    .toLowerCase();
  
  // Create fingerprint from category, normalized message, and stack
  const fingerprintData = `${category}:${normalizedMessage}:${stackLines}`;
  
  return createHash('sha256').update(fingerprintData).digest('hex').substring(0, 16);
}

/**
 * Parse and format stack trace
 */
export function formatStackTrace(stack?: string): string[] {
  if (!stack) return [];
  
  return stack
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('Error:'));
}

/**
 * Extract key information from error
 */
export function extractErrorInfo(error: Error | unknown): {
  message: string;
  name: string;
  stack?: string;
  code?: string;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
      code: (error as { code?: string }).code,
    };
  }
  
  return {
    message: String(error),
    name: 'UnknownError',
  };
}

/**
 * Sanitize error context for logging (remove sensitive data)
 */
export function sanitizeErrorContext(context: ErrorContext): ErrorContext {
  const sanitized = { ...context };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
  
  if (sanitized.state) {
    const sanitizedState: Record<string, unknown> = {};
    Object.keys(sanitized.state).forEach(key => {
      if (!sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitizedState[key] = sanitized.state![key];
      } else {
        sanitizedState[key] = '[REDACTED]';
      }
    });
    sanitized.state = sanitizedState;
  }
  
  return sanitized;
}

