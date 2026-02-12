import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, Building2, Send } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Organization } from '@/types';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export default function JoinOrganizationScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [message, setMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const organizationsQuery = useQuery({
    queryKey: ['all-churches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('churches')
        .select('*')
        .eq('status', 'active')
        .order('name');
      if (error) { console.log('Churches query error:', error.message); return []; }
      const rows = (data || []) as { id: string; name: string; description: string | null; logo_url: string | null; address_line1: string | null; contact_phone: string | null; contact_email: string | null; website: string | null; created_at: string; updated_at: string }[];
      return rows.map((o): Organization => ({
        id: o.id,
        name: o.name,
        description: o.description || '',
        logo: o.logo_url || undefined,
        address: o.address_line1 || undefined,
        phone: o.contact_phone || undefined,
        email: o.contact_email || undefined,
        website: o.website || undefined,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
      }));
    },
  });

  const userOrgsQuery = useQuery({
    queryKey: ['user-churches'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_church_roles')
        .select('church_id')
        .eq('user_id', user.id);
      if (error) { console.log('User churches query error:', error.message); return []; }
      const rows = (data || []) as { church_id: string }[];
      return rows.map((m) => ({ id: m.church_id }));
    },
  });

  const organizations = organizationsQuery.data;
  const userOrgs = userOrgsQuery.data;
  const isLoading = organizationsQuery.isLoading;
  const refetch = organizationsQuery.refetch;

  const requestMutation = useMutation({
    mutationFn: async ({ organizationId, message: msg }: { organizationId: string; message?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('user_church_roles')
        .select('id, is_active')
        .eq('user_id', user.id)
        .eq('church_id', organizationId)
        .maybeSingle();

      const existingRow = existing as { id: string; is_active: boolean } | null;
      if (existingRow) {
        if (existingRow.is_active) {
          throw new Error('You are already a member of this church');
        } else {
          throw new Error('You already have a pending request for this church');
        }
      }

      const { error } = await (supabase
        .from('user_church_roles') as any)
        .insert({
          user_id: user.id,
          church_id: organizationId,
          role: 'member',
          is_active: false,
        });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      Alert.alert(
        'Request Sent',
        'Your request to join has been submitted. You will be notified when it is reviewed.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
    onError: (error: Error) => {
      console.error('Join request error:', error);
      Alert.alert('Error', error.message || 'Failed to send join request');
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleSelectOrg = (org: Organization) => {
    setSelectedOrg(org);
    setMessage('');
  };

  const handleSendRequest = () => {
    if (!selectedOrg) return;
    requestMutation.mutate({
      organizationId: selectedOrg.id,
      message: message.trim() || undefined,
    });
  };

  const userOrgIds = userOrgs?.map((o) => o.id) || [];

  const filteredOrganizations = organizations?.filter((org) => {
    if (userOrgIds.includes(org.id)) return false;
    if (!searchQuery.trim()) return true;
    return org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           org.description.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  if (selectedOrg) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedOrg(null)}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request to Join</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.selectedOrgCard}>
            <Image
              source={{ uri: selectedOrg.logo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(selectedOrg.name) }}
              style={styles.selectedOrgLogo}
            />
            <Text style={styles.selectedOrgName}>{selectedOrg.name}</Text>
            <Text style={styles.selectedOrgDescription}>{selectedOrg.description}</Text>
          </View>

          <View style={styles.messageSection}>
            <Text style={styles.messageLabel}>Add a message (optional)</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Tell them why you'd like to join..."
              placeholderTextColor={Colors.textSecondary}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.sendButton, requestMutation.isPending && styles.sendButtonDisabled]}
            onPress={handleSendRequest}
            disabled={requestMutation.isPending}
          >
            {requestMutation.isPending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Send size={20} color="#FFF" />
                <Text style={styles.sendButtonText}>Send Request</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join Church</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search churches..."
          placeholderTextColor={Colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {filteredOrganizations.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Available Churches</Text>
              {filteredOrganizations.map((org) => (
                <TouchableOpacity
                  key={org.id}
                  style={styles.orgCard}
                  onPress={() => handleSelectOrg(org)}
                >
                  <Image
                    source={{ uri: org.logo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(org.name) }}
                    style={styles.orgLogo}
                  />
                  <View style={styles.orgInfo}>
                    <Text style={styles.orgName}>{org.name}</Text>
                    <Text style={styles.orgDescription} numberOfLines={2}>
                      {org.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Building2 size={64} color={Colors.textSecondary} />
              <Text style={styles.emptyTitle}>No Churches Found</Text>
              <Text style={styles.emptyDescription}>
                {searchQuery ? 'Try a different search term' : 'No churches available to join'}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
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
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 12,
    fontSize: 16,
    color: Colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
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
  },
  selectedOrgCard: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  selectedOrgLogo: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: Colors.border,
    marginBottom: 16,
  },
  selectedOrgName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
  },
  selectedOrgDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  messageSection: {
    marginBottom: 24,
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  messageInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 120,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
});
