# Quick Start: Deploy Backend to Railway

## Prerequisites
- GitHub account
- Railway account (free tier available)
- Gemini API key

## Step-by-Step Instructions

### 1. Get Your Gemini API Key
If you don't have one:
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key (you'll need it in step 4)

### 2. Deploy to Railway

1. **Go to Railway**: https://railway.app
2. **Sign in** with GitHub
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Choose repository**: `brandframe-studio-v2`
6. **Wait for Railway to detect the project**

### 3. Configure the Service

1. **Click on the service** that Railway created
2. Go to **Settings** tab
3. Set **Root Directory** to: `server`
4. Railway will automatically use `railway.json` configuration

### 4. Set Environment Variables

1. Go to **Variables** tab
2. Click **"New Variable"**
3. Add these variables one by one:

   **Required:**
   ```
   GEMINI_API_KEY=your-actual-gemini-api-key-here
   FRONTEND_URL=https://startling-tiramisu-fc617d.netlify.app
   NODE_ENV=production
   ```

   **Optional** (for YouTube Shorts):
   ```
   YOUTUBE_API_KEY=your-youtube-api-key-here
   ```

### 5. Deploy

1. Railway will automatically start deploying
2. Watch the **Deployments** tab for progress
3. Wait 2-3 minutes for build to complete

### 6. Get Your Backend URL

1. After deployment succeeds, go to **Settings** → **Networking**
2. Under **Public Domain**, you'll see a URL like:
   ```
   https://your-app-name.up.railway.app
   ```
3. **Copy this URL** - this is your backend URL!

### 7. Configure Netlify

1. Go to **Netlify Dashboard**: https://app.netlify.com
2. Select your site: `startling-tiramisu-fc617d`
3. Go to **Site settings** → **Environment variables**
4. Click **"Add a variable"**
5. Add:
   - **Key**: `VITE_API_URL`
   - **Value**: Paste your Railway backend URL from step 6
6. Click **"Save"**

### 8. Redeploy Netlify

1. Go to **Deploys** tab in Netlify
2. Click **"Trigger deploy"** → **"Deploy site"**
3. Wait for deployment to complete
4. Your app should now work! 🎉

## Troubleshooting

**Build fails?**
- Check Railway logs in the **Deployments** tab
- Make sure `GEMINI_API_KEY` is set correctly
- Verify Root Directory is set to `server`

**CORS errors?**
- Make sure `FRONTEND_URL` in Railway matches your Netlify URL exactly
- Check that it includes `https://` at the beginning

**Can't connect?**
- Verify `VITE_API_URL` in Netlify matches your Railway URL exactly
- Make sure Railway service is running (check status in Railway dashboard)
- Test backend directly: Open `https://your-backend.up.railway.app/api/health` in browser

## Need Help?

Check the detailed guides:
- [RAILWAY_DEPLOY.md](RAILWAY_DEPLOY.md) - Detailed Railway guide
- [RENDER_DEPLOY.md](RENDER_DEPLOY.md) - Alternative: Render deployment
- [DEPLOYMENT.md](DEPLOYMENT.md) - General deployment guide

