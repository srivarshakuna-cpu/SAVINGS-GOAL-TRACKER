// Savings Goal Calculator Engine

function calculateSavingsBreakdown(targetAmount, currentSaved, deadlineDateString) {
  const target = Math.max(0, Number(targetAmount) || 0);
  const saved = Math.max(0, Number(currentSaved) || 0);
  const remaining = Math.max(0, target - saved);

  let progress = 0;
  if (target > 0) {
    progress = Math.min(100, Math.round((saved / target) * 100 * 10) / 10);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadline = new Date(deadlineDateString);
  deadline.setHours(0, 0, 0, 0);

  let daysRemaining = 0;
  if (!isNaN(deadline.getTime())) {
    const diffTime = deadline.getTime() - today.getTime();
    daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  const weeksRemaining = Math.max(1, Math.ceil(daysRemaining / 7));
  const monthsRemaining = Math.max(1, Math.ceil(daysRemaining / 30.417));

  const monthlyRequired = remaining > 0 ? Math.round(remaining / monthsRemaining) : 0;
  const weeklyRequired = remaining > 0 ? Math.round(remaining / weeksRemaining) : 0;
  const dailyRequired = remaining > 0 && daysRemaining > 0 ? Math.round(remaining / daysRemaining) : 0;

  return {
    target,
    saved,
    remaining,
    progress,
    daysRemaining,
    weeksRemaining,
    monthsRemaining,
    monthlyRequired,
    weeklyRequired,
    dailyRequired,
    isCompleted: saved >= target && target > 0
  };
}

window.calculateSavingsBreakdown = calculateSavingsBreakdown;

