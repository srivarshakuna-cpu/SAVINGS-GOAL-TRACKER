const { createClient } = require('@supabase/supabase-js');
let ws = null;
try {
  ws = require('ws');
} catch (e) {}

require('dotenv').config();

const supabaseUrl     = process.env.SUPABASE_URL      || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

let supabase     = null;   // anon-key base client (used for auth.getUser only)
let isConfigured = false;

function _buildOptions(extraGlobalHeaders = {}) {
  const opts = {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: extraGlobalHeaders
    }
  };
  if (ws) {
    opts.realtime = { transport: ws };
  }
  return opts;
}

if (
  supabaseUrl &&
  supabaseUrl.startsWith('http') &&
  supabaseAnonKey &&
  !supabaseAnonKey.includes('your-project-id')
) {
  try {
    supabase     = createClient(supabaseUrl, supabaseAnonKey, _buildOptions());
    isConfigured = true;
    console.log('[Supabase] Initialized anon client with URL:', supabaseUrl);
  } catch (err) {
    console.warn('[Supabase] Failed to initialize client, fallback mode enabled:', err.message);
  }
} else {
  console.log('[Supabase] Real credentials not set or placeholder detected. Demo / Local Hybrid Database Engine Active.');
}

/**
 * createUserSupabaseClient
 *
 * Returns a Supabase client that sends the user's JWT in every request.
 * This causes RLS policies that check auth.uid() to evaluate correctly
 * against the authenticated user's identity.
 *
 * @param {string} jwtToken – The user's access_token from Supabase Auth.
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function createUserSupabaseClient(jwtToken) {
  if (!isConfigured) return null;
  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    _buildOptions({ Authorization: `Bearer ${jwtToken}` })
  );
}

module.exports = {
  supabase,           // anon client — use ONLY for supabase.auth.getUser(token) in middleware
  isConfigured,
  supabaseUrl,
  supabaseAnonKey,
  createUserSupabaseClient
};
