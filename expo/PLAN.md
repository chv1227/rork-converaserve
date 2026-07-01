# ChurchConnect MVP

## Overview
Production-ready church management platform with ministry modules, role-based access control, and comprehensive church administration tools.

## Features Progress

### 1. Authentication
- [x] Email/password sign up & login
- [x] Forgot password flow
- [x] Role-based accounts (Super Admin, Org Admin, Leader, Member)
- [x] Email verification, account deletion, password change
- [x] Modern glassmorphism login screen

### 2. Organization Management
- [x] Create organization workspace
- [x] Invite members via email
- [x] Member directory with roles
- [x] Multiple roles and permissions

### 3. Group Messaging
- [x] Direct messaging & group conversations
- [x] Read receipts with unread counts
- [x] Image/file sharing support
- [x] Ministry-specific chat rooms

### 4. Announcements
- [x] Admin/leader posting with priorities
- [x] Pin and schedule announcements
- [x] Ministry-specific targeting
- [x] Push notification delivery (auto-queued via DB trigger)

### 5. Events
- [x] Calendar view with month navigation
- [x] Event creation screen (type, date/time, location, ministry, registration)
- [x] Event detail screen with full info
- [x] RSVP system (Going / Maybe / Can't Attend)
- [x] Attendee count tracking

### 6. Forms
- [x] Form listing screen
- [x] Form builder with field types (text, textarea, email, phone, date, checkbox)
- [x] Form submission screen with validation
- [x] Success confirmation state
- [x] Pre-built templates (registration, volunteer, prayer, general)
- [x] Forms & form_responses tables live in Supabase with RLS

### 7. Media Library
- [x] Photo, video, and document upload UI
- [x] Grid and list view modes
- [x] Folder navigation with breadcrumbs
- [x] File metadata display (size, type, date)
- [x] Documents table in database schema
- [x] 5 Storage buckets live (media, avatars, documents, announcements, chat-files) with RLS

### 8. User Profiles
- [x] Profile picture and contact info
- [x] Ministry/team assignment display
- [x] Role badge and join date
- [x] Edit profile screen

### 9. Admin Dashboard
- [x] Stats cards with live counts (users, active, ministries, reports)
- [x] User management section with quick actions
- [x] Ministry management section
- [x] Church management for super admins
- [x] Invite member modal with role selection
- [x] Content moderation and danger zone sections

### 10. Ministry Modules
- [x] Ministry Hub tab with card grid showing all ministries (My Ministries + Explore More)
- [x] Per-ministry dashboard with 10 quick actions (Announcements, Chat, Calendar, Prayer, Tasks, Members, Files, Polls, Discussion, Stats)
- [x] Deacons Ministry: care visits, benevolence requests, prayer assignments, meal coordination, service scheduling, reports
- [x] Worship Ministry: team schedules, song library link, setlists, rehearsals, service plans, team roster
- [x] Children's Ministry: classrooms, child profiles, digital check-in, lessons, incident reports, parent messaging
- [x] Role-based access control: Church Admin, Pastor, Ministry Leader, Ministry Member
- [x] Ministry join/leave system with access enforcement (non-members see Access Denied)
- [x] 16 new database tables for ministry-specific features (15_ministry_extensions.sql)
- [x] RLS policies on all ministry tables using is_ministry_member() and can_manage_ministry() helpers

## Polish & Launch Readiness
- [x] Edge function deployed (send-push-notifications)
- [x] pg_cron job scheduled every 60 seconds for push delivery
- [x] App icons generated for all device sizes (iOS, Android, web)
- [x] Privacy Policy & Terms of Service links in Settings screen
- [x] Onboarding carousel (3 slides: Stay Connected, Give Easily, Join Ministries) after first login
- [x] Pull-to-refresh haptic feedback on all tab screens
- [x] Share church invite link button on Profile screen

## Backend (All Deployed)
- [x] Forms & form_responses tables with RLS
- [x] All 50+ tables have RLS policies (no unprotected data)
- [x] 5 Storage buckets with RLS: media, avatars, documents, announcements, chat-files
- [x] Push notification infrastructure:
  - `user_push_tokens` table for Expo push tokens
  - `push_notification_queue` with DB triggers on announcements & events
  - Edge function deployed at send-push-notifications
  - pg_cron job scheduled every 60 seconds to deliver push notifications

## Design
- Modern dark/light theme with navy brass palette
- Glassmorphism accents on cards and inputs
- Mobile-first with responsive web support
- Professional UI inspired by Slack, Discord, Church Center

## Tech Stack
- Expo/React Native with TypeScript
- Supabase backend (auth, database, storage, realtime, edge functions)
- React Query for server state
- Push notifications via Expo Notifications + Supabase Edge Functions
- Scalable multi-tenant architecture
