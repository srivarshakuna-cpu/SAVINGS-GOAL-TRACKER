const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { isConfigured, createUserSupabaseClient } = require('../services/supabaseClient');
const store = require('../services/dataStore');

// GET /api/insights - Generate personalized insights & chart datasets
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const currentYear     = now.getFullYear();
    const currentMonth    = now.getMonth() + 1;
    const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    let goals        = [];
    let transactions = [];
    let budget       = null;
    let expenses     = [];
    let categories   = [];

    if (isConfigured && !req.user.isDemo) {
      const db = createUserSupabaseClient(req.user._jwt);

      const [gRes, tRes, bRes, eRes, cRes] = await Promise.all([
        db.from('goals').select('*').eq('user_id', userId),
        db.from('savings_transactions').select('*').eq('user_id', userId),
        db.from('budgets').select('*').eq('user_id', userId).eq('year', currentYear).eq('month', currentMonth).maybeSingle(),
        db.from('expenses').select('*').eq('user_id', userId),
        db.from('categories').select('*')
      ]);

      goals        = gRes.data || [];
      transactions = tRes.data || [];
      budget       = bRes.data;
      expenses     = eRes.data || [];
      categories   = cRes.data || [];
    } else {
      goals        = store.goals.filter(g => g.user_id === userId);
      transactions = store.transactions.filter(t => t.user_id === userId);
      budget       = store.budgets.find(b => b.user_id === userId && b.year === currentYear && b.month === currentMonth) || store.budgets[0];
      expenses     = store.expenses.filter(e => e.user_id === userId);
      categories   = store.categories;
    }

    // 1. Generate Dynamic Rule-Based Financial Insights
    const insights = [];

    const monthlyIncome     = Number(budget?.income || 0);
    const thisMonthSavings  = transactions
      .filter(t => (t.transaction_date || '').startsWith(currentMonthStr))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    if (monthlyIncome > 0) {
      const rate = Math.round((thisMonthSavings / monthlyIncome) * 100);
      insights.push({
        id:      'ins-rate',
        type:    rate >= 20 ? 'success' : rate >= 10 ? 'info' : 'warning',
        icon:    'trending-up',
        title:   'Savings Rate Efficiency',
        message: `You are saving ${rate}% of your monthly income this month. ${rate >= 20 ? 'Outstanding financial discipline!' : 'Aiming for 20% can accelerate your wealth creation.'}`
      });
    }

    let totalRecommendedThisMonth = 0;
    goals.forEach(goal => {
      const gTxs      = transactions.filter(t => t.goal_id === goal.id);
      const saved     = gTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const target    = Number(goal.target_amount) || 1;
      const remaining = Math.max(0, target - saved);
      const pct       = Math.round((saved / target) * 100);

      const deadlineDate = new Date(goal.deadline);
      const diffDays     = Math.max(0, Math.ceil((deadlineDate.getTime() - now.getTime()) / 86400000));
      const monthsLeft   = Math.max(1, Math.ceil(diffDays / 30.417));
      const monthlyReq   = Math.round(remaining / monthsLeft);

      if (remaining > 0) totalRecommendedThisMonth += monthlyReq;

      if (pct >= 75 && pct < 100) {
        insights.push({
          id:      `ins-goal-${goal.id}`,
          type:    'success',
          icon:    'award',
          title:   'Goal Close to Finish Line!',
          message: `Great progress! You have completed ${pct}% of your "${goal.name}" goal. Only ₹${remaining.toLocaleString('en-IN')} to go!`
        });
      } else if (diffDays <= 30 && diffDays > 0 && remaining > 0) {
        insights.push({
          id:      `ins-deadline-${goal.id}`,
          type:    'warning',
          icon:    'clock',
          title:   'Goal Deadline Approaching',
          message: `Your goal "${goal.name}" is due in ${diffDays} days. You need ₹${remaining.toLocaleString('en-IN')} remaining.`
        });
      }
    });

    if (totalRecommendedThisMonth > 0) {
      insights.push({
        id:      'ins-monthly-target',
        type:    'info',
        icon:    'target',
        title:   'Monthly Savings Requirement',
        message: `You need to save ₹${totalRecommendedThisMonth.toLocaleString('en-IN')} across active goals this month to stay comfortably on track.`
      });
    }

    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    if (monthlyIncome > 0 && totalExpenses > monthlyIncome * 0.7) {
      insights.push({
        id:      'ins-expense-alert',
        type:    'warning',
        icon:    'alert-triangle',
        title:   'High Expense Ratio',
        message: `Your expenses account for ${Math.round((totalExpenses / monthlyIncome) * 100)}% of your monthly income. Consider auditing non-essential spending.`
      });
    }

    const disclaimer = 'Note: These automated insights are calculated from your recorded figures for financial guidance only and do not constitute certified professional financial advice.';

    // 2. Chart Datasets Construction

    // A. Savings Progress Chart
    const progressChart = {
      labels:  goals.map(g => g.name.length > 15 ? g.name.substring(0, 15) + '...' : g.name),
      targets: goals.map(g => Number(g.target_amount)),
      saved:   goals.map(g => {
        const gTxs = transactions.filter(t => t.goal_id === g.id);
        return gTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      })
    };

    // B. Monthly Savings Chart (Last 6 Months)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrendLabels  = [];
    const monthlyTrendSavings = [];

    for (let i = 5; i >= 0; i--) {
      const d      = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label  = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyTrendLabels.push(label);

      const mSaved = transactions
        .filter(t => (t.transaction_date || '').startsWith(prefix))
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      monthlyTrendSavings.push(mSaved);
    }

    // C. Income vs Expense Comparison
    const incomeVsExpense = {
      income:   monthlyIncome   || 80000,
      expenses: totalExpenses   || 35000,
      savings:  thisMonthSavings || 25000
    };

    // D. Category Spending Distribution
    const categorySpendingMap = {};
    expenses.forEach(e => {
      const cat  = categories.find(c => c.id === e.category_id);
      const name = cat ? cat.name : 'Other';
      categorySpendingMap[name] = (categorySpendingMap[name] || 0) + Number(e.amount || 0);
    });

    const categorySpending = {
      labels: Object.keys(categorySpendingMap).length  > 0 ? Object.keys(categorySpendingMap)   : ['Housing', 'Food', 'Transport', 'Entertainment'],
      values: Object.values(categorySpendingMap).length > 0 ? Object.values(categorySpendingMap) : [20000, 10000, 3000, 4000]
    };

    return res.json({
      success: true,
      data: {
        insights,
        disclaimer,
        charts: {
          progressChart,
          monthlyTrend: { labels: monthlyTrendLabels, values: monthlyTrendSavings },
          incomeVsExpense,
          categorySpending
        }
      }
    });
  } catch (err) {
    console.error('Error calculating insights:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate financial insights.' });
  }
});

module.exports = router;
