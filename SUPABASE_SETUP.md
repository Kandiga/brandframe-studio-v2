# Supabase Setup Guide for BrandFrame Studio

This guide will help you configure the Supabase backend for BrandFrame Studio, including Edge Functions and database setup.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A Gemini API key from Google AI Studio (https://makersuite.google.com/app/apikey)

## Step 1: Configure Gemini API Key

The CORS error you're experiencing is likely because the `GEMINI_API_KEY` is not set in your Supabase project. Here's how to add it:

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/ykdlyaxpqxsmajclmput
2. Click on **Settings** in the left sidebar
3. Click on **Edge Functions** (or **Secrets** depending on your Supabase dashboard version)
4. Click **Add new secret** or **New secret**
5. Enter:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: Your Gemini API key (starts with `AIza...`)
6. Click **Save** or **Add**

### Option B: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Navigate to your project directory
cd /path/to/brandframe-studio

# Set the secret
supabase secrets set GEMINI_API_KEY=your_actual_api_key_here
```

## Step 2: Verify Edge Function Deployment

The `gemini-storyboard` Edge Function has been deployed successfully. You can verify it's working by:

1. Go to your Supabase dashboard
2. Navigate to **Edge Functions** in the left sidebar
3. You should see `gemini-storyboard` listed
4. Check the logs to see if there are any errors

## Step 3: Test the Edge Function

Once you've added the `GEMINI_API_KEY`, try generating a storyboard again:

1. Open the BrandFrame Studio application
2. Upload a character image (optional)
3. Enter a story description
4. Click "Generate Storyboard"

The CORS error should be resolved, and you should see the storyboard generation progress.

## Step 4: Database Configuration (Already Applied)

The database migration has been successfully applied. The `projects` table has been created with:

- Row Level Security (RLS) enabled
- Policies for authenticated users to CRUD their own projects
- All required columns for storing storyboards and assets

## Troubleshooting

### CORS Error Persists

If you still see CORS errors after adding the API key:

1. **Verify the API key is set correctly**: Go to Supabase Dashboard → Settings → Edge Functions → Secrets and confirm `GEMINI_API_KEY` is listed
2. **Check Edge Function logs**: Go to Edge Functions → gemini-storyboard → Logs to see detailed error messages
3. **Verify the API key is valid**: Test your Gemini API key at https://makersuite.google.com/
4. **Re-deploy the Edge Function**: If needed, the function can be re-deployed from the dashboard

### Edge Function Not Found (404)

If you get a 404 error:

1. Verify the Edge Function is deployed in your Supabase dashboard
2. Check that the Supabase URL in `.env` matches your project: `https://ykdlyaxpqxsmajclmput.supabase.co`
3. Ensure the function name in the request matches the deployed function name: `gemini-storyboard`

### API Key Not Working

If the API key doesn't work:

1. Verify you're using a valid Gemini API key (not a Google Cloud API key)
2. Check that the key has the necessary permissions
3. Ensure there are no extra spaces or characters in the key
4. Try generating a new API key from Google AI Studio

## Environment Variables

Your `.env` file should contain:

```env
VITE_SUPABASE_URL=https://ykdlyaxpqxsmajclmput.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrZGx5YXhwcXhzbWFqY2xtcHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNzg4MjAsImV4cCI6MjA3ODg1NDgyMH0.jUmdLgyXG_RX0ZhtYJTBUwipldz22vFH6l010BwSLUY
```

**Note**: The `GEMINI_API_KEY` should NOT be in the `.env` file - it should be set as a Supabase secret as described above.

## Next Steps

Once the setup is complete:

1. Test storyboard generation with a simple story
2. Test the continue narrative feature
3. Verify that projects can be saved (if using authentication)
4. Check that all images are generated correctly

## Support

If you continue to experience issues:

1. Check the browser console for detailed error messages
2. Review the Supabase Edge Function logs
3. Verify your Gemini API key quota hasn't been exceeded
4. Check the Supabase status page: https://status.supabase.com/

## Additional Resources

- Supabase Edge Functions Documentation: https://supabase.com/docs/guides/functions
- Gemini API Documentation: https://ai.google.dev/docs
- BrandFrame Studio GitHub Repository: [Your repo URL]
