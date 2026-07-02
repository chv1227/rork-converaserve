import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  Settings,
  Edit3,
  Eye,
  EyeOff,
  Bell,
  Calendar,
  Megaphone,
  DollarSign,
  Video,
  Users,
  MessageCircle,
  Save,
  Shield,
  Trash2,
  ChevronRight,
  Church,
} from 'lucide-react-native';
import { LightTheme } from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function ChurchSettingsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated, user, isSuperAdmin: isSystemSuperAdmin } = useAuth();
  const currentUserId = user?.id;

  const [activeTab, setActiveTab] = useState<'profile' | 'modules' | 'notifications' | 'members'>('profile');
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [logo, setLogo] = useState('');
  
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [modulesEnabled, setModulesEnabled] = useState({
    events: true,
    announcements: true,
    donations: true,
    media: true,
    ministries: true,
    messaging: true,
  });
  const [notificationPreferences, setNotificationPreferences] = useState({
    newMembers: true,
    events: true,
    announcements: true,
    donations: true,
  });

  const queryClient = useQueryClient();

  const churchQuery = useQuery({
    queryKey: ['church', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('churches')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      const churchData = data as { id: string; name: string; description: string | null; contact_email: string | null; contact_phone: string | null; website: string | null; logo_url: string | null } | null;
      if (!churchData) return null;
      return {
        id: churchData.id,
        name: churchData.name,
        description: churchData.description,
        email: churchData.contact_email,
        phone: churchData.contact_phone,
        website: churchData.website,
        logo: churchData.logo_url,
      };
    },
    enabled: !!id,
  });

  const membershipQuery = useQuery({
    queryKey: ['church-membership', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('user_church_roles')
        .select('*')
        .eq('church_id', id)
        .eq('user_id', currentUserId || '')
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      const roleData = data as { role: string } | null;
      return roleData ? { role: roleData.role } : null;
    },
    enabled: !!id && isAuthenticated,
  });

  const settingsQuery = useQuery({
    queryKey: ['church-settings', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('tenant_settings')
        .select('*')
        .eq('church_id', id);
      if (error) throw error;
      const settings = data?.reduce((acc: Record<string, unknown>, s: { key: string; value: Record<string, unknown> }) => {
        acc[s.key] = s.value;
        return acc;
      }, {}) || {};
      const modulesData = settings.modules as { events?: boolean; announcements?: boolean; donations?: boolean; media?: boolean; ministries?: boolean; messaging?: boolean } | undefined;
      const notifData = settings.notifications as { newMembers?: boolean; events?: boolean; announcements?: boolean; donations?: boolean } | undefined;
      return {
        visibility: ((settings.visibility as { value?: string })?.value || 'public') as 'public' | 'private',
        modulesEnabled: {
          events: modulesData?.events ?? true,
          announcements: modulesData?.announcements ?? true,
          donations: modulesData?.donations ?? true,
          media: modulesData?.media ?? true,
          ministries: modulesData?.ministries ?? true,
          messaging: modulesData?.messaging ?? true,
        },
        notificationPreferences: {
          newMembers: notifData?.newMembers ?? true,
          events: notifData?.events ?? true,
          announcements: notifData?.announcements ?? true,
          donations: notifData?.donations ?? true,
        },
      };
    },
    enabled: !!id && isAuthenticated,
  });

  const membersQuery = useQuery({
    queryKey: ['church-members', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('user_church_roles')
        .select('*, users(id, full_name, email)')
        .eq('church_id', id)
        .eq('is_active', true);
      if (error) throw error;
      return (data || []).map((m: { id: string; user_id: string; role: string; users: { id: string; full_name: string | null; email: string } | null }) => ({
        id: m.id,
        userId: m.user_id,
        name: m.users?.full_name || 'Unknown',
        email: m.users?.email || '',
        role: m.role,
      }));
    },
    enabled: !!id && isAuthenticated && activeTab === 'members',
  });

  const updateChurchMutation = useMutation({
    mutationFn: async (data: { id: string; name?: string; description?: string; email?: string; phone?: string; website?: string; logo?: string }) => {
      const { error } = await supabase
        .from('churches')
        .update({
          name: data.name,
          description: data.description,
          contact_email: data.email,
          contact_phone: data.phone,
          website: data.website,
          logo_url: data.logo,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      Alert.alert('Success', 'Church profile updated successfully');
      queryClient.invalidateQueries({ queryKey: ['church', id] });
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to update church');
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { churchId: string; visibility: string; modulesEnabled: typeof modulesEnabled; notificationPreferences: typeof notificationPreferences }) => {
      const updates = [
        { church_id: data.churchId, key: 'visibility', value: { value: data.visibility } },
        { church_id: data.churchId, key: 'modules', value: data.modulesEnabled },
        { church_id: data.churchId, key: 'notifications', value: data.notificationPreferences },
      ];
      for (const update of updates) {
        const { error } = await supabase
          .from('tenant_settings')
          .upsert(update as never, { onConflict: 'church_id,key' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      Alert.alert('Success', 'Settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['church-settings', id] });
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to update settings');
    },
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: async (data: { membershipId: string; churchId: string; role: string }) => {
      const { error } = await supabase
        .from('user_church_roles')
        .update({ role: data.role, updated_at: new Date().toISOString() } as never)
        .eq('id', data.membershipId);
      if (error) throw error;
    },
    onSuccess: () => {
      Alert.alert('Success', 'Member role updated');
      queryClient.invalidateQueries({ queryKey: ['church-members', id] });
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to update role');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (data: { membershipId: string; churchId: string }) => {
      const { error } = await supabase
        .from('user_church_roles')
        .update({ is_active: false, updated_at: new Date().toISOString() } as never)
        .eq('id', data.membershipId);
      if (error) throw error;
    },
    onSuccess: () => {
      Alert.alert('Success', 'Member removed');
      queryClient.invalidateQueries({ queryKey: ['church-members', id] });
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to remove member');
    },
  });

  useEffect(() => {
    if (churchQuery.data) {
      setName(churchQuery.data.name || '');
      setDescription(churchQuery.data.description || '');
      setEmail(churchQuery.data.email || '');
      setPhone(churchQuery.data.phone || '');
      setWebsite(churchQuery.data.website || '');
      setLogo(churchQuery.data.logo || '');
    }
  }, [churchQuery.data]);

  useEffect(() => {
    if (settingsQuery.data) {
      setVisibility(settingsQuery.data.visibility);
      setModulesEnabled(settingsQuery.data.modulesEnabled);
      setNotificationPreferences(settingsQuery.data.notificationPreferences);
    }
  }, [settingsQuery.data]);

  const isChurchAdmin = membershipQuery.data?.role === 'super_admin' || membershipQuery.data?.role === 'admin';
  const isAdmin = isChurchAdmin || isSystemSuperAdmin;
  const isSuperAdmin = membershipQuery.data?.role === 'super_admin' || isSystemSuperAdmin;

  const handleSaveProfile = useCallback(() => {
    if (!id) return;
    
    updateChurchMutation.mutate({
      id,
      name: name.trim() || undefined,
      description: description.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      website: website.trim() || undefined,
      logo: logo.trim() || undefined,
    });
  }, [id, name, description, email, phone, website, logo, updateChurchMutation]);

  const handleSaveSettings = useCallback(() => {
    if (!id) return;
    
    updateSettingsMutation.mutate({
      churchId: id,
      visibility,
      modulesEnabled,
      notificationPreferences,
    });
  }, [id, visibility, modulesEnabled, notificationPreferences, updateSettingsMutation]);

  const handleToggleModule = useCallback((module: keyof typeof modulesEnabled) => {
    setModulesEnabled(prev => ({ ...prev, [module]: !prev[module] }));
  }, []);

  const handleToggleNotification = useCallback((pref: keyof typeof notificationPreferences) => {
    setNotificationPreferences(prev => ({ ...prev, [pref]: !prev[pref] }));
  }, []);

  const handleChangeMemberRole = useCallback((membershipId: string, currentRole: string) => {
    if (!id) return;
    
    const roles = ['member', 'staff', 'admin', 'super_admin'];
    const options = roles.filter(r => r !== currentRole).map(role => ({
      text: role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      onPress: () => updateMemberRoleMutation.mutate({ 
        membershipId, 
        churchId: id, 
        role: role as 'member' | 'staff' | 'admin' | 'super_admin' 
      }),
    }));
    options.push({ text: 'Cancel', onPress: () => {} });
    
    Alert.alert('Change Role', 'Select new role for this member', options);
  }, [id, updateMemberRoleMutation]);

  const handleRemoveMember = useCallback((membershipId: string, memberName: string) => {
    if (!id) return;
    
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from this church?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => removeMemberMutation.mutate({ membershipId, churchId: id }),
        },
      ]
    );
  }, [id, removeMemberMutation]);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Shield size={48} color={LightTheme.textTertiary} />
          <Text style={styles.errorTitle}>Sign In Required</Text>
          <Text style={styles.errorText}>Please sign in to access church settings</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/login' as any)}>
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (churchQuery.isLoading || membershipQuery.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={LightTheme.primary} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={LightTheme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.centerContainer}>
          <Shield size={48} color={LightTheme.error} />
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorText}>Only church administrators can access settings</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const tabs = [
    { key: 'profile', label: 'Profile', icon: Edit3 },
    { key: 'modules', label: 'Modules', icon: Settings },
    { key: 'notifications', label: 'Alerts', icon: Bell },
    { key: 'members', label: 'Members', icon: Users },
  ] as const;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={LightTheme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Church Settings</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.churchInfo}>
          <View style={styles.churchIcon}>
            <Church size={24} color={LightTheme.primary} />
          </View>
          <View style={styles.churchDetails}>
            <Text style={styles.churchName}>{churchQuery.data?.name}</Text>
            <Text style={styles.churchRole}>
              {membershipQuery.data?.role?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
            </Text>
          </View>
        </View>

        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Icon size={18} color={isActive ? LightTheme.primary : LightTheme.textSecondary} />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'profile' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Church Profile</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Church Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Church name"
                  placeholderTextColor={LightTheme.textTertiary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Church description"
                  placeholderTextColor={LightTheme.textTertiary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Contact email"
                  placeholderTextColor={LightTheme.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Contact phone"
                  placeholderTextColor={LightTheme.textTertiary}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Website</Text>
                <TextInput
                  style={styles.input}
                  value={website}
                  onChangeText={setWebsite}
                  placeholder="https://yourchurch.org"
                  placeholderTextColor={LightTheme.textTertiary}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Logo URL</Text>
                <TextInput
                  style={styles.input}
                  value={logo}
                  onChangeText={setLogo}
                  placeholder="https://example.com/logo.png"
                  placeholderTextColor={LightTheme.textTertiary}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  {visibility === 'public' ? (
                    <Eye size={20} color={LightTheme.primary} />
                  ) : (
                    <EyeOff size={20} color={LightTheme.textSecondary} />
                  )}
                  <View style={styles.settingText}>
                    <Text style={styles.settingTitle}>Visibility</Text>
                    <Text style={styles.settingDescription}>
                      {visibility === 'public' ? 'Church is visible to everyone' : 'Church is hidden from public'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.visibilityButton, visibility === 'public' && styles.visibilityButtonActive]}
                  onPress={() => setVisibility(visibility === 'public' ? 'private' : 'public')}
                >
                  <Text style={[styles.visibilityButtonText, visibility === 'public' && styles.visibilityButtonTextActive]}>
                    {visibility === 'public' ? 'Public' : 'Private'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, updateChurchMutation.isPending && styles.saveButtonDisabled]}
                onPress={handleSaveProfile}
                disabled={updateChurchMutation.isPending}
              >
                {updateChurchMutation.isPending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Save size={18} color="#FFF" />
                    <Text style={styles.saveButtonText}>Save Profile</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'modules' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Enable/Disable Features</Text>
              <Text style={styles.sectionDescription}>
                Control which features are available for your church members
              </Text>

              <View style={styles.moduleList}>
                <View style={styles.moduleItem}>
                  <View style={styles.moduleInfo}>
                    <Calendar size={22} color={LightTheme.primary} />
                    <View style={styles.moduleText}>
                      <Text style={styles.moduleTitle}>Events</Text>
                      <Text style={styles.moduleDescription}>Church events and calendar</Text>
                    </View>
                  </View>
                  <Switch
                    value={modulesEnabled.events}
                    onValueChange={() => handleToggleModule('events')}
                    trackColor={{ false: LightTheme.border, true: LightTheme.primary + '50' }}
                    thumbColor={modulesEnabled.events ? LightTheme.primary : LightTheme.textTertiary}
                  />
                </View>

                <View style={styles.moduleItem}>
                  <View style={styles.moduleInfo}>
                    <Megaphone size={22} color={LightTheme.warning} />
                    <View style={styles.moduleText}>
                      <Text style={styles.moduleTitle}>Announcements</Text>
                      <Text style={styles.moduleDescription}>Church-wide announcements</Text>
                    </View>
                  </View>
                  <Switch
                    value={modulesEnabled.announcements}
                    onValueChange={() => handleToggleModule('announcements')}
                    trackColor={{ false: LightTheme.border, true: LightTheme.primary + '50' }}
                    thumbColor={modulesEnabled.announcements ? LightTheme.primary : LightTheme.textTertiary}
                  />
                </View>

                <View style={styles.moduleItem}>
                  <View style={styles.moduleInfo}>
                    <DollarSign size={22} color={LightTheme.success} />
                    <View style={styles.moduleText}>
                      <Text style={styles.moduleTitle}>Donations</Text>
                      <Text style={styles.moduleDescription}>Tithes and offerings</Text>
                    </View>
                  </View>
                  <Switch
                    value={modulesEnabled.donations}
                    onValueChange={() => handleToggleModule('donations')}
                    trackColor={{ false: LightTheme.border, true: LightTheme.primary + '50' }}
                    thumbColor={modulesEnabled.donations ? LightTheme.primary : LightTheme.textTertiary}
                  />
                </View>

                <View style={styles.moduleItem}>
                  <View style={styles.moduleInfo}>
                    <Video size={22} color={LightTheme.error} />
                    <View style={styles.moduleText}>
                      <Text style={styles.moduleTitle}>Media</Text>
                      <Text style={styles.moduleDescription}>Sermons and videos</Text>
                    </View>
                  </View>
                  <Switch
                    value={modulesEnabled.media}
                    onValueChange={() => handleToggleModule('media')}
                    trackColor={{ false: LightTheme.border, true: LightTheme.primary + '50' }}
                    thumbColor={modulesEnabled.media ? LightTheme.primary : LightTheme.textTertiary}
                  />
                </View>

                <View style={styles.moduleItem}>
                  <View style={styles.moduleInfo}>
                    <Users size={22} color="#8B5CF6" />
                    <View style={styles.moduleText}>
                      <Text style={styles.moduleTitle}>Ministries</Text>
                      <Text style={styles.moduleDescription}>Ministry groups and teams</Text>
                    </View>
                  </View>
                  <Switch
                    value={modulesEnabled.ministries}
                    onValueChange={() => handleToggleModule('ministries')}
                    trackColor={{ false: LightTheme.border, true: LightTheme.primary + '50' }}
                    thumbColor={modulesEnabled.ministries ? LightTheme.primary : LightTheme.textTertiary}
                  />
                </View>

                <View style={styles.moduleItem}>
                  <View style={styles.moduleInfo}>
                    <MessageCircle size={22} color="#0EA5E9" />
                    <View style={styles.moduleText}>
                      <Text style={styles.moduleTitle}>Messaging</Text>
                      <Text style={styles.moduleDescription}>Direct and group messages</Text>
                    </View>
                  </View>
                  <Switch
                    value={modulesEnabled.messaging}
                    onValueChange={() => handleToggleModule('messaging')}
                    trackColor={{ false: LightTheme.border, true: LightTheme.primary + '50' }}
                    thumbColor={modulesEnabled.messaging ? LightTheme.primary : LightTheme.textTertiary}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, updateSettingsMutation.isPending && styles.saveButtonDisabled]}
                onPress={handleSaveSettings}
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Save size={18} color="#FFF" />
                    <Text style={styles.saveButtonText}>Save Settings</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'notifications' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notification Preferences</Text>
              <Text style={styles.sectionDescription}>
                Configure which notifications admins receive
              </Text>

              <View style={styles.moduleList}>
                <View style={styles.moduleItem}>
                  <View style={styles.moduleInfo}>
                    <Users size={22} color={LightTheme.primary} />
                    <View style={styles.moduleText}>
                      <Text style={styles.moduleTitle}>New Members</Text>
                      <Text style={styles.moduleDescription}>When someone joins the church</Text>
                    </View>
                  </View>
                  <Switch
                    value={notificationPreferences.newMembers}
                    onValueChange={() => handleToggleNotification('newMembers')}
                    trackColor={{ false: LightTheme.border, true: LightTheme.primary + '50' }}
                    thumbColor={notificationPreferences.newMembers ? LightTheme.primary : LightTheme.textTertiary}
                  />
                </View>

                <View style={styles.moduleItem}>
                  <View style={styles.moduleInfo}>
                    <Calendar size={22} color={LightTheme.warning} />
                    <View style={styles.moduleText}>
                      <Text style={styles.moduleTitle}>Events</Text>
                      <Text style={styles.moduleDescription}>Event reminders and updates</Text>
                    </View>
                  </View>
                  <Switch
                    value={notificationPreferences.events}
                    onValueChange={() => handleToggleNotification('events')}
                    trackColor={{ false: LightTheme.border, true: LightTheme.primary + '50' }}
                    thumbColor={notificationPreferences.events ? LightTheme.primary : LightTheme.textTertiary}
                  />
                </View>

                <View style={styles.moduleItem}>
                  <View style={styles.moduleInfo}>
                    <Megaphone size={22} color={LightTheme.success} />
                    <View style={styles.moduleText}>
                      <Text style={styles.moduleTitle}>Announcements</Text>
                      <Text style={styles.moduleDescription}>New announcements posted</Text>
                    </View>
                  </View>
                  <Switch
                    value={notificationPreferences.announcements}
                    onValueChange={() => handleToggleNotification('announcements')}
                    trackColor={{ false: LightTheme.border, true: LightTheme.primary + '50' }}
                    thumbColor={notificationPreferences.announcements ? LightTheme.primary : LightTheme.textTertiary}
                  />
                </View>

                <View style={styles.moduleItem}>
                  <View style={styles.moduleInfo}>
                    <DollarSign size={22} color="#8B5CF6" />
                    <View style={styles.moduleText}>
                      <Text style={styles.moduleTitle}>Donations</Text>
                      <Text style={styles.moduleDescription}>When donations are received</Text>
                    </View>
                  </View>
                  <Switch
                    value={notificationPreferences.donations}
                    onValueChange={() => handleToggleNotification('donations')}
                    trackColor={{ false: LightTheme.border, true: LightTheme.primary + '50' }}
                    thumbColor={notificationPreferences.donations ? LightTheme.primary : LightTheme.textTertiary}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, updateSettingsMutation.isPending && styles.saveButtonDisabled]}
                onPress={handleSaveSettings}
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Save size={18} color="#FFF" />
                    <Text style={styles.saveButtonText}>Save Preferences</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'members' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Church Members</Text>
              <Text style={styles.sectionDescription}>
                Manage member roles and permissions
              </Text>

              {membersQuery.isLoading ? (
                <ActivityIndicator size="small" color={LightTheme.primary} style={styles.loading} />
              ) : membersQuery.data && membersQuery.data.length > 0 ? (
                <View style={styles.memberList}>
                  {membersQuery.data.map((member) => (
                    <View key={member.id} style={styles.memberItem}>
                      <View style={styles.memberInfo}>
                        <View style={styles.memberAvatar}>
                          <Text style={styles.memberInitial}>
                            {member.name?.charAt(0).toUpperCase() || '?'}
                          </Text>
                        </View>
                        <View style={styles.memberDetails}>
                          <Text style={styles.memberName}>{member.name}</Text>
                          <Text style={styles.memberRole}>
                            {member.role?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </Text>
                        </View>
                      </View>
                      {isSuperAdmin && member.userId !== currentUserId && (
                        <View style={styles.memberActions}>
                          <TouchableOpacity
                            style={styles.memberActionButton}
                            onPress={() => handleChangeMemberRole(member.id, member.role)}
                          >
                            <ChevronRight size={18} color={LightTheme.textSecondary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.memberActionButton}
                            onPress={() => handleRemoveMember(member.id, member.name)}
                          >
                            <Trash2 size={18} color={LightTheme.error} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Users size={40} color={LightTheme.textTertiary} />
                  <Text style={styles.emptyText}>No members yet</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LightTheme.background,
  },
  flex1: {
    flex: 1,
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
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: LightTheme.text,
  },
  placeholder: {
    width: 40,
  },
  churchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: LightTheme.surface,
    borderBottomWidth: 1,
    borderBottomColor: LightTheme.border,
  },
  churchIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: LightTheme.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  churchDetails: {
    marginLeft: 12,
    flex: 1,
  },
  churchName: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: LightTheme.text,
  },
  churchRole: {
    fontSize: 14,
    color: LightTheme.primary,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: LightTheme.surface,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: LightTheme.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: LightTheme.primary + '15',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: LightTheme.textSecondary,
  },
  tabTextActive: {
    color: LightTheme.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: LightTheme.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: LightTheme.textSecondary,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: LightTheme.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: LightTheme.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: LightTheme.text,
    borderWidth: 1,
    borderColor: LightTheme.border,
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: LightTheme.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: LightTheme.border,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: LightTheme.text,
  },
  settingDescription: {
    fontSize: 13,
    color: LightTheme.textSecondary,
    marginTop: 2,
  },
  visibilityButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: LightTheme.surfaceSecondary,
  },
  visibilityButtonActive: {
    backgroundColor: LightTheme.primary + '20',
  },
  visibilityButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: LightTheme.textSecondary,
  },
  visibilityButtonTextActive: {
    color: LightTheme.primary,
  },
  moduleList: {
    gap: 12,
  },
  moduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: LightTheme.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: LightTheme.border,
  },
  moduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  moduleText: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: LightTheme.text,
  },
  moduleDescription: {
    fontSize: 13,
    color: LightTheme.textSecondary,
    marginTop: 2,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LightTheme.primary,
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  memberList: {
    gap: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: LightTheme.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: LightTheme.border,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: LightTheme.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitial: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: LightTheme.primary,
  },
  memberDetails: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: LightTheme.text,
  },
  memberRole: {
    fontSize: 13,
    color: LightTheme.textSecondary,
    marginTop: 2,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  memberActionButton: {
    padding: 8,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: LightTheme.text,
    marginTop: 16,
  },
  errorText: {
    fontSize: 15,
    color: LightTheme.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  loadingText: {
    fontSize: 15,
    color: LightTheme.textSecondary,
    marginTop: 12,
  },
  primaryButton: {
    backgroundColor: LightTheme.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 24,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: LightTheme.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 24,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: LightTheme.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: LightTheme.textSecondary,
    marginTop: 12,
  },
  loading: {
    paddingVertical: 40,
  },
});
