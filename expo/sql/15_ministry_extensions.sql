-- ============================================
-- 15_ministry_extensions.sql
-- Ministry-specific extension tables
-- ============================================

-- ============================================
-- MINISTRY TASKS (shared across all ministries)
-- ============================================

CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TABLE public.ministry_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    description TEXT,
    status task_status DEFAULT 'todo',
    priority task_priority DEFAULT 'medium',
    
    assigned_to UUID REFERENCES public.profiles(id),
    created_by UUID REFERENCES public.profiles(id),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ministry_tasks_ministry ON public.ministry_tasks(ministry_id);
CREATE INDEX idx_ministry_tasks_assigned ON public.ministry_tasks(assigned_to);
CREATE INDEX idx_ministry_tasks_status ON public.ministry_tasks(status);

-- ============================================
-- VOLUNTEER SCHEDULING (shared)
-- ============================================

CREATE TYPE volunteer_slot_status AS ENUM ('open', 'filled', 'cancelled');

CREATE TABLE public.ministry_volunteer_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    description TEXT,
    
    -- Scheduling
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location TEXT,
    
    -- Assignment
    assigned_to UUID REFERENCES public.profiles(id),
    status volunteer_slot_status DEFAULT 'open',
    notes TEXT,
    
    -- Metadata
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_volunteer_slots_ministry ON public.ministry_volunteer_slots(ministry_id);
CREATE INDEX idx_volunteer_slots_date ON public.ministry_volunteer_slots(slot_date);
CREATE INDEX idx_volunteer_slots_assigned ON public.ministry_volunteer_slots(assigned_to);

-- ============================================
-- DEACONS MINISTRY: CARE VISITS
-- ============================================

CREATE TYPE visit_type AS ENUM ('hospital', 'nursing_home', 'home', 'follow_up', 'new_member', 'widow_care', 'other');
CREATE TYPE visit_status AS ENUM ('scheduled', 'completed', 'cancelled', 'needs_follow_up');

CREATE TABLE public.deacon_care_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    
    -- Visit info
    visit_type visit_type NOT NULL DEFAULT 'home',
    visit_date DATE NOT NULL,
    visit_time TIME,
    
    -- Recipient
    recipient_name TEXT NOT NULL,
    recipient_contact TEXT,
    location_name TEXT,
    location_address TEXT,
    reason TEXT,
    
    -- Assignment
    assigned_deacon UUID REFERENCES public.profiles(id),
    
    -- Status
    status visit_status DEFAULT 'scheduled',
    notes TEXT,
    follow_up_needed BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    completed_at TIMESTAMPTZ,
    
    -- Metadata
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_care_visits_ministry ON public.deacon_care_visits(ministry_id);
CREATE INDEX idx_care_visits_deacon ON public.deacon_care_visits(assigned_deacon);
CREATE INDEX idx_care_visits_date ON public.deacon_care_visits(visit_date);
CREATE INDEX idx_care_visits_status ON public.deacon_care_visits(status);

-- ============================================
-- DEACONS MINISTRY: BENEVOLENCE REQUESTS
-- ============================================

CREATE TYPE benevolence_type AS ENUM ('financial', 'food', 'transportation', 'housing', 'utility', 'medical', 'other');
CREATE TYPE benevolence_status AS ENUM ('pending', 'approved', 'denied', 'fulfilled', 'follow_up');

CREATE TABLE public.deacon_benevolence_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    
    -- Request info
    request_type benevolence_type NOT NULL DEFAULT 'financial',
    requester_name TEXT NOT NULL,
    requester_email TEXT,
    requester_phone TEXT,
    family_size INTEGER,
    amount_requested DECIMAL(10, 2),
    amount_approved DECIMAL(10, 2),
    description TEXT,
    
    -- Status
    status benevolence_status DEFAULT 'pending',
    reviewed_by UUID REFERENCES public.profiles(id),
    review_notes TEXT,
    fulfilled_at TIMESTAMPTZ,
    
    -- Metadata
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_benevolence_ministry ON public.deacon_benevolence_requests(ministry_id);
CREATE INDEX idx_benevolence_status ON public.deacon_benevolence_requests(status);

-- ============================================
-- DEACONS MINISTRY: PRAYER ASSIGNMENTS
-- ============================================

CREATE TYPE prayer_assignment_status AS ENUM ('pending', 'praying', 'completed', 'follow_up');

CREATE TABLE public.deacon_prayer_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    
    prayer_request_id UUID REFERENCES public.prayer_requests(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    is_confidential BOOLEAN DEFAULT FALSE,
    
    assigned_to UUID REFERENCES public.profiles(id),
    status prayer_assignment_status DEFAULT 'pending',
    
    follow_up_notes TEXT,
    completed_at TIMESTAMPTZ,
    
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prayer_assign_ministry ON public.deacon_prayer_assignments(ministry_id);
CREATE INDEX idx_prayer_assign_deacon ON public.deacon_prayer_assignments(assigned_to);

-- ============================================
-- DEACONS MINISTRY: MEAL COORDINATION
-- ============================================

CREATE TYPE meal_status AS ENUM ('needed', 'scheduled', 'delivered', 'cancelled');

CREATE TABLE public.deacon_meal_coordination (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    
    recipient_name TEXT NOT NULL,
    recipient_address TEXT,
    recipient_phone TEXT,
    reason TEXT,
    
    meal_date DATE NOT NULL,
    meal_time TIME,
    dietary_restrictions TEXT[] DEFAULT '{}',
    
    assigned_to UUID REFERENCES public.profiles(id),
    status meal_status DEFAULT 'needed',
    notes TEXT,
    
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meal_coord_ministry ON public.deacon_meal_coordination(ministry_id);
CREATE INDEX idx_meal_coord_date ON public.deacon_meal_coordination(meal_date);

-- ============================================
-- DEACONS MINISTRY: SERVICE SCHEDULING
-- ============================================

CREATE TYPE service_role AS ENUM ('greeter', 'usher', 'parking', 'communion_server', 'baptism_assistant', 'offering_collector', 'security', 'other');

CREATE TABLE public.deacon_service_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    
    role service_role NOT NULL,
    service_date DATE NOT NULL,
    service_time TIME NOT NULL,
    location TEXT,
    
    assigned_to UUID REFERENCES public.profiles(id),
    notes TEXT,
    
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_service_sched_ministry ON public.deacon_service_schedule(ministry_id);
CREATE INDEX idx_service_sched_date ON public.deacon_service_schedule(service_date);
CREATE INDEX idx_service_sched_assigned ON public.deacon_service_schedule(assigned_to);

-- ============================================
-- WORSHIP MINISTRY: SCHEDULES & REHEARSALS
-- ============================================

CREATE TYPE worship_role AS ENUM ('lead_vocal', 'backing_vocal', 'guitar', 'bass', 'drums', 'keys', 'piano', 'organ', 'violin', 'brass', 'woodwinds', 'percussion', 'choir', 'sound_engineer', 'visuals', 'stage_manager');

CREATE TABLE public.worship_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    
    service_title TEXT NOT NULL,
    service_date DATE NOT NULL,
    service_time TIME NOT NULL,
    location TEXT,
    
    -- Assignment
    role worship_role NOT NULL,
    assigned_to UUID REFERENCES public.profiles(id),
    notes TEXT,
    confirmed BOOLEAN DEFAULT FALSE,
    
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_worship_sched_ministry ON public.worship_schedules(ministry_id);
CREATE INDEX idx_worship_sched_date ON public.worship_schedules(service_date);
CREATE INDEX idx_worship_sched_assigned ON public.worship_schedules(assigned_to);

-- Worship rehearsals
CREATE TABLE public.worship_rehearsals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    rehearsal_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location TEXT,
    description TEXT,
    song_ids UUID[] DEFAULT '{}',
    
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rehearsals_ministry ON public.worship_rehearsals(ministry_id);
CREATE INDEX idx_rehearsals_date ON public.worship_rehearsals(rehearsal_date);

-- Worship team availability
CREATE TABLE public.worship_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    available_date DATE NOT NULL,
    available_times TEXT[] DEFAULT '{}',
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ministry_id, profile_id, available_date)
);

CREATE INDEX idx_worship_avail_ministry ON public.worship_availability(ministry_id);
CREATE INDEX idx_worship_avail_profile ON public.worship_availability(profile_id);
CREATE INDEX idx_worship_avail_date ON public.worship_availability(available_date);

-- Worship service plan
CREATE TABLE public.worship_service_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    service_date DATE NOT NULL,
    theme TEXT,
    
    -- Service flow (JSON array of items with type: song/scripture/prayer/announcement/sermon/offering)
    flow JSONB DEFAULT '[]',
    
    notes TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_service_plans_ministry ON public.worship_service_plans(ministry_id);
CREATE INDEX idx_service_plans_date ON public.worship_service_plans(service_date);

-- ============================================
-- CHILDREN'S MINISTRY: CLASSROOMS
-- ============================================

CREATE TABLE public.childrens_classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    age_group TEXT NOT NULL,
    age_min INTEGER,
    age_max INTEGER,
    capacity INTEGER,
    location TEXT,
    description TEXT,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_classrooms_ministry ON public.childrens_classrooms(ministry_id);

-- Classroom assignments (teachers/helpers)
CREATE TABLE public.childrens_classroom_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES public.childrens_classrooms(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'teacher',
    assigned_date DATE NOT NULL,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(classroom_id, profile_id, assigned_date)
);

CREATE INDEX idx_classroom_assign_class ON public.childrens_classroom_assignments(classroom_id);
CREATE INDEX idx_classroom_assign_profile ON public.childrens_classroom_assignments(profile_id);

-- ============================================
-- CHILDREN'S MINISTRY: CHECK-INS
-- ============================================

CREATE TABLE public.childrens_check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    child_id UUID REFERENCES public.childrens_ministry_children(id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES public.childrens_classrooms(id) ON DELETE SET NULL,
    
    check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in_time TIMESTAMPTZ DEFAULT NOW(),
    check_out_time TIMESTAMPTZ,
    
    checked_in_by UUID REFERENCES public.profiles(id),
    checked_out_by UUID REFERENCES public.profiles(id),
    pickup_person_name TEXT,
    pickup_relationship TEXT,
    
    security_code TEXT,
    notes TEXT,
    incident_occurred BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checkins_church ON public.childrens_check_ins(church_id);
CREATE INDEX idx_checkins_child ON public.childrens_check_ins(child_id);
CREATE INDEX idx_checkins_date ON public.childrens_check_ins(check_in_date);

-- ============================================
-- CHILDREN'S MINISTRY: LESSONS
-- ============================================

CREATE TABLE public.childrens_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    description TEXT,
    age_group TEXT NOT NULL,
    
    -- Content
    bible_verse TEXT,
    memory_verse TEXT,
    main_point TEXT,
    materials_needed TEXT,
    activity_ideas TEXT,
    craft_description TEXT,
    teacher_notes TEXT,
    
    -- Files
    lesson_file_url TEXT,
    activity_file_url TEXT,
    craft_file_url TEXT,
    
    -- Scheduling
    lesson_date DATE,
    
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lessons_ministry ON public.childrens_lessons(ministry_id);
CREATE INDEX idx_lessons_age_group ON public.childrens_lessons(age_group);
CREATE INDEX idx_lessons_date ON public.childrens_lessons(lesson_date);

-- ============================================
-- CHILDREN'S MINISTRY: INCIDENT REPORTS
-- ============================================

CREATE TYPE incident_severity AS ENUM ('minor', 'moderate', 'major', 'critical');

CREATE TABLE public.childrens_incident_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    
    child_id UUID REFERENCES public.childrens_ministry_children(id) ON DELETE CASCADE,
    
    -- Incident details
    incident_date DATE NOT NULL,
    incident_time TIME NOT NULL,
    location TEXT,
    description TEXT NOT NULL,
    severity incident_severity DEFAULT 'minor',
    action_taken TEXT,
    parent_notified BOOLEAN DEFAULT FALSE,
    parent_notification_time TIMESTAMPTZ,
    
    -- Staff involved
    reported_by UUID REFERENCES public.profiles(id),
    witnesses TEXT[] DEFAULT '{}',
    
    -- Follow-up
    follow_up_needed BOOLEAN DEFAULT FALSE,
    follow_up_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_incident_ministry ON public.childrens_incident_reports(ministry_id);
CREATE INDEX idx_incident_child ON public.childrens_incident_reports(child_id);
CREATE INDEX idx_incident_date ON public.childrens_incident_reports(incident_date);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_ministry_tasks_updated_at
    BEFORE UPDATE ON public.ministry_tasks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deacon_care_visits_updated_at
    BEFORE UPDATE ON public.deacon_care_visits
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deacon_benevolence_requests_updated_at
    BEFORE UPDATE ON public.deacon_benevolence_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deacon_prayer_assignments_updated_at
    BEFORE UPDATE ON public.deacon_prayer_assignments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deacon_meal_coordination_updated_at
    BEFORE UPDATE ON public.deacon_meal_coordination
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deacon_service_schedule_updated_at
    BEFORE UPDATE ON public.deacon_service_schedule
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_worship_schedules_updated_at
    BEFORE UPDATE ON public.worship_schedules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_worship_rehearsals_updated_at
    BEFORE UPDATE ON public.worship_rehearsals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_worship_service_plans_updated_at
    BEFORE UPDATE ON public.worship_service_plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_childrens_classrooms_updated_at
    BEFORE UPDATE ON public.childrens_classrooms
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_childrens_lessons_updated_at
    BEFORE UPDATE ON public.childrens_lessons
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_childrens_incident_reports_updated_at
    BEFORE UPDATE ON public.childrens_incident_reports
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.ministry_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ministry_volunteer_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deacon_care_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deacon_benevolence_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deacon_prayer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deacon_meal_coordination ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deacon_service_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worship_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worship_rehearsals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worship_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worship_service_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.childrens_classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.childrens_classroom_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.childrens_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.childrens_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.childrens_incident_reports ENABLE ROW LEVEL SECURITY;

-- Helper: Check if user is a member of a ministry
CREATE OR REPLACE FUNCTION public.is_ministry_member(p_ministry_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.ministry_members mm
        JOIN public.profiles p ON p.id = mm.profile_id
        WHERE mm.ministry_id = p_ministry_id
        AND p.user_id = auth.uid()
        AND mm.is_active = TRUE
    );
$$;

-- Helper: Check if user is leader/admin of a ministry's church
CREATE OR REPLACE FUNCTION public.can_manage_ministry(p_ministry_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.ministries m
        JOIN public.user_church_roles r ON r.church_id = m.church_id
        WHERE m.id = p_ministry_id
        AND r.user_id = auth.uid()
        AND r.role IN ('owner', 'admin', 'pastor')
        AND r.is_active = TRUE
    );
$$;

-- RLS: Ministry members + church admins can view ministry data
CREATE POLICY "Ministry members can view tasks" ON public.ministry_tasks
    FOR SELECT USING (public.is_ministry_member(ministry_id) OR public.can_manage_ministry(ministry_id));
CREATE POLICY "Leaders can manage tasks" ON public.ministry_tasks
    FOR ALL USING (public.can_manage_ministry(ministry_id) OR 
        EXISTS (SELECT 1 FROM public.ministry_members WHERE ministry_id = ministry_tasks.ministry_id AND profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND role IN ('leader', 'admin')));

CREATE POLICY "Members can view volunteer slots" ON public.ministry_volunteer_slots
    FOR SELECT USING (public.is_ministry_member(ministry_id) OR public.can_manage_ministry(ministry_id));
CREATE POLICY "Leaders manage volunteer slots" ON public.ministry_volunteer_slots
    FOR ALL USING (public.can_manage_ministry(ministry_id));

CREATE POLICY "Ministry members view care visits" ON public.deacon_care_visits
    FOR SELECT USING (public.is_ministry_member(ministry_id) OR public.can_manage_ministry(ministry_id));
CREATE POLICY "Leaders manage care visits" ON public.deacon_care_visits
    FOR ALL USING (public.can_manage_ministry(ministry_id));

CREATE POLICY "Ministry members view benevolence" ON public.deacon_benevolence_requests
    FOR SELECT USING (public.is_ministry_member(ministry_id) OR public.can_manage_ministry(ministry_id));
CREATE POLICY "Leaders manage benevolence" ON public.deacon_benevolence_requests
    FOR ALL USING (public.can_manage_ministry(ministry_id));

CREATE POLICY "Ministry members view prayer assignments" ON public.deacon_prayer_assignments
    FOR SELECT USING (public.is_ministry_member(ministry_id) OR public.can_manage_ministry(ministry_id));
CREATE POLICY "Leaders manage prayer assignments" ON public.deacon_prayer_assignments
    FOR ALL USING (public.can_manage_ministry(ministry_id));

CREATE POLICY "Ministry members view meals" ON public.deacon_meal_coordination
    FOR SELECT USING (public.is_ministry_member(ministry_id) OR public.can_manage_ministry(ministry_id));
CREATE POLICY "Leaders manage meals" ON public.deacon_meal_coordination
    FOR ALL USING (public.can_manage_ministry(ministry_id));

CREATE POLICY "Ministry members view service schedule" ON public.deacon_service_schedule
    FOR SELECT USING (public.is_ministry_member(ministry_id) OR public.can_manage_ministry(ministry_id));
CREATE POLICY "Leaders manage service schedule" ON public.deacon_service_schedule
    FOR ALL USING (public.can_manage_ministry(ministry_id));

CREATE POLICY "Worship team view schedules" ON public.worship_schedules
    FOR SELECT USING (public.is_ministry_member(ministry_id) OR public.can_manage_ministry(ministry_id));
CREATE POLICY "Leaders manage worship schedules" ON public.worship_schedules
    FOR ALL USING (public.can_manage_ministry(ministry_id));

CREATE POLICY "Worship team view rehearsals" ON public.worship_rehearsals
    FOR SELECT USING (public.is_ministry_member(ministry_id) OR public.can_manage_ministry(ministry_id));
CREATE POLICY "Leaders manage rehearsals" ON public.worship_rehearsals
    FOR ALL USING (public.can_manage_ministry(ministry_id));

CREATE POLICY "Worship team manage availability" ON public.worship_availability
    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = worship_availability.profile_id AND user_id = auth.uid()) OR public.can_manage_ministry(ministry_id));

CREATE POLICY "Worship team view service plans" ON public.worship_service_plans
    FOR SELECT USING (public.is_ministry_member(ministry_id) OR public.can_manage_ministry(ministry_id));
CREATE POLICY "Leaders manage service plans" ON public.worship_service_plans
    FOR ALL USING (public.can_manage_ministry(ministry_id));

CREATE POLICY "Children's ministry view classrooms" ON public.childrens_classrooms
    FOR SELECT USING (public.is_ministry_member(ministry_id) OR public.can_manage_ministry(ministry_id));
CREATE POLICY "Leaders manage classrooms" ON public.childrens_classrooms
    FOR ALL USING (public.can_manage_ministry(ministry_id));

CREATE POLICY "Children's ministry view assignments" ON public.childrens_classroom_assignments
    FOR SELECT USING (public.is_ministry_member((SELECT ministry_id FROM public.childrens_classrooms WHERE id = classroom_id)) OR public.can_manage_ministry((SELECT ministry_id FROM public.childrens_classrooms WHERE id = classroom_id)));
CREATE POLICY "Leaders manage assignments" ON public.childrens_classroom_assignments
    FOR ALL USING (public.can_manage_ministry((SELECT ministry_id FROM public.childrens_classrooms WHERE id = classroom_id)));

CREATE POLICY "Staff manage check-ins" ON public.childrens_check_ins
    FOR ALL USING (public.user_belongs_to_church(church_id));

CREATE POLICY "Children's ministry view lessons" ON public.childrens_lessons
    FOR SELECT USING (public.is_ministry_member(ministry_id) OR public.can_manage_ministry(ministry_id));
CREATE POLICY "Leaders manage lessons" ON public.childrens_lessons
    FOR ALL USING (public.can_manage_ministry(ministry_id));

CREATE POLICY "Staff view incidents" ON public.childrens_incident_reports
    FOR SELECT USING (public.is_ministry_member(ministry_id) OR public.can_manage_ministry(ministry_id));
CREATE POLICY "Leaders manage incidents" ON public.childrens_incident_reports
    FOR ALL USING (public.can_manage_ministry(ministry_id));
