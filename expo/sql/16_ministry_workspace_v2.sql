-- ============================================
-- 16_ministry_workspace_v2.sql
-- Ministry Workspace v2: attendance tables + RPCs for volunteer
-- sign-up and roster role changes.
--
-- ADDITIVE ONLY and idempotent (safe to re-run):
--   * creates 2 new tables (if not exists) with RLS enabled
--   * creates 3 new SECURITY DEFINER functions (names that did not exist before)
--   * never drops, alters or deletes existing tables, policies or data
--
-- NOTE: the live database schema has diverged from 15_ministry_extensions.sql.
-- This file targets the LIVE schema (checked 2026-10-08) and reuses these
-- existing tables as-is (no changes made to them):
--   ministry_tasks              -> Task List           (RLS: mt_select / mt_write / mt_assignee_update)
--   ministry_positions          -> volunteer roles     (RLS: mpos_select / mpos_write)
--   ministry_roster_slots       -> volunteer slots     (assignee_profile_id IS NULL = open slot)
--   children, child_guardians,
--   child_checkins              -> children's check-in (via existing cc_child_check_in / cc_child_check_out RPCs)
--   ministry_announcements, ministry_messages, ministry_files,
--   ministry_events, ministry_prayer_requests
--
-- Depends on existing helpers: cc_can_access_ministry, cc_is_ministry_leader,
-- cc_ministry_church, cc_is_church_owner_admin, update_updated_at_column.
-- ============================================

-- ============================================
-- MINISTRY ATTENDANCE (one row per gathering)
-- ============================================

CREATE TABLE IF NOT EXISTS public.ministry_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,

    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    label TEXT,
    guest_count INTEGER NOT NULL DEFAULT 0 CHECK (guest_count >= 0),
    notes TEXT,

    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ministry_attendance_ministry_date
    ON public.ministry_attendance(ministry_id, attendance_date DESC);

-- ============================================
-- MINISTRY ATTENDANCE RECORDS (one row per person per gathering)
-- ============================================

CREATE TABLE IF NOT EXISTS public.ministry_attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_id UUID NOT NULL REFERENCES public.ministry_attendance(id) ON DELETE CASCADE,
    ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (attendance_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_ministry_attendance_records_session
    ON public.ministry_attendance_records(attendance_id);
CREATE INDEX IF NOT EXISTS idx_ministry_attendance_records_ministry
    ON public.ministry_attendance_records(ministry_id);
CREATE INDEX IF NOT EXISTS idx_ministry_attendance_records_profile
    ON public.ministry_attendance_records(profile_id);

-- updated_at trigger (created only if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_ministry_attendance_updated_at'
          AND tgrelid = 'public.ministry_attendance'::regclass
    ) THEN
        CREATE TRIGGER update_ministry_attendance_updated_at
            BEFORE UPDATE ON public.ministry_attendance
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- ============================================
-- RLS: members of the ministry can read, leaders can write
-- (cc_is_ministry_leader = ministry leader OR church owner/admin)
-- ============================================

ALTER TABLE public.ministry_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ministry_attendance_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ministry_attendance' AND policyname = 'matt_select') THEN
        CREATE POLICY matt_select ON public.ministry_attendance
            FOR SELECT TO authenticated
            USING (public.cc_can_access_ministry(ministry_id));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ministry_attendance' AND policyname = 'matt_write') THEN
        CREATE POLICY matt_write ON public.ministry_attendance
            FOR ALL TO authenticated
            USING (public.cc_is_ministry_leader(ministry_id))
            WITH CHECK (
                public.cc_is_ministry_leader(ministry_id)
                AND church_id = public.cc_ministry_church(ministry_id)
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ministry_attendance_records' AND policyname = 'matr_select') THEN
        CREATE POLICY matr_select ON public.ministry_attendance_records
            FOR SELECT TO authenticated
            USING (public.cc_can_access_ministry(ministry_id));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ministry_attendance_records' AND policyname = 'matr_write') THEN
        CREATE POLICY matr_write ON public.ministry_attendance_records
            FOR ALL TO authenticated
            USING (public.cc_is_ministry_leader(ministry_id))
            WITH CHECK (
                public.cc_is_ministry_leader(ministry_id)
                AND church_id = public.cc_ministry_church(ministry_id)
                AND EXISTS (
                    SELECT 1 FROM public.ministry_attendance a
                    WHERE a.id = ministry_attendance_records.attendance_id
                      AND a.ministry_id = ministry_attendance_records.ministry_id
                )
            );
    END IF;
END $$;

-- ============================================
-- VOLUNTEER SIGN-UP on existing ministry_roster_slots
-- Members can claim an OPEN slot (assignee IS NULL) for themselves.
-- Leaders keep full write access through the existing mrs_write policy.
-- ============================================

CREATE OR REPLACE FUNCTION public.cc_roster_claim_slot(p_slot UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_ministry UUID;
    v_church UUID;
    v_profile UUID;
    v_updated INTEGER;
BEGIN
    SELECT ministry_id, church_id INTO v_ministry, v_church
    FROM ministry_roster_slots WHERE id = p_slot;
    IF v_ministry IS NULL THEN
        RAISE EXCEPTION 'Slot not found.';
    END IF;
    IF NOT public.cc_can_access_ministry(v_ministry) THEN
        RAISE EXCEPTION 'Only members of this ministry can sign up.';
    END IF;

    SELECT id INTO v_profile FROM profiles
    WHERE user_id = auth.uid() AND church_id = v_church
    LIMIT 1;
    IF v_profile IS NULL THEN
        RAISE EXCEPTION 'Profile not found.';
    END IF;

    UPDATE ministry_roster_slots
       SET assignee_profile_id = v_profile, status = 'confirmed', swap_note = NULL
     WHERE id = p_slot AND assignee_profile_id IS NULL;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated = 0 THEN
        RAISE EXCEPTION 'This slot has already been filled.';
    END IF;
END;
$function$;

-- The assignee (or a leader) can release a slot back to open.
CREATE OR REPLACE FUNCTION public.cc_roster_release_slot(p_slot UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_ministry UUID;
    v_church UUID;
    v_assignee UUID;
    v_profile UUID;
BEGIN
    SELECT ministry_id, church_id, assignee_profile_id INTO v_ministry, v_church, v_assignee
    FROM ministry_roster_slots WHERE id = p_slot;
    IF v_ministry IS NULL THEN
        RAISE EXCEPTION 'Slot not found.';
    END IF;

    SELECT id INTO v_profile FROM profiles
    WHERE user_id = auth.uid() AND church_id = v_church
    LIMIT 1;

    IF NOT (public.cc_is_ministry_leader(v_ministry) OR (v_assignee IS NOT NULL AND v_assignee = v_profile)) THEN
        RAISE EXCEPTION 'You can only release your own slots.';
    END IF;

    UPDATE ministry_roster_slots
       SET assignee_profile_id = NULL, status = 'pending', swap_note = NULL
     WHERE id = p_slot;
END;
$function$;

-- ============================================
-- ROSTER: ministry leaders (or church owner/admin) change a member's role.
-- Only 'member' and 'leader' are accepted (the values cc_is_ministry_leader understands).
-- A ministry leader cannot change their own role (prevents accidental lock-out);
-- church owners/admins can.
-- ============================================

CREATE OR REPLACE FUNCTION public.cc_set_ministry_member_role(p_ministry UUID, p_profile UUID, p_role TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_church UUID;
    v_self UUID;
BEGIN
    IF p_role NOT IN ('member', 'leader') THEN
        RAISE EXCEPTION 'Invalid role.';
    END IF;

    v_church := public.cc_ministry_church(p_ministry);
    IF v_church IS NULL THEN
        RAISE EXCEPTION 'Ministry not found.';
    END IF;

    IF NOT public.cc_is_ministry_leader(p_ministry) THEN
        RAISE EXCEPTION 'Only ministry leaders can change roles.';
    END IF;

    SELECT id INTO v_self FROM profiles
    WHERE user_id = auth.uid() AND church_id = v_church
    LIMIT 1;

    IF v_self IS NOT NULL AND v_self = p_profile AND NOT public.cc_is_church_owner_admin(v_church) THEN
        RAISE EXCEPTION 'You cannot change your own role. Ask another leader or a church admin.';
    END IF;

    UPDATE ministry_members
       SET role = p_role
     WHERE ministry_id = p_ministry AND profile_id = p_profile;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'That person is not a member of this ministry.';
    END IF;
END;
$function$;

-- Only signed-in users may call the new functions.
REVOKE ALL ON FUNCTION public.cc_roster_claim_slot(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cc_roster_release_slot(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cc_set_ministry_member_role(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cc_roster_claim_slot(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cc_roster_release_slot(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cc_set_ministry_member_role(UUID, UUID, TEXT) TO authenticated;

-- Table privileges for the API roles (RLS still applies).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ministry_attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ministry_attendance_records TO authenticated;
