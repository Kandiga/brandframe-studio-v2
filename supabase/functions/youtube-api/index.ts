import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/youtube-api\/?/, "");
    const apiKey = Deno.env.get("YOUTUBE_API_KEY");

    if (!apiKey) {
      throw new Error("YOUTUBE_API_KEY not configured");
    }

    // Route: /trending-shorts
    if (path === "trending-shorts" || path === "") {
      const limit = parseInt(url.searchParams.get("limit") || "20");
      const query = url.searchParams.get("query") || "";

      let searchQuery = "shorts";
      if (query && query.trim()) {
        searchQuery = `${query.trim()} shorts`;
      }

      const searchUrl = `${YOUTUBE_API_BASE_URL}/search?part=snippet&type=video&videoDuration=short&maxResults=${limit}&q=${encodeURIComponent(searchQuery)}&key=${apiKey}`;
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();

      if (!searchData.items || searchData.items.length === 0) {
        return new Response(
          JSON.stringify({ success: true, videos: [] }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      const videoIds = searchData.items.map((item: any) => item.id.videoId).join(",");
      const videosUrl = `${YOUTUBE_API_BASE_URL}/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${apiKey}`;
      const videosResponse = await fetch(videosUrl);
      const videosData = await videosResponse.json();

      const videos = videosData.items.map((video: any) => ({
        videoId: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default.url,
        channelTitle: video.snippet.channelTitle,
        viewCount: parseInt(video.statistics.viewCount || "0"),
        likeCount: parseInt(video.statistics.likeCount || "0"),
        commentCount: parseInt(video.statistics.commentCount || "0"),
        duration: video.contentDetails.duration,
      }));

      return new Response(
        JSON.stringify({ success: true, videos }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Route: /video/:videoId
    if (path.startsWith("video/")) {
      const videoId = path.split("/")[1];
      const videosUrl = `${YOUTUBE_API_BASE_URL}/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${apiKey}`;
      const videosResponse = await fetch(videosUrl);
      const videosData = await videosResponse.json();

      if (!videosData.items || videosData.items.length === 0) {
        throw new Error("Video not found");
      }

      const video = videosData.items[0];
      const videoData = {
        videoId: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default.url,
        channelTitle: video.snippet.channelTitle,
        viewCount: parseInt(video.statistics.viewCount || "0"),
        likeCount: parseInt(video.statistics.likeCount || "0"),
        commentCount: parseInt(video.statistics.commentCount || "0"),
        duration: video.contentDetails.duration,
      };

      return new Response(
        JSON.stringify({ success: true, video: videoData }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Route: /video/:videoId/comments
    if (path.includes("/comments")) {
      const videoId = path.split("/")[1];
      const maxResults = parseInt(url.searchParams.get("maxResults") || "10");
      
      const commentsUrl = `${YOUTUBE_API_BASE_URL}/commentThreads?part=snippet&videoId=${videoId}&maxResults=${maxResults}&key=${apiKey}`;
      const commentsResponse = await fetch(commentsUrl);
      const commentsData = await commentsResponse.json();

      const comments = commentsData.items?.map((item: any) => ({
        id: item.id,
        author: item.snippet.topLevelComment.snippet.authorDisplayName,
        text: item.snippet.topLevelComment.snippet.textDisplay,
        likeCount: item.snippet.topLevelComment.snippet.likeCount,
        publishedAt: item.snippet.topLevelComment.snippet.publishedAt,
      })) || [];

      return new Response(
        JSON.stringify({ success: true, comments }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    throw new Error("Invalid route");
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});