import React, { useCallback, useState, useRef, useEffect, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  ActivityIndicator, Platform, Animated, Easing, Dimensions,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter, Href } from "expo-router";
import {
  Bell, MessageCircle, Heart, Users, Calendar, ClipboardList,
  Megaphone, Pin, Globe, ChevronRight, Sparkles,
} from "lucide-react-native";
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
  } catch {
    return "";
  }
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
  const bodyAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(80, [
      Animated.timing(headerAnim, { toValue: 1, duration: 450, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(bodyAnim, { toValue: 1, duration: 450, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
  }, [headerAnim, bodyAnim]);

  const announcements = getGeneralAnnouncements(6);
  const totalUnread = getTotalUnread();
  const greeting = useMemo(() => getTimeBasedGreeting(), []);
  const firstName = user?.name?.split(" ")[0] || "Friend";

  const onRefresh = useCallback(async () => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLocalRefreshing(true);
    try { await refresh(); } catch { /* handled silently */ }
    finally { setLocalRefreshing(false); }
  }, [refresh]);

  const notificationAnim = useScalePress();

  const announcementCountLabel = useMemo(() => {
    if (allAnnouncements.length === 0) return "No announcements yet";
    return `${allAnnouncements.length} announcement${allAnnouncements.length > 1 ? "s" : ""}`;
  }, [allAnnouncements.length]);

  const renderAnnouncementCard = useCallback(
    (announcement: Announcement, index: number) => {
      const priorityColor =
        announcement.priority === "high" ? colors.error
        : announcement.priority === "low" ? colors.textTertiary
        : colors.primary;

      const fadeAnim = useRef(new Animated.Value(0)).current;
      const slideAnim = useRef(new Animated.Value(16)).current;

      useEffect(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay: 100 + index * 60, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
          Animated.timing(slideAnim, { toValue: 0, duration: 350, delay: 100 + index * 60, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        ]).start();
      }, [fadeAnim, slideAnim, index]);

      return (
        <Animated.View key={announcement.id} style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <TouchableOpacity
            style={[styles.announcementCard, { backgroundColor: colors.surface }]}
            onPress={() => router.push("/announcements" as Href)}
            activeOpacity={0.7}
          >
            <View style={styles.announcementCardTop}>
              {announcement.isPinned && (
                <View style={[styles.pinnedChip, { backgroundColor: colors.primary + "0D" }]}>
                  <Pin size={10} color={colors.primary} />
                  <Text style={[styles.pinnedChipText, { color: colors.primary }]}>Pinned</Text>
                </View>
              )}
              <View style={[styles.typeChip, { backgroundColor: announcement.ministryId ? colors.secondary + "12" : colors.primary + "10" }]}>
                {announcement.ministryId ? <Users size={10} color={colors.secondary} /> : <Globe size={10} color={colors.primary} />}
                <Text style={[styles.typeChipText, { color: announcement.ministryId ? colors.secondary : colors.primary }]}>
                  {announcement.ministryId ? (announcement.ministryName || "Ministry") : "General"}
                </Text>
              </View>
            </View>
            <Text style={[styles.announcementTitle, { color: colors.text }]} numberOfLines={2}>
              {announcement.title}
            </Text>
            <Text style={[styles.announcementContent, { color: colors.textSecondary }]} numberOfLines={2}>
              {announcement.content}
            </Text>
            <View style={styles.announcementFooter}>
              <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
              <Text style={[styles.announcementDate, { color: colors.textTertiary }]}>
                {formatAnnouncementDate(announcement.date)}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [colors, router]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMiddle, colors.gradientEnd]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.headerSection, { paddingTop: insets.top }]}
      >
        <Animated.View style={[styles.headerRow, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }] }]}>
          <View style={styles.headerLeft}>
            {currentOrganization && (
              <View style={styles.orgBadge}>
                <Sparkles size={11} color="rgba(212,168,67,0.95)" />
                <Text style={styles.orgName} numberOfLines={1}>{currentOrganization.name}</Text>
              </View>
            )}
            <Text style={styles.greetingText}>{greeting}</Text>
            <Text style={styles.userName}>{firstName}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push("/(tabs)/notifications" as Href)}
              onPressIn={notificationAnim.onPressIn}
              onPressOut={notificationAnim.onPressOut}
              activeOpacity={1}
            >
              <Animated.View style={{ transform: [{ scale: notificationAnim.scale }] }}>
                <Bell size={20} color="#FFFFFF" />
                {totalUnread > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{totalUnread > 9 ? "9+" : totalUnread}</Text>
                  </View>
                )}
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/(tabs)/profile" as Href)} style={styles.avatarRing}>
              <Image
                source={{ uri: user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}&background=fff&color=1B365D` }}
                style={styles.avatar}
                contentFit="cover"
              />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </LinearGradient>

      {/* Scrollable Body */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={localRefreshing || isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            progressViewOffset={24}
          />
        }
      >
        {isChurchPending && <PendingApprovalBanner type="pending" />}
        {churchStatus === "suspended" && <PendingApprovalBanner type="suspended" />}

        {/* Announcement Board — takes the hero position */}
        <Animated.View style={{ opacity: bodyAnim, transform: [{ translateY: bodyAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
          <View style={styles.boardHeader}>
            <View style={styles.boardHeaderLeft}>
              <View style={[styles.boardIconCircle, { backgroundColor: colors.primary + "10" }]}>
                <Megaphone size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.boardTitle, { color: colors.text }]}>Announcements</Text>
                <Text style={[styles.boardSubtitle, { color: colors.textTertiary }]}>{announcementCountLabel}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push("/announcements" as Href)} style={[styles.viewAllButton, { backgroundColor: colors.primary + "0D" }]}>
              <Text style={[styles.viewAllText, { color: colors.primary }]}>View all</Text>
              <ChevronRight size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {isLoading && announcements.length === 0 ? (
            <View style={styles.loadingBoard}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : announcements.length > 0 ? (
            <View style={styles.boardCards}>
              {announcements.slice(0, 4).map((a, i) => renderAnnouncementCard(a, i))}
            </View>
          ) : (
            <View style={[styles.emptyBoard, { backgroundColor: colors.surface }]}>
              <View style={[styles.emptyBoardIcon, { backgroundColor: colors.primary + "0A" }]}>
                <Megaphone size={24} color={colors.primary} />
              </View>
              <Text style={[styles.emptyBoardTitle, { color: colors.text }]}>No announcements yet</Text>
              <Text style={[styles.emptyBoardSub, { color: colors.textSecondary }]}>
                Updates from your church will appear here
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Quick Actions — lighter, more open */}
        <Animated.View style={[styles.quickSection, { opacity: bodyAnim }]}>
          <Text style={[styles.quickSectionTitle, { color: colors.textTertiary }]}>QUICK ACTIONS</Text>
          <View style={styles.quickGrid}>
            {([
              { icon: <MessageCircle size={20} color={colors.tertiary} />, label: "Messages", sub: totalUnread > 0 ? `${totalUnread} unread` : "Chat", href: "/(tabs)/messages" as Href, bg: colors.tertiary + "10" },
              { icon: <Heart size={20} color={colors.secondary} />, label: "Giving", sub: givingStats.thisMonth > 0 ? `$${givingStats.thisMonth.toLocaleString()}` : "Tithes", href: "/(tabs)/giving" as Href, bg: colors.secondary + "15" },
              { icon: <Users size={20} color={colors.highlight} />, label: "Community", sub: `${membersCount} members`, href: "/(tabs)/profile" as Href, bg: colors.highlight + "15" },
              { icon: <Calendar size={20} color={colors.success} />, label: "Events", sub: "Calendar", href: "/(tabs)/calendar" as Href, bg: colors.success + "15" },
              { icon: <ClipboardList size={20} color={colors.warning} />, label: "Forms", sub: "Sign-ups", href: "/forms" as Href, bg: colors.warning + "15" },
            ] as const).map((item, idx) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.quickItem, { backgroundColor: colors.surface }]}
                onPress={() => router.push(item.href)}
                activeOpacity={0.7}
              >
                <View style={[styles.quickItemIcon, { backgroundColor: item.bg }]}>{item.icon}</View>
                <Text style={[styles.quickItemLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.quickItemSub, { color: colors.textTertiary }]}>{item.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Stats row — subtle */}
        <Animated.View style={[styles.statsRow, { opacity: bodyAnim }]}>
          <TouchableOpacity style={[styles.statPill, { backgroundColor: colors.surface }]} onPress={() => router.push("/(tabs)/messages" as Href)} activeOpacity={0.7}>
            <Text style={[styles.statPillValue, { color: colors.text }]}>{totalUnread}</Text>
            <Text style={[styles.statPillLabel, { color: colors.textSecondary }]}>Unread</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.statPill, { backgroundColor: colors.surface }]} onPress={() => router.push("/(tabs)/profile" as Href)} activeOpacity={0.7}>
            <Text style={[styles.statPillValue, { color: colors.text }]}>{membersCount}</Text>
            <Text style={[styles.statPillLabel, { color: colors.textSecondary }]}>Members</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.statPill, { backgroundColor: colors.surface }]} onPress={() => router.push("/announcements" as Href)} activeOpacity={0.7}>
            <Text style={[styles.statPillValue, { color: colors.text }]}>{allAnnouncements.length}</Text>
            <Text style={[styles.statPillLabel, { color: colors.textSecondary }]}>Posts</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Header ──
  headerSection: { paddingBottom: 28 },
  headerRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12,
  },
  headerLeft: { flex: 1 },
  orgBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(212,168,67,0.15)", alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 6,
  },
  orgName: { fontSize: 11, fontWeight: "600" as const, color: "rgba(255,255,255,0.95)" },
  greetingText: { fontSize: 13, color: "rgba(255,255,255,0.80)", fontWeight: "500" as const },
  userName: { fontSize: 24, fontWeight: "700" as const, color: "#FFFFFF", marginTop: 1, letterSpacing: -0.3 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.10)", alignItems: "center", justifyContent: "center",
  },
  badge: {
    position: "absolute", top: -2, right: -2,
    backgroundColor: "#D4A843", minWidth: 17, height: 17, borderRadius: 8.5,
    alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#1B365D",
  },
  badgeText: { fontSize: 10, fontWeight: "700" as const, color: "#1B365D" },
  avatarRing: { borderWidth: 2, borderColor: "rgba(255,255,255,0.35)", borderRadius: 22, padding: 1.5 },
  avatar: { width: 40, height: 40, borderRadius: 20 },

  // ── Body ──
  scrollView: { flex: 1, marginTop: -16 },
  scrollContent: { paddingTop: 0 },

  // ── Announcement Board ──
  boardHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, marginBottom: 14, marginTop: 28,
  },
  boardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  boardIconCircle: {
    width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center",
  },
  boardTitle: { fontSize: 19, fontWeight: "700" as const, letterSpacing: -0.2 },
  boardSubtitle: { fontSize: 12, marginTop: 1 },
  viewAllButton: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
  },
  viewAllText: { fontSize: 13, fontWeight: "600" as const },
  loadingBoard: { padding: 28, alignItems: "center" },
  boardCards: { paddingHorizontal: 16, gap: 12 },
  announcementCard: {
    borderRadius: 18, padding: 18,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 12 },
      android: { elevation: 1 },
      web: { boxShadow: "0 2px 12px rgba(0,0,0,0.04)" },
    }),
  },
  announcementCardTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  pinnedChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  pinnedChipText: { fontSize: 11, fontWeight: "600" as const },
  typeChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typeChipText: { fontSize: 10, fontWeight: "600" as const, textTransform: "uppercase" as const },
  announcementTitle: { fontSize: 16, fontWeight: "700" as const, lineHeight: 22, marginBottom: 6 },
  announcementContent: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  announcementFooter: { flexDirection: "row", alignItems: "center", gap: 6 },
  priorityDot: { width: 7, height: 7, borderRadius: 3.5 },
  announcementDate: { fontSize: 12 },
  emptyBoard: {
    marginHorizontal: 16, borderRadius: 20, padding: 36, alignItems: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 10 },
      android: { elevation: 1 },
      web: { boxShadow: "0 2px 10px rgba(0,0,0,0.03)" },
    }),
  },
  emptyBoardIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyBoardTitle: { fontSize: 16, fontWeight: "600" as const, marginBottom: 4 },
  emptyBoardSub: { fontSize: 13, textAlign: "center", lineHeight: 19 },

  // ── Quick Actions ──
  quickSection: { paddingHorizontal: 16, marginTop: 28 },
  quickSectionTitle: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 1.2, marginBottom: 14, marginLeft: 4 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickItem: {
    width: (SCREEN_WIDTH - 42) / 3,
    borderRadius: 18, paddingVertical: 18, paddingHorizontal: 10, alignItems: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 8 },
      android: { elevation: 1 },
      web: { boxShadow: "0 1px 8px rgba(0,0,0,0.03)" },
    }),
  },
  quickItemIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  quickItemLabel: { fontSize: 13, fontWeight: "600" as const, marginBottom: 2, textAlign: "center" },
  quickItemSub: { fontSize: 11, textAlign: "center" },

  // ── Stats Row ──
  statsRow: { flexDirection: "row", paddingHorizontal: 16, marginTop: 28, gap: 10 },
  statPill: {
    flex: 1, borderRadius: 16, paddingVertical: 16, alignItems: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 8 },
      android: { elevation: 1 },
      web: { boxShadow: "0 1px 8px rgba(0,0,0,0.03)" },
    }),
  },
  statPillValue: { fontSize: 20, fontWeight: "700" as const },
  statPillLabel: { fontSize: 11, marginTop: 3 },
});
