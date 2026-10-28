const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { validateBudget, validateExpense } = require('../middleware/validation');
const { isConfigured, createUserSupabaseClient } = require('../services/supabaseClient');
const store = require('../services/dataStore');

// GET /api/budget - Get current budget and expenses for selected month & year
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const now    = new Date();
    const month  = Number(req.query.month) || (now.getMonth() + 1);
    const year   = Number(req.query.year)  || now.getFullYear();

    if (isConfigured && !req.user.isDemo) {
      const db = createUserSupabaseClient(req.user._jwt);

      const { data: budget } = await db
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle();

      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate   = `${year}-${String(month).padStart(2, '0')}-31`;

      const { data: expenses } = await db
        .from('expenses')
        .select('*, categories(*)')
        .eq('user_id', userId)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)
        .order('expense_date', { ascending: false });

      const totalExpenses    = (expenses || []).reduce((acc, e) => acc + Number(e.amount || 0), 0);
      const income           = Number(budget?.income          || 0);
      const plannedSavings   = Number(budget?.planned_savings || 0);
      const availableAmount  = Math.max(0, income - totalExpenses);
      const disposableAmount = Math.max(0, availableAmount - plannedSavings);

      return res.json({
        success: true,
        data: {
          budget:         budget || { month, year, income: 0, planned_savings: 0 },
          expenses:       expenses || [],
          totalExpenses,
          availableAmount,
          disposableAmount
        }
      });
    }

    // Demo store
    let budget = store.budgets.find(b => b.user_id === userId && b.month === month && b.year === year);
    if (!budget) {
      budget = { id: 'bgt-temp', user_id: userId, month, year, income: 75000, planned_savings: 25000 };
    }

    const expenses = store.expenses
      .filter(e => e.user_id === userId)
      .map(e => ({
        ...e,
        category: store.categories.find(c => c.id === e.category_id)
      }));

    const totalExpenses    = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
    const income           = Number(budget.income          || 0);
    const plannedSavings   = Number(budget.planned_savings || 0);
    const availableAmount  = Math.max(0, income - totalExpenses);
    const disposableAmount = Math.max(0, availableAmount - plannedSavings);

    return res.json({
      success: true,
      data: { budget, expenses, totalExpenses, availableAmount, disposableAmount }
    });
  } catch (err) {
    console.error('Error fetching budget:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve budget.' });
  }
});

// POST /api/budget - Create or update monthly budget
router.post('/', authMiddleware, validateBudget, async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year, income, planned_savings } = req.body;

    if (isConfigured && !req.user.isDemo) {
      const db = createUserSupabaseClient(req.user._jwt);

      const { data, error } = await db
        .from('budgets')
        .upsert({
          user_id:         userId,
          month,
          year,
          income,
          planned_savings,
          updated_at:      new Date().toISOString()
        }, { onConflict: 'user_id,month,year' })
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, message: 'Budget updated successfully!', data });
    }

    let bIndex = store.budgets.findIndex(b => b.user_id === userId && b.month === month && b.year === year);
    const updatedBudget = {
      id:              bIndex >= 0 ? store.budgets[bIndex].id : 'bgt-' + Date.now(),
      user_id:         userId,
      month,
      year,
      income,
      planned_savings,
      updated_at:      new Date().toISOString()
    };

    if (bIndex >= 0) {
      store.budgets[bIndex] = updatedBudget;
    } else {
      store.budgets.push(updatedBudget);
    }

    return res.json({ success: true, message: 'Budget saved successfully!', data: updatedBudget });
  } catch (err) {
    console.error('Error saving budget:', err);
    return res.status(500).json({ success: false, error: 'Failed to update budget.' });
  }
});

// POST /api/budget/expenses - Add an expense item
router.post('/expenses', authMiddleware, validateExpense, async (req, res) => {
  try {
    const userId = req.user.id;
    const { budget_id, category_id, amount, expense_date, note } = req.body;
    const date = expense_date || new Date().toISOString().split('T')[0];

    if (isConfigured && !req.user.isDemo) {
      const db = createUserSupabaseClient(req.user._jwt);

      const { data, error } = await db
        .from('expenses')
        .insert([{
          user_id:      userId,
          budget_id:    budget_id    || null,
          category_id:  category_id  || null,
          amount:       Number(amount),
          expense_date: date,
          note:         note || ''
        }])
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json({ success: true, message: 'Expense added successfully!', data });
    }

    const newExpense = {
      id:           'exp-' + Date.now(),
      user_id:      userId,
      budget_id:    budget_id    || 'bgt-1',
      category_id:  category_id  || 'cat-11',
      amount:       Number(amount),
      expense_date: date,
      note:         note || '',
      created_at:   new Date().toISOString()
    };

    store.expenses.unshift(newExpense);
    return res.status(201).json({ success: true, message: 'Expense added successfully!', data: newExpense });
  } catch (err) {
    console.error('Error adding expense:', err);
    return res.status(500).json({ success: false, error: 'Failed to record expense.' });
  }
});

// DELETE /api/budget/expenses/:id - Delete an expense item
router.delete('/expenses/:id', authMiddleware, async (req, res) => {
  try {
    const { id }   = req.params;
    const userId   = req.user.id;

    if (isConfigured && !req.user.isDemo) {
      const db = createUserSupabaseClient(req.user._jwt);

      const { error } = await db
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      return res.json({ success: true, message: 'Expense deleted successfully.' });
    }

    const index = store.expenses.findIndex(e => e.id === id && e.user_id === userId);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Expense not found.' });
    }

    store.expenses.splice(index, 1);
    return res.json({ success: true, message: 'Expense deleted successfully.' });
  } catch (err) {
    console.error('Error deleting expense:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete expense.' });
  }
});

module.exports = router;
