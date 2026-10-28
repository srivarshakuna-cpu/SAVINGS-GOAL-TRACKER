// Unified API Service Layer

async function apiFetch(endpoint, options = {}) {
  const token = window.auth ? window.auth.getAuthToken() : localStorage.getItem('sgt_auth_token');
  const user = window.auth ? window.auth.getAuthUser() : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(user?.id ? { 'x-user-id': user.id } : {}),
    ...(options.headers || {})
  };

  const url = endpoint.startsWith('http') ? endpoint : `${CONFIG.API_BASE}${endpoint}`;

  try {
    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      if (window.auth && !window.location.pathname.includes('login')) {
        window.auth.clearSession();
        window.location.href = '/login';
      }
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}: Request failed`);
    }

    return data;
  } catch (err) {
    console.error(`[API Error ${endpoint}]:`, err.message);
    throw err;
  }
}

const api = {
  // Goals
  goals: {
    list: () => apiFetch('/goals'),
    get: (id) => apiFetch(`/goals/${id}`),
    create: (data) => apiFetch('/goals', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiFetch(`/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiFetch(`/goals/${id}`, { method: 'DELETE' })
  },

  // Savings Transactions
  savings: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return apiFetch(`/savings?${qs}`);
    },
    add: (data) => apiFetch('/savings', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiFetch(`/savings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiFetch(`/savings/${id}`, { method: 'DELETE' }),
    exportUrl: () => `${CONFIG.API_BASE}/savings/export`
  },

  // Dashboard Aggregates
  dashboard: {
    get: () => apiFetch('/dashboard')
  },

  // Budget & Expenses
  budget: {
    get: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return apiFetch(`/budget?${qs}`);
    },
    save: (data) => apiFetch('/budget', { method: 'POST', body: JSON.stringify(data) }),
    addExpense: (data) => apiFetch('/budget/expenses', { method: 'POST', body: JSON.stringify(data) }),
    deleteExpense: (id) => apiFetch(`/budget/expenses/${id}`, { method: 'DELETE' })
  },

  // Financial Insights & Charts
  insights: {
    get: () => apiFetch('/insights')
  },

  // Achievements & Streaks
  achievements: {
    get: () => apiFetch('/achievements')
  },

  // Notifications
  notifications: {
    list: () => apiFetch('/notifications'),
    markRead: (id) => apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => apiFetch('/notifications/read-all', { method: 'PATCH' })
  },

  // User Profile & Preferences
  profile: {
    get: () => apiFetch('/profile'),
    update: (data) => apiFetch('/profile', { method: 'PUT', body: JSON.stringify(data) }),
    updatePreferences: (data) => apiFetch('/profile/preferences', { method: 'PUT', body: JSON.stringify(data) })
  },

  // Admin Operations
  admin: {
    stats: () => apiFetch('/admin/stats'),
    createCategory: (data) => apiFetch('/admin/categories', { method: 'POST', body: JSON.stringify(data) })
  },

  // Global Categories
  categories: {
    list: () => apiFetch('/auth/categories')
  }
};

window.api = api;

