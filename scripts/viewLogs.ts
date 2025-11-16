#!/usr/bin/env tsx
/**
 * Log Viewer Utility
 * Parses and filters log files for analysis
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  category?: string;
  [key: string]: unknown;
}

interface FilterOptions {
  level?: string[];
  category?: string[];
  search?: string;
  since?: Date;
  until?: Date;
  limit?: number;
}

/**
 * Parse log file and return entries
 */
function parseLogFile(filePath: string): LogEntry[] {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    const entries: LogEntry[] = [];
    
    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as LogEntry;
        entries.push(entry);
      } catch {
        // Skip invalid JSON lines
        continue;
      }
    }
    
    return entries;
  } catch (error) {
    console.error(`Error reading log file ${filePath}:`, error);
    return [];
  }
}

/**
 * Filter log entries based on options
 */
function filterEntries(entries: LogEntry[], options: FilterOptions): LogEntry[] {
  let filtered = entries;
  
  // Filter by level
  if (options.level && options.level.length > 0) {
    filtered = filtered.filter(entry => 
      options.level!.some(level => entry.level.toLowerCase() === level.toLowerCase())
    );
  }
  
  // Filter by category
  if (options.category && options.category.length > 0) {
    filtered = filtered.filter(entry => 
      entry.category && options.category!.some(cat => 
        entry.category!.toLowerCase() === cat.toLowerCase()
      )
    );
  }
  
  // Filter by search term
  if (options.search) {
    const searchLower = options.search.toLowerCase();
    filtered = filtered.filter(entry => {
      const message = String(entry.message || '').toLowerCase();
      const context = JSON.stringify(entry).toLowerCase();
      return message.includes(searchLower) || context.includes(searchLower);
    });
  }
  
  // Filter by date range
  if (options.since) {
    filtered = filtered.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      return entryDate >= options.since!;
    });
  }
  
  if (options.until) {
    filtered = filtered.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      return entryDate <= options.until!;
    });
  }
  
  // Sort by timestamp (newest first)
  filtered.sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return dateB - dateA;
  });
  
  // Limit results
  if (options.limit) {
    filtered = filtered.slice(0, options.limit);
  }
  
  return filtered;
}

/**
 * Aggregate errors by fingerprint or message
 */
function aggregateErrors(entries: LogEntry[]): Map<string, { count: number; lastOccurrence: string; sample: LogEntry }> {
  const aggregated = new Map<string, { count: number; lastOccurrence: string; sample: LogEntry }>();
  
  for (const entry of entries) {
    if (entry.level.toLowerCase() !== 'error') continue;
    
    // Use fingerprint if available, otherwise use message
    const key = (entry.fingerprint as string) || entry.message || 'unknown';
    
    if (aggregated.has(key)) {
      const existing = aggregated.get(key)!;
      existing.count++;
      if (new Date(entry.timestamp) > new Date(existing.lastOccurrence)) {
        existing.lastOccurrence = entry.timestamp;
      }
    } else {
      aggregated.set(key, {
        count: 1,
        lastOccurrence: entry.timestamp,
        sample: entry,
      });
    }
  }
  
  return aggregated;
}

/**
 * Get performance statistics
 */
function getPerformanceStats(entries: LogEntry[]): {
  totalRequests: number;
  avgDuration: number;
  slowRequests: LogEntry[];
} {
  const performanceEntries = entries.filter(e => 
    e.category === 'PERFORMANCE' || e.category === 'API'
  );
  
  const durations: number[] = [];
  const slowRequests: LogEntry[] = [];
  
  for (const entry of performanceEntries) {
    if (entry.durationMs) {
      const duration = typeof entry.durationMs === 'string' 
        ? parseFloat(entry.durationMs.replace('ms', ''))
        : Number(entry.durationMs);
      
      if (!isNaN(duration)) {
        durations.push(duration);
        if (duration > 3000) {
          slowRequests.push(entry);
        }
      }
    }
  }
  
  const avgDuration = durations.length > 0
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;
  
  return {
    totalRequests: performanceEntries.length,
    avgDuration,
    slowRequests: slowRequests.slice(0, 10), // Top 10 slowest
  };
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const logsDir = join(__dirname, '../server/logs');
  
  // Parse command line arguments
  const options: FilterOptions = {};
  let filePattern: string | null = null;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--level':
        options.level = args[++i]?.split(',') || [];
        break;
      case '--category':
        options.category = args[++i]?.split(',') || [];
        break;
      case '--search':
        options.search = args[++i];
        break;
      case '--since':
        options.since = new Date(args[++i]);
        break;
      case '--until':
        options.until = new Date(args[++i]);
        break;
      case '--limit':
        options.limit = parseInt(args[++i] || '100');
        break;
      case '--file':
        filePattern = args[++i];
        break;
      case '--errors':
        options.level = ['error'];
        break;
      case '--performance':
        options.category = ['PERFORMANCE', 'API'];
        break;
      case '--help':
        console.log(`
Log Viewer Utility

Usage: tsx scripts/viewLogs.ts [options]

Options:
  --level <levels>        Filter by log levels (comma-separated: error,warn,info,debug)
  --category <categories> Filter by categories (comma-separated: API,GENERATION,ERROR,etc.)
  --search <term>         Search in log messages and context
  --since <date>          Filter entries after this date (ISO format)
  --until <date>          Filter entries before this date (ISO format)
  --limit <number>        Limit number of results (default: 100)
  --file <pattern>        Filter log files by pattern (e.g., "error-2024-01-01.log")
  --errors                Show only errors
  --performance           Show performance-related logs
  --help                  Show this help message

Examples:
  tsx scripts/viewLogs.ts --errors --limit 50
  tsx scripts/viewLogs.ts --category API --search "timeout"
  tsx scripts/viewLogs.ts --performance --since 2024-01-01
  tsx scripts/viewLogs.ts --level error,warn --file "error-*.log"
        `);
        process.exit(0);
    }
  }
  
  // Get log files
  let logFiles: string[] = [];
  try {
    const files = readdirSync(logsDir);
    logFiles = files
      .filter(file => file.endsWith('.log'))
      .filter(file => {
        if (!filePattern) return true;
        // Simple pattern matching (supports * wildcard)
        const pattern = filePattern.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(file);
      })
      .map(file => join(logsDir, file))
      .sort((a, b) => {
        // Sort by modification time (newest first)
        return statSync(b).mtime.getTime() - statSync(a).mtime.getTime();
      });
  } catch (error) {
    console.error(`Error reading logs directory: ${error}`);
    process.exit(1);
  }
  
  if (logFiles.length === 0) {
    console.log('No log files found.');
    process.exit(0);
  }
  
  // Parse all log files
  console.log(`Reading ${logFiles.length} log file(s)...`);
  const allEntries: LogEntry[] = [];
  
  for (const file of logFiles) {
    const entries = parseLogFile(file);
    allEntries.push(...entries);
  }
  
  console.log(`Found ${allEntries.length} log entries`);
  
  // Filter entries
  const filtered = filterEntries(allEntries, options);
  
  // Display results
  if (filtered.length === 0) {
    console.log('No entries match the filter criteria.');
    process.exit(0);
  }
  
  console.log(`\nShowing ${filtered.length} entries:\n`);
  
  // Show entries
  for (const entry of filtered) {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const category = entry.category ? `[${entry.category}]` : '';
    const message = entry.message || '';
    
    console.log(`${timestamp} ${level} ${category} ${message}`);
    
    // Show additional context for errors
    if (entry.level.toLowerCase() === 'error' && entry.error) {
      const error = entry.error as { message?: string; stack?: string };
      if (error.message) {
        console.log(`  Error: ${error.message}`);
      }
      if (error.stack && process.env.DEBUG) {
        console.log(`  Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
      }
    }
    
    // Show duration for performance entries
    if (entry.durationMs || entry.duration) {
      const duration = entry.durationMs || entry.duration;
      console.log(`  Duration: ${duration}`);
    }
    
    console.log('');
  }
  
  // Show summary
  if (options.level?.includes('error') || options.errors) {
    console.log('\n=== Error Summary ===');
    const errorAggregation = aggregateErrors(allEntries);
    const sortedErrors = Array.from(errorAggregation.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);
    
    for (const [key, data] of sortedErrors) {
      console.log(`${data.count}x ${data.sample.message || key}`);
      console.log(`  Last: ${data.lastOccurrence}`);
    }
  }
  
  if (options.performance || options.category?.includes('PERFORMANCE') || options.category?.includes('API')) {
    console.log('\n=== Performance Summary ===');
    const perfStats = getPerformanceStats(allEntries);
    console.log(`Total requests: ${perfStats.totalRequests}`);
    console.log(`Average duration: ${perfStats.avgDuration.toFixed(2)}ms`);
    console.log(`Slow requests (>3s): ${perfStats.slowRequests.length}`);
    
    if (perfStats.slowRequests.length > 0) {
      console.log('\nSlowest requests:');
      for (const req of perfStats.slowRequests.slice(0, 5)) {
        console.log(`  ${req.message} - ${req.durationMs || req.duration}`);
      }
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { parseLogFile, filterEntries, aggregateErrors, getPerformanceStats };

