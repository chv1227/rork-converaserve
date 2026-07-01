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
  Megaphone, Church, HandHelping, PlayCircle, Ellipsis,
  ChevronRight, MapPin, Clock,
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
const CARD_GAP = 12;

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

// ── Grid Card Config ──

interface GridCard {
  icon: React.ReactNode;
  label: string;
  href: Href;
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
    announcement.priority === "high" ? "#EF4444"
    : announcement.priority === "low" ? colors.border
    : "#F59E0B";

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 350, delay: 100 + index * 70,
        useNativeDriver: true, easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0, duration: 350, delay: 100 + index * 70,
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
        <View style={styles.announcementHeader}>
          <View style={styles.announcementHeaderLeft}>
            <View style={[styles.announcementDot, { backgroundColor: priorityColor }]} />
            <Text style={[styles.announcementChip, {
              color: announcement.ministryId ? colors.secondary : colors.highlight,
              backgroundColor: announcement.ministryId
                ? colors.secondary + "14"
                : colors.highlight + "12",
            }]}>
              {announcement.ministryId ? (announcement.ministryName || "Ministry") : "Church-wide"}
            </Text>
          </View>
          {announcement.isPinned && (
            <View style={[styles.pinnedBadge, { backgroundColor: colors.warning + "14" }]}>
              <Text style={[styles.pinnedBadgeText, { color: colors.secondary }]}>Pinned</Text>
            </View>
          )}
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
            <View style={[styles.dotSeparator, { backgroundColor: colors.border }]} />
            <Text style={[styles.announcementDate, { color: colors.textTertiary }]}>
              {getRelativeTime(announcement.date)}
            </Text>
          </View>
          <ChevronRight size={15} color={colors.textTertiary} />
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
      Animated.timing(bodyFade, { toValue: 1, duration: 500, delay: 120, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
  }, [headerAnim, bodyFade]);

  const announcements = getGeneralAnnouncements(3);
  const totalUnread = getTotalUnread();
  const greeting = useMemo(() => getTimeBasedGreeting(), []);
  const firstName = user?.name?.split(" ")[0] || "Friend";

  const onRefresh = useCallback(async () => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLocalRefreshing(true);
    try { await refresh(); } catch { /* silent */ }
    finally { setLocalRefreshing(false); }
  }, [refresh]);

  const notificationAnim = useScalePress();

  const handleAnnouncementPress = useCallback(() => {
    router.push("/announcements" as Href);
  }, [router]);

  // ── Grid Cards ──
  const gridCards: GridCard[] = useMemo(() => [
    {
      icon: <Church size={22} color="#FFFFFF" />,
      label: "My Church",
      href: "/(tabs)/profile" as Href,
      iconBg: "#3B82F6",
    },
    {
      icon: <Calendar size={22} color="#FFFFFF" />,
      label: "Events",
      href: "/(tabs)/calendar" as Href,
      iconBg: "#F59E0B",
    },
    {
      icon: <Heart size={22} color="#FFFFFF" />,
      label: "Give",
      href: "/(tabs)/giving" as Href,
      iconBg: "#10B981",
    },
    {
      icon: <HandHelping size={22} color="#FFFFFF" />,
      label: "Prayer",
      href: "/forms" as Href,
      iconBg: "#8B5CF6",
    },
    {
      icon: <PlayCircle size={22} color="#FFFFFF" />,
      label: "Sermons",
      href: "/media" as Href,
      iconBg: "#06B6D4",
    },
    {
      icon: <Users size={22} color="#FFFFFF" />,
      label: "Groups",
      href: "/group" as Href,
      iconBg: "#EC4899",
    },
    {
      icon: <ClipboardList size={22} color="#FFFFFF" />,
      label: "Volunteer",
      href: "/forms" as Href,
      iconBg: "#22C55E",
    },
    {
      icon: <Ellipsis size={22} color="#FFFFFF" />,
      label: "More",
      href: "/church-management" as Href,
      iconBg: "#6B7280",
    },
  ], []);

  // ── Upcoming event (mock / first from data) ──
  const upcomingEvent = useMemo(() => {
    // In a real app this would come from events data
    return {
      title: "Sunday Worship Service",
      time: "Tomorrow at 10:00 AM",
      location: "Main Sanctuary",
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.headerWrapper}>
        <LinearGradient
          colors={["#E07A3D", "#D4695A", "#C55A7A", "#A8558E"]}
          locations={[0, 0.35, 0.7, 1]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.8 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 8 }]}
        >
          <Animated.View style={[
            styles.headerContent,
            { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] },
          ]}>
            {/* Top row: branding + icons */}
            <View style={styles.headerTopRow}>
              <View style={styles.brandingRow}>
                <View style={styles.logoCircle}>
                  <Church size={18} color="#E07A3D" />
                </View>
                <Text style={styles.brandingText} numberOfLines={1}>
                  {currentOrganization?.name || "ChurchConnect"}
                </Text>
              </View>

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
                      <View style={styles.notifBadge}>
                        <Text style={styles.notifBadgeText}>
                          {totalUnread > 99 ? "99+" : totalUnread}
                        </Text>
                      </View>
                    )}
                  </Animated.View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push("/(tabs)/profile" as Href)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{
                      uri: user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}&background=E07A3D&color=fff&bold=true`,
                    }}
                    style={styles.avatarImage}
                    contentFit="cover"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Greeting */}
            <View style={styles.greetingBlock}>
              <Text style={styles.greetingLabel}>Welcome Back!</Text>
              <Text style={styles.userNameText}>{firstName}</Text>
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
            tintColor="#E07A3D"
            progressViewOffset={8}
          />
        }
      >
        {isChurchPending && <PendingApprovalBanner type="pending" />}
        {churchStatus === "suspended" && <PendingApprovalBanner type="suspended" />}

        <Animated.View style={{ opacity: bodyFade }}>

          {/* ── Quick Actions Grid ── */}
          <View style={styles.gridSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
            <View style={styles.gridContainer}>
              {gridCards.map((card) => (
                <TouchableOpacity
                  key={card.label}
                  style={[styles.gridCard, {
                    backgroundColor: colors.surface,
                  }]}
                  onPress={() => {
                    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(card.href);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.gridCardIcon, { backgroundColor: card.iconBg }]}>
                    {card.icon}
                  </View>
                  <Text style={[styles.gridCardLabel, { color: colors.text }]} numberOfLines={1}>
                    {card.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Upcoming Event ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming</Text>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/calendar" as Href)}
                activeOpacity={0.7}
              >
                <Text style={[styles.viewAllLink, { color: colors.highlight }]}>View all</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.eventCard, { backgroundColor: colors.surface }]}
              onPress={() => router.push("/(tabs)/calendar" as Href)}
              activeOpacity={0.85}
            >
              <View style={styles.eventCardLeft}>
                <View style={[styles.eventDateBadge, { backgroundColor: "#E07A3D" }]}>
                  <Text style={styles.eventDateDay}>
                    {new Date().getDate() + 1}
                  </Text>
                  <Text style={styles.eventDateMonth}>
                    {new Date().toLocaleDateString(undefined, { month: "short" }).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.eventInfo}>
                  <Text style={[styles.eventTitle, { color: colors.text }]}>
                    {upcomingEvent.title}
                  </Text>
                  <View style={styles.eventMeta}>
                    <View style={styles.eventMetaItem}>
                      <Clock size={12} color={colors.secondary} />
                      <Text style={[styles.eventMetaText, { color: colors.textSecondary }]}>
                        {upcomingEvent.time}
                      </Text>
                    </View>
                    <View style={styles.eventMetaItem}>
                      <MapPin size={12} color={colors.secondary} />
                      <Text style={[styles.eventMetaText, { color: colors.textSecondary }]}>
                        {upcomingEvent.location}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              <ChevronRight size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* ── Announcements ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Announcements</Text>
              <TouchableOpacity
                onPress={() => router.push("/announcements" as Href)}
                activeOpacity={0.7}
              >
                <Text style={[styles.viewAllLink, { color: colors.highlight }]}>
                  {allAnnouncements.length > 0 ? `View all (${allAnnouncements.length})` : "View all"}
                </Text>
              </TouchableOpacity>
            </View>

            {isLoading && announcements.length === 0 ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="small" color="#E07A3D" />
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
                <View style={[styles.emptyIconCircle, { backgroundColor: "#E07A3D" + "12" }]}>
                  <Megaphone size={24} color="#E07A3D" />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No announcements yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Church updates and news will appear here
                </Text>
              </View>
            )}
          </View>

          <View style={{ height: 32 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ── Styles ──

const CARD_WIDTH = (SCREEN_WIDTH - 40 - CARD_GAP) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F3" },

  // ── Header ──
  headerWrapper: {
    overflow: "hidden",
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  headerGradient: {
    paddingBottom: 32,
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },
  brandingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 12,
  },
  logoCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  brandingText: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  notifBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: "#EF4444",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#D4695A",
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: "#FFFFFF",
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.5)",
  },
  greetingBlock: {
    paddingTop: 2,
  },
  greetingLabel: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "rgba(255,255,255,0.80)",
    letterSpacing: 0.2,
  },
  userNameText: {
    fontSize: 30,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: -0.6,
    marginTop: 4,
  },

  // ── Body ──
  scrollView: {
    flex: 1,
    marginTop: -4,
  },
  scrollContent: {
    paddingTop: 24,
  },

  // ── Sections ──
  section: {
    paddingHorizontal: 20,
    marginTop: 28,
  },
  gridSection: {
    paddingHorizontal: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
  },
  viewAllLink: {
    fontSize: 14,
    fontWeight: "600" as const,
  },

  // ── Grid Cards ──
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
  },
  gridCard: {
    width: CARD_WIDTH,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: "center",
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#C55A7A",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
      web: { boxShadow: "0 3px 12px rgba(197, 90, 122, 0.08)" },
    }),
  },
  gridCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  gridCardLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    letterSpacing: -0.1,
  },

  // ── Event Card ──
  eventCard: {
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
      web: { boxShadow: "0 2px 10px rgba(0,0,0,0.06)" },
    }),
  },
  eventCardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  eventDateBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  eventDateDay: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    lineHeight: 22,
  },
  eventDateMonth: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 14,
  },
  eventInfo: {
    flex: 1,
    gap: 6,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    letterSpacing: -0.1,
  },
  eventMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
  },
  eventMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  eventMetaText: {
    fontSize: 12,
    fontWeight: "500" as const,
  },

  // ── Announcements ──
  announcementsList: {
    gap: 10,
  },
  announcementCard: {
    borderRadius: 18,
    padding: 16,
    borderLeftWidth: 4,
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
  announcementHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  announcementHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  announcementDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  announcementChip: {
    fontSize: 11,
    fontWeight: "700" as const,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
  },
  pinnedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pinnedBadgeText: {
    fontSize: 11,
    fontWeight: "700" as const,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    lineHeight: 22,
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  announcementContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  announcementFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  announcementFooterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  authorAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  announcementAuthor: {
    fontSize: 12,
    fontWeight: "500" as const,
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
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
    }),
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
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
