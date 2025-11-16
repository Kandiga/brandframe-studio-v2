import { Request, Response, NextFunction } from 'express';
import { logger, logError } from '../utils/logger.js';
import { buildErrorContext, sanitizeErrorContext, createErrorFingerprint } from '../utils/errorTracker.js';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Custom error class for application errors
 */
export class ApplicationError extends Error implements AppError {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.name = 'ApplicationError';
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Sanitize request body to remove sensitive data
 */
function sanitizeRequestBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization', 'apikey'];
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(body)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeRequestBody(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Centralized error handling middleware
 * Should be used as the last middleware in the Express app
 */
export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Determine status code
  const statusCode = 'statusCode' in err && err.statusCode ? err.statusCode : 500;
  const errorCode = 'code' in err ? err.code : undefined;

  // Build error context with full request details
  const errorContext = buildErrorContext(err, req, {
    code: errorCode,
    statusCode,
    body: req.body ? sanitizeRequestBody(req.body) : undefined,
    query: req.query,
    params: req.params,
  });

  // Sanitize context before logging
  const sanitizedContext = sanitizeErrorContext(errorContext);

  // Create error fingerprint for deduplication
  const fingerprint = createErrorFingerprint(err, errorContext);

  // Log error with full context
  logError(
    `Error ${statusCode}: ${err.message}`,
    err,
    {
      category: sanitizedContext.category,
      code: errorCode,
      fingerprint,
      ...sanitizedContext,
    }
  );

  // Determine error message
  let message = err.message || 'Internal server error';
  
  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal server error';
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: message,
    code: errorCode,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
    }),
  });
};

/**
 * 404 Not Found handler
 * Should be placed before the error handler middleware
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new ApplicationError(
    `Route ${req.method} ${req.path} not found`,
    404,
    'NOT_FOUND'
  );
  next(error);
};

