import { Request, Response, NextFunction } from 'express';
import { trackOperation } from '../utils/performanceMonitor.js';
import { logger } from '../utils/logger.js';

/**
 * Wraps async route handlers to automatically catch errors
 * and pass them to the error handling middleware
 * Also tracks request timing and logs request metadata
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const operation = `${req.method} ${req.path}`;
    
    // Log request start (debug level)
    logger.debug('Request handler started', {
      category: 'API',
      method: req.method,
      path: req.path,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
    });
    
    // Track operation timing
    const result = trackOperation(
      operation,
      () => Promise.resolve(fn(req, res, next)),
      {
        method: req.method,
        path: req.path,
        ip: req.ip || req.socket.remoteAddress || 'unknown',
      }
    );
    
    // Handle promise result
    Promise.resolve(result)
      .then(() => {
        const duration = Date.now() - startTime;
        logger.debug('Request handler completed', {
          category: 'API',
          method: req.method,
          path: req.path,
          duration: `${duration}ms`,
        });
      })
      .catch((error) => {
        const duration = Date.now() - startTime;
        logger.error('Request handler failed', {
          category: 'API',
          method: req.method,
          path: req.path,
          duration: `${duration}ms`,
          error: error instanceof Error ? error.message : String(error),
        });
        next(error);
      });
  };
};

