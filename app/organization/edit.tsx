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
import { ArrowLeft, Building2, Check, Camera, MapPin, Phone, Mail, Globe } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { trpc } from '@/lib/trpc';

const LOGO_OPTIONS = [
  'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1519491050282-cf00c82424bd?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1548625149-fc4a29cf7092?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1473177104440-ffee2f376098?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1545296664-39db56ad95bd?w=200&h=200&fit=crop',
];

export default function EditOrganizationScreen() {
  const router = useRouter();
  const { currentOrganization, setCurrentOrganization, currentMembership } = useAuth();
  
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

  const membershipQuery = trpc.organizations.getMembership.useQuery(
    { organizationId: currentOrganization?.id || '' },
    { enabled: !!currentOrganization?.id }
  );

  useEffect(() => {
    if (!currentOrganization) {
      setCheckingPermission(false);
      return;
    }

    if (membershipQuery.isLoading) return;

    const membership = membershipQuery.data;
    const hasPermission = membership && 
      (membership.role === 'super_admin' || membership.role === 'organization_admin');
    setCanEdit(hasPermission ?? false);
    setCheckingPermission(false);
  }, [currentOrganization, membershipQuery.data, membershipQuery.isLoading]);

  const updateMutation = trpc.organizations.update.useMutation({
    onSuccess: async (updatedOrg) => {
      console.log('Organization updated successfully:', updatedOrg?.name);
      if (updatedOrg) {
        await setCurrentOrganization(updatedOrg, currentMembership);
      }
      Alert.alert('Success', 'Church profile updated!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error) => {
      console.error('Update organization error:', error.message);
      Alert.alert('Error', error.message || 'Failed to update church profile');
    },
  });

  const handleSave = () => {
    if (!currentOrganization) {
      Alert.alert('Error', 'No organization selected');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a church name');
      return;
    }
    if (!description.trim() || description.length < 10) {
      Alert.alert('Error', 'Please enter a description (at least 10 characters)');
      return;
    }
    updateMutation.mutate({
      id: currentOrganization.id,
      name: name.trim(),
      description: description.trim(),
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      website: website.trim() || undefined,
      logo: logo || undefined,
    });
  };

  const selectLogo = (url: string) => {
    setLogo(url);
    setShowLogoPicker(false);
  };

  if (checkingPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Checking permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentOrganization) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Church</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Building2 size={64} color={Colors.textTertiary} />
          <Text style={styles.errorTitle}>No Church Selected</Text>
          <Text style={styles.errorText}>Please select a church first</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => router.push('/organization' as any)}
          >
            <Text style={styles.errorButtonText}>Select Church</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!canEdit) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Church</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Building2 size={64} color={Colors.textTertiary} />
          <Text style={styles.errorTitle}>Permission Denied</Text>
          <Text style={styles.errorText}>
            Only admins can edit the church profile
          </Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Church</Text>
          <TouchableOpacity
            style={[styles.saveButton, updateMutation.isPending && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Check size={20} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
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
                <Camera size={20} color="#FFF" />
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

          <View style={{ height: 100 }} />
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
  saveButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    position: 'relative',
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: Colors.surface,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 24,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.surface,
  },
  logoHint: {
    fontSize: 14,
    color: Colors.primary,
    marginTop: 8,
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
    width: 72,
    height: 72,
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
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
});
