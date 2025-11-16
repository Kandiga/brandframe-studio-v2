# Render Deployment Guide

## Step 1: Create Render Account and Service

1. Go to [Render](https://render.com)
2. Sign in with GitHub
3. Click "New" → "Web Service"
4. Connect your repository: `brandframe-studio-v2`

## Step 2: Configure the Service

Render will auto-detect `render.yaml`, but verify these settings:

- **Name**: `brandframe-studio-backend`
- **Root Directory**: `server`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

## Step 3: Set Environment Variables

In the **Environment** section, add:

```
GEMINI_API_KEY=your-gemini-api-key-here
FRONTEND_URL=https://startling-tiramisu-fc617d.netlify.app
NODE_ENV=production
PORT=10000
```

**Optional** (for YouTube Shorts feature):
```
YOUTUBE_API_KEY=your-youtube-api-key-here
```

**Note**: Render requires you to set `PORT` explicitly. Use `10000` or let Render generate it.

## Step 4: Deploy

1. Click "Create Web Service"
2. Render will start building and deploying
3. Wait for deployment to complete (usually 3-5 minutes)
4. Once deployed, Render will provide a URL like: `https://your-app-name.onrender.com`

## Step 5: Get Your Backend URL

1. After deployment, your backend URL will be shown at the top of the service page
2. It will look like: `https://your-app-name.onrender.com`
3. Copy this URL!

## Step 6: Configure Netlify

1. Go to Netlify Dashboard → Your site → **Site settings** → **Environment variables**
2. Add:
   - Key: `VITE_API_URL`
   - Value: Your Render backend URL (from Step 5)
3. Trigger a new deploy in Netlify

## Important Notes

- Render free tier services **spin down after 15 minutes of inactivity**
- First request after spin-down may take 30-60 seconds
- Consider upgrading to paid plan for always-on service
- Check Render logs if deployment fails

