-- ============================================
-- 05_church_data.sql
-- Internal Church Data (Tenant-Scoped)
-- ============================================

-- ============================================
-- MINISTRIES / GROUPS
-- ============================================

CREATE TYPE ministry_status AS ENUM ('active', 'inactive', 'archived');

CREATE TABLE public.ministries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    ministry_type TEXT,
    status ministry_status DEFAULT 'active',
    
    -- Leadership
    leader_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Display
    color TEXT,
    icon TEXT,
    image_url TEXT,
    
    -- Settings
    is_public BOOLEAN DEFAULT TRUE,
    requires_approval BOOLEAN DEFAULT FALSE,
    max_members INTEGER,
    
    -- Contact
    contact_email TEXT,
    meeting_location TEXT,
    meeting_schedule TEXT,
    
    -- Metadata
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES public.profiles(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ministries_church ON public.ministries(church_id);
CREATE INDEX idx_ministries_leader ON public.ministries(leader_profile_id);
CREATE INDEX idx_ministries_status ON public.ministries(status);

-- Ministry Members (join table)
CREATE TABLE public.ministry_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ministry_id, profile_id)
);

CREATE INDEX idx_ministry_members_ministry ON public.ministry_members(ministry_id);
CREATE INDEX idx_ministry_members_profile ON public.ministry_members(profile_id);

-- ============================================
-- EVENTS
-- ============================================

CREATE TYPE event_status AS ENUM ('draft', 'published', 'cancelled', 'completed');
CREATE TYPE event_type AS ENUM ('service', 'meeting', 'class', 'social', 'outreach', 'conference', 'other');

CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    ministry_id UUID REFERENCES public.ministries(id) ON DELETE SET NULL,
    
    -- Basic info
    title TEXT NOT NULL,
    description TEXT,
    event_type event_type DEFAULT 'other',
    status event_status DEFAULT 'draft',
    
    -- Timing
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ,
    all_day BOOLEAN DEFAULT FALSE,
    timezone TEXT,
    
    -- Recurrence
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule TEXT,
    recurrence_end_date DATE,
    parent_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    
    -- Location
    location_name TEXT,
    location_address TEXT,
    is_online BOOLEAN DEFAULT FALSE,
    online_url TEXT,
    
    -- Registration
    requires_registration BOOLEAN DEFAULT FALSE,
    max_attendees INTEGER,
    registration_deadline TIMESTAMPTZ,
    
    -- Display
    image_url TEXT,
    color TEXT,
    
    -- Metadata
    settings JSONB DEFAULT '{}',
    created_by_profile_id UUID REFERENCES public.profiles(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_church ON public.events(church_id);
CREATE INDEX idx_events_ministry ON public.events(ministry_id);
CREATE INDEX idx_events_start ON public.events(start_datetime);
CREATE INDEX idx_events_status ON public.events(status);

-- Event Registrations
CREATE TABLE public.event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'registered',
    guest_count INTEGER DEFAULT 0,
    notes TEXT,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, profile_id)
);

CREATE INDEX idx_event_registrations_event ON public.event_registrations(event_id);
CREATE INDEX idx_event_registrations_profile ON public.event_registrations(profile_id);

-- ============================================
-- ATTENDANCE
-- ============================================

CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');

CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Status
    status attendance_status DEFAULT 'present',
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    
    -- For non-event attendance (e.g., general service)
    attendance_date DATE,
    service_type TEXT,
    
    -- Metadata
    notes TEXT,
    checked_in_by UUID REFERENCES public.profiles(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attendance_church ON public.attendance(church_id);
CREATE INDEX idx_attendance_event ON public.attendance(event_id);
CREATE INDEX idx_attendance_profile ON public.attendance(profile_id);
CREATE INDEX idx_attendance_date ON public.attendance(attendance_date);

-- ============================================
-- INTERNAL NOTES
-- ============================================

CREATE TYPE note_visibility AS ENUM ('private', 'staff', 'leadership', 'public');

CREATE TABLE public.internal_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    
    -- Related entity (polymorphic)
    related_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    related_ministry_id UUID REFERENCES public.ministries(id) ON DELETE CASCADE,
    related_event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    
    -- Content
    title TEXT,
    content TEXT NOT NULL,
    note_type TEXT,
    visibility note_visibility DEFAULT 'staff',
    
    -- Flags
    is_sensitive BOOLEAN DEFAULT FALSE,
    is_follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    
    -- Authorship
    created_by_profile_id UUID REFERENCES public.profiles(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_internal_notes_church ON public.internal_notes(church_id);
CREATE INDEX idx_internal_notes_profile ON public.internal_notes(related_profile_id);
CREATE INDEX idx_internal_notes_visibility ON public.internal_notes(visibility);

-- ============================================
-- DOCUMENTS / FILES (Metadata Only)
-- ============================================

CREATE TYPE document_type AS ENUM ('document', 'image', 'video', 'audio', 'other');

CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    
    -- File info
    name TEXT NOT NULL,
    description TEXT,
    document_type document_type DEFAULT 'document',
    mime_type TEXT,
    file_size BIGINT,
    file_url TEXT NOT NULL,
    
    -- Organization
    folder_path TEXT DEFAULT '/',
    tags TEXT[],
    
    -- Related entity
    related_ministry_id UUID REFERENCES public.ministries(id) ON DELETE SET NULL,
    related_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    
    -- Access control
    is_public BOOLEAN DEFAULT FALSE,
    allowed_roles church_role[],
    
    -- Metadata
    uploaded_by_profile_id UUID REFERENCES public.profiles(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_church ON public.documents(church_id);
CREATE INDEX idx_documents_folder ON public.documents(folder_path);
CREATE INDEX idx_documents_type ON public.documents(document_type);

-- ============================================
-- ANNOUNCEMENTS
-- ============================================

CREATE TYPE announcement_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE announcement_priority AS ENUM ('low', 'normal', 'high', 'urgent');

CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    ministry_id UUID REFERENCES public.ministries(id) ON DELETE SET NULL,
    
    -- Content
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    image_url TEXT,
    
    -- Status & Priority
    status announcement_status DEFAULT 'draft',
    priority announcement_priority DEFAULT 'normal',
    
    -- Scheduling
    publish_at TIMESTAMPTZ,
    expire_at TIMESTAMPTZ,
    
    -- Targeting
    target_roles church_role[],
    target_ministries UUID[],
    
    -- Flags
    is_pinned BOOLEAN DEFAULT FALSE,
    allow_comments BOOLEAN DEFAULT TRUE,
    
    -- Authorship
    created_by_profile_id UUID REFERENCES public.profiles(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_announcements_church ON public.announcements(church_id);
CREATE INDEX idx_announcements_status ON public.announcements(status);
CREATE INDEX idx_announcements_publish ON public.announcements(publish_at);

-- ============================================
-- PRAYER REQUESTS
-- ============================================

CREATE TYPE prayer_request_status AS ENUM ('active', 'answered', 'archived');

CREATE TABLE public.prayer_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Content
    title TEXT,
    content TEXT NOT NULL,
    status prayer_request_status DEFAULT 'active',
    
    -- Privacy
    is_anonymous BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT TRUE,
    
    -- Response
    answer_testimony TEXT,
    answered_at TIMESTAMPTZ,
    
    -- Stats
    prayer_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prayer_requests_church ON public.prayer_requests(church_id);
CREATE INDEX idx_prayer_requests_profile ON public.prayer_requests(profile_id);
CREATE INDEX idx_prayer_requests_status ON public.prayer_requests(status);

-- Prayer interactions
CREATE TABLE public.prayer_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prayer_request_id UUID NOT NULL REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    prayed_at TIMESTAMPTZ DEFAULT NOW(),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(prayer_request_id, profile_id)
);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE TRIGGER update_ministries_updated_at
    BEFORE UPDATE ON public.ministries
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_internal_notes_updated_at
    BEFORE UPDATE ON public.internal_notes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at
    BEFORE UPDATE ON public.announcements
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prayer_requests_updated_at
    BEFORE UPDATE ON public.prayer_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
