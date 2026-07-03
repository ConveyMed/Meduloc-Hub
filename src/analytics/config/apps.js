// Single app - uses Meduloc Hub's Supabase directly (same env vars as src/config/supabase.js)
export const APPS = {
  'meduloc-hub': {
    id: 'meduloc-hub',
    name: 'Meduloc Hub',
    supabaseUrl: process.env.REACT_APP_SUPABASE_URL,
    supabaseKey: process.env.REACT_APP_SUPABASE_ANON_KEY,
  },
}

export const DEFAULT_APP = 'meduloc-hub'
