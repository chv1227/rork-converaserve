import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { 
  ArrowLeft, 
  Church, 
  Plus,
  Settings,
  MapPin,
  Mail,
  Phone,
  Globe,
  ChevronRight,
  Crown,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { Church as ChurchType, ChurchMembership, ChurchRole } from '@/types';

interface ChurchWithMembership extends ChurchType {
  membership?: ChurchMembership;
}

export default function ChurchesManagementScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isSuperAdmin } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const userChurchesQuery = useQuery<(ChurchType & { role: ChurchRole; joinedAt: string })[]>({
    queryKey: ['churches', 'user', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('church_memberships')
        .select(`
          id,
          role,
          joined_at,
          is_active,
          churches (
            id,
            name,
            denomination,
            address,
            city,
            state,
            zip_code,
            country,
            email,
            phone,
            website,
            logo,
            created_by,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;
      
      type MembershipRow = {
        id: string;
        role: ChurchRole;
        joined_at: string;
        is_active: boolean;
        churches: any | null;
      };
      
      return (data as MembershipRow[] | null)?.map(membership => {
        const church = membership.churches;
        if (!church) return null;
        return {
          id: church.id,
          name: church.name,
          denomination: church.denomination || '',
          description: '',
          address: church.address || '',
          city: church.city || '',
          state: church.state || '',
          zip: church.zip_code || '',
          country: church.country || '',
          email: church.email || '',
          phone: church.phone || '',
          website: church.website || '',
          logo: church.logo || '',
          createdBy: church.created_by,
          createdAt: church.created_at,
          updatedAt: church.updated_at || church.created_at,
          role: membership.role,
          joinedAt: membership.joined_at,
        };
      }).filter((c): c is NonNullable<typeof c> => c !== null) || [];
    },
    enabled: !!user?.id,
  });

  const allChurchesQuery = useQuery<(ChurchType & { status?: string })[]>({
    queryKey: ['churches', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('churches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        denomination: c.denomination || '',
        description: c.description || '',
        address: c.address_line1 || c.address || '',
        city: c.city || '',
        state: c.state || '',
        zip: c.zip_code || c.postal_code || '',
        country: c.country || '',
        email: c.contact_email || c.email || '',
        phone: c.contact_phone || c.phone || '',
        website: c.website || '',
        logo: c.logo_url || c.logo || '',
        createdBy: c.owner_user_id || c.created_by,
        createdAt: c.created_at,
        updatedAt: c.updated_at || c.created_at,
        status: c.status || 'active',
      }));
    },
    enabled: !!user?.id && isSuperAdmin,
  });

  const approveChurchMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any)
        .from('churches')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['churches'] });
      allChurchesQuery.refetch();
      const action = variables.status === 'active' ? 'approved' : 'rejected';
      Alert.alert('Success', `Church has been ${action}.`);
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to update church status');
    },
  });

  const userChurchesData = userChurchesQuery.data || [];
  const allChurchesData = allChurchesQuery.data || [];

  const churches: ChurchWithMembership[] = React.useMemo(() => {
    if (!user?.id) return [];
    
    const userChurches = userChurchesData;
    const allChurches = allChurchesData;
    
    if (isSuperAdmin) {
      const churchMap = new Map<string, ChurchWithMembership>();
      
      userChurches.forEach(church => {
        if (church) {
          churchMap.set(church.id, {
            ...church,
            membership: {
              id: '',
              churchId: church.id,
              userId: user.id,
              role: (church as any).role as ChurchRole || 'member',
              joinedAt: (church as any).joinedAt || new Date().toISOString(),
              isActive: true,
            },
          });
        }
      });
      
      allChurches.forEach((church: ChurchType) => {
        if (!churchMap.has(church.id) && church.createdBy === user.id) {
          churchMap.set(church.id, {
            ...church,
            membership: {
              id: '',
              churchId: church.id,
              userId: user.id,
              role: 'super_admin' as ChurchRole,
              joinedAt: church.createdAt,
              isActive: true,
            },
          });
        }
      });
      
      return Array.from(churchMap.values());
    }
    
    return userChurches.filter((c): c is NonNullable<typeof c> => c !== null).map(church => ({
      ...church,
      membership: {
        id: '',
        churchId: church.id,
        userId: user.id,
        role: (church as any).role as ChurchRole || 'member',
        joinedAt: (church as any).joinedAt || new Date().toISOString(),
        isActive: true,
      },
    }));
  }, [userChurchesQuery.data, allChurchesQuery.data, user?.id, isSuperAdmin]);

  const isLoading = userChurchesQuery.isLoading || (isSuperAdmin && allChurchesQuery.isLoading);

  const deleteChurchMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from('churches')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['churches'] });
      userChurchesQuery.refetch();
      if (isSuperAdmin) allChurchesQuery.refetch();
      Alert.alert('Success', 'Church deleted successfully');
    },
    onError: (error) => {
      console.error('Delete church error:', error);
      Alert.alert('Error', 'Failed to delete church');
    },
  });

  const isDeleting = deleteChurchMutation.isPending;

  const refetch = useCallback(async () => {
    await userChurchesQuery.refetch();
    if (isSuperAdmin) await allChurchesQuery.refetch();
  }, [userChurchesQuery.refetch, allChurchesQuery.refetch, isSuperAdmin]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleDeleteChurch = useCallback((church: ChurchType) => {
    if (Platform.OS === 'web') {
      if (confirm(`Are you sure you want to delete "${church.name}"? This action cannot be undone.`)) {
        deleteChurchMutation.mutate({ id: church.id });
      }
    } else {
      Alert.alert(
        'Delete Church',
        `Are you sure you want to delete "${church.name}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: () => deleteChurchMutation.mutate({ id: church.id }),
          },
        ]
      );
    }
  }, [deleteChurchMutation.mutate]);

  const getRoleBadge = (membership?: ChurchMembership) => {
    if (!membership) return null;
    
    switch (membership.role) {
      case 'super_admin':
        return { label: 'Super Admin', color: '#7C3AED' };
      case 'admin':
        return { label: 'Admin', color: Colors.primary };
      case 'staff':
        return { label: 'Staff', color: Colors.warning };
      default:
        return { label: 'Member', color: Colors.textSecondary };
    }
  };

  const canEditChurch = (church: ChurchWithMembership) => {
    if (isSuperAdmin) return true;
    if (church.createdBy === user?.id) return true;
    if (church.membership?.role === 'super_admin' || church.membership?.role === 'admin') return true;
    return false;
  };

  const canDeleteChurch = (church: ChurchWithMembership) => {
    if (isSuperAdmin) return true;
    if (church.createdBy === user?.id) return true;
    if (church.membership?.role === 'super_admin') return true;
    return false;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading churches...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.title}>Manage Churches</Text>
          <Text style={styles.subtitle}>
            {churches?.length || 0} {(churches?.length || 0) === 1 ? 'church' : 'churches'}
          </Text>
        </View>
        {isSuperAdmin && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/admin/create-church' as any)}
            activeOpacity={0.7}
          >
            <Plus size={20} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {(!churches || churches.length === 0) ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Church size={48} color={Colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No Churches Yet</Text>
            <Text style={styles.emptySubtitle}>
              {isSuperAdmin 
                ? "Create your first church to get started"
                : "You're not a member of any churches yet"}
            </Text>
            {isSuperAdmin && (
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => router.push('/admin/create-church' as any)}
                activeOpacity={0.7}
              >
                <Plus size={18} color="#FFF" />
                <Text style={styles.createButtonText}>Create Church</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {churches.map((church) => {
              const roleBadge = getRoleBadge(church.membership);
              const canEdit = canEditChurch(church);
              const canDelete = canDeleteChurch(church);
              
              return (
                <View key={church.id} style={styles.churchCard}>
                  <View style={styles.churchHeader}>
                    {church.logo ? (
                      <Image
                        source={{ uri: church.logo }}
                        style={styles.churchLogo}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.churchLogoPlaceholder}>
                        <Church size={24} color={Colors.primary} />
                      </View>
                    )}
                    <View style={styles.churchInfo}>
                      <Text style={styles.churchName}>{church.name}</Text>
                      {!!church.denomination && (
                        <Text style={styles.churchDenomination}>{church.denomination}</Text>
                      )}
                      {roleBadge && (
                        <View style={[styles.roleBadge, { backgroundColor: roleBadge.color + '20' }]}>
                          <Crown size={10} color={roleBadge.color} />
                          <Text style={[styles.roleBadgeText, { color: roleBadge.color }]}>
                            {roleBadge.label}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.churchDetails}>
                    <View style={styles.detailRow}>
                      <MapPin size={14} color={Colors.textSecondary} />
                      <Text style={styles.detailText} numberOfLines={1}>
                        {church.city}, {church.state}
                      </Text>
                    </View>
                    {!!church.email && (
                      <View style={styles.detailRow}>
                        <Mail size={14} color={Colors.textSecondary} />
                        <Text style={styles.detailText} numberOfLines={1}>{church.email}</Text>
                      </View>
                    )}
                    {!!church.phone && (
                      <View style={styles.detailRow}>
                        <Phone size={14} color={Colors.textSecondary} />
                        <Text style={styles.detailText}>{church.phone}</Text>
                      </View>
                    )}
                    {!!church.website && (
                      <View style={styles.detailRow}>
                        <Globe size={14} color={Colors.textSecondary} />
                        <Text style={styles.detailText} numberOfLines={1}>{church.website}</Text>
                      </View>
                    )}
                  </View>

                  {(church as any).status === 'pending' && isSuperAdmin && (
                    <View style={styles.approvalActions}>
                      <View style={styles.pendingBadgeRow}>
                        <Clock size={14} color="#D97706" />
                        <Text style={styles.pendingBadgeText}>Pending Approval</Text>
                      </View>
                      <View style={styles.approvalButtonsRow}>
                        <TouchableOpacity
                          style={styles.approveButton}
                          onPress={() => approveChurchMutation.mutate({ id: church.id, status: 'active' })}
                          activeOpacity={0.7}
                          disabled={approveChurchMutation.isPending}
                        >
                          <CheckCircle size={16} color="#FFF" />
                          <Text style={styles.approveButtonText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.rejectButton}
                          onPress={() => {
                            Alert.alert('Reject Church', `Reject "${church.name}"?`, [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Reject', style: 'destructive', onPress: () => approveChurchMutation.mutate({ id: church.id, status: 'suspended' }) },
                            ]);
                          }}
                          activeOpacity={0.7}
                          disabled={approveChurchMutation.isPending}
                        >
                          <XCircle size={16} color={Colors.error} />
                          <Text style={styles.rejectButtonText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <View style={styles.churchActions}>
                    {canEdit && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => router.push(`/church/${church.id}/settings` as any)}
                        activeOpacity={0.7}
                      >
                        <Settings size={16} color={Colors.primary} />
                        <Text style={styles.actionButtonText}>Edit</Text>
                        <ChevronRight size={16} color={Colors.textTertiary} />
                      </TouchableOpacity>
                    )}
                    {canDelete && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDeleteChurch(church)}
                        activeOpacity={0.7}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <ActivityIndicator size="small" color={Colors.error} />
                        ) : (
                          <>
                            <Trash2 size={16} color={Colors.error} />
                            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: 40 }} />
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
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitles: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  churchCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  churchHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  churchLogo: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  churchLogoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  churchInfo: {
    flex: 1,
    marginLeft: 12,
  },
  churchName: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  churchDenomination: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 6,
    alignSelf: 'flex-start',
    gap: 4,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  churchDetails: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
  },
  churchActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '15',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.primary,
    flex: 1,
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: Colors.error + '15',
    flex: 0.6,
  },
  deleteButtonText: {
    color: Colors.error,
  },
  approvalActions: {
    marginBottom: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pendingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  pendingBadgeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#92400E',
  },
  approvalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error + '15',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.error,
  },
});
