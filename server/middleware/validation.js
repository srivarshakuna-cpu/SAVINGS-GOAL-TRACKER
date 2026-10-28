// Input validation & sanitization middleware

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[<>]/g, '') // Strip < and > to prevent basic XSS
    .trim();
}

function validateGoal(req, res, next) {
  const { name, target_amount, deadline } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Goal name is required and cannot be empty.' });
  }

  if (name.trim().length > 100) {
    return res.status(400).json({ success: false, error: 'Goal name cannot exceed 100 characters.' });
  }

  const amount = Number(target_amount);
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ success: false, error: 'Target amount must be a positive number greater than ₹0.' });
  }

  if (!deadline) {
    return res.status(400).json({ success: false, error: 'A valid target deadline date is required.' });
  }

  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime())) {
    return res.status(400).json({ success: false, error: 'Invalid deadline date format.' });
  }

  // Sanitize fields
  req.body.name = sanitizeString(req.body.name);
  req.body.description = sanitizeString(req.body.description || '');
  req.body.target_amount = amount;

  next();
}

function validateSavings(req, res, next) {
  const { goal_id, amount, transaction_date } = req.body;

  if (!goal_id) {
    return res.status(400).json({ success: false, error: 'Target goal selection is required.' });
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Savings amount must be greater than ₹0.' });
  }

  if (transaction_date) {
    const txDate = new Date(transaction_date);
    if (isNaN(txDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid transaction date format.' });
    }
  }

  req.body.amount = numAmount;
  req.body.note = sanitizeString(req.body.note || '');
  next();
}

function validateBudget(req, res, next) {
  const { month, year, income, planned_savings } = req.body;

  const m = Number(month);
  const y = Number(year);
  const inc = Number(income);
  const ps = Number(planned_savings);

  if (isNaN(m) || m < 1 || m > 12) {
    return res.status(400).json({ success: false, error: 'Month must be between 1 and 12.' });
  }

  if (isNaN(y) || y < 2020 || y > 2100) {
    return res.status(400).json({ success: false, error: 'Year must be a valid four-digit year.' });
  }

  if (isNaN(inc) || inc < 0) {
    return res.status(400).json({ success: false, error: 'Income must be greater than or equal to ₹0.' });
  }

  if (isNaN(ps) || ps < 0) {
    return res.status(400).json({ success: false, error: 'Planned savings must be greater than or equal to ₹0.' });
  }

  req.body.month = m;
  req.body.year = y;
  req.body.income = inc;
  req.body.planned_savings = ps;
  next();
}

function validateExpense(req, res, next) {
  const { amount, expense_date } = req.body;

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Expense amount must be greater than ₹0.' });
  }

  if (expense_date) {
    const expDate = new Date(expense_date);
    if (isNaN(expDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid expense date format.' });
    }
  }

  req.body.amount = numAmount;
  req.body.note = sanitizeString(req.body.note || '');
  next();
}

module.exports = {
  sanitizeString,
  validateGoal,
  validateSavings,
  validateBudget,
  validateExpense
};

