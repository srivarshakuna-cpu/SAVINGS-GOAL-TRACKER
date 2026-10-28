const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false // Allows inline scripts, Chart.js CDN, Google Fonts, Lucide icons
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets from client/
const clientPath = path.join(__dirname, '..', 'client');
app.use(express.static(clientPath));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/savings', require('./routes/savings'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/budget', require('./routes/budget'));
app.use('/api/insights', require('./routes/insights'));
app.use('/api/achievements', require('./routes/achievements'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/admin', require('./routes/admin'));

// Clean URL route rewrites for client pages
const pageRoutes = [
  'login', 'register', 'forgot-password', 'dashboard', 'goals',
  'create-goal', 'goal-details', 'transactions', 'budget', 'insights',
  'achievements', 'notifications', 'profile', 'settings', 'admin'
];

pageRoutes.forEach(route => {
  app.get(`/${route}`, (req, res) => {
    res.sendFile(path.join(clientPath, `${route}.html`));
  });
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// 404 Handler for undefined API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found.' });
});

// Fallback to 404.html for any other web request
app.use((req, res) => {
  res.status(404).sendFile(path.join(clientPath, '404.html'));
});

// Global error handler (prevents leaking internal stack traces)
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err.message);
  res.status(500).json({
    success: false,
    error: 'A server error occurred. Please try again or contact support.'
  });
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`======================================================`);
    console.log(`🚀 SAVINGS GOAL TRACKER SERVER RUNNING`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`💼 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`======================================================`);
  });
}

module.exports = app;

