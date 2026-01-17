import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Users,
  Calendar,
  Megaphone,
  Music,
  Shield,
  ChevronRight,
  UserPlus,
  Trash2,
  UsersRound,
  AlertTriangle,
  LayoutDashboard,
  X,
  Check,
  ClipboardList,
  Church,
  Plus,
  MapPin,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { trpc } from "@/lib/trpc";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { getUserChurches, getChurchMembership } from "@/lib/supabase-churches";
import { Church as ChurchType, ChurchMembership } from "@/types";

interface AdminMenuItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showBorder?: boolean;
  danger?: boolean;
  badge?: number;
}

function AdminMenuItem({
  icon,
  title,
  subtitle,
  onPress,
  showBorder = true,
  danger = false,
  badge,
}: AdminMenuItemProps) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, !showBorder && styles.menuItemNoBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>{icon}</View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuTitle, danger && styles.menuTitleDanger]}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
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

interface ChurchWithRole extends ChurchType {
  membership?: ChurchMembership;
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAdmin, isSuperAdmin, user } = useAuth();
  const queryClient = useQueryClient();

  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "leader" | "admin">("member");
  const [selectedMinistries, setSelectedMinistries] = useState<string[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      console.log("Non-admin user attempted to access settings, redirecting...");
      if (Platform.OS === "web") {
        router.replace("/(tabs)");
      } else {
        Alert.alert("Access Denied", "You don't have permission to access this page.", [
          { text: "OK", onPress: () => router.replace("/(tabs)") },
        ]);
      }
    }
  }, [isAdmin, router]);

  const usersQuery = trpc.admin.getUsers.useQuery(undefined, { enabled: isAdmin });
  const ministriesQuery = trpc.ministries.list.useQuery();
  const statsQuery = trpc.admin.getEnhancedStats.useQuery(undefined, { enabled: isAdmin });
  const pendingRequestsQuery = trpc.admin.getMinistryJoinRequests.useQuery(
    { status: "pending" },
    { enabled: isAdmin }
  );

  const userChurchesQuery = useQuery({
    queryKey: ['userChurches', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const churches = await getUserChurches(user.id);
      const churchesWithRoles: ChurchWithRole[] = [];
      
      for (const church of churches) {
        const membership = await getChurchMembership(church.id, user.id);
        if (membership && (membership.role === 'super_admin' || membership.role === 'admin')) {
          churchesWithRoles.push({ ...church, membership });
        }
      }
      
      return churchesWithRoles;
    },
    enabled: !!user?.id && isAdmin,
  });

  const adminChurches = userChurchesQuery.data || [];

  const inviteMutation = trpc.admin.inviteUser.useMutation({
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
    onError: (error) => {
      if (Platform.OS === "web") {
        console.error("Failed to send invitation:", error.message);
      } else {
        Alert.alert("Error", error.message);
      }
    },
  });

  const totalUsers = usersQuery.data?.length || 0;
  const totalMinistries = ministriesQuery.data?.length || 0;
  const pendingReports = statsQuery.data?.pendingReports || 0;
  const pendingRequests = pendingRequestsQuery.data?.length || 0;
  const ministries = ministriesQuery.data || [];

  const handleNavigation = (route: string) => {
    console.log("Navigating to:", route);
    router.push(route as any);
  };

  const showComingSoon = (feature: string) => {
    if (Platform.OS === "web") {
      console.log(`${feature} - Coming soon`);
    } else {
      Alert.alert("Coming Soon", `${feature} will be available in a future update.`);
    }
  };

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

  if (!isAdmin) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.redirectText}>Redirecting...</Text>
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
            <Text style={styles.title}>Admin Settings</Text>
            <Text style={styles.subtitle}>Manage your organization</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsRow}>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => handleNavigation("/admin/users")}
            activeOpacity={0.7}
          >
            <Users size={24} color={Colors.primary} />
            <Text style={styles.statNumber}>{totalUsers}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => handleNavigation("/admin/groups")}
            activeOpacity={0.7}
          >
            <UsersRound size={24} color={Colors.secondary} />
            <Text style={styles.statNumber}>{totalMinistries}</Text>
            <Text style={styles.statLabel}>Ministries</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Admin Panel</Text>
        <View style={styles.menuSection}>
          <AdminMenuItem
            icon={<LayoutDashboard size={20} color={Colors.primary} />}
            title="Admin Dashboard"
            subtitle="View stats and recent activity"
            onPress={() => handleNavigation("/admin")}
          />
          <AdminMenuItem
            icon={<AlertTriangle size={20} color={Colors.warning} />}
            title="Content Moderation"
            subtitle="Review reported content"
            onPress={() => handleNavigation("/admin/moderation")}
            badge={pendingReports}
            showBorder={false}
          />
        </View>

        <Text style={styles.sectionTitle}>User Management</Text>
        <View style={styles.menuSection}>
          <AdminMenuItem
            icon={<Users size={20} color={Colors.primary} />}
            title="Manage Users"
            subtitle="View and edit user accounts"
            onPress={() => handleNavigation("/admin/users")}
          />
          <AdminMenuItem
            icon={<UserPlus size={20} color={Colors.primary} />}
            title="Invite Members"
            subtitle="Send invitations to new members"
            onPress={() => setInviteModalVisible(true)}
          />
          <AdminMenuItem
            icon={<ClipboardList size={20} color={Colors.primary} />}
            title="Ministry Requests"
            subtitle="Review pending join requests"
            onPress={() => handleNavigation("/admin/requests")}
            badge={pendingRequests}
          />
          <AdminMenuItem
            icon={<Shield size={20} color={Colors.primary} />}
            title="Roles & Permissions"
            subtitle="Configure access levels"
            onPress={() => handleNavigation("/admin/users")}
            showBorder={false}
          />
        </View>

        <Text style={styles.sectionTitle}>Content Management</Text>
        <View style={styles.menuSection}>
          <AdminMenuItem
            icon={<UsersRound size={20} color={Colors.primary} />}
            title="Manage Ministries"
            subtitle="View and manage ministries"
            onPress={() => handleNavigation("/admin/groups")}
          />
          <AdminMenuItem
            icon={<Calendar size={20} color={Colors.primary} />}
            title="Manage Events"
            subtitle="Create and edit events"
            onPress={() => handleNavigation("/(tabs)/calendar")}
          />
          <AdminMenuItem
            icon={<Megaphone size={20} color={Colors.primary} />}
            title="Announcements"
            subtitle="Post organization announcements"
            onPress={() => handleNavigation("/(tabs)")}
          />
          <AdminMenuItem
            icon={<Music size={20} color={Colors.primary} />}
            title="Worship Songs"
            subtitle="Manage worship team content"
            onPress={() => handleNavigation("/(tabs)/worship/manage")}
            showBorder={false}
          />
        </View>

        {(isSuperAdmin || adminChurches.length > 0) && (
          <>
            <Text style={styles.sectionTitle}>Church Management</Text>
            <View style={styles.menuSection}>
              {adminChurches.map((church, index) => (
                <TouchableOpacity
                  key={church.id}
                  style={[
                    styles.churchItem,
                    index === adminChurches.length - 1 && !isSuperAdmin && styles.menuItemNoBorder,
                  ]}
                  onPress={() => router.push(`/church/${church.id}/settings` as any)}
                  activeOpacity={0.7}
                >
                  <View style={styles.churchIcon}>
                    {church.logo ? (
                      <View style={styles.churchLogoContainer}>
                        <Church size={20} color={Colors.primary} />
                      </View>
                    ) : (
                      <Church size={20} color={Colors.primary} />
                    )}
                  </View>
                  <View style={styles.menuContent}>
                    <Text style={styles.menuTitle}>{church.name}</Text>
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
                <AdminMenuItem
                  icon={<Plus size={20} color={Colors.primary} />}
                  title="Create New Church"
                  subtitle="Add a new church to the platform"
                  onPress={() => handleNavigation("/church/create")}
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
            <View style={styles.menuSection}>
              <AdminMenuItem
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
  },
  sendInviteButtonDisabled: {
    opacity: 0.5,
  },
  sendInviteButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.textInverse,
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  menuSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  menuItemNoBorder: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuIconDanger: {
    backgroundColor: Colors.error + "15",
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  menuTitleDanger: {
    color: Colors.error,
  },
  menuSubtitle: {
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
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary + "15",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: 12,
  },
  churchLogoContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
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
});
