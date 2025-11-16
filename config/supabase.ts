const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  const errorMessage = 'Supabase configuration is missing. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.';
  console.error(errorMessage);
  console.error('Available env vars:', {
    VITE_SUPABASE_URL: SUPABASE_URL ? 'SET' : 'MISSING',
    VITE_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
  });
}

export const supabaseConfig = {
  url: SUPABASE_URL || '',
  anonKey: SUPABASE_ANON_KEY || '',
  isConfigured: !!(SUPABASE_URL && SUPABASE_ANON_KEY),
};

export function getSupabaseUrl(): string {
  if (!supabaseConfig.isConfigured) {
    throw new Error('Supabase configuration is missing. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
  }
  return supabaseConfig.url;
}

export function getSupabaseAnonKey(): string {
  if (!supabaseConfig.isConfigured) {
    throw new Error('Supabase configuration is missing. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
  }
  return supabaseConfig.anonKey;
}
