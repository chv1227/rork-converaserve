import { useState, useEffect, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useAuth } from "@/providers/AuthProvider";
import { Ministry, Event, Announcement, Conversation } from "@/types";
import { 
  events as mockEvents, 
  announcements as mockAnnouncements,
  conversations as mockConversations,
} from "@/mocks/data";

const MINISTRIES_KEY = "app_ministries_v2";
const EVENTS_KEY = "app_events_v1";
const ANNOUNCEMENTS_KEY = "app_announcements_v1";
const CONVERSATIONS_KEY = "app_conversations_v1";
const MINISTRY_MEMBERSHIPS_KEY = "app_ministry_memberships_v1";

interface MinistryMembership {
  ministryId: string;
  userId: string;
  role: 'member' | 'leader' | 'admin';
  joinedAt: string;
}

interface DataState {
  ministries: Ministry[];
  events: Event[];
  announcements: Announcement[];
  conversations: Conversation[];
  ministryMemberships: MinistryMembership[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
}

export const [DataProvider, useData] = createContextHook(() => {
  const { currentOrganization, user } = useAuth();
  const [state, setState] = useState<DataState>({
    ministries: [],
    events: [],
    announcements: [],
    conversations: [],
    ministryMemberships: [],
    isLoading: true,
    isRefreshing: false,
    error: null,
  });

  useEffect(() => {
    const loadData = async () => {
      console.log("DataProvider: Loading data for organization:", currentOrganization?.id);
      setState(prev => ({ ...prev, isLoading: true }));

      try {
        const [
          storedMinistries,
          storedEvents,
          storedAnnouncements,
          storedConversations,
          storedMemberships,
        ] = await Promise.all([
          AsyncStorage.getItem(MINISTRIES_KEY),
          AsyncStorage.getItem(EVENTS_KEY),
          AsyncStorage.getItem(ANNOUNCEMENTS_KEY),
          AsyncStorage.getItem(CONVERSATIONS_KEY),
          AsyncStorage.getItem(MINISTRY_MEMBERSHIPS_KEY),
        ]);

        let ministries: Ministry[] = storedMinistries ? JSON.parse(storedMinistries) : [];
        let events: Event[] = storedEvents ? JSON.parse(storedEvents) : mockEvents;
        let announcements: Announcement[] = storedAnnouncements ? JSON.parse(storedAnnouncements) : mockAnnouncements;
        let conversations: Conversation[] = storedConversations ? JSON.parse(storedConversations) : mockConversations;
        let memberships: MinistryMembership[] = storedMemberships ? JSON.parse(storedMemberships) : [];

        if (!storedMinistries) {
          ministries = [];
          await AsyncStorage.setItem(MINISTRIES_KEY, JSON.stringify(ministries));
        }
        if (!storedEvents) await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events));
        if (!storedAnnouncements) await AsyncStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(announcements));
        if (!storedConversations) await AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
        if (!storedMemberships) await AsyncStorage.setItem(MINISTRY_MEMBERSHIPS_KEY, JSON.stringify(memberships));

        setState({
          ministries,
          events,
          announcements,
          conversations,
          ministryMemberships: memberships,
          isLoading: false,
          isRefreshing: false,
          error: null,
        });

        console.log("DataProvider: Data loaded successfully -", ministries.length, "ministries");
      } catch (error) {
        console.error("DataProvider: Failed to load data:", error);
        setState({
          ministries: [],
          events: mockEvents,
          announcements: mockAnnouncements,
          conversations: mockConversations,
          ministryMemberships: [],
          isLoading: false,
          isRefreshing: false,
          error: null,
        });
      }
    };

    loadData();
  }, [currentOrganization?.id]);

  const refresh = useCallback(async () => {
    console.log("DataProvider: Refreshing data...");
    setState(prev => ({ ...prev, isRefreshing: true }));
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setState(prev => ({ ...prev, isRefreshing: false }));
    console.log("DataProvider: Refresh complete");
  }, []);

  const organizationMinistries = useMemo(() => {
    if (!currentOrganization) return [];
    return state.ministries.filter(m => m.organizationId === currentOrganization.id);
  }, [state.ministries, currentOrganization]);

  const userMinistryIds = useMemo(() => {
    if (!user) return new Set<string>();
    return new Set(
      state.ministryMemberships
        .filter(m => m.userId === user.id)
        .map(m => m.ministryId)
    );
  }, [state.ministryMemberships, user]);

  const userMinistries = useMemo(() => {
    return organizationMinistries.filter(m => userMinistryIds.has(m.id));
  }, [organizationMinistries, userMinistryIds]);

  const getUpcomingEvents = useCallback((limit?: number) => {
    const now = new Date();
    const sorted = [...state.events]
      .filter(e => new Date(e.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return limit ? sorted.slice(0, limit) : sorted;
  }, [state.events]);

  const getAnnouncements = useCallback((limit?: number) => {
    const sorted = [...state.announcements]
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    return limit ? sorted.slice(0, limit) : sorted;
  }, [state.announcements]);

  const getMinistryById = useCallback((id: string) => {
    return state.ministries.find(m => m.id === id) || null;
  }, [state.ministries]);

  const getEventsByDate = useCallback((dateStr: string) => {
    return state.events.filter(e => e.date === dateStr);
  }, [state.events]);

  const getTotalUnread = useCallback(() => {
    return state.conversations.reduce((total, conv) => total + conv.unreadCount, 0);
  }, [state.conversations]);

  const joinMinistry = useCallback(async (ministryId: string) => {
    if (!user) return { success: false, message: "Not logged in" };
    
    console.log("DataProvider: Joining ministry:", ministryId);
    
    const existingMembership = state.ministryMemberships.find(
      m => m.ministryId === ministryId && m.userId === user.id
    );
    
    if (existingMembership) {
      return { success: false, message: "Already a member" };
    }
    
    const newMembership: MinistryMembership = {
      ministryId,
      userId: user.id,
      role: 'member',
      joinedAt: new Date().toISOString(),
    };
    
    const updatedMemberships = [...state.ministryMemberships, newMembership];
    setState(prev => ({ ...prev, ministryMemberships: updatedMemberships }));
    await AsyncStorage.setItem(MINISTRY_MEMBERSHIPS_KEY, JSON.stringify(updatedMemberships));
    
    const updatedMinistries = state.ministries.map(m => 
      m.id === ministryId ? { ...m, memberCount: m.memberCount + 1 } : m
    );
    setState(prev => ({ ...prev, ministries: updatedMinistries }));
    await AsyncStorage.setItem(MINISTRIES_KEY, JSON.stringify(updatedMinistries));
    
    return { success: true, message: "Joined ministry" };
  }, [user, state.ministryMemberships, state.ministries]);

  const leaveMinistry = useCallback(async (ministryId: string) => {
    if (!user) return { success: false };
    
    console.log("DataProvider: Leaving ministry:", ministryId);
    
    const updatedMemberships = state.ministryMemberships.filter(
      m => !(m.ministryId === ministryId && m.userId === user.id)
    );
    setState(prev => ({ ...prev, ministryMemberships: updatedMemberships }));
    await AsyncStorage.setItem(MINISTRY_MEMBERSHIPS_KEY, JSON.stringify(updatedMemberships));
    
    const updatedMinistries = state.ministries.map(m => 
      m.id === ministryId ? { ...m, memberCount: Math.max(0, m.memberCount - 1) } : m
    );
    setState(prev => ({ ...prev, ministries: updatedMinistries }));
    await AsyncStorage.setItem(MINISTRIES_KEY, JSON.stringify(updatedMinistries));
    
    return { success: true };
  }, [user, state.ministryMemberships, state.ministries]);

  const createMinistry = useCallback(async (ministry: Omit<Ministry, 'id' | 'memberCount'>) => {
    if (!user) return { success: false, ministry: null };
    
    console.log("DataProvider: Creating ministry:", ministry.name);
    
    const newMinistry: Ministry = {
      ...ministry,
      id: `ministry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      memberCount: 1,
    };

    const updatedMinistries = [...state.ministries, newMinistry];
    setState(prev => ({ ...prev, ministries: updatedMinistries }));
    await AsyncStorage.setItem(MINISTRIES_KEY, JSON.stringify(updatedMinistries));
    
    const creatorMembership: MinistryMembership = {
      ministryId: newMinistry.id,
      userId: user.id,
      role: 'admin',
      joinedAt: new Date().toISOString(),
    };
    
    const updatedMemberships = [...state.ministryMemberships, creatorMembership];
    setState(prev => ({ ...prev, ministryMemberships: updatedMemberships }));
    await AsyncStorage.setItem(MINISTRY_MEMBERSHIPS_KEY, JSON.stringify(updatedMemberships));
    
    console.log("DataProvider: Ministry created and user added as admin:", newMinistry.id);
    return { success: true, ministry: newMinistry };
  }, [user, state.ministries, state.ministryMemberships]);

  const updateMinistry = useCallback(async (id: string, updates: Partial<Ministry>) => {
    console.log("DataProvider: Updating ministry:", id);
    const updatedMinistries = state.ministries.map(m => 
      m.id === id ? { ...m, ...updates } : m
    );
    setState(prev => ({ ...prev, ministries: updatedMinistries }));
    await AsyncStorage.setItem(MINISTRIES_KEY, JSON.stringify(updatedMinistries));
    return { success: true };
  }, [state.ministries]);

  const deleteMinistry = useCallback(async (id: string) => {
    console.log("DataProvider: Deleting ministry:", id);
    const updatedMinistries = state.ministries.filter(m => m.id !== id);
    setState(prev => ({ ...prev, ministries: updatedMinistries }));
    await AsyncStorage.setItem(MINISTRIES_KEY, JSON.stringify(updatedMinistries));
    
    const updatedMemberships = state.ministryMemberships.filter(m => m.ministryId !== id);
    setState(prev => ({ ...prev, ministryMemberships: updatedMemberships }));
    await AsyncStorage.setItem(MINISTRY_MEMBERSHIPS_KEY, JSON.stringify(updatedMemberships));
    
    return { success: true };
  }, [state.ministries, state.ministryMemberships]);

  const isMinistryMember = useCallback((ministryId: string) => {
    return userMinistryIds.has(ministryId);
  }, [userMinistryIds]);

  const getMinistryRole = useCallback((ministryId: string) => {
    if (!user) return null;
    const membership = state.ministryMemberships.find(
      m => m.ministryId === ministryId && m.userId === user.id
    );
    return membership?.role || null;
  }, [user, state.ministryMemberships]);

  return {
    ministries: organizationMinistries,
    events: state.events,
    announcements: state.announcements,
    conversations: state.conversations,
    isLoading: state.isLoading,
    isRefreshing: state.isRefreshing,
    error: state.error,
    refresh,
    getUpcomingEvents,
    getAnnouncements,
    getMinistryById,
    getEventsByDate,
    getTotalUnread,
    userMinistries,
    joinMinistry,
    leaveMinistry,
    createMinistry,
    updateMinistry,
    deleteMinistry,
    isMinistryMember,
    getMinistryRole,
  };
});
