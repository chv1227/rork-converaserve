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
  Megaphone, Pin, Globe, ChevronRight, Sparkles, ArrowUpRight,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useAuth } from "@/providers/AuthProvider";
import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import PendingApprovalBanner from "@/components/PendingApprovalBanner";
import { useScalePress, usePulse } from "@/hooks/useAnimations";
import { Announcement } from "@/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 12 as const;

// ── Helpers ──

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
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

function getRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return `${Math.floor(diffDays / 7)}w`;
  } catch {
    return "";
  }
}

// ── Quick Action Config ──

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  sub: string;
  href: Href;
  gradient: readonly [string, string, ...string[]];
  iconBg: string;
}

// ── Announcement Card ──

const AnnouncementCardItem = React.memo(function AnnouncementCardItem({
  announcement,
  index,
  colors,
  onPress,
}: {
  announcement: Announcement;
  index: number;
  colors: ReturnType<typeof useTheme>["colors"];
  onPress: () => void;
}) {
  const priorityColor =
    announcement.priority === "high" ? colors.error
    : announcement.priority === "low" ? colors.textTertiary
    : colors.primary;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 400, delay: 120 + index * 80,
        useNativeDriver: true, easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0, duration: 400, delay: 120 + index * 80,
        useNativeDriver: true, easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        style={[styles.announcementCard, {
          backgroundColor: colors.surface,
          borderLeftColor: priorityColor,
        }]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        {/* Top row: chips */}
        <View style={styles.announcementCardTop}>
          {announcement.isPinned && (
            <View style={[styles.chip, { backgroundColor: colors.primary + "12" }]}>
              <Pin size={10} color={colors.primary} />
              <Text style={[styles.chipText, { color: colors.primary }]}>Pinned</Text>
            </View>
          )}
          <View style={[styles.chip, {
            backgroundColor: announcement.ministryId
              ? colors.secondary + "14"
              : colors.tertiary + "14",
          }]}>
            {announcement.ministryId
              ? <Users size={10} color={colors.secondary} />
              : <Globe size={10} color={colors.tertiary} />}
            <Text style={[styles.chipText, {
              color: announcement.ministryId ? colors.secondary : colors.tertiary,
            }]}>
              {announcement.ministryId ? (announcement.ministryName || "Ministry") : "Church-wide"}
            </Text>
          </View>
        </View>

        {/* Title & excerpt */}
        <Text style={[styles.announcementTitle, { color: colors.text }]} numberOfLines={2}>
          {announcement.title}
        </Text>
        {announcement.content ? (
          <Text style={[styles.announcementContent, { color: colors.textSecondary }]} numberOfLines={2}>
            {announcement.content}
          </Text>
        ) : null}

        {/* Footer */}
        <View style={styles.announcementFooter}>
          <View style={styles.announcementFooterLeft}>
            {announcement.authorAvatar ? (
              <Image
                source={{ uri: announcement.authorAvatar }}
                style={styles.authorAvatar}
                contentFit="cover"
              />
            ) : null}
            <Text style={[styles.announcementAuthor, { color: colors.textTertiary }]}>
              {announcement.author || "Church"}
            </Text>
          </View>
          <Text style={[styles.announcementDate, { color: colors.textTertiary }]}>
            {getRelativeTime(announcement.date)}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ── Main Screen ──

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
  const bodyFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(bodyFade, { toValue: 1, duration: 600, delay: 150, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
  }, [headerAnim, bodyFade]);

  const announcements = getGeneralAnnouncements(4);
  const totalUnread = getTotalUnread();
  const greeting = useMemo(() => getTimeBasedGreeting(), []);
  const firstName = user?.name?.split(" ")[0] || "Friend";
  const today = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  }, []);

  const onRefresh = useCallback(async () => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLocalRefreshing(true);
    try { await refresh(); } catch { /* silent */ }
    finally { setLocalRefreshing(false); }
  }, [refresh]);

  const notificationAnim = useScalePress();
  const pulseStyle = usePulse(2000);

  const announcementCountLabel = useMemo(() => {
    const count = allAnnouncements.length;
    if (count === 0) return "No announcements yet";
    return `${count} announcement${count !== 1 ? "s" : ""}`;
  }, [allAnnouncements.length]);

  const handleAnnouncementPress = useCallback(() => {
    router.push("/announcements" as Href);
  }, [router]);

  // ── Quick Actions data ──
  const quickActions: QuickAction[] = useMemo(() => [
    {
      icon: <MessageCircle size={22} color="#FFFFFF" />,
      label: "Messages",
      sub: totalUnread > 0 ? `${totalUnread} unread` : "Start a chat",
      href: "/(tabs)/messages" as Href,
      gradient: ["#6366F1", "#8B5CF6", "#A78BFA"] as const,
      iconBg: "rgba(255,255,255,0.18)",
    },
    {
      icon: <Heart size={22} color="#FFFFFF" />,
      label: "Giving",
      sub: givingStats.thisMonth > 0 ? `$${givingStats.thisMonth.toLocaleString()} this mo` : "Give now",
      href: "/(tabs)/giving" as Href,
      gradient: ["#EC4899", "#F43F5E", "#FB7185"] as const,
      iconBg: "rgba(255,255,255,0.18)",
    },
    {
      icon: <Users size={22} color="#FFFFFF" />,
      label: "Community",
      sub: `${membersCount} member${membersCount !== 1 ? "s" : ""}`,
      href: "/(tabs)/profile" as Href,
      gradient: ["#06B6D4", "#0EA5E9", "#38BDF8"] as const,
      iconBg: "rgba(255,255,255,0.18)",
    },
    {
      icon: <Calendar size={22} color="#FFFFFF" />,
      label: "Events",
      sub: "View calendar",
      href: "/(tabs)/calendar" as Href,
      gradient: ["#10B981", "#34D399", "#6EE7B7"] as const,
      iconBg: "rgba(255,255,255,0.18)",
    },
    {
      icon: <ClipboardList size={22} color="#FFFFFF" />,
      label: "Forms",
      sub: "Sign-ups & more",
      href: "/forms" as Href,
      gradient: ["#F59E0B", "#F97316", "#FB923C"] as const,
      iconBg: "rgba(255,255,255,0.18)",
    },
  ], [totalUnread, givingStats.thisMonth, membersCount]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.headerWrapper]}>
        <LinearGradient
          colors={["#0F2440", "#1B365D", "#1E4A6E", "#2A5F8A"]}
          locations={[0, 0.3, 0.7, 1]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top }]}
        >
          {/* Subtle overlay pattern */}
          <View style={styles.headerPattern} pointerEvents="none" />

          <Animated.View style={[
            styles.headerContent,
            { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }] },
          ]}>
            {/* Top bar: org badge + actions */}
            <View style={styles.headerTopRow}>
              {currentOrganization ? (
                <BlurView intensity={20} tint="light" style={styles.orgBadgeBlur}>
                  <Sparkles size={12} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.orgBadgeText} numberOfLines={1}>
                    {currentOrganization.name}
                  </Text>
                </BlurView>
              ) : <View style={{ flex: 1 }} />}

              <View style={styles.headerActions}>
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
                      <Animated.View style={[styles.notifBadge, totalUnread > 0 ? pulseStyle : undefined]}>
                        <Text style={styles.notifBadgeText}>
                          {totalUnread > 99 ? "99+" : totalUnread}
                        </Text>
                      </Animated.View>
                    )}
                  </Animated.View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push("/(tabs)/profile" as Href)}
                  style={styles.avatarButton}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={["#D4A843", "#C8943E", "#B8862D"]}
                    style={styles.avatarRing}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  >
                    <Image
                      source={{
                        uri: user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}&background=1B365D&color=fff&bold=true`,
                      }}
                      style={styles.avatar}
                      contentFit="cover"
                    />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            {/* Greeting */}
            <View style={styles.greetingBlock}>
              <Text style={styles.greetingLabel}>{greeting}</Text>
              <Text style={styles.userNameText}>{firstName}</Text>
              <Text style={styles.dateLabel}>{today}</Text>
            </View>
          </Animated.View>
        </LinearGradient>
      </View>

      {/* ── Body ── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 130 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={localRefreshing || isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            progressViewOffset={8}
          />
        }
      >
        {/* Status banners */}
        {isChurchPending && <PendingApprovalBanner type="pending" />}
        {churchStatus === "suspended" && <PendingApprovalBanner type="suspended" />}

        <Animated.View style={{ opacity: bodyFade }}>

          {/* ── Quick Actions — horizontal scrollable cards ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickActionsScroll}
              decelerationRate="fast"
              snapToInterval={SCREEN_WIDTH * 0.42 + 12}
            >
              {quickActions.map((action, idx) => (
                <TouchableOpacity
                  key={action.label}
                  style={styles.quickActionCard}
                  onPress={() => {
                    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(action.href);
                  }}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={[...action.gradient]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.quickActionGradient}
                  >
                    <View style={[styles.quickActionIcon, { backgroundColor: action.iconBg }]}>
                      {action.icon}
                    </View>
                    <Text style={styles.quickActionLabel} numberOfLines={1}>
                      {action.label}
                    </Text>
                    <Text style={styles.quickActionSub} numberOfLines={1}>
                      {action.sub}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ── Stats Row ── */}
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: colors.surface }]}
              onPress={() => router.push("/(tabs)/messages" as Href)}
              activeOpacity={0.7}
            >
              <View style={[styles.statIconCircle, { backgroundColor: "#6366F1" + "12" }]}>
                <MessageCircle size={16} color="#6366F1" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{totalUnread}</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Unread</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: colors.surface }]}
              onPress={() => router.push("/(tabs)/profile" as Href)}
              activeOpacity={0.7}
            >
              <View style={[styles.statIconCircle, { backgroundColor: "#06B6D4" + "12" }]}>
                <Users size={16} color="#06B6D4" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{membersCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Members</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: colors.surface }]}
              onPress={() => router.push("/announcements" as Href)}
              activeOpacity={0.7}
            >
              <View style={[styles.statIconCircle, { backgroundColor: "#EC4899" + "12" }]}>
                <Megaphone size={16} color="#EC4899" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{allAnnouncements.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Posts</Text>
            </TouchableOpacity>
          </View>

          {/* ── Announcements ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.sectionIconDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Announcements</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/announcements" as Href)}
                style={[styles.viewAllBtn, { backgroundColor: colors.primary + "08" }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.viewAllText, { color: colors.primary }]}>View all</Text>
                <ArrowUpRight size={13} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.sectionSubtitle, { color: colors.textTertiary }]}>
              {announcementCountLabel}
            </Text>

            {isLoading && announcements.length === 0 ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : announcements.length > 0 ? (
              <View style={styles.announcementsList}>
                {announcements.map((a, i) => (
                  <AnnouncementCardItem
                    key={a.id}
                    announcement={a}
                    index={i}
                    colors={colors}
                    onPress={handleAnnouncementPress}
                  />
                ))}
              </View>
            ) : (
              <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
                <View style={[styles.emptyIconCircle, { backgroundColor: colors.primary + "08" }]}>
                  <Megaphone size={26} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No announcements yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Church updates and news will appear here
                </Text>
              </View>
            )}
          </View>

          <View style={{ height: 24 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Header ──
  headerWrapper: {
    overflow: "hidden",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerGradient: {
    paddingBottom: 36,
    position: "relative",
  },
  headerPattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.03,
    backgroundColor: "#FFFFFF",
    // Subtle radial-like overlay created via gradient
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    marginBottom: 18,
  },
  orgBadgeBlur: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: "hidden",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  orgBadgeText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "rgba(255,255,255,0.92)",
    maxWidth: 160,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  notifBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#EF4444",
    minWidth: 19,
    height: 19,
    borderRadius: 9.5,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#1B365D",
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: "#FFFFFF",
  },
  avatarButton: {
    borderRadius: 24,
  },
  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    padding: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 39,
    height: 39,
    borderRadius: 19.5,
    borderWidth: 2,
    borderColor: "#0F2440",
  },
  greetingBlock: {
    paddingTop: 4,
  },
  greetingLabel: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 0.3,
  },
  userNameText: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  dateLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.50)",
    marginTop: 4,
    fontWeight: "400" as const,
  },

  // ── Body ──
  scrollView: {
    flex: 1,
    marginTop: -8,
  },
  scrollContent: {
    paddingTop: 20,
  },

  // ── Section ──
  section: {
    paddingHorizontal: 20,
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionIconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "700" as const,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 16,
    marginLeft: 2,
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },

  // ── Quick Actions ──
  quickActionsScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  quickActionCard: {
    width: SCREEN_WIDTH * 0.42,
    height: 150,
    borderRadius: 24,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.10,
        shadowRadius: 14,
      },
      android: { elevation: 6 },
      web: { boxShadow: "0 6px 14px rgba(0,0,0,0.10)" },
    }),
  },
  quickActionGradient: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
  },
  quickActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  quickActionSub: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "rgba(255,255,255,0.75)",
  },

  // ── Stats ──
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
      web: { boxShadow: "0 2px 10px rgba(0,0,0,0.04)" },
    }),
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800" as const,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    letterSpacing: 0.3,
  },

  // ── Announcements ──
  announcementsList: {
    gap: 10,
  },
  announcementCard: {
    borderRadius: 18,
    padding: 16,
    borderLeftWidth: 3,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
      web: { boxShadow: "0 2px 10px rgba(0,0,0,0.05)" },
    }),
  },
  announcementCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  chipText: {
    fontSize: 10,
    fontWeight: "700" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    lineHeight: 22,
    marginBottom: 6,
    letterSpacing: -0.1,
  },
  announcementContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  announcementFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  announcementFooterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  authorAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  announcementAuthor: {
    fontSize: 12,
    fontWeight: "500" as const,
  },
  announcementDate: {
    fontSize: 12,
    fontWeight: "500" as const,
  },
  loadingState: {
    padding: 32,
    alignItems: "center",
  },
  emptyState: {
    borderRadius: 20,
    padding: 36,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
      },
      android: { elevation: 1 },
      web: { boxShadow: "0 2px 10px rgba(0,0,0,0.03)" },
    }),
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
});
