import React, { useCallback, useState, useRef, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Platform, Animated, Easing, Dimensions } from "react-native";
import { Image } from "expo-image";
import { useRouter, Href } from "expo-router";
import { Bell, Calendar, Users, Heart, MessageCircle, ChevronRight, Megaphone, Sparkles, Building2 } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { useData } from "@/providers/DataProvider";
import AnnouncementCard from "@/components/AnnouncementCard";
import EventCard from "@/components/EventCard";
import PendingApprovalBanner from "@/components/PendingApprovalBanner";
import { useScalePress } from "@/hooks/useAnimations";

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

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, currentOrganization, isChurchPending, churchStatus } = useAuth();
  const { 
    isLoading, 
    isRefreshing, 
    refresh, 
    getUpcomingEvents, 
    getGeneralAnnouncements, 
    userMinistries,
    getTotalUnread,
    prayerRequestsCount,
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

  const announcements = getGeneralAnnouncements(2);
  const upcomingEvents = getUpcomingEvents(3);
  const totalUnread = getTotalUnread();
  const greeting = useMemo(() => getTimeBasedGreeting(), []);
  const firstName = user?.name?.split(" ")[0] || "Friend";

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

  const notificationAnim = useScalePress();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark, '#1D4ED8']}
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
                  <Building2 size={12} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.orgName} numberOfLines={1}>{currentOrganization.name}</Text>
                </View>
              )}
              <View style={styles.betaBadge}>
                <Text style={styles.betaBadgeText}>BETA</Text>
              </View>
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
                source={{ uri: user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}&background=fff&color=3B82F6` }}
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
              <Sparkles size={20} color={Colors.accent} />
            </View>
            <Text style={styles.heroTitle}>Stay Connected</Text>
            <Text style={styles.heroSubtitle}>
              {upcomingEvents.length > 0 
                ? `${upcomingEvents.length} upcoming event${upcomingEvents.length > 1 ? 's' : ''} this week`
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
            colors={[Colors.primary, Colors.primaryDark]}
            onPress={() => router.push("/announcements" as Href)}
            delay={0}
          />
          <QuickActionCard
            icon={<Calendar size={22} color={Colors.textInverse} />}
            title="Events"
            subtitle={`${upcomingEvents.length} upcoming`}
            colors={[Colors.secondary, Colors.secondaryDark]}
            onPress={() => router.push("/(tabs)/calendar" as Href)}
            delay={50}
          />
          <QuickActionCard
            icon={<MessageCircle size={22} color={Colors.textInverse} />}
            title="Messages"
            subtitle={totalUnread > 0 ? `${totalUnread} unread` : "Chat"}
            colors={[Colors.tertiary, '#7C3AED']}
            onPress={() => router.push("/(tabs)/messages" as Href)}
            delay={100}
          />
          <QuickActionCard
            icon={<Heart size={22} color={Colors.textInverse} />}
            title="Giving"
            subtitle={givingStats.thisMonth > 0 ? `${givingStats.thisMonth.toLocaleString()} this month` : "Tithes & Offerings"}
            colors={[Colors.coral, Colors.accent]}
            onPress={() => router.push("/giving" as Href)}
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
            style={styles.statCard}
            onPress={() => router.push("/(tabs)/calendar" as Href)}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconContainer, { backgroundColor: Colors.primary + '15' }]}>
              <Calendar size={20} color={Colors.primary} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{upcomingEvents.length}</Text>
              <Text style={styles.statLabel}>Events This Week</Text>
            </View>
            <ChevronRight size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => router.push("/(tabs)/groups" as Href)}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconContainer, { backgroundColor: Colors.secondary + '15' }]}>
              <Users size={20} color={Colors.secondary} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{userMinistries.length}</Text>
              <Text style={styles.statLabel}>Your Ministries</Text>
            </View>
            <ChevronRight size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        </Animated.View>

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
            style={styles.statCard}
            onPress={() => {}}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconContainer, { backgroundColor: '#EC4899' + '15' }]}>
              <Heart size={20} color="#EC4899" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{prayerRequestsCount.active}</Text>
              <Text style={styles.statLabel}>Prayer Requests</Text>
            </View>
            <ChevronRight size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => {}}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconContainer, { backgroundColor: Colors.tertiary + '15' }]}>
              <Users size={20} color={Colors.tertiary} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{membersCount}</Text>
              <Text style={styles.statLabel}>Church Members</Text>
            </View>
            <ChevronRight size={18} color={Colors.textTertiary} />
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
              <Text style={styles.sectionTitle}>Latest Announcements</Text>
              <TouchableOpacity onPress={() => router.push("/announcements" as Href)}>
                <Text style={styles.sectionAction}>View all</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.announcementsContainer}>
              {isLoading && announcements.length === 0 ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={Colors.primary} />
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
          </Animated.View>
        )}

        {upcomingEvents.length > 0 && (
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
              <Text style={styles.sectionTitle}>Upcoming Events</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/calendar" as Href)}>
                <Text style={styles.sectionAction}>See all</Text>
              </TouchableOpacity>
            </View>
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
          </Animated.View>
        )}

        {userMinistries.length > 0 && (
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
              <Text style={styles.sectionTitle}>Your Ministries</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/groups" as Href)}>
                <Text style={styles.sectionAction}>View all</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.ministriesHorizontal}
            >
              {userMinistries.slice(0, 5).map((ministry) => (
                <TouchableOpacity
                  key={ministry.id}
                  style={styles.ministryCard}
                  onPress={() => router.push(`/group/${ministry.id}` as Href)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: ministry.image }}
                    style={styles.ministryImage}
                    contentFit="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                    style={styles.ministryGradient}
                  />
                  <View style={styles.ministryInfo}>
                    <Text style={styles.ministryName} numberOfLines={2}>{ministry.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
    backgroundColor: "rgba(255, 255, 255, 0.18)",
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
  betaBadge: {
    backgroundColor: "rgba(251, 191, 36, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  betaBadgeText: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: "#78350F",
    letterSpacing: 1,
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
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: Colors.accent,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  notificationCount: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.text,
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
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 20,
    padding: 20,
  },
  heroIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
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
    backgroundColor: "rgba(255, 255, 255, 0.2)",
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
    backgroundColor: Colors.surface,
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
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
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
  },
  eventsContainer: {
    paddingHorizontal: 20,
  },
  loadingContainer: {
    padding: 24,
    alignItems: "center",
  },
  ministriesHorizontal: {
    paddingHorizontal: 20,
    gap: 14,
  },
  ministryCard: {
    width: 150,
    height: 100,
    borderRadius: 16,
    overflow: "hidden",
  },
  ministryImage: {
    ...StyleSheet.absoluteFillObject,
  },
  ministryGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  ministryInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  ministryName: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.textInverse,
    lineHeight: 17,
  },
  bottomSpacer: {
    height: 100,
  },
});
