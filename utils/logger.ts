/**
 * Frontend Logger Utility
 * Provides structured console logging with consistent format, levels, and context
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogContext {
  category?: string;
  component?: string;
  action?: string;
  [key: string]: unknown;
}

// Determine log level based on environment
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
const logLevel: LogLevel = isDevelopment ? 'debug' : 'info';

// Log level hierarchy
const logLevels: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

/**
 * Check if a log level should be logged
 */
function shouldLog(level: LogLevel): boolean {
  return logLevels[level] <= logLevels[logLevel];
}

/**
 * Format timestamp for logs
 */
function formatTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Format log message with context
 */
function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = formatTimestamp();
  const levelUpper = level.toUpperCase().padEnd(5);
  const category = context?.category ? `[${context.category}]` : '';
  const component = context?.component ? `(${context.component})` : '';
  
  return `${timestamp} ${levelUpper} ${category} ${component} ${message}`;
}

/**
 * Get console method for log level
 */
function getConsoleMethod(level: LogLevel): typeof console.log {
  switch (level) {
    case 'error':
      return console.error.bind(console);
    case 'warn':
      return console.warn.bind(console);
    case 'info':
      return console.info.bind(console);
    case 'debug':
      return console.debug.bind(console);
    default:
      return console.log.bind(console);
  }
}

/**
 * Get color for log level (for development)
 */
function getLogColor(level: LogLevel): string {
  if (!isDevelopment) return '';
  
  switch (level) {
    case 'error':
      return '\x1b[31m'; // Red
    case 'warn':
      return '\x1b[33m'; // Yellow
    case 'info':
      return '\x1b[36m'; // Cyan
    case 'debug':
      return '\x1b[90m'; // Gray
    default:
      return '\x1b[0m'; // Reset
  }
}

const resetColor = '\x1b[0m';

/**
 * Base log function
 */
function log(level: LogLevel, message: string, context?: LogContext): void {
  if (!shouldLog(level)) {
    return;
  }
  
  const formattedMessage = formatMessage(level, message, context);
  const consoleMethod = getConsoleMethod(level);
  const color = getLogColor(level);
  
  if (isDevelopment && color) {
    consoleMethod(`${color}${formattedMessage}${resetColor}`, context || '');
  } else {
    consoleMethod(formattedMessage, context || '');
  }
}

/**
 * Log error
 */
export function logError(message: string, error?: Error | unknown, context?: LogContext): void {
  const errorContext: LogContext = {
    ...context,
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name,
    } : String(error),
  };
  
  log('error', message, errorContext);
}

/**
 * Log warning
 */
export function logWarn(message: string, context?: LogContext): void {
  log('warn', message, context);
}

/**
 * Log info
 */
export function logInfo(message: string, context?: LogContext): void {
  log('info', message, context);
}

/**
 * Log debug
 */
export function logDebug(message: string, context?: LogContext): void {
  log('debug', message, context);
}

/**
 * Performance timing utilities
 */
const timers = new Map<string, number>();

/**
 * Start a performance timer
 */
export function time(label: string): void {
  if (!shouldLog('debug')) {
    return;
  }
  
  timers.set(label, performance.now());
  if (isDevelopment) {
    console.time(label);
  }
}

/**
 * End a performance timer and log the duration
 */
export function timeEnd(label: string, context?: LogContext): void {
  if (!shouldLog('debug')) {
    return;
  }
  
  const startTime = timers.get(label);
  if (startTime !== undefined) {
    const duration = performance.now() - startTime;
    timers.delete(label);
    
    logDebug(`Timer ${label}: ${duration.toFixed(2)}ms`, {
      ...context,
      duration: `${duration.toFixed(2)}ms`,
    });
    
    if (isDevelopment) {
      console.timeEnd(label);
    }
  }
}

/**
 * Format error with stack trace
 */
export function formatError(error: Error | unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n${error.stack || ''}`;
  }
  return String(error);
}

/**
 * Create log context builder
 */
export function createContext(component?: string, action?: string, additional?: Record<string, unknown>): LogContext {
  return {
    component,
    action,
    ...additional,
  };
}

// Export default logger object
export default {
  error: logError,
  warn: logWarn,
  info: logInfo,
  debug: logDebug,
  time,
  timeEnd,
  formatError,
  createContext,
};

