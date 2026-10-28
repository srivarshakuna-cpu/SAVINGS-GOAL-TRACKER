const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { validateSavings } = require('../middleware/validation');
const { isConfigured, createUserSupabaseClient } = require('../services/supabaseClient');
const store = require('../services/dataStore');
const { calculateStreaks, checkAchievements } = require('../services/gamification');

// GET /api/savings - List user transactions with filters, search & pagination
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { goal_id, category_id, search, date_from, date_to, sort = 'desc', page = 1, limit = 50 } = req.query;

    if (isConfigured && !req.user.isDemo) {
      const db = createUserSupabaseClient(req.user._jwt);

      let query = db
        .from('savings_transactions')
        .select('*, goals(name, target_amount), categories(name, icon)', { count: 'exact' })
        .eq('user_id', userId);

      if (goal_id)     query = query.eq('goal_id', goal_id);
      if (category_id) query = query.eq('category_id', category_id);
      if (date_from)   query = query.gte('transaction_date', date_from);
      if (date_to)     query = query.lte('transaction_date', date_to);
      if (search)      query = query.ilike('note', `%${search}%`);

      query = query.order('transaction_date', { ascending: sort === 'asc' });

      const from = (page - 1) * limit;
      const to   = from + Number(limit) - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      return res.json({ success: true, data, count, page: Number(page), limit: Number(limit) });
    }

    // Demo store
    let txs = store.transactions.filter(t => t.user_id === userId);

    if (goal_id)     txs = txs.filter(t => t.goal_id === goal_id);
    if (category_id) txs = txs.filter(t => t.category_id === category_id);
    if (date_from)   txs = txs.filter(t => t.transaction_date >= date_from);
    if (date_to)     txs = txs.filter(t => t.transaction_date <= date_to);
    if (search) {
      const q = search.toLowerCase();
      txs = txs.filter(t => (t.note || '').toLowerCase().includes(q));
    }

    txs.sort((a, b) => {
      const diff = new Date(b.transaction_date) - new Date(a.transaction_date);
      return sort === 'asc' ? -diff : diff;
    });

    const totalCount = txs.length;
    const startIdx   = (page - 1) * limit;
    const paginated  = txs.slice(startIdx, startIdx + Number(limit)).map(t => {
      const goal = store.goals.find(g => g.id === t.goal_id);
      const cat  = store.categories.find(c => c.id === (t.category_id || goal?.category_id));
      return {
        ...t,
        goal_name:     goal ? goal.name  : 'Unknown Goal',
        category_name: cat  ? cat.name   : 'General Savings',
        category_icon: cat  ? cat.icon   : 'tag'
      };
    });

    return res.json({ success: true, data: paginated, count: totalCount, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('Error fetching transactions:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve transactions.' });
  }
});

// GET /api/savings/export - Export transactions as CSV
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    let txs = [];

    if (isConfigured && !req.user.isDemo) {
      const db = createUserSupabaseClient(req.user._jwt);

      const { data, error } = await db
        .from('savings_transactions')
        .select('*, goals(name), categories(name)')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      txs = (data || []).map(t => ({
        date:     t.transaction_date,
        goal:     t.goals?.name     || 'General Goal',
        amount:   t.amount,
        category: t.categories?.name || 'Savings',
        note:     t.note             || ''
      }));
    } else {
      txs = store.transactions
        .filter(t => t.user_id === userId)
        .map(t => {
          const goal = store.goals.find(g => g.id === t.goal_id);
          const cat  = store.categories.find(c => c.id === (t.category_id || goal?.category_id));
          return {
            date:     t.transaction_date,
            goal:     goal ? goal.name : 'General Goal',
            amount:   t.amount,
            category: cat  ? cat.name  : 'Savings',
            note:     t.note           || ''
          };
        });
    }

    // Generate CSV string
    const headers = ['Date', 'Goal', 'Amount (INR)', 'Category', 'Note'];
    const rows = txs.map(t => [
      `"${t.date}"`,
      `"${(t.goal     || '').replace(/"/g, '""')}"`,
      t.amount,
      `"${(t.category || '').replace(/"/g, '""')}"`,
      `"${(t.note     || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="savings-transactions-${new Date().toISOString().split('T')[0]}.csv"`);
    return res.send(csvContent);
  } catch (err) {
    console.error('Error exporting transactions:', err);
    return res.status(500).json({ success: false, error: 'Export failed.' });
  }
});

// POST /api/savings - Add savings
router.post('/', authMiddleware, validateSavings, async (req, res) => {
  try {
    const userId = req.user.id;
    const { goal_id, amount, transaction_date, note, category_id } = req.body;

    const txDate  = transaction_date || new Date().toISOString().split('T')[0];
    const newTxId = 'tx-' + Date.now();

    const newTx = {
      id:               newTxId,
      user_id:          userId,
      goal_id,
      category_id:      category_id || null,
      amount:           Number(amount),
      transaction_date: txDate,
      note:             note || '',
      created_at:       new Date().toISOString(),
      updated_at:       new Date().toISOString()
    };

    let goalCompleted       = false;
    let unlockedAchievements = [];

    if (isConfigured && !req.user.isDemo) {
      const db = createUserSupabaseClient(req.user._jwt);

      // 1. Insert transaction
      const { data, error } = await db
        .from('savings_transactions')
        .insert([{
          user_id:          userId,
          goal_id,
          category_id:      category_id || null,
          amount:           Number(amount),
          transaction_date: txDate,
          note:             note || ''
        }])
        .select()
        .single();

      if (error) throw error;

      // 2. Fetch all user goals & transactions for achievements
      const { data: allGoals }  = await db.from('goals').select('*').eq('user_id', userId);
      const { data: allTxs }    = await db.from('savings_transactions').select('*').eq('user_id', userId);
      const { data: existingUA } = await db
        .from('user_achievements')
        .select('achievements(badge_code)')
        .eq('user_id', userId);

      const existingCodes   = (existingUA || []).map(ua => ua.achievements?.badge_code).filter(Boolean);
      unlockedAchievements = checkAchievements(userId, allTxs || [], allGoals || [], existingCodes);

      // Record new achievements
      for (const badgeCode of unlockedAchievements) {
        const { data: ach } = await db.from('achievements').select('id, name').eq('badge_code', badgeCode).single();
        if (ach) {
          await db.from('user_achievements').insert([{ user_id: userId, achievement_id: ach.id }]);
          await db.from('notifications').insert([{
            user_id: userId,
            title:   `Achievement Unlocked: ${ach.name}! 🏅`,
            message: `Awesome financial milestone! You earned the "${ach.name}" badge.`,
            type:    'milestone'
          }]);
        }
      }

      // Check if target goal is completed
      const thisGoal = (allGoals || []).find(g => g.id === goal_id);
      if (thisGoal) {
        const goalTotal = (allTxs || [])
          .filter(t => t.goal_id === goal_id)
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        if (goalTotal >= Number(thisGoal.target_amount) && thisGoal.status !== 'completed') {
          goalCompleted = true;
          await db.from('goals').update({ status: 'completed' }).eq('id', goal_id);
          await db.from('notifications').insert([{
            user_id: userId,
            title:   `Goal Achieved: ${thisGoal.name}! 🏆`,
            message: `You reached 100% of your target amount (₹${Number(thisGoal.target_amount).toLocaleString('en-IN')})!`,
            type:    'completion'
          }]);
        }
      }

      return res.status(201).json({
        success: true,
        message: 'Savings added successfully!',
        data,
        goalCompleted,
        unlockedAchievements
      });
    }

    // Demo store
    store.transactions.unshift(newTx);

    const targetGoal = store.goals.find(g => g.id === goal_id);
    if (targetGoal) {
      const goalTxs  = store.transactions.filter(t => t.goal_id === goal_id);
      const totalSaved = goalTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);

      if (totalSaved >= Number(targetGoal.target_amount) && targetGoal.status !== 'completed') {
        targetGoal.status = 'completed';
        goalCompleted = true;
        store.notifications.unshift({
          id:         'notif-' + Date.now(),
          user_id:    userId,
          title:      `Goal Achieved: ${targetGoal.name}! 🏆`,
          message:    `Congratulations! You saved ₹${totalSaved.toLocaleString('en-IN')} and reached 100% of your goal!`,
          type:       'completion',
          is_read:    false,
          created_at: new Date().toISOString()
        });
      }
    }

    const userTxs   = store.transactions.filter(t => t.user_id === userId);
    const userGoals = store.goals.filter(g => g.user_id === userId);
    const unlockedCodes = store.userAchievements
      .filter(ua => ua.user_id === userId)
      .map(ua => {
        const ach = store.achievements.find(a => a.id === ua.achievement_id);
        return ach ? ach.badge_code : null;
      })
      .filter(Boolean);

    unlockedAchievements = checkAchievements(userId, userTxs, userGoals, unlockedCodes);

    for (const code of unlockedAchievements) {
      const ach = store.achievements.find(a => a.badge_code === code);
      if (ach) {
        store.userAchievements.push({
          id:             'uach-' + Date.now() + Math.random(),
          user_id:        userId,
          achievement_id: ach.id,
          unlocked_at:    new Date().toISOString()
        });
        store.notifications.unshift({
          id:         'notif-' + Date.now() + Math.random(),
          user_id:    userId,
          title:      `Achievement Unlocked: ${ach.name}! 🏅`,
          message:    ach.description,
          type:       'milestone',
          is_read:    false,
          created_at: new Date().toISOString()
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Savings added successfully!',
      data: newTx,
      goalCompleted,
      unlockedAchievements
    });
  } catch (err) {
    console.error('Error adding savings:', err);
    return res.status(500).json({ success: false, error: 'Failed to record savings transaction.' });
  }
});

// PUT /api/savings/:id - Edit savings transaction
router.put('/:id', authMiddleware, validateSavings, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { goal_id, amount, transaction_date, note } = req.body;

    if (isConfigured && !req.user.isDemo) {
      const db = createUserSupabaseClient(req.user._jwt);

      const { data, error } = await db
        .from('savings_transactions')
        .update({
          goal_id,
          amount:           Number(amount),
          transaction_date,
          note,
          updated_at:       new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, message: 'Transaction updated successfully!', data });
    }

    const index = store.transactions.findIndex(t => t.id === id && t.user_id === userId);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Transaction not found or access denied.' });
    }

    store.transactions[index] = {
      ...store.transactions[index],
      goal_id,
      amount:           Number(amount),
      transaction_date: transaction_date || store.transactions[index].transaction_date,
      note:             note || '',
      updated_at:       new Date().toISOString()
    };

    return res.json({ success: true, message: 'Transaction updated successfully!', data: store.transactions[index] });
  } catch (err) {
    console.error('Error updating transaction:', err);
    return res.status(500).json({ success: false, error: 'Failed to update transaction.' });
  }
});

// DELETE /api/savings/:id - Delete savings transaction
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (isConfigured && !req.user.isDemo) {
      const db = createUserSupabaseClient(req.user._jwt);

      const { error } = await db
        .from('savings_transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      return res.json({ success: true, message: 'Transaction deleted successfully.' });
    }

    const index = store.transactions.findIndex(t => t.id === id && t.user_id === userId);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Transaction not found or access denied.' });
    }

    store.transactions.splice(index, 1);
    return res.json({ success: true, message: 'Transaction deleted successfully.' });
  } catch (err) {
    console.error('Error deleting transaction:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete transaction.' });
  }
});

module.exports = router;
