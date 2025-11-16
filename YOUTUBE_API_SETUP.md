# YouTube Data API v3 Setup Guide

This guide will help you set up YouTube Data API v3 to fetch trending YouTube Shorts instead of web scraping.

## Step 1: Get YouTube Data API Key

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project** (or select existing)
   - Click on the project dropdown at the top
   - Click "New Project"
   - Enter project name: "BrandFrame Studio" (or any name)
   - Click "Create"

3. **Enable YouTube Data API v3**
   - In the search bar, type "YouTube Data API v3"
   - Click on "YouTube Data API v3"
   - Click "Enable" button

4. **Create API Credentials**
   - Go to "Credentials" (left sidebar)
   - Click "Create Credentials" → "API Key"
   - Copy your API key (you'll need this!)

5. **Restrict API Key (Recommended for Security)**
   - Click on your newly created API key
   - Under "API restrictions", select "Restrict key"
   - Choose "YouTube Data API v3"
   - Click "Save"

## Step 2: Configure the Backend

1. **Create `.env` file in the `server/` directory:**
   ```bash
   cd server
   echo YOUTUBE_API_KEY=your_api_key_here > .env
   ```
   
   Or manually create `server/.env` with:
   ```
   YOUTUBE_API_KEY=AIzaSy...your_actual_key_here
   ```

2. **Install dotenv package** (if not already installed):
   ```bash
   npm install dotenv
   ```

## Step 3: Update the Code

The code has been updated to support YouTube Data API v3. Just make sure:
- Your `.env` file is in the `server/` directory
- The `YOUTUBE_API_KEY` is set correctly
- Restart the server after adding the API key

## Step 4: Test the API

1. Start the backend server:
   ```bash
   npm run server
   ```

2. Test the API endpoint:
   ```bash
   curl http://localhost:3002/api/youtube/trending-shorts?limit=5
   ```

   Or open in browser:
   ```
   http://localhost:3002/api/youtube/trending-shorts?limit=5
   ```

## API Quota Limits

- **Free Tier**: 10,000 units per day
- **Each API call costs**:
  - `search.list`: 100 units
  - `videos.list`: 1 unit per video
  
**Note**: With the free tier, you can make approximately 100 search requests per day, or fetch metadata for 10,000 videos per day.

## Troubleshooting

### Error: "API key not valid"
- Make sure the API key is correct
- Check that YouTube Data API v3 is enabled
- Verify the API key restrictions allow YouTube Data API v3

### Error: "Quota exceeded"
- You've reached your daily quota
- Wait 24 hours or upgrade to a paid plan
- Consider caching results to reduce API calls

### No videos returned
- Check the API key is set correctly in `server/.env`
- Check server console for error messages
- Verify the API is enabled in Google Cloud Console

## Alternative: Use Demo Video IDs

If you don't want to use the API, you can manually add YouTube Shorts video IDs to `server/services/youtubeService.js` in the fallback array (around line 115).





