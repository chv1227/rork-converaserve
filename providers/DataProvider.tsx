import { useCallback, useMemo, useState, useEffect, useRef } from "react";
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

  useEffect(() => {
    console.log('DataProvider: Organization changed:', organizationId, currentOrganization?.name || 'none');
  }, [organizationId, currentOrganization?.name]);

  // Real-time subscriptions for live updates
  useEffect(() => {
    if (!organizationId) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    // Subscribe to announcements changes
    const announcementsChannel = supabase
      .channel(`announcements-${organizationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements', filter: `church_id=eq.${organizationId}` },
        () => {
          console.log('Announcements updated - refreshing...');
          queryClient.invalidateQueries({ queryKey: ['announcements', organizationId] });
        }
      )
      .subscribe();
    channels.push(announcementsChannel);

    // Subscribe to events changes
    const eventsChannel = supabase
      .channel(`events-${organizationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `church_id=eq.${organizationId}` },
        () => {
          console.log('Events updated - refreshing...');
          queryClient.invalidateQueries({ queryKey: ['events', organizationId] });
        }
      )
      .subscribe();
    channels.push(eventsChannel);

    // Subscribe to ministries changes
    const ministriesChannel = supabase
      .channel(`ministries-${organizationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ministries', filter: `church_id=eq.${organizationId}` },
        () => {
          console.log('Ministries updated - refreshing...');
          queryClient.invalidateQueries({ queryKey: ['ministries', organizationId] });
          queryClient.invalidateQueries({ queryKey: ['userMinistries'] });
        }
      )
      .subscribe();
    channels.push(ministriesChannel);

    // Subscribe to messages for unread count
    const messagesChannel = supabase
      .channel(`messages-${organizationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          console.log('New message - refreshing unread count...');
          queryClient.invalidateQueries({ queryKey: ['totalUnread', organizationId] });
          queryClient.invalidateQueries({ queryKey: ['conversations', organizationId] });
        }
      )
      .subscribe();
    channels.push(messagesChannel);

    // Subscribe to prayer requests changes
    const prayerRequestsChannel = supabase
      .channel(`prayer-requests-${organizationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'prayer_requests', filter: `church_id=eq.${organizationId}` },
        () => {
          console.log('Prayer requests updated - refreshing...');
          queryClient.invalidateQueries({ queryKey: ['prayerRequests', organizationId] });
        }
      )
      .subscribe();
    channels.push(prayerRequestsChannel);

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [organizationId, queryClient]);

  const ministriesQuery = useQuery({
    queryKey: ['ministries', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await (supabase as any)
        .from('ministries')
        .select('*')
        .eq('church_id', organizationId)
        .order('name');
      
      if (error) {
        console.error('Error fetching ministries:', error.message || JSON.stringify(error));
        throw new Error(error.message || 'Failed to fetch ministries');
      }
      
      return (data || []).map((m: { id: string; church_id: string; name: string; description: string | null; color: string | null; icon: string | null; image_url: string | null }) => {
        // Count members for this ministry
        return {
          id: m.id,
          organizationId: m.church_id,
          name: m.name,
          description: m.description || '',
          color: m.color || '#6366F1',
          icon: m.icon || 'Users',
          memberCount: 0, // Will be updated by member count query
          image: m.image_url || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=300&fit=crop',
        };
      }) as Ministry[];
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
        .eq('church_id', organizationId)
        .order('start_datetime', { ascending: true });
      
      if (error) {
        console.error('Error fetching events:', error.message || JSON.stringify(error));
        throw new Error(error.message || 'Failed to fetch events');
      }
      
      return (data || []).map((e: { id: string; church_id: string; title: string; description: string | null; start_datetime: string; location_name: string | null; ministry_id: string | null; ministries: { name: string; color: string } | null; max_attendees: number | null }) => ({
        id: e.id,
        organizationId: e.church_id,
        title: e.title,
        description: e.description || '',
        date: e.start_datetime?.split('T')[0] || '',
        time: e.start_datetime?.split('T')[1]?.substring(0, 5) || '',
        location: e.location_name || '',
        ministryId: e.ministry_id || '',
        ministryName: e.ministries?.name || 'General',
        color: e.ministries?.color || '#1A7B74',
        attendees: e.max_attendees || 0,
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
        .eq('church_id', organizationId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching announcements:', error.message || JSON.stringify(error));
        throw new Error(error.message || 'Failed to fetch announcements');
      }
      
      return (data || []).map((a: { id: string; church_id: string; title: string; content: string; created_by_profile_id: string | null; created_at: string; ministry_id: string | null; ministries: { name: string } | null; priority: string; is_pinned: boolean }) => ({
        id: a.id,
        organizationId: a.church_id,
        title: a.title,
        content: a.content,
        author: '',
        authorRole: '',
        authorAvatar: '',
        date: a.created_at,
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
          church_id: string;
          name: string;
          description: string | null;
          color: string;
          icon: string;
          member_count: number;
          image_url: string | null;
        };
        return {
          id: m.id,
          organizationId: m.church_id,
          name: m.name,
          description: m.description || '',
          color: m.color,
          icon: m.icon,
          memberCount: m.member_count,
          image: m.image_url || '',
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
    refetchInterval: 5000,
  });

  // Prayer requests count query
  const prayerRequestsQuery = useQuery({
    queryKey: ['prayerRequests', organizationId],
    queryFn: async () => {
      if (!organizationId) return { total: 0, active: 0 };
      
      const { count: totalCount, error: totalError } = await (supabase as any)
        .from('prayer_requests')
        .select('*', { count: 'exact', head: true })
        .eq('church_id', organizationId);
      
      if (totalError) {
        console.error('Error fetching prayer requests count:', totalError);
        return { total: 0, active: 0 };
      }

      const { count: activeCount, error: activeError } = await (supabase as any)
        .from('prayer_requests')
        .select('*', { count: 'exact', head: true })
        .eq('church_id', organizationId)
        .eq('status', 'active');
      
      if (activeError) {
        console.error('Error fetching active prayer requests count:', activeError);
      }

      return { total: totalCount || 0, active: activeCount || 0 };
    },
    enabled: !!organizationId,
    staleTime: 15_000,
    refetchInterval: 30000,
  });

  // Organization members count query
  const membersCountQuery = useQuery({
    queryKey: ['membersCount', organizationId],
    queryFn: async () => {
      if (!organizationId) return 0;
      
      const { count, error } = await (supabase as any)
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('church_id', organizationId);
      
      if (error) {
        console.error('Error fetching members count:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!organizationId,
    staleTime: 60_000,
  });

  // Giving/donations total query
  const givingStatsQuery = useQuery({
    queryKey: ['givingStats', organizationId],
    queryFn: async () => {
      if (!organizationId) return { total: 0, thisMonth: 0, count: 0 };
      
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
      // Try to get donations
      const { data: allDonations, error: allError } = await (supabase as any)
        .from('donations')
        .select('amount')
        .eq('church_id', organizationId);
      
      if (allError) {
        // Table might not exist, return zeros
        console.log('Donations table not found or error:', allError);
        return { total: 0, thisMonth: 0, count: 0 };
      }

      const { data: monthDonations, error: monthError } = await (supabase as any)
        .from('donations')
        .select('amount')
        .eq('church_id', organizationId)
        .gte('created_at', firstDayOfMonth);
      
      const total = (allDonations || []).reduce((sum: number, d: { amount: number }) => sum + (d.amount || 0), 0);
      const thisMonth = monthError ? 0 : (monthDonations || []).reduce((sum: number, d: { amount: number }) => sum + (d.amount || 0), 0);
      
      return { total, thisMonth, count: (allDonations || []).length };
    },
    enabled: !!organizationId,
    staleTime: 60_000,
  });

  const orgIdRef = useRef(organizationId);
  useEffect(() => {
    orgIdRef.current = organizationId;
  }, [organizationId]);

  const createMinistryMutation = useMutation({
    mutationFn: async (ministry: { name: string; description?: string; color: string; icon: string; image?: string }) => {
      const orgId = orgIdRef.current || organizationId;
      console.log('DataProvider: Creating ministry, orgId:', orgId);
      if (!orgId) {
        console.error('DataProvider: No organization selected for ministry creation. currentOrganization:', currentOrganization);
        throw new Error('No organization selected. Please select a church first.');
      }
      
      const { data, error } = await (supabase as any)
        .from('ministries')
        .insert({
          church_id: orgId,
          name: ministry.name,
          description: ministry.description || null,
          color: ministry.color,
          icon: ministry.icon,
          image_url: ministry.image || null,
          status: 'active',
        })
        .select()
        .single();
      
      if (error) {
        console.error('DataProvider: Ministry creation error:', error.message || JSON.stringify(error));
        throw error;
      }
      console.log('DataProvider: Ministry created successfully:', data?.id);
      return data;
    },
    onSuccess: () => {
      const orgId = orgIdRef.current || organizationId;
      queryClient.invalidateQueries({ queryKey: ['ministries', orgId] });
      queryClient.invalidateQueries({ queryKey: ['organization-ministries', orgId] });
    },
  });

  const updateMinistryMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string; color?: string; icon?: string; image?: string }) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.icon !== undefined) updateData.icon = updates.icon;
      if (updates.image !== undefined) updateData.image_url = updates.image;
      
      const { error } = await (supabase as any)
        .from('ministries')
        .update(updateData)
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

  const prayerRequestsCount = useMemo(() => {
    return prayerRequestsQuery.data ?? { total: 0, active: 0 };
  }, [prayerRequestsQuery.data]);

  const membersCount = useMemo(() => {
    return membersCountQuery.data ?? 0;
  }, [membersCountQuery.data]);

  const givingStats = useMemo(() => {
    return givingStatsQuery.data ?? { total: 0, thisMonth: 0, count: 0 };
  }, [givingStatsQuery.data]);

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

  const { mutateAsync: joinMinistryAsync } = joinMinistryMutation;
  const joinMinistry = useCallback(
    async (ministryId: string) => {
      if (!user || !isAuthenticated) return { success: false, message: "Not logged in" };
      if (!organizationId) return { success: false, message: "No church selected" };

      try {
        const result = await joinMinistryAsync({
          ministryId,
          organizationId,
        });
        return { success: true, message: result?.message ?? "Request submitted" };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to join ministry";
        return { success: false, message: msg };
      }
    },
    [user, isAuthenticated, organizationId, joinMinistryAsync]
  );

  const { mutateAsync: leaveMinistryAsync } = leaveMinistryMutation;
  const leaveMinistry = useCallback(
    async (ministryId: string) => {
      if (!user || !isAuthenticated) return { success: false, message: "Not logged in" };

      try {
        await leaveMinistryAsync({ ministryId });
        return { success: true };
      } catch (e) {
        return { success: false, message: e instanceof Error ? e.message : "Failed to leave ministry" };
      }
    },
    [user, isAuthenticated, leaveMinistryAsync]
  );

  const { mutateAsync: createMinistryAsync } = createMinistryMutation;
  const createMinistry = useCallback(
    async (ministry: Omit<Ministry, "id" | "memberCount">) => {
      if (!user || !isAuthenticated) return { success: false, ministry: null, message: "Not logged in" };
      const orgId = orgIdRef.current || organizationId;
      if (!orgId) return { success: false, ministry: null, message: "No church selected. Please go to Organizations and select a church." };

      try {
        const created = await createMinistryAsync({
          name: ministry.name,
          description: ministry.description,
          color: ministry.color,
          icon: ministry.icon,
          image: ministry.image,
        });

        return { success: true, ministry: created };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to create ministry";
        console.error('DataProvider: createMinistry error:', msg);
        return { success: false, ministry: null, message: msg };
      }
    },
    [user, isAuthenticated, organizationId, createMinistryAsync]
  );

  const { mutateAsync: updateMinistryAsync } = updateMinistryMutation;
  const updateMinistry = useCallback(
    async (id: string, updates: Partial<Ministry>) => {
      try {
        await updateMinistryAsync({
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
    [updateMinistryAsync]
  );

  const { mutateAsync: deleteMinistryAsync } = deleteMinistryMutation;
  const deleteMinistry = useCallback(
    async (id: string) => {
      try {
        await deleteMinistryAsync(id);
        return { success: true };
      } catch (e) {
        return { success: false, message: e instanceof Error ? e.message : "Failed to delete ministry" };
      }
    },
    [deleteMinistryAsync]
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
    prayerRequestsCount,
    membersCount,
    givingStats,
  };
});
