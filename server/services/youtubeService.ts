import ytdl from '@distube/ytdl-core';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger, logError, logInfo, logDebug, logWarn } from '../utils/logger.js';
import { trackOperation } from '../utils/performanceMonitor.js';

// YouTube Data API v3 configuration
let YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_KEY || process.env.YT_API_KEY;

// If not found in env, try to load from .env file directly
if (!YOUTUBE_API_KEY) {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const envPath = join(__dirname, '..', '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const match = envContent.match(/YOUTUBE_API_KEY=(.+)/);
    if (match && match[1]) {
      YOUTUBE_API_KEY = match[1].trim();
      process.env.YOUTUBE_API_KEY = YOUTUBE_API_KEY;
      logInfo('Loaded YOUTUBE_API_KEY from .env file', {
        category: 'API',
        keyPrefix: YOUTUBE_API_KEY.substring(0, 15),
      });
    }
  } catch (error) {
    logWarn('Could not load .env file', {
      category: 'API',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Log API key status on module load
if (YOUTUBE_API_KEY) {
  logInfo('YouTube API Key loaded', {
    category: 'API',
    keyPrefix: YOUTUBE_API_KEY.substring(0, 15),
  });
} else {
  logError('YouTube API Key NOT FOUND', new Error('YOUTUBE_API_KEY missing'), {
    category: 'API',
  });
}

// Types
import { Comment, YouTubeVideo } from '../../types.js';

// Re-export for backward compatibility
export type { YouTubeVideo, Comment };

interface CacheEntry {
  data: YouTubeVideo;
  timestamp: number;
}

interface YouTubeSearchItem {
  id: {
    videoId: string;
  };
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
}

interface YouTubeVideoItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      high?: { url: string };
      default: { url: string };
    };
    channelTitle: string;
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount?: string;
  };
  contentDetails: {
    duration: string;
  };
}

interface YouTubeCommentItem {
  id: string;
  snippet: {
    topLevelComment: {
      snippet: {
        authorDisplayName: string;
        textDisplay: string;
        likeCount: number;
        publishedAt: string;
      };
    };
  };
}

interface YouTubeCommentThreadResponse {
  items?: YouTubeCommentItem[];
}

interface YouTubeVideoDetailsResponse {
  items?: YouTubeVideoItem[];
}

// Cache for video info to reduce API calls
const videoInfoCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Fetches video metadata from YouTube
 */
async function getVideoInfo(videoId: string): Promise<YouTubeVideo> {
  const cacheKey = `video_${videoId}`;
  const cached = videoInfoCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    logDebug('Video info cache hit', {
      category: 'API',
      videoId,
      cacheAge: `${Math.round((Date.now() - cached.timestamp) / 1000)}s`,
    });
    return cached.data;
  }

  const startTime = Date.now();
  try {
    logDebug('Fetching video info', {
      category: 'API',
      videoId,
    });

    const info = await trackOperation(
      'youtube-get-video-info',
      () => ytdl.getInfo(videoId, {
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        }
      }),
      { videoId }
    );
    
    const videoDetails = info.videoDetails;
    
    const videoData: YouTubeVideo = {
      id: videoDetails.videoId,
      title: videoDetails.title,
      description: videoDetails.description || '',
      thumbnail: videoDetails.thumbnails[videoDetails.thumbnails.length - 1]?.url || '',
      viewCount: parseInt(videoDetails.viewCount) || 0,
      likeCount: parseInt(info.videoDetails.likes || '0') || 0,
      channelName: videoDetails.author?.name || videoDetails.ownerChannelName || 'Unknown',
      url: `https://www.youtube.com/watch?v=${videoDetails.videoId}`,
      duration: parseInt(videoDetails.lengthSeconds) || 0
    };

    videoInfoCache.set(cacheKey, {
      data: videoData,
      timestamp: Date.now()
    });

    const duration = Date.now() - startTime;
    logInfo('Video info fetched successfully', {
      category: 'API',
      videoId,
      duration: `${duration}ms`,
      title: videoData.title.substring(0, 50),
    });

    return videoData;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError(`Error fetching video info for ${videoId}`, error, {
      category: 'API',
      videoId,
      duration: `${duration}ms`,
    });
    throw new Error(`Failed to fetch video metadata: ${errorMessage}`);
  }
}

/**
 * Scrapes YouTube Shorts page to extract video IDs
 * This is a basic implementation that fetches the HTML and extracts video IDs
 */
async function scrapeYouTubeShortsPage(): Promise<string[]> {
  const startTime = Date.now();
  try {
    logDebug('Scraping YouTube Shorts page', {
      category: 'API',
    });

    // Try to fetch YouTube Shorts page
    const response = await fetch('https://www.youtube.com/shorts', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
      }
    });

    if (!response.ok) {
      logWarn(`YouTube Shorts page returned status ${response.status}`, {
        category: 'API',
        status: response.status,
      });
      return [];
    }

    const html = await response.text();
    
    // Extract video IDs from the HTML using multiple patterns
    const videoIds = new Set<string>();
    
    // Pattern 1: "videoId":"..."
    const pattern1 = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
    let match: RegExpExecArray | null;
    while ((match = pattern1.exec(html)) !== null) {
      videoIds.add(match[1]);
    }
    
    // Pattern 2: /shorts/VIDEO_ID
    const pattern2 = /\/shorts\/([a-zA-Z0-9_-]{11})/g;
    while ((match = pattern2.exec(html)) !== null) {
      videoIds.add(match[1]);
    }
    
    const duration = Date.now() - startTime;
    logInfo('YouTube Shorts page scraped', {
      category: 'API',
      videoIdsCount: videoIds.size,
      duration: `${duration}ms`,
    });
    
    return Array.from(videoIds);
  } catch (error) {
    const duration = Date.now() - startTime;
    logError('Error scraping YouTube Shorts page', error, {
      category: 'API',
      duration: `${duration}ms`,
    });
    return [];
  }
}

/**
 * Fetches trending YouTube Shorts using YouTube Data API v3
 * Falls back to scraping if API key is not configured
 */
async function fetchTrendingShortsWithAPI(limit: number = 20, query?: string): Promise<YouTubeVideo[] | null> {
  const startTime = Date.now();
  logInfo('Starting YouTube API search', {
    category: 'API',
    limit,
    query: query || 'trending',
    hasApiKey: !!YOUTUBE_API_KEY,
  });
  
  if (!YOUTUBE_API_KEY) {
    logError('YouTube API key not found', new Error('YOUTUBE_API_KEY missing'), {
      category: 'API',
    });
    return [];
  }

  try {
    // Combine user query with 'shorts' keyword for better results
    // If user searches for 'ai', we search for 'ai shorts' to get better matches
    // Avoid duplication if query already contains 'shorts'
    let searchQuery = 'shorts';
    if (query && query.trim()) {
      const trimmedQuery = query.trim();
      const lowerQuery = trimmedQuery.toLowerCase();
      // Don't add 'shorts' if query already contains it or is very specific
      if (lowerQuery.includes('shorts') || lowerQuery.includes('short')) {
        searchQuery = trimmedQuery; // Use query as-is
      } else {
        // Try with 'shorts' keyword first
        searchQuery = `${trimmedQuery} shorts`.trim();
      }
    }
    
    logDebug('YouTube API search query prepared', {
      category: 'API',
      searchQuery,
      originalQuery: query || 'trending',
    });
    
    // Search for YouTube Shorts (videos under 60 seconds)
    // Use 'relevance' order when searching with query, 'viewCount' for trending
    const searchUrl = new URL(`${YOUTUBE_API_BASE_URL}/search`);
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('videoDuration', 'short'); // Only short videos
    searchUrl.searchParams.set('maxResults', Math.min(limit * 2, 50).toString()); // API limit is 50
    searchUrl.searchParams.set('order', query ? 'relevance' : 'viewCount'); // Relevance for search, viewCount for trending
    searchUrl.searchParams.set('q', searchQuery); // Search query
    searchUrl.searchParams.set('key', YOUTUBE_API_KEY);

    const apiCallStartTime = Date.now();
    const response = await trackOperation(
      'youtube-api-search',
      () => fetch(searchUrl.toString()),
      { searchQuery, limit }
    );
    
    const apiCallDuration = Date.now() - apiCallStartTime;
    
    logDebug('YouTube API search response received', {
      category: 'API',
      status: response.status,
      statusText: response.statusText,
      duration: `${apiCallDuration}ms`,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { error?: { message?: string; errors?: Array<{ message?: string }> } };
      const errorMsg = errorData.error?.message || errorData.error?.errors?.[0]?.message || response.statusText;
      const fullError = `YouTube API error: ${response.status} - ${errorMsg}`;
      logError('YouTube API search failed', new Error(fullError), {
        category: 'API',
        status: response.status,
        searchQuery,
        errorData,
      });
      throw new Error(fullError);
    }

    const data = await response.json() as YouTubeSearchResponse;
    
    logDebug('YouTube API search response parsed', {
      category: 'API',
      hasItems: !!data.items,
      itemsCount: data.items?.length || 0,
    });
    
    if (!data.items || data.items.length === 0) {
      logWarn('No videos found from YouTube API', {
        category: 'API',
        searchQuery,
        hasError: !!data.error,
      });
      
      if (data.error) {
        logError('YouTube API error in response', new Error(JSON.stringify(data.error)), {
          category: 'API',
          searchQuery,
          error: data.error,
        });
      }
      
      // Try multiple fallback strategies if we have a query
      if (query && query.trim()) {
        const trimmedQuery = query.trim();
        const lowerQuery = trimmedQuery.toLowerCase();
        
        // Strategy 1: Try without 'shorts' keyword but keep videoDuration=short
        if (!lowerQuery.includes('shorts') && !lowerQuery.includes('short')) {
          logDebug('Retry strategy 1: Searching without shorts keyword', {
            category: 'API',
            query: trimmedQuery,
          });
          const retryUrl1 = new URL(`${YOUTUBE_API_BASE_URL}/search`);
          retryUrl1.searchParams.set('part', 'snippet');
          retryUrl1.searchParams.set('type', 'video');
          retryUrl1.searchParams.set('videoDuration', 'short');
          retryUrl1.searchParams.set('maxResults', Math.min(limit * 3, 50).toString());
          retryUrl1.searchParams.set('order', 'relevance');
          retryUrl1.searchParams.set('q', trimmedQuery);
          retryUrl1.searchParams.set('key', YOUTUBE_API_KEY);
          
          const retryResponse1 = await fetch(retryUrl1.toString());
          if (retryResponse1.ok) {
            const retryData1 = await retryResponse1.json() as YouTubeSearchResponse;
            if (retryData1.items && retryData1.items.length > 0) {
              const retryVideoIds1 = retryData1.items
                .map(item => item.id.videoId)
                .filter((id): id is string => Boolean(id));
              logDebug('Retry strategy 1 found video IDs', {
                category: 'API',
                count: retryVideoIds1.length,
              });
              const retryVideos1 = await fetchVideoDetailsBatch(retryVideoIds1, limit);
              if (retryVideos1.length > 0) {
                return retryVideos1;
              }
            }
          }
        }
        
        // Strategy 2: Try without videoDuration restriction (we'll filter later)
        logDebug('Retry strategy 2: Searching without videoDuration restriction', {
          category: 'API',
          query: searchQuery,
        });
        const retryUrl2 = new URL(`${YOUTUBE_API_BASE_URL}/search`);
        retryUrl2.searchParams.set('part', 'snippet');
        retryUrl2.searchParams.set('type', 'video');
        // Remove videoDuration restriction
        retryUrl2.searchParams.set('maxResults', Math.min(limit * 3, 50).toString());
        retryUrl2.searchParams.set('order', 'relevance');
        retryUrl2.searchParams.set('q', searchQuery);
        retryUrl2.searchParams.set('key', YOUTUBE_API_KEY);
        
        const retryResponse2 = await fetch(retryUrl2.toString());
        if (retryResponse2.ok) {
          const retryData2 = await retryResponse2.json() as YouTubeSearchResponse;
          if (retryData2.items && retryData2.items.length > 0) {
            const retryVideoIds2 = retryData2.items
              .map(item => item.id.videoId)
              .filter((id): id is string => Boolean(id));
            logDebug('Retry strategy 2 found video IDs', {
              category: 'API',
              count: retryVideoIds2.length,
            });
            const retryVideos2 = await fetchVideoDetailsBatch(retryVideoIds2, limit);
            if (retryVideos2.length > 0) {
              return retryVideos2;
            }
          }
        }
      }
      
      return [];
    }

    // Extract video IDs
    const videoIds = data.items
      .map(item => item.id.videoId)
      .filter((id): id is string => Boolean(id));
    
    logDebug('Video IDs extracted from YouTube API', {
      category: 'API',
      count: videoIds.length,
      searchQuery,
    });

    if (videoIds.length === 0) {
      logWarn('No valid video IDs extracted from search results', {
        category: 'API',
      });
      return [];
    }

    // Fetch detailed metadata for each video
    const videos = await fetchVideoDetailsBatch(videoIds, limit);
    
    const totalDuration = Date.now() - startTime;
    logInfo('YouTube API search completed', {
      category: 'API',
      videosCount: videos.length,
      searchQuery,
      duration: `${totalDuration}ms`,
    });
    
    if (videos.length === 0 && videoIds.length > 0) {
      logWarn('No videos returned after fetching details', {
        category: 'API',
        videoIdsCount: videoIds.length,
        sampleIds: videoIds.slice(0, 5),
      });
    }
    
    return videos;
    
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError(`Error fetching from YouTube API for query "${query || 'trending'}"`, error, {
      category: 'API',
      query: query || 'trending',
      duration: `${totalDuration}ms`,
    });
    // If there's a specific query, don't fall back to scraping - return empty array
    // Scraping doesn't support query filtering and would return wrong results
    if (query) {
      logWarn('Cannot fall back to scraping for specific query', {
        category: 'API',
        query,
      });
      return [];
    }
    return null; // Only fall back to scraping for trending (no query)
  }
}

/**
 * Fetches detailed video information in batches using YouTube Data API v3
 */
async function fetchVideoDetailsBatch(videoIds: string[], limit: number): Promise<YouTubeVideo[]> {
  if (!YOUTUBE_API_KEY || videoIds.length === 0) {
    return [];
  }

  try {
    // YouTube API allows up to 50 videos per request
    const batches: string[][] = [];
    for (let i = 0; i < videoIds.length; i += 50) {
      batches.push(videoIds.slice(i, i + 50));
    }

    const allVideos: YouTubeVideo[] = [];
    
    for (const batch of batches) {
      const detailsUrl = new URL(`${YOUTUBE_API_BASE_URL}/videos`);
      detailsUrl.searchParams.set('part', 'snippet,statistics,contentDetails');
      detailsUrl.searchParams.set('id', batch.join(','));
      detailsUrl.searchParams.set('key', YOUTUBE_API_KEY);

      const response = await fetch(detailsUrl.toString());
      
      if (!response.ok) {
        logError(`Failed to fetch video details batch`, new Error(`Status: ${response.status}`), {
          category: 'API',
          status: response.status,
          batchSize: batch.length,
        });
        continue;
      }

      const data = await response.json() as YouTubeVideoDetailsResponse;
      
      if (data.items) {
        const videos: YouTubeVideo[] = data.items.map(item => {
          const duration = parseDuration(item.contentDetails.duration);
          const viewCount = parseInt(item.statistics.viewCount) || 0;
          const likeCount = parseInt(item.statistics.likeCount) || 0;
          const commentCount = parseInt(item.statistics.commentCount || '0') || 0;
          
          // Calculate engagement rate: (likes + comments) / views * 100
          const engagementRate = viewCount > 0 
            ? ((likeCount + commentCount) / viewCount) * 100 
            : 0;
          
          return {
            id: item.id,
            title: item.snippet.title,
            description: item.snippet.description || '',
            thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url || '',
            viewCount,
            likeCount,
            commentCount,
            engagementRate: parseFloat(engagementRate.toFixed(2)),
            channelName: item.snippet.channelTitle || 'Unknown',
            url: `https://www.youtube.com/watch?v=${item.id}`,
            duration
          };
        });
        
        allVideos.push(...videos);
      }
    }

    // Filter Shorts (60 seconds or less) but be lenient
    // YouTube API's videoDuration=short can sometimes return videos up to 4 minutes
    // Also, if search was done without videoDuration restriction, we need to filter
    let validVideos = allVideos
      .filter(v => v.duration > 0 && v.duration <= 60)
      .sort((a, b) => b.viewCount - a.viewCount);

    // If we have valid Shorts, return them
    if (validVideos.length > 0) {
      return validVideos.slice(0, limit);
    }

    // If filtering removed all videos but we have videos, return top videos anyway
    // This handles cases where duration parsing might fail or videos are slightly longer
    // But prioritize shorter videos
    if (allVideos.length > 0 && validVideos.length === 0) {
      logWarn('All videos filtered out (duration > 60s), returning top videos sorted by duration', {
        category: 'API',
        totalVideos: allVideos.length,
      });
      validVideos = allVideos
        .sort((a, b) => {
          // Sort by duration first (shorter is better), then by view count
          if (a.duration !== b.duration) {
            return a.duration - b.duration;
          }
          return b.viewCount - a.viewCount;
        })
        .slice(0, limit);
    }

    logInfo('Video details batch fetched', {
      category: 'API',
      returnedCount: validVideos.length,
      totalFetched: allVideos.length,
    });
    return validVideos;
    
  } catch (error) {
    logError('Error fetching video details', error, {
      category: 'API',
    });
    return [];
  }
}

/**
 * Parses ISO 8601 duration format (e.g., "PT1M30S") to seconds
 */
function parseDuration(duration: string): number {
  if (!duration) return 0;
  
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Fetches trending YouTube Shorts
 * Uses YouTube Data API v3 if available, otherwise falls back to scraping
 */
export async function fetchTrendingShorts(limit: number = 20, query?: string): Promise<YouTubeVideo[]> {
  const startTime = Date.now();
  try {
    logInfo('Fetching trending YouTube Shorts', {
      category: 'API',
      limit,
      query: query || 'trending',
    });
    
    // Try YouTube Data API v3 first
    const apiVideos = await fetchTrendingShortsWithAPI(limit, query);
    
    // If we got results (even empty array), return them
    // Empty array means no results found for the query (which is valid)
    if (apiVideos !== null) {
      const duration = Date.now() - startTime;
      logInfo('Trending shorts fetched successfully', {
        category: 'API',
        videosCount: apiVideos.length,
        duration: `${duration}ms`,
      });
      return apiVideos;
    }
    
    // Only fall back to scraping if there's no specific query
    // Scraping doesn't support query filtering
    if (query) {
      logWarn('Cannot use scraping for specific query', {
        category: 'API',
        query,
      });
      return [];
    }
    
    // Fall back to scraping only for trending (no query)
    logInfo('Falling back to web scraping for trending videos', {
      category: 'API',
    });
    let videoIds = await scrapeYouTubeShortsPage();
    
    logDebug('Video IDs found from scraping', {
      category: 'API',
      count: videoIds.length,
    });
    
    // If scraping returned empty or very few results, use demo video IDs
    if (videoIds.length < 5) {
      logWarn('Scraping returned few results', {
        category: 'API',
        count: videoIds.length,
      });
      // Demo: Some popular Shorts video IDs (you can replace these with actual trending IDs)
      // Note: These are example IDs - replace with actual Shorts video IDs
      videoIds = [
        // Add actual YouTube Shorts video IDs here for testing
        // Example: 'dQw4w9WgXcQ' (this is just an example, not a Short)
      ];
    }
    
    if (videoIds.length === 0) {
      logWarn('No video IDs found', {
        category: 'API',
      });
      return [];
    }
    
    logDebug('Fetching metadata for videos', {
      category: 'API',
      count: Math.min(videoIds.length, limit * 2),
    });
    
    // Fetch metadata for each video ID in parallel (with limit)
    const videoPromises = videoIds.slice(0, limit * 2).map(id => 
      getVideoInfo(id).catch((err: Error) => {
        logError(`Failed to fetch video ${id}`, err, {
          category: 'API',
          videoId: id,
        });
        return null;
      })
    );
    
    const videos = await Promise.all(videoPromises);
    const successfulCount = videos.filter(v => v !== null).length;
    
    logInfo('Video metadata fetched', {
      category: 'API',
      successful: successfulCount,
      total: videos.length,
    });
    
    // Filter out failed requests, only Shorts (60 seconds or less), and sort by view count
    const validVideos = videos
      .filter((v): v is YouTubeVideo => v !== null)
      .filter(v => v.duration <= 60) // Only Shorts (60 seconds or less)
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, limit);
    
    const duration = Date.now() - startTime;
    logInfo('Trending shorts fetched successfully', {
      category: 'API',
      validVideosCount: validVideos.length,
      duration: `${duration}ms`,
    });
    
    return validVideos;
      
  } catch (error) {
    const duration = Date.now() - startTime;
    logError('Error fetching trending shorts', error, {
      category: 'API',
      duration: `${duration}ms`,
    });
    // Return empty array instead of throwing to allow frontend to show helpful message
    return [];
  }
}

/**
 * Fetches metadata for a specific video
 */
export async function fetchVideoMetadata(videoId: string): Promise<YouTubeVideo> {
  return await getVideoInfo(videoId);
}

/**
 * Fetches comments for a video using YouTube Data API v3
 */
export async function fetchVideoComments(videoId: string, maxResults: number = 10): Promise<Comment[]> {
  const startTime = Date.now();
  
  if (!YOUTUBE_API_KEY) {
    logWarn('YouTube API key not found, cannot fetch comments', {
      category: 'API',
      videoId,
    });
    return [];
  }

  try {
    logDebug('Fetching video comments', {
      category: 'API',
      videoId,
      maxResults,
    });

    const commentsUrl = new URL(`${YOUTUBE_API_BASE_URL}/commentThreads`);
    commentsUrl.searchParams.set('part', 'snippet');
    commentsUrl.searchParams.set('videoId', videoId);
    commentsUrl.searchParams.set('maxResults', Math.min(maxResults, 100).toString()); // API limit is 100
    commentsUrl.searchParams.set('order', 'relevance'); // Get most relevant comments
    commentsUrl.searchParams.set('key', YOUTUBE_API_KEY);

    const response = await trackOperation(
      'youtube-api-comments',
      () => fetch(commentsUrl.toString()),
      { videoId, maxResults }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } };
      logError('Failed to fetch comments', new Error(`${response.status} - ${errorData.error?.message || response.statusText}`), {
        category: 'API',
        videoId,
        status: response.status,
      });
      return [];
    }

    const data = await response.json() as YouTubeCommentThreadResponse;
    
    if (!data.items || data.items.length === 0) {
      logDebug('No comments found', {
        category: 'API',
        videoId,
      });
      return [];
    }

    const comments: Comment[] = data.items.map(item => ({
      id: item.id,
      author: item.snippet.topLevelComment.snippet.authorDisplayName,
      text: item.snippet.topLevelComment.snippet.textDisplay,
      likeCount: item.snippet.topLevelComment.snippet.likeCount,
      publishedAt: item.snippet.topLevelComment.snippet.publishedAt
    }));

    const duration = Date.now() - startTime;
    logInfo('Video comments fetched successfully', {
      category: 'API',
      videoId,
      commentsCount: comments.length,
      duration: `${duration}ms`,
    });

    return comments;
  } catch (error) {
    const duration = Date.now() - startTime;
    logError('Error fetching video comments', error, {
      category: 'API',
      videoId,
      duration: `${duration}ms`,
    });
    return [];
  }
}

export { getVideoInfo };

