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
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { getUserOrganizations, getUserMembership } from '@/lib/supabase-organizations';
import { Organization, OrganizationRole } from '@/types';
import { useQuery } from '@tanstack/react-query';

type OrgWithRole = Organization & { role: OrganizationRole; joinedAt: string };

export default function OrganizationSelectScreen() {
  const router = useRouter();
  const { currentOrganization, setCurrentOrganization, setOrganizations, isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [orgsWithRoles, setOrgsWithRoles] = useState<OrgWithRole[]>([]);

  const { data: organizations, isLoading, refetch } = useQuery({
    queryKey: ['user-organizations'],
    queryFn: async () => {
      console.log('Fetching user organizations via Supabase...');
      const orgs = await getUserOrganizations();
      
      const orgsWithRolesData: OrgWithRole[] = await Promise.all(
        orgs.map(async (org) => {
          const membership = await getUserMembership(org.id);
          return {
            ...org,
            role: (membership?.role || 'member') as OrganizationRole,
            joinedAt: membership?.joined_at || org.createdAt,
          };
        })
      );
      
      return orgsWithRolesData;
    },
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (organizations) {
      setOrgsWithRoles(organizations);
      setOrganizations(organizations);
    }
  }, [organizations, setOrganizations]);

  const handleSelectOrganization = async (org: OrgWithRole) => {
    console.log('Selecting organization:', org.name);
    await setCurrentOrganization(org, {
      id: '',
      organizationId: org.id,
      role: org.role,
      joinedAt: org.joinedAt,
    });
    router.replace('/(tabs)');
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleAdminPanel = () => {
    router.push('/organization/admin');
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
        return Colors.error;
      case 'organization_admin':
        return Colors.warning;
      default:
        return Colors.primary;
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
          <ActivityIndicator size="large" color={Colors.primary} />
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
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerBarTitle}>Organizations</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.header}>
        <Building2 size={32} color={Colors.primary} />
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
                  <CheckCircle size={24} color={Colors.success} />
                ) : (
                  <ChevronRight size={24} color={Colors.textSecondary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Building2 size={64} color={Colors.textSecondary} />
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
              <Plus size={24} color={Colors.primary} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Create New Church</Text>
              <Text style={styles.actionDescription}>
                Start a new church organization
              </Text>
            </View>
            <ChevronRight size={24} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleJoinOrganization}
            testID="join-org-button"
          >
            <View style={styles.actionIcon}>
              <Users size={24} color={Colors.primary} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Join Existing Church</Text>
              <Text style={styles.actionDescription}>
                Request to join a church
              </Text>
            </View>
            <ChevronRight size={24} color={Colors.textSecondary} />
          </TouchableOpacity>

          {canAccessAdmin && currentOrganization && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleAdminPanel}
              testID="admin-panel-button"
            >
              <View style={[styles.actionIcon, { backgroundColor: Colors.warning + '20' }]}>
                <Shield size={24} color={Colors.warning} />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Church Admin Panel</Text>
                <Text style={styles.actionDescription}>
                  Manage members and settings
                </Text>
              </View>
              <ChevronRight size={24} color={Colors.textSecondary} />
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
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBarTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
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
    color: Colors.text,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
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
    color: Colors.text,
    marginBottom: 12,
  },
  orgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  orgCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  orgLogo: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.border,
  },
  orgInfo: {
    flex: 1,
    marginLeft: 16,
  },
  orgName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  orgDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
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
    color: Colors.text,
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
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
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
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
    color: Colors.text,
  },
  actionDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
