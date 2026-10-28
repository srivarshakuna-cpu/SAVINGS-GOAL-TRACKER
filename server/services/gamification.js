// Gamification engine: Streak tracking and Achievement evaluations

function calculateStreaks(transactions) {
  if (!transactions || transactions.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  // Extract unique sorted dates (descending: newest first)
  const dateStrings = [...new Set(transactions.map(t => t.transaction_date))].sort().reverse();
  if (dateStrings.length === 0) return { currentStreak: 0, bestStreak: 0 };

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 0;

  // Check if active: newest date must be today or yesterday
  const newestDate = dateStrings[0];
  const isActive = (newestDate === todayStr || newestDate === yesterday);

  // Calculate streaks across sequential days
  for (let i = 0; i < dateStrings.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prev = new Date(dateStrings[i - 1]);
      const curr = new Date(dateStrings[i]);
      const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);

      if (diffDays === 1) {
        tempStreak++;
      } else {
        if (tempStreak > maxStreak) maxStreak = tempStreak;
        tempStreak = 1;
      }
    }
  }

  if (tempStreak > maxStreak) maxStreak = tempStreak;
  currentStreak = isActive ? tempStreak : 0;

  return {
    currentStreak: Math.max(currentStreak, transactions.length >= 1 ? 1 : 0),
    bestStreak: Math.max(maxStreak, currentStreak)
  };
}

function checkAchievements(userId, allUserTransactions, allUserGoals, existingUnlockedBadges = []) {
  const newUnlocks = [];
  const totalSaved = allUserTransactions.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const totalTxCount = allUserTransactions.length;
  const { currentStreak } = calculateStreaks(allUserTransactions);

  const hasBadge = (code) => existingUnlockedBadges.includes(code);

  // 1. First Step
  if (totalTxCount >= 1 && !hasBadge('FIRST_STEP')) {
    newUnlocks.push('FIRST_STEP');
  }

  // 2. ₹1,000 Saver
  if (totalSaved >= 1000 && !hasBadge('SAVER_1000')) {
    newUnlocks.push('SAVER_1000');
  }

  // Goal-based achievements
  for (const goal of allUserGoals) {
    const goalTxs = allUserTransactions.filter(t => t.goal_id === goal.id);
    const goalSaved = goalTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const target = Number(goal.target_amount) || 1;
    const pct = (goalSaved / target) * 100;

    // 25% complete
    if (pct >= 25 && !hasBadge('QUARTER_WAY') && !newUnlocks.includes('QUARTER_WAY')) {
      newUnlocks.push('QUARTER_WAY');
    }
    // Halfway (50%)
    if (pct >= 50 && !hasBadge('HALFWAY') && !newUnlocks.includes('HALFWAY')) {
      newUnlocks.push('HALFWAY');
    }
    // Almost There (75%)
    if (pct >= 75 && !hasBadge('ALMOST_THERE') && !newUnlocks.includes('ALMOST_THERE')) {
      newUnlocks.push('ALMOST_THERE');
    }
    // Goal Crusher (100%)
    if (pct >= 100 && !hasBadge('GOAL_CRUSHER') && !newUnlocks.includes('GOAL_CRUSHER')) {
      newUnlocks.push('GOAL_CRUSHER');
    }
  }

  // Consistent Saver (streak of 3 or more entries)
  if ((currentStreak >= 3 || totalTxCount >= 3) && !hasBadge('CONSISTENT_SAVER') && !newUnlocks.includes('CONSISTENT_SAVER')) {
    newUnlocks.push('CONSISTENT_SAVER');
  }

  return newUnlocks;
}

module.exports = {
  calculateStreaks,
  checkAchievements
};

