# SAVINGS GOAL TRACKER

A modern, fintech-grade personal savings management platform built to help individuals track, calculate, pace, and achieve their financial milestones in **₹ INR**.

Featuring dynamic savings calculators, automated pacing recommendations, budget & living expense tracking, verifiable saving streaks, achievement gamification, interactive financial charts, and Row Level Security (RLS) with Supabase Auth.

---

## 🚀 Key Features

- **Multi-Method Authentication**:
  - Email & Password with secure session tokens and password recovery.
  - Google OAuth integration through Supabase Auth.
  - Phone OTP SMS verification through Supabase Auth.
  - 1-Click Evaluator Demo Login (instant testing as Administrator or Standard User).
- **Comprehensive Goal Management**:
  - Unlimited savings goals with target deadlines, descriptions, custom icons, and categories (Education, Travel, Emergency, Electronics, Vehicle, Home, Health, Shopping, Wedding, Custom).
  - Real-time automated calculations for:
    - Remaining Amount: `Target − Current Savings`
    - Progress Percentage: `(Current Savings / Target) × 100`
    - Pacing Requirements: Dynamic **Monthly**, **Weekly**, and **Daily** micro-savings targets (safely protected against division-by-zero).
  - Celebration UI & Confetti triggers when a goal hits 100% completion.
- **Full Savings Transaction Ledger**:
  - Record, edit, and delete deposits.
  - Contextual search, filtering by category, goal, and date range.
  - One-click CSV transaction export for offline accounting.
- **Monthly Budget & Living Expense Tracking**:
  - Monthly income configuration and planned savings quotas.
  - Categorized living expenses (Housing, Food, Transportation, Entertainment, Utilities).
  - Automatic computations of **Available Amount** (`Income − Total Expenses`) and **Remaining Disposable Amount** (`Available − Planned Savings`).
- **Smart Financial Insights & Interactive Charts**:
  - Data-driven health checks evaluating savings rate against income, deadline pacing feasibility, and milestone proximity.
  - Interactive charts powered by Chart.js:
    - Savings Goals Target vs Saved (Bar Chart)
    - 6-Month Savings Momentum Trend (Line Chart)
    - Monthly Cash Flow / Income vs Expense (Bar Chart)
    - Category Spending Distribution (Doughnut Chart)
- **Gamification & Verifiable Streaks**:
  - 🔥 Current Streak & 🏆 Best Streak calculated directly from chronological transaction dates.
  - 7 Collectible Badges: *First Step*, *₹1,000 Saver*, *25% Complete*, *Halfway There*, *Almost There*, *Goal Crusher*, and *Consistent Saver*.
- **In-App Notification Center**:
  - Automatic alerts for goal deadlines approaching within 30 days, milestones unlocked, and completed targets.
  - Mark single or all notifications as read.
- **Protected Administrator Portal**:
  - Enforced backend authorization (`role === 'admin'`).
  - System-wide analytics: total registered users, active savings volume, completed goals ratio, and global category catalog management.
- **Design System & Dark Mode**:
  - WCAG-compliant fintech UI with CSS Custom Properties.
  - Seamless Light/Dark mode with instant toggle and preferences persistence.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, Modular CSS3 (Custom Design System), Vanilla JavaScript (ES6+, Fetch API, Lucide Icons, Chart.js).
- **Backend**: Node.js & Express.js REST API with Helmet security headers, CORS, body parsers, and sanitized input validation.
- **Database & Auth**: Supabase PostgreSQL with Row Level Security (RLS) policies, foreign key cascades, triggers, and Supabase Auth.
- **Hybrid Engine**: Seamlessly runs with live Supabase credentials OR interactive local demo fallback for offline evaluation.

---

## 📂 Project Structure

```text
SAVINGS GOAL TRACKER/
│
├── client/                     # Frontend Application
│   ├── index.html              # Fintech Landing Page
│   ├── login.html              # Authentication (Email, Google, Phone, Demo)
│   ├── register.html           # Account Sign Up
│   ├── forgot-password.html    # Password Reset Flow
│   ├── dashboard.html          # Central Overview Dashboard
│   ├── goals.html              # My Goals Directory
│   ├── create-goal.html        # Create New Goal Form
│   ├── goal-details.html       # Single Goal Calculator & Details
│   ├── transactions.html       # Full Savings Ledger & CSV Export
│   ├── budget.html             # Monthly Budget & Living Expenses
│   ├── insights.html           # Smart Insights & Interactive Charts
│   ├── achievements.html       # Gamification Badges & Streaks
│   ├── notifications.html      # In-App Notification Center
│   ├── profile.html            # User Profile Settings
│   ├── settings.html           # Theme & Notification Preferences
│   ├── admin.html              # Protected Admin Analytics
│   ├── 404.html                # Error Page
│   │
│   ├── css/
│   │   ├── variables.css       # Light/Dark Theme Variables & Tokens
│   │   ├── base.css            # Typography, Reset, Focus States
│   │   ├── components.css      # Buttons, Cards, Modals, Toasts, Badges
│   │   ├── layout.css          # App Shell, Responsive Sidebar, Header
│   │   └── pages.css           # Landing Hero, Widgets, Gamification Cards
│   │
│   └── js/
│       ├── config.js           # Currency (₹ INR), Formatters, Constants
│       ├── auth.js             # Supabase Auth, Sessions, Role Guards
│       ├── api.js              # REST API Client Layer
│       ├── calculator.js       # Dynamic Savings Pacing Calculator
│       └── components.js       # App Shell Injection, Toasts, Modals
│
├── server/                     # Node.js + Express Backend
│   ├── server.js               # Server Entry Point & Middleware
│   ├── routes/
│   │   ├── auth.js             # Auth Config & Demo Logins
│   │   ├── goals.js            # Goals CRUD & Metric Calculations
│   │   ├── savings.js          # Deposits, CSV Export & Gamification Hooks
│   │   ├── dashboard.js        # Aggregated Metrics
│   │   ├── budget.js           # Budgets & Itemized Living Expenses
│   │   ├── insights.js         # Financial Insights & Chart Datasets
│   │   ├── achievements.js     # Badges & Streak Engine
│   │   ├── notifications.js    # Notification Ledger
│   │   ├── profile.js          # Profile & User Preferences
│   │   └── admin.js            # Admin Analytics & Category CRUD
│   ├── middleware/
│   │   ├── auth.js             # Token Verification & Admin Role Guard
│   │   └── validation.js       # Input Sanitization & Range Validation
│   └── services/
│       ├── supabaseClient.js   # Supabase Client Initializer
│       ├── dataStore.js        # Rich Seeded In-Memory Hybrid Store
│       └── gamification.js     # Streak Calculator & Achievement Rules
│
├── supabase/                   # Database Architecture & RLS
│   ├── schema.sql              # Relational PostgreSQL Schema & Triggers
│   └── policies.sql            # Row Level Security (RLS) Policies
│
├── .env.example                # Example Environment Variables
├── package.json                # Dependencies & NPM Scripts
└── README.md                   # Complete Documentation
```

---

## ⚡ Quick Start & Local Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **NPM**: v8.0.0 or higher

### 2. Installation
Clone or navigate to the project directory:
```bash
cd "SAVINGS GOAL TRACKER"
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env` settings:
```env
PORT=5000
NODE_ENV=development

# Supabase Credentials (leave blank to run in instant demo mode)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

APP_NAME="Savings Goal Tracker"
DEFAULT_CURRENCY=INR
CURRENCY_SYMBOL="₹"
CLIENT_URL=http://localhost:5000
```

### 4. Running the Application
Start the server:
```bash
npm start
```
Or with auto-reload:
```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:5000
```

---

## 🗄️ Supabase Setup & Row Level Security

To connect a live Supabase project:

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase Dashboard.
3. Open `supabase/schema.sql` from this repository and run the script to create:
   - Tables (`profiles`, `categories`, `goals`, `savings_transactions`, `budgets`, `expenses`, `achievements`, `user_achievements`, `notifications`, `user_preferences`).
   - Trigger `handle_new_user` on `auth.users` to automatically populate profile and preferences upon sign-up.
   - Seed data for default categories and achievements.
4. Open `supabase/policies.sql` and run it to enforce **Row Level Security (RLS)**:
   - Users can only read, write, update, and delete their own financial records.
   - Global categories are readable by all authenticated users; custom categories are isolated.
   - Admin role override checks (`profiles.role = 'admin'`).
5. Copy your **Project URL**, **Anon Key**, and **Service Role Key** from **Project Settings -> API** into your `.env` file:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
6. Restart the server (`npm start`). The application will automatically detect your live Supabase credentials!

---

## 🔐 Authentication Providers Setup

### Email Authentication
- Configured out of the box in Supabase Auth.
- Passwords are encrypted using bcrypt within Supabase's secure Auth service.

### Google OAuth Setup
1. In your Supabase Dashboard, go to **Authentication -> Providers -> Google**.
2. Enable Google and enter your Google Cloud Console **Client ID** and **Client Secret**.
3. Add the redirect URL: `https://<your-project-id>.supabase.co/auth/v1/callback`.

### Phone / OTP Setup
1. In Supabase Dashboard, go to **Authentication -> Providers -> Phone**.
2. Enable Phone authentication and select your SMS provider (Twilio, MessageBird, or Supabase Test Phone).
3. In local evaluation mode, test phone numbers work with demo OTP code `123456`.

---

## 🧪 Testing & Evaluation

### Instant 1-Click Demo Evaluation
For immediate grading or presentation without configuring external cloud API keys:
1. Visit `http://localhost:5000/login`.
2. Click **Demo Admin 👑** or **Demo User 👤** in the "Instant Demo Evaluation" box.
3. You will immediately access the full dashboard populated with realistic ₹ INR savings goals, transaction history, itemized monthly expenses, active saving streaks, and unlocked badges!

---

## 🛡️ Security Features

- **No Sensitive Frontend Secrets**: Supabase service-role keys are strictly kept server-side in environment variables and never bundled in client code.
- **Input Sanitization**: All goal descriptions, names, notes, and strings are stripped of HTML injection tags.
- **Strict Boundary Checks**: Target amounts, expenses, and savings must be positive numbers greater than ₹0.
- **Authorization Enforcement**: The Admin Dashboard (`/admin.html` and `/api/admin/*`) strictly verifies `req.user.role === 'admin'` on the server, rejecting non-admin sessions with HTTP 403.
- **Rate-Limiting & Helmet Protection**: HTTP response headers are secured with Helmet.

---

## 📄 License
MIT License. Built for full-stack portfolio excellence.

