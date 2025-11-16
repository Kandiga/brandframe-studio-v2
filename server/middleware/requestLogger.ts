import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { trackOperation, isSlowOperation } from '../utils/performanceMonitor.js';

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
 * Get request size in bytes
 */
function getRequestSize(req: Request): number {
  if (req.headers['content-length']) {
    return parseInt(req.headers['content-length'], 10);
  }
  if (req.body) {
    try {
      return JSON.stringify(req.body).length;
    } catch {
      return 0;
    }
  }
  return 0;
}

/**
 * Get response size in bytes (approximate)
 */
function getResponseSize(res: Response): number {
  const contentLength = res.get('content-length');
  if (contentLength) {
    return parseInt(contentLength, 10);
  }
  return 0;
}

/**
 * Request logging middleware
 * Logs all incoming requests with method, URL, IP, duration, and status
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  // Skip health check endpoint in production
  if (process.env.NODE_ENV === 'production' && req.path === '/api/health') {
    return next();
  }
  
  // Log request start
  const requestInfo = {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.get('user-agent'),
    requestSize: getRequestSize(req),
  };
  
  logger.debug('Request started', {
    category: 'API',
    ...requestInfo,
  });
  
  // Track request duration
  const originalSend = res.send.bind(res);
  res.send = function (body: unknown) {
    const duration = Date.now() - startTime;
    const responseSize = getResponseSize(res);
    
    const logData = {
      category: 'API',
      requestId,
      method: req.method,
      url: req.url,
      ip: requestInfo.ip,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      durationMs: duration,
      requestSize: requestInfo.requestSize > 0 ? `${(requestInfo.requestSize / 1024).toFixed(2)}KB` : undefined,
      responseSize: responseSize > 0 ? `${(responseSize / 1024).toFixed(2)}KB` : undefined,
    };
    
    // Add request body for POST/PUT/PATCH (sanitized)
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      const sanitizedBody = sanitizeBody(req.body);
      // Only log body structure, not full content for large requests
      if (requestInfo.requestSize < 10240) { // Less than 10KB
        logData.body = sanitizedBody;
      } else {
        logData.bodySize = `${(requestInfo.requestSize / 1024).toFixed(2)}KB`;
        logData.bodyPreview = JSON.stringify(sanitizedBody).substring(0, 200);
      }
    }
    
    // Determine log level based on status code
    if (res.statusCode >= 500) {
      logger.error('Request completed with server error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request completed with client error', logData);
    } else if (isSlowOperation(duration, 'request')) {
      logger.warn('Slow request detected', logData);
    } else {
      logger.info('Request completed', logData);
    }
    
    return originalSend(body);
  };
  
  // Handle errors
  res.on('finish', () => {
    // Already handled in res.send override
  });
  
  next();
};

