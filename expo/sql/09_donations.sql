-- ============================================
-- 09_donations.sql
-- Donations / Giving Table
-- ============================================

CREATE TYPE donation_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE giving_type AS ENUM ('tithe', 'offering', 'missions', 'building_fund', 'benevolence', 'ministry', 'other');
CREATE TYPE giving_frequency AS ENUM ('one_time', 'weekly', 'bi_weekly', 'monthly');

CREATE TABLE IF NOT EXISTS public.donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    giving_type giving_type NOT NULL DEFAULT 'tithe',
    frequency giving_frequency NOT NULL DEFAULT 'one_time',

    ministry_id UUID REFERENCES public.ministries(id) ON DELETE SET NULL,

    status donation_status NOT NULL DEFAULT 'pending',
    stripe_session_id TEXT,
    stripe_payment_intent_id TEXT,

    note TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_donations_church ON public.donations(church_id);
CREATE INDEX idx_donations_user ON public.donations(user_id);
CREATE INDEX idx_donations_status ON public.donations(status);
CREATE INDEX idx_donations_created ON public.donations(created_at DESC);
CREATE INDEX idx_donations_type ON public.donations(giving_type);

CREATE TRIGGER update_donations_updated_at
    BEFORE UPDATE ON public.donations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Recurring Giving
-- ============================================

CREATE TABLE IF NOT EXISTS public.recurring_giving (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    giving_type giving_type NOT NULL DEFAULT 'tithe',
    frequency giving_frequency NOT NULL DEFAULT 'monthly',

    ministry_id UUID REFERENCES public.ministries(id) ON DELETE SET NULL,

    is_active BOOLEAN DEFAULT TRUE,
    next_date DATE,
    stripe_subscription_id TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recurring_giving_church ON public.recurring_giving(church_id);
CREATE INDEX idx_recurring_giving_user ON public.recurring_giving(user_id);
CREATE INDEX idx_recurring_giving_active ON public.recurring_giving(is_active) WHERE is_active = TRUE;

CREATE TRIGGER update_recurring_giving_updated_at
    BEFORE UPDATE ON public.recurring_giving
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- RLS POLICIES FOR DONATIONS
-- ============================================

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_giving ENABLE ROW LEVEL SECURITY;

-- Users can view their own donations
CREATE POLICY "View own donations"
    ON public.donations FOR SELECT
    USING (user_id = auth.uid());

-- Admins can view all donations for their church
CREATE POLICY "Admins view church donations"
    ON public.donations FOR SELECT
    USING (public.user_is_admin_of_church(church_id));

-- Users can create donations for themselves
CREATE POLICY "Create own donations"
    ON public.donations FOR INSERT
    WITH CHECK (user_id = auth.uid() AND public.user_belongs_to_church(church_id));

-- Only system/admin can update donation status
CREATE POLICY "Admins update donations"
    ON public.donations FOR UPDATE
    USING (public.user_is_admin_of_church(church_id));

-- Users can view their own recurring giving
CREATE POLICY "View own recurring giving"
    ON public.recurring_giving FOR SELECT
    USING (user_id = auth.uid());

-- Admins can view all recurring giving for their church
CREATE POLICY "Admins view church recurring giving"
    ON public.recurring_giving FOR SELECT
    USING (public.user_is_admin_of_church(church_id));

-- Users can create recurring giving for themselves
CREATE POLICY "Create own recurring giving"
    ON public.recurring_giving FOR INSERT
    WITH CHECK (user_id = auth.uid() AND public.user_belongs_to_church(church_id));

-- Users can update their own recurring giving
CREATE POLICY "Update own recurring giving"
    ON public.recurring_giving FOR UPDATE
    USING (user_id = auth.uid());

-- Users can cancel their own recurring giving
CREATE POLICY "Delete own recurring giving"
    ON public.recurring_giving FOR DELETE
    USING (user_id = auth.uid());
