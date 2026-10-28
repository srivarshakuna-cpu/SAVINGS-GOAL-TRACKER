-- ==============================================================================
-- SAVINGS GOAL TRACKER — DATABASE SCHEMA
-- PostgreSQL schema for Supabase
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Linked 1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL DEFAULT '',
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    currency TEXT NOT NULL DEFAULT 'INR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for profile queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL means system-wide category
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'tag',
    type TEXT NOT NULL DEFAULT 'savings' CHECK (type IN ('savings', 'expense', 'both')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON public.categories(type);

-- 3. GOALS TABLE
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    target_amount NUMERIC(14, 2) NOT NULL CHECK (target_amount > 0),
    deadline DATE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    icon_url TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON public.goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_deadline ON public.goals(deadline);

-- 4. SAVINGS TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.savings_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_savings_user_id ON public.savings_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_goal_id ON public.savings_transactions(goal_id);
CREATE INDEX IF NOT EXISTS idx_savings_date ON public.savings_transactions(transaction_date);

-- 5. BUDGETS TABLE
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INT NOT NULL CHECK (year >= 2020),
    income NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (income >= 0),
    planned_savings NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (planned_savings >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (user_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON public.budgets(user_id, year, month);

-- 6. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_budget_id ON public.expenses(budget_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);

-- 7. ACHIEVEMENTS TABLE (Catalog of all available badges)
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    badge_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'award',
    threshold_value NUMERIC(14, 2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. USER ACHIEVEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);

-- 9. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('deadline', 'milestone', 'streak', 'completion', 'budget', 'system')),
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);

-- 10. USER PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
    email_notifications BOOLEAN NOT NULL DEFAULT true,
    reminder_notifications BOOLEAN NOT NULL DEFAULT true,
    streak_notifications BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- TRIGGERS & STORED PROCEDURES
-- ==============================================================================

-- Auto create profile & preferences upon user signup in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, avatar_url, role, currency)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.email,
        COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
        'user', -- Always default to 'user'; never read role from client metadata (prevents privilege escalation)
        'INR'
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email = EXCLUDED.email;

    INSERT INTO public.user_preferences (user_id, theme, email_notifications, reminder_notifications)
    VALUES (new.id, 'light', true, true)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger firing on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for auto-updating updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    new.updated_at = timezone('utc'::text, now());
    RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_timestamp BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_goals_timestamp BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_savings_timestamp BEFORE UPDATE ON public.savings_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_budgets_timestamp BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_preferences_timestamp BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================================================
-- DEFAULT SEED DATA
-- ==============================================================================

-- Seed standard categories
INSERT INTO public.categories (id, user_id, name, icon, type) VALUES
    ('00000000-0000-0000-0000-000000000001', NULL, 'Education', 'graduation-cap', 'savings'),
    ('00000000-0000-0000-0000-000000000002', NULL, 'Travel', 'plane', 'savings'),
    ('00000000-0000-0000-0000-000000000003', NULL, 'Emergency Fund', 'shield-alert', 'savings'),
    ('00000000-0000-0000-0000-000000000004', NULL, 'Electronics', 'laptop', 'savings'),
    ('00000000-0000-0000-0000-000000000005', NULL, 'Vehicle', 'car', 'savings'),
    ('00000000-0000-0000-0000-000000000006', NULL, 'Home & Real Estate', 'home', 'savings'),
    ('00000000-0000-0000-0000-000000000007', NULL, 'Health & Wellness', 'heart-pulse', 'both'),
    ('00000000-0000-0000-0000-000000000008', NULL, 'Shopping', 'shopping-bag', 'both'),
    ('00000000-0000-0000-0000-000000000009', NULL, 'Wedding & Family', 'gem', 'savings'),
    ('00000000-0000-0000-0000-000000000010', NULL, 'Housing & Rent', 'building', 'expense'),
    ('00000000-0000-0000-0000-000000000011', NULL, 'Food & Groceries', 'utensils', 'expense'),
    ('00000000-0000-0000-0000-000000000012', NULL, 'Transportation', 'bus', 'expense'),
    ('00000000-0000-0000-0000-000000000013', NULL, 'Entertainment', 'film', 'expense'),
    ('00000000-0000-0000-0000-000000000014', NULL, 'Custom', 'sparkles', 'both')
ON CONFLICT (id) DO NOTHING;

-- Seed Achievements
INSERT INTO public.achievements (id, badge_code, name, description, icon, threshold_value) VALUES
    ('10000000-0000-0000-0000-000000000001', 'FIRST_STEP', 'First Step', 'Recorded your very first savings transaction.', 'footprints', 1),
    ('10000000-0000-0000-0000-000000000002', 'SAVER_1000', '₹1,000 Saver', 'Accumulated a total savings of ₹1,000 or more.', 'indian-rupee', 1000),
    ('10000000-0000-0000-0000-000000000003', 'QUARTER_WAY', '25% Complete', 'Reached 25% of any target savings goal.', 'pie-chart', 25),
    ('10000000-0000-0000-0000-000000000004', 'HALFWAY', 'Halfway There', 'Reached 50% milestone on a savings goal.', 'award', 50),
    ('10000000-0000-0000-0000-000000000005', 'ALMOST_THERE', 'Almost There', 'Reached 75% milestone on a savings goal.', 'trending-up', 75),
    ('10000000-0000-0000-0000-000000000006', 'GOAL_CRUSHER', 'Goal Crusher', 'Fully reached 100% of a target savings goal!', 'trophy', 100),
    ('10000000-0000-0000-0000-000000000007', 'CONSISTENT_SAVER', 'Consistent Saver', 'Maintained an active saving streak of 3 consecutive entries.', 'flame', 3)
ON CONFLICT (badge_code) DO NOTHING;

