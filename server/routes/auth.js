const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { supabaseUrl, supabaseAnonKey, isConfigured, createUserSupabaseClient } = require('../services/supabaseClient');
const store = require('../services/dataStore');

// GET /api/auth/config - Public client Supabase configuration
// NOTE: Only the publishable (anon) key is returned here — never a service_role key.
router.get('/config', (req, res) => {
  return res.json({
    success: true,
    data: {
      isConfigured,
      supabaseUrl:     isConfigured ? supabaseUrl     : '',
      supabaseAnonKey: isConfigured ? supabaseAnonKey : '',
      defaultCurrency: 'INR',
      currencySymbol:  '₹'
    }
  });
});

// POST /api/auth/demo-login - 1-click test login for evaluator demonstration
router.post('/demo-login', (req, res) => {
  const { role = 'admin' } = req.body;
  const targetUser = store.users.find(u => u.role === role) || store.users[0];

  return res.json({
    success: true,
    message: `Logged in successfully as demo ${targetUser.role}!`,
    token:   'demo-token-' + targetUser.id,
    user:    targetUser
  });
});

// GET /api/categories - Accessible categories for goal & transaction forms
// When Supabase is live, fetch from DB (respects RLS: global + own custom categories).
// Falls back to in-memory store when schema is not yet created.
router.get('/categories', authMiddleware, async (req, res) => {
  try {
    if (isConfigured && !req.user.isDemo) {
      const db = createUserSupabaseClient(req.user._jwt);

      const { data, error } = await db
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data) {
        return res.json({ success: true, data });
      }
      // Schema may not exist yet — fall through to store
      console.log('[Categories] Supabase query notice:', error?.message, '— using store fallback.');
    }

    const userId = req.user ? req.user.id : null;
    const categories = store.categories.filter(c => c.user_id === null || c.user_id === userId);
    return res.json({ success: true, data: categories });
  } catch (err) {
    console.error('Error fetching categories:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve categories.' });
  }
});

module.exports = router;
