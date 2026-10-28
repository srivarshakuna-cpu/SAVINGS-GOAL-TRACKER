// Reusable Fintech UI Components, Shell Renderer & Notifications

// 1. Toast Notification Service
function showToast(message, type = 'info', duration = 4000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconName = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : type === 'warning' ? 'alert-triangle' : 'info';

  toast.innerHTML = `
    <i data-lucide="${iconName}" style="color: var(--${type}); flex-shrink: 0; width: 20px; height: 20px;"></i>
    <div style="flex: 1; font-size: 0.875rem; font-weight: 500;">${message}</div>
    <button style="background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 0;" onclick="this.parentElement.remove()">
      <i data-lucide="x" style="width: 16px; height: 16px;"></i>
    </button>
  `;

  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// 2. Modal Utilities
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// 3. Theme Toggle & Persistence
function initTheme() {
  const savedTheme = localStorage.getItem(CONFIG.THEME_STORAGE_KEY) || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(CONFIG.THEME_STORAGE_KEY, next);
  updateThemeIcon(next);

  // Sync to backend if authenticated
  if (window.api && window.auth && window.auth.getAuthToken()) {
    window.api.profile.updatePreferences({ theme: next }).catch(() => {});
  }
}

function updateThemeIcon(theme) {
  const icons = document.querySelectorAll('.theme-icon');
  icons.forEach(icon => {
    icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
  });
  if (window.lucide) window.lucide.createIcons();
}

// 4. Celebration Particles Effect (for 100% Goal Completion)
function triggerCelebration(title = 'Goal Completed!') {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.inset = '0';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';
  container.style.overflow = 'hidden';
  document.body.appendChild(container);

  const colors = ['#0d9488', '#4f46e5', '#f59e0b', '#10b981', '#ec4899', '#3b82f6'];

  for (let i = 0; i < 75; i++) {
    const p = document.createElement('div');
    p.style.position = 'absolute';
    p.style.width = Math.random() * 10 + 6 + 'px';
    p.style.height = Math.random() * 10 + 6 + 'px';
    p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    p.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    p.style.left = Math.random() * 100 + 'vw';
    p.style.top = '-20px';
    p.style.transform = `rotate(${Math.random() * 360}deg)`;

    const animDuration = Math.random() * 2 + 1.5;
    p.style.transition = `all ${animDuration}s cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
    container.appendChild(p);

    setTimeout(() => {
      p.style.top = '105vh';
      p.style.left = `calc(${p.style.left} + ${(Math.random() - 0.5) * 200}px)`;
      p.style.transform = `rotate(${Math.random() * 720}deg) scale(0.5)`;
    }, 20);
  }

  showToast(`🎉 ${title}`, 'success', 5000);

  setTimeout(() => container.remove(), 4000);
}

// 5. Render Standard Fintech Sidebar & Header Shell
function renderAppShell(activeNav = 'dashboard') {
  const user = window.auth ? window.auth.getAuthUser() : { full_name: 'Varsha Sharma', email: 'demo@saver.in', role: 'admin' };
  const isAdmin = user?.role === 'admin';

  // Navigation Items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', href: '/dashboard' },
    { id: 'goals', label: 'My Goals', icon: 'target', href: '/goals' },
    { id: 'add-savings', label: 'Add Savings', icon: 'plus-circle', href: '#', isAction: true },
    { id: 'transactions', label: 'Transactions', icon: 'receipt', href: '/transactions' },
    { id: 'budget', label: 'Budget Planner', icon: 'wallet', href: '/budget' },
    { id: 'insights', label: 'Smart Insights', icon: 'trending-up', href: '/insights' },
    { id: 'achievements', label: 'Achievements', icon: 'award', href: '/achievements' },
    { id: 'notifications', label: 'Notifications', icon: 'bell', href: '/notifications', badgeId: 'notif-nav-badge' },
    { id: 'profile', label: 'Profile', icon: 'user', href: '/profile' },
    { id: 'settings', label: 'Settings', icon: 'settings', href: '/settings' }
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Admin Portal', icon: 'shield-check', href: '/admin' });
  }

  // Inject Sidebar
  const sidebarHtml = `
    <div class="sidebar-header">
      <div class="brand-logo">₹</div>
      <div class="brand-text">Savings<span>Tracker</span></div>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-section-title">Menu</div>
      ${navItems.map(item => `
        <a href="${item.href}" class="nav-link ${activeNav === item.id ? 'active' : ''}" id="nav-item-${item.id}" ${item.isAction ? 'data-action="open-add-savings"' : ''}>
          <i data-lucide="${item.icon}"></i>
          <span>${item.label}</span>
          ${item.badgeId ? `<span id="${item.badgeId}" class="nav-badge" style="display: none;">0</span>` : ''}
        </a>
      `).join('')}

      <div class="nav-section-title" style="margin-top: 1rem;">Session</div>
      <a href="javascript:void(0)" class="nav-link" onclick="window.auth.logout()">
        <i data-lucide="log-out"></i>
        <span>Logout</span>
      </a>
    </nav>
    <div class="sidebar-footer">
      <div class="user-mini-card" onclick="window.location.href='/profile'">
        <div class="avatar">${(user?.full_name || 'U').charAt(0).toUpperCase()}</div>
        <div class="user-info">
          <div class="user-name">${user?.full_name || 'Demo User'}</div>
          <div class="user-email">${user?.email || 'demo@saver.in'}</div>
        </div>
      </div>
    </div>
  `;

  // Inject Header
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';

  const motivationQuotes = [
    "Small daily savings create massive long-term wealth.",
    "Consistency is the true foundation of financial freedom.",
    "Every rupee saved is a step toward your life milestones.",
    "Discipline today secures tomorrow's opportunities."
  ];
  const randomMotivation = motivationQuotes[Math.floor(Math.random() * motivationQuotes.length)];

  const headerHtml = `
    <div class="header-left">
      <button class="mobile-toggle" id="mobile-sidebar-toggle" aria-label="Toggle navigation">
        <i data-lucide="menu"></i>
      </button>
      <div>
        <div class="greeting-text">${greeting}, <span id="header-user-name">${user?.full_name?.split(' ')[0] || 'Saver'}</span> 👋</div>
        <div class="motivation-subtext">${randomMotivation}</div>
      </div>
    </div>
    <div class="header-right">
      <button class="btn btn-primary btn-sm" id="btn-quick-add-savings">
        <i data-lucide="plus"></i> Add Savings
      </button>
      <button class="theme-toggle-btn" onclick="toggleTheme()" aria-label="Toggle theme">
        <i class="theme-icon" data-lucide="moon"></i>
      </button>
      <a href="/notifications" class="theme-toggle-btn" style="position: relative;" aria-label="Notifications">
        <i data-lucide="bell"></i>
        <span id="header-unread-badge" style="position: absolute; top: 4px; right: 4px; width: 8px; height: 8px; background-color: var(--error); border-radius: 50%; display: none;"></span>
      </a>
    </div>
  `;

  const sidebarEl = document.querySelector('.app-sidebar');
  if (sidebarEl) sidebarEl.innerHTML = sidebarHtml;

  const headerEl = document.querySelector('.app-header');
  if (headerEl) headerEl.innerHTML = headerHtml;

  // Add global Add Savings Modal if not already on the page
  injectQuickSavingsModal();

  // Attach mobile sidebar listeners
  setupMobileDrawer();

  // Refresh lucide icons
  if (window.lucide) window.lucide.createIcons();

  // Fetch unread count for badge
  syncNotificationBadges();
}

// 6. Global Quick Add Savings Modal Injection
function injectQuickSavingsModal() {
  if (document.getElementById('quick-add-savings-modal')) return;

  const modalHtml = `
    <div class="modal-backdrop" id="quick-add-savings-modal">
      <div class="modal-dialog">
        <div class="modal-header">
          <div class="modal-title">💰 Add Savings Deposit</div>
          <button class="btn btn-ghost btn-sm" onclick="closeModal('quick-add-savings-modal')">
            <i data-lucide="x"></i>
          </button>
        </div>
        <form id="quick-add-savings-form">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label" for="quick-goal-select">Select Goal <span class="required">*</span></label>
              <select class="form-select" id="quick-goal-select" required>
                <option value="">Loading your goals...</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="quick-amount">Savings Amount <span class="required">*</span></label>
              <div class="input-group">
                <span class="input-prefix">₹</span>
                <input type="number" class="form-input input-with-prefix" id="quick-amount" placeholder="e.g. 5000" min="1" step="any" required>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="quick-date">Date <span class="required">*</span></label>
              <input type="date" class="form-input" id="quick-date" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="quick-note">Note / Source (Optional)</label>
              <input type="text" class="form-input" id="quick-note" placeholder="e.g. Monthly salary allotment, festival bonus">
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" onclick="closeModal('quick-add-savings-modal')">Cancel</button>
            <button type="submit" class="btn btn-primary" id="quick-submit-btn">
              <span>Record Savings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Set default date to today
  const dateInput = document.getElementById('quick-date');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  // Attach submit handler
  const form = document.getElementById('quick-add-savings-form');
  form.addEventListener('submit', handleQuickSavingsSubmit);

  // Bind trigger buttons
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('#btn-quick-add-savings') || e.target.closest('[data-action="open-add-savings"]');
    if (trigger) {
      e.preventDefault();
      loadGoalsForModal();
      openModal('quick-add-savings-modal');
    }
  });
}

async function loadGoalsForModal() {
  const select = document.getElementById('quick-goal-select');
  if (!select) return;

  try {
    const res = await window.api.goals.list();
    if (res.success && res.data.length > 0) {
      select.innerHTML = res.data.map(g => `
        <option value="${g.id}">
          ${g.name} (${g.status === 'completed' ? 'Completed 🏆' : `Saved: ${formatCurrency(g.saved_amount)} / ${formatCurrency(g.target_amount)}`})
        </option>
      `).join('');
    } else {
      select.innerHTML = '<option value="">No goals found. Create one first!</option>';
    }
  } catch (e) {
    select.innerHTML = '<option value="">Failed to load goals</option>';
  }
}

async function handleQuickSavingsSubmit(e) {
  e.preventDefault();
  const goalId = document.getElementById('quick-goal-select').value;
  const amount = document.getElementById('quick-amount').value;
  const transactionDate = document.getElementById('quick-date').value;
  const note = document.getElementById('quick-note').value;
  const btn = document.getElementById('quick-submit-btn');

  if (!goalId) {
    showToast('Please select a goal to add savings.', 'warning');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving...';

  try {
    const res = await window.api.savings.add({
      goal_id: goalId,
      amount: Number(amount),
      transaction_date: transactionDate,
      note
    });

    closeModal('quick-add-savings-modal');
    document.getElementById('quick-amount').value = '';
    document.getElementById('quick-note').value = '';

    showToast(`Added ${formatCurrency(amount)} to goal successfully!`, 'success');

    if (res.goalCompleted) {
      triggerCelebration('Goal reached 100%! Congratulations! 🏆');
    }

    // If current page has a reload callback, call it
    if (window.onSavingsAdded) {
      window.onSavingsAdded();
    } else {
      // Reload page data or state smoothly
      setTimeout(() => window.location.reload(), 1200);
    }
  } catch (err) {
    showToast(err.message || 'Failed to record savings.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Record Savings</span>';
  }
}

// 7. Mobile Drawer Handlers
function setupMobileDrawer() {
  const toggleBtn = document.getElementById('mobile-sidebar-toggle');
  const sidebar = document.querySelector('.app-sidebar');

  let backdrop = document.querySelector('.sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
  }

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
      backdrop.classList.toggle('active');
    });

    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      backdrop.classList.remove('active');
    });
  }
}

// 8. Notification Badge Sync
async function syncNotificationBadges() {
  try {
    const res = await window.api.notifications.list();
    if (res.success && res.unreadCount > 0) {
      const headerDot = document.getElementById('header-unread-badge');
      if (headerDot) headerDot.style.display = 'block';

      const navBadge = document.getElementById('notif-nav-badge');
      if (navBadge) {
        navBadge.style.display = 'inline-block';
        navBadge.textContent = res.unreadCount;
      }
    }
  } catch (e) {
    // ignore background errors
  }
}

// Auto init theme
initTheme();

window.showToast = showToast;
window.openModal = openModal;
window.closeModal = closeModal;
window.toggleTheme = toggleTheme;
window.triggerCelebration = triggerCelebration;
window.renderAppShell = renderAppShell;

