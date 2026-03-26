# Authentication & Users

## Overview

This platform uses **Supabase Auth** as the authentication provider. The `public.users` table extends the auth data with application-specific fields.

---

## Authentication Flow

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   User Signs    │      │  Supabase Auth  │      │  public.users   │
│   Up / Login    │─────▶│   auth.users    │─────▶│   (via trigger) │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

1. User signs up via Supabase Auth
2. Trigger automatically creates `public.users` record
3. Email and metadata are synced from auth

---

## Tables

### auth.users (Supabase Managed)

This table is managed by Supabase Auth. **Do not modify directly.**

Key fields used:
- `id` (UUID) - Primary identifier
- `email` - User's email address
- `raw_user_meta_data` - JSON metadata from signup
- `email_confirmed_at` - Email verification timestamp

### public.users

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK, FK) | References auth.users.id |
| `email` | TEXT | Synced from auth |
| `full_name` | TEXT | User's display name |
| `avatar_url` | TEXT | Profile picture URL |
| `phone` | TEXT | Phone number |
| `status` | user_status | active, inactive, suspended, pending |
| `email_verified` | BOOLEAN | Email verification status |
| `last_login_at` | TIMESTAMPTZ | Last login timestamp |
| `created_at` | TIMESTAMPTZ | Account creation time |
| `updated_at` | TIMESTAMPTZ | Last update time |

---

## Triggers

### on_auth_user_created

**When:** After INSERT on auth.users  
**Action:** Creates corresponding public.users record

```sql
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

The trigger extracts:
- `id` - Direct mapping
- `email` - Direct mapping
- `full_name` - From `raw_user_meta_data.full_name` or `raw_user_meta_data.name`
- `avatar_url` - From `raw_user_meta_data.avatar_url`

### on_auth_user_updated

**When:** After UPDATE on auth.users (when email changes)  
**Action:** Syncs email and verification status

```sql
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    WHEN (OLD.email IS DISTINCT FROM NEW.email OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at)
    EXECUTE FUNCTION public.handle_user_update();
```

---

## User Status Enum

```sql
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending');
```

| Status | Description |
|--------|-------------|
| `active` | Normal active user |
| `inactive` | User chose to deactivate |
| `suspended` | Admin suspended the account |
| `pending` | Awaiting verification/approval |

---

## RLS Policies

### Users can view their own data
```sql
CREATE POLICY "Users can view own data"
    ON public.users FOR SELECT
    USING (id = auth.uid());
```

### Users can update their own data
```sql
CREATE POLICY "Users can update own data"
    ON public.users FOR UPDATE
    USING (id = auth.uid());
```

### Users can view other users in their churches
```sql
CREATE POLICY "Users can view church members"
    ON public.users FOR SELECT
    USING (
        id IN (
            SELECT ucr.user_id 
            FROM public.user_church_roles ucr
            WHERE ucr.church_id = ANY(public.get_user_church_ids())
        )
    );
```

---

## Usage Examples

### Get current user profile
```typescript
const { data: user } = await supabase
  .from('users')
  .select('*')
  .eq('id', session.user.id)
  .single();
```

### Update user profile
```typescript
const { error } = await supabase
  .from('users')
  .update({ full_name: 'New Name', phone: '555-1234' })
  .eq('id', session.user.id);
```

### Sign up with metadata
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
  options: {
    data: {
      full_name: 'John Doe',
      avatar_url: 'https://example.com/avatar.jpg'
    }
  }
});
```
