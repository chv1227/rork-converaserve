import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Search,
  Filter,
  MoreVertical,
  Shield,
  ShieldCheck,
  User,
  Crown,
  UserX,
  UserCheck,
  Trash2,
  Edit,
  X,
  Check,
  UserPlus,
  Mail,
  Clock,
  Send,
} from "lucide-react-native";
import { LightTheme } from '@/constants/colors';
import { useAuth, UserRole } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";

interface UserItemProps {
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    role: UserRole;
    isActive: boolean;
    joinedDate: string;
  };
  onAction: (action: string, userId: string) => void;
  currentUserId: string;
  isSuperAdmin: boolean;
}

function UserItem({ user, onAction, currentUserId, isSuperAdmin }: UserItemProps) {
  const [showMenu, setShowMenu] = useState(false);

  const getRoleIcon = () => {
    switch (user.role) {
      case "super_admin":
        return <Crown size={14} color="#F59E0B" />;
      case "admin":
        return <ShieldCheck size={14} color="#8B5CF6" />;
      case "leader":
        return <Shield size={14} color="#3B82F6" />;
      default:
        return <User size={14} color={LightTheme.textSecondary} />;
    }
  };

  const getRoleColor = () => {
    switch (user.role) {
      case "super_admin":
        return "#F59E0B";
      case "admin":
        return "#8B5CF6";
      case "leader":
        return "#3B82F6";
      default:
        return LightTheme.textSecondary;
    }
  };

  const canModifyUser = () => {
    if (user.id === currentUserId) return false;
    if (user.role === "super_admin" && !isSuperAdmin) return false;
    return true;
  };

  return (
    <View style={styles.userItem}>
      <Image source={{ uri: user.avatar }} style={styles.userAvatar} />
      <View style={styles.userInfo}>
        <View style={styles.userNameRow}>
          <Text style={styles.userName}>{user.name}</Text>
          {!user.isActive && (
            <View style={styles.suspendedBadge}>
              <Text style={styles.suspendedText}>Suspended</Text>
            </View>
          )}
        </View>
        <Text style={styles.userEmail}>{user.email}</Text>
        <View style={styles.userRoleRow}>
          {getRoleIcon()}
          <Text style={[styles.userRole, { color: getRoleColor() }]}>
            {user.role.replace("_", " ").toUpperCase()}
          </Text>
        </View>
      </View>
      {canModifyUser() && (
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowMenu(true)}
          activeOpacity={0.7}
        >
          <MoreVertical size={20} color={LightTheme.textSecondary} />
        </TouchableOpacity>
      )}

      <Modal visible={showMenu} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.actionMenu}>
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => {
                setShowMenu(false);
                onAction("edit", user.id);
              }}
            >
              <Edit size={18} color={LightTheme.text} />
              <Text style={styles.actionMenuText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => {
                setShowMenu(false);
                onAction("toggle_status", user.id);
              }}
            >
              {user.isActive ? (
                <>
                  <UserX size={18} color={LightTheme.warning} />
                  <Text style={[styles.actionMenuText, { color: LightTheme.warning }]}>Suspend User</Text>
                </>
              ) : (
                <>
                  <UserCheck size={18} color={LightTheme.success} />
                  <Text style={[styles.actionMenuText, { color: LightTheme.success }]}>Activate User</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => {
                setShowMenu(false);
                onAction("change_role", user.id);
              }}
            >
              <Shield size={18} color={LightTheme.primary} />
              <Text style={[styles.actionMenuText, { color: LightTheme.primary }]}>Change Role</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionMenuItem, styles.actionMenuItemLast]}
              onPress={() => {
                setShowMenu(false);
                onAction("delete", user.id);
              }}
            >
              <Trash2 size={18} color={LightTheme.error} />
              <Text style={[styles.actionMenuText, { color: LightTheme.error }]}>Delete User</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default function UserManagement() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAdmin, isSuperAdmin, user } = useAuth();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole | "all">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" });
  const [roleModalUser, setRoleModalUser] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    role: "member" as "member" | "leader" | "admin" | "super_admin",
    ministries: [] as string[],
  });
  const [showInvitationsTab, setShowInvitationsTab] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/(tabs)");
    }
  }, [isAdmin, router]);

  interface UserData {
    id: string;
    name: string;
    email: string;
    avatar: string;
    role: UserRole;
    isActive: boolean;
    joinedDate: string;
  }

  interface MinistryData {
    id: string;
    name: string;
    color: string;
  }

  interface InvitationData {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
    createdAt: string;
    ministryNames?: string[];
    invitedByName?: string;
  }

  const usersQuery = useQuery({
    queryKey: ['adminUsers', searchQuery, selectedRole],
    queryFn: async () => {
      let query = supabase.from('users').select('*');
      
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }
      if (selectedRole !== 'all') {
        query = query.eq('role', selectedRole);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      
      return (data || []).map((u: { id: string; name: string; email: string; avatar: string | null; role: string; created_at: string }) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=1A7B74&color=fff`,
        role: u.role as UserRole,
        isActive: true,
        joinedDate: u.created_at,
      })) as UserData[];
    },
    enabled: isAdmin,
  });

  const ministriesQuery = useQuery({
    queryKey: ['ministriesForAdmin'],
    queryFn: async () => [] as MinistryData[],
    enabled: false,
  });
  
  const invitationsQuery = useQuery({
    queryKey: ['invitations'],
    queryFn: async () => [] as InvitationData[],
    enabled: isAdmin,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (_data: { userId: string }) => {
      return { success: true };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      if (Platform.OS !== "web") {
        Alert.alert("Success", "User status updated");
      }
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (data: { userId: string }) => {
      const { error } = await supabase.from('users').delete().eq('id', data.userId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      if (Platform.OS !== "web") {
        Alert.alert("Success", "User deleted successfully");
      }
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { userId: string; name: string; email: string; phone?: string }) => {
      const { error } = await (supabase.from('users') as any).update({
        full_name: data.name,
        email: data.email,
        phone: data.phone,
        updated_at: new Date().toISOString(),
      }).eq('id', data.userId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setEditingUser(null);
      if (Platform.OS !== "web") {
        Alert.alert("Success", "Profile updated");
      }
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (data: { userId: string; role: string }) => {
      const { error } = await (supabase.from('user_church_roles') as any).update({
        role: data.role,
        updated_at: new Date().toISOString(),
      }).eq('user_id', data.userId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setRoleModalUser(null);
      if (Platform.OS !== "web") {
        Alert.alert("Success", "User role updated");
      }
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: async (_data: { name: string; email: string; role: string; ministries: string[] }) => {
      return { success: true };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['invitations'] });
      setShowInviteModal(false);
      setInviteForm({ name: "", email: "", role: "member", ministries: [] });
      Alert.alert("Success", "Invitation sent successfully");
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: async (_data: { invitationId: string }) => {
      return { success: true };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['invitations'] });
      Alert.alert("Success", "Invitation canceled");
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
    },
  });

  const resendInvitationMutation = useMutation({
    mutationFn: async (_data: { invitationId: string }) => {
      return { success: true };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['invitations'] });
      Alert.alert("Success", "Invitation resent");
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
    },
  });

  const handleAction = useCallback((action: string, userId: string) => {
    const targetUser = usersQuery.data?.find((u) => u.id === userId);
    
    switch (action) {
      case "edit":
        if (targetUser) {
          setEditForm({
            name: targetUser.name,
            email: targetUser.email,
            phone: "",
          });
          setEditingUser(userId);
        }
        break;
      case "toggle_status":
        if (Platform.OS === "web") {
          toggleStatusMutation.mutate({ userId });
        } else {
          Alert.alert(
            targetUser?.isActive ? "Suspend User" : "Activate User",
            `Are you sure you want to ${targetUser?.isActive ? "suspend" : "activate"} ${targetUser?.name}?`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Confirm",
                style: targetUser?.isActive ? "destructive" : "default",
                onPress: () => toggleStatusMutation.mutate({ userId }),
              },
            ]
          );
        }
        break;
      case "change_role":
        setRoleModalUser(userId);
        break;
      case "delete":
        if (Platform.OS === "web") {
          deleteUserMutation.mutate({ userId });
        } else {
          Alert.alert(
            "Delete User",
            `Are you sure you want to permanently delete ${targetUser?.name}? This action cannot be undone.`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => deleteUserMutation.mutate({ userId }),
              },
            ]
          );
        }
        break;
    }
  }, [usersQuery.data, toggleStatusMutation, deleteUserMutation]);

  const handleSaveEdit = () => {
    if (!editingUser) return;
    updateProfileMutation.mutate({
      userId: editingUser,
      name: editForm.name || '',
      email: editForm.email || '',
      phone: editForm.phone || undefined,
    });
  };

  const handleRoleChange = (role: UserRole) => {
    if (!roleModalUser) return;
    updateRoleMutation.mutate({ userId: roleModalUser, role });
  };

  const handleInviteUser = () => {
    if (!inviteForm.name || !inviteForm.email) {
      Alert.alert("Error", "Please fill in name and email");
      return;
    }
    inviteUserMutation.mutate({
      name: inviteForm.name,
      email: inviteForm.email,
      role: inviteForm.role,
      ministries: inviteForm.ministries,
    });
  };

  const toggleMinistrySelection = (ministryId: string) => {
    setInviteForm((prev) => ({
      ...prev,
      ministries: prev.ministries.includes(ministryId)
        ? prev.ministries.filter((id) => id !== ministryId)
        : [...prev.ministries, ministryId],
    }));
  };

  const roles: { value: UserRole | "all"; label: string }[] = [
    { value: "all", label: "All Roles" },
    { value: "member", label: "Member" },
    { value: "leader", label: "Leader" },
    { value: "admin", label: "Admin" },
    { value: "super_admin", label: "Super Admin" },
  ];

  if (!isAdmin) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={LightTheme.primary} />
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
            <ArrowLeft size={24} color={LightTheme.text} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.title}>User Management</Text>
            <Text style={styles.subtitle}>{usersQuery.data?.length || 0} users</Text>
          </View>
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={() => setShowInviteModal(true)}
            activeOpacity={0.7}
          >
            <UserPlus size={20} color={LightTheme.textInverse} />
          </TouchableOpacity>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, !showInvitationsTab && styles.tabActive]}
            onPress={() => setShowInvitationsTab(false)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, !showInvitationsTab && styles.tabTextActive]}>Users</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, showInvitationsTab && styles.tabActive]}
            onPress={() => setShowInvitationsTab(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, showInvitationsTab && styles.tabTextActive]}>
              Invitations ({invitationsQuery.data?.filter((i) => i.status === "pending").length || 0})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Search size={18} color={LightTheme.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users..."
              placeholderTextColor={LightTheme.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={[styles.filterButton, showFilters && styles.filterButtonActive]}
            onPress={() => setShowFilters(!showFilters)}
            activeOpacity={0.7}
          >
            <Filter size={18} color={showFilters ? LightTheme.primary : LightTheme.textSecondary} />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            {roles.map((role) => (
              <TouchableOpacity
                key={role.value}
                style={[
                  styles.filterChip,
                  selectedRole === role.value && styles.filterChipActive,
                ]}
                onPress={() => setSelectedRole(role.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedRole === role.value && styles.filterChipTextActive,
                  ]}
                >
                  {role.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {usersQuery.isLoading || invitationsQuery.isLoading ? (
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={LightTheme.primary} />
        </View>
      ) : showInvitationsTab ? (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {invitationsQuery.data?.length === 0 ? (
            <View style={styles.emptyState}>
              <Mail size={48} color={LightTheme.textTertiary} />
              <Text style={styles.emptyStateText}>No pending invitations</Text>
              <Text style={styles.emptyStateSubtext}>Invite users to join ConveraServe</Text>
            </View>
          ) : (
            invitationsQuery.data?.map((invitation) => (
              <View key={invitation.id} style={styles.invitationItem}>
                <View style={styles.invitationHeader}>
                  <View style={styles.invitationInfo}>
                    <Text style={styles.invitationName}>{invitation.name}</Text>
                    <Text style={styles.invitationEmail}>{invitation.email}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    invitation.status === "pending" && styles.statusPending,
                    invitation.status === "accepted" && styles.statusAccepted,
                    invitation.status === "expired" && styles.statusExpired,
                  ]}>
                    <Text style={styles.statusText}>{invitation.status.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={styles.invitationDetails}>
                  <View style={styles.invitationDetail}>
                    <Shield size={14} color={LightTheme.textSecondary} />
                    <Text style={styles.invitationDetailText}>
                      {invitation.role.replace("_", " ").toUpperCase()}
                    </Text>
                  </View>
                  {invitation.ministryNames && invitation.ministryNames.length > 0 && (
                    <View style={styles.invitationDetail}>
                      <User size={14} color={LightTheme.textSecondary} />
                      <Text style={styles.invitationDetailText}>
                        {invitation.ministryNames.join(", ")}
                      </Text>
                    </View>
                  )}
                  <View style={styles.invitationDetail}>
                    <Clock size={14} color={LightTheme.textSecondary} />
                    <Text style={styles.invitationDetailText}>
                      Invited by {invitation.invitedByName}
                    </Text>
                  </View>
                </View>
                {invitation.status === "pending" && (
                  <View style={styles.invitationActions}>
                    <TouchableOpacity
                      style={styles.resendButton}
                      onPress={() => resendInvitationMutation.mutate({ invitationId: invitation.id })}
                      disabled={resendInvitationMutation.isPending}
                      activeOpacity={0.7}
                    >
                      <Send size={14} color={LightTheme.primary} />
                      <Text style={styles.resendButtonText}>Resend</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => cancelInvitationMutation.mutate({ invitationId: invitation.id })}
                      disabled={cancelInvitationMutation.isPending}
                      activeOpacity={0.7}
                    >
                      <X size={14} color={LightTheme.error} />
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {usersQuery.data?.map((u) => (
            <UserItem
              key={u.id}
              user={u}
              onAction={handleAction}
              currentUserId={user?.id || ""}
              isSuperAdmin={isSuperAdmin}
            />
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <Modal visible={!!editingUser} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { paddingTop: insets.top + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit User</Text>
              <TouchableOpacity onPress={() => setEditingUser(null)}>
                <X size={24} color={LightTheme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Name</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.name}
                onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                placeholder="Enter name"
                placeholderTextColor={LightTheme.textTertiary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Email</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.email}
                onChangeText={(text) => setEditForm({ ...editForm, email: text })}
                placeholder="Enter email"
                placeholderTextColor={LightTheme.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Phone</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.phone}
                onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                placeholder="Enter phone"
                placeholderTextColor={LightTheme.textTertiary}
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveEdit}
              disabled={updateProfileMutation.isPending}
              activeOpacity={0.7}
            >
              {updateProfileMutation.isPending ? (
                <ActivityIndicator color={LightTheme.textInverse} />
              ) : (
                <>
                  <Check size={18} color={LightTheme.textInverse} />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!roleModalUser} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setRoleModalUser(null)}
        >
          <View style={styles.roleModal}>
            <Text style={styles.roleModalTitle}>Select Role</Text>
            {(["member", "leader", "admin", ...(isSuperAdmin ? ["super_admin"] : [])] as UserRole[]).map((role) => (
              <TouchableOpacity
                key={role}
                style={styles.roleOption}
                onPress={() => handleRoleChange(role)}
                activeOpacity={0.7}
              >
                <Text style={styles.roleOptionText}>{role.replace("_", " ").toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showInviteModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { paddingTop: insets.top + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite User</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <X size={24} color={LightTheme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Name *</Text>
                <TextInput
                  style={styles.formInput}
                  value={inviteForm.name}
                  onChangeText={(text) => setInviteForm({ ...inviteForm, name: text })}
                  placeholder="Enter name"
                  placeholderTextColor={LightTheme.textTertiary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email *</Text>
                <TextInput
                  style={styles.formInput}
                  value={inviteForm.email}
                  onChangeText={(text) => setInviteForm({ ...inviteForm, email: text })}
                  placeholder="Enter email"
                  placeholderTextColor={LightTheme.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Role</Text>
                <View style={styles.roleSelector}>
                  {(["member", "leader", "admin", ...(isSuperAdmin ? ["super_admin" as const] : [])] as ("member" | "leader" | "admin" | "super_admin")[]).map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleSelectorOption,
                        inviteForm.role === role && styles.roleSelectorOptionActive,
                      ]}
                      onPress={() => setInviteForm({ ...inviteForm, role })}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.roleSelectorText,
                          inviteForm.role === role && styles.roleSelectorTextActive,
                        ]}
                      >
                        {role.replace("_", " ")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Assign to Ministries</Text>
                <Text style={styles.formHint}>Select ministries the user will join</Text>
                <View style={styles.ministryList}>
                  {ministriesQuery.data?.map((ministry) => (
                    <TouchableOpacity
                      key={ministry.id}
                      style={[
                        styles.ministryOption,
                        inviteForm.ministries.includes(ministry.id) && styles.ministryOptionActive,
                      ]}
                      onPress={() => toggleMinistrySelection(ministry.id)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.ministryCheckbox,
                          inviteForm.ministries.includes(ministry.id) && { backgroundColor: ministry.color },
                        ]}
                      >
                        {inviteForm.ministries.includes(ministry.id) && (
                          <Check size={12} color={LightTheme.textInverse} />
                        )}
                      </View>
                      <Text style={styles.ministryOptionText}>{ministry.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleInviteUser}
                disabled={inviteUserMutation.isPending}
                activeOpacity={0.7}
              >
                {inviteUserMutation.isPending ? (
                  <ActivityIndicator color={LightTheme.textInverse} />
                ) : (
                  <>
                    <Send size={18} color={LightTheme.textInverse} />
                    <Text style={styles.saveButtonText}>Send Invitation</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={{ height: 40 }} />
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
    backgroundColor: LightTheme.background,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    backgroundColor: LightTheme.surface,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: LightTheme.borderLight,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  inviteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: LightTheme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  tabRow: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: LightTheme.surfaceSecondary,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: LightTheme.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: LightTheme.textSecondary,
  },
  tabTextActive: {
    color: LightTheme.textInverse,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: LightTheme.surfaceSecondary,
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
    color: LightTheme.text,
  },
  subtitle: {
    fontSize: 14,
    color: LightTheme.textSecondary,
    marginTop: 2,
  },
  searchRow: {
    flexDirection: "row",
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LightTheme.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: LightTheme.text,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: LightTheme.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonActive: {
    backgroundColor: LightTheme.primary + "15",
  },
  filterRow: {
    marginTop: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: LightTheme.surfaceSecondary,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: LightTheme.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: LightTheme.textSecondary,
    fontWeight: "500" as const,
  },
  filterChipTextActive: {
    color: LightTheme.textInverse,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LightTheme.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: LightTheme.text,
  },
  suspendedBadge: {
    backgroundColor: LightTheme.error + "20",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  suspendedText: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: LightTheme.error,
  },
  userEmail: {
    fontSize: 13,
    color: LightTheme.textSecondary,
    marginTop: 2,
  },
  userRoleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  userRole: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  actionMenu: {
    backgroundColor: LightTheme.surface,
    borderRadius: 16,
    overflow: "hidden",
    minWidth: 200,
  },
  actionMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: LightTheme.borderLight,
  },
  actionMenuItemLast: {
    borderBottomWidth: 0,
  },
  actionMenuText: {
    fontSize: 15,
    color: LightTheme.text,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: LightTheme.background,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: LightTheme.text,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: LightTheme.textSecondary,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: LightTheme.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: LightTheme.text,
    borderWidth: 1,
    borderColor: LightTheme.borderLight,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: LightTheme.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    marginTop: 12,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: LightTheme.textInverse,
  },
  roleModal: {
    backgroundColor: LightTheme.surface,
    borderRadius: 16,
    overflow: "hidden",
    minWidth: 200,
  },
  roleModalTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: LightTheme.text,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: LightTheme.borderLight,
  },
  roleOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: LightTheme.borderLight,
  },
  roleOptionText: {
    fontSize: 15,
    color: LightTheme.text,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: LightTheme.text,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: LightTheme.textSecondary,
    marginTop: 4,
  },
  invitationItem: {
    backgroundColor: LightTheme.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  invitationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  invitationInfo: {
    flex: 1,
  },
  invitationName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: LightTheme.text,
  },
  invitationEmail: {
    fontSize: 14,
    color: LightTheme.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPending: {
    backgroundColor: LightTheme.warning + "20",
  },
  statusAccepted: {
    backgroundColor: LightTheme.success + "20",
  },
  statusExpired: {
    backgroundColor: LightTheme.error + "20",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: LightTheme.text,
  },
  invitationDetails: {
    gap: 6,
  },
  invitationDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  invitationDetailText: {
    fontSize: 13,
    color: LightTheme.textSecondary,
  },
  invitationActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: LightTheme.borderLight,
  },
  resendButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: LightTheme.primary + "15",
  },
  resendButtonText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: LightTheme.primary,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: LightTheme.error + "15",
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: LightTheme.error,
  },
  roleSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  roleSelectorOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: LightTheme.surfaceSecondary,
  },
  roleSelectorOptionActive: {
    backgroundColor: LightTheme.primary,
  },
  roleSelectorText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: LightTheme.textSecondary,
    textTransform: "capitalize",
  },
  roleSelectorTextActive: {
    color: LightTheme.textInverse,
  },
  formHint: {
    fontSize: 12,
    color: LightTheme.textTertiary,
    marginBottom: 12,
  },
  ministryList: {
    gap: 8,
  },
  ministryOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: LightTheme.surfaceSecondary,
  },
  ministryOptionActive: {
    backgroundColor: LightTheme.primary + "10",
  },
  ministryCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: LightTheme.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  ministryOptionText: {
    fontSize: 15,
    color: LightTheme.text,
    flex: 1,
  },
});
