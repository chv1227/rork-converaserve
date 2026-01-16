import React, { useState, useCallback } from 'react';
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
  TextInput,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import {
  ArrowLeft,
  Users,
  Shield,
  Settings,
  Crown,
  ChevronRight,
  Check,
  X,
  UserMinus,
  Search,
  UserPlus,
  Building2,
  Edit3,
  Palette,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import {
  getOrganizationMembers,
  getPendingRequests,
  updateMemberRole,
  approveMemberRequest,
  rejectMemberRequest,
  removeMember,
  OrganizationMember,
  OrganizationMembership,
} from '@/lib/supabase-organizations';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';
import { Ministry } from '@/types';
import { getMinistryColor } from '@/constants/ministryColors';

type TabType = 'members' | 'ministries' | 'settings';
type RoleType = OrganizationMembership['role'];

const ROLE_LABELS: Record<RoleType, string> = {
  super_admin: 'Super Admin',
  organization_admin: 'Admin',
  leader: 'Leader',
  member: 'Member',
};

const ROLE_COLORS: Record<RoleType, string> = {
  super_admin: '#7C3AED',
  organization_admin: Colors.warning,
  leader: Colors.secondary,
  member: Colors.primary,
};

export default function ChurchManagementScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentOrganization, user, isSuperAdmin, isOrganizationSuperAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);

  const orgId = currentOrganization?.id || '';
  const canManage = isSuperAdmin || isOrganizationSuperAdmin;

  const membersQuery = useQuery({
    queryKey: ['organization-members', orgId],
    queryFn: () => getOrganizationMembers(orgId),
    enabled: !!orgId && canManage,
  });

  const pendingQuery = useQuery({
    queryKey: ['pending-requests', orgId],
    queryFn: () => getPendingRequests(orgId),
    enabled: !!orgId && canManage,
  });

  const ministriesQuery = trpc.ministries.list.useQuery({
    organizationId: orgId,
  });

  const approveMutation = useMutation({
    mutationFn: ({ membershipId }: { membershipId: string }) =>
      approveMemberRequest(orgId, membershipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-requests', orgId] });
      queryClient.invalidateQueries({ queryKey: ['organization-members', orgId] });
      if (Platform.OS !== 'web') {
        Alert.alert('Success', 'Member request approved');
      }
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ membershipId }: { membershipId: string }) =>
      rejectMemberRequest(orgId, membershipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-requests', orgId] });
      if (Platform.OS !== 'web') {
        Alert.alert('Success', 'Member request rejected');
      }
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ membershipId, newRole }: { membershipId: string; newRole: RoleType }) =>
      updateMemberRole(orgId, membershipId, newRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members', orgId] });
      setShowRoleModal(false);
      setSelectedMember(null);
      if (Platform.OS !== 'web') {
        Alert.alert('Success', 'Member role updated');
      }
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: ({ membershipId }: { membershipId: string }) =>
      removeMember(orgId, membershipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members', orgId] });
      if (Platform.OS !== 'web') {
        Alert.alert('Success', 'Member removed');
      }
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  const { refetch: refetchMembers } = membersQuery;
  const { refetch: refetchPending } = pendingQuery;
  const { refetch: refetchMinistries } = ministriesQuery;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchMembers(),
      refetchPending(),
      refetchMinistries(),
    ]);
    setRefreshing(false);
  }, [refetchMembers, refetchPending, refetchMinistries]);

  const handleApprove = (membershipId: string) => {
    if (Platform.OS === 'web') {
      approveMutation.mutate({ membershipId });
    } else {
      Alert.alert('Approve Request', 'Are you sure you want to approve this member?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => approveMutation.mutate({ membershipId }) },
      ]);
    }
  };

  const handleReject = (membershipId: string) => {
    if (Platform.OS === 'web') {
      rejectMutation.mutate({ membershipId });
    } else {
      Alert.alert('Reject Request', 'Are you sure you want to reject this request?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: () => rejectMutation.mutate({ membershipId }) },
      ]);
    }
  };

  const handleRemove = (member: OrganizationMember) => {
    if (member.userId === user?.id) {
      Alert.alert('Error', 'You cannot remove yourself');
      return;
    }
    if (Platform.OS === 'web') {
      if (confirm(`Remove ${member.name} from the organization?`)) {
        removeMutation.mutate({ membershipId: member.id });
      }
    } else {
      Alert.alert('Remove Member', `Are you sure you want to remove ${member.name}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeMutation.mutate({ membershipId: member.id }) },
      ]);
    }
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
    updateRoleMutation.mutate({ membershipId: selectedMember.id, newRole: role });
  };

  const members = membersQuery.data || [];
  const pendingRequests = pendingQuery.data || [];
  const ministries = ministriesQuery.data || [];

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!canManage) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Church Management</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Shield size={64} color={Colors.textTertiary} />
          <Text style={styles.errorTitle}>Access Restricted</Text>
          <Text style={styles.errorText}>Only Super Admins can access Church Management</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentOrganization) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Church Management</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Building2 size={64} color={Colors.textTertiary} />
          <Text style={styles.errorTitle}>No Church Selected</Text>
          <Text style={styles.errorText}>Please select a church first</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => router.push('/organization')}>
            <Text style={styles.errorButtonText}>Select Church</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderMembersTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.searchContainer}>
        <Search size={20} color={Colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search members..."
          placeholderTextColor={Colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {pendingRequests.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <UserPlus size={18} color={Colors.warning} />
            <Text style={styles.sectionTitle}>Pending Requests ({pendingRequests.length})</Text>
          </View>
          <View style={styles.membersList}>
            {pendingRequests.map((request) => (
              <View key={request.id} style={styles.memberCard}>
                <Image
                  source={{ uri: request.avatar }}
                  style={styles.memberAvatar}
                  contentFit="cover"
                />
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{request.name}</Text>
                  <Text style={styles.memberEmail}>{request.email}</Text>
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
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Users size={18} color={Colors.primary} />
          <Text style={styles.sectionTitle}>All Members ({filteredMembers.length})</Text>
        </View>
        {membersQuery.isLoading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
        ) : filteredMembers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No members match your search' : 'No members yet'}
            </Text>
          </View>
        ) : (
          <View style={styles.membersList}>
            {filteredMembers.map((member) => (
              <View key={member.id} style={styles.memberCard}>
                <Image
                  source={{ uri: member.avatar }}
                  style={styles.memberAvatar}
                  contentFit="cover"
                />
                <View style={styles.memberInfo}>
                  <View style={styles.memberNameRow}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    {member.role === 'super_admin' && (
                      <Crown size={14} color="#7C3AED" />
                    )}
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[member.role] + '20' }]}>
                    <Text style={[styles.roleText, { color: ROLE_COLORS[member.role] }]}>
                      {ROLE_LABELS[member.role]}
                    </Text>
                  </View>
                </View>
                {member.userId !== user?.id && (
                  <View style={styles.memberActions}>
                    <TouchableOpacity
                      style={styles.memberActionButton}
                      onPress={() => handleRoleChange(member)}
                    >
                      <Shield size={18} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.memberActionButton, styles.dangerButton]}
                      onPress={() => handleRemove(member)}
                    >
                      <UserMinus size={18} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  const renderMinistriesTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Palette size={18} color="#8B5CF6" />
          <Text style={styles.sectionTitle}>Ministries ({ministries.length})</Text>
          <TouchableOpacity
            style={styles.addMinistriesButton}
            onPress={() => router.push('/admin/ministries')}
          >
            <Text style={styles.addMinistriesButtonText}>Manage All</Text>
            <ChevronRight size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {ministriesQuery.isLoading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
        ) : ministries.length === 0 ? (
          <View style={styles.emptyState}>
            <Shield size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Ministries</Text>
            <Text style={styles.emptyText}>Create your first ministry to get started</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/admin/ministries')}
            >
              <Text style={styles.createButtonText}>Create Ministry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.ministriesList}>
            {ministries.map((ministry: Ministry) => {
              const color = ministry.color || getMinistryColor(ministry.name, ministry.id);
              return (
                <TouchableOpacity
                  key={ministry.id}
                  style={styles.ministryCard}
                  onPress={() => router.push('/admin/ministries')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.ministryColor, { backgroundColor: color }]} />
                  <View style={styles.ministryInfo}>
                    <Text style={styles.ministryName}>{ministry.name}</Text>
                    <Text style={styles.ministryDescription} numberOfLines={1}>
                      {ministry.description}
                    </Text>
                    <Text style={styles.ministryMembers}>
                      {ministry.memberCount} members
                    </Text>
                  </View>
                  <ChevronRight size={18} color={Colors.textTertiary} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );

  const renderSettingsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.orgInfoCard}>
        <Image
          source={{ uri: currentOrganization.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentOrganization.name)}&background=1A7B74&color=fff` }}
          style={styles.orgLogo}
          contentFit="cover"
        />
        <View style={styles.orgDetails}>
          <Text style={styles.orgName}>{currentOrganization.name}</Text>
          <Text style={styles.orgDescription} numberOfLines={2}>
            {currentOrganization.description}
          </Text>
        </View>
      </View>

      <View style={styles.settingsSection}>
        <TouchableOpacity
          style={styles.settingsItem}
          onPress={() => router.push('/organization/edit')}
          activeOpacity={0.7}
        >
          <View style={[styles.settingsIcon, { backgroundColor: Colors.primary + '15' }]}>
            <Edit3 size={20} color={Colors.primary} />
          </View>
          <View style={styles.settingsContent}>
            <Text style={styles.settingsTitle}>Edit Church Profile</Text>
            <Text style={styles.settingsSubtitle}>Update name, description, and logo</Text>
          </View>
          <ChevronRight size={18} color={Colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingsItem}
          onPress={() => router.push('/settings')}
          activeOpacity={0.7}
        >
          <View style={[styles.settingsIcon, { backgroundColor: Colors.warning + '15' }]}>
            <Settings size={20} color={Colors.warning} />
          </View>
          <View style={styles.settingsContent}>
            <Text style={styles.settingsTitle}>Advanced Settings</Text>
            <Text style={styles.settingsSubtitle}>Configure organization settings</Text>
          </View>
          <ChevronRight size={18} color={Colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingsItem}
          onPress={() => router.push('/admin')}
          activeOpacity={0.7}
        >
          <View style={[styles.settingsIcon, { backgroundColor: '#7C3AED' + '15' }]}>
            <Shield size={20} color="#7C3AED" />
          </View>
          <View style={styles.settingsContent}>
            <Text style={styles.settingsTitle}>Admin Dashboard</Text>
            <Text style={styles.settingsSubtitle}>View statistics and manage app</Text>
          </View>
          <ChevronRight size={18} color={Colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsSection}>
        <Text style={styles.statsSectionTitle}>Quick Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{members.length}</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{ministries.length}</Text>
            <Text style={styles.statLabel}>Ministries</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{pendingRequests.length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Church Management</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'members' && styles.activeTab]}
          onPress={() => setActiveTab('members')}
        >
          <Users size={18} color={activeTab === 'members' ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'members' && styles.activeTabText]}>
            Members
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ministries' && styles.activeTab]}
          onPress={() => setActiveTab('ministries')}
        >
          <Shield size={18} color={activeTab === 'ministries' ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'ministries' && styles.activeTabText]}>
            Ministries
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
          onPress={() => setActiveTab('settings')}
        >
          <Settings size={18} color={activeTab === 'settings' ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'members' && renderMembersTab()}
        {activeTab === 'ministries' && renderMinistriesTab()}
        {activeTab === 'settings' && renderSettingsTab()}

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
                <X size={24} color={Colors.text} />
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
                    <Check size={20} color={Colors.primary} />
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
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  placeholder: {
    width: 44,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  tabContent: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  addMinistriesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addMinistriesButtonText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.primary,
  },
  membersList: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  memberEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  memberActionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButton: {
    backgroundColor: Colors.error + '15',
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    paddingVertical: 40,
  },
  emptyState: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  createButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  ministriesList: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  ministryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  ministryColor: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  ministryInfo: {
    flex: 1,
    marginLeft: 12,
  },
  ministryName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  ministryDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  ministryMembers: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  orgInfoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  orgLogo: {
    width: 60,
    height: 60,
    borderRadius: 14,
  },
  orgDetails: {
    flex: 1,
    marginLeft: 14,
  },
  orgName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  orgDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  settingsSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsContent: {
    flex: 1,
    marginLeft: 12,
  },
  settingsTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  settingsSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statsSection: {
    marginTop: 4,
  },
  statsSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: 4,
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
    color: Colors.text,
    marginTop: 16,
  },
  errorText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  errorButton: {
    marginTop: 24,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  errorButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
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
    color: Colors.text,
  },
  modalClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedMemberInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  selectedMemberAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 12,
  },
  selectedMemberName: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  roleOptions: {
    gap: 10,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleOptionSelected: {
    borderColor: Colors.primary,
  },
  roleOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleOptionContent: {
    flex: 1,
    marginLeft: 12,
  },
  roleOptionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  roleOptionDescription: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
