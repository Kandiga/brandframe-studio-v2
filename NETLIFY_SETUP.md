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

   **Required:**
   ```
   GEMINI_API_KEY=your-gemini-api-key-here
   ```

   **Optional** (for YouTube Shorts feature):
   ```
   YOUTUBE_API_KEY=your-youtube-api-key-here
   ```

   **Note:** `VITE_API_URL` is NOT needed anymore - the app will use Netlify Functions automatically.

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

- All API calls to `/api/*` are automatically redirected to `/.netlify/functions/api`
- The Netlify Function handles all backend logic
- No separate backend server needed!

## Troubleshooting

### Function Timeout Errors

If you see timeout errors during storyboard generation:

1. **Upgrade to Netlify Pro** for 26-second timeout
2. **Or use Background Functions** (requires code changes)
3. **Or deploy backend separately** (see DEPLOYMENT.md)

### Function Not Found (404)

- Check that `netlify/functions/api.ts` exists
- Verify `netlify.toml` has `functions = "netlify/functions"`
- Check build logs for TypeScript compilation errors

### Environment Variables Not Working

- Make sure variables are set in Netlify Dashboard (not in `.env` files)
- Redeploy after adding new environment variables
- Check function logs: **Functions** tab → Click on function → View logs

### CORS Errors

- CORS is handled automatically by Netlify Functions
- If you see CORS errors, check the function code in `netlify/functions/api.ts`

## Development

For local development with Netlify Functions:

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Run locally:
   ```bash
   netlify dev
   ```

This will:
- Start the frontend on `http://localhost:8888`
- Run Netlify Functions locally
- Simulate the production environment

## Production Considerations

- **Free tier**: Limited to 10-second function execution
- **Pro tier**: 26-second timeout, better for most use cases
- **Background Functions**: For longer operations (requires Pro+)

For production apps with heavy usage, consider deploying the backend separately on Railway or Render for better performance and no timeout limits.

