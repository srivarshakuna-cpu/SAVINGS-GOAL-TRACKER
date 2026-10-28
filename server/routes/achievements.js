const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { isConfigured, createUserSupabaseClient } = require('../services/supabaseClient');
const store = require('../services/dataStore');
const { calculateStreaks } = require('../services/gamification');

// GET /api/achievements - Fetch all achievements with user unlock status & streaks
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    if (isConfigured && !req.user.isDemo) {
      const db = createUserSupabaseClient(req.user._jwt);

      const [allAchRes, userAchRes, txRes] = await Promise.all([
        db.from('achievements').select('*'),
        db.from('user_achievements').select('*').eq('user_id', userId),
        db.from('savings_transactions').select('*').eq('user_id', userId)
      ]);

      const allAchievements  = allAchRes.data  || [];
      const userAchievements = userAchRes.data || [];
      const transactions     = txRes.data      || [];

      const streaks = calculateStreaks(transactions);

      const enriched = allAchievements.map(ach => {
        const userAch = userAchievements.find(ua => ua.achievement_id === ach.id);
        return {
          ...ach,
          is_unlocked: !!userAch,
          unlocked_at: userAch ? userAch.unlocked_at : null
        };
      });

      return res.json({ success: true, data: { achievements: enriched, streaks } });
    }

    // Demo store
    const transactions = store.transactions.filter(t => t.user_id === userId);
    const streaks      = calculateStreaks(transactions);

    const enriched = store.achievements.map(ach => {
      const userAch = store.userAchievements.find(ua => ua.user_id === userId && ua.achievement_id === ach.id);
      return {
        ...ach,
        is_unlocked: !!userAch,
        unlocked_at: userAch ? userAch.unlocked_at : null
      };
    });

    return res.json({ success: true, data: { achievements: enriched, streaks } });
  } catch (err) {
    console.error('Error fetching achievements:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve achievements.' });
  }
});

module.exports = router;
