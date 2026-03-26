# Church Data

## Overview

This document covers all tenant-scoped church data tables including ministries, events, attendance, announcements, prayer requests, notes, and documents.

---

## Ministries

### Table: ministries

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique identifier |
| `church_id` | UUID (FK) | References churches.id |
| `name` | TEXT | Ministry name |
| `description` | TEXT | Ministry description |
| `ministry_type` | TEXT | Type/category |
| `status` | ministry_status | active, inactive, archived |
| `leader_profile_id` | UUID (FK) | Ministry leader's profile |
| `color` | TEXT | Display color |
| `icon` | TEXT | Display icon |
| `image_url` | TEXT | Ministry image |
| `is_public` | BOOLEAN | Publicly visible |
| `requires_approval` | BOOLEAN | Join requires approval |
| `max_members` | INTEGER | Maximum membership |
| `contact_email` | TEXT | Contact email |
| `meeting_location` | TEXT | Meeting location |
| `meeting_schedule` | TEXT | Meeting schedule |
| `settings` | JSONB | Custom settings |
| `created_by` | UUID (FK) | Creator's profile |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last update |

### Table: ministry_members

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique identifier |
| `ministry_id` | UUID (FK) | References ministries.id |
| `profile_id` | UUID (FK) | References profiles.id |
| `role` | TEXT | Role in ministry (leader, member, etc.) |
| `joined_at` | TIMESTAMPTZ | Join date |
| `is_active` | BOOLEAN | Active membership |
| `created_at` | TIMESTAMPTZ | Creation time |

**Constraint:** `UNIQUE(ministry_id, profile_id)`

### Usage Examples

```typescript
// Create a ministry
const { data: ministry } = await supabase
  .from('ministries')
  .insert({
    church_id: churchId,
    name: 'Youth Ministry',
    description: 'Ministry for teens and young adults',
    leader_profile_id: leaderProfileId,
    color: '#3B82F6'
  })
  .select()
  .single();

// Join a ministry
await supabase
  .from('ministry_members')
  .insert({
    ministry_id: ministryId,
    profile_id: userProfileId,
    role: 'member'
  });

// Get ministry with members
const { data } = await supabase
  .from('ministries')
  .select(`
    *,
    leader:profiles!leader_profile_id (display_name, avatar_url),
    members:ministry_members (
      profile:profiles (id, display_name, avatar_url)
    )
  `)
  .eq('id', ministryId)
  .single();
```

---

## Events

### Table: events

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique identifier |
| `church_id` | UUID (FK) | References churches.id |
| `ministry_id` | UUID (FK) | Optional ministry association |
| `title` | TEXT | Event title |
| `description` | TEXT | Event description |
| `event_type` | event_type | service, meeting, class, social, outreach, conference, other |
| `status` | event_status | draft, published, cancelled, completed |
| `start_datetime` | TIMESTAMPTZ | Start time |
| `end_datetime` | TIMESTAMPTZ | End time |
| `all_day` | BOOLEAN | All-day event |
| `timezone` | TEXT | Event timezone |
| `is_recurring` | BOOLEAN | Recurring event |
| `recurrence_rule` | TEXT | iCal RRULE format |
| `recurrence_end_date` | DATE | Recurrence end |
| `parent_event_id` | UUID (FK) | Parent recurring event |
| `location_name` | TEXT | Location name |
| `location_address` | TEXT | Full address |
| `is_online` | BOOLEAN | Virtual event |
| `online_url` | TEXT | Virtual meeting URL |
| `requires_registration` | BOOLEAN | Registration required |
| `max_attendees` | INTEGER | Maximum capacity |
| `registration_deadline` | TIMESTAMPTZ | Registration cutoff |
| `image_url` | TEXT | Event image |
| `color` | TEXT | Display color |
| `settings` | JSONB | Custom settings |
| `created_by_profile_id` | UUID (FK) | Creator's profile |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last update |

### Table: event_registrations

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique identifier |
| `event_id` | UUID (FK) | References events.id |
| `profile_id` | UUID (FK) | References profiles.id |
| `status` | TEXT | registered, waitlisted, cancelled |
| `guest_count` | INTEGER | Additional guests |
| `notes` | TEXT | Registration notes |
| `registered_at` | TIMESTAMPTZ | Registration time |
| `created_at` | TIMESTAMPTZ | Creation time |

**Constraint:** `UNIQUE(event_id, profile_id)`

### Usage Examples

```typescript
// Create an event
const { data: event } = await supabase
  .from('events')
  .insert({
    church_id: churchId,
    title: 'Sunday Service',
    event_type: 'service',
    status: 'published',
    start_datetime: '2024-01-07T10:00:00Z',
    end_datetime: '2024-01-07T12:00:00Z',
    location_name: 'Main Sanctuary',
    created_by_profile_id: profileId
  })
  .select()
  .single();

// Get upcoming events
const { data: events } = await supabase
  .from('events')
  .select('*')
  .eq('church_id', churchId)
  .eq('status', 'published')
  .gte('start_datetime', new Date().toISOString())
  .order('start_datetime', { ascending: true })
  .limit(10);

// Register for event
await supabase
  .from('event_registrations')
  .insert({
    event_id: eventId,
    profile_id: profileId,
    guest_count: 2
  });
```

---

## Attendance

### Table: attendance

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique identifier |
| `church_id` | UUID (FK) | References churches.id |
| `event_id` | UUID (FK) | Optional event reference |
| `profile_id` | UUID (FK) | References profiles.id |
| `status` | attendance_status | present, absent, late, excused |
| `check_in_time` | TIMESTAMPTZ | Check-in timestamp |
| `check_out_time` | TIMESTAMPTZ | Check-out timestamp |
| `attendance_date` | DATE | For non-event attendance |
| `service_type` | TEXT | Service type (for general attendance) |
| `notes` | TEXT | Attendance notes |
| `checked_in_by` | UUID (FK) | Staff who checked them in |
| `created_at` | TIMESTAMPTZ | Creation time |

### Usage Examples

```typescript
// Record attendance for event
await supabase
  .from('attendance')
  .insert({
    church_id: churchId,
    event_id: eventId,
    profile_id: profileId,
    status: 'present',
    check_in_time: new Date().toISOString()
  });

// Get attendance report
const { data: attendance } = await supabase
  .from('attendance')
  .select(`
    *,
    profile:profiles (display_name),
    event:events (title)
  `)
  .eq('church_id', churchId)
  .gte('attendance_date', '2024-01-01')
  .lte('attendance_date', '2024-01-31');
```

---

## Announcements

### Table: announcements

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique identifier |
| `church_id` | UUID (FK) | References churches.id |
| `ministry_id` | UUID (FK) | Optional ministry association |
| `title` | TEXT | Announcement title |
| `content` | TEXT | Full content |
| `excerpt` | TEXT | Short summary |
| `image_url` | TEXT | Featured image |
| `status` | announcement_status | draft, published, archived |
| `priority` | announcement_priority | low, normal, high, urgent |
| `publish_at` | TIMESTAMPTZ | Scheduled publish time |
| `expire_at` | TIMESTAMPTZ | Expiration time |
| `target_roles` | church_role[] | Target audience by role |
| `target_ministries` | UUID[] | Target audience by ministry |
| `is_pinned` | BOOLEAN | Pinned to top |
| `allow_comments` | BOOLEAN | Comments enabled |
| `created_by_profile_id` | UUID (FK) | Creator's profile |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last update |

### Usage Examples

```typescript
// Create announcement
await supabase
  .from('announcements')
  .insert({
    church_id: churchId,
    title: 'Church Picnic Next Sunday',
    content: 'Join us for our annual church picnic...',
    status: 'published',
    priority: 'normal',
    created_by_profile_id: profileId
  });

// Get active announcements
const { data: announcements } = await supabase
  .from('announcements')
  .select('*')
  .eq('church_id', churchId)
  .eq('status', 'published')
  .or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`)
  .or(`expire_at.is.null,expire_at.gt.${new Date().toISOString()}`)
  .order('is_pinned', { ascending: false })
  .order('created_at', { ascending: false });
```

---

## Prayer Requests

### Table: prayer_requests

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique identifier |
| `church_id` | UUID (FK) | References churches.id |
| `profile_id` | UUID (FK) | Submitter's profile |
| `title` | TEXT | Request title |
| `content` | TEXT | Request details |
| `status` | prayer_request_status | active, answered, archived |
| `is_anonymous` | BOOLEAN | Hide submitter name |
| `is_public` | BOOLEAN | Visible to all members |
| `answer_testimony` | TEXT | Testimony when answered |
| `answered_at` | TIMESTAMPTZ | Answer date |
| `prayer_count` | INTEGER | Number of prayers |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last update |

### Table: prayer_interactions

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique identifier |
| `prayer_request_id` | UUID (FK) | References prayer_requests.id |
| `profile_id` | UUID (FK) | Person who prayed |
| `prayed_at` | TIMESTAMPTZ | Prayer timestamp |
| `comment` | TEXT | Optional comment |
| `created_at` | TIMESTAMPTZ | Creation time |

**Constraint:** `UNIQUE(prayer_request_id, profile_id)`

---

## Internal Notes

### Table: internal_notes

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique identifier |
| `church_id` | UUID (FK) | References churches.id |
| `related_profile_id` | UUID (FK) | Note about this profile |
| `related_ministry_id` | UUID (FK) | Note about this ministry |
| `related_event_id` | UUID (FK) | Note about this event |
| `title` | TEXT | Note title |
| `content` | TEXT | Note content |
| `note_type` | TEXT | Note category |
| `visibility` | note_visibility | private, staff, leadership, public |
| `is_sensitive` | BOOLEAN | Sensitive content flag |
| `is_follow_up_required` | BOOLEAN | Needs follow-up |
| `follow_up_date` | DATE | Follow-up deadline |
| `created_by_profile_id` | UUID (FK) | Note author |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last update |

---

## Documents

### Table: documents

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique identifier |
| `church_id` | UUID (FK) | References churches.id |
| `name` | TEXT | File name |
| `description` | TEXT | File description |
| `document_type` | document_type | document, image, video, audio, other |
| `mime_type` | TEXT | MIME type |
| `file_size` | BIGINT | Size in bytes |
| `file_url` | TEXT | Storage URL |
| `folder_path` | TEXT | Virtual folder path |
| `tags` | TEXT[] | File tags |
| `related_ministry_id` | UUID (FK) | Associated ministry |
| `related_event_id` | UUID (FK) | Associated event |
| `is_public` | BOOLEAN | Publicly accessible |
| `allowed_roles` | church_role[] | Role-based access |
| `uploaded_by_profile_id` | UUID (FK) | Uploader's profile |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last update |
