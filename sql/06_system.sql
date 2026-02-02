-- ============================================
-- 06_system.sql
-- System & Platform Tables
-- ============================================

-- ============================================
-- AUDIT LOGS
-- ============================================

CREATE TYPE audit_action AS ENUM (
    'create', 'read', 'update', 'delete',
    'login', 'logout', 'signup',
    'join', 'leave', 'invite',
    'approve', 'reject', 'suspend',
    'export', 'import', 'other'
);

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Actor
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    church_id UUID REFERENCES public.churches(id) ON DELETE SET NULL,
    
    -- Action details
    action audit_action NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    
    -- Change data
    old_data JSONB,
    new_data JSONB,
    description TEXT,
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    request_id TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partition audit_logs by month for better performance
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_church ON public.audit_logs(church_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- Function to create audit log
CREATE OR REPLACE FUNCTION public.create_audit_log(
    p_user_id UUID,
    p_church_id UUID,
    p_action audit_action,
    p_entity_type TEXT,
    p_entity_id UUID DEFAULT NULL,
    p_old_data JSONB DEFAULT NULL,
    p_new_data JSONB DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        user_id, church_id, action, entity_type, entity_id,
        old_data, new_data, description
    )
    VALUES (
        p_user_id, p_church_id, p_action, p_entity_type, p_entity_id,
        p_old_data, p_new_data, p_description
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- ============================================
-- TENANT SETTINGS
-- ============================================

CREATE TABLE public.tenant_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    
    -- Setting key-value
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    
    -- Metadata
    description TEXT,
    is_secret BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique key per church
    UNIQUE(church_id, key)
);

CREATE INDEX idx_tenant_settings_church ON public.tenant_settings(church_id);
CREATE INDEX idx_tenant_settings_key ON public.tenant_settings(key);

-- Function to get tenant setting
CREATE OR REPLACE FUNCTION public.get_tenant_setting(
    p_church_id UUID,
    p_key TEXT,
    p_default JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_value JSONB;
BEGIN
    SELECT value INTO v_value
    FROM public.tenant_settings
    WHERE church_id = p_church_id AND key = p_key;
    
    RETURN COALESCE(v_value, p_default);
END;
$$;

-- Function to set tenant setting
CREATE OR REPLACE FUNCTION public.set_tenant_setting(
    p_church_id UUID,
    p_key TEXT,
    p_value JSONB,
    p_description TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.tenant_settings (church_id, key, value, description)
    VALUES (p_church_id, p_key, p_value, p_description)
    ON CONFLICT (church_id, key)
    DO UPDATE SET value = p_value, updated_at = NOW();
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_tenant_settings_updated_at
    BEFORE UPDATE ON public.tenant_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- SYSTEM NOTIFICATIONS
-- ============================================

CREATE TYPE notification_type AS ENUM (
    'info', 'success', 'warning', 'error',
    'invitation', 'reminder', 'announcement',
    'message', 'prayer', 'event', 'other'
);

CREATE TABLE public.system_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Recipient
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
    
    -- Content
    type notification_type DEFAULT 'info',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    action_label TEXT,
    
    -- Related entity
    related_entity_type TEXT,
    related_entity_id UUID,
    
    -- Status
    read_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    
    -- Scheduling
    scheduled_for TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.system_notifications(user_id);
CREATE INDEX idx_notifications_church ON public.system_notifications(church_id);
CREATE INDEX idx_notifications_read ON public.system_notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_created ON public.system_notifications(created_at DESC);

-- Function to send notification
CREATE OR REPLACE FUNCTION public.send_notification(
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type notification_type DEFAULT 'info',
    p_church_id UUID DEFAULT NULL,
    p_action_url TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.system_notifications (
        user_id, church_id, type, title, message, action_url, metadata
    )
    VALUES (
        p_user_id, p_church_id, p_type, p_title, p_message, p_action_url, p_metadata
    )
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.system_notifications
    SET read_at = NOW()
    WHERE id = p_notification_id AND user_id = p_user_id AND read_at IS NULL;
END;
$$;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id UUID, p_church_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.system_notifications
    SET read_at = NOW()
    WHERE user_id = p_user_id
    AND read_at IS NULL
    AND (p_church_id IS NULL OR church_id = p_church_id);
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- ============================================
-- FEATURE FLAGS
-- ============================================

CREATE TABLE public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Flag identification
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    
    -- Status
    is_enabled BOOLEAN DEFAULT FALSE,
    
    -- Targeting
    target_churches UUID[],
    target_plans subscription_plan[],
    rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feature_flags_name ON public.feature_flags(name);
CREATE INDEX idx_feature_flags_enabled ON public.feature_flags(is_enabled);

-- Function to check if feature is enabled for a church
CREATE OR REPLACE FUNCTION public.is_feature_enabled(
    p_feature_name TEXT,
    p_church_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_flag RECORD;
    v_church_plan subscription_plan;
BEGIN
    SELECT * INTO v_flag FROM public.feature_flags WHERE name = p_feature_name;
    
    IF v_flag IS NULL OR NOT v_flag.is_enabled THEN
        RETURN FALSE;
    END IF;
    
    -- Check if globally enabled
    IF v_flag.target_churches IS NULL AND v_flag.target_plans IS NULL AND v_flag.rollout_percentage = 100 THEN
        RETURN TRUE;
    END IF;
    
    -- Check church-specific targeting
    IF p_church_id IS NOT NULL THEN
        -- Check if church is in target list
        IF v_flag.target_churches IS NOT NULL AND p_church_id = ANY(v_flag.target_churches) THEN
            RETURN TRUE;
        END IF;
        
        -- Check plan targeting
        IF v_flag.target_plans IS NOT NULL THEN
            SELECT subscription_plan INTO v_church_plan FROM public.churches WHERE id = p_church_id;
            IF v_church_plan = ANY(v_flag.target_plans) THEN
                RETURN TRUE;
            END IF;
        END IF;
        
        -- Check rollout percentage
        IF v_flag.rollout_percentage > 0 THEN
            RETURN (abs(hashtext(p_church_id::text)) % 100) < v_flag.rollout_percentage;
        END IF;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_feature_flags_updated_at
    BEFORE UPDATE ON public.feature_flags
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- GLOBAL SYSTEM SETTINGS
-- ============================================

CREATE TABLE public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_settings_key ON public.system_settings(key);

-- Function to get system setting
CREATE OR REPLACE FUNCTION public.get_system_setting(p_key TEXT, p_default JSONB DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_value JSONB;
BEGIN
    SELECT value INTO v_value FROM public.system_settings WHERE key = p_key;
    RETURN COALESCE(v_value, p_default);
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- USAGE METRICS
-- ============================================

CREATE TABLE public.usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    
    -- Metric info
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    
    -- Period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_metrics_church ON public.usage_metrics(church_id);
CREATE INDEX idx_usage_metrics_name ON public.usage_metrics(metric_name);
CREATE INDEX idx_usage_metrics_period ON public.usage_metrics(period_start, period_end);
