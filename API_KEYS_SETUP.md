# API Keys Setup for Supabase Edge Functions

## Architecture

This application uses **Supabase Edge Functions** for all backend operations. The Edge Functions are already deployed and running on Supabase.

## Required API Keys

You need to add two API keys as **Supabase secrets**:

### 1. Gemini API Key
Used for AI-powered storyboard generation.

**How to get it:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. **IMPORTANT:** When creating the key, you'll be asked to select or create a Google Cloud project
5. After creating the key, you MUST enable the Generative Language API:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Select the project that was linked to your API key (project ID: 573529931500)
   - Go to **APIs & Services** → **Library**
   - Search for "Generative Language API"
   - Click on it and press **Enable**
   - Wait 2-3 minutes for the API to activate
6. Copy the API key

### 2. YouTube Data API Key
Used for fetching trending shorts and video information.

**How to get it:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the YouTube Data API v3
4. Go to "Credentials" and create an API key
5. Copy the key

## Setup Instructions

### Adding Secrets to Supabase

You need to add your API keys to Supabase as secrets:

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `ykdlyaxpqxsmajclmput`
3. Navigate to **Settings** → **Edge Functions** → **Secrets**
4. Add the following secrets:

   - **Name:** `GEMINI_API_KEY`
     - **Value:** Your Gemini API key

   - **Name:** `YOUTUBE_API_KEY`
     - **Value:** Your YouTube Data API key

5. Click "Add Secret" for each one

### Running the Application

After adding your API keys to Supabase:

Simply start the frontend:
```bash
npm run dev
```

The application will automatically connect to the Supabase Edge Functions.

## How It Works

1. Frontend calls Supabase Edge Functions at:
   - `https://ykdlyaxpqxsmajclmput.supabase.co/functions/v1/gemini-storyboard`
   - `https://ykdlyaxpqxsmajclmput.supabase.co/functions/v1/youtube-api`

2. Edge Functions use the secrets you configured in Supabase

3. No local backend server needed - everything runs on Supabase!

## Important Notes

- Never commit your API keys to version control
- API keys are stored securely in Supabase as secrets
- Edge Functions are already deployed and active
- The application uses Supabase authentication tokens
- Everything is serverless and scales automatically
