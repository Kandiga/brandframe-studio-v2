import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine log level based on environment
const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// Custom format for console (human-readable)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    // Add context if present
    if (Object.keys(meta).length > 0) {
      const context = JSON.stringify(meta, null, 2);
      log += `\n${context}`;
    }
    
    return log;
  })
);

// Custom format for file (structured JSON)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Daily rotate file transport for combined logs
const combinedFileTransport = new DailyRotateFile({
  filename: join(__dirname, '../logs/combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  format: fileFormat,
  level: logLevel,
});

// Daily rotate file transport for error logs only
const errorFileTransport = new DailyRotateFile({
  filename: join(__dirname, '../logs/error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  format: fileFormat,
  level: 'error',
});

// Console transport
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
  level: logLevel,
});

// Create logger instance
export const logger = winston.createLogger({
  level: logLevel,
  format: fileFormat,
  defaultMeta: {
    service: 'brandframe-studio-server',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    consoleTransport,
    combinedFileTransport,
    errorFileTransport,
  ],
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Helper function to create log entry with context
export interface LogContext {
  category?: string;
  [key: string]: unknown;
}

export function logWithContext(
  level: 'error' | 'warn' | 'info' | 'debug' | 'verbose',
  message: string,
  context?: LogContext
): void {
  logger.log(level, message, context || {});
}

// Helper functions for common log operations
export const logError = (message: string, error?: Error | unknown, context?: LogContext): void => {
  const logContext: LogContext = {
    ...context,
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name,
    } : String(error),
  };
  logger.error(message, logContext);
};

export const logWarn = (message: string, context?: LogContext): void => {
  logger.warn(message, context || {});
};

export const logInfo = (message: string, context?: LogContext): void => {
  logger.info(message, context || {});
};

export const logDebug = (message: string, context?: LogContext): void => {
  logger.debug(message, context || {});
};

export const logVerbose = (message: string, context?: LogContext): void => {
  logger.verbose(message, context || {});
};

// Export default logger instance
export default logger;

