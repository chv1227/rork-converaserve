-- =====================================================
-- SUPABASE SETUP SCRIPT FOR CHURCH APP
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- =====================================================

-- =====================================================
-- 1. ORGANIZATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  logo TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  code TEXT UNIQUE,
  member_count INTEGER DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Anyone can view organizations" ON organizations
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create organizations" ON organizations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Organization admins can update" ON organizations
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships
      WHERE organization_memberships.organization_id = organizations.id
      AND organization_memberships.user_id = auth.uid()
      AND organization_memberships.role IN ('super_admin', 'organization_admin')
      AND organization_memberships.status = 'approved'
    )
  );

-- =====================================================
-- 2. ORGANIZATION MEMBERSHIPS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'leader', 'organization_admin', 'super_admin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  message TEXT,
  user_name TEXT,
  user_email TEXT,
  user_avatar TEXT,
  UNIQUE(organization_id, user_id)
);

-- Enable RLS
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;

-- Memberships policies
CREATE POLICY "Users can view their own memberships" ON organization_memberships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all org memberships" ON organization_memberships
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      WHERE om.organization_id = organization_memberships.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('super_admin', 'organization_admin')
      AND om.status = 'approved'
    )
  );

CREATE POLICY "Users can request to join" ON organization_memberships
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update memberships" ON organization_memberships
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      WHERE om.organization_id = organization_memberships.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('super_admin', 'organization_admin')
      AND om.status = 'approved'
    )
  );

CREATE POLICY "Admins can delete memberships" ON organization_memberships
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      WHERE om.organization_id = organization_memberships.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('super_admin', 'organization_admin')
      AND om.status = 'approved'
    )
  );

-- =====================================================
-- 3. CHURCHES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS churches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  denomination TEXT,
  description TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  country TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  website TEXT,
  logo TEXT,
  banner_image TEXT,
  social_links JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;

-- Churches policies
CREATE POLICY "Anyone can view public churches" ON churches
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create churches" ON churches
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Church admins can update" ON churches
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM church_memberships
      WHERE church_memberships.church_id = churches.id
      AND church_memberships.user_id = auth.uid()
      AND church_memberships.role IN ('super_admin', 'admin')
      AND church_memberships.is_active = true
    )
  );

CREATE POLICY "Church super admins can delete" ON churches
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM church_memberships
      WHERE church_memberships.church_id = churches.id
      AND church_memberships.user_id = auth.uid()
      AND church_memberships.role = 'super_admin'
      AND church_memberships.is_active = true
    )
  );

-- =====================================================
-- 4. CHURCH SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS church_settings (
  id TEXT PRIMARY KEY,
  church_id TEXT REFERENCES churches(id) ON DELETE CASCADE UNIQUE,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  modules_enabled JSONB DEFAULT '{"events": true, "announcements": true, "donations": true, "media": true, "ministries": true, "messaging": true}'::jsonb,
  notification_preferences JSONB DEFAULT '{"newMembers": true, "events": true, "announcements": true, "donations": true}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE church_settings ENABLE ROW LEVEL SECURITY;

-- Church settings policies
CREATE POLICY "Anyone can view church settings" ON church_settings
  FOR SELECT USING (true);

CREATE POLICY "Church admins can insert settings" ON church_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM church_memberships
      WHERE church_memberships.church_id = church_settings.church_id
      AND church_memberships.user_id = auth.uid()
      AND church_memberships.role IN ('super_admin', 'admin')
      AND church_memberships.is_active = true
    )
  );

CREATE POLICY "Church admins can update settings" ON church_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM church_memberships
      WHERE church_memberships.church_id = church_settings.church_id
      AND church_memberships.user_id = auth.uid()
      AND church_memberships.role IN ('super_admin', 'admin')
      AND church_memberships.is_active = true
    )
  );

CREATE POLICY "Church admins can delete settings" ON church_settings
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM church_memberships
      WHERE church_memberships.church_id = church_settings.church_id
      AND church_memberships.user_id = auth.uid()
      AND church_memberships.role = 'super_admin'
      AND church_memberships.is_active = true
    )
  );

-- =====================================================
-- 5. CHURCH MEMBERSHIPS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS church_memberships (
  id TEXT PRIMARY KEY,
  church_id TEXT REFERENCES churches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'leader', 'admin', 'super_admin')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(church_id, user_id)
);

-- Enable RLS
ALTER TABLE church_memberships ENABLE ROW LEVEL SECURITY;

-- Church memberships policies
CREATE POLICY "Users can view their own church memberships" ON church_memberships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Church members can view other members" ON church_memberships
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM church_memberships cm
      WHERE cm.church_id = church_memberships.church_id
      AND cm.user_id = auth.uid()
      AND cm.is_active = true
    )
  );

CREATE POLICY "Users can join churches" ON church_memberships
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Church admins can insert memberships" ON church_memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM church_memberships cm
      WHERE cm.church_id = church_memberships.church_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('super_admin', 'admin')
      AND cm.is_active = true
    )
  );

CREATE POLICY "Users can update their own membership" ON church_memberships
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Church admins can update memberships" ON church_memberships
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM church_memberships cm
      WHERE cm.church_id = church_memberships.church_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('super_admin', 'admin')
      AND cm.is_active = true
    )
  );

CREATE POLICY "Church admins can delete memberships" ON church_memberships
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM church_memberships cm
      WHERE cm.church_id = church_memberships.church_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('super_admin', 'admin')
      AND cm.is_active = true
    )
  );

-- =====================================================
-- 6. RPC FUNCTION FOR CREATING ORGANIZATION WITH ADMIN
-- This bypasses RLS for the initial creation
-- =====================================================
CREATE OR REPLACE FUNCTION create_organization_with_admin(
  org_name TEXT,
  org_description TEXT,
  org_logo TEXT,
  org_address TEXT DEFAULT '',
  org_phone TEXT DEFAULT '',
  org_email TEXT DEFAULT '',
  org_website TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  new_membership_id UUID;
  current_user_id UUID;
BEGIN
  -- Get the current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Create the organization
  INSERT INTO organizations (name, description, logo, address, phone, email, website, member_count, created_by, created_at, updated_at)
  VALUES (org_name, org_description, org_logo, org_address, org_phone, org_email, org_website, 1, current_user_id, NOW(), NOW())
  RETURNING id INTO new_org_id;

  -- Create the membership with super_admin role
  INSERT INTO organization_memberships (organization_id, user_id, role, status, joined_at)
  VALUES (new_org_id, current_user_id, 'super_admin', 'approved', NOW())
  RETURNING id INTO new_membership_id;

  RETURN json_build_object(
    'org_id', new_org_id,
    'membership_id', new_membership_id
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_organization_with_admin TO authenticated;

-- =====================================================
-- 7. INDEXES FOR BETTER PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_organization_memberships_user_id ON organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_memberships_org_id ON organization_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_memberships_status ON organization_memberships(status);

CREATE INDEX IF NOT EXISTS idx_church_memberships_user_id ON church_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_church_memberships_church_id ON church_memberships(church_id);
CREATE INDEX IF NOT EXISTS idx_church_memberships_is_active ON church_memberships(is_active);

CREATE INDEX IF NOT EXISTS idx_churches_created_by ON churches(created_by);
CREATE INDEX IF NOT EXISTS idx_church_settings_church_id ON church_settings(church_id);

-- =====================================================
-- DONE! All tables and policies are now created.
-- =====================================================
