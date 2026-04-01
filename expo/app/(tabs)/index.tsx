import React, { useCallback, useState, useRef, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Platform, Animated, Easing, Dimensions } from "react-native";
import { Image } from "expo-image";
import { useRouter, Href } from "expo-router";
import { Bell, MessageCircle, ChevronRight, Megaphone, Sparkles, Building2, Heart, Pin, Globe, Users } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
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

function QuickActionCard({ icon, title, subtitle, colors, onPress, delay }: QuickActionProps) {
  const scaleAnim = useScalePress();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, [fadeAnim, slideAnim, delay]);

  return (
    <Animated.View style={[styles.quickActionWrapper, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={scaleAnim.onPressIn}
        onPressOut={scaleAnim.onPressOut}
        activeOpacity={1}
        style={styles.quickActionTouchable}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim.scale }] }}>
          <LinearGradient
            colors={colors as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.quickActionCard}
          >
            <View style={styles.quickActionIconContainer}>
              {icon}
            </View>
            <Text style={styles.quickActionTitle}>{title}</Text>
            <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
          </LinearGradient>
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
  } catch {
    return "";
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useTheme();
  const { user, currentOrganization, isChurchPending, churchStatus } = useAuth();
  const { 
    isLoading, 
    isRefreshing, 
    refresh, 
    getGeneralAnnouncements, 
    getTotalUnread,
    membersCount,
    givingStats,
    announcements: allAnnouncements,
  } = useData();
  const [localRefreshing, setLocalRefreshing] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const heroAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(heroAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, [headerAnim, heroAnim, contentAnim]);

  const announcements = getGeneralAnnouncements(5);
  const totalUnread = getTotalUnread();
  const greeting = useMemo(() => getTimeBasedGreeting(), []);
  const firstName = user?.name?.split(" ")[0] || "Friend";

  const onRefresh = useCallback(async () => {
    setLocalRefreshing(true);
    try {
      await refresh();
    } catch {
      // handled silently
    } finally {
      setLocalRefreshing(false);
    }
  }, [refresh]);

  const notificationAnim = useScalePress();

  const renderAnnouncementItem = useCallback((announcement: Announcement) => {
    const priorityColor = announcement.priority === 'high' ? Colors.error : announcement.priority === 'low' ? Colors.textTertiary : Colors.primary;

    return (
      <TouchableOpacity
        key={announcement.id}
        style={[styles.announcementItem, { backgroundColor: themeColors.surface }]}
        onPress={() => router.push("/announcements" as Href)}
        activeOpacity={0.7}
      >
        <View style={styles.announcementItemTop}>
          {announcement.isPinned && (
            <View style={styles.pinnedBadge}>
              <Pin size={10} color={themeColors.primary} />
              <Text style={[styles.pinnedText, { color: themeColors.primary }]}>Pinned</Text>
            </View>
          )}
          <View style={[styles.typeBadge, { backgroundColor: announcement.ministryId ? themeColors.secondary + '15' : themeColors.primary + '15' }]}>
            {announcement.ministryId ? <Users size={10} color={themeColors.secondary} /> : <Globe size={10} color={themeColors.primary} />}
            <Text style={[styles.typeBadgeText, { color: announcement.ministryId ? themeColors.secondary : themeColors.primary }]}>
              {announcement.ministryId ? (announcement.ministryName || 'Ministry') : 'General'}
            </Text>
          </View>
        </View>
        <Text style={[styles.announcementItemTitle, { color: themeColors.text }]} numberOfLines={2}>{announcement.title}</Text>
        <Text style={[styles.announcementItemContent, { color: themeColors.textSecondary }]} numberOfLines={2}>{announcement.content}</Text>
        <View style={styles.announcementItemFooter}>
          <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
          <Text style={[styles.announcementItemDate, { color: themeColors.textTertiary }]}>{formatAnnouncementDate(announcement.date)}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [themeColors, router]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[themeColors.gradientStart || '#1B3A5C', themeColors.gradientMiddle || '#162D48', themeColors.gradientEnd || '#0F2440']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: insets.top }]}
      >
        <Animated.View 
          style={[
            styles.header, 
            { 
              opacity: headerAnim, 
              transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] 
            }
          ]}
        >
          <View style={styles.headerLeft}>
            <View style={styles.badgeRow}>
              {currentOrganization && (
                <View style={styles.orgBadge}>
                  <Building2 size={12} color="rgba(212,168,67,0.9)" />
                  <Text style={styles.orgName} numberOfLines={1}>{currentOrganization.name}</Text>
                </View>
              )}
            </View>
            <Text style={styles.greetingSmall}>{greeting}</Text>
            <Text style={styles.userName}>{firstName}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => router.push("/(tabs)/notifications" as Href)}
              onPressIn={notificationAnim.onPressIn}
              onPressOut={notificationAnim.onPressOut}
              activeOpacity={1}
            >
              <Animated.View style={{ transform: [{ scale: notificationAnim.scale }] }}>
                <Bell size={22} color={Colors.textInverse} />
                {totalUnread > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationCount}>
                      {totalUnread > 9 ? "9+" : totalUnread}
                    </Text>
                  </View>
                )}
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => router.push("/(tabs)/profile" as Href)}
              style={styles.avatarContainer}
            >
              <Image
                source={{ uri: user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}&background=fff&color=1B3A5C` }}
                style={styles.avatar}
                contentFit="cover"
              />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.View 
          style={[
            styles.heroSection,
            {
              opacity: heroAnim,
              transform: [{ translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
            }
          ]}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroIconContainer}>
              <Sparkles size={20} color="#D4A843" />
            </View>
            <Text style={styles.heroTitle}>Stay Connected</Text>
            <Text style={styles.heroSubtitle}>
              {allAnnouncements.length > 0 
                ? `${allAnnouncements.length} announcement${allAnnouncements.length > 1 ? 's' : ''} from your church`
                : "Check out what's happening in your community"
              }
            </Text>
          </View>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={localRefreshing || isRefreshing} 
            onRefresh={onRefresh} 
            tintColor={Colors.primary}
            progressViewOffset={20}
          />
        }
      >
        {isChurchPending && <PendingApprovalBanner type="pending" />}
        {churchStatus === 'suspended' && <PendingApprovalBanner type="suspended" />}

        <View style={styles.quickActionsGrid}>
          <QuickActionCard
            icon={<Megaphone size={22} color={Colors.textInverse} />}
            title="Announcements"
            subtitle={allAnnouncements.length > 0 ? `${allAnnouncements.length} total` : "Stay updated"}
            colors={['#1B3A5C', '#2D5F8A']}
            onPress={() => router.push("/announcements" as Href)}
            delay={0}
          />
          <QuickActionCard
            icon={<MessageCircle size={22} color={Colors.textInverse} />}
            title="Messages"
            subtitle={totalUnread > 0 ? `${totalUnread} unread` : "Chat"}
            colors={['#6B8F71', '#5A7D60']}
            onPress={() => router.push("/(tabs)/messages" as Href)}
            delay={50}
          />
          <QuickActionCard
            icon={<Heart size={22} color={Colors.textInverse} />}
            title="Giving"
            subtitle={givingStats.thisMonth > 0 ? `$${givingStats.thisMonth.toLocaleString()} this month` : "Tithes & Offerings"}
            colors={['#C8943E', '#A67A2E']}
            onPress={() => router.push("/(tabs)/giving" as Href)}
            delay={100}
          />
          <QuickActionCard
            icon={<Users size={22} color={Colors.textInverse} />}
            title="Community"
            subtitle={`${membersCount} members`}
            colors={['#5A8F8F', '#4A7A7A']}
            onPress={() => router.push("/(tabs)/profile" as Href)}
            delay={150}
          />
        </View>

        <Animated.View 
          style={[
            styles.statsContainer,
            {
              opacity: contentAnim,
              transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
            }
          ]}
        >
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: themeColors.surface }]}
            onPress={() => router.push("/(tabs)/messages" as Href)}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconContainer, { backgroundColor: themeColors.primary + '15' }]}>
              <MessageCircle size={20} color={themeColors.primary} />
            </View>
            <View style={styles.statContent}>
              <Text style={[styles.statValue, { color: themeColors.text }]}>{totalUnread}</Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Unread Messages</Text>
            </View>
            <ChevronRight size={18} color={themeColors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: themeColors.surface }]}
            onPress={() => router.push("/(tabs)/giving" as Href)}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconContainer, { backgroundColor: themeColors.secondary + '15' }]}>
              <Heart size={20} color={themeColors.secondary} />
            </View>
            <View style={styles.statContent}>
              <Text style={[styles.statValue, { color: themeColors.text }]}>{membersCount}</Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Church Members</Text>
            </View>
            <ChevronRight size={18} color={themeColors.textTertiary} />
          </TouchableOpacity>
        </Animated.View>

        {announcements.length > 0 && (
          <Animated.View 
            style={[
              styles.section,
              {
                opacity: contentAnim,
                transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
              }
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Latest Announcements</Text>
              <TouchableOpacity onPress={() => router.push("/announcements" as Href)}>
                <Text style={[styles.sectionAction, { color: themeColors.primary }]}>View all</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.announcementsContainer}>
              {isLoading && announcements.length === 0 ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                </View>
              ) : (
                announcements.slice(0, 4).map(renderAnnouncementItem)
              )}
            </View>
          </Animated.View>
        )}

        {announcements.length === 0 && !isLoading && (
          <Animated.View 
            style={[
              styles.emptyAnnouncementsSection,
              {
                opacity: contentAnim,
                transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
              }
            ]}
          >
            <View style={[styles.emptyAnnouncementsCard, { backgroundColor: themeColors.surface }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: themeColors.primary + '12' }]}>
                <Megaphone size={28} color={themeColors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No Announcements Yet</Text>
              <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
                Announcements from your church will appear here
              </Text>
            </View>
          </Animated.View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerGradient: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  orgBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(212, 168, 67, 0.15)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
  },
  orgName: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "rgba(255, 255, 255, 0.95)",
    letterSpacing: 0.2,
  },
  badgeRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 6,
  },
  greetingSmall: {
    fontSize: 14,
    color: Colors.textInverse,
    opacity: 0.85,
    fontWeight: "500" as const,
  },
  userName: {
    fontSize: 26,
    fontWeight: "700" as const,
    color: Colors.textInverse,
    marginTop: 2,
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: '#D4A843',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: '#1B3A5C',
  },
  notificationCount: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: '#1B3A5C',
  },
  avatarContainer: {
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
    borderRadius: 24,
    padding: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  heroSection: {
    paddingHorizontal: 20,
  },
  heroContent: {
    backgroundColor: "rgba(212, 168, 67, 0.08)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(212, 168, 67, 0.12)",
  },
  heroIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(212, 168, 67, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.textInverse,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.textInverse,
    opacity: 0.9,
    lineHeight: 20,
  },
  content: {
    flex: 1,
    marginTop: -12,
  },
  contentContainer: {
    paddingTop: 0,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 12,
  },
  quickActionWrapper: {
    width: (SCREEN_WIDTH - 44) / 2,
  },
  quickActionTouchable: {
    flex: 1,
  },
  quickActionCard: {
    borderRadius: 20,
    padding: 18,
    minHeight: 110,
  },
  quickActionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.textInverse,
    marginBottom: 4,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: Colors.textInverse,
    opacity: 0.85,
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      },
    }),
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700" as const,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  announcementsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  announcementItem: {
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      },
    }),
  },
  announcementItemTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  pinnedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pinnedText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "600" as const,
    textTransform: "uppercase" as const,
  },
  announcementItemTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    lineHeight: 22,
    marginBottom: 6,
  },
  announcementItemContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  announcementItemFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  announcementItemDate: {
    fontSize: 12,
  },
  emptyAnnouncementsSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  emptyAnnouncementsCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      },
    }),
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600" as const,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  loadingContainer: {
    padding: 24,
    alignItems: "center",
  },
  bottomSpacer: {
    height: 100,
  },
});
