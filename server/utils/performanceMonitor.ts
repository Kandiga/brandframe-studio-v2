import { performance } from 'perf_hooks';

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

// Store performance metrics
const metrics: PerformanceMetric[] = [];
const MAX_METRICS = 1000; // Keep last 1000 metrics

// Slow operation thresholds (in milliseconds)
const SLOW_REQUEST_THRESHOLD = 3000; // 3 seconds
const SLOW_OPERATION_THRESHOLD = 5000; // 5 seconds

/**
 * Track operation timing
 */
export function trackOperation(
  operation: string,
  fn: () => Promise<unknown> | unknown,
  metadata?: Record<string, unknown>
): Promise<unknown> {
  const startTime = performance.now();
  const startTimestamp = Date.now();
  
  const result = fn();
  
  if (result instanceof Promise) {
    return result
      .then(value => {
        const duration = performance.now() - startTime;
        recordMetric(operation, duration, startTimestamp, metadata);
        return value;
      })
      .catch(error => {
        const duration = performance.now() - startTime;
        recordMetric(operation, duration, startTimestamp, { ...metadata, error: true });
        throw error;
      });
  }
  
  const duration = performance.now() - startTime;
  recordMetric(operation, duration, startTimestamp, metadata);
  return result;
}

/**
 * Record a performance metric
 */
export function recordMetric(
  operation: string,
  duration: number,
  timestamp: number = Date.now(),
  metadata?: Record<string, unknown>
): void {
  const metric: PerformanceMetric = {
    operation,
    duration,
    timestamp,
    metadata,
  };
  
  metrics.push(metric);
  
  // Keep only last MAX_METRICS
  if (metrics.length > MAX_METRICS) {
    metrics.shift();
  }
  
  // Check if operation is slow
  const threshold = operation.includes('request') || operation.includes('api')
    ? SLOW_REQUEST_THRESHOLD
    : SLOW_OPERATION_THRESHOLD;
  
  if (duration > threshold) {
    // This will be logged by the caller
    return;
  }
}

/**
 * Get current memory usage
 */
export function getMemoryUsage(): MemoryUsage {
  const usage = process.memoryUsage();
  return {
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    external: usage.external,
    rss: usage.rss,
  };
}

/**
 * Format memory usage for logging
 */
export function formatMemoryUsage(usage: MemoryUsage): string {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };
  
  return `Heap: ${formatBytes(usage.heapUsed)} / ${formatBytes(usage.heapTotal)}, RSS: ${formatBytes(usage.rss)}`;
}

/**
 * Get performance statistics
 */
export function getPerformanceStats(operation?: string): {
  count: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  slowOperations: PerformanceMetric[];
} {
  const filteredMetrics = operation
    ? metrics.filter(m => m.operation === operation)
    : metrics;
  
  if (filteredMetrics.length === 0) {
    return {
      count: 0,
      avgDuration: 0,
      minDuration: 0,
      maxDuration: 0,
      slowOperations: [],
    };
  }
  
  const durations = filteredMetrics.map(m => m.duration);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  
  const threshold = operation?.includes('request') || operation?.includes('api')
    ? SLOW_REQUEST_THRESHOLD
    : SLOW_OPERATION_THRESHOLD;
  
  const slowOperations = filteredMetrics.filter(m => m.duration > threshold);
  
  return {
    count: filteredMetrics.length,
    avgDuration,
    minDuration,
    maxDuration,
    slowOperations,
  };
}

/**
 * Clear performance metrics
 */
export function clearMetrics(): void {
  metrics.length = 0;
}

/**
 * Create timing decorator for async functions
 */
export function timed(operation: string) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    
    descriptor.value = function (...args: unknown[]) {
      const startTime = performance.now();
      const startTimestamp = Date.now();
      
      const result = originalMethod.apply(this, args);
      
      if (result instanceof Promise) {
        return result
          .then(value => {
            const duration = performance.now() - startTime;
            recordMetric(`${operation}.${propertyKey}`, duration, startTimestamp);
            return value;
          })
          .catch(error => {
            const duration = performance.now() - startTime;
            recordMetric(`${operation}.${propertyKey}`, duration, startTimestamp, { error: true });
            throw error;
          });
      }
      
      const duration = performance.now() - startTime;
      recordMetric(`${operation}.${propertyKey}`, duration, startTimestamp);
      return result;
    };
    
    return descriptor;
  };
}

/**
 * Check if operation is slow
 */
export function isSlowOperation(duration: number, operation: string): boolean {
  const threshold = operation.includes('request') || operation.includes('api')
    ? SLOW_REQUEST_THRESHOLD
    : SLOW_OPERATION_THRESHOLD;
  
  return duration > threshold;
}

