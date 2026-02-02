-- ============================================
-- 07_rls.sql
-- Row Level Security Policies
-- ============================================

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_church_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ministry_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================

-- Get current user's church IDs
CREATE OR REPLACE FUNCTION public.get_user_church_ids()
RETURNS UUID[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT ARRAY_AGG(church_id)
    FROM public.user_church_roles
    WHERE user_id = auth.uid() AND is_active = TRUE;
$$;

-- Check if user belongs to church
CREATE OR REPLACE FUNCTION public.user_belongs_to_church(p_church_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_church_roles
        WHERE user_id = auth.uid()
        AND church_id = p_church_id
        AND is_active = TRUE
    );
$$;

-- Check if user is admin of church
CREATE OR REPLACE FUNCTION public.user_is_admin_of_church(p_church_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_church_roles
        WHERE user_id = auth.uid()
        AND church_id = p_church_id
        AND role IN ('owner', 'admin')
        AND is_active = TRUE
    );
$$;

-- Check if user is staff or higher
CREATE OR REPLACE FUNCTION public.user_is_staff_or_higher(p_church_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_church_roles
        WHERE user_id = auth.uid()
        AND church_id = p_church_id
        AND role IN ('owner', 'admin', 'pastor', 'staff')
        AND is_active = TRUE
    );
$$;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Users can view their own data
CREATE POLICY "Users can view own data"
    ON public.users FOR SELECT
    USING (id = auth.uid());

-- Users can update their own data
CREATE POLICY "Users can update own data"
    ON public.users FOR UPDATE
    USING (id = auth.uid());

-- Users can view other users in their churches
CREATE POLICY "Users can view church members"
    ON public.users FOR SELECT
    USING (
        id IN (
            SELECT ucr.user_id 
            FROM public.user_church_roles ucr
            WHERE ucr.church_id = ANY(public.get_user_church_ids())
        )
    );

-- ============================================
-- CHURCHES TABLE POLICIES
-- ============================================

-- Users can view churches they belong to
CREATE POLICY "Users can view their churches"
    ON public.churches FOR SELECT
    USING (public.user_belongs_to_church(id));

-- Users can view active churches for discovery (limited fields handled in app)
CREATE POLICY "Users can view active churches"
    ON public.churches FOR SELECT
    USING (status = 'active' AND deleted_at IS NULL);

-- Only owners/admins can update their church
CREATE POLICY "Admins can update church"
    ON public.churches FOR UPDATE
    USING (public.user_is_admin_of_church(id));

-- Authenticated users can create churches
CREATE POLICY "Authenticated users can create churches"
    ON public.churches FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- USER_CHURCH_ROLES POLICIES
-- ============================================

-- Users can view roles for their churches
CREATE POLICY "Users can view church roles"
    ON public.user_church_roles FOR SELECT
    USING (public.user_belongs_to_church(church_id));

-- Admins can manage roles
CREATE POLICY "Admins can insert roles"
    ON public.user_church_roles FOR INSERT
    WITH CHECK (public.user_is_admin_of_church(church_id) OR user_id = auth.uid());

CREATE POLICY "Admins can update roles"
    ON public.user_church_roles FOR UPDATE
    USING (public.user_is_admin_of_church(church_id));

CREATE POLICY "Admins can delete roles"
    ON public.user_church_roles FOR DELETE
    USING (public.user_is_admin_of_church(church_id) OR user_id = auth.uid());

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can view profiles in their churches
CREATE POLICY "Users can view church profiles"
    ON public.profiles FOR SELECT
    USING (public.user_belongs_to_church(church_id));

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (user_id = auth.uid() AND public.user_belongs_to_church(church_id));

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (user_id = auth.uid());

-- Admins can update any profile in their church
CREATE POLICY "Admins can update profiles"
    ON public.profiles FOR UPDATE
    USING (public.user_is_admin_of_church(church_id));

-- ============================================
-- PROFILE SUB-TABLES POLICIES
-- ============================================

-- Admin profiles
CREATE POLICY "View admin profiles"
    ON public.admin_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_id
            AND public.user_belongs_to_church(p.church_id)
        )
    );

CREATE POLICY "Manage admin profiles"
    ON public.admin_profiles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_id
            AND (p.user_id = auth.uid() OR public.user_is_admin_of_church(p.church_id))
        )
    );

-- Staff profiles
CREATE POLICY "View staff profiles"
    ON public.staff_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_id
            AND public.user_belongs_to_church(p.church_id)
        )
    );

CREATE POLICY "Manage staff profiles"
    ON public.staff_profiles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_id
            AND (p.user_id = auth.uid() OR public.user_is_admin_of_church(p.church_id))
        )
    );

-- Member profiles
CREATE POLICY "View member profiles"
    ON public.member_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_id
            AND public.user_belongs_to_church(p.church_id)
        )
    );

CREATE POLICY "Manage member profiles"
    ON public.member_profiles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_id
            AND (p.user_id = auth.uid() OR public.user_is_admin_of_church(p.church_id))
        )
    );

-- Volunteer profiles
CREATE POLICY "View volunteer profiles"
    ON public.volunteer_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_id
            AND public.user_belongs_to_church(p.church_id)
        )
    );

CREATE POLICY "Manage volunteer profiles"
    ON public.volunteer_profiles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_id
            AND (p.user_id = auth.uid() OR public.user_is_admin_of_church(p.church_id))
        )
    );

-- ============================================
-- MINISTRIES POLICIES
-- ============================================

CREATE POLICY "View ministries"
    ON public.ministries FOR SELECT
    USING (public.user_belongs_to_church(church_id));

CREATE POLICY "Staff can manage ministries"
    ON public.ministries FOR INSERT
    WITH CHECK (public.user_is_staff_or_higher(church_id));

CREATE POLICY "Staff can update ministries"
    ON public.ministries FOR UPDATE
    USING (public.user_is_staff_or_higher(church_id));

CREATE POLICY "Admins can delete ministries"
    ON public.ministries FOR DELETE
    USING (public.user_is_admin_of_church(church_id));

-- ============================================
-- MINISTRY_MEMBERS POLICIES
-- ============================================

CREATE POLICY "View ministry members"
    ON public.ministry_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ministries m
            WHERE m.id = ministry_id
            AND public.user_belongs_to_church(m.church_id)
        )
    );

CREATE POLICY "Join ministries"
    ON public.ministry_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ministries m
            JOIN public.profiles p ON p.church_id = m.church_id
            WHERE m.id = ministry_id
            AND p.id = profile_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Leave ministries"
    ON public.ministry_members FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_id AND p.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.ministries m
            WHERE m.id = ministry_id
            AND public.user_is_staff_or_higher(m.church_id)
        )
    );

-- ============================================
-- EVENTS POLICIES
-- ============================================

CREATE POLICY "View events"
    ON public.events FOR SELECT
    USING (public.user_belongs_to_church(church_id));

CREATE POLICY "Staff can create events"
    ON public.events FOR INSERT
    WITH CHECK (public.user_is_staff_or_higher(church_id));

CREATE POLICY "Staff can update events"
    ON public.events FOR UPDATE
    USING (public.user_is_staff_or_higher(church_id));

CREATE POLICY "Admins can delete events"
    ON public.events FOR DELETE
    USING (public.user_is_admin_of_church(church_id));

-- ============================================
-- EVENT_REGISTRATIONS POLICIES
-- ============================================

CREATE POLICY "View registrations"
    ON public.event_registrations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = event_id
            AND public.user_belongs_to_church(e.church_id)
        )
    );

CREATE POLICY "Register for events"
    ON public.event_registrations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.events e ON e.church_id = p.church_id
            WHERE p.id = profile_id
            AND e.id = event_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Cancel registration"
    ON public.event_registrations FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_id AND p.user_id = auth.uid()
        )
    );

-- ============================================
-- ATTENDANCE POLICIES
-- ============================================

CREATE POLICY "View attendance"
    ON public.attendance FOR SELECT
    USING (public.user_belongs_to_church(church_id));

CREATE POLICY "Staff can record attendance"
    ON public.attendance FOR INSERT
    WITH CHECK (public.user_is_staff_or_higher(church_id));

CREATE POLICY "Staff can update attendance"
    ON public.attendance FOR UPDATE
    USING (public.user_is_staff_or_higher(church_id));

-- ============================================
-- INTERNAL_NOTES POLICIES
-- ============================================

CREATE POLICY "Staff can view notes"
    ON public.internal_notes FOR SELECT
    USING (public.user_is_staff_or_higher(church_id));

CREATE POLICY "Staff can create notes"
    ON public.internal_notes FOR INSERT
    WITH CHECK (public.user_is_staff_or_higher(church_id));

CREATE POLICY "Staff can update own notes"
    ON public.internal_notes FOR UPDATE
    USING (
        public.user_is_staff_or_higher(church_id)
        AND (
            created_by_profile_id IN (
                SELECT id FROM public.profiles WHERE user_id = auth.uid()
            )
            OR public.user_is_admin_of_church(church_id)
        )
    );

CREATE POLICY "Admins can delete notes"
    ON public.internal_notes FOR DELETE
    USING (public.user_is_admin_of_church(church_id));

-- ============================================
-- DOCUMENTS POLICIES
-- ============================================

CREATE POLICY "View documents"
    ON public.documents FOR SELECT
    USING (
        public.user_belongs_to_church(church_id)
        AND (
            is_public = TRUE
            OR allowed_roles IS NULL
            OR (
                SELECT role FROM public.user_church_roles
                WHERE user_id = auth.uid() AND church_id = documents.church_id
            ) = ANY(allowed_roles)
        )
    );

CREATE POLICY "Staff can upload documents"
    ON public.documents FOR INSERT
    WITH CHECK (public.user_is_staff_or_higher(church_id));

CREATE POLICY "Staff can update documents"
    ON public.documents FOR UPDATE
    USING (public.user_is_staff_or_higher(church_id));

CREATE POLICY "Admins can delete documents"
    ON public.documents FOR DELETE
    USING (public.user_is_admin_of_church(church_id));

-- ============================================
-- ANNOUNCEMENTS POLICIES
-- ============================================

CREATE POLICY "View announcements"
    ON public.announcements FOR SELECT
    USING (
        public.user_belongs_to_church(church_id)
        AND status = 'published'
        AND (publish_at IS NULL OR publish_at <= NOW())
        AND (expire_at IS NULL OR expire_at > NOW())
    );

CREATE POLICY "Staff can view all announcements"
    ON public.announcements FOR SELECT
    USING (public.user_is_staff_or_higher(church_id));

CREATE POLICY "Staff can create announcements"
    ON public.announcements FOR INSERT
    WITH CHECK (public.user_is_staff_or_higher(church_id));

CREATE POLICY "Staff can update announcements"
    ON public.announcements FOR UPDATE
    USING (public.user_is_staff_or_higher(church_id));

CREATE POLICY "Admins can delete announcements"
    ON public.announcements FOR DELETE
    USING (public.user_is_admin_of_church(church_id));

-- ============================================
-- PRAYER_REQUESTS POLICIES
-- ============================================

CREATE POLICY "View public prayer requests"
    ON public.prayer_requests FOR SELECT
    USING (
        public.user_belongs_to_church(church_id)
        AND (is_public = TRUE OR profile_id IN (
            SELECT id FROM public.profiles WHERE user_id = auth.uid()
        ))
    );

CREATE POLICY "Create prayer requests"
    ON public.prayer_requests FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_id
            AND p.user_id = auth.uid()
            AND p.church_id = prayer_requests.church_id
        )
    );

CREATE POLICY "Update own prayer requests"
    ON public.prayer_requests FOR UPDATE
    USING (
        profile_id IN (
            SELECT id FROM public.profiles WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- PRAYER_INTERACTIONS POLICIES
-- ============================================

CREATE POLICY "View prayer interactions"
    ON public.prayer_interactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.prayer_requests pr
            WHERE pr.id = prayer_request_id
            AND public.user_belongs_to_church(pr.church_id)
        )
    );

CREATE POLICY "Create prayer interactions"
    ON public.prayer_interactions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_id AND p.user_id = auth.uid()
        )
    );

-- ============================================
-- AUDIT_LOGS POLICIES
-- ============================================

CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (
        church_id IS NULL AND user_id = auth.uid()
        OR public.user_is_admin_of_church(church_id)
    );

-- Only system can insert audit logs (via SECURITY DEFINER functions)
CREATE POLICY "System can insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (TRUE);

-- ============================================
-- TENANT_SETTINGS POLICIES
-- ============================================

CREATE POLICY "Admins can view tenant settings"
    ON public.tenant_settings FOR SELECT
    USING (public.user_is_admin_of_church(church_id));

CREATE POLICY "Admins can manage tenant settings"
    ON public.tenant_settings FOR ALL
    USING (public.user_is_admin_of_church(church_id));

-- ============================================
-- SYSTEM_NOTIFICATIONS POLICIES
-- ============================================

CREATE POLICY "View own notifications"
    ON public.system_notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Update own notifications"
    ON public.system_notifications FOR UPDATE
    USING (user_id = auth.uid());

-- System can insert notifications
CREATE POLICY "System can insert notifications"
    ON public.system_notifications FOR INSERT
    WITH CHECK (TRUE);

-- ============================================
-- FEATURE_FLAGS POLICIES
-- ============================================

-- Feature flags are read-only for regular users
CREATE POLICY "View feature flags"
    ON public.feature_flags FOR SELECT
    USING (TRUE);

-- ============================================
-- SYSTEM_SETTINGS POLICIES
-- ============================================

-- Public settings can be viewed by anyone
CREATE POLICY "View public system settings"
    ON public.system_settings FOR SELECT
    USING (is_public = TRUE);

-- ============================================
-- USAGE_METRICS POLICIES
-- ============================================

CREATE POLICY "Admins can view usage metrics"
    ON public.usage_metrics FOR SELECT
    USING (public.user_is_admin_of_church(church_id));
