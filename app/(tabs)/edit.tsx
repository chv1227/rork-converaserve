import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Building2, Check, Camera, MapPin, Phone, Mail, Globe, AlertCircle, Plus } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { updateOrganization, getUserMembership } from '@/lib/supabase-organizations';
import { useMutation } from '@tanstack/react-query';

const LOGO_OPTIONS = [
  'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1519491050282-cf00c82424bd?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1548625149-fc4a29cf7092?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1473177104440-ffee2f376098?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1545296664-39db56ad95bd?w=200&h=200&fit=crop',
];

export default function EditChurchTab() {
  const router = useRouter();
  const { currentOrganization, setCurrentOrganization, currentMembership, isAuthenticated } = useAuth();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [logo, setLogo] = useState('');
  const [showLogoPicker, setShowLogoPicker] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);

  useEffect(() => {
    if (currentOrganization) {
      setName(currentOrganization.name || '');
      setDescription(currentOrganization.description || '');
      setAddress(currentOrganization.address || '');
      setPhone(currentOrganization.phone || '');
      setEmail(currentOrganization.email || '');
      setWebsite(currentOrganization.website || '');
      setLogo(currentOrganization.logo || '');
    }
  }, [currentOrganization]);

  useEffect(() => {
    const checkPermission = async () => {
      if (!currentOrganization) {
        setCheckingPermission(false);
        setCanEdit(false);
        return;
      }

      try {
        const membership = await getUserMembership(currentOrganization.id);
        const hasPermission = membership && 
          (membership.role === 'super_admin' || membership.role === 'organization_admin');
        setCanEdit(hasPermission ?? false);
      } catch (error) {
        console.error('Error checking permission:', error);
        setCanEdit(false);
      }
      setCheckingPermission(false);
    };

    checkPermission();
  }, [currentOrganization]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrganization) throw new Error('No organization selected');
      return await updateOrganization(currentOrganization.id, {
        name: name.trim(),
        description: description.trim(),
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        website: website.trim() || undefined,
        logo: logo || undefined,
      });
    },
    onSuccess: async (updatedOrg) => {
      console.log('Organization updated successfully:', updatedOrg.name);
      await setCurrentOrganization(updatedOrg, currentMembership);
      Alert.alert('Success', 'Church profile updated!');
    },
    onError: (error: Error) => {
      console.error('Update organization error:', error.message);
      Alert.alert('Error', error.message || 'Failed to update church profile');
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a church name');
      return;
    }
    if (!description.trim() || description.length < 10) {
      Alert.alert('Error', 'Please enter a description (at least 10 characters)');
      return;
    }
    updateMutation.mutate();
  };

  const selectLogo = (url: string) => {
    setLogo(url);
    setShowLogoPicker(false);
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Edit Church</Text>
        </View>
        <View style={styles.emptyContainer}>
          <AlertCircle size={64} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>Sign In Required</Text>
          <Text style={styles.emptyText}>Please sign in to manage your church</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (checkingPermission) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Edit Church</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentOrganization) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Edit Church</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Building2 size={64} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No Church Connected</Text>
          <Text style={styles.emptyText}>Create or join a church to manage it here</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/organization/create')}
          >
            <Plus size={20} color="#FFF" />
            <Text style={styles.primaryButtonText}>Create Church</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/organization/join')}
          >
            <Text style={styles.secondaryButtonText}>Join Existing Church</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!canEdit) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Edit Church</Text>
        </View>
        <View style={styles.emptyContainer}>
          <AlertCircle size={64} color={Colors.warning} />
          <Text style={styles.emptyTitle}>Permission Required</Text>
          <Text style={styles.emptyText}>
            Only church admins can edit the church profile
          </Text>
          <View style={styles.churchInfoCard}>
            {currentOrganization.logo && (
              <Image 
                source={{ uri: currentOrganization.logo }} 
                style={styles.churchInfoLogo} 
                contentFit="cover" 
              />
            )}
            <Text style={styles.churchInfoName}>{currentOrganization.name}</Text>
            <Text style={styles.churchInfoDesc} numberOfLines={2}>
              {currentOrganization.description}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Edit Church</Text>
          <TouchableOpacity
            style={[styles.saveButton, updateMutation.isPending && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Check size={18} color="#FFF" />
                <Text style={styles.saveButtonText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoSection}>
            <TouchableOpacity
              style={styles.logoContainer}
              onPress={() => setShowLogoPicker(!showLogoPicker)}
            >
              {logo ? (
                <Image source={{ uri: logo }} style={styles.logoImage} contentFit="cover" />
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
                    style={[styles.logoOption, logo === url && styles.logoOptionSelected]}
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
                style={styles.input}
                placeholder="e.g., Grace Community Church"
                placeholderTextColor={Colors.textTertiary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell us about your church..."
                placeholderTextColor={Colors.textTertiary}
                value={description}
                onChangeText={setDescription}
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
                  value={address}
                  onChangeText={setAddress}
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
                  value={phone}
                  onChangeText={setPhone}
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
                  value={email}
                  onChangeText={setEmail}
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
                  value={website}
                  onChangeText={setWebsite}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => router.push('/organization/admin')}
          >
            <Text style={styles.adminButtonText}>Church Admin Panel</Text>
          </TouchableOpacity>

          <View style={{ height: 120 }} />
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
  keyboardView: {
    flex: 1,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 28,
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 25,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  secondaryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.primary,
  },
  churchInfoCard: {
    marginTop: 32,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  churchInfoLogo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginBottom: 12,
  },
  churchInfoName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center',
  },
  churchInfoDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
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
  input: {
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
});
