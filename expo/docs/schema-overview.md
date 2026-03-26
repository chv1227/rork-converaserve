# Database Schema Overview

## Multi-Tenant Church Management Platform

This document provides a comprehensive overview of the Supabase database schema for the multi-tenant church management platform.

---

## Architecture Principles

### 1. Multi-Tenancy
- Each **Church Organization** is a tenant
- All tenant-specific data is scoped by `church_id`
- Strict tenant isolation via Row Level Security (RLS)

### 2. Authentication
- Uses **Supabase Auth** (`auth.users`) as the identity provider
- `public.users` table mirrors and extends auth data
- Automatic sync via database triggers

### 3. Security
- RLS enabled on all tables
- Helper functions for permission checks
- Role-based access control (RBAC)

---

## Entity Categories

### Global Entities (Not Tenant-Scoped)
| Table | Description |
|-------|-------------|
| `users` | Application user data (synced with auth.users) |
| `feature_flags` | Global feature toggles |
| `system_settings` | Platform-wide configuration |

### Tenant Entities (Scoped by church_id)
| Table | Description |
|-------|-------------|
| `churches` | Church organizations (tenants) |
| `user_church_roles` | User-tenant membership and roles |
| `profiles` | User profiles per church |
| `ministries` | Church ministries/groups |
| `events` | Church events |
| `attendance` | Attendance records |
| `announcements` | Church announcements |
| `prayer_requests` | Prayer request submissions |
| `internal_notes` | Staff notes |
| `documents` | File metadata |
| `tenant_settings` | Per-church configuration |
| `audit_logs` | Activity tracking |
| `system_notifications` | User notifications |
| `usage_metrics` | Usage statistics |

---

## Schema Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GLOBAL ENTITIES                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐     ┌────────────────┐     ┌─────────────────┐   │
│  │ auth.users   │────▶│ public.users   │     │ feature_flags   │   │
│  │ (Supabase)   │     │ (App Data)     │     │                 │   │
│  └──────────────┘     └───────┬────────┘     └─────────────────┘   │
│                               │                                      │
│                               │              ┌─────────────────┐    │
│                               │              │ system_settings │    │
│                               │              └─────────────────┘    │
└───────────────────────────────┼──────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      TENANT CORE (Multi-Tenant)                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐         ┌─────────────────────┐               │
│  │    churches      │◀────────│  user_church_roles  │               │
│  │    (Tenants)     │         │  (Join Table)       │               │
│  └────────┬─────────┘         └──────────┬──────────┘               │
│           │                              │                           │
│           │                              ▼                           │
│           │                   ┌─────────────────────┐               │
│           │                   │     profiles        │               │
│           │                   │  (Base Profile)     │               │
│           │                   └──────────┬──────────┘               │
│           │                              │                           │
│           │              ┌───────────────┼───────────────┐          │
│           │              ▼               ▼               ▼          │
│           │    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│           │    │admin_profiles│ │staff_profiles│ │member_profiles│ │
│           │    └──────────────┘ └──────────────┘ └──────────────┘  │
│           │                                                         │
└───────────┼─────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CHURCH DATA (Tenant-Scoped)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐         │
│  │ ministries  │    │   events    │    │  announcements  │         │
│  └──────┬──────┘    └──────┬──────┘    └─────────────────┘         │
│         │                  │                                        │
│         ▼                  ▼                                        │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │
│  │ministry_members │ │event_registrations│ │  attendance   │       │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘       │
│                                                                      │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │
│  │ prayer_requests │ │ internal_notes  │ │   documents     │       │
│  └────────┬────────┘ └─────────────────┘ └─────────────────┘       │
│           │                                                         │
│           ▼                                                         │
│  ┌─────────────────────┐                                           │
│  │ prayer_interactions │                                           │
│  └─────────────────────┘                                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SYSTEM DATA (Mixed Scope)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐ ┌─────────────────────┐ ┌─────────────────┐   │
│  │   audit_logs    │ │ system_notifications │ │  usage_metrics │   │
│  └─────────────────┘ └─────────────────────┘ └─────────────────┘   │
│                                                                      │
│  ┌─────────────────┐                                                │
│  │ tenant_settings │                                                │
│  └─────────────────┘                                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## SQL File Execution Order

Execute the SQL files in this order in Supabase SQL Editor:

1. `01_users.sql` - User table and auth triggers
2. `02_churches.sql` - Church/tenant table
3. `03_roles.sql` - User-church roles join table
4. `04_profiles.sql` - Profile system with extensions
5. `05_church_data.sql` - Ministries, events, attendance, etc.
6. `06_system.sql` - Audit logs, settings, notifications
7. `07_rls.sql` - Row Level Security policies

---

## Key Relationships

| Relationship | Type | Description |
|--------------|------|-------------|
| User ↔ Church | Many-to-Many | Via `user_church_roles` |
| User → Profile | One-to-Many | One profile per church |
| Profile → Specialized Profile | One-to-One | Admin, Staff, Member, Volunteer |
| Church → Ministry | One-to-Many | Church owns ministries |
| Ministry ↔ Profile | Many-to-Many | Via `ministry_members` |
| Church → Event | One-to-Many | Church owns events |
| Event ↔ Profile | Many-to-Many | Via `event_registrations` |

---

## Enums Reference

| Enum | Values |
|------|--------|
| `user_status` | active, inactive, suspended, pending |
| `church_status` | active, inactive, suspended, archived, pending |
| `church_role` | owner, admin, pastor, staff, volunteer, member, guest |
| `profile_type` | admin, pastor, staff, volunteer, member |
| `subscription_plan` | free, basic, standard, premium, enterprise |
| `event_status` | draft, published, cancelled, completed |
| `event_type` | service, meeting, class, social, outreach, conference, other |
| `membership_status` | active, inactive, pending, transferred, deceased |
