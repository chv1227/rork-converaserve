-- ============================================
-- 10_forms.sql
-- Forms & Form Responses System
-- ============================================

-- ============================================
-- FORMS
-- ============================================

CREATE TYPE form_type AS ENUM ('registration', 'volunteer', 'prayer', 'general');

CREATE TABLE public.forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    
    -- Content
    title TEXT NOT NULL,
    description TEXT,
    form_type form_type DEFAULT 'general',
    
    -- Fields (JSON array of field definitions)
    fields JSONB DEFAULT '[]',
    
    -- Settings
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,
    allow_multiple_responses BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_by_profile_id UUID REFERENCES public.profiles(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_forms_church ON public.forms(church_id);
CREATE INDEX idx_forms_active ON public.forms(is_active);
CREATE INDEX idx_forms_type ON public.forms(form_type);

-- ============================================
-- FORM RESPONSES
-- ============================================

CREATE TABLE public.form_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    
    -- Submitter
    profile_id UUID REFERENCES public.profiles(id),
    
    -- Response data (JSON key-value pairs for each field)
    responses JSONB DEFAULT '{}',
    
    -- Metadata
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_form_responses_form ON public.form_responses(form_id);
CREATE INDEX idx_form_responses_church ON public.form_responses(church_id);
CREATE INDEX idx_form_responses_profile ON public.form_responses(profile_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_forms_updated_at
    BEFORE UPDATE ON public.forms
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;

-- Users can view active forms in their church
CREATE POLICY "Users can view active church forms" ON public.forms
    FOR SELECT USING (
        church_id IN (
            SELECT church_id FROM public.profiles
            WHERE user_id = auth.uid()
        ) AND is_active = TRUE
    );

-- Leaders/admins can create and manage forms
CREATE POLICY "Leaders can manage forms" ON public.forms
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_church_roles
            WHERE user_id = auth.uid()
            AND church_id = forms.church_id
            AND role IN ('owner', 'admin', 'pastor', 'staff')
            AND is_active = TRUE
        )
    );

-- Users can submit form responses
CREATE POLICY "Users can submit form responses" ON public.form_responses
    FOR INSERT WITH CHECK (
        profile_id IN (
            SELECT id FROM public.profiles
            WHERE user_id = auth.uid()
        )
    );

-- Users can view their own responses
CREATE POLICY "Users can view own responses" ON public.form_responses
    FOR SELECT USING (
        profile_id IN (
            SELECT id FROM public.profiles
            WHERE user_id = auth.uid()
        )
    );

-- Admins can view all responses in their church
CREATE POLICY "Admins can view all responses" ON public.form_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_church_roles
            WHERE user_id = auth.uid()
            AND church_id = form_responses.church_id
            AND role IN ('owner', 'admin', 'pastor', 'staff')
            AND is_active = TRUE
        )
    );
