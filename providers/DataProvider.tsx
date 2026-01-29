import { useCallback, useMemo, useState } from "react";
import createContextHook from "@nkzw/create-context-hook";
import { useAuth } from "@/providers/AuthProvider";
import { Announcement, Conversation, Event, Ministry } from "@/types";
import { getTRPCErrorMessage, trpc } from "@/lib/trpc";

export const [DataProvider, useData] = createContextHook(() => {
  const { currentOrganization, user, isAuthenticated } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const organizationId = currentOrganization?.id;

  const ministriesQuery = trpc.ministries.list.useQuery(
    { organizationId: organizationId ?? "" },
    {
      enabled: !!organizationId,
      staleTime: 15_000,
    }
  );

  const eventsQuery = trpc.events.list.useQuery(
    { organizationId: organizationId ?? "" },
    {
      enabled: !!organizationId,
      staleTime: 15_000,
    }
  );

  const announcementsQuery = trpc.announcements.list.useQuery(
    { organizationId: organizationId ?? "" },
    {
      enabled: !!organizationId,
      staleTime: 15_000,
    }
  );

  const userMinistriesQuery = trpc.ministries.getUserMinistries.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 15_000,
  });

  const conversationsQuery = trpc.messages.getAllUserConversations.useQuery(
    { organizationId: organizationId || "" },
    {
      enabled: !!organizationId && isAuthenticated,
      refetchInterval: 5000,
    }
  );

  const totalUnreadQuery = trpc.messages.getTotalUnread.useQuery(
    { organizationId },
    {
      enabled: !!organizationId && isAuthenticated,
      refetchInterval: 5000,
    }
  );

  const createMinistryMutation = trpc.ministries.create.useMutation();
  const updateMinistryMutation = trpc.ministries.update.useMutation();
  const deleteMinistryMutation = trpc.ministries.delete.useMutation();
  const joinMinistryMutation = trpc.ministries.join.useMutation();
  const leaveMinistryMutation = trpc.ministries.leave.useMutation();

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

    return err ? getTRPCErrorMessage(err) : null;
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
        ministriesQuery.refetch(),
        eventsQuery.refetch(),
        announcementsQuery.refetch(),
        userMinistriesQuery.refetch(),
        conversationsQuery.refetch(),
        totalUnreadQuery.refetch(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [
    ministriesQuery,
    eventsQuery,
    announcementsQuery,
    userMinistriesQuery,
    conversationsQuery,
    totalUnreadQuery,
  ]);

  const joinMinistry = useCallback(
    async (ministryId: string) => {
      if (!user || !isAuthenticated) return { success: false, message: "Not logged in" };
      if (!organizationId) return { success: false, message: "No church selected" };

      try {
        const result = await joinMinistryMutation.mutateAsync({
          ministryId,
          organizationId,
        });

        await Promise.all([ministriesQuery.refetch(), userMinistriesQuery.refetch()]);

        return { success: true, message: result?.message ?? "Request submitted" };
      } catch (e) {
        const msg = getTRPCErrorMessage(e);
        return { success: false, message: msg };
      }
    },
    [
      user,
      isAuthenticated,
      organizationId,
      joinMinistryMutation,
      ministriesQuery,
      userMinistriesQuery,
    ]
  );

  const leaveMinistry = useCallback(
    async (ministryId: string) => {
      if (!user || !isAuthenticated) return { success: false, message: "Not logged in" };

      try {
        await leaveMinistryMutation.mutateAsync({ ministryId });
        await Promise.all([ministriesQuery.refetch(), userMinistriesQuery.refetch()]);
        return { success: true };
      } catch (e) {
        return { success: false, message: getTRPCErrorMessage(e) };
      }
    },
    [user, isAuthenticated, leaveMinistryMutation, ministriesQuery, userMinistriesQuery]
  );

  const createMinistry = useCallback(
    async (ministry: Omit<Ministry, "id" | "memberCount">) => {
      if (!user || !isAuthenticated) return { success: false, ministry: null, message: "Not logged in" };
      if (!organizationId) return { success: false, ministry: null, message: "No church selected" };

      try {
        const created = await createMinistryMutation.mutateAsync({
          organizationId,
          name: ministry.name,
          description: ministry.description,
          color: ministry.color,
          icon: ministry.icon,
          image: ministry.image,
        });

        await ministriesQuery.refetch();

        return { success: true, ministry: created };
      } catch (e) {
        return { success: false, ministry: null, message: getTRPCErrorMessage(e) };
      }
    },
    [user, isAuthenticated, organizationId, createMinistryMutation, ministriesQuery]
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
        await ministriesQuery.refetch();
        return { success: true };
      } catch (e) {
        return { success: false, message: getTRPCErrorMessage(e) };
      }
    },
    [updateMinistryMutation, ministriesQuery]
  );

  const deleteMinistry = useCallback(
    async (id: string) => {
      try {
        await deleteMinistryMutation.mutateAsync({ id });
        await Promise.all([ministriesQuery.refetch(), userMinistriesQuery.refetch()]);
        return { success: true };
      } catch (e) {
        return { success: false, message: getTRPCErrorMessage(e) };
      }
    },
    [deleteMinistryMutation, ministriesQuery, userMinistriesQuery]
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
    return conversationsQuery.refetch();
  }, [conversationsQuery]);

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
