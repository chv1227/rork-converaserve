/* eslint-disable */
// AUTO-GENERATED — DO NOT EDIT
// Run migrations to regenerate.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_profiles: {
        Row: {
          admin_level: number | null
          can_manage_billing: boolean | null
          can_manage_content: boolean | null
          can_manage_users: boolean | null
          created_at: string | null
          profile_id: string
          system_notes: string | null
          updated_at: string | null
        }
        Insert: {
          admin_level?: number | null
          can_manage_billing?: boolean | null
          can_manage_content?: boolean | null
          can_manage_users?: boolean | null
          created_at?: string | null
          profile_id: string
          system_notes?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_level?: number | null
          can_manage_billing?: boolean | null
          can_manage_content?: boolean | null
          can_manage_users?: boolean | null
          created_at?: string | null
          profile_id?: string
          system_notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          allow_comments: boolean | null
          church_id: string
          content: string
          created_at: string | null
          created_by_profile_id: string | null
          excerpt: string | null
          expire_at: string | null
          id: string
          image_url: string | null
          is_pinned: boolean | null
          ministry_id: string | null
          priority: Database["public"]["Enums"]["announcement_priority"] | null
          publish_at: string | null
          status: Database["public"]["Enums"]["announcement_status"] | null
          target_ministries: string[] | null
          target_roles: Database["public"]["Enums"]["church_role"][] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          allow_comments?: boolean | null
          church_id: string
          content: string
          created_at?: string | null
          created_by_profile_id?: string | null
          excerpt?: string | null
          expire_at?: string | null
          id?: string
          image_url?: string | null
          is_pinned?: boolean | null
          ministry_id?: string | null
          priority?: Database["public"]["Enums"]["announcement_priority"] | null
          publish_at?: string | null
          status?: Database["public"]["Enums"]["announcement_status"] | null
          target_ministries?: string[] | null
          target_roles?: Database["public"]["Enums"]["church_role"][] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          allow_comments?: boolean | null
          church_id?: string
          content?: string
          created_at?: string | null
          created_by_profile_id?: string | null
          excerpt?: string | null
          expire_at?: string | null
          id?: string
          image_url?: string | null
          is_pinned?: boolean | null
          ministry_id?: string | null
          priority?: Database["public"]["Enums"]["announcement_priority"] | null
          publish_at?: string | null
          status?: Database["public"]["Enums"]["announcement_status"] | null
          target_ministries?: string[] | null
          target_roles?: Database["public"]["Enums"]["church_role"][] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          attendance_date: string | null
          check_in_time: string | null
          check_out_time: string | null
          checked_in_by: string | null
          church_id: string
          created_at: string | null
          event_id: string | null
          id: string
          notes: string | null
          profile_id: string
          service_type: string | null
          status: Database["public"]["Enums"]["attendance_status"] | null
        }
        Insert: {
          attendance_date?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          checked_in_by?: string | null
          church_id: string
          created_at?: string | null
          event_id?: string | null
          id?: string
          notes?: string | null
          profile_id: string
          service_type?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
        }
        Update: {
          attendance_date?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          checked_in_by?: string | null
          church_id?: string
          created_at?: string | null
          event_id?: string | null
          id?: string
          notes?: string | null
          profile_id?: string
          service_type?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          church_id: string | null
          created_at: string | null
          description: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          request_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          church_id?: string | null
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          request_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          church_id?: string | null
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          request_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      churches: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          banner_url: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          deleted_at: string | null
          denomination: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          owner_user_id: string | null
          postal_code: string | null
          settings: Json | null
          slug: string | null
          state: string | null
          status: Database["public"]["Enums"]["church_status"] | null
          subscription_expires_at: string | null
          subscription_plan:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          timezone: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          banner_url?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          deleted_at?: string | null
          denomination?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_user_id?: string | null
          postal_code?: string | null
          settings?: Json | null
          slug?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["church_status"] | null
          subscription_expires_at?: string | null
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          banner_url?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          deleted_at?: string | null
          denomination?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_user_id?: string | null
          postal_code?: string | null
          settings?: Json | null
          slug?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["church_status"] | null
          subscription_expires_at?: string | null
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "churches_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string | null
          last_read_at: string | null
          profile_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          profile_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          church_id: string | null
          created_at: string | null
          id: string
          is_group: boolean | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          church_id?: string | null
          created_at?: string | null
          id?: string
          is_group?: boolean | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          church_id?: string | null
          created_at?: string | null
          id?: string
          is_group?: boolean | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          discussion_id: string
          id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          discussion_id: string
          id?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          discussion_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_comments_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      discussions: {
        Row: {
          author_id: string
          church_id: string
          comment_count: number | null
          content: string
          created_at: string | null
          id: string
          is_pinned: boolean | null
          like_count: number | null
          ministry_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          church_id: string
          comment_count?: number | null
          content: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          like_count?: number | null
          ministry_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          church_id?: string
          comment_count?: number | null
          content?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          like_count?: number | null
          ministry_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discussions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussions_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussions_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          allowed_roles: Database["public"]["Enums"]["church_role"][] | null
          church_id: string
          created_at: string | null
          description: string | null
          document_type: Database["public"]["Enums"]["document_type"] | null
          file_size: number | null
          file_url: string
          folder_path: string | null
          id: string
          is_public: boolean | null
          mime_type: string | null
          name: string
          related_event_id: string | null
          related_ministry_id: string | null
          tags: string[] | null
          updated_at: string | null
          uploaded_by_profile_id: string | null
        }
        Insert: {
          allowed_roles?: Database["public"]["Enums"]["church_role"][] | null
          church_id: string
          created_at?: string | null
          description?: string | null
          document_type?: Database["public"]["Enums"]["document_type"] | null
          file_size?: number | null
          file_url: string
          folder_path?: string | null
          id?: string
          is_public?: boolean | null
          mime_type?: string | null
          name: string
          related_event_id?: string | null
          related_ministry_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
          uploaded_by_profile_id?: string | null
        }
        Update: {
          allowed_roles?: Database["public"]["Enums"]["church_role"][] | null
          church_id?: string
          created_at?: string | null
          description?: string | null
          document_type?: Database["public"]["Enums"]["document_type"] | null
          file_size?: number | null
          file_url?: string
          folder_path?: string | null
          id?: string
          is_public?: boolean | null
          mime_type?: string | null
          name?: string
          related_event_id?: string | null
          related_ministry_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
          uploaded_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_related_ministry_id_fkey"
            columns: ["related_ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_profile_id_fkey"
            columns: ["uploaded_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount: number
          church_id: string
          created_at: string | null
          frequency: Database["public"]["Enums"]["giving_frequency"] | null
          id: string
          note: string | null
          payment_method: string | null
          profile_id: string
          status: Database["public"]["Enums"]["donation_status"] | null
          transaction_id: string | null
          type: Database["public"]["Enums"]["giving_type"]
          updated_at: string | null
        }
        Insert: {
          amount: number
          church_id: string
          created_at?: string | null
          frequency?: Database["public"]["Enums"]["giving_frequency"] | null
          id?: string
          note?: string | null
          payment_method?: string | null
          profile_id: string
          status?: Database["public"]["Enums"]["donation_status"] | null
          transaction_id?: string | null
          type: Database["public"]["Enums"]["giving_type"]
          updated_at?: string | null
        }
        Update: {
          amount?: number
          church_id?: string
          created_at?: string | null
          frequency?: Database["public"]["Enums"]["giving_frequency"] | null
          id?: string
          note?: string | null
          payment_method?: string | null
          profile_id?: string
          status?: Database["public"]["Enums"]["donation_status"] | null
          transaction_id?: string | null
          type?: Database["public"]["Enums"]["giving_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donations_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          created_at: string | null
          event_id: string
          guest_count: number | null
          id: string
          notes: string | null
          profile_id: string
          registered_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          guest_count?: number | null
          id?: string
          notes?: string | null
          profile_id: string
          registered_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          guest_count?: number | null
          id?: string
          notes?: string | null
          profile_id?: string
          registered_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          all_day: boolean | null
          church_id: string
          color: string | null
          created_at: string | null
          created_by_profile_id: string | null
          description: string | null
          end_datetime: string | null
          event_type: Database["public"]["Enums"]["event_type"] | null
          id: string
          image_url: string | null
          is_online: boolean | null
          is_recurring: boolean | null
          location_address: string | null
          location_name: string | null
          max_attendees: number | null
          ministry_id: string | null
          online_url: string | null
          parent_event_id: string | null
          recurrence_end_date: string | null
          recurrence_rule: string | null
          registration_deadline: string | null
          requires_registration: boolean | null
          settings: Json | null
          start_datetime: string
          status: Database["public"]["Enums"]["event_status"] | null
          timezone: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          all_day?: boolean | null
          church_id: string
          color?: string | null
          created_at?: string | null
          created_by_profile_id?: string | null
          description?: string | null
          end_datetime?: string | null
          event_type?: Database["public"]["Enums"]["event_type"] | null
          id?: string
          image_url?: string | null
          is_online?: boolean | null
          is_recurring?: boolean | null
          location_address?: string | null
          location_name?: string | null
          max_attendees?: number | null
          ministry_id?: string | null
          online_url?: string | null
          parent_event_id?: string | null
          recurrence_end_date?: string | null
          recurrence_rule?: string | null
          registration_deadline?: string | null
          requires_registration?: boolean | null
          settings?: Json | null
          start_datetime: string
          status?: Database["public"]["Enums"]["event_status"] | null
          timezone?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          all_day?: boolean | null
          church_id?: string
          color?: string | null
          created_at?: string | null
          created_by_profile_id?: string | null
          description?: string | null
          end_datetime?: string | null
          event_type?: Database["public"]["Enums"]["event_type"] | null
          id?: string
          image_url?: string | null
          is_online?: boolean | null
          is_recurring?: boolean | null
          location_address?: string | null
          location_name?: string | null
          max_attendees?: number | null
          ministry_id?: string | null
          online_url?: string | null
          parent_event_id?: string | null
          recurrence_end_date?: string | null
          recurrence_rule?: string | null
          registration_deadline?: string | null
          requires_registration?: boolean | null
          settings?: Json | null
          start_datetime?: string
          status?: Database["public"]["Enums"]["event_status"] | null
          timezone?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_enabled: boolean | null
          metadata: Json | null
          name: string
          rollout_percentage: number | null
          target_churches: string[] | null
          target_plans:
            | Database["public"]["Enums"]["subscription_plan"][]
            | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          metadata?: Json | null
          name: string
          rollout_percentage?: number | null
          target_churches?: string[] | null
          target_plans?:
            | Database["public"]["Enums"]["subscription_plan"][]
            | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          metadata?: Json | null
          name?: string
          rollout_percentage?: number | null
          target_churches?: string[] | null
          target_plans?:
            | Database["public"]["Enums"]["subscription_plan"][]
            | null
          updated_at?: string | null
        }
        Relationships: []
      }
      form_responses: {
        Row: {
          church_id: string
          created_at: string | null
          form_id: string
          id: string
          profile_id: string | null
          responses: Json | null
          submitted_at: string | null
        }
        Insert: {
          church_id: string
          created_at?: string | null
          form_id: string
          id?: string
          profile_id?: string | null
          responses?: Json | null
          submitted_at?: string | null
        }
        Update: {
          church_id?: string
          created_at?: string | null
          form_id?: string
          id?: string
          profile_id?: string | null
          responses?: Json | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          allow_multiple_responses: boolean | null
          church_id: string
          created_at: string | null
          created_by_profile_id: string | null
          description: string | null
          fields: Json | null
          form_type: Database["public"]["Enums"]["form_type"] | null
          id: string
          is_active: boolean | null
          is_public: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          allow_multiple_responses?: boolean | null
          church_id: string
          created_at?: string | null
          created_by_profile_id?: string | null
          description?: string | null
          fields?: Json | null
          form_type?: Database["public"]["Enums"]["form_type"] | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          allow_multiple_responses?: boolean | null
          church_id?: string
          created_at?: string | null
          created_by_profile_id?: string | null
          description?: string | null
          fields?: Json | null
          form_type?: Database["public"]["Enums"]["form_type"] | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forms_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forms_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_notes: {
        Row: {
          church_id: string
          content: string
          created_at: string | null
          created_by_profile_id: string | null
          follow_up_date: string | null
          id: string
          is_follow_up_required: boolean | null
          is_sensitive: boolean | null
          note_type: string | null
          related_event_id: string | null
          related_ministry_id: string | null
          related_profile_id: string | null
          title: string | null
          updated_at: string | null
          visibility: Database["public"]["Enums"]["note_visibility"] | null
        }
        Insert: {
          church_id: string
          content: string
          created_at?: string | null
          created_by_profile_id?: string | null
          follow_up_date?: string | null
          id?: string
          is_follow_up_required?: boolean | null
          is_sensitive?: boolean | null
          note_type?: string | null
          related_event_id?: string | null
          related_ministry_id?: string | null
          related_profile_id?: string | null
          title?: string | null
          updated_at?: string | null
          visibility?: Database["public"]["Enums"]["note_visibility"] | null
        }
        Update: {
          church_id?: string
          content?: string
          created_at?: string | null
          created_by_profile_id?: string | null
          follow_up_date?: string | null
          id?: string
          is_follow_up_required?: boolean | null
          is_sensitive?: boolean | null
          note_type?: string | null
          related_event_id?: string | null
          related_ministry_id?: string | null
          related_profile_id?: string | null
          title?: string | null
          updated_at?: string | null
          visibility?: Database["public"]["Enums"]["note_visibility"] | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_notes_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_notes_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_notes_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_notes_related_ministry_id_fkey"
            columns: ["related_ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_notes_related_profile_id_fkey"
            columns: ["related_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_profiles: {
        Row: {
          baptism_date: string | null
          confirmation_date: string | null
          created_at: string | null
          family_id: string | null
          family_role: string | null
          how_heard: string | null
          join_date: string | null
          member_number: string | null
          membership_status:
            | Database["public"]["Enums"]["membership_status"]
            | null
          previous_church: string | null
          profile_id: string
          updated_at: string | null
        }
        Insert: {
          baptism_date?: string | null
          confirmation_date?: string | null
          created_at?: string | null
          family_id?: string | null
          family_role?: string | null
          how_heard?: string | null
          join_date?: string | null
          member_number?: string | null
          membership_status?:
            | Database["public"]["Enums"]["membership_status"]
            | null
          previous_church?: string | null
          profile_id: string
          updated_at?: string | null
        }
        Update: {
          baptism_date?: string | null
          confirmation_date?: string | null
          created_at?: string | null
          family_id?: string | null
          family_role?: string | null
          how_heard?: string | null
          join_date?: string | null
          member_number?: string | null
          membership_status?:
            | Database["public"]["Enums"]["membership_status"]
            | null
          previous_church?: string | null
          profile_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ministries: {
        Row: {
          church_id: string
          color: string | null
          contact_email: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_public: boolean | null
          leader_profile_id: string | null
          max_members: number | null
          meeting_location: string | null
          meeting_schedule: string | null
          ministry_type: string | null
          name: string
          requires_approval: boolean | null
          settings: Json | null
          status: Database["public"]["Enums"]["ministry_status"] | null
          updated_at: string | null
        }
        Insert: {
          church_id: string
          color?: string | null
          contact_email?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_public?: boolean | null
          leader_profile_id?: string | null
          max_members?: number | null
          meeting_location?: string | null
          meeting_schedule?: string | null
          ministry_type?: string | null
          name: string
          requires_approval?: boolean | null
          settings?: Json | null
          status?: Database["public"]["Enums"]["ministry_status"] | null
          updated_at?: string | null
        }
        Update: {
          church_id?: string
          color?: string | null
          contact_email?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_public?: boolean | null
          leader_profile_id?: string | null
          max_members?: number | null
          meeting_location?: string | null
          meeting_schedule?: string | null
          ministry_type?: string | null
          name?: string
          requires_approval?: boolean | null
          settings?: Json | null
          status?: Database["public"]["Enums"]["ministry_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ministries_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministries_leader_profile_id_fkey"
            columns: ["leader_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ministry_members: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          joined_at: string | null
          ministry_id: string
          profile_id: string
          role: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          ministry_id: string
          profile_id: string
          role?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          ministry_id?: string
          profile_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ministry_members_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministry_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      poll_options: {
        Row: {
          created_at: string | null
          id: string
          poll_id: string
          text: string
          voter_ids: string[] | null
          votes: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          poll_id: string
          text: string
          voter_ids?: string[] | null
          votes?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          poll_id?: string
          text?: string
          voter_ids?: string[] | null
          votes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          id: string
          option_id: string
          poll_id: string
          profile_id: string
          voted_at: string | null
        }
        Insert: {
          id?: string
          option_id: string
          poll_id: string
          profile_id: string
          voted_at?: string | null
        }
        Update: {
          id?: string
          option_id?: string
          poll_id?: string
          profile_id?: string
          voted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          allow_multiple: boolean | null
          church_id: string
          closed_at: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          id: string
          is_active: boolean | null
          is_anonymous: boolean | null
          ministry_id: string | null
          question: string
          updated_at: string | null
        }
        Insert: {
          allow_multiple?: boolean | null
          church_id: string
          closed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          is_active?: boolean | null
          is_anonymous?: boolean | null
          ministry_id?: string | null
          question: string
          updated_at?: string | null
        }
        Update: {
          allow_multiple?: boolean | null
          church_id?: string
          closed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          is_active?: boolean | null
          is_anonymous?: boolean | null
          ministry_id?: string | null
          question?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "polls_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_interactions: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          prayed_at: string | null
          prayer_request_id: string
          profile_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          prayed_at?: string | null
          prayer_request_id: string
          profile_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          prayed_at?: string | null
          prayer_request_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_interactions_prayer_request_id_fkey"
            columns: ["prayer_request_id"]
            isOneToOne: false
            referencedRelation: "prayer_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_interactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_requests: {
        Row: {
          answer_testimony: string | null
          answered_at: string | null
          church_id: string
          content: string
          created_at: string | null
          id: string
          is_anonymous: boolean | null
          is_public: boolean | null
          prayer_count: number | null
          profile_id: string
          status: Database["public"]["Enums"]["prayer_request_status"] | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          answer_testimony?: string | null
          answered_at?: string | null
          church_id: string
          content: string
          created_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_public?: boolean | null
          prayer_count?: number | null
          profile_id: string
          status?: Database["public"]["Enums"]["prayer_request_status"] | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          answer_testimony?: string | null
          answered_at?: string | null
          church_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_public?: boolean | null
          prayer_count?: number | null
          profile_id?: string
          status?: Database["public"]["Enums"]["prayer_request_status"] | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prayer_requests_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          avatar_url: string | null
          bio: string | null
          church_id: string
          city: string | null
          created_at: string | null
          custom_fields: Json | null
          date_of_birth: string | null
          display_name: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          gender: string | null
          id: string
          is_public: boolean | null
          marital_status: string | null
          phone: string | null
          postal_code: string | null
          profile_type: Database["public"]["Enums"]["profile_type"]
          secondary_email: string | null
          state: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          bio?: string | null
          church_id: string
          city?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          date_of_birth?: string | null
          display_name?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          gender?: string | null
          id?: string
          is_public?: boolean | null
          marital_status?: string | null
          phone?: string | null
          postal_code?: string | null
          profile_type?: Database["public"]["Enums"]["profile_type"]
          secondary_email?: string | null
          state?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          bio?: string | null
          church_id?: string
          city?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          date_of_birth?: string | null
          display_name?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          gender?: string | null
          id?: string
          is_public?: boolean | null
          marital_status?: string | null
          phone?: string | null
          postal_code?: string | null
          profile_type?: Database["public"]["Enums"]["profile_type"]
          secondary_email?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_giving: {
        Row: {
          amount: number
          church_id: string
          created_at: string | null
          frequency: Database["public"]["Enums"]["giving_frequency"]
          id: string
          is_active: boolean | null
          next_date: string
          note: string | null
          profile_id: string
          type: Database["public"]["Enums"]["giving_type"]
          updated_at: string | null
        }
        Insert: {
          amount: number
          church_id: string
          created_at?: string | null
          frequency: Database["public"]["Enums"]["giving_frequency"]
          id?: string
          is_active?: boolean | null
          next_date: string
          note?: string | null
          profile_id: string
          type: Database["public"]["Enums"]["giving_type"]
          updated_at?: string | null
        }
        Update: {
          amount?: number
          church_id?: string
          created_at?: string | null
          frequency?: Database["public"]["Enums"]["giving_frequency"]
          id?: string
          is_active?: boolean | null
          next_date?: string
          note?: string | null
          profile_id?: string
          type?: Database["public"]["Enums"]["giving_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_giving_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_giving_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      song_audio_parts: {
        Row: {
          audio_url: string
          created_at: string | null
          id: string
          part_name: string
          song_id: string
        }
        Insert: {
          audio_url: string
          created_at?: string | null
          id?: string
          part_name: string
          song_id: string
        }
        Update: {
          audio_url?: string
          created_at?: string | null
          id?: string
          part_name?: string
          song_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "song_audio_parts_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      song_lyrics: {
        Row: {
          content: string
          created_at: string | null
          id: string
          song_id: string
          timestamp_ms: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          song_id: string
          timestamp_ms?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          song_id?: string
          timestamp_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "song_lyrics_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      songs: {
        Row: {
          artist: string | null
          audio_url: string | null
          church_id: string
          cover_image: string | null
          created_at: string | null
          created_by: string | null
          duration: number
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          artist?: string | null
          audio_url?: string | null
          church_id: string
          cover_image?: string | null
          created_at?: string | null
          created_by?: string | null
          duration?: number
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          artist?: string | null
          audio_url?: string | null
          church_id?: string
          cover_image?: string | null
          created_at?: string | null
          created_by?: string | null
          duration?: number
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "songs_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "songs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          created_at: string | null
          department: string | null
          employment_status: string | null
          hire_date: string | null
          office_hours: string | null
          office_location: string | null
          profile_id: string
          supervisor_profile_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          employment_status?: string | null
          hire_date?: string | null
          office_hours?: string | null
          office_location?: string | null
          profile_id: string
          supervisor_profile_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          employment_status?: string | null
          hire_date?: string | null
          office_hours?: string | null
          office_location?: string | null
          profile_id?: string
          supervisor_profile_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_profiles_supervisor_profile_id_fkey"
            columns: ["supervisor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          church_id: string | null
          created_at: string | null
          dismissed_at: string | null
          expires_at: string | null
          id: string
          message: string
          metadata: Json | null
          read_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          scheduled_for: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"] | null
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          church_id?: string | null
          created_at?: string | null
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          scheduled_for?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"] | null
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          church_id?: string | null
          created_at?: string | null
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          scheduled_for?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_notifications_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      tenant_settings: {
        Row: {
          church_id: string
          created_at: string | null
          description: string | null
          id: string
          is_secret: boolean | null
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          church_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_secret?: boolean | null
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          church_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_secret?: boolean | null
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_metrics: {
        Row: {
          church_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          metric_name: string
          metric_value: number
          period_end: string
          period_start: string
        }
        Insert: {
          church_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_value: number
          period_end: string
          period_start: string
        }
        Update: {
          church_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_value?: number
          period_end?: string
          period_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_metrics_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_church_roles: {
        Row: {
          accepted_at: string | null
          church_id: string
          created_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean | null
          permissions_override: Json | null
          role: Database["public"]["Enums"]["church_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          church_id: string
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          permissions_override?: Json | null
          role?: Database["public"]["Enums"]["church_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          church_id?: string
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          permissions_override?: Json | null
          role?: Database["public"]["Enums"]["church_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_church_roles_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_church_roles_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_church_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          email_verified: boolean | null
          full_name: string | null
          id: string
          last_login_at: string | null
          phone: string | null
          status: Database["public"]["Enums"]["user_status"] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          email_verified?: boolean | null
          full_name?: string | null
          id: string
          last_login_at?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      volunteer_profiles: {
        Row: {
          availability: Json | null
          background_check_date: string | null
          background_check_status: string | null
          created_at: string | null
          interests: string[] | null
          profile_id: string
          skills: string[] | null
          total_volunteer_hours: number | null
          training_completed: Json | null
          updated_at: string | null
        }
        Insert: {
          availability?: Json | null
          background_check_date?: string | null
          background_check_status?: string | null
          created_at?: string | null
          interests?: string[] | null
          profile_id: string
          skills?: string[] | null
          total_volunteer_hours?: number | null
          training_completed?: Json | null
          updated_at?: string | null
        }
        Update: {
          availability?: Json | null
          background_check_date?: string | null
          background_check_status?: string | null
          created_at?: string | null
          interests?: string[] | null
          profile_id?: string
          skills?: string[] | null
          total_volunteer_hours?: number | null
          training_completed?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_user_to_church: {
        Args: {
          p_church_id: string
          p_invited_by?: string
          p_role?: Database["public"]["Enums"]["church_role"]
          p_user_id: string
        }
        Returns: string
      }
      create_audit_log: {
        Args: {
          p_action: Database["public"]["Enums"]["audit_action"]
          p_church_id: string
          p_description?: string
          p_entity_id?: string
          p_entity_type: string
          p_new_data?: Json
          p_old_data?: Json
          p_user_id: string
        }
        Returns: string
      }
      get_or_create_profile: {
        Args: {
          p_church_id: string
          p_profile_type?: Database["public"]["Enums"]["profile_type"]
          p_user_id: string
        }
        Returns: string
      }
      get_system_setting: {
        Args: { p_default?: Json; p_key: string }
        Returns: Json
      }
      get_tenant_setting: {
        Args: { p_church_id: string; p_default?: Json; p_key: string }
        Returns: Json
      }
      get_user_church_ids: { Args: never; Returns: string[] }
      get_user_church_role: {
        Args: { p_church_id: string; p_user_id: string }
        Returns: Database["public"]["Enums"]["church_role"]
      }
      is_admin_of_church: { Args: { p_church_id: string }; Returns: boolean }
      is_feature_enabled: {
        Args: { p_church_id?: string; p_feature_name: string }
        Returns: boolean
      }
      mark_all_notifications_read: {
        Args: { p_church_id?: string; p_user_id: string }
        Returns: number
      }
      mark_notification_read: {
        Args: { p_notification_id: string; p_user_id: string }
        Returns: undefined
      }
      send_notification: {
        Args: {
          p_action_url?: string
          p_church_id?: string
          p_message: string
          p_metadata?: Json
          p_title: string
          p_type?: Database["public"]["Enums"]["notification_type"]
          p_user_id: string
        }
        Returns: string
      }
      set_tenant_setting: {
        Args: {
          p_church_id: string
          p_description?: string
          p_key: string
          p_value: Json
        }
        Returns: undefined
      }
      user_belongs_to_church: {
        Args: { p_church_id: string }
        Returns: boolean
      }
      user_has_church_role: {
        Args: {
          p_church_id: string
          p_roles?: Database["public"]["Enums"]["church_role"][]
          p_user_id: string
        }
        Returns: boolean
      }
      user_is_admin_of_church: {
        Args: { p_church_id: string }
        Returns: boolean
      }
      user_is_church_admin: {
        Args: { p_church_id: string; p_user_id: string }
        Returns: boolean
      }
      user_is_staff_or_higher: {
        Args: { p_church_id: string }
        Returns: boolean
      }
    }
    Enums: {
      announcement_priority: "low" | "normal" | "high" | "urgent"
      announcement_status: "draft" | "published" | "archived"
      attendance_status: "present" | "absent" | "late" | "excused"
      audit_action:
        | "create"
        | "read"
        | "update"
        | "delete"
        | "login"
        | "logout"
        | "signup"
        | "join"
        | "leave"
        | "invite"
        | "approve"
        | "reject"
        | "suspend"
        | "export"
        | "import"
        | "other"
      church_role:
        | "owner"
        | "admin"
        | "pastor"
        | "staff"
        | "volunteer"
        | "member"
        | "guest"
      church_status:
        | "active"
        | "inactive"
        | "suspended"
        | "archived"
        | "pending"
      document_type: "document" | "image" | "video" | "audio" | "other"
      donation_status: "pending" | "completed" | "failed" | "refunded"
      event_status: "draft" | "published" | "cancelled" | "completed"
      event_type:
        | "service"
        | "meeting"
        | "class"
        | "social"
        | "outreach"
        | "conference"
        | "other"
      form_type: "registration" | "volunteer" | "prayer" | "general"
      giving_frequency: "one_time" | "weekly" | "bi_weekly" | "monthly"
      giving_type: "tithe" | "offering" | "special"
      membership_status:
        | "active"
        | "inactive"
        | "pending"
        | "transferred"
        | "deceased"
      ministry_status: "active" | "inactive" | "archived"
      note_visibility: "private" | "staff" | "leadership" | "public"
      notification_type:
        | "info"
        | "success"
        | "warning"
        | "error"
        | "invitation"
        | "reminder"
        | "announcement"
        | "message"
        | "prayer"
        | "event"
        | "other"
      prayer_request_status: "active" | "answered" | "archived"
      profile_type: "admin" | "pastor" | "staff" | "volunteer" | "member"
      subscription_plan:
        | "free"
        | "basic"
        | "standard"
        | "premium"
        | "enterprise"
      user_status: "active" | "inactive" | "suspended" | "pending"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      announcement_priority: ["low", "normal", "high", "urgent"],
      announcement_status: ["draft", "published", "archived"],
      attendance_status: ["present", "absent", "late", "excused"],
      audit_action: [
        "create",
        "read",
        "update",
        "delete",
        "login",
        "logout",
        "signup",
        "join",
        "leave",
        "invite",
        "approve",
        "reject",
        "suspend",
        "export",
        "import",
        "other",
      ],
      church_role: [
        "owner",
        "admin",
        "pastor",
        "staff",
        "volunteer",
        "member",
        "guest",
      ],
      church_status: ["active", "inactive", "suspended", "archived", "pending"],
      document_type: ["document", "image", "video", "audio", "other"],
      donation_status: ["pending", "completed", "failed", "refunded"],
      event_status: ["draft", "published", "cancelled", "completed"],
      event_type: [
        "service",
        "meeting",
        "class",
        "social",
        "outreach",
        "conference",
        "other",
      ],
      form_type: ["registration", "volunteer", "prayer", "general"],
      giving_frequency: ["one_time", "weekly", "bi_weekly", "monthly"],
      giving_type: ["tithe", "offering", "special"],
      membership_status: [
        "active",
        "inactive",
        "pending",
        "transferred",
        "deceased",
      ],
      ministry_status: ["active", "inactive", "archived"],
      note_visibility: ["private", "staff", "leadership", "public"],
      notification_type: [
        "info",
        "success",
        "warning",
        "error",
        "invitation",
        "reminder",
        "announcement",
        "message",
        "prayer",
        "event",
        "other",
      ],
      prayer_request_status: ["active", "answered", "archived"],
      profile_type: ["admin", "pastor", "staff", "volunteer", "member"],
      subscription_plan: ["free", "basic", "standard", "premium", "enterprise"],
      user_status: ["active", "inactive", "suspended", "pending"],
    },
  },
} as const
