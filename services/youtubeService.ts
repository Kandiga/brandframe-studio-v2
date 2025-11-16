import { YouTubeVideo, Comment } from '../types';
import { logInfo, logError, logDebug, logWarn } from '../utils/logger.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const contentType = response.headers.get('content-type');
    const isHealthy = response.ok && !!contentType && contentType.includes('application/json');
    
    if (!isHealthy) {
      logWarn('Backend health check failed', {
        category: 'API',
        component: 'youtubeService',
        status: response.status,
        contentType,
      });
    }
    
    return isHealthy;
  } catch (error) {
    logError('Backend health check error', error, {
      category: 'API',
      component: 'youtubeService',
    });
    return false;
  }
}

export async function fetchTrendingShorts(limit: number = 20, query?: string): Promise<YouTubeVideo[]> {
  const startTime = Date.now();
  
  try {
    logInfo('Fetching trending YouTube Shorts', {
      category: 'API',
      component: 'youtubeService',
      action: 'fetch-trending',
      limit,
      query: query || 'trending',
    });
    
    // Check if backend is available first
    const isBackendAvailable = await checkBackendHealth();
    if (!isBackendAvailable) {
      const error = new Error(
        `Backend server is not running. Please start the backend server with "npm run server" or "npm run dev:full". ` +
        `Expected server at ${API_BASE_URL}`
      );
      logError('Backend server not available', error, {
        category: 'API',
        component: 'youtubeService',
        action: 'fetch-trending',
      });
      throw error;
    }

    const queryParam = query ? `&query=${encodeURIComponent(query)}` : '';
    // Don't add timestamp - let server cache work for better performance with multiple searches
    // User can add ?clearCache=true if they want fresh results
    const response = await fetch(`${API_BASE_URL}/api/youtube/trending-shorts?limit=${limit}${queryParam}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'default' // Allow browser cache for better performance
    });
    
    // Check content type before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      await response.text(); // Read response to avoid memory leak
      const error = new Error(
        `Server returned non-JSON response. Backend server may not be running. ` +
        `Expected JSON from ${API_BASE_URL}/api/youtube/trending-shorts, ` +
        `but got: ${contentType || 'unknown'}. ` +
        `Make sure to run "npm run server" or "npm run dev:full".`
      );
      logError('Invalid response content type', error, {
        category: 'API',
        component: 'youtubeService',
        contentType: contentType || 'unknown',
      });
      throw error;
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      let errorMessage = `Failed to fetch trending shorts: ${response.statusText}`;
      if (data && data.error) {
        errorMessage = data.error;
      }
      const error = new Error(errorMessage);
      logError('Failed to fetch trending shorts', error, {
        category: 'API',
        component: 'youtubeService',
        status: response.status,
        errorCode: data?.code,
      });
      throw error;
    }
    
    if (!data.success) {
      const error = new Error(data.error || 'Failed to fetch trending shorts');
      logError('API returned unsuccessful response', error, {
        category: 'API',
        component: 'youtubeService',
        errorCode: data?.code,
      });
      throw error;
    }
    
    const duration = Date.now() - startTime;
    const videos = data.videos || [];
    
    logInfo('Trending shorts fetched successfully', {
      category: 'API',
      component: 'youtubeService',
      action: 'fetch-trending',
      videosCount: videos.length,
      duration: `${duration}ms`,
      query: query || 'trending',
    });
    
    return videos;
  } catch (error) {
    const duration = Date.now() - startTime;
    logError('Error fetching trending shorts', error, {
      category: 'API',
      component: 'youtubeService',
      action: 'fetch-trending',
      duration: `${duration}ms`,
    });
    
    // Re-throw with more context if it's a network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Cannot connect to backend server at ${API_BASE_URL}. ` +
        `Please make sure the backend server is running with "npm run server" or "npm run dev:full".`
      );
    }
    throw error;
  }
}

export async function fetchVideoMetadata(videoId: string): Promise<YouTubeVideo> {
  const startTime = Date.now();
  
  try {
    logDebug('Fetching video metadata', {
      category: 'API',
      component: 'youtubeService',
      action: 'fetch-metadata',
      videoId,
    });
    
    const response = await fetch(`${API_BASE_URL}/api/youtube/video/${videoId}`, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Check content type before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      await response.text(); // Read response to avoid memory leak
      const error = new Error(
        `Server returned non-JSON response. Backend server may not be running. ` +
        `Make sure to run "npm run server" or "npm run dev:full".`
      );
      logError('Invalid response content type', error, {
        category: 'API',
        component: 'youtubeService',
        videoId,
        contentType: contentType || 'unknown',
      });
      throw error;
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      let errorMessage = `Failed to fetch video metadata: ${response.statusText}`;
      if (data && data.error) {
        errorMessage = data.error;
      }
      const error = new Error(errorMessage);
      logError('Failed to fetch video metadata', error, {
        category: 'API',
        component: 'youtubeService',
        videoId,
        status: response.status,
      });
      throw error;
    }
    
    if (!data.success) {
      const error = new Error(data.error || 'Failed to fetch video metadata');
      logError('API returned unsuccessful response', error, {
        category: 'API',
        component: 'youtubeService',
        videoId,
      });
      throw error;
    }
    
    const duration = Date.now() - startTime;
    logInfo('Video metadata fetched successfully', {
      category: 'API',
      component: 'youtubeService',
      action: 'fetch-metadata',
      videoId,
      duration: `${duration}ms`,
      videoTitle: data.video?.title?.substring(0, 50),
    });
    
    return data.video;
  } catch (error) {
    const duration = Date.now() - startTime;
    logError('Error fetching video metadata', error, {
      category: 'API',
      component: 'youtubeService',
      action: 'fetch-metadata',
      videoId,
      duration: `${duration}ms`,
    });
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Cannot connect to backend server at ${API_BASE_URL}. ` +
        `Please make sure the backend server is running with "npm run server" or "npm run dev:full".`
      );
    }
    throw error;
  }
}

export async function fetchVideoComments(videoId: string, maxResults: number = 10): Promise<Comment[]> {
  const startTime = Date.now();
  
  try {
    logDebug('Fetching video comments', {
      category: 'API',
      component: 'youtubeService',
      action: 'fetch-comments',
      videoId,
      maxResults,
    });
    
    // Check if backend is available first
    const isBackendAvailable = await checkBackendHealth();
    if (!isBackendAvailable) {
      const error = new Error(
        `Backend server is not running. Please start the backend server with "npm run server" or "npm run dev:full". ` +
        `Expected server at ${API_BASE_URL}`
      );
      logError('Backend server not available', error, {
        category: 'API',
        component: 'youtubeService',
        action: 'fetch-comments',
        videoId,
      });
      throw error;
    }

    const response = await fetch(`${API_BASE_URL}/api/youtube/video/${videoId}/comments?maxResults=${maxResults}`, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Check content type before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      await response.text(); // Read response to avoid memory leak
      const error = new Error(
        `Server returned non-JSON response. Backend server may not be running. ` +
        `Make sure to run "npm run server" or "npm run dev:full".`
      );
      logError('Invalid response content type', error, {
        category: 'API',
        component: 'youtubeService',
        videoId,
        contentType: contentType || 'unknown',
      });
      throw error;
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      let errorMessage = `Failed to fetch video comments: ${response.statusText}`;
      if (data && data.error) {
        errorMessage = data.error;
      }
      const error = new Error(errorMessage);
      logError('Failed to fetch video comments', error, {
        category: 'API',
        component: 'youtubeService',
        videoId,
        status: response.status,
      });
      throw error;
    }
    
    if (!data.success) {
      const error = new Error(data.error || 'Failed to fetch video comments');
      logError('API returned unsuccessful response', error, {
        category: 'API',
        component: 'youtubeService',
        videoId,
      });
      throw error;
    }
    
    const duration = Date.now() - startTime;
    const comments = data.comments || [];
    
    logInfo('Video comments fetched successfully', {
      category: 'API',
      component: 'youtubeService',
      action: 'fetch-comments',
      videoId,
      commentsCount: comments.length,
      duration: `${duration}ms`,
    });
    
    return comments;
  } catch (error) {
    const duration = Date.now() - startTime;
    logError('Error fetching video comments', error, {
      category: 'API',
      component: 'youtubeService',
      action: 'fetch-comments',
      videoId,
      duration: `${duration}ms`,
    });
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Cannot connect to backend server at ${API_BASE_URL}. ` +
        `Please make sure the backend server is running with "npm run server" or "npm run dev:full".`
      );
    }
    throw error;
  }
}

