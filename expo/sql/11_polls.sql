-- ============================================
-- 11_polls.sql
-- Polls & Voting System
-- ============================================

-- ============================================
-- POLLS
-- ============================================

CREATE TABLE public.polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    ministry_id UUID REFERENCES public.ministries(id) ON DELETE CASCADE,
    
    -- Content
    question TEXT NOT NULL,
    description TEXT,
    
    -- Settings
    allow_multiple BOOLEAN DEFAULT FALSE,
    is_anonymous BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Scheduling
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    
    -- Authorship
    created_by UUID REFERENCES public.profiles(id),
    created_by_name TEXT,
    created_by_avatar TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_polls_church ON public.polls(church_id);
CREATE INDEX idx_polls_ministry ON public.polls(ministry_id);
CREATE INDEX idx_polls_active ON public.polls(is_active) WHERE is_active = TRUE;

CREATE TRIGGER update_polls_updated_at
    BEFORE UPDATE ON public.polls
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- POLL OPTIONS
-- ============================================

CREATE TABLE public.poll_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_poll_options_poll ON public.poll_options(poll_id);

-- ============================================
-- POLL VOTES
-- ============================================

CREATE TABLE public.poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    voted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(poll_id, profile_id, option_id)
);

CREATE INDEX idx_poll_votes_poll ON public.poll_votes(poll_id);
CREATE INDEX idx_poll_votes_profile ON public.poll_votes(profile_id);
CREATE INDEX idx_poll_votes_option ON public.poll_votes(option_id);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Users can view polls in their church
CREATE POLICY "Users can view church polls"
    ON public.polls FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid()
            AND church_id = polls.church_id
        )
    );

-- Leaders/admins can create polls
CREATE POLICY "Leaders can create polls"
    ON public.polls FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_church_roles
            WHERE user_id = auth.uid()
            AND church_id = polls.church_id
            AND role IN ('owner', 'admin', 'pastor', 'staff')
            AND is_active = TRUE
        )
    );

-- Leaders/admins can update their polls
CREATE POLICY "Leaders can update polls"
    ON public.polls FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_church_roles
            WHERE user_id = auth.uid()
            AND church_id = polls.church_id
            AND role IN ('owner', 'admin', 'pastor', 'staff')
            AND is_active = TRUE
        )
    );

-- Leaders/admins can delete polls
CREATE POLICY "Leaders can delete polls"
    ON public.polls FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_church_roles
            WHERE user_id = auth.uid()
            AND church_id = polls.church_id
            AND role IN ('owner', 'admin', 'pastor', 'staff')
            AND is_active = TRUE
        )
    );

-- Anyone who can view a poll can view its options
CREATE POLICY "Users can view poll options"
    ON public.poll_options FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.polls
            JOIN public.profiles ON profiles.church_id = polls.church_id
            WHERE polls.id = poll_options.poll_id
            AND profiles.user_id = auth.uid()
        )
    );

-- Leaders can manage poll options
CREATE POLICY "Leaders can manage poll options"
    ON public.poll_options FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.polls
            WHERE polls.id = poll_options.poll_id
            AND EXISTS (
                SELECT 1 FROM public.user_church_roles
                WHERE user_id = auth.uid()
                AND church_id = polls.church_id
                AND role IN ('owner', 'admin', 'pastor', 'staff')
                AND is_active = TRUE
            )
        )
    );

-- Users can view votes on polls they have access to
CREATE POLICY "Users can view poll votes"
    ON public.poll_votes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.polls
            JOIN public.profiles ON profiles.church_id = polls.church_id
            WHERE polls.id = poll_votes.poll_id
            AND profiles.user_id = auth.uid()
        )
    );

-- Users can cast their own votes
CREATE POLICY "Users can cast votes"
    ON public.poll_votes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = poll_votes.profile_id
            AND profiles.user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.polls
            WHERE polls.id = poll_votes.poll_id
            AND polls.is_active = TRUE
            AND (polls.ends_at IS NULL OR polls.ends_at > NOW())
        )
    );
