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
  const slideAnim = useRef(new Animated.Value(24)).current;

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

        <Text style={[styles.announcementTitle, { color: colors.text }]} numberOfLines={2}>
          {announcement.title}
        </Text>
        {announcement.content ? (
          <Text style={[styles.announcementContent, { color: colors.textSecondary }]} numberOfLines={2}>
            {announcement.content}
          </Text>
        ) : null}

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
      Animated.timing(headerAnim, { toValue: 1, duration: 450, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(bodyFade, { toValue: 1, duration: 550, delay: 120, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
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
      icon: <MessageCircle size={20} color="#FFFFFF" />,
      label: "Messages",
      sub: totalUnread > 0 ? `${totalUnread} unread` : "Start a chat",
      href: "/(tabs)/messages" as Href,
      gradient: ["#6366F1", "#8B5CF6"] as const,
      iconBg: "rgba(255,255,255,0.16)",
    },
    {
      icon: <Heart size={20} color="#FFFFFF" />,
      label: "Giving",
      sub: givingStats.thisMonth > 0 ? `$${givingStats.thisMonth.toLocaleString()} this mo` : "Give now",
      href: "/(tabs)/giving" as Href,
      gradient: ["#F43F5E", "#E11D48"] as const,
      iconBg: "rgba(255,255,255,0.16)",
    },
    {
      icon: <Users size={20} color="#FFFFFF" />,
      label: "Community",
      sub: `${membersCount} member${membersCount !== 1 ? "s" : ""}`,
      href: "/(tabs)/profile" as Href,
      gradient: ["#0EA5E9", "#0284C7"] as const,
      iconBg: "rgba(255,255,255,0.16)",
    },
    {
      icon: <Calendar size={20} color="#FFFFFF" />,
      label: "Events",
      sub: "View calendar",
      href: "/(tabs)/calendar" as Href,
      gradient: ["#10B981", "#059669"] as const,
      iconBg: "rgba(255,255,255,0.16)",
    },
    {
      icon: <ClipboardList size={20} color="#FFFFFF" />,
      label: "Forms",
      sub: "Sign-ups & more",
      href: "/forms" as Href,
      gradient: ["#F59E0B", "#D97706"] as const,
      iconBg: "rgba(255,255,255,0.16)",
    },
  ], [totalUnread, givingStats.thisMonth, membersCount]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={styles.headerWrapper}>
        <LinearGradient
          colors={["#0A1628", "#112240", "#1A365D", "#1E4A6E"]}
          locations={[0, 0.35, 0.72, 1]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top }]}
        >
          <Animated.View style={[
            styles.headerContent,
            {
              opacity: headerAnim,
              transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
            },
          ]}>
            {/* Top bar */}
            <View style={styles.headerTopRow}>
              {currentOrganization ? (
                <View style={styles.orgBadge}>
                  <Sparkles size={11} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.orgBadgeText} numberOfLines={1}>
                    {currentOrganization.name}
                  </Text>
                </View>
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
                    <Bell size={19} color="#FFFFFF" />
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

          {/* ── Quick Actions Grid ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
            </View>
            <View style={styles.quickActionsGrid}>
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  style={styles.quickActionCard}
                  onPress={() => {
                    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(action.href);
                  }}
                  activeOpacity={0.92}
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
            </View>
          </View>

          {/* ── Stats Row ── */}
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: colors.surface }]}
              onPress={() => router.push("/(tabs)/messages" as Href)}
              activeOpacity={0.7}
            >
              <View style={[styles.statIconCircle, { backgroundColor: "#6366F1" + "0F" }]}>
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
              <View style={[styles.statIconCircle, { backgroundColor: "#0EA5E9" + "0F" }]}>
                <Users size={16} color="#0EA5E9" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{membersCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Members</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: colors.surface }]}
              onPress={() => router.push("/announcements" as Href)}
              activeOpacity={0.7}
            >
              <View style={[styles.statIconCircle, { backgroundColor: "#F43F5E" + "0F" }]}>
                <Megaphone size={16} color="#F43F5E" />
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
                style={[styles.viewAllBtn, { backgroundColor: colors.primary + "0A" }]}
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
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  headerGradient: {
    paddingBottom: 40,
    position: "relative",
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    marginBottom: 20,
  },
  orgBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  orgBadgeText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "rgba(255,255,255,0.90)",
    maxWidth: 160,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
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
    borderColor: "#112240",
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
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: "#0A1628",
  },
  greetingBlock: {
    paddingTop: 2,
  },
  greetingLabel: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: "rgba(255,255,255,0.60)",
    letterSpacing: 0.2,
  },
  userNameText: {
    fontSize: 30,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginTop: 4,
  },
  dateLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    marginTop: 6,
    fontWeight: "400" as const,
  },

  // ── Body ──
  scrollView: {
    flex: 1,
    marginTop: -6,
  },
  scrollContent: {
    paddingTop: 24,
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
    marginBottom: 4,
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

  // ── Quick Actions Grid ──
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickActionCard: {
    width: (SCREEN_WIDTH - 40 - 10) / 2,
    height: 114,
    borderRadius: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
      web: { boxShadow: "0 3px 10px rgba(0,0,0,0.08)" },
    }),
  },
  quickActionGradient: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
  },
  quickActionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    letterSpacing: -0.1,
    marginBottom: 1,
  },
  quickActionSub: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: "rgba(255,255,255,0.72)",
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
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
      },
      android: { elevation: 1 },
      web: { boxShadow: "0 2px 8px rgba(0,0,0,0.03)" },
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
    letterSpacing: 0.2,
  },

  // ── Announcements ──
  announcementsList: {
    gap: 10,
  },
  announcementCard: {
    borderRadius: 18,
    padding: 16,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 1 },
      web: { boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
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
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
      },
      android: { elevation: 1 },
      web: { boxShadow: "0 2px 8px rgba(0,0,0,0.03)" },
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
