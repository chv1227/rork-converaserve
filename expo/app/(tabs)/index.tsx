import React, { useCallback, useState, useRef, useEffect, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  ActivityIndicator, Platform, Animated, Easing, Dimensions, FlatList,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter, Href } from "expo-router";
import {
  Bell, MessageCircle, Heart, Users, Calendar, ClipboardList,
  Megaphone, Pin, Globe, ChevronRight, Sparkles, ArrowUpRight,
  MapPin, Clock, BookOpen, Video, Headphones, Radio,
  QrCode, HandHeart, UserCheck, UserPlus, CalendarDays,
  Play, ExternalLink, Church,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/providers/AuthProvider";
import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import PendingApprovalBanner from "@/components/PendingApprovalBanner";
import { useScalePress, usePulse } from "@/hooks/useAnimations";
import { Announcement, Event } from "@/types";

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

function formatEventDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatEventTime(timeStr: string): string {
  try {
    const [h, m] = timeStr.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
  } catch {
    return timeStr;
  }
}

// ── Banner Carousel Data ──

const BANNER_SLIDES = [
  {
    id: "1",
    image: "https://images.unsplash.com/photo-1438032005730-c779502df39b?w=800&h=400&fit=crop",
    title: "Welcome to Church",
    subtitle: "A place to belong, grow, and serve",
    overlay: ["rgba(27,54,93,0.45)", "rgba(15,36,64,0.85)"] as const,
  },
  {
    id: "2",
    image: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800&h=400&fit=crop",
    title: "Join Us This Sunday",
    subtitle: "In-person & online at 9AM & 11AM",
    overlay: ["rgba(200,148,62,0.35)", "rgba(27,54,93,0.80)"] as const,
  },
  {
    id: "3",
    image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=400&fit=crop",
    title: "Worship Together",
    subtitle: "Experience powerful worship and community",
    overlay: ["rgba(74,139,110,0.40)", "rgba(15,36,64,0.82)"] as const,
  },
  {
    id: "4",
    image: "https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=800&h=400&fit=crop",
    title: "Serve With Us",
    subtitle: "Find your place to make a difference",
    overlay: ["rgba(199,111,84,0.35)", "rgba(27,54,93,0.78)"] as const,
  },
];

// ── Feature Cards Config ──

interface FeatureCardItem {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  href: Href;
  gradient: readonly [string, string, ...string[]];
  bgImage: string;
}

// ── Banner Dot Indicator ──

const DotIndicator = React.memo(function DotIndicator({
  count, activeIndex, colors,
}: { count: number; activeIndex: number; colors: ReturnType<typeof useTheme>["colors"] }) {
  return (
    <View style={styles.dotsContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: i === activeIndex ? "#FFFFFF" : "rgba(255,255,255,0.35)",
              width: i === activeIndex ? 22 : 7,
            },
          ]}
        />
      ))}
    </View>
  );
});

// ── Skeleton Loader ──

const SkeletonBlock = React.memo(function SkeletonBlock({
  width, height, borderRadius = 12,
}: { width: number | string; height: number; borderRadius?: number }) {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        { width: width as number | undefined, height, borderRadius, backgroundColor: "#E5E7EB", opacity: pulseAnim },
      ]}
    />
  );
});

// ── Feature Card Component ──

const FeatureCard = React.memo(function FeatureCard({
  icon, label, subtitle, bgImage, gradient, onPress, colors,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  bgImage: string;
  gradient: readonly [string, string, ...string[]];
  onPress: () => void;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const pressAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(pressAnim, { toValue: 0.96, useNativeDriver: true, speed: 60, bounciness: 4 }).start();
  }, [pressAnim]);
  const onPressOut = useCallback(() => {
    Animated.spring(pressAnim, { toValue: 1, useNativeDriver: true, speed: 60, bounciness: 4 }).start();
  }, [pressAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: pressAnim }] }}>
      <TouchableOpacity
        style={styles.featureCard}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        <Image source={{ uri: bgImage }} style={styles.featureCardBg} contentFit="cover" />
        <LinearGradient
          colors={[...gradient]}
          start={{ x: 0, y: 0.4 }} end={{ x: 1, y: 0.4 }}
          style={styles.featureCardOverlay}
        >
          <View style={styles.featureCardContent}>
            <View style={styles.featureCardTop}>
              <View style={styles.featureIconCircle}>
                {icon}
              </View>
              <ChevronRight size={18} color="rgba(255,255,255,0.7)" />
            </View>
            <View style={styles.featureCardBottom}>
              <Text style={styles.featureCardLabel}>{label}</Text>
              <Text style={styles.featureCardSub} numberOfLines={1}>{subtitle}</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ── Event Card ──

const EventCard = React.memo(function EventCard({
  event, index, colors, onPress, onRsvp,
}: {
  event: Event;
  index: number;
  colors: ReturnType<typeof useTheme>["colors"];
  onPress: () => void;
  onRsvp: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay: index * 100, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, delay: index * 100, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  const eventImage = `https://images.unsplash.com/photo-${
    index === 0 ? "1501281668745-f7f57925c3b4"
    : index === 1 ? "1511578314322-379f9aa5d0e7"
    : "1523580494936-7bf6b68fd468"
  }?w=400&h=200&fit=crop`;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        style={[styles.eventCard, { backgroundColor: colors.surface }]}
        onPress={onPress}
        activeOpacity={0.92}
      >
        <Image source={{ uri: eventImage }} style={styles.eventImage} contentFit="cover" />
        <View style={styles.eventCardBody}>
          <View style={[styles.eventDateBadge, { backgroundColor: event.color + "15" }]}>
            <CalendarDays size={12} color={event.color} />
            <Text style={[styles.eventDateText, { color: event.color }]}>
              {formatEventDate(event.date)}
            </Text>
          </View>
          <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={2}>
            {event.title}
          </Text>
          <View style={styles.eventMeta}>
            {event.time ? (
              <View style={styles.eventMetaItem}>
                <Clock size={13} color={colors.textTertiary} />
                <Text style={[styles.eventMetaText, { color: colors.textSecondary }]}>
                  {formatEventTime(event.time)}
                </Text>
              </View>
            ) : null}
            {event.location ? (
              <View style={styles.eventMetaItem}>
                <MapPin size={13} color={colors.textTertiary} />
                <Text style={[styles.eventMetaText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {event.location}
                </Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity
            style={[styles.rsvpButton, { backgroundColor: colors.primary }]}
            onPress={onRsvp}
            activeOpacity={0.8}
          >
            <Text style={styles.rsvpButtonText}>RSVP</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ── Announcement Card ──

const AnnouncementCardItem = React.memo(function AnnouncementCardItem({
  announcement, index, colors, onPress,
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
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: 120 + index * 80, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay: 120 + index * 80, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        style={[styles.announcementCard, { backgroundColor: colors.surface, borderLeftColor: priorityColor }]}
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
            backgroundColor: announcement.ministryId ? colors.secondary + "14" : colors.tertiary + "14",
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

// ── Quick Action Config ──

interface QuickActionItem {
  icon: React.ReactNode;
  label: string;
  href: Href;
  gradient: readonly [string, string];
  iconBg: string;
}

// ── Main Screen ──

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, currentOrganization, isChurchPending, churchStatus, isAdmin } = useAuth();
  const {
    isLoading, isRefreshing, refresh,
    getGeneralAnnouncements, getTotalUnread,
    membersCount, givingStats, announcements: allAnnouncements,
    events, getUpcomingEvents, prayerRequestsCount, rsvpToEvent,
  } = useData();
  const [localRefreshing, setLocalRefreshing] = useState(false);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const bannerFlatListRef = useRef<FlatList<typeof BANNER_SLIDES[number]>>(null);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const bodyFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 1, duration: 450, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(bodyFade, { toValue: 1, duration: 550, delay: 120, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
  }, [headerAnim, bodyFade]);

  // Auto-rotate banner
  const bannerItemWidth = SCREEN_WIDTH - 40 + 12; // slide width + marginRight
  useEffect(() => {
    if (BANNER_SLIDES.length <= 1) return;
    const interval = setInterval(() => {
      setActiveBannerIndex((prev) => {
        const next = (prev + 1) % BANNER_SLIDES.length;
        try {
          bannerFlatListRef.current?.scrollToIndex({ index: next, animated: true });
        } catch {
          // FlatList may not be ready yet — skip silently
        }
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const announcements = getGeneralAnnouncements(3);
  const upcomingEvents = useMemo(() => getUpcomingEvents(3), [getUpcomingEvents]);
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

  const handleEventPress = useCallback(() => {
    router.push("/(tabs)/calendar" as Href);
  }, [router]);

  // ── Feature Cards ──
  const featureCards: FeatureCardItem[] = useMemo(() => [
    {
      icon: <HandHeart size={20} color="#FFFFFF" />,
      label: "Prayer Requests",
      subtitle: `${prayerRequestsCount.active} active requests`,
      href: "/(tabs)/more" as Href,
      gradient: ["rgba(99,102,241,0.55)", "rgba(79,70,229,0.88)"],
      bgImage: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800&h=300&fit=crop",
    },
    {
      icon: <Church size={20} color="#FFFFFF" />,
      label: "New Here?",
      subtitle: "Plan your first visit",
      href: "/church/welcome" as Href,
      gradient: ["rgba(16,185,129,0.50)", "rgba(5,150,105,0.88)"],
      bgImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=300&fit=crop",
    },
    {
      icon: <CalendarDays size={20} color="#FFFFFF" />,
      label: "Upcoming Events",
      subtitle: `${events.length} event${events.length !== 1 ? "s" : ""} coming up`,
      href: "/(tabs)/calendar" as Href,
      gradient: ["rgba(14,165,233,0.50)", "rgba(2,132,199,0.88)"],
      bgImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=300&fit=crop",
    },
    {
      icon: <Megaphone size={20} color="#FFFFFF" />,
      label: "Announcements",
      subtitle: announcementCountLabel,
      href: "/announcements" as Href,
      gradient: ["rgba(244,63,94,0.50)", "rgba(225,29,72,0.88)"],
      bgImage: "https://images.unsplash.com/photo-1559223607-a43c990c692c?w=800&h=300&fit=crop",
    },
    {
      icon: <Play size={20} color="#FFFFFF" />,
      label: "Latest Sermon",
      subtitle: "Watch & listen",
      href: "/media" as Href,
      gradient: ["rgba(139,92,246,0.50)", "rgba(109,40,217,0.88)"],
      bgImage: "https://images.unsplash.com/photo-1490127252417-7c393f993ee3?w=800&h=300&fit=crop",
    },
    {
      icon: <BookOpen size={20} color="#FFFFFF" />,
      label: "Daily Devotional",
      subtitle: "Today's reading",
      href: "/worship" as Href,
      gradient: ["rgba(251,191,36,0.50)", "rgba(217,119,6,0.88)"],
      bgImage: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800&h=300&fit=crop",
    },
    {
      icon: <Users size={20} color="#FFFFFF" />,
      label: "Community Feed",
      subtitle: "Connect & share",
      href: "/(tabs)/profile" as Href,
      gradient: ["rgba(6,182,212,0.50)", "rgba(8,145,178,0.88)"],
      bgImage: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=300&fit=crop",
    },
    {
      icon: <Heart size={20} color="#FFFFFF" />,
      label: "Give",
      subtitle: givingStats.thisMonth > 0 ? `$${givingStats.thisMonth.toLocaleString()} this mo` : "Support our mission",
      href: "/(tabs)/giving" as Href,
      gradient: ["rgba(225,29,72,0.50)", "rgba(190,18,60,0.88)"],
      bgImage: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&h=300&fit=crop",
    },
    {
      icon: <Clock size={20} color="#FFFFFF" />,
      label: "Service Times",
      subtitle: "Sundays 9AM & 11AM",
      href: "/church/service-times" as Href,
      gradient: ["rgba(59,130,246,0.50)", "rgba(37,99,235,0.88)"],
      bgImage: "https://images.unsplash.com/photo-1438032005730-c779502df39b?w=800&h=300&fit=crop",
    },
    {
      icon: <ExternalLink size={20} color="#FFFFFF" />,
      label: "Contact Church",
      subtitle: "Get in touch",
      href: "/church/contact" as Href,
      gradient: ["rgba(107,114,128,0.50)", "rgba(55,65,81,0.88)"],
      bgImage: "https://images.unsplash.com/photo-1423666639041-f56000c27a9a?w=800&h=300&fit=crop",
    },
  ], [prayerRequestsCount.active, events.length, announcementCountLabel, givingStats.thisMonth]);

  // ── Quick Actions ──
  const quickActions: QuickActionItem[] = useMemo(() => [
    {
      icon: <QrCode size={22} color="#1B365D" />,
      label: "Scan QR",
      href: "/(tabs)/more" as Href,
      gradient: ["#F0F4FF", "#E0E7FF"],
      iconBg: "#EEF2FF",
    },
    {
      icon: <HandHeart size={22} color="#059669" />,
      label: "Volunteer",
      href: "/forms" as Href,
      gradient: ["#ECFDF5", "#D1FAE5"],
      iconBg: "#ECFDF5",
    },
    {
      icon: <UserCheck size={22} color="#0EA5E9" />,
      label: "Check In",
      href: "/(tabs)/calendar" as Href,
      gradient: ["#F0F9FF", "#E0F2FE"],
      iconBg: "#F0F9FF",
    },
    {
      icon: <UserPlus size={22} color="#8B5CF6" />,
      label: "Join Group",
      href: "/(tabs)/profile" as Href,
      gradient: ["#F5F3FF", "#EDE9FE"],
      iconBg: "#F5F3FF",
    },
    {
      icon: <HandHeart size={22} color="#F59E0B" />,
      label: "Submit Prayer",
      href: "/(tabs)/more" as Href,
      gradient: ["#FFFBEB", "#FEF3C7"],
      iconBg: "#FFFBEB",
    },
    {
      icon: <CalendarDays size={22} color="#EF4444" />,
      label: "View Calendar",
      href: "/(tabs)/calendar" as Href,
      gradient: ["#FEF2F2", "#FEE2E2"],
      iconBg: "#FEF2F2",
    },
  ], []);

  const handleRsvp = useCallback(async (eventId: string) => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await rsvpToEvent(eventId, "going");
  }, [rsvpToEvent]);

  const onBannerScroll = useCallback((event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const idx = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (idx !== activeBannerIndex) setActiveBannerIndex(idx);
  }, [activeBannerIndex]);

  const renderBannerItem = useCallback(({ item }: { item: typeof BANNER_SLIDES[number] }) => (
    <View style={styles.bannerSlide}>
      <Image source={{ uri: item.image }} style={styles.bannerImage} contentFit="cover" />
      <LinearGradient
        colors={[...item.overlay]}
        start={{ x: 0, y: 0.3 }} end={{ x: 0, y: 1 }}
        style={styles.bannerOverlay}
      >
        <Text style={styles.bannerTitle}>{item.title}</Text>
        <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>
      </LinearGradient>
    </View>
  ), []);

  const keyExtractor = useCallback((item: typeof BANNER_SLIDES[number]) => item.id, []);

  const isRefreshingNow = localRefreshing || isRefreshing;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={["#0A1628", "#112240", "#1A365D", "#1E4A6E"]}
          locations={[0, 0.25, 0.65, 1]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
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
            refreshing={isRefreshingNow}
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

          {/* ── Hero Banner Carousel ── */}
          <View style={styles.bannerSection}>
            {isLoading ? (
              <SkeletonBlock width={SCREEN_WIDTH - 40} height={200} borderRadius={20} />
            ) : (
              <>
                <FlatList
                  ref={bannerFlatListRef}
                  data={BANNER_SLIDES}
                  renderItem={renderBannerItem}
                  keyExtractor={keyExtractor}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={onBannerScroll}
                  snapToInterval={bannerItemWidth}
                  decelerationRate="fast"
                  getItemLayout={(_data, index) => ({
                    length: bannerItemWidth,
                    offset: bannerItemWidth * index,
                    index,
                  })}
                  contentContainerStyle={styles.bannerList}
                />
                <DotIndicator count={BANNER_SLIDES.length} activeIndex={activeBannerIndex} colors={colors} />
              </>
            )}
          </View>

          {/* ── Feature Action Cards ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Explore</Text>
            </View>
            {isLoading ? (
              <View style={styles.featureCardsGrid}>
                {[1, 2, 3, 4].map((i) => (
                  <SkeletonBlock key={i} width={SCREEN_WIDTH - 40} height={100} borderRadius={16} />
                ))}
              </View>
            ) : (
              <View style={styles.featureCardsGrid}>
                {featureCards.map((card) => (
                  <FeatureCard
                    key={card.label}
                    icon={card.icon}
                    label={card.label}
                    subtitle={card.subtitle}
                    bgImage={card.bgImage}
                    gradient={card.gradient}
                    colors={colors}
                    onPress={() => {
                      if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push(card.href);
                    }}
                  />
                ))}
              </View>
            )}
          </View>

          {/* ── Quick Actions ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
            </View>
            {isLoading ? (
              <View style={styles.quickActionsGrid}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <SkeletonBlock key={i} width={(SCREEN_WIDTH - 52) / 3} height={88} borderRadius={16} />
                ))}
              </View>
            ) : (
              <View style={styles.quickActionsGrid}>
                {quickActions.map((action) => (
                  <TouchableOpacity
                    key={action.label}
                    style={styles.quickActionCard}
                    onPress={() => {
                      if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push(action.href);
                    }}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={[...action.gradient]}
                      start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                      style={styles.quickActionGradient}
                    >
                      <View style={[styles.quickActionIcon, { backgroundColor: action.iconBg }]}>
                        {action.icon}
                      </View>
                      <Text style={styles.quickActionLabel} numberOfLines={1}>{action.label}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            )}
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

          {/* ── Upcoming Events ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.sectionIconDot, { backgroundColor: "#0EA5E9" }]} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Events</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/calendar" as Href)}
                style={[styles.viewAllBtn, { backgroundColor: colors.primary + "0A" }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.viewAllText, { color: colors.primary }]}>View all</Text>
                <ArrowUpRight size={13} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {isLoading && upcomingEvents.length === 0 ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : upcomingEvents.length > 0 ? (
              <View style={styles.eventsList}>
                {upcomingEvents.map((event, i) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    index={i}
                    colors={colors}
                    onPress={handleEventPress}
                    onRsvp={() => handleRsvp(event.id)}
                  />
                ))}
              </View>
            ) : (
              <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
                <View style={[styles.emptyIconCircle, { backgroundColor: "#0EA5E9" + "08" }]}>
                  <CalendarDays size={26} color="#0EA5E9" />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No upcoming events</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Events will appear here once scheduled
                </Text>
              </View>
            )}
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

          {/* ── Recent Media ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.sectionIconDot, { backgroundColor: "#8B5CF6" }]} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Media</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/media" as Href)}
                style={[styles.viewAllBtn, { backgroundColor: colors.primary + "0A" }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.viewAllText, { color: colors.primary }]}>Browse</Text>
                <ArrowUpRight size={13} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.mediaCards}>
              {/* Sermon Card */}
              <View style={[styles.mediaCard, { backgroundColor: colors.surface }]}>
                <Image
                  source={{ uri: "https://images.unsplash.com/photo-1490127252417-7c393f993ee3?w=400&h=220&fit=crop" }}
                  style={styles.mediaImage}
                  contentFit="cover"
                />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.65)"]}
                  style={styles.mediaImageOverlay}
                />
                <View style={styles.mediaCardBody}>
                  <View style={styles.mediaTypeRow}>
                    <Video size={14} color="#8B5CF6" />
                    <Text style={styles.mediaTypeText}>Latest Sermon</Text>
                  </View>
                  <Text style={[styles.mediaTitle, { color: colors.text }]}>Walking in Faith</Text>
                  <Text style={[styles.mediaSubtitle, { color: colors.textSecondary }]}>
                    Pastor {user?.name?.split(" ")[0] || "John"} · 32 min
                  </Text>
                  <View style={styles.mediaButtons}>
                    <TouchableOpacity
                      style={[styles.mediaBtn, { backgroundColor: colors.primary }]}
                      onPress={() => router.push("/media" as Href)}
                      activeOpacity={0.8}
                    >
                      <Play size={14} color="#FFFFFF" />
                      <Text style={styles.mediaBtnText}>Watch</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.mediaBtnOutline, { borderColor: colors.border }]}
                      onPress={() => router.push("/worship" as Href)}
                      activeOpacity={0.8}
                    >
                      <Headphones size={14} color={colors.textSecondary} />
                      <Text style={[styles.mediaBtnOutlineText, { color: colors.textSecondary }]}>Listen</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Livestream Card */}
              <View style={[styles.mediaCardSm, { backgroundColor: colors.surface }]}>
                <View style={styles.mediaCardSmContent}>
                  <View style={[styles.liveIndicator]}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                  <Text style={[styles.mediaTitle, { color: colors.text }]}>Sunday Service</Text>
                  <Text style={[styles.mediaSubtitle, { color: colors.textSecondary }]}>Join us live every Sunday</Text>
                  <TouchableOpacity
                    style={[styles.watchLiveBtn, { backgroundColor: "#EF4444" }]}
                    onPress={() => router.push("/worship" as Href)}
                    activeOpacity={0.8}
                  >
                    <Radio size={14} color="#FFFFFF" />
                    <Text style={styles.mediaBtnText}>Watch Live</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
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
    paddingBottom: 32,
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
    marginBottom: 18,
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
    paddingTop: 20,
  },

  // ── Banner ──
  bannerSection: {
    marginBottom: 4,
  },
  bannerList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  bannerSlide: {
    width: SCREEN_WIDTH - 40,
    height: 200,
    borderRadius: 20,
    overflow: "hidden",
    marginRight: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
      },
      android: { elevation: 6 },
      web: { boxShadow: "0 4px 14px rgba(0,0,0,0.12)" },
    }),
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    padding: 20,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: "rgba(255,255,255,0.80)",
    letterSpacing: 0.1,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },
  dot: {
    height: 7,
    borderRadius: 3.5,
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
    marginBottom: 14,
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

  // ── Feature Cards ──
  featureCardsGrid: {
    gap: 10,
  },
  featureCard: {
    height: 100,
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.10,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
      web: { boxShadow: "0 3px 10px rgba(0,0,0,0.10)" },
    }),
  },
  featureCardBg: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  featureCardOverlay: {
    flex: 1,
    justifyContent: "space-between",
  },
  featureCardContent: {
    flex: 1,
    padding: 14,
    justifyContent: "space-between",
  },
  featureCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  featureIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureCardBottom: {
    marginTop: "auto",
  },
  featureCardLabel: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    letterSpacing: -0.1,
  },
  featureCardSub: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },

  // ── Quick Actions Grid ──
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickActionCard: {
    width: (SCREEN_WIDTH - 52) / 3,
    height: 88,
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
      web: { boxShadow: "0 2px 6px rgba(0,0,0,0.04)" },
    }),
  },
  quickActionGradient: {
    flex: 1,
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#1F2937",
    letterSpacing: -0.05,
    textAlign: "center",
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

  // ── Events ──
  eventsList: {
    gap: 12,
  },
  eventCard: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
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
  eventImage: {
    width: "100%",
    height: 140,
  },
  eventCardBody: {
    padding: 16,
  },
  eventDateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  eventDateText: {
    fontSize: 12,
    fontWeight: "600" as const,
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    lineHeight: 22,
    marginBottom: 10,
    letterSpacing: -0.1,
  },
  eventMeta: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 14,
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
  rsvpButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    alignSelf: "flex-start",
  },
  rsvpButtonText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#FFFFFF",
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
  announcementAuthor: {
    fontSize: 12,
    fontWeight: "500" as const,
  },
  announcementDate: {
    fontSize: 12,
    fontWeight: "500" as const,
  },

  // ── Media ──
  mediaCards: {
    gap: 12,
  },
  mediaCard: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
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
  mediaImage: {
    width: "100%",
    height: 160,
  },
  mediaImageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  mediaCardBody: {
    padding: 16,
  },
  mediaTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  mediaTypeText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#8B5CF6",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  mediaTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    letterSpacing: -0.1,
    marginBottom: 4,
  },
  mediaSubtitle: {
    fontSize: 13,
    fontWeight: "500" as const,
    marginBottom: 12,
  },
  mediaButtons: {
    flexDirection: "row",
    gap: 10,
  },
  mediaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  mediaBtnText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  mediaBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  mediaBtnOutlineText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  mediaCardSm: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
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
  mediaCardSmContent: {
    padding: 16,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  liveText: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: "#EF4444",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  watchLiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 12,
  },

  // ── Shared ──
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
