// Authentication & Session Management Module

let supabaseClient = null;

// Initialize Supabase if credentials exist
async function initSupabaseAuth() {
  try {
    const res = await fetch('/api/auth/config');
    const json = await res.json();
    if (json.success && json.data.isConfigured && window.supabase) {
      supabaseClient = window.supabase.createClient(json.data.supabaseUrl, json.data.supabaseAnonKey);
      console.log('[Supabase Auth] Client initialized successfully.');
    }
  } catch (err) {
    console.warn('[Supabase Auth] Fallback to local authentication engine:', err);
  }
}

// Session Helpers
function getAuthToken() {
  return localStorage.getItem(CONFIG.AUTH_TOKEN_KEY);
}

function getAuthUser() {
  const userJson = localStorage.getItem(CONFIG.AUTH_USER_KEY);
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch (e) {
    return null;
  }
}

function setSession(token, user) {
  localStorage.setItem(CONFIG.AUTH_TOKEN_KEY, token);
  localStorage.setItem(CONFIG.AUTH_USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(CONFIG.AUTH_TOKEN_KEY);
  localStorage.removeItem(CONFIG.AUTH_USER_KEY);
}

// Check authentication on protected pages
function requireAuth(redirectTo = '/login') {
  const user = getAuthUser();
  const token = getAuthToken();

  if (!user || !token) {
    window.location.href = redirectTo;
    return false;
  }
  return true;
}

// Check admin role
function requireAdminRole() {
  if (!requireAuth()) return false;
  const user = getAuthUser();
  if (!user || user.role !== 'admin') {
    alert('Access restricted to administrators.');
    window.location.href = '/dashboard';
    return false;
  }
  return true;
}

// Email & Password Login
async function loginWithEmail(email, password) {
  if (supabaseClient) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const token = data.session.access_token;

    // Build a preliminary session so the /api/profile request is authorized
    const prelimUser = {
      id:        data.user.id,
      email:     data.user.email,
      full_name: data.user.user_metadata?.full_name || email.split('@')[0],
      role:      'user' // conservative default before profile fetch
    };
    setSession(token, prelimUser);

    // Fetch accurate role and profile from the backend (reads profiles table via RLS)
    try {
      const profileRes = await fetch('/api/profile', {
        headers: {
          'Authorization':  `Bearer ${token}`,
          'Content-Type':   'application/json'
        }
      });
      if (profileRes.ok) {
        const profileJson = await profileRes.json();
        const dbProfile   = profileJson.data?.profile;
        if (dbProfile) {
          const user = {
            id:         data.user.id,
            email:      data.user.email,
            full_name:  dbProfile.full_name  || prelimUser.full_name,
            role:       dbProfile.role       || 'user',
            avatar_url: dbProfile.avatar_url || '',
            currency:   dbProfile.currency   || 'INR'
          };
          setSession(token, user);
          return user;
        }
      }
    } catch (profileErr) {
      console.warn('[Auth] Profile fetch after login failed, using metadata fallback:', profileErr);
    }

    return prelimUser;
  }

  // Fallback demo/local login
  const res = await fetch('/api/auth/demo-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: email.includes('admin') ? 'admin' : 'user' })
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Login failed');
  setSession(json.token, json.user);
  return json.user;
}

// Email & Password Sign Up
async function registerWithEmail(email, password, fullName) {
  if (supabaseClient) {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'user'
        }
      }
    });
    if (error) throw error;

    if (data.session) {
      setSession(data.session.access_token, {
        id: data.user.id,
        email: data.user.email,
        full_name: fullName,
        role: 'user'
      });
    }
    return data;
  }

  // Demo sign up
  const res = await fetch('/api/auth/demo-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'user' })
  });
  const json = await res.json();
  const demoUser = { ...json.user, email, full_name: fullName };
  setSession(json.token, demoUser);
  return { user: demoUser };
}

// Google OAuth Login
async function loginWithGoogle() {
  if (supabaseClient) {
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/dashboard'
      }
    });
    if (error) throw error;
    return data;
  }

  // Demo simulation
  const res = await fetch('/api/auth/demo-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'user' })
  });
  const json = await res.json();
  const googleUser = {
    ...json.user,
    email: 'google.saver@gmail.com',
    full_name: 'Varsha (Google Account)',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
  };
  setSession(json.token, googleUser);
  window.location.href = '/dashboard';
}

// Phone / OTP Login
async function sendPhoneOtp(phone) {
  if (supabaseClient) {
    const { data, error } = await supabaseClient.auth.signInWithOtp({ phone });
    if (error) throw error;
    return data;
  }
  return { message: 'Demo OTP sent! Use code 123456 to verify.' };
}

async function verifyPhoneOtp(phone, token) {
  if (supabaseClient) {
    const { data, error } = await supabaseClient.auth.verifyOtp({ phone, token, type: 'sms' });
    if (error) throw error;
    if (data.session) {
      const user = {
        id:        data.user.id,
        email:     data.user.email     || '',
        full_name: data.user.user_metadata?.full_name || phone,
        role:      'user'
      };
      setSession(data.session.access_token, user);
    }
    return data;
  }

  // Demo simulation: any 6 digit token works
  if (token === '123456' || token.length === 6) {
    const res = await fetch('/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'user' })
    });
    const json = await res.json();
    setSession(json.token, json.user);
    return json;
  }
  throw new Error('Invalid OTP. Please check the 6-digit code.');
}

// Password Reset Request
async function requestPasswordReset(email) {
  if (supabaseClient) {
    const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/forgot-password'
    });
    if (error) throw error;
    return data;
  }
  return { message: 'Password reset link simulated. Check your inbox.' };
}

// Demo 1-Click Login (Admin or Normal User)
async function loginDemo(role = 'admin') {
  const res = await fetch('/api/auth/demo-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role })
  });
  const json = await res.json();
  if (json.success) {
    setSession(json.token, json.user);
    window.location.href = '/dashboard';
  } else {
    throw new Error(json.error || 'Demo login failed');
  }
}

// Logout
async function logout() {
  if (supabaseClient) {
    try {
      await supabaseClient.auth.signOut();
    } catch (e) {
      console.warn('Supabase signout notice:', e);
    }
  }
  clearSession();
  window.location.href = '/login';
}

// Auto-run initialization
initSupabaseAuth();

window.auth = {
  getAuthToken,
  getAuthUser,
  setSession,
  clearSession,
  requireAuth,
  requireAdminRole,
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  sendPhoneOtp,
  verifyPhoneOtp,
  requestPasswordReset,
  loginDemo,
  logout
};

