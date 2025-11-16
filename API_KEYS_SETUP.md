# API Keys Setup

## Required API Keys

This application requires two API keys to function:

### 1. Gemini API Key
Used for AI-powered storyboard generation.

**How to get it:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key

### 2. YouTube Data API Key
Used for fetching trending shorts and video information.

**How to get it:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the YouTube Data API v3
4. Go to "Credentials" and create an API key
5. Copy the key

## Setup Instructions

### For bolt.new / WebContainer

1. Open the `.env` file in the root directory
2. Replace `your_gemini_api_key_here` with your actual Gemini API key
3. Replace `your_youtube_api_key_here` with your actual YouTube API key

Example:
```
GEMINI_API_KEY=AIzaSyC...your-actual-key-here
YOUTUBE_API_KEY=AIzaSyD...your-actual-key-here
```

### Running the Application

After adding your API keys:

1. Start both frontend and backend:
```bash
npm run dev:full
```

Or start them separately:

**Terminal 1 (Backend):**
```bash
npm run server
```

**Terminal 2 (Frontend):**
```bash
npm run dev
```

## Important Notes

- Never commit your API keys to version control
- Keep your `.env` file private
- The application will not work without valid API keys
- The backend server runs on port 3002
- The frontend runs on port 3000
