-- ==============================================================================
-- SAVINGS GOAL TRACKER — ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- 1. PROFILES RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- 2. CATEGORIES RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view global categories and their own custom categories"
    ON public.categories FOR SELECT
    USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can insert custom categories"
    ON public.categories FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own custom categories"
    ON public.categories FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own custom categories"
    ON public.categories FOR DELETE
    USING (user_id = auth.uid());

CREATE POLICY "Admins have full access to categories"
    ON public.categories FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- 3. GOALS RLS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view only their own goals"
    ON public.goals FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own goals"
    ON public.goals FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own goals"
    ON public.goals FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own goals"
    ON public.goals FOR DELETE
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all goals"
    ON public.goals FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- 4. SAVINGS TRANSACTIONS RLS
ALTER TABLE public.savings_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view only their own transactions"
    ON public.savings_transactions FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own transactions"
    ON public.savings_transactions FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own transactions"
    ON public.savings_transactions FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own transactions"
    ON public.savings_transactions FOR DELETE
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all transactions"
    ON public.savings_transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- 5. BUDGETS RLS
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view only their own budgets"
    ON public.budgets FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own budgets"
    ON public.budgets FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own budgets"
    ON public.budgets FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own budgets"
    ON public.budgets FOR DELETE
    USING (user_id = auth.uid());

-- 6. EXPENSES RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view only their own expenses"
    ON public.expenses FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own expenses"
    ON public.expenses FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own expenses"
    ON public.expenses FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own expenses"
    ON public.expenses FOR DELETE
    USING (user_id = auth.uid());

-- 7. ACHIEVEMENTS CATALOG RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view achievements catalog"
    ON public.achievements FOR SELECT
    USING (auth.uid() IS NOT NULL); -- auth.role() is deprecated in Supabase v2; use auth.uid() IS NOT NULL

-- 8. USER ACHIEVEMENTS RLS
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their unlocked achievements"
    ON public.user_achievements FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can record unlocked achievements"
    ON public.user_achievements FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- 9. NOTIFICATIONS RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update (mark as read) their notifications"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their notifications"
    ON public.notifications FOR DELETE
    USING (user_id = auth.uid());

-- 10. USER PREFERENCES RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their preferences"
    ON public.user_preferences FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their preferences"
    ON public.user_preferences FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their preferences"
    ON public.user_preferences FOR UPDATE
    USING (user_id = auth.uid());

