import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Building2,
  Users,
  UserPlus,
  Settings,
  Shield,
  Crown,
  ChevronRight,
  Check,
  X,
  UserMinus,
  Edit3,
} from 'lucide-react-native';
import { LightTheme } from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OrganizationRole } from '@/types';
import { supabase } from '@/lib/supabase';

interface OrganizationMember {
  id: string;
  oderId?: string;
  userId?: string;
  name: string;
  email: string;
  avatar?: string;
  role: OrganizationRole;
  joinedAt: string;
  isActive: boolean;
}

interface OrganizationMembership {
  role: 'member' | 'leader' | 'organization_admin' | 'super_admin';
}

type RoleType = OrganizationMembership['role'];

const ROLE_LABELS: Record<RoleType, string> = {
  super_admin: 'Super Admin',
  organization_admin: 'Admin',
  leader: 'Leader',
  member: 'Member',
};

const ROLE_COLORS: Record<RoleType, string> = {
  super_admin: LightTheme.error,
  organization_admin: LightTheme.warning,
  leader: LightTheme.secondary,
  member: LightTheme.primary,
};

export default function OrganizationAdminScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentOrganization, user } = useAuth();
  
  const [canManage, setCanManage] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const orgId = currentOrganization?.id || '';

  const membershipQuery = useQuery({
    queryKey: ['org-membership', orgId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_church_roles')
        .select('*')
        .eq('church_id', orgId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      if (error) { console.log('Membership query error:', error.message); return null; }
      const row = data as any;
      const mappedRole = row.role === 'owner' ? 'super_admin' : row.role === 'admin' ? 'organization_admin' : row.role;
      return { id: row.id, role: mappedRole as RoleType };
    },
    enabled: !!orgId && !!user?.id,
  });

  useEffect(() => {
    if (!orgId) {
      setCheckingPermission(false);
      return;
    }

    if (membershipQuery.isLoading) return;

    const membership = membershipQuery.data;
    const hasPermission = membership && 
      (membership.role === 'super_admin' || membership.role === 'organization_admin');
    setCanManage(hasPermission ?? false);
    setIsSuperAdmin(membership?.role === 'super_admin');
    setCheckingPermission(false);
  }, [orgId, membershipQuery.data, membershipQuery.isLoading]);

  const membersQuery = useQuery({
    queryKey: ['org-members', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_church_roles')
        .select('id, user_id, role, is_active, created_at')
        .eq('church_id', orgId)
        .eq('is_active', true);
      if (error) { console.log('Members query error:', error.message); return []; }
      const members: OrganizationMember[] = [];
      const rows = (data || []) as { id: string; user_id: string; role: string; is_active: boolean; created_at: string }[];
      for (const m of rows) {
        const { data: u } = await supabase.from('users').select('full_name, email, avatar_url').eq('id', m.user_id).single();
        const usr = u as { full_name: string | null; email: string; avatar_url: string | null } | null;
        const mappedRole = m.role === 'owner' ? 'super_admin' : m.role === 'admin' ? 'organization_admin' : m.role;
        members.push({
          id: m.id,
          userId: m.user_id,
          name: usr?.full_name || usr?.email || 'Unknown',
          email: usr?.email || '',
          avatar: usr?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(usr?.full_name || 'U')}&background=1A7B74&color=fff`,
          role: mappedRole as OrganizationRole,
          joinedAt: m.created_at,
          isActive: m.is_active,
        });
      }
      return members;
    },
    enabled: !!orgId && canManage,
  });

  const pendingQuery = useQuery({
    queryKey: ['org-pending', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_church_roles')
        .select('id, user_id, created_at')
        .eq('church_id', orgId)
        .eq('is_active', false);
      if (error) { console.log('Pending query error:', error.message); return []; }
      const requests: { id: string; requesterName: string; requesterEmail: string; requesterAvatar: string }[] = [];
      const rows = (data || []) as { id: string; user_id: string; created_at: string }[];
      for (const m of rows) {
        const { data: u } = await supabase.from('users').select('full_name, email, avatar_url').eq('id', m.user_id).single();
        const usr = u as { full_name: string | null; email: string; avatar_url: string | null } | null;
        requests.push({
          id: m.id,
          requesterName: usr?.full_name || usr?.email || 'Unknown',
          requesterEmail: usr?.email || '',
          requesterAvatar: usr?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(usr?.full_name || 'U')}&background=1A7B74&color=fff`,
        });
      }
      return requests;
    },
    enabled: !!orgId && canManage,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      const { error } = await (supabase
        .from('user_church_roles') as any)
        .update({ is_active: true, role: 'member', updated_at: new Date().toISOString() })
        .eq('id', requestId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-pending', orgId] });
      queryClient.invalidateQueries({ queryKey: ['org-members', orgId] });
      Alert.alert('Success', 'Member request approved');
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      const { error } = await supabase
        .from('user_church_roles')
        .delete()
        .eq('id', requestId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-pending', orgId] });
      Alert.alert('Success', 'Member request rejected');
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ membershipId, role }: { membershipId: string; role: string }) => {
      const churchRole = role === 'super_admin' ? 'owner' : role === 'organization_admin' ? 'admin' : role;
      const { error } = await (supabase
        .from('user_church_roles') as any)
        .update({ role: churchRole, updated_at: new Date().toISOString() })
        .eq('id', membershipId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members', orgId] });
      setShowRoleModal(false);
      setSelectedMember(null);
      Alert.alert('Success', 'Member role updated');
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async ({ membershipId }: { membershipId: string }) => {
      const { error } = await supabase
        .from('user_church_roles')
        .delete()
        .eq('id', membershipId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members', orgId] });
      Alert.alert('Success', 'Member removed');
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  const { refetch: refetchMembers } = membersQuery;
  const { refetch: refetchPending } = pendingQuery;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchMembers(),
      refetchPending(),
    ]);
    setRefreshing(false);
  }, [refetchMembers, refetchPending]);

  const handleApprove = (membershipId: string) => {
    Alert.alert('Approve Request', 'Are you sure you want to approve this member?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: () => approveMutation.mutate({ requestId: membershipId }) },
    ]);
  };

  const handleReject = (membershipId: string) => {
    Alert.alert('Reject Request', 'Are you sure you want to reject this request?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => rejectMutation.mutate({ requestId: membershipId }) },
    ]);
  };

  const handleRemove = (member: OrganizationMember) => {
    if (member.userId === user?.id) {
      Alert.alert('Error', 'You cannot remove yourself');
      return;
    }
    Alert.alert('Remove Member', `Are you sure you want to remove ${member.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeMutation.mutate({ membershipId: member.id }) },
    ]);
  };

  const handleRoleChange = (member: OrganizationMember) => {
    if (member.userId === user?.id) {
      Alert.alert('Error', 'You cannot change your own role');
      return;
    }
    setSelectedMember(member);
    setShowRoleModal(true);
  };

  const selectRole = (role: RoleType) => {
    if (!selectedMember) return;
    const validRole = role === 'leader' ? 'member' : role;
    updateRoleMutation.mutate({ membershipId: selectedMember.id, role: validRole as 'member' | 'organization_admin' | 'super_admin' });
  };

  const members = membersQuery.data || [];
  const pendingRequests = pendingQuery.data || [];

  if (checkingPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={LightTheme.primary} />
          <Text style={styles.loadingText}>Checking permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentOrganization) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={LightTheme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Church Admin</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Building2 size={64} color={LightTheme.textTertiary} />
          <Text style={styles.errorTitle}>No Church Selected</Text>
          <Text style={styles.errorText}>Please select a church first</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => router.push('/organization' as any)}
          >
            <Text style={styles.errorButtonText}>Select Church</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!canManage) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={LightTheme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Church Admin</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Shield size={64} color={LightTheme.textTertiary} />
          <Text style={styles.errorTitle}>Permission Denied</Text>
          <Text style={styles.errorText}>Only admins can access this panel</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={LightTheme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Church Admin</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push('/organization/edit' as any)}
        >
          <Edit3 size={20} color={LightTheme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.orgCard}>
          <Image
            source={{ uri: currentOrganization.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentOrganization.name)}&background=1A7B74&color=fff` }}
            style={styles.orgLogo}
            contentFit="cover"
          />
          <View style={styles.orgInfo}>
            <Text style={styles.orgName}>{currentOrganization.name}</Text>
            <Text style={styles.orgDescription} numberOfLines={2}>
              {currentOrganization.description}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Users size={24} color={LightTheme.primary} />
            <Text style={styles.statNumber}>{members.length}</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
          <View style={styles.statCard}>
            <UserPlus size={24} color={LightTheme.warning} />
            <Text style={styles.statNumber}>{pendingRequests.length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/organization/edit' as any)}
          >
            <View style={styles.actionIcon}>
              <Settings size={20} color={LightTheme.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Edit Church Profile</Text>
              <Text style={styles.actionSubtitle}>Update name, description, logo</Text>
            </View>
            <ChevronRight size={20} color={LightTheme.textTertiary} />
          </TouchableOpacity>
        </View>

        {pendingRequests.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Pending Requests</Text>
            <View style={styles.membersList}>
              {pendingRequests.map((request) => (
                <View key={request.id} style={styles.memberCard}>
                  <Image
                    source={{ uri: request.requesterAvatar }}
                    style={styles.memberAvatar}
                    contentFit="cover"
                  />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{request.requesterName}</Text>
                    <Text style={styles.memberEmail}>{request.requesterEmail}</Text>
                  </View>
                  <View style={styles.pendingActions}>
                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={() => handleApprove(request.id)}
                      disabled={approveMutation.isPending}
                    >
                      <Check size={18} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => handleReject(request.id)}
                      disabled={rejectMutation.isPending}
                    >
                      <X size={18} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Members ({members.length})</Text>
        <View style={styles.membersList}>
          {membersQuery.isLoading ? (
            <ActivityIndicator size="small" color={LightTheme.primary} />
          ) : members.length === 0 ? (
            <Text style={styles.emptyText}>No members yet</Text>
          ) : (
            members.map((member) => {
              const memberRole = (member.role in ROLE_COLORS ? member.role : 'member') as RoleType;
              return (
              <View key={member.id} style={styles.memberCard}>
                <Image
                  source={{ uri: member.avatar }}
                  style={styles.memberAvatar}
                  contentFit="cover"
                />
                <View style={styles.memberInfo}>
                  <View style={styles.memberNameRow}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    {memberRole === 'super_admin' && (
                      <Crown size={14} color={LightTheme.warning} />
                    )}
                  </View>
                  <View style={styles.memberRoleRow}>
                    <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[memberRole] + '20' }]}>
                      <Text style={[styles.roleText, { color: ROLE_COLORS[memberRole] }]}>
                        {ROLE_LABELS[memberRole]}
                      </Text>
                    </View>
                  </View>
                </View>
                {member.userId !== user?.id && isSuperAdmin && (
                  <View style={styles.memberActions}>
                    <TouchableOpacity
                      style={styles.memberActionButton}
                      onPress={() => handleRoleChange(member)}
                    >
                      <Shield size={18} color={LightTheme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.memberActionButton}
                      onPress={() => handleRemove(member)}
                    >
                      <UserMinus size={18} color={LightTheme.error} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              );
            })
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal
        visible={showRoleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRoleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Role</Text>
              <TouchableOpacity onPress={() => setShowRoleModal(false)} style={styles.modalClose}>
                <X size={24} color={LightTheme.text} />
              </TouchableOpacity>
            </View>

            {selectedMember && (
              <View style={styles.selectedMemberInfo}>
                <Image
                  source={{ uri: selectedMember.avatar }}
                  style={styles.selectedMemberAvatar}
                  contentFit="cover"
                />
                <Text style={styles.selectedMemberName}>{selectedMember.name}</Text>
              </View>
            )}

            <View style={styles.roleOptions}>
              {(['member', 'leader', 'organization_admin', 'super_admin'] as RoleType[]).map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleOption,
                    selectedMember?.role === role && styles.roleOptionSelected,
                  ]}
                  onPress={() => selectRole(role)}
                  disabled={updateRoleMutation.isPending}
                >
                  <View style={[styles.roleOptionIcon, { backgroundColor: ROLE_COLORS[role] + '20' }]}>
                    {role === 'super_admin' ? (
                      <Crown size={20} color={ROLE_COLORS[role]} />
                    ) : (
                      <Shield size={20} color={ROLE_COLORS[role]} />
                    )}
                  </View>
                  <View style={styles.roleOptionContent}>
                    <Text style={styles.roleOptionTitle}>{ROLE_LABELS[role]}</Text>
                    <Text style={styles.roleOptionDescription}>
                      {role === 'super_admin' && 'Full control over the organization'}
                      {role === 'organization_admin' && 'Can manage members and content'}
                      {role === 'leader' && 'Can create and manage groups'}
                      {role === 'member' && 'Basic membership access'}
                    </Text>
                  </View>
                  {selectedMember?.role === role && (
                    <Check size={20} color={LightTheme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LightTheme.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: LightTheme.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: LightTheme.border,
    backgroundColor: LightTheme.surface,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: LightTheme.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: LightTheme.text,
  },
  placeholder: {
    width: 44,
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: LightTheme.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  orgCard: {
    flexDirection: 'row',
    backgroundColor: LightTheme.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  orgLogo: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  orgInfo: {
    flex: 1,
    marginLeft: 16,
  },
  orgName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: LightTheme.text,
  },
  orgDescription: {
    fontSize: 14,
    color: LightTheme.textSecondary,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: LightTheme.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: LightTheme.text,
  },
  statLabel: {
    fontSize: 12,
    color: LightTheme.textSecondary,
    textTransform: 'uppercase',
  },
  quickActions: {
    backgroundColor: LightTheme.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: LightTheme.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: LightTheme.text,
  },
  actionSubtitle: {
    fontSize: 12,
    color: LightTheme.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: LightTheme.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  membersList: {
    backgroundColor: LightTheme.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: LightTheme.borderLight,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: LightTheme.text,
  },
  memberEmail: {
    fontSize: 13,
    color: LightTheme.textSecondary,
    marginTop: 2,
  },
  memberRoleRow: {
    marginTop: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  memberActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: LightTheme.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: LightTheme.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: LightTheme.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    padding: 24,
    textAlign: 'center',
    color: LightTheme.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: LightTheme.text,
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    color: LightTheme.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  errorButton: {
    marginTop: 24,
    backgroundColor: LightTheme.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: LightTheme.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: LightTheme.text,
  },
  modalClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: LightTheme.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedMemberInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  selectedMemberAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 12,
  },
  selectedMemberName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: LightTheme.text,
  },
  roleOptions: {
    gap: 12,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: LightTheme.surfaceSecondary,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleOptionSelected: {
    borderColor: LightTheme.primary,
  },
  roleOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleOptionContent: {
    flex: 1,
    marginLeft: 12,
  },
  roleOptionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: LightTheme.text,
  },
  roleOptionDescription: {
    fontSize: 12,
    color: LightTheme.textSecondary,
    marginTop: 2,
  },
});
