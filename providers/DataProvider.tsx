import { useState, useEffect, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useAuth } from "@/providers/AuthProvider";
import { Ministry, Event, Announcement, Conversation } from "@/types";
import { trpc } from "@/lib/trpc";

const MINISTRIES_KEY = "app_ministries_v2";
const EVENTS_KEY = "app_events_v1";
const ANNOUNCEMENTS_KEY = "app_announcements_v1";
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
  ministryMemberships: MinistryMembership[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
}

export const [DataProvider, useData] = createContextHook(() => {
  const { currentOrganization, user, isAuthenticated } = useAuth();
  const [state, setState] = useState<DataState>({
    ministries: [],
    events: [],
    announcements: [],
    ministryMemberships: [],
    isLoading: true,
    isRefreshing: false,
    error: null,
  });

  const conversationsQuery = trpc.messages.getAllUserConversations.useQuery(
    { organizationId: currentOrganization?.id || "" },
    { 
      enabled: !!currentOrganization?.id && isAuthenticated,
      refetchInterval: 5000,
    }
  );

  const totalUnreadQuery = trpc.messages.getTotalUnread.useQuery(
    { organizationId: currentOrganization?.id },
    { 
      enabled: !!currentOrganization?.id && isAuthenticated,
      refetchInterval: 5000,
    }
  );

  useEffect(() => {
    const loadData = async () => {
      
      setState(prev => ({ ...prev, isLoading: true }));

      try {
        const [
          storedMinistries,
          storedEvents,
          storedAnnouncements,
          storedMemberships,
        ] = await Promise.all([
          AsyncStorage.getItem(MINISTRIES_KEY),
          AsyncStorage.getItem(EVENTS_KEY),
          AsyncStorage.getItem(ANNOUNCEMENTS_KEY),
          AsyncStorage.getItem(MINISTRY_MEMBERSHIPS_KEY),
        ]);

        let ministries: Ministry[] = storedMinistries ? JSON.parse(storedMinistries) : [];
        let events: Event[] = storedEvents ? JSON.parse(storedEvents) : [];
        let announcements: Announcement[] = storedAnnouncements ? JSON.parse(storedAnnouncements) : [];
        let memberships: MinistryMembership[] = storedMemberships ? JSON.parse(storedMemberships) : [];

        if (!storedMinistries) await AsyncStorage.setItem(MINISTRIES_KEY, JSON.stringify(ministries));
        if (!storedEvents) await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events));
        if (!storedAnnouncements) await AsyncStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(announcements));
        if (!storedMemberships) await AsyncStorage.setItem(MINISTRY_MEMBERSHIPS_KEY, JSON.stringify(memberships));

        setState({
          ministries,
          events,
          announcements,
          ministryMemberships: memberships,
          isLoading: false,
          isRefreshing: false,
          error: null,
        });

        
      } catch (error) {
        console.error("DataProvider: Failed to load data:", error);
        setState({
          ministries: [],
          events: [],
          announcements: [],
          ministryMemberships: [],
          isLoading: false,
          isRefreshing: false,
          error: "Failed to load data. Please try again.",
        });
      }
    };

    loadData();
  }, [currentOrganization?.id]);

  const refresh = useCallback(async () => {
    
    setState(prev => ({ ...prev, isRefreshing: true }));
    
    await conversationsQuery.refetch();
    await totalUnreadQuery.refetch();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setState(prev => ({ ...prev, isRefreshing: false }));
    
  }, [conversationsQuery, totalUnreadQuery]);

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

  const getGeneralAnnouncements = useCallback((limit?: number) => {
    const filtered = state.announcements
      .filter(a => !a.ministryId)
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    return limit ? filtered.slice(0, limit) : filtered;
  }, [state.announcements]);

  const getMinistryById = useCallback((id: string) => {
    return state.ministries.find(m => m.id === id) || null;
  }, [state.ministries]);

  const getEventsByDate = useCallback((dateStr: string) => {
    return state.events.filter(e => e.date === dateStr);
  }, [state.events]);

  const conversations = useMemo<Conversation[]>(() => {
    return conversationsQuery.data || [];
  }, [conversationsQuery.data]);

  const getTotalUnread = useCallback(() => {
    return totalUnreadQuery.data || 0;
  }, [totalUnreadQuery.data]);

  const joinMinistry = useCallback(async (ministryId: string) => {
    if (!user) return { success: false, message: "Not logged in" };
    
    
    
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
    
    
    return { success: true, ministry: newMinistry };
  }, [user, state.ministries, state.ministryMemberships]);

  const updateMinistry = useCallback(async (id: string, updates: Partial<Ministry>) => {
    
    const updatedMinistries = state.ministries.map(m => 
      m.id === id ? { ...m, ...updates } : m
    );
    setState(prev => ({ ...prev, ministries: updatedMinistries }));
    await AsyncStorage.setItem(MINISTRIES_KEY, JSON.stringify(updatedMinistries));
    return { success: true };
  }, [state.ministries]);

  const deleteMinistry = useCallback(async (id: string) => {
    
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

  const refetchConversations = useCallback(() => {
    return conversationsQuery.refetch();
  }, [conversationsQuery]);

  return {
    ministries: organizationMinistries,
    events: state.events,
    announcements: state.announcements,
    conversations,
    isLoading: state.isLoading,
    isRefreshing: state.isRefreshing || conversationsQuery.isRefetching,
    error: state.error,
    refresh,
    getUpcomingEvents,
    getAnnouncements,
    getGeneralAnnouncements,
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
    refetchConversations,
  };
});
