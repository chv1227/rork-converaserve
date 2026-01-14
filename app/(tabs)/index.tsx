import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useRouter, Href } from "expo-router";
import { Bell, Search, AlertCircle } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { useData } from "@/providers/DataProvider";
import AnnouncementCard from "@/components/AnnouncementCard";
import EventCard from "@/components/EventCard";
import SectionHeader from "@/components/SectionHeader";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, currentOrganization } = useAuth();
  const { 
    isLoading, 
    isRefreshing, 
    refresh, 
    getUpcomingEvents, 
    getAnnouncements, 
    userMinistries,
    getTotalUnread,
  } = useData();
  const [localRefreshing, setLocalRefreshing] = useState(false);

  const announcements = getAnnouncements(2);
  const upcomingEvents = getUpcomingEvents(3);
  const totalUnread = getTotalUnread();

  const onRefresh = useCallback(async () => {
    console.log("Refreshing home data...");
    setLocalRefreshing(true);
    try {
      await refresh();
    } catch (error) {
      console.log("Refresh error:", error);
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
            <TouchableOpacity style={styles.iconButton}>
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
        {!currentOrganization && (
          <TouchableOpacity
            style={styles.setupBanner}
            onPress={() => router.push("/organization" as Href)}
          >
            <View style={styles.setupBannerContent}>
              <AlertCircle size={24} color={Colors.primary} />
              <View style={styles.setupBannerText}>
                <Text style={styles.setupBannerTitle}>Set Up Your Church</Text>
                <Text style={styles.setupBannerSubtitle}>Create or join a church to get started</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: Colors.primary }]}
            onPress={() => router.push("/(tabs)/calendar" as Href)}
          >
            <Text style={styles.quickActionTitle}>Upcoming Events</Text>
            <Text style={styles.quickActionSubtitle}>{upcomingEvents.length} this week</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: Colors.secondary }]}
            onPress={() => router.push("/(tabs)/groups" as Href)}
          >
            <Text style={styles.quickActionTitle}>My Groups</Text>
            <Text style={styles.quickActionSubtitle}>{userMinistries.length} ministries</Text>
          </TouchableOpacity>
        </View>

        <SectionHeader
          title="Announcements"
          actionText="View all"
          onActionPress={() => console.log("View all announcements")}
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
                onPress={() => console.log("Announcement pressed:", announcement.id)}
              />
            ))
          )}
        </View>

        <SectionHeader
          title="Upcoming Events"
          actionText="See all"
          onActionPress={() => router.push("/(tabs)/calendar" as Href)}
        />
        <View style={styles.eventsContainer}>
          {isLoading && upcomingEvents.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : upcomingEvents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No upcoming events</Text>
            </View>
          ) : (
            upcomingEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                compact
                onPress={() => console.log("Event pressed:", event.id)}
              />
            ))
          )}
        </View>

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
});
