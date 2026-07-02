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
  Calendar,
  MessageCircle,
  FileText,
  Megaphone,
  HandHeart,
  ClipboardList,
  BarChart3,
  Settings,
  UserPlus,
  Check,
  LogOut,
  ChevronRight,
  Baby,
  Music,
  Shield,
  Video,
  Search,
  Bell,
  FolderOpen,
  Vote,
  MessageSquare,
  Clock,
  MapPin,
  Star,
  Sparkles,
  Church,
  Heart,
  Activity,
  Grid3X3,
} from "lucide-react-native";
import Colors from '@/constants/colors';
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation } from "@tanstack/react-query";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type IconComp = React.ComponentType<{ size: number; color: string }>;

const ICON_MAP: Record<string, IconComp> = {
  Baby, Sparkles, Music, Users, Church, Heart, Shield, Star, HandHeart, Video,
};

interface MinistryInfo {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  image_url: string | null;
  ministry_type: string | null;
  contact_email: string | null;
  meeting_location: string | null;
  meeting_schedule: string | null;
}

interface QuickAction {
  icon: IconComp;
  label: string;
  section: string;
  color: string;
}

export default function MinistryDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAdmin, isSuperAdmin, currentOrganization } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const ministryQuery = useQuery<MinistryInfo | null>({
    queryKey: ["ministry-dashboard", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("ministries")
        .select("id, name, description, color, icon, image_url, ministry_type, contact_email, meeting_location, meeting_schedule")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as MinistryInfo;
    },
    enabled: !!id,
  });

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

      const { error } = await (supabase
        .from("ministry_members") as any)
        .update({ is_active: false })
        .eq("ministry_id", id)
        .eq("profile_id", (profileData as any).id);
      if (error) throw error;
    },
    onSuccess: () => {
      memberCheckQuery.refetch();
      memberCountQuery.refetch();
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

  const quickActions: QuickAction[] = [
    { icon: Megaphone, label: "Announcements", section: "announcements", color: Colors.highlight },
    { icon: MessageCircle, label: "Chat", section: "chat", color: Colors.tertiary },
    { icon: Calendar, label: "Calendar", section: "calendar", color: Colors.secondary },
    { icon: HandHeart, label: "Prayer", section: "prayer", color: Colors.coral },
    { icon: ClipboardList, label: "Tasks", section: "tasks", color: Colors.mint },
    { icon: Users, label: "Members", section: "members", color: Colors.primaryLight },
    { icon: FolderOpen, label: "Files", section: "files", color: Colors.sky },
    { icon: Vote, label: "Polls", section: "polls", color: Colors.peach },
    { icon: MessageSquare, label: "Discussion", section: "discussion", color: Colors.highlightLight },
    { icon: BarChart3, label: "Stats", section: "stats", color: Colors.tertiaryLight },
  ];

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      ministryQuery.refetch(),
      memberCheckQuery.refetch(),
      memberCountQuery.refetch(),
      upcomingEventsQuery.refetch(),
    ]);
    setIsRefreshing(false);
  }, [ministryQuery.refetch, memberCheckQuery.refetch, memberCountQuery.refetch, upcomingEventsQuery.refetch]);

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
            {/* Quick Actions Grid */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionsGrid}>
                {quickActions.map((action) => (
                  <TouchableOpacity
                    key={action.label}
                    style={styles.actionCard}
                    activeOpacity={0.7}
                    onPress={() => {
                      Alert.alert(action.label, `${action.label} section coming soon for this ministry.`);
                    }}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: action.color + "15" }]}>
                      <action.icon size={22} color={action.color} />
                    </View>
                    <Text style={styles.actionLabel} numberOfLines={1}>
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Ministry-Specific Quick Links */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ministry Tools</Text>
              {ministry.ministry_type === "deacons" || ministry.name.toLowerCase().includes("deacon") ? (
                <View style={styles.toolsGrid}>
                  {[
                    { icon: Heart, label: "Care Visits", desc: "Track hospital & home visits" },
                    { icon: HandHeart, label: "Benevolence", desc: "Manage assistance requests" },
                    { icon: Bell, label: "Prayer Assignments", desc: "Confidential prayer follow-up" },
                    { icon: Clock, label: "Service Schedule", desc: "Greeting & communion rotation" },
                    { icon: ClipboardList, label: "Meal Coordination", desc: "Organize meal deliveries" },
                    { icon: Activity, label: "Reports", desc: "Monthly care & visit reports" },
                  ].map((tool) => (
                    <TouchableOpacity
                      key={tool.label}
                      style={styles.toolCard}
                      activeOpacity={0.7}
                      onPress={() => Alert.alert(tool.label, "This ministry tool is available for members.")}
                    >
                      <View style={[styles.toolIcon, { backgroundColor: color + "15" }]}>
                        <tool.icon size={24} color={color} />
                      </View>
                      <Text style={styles.toolLabel}>{tool.label}</Text>
                      <Text style={styles.toolDesc}>{tool.desc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : ministry.ministry_type === "worship" || ministry.name.toLowerCase().includes("worship") ? (
                <View style={styles.toolsGrid}>
                  {[
                    { icon: Calendar, label: "Schedule", desc: "Band & vocal rotation" },
                    { icon: Music, label: "Song Library", desc: "Browse & manage songs" },
                    { icon: Grid3X3, label: "Setlists", desc: "Create & share setlists" },
                    { icon: Clock, label: "Rehearsals", desc: "Upcoming rehearsal calendar" },
                    { icon: FileText, label: "Service Plans", desc: "Sunday service planning" },
                    { icon: Users, label: "Team Roster", desc: "Musicians & vocalists" },
                  ].map((tool) => (
                    <TouchableOpacity
                      key={tool.label}
                      style={styles.toolCard}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (tool.label === "Song Library") router.push("/worship" as any);
                        else Alert.alert(tool.label, "This worship tool is available for team members.");
                      }}
                    >
                      <View style={[styles.toolIcon, { backgroundColor: color + "15" }]}>
                        <tool.icon size={24} color={color} />
                      </View>
                      <Text style={styles.toolLabel}>{tool.label}</Text>
                      <Text style={styles.toolDesc}>{tool.desc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : ministry.ministry_type === "children" || ministry.name.toLowerCase().includes("children") ? (
                <View style={styles.toolsGrid}>
                  {[
                    { icon: Users, label: "Classrooms", desc: "Manage age-group classrooms" },
                    { icon: Baby, label: "Child Profiles", desc: "View & manage child records" },
                    { icon: Check, label: "Check-In", desc: "Digital child check-in system" },
                    { icon: FileText, label: "Lessons", desc: "Weekly curriculum & crafts" },
                    { icon: Shield, label: "Incident Reports", desc: "Log & track incidents" },
                    { icon: Bell, label: "Parent Messaging", desc: "Send updates to parents" },
                  ].map((tool) => (
                    <TouchableOpacity
                      key={tool.label}
                      style={styles.toolCard}
                      activeOpacity={0.7}
                      onPress={() => Alert.alert(tool.label, "This children's ministry tool is available for staff.")}
                    >
                      <View style={[styles.toolIcon, { backgroundColor: color + "15" }]}>
                        <tool.icon size={24} color={color} />
                      </View>
                      <Text style={styles.toolLabel}>{tool.label}</Text>
                      <Text style={styles.toolDesc}>{tool.desc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.genericTools}>
                  <View style={[styles.toolIcon, { backgroundColor: color + "15" }]}>
                    <Grid3X3 size={24} color={color} />
                  </View>
                  <Text style={styles.genericToolsText}>
                    General ministry workspace — all shared tools are available above.
                  </Text>
                </View>
              )}
            </View>

            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>Upcoming Events</Text>
                  <TouchableOpacity>
                    <Text style={[styles.linkText, { color }]}>View All</Text>
                  </TouchableOpacity>
                </View>
                {upcomingEvents.map((event: any) => (
                  <TouchableOpacity key={event.id} style={styles.eventCard} activeOpacity={0.7}>
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
  genericTools: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.borderLight },
  genericToolsText: { fontSize: 14, color: Colors.textSecondary, flex: 1, lineHeight: 20 },
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
