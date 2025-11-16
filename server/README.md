# Backend Server for YouTube Shorts Scraping

## Setup

1. Make sure you're in the project root directory
2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Server

### Option 1: Run server only
```bash
npm run server
```

### Option 2: Run both frontend and backend together
```bash
npm run dev:full
```

The server will start on `http://localhost:3001`

## Troubleshooting

### Server won't start
- Make sure Node.js 18+ is installed: `node --version`
- Install dependencies: `npm install`
- Check if port 3001 is already in use

### No videos returned
- The scraping may not work reliably without YouTube Data API v3
- Add actual YouTube Shorts video IDs to `server/services/youtubeService.js` in the fallback array
- Consider using YouTube Data API v3 for production use

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/youtube/trending-shorts?limit=20` - Get trending Shorts
- `GET /api/youtube/video/:videoId` - Get video metadata

