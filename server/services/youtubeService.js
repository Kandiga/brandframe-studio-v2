import ytdl from '@distube/ytdl-core';

// YouTube Data API v3 configuration
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Cache for video info to reduce API calls
const videoInfoCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Fetches video metadata from YouTube
 */
async function getVideoInfo(videoId) {
  const cacheKey = `video_${videoId}`;
  const cached = videoInfoCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const info = await ytdl.getInfo(videoId, {
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      }
    });
    const videoDetails = info.videoDetails;
    
    const videoData = {
      id: videoDetails.videoId,
      title: videoDetails.title,
      description: videoDetails.description || '',
      thumbnail: videoDetails.thumbnails[videoDetails.thumbnails.length - 1]?.url || '',
      viewCount: parseInt(videoDetails.viewCount) || 0,
      likeCount: parseInt(info.videoDetails.likes) || 0,
      channelName: videoDetails.author?.name || videoDetails.ownerChannelName || 'Unknown',
      url: `https://www.youtube.com/watch?v=${videoDetails.videoId}`,
      duration: parseInt(videoDetails.lengthSeconds) || 0
    };

    videoInfoCache.set(cacheKey, {
      data: videoData,
      timestamp: Date.now()
    });

    return videoData;
  } catch (error) {
    console.error(`Error fetching video info for ${videoId}:`, error.message);
    throw new Error(`Failed to fetch video metadata: ${error.message}`);
  }
}

/**
 * Scrapes YouTube Shorts page to extract video IDs
 * This is a basic implementation that fetches the HTML and extracts video IDs
 */
async function scrapeYouTubeShortsPage() {
  try {
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
      console.warn(`YouTube Shorts page returned status ${response.status}`);
      return [];
    }

    const html = await response.text();
    
    // Extract video IDs from the HTML using multiple patterns
    const videoIds = new Set();
    
    // Pattern 1: "videoId":"..."
    const pattern1 = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
    let match;
    while ((match = pattern1.exec(html)) !== null) {
      videoIds.add(match[1]);
    }
    
    // Pattern 2: /shorts/VIDEO_ID
    const pattern2 = /\/shorts\/([a-zA-Z0-9_-]{11})/g;
    while ((match = pattern2.exec(html)) !== null) {
      videoIds.add(match[1]);
    }
    
    return Array.from(videoIds);
  } catch (error) {
    console.error('Error scraping YouTube Shorts page:', error.message);
    return [];
  }
}

/**
 * Fetches trending YouTube Shorts using YouTube Data API v3
 * Falls back to scraping if API key is not configured
 */
async function fetchTrendingShortsWithAPI(limit = 20, query) {
  if (!YOUTUBE_API_KEY) {
    console.log('YouTube API key not found, falling back to scraping');
    return null;
  }

  try {
    // Combine user query with 'shorts' keyword for better results
    // If user searches for 'ai', we search for 'ai shorts' to get better matches
    // Avoid duplication if query already contains 'shorts'
    let searchQuery = 'shorts';
    if (query) {
      const lowerQuery = query.toLowerCase();
      if (lowerQuery.includes('shorts')) {
        searchQuery = query; // Use query as-is if it already contains 'shorts'
      } else {
        searchQuery = `${query} shorts`.trim(); // Add 'shorts' to the query
      }
    }
    console.log('Using YouTube Data API v3 to fetch trending Shorts...');
    console.log(`API Key present: ${!!YOUTUBE_API_KEY}, length: ${YOUTUBE_API_KEY ? YOUTUBE_API_KEY.length : 0}`);
    console.log(`Search query: "${searchQuery}" (original: "${query || 'default'}")`);
    
    // Search for YouTube Shorts (videos under 60 seconds, sorted by view count)
    const searchUrl = new URL(`${YOUTUBE_API_BASE_URL}/search`);
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('videoDuration', 'short'); // Only short videos
    searchUrl.searchParams.set('maxResults', Math.min(limit * 2, 50).toString()); // API limit is 50
    searchUrl.searchParams.set('order', 'viewCount'); // Sort by view count (trending)
    searchUrl.searchParams.set('q', searchQuery); // Search query
    searchUrl.searchParams.set('key', YOUTUBE_API_KEY);

    console.log(`Fetching from: ${searchUrl.toString().replace(YOUTUBE_API_KEY, 'HIDDEN')}`);
    const response = await fetch(searchUrl.toString());
    
    console.log(`Response status: ${response.status}, ok: ${response.ok}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API Error:', errorData);
      throw new Error(`YouTube API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log(`API returned ${data.items ? data.items.length : 0} items`);
    
    if (!data.items || data.items.length === 0) {
      console.warn('No videos found from YouTube API');
      return null;
    }

    // Extract video IDs
    const videoIds = data.items.map(item => item.id.videoId).filter(Boolean);
    console.log(`Found ${videoIds.length} video IDs from YouTube API:`, videoIds.slice(0, 3));

    // Fetch detailed metadata for each video
    console.log(`Calling fetchVideoDetailsBatch with ${videoIds.length} video IDs`);
    const result = await fetchVideoDetailsBatch(videoIds, limit);
    console.log(`fetchVideoDetailsBatch returned ${result ? result.length : 0} videos`);
    if (!result || result.length === 0) {
      console.warn('fetchVideoDetailsBatch returned empty array, checking why...');
    }
    return result;
    
  } catch (error) {
    console.error('Error fetching from YouTube API:', error.message);
    console.error('Error stack:', error.stack);
    return null; // Fall back to scraping
  }
}

/**
 * Fetches detailed video information in batches using YouTube Data API v3
 */
async function fetchVideoDetailsBatch(videoIds, limit) {
  console.log(`[fetchVideoDetailsBatch] Called with ${videoIds.length} video IDs, API key: ${!!YOUTUBE_API_KEY}`);
  if (!YOUTUBE_API_KEY || videoIds.length === 0) {
    console.warn(`[fetchVideoDetailsBatch] Early return - API key: ${!!YOUTUBE_API_KEY}, videoIds: ${videoIds.length}`);
    return [];
  }

  try {
    // YouTube API allows up to 50 videos per request
    const batches = [];
    for (let i = 0; i < videoIds.length; i += 50) {
      batches.push(videoIds.slice(i, i + 50));
    }
    console.log(`[fetchVideoDetailsBatch] Created ${batches.length} batches`);

    const allVideos = [];
    
    for (const batch of batches) {
      console.log(`[fetchVideoDetailsBatch] Processing batch of ${batch.length} videos`);
      const detailsUrl = new URL(`${YOUTUBE_API_BASE_URL}/videos`);
      detailsUrl.searchParams.set('part', 'snippet,statistics,contentDetails');
      detailsUrl.searchParams.set('id', batch.join(','));
      detailsUrl.searchParams.set('key', YOUTUBE_API_KEY);

      const response = await fetch(detailsUrl.toString());
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Failed to fetch video details batch: ${response.status}`, errorData);
        continue;
      }

      const data = await response.json();
      console.log(`Fetched ${data.items ? data.items.length : 0} video details from API`);
      
      if (data.items) {
        const videos = data.items.map(item => {
          const duration = parseDuration(item.contentDetails.duration);
          return {
            id: item.id,
            title: item.snippet.title,
            description: item.snippet.description || '',
            thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url || '',
            viewCount: parseInt(item.statistics.viewCount) || 0,
            likeCount: parseInt(item.statistics.likeCount) || 0,
            channelName: item.snippet.channelTitle || 'Unknown',
            url: `https://www.youtube.com/watch?v=${item.id}`,
            duration: duration
          };
        });
        
        allVideos.push(...videos);
      }
    }

    console.log(`Total videos fetched: ${allVideos.length}`);
    if (allVideos.length > 0) {
      console.log(`Sample video durations:`, allVideos.slice(0, 5).map(v => ({ id: v.id, duration: v.duration })));
    }
    
    // Filter only Shorts (60 seconds or less) and sort by view count
    // Note: YouTube API's videoDuration=short sometimes returns videos up to 4 minutes
    // So we filter to ensure we only get true Shorts (<=60s)
    let validVideos = allVideos
      .filter(v => v.duration > 0 && v.duration <= 60)
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, limit);

    console.log(`After filtering (<=60s): ${validVideos.length} valid Shorts videos from API`);
    if (validVideos.length === 0 && allVideos.length > 0) {
      console.warn(`Warning: All ${allVideos.length} videos were filtered out. Sample durations:`, 
        allVideos.slice(0, 3).map(v => `${v.duration}s`));
      // If no videos pass the filter, return top videos anyway (they might be Shorts)
      // This is a fallback in case duration parsing fails
      validVideos = allVideos
        .sort((a, b) => b.viewCount - a.viewCount)
        .slice(0, limit);
      console.log(`Fallback: Returning ${validVideos.length} videos without duration filter`);
    }
    return validVideos;
    
  } catch (error) {
    console.error('Error fetching video details:', error.message);
    return [];
  }
}

/**
 * Parses ISO 8601 duration format (e.g., "PT1M30S") to seconds
 */
function parseDuration(duration) {
  if (!duration) return 0;
  
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Fetches trending YouTube Shorts
 * Uses YouTube Data API v3 if available, otherwise falls back to scraping
 */
async function fetchTrendingShorts(limit = 20, query) {
  try {
    const searchQuery = query || undefined;
    console.log(`Fetching trending YouTube Shorts...${searchQuery ? ` (query: "${searchQuery}")` : ''}`);
    
    // Try YouTube Data API v3 first
    const apiVideos = await fetchTrendingShortsWithAPI(limit, searchQuery);
    if (apiVideos && apiVideos.length > 0) {
      return apiVideos;
    }
    
    // Fall back to scraping
    console.log('Falling back to web scraping...');
    let videoIds = await scrapeYouTubeShortsPage();
    console.log(`Found ${videoIds.length} video IDs from scraping`);
    
    // If scraping returned empty or very few results, use demo video IDs
    if (videoIds.length < 5) {
      console.warn('Scraping returned few results, using demo video IDs');
      // Demo: Some popular Shorts video IDs (you can replace these with actual trending IDs)
      // Note: These are example IDs - replace with actual Shorts video IDs
      videoIds = [
        // Add actual YouTube Shorts video IDs here for testing
        // Example: 'dQw4w9WgXcQ' (this is just an example, not a Short)
      ];
    }
    
    if (videoIds.length === 0) {
      console.warn('No video IDs found. Returning empty array.');
      return [];
    }
    
    console.log(`Fetching metadata for ${Math.min(videoIds.length, limit * 2)} videos...`);
    
    // Fetch metadata for each video ID in parallel (with limit)
    const videoPromises = videoIds.slice(0, limit * 2).map(id => 
      getVideoInfo(id).catch(err => {
        console.error(`Failed to fetch video ${id}:`, err.message);
        return null;
      })
    );
    
    const videos = await Promise.all(videoPromises);
    console.log(`Successfully fetched ${videos.filter(v => v !== null).length} videos`);
    
    // Filter out failed requests, only Shorts (60 seconds or less), and sort by view count
    const validVideos = videos
      .filter(v => v !== null)
      .filter(v => v.duration <= 60) // Only Shorts (60 seconds or less)
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, limit);
    
    console.log(`Returning ${validVideos.length} valid Shorts videos`);
    return validVideos;
      
  } catch (error) {
    console.error('Error fetching trending shorts:', error);
    // Return empty array instead of throwing to allow frontend to show helpful message
    return [];
  }
}

/**
 * Fetches metadata for a specific video
 */
async function fetchVideoMetadata(videoId) {
  return await getVideoInfo(videoId);
}

export { fetchTrendingShorts, fetchVideoMetadata, getVideoInfo };

