const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { sanitizeString } = require('../middleware/validation');
const { isConfigured, createUserSupabaseClient } = require('../services/supabaseClient');
const store = require('../services/dataStore');

// GET /api/profile - Fetch user profile & preferences
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    if (isConfigured && !req.user.isDemo) {
      const db = createUserSupabaseClient(req.user._jwt);

      const [pRes, prefRes] = await Promise.all([
        db.from('profiles').select('*').eq('id', userId).single(),
        db.from('user_preferences').select('*').eq('user_id', userId).maybeSingle()
      ]);

      if (pRes.error) throw pRes.error;

      return res.json({
        success: true,
        data: {
          profile:     pRes.data,
          preferences: prefRes.data || { theme: 'light', email_notifications: true, reminder_notifications: true }
        }
      });
    }

    // Demo store
    const user        = store.users.find(u => u.id === userId) || store.users[0];
    const preferences = store.preferences[userId] || store.preferences['usr-demo-001'];

    return res.json({
      success: true,
      data: { profile: user, preferences }
    });
  } catch (err) {
    console.error('Error fetching profile:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve profile.' });
  }
});

// PUT /api/profile - Update user profile
router.put('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, avatar_url, currency } = req.body;

    const sanitizedName  = sanitizeString(full_name || '');
    const cleanCurrency  = sanitizeString(currency  || 'INR');

    if (isConfigured && !req.user.isDemo) {
      const db = createUserSupabaseClient(req.user._jwt);

      const { data, error } = await db
        .from('profiles')
        .update({
          full_name:  sanitizedName,
          avatar_url: avatar_url || '',
          currency:   cleanCurrency,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, message: 'Profile updated successfully!', data });
    }

    const uIndex = store.users.findIndex(u => u.id === userId);
    if (uIndex >= 0) {
      store.users[uIndex] = {
        ...store.users[uIndex],
        full_name:  sanitizedName || store.users[uIndex].full_name,
        avatar_url: avatar_url !== undefined ? avatar_url : store.users[uIndex].avatar_url,
        currency:   cleanCurrency || store.users[uIndex].currency
      };
    }

    return res.json({ success: true, message: 'Profile updated successfully!', data: store.users[uIndex || 0] });
  } catch (err) {
    console.error('Error updating profile:', err);
    return res.status(500).json({ success: false, error: 'Failed to update profile.' });
  }
});

// PUT /api/profile/preferences - Update preferences (Dark/Light mode, Notifications)
router.put('/preferences', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { theme, email_notifications, reminder_notifications, streak_notifications } = req.body;

    if (isConfigured && !req.user.isDemo) {
      const db = createUserSupabaseClient(req.user._jwt);

      const { data, error } = await db
        .from('user_preferences')
        .upsert({
          user_id:                userId,
          theme:                  theme || 'light',
          email_notifications:    !!email_notifications,
          reminder_notifications: !!reminder_notifications,
          streak_notifications:   !!streak_notifications,
          updated_at:             new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, message: 'Preferences updated successfully!', data });
    }

    store.preferences[userId] = {
      ...(store.preferences[userId] || {}),
      theme:                  theme || 'light',
      email_notifications:    !!email_notifications,
      reminder_notifications: !!reminder_notifications,
      streak_notifications:   !!streak_notifications,
      updated_at:             new Date().toISOString()
    };

    return res.json({ success: true, message: 'Preferences updated successfully!', data: store.preferences[userId] });
  } catch (err) {
    console.error('Error updating preferences:', err);
    return res.status(500).json({ success: false, error: 'Failed to update preferences.' });
  }
});

module.exports = router;
