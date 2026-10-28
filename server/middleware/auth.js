const { supabase, createUserSupabaseClient, isConfigured } = require('../services/supabaseClient');
const store = require('../services/dataStore');

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // 1. If Supabase is configured and a real (non-demo) token is provided
    if (isConfigured && token && !token.startsWith('demo-token') && !token.startsWith('mock-')) {
      // Validate JWT via anon client (this call does NOT require RLS)
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired session token' });
      }

      // Create per-request user client so RLS policies evaluate auth.uid() correctly
      const userClient = createUserSupabaseClient(token);

      // Attempt to fetch profile; gracefully handle missing table or row
      let profile = null;
      try {
        const { data: pData, error: pErr } = await userClient
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!pErr) {
          profile = pData;
        } else {
          // Table may not exist yet — log but don't crash
          console.warn('[Auth Middleware] Profile fetch warning (table may be pending):', pErr.message);
        }
      } catch (profileFetchErr) {
        console.warn('[Auth Middleware] Profile fetch exception:', profileFetchErr.message);
      }

      req.user = {
        id:         user.id,
        email:      user.email,
        full_name:  profile?.full_name  || user.user_metadata?.full_name || 'User',
        role:       profile?.role       || 'user',
        currency:   profile?.currency   || 'INR',
        avatar_url: profile?.avatar_url || '',
        // Expose the raw JWT so route handlers can build per-request clients
        _jwt: token
      };

      return next();
    }

    // 2. Demo / Fallback mode
    const requestedUserId = req.headers['x-user-id'] || 'usr-demo-001';
    const foundUser = store.users.find(u => u.id === requestedUserId) || store.users[0];

    req.user = {
      ...foundUser,
      isDemo: true
    };

    return next();
  } catch (err) {
    console.error('[Auth Middleware Error]:', err);
    return res.status(500).json({ success: false, error: 'Internal authentication validation failure' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied: Administrator privileges required.'
    });
  }
  next();
}

module.exports = {
  authMiddleware,
  requireAdmin
};
