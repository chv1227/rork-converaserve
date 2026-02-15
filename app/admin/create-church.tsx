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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  Church, 
  Check, 
  MapPin, 
  Mail, 
  Phone, 
  Globe, 
  Image as ImageIcon,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  ChevronDown,
  ChevronUp,
  Shield,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const DENOMINATIONS = [
  'Non-Denominational',
  'Baptist',
  'Catholic',
  'Methodist',
  'Lutheran',
  'Presbyterian',
  'Pentecostal',
  'Anglican/Episcopal',
  'Orthodox',
  'Evangelical',
  'Assembly of God',
  'Church of Christ',
  'Seventh-day Adventist',
  'Other',
];

const COUNTRIES = [
  'United States',
  'Canada',
  'United Kingdom',
  'Australia',
  'Nigeria',
  'Ghana',
  'Kenya',
  'South Africa',
  'Philippines',
  'India',
  'Other',
];

export default function AdminCreateChurchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { isAuthenticated, isAdmin, setCurrentOrganization, refreshOrganizations } = useAuth();
  
  const [name, setName] = useState('');
  const [denomination, setDenomination] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('United States');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [logo, setLogo] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [youtube, setYoutube] = useState('');
  
  const [showDenominationPicker, setShowDenominationPicker] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [showSocialLinks, setShowSocialLinks] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      console.log("Non-admin user attempted to access church creation, redirecting...");
      if (Platform.OS === "web") {
        router.replace("/(tabs)");
      } else {
        Alert.alert("Access Denied", "You don't have permission to create churches.", [
          { text: "OK", onPress: () => router.replace("/(tabs)") },
        ]);
      }
    }
  }, [isAdmin, router]);

  const createChurchMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      denomination?: string;
      description: string;
      address: string;
      city: string;
      state: string;
      zip: string;
      country: string;
      email: string;
      phone: string;
      website?: string;
      logo?: string;
      bannerImage?: string;
      socialLinks?: { facebook?: string; instagram?: string; twitter?: string; youtube?: string };
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      
      const { data: church, error } = await (supabase
        .from('churches') as any)
        .insert({
          name: data.name,
          description: data.description,
          address_line1: data.address,
          contact_email: data.email,
          contact_phone: data.phone,
          website: data.website,
          logo_url: data.logo,
          owner_user_id: userData.user.id,
          denomination: data.denomination,
          city: data.city || null,
          state: data.state || null,
          postal_code: data.zip || null,
          country: data.country || 'United States',
        })
        .select()
        .single();
      
      if (error) throw error;
      const org = church as { id: string; name: string; owner_user_id: string };
      
      await (supabase.from('user_church_roles') as any).insert({
        user_id: userData.user.id,
        church_id: org.id,
        role: 'owner',
        is_active: true,
      });
      
      return { 
        church: { 
          ...org, 
          name: org.name, 
          id: org.id, 
          createdBy: org.owner_user_id,
          description: data.description,
          logo: data.logo,
          email: data.email,
          phone: data.phone,
          website: data.website,
          address: data.address,
        }, 
        settings: { id: org.id }, 
        membership: { id: org.id } 
      };
    },
    onSuccess: async (data: { church: { name: string; id: string; createdBy: string; description?: string; logo?: string; email?: string; phone?: string; website?: string; address?: string }; settings: { id: string }; membership: { id: string } }) => {
      console.log('=== Church Creation Success ===' );
      console.log('Church created successfully:', data.church.name);
      console.log('Church ID:', data.church.id);
      console.log('Created by:', data.church.createdBy);
      console.log('================================');
      
      // Set the newly created church as the current organization
      const newOrg = {
        id: data.church.id,
        name: data.church.name,
        description: data.church.description || '',
        logo: data.church.logo,
        email: data.church.email,
        phone: data.church.phone,
        website: data.church.website,
        address: data.church.address,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await setCurrentOrganization(newOrg);
      await refreshOrganizations();
      
      // Invalidate all queries to refresh data with new organization
      queryClient.invalidateQueries();
      
      Alert.alert(
        'Success!', 
        `${data.church.name} has been created successfully. You are now the administrator.`,
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
      );
    },
    onError: (error: Error) => {
      console.error('=== Church Creation Error ===');
      console.error('Raw error:', error);
      const errorMessage = error.message || 'Failed to create church';
      console.error('Error message:', errorMessage);
      console.error('==============================');
      
      if (errorMessage.includes('already exists')) {
        Alert.alert('Duplicate Church', 'A church with this name already exists in this location. Please use a different name or check if the church already exists.');
      } else {
        Alert.alert('Error', errorMessage || 'Failed to create church. Please try again.');
      }
    },
  });

  const isCreating = createChurchMutation.isPending;

  const validateForm = useCallback(() => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter the church name');
      return false;
    }
    if (!description.trim() || description.length < 10) {
      Alert.alert('Required Field', 'Please enter a description (at least 10 characters)');
      return false;
    }
    if (!address.trim()) {
      Alert.alert('Required Field', 'Please enter the street address');
      return false;
    }
    if (!city.trim()) {
      Alert.alert('Required Field', 'Please enter the city');
      return false;
    }
    if (!state.trim()) {
      Alert.alert('Required Field', 'Please enter the state/province');
      return false;
    }
    if (!zip.trim()) {
      Alert.alert('Required Field', 'Please enter the ZIP/postal code');
      return false;
    }
    if (!country.trim()) {
      Alert.alert('Required Field', 'Please select a country');
      return false;
    }
    if (!email.trim()) {
      Alert.alert('Required Field', 'Please enter the church email');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return false;
    }
    if (!phone.trim()) {
      Alert.alert('Required Field', 'Please enter the church phone number');
      return false;
    }
    return true;
  }, [name, description, address, city, state, zip, country, email, phone]);

  const handleCreate = useCallback(() => {
    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please sign in to create a church', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/login') },
      ]);
      return;
    }

    if (!isAdmin) {
      Alert.alert('Access Denied', 'Only administrators can create churches.');
      return;
    }

    if (!validateForm()) return;

    const socialLinks: { facebook?: string; instagram?: string; twitter?: string; youtube?: string } = {};
    if (facebook.trim()) socialLinks.facebook = facebook.trim();
    if (instagram.trim()) socialLinks.instagram = instagram.trim();
    if (twitter.trim()) socialLinks.twitter = twitter.trim();
    if (youtube.trim()) socialLinks.youtube = youtube.trim();

    console.log('=== Creating Church ===');
    console.log('User authenticated:', isAuthenticated);
    console.log('User is admin:', isAdmin);
    console.log('Church data:', {
      name: name.trim(),
      city: city.trim(),
      state: state.trim(),
      country: country.trim(),
    });
    console.log('========================');

    createChurchMutation.mutate({
      name: name.trim(),
      denomination: denomination || undefined,
      description: description.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      zip: zip.trim(),
      country: country.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      website: website.trim() || undefined,
      logo: logo.trim() || undefined,
      bannerImage: bannerImage.trim() || undefined,
      socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
    });
  }, [
    isAuthenticated, isAdmin, validateForm, createChurchMutation, name, denomination, description,
    address, city, state, zip, country, email, phone, website, logo, bannerImage,
    facebook, instagram, twitter, youtube, router
  ]);

  if (!isAdmin) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.redirectText}>Checking permissions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.title}>Create Church</Text>
            <Text style={styles.subtitle}>Register a new church profile</Text>
          </View>
          <View style={styles.adminBadge}>
            <Shield size={14} color={Colors.primary} />
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconContainer}>
            <View style={styles.iconBg}>
              <Church size={40} color={Colors.primary} />
            </View>
          </View>

          <Text style={styles.formTitle}>Church Information</Text>
          <Text style={styles.formSubtitle}>
            Fill in the details below to create your church profile.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Church Name <Text style={styles.required}>*</Text></Text>
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
              <Text style={styles.label}>Denomination</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowDenominationPicker(!showDenominationPicker)}
              >
                <Text style={[styles.pickerText, !denomination && styles.pickerPlaceholder]}>
                  {denomination || 'Select denomination (optional)'}
                </Text>
                {showDenominationPicker ? (
                  <ChevronUp size={20} color={Colors.textSecondary} />
                ) : (
                  <ChevronDown size={20} color={Colors.textSecondary} />
                )}
              </TouchableOpacity>
              {showDenominationPicker && (
                <View style={styles.pickerList}>
                  <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                    {DENOMINATIONS.map((d) => (
                      <TouchableOpacity
                        key={d}
                        style={[styles.pickerItem, denomination === d && styles.pickerItemSelected]}
                        onPress={() => {
                          setDenomination(d);
                          setShowDenominationPicker(false);
                        }}
                      >
                        <Text style={[styles.pickerItemText, denomination === d && styles.pickerItemTextSelected]}>
                          {d}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell us about your church, mission, and community..."
                placeholderTextColor={Colors.textTertiary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Street Address <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputWithIcon}>
                <MapPin size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputInner}
                  placeholder="123 Church Street"
                  placeholderTextColor={Colors.textTertiary}
                  value={address}
                  onChangeText={setAddress}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>City <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="City"
                  placeholderTextColor={Colors.textTertiary}
                  value={city}
                  onChangeText={setCity}
                />
              </View>
              <View style={styles.rowGap} />
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>State <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="State"
                  placeholderTextColor={Colors.textTertiary}
                  value={state}
                  onChangeText={setState}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>ZIP Code <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="12345"
                  placeholderTextColor={Colors.textTertiary}
                  value={zip}
                  onChangeText={setZip}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.rowGap} />
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>Country <Text style={styles.required}>*</Text></Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowCountryPicker(!showCountryPicker)}
                >
                  <Text style={styles.pickerText} numberOfLines={1}>
                    {country}
                  </Text>
                  <ChevronDown size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
            
            {showCountryPicker && (
              <View style={styles.pickerList}>
                <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                  {COUNTRIES.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.pickerItem, country === c && styles.pickerItemSelected]}
                      onPress={() => {
                        setCountry(c);
                        setShowCountryPicker(false);
                      }}
                    >
                      <Text style={[styles.pickerItemText, country === c && styles.pickerItemTextSelected]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputWithIcon}>
                <Mail size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputInner}
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
              <Text style={styles.label}>Phone <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputWithIcon}>
                <Phone size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputInner}
                  placeholder="+1 (555) 123-4567"
                  placeholderTextColor={Colors.textTertiary}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Website</Text>
              <View style={styles.inputWithIcon}>
                <Globe size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputInner}
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
            style={styles.expandSection}
            onPress={() => setShowOptionalFields(!showOptionalFields)}
          >
            <View style={styles.expandHeader}>
              <ImageIcon size={20} color={Colors.primary} />
              <Text style={styles.expandTitle}>Images (Optional)</Text>
            </View>
            {showOptionalFields ? (
              <ChevronUp size={20} color={Colors.textSecondary} />
            ) : (
              <ChevronDown size={20} color={Colors.textSecondary} />
            )}
          </TouchableOpacity>

          {showOptionalFields && (
            <View style={styles.section}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Logo URL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://example.com/logo.png"
                  placeholderTextColor={Colors.textTertiary}
                  value={logo}
                  onChangeText={setLogo}
                  keyboardType="url"
                  autoCapitalize="none"
                />
                <Text style={styles.hint}>Enter a URL to your church logo image</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Banner Image URL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://example.com/banner.png"
                  placeholderTextColor={Colors.textTertiary}
                  value={bannerImage}
                  onChangeText={setBannerImage}
                  keyboardType="url"
                  autoCapitalize="none"
                />
                <Text style={styles.hint}>Enter a URL to your church banner image</Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.expandSection}
            onPress={() => setShowSocialLinks(!showSocialLinks)}
          >
            <View style={styles.expandHeader}>
              <Facebook size={20} color={Colors.primary} />
              <Text style={styles.expandTitle}>Social Links (Optional)</Text>
            </View>
            {showSocialLinks ? (
              <ChevronUp size={20} color={Colors.textSecondary} />
            ) : (
              <ChevronDown size={20} color={Colors.textSecondary} />
            )}
          </TouchableOpacity>

          {showSocialLinks && (
            <View style={styles.section}>
              <View style={styles.inputGroup}>
                <View style={styles.inputWithIcon}>
                  <Facebook size={20} color="#1877F2" style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputInner}
                    placeholder="Facebook page URL"
                    placeholderTextColor={Colors.textTertiary}
                    value={facebook}
                    onChangeText={setFacebook}
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputWithIcon}>
                  <Instagram size={20} color="#E4405F" style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputInner}
                    placeholder="Instagram profile URL"
                    placeholderTextColor={Colors.textTertiary}
                    value={instagram}
                    onChangeText={setInstagram}
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputWithIcon}>
                  <Twitter size={20} color="#1DA1F2" style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputInner}
                    placeholder="Twitter/X profile URL"
                    placeholderTextColor={Colors.textTertiary}
                    value={twitter}
                    onChangeText={setTwitter}
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputWithIcon}>
                  <Youtube size={20} color="#FF0000" style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputInner}
                    placeholder="YouTube channel URL"
                    placeholderTextColor={Colors.textTertiary}
                    value={youtube}
                    onChangeText={setYoutube}
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                </View>
              </View>
            </View>
          )}

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>What happens next?</Text>
            <Text style={styles.infoText}>
              • You will become the church administrator{'\n'}
              • You can customize settings and add staff{'\n'}
              • Enable/disable features like donations, events{'\n'}
              • Invite members to join your community
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.createButton, isCreating && styles.createButtonDisabled]}
            onPress={handleCreate}
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <ActivityIndicator color="#FFF" size="small" />
                <Text style={styles.createButtonText}>Creating Church...</Text>
              </>
            ) : (
              <>
                <Check size={20} color="#FFF" />
                <Text style={styles.createButtonText}>Create Church</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            By creating a church, you agree to our terms of service and confirm that you have the authority to represent this church.
          </Text>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  redirectText: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitles: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary + "15",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 28,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 16,
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
  required: {
    color: Colors.error,
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
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  inputInner: {
    flex: 1,
    padding: 16,
    paddingLeft: 4,
    fontSize: 16,
    color: Colors.text,
  },
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  rowGap: {
    width: 12,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pickerText: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  pickerPlaceholder: {
    color: Colors.textTertiary,
  },
  pickerList: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 8,
    maxHeight: 200,
    overflow: 'hidden',
  },
  pickerScroll: {
    maxHeight: 200,
  },
  pickerItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerItemSelected: {
    backgroundColor: Colors.primary + '15',
  },
  pickerItemText: {
    fontSize: 15,
    color: Colors.text,
  },
  pickerItemTextSelected: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  expandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  expandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  expandTitle: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  hint: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 6,
  },
  infoBox: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 18,
    gap: 8,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  disclaimer: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});
