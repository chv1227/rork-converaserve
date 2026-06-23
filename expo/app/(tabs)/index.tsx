import React, { useCallback, useState, useRef, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Platform, Animated, Easing, Dimensions } from "react-native";
import { Image } from "expo-image";
import { useRouter, Href } from "expo-router";
import { Bell, MessageCircle, ChevronRight, Megaphone, Sparkles, Building2, Heart, Pin, Globe, Users } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/providers/AuthProvider";
import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import PendingApprovalBanner from "@/components/PendingApprovalBanner";
import { useScalePress } from "@/hooks/useAnimations";
import { Announcement } from "@/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  if (hour >= 17 && hour < 21) return "Good Evening";
  return "Good Night";
}

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  colors: string[];
  onPress: () => void;
  delay: number;
}

function QuickActionCard({ icon, title, subtitle, colors: _colors, onPress, delay }: QuickActionProps) {
  const { colors } = useTheme();
  const scaleAnim = useScalePress();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
  }, [fadeAnim, slideAnim, delay]);

  return (
    <Animated.View style={[styles.quickActionWrapper, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity onPress={onPress} onPressIn={scaleAnim.onPressIn} onPressOut={scaleAnim.onPressOut} activeOpacity={1} style={styles.quickActionTouchable}>
        <Animated.View style={[styles.quickActionCard, { backgroundColor: colors.surface }, { transform: [{ scale: scaleAnim.scale }] }]}>
          <View style={[styles.quickActionIconContainer, { backgroundColor: colors.primary + "10" }]}>
            {icon}
          </View>
          <Text style={[styles.quickActionTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.quickActionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function formatAnnouncementDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch { return ""; }
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, currentOrganization, isChurchPending, churchStatus } = useAuth();
  const {
    isLoading, isRefreshing, refresh,
    getGeneralAnnouncements, getTotalUnread,
    membersCount, givingStats, announcements: allAnnouncements,
  } = useData();
  const [localRefreshing, setLocalRefreshing] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(contentAnim, { toValue: 1, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
  }, [headerAnim, contentAnim]);

  const announcements = getGeneralAnnouncements(5);
  const totalUnread = getTotalUnread();
  const greeting = useMemo(() => getTimeBasedGreeting(), []);
  const firstName = user?.name?.split(" ")[0] || "Friend";

  const onRefresh = useCallback(async () => {
    setLocalRefreshing(true);
    try { await refresh(); } catch { /* handled silently */ }
    finally { setLocalRefreshing(false); }
  }, [refresh]);

  const notificationAnim = useScalePress();

  const renderAnnouncementItem = useCallback((announcement: Announcement) => {
    const priorityColor = announcement.priority === "high" ? colors.error : announcement.priority === "low" ? colors.textTertiary : colors.primary;

    return (
      <TouchableOpacity
        key={announcement.id}
        style={[styles.announcementItem, { backgroundColor: colors.surface }]}
        onPress={() => router.push("/announcements" as Href)}
        activeOpacity={0.7}
      >
        <View style={styles.announcementItemTop}>
          {announcement.isPinned && (
            <View style={[styles.pinnedBadge, { backgroundColor: colors.primary + "0A" }]}>
              <Pin size={10} color={colors.primary} />
              <Text style={[styles.pinnedText, { color: colors.primary }]}>Pinned</Text>
            </View>
          )}
          <View style={[styles.typeBadge, { backgroundColor: announcement.ministryId ? colors.secondary + "15" : colors.primary + "10" }]}>
            {announcement.ministryId ? <Users size={10} color={colors.secondary} /> : <Globe size={10} color={colors.primary} />}
            <Text style={[styles.typeBadgeText, { color: announcement.ministryId ? colors.secondary : colors.primary }]}>
              {announcement.ministryId ? (announcement.ministryName || "Ministry") : "General"}
            </Text>
          </View>
        </View>
        <Text style={[styles.announcementItemTitle, { color: colors.text }]} numberOfLines={2}>{announcement.title}</Text>
        <Text style={[styles.announcementItemContent, { color: colors.textSecondary }]} numberOfLines={2}>{announcement.content}</Text>
        <View style={styles.announcementItemFooter}>
          <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
          <Text style={[styles.announcementItemDate, { color: colors.textTertiary }]}>{formatAnnouncementDate(announcement.date)}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [colors, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMiddle, colors.gradientEnd]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: insets.top }]}
      >
        <Animated.View style={[styles.header, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
          <View style={styles.headerLeft}>
            {currentOrganization && (
              <View style={styles.orgBadge}>
                <Building2 size={12} color="rgba(212,168,67,0.9)" />
                <Text style={styles.orgName} numberOfLines={1}>{currentOrganization.name}</Text>
              </View>
            )}
            <Text style={styles.greetingSmall}>{greeting}</Text>
            <Text style={styles.userName}>{firstName}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notificationButton} onPress={() => router.push("/(tabs)/notifications" as Href)} onPressIn={notificationAnim.onPressIn} onPressOut={notificationAnim.onPressOut} activeOpacity={1}>
              <Animated.View style={{ transform: [{ scale: notificationAnim.scale }] }}>
                <Bell size={22} color="#FFFFFF" />
                {totalUnread > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationCount}>{totalUnread > 9 ? "9+" : totalUnread}</Text>
                  </View>
                )}
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/(tabs)/profile" as Href)} style={styles.avatarContainer}>
              <Image source={{ uri: user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}&background=fff&color=1B365D` }} style={styles.avatar} contentFit="cover" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.View style={[styles.heroSection, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
          <View style={styles.heroContent}>
            <View style={styles.heroIconContainer}>
              <Sparkles size={20} color="#D4A843" />
            </View>
            <Text style={styles.heroTitle}>Stay Connected</Text>
            <Text style={styles.heroSubtitle}>
              {allAnnouncements.length > 0
                ? `${allAnnouncements.length} announcement${allAnnouncements.length > 1 ? "s" : ""} from your church`
                : "Check out what's happening in your community"}
            </Text>
          </View>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={localRefreshing || isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} progressViewOffset={20} />}
      >
        {isChurchPending && <PendingApprovalBanner type="pending" />}
        {churchStatus === "suspended" && <PendingApprovalBanner type="suspended" />}

        <View style={styles.quickActionsGrid}>
          <QuickActionCard icon={<Megaphone size={22} color={colors.primary} />} title="Announcements" subtitle={allAnnouncements.length > 0 ? `${allAnnouncements.length} total` : "Stay updated"} colors={[]} onPress={() => router.push("/announcements" as Href)} delay={0} />
          <QuickActionCard icon={<MessageCircle size={22} color={colors.tertiary} />} title="Messages" subtitle={totalUnread > 0 ? `${totalUnread} unread` : "Chat"} colors={[]} onPress={() => router.push("/(tabs)/messages" as Href)} delay={50} />
          <QuickActionCard icon={<Heart size={22} color={colors.secondary} />} title="Giving" subtitle={givingStats.thisMonth > 0 ? `$${givingStats.thisMonth.toLocaleString()} this month` : "Tithes & Offerings"} colors={[]} onPress={() => router.push("/(tabs)/giving" as Href)} delay={100} />
          <QuickActionCard icon={<Users size={22} color={colors.highlight} />} title="Community" subtitle={`${membersCount} members`} colors={[]} onPress={() => router.push("/(tabs)/profile" as Href)} delay={150} />
        </View>

        <Animated.View style={[styles.statsContainer, { opacity: contentAnim, transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
          <TouchableOpacity style={[styles.statCard, { backgroundColor: colors.surface }]} onPress={() => router.push("/(tabs)/messages" as Href)} activeOpacity={0.7}>
            <View style={[styles.statIconContainer, { backgroundColor: colors.primary + "0D" }]}>
              <MessageCircle size={20} color={colors.primary} />
            </View>
            <View style={styles.statContent}>
              <Text style={[styles.statValue, { color: colors.text }]}>{totalUnread}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Unread Messages</Text>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.statCard, { backgroundColor: colors.surface }]} onPress={() => router.push("/(tabs)/giving" as Href)} activeOpacity={0.7}>
            <View style={[styles.statIconContainer, { backgroundColor: colors.secondary + "15" }]}>
              <Heart size={20} color={colors.secondary} />
            </View>
            <View style={styles.statContent}>
              <Text style={[styles.statValue, { color: colors.text }]}>{membersCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Church Members</Text>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </Animated.View>

        {announcements.length > 0 && (
          <Animated.View style={[styles.section, { opacity: contentAnim, transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Latest Announcements</Text>
              <TouchableOpacity onPress={() => router.push("/announcements" as Href)}>
                <Text style={[styles.sectionAction, { color: colors.primary }]}>View all</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.announcementsContainer}>
              {isLoading && announcements.length === 0 ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : (
                announcements.slice(0, 4).map(renderAnnouncementItem)
              )}
            </View>
          </Animated.View>
        )}

        {announcements.length === 0 && !isLoading && (
          <Animated.View style={[styles.emptyAnnouncementsSection, { opacity: contentAnim, transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
            <View style={[styles.emptyAnnouncementsCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.primary + "0D" }]}>
                <Megaphone size={28} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Announcements Yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Announcements from your church will appear here</Text>
            </View>
          </Animated.View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGradient: { paddingBottom: 24 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
  },
  headerLeft: { flex: 1 },
  orgBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(212, 168, 67, 0.15)", alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 6,
  },
  orgName: {
    fontSize: 12, fontWeight: "600" as const, color: "rgba(255, 255, 255, 0.95)", letterSpacing: 0.2,
  },
  greetingSmall: {
    fontSize: 14, color: "#FFFFFF", opacity: 0.85, fontWeight: "500" as const,
  },
  userName: {
    fontSize: 26, fontWeight: "700" as const, color: "#FFFFFF", marginTop: 2, letterSpacing: -0.3,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  notificationButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)", alignItems: "center", justifyContent: "center",
  },
  notificationBadge: {
    position: "absolute", top: -2, right: -2,
    backgroundColor: "#D4A843", minWidth: 18, height: 18, borderRadius: 9,
    alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#1B365D",
  },
  notificationCount: { fontSize: 10, fontWeight: "700" as const, color: "#1B365D" },
  avatarContainer: { borderWidth: 2, borderColor: "rgba(255, 255, 255, 0.4)", borderRadius: 24, padding: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  heroSection: { paddingHorizontal: 20 },
  heroContent: {
    backgroundColor: "rgba(212, 168, 67, 0.08)", borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: "rgba(212, 168, 67, 0.12)",
  },
  heroIconContainer: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(212, 168, 67, 0.2)",
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  heroTitle: { fontSize: 20, fontWeight: "700" as const, color: "#FFFFFF", marginBottom: 6 },
  heroSubtitle: { fontSize: 14, color: "#FFFFFF", opacity: 0.9, lineHeight: 20 },
  content: { flex: 1, marginTop: -12 },
  contentContainer: { paddingTop: 0 },
  quickActionsGrid: {
    flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, paddingTop: 24, gap: 12,
  },
  quickActionWrapper: { width: (SCREEN_WIDTH - 44) / 2 },
  quickActionTouchable: { flex: 1 },
  quickActionCard: {
    borderRadius: 20, padding: 18, minHeight: 110,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12 },
      android: { elevation: 2 },
      web: { boxShadow: "0 2px 12px rgba(0, 0, 0, 0.05)" },
    }),
  },
  quickActionIconContainer: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  quickActionTitle: { fontSize: 15, fontWeight: "700" as const, marginBottom: 4 },
  quickActionSubtitle: { fontSize: 12 },
  statsContainer: { flexDirection: "row", paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  statCard: {
    flex: 1, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10 },
      android: { elevation: 2 },
      web: { boxShadow: "0 2px 10px rgba(0, 0, 0, 0.04)" },
    }),
  },
  statIconContainer: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  statContent: { flex: 1 },
  statValue: { fontSize: 22, fontWeight: "700" as const },
  statLabel: { fontSize: 11, marginTop: 2 },
  section: { paddingTop: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: "700" as const, letterSpacing: -0.2 },
  sectionAction: { fontSize: 14, fontWeight: "600" as const },
  announcementsContainer: { paddingHorizontal: 20, gap: 12 },
  announcementItem: {
    borderRadius: 16, padding: 16,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10 },
      android: { elevation: 1 },
      web: { boxShadow: "0 2px 10px rgba(0, 0, 0, 0.04)" },
    }),
  },
  announcementItemTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  pinnedBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  pinnedText: { fontSize: 11, fontWeight: "600" as const },
  typeBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typeBadgeText: { fontSize: 10, fontWeight: "600" as const, textTransform: "uppercase" as const },
  announcementItemTitle: { fontSize: 16, fontWeight: "700" as const, lineHeight: 22, marginBottom: 6 },
  announcementItemContent: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  announcementItemFooter: { flexDirection: "row", alignItems: "center", gap: 6 },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  announcementItemDate: { fontSize: 12 },
  emptyAnnouncementsSection: { paddingHorizontal: 20, paddingTop: 24 },
  emptyAnnouncementsCard: {
    borderRadius: 20, padding: 32, alignItems: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10 },
      android: { elevation: 1 },
      web: { boxShadow: "0 2px 10px rgba(0, 0, 0, 0.04)" },
    }),
  },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: "600" as const, marginBottom: 6 },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  loadingContainer: { padding: 24, alignItems: "center" },
});
