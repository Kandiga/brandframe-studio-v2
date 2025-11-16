# Deployment Guide - BrandFrame Studio

This guide explains how to deploy BrandFrame Studio using Supabase and Netlify.

## Architecture Overview

BrandFrame Studio uses:
- **Frontend**: Static site deployed on Netlify
- **Backend**: Supabase Edge Functions (no separate backend server needed)
- **Database**: Supabase PostgreSQL

## Prerequisites

- A Netlify account
- A Supabase project (already configured)
- Google Gemini API key

## Step 1: Configure Supabase Edge Functions

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/ykdlyaxpqxsmajclmput)
2. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
3. Add your API key:
   ```
   GEMINI_API_KEY=your-google-gemini-api-key
   ```
4. Save the secret

The Edge Functions are already deployed and configured in your Supabase project.

## Step 2: Deploy Frontend to Netlify

### Connect Repository (If Not Already Connected)

If you haven't connected your repository yet:

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repository
4. Select your repository

### Reconnect to Netlify (If Already Connected via Bolt)

If Bolt already connected your project to Netlify, you can access it directly:

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Find your site in the sites list
3. Click on the site to access its settings

### Configure Build Settings

Netlify will auto-detect settings from `netlify.toml`:
- **Build command**: `npm run build`
- **Publish directory**: `dist`

If the settings are not auto-detected, set them manually:
1. Go to Site settings → Build & deploy → Build settings
2. Set **Build command**: `npm run build`
3. Set **Publish directory**: `dist`

### Set Environment Variables (CRITICAL STEP)

**IMPORTANT**: These environment variables MUST be set in Netlify for the app to work.

1. Go to your site in Netlify Dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Click **Add a variable** and add both variables:

**Variable 1:**
- Key: `VITE_SUPABASE_URL`
- Value: `https://ykdlyaxpqxsmajclmput.supabase.co`

**Variable 2:**
- Key: `VITE_SUPABASE_ANON_KEY`
- Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrZGx5YXhwcXhzbWFqY2xtcHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNzg4MjAsImV4cCI6MjA3ODg1NDgyMH0.jUmdLgyXG_RX0ZhtYJTBUwipldz22vFH6l010BwSLUY`

4. Click **Save**

### Deploy or Redeploy

**If this is a new site:**
1. Click "Deploy site"
2. Wait for the build to complete

**If the site already exists (was connected by Bolt):**
1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Clear cache and deploy site**
3. Wait for the build to complete

Your site will be available at `https://your-site-name.netlify.app`

## Step 3: Verify Deployment

1. Visit your deployed site
2. Try creating a new storyboard
3. Check that projects are saved (using Supabase database)

## Environment Variables Reference

### Frontend (Netlify)
- `VITE_SUPABASE_URL` - **Required**: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - **Required**: Your Supabase anonymous key

### Backend (Supabase Secrets)
- `GEMINI_API_KEY` - **Required**: Your Google Gemini API key for storyboard generation

## Troubleshooting

### "Supabase configuration is missing" Error

This error appears when environment variables are not set in Netlify:

1. Go to Netlify Dashboard → Site settings → Environment variables
2. Verify both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
3. **Trigger a new deploy** (environment variables only apply to new builds)
4. Go to: Deploys → Trigger deploy → Clear cache and deploy site

### Storyboard Generation Fails

If storyboard generation returns an error:

1. Check that `GEMINI_API_KEY` is set in **Supabase Secrets** (not Netlify)
2. Go to Supabase Dashboard → Edge Functions → Secrets
3. Verify the API key is correct
4. Check Edge Function logs for detailed error messages

### Projects Not Saving

If projects aren't being saved:

1. Check browser console for errors
2. Verify Supabase environment variables are correct
3. Check Supabase Dashboard → Table Editor to see if data is being saved
4. Verify Row Level Security (RLS) policies are configured correctly

### Build Fails on Netlify

Common issues:
- Missing dependencies: Make sure `package.json` is up to date
- TypeScript errors: Run `npm run build` locally first
- Node version: Netlify uses Node 18+ by default

## How It Works

1. **Frontend**: Static React app hosted on Netlify
2. **API Calls**: Frontend calls Supabase Edge Functions directly
3. **Database**: All data stored in Supabase PostgreSQL
4. **Authentication**: Ready for Supabase Auth (if needed in future)

## Security Notes

- Never commit API keys to Git
- Always use HTTPS in production
- Supabase handles authentication and authorization via RLS
- Edge Function secrets are encrypted by Supabase
- The anonymous key is safe to expose (protected by RLS policies)

## Updating the Application

### Update Frontend Code

1. Push changes to GitHub
2. Netlify will automatically rebuild and deploy
3. Or manually trigger: Deploys → Trigger deploy

### Update Edge Functions

Edge Functions are already deployed. If you need to update them, use the Supabase CLI or dashboard.

### Update Environment Variables

1. **Netlify variables**: Set in Netlify Dashboard → Site settings → Environment variables
2. **Supabase secrets**: Set in Supabase Dashboard → Edge Functions → Secrets
3. **Important**: Always trigger a new deploy after changing Netlify environment variables
