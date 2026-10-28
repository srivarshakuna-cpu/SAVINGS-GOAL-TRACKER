const express = require('express');
const router = express.Router();
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const { isConfigured, createUserSupabaseClient } = require('../services/supabaseClient');
const store = require('../services/dataStore');

// GET /api/admin/stats - Admin platform overview analytics
// NOTE: With only the publishable (anon) key, RLS limits each query to the admin's own rows.
// Cross-user aggregate stats therefore reflect the demo store when no service_role key is set.
// This is the correct, secure behavior — never bypass RLS with the anon key.
router.get('/stats', authMiddleware, requireAdmin, async (req, res) => {
  try {
    let totalUsers          = 0;
    let totalGoals          = 0;
    let completedGoals      = 0;
    let activeGoals         = 0;
    let totalPlatformSavings = 0;
    let categoriesCount     = 0;
    let userList            = [];

    if (isConfigured && !req.user.isDemo) {
      const db = createUserSupabaseClient(req.user._jwt);

      // With RLS + anon key, these queries return only the admin's own data.
      // Cross-user admin stats are only possible with a service_role key (not provided).
      // We run the queries and fall back to the store if results appear empty/erroneous.
      const [uRes, gRes, sRes, cRes] = await Promise.all([
        db.from('profiles').select('id, full_name, email, role, created_at'),
        db.from('goals').select('id, status'),
        db.from('savings_transactions').select('amount'),
        db.from('categories').select('id')
      ]);

      // If the tables exist and returned data, use it; otherwise fall back gracefully
      if (!uRes.error && uRes.data !== null) {
        userList             = uRes.data  || [];
        totalUsers           = userList.length;
        totalGoals           = (gRes.data || []).length;
        completedGoals       = (gRes.data || []).filter(g => g.status === 'completed').length;
        activeGoals          = totalGoals - completedGoals;
        totalPlatformSavings = (sRes.data || []).reduce((acc, t) => acc + Number(t.amount || 0), 0);
        categoriesCount      = (cRes.data || []).length;
      } else {
        console.log('[Admin] Supabase query notice:', uRes.error?.message, '— using store fallback.');
        userList             = store.users;
        totalUsers           = store.users.length;
        totalGoals           = store.goals.length;
        completedGoals       = store.goals.filter(g => g.status === 'completed').length;
        activeGoals          = totalGoals - completedGoals;
        totalPlatformSavings = store.transactions.reduce((acc, t) => acc + Number(t.amount || 0), 0);
        categoriesCount      = store.categories.length;
      }
    } else {
      userList             = store.users;
      totalUsers           = store.users.length;
      totalGoals           = store.goals.length;
      completedGoals       = store.goals.filter(g => g.status === 'completed').length;
      activeGoals          = totalGoals - completedGoals;
      totalPlatformSavings = store.transactions.reduce((acc, t) => acc + Number(t.amount || 0), 0);
      categoriesCount      = store.categories.length;
    }

    return res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers:          totalUsers,
        totalPlatformSavings,
        totalGoals,
        activeGoals,
        completedGoals,
        categoriesCount,
        users:      userList,
        categories: store.categories  // always show all local categories for admin UI
      }
    });
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve admin analytics.' });
  }
});

// POST /api/admin/categories - Create system-wide category
router.post('/categories', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { name, icon, type } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Category name is required.' });
    }

    const newCat = {
      id:      'cat-' + Date.now(),
      user_id: null, // System-wide
      name:    name.trim(),
      icon:    icon || 'tag',
      type:    type || 'both'
    };

    if (isConfigured && !req.user.isDemo) {
      const db = createUserSupabaseClient(req.user._jwt);

      const { data, error } = await db
        .from('categories')
        .insert([{ user_id: null, name: name.trim(), icon: icon || 'tag', type: type || 'both' }])
        .select()
        .single();

      // Note: inserting a system-wide category (user_id = NULL) requires an admin
      // RLS INSERT policy. The current policies.sql grants full access to admins via
      // "Admins have full access to categories". If this errors, the table or policy
      // may not yet be created in Supabase.
      if (error) {
        console.warn('[Admin] Category insert error:', error.message, '— using store fallback.');
        store.categories.push(newCat);
        return res.status(201).json({ success: true, message: 'Category created (store).', data: newCat });
      }

      return res.status(201).json({ success: true, message: 'Category created.', data });
    }

    store.categories.push(newCat);
    return res.status(201).json({ success: true, message: 'Category created.', data: newCat });
  } catch (err) {
    console.error('Error creating admin category:', err);
    return res.status(500).json({ success: false, error: 'Failed to create category.' });
  }
});

module.exports = router;
