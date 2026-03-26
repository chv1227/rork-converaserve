# Tenants & Roles

## Overview

The platform supports **multi-tenancy** where each Church Organization is a tenant. Users can belong to multiple churches with different roles in each.

---

## Architecture

```
┌─────────────┐         ┌─────────────────────┐         ┌─────────────┐
│   User A    │────────▶│  user_church_roles  │◀────────│  Church 1   │
└─────────────┘         │  (role: admin)      │         └─────────────┘
                        └─────────────────────┘
                        
┌─────────────┐         ┌─────────────────────┐         ┌─────────────┐
│   User A    │────────▶│  user_church_roles  │◀────────│  Church 2   │
└─────────────┘         │  (role: member)     │         └─────────────┘
```

A single user can have:
- **Admin** role in Church 1
- **Member** role in Church 2

---

## Churches Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique identifier |
| `name` | TEXT | Church name |
| `slug` | TEXT (Unique) | URL-friendly identifier (auto-generated) |
| `description` | TEXT | Church description |
| `status` | church_status | active, inactive, suspended, archived, pending |
| `denomination` | TEXT | Religious denomination |
| `address_line1` | TEXT | Street address |
| `address_line2` | TEXT | Suite/Unit |
| `city` | TEXT | City |
| `state` | TEXT | State/Province |
| `postal_code` | TEXT | ZIP/Postal code |
| `country` | TEXT | Country (default: US) |
| `contact_email` | TEXT | Contact email |
| `contact_phone` | TEXT | Contact phone |
| `website` | TEXT | Church website |
| `subscription_plan` | subscription_plan | free, basic, standard, premium, enterprise |
| `subscription_expires_at` | TIMESTAMPTZ | Subscription expiration |
| `owner_user_id` | UUID (FK) | References users.id |
| `logo_url` | TEXT | Church logo |
| `banner_url` | TEXT | Church banner image |
| `timezone` | TEXT | Church timezone |
| `settings` | JSONB | Custom settings |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last update |
| `deleted_at` | TIMESTAMPTZ | Soft delete timestamp |

---

## User Church Roles Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique identifier |
| `user_id` | UUID (FK) | References users.id |
| `church_id` | UUID (FK) | References churches.id |
| `role` | church_role | User's role in this church |
| `permissions_override` | JSONB | Custom permission overrides |
| `is_active` | BOOLEAN | Active membership status |
| `invited_by` | UUID (FK) | User who sent invitation |
| `invited_at` | TIMESTAMPTZ | Invitation timestamp |
| `accepted_at` | TIMESTAMPTZ | Acceptance timestamp |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last update |

**Constraint:** `UNIQUE(user_id, church_id)` - One role per user per church

---

## Role Hierarchy

```sql
CREATE TYPE church_role AS ENUM ('owner', 'admin', 'pastor', 'staff', 'volunteer', 'member', 'guest');
```

| Role | Level | Description |
|------|-------|-------------|
| `owner` | 1 | Church owner, full control |
| `admin` | 2 | Administrative access |
| `pastor` | 3 | Pastoral staff |
| `staff` | 4 | General staff |
| `volunteer` | 5 | Active volunteers |
| `member` | 6 | Regular members |
| `guest` | 7 | Visitors/guests |

---

## Helper Functions

### Check if user belongs to church
```sql
SELECT public.user_belongs_to_church('church-uuid');
-- Returns: BOOLEAN
```

### Check if user is admin
```sql
SELECT public.user_is_church_admin(auth.uid(), 'church-uuid');
-- Returns: BOOLEAN
```

### Get user's role in church
```sql
SELECT public.get_user_church_role(auth.uid(), 'church-uuid');
-- Returns: church_role
```

### Add user to church
```sql
SELECT public.add_user_to_church(
    'user-uuid',
    'church-uuid',
    'member',
    'inviter-uuid'
);
-- Returns: role_id UUID
```

### Check if user has specific role
```sql
SELECT public.user_has_church_role(
    'user-uuid',
    'church-uuid',
    ARRAY['admin', 'pastor']::church_role[]
);
-- Returns: BOOLEAN
```

---

## Usage Examples

### Create a new church
```typescript
// 1. Create the church
const { data: church, error } = await supabase
  .from('churches')
  .insert({
    name: 'First Community Church',
    denomination: 'Non-denominational',
    contact_email: 'info@firstchurch.org',
    owner_user_id: session.user.id
  })
  .select()
  .single();

// 2. Add creator as owner
await supabase
  .from('user_church_roles')
  .insert({
    user_id: session.user.id,
    church_id: church.id,
    role: 'owner'
  });
```

### Get user's churches
```typescript
const { data: churches } = await supabase
  .from('user_church_roles')
  .select(`
    role,
    church:churches (
      id,
      name,
      logo_url
    )
  `)
  .eq('user_id', session.user.id)
  .eq('is_active', true);
```

### Invite user to church
```typescript
// Create role with pending status
const { data } = await supabase
  .from('user_church_roles')
  .insert({
    user_id: inviteeUserId,
    church_id: churchId,
    role: 'member',
    invited_by: session.user.id,
    invited_at: new Date().toISOString(),
    is_active: false // Pending acceptance
  });
```

### Accept invitation
```typescript
await supabase
  .from('user_church_roles')
  .update({
    is_active: true,
    accepted_at: new Date().toISOString()
  })
  .eq('user_id', session.user.id)
  .eq('church_id', churchId);
```

---

## RLS Policies Summary

| Action | Who Can Do It |
|--------|---------------|
| View churches | Members of that church, or active churches for discovery |
| Update church | Admins and owners only |
| Create church | Any authenticated user |
| View roles | Members of that church |
| Manage roles | Admins only (or self for leaving) |
