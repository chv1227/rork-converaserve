import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  TextInput,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Users,
  UsersRound,
  AlertTriangle,
  Shield,
  Activity,
  ChevronRight,
  UserCheck,
  UserX,
  Calendar,
  Megaphone,
  Church,
  UserPlus,
  ClipboardList,
  Trash2,
  Plus,
  MapPin,
  X,
  Check,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { ChurchMembership, ChurchRole } from "@/types";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  onPress?: () => void;
}

function StatCard({ icon, label, value, color, onPress }: StatCardProps) {
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.statIcon, { backgroundColor: color + "15" }]}>
        {icon}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Container>
  );
}

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  badge?: number;
  danger?: boolean;
  showBorder?: boolean;
}

function QuickAction({ icon, title, subtitle, onPress, badge, danger = false, showBorder = true }: QuickActionProps) {
  return (
    <TouchableOpacity 
      style={[styles.quickAction, !showBorder && styles.quickActionNoBorder]} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <View style={[styles.quickActionIcon, danger && styles.quickActionIconDanger]}>{icon}</View>
      <View style={styles.quickActionContent}>
        <Text style={[styles.quickActionTitle, danger && styles.quickActionTitleDanger]}>{title}</Text>
        <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
      </View>
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <ChevronRight size={18} color={Colors.textTertiary} />
    </TouchableOpacity>
  );
}

interface ActivityItemProps {
  action: string;
  details: string;
  userName: string;
  createdAt: string;
}

function ActivityItem({ action, details, userName, createdAt }: ActivityItemProps) {
  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <View style={styles.activityItem}>
      <View style={styles.activityDot} />
      <View style={styles.activityContent}>
        <Text style={styles.activityDetails}>{details}</Text>
        <Text style={styles.activityMeta}>
          {userName} • {formatTime(createdAt)}
        </Text>
      </View>
    </View>
  );
}



export default function AdminDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAdmin, isSuperAdmin, user } = useAuth();
  const queryClient = useQueryClient();

  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "leader" | "admin">("member");
  const [selectedMinistries, setSelectedMinistries] = useState<string[]>([]);

  interface ActivityLog {
    id: string;
    action: string;
    details: string;
    userName: string;
    createdAt: string;
  }

  const statsQuery = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const { count: totalMinistries } = await supabase.from('ministries').select('*', { count: 'exact', head: true });
      const { count: totalEvents } = await supabase.from('events').select('*', { count: 'exact', head: true });
      const { count: totalAnnouncements } = await supabase.from('announcements').select('*', { count: 'exact', head: true });
      
      return {
        totalUsers: totalUsers || 0,
        totalMinistries: totalMinistries || 0,
        totalEvents: totalEvents || 0,
        totalAnnouncements: totalAnnouncements || 0,
        pendingRequests: 0,
        pendingReports: 0,
        suspendedUsers: 0,
        activeUsers: totalUsers || 0,
        recentActivity: [] as ActivityLog[],
      };
    },
    enabled: isAdmin,
  });
  const stats = statsQuery.data;

  interface MinistryItem {
    id: string;
    name: string;
    color: string;
  }

  const ministriesQuery = useQuery({
    queryKey: ['ministriesAdmin'],
    queryFn: async () => [] as MinistryItem[],
    enabled: false,
  });
  
  const pendingRequestsQuery = useQuery({
    queryKey: ['pendingRequests'],
    queryFn: async () => [],
    enabled: isAdmin,
  });

  const userChurchesQuery = useQuery({
    queryKey: ['userChurches', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('user_church_roles')
        .select('*, churches(*)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .in('role', ['owner', 'admin']);
      
      return (data || []).map((m: any) => ({
        id: m.churches?.id || '',
        name: m.churches?.name || '',
        description: m.churches?.description || '',
        logo: m.churches?.logo_url,
        city: '',
        state: '',
        role: (m.role === 'owner' ? 'admin' : m.role) as ChurchRole,
        joinedAt: m.created_at,
        membership: {
          id: m.id,
          churchId: m.church_id,
          userId: user?.id || '',
          role: (m.role === 'owner' ? 'admin' : m.role) as ChurchRole,
          joinedAt: m.created_at,
          isActive: true,
        } as ChurchMembership,
      }));
    },
    enabled: !!user?.id && isAdmin,
  });

  const adminChurches = userChurchesQuery.data || [];
  const ministries = ministriesQuery.data || [];
  const pendingRequests = (pendingRequestsQuery.data as unknown[])?.length || 0;

  const inviteMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; role: string; ministries: string[] }) => {
      console.log('Inviting user:', data);
      return { success: true };
    },
    onSuccess: () => {
      setInviteModalVisible(false);
      setInviteName("");
      setInviteEmail("");
      setInviteRole("member");
      setSelectedMinistries([]);
      queryClient.invalidateQueries();
      if (Platform.OS === "web") {
        console.log("Invitation sent successfully");
      } else {
        Alert.alert("Success", "Invitation sent successfully!");
      }
    },
    onError: (error: Error) => {
      if (Platform.OS === "web") {
        console.error("Failed to send invitation:", error.message);
      } else {
        Alert.alert("Error", error.message);
      }
    },
  });

  const handleSendInvite = () => {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      if (Platform.OS !== "web") {
        Alert.alert("Error", "Please enter both name and email");
      }
      return;
    }
    inviteMutation.mutate({
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole,
      ministries: selectedMinistries,
    });
  };

  const toggleMinistry = (ministryId: string) => {
    setSelectedMinistries((prev) =>
      prev.includes(ministryId)
        ? prev.filter((id) => id !== ministryId)
        : [...prev, ministryId]
    );
  };

  const showComingSoon = (feature: string) => {
    if (Platform.OS === "web") {
      console.log(`${feature} - Coming soon`);
    } else {
      Alert.alert("Coming Soon", `${feature} will be available in a future update.`);
    }
  };

  if (!isAdmin) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.redirectText}>Checking permissions...</Text>
      </View>
    );
  }

  if (statsQuery.isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.redirectText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.title}>Admin Dashboard</Text>
            <Text style={styles.subtitle}>Welcome back, {user?.name?.split(" ")[0]}</Text>
          </View>
          <View style={styles.adminBadge}>
            <Shield size={14} color={Colors.primary} />
            <Text style={styles.adminBadgeText}>{isSuperAdmin ? "Super" : "Admin"}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsGrid}>
          <StatCard
            icon={<Users size={20} color="#3B82F6" />}
            label="Total Users"
            value={stats?.totalUsers || 0}
            color="#3B82F6"
            onPress={() => router.push("/admin/users" as any)}
          />
          <StatCard
            icon={<UserCheck size={20} color="#10B981" />}
            label="Active"
            value={stats?.activeUsers || 0}
            color="#10B981"
          />
          <StatCard
            icon={<UsersRound size={20} color="#8B5CF6" />}
            label="Ministries"
            value={stats?.totalMinistries || 0}
            color="#8B5CF6"
            onPress={() => router.push("/admin/ministries" as any)}
          />
          <StatCard
            icon={<AlertTriangle size={20} color="#F59E0B" />}
            label="Reports"
            value={stats?.pendingReports || 0}
            color="#F59E0B"
            onPress={() => router.push("/admin/moderation" as any)}
          />
        </View>

        <View style={styles.secondaryStats}>
          <View style={styles.secondaryStat}>
            <Calendar size={16} color={Colors.textSecondary} />
            <Text style={styles.secondaryStatText}>{stats?.totalEvents || 0} Events</Text>
          </View>
          <View style={styles.secondaryStat}>
            <Megaphone size={16} color={Colors.textSecondary} />
            <Text style={styles.secondaryStatText}>{stats?.totalAnnouncements || 0} Announcements</Text>
          </View>
          <View style={styles.secondaryStat}>
            <UserX size={16} color={Colors.textSecondary} />
            <Text style={styles.secondaryStatText}>{stats?.suspendedUsers || 0} Suspended</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>User Management</Text>
        <View style={styles.quickActionsSection}>
          <QuickAction
            icon={<Users size={20} color={Colors.primary} />}
            title="Manage Users"
            subtitle="View, edit, and manage user accounts"
            onPress={() => router.push("/admin/users" as any)}
          />
          <QuickAction
            icon={<UserPlus size={20} color={Colors.primary} />}
            title="Invite Members"
            subtitle="Send invitations to new members"
            onPress={() => setInviteModalVisible(true)}
          />
          <QuickAction
            icon={<Shield size={20} color={Colors.primary} />}
            title="Roles & Permissions"
            subtitle="Configure access levels"
            onPress={() => router.push("/admin/users" as any)}
            showBorder={false}
          />
        </View>

        <Text style={styles.sectionTitle}>Content & Ministries</Text>
        <View style={styles.quickActionsSection}>
          <QuickAction
            icon={<UsersRound size={20} color={Colors.primary} />}
            title="Ministry Management"
            subtitle="Create, edit, and manage ministries"
            onPress={() => router.push("/admin/ministries" as any)}
          />
          <QuickAction
            icon={<ClipboardList size={20} color={Colors.primary} />}
            title="Ministry Requests"
            subtitle="Review pending join requests"
            onPress={() => router.push("/admin/requests" as any)}
            badge={pendingRequests}
            showBorder={false}
          />
        </View>

        {(isSuperAdmin || adminChurches.length > 0) && (
          <>
            <Text style={styles.sectionTitle}>Church Management</Text>
            <View style={styles.quickActionsSection}>
              {adminChurches.map((church, index) => (
                <TouchableOpacity
                  key={church.id}
                  style={[
                    styles.churchItem,
                    index === adminChurches.length - 1 && !isSuperAdmin && styles.quickActionNoBorder,
                  ]}
                  onPress={() => router.push(`/church/${church.id}/settings` as any)}
                  activeOpacity={0.7}
                >
                  <View style={styles.churchIcon}>
                    <Church size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.quickActionContent}>
                    <Text style={styles.quickActionTitle}>{church.name}</Text>
                    <View style={styles.churchLocationRow}>
                      <MapPin size={12} color={Colors.textTertiary} />
                      <Text style={styles.churchLocation}>
                        {church.city}, {church.state}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.churchRoleBadge}>
                    <Text style={styles.churchRoleText}>
                      {church.membership?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={Colors.textTertiary} />
                </TouchableOpacity>
              ))}
              {isSuperAdmin && (
                <QuickAction
                  icon={<Plus size={20} color={Colors.primary} />}
                  title="Create New Church"
                  subtitle="Add a new church to the platform"
                  onPress={() => router.push("/church/create" as any)}
                  showBorder={false}
                />
              )}
              {adminChurches.length === 0 && !isSuperAdmin && (
                <View style={styles.emptyChurchState}>
                  <Church size={32} color={Colors.textTertiary} />
                  <Text style={styles.emptyChurchText}>No churches to manage</Text>
                </View>
              )}
            </View>
          </>
        )}

        {isSuperAdmin && (
          <>
            <Text style={styles.sectionTitle}>Super Admin</Text>
            <View style={styles.quickActionsSection}>
              <QuickAction
                icon={<AlertTriangle size={20} color={Colors.warning} />}
                title="Content Moderation"
                subtitle="Review reported content"
                onPress={() => router.push("/admin/moderation" as any)}
                badge={stats?.pendingReports}
              />
              <QuickAction
                icon={<Trash2 size={20} color={Colors.error} />}
                title="Danger Zone"
                subtitle="Reset data, delete organization"
                onPress={() => {
                  if (Platform.OS === "web") {
                    console.log("Danger zone - Super admin only");
                  } else {
                    Alert.alert(
                      "Danger Zone",
                      "This area contains destructive actions. Are you sure you want to proceed?",
                      [
                        { text: "Cancel", style: "cancel" },
                        { 
                          text: "Proceed", 
                          style: "destructive",
                          onPress: () => showComingSoon("Danger Zone actions")
                        },
                      ]
                    );
                  }
                }}
                showBorder={false}
                danger
              />
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activitySection}>
          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            stats.recentActivity.map((activity) => (
              <ActivityItem
                key={activity.id}
                action={activity.action}
                details={activity.details}
                userName={activity.userName}
                createdAt={activity.createdAt}
              />
            ))
          ) : (
            <View style={styles.emptyActivity}>
              <Activity size={32} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No recent activity</Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal
        visible={inviteModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite New Member</Text>
              <TouchableOpacity
                onPress={() => setInviteModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter full name"
                  placeholderTextColor={Colors.textTertiary}
                  value={inviteName}
                  onChangeText={setInviteName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter email address"
                  placeholderTextColor={Colors.textTertiary}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Role</Text>
                <View style={styles.roleSelector}>
                  {(["member", "leader", "admin"] as const).map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleOption,
                        inviteRole === role && styles.roleOptionActive,
                      ]}
                      onPress={() => setInviteRole(role)}
                    >
                      <Text
                        style={[
                          styles.roleOptionText,
                          inviteRole === role && styles.roleOptionTextActive,
                        ]}
                      >
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Assign to Ministries (Optional)</Text>
                <View style={styles.ministriesSelector}>
                  {ministries.map((ministry) => (
                    <TouchableOpacity
                      key={ministry.id}
                      style={[
                        styles.ministryChip,
                        selectedMinistries.includes(ministry.id) && {
                          backgroundColor: ministry.color + "20",
                          borderColor: ministry.color,
                        },
                      ]}
                      onPress={() => toggleMinistry(ministry.id)}
                    >
                      {selectedMinistries.includes(ministry.id) && (
                        <Check size={14} color={ministry.color} />
                      )}
                      <Text
                        style={[
                          styles.ministryChipText,
                          selectedMinistries.includes(ministry.id) && {
                            color: ministry.color,
                          },
                        ]}
                      >
                        {ministry.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.sendInviteButton,
                  (!inviteName.trim() || !inviteEmail.trim()) && styles.sendInviteButtonDisabled,
                ]}
                onPress={handleSendInvite}
                disabled={!inviteName.trim() || !inviteEmail.trim() || inviteMutation.isPending}
              >
                {inviteMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <Text style={styles.sendInviteButtonText}>Send Invitation</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  redirectText: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitles: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary + "15",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  secondaryStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  secondaryStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  secondaryStatText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  quickActionsSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
  },
  quickAction: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  quickActionNoBorder: {
    borderBottomWidth: 0,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  quickActionIconDanger: {
    backgroundColor: Colors.error + "15",
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  quickActionTitleDanger: {
    color: Colors.error,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.textInverse,
  },
  churchItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  churchIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary + "15",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: 12,
  },
  churchLocationRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    marginTop: 2,
  },
  churchLocation: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  churchRoleBadge: {
    backgroundColor: Colors.primary + "15",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  churchRoleText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  emptyChurchState: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 32,
    gap: 8,
  },
  emptyChurchText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  activitySection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 6,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityDetails: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  activityMeta: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  emptyActivity: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
  },
  roleSelector: {
    flexDirection: "row",
    gap: 8,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
  },
  roleOptionActive: {
    backgroundColor: Colors.primary,
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
  },
  roleOptionTextActive: {
    color: Colors.textInverse,
  },
  ministriesSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ministryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: "transparent",
  },
  ministryChipText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
  },
  sendInviteButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  sendInviteButtonDisabled: {
    opacity: 0.5,
  },
  sendInviteButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.textInverse,
  },
});
