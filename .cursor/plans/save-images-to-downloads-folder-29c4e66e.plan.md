<!-- 29c4e66e-ef55-4d58-b6d1-a2d3240b36b0 64a1a357-7d23-4483-9cf9-e6215904787c -->
# Comprehensive Error Tracking and Logging System

## Overview

Implement a professional logging and error tracking system across the entire application to enable easy debugging, issue identification, and performance monitoring.

## Architecture

### Backend Logging (Server-Side)

- **Winston Logger**: Professional logging library with multiple transports
- **Structured Logging**: JSON format for easy parsing and analysis
- **Log Levels**: error, warn, info, debug, verbose
- **File Rotation**: Automatic log rotation to prevent disk space issues
- **Error Context**: Capture request context, stack traces, and relevant data

### Frontend Logging (Client-Side)

- **Structured Console Logger**: Enhanced console logging with consistent format
- **Error Boundary Integration**: Capture React errors with context
- **API Call Tracking**: Log all API requests/responses with timing
- **User Action Tracking**: Log critical user actions for debugging
- **Error Reporting**: Send critical errors to backend for analysis

### Error Tracking

- **Error Aggregation**: Group similar errors together
- **Error Context**: Capture full context (user actions, state, API calls)
- **Stack Trace Analysis**: Parse and format stack traces
- **Error Categories**: Categorize errors (API, validation, generation, etc.)

### Performance Monitoring

- **Request Timing**: Track API response times
- **Generation Tracking**: Monitor storyboard generation duration
- **Memory Usage**: Track memory usage for large operations
- **Slow Query Detection**: Identify slow API calls

## Implementation Plan

### Phase 1: Backend Logging Infrastructure

#### 1.1 Install Dependencies

- Add `winston` and `winston-daily-rotate-file` to package.json
- Add `@types/winston` to devDependencies

#### 1.2 Create Logger Service (`server/utils/logger.ts`)

- Configure Winston with multiple transports:
  - Console transport (colored output for development)
  - File transport (daily rotation, separate files for error/info)
  - Error file transport (errors only)
- Structured logging format with timestamps, levels, context
- Log levels based on NODE_ENV (verbose in dev, info in prod)

#### 1.3 Create Error Tracker (`server/utils/errorTracker.ts`)

- Error aggregation and categorization
- Stack trace parsing and formatting
- Error context builder (request info, user actions, state)
- Error reporting utilities

#### 1.4 Create Performance Monitor (`server/utils/performanceMonitor.ts`)

- Request timing middleware
- Memory usage tracking
- Slow operation detection
- Performance metrics collection

### Phase 2: Backend Integration

#### 2.1 Update Error Handler (`server/middleware/errorHandler.ts`)

- Integrate Winston logger
- Enhanced error logging with full context
- Error categorization
- Stack trace logging

#### 2.2 Update Async Handler (`server/middleware/asyncHandler.ts`)

- Add request timing
- Log request start/end
- Capture request context

#### 2.3 Add Request Logging Middleware (`server/middleware/requestLogger.ts`)

- Log all incoming requests (method, URL, IP, user-agent)
- Log request duration
- Log response status
- Filter sensitive data (API keys, tokens)

#### 2.4 Update Critical Services

- **geminiService.ts**: Add detailed logging for:
  - Story-World generation start/end
  - Script generation start/end
  - Image generation per scene (with timing)
  - API call failures and retries
  - Progress updates

- **youtubeService.ts**: Add logging for:
  - API calls
  - Cache hits/misses
  - Response times
  - Error cases

#### 2.5 Update Server Entry Point (`server/index.ts`)

- Initialize logger on startup
- Log server startup/shutdown
- Log environment configuration (without sensitive data)
- Add request logging middleware

### Phase 3: Frontend Logging Infrastructure

#### 3.1 Create Logger Utility (`utils/logger.ts`)

- Structured console logging with consistent format
- Log levels: error, warn, info, debug
- Context builder (component, action, state)
- Performance timing utilities
- Error formatter

#### 3.2 Create Error Reporter (`utils/errorReporter.ts`)

- Capture React errors with full context
- Send critical errors to backend
- Local error storage (for offline debugging)
- Error grouping and deduplication

#### 3.3 Create API Call Logger (`utils/apiLogger.ts`)

- Intercept all API calls
- Log request/response with timing
- Log errors with full context
- Track retry attempts

#### 3.4 Update Error Boundary (`components/ErrorBoundary.tsx`)

- Integrate error reporter
- Enhanced error context capture
- User-friendly error messages
- Error reporting to backend

### Phase 4: Frontend Integration

#### 4.1 Update API Client (`utils/apiClient.ts`)

- Integrate API logger
- Add request/response logging
- Error logging with context
- Performance tracking

#### 4.2 Update Critical Hooks

- **useStoryboard.ts**: Add logging for:
  - Generation start/end
  - Progress updates
  - Errors with context
  - User actions

- **useProjects.ts**: Add logging for:
  - Save/load/delete operations
  - localStorage errors
  - Storage quota issues

#### 4.3 Update Critical Components

- **App.tsx**: Log view changes, critical user actions
- **InputPanel.tsx**: Log file uploads, validation errors
- **Dashboard.tsx**: Log tab changes, export/save actions

#### 4.4 Update Services

- **geminiService.ts**: Add detailed logging for:
  - File size validation
  - Base64 conversion
  - API requests
  - Response handling
  - Progress callbacks

### Phase 5: Logging Configuration

#### 5.1 Environment-Based Configuration

- Development: Verbose logging (debug level)
- Production: Info level logging (errors, warnings, important info)
- Log file location: `logs/` directory
- Log rotation: Daily, keep 30 days

#### 5.2 Log Format

- Structured JSON format for files
- Human-readable format for console
- Include: timestamp, level, message, context, stack (for errors)

#### 5.3 Log Categories

- **API**: All API calls and responses
- **GENERATION**: Storyboard generation process
- **STORAGE**: localStorage operations
- **VALIDATION**: Input validation errors
- **ERROR**: All errors with full context
- **PERFORMANCE**: Timing and performance metrics

### Phase 6: Error Analysis Tools

#### 6.1 Create Log Viewer Utility (`scripts/viewLogs.ts`)

- Parse log files
- Filter by level, category, time range
- Search functionality
- Error aggregation view

#### 6.2 Add Logging Dashboard (Optional - Future Enhancement)

- Real-time log viewer
- Error statistics
- Performance metrics
- Error trends

## File Structure

```
server/
  utils/
    logger.ts              # Winston logger configuration
    errorTracker.ts        # Error tracking and aggregation
    performanceMonitor.ts # Performance monitoring utilities
  middleware/
    requestLogger.ts      # Request logging middleware
    errorHandler.ts       # Enhanced error handler
    asyncHandler.ts       # Enhanced async handler
  logs/                   # Log files directory (gitignored)
    error-YYYY-MM-DD.log
    combined-YYYY-MM-DD.log

utils/
  logger.ts               # Frontend logger utility
  errorReporter.ts        # Error reporting to backend
  apiLogger.ts            # API call logging

components/
  ErrorBoundary.tsx       # Enhanced error boundary

scripts/
  viewLogs.ts             # Log viewer utility
```

## Key Features

1. **Structured Logging**: Consistent format across all logs
2. **Context Capture**: Full context for every error (request, state, user actions)
3. **Performance Tracking**: Monitor slow operations and bottlenecks
4. **Error Aggregation**: Group similar errors for easier debugging
5. **Log Rotation**: Automatic cleanup to prevent disk space issues
6. **Environment-Aware**: Different log levels for dev/prod
7. **Security**: Filter sensitive data from logs
8. **Easy Debugging**: Clear, actionable error messages with context

## Benefits

- **Easy Issue Identification**: Structured logs make it easy to find problems
- **Performance Insights**: Identify slow operations and bottlenecks
- **Error Patterns**: Detect recurring issues
- **Debugging Efficiency**: Full context reduces debugging time
- **Production Monitoring**: Track errors and performance in production
- **User Experience**: Better error messages and faster issue resolution

### To-dos

- [ ] Update types.ts with new asset interfaces and maintain backward compatibility
- [ ] Add state management for background, art style, and multiple characters in App.tsx
- [ ] Add multiple file support to ImageUpload.tsx component
- [ ] Add UI for background, art style, and multiple characters in InputPanel.tsx
- [ ] Update services/geminiService.ts to handle new asset types
- [ ] Update hooks/useStoryboard.ts signature for new parameters
- [ ] Update server/middleware/validation.ts schema for new assets
- [ ] Update server/index.ts endpoint to accept new asset types
- [ ] Update server/services/geminiService.ts with new asset handling and prompt construction
- [ ] Update utils/fileSystem.ts to save new asset types
- [ ] Update App.tsx save/load/export functions for new assets