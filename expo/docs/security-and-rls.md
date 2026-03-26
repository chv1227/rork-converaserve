# Security & Row Level Security

## Overview

This document covers the security architecture including Row Level Security (RLS) policies, helper functions, and access control patterns.

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        REQUEST FLOW                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Client Request                                                     │
│        │                                                             │
│        ▼                                                             │
│   ┌─────────────────┐                                               │
│   │  Supabase Auth  │  ◀── JWT Token Validation                     │
│   └────────┬────────┘                                               │
│            │                                                         │
│            ▼                                                         │
│   ┌─────────────────┐                                               │
│   │   auth.uid()    │  ◀── Current User ID                          │
│   └────────┬────────┘                                               │
│            │                                                         │
│            ▼                                                         │
│   ┌─────────────────┐                                               │
│   │   RLS Policies  │  ◀── Row-level access checks                  │
│   └────────┬────────┘                                               │
│            │                                                         │
│            ▼                                                         │
│   ┌─────────────────┐                                               │
│   │  Helper Funcs   │  ◀── user_belongs_to_church(), etc.          │
│   └────────┬────────┘                                               │
│            │                                                         │
│            ▼                                                         │
│       Data Access                                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Helper Functions

### Get User's Church IDs
```sql
CREATE OR REPLACE FUNCTION public.get_user_church_ids()
RETURNS UUID[]
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
    SELECT ARRAY_AGG(church_id)
    FROM public.user_church_roles
    WHERE user_id = auth.uid() AND is_active = TRUE;
$$;
```

### Check Church Membership
```sql
CREATE OR REPLACE FUNCTION public.user_belongs_to_church(p_church_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_church_roles
        WHERE user_id = auth.uid()
        AND church_id = p_church_id
        AND is_active = TRUE
    );
$$;
```

### Check Admin Status
```sql
CREATE OR REPLACE FUNCTION public.user_is_admin_of_church(p_church_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_church_roles
        WHERE user_id = auth.uid()
        AND church_id = p_church_id
        AND role IN ('owner', 'admin')
        AND is_active = TRUE
    );
$$;
```

### Check Staff or Higher
```sql
CREATE OR REPLACE FUNCTION public.user_is_staff_or_higher(p_church_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_church_roles
        WHERE user_id = auth.uid()
        AND church_id = p_church_id
        AND role IN ('owner', 'admin', 'pastor', 'staff')
        AND is_active = TRUE
    );
$$;
```

---

## RLS Policy Patterns

### Pattern 1: Tenant Isolation (Most Common)

Used for most church data tables.

```sql
-- View: Only members of the church
CREATE POLICY "View [table]"
    ON public.[table] FOR SELECT
    USING (public.user_belongs_to_church(church_id));

-- Create: Staff or higher
CREATE POLICY "Create [table]"
    ON public.[table] FOR INSERT
    WITH CHECK (public.user_is_staff_or_higher(church_id));

-- Update: Staff or higher
CREATE POLICY "Update [table]"
    ON public.[table] FOR UPDATE
    USING (public.user_is_staff_or_higher(church_id));

-- Delete: Admins only
CREATE POLICY "Delete [table]"
    ON public.[table] FOR DELETE
    USING (public.user_is_admin_of_church(church_id));
```

### Pattern 2: Self-Service with Admin Override

Used for profiles and user-created content.

```sql
-- Users can manage their own, admins can manage all
CREATE POLICY "Manage own or admin"
    ON public.[table] FOR ALL
    USING (
        user_id = auth.uid()
        OR public.user_is_admin_of_church(church_id)
    );
```

### Pattern 3: Join Tables

Used for many-to-many relationships.

```sql
-- View through parent
CREATE POLICY "View through parent"
    ON public.ministry_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ministries m
            WHERE m.id = ministry_id
            AND public.user_belongs_to_church(m.church_id)
        )
    );

-- Self-join
CREATE POLICY "Join self"
    ON public.ministry_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_id AND p.user_id = auth.uid()
        )
    );
```

### Pattern 4: Visibility Levels

Used for content with privacy settings.

```sql
-- Conditional visibility
CREATE POLICY "View based on visibility"
    ON public.internal_notes FOR SELECT
    USING (
        public.user_belongs_to_church(church_id)
        AND (
            visibility = 'public'
            OR (visibility = 'staff' AND public.user_is_staff_or_higher(church_id))
            OR (visibility = 'leadership' AND public.user_is_admin_of_church(church_id))
            OR (visibility = 'private' AND created_by_profile_id IN (
                SELECT id FROM public.profiles WHERE user_id = auth.uid()
            ))
        )
    );
```

---

## Role-Based Access Summary

| Resource | Guest | Member | Volunteer | Staff | Pastor | Admin | Owner |
|----------|-------|--------|-----------|-------|--------|-------|-------|
| View church info | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Update church | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| View profiles | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Update own profile | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Update any profile | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| View events | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create events | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ |
| View ministries | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Manage ministries | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ |
| View internal notes | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ |
| View audit logs | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| Manage settings | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| Manage roles | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |

---

## Security Best Practices

### 1. Always Use RLS
```sql
-- Enable RLS on every table
ALTER TABLE public.my_table ENABLE ROW LEVEL SECURITY;
```

### 2. Use SECURITY DEFINER Carefully
```sql
-- Functions that bypass RLS should be SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.my_function()
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with creator's permissions
SET search_path = public  -- Prevent search_path attacks
AS $$ ... $$;
```

### 3. Validate Church Context
```typescript
// Always include church_id in queries
const { data } = await supabase
  .from('events')
  .select('*')
  .eq('church_id', currentChurchId); // Explicit filter
```

### 4. Use Service Role Sparingly
```typescript
// Only use service role for admin operations
const adminClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Regular client for user operations
const userClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
```

---

## Audit Logging

### Automatic Audit Function
```sql
SELECT public.create_audit_log(
    auth.uid(),           -- user_id
    'church-uuid',        -- church_id
    'create',             -- action
    'events',             -- entity_type
    'event-uuid',         -- entity_id
    NULL,                 -- old_data
    '{"title": "..."}'::jsonb,  -- new_data
    'Created new event'   -- description
);
```

### Audit Log Policies
- Users can view their own global audit logs
- Church admins can view their church's audit logs
- Audit logs are insert-only (no updates or deletes via RLS)

---

## Testing RLS Policies

### Test as Specific User
```sql
-- Set the JWT claims for testing
SET request.jwt.claims = '{"sub": "user-uuid"}';

-- Now queries will use this user's permissions
SELECT * FROM public.events;
```

### Verify Policy Coverage
```sql
-- Check which policies exist on a table
SELECT * FROM pg_policies WHERE tablename = 'events';
```

### Test Function Results
```sql
-- Test helper functions
SELECT public.user_belongs_to_church('church-uuid');
SELECT public.user_is_admin_of_church('church-uuid');
SELECT public.get_user_church_ids();
```
