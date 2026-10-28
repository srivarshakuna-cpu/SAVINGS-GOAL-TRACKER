const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { isConfigured, createUserSupabaseClient } = require('../services/supabaseClient');
const store = require('../services/dataStore');
const { calculateStreaks } = require('../services/gamification');

// GET /api/dashboard - Central dashboard financial aggregates
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const currentYear  = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    let goals        = [];
    let transactions = [];
    let budget       = null;
    let expenses     = [];

    if (isConfigured && !req.user.isDemo) {
      const db = createUserSupabaseClient(req.user._jwt);

      try {
        const [gRes, tRes, bRes, eRes] = await Promise.all([
          db.from('goals').select('*, categories(*)').eq('user_id', userId),
          db.from('savings_transactions').select('*, goals(name), categories(name, icon)').eq('user_id', userId).order('transaction_date', { ascending: false }),
          db.from('budgets').select('*').eq('user_id', userId).eq('year', currentYear).eq('month', currentMonth).maybeSingle(),
          db.from('expenses').select('*').eq('user_id', userId).gte('expense_date', `${currentMonthStr}-01`)
        ]);

        if (gRes.data && !gRes.error) {
          goals        = gRes.data;
          transactions = tRes.data  || [];
          budget       = bRes.data;
          expenses     = eRes.data  || [];
        } else {
          // Schema tables pending in Supabase — fall through to store
          console.log('[Dashboard] Supabase query notice:', gRes.error?.message, '— using store fallback.');
          goals        = store.goals.filter(g => g.user_id === userId);
          transactions = store.transactions.filter(t => t.user_id === userId);
          budget       = store.budgets.find(b => b.user_id === userId && b.year === currentYear && b.month === currentMonth) || store.budgets[0];
          expenses     = store.expenses.filter(e => e.user_id === userId);
        }
      } catch (dbErr) {
        console.warn('[Dashboard] DB error, using store fallback:', dbErr.message);
        goals        = store.goals.filter(g => g.user_id === userId);
        transactions = store.transactions.filter(t => t.user_id === userId);
        budget       = store.budgets.find(b => b.user_id === userId && b.year === currentYear && b.month === currentMonth) || store.budgets[0];
        expenses     = store.expenses.filter(e => e.user_id === userId);
      }
    } else {
      goals        = store.goals.filter(g => g.user_id === userId);
      transactions = store.transactions.filter(t => t.user_id === userId);
      budget       = store.budgets.find(b => b.user_id === userId && b.year === currentYear && b.month === currentMonth) || store.budgets[0];
      expenses     = store.expenses.filter(e => e.user_id === userId);
    }

    // 1. Calculate savings per goal and identify active vs completed
    let totalSavings       = 0;
    let totalActiveSavings = 0;
    let totalActiveTarget  = 0;
    let activeGoalsCount   = 0;
    let completedGoalsCount = 0;

    const enrichedGoals = goals.map(g => {
      const gTxs    = transactions.filter(t => t.goal_id === g.id);
      const saved   = gTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const target  = Number(g.target_amount) || 1;
      const progress = Math.min(100, Math.round((saved / target) * 100));
      const isCompleted = saved >= target || g.status === 'completed';

      totalSavings += saved;
      if (isCompleted) {
        completedGoalsCount++;
      } else {
        activeGoalsCount++;
        totalActiveSavings += saved;
        totalActiveTarget  += target;
      }

      return {
        ...g,
        saved_amount:       saved,
        remaining_amount:   Math.max(0, target - saved),
        progress_percentage: progress,
        status:             isCompleted ? 'completed' : 'active'
      };
    });

    const remainingTarget = Math.max(0, totalActiveTarget - totalActiveSavings);

    // 2. Monthly savings
    const monthlySavings = transactions
      .filter(t => (t.transaction_date || '').startsWith(currentMonthStr))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // 3. Monthly Income and Expenses
    const monthlyIncome        = Number(budget?.income || 0);
    const totalMonthlyExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // 4. Savings Rate
    let savingsRate = 0;
    if (monthlyIncome > 0) {
      savingsRate = Math.min(100, Math.round((monthlySavings / monthlyIncome) * 100));
    }

    // 5. Streaks
    const streaks = calculateStreaks(transactions);

    // 6. Recent transactions (latest 5)
    const recentTransactions = transactions.slice(0, 5).map(t => {
      const goal = goals.find(g => g.id === t.goal_id);
      const cat  = store.categories.find(c => c.id === (t.category_id || goal?.category_id));
      return {
        id:               t.id,
        goal_name:        goal?.name            || t.goals?.name    || 'General Goal',
        amount:           Number(t.amount),
        transaction_date: t.transaction_date,
        note:             t.note,
        category_name:    cat?.name             || t.categories?.name || 'Savings'
      };
    });

    return res.json({
      success: true,
      data: {
        summary: {
          totalSavings,
          activeGoalsCount,
          completedGoalsCount,
          monthlySavings,
          remainingTarget,
          savingsRate,
          monthlyIncome,
          totalMonthlyExpenses,
          currentStreak: streaks.currentStreak,
          bestStreak:    streaks.bestStreak
        },
        goals: enrichedGoals,
        recentTransactions,
        budget: budget ? {
          ...budget,
          totalExpenses:    totalMonthlyExpenses,
          availableAmount:  Math.max(0, monthlyIncome - totalMonthlyExpenses),
          disposableAmount: Math.max(0, monthlyIncome - totalMonthlyExpenses - Number(budget.planned_savings || 0))
        } : null
      }
    });
  } catch (err) {
    console.error('Error computing dashboard metrics:', err);
    return res.status(500).json({ success: false, error: 'Failed to compute dashboard metrics.' });
  }
});

module.exports = router;
