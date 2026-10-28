// In-memory data store with realistic demo data
// Used when Supabase live keys are not configured or as local fallback

const defaultCategories = [
  { id: 'cat-1', user_id: null, name: 'Education', icon: 'graduation-cap', type: 'savings' },
  { id: 'cat-2', user_id: null, name: 'Travel', icon: 'plane', type: 'savings' },
  { id: 'cat-3', user_id: null, name: 'Emergency Fund', icon: 'shield-alert', type: 'savings' },
  { id: 'cat-4', user_id: null, name: 'Electronics', icon: 'laptop', type: 'savings' },
  { id: 'cat-5', user_id: null, name: 'Vehicle', icon: 'car', type: 'savings' },
  { id: 'cat-6', user_id: null, name: 'Home & Real Estate', icon: 'home', type: 'savings' },
  { id: 'cat-7', user_id: null, name: 'Health & Wellness', icon: 'heart-pulse', type: 'both' },
  { id: 'cat-8', user_id: null, name: 'Shopping', icon: 'shopping-bag', type: 'both' },
  { id: 'cat-9', user_id: null, name: 'Wedding & Family', icon: 'gem', type: 'savings' },
  { id: 'cat-10', user_id: null, name: 'Housing & Rent', icon: 'building', type: 'expense' },
  { id: 'cat-11', user_id: null, name: 'Food & Groceries', icon: 'utensils', type: 'expense' },
  { id: 'cat-12', user_id: null, name: 'Transportation', icon: 'bus', type: 'expense' },
  { id: 'cat-13', user_id: null, name: 'Entertainment', icon: 'film', type: 'expense' },
  { id: 'cat-14', user_id: null, name: 'Custom', icon: 'sparkles', type: 'both' }
];

const defaultAchievements = [
  { id: 'ach-1', badge_code: 'FIRST_STEP', name: 'First Step', description: 'Recorded your very first savings transaction.', icon: 'footprints', threshold_value: 1 },
  { id: 'ach-2', badge_code: 'SAVER_1000', name: '₹1,000 Saver', description: 'Accumulated a total savings of ₹1,000 or more.', icon: 'indian-rupee', threshold_value: 1000 },
  { id: 'ach-3', badge_code: 'QUARTER_WAY', name: '25% Complete', description: 'Reached 25% of any target savings goal.', icon: 'pie-chart', threshold_value: 25 },
  { id: 'ach-4', badge_code: 'HALFWAY', name: 'Halfway There', description: 'Reached 50% milestone on a savings goal.', icon: 'award', threshold_value: 50 },
  { id: 'ach-5', badge_code: 'ALMOST_THERE', name: 'Almost There', description: 'Reached 75% milestone on a savings goal.', icon: 'trending-up', threshold_value: 75 },
  { id: 'ach-6', badge_code: 'GOAL_CRUSHER', name: 'Goal Crusher', description: 'Fully reached 100% of a target savings goal!', icon: 'trophy', threshold_value: 100 },
  { id: 'ach-7', badge_code: 'CONSISTENT_SAVER', name: 'Consistent Saver', description: 'Maintained an active saving streak of 3 consecutive entries.', icon: 'flame', threshold_value: 3 }
];

// Default demo user
const demoUser = {
  id: 'usr-demo-001',
  email: 'demo@saver.in',
  full_name: 'Varsha Sharma',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  role: 'admin', // Admin by default in demo mode so full capabilities can be evaluated
  currency: 'INR',
  created_at: new Date(Date.now() - 90 * 86400000).toISOString()
};

// Seed demo goals
const demoGoals = [
  {
    id: 'goal-1',
    user_id: 'usr-demo-001',
    name: 'MacBook Pro M3 Max',
    description: 'Saving for powerful developer machine for freelancing & AI projects.',
    target_amount: 199900,
    deadline: new Date(Date.now() + 120 * 86400000).toISOString().split('T')[0],
    category_id: 'cat-4',
    icon_url: 'laptop',
    status: 'active',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'goal-2',
    user_id: 'usr-demo-001',
    name: 'Euro Trip Vacation',
    description: '14-day holiday exploring Switzerland, Italy, and France.',
    target_amount: 250000,
    deadline: new Date(Date.now() + 210 * 86400000).toISOString().split('T')[0],
    category_id: 'cat-2',
    icon_url: 'plane',
    status: 'active',
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'goal-3',
    user_id: 'usr-demo-001',
    name: 'Emergency Rainy Day Fund',
    description: '6 months of living expenses safely preserved.',
    target_amount: 150000,
    deadline: new Date(Date.now() + 300 * 86400000).toISOString().split('T')[0],
    category_id: 'cat-3',
    icon_url: 'shield-alert',
    status: 'active',
    created_at: new Date(Date.now() - 75 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'goal-4',
    user_id: 'usr-demo-001',
    name: 'Electric Scooter (Ather 450X)',
    description: 'Daily eco-friendly city commute vehicle.',
    target_amount: 135000,
    deadline: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
    category_id: 'cat-5',
    icon_url: 'car',
    status: 'completed',
    created_at: new Date(Date.now() - 120 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 86400000).toISOString()
  }
];

// Seed demo transactions
const demoTransactions = [
  { id: 'tx-1', user_id: 'usr-demo-001', goal_id: 'goal-1', category_id: 'cat-4', amount: 35000, transaction_date: new Date(Date.now() - 40 * 86400000).toISOString().split('T')[0], note: 'Project milestone bonus', created_at: new Date().toISOString() },
  { id: 'tx-2', user_id: 'usr-demo-001', goal_id: 'goal-1', category_id: 'cat-4', amount: 25000, transaction_date: new Date(Date.now() - 25 * 86400000).toISOString().split('T')[0], note: 'Monthly savings allocation', created_at: new Date().toISOString() },
  { id: 'tx-3', user_id: 'usr-demo-001', goal_id: 'goal-1', category_id: 'cat-4', amount: 20000, transaction_date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0], note: 'Freelance frontend gig', created_at: new Date().toISOString() },
  { id: 'tx-4', user_id: 'usr-demo-001', goal_id: 'goal-2', category_id: 'cat-2', amount: 40000, transaction_date: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0], note: 'Initial vacation deposit', created_at: new Date().toISOString() },
  { id: 'tx-5', user_id: 'usr-demo-001', goal_id: 'goal-2', category_id: 'cat-2', amount: 30000, transaction_date: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0], note: 'Festival gift savings', created_at: new Date().toISOString() },
  { id: 'tx-6', user_id: 'usr-demo-001', goal_id: 'goal-3', category_id: 'cat-3', amount: 50000, transaction_date: new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0], note: 'FD return transfer', created_at: new Date().toISOString() },
  { id: 'tx-7', user_id: 'usr-demo-001', goal_id: 'goal-3', category_id: 'cat-3', amount: 25000, transaction_date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], note: 'Salary emergency cushion', created_at: new Date().toISOString() },
  { id: 'tx-8', user_id: 'usr-demo-001', goal_id: 'goal-4', category_id: 'cat-5', amount: 135000, transaction_date: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0], note: 'Final lump sum purchase', created_at: new Date().toISOString() }
];

const currentDate = new Date();
const currentMonth = currentDate.getMonth() + 1;
const currentYear = currentDate.getFullYear();

// Seed demo budget
const demoBudgets = [
  {
    id: 'bgt-1',
    user_id: 'usr-demo-001',
    month: currentMonth,
    year: currentYear,
    income: 95000,
    planned_savings: 35000,
    created_at: new Date().toISOString()
  }
];

const demoExpenses = [
  { id: 'exp-1', user_id: 'usr-demo-001', budget_id: 'bgt-1', category_id: 'cat-10', amount: 22000, expense_date: new Date().toISOString().split('T')[0], note: 'Apartment rent & maintenance', created_at: new Date().toISOString() },
  { id: 'exp-2', user_id: 'usr-demo-001', budget_id: 'bgt-1', category_id: 'cat-11', amount: 12500, expense_date: new Date().toISOString().split('T')[0], note: 'Groceries, fruits & provisions', created_at: new Date().toISOString() },
  { id: 'exp-3', user_id: 'usr-demo-001', budget_id: 'bgt-1', category_id: 'cat-12', amount: 3500, expense_date: new Date().toISOString().split('T')[0], note: 'Fuel & Metro card recharge', created_at: new Date().toISOString() },
  { id: 'exp-4', user_id: 'usr-demo-001', budget_id: 'bgt-1', category_id: 'cat-13', amount: 4200, expense_date: new Date().toISOString().split('T')[0], note: 'Weekend cinema & dining', created_at: new Date().toISOString() }
];

const demoUserAchievements = [
  { id: 'uach-1', user_id: 'usr-demo-001', achievement_id: 'ach-1', unlocked_at: new Date(Date.now() - 60 * 86400000).toISOString() },
  { id: 'uach-2', user_id: 'usr-demo-001', achievement_id: 'ach-2', unlocked_at: new Date(Date.now() - 60 * 86400000).toISOString() },
  { id: 'uach-3', user_id: 'usr-demo-001', achievement_id: 'ach-3', unlocked_at: new Date(Date.now() - 25 * 86400000).toISOString() },
  { id: 'uach-4', user_id: 'usr-demo-001', achievement_id: 'ach-6', unlocked_at: new Date(Date.now() - 10 * 86400000).toISOString() }
];

const demoNotifications = [
  {
    id: 'notif-1',
    user_id: 'usr-demo-001',
    title: 'Goal Completed! 🏆',
    message: 'Congratulations! You reached 100% of your Electric Scooter (Ather 450X) target!',
    type: 'completion',
    is_read: true,
    created_at: new Date(Date.now() - 10 * 86400000).toISOString()
  },
  {
    id: 'notif-2',
    user_id: 'usr-demo-001',
    title: 'Milestone Unlocked! 🚀',
    message: 'You have completed over 40% of your MacBook Pro goal!',
    type: 'milestone',
    is_read: false,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    id: 'notif-3',
    user_id: 'usr-demo-001',
    title: 'Monthly Savings Target Reminder 🔔',
    message: 'You are on track to save ₹35,000 this month. Keep up the great consistency!',
    type: 'streak',
    is_read: false,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString()
  }
];

const demoPreferences = {
  user_id: 'usr-demo-001',
  theme: 'light',
  email_notifications: true,
  reminder_notifications: true,
  streak_notifications: true,
  updated_at: new Date().toISOString()
};

// Store container
const store = {
  users: [demoUser],
  categories: [...defaultCategories],
  goals: [...demoGoals],
  transactions: [...demoTransactions],
  budgets: [...demoBudgets],
  expenses: [...demoExpenses],
  achievements: [...defaultAchievements],
  userAchievements: [...demoUserAchievements],
  notifications: [...demoNotifications],
  preferences: { 'usr-demo-001': demoPreferences }
};

module.exports = store;

