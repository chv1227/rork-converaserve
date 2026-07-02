import { useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Href } from "expo-router";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Users,
  Calendar,
  MessageCircle,
  AlertCircle,
  UserPlus,
  Settings,
  Heart,
} from "lucide-react-native";
import Colors from '@/constants/colors';
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React from "react";

type NotificationType = "join_request" | "event" | "message" | "announcement" | "ministry" | "prayer" | "system" | "invitation" | "reminder" | "info" | "success" | "warning" | "error" | "other";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  data?: Record<string, string>;
}

function NotificationCard({ 
  notification, 
  onPress, 
  onMarkAsRead, 
  onDelete,
  getIcon,
  getTimeAgo,
  themeColors,
}: { 
  notification: Notification;
  onPress: () => void;
  onMarkAsRead: () => void;
  onDelete: () => void;
  getIcon: (type: Notification["type"]) => React.ReactNode;
  getTimeAgo: (dateStr: string) => string;
  themeColors: Record<string, string>;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View style={[
        styles.notificationCard,
        { backgroundColor: themeColors.surface },
        !notification.isRead && [styles.unreadCard, { backgroundColor: themeColors.surfaceElevated, borderLeftColor: themeColors.primary }],
        { transform: [{ scale: scaleAnim }] }
      ]}>
        <View style={styles.notificationContent}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: themeColors.surfaceSecondary },
              !notification.isRead && { backgroundColor: themeColors.primaryLight },
            ]}
          >
            {getIcon(notification.type)}
          </View>
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text
                style={[
                  styles.notificationTitle,
                  { color: themeColors.text },
                  !notification.isRead && styles.unreadTitle,
                ]}
                numberOfLines={1}
              >
                {notification.title}
              </Text>
              {!notification.isRead && <View style={[styles.unreadDot, { backgroundColor: themeColors.primary }]} />}
            </View>
            <Text style={[styles.notificationMessage, { color: themeColors.textSecondary }]} numberOfLines={2}>
              {notification.message}
            </Text>
            <Text style={[styles.notificationTime, { color: themeColors.textTertiary }]}>
              {getTimeAgo(notification.createdAt)}
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          {!notification.isRead && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onMarkAsRead}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Check size={18} color={themeColors.success} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 size={18} color={themeColors.error} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

function mapDbType(dbType: string): NotificationType {
  const typeMap: Record<string, NotificationType> = {
    info: 'system',
    success: 'system',
    warning: 'system',
    error: 'system',
    invitation: 'join_request',
    reminder: 'event',
    announcement: 'announcement',
    message: 'message',
    prayer: 'prayer',
    event: 'event',
    other: 'system',
  };
  return typeMap[dbType] || 'system';
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors: themeColors } = useTheme();
  const { user, currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ['notifications', user?.id, currentOrganization?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      console.log('Fetching notifications for user:', user.id);
      const query = supabase
        .from('system_notifications')
        .select('*')
        .eq('user_id', user.id)
        .is('dismissed_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (currentOrganization?.id) {
        (query as any).or(`church_id.eq.${currentOrganization.id},church_id.is.null`);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching notifications:', error.message);
        return [];
      }
      return (data || []).map((n: { id: string; type: string; title: string; message: string; read_at: string | null; created_at: string; action_url: string | null; metadata: Record<string, unknown> }) => ({
        id: n.id,
        type: mapDbType(n.type),
        title: n.title,
        message: n.message,
        isRead: !!n.read_at,
        createdAt: n.created_at,
        actionUrl: n.action_url || undefined,
        data: (n.metadata || {}) as Record<string, string>,
      })) as Notification[];
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

  const notifications = useMemo(() => notificationsQuery.data || [], [notificationsQuery.data]);
  const isLoading = notificationsQuery.isLoading;
  const isRefreshing = notificationsQuery.isRefetching;

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const onRefresh = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log('Refreshing notifications...');
    void notificationsQuery.refetch();
  }, [notificationsQuery]);

  const markReadMutation = useMutation({
    mutationFn: async (notifId: string) => {
      const { error } = await (supabase.from('system_notifications') as any)
        .update({ read_at: new Date().toISOString() })
        .eq('id', notifId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
      if (unreadIds.length === 0) return;
      const { error } = await (supabase.from('system_notifications') as any)
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (notifId: string) => {
      const { error } = await (supabase.from('system_notifications') as any)
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', notifId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const dismissAllMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const ids = notifications.map(n => n.id);
      if (ids.length === 0) return;
      const { error } = await (supabase.from('system_notifications') as any)
        .update({ dismissed_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAsRead = useCallback((id: string) => {
    console.log('Marking notification as read:', id);
    markReadMutation.mutate(id);
  }, [markReadMutation]);

  const markAllAsRead = useCallback(() => {
    console.log('Marking all notifications as read');
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

  const deleteNotification = useCallback((id: string) => {
    console.log('Dismissing notification:', id);
    dismissMutation.mutate(id);
  }, [dismissMutation]);

  const clearAll = useCallback(() => {
    console.log('Clearing all notifications');
    dismissAllMutation.mutate();
  }, [dismissAllMutation]);

  const handleNotificationPress = useCallback(
    (notification: Notification) => {
      if (!notification.isRead) {
        markAsRead(notification.id);
      }
      if (notification.actionUrl) {
        router.push(notification.actionUrl as Href);
      }
    },
    [markAsRead, router]
  );

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "join_request":
      case "invitation":
        return <UserPlus size={20} color={Colors.tertiary} />;
      case "event":
      case "reminder":
        return <Calendar size={20} color={Colors.secondary} />;
      case "message":
        return <MessageCircle size={20} color={Colors.primary} />;
      case "announcement":
        return <AlertCircle size={20} color={Colors.warning} />;
      case "ministry":
        return <Users size={20} color={Colors.success} />;
      case "prayer":
        return <Heart size={20} color="#EC4899" />;
      case "system":
      case "info":
      case "success":
      case "warning":
      case "error":
      case "other":
        return <Settings size={20} color={Colors.textSecondary} />;
      default:
        return <Bell size={20} color={Colors.textSecondary} />;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: themeColors.surface, borderBottomColor: themeColors.borderLight }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.title, { color: themeColors.text }]}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.createButtonHeader}
            onPress={() => router.push("/settings" as Href)}
            activeOpacity={0.7}
            testID="notifications-settings-button"
          >
            <Settings size={20} color={themeColors.text} />
          </TouchableOpacity>
        </View>
        {notifications.length > 0 && (
          <View style={styles.headerActions}>
            {unreadCount > 0 && (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={markAllAsRead}
              >
                <CheckCheck size={16} color={themeColors.primary} />
                <Text style={[styles.headerButtonText, { color: themeColors.primary }]}>Mark all read</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.headerButton} onPress={clearAll}>
              <Trash2 size={16} color={themeColors.textSecondary} />
              <Text style={[styles.headerButtonText, { color: themeColors.textSecondary }]}>
                Clear all
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.primary} />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: themeColors.surfaceSecondary }]}>
              <Bell size={48} color={themeColors.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No Notifications</Text>
            <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
              You&apos;re all caught up! Check back later for updates.
            </Text>
          </View>
        ) : (
          <>
            {notifications
              .filter((n) => !n.isRead)
              .map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onPress={() => handleNotificationPress(notification)}
                  onMarkAsRead={() => markAsRead(notification.id)}
                  onDelete={() => deleteNotification(notification.id)}
                  getIcon={getNotificationIcon}
                  getTimeAgo={getTimeAgo}
                  themeColors={themeColors}
                />
              ))}
            
            {notifications.filter((n) => n.isRead).length > 0 && (
              <>
                {notifications.filter((n) => !n.isRead).length > 0 && (
                  <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>Earlier</Text>
                )}
                {notifications
                  .filter((n) => n.isRead)
                  .map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onPress={() => handleNotificationPress(notification)}
                      onMarkAsRead={() => markAsRead(notification.id)}
                      onDelete={() => deleteNotification(notification.id)}
                      getIcon={getNotificationIcon}
                      getTimeAgo={getTimeAgo}
                      themeColors={themeColors}
                    />
                  ))}
              </>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  createButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  badge: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  badgeText: {
    color: Colors.textInverse,
    fontSize: 12,
    fontWeight: "600" as const,
  },
  headerActions: {
    flexDirection: "row",
    gap: 16,
    marginTop: 12,
  },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerButtonText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "500" as const,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    padding: 60,
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 12,
  },
  notificationCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  unreadCard: {
    backgroundColor: Colors.surfaceElevated,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  notificationContent: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadIconContainer: {
    backgroundColor: Colors.primaryLight,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: "500" as const,
    color: Colors.text,
    flex: 1,
  },
  unreadTitle: {
    fontWeight: "600" as const,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  notificationMessage: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 6,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 8,
  },
  actionButton: {
    padding: 6,
  },
});
