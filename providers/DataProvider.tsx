import { useCallback, useMemo, useState, useEffect } from "react";
import createContextHook from "@nkzw/create-context-hook";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { Announcement, Conversation, Event, Ministry } from "@/types";
import { supabase } from "@/lib/supabase";

export const [DataProvider, useData] = createContextHook(() => {
  const { currentOrganization, user, isAuthenticated } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const queryClient = useQueryClient();

  const organizationId = currentOrganization?.id;

  const ministriesQuery = useQuery({
    queryKey: ['ministries', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await (supabase as any)
        .from('ministries')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');
      
      if (error) {
        console.error('Error fetching ministries:', error.message || JSON.stringify(error));
        throw new Error(error.message || 'Failed to fetch ministries');
      }
      
      return (data || []).map((m: { id: string; organization_id: string; name: string; description: string | null; color: string; icon: string; member_count: number; image: string | null }) => ({
        id: m.id,
        organizationId: m.organization_id,
        name: m.name,
        description: m.description || '',
        color: m.color,
        icon: m.icon,
        memberCount: m.member_count,
        image: m.image || '',
      })) as Ministry[];
    },
    enabled: !!organizationId,
    staleTime: 15_000,
  });

  const eventsQuery = useQuery({
    queryKey: ['events', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await (supabase as any)
        .from('events')
        .select('*, ministries(name, color)')
        .eq('organization_id', organizationId)
        .order('date', { ascending: true });
      
      if (error) {
        console.error('Error fetching events:', error.message || JSON.stringify(error));
        throw new Error(error.message || 'Failed to fetch events');
      }
      
      return (data || []).map((e: { id: string; organization_id: string; title: string; description: string | null; date: string; time: string; location: string | null; ministry_id: string | null; ministries: { name: string; color: string } | null; attendees: number }) => ({
        id: e.id,
        organizationId: e.organization_id,
        title: e.title,
        description: e.description || '',
        date: e.date,
        time: e.time,
        location: e.location || '',
        ministryId: e.ministry_id || '',
        ministryName: e.ministries?.name || 'General',
        color: e.ministries?.color || '#1A7B74',
        attendees: e.attendees,
      })) as Event[];
    },
    enabled: !!organizationId,
    staleTime: 15_000,
  });

  const announcementsQuery = useQuery({
    queryKey: ['announcements', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await (supabase as any)
        .from('announcements')
        .select('*, ministries(name)')
        .eq('organization_id', organizationId)
        .order('is_pinned', { ascending: false })
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Error fetching announcements:', error.message || JSON.stringify(error));
        throw new Error(error.message || 'Failed to fetch announcements');
      }
      
      return (data || []).map((a: { id: string; organization_id: string; title: string; content: string; author_name: string; author_role: string; author_avatar: string | null; date: string; ministry_id: string | null; ministries: { name: string } | null; priority: string; is_pinned: boolean }) => ({
        id: a.id,
        organizationId: a.organization_id,
        title: a.title,
        content: a.content,
        author: a.author_name,
        authorRole: a.author_role,
        authorAvatar: a.author_avatar || '',
        date: a.date,
        ministryId: a.ministry_id || undefined,
        ministryName: a.ministries?.name || undefined,
        priority: a.priority as 'high' | 'normal' | 'low',
        isPinned: a.is_pinned,
      })) as Announcement[];
    },
    enabled: !!organizationId,
    staleTime: 15_000,
  });

  const userMinistriesQuery = useQuery({
    queryKey: ['userMinistries', user?.id, organizationId],
    queryFn: async () => {
      if (!user?.id || !organizationId) return [];
      
      // First get the user's profile_id for this organization
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('church_id', organizationId)
        .single();
      
      if (profileError || !profileData) {
        console.log('No profile found for user in this organization');
        return [];
      }
      
      const { data, error } = await (supabase as any)
        .from('ministry_members')
        .select('*, ministries(*)')
        .eq('profile_id', (profileData as { id: string }).id)
        .eq('is_active', true);
      
      if (error) {
        console.error('Error fetching user ministries:', error.message || JSON.stringify(error));
        throw new Error(error.message || 'Failed to fetch user ministries');
      }
      
      return (data || []).map((mm: any) => {
        const m = mm.ministries as {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          color: string;
          icon: string;
          member_count: number;
          image: string | null;
        };
        return {
          id: m.id,
          organizationId: m.organization_id,
          name: m.name,
          description: m.description || '',
          color: m.color,
          icon: m.icon,
          memberCount: m.member_count,
          image: m.image || '',
        };
      }) as Ministry[];
    },
    enabled: isAuthenticated && !!user?.id && !!organizationId,
    staleTime: 15_000,
  });

  const conversationsQuery = useQuery({
    queryKey: ['conversations', organizationId, user?.id],
    queryFn: async () => {
      if (!organizationId || !user?.id) return [];
      
      const { data: participantData, error: participantError } = await (supabase as any)
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);
      
      if (participantError) {
        console.error('Error fetching conversation participants:', participantError.message || JSON.stringify(participantError));
        throw new Error(participantError.message || 'Failed to fetch conversation participants');
      }
      
      const conversationIds = (participantData || []).map((p: { conversation_id: string }) => p.conversation_id);
      if (conversationIds.length === 0) return [];
      
      const { data, error } = await (supabase as any)
        .from('conversations')
        .select('*, ministries(color)')
        .in('id', conversationIds)
        .eq('organization_id', organizationId)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching conversations:', error.message || JSON.stringify(error));
        throw new Error(error.message || 'Failed to fetch conversations');
      }
      
      const conversationsWithMessages = await Promise.all((data || []).map(async (c: any) => {
        const { data: lastMessage } = await (supabase as any)
          .from('messages')
          .select('content, created_at')
          .eq('conversation_id', c.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        const { count: unreadCount } = await (supabase as any)
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', c.id)
          .neq('sender_id', user.id)
          .gt('created_at', c.updated_at);
        
        return {
          id: c.id,
          organizationId: c.organization_id,
          name: c.name,
          avatar: c.avatar || '',
          lastMessage: lastMessage?.content || '',
          lastMessageTime: lastMessage?.created_at || c.updated_at,
          lastMessageTimestamp: lastMessage?.created_at || c.updated_at,
          unreadCount: unreadCount || 0,
          isGroup: c.type !== 'direct',
          type: c.type as 'direct' | 'group' | 'ministry',
          ministryId: c.ministry_id || undefined,
          ministryColor: (c.ministries as { color: string } | null)?.color || undefined,
          createdBy: c.created_by,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
          isArchived: c.is_archived,
        };
      }));
      
      return conversationsWithMessages as Conversation[];
    },
    enabled: !!organizationId && isAuthenticated && !!user?.id,
    refetchInterval: 10000,
  });

  const totalUnreadQuery = useQuery({
    queryKey: ['totalUnread', organizationId, user?.id],
    queryFn: async () => {
      if (!organizationId || !user?.id) return 0;
      
      const { data: participantData } = await (supabase as any)
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id);
      
      if (!participantData || participantData.length === 0) return 0;
      
      let totalUnread = 0;
      for (const participant of (participantData as { conversation_id: string; last_read_at: string | null }[])) {
        const { count } = await (supabase as any)
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', participant.conversation_id)
          .neq('sender_id', user.id)
          .gt('created_at', participant.last_read_at || '1970-01-01');
        
        totalUnread += count || 0;
      }
      
      return totalUnread;
    },
    enabled: !!organizationId && isAuthenticated && !!user?.id,
    refetchInterval: 10000,
  });

  const createMinistryMutation = useMutation({
    mutationFn: async (ministry: { name: string; description?: string; color: string; icon: string; image?: string }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await (supabase as any)
        .from('ministries')
        .insert({
          organization_id: organizationId,
          name: ministry.name,
          description: ministry.description || null,
          color: ministry.color,
          icon: ministry.icon,
          image: ministry.image || null,
          member_count: 0,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ministries', organizationId] });
    },
  });

  const updateMinistryMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string; color?: string; icon?: string; image?: string }) => {
      const { error } = await (supabase as any)
        .from('ministries')
        .update({
          name: updates.name,
          description: updates.description,
          color: updates.color,
          icon: updates.icon,
          image: updates.image,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ministries', organizationId] });
    },
  });

  const deleteMinistryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('ministries')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ministries', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['userMinistries'] });
    },
  });

  const joinMinistryMutation = useMutation({
    mutationFn: async ({ ministryId, organizationId: orgId }: { ministryId: string; organizationId: string }) => {
      if (!user?.id) throw new Error('Not logged in');
      
      // Get the user's profile_id for this organization
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('church_id', orgId)
        .single();
      
      if (profileError || !profileData) {
        throw new Error('Profile not found. Please ensure you are a member of this organization.');
      }
      
      const { error } = await (supabase as any)
        .from('ministry_members')
        .insert({
          ministry_id: ministryId,
          profile_id: (profileData as { id: string }).id,
          role: 'member',
        });
      
      if (error) throw error;
      
      await (supabase as any).rpc('increment_ministry_member_count', { ministry_id: ministryId });
      
      return { message: 'Successfully joined ministry' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ministries', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['userMinistries'] });
    },
  });

  const leaveMinistryMutation = useMutation({
    mutationFn: async ({ ministryId }: { ministryId: string }) => {
      if (!user?.id || !organizationId) throw new Error('Not logged in');
      
      // Get the user's profile_id for this organization
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('church_id', organizationId)
        .single();
      
      if (profileError || !profileData) {
        throw new Error('Profile not found');
      }
      
      const { error } = await (supabase as any)
        .from('ministry_members')
        .delete()
        .eq('ministry_id', ministryId)
        .eq('profile_id', (profileData as { id: string }).id);
      
      if (error) throw error;
      
      await (supabase as any).rpc('decrement_ministry_member_count', { ministry_id: ministryId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ministries', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['userMinistries'] });
    },
  });

  const isLoading =
    ministriesQuery.isLoading ||
    eventsQuery.isLoading ||
    announcementsQuery.isLoading ||
    (isAuthenticated && userMinistriesQuery.isLoading);

  const error = useMemo(() => {
    const err =
      ministriesQuery.error ||
      eventsQuery.error ||
      announcementsQuery.error ||
      userMinistriesQuery.error ||
      conversationsQuery.error ||
      totalUnreadQuery.error;

    if (err instanceof Error) return err.message;
    return err ? String(err) : null;
  }, [
    ministriesQuery.error,
    eventsQuery.error,
    announcementsQuery.error,
    userMinistriesQuery.error,
    conversationsQuery.error,
    totalUnreadQuery.error,
  ]);

  const ministries = useMemo<Ministry[]>(() => {
    return ministriesQuery.data ?? [];
  }, [ministriesQuery.data]);

  const events = useMemo<Event[]>(() => {
    return eventsQuery.data ?? [];
  }, [eventsQuery.data]);

  const announcements = useMemo<Announcement[]>(() => {
    return announcementsQuery.data ?? [];
  }, [announcementsQuery.data]);

  const userMinistries = useMemo<Ministry[]>(() => {
    return userMinistriesQuery.data ?? [];
  }, [userMinistriesQuery.data]);

  const userMinistryIds = useMemo(() => {
    return new Set<string>((userMinistriesQuery.data ?? []).map((m) => m.id));
  }, [userMinistriesQuery.data]);

  const getUpcomingEvents = useCallback(
    (limit?: number) => {
      const now = new Date();
      const sorted = [...events]
        .filter((e) => new Date(e.date) >= now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return limit ? sorted.slice(0, limit) : sorted;
    },
    [events]
  );

  const getAnnouncements = useCallback(
    (limit?: number) => {
      const sorted = [...announcements].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      return limit ? sorted.slice(0, limit) : sorted;
    },
    [announcements]
  );

  const getGeneralAnnouncements = useCallback(
    (limit?: number) => {
      const filtered = announcements
        .filter((a) => !a.ministryId)
        .sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
      return limit ? filtered.slice(0, limit) : filtered;
    },
    [announcements]
  );

  const getMinistryById = useCallback(
    (id: string) => {
      return ministries.find((m) => m.id === id) ?? null;
    },
    [ministries]
  );

  const getEventsByDate = useCallback(
    (dateStr: string) => {
      return events.filter((e) => e.date === dateStr);
    },
    [events]
  );

  const conversations = useMemo<Conversation[]>(() => {
    return conversationsQuery.data ?? [];
  }, [conversationsQuery.data]);

  const getTotalUnread = useCallback(() => {
    return totalUnreadQuery.data ?? 0;
  }, [totalUnreadQuery.data]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ministries', organizationId] }),
        queryClient.invalidateQueries({ queryKey: ['events', organizationId] }),
        queryClient.invalidateQueries({ queryKey: ['announcements', organizationId] }),
        queryClient.invalidateQueries({ queryKey: ['userMinistries'] }),
        queryClient.invalidateQueries({ queryKey: ['conversations', organizationId] }),
        queryClient.invalidateQueries({ queryKey: ['totalUnread', organizationId] }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, organizationId]);

  const joinMinistry = useCallback(
    async (ministryId: string) => {
      if (!user || !isAuthenticated) return { success: false, message: "Not logged in" };
      if (!organizationId) return { success: false, message: "No church selected" };

      try {
        const result = await joinMinistryMutation.mutateAsync({
          ministryId,
          organizationId,
        });
        return { success: true, message: result?.message ?? "Request submitted" };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to join ministry";
        return { success: false, message: msg };
      }
    },
    [user, isAuthenticated, organizationId, joinMinistryMutation]
  );

  const leaveMinistry = useCallback(
    async (ministryId: string) => {
      if (!user || !isAuthenticated) return { success: false, message: "Not logged in" };

      try {
        await leaveMinistryMutation.mutateAsync({ ministryId });
        return { success: true };
      } catch (e) {
        return { success: false, message: e instanceof Error ? e.message : "Failed to leave ministry" };
      }
    },
    [user, isAuthenticated, leaveMinistryMutation]
  );

  const createMinistry = useCallback(
    async (ministry: Omit<Ministry, "id" | "memberCount">) => {
      if (!user || !isAuthenticated) return { success: false, ministry: null, message: "Not logged in" };
      if (!organizationId) return { success: false, ministry: null, message: "No church selected" };

      try {
        const created = await createMinistryMutation.mutateAsync({
          name: ministry.name,
          description: ministry.description,
          color: ministry.color,
          icon: ministry.icon,
          image: ministry.image,
        });

        return { success: true, ministry: created };
      } catch (e) {
        return { success: false, ministry: null, message: e instanceof Error ? e.message : "Failed to create ministry" };
      }
    },
    [user, isAuthenticated, organizationId, createMinistryMutation]
  );

  const updateMinistry = useCallback(
    async (id: string, updates: Partial<Ministry>) => {
      try {
        await updateMinistryMutation.mutateAsync({
          id,
          name: updates.name,
          description: updates.description,
          color: updates.color,
          icon: updates.icon,
          image: updates.image,
        });
        return { success: true };
      } catch (e) {
        return { success: false, message: e instanceof Error ? e.message : "Failed to update ministry" };
      }
    },
    [updateMinistryMutation]
  );

  const deleteMinistry = useCallback(
    async (id: string) => {
      try {
        await deleteMinistryMutation.mutateAsync(id);
        return { success: true };
      } catch (e) {
        return { success: false, message: e instanceof Error ? e.message : "Failed to delete ministry" };
      }
    },
    [deleteMinistryMutation]
  );

  const isMinistryMember = useCallback(
    (ministryId: string) => {
      return userMinistryIds.has(ministryId);
    },
    [userMinistryIds]
  );

  const getMinistryRole = useCallback(
    (_ministryId: string) => {
      if (!user) return null;
      return user.role;
    },
    [user]
  );

  const refetchConversations = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: ['conversations', organizationId] });
  }, [queryClient, organizationId]);

  return {
    ministries,
    events,
    announcements,
    conversations,
    isLoading,
    isRefreshing: isRefreshing || conversationsQuery.isRefetching,
    error,
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
