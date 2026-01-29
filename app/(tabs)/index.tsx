import { useCallback, useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Platform, Animated, Easing } from "react-native";
import { Image } from "expo-image";
import { useRouter, Href } from "expo-router";
import { Bell, Search, Heart, Calendar, Users } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { useData } from "@/providers/DataProvider";
import AnnouncementCard from "@/components/AnnouncementCard";
import EventCard from "@/components/EventCard";
import SectionHeader from "@/components/SectionHeader";
import { useScalePress } from "@/hooks/useAnimations";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { 
    isLoading, 
    isRefreshing, 
    refresh, 
    getUpcomingEvents, 
    getGeneralAnnouncements, 
    userMinistries,
    getTotalUnread,
  } = useData();
  const [localRefreshing, setLocalRefreshing] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const quickActionsAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  
  const eventsCardAnim = useScalePress();
  const givingCardAnim = useScalePress();

  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(quickActionsAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, [headerAnim, quickActionsAnim, contentAnim]);

  const announcements = getGeneralAnnouncements(2);
  const upcomingEvents = getUpcomingEvents(3);
  const totalUnread = getTotalUnread();

  const onRefresh = useCallback(async () => {
    setLocalRefreshing(true);
    try {
      await refresh();
    } catch {
      // Refresh error handled silently
    } finally {
      setLocalRefreshing(false);
    }
  }, [refresh]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerContent}>
          <View style={styles.greeting}>
            <Text style={styles.greetingText}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name.split(" ")[0] || "User"}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton}>
              <Search size={22} color={Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => router.push("/(tabs)/notifications" as Href)}
            >
              <Bell size={22} color={Colors.text} />
              {totalUnread > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationCount}>
                    {totalUnread > 9 ? "9+" : totalUnread}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/(tabs)/profile" as Href)}>
              <Image
                source={{ uri: user?.avatar || "https://ui-avatars.com/api/?name=User" }}
                style={styles.avatar}
                contentFit="cover"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={localRefreshing || isRefreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <Animated.View style={[styles.quickActions, { opacity: quickActionsAnim, transform: [{ translateY: quickActionsAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: Colors.primary }]}
            onPress={() => router.push("/(tabs)/calendar" as Href)}
            onPressIn={eventsCardAnim.onPressIn}
            onPressOut={eventsCardAnim.onPressOut}
            activeOpacity={1}
          >
            <Animated.View style={{ transform: [{ scale: eventsCardAnim.scale }] }}>
              <Text style={styles.quickActionTitle}>Upcoming Events</Text>
              <Text style={styles.quickActionSubtitle}>{upcomingEvents.length} this week</Text>
            </Animated.View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAction, styles.givingAction]}
            onPress={() => router.push("/giving" as Href)}
            onPressIn={givingCardAnim.onPressIn}
            onPressOut={givingCardAnim.onPressOut}
            activeOpacity={1}
          >
            <Animated.View style={{ transform: [{ scale: givingCardAnim.scale }] }}>
              <View style={styles.givingIconContainer}>
                <Heart size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionTitle}>Giving</Text>
              <Text style={styles.quickActionSubtitle}>Tithes & Offerings</Text>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>

        <SectionHeader
          title="Announcements"
          actionText="View all"
          onActionPress={() => router.push("/announcements" as Href)}
        />
        <View style={styles.announcementsContainer}>
          {isLoading && announcements.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : announcements.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No announcements yet</Text>
            </View>
          ) : (
            announcements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                onPress={() => {}}
              />
            ))
          )}
        </View>

        <SectionHeader
          title="Weekly Highlights"
          actionText="View all"
          onActionPress={() => router.push("/(tabs)/calendar" as Href)}
        />
        <View style={styles.highlightsContainer}>
          <View style={styles.highlightCard}>
            <View style={[styles.highlightIconContainer, { backgroundColor: Colors.primary + '15' }]}>
              <Calendar size={20} color={Colors.primary} />
            </View>
            <View style={styles.highlightContent}>
              <Text style={styles.highlightValue}>{upcomingEvents.length}</Text>
              <Text style={styles.highlightLabel}>Events This Week</Text>
            </View>
          </View>
          <View style={styles.highlightCard}>
            <View style={[styles.highlightIconContainer, { backgroundColor: Colors.secondary + '15' }]}>
              <Users size={20} color={Colors.secondary} />
            </View>
            <View style={styles.highlightContent}>
              <Text style={styles.highlightValue}>{userMinistries.length}</Text>
              <Text style={styles.highlightLabel}>Your Ministries</Text>
            </View>
          </View>
        </View>

        {upcomingEvents.length > 0 && (
          <>
            <SectionHeader
              title="Upcoming Events"
              actionText="See all"
              onActionPress={() => router.push("/(tabs)/calendar" as Href)}
            />
            <View style={styles.eventsContainer}>
              {upcomingEvents.slice(0, 2).map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  compact
                  onPress={() => {}}
                />
              ))}
            </View>
          </>
        )}

        <SectionHeader
          title="Your Ministries"
          actionText="View all"
          onActionPress={() => router.push("/(tabs)/groups" as Href)}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.ministriesHorizontal}
        >
          {userMinistries.slice(0, 4).map((ministry) => (
            <TouchableOpacity
              key={ministry.id}
              style={styles.ministryChip}
              onPress={() => router.push(`/group/${ministry.id}` as Href)}
            >
              <Image
                source={{ uri: ministry.image }}
                style={styles.ministryChipImage}
                contentFit="cover"
              />
              <View style={styles.ministryChipOverlay} />
              <Text style={styles.ministryChipText}>{ministry.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

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
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    flex: 1,
  },
  greetingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  userName: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.text,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: Colors.error,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationCount: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.textInverse,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 4,
  },
  content: {
    flex: 1,
  },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  quickAction: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
  },
  givingAction: {
    backgroundColor: Colors.secondary,
  },
  givingIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.textInverse,
    marginBottom: 4,
  },
  quickActionSubtitle: {
    fontSize: 13,
    color: Colors.textInverse,
    opacity: 0.85,
  },
  announcementsContainer: {
    paddingHorizontal: 20,
  },
  eventsContainer: {
    paddingHorizontal: 20,
  },
  ministriesHorizontal: {
    paddingHorizontal: 20,
    gap: 12,
  },
  ministryChip: {
    width: 140,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  ministryChipImage: {
    ...StyleSheet.absoluteFillObject,
  },
  ministryChipOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  ministryChipText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.textInverse,
    padding: 10,
  },
  setupBanner: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  setupBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  setupBannerText: {
    flex: 1,
  },
  setupBannerTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  setupBannerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  highlightsContainer: {
    flexDirection: "row" as const,
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 8,
  },
  highlightCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  highlightIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  highlightContent: {
    flex: 1,
  },
  highlightValue: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  highlightLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
