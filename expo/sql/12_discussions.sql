-- ============================================
-- 12_discussions.sql
-- Discussions / Community Feed System
-- ============================================

-- ============================================
-- DISCUSSIONS
-- ============================================

CREATE TABLE public.discussions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    ministry_id UUID REFERENCES public.ministries(id) ON DELETE CASCADE,
    
    -- Content
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    
    -- Author
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    author_name TEXT,
    author_avatar TEXT,
    
    -- Stats
    comment_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    
    -- Flags
    is_pinned BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discussions_church ON public.discussions(church_id);
CREATE INDEX idx_discussions_ministry ON public.discussions(ministry_id);
CREATE INDEX idx_discussions_author ON public.discussions(author_id);
CREATE INDEX idx_discussions_pinned ON public.discussions(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_discussions_created ON public.discussions(created_at DESC);

CREATE TRIGGER update_discussions_updated_at
    BEFORE UPDATE ON public.discussions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- DISCUSSION COMMENTS
-- ============================================

CREATE TABLE public.discussion_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
    
    -- Content
    content TEXT NOT NULL,
    
    -- Author
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    author_name TEXT,
    author_avatar TEXT,
    
    -- Reply chain
    parent_comment_id UUID REFERENCES public.discussion_comments(id) ON DELETE CASCADE,
    
    -- Stats
    like_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discussion_comments_discussion ON public.discussion_comments(discussion_id);
CREATE INDEX idx_discussion_comments_author ON public.discussion_comments(author_id);
CREATE INDEX idx_discussion_comments_parent ON public.discussion_comments(parent_comment_id);

CREATE TRIGGER update_discussion_comments_updated_at
    BEFORE UPDATE ON public.discussion_comments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- DISCUSSION LIKES
-- ============================================

CREATE TABLE public.discussion_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discussion_id UUID REFERENCES public.discussions(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.discussion_comments(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (
        (discussion_id IS NOT NULL AND comment_id IS NULL) OR
        (discussion_id IS NULL AND comment_id IS NOT NULL)
    ),
    UNIQUE(discussion_id, profile_id),
    UNIQUE(comment_id, profile_id)
);

CREATE INDEX idx_discussion_likes_discussion ON public.discussion_likes(discussion_id);
CREATE INDEX idx_discussion_likes_comment ON public.discussion_likes(comment_id);
CREATE INDEX idx_discussion_likes_profile ON public.discussion_likes(profile_id);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_likes ENABLE ROW LEVEL SECURITY;

-- Users can view discussions in their church
CREATE POLICY "Users can view church discussions"
    ON public.discussions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid()
            AND church_id = discussions.church_id
        )
    );

-- Authenticated members can create discussions
CREATE POLICY "Members can create discussions"
    ON public.discussions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = discussions.author_id
            AND user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid()
            AND church_id = discussions.church_id
        )
    );

-- Authors or admins can update discussions
CREATE POLICY "Authors or admins can update discussions"
    ON public.discussions FOR UPDATE
    USING (
        author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.user_church_roles
            WHERE user_id = auth.uid()
            AND church_id = discussions.church_id
            AND role IN ('owner', 'admin', 'pastor', 'staff')
            AND is_active = TRUE
        )
    );

-- Authors or admins can delete discussions
CREATE POLICY "Authors or admins can delete discussions"
    ON public.discussions FOR DELETE
    USING (
        author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.user_church_roles
            WHERE user_id = auth.uid()
            AND church_id = discussions.church_id
            AND role IN ('owner', 'admin', 'pastor', 'staff')
            AND is_active = TRUE
        )
    );

-- Users can view comments on discussions they can see
CREATE POLICY "Users can view discussion comments"
    ON public.discussion_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.discussions
            JOIN public.profiles ON profiles.church_id = discussions.church_id
            WHERE discussions.id = discussion_comments.discussion_id
            AND profiles.user_id = auth.uid()
        )
    );

-- Members can create comments
CREATE POLICY "Members can create comments"
    ON public.discussion_comments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = discussion_comments.author_id
            AND user_id = auth.uid()
        )
    );

-- Authors or admins can update/delete comments
CREATE POLICY "Authors or admins can manage comments"
    ON public.discussion_comments FOR UPDATE
    USING (
        author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.discussions d
            JOIN public.user_church_roles r ON r.church_id = d.church_id
            WHERE d.id = discussion_comments.discussion_id
            AND r.user_id = auth.uid()
            AND r.role IN ('owner', 'admin', 'pastor', 'staff')
            AND r.is_active = TRUE
        )
    );

CREATE POLICY "Authors or admins can delete comments"
    ON public.discussion_comments FOR DELETE
    USING (
        author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.discussions d
            JOIN public.user_church_roles r ON r.church_id = d.church_id
            WHERE d.id = discussion_comments.discussion_id
            AND r.user_id = auth.uid()
            AND r.role IN ('owner', 'admin', 'pastor', 'staff')
            AND r.is_active = TRUE
        )
    );

-- Users can view likes
CREATE POLICY "Users can view likes"
    ON public.discussion_likes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = discussion_likes.profile_id
        )
    );

-- Users can like/unlike
CREATE POLICY "Users can toggle likes"
    ON public.discussion_likes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = discussion_likes.profile_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can remove own likes"
    ON public.discussion_likes FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = discussion_likes.profile_id
            AND user_id = auth.uid()
        )
    );
