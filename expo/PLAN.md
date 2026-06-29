# ChurchConnect Phase 1 MVP

## Overview
Production-ready church management platform with 9 core features. Future features (in-app payments, AI attendance, live streaming) are left as placeholders with scalable architecture.

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
- [x] Documents table already in database schema
- [x] Storage buckets live (media, avatars, documents, announcements, chat-files) with RLS

### 8. User Profiles
- [x] Profile picture and contact info
- [x] Ministry/team assignment display
- [x] Role badge and join date
- [x] Edit profile screen

### 9. Admin Dashboard
- [x] Stats cards with live counts (users, active, ministries, reports)
- [x] User management section with quick actions
- [x] Ministry management section with real ministry data
- [x] Church management for super admins
- [x] Invite member modal with role selection + real ministry picker
- [x] Content moderation and danger zone sections
- [x] Pending requests query fetches real data from DB

## Bug Fixes (Audit Pass - 2026-06-29)
- [x] Fixed admin dashboard ministries query (was disabled, always empty)
- [x] Fixed pending requests query (now fetches real data from DB)
- [x] Fixed event RSVP using incorrect ID (was user.id, now profile_id)
- [x] Fixed chat mark-as-read behavior (now fires on screen enter)
- [x] Modernized register screen (glassmorphism matching login design)
- [x] Fixed announcements pinned card hardcoded color (#FFF5F5 removed)
- [x] Fixed media download button (now opens file URL via Linking)
- [x] TypeScript compiles cleanly (zero errors)

## Backend (All Deployed)
- [x] Forms & form_responses tables with RLS
- [x] All 35+ tables have RLS policies (no unprotected tables)
- [x] Storage buckets: media, avatars, documents, announcements, chat-files (all with RLS)
- [x] Push notification infrastructure:
  - user_push_tokens table for Expo push tokens
  - push_notification_queue table with DB triggers on announcements & events
  - Edge function deployed: https://mrdefwwcvnepbepoelxz.supabase.co/functions/v1/send-push-notifications
  - Call this function on a schedule (e.g., cron every minute) to deliver push notifications

## Design
- Modern dark/light theme with navy brass palette
- Glassmorphism accents on cards and inputs
- Mobile-first with responsive web support
- Professional UI inspired by Slack, Discord, Church Center

## Tech Stack
- Expo/React Native with TypeScript
- Supabase backend (auth, database, storage, realtime)
- React Query for server state
- Push notifications via Expo Notifications
- Scalable multi-tenant architecture
