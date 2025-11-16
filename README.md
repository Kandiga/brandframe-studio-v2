<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# BrandFrame Studio - AI-Powered Storyboard Generator

This app uses **Supabase Edge Functions** for serverless backend operations.

View your app in AI Studio: https://ai.studio/apps/drive/1gKqQVYTsJMs8tbID6URtz9n7rP8WnEqD

## Architecture

- **Frontend:** React + Vite (bolt.new compatible)
- **Backend:** Supabase Edge Functions (serverless)
- **Database:** Supabase PostgreSQL
- **AI:** Google Gemini API
- **Video Data:** YouTube Data API v3

## Quick Start

### 1. Setup API Keys

You need to add your API keys to Supabase:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select project: `ykdlyaxpqxsmajclmput`
3. Navigate to **Settings** → **Edge Functions** → **Secrets**
4. Add these secrets:
   - `GEMINI_API_KEY` - Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - `YOUTUBE_API_KEY` - Get from [Google Cloud Console](https://console.cloud.google.com/)

See [API_KEYS_SETUP.md](API_KEYS_SETUP.md) for detailed instructions.

### 2. Run the App

```bash
npm install
npm run dev
```

That's it! The app will connect to Supabase Edge Functions automatically.

## How It Works

1. Frontend runs on port 3000
2. All API calls go to Supabase Edge Functions:
   - `/functions/v1/gemini-storyboard` - AI storyboard generation
   - `/functions/v1/youtube-api` - YouTube data fetching
3. Edge Functions use secrets stored in Supabase
4. No local backend server needed

## Deployment

This app uses Supabase for backend operations, so you only need to deploy the frontend.

👉 **[Follow the Deployment Guide](DEPLOYMENT.md)** - Complete guide for deploying to Netlify with Supabase.

**Key Points:**
- Frontend hosted on Netlify (or any static host)
- Backend runs on Supabase Edge Functions (already configured)
- Database stored in Supabase PostgreSQL
- No separate backend server needed
