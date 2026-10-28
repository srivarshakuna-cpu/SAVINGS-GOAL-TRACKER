const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { isConfigured, createUserSupabaseClient } = require('../services/supabaseClient');
const store = require('../services/dataStore');

// GET /api/notifications - List notifications
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    if (isConfigured && !req.user.isDemo) {
      const db = createUserSupabaseClient(req.user._jwt);

      const { data, error } = await db
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const unreadCount = (data || []).filter(n => !n.is_read).length;
      return res.json({ success: true, data: data || [], unreadCount });
    }

    const notifs = store.notifications
      .filter(n => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const unreadCount = notifs.filter(n => !n.is_read).length;
    return res.json({ success: true, data: notifs, unreadCount });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve notifications.' });
  }
});

// PATCH /api/notifications/:id/read - Mark single notification as read
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (isConfigured && !req.user.isDemo) {
      const db = createUserSupabaseClient(req.user._jwt);

      const { error } = await db
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      return res.json({ success: true, message: 'Notification marked as read.' });
    }

    const notif = store.notifications.find(n => n.id === id && n.user_id === userId);
    if (notif) notif.is_read = true;

    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    console.error('Error updating notification:', err);
    return res.status(500).json({ success: false, error: 'Failed to update notification.' });
  }
});

// PATCH /api/notifications/read-all - Mark all as read
router.patch('/read-all', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    if (isConfigured && !req.user.isDemo) {
      const db = createUserSupabaseClient(req.user._jwt);

      const { error } = await db
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId);

      if (error) throw error;
      return res.json({ success: true, message: 'All notifications marked as read.' });
    }

    store.notifications
      .filter(n => n.user_id === userId)
      .forEach(n => { n.is_read = true; });

    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Error marking all notifications:', err);
    return res.status(500).json({ success: false, error: 'Failed to mark notifications.' });
  }
});

module.exports = router;
