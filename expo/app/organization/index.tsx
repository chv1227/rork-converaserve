import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Building2, Plus, ChevronRight, Users, CheckCircle, ArrowLeft, Shield } from 'lucide-react-native';
import { LightTheme } from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { Organization, OrganizationRole } from '@/types';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

type OrgWithRole = Organization & { role: OrganizationRole; joinedAt: string };

export default function OrganizationSelectScreen() {
  const router = useRouter();
  const { currentOrganization, setCurrentOrganization, setOrganizations, isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [orgsWithRoles, setOrgsWithRoles] = useState<OrgWithRole[]>([]);

  const userOrgsQuery = useQuery({
    queryKey: ['user-churches'],
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return [];
      const { data, error } = await supabase
        .from('user_church_roles')
        .select('id, role, is_active, created_at, updated_at, church_id')
        .eq('user_id', authUser.id)
        .eq('is_active', true);
      if (error) {
        console.error('Error fetching user church roles:', error.message);
        throw error;
      }
      const rows = (data || []) as { id: string; role: string; is_active: boolean; created_at: string; updated_at: string; church_id: string }[];
      const orgs: any[] = [];
      for (const m of rows) {
        const { data: orgData, error: orgError } = await supabase
          .from('churches')
          .select('*')
          .eq('id', m.church_id)
          .single();
        if (orgError || !orgData) {
          console.log('Could not fetch church:', m.church_id, orgError?.message);
          continue;
        }
        const org = orgData as { id: string; name: string; description: string | null; logo_url: string | null; address_line1: string | null; contact_phone: string | null; contact_email: string | null; website: string | null; created_at: string; updated_at: string };
        const mappedRole = m.role === 'owner' ? 'super_admin' : m.role === 'admin' ? 'organization_admin' : m.role;
        orgs.push({
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
          role: mappedRole,
          joinedAt: m.created_at,
          membershipId: m.id,
        });
      }
      return orgs;
    },
    enabled: isAuthenticated,
  });

  const organizations = React.useMemo(() => {
    if (!userOrgsQuery.data) return [];
    return userOrgsQuery.data
      .filter((org): org is NonNullable<typeof org> => org !== null && org.id !== undefined)
      .map((org): OrgWithRole => ({
        id: org.id,
        name: org.name || '',
        description: org.description || '',
        logo: org.logo,
        address: org.address,
        phone: org.phone,
        email: org.email,
        website: org.website,
        createdAt: org.createdAt || new Date().toISOString(),
        updatedAt: org.updatedAt || new Date().toISOString(),
        role: (org.role || 'member') as OrganizationRole,
        joinedAt: org.joinedAt || org.createdAt || new Date().toISOString(),
      }));
  }, [userOrgsQuery.data]);

  const isLoading = userOrgsQuery.isLoading;
  const refetch = userOrgsQuery.refetch;

  useEffect(() => {
    if (organizations) {
      setOrgsWithRoles(organizations);
      setOrganizations(organizations);
    }
  }, [organizations, setOrganizations]);

  const handleSelectOrganization = async (org: OrgWithRole) => {
    console.log('Selecting organization:', org.name);
    const matchingRaw = userOrgsQuery.data?.find((o: any) => o.id === org.id);
    await setCurrentOrganization(org, {
      id: matchingRaw?.membershipId || '',
      organizationId: org.id,
      role: org.role,
      joinedAt: org.joinedAt,
    });
    router.back();
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleAdminPanel = () => {
    router.push('/organization/admin' as any);
  };

  const handleCreateOrganization = () => {
    router.push('/organization/create' as any);
  };

  const handleJoinOrganization = () => {
    router.push('/organization/join' as any);
  };

  const getRoleBadgeColor = (role: OrganizationRole) => {
    switch (role) {
      case 'super_admin':
        return LightTheme.error;
      case 'organization_admin':
        return LightTheme.warning;
      default:
        return LightTheme.primary;
    }
  };

  const getRoleLabel = (role: OrganizationRole) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'organization_admin':
        return 'Admin';
      default:
        return 'Member';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={LightTheme.primary} />
          <Text style={styles.loadingText}>Loading organizations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasOrganizations = orgsWithRoles && orgsWithRoles.length > 0;
  const canAccessAdmin = orgsWithRoles.some(
    (org) => org.role === 'super_admin' || org.role === 'organization_admin'
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={LightTheme.text} />
        </TouchableOpacity>
        <Text style={styles.headerBarTitle}>Organizations</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.header}>
        <Building2 size={32} color={LightTheme.primary} />
        <Text style={styles.title}>Select Organization</Text>
        <Text style={styles.subtitle}>Choose a church to continue</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {hasOrganizations ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Organizations</Text>
            {orgsWithRoles.map((org) => (
              <TouchableOpacity
                key={org.id}
                style={[
                  styles.orgCard,
                  currentOrganization?.id === org.id && styles.orgCardSelected,
                ]}
                onPress={() => handleSelectOrganization(org)}
                testID={`org-${org.id}`}
              >
                <Image
                  source={{ uri: org.logo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(org.name || '') }}
                  style={styles.orgLogo}
                  contentFit="cover"
                />
                <View style={styles.orgInfo}>
                  <Text style={styles.orgName}>{org.name}</Text>
                  <Text style={styles.orgDescription} numberOfLines={2}>
                    {org.description}
                  </Text>
                  <View style={styles.roleContainer}>
                    <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(org.role) }]}>
                      <Text style={styles.roleText}>{getRoleLabel(org.role)}</Text>
                    </View>
                  </View>
                </View>
                {currentOrganization?.id === org.id ? (
                  <CheckCircle size={24} color={LightTheme.success} />
                ) : (
                  <ChevronRight size={24} color={LightTheme.textSecondary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Building2 size={64} color={LightTheme.textSecondary} />
            <Text style={styles.emptyTitle}>No Organizations Yet</Text>
            <Text style={styles.emptyDescription}>
              Create a new church organization or join an existing one to get started.
            </Text>
          </View>
        )}

        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCreateOrganization}
            testID="create-org-button"
          >
            <View style={styles.actionIcon}>
              <Plus size={24} color={LightTheme.primary} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Create New Church</Text>
              <Text style={styles.actionDescription}>
                Start a new church organization
              </Text>
            </View>
            <ChevronRight size={24} color={LightTheme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleJoinOrganization}
            testID="join-org-button"
          >
            <View style={styles.actionIcon}>
              <Users size={24} color={LightTheme.primary} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Join Existing Church</Text>
              <Text style={styles.actionDescription}>
                Request to join a church
              </Text>
            </View>
            <ChevronRight size={24} color={LightTheme.textSecondary} />
          </TouchableOpacity>

          {canAccessAdmin && currentOrganization && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleAdminPanel}
              testID="admin-panel-button"
            >
              <View style={[styles.actionIcon, { backgroundColor: LightTheme.warning + '20' }]}>
                <Shield size={24} color={LightTheme.warning} />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Church Admin Panel</Text>
                <Text style={styles.actionDescription}>
                  Manage members and settings
                </Text>
              </View>
              <ChevronRight size={24} color={LightTheme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: LightTheme.border,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: LightTheme.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBarTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: LightTheme.text,
  },
  headerPlaceholder: {
    width: 44,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: LightTheme.text,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: LightTheme.textSecondary,
    marginTop: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: LightTheme.text,
    marginBottom: 12,
  },
  orgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LightTheme.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  orgCardSelected: {
    borderColor: LightTheme.primary,
    backgroundColor: LightTheme.primaryLight,
  },
  orgLogo: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: LightTheme.border,
  },
  orgInfo: {
    flex: 1,
    marginLeft: 16,
  },
  orgName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: LightTheme.text,
  },
  orgDescription: {
    fontSize: 14,
    color: LightTheme.textSecondary,
    marginTop: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: LightTheme.text,
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 16,
    color: LightTheme.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  actionsSection: {
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LightTheme.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: LightTheme.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionInfo: {
    flex: 1,
    marginLeft: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: LightTheme.text,
  },
  actionDescription: {
    fontSize: 14,
    color: LightTheme.textSecondary,
    marginTop: 2,
  },
});
