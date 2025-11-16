import React, { useState } from 'react';
import { YouTubeVideo } from '../types';
import { fetchTrendingShorts } from '../services/youtubeService';
import VideoCard from './VideoCard';

interface ViralShortsViewProps {
  onVideoSelect: (video: YouTubeVideo) => void;
}

interface SearchResult {
  query: string;
  videos: YouTubeVideo[];
  timestamp: number;
}

const ViralShortsView: React.FC<ViralShortsViewProps> = ({ onVideoSelect }) => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeQuery, setActiveQuery] = useState<string>('');
  const [searchHistory, setSearchHistory] = useState<SearchResult[]>([]);

  const loadVideos = async (query: string, addToHistory: boolean = true) => {
    if (!query || !query.trim()) {
      setError('Please enter a search term');
      return;
    }

    setIsLoading(true);
    setError(null);
    setVideos([]); // Clear previous videos immediately to show loading state
    
    try {
      const trimmedQuery = query.trim();
      
      // Check if we already have this search in history
      const existingSearch = searchHistory.find(s => s.query.toLowerCase() === trimmedQuery.toLowerCase());
      if (existingSearch) {
        // Use cached results
        setVideos(existingSearch.videos);
        setActiveQuery(trimmedQuery);
        setIsLoading(false);
        return;
      }

      console.log(`[ViralShortsView] Starting search for: "${trimmedQuery}"`);
      const trendingVideos = await fetchTrendingShorts(20, trimmedQuery);
      console.log(`[ViralShortsView] Search completed. Found ${trendingVideos.length} videos`);
      
      setVideos(trendingVideos);
      setActiveQuery(trimmedQuery);
      
      // Show helpful message if no results
      if (trendingVideos.length === 0) {
        setError(`No videos found for "${trimmedQuery}". Try a different search term or check if YouTube API key is configured.`);
      }
      
      // Add to search history even if empty (so user can see they searched)
      if (addToHistory) {
        const newSearch: SearchResult = {
          query: trimmedQuery,
          videos: trendingVideos,
          timestamp: Date.now()
        };
        setSearchHistory(prev => {
          // Remove old search with same query (case-insensitive) and add new one at the beginning
          const filtered = prev.filter(s => s.query.toLowerCase() !== trimmedQuery.toLowerCase());
          return [newSearch, ...filtered].slice(0, 10); // Keep last 10 searches
        });
      }
    } catch (err) {
      console.error('Failed to load trending shorts:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load trending YouTube Shorts';
      setError(errorMessage);
      setVideos([]); // Clear videos on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    const query = searchQuery.trim();
    if (!query) {
      setError('Please enter a search term');
      return;
    }
    loadVideos(query);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div className="flex-1">
            <h1 className="text-4xl font-extrabold text-gray-900">Viral Shorts</h1>
            <p className="mt-2 text-lg text-gray-600">
              Browse trending YouTube Shorts and use them as inspiration for your storyboard.
            </p>
            {activeQuery && (
              <p className="mt-1 text-sm text-indigo-600 font-medium">
                Showing {videos.length} results for: "{activeQuery}"
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {activeQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveQuery('');
                  setVideos([]);
                  setError(null);
                }}
                disabled={isLoading}
                className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg shadow-sm inline-flex items-center gap-2 transition-colors"
              >
                Clear Search
              </button>
            )}
          </div>
        </div>

        {/* Search History */}
        {searchHistory.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Recent Searches:</h2>
              <button
                onClick={() => setSearchHistory([])}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear History
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((search) => (
                <button
                  key={`${search.query}-${search.timestamp}`}
                  onClick={() => {
                    setSearchQuery(search.query);
                    loadVideos(search.query, false); // Don't add to history again
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                    activeQuery.toLowerCase() === search.query.toLowerCase()
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title={`Click to view ${search.videos.length} videos for "${search.query}"`}
                >
                  <span>{search.query}</span>
                  <span className={`text-xs ${
                    activeQuery.toLowerCase() === search.query.toLowerCase()
                      ? 'text-indigo-100'
                      : 'text-gray-500'
                  }`}>
                    ({search.videos.length})
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6 flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search for viral shorts by topic (e.g., cooking, fitness, comedy)..."
              className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500"
            />
            <svg
              className="absolute left-3 top-3.5 w-5 h-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg shadow-sm inline-flex items-center gap-2 transition-colors"
          >
            <svg
              className="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Search
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-96">
            <svg
              className="animate-spin h-12 w-12 text-indigo-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="mt-4 text-lg font-semibold text-gray-700">
              {activeQuery ? `Searching for "${activeQuery}"...` : 'Loading trending shorts...'}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              This may take a few seconds...
            </p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Videos</h3>
                <p className="text-red-600 whitespace-pre-wrap">{error}</p>
                {error.includes('backend server') || error.includes('Backend server') ? (
                  <div className="mt-4 p-3 bg-red-100 rounded border border-red-300">
                    <p className="text-sm font-medium text-red-900 mb-2">Quick Fix:</p>
                    <ol className="text-sm text-red-800 list-decimal list-inside space-y-1">
                      <li>Open a terminal in the project directory</li>
                      <li>Run: <code className="bg-red-200 px-1 rounded">npm run dev:full</code></li>
                      <li>Or run separately: <code className="bg-red-200 px-1 rounded">npm run server</code> in one terminal, and <code className="bg-red-200 px-1 rounded">npm run dev</code> in another</li>
                    </ol>
                  </div>
                ) : null}
                <button
                  onClick={() => {
                    if (activeQuery) {
                      loadVideos(activeQuery);
                    } else {
                      handleSearch();
                    }
                  }}
                  className="mt-4 text-red-800 hover:text-red-900 underline font-medium"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        ) : videos.length === 0 && !isLoading && !error ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <p className="text-blue-800 text-lg">
              {activeQuery 
                ? `No viral shorts found for "${activeQuery}". Try a different search term.`
                : 'Enter a search term above to find viral YouTube Shorts with high view counts.'}
            </p>
            {activeQuery && (
              <div className="mt-4 text-sm text-blue-700">
                <p>Tips:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Try different keywords or topics</li>
                  <li>Check if YouTube API key is configured in server/.env</li>
                  <li>Make sure the backend server is running</li>
                </ul>
              </div>
            )}
          </div>
        ) : videos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} onSelect={onVideoSelect} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ViralShortsView;

