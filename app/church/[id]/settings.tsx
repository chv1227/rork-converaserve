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
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { trpc } from '@/lib/trpc';

export default function ChurchSettingsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated, user } = useAuth();
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

  const churchQuery = trpc.churches.getById.useQuery(
    { id: id || '' },
    { enabled: !!id }
  );

  const membershipQuery = trpc.churches.getMembership.useQuery(
    { churchId: id || '' },
    { enabled: !!id && isAuthenticated }
  );

  const settingsQuery = trpc.churches.getSettings.useQuery(
    { churchId: id || '' },
    { enabled: !!id && isAuthenticated && (membershipQuery.data?.role === 'super_admin' || membershipQuery.data?.role === 'admin') }
  );

  const membersQuery = trpc.churches.getMembers.useQuery(
    { churchId: id || '' },
    { enabled: !!id && isAuthenticated && activeTab === 'members' }
  );

  const updateChurchMutation = trpc.churches.update.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'Church profile updated successfully');
      churchQuery.refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to update church');
    },
  });

  const updateSettingsMutation = trpc.churches.updateSettings.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'Settings updated successfully');
      settingsQuery.refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to update settings');
    },
  });

  const updateMemberRoleMutation = trpc.churches.updateMemberRole.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'Member role updated');
      membersQuery.refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to update role');
    },
  });

  const removeMemberMutation = trpc.churches.removeMember.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'Member removed');
      membersQuery.refetch();
    },
    onError: (error) => {
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

  const isAdmin = membershipQuery.data?.role === 'super_admin' || membershipQuery.data?.role === 'admin';
  const isSuperAdmin = membershipQuery.data?.role === 'super_admin';

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
          <Shield size={48} color={Colors.textTertiary} />
          <Text style={styles.errorTitle}>Sign In Required</Text>
          <Text style={styles.errorText}>Please sign in to access church settings</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/login')}>
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
          <ActivityIndicator size="large" color={Colors.primary} />
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
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.centerContainer}>
          <Shield size={48} color={Colors.error} />
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
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Church Settings</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.churchInfo}>
          <View style={styles.churchIcon}>
            <Church size={24} color={Colors.primary} />
          </View>
          <View style={styles.churchDetails}>
            <Text style={styles.churchName}>{churchQuery.data?.name}</Text>
            <Text style={styles.churchRole}>
              {membershipQuery.data?.role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
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
                <Icon size={18} color={isActive ? Colors.primary : Colors.textSecondary} />
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
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Church description"
                  placeholderTextColor={Colors.textTertiary}
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
                  placeholderTextColor={Colors.textTertiary}
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
                  placeholderTextColor={Colors.textTertiary}
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
                  placeholderTextColor={Colors.textTertiary}
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
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  {visibility === 'public' ? (
                    <Eye size={20} color={Colors.primary} />
                  ) : (
                    <EyeOff size={20} color={Colors.textSecondary} />
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
                    <Calendar size={22} color={Colors.primary} />
                    <View style={styles.moduleText}>
                      <Text style={styles.moduleTitle}>Events</Text>
                      <Text style={styles.moduleDescription}>Church events and calendar</Text>
                    </View>
                  </View>
                  <Switch
                    value={modulesEnabled.events}
                    onValueChange={() => handleToggleModule('events')}
                    trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
                    thumbColor={modulesEnabled.events ? Colors.primary : Colors.textTertiary}
                  />
                </View>

                <View style={styles.moduleItem}>
                  <View style={styles.moduleInfo}>
                    <Megaphone size={22} color={Colors.warning} />
                    <View style={styles.moduleText}>
                      <Text style={styles.moduleTitle}>Announcements</Text>
                      <Text style={styles.moduleDescription}>Church-wide announcements</Text>
                    </View>
                  </View>
                  <Switch
                    value={modulesEnabled.announcements}
                    onValueChange={() => handleToggleModule('announcements')}
                    trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
                    thumbColor={modulesEnabled.announcements ? Colors.primary : Colors.textTertiary}
                  />
                </View>

                <View style={styles.moduleItem}>
                  <View style={styles.moduleInfo}>
                    <DollarSign size={22} color={Colors.success} />
                    <View style={styles.moduleText}>
                      <Text style={styles.moduleTitle}>Donations</Text>
                      <Text style={styles.moduleDescription}>Tithes and offerings</Text>
                    </View>
                  </View>
                  <Switch
                    value={modulesEnabled.donations}
                    onValueChange={() => handleToggleModule('donations')}
                    trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
                    thumbColor={modulesEnabled.donations ? Colors.primary : Colors.textTertiary}
                  />
                </View>

                <View style={styles.moduleItem}>
                  <View style={styles.moduleInfo}>
                    <Video size={22} color={Colors.error} />
                    <View style={styles.moduleText}>
                      <Text style={styles.moduleTitle}>Media</Text>
                      <Text style={styles.moduleDescription}>Sermons and videos</Text>
                    </View>
                  </View>
                  <Switch
                    value={modulesEnabled.media}
                    onValueChange={() => handleToggleModule('media')}
                    trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
                    thumbColor={modulesEnabled.media ? Colors.primary : Colors.textTertiary}
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
                    trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
                    thumbColor={modulesEnabled.ministries ? Colors.primary : Colors.textTertiary}
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
                    trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
                    thumbColor={modulesEnabled.messaging ? Colors.primary : Colors.textTertiary}
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
                    <Users size={22} color={Colors.primary} />
                    <View style={styles.moduleText}>
                      <Text style={styles.moduleTitle}>New Members</Text>
                      <Text style={styles.moduleDescription}>When someone joins the church</Text>
                    </View>
                  </View>
                  <Switch
                    value={notificationPreferences.newMembers}
                    onValueChange={() => handleToggleNotification('newMembers')}
                    trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
                    thumbColor={notificationPreferences.newMembers ? Colors.primary : Colors.textTertiary}
                  />
                </View>

                <View style={styles.moduleItem}>
                  <View style={styles.moduleInfo}>
                    <Calendar size={22} color={Colors.warning} />
                    <View style={styles.moduleText}>
                      <Text style={styles.moduleTitle}>Events</Text>
                      <Text style={styles.moduleDescription}>Event reminders and updates</Text>
                    </View>
                  </View>
                  <Switch
                    value={notificationPreferences.events}
                    onValueChange={() => handleToggleNotification('events')}
                    trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
                    thumbColor={notificationPreferences.events ? Colors.primary : Colors.textTertiary}
                  />
                </View>

                <View style={styles.moduleItem}>
                  <View style={styles.moduleInfo}>
                    <Megaphone size={22} color={Colors.success} />
                    <View style={styles.moduleText}>
                      <Text style={styles.moduleTitle}>Announcements</Text>
                      <Text style={styles.moduleDescription}>New announcements posted</Text>
                    </View>
                  </View>
                  <Switch
                    value={notificationPreferences.announcements}
                    onValueChange={() => handleToggleNotification('announcements')}
                    trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
                    thumbColor={notificationPreferences.announcements ? Colors.primary : Colors.textTertiary}
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
                    trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
                    thumbColor={notificationPreferences.donations ? Colors.primary : Colors.textTertiary}
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
                <ActivityIndicator size="small" color={Colors.primary} style={styles.loading} />
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
                            {member.role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Text>
                        </View>
                      </View>
                      {isSuperAdmin && member.userId !== currentUserId && (
                        <View style={styles.memberActions}>
                          <TouchableOpacity
                            style={styles.memberActionButton}
                            onPress={() => handleChangeMemberRole(member.id, member.role)}
                          >
                            <ChevronRight size={18} color={Colors.textSecondary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.memberActionButton}
                            onPress={() => handleRemoveMember(member.id, member.name)}
                          >
                            <Trash2 size={18} color={Colors.error} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Users size={40} color={Colors.textTertiary} />
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
    backgroundColor: Colors.background,
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
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  churchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  churchIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '15',
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
    color: Colors.text,
  },
  churchRole: {
    fontSize: 14,
    color: Colors.primary,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
    backgroundColor: Colors.primary + '15',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
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
    color: Colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.text,
  },
  settingDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  visibilityButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
  },
  visibilityButtonActive: {
    backgroundColor: Colors.primary + '20',
  },
  visibilityButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  visibilityButtonTextActive: {
    color: Colors.primary,
  },
  moduleList: {
    gap: 12,
  },
  moduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.text,
  },
  moduleDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitial: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  memberDetails: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  memberRole: {
    fontSize: 13,
    color: Colors.textSecondary,
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
    color: Colors.text,
    marginTop: 16,
  },
  errorText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
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
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 24,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  loading: {
    paddingVertical: 40,
  },
});
