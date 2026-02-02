-- ============================================
-- 03_roles.sql
-- User-Church Roles (Multi-tenant Access)
-- ============================================

-- Create enum for church roles
CREATE TYPE church_role AS ENUM ('owner', 'admin', 'pastor', 'staff', 'volunteer', 'member', 'guest');

-- User-Church Roles join table
CREATE TABLE public.user_church_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    role church_role NOT NULL DEFAULT 'member',
    
    -- Optional permission overrides
    permissions_override JSONB DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    invited_by UUID REFERENCES public.users(id),
    invited_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique user-church combination
    UNIQUE(user_id, church_id)
);

-- Indexes for user_church_roles
CREATE INDEX idx_user_church_roles_user ON public.user_church_roles(user_id);
CREATE INDEX idx_user_church_roles_church ON public.user_church_roles(church_id);
CREATE INDEX idx_user_church_roles_role ON public.user_church_roles(role);
CREATE INDEX idx_user_church_roles_active ON public.user_church_roles(is_active) WHERE is_active = TRUE;

-- Trigger for updated_at
CREATE TRIGGER update_user_church_roles_updated_at
    BEFORE UPDATE ON public.user_church_roles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check if user has role in church
CREATE OR REPLACE FUNCTION public.user_has_church_role(
    p_user_id UUID,
    p_church_id UUID,
    p_roles church_role[] DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_roles IS NULL THEN
        RETURN EXISTS (
            SELECT 1 FROM public.user_church_roles
            WHERE user_id = p_user_id
            AND church_id = p_church_id
            AND is_active = TRUE
        );
    ELSE
        RETURN EXISTS (
            SELECT 1 FROM public.user_church_roles
            WHERE user_id = p_user_id
            AND church_id = p_church_id
            AND role = ANY(p_roles)
            AND is_active = TRUE
        );
    END IF;
END;
$$;

-- Function to check if user is admin of church
CREATE OR REPLACE FUNCTION public.user_is_church_admin(p_user_id UUID, p_church_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN public.user_has_church_role(p_user_id, p_church_id, ARRAY['owner', 'admin']::church_role[]);
END;
$$;

-- Function to get user's role in a church
CREATE OR REPLACE FUNCTION public.get_user_church_role(p_user_id UUID, p_church_id UUID)
RETURNS church_role
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role church_role;
BEGIN
    SELECT role INTO v_role
    FROM public.user_church_roles
    WHERE user_id = p_user_id
    AND church_id = p_church_id
    AND is_active = TRUE;
    
    RETURN v_role;
END;
$$;

-- Function to add user to church with role
CREATE OR REPLACE FUNCTION public.add_user_to_church(
    p_user_id UUID,
    p_church_id UUID,
    p_role church_role DEFAULT 'member',
    p_invited_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role_id UUID;
BEGIN
    INSERT INTO public.user_church_roles (user_id, church_id, role, invited_by, invited_at, accepted_at)
    VALUES (p_user_id, p_church_id, p_role, p_invited_by, NOW(), NOW())
    ON CONFLICT (user_id, church_id) 
    DO UPDATE SET role = p_role, is_active = TRUE, updated_at = NOW()
    RETURNING id INTO v_role_id;
    
    RETURN v_role_id;
END;
$$;
