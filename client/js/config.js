// Client Configuration & State
const CONFIG = {
  API_BASE: '/api',
  CURRENCY_SYMBOL: '₹',
  DEFAULT_CURRENCY: 'INR',
  THEME_STORAGE_KEY: 'sgt_theme_pref',
  AUTH_TOKEN_KEY: 'sgt_auth_token',
  AUTH_USER_KEY: 'sgt_auth_user'
};

// Global formatters
function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return `${CONFIG.CURRENCY_SYMBOL}${num.toLocaleString('en-IN')}`;
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

// Export to window
window.CONFIG = CONFIG;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;

