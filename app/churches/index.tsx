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
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getUserChurches, 
  getChurchMembership,
  deleteChurch,
  listChurches,
} from '@/lib/supabase-churches';
import { Church as ChurchType, ChurchMembership } from '@/types';

interface ChurchWithMembership extends ChurchType {
  membership?: ChurchMembership;
}

export default function ChurchesManagementScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isSuperAdmin } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data: churches, isLoading, refetch } = useQuery({
    queryKey: ['user-churches', user?.id, isSuperAdmin],
    queryFn: async () => {
      if (!user?.id) return [];
      
      if (isSuperAdmin) {
        const allChurches = await listChurches();
        const myChurches = await getUserChurches(user.id);
        
        const uniqueChurches = [...myChurches];
        allChurches.forEach(church => {
          if (!uniqueChurches.find(c => c.id === church.id)) {
            if (church.createdBy === user.id) {
              uniqueChurches.push(church);
            }
          }
        });
        
        const churchesWithMembership: ChurchWithMembership[] = await Promise.all(
          uniqueChurches.map(async (church) => {
            const membership = await getChurchMembership(church.id, user.id);
            return { ...church, membership: membership || undefined };
          })
        );
        
        return churchesWithMembership;
      }
      
      const userChurches = await getUserChurches(user.id);
      const churchesWithMembership: ChurchWithMembership[] = await Promise.all(
        userChurches.map(async (church) => {
          const membership = await getChurchMembership(church.id, user.id);
          return { ...church, membership: membership || undefined };
        })
      );
      
      return churchesWithMembership;
    },
    enabled: !!user?.id,
  });

  const { mutate: deleteChurchMutate, isPending: isDeleting } = useMutation({
    mutationFn: async (churchId: string) => {
      return deleteChurch(churchId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-churches'] });
      Alert.alert('Success', 'Church deleted successfully');
    },
    onError: (error) => {
      console.error('Delete church error:', error);
      Alert.alert('Error', 'Failed to delete church');
    },
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleDeleteChurch = useCallback((church: ChurchType) => {
    if (Platform.OS === 'web') {
      if (confirm(`Are you sure you want to delete "${church.name}"? This action cannot be undone.`)) {
        deleteChurchMutate(church.id);
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
            onPress: () => deleteChurchMutate(church.id),
          },
        ]
      );
    }
  }, [deleteChurchMutate]);

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
            onPress={() => router.push('/admin/create-church')}
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
                onPress={() => router.push('/admin/create-church')}
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
                      {church.denomination && (
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
                    {church.email && (
                      <View style={styles.detailRow}>
                        <Mail size={14} color={Colors.textSecondary} />
                        <Text style={styles.detailText} numberOfLines={1}>{church.email}</Text>
                      </View>
                    )}
                    {church.phone && (
                      <View style={styles.detailRow}>
                        <Phone size={14} color={Colors.textSecondary} />
                        <Text style={styles.detailText}>{church.phone}</Text>
                      </View>
                    )}
                    {church.website && (
                      <View style={styles.detailRow}>
                        <Globe size={14} color={Colors.textSecondary} />
                        <Text style={styles.detailText} numberOfLines={1}>{church.website}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.churchActions}>
                    {canEdit && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => router.push(`/church/${church.id}/settings`)}
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
});
