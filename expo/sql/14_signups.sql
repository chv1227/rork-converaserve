-- ============================================
-- 14_signups.sql
-- Church Membership, Children's Ministry & Volunteer Signups
-- ============================================

-- ============================================
-- SIGNUP REQUEST TYPE ENUM
-- ============================================

CREATE TYPE signup_type AS ENUM (
    'church_membership',
    'childrens_ministry',
    'youth_ministry',
    'volunteer',
    'small_group',
    'baptism',
    'other'
);

CREATE TYPE signup_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'waitlisted'
);

-- ============================================
-- CHURCH MEMBERSHIP SIGNUPS
-- ============================================

CREATE TABLE public.church_membership_signups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    signup_type signup_type NOT NULL DEFAULT 'church_membership',
    status signup_status NOT NULL DEFAULT 'pending',

    -- Personal info
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    date_of_birth DATE,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,

    -- Church background
    previous_church TEXT,
    is_baptized BOOLEAN DEFAULT FALSE,
    baptism_date DATE,
    salvation_testimony TEXT,
    areas_of_interest TEXT[] DEFAULT '{}',
    skills_or_talents TEXT[] DEFAULT '{}',

    -- Children's ministry specific fields (JSON for flexibility)
    children_info JSONB DEFAULT '[]',

    -- Volunteer specific fields
    volunteer_area TEXT,
    volunteer_availability TEXT[] DEFAULT '{}',
    background_check_consent BOOLEAN DEFAULT FALSE,
    has_experience_with_children BOOLEAN DEFAULT FALSE,

    -- Small group preferences
    group_preference TEXT,
    preferred_meeting_time TEXT,

    -- Baptism specific
    desired_baptism_date DATE,

    -- Notes
    additional_notes TEXT,
    admin_notes TEXT,

    -- Metadata
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_membership_signups_church ON public.church_membership_signups(church_id);
CREATE INDEX idx_membership_signups_user ON public.church_membership_signups(user_id);
CREATE INDEX idx_membership_signups_type ON public.church_membership_signups(signup_type);
CREATE INDEX idx_membership_signups_status ON public.church_membership_signups(status);
CREATE INDEX idx_membership_signups_email ON public.church_membership_signups(email);

-- ============================================
-- CHILDREN'S MINISTRY CHILD RECORDS
-- ============================================

CREATE TYPE child_gender AS ENUM ('male', 'female', 'other');

CREATE TABLE public.childrens_ministry_children (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signup_id UUID REFERENCES public.church_membership_signups(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    parent_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Child info
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    preferred_name TEXT,
    date_of_birth DATE NOT NULL,
    gender child_gender,
    grade_level TEXT,
    school TEXT,

    -- Medical info
    allergies TEXT[] DEFAULT '{}',
    medical_conditions TEXT[] DEFAULT '{}',
    medications TEXT[] DEFAULT '{}',
    dietary_restrictions TEXT[] DEFAULT '{}',
    special_needs TEXT,
    physician_name TEXT,
    physician_phone TEXT,

    -- Emergency contacts
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relationship TEXT,

    -- Pickup authorization
    authorized_pickup_persons JSONB DEFAULT '[]',

    -- Media consent
    photo_release BOOLEAN DEFAULT FALSE,
    medical_release BOOLEAN DEFAULT FALSE,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    checked_in BOOLEAN DEFAULT FALSE,
    last_checked_in_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_children_church ON public.childrens_ministry_children(church_id);
CREATE INDEX idx_children_signup ON public.childrens_ministry_children(signup_id);
CREATE INDEX idx_children_parent ON public.childrens_ministry_children(parent_user_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_church_membership_signups_updated_at
    BEFORE UPDATE ON public.church_membership_signups
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_childrens_ministry_children_updated_at
    BEFORE UPDATE ON public.childrens_ministry_children
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.church_membership_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.childrens_ministry_children ENABLE ROW LEVEL SECURITY;

-- Users can create their own signups
CREATE POLICY "Users can create own signups" ON public.church_membership_signups
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        OR auth.uid() IS NOT NULL
    );

-- Users can view their own signups
CREATE POLICY "Users can view own signups" ON public.church_membership_signups
    FOR SELECT USING (
        user_id = auth.uid()
    );

-- Admins can view and manage all signups in their church
CREATE POLICY "Admins can manage church signups" ON public.church_membership_signups
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_church_roles
            WHERE user_id = auth.uid()
            AND church_id = church_membership_signups.church_id
            AND role IN ('owner', 'admin', 'pastor', 'staff')
            AND is_active = TRUE
        )
    );

-- Users can insert children linked to their signup
CREATE POLICY "Users can insert their children" ON public.childrens_ministry_children
    FOR INSERT WITH CHECK (
        parent_user_id = auth.uid()
    );

-- Users can view their own children's records
CREATE POLICY "Users can view own children" ON public.childrens_ministry_children
    FOR SELECT USING (
        parent_user_id = auth.uid()
    );

-- Admins can view and manage all children in their church
CREATE POLICY "Admins can manage church children" ON public.childrens_ministry_children
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_church_roles
            WHERE user_id = auth.uid()
            AND church_id = childrens_ministry_children.church_id
            AND role IN ('owner', 'admin', 'pastor', 'staff')
            AND is_active = TRUE
        )
    );
