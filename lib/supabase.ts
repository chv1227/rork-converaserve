import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';
export type ChurchStatus = 'active' | 'inactive' | 'suspended' | 'archived' | 'pending';
export type ChurchRole = 'owner' | 'admin' | 'pastor' | 'staff' | 'volunteer' | 'member' | 'guest';
export type ProfileType = 'admin' | 'pastor' | 'staff' | 'volunteer' | 'member';
export type SubscriptionPlan = 'free' | 'basic' | 'standard' | 'premium' | 'enterprise';
export type MembershipStatus = 'active' | 'inactive' | 'pending' | 'transferred' | 'deceased';
export type MinistryStatus = 'active' | 'inactive' | 'archived';
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
export type EventType = 'service' | 'meeting' | 'class' | 'social' | 'outreach' | 'conference' | 'other';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type NoteVisibility = 'private' | 'staff' | 'leadership' | 'public';
export type DocumentType = 'document' | 'image' | 'video' | 'audio' | 'other';
export type AnnouncementStatus = 'draft' | 'published' | 'archived';
export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent';
export type PrayerRequestStatus = 'active' | 'answered' | 'archived';
export type AuditAction = 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'signup' | 'join' | 'leave' | 'invite' | 'approve' | 'reject' | 'suspend' | 'export' | 'import' | 'other';
export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'invitation' | 'reminder' | 'announcement' | 'message' | 'prayer' | 'event' | 'other';

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          status: UserStatus;
          email_verified: boolean;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          status?: UserStatus;
          email_verified?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          status?: UserStatus;
          email_verified?: boolean;
          last_login_at?: string | null;
          updated_at?: string;
        };
      };
      churches: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          description: string | null;
          status: ChurchStatus;
          denomination: string | null;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
          country: string;
          contact_email: string | null;
          contact_phone: string | null;
          website: string | null;
          subscription_plan: SubscriptionPlan;
          subscription_expires_at: string | null;
          owner_user_id: string | null;
          logo_url: string | null;
          banner_url: string | null;
          timezone: string;
          settings: Record<string, unknown>;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string | null;
          description?: string | null;
          status?: ChurchStatus;
          denomination?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          country?: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          website?: string | null;
          subscription_plan?: SubscriptionPlan;
          subscription_expires_at?: string | null;
          owner_user_id?: string | null;
          logo_url?: string | null;
          banner_url?: string | null;
          timezone?: string;
          settings?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          name?: string;
          slug?: string | null;
          description?: string | null;
          status?: ChurchStatus;
          denomination?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          country?: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          website?: string | null;
          subscription_plan?: SubscriptionPlan;
          subscription_expires_at?: string | null;
          owner_user_id?: string | null;
          logo_url?: string | null;
          banner_url?: string | null;
          timezone?: string;
          settings?: Record<string, unknown>;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      user_church_roles: {
        Row: {
          id: string;
          user_id: string;
          church_id: string;
          role: ChurchRole;
          permissions_override: Record<string, unknown>;
          is_active: boolean;
          invited_by: string | null;
          invited_at: string | null;
          accepted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          church_id: string;
          role?: ChurchRole;
          permissions_override?: Record<string, unknown>;
          is_active?: boolean;
          invited_by?: string | null;
          invited_at?: string | null;
          accepted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          role?: ChurchRole;
          permissions_override?: Record<string, unknown>;
          is_active?: boolean;
          invited_by?: string | null;
          invited_at?: string | null;
          accepted_at?: string | null;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          church_id: string;
          profile_type: ProfileType;
          display_name: string | null;
          bio: string | null;
          phone: string | null;
          avatar_url: string | null;
          secondary_email: string | null;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
          date_of_birth: string | null;
          gender: string | null;
          marital_status: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          emergency_contact_relation: string | null;
          custom_fields: Record<string, unknown>;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          church_id: string;
          profile_type?: ProfileType;
          display_name?: string | null;
          bio?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          secondary_email?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          date_of_birth?: string | null;
          gender?: string | null;
          marital_status?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          emergency_contact_relation?: string | null;
          custom_fields?: Record<string, unknown>;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          profile_type?: ProfileType;
          display_name?: string | null;
          bio?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          secondary_email?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          date_of_birth?: string | null;
          gender?: string | null;
          marital_status?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          emergency_contact_relation?: string | null;
          custom_fields?: Record<string, unknown>;
          is_public?: boolean;
          updated_at?: string;
        };
      };
      admin_profiles: {
        Row: {
          profile_id: string;
          admin_level: number;
          can_manage_billing: boolean;
          can_manage_users: boolean;
          can_manage_content: boolean;
          system_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          admin_level?: number;
          can_manage_billing?: boolean;
          can_manage_users?: boolean;
          can_manage_content?: boolean;
          system_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          admin_level?: number;
          can_manage_billing?: boolean;
          can_manage_users?: boolean;
          can_manage_content?: boolean;
          system_notes?: string | null;
          updated_at?: string;
        };
      };
      staff_profiles: {
        Row: {
          profile_id: string;
          title: string | null;
          department: string | null;
          employment_status: string;
          hire_date: string | null;
          supervisor_profile_id: string | null;
          office_location: string | null;
          office_hours: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          title?: string | null;
          department?: string | null;
          employment_status?: string;
          hire_date?: string | null;
          supervisor_profile_id?: string | null;
          office_location?: string | null;
          office_hours?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string | null;
          department?: string | null;
          employment_status?: string;
          hire_date?: string | null;
          supervisor_profile_id?: string | null;
          office_location?: string | null;
          office_hours?: string | null;
          updated_at?: string;
        };
      };
      member_profiles: {
        Row: {
          profile_id: string;
          membership_status: MembershipStatus;
          member_number: string | null;
          join_date: string | null;
          baptism_date: string | null;
          confirmation_date: string | null;
          how_heard: string | null;
          previous_church: string | null;
          family_id: string | null;
          family_role: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          membership_status?: MembershipStatus;
          member_number?: string | null;
          join_date?: string | null;
          baptism_date?: string | null;
          confirmation_date?: string | null;
          how_heard?: string | null;
          previous_church?: string | null;
          family_id?: string | null;
          family_role?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          membership_status?: MembershipStatus;
          member_number?: string | null;
          join_date?: string | null;
          baptism_date?: string | null;
          confirmation_date?: string | null;
          how_heard?: string | null;
          previous_church?: string | null;
          family_id?: string | null;
          family_role?: string | null;
          updated_at?: string;
        };
      };
      volunteer_profiles: {
        Row: {
          profile_id: string;
          availability: Record<string, unknown>;
          skills: string[] | null;
          interests: string[] | null;
          background_check_date: string | null;
          background_check_status: string | null;
          training_completed: unknown[];
          total_volunteer_hours: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          availability?: Record<string, unknown>;
          skills?: string[] | null;
          interests?: string[] | null;
          background_check_date?: string | null;
          background_check_status?: string | null;
          training_completed?: unknown[];
          total_volunteer_hours?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          availability?: Record<string, unknown>;
          skills?: string[] | null;
          interests?: string[] | null;
          background_check_date?: string | null;
          background_check_status?: string | null;
          training_completed?: unknown[];
          total_volunteer_hours?: number;
          updated_at?: string;
        };
      };
      ministries: {
        Row: {
          id: string;
          church_id: string;
          name: string;
          description: string | null;
          ministry_type: string | null;
          status: MinistryStatus;
          leader_profile_id: string | null;
          color: string | null;
          icon: string | null;
          image_url: string | null;
          is_public: boolean;
          requires_approval: boolean;
          max_members: number | null;
          contact_email: string | null;
          meeting_location: string | null;
          meeting_schedule: string | null;
          settings: Record<string, unknown>;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          church_id: string;
          name: string;
          description?: string | null;
          ministry_type?: string | null;
          status?: MinistryStatus;
          leader_profile_id?: string | null;
          color?: string | null;
          icon?: string | null;
          image_url?: string | null;
          is_public?: boolean;
          requires_approval?: boolean;
          max_members?: number | null;
          contact_email?: string | null;
          meeting_location?: string | null;
          meeting_schedule?: string | null;
          settings?: Record<string, unknown>;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          ministry_type?: string | null;
          status?: MinistryStatus;
          leader_profile_id?: string | null;
          color?: string | null;
          icon?: string | null;
          image_url?: string | null;
          is_public?: boolean;
          requires_approval?: boolean;
          max_members?: number | null;
          contact_email?: string | null;
          meeting_location?: string | null;
          meeting_schedule?: string | null;
          settings?: Record<string, unknown>;
          updated_at?: string;
        };
      };
      ministry_members: {
        Row: {
          id: string;
          ministry_id: string;
          profile_id: string;
          role: string;
          joined_at: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          ministry_id: string;
          profile_id: string;
          role?: string;
          joined_at?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          role?: string;
          is_active?: boolean;
        };
      };
      events: {
        Row: {
          id: string;
          church_id: string;
          ministry_id: string | null;
          title: string;
          description: string | null;
          event_type: EventType;
          status: EventStatus;
          start_datetime: string;
          end_datetime: string | null;
          all_day: boolean;
          timezone: string | null;
          is_recurring: boolean;
          recurrence_rule: string | null;
          recurrence_end_date: string | null;
          parent_event_id: string | null;
          location_name: string | null;
          location_address: string | null;
          is_online: boolean;
          online_url: string | null;
          requires_registration: boolean;
          max_attendees: number | null;
          registration_deadline: string | null;
          image_url: string | null;
          color: string | null;
          settings: Record<string, unknown>;
          created_by_profile_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          church_id: string;
          ministry_id?: string | null;
          title: string;
          description?: string | null;
          event_type?: EventType;
          status?: EventStatus;
          start_datetime: string;
          end_datetime?: string | null;
          all_day?: boolean;
          timezone?: string | null;
          is_recurring?: boolean;
          recurrence_rule?: string | null;
          recurrence_end_date?: string | null;
          parent_event_id?: string | null;
          location_name?: string | null;
          location_address?: string | null;
          is_online?: boolean;
          online_url?: string | null;
          requires_registration?: boolean;
          max_attendees?: number | null;
          registration_deadline?: string | null;
          image_url?: string | null;
          color?: string | null;
          settings?: Record<string, unknown>;
          created_by_profile_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          event_type?: EventType;
          status?: EventStatus;
          start_datetime?: string;
          end_datetime?: string | null;
          all_day?: boolean;
          timezone?: string | null;
          is_recurring?: boolean;
          recurrence_rule?: string | null;
          recurrence_end_date?: string | null;
          parent_event_id?: string | null;
          location_name?: string | null;
          location_address?: string | null;
          is_online?: boolean;
          online_url?: string | null;
          requires_registration?: boolean;
          max_attendees?: number | null;
          registration_deadline?: string | null;
          image_url?: string | null;
          color?: string | null;
          settings?: Record<string, unknown>;
          updated_at?: string;
        };
      };
      event_registrations: {
        Row: {
          id: string;
          event_id: string;
          profile_id: string;
          status: string;
          guest_count: number;
          notes: string | null;
          registered_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          profile_id: string;
          status?: string;
          guest_count?: number;
          notes?: string | null;
          registered_at?: string;
          created_at?: string;
        };
        Update: {
          status?: string;
          guest_count?: number;
          notes?: string | null;
        };
      };
      attendance: {
        Row: {
          id: string;
          church_id: string;
          event_id: string | null;
          profile_id: string;
          status: AttendanceStatus;
          check_in_time: string | null;
          check_out_time: string | null;
          attendance_date: string | null;
          service_type: string | null;
          notes: string | null;
          checked_in_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          church_id: string;
          event_id?: string | null;
          profile_id: string;
          status?: AttendanceStatus;
          check_in_time?: string | null;
          check_out_time?: string | null;
          attendance_date?: string | null;
          service_type?: string | null;
          notes?: string | null;
          checked_in_by?: string | null;
          created_at?: string;
        };
        Update: {
          status?: AttendanceStatus;
          check_in_time?: string | null;
          check_out_time?: string | null;
          notes?: string | null;
        };
      };
      internal_notes: {
        Row: {
          id: string;
          church_id: string;
          related_profile_id: string | null;
          related_ministry_id: string | null;
          related_event_id: string | null;
          title: string | null;
          content: string;
          note_type: string | null;
          visibility: NoteVisibility;
          is_sensitive: boolean;
          is_follow_up_required: boolean;
          follow_up_date: string | null;
          created_by_profile_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          church_id: string;
          related_profile_id?: string | null;
          related_ministry_id?: string | null;
          related_event_id?: string | null;
          title?: string | null;
          content: string;
          note_type?: string | null;
          visibility?: NoteVisibility;
          is_sensitive?: boolean;
          is_follow_up_required?: boolean;
          follow_up_date?: string | null;
          created_by_profile_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string | null;
          content?: string;
          note_type?: string | null;
          visibility?: NoteVisibility;
          is_sensitive?: boolean;
          is_follow_up_required?: boolean;
          follow_up_date?: string | null;
          updated_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          church_id: string;
          name: string;
          description: string | null;
          document_type: DocumentType;
          mime_type: string | null;
          file_size: number | null;
          file_url: string;
          folder_path: string;
          tags: string[] | null;
          related_ministry_id: string | null;
          related_event_id: string | null;
          is_public: boolean;
          allowed_roles: ChurchRole[] | null;
          uploaded_by_profile_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          church_id: string;
          name: string;
          description?: string | null;
          document_type?: DocumentType;
          mime_type?: string | null;
          file_size?: number | null;
          file_url: string;
          folder_path?: string;
          tags?: string[] | null;
          related_ministry_id?: string | null;
          related_event_id?: string | null;
          is_public?: boolean;
          allowed_roles?: ChurchRole[] | null;
          uploaded_by_profile_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          document_type?: DocumentType;
          folder_path?: string;
          tags?: string[] | null;
          is_public?: boolean;
          allowed_roles?: ChurchRole[] | null;
          updated_at?: string;
        };
      };
      announcements: {
        Row: {
          id: string;
          church_id: string;
          ministry_id: string | null;
          title: string;
          content: string;
          excerpt: string | null;
          image_url: string | null;
          status: AnnouncementStatus;
          priority: AnnouncementPriority;
          publish_at: string | null;
          expire_at: string | null;
          target_roles: ChurchRole[] | null;
          target_ministries: string[] | null;
          is_pinned: boolean;
          allow_comments: boolean;
          created_by_profile_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          church_id: string;
          ministry_id?: string | null;
          title: string;
          content: string;
          excerpt?: string | null;
          image_url?: string | null;
          status?: AnnouncementStatus;
          priority?: AnnouncementPriority;
          publish_at?: string | null;
          expire_at?: string | null;
          target_roles?: ChurchRole[] | null;
          target_ministries?: string[] | null;
          is_pinned?: boolean;
          allow_comments?: boolean;
          created_by_profile_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          content?: string;
          excerpt?: string | null;
          image_url?: string | null;
          status?: AnnouncementStatus;
          priority?: AnnouncementPriority;
          publish_at?: string | null;
          expire_at?: string | null;
          target_roles?: ChurchRole[] | null;
          target_ministries?: string[] | null;
          is_pinned?: boolean;
          allow_comments?: boolean;
          updated_at?: string;
        };
      };
      prayer_requests: {
        Row: {
          id: string;
          church_id: string;
          profile_id: string;
          title: string | null;
          content: string;
          status: PrayerRequestStatus;
          is_anonymous: boolean;
          is_public: boolean;
          answer_testimony: string | null;
          answered_at: string | null;
          prayer_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          church_id: string;
          profile_id: string;
          title?: string | null;
          content: string;
          status?: PrayerRequestStatus;
          is_anonymous?: boolean;
          is_public?: boolean;
          answer_testimony?: string | null;
          answered_at?: string | null;
          prayer_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string | null;
          content?: string;
          status?: PrayerRequestStatus;
          is_anonymous?: boolean;
          is_public?: boolean;
          answer_testimony?: string | null;
          answered_at?: string | null;
          prayer_count?: number;
          updated_at?: string;
        };
      };
      prayer_interactions: {
        Row: {
          id: string;
          prayer_request_id: string;
          profile_id: string;
          prayed_at: string;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          prayer_request_id: string;
          profile_id: string;
          prayed_at?: string;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          comment?: string | null;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          church_id: string | null;
          action: AuditAction;
          entity_type: string;
          entity_id: string | null;
          old_data: Record<string, unknown> | null;
          new_data: Record<string, unknown> | null;
          description: string | null;
          ip_address: string | null;
          user_agent: string | null;
          request_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          church_id?: string | null;
          action: AuditAction;
          entity_type: string;
          entity_id?: string | null;
          old_data?: Record<string, unknown> | null;
          new_data?: Record<string, unknown> | null;
          description?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          request_id?: string | null;
          created_at?: string;
        };
        Update: never;
      };
      tenant_settings: {
        Row: {
          id: string;
          church_id: string;
          key: string;
          value: Record<string, unknown>;
          description: string | null;
          is_secret: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          church_id: string;
          key: string;
          value: Record<string, unknown>;
          description?: string | null;
          is_secret?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          value?: Record<string, unknown>;
          description?: string | null;
          is_secret?: boolean;
          updated_at?: string;
        };
      };
      system_notifications: {
        Row: {
          id: string;
          user_id: string;
          church_id: string | null;
          type: NotificationType;
          title: string;
          message: string;
          action_url: string | null;
          action_label: string | null;
          related_entity_type: string | null;
          related_entity_id: string | null;
          read_at: string | null;
          dismissed_at: string | null;
          scheduled_for: string | null;
          expires_at: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          church_id?: string | null;
          type?: NotificationType;
          title: string;
          message: string;
          action_url?: string | null;
          action_label?: string | null;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
          read_at?: string | null;
          dismissed_at?: string | null;
          scheduled_for?: string | null;
          expires_at?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          read_at?: string | null;
          dismissed_at?: string | null;
        };
      };
      feature_flags: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_enabled: boolean;
          target_churches: string[] | null;
          target_plans: SubscriptionPlan[] | null;
          rollout_percentage: number;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_enabled?: boolean;
          target_churches?: string[] | null;
          target_plans?: SubscriptionPlan[] | null;
          rollout_percentage?: number;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          is_enabled?: boolean;
          target_churches?: string[] | null;
          target_plans?: SubscriptionPlan[] | null;
          rollout_percentage?: number;
          metadata?: Record<string, unknown>;
          updated_at?: string;
        };
      };
      system_settings: {
        Row: {
          id: string;
          key: string;
          value: Record<string, unknown>;
          description: string | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: Record<string, unknown>;
          description?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          value?: Record<string, unknown>;
          description?: string | null;
          is_public?: boolean;
          updated_at?: string;
        };
      };
      usage_metrics: {
        Row: {
          id: string;
          church_id: string;
          metric_name: string;
          metric_value: number;
          period_start: string;
          period_end: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          church_id: string;
          metric_name: string;
          metric_value: number;
          period_start: string;
          period_end: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: never;
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          address: string | null;
          email: string | null;
          phone: string | null;
          website: string | null;
          logo: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          address?: string | null;
          email?: string | null;
          phone?: string | null;
          website?: string | null;
          logo?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          address?: string | null;
          email?: string | null;
          phone?: string | null;
          website?: string | null;
          logo?: string | null;
          updated_at?: string;
        };
      };
      memberships: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string;
          role: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id: string;
          role?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          role?: string;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          avatar: string | null;
          type: string;
          ministry_id: string | null;
          created_by: string;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          avatar?: string | null;
          type?: string;
          ministry_id?: string | null;
          created_by: string;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          avatar?: string | null;
          type?: string;
          ministry_id?: string | null;
          is_archived?: boolean;
          updated_at?: string;
        };
      };
      conversation_participants: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          last_read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          last_read_at?: string | null;
          created_at?: string;
        };
        Update: {
          last_read_at?: string | null;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          message_type: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          message_type?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          message_type?: string;
          updated_at?: string;
        };
      };
    };
    Functions: {
      user_belongs_to_church: {
        Args: { p_church_id: string };
        Returns: boolean;
      };
      user_is_admin_of_church: {
        Args: { p_church_id: string };
        Returns: boolean;
      };
      user_is_staff_or_higher: {
        Args: { p_church_id: string };
        Returns: boolean;
      };
      get_user_church_ids: {
        Args: Record<string, never>;
        Returns: string[];
      };
      get_or_create_profile: {
        Args: { p_user_id: string; p_church_id: string; p_profile_type?: ProfileType };
        Returns: string;
      };
      add_user_to_church: {
        Args: { p_user_id: string; p_church_id: string; p_role?: ChurchRole; p_invited_by?: string };
        Returns: string;
      };
    };
  };
};

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
