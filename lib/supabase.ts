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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          avatar: string | null;
          phone: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          avatar?: string | null;
          phone?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          avatar?: string | null;
          phone?: string | null;
          role?: string;
          updated_at?: string;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          logo: string | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          website: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          logo?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          logo?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          updated_at?: string;
        };
      };
      memberships: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string;
          role: string;
          joined_at: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id: string;
          role?: string;
          joined_at?: string;
          is_active?: boolean;
        };
        Update: {
          role?: string;
          is_active?: boolean;
        };
      };
      ministries: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          color: string;
          icon: string;
          image: string | null;
          member_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          color: string;
          icon: string;
          image?: string | null;
          member_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          color?: string;
          icon?: string;
          image?: string | null;
          member_count?: number;
          updated_at?: string;
        };
      };
      ministry_members: {
        Row: {
          id: string;
          ministry_id: string;
          user_id: string;
          role: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          ministry_id: string;
          user_id: string;
          role?: string;
          joined_at?: string;
        };
        Update: {
          role?: string;
        };
      };
      events: {
        Row: {
          id: string;
          organization_id: string;
          ministry_id: string | null;
          title: string;
          description: string | null;
          date: string;
          time: string;
          location: string | null;
          attendees: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          ministry_id?: string | null;
          title: string;
          description?: string | null;
          date: string;
          time: string;
          location?: string | null;
          attendees?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          date?: string;
          time?: string;
          location?: string | null;
          attendees?: number;
          updated_at?: string;
        };
      };
      announcements: {
        Row: {
          id: string;
          organization_id: string;
          ministry_id: string | null;
          title: string;
          content: string;
          author_id: string;
          author_name: string;
          author_role: string;
          author_avatar: string | null;
          date: string;
          priority: string;
          is_pinned: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          ministry_id?: string | null;
          title: string;
          content: string;
          author_id: string;
          author_name: string;
          author_role: string;
          author_avatar?: string | null;
          date?: string;
          priority?: string;
          is_pinned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          content?: string;
          priority?: string;
          is_pinned?: boolean;
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
          type: string;
          ministry_id?: string | null;
          created_by: string;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          avatar?: string | null;
          is_archived?: boolean;
          updated_at?: string;
        };
      };
      conversation_participants: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          joined_at: string;
          last_read_at: string | null;
          role: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          joined_at?: string;
          last_read_at?: string | null;
          role?: string;
        };
        Update: {
          last_read_at?: string | null;
          role?: string;
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
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          message_type?: string;
          created_at?: string;
        };
        Update: {
          content?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string | null;
          title: string;
          message: string;
          type: string;
          is_read: boolean;
          data: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id?: string | null;
          title: string;
          message: string;
          type: string;
          is_read?: boolean;
          data?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
        };
      };
      donations: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string;
          type: string;
          amount: number;
          currency: string;
          frequency: string;
          note: string | null;
          status: string;
          payment_method: string | null;
          transaction_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id: string;
          type: string;
          amount: number;
          currency?: string;
          frequency: string;
          note?: string | null;
          status?: string;
          payment_method?: string | null;
          transaction_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: string;
          updated_at?: string;
        };
      };
      songs: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          artist: string | null;
          cover_image: string | null;
          duration: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          artist?: string | null;
          cover_image?: string | null;
          duration?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          artist?: string | null;
          cover_image?: string | null;
          duration?: number;
          updated_at?: string;
        };
      };
    };
  };
};
