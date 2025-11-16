<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1gKqQVYTsJMs8tbID6URtz9n7rP8WnEqD

## Run Locally

**Prerequisites:**  
- Node.js 18+ (for fetch API support in backend)

### Frontend Only (without YouTube Shorts feature)
1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

### Full Setup (with YouTube Shorts scraping)
1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run both frontend and backend:
   `npm run dev:full`
   
   Or run them separately:
   - Frontend: `npm run dev` (runs on http://localhost:3000)
   - Backend: `npm run server` (runs on http://localhost:3002)

### Backend Server
The YouTube scraping backend server runs on port 3002 by default. You can configure the port by setting the `PORT` environment variable.

**Note:** The YouTube Shorts scraping feature uses web scraping which may have limitations. For production use, consider integrating YouTube Data API v3 for more reliable access to trending videos.

## Deployment

### Netlify-Only Deployment (Recommended for Simple Setup)
👉 **[Follow the Netlify Setup Guide](NETLIFY_SETUP.md)** - Deploy everything on Netlify using Netlify Functions.

**Important:** Netlify Functions have timeout limits (10s free, 26s Pro). For longer operations, consider separate backend deployment.

### Separate Backend Deployment (Recommended for Production)
👉 **[Follow the Quick Start Guide](DEPLOY_QUICK_START.md)** - Deploy backend to Railway and frontend to Netlify for better performance.

### Detailed Guides
- [NETLIFY_SETUP.md](NETLIFY_SETUP.md) - Netlify-only deployment guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Comprehensive deployment guide
- [RAILWAY_DEPLOY.md](RAILWAY_DEPLOY.md) - Detailed Railway deployment
- [RENDER_DEPLOY.md](RENDER_DEPLOY.md) - Alternative: Render deployment
