import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { fetchTrendingShorts, fetchVideoMetadata, fetchVideoComments } from './services/youtubeService.js';
import { generateStoryboard } from './services/geminiService.js';
import { asyncHandler } from './middleware/asyncHandler.js';
import { errorHandler, notFoundHandler, ApplicationError } from './middleware/errorHandler.js';
import { securityMiddleware, corsMiddleware, requestSizeLimit } from './middleware/security.js';
import { validate, storyboardGenerationSchema } from './middleware/validation.js';
import { requestLogger } from './middleware/requestLogger.js';
import { logInfo, logError, logWarn, logDebug } from './utils/logger.js';
import rateLimit from 'express-rate-limit';

// Load environment variables
// Try .env.local first, then .env in server directory, then root .env
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });
dotenv.config({ path: join(__dirname, '.env') });
dotenv.config(); // Fallback to root .env if exists

// Initialize logger - this must be done early
// Logger is already initialized when imported, but we log startup here
logInfo('Server starting up', {
  category: 'SYSTEM',
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3002,
});

// Log environment variables status (without sensitive values)
logInfo('Environment variables loaded', {
  category: 'SYSTEM',
  hasGeminiKey: !!process.env.GEMINI_API_KEY,
  hasYoutubeKey: !!process.env.YOUTUBE_API_KEY,
  youtubeKeyPrefix: process.env.YOUTUBE_API_KEY ? process.env.YOUTUBE_API_KEY.substring(0, 15) : undefined,
});

if (!process.env.YOUTUBE_API_KEY) {
  logWarn('YOUTUBE_API_KEY is missing', {
    category: 'SYSTEM',
    message: 'Search functionality will not work without it',
  });
}

const app = express();
const PORT = process.env.PORT || 3002;

// Security middleware (must be first)
app.use(securityMiddleware);
app.use(corsMiddleware);
app.use(requestSizeLimit);

// Request logging middleware (before routes)
app.use(requestLogger);

// Body parsing middleware
// Increased limit to 200MB for storyboard generation with base64 images
// Base64 encoding increases size by ~33%, so 150MB images become ~200MB
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const storyboardLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit storyboard generation to 10 per hour
  message: 'Too many storyboard generation requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);

// Rate limiting cache for YouTube endpoints
interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const requestCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes - longer cache for better performance with multiple searches

// Simple rate limiting middleware (kept for caching)
const rateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  // Include query parameter in cache key to avoid returning wrong results for different searches
  // Normalize query to handle case sensitivity and whitespace
  // Ignore cache-busting parameters like _t
  const query = req.query.query as string | undefined;
  const normalizedQuery = query ? query.trim().toLowerCase() : 'no-query';
  const limit = req.query.limit as string | undefined;
  const clearCache = req.query.clearCache === 'true';
  const key = `${req.path}_${normalizedQuery}_${limit || '20'}`;
  
  // Clear cache if requested
  if (clearCache) {
    requestCache.delete(key);
    logDebug('Cache cleared', {
      category: 'API',
      query: normalizedQuery,
    });
  }
  
  const cached = requestCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION && !clearCache) {
    const cacheAge = Math.round((Date.now() - cached.timestamp) / 1000);
    logDebug('Returning cached result', {
      category: 'API',
      query: normalizedQuery,
      cacheAge: `${cacheAge}s`,
    });
    res.json(cached.data);
    return;
  }
  
  // Clear old cache entries to prevent memory issues (keep last 50 searches)
  if (requestCache.size > 50) {
    const entries = Array.from(requestCache.entries());
    // Sort by timestamp and remove oldest entries
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(0, entries.length - 50);
    for (const [k] of toRemove) {
      requestCache.delete(k);
    }
    logDebug('Cleaned old cache entries', {
      category: 'API',
      cacheSize: requestCache.size,
    });
  }
  
  // Store original json method
  const originalJson = res.json.bind(res);
  
  // Override json to cache response
  res.json = function(data: unknown) {
    requestCache.set(key, {
      data,
      timestamp: Date.now()
    });
    logDebug('Cached result', {
      category: 'API',
      query: normalizedQuery,
      cacheSize: requestCache.size,
    });
    return originalJson(data);
  };
  
  next();
};

// Routes
app.get('/api/youtube/trending-shorts', rateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const query = req.query.query as string | undefined;
  const clearCache = req.query.clearCache === 'true'; // Optional parameter to clear cache
  
  if (limit < 1 || limit > 100) {
    throw new ApplicationError('Limit must be between 1 and 100', 400, 'INVALID_LIMIT');
  }
  
  // Clear cache for this specific query if requested
  if (clearCache) {
    const normalizedQuery = query ? query.trim().toLowerCase() : 'no-query';
    const key = `/api/youtube/trending-shorts_${normalizedQuery}_${limit}`;
    requestCache.delete(key);
    logDebug('Cache cleared for query', {
      category: 'API',
      query: normalizedQuery,
    });
  }
  
  const videos = await fetchTrendingShorts(limit, query);
  res.json({ success: true, videos });
}));

app.get('/api/youtube/video/:videoId', rateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { videoId } = req.params;
  
  // Validate video ID format (YouTube video IDs are 11 characters)
  if (!videoId || videoId.length !== 11 || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    throw new ApplicationError('Invalid video ID format', 400, 'INVALID_VIDEO_ID');
  }
  
  const video = await fetchVideoMetadata(videoId);
  res.json({ success: true, video });
}));

app.get('/api/youtube/video/:videoId/comments', rateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const maxResults = parseInt(req.query.maxResults as string) || 10;
  
  // Validate video ID format
  if (!videoId || videoId.length !== 11 || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    throw new ApplicationError('Invalid video ID format', 400, 'INVALID_VIDEO_ID');
  }
  
  // Validate maxResults
  if (maxResults < 1 || maxResults > 100) {
    throw new ApplicationError('maxResults must be between 1 and 100', 400, 'INVALID_MAX_RESULTS');
  }
  
  const comments = await fetchVideoComments(videoId, maxResults);
  res.json({ success: true, comments });
}));

// Storyboard generation endpoint
app.post('/api/storyboard/generate', storyboardLimiter, validate(storyboardGenerationSchema), asyncHandler(async (req: Request, res: Response) => {
  const { 
    logoAsset, 
    characterAsset, // Old format (backward compatibility)
    mainCharacterAsset, // New format
    additionalCharacterAssets = [],
    backgroundAsset,
    artStyleAsset,
    story, 
    aspectRatio,
    frameCount = 4 // Number of frames (2, 4, 6, or 8) - default 4
  } = req.body;
  
  // Use new format if available, fall back to old format for backward compatibility
  const mainCharacter = mainCharacterAsset || characterAsset || null;
  
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  
  logDebug('API Key check for storyboard generation', {
    category: 'GENERATION',
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    hasApiKey: !!process.env.API_KEY,
    keyLength: apiKey ? apiKey.length : 0,
  });
  
  if (!apiKey) {
    throw new ApplicationError('Gemini API key is not configured', 500, 'MISSING_API_KEY');
  }
  
  // Note: Progress tracking would ideally use WebSocket or Server-Sent Events
  // For now, we'll log progress to logger
  const progressLogger = (progress: { phase: string; progress: number; message: string; currentScene?: number; totalScenes?: number; estimatedTimeRemaining?: number; elapsedTime?: number }) => {
    logDebug('Storyboard generation progress', {
      category: 'GENERATION',
      phase: progress.phase,
      progress: progress.progress,
      message: progress.message,
      currentScene: progress.currentScene,
      totalScenes: progress.totalScenes,
      estimatedTimeRemaining: progress.estimatedTimeRemaining,
      elapsedTime: progress.elapsedTime,
    });
  };
  
  // Validate frameCount (must be 2, 4, 6, or 8)
  const validFrameCounts = [2, 4, 6, 8];
  const sceneCount = validFrameCounts.includes(frameCount) ? frameCount / 2 : 2; // Default to 2 scenes if invalid
  
  logInfo('Generating storyboard with frame/scene count', {
    category: 'GENERATION',
    component: 'server',
    frameCount,
    sceneCount,
    requestedFrames: frameCount,
  });
  
  const storyboard = await generateStoryboard(
    logoAsset || null,
    mainCharacter,
    additionalCharacterAssets || [],
    backgroundAsset || null,
    artStyleAsset || null,
    story.trim(),
    aspectRatio || '16:9',
    apiKey,
    sceneCount, // Pass scene count (frameCount / 2)
    progressLogger
  );
  
  res.json({ success: true, data: storyboard });
}));

// Storyboard continuation endpoint
app.post('/api/storyboard/continue', storyboardLimiter, asyncHandler(async (req: Request, res: Response) => {
  logInfo('Continue narrative endpoint called', {
    category: 'API',
    component: 'server',
    method: req.method,
    path: req.path,
    hasBody: !!req.body,
  });
  
  const { 
    logoAsset, 
    characterAsset, // Old format (backward compatibility)
    mainCharacterAsset, // New format
    additionalCharacterAssets = [],
    backgroundAsset,
    artStyleAsset,
    existingStoryboard,
    aspectRatio,
    customInstruction
  } = req.body;
  
  // Use new format if available, fall back to old format for backward compatibility
  const mainCharacter = mainCharacterAsset || characterAsset || null;
  
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  
  logDebug('API Key check for storyboard continuation', {
    category: 'GENERATION',
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    hasApiKey: !!process.env.API_KEY,
    keyLength: apiKey ? apiKey.length : 0,
    existingScenesCount: existingStoryboard?.scenes?.length || 0,
    hasCustomInstruction: !!customInstruction,
  });
  
  if (!apiKey) {
    throw new ApplicationError('Gemini API key is not configured', 500, 'MISSING_API_KEY');
  }
  
  if (!existingStoryboard || !existingStoryboard.scenes || existingStoryboard.scenes.length === 0) {
    throw new ApplicationError('Existing storyboard is required to continue', 400, 'INVALID_REQUEST');
  }
  
  // Import continueStoryboard function
  const { continueStoryboard } = await import('./services/geminiService.js');
  
  // Note: Progress tracking would ideally use WebSocket or Server-Sent Events
  // For now, we'll log progress to logger
  const progressLogger = (progress: { phase: string; progress: number; message: string; currentScene?: number; totalScenes?: number; currentFrame?: string; estimatedTimeRemaining?: number; elapsedTime?: number }) => {
    logDebug('Storyboard continuation progress', {
      category: 'GENERATION',
      phase: progress.phase,
      progress: progress.progress,
      message: progress.message,
      currentScene: progress.currentScene,
      totalScenes: progress.totalScenes,
      estimatedTimeRemaining: progress.estimatedTimeRemaining,
      elapsedTime: progress.elapsedTime,
    });
  };
  
  const newScenes = await continueStoryboard(
    logoAsset || null,
    mainCharacter,
    additionalCharacterAssets || [],
    backgroundAsset || null,
    artStyleAsset || null,
    existingStoryboard,
    aspectRatio || '16:9',
    apiKey,
    customInstruction,
    progressLogger
  );
  
  res.json({ success: true, data: { scenes: newScenes } });
}));

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Frontend error reporting endpoint
app.post('/api/logs/error', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit to 50 error reports per 15 minutes per IP
  message: 'Too many error reports, please try again later.',
}), asyncHandler(async (req: Request, res: Response) => {
  const { error, context, userAgent, url, timestamp } = req.body;
  
  if (!error || !error.message) {
    throw new ApplicationError('Invalid error report format', 400, 'INVALID_ERROR_REPORT');
  }
  
  // Log frontend error with full context
  logError('Frontend error reported', new Error(error.message), {
    category: 'FRONTEND_ERROR',
    stack: error.stack,
    componentStack: error.componentStack,
    context,
    userAgent,
    url,
    timestamp,
    browserInfo: {
      userAgent: req.get('user-agent'),
      referer: req.get('referer'),
    },
  });
  
  res.json({ success: true, message: 'Error reported successfully' });
}));

// 404 handler (must be before error handler)
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

const server = app.listen(PORT, () => {
  logInfo('Server started successfully', {
    category: 'SYSTEM',
    port: PORT,
    url: `http://localhost:${PORT}`,
    environment: process.env.NODE_ENV || 'development',
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logInfo('SIGTERM received, shutting down gracefully', {
    category: 'SYSTEM',
  });
  server.close(() => {
    logInfo('Server closed', {
      category: 'SYSTEM',
    });
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logInfo('SIGINT received, shutting down gracefully', {
    category: 'SYSTEM',
  });
  server.close(() => {
    logInfo('Server closed', {
      category: 'SYSTEM',
    });
    process.exit(0);
  });
});
