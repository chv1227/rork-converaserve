# Profile System

## Overview

The profile system provides extensible, church-scoped user profiles. Each user has a separate profile for each church they belong to, allowing different information per context.

---

## Architecture

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │ (1-to-Many)
       ▼
┌─────────────────────────────────────────────────────────────────┐
│                        profiles (Base)                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ id | user_id | church_id | profile_type | display_name  │    │
│  └─────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────┘
                             │ (1-to-1)
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ admin_profiles  │ │ staff_profiles  │ │ member_profiles │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                                        ┌─────────────────┐
                                        │volunteer_profiles│
                                        └─────────────────┘
```

---

## Base Profile Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique identifier |
| `user_id` | UUID (FK) | References users.id |
| `church_id` | UUID (FK) | References churches.id |
| `profile_type` | profile_type | admin, pastor, staff, volunteer, member |
| `display_name` | TEXT | Display name in this church |
| `bio` | TEXT | Profile biography |
| `phone` | TEXT | Contact phone |
| `avatar_url` | TEXT | Profile picture |
| `secondary_email` | TEXT | Alternate email |
| `address_line1` | TEXT | Street address |
| `address_line2` | TEXT | Suite/Unit |
| `city` | TEXT | City |
| `state` | TEXT | State/Province |
| `postal_code` | TEXT | ZIP/Postal code |
| `date_of_birth` | DATE | Birth date |
| `gender` | TEXT | Gender |
| `marital_status` | TEXT | Marital status |
| `emergency_contact_name` | TEXT | Emergency contact |
| `emergency_contact_phone` | TEXT | Emergency phone |
| `emergency_contact_relation` | TEXT | Relationship |
| `custom_fields` | JSONB | Extensible custom data |
| `is_public` | BOOLEAN | Profile visibility |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last update |

**Constraint:** `UNIQUE(user_id, church_id)` - One profile per user per church

---

## Profile Type Extensions

### Admin Profile

| Column | Type | Description |
|--------|------|-------------|
| `profile_id` | UUID (PK, FK) | References profiles.id |
| `admin_level` | INTEGER | Admin privilege level |
| `can_manage_billing` | BOOLEAN | Billing access |
| `can_manage_users` | BOOLEAN | User management access |
| `can_manage_content` | BOOLEAN | Content management access |
| `system_notes` | TEXT | Admin notes |

### Staff Profile

| Column | Type | Description |
|--------|------|-------------|
| `profile_id` | UUID (PK, FK) | References profiles.id |
| `title` | TEXT | Job title |
| `department` | TEXT | Department name |
| `employment_status` | TEXT | full-time, part-time, contract |
| `hire_date` | DATE | Employment start date |
| `supervisor_profile_id` | UUID (FK) | Supervisor's profile |
| `office_location` | TEXT | Office location |
| `office_hours` | TEXT | Office hours |

### Member Profile

| Column | Type | Description |
|--------|------|-------------|
| `profile_id` | UUID (PK, FK) | References profiles.id |
| `membership_status` | membership_status | active, inactive, pending, transferred, deceased |
| `member_number` | TEXT | Membership ID number |
| `join_date` | DATE | Membership start date |
| `baptism_date` | DATE | Baptism date |
| `confirmation_date` | DATE | Confirmation date |
| `how_heard` | TEXT | How they found the church |
| `previous_church` | TEXT | Previous church name |
| `family_id` | UUID | Family grouping ID |
| `family_role` | TEXT | Role in family (head, spouse, child) |

### Volunteer Profile

| Column | Type | Description |
|--------|------|-------------|
| `profile_id` | UUID (PK, FK) | References profiles.id |
| `availability` | JSONB | Availability schedule |
| `skills` | TEXT[] | Skill list |
| `interests` | TEXT[] | Interest areas |
| `background_check_date` | DATE | Last background check |
| `background_check_status` | TEXT | Check status |
| `training_completed` | JSONB | Completed trainings |
| `total_volunteer_hours` | NUMERIC | Total hours logged |

---

## Helper Functions

### Get or Create Profile
```sql
SELECT public.get_or_create_profile(
    'user-uuid',
    'church-uuid',
    'member'
);
-- Returns: profile_id UUID
```

This function:
1. Checks if profile exists
2. If not, creates base profile
3. Creates corresponding type-specific profile
4. Returns the profile ID

---

## Usage Examples

### Create a profile when user joins church
```typescript
// Using the helper function via RPC
const { data: profileId } = await supabase.rpc('get_or_create_profile', {
  p_user_id: session.user.id,
  p_church_id: churchId,
  p_profile_type: 'member'
});
```

### Get user's profile for a church
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select(`
    *,
    member_profiles (*),
    volunteer_profiles (*)
  `)
  .eq('user_id', session.user.id)
  .eq('church_id', churchId)
  .single();
```

### Update profile
```typescript
// Update base profile
await supabase
  .from('profiles')
  .update({
    display_name: 'John Doe',
    phone: '555-1234',
    bio: 'Active church member since 2020'
  })
  .eq('id', profileId);

// Update member-specific data
await supabase
  .from('member_profiles')
  .update({
    membership_status: 'active',
    join_date: '2020-01-15'
  })
  .eq('profile_id', profileId);
```

### Get all profiles in a ministry
```typescript
const { data: members } = await supabase
  .from('ministry_members')
  .select(`
    role,
    profile:profiles (
      id,
      display_name,
      avatar_url,
      user:users (email)
    )
  `)
  .eq('ministry_id', ministryId)
  .eq('is_active', true);
```

### Search profiles
```typescript
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, display_name, avatar_url, profile_type')
  .eq('church_id', churchId)
  .ilike('display_name', `%${searchTerm}%`)
  .limit(20);
```

---

## RLS Policies Summary

| Action | Who Can Do It |
|--------|---------------|
| View profiles | Members of the same church |
| Create profile | User for themselves in churches they belong to |
| Update profile | User for their own profile, or admins |
| View specialized profiles | Members of the same church |
| Manage specialized profiles | User for their own, or admins |

---

## Extending the Profile System

To add a new profile type:

1. Add to the enum:
```sql
ALTER TYPE profile_type ADD VALUE 'new_type';
```

2. Create the extension table:
```sql
CREATE TABLE public.new_type_profiles (
    profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- Add type-specific fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

3. Add RLS policies:
```sql
ALTER TABLE public.new_type_profiles ENABLE ROW LEVEL SECURITY;
-- Add appropriate policies
```

4. Update the `get_or_create_profile` function to handle the new type.
