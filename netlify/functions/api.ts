import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { fetchTrendingShorts, fetchVideoMetadata, fetchVideoComments } from '../../server/services/youtubeService.js';
import { generateStoryboard } from '../../server/services/geminiService.js';
import { continueStoryboard } from '../../server/services/geminiService.js';
import { ApplicationError } from '../../server/middleware/errorHandler.js';
import { storyboardGenerationSchema } from '../../server/middleware/validation.js';
import { logInfo, logError, logDebug } from '../../server/utils/logger.js';

// CORS headers helper
const getCorsHeaders = (origin?: string) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
});

// Handle CORS preflight
const handleCORS = (event: HandlerEvent) => {
  const origin = event.headers.origin || event.headers.Origin;
  const corsHeaders = getCorsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }
  return null;
};

// Error handler
const handleError = (error: unknown, statusCode: number = 500, origin?: string) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  logError('Netlify function error', error instanceof Error ? error : new Error(message), {
    category: 'NETLIFY_FUNCTION',
    statusCode,
  });

  const corsHeaders = getCorsHeaders(origin);

  return {
    statusCode,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      success: false,
      error: message,
      code: error instanceof ApplicationError ? error.code : 'INTERNAL_ERROR',
    }),
  };
};

// Main handler
export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Handle CORS preflight
  const corsResponse = handleCORS(event);
  if (corsResponse) return corsResponse;

  const { path, httpMethod, queryStringParameters, body, headers } = event;
  const apiPath = path.replace('/.netlify/functions/api', '');
  const origin = headers.origin || headers.Origin;
  const corsHeaders = getCorsHeaders(origin);

  logInfo('Netlify function called', {
    category: 'NETLIFY_FUNCTION',
    path: apiPath,
    method: httpMethod,
  });

  try {
    // Health check
    if (apiPath === '/api/health' && httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
      };
    }

    // YouTube trending shorts
    if (apiPath === '/api/youtube/trending-shorts' && httpMethod === 'GET') {
      const limit = parseInt(queryStringParameters?.limit || '20');
      const query = queryStringParameters?.query;
      
      if (limit < 1 || limit > 100) {
        throw new ApplicationError('Limit must be between 1 and 100', 400, 'INVALID_LIMIT');
      }

      const videos = await fetchTrendingShorts(limit, query);
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ success: true, videos }),
      };
    }

    // YouTube video metadata
    if (apiPath.startsWith('/api/youtube/video/') && httpMethod === 'GET' && !apiPath.includes('/comments')) {
      const videoId = apiPath.split('/api/youtube/video/')[1];
      
      if (!videoId || videoId.length !== 11 || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        throw new ApplicationError('Invalid video ID format', 400, 'INVALID_VIDEO_ID');
      }

      const video = await fetchVideoMetadata(videoId);
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ success: true, video }),
      };
    }

    // YouTube video comments
    if (apiPath.includes('/api/youtube/video/') && apiPath.includes('/comments') && httpMethod === 'GET') {
      const parts = apiPath.split('/');
      const videoIdIndex = parts.indexOf('video') + 1;
      const videoId = parts[videoIdIndex];
      const maxResults = parseInt(queryStringParameters?.maxResults || '10');

      if (!videoId || videoId.length !== 11 || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        throw new ApplicationError('Invalid video ID format', 400, 'INVALID_VIDEO_ID');
      }

      if (maxResults < 1 || maxResults > 100) {
        throw new ApplicationError('maxResults must be between 1 and 100', 400, 'INVALID_MAX_RESULTS');
      }

      const comments = await fetchVideoComments(videoId, maxResults);
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ success: true, comments }),
      };
    }

    // Storyboard generation
    if (apiPath === '/api/storyboard/generate' && httpMethod === 'POST') {
      if (!body) {
        throw new ApplicationError('Request body is required', 400, 'MISSING_BODY');
      }

      const requestBody = JSON.parse(body);
      const validationResult = storyboardGenerationSchema.safeParse(requestBody);
      
      if (!validationResult.success) {
        throw new ApplicationError(
          `Validation error: ${validationResult.error.errors.map(e => e.message).join(', ')}`,
          400,
          'VALIDATION_ERROR'
        );
      }

      const {
        logoAsset,
        characterAsset,
        mainCharacterAsset,
        additionalCharacterAssets = [],
        backgroundAsset,
        artStyleAsset,
        story,
        aspectRatio,
        frameCount = 4,
      } = requestBody;

      const mainCharacter = mainCharacterAsset || characterAsset || null;
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

      if (!apiKey) {
        throw new ApplicationError('Gemini API key is not configured', 500, 'MISSING_API_KEY');
      }

      const validFrameCounts = [2, 4, 6, 8];
      const sceneCount = validFrameCounts.includes(frameCount) ? frameCount / 2 : 2;

      const progressLogger = (progress: {
        phase: string;
        progress: number;
        message: string;
        currentScene?: number;
        totalScenes?: number;
        estimatedTimeRemaining?: number;
        elapsedTime?: number;
      }) => {
        logDebug('Storyboard generation progress', {
          category: 'GENERATION',
          phase: progress.phase,
          progress: progress.progress,
          message: progress.message,
        });
      };

      const storyboard = await generateStoryboard(
        logoAsset || null,
        mainCharacter,
        additionalCharacterAssets || [],
        backgroundAsset || null,
        artStyleAsset || null,
        story.trim(),
        aspectRatio || '16:9',
        apiKey,
        sceneCount,
        progressLogger
      );

      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ success: true, data: storyboard }),
      };
    }

    // Storyboard continuation
    if (apiPath === '/api/storyboard/continue' && httpMethod === 'POST') {
      if (!body) {
        throw new ApplicationError('Request body is required', 400, 'MISSING_BODY');
      }

      const requestBody = JSON.parse(body);
      const {
        logoAsset,
        characterAsset,
        mainCharacterAsset,
        additionalCharacterAssets = [],
        backgroundAsset,
        artStyleAsset,
        existingStoryboard,
        aspectRatio,
        customInstruction,
      } = requestBody;

      const mainCharacter = mainCharacterAsset || characterAsset || null;
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

      if (!apiKey) {
        throw new ApplicationError('Gemini API key is not configured', 500, 'MISSING_API_KEY');
      }

      if (!existingStoryboard || !existingStoryboard.scenes || existingStoryboard.scenes.length === 0) {
        throw new ApplicationError('Existing storyboard is required to continue', 400, 'INVALID_REQUEST');
      }

      const progressLogger = (progress: {
        phase: string;
        progress: number;
        message: string;
        currentScene?: number;
        totalScenes?: number;
        currentFrame?: string;
        estimatedTimeRemaining?: number;
        elapsedTime?: number;
      }) => {
        logDebug('Storyboard continuation progress', {
          category: 'GENERATION',
          phase: progress.phase,
          progress: progress.progress,
          message: progress.message,
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

      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ success: true, data: { scenes: newScenes } }),
      };
    }

    // Error logging endpoint
    if (apiPath === '/api/logs/error' && httpMethod === 'POST') {
      if (!body) {
        throw new ApplicationError('Request body is required', 400, 'MISSING_BODY');
      }

      const { error, context, userAgent, url, timestamp } = JSON.parse(body);

      if (!error || !error.message) {
        throw new ApplicationError('Invalid error report format', 400, 'INVALID_ERROR_REPORT');
      }

      logError('Frontend error reported', new Error(error.message), {
        category: 'FRONTEND_ERROR',
        stack: error.stack,
        componentStack: error.componentStack,
        context,
        userAgent,
        url,
        timestamp,
      });

      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ success: true, message: 'Error reported successfully' }),
      };
    }

    // 404 Not Found
    return {
      statusCode: 404,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: 'Endpoint not found',
        code: 'NOT_FOUND',
      }),
    };
  } catch (error) {
    if (error instanceof ApplicationError) {
      return handleError(error, error.statusCode || 500, origin);
    }
    return handleError(error, 500, origin);
  }
};

