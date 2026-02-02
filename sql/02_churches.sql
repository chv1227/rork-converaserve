-- ============================================
-- 02_churches.sql
-- Church Organizations (Tenant Table)
-- ============================================

-- Create enum for church status
CREATE TYPE church_status AS ENUM ('active', 'inactive', 'suspended', 'archived', 'pending');

-- Create enum for subscription plans
CREATE TYPE subscription_plan AS ENUM ('free', 'basic', 'standard', 'premium', 'enterprise');

-- Churches table (multi-tenant core)
CREATE TABLE public.churches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    description TEXT,
    status church_status DEFAULT 'pending',
    denomination TEXT,
    
    -- Address fields
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'US',
    
    -- Contact info
    contact_email TEXT,
    contact_phone TEXT,
    website TEXT,
    
    -- Subscription & billing
    subscription_plan subscription_plan DEFAULT 'free',
    subscription_expires_at TIMESTAMPTZ,
    
    -- Ownership
    owner_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    -- Metadata
    logo_url TEXT,
    banner_url TEXT,
    timezone TEXT DEFAULT 'America/New_York',
    settings JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for churches
CREATE INDEX idx_churches_status ON public.churches(status);
CREATE INDEX idx_churches_owner ON public.churches(owner_user_id);
CREATE INDEX idx_churches_slug ON public.churches(slug);
CREATE INDEX idx_churches_deleted_at ON public.churches(deleted_at) WHERE deleted_at IS NULL;

-- Function to generate unique slug
CREATE OR REPLACE FUNCTION public.generate_church_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    base_slug TEXT;
    new_slug TEXT;
    counter INTEGER := 0;
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        base_slug := LOWER(REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
        base_slug := TRIM(BOTH '-' FROM base_slug);
        new_slug := base_slug;
        
        WHILE EXISTS (SELECT 1 FROM public.churches WHERE slug = new_slug AND id != NEW.id) LOOP
            counter := counter + 1;
            new_slug := base_slug || '-' || counter;
        END LOOP;
        
        NEW.slug := new_slug;
    END IF;
    RETURN NEW;
END;
$$;

-- Trigger to auto-generate slug
CREATE TRIGGER generate_church_slug_trigger
    BEFORE INSERT OR UPDATE ON public.churches
    FOR EACH ROW EXECUTE FUNCTION public.generate_church_slug();

-- Trigger for updated_at on churches
CREATE TRIGGER update_churches_updated_at
    BEFORE UPDATE ON public.churches
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
