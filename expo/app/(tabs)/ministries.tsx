import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Church,
  Users,
  ChevronRight,
  Lock,
  Shield,
  Sparkles,
  Music,
  Baby,
  Heart,
  HandHeart,
  Zap,
  Globe,
  Star,
  Trophy,
  Coffee,
  Palette,
  Video,
  Search,
  Plus,
  ArrowRight,
} from "lucide-react-native";
import { LightTheme } from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 14;
const CARD_WIDTH = (SCREEN_WIDTH - 40 - CARD_GAP) / 2;

type IconComponent = React.ComponentType<{ size: number; color: string }>;

const ICON_MAP: Record<string, IconComponent> = {
  Baby,
  Sparkles,
  Music,
  Users,
  Globe,
  Heart,
  Shield,
  Star,
  HandHeart,
  Zap,
  Palette,
  Coffee,
  Trophy,
  Video,
  Church,
};

interface MinistryData {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  image_url: string | null;
  ministry_type: string | null;
  member_count: number;
  is_member: boolean;
}

export default function MinistriesHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAdmin, isSuperAdmin, currentOrganization } = useAuth();
  const { colors } = useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const ministriesQuery = useQuery<MinistryData[]>({
    queryKey: ["ministries-hub", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      
      const { data, error } = await supabase
        .from("ministries")
        .select("id, name, description, color, icon, image_url, ministry_type, status")
        .eq("church_id", currentOrganization.id)
        .eq("status", "active")
        .order("name");

      if (error) throw error;

      // Get member counts and membership status for each ministry
      const enriched = await Promise.all(
        (data || []).map(async (m: any) => {
          const { count } = await supabase
            .from("ministry_members")
            .select("*", { count: "exact", head: true })
            .eq("ministry_id", m.id)
            .eq("is_active", true);

          let isMember = false;
          if (user?.id) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("id")
              .eq("user_id", user.id)
              .eq("church_id", currentOrganization.id)
              .single();

            if (profileData) {
              const { data: memberData } = await supabase
                .from("ministry_members")
                .select("id")
                .eq("ministry_id", m.id)
                .eq("profile_id", (profileData as any).id)
                .eq("is_active", true)
                .maybeSingle();
              isMember = !!memberData;
            }
          }

          return {
            id: m.id,
            name: m.name,
            description: m.description || "",
            color: m.color || colors.primary,
            icon: m.icon || "Users",
            image_url: m.image_url,
            ministry_type: m.ministry_type,
            member_count: count || 0,
            is_member: isMember,
          };
        })
      );

      return enriched;
    },
    enabled: !!currentOrganization?.id,
  });

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await ministriesQuery.refetch();
    setIsRefreshing(false);
  }, [ministriesQuery.refetch]);

  const ministries = ministriesQuery.data || [];
  const userMinistries = ministries.filter((m) => m.is_member);
  const otherMinistries = ministries.filter((m) => !m.is_member);
  const canSeeAll = isAdmin || isSuperAdmin;

  const ministryColors: Record<string, [string, string]> = {
    Deacons: ["#1B365D", "#2E5A8A"],
    Worship: ["#C8943E", "#A67A2E"],
    "Children's Ministry": ["#4A8B6E", "#3A7B5E"],
    Youth: ["#C76F54", "#B05A40"],
    "Men's Ministry": ["#3B82F6", "#2563EB"],
    "Women's Ministry": ["#EC4899", "#DB2777"],
    Hospitality: ["#F59E0B", "#D97706"],
    Security: ["#6B7280", "#4B5563"],
    Media: ["#8B5CF6", "#7C3AED"],
    Missions: ["#10B981", "#059669"],
  };

  const getMinistryGradient = (name: string, color: string): [string, string] => {
    if (ministryColors[name]) return ministryColors[name];
    return [color, color + "CC"];
  };

  const handleMinistryPress = useCallback(
    (ministryId: string) => {
      router.push(`/ministry/${ministryId}` as any);
    },
    [router]
  );

  if (ministriesQuery.isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading ministries...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMiddle, colors.gradientEnd, colors.primaryDark]}
        locations={[0, 0.3, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.headerLabel}>Ministries</Text>
              <Text style={styles.headerTitle}>Serve & Connect</Text>
            </View>
            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7}>
                <Search size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
            Find your place to serve and grow in community
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* My Ministries */}
        {userMinistries.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.sectionTitle}>My Ministries</Text>
              </View>
              <Text style={styles.sectionCount}>{userMinistries.length}</Text>
            </View>
            <View style={styles.ministriesGrid}>
              {userMinistries.map((ministry) => {
                const gradient = getMinistryGradient(ministry.name, ministry.color);
                const IconComp = ICON_MAP[ministry.icon] || Church;
                return (
                  <TouchableOpacity
                    key={ministry.id}
                    style={styles.ministryCard}
                    activeOpacity={0.85}
                    onPress={() => handleMinistryPress(ministry.id)}
                  >
                    <LinearGradient
                      colors={gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.ministryCardInner}
                    >
                      <View style={styles.cardIconCircle}>
                        <IconComp size={28} color="#fff" />
                      </View>
                      <Text style={styles.cardName} numberOfLines={1}>
                        {ministry.name}
                      </Text>
                      <Text style={styles.cardMembers}>
                        {ministry.member_count} member{ministry.member_count !== 1 ? "s" : ""}
                      </Text>
                      <View style={styles.cardArrowRow}>
                        <Text style={styles.cardAction}>Open</Text>
                        <ArrowRight size={14} color="rgba(255,255,255,0.8)" />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* All Ministries */}
        {(canSeeAll || userMinistries.length === 0) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionDot, { backgroundColor: colors.secondary }]} />
                <Text style={styles.sectionTitle}>
                  {userMinistries.length > 0 ? "Explore More" : "All Ministries"}
                </Text>
              </View>
              <Text style={styles.sectionCount}>{otherMinistries.length}</Text>
            </View>

            {otherMinistries.length === 0 && userMinistries.length > 0 ? (
              <View style={styles.emptyExploreCard}>
                <Sparkles size={24} color={colors.textTertiary} />
                <Text style={styles.emptyExploreText}>
                  You're part of every active ministry!
                </Text>
              </View>
            ) : (
              <View style={styles.ministriesGrid}>
                {otherMinistries.map((ministry) => {
                  const gradient = getMinistryGradient(ministry.name, ministry.color);
                  const IconComp = ICON_MAP[ministry.icon] || Church;
                  return (
                    <TouchableOpacity
                      key={ministry.id}
                      style={styles.ministryCard}
                      activeOpacity={0.85}
                      onPress={() => handleMinistryPress(ministry.id)}
                    >
                      <LinearGradient
                        colors={gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.ministryCardInner}
                      >
                        <View style={styles.cardIconCircle}>
                          <IconComp size={28} color="#fff" />
                        </View>
                        <View style={styles.cardLockBadge}>
                          <Lock size={10} color="rgba(255,255,255,0.9)" />
                        </View>
                        <Text style={styles.cardName} numberOfLines={1}>
                          {ministry.name}
                        </Text>
                        <Text style={styles.cardMembers}>
                          {ministry.member_count} member{ministry.member_count !== 1 ? "s" : ""}
                        </Text>
                        <View style={styles.cardArrowRow}>
                          <Text style={styles.cardAction}>View</Text>
                          <ChevronRight size={14} color="rgba(255,255,255,0.8)" />
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Admin: Quick Stats */}
        {canSeeAll && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionDot, { backgroundColor: colors.accent }]} />
                <Text style={styles.sectionTitle}>Ministry Overview</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: colors.primary + "15" }]}>
                  <Church size={20} color={colors.primary} />
                </View>
                <Text style={styles.statNumber}>{ministries.length}</Text>
                <Text style={styles.statLabel}>Total Ministries</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: colors.secondary + "15" }]}>
                  <Users size={20} color={colors.secondary} />
                </View>
                <Text style={styles.statNumber}>
                  {ministries.reduce((sum, m) => sum + m.member_count, 0)}
                </Text>
                <Text style={styles.statLabel}>Total Members</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: colors.tertiary + "15" }]}>
                  <Shield size={20} color={colors.tertiary} />
                </View>
                <Text style={styles.statNumber}>
                  {ministries.filter((m) => m.is_member).length}
                </Text>
                <Text style={styles.statLabel}>You Serve In</Text>
              </View>
            </View>
          </View>
        )}

        {/* Empty State */}
        {ministries.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Church size={48} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No Ministries Yet</Text>
            <Text style={styles.emptyDescription}>
              Ministries will appear here once your church creates them. Check back soon!
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LightTheme.background,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: LightTheme.textSecondary,
  },
  headerGradient: {
    paddingBottom: 24,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    ...Platform.select({
      ios: {
        shadowColor: LightTheme.primaryDark,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: { elevation: 10 },
    }),
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "rgba(255,255,255,0.7)",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "800" as const,
    color: "#fff",
    letterSpacing: -0.5,
  },
  headerIcons: {
    flexDirection: "row",
    gap: 8,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginTop: 8,
  },
  scrollView: {
    flex: 1,
    marginTop: -12,
  },
  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: LightTheme.text,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: LightTheme.textSecondary,
    backgroundColor: LightTheme.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  ministriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
  },
  ministryCard: {
    width: CARD_WIDTH,
    borderRadius: 18,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 5 },
    }),
  },
  ministryCardInner: {
    padding: 18,
    minHeight: 160,
    justifyContent: "space-between",
  },
  cardIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cardLockBadge: {
    position: "absolute",
    top: 18,
    right: 18,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#fff",
    marginBottom: 4,
  },
  cardMembers: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginBottom: 12,
  },
  cardArrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardAction: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "rgba(255,255,255,0.9)",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: LightTheme.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: LightTheme.borderLight,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: LightTheme.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: LightTheme.textTertiary,
    textAlign: "center",
    fontWeight: "500" as const,
  },
  emptyExploreCard: {
    alignItems: "center",
    padding: 24,
    backgroundColor: LightTheme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LightTheme.borderLight,
  },
  emptyExploreText: {
    fontSize: 14,
    color: LightTheme.textSecondary,
    marginTop: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: LightTheme.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: LightTheme.text,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: LightTheme.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});
