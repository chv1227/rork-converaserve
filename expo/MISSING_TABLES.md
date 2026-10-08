# Database Schema Status

All required tables now have SQL migration files in `expo/sql/`. Below is the current status.

## Completed Tables (SQL files exist)

| File | Tables |
|------|--------|
| 01_users.sql | users, user_status enum, triggers |
| 02_churches.sql | churches, church_invites, trigger |
| 03_roles.sql | user_church_roles, role enum |
| 04_profiles.sql | profiles, trigger |
| 05_church_data.sql | ministries, ministry_members, events, event_registrations, attendance, internal_notes, documents, announcements, prayer_requests, prayer_interactions |
| 06_system.sql | audit_logs, tenant_settings, system_notifications, feature_flags, system_settings, usage_metrics |
| 07_rls.sql | RLS policies for all tables |
| 08_conversations.sql | conversations, conversation_participants, messages |
| 09_donations.sql | donations, recurring_giving |
| 10_forms.sql | forms, form_responses |
| 11_polls.sql | polls, poll_options, poll_votes |
| 12_discussions.sql | discussions, discussion_comments, discussion_likes |
| 13_songs.sql | songs, song_audio_parts, song_lyrics, worship_sets, worship_set_songs |
| 14_signups.sql | church_membership_signups, childrens_ministry_children |
| 15_ministry_extensions.sql | ministry_tasks, ministry_volunteer_slots, deacon_care_visits, deacon_benevolence_requests, deacon_prayer_assignments, deacon_meal_coordination, deacon_service_schedule, worship_schedules, worship_rehearsals, worship_availability, worship_service_plans, childrens_classrooms, childrens_classroom_assignments, childrens_check_ins, childrens_lessons, childrens_incident_reports |
| 16_ministry_workspace_v2.sql | ministry_attendance, ministry_attendance_records (+ RLS), RPCs cc_roster_claim_slot, cc_roster_release_slot, cc_set_ministry_member_role. **Applied to live DB 2026-10-08.** Targets the live schema, which reuses ministry_tasks, ministry_positions, ministry_roster_slots, children/child_guardians/child_checkins, ministry_announcements, ministry_messages, ministry_files, ministry_events, ministry_prayer_requests |

## App Screens (all linked from home screen)

| Screen | Route | Status |
|--------|-------|--------|
| Home | /(tabs)/index | ✅ Live |
| Messages | /(tabs)/messages | ✅ Live |
| Giving | /(tabs)/giving | ✅ Live |
| Profile | /(tabs)/profile | ✅ Live |
| Calendar | /(tabs)/calendar | ✅ Live |
| Notifications | /(tabs)/notifications | ✅ Live |
| More | /(tabs)/more | ✅ Live |
| Announcements | /announcements | ✅ Live |
| Events | /events | ✅ Live |
| Forms | /forms | ✅ Live |
| Media Library | /media | ✅ Live |
| Worship/Music | /worship | ✅ Live |
| Ministry Workspace | /ministry/[id] | ✅ Live (v2: dashboard, config-driven tools) |
| Ministry: Team Roster | /ministry/[id]/roster | ✅ Basic |
| Ministry: Task List | /ministry/[id]/tasks | ✅ Basic |
| Ministry: Files & Media | /ministry/[id]/files | ✅ Basic |
| Ministry: Announcements | /ministry/[id]/announcements | ✅ Basic |
| Ministry: Team Thread | /ministry/[id]/thread | ✅ Basic |
| Ministry: Prayer List | /ministry/[id]/prayer | ✅ Basic |
| Ministry: Volunteer Schedule | /ministry/[id]/volunteers | ✅ Standard |
| Ministry: Attendance | /ministry/[id]/attendance | ✅ Standard |
| Ministry: Recurring Events | /ministry/[id]/events | ✅ Standard |
| Ministry: Children's Check-In | /ministry/[id]/checkin | ✅ Standard (children ministries) |
| Chat | /chat | ✅ Live |
| New Here? | /church/welcome | ✅ Live |
| Service Times | /church/service-times | ✅ Live |
| Contact Church | /church/contact | ✅ Live |
| Signup | /(tabs)/signup | ✅ Live |
| Church Membership | /(tabs)/signup | ✅ Live |
| Children's Ministry | /(tabs)/signup | ✅ Live |
| Youth Ministry | /(tabs)/signup | ✅ Live |
| Volunteer Signup | /(tabs)/signup | ✅ Live |
| Small Groups | /(tabs)/signup | ✅ Live |
| Baptism | /(tabs)/signup | ✅ Live |

## Notes

- The live database has diverged from files 05/15 (e.g. live `ministry_tasks` has `assignee_profile_id`/`notes`; volunteer slots live in `ministry_roster_slots`; check-ins live in `child_checkins`). 16_ministry_workspace_v2.sql was written against the live schema.
- Ministry tool definitions and plan tiers live in `expo/constants/ministryTools.ts`.

## Next Steps

1. Run all SQL files in Supabase SQL editor (files 01 through 14 in order)
2. Verify all RLS policies are applied (07_rls.sql should be run after all table creation)
3. Verify all screens render properly in the app
