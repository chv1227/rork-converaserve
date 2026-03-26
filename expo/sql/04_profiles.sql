-- ============================================
-- 04_profiles.sql
-- Profile System (Extensible, Tenant-Scoped)
-- ============================================

-- Create enum for profile types
CREATE TYPE profile_type AS ENUM ('admin', 'pastor', 'staff', 'volunteer', 'member');

-- Create enum for membership status
CREATE TYPE membership_status AS ENUM ('active', 'inactive', 'pending', 'transferred', 'deceased');

-- Base profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    profile_type profile_type NOT NULL DEFAULT 'member',
    
    -- Display info
    display_name TEXT,
    bio TEXT,
    phone TEXT,
    avatar_url TEXT,
    
    -- Additional contact
    secondary_email TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    
    -- Personal info
    date_of_birth DATE,
    gender TEXT,
    marital_status TEXT,
    
    -- Emergency contact
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relation TEXT,
    
    -- Metadata
    custom_fields JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique profile per user per church
    UNIQUE(user_id, church_id)
);

-- Indexes for profiles
CREATE INDEX idx_profiles_user ON public.profiles(user_id);
CREATE INDEX idx_profiles_church ON public.profiles(church_id);
CREATE INDEX idx_profiles_type ON public.profiles(profile_type);
CREATE INDEX idx_profiles_user_church ON public.profiles(user_id, church_id);

-- Admin profiles (1-to-1 extension)
CREATE TABLE public.admin_profiles (
    profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    admin_level INTEGER DEFAULT 1,
    can_manage_billing BOOLEAN DEFAULT FALSE,
    can_manage_users BOOLEAN DEFAULT TRUE,
    can_manage_content BOOLEAN DEFAULT TRUE,
    system_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff profiles (1-to-1 extension)
CREATE TABLE public.staff_profiles (
    profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT,
    department TEXT,
    employment_status TEXT DEFAULT 'full-time',
    hire_date DATE,
    supervisor_profile_id UUID REFERENCES public.profiles(id),
    office_location TEXT,
    office_hours TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Member profiles (1-to-1 extension)
CREATE TABLE public.member_profiles (
    profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    membership_status membership_status DEFAULT 'pending',
    member_number TEXT,
    join_date DATE,
    baptism_date DATE,
    confirmation_date DATE,
    how_heard TEXT,
    previous_church TEXT,
    family_id UUID,
    family_role TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Volunteer profiles (1-to-1 extension)
CREATE TABLE public.volunteer_profiles (
    profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    availability JSONB DEFAULT '{}',
    skills TEXT[],
    interests TEXT[],
    background_check_date DATE,
    background_check_status TEXT,
    training_completed JSONB DEFAULT '[]',
    total_volunteer_hours NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_profiles_updated_at
    BEFORE UPDATE ON public.admin_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_profiles_updated_at
    BEFORE UPDATE ON public.staff_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_member_profiles_updated_at
    BEFORE UPDATE ON public.member_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_volunteer_profiles_updated_at
    BEFORE UPDATE ON public.volunteer_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get or create profile
CREATE OR REPLACE FUNCTION public.get_or_create_profile(
    p_user_id UUID,
    p_church_id UUID,
    p_profile_type profile_type DEFAULT 'member'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_id UUID;
    v_user_name TEXT;
BEGIN
    -- Check if profile exists
    SELECT id INTO v_profile_id
    FROM public.profiles
    WHERE user_id = p_user_id AND church_id = p_church_id;
    
    IF v_profile_id IS NULL THEN
        -- Get user's name for display_name
        SELECT full_name INTO v_user_name FROM public.users WHERE id = p_user_id;
        
        -- Create new profile
        INSERT INTO public.profiles (user_id, church_id, profile_type, display_name)
        VALUES (p_user_id, p_church_id, p_profile_type, v_user_name)
        RETURNING id INTO v_profile_id;
        
        -- Create type-specific profile
        CASE p_profile_type
            WHEN 'admin' THEN
                INSERT INTO public.admin_profiles (profile_id) VALUES (v_profile_id);
            WHEN 'staff', 'pastor' THEN
                INSERT INTO public.staff_profiles (profile_id) VALUES (v_profile_id);
            WHEN 'volunteer' THEN
                INSERT INTO public.volunteer_profiles (profile_id) VALUES (v_profile_id);
            WHEN 'member' THEN
                INSERT INTO public.member_profiles (profile_id) VALUES (v_profile_id);
        END CASE;
    END IF;
    
    RETURN v_profile_id;
END;
$$;
