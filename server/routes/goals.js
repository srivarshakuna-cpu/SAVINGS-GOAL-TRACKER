const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { validateGoal } = require('../middleware/validation');
const { isConfigured, createUserSupabaseClient } = require('../services/supabaseClient');
const store = require('../services/dataStore');

// Helper to compute derived metrics for a goal
function calculateGoalMetrics(goal, transactions) {
  const goalTransactions = transactions.filter(t => t.goal_id === goal.id);
  const saved_amount = goalTransactions.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const target = Number(goal.target_amount) || 1;
  const remaining_amount = Math.max(0, target - saved_amount);
  const progress_percentage = Math.min(100, Math.round((saved_amount / target) * 100 * 10) / 10);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(goal.deadline);
  deadlineDate.setHours(0, 0, 0, 0);

  const diffTime = deadlineDate.getTime() - today.getTime();
  const days_remaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const weeks_remaining = Math.max(1, Math.ceil(days_remaining / 7));
  const months_remaining = Math.max(1, Math.ceil(days_remaining / 30.417));

  const recommended_monthly = remaining_amount > 0 ? Math.round(remaining_amount / months_remaining) : 0;
  const recommended_weekly  = remaining_amount > 0 ? Math.round(remaining_amount / weeks_remaining)  : 0;
  const recommended_daily   = remaining_amount > 0 && days_remaining > 0 ? Math.round(remaining_amount / days_remaining) : 0;

  // Auto-status update if reached
  const effectiveStatus = saved_amount >= target ? 'completed' : goal.status;

  return {
    ...goal,
    saved_amount,
    remaining_amount,
    progress_percentage,
    days_remaining,
    weeks_remaining,
    months_remaining,
    recommended_monthly,
    recommended_weekly,
    recommended_daily,
    status: effectiveStatus
  };
}

// GET /api/goals - Fetch all user goals with metrics
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    if (isConfigured && !req.user.isDemo) {
      const db = createUserSupabaseClient(req.user._jwt);

      const { data: goals, error: gErr } = await db
        .from('goals')
        .select('*, categories(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!gErr) {
        const { data: transactions } = await db
          .from('savings_transactions')
          .select('*')
          .eq('user_id', userId);

        const enrichedGoals = goals.map(g => calculateGoalMetrics(g, transactions || []));
        return res.json({ success: true, data: enrichedGoals });
      }
      console.log('[Supabase Notice] goals query:', gErr.message, '— using store fallback until schema is created.');
    }

    // Demo / fallback store
    const userGoals = store.goals.filter(g => g.user_id === userId);
    const userTransactions = store.transactions.filter(t => t.user_id === userId);

    const enrichedGoals = userGoals.map(g => {
      const category = store.categories.find(c => c.id === g.category_id);
      const enriched = calculateGoalMetrics(g, userTransactions);
      return { ...enriched, category };
    });

    return res.json({ success: true, data: enrichedGoals });
  } catch (err) {
    console.error('Error fetching goals:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve savings goals.' });
  }
});

// GET /api/goals/:id - Fetch single goal with transactions
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (isConfigured && !req.user.isDemo) {
      const db = createUserSupabaseClient(req.user._jwt);

      const { data: goal, error: gErr } = await db
        .from('goals')
        .select('*, categories(*)')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (gErr || !goal) {
        return res.status(404).json({ success: false, error: 'Goal not found or access denied.' });
      }

      const { data: transactions, error: tErr } = await db
        .from('savings_transactions')
        .select('*, categories(*)')
        .eq('goal_id', id)
        .order('transaction_date', { ascending: false });

      if (tErr) throw tErr;

      const enrichedGoal = calculateGoalMetrics(goal, transactions || []);
      return res.json({ success: true, data: { ...enrichedGoal, transactions: transactions || [] } });
    }

    // Demo store
    const goal = store.goals.find(g => g.id === id && g.user_id === userId);
    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found or access denied.' });
    }

    const category = store.categories.find(c => c.id === goal.category_id);
    const transactions = store.transactions
      .filter(t => t.goal_id === id)
      .map(t => ({
        ...t,
        category: store.categories.find(c => c.id === t.category_id)
      }))
      .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));

    const enriched = calculateGoalMetrics(goal, transactions);
    return res.json({ success: true, data: { ...enriched, category, transactions } });
  } catch (err) {
    console.error('Error fetching goal details:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve goal details.' });
  }
});

// POST /api/goals - Create new goal (with optional initial savings)
router.post('/', authMiddleware, validateGoal, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, target_amount, deadline, category_id, icon_url, initial_savings } = req.body;

    const newGoalId = 'goal-' + Date.now();
    const newGoal = {
      id: newGoalId,
      user_id: userId,
      name,
      description: description || '',
      target_amount: Number(target_amount),
      deadline,
      category_id: category_id || null,
      icon_url: icon_url || 'target',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isConfigured && !req.user.isDemo) {
      const db = createUserSupabaseClient(req.user._jwt);

      const { data, error } = await db
        .from('goals')
        .insert([{
          user_id: userId,
          name,
          description: description || '',
          target_amount: Number(target_amount),
          deadline,
          category_id: category_id || null,
          icon_url: icon_url || 'target',
          status: 'active'
        }])
        .select()
        .single();

      if (error) throw error;

      // Handle optional initial savings
      if (initial_savings && Number(initial_savings) > 0) {
        await db.from('savings_transactions').insert([{
          user_id: userId,
          goal_id: data.id,
          category_id: category_id || null,
          amount: Number(initial_savings),
          transaction_date: new Date().toISOString().split('T')[0],
          note: 'Initial deposit'
        }]);
      }

      return res.status(201).json({ success: true, message: 'Goal created successfully!', data });
    }

    // Demo store
    store.goals.unshift(newGoal);

    if (initial_savings && Number(initial_savings) > 0) {
      const initTx = {
        id: 'tx-' + Date.now(),
        user_id: userId,
        goal_id: newGoalId,
        category_id: category_id || null,
        amount: Number(initial_savings),
        transaction_date: new Date().toISOString().split('T')[0],
        note: 'Initial deposit upon goal creation',
        created_at: new Date().toISOString()
      };
      store.transactions.unshift(initTx);
    }

    return res.status(201).json({ success: true, message: 'Goal created successfully!', data: newGoal });
  } catch (err) {
    console.error('Error creating goal:', err);
    return res.status(500).json({ success: false, error: 'Failed to create goal.' });
  }
});

// PUT /api/goals/:id - Update goal
router.put('/:id', authMiddleware, validateGoal, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { name, description, target_amount, deadline, category_id, icon_url, status } = req.body;

    if (isConfigured && !req.user.isDemo) {
      const db = createUserSupabaseClient(req.user._jwt);

      const { data, error } = await db
        .from('goals')
        .update({
          name,
          description,
          target_amount: Number(target_amount),
          deadline,
          category_id,
          icon_url,
          status: status || 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, message: 'Goal updated successfully!', data });
    }

    const index = store.goals.findIndex(g => g.id === id && g.user_id === userId);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Goal not found or access denied.' });
    }

    store.goals[index] = {
      ...store.goals[index],
      name,
      description,
      target_amount: Number(target_amount),
      deadline,
      category_id,
      icon_url: icon_url || store.goals[index].icon_url,
      status: status || store.goals[index].status,
      updated_at: new Date().toISOString()
    };

    return res.json({ success: true, message: 'Goal updated successfully!', data: store.goals[index] });
  } catch (err) {
    console.error('Error updating goal:', err);
    return res.status(500).json({ success: false, error: 'Failed to update goal.' });
  }
});

// DELETE /api/goals/:id - Delete goal
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (isConfigured && !req.user.isDemo) {
      const db = createUserSupabaseClient(req.user._jwt);

      const { error } = await db
        .from('goals')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      return res.json({ success: true, message: 'Goal deleted successfully.' });
    }

    const index = store.goals.findIndex(g => g.id === id && g.user_id === userId);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Goal not found or access denied.' });
    }

    store.goals.splice(index, 1);
    store.transactions = store.transactions.filter(t => t.goal_id !== id);

    return res.json({ success: true, message: 'Goal deleted successfully.' });
  } catch (err) {
    console.error('Error deleting goal:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete goal.' });
  }
});

module.exports = router;
