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
  Dimensions,
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
  Camera,
  MapPin,
  Phone,
  Mail,
  Globe,
  Bell,
  Database,
  Calendar,
  Megaphone,
  Music,
  UsersRound,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { Ministry, OrganizationRole } from '@/types';
import { getMinistryColor } from '@/constants/ministryColors';

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

type TabType = 'members' | 'ministries' | 'settings' | 'edit';
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

const LOGO_OPTIONS = [
  'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1519491050282-cf00c82424bd?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1548625149-fc4a29cf7092?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1473177104440-ffee2f376098?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1545296664-39db56ad95bd?w=200&h=200&fit=crop',
];

export default function ChurchManagementScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentOrganization, user, isSuperAdmin, isOrganizationSuperAdmin, isOrganizationAdmin, isAdmin, setCurrentOrganization, currentMembership } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);

  const [churchName, setChurchName] = useState('');
  const [churchDescription, setChurchDescription] = useState('');
  const [churchAddress, setChurchAddress] = useState('');
  const [churchPhone, setChurchPhone] = useState('');
  const [churchEmail, setChurchEmail] = useState('');
  const [churchWebsite, setChurchWebsite] = useState('');
  const [churchLogo, setChurchLogo] = useState('');
  const [showLogoPicker, setShowLogoPicker] = useState(false);

  React.useEffect(() => {
    if (currentOrganization) {
      setChurchName(currentOrganization.name || '');
      setChurchDescription(currentOrganization.description || '');
      setChurchAddress(currentOrganization.address || '');
      setChurchPhone(currentOrganization.phone || '');
      setChurchEmail(currentOrganization.email || '');
      setChurchWebsite(currentOrganization.website || '');
      setChurchLogo(currentOrganization.logo || '');
    }
  }, [currentOrganization]);

  const orgId = currentOrganization?.id || '';
  const canManage = isSuperAdmin || isOrganizationSuperAdmin || isOrganizationAdmin || isAdmin;

  const membersQuery = useQuery({
    queryKey: ['organization-members', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('user_church_roles')
        .select('*, users(id, full_name, email, avatar_url)')
        .eq('church_id', orgId)
        .eq('is_active', true);
      
      if (error) throw error;
      return (data || []).map((m: { id: string; user_id: string; role: string; created_at: string; users: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null }) => ({
        id: m.id,
        oderId: m.user_id,
        userId: m.user_id,
        name: m.users?.full_name || 'Unknown',
        email: m.users?.email || '',
        avatar: m.users?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.users?.full_name || 'U')}&background=1A7B74&color=fff`,
        role: m.role as OrganizationRole,
        joinedAt: m.created_at,
        isActive: true,
      })) as OrganizationMember[];
    },
    enabled: !!orgId && canManage,
  });

  const pendingQuery = useQuery({
    queryKey: ['organization-pending', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('user_church_roles')
        .select('*, users(id, full_name, email, avatar_url)')
        .eq('church_id', orgId)
        .eq('is_active', false);
      
      if (error) throw error;
      return (data || []).map((m: { id: string; user_id: string; users: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null }) => ({
        id: m.id,
        requesterId: m.user_id,
        requesterName: m.users?.full_name || 'Unknown',
        requesterEmail: m.users?.email || '',
        requesterAvatar: m.users?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.users?.full_name || 'U')}&background=1A7B74&color=fff`,
      }));
    },
    enabled: !!orgId && canManage,
  });

  const ministriesQuery = useQuery({
    queryKey: ['organization-ministries', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      console.log('ChurchManagement: Fetching ministries for org:', orgId);
      const { data, error } = await supabase
        .from('ministries')
        .select('*, ministry_members(id)')
        .eq('church_id', orgId)
        .in('status', ['active', 'inactive']);
      
      if (error) {
        console.error('ChurchManagement: Error fetching ministries:', error.message);
        throw error;
      }
      console.log('ChurchManagement: Found', (data || []).length, 'ministries');
      return (data || []).map((m: { id: string; name: string; description: string | null; color: string | null; icon: string | null; image_url: string | null; ministry_members: { id: string }[] | null }) => ({
        id: m.id,
        name: m.name,
        description: m.description || '',
        color: m.color,
        icon: m.icon,
        image: m.image_url,
        memberCount: m.ministry_members?.length || 0,
      })) as Ministry[];
    },
    enabled: !!orgId,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      const { error } = await (supabase
        .from('user_church_roles') as any)
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-pending', orgId] });
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
    mutationFn: async ({ requestId }: { requestId: string }) => {
      const { error } = await supabase
        .from('user_church_roles')
        .delete()
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-pending', orgId] });
      if (Platform.OS !== 'web') {
        Alert.alert('Success', 'Member request rejected');
      }
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
      if (error) throw error;
    },
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
    mutationFn: async ({ membershipId }: { membershipId: string }) => {
      const { error } = await supabase
        .from('user_church_roles')
        .delete()
        .eq('id', membershipId);
      if (error) throw error;
    },
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

  const updateChurchMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; description: string; address?: string; phone?: string; email?: string; website?: string; logo?: string }) => {
      console.log('ChurchManagement: Updating church:', data.id, data.name);
      const { data: updatedOrg, error } = await (supabase
        .from('churches') as any)
        .update({
          name: data.name,
          description: data.description,
          status: 'active',
          address_line1: data.address || null,
          contact_phone: data.phone || null,
          contact_email: data.email || null,
          website: data.website || null,
          logo_url: data.logo || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id)
        .select()
        .single();
      if (error) {
        console.error('ChurchManagement: Update error:', error.message);
        throw error;
      }
      const org = updatedOrg as any;
      return {
        id: org.id,
        name: org.name,
        description: org.description || '',
        logo: org.logo_url || undefined,
        address: org.address_line1 || undefined,
        phone: org.contact_phone || undefined,
        email: org.contact_email || undefined,
        website: org.website || undefined,
        createdAt: org.created_at,
        updatedAt: org.updated_at,
      } as typeof currentOrganization;
    },
    onSuccess: async (updatedOrg) => {
      console.log('Organization updated successfully:', updatedOrg?.name);
      if (updatedOrg) {
        await setCurrentOrganization(updatedOrg, currentMembership);
      }
      Alert.alert('Success', 'Church profile updated!');
    },
    onError: (error: Error) => {
      console.error('Update organization error:', error.message);
      Alert.alert('Error', error.message || 'Failed to update church profile');
    },
  });

  const handleSaveChurch = () => {
    if (!churchName.trim()) {
      Alert.alert('Error', 'Please enter a church name');
      return;
    }
    if (!churchDescription.trim() || churchDescription.length < 10) {
      Alert.alert('Error', 'Please enter a description (at least 10 characters)');
      return;
    }
    if (!currentOrganization) {
      Alert.alert('Error', 'No organization selected');
      return;
    }
    updateChurchMutation.mutate({
      id: currentOrganization.id,
      name: churchName.trim(),
      description: churchDescription.trim(),
      address: churchAddress.trim() || undefined,
      phone: churchPhone.trim() || undefined,
      email: churchEmail.trim() || undefined,
      website: churchWebsite.trim() || undefined,
      logo: churchLogo || undefined,
    });
  };

  const selectLogo = (url: string) => {
    setChurchLogo(url);
    setShowLogoPicker(false);
  };

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

  const handleApprove = (requestId: string) => {
    if (Platform.OS === 'web') {
      approveMutation.mutate({ requestId });
    } else {
      Alert.alert('Approve Request', 'Are you sure you want to approve this member?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => approveMutation.mutate({ requestId }) },
      ]);
    }
  };

  const handleReject = (requestId: string) => {
    if (Platform.OS === 'web') {
      rejectMutation.mutate({ requestId });
    } else {
      Alert.alert('Reject Request', 'Are you sure you want to reject this request?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: () => rejectMutation.mutate({ requestId }) },
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
    const validRole = role === 'leader' ? 'member' : role;
    updateRoleMutation.mutate({ membershipId: selectedMember.id, role: validRole as 'member' | 'organization_admin' | 'super_admin' });
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
          <TouchableOpacity style={styles.errorButton} onPress={() => router.push('/organization' as any)}>
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
                {member.oderId !== user?.id && (
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
            onPress={() => router.push('/admin/ministries' as any)}
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
              onPress={() => router.push('/admin/ministries' as any)}
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
                  onPress={() => router.push('/admin/ministries' as any)}
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

  const showComingSoon = (feature: string) => {
    if (Platform.OS === 'web') {
      console.log(`${feature} - Coming soon`);
    } else {
      Alert.alert('Coming Soon', `${feature} will be available in a future update.`);
    }
  };

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

      <Text style={styles.settingsSectionTitle}>Organization</Text>
      <View style={styles.settingsSection}>
        <TouchableOpacity
          style={styles.settingsItem}
          onPress={() => router.push('/organization' as any)}
          activeOpacity={0.7}
        >
          <View style={[styles.settingsIcon, { backgroundColor: Colors.primary + '15' }]}>
            <Building2 size={20} color={Colors.primary} />
          </View>
          <View style={styles.settingsContent}>
            <Text style={styles.settingsTitle}>{currentOrganization?.name || 'Current Organization'}</Text>
            <Text style={styles.settingsSubtitle}>Switch or manage organizations</Text>
          </View>
          <ChevronRight size={18} color={Colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingsItem}
          onPress={() => showComingSoon('General Settings')}
          activeOpacity={0.7}
        >
          <View style={[styles.settingsIcon, { backgroundColor: Colors.secondary + '15' }]}>
            <Settings size={20} color={Colors.secondary} />
          </View>
          <View style={styles.settingsContent}>
            <Text style={styles.settingsTitle}>General Settings</Text>
            <Text style={styles.settingsSubtitle}>Organization name, branding</Text>
          </View>
          <ChevronRight size={18} color={Colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingsItem}
          onPress={() => showComingSoon('Notification Settings')}
          activeOpacity={0.7}
        >
          <View style={[styles.settingsIcon, { backgroundColor: Colors.warning + '15' }]}>
            <Bell size={20} color={Colors.warning} />
          </View>
          <View style={styles.settingsContent}>
            <Text style={styles.settingsTitle}>Notification Settings</Text>
            <Text style={styles.settingsSubtitle}>Configure push notifications</Text>
          </View>
          <ChevronRight size={18} color={Colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingsItem, styles.settingsItemNoBorder]}
          onPress={() => showComingSoon('Data & Storage')}
          activeOpacity={0.7}
        >
          <View style={[styles.settingsIcon, { backgroundColor: '#7C3AED' + '15' }]}>
            <Database size={20} color="#7C3AED" />
          </View>
          <View style={styles.settingsContent}>
            <Text style={styles.settingsTitle}>Data & Storage</Text>
            <Text style={styles.settingsSubtitle}>Manage organization data</Text>
          </View>
          <ChevronRight size={18} color={Colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.settingsSectionTitle}>Church Settings</Text>
      <View style={styles.settingsSection}>
        <TouchableOpacity
          style={styles.settingsItem}
          onPress={() => setActiveTab('edit')}
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
          style={[styles.settingsItem, styles.settingsItemNoBorder]}
          onPress={() => router.push('/admin' as any)}
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

      <Text style={styles.settingsSectionTitle}>Content Management</Text>
      <View style={styles.settingsSection}>
        <TouchableOpacity
          style={styles.settingsItem}
          onPress={() => router.push('/admin/ministries' as any)}
          activeOpacity={0.7}
        >
          <View style={[styles.settingsIcon, { backgroundColor: Colors.primary + '15' }]}>
            <UsersRound size={20} color={Colors.primary} />
          </View>
          <View style={styles.settingsContent}>
            <Text style={styles.settingsTitle}>Manage Ministries</Text>
            <Text style={styles.settingsSubtitle}>View and manage ministries</Text>
          </View>
          <ChevronRight size={18} color={Colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingsItem}
          onPress={() => router.push('/(tabs)/calendar' as any)}
          activeOpacity={0.7}
        >
          <View style={[styles.settingsIcon, { backgroundColor: Colors.secondary + '15' }]}>
            <Calendar size={20} color={Colors.secondary} />
          </View>
          <View style={styles.settingsContent}>
            <Text style={styles.settingsTitle}>Manage Events</Text>
            <Text style={styles.settingsSubtitle}>Create and edit events</Text>
          </View>
          <ChevronRight size={18} color={Colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingsItem}
          onPress={() => router.push('/(tabs)' as any)}
          activeOpacity={0.7}
        >
          <View style={[styles.settingsIcon, { backgroundColor: Colors.warning + '15' }]}>
            <Megaphone size={20} color={Colors.warning} />
          </View>
          <View style={styles.settingsContent}>
            <Text style={styles.settingsTitle}>Announcements</Text>
            <Text style={styles.settingsSubtitle}>Post organization announcements</Text>
          </View>
          <ChevronRight size={18} color={Colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingsItem, styles.settingsItemNoBorder]}
          onPress={() => router.push('/worship/manage' as any)}
          activeOpacity={0.7}
        >
          <View style={[styles.settingsIcon, { backgroundColor: '#7C3AED' + '15' }]}>
            <Music size={20} color="#7C3AED" />
          </View>
          <View style={styles.settingsContent}>
            <Text style={styles.settingsTitle}>Worship Songs</Text>
            <Text style={styles.settingsSubtitle}>Manage worship team content</Text>
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

  const renderEditTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.editHeader}>
        <TouchableOpacity
          style={[styles.saveButton, updateChurchMutation.isPending && styles.saveButtonDisabled]}
          onPress={handleSaveChurch}
          disabled={updateChurchMutation.isPending}
        >
          {updateChurchMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Check size={18} color="#FFF" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.logoSection}>
        <TouchableOpacity
          style={styles.logoContainer}
          onPress={() => setShowLogoPicker(!showLogoPicker)}
        >
          {churchLogo ? (
            <Image source={{ uri: churchLogo }} style={styles.logoImage} contentFit="cover" />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Building2 size={48} color={Colors.textTertiary} />
            </View>
          )}
          <View style={styles.cameraOverlay}>
            <Camera size={18} color="#FFF" />
          </View>
        </TouchableOpacity>
        <Text style={styles.logoHint}>Tap to change logo</Text>
      </View>

      {showLogoPicker && (
        <View style={styles.logoPicker}>
          <Text style={styles.pickerTitle}>Choose a logo</Text>
          <View style={styles.logoGrid}>
            {LOGO_OPTIONS.map((url, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.logoOption, churchLogo === url && styles.logoOptionSelected]}
                onPress={() => selectLogo(url)}
              >
                <Image source={{ uri: url }} style={styles.logoOptionImage} contentFit="cover" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Church Name *</Text>
          <TextInput
            style={styles.formInput}
            placeholder="e.g., Grace Community Church"
            placeholderTextColor={Colors.textTertiary}
            value={churchName}
            onChangeText={setChurchName}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.formInput, styles.textArea]}
            placeholder="Tell us about your church..."
            placeholderTextColor={Colors.textTertiary}
            value={churchDescription}
            onChangeText={setChurchDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address</Text>
          <View style={styles.inputWithIcon}>
            <MapPin size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.inputIcon}
              placeholder="123 Faith Avenue, City, State"
              placeholderTextColor={Colors.textTertiary}
              value={churchAddress}
              onChangeText={setChurchAddress}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone</Text>
          <View style={styles.inputWithIcon}>
            <Phone size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.inputIcon}
              placeholder="+1 (555) 123-4567"
              placeholderTextColor={Colors.textTertiary}
              value={churchPhone}
              onChangeText={setChurchPhone}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWithIcon}>
            <Mail size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.inputIcon}
              placeholder="info@yourchurch.org"
              placeholderTextColor={Colors.textTertiary}
              value={churchEmail}
              onChangeText={setChurchEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Website</Text>
          <View style={styles.inputWithIcon}>
            <Globe size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.inputIcon}
              placeholder="https://yourchurch.org"
              placeholderTextColor={Colors.textTertiary}
              value={churchWebsite}
              onChangeText={setChurchWebsite}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.adminButton}
        onPress={() => router.push('/organization/admin' as any)}
      >
        <Text style={styles.adminButtonText}>Church Admin Panel</Text>
      </TouchableOpacity>
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

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
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
        <TouchableOpacity
          style={[styles.tab, activeTab === 'edit' && styles.activeTab]}
          onPress={() => setActiveTab('edit')}
        >
          <Edit3 size={18} color={activeTab === 'edit' ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'edit' && styles.activeTabText]}>
            Edit
          </Text>
        </TouchableOpacity>
      </ScrollView>

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
        {activeTab === 'edit' && renderEditTab()}

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
  tabsContainer: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tabsContent: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    minWidth: Dimensions.get('window').width,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minWidth: 80,
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
  settingsSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 12,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingsSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  settingsItemNoBorder: {
    borderBottomWidth: 0,
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
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoContainer: {
    position: 'relative',
  },
  logoImage: {
    width: 110,
    height: 110,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: Colors.surface,
  },
  logoPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 28,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Colors.surface,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.surface,
  },
  logoHint: {
    fontSize: 14,
    color: Colors.primary,
    marginTop: 10,
    fontWeight: '500' as const,
  },
  logoPicker: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  logoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  logoOption: {
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  logoOptionSelected: {
    borderColor: Colors.primary,
  },
  logoOptionImage: {
    width: 68,
    height: 68,
    borderRadius: 14,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  formInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    height: 100,
    paddingTop: 16,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  inputIcon: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text,
  },
  adminButton: {
    marginTop: 32,
    backgroundColor: Colors.surfaceSecondary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  adminButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.primary,
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
