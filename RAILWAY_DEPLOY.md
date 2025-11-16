# Railway Deployment Guide

## Step 1: Create Railway Account and Project

1. Go to [Railway](https://railway.app)
2. Sign in with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repository: `brandframe-studio-v2`

## Step 2: Configure the Service

1. Railway will auto-detect the project
2. Click on the service → Settings
3. Set **Root Directory** to: `server`
4. Railway will automatically detect `railway.json` configuration

## Step 3: Set Environment Variables

Go to **Variables** tab and add:

```
GEMINI_API_KEY=your-gemini-api-key-here
FRONTEND_URL=https://startling-tiramisu-fc617d.netlify.app
NODE_ENV=production
```

**Optional** (for YouTube Shorts feature):
```
YOUTUBE_API_KEY=your-youtube-api-key-here
```

## Step 4: Deploy

1. Railway will automatically start building and deploying
2. Wait for deployment to complete (usually 2-3 minutes)
3. Once deployed, Railway will provide a URL like: `https://your-app-name.up.railway.app`

## Step 5: Get Your Backend URL

1. After deployment completes, go to **Settings** → **Networking**
2. Copy the **Public Domain** URL (e.g., `https://your-app-name.up.railway.app`)
3. This is your backend URL!

## Step 6: Configure Netlify

1. Go to Netlify Dashboard → Your site → **Site settings** → **Environment variables**
2. Add:
   - Key: `VITE_API_URL`
   - Value: Your Railway backend URL (from Step 5)
3. Trigger a new deploy in Netlify

## Troubleshooting

- If build fails, check Railway logs
- Make sure `GEMINI_API_KEY` is set correctly
- Verify `FRONTEND_URL` matches your Netlify URL exactly
- Check that port is set correctly (Railway sets `PORT` automatically)

