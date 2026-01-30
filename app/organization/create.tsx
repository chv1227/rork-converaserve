import React, { useState, useCallback } from 'react';
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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Building2, Check, Mail, Lock, Eye, EyeOff, User, Phone, LogIn, UserPlus, X, Send, RefreshCw } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { getSupabaseClient } from '@/lib/supabase-auth';
import { trpc } from '@/lib/trpc';

export default function CreateOrganizationScreen() {
  const router = useRouter();
  const { setCurrentOrganization, isAuthenticated, login, register } = useAuth();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  // Auth modal states
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Verification modal states
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');
  const [isCreatingAfterAuth, setIsCreatingAfterAuth] = useState(false);

  const createMutation = trpc.organizations.create.useMutation({
    onSuccess: async (data) => {
      console.log('Organization created successfully:', data.organization.name);
      setIsCreatingAfterAuth(false);
      await setCurrentOrganization(data.organization, {
        id: data.membership.id,
        organizationId: data.organization.id,
        role: 'super_admin',
        joinedAt: data.membership.joinedAt,
      });
      Alert.alert('Success', 'Your church has been created!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
    },
    onError: (error) => {
      console.error('Create organization error:', error.message);
      setIsCreatingAfterAuth(false);
      
      let errorMessage = error.message || 'Failed to create organization';
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network')) {
        errorMessage = 'Unable to connect to server. Please check your internet connection and try again.';
      } else if (errorMessage.includes('logged in')) {
        errorMessage = 'Please sign in again to create your church.';
      }
      
      Alert.alert('Error', errorMessage);
    },
  });

  const createOrg = createMutation.mutate;
  const isCreating = createMutation.isPending;

  const executeCreate = useCallback(() => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a church name');
      return false;
    }
    if (!description.trim() || description.length < 10) {
      Alert.alert('Error', 'Please enter a description (at least 10 characters)');
      return false;
    }

    console.log('Executing organization create via Supabase');

    createOrg({
      name: name.trim(),
      description: description.trim(),
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      website: website.trim() || undefined,
    });
    return true;
  }, [name, description, address, phone, email, website, createOrg]);

  const handleCreate = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    executeCreate();
  };

  const handleSignIn = async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Please fill in all fields');
      return;
    }

    setAuthLoading(true);
    setAuthError('');

    const result = await login(authEmail.trim(), authPassword);

    if (result.success) {
      console.log('Sign in successful, creating organization...');
      setShowAuthModal(false);
      resetAuthForm();
      
      // Small delay to ensure auth state is updated, then create
      setIsCreatingAfterAuth(true);
      setTimeout(() => {
        const success = executeCreate();
        if (!success) {
          setIsCreatingAfterAuth(false);
        }
      }, 300);
    } else {
      setAuthError(result.error || 'Sign in failed');
    }

    setAuthLoading(false);
  };

  const handleSignUp = async () => {
    if (!authName.trim() || !authEmail.trim() || !authPassword.trim()) {
      setAuthError('Please fill in all required fields');
      return;
    }

    if (authPassword !== confirmPassword) {
      setAuthError('Passwords do not match');
      return;
    }

    if (authPassword.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }

    setAuthLoading(true);
    setAuthError('');

    const result = await register(authEmail.trim(), authPassword, authName.trim(), authPhone.trim() || undefined);

    if (result.success) {
      if (result.error && result.error.includes('verify your email')) {
        // Email verification required
        setVerificationEmail(authEmail.trim());
        setShowAuthModal(false);
        setShowVerificationModal(true);
      } else {
        // Registration successful and auto-logged in
        console.log('Registration successful, creating organization...');
        setShowAuthModal(false);
        resetAuthForm();
        
        // Small delay to ensure auth state is updated, then create
        setIsCreatingAfterAuth(true);
        setTimeout(() => {
          const success = executeCreate();
          if (!success) {
            setIsCreatingAfterAuth(false);
          }
        }, 300);
      }
    } else {
      setAuthError(result.error || 'Registration failed');
    }

    setAuthLoading(false);
  };

  const resetAuthForm = () => {
    setAuthEmail('');
    setAuthPassword('');
    setAuthName('');
    setAuthPhone('');
    setConfirmPassword('');
    setAuthError('');
  };

  const handleResendVerification = async () => {
    if (!verificationEmail) return;
    
    setIsResending(true);
    setResendError('');
    setResendSuccess(false);
    
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: verificationEmail,
      });
      
      if (error) {
        setResendError(error.message || 'Failed to resend verification email');
      } else {
        setResendSuccess(true);
      }
    } catch {
      setResendError('Failed to resend verification email');
    }
    
    setIsResending(false);
  };

  const closeVerificationModal = () => {
    setShowVerificationModal(false);
    setResendSuccess(false);
    setResendError('');
    resetAuthForm();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Church</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.iconContainer}>
            <Building2 size={48} color={Colors.primary} />
          </View>

          <Text style={styles.title}>Create Your Church</Text>
          <Text style={styles.subtitle}>
            Set up your church organization to connect with your community.
          </Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Church Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Grace Community Church"
                placeholderTextColor={Colors.textSecondary}
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
                placeholderTextColor={Colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={styles.input}
                placeholder="123 Faith Avenue, City, State"
                placeholderTextColor={Colors.textSecondary}
                value={address}
                onChangeText={setAddress}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="+1 (555) 123-4567"
                placeholderTextColor={Colors.textSecondary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="info@yourchurch.org"
                placeholderTextColor={Colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Website</Text>
              <TextInput
                style={styles.input}
                placeholder="https://yourchurch.org"
                placeholderTextColor={Colors.textSecondary}
                value={website}
                onChangeText={setWebsite}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.createButton, (isCreating || isCreatingAfterAuth) && styles.createButtonDisabled]}
            onPress={handleCreate}
            disabled={isCreating || isCreatingAfterAuth}
          >
            {isCreating || isCreatingAfterAuth ? (
              <>
                <ActivityIndicator color="#FFF" />
                <Text style={styles.createButtonText}>Creating...</Text>
              </>
            ) : (
              <>
                {isAuthenticated ? (
                  <>
                    <Check size={20} color="#FFF" />
                    <Text style={styles.createButtonText}>Create Church</Text>
                  </>
                ) : (
                  <>
                    <LogIn size={20} color="#FFF" />
                    <Text style={styles.createButtonText}>Sign In to Create Church</Text>
                  </>
                )}
              </>
            )}
          </TouchableOpacity>

          {!isAuthenticated && (
            <Text style={styles.authHint}>
              You need to sign in or create an account to register your church.
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Auth Modal */}
      <Modal
        visible={showAuthModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAuthModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {authMode === 'signin' ? 'Sign In' : 'Create Account'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAuthModal(false);
                  resetAuthForm();
                }}
                style={styles.closeButton}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.authTabs}>
              <TouchableOpacity
                style={[styles.authTab, authMode === 'signin' && styles.authTabActive]}
                onPress={() => {
                  setAuthMode('signin');
                  setAuthError('');
                }}
              >
                <LogIn size={18} color={authMode === 'signin' ? Colors.primary : Colors.textSecondary} />
                <Text style={[styles.authTabText, authMode === 'signin' && styles.authTabTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.authTab, authMode === 'signup' && styles.authTabActive]}
                onPress={() => {
                  setAuthMode('signup');
                  setAuthError('');
                }}
              >
                <UserPlus size={18} color={authMode === 'signup' ? Colors.primary : Colors.textSecondary} />
                <Text style={[styles.authTabText, authMode === 'signup' && styles.authTabTextActive]}>
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {authError ? (
                <View style={styles.authErrorContainer}>
                  <Text style={styles.authErrorText}>{authError}</Text>
                </View>
              ) : null}

              {authMode === 'signup' && (
                <View style={styles.authInputContainer}>
                  <View style={styles.authInputIcon}>
                    <User size={20} color={Colors.textSecondary} />
                  </View>
                  <TextInput
                    style={styles.authInput}
                    placeholder="Full name *"
                    placeholderTextColor={Colors.textTertiary}
                    value={authName}
                    onChangeText={setAuthName}
                    autoCapitalize="words"
                    editable={!authLoading}
                  />
                </View>
              )}

              <View style={styles.authInputContainer}>
                <View style={styles.authInputIcon}>
                  <Mail size={20} color={Colors.textSecondary} />
                </View>
                <TextInput
                  style={styles.authInput}
                  placeholder="Email address *"
                  placeholderTextColor={Colors.textTertiary}
                  value={authEmail}
                  onChangeText={setAuthEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!authLoading}
                />
              </View>

              {authMode === 'signup' && (
                <View style={styles.authInputContainer}>
                  <View style={styles.authInputIcon}>
                    <Phone size={20} color={Colors.textSecondary} />
                  </View>
                  <TextInput
                    style={styles.authInput}
                    placeholder="Phone number (optional)"
                    placeholderTextColor={Colors.textTertiary}
                    value={authPhone}
                    onChangeText={setAuthPhone}
                    keyboardType="phone-pad"
                    editable={!authLoading}
                  />
                </View>
              )}

              <View style={styles.authInputContainer}>
                <View style={styles.authInputIcon}>
                  <Lock size={20} color={Colors.textSecondary} />
                </View>
                <TextInput
                  style={styles.authInput}
                  placeholder="Password *"
                  placeholderTextColor={Colors.textTertiary}
                  value={authPassword}
                  onChangeText={setAuthPassword}
                  secureTextEntry={!showPassword}
                  editable={!authLoading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={Colors.textSecondary} />
                  ) : (
                    <Eye size={20} color={Colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>

              {authMode === 'signup' && (
                <View style={styles.authInputContainer}>
                  <View style={styles.authInputIcon}>
                    <Lock size={20} color={Colors.textSecondary} />
                  </View>
                  <TextInput
                    style={styles.authInput}
                    placeholder="Confirm password *"
                    placeholderTextColor={Colors.textTertiary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    editable={!authLoading}
                  />
                </View>
              )}

              <TouchableOpacity
                style={[styles.authSubmitButton, authLoading && styles.authSubmitButtonDisabled]}
                onPress={authMode === 'signin' ? handleSignIn : handleSignUp}
                disabled={authLoading}
              >
                {authLoading ? (
                  <ActivityIndicator color={Colors.textInverse} />
                ) : (
                  <Text style={styles.authSubmitButtonText}>
                    {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Verification Modal */}
      <Modal
        visible={showVerificationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeVerificationModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verify Your Email</Text>
              <TouchableOpacity onPress={closeVerificationModal} style={styles.closeButton}>
                <X size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.verificationContainer}>
              <View style={styles.verificationIcon}>
                <Send size={32} color={Colors.primary} />
              </View>
              <Text style={styles.verificationTitle}>Check Your Inbox</Text>
              <Text style={styles.verificationText}>
                We&apos;ve sent a verification link to{"\n"}
                <Text style={styles.verificationEmailText}>{verificationEmail}</Text>
              </Text>
              <Text style={styles.verificationHint}>
                Click the link in the email to verify your account, then sign in to create your church.
              </Text>

              {resendError ? (
                <View style={styles.resendErrorContainer}>
                  <Text style={styles.resendErrorText}>{resendError}</Text>
                </View>
              ) : null}

              {resendSuccess ? (
                <View style={styles.resendSuccessContainer}>
                  <Text style={styles.resendSuccessText}>Verification email sent!</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.resendButton, isResending && styles.resendButtonDisabled]}
                onPress={handleResendVerification}
                disabled={isResending}
              >
                {isResending ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <>
                    <RefreshCw size={18} color={Colors.primary} />
                    <Text style={styles.resendButtonText}>Resend Verification Email</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.doneButton}
                onPress={closeVerificationModal}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
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
  keyboardView: {
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    marginTop: 32,
    gap: 8,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  authHint: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  authTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  authTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
  },
  authTabActive: {
    backgroundColor: Colors.primary + '15',
  },
  authTabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  authTabTextActive: {
    color: Colors.primary,
  },
  authErrorContainer: {
    backgroundColor: Colors.error + '15',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  authErrorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  authInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  authInputIcon: {
    paddingLeft: 16,
  },
  authInput: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    fontSize: 16,
    color: Colors.text,
  },
  eyeIcon: {
    paddingRight: 16,
  },
  authSubmitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  authSubmitButtonDisabled: {
    opacity: 0.7,
  },
  authSubmitButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
  verificationContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  verificationIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  verificationTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  verificationText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  verificationEmailText: {
    fontWeight: '600' as const,
    color: Colors.text,
  },
  verificationHint: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
  resendErrorContainer: {
    backgroundColor: Colors.error + '15',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    width: '100%',
  },
  resendErrorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  resendSuccessContainer: {
    backgroundColor: Colors.success + '15',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    width: '100%',
  },
  resendSuccessText: {
    color: Colors.success,
    fontSize: 14,
    textAlign: 'center',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 16,
    marginTop: 24,
    width: '100%',
  },
  resendButtonDisabled: {
    opacity: 0.6,
  },
  resendButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  doneButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginTop: 12,
    width: '100%',
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
});
