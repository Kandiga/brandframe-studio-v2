# Netlify-Only Deployment Guide

This guide explains how to deploy BrandFrame Studio entirely on Netlify using Netlify Functions.

## Important Note About Timeouts

⚠️ **Netlify Functions have timeout limits:**
- Free tier: 10 seconds
- Pro tier: 26 seconds
- Business tier: 26 seconds

Storyboard generation can take 2-3 minutes, which exceeds these limits. For production use with longer operations, consider:
1. Using Netlify Background Functions (requires Pro plan)
2. Using a separate backend service (Railway, Render, etc.)
3. Implementing a polling mechanism with status checks

## Step 1: Set Environment Variables in Netlify

1. Go to **Netlify Dashboard** → Your site → **Site settings** → **Environment variables**
2. Add these variables:

   **Required - Supabase Configuration:**
   ```
   VITE_SUPABASE_URL=https://ykdlyaxpqxsmajclmput.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrZGx5YXhwcXhzbWFqY2xtcHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNzg4MjAsImV4cCI6MjA3ODg1NDgyMH0.jUmdLgyXG_RX0ZhtYJTBUwipldz22vFH6l010BwSLUY
   ```

   **Important Notes:**
   - These environment variables must be added to Netlify for the deployed app to work
   - The app uses Supabase Edge Functions, not Netlify Functions
   - The `GEMINI_API_KEY` should be added to Supabase (not Netlify) - see Step 1.5 below

## Step 1.5: Configure Supabase Edge Functions

The app uses Supabase Edge Functions for backend operations. You need to add the API key to Supabase:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/ykdlyaxpqxsmajclmput)
2. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
3. Add this secret:
   ```
   GEMINI_API_KEY=your-gemini-api-key-here
   ```
4. Save the secret

**Optional** (for YouTube Shorts feature):
- Add `YOUTUBE_API_KEY` to Supabase Secrets as well

## Step 2: Deploy

1. Push your code to GitHub (if not already done)
2. Netlify will automatically detect the changes and deploy
3. Or manually trigger a deploy: **Deploys** → **Trigger deploy** → **Deploy site**

## Step 3: Verify Deployment

1. After deployment completes, test the health endpoint:
   ```
   https://your-site.netlify.app/api/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. Test storyboard generation in the app

## How It Works

- The frontend is hosted on Netlify
- Backend operations use Supabase Edge Functions
- The app connects directly to Supabase from the browser using the Supabase client
- No Netlify Functions are used in this setup

## Troubleshooting

### "Supabase configuration is missing" Error

This error appears when the Supabase environment variables are not set in Netlify:

1. Go to Netlify Dashboard → Site settings → Environment variables
2. Make sure both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
3. **Trigger a new deploy** after adding the variables (they don't take effect on existing builds)
4. Clear browser cache and reload the page

### Storyboard Generation Fails

If storyboard generation fails with a server error:

1. Check that `GEMINI_API_KEY` is added to **Supabase Secrets** (not Netlify)
2. Go to Supabase Dashboard → Edge Functions → Secrets
3. Verify the API key is correctly set

### Build Fails on Netlify

- Check the build logs in Netlify Dashboard → Deploys → [Latest deploy] → Deploy log
- Common issues:
  - Missing dependencies: Make sure `package.json` is committed
  - TypeScript errors: Run `npm run build` locally to catch errors before deploying

### Environment Variables Not Working After Deploy

- Environment variables are baked into the build at build time
- You must **trigger a new deploy** after changing environment variables
- Go to: Deploys → Trigger deploy → Clear cache and deploy site

## Development

For local development:

1. Make sure `.env` file exists with Supabase configuration
2. Run the development server:
   ```bash
   npm run dev
   ```

This will start the app on `http://localhost:3000`

## Production Considerations

Since this app uses Supabase Edge Functions:
- No timeout limits from Netlify (timeouts are handled by Supabase)
- Supabase free tier has generous limits for Edge Functions
- For production apps with heavy usage, consider upgrading your Supabase plan

