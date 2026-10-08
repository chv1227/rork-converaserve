import React, { useCallback, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  Users,
  Settings,
  UserPlus,
  Check,
  LogOut,
  ChevronRight,
  Baby,
  Music,
  Shield,
  Video,
  Clock,
  MapPin,
  Star,
  Sparkles,
  Church,
  Heart,
  HandHeart,
  Lock,
} from "lucide-react-native";
import Colors from '@/constants/colors';
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { db } from "@/lib/ministryWorkspace";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePlanAccess, PLAN_LABEL } from "@/hooks/usePlanAccess";
import {
  MinistryTool,
  MinistryToolId,
  MINISTRY_TOOLS,
  genericTools,
  quickActions,
  resolveMinistryKind,
  toolsForKind,
} from "@/constants/ministryTools";
import MinistryDashboardHeader from "@/components/ministry/MinistryDashboardHeader";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type IconComp = React.ComponentType<{ size: number; color: string }>;

const ICON_MAP: Record<string, IconComp> = {
  Baby, Sparkles, Music, Users, Church, Heart, Shield, Star, HandHeart, Video,
};

// Quick Action tint colours, in the same order as QUICK_ACTION_IDS (constants/ministryTools.ts).
const QUICK_ACTION_COLORS = [
  Colors.highlight,
  Colors.tertiary,
  Colors.secondary,
  Colors.coral,
  Colors.mint,
  Colors.primaryLight,
  Colors.sky,
  Colors.peach,
  Colors.tertiaryLight,
];

interface MinistryInfo {
  id: string;
  church_id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  image_url: string | null;
  ministry_type: string | null;
  template: string | null;
  contact_email: string | null;
  meeting_location: string | null;
  meeting_schedule: string | null;
}

export default function MinistryDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user, isAdmin, isSuperAdmin, currentOrganization } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const ministryQuery = useQuery<MinistryInfo | null>({
    queryKey: ["ministry-dashboard", id],
    queryFn: async () => {
      if (!id) return null;
      // `template` holds the ministry type on live data (ministry_type is usually null).
      const { data, error } = await db
        .from("ministries")
        .select("id, church_id, name, description, color, icon, image_url, ministry_type, template, contact_email, meeting_location, meeting_schedule")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as MinistryInfo;
    },
    enabled: !!id,
  });

  const { canUse, loading: planLoading } = usePlanAccess(ministryQuery.data?.church_id);
  const memberCheckQuery = useQuery({
    queryKey: ["ministry-member-check", id, user?.id],
    queryFn: async () => {
      if (!id || !user?.id || !currentOrganization?.id) return { isMember: false, role: "" };
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .eq("church_id", currentOrganization.id)
        .single();
      if (!profileData) return { isMember: false, role: "" };

      const { data: memberData } = await supabase
        .from("ministry_members")
        .select("role")
        .eq("ministry_id", id)
        .eq("profile_id", (profileData as any).id)
        .eq("is_active", true)
        .maybeSingle();
      return {
        isMember: !!memberData,
        role: (memberData as any)?.role || "member",
      };
    },
    enabled: !!id && !!user?.id && !!currentOrganization?.id,
  });

  const memberCountQuery = useQuery({
    queryKey: ["ministry-member-count", id],
    queryFn: async () => {
      if (!id) return { total: 0, leaders: 0 };
      const { count: total } = await supabase
        .from("ministry_members")
        .select("*", { count: "exact", head: true })
        .eq("ministry_id", id)
        .eq("is_active", true);
      const { count: leaders } = await supabase
        .from("ministry_members")
        .select("*", { count: "exact", head: true })
        .eq("ministry_id", id)
        .eq("is_active", true)
        .in("role", ["leader", "admin"]);
      return { total: total || 0, leaders: leaders || 0 };
    },
    enabled: !!id,
  });

  const upcomingEventsQuery = useQuery({
    queryKey: ["ministry-events-preview", id],
    queryFn: async () => {
      if (!id) return [];
      const { data } = await supabase
        .from("events")
        .select("id, title, start_datetime, location_name")
        .eq("ministry_id", id)
        .eq("status", "published")
        .gte("start_datetime", new Date().toISOString())
        .order("start_datetime", { ascending: true })
        .limit(3);
      return (data || []).map((e: any) => ({
        ...e,
        date: new Date(e.start_datetime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        time: new Date(e.start_datetime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      }));
    },
    enabled: !!id,
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id || !currentOrganization?.id) throw new Error("Not authenticated");
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .eq("church_id", currentOrganization.id)
        .single();
      if (!profileData) throw new Error("Profile not found");

      const { error } = await supabase.from("ministry_members").insert({
        ministry_id: id,
        profile_id: (profileData as any).id,
        role: "member",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      memberCheckQuery.refetch();
      memberCountQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ["ministry-context", id] });
      queryClient.invalidateQueries({ queryKey: ["ministry-roster", id] });
      Alert.alert("Joined!", "You are now a member of this ministry.");
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to join ministry");
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id || !currentOrganization?.id) throw new Error("Not authenticated");
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .eq("church_id", currentOrganization.id)
        .single();
      if (!profileData) throw new Error("Profile not found");

      // v1 set is_active=false, but ministry_members has no UPDATE policy so it silently
      // did nothing. The existing "Leave ministries" DELETE policy allows removing your own row.
      const { data, error } = await (supabase
        .from("ministry_members") as any)
        .delete()
        .eq("ministry_id", id)
        .eq("profile_id", (profileData as any).id)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Couldn't leave this ministry. Please try again.");
    },
    onSuccess: () => {
      memberCheckQuery.refetch();
      memberCountQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ["ministry-context", id] });
      queryClient.invalidateQueries({ queryKey: ["ministry-roster", id] });
      Alert.alert("Left Ministry", "You have left this ministry.");
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to leave ministry");
    },
  });

  const ministry = ministryQuery.data;
  const { isMember, role: memberRole } = memberCheckQuery.data || { isMember: false, role: "member" };
  const { total: memberCount, leaders: leaderCount } = memberCountQuery.data || { total: 0, leaders: 0 };
  const upcomingEvents = upcomingEventsQuery.data || [];
  const canManage = isAdmin || isSuperAdmin || memberRole === "leader" || memberRole === "admin";
  const canAccess = isMember || isAdmin || isSuperAdmin;

  const color = ministry?.color || Colors.primary;
  const IconComp = ICON_MAP[ministry?.icon || ""] || Church;
  const coverImage = ministry?.image_url || "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=400&fit=crop";

  // ── Config-driven tools (constants/ministryTools.ts) ──
  const ministryKind = ministry ? resolveMinistryKind(ministry) : "default";
  const typeTools = toolsForKind(ministryKind);
  const toolkit = genericTools();
  const actions = quickActions();

  // While the plan is still loading nothing shows as locked; tool screens gate themselves too.
  const isToolLocked = useCallback((tool: MinistryTool) => !planLoading && !canUse(tool.minPlan), [canUse, planLoading]);

  const openTool = useCallback(
    (tool: MinistryTool) => {
      if (!id) return;
      if (isToolLocked(tool)) {
        router.push("/pricing" as any);
        return;
      }
      if (tool.route) {
        router.push(tool.route(id) as any);
      } else if (tool.handler) {
        tool.handler({ ministryId: id, push: (href) => router.push(href as any) });
      }
    },
    [id, isToolLocked, router]
  );

  const openToolById = useCallback((toolId: MinistryToolId) => openTool(MINISTRY_TOOLS[toolId]), [openTool]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      ministryQuery.refetch(),
      memberCheckQuery.refetch(),
      memberCountQuery.refetch(),
      upcomingEventsQuery.refetch(),
      queryClient.invalidateQueries({ queryKey: ["ministry-dashboard-stats", id] }),
      queryClient.invalidateQueries({ queryKey: ["church-plan-rank"] }),
    ]);
    setIsRefreshing(false);
  }, [ministryQuery.refetch, memberCheckQuery.refetch, memberCountQuery.refetch, upcomingEventsQuery.refetch, queryClient, id]);

  const renderToolCard = (tool: MinistryTool) => {
    const locked = isToolLocked(tool);
    return (
      <TouchableOpacity
        key={tool.id}
        style={[styles.toolCard, locked && styles.toolCardLocked]}
        activeOpacity={0.7}
        onPress={() => openTool(tool)}
        accessibilityLabel={locked && tool.minPlan ? `${tool.label}, requires ${PLAN_LABEL[tool.minPlan]} plan` : tool.label}
      >
        <View style={styles.toolTopRow}>
          <View style={[styles.toolIcon, { backgroundColor: (locked ? Colors.textTertiary : color) + "15" }]}>
            <tool.icon size={24} color={locked ? Colors.textTertiary : color} />
          </View>
          {locked && tool.minPlan ? (
            <View style={styles.lockBadge}>
              <Lock size={10} color={Colors.textSecondary} />
              <Text style={styles.lockBadgeText}>{PLAN_LABEL[tool.minPlan]}</Text>
            </View>
          ) : tool.comingSoon ? (
            <View style={styles.soonBadge}>
              <Text style={styles.soonBadgeText}>Soon</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.toolLabel, locked && { color: Colors.textSecondary }]}>{tool.label}</Text>
        <Text style={styles.toolDesc}>{tool.comingSoon && !locked ? `Coming soon · ${tool.desc}` : tool.desc}</Text>
      </TouchableOpacity>
    );
  };

  if (ministryQuery.isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading ministry...</Text>
      </View>
    );
  }

  if (!ministry) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Ministry not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <LinearGradient
        colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.7)", Colors.primaryDark]}
        locations={[0, 0.5, 1]}
        style={[styles.headerBase]}
      >
        <Image source={{ uri: coverImage }} style={StyleSheet.absoluteFillObject} />
        <LinearGradient
          colors={["rgba(0,0,0,0.2)", "rgba(0,0,0,0.65)"]}
          style={StyleSheet.absoluteFillObject}
        />
        
        <View style={[styles.headerNav, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.navBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.navActions}>
            {canManage && (
              <TouchableOpacity style={styles.navBtn} activeOpacity={0.7}>
                <Settings size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.headerInfo}>
          <View style={[styles.headerIcon, { backgroundColor: color }]}>
            <IconComp size={36} color="#fff" />
          </View>
          <Text style={styles.headerName}>{ministry.name}</Text>
          <Text style={styles.headerDesc} numberOfLines={2}>
            {ministry.description || "Ministry of " + (currentOrganization?.name || "our church")}
          </Text>
          <View style={styles.headerStats}>
            <View style={styles.headerStat}>
              <Users size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.headerStatText}>{memberCount} members</Text>
            </View>
            {leaderCount > 0 && (
              <View style={styles.headerStat}>
                <Star size={14} color="rgba(255,255,255,0.9)" />
                <Text style={styles.headerStatText}>{leaderCount} leaders</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Access Denied Message */}
        {!canAccess && (
          <View style={styles.accessDenied}>
            <View style={styles.accessDeniedIcon}>
              <Shield size={40} color={Colors.error} />
            </View>
            <Text style={styles.accessDeniedTitle}>Access Restricted</Text>
            <Text style={styles.accessDeniedText}>
              This ministry is private. You must be a member to access its content, tools, and discussions.
            </Text>
            <TouchableOpacity
              style={[styles.joinBtn, { backgroundColor: color }]}
              onPress={() => joinMutation.mutate()}
              disabled={joinMutation.isPending}
              activeOpacity={0.8}
            >
              {joinMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <UserPlus size={20} color="#fff" />
                  <Text style={styles.joinBtnText}>Join This Ministry</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {canAccess && (
          <>

            {/* Dashboard */}
            <MinistryDashboardHeader
              ministryId={ministry.id}
              color={color}
              onOpenTool={openToolById}
              isLocked={(toolId) => isToolLocked(MINISTRY_TOOLS[toolId])}
            />

            {/* Quick Actions Grid */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionsGrid}>
                {actions.map((action, index) => {
                  const locked = isToolLocked(action);
                  const tint = locked ? Colors.textTertiary : QUICK_ACTION_COLORS[index % QUICK_ACTION_COLORS.length];
                  return (
                    <TouchableOpacity
                      key={action.id}
                      style={styles.actionCard}
                      activeOpacity={0.7}
                      onPress={() => openTool(action)}
                    >
                      <View style={[styles.actionIcon, { backgroundColor: tint + "15" }]}>
                        <action.icon size={22} color={tint} />
                        {locked ? (
                          <View style={styles.actionLock}>
                            <Lock size={9} color="#fff" />
                          </View>
                        ) : null}
                      </View>
                      <Text style={[styles.actionLabel, locked && { color: Colors.textSecondary }]} numberOfLines={1}>
                        {action.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Ministry-Specific Tools */}
            {typeTools.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ministry Tools</Text>
                <View style={styles.toolsGrid}>{typeTools.map(renderToolCard)}</View>
              </View>
            )}

            {/* Team Toolkit (every ministry) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Team Toolkit</Text>
              <View style={styles.toolsGrid}>{toolkit.map(renderToolCard)}</View>
            </View>

            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionRow}>
                  <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Upcoming Events</Text>
                  <TouchableOpacity onPress={() => openToolById("events")}>
                    <Text style={[styles.linkText, { color }]}>View All</Text>
                  </TouchableOpacity>
                </View>
                {upcomingEvents.map((event: any) => (
                  <TouchableOpacity
                    key={event.id}
                    style={styles.eventCard}
                    activeOpacity={0.7}
                    onPress={() => router.push(`/events/${event.id}` as any)}
                  >
                    <View style={[styles.eventDateBadge, { backgroundColor: color + "15" }]}>
                      <Text style={[styles.eventDateText, { color }]}>{event.date}</Text>
                    </View>
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <View style={styles.eventMeta}>
                        <Clock size={12} color={Colors.textTertiary} />
                        <Text style={styles.eventTime}>{event.time}</Text>
                        {event.location_name && (
                          <>
                            <MapPin size={12} color={Colors.textTertiary} />
                            <Text style={styles.eventTime}>{event.location_name}</Text>
                          </>
                        )}
                      </View>
                    </View>
                    <ChevronRight size={18} color={Colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Leave Ministry */}
            {isMember && !canManage && (
              <TouchableOpacity
                style={styles.leaveBtn}
                onPress={() => {
                  Alert.alert("Leave Ministry", "Are you sure you want to leave this ministry?", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Leave", style: "destructive", onPress: () => leaveMutation.mutate() },
                  ]);
                }}
                disabled={leaveMutation.isPending}
                activeOpacity={0.8}
              >
                <LogOut size={18} color={Colors.error} />
                <Text style={styles.leaveBtnText}>Leave This Ministry</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {/* Bottom Join Bar */}
      {!isMember && canAccess === false && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[styles.joinBtnFull, { backgroundColor: color }]}
            onPress={() => joinMutation.mutate()}
            disabled={joinMutation.isPending}
            activeOpacity={0.8}
          >
            {joinMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <UserPlus size={20} color="#fff" />
                <Text style={styles.joinBtnText}>Join This Ministry</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {isMember && canAccess && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.memberBadge, { backgroundColor: color + "15" }]}>
            <Check size={20} color={color} />
            <Text style={[styles.memberBadgeText, { color }]}>
              {memberRole === "leader" || memberRole === "admin" ? "Ministry Leader" : "Ministry Member"}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 14, color: Colors.textSecondary },
  errorText: { fontSize: 16, color: Colors.error, marginBottom: 16 },
  backBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: Colors.primary, borderRadius: 12 },
  backBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  headerBase: { position: "relative", overflow: "hidden", paddingBottom: 32 },
  headerNav: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 12,
  },
  navBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  navActions: { flexDirection: "row", gap: 8 },
  headerInfo: { alignItems: "center", paddingHorizontal: 20, marginTop: 8 },
  headerIcon: {
    width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center",
    marginBottom: 16,
    ...Platform.select({ ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 }, android: { elevation: 8 } }),
  },
  headerName: { fontSize: 24, fontWeight: "800", color: "#fff", marginBottom: 6 },
  headerDesc: { fontSize: 14, color: "rgba(255,255,255,0.8)", textAlign: "center", paddingHorizontal: 20, lineHeight: 20 },
  headerStats: { flexDirection: "row", gap: 16, marginTop: 14 },
  headerStat: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  headerStatText: { fontSize: 13, color: "rgba(255,255,255,0.95)", fontWeight: "600" },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 20, paddingHorizontal: 20 },
  accessDenied: { alignItems: "center", paddingVertical: 40 },
  accessDeniedIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.errorLight, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  accessDeniedTitle: { fontSize: 20, fontWeight: "700", color: Colors.text, marginBottom: 8 },
  accessDeniedText: { fontSize: 14, color: Colors.textSecondary, textAlign: "center", paddingHorizontal: 20, lineHeight: 20, marginBottom: 24 },
  joinBtn: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  joinBtnText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  section: { marginBottom: 28 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: Colors.text, marginBottom: 16 },
  linkText: { fontSize: 14, fontWeight: "600" },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionCard: {
    width: (SCREEN_WIDTH - 60) / 3, alignItems: "center", paddingVertical: 14,
    backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.borderLight,
    ...Platform.select({ ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 }, android: { elevation: 2 } }),
  },
  actionIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  actionLabel: { fontSize: 11, fontWeight: "600", color: Colors.text, textAlign: "center" },
  toolsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  toolCard: {
    width: (SCREEN_WIDTH - 60) / 2, padding: 16, backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.borderLight,
  },
  toolIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  toolLabel: { fontSize: 14, fontWeight: "700", color: Colors.text, marginBottom: 4 },
  toolDesc: { fontSize: 12, color: Colors.textSecondary, lineHeight: 16 },
  toolCardLocked: { backgroundColor: Colors.surfaceSecondary },
  toolTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  lockBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  lockBadgeText: { fontSize: 10, fontWeight: "700", color: Colors.textSecondary },
  soonBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: Colors.surfaceSecondary },
  soonBadgeText: { fontSize: 10, fontWeight: "700", color: Colors.textTertiary },
  actionLock: { position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.textTertiary, alignItems: "center", justifyContent: "center" },
  eventCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface,
    borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.borderLight,
  },
  eventDateBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, marginRight: 12, minWidth: 50, alignItems: "center" },
  eventDateText: { fontSize: 12, fontWeight: "700" },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 4 },
  eventMeta: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  eventTime: { fontSize: 12, color: Colors.textTertiary },
  leaveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.errorLight,
    borderWidth: 1, borderColor: Colors.error + "25", marginTop: 8,
  },
  leaveBtnText: { fontSize: 15, fontWeight: "600", color: Colors.error },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.borderLight,
    paddingTop: 16, paddingHorizontal: 20,
  },
  joinBtnFull: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 14 },
  memberBadge: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 14 },
  memberBadgeText: { fontSize: 16, fontWeight: "600" },
});
